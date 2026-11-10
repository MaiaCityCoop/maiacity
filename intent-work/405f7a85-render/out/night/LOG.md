# 405f7a85, the builder's night log (2026-11-10 to 11, UTC)

Each round: the change, the number before and after, kept or thrown away. The box is avenBOX (4 cores, software
WebGPU); "the runner" is GitHub's macOS runner (Metal, a small VM: its seconds compare only with its own).

| # | UTC | change | measure | before | after | kept |
|---|---|---|---|---|---|---|
| 1 | 19:20 | main merged in (the revert of GPU 12/14 the Mac's measured head `ed90418` lacked) | files differing from production's code outside the load path | 8 of 12/14's | 0 | kept: the far ring, the WebKit ground, the frame and the bake the Mac saw were 12/14's |
| 2 | 19:55 | experiment: the far kinds wait until three frames are drawn | the box's hold before the first frame, Sandbox 5 first / second visit | 11.8 s / 39.4 s | 11.3 s / 39.3 s | thrown away: the hold is the software GPU's first frame, not the kinds building beside it |
| 3 | 20:10 | main merged in again (the every-core pool, the frame work); `render/lower.js` main's | the box, seconds to the world, Sandbox 1 / 5 | main 224 / 230 | head 41 / 93 | kept |
| 4 | 20:30 | the cache's test puts no real clock back | `play/api/test/clock.test.ts` | red | green | kept |
| 5 | 20:50 | none (a look): the runner's dry run on `49cb991`, Sandbox 5, Chromium | seconds to the world; painted | main 272 (that runner, before the pool) | 97.2; 94 % | — |
| 6 | 22:35 | the world waits under the cover for its ground's 27 textures | the box, Sandbox 1 to the world; frames drawn with placeholder ground | 41 s; some | 42 s; none | kept |
| 7 | 22:45 | that wait is 15 s at most | a browser that never hands the textures over | the cover for ever | the world after 15 s | kept |
| 8 | 23:05 | none (a count): the census once grown, head `42d5836` beside main `eadbf2f`, Sandbox 1 and 5, near, mid, far | copies by renderer, kind and level that differ | — | 0 of 13,931 / 18,331 / 8,484 and 18,581 / 20,112 / 9,813; draws the same; triangles within 0.6 % | — |
| 9 | 23:15 | a plant put down once the world is drawn fades in over 0.9 s (the renderer's dither) | share of a late copy showing at 0, 1/3, 2/3 and 1 of the time (`arrive.bun.test.ts`) | 1 at once (snaps) | 0.02, 0.33, 0.67, 1 | kept |
| 10 | 23:20 | a mount that throws is said on the cover | the cover after a throw in `mountVillage` | at its last step for ever | "This world could not open: <why>" | kept |
| 11 | 23:20 | a test: cache entries cut to half, to the header, to nothing, and one the browser throws on | built again / read, of 40, on the next visit; errors | untested | 4 / 36; 0; all 40 read the visit after | kept (the code already did it) |
| 12 | 23:30 | none (a measure): the box on `abc5e57`, first / second visit | seconds to the world, Sandbox 1; Sandbox 5 | main 224; 230 | 42.4 / 34.9; 100.9 / 67.7 | c4 recorded |
| 13 | 23:30 | none (a look): the runner's dry run on `abc5e57`, Sandbox 5, Chromium | seconds to the world; painted; frame while the far kinds grow | 97.2; 94 %; 65 ms (`49cb991`) | 107.7; 97 %; 80 ms | picture beside this file |

## Findings outside this intent

- **Real Safari's "Range consisting of offset and length are out of bounds"** (the Mac's log `out/safari/4405-mwbaochi-o4mi.jsonl`) is not a cache file read short. Its stack: `set` ← three's WebGPU `createAttribute` ← `createIndirectStorageAttribute` ← … ← `compute` ← the grass's update in `mountVillage`. The graphics card refused a buffer; a tab of production's Sandbox 1 stood beside it at 8.9 GB. The same error failed 46 kinds as their drawings were made. For intent 1893a631 (memory): a world should outlive a refused buffer.
- **The pool starts a worker for nearly every build**: `box/pool.js` makes each box with `rooms: 1`, and a room is one recipe's worker, so a box ends and starts a worker whenever its next build is another recipe's (the Mac counted 340 and 346 workers a load). Read from the code, not measured. For 08d00b84's follow-up or 7a6c3f1b.
- **The box cannot show a whole first visit**: its software GPU loses its device about 20 s after either world shows, always at 226 of Sandbox 1's 359 builds and 158 of Sandbox 5's 196, on main as on head.
- **A dry run of intents-pr.yml cancels the pull request's own run** when that is still going (one concurrency group a pull request). Round 13's did; the run was started again.

## What the runner's dry run cannot show

Only intent ba948167's one GPU check exists in any spec: Sandbox 5, Chromium. Sandbox 1, WebKit, a second visit, main beside the head on the same day and a hold of the page's thread are not measured there; another check would be a changed spec.

## Against the absolute aim (his M1, real Safari: a world within 10 s on a first visit, 3 s on a second)

| world | first visit, reached | left to 10 s | second visit, reached | left to 3 s |
|---|---|---|---|---|
| Sandbox 1, real Safari 27.2, alone and in front (23c52b2) | 18.6 s | 8.6 s | 28 s once, with 48 refused GPU buffers (another tab at 8.9 GB beside it); not measured clean | unknown |
| Sandbox 1, the Mac's Chromium on Metal (ed90418, with 12/14 still in) | 28 s | 18 s | 16.4 s | 13.4 s |
| Sandbox 5, the Mac's Chromium on Metal (ed90418) | 38 s | 28 s | 10.9 s | 7.9 s |
| Sandbox 5, real Safari | not measured on a visit alone | | | |

Where a first visit's seconds go, from the cover's steps (the box and the runner agree on the order, not the seconds):
1. **The scene before any plant** (the dome, paths, garden, ground): 5 to 11 s in the box, 10 to 20 s of the Mac's first run. Main's as well; not touched here.
2. **The kinds the cover waits for**: 23 in Sandbox 1 (about 10 s in the box), 51 in Sandbox 5 (37 s in the box, 45 s on the runner). This is the largest piece in Sandbox 5.
3. **The first frame** under the cover: 2 to 3 s in Chromium on Metal; 38 to 40 s in the Mac's WebKit on ed90418 (not measured again since 12/14 left).

### Options not taken, for Samuel to judge (each costs picture at the moment the cover lifts, none once grown)

How many kinds the cover waits for is one decision, `NEAR`, `AHEAD` and `BEHIND` in `flora.js` (a tree within 40 m, a shrub within 26 m, the cover within 13 m; a plant not before the eye counted 4 times as far). Counted from the worlds as they stand (`flora.worlds.json`):

| the cover waits for | Sandbox 1 | Sandbox 5 | what lifts with the cover |
|---|---|---|---|
| now: 40 / 26 / 13 m, behind × 4 | 23 of 198 | 51 of 180 | everything near, before and behind the eye |
| 30 / 20 / 10 m | 12 | 40 | trees from 30 m on fade in after |
| 25 / 15 / 8 m | 10 | 25 | half of Sandbox 5's wait; shrubs from 15 m fade in after |
| only what is before the eye, 40 / 26 / 13 m | 10 | 45 | turning round at once shows plants still fading in |
| only before the eye, 20 / 13 / 8 m | 5 | 14 | a quarter of Sandbox 5's wait; the middle distance fades in after |

Not taken tonight: with fewer kinds the world as the cover lifts is emptier for its first seconds, and "nothing may look worse" is the rule. The fade (round 9) makes a later arrival gentler; whether an emptier first second is worth 10 to 25 s in Sandbox 5 is his to say, and it is one number to change.

The other large piece is not this intent's: each kind's build waits behind other kinds' levels (intent 7a6c3f1b), and nearly every build starts a worker and runs the engine in it again (the finding above).

## What I saw that falls short of real, outside this intent (for the audit, 1f6a98dd)

- **The sky's clouds are large flat blocks** (the Mac's far views, the runner's pictures): they read as tiles, not clouds.
- **Far trees as pictures are speckled and hard-edged** against the sky at 300 m and more (the Mac's far-zoom picture, production and head alike).
- **The grass ends in a visible line** some metres out, bare textured ground past it (the runner's Sandbox 5 picture, left and right of the path).
- **The first frame's hold**: nothing is said or moves on the cover while the page's thread is held drawing it (2 to 3 s on Metal in Chromium, far longer in WebKit on the old head).
