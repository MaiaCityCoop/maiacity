# play/site, second pass (cycles, layers, comments, re-audit): the moves

Branch `intent/5884ade4-u-site2`, from `intent/5884ade4-untangle` a053b9c (fixes 2, 3 and the sweep merged). Held set
refreshed with `held.sh` from `held-intents.txt` before each commit (155 files).

Before (`measure.ts all`): folder cycles a held file does not close 2 (≤ 1), layers 11 (≤ 10), comment lines 9,495
(≤ 9,400), comments naming a gone file 3 (0); every other bound ok.

## Moves

1. **The render bench beside its page** (cycles: `content/assets ↔ content/assets/render`). `RenderBench.svelte` was
   in `content/assets` and imported `render/crowd.js`, while `crowd.js` imports `clips.js`, `load.js` and `catalog.js`
   from `content/assets`: the folder pair's one cycle no held file closes. The bench is one page's developer tool
   (`routes/render/+page.svelte` its one importer, in development only): it now sits beside that page and imports
   the asset kit by `$lib`. Pinned: the same component, moved; gate site; svelte-check's errors unchanged (all in held
   files).
2. **The ground's TSL test beside the ground** (cycles: `content/biomes ↔ content/render/nodes`). `render/nodes/tsl.test.js`
   built `biomes/surfaces.js`'s `groundMaterial` and `assets/ground.js`'s `groundOf`: the one non-held import from
   `render/nodes` back into `biomes` (the other, `render/nodes/ground.js → biomes/sets.js`, is held), and the layers'
   `render/nodes → content/assets`. It is now `content/assets/ground.test.js`, beside `ground.js`, which already
   imports `biomes`; its warm-ups check (no `compileAsync` but `render/core.js`'s, a walk of `src/lib`, importing
   nothing) is `content/render/warmups.test.js`, beside `core.js`. Folder cycles no held file closes: 2 → 0. Layers
   stay 11: `render/nodes` turns more stable (I 0.43 → 0.33) and the held `render/nodes/ground.js → biomes/sets.js`
   is now the upward import in its place, held alone. Pinned: the same 5 tests, passing; gate site.
   **Undone** (held since): intent ed6694c3 now holds `render/nodes/tsl.test.js`, `stories/live.ts` and
   `world.test.ts`, and 8823eb7c `scripts/render.mjs` and `story-parity.ts`. The test is back at its path (the move
   and its split reverted in one commit), and this branch's comment edits of the two scripts and of live.ts with it.
   Held, the test's imports are set aside, so the cycle stays uncounted (held-free folder cycles 0); its
   `render/nodes → content/assets` stays among the layers, held. `render.mjs` still names the bench at
   `src/lib/content/assets/RenderBench.svelte` (now `src/routes/render/`): Next untangles.
3. **Comments naming a file that is gone: 3 (6 after move 1) → 0** (comments only). The bench's own `./catalog.js`,
   `./clips.js` and `./render/crowd.js` name `content/assets/…` now; three of play/api's tests named
   `./intents.ts` and `./select.ts` beside them, which are `../src/intents.ts` and `play/avenbox/select.ts`.
4. **`census/away.test.ts` reads the catalog and the sandboxes where they are** (re-audit: re-exports). It took
   `catalogReady` from `lib/recipes.ts` and `SANDBOX` from `content/assets/sandboxes.js`, both one-line re-exports kept
   for the held `census/run.ts` and held worlds; it now imports `content/assets/catalog.js` (which it read already) and
   `kernel/sandboxes.js`. Pinned: `bun test scripts/census/away.test.ts` (2 pass). The site's three importers of
   `lib/recipes.ts` (AssetLibrary, the Worlds page, Sandbox 3) stay: moved to `catalog.js`, the graph sees nothing
   import `recipes.ts` (run.ts reads it by a computed path) and counts it dead; it and they go once run.ts imports
   `catalog.js` itself.
5. **The Library's two shot scripts share their scratch play** (re-audit: copies). `library-shots.ts` (732d8a38's c5)
   and `dashboard-library-shots.ts` (1b2ebc8d's c2) each held the same 70 lines: a scratch database on avenBOX's
   Postgres, this branch's API on it at :3911, an admin and their token, the coop's library seeded from play's and the
   personal one from the Stand-in's stills, and the drop at the end. That is `scripts/library-scratch.ts`
   `withLibrary({ name, images }, shoot)` now; each script keeps only its own shots. Pinned: the old and the new
   `library-shots.ts` run side by side in avenBOX get as far as each other and stop at the same call: play's Library
   now lists KTX2 pictures among its newest, which `add_story_frame` refuses ("A frame is a JPEG, PNG or WebP image"),
   so both scripts fail today before any shot, as before the move (not this untangle's to change).
6. **One seeded random, the kernel's** (re-audit: copies). `kernel/random.js` says it is "the one place the worlds get
   chance", but its mulberry32, `seededRandom`, was not exported, and four copies lived beside it: `biomes/noise.js`
   `rng` and `models/minidomes.js` `seeded` (mulberry32, a seed of 0 taken as 1), `routes/game/map/map.ts`
   `mulberry32` (the same numbers but at 0) and `maiacity-v2/van.js` `seeded` (the kernel's `seededLcg` but at 0).
   `seededRandom` is exported, a seed of 0 taken as 1 (nothing read it before); minidomes, the map, its city and test
   take it, the van `seededLcg` (its seeds 3, 5, 7, 11), and noise.js keeps `rng` as a one-line re-export for the held
   `biomes/stream.js`. The map's own seeds are FNV hashes of fixed strings, none 0 (each checked to give the same
   numbers). Pinned: `kernel/random.test.js` (the old copies' numbers, written down); census-same: same for Sandbox 1,
   Sandbox 3 and the Worlds page; gate site; the map's, biomes' and models' tests. Left: `sandbox-2/interior/textures.ts`
   `rng` and `maiacity-v2/world.js` `rng` (held), `factory.ts`'s two inline LCGs, `box/clips.js` (the box's), the test
   world's own (a recipe, self-contained) and AirSup's `des.js` (theirs).
7. **A document's version, the API's type** (re-audit: a type drifted between api and site). `GET /api/docs/<uuid>`
   lists its versions as `versioned.ts` `versionsNamed` makes them; the site wrote that shape out four times (Aside's
   history, History's `Version`, the Game editor's and the Factories' `Version`), two with `acceptedBy` optional, none
   with `contentHash`. `versionsNamed` now returns `DocVersion[]`, exported through `$wire` (play/api/src/wire.ts), and
   the four take it. Types only: gate api (354 pass) and site; svelte-check's errors unchanged (9, all in held files).
   Left: AssetLibrary's and the Worlds page's own `Listed`/`Version` of `/api/assets` (the API has no named type for
   that answer yet), and the Rules page's narrower read of a version (number and hash), which needs no more.
