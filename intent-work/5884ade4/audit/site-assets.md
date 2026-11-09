# Untangle audit: site-assets (intent 5884ade4)

Area: play/site/src/lib/content/assets (catalog, cache, box/, render/, sources/, schemas/, viewers), kernel/, content/models,
content/game, content/actors, content/film, plus the module cycle content/assets ↔ assets/box ↔ assets/render ↔
assets/sources ↔ biomes ↔ render ↔ render/nodes. Read only; checked out at origin/main.

HELD files (other intents) are marked **[H]**. Paths are relative to `play/site/src/lib/` unless shown otherwise.

What pins behaviour today (rendering must stay identical):
- vitest: `content/assets/box/host.test.ts`, `box/pieces.test.ts`, `render/levels.test.ts`, `render/lod.test.ts`,
  `walk.test.ts`, `content/biomes/{biomes,stream}.test.ts` [H], `biomes/surfaces.test.js`, `content/render/*.test.*`
  [H mostly], `render/nodes/{nodes,tsl}.test.*` [H], `stories/{compose,old-city,world,world-build,timeline}.test.ts`.
- `bun test scripts/census` [H] (counts draws/triangles of every world built on the CPU on the frozen box engine).
- **Nothing tests** `catalog.js`, `load.js`, `cache.js`, `sources/viewer.js`, `params.js`, `builds.js`,
  `kernel/engines.js`, `kernel/sandbox/frame.js` directly; any fix there adds a vitest first.

---

## Problems

### Hidden links (must change together, code does not show it)

1. **Two (three) pipelines that load a build.** `content/assets/load.js` `loadAsset` (150–203) and
   `content/assets/sources/viewer.js` `vaultBuild` (50–90) each: check the card (`open()`, load.js:135–140 ≡
   viewer.js:27–32), compute the cache key (`cache.keyOf({engine, recipe, params})`, load.js:113, 156; viewer.js:65),
   read the cache and drop a spoiled hit in a bare `catch` (load.js:161–168 ≡ viewer.js:71–78), build in the box and
   `store.put(...).catch(() => false)` (load.js:188 ≡ viewer.js:88). They **diverge**: `vaultBuild` runs on
   `source.index.engine` (viewer.js:63), not the engine the recipe's card names (`engineOf`, load.js:50–55), and it
   skips `heldTo` (load.js:74–92: manifest `libs`, `pieces` listing, contract `invariants`/`budgets`) and the
   in-flight dedupe (`building`, load.js:119). A third copy is `stories/StoryPlayer.svelte:119–143` (`fileText`,
   `piecesDeep`, `boxOf(engine).build` with no card check and no `heldTo`) — stories' area, noted for that audit.
2. **`buildName` ≡ `buildOf`.** `sources/viewer.js:21–24` is `builds.js:25–28` verbatim.
3. **The build-name grammar `<64 hex>?values` is parsed in five places**: `builds.js:18` (`parseBuild`),
   `catalog.js:214` (pre-check in `resolve`), `cache.js:77` (`levelKeyOf`), `uses.js:8` (`USE`, with its own query
   charset), `plantings.js:36` [H] (`biome:`). The bare 64-hex test is copied again in `box/pieces.js:21` (`PIECE`),
   `cache.js:56` (`HASH`), `box/headless.js:27`, `game/film/shot.js:113,119,177`. 12 copies of `[0-9a-f]{64}` in
   non-held JS of the area.
4. **"A file of play's by its hash, held to it, kept on this device" is written twice**: `catalog.js` `recipeAt`
   (281–288) and `box/pieces.js` `playFile` (49–64): same fetch of `/api/files/<hash>`, same `holds`, same
   `cache.keepFile`, different failure contract (throw vs `null` on 404). Third/fourth copies: StoryPlayer `fileText`
   (stories) and `kernel/sandbox/frame.js` `frozen` (46–53, engines by path).
5. **BLAKE3 hex outside "the one hash".** `game/hash.js` says every name of bytes is made "here alone", yet
   `box/headless.js:12` has its own `hashOf` (manual hex) and `cache.js:34–35,65,79,87–108` uses `@noble/hashes`
   directly (keyed/context modes; `fingerprint` is a second value-hasher beside `game/film/shot.js:346`'s own
   `fingerprint`).
