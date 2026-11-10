# Architectural map: Sandbox 1, 5, 3 (play/site, HEAD eadbf2f7). Read-only; nothing changed.

Paths are relative to `/home/user/maiacity/play/site/src/lib/content/` unless absolute. Line numbers are exact where I read them and approximate (±5) inside `village.ts`.

## 0. Who shares what

- **Sandbox 1 and 5 are one page and one world function.** Both routes (`src/routes/sandbox-1/+page.svelte`, `sandbox-5/+page.svelte`) mount `sandbox-2/interior/DomeCellPage.svelte`, which calls `mountVillage` (`sandbox-2/interior/village.ts:115`). Both load **Sandbox 1's** catalog and `garden` config (`DomeCellPage.svelte:82-86`, `sandbox5.js:30,53`).
- **Sandbox 5's only difference** is `solo = { asset: 'cac16350-…', gates: [π, π/2, -π/2, 0] }`. `opts.sandbox` is `'sandbox-5'` for both.
- **Sandbox 3 takes its own path**: `maiacity-v2/world.js` `createWorld` (3,925 lines), with its own canvas, camera, loop and scatter. It shares only the sky, `worldRenderer`/`worldFinish`, the asset renderer and the box pool.

## 1. Placing assets

**Sandbox 1 and 5 (`village.ts`)**
- **Scatter**: seeded on the page at load, on the main thread. Jittered grids over ±`WORLD = 380` m (`:74`), with `seeded(505)` for the cell, `seeded(616)` for Sandbox 5's ring, `seeded(99)` for floor objects (`plantGarden` ~`:806-975`).
- **Spacing and species come from the DB config** `garden`, not from code. The pinned census copy (`scripts/census/inputs/b3beecfee98e29e639ef.json.gz`) holds:
  - `spacing` (m² per plant): canopy 26, trees 24, shrubs 5, climbers 30, herbs 3.2, roots 12, ground 2.6, fungi 70.
  - `drift`: least 5, most 15; gap shrubs 1.1, climbers 0.9, herbs 0.5, roots 0.45, ground 0.38, fungi 0.3.
  - `fields`: oats ×4, lentil ×3, chickpea ×3, edamame ×3, hemp ×3, bamboo ×3; sizes 4×5 to 9×10 m; row 0.24–2.6, gap 0.2–2.4.
  - Outside: 78 species (158 species×stage); inside: 31 species (103).
- **Hard-coded scatter numbers**: tree keep-out 2.8/2.2 m (canopy), 1.4/1 m (fruit); climber on 20 % of fruit trees; tree scale 0.9–1.15; drift on a sunflower spiral (2.39996 rad); 75 % of a drift at one stage; yields every 6,000 points.
- **Copy counts**: not in code. My estimate from the hexagon's ~375,000 m² and the spacings is an upper bound of ~14k canopy, ~16k trees, ~75k shrubs, ~117k herbs, ~144k ground, before exclusions. `__forest.plants()` gives the real count.
- **Kept as**: per kind, a `Stand` with packed Float32Arrays x/y/z/turn/scale (`flora.js:174-196`). Small plants are filed in an **8 m cell hash** (`CELL = 8`, `flora.js:46`); trees are a flat list.
- **Streaming**: every tree is placed at load and drawn at any distance. Small plants are placed within `STREAMS.village = { shrub: 26, cover: 13 }` m (inside: 40/22; `flora.js:23`), re-evaluated when the eye has moved ≥ 2 m (`flora.js:218`).
- **In the asset renderer** (`assets/render/index.js`): per kind, flat typed arrays (M 16, T, S, alive, was, C 4, K 3 floats per copy; `:208-222`). Each level is drawn as `InstancedMesh`es with `frustumCulled = false`, starting at capacity 16 and doubling (`meshOf :498`, `room :565`).
- **No spatial structure in the renderer.** `update()` (`:895-1000`) visits every alive copy of every kind, does a frustum-sphere test and `choose`, and rewrites all instance buffers. It is skipped only when the camera matrices are unchanged and nothing is dirty (`:903`).
- **Legacy tiles** (`TILE = 70`, `NEAR = 72`, ground tiles visible < 50 m; `:999,1200,1215`) carry only the non-moss forest-floor objects in these two worlds: 60 % of a jittered grid at 1 per 38 m² within `INNER = 238`.
- **Other**: 48 ant hills, 16 hive clusters of 3–4, 160 songbirds, goats 12×5, sheep 3×8, 10 fish per pond; path lights every 9th path point as 2 InstancedMeshes.
- **Sandbox 5 extras**: no 13 domes; one building via `loadAsset(newestOf(asset))` (`:147-148`) put in the scene as its own Object3D tree. Its `use:` nodes are drawn by `createPlantings` (`assets/plantings.js`). A ring round it is planted at `S.trees / 2`.

