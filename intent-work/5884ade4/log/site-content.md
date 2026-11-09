# site-content: fix 3, one loader, one hash, one pin for play/site's content

Builder of area `site-content` (branch `intent/5884ade4-u-site-content`). Problems are cited as `site-assets#n` and
`site-worlds#n` (the audits' numbers), fixes as `site-assets Fn` / `site-worlds Fn`.

## Moves

1. **Pins first.** Vitests for what nothing pinned and the moves below touch: the device cache's keys and file format
   (`content/assets/cache.test.ts`: golden keys, a golden packed file, nothing kept without OPFS), the asset viewer's
   build (`sources/viewer.test.ts`: what it reads, keeps under which key, and every message it fails with), the names
   of an asset (`catalog.test.ts`: `resolve` of builds and slots, and the refs the worlds write: the pallet, Sandbox 3's
   things and plants, the garden's `refOf`), and the Sandbox 1 and 5 pages as served (`routes/sandbox-5/page.test.ts`,
   an SSR snapshot of each: head, cover, bar).
2. **The one hash is the kernel's** (site-assets#5, #20, #28 pass-through; site-assets F3). `content/game/hash.js` →
   `kernel/hash.js`, which also holds the one hash pattern (`HEX`, `HASH`, `isHash`); `game/hash.js` is a one-line
   re-export for the stories (`compose.ts`, `live-runtime.ts`, held) and the scripts. `kernel/sandbox/engines.js` (a
   pass-through and the dead floor/worker mechanism) is gone: `frame.js` and `content/assets/engines.js` read
   `kernel/engines.js`; its dead `isFrozen` is gone. The kernel no longer imports content. Pinned by `box/pieces.test.ts`,
   `cache.test.ts` and the census (same ×3).
3. **The box's engines live in `box/`** (site-assets#7, #15 host → engines; site-assets F3). `content/assets/engines.js`
   → `content/assets/box/engines.js` (importers: RenderBench, catalog, load, sources/viewer, routes/worlds/bench, the
   box's host and tests; none held); its dead `enginePath` and `RECIPE_END` go. The census's Sandbox 3 count flips
   between two totals on its own (296/303 draws, the merge base's run too): a DIFF there is rerun, and this one came
   back `same`.
4. **The device cache split by what it keeps; one reader of play's files** (site-assets#4, #15 pieces → cache, #25,
   #27 cache part, #34 cache part; site-assets F2, F9). `cache.js` (732 lines) → `cache/store.js` (the OPFS folder, its
   writer and worker, use notes, the LRU trim, and `lost`: the one place the cache's failures are let go, since it is
   never the truth), `cache/packed.js` (the entry file format), `cache/builds.js` (keys, get, put, drop, pictures),
   `cache/levels.js` (levels' keys and entries), `cache/files.js` (play's files by hash and `playFile`, the one reader:
   this device's copy, else `kernel/files.js` `fileUrl`, held to its hash, kept). `catalog.recipeAt` and the box's
   pieces read through `playFile`, so `box/pieces.js` no longer imports content/assets. `cache.js` stays as a re-export
   of the level functions for `render/levels.js` (held). Dead: `bytesOf`, `pixelsOf`, `fingerprint`, `putRaw`, `usage`,
   `clear`; `storable` and `revive` are no longer exported. Keys and the file format are unchanged (`cache/cache.test.ts`'s
   golden values). `fileUrl` is in the kernel, not in `lib/api.ts` (site-app's), because content importing `lib/`
   would close a folder cycle (`lib/recipes.ts` → `content/assets`); `lib/api.ts` may re-export it.
   Found, kept as it was: `putLevel` counts a level's bytes after handing them to the worker (0 there), so levels don't
   count toward the trim until the next recount.
5. **One build-name grammar, one hash pattern** (site-assets#2 part, #3, #5, #6 hash part, #26; site-assets F4).
   `content/assets/builds.js` → `kernel/builds.js`, the one grammar of a build's name (`parseBuild`, `buildOf`, and
   `queryOf`, `paramsIn` from `params.js`, which keeps only the parameters' values); `catalog.js` re-exports only
   `buildOf` and `parseBuild` (for the held `render/index.js` and `sandbox-4/scene.ts`), not `checked` (dead) or
   `hashText`. Every hash pattern in content, the kernel, the Worlds page and the scripts (catalog's, the cache's,
   `uses.js`, `box/pieces.js`, `box/headless.js` with its own BLAKE3 hex, `film/shot.js`, `worlds/contract.js`,
   `intent-shots`, `propose`, `story-parity`, `live-runtime`) is `kernel/hash.js`'s `HEX`/`HASH`/`isHash`: 21 → 4 (the
   kernel's, and three in site-app's files: `site/media/url.ts`, `StoryChanges`, `StoryPlayer`). The cache keys stay
   (golden test); `headless.js`'s `hashOf` keeps its name for the census's setup (held).
   The census's Sandbox 3 totals vary at one and the same tree (four runs at HEAD: 301, 296, 296, 296 draws; the merge
   base's runs gave 296, 297 and 303): its `DIFF` here is that noise, not this move. `scripts/live-runtime.ts --check`
   fails before and after this branch (the pinned runtime is older than the stories' sources; held).
6. **One way to load a build** (site-assets#1, #2, #34 part; site-assets F1). `sources/viewer.js` `vaultBuild` is a thin
   call into `load.js`: the card check (`open`, now exported, naming the recipe where the viewer's messages did), the
   cache read with its spoiled-entry drop (`cached`), the keep (`kept`), the engine its card names (`engineOf`, which is
   the index's for all 705 rows of the census's catalog) and the manifest/contract check (`heldTo`) it skipped; a box of
   another engine is not handed a recipe it doesn't run. Its own `buildName` copy goes (`buildOf`, re-exported under
   the old name for `VaultAsset.svelte`, held). `loadAsset`'s cache read goes through `cached` with its times as they
   were. `sources/viewer.test.ts` now builds from the page's catalog (recipes handed in as the benches hand theirs) and
   pins the box's timeout. Census: Worlds (the viewer's build) and Sandbox 1 same, Sandbox 3 its noise (297 draws, a
   total the merge base gave too).
7. **One pin ref, one config key, one catalogReady** (site-worlds#3, #4 part, #5 part; site-assets#13; site-worlds F2,
   site-assets F12). `catalog.js` writes every slot ref (`slotRef`, the dead `assetIn` gone) and joins a query
   (`withQuery`, also for the garden's `refOf`); the pallet, Sandbox 3's things and plants and the legacy swap write
   theirs through it, each the same string as before (`catalog.test.ts`). `game/code/index.js` `configKey` names a
   sandbox's config (the loader, the catalog, Sandbox 1's `GARDEN`). `catalogReady` moves into `catalog.js` (content
   importing `lib/recipes.ts` would close a folder cycle); `lib/recipes.ts` re-exports it for the census (held), and the
   Factories wait on it instead of a copy without its check. Held, left: `interior/things.js`'s ref,
   `sandbox-4/scene.ts`'s raw config read and its copy of the wait, the catalog walks of `village.ts` and `scene.ts`.
8. **Sandbox 1 and 5 are one dome-cell page** (site-worlds#1; site-worlds F1 non-held part).
   `content/sandbox-2/interior/DomeCellPage.svelte` holds the page (the mount, the plant card, its styles, the aside);
   `routes/sandbox-1` (23 lines) and `routes/sandbox-5` (32) give it their sandbox's UUID, head, bar, cover and label,
   Sandbox 5 its `solo` building and Sandbox 1 its `opening` notice. Both mount as before: Sandbox 1's garden after
   `catalogReady(SANDBOX.one)`, Sandbox 5 with `solo`. Pinned by the SSR snapshot of each page (written from the old
   pages, passed by the new; the test now leaves out the in-game clock, which made it fail by the hour, and the head's
   hydration marker, which names the component that owns the head). The kit's barrel is no longer used for `WorldPage`.
   Census: Sandbox 1 and Worlds same, Sandbox 3 its noise. Held, left: the census's `mountSandbox1` copy of the mount
   (`scripts/census/run.ts`), Sandbox 5's `FOREST_DOME` and gates as layout configs (§5, `village.ts`).
9. **The film registry by UUID; the legacy places gone** (site-assets#29, #35 film part; site-worlds#9 slug part;
   site-assets F6). `game/places.js` (465 lines: navigation, history and routes of the legacy app, worlds with no page)
   goes; `game/film/worlds.js` keeps the film worlds that have a page, keyed by the sandbox's UUID (Sandbox 1, 3, 5) and
   `worlds`, each with its real route (`filmPath`, `worldOfPath`); a shot naming no world is in Sandbox 1. `shot.js`'s
   legacy shot-list readers (`fromLegacy`, `legacyStops`, `legacyLook`), `shutterTimes`, `sameSpec` and `SETS` had no
   caller and go. Nothing plays a reel today (`maiacity-v2/world.js`'s story, held, is unreachable), so no world draws
   otherwise; `worlds.test.ts` pins the film page of a Worlds shot. Sandbox slugs in site code: 26 → 1 (`sandbox5.js`
   names its film world `'sandbox-5'` because `village.ts`, held, types it so). The census's Sandbox 3 noise again
   (three runs at HEAD: 303, 299, 299 draws).
10. **The lab's geometry ↔ simulation cycle goes** (site-worlds#23; site-worlds F7 part). `V3` and `Quaternion` are
    declared in `lib/sandbox-2/geometry.ts`; `simulation.ts` imports and re-exports them (a type-only move). The 24 lab
    tests pass (five of them time out only when the whole folder runs beside other builders' processes; each passes
    alone).
11. **The sandboxes' UUIDs in the kernel; no new folder cycle** (site-assets#11 part; cycles, layers). Moves 7–9 had
    pulled factories, maiacity-v2, the dome cell, models, film and game/film into the site's folder cycle: the refs'
    test sat in `content/assets` importing the worlds, the film registry imported `content/assets/sandboxes.js`, and
    the dome-cell page imported `lib/app/Aside.svelte`. Now `content/assets/sandboxes.js` → `kernel/sandboxes.js` (a
    one-line re-export stays for the held worlds and the census), the refs are pinned beside each world
    (`factories/pallet.test.ts`, `maiacity-v2/refs.test.ts`, `interior/flora.test.ts`), and the routes put the aside
    beside the page. The site's folder cycle is back to its 16 folders plus `content/assets/cache` (which reads
    `content/render/budget.js`; render is in the cycle only through held tests); less-stable imports 18 → 15.
12. **Content reads play's files by one address** (site-assets#4; site `files spelling /api/files/`). `render/arrays.js`
    (the ground's KTX2 arrays) and `worlds/sound.js` (a world's recordings) take `kernel/files.js` `fileUrl`; the
    comment of the generated `biomes/sets.js` and its generator (`tools/ground-sets/make.mjs`) name it. In content and
    the kernel only `kernel/files.js` spells `/api/files/`; with site-app's `lib/api.ts` that is the bound's two. Content
    does not import `lib/api.ts` (that would close a folder cycle through `lib/recipes.ts`); `catalog.js` and the box
    read through `cache/files.js` `playFile`, the one reader. Census: Sandbox 1 and Worlds same, Sandbox 3 its noise.
13. **Dead out of content, the kernel and the lab** (site-assets#27, #28; site-worlds#28, #30, #32, #35, #36; fix 4
    within these files). Gone: `sandbox-kit/orbit.js`, `timeline.js` and the barrel `index.js` (nothing imported them);
    `maiacity-v2/plants.js`'s plant table (only `plantRef` is used); `sandbox5.js`'s `kindsOf` and two of its three
    detail tiers, its header naming the legacy vault; `film/color.js`'s camera-profile detection (only `REC709_TO_AP1`
    and the ACEScct curve stay), `film/camera.js`'s `curveName` and `keysFromFlight`, `reel.js`'s `reelOf`, `time.ts`'s
    `GAME_DAY_MS`, `gameAgo`, `calendarLabel`, `models/units.js`'s `CM`, `KM` and `REAL_SIZES` (its size test is gone).
    85 exports used only in their own file lose `export` (content, the kernel, the lab's buildings, the dome cell's
    non-held files); the box's engine sources (`box/bake.js`, `box/clips.js`) and `schemas/` are left as they are (the
    engine is frozen from them; the schema list waits on a decision). Exports nothing else uses, repo-wide: 263 → 146.
14. **Comments that name files point at files** (site-assets#30; fix 7 within these files). 44 references in content,
    the kernel and the box to files that are gone (`aven/kernel/…`, `maia/…`, `./vault.js`, `./recipes.js`,
    `./AssetViewer.svelte`, `./live.js`, `./engine.js`, the logic and view hosts, removed tests) now name the file that
    does the job, or the reference goes; comments only. The legacy vault's proof (`provenAt`, `wants`) is no longer
    described in `load.js`. `maiacity-v2/things.js` says plainly that no test holds its measures (site-worlds#11).
15. **One seeded random, in the kernel** (site-assets#10, #22; site-worlds#14 part; site-assets F7). `sandbox-kit/random.js`
    → `kernel/random.js`; its `seededLcg` takes a seed of 0 as 1, which makes it `assets/seeded.js`'s exact sequence
    (it had no caller, so nothing else moves). `models/timber.v1.js` and `sandbox-kit/universe.js` import the kernel's;
    `assets/seeded.js` is a one-line re-export for `interior/plants.ts` (held). `models` no longer imports a less
    stable folder (less-stable imports 15 → 14). Census: Sandbox 1 (whose timber this draws) and Worlds same, Sandbox 3
    its noise. Held, left: the copies in `maiacity-v2/world.js`, `interior/textures.ts`, `biomes/noise.js`.
