#!/usr/bin/env bash
# Intent 602a8849's Mac job (README.md): c7, story parity on the rebuilt live runtime, on the head; and c8, the looks
# and frame times, base (main at the merge base) against head, with the render box's determinism. Run from anywhere
# inside the repository; needs bun, node with Playwright's Chromium, ffmpeg and PLAY_MCP_TOKEN (the admin token, sent
# to play only). Writes intent-work/602a8849-render/out/.
#   bash run.sh [head commit]   (default: the pull request's branch as it is now)
#   ONLY=c7 bash run.sh [head commit]   (c7 alone: story parity on head, no dev servers)
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/602a8849-render"
OUT="$JOB/out"
mkdir -p "$OUT"

git -C "$ROOT" fetch -q origin main intent/602a8849-tsl-shaders
HEAD_COMMIT=${1:-$(git -C "$ROOT" rev-parse origin/intent/602a8849-tsl-shaders)}
BASE_COMMIT=$(git -C "$ROOT" merge-base origin/main "$HEAD_COMMIT")
echo "base $BASE_COMMIT · head $HEAD_COMMIT" | tee "$OUT/commits.txt"

for side in base head; do
  TREE="$ROOT/../602a-$side"
  C=$([ $side = base ] && echo "$BASE_COMMIT" || echo "$HEAD_COMMIT")
  if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$C"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$C"; fi
  (cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)
  [ "${ONLY:-}" = c7 ] && [ $side = base ] && continue
done

# c7: story parity on head (its rebuilt live runtime), twice, so the same t is seen by two seeks
FIX=src/lib/stories/fixtures/king-coconut-live.json
for run in 1 2; do
  (cd "$ROOT/../602a-head/play/site" && bun scripts/story-parity.ts "$FIX" --at 1,3,5 --min-ssim 0.98 --lossless --keep "$OUT/parity-$run") 2>&1 | tee "$OUT/parity-$run.txt" || true
done
{
  for t in 1 3 5; do
    a=$(ffmpeg -loglevel error -i "$OUT/parity-1/player-$t.png" -f md5 - 2>/dev/null || echo none)
    b=$(ffmpeg -loglevel error -i "$OUT/parity-2/player-$t.png" -f md5 - 2>/dev/null || echo none)
    echo "t=$t seek 1 $a · seek 2 $b · $([ "$a" = "$b" ] && [ "$a" != none ] && echo identical || echo DIFFERENT)"
  done
} | tee "$OUT/parity-seeks.txt"
# keep the stills only (the renderer's frames are large)
for run in 1 2; do find "$OUT/parity-$run" -mindepth 1 -not -name 'player-*.png' -not -name 'render-*.png' -prune -exec rm -rf {} + 2>/dev/null || true; done

if [ "${ONLY:-}" = c7 ]; then echo "out: $OUT (c7 only; commit out/ and push the branch intent-work/602a8849-render)"; exit 0; fi

# c8: the looks and frame times, base then head
PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT
port=5191
for side in base head; do
  TREE="$ROOT/../602a-$side"
  (cd "$TREE/play/site" && PLAY_API=http://localhost:3913 bunx vite dev --port $port --strictPort >"$OUT/vite-$side.log" 2>&1) &
  PIDS+=($!)
  for _ in $(seq 1 180); do curl -sf "http://localhost:$port/" >/dev/null && break; sleep 1; done
  port=$((port + 1))
done
cd "$ROOT/../602a-head/play/site"
# head first (ORDER=base-first for the old order): on 09:41's run base settled every view and head none; if base is the
# one that never settles when it goes second, the order did it, not the code
if [ "${ORDER:-head-first}" = base-first ]; then SITES=(--site base=http://localhost:5191 --site head=http://localhost:5192); else SITES=(--site head=http://localhost:5192 --site base=http://localhost:5191); fi
BASE_COMMIT="$BASE_COMMIT" HEAD_COMMIT="$HEAD_COMMIT" node "$JOB/look.mjs" "${SITES[@]}" \
  --meter "$ROOT/../602a-head/play/site/src/lib/content/render/meter.js" --out "$OUT" 2>&1 | tee "$OUT/stdout.txt"
echo "out: $OUT (commit out/ and push the branch intent-work/602a8849-render)"
