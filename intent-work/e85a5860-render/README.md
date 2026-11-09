# e85a5860 · the Mac render job (c4 and c5, and c2 on the card): grass by the million

GPU work runs only on Samuel's Mac (Metal), never on SwiftShader in the cloud. This job draws Sandbox 1's meadow
twice at every view:

- **Tiles:** intent 7's instanced tiles. This is the WebGL 2 fallback, `?renderer=webgl2`.
- **Compute:** this intent's blades, chosen on the graphics card. `?renderer=webgpu`: one compute pass picks the
  blades into three indirect draws, `play/site/src/lib/content/render/nodes/grass-compute.js`.

It measures what each one costs on the GPU.

**Dry run first, in avenBOX** (intent cb52fbd9, `play/site/scripts/macjob/README.md`): the job on the CPU with the
CPU stand-ins, which proves its script and its plumbing, not its pictures or times:

```sh
bun play/site/scripts/macjob/dry.ts intent-work/e85a5860-render --at <the job's commit>
```

It printed DRY RUN PASSED in avenBOX. There the WebGPU page falls back to its tiles (no GPU), so the compute's own
steps run only on the Mac: reading the choice back, the trample and the film. They are guarded so a fallback
can't reach them.

**On the Mac**, from the repository's root:

```sh
git fetch origin intent/e85a5860-grass-compute && git checkout intent/e85a5860-grass-compute
bash intent-work/e85a5860-render/run.sh
```

- **Needs:** bun, node, Playwright with its Chromium (WebGPU on Metal), ffmpeg, curl, and `PLAY_MCP_TOKEN`. The
  token is read by the read-only proxy. No fal, nothing paid.
- **Shaders:** checked in avenBOX before the job, not here. `bun play/site/scripts/grass-wgsl.ts` builds every pass
  and level to WGSL, and naga held all nine to the WGSL grammar.
- **Determinism:** the render box's `determinism.mjs`, from `intent-work/main-baseline-render`, the shared main
  baseline.
  - `SEEDED_RANDOM` is an init script.
  - Every view waits for `QUIET`, for at most about 3 minutes.
  - The hour is pinned (`__interiorHour`), and so is the world's clock (`__worldTime`).
  - It uses intent 7's meadow and views: the most grassy 12 m round the near view, at noon and with a sun of 8°, at
    walking height and 2 m higher.
- **WebGPU:** it prints `WebGPU adapter: …`. If that is not Apple's, it stops. If `?renderer=webgpu` falls back
  (`__grass.mode` not `indirect`), it stops too.

**Out**, in `intent-work/e85a5860-render/out/`. The Mac pushes it to the branch `intent-work/e85a5860-render`,
never onto the pull request's branch:

- `beside-<light>-<height>.jpg`: tiles (left) and compute (right) at the same view, 1440 × 900.
- `trample-strip.jpg` and `trample-<s>s.jpg`:
  - The walker crosses 12 m of the meadow, then turns to look back along the path.
  - Stills at 0, 2, 5 and 10 s.
- `film-noon.mp4`: 20 s of walking through the meadow on the compute, 24 fps.
- `results.json` holds each view's:
  - `grassGpuMs`: the grass's own GPU time, from the meter's 4 s with the grass and without it. Hidden, no compute
    pass runs, so this includes the compute.
  - `grassCalls`: the grass's draws.
  - `blades` by level.
  - On the compute at noon, `choice`: the card's chosen blades read back against the CPU's twin (`chooseOnCpu`) over
    every cell, with `share` (the part that differs) and `neverVertex` (the candidates culled before the vertex
    stage).
  - `trample`: the path's most and mean trodden share, read back at 0, 2, 5, 10 and 12 s.
  - `verdict`: c4's and c2's verdicts.
- `results-small.json` and `small-*.jpg`: the compute at 390 × 844 on the small budget (`?budget=small`). Holds the
  visible blades and the frame time. `verdict.c5`.
- `run-log.txt`, `run-log-small.txt`.

**What decides it:**

- **c4:**
  - At every view, the compute's `grassGpuMs` is at most the tiles' (within 5 %).
  - It draws more blades than the tiles: 180 a m² near against 120.
  - The grass is at most 3 draws on WebGPU.
  - In the strip, the path is visibly flattened at 0 s and stands again by 10 s: `trample` most ≥ 0.5 at 0 s and
    ≤ 0.06 at 10 s.
  - **Look for:** a denser meadow with no ring, pop or band edge while walking (the levels' thresholds are jittered
    blade by blade).
- **c5 (nice):** 15–30k visible blades on the small budget, frame time printed.
- **c2 on the card:** `choice.share` < 0.002. The avenBOX test holds the CPU's twin to a reference. This holds the
  card to the twin.

The branch is intent 7's (`intent/090168c8-real-grass`, with 6's wind) with intent 9's switch
(`intent/c1bee1f8-webgpu-switch`) merged in. The WebGL 2 fallback keeps 7's tiles, so the left of each `beside` is
intent 7's own grass.
