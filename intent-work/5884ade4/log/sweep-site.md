# Sweep of play/site (fixes 4, 5 and 7, and the layers left): the moves

Branch `intent/5884ade4-u-sweep-site`, from `intent/5884ade4-untangle` 2a93b59 (fixes 1, 2, 3 and 6 merged). Held set
refreshed with `held.sh` from `held-intents.txt` before each commit (153 files, 131 of them in play/site).

Before, play/site's non-held files: layers 16 (all of the repo; at most 10), swallowed errors 17 (src 15, scripts 2),
`as any` 34 (src 20, scripts 14), comment lines 6,095; the 11 dead exports, 9 of them play/site's.

## Moves

1. **The site's client and scripts take the hash from the kernel** (layers: `lib → content/game`). `lib/api.ts`,
   `scripts/{world-shot,webkit-world,box-worker}.ts` and two stories tests imported `hashText`/`hashBytes` through
   `content/game/hash.js`, a re-export of `kernel/hash.js`; they import the kernel now. The re-export stays for the
   held `stories/compose.ts`, `stories/live-runtime.ts`, `scripts/live-runtime.ts` and their tests. Pinned: the same
   functions (one `export *`); gate site, `stories/{inputs,world}.test.ts`.
2. **The intents' modal state to `site/app`** (layers: `site/app → site/intents`, and with it `site/intents →
   content/worlds`). `intents.svelte.ts` holds only whether the board's modal is open and its focus: the nav pill's
   state, as `pill.svelte.js` and `back.svelte.js` beside it. In `site/app` the stabler folder no longer leans on the
   board's; `site/intents` rises to I=0.73, above `content/worlds` (0.67), so BuildView's and IntentDetail's
   WorldStage are no longer an upward import. Pinned: the same module, moved; gate site, `src/lib/site` tests (56).
3. **Each dome-cell page pinned beside itself** (layers: `routes/sandbox-1 → content/sandbox-2/interior`). Sandbox 5's
   test imported Sandbox 1's page, which made `routes/sandbox-1` a folder something leans on (I=0.80, below the
   interior's 0.83). Each page's served-HTML snapshot now sits in its own route's `page.test.ts`; the two snapshots are
   byte-identical to the one file's before.
4. **Playwright looked for, no other error swallowed** (special: swallowed, scripts 2 → 0). `scripts/render.mjs` and
   `scripts/flyover/flyover.mjs` tried each place Playwright may be installed with an empty `catch`: a broken install
   was taken for none. Now only `MODULE_NOT_FOUND` (Node's and Bun's code for it, checked) moves to the next place;
   anything else is thrown. Pinned: `node --check`; both are run by hand (`bench-smoke.sh`, the flyover's lists).
5. **`span` and `took` into `lib/format.ts`** (layers, with move 6: `site/intents → stories`). `site/intents/took.ts`
   said how long something took, for the intent detail and the delivery page: a way of writing a number, beside
   `format.ts`'s dates. The delivery route no longer leans on the board's folder. Pinned: the same functions, moved;
   gate site, `src/lib/site` tests; svelte-check's errors unchanged (13, all in held files, `pieces` and vite.config).
6. **Pages' addresses to `lib/address.ts`** (layers: `site/intents → stories`, with move 5). `app/address.ts` imports
   nothing and is read by stories, the board, the library and three routes: it is the site's kit, not the app shell's.
   `stories` stops leaning on `lib/app` (Ce 13 → 12, I 0.81 → 0.80) and `site/intents` (I 0.80 after move 5) no
   longer imports a less stable folder. Pinned: the same module, moved; gate site, `site` and `stories/timeline` tests.
7. **play/site's dead exports** (dead: 9 of the 11). Recipes and pieces reach the box only through `require` of
   three.js, its addons and pieces by hash (every `require(` in play/api/import and tools, counted), never the box's
   own modules, so nothing outside could read these. Un-exported, each still used in its own file: `box/bake.js`
   `SAMPLES`, `SLOTS`, `materialsOf`; `box/clips.js` `LOOP`, `GAIT_LOOP`, `SEAM`, `PACES` (`SEAM` in play/api/import
   is a recipe's own colour); `schemas/check.js` `LIMITS`. Gone: `schemas/index.js` `SCHEMAS` (nothing read it; its
   `schemas.json` stays, the frozen record its comment names). Pinned: the live runtime built by
   `scripts/live-runtime.ts --out` before and after differs only by the `SCHEMAS` data (Bun's bundle strips comments
   and scopes the rest the same); gate site; `content/assets` and `worlds` tests (38).
   The 2 left are the api's (`play/api/scripts/heavy.ts` `hostSource`, `play/api/src/ship.ts` `Pending`). Of the 12
   dead files, the 5 still there are all outside play/site (`deploy/deploy-time.ts`, kept by infra as a check's `run`;
   `play/api/scripts/{board-speed,detail-size,seed-look}.ts`, `play/api/import/plan.ts`): not this sweep's.
8. **One keeper of what the browser keeps, `lib/kept.ts`** (special: swallowed, 2 of src's). The board's folded
   columns and whom one acts as each wrapped localStorage in their own try (the board's two empty). localStorage
   throwing in a private window or with site data blocked is the browser's, said once in `kept.ts`: `kept`, `keptJson`
   (a value that isn't JSON reads as none, as the board's parse did), `keep`. Pinned: `kept.test.ts` (no storage,
   storage that throws, a round trip, bad JSON); gate site, `src/lib/site` tests.
9. **Sound and video start as the browser allows, `kernel/media.js`** (special: swallowed, 4 of src's). The calls'
   player, the dome's ambience (×2) and the Library's hover preview swallowed every rejection of `play()` and
   `resume()`. The autoplay policy's `NotAllowedError` and a superseded play's `AbortError` are the browser's and stay
   quiet; anything else (a source it can't play, a closed context) is now said with `console.warn`.
   `playIfAllowed`, `resumeIfAllowed`; the ambience's resume, already handled, takes the same. Pinned:
   `media.test.js`; gate site; svelte-check unchanged.
10. **The cache worker's writes answered in their own line** (special: swallowed, 1). Writes go one after another;
    the chain was kept alive by a swallowing copy of each write while the handler awaited the original. Now each
    write's answer, `ok` or its error, is posted from the chain itself, which so never rejects. The probe's clean-up
    (`removeEntry` of the one byte written to see whether the browser keeps files) stays a best-effort, said so.
    Pinned: `cache/cache.test.ts`; gate site.
11. **The shot and parity scripts typed** (special: `as any`, scripts 14 → 1). `intent-shots.ts` looked its
    fixtures up as `any` (×6): `assetOf`/`storyOf` index the fixtures by their own keys. `story-parity-page.ts` and
    `story-parity.ts` (×7) passed the player and its readiness through `window as any`: the player is HyperFrames'
    own `HyperframesPlayer` type, and what the runner reads of the page is one exported type, `ParityWindow`
    (`import type`, erased). Pinned: `tsc --strict` over the three scripts shows no error on any line changed (the
    scripts have no checked tsconfig of their own; the errors it shows are Bun's and Node's globals, as before).
    The one left, `census/away.test.ts`'s `globalThis as any`, stands in for browser globals in a test.
12. **Two content failures said, not swallowed** (special: swallowed, 2). A world's sound loop whose recording could
    not be read or decoded (`worlds/sound.js`) and a Sandbox 3 build whose recipe could not be read
    (`maiacity-v2/drawn.js`: it stays drawn but doesn't run) were dropped silently; each now goes on as before and
    says so with `console.warn`. Pinned: census-same, same for all three worlds; gate site.
13. **The pages' `as any` typed** (special: `as any`, src 20 → 14). The Stories player's full screen (×4) names
    WebKit's prefixed API (Safari on iPhone has only that) as a type of its own; the map's film hook is
    `window.__mapFilm` typed as there; Sandbox 3 hands `createWorld` its options as `Parameters<typeof createWorld>[1]`
    (world.js, held, types them by their defaults, whose `onRoam` takes no argument). Types only: svelte-check's
    errors unchanged; gate site. Left: 13 in tests (stand-in globals and partial fixtures) and one comment's
    "as any other" (`render/simplify.js`).
14. **The six swallows left each say why** (comments only). play/site's swallowed errors are 6 (src 15 → 6, scripts
    2 → 0), each about something outside its line: the cache worker's probe byte (a best-effort clean-up), the box's
    and the story worker's `end` of a session whose worker may be gone, the shell's `halted` (a stop after its start
    has no race left), and two warm-ups (`crowd.js`, `drawn.js`) whose failure is said where a build is asked for.

## Comments (fix 7), one folder a commit, comments only

Each commit changes comment lines alone: every changed `.js`/`.ts` file compiles to the same code before and after
(Bun's transpiler with whitespace minified; a script of this sweep), every changed `.svelte` file's text is the same
without its comment and blank lines; gate site and the folder's tests after each. Kept: a person's decision with its
date, a browser's, GPU's or library's behaviour, a measured number and where it came from, a SPEC section, why a
number is what it is. Gone: the module headers that retell the algorithm below them, docs that restate a function's
name and body, `// the next thing` lines.

15. **`content/assets/render`** (136 lines): `simplify.js`'s 48-line header, its retelling of each pass, and its
    step-by-step `//` lines; `crowd.js`'s header and the docs of its sets and helpers (the stale
    `maia/content/film/warm.js` gone with it); `prepare.js`'s and `lower.js`'s headers (the LifeTrac's measured
    437,713 corners kept). Its one "as any other" went with the header.
