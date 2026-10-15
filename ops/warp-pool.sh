#!/usr/bin/env bash
# Keeps a pool of independent Cloudflare WARP exits ready for YouTube.
#
# One WARP address was a single point of failure. YouTube refuses a WARP
# address from time to time, for lookups or for the video files alone, and
# whoever asked next was told the site was rate-limiting the server, while
# the swap that fixed it cut every download in progress.
#
# This runs several exits side by side: the server's own WARP (port 40000)
# plus WARP_POOL_SIZE containers of Cloudflare's official client, one exit
# each, on 127.0.0.1:40001 upwards. Every exit is tested with a real YouTube
# download, the smallest stream of a 19 second video. A refused exit is given
# a new registration, and with it a new address, until one passes, without
# touching any other exit, so nothing in progress is cut. The healthy exits
# are published in data/warp-pool.json, and the site sends each YouTube
# request through one of them; one that fails mid-request is reported back in
# data/warp-pool-suspect/ and tested here on the next run.
#
#   * * * * * /opt/pasteandsave/ops/warp-pool.sh >> /var/log/pasteandsave-warp-pool.log 2>&1

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
POOL_SIZE="${WARP_POOL_SIZE:-4}"
BASE_PORT="${WARP_POOL_BASE_PORT:-40001}"
IMAGE="pasteandsave-warp"
STATE_DIR="${WARP_POOL_STATE:-/var/lib/pasteandsave/warp-pool}"
POOL_FILE="${WARP_POOL_FILE:-$APP_DIR/data/warp-pool.json}"
SUSPECT_DIR="${WARP_POOL_SUSPECT_DIR:-$APP_DIR/data/warp-pool-suspect}"
# Shared with warp-rotate.sh: address blocks YouTube refused recently.
FLAGGED="${WARP_FLAGGED_BLOCKS:-/var/lib/pasteandsave/warp-refused-blocks}"
FLAGGED_TTL="${WARP_FLAGGED_TTL:-21600}"
# A healthy exit is retested this often. Each test is a real YouTube request,
# and testing much more often than visitors use an exit would itself draw
# YouTube's attention. Exits the site reports are tested at once.
CHECK_EVERY="${WARP_POOL_CHECK_EVERY:-1800}"
# New registrations tried for one refused exit before it waits for next time.
MAX_SWAPS="${WARP_POOL_MAX_SWAPS:-6}"
TEST_URL="${WARP_TEST_URL:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
LOCK="/tmp/pasteandsave-warp-pool.lock"

stamp() { date "+%Y-%m-%d %H:%M:%S"; }
say() { echo "$(stamp) $*"; }

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"

exec 9>"$LOCK"
flock -n 9 || exit 0

command -v docker >/dev/null 2>&1 || { say "docker is not installed, no pool"; exit 1; }
mkdir -p "$STATE_DIR" "$SUSPECT_DIR" "$(dirname "$POOL_FILE")"

JSR=()
[ -x "$APP_DIR/bin/deno" ] && JSR=(--js-runtimes "deno:$APP_DIR/bin/deno")

# 0 when YouTube serves a real video file through this proxy, 1 when it
# refuses (bot wall, rate limit, or 403 on the file), 2 for anything else,
# such as the exit not answering. --ignore-config and the app's own client
# choice, so this tests exactly what the site does.
youtube_ok() {
  local proxy="$1" out rc dir
  dir="$(mktemp -d)"
  out="$(timeout 120 "$APP_DIR/bin/yt-dlp" --ignore-config --proxy "$proxy" "${JSR[@]}" \
    --no-warnings --no-progress --extractor-args "youtube:player_client=default;skip=hls" \
    -f "worstaudio/worst" -o "$dir/t.%(ext)s" -- "$TEST_URL" 2>&1)"
  rc=$?
  find "$dir" -delete 2>/dev/null
  [ "$rc" -eq 0 ] && return 0
  case "$out" in
    *"not a bot"* | *"HTTP Error 429"* | *"HTTP Error 403"*) return 1 ;;
  esac
  return 2
}

