#!/usr/bin/env bash
# Intent 1717f109's look (c3) in avenBOX: the roadside verge and the clover lawn, each biome's grass alone, main against
# this branch, shot by avenBOX's own Chromium in software (SwiftShader), as e85a5860's were. Nothing paid.
#   bash intent-work/1717f109-shots/run.sh [out dir] [base ref, default origin/main]
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; OUT="${1:-$REPO/intent-work/1717f109-shots/out}"; BASE="${2:-origin/main}"
MAIN="${MAIN_TREE:-${TMPDIR:-/tmp}/1717f109-main}"
git -C "$REPO" fetch -q origin "${BASE#origin/}"
rm -rf "$MAIN"; git -C "$REPO" worktree prune
git -C "$REPO" worktree add -q --detach "$MAIN" "$BASE"
# main its own dependencies (and so its own vite cache)
(cd "$MAIN/play/site" && bun install --frozen-lockfile >/dev/null)
(cd "$MAIN/play/site" && bunx vite dev --port 5191 --strictPort >"$MAIN.vite.log" 2>&1) &
M=$!
(cd "$REPO/play/site" && bunx vite dev --port 5192 --strictPort >"$MAIN.head-vite.log" 2>&1) &
H=$!
trap 'kill $M $H 2>/dev/null || true; git -C "$REPO" worktree remove --force "$MAIN" 2>/dev/null || true' EXIT
until curl -sf http://localhost:5191/ >/dev/null && curl -sf http://localhost:5192/ >/dev/null; do sleep 1; done
# each server asked for a page once and left a minute to optimise its dependencies, so the harness loads whole
curl -sf -o /dev/null http://localhost:5191/sandbox-1/ || true; curl -sf -o /dev/null http://localhost:5192/sandbox-1/ || true; sleep 60
node "$REPO/intent-work/1717f109-shots/shots.mjs" --main http://localhost:5191 --main-tree "$MAIN" --head http://localhost:5192 --out "$OUT"
