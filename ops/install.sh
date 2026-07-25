#!/usr/bin/env bash
# One-time setup for the self-healing automation. Safe to re-run.
#
#   sudo ALERT_EMAIL=you@example.com /opt/pasteandsave/ops/install.sh

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
ALERT_EMAIL="${ALERT_EMAIL:-sankethperera@proton.me}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
OPS="$APP_DIR/ops"

echo "Installing PasteAndSave automation from $OPS"

# Catch a placeholder pasted in literally instead of a real URL, which would
# otherwise install cleanly and then quietly fail to deliver anything.
if [ -n "$ALERT_WEBHOOK_URL" ]; then
  case "$ALERT_WEBHOOK_URL" in
    https://*|http://*) ;;
    *)
      echo
      echo "ERROR: ALERT_WEBHOOK_URL is not a URL: '$ALERT_WEBHOOK_URL'"
      echo "It must start with https://, for example https://ntfy.sh/your-topic"
      echo "Nothing was installed. Re-run with a real URL, or omit it entirely."
      exit 1
      ;;
  esac
fi

chmod +x "$OPS"/*.sh
mkdir -p /var/lib/pasteandsave
touch /var/log/pasteandsave-watchdog.log \
      /var/log/pasteandsave-ytdlp.log \
      /var/log/pasteandsave-deploy.log

# Keep the logs from growing without limit.
cat > /etc/logrotate.d/pasteandsave <<'ROTATE'
/var/log/pasteandsave-*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}
ROTATE

# Rebuild only the entries this project owns, so re-running cannot duplicate
# them and any unrelated cron lines are left alone.
current="$(crontab -l 2>/dev/null \
  | grep -v 'pasteandsave/ops/' \
  | grep -v 'pasteandsave/auto-deploy.sh' \
  | grep -v '^ALERT_EMAIL=' \
  | grep -v '^ALERT_WEBHOOK_URL=' || true)"
{
  printf '%s\n' "$current"
  [ -n "$ALERT_EMAIL" ] && printf 'ALERT_EMAIL=%s\n' "$ALERT_EMAIL"
  [ -n "$ALERT_WEBHOOK_URL" ] && printf 'ALERT_WEBHOOK_URL=%s\n' "$ALERT_WEBHOOK_URL"
  echo "*/2 * * * * $OPS/auto-deploy.sh >> /var/log/pasteandsave-deploy.log 2>&1"
  echo "*/2 * * * * $OPS/health-watchdog.sh >> /var/log/pasteandsave-watchdog.log 2>&1"
  echo "17 4 * * * $OPS/update-ytdlp.sh >> /var/log/pasteandsave-ytdlp.log 2>&1"
} | crontab -

echo
echo "Installed:"
echo "  auto-deploy      every 2 min  (builds first, reloads, rolls back if unhealthy)"
echo "  health watchdog  every 2 min  (restarts a wedged app, max 6/day)"
echo "  yt-dlp update    daily 04:17  (self-tests, rolls back a bad update)"
echo "  alerts           -> ${ALERT_EMAIL:-(email off)}${ALERT_WEBHOOK_URL:+ + webhook}"
echo
echo "Logs: /var/log/pasteandsave-*.log"
echo "Check now: curl -s localhost:3000/api/health"
echo
echo "--- verifying alert delivery ---"
ALERT_EMAIL="$ALERT_EMAIL" ALERT_WEBHOOK_URL="$ALERT_WEBHOOK_URL" "$OPS/test-alert.sh" || true
