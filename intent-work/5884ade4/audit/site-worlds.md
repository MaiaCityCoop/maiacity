# Untangle audit — site-worlds (intent 5884ade4, read only)

Area: `play/site/src/lib/content/sandbox-2` (interior/, mostly HELD), `play/site/src/lib/sandbox-2` (+tests),
`play/site/src/lib/sandbox-4`, `content/factories`, `content/maiacity-v2`, `content/worlds`, `content/sandbox-kit`,
`content/biomes` (HELD), and the routes that mount them (`routes/sandbox-1..5`, `routes/factories`, `routes/worlds`),
plus `scripts/census/run.ts` where it copies a route. All paths below are under `play/site/` unless they start
with `play/`.

HELD files in this area (held.txt): interior/{PlantLook.svelte, animals.ts, drawn.js, interior.ts, plants.ts,
textures.ts, things.js, village.ts, water.ts} (held.txt also lists interior/cover.js, which does not exist),
factories/{app.js, look.js, three.js}, maiacity-v2/world.js, sandbox-kit/{sky.js, sky.test.js},
worlds/{lights.js, view.js}, lib/sandbox-2/main.ts, lib/sandbox-4/scene.ts, every file of content/biomes, and next to
the area play/SPEC.md, stories/live-runtime.ts, scripts/census.ts, census/{census.test.ts, setup.ts, counting.js}.

## What pins each world today (for "render identically")