**Sandbox 3 (`maiacity-v2/world.js`)**
- **Content**: 49 hexes (7 villages × 7), `HEX_R = 114.75`, `K = 1.5`. A steppe with a highway, a track, a bus stop, a gas station, a shed, tents, a pickup and a van.
- **Scatter**: seeded `rng(n)` at load into plain `InstancedMesh`es (`steppe() :356`): tussocks 13,500 and 6,750, shrubs 2,025, stones 1,125, 70 trees (trunk + crown), 160 road patches, ≤ 76 bushes of 2–4 balls in 3 meshes, 8,400 tall-grass cones (`tallGrass :483`).
- **Library assets**: 21 slots (`maiacity-v2/things.js:12-34`), mostly `drawn.load` (the build placed as its own tree, no LOD or instancing); plants and stakes via `drawn.follow`. The route calls `world.trees([])`, so no trees are planted.
- **Spatial structure**: none.

## 2. Loading and building

- **Path**: `use(ref)` → `loadAsset` (`assets/load.js:150`) → OPFS cache hit (`cache/builds.js`), else `poolOf(engine).build` (`box/pool.js:109`) → `AssetBox` (iframe shell + worker per recipe, `box/host.js`) → plain data → `rebuild` (`box/rebuild.js`) → `prepare` (`render/prepare.js`: welded per material, repeated parts as `locals`).
- **Pool**: one per engine per page, shared by all renderers. Size is `budget().builds` = `clamp(cores − 1, 2, 8)` desktop, 2 small (`render/budget.js:59-60`). Pool boxes have `rooms: 1`; `ROOMS = 4` (`host.js:18`).
- **Turns**: `buildTurn()` is shared with the simplify workers. Reads from cache run `READS` at a time: 16 desktop, 4 small.
- **Limits**: job timeout 20,000 ms (`kernel/sandbox/policy.js:28`). Box `BUDGET` (`rebuild.js:32`): tris 2,000,000, vertices 4,000,000, nodes and geometries 20,000, instances 100,000, textures 2,000, images 64, texturePixels 4096, lights 64, bones 1024.
- **Device cache**: OPFS folder `asset-cache`, `LIMIT = 512 MB`, LRU by `used.json` (`cache/store.js:12`). Writes wait for quiet: 2,000 ms, latest 20,000 ms (small: 300/2,000; `:201-202`).
- **Transferred vs copied**:
  - Box worker → page: transferred (`policy.js:56`).
  - Page → simplify worker: structured-clone copy, no transfer list (`lower.js:117`).
  - Simplify worker → page: transferred (`simplify.worker.js:21`).
  - A build shared by several askers: copied (`copyOf`, `load.js:88`).
- **"World shown" waits for** (`village.ts`, in order):
  1. Catalog and config; `stage.ready`.
  2. Sandbox 5 only: the dome build, then a CPU distance field (`solo.js groundOf`: cell 0.25 m, reach = building reach + 8).
  3. Paths, water and domes; the scatter; `plantGarden()`.
  4. `forest.grown()`: every kind's coarsest level built, precompiled and photographed (`:1136`).
  5. The ground map bake; `library.ready()` (`:1578`).
  6. A loop of up to **120,000 ms**, polling every 100 ms, until `plantsOut`, `plantsIn` and `library` all report `building === 0` (queue + loads + compiling + lowering; `:1582-1590`).
  7. `onProgress('ready')`, then `tick()`. The cover fades over 1,100 ms (`sandbox-kit/WorldPage.svelte`).