6. **The piece module system is implemented twice**: `box/pieces.js` `withPieces` (123–135, a CommonJS loader written
   as a string for the worker) and `box/headless.js` `runner` (20–41, the same `require('<hash>')` semantics for Bun),
   plus the frozen engine's own `require`. A change to how a piece resolves (depth, cycles, `module` shape) must be
   made in both by hand.
7. **One engine manifest, four readers and three wrappers.** `kernel/sandbox/engines.json` [H] is read by
   `kernel/engines.js` (`enginesOf/latestOf/engineAt/isFrozen/pathOf`), re-wrapped by `kernel/sandbox/engines.js`
   (16–26: `enginesOf = listOf`, re-export), wrapped again for kind `box` by `content/assets/engines.js` (14–32:
   `ENGINES`, `LATEST`, `engineAt(v)`, `enginePath`), and read by path from disk in `play/api/src/engines.ts:7–15`
   (`BOX_ENGINES`, `boxEngine`). `kernel/engines.js:22` `FILES = { box: 'engine' }` is a per-kind special case of the
   served file name.
8. **A bone's width in the clip tables is declared on both sides**: reader `content/assets/clips.js` (`WIDTH = 7`) and
   writer `box/clips.js:34` (`WIDTH = 7`).
9. **ACEScct constants copied JS ↔ GLSL**: `game/film/color.js:29–31` (`toCct`/`fromCct`, 9.72, 17.52, the 0.0078125
   break) and `film/pipeline.js:40–41,95` [H].
10. **Seeded randoms copied**: `content/assets/seeded.js` (LCG 1664525/1013904223) ≡ `sandbox-kit/random.js`
    `seededLcg` (35–37); `models/minidomes.js:23–30` mulberry32 ≡ `sandbox-kit/random.js` `seededRandom` (19–28) except
    its `|| 1` zero-seed guard; more LCG copies in `maiacity-v2/van.js:39`, `sandbox-2/interior/textures.ts:14` [H],
    `sandbox-2/interior/factory.ts:1228,1412`, `box/clips.js:52` (an `imul` variant: NOT the same numbers).
11. **Sandbox UUIDs kept twice across packages**: `content/assets/sandboxes.js:8–22` and `play/api/src/ids.ts:10–19`
    (`SANDBOX`, comment: "the same as"); nothing checks they agree.
12. **A card's levels read two ways**: `content/assets/lodcard.js` `lodOf` (30–36) claims to read as
    `play/api/src/lod.ts` `lodOf` [H] does, but differs: the site maps `declared` without `values` to `derived` and adds
    the old-`detail` path; the API returns the card's `lod` as given.
13. **Config keys as strings across modules**: `game/code/index.js:38` writes `configs/<id>/<name>`, `catalog.js:218`
    reads `configs/${sandbox}/assets`.
14. **A cycle hidden behind dynamic imports**: `render/crowd.js:38` imports `../box/host.js`, `../load.js`,
    `../catalog.js` lazily "so a world's module can be read where there is no page"; StoryPlayer does the same.

### Needless links (tied, but change for different reasons)

