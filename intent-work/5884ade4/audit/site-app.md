# Untangle audit: site-app (play/site application layer)

Area: `play/site/src/routes` (47 files), `play/site/src/lib/{site,app,stories,kernel}`, `play/site/src/lib/*.ts|*.svelte`.
Read at origin/main (detached), nothing changed. Paths below are relative to `play/site/src/` unless they start with
`play/`. HELD files: `lib/stories/compose.ts`, `lib/stories/live-runtime.ts`, `routes/game/map/scene.ts` (and, by the
held list, `lib/content/assets/VaultAsset.svelte`, the only caller of Turntable).

**What pins behaviour today:** only `bun run build` of play/site runs in CI and in `play/avenbox/gate.sh` (gate.sh:106,
play-checks.yml:59-64). The site's vitest suites (`lib/site/intents/{board,detail,detail-loads}.test.ts`,
`lib/diff.test.ts`, `lib/stories/{compose,world,timeline,world-build,old-city}.test.ts`,
`routes/game/map/{map,city}.test.ts`, `routes/game-editor/levels.test.ts`) and `svelte-check` run only when someone runs
them. A type copy that drifts, or a component that breaks, is caught by nobody (problem 30 is one that slipped through).

---

## Problems

### Hidden links (must change together; the code does not show it)

1. **Intent wire types copied from play/api.** `lib/site/intents/detail.ts:12-36` re-declares `ShipStep`/`Ship`
   (api `ship.ts:42-75` `Step`/`Ship`), `Check`/`Spec` (api `intents.ts:37-39`), `Sub` (api `substate.ts:14`), `PrSeen`
   (api `substate.ts:19`), `Dep` (api `intents.ts:193`), `StepBack` (api `stepback.ts:18` `Step`), `Stage` (api
   `intents.ts:28-29` `INTENT_STAGES`/`IntentStage`), `Work` (api `work.ts:23`, a different shape under the same name).
   The file says so itself (detail.ts:8: "kept here too").
2. **Story wire types copied.** `lib/stories/timeline.ts:5-15` `Clip`, `Track`, `StoryBody`, `Linked`, `Links`,
   `LinkedBy`, `Story` = api `stories.ts:55-66` (drift already: site `Track` has `duck`/`name`, api's has not).
   `lib/stories/StoryChanges.svelte:7-9` `Change`, `StoryDiff` = api `stories.ts:733-737`.
   `routes/stories/+page.svelte:20` `Item` = api `stories.ts:67` `StoryItem`.
3. **Versioned-document wire types copied.** `lib/app/Changes.svelte:12-16` `Change`, `Edit`, `PinChange` = api
   `docs/core.ts:142,215` and `sandboxes.ts:177`; `lib/site/intents/IntentsBoard.svelte:190-197` `DocReview`/`Review` =
   api `versioned.ts` reviewDoc's answer; `lib/site/intents/opened.ts` `Listed`; `lib/app/Aside.svelte:14` `Ref`. Two
   unrelated types are both called `Change` (Changes.svelte vs StoryChanges.svelte).
4. **Page-local wire types for every other endpoint.** `routes/library/+page.svelte:23-28` (= api `library.ts:24-28`),
   `routes/artifacts/+page.svelte:24-37` (6 types, api `artifacts.ts`), `routes/delivery/+page.svelte:16-26` (7 types, api
   `delivery.ts`), plus factories (6), schemas (5), rules (4), postgres (3), pieces (3), sandboxes/[id] (3). 121 object
   types are declared in the area; most mirror an API answer.
5. **The asset chain's wire shape copied three times.** `lib/app/AssetLibrary.svelte:24-27` (`Listed`, `Version`,
   `Chain`), `routes/worlds/+page.svelte:21-23` (same three, fewer fields), `lib/stories/StoryPlayer.svelte:109-116`
   (read untyped as `any`).
6. **"The recipe a version builds by default" copied three times**, already drifted: `AssetLibrary.svelte:97` and
   `routes/worlds/+page.svelte:69` (`recipe ?? defaultVariant's ?? variants[0]`), `StoryPlayer.svelte:115` (no
   `variants[0]` fallback).
