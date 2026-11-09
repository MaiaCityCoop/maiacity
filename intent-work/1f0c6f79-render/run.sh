#!/usr/bin/env bash
# Intent 1f0c6f79's Mac job (c5, c6, c7): every world finished by the one RenderPipeline, on Samuel's Mac (Metal, WebGPU).
#   bash intent-work/1f0c6f79-render/run.sh        (from the repository's root, on the branch intent/1f0c6f79-post-atmosphere)
# Needs bun, node, Playwright with its Chromium, ffmpeg, curl, PLAY_MCP_TOKEN (read by the read-only proxy, sent to play
# only). No fal, nothing paid. Uses the render box's determinism (intent-work/main-baseline-render).
#   BASE=<commit>  intent 9's head to compare against (default: origin/intent/c1bee1f8-webgpu-switch, or main once 9 is in)
#   ONLY=c5|c6|c7  one check only
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN is needed: the worlds read play through the read-only proxy}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; J="$REPO/intent-work/1f0c6f79-render"; OUT="$J/out"; W="${WORK:-$HOME/1f0c6f79-work}"
rm -rf "$W" && mkdir -p "$W/shots" "$OUT"
git -C "$REPO" fetch -q origin intent/c1bee1f8-webgpu-switch main
# the render box's determinism, from the tree the job runs (play/site/scripts/macjob/determinism.js, intent cb52fbd9)
cp "$REPO/play/site/scripts/macjob/determinism.js" "$W/determinism.mjs"
if [ -z "${BASE:-}" ]; then
  # intent 9's head while it is a branch; main's once it is merged
  if git -C "$REPO" merge-base --is-ancestor origin/intent/c1bee1f8-webgpu-switch origin/main; then BASE=origin/main; else BASE=origin/intent/c1bee1f8-webgpu-switch; fi
