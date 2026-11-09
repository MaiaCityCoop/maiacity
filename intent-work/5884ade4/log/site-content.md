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