7. **The asset groups in four places.** api `groups.ts:6`, `lib/app/groups.ts:7-17` (key, label, href, icon),
   `IntentsBoard.svelte:200` `GROUP_TYPE`, `IntentDetail.svelte:61` `GROUP_TYPE` (a copy of the board's: `actors` is
   "Actor" there and "Animals" in groups.ts; `sandboxes` is in it though it is no group).
8. **The intent stages in five places.** `IntentsBoard.svelte:73-81` `COLUMNS`, `detail.ts:14,38` `Stage`/`STAGE_NAME`,
   `board.ts:6-8` `OPEN`/`CLOSED` (= api `intents.ts:31` `OPEN_STAGES`), `routes/delivery/+page.svelte:16` `Stage`,
   `routes/skills/+page.svelte:22` `STAGES` — stale: it lists `'prototype'` instead of `'build'`, so the Skills page never
   shows a skill's Build-stage text (line 97 filters on it). A live bug.
9. **Intent kind names twice:** `IntentsBoard.svelte:65-69` `KINDS`, `IntentDetail.svelte:55` `KIND_NAME`.
10. **The proxy's "no answer" statuses twice:** `lib/api.ts:10` `GATEWAY = {502,503,504}` and
    `lib/site/intents/decide.ts:16` `noAnswer` (`[502, 503, 504]`).
11. **`/api/files/<hash>` built by hand in 9 places, and "fetch and hold to its hash" written 3 ways.** URL:
    `lib/site/media/url.ts:10` (`asset()`, the one helper), `lib/stories/compose.ts:44` `fileUrl` (HELD),
    `StoryPlayer.svelte:88` `frameUrl`, `routes/library/+page.svelte:53` `url`, `IntentsBoard.svelte:209`,
    `lib/call.ts:27`, `AssetLibrary.svelte:204`, `routes/stories/+page.svelte:99`, `routes/artifacts/+page.svelte:289`.
    Fetch+verify: `StoryPlayer.svelte:120` `fileText`, `StoryPlayer.svelte:200` (inline, again), `kernel/sandbox/frame.js:46`
    `frozen`; `IntentsBoard.svelte:208` fetches a file's text without verifying it.
12. **Date formatting copied 9 times**, each a little different: `IntentsBoard.svelte:179,181`,
    `IntentDetail.svelte:57,58` (identical copies of the board's), `lib/app/History.svelte:104`,
    `lib/app/Changes.svelte:73`, `routes/library/+page.svelte:59`, `routes/artifacts/+page.svelte:79`,
    `routes/delivery/+page.svelte:52`.
13. **Small display helpers copied:** initials at `routes/+layout.svelte:114`, `lib/site/app/NavPill.svelte:53`,
    `IntentsBoard.svelte:183`; an edit's "via MCP / imported / merge" at `History.svelte:240` and `Changes.svelte:115`;
    `titleOf(work)` at `IntentsBoard.svelte:206` and `IntentDetail.svelte:60`.
14. **The document page copied seven times.** `routes/skills/+page.svelte:24-54`, `routes/schemas/+page.svelte:27-60`,
    `routes/pieces/+page.svelte:20-48`, `routes/game-editor/+page.svelte:27-56`, `routes/sandboxes/[id]/+page.svelte:29-61`,
    `routes/factories/+page.svelte:46-79`, `routes/rules/+page.svelte:23-61`: each lists `/docs?kind=<k>`, reads
    `/docs/<id>?intent=|?v=`, builds its own `at()` address, its own `picked(Pick)` (`?edit=<seq>`), its own admin gate and
    Aside wiring. The `?intent=|?v=` query is spelled out inline twice more (`game-editor:53`, `factories:76`) and a
    third way in `Aside.svelte:61`.
15. **Every page invents its own address grammar**, read and written in different files: assets `#<uuid>/<hash>`
    (AssetLibrary, worlds), stories `#<uuid>@<n>` (`stories:33`), doc pages `?<kind>=<uuid>&v=`, sandbox layouts
    `/sandboxes/<uuid>/?v=`, sandbox worlds `?layout=<uuid>/v3|e12|<intent>` (`Aside.svelte:57-71`), pieces
    `/pieces/?piece=&v=` written in `IntentsBoard.svelte:545` and `AssetLibrary.svelte:198` and read in
    `routes/pieces`, the Library's `?kind=document&q=` written in `AssetLibrary.svelte:205` and read at
    `routes/library/+page.svelte:86-89`.
16. **The Worlds page copies the asset library's chain logic.** `routes/worlds/+page.svelte:44-97` vs
    `lib/app/AssetLibrary.svelte:65-160`: the hash parse, `assetId`/`wanted`, the chain effect, `ownOf`, `shownHash`,
    `chainOf`, and the History pick (`/assets/<id>/recipe?edit=` → `admitProposed`).
17. **Sandbox 1 and Sandbox 5 are one page twice.** `routes/sandbox-1/+page.svelte` (297) and
    `routes/sandbox-5/+page.svelte` (296) differ only in their header, two constants and the mount options (`diff`): the
    click-vs-look detection, the plant card, its markup and ~170 lines of styles are copies. Both reach into
    `$lib/content/sandbox-2/interior/` for Sandbox 1's world.
18. **An intent's review is fetched twice and drawn twice.** `IntentsBoard.svelte:228-236` (`openCard`) and
    `IntentDetail.svelte:111-121` each `GET /intents/:id` for `.review`; the build view (`grp === 'worlds'` → WorldStage,
    else VaultAsset) is copied at `IntentsBoard.svelte:529-539` and `IntentDetail.svelte:260-268`, each lazy-importing both
    viewers its own way.
19. **A sandbox is named in five places.** Its route folder, the dashboard's `WORLDS` (`routes/+page.svelte:20-26`:
    href, label, cover), `lib/content/assets/sandboxes.js` `SANDBOX` (UUIDs copied from api `ids.ts:10`), the route's
    `<Aside doc={SANDBOX.x}>`, and api `ids.ts`. Nothing ties WORLDS to SANDBOX.
