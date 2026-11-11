# The audit: what every part of Sandbox 1, 3 and 5 costs, and what stands between it and the real thing

Intent 1f6a98dd-0da4-465d-9189-40126577438c, the night of 2026-11-10 to 11. origin/main `eadbf2f7`. Nothing under
`play/` is changed by this branch; it holds this file, the raw numbers (`out/`), the scripts that made them (`tools/`)
and two reports (`reports/code-map.md`: how the three worlds are built, file and line, every number in the code;
`reports/realism.md`: the history of the grass and the far trees, and the Mac's pictures read as a critic would).

## Whose numbers

Never mixed, named at each number:

- **box**: avenBOX (4 cores, 15 GB, no GPU). The census (`play/site/scripts/census.ts`), play read live (`--live`:
  tonight's pins), on main. Triangles, draws, WebGPU calls, copies, builds. Exact and repeatable; no time of a GPU.
- **Mac**: Samuel's M1, 8 GB, the Mac render box (`origin/intent-work/405f7a85-render`): Chromium 153 on Metal,
  Playwright's WebKit 26.6, real Safari 27.2. Frame times are of production `672ae57`, before intent 416c555c cut the
  WebGPU calls by half: a real GPU's frame on today's main has not been measured by anyone yet (intent 0356b0ea's first
  round does it).
- **others' box runs**, taken, not repeated: 7a6c3f1b (where a first visit's CPU goes), 1893a631 (who holds the memory).

## 1. The aims, and how far each world is

The aims Samuel set tonight, on his own machine (M1, 8 GB, Safari): a world shown within 10 s on a first visit and 3 s on
a second; never more than 2.5 GB held; 16.7 ms a frame standing and walking; the picture judged against the real thing.

| | aim | Sandbox 1 | Sandbox 5 | Sandbox 3 |
|---|---|---|---|---|
| first visit, to the world (Mac) | 10 s | 157 to 190 s (Chromium), 190 to 200 s (WebKit); never reached in his Safari | 149 to 173 s, 200 s | 6 s (his Safari) |
| the same with 405f7a85's load path (Mac, its head) | 10 s | 28 s, 60 s | 38 s, 60 s | — |
| second visit (Mac, production) | 3 s | 31 s, 169 s | 157 s, 115 s | not measured |
| the same with 405f7a85 | 3 s | 16 s, 20 s | 11 s, 21 s | — |
| memory, peak (Mac) | 2.5 GB | 8.9 GB in Safari, then reloaded; 8.7 GB WebKit | 9.2 GB WebKit | 1.0 GB WebKit, about 1.5 GB Safari |
| a frame standing (Mac, Chromium / WebKit) | 16.7 ms | 40 / 66 ms | 41 / 64 ms | 16.7 / 24.6 ms |
| a frame walking | 16.7 ms | 63 / 135 ms | 87 / 282 ms | 16.7 / 23.2 ms |
| triangles a frame, near view (box): main pass + shadow passes | see below | 3.84 M + 6.67 M | 4.79 M + 5.15 M | 0.34 M + 0 |
| draws a frame, near (box) | see below | 3,876 | 1,739 | 297 |
| WebGPU calls a frame, standing / walking (box) | see below | 9,361 / 12,558 | 5,970 / 7,491 | 1,504 |

**The frame's aim in the box's units** (so a pull request can be held to it without a GPU). On the Mac the GPU's time
follows the triangles: Sandbox 3 at 0.92 M triangles takes 8.7 to 10.6 ms, Sandbox 1 at 4.2 M 22.8 to 28.8 ms, Sandbox 5
at 9.5 M 36.3 to 40.9 ms: about 6 ms and 3.7 ms a million. The page's JavaScript follows the calls: Sandbox 3 at about
2,000 calls 6.5 ms, Sandbox 1 at 5,500 to 6,200 24 to 36 ms. So 16.7 ms on this Mac is, with room for the browser:
**at most 1.5 million triangles, 600 draws and 2,500 WebGPU calls in any frame, shadow passes included.** An estimate from
six points; the frame intent's rounds on a real GPU will correct it. Sandbox 3 holds it today. Sandbox 1 and 5 are at 3
to 7 times it.

**The verdict on the aims.** 10 s, 2.5 GB and 16.7 ms are all reachable, but none by mending alone: each needs one of the
patterns of part 4. 3 s for a second visit needs the levels read from the device with nothing built or photographed
(the far pictures are retaken at every visit today).

## 2. Every part of a world, and what it costs

Sandbox 1 and 5 are one page and one function (`sandbox-2/interior/village.ts` `mountVillage`), Sandbox 5 a `solo`
branch of it reading Sandbox 1's layout (its own has no pins). Sandbox 3 is its own world file
(`maiacity-v2/world.js`, 3,925 lines) sharing only the sky, the renderer and the asset boxes.

Triangles and draws are the box's, Sandbox 1's near view unless said; seconds and memory from the runs named above.

| part | how it is done today | first visit | memory | a frame: the page's JavaScript | a frame: the graphics card |
|---|---|---|---|---|---|
| **placing the assets** | seeded on the page at load, on the main thread (`plantGarden`), from the layout's `garden` (m² a plant: canopy 26, trees 24, shrubs 5, herbs 3.2, ground 2.6). 13,931 copies alive near, 18,331 mid; every tree of the cell placed at load. Kept as flat arrays per kind, small plants in an 8 m hash, **no structure in the renderer** | not split (inside the 5 to 20 s before the forest) | small | **every alive copy of every kind is visited at each move** (a ball, a frustum test, a level): 9,475 of 13,931 copies are out of view and visited all the same; about 50 ms a frame walking in WebKit (Mac) | — |
| **loading and building** | each kind's recipe run in a box worker on the device, 396 builds of 177 recipes; a pool of cores − 1 boxes; the world waits until every renderer builds nothing | **about 150 CPU s of builds** (box, 7a6c3f1b); the cover waits for all of it | workers' heaps up to 0.8 GB while building | main thread 16 to 82 s busy during the load (Mac) | uploads; one hold of 3.4 to 3.7 s as the world shows (Mac) |
| **levels of detail** | 4 levels, chosen by size on screen alone (`lod.js`: 1.2, 0.56, 0.22 of the view, then a picture). Plants with a `detail` are built at 0.25 and 0.1 (declared); **25 builds of 6 trees are built whole (0.24 to 1.68 M triangles each, 14.65 M together) and simplified on the device**; everything hand-built has **no levels at all** | **about 400 CPU s of simplifying** (box, 7a6c3f1b): three quarters of a first visit | **2.4 GB the level workers never give back + 1.1 GB of full builds kept + as much on the card** (box, 1893a631) | the level chosen per copy per move | L0 almost never drawn (1 to 14 copies of 14 to 18 thousand) |
| **the far (pictures)** | one upright card a copy, a picture from 8 sides at 128 px, lit in a studio, switched hard between sides; taken at load for every kind, **never kept on WebGPU, so retaken at every visit** | every kind photographed before the world shows | pages of 2048² | — | 7,582 triangles for 4,297 copies: nearly free |
| **the plants** | 350 plant builds for the two worlds, 19.9 M triangles built, of which 3.15 M at the coarsest (301 builds). All three asset renderers together draw 17 % of the main pass near, 47 % mid | (the builds and levels above) | (above) | (above) | 0.66 M main near, 2.71 M mid |
| **grass** | blades chosen on the graphics card (compute, 3 indirect draws): 700 a m² at the eye to 4 m, thinning with the square of the distance, ending at 70 m; in colonies | small | small | the cell list rebuilt every frame; **the mask recomputed on the CPU as you walk, 6,000 texels a frame**, each asking the world | 0.11 M triangles near, 0.19 M mid: 3 % |
| **ground cover** | laid on the CPU in 10 m tiles to 28 m round the eye, each plant a copy in the library renderer; garden shrubs to 26 m, herbs to 13 m, then nothing | "Covering the ground" 5 to 60 s (box, one box) | small | its copies are in the per-move loop | 0.13 to 0.17 M: 3 % |
| **the ground** | 9 scanned surfaces × 3 maps as KTX2 array textures (2048 / 1024), blended per pixel (a loop over 9, hex tiling near, the mean far); a relief mesh on a 2.5 m grid in Sandbox 1, flat in Sandbox 5 and 3 | 27 maps transcoded in 2 workers | about 0.4 GB of textures on the card (Sandbox 3's whole card: 404 MB) | none | 0.25 M triangles; the heaviest pixel shader of the world |
| **wind** | all in the vertex shader (uniforms and a foot and height per copy) | — | — | one tick | in every plant's vertex shader |
| **sky and clouds** | a box at the eye: Preetham air, 4 octaves of noise for clouds (blocky: their numbers outgrow a 32-bit float, intent c929d52c), 6,000 star quads; the sky's own light a 128² cube baked again each half degree of sun, about every 5 s | — | small | a re-bake about every 5 s | 12,013 triangles; each re-bake also redraws the shadows |
| **light and shadow** | the sun, 2 cascades of 2048² out to 300 m; redrawn when the eye moves 2 m or turns 2°, at each sky re-bake, when an animal walks near. Post: 22 render passes a frame (scene with normals and velocity, SSAO at half size, contact shadows, TRAA, bloom, grade) | — | 539 MB of half-float targets + 215 MB of depth live, four sets where one is drawn (box, 1893a631) | — | **a shadow redraw is 6.67 M triangles in Sandbox 1 near, 5.15 M in Sandbox 5**: more than the picture itself. Standing, none (the Mac's median frame has 0); walking, one every third of a second |
| **buildings and domes** | Sandbox 1: 13 domes hand-built on the main thread (`interior.ts`), the nearest one's inside built whole; shells, paths, water and props hand-built meshes. Sandbox 5: one build of 1,241,499 triangles and 242 draws. **No levels, every mesh a shadow caster** | built on the main thread in slices | not split | 491 + 831 draws near: a third of all draws | **the largest part of every view**: Sandbox 1 near 2.56 M of 3.84 M main (67 %) and 93 % of the shadow triangles; far 1.17 M of 1.55 M (76 %); Sandbox 5 far 1.88 M of 2.18 M (86 %) |
| **animals** | fish, sheep, goats, birds as their own meshes | — | — | each its own draws: 130 near | 0.11 to 0.24 M |
| **the walker** | a stride of 0.25 m: two floor lookups and one obstacle test in an 8 m hash | — | — | negligible | — |

### Triangles by part, every view (box, `out/parts.json`)

Main pass, then the shadow passes when they are redrawn.

| view | main | hand-built (domes, shells, the dome build) | plants and things | ground, grass, cover | shadow | of it hand-built |
|---|---|---|---|---|---|---|
| Sandbox 1 near | 3,836,023 | 67 % | 17 % | 13 % | 6,668,975 | 93 % |
| Sandbox 1 mid | 5,788,896 | 38 % | 47 % | 10 % | 6,373,948 | 61 % |
| Sandbox 1 far | 1,552,860 | 76 % | 6 % | 17 % | 1,031,844 | 85 % |
| Sandbox 5 near | 4,787,909 | 40 % | 48 % | 9 % | 5,149,710 | 57 % |
| Sandbox 5 mid | 5,182,914 | 37 % | 52 % | 10 % | 4,513,673 | 46 % |
| Sandbox 5 far | 2,178,017 | 86 % | 7 % | 5 % | 1,886,587 | 72 % |
| Sandbox 3 | 336,610 | 65 % (its steppe) + 26 % builds placed whole | 6 % | — | 0 | — |

**What tonight's five intents do not touch**: the hand-built village and the dome build. They are most of every frame's
triangles and nearly all of its shadows, and they have no levels.

## 3. The heavy work a device does for a world, weighed

Every build the three worlds ask for, kept by the census and weighed (`out/kept-builds.jsonl`; `tools/kept-weigh.ts`):

| what is built | builds | triangles | as plain arrays | 
|---|---|---|---|
| plants at their coarsest (detail 0.1) | 301 | 3.15 M | 195 MB |
| plants at detail 0.25 | 24 | 2.06 M | 145 MB |
| **six trees built whole to be simplified** (chestnut 6, walnut 5, mango 4, hazel 5, moringa 3, yam 3) | 25 | **14.65 M** | **778 MB** |
| actors, buildings, things, machines, biomes | 147 | 3.38 M | 291 MB |

**Handed to the device's simplifier** (box, `out/box/jobs-*.jsonl`, `tools/census-jobs.diff`; the near view's
load): Sandbox 1 59 jobs, **16.35 M triangles in** (22 jobs of 150 thousand or more hold 15.80 M of it); Sandbox 5 66
jobs, 9.81 M (10 jobs hold 9.15 M); Sandbox 3 12 jobs, 0.27 M. The aim is 0.

**The census from the pinned inputs** (what a pull request's check reads; `out/box/pinned-summary.txt`) counts the
same as from play live tonight, to the triangle, in the near and far views; Sandbox 1's mid view moved 4 % between
two runs (12.67 M and 12.16 M: its streams settle differently), and the calls a frame by up to 2 %. A ceiling needs
that much room.

**What ready shapes would weigh down the wire** (measured tonight, `out/wire.jsonl`, `tools/wire.ts`: each build's
positions at 16 bits in its box, normals at 8, texture coordinates at 16, colours at 8, packed by meshoptimizer's own
codecs, which play already ships, then zstd):

| | builds | plain arrays | on the wire |
|---|---|---|---|
| every plant at its coarsest | 301 | 195 MB | **22.7 MB** |
| actors, buildings, things, machines | 125 | 208 MB | 14.0 MB |
| **a whole world at the levels its first minutes draw** | 426 | 403 MB | **about 37 MB**, a third of it for what stands near the start |
| plants at detail 0.25 (drawn when walked up to) | 24 | 145 MB | 14.4 MB |
| the six trees whole (never needed by a world) | 25 | 778 MB | 72.6 MB |

So the trade is: about 150 CPU seconds of building and 400 of simplifying on every new device, against about 12 MB
to show the world and 37 MB for all of it, once, cacheable for good because a version's hash never changes. An upper
bound: the indices are not yet ordered for the codec.

## 4. The patterns

Each with the number that earns it its place, what it saves, what quality it frees room for, and who does what of it.

**P1. No device makes a level.** Every pinned version arrives with its lighter levels: a plant by declaring them
(`module.exports.levels`, its card `lod: declared`), everything else by P2.
*Number*: 400 of 550 CPU s, 2.4 GB of level workers, 1.1 GB of full builds, 14.65 M triangles built to be thrown away:
all from 25 builds of six trees whose cards say `derived`. *Frees*: the memory and seconds for denser forest and
sharper far pictures. *Done tonight*: 7a6c3f1b puts builds before levels and makes each level once; 1893a631 gives the
level workers' memory back and lets the full build go. Both make the page survive a derived kind; neither removes it.
*Left*: six assets' next versions declaring their levels and Sandbox 1's pins moved (play's work, live at its Accept,
no deploy); then the budget holds "triangles a device must simplify" at 0 for every world.

**P2. No device runs a recipe for a world.** A version's shapes, level by level, and its far pictures are made once,
when it is accepted, and kept among play's files by hash, as its pieces are; a world downloads them.
*Number*: 150 CPU s of builds against 37 MB (12 MB to show), and the far pictures no longer retaken at each visit.
*Where it may run*: never on play's server (play/SPEC.md §4.5: proposed code runs only in the box). Two places can:
the accepting admin's own browser, in the asset box that already builds the version for their review; or avenBOX on
GitHub, in a job without any secret that builds as the census builds, a second job with the token keeping the files.
The second needs no person's machine and is the one to specify. What is kept is data (arrays and pictures), checked by
its hash; a wrong bake can draw a wrong shape, never run code. *Frees*: the 10 s first visit, and far pictures of any
quality (lit, many views, high resolution) at no cost to a visit, which is what took GPU 12/14's lit impostors out
again: they were baked on the device at load and hung it. *Done tonight*: 405f7a85 shows the world before the far kinds
and keeps builds on the device for a second visit. *Left*: all of it.

**P3. Everything drawn has levels, the hand-built too.** A dome, its inside, a shell, a path's stones, the forest-dome
build: each an asset drawn by the one renderer with levels and a far picture, or at the least a coarse stand-in for the
far and for shadows.
*Number*: 38 to 86 % of every view's main triangles and 46 to 93 % of its shadow triangles are hand-built or one
build without levels; Sandbox 1's far view draws 1.17 M triangles of village at any distance. *Frees*: the largest
room of all, 1 to 2.5 M triangles a frame, for grass, understorey and trees. *Done tonight*: nothing. *Left*: all.

**P4. Shadows are cast by stand-ins, and only where a shadow can fall.** A caster is its coarsest level or its
picture; a dome's inside does not cast into the sun's cascades through its own shell at full detail; a shadow redraw
never costs more than the picture.
*Number*: a redraw is 6.67 M triangles in Sandbox 1 near against 3.84 M for the picture, 72 % of it one dome's inside;
it falls every third of a second walking, which is the walking hitch (p95 150 to 300 ms on the Mac). *Frees*: a third
cascade or a longer reach for the far shade the critic misses. *Done tonight*: 0356b0ea may reach it (told tonight).
*Left*: the rule and its budget line.

**P5. A world streams, by one rule from the kit.** Near first and whole, far as its cheapest stand-in, nothing built,
photographed or uploaded that cannot be seen from where the visitor stands; the cover lifts when the near stands.
Copies live in cells, so a move looks at the cells that changed, not at every copy.
*Number*: 9,475 of 13,931 copies visited a move are out of view; every kind is built and photographed before the world
shows; the cover waits up to 120 s for every renderer to be idle. *Shared today*: the sky, the renderer, the post, the
asset boxes. *Not shared*: three asset renderers a page in Sandbox 1 and 5 (four in 5), each with its own pages,
level workers, wind and loop; four different streams (trees none, small plants 26 / 13 m, cover tiles 28 m, grass
70 m, dome insides 50 m), each with its own numbers in its own file; Sandbox 3 its own loop and scatter with no
streaming. *Frees*: worlds larger than a cell. *Done tonight*: 405f7a85 (near kinds first), 0356b0ea (a move skips
copies out of view together), 1893a631 (one level maker a page). *Left*: one stream for every kind of thing, one
renderer a page, Sandbox 3 on the kit.

**P6. Drawn as one.** What repeats is instanced, what never moves is welded, materials are shared, and the frame is
few passes. *Number*: 681 pipeline switches and 3,699 vertex buffer sets in a standing frame of Sandbox 1; 831 draws
for one dome's inside; fish and sheep each their own draws (130); 22 render passes. *Done tonight*: 416c555c halved
the calls (live); 0356b0ea continues. *Left*: the hand-built parts (with P3).

**P7. A budget for every world, held at every door.** Each world has one written budget in absolute numbers, the aim
beside today's ceiling: seconds to the world, memory, a frame's milliseconds, and in the box's units the triangles,
draws and calls a frame and the triangles a device must build and simplify. A ceiling only moves down, or up by a
change that says so in the same pull request. Held where a number can change: every pull request that touches a world
(the box's units, from the pinned inputs), every ready pull request on a real GPU (seconds and milliseconds on GitHub's
macOS runner), and every proposal of a layout or an asset version that a world pins (the content door).
*Number*: time to the world, peak memory and frame time were each found by a person's eye, late; 700 blades a square
metre was chosen by a triangle bound against main (+4.5 %), not against an aim. *Frees*: every realism step is priced
before it is built: it must fit under the aim or bring its own saving. *Done tonight*: 1893a631 writes `memory.ts`
with absolute MB bounds; 0356b0ea adds walking to `gpu.ts`. *Left*: the budget itself and its doors: **the first
step**.

## 4b. The first of the budgets: an asset's own ceiling, and its levels kept with it

Samuel, 2026-11-11: "any asset touched can be max 300k in its highest detail and needs to be optimized for this, while
keeping realism as good as possible", "incl. the colocation of the 3-4 LOD configs per asset with its actual src files".

**Where the assets stand** (play's catalog as the census pins it, `tools/catalog.ts`: 274 assets, the 368 recipes of
their newest versions; a card's triangles are its default build's):

| group | assets | recipes | card says `declared` | `derived` | names none | triangles known | over 300,000 | over 100,000 | median | 90th | most |
|---|---|---|---|---|---|---|---|---|---|---|---|
| plants | 108 | 111 | 0 | 84 | 27 | 85 | 9 | 44 | 107,964 | 299,152 | 1,204,000 |
| things | 94 | 94 | 0 | 55 | 39 | 55 | 0 | 0 | 2,416 | 9,716 | 35,060 |
| machines | 25 | 61 | 0 | 16 | 45 | 15 | 2 | 7 | 90,600 | 245,812 | 743,102 |
| buildings | 20 | 22 | 0 | 12 | 10 | 12 | 1 | 1 | 15,873 | 55,986 | 370,146 |
| biomes | 12 | 31 | 0 | 25 | 6 | 26 | 2 | 6 | 361 | 197,594 | 342,388 |
| actors | 10 | 44 | 0 | 44 | 0 | 44 | 0 | 1 | 20,772 | 33,720 | 230,902 |
| characters, worlds | 5 | 5 | 0 | 3 | 2 | 2 | 0 | 0 | | | 62,592 |
| **all** | **274** | **368** | **0** | **239** | **129** | 239 | **14** | 59 | | | |

- **No accepted version declares its levels.** 239 cards say `derived`; 129 name none (from before the contract: a
  plant among them is drawn at its recipe's detail 0.25 and 0.1, everything else is simplified on the device).
- **Over 300,000 at the default build, 14**: birch 4 (1,204,000), truck 5 (743,102), jackfruit 5 (628,634), durian 4
  (531,526), mango 4 (460,012), pecan 3 (431,608), pickup 5 with its cube (426,652), cherry 2 (416,740), orange 4
  (393,724), dome-factory 3 (370,146), olive 3 (366,616), avocado 5 (356,838), the beech-forest and spruce-forest
  biomes (342,388, 326,016).
- **A card counts one stage; a world draws the heaviest.** Built for the worlds tonight, over 300,000: walnut 5 at
  stage 12 1,679,476; sweet chestnut 6 at stages 9 to 12 up to 1,586,890; the forest dome 6 1,241,499; mango 4 up to
  887,690; moringa 3 up to 754,718; hazel 5 (tree) up to 740,888; yam 3 up to 433,083: 19 builds. Walnut and chestnut
  are under 300,000 on their cards. So the ceiling is counted at the heaviest stage and variant a recipe's params
  allow, by building it, never read off a card.

**The rule, as proposed**

- **One ceiling for every asset: 300,000 triangles at its finest**, counted at its heaviest stage and variant. One
  number is what play can refuse by; the 90th plant is at 299,152, so it is a large tree's true need and no more.
- **Smaller aims by kind, in the asset skills** (not refused, reviewed): a thing 30,000 (the heaviest today 35,060),
  an animal 40,000 (90th 33,720), a herb or cover plant 15,000, a shrub 60,000, a tree, a machine and a walkable
  building 300,000. A biome is a composition: its parts are held, not its sum.
- **Three shapes and a picture, declared with the source**: `module.exports.levels` beside the recipe, the card
  `lod: declared`: L0 at most 300,000; L1 at most 0.3 of it (90,000; drawn from 1.2 down to 0.56 of the view); L2 at
  most 0.08 (24,000; down to 0.22), `render/lod.js`'s shares; L3 its picture. Whether the shares must fall (a mid view
  draws 53 to 84 copies at L1 and about 105 at L2, which at the caps is far over a 1.5 M frame) is decided by the
  world's budget, not here: the asset's rule caps one asset, the world's budget caps their sum.
- **"Touched" is: its source changed** (an asset's, a variant's or a breed's). A card's word, a sheet or a label
  forces nothing. I agree with the Orchestrator's reading, with one more door: **a layout may not newly pin a version
  over the ceiling**, or an old heavy version comes back by a pin with no source touched.
- **Held, not only said**:
  1. *play, at propose* (`play/api/src/lod.ts`, where a version without `lod` is refused today): a version whose
     source changed is refused unless its card says `declared` and its source exports its levels. play runs no code,
     so it cannot count triangles; it refuses on the card's own count where that is over.
  2. *the box, as a standing check of every intent that brings an asset's version*: the variant built at its heaviest
     stage in the census's box and counted (as `census/viewer.ts --intent` builds it), each level within its ceiling;
     recorded as the intent's evidence. This is the count that decides.
  3. *known exceptions by UUID and version*, as 5723e301 named BatteryPack: the 14 and the 19 above, each until its own
     intent; the list only shrinks.
  4. *the Intents skill's Idea part*, a rule of the reduce step for any intent that changes an asset's source; the
     asset skills' "Levels of detail"; play/SPEC.md §4.5.
- **Each level's built shape kept by hash at Accept** (P2): yes; with declared levels it is three builds and a picture
  a version, 37 MB for a whole world at the levels it first draws.

Intent 3e27d730 (building tonight) brings the six trees under 300,000 with their levels declared: the rule's first
use. The rule itself (play's refusal, the box's count, the skills) is its own intent, the first after the budget.

## 4c. A clean world from the ground up, or the legacy worlds mended?

Samuel's question, 2026-11-11: "does it make sense to start a clean world with clean assets from the ground up,
instead of optimizing legacy worlds?" Short answer: **a clean world, yes; clean machinery, no; and the three sandboxes
are moved onto its path piece by piece, never rebuilt whole.**

**What is structure that cannot be made fast in place** (it has to be rebuilt as something else, whatever we decide):

| | lines | what it is | its share of a frame |
|---|---|---|---|
| `sandbox-2/interior/interior.ts`, `factory.ts`, `spaces.ts`, `rooms.ts` | 5,145 | the 13 domes and their insides, built mesh by mesh on the main thread; no levels, no hash, every mesh a caster | 18 to 45 % of the picture, 38 to 72 % of the shadow triangles (Sandbox 1) |
| `sandbox-2/interior/village.ts` (and `plants.ts`, `animals.ts`) | 3,273 | the cell: scatter, paths, water, shells, four streams, three asset renderers, the load's order, the frame's loop, and a `solo` branch that is Sandbox 5 | 14 to 76 % of the picture |
| `maiacity-v2/world.js` and its files | about 5,000 | Sandbox 3: its own canvas, loop, scatter and draw path | all of Sandbox 3 |
| `buildings/forest-dome` 6 | one asset | 1,241,499 triangles, 242 draws, one level | 24 to 57 % of Sandbox 5's picture |

About 13,000 lines of world-specific code hold the parts that are 38 to 86 % of every frame. None of it can be given
levels, a hash or a place in the stream by tuning: a hand-built dome becomes fast only by becoming an asset.

**What any world needs and is already shared, and is being mended tonight** (about 18,000 lines: `sandbox-kit`,
`assets/render`, `assets/box`, `render`, `biomes`): the sky, the renderer and its post, the asset boxes and their
pool, the levels and far pictures, the device's cache, the grass, the ground, the walker; and the content: 274 assets,
of which 225 of the 239 with a known count are under 300,000 triangles at their default build. A world rebuilt from
nothing would use every one of these as they are. Throwing them away buys nothing: their faults (builds behind
levels, memory held, a move visiting every copy, the clouds) are faults a clean world would have too.

**The clean path already exists.** A world is an asset of the group `worlds` (play/SPEC.md §4.11): its recipe builds
its land and names everything else by hash (`use:<recipe hash>`), drawn by the one renderer with its levels and far
pictures (`assets/plantings.js`, 1,477 lines with `worlds/`), its floor a biome, walked on the Worlds page under the
one sky. The census counts it (`--world worlds --asset <uuid>`) and `gpu.ts` measures its route. The Old City is one.
Sandbox 5 already draws its dome's guests this way. Nothing new has to be invented to build a world cleanly; the
sandboxes simply were never moved onto it.

**A small clean reference world, strictly on P1 to P7** (an estimate, to be proven by building it):

- *What it holds*: one hectare of food forest and meadow: one biome's floor with its grass and cover; about 40 plant
  kinds at three stages chosen from those inside the rule (every plant takes a `detail` today, so its levels can be
  declared; the six trees of 3e27d730 once accepted); one small building that is an asset (the glamping dome: 16,858
  triangles, 104 draws); a pond; the one sky. No hand-built mesh but its land.
- *What it would cost a frame*: held from its first day to the aim, 1.5 M triangles, 600 draws, 2,500 calls. Sandbox 5
  without its dome and shells is already at 2.3 M of picture near; a hectare is a third of its planted ring.
- *What it would cost a visit*: about 120 coarsest builds, some 9 MB as ready shapes (75 KB a build, measured), or
  before P2 exists about 45 CPU seconds of building on the device, which seven cores finish in under 10 s.
- *What it would cost to build*: a world asset and its layout are play's work, one or two nights; no new machinery.
- *What it would prove*: whether 10 s, 2.5 GB and 16.7 ms hold on Samuel's M1 when nothing but the pattern is in the
  way. If they do not, the fault is in the shared machinery and is found without 13,000 lines of village around it.
  It is also the stage every realism step (R1 to R12) is first judged on: small, fast to load, the same every time.

**How the three sandboxes then move, piece by piece** (their layouts are documents and their plants are assets
already, so most of each world moves by proposal, not by code):

1. The domes and their insides become building assets with declared levels (step 3 of part 6); the village then
   names them by a pin, and `interior.ts` goes.
2. The cell's scatter, paths and water become the world asset's land and its layout's configs; `village.ts` shrinks
   to mounting a world asset with the kit.
3. Sandbox 5 is then Sandbox 1's layout without its domes: its `solo` branch goes.
4. Sandbox 3 is built as a world asset when the tired land is (intent 1a143021), and `maiacity-v2/world.js` goes.

**Against rebuilding the three whole**: their plants, layouts, biomes and sky are not the problem and would be
carried over anyway; what would be rewritten is exactly the 13,000 lines above, and doing it in one piece means months
with two versions of every world and no budget on either. Piece by piece, each move is one intent, measured by the
world's budget before and after, and the world keeps working throughout.

**Recommendation.** Stop optimizing the hand-built parts in place: that is the one place where mending is wasted.
Keep mending the shared machinery (tonight's intents). Build one small clean world as the reference and the proving
ground, then move the sandboxes onto its path in the four moves above.

**Its first step, as an intent Samuel could approve in the morning**: *"A reference world built only from assets
inside the rule, on the one path, held to the aims from its first day"*: a world asset (one hectare, the contents
above) proposed on play, its entry in the budget with the aims as its ceilings (not today's numbers: it starts
inside them), the census's count and a real-GPU measure of it in both engines as its checks, and the pictures it
gives as the first references for R1 to R4. It needs the budget (this intent) and gains from 3e27d730's trees; it
waits for nothing else.

## 5. Realism: each part against the real thing

The reference is the real thing, never today's picture. Judged against: Poly Haven's CC0 `autumn_meadow` and
`evening_field` (a meadow and a field's edge at noon and at golden hour: world-skill's own references), each plant's
reference sheet (play/SPEC.md §4.10), the scanned CC0 surfaces the ground is made of, and a temperate food forest as
it stands. "Now" is the Mac's WebKit pictures of production on WebGPU (`reports/realism.md`).

| part | now | the real thing | what stands between | what closes it, and its cost under the pattern |
|---|---|---|---|---|
| **grass** | tufts of wide, straight, single-coloured spikes on bare litter; no blade past 70 m, the meadow beyond a flat texture. **Not thinner than before: 700 a m² is the densest it has been** (150 two days ago); it reads thin because it stands in colonies with soil between, each blade drawn 3 times as wide as it is | a closed sward, no soil seen, three or four species, pale seed heads over it, a tenth straw, a soft edge against the light | the colony curve leaves soil bare; one blade shape; no far grass | close the sward (a number: free); two more blade kinds chosen in the same compute (no draw more, about 10 % more triangles: 20 thousand); a far layer of cards or a grass tint in the ground past 70 m (fill only) |
| **ground cover and understorey** | gone at 13 to 28 m; between trunks a bare floor | herb, shrub, small tree and canopy closing to green at eye height | no stand-in for a small plant: it has no picture | pictures for shrubs to 80 m (2 triangles each; as shapes the same reach cost +53 % triangles); needs P2 so the pictures cost a visit nothing |
| **trees near** | flat single-colour leaf polygons, smooth tube trunks, crowns a stipple with sky through it | leaves with a midrib and a sheen, yellow-green against the light, bark in relief | no leaf translucency or sheen, no bark map, a dither the eye sees | a leaf material (fill only); bark from the scanned sets (5 to 21 MB a set); a finer cut near the eye |
| **trees far** | a cut-out frieze: unlit 128 px pictures magnified 1.9 times where they take over (40 m), 8 sides switched hard, specks floating above the crowns, no sun side | crowns with a sunlit and a shaded side, paler and bluer with distance | pictures lit in a studio, low, few, never kept | lit pictures from many sides, blended (what GPU 12/14 had, taken out by ffd02ebf because baking 180 kinds at load hung the page): baked once at Accept under P2, a visit downloads them: no load cost, two pages of memory |
| **the forest as a whole** | a wall behind an empty meadow; not thinner than a week ago (6295a650 restored the village's own distances; no commit took copies out) | layers, depth, dapple far into the wood | no haze between layers, no far shade, no understorey | haze and aerial perspective tuned (no pass more); the canopy's shadow map for far dapple (one target); understorey as above |
| **sky and clouds** | a flat gradient, clouds as stair-stepped blocks | soft cumulus with lit edges, a pale horizon | the float fault (c929d52c), then one flat layer | after c929d52c: two layers lit from the sun's side (fill only, on 12 triangles) |
| **light, shadow and colour** | good dapple on the path; elsewhere flat, shadow sides near black, no highlights | a warm key, a cool fill from the sky, shade that still has colour | fill too weak in shade; shadows end at 300 m | sky-coloured fill in the shade (free); a longer reach once P4 has paid for it |
| **the ground** | one blurred brown-green noise to the horizon, no relief past the near | the scanned surfaces with relief and litter | the far falls to the mean colour | a far detail layer at a second scale (fill only) |
| **water** | an opaque mint sheet, hard shore; broken reflection strips in Sandbox 5 | dark and mirroring at a low angle, clear at the shore | no Fresnel, no depth colour, no ripples | reflection of the sky's own light, colour by depth, moving normals, a soft shore (one depth read, fill only) |
| **domes and buildings** | Sandbox 1's glass a repeating moiré tile, stone one flat texture; Sandbox 5's dome chalk white | glass that mirrors the sky, stone with shade in its joints | no reflection on glass, a pattern without mips | the sky's light on glass, the pattern filtered (free); real levels come with P3 |
| **Sandbox 3** | an empty beige plane, one figure, a blob for a shadow | the tired land: worn farmland | no world yet (intent 1a143021 is the idea for it) | its own intent; on the kit (P5) when it is built |

### The realism programme, ranked: the largest gain a person sees for the least cost first

Each one night's work, each judged at Proposal by a real-GPU picture (`gpu.ts`, both engines) beside its reference,
each held to the world's budget (P7): none may raise a ceiling without saying what it bought.

| | intent | the look it must reach | judged by | cost |
|---|---|---|---|---|
| R1 | **The sward closes** | no soil between blades within 10 m of the eye in the meadow | Sandbox 1 near beside `autumn_meadow`'s foreground | none (the colony's numbers) |
| R2 | **Depth in the air** | trees at 150 m visibly paler and bluer than at 40 m, at noon and at golden hour | Sandbox 5 far beside `evening_field` | none (haze tuned) |
| R3 | **Water that mirrors** | the pond shows sky and dome at a low angle, the bed at the shore | Sandbox 1 near beside a pond's photograph | fill only |
| R4 | **Shade with colour** | no black holes under the canopy: shade reads blue-green, sun warm | Sandbox 1 mid at noon and at 8° of sun | none |
| R5 | **Three kinds of blade, and seed heads** | the meadow's edge against the sky is soft and mixed, not a comb | mid view beside a meadow close-up | about 20 thousand triangles |
| R6 | **Leaves that take the light** | a crown against a low sun glows yellow-green; leaves sheen at noon | the 8° shot beside `evening_field` | fill only |
| R7 | **Far trees lit like near ones** (needs P2) | far crowns have a sunlit and a shaded side that match the near trees at the same hour, no block or speck where they take over | far view at noon and golden hour; the world shown no later | two pages of memory; no load cost under P2 |
| R8 | **The understorey to 80 m** (needs P2) | no bare band between trunks from 30 to 80 m | Sandbox 1 mid | 2 triangles a shrub |
| R9 | **The ground keeps its detail far off, and grass does not end** | no line where the blades stop at 70 m | far view's foreground | fill only |
| R10 | **Dapple far into the wood** | shade under distant woods | far view | one target |
| R11 | **Glass that is glass** | the domes mirror the sky, no moiré | Sandbox 1 near | none |
| R12 | **Clouds with a sun side** (after c929d52c) | soft cumulus with bright edges at every hour | sky pictures beside `autumn_meadow`'s sky | fill only |

R1 to R4 need nothing but numbers and one material and can follow tonight's five at once. R7 and R8, the two that
change the forest most, are bought by P2; a third cascade or longer shade by P4; denser grass or forest by P3's
triangles.

## 6. The order

1. **This intent's first step: every world's budget, held on every pull request** (P7), with the patterns written in
   play/SPEC.md.
2. *The six trees declare their levels* (P1): play's work on six assets and Sandbox 1's layout.
3. *R1 to R4*: the realism that costs nothing.
4. *The hand-built village draws by levels and casts by stand-ins* (P3, P4): the largest room in every frame.
5. *A version's shapes and pictures are made once, at Accept, and downloaded* (P2): the 10 s first visit.
6. *R5 to R12*, each as its room is there.
7. *One stream and one renderer a page, Sandbox 3 on the kit* (P5).
8. *The budget at the content door*: a layout or an asset version a world pins is measured before its Accept (P7).

## 7. What is still an estimate

- The frame's aim in the box's units (1.5 M triangles, 600 draws, 2,500 calls): from six points on the Mac before
  416c555c; to be corrected by 0356b0ea's real-GPU rounds.
- No real-GPU frame time of main exists yet (0356b0ea's round 0 is under way).
- Seconds and memory are not split by part beyond builds, levels and the holders 1893a631 named: placing, the domes'
  building on the main thread and the ground's maps have no number of their own.
- The wire weights are an upper bound (indices not ordered for the codec; no bytes for the far pictures' pages).
- The census's build seconds are Bun's with four at once; a browser's are 7a6c3f1b's 150 s.
- A picture of production on a real GPU was read from the Mac's WebKit shots only; none was taken tonight.

## Taken from the frame's builder (intent 0356b0ea, `play/site/scripts/census/FRAME-LOG.md` on its branch, round 1)

The box's CPU profile of Sandbox 1 near agrees with the split by part: of the scene pass's 1,688 draws the instanced
asset renderers are 200, the crowds 613 and the domes' insides about 720; of a walking frame's JavaScript three's own
work per draw is about 78 %, the sun's shadows 13 %, the asset renderer's loop 8 %. So the page's time, too, is in what
is drawn one by one, not in the plants. No frame time of main on a real GPU is in its log yet.

## The spec

Filed on the intent at 23:57 UTC (stage Specify, waiting for Samuel's approval): the budget as the first step (ten
checks, each command tried once in the box: the gate green in 165 s on main, the new ones red until built), the seven
patterns, and the order of what follows with the realism programme R1 to R12.

## Files

- `out/parts.json`, `out/box/parts-*.txt`: every view's main and shadow triangles and draws by part
  (`tools/census-parts.diff` applied to the census, `CENSUS_DEBUG=1`; `tools/parts.py`).
- `out/box/census-*.txt`, `census-*.json.gz`: the census of each world, every copy with its level (`--live --copies`).
- `out/box/frame-*.json`: the WebGPU calls a frame makes, standing and walking, call by call.
- `out/kept-builds.jsonl`: every build weighed; `out/wire.jsonl`: each quantized and packed.
- `reports/code-map.md`, `reports/realism.md`.