exit_address() {
  local a
  for _ in 1 2 3 4 5; do
    a="$(curl -s --max-time 8 -x "$1" https://api64.ipify.org 2>/dev/null)"
    [ -n "$a" ] && { echo "$a"; return 0; }
    sleep 2
  done
  echo unknown
  return 1
}

block_of() {
  case "$1" in
    *:*) printf '%s\n' "$1" | cut -d: -f1-3 ;;
    *) printf '%s\n' "$1" ;;
  esac
}

block_refused() {
  local t
  t="$(awk -v b="$1" '$1 == b { print $2 }' "$FLAGGED" 2>/dev/null | tail -n1)"
  [ -n "$t" ] && [ $(( $(date +%s) - t )) -lt "$FLAGGED_TTL" ]
}

remember_refused() {
  local now
  now="$(date +%s)"
  [ "$1" = unknown ] && return 0
  mkdir -p "$(dirname "$FLAGGED")"
  {
    awk -v b="$1" -v now="$now" -v ttl="$FLAGGED_TTL" '$1 != b && now - $2 < ttl' "$FLAGGED" 2>/dev/null
    printf '%s %s\n' "$1" "$now"
  } >"$FLAGGED.tmp" && mv -f "$FLAGGED.tmp" "$FLAGGED"
}

# State per exit: "<healthy|down> <checked epoch> <exit address>".
read_state() { cat "$STATE_DIR/$1" 2>/dev/null || echo "down 0 unknown"; }
write_state() { printf '%s %s %s\n' "$2" "$(date +%s)" "$3" >"$STATE_DIR/$1"; }

# --- the image and the containers ------------------------------------------

image_changed=0
ensure_image() {
  local ctx="$APP_DIR/ops/warp-pool" sum have dir
  sum="$(cat "$ctx/Dockerfile" "$ctx/entrypoint.sh" | sha256sum | cut -c1-12)"
  have="$(docker image inspect -f '{{index .Config.Labels "ps.sum"}}' "$IMAGE:latest" 2>/dev/null || true)"
  [ "$have" = "$sum" ] && return 0
  dir="$(mktemp -d)"
  cp "$ctx/Dockerfile" "$ctx/entrypoint.sh" /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg "$dir/"
  if docker build -q --label "ps.sum=$sum" -t "$IMAGE:latest" "$dir" >/dev/null 2>&1; then
    say "built the WARP image ($sum)"
    image_changed=1
  else
    say "could not build the WARP image"
  fi
  find "$dir" -delete 2>/dev/null
}

ensure_container() {
  local name="$1" port="$2" running
  running="$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo missing)"
  if [ "$running" = true ] && [ "$image_changed" = 0 ]; then return 0; fi
  docker rm -f "$name" >/dev/null 2>&1
  if docker run -d --name "$name" --restart unless-stopped --memory 256m \
    --cap-add NET_ADMIN --sysctl net.ipv6.conf.all.disable_ipv6=0 \
    -p "127.0.0.1:$port:41000" "$IMAGE:latest" >/dev/null 2>&1; then
    say "$name started on port $port"
    write_state "$name" down unknown
    # A new container is tested on this run.
    touch "$SUSPECT_DIR/$name"
  else
    say "$name could not be started"
  fi
}

new_registration() {
  docker exec "$1" sh -c 'warp-cli --accept-tos registration delete >/dev/null 2>&1;
    warp-cli --accept-tos registration new >/dev/null 2>&1 &&
    warp-cli --accept-tos mode proxy >/dev/null 2>&1 &&
    warp-cli --accept-tos proxy port 40000 >/dev/null 2>&1 &&
    warp-cli --accept-tos connect >/dev/null 2>&1'
}

# --- checking one exit -------------------------------------------------------

