#!/usr/bin/env bash
# ASOQA — разбор клипов в JPEG-кадры для scroll-scrub + генерация manifest.json
# Использует portable ffmpeg из node_modules (sudo/apt недоступны).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FFMPEG="$ROOT/node_modules/ffmpeg-static/ffmpeg"
FFPROBE="$ROOT/node_modules/ffprobe-static/bin/linux/x64/ffprobe"
SRC="$ROOT/video"
OUT="$ROOT/assets/frames"

SCRUB_FPS="${SCRUB_FPS:-12}"   # кадров/сек для скраба
WIDTH="${WIDTH:-1000}"         # ширина кадра (высота авто, кратна 2) — легче декод/загрузка
QV="${QV:-6}"                  # качество JPEG (2..31, меньше=лучше)

echo "ffmpeg: $FFMPEG"
echo "fps=$SCRUB_FPS width=$WIDTH q:v=$QV"
mkdir -p "$OUT"

MANIFEST_ITEMS=()
TOTAL=0
for n in 1 2 3 4 5 6 7 8; do
  scene=$(printf "scene%02d" "$n")
  dir="$OUT/$scene"
  rm -rf "$dir"; mkdir -p "$dir"
  echo "--- $scene ($n.mp4) ---"
  "$FFMPEG" -v error -i "$SRC/$n.mp4" \
    -vf "fps=$SCRUB_FPS,scale=$WIDTH:-2:flags=lanczos" \
    -q:v "$QV" -an "$dir/frame_%04d.jpg"
  count=$(find "$dir" -name 'frame_*.jpg' | wc -l | tr -d ' ')
  dur=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$SRC/$n.mp4")
  size=$(du -sk "$dir" | cut -f1)
  echo "   кадров: $count  вес: ${size}KB  длит: ${dur}s"
  MANIFEST_ITEMS+=("{\"id\":$n,\"dir\":\"$scene\",\"file\":\"$n.mp4\",\"frames\":$count,\"dur\":$dur}")
  TOTAL=$((TOTAL+count))
done

# manifest.json
{
  echo "{"
  echo "  \"scrubFps\": $SCRUB_FPS,"
  echo "  \"width\": $WIDTH,"
  echo "  \"totalFrames\": $TOTAL,"
  echo -n "  \"scenes\": ["
  IFS=,; echo -n "${MANIFEST_ITEMS[*]}"; unset IFS
  echo "]"
  echo "}"
} > "$ROOT/assets/manifest.json"

echo ""
echo "ИТОГО кадров: $TOTAL"
echo "Общий вес кадров: $(du -sh "$OUT" | cut -f1)"
echo "manifest → assets/manifest.json"
