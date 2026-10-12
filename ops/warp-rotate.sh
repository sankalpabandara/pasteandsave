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
# Run it with --force to swap the registration by hand. The site runs it with
# --now when a visitor's lookup or download is refused, and waits for it.

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
FLAG="${PROXY_REFUSED_FLAG:-$APP_DIR/data/proxy-refused}"
STATE="${WARP_ROTATE_STATE:-/var/lib/pasteandsave/warp-last-rotation}"
# Ten minutes between swaps. Each one cuts off whatever is downloading through
# WARP at that moment, and asking Cloudflare for registrations in a tight loop
# is the quickest way to be refused those too.
MIN_GAP="${WARP_ROTATE_MIN_GAP:-600}"
# YouTube refuses whole blocks of WARP addresses, not single ones. Sampled
# right after a flag: 4 of 6 fresh registrations passed, and the 2 that failed
# sat in the two blocks already refused (2a09:bac1:27c0 and 2a09:bac5:33e3).
# So refused blocks are remembered and skipped, and a swap is cheap enough,
# a few seconds each, to allow several before giving up.
MAX_TRIES="${WARP_ROTATE_TRIES:-8}"
FLAGGED="${WARP_FLAGGED_BLOCKS:-/var/lib/pasteandsave/warp-refused-blocks}"
FLAGGED_TTL="${WARP_FLAGGED_TTL:-21600}"
# The same public video the yt-dlp self-test uses. It was one of the ones
# refused while the address was flagged, so it is a fair test.
TEST_URL="${WARP_TEST_URL:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
LOCK="/tmp/pasteandsave-warp-rotate.lock"
W=(warp-cli --accept-tos)

LOG="${WARP_ROTATE_LOG:-/var/log/pasteandsave-warp.log}"
# --now is how the site calls this, while a visitor whose download was refused
# waits for the answer. A swap that has only just happened is not repeated
# that soon: if its address is refused already, another one a minute later is
# unlikely to fare better.
NOW_GAP="${WARP_ROTATE_NOW_GAP:-60}"

stamp() { date "+%Y-%m-%d %H:%M:%S"; }

force=0
now_mode=0
case "${1:-}" in
  --force) force=1 ;;
  --now) now_mode=1 ;;
esac

# Cron sends this script's output to the log itself. When the site runs it,
# the output goes back to the site, so it is written to the log here too.
say() {
  local line
  line="$(stamp) $*"
  echo "$line"
  [ "$now_mode" = 1 ] && echo "$line" >>"$LOG" 2>/dev/null
  return 0
}

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"

exec 9>"$LOCK"
if [ "$now_mode" = 1 ]; then
  # A swap already running is the answer this caller wants too, so wait for
  # it rather than skip.
  flock -w 60 9 || { say "another swap is still running, giving up"; exit 1; }
else
  flock -n 9 || exit 0
fi

# Only when the app is really using WARP. With the home relay or a paid proxy
# configured, the note is about some other address and this has nothing to do.
proxy="$(grep -E '^YTDLP_PROXY=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d "\"'")"
case "$proxy" in
  socks5*://127.0.0.1:*|socks5*://localhost:*) ;;
  *)
    rm -f "$FLAG"
    [ "$force" = 1 ] && say "YTDLP_PROXY is not a local WARP proxy, nothing to do"
    # The site asked for a new address and there is none to give.
    [ "$now_mode" = 1 ] && exit 1
    exit 0
    ;;
esac
port="${proxy##*:}"
port="${port%%/*}"

# Creating a registration can fail on its own, and by then the old one is
# already gone, which leaves WARP with nothing at all. That happened once
# while this was being tested. So it is asked for a few times.
register() {
  for _ in 1 2 3; do
    "${W[@]}" registration new >/dev/null 2>&1 && return 0
    sleep 10
  done
  return 1
}

# Proxy mode on the app's port, connected, and carrying traffic.
bring_up() {
  "${W[@]}" mode proxy >/dev/null 2>&1
  "${W[@]}" proxy port "$port" >/dev/null 2>&1
  "${W[@]}" connect >/dev/null 2>&1
  for _ in $(seq 1 30); do
    "${W[@]}" status 2>/dev/null | grep -q 'Connected' && return 0
    sleep 2
  done
  return 1
}

warp_up() {
  "${W[@]}" status 2>/dev/null | grep -q 'Connected' &&
    ss -Htln "( sport = :$port )" 2>/dev/null | grep -q .
}

# WARP being down is a different fault from its address being refused, and
# the site cannot report it as a refusal: it simply finds nothing listening.
# So cron checks for it every minute, without spending a YouTube lookup.
REPAIR_STATE="${WARP_REPAIR_STATE:-/var/lib/pasteandsave/warp-last-repair}"
if [ "$now_mode" = 0 ] && ! warp_up; then
  since_repair=$(( $(date +%s) - $(cat "$REPAIR_STATE" 2>/dev/null || echo 0) ))
  # After a repair that did not take, wait five minutes before the next.
  if [ "$since_repair" -ge 300 ]; then
    reason="$("${W[@]}" status 2>&1 | tr '\n' ' ' | cut -c1-120)"
    mkdir -p "$(dirname "$REPAIR_STATE")"
    if "${W[@]}" status 2>&1 | grep -qi 'registration missing\|missing registration'; then
      register
    fi
    if bring_up && warp_up; then
      say "WARP was down ($reason), it is back"
    else
      date +%s >"$REPAIR_STATE"
      say "WARP is down ($reason) and did not come back"
      send_alert "WARP is down" \
        "Cloudflare WARP on the server is not running ($reason). YouTube downloads fail until it is back. This is retried every five minutes."
      exit 1
    fi
  fi
fi

