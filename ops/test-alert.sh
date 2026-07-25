#!/usr/bin/env bash
# Sends one test alert and reports exactly which channels worked.
#
# Worth running after any change to the alert settings: an alert system that
# quietly fails is worse than none, because it looks like everything is fine.
#
#   ALERT_EMAIL=you@example.com /opt/pasteandsave/ops/test-alert.sh

set -uo pipefail

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"

echo "Alert configuration"
echo "  ALERT_EMAIL       : ${ALERT_EMAIL:-(not set)}"
echo "  ALERT_WEBHOOK_URL : $([ -n "${ALERT_WEBHOOK_URL:-}" ] && echo "(set)" || echo "(not set)")"
echo "  ALERT_FROM        : $ALERT_FROM"
echo

echo "Mail senders available:"
for c in msmtp sendmail mail; do
  if command -v "$c" >/dev/null 2>&1; then
    echo "  $c: yes ($(command -v "$c"))"
  else
    echo "  $c: no"
  fi
done
echo

if [ -z "${ALERT_EMAIL:-}" ] && [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
  echo "Nothing is configured, so no alert can be delivered."
  echo "Set ALERT_EMAIL, ALERT_WEBHOOK_URL, or both, then run this again."
  exit 1
fi

echo "Sending test alert..."
send_alert "test alert" \
  "This is a test from $(hostname). If you are reading this, alerts are working and you will be told when the site needs you." \
  --force

echo
echo "Read the lines above: each channel reports sent or failed."
echo "If email says sent but nothing arrives within a few minutes, the message"
echo "was accepted locally and dropped later. Check the mail log:"
echo "  sudo tail -n 40 /var/log/mail.log"
