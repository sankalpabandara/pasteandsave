#!/usr/bin/env bash
# Downloads the yt-dlp and ffmpeg binaries this project shells out to,
# for Linux/macOS servers. Run once after cloning:
#   bash scripts/setup-bin.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/bin"
mkdir -p "$BIN"

os="$(uname -s)"
arch="$(uname -m)"

echo "Downloading yt-dlp..."
if [ "$os" = "Darwin" ]; then
  yturl="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
else
  yturl="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
fi
curl -L -o "$BIN/yt-dlp" "$yturl"
chmod +x "$BIN/yt-dlp"

echo "Downloading ffmpeg + ffprobe..."
tmp="$(mktemp -d)"
if [ "$os" = "Linux" ] && { [ "$arch" = "x86_64" ] || [ "$arch" = "amd64" ]; }; then
  url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
  curl -L -o "$tmp/ffmpeg.tar.xz" "$url"
  tar -xf "$tmp/ffmpeg.tar.xz" -C "$tmp"
  d="$(find "$tmp" -maxdepth 1 -type d -name 'ffmpeg-*' | head -1)"
  cp "$d/bin/ffmpeg" "$BIN/ffmpeg"
  cp "$d/bin/ffprobe" "$BIN/ffprobe"
  chmod +x "$BIN/ffmpeg" "$BIN/ffprobe"
else
  echo "Automatic ffmpeg download only covers Linux x86_64."
  echo "Install ffmpeg with your package manager (e.g. 'brew install ffmpeg' or"
  echo "'apt install ffmpeg') and copy ffmpeg + ffprobe into $BIN, or point"
  echo "FFMPEG_DIR at their location."
fi

rm -rf "$tmp"
echo "Done. Binaries are in $BIN"