[ "$force" = 1 ] || [ "$now_mode" = 1 ] || [ -f "$FLAG" ] || exit 0

now="$(date +%s)"
last="$(cat "$STATE" 2>/dev/null || echo 0)"
if [ "$force" = 0 ] && [ "$now_mode" = 0 ] && [ $((now - last)) -lt "$MIN_GAP" ]; then
  # Leave the note where it is; the next run after the gap picks it up.
  exit 0
fi

JSR=()
[ -x "$APP_DIR/bin/deno" ] && JSR=(--js-runtimes "deno:$APP_DIR/bin/deno")

# One real lookup through WARP, the way the app makes it. Why it failed is left
# in $why, because "refused" and "WARP was not ready yet" call for different
# things.
why=""
youtube_answers() {
  local out
  out="$(timeout 90 "$APP_DIR/bin/yt-dlp" --proxy "$proxy" "${JSR[@]}" --no-warnings \
    --skip-download --print id -- "$TEST_URL" 2>&1)" && return 0
  case "$out" in
    *"not a bot"*|*"Sign in to confirm"*|*"HTTP Error 429"*) why="refused" ;;
    *) why="$(printf '%s' "$out" | tail -n1 | cut -c1-100)" ;;
  esac
  return 1
}

# Asked a few times, because right after a reconnect the proxy can take a
# moment to carry traffic.
exit_address() {
  local a
  for _ in 1 2 3 4 5; do
    a="$(curl -s --max-time 8 -x "$proxy" https://api64.ipify.org 2>/dev/null)"
    [ -n "$a" ] && { echo "$a"; return 0; }
    sleep 2
  done
  echo unknown
}

# The block an address belongs to: the first three groups of an IPv6 address,
# or the whole of an IPv4 one.
block_of() {
  case "$1" in
    *:*) printf '%s\n' "$1" | cut -d: -f1-3 ;;
    *) printf '%s\n' "$1" ;;
  esac
}

block_refused() {
  local b="$1" t
  t="$(awk -v b="$b" '$1 == b { print $2 }' "$FLAGGED" 2>/dev/null | tail -n1)"
  [ -n "$t" ] && [ $(( $(date +%s) - t )) -lt "$FLAGGED_TTL" ]
}

remember_refused() {
  local b="$1" now
  now="$(date +%s)"
  mkdir -p "$(dirname "$FLAGGED")"
  {
    awk -v b="$b" -v now="$now" -v ttl="$FLAGGED_TTL" '$1 != b && now - $2 < ttl' "$FLAGGED" 2>/dev/null
    printf '%s %s\n' "$b" "$now"
  } >"$FLAGGED.tmp" && mv -f "$FLAGGED.tmp" "$FLAGGED"
}

old="$(exit_address)"
if [ "$now_mode" = 1 ]; then
  # The site has just been refused twice over, by two different player
  # clients, so the address is known bad and there is no need to spend a
  # lookup confirming it. The exception is a swap moments ago, by another
  # visitor's refusal or by cron: then the question is whether its address
  # already answers.
  if [ $((now - last)) -lt "$NOW_GAP" ]; then
    if youtube_answers; then
      say "WARP was swapped moments ago and YouTube answers ($old)"
      exit 0
    fi
    say "WARP was swapped moments ago and its address is refused already ($old), not swapping again yet"
    exit 1
  fi
  # Unknown means WARP is not answering at all, which says nothing about any
  # block; the swap below brings it back either way.
  [ "$old" != unknown ] && remember_refused "$(block_of "$old")"
elif [ "$force" = 0 ]; then
  # The note can outlive the problem: one unlucky lookup, or a block that
  # lifted on its own. A swap is not free, so check first.
  if youtube_answers; then
    say "YouTube answers through WARP ($old), no swap needed"
    rm -f "$FLAG"
    exit 0
  fi
  [ "$why" = refused ] && remember_refused "$(block_of "$old")"
fi

# Downloads already under way hold links signed for the current address, and
# a new address would break them. Cron gives them up to two minutes to finish.
# A visitor is waiting on --now, so it gives them fifteen seconds; a download
# cut off here starts again by itself with fresh links.
wait_rounds=24
[ "$now_mode" = 1 ] && { wait_rounds=3; MAX_TRIES=5; }
for _ in $(seq 1 "$wait_rounds"); do
  pgrep -f -- "--proxy $proxy" >/dev/null 2>&1 || break
  sleep 5
done

swap_registration() {
  "${W[@]}" registration delete >/dev/null 2>&1
  register || return 1
  bring_up
}

mkdir -p "$(dirname "$STATE")"
for try in $(seq 1 "$MAX_TRIES"); do
  if ! swap_registration; then
    say "swap $try: WARP did not reconnect"
    sleep 3
    continue
  fi
  new="$(exit_address)"
  block="$(block_of "$new")"
  if [ "$new" != unknown ] && block_refused "$block"; then
    say "swap $try: $new is in $block, which YouTube refused recently, skipping"
    sleep 3
    continue
  fi
  if youtube_answers; then
    date +%s >"$STATE"
    rm -f "$FLAG"
    say "swapped WARP registration ($old -> $new), YouTube answers again$([ "$now_mode" = 1 ] && echo ', for a visitor')"
    exit 0
  fi
  [ "$why" = refused ] && remember_refused "$block"
  say "swap $try: $new failed ($why)"
  sleep 3
done

# Out of tries. Recording the attempt makes the next one wait the full gap
# instead of hammering Cloudflare every minute; the note stays, so it is retried.
date +%s >"$STATE"
send_alert "WARP rotation failed" \
  "Swapped the WARP registration $MAX_TRIES times and YouTube still refuses every new address. YouTube downloads will fail until this clears. The script retries every $((MIN_GAP / 60)) minutes on its own."
exit 1
