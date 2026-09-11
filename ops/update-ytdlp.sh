#!/usr/bin/env bash
# Keeps yt-dlp current, and refuses to keep an update that does not work.
#
# Sites change their players constantly; an extractor that is weeks old is the
# usual reason a downloader "suddenly stops working". This updates the binary,
# proves the new one can still read a real video, and rolls back to the
# previous binary if it cannot.
#
#   17 4 * * * /opt/pasteandsave/ops/update-ytdlp.sh >> /var/log/pasteandsave-ytdlp.log 2>&1

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
BIN="${YTDLP_BIN:-$APP_DIR/bin/yt-dlp}"
BACKUP="$BIN.previous"
APP_NAME="${APP_NAME:-pasteandsave}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
# Short, stable, public video used only to prove extraction still works.
SELFTEST_URL="${SELFTEST_URL:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"
alert() { send_alert "$1" "$2"; }

# Reads the proxy the app uses so the self-test goes out the same path a real
# lookup would. Never printed.
PROXY_ARG=()
if [ -f "$APP_DIR/.env.local" ]; then
  proxy_value="$(grep -E '^YTDLP_PROXY=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"'"'"'')"
  [ -n "${proxy_value:-}" ] && PROXY_ARG=(--proxy "$proxy_value")
fi

# Proves the binary can still DOWNLOAD, not merely describe, a known-good video.
#
# The old version asked for --dump-single-json and grepped for "formats". That
# only ever tested extraction, and extraction never broke: through the whole
# outage in which no visitor could download anything, this test passed every
# night. Whatever this checks is what we are actually protecting, so it has to
# be the thing that failed.
#
# It also hardcoded player_client=android_vr,tv. That client is dead, and
# pinning the test to it meant the test disagreed with the app about what it was
# even testing. The app decides the client now; only an explicit override in
# .env.local is honoured here.
CLIENT_ARG=()
if [ -f "$APP_DIR/.env.local" ]; then
  client_value="$(grep -E '^YTDLP_YOUTUBE_CLIENTS=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"'"'"'')"
  [ -n "${client_value:-}" ] && CLIENT_ARG=(--extractor-args "youtube:player_client=$client_value")
fi

# Passed explicitly because yt-dlp only looks for a runtime on PATH, and ours
# lives beside the binary.
JSR_ARG=()
[ -x "$APP_DIR/bin/deno" ] && JSR_ARG=(--js-runtimes "deno:$APP_DIR/bin/deno")

# Tries without the proxy first. Routing every attempt through the proxy meant a
# proxy that was out of credit failed the test, rolled back a perfectly good
# binary, and did it again the next night: a dead proxy could pin the extractor
# to an old version indefinitely.
_download_attempt() {
  local out
  out="$(mktemp -d)"
  if "$BIN" -f worstaudio --no-warnings --no-playlist       --socket-timeout 20 --extractor-retries 1       "${JSR_ARG[@]}" "${CLIENT_ARG[@]}" "$@"       -o "$out/t.%(ext)s" -- "$SELFTEST_URL" >/dev/null 2>&1      && [ -n "$(find "$out" -type f -size +8k 2>/dev/null | head -1)" ]; then
    rm -rf "$out"
    return 0
  fi
  rm -rf "$out"
  return 1
}

selftest() {
  _download_attempt && return 0
  # Only worth a second attempt when there is a different address to try.
  [ ${#PROXY_ARG[@]} -gt 0 ] && _download_attempt "${PROXY_ARG[@]}" && return 0
  return 1
}

# Dailymotion and a growing number of other sites refuse a plain TLS
# handshake and need yt-dlp to impersonate a browser, which only the builds
# bundling curl_cffi can do. Swapping to a build without it breaks those sites
# with an error that mentions nothing about the network, so it is checked here
# rather than discovered later.
impersonation_ok() {
  # Not a grep for browser names. --list-impersonate-targets prints every client
  # it knows about whether or not it can use it, so a build with no curl_cffi
  # still prints "Chrome ... (unavailable)" and passed this check for months
  # while impersonation did not work at all. A target only counts when its line
  # does not say unavailable.
  "$BIN" --list-impersonate-targets 2>/dev/null     | grep -iE 'chrome|firefox|safari|edge'     | grep -qvi 'unavailable'
}

# A JS runtime is now required for YouTube: the player clients that still work
# are given a JavaScript challenge to solve, and without one they fail. This
# installs it if it is absent rather than waiting for someone to notice, because
# the symptom is downloads failing while everything else looks healthy.
#
# A failure here is worth an alert on its own. If this cannot write to bin/ then
# neither can yt-dlp -U, which is the likeliest reason the extractor fell two
# months behind without complaint.
ensure_js_runtime() {
  [ -x "$APP_DIR/bin/deno" ] && return 0
  case "$(uname -s)/$(uname -m)" in
    Linux/x86_64|Linux/amd64)   t="x86_64-unknown-linux-gnu" ;;
    Linux/aarch64|Linux/arm64)  t="aarch64-unknown-linux-gnu" ;;
    Darwin/arm64)               t="aarch64-apple-darwin" ;;
    Darwin/x86_64)              t="x86_64-apple-darwin" ;;
    *) echo "$(stamp) no deno build for this platform, skipping"; return 0 ;;
  esac
  echo "$(stamp) no JS runtime found, installing deno"
  d="$(mktemp -d)"
  if curl -fsSL --max-time 180 -o "$d/deno.zip"        "https://github.com/denoland/deno/releases/latest/download/deno-$t.zip"      && unzip -o -q "$d/deno.zip" -d "$APP_DIR/bin"      && chmod +x "$APP_DIR/bin/deno"; then
    echo "$(stamp) installed $("$APP_DIR/bin/deno" --version 2>/dev/null | head -1)"
  else
    alert "could not install a JS runtime"       "YouTube needs a JavaScript runtime and deno could not be installed into $APP_DIR/bin. Downloads will keep failing while lookups appear to work. If this is a permissions problem it also explains yt-dlp not updating."
  fi
  rm -rf "$d"
}
ensure_js_runtime

