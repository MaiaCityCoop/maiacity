#!/usr/bin/env bash
# Intent c1bee1f8's c8 and c9 on a Mac's Metal (README.md): the switch (head, on WebGPU) against intent 8's head on
# WebGL (ref8) and main ff391a7 (WebGL, the last main before the TSL ports): Sandbox 1 near/mid/far and the old city by
# selector-shots.mjs with the frame meter, the viewer (an actor, a machine cut open) and a world by views.mjs, at
# 1440x900, noon; frame times, the meter's bound, the backend that drew, and SSIM head against ref8. Then the films:
# story-parity on king-coconut-live.json at 1, 3 and 5 s, twice, the two players' pictures compared pixel for pixel.
# Needs bun, node with Playwright's Chromium, ffmpeg and PLAY_MCP_TOKEN (the admin token, sent to play only).
# Writes intent-work/c1bee1f8-render/out/.
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/c1bee1f8-render"
OUT="$JOB/out"
BRANCH=intent/c1bee1f8-webgpu-switch
MAIN_PRE_TSL=ff391a7
MAIN_TREE="$ROOT/../c1bee-main"
REF8_TREE="$ROOT/../c1bee-ref8"
HEAD_TREE="$ROOT/../c1bee-head"

git -C "$ROOT" fetch -q origin "$BRANCH" main
HEAD=$(git -C "$ROOT" rev-parse "origin/$BRANCH")
# intent 8's head as the switch took it: the main the switch's branch last merged (8 Accepted and on main by then),
# drawn on WebGL there (its default); REF8 names another commit
REF8=${REF8:-$(git -C "$ROOT" merge-base origin/main "$HEAD")}
MAINC=$(git -C "$ROOT" rev-parse "$MAIN_PRE_TSL^{commit}" 2>/dev/null || { git -C "$ROOT" fetch -q origin "$MAIN_PRE_TSL" && git -C "$ROOT" rev-parse "$MAIN_PRE_TSL^{commit}"; })
mkdir -p "$OUT"
tree() { # tree <dir> <commit>
  if [ -d "$1" ]; then git -C "$1" checkout -q --detach "$2"; else git -C "$ROOT" worktree add -q --detach "$1" "$2"; fi
  (cd "$1/play/site" && bun install --frozen-lockfile >/dev/null)
}
tree "$MAIN_TREE" "$MAINC"
tree "$REF8_TREE" "$REF8"
tree "$HEAD_TREE" "$HEAD"
echo "main $MAINC ref8 $REF8 head $HEAD" | tee "$OUT/commits.txt"