- **Sandbox 3**: `world.ready` = `made.then(() => drawn.ready())` (`world.js:3899`).

## 3. Levels of detail

**Declared constants (`assets/render/lod.js`)**

| Name | Value | Line |
|---|---|---|
| `LEVELS` | [1.2, 0.56, 0.22] (ball diameter / view height) | 20 |
| `HEAVY` | 20000 | 27 |
| `PICTURE` | 0.04 | 28 |
| `BAND` | 0.3 | 30 |
| `HOLD` | 0.06 | 32 |
| `SMALLEST` | 0.002 | 34 |
| `SCREEN` | 1080 | 37 |
| `BUDGETS` | L0 {1, 0, 0}; L1 {share 0.3, floor 1000, px 2}; L2 {share 0.08, floor 300, px 2} | 66-70 |
| `STRETCH` | 4 | 71 |
| `DENSITY` | 0.2 triangles per pixel | 105 |

**Derived**
- Ceiling `(LEVELS[L] × 1080)²`: 365,783 for L1, 56,454 for L2 (`budgetOf :78`).
- `errorOf`, `smallestOf`, `heldTo` (threshold raised to `sqrt(tris / 0.2) / 1080`), `thresholdsOf` (last threshold × `sqrt(tris / HEAVY)`, floor `PICTURE`).

**Which builds make the levels (`assets/lodcard.js`)**
- Legacy plants taking `detail` are "declared, old": **two shape levels**, built at detail 0.25 and 0.1 (`OLD_DETAILS :21`), thresholds [0.56, 0.22], then the picture.
- A card with its own `lod` declares up to 3 levels.
- Everything else is derived: L1 and L2 are simplified from L0.
- The coarsest is built first. Derived levels are requested straight after the base (`index.js:263`); a finer declared level only when a copy wants it (`draw :860`).

**Simplifier (`assets/render/simplify.js`, 1,082 lines)**
- meshoptimizer `simplifyWithAttributes`, absolute error.
- Passes `[1, []]`, `[1, ['Permissive']]`, `[STRETCH, ['Permissive']]` (`:558`).
- Weights: normal 0.5, color 0.25, uv 0.02; `SHADED = 4`; `EDGED = 0.01`; `TINY = 24`; `KEEP = 3` px; `BOX = 12`; `OVER = 1.05`; crease 50°.
- Never-seen culling `SEEN = { px: 384, sides: 42 }`; outline check `LOOK = { sides: 10, px: 512, more: 0.01, most: 0.03 }`.
- Runs in `simplify.worker.js`, one worker per concurrent job, gated by `buildTurn`. Results are kept in OPFS by key (`render/levels.js`).

**Impostors (`assets/render/impostors.js`)**
- `FRAMES = 8` sides, orthographic, 4× MSAA shot target.
- Desktop: 128 px on 2048² pages (16×16 cells, 32 kinds per page). Small: 80 px on 1280² pages.
- Page mipmapped, anisotropy 4. One upright card (2 triangles) per copy, one draw per page; casts shadow through a custom depth material.
- Taken when the coarsest level arrives, during load (`index.js show :406`).
- **On WebGPU `read()` returns null** (`impostors.js:219`), so pictures are never kept and are retaken every visit.
- **Each `createAssets` has its own pages, studio, presets, lowering workers and wind nodes.**

**Per copy, per frame** (`index.js:930-965`)
- `size = radius·scale / (distance · tanHalf)`; `choose(size, thresholds, was)`.
- A fade (`aFade` dither) draws the next coarser level under it across the band.
- Kinds that "cast alike" cast shadows only by their coarsest ready level (`castCoarse :527`).
- Eviction of unused levels: never on desktop, 15,000 ms on small, swept every 2,000 ms.

