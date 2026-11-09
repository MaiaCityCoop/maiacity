# 1f0c6f79 · the Mac render job (c5, c6, c7: every world finished by one pipeline)

GPU work runs only on Samuel's Mac (Metal), never on SwiftShader in the cloud. This job draws Sandbox 1 and the old city
through the world's finishing (`play/site/src/lib/content/render/finish.js`, `post.js` `createFinish`, `atmosphere.js`,
`grade.js`) on WebGPU, beside intent 9's head (the switch alone, no finishing), and plays the live film through it.

**On the Mac**, from the repository's root:

```sh
git fetch origin intent/1f0c6f79-post-atmosphere && git checkout intent/1f0c6f79-post-atmosphere
bash intent-work/1f0c6f79-render/run.sh            # ONLY=c5|c6|c7 for one check; BASE=<commit> to compare elsewhere
```

- **Needs:** bun, node, Playwright with its Chromium, ffmpeg, curl, and `PLAY_MCP_TOKEN` (read by selector-shots'
  read-only proxy, sent to play only). No fal, nothing paid.
- **Base:** intent 9's head (`origin/intent/c1bee1f8-webgpu-switch`; main once 9 is merged), in a worktree beside this
  tree, each its own dev server (5181 base, 5182 head). The shared main baseline (`intent-work/main-baseline-render`,
  `out/<main commit>/`) is the reference for anything main already shows; this job measures base and head itself
  because the base is a branch.
- **Determinism:** the render box's `determinism.mjs` (fetched from `intent-work/main-baseline-render`), passed to
  `selector-shots.mjs --determinism`: `SEEDED_RANDOM` an init script, `QUIET` the settle. The hour is pinned
  (`__interiorHour`).
- **Renderer:** selector-shots prints `GPU: …` and each view prints `finishing <device> (<backend>), scale …`: if the GPU
  is not Apple's Metal or the backend not `webgpu`, stop and say so.
- **The meter** (`render/meter.js`, WebGPU since intent 9) samples each view: frame_ms, gpu_ms, and the bound.

**c5** (Sandbox 1 near/mid/far and the old city at 1440 × 900, at 12:00 and with a sun of 8°, 19.44 on the sky's day):

- `out/base-head-<noon|sun8>-sandbox-1-<view>.jpg`, `out/base-head-<noon|sun8>-sandbox-3-open.jpg`: base | head.
- `out/beside-<autumn_meadow|evening_field>-<noon|sun8>.jpg`: head's near view beside Poly Haven's CC0 previews.
- `out/noon-results.json`, `out/sun8-results.json`; `out/budget.txt`: head's mean frame time against base's + 2.0 ms at
  each view (with each side's gpu_ms and the bound).
- **Look for:**
  - occlusion only where light is blocked (under eaves, at trunks, where things meet the ground), never over sunlit faces;
  - no shimmering edges on fences, leaves or roof lines, and no ghosting behind what moves (the wind's plants; if TRAA
    smears them, say where: the plan's `ghosts` puts that world on MSAA);
  - the haze deeper toward the horizon and low in the valley, in the horizon's colour, warmer toward the sun at 8°;
  - bloom only on the sun, the lamps and the glows; the picture neutral, not graded loudly.

**c6** (nice): `out/base-head-small-sandbox-1-near.jpg` and `out/small-results.json`: Sandbox 1 near on a phone
(390 × 844, touch): the small device's finishing (no AO, bloom or contact shadows; 0.7 of the pixels, TAAU), its frame
time and render scale printed.

**c7**: `out/parity-log.txt`, `out/parity-<1|3|5>.jpg` (render | player): `story-parity.ts` on
`king-coconut-live.json` at 1, 3 and 5 s, lowest SSIM at least 0.98, and 3 s sought again in a second run, pixel for
pixel (`two seeks to 3 s: pixel-identical`). A film's finishing has no temporal jitter (MSAA) and its grain runs on the
film's own clock.

**Out:** push `intent-work/1f0c6f79-render/out/` to the branch `intent-work/1f0c6f79-render` (as every job's results),
never onto `intent/1f0c6f79-post-atmosphere`: no frame reaches main. The full frames stay in `~/1f0c6f79-work`.

**Known cost:** ambient occlusion on the ambient light alone needs the scene's depth and normals before it is lit (a
prepass, geometry-bound, estimated 0.35 ms in `finish.js` `COST`): the budget's line for Sandbox 1 near is where it
shows. The census (c3, avenBOX) counts the scene's own draws and leaves the pipeline's passes apart.
