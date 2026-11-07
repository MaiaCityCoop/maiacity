# Render job: intent 6295a650's c4 and c5 (one selector), on a Mac's Metal

Intent 6295a650-69ac-4b66-8fe7-7939dad156c9, pull request #2151, branch `intent/6295a650-one-selector`. The baseline is
main at **6d0d7ac**, as the spec says. The change to measure is the branch's newest head.

## Fifth run: the census only (after the fourth Mac run)

**Run 4** was base 6d0d7ac against head 129cc30c0, in `out/run4/`.
- **Near and mid:** the head passed.
- **Far:** the head still failed, with 3.60M against 2.55M triangles. Its outdoor forest drew about as many shapes as
  the base (361 against 384) and as many pictures (6,163 against 6,174), but at 6.0k triangles a shape against the
  base's 2.5k.

Before any change, this run counts what each side draws at the far view, copy by copy, on the CPU.

**The suspected cause, which the census is to confirm or refute:**
- The base made every tree a picture past 40 m, whatever its size (the old `tune`: distances in metres).
- The selector goes by size on screen: a tree whose ball is r metres across turns into its picture at about
  6.7 × r m.
- So the big trees (a walnut or a linden, r around 10 m, 18–24k triangles at detail 0.1) stay shapes to 60–80 m.

**The run:**

1. Set up the two worktrees and dev servers as below, at the branch's newest head.
2. The base needs the census hook the head has (`__assets.kinds()`). Add it in the base worktree; it reads, and draws
   nothing:

   ```sh
   cd ../s6295-base/play/site
   sed -i '' 's/library: library.assets.stats() }) }$/library: library.assets.stats() }), kinds: () => ({ out: plantsOut?.assets.kinds(), in: plantsIn?.assets.kinds(), library: library.assets.kinds() }) }/' src/lib/content/sandbox-2/interior/village.ts
   grep -c "kinds: () =>" src/lib/content/sandbox-2/interior/village.ts   # 1
   ```

3. Run the far view alone, with the census:

   ```sh
   cd ../s6295-head/play/site
   PLAY_MCP_TOKEN=play_… node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --census far --out ../../../s6295-shots/run5
   ```

**The output:**
- `base-census.json` and `head-census.json`: each kind's radius, thresholds and level triangles, and each copy's
  distance, size on screen, chosen level and triangles.
- A table per site of its costliest kinds: shapes, pictures, triangles, and the farthest copy still drawn as a shape.
- The far view's timings and PNG, as before.

Push `out/run5/` with both JSON files and stdout.

## Fourth run (after the third Mac run)

**Run 3** was base 6d0d7ac against head 658a50eaa, at noon. It is in `out/run3/` on the branch `intent-work/6295a650-render`.
- **Near:** the head passed (4.25M against 5.95M triangles).
- **Mid:** within noise (6.50M against 6.23M; 36.0 against 35.3 ms).
- **Far:** the head failed, with 3.71M against 2.55M triangles and a p95 of 33.4 against 16.8 ms.

**The cause:** the far forest (`assets.out`) drew the same number of shapes on both sides (387 against 384) and the
same number of pictures (6,149 against 6,174), but the head's shapes cost 5.9k triangles each against the base's 2.5k.
- The head's shapes include light trees that the base drew as pictures.
- `lod.js` lowers a light shape's picture threshold (`HEAVY`: under 20,000 triangles, down to `PICTURE`), so a fruit
  tree at detail 0.1 kept its shape to ~60 m.
- The village had always set its trees' thresholds itself (the old `tune`), so they became pictures at 40 m whatever
  their weight.

**The fix** (in the commit after 658a50eaa): a kind whose levels are its recipe's own (a plant's) and that has a
picture takes the picture at its last threshold, however light, as the forest always did.
- Things made by simplifying keep the `HEAVY` rule.
- So do small plants, which have no picture: where their shape ends, the forest leaves them out, and that stays as in
  run 3.

Run 4: the same command at the branch's newest head, with the hour still at noon.

## Third run (after the second Mac run)

**Run 2** was base 6d0d7ac against head 8103cb29d, at noon. It is in `out/run2/` on the branch `intent-work/6295a650-render`.
- **Near:** the head passed, with 26 % fewer triangles.
- **Mid and far:** the head failed, with 48 % and 53 % more triangles and about 9 ms more per frame.

The per-level counts of the outdoor forest (`assets.out`) show the two causes:
- **Mid:** 5 trees were drawn whole at **detail 1**, about 0.7M triangles each. The village never drew detail 1; its
  forest was always built at details 0.25 and 0.1. A version from before the contract was read (a2935147,
  `lodcard.js` OLD_DETAILS) as declaring 1, 0.25 and 0.1.
- **Far:** about 540 more shrubs and ground-cover plants were put down. The base put shrubs down to 26 m and the cover
  to 13 m. The head put them down until the selector would draw their picture, which is ~40 m for a large shrub,
  because a light shape keeps its shape longer (`thresholdsOf`).

**The fix** (in the commit after 8103cb29d):
- **Detail 1:** `OLD_DETAILS` is now [0.25, 0.1], the forest's two details. A version built at two levels is drawn at
  the selector's two coarsest thresholds (0.56 and 0.22: a 12 m tree finer to 16 m, coarser to 40 m, a picture beyond),
  exactly as the village drew it.