check() {
  local name="$1" proxy="$2" kind="$3" state status checked addr since result
  state="$(read_state "$name")"
  read -r status checked addr <<<"$state"
  since=$(( $(date +%s) - checked ))
  if [ ! -f "$SUSPECT_DIR/$name" ] && [ "$status" = healthy ] && [ "$since" -lt "$CHECK_EVERY" ]; then
    return 0
  fi
  find "$SUSPECT_DIR" -maxdepth 1 -name "$name" -delete 2>/dev/null

  addr="$(exit_address "$proxy")"
  youtube_ok "$proxy"
  result=$?
  if [ "$result" -eq 0 ]; then
    [ "$status" = healthy ] || say "$name ($addr) is healthy"
    write_state "$name" healthy "$addr"
    return 0
  fi

  if [ "$result" -eq 1 ]; then
    remember_refused "$(block_of "$addr")"
    say "$name ($addr) refused by YouTube"
  else
    say "$name ($addr) not answering"
  fi
  # Out of use straight away, before any repair.
  write_state "$name" down "$addr"

  if [ "$kind" = host ]; then
    # The server's own WARP belongs to warp-rotate.sh; leave it a note.
    printf '%s pool\n' "$(date -u +%FT%TZ)" >"$APP_DIR/data/proxy-refused"
    return 1
  fi

  if [ "$result" -eq 2 ]; then
    docker restart "$name" >/dev/null 2>&1
    sleep 10
  fi
  for try in $(seq 1 "$MAX_SWAPS"); do
    if [ "$result" -eq 1 ] || [ "$try" -gt 1 ]; then
      new_registration "$name"
    fi
    addr="$(exit_address "$proxy")"
    if [ "$addr" != unknown ] && block_refused "$(block_of "$addr")"; then
      say "$name new address $addr is in a refused block, trying again"
      result=1
      continue
    fi
    youtube_ok "$proxy"
    result=$?
    if [ "$result" -eq 0 ]; then
      write_state "$name" healthy "$addr"
      say "$name has a new address $addr, YouTube answers"
      return 0
    fi
    [ "$result" -eq 1 ] && remember_refused "$(block_of "$addr")"
    sleep 3
  done
  say "$name still has no working address after $MAX_SWAPS tries, retrying next run"
  # Tested again on the next run rather than after the routine interval.
  touch "$SUSPECT_DIR/$name"
  return 1
}

# --- publishing ----------------------------------------------------------------

members=()
publish() {
  local tmp="$POOL_FILE.tmp" first=1 name proxy status checked addr
  {
    printf '{"updatedAt":%s,"members":[' "$(date +%s)"
    for entry in "${members[@]}"; do
      name="${entry%%|*}"
      proxy="${entry#*|}"
      read -r status checked addr <<<"$(read_state "$name")"
      [ "$first" = 1 ] || printf ','
      first=0
      printf '{"name":"%s","proxy":"%s","healthy":%s,"exit":"%s","checkedAt":%s}' \
        "$name" "$proxy" "$([ "$status" = healthy ] && echo true || echo false)" "$addr" "$checked"
    done
    printf ']}\n'
  } >"$tmp" && mv -f "$tmp" "$POOL_FILE"
}

# --- the run -------------------------------------------------------------------

proxy_setting="$(grep -E '^YTDLP_PROXY=' "$APP_DIR/.env.local" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d "\"'")"
case "$proxy_setting" in
  socks5*://127.0.0.1:40000 | socks5*://localhost:40000) members+=("host|socks5h://127.0.0.1:40000") ;;
esac

ensure_image
for i in $(seq 1 "$POOL_SIZE"); do
  ensure_container "ps-warp-$i" $((BASE_PORT + i - 1))
  members+=("ps-warp-$i|socks5h://127.0.0.1:$((BASE_PORT + i - 1))")
done
publish

for entry in "${members[@]}"; do
  name="${entry%%|*}"
  kind=container
  [ "$name" = host ] && kind=host
  check "$name" "${entry#*|}" "$kind"
  # Published after each, so the site learns of a healthy exit as soon as it
  # exists rather than at the end of a long run.
  publish
done

healthy="$(grep -o '"healthy":true' "$POOL_FILE" | wc -l)"
if [ "$healthy" -eq 0 ]; then
  send_alert "WARP pool has no healthy exit" \
    "None of the ${#members[@]} WARP exits passes a YouTube download test. YouTube downloads will fail until one does. The pool keeps retrying every minute."
fi
