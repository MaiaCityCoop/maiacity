#!/usr/bin/env bash
# Intent 3a8b135a's Mac job (README.md): c5, far trees as octahedral impostors lit by the sky: the look (Sandbox 1 far,
# a far wood, a slow 360° orbit film, at a sun 8° up and at 12:00) and the frame time, base (intent 9's head) against
# head (this intent's pull request), with the render box's determinism. Run from anywhere inside the repository; needs
# bun, node with Playwright's Chromium, ffmpeg and PLAY_MCP_TOKEN (the admin token, sent to play only).
# Writes intent-work/3a8b135a-render/out/.
#   bash run.sh [head commit] [base commit]   (defaults: the two branches as they are now)
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/3a8b135a-render"
OUT="$JOB/out"
mkdir -p "$OUT"

git -C "$ROOT" fetch -q origin intent/3a8b135a-octahedral-impostors intent/c1bee1f8-webgpu-switch
HEAD_COMMIT=${1:-$(git -C "$ROOT" rev-parse origin/intent/3a8b135a-octahedral-impostors)}
BASE_COMMIT=${2:-$(git -C "$ROOT" rev-parse origin/intent/c1bee1f8-webgpu-switch)}
echo "base (intent 9's head) $BASE_COMMIT · head $HEAD_COMMIT" | tee "$OUT/commits.txt"

for side in base head; do
  TREE="$ROOT/../3a8b-$side"
  C=$([ $side = base ] && echo "$BASE_COMMIT" || echo "$HEAD_COMMIT")
  if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$C"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$C"; fi
  (cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)
done

PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT
port=5193
for side in base head; do
  TREE="$ROOT/../3a8b-$side"
  (cd "$TREE/play/site" && PLAY_API=http://localhost:3913 bunx vite dev --port $port --strictPort >"$OUT/vite-$side.log" 2>&1) &
  PIDS+=($!)
  for _ in $(seq 1 180); do curl -sf "http://localhost:$port/" >/dev/null && break; sleep 1; done
  port=$((port + 1))
done
cd "$ROOT/../3a8b-head/play/site"
BASE_COMMIT="$BASE_COMMIT" HEAD_COMMIT="$HEAD_COMMIT" node "$JOB/look.mjs" --site base=http://localhost:5193 --site head=http://localhost:5194 \
  --meter "$ROOT/../3a8b-head/play/site/src/lib/content/render/meter.js" --out "$OUT" 2>&1 | tee "$OUT/stdout.txt"
# keep the films and the stills of the views; the orbits' single stills go (the films hold them)
rm -rf "$OUT"/base-orbit-*/ "$OUT"/head-orbit-*/
echo "out: $OUT (commit out/ and push the branch intent-work/3a8b135a-render)"
