#!/usr/bin/env bash
# Intent e85a5860's Mac job (c4, c5; c2 on the card): grass by the million in Sandbox 1 on Samuel's Mac (Metal, WebGPU).
#   bash intent-work/e85a5860-render/run.sh      (from the repository's root, on the branch intent/e85a5860-grass-compute)
# Needs bun, node, Playwright with its Chromium, ffmpeg, curl, PLAY_MCP_TOKEN (reads play through the read-only proxy).
# No fal, nothing paid. Uses the render box's determinism (intent-work/main-baseline-render).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; J="$REPO/intent-work/e85a5860-render"; OUT="$J/out"; W="${WORK:-$HOME/e85a5860-work}"
rm -rf "$W" && mkdir -p "$W" "$OUT"
git -C "$REPO" fetch -q origin intent-work/main-baseline-render
git -C "$REPO" show origin/intent-work/main-baseline-render:intent-work/main-baseline/determinism.mjs > "$W/determinism.mjs"
cd "$REPO/play/site" && bun install >/dev/null
PORT=5183
PLAY_API=http://localhost:3911 bunx vite dev --port $PORT --strictPort >"$W/vite.log" 2>&1 &
VITE=$!; trap 'kill $VITE 2>/dev/null || true' EXIT
until curl -sf "http://localhost:$PORT/" >/dev/null; do sleep 1; done
cd "$REPO"
DETERMINISM="$W/determinism.mjs" node "$J/grass.mjs" --site head=http://localhost:$PORT --out "$W" 2>&1 | tee "$OUT/run-log.txt"
DETERMINISM="$W/determinism.mjs" node "$J/grass.mjs" --site head=http://localhost:$PORT --out "$W" --small 2>&1 | tee "$OUT/run-log-small.txt"
cp "$W"/results*.json "$OUT/"
for p in "$W"/*.png; do ffmpeg -loglevel error -y -i "$p" -vf "scale=1440:-2" -q:v 3 "$OUT/$(basename "${p%.png}").jpg"; done
# intent 7's tiles beside the compute's blades, each view
for l in noon sun8; do for h in walk up2; do
  ffmpeg -loglevel error -y -i "$W/webgl2-$l-$h.png" -i "$W/webgpu-$l-$h.png" -filter_complex "[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack" -q:v 3 "$OUT/beside-$l-$h.jpg"
done; done
# the trodden path springing back, 0 / 2 / 5 / 10 s side by side, and the walking film (drawn only where the blades
# are chosen on the card: on the Mac always, as grass.mjs stops where WebGPU fell back; not in avenBOX's dry run)
if [ -f "$W/trample-0s.png" ]; then
ffmpeg -loglevel error -y -i "$W/trample-0s.png" -i "$W/trample-2s.png" -i "$W/trample-5s.png" -i "$W/trample-10s.png" -filter_complex "[0:v]scale=-2:480[a];[1:v]scale=-2:480[b];[2:v]scale=-2:480[c];[3:v]scale=-2:480[d];[a][b][c][d]hstack=4" -q:v 3 "$OUT/trample-strip.jpg"
ffmpeg -loglevel error -y -framerate 24 -i "$W/film-noon/%04d.jpg" -vf "scale=1440:-2" -c:v libx264 -crf 24 -pix_fmt yuv420p "$OUT/film-noon.mp4"
fi
du -sh "$OUT"/*
grep '^verdict' "$OUT/run-log.txt" "$OUT/run-log-small.txt"
echo "Push $OUT to the branch intent-work/e85a5860-render (as every job's results), never onto intent/e85a5860-grass-compute: no frame reaches main"
