# Mac job: intent 24454c2d's c6, plants placed the way nature places them

This job is for intent 24454c2d-cb35-4ab2-9f7d-82b7b9b0cb3f (GPU 13/14), pull request #2181, branch
`intent/24454c2d-natural-placement`, at its tip (`ab61d08` when this job was last updated, stacked on intent 5's
`intent/11ead007-cover-stream` at `e40488c`, which carries intent 2's render kit at 90ef0aee9 and main's census fix). Run it after
intent 5's job: it measures this intent's masks on top of 5's stream.

**What changed:** a biome with masks places its cover the way nature does, in one pass (`biomes/index.js` `layTile`,
`biomes/masks.js`):
- a kind's density is its colonies times its masks: shade under the real crowns, the canopy's edge band, keep-clear
  round paths and water, hollows, slope, and rings round trunks (a food forest's guild of clover and strawberries 1–2.4 m
  out, litter at the foot);
- points are a blue-noise dither per footprint, larger things (ferns, mushrooms, deadwood, stones) keeping smaller ones
  out;
- each plant's size leans small, it turns freely, tilts up to 4°, is sunk a little, and its colour drifts by region.

Sandbox 1 lays its floor by the food forest and the domes' by the warm food forest. Their new versions are drafted on
play for this intent but not yet accepted, so play still pins v1 (no masks).

**How base and head differ:** both run the same tree at the head commit.
- **base:** reads play through the plain proxy, so it gets the pinned v1 cards. Those have no masks, and the floor is
  laid exactly as on main (the fingerprints hold this).
- **head:** reads play through a proxy that swaps the two biomes' cards in `/api/catalog` for the drafted ones in
  `cards/`. These are the cards the new versions carry, so the floor is laid by its masks.

The difference between the two is exactly what this intent changes on screen.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/24454c2d-render/run.sh`. It needs bun, node with Playwright's
Chromium, and ffmpeg. It makes one worktree, `../i12-head`, at the branch's tip (or `HEAD_COMMIT`). It serves it twice:
base on 5181 through the proxy on 3911, head on 5182 through the swapping proxy on 3912. Both proxies are
`shots.mjs`'s own, read-only.

1. **`shots.mjs` (this folder):** Sandbox 1 at 12:00, base then head, each view settled by the render box's `QUIET`,
   with `SEEDED_RANDOM` in every page (`determinism.mjs`, copied from `intent-work/main-baseline/`).
   - At walking height: `walk-near` (z 95), `walk-160`, `walk-edge` (x 40, z 120, looking along the forest's edge).
   - From above: `top-95` and `top-160` (18 m up, straight down), `above-140` (40 m up at a slant).
   - For each view, a still at 1440×900 and the meter over 6 s. Then a 30 m walk in from z = 160 over 12 s, filmed
     with the meter.
2. **Side by side:** `out/pair-<view>.jpg` (base left, head right) and `out/walk.mp4`.
3. **`out/summary.json`:** frame_ms, p95, cpu_ms, gpu_ms and bound, base against head, for every view and the walk. A
   row is marked `worse` if head is more than 5 % slower.

For frame time against main itself, base's near view can be read beside `intent-work/main-baseline/out/<main>/`. The
census (avenBOX) counts Sandbox 1 at near, mid and far:
- with v1 cards: 3,287,563 / 1,826 draws, 5,170,900 / 1,779, 1,398,671 / 878 (main's own);
- with the drafted cards: 3,271,904 / 1,826, 5,159,417 / 1,780, 1,398,671 / 878.

**Pass (c6):** judged against biome-skill's rules, and against Poly Haven's CC0 `aerial_grass_rock` for natural
clustering.
- From above, head reads as grown, not scattered: colonies, not confetti; litter gathered at the trunks' feet; clover
  and strawberries ringing the trunks; grasses and flowers along the edges of the crowns and the paths; ferns and moss
  under the crowns.
- The paths are clear, a margin wider than base's.
- At walking height, sizes vary (mostly small, now and then a large one), plants lean a little, and the colour drifts
  gently from place to place without blotches.
- In the walk film: no plant pops, no tile edges in the cover.
- Head's mean frame_ms and cpu_ms are no worse than base's at every view (within noise; say so for any row marked
  `worse`).
- No `pageerror` in `shots.txt`, and `shots.txt` says `2 biome card(s) swapped` for head.

**Out:** `out/summary.json`, `out/pair-*.jpg`, `out/walk.mp4`, `out/shots/` (the stills and `results.json`) and
`out/*.txt`. Commit `out/` and push to the branch `intent-work/24454c2d-render`.