16. **`content/sandbox-kit`** (52): the headers of `film.js` (the film contract's three rules kept), `walker.js`,
    `stream.js` (why one build at a time kept) and `universe.js` (WebGPU's one-pixel points kept), each retelling its
    module; the legacy `maia/content/film` names went with them.
17. **`content/game/film`** (47): `shot.js`'s header spelt the spec out a second time beside its `Spec` typedef
    (what the typedef can't say kept: the clock rule, the fov's axis, middle grey, the CB60's history); `camera.js`'s
    listed the kinds beside its `CameraKind` typedef, and named `maia/content/scripts/film/camera.mjs`, gone.
18. **`content/assets/box`** (45): the headers of `bake.js`, `clips.js`, `host.js` and `pieces.js` each to what the
    module guarantees and why (no function leaves the box; the box loads nothing; a recipe dies alone; pieces held to
    their hash, SPEC §4.5), not how each step goes. The numerical docs of `clips.js`'s functions stay.
19. **`content/assets/cache`** (36): the headers of `cache.worker.js`, `builds.js` and `store.js` (kept: OPFS's
    synchronous files only in workers, WebKit's workers without OPFS, a GPU read-back taking seconds, the key's
    formula, Samuel's 2026-10-20 IndexedDB decision) and `store.js`'s docs naming a constant or a function again.
    `packed.js`'s header is the entries' file format, kept whole.
20. **`content/assets`** (34): the headers of `controls.js`, `load.js` and `params.js` to what each holds (the recipe
    the one truth, H4's held contract, one name for every build); `catalog.js`'s docs that named its maps and helpers
    again. `soils.js` (a soil scientist's horizons) and `lodcard.js` (the LOD contract, intent 6295a650's measured
    48 %) are about what is outside the code, kept.
21. **`content/maiacity-v2`** (27): `drawn.js`'s header retold its three ways of drawing step by step; `van.js`'s
    listed every seat, curtain and gauge the code below builds (Samuel's 2026-10-13 words and the van's frame kept).
22. **`content/sandbox-2/interior`** (34, non-held files only): the headers of `flora.js`, `ambience.ts` (streamed, not
    decoded, and Range kept) and `sandbox5.js` (Samuel's 2026-10-20 pin kept), and three docs of `factory.ts` naming
    their constant again. `factory.ts`'s solar-line recipe, `rooms.ts`'s Waldorf rooms and `solo.js`'s measured
    chamfer error are about the world outside the code, kept.
23. **The JSDoc types dropped with their prose, put back** (comments only). Moves 15, 19 and 20 took six one-line
    docs whose `@param` gave plain-JS functions their types for the TypeScript that imports them (`catalog.js`'s
    `withQuery`, `hashOf`, `paramsOf`, `buildAt`; `store.js`'s `ask`; `crowd.js`'s `labelOf`): each is back as a bare
    `/** @param … */`. The sweep's edit script now refuses to drop a line carrying a type. svelte-check unchanged.
24. **`kernel/sandbox`** (8): `frame.js`'s rooms and failures said once (host.js says them for the box), the "logic
    host" (gone) no longer named; two docs naming `start` and `stop` again. The browser's guarantees (opaque origin,
    a blob worker inheriting its maker's CSP, Safari's sandboxed frame on the page's thread) kept.
25. **`content/factories`** (30, our files only): the headers of `lifetrac-kit.js` (its list of the machines defined
    below), `assets.js` and `index.js`, keeping the dates, Samuel's 2026-11-04 decision and the OSE v25 source. AirSup's
    `world.js`, `kit.js` and `des.js` are kept "line for line theirs" (their header says so; MIT): not touched.
26. **`content/models`** (10): `minidomes.js`'s header listed every perch and egg its builders' own docs describe.

## Where the bounds stand (play/site's non-held files)

| | before | after | asked |
|---|---|---|---|
| layers (`measure.ts layers`, whole repo) | 16 | 11 | ≤ 10 |
| dead exports in play/site | 9 | 0 | 0 |
| dead files of the 12 still there | 5 | 5, none in play/site | ≤ 4 |
| swallowed errors | 17 (src 15, scripts 2) | 6 (src 6) | ≤ 6 |
| `as any` | 34 (src 20, scripts 14) | 14 (src 13, scripts 1) | ≤ 15 |
| comment lines | 6,095 | 5,659 | ≤ 5,500 |
| comments naming a file gone | 0 | 0 | 0 |

- **layers, 11.** Of the 11, the one left that only play/site's non-held code holds is `lib/app → content/assets`
  (AssetLibrary.svelte: catalog.js, VaultAsset, Parts). Moved into content/assets it was measured (13: content/assets
  turns more stable than box, cache, biomes, render/nodes and sandbox-kit, each then an upward import); a folder of
  its own keeps the pair (8 routes make it stable). The real fix is the render kit below both (site-assets U1, held
  files: VaultAsset.svelte, render/index.js). `lib/app → $wire` is a type-only import of the API's own types, fix 2's
  design: a site-side copy is what fix 2 removed, and any home for wire.ts imports `play/api/src` (I ≥ 0.17).
  Held: `lib → content/assets` (recipes.ts is the re-export the held census/run.ts imports), `content/assets →
  render, sources` (plantings.js, VaultAsset.svelte), `box → cache` (cache/store.js reads render/budget.js, held),
  `content/render → film, nodes` (render/film.js, core.js), `render/nodes → content/assets` (the ground's TSL test:
  moved beside ground.js it measured `render/nodes → biomes` instead, through the held render/nodes/ground.js),
  `stories → scripts` (old-city.test.ts). `play/api/src → docs` is the api's.
- **dead.** The 2 exports left are the api's (`heavy.ts` `hostSource`, `ship.ts` `Pending`); the 5 dead files left
  are `deploy/deploy-time.ts` (kept by infra: a check's `run`), `play/api/scripts/{board-speed,detail-size,seed-look}.ts`
  and `play/api/import/plan.ts`: not play/site's.
- **comments, 5,659.** 333 of them are in AirSup's `factories/{world,kit,des}.js`, kept line for line theirs; without
  them play/site has 5,326. What is left past the bound is, read file by file: data formats and contracts other code
  or people author against (the world contract, a shot's and a live shot's formats, packed.js's file format, the
  film contract), security guarantees with the browser's behaviour (frame.js, policy.js, markdown/index.js, host.js),
  measured numbers and their sources, decisions with their dates, the physics labs' solver notes, and the scripts'
  usage (how a person runs each and what it writes). Taking another 160 would take those.

## Runs

Gate site after every code commit (green, 6–11 s); svelte-check's errors the same 13 throughout (held tests,
`routes/pieces`, vite.config.ts); census-same after the drawing moves: same for Sandbox 1 (near, mid, far), Sandbox 3
and the Worlds page. Comment commits: every changed file compiles to the same code (Bun's transpiler, whitespace
minified; `.svelte` text without comment lines), checked before each. Full `bunx vitest run` at the end: 452 tests,
447 passed, the 5 failing all `lib/stories/old-city.test.ts` (Bun's `import.meta.dir` under vitest), as on main.

## Next untangles

- The render kit below `lib/app` and `content/assets` (AssetLibrary's catalog, VaultAsset, Parts): with VaultAsset
  and render/index.js free, the asset viewer's parts move to it and `lib/app → content/assets` goes.
- `cache/store.js`'s small-device wait reads `render/budget.js` (held): passed in by the cache's callers, `box → cache`
  goes.
- `lib/recipes.ts`, once census/run.ts imports `catalog.js` itself.
- `kernel/sandbox/policy.js` keeps `logicJob` and `mathJob` budgets for hosts that are gone (no reader).
