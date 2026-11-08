# Mac job: intent 602a8849, every other shader in TSL (c7 and c8, looks and the frame time; must)

**What it checks.** The intent rewrites play's remaining hand-written GLSL as TSL node materials, drawn on the
WebGLRenderer through three's `WebGLNodesHandler` (main has it since b03f9fb4). The changes are:

- Sandbox 1's water, now with a Fresnel term;
- the domes' glass sheen and the meadow;
- the world lights' glows, as instanced sprites;
- the plant card's soil disc;
- the factories' TILT, GRADE and the post stack's FINITE, as TSL passes (`render/post.js` `NodePass`);
- the Lab's contact dots, as fixed-size sprites.

The film darkroom is deleted (it had no caller). `render/tsl.js` sets what a node material writes: drawn into a
target it comes out linear and untoned, and on the screen `toneMapped: false` and `userData.raw` are honoured.

Our node materials (`isKit`) are never compiled ahead: `render/core.js`'s `compile` takes them off their objects while three gathers
(cb16b7a5's gate, 1c7f2af), so they are built at their first frame. **Step 0:** run Sandbox 1 for a few minutes first
and stop if it throws.

Counts were checked in avenBOX with the census at base and head. This job is the part that needs a GPU. **This is the
first time these node materials compile on a real GPU**, so every console error matters.

**The code:** pull request #2182, branch `intent/602a8849-tsl-shaders`, head `7cfc73127b4212ee9a27bf09a6a1806afeacaea6`.

**Determinism:** `determinism.mjs` is copied from `intent-work/main-baseline-render` (c43eab548). `SEEDED_RANDOM`
is an init script on every page, and `QUIET` is polled to 0 before each shot. No main baseline was published for
these views yet, so the job renders base (main at the merge base) and head itself.

## How

1. `git fetch origin intent-work/602a8849-render && git checkout FETCH_HEAD` (this branch), with `PLAY_MCP_TOKEN` set.
2. `bash intent-work/602a8849-render/run.sh 7cfc73127b4212ee9a27bf09a6a1806afeacaea6`. It checks out base and head in worktrees beside the repository,
   then runs three things:
   - **c7:** `story-parity.ts` on head, `src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98
     --lossless`, twice. Out: `parity-1.txt`, `parity-2.txt`, and the stills in `parity-1/` and `parity-2/`.
     Then `parity-seeks.txt`: each t's player still from the two runs, by the md5 of its decoded pixels.
   - **c8:** a dev server of each side (5191 base, 5192 head), its API at a read-only proxy to play (3913), and
     `look.mjs`, at 1440×900:
     - Sandbox 1 at noon: a pond and the river from 14 m, inside two domes, and near, mid and far;
     - the old city (`/sandbox-3/`) as it opens;
     - the Old City world (`/worlds/#43420c0b-…`);
     - `/factories/`, `/game/map/`, and the Lab (`/sandbox-2/`);
     - Sandbox 5 with a plant picked, its card shot.

     For each view: the meter's line over 3 s, a screenshot, every console and page error, and SSIM head against base.
3. Commit `intent-work/602a8849-render/out/` (`results.json`, `stdout.txt`, the PNGs, `parity-*`) with
   `Intent: 602a8849-50e4-4885-99b9-38353f951c9f`, and push this branch.

## Judged against the spec

- **c7:** lowest SSIM ≥ 0.98 in both parity runs, and every t identical in `parity-seeks.txt`.
- **c8, the look:** SSIM ≥ 0.98 head against base on every view except the two water views. The water should reflect
  the sky and the sun, more at a grazing angle: judged by eye, base beside head. The plant card's plant turns, so its
  SSIM is noisy: judge the soil disc by eye if it is under.
- **c8, the frame time:** at each view, head's mean frame at most base's + 1.0 ms (`compare` in `results.json`), with
  the meter's bound.
- **No errors:** no shader compile error and no page error on head. Base's own, if any, are listed too.

If head's page shows a black frame, an upside-down or black factories page (TILT and GRADE read the composer's target),
missing glows or errors from `WebGLNodesHandler` or a node material, push what there is and say which view: the errors
are what the builder needs.
