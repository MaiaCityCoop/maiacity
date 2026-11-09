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
   **Done again** (freed when 660ad67f landed): the move and its split are back (4 tests, passing). The scripts
   `flyover.mjs`, `render.mjs`, `story-parity.ts` and `stories/world.test.ts` are held (3a8b135a, c1bee1f8, ed6694c3)
   and left exactly as the untangle branch has them.
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
   world's own (a recipe, self-contained) and AirSup's `des.js` (theirs). Later, with move 2 done again, `biomes`
   importing `kernel` made it less stable than `content/assets` (I 0.43 → 0.50: layers 11 → 12), so `noise.js` has
   its own `rng` back as before (the same numbers as the kernel's, pinned by random.test.js's values); it goes once
   `biomes` is stabler (Next untangles).
7. **A document's version, the API's type** (re-audit: a type drifted between api and site). `GET /api/docs/<uuid>`
   lists its versions as `versioned.ts` `versionsNamed` makes them; the site wrote that shape out four times (Aside's
   history, History's `Version`, the Game editor's and the Factories' `Version`), two with `acceptedBy` optional, none
   with `contentHash`. `versionsNamed` now returns `DocVersion[]`, exported through `$wire` (play/api/src/wire.ts), and
   the four take it. Types only: gate api (354 pass) and site; svelte-check's errors unchanged (9, all in held files).
   Left: AssetLibrary's and the Worlds page's own `Listed`/`Version` of `/api/assets` (the API has no named type for
   that answer yet), and the Rules page's narrower read of a version (number and hash), which needs no more.
8. **The bench reads its manifest through the site's client** (site: `fetch(` outside api.ts, 2 → 0). Moved under
   `routes/` (move 1), the bench's `?load=` manifest and its files were the pages' only `fetch(`. They are read with
   `lib/api.ts` `siteBlob` now: the same requests (same origin); a manifest or file that does not come back is refused
   with its HTTP status where before a 404 page was read as JSON or as a piece's code. Pinned: gate site; svelte-check
   unchanged; the bench is run by hand (`/render/?load=`).
9. **`ParityWindow` no longer exported** (dead: 1 → 0). The held `story-parity.ts`, now main's, no longer imports the
   type the sweep exported for it from `story-parity-page.ts`, which alone uses it.
10. **Comments that restate the code** (comments only, one folder a commit): site/intents (24), stories, scripts,
    lib/app, routes and routes/game/map (the map's header retold its generator's steps), content/game/film,
    content/assets (box, cache), content/sandbox-2/interior, content/factories (ours; AirSup's world, kit and des
    untouched), sandbox-kit, lib and site/app: docs naming a constant or a function again, section dividers that only
    say what the functions under them are called, CSS comments saying what their media query says. Kept: decisions
    with dates, browsers' and libraries' behaviour, measured numbers, SPEC pointers, the physics labs' notes, format and
    contract docs, the shot scripts' usage. Each changed file compiles to the same code (Bun's transpiler, whitespace
    minified; `.svelte` and `.mjs` by their text without comments), a JSDoc type never dropped (a script of this
    branch checked both before each commit).

## Re-audit of play/site (untangle step 4), with the moves above

Fixed here: the census test's re-exports (4), the Library shots' copied scratch play (5), the seeded randoms (6), a
document's version type drifted between api and site (7), the bench's `fetch(` (8), a dead export the restore left (9).
Still worth fixing, each blocked or another area's:

- **`lib/recipes.ts`, `content/assets/{sandboxes,seeded,cache}.js`, `content/game/hash.js`, `biomes/noise.js` `rng`**:
  one-line re-exports, each kept for held importers (census/run.ts by a computed path; sandbox-2/interior things.ts,
  plants.ts, sandbox-4/scene.ts; render/levels.js; stories compose and live-runtime; biomes/stream.js). Each goes with
  its last held importer.
- **`site/app/versions.js`** is the biomes' versioning (its one importer `content/biomes/index.js`, held): content
  imported by the app shell's folder in reverse; it belongs in `content/biomes`.
- **`render/budget.js`'s `small`** is read by `assets/cache/store.js` (`quiet`'s waits): the device budget is kernel
  matter living in `content/render` (held); in `kernel` it would take `box → cache` out of the layers.
- **AssetLibrary and the Worlds page** each write `/api/assets`'s `Listed` and `Version` out themselves (the API has no
  named type for that answer); AssetLibrary is also `lib/app → content/assets`, which wants the render kit below both
  (VaultAsset.svelte, render/index.js held).
- **Copies of an LCG** left: `sandbox-2/interior/factory.ts` (two inline), `textures.ts` and `maiacity-v2/world.js`
  (held). `noise.js` keeps its mulberry32 until `biomes` is stabler than `content/assets`.
- **The Library shots scripts fail today**: play's Library lists KTX2 pictures among its newest images, which
  `add_story_frame` refuses; `withLibrary` should take only JPEG, PNG and WebP (behaviour, not this untangle's).
- **`scripts/render.mjs`** (held) names the bench at its old path.

## Where the bounds stand (`measure.ts all`, with today's held set)

| | before | after | asked |
|---|---|---|---|
| folder cycles a held file does not close | 2 | 0 | ≤ 1 |
| layers (whole repo) | 11 | 11 | ≤ 10 |
| comment lines (whole repo) | 9,495 | 9,190 | ≤ 9,400 |
| comments naming a file that is gone | 3 | 0 | 0 |
| every other bound | ok | ok | |

**Layers, 11**, each held or not play/site's: `api/src → api/src/docs` (the api's); `lib/app → $wire` (fix 2's
design); `lib/app → content/assets` (AssetLibrary: VaultAsset and render/index.js held); `lib → content/assets`
(recipes.ts, for the held census/run.ts); `content/assets → assets/render` (plantings.js held) and `→ assets/sources`
(VaultAsset.svelte held); `box → cache` (cache/store.js reads render/budget.js, held: moved to kernel it goes);
`content/render → film` and `→ render/nodes` (render/film.js, core.js held); `render/nodes → biomes`
(render/nodes/ground.js held); `stories → scripts` (old-city.test.ts held). Moving the TSL test out of render/nodes
traded its own `render/nodes → content/assets` for the held ground.js's `render/nodes → biomes`. Of the comment lines,
about 200 went with this branch's cuts and the rest with the held scripts restored to main's.

## Next untangles

- `kernel` takes the device budget (`render/budget.js`): `box → cache` goes.
- The render kit below `lib/app` and `content/assets` (VaultAsset, render/index.js free): `lib/app → content/assets` goes.
- Each re-export above with its last held importer; `noise.js`'s own `rng` once `biomes` is stabler.
- `versions.js` into `content/biomes` once `biomes/index.js` is free.
- `scripts/render.mjs`: the bench is `src/routes/render/RenderBench.svelte`.