## 4. Plants specifically

- **Growth stage** is a build parameter (`?stage=N&seed=…`, `flora.js:34`): every stage is a separate kind and build. `stageOf` biases toward later stages (`pow(r, 0.8)`).
- **Detail parameter**: 0.25 and 0.1 only; never detail 1.
- **Shadows**: trees use `shadows = true, picture = true`; shrubs and cover use false/false (`flora.js:153-154`) and are removed past `far = min(STREAMS[r], radius / (lastThreshold · tanHalf))` (`drawn.js:69`).
- **Picking**: a CPU ray against cylinders, then real triangles of up to 40 candidates, far 45 m (`flora.js:289,324`).
- **Plant card**: `PlantLook.svelte:34` makes a second renderer and canvas (`createStageRenderer`, fov 32) while a card is open.

## 5. Grass and ground cover

**Blades (`render/nodes/grass-compute.js`, `biomes/grass.js`, `biomes/grass-gpu.js`)**
- WebGPU only: per frame, three compute passes (reset counts, trample, choose) and three indexed indirect draws.
- `CELL = 2` m; blade vertices `VERTS = [15, 7, 4]`.
- `DEVICES` (`grass.js:69`), with the GPU override (`grass-gpu.js:361`):

| | Desktop | Small |
|---|---|---|
| Density (blades/m² at the eye) | 700 | 400 (260 on the fallback) |
| Bands (m) | [8, 25, 70] | [5, 15, 35] |
| `near` | 4 (2.5 on the fallback) | 3 (1.9 on the fallback) |
| `stands` | 3 | 6 |
| `falloff` | 2 | 2 |
| `minPx` | 1.5 | 1.5 |
| Candidates per cell | 2,800 | 1,600 |
| Max cells | 5,329 | 1,521 |
| Capacity per level (my computation) | [100,800, 100,608, 91,328] = 292,736 | 83,136 total |

- One compute thread per candidate of every visible cell that has grass.
- **Mask**: a CPU `DataTexture` 256² RGBA half-float, texel `max(0.6, (2·70 + 16) / 256)` ≈ 0.61 m. It is **recomputed on the CPU as you walk**, 6,000 texels per frame, each calling the world's `at()` (floorOpen, nearPath, groundY; `grass.js:526`, `village.ts:1035`).
- **Cell list**: rebuilt on the CPU every frame (`cellsAround`).
- **Trample map**: 256² floats over 48 m, recover 10 s; `PUSHERS = 8`.
- **Defaults** (`GRASS`): height 0.24, tall 0.5, width 0.006, clump 1.2.
- The fallback is instanced tiles (`TILE_CELLS = [1, 4, 8]`).

**Cover (`biomes/stream.js`)**
- Village: tile 10, reach 28, near 7, thin 0.2, 1 tile per frame, seed 505 (`village.ts:998`). Built out to reach + 7.5 m, about 57 tiles.
- Laid on the CPU (`layTile`) at the biome's density (repo defaults 7–10 per m², `biomes/index.js:71-116`; the live value is the vault's).
- Each plant is a copy in the **library** asset renderer, so that renderer's flat per-frame loop covers tens of thousands of copies.
- Growing and sinking is in the vertex shader (`aCover`, `aReach`, `coverGrow`, `render/nodes/index.js:59`).
- Dome insides and plantings floors: tile 8, reach 24, near 9, thin 0.25.

