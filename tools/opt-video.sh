#!/usr/bin/env bash
# Re-encode the 6 referenced background videos to a lighter, dual-format set:
#   .webm (VP9)  — smaller, served first to modern browsers
#   .mp4  (H.264) — universal fallback
# Full-screen background loops, muted → audio stripped, width capped at 1280,
# faststart for progressive playback. Visually transparent (CRF 23 h264 / 32 vp9).
set -euo pipefail
FF="/home/claude/ASOQA/ASOQAsite/node_modules/ffmpeg-static/ffmpeg"
SRC="/home/claude/incoming/ASOQA222/asoqa7-hig/project/media"
OUT="/home/claude/ASOQA/ASOQAsite/media"
VIDS="young_hero young_idea young_build scene3_0708_2 young_top5 young_finale"
SCALE="scale='min(1280,iw)':-2:flags=lanczos"

for v in $VIDS; do
  echo ">>> $v"
  # H.264 mp4 (fallback, universal)
  "$FF" -y -hide_banner -loglevel error -i "$SRC/$v.mp4" \
    -vf "$SCALE" -an -c:v libx264 -profile:v high -preset slow -crf 23 \
    -pix_fmt yuv420p -movflags +faststart "$OUT/$v.mp4"
  # VP9 webm (primary, smaller)
  "$FF" -y -hide_banner -loglevel error -i "$SRC/$v.mp4" \
    -vf "$SCALE" -an -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 \
    -pix_fmt yuv420p -deadline good -cpu-used 2 "$OUT/$v.webm"
  m=$(du -h "$OUT/$v.mp4" | cut -f1); w=$(du -h "$OUT/$v.webm" | cut -f1)
  o=$(du -h "$SRC/$v.mp4" | cut -f1)
  echo "    $v: src $o -> mp4 $m / webm $w"
done
echo "=== VIDEO DONE ==="
du -sh "$OUT"/*.mp4 "$OUT"/*.webm 2>/dev/null | tail -20