20. **Group routes and `GROUP_APPS` are two lists.** Seven route files (`plants`, `animals`, `things`, `machines`,
    `buildings`, `biomes`, `characters`) each bind a group key to a page whose href `lib/app/groups.ts:8-16` also names.
21. **The admin gate copied in 15 routes, two ways.** `goto('/', { replaceState: true })` in skills, sandboxes,
    sandboxes/[id], schemas, delivery, stories, pieces, library, characters, postgres, game/map, rules, factories,
    artifacts, game; 7 guard it with `session.me &&`, 8 do not. 26 checks of `level === 'admin'` in the area while
    `may()` (`lib/api.ts:38`, the permission map the API serves) is used once (AssetLibrary).
22. **lib/stories ↔ scripts.** `lib/stories/old-city.test.ts:7` imports `scripts/box-worker.ts`, which imports
    `lib/stories/world-build` (box-worker.ts:10); `scripts/{story-parity,live-runtime,webkit-world,world-shot}.ts` import
    lib/stories too (graph.ts: `lib/stories (I=0.77) → scripts (I=0.90)`, part of the folder cycle). Several tests pin
    source text, not behaviour: `world-build.test.ts:87-125` reads `StoryPlayer.svelte` and `live-runtime.ts`,
    `compose.test.ts:49,199`, `world.test.ts:136-141`, `old-city.test.ts:77`.

### Needless links (tied, but change for different reasons)

23. **IntentsBoard.svelte (716) is two components.** The board (columns, folding kept in localStorage, paging, the 3 s
    ship poll, cards: lines 58-176, 400-470) and the work review overlay (open/review/storyReview/docReview, source
    diff, builds, docs list: lines 185-275, 472-597), plus the decision plumbing for both.
24. **StoryPlayer.svelte (655) loads data as well as plays.** `liveAssets` (104-117) and `worldAssets` (124-157) read
    play's asset API and build each world once in the page's own box to find its guests; `fileOf`/`fileText`/`make`
    (102, 120, 198-210) fetch and verify files; then playback, fullscreen, speech, the timeline UI.
