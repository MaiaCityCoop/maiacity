# Render job: intent 6295a650's c4 and c5 (one selector), on a Mac's Metal

Intent 6295a650-69ac-4b66-8fe7-7939dad156c9, pull request #2151, branch `intent/6295a650-one-selector`. The baseline is
main at **6d0d7ac**, as the spec says. The change to measure is the branch's newest head.

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