- **Small plants:** the forest puts them down only as far as it always streamed them (`flora.js` STREAMS: 26 m and 13 m
  in the village, 40 m and 22 m under the glass), and never past where the selector would draw their picture. That is
  a stream's reach, like `biomes/stream.js`: how many copies stand, not how finely each is drawn.

Run 3: the same command at the branch's newest head, with the hour still at noon.

## Second run (after the first Mac run)

The first run is in the branch `intent-work/6295a650-render`, `out/`. It had two problems:
- **The hour differed.** The world clock was on Auto, so the base was shot at dusk and the head at night with the lamps lit.
- **The head drew far more:** 6.18M → 8.47M triangles near, 6.22M → 11.87M mid, and 2.55M → 8.50M far.

**The cause:** the village had chosen its own distances (a tree's picture beyond 40 m, shrubs and cover cut at 26 m and
13 m). The one selector's thresholds, `lod.js` LEVELS [1.2, 0.28, 0.11], are about twice as far in the village's 68°
view. They put a tree's picture past ~85 m, and the small plants' cut-off (where the selector would draw their
picture) out with it. So about 1,350 more copies were drawn as shapes at detail 0.1.

**The fix:** LEVELS is now [1.2, 0.56, 0.22], the village's own 16 m and 40 m for a 12 m tree, for every world. No
world chooses its own again.

**The hour:** the script now pins it at noon, the same for both sites (`window.__interiorHour`, which Sandbox 1's sky
reads). Sandbox 3 keeps its own clock.

Rerun at the branch's newest head, the same commands as below.

## What it measures

- **c4:** Sandbox 1, the village of `play/site/src/lib/content/sandbox-2/interior` (its forest, domes and library), at
  1440×900. It is placed at three fixed views with `__walker.place(x, z, yaw, pitch)`, all on the line x = 0, looking
  towards the master dome:
  - near: z 95, pitch -0.05
  - mid: z 235, pitch -0.05
  - far: z 370, pitch -0.12

  Each view is measured once the renderers have nothing left to build. The script records the mean and p95 frame time
  over 8 s and the triangles drawn per frame, counted on every WebGL draw call. Pass: the head is no worse than 6d0d7ac
  at each view, and nothing pops.
- **c5:** Sandbox 1's three shots above, and Sandbox 3 (the old city) as it opens, side by side with 6d0d7ac's. Pass:
  the same plants, buildings and machines, with nothing missing far off.

## Run it

```sh
git fetch origin main intent/6295a650-one-selector
git worktree add ../s6295-base 6d0d7ac
git worktree add ../s6295-head origin/intent/6295a650-one-selector
(cd ../s6295-base/play/site && bun install --frozen-lockfile)
(cd ../s6295-head/play/site && bun install --frozen-lockfile)

# the two dev servers, their API pointed at the script's read-only proxy (127.0.0.1:3911)
(cd ../s6295-base/play/site && PLAY_API=http://localhost:3911 bunx vite dev --port 5181 --strictPort) &
(cd ../s6295-head/play/site && PLAY_API=http://localhost:3911 bunx vite dev --port 5182 --strictPort) &

# the measure: one site after the other, never both at once; PLAY_MCP_TOKEN is the admin token (sent to play only)
cd ../s6295-head/play/site
PLAY_MCP_TOKEN=play_… node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --out ../../../s6295-shots
```

The script is `play/site/scripts/selector-shots.mjs` on the branch. It starts the proxy itself: GET and HEAD of
`/api/…` only, sent to play.maia.city with the token. On a Mac it launches Chromium as the render box did
(`channel: 'chromium'`, `--use-angle=metal --enable-gpu`), prints the GPU first, and pins the world's hour at noon.

The output in `s6295-shots/` is `<site>-sandbox-1-<view>.png`, `<site>-sandbox-3-open.png` and `results.json`, plus a
table on stdout.

## Then

Record c4 and c5 on the intent with `check_intent`:
- c4: the table of frame times and triangles, base against head, at each view.
- c5: the side-by-side shots.

If a near view is worse on the head, the Orchestrator's rule is to tune `lod.js`'s thresholds rather than bring back a
world's own level set, and to say what changed.

## What to expect

These are the builder's notes from the code, not yet measured:

- **Detail 1 near the eye.** Sandbox 2's village drew its plants at only details 0.25 and 0.1. They now get all three
  levels the contract reads for a version from before it (1, 0.25 and 0.1). Detail 1 is drawn only when a tree fills
  the view (size ≥ 1.2), so the near view is the one to watch.
- **Small plants reach further.** Shrubs and cover are now put down until the selector would draw their picture,
  where before they were cut off at 26 m and 13 m.
- **Guests step down sooner.** A build's guests (Sandbox 1's domes) now switch levels at `lod.js`'s LEVELS
  [1.2, 0.56, 0.22]. They used to switch at GUEST_LEVELS [1.2, 0.4, 0.16].
- **The library's things have levels now.** The village's library things were drawn at their finest whatever the
  distance (`force: 0`). They now get derived levels and pictures, which should cost fewer triangles far off.
