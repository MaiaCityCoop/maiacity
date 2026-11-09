# Mac job: intent 3a8b135a, far trees lit like near ones (c5: the look and the frame time; must)

**What it checks.** Far pictures are now hemi-octahedral impostors. Each kind with a picture is baked once on the
device from 8 × 8 directions over its upper half (64 px a view on a desktop): its colours (unlit), its normals and
its depth, as a block on two 2048² pages that 16 kinds share. A copy is one five-cornered card faced to the eye. It
blends the three views nearest the eye's direction, so it should never jump between views. It is lit as a
`MeshStandardNodeMaterial` by the blended normals, so the one sky's sun and environment light a far tree's sunlit and
shaded sides as they light a near one (main had 8 sides taken in a fixed soft studio light). In the shadow pass the
card faces the sun and writes each pixel at its baked depth. Past the sun's cascades (`shadowReach`), the far cards
are laid into a top-down canopy map, and the ground darkens under it (`render/nodes/canopy.js`).

**Counts were checked in avenBOX** with the census: Sandbox 1 far is 1,539,610 main triangles and 880 draws, within
intent 9's bounds. This job is the part that needs a GPU. **The bake and the card's node materials compile on a real
GPU here for the first time**, so every console error matters. That includes the shadow's depth write
(`gl_FragDepth`) and any `WebGLNodesHandler` or WebGPU error.

**The code:** pull request #2196, branch `intent/3a8b135a-octahedral-impostors`. Base: intent 9's head (branch
`intent/c1bee1f8-webgpu-switch`). `run.sh` takes both as they are on origin when it runs. The commits are written to
`out/commits.txt`, and the summary that sent this job names the head to use.

**Determinism:** `determinism.mjs` is copied from `intent-work/main-baseline-render` (5da2a8e04). `SEEDED_RANDOM`
is an init script on the page, and `QUIET` is polled to 0 before each view. A kind's octahedral bake is 128 small
renders (main's was 8), so the first settle may take longer than main's.

## How

1. `git fetch origin intent-work/3a8b135a-render && git checkout FETCH_HEAD` (this branch), with `PLAY_MCP_TOKEN` set.
2. `bash intent-work/3a8b135a-render/run.sh [head] [base]`. It checks out base and head in worktrees beside the
   repository, starts a dev server of each (5193 base, 5194 head) with its API at a read-only proxy to play (3913),
   and runs `look.mjs` at 1440×900 in Sandbox 1, at two hours: **5.56** (the sun 8° up in the east, from `sky.js`
   `sunAt`) and **12:00**:
   - **`far-<hour>`:** 6295a650's far view (0, 370, yaw 0, pitch −0.12). The meter over 3 s and a screenshot.
   - **`wood-<hour>`:** from the cell's east edge (370, 0), looking out east and low: the woods beyond, seen across.
   - **`orbit-<hour>`:** a slow 360° orbit at 370 m round the cell's middle, looking in. 72 settled stills are joined
     into `<site>-orbit-<hour>.mp4` at 12 fps, then the meter runs over a 600-frame turn.

   For each view: the backend that drew (`window.__rendererBackend`: webgpu, or its webgl2 fallback), every console
   and page error, and head against base (frame time, and SSIM for reference only, since
   the look is meant to change).
3. Commit `intent-work/3a8b135a-render/out/` (`results.json`, `stdout.txt`, `commits.txt`, the PNGs and MP4s) with
   `Intent: 3a8b135a-b7fd-4db8-b7e1-40b8afdc99f8`, and push this branch.

## Judged against the spec (c5)

- **Lit like near ones:** at 5.56, the far trees in `head-far-5.56.png` and `head-wood-5.56.png` show a sunlit side
  toward the east and a shaded side away from it, as the near trees do. On base they are evenly lit.
- **No view jumps:** in `head-orbit-*.mp4`, no far tree changes its picture abruptly as the eye goes round. On base,
  the 8 sides jump every 45°.
- **Dappled far woods:** past about 450 m, the ground under the far woods is darker under the crowns, thrown away from
  the sun (most visible at 5.56). It should not be one even bright floor.
- **The cost:** head's mean frame time at `far-<hour>` (and over the orbit) is at most base's (`compare` in
  `results.json`: `within`), with the meter's bound.
- **No errors** on head: no shader compile error, no page error.

If the far trees show black or garbled cards, upside-down views, no shadows from far trees, or a hard-edged dark band
on the ground at the cascades' end, push what there is and say which view. The errors and the stills are what the
builder needs.
