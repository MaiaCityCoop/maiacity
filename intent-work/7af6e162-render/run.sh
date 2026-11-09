#!/usr/bin/env bash
# Intent 7af6e162's Mac job (README.md), c7: Sandbox 1 on the Mac's Metal at the pull request's head, its first load in
# a fresh profile (cold) and its next load in the same profile (warm). Prints both settle times and pictures taken;
# shoots near, mid and far of a cold load and of a warm one, and compares them pixel by pixel where ImageMagick is.
# Run from anywhere inside the repository; needs bun, node with Playwright's Chromium and PLAY_MCP_TOKEN (the admin
# token, sent to play only). Writes intent-work/7af6e162-render/out/.
#   bash run.sh [head commit]   (default: intent/7af6e162-settle-fast as it is now)
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/7af6e162-render"
OUT="$JOB/out"
rm -rf "$OUT" && mkdir -p "$OUT"
git -C "$ROOT" fetch -q origin intent/7af6e162-settle-fast
HEAD_COMMIT=${1:-$(git -C "$ROOT" rev-parse origin/intent/7af6e162-settle-fast)}
echo "head $HEAD_COMMIT (served: ${SERVE:-dev})" | tee "$OUT/commits.txt"
TREE="$ROOT/../7af6-head"
if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$HEAD_COMMIT"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$HEAD_COMMIT"; fi
(cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)

PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT
# served by the dev server, the path the asset box is known to build on; SERVE=built bash run.sh serves the head's
# production build as play-api serves it (mac-page.mjs serve: serve-built.ts), not yet seen to build the box on the Mac
if [ "${SERVE:-dev}" = dev ]; then
  (cd "$TREE/play/site" && PLAY_API=http://localhost:3911 exec bunx vite dev --port 5197 --strictPort >"$OUT/serve.log" 2>&1) &
else
  (cd "$TREE/play/site" && exec node scripts/mac-page.mjs serve 5197 http://localhost:3911 >"$OUT/serve.log" 2>&1) &
fi
PIDS+=($!)
for _ in $(seq 1 300); do curl -sf "http://localhost:5197/" >/dev/null && break; sleep 1; done
cd "$TREE/play/site"
# a fresh place for this job's profiles: both runs start with nothing kept
export MAC_PROFILES="$OUT/profiles"
# 1. cold: the first load in a fresh profile, measured as it is
node scripts/selector-shots.mjs --cold --site cold=http://localhost:5197 --out "$OUT/cold" 2>&1 | tee "$OUT/cold.txt"
# 2. warm: another fresh profile, opened once (its first load, cold again) and measured on the next load
node scripts/selector-shots.mjs --site warm=http://localhost:5197 --out "$OUT/warm" 2>&1 | tee "$OUT/warm.txt"
rm -rf "$MAC_PROFILES"
{
  echo "== settle (quiet by play/site/scripts/quiet.js)"
  grep -h "load up and" "$OUT/cold.txt" "$OUT/warm.txt"
  echo "== frames"
  grep -hE "sandbox-1 (near|mid|far):" "$OUT/cold.txt" "$OUT/warm.txt"
  if command -v compare >/dev/null; then
    echo "== the same picture? (pixels that differ, cold against warm)"
    for v in near mid far; do
      echo "$v: $(compare -metric AE "$OUT/cold/cold-sandbox-1-$v.png" "$OUT/warm/warm-sandbox-1-$v.png" "$OUT/diff-$v.png" 2>&1 || true)"
    done
  fi
} | tee "$OUT/SUMMARY.txt"
echo "out: $OUT (commit out/ and push the branch intent-work/7af6e162-render)"
