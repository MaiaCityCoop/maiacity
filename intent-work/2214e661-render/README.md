# Mac job: intent 2214e661, one sky that lights every world like the real sun (c8, a look and the frame time; must)

**What it checks.** The intent replaces three skies with one physical sky (`play/site/src/lib/content/sandbox-kit/sky.js`
and `universe.js`): Preetham's air in TSL, the sun the key light (warm and weak low, white and strong high, about 5:1
against the sky at noon), the sky's own environment the only ambient light (no hemisphere), AgX with the lens following
the light, exponential haze in the horizon's colour, two cascades of sun shadows. Its counts were checked in avenBOX
with the census (base and head). This job is the only part that needs a GPU: **the frame time and the look**.

**The code:** pull request #2177, branch `intent/2214e661-one-sky`. It is built on main and draws the sky's TSL through
three's `WebGLNodesHandler` on the page's WebGLRenderer (intent 1, b03f9fb4, is not merged yet). **This is the first
time the sky's node materials compile on a real GPU**: every console error matters.

## How

1. `git fetch origin intent-work/2214e661-render && git checkout FETCH_HEAD` (this branch), with `PLAY_MCP_TOKEN` set.
2. `bash intent-work/2214e661-render/run.sh <head commit>` (the commit named in "MAC JOB READY"; without it, the
   branch as it is now). It checks out base (main's merge base) and head in worktrees beside the repository, starts a
   dev server of each (5191, 5192) with its API at a read-only proxy to play (3913), and runs `look.mjs`:
   - Sandbox 1 at **noon** and at **a sun of 8°** (19:26, `window.__interiorHour`), near, mid and far
     (`__walker.place`), each once nothing is being built; the old city (Sandbox 3) as it opens (60 s);
   - per view: the meter's line over 3 s (frame, CPU, GPU ms, calls, triangles, the bound), the probe's split, a
     1440×900 screenshot; every console and page error;
   - Poly Haven's CC0 `autumn_meadow` (afternoon) and `evening_field` (low sun) thumbnails beside them;
   - for base and head alike, the render box's determinism (`determinism.mjs`, from `intent-work/main-baseline`
     c43eab548): `SEEDED_RANDOM` as an init script, each view settled when `QUIET` returns 0.
   Base may also be read from main's baseline, `intent-work/main-baseline/out/<base commit>/`, where it has this commit.
3. Commit `intent-work/2214e661-render/out/` (results.json, stdout.txt, the PNGs, the two Poly Haven pictures) with
   `Intent: 2214e661-65d1-48d6-9b2c-a3293a79d9e5`, and push this branch.

## Judged against the spec

- **Frame time:** at each view, head's mean frame at most base's + 1.0 ms (`results.json` `delta`, printed at the end),
  with the meter's bound for each.
- **The look,** head beside the two Poly Haven skies: a warm key and a cool fill with coloured shadows; haze that
  deepens with distance toward the horizon's colour, no grey fog wall; crisp shadows near and shadows still far off; at
  8° a golden, low light. Base is there to compare.
- **No errors:** no shader compile error, no page error on head (base's own, if any, are listed too).

If head's page shows a black or missing sky, or errors from `WebGLNodesHandler` / a node material, stop after the first
site and push what there is: the errors are what the builder needs.