| World | Mounted by | Tests / census that pin it |
|---|---|---|
| Sandbox 1 (village.ts + interior.ts as host, flora) | routes/sandbox-1, census run.ts `mountSandbox1` | census `--world sandbox-1` views near/mid/far (census.test.ts:162, triangle and draw counts, not pixels); nothing else |
| Sandbox 5 (village.ts `solo`) | routes/sandbox-5 | interior/solo.test.ts (`groundOf` only); census does not count it |
| Sandbox 3 (maiacity-v2/world.js) | routes/sandbox-3, census `mountSandbox3` | census `--world sandbox-3` view `open` (census.test.ts:197) |
| Worlds (worlds/view.js) | routes/worlds, worlds/bench, IntentDetail/IntentsBoard | census `--world worlds` `open` (census.test.ts:205); worlds.test.ts (contract, film, test world) |
| Sandbox 2 lab | routes/sandbox-2 → Lab.svelte → main.ts | 24 files in lib/sandbox-2/tests (physics and builds; nothing pins the drawing) |
| Sandbox 4 joint | routes/sandbox-4 → Joint.svelte → scene.ts | none |
| Factories | routes/factories → app.js | factories/lifetrac.test.ts (lineOf and the simulation's numbers; nothing pins the drawing) |
| Shared | sky.js, biomes | sky.test.js; biomes.test.ts, stream.test.ts, masks.test.ts, surfaces.test.js |

Census counts triangles and draw calls, not pixels. A refactor that must "draw the same" should be checked with
`scripts/census.ts --world sandbox-1|sandbox-3|worlds` JSON before and after (equal `tris`/`calls` for each view),
plus stills from `scripts/selector-shots.mjs` for Sandbox 1. Sandbox 2, 4, 5 and the Factories have no automated
check of what they draw.

---

## Problems

### Hidden links (must change together, the code does not say so)

**1. Sandbox 1 and Sandbox 5 are one page copied.** routes/sandbox-1/+page.svelte (297 lines) and
routes/sandbox-5/+page.svelte (296) differ in 45 lines (title, cover, `solo`, notice). The plant-pick card logic
(sandbox-1:37-44 = sandbox-5:40-47), the mount (sandbox-1:64-66 = sandbox-5:67-69) and the whole template are the same.

**2. The census copies each route's mount by hand.** scripts/census/run.ts:123-133 `mountSandbox1` repeats
routes/sandbox-1:64-66 (catalogReady, mountVillage, sandbox5()); run.ts:136-152 `mountSandbox3` repeats the
`STAGE` literal of routes/sandbox-3/+page.svelte:31-35 and its six calls (route 47-53: set, touring, reveal, trees,
focus, freeWalk). Change the page and the census counts a world nobody opens.

**3. The pin ref `pin:<sandbox>/<slot>[?values]` is spelled by hand five times**, while catalog.js:105 `assetIn`
(the builder) has no caller: interior/things.js:25 (HELD), interior/legacy.js:57, factories/pallet.js:10,
maiacity-v2/things.js:16, maiacity-v2/plants.js:41 (and play/api/import/factories/lifetrac-line/line.js:54). The
query join `x.includes('?') ? '&' : '?'` is copied in interior/flora.js:63 (`refOf`) and catalog.js:126.

**4. A sandbox's config path `configs/<uuid>/<name>` is built by hand**: catalog.js:123, sandbox-4/scene.ts:524
(HELD), interior/sandbox5.js:47 (`GARDEN`); written by game/code/index.js:38. sandbox-4 reads its pins config raw and
calls `parseBuild` itself (scene.ts:524-527) instead of `resolve('pin:<four>/element')`, skipping the catalog's
check that a name is a build or a slot. play/SPEC.md §5 says Sandbox 4 has "no pins and no configs"; the code
reads a pin `element`.

**5. `catalogReady` is copied without its check.** recipes.ts:6-10 throws when the catalog is not ready;
sandbox-4/scene.ts:523 (HELD) and factories/assets.js:31 copy `Promise.all([loadRecipes(), loadConfig(id)])` and drop
the check.

**6. Two worlds read the catalog's record fields to find an asset's versions, each by its own rule.**
interior/village.ts:102-108 `newestOf` (HELD: `!proposed && (!variant || first)`, highest `v`) and
sandbox-4/scene.ts:536-539 (HELD: `!proposed`, same `v`) walk `INDEX.recipes`. census run.ts:174 has a third rule
(`versions[0]`, `defaultVariant`). "The accepted versions of an asset" belongs to catalog.js.

**7. The frame loop and the film hold are copied between the two dome mounts.** village.ts tick (about 1500-1560)
with `connectFilm` at 1576-1660 and interior.ts tick 2611-2655 with `connectFilm` at 2660-2700 (both HELD) repeat
`walker.update`, `animated(t)` on `worldTime() ?? clock`, `sky.tick`, `filmDraws()`/render,
`stage.adapt(now, filmHoldsSize())`, and `connectFilm({ renderer, scene, camera, hold: walker, sky, place, animate,
advance, lights: { glow, lamps } })`. Interior's copy is dead (problem 27).

**8. Film and clock state travel through window globals with no owner.** `__interiorHour`, `__exposure` and
`__worldTime` are read in sandbox-kit/sky.js:208-224 (HELD) and render/film.js:15-25, and written by census
run.ts:125, scripts/selector-shots.mjs:82 and the film tools. `__prof` is written by interior.ts:781 and read by
village.ts (film `stage` warning). There are 26 distinct `window.__*` names in the area (village.ts: `__walker`,
`__assets`, `__birds`, `__forest`, `__fields`, `__village`; interior.ts: `__interior`, `__interiorLight`,
`__buildLog`; factory.ts `__factoryStations`; ambience.ts `__ambience`; factories/app.js `__film`; …).

**9. Two film contracts, and films name worlds by legacy slugs.** Sandboxes and worlds are filmed through
sandbox-kit/film.js `connectFilm` (`window.__world`); the Factories through AirSup's `globalThis.__film`
(factories/app.js:353, HELD), so the one film camera cannot shoot a factory. The world names are slugs of the
legacy registry: village.ts:1577 `opts.sandbox ?? 'sandbox-4'` (play's Sandbox 1 films itself as "sandbox-4"),
sandbox5.js:75 `'sandbox-5'`, interior.ts:2661 `'sandbox-3'`, keyed into content/game/places.js, whose routes
(`/app/games/sandbox-4/`, …) do not exist in play. That breaks CLAUDE.md's "a slug or a route is only shown".

**10. The world's sky and a shot's lights are copied between the Worlds page and the live shot.**
worlds/view.js:79 `createSky(renderer, scene, { shadowReach: 500, fog: { far: 1400 } })` equals
stories/live-runtime.ts:154 (both HELD). live-runtime.ts:160-170 scales the sun, environment and lamps by a shot again
in its own way, beside worlds/film.js:52-66.

**11. Asset measures are copied into world code, and the tests that pinned them are gone.**
maiacity-v2/things.js:8-10 says "./things.test.js holds each" to its builder (PICKUP, RAMP, BELL_TENT, TENT_WALK,
FIRE_WALK, …). interior/things.js:12-13 (HELD) says the same of `WALK` and `MIDDLE`. maiacity-v2/plants.js:5-6
names `./plants.test.js` and `./trees.js`. None of these files exists, so a new version of the pickup, tent or a
workshop silently moves the world's layout off it.

**12. A factory's cycle times are worked out twice.** content/factories/index.js `lineOf` (`contentOf`, `noteOf`)
and play/api/import/factories/lifetrac-line/bom.js:752 `contentOf` plus line.js:71-89 `noteOf` do the same sums and
write the same note. The site test lifetrac.test.ts:5 imports `../../../../../api/import/...` across packages to
hold them equal.

**13. The LifeTrac kit works by import side effect.** routes/factories/+page.svelte:139 imports
factories/lifetrac-kit.js only so that `K.def(...)` and `K.shapes.*` (lifetrac-kit.js:43-515) run before `boot`: a
call order the code does not show. Its `lifetrac` shape is a second model of the LifeTrac asset ("drawn from the
same CAD numbers … as its fallback", lifetrac-kit.js:21-24).

**14. Seeded random numbers are copied, though random.js says it is "the one place".** mulberry32 copies:
maiacity-v2/world.js:164 (HELD) and biomes/noise.js:27 (HELD, with a `|| 1` seed). LCG copies: maiacity-v2/van.js:39,
interior/textures.ts:12 (HELD, `|| 1`), interior/factory.ts:1228 and 1412 (inline), assets/seeded.js. random.js's
`seededRandom` and `seededLcg` have no importer. (des.js is AirSup's port and test-world.js a recipe template; both
keep their own on purpose.)

**15. Small geometry helpers are copied to dodge the cycle.** `polar` in interior.ts:209, spaces.ts:40,
factory.ts:67 and rooms.ts:17; `adiff` in interior.ts:77, factory.ts:68 and tent.ts:21; `DOORS` in interior.ts:69 and
factory.ts:62.

**16. Each lab builds the same studio light by hand.** Hemisphere light, one shadowing sun, fog and sometimes a
RoomEnvironment PMREM: lib/sandbox-2/main.ts:113-123 (HELD), sandbox-2/parts-gallery.ts:24-27,
sandbox-4/scene.ts:249-266 (HELD), factories/look.js:87-110 (HELD), interior/PlantLook.svelte:37-40 (HELD).
render/stage.js gives the renderer, camera and controls but no lights.

**17. The lab frame's CSS is copied.** sandbox-4/style.css:1-12 says "laid out as Sandbox 2 is" and repeats
sandbox-2/style.css:6-18 (buttons, primary, focus ring, three columns).

**18. Two ambient-sound engines, and Sandbox 1's sounds are in code.** interior/ambience.ts has a `FILES` table of
11 recordings by hash (ambience.ts:17-30), fetched through the media URL, and its own fading by distance.
worlds/sound.js plays a world's `sound:` nodes from `/api/files/<hash>` with the same panning and fading.

**19. Sandbox 3 builds its own world page.** routes/sandbox-3/+page.svelte:75-94 lays out the canvas, WorldBar,
TouchStick and loading/failed pills that sandbox-kit/WorldPage.svelte provides. WorldPage.svelte:9-10 still says it
is "used by … the tired land".

**20. The lab's scenarios are dispatched by id string in two files.** worker-runtime.ts:57-98 has 10
`scenario.id === …` (a chain of six that picks a definition builder, plus three for `stand-lab`).
lib/sandbox-2/main.ts (HELD) has 29 `config.id` comparisons (136, 221, 225, 244, 277-315) for view scale, camera
height, button noun and arrow scale. A new building means editing worker-runtime, main.ts and the presets.

**21. Sandbox 5's layout is in route code.** routes/sandbox-5/+page.svelte:21-23 holds `FOREST_DOME` (an asset UUID)
and `GATES`, and Sandbox 5 reads Sandbox 1's garden (sandbox5.js:74 `loadConfig(SANDBOX.one)`). By §4.6 a sandbox's
layout is a document changed only by proposal. Sandbox 5's building and gates cannot be changed that way; its
layout document has nothing in it.

### Needless links (tied, but change for different reasons)

**22. Cycle: interior/factory.ts ↔ interior.ts ↔ tent.ts.** factory.ts:28 and tent.ts:9 import only the type
`Mats` from interior.ts (`ReturnType<typeof mats>`, interior.ts:178-206), and interior.ts:31-32 imports
buildFactory and buildTent. HELD (`mats` lives in interior.ts).

**23. Cycle: lib/sandbox-2/geometry.ts ↔ simulation.ts.** geometry.ts:1 imports the types `V3` and `Quaternion` from
simulation.ts, and simulation.ts:2 imports `polyVolume` and `Polyhedron` from geometry.ts. Not held.

**24. interior.ts is a god file (2,735 lines) with seven reasons to change**: dome specs (`DOMES`:56), materials
(`mats`:178), mesh helpers (`box`, `merging`, `bake`:211-340), the shell (`geodesic`:350, `portal`:455), furniture
(`sofa`, `table`, `lantern`:510-555), the glamping interior (634), and a whole world mount (`raiseInterior`
773-2735). It has 55 `kind === '…'` cases that DOMES could carry as traits (shadow updates for the factory at 924-935,
wall and door limits at 2574-2576). village.ts:17 imports 16 names from it. HELD.

**25. maiacity-v2/world.js is a god file (3,822 lines)**: land layout, posing people, the story's moments, the
camera, the film hold and input in one closure. HELD.

**26. Folder and module names follow the legacy numbering.** content/sandbox-2/interior holds play's Sandbox 1 and 5.
sandbox5.js is "play's Sandbox 1" (sandbox5.js:72) and its header still describes the COOP's vault and maia/
paths. `VillageOptions.sandbox` is `'sandbox-4' | 'sandbox-5'` (village.ts:90). lib/sandbox-2 is play's Sandbox 2. To
read any of it you have to know the old numbers.

**27. A stable kit imports an app module for a second version control.** biomes/index.js:21 imports
`$lib/site/app/versions.js` to give the biome recipes written in code (`LIST`) a hand-kept history
(`BIOMES = versioned(LIST, 'cover', {})`, :176), while biomes are assets on play. HELD.

**28. The sandbox-kit barrel is shallow.** sandbox-kit/index.js re-exports 16 names and renames render/world
(`createStage`), but the only names taken through it are `WorldPage` (routes/sandbox-1:16, sandbox-5:15). The
README.md it points to (:22) does not exist.

**29. Library assets are drawn through four adapters.** interior/drawn.js `createDrawn` (HELD) is a pass-through:
use, take, move, give, update, ready and dispose all forward to `createAssets`. maiacity-v2/drawn.js exports a
different `createDrawn` under the same name. Worlds and Sandbox 5's solo use assets/plantings.js, and the factories
use assets.js `tokenOf`. Each sizes its build boxes its own way (interior/drawn.js:73 up to 6, maiacity-v2/drawn.js:41
2-4).

### Surplus (no reason of its own to change)

**30. Dead kit modules.** sandbox-kit/orbit.js (199 lines, `createOrbitRig`) and timeline.js (134 lines,
`createTimeline`) are imported only by the barrel and used nowhere. random.js `seededRandom` and `seededLcg` are
unused. universe.js `celestial` and `createUniverse` are used only by sky.js, yet are re-exported.

**31. maiacity-v2/world.js's story is unreachable** (HELD). These createWorld members (world.js:3764-3790) have no
caller in src or scripts: `intro`, `scene`, `film`, `reel`, `drive`, `station`, `load`, `pitch`, `choose`, `walkTo`,
`walk`, `sticks`, `sow`, `water`, `skip`, `joy`, `update`, `position`, `busy`, `inView`, `stats`. The route and the
census use `set`, `touring`, `reveal`, `trees([])`, `focus`, `freeWalk`, `ready`, `move`, `look`, `board` and
`dispose`. The dead part is about 1,150 lines (intro:1946 … walkTo:3103, filmHold:3712-3763) and keeps imports
alive: game/film/reel.js, game/film/camera.js, sandbox-kit/film poseIn, tour.js `lineDur`, watering.js,
tree-camera.js. §5 says Sandbox 3 strips the intro, tour, film and planting.

**32. maiacity-v2/plants.js's plant table is dead.** `PLANTS` (lines 11-24: 12 plants with their labels and stage
days), `plantOf` and `PLANT_IDS` have no caller. Only `plantRef` is used, and the route plants `trees([])`. tour.js
exists only for `lineDur`.

**33. interior.ts's standalone mode is dead** (HELD). `mountInterior` is called only with `host` (village.ts:1407).
So lines 2560-2735 (walker, frame loop, connectFilm 'sandbox-3', the handle) and 16 `!host`/`host ?` branches (own
stage 817, own sky 924, own lamp pool 852, path lights 1042, …) never run.

**34. The stand-in plant branch is dead** (HELD). The routes and the census always pass `flora` (sandbox5()). Still
there: 17 `flora ?`/`!flora` branches in village.ts (196-197, 255, 262, 536-538, 668, 710, 749, 759, 765, 985, 1022,
1076, 1098, 1407) and 15 in interior.ts, the stand-ins plants.ts builds only for legacy.js `swapLegacy` to trade
away, and `VillageOptions` without flora.

**35. sandbox5.js has dead parts.** `kindsOf` has no caller. `TIERS.near` and `TIERS.mid` are unused; only
`TIERS.look` is read, by PlantLook. Its header describes the legacy vault.

**36. Exports used only in their own file**: spaces.ts `bistro`, `cowork`, `parasol`; interior/things.js
`collidersAt`, `placeOf`; rooms.ts `balconyDoor`; relief.ts `reliefOf`; birds.js `SONGBIRDS`; tent.ts `TENT`;
maiacity-v2/things.js `TENT_WORK`, `STAND_IN`; van.js `LOWER_BODY`; factories/assets.js `tokenOf`.

**37. Stale references.** factories/three.js:2 says "three ^0.186" (package.json has ^0.187). lifetrac-kit.js:4
points to ./lifetrac-line.js, now in play/api/import. index.js (factories):3-6 describes the legacy port. Problems
11, 19, 28 and 35 list more.

### Special cases (evidence of a missing design)

**38. A world's layout as constants in a route**: routes/sandbox-5:21 `FOREST_DOME =
'cac16350-08a4-4d51-8cdf-3ade5f61836e'` and `GATES` (see 21).

**39. Sandbox 4 picks parts by name and parses a title** (HELD): scene.ts:497 `getObjectByName('element-cast') ??
'element'`, :504 `part.id === 'element'`, and :538 and :541 `label.split(': ')` to cut a display name out of a
title.

**40. Legacy swaps are plant slot ids and sowing gaps in code.** interior/legacy.js:16-31 (`HERBS`, `CROPS`: 12
plant ids, gaps and rows), all pinned `v: 1` (:57).

**41. Swallowed errors**: worlds/view.js:210 `catch {}` around `floorGrid`, :391 `.catch(() => {})` on waking (HELD);
maiacity-v2/drawn.js:60 `modules().catch(() => {})`; world.js (HELD), 4 rejections dropped (e.g. :970);
sandbox-4/scene.ts:544 (HELD, a failed pin read becomes a console.warn); worlds/sound.js:82, 107; ambience.ts:63, 95,
104. In the lab, `catch{return 0}` / `catch{}` is used as control flow for "no shared face":
german-house.ts:103, industrial-hall.ts:87, metal-shed.ts:20 (fasteningPatch throws instead of returning null).

**42. Polling and timers stand in for readiness signals**: village.ts:1556-1560 polls every 100 ms for up to 120 s
until the forest settles (HELD), and village.ts's film `stage` runs a 10 s `setInterval` warning (HELD);
worlds/view.js `settle` loops on `setTimeout(r, 16)` (HELD); interior.ts:2552 waits two frames before turning
culling back on (HELD).

**43. Dome kinds are branched by name**: 55 `kind === '…'` in interior.ts (see 24; HELD).

**44. Lab scenarios are branched by id**: 39 in worker-runtime.ts and main.ts (see 20).

---

## Fixes (fewest that remove the problems)

Bounds are greps on `play/site/src` (and `play/site/scripts`) on main, run before and after.

### F1. One dome-cell page, one mount per world shared with the census
Removes **1, 2, 19, 21, 38** (5).
- Make `lib/content/sandbox-kit/DomeCellPage.svelte` (or put it beside the dome cell's code). It takes the sandbox's
  UUID, the cover and the bar text. routes/sandbox-1 and sandbox-5 become thin wrappers.
- Export `openSandbox1(el, onProgress, opts)` and `openSandbox3(canvas, cb)` (with `STAGE`) next to their worlds.
  Both the routes and census run.ts call them.
- Sandbox 3 uses WorldPage, or drop WorldPage's claim.
- **HELD part:** Sandbox 5's `solo` ({asset, gates}) and the garden it borrows become configs of Sandbox 5's layout
  document (`configs/<five>/solo`), set by a proposal. That changes §5 (play/SPEC.md is HELD) and needs village.ts
  (HELD) to read it.
- Files: routes/sandbox-1, sandbox-3, sandbox-5/+page.svelte, scripts/census/run.ts, interior/sandbox5.js, the new
  component.
- Risk: low. Census sandbox-1 near/mid/far and sandbox-3 open must count the same; nothing pins Sandbox 5.
- Bounds: each of routes/sandbox-1 and sandbox-5/+page.svelte ≤ 40 lines (now 297 and 296);
  `grep -c "world.set({ at: 'home'" scripts/census/run.ts` = 0 (now 1); HELD part:
  `grep -rc cac16350 src/routes` = 0 (now 1).

### F2. One pin ref, one config path, one catalog query (catalog.js owns the protocol)
Removes **3, 4, 5, 6** (4).
- catalog.js keeps `assetIn` as the builder (renamed `slotRef`), adds `withValues(ref, q)`, `configOf(sandbox,
  name)` and `acceptedVersions(asset)` / `newestAccepted(asset)`.
- Replace the hand-built refs and paths. legacy.js, pallet.js, maiacity-v2/things.js, maiacity-v2/plants.js,
  flora.js refOf and sandbox5.js GARDEN are not held. factories/assets.js uses `catalogReady`.
- **HELD:** interior/things.js:25, village.ts `newestOf`, sandbox-4/scene.ts:523-539 (resolve the slot; use
  catalogReady and acceptedVersions).
- Risk: low. Refs resolve the same (string equality). Census sandbox-1 and sandbox-3 hold the refs that are drawn.
- Bounds: `grep -rn 'pin:\${' src | grep -v assets/catalog.js | wc -l` = 0 (now 5);
  `grep -rn 'configs/\${' src | wc -l` = 2 (catalog, game/code; now 4);
  `grep -rn 'INDEX.recipes' src/lib --include=*.ts --include=*.js | grep -v content/assets/` = 0 (now 2);
  `grep -rn 'loadRecipes(), loadConfig(' src | grep -v recipes.ts` = 0 (now 2).

### F3. One world loop and film hold in the kit; film state behind one module
Removes **7, 8, 9 (slug part), 33, 42 (village/interior)** (5).
- Add `createWorldLoop({ stage, walker, sky, animate, beforeDraw, film })` to sandbox-kit/film.js. It owns the rAF
  loop, `connectFilm` and the debug hooks.
- village.ts uses it. Delete interior.ts's standalone mount (2560-2735 and the `!host` branches).
- render/film.js becomes the one reader and writer of `__worldTime`, `__interiorHour` and `__exposure`
  (`filmHour()`, `filmExposure()`). sky.js reads through it, and census run.ts and selector-shots set them through
  it.
- connectFilm names a world by its sandbox UUID; game/film/worlds.js maps it.
- Replace the 120 s poll with `await plantsOut.settledPromise()`.
- **HELD:** village.ts, interior.ts, sky.js.
- Risk: medium (film paths have no test). Census sandbox-1 pins the walk path; check a film shot by hand.
- Bounds: `grep -rc 'connectFilm(' src/lib/content/sandbox-2` total = 1 (now 2);
  `grep -rln '__interiorHour\|__exposure\|__worldTime' src/lib | grep -v render/film.js` = empty (now 5 files);
  interior.ts ≤ 2,500 lines; `grep -rn "sandbox: 'sandbox-[0-9]'" src/lib` = 0 (now 3).

### F4. Take the dome kit out of interior.ts (and name the folder for what it is)
Removes **15, 22, 24, 26, 43** (5).
- New `interior/dome-kit.ts` holds `DOMES` with per-kind traits (door half-width, lite, huge, wall margin, shadow
  updates), `mats`, `box`, `polar`, `adiff`, `DOORS`, `bake`, `geodesic`, `portal` and the furniture.
- factory.ts, tent.ts, spaces.ts, rooms.ts and village.ts import from it, and their local copies are deleted.
- Then rename `content/sandbox-2/interior` → `content/dome-cell`, and sandbox5.js → garden.js.
- **HELD:** interior.ts, village.ts (the rename touches every held interior file).
- Risk: low to medium, a pure move. Census sandbox-1 near/mid/far must count the same.
- Bounds: `bun intent-work/5884ade4/graph.ts cycles | grep -c interior/` = 0 (now 1);
  `grep -rcE "^(export )?const (polar|adiff) " src/lib/content/sandbox-2/interior` = 1 each (now 4 and 3);
  `grep -c "kind === '" interior.ts` ≤ 10 (now 55).

### F5. Drop the dead
Removes **28, 30, 31, 32, 34, 35, 36, 37** (8).
- Not held: delete sandbox-kit/orbit.js, timeline.js and index.js (the routes import WorldPage.svelte directly);
  delete random.js's unused exports (unless F6 uses them), sandbox5.js `kindsOf` and `TIERS.near`/`.mid`,
  maiacity-v2/plants.js `PLANTS`/`plantOf`/`PLANT_IDS`, and the exports used only in their own file.
- **HELD:** world.js's story machinery (31) with tour.js, watering.js, tree-camera.js and its game/film imports; the
  `!flora` branches (34) in village.ts and interior.ts and the stand-ins built only to be swapped.
- Risk: none for the deletes. The world.js and flora cuts: census sandbox-3 open and sandbox-1 must count the same
  (the van and anything `set` draws stay).
- Bounds: orbit.js, timeline.js and sandbox-kit/index.js are gone (−373 lines); maiacity-v2/plants.js ≤ 12 lines;
  world.js ≤ 2,700 lines (HELD); `grep -cE "flora \?|!flora|flora &&" village.ts interior.ts` = 0 (now 32, HELD).

### F6. One seeded random
Removes **14** (1).
- random.js is the only source. Add the variant that maps seed 0 to 1, for noise.js, textures.ts and
  assets/seeded.js, so each copy keeps its exact sequence (seed 0 behaves differently).
- Point maiacity-v2/world.js, van.js, factory.ts (twice), textures.ts, noise.js and assets/seeded.js at it.
- **HELD:** world.js, textures.ts, noise.js.
- Risk: none if each copy maps to its exact variant. sky.test.js, biomes tests and census hold it.
- Bound: `grep -rlE "0x6d2b79f5|1664525" src/lib | grep -vE "random.js|des.js|test-world.js|box/clips.js|models/|stories/fixtures"`
  is empty (now 6 files).

### F7. The labs: a scenario registry, one studio rig, one lab frame
Removes **16, 17, 20, 23, 41 (lab catches), 44** (6).
- lib/sandbox-2 gets `BUILDS: Record<id, { definition(settings), view: { height, scale, noun, arrows } }>`, read
  by worker-runtime.ts and main.ts.
- Move `V3` and `Quaternion` into geometry.ts; simulation re-exports them.
- `fasteningPatch` returns null instead of throwing.
- render/stage.js gets `studioLights(scene, numbers)`, each lab passing its own current numbers.
- One lab-frame.css shared by Sandbox 2 and 4.
- **HELD:** main.ts, sandbox-4/scene.ts, factories/look.js, PlantLook.svelte. Not held: worker-runtime, geometry,
  simulation, parts-gallery, the house builders, the styles.
- Risk: low. The 24 lab tests pin the physics; nothing pins the lab's drawing, so compare stills.
- Bounds: `graph.ts cycles | grep -c 'sandbox-2/geometry'` = 0 (now 1);
  `grep -cE "id ?[!=]== ?'" src/lib/sandbox-2/worker-runtime.ts` = 0 (now 10); main.ts ≤ 3 (now 29, HELD);
  `grep -rc "new THREE.HemisphereLight" src/lib/sandbox-2 src/lib/sandbox-4` = 0 (now 3).

### F8. What a world stands by is data or held by a test
Removes **11, 18, 40, 9 (Factories film part via F9)** (3, plus 9's slug part with F3).
- Bring back the tests that tie maiacity-v2/things.js and interior/things.js measures to each build's own nodes (or
  read the measures off the build).
- Move Sandbox 1's ambience `FILES` and legacy.js's `CROPS`/`HERBS` swap table into Sandbox 1's layout configs
  (`sounds`, `swap`), read the way worlds read `sound:`, with ambience.ts using worlds/sound.js's engine.
- **HELD:** interior/things.js; the layout and schema change goes by a proposal (play/SPEC.md §4.6 HELD).
- Risk: low for the tests; medium for sound.
- Bounds: `grep -rn "things.test.js\|plants.test.js" src/lib/content` = 0 (now 3), with
  `ls src/lib/content/maiacity-v2/*.test.*` non-empty; `grep -c "const FILES" ambience.ts` = 0;
  `grep -c "const CROPS\|const HERBS" legacy.js` = 0.

### F9. The factories' seams
Removes **12, 13, 9 (two film contracts)** (3).
- The import writes no `ct`/`note` on stations: `lineOf` derives them, the test already pins this, and api's
  `contentOf`/`noteOf` go.
- `boot(spec, host, { kits: [lifetrac] })`: lifetrac-kit.js exports `install(K)` instead of a side effect.
- An adapter connects `__film` to `connectFilm`.
- **HELD:** factories/app.js (boot and `__film`).
- Risk: low. lifetrac.test.ts pins every cycle time and note.
- Bounds: `grep -c contentOf play/api/import/factories/lifetrac-line/*.js` = 0 (now 3); routes/factories imports
  lifetrac-kit's `install` by name (no bare import in the Promise.all).

### F10. The Worlds page and the live shot share the world's sky and a shot's lights
Removes **10, 41 (view.js)** (2).
- worlds exports `WORLD_SKY` and `shotLights(sky, scene, lamps, at)`, used by view.js, worlds/film.js and
  live-runtime.ts.
- view.js reports floorGrid and wake failures instead of dropping them.
- **HELD:** view.js, live-runtime.ts.
- Risk: low. Census worlds open and worlds.test.ts.
- Bound: `grep -rc "shadowReach: 500, fog: { far: 1400 }" src` total = 1 (now 2).

### F11. Biomes off the in-code version history
Removes **27** (1).
- Biome recipes are assets on play. Drop `versioned(LIST…)` and the `site/app/versions.js` import; readers
  (assets/soils.js, routes/game/map) read the recipe list as plain data, or the catalog.
- **HELD:** all of content/biomes.
- Risk: low. biomes.test.ts.
- Bound: `grep -rc "site/app/versions" src/lib/content/biomes` = 0 (now 1).

### F12. Library assets through one adapter
Removes **29, 39, 41 (drawn.js, scene.ts)** (3).
- Drop interior/drawn.js's pass-through `createDrawn` (the world calls `createAssets` directly). Rename
  maiacity-v2/drawn.js's export to `createFollowers`. One `boxesFor(device)` in assets/render.
- Sandbox 4 names its element by a card field (`card.focus`), not by `getObjectByName`.
- **HELD:** interior/drawn.js, sandbox-4/scene.ts.
- Risk: medium. Census sandbox-1 and sandbox-3.
- Bound: `grep -rn "export function createDrawn" src/lib` = 0 (now 2).

Not covered by one fix: 25 (world.js as a god file shrinks with F5 and F6; splitting the rest is its own intent,
HELD).
