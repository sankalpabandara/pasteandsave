#!/usr/bin/env bash
# Downloads the yt-dlp and ffmpeg binaries this project shells out to,
# for Linux/macOS servers. Run once after cloning:
#   bash scripts/setup-bin.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/bin"
mkdir -p "$BIN"

# Replaces a binary that may be running right now.
#
# Writing straight to the destination fails with "Text file busy" (ETXTBSY):
# Linux refuses to open a file for writing while it is being executed, and this
# server spawns yt-dlp on almost every request. That is not a permissions
# problem and no amount of sudo fixes it. Renaming over the top does work,
# because rename only replaces the directory entry: any process mid-execution
# keeps the old inode until it exits, and the next spawn picks up the new file.
#
# This is also why `yt-dlp -U` quietly did nothing on this box for two months.
install_binary() {
  src="$1"
  dest="$2"
  chmod +x "$src"
  mv -f "$src" "$dest"
}

os="$(uname -s)"
arch="$(uname -m)"

echo "Downloading yt-dlp..."
if [ "$os" = "Darwin" ]; then
  yturl="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
else
  yturl="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
fi
curl -L -o "$BIN/yt-dlp.new" "$yturl"
install_binary "$BIN/yt-dlp.new" "$BIN/yt-dlp"

# Deno solves the JavaScript challenges YouTube presents. yt-dlp has deprecated
# running YouTube extraction without a runtime, and the fallback player clients
# need one even though android_vr does not.
echo "Downloading deno (JS runtime for YouTube challenges)..."
case "$os/$arch" in
  Linux/x86_64|Linux/amd64) denotarget="x86_64-unknown-linux-gnu" ;;
  Linux/aarch64|Linux/arm64) denotarget="aarch64-unknown-linux-gnu" ;;
  Darwin/arm64)              denotarget="aarch64-apple-darwin" ;;
  Darwin/x86_64)             denotarget="x86_64-apple-darwin" ;;
  *) denotarget="" ;;
esac
if [ -n "$denotarget" ]; then
  dtmp="$(mktemp -d)"
  if curl -fL -o "$dtmp/deno.zip"       "https://github.com/denoland/deno/releases/latest/download/deno-$denotarget.zip"; then
    unzip -o -q "$dtmp/deno.zip" -d "$dtmp"
    install_binary "$dtmp/deno" "$BIN/deno"
    "$BIN/deno" --version | head -1
  else
    echo "  deno download failed; YouTube fallback clients may not work" >&2
  fi
  rm -rf "$dtmp"
else
  echo "  no deno build for $os/$arch; skipping" >&2
fi

echo "Downloading ffmpeg + ffprobe..."
tmp="$(mktemp -d)"
if [ "$os" = "Linux" ] && { [ "$arch" = "x86_64" ] || [ "$arch" = "amd64" ]; }; then
  url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
  curl -L -o "$tmp/ffmpeg.tar.xz" "$url"
  tar -xf "$tmp/ffmpeg.tar.xz" -C "$tmp"
  d="$(find "$tmp" -maxdepth 1 -type d -name 'ffmpeg-*' | head -1)"
  install_binary "$d/bin/ffmpeg" "$BIN/ffmpeg"
  install_binary "$d/bin/ffprobe" "$BIN/ffprobe"
else
  echo "Automatic ffmpeg download only covers Linux x86_64."
  echo "Install ffmpeg with your package manager (e.g. 'brew install ffmpeg' or"
  echo "'apt install ffmpeg') and copy ffmpeg + ffprobe into $BIN, or point"
  echo "FFMPEG_DIR at their location."
fi

rm -rf "$tmp"
echo "Done. Binaries are in $BIN"
