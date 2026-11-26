# Downloads the yt-dlp and ffmpeg binaries this project shells out to.
# Run once after cloning: powershell -ExecutionPolicy Bypass -File scripts/setup-bin.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root "bin"
New-Item -ItemType Directory -Force -Path $bin | Out-Null

Write-Host "Downloading yt-dlp.exe..."
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile (Join-Path $bin "yt-dlp.exe")

Write-Host "Downloading ffmpeg + ffprobe..."
$tmp = Join-Path $env:TEMP "ffmpeg-setup.zip"
$extract = Join-Path $env:TEMP "ffmpeg-setup-extract"
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile $tmp
Expand-Archive -Path $tmp -DestinationPath $extract -Force
Copy-Item (Get-ChildItem -Path $extract -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1).FullName (Join-Path $bin "ffmpeg.exe") -Force
Copy-Item (Get-ChildItem -Path $extract -Recurse -Filter "ffprobe.exe" | Select-Object -First 1).FullName (Join-Path $bin "ffprobe.exe") -Force
Remove-Item $tmp -Force
Remove-Item $extract -Recurse -Force

Write-Host "Done. Binaries are in $bin"
