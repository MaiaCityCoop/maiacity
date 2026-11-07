#!/usr/bin/env bash
# Intent bba9c796's audit on a Mac's Metal (README.md): main's Sandbox 1 and Sandbox 3 measured with the frame meter
# from the intent's pull request. Run from anywhere inside the repository; needs bun, node with Playwright's Chromium,
# and PLAY_MCP_TOKEN (the admin token, sent to play only). Writes intent-work/bba9c796-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/bba9c796-render"
OUT="$JOB/out"
TREE="$ROOT/../bba9-main"
PORT=5183

git -C "$ROOT" fetch -q origin main intent/bba9c796-three-performance
MAIN=$(git -C "$ROOT" rev-parse origin/main)
mkdir -p "$OUT"
# the meter as the pull request has it
git -C "$ROOT" show origin/intent/bba9c796-three-performance:play/site/src/lib/content/render/meter.js > "$OUT/meter.js"

# main, in a worktree of its own
if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$MAIN"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$MAIN"; fi
(cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)

# its dev server, its API at the audit's read-only proxy
(cd "$TREE/play/site" && PLAY_API=http://localhost:3912 bunx vite dev --port $PORT --strictPort >"$OUT/vite.log" 2>&1) &
VITE=$!
trap 'kill $VITE 2>/dev/null || true' EXIT
for _ in $(seq 1 120); do curl -sf "http://localhost:$PORT/" >/dev/null && break; sleep 1; done

# Playwright from play/site's own node_modules (the one the 6295a650 job used)
cd "$TREE/play/site"
AUDIT_COMMIT="$MAIN" node "$JOB/audit.mjs" --site "http://localhost:$PORT" --meter "$OUT/meter.js" --out "$OUT" 2>&1 | tee "$OUT/stdout.txt"
echo "main $MAIN · out: $OUT (commit out/ and push the branch intent-work/bba9c796-render)"
