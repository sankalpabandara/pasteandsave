#!/usr/bin/env bash
# Gives Cloudflare WARP a fresh exit address when YouTube starts refusing it.
#
# YouTube reaches this server through WARP in proxy mode (YTDLP_PROXY=
# socks5h://127.0.0.1:40000). That needs no machine at home, but WARP's exit
# address is shared with everyone else on WARP, and YouTube eventually answers
# it with "Sign in to confirm you're not a bot". It did exactly that about an
# hour after going live. A new WARP registration comes with a new exit address
# that YouTube accepts again: 0 of 3 lookups passed on the flagged address, 3 of
# 3 on the new one, seconds later. A free registration is anonymous, so there
# is no account or email involved.
#
# The app writes data/proxy-refused when YouTube refuses the proxy's address.
# This script, on cron, checks whether the refusal is real, and if it is swaps
# the registration and confirms YouTube answers again.
#
#   * * * * * /opt/pasteandsave/ops/warp-rotate.sh >> /var/log/pasteandsave-warp.log 2>&1
#
# Run it with --force to swap the registration by hand.

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
FLAG="${PROXY_REFUSED_FLAG:-$APP_DIR/data/proxy-refused}"
STATE="${WARP_ROTATE_STATE:-/var/lib/pasteandsave/warp-last-rotation}"
# Ten minutes between swaps. Each one cuts off whatever is downloading through
# WARP at that moment, and asking Cloudflare for registrations in a tight loop
# is the quickest way to be refused those too.
MIN_GAP="${WARP_ROTATE_MIN_GAP:-600}"
MAX_TRIES="${WARP_ROTATE_TRIES:-3}"
# The same public video the yt-dlp self-test uses. It was one of the ones
# refused while the address was flagged, so it is a fair test.
TEST_URL="${WARP_TEST_URL:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
LOCK="/tmp/pasteandsave-warp-rotate.lock"
W=(warp-cli --accept-tos)

stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"

exec 9>"$LOCK"
flock -n 9 || exit 0

force=0
[ "${1:-}" = "--force" ] && force=1

[ "$force" = 1 ] || [ -f "$FLAG" ] || exit 0

# Only when the app is really using WARP. With the home relay or a paid proxy
# configured, the note is about some other address and this has nothing to do.
proxy="$(grep -E '^YTDLP_PROXY=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d "\"'")"
case "$proxy" in
  socks5*://127.0.0.1:*|socks5*://localhost:*) ;;
  *)
    rm -f "$FLAG"
    [ "$force" = 1 ] && echo "$(stamp) YTDLP_PROXY is not a local WARP proxy, nothing to do"
    exit 0
    ;;
esac
port="${proxy##*:}"
port="${port%%/*}"

now="$(date +%s)"
last="$(cat "$STATE" 2>/dev/null || echo 0)"
if [ "$force" = 0 ] && [ $((now - last)) -lt "$MIN_GAP" ]; then
  # Leave the note where it is; the next run after the gap picks it up.
  exit 0
fi

JSR=()
[ -x "$APP_DIR/bin/deno" ] && JSR=(--js-runtimes "deno:$APP_DIR/bin/deno")

# One real lookup through WARP, the way the app makes it.
youtube_answers() {
  timeout 90 "$APP_DIR/bin/yt-dlp" --proxy "$proxy" "${JSR[@]}" --no-warnings \
    --skip-download --print id -- "$TEST_URL" >/dev/null 2>&1
}

exit_address() {
  curl -s --max-time 10 -x "$proxy" https://api64.ipify.org 2>/dev/null || echo unknown
}

# The note can outlive the problem: one unlucky lookup, or a block that lifted
# on its own. A swap is not free, so check first.
if [ "$force" = 0 ] && youtube_answers; then
  echo "$(stamp) YouTube answers through WARP ($(exit_address)), no swap needed"
  rm -f "$FLAG"
  exit 0
fi

# Downloads already under way hold links signed for the current address, and
# a new address would break them. Give them up to two minutes to finish.
for _ in $(seq 1 24); do
  pgrep -f -- "--proxy $proxy" >/dev/null 2>&1 || break
  sleep 5
done

swap_registration() {
  "${W[@]}" registration delete >/dev/null 2>&1
  "${W[@]}" registration new >/dev/null 2>&1 || return 1
  "${W[@]}" mode proxy >/dev/null 2>&1
  "${W[@]}" proxy port "$port" >/dev/null 2>&1
  "${W[@]}" connect >/dev/null 2>&1
  for _ in $(seq 1 30); do
    "${W[@]}" status 2>/dev/null | grep -q 'Connected' && return 0
    sleep 2
  done
  return 1
}

mkdir -p "$(dirname "$STATE")"
old="$(exit_address)"
for try in $(seq 1 "$MAX_TRIES"); do
  if ! swap_registration; then
    echo "$(stamp) swap $try: WARP did not reconnect"
    continue
  fi
  new="$(exit_address)"
  if youtube_answers; then
    date +%s >"$STATE"
    rm -f "$FLAG"
    echo "$(stamp) swapped WARP registration ($old -> $new), YouTube answers again"
    exit 0
  fi
  echo "$(stamp) swap $try: new address $new is refused too"
done

# Out of tries. Recording the attempt makes the next one wait the full gap
# instead of hammering Cloudflare every minute; the note stays, so it is retried.
date +%s >"$STATE"
send_alert "WARP rotation failed" \
  "Swapped the WARP registration $MAX_TRIES times and YouTube still refuses every new address. YouTube downloads will fail until this clears. The script retries every $((MIN_GAP / 60)) minutes on its own."
exit 1
