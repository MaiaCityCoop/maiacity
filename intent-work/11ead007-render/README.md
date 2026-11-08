# Mac job: intent 11ead007's c6, one cover stream on the graphics card

This job is for intent 11ead007-1392-48a7-b74a-212c10de6fcb (GPU 5/14), pull request #2185, branch `intent/11ead007-cover-stream`.

**What changed:** a biome's cover is now laid by one program, `biomes/stream.js`, in Sandbox 1, the domes, the worlds' `biome:` floors and the asset viewer.
- Every plant is a copy of play's build of its kind, drawn by the universal renderer.
- Each copy is put down once, when its tile is built.
- The render kit's TSL grows each copy up out of the ground, or sinks it back, by its rank and its distance from the eye (`render/nodes` `aCover`). Before, Sandbox 1 regrew every copy on the CPU every 0.5 m.
- The asset viewer's cover was the repository's own shapes, faded by a GLSL patch. It is now play's builds, grown round the plant.

The census (avenBOX) already counts identical triangles and draws for Sandbox 1 at base and head. This job checks the look and the time.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/11ead007-render/run.sh`. It needs bun, node with Playwright's Chromium, and ffmpeg.
- It makes two worktrees beside the repository:
  - `../i5-base` at `origin/main`, or `BASE_COMMIT`;
  - `../i5-head` at e251559358a530c9667bfc06c4bbd42a33811832 (the branch's head when this job was sent), or `HEAD_COMMIT`.
- It serves both on ports 5181 and 5182 through play's read-only proxy.

Then it runs four steps:

1. **`scripts/selector-shots.mjs --meter`:** Sandbox 1 near, mid and far at 1440×900, noon, base then head. For each view it records frame_ms, p95, cpu_ms and gpu_ms (the frame meter) and takes a screenshot. This is main's script: patch it with the render box's `patch.py` as usual, for base and head alike.
2. **`walk.mjs` (this folder):**
   - Sandbox 1, settled at z = 160 and walked 30 m in over 12 s.
   - The old city (Sandbox 3), opened (60 s) and walked forward 10 s.
   - Both walks are recorded as films at 1440×900, with the meter over the walk.
   - The walnut in the asset viewer, standing on its biome's cover (a still).
3. **The films, side by side** (base left, head right): `out/walk-sandbox-1.mp4` and `out/walk-sandbox-3.mp4`. Then the SSIM of the stills, base against head.
4. **`out/summary.json`:** frame_ms and cpu_ms, base against head, for every view and walk. A row is marked `worse` if head is more than 5 % slower.

**Determinism:** `walk.mjs` uses the render box's `determinism.mjs`, copied here from `intent-work/main-baseline/`: `SEEDED_RANDOM` in every page, and a settle on `QUIET` before the Sandbox 1 walk.

**Pass (c6):**
- In the films: the same plants in the same places, no plant popping in or out, no tile edges in the cover.
- Head's cover grows in and thins out with distance as base's does.
- In the viewer, the walnut stands on grasses, clover and leaves, not bare ground.
- Mean frame_ms and cpu_ms per frame at near, mid and far are no worse than base's (within noise; say so for any row marked `worse`).
- No `pageerror` in `walk.txt` or `shots.txt`.

Note that base is main, so head also carries intent cb16b7a5 (the render kit in TSL) until that intent lands.

**Out:** `out/summary.json`, `out/ssim.txt`, `out/walk-*.mp4`, `out/shots/`, `out/walk/` (the stills; the raw `.webm` films can stay out of the commit), and `out/*.txt`. Commit `out/` and push to the branch `intent-work/11ead007-render`.
