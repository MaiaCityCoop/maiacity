#!/usr/bin/env bash
# Intent c1bee1f8's c8 on a Mac (README.md): the smoke, about 5 minutes. The pull request's head built and served on 5183 through
# play's read-only proxy; every page opened in Chrome (Metal, WebGPU) and in Safari's engine (WebKit) by smoke.mjs: a
# screenshot each, its console errors, the backend that drew, frame times logged. Writes intent-work/c1bee1f8-render/out/.
# Needs bun, node with Playwright's Chromium and WebKit, and PLAY_MCP_TOKEN (the admin token, sent to play only).
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/c1bee1f8-render"
OUT="$JOB/out"
BRANCH=intent/c1bee1f8-webgpu-switch
HEAD_TREE="$ROOT/../c1bee-head"

git -C "$ROOT" fetch -q origin "$BRANCH"
# the head this job was made ready for (README's MAC JOB READY line), else the branch's tip
HEAD=${HEAD_COMMIT:-$(git -C "$ROOT" rev-parse "origin/$BRANCH")}
git -C "$ROOT" cat-file -e "$HEAD^{commit}" 2>/dev/null || git -C "$ROOT" fetch -q origin "$HEAD"
mkdir -p "$OUT"
if [ -d "$HEAD_TREE" ]; then git -C "$HEAD_TREE" checkout -q --detach "$HEAD"; else git -C "$ROOT" worktree add -q --detach "$HEAD_TREE" "$HEAD"; fi
(cd "$HEAD_TREE/play/site" && bun install --frozen-lockfile >/dev/null)
echo "head $HEAD" | tee "$OUT/commits.txt"

# a production build, as play.maia.city serves it (inline styles hashed, no dev client), served by vite preview with
# the same /api proxy; the dry run (DRY_STATE set) serves its stand-in without building
if [ -z "${DRY_STATE:-}" ]; then (cd "$HEAD_TREE/play/site" && bun run build >"$OUT/build-head.log" 2>&1); fi
(cd "$HEAD_TREE/play/site" && PLAY_API=http://localhost:3911 bunx vite preview --port 5183 --strictPort >"$OUT/vite-head.log" 2>&1) </dev/null >/dev/null 2>&1 &
VH=$!
trap 'kill $VH 2>/dev/null || true' EXIT
for _ in $(seq 1 120); do curl -sf "http://localhost:5183/" >/dev/null && break; sleep 1; done

(cd "$HEAD_TREE/play/site" && node "$JOB/smoke.mjs" --site http://localhost:5183 --out "$OUT/smoke") 2>&1 | tee "$OUT/smoke.txt"
kill $VH 2>/dev/null || true
echo "head $HEAD · out: $OUT (commit out/ and push the branch intent-work/c1bee1f8-render)"
