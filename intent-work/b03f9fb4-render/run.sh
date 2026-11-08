#!/usr/bin/env bash
# Intent b03f9fb4's c9 on a Mac's Metal (README.md): main 06fc8c9 (base, three r186) against the pull request's head
# (one renderer on three r187 with WebGLNodesHandler): Sandbox 1 near/mid/far and Sandbox 3 open at 1440x900, noon,
# frame time with the meter's bound, screenshots compared by SSIM; and the king coconut story's live shot by
# story-parity.ts at 1, 3 and 5 s. Run from anywhere inside the repository; needs bun, node with Playwright's Chromium,
# ffmpeg, and PLAY_MCP_TOKEN (the admin token, sent to play only). Writes intent-work/b03f9fb4-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/b03f9fb4-render"
OUT="$JOB/out"
BASE_TREE="$ROOT/../b03f-base"
HEAD_TREE="$ROOT/../b03f-head"
BRANCH=intent/b03f9fb4-one-renderer
BASE=06fc8c9470faf44fdd21a3fa1b597041d21f22d5

git -C "$ROOT" fetch -q origin "$BRANCH" main
HEAD=$(git -C "$ROOT" rev-parse "origin/$BRANCH")
mkdir -p "$OUT"
tree() { # tree <dir> <commit>
  if [ -d "$1" ]; then git -C "$1" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$1" "$2"; fi
  (cd "$1/play/site" && bun install --frozen-lockfile >/dev/null)
}
tree "$BASE_TREE" "$BASE"
tree "$HEAD_TREE" "$HEAD"
grep -o '"version": "[^"]*"' "$BASE_TREE/play/site/node_modules/three/package.json" | sed 's/^/base three /' | tee "$OUT/versions.txt"
grep -o '"version": "[^"]*"' "$HEAD_TREE/play/site/node_modules/three/package.json" | sed 's/^/head three /' | tee -a "$OUT/versions.txt"

# both dev servers, their API at selector-shots' read-only proxy (127.0.0.1:3911)
(cd "$BASE_TREE/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5181 --strictPort >"$OUT/vite-base.log" 2>&1) &
VB=$!
(cd "$HEAD_TREE/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5182 --strictPort >"$OUT/vite-head.log" 2>&1) &
VH=$!
trap 'kill $VB $VH 2>/dev/null || true' EXIT
for p in 5181 5182; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# 1. the worlds, base then head (never side by side), each view metered
cd "$HEAD_TREE/play/site"
node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 \
  --meter src/lib/content/render/meter.js --out "$OUT/shots" 2>&1 | tee "$OUT/shots.txt"
kill $VB $VH 2>/dev/null || true

# 2. SSIM of each view, base against head
: > "$OUT/ssim.txt"
for v in sandbox-1-near sandbox-1-mid sandbox-1-far sandbox-3-open; do
  s=$(ffmpeg -hide_banner -i "$OUT/shots/base-$v.png" -i "$OUT/shots/head-$v.png" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2)
  echo "$v $s" | tee -a "$OUT/ssim.txt"
done

# 3. the story's live shot (the asset stage on the live runtime): head's parity, and base's beside it for reference
for t in head base; do
  dir=$HEAD_TREE; [ $t = base ] && dir=$BASE_TREE
  (cd "$dir/play/site" && bun scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98 --keep "$OUT/parity-$t") 2>&1 | tee "$OUT/parity-$t.txt" || true
done

# 4. the verdict
node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const r = JSON.parse(fs.readFileSync(`${out}/shots/results.json`, 'utf8'));
const ssim = Object.fromEntries(fs.readFileSync(`${out}/ssim.txt`, 'utf8').trim().split('\n').map((l) => l.split(' ')).map(([k, v]) => [k, +v]));
const rows = [];
for (const [world, view] of [['sandbox-1', 'near'], ['sandbox-1', 'mid'], ['sandbox-1', 'far'], ['sandbox-3', 'open']]) {
  const b = r.find((x) => x.site === 'base' && x.world === world && x.view === view), h = r.find((x) => x.site === 'head' && x.world === world && x.view === view);
  const ms = (x) => x?.meter?.frame_ms ?? x?.frameMs, p95 = (x) => x?.meter?.frame_p95 ?? x?.frameP95;
  rows.push({ view: `${world} ${view}`, ssim: ssim[`${world}-${view}`], base_ms: ms(b), head_ms: ms(h), base_p95: p95(b), head_p95: p95(h), base_bound: b?.meter?.bound, head_bound: h?.meter?.bound, base_gpu: b?.meter?.gpu_ms, head_gpu: h?.meter?.gpu_ms, base_tris: b?.tris, head_tris: h?.tris });
}
const parity = (t) => { try { const m = fs.readFileSync(`${out}/parity-${t}.txt`, 'utf8').match(/lowest SSIM ([0-9.]+)/); return m ? +m[1] : null; } catch { return null; } };
const summary = { rows, parity_lowest: { head: parity('head'), base: parity('base') } };
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1));
console.table(rows);
console.log('story parity, lowest SSIM:', summary.parity_lowest);
JS
echo "base $BASE · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/b03f9fb4-render)"
