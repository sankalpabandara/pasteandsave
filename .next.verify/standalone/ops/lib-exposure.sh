#!/usr/bin/env bash
# Notices a Docker container published to the internet.
#
# UFW guards the host, but Docker forwards a published port past it, so a
# container started with "-p 4416:4416" instead of "-p 127.0.0.1:4416:4416"
# is open to everyone however UFW is set. That is how bgutil-provider sat on
# the internet unnoticed until 2026-10-19. Sourced by health-watchdog.sh,
# which already runs every two minutes; alerts go through lib-alert.sh and
# repeat at most every 30 minutes.

# Ports meant for the internet. Everything else belongs on 127.0.0.1.
PUBLIC_PORTS="${PUBLIC_PORTS:-22 80 443}"

check_public_containers() {
  local addr proc port found=()
  while read -r addr proc; do
    case "$addr" in 0.0.0.0:* | \[::\]:* | \*:*) ;; *) continue ;; esac
    port="${addr##*:}"
    case " $PUBLIC_PORTS " in *" $port "*) continue ;; esac
    found+=("$addr")
  done < <(ss -ltnpH 2>/dev/null | awk '{print $4, $6}' | grep 'docker-proxy' || true)

  [ "${#found[@]}" -eq 0 ] && return 0

  local guard="NOT installed, so they are reachable from the internet"
  if iptables -n -L DOCKER-USER 2>/dev/null | grep -q 'pasteandsave: no public containers'; then
    guard="installed, so new connections from the internet are dropped"
  fi
  echo "$(date '+%Y-%m-%d %H:%M:%S') docker publishes on every address: ${found[*]} (guard $guard)"
  send_alert "a Docker container is published to the internet" \
    "Docker is listening on ${found[*]}. Publish it as -p 127.0.0.1:PORT:PORT instead. The DOCKER-USER guard is $guard."
}