25. **Two "app" folders and two icon sets.** `lib/app/` is the shared kit (Frame, Aside, History, Changes, Icon) and also
    a feature (AssetLibrary, groups.ts); `lib/site/app/` is the shell (NavPill, pill, back, foot) and a viewer kit
    (Turntable, PickList, TouchStick, turntable.js). `lib/app/Icon.svelte` (179) and `lib/site/app/Icon.svelte` (65)
    are two icon sets; the dashboard uses one, every other page the other.
26. **The kernel imports content.** `lib/kernel/sandbox/frame.js:3` imports `$lib/content/game/hash.js`: the
    lowest layer (the sandbox shell) depends on a content folder.
27. **The shell knows a feature.** `lib/site/app/NavPill.svelte:28` imports `../intents/intents.svelte`, and
    `routes/+layout.svelte:24-25,49-55` knows the intents' route and modal: the pill's star is the intents' and nothing
    else can sit there.
28. **StoryPlayer reaches into node_modules by relative path.** `StoryPlayer.svelte:27,96-97`
    (`../../../node_modules/@hyperframes/core/dist/…?raw`, `gsap/dist/…`, `@fontsource-variable/inter/files/…`);
    `@hyperframes/core` is not a dependency of play/site (only transitive through `@hyperframes/player`,
    `bun.lock:100,106`).
29. **The repository is hard-coded in the detail.** `IntentDetail.svelte:54` `REPO_URL =
    'https://github.com/MyAvenCEO/maiacity'` while the API reads it from `SHIP_REPO` (api `ship.ts:233`).

### Surplus (no reason of its own to change)

30. **Turntable's non-inline modes are dead.** Its one caller (`lib/content/assets/VaultAsset.svelte:582`, HELD) always
    passes `inline`. Dead with it: `picks` and `lib/site/app/PickList.svelte` (355 lines, imported only by Turntable),
    `full`, the notch logic (`Turntable.svelte:54-62`), `lib/site/app/immersive.svelte.ts` (only Turntable, only when not
    inline, line 72), and the CSS for the non-inline layouts (`Turntable.svelte` ~100-250).
31. **Dead exports and dead branches in the shell.** `lib/site/app/screen-slots.js`: `screenHost` and `screenSize` have
    no caller, so no host is ever mounted and `screenSlot` always puts its node back where it was (the module does
    nothing). `lib/site/app/pill.svelte.js`: `pillCenter`, `pillAccounts` have no caller, so NavPill's `pill.center` and
    `pill.accounts` branches (`NavPill.svelte:56,118-122,147-156`) never render. `lib/site/app/back.svelte.js`:
    `onDashboard` is unused; `upFrom`'s `/assets/.+` branch (line 47) cannot match (the library has no sub-paths).
    `lib/site/app/versions.js`: `versionsOf`, `atOrLatest` unused.
32. **Dead kernel surface for hosts that are gone.** `lib/kernel/sandbox/engines.js`: re-exports `../engines.js` as is
    (pass-through) and adds `FLOOR`, `WORKERS`, `engineFor`, `workerFor`, none called. `policy.js`: `SHUT`, `NEVER`,
    `BUDGETS.logicJob`, `BUDGETS.mathJob` unused. `frame.js`: `csp` and the `wasm` option unused; its comment names
    `./logic-host.js`, which does not exist. `engines.json` carries `logic`, `view`, `view-worker`, `lib-*`, `math`
    kinds that no host runs and whose files `static/engines` does not hold (only `engine-v1..5.js`).
33. **Dead guards.** The 7 `session.me && goto(...)` guards (problem 21): `routes/+layout.svelte:139-145` renders a page
    only once `session.me` is set, so the guard is always true.
34. **Comments pointing at paths that do not exist** (`maia/site`, `aven/kernel`, `../../../maia/content`):
    `kernel/sandbox/frame.js:8`, `kernel/sandbox/engines.js:3-9`, `kernel/engines.js:4`, `NavPill.svelte:15,423`,
    `Turntable.svelte:141`, `PickList.svelte:9`, `routes/postgres/+page.svelte:3`, `routes/+layout.svelte:2`;
    `routes/stories/+page.svelte:32` describes slug addresses (`#papaya-v2-devlog`) that are UUIDs now.

### Special cases (evidence of a missing design)

