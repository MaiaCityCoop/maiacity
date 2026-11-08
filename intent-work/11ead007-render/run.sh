#!/usr/bin/env bash
# Intent 11ead007's c6 on a Mac's Metal (README.md): the one cover stream (head) against main (base). Sandbox 1 near,
# mid and far with the frame meter (frame_ms, cpu_ms), a 30 m walk in Sandbox 1 and a walk in the old city filmed at
# 1440x900 and set side by side, and the walnut on its cover in the viewer. Needs bun, node with Playwright's Chromium,
# ffmpeg and PLAY_MCP_TOKEN (the admin token, sent to play only). Writes intent-work/11ead007-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/11ead007-render"
OUT="$JOB/out"
BASE_TREE="$ROOT/../i5-base"
HEAD_TREE="$ROOT/../i5-head"
BRANCH=intent/11ead007-cover-stream

git -C "$ROOT" fetch -q origin "$BRANCH" main
HEAD=${HEAD_COMMIT:-e251559358a530c9667bfc06c4bbd42a33811832}
BASE=${BASE_COMMIT:-$(git -C "$ROOT" rev-parse origin/main)}
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
METER="$HEAD_TREE/play/site/src/lib/content/render/meter.js"

# 1. Sandbox 1 near, mid, far, base then head, with the meter (main's script: patch it with patch.py as usual)
(cd "$HEAD_TREE/play/site" && node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --meter "$METER" --out "$OUT/shots") 2>&1 | tee "$OUT/shots.txt"
# 2. the walks, filmed, and the walnut in the viewer
cp "$JOB/determinism.mjs" "$JOB/walk.mjs" "$HEAD_TREE/play/site/" 2>/dev/null || true
(cd "$HEAD_TREE/play/site" && node walk.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --meter "$METER" --out "$OUT/walk") 2>&1 | tee "$OUT/walk.txt"
rm -f "$HEAD_TREE/play/site/walk.mjs" "$HEAD_TREE/play/site/determinism.mjs"
kill $VB $VH 2>/dev/null || true

# 3. the films side by side (base left, head right), and SSIM of the stills
for w in sandbox-1 sandbox-3; do
  ffmpeg -hide_banner -loglevel error -y -i "$OUT/walk/base-$w.webm" -i "$OUT/walk/head-$w.webm" \
    -filter_complex "[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]hstack=inputs=2,drawtext=text='base main | head 11ead007':x=20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5" \
    -c:v libx264 -crf 20 -pix_fmt yuv420p "$OUT/walk-$w.mp4" || \
  ffmpeg -hide_banner -loglevel error -y -i "$OUT/walk/base-$w.webm" -i "$OUT/walk/head-$w.webm" \
    -filter_complex "[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]hstack=inputs=2" -c:v libx264 -crf 20 -pix_fmt yuv420p "$OUT/walk-$w.mp4"
done
: > "$OUT/ssim.txt"
for b in "$OUT"/shots/base-*.png "$OUT"/walk/base-*.png; do
  h="${b/\/base-/\/head-}"; [ -f "$h" ] || continue
  s=$(ffmpeg -hide_banner -i "$b" -i "$h" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2)
  echo "$(basename "$b" .png | sed 's/^base-//') $s" | tee -a "$OUT/ssim.txt"
done

# 4. the table: frame_ms and cpu_ms, base against head
node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const rows = [];
const s1 = JSON.parse(fs.readFileSync(`${out}/shots/results.json`, 'utf8'));
const row = (shot, b, h) => rows.push({ shot, base_ms: b?.frame_ms, head_ms: h?.frame_ms, base_p95: b?.frame_p95, head_p95: h?.frame_p95, base_cpu: b?.cpu_ms, head_cpu: h?.cpu_ms, base_gpu: b?.gpu_ms, head_gpu: h?.gpu_ms, worse: !!(b && h && (h.frame_ms > b.frame_ms * 1.05 || h.cpu_ms > b.cpu_ms * 1.05)) });
for (const view of ['near', 'mid', 'far']) {
  const f = (s) => s1.find((x) => x.site === s && x.world === 'sandbox-1' && x.view === view)?.meter;
  row(`sandbox-1 ${view}`, f('base'), f('head'));
}
const w = JSON.parse(fs.readFileSync(`${out}/walk/results.json`, 'utf8'));
for (const shot of [...new Set(w.map((x) => x.shot))]) row(shot, w.find((x) => x.site === 'base' && x.shot === shot)?.meter, w.find((x) => x.site === 'head' && x.shot === shot)?.meter);
fs.writeFileSync(`${out}/summary.json`, JSON.stringify({ rows }, null, 1));
console.table(rows);
JS
echo "base $BASE · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/11ead007-render)"