**Ground shader (`render/nodes/ground.js`)**
- 9 surfaces × 3 maps (albedo, normal, ar) as three KTX2 `CompressedArrayTexture`s. Albedo 2048 (1024 small), the others 1024. Anisotropy 8; transcoder worker limit 2 (`render/arrays.js`).
- Per pixel: a loop over the 9 surfaces to pick the top 3; hex tiling under 40 m; two reads from 40–250 m; the mean beyond (blend 120–250); macro noise at 5/20/80 m; a detail normal to 35 m.
- Not regenerated on walking.
- **Sandbox 1**: relief mesh on a 2.5 m grid over ±380 m (305² vertices; `relief.ts`). A ground map of 380² RGBA8 (2 m texels) is baked once on the CPU (`village.ts:1157-1166`).
- **Sandbox 5**: flat `ShapeGeometry(hex, 48)` with a hole, **no relief and no ground map** (`:269, 1157`).
- A meadow ring from 304 to 3,000 m.
- **Sandbox 3**: flat `CircleGeometry(6400, 64)` and coloured hex tiles; no biome shader, no blade grass.

## 6. Wind (`render/wind.js`)

- Entirely in the vertex shader: uniforms (`CALM`: direction 0.35, strength 0.45, gust 0.55, scale 34 m, speed 7 m/s; `SWAY = 1.4`) plus a per-instance `aWind` (foot xyz, height).
- Flutter fades between 12 and 15 m.
- Per frame the CPU does only `wind.tick(worldSeconds())`. `aWind` is rewritten whenever the renderer refills its instance buffers (`index.js:885`).
- **Each asset renderer and each grass field creates its own `windNodes`.**

## 7. Sky and clouds (`sandbox-kit/sky.js`, `universe.js`)

- **Dome**: a `BoxGeometry` at the camera scaled to far × 0.5. Per pixel: Preetham scattering, the sun disc, clouds as **4 octaves** of value noise (`Loop(4)`, `universe.js:193`) plus 1 coverage sample, the moon and the Milky Way.
- **Stars**: 6,000 instanced quads (2,600 + 3,400).
- **Environment**: a second cloudless, disc-less universe rendered to a **128² half-float cube** (`sky.js:243`). Re-baked when the sun has moved ≥ 0.5° (`rebake :213`); `set()` runs at most once per 1,000 ms.
- The game clock runs at `SPEED = 30`, so my estimate is a re-bake roughly every 5 s of real time, each also forcing a shadow redraw.
- **Haze**: `FogExp2` with density `1.6 / far` (far 1,400 default; 2,200 in Sandbox 3); colour from a 16-sample horizon ring.

## 8. Light, shadows, post

- **Lights**:
  - Sandbox 1: one `SunLight` plus 8 unshadowed `PointLight`s (distance 10, decay 2; `village.ts:1369`).
  - Sandbox 5: sun only (pool 0), plus any lights inside the dome build.
  - Sandbox 3: sun plus tent lanterns.
- **Shadows**: 2 cascades, each `min(2048, budget.shadowMap / 2)` = 2048 desktop, 1024 small. Reach 300 m (Sandbox 3: 450). Bias −0.0004, normal 0.04. PCF.
- **Shadow updates** (`autoUpdate = false`): redrawn when
  - the eye has moved > 2 m or turned > 0.035 rad (`sky.js:276`);
  - the sky re-bakes;
  - on the 400 ms tick, `castBySize` changed something (`SMALL = 20/1080`, hold 1.1) or a renderer flagged stale;
  - an animal walks within 20 m (at most once per second).
- **Casters**: trees at their coarsest level; pictures; domes. Not small plants, cover or grass. In Sandbox 5, meshes whose top is below 0.12 m do not cast (`:178`).
- **Post (`render/finish.js`, `post.js`)**:

| Pass | Desktop | Small |
|---|---|---|
| Scene pass | half-float; MRT output + normal + velocity | at 0.7 scale |
| Ambient occlusion | SSAO at 0.5 scale, radius 0.6, intensity 1, denoised, reading the previous frame | none |
| Contact shadows | SSS at 0.5 scale, maxDistance 0.2, thickness 0.02, intensity 0.5, box-blurred | none |
| Anti-aliasing | TRAA | TAAU |
| Bloom | threshold 1.0, strength 0.15, radius 0.4 | none |
| Grade | LUT 16³, vig 0.12, grain 0.012, sat 1.02, lut 0.35 | same |
| Fog reach | 1 | 0.7 |

  - Film and the WebGL2 fallback use MSAA 4.
  - Cost table `COST` (ms at 1440×900): ssao 0.5, denoise 0.15, traa 0.3, taau 0.4, bloom 0.3, contact 0.25, grade 0.08.
