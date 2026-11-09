#!/usr/bin/env bash
# Intent 24454c2d's c6 on a Mac's Metal (README.md): Sandbox 1's floor placed by its biomes' masks (head) against the
# same code with play's pinned v1 cards, no masks (base). One tree at HEAD_COMMIT, two dev servers: base on 5181 reading
# play through the plain proxy (3911), head on 5182 through the proxy that swaps in the drafted cards (3912). Stills from
# above and at walking height at 12:00 with the meter, and a 30 m walk filmed, set side by side.
# Needs bun, node with Playwright's Chromium, ffmpeg and PLAY_MCP_TOKEN (the admin token, sent to play only).
# Writes intent-work/24454c2d-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxies read play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/24454c2d-render"
OUT="$JOB/out"
TREE="$ROOT/../i12-head"
BRANCH=intent/24454c2d-masks

git -C "$ROOT" fetch -q origin "$BRANCH"
HEAD=${HEAD_COMMIT:-$(git -C "$ROOT" rev-parse "origin/$BRANCH")}
mkdir -p "$OUT"
if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$HEAD"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$HEAD"; fi
(cd "$TREE/play/site" && bun install --frozen-lockfile >/dev/null)
echo "head $HEAD (base: the same code, play's pinned v1 biome cards)" | tee "$OUT/commits.txt"

start() { # start <api port> <port> <log>
  (cd "$TREE/play/site" && PLAY_API="http://localhost:$1" bunx vite dev --port "$2" --strictPort >"$3" 2>&1) </dev/null >/dev/null 2>&1 &
  echo $!
}
VB=$(start 3911 5181 "$OUT/vite-base.log")
VH=$(start 3912 5182 "$OUT/vite-head.log")
trap 'kill $VB $VH 2>/dev/null || true' EXIT
for p in 5181 5182; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# 1. the views and the walk, base then head (the proxies are the script's own, on 3911 and 3912)
cp "$JOB/determinism.mjs" "$JOB/shots.mjs" "$TREE/play/site/"
(cd "$TREE/play/site" && node shots.mjs --meter src/lib/content/render/meter.js --cards "$JOB/cards" --out "$OUT/shots") 2>&1 | tee "$OUT/shots.txt"
rm -f "$TREE/play/site/shots.mjs" "$TREE/play/site/determinism.mjs"
kill $VB $VH 2>/dev/null || true

# 2. side by side (base left, head right): every still, and the walk (the films' last 13 s)
for b in "$OUT"/shots/base-*.png; do
  h="${b/\/base-/\/head-}"; [ -f "$h" ] || continue
  n=$(basename "$b" .png | sed 's/^base-//')
  ffmpeg -hide_banner -loglevel error -y -i "$b" -i "$h" -filter_complex hstack=inputs=2 "$OUT/pair-$n.jpg"
done
for s in base head; do ffmpeg -hide_banner -loglevel error -y -sseof -13 -i "$OUT/shots/$s-walk.webm" -c:v libx264 -crf 20 -pix_fmt yuv420p "$OUT/shots/$s-walk.mp4"; done
ffmpeg -hide_banner -loglevel error -y -i "$OUT/shots/base-walk.mp4" -i "$OUT/shots/head-walk.mp4" \
  -filter_complex "[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]hstack=inputs=2" -c:v libx264 -crf 20 -pix_fmt yuv420p "$OUT/walk.mp4"

# 3. the table: frame_ms, p95, cpu_ms and gpu_ms, base against head
node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const r = JSON.parse(fs.readFileSync(`${out}/shots/results.json`, 'utf8'));
const rows = [...new Set(r.map((x) => x.view))].map((view) => {
  const b = r.find((x) => x.site === 'base' && x.view === view)?.meter, h = r.find((x) => x.site === 'head' && x.view === view)?.meter;
  return { view, base_ms: b?.frame_ms, head_ms: h?.frame_ms, base_p95: b?.frame_p95, head_p95: h?.frame_p95, base_cpu: b?.cpu_ms, head_cpu: h?.cpu_ms, base_gpu: b?.gpu_ms, head_gpu: h?.gpu_ms, bound: h?.bound, worse: !!(b && h && (h.frame_ms > b.frame_ms * 1.05 || h.cpu_ms > b.cpu_ms * 1.05)) };
});
fs.writeFileSync(`${out}/summary.json`, JSON.stringify({ rows }, null, 1));
console.table(rows);
JS
rm -rf "$OUT"/shots/tmp-* "$OUT"/shots/*.webm
echo "head $HEAD · out: $OUT (commit out/ and push the branch intent-work/24454c2d-render)"
