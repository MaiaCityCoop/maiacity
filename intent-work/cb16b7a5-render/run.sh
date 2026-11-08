#!/usr/bin/env bash
# Intent cb16b7a5's c7 on a Mac's Metal (README.md): the render kit's shaders in TSL (head) against main (base): five
# assets in the viewer (two cut open), Sandbox 1 near/mid/far by selector-shots.mjs and a 30 m walk for the level
# changes, at 1440x900, noon; frame times, screenshots compared by SSIM. Needs bun, node with Playwright's Chromium,
# ffmpeg and PLAY_MCP_TOKEN (the admin token, sent to play only). Writes intent-work/cb16b7a5-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/cb16b7a5-render"
OUT="$JOB/out"
BASE_TREE="$ROOT/../cb16-base"
HEAD_TREE="$ROOT/../cb16-head"
BRANCH=intent/cb16b7a5-render-tsl

git -C "$ROOT" fetch -q origin "$BRANCH" main
HEAD=$(git -C "$ROOT" rev-parse "origin/$BRANCH")
BASE=$(git -C "$ROOT" merge-base origin/main "$HEAD")
mkdir -p "$OUT"
tree() { # tree <dir> <commit>
  if [ -d "$1" ]; then git -C "$1" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$1" "$2"; fi
  (cd "$1/play/site" && bun install --frozen-lockfile >/dev/null)
}
tree "$BASE_TREE" "$BASE"
tree "$HEAD_TREE" "$HEAD"
echo "base $BASE head $HEAD" | tee "$OUT/commits.txt"

start() { # start <tree> <port> <log>
  (cd "$1/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port "$2" --strictPort >"$3" 2>&1) </dev/null >/dev/null 2>&1 &
  echo $!
}
VB=$(start "$BASE_TREE" 5181 "$OUT/vite-base.log")
VH=$(start "$HEAD_TREE" 5182 "$OUT/vite-head.log")
trap 'kill $VB $VH 2>/dev/null || true' EXIT
for p in 5181 5182; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# 1. Sandbox 1 near, mid, far: base then head, frame time and screenshots (each script starts its own proxy on :3911)
(cd "$HEAD_TREE/play/site" && node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --out "$OUT/shots") 2>&1 | tee "$OUT/shots.txt"
# 2. the assets in the viewer, two cut open, and the walk
(cd "$HEAD_TREE/play/site" && node "$JOB/assets.mjs" --site base=http://localhost:5181 --site head=http://localhost:5182 --out "$OUT/assets") 2>&1 | tee "$OUT/assets.txt"
kill $VB $VH 2>/dev/null || true

# 3. SSIM, base against head, every picture both sites took
: > "$OUT/ssim.txt"
for b in "$OUT"/shots/base-*.png "$OUT"/assets/base-*.png; do
  h="${b/\/base-/\/head-}"; [ -f "$h" ] || continue
  s=$(ffmpeg -hide_banner -i "$b" -i "$h" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2)
  echo "$(basename "$b" .png | sed 's/^base-//') $s" | tee -a "$OUT/ssim.txt"
done
# the walk as two strips, for the eye: a pop is a frame where a tree changes at once
for t in base head; do ffmpeg -hide_banner -loglevel error -y -framerate 2 -i "$OUT/assets/$t-walk-%02d.png" -vf "scale=720:-1,tile=13x1" -frames:v 1 "$OUT/walk-$t.png" || true; done

# 4. the verdict
node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const ssim = Object.fromEntries(fs.readFileSync(`${out}/ssim.txt`, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(' ')).map(([k, v]) => [k, +v]));
const rows = [];
const s1 = JSON.parse(fs.readFileSync(`${out}/shots/results.json`, 'utf8'));
for (const view of ['near', 'mid', 'far']) {
  const b = s1.find((x) => x.site === 'base' && x.world === 'sandbox-1' && x.view === view), h = s1.find((x) => x.site === 'head' && x.world === 'sandbox-1' && x.view === view);
  rows.push({ shot: `sandbox-1 ${view}`, ssim: ssim[`sandbox-1-${view}`], base_ms: b?.frameMs, head_ms: h?.frameMs, base_p95: b?.frameP95, head_p95: h?.frameP95, base_tris: b?.tris, head_tris: h?.tris });
}
const as = JSON.parse(fs.readFileSync(`${out}/assets/results.json`, 'utf8'));
for (const shot of [...new Set(as.map((x) => x.shot))]) {
  const b = as.find((x) => x.site === 'base' && x.shot === shot), h = as.find((x) => x.site === 'head' && x.shot === shot);
  rows.push({ shot, ssim: ssim[shot], base_ms: b?.frameMs, head_ms: h?.frameMs, base_p95: b?.frameP95, head_p95: h?.frameP95, ok: `${b?.ok}/${h?.ok}` });
}
const walk = [...Array(13).keys()].map((i) => String(i).padStart(2, '0')).map((i) => ssim[`walk-${i}`]);
fs.writeFileSync(`${out}/summary.json`, JSON.stringify({ rows, walk }, null, 1));
console.table(rows);
console.log('walk SSIM per frame (base vs head):', walk.join(' '));
JS
echo "base $BASE · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/cb16b7a5-render)"