- **Tone mapping**: `PICTURE = 'neutral'` (Khronos Neutral, `render/core.js:36`); several comments still say AgX.
- **Pixel ratio**: capped at 1.25 for Sandbox 1 and 5 (`render/world.js:46`). Adaptive in 0.1 steps down to 1 below 40 fps, up above 56 fps, checked every 1.5 s. Sandbox 3 is capped at 1.5 with no `adapt`.
- The canvas is created with `antialias: true` although the pipeline renders into its own targets.

## 9. Buildings and domes; "three renderers"

- **The three** are three `createAssets` instances on one WebGPU renderer and scene (`village.ts:202, 203, 210`):
  - `plantsOut`, the cell's forest;
  - `plantsIn`, the domes' insides (`STREAMS.inside`);
  - `library`, things, coops, playgrounds and all floor cover.
- They are separate because `createFlora` binds one stream reach per instance and the census reports them as out / in / library.
- **Sandbox 5 adds a fourth** (`plantings.js:115`) and, per `biome:` floor mesh, its own `coverStream` and its own `grassFieldOn` compute field (`:193, 214`), ticked on `performance.now()` rather than world time.
- **Sandbox 1's domes**: 13 (master 136 m; 6 "large" 70 m at radius 150; 6 "home" 40 m at radius 200; `:79-87`). Shells are hand-built geometry (`interior.ts geodesic`) with a simple inside.
- **Full insides** are built on the main thread in time slices of 70 / 24 / 7 ms (`interior.ts:794`) through `sandbox-kit/stream.js`: budget `KEEP = 1 + 5·(70/136)² ≈ 2.32` master-areas, `far = SHOW_NEAREST = 50`, shown within `SHOW_WITHIN = 22`, one at a time, `ahead: true`, retry 10 s.
- **No portals or render-to-texture.** Insides live in the same scene and are swapped by visibility. Doors are 4 bearings with `DOOR_HALF = 1.1`.
- **Sandbox 5's dome**: a single box build with `matrixAutoUpdate = false`, glass `forceSinglePass`, walked via `hero.js walkOf(obj, { still: true })`.

## 10. Walker and main loop

- **Walker** (`sandbox-kit/walker.js`): eye 1.65 m; walk 6.45 m/s, hurry 14.6 m/s; stride 0.25 m. Each stride calls `floorAt` twice and `canStand` once, plus up to 8 retries turning 25/50/75/90°.
- **Collision**: an 8 m cell hash of circles (`sandbox-kit/obstacles.js`), dome analytic tests, or the Sandbox 5 building's triangle grid.
- **Camera**: fov 68, near 0.1, far 2,400.
- **Per frame** (`village.ts` tick, ~`:1531-1575`), in order:
  1. `walker.update`
  2. `animated[]` (birds, herds, fish, ants, water)
  3. `sky.tick`
  4. Every 400 ms: herd shadows, `castBySize` (a whole-scene traverse), `levelOfDetail` (forest tick and tile visibility), `manageDomes`, `lightNearest`, sound
  5. Shown domes' `update`
  6. `forestTick` (`forest.update`, `plantsOut.update`, `plantsIn.update`)
  7. `floorCover.update`
  8. `grass.update`
  9. `library.update`
  10. `plantings.update` (Sandbox 5)
  11. `finish.render`
  12. `stage.adapt`
- **Sandbox 3**: `frameOf` (`world.js:3718`) runs story and roam logic, `controls.update`, `drawn.update`, `finish.render`. Camera fov 42, far 6,400, OrbitControls.

## (b) Per-world special cases