15. **assets ↔ assets/box cycle** (graph `unstable`: box → assets ×3): `box/host.js:2` → `../engines.js` (the box's
    own engine list lives one level up); `box/pieces.js:18` → `../cache.js` (page-side piece resolution needs the
    device cache's file store).
16. **assets ↔ assets/render cycle**: `render/crowd.js` (an actor/crowd feature, not the renderer) → `../load`,
    `../catalog`, `../clips`, `../box/host`; `render/index.js` [H] → `../load`, `../catalog`, `../controls`,
    `../lodcard`; `plantings.js` [H] → `render/index.js`; `render/levels.js:23` → `../cache.js`.
17. **assets ↔ assets/sources**: `sources/` is two unrelated files (`viewer.js`, a second build pipeline, problem 1;
    `biome.js`, a biome card reader); entered only from `VaultAsset.svelte` [H], `worlds/view.js` [H],
    `sandbox-2/interior/{interior,village}.ts` [H].
18. **biomes ↔ render/nodes cycle**: `render/nodes/ground.js:17` → `biomes/sets.js` (generated scan data, written by
    `tools/ground-sets/make.mjs:23`), while `biomes/surfaces.js:14` → `render/nodes/ground.js` (`PER`,
    `groundNodes`). Test edges keep it too: `render/nodes/tsl.test.js` [H] → `assets/ground.js`, `biomes/surfaces.js`;
    `biomes/stream.test.ts` [H] → `render/nodes/index.js`.
19. **Low-level content imports the app**: `content/assets/VaultAsset.svelte` [H] → `site/app/Turntable.svelte`,
    `site/touch/TouchStick.svelte`; `content/assets/viewer.js` [H] → `site/app/turntable.js`; `biomes/index.js` [H] →
    `site/app/versions.js`; `content/assets/Parts.svelte` → `site/markdown`. With `site/app/NavPill.svelte` →
    `site/intents` → `stories` → `scripts` (`stories/old-city.test.ts` → `scripts/box-worker.ts`) → `content/assets`,
    this closes the 16-module cycle.
20. **content/game is a grab bag; the kernel depends on it.** `game/hash.js` (the one hash: kernel, assets, scripts,
    stories), `game/code/index.js` (sandbox config loader), `game/time.ts` (sky clock), `game/places.js` +
    `game/film/*` (film registry), `game/maiacity-v2/engine.js` (Sandbox 3 constants, used only by
    `maiacity-v2/world.js` [H]). `kernel/sandbox/frame.js:3` → `content/game/hash.js` (kernel I=0.40 → content).
21. **Film split by layer across four folders**: `content/film/pipeline.js` [H], `content/game/film/*`,
    `content/render/film.js` [H], `content/sandbox-kit/film.js`; `game/film/color.js` (199 lines) is used only for
    `REC709_TO_AP1` by `film/pipeline.js`; `game/film/{camera,reel}.js` and `models/units.js` only by
    `maiacity-v2/world.js` [H].
22. **models → assets** (unstable import, I 0.33 → 0.38): `models/timber.v1.js:2` → `assets/seeded.js` for a helper
    that belongs to `sandbox-kit/random.js`.
23. **box/ mixes the page side and the engine side**: page-side `host.js`, `pieces.js`, `rebuild.js` [H],
    Bun-side `headless.js`, beside the engine's sources `bake.js`, `clips.js`, `view.js`, `serialize.js` [H]; the page's
    `controls.js:18` imports `box/bake.js`.
24. **A general shell for one host.** `kernel/sandbox/frame.js` is written for "every host" (logic host, view host,
    math host, frame.js:7–33) but only `box/host.js` uses it: the non-`apart` path (frame.js stop on crash/timeout),
    the `wasm` option (`csp({wasm})`, no caller passes it) and `policy.js` `BUDGETS.logicJob/mathJob/message` serve
    hosts that do not exist.
25. **`cache.js` is a god file** (732 lines, 4 reasons to change): the build cache (`get/put/drop`), the level cache
    (`getLevel/putLevel/levelKeyOf`), the recipe/piece file store (`fileAt/keepFile`), picture encoding
    (`storable/revive/pixelsOf`, PNG via `cache.worker.js`), plus OPFS writer selection, LRU trim and use noting.
26. **Barrel chains**: `catalog.js:115` re-exports `builds.js`, which re-exports `hashText` from `game/hash.js`
    (`builds.js:11`); `render/crowd.js:20` re-exports `blend` from `../clips.js`; `kit.js:32` re-exports `THREE`.

### Surplus (no reason of its own to change)

27. **Dead exports** (no importer anywhere in play/site, scripts, tools, play/api):
    `cache.js` `bytesOf`, `storable`, `pixelsOf`, `revive`, `putRaw` ("for the lab"), `usage`, `fingerprint`;
    `builds.js` `checked` (+ its re-export in `catalog.js:115`); `params.js` `argsOf`; `engines.js` `enginePath`,
    `RECIPE_END`; `catalog.js` `assetIn`; `box/view.js` `catalogOf`; `box/host.js` `engineCode` (a wrapper that
    re-checks what `frame.js` `engineCode` already rejects) and `ROOMS` (exported only); `kernel/engines.js` `isFrozen`;
    `kernel/sandbox/engines.js` `FLOOR`, `WORKERS`, `engineFor`, `workerFor` (the whole "floor" mechanism, gap G6);
    `models/units.js` `CM`, `KM`, `REAL_SIZES` (its `sizes.test.js` is gone); `models/minidomes.js` `playDome`;
    `game/time.ts` `GAME_DAY_MS`, `gameAgo`, `calendarLabel`; `game/film/color.js` all but `REC709_TO_AP1`
    (`MID_GREY_CCT`, `PROFILES`, `ODT`, `exrHeader`, `exrProfile`, `detect`, `profileOf`); `game/film/camera.js`
    `curveName`, `keysFromFlight`; `game/film/shot.js` `shutterTimes`, `sameSpec`, `legacyStops`, `legacyLook`,
    `fromLegacy` (legacy `camera.mjs` shot lists); `game/film/worlds.js` `partsOf`; `schemas/index.js` `SCHEMAS`,
    `ASSET`, `CARD`, `check`, `checkText`. (Many more are exported but used only in their own file: `simplify.js` 14,
    `box/clips.js` 7, `box/bake.js` 8, `shot.js` 6: export noise, not dead code.)
28. **Dead files / pass-throughs**: `schemas/asset.v1.json` ("as the legacy store kept it", only re-exported as unused
    `ASSET`), `schemas/card.v1.json` (no importer), `schemas/schemas.json` (only feeds unused `SCHEMAS`; the
    `schemas.test.js` its comment cites does not exist); `kernel/sandbox/engines.js` (a pass-through once its dead
    floor goes); engine kinds `logic`, `view`, `view-worker`, `math`, `lib-*` in `engines.json` [H] with no served file
    (only `static/engines/engine-v1..5.js` exist).
29. **`game/places.js` (465 lines) is a legacy registry**: navigation, history, `gameOrder`, routes `/games/<id>/` that
    do not exist (routes has `sandbox-1..5`, `worlds`; no `games/`), worlds `sandbox-6`, `maiacity-v1`, `tired-land`
    with no page; only `.film` is read (`game/film/worlds.js:21–26`), and `filmPath` (41–47) builds links to the
    missing `/games/` routes.
30. **Stale doc pointers**: 64 references in 26 files (58 in 22 non-held files) to files that no longer exist:
    `aven/kernel/…`, `maia/content/…`, `maia/site/…`, `./vault.js`, `./recipes.js`, `./AssetViewer.svelte`,
    `box/plugin.js`, `logic-host`, `view/engine`, `schemas.test.js`, `sizes.test.js` (e.g. `load.js:7–8,97–99`,
    `box/host.js:7–13,37`, `engines.js:2–5`, `cache.js:18,…`).
31. **Legacy fallbacks**: `catalog.js:166` `r.id ?? r.slug`; `sources/biome.js:102–109` documents slug refs
    (`biomes/food-forest@2`) and `{entry, at}` object refs that `catalog.resolve` refuses (the `JSON.stringify(ref)`
    branch is dead); `lodcard.js:20–35` `OLD = 'detail'` (legit: keeps frozen versions' look; keep, but it is the one
    recipe parameter the renderer still names).
32. **Dead retry for an error nobody throws**: no code throws an error named `Unread` (the vault's server is gone), yet
    `render/crowd.js:46–84` keeps `AGAIN_AFTER`, `again`, `retried` and two `setTimeout` re-asks (180, 198);
    `render/index.js:49,261–280` [H] and `VaultAsset.svelte:93,310` [H] the same.

### Special cases (evidence of a missing design)

33. **Retry papering over the proxy**: `catalog.js:139–145` re-fetches `/api/catalog` after 1 s and 3 s on 502/503/504;
    no other play fetch does.
34. **Swallowed errors** (`catch {}` / `.catch(() => …)`) in non-held files: `cache.js` 22, `render/levels.js` 4,
    `box/view.js` 3, `kernel/sandbox/frame.js` 3, `catalog.js` 2 (281, 287), `load.js` 2 (165, 188),
    `box/pieces.js` 2 (54–56, 62), `sources/viewer.js` 2, `cache.worker.js` 2, `box/bake.js` 2, `box/clips.js` 2,
    `box/host.js` 1, `render/crowd.js` 1 — 48. Most are "the cache is never the truth" and deliberate, but none says so
    in one place; a broken cache is invisible.
35. **Lookup by slug (CLAUDE.md: every reference is a UUID or a hash)**: `soils.js:120–130` `SOIL_OF` keyed by biome
    slugs (`'food-forest'`, `'meadow'`…), called as `soilOf(id)` from `ground.js:509` [H]; `game/film/worlds.js:35`
    `DEFAULT_SANDBOX = 'sandbox-4'`, `WORLDS` keyed by `'sandbox-1'…'worlds'` (from `places.js` ids),
    `game/film/shot.js:68` `SETS = ['tired-land']`, `worldOfPath` (54–61) parsing a slug from a route.
36. **The renderer names a recipe parameter**: `render/crowd.js:84` builds `?detail=${FAR}` (0.2) for the far coat,
    against `lodcard.js`'s contract ("knows no parameter of any recipe by name"); an actor without `detail` fails
    (`valuesOf` throws "no parameter detail").
37. **Two box-pool policies**: `load.js:30–44` (`boxOf`, `liveBoxOf`: one box per engine) and `render/crowd.js:38–42`
    (n boxes by `hardwareConcurrency`, all on `INDEX.engine`).
38. **One parameter by name in the viewer**: `ViewerParts.svelte:58` `p.id === 'seed'` shows "New seed".
39. **A global patched from a loader**: `actors/dqs.ts:93–96` rewrites `THREE.ShaderChunk` for every skinned mesh,
    installed from `box/rebuild.js:16` [H] (data rebuild) rather than once where the renderer starts.
40. **The card schema is a JSON type in code** (`schemas/card.v2.json` + `check.js`), where CLAUDE.md says every type of
    document is a `schema:<uuid>` document. The card is the box's output, not a stored document, so this is arguably
    outside the rule; recorded so the owner decides (no fix proposed).

---

## Fixes (fewest that remove the most)

### F1. One way to load a build — problems 1, 2, 14 (part), 34 (part)
`sources/viewer.js` `vaultBuild` becomes a thin call into `load.js` (a shared `buildIn({ hash, values, box, store,
keep, phase })` that does engine choice by card, `heldTo`, cache key, cache hit/drop, box build, put, dedupe);
`buildName` goes (use `buildOf`). `vaultBuild`'s signature stays, so its callers (`VaultAsset.svelte` [H],
`worlds/view.js` [H]) are untouched. StoryPlayer's copy goes to the stories audit.
- Files: `content/assets/load.js`, `content/assets/sources/viewer.js`. **Not HELD.**
- Risk: the viewer would run a recipe on the engine its card names and enforce its manifest/contract — identical where
  card engine = index engine and the recipe is honest (all current ones, check with the catalog); add a vitest for
  `vaultBuild`/`loadAsset` with a stand-in `store` and box first (none exists).
- Bound: `grep -cE "checkCard|cache\.keyOf|store\.(get|put|drop)" content/assets/sources/viewer.js` = 0 (today 5);
  `grep -rc "^function open(" content/assets` total = 1 (today 2); `grep -rw buildName play/site/src` = 0.

### F2. One reader of play's files and catalog — problems 4, 15 (pieces→cache), 33, 34 (part)
One `playFile(hash)` (fetch `/api/files/<hash>`, hold to hash, keep in the cache, `null` on 404) and one `playJson(path)`
(with the 502/503/504 retry, if kept, applied to every play read) in a new `content/assets/files.js`; `catalog.recipeAt`
uses it, and `piecesFor` takes it as its `fileAt` from its caller (`host.build` passes what `catalog`/`load` hands it),
so `box/pieces.js` no longer imports `../cache.js`.
- Files: `content/assets/catalog.js`, `box/pieces.js`, `box/host.js`, new `files.js`. **Not HELD**
  (`stories/live-runtime.ts` [H] imports only `pieces.js` exports that keep their names).
- Risk: none to rendering; `box/pieces.test.ts` pins resolution (already injects `fileAt`).
- Bound: `grep -rc "/api/files/" content/assets --include=*.js` = 1 (today 2); `grep -c "cache" content/assets/box/pieces.js`
  imports = 0; graph `unstable` has no `content/assets/box → content/assets` edge from pieces.

### F3. Box engines live with the box; the kernel owns the hash — problems 7, 15 (host→engines), 20 (part), 26, 27 (engine part), 28 (pass-through)
Move `content/assets/engines.js` → `content/assets/box/engines.js` (importers: RenderBench, catalog, load,
sources/viewer, pieces.test, routes/worlds/bench — none HELD). Delete `kernel/sandbox/engines.js` (its only live part is
re-exports; `FLOOR/WORKERS/engineFor/workerFor` dead); `frame.js` imports `kernel/engines.js`. Move `game/hash.js` →
`kernel/hash.js`, leaving `game/hash.js` as a one-line re-export until `stories/compose.ts` [H] and
`stories/live-runtime.ts` [H] move (**HELD for that last step**). Drop `catalog`'s re-export of `builds.js` and
`builds`' re-export of `hashText` (importers named directly).
- Risk: none (paths and dead code). Pinned by `box/host.test.ts`, `box/pieces.test.ts`, census.
- Bound: graph `cycles` no longer lists the `assets ↔ assets/box` pair (with F2: box → assets edges = 0 from today 3);
  `kernel/sandbox/engines.js` deleted; `kernel → content/game` edges = 0 (today 1); `grep -c "export {" catalog.js builds.js` = 0.

### F4. One build-name grammar, one hash — problems 3, 5, 6
`builds.js` exports `HASH` (`/^[0-9a-f]{64}$/`) and the build regex; `catalog.resolve`, `cache.levelKeyOf`, `cache` `HASH`,
`uses.USE`, `pieces.PIECE`, `headless.js` and `game/film/shot.js` use them. `headless.js` `hashOf` → `hashText/hashBytes`;
its `runner` evaluates the same loader `withPieces` writes (`new Function` over `withPieces(code, pieces)` with a
`defineRecipe` shim), so piece resolution is written once.
- Files: `builds.js`, `catalog.js`, `cache.js`, `uses.js`, `box/pieces.js`, `box/headless.js`, `game/film/shot.js`.
  `plantings.js:36` [H] left (**HELD** for that one copy).
- Risk: `headless` change touches `tools/motion` runs (not census); pieces.test.ts covers `withPieces`.
- Bound: `grep -rcE "\[0-9a-f\]\{64\}" content/assets content/game kernel --include=*.js` (non-held) ≤ 2 (today 12);
  `grep -c blake3 content/assets/box/headless.js` = 0.

### F5. Dead code out — problems 27, 28, 31, 32 (crowd part), 26 (crowd `blend` re-export kept: it is used)
Delete every export listed in 27 (except engine-side `box/*` internals), `schemas/asset.v1.json`, `card.v1.json`,
`schemas.json` and `SCHEMAS/ASSET/CARD/check/checkText` re-exports (decide first: the "frozen, never taken out" rule has
no test and nothing reads the list), `catalog.js:166` `?? r.slug`, `sources/biome.js` dead object/slug ref branch and
docs, `render/crowd.js` `Unread` retry (`AGAIN_AFTER`, `again`, `retried`, both re-ask timers).
- Files: cache.js, builds.js, params.js, engines.js, catalog.js, box/view.js, box/host.js, kernel/engines.js,
  models/units.js, models/minidomes.js, game/time.ts, game/film/{color,camera,shot,worlds}.js, schemas/*,
  sources/biome.js, render/crowd.js. **Not HELD.** (`render/index.js`/`VaultAsset.svelte` `Unread` → HELD, U3.)
- Risk: none to rendering (no caller). crowd retry: a failed build now stays failed for the page — it already did,
  since nothing raises `Unread`.
- Bound: the dead-export script (`scratchpad/audit/deadexp.sh`) reports 0 of the names in 27; 3 schema files deleted;
  `grep -c Unread content/assets/render/crowd.js` = 0 (today 2); `grep -c slug content/assets/catalog.js` = 0.

### F6. The film registry by UUID, the legacy places gone — problems 29, 35 (film part), 21 (part)
Shrink `game/places.js` to the film worlds that exist (worlds with a page), keyed by sandbox UUID
(`content/assets/sandboxes.js` `SANDBOX`) and the asset UUID for `worlds`; `filmPath`/`worldOfPath` only for real
routes; drop navigation/history/gameOrder and `SETS = ['tired-land']`. Fold `game/film/worlds.js` into it.
- Files: `game/places.js`, `game/film/worlds.js`, `game/film/shot.js`, `content/worlds/worlds.test.ts` (not held).
  `maiacity-v2/world.js` [H] uses only `camera.js`/`reel.js` names that stay.
- Risk: shots stored with `world.sandbox: 'sandbox-4'` (stories, films) must be read: check play's stories for
  `world.sandbox` values first; `worlds.test.ts` pins `filmPath`/`normalize`.
- Bound: `wc -l game/places.js` ≤ 120 (today 465); `grep -cE "'sandbox-[0-9]'|tired-land|maiacity-v1" content/game -r` = 0.

### F7. One seeded random — problems 10, 22
`assets/seeded.js` becomes a re-export of `sandbox-kit/random.js` `seededLcg` (identical numbers if its zero-seed
guard matches; check), `models/timber.v1.js` imports `sandbox-kit/random.js`; `minidomes.js` uses `seededRandom`
(identical for seeds ≠ 0: keep the `|| 1` guard or check its seeds); `van.js` and `factory.ts` LCG copies use
`seededLcg`. Delete `seeded.js` once `sandbox-2/interior/plants.ts` [H] moves (**HELD** for that step; also
`textures.ts` [H]). `box/clips.js:52` is engine-frozen and an `imul` variant: leave.
- Risk: same algorithm, same numbers — add a vitest comparing the first 1,000 values of each replaced copy with
  `random.js`; census pins the worlds.
- Bound: graph has no `content/models → content/assets` edge (today 1); `grep -rc 1664525 play/site/src/lib --include=*.js --include=*.ts`
  outside `random.js` and `box/clips.js` = held copies only.

### F8. A shell for the box, not for hosts that are gone — problems 24, 27 (kernel part)
`frame.js` drops the non-`apart` path and the `wasm` option; `policy.js` drops `logicJob`, `mathJob`, `message` (keep
`frameCsp`, used by `stories/compose.ts`); comments name only the box.
- Files: `kernel/sandbox/frame.js`, `kernel/sandbox/policy.js`. **Not HELD.**
- Risk: none to rendering; `box/host.test.ts` pins rooms/timeouts, `stories/compose.test.ts` pins `frameCsp`.
- Bound: `grep -cE "logicJob|mathJob|wasm|apart" play/site/src/lib/kernel -r` = 0 (today ≥ 8).

### F9. Split the device cache by what it keeps — problems 25, 34 (cache part)
After F5, `cache.js` → `cache/store.js` (OPFS folder, writer, LRU, `fileAt/keepFile`), `cache/builds.js` (`keyOf`,
`get/put/drop`, packing, pictures), `cache/levels.js` (`levelKeyOf`, `getLevel/putLevel`); one `quiet(why, p)` helper
for the deliberate swallows, so each says why.
- Files: `content/assets/cache.js`, `cache.worker.js`, importers `load.js`, `catalog.js`, `render/levels.js`,
  `sources/viewer.js`, `box/pieces.js` (none HELD). Cache keys (`CONTEXT`, `LEVELS_CONTEXT`) unchanged, so stored
  entries stay valid.
- Risk: cache keys must be byte-identical; `render/levels.test.ts` pins the level store; add a keyOf golden test.
- Bound: no file under `content/assets/cache*` > 350 lines (today 732); `grep -rcE "catch \{|\.catch\(\(\) =>"` over
  the area's non-held files drops from 48 to ≤ 15, the rest through the named helper.

### F10. Break biomes ↔ render/nodes — problem 18
Move the generated scan list `biomes/sets.js` → `render/nodes/ground-sets.js` (or have `ground.js` take `SETS` from
`surfaces.js` by parameter); update `tools/ground-sets/make.mjs:23` and `biomes/surfaces.test.js`. Then render/nodes no
longer imports biomes (non-test).
- Files: `biomes/sets.js`, `render/nodes/ground.js`, `biomes/surfaces.js`, `biomes/surfaces.test.js`,
  `tools/ground-sets/make.mjs`. **Not HELD**; the test edges `tsl.test.js`, `stream.test.ts` are (**HELD**, U10), so the
  graph's module cycle persists until those move.
- Risk: none (same data); `surfaces.test.js`, `nodes.test.ts` [H] and census pin it.
- Bound: `grep -c "biomes/" content/render/nodes/*.js` excluding tests = 0 (today 1).

### F11. Doc pointers that point somewhere — problem 30
Rewrite the 58 stale references in 22 non-held files to the files that exist (or drop them).
- Bound: `grep -rEo "aven/kernel|maia/content|maia/site|\./vault\.js|recipes?\.js|AssetViewer\.svelte|box/plugin\.js|logic-host|view/engine|schemas\.test\.js|sizes\.test\.js"`
  over the non-held files of the area = 0 (today 58; 6 more in held files).

### F12. Small hidden-link pins — problems 8, 11, 13
`clips.js` imports `WIDTH` from `box/clips.js`; a test in play/api (or a shared JSON both read) asserts site
`SANDBOX` = api `SANDBOX`; `game/code/index.js` exports `configKey(id, name)` used by `catalog.js`.
- Bound: `grep -c "WIDTH = 7" content/assets -r` = 1; `grep -c "configs/\${" content/assets/catalog.js` = 0.

---

## Next untangles (HELD)

- **U1. Content imports the app (problem 19).** Move `site/app/turntable.js`, `Turntable.svelte`, `versions.js` (and
  `site/touch/TouchStick.svelte`) to a kit folder below both (`lib/kit/`), imported by `VaultAsset.svelte` [H],
  `content/assets/viewer.js` [H], `biomes/index.js` [H]. With the stories area cutting `stories/old-city.test.ts →
  scripts/box-worker.ts`, this removes the 16-module cycle. Bound: graph `modules` shows no `content/* → site/app` edge.
- **U2. Soil by biome slug (problem 35).** The biome's card names its soil (`card.soil`, a soil id of `soils.js` or a
  UUID) read through `biomes/card.js` [H] and passed by `ground.js` [H] instead of `soilOf(slug)`. Identical rendering
  if each current biome card gets the soil `SOIL_OF` gives it today. Bound: `SOIL_OF` deleted.
- **U3. `Unread` dead retry** in `render/index.js:49,261–280` [H] and `VaultAsset.svelte:93,310` [H]. Bound: `grep -rc Unread content/assets` = 0.
- **U4. One reading of a card's levels (problem 12).** `/api/catalog` returns the normalized `lod` (`play/api/src/lod.ts` [H]
  owning the old-`detail` rule) and `lodcard.js` keeps only `levelValues`; or one shared module. Pinned by
  `render/levels.test.ts`, census.
- **U5. Film colour in one place (problems 9, 21).** Fold `game/film/color.js`'s one used export into
  `content/film/pipeline.js` [H] and generate the GLSL ACEScct constants from the JS ones; then `content/film` ↔
  `content/game/film` and `render/film.js` [H] are one module.
- **U6. Dissolve `sources/` (problem 17).** After F1, `sources/viewer.js` → `load.js`, `sources/biome.js` →
  `content/assets/biome.js`; importers `VaultAsset.svelte`, `worlds/view.js`, `sandbox-2/interior/{interior,village}.ts` [H].
  Bound: folder `content/assets/sources` gone, `assets ↔ assets/sources` out of the cycle.
- **U7. The renderer behind a narrow interface (problems 16, 37).** `render/index.js` [H] takes `{ loadAsset, canonical,
  catalog }` from its caller (or `render/` is declared part of `assets/`), `plantings.js` [H] stays the only upward user;
  move `render/crowd.js` out of `render/` (importers `sandbox-2/interior/{animals,interior,village}.ts` [H]) and give it
  `load.js`'s box pool. Bound: graph `unstable` no `assets → assets/render` and `assets/render → assets` pair.
- **U8. Crowd's far coat by the card's levels (problem 36).** Replace `?detail=0.2` with `levelValues(lodOf(card))`'s
  coarsest — **changes what is drawn** for actors whose card declares other levels: measure with census and a world
  shot before/after.
- **U9. Engine manifest kinds with no file (problem 28).** Drop `logic`, `view`, `view-worker`, `math`, `lib-*` from
  `kernel/sandbox/engines.json` [H] (or ship their files); `play/api/src/engines.ts` and `kernel/engines.js` then read one
  kind. Bound: every manifest entry has its file under `static/engines/`.
- **U10. Integration tests above the modules (problem 18).** `render/nodes/tsl.test.js` [H] (→ `assets/ground.js`,
  `biomes/surfaces.js`) and `biomes/stream.test.ts` [H] (→ `render/nodes/index.js`) move to a tests folder above both,
  so the biomes ↔ render/nodes ↔ assets cycle is gone from the graph too.
- **U11. `seeded.js` deleted (problem 10)** once `sandbox-2/interior/plants.ts` [H] and `textures.ts` [H] use
  `sandbox-kit/random.js`.
- **U12. Dual-quaternion skinning installed once (problem 39)** where the renderer starts, not from
  `box/rebuild.js` [H].
- **U13. Sandbox 3's own code beside it (problems 20, 21).** `game/maiacity-v2/engine.js`, `game/film/{camera,reel}.js`,
  `models/units.js` `SPEED` are used only by `content/maiacity-v2/world.js` [H]: move them into `content/maiacity-v2/`.
- **U14. `game/hash.js` re-export removed** once `stories/compose.ts` [H] and `stories/live-runtime.ts` [H] import
  `kernel/hash.js` (F3's last step).
- **U15. StoryPlayer's third loader** (`stories/StoryPlayer.svelte:119–143`, not held): stories' audit — use
  `load.js` (`loadAsset` with a hash) so a world shot's build is card-checked and held to its manifest like any other.
