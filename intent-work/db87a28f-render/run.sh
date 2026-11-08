#!/usr/bin/env bash
# Intent db87a28f's looks and cost on a Mac's Metal (README.md): main and the pull request's head side by side, one
# after the other. Run from anywhere inside the repository; needs bun, node and PLAY_MCP_TOKEN (the admin token, sent
# to play only). Writes intent-work/db87a28f-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/db87a28f-render"
OUT="$JOB/out"
BRANCH=intent/db87a28f-real-ground

git -C "$ROOT" fetch -q origin main "$BRANCH"
BASE=$(git -C "$ROOT" rev-parse origin/main)
HEAD=$(git -C "$ROOT" rev-parse "origin/$BRANCH")
mkdir -p "$OUT"
PIDS=()
trap 'for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done' EXIT
start() { # name commit port
	local tree="$ROOT/../db87-$1"
	if [ -d "$tree" ]; then git -C "$tree" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$tree" "$2"; fi
	(cd "$tree/play/site" && bun install --frozen-lockfile >/dev/null)
	(cd "$tree/play/site" && PLAY_API=http://localhost:3913 bunx vite dev --port "$3" --strictPort >"$OUT/vite-$1.log" 2>&1) &
	PIDS+=($!)
	for _ in $(seq 1 120); do curl -sf "http://localhost:$3/" >/dev/null && break; sleep 1; done
}
start base "$BASE" 5191
start head "$HEAD" 5192
TREE="$ROOT/../db87-head"
cd "$TREE/play/site"
BASE_COMMIT="$BASE" HEAD_COMMIT="$HEAD" node "$JOB/shots.mjs" --site base=http://localhost:5191 --site head=http://localhost:5192 \
	--meter "$TREE/play/site/src/lib/content/render/meter.js" --media "$TREE/play/media" --out "$OUT" 2>&1 | tee "$OUT/stdout.txt"
echo "base $BASE · head $HEAD · out: $OUT (commit out/ without vite-*.log and push intent-work/db87a28f-render)"
