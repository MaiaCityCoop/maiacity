# Mac job: intent 24454c2d's c6, plants placed the way nature places them

## Run 4, on `6a4c572` (please run again)

Run 3 is in `out/` as committed at `76b71b2`, moved to `out-run3/`. Its look failed c6: the CPU's points showed the
rings, but in the shots Sandbox 1 hardly changed (SSIM 0.958–0.996). Too little cover was drawn at those views:
- the floor was laid at 3.4 a square metre outside and 3.8 in the domes, half the biomes' own 7;
- the top-down shots looked from 18 m, where the stream (`near` 7 m) had thinned the cover to almost nothing.

`6a4c572` lays both floors at their biome's own density. The census stays within c4's budget: near 10,662,431
triangles and 5,667 draws, mid 13,973,048 and 4,245. It also exposes the garden's trees as `window.__floorTrunks`.

The views are new: down on two trees from 8 and 10 m, and at walking height at a crown's edge (see *What it shoots*).

Dry run in avenBOX first (intent cb52fbd9), from the repository's root:

    bun play/site/scripts/macjob/dry.ts intent-work/24454c2d-render --at <this branch's commit>

Run it the same way. `run.sh` takes the branch's tip, `6a4c572` or later, and writes `out/`. Then commit `out/` and
push this branch.

## Run 3, on `7a8c52a` (please run again)

Run 2 is in `out-run2/`, on `ff3cc57`. Its look failed c6 as well: head's floor was still an even carpet. Every kind
of a footprint shared one dither, and a cell stayed empty only if every kind said no, so nearly every cell held a
plant. The masks only changed which kind it was.

`7a8c52a` fixes that. A cell now holds a plant by the sum of its kinds' densities there, so the floor is thick where
colonies overlap or a mask raises them, and open where none grows, with 88 % as many plants.
`run3-points-topdown.png` shows the points of a 48 m square laid by the CPU, with trees and a path:
- left, the old scattered floor, an even carpet;
- right, the food forest v2's masks, with clover and strawberry rings round every trunk, ferns under the crowns, gaps
  between colonies and a clear margin at the path.

Run it the same way. `run.sh` takes the branch's tip, `7a8c52a` or later, and writes `out/`. Then commit `out/` and
push this branch.

## Run 2, on `bf417ab` (please run again)

Run 1 is in `out-run1/`, on `78f941f`. Its look failed c6. Head and base differed in only 0.1–1.7 % of pixels. The paths
were clear, but nothing gathered: a plant's chance was `min(1, fill × weight)`, and the colonies are 0.85 full, so any
edge or ring gain was cut off at full.

`bf417ab` fixes that:
- a kind as full as its masks could raise it is spread thinner everywhere, so it gathers at the canopy's edge and in
  its ring (on the tests' grid, clover at the edge went from 2.1× the open's density to 3.9×, and strawberries in the
  guild ring from 1.7× to 15.6×);
- a guild stands round every trunk.

The cards in `cards/` are unchanged. Run it the same way. `run.sh` takes the branch's tip, `bf417ab` or later, and
writes `out/` again. Then commit `out/` and push this branch.

The HUD's clock (`15.03.32 21:04`) is the world's calendar. The light is held at noon by `__interiorHour = 12`.

This job is for intent 24454c2d-cb35-4ab2-9f7d-82b7b9b0cb3f (GPU 13/14), pull request #2193, branch
`intent/24454c2d-masks`, at its tip (`335ba43`: this intent's work as one commit on main `9f1442d`, which holds intents 2, 4
and 5; it replaces #2181, the same tree).

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
   - At walking height: `walk-near` (z 95), `walk-edge` (x 40, z 120, looking along the forest's edge), and
     `walk-canopy-edge` (2.5 m out from a tree's crown, looking at its trunk).
   - From above: `top-trunk-8` and `top-trunk-10` (straight down on two trees of the forest garden from 8 and 10 m:
     their guild and litter rings, the shade under the crown, the gaps), and `top-95` (18 m up, the garden as a whole).
     The trees are read from `window.__floorTrunks`: the widest crowns standing most on their own near the village,
     the same in base and head.
   - Settling is capped: 4 min for Sandbox 1 to come up, 2 min a view. Since intent 2, Sandbox 1 keeps taking far pictures for
     minutes and never reads as quiet, so a view that doesn't settle is shot anyway and marked `(still building)`.
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
