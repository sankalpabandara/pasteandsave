#!/usr/bin/env bash
# Shared facts about the running app, sourced by the ops scripts.
#
# The port the app listens on is set in ecosystem.config.js, which pm2 reads.
# The deploy script and the health watchdog each had their own idea of it and
# both defaulted to 3000 after the app moved to 4100: deploys rolled back
# healthy builds, and the watchdog restarted a healthy site six times every
# night. Asking the file is the only answer that cannot go stale, and when it
# cannot be read the scripts stop and say so instead of guessing.

# The port, or nothing and a failure when it cannot be found.
app_port() {
  local dir="${APP_DIR:-/opt/pasteandsave}" found
  found="$(grep -oE 'PORT:[[:space:]]*"?[0-9]+' "$dir/ecosystem.config.js" 2>/dev/null)"
  found="${found##*[!0-9]}"
  [ -n "$found" ] || return 1
  printf '%s\n' "$found"
}

# The health address: HEALTH_URL when it is set, otherwise built from the port.
app_health_url() {
  if [ -n "${HEALTH_URL:-}" ]; then
    printf '%s\n' "$HEALTH_URL"
    return 0
  fi
  local port
  port="$(app_port)" || return 1
  printf 'http://127.0.0.1:%s/api/health\n' "$port"
}

# The HTTP status of a URL, always exactly three digits.
#
# curl prints 000 itself when it cannot connect and then exits non-zero, so
# the old "|| echo 000" appended a second one and the logs read "000000".
http_status() {
  local url="$1" out="${2:-/dev/null}" code
  code="$(curl -sS -o "$out" -w '%{http_code}' --max-time 20 "$url" 2>/dev/null || true)"
  [ -n "$code" ] || code=000
  printf '%s\n' "$code"
}
