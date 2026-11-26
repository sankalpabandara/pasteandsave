#!/usr/bin/env bash
# Watches the running site and restarts it if it stops answering.
#
# Runs from cron every 2 minutes. A single bad check is ignored, because a
# slow moment is not a fault; only repeated failures trigger a restart. After
# a restart the counter resets, and if restarting does not help it stops
# trying and sends one alert rather than looping forever.
#
#   */2 * * * * /opt/pasteandsave/ops/health-watchdog.sh >> /var/log/pasteandsave-watchdog.log 2>&1

set -uo pipefail

APP_NAME="${APP_NAME:-pasteandsave}"
STATE_DIR="${STATE_DIR:-/var/lib/pasteandsave}"
FAIL_FILE="$STATE_DIR/health-fails"
RESTART_FILE="$STATE_DIR/restarts-today"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Consecutive bad checks before acting (2 checks x 2 min = ~4 minutes down).
FAIL_THRESHOLD="${FAIL_THRESHOLD:-2}"
# Ceiling on self-restarts per day. Past this the problem is not something a
# restart fixes, and restarting repeatedly only hides it.
MAX_RESTARTS_PER_DAY="${MAX_RESTARTS_PER_DAY:-6}"

mkdir -p "$STATE_DIR"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"
alert() { send_alert "$1" "$2"; }
# shellcheck source=/dev/null
. "$(dirname "$0")/lib-app.sh"
# shellcheck source=/dev/null
. "$(dirname "$0")/lib-exposure.sh"

# First, and whatever the site's health: an open container is a problem even
# while the site is answering perfectly.
check_public_containers

# The port comes from ecosystem.config.js. This used to default to 3000 after
# the app had moved to 4100, so every check failed, and once the daily counter
# reset at midnight the watchdog restarted the healthy site six times in a
# row. Not knowing the port is a reason to stop, never to restart anything.
if ! HEALTH_URL="$(app_health_url)"; then
  echo "$(stamp) cannot read the app's port from ecosystem.config.js, not checking"
  exit 0
fi

# Reset the daily restart counter when the date changes.
today="$(date +%F)"
if [ ! -f "$RESTART_FILE" ] || [ "$(head -n1 "$RESTART_FILE" 2>/dev/null)" != "$today" ]; then
  printf '%s\n0\n' "$today" > "$RESTART_FILE"
fi
restarts="$(sed -n 2p "$RESTART_FILE" 2>/dev/null || echo 0)"

# A fresh file for this check's body. The old fixed path was never written
# when the connection failed, so every log line repeated a body from weeks
# before and pointed whoever read it at the wrong fault.
body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
code="$(http_status "$HEALTH_URL" "$body_file")"

if [ "$code" = "200" ]; then
  [ -f "$FAIL_FILE" ] && rm -f "$FAIL_FILE"
  exit 0
fi

fails=$(( $(cat "$FAIL_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$fails" > "$FAIL_FILE"
echo "$(stamp) unhealthy (http=$code) consecutive=$fails $(head -c 200 "$body_file" 2>/dev/null)"

[ "$fails" -lt "$FAIL_THRESHOLD" ] && exit 0

if [ "$restarts" -ge "$MAX_RESTARTS_PER_DAY" ]; then
  alert "site down, restarts exhausted" \
    "Health check has failed $fails times (http=$code) and the daily restart limit of $MAX_RESTARTS_PER_DAY is used up. This needs a human."
  exit 1
fi

echo "$(stamp) restarting $APP_NAME (restart $((restarts + 1)) today)"
pm2 restart "$APP_NAME" --update-env >/dev/null 2>&1 || pm2 start "$APP_NAME" >/dev/null 2>&1
printf '%s\n%s\n' "$today" "$((restarts + 1))" > "$RESTART_FILE"
rm -f "$FAIL_FILE"

sleep 25
after="$(http_status "$HEALTH_URL")"
if [ "$after" = "200" ]; then
  echo "$(stamp) recovered after restart"
else
  alert "restart did not recover the site" \
    "Restarted $APP_NAME after $fails failed checks, but health is still http=$after."
fi