- `solo` branches throughout `village.ts`: no relief, no ground map, no point-light pool, hex ground at y −0.03, `inBand` ring planting, a start point 18 m off the gate.
- Sandbox 3: `exposure: 0.7`, `shadowReach: 450`, fog 2,200, clock pinned at 12, `maxPixelRatio 1.5`, its own `maiacity-v2/drawn.js`, and no `onShadows` (the renderer sets `needsUpdate` directly).
- A stale comment at `village.ts` ~`:1548` says the sun step is "a quarter of a degree"; the code uses 0.5°.

## (c) Built or uploaded but unseen at start

- Every outside kind's coarsest build and its 8-frame picture, whether or not a copy is near (`flora.js grown`).
- Every tree copy in the whole cell is alive and iterated each frame.
- `plantsIn` kinds and the dome insides built "ahead" (Sandbox 1).
- Derived L1 and L2 for every library kind, straight after its base.
- The legacy `tiles` near/far InstancedMesh groups.
- The 8 PointLights by day.
- The start gate waits for *all* builds, shader compiles and lowering to reach zero (up to 120 s), not only what is in view.
- Pictures are retaken on every WebGPU visit.

## (d) Measuring tools

- **`play/site/scripts/census.ts`** counts on the CPU in Bun, with no GPU.
  - Flags: `--world sandbox-1|sandbox-5|sandbox-3|worlds`, `--view near|mid|far|open|home|all`, `--at <commit>`, `--asset`, `--inputs <dir> | --live`, `--record`, `--json`, `--copies`, `--renderer webgl|webgpu|webgl2`, `--smoke`, `--frame`, `--settle <s>` (180), `--frames <n>` (90).
  - Views (`census/run.ts:24-26`): near (0, 95), mid (0, 235), far (0, 370), at 1440×900.
  - Output per view: triangles per frame (main and shadow), draws, culled, and per asset renderer its triangles, draws, copies, pictures and ghosts.
  - `--frame` (`census/frame.ts`) counts WebGPU calls, buffer writes and bytes, at rest and walking.
- **Helpers in `scripts/census/`**: `same.ts` (determinism, `--runs 5`), `settle.ts` (cold vs warm, `--ratio 0.25 --max 30`), `match.ts` (against the Mac's `run5.json`, within 1 %), `cores.ts` (`--kinds 48 --busy 2 --most 95%`), `frame-bound.ts`, `film.ts`, `timed.ts`, `cards.ts`, `viewer.ts`, `refs.ts`, `own-versions.ts`, `kept.ts` (answer cache).
- **`play/site/scripts/gpu.ts`** runs real Chromium and WebKit on the built site with pinned `/api`.
  - Flags: `--world <route>`, `--browser`, `--out`, `--world-within <s>`, `--frame-within <ms>` (mean over 10 s), `--settle` (60), `--timeout` (600), `--inputs`, `--software`, `--record`, `--steps`.
  - Writes `gpu.json` and `<browser>.png`.
- **`play/avenbox/vs-main.ts`**: subcommands `census | frame | bytes | lines | count`, with `--within N%` or `--down N%` (per-key allowed).
  - `--of` for census: tris, draws, mainTris, mainDraws. For frame: calls, writes, bytes, draws, scenePasses and their `walk*` forms.
  - Also `--main`, `--main-only`, `--side`, `--out`, `compare`, `--main-of`, `--key-of`, `--fold`.
- **`render/meter.js`**: `installMeter(window)`, then `sample(seconds)` returns `{ frames, frame_ms, frame_p95, cpu_ms, gpu_ms, calls, triangles, bound }` (bound is vsync, cpu or gpu). Also `meterLine` and `drawingsOf(scene, root, top = 12)`.
- **`.github/workflows/intents-pr.yml` `workflow_dispatch` inputs**: `pr` (number, required; a dry run that records nothing) and `intent` (string, optional; another intent's UUID whose spec runs on that head).

## Not found

- Real copy counts and the live garden or biome densities: these are DB data; only the pinned census copy was read.
- Light count inside the forest dome build.
- BatchedMesh, BVH or chunk structures: none are used.
- Per-pass render-target formats beyond half-float for the scene pass.
- SPEC.md was not re-read.