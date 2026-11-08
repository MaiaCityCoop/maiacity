#!/usr/bin/env bash
# Intent 2214e661's look and frame time on a Mac's Metal (README.md): main (base) and the intent's pull request (head)
# measured with the frame meter at Sandbox 1's near, mid and far at noon and at a sun of 8°, and the old city as it
# opens, one after the other. Run from anywhere inside the repository; needs bun, node with Playwright's Chromium, and
# PLAY_MCP_TOKEN (the admin token, sent to play only). Writes intent-work/2214e661-render/out/.
#   bash run.sh [head commit]   (default: the pull request's branch as it is now)
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/2214e661-render"
OUT="$JOB/out"
mkdir -p "$OUT"

git -C "$ROOT" fetch -q origin main intent/2214e661-one-sky
HEAD_COMMIT=${1:-$(git -C "$ROOT" rev-parse origin/intent/2214e661-one-sky)}
BASE_COMMIT=$(git -C "$ROOT" merge-base origin/main "$HEAD_COMMIT")
echo "base $BASE_COMMIT · head $HEAD_COMMIT"

PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT
port=5191
for side in base head; do
  TREE="$ROOT/../2214-$side"
  C=$([ $side = base ] && echo "$BASE_COMMIT" || echo "$HEAD_COMMIT")
  if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$C"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$C"; fi
  (cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)
  (cd "$TREE/play/site" && PLAY_API=http://localhost:3913 bunx vite dev --port $port --strictPort >"$OUT/vite-$side.log" 2>&1) &
  PIDS+=($!)
  for _ in $(seq 1 180); do curl -sf "http://localhost:$port/" >/dev/null && break; sleep 1; done
  port=$((port + 1))
done

# the meter as both have it (unchanged by the intent); Playwright from the head tree's play/site
cd "$ROOT/../2214-head/play/site"
BASE_COMMIT="$BASE_COMMIT" HEAD_COMMIT="$HEAD_COMMIT" node "$JOB/look.mjs" --site base=http://localhost:5191 --site head=http://localhost:5192 \
  --meter "$ROOT/../2214-head/play/site/src/lib/content/render/meter.js" --out "$OUT" 2>&1 | tee "$OUT/stdout.txt"
echo "out: $OUT (commit out/ and push the branch intent-work/2214e661-render)"
