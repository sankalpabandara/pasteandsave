#!/bin/bash
# Starts WARP in proxy mode and makes its SOCKS port reachable from the host.
#
# WARP only listens on the container's own loopback, so socat carries port
# 41000 to it, and Docker publishes 41000 on the host's loopback. If either
# process dies the container exits, and Docker's restart policy brings it
# back, rather than leaving a container that looks up and carries nothing.

mkdir -p /run/dbus
dbus-daemon --config-file=/usr/share/dbus-1/system.conf --fork >/dev/null 2>&1 || true

warp-svc >/var/log/warp-svc.log 2>&1 &

for _ in $(seq 1 30); do
  warp-cli --accept-tos status >/dev/null 2>&1 && break
  sleep 1
done

# A container that restarts keeps its registration; a new one gets its own.
warp-cli --accept-tos registration show >/dev/null 2>&1 || warp-cli --accept-tos registration new >/dev/null
warp-cli --accept-tos mode proxy >/dev/null
warp-cli --accept-tos proxy port 40000 >/dev/null
warp-cli --accept-tos connect >/dev/null

socat TCP-LISTEN:41000,fork,reuseaddr TCP:127.0.0.1:40000 &

wait -n
exit 1
