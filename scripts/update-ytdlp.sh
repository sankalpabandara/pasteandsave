#!/usr/bin/env bash
# Keep yt-dlp current on the server. A stale binary is the single most common
# cause of "Couldn't read that link" errors, because YouTube and others change
# their internals constantly and only fresh yt-dlp builds keep up.
#
# Run it now and from cron, e.g. weekly:
#   0 4 * * 1  /srv/pasteandsave/scripts/update-ytdlp.sh >> /var/log/ytdlp-update.log 2>&1
#
# BIN_DIR should match the app's BIN_DIR env (defaults to ./bin next to the app).
set -euo pipefail

BIN_DIR="${BIN_DIR:-$(cd "$(dirname "$0")/.." && pwd)/bin}"
YTDLP="$BIN_DIR/yt-dlp"

mkdir -p "$BIN_DIR"

if [ -x "$YTDLP" ]; then
  echo "Updating existing yt-dlp in $BIN_DIR ..."
  # Self-update pulls the newest stable release in place.
  "$YTDLP" -U || {
    echo "Self-update failed; downloading a fresh copy instead."
    curl -L -o "$YTDLP" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
    chmod +x "$YTDLP"
  }
else
  echo "Downloading yt-dlp to $BIN_DIR ..."
  curl -L -o "$YTDLP" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
  chmod +x "$YTDLP"
fi

echo "yt-dlp version now: $("$YTDLP" --version)"
echo "Restart the app so long-running processes pick up the new binary."
