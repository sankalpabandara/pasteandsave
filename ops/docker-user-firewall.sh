#!/usr/bin/env bash
# Keeps every Docker container off the public internet.
#
# UFW filters what reaches the host, but a port Docker publishes is forwarded
# straight to the container and never meets UFW's rules. On 2026-10-19 the
# bgutil-provider container, published as 0.0.0.0:4416, answered from the
# internet while UFW allowed only 22, 80 and 443. It is now bound to
# 127.0.0.1; this makes the next such mistake harmless too.
#
# Docker's documented place for this is the DOCKER-USER chain, which it
# consults before its own rules and never rewrites. One rule there drops a new
# TCP connection (a SYN) that arrives on the internet-facing interface for any
# container. Connections the containers open themselves, the WARP exits for
# one, are not touched: their replies are not SYNs, and WARP's own traffic is
# UDP. The site reaches its containers over loopback, which never passes here.
#
# Idempotent. Run by pasteandsave-docker-firewall.service whenever Docker
# starts, because iptables rules do not survive a reboot on their own.

set -euo pipefail

EXT_IF="${EXT_IF:-$(ip -o route show default | awk '{print $5; exit}')}"
if [ -z "$EXT_IF" ]; then
  echo "no default route, so no internet-facing interface to guard"
  exit 1
fi
TAG="pasteandsave: no public containers"

for ipt in iptables ip6tables; do
  command -v "$ipt" >/dev/null 2>&1 || continue
  # Docker creates the chain. Without it there is nothing to guard yet, and
  # the unit runs again the next time Docker starts.
  if ! "$ipt" -n -L DOCKER-USER >/dev/null 2>&1; then
    echo "$ipt: no DOCKER-USER chain, skipping"
    continue
  fi
  rule=(-i "$EXT_IF" -p tcp --syn -m comment --comment "$TAG" -j DROP)
  if "$ipt" -C DOCKER-USER "${rule[@]}" 2>/dev/null; then
    echo "$ipt: already in place on $EXT_IF"
  else
    "$ipt" -I DOCKER-USER 1 "${rule[@]}"
    echo "$ipt: added on $EXT_IF"
  fi
done
