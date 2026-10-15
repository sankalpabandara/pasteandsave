# One WARP exit for the pool, built only from official sources: the Ubuntu
# base image and Cloudflare's own package repository, signed with the same
# key the server's own WARP was installed with (copied in by warp-pool.sh).
FROM ubuntu:24.04
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dbus socat curl \
 && rm -rf /var/lib/apt/lists/*
COPY cloudflare-warp-archive-keyring.gpg /usr/share/keyrings/
RUN echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ noble main" > /etc/apt/sources.list.d/cloudflare-client.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends cloudflare-warp \
 && rm -rf /var/lib/apt/lists/*
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