35. **Swallowed errors.** `IntentsBoard.svelte:126` (schema names, `() => {}`), `:305,330,345` (`.catch(() => null)`
    then a silent `return`: a decision on an intent that could not be read does nothing, the very thing intent 2df30a21
    fixed for the decider); `Aside.svelte:62` (a layout's document unreadable → the aside stays empty, no reason);
    `routes/rules/+page.svelte:38,39,43` and `routes/schemas/+page.svelte:40` (`() => {}`);
    `routes/profile/+page.svelte:27` (tokens error shown as "no tokens"); `routes/artifacts/+page.svelte:112` (authors
    error → empty list); `StoryPlayer.svelte:109` (a live shot's asset unreadable → silently left out), `:148` (guests
    → `[]`), `:200` (a composition that fails to load or to hash is dropped without a word); `lib/SignIn.svelte:23` (a
    failed invite check reads as "used up"); `lib/stories/world-build.ts:84`.
36. **Sleeps and polls over ordering.** `routes/worlds/+page.svelte:38` polls `view.state.phase` every 50 ms until
    `shown` (the view has no event); `lib/stories/world-build.ts:178` loops with `setTimeout(r, 4)` up to 100,000 times
    while the hero settles; `routes/game/map/scene.ts:166` rAF+setTimeout to defer the city (HELD).
37. **Routes used as behaviour keys.** `routes/+layout.svelte:39` (bench regex), `:51` (`'/intents/'`), `:56`
    (`keepsPlay = /^\/(sandbox-|game)/`); `lib/site/app/back.svelte.js:47`. A new world page that should keep playing
    must match a regex in the layout.
38. **Schemas named by name, not UUID** (CLAUDE.md: every document names its schema's UUID).
    `routes/game-editor/+page.svelte:58` decides the levelling view on `config.json.schema === 'levels/1'`
    (`routes/game-editor/levels.ts:15` types it); `routes/schemas/+page.svelte:38,128` find the meta-schema by
    `type === 'schema'` where api `ids.ts` `SCHEMA` names it by UUID.
39. **A group key chooses the viewer.** `grp === 'worlds'` at `IntentsBoard.svelte:531`, `IntentDetail.svelte:263`,
    `routes/worlds/+page.svelte:49`; the plant card's `class:fruit={k >= 6}` (`sandbox-1:109`, `sandbox-5`) assumes the
    fruit starts at stage 7.
40. **An icon that exists in neither set.** The dashboard's Rules tile asks for `'check'` (`routes/+page.svelte:56`),
    which neither `lib/site/app/Icon.svelte`'s `IconName` nor its `Tile` type allows: the tile draws no icon. Only
    svelte-check would see it, and it does not run (see the top).

---

## Fixes (fewest that remove the problems)

**F0. Run the site's own checks.** (Prerequisite for every fix below; it removes no problem by itself.) Add
`bun run check` and `bunx vitest run` for play/site to `play/avenbox/gate.sh` (site part) and `play-checks.yml`.
Touches: `play/avenbox/gate.sh`, `.github/workflows/play-checks.yml`. Not HELD. Risk: it may turn red on drift that
is there today (40 for one). **Bound:** `grep -c "vitest run\|bun run check" play/avenbox/gate.sh` ≥ 2 and the same
in play-checks.yml.

**F1. One wire, in the API.** A types-only module `play/api/src/wire.ts` that re-exports the API's own answer types
(intent, ship, spec, sub, dep, step; story, story diff; doc change/edit/pin; review; library file; artifact, author;
delivery; asset chain/version), plus dependency-free constants (`INTENT_STAGES`, `OPEN_STAGES`, `GROUPS`, kinds) in
`play/api/src/shared/*.ts`. The site imports it through one alias (`$wire`, `import type` for types). Each component
keeps only display names (stage and kind labels keyed by the shared constants).
Removes **1, 2, 3, 4, 5, 7, 8 (and its Skills bug), 9**. Touches: `lib/site/intents/{detail,board,opened}.ts`,
IntentsBoard, IntentDetail, `lib/stories/{timeline.ts,StoryChanges.svelte}`, `lib/app/{Changes,Aside,AssetLibrary}.svelte`,
`lib/app/groups.ts`, routes library, artifacts, delivery, stories, skills, factories, schemas, rules, pieces,
sandboxes/[id], worlds; `play/site/svelte.config.js` (alias); new `play/api/src/wire.ts`. Not HELD (compose.ts imports
types from `./timeline`, which re-exports, so it stays untouched). Risk: types only, no runtime change, except 8 (the
Skills page starts showing Build). Pinned by svelte-check (F0), `detail.test.ts`, `timeline.test.ts`.
**Bound:** `grep -rEc "^\s*(export )?type (Ship|ShipStep|Check|Spec|Sub|PrSeen|Dep|StepBack|Clip|Track|StoryBody|Linked|Links|LinkedBy|StoryDiff|StoryUse|SheetUse|Use) =" play/site/src` = 0;
`grep -rn "'prototype'" play/site/src/routes` = 0; object-type declarations in the area (the 121 count above) ≤ 60.

**F2. One client for play's files and assets.** `lib/api.ts` (or `lib/files.ts` beside it) gains `fileUrl(hash)`,
`fileText(hash)`/`fileBlob(hash)` held to the hash, `NO_ANSWER` (the 502/503/504 set, used by `decide.ts`), and
`assetChain(id)` + `ownRecipe(version)`. Every hand-built `/api/files/`, `fetch(` and `ownOf` in the area goes through
it; failures throw with the file named instead of being dropped.
Removes **6, 10, 11**, and the StoryPlayer part of **35**. Touches: `lib/api.ts`, `lib/call.ts`,
`lib/site/media/url.ts`, `lib/site/intents/decide.ts`, StoryPlayer, IntentsBoard, AssetLibrary, routes library,
stories, artifacts, worlds. HELD: `compose.ts:44` `fileUrl` and its regexes stay until compose.ts is free (a
"Next untangle": have it import `fileUrl`). Risk: low; StoryPlayer's dropped compositions become a visible failure.
Pinned by `decide`/`detail-loads` tests and `compose.test.ts`. **Bound:**
`grep -rn "/api/files/" play/site/src/{routes,lib/site,lib/app,lib/stories} --include=*.svelte --include=*.ts | grep -v "\.test\.\|compose.ts"`
= 0; `grep -rn "fetch(" play/site/src/{routes,lib/site,lib/app,lib/stories}` = 0;
`grep -rc "defaultVariant)?.recipe" play/site/src` = 1; `grep -rn "502, 503, 504" play/site/src` = 0.

**F3. One document page, one address.** `lib/app/DocPage.svelte` (with a small `docView(kind, param)` in
`lib/app/doc.svelte.ts`) owns what the seven doc routes copy: the list, the read at `?v=`/`?intent=`, the History pick,
the Aside, the admin gate; each route keeps only its body snippet. `lib/app/address.ts` holds every address grammar
(`docHref`, `assetHref`, `storyHref`, `pieceHref`, `libraryHref`, the layout `?layout=` parse used by Aside) so writers
and readers share one function. The admin gate moves to one place (the layout, or `requireAdmin()` reading `may`).
Removes **14, 15, 21, 33**, and the rules/schemas part of **35**. Touches: routes skills, schemas, pieces, game-editor,
sandboxes/[id], factories, rules, stories, library, characters, postgres, delivery, artifacts, game, game/map;
`lib/app/Aside.svelte`, IntentsBoard (the pieces link), AssetLibrary (pieces and library links). Not HELD. Risk:
medium, seven pages change at once; no test pins them today (F0 first, then one route at a time).
**Bound:** `grep -rc "/docs?kind=" play/site/src/routes` = 0 (it lives in DocPage);
`grep -rn "goto('/', { replaceState: true })" play/site/src/routes | wc -l` ≤ 1;
`grep -rn "level === 'admin'\|level !== 'admin'" play/site/src | wc -l` ≤ 4 (from 26);
`grep -rn "/pieces/?piece=" play/site/src --include=*.svelte | wc -l` = 0.

**F4. Split the intents' board.** `WorkReview.svelte` (the review overlay: documents list, asset build, source diff,
story review, doc review) out of IntentsBoard; one `BuildView.svelte` (world → WorldStage, else VaultAsset) used by
WorkReview and IntentDetail; the review read once through `opened.ts`'s cache (`/intents/:id`) shared by the board and
the detail; `lib/site/intents/names.ts` for the display names (type of a work, kind, title) and `lib/format.ts` for
dates and initials; the board's `.catch(() => null)` reads replaced by the error shown. The nav pill's star becomes a
slot the layout fills (the shell stops importing intents).
Removes **12, 13, 18, 23, 27, 39** (its board/detail part) and the board part of **35**. Touches: IntentsBoard,
IntentDetail, new WorkReview/BuildView/names.ts, `lib/format.ts`, History, Changes, NavPill, `routes/+layout.svelte`,
routes library, artifacts, delivery. Not HELD (it imports VaultAsset as it is). Risk: medium; pinned by
`board.test.ts`, `detail.test.ts`, `detail-loads.test.ts` (they render IntentDetail and Decision), and
`scripts/intent-shots.ts`. **Bound:** `wc -l IntentsBoard.svelte` ≤ 400; `grep -rc "GROUP_TYPE" play/site/src` = 0;
`grep -rn "toLocaleString\|toLocaleDateString" play/site/src/{routes,lib/site,lib/app}` only in `lib/format.ts`;
`grep -c "intents.svelte" play/site/src/lib/site/app/NavPill.svelte` = 0;
`grep -rn "grp === 'worlds'" play/site/src/lib/site` ≤ 1.

**F5. The player plays; its inputs load elsewhere.** `lib/stories/inputs.ts`: `liveAssets`, `worldAssets`,
`piecesDeep`, the compositions' read (through F2's `fileText`), tested with a mocked fetch. StoryPlayer keeps
playback, fullscreen, speech and the timeline UI. `@hyperframes/core` declared in play/site's package.json and imported
by package specifier, not `../../../node_modules`. `scripts/box-worker.ts` moves under `lib/stories/test/` (or the test
builds its worker itself) so lib/stories imports nothing from scripts; the source-text assertions on StoryPlayer move
to the new module's behaviour tests.
Removes **22, 24, 28**, and StoryPlayer's 35 with F2. Touches: StoryPlayer, new `lib/stories/inputs.ts`(+test),
`lib/stories/{old-city,world-build}.test.ts`, `scripts/box-worker.ts` and its importers, `play/site/package.json`.
HELD: `live-runtime.ts` and `compose.ts` are read by tests, not changed; the `world-build.test.ts:123-125` assertion
reads `live-runtime.ts` and stays. Risk: medium (world shots); pinned by `old-city`, `world-build`, `world`, `compose`
tests and `scripts/story-parity.ts`. **Bound:** `wc -l StoryPlayer.svelte` ≤ 450; `grep -c "fetch(\|node_modules"
StoryPlayer.svelte` = 0; `grep -rn "scripts/" play/site/src/lib --include=*.ts | grep import` = 0; graph.ts cycles has
no `lib/stories → scripts` edge.

