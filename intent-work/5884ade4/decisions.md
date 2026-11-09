# Untangle the whole code base once — decision log (intent 5884ade4)

Intent 5884ade4-b543-443e-a09b-f63b6c4b2d44, method `untangle-codebase` (Artifact c308c135-5571-417b-9c52-ffd25770ec44).
Each fix stands above the problems it solves. Measured on main d5346b7 (2026-11-09).

## Baselines (main d5346b7)

`bun intent-work/5884ade4/graph.ts`: files 524, edges 1604, file cycles 4, module cycles 2, imports of a less
stable module 18, orphans 17 (entries the script doesn't know: scripts, a param matcher, piece sources).

Held (open intents' branches change them, recomputed 08:15Z by `held.sh` into `held.txt`, 113 files; untouched here, their tangles under *Next untangles*): 116 files, from
`git diff --name-only origin/main...origin/<branch>` for the branches of 6fd5e63f, 090168c8, 602a8849, c1bee1f8,
24454c2d, a5faafad, 0b4c007b, 544485e2, and 4284946e's two files still unlanded.


## The two additions (Samuel's choice, by the Orchestrator 2026-11-09 07:56Z): Comments and Tests, both

- Comments: comments that restate the implementation go (even phrased as a why); comments about something outside the
  code stay (a proxy, a browser, a GPU quirk, a person's decision with its date); a workaround's comment goes with it.
- Tests, last: tests that repeat the implementation or can't fail go; tests tied to internals are rewritten to
  behaviour; any that fail without a bug are fixed.

## How the problems were found

Seven area audits, read-only, each listing every problem with file:line evidence in four kinds (hidden links, needless
links, surplus, special cases) and grouping them under the fewest fixes: [`audit/`](audit/) holds them whole
(api-flow 39 problems, api-docs 44, api-tests 34, site-app 40, site-assets 40, site-worlds 44, infra 55: 296).
Evidence besides: the import graph (`graph.ts`), Git's co-change (pairs changed together in ≥ 4 squashed commits:
`app.ts`+`mcp.ts` 6, `versioned.ts` with `assetdocs`/`stories`/`work`/`intents` 5–6, `mcp.ts`+`IntentsBoard.svelte` 5,
`compose.ts`+`live-runtime.ts` 7, `IntentDetail`+`IntentsBoard` 7), and the special-case counts in `measure.ts`.
Problems are cited below as `<area>#<n>`, fixes of a report as `<area> <fix>`.

## The redesign: ten fixes, each above the problems it solves

Every fix is tested against one rule: what changes together ends up together, what doesn't isn't tied, everything
depends on what changes less. Each is one family of `measure.ts`, bounded on main d5346b7.

### 1. A layered API core (measure `api`, `cycles`, `layers`)

One direction for play/api: `kit/` (pg, ids, hash, uuid, locks, one `HttpError`) ← `docs/` (the Loro store and the
schemas, importing only `kit/`) ← `kinds.ts` (the kind registry and the helpers every kind shares) ← each kind's module
(stories, sandboxes, pieces, artifacts, rules, skills…; assets through a kinds entry so the held `assetdocs.ts` stays
as it is) ← `versioned.ts` (documents and accept only) ← `intents.ts` (one guard, one stage writer, `putAtProposal`
and `settle` from work.ts) ← `decide.ts` / `watcher.ts` / `github.ts` (Accept, Ship's watcher, GitHub's client) ←
`app.ts` and `mcp.ts`, which share one handler per operation and read each kind's format from its schema document.
- Solves: the 16-file cycle (api-flow A: five upward edge groups, all needed; api-docs F1, F2), `docs` ↔ `store` and
  `src` ↔ `docs` (api-docs F6), copied helpers in versioned.ts (api-docs F2: `overlap`, `authorOf`, `openVariant`,
  the humans query, the error mapper), piece and kind special cases (api-docs F4, F5; api-flow D), the work refs
  mirrored on the intent row (api-docs F3, api-flow D), the story store beside the document (api-docs F7: one writer
  of `play.story_versions`, from the document), legacy before-documents paths and `to_jsonb` fallbacks (api-docs F8,
  api-flow E), 21 error classes and 18 rethrows with HTTP and MCP disagreeing on status (api-flow B, api-docs F10),
  13 copies of the intent guard and 7 direct stage writes (api-flow C), MCP tools copying HTTP routes and restating
  each kind's format (api-flow F), advisory-lock numbers reused across features, the `shipWork.store` global, the
  trailer regex in four places, dead helpers (api-flow G).
- Not here: putting the artifact and piece required-field checks into their schemas (api-docs F9) needs the
  meta-schema to grow a rule; it's a schema document's intent of its own (*Next untangles*).

### 2. One wire and one client for play/site (measure `site`)

The API's answer types once, in a types-only `play/api/src/wire.ts` the site imports; one client (`lib/api.ts`) for
every call and every file read (`fileUrl`, files held to their hash, one "no answer" set); one admin gate; the intents'
board split into board, review and build views; the Stories player only plays, its inputs loaded by
`lib/stories/inputs.ts`; one document page for the kinds' pages; references by UUID (schemas, worlds), the pull
request's URL served by the API.
- Solves: site-app F1–F5, F8 (wire types declared on both sides, ad-hoc `fetch`, 25 admin checks, 7 copied document
  pages, a 716-line board, a 655-line player, `lib/stories` importing `scripts/`), site-assets F2 (`/api/files/`
  spelt in 13 files). Fixes two live bugs on the way: Skills' stage list says `'prototype'` for `'build'` (its Build
  text never shows), the dashboard's Rules tile names an icon no set has.

### 3. One loader, one hash, one pin for play/site's content (measure `content`)

One way to load a build (`load.js`; `sources/viewer.js` stops copying it without the manifest check), one build-name
grammar and one hash (in `kernel/`), pins spelt by `catalog.js` alone, box engines kept in `box/`, the device cache
split by what it keeps, the film registry by UUID, one seeded random, one shell for the box only, the Sandbox 1 and 5
dome-cell pages one shared page, the labs one scenario registry and one studio rig.
- Solves: site-assets F1–F4, F6–F10, F12, site-worlds F1, F2, F6, F7 (the `geometry` ↔ `simulation` cycle), F9,
  F10, F12, and the module cycle's non-held edges.

### 4. Dead out (measure `dead`)

263 exports nothing else uses lose their `export` or go with their code; files nothing runs go (`.claude/launch.json`,
`PickList.svelte`, `clone.py`, `deploy-time.ts`, sandbox-kit's `orbit.js`/`timeline.js`/`index.js`, three measure
scripts of accepted intents, the `import/plan.ts` barrel, the kernel's engines pass-through).
- Solves: site-assets F5, F8, site-app F6, site-worlds F5, infra F6, api-tests F7, api-flow G (dead part).

### 5. Special cases removed by the redesign (measure `special`)

What fixes 1–3 make unnecessary goes: swallowed errors become handled or surfaced (73 → ≤ 30, the rest each about
something outside the code: a browser, the network), `as any` where the wire gives a type (131 → ≤ 90), sleeps in
play/api (the Ship queue tie broken by order, not time).

### 6. One deploy toolkit, one check list (measure `infra`)

`deploy/lib.sh` (the bucket's CLI and its constants, compose, the health probe), `deploy/dns.sh`, the server's
bring-up as a script, not production.yml's heredoc; the required checks' names in `.github/required-checks.json`,
read by main-green, tested-tree and substate.ts; avenBOX's constants and bun's version in one place each; the CI
checks call `gate.sh`; one shared play MCP client and one intent vocabulary for scripts; the website on its own
constants; tools find play/site one way.
- Solves: infra F1–F3, F5–F8 (the aws-cli call ×8, DNS lookup ×2, backup.env writer ×3, health probe ×5, check names ×7).
- Not here: infra F4 (the legacy api service, aven.maia.city, the founders' grants, old backup layouts out of
  production) changes what production runs: Samuel's decision first (*Asks*).

### 7. Comments (measure `comments`; Samuel's addition)

Comments restating the implementation go; comments about something outside the code stay (a person's decision with
its date, a browser's, GPU's or proxy's quirk, SPEC sections); every comment naming a file names one that exists
(83 point at files gone today).

### 8. Tests, last (measure `tests`; Samuel's addition)

One test kit for play/api (`test/kit.ts`: a fresh database, the app, users, one `call`, one MCP helper, a suite that
fails without `TEST_DATABASE_URL` instead of skipping), one intent-lifecycle fixture, src's constants imported not
copied, the shims for MCP tools that are gone dropped, tests by subject, behaviour not source text, no sleeps; pinning
tests first where nothing pins what a fix moves (limits.ts, site.ts, auth sessions, blobs' stores, tobucket/verify);
play/site's 56 test files, run by nothing today, run and green.
- Solves: api-tests F1–F8, infra F1's site-tests part, site-app F0.

## Behaviour unchanged

- `bash play/avenbox/gate.sh` green, and play/site's own checks green outside held files (`site-checks.sh`). On main
  d5346b7: vitest 427 tests, 5 failing, all in `lib/stories/old-city.test.ts` (non-held), which reaches
  `scripts/box-worker.ts`'s Bun-only `import.meta.dir` (undefined under vitest: a test failing without a bug, fixed in
  8); svelte-check 30 errors, of which outside held files: routes/+page.svelte (the icon bug), routes/pieces (an
  Aside prop that is gone), stories' and worlds' tests, scripts/box-worker.ts, vite.config.ts.
- `census-same.sh`: Sandbox 1 (near, mid, far), Sandbox 3 and the Worlds page draw the same totals at the head as at
  the merge base. Dry run 08:30Z on this branch (no code change yet): same for all three, 2 min with a warm cache (its
  cache holds trees and fetched inputs, not results).

## Asks (Samuel's, not done here)

- play/site's tests in CI: they take 9.5 min (24 min of CPU) in avenBOX; this intent runs them in its checks, and
  whether every pull request's CI runs them too is a speed decision (devx-speed).
- infra F4: the legacy api service, aven.maia.city, the founders' grants and the old backup layouts out of production.

## Next untangles (held: their intents, or the next pass, take them)

- **play/api/src/assetdocs.ts** (6fd5e63f, a5faafad…): its registration as a kind, its copies of `openVariantOf`,
  `authorOf`, `asVersionError`, its refs on the intent row, `"asset/1"` literals, `ensureAssetDoc`, `AssetDocError` and
  9 rethrows, `unreadable` imported by stories.ts and versioned.ts (api-docs, api-flow *Next untangles*); lod.ts's
  `LodError`.
- **content ↔ site/app** (render kit, biomes, VaultAsset): turntable, Turntable, versions and TouchStick to a kit
  folder below both; this and stories' test edge close the 16-folder cycle (site-assets U1).
- **Biomes**: soil looked up by slug (`SOIL_OF`, U2); biomes ↔ render/nodes through two held tests (U10); biomes off the
  in-code version history (site-worlds F11).
- **Render kit**: the dead `Unread` retry in render/index.js and VaultAsset (U3); a card's levels read twice, site
  lodcard.js and api lod.ts (U4); ACEScct constants copied JS ↔ GLSL, film colour in one place (U5); `sources/`
  dissolved (U6); the renderer behind a narrow interface, crowd.js out of render/ (U7); crowd's `?detail=0.2` (U8,
  changes what is drawn: census first); engines.json kinds with no file (U9); seeded.js (U11); the dqs shader patch
  from rebuild.js (U12).
- **sandbox-2/interior**: the dome kit out of interior.ts and the interior cycle (site-worlds F4), the world loop and
  film hold in the kit (F3), the `flora` branches in village.ts and interior.ts (F5), maiacity-v2/world.js's
  unreachable story (F5).
- **Stories**: compose.ts's `fileUrl` and its regexes to the one client; compose.ts and live-runtime.ts to the
  kernel's hash (site-app *Next untangles*); routes/game/map/scene.ts's rAF + setTimeout deferral.
- **tools/sheet**: fal.ts's own MCP client (infra F2). **play/api/test/assetdocs.test.ts**: the test kit.

## Order of work

Pinning tests first (8's pinning part), then 1 (the API core, the largest lever), 2, 3, 6, 4, 5, then 7, and 8's
clean-up last. One move per commit, the gate green after each; the held set rechecked (`held.sh`) before each commit.