[ -x "$BIN" ] || { alert "yt-dlp missing" "No executable at $BIN"; exit 1; }

before="$("$BIN" --version 2>/dev/null || echo unknown)"
cp -f "$BIN" "$BACKUP" 2>/dev/null || true

echo "$(stamp) updating yt-dlp (current: $before)"
update_log="$(mktemp)"

# Not `yt-dlp -U`. That replaces the binary in place, and on a live server the
# binary is being executed constantly, so the write fails with "Text file busy"
# (ETXTBSY). Linux will not open a file for writing while it is running. The
# update therefore did nothing, every night, for two months, and because -U's
# output was discarded it looked like success.
#
# Downloading beside it and renaming over the top does work: rename only swaps
# the directory entry, so a yt-dlp mid-run keeps the old inode until it exits
# and the next spawn gets the new one. No downtime, no need to stop the app.
# Must match scripts/setup-bin.sh: the plain "yt-dlp" asset ships without
# curl_cffi, so updating to it would silently remove browser impersonation.
case "$(uname -s)/$(uname -m)" in
  Darwin/*)                  asset="yt-dlp_macos" ;;
  Linux/x86_64|Linux/amd64)  asset="yt-dlp_linux" ;;
  Linux/aarch64|Linux/arm64) asset="yt-dlp_linux_aarch64" ;;
  *)                         asset="yt-dlp" ;;
esac
if curl -fL --max-time 300 -o "$BIN.new"      "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$asset" >"$update_log" 2>&1; then
  chmod +x "$BIN.new"
  mv -f "$BIN.new" "$BIN"
else
  echo "download failed" >>"$update_log"
  rm -f "$BIN.new"
fi
after="$("$BIN" --version 2>/dev/null || echo unknown)"

# What the newest release actually is. Without this, "before equals after" was
# read as "already current", which is also what a silently failed update looks
# like: no write permission on the binary, a build that cannot replace itself, a
# refused network call. The binary sat two months behind for exactly this reason
# while this script reported success every night, because -U's own output was
# being discarded.
latest="$(curl -fsSL --max-time 20 https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest 2>/dev/null   | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)"

if [ -n "$latest" ] && [ "$after" != "$latest" ]; then
  alert "yt-dlp is not updating"     "Installed $after, newest release is $latest, and the update reported no error. The usual cause is the cron user being unable to replace $BIN. Last lines of the update output:
$(tail -n 8 "$update_log")"
  rm -f "$update_log"
  exit 1
fi
rm -f "$update_log"

if [ "$before" = "$after" ]; then
  echo "$(stamp) already current ($after)"
  # Still worth knowing if today's sites broke the version we are on.
  if ! selftest; then
    alert "extraction self-test failing on current yt-dlp" \
      "yt-dlp $after is installed and up to date, but the self-test could not read a known-good public video. A site change may need an upstream fix."
    exit 1
  fi
  exit 0
fi

echo "$(stamp) updated $before -> $after, running self-test"
if ! impersonation_ok; then
  echo "$(stamp) $after has no impersonation targets, rolling back to $before"
  if [ -f "$BACKUP" ]; then
    mv -f "$BACKUP" "$BIN"
    chmod +x "$BIN"
  fi
  alert "yt-dlp update rolled back: no browser impersonation" \
    "Version $after ships without curl_cffi, which Dailymotion and similar sites require. Rolled back to $before. If this repeats, the install may have been switched to a build variant that omits impersonation; the Linux standalone release (yt-dlp_linux) includes it."
  exit 1
fi
if selftest; then
  echo "$(stamp) self-test passed on $after, restarting app"
  pm2 restart "$APP_NAME" --update-env >/dev/null 2>&1
  rm -f "$BACKUP"
  exit 0
fi

echo "$(stamp) self-test FAILED on $after, rolling back to $before"
if [ -f "$BACKUP" ]; then
  mv -f "$BACKUP" "$BIN"
  chmod +x "$BIN"
  if selftest; then
    alert "yt-dlp update rolled back" \
      "Update $before -> $after broke extraction. Rolled back to $before, which works. No action needed unless downloads misbehave."
  else
    alert "extraction broken on both yt-dlp versions" \
      "Neither $after nor $before can read a known-good video. This is likely a site-wide change or a proxy problem, and needs a human."
  fi
else
  alert "yt-dlp update failed with no rollback available" \
    "Update $before -> $after failed its self-test and no backup binary was saved."
fi
exit 1
