#!/usr/bin/env bash
# Intent 6fd5e63f's c7 on a Mac's Metal (README.md): one wind for everything that grows, and light through leaves.
# Two trees served one after the other: main (base: cb16b7a5's render kit and intent 11ead007's one cover stream, both
# on main since #2185, what this change sits on) and this change (head). Frame time at Sandbox 1 near/mid/far with the meter's bound; on head a 20 s film of
# a stand of plants with an 8° evening sun behind it, the clock pinned per frame, and the same t drawn twice.
# Needs bun, node with Playwright's Chromium, ffmpeg, and PLAY_MCP_TOKEN (the admin token, sent to play only).
# Writes intent-work/6fd5e63f-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/6fd5e63f-render"
OUT="$JOB/out"
MAIN=d5346b7ce13519a0606b4451dbc46aa272e79a48   # main: intent 11ead007 merged (#2185), and #2191 (the render bench), on cb16b7a5's kit and db87a28f's ground
HEAD=8bab28a80b0e42a4b401a2be56bbd4b93d77fbc9   # intent/6fd5e63f-living-plants: PR #2180's head (main d5346b7 merged in by play)
git -C "$ROOT" fetch -q origin main intent/6fd5e63f-living-plants intent-work/main-baseline-render
mkdir -p "$OUT"
git -C "$ROOT" show origin/intent-work/main-baseline-render:intent-work/main-baseline/determinism.mjs > "$JOB/determinism.mjs"
tree() { # tree <dir> <commit>
  if [ -d "$1" ]; then git -C "$1" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$1" "$2"; fi
  (cd "$1/play/site" && bun install --frozen-lockfile >/dev/null)
}
tree "$ROOT/../6fd5-main" "$MAIN"
tree "$ROOT/../6fd5-head" "$HEAD"
serve() { (cd "$ROOT/../6fd5-$1/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port "$2" --strictPort >"$OUT/vite-$1.log" 2>&1) </dev/null >/dev/null 2>&1 & echo $!; }
P1=$(serve main 5181); P3=$(serve head 5183)
trap 'kill $P1 $P3 2>/dev/null || true' EXIT
for p in 5181 5183; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# head first: it finds the pose (the low sun behind a stand of plants) main is stilled at too
node "$JOB/wind.mjs" --site head=http://localhost:5183 --site main=http://localhost:5181 \
  --meter "$ROOT/../6fd5-head/play/site/src/lib/content/render/meter.js" --determinism "$JOB/determinism.mjs" \
  --film head --out "$OUT" 2>&1 | tee "$OUT/wind.txt"
kill $P1 $P3 2>/dev/null || true

# the film, and its PNGs let go (the mp4 is what is kept)
ffmpeg -hide_banner -loglevel error -y -framerate 24 -i "$OUT/film-head/%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p "$OUT/film-head.mp4"
rm -rf "$OUT/film-head"
# the backlight: the golden still, main against head
for b in main; do
  s=$(ffmpeg -hide_banner -i "$OUT/$b-golden.png" -i "$OUT/head-golden.png" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2 || true)
  echo "golden $b-vs-head ssim $s" | tee -a "$OUT/ssim.txt"
done

node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const r = JSON.parse(fs.readFileSync(`${out}/results.json`, 'utf8'));
const at = (s, v) => r.views.find((x) => x.site === s && x.view === v)?.meter ?? {};
const rows = ['near', 'mid', 'far'].map((v) => {
  const m = at('main', v), h = at('head', v);
  // c7's budget: near at most main's + 8 ms and never above 33.4 ms; mid and far at most main's + 0.5 ms
  const within = v === 'near' ? h.frame_ms <= m.frame_ms + 8 && h.frame_ms <= 33.4 : h.frame_ms <= m.frame_ms + 0.5;
  return { view: v, main_ms: m.frame_ms, head_ms: h.frame_ms, head_minus_main: h.frame_ms - m.frame_ms, main_p95: m.frame_p95, head_p95: h.frame_p95, main_gpu: m.gpu_ms, head_gpu: h.gpu_ms, main_cpu: m.cpu_ms, head_cpu: h.cpu_ms, main_bound: m.bound, head_bound: h.bound, within_budget: within };
});
const summary = { rows, sameT: r.sameT, pose: r.pose, film: r.film && { ...r.film, mp4: 'film-head.mp4' } };
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1));
console.table(rows);
console.log('same t twice:', r.sameT);
JS
echo "main $MAIN · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/6fd5e63f-render)"
