#!/usr/bin/env bash
# Intent 6fd5e63f's c7 on a Mac's Metal (README.md): one wind for everything that grows, and light through leaves.
# Three trees served one after the other: main (base), intent cb16b7a5's head (the render kit in TSL this change sits
# on) and this change on it (head). Frame time at Sandbox 1 near/mid/far with the meter's bound; on head a 20 s film of
# a stand of plants with an 8° evening sun behind it, the clock pinned per frame, and the same t drawn twice.
# Needs bun, node with Playwright's Chromium, ffmpeg, and PLAY_MCP_TOKEN (the admin token, sent to play only).
# Writes intent-work/6fd5e63f-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/6fd5e63f-render"
OUT="$JOB/out"
MAIN=f93ccba7a4bec2544ab92c859770bde5d96c121d   # main with intent b03f9fb4 (r187, one renderer)
KIT=78a881e74a81b6664c97bc4855234e783f8cc234    # intent cb16b7a5's head: the render kit in TSL
HEAD=a09d62c6b3323be54b20af22129ebe4510755a82   # intent-work/6fd5e63f-on-cb16b7a5: this intent's change on the kit
git -C "$ROOT" fetch -q origin main intent/cb16b7a5-render-tsl intent-work/6fd5e63f-on-cb16b7a5 intent-work/main-baseline-render
mkdir -p "$OUT"
git -C "$ROOT" show origin/intent-work/main-baseline-render:intent-work/main-baseline/determinism.mjs > "$JOB/determinism.mjs"
tree() { # tree <dir> <commit>
  if [ -d "$1" ]; then git -C "$1" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$1" "$2"; fi
  (cd "$1/play/site" && bun install --frozen-lockfile >/dev/null)
}
tree "$ROOT/../6fd5-main" "$MAIN"
tree "$ROOT/../6fd5-kit" "$KIT"
tree "$ROOT/../6fd5-head" "$HEAD"
serve() { (cd "$ROOT/../6fd5-$1/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port "$2" --strictPort >"$OUT/vite-$1.log" 2>&1) & echo $!; }
P1=$(serve main 5181); P2=$(serve kit 5182); P3=$(serve head 5183)
trap 'kill $P1 $P2 $P3 2>/dev/null || true' EXIT
for p in 5181 5182 5183; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# head first: it finds the pose (the low sun behind a stand of plants) the other two are stilled at too
node "$JOB/wind.mjs" --site head=http://localhost:5183 --site kit=http://localhost:5182 --site main=http://localhost:5181 \
  --meter "$ROOT/../6fd5-head/play/site/src/lib/content/render/meter.js" --determinism "$JOB/determinism.mjs" \
  --film head --out "$OUT" 2>&1 | tee "$OUT/wind.txt"
kill $P1 $P2 $P3 2>/dev/null || true

# the film, and its PNGs let go (the mp4 is what is kept)
ffmpeg -hide_banner -loglevel error -y -framerate 24 -i "$OUT/film-head/%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p "$OUT/film-head.mp4"
rm -rf "$OUT/film-head"
# the backlight: the golden still, main and kit against head
for b in main kit; do
  s=$(ffmpeg -hide_banner -i "$OUT/$b-golden.png" -i "$OUT/head-golden.png" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2 || true)
  echo "golden $b-vs-head ssim $s" | tee -a "$OUT/ssim.txt"
done

node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const r = JSON.parse(fs.readFileSync(`${out}/results.json`, 'utf8'));
const at = (s, v) => r.views.find((x) => x.site === s && x.view === v)?.meter ?? {};
const rows = ['near', 'mid', 'far'].map((v) => {
  const m = at('main', v), k = at('kit', v), h = at('head', v);
  return { view: v, main_ms: m.frame_ms, kit_ms: k.frame_ms, head_ms: h.frame_ms, head_minus_main: h.frame_ms - m.frame_ms, main_p95: m.frame_p95, head_p95: h.frame_p95, main_gpu: m.gpu_ms, head_gpu: h.gpu_ms, main_bound: m.bound, kit_bound: k.bound, head_bound: h.bound, within_half_ms: h.frame_ms <= m.frame_ms + 0.5 };
});
const summary = { rows, sameT: r.sameT, pose: r.pose, film: r.film && { ...r.film, mp4: 'film-head.mp4' } };
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1));
console.table(rows);
console.log('same t twice:', r.sameT);
JS
echo "main $MAIN · kit $KIT · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/6fd5e63f-render)"
