# Mac job: intent c1bee1f8's c8 and c9, the switch to WebGPU looks and runs as before

Intent c1bee1f8-e738-4ff3-aace-4aea1d7e74ae (GPU 9/14), pull request #2186, branch `intent/c1bee1f8-webgpu-switch`.
Every page draws with `WebGPURenderer` (its WebGL 2 backend the fallback). The census already counts the same main pass
in avenBOX (c5, c6), and its smoke (`census.ts --smoke`) runs each world on WebGPURenderer's own code without an
error. This job checks what only a GPU shows: the pictures, the frame time and the films.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/c1bee1f8-render/run.sh` (bun, node with Playwright's Chromium,
ffmpeg). It makes three worktrees beside the repository and serves them on 5181–5183 through play's read-only proxy:
- `../c1bee-main` at main ff391a7, the last main before the TSL ports, on WebGL;
- `../c1bee-ref8` at intent 8's head as the switch took it, on WebGL. That is the main the branch last merged (8
  Accepted); set `REF8=<commit>` to name another;
- `../c1bee-head` at the branch's tip, on WebGPU (its default once the flag is gone).

Then:

1. `scripts/selector-shots.mjs` (the head's), with the frame meter: Sandbox 1 near, mid and far, and the old city as it
   opens, at 1440×900 and noon, for main, then ref8, then head. For each: frame time, p95, the meter's CPU and GPU ms and
   bound, the backend that drew (`window.__rendererBackend`), and a screenshot. Chromium runs on Metal with WebGPU on
   (`--enable-unsafe-webgpu`), and the script says which WebGPU adapter it found.
2. `views.mjs` (this folder), the same three sites:
   - the viewer on a rigged actor (the goat: its joints bend by dual quaternions in TSL);
   - the viewer on a machine with the kit's section caps, whole and cut open (`stage.target.cut = 1`): the stage's
     ClippingGroup, and the caps' shadows through the mask;
   - the worlds view on play's first world.

   Frame time over 6 s, the backend that drew, and a screenshot each.
3. SSIM of every picture, head against ref8 (ffmpeg).
4. c9: `scripts/story-parity.ts` on `king-coconut-live.json` at 1, 3 and 5 s, run twice. Each run prints its lowest
   SSIM (renderer against player) and `drawn with:` (webgpu, or webgl2 where HyperFrames' headless Chrome has no
   WebGPU). The two runs' player pictures are compared pixel for pixel: two seeks to the same t.

**Pass:**
- **c8:** every shot SSIM ≥ 0.95 against ref8, with skinning and cuts right by eye (the goat's joints keep their volume;
  the machine shows its red section faces, and its shadow is cut too). Head's mean frame time at each shot is at most
  ref8's and at most main ff391a7's, with the meter's bound. Head's backend is `webgpu`.
- **c9:** the lowest SSIM ≥ 0.98 in each run, and the two seeks at each t identical. Say which backend drew.

**Things to look at by eye, beyond the numbers:**
- the far trees' pictures (impostor cards) upright and in their cells on head;
- the asset stage's contact shadow under the machine;
- the sky's light (no black or flat environment on head).

**Dry run (in avenBOX, before this is sent):**
`bun play/site/scripts/macjob/dry.ts intent-work/c1bee1f8-render --at <the job's commit>`. It must print
DRY RUN PASSED.

**Out:** `out/summary.json` (the table and the films), `out/ssim.txt`, `out/seeks.txt`, `out/shots/`, `out/views/`,
`out/film-1/`, `out/film-2/` and `out/*.txt`. Commit `out/` and push to the branch `intent-work/c1bee1f8-render`.
