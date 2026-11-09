#!/usr/bin/env bash
# Intent 090168c8's Mac job (c7, c8): real grass in Sandbox 1 on Samuel's Mac (Metal).
#   bash intent-work/090168c8-render/run.sh      (from the repository's root, on the branch intent/090168c8-real-grass)
# Needs bun, node, Playwright with its Chromium, ffmpeg, curl, PLAY_MCP_TOKEN (reads play through the read-only proxy).
# No fal, nothing paid. Uses the tree's own determinism (play/site/scripts/macjob/determinism.js, as the census does).
# Dry-run first in avenBOX: bun play/site/scripts/macjob/dry.ts intent-work/090168c8-render --at <this commit>
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; J="$REPO/intent-work/090168c8-render"; OUT="$J/out"; W="${WORK:-$HOME/090168c8-work}"
rm -rf "$W" && mkdir -p "$W" "$OUT"
DET="$REPO/play/site/scripts/macjob/determinism.js"
cd "$REPO/play/site" && bun install >/dev/null
PORT=5182
PLAY_API=http://localhost:3911 bunx vite dev --port $PORT --strictPort >"$W/vite.log" 2>&1 &
VITE=$!; trap 'kill $VITE 2>/dev/null || true' EXIT
until curl -sf "http://localhost:$PORT/" >/dev/null; do sleep 1; done
cd "$REPO"
DETERMINISM="$DET" node "$J/grass.mjs" --site head=http://localhost:$PORT --out "$W" 2>&1 | tee "$OUT/run-log.txt"
DETERMINISM="$DET" node "$J/grass.mjs" --site head=http://localhost:$PORT --out "$W" --small 2>&1 | tee "$OUT/run-log-small.txt"
cp "$W"/results*.json "$OUT/"
# the stills, small for git
for p in "$W"/*.png; do ffmpeg -loglevel error -y -i "$p" -vf "scale=1440:-2" -q:v 3 "$OUT/$(basename "${p%.png}").jpg"; done
# the walking films
for l in noon sun8; do
  ffmpeg -loglevel error -y -framerate 24 -i "$W/film-$l/%04d.jpg" -vf "scale=1440:-2" -c:v libx264 -crf 24 -pix_fmt yuv420p "$OUT/film-$l.mp4"
done
# beside Poly Haven's CC0 meadows (meadow_2, autumn_meadow: their tone-mapped previews), each at the same height
for r in meadow_2 autumn_meadow; do
  curl -sSfL -o "$W/$r.jpg" "https://cdn.polyhaven.com/asset_img/primary/$r.png?height=900" || curl -sSfL -o "$W/$r.jpg" "https://cdn.polyhaven.com/asset_img/thumbs/$r.png?height=900"
  for v in noon-walk sun8-walk; do
    ffmpeg -loglevel error -y -i "$W/$v.png" -i "$W/$r.jpg" -filter_complex "[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack" -q:v 3 "$OUT/beside-$r-$v.jpg"
  done
done
du -sh "$OUT"/*
echo "Push $OUT to the branch intent-work/090168c8-render (as every job's results), never onto intent/090168c8-real-grass: no frame reaches main"
