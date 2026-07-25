#!/usr/bin/env bash
# Shared alert delivery, sourced by the watchdog and the yt-dlp updater.
#
# A bare VPS usually cannot deliver mail on its own: outbound port 25 is
# commonly blocked, and without SPF, DKIM and a PTR record the big providers
# drop the message. So delivery is attempted in order of how reliably it
# actually arrives, and an alert is always written to the log even when every
# channel fails.
#
#   ALERT_WEBHOOK_URL  posts JSON (Discord, Slack, ntfy, anything)
#   ALERT_EMAIL        address to notify
#   ALERT_FROM         envelope sender for the email path
#
# Repeated alerts about the same thing are suppressed for a cooldown window,
# so a persistent fault produces a handful of messages rather than one every
# two minutes.

ALERT_STATE_DIR="${ALERT_STATE_DIR:-/var/lib/pasteandsave/alerts}"
ALERT_COOLDOWN_MIN="${ALERT_COOLDOWN_MIN:-30}"
ALERT_FROM="${ALERT_FROM:-pasteandsave@$(hostname -f 2>/dev/null || hostname)}"

# send_alert <subject> <body> [--force]
send_alert() {
  local subject="$1" body="$2" force="${3:-}"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"

  mkdir -p "$ALERT_STATE_DIR" 2>/dev/null

  # One marker per distinct subject; touched only after a real send attempt.
  local key marker
  key="$(printf '%s' "$subject" | tr -cd '[:alnum:]' | cut -c1-48)"
  marker="$ALERT_STATE_DIR/$key"

  if [ "$force" != "--force" ] && [ -f "$marker" ]; then
    local age_min
    age_min=$(( ( $(date +%s) - $(stat -c %Y "$marker" 2>/dev/null || echo 0) ) / 60 ))
    if [ "$age_min" -lt "$ALERT_COOLDOWN_MIN" ]; then
      echo "$ts alert suppressed (sent ${age_min}m ago): $subject"
      return 0
    fi
  fi

  local delivered=0

  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
    local http_code
    case "$ALERT_WEBHOOK_URL" in
      *ntfy*)
        # ntfy publishes the raw request body as the message, so JSON here
        # would arrive as a wall of braces. Plain text with a Title header
        # reads properly on the phone.
        http_code="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' \
          -H "Title: PasteAndSave: $subject" \
          -H "Priority: high" \
          -d "$body" "$ALERT_WEBHOOK_URL" 2>/dev/null || echo 000)"
        ;;
      *)
        # "content" suits Discord, "text" suits Slack; sending both keeps this
        # working without knowing which service is on the other end.
        local payload
        payload="$(printf '{"content":%s,"text":%s}' \
          "$(json_escape "[$subject] $body")" \
          "$(json_escape "[$subject] $body")")"
        http_code="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' \
          -X POST -H 'Content-Type: application/json' \
          -d "$payload" "$ALERT_WEBHOOK_URL" 2>/dev/null || echo 000)"
        ;;
    esac
    # Anything 2xx means the service accepted it; a placeholder URL or a typo
    # lands here as a connection failure or a 4xx, and must be reported.
    case "$http_code" in
      2*)
        delivered=1
        echo "$ts alert sent via webhook (http $http_code): $subject"
        ;;
      *)
        echo "$ts webhook delivery failed (http $http_code): $subject"
        ;;
    esac
  fi

  if [ -n "${ALERT_EMAIL:-}" ]; then
    local message
    message="$(printf 'From: %s\nTo: %s\nSubject: [PasteAndSave] %s\n\n%s\n\n-- \nSent %s from %s\n' \
      "$ALERT_FROM" "$ALERT_EMAIL" "$subject" "$body" "$ts" "$(hostname)")"

    if command -v msmtp >/dev/null 2>&1; then
      if printf '%s' "$message" | msmtp --read-envelope-from "$ALERT_EMAIL" 2>/dev/null; then
        delivered=1
        echo "$ts alert emailed via msmtp: $subject"
      else
        echo "$ts msmtp delivery failed: $subject"
      fi
    elif command -v sendmail >/dev/null 2>&1; then
      if printf '%s' "$message" | sendmail -t 2>/dev/null; then
        delivered=1
        echo "$ts alert handed to sendmail: $subject"
      else
        echo "$ts sendmail delivery failed: $subject"
      fi
    elif command -v mail >/dev/null 2>&1; then
      if printf '%s' "$body" | mail -s "[PasteAndSave] $subject" "$ALERT_EMAIL" 2>/dev/null; then
        delivered=1
        echo "$ts alert handed to mail: $subject"
      else
        echo "$ts mail delivery failed: $subject"
      fi
    else
      echo "$ts no mail sender installed, cannot email: $subject"
    fi
  fi

  touch "$marker" 2>/dev/null
  [ "$delivered" -eq 0 ] && echo "$ts ALERT UNDELIVERED: $subject - $body"
  return 0
}

json_escape() {
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null \
    || printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')"
}
