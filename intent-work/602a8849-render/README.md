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

**The code:** pull request #2182, branch `intent/602a8849-tsl-shaders`, head `0838d2327ec625cef952cc3f3e1fda7ddc078feb`.

**Determinism:** `determinism.mjs` is copied from `intent-work/main-baseline-render` (c43eab548). `SEEDED_RANDOM`
is an init script on every page, and `QUIET` is polled to 0 before each shot. No main baseline was published for
these views yet, so the job renders base (main at the merge base) and head itself.

## This run (head 0838d2327): c7 and c8 again, head first

**c7.** The last run's parity threw in the composition script (`Cannot use 'import.meta' outside a module`, then
`playLive is not defined`). Three's KTX2Loader, brought into the live runtime by the ground (intent 4), built its
transcoder URLs from `import.meta.url`, and a composition loads the runtime as a classic script. The runtime is rebuilt
without it (`scripts/live-runtime.ts` defines `import.meta.url` and refuses any left) and re-pinned. A CPU test now
parses it as a classic script and finds `playLive` (`compose.test.ts`).

**c8.** On the last run base settled every Sandbox 1 view and head none: every view hit the 3.5-minute cap. At far
both drew the same 851 calls and 1,529,320 triangles, but some cards showed other kinds' pictures (broadleafs where base
had conifers: SSIM 0.870), with CPU 17.3 ms against 8.3. The census settles at once on the CPU at this head, so the
cause shows only on a GPU. This run:
- **head goes first** (`ORDER=base-first` for the old order). If base is then the one that never settles, the order
  did it, not the code;
- logs every quiet poll: each part's `building` and its parts (`busy`: queue, loads, compiling, lowering, new at this
  head), `keeping` and `taken`. The first settle of each side is in `out/quiet-<side>.json`, each view's first and last
  polls in `results.json` (`quiet`);
- **SSIM fixed**: ffmpeg prints it on stderr, and the job read stdout (NaN). On the last run's PNGs it now gives far
  0.8696, near 0.9968 and factories 1;
- **frame time as the spec has it**: near at most base + 8 ms and never above 33.4 ms, every other view at most
  base + 5 %.

    bash intent-work/602a8849-render/run.sh 0838d2327ec625cef952cc3f3e1fda7ddc078feb

`ONLY=c7` runs c7 alone (no dev servers). The dev servers stay `vite dev`: the asset box doesn't build under `vite
preview`. Commit `out/` with `Intent: 602a8849-50e4-4885-99b9-38353f951c9f` and push this branch.

**Dry run** (intent cb52fbd9), in avenBOX first: `bun play/site/scripts/macjob/dry.ts intent-work/602a8849-render --at <this branch's commit>`.

## How

1. `git fetch origin intent-work/602a8849-render && git checkout FETCH_HEAD` (this branch), with `PLAY_MCP_TOKEN` set.
2. `bash intent-work/602a8849-render/run.sh 0838d2327ec625cef952cc3f3e1fda7ddc078feb`. It checks out base and head in worktrees beside the repository,
   then runs three things (c8: head first unless `ORDER=base-first`):
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
- **c8, the frame time:** near, head's mean frame at most base's + 8 ms and never above 33.4 ms; mid and far, at most base's
  (5 % for noise) (`compare` in `results.json`), with the meter's bound (the spec since 2026-11-08: TSL runs on
  WebGLNodesHandler until intent 9).
- **No errors:** no shader compile error and no page error on head. Base's own, if any, are listed too.

If head's page shows a black frame, an upside-down or black factories page (TILT and GRADE read the composer's target),
missing glows or errors from `WebGLNodesHandler` or a node material, push what there is and say which view: the errors
are what the builder needs.
