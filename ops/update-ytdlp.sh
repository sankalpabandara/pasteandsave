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
alert() {
  echo "$(stamp) ALERT: $1"
  if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
    printf '%s\n' "$2" | mail -s "[PasteAndSave] $1" "$ALERT_EMAIL"
  fi
}

# Reads the proxy the app uses so the self-test goes out the same path a real
# lookup would. Never printed.
PROXY_ARG=()
if [ -f "$APP_DIR/.env.local" ]; then
  proxy_value="$(grep -E '^YTDLP_PROXY=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"'"'"'')"
  [ -n "${proxy_value:-}" ] && PROXY_ARG=(--proxy "$proxy_value")
fi

selftest() {
  "$BIN" --dump-single-json --no-warnings --no-playlist \
    --socket-timeout 20 --extractor-retries 1 \
    --extractor-args "youtube:player_client=android_vr,tv" \
    "${PROXY_ARG[@]}" -- "$SELFTEST_URL" 2>/dev/null \
    | head -c 2000 | grep -q '"formats"'
}

[ -x "$BIN" ] || { alert "yt-dlp missing" "No executable at $BIN"; exit 1; }

before="$("$BIN" --version 2>/dev/null || echo unknown)"
cp -f "$BIN" "$BACKUP" 2>/dev/null || true

echo "$(stamp) updating yt-dlp (current: $before)"
"$BIN" -U >/dev/null 2>&1
after="$("$BIN" --version 2>/dev/null || echo unknown)"

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