start() { # start <tree> <port> <log>
  (cd "$1/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port "$2" --strictPort >"$3" 2>&1) </dev/null >/dev/null 2>&1 &
  echo $!
}
VM=$(start "$MAIN_TREE" 5181 "$OUT/vite-main.log")
VR=$(start "$REF8_TREE" 5182 "$OUT/vite-ref8.log")
VH=$(start "$HEAD_TREE" 5183 "$OUT/vite-head.log")
trap 'kill $VM $VR $VH 2>/dev/null || true' EXIT
for p in 5181 5182 5183; do for _ in $(seq 1 120); do curl -sf "http://localhost:$p/" >/dev/null && break; sleep 1; done; done

# 1. Sandbox 1 near, mid, far and the old city: main, ref8, head; frame time, the meter (its bound), the backend, shots
(cd "$HEAD_TREE/play/site" && node scripts/selector-shots.mjs --site main=http://localhost:5181 --site ref8=http://localhost:5182 --site head=http://localhost:5183 --meter src/lib/content/render/meter.js --out "$OUT/shots") 2>&1 | tee "$OUT/shots.txt"
# 2. the viewer (an actor; a machine whole and cut open) and a world
(cd "$HEAD_TREE/play/site" && node "$JOB/views.mjs" --site main=http://localhost:5181 --site ref8=http://localhost:5182 --site head=http://localhost:5183 --out "$OUT/views") 2>&1 | tee "$OUT/views.txt"
kill $VM $VR $VH 2>/dev/null || true

# 3. SSIM, head against ref8, every picture both took
: > "$OUT/ssim.txt"
for r in "$OUT"/shots/ref8-*.png "$OUT"/views/ref8-*.png; do
  h="${r/\/ref8-/\/head-}"; [ -f "$h" ] || continue
  s=$(ffmpeg -hide_banner -i "$r" -i "$h" -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2)
  echo "$(basename "$r" .png | sed 's/^ref8-//') $s" | tee -a "$OUT/ssim.txt"
done

# 4. c9: the film, twice, on head (WebGPU where HyperFrames' Chrome has it, else its WebGL 2 backend: said as 'drawn with')
for run in 1 2; do
  (cd "$HEAD_TREE/play/site" && bun scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98 --keep "$OUT/film-$run") 2>&1 | tee "$OUT/film-$run.txt" || true
done
: > "$OUT/seeks.txt"
for t in 1 3 5; do
  a="$OUT/film-1/player-$t.png"; b="$OUT/film-2/player-$t.png"
  if [ -f "$a" ] && [ -f "$b" ]; then
    d=$(ffmpeg -hide_banner -i "$a" -i "$b" -lavfi "blend=all_mode=difference,signalstats" -f null - 2>&1 | grep -o 'YMAX:[0-9.]*' | tail -1 | cut -d: -f2)
    if cmp -s "$a" "$b"; then same=identical; else same="differ (largest difference $d)"; fi
    echo "$t s: two seeks $same" | tee -a "$OUT/seeks.txt"
  else echo "$t s: missing a player picture" | tee -a "$OUT/seeks.txt"; fi
done

# 5. the verdict
node - "$OUT" <<'JS'
const fs = require('fs'), out = process.argv[2];
const ssim = Object.fromEntries(fs.readFileSync(`${out}/ssim.txt`, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(' ')).map(([k, v]) => [k, +v]));
const rows = [];
const s1 = JSON.parse(fs.readFileSync(`${out}/shots/results.json`, 'utf8'));
const of = (site, world, view) => s1.find((x) => x.site === site && x.world === world && x.view === view);
for (const [world, view, key] of [['sandbox-1', 'near', 'sandbox-1-near'], ['sandbox-1', 'mid', 'sandbox-1-mid'], ['sandbox-1', 'far', 'sandbox-1-far'], ['sandbox-3', 'open', 'sandbox-3-open']]) {
  const m = of('main', world, view), r = of('ref8', world, view), h = of('head', world, view);
  // the frame time selector-shots measured, else the meter's (the old city has only the meter's)
  const ms = (x) => x?.frameMs ?? x?.meter?.frame_ms;
  rows.push({ shot: key, ssim: ssim[key], head_backend: h?.backend, main_ms: ms(m), ref8_ms: ms(r), head_ms: ms(h), head_p95: h?.frameP95 ?? h?.meter?.frame_p95, head_gpu_ms: h?.meter?.gpu_ms, head_bound: h?.meter?.bound, ok: ssim[key] >= 0.95 && ms(h) <= ms(r) && ms(h) <= ms(m) });
}
const vs = JSON.parse(fs.readFileSync(`${out}/views/results.json`, 'utf8'));
for (const shot of [...new Set(vs.map((x) => x.shot))]) {
  const m = vs.find((x) => x.site === 'main' && x.shot === shot), r = vs.find((x) => x.site === 'ref8' && x.shot === shot), h = vs.find((x) => x.site === 'head' && x.shot === shot);
  rows.push({ shot, ssim: ssim[shot], head_backend: h?.backend, main_ms: m?.frameMs, ref8_ms: r?.frameMs, head_ms: h?.frameMs, head_p95: h?.frameP95, ok: ssim[shot] >= 0.95 && h?.frameMs <= r?.frameMs && h?.frameMs <= m?.frameMs });
}
const film = [1, 2].map((n) => { try { return fs.readFileSync(`${out}/film-${n}.txt`, 'utf8'); } catch { return ''; } });
const lowest = film.map((t) => Number(t.match(/lowest SSIM ([0-9.]+)/)?.[1]));
const drawn = film.map((t) => t.match(/drawn with: (.*)/)?.[1] ?? 'unknown');
const seeks = fs.readFileSync(`${out}/seeks.txt`, 'utf8').trim();
fs.writeFileSync(`${out}/summary.json`, JSON.stringify({ rows, film: { lowest, drawn, seeks } }, null, 1));
console.table(rows);
console.log(`c8: ${rows.every((r) => r.ok) ? 'PASS' : 'see the rows not ok'} (SSIM ≥ 0.95 against ref8, frame time at most ref8's and main ff391a7's; head's backend ${[...new Set(rows.map((r) => r.head_backend))].join('/')})`);
console.log(`c9: lowest SSIM ${lowest.join(' / ')} (at least 0.98), drawn with ${drawn.join(' / ')}; ${seeks.replace(/\n/g, '; ')}`);
JS
echo "main $MAINC · ref8 $REF8 · head $HEAD · out: $OUT (commit out/ and push the branch intent-work/c1bee1f8-render)"