**F6. Cut the dead kit.** Delete `lib/site/app/PickList.svelte`, `lib/site/app/immersive.svelte.ts`, Turntable's
non-inline modes (keep accepting `inline` so the HELD VaultAsset compiles unchanged), `screen-slots.js`'s host machinery
(`screenSlot` → a no-op, or its two callers drop it), `pillCenter`/`pillAccounts` and NavPill's branches for them,
`upFrom`'s assets branch, `onDashboard`, `versions.js`'s `versionsOf`/`atOrLatest`, `kernel/sandbox/engines.js` (its
callers import `kernel/engines.js`), `policy.js`'s `SHUT`/`NEVER`/`logicJob`/`mathJob`, `frame.js`'s `csp`/`wasm`; the
stale path comments; one icon set (`lib/app/Icon.svelte` takes the dashboard's names, `check` included).
Removes **25 (icons), 30, 31, 32, 34, 40**. Touches: Turntable, NavPill, pill.svelte.js, back.svelte.js, versions.js,
screen-slots.js, kernel/sandbox/{engines,policy,frame}.js, `lib/content/assets/engines.js` (one import), both Icon
files, `routes/+page.svelte`, `lib/content/sandbox-kit/{SkyControl,WorldBar}.svelte` (if screenSlot goes). HELD:
VaultAsset (not touched; Turntable keeps its props). `engines.json`'s non-box kinds are read by the API
(`play/api/src/engines.ts:7`): leave them for a separate intent. Risk: low (dead code); pinned by the build and
`look.test.ts`/`engine.test.ts` around the box. **Bound:** files deleted: `PickList.svelte`, `immersive.svelte.ts`,
`lib/kernel/sandbox/engines.js`, `lib/site/app/Icon.svelte`; `wc -l Turntable.svelte` ≤ 420;
`grep -rn "maia/site\|aven/kernel\|maia/content" play/site/src/{lib/kernel,lib/site,lib/app,routes}` = 0;
`grep -rn "pillCenter\|pillAccounts\|screenHost\|engineFor\|workerFor" play/site/src` = 0.

**F7. One list of the worlds and groups, one plant-card world page.** `lib/app/sandboxes.ts` (by UUID: href, label,
note, cover; SANDBOX's UUIDs move here or are imported from it) feeds the dashboard and each sandbox route's Aside; a
shared `PlantCardWorld.svelte` (the click-vs-look, the card, its styles) carries Sandbox 1 and 5, each route keeping its
mount options; the group routes become one `routes/[group]/` page reading `GROUP_APPS` by href, or GROUP_APPS is
generated from the route folders (one source either way).
Removes **17, 19, 20**, and 39's fruit index (the stage's own flag instead of `k >= 6`, if the catalog has it).
Touches: `routes/+page.svelte`, routes sandbox-1..5, the 7 group routes, `lib/app/groups.ts`,
`lib/content/assets/sandboxes.js`. Not HELD. Risk: low-medium (the worlds' pages; nothing tests them; check by
opening each). **Bound:** `wc -l routes/sandbox-1/+page.svelte routes/sandbox-5/+page.svelte` ≤ 80 each;
`grep -c "sandbox-[0-9]" play/site/src/routes/+page.svelte` = 0.

**F8. References by UUID; routes only shown.** The levelling view chosen by its schema's UUID (`play/api/src/ids.ts`
`SCHEMA`, via F1's shared constants), the meta-schema found by UUID; the pull request's URL served by the API with the
intent (from `SHIP_REPO`); the layout's bench/keeps-play/intents regexes replaced by a page option (a page exports
`keepsPlay`/`bench`, or a `+layout.ts` flag), the intents link opened by the star's slot (F4).
Removes **26** (with hash.js moved into the kernel: `lib/content/game/hash.js` → `lib/kernel/hash.js`, its importers
re-pointed), **29, 37, 38**. Touches: routes game-editor, schemas, `+layout.svelte`, back.svelte.js, IntentDetail,
play/api `intents.ts` (one field), `lib/kernel/sandbox/frame.js`, `lib/content/game/hash.js` and its importers
(many outside this area; `compose.ts` and `live-runtime.ts` import it: HELD → keep a re-export at the old path until
they are free). Risk: low; `levels.test.ts` pins the levelling. **Bound:** `grep -rn "'levels/1'" play/site/src/routes`
= 0 outside `levels.ts`'s type; `grep -rn "type === 'schema'" play/site/src` = 0;
`grep -rn "MyAvenCEO" play/site/src --include=*.svelte` = 0; `grep -c "test(page.url.pathname)" routes/+layout.svelte` = 0;
`grep -rn "content/" play/site/src/lib/kernel` = 0.

Left over: **36** (the worlds page's 50 ms poll goes with F7's world page if WorldStage gains an event; the 4 ms
settle loop in world-build.ts is the box's ordering and wants its own look), and the part of **35** in SignIn and
world-build.ts (small, one line each, with F2).

### Next untangles (HELD)
- `lib/stories/compose.ts:44` `fileUrl` and its `/api/files/` regexes → F2's helper.
- `lib/stories/compose.ts` and `live-runtime.ts` importing `content/game/hash.js` → F8's kernel hash (drop the
  re-export afterwards).
- `routes/game/map/scene.ts:166` rAF+setTimeout deferral (problem 36).
- `lib/content/assets/VaultAsset.svelte`: once free, drop Turntable's `inline` prop (the only mode left).