fi
HEAD_C=$(git -C "$REPO" rev-parse --short HEAD); BASE_C=$(git -C "$REPO" rev-parse --short "$BASE")
echo "head $HEAD_C (this branch) · base $BASE_C ($BASE)" | tee "$OUT/run-log.txt"
# the base's tree beside this one, each its own dev server, both reading play through selector-shots' proxy (3911)
git -C "$REPO" worktree remove --force "$W/base" 2>/dev/null || true
git -C "$REPO" worktree add -q --detach "$W/base" "$BASE"
(cd "$REPO/play/site" && bun install >/dev/null); (cd "$W/base/play/site" && bun install >/dev/null)
(cd "$W/base/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5181 --strictPort >"$W/vite-base.log" 2>&1) & VB=$!
(cd "$REPO/play/site" && PLAY_API=http://localhost:3911 bunx vite dev --port 5182 --strictPort >"$W/vite-head.log" 2>&1) & VH=$!
trap 'kill $VB $VH 2>/dev/null || true; git -C "$REPO" worktree remove --force "$W/base" 2>/dev/null || true' EXIT
until curl -sf http://localhost:5181/ >/dev/null && curl -sf http://localhost:5182/ >/dev/null; do sleep 1; done
SHOTS="node $REPO/play/site/scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --meter $REPO/play/site/src/lib/content/render/meter.js --determinism $W/determinism.mjs --out $W/shots"
cd "$REPO/play/site"
if [ -z "${ONLY:-}" ] || [ "$ONLY" = c5 ]; then
  # c5: Sandbox 1 near/mid/far and the old city at noon and with a sun of 8° (19.44 on the sky's day), base then head
  $SHOTS --hour 12 --tag noon 2>&1 | tee -a "$OUT/run-log.txt"
  $SHOTS --hour 19.44 --tag sun8 2>&1 | tee -a "$OUT/run-log.txt"
fi
if [ -z "${ONLY:-}" ] || [ "$ONLY" = c6 ]; then
  # c6: Sandbox 1 near on a phone (390 × 844, touch): the small device's finishing, its frame time and render scale
  $SHOTS --hour 12 --tag small --small 2>&1 | tee -a "$OUT/run-log.txt"
fi
if [ -z "${ONLY:-}" ] || [ "$ONLY" = c7 ]; then
  # c7: the live film frame-exact with the pipeline: SSIM at 1, 3 and 5 s, then 3 s sought again in a second run, pixel for pixel
  bun scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98 --keep "$W/parity-1" 2>&1 | tee "$OUT/parity-log.txt"
  bun scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 3 --min-ssim 0.98 --keep "$W/parity-2" 2>&1 | tee -a "$OUT/parity-log.txt"
  if cmp -s "$W/parity-1/player-3.png" "$W/parity-2/player-3.png"; then echo "two seeks to 3 s: pixel-identical" | tee -a "$OUT/parity-log.txt"
  else echo "two seeks to 3 s: DIFFER" | tee -a "$OUT/parity-log.txt"; fi
  for t in 1 3 5; do ffmpeg -loglevel error -y -i "$W/parity-1/render-$t.png" -i "$W/parity-1/player-$t.png" -filter_complex hstack -q:v 3 "$OUT/parity-$t.jpg"; done
fi
cd "$REPO"
cp "$W"/shots/*results.json "$OUT/" 2>/dev/null || true
# the stills, small for git; base | head side by side
for p in "$W"/shots/*-head-*.png; do
  b="${p/-head-/-base-}"; n="$(basename "${p/-head-/-}" .png)"
  ffmpeg -loglevel error -y -i "$b" -i "$p" -filter_complex "[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack" -q:v 3 "$OUT/base-head-$n.jpg"
done
# beside Poly Haven's CC0 autumn_meadow and evening_field (their previews), the near view at each hour
for r in autumn_meadow evening_field; do
  curl -sSfL -o "$W/$r.jpg" "https://cdn.polyhaven.com/asset_img/primary/$r.png?height=900" || curl -sSfL -o "$W/$r.jpg" "https://cdn.polyhaven.com/asset_img/thumbs/$r.png?height=900" || continue
  for t in noon sun8; do
    [ -f "$W/shots/$t-head-sandbox-1-near.png" ] || continue
    ffmpeg -loglevel error -y -i "$W/shots/$t-head-sandbox-1-near.png" -i "$W/$r.jpg" -filter_complex "[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack" -q:v 3 "$OUT/beside-$r-$t.jpg"
  done
done
# c5's budget: head's mean frame time at most base's + 2.0 ms at each view and hour
node -e '
const fs = require("fs"), dir = process.argv[1]; let ok = true;
for (const tag of ["noon", "sun8"]) {
  const f = `${dir}/${tag}-results.json`; if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, "utf8")), ms = (x) => x.meter?.frameMs ?? x.meter?.frame_ms ?? x.frameMs;
  for (const h of r.filter((x) => x.site === "head")) {
    const b = r.find((x) => x.site === "base" && x.view === h.view && x.world === h.world); if (!b || ms(h) == null || ms(b) == null) continue;
    const pass = ms(h) <= ms(b) + 2.0; ok &&= pass;
    console.log(`${h.world} ${h.view}: base ${ms(b)} ms (gpu ${b.meter?.gpu_ms ?? "?"}), head ${ms(h)} ms (gpu ${h.meter?.gpu_ms ?? "?"}), +${(ms(h) - ms(b)).toFixed(2)} ms ${pass ? "within" : "OVER"} 2.0 (bound: ${h.meter?.bound ?? "?"})`);
  }
}
console.log(ok ? "c5 budget: within" : "c5 budget: OVER");' "$OUT" | tee "$OUT/budget.txt"
du -sh "$OUT"/*
echo "Push $OUT to the branch intent-work/1f0c6f79-render (as every job's results), never onto intent/1f0c6f79-post-atmosphere: no frame reaches main"
