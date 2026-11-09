#!/usr/bin/env bash
# Intent e85a5860's look (c4) in avenBOX: Sandbox 1's meadow on main and on this branch, and a trodden path springing
# back, shot by avenBOX's own Chromium in software (SwiftShader), no Mac (Samuel 2026-11-09).
#   bash intent-work/e85a5860-shots/run.sh [out dir]      (from the repository's root, on intent/e85a5860-grass-compute)
# Needs PLAY_MCP_TOKEN (the read-only proxy reads play) and origin/main fetched. Nothing paid.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; OUT="${1:-$REPO/intent-work/e85a5860-shots/out}"
MAIN="${MAIN_TREE:-${TMPDIR:-/tmp}/e85a5860-main}"
git -C "$REPO" fetch -q origin main
rm -rf "$MAIN"; git -C "$REPO" worktree prune
git -C "$REPO" worktree add -q --detach "$MAIN" origin/main
ln -s "$REPO/play/site/node_modules" "$MAIN/play/site/node_modules"
# main waits for Sandbox 5's first plants by a count of ticks, 20 minutes and more in software: its wait bounded by the
# clock in main's checkout here, as this branch does (village.ts), so main's world comes up; what it draws is main's
sed -i 's|for (let waited = 0; waited < 120000 \&\& |for (const until = performance.now() + 120000; performance.now() < until \&\& |; s|library.settled()); waited += 100) {|library.settled()); ) {|' "$MAIN/play/site/src/lib/content/sandbox-2/interior/village.ts"
grep -q 'performance.now() < until' "$MAIN/play/site/src/lib/content/sandbox-2/interior/village.ts"
(cd "$MAIN/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5191 --strictPort >"$MAIN.vite.log" 2>&1) &
M=$!
(cd "$REPO/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5192 --strictPort >"$MAIN.head-vite.log" 2>&1) &
H=$!
trap 'kill $M $H 2>/dev/null || true; git -C "$REPO" worktree remove --force "$MAIN" 2>/dev/null || true' EXIT
until curl -sf http://localhost:5191/ >/dev/null && curl -sf http://localhost:5192/ >/dev/null; do sleep 1; done
node "$REPO/intent-work/e85a5860-shots/shots.mjs" --main http://localhost:5191 --head http://localhost:5192 --out "$OUT"
