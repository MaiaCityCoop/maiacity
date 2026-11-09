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

## Build (approved by Samuel 2026-11-09 08:29Z; draft PR #2198)

Four area builders in parallel, each on its own branch from this one, merged in here as they finish:
`intent/5884ade4-u-api` (fix 1), `-u-site-app` (fix 2), `-u-site-content` (fix 3), `-u-infra` (fix 6). Each keeps its
moves' log in `log/<area>.md`. After them: the tests builder (fix 8: the test kit, last), then sweeps for 4, 5 and 7
across what is left, then the re-audit. The held set is refreshed from every other intent in Build, Proposal or Ship
(`held-intents.txt`), 143 files at 08:33Z.

### Merged: infra (fix 6), 09:20Z

13 moves (`log/infra.md`), gate green on the merge (all parts, 129 s); `measure.ts infra` passes once CLAUDE.md and
SPEC name the required checks by their list. Deploy changes were shown identical by running old and new against
stand-ins that log every call (backup.sh byte-identical; dns.sh 27 scenarios; server-up.sh 4), except where the old
was wrong or weaker: the old heredoc cut a bucket key holding `$` (now written as given); restore.sh and server-care.sh
gain the toolkit's retry flags; server-care runs without `-i` under `timeout 0`. The image wasn't built here (no
Docker daemon). Kept: `deploy/deploy-time.ts` (the `run` of 5ab64b8e's c12, not dead). Left: `.claude/settings.json`'s
SessionStart hook, intent.ts's own database URL, play/site scripts' MCP clients, the tools/motion mirror (waits for
b9e6ad45), F4 (Samuel's).
- 09:30Z: four new intents started (660ad67f, 7af6e162, cb52fbd9; f63774a3 already landed); 175 files held. This PR
  touched two of them after they became held, and one (play/SPEC.md, held by a5faafad) by my mistake: both restored
  to main's. Pending their landing: SPEC names the required checks by `.github/required-checks.json` (infra's last
  bound, 2 → 1 files), setup.sh reads `play/avenbox/box.env`.

### Merged: site-app (fix 2), 09:40Z

16 moves (`log/site-app.md`), gate green on the merge (all, 90 s). `measure.ts site` 6 of 7: the board 716 → 398
lines, the player 655 → 418, the turntable 660 → 408, `fetch(` outside the client 7 → 0, admin checks 25 → 1, the
Skills page's `'prototype'` gone (Skills shows Build again; the Rules tile draws its icon). `/api/files/` 13 → 6: the
rest are the content builder's (pieces.js, catalog.js, biomes/sets.js, render/arrays.js, worlds/sound.js), to import
`fileUrl` from `lib/api.ts`. `play/api/src/wire.ts` holds the API's answer types, imported as `$wire`. IntentDetail.svelte
left as the merge base has it (96206162 held it then); its untangle is in the log's Next untangles, with DocPage for
the seven document pages, the layout's route regexes and one icon set (no bound).

### Merged: api (fix 1), 10:00Z

19 moves (`log/api.md`), gate green on the merge (all, 110 s; two conflicts resolved: substate.ts keeps infra's
required-checks.json, skills.ts takes kit/hash and play.ts; wire.ts's six types exported again). `measure.ts api`
passes all nine: versioned.ts 1,295 → 603 lines, mcp.ts 84.7 → 47.3 KB, error classes 19 → 3 (one `HttpError`,
statuses mapped once in fault.ts for HTTP and MCP), `to_jsonb` 11 → 0, lock numbers outside kit/locks.ts 4 → 0,
schema names in mcp/stories 10 → 0, piece special cases 10 → 0, story_versions writers 5 → 1, the intent guard 13 → 2.
play/api/src: no file or folder cycle (the 16-file cycle and docs/schemas ↔ store gone). One deviation from the plan:
intents.ts sits below the kind modules, since the held assetdocs.ts imports `putAtProposal` and `byOf` from it.
allkinds.ts registers every kind (in the old order) so versioned.ts imports none. Held files compile through one-line
re-exports (`src/{pg,ids,hash,uuid}.ts`, work.ts, versioned.ts's VersionError/asVersionError and review functions).
Kinds' format texts for agents moved into their seed schemas' `description`, read from the accepted schema first:
tool descriptions byte-identical. No migration. Left: the mirrored work columns on play.intents (site reads them, the
held assetdocs writes them), play.story_versions as a second store (one writer only), the `shipWork` global and the
seed steps out of migrations.ts (the tests builder's), tobucket.ts/migrate.ts.

### Merged: site-content (fix 3), 10:12Z

17 moves (`log/site-content.md`), merged cleanly; gate green (all, 60 s); census-same: Sandbox 1, Sandbox 3 and the
Worlds page the same at d5346b7 and the merged head (Sandbox 3 counted three times alike: the builder's varying
draws came under a machine load of 9–17). `measure.ts content` passes all bounds, `cycles` too: sandbox pages 297/296
→ 26/35 lines (one DomeCellPage.svelte), hash patterns 21 → 4 (kernel/hash.js), `pin:${` outside catalog 4 → 0, box
→ content/assets 2 → 0 (box/engines.js), cache.js 732 → 2 (split into cache/), sandbox slugs 26 → 1 (sandbox5.js: the
held village.ts types the film name), places.js gone (film registry by UUID), geometry ↔ simulation cycle gone. One
file reader: kernel/files.js `fileUrl`, cache/files.js `playFile` (content can't import lib/api.ts without a cycle
through lib/recipes.ts). Not looked at by hand: Sandbox 2's labs, Sandbox 4, the Factories (no census; pinned by
SSR and unit tests where moved).
- 10:12Z: play/site's svelte-check has no error outside held files (3 fixed; held: levels.test.ts, nodes.test.ts,
  village.ts). **Found, not fixed (a behaviour change):** the pieces page (`routes/pieces/+page.svelte`) has passed
  its piece head and history snippets to Frame as `asideHead`/`history`, props Frame doesn't take, since c47c5a1 (the
  one-aside change), so a piece's Info and History aside never shows there. Its own fix, for Samuel to decide.

### Merged: sweep-rest (fixes 4, 5, 7 outside play/site and play/api's tests), 10:30Z

35 commits (`log/sweep-rest.md`), one file or folder each, code and comments never in one commit; merged cleanly, gate
green (all, 76 s). `as any` in play/api/src 36 → 1 (the one left is the words "as any work" in a tool description kept
byte for byte), the repo's 116 → 79 (`special`'s bound ≤ 90 passes); play/api/src comment lines 1,928 → 1,602; no
comment in its area names a gone file. Swallowed errors in tools/avenbox 4 → 2 (the two left are Chromium/Playwright
look-ups where a failing try is the design, each saying so). Three now say what failed: pr-intent.ts notes a pull
request it can't read as "unread: <why>" (was "closed"), ground-sets warns on an unreadable AO map (output unchanged),
plant/organ.mjs throws saying where it looked for Playwright.

### Merged: api-tests (fix 8 for play/api), 10:55Z

10 commits (`log/api-tests.md`); one conflict (ship.ts: the builder's code, the sweep's comments); gate green (all, 60
s; 354 API tests, none skipped). `measure.ts tests` passes all six: one `test/kit.ts` (databases made in 2 files: the
kit and the held assetdocs.test), no copied call/tool helpers, a suite without TEST_DATABASE_URL fails instead of
skipping, one bounded poll as the tests' only wait, the gone MCP tools' shims replaced by fixtures calling doc_edit
and propose_doc_version, no test reading src's text (`app()` exposes its route table). Pinning tests first: limits
(429, X-Forwarded-For), site.ts, session expiry and forgery, /api/founders, bucketStore/blobStore against a fake S3,
tobucket and verify as subprocesses (329 → 355 tests; one removed, board.test's "no LIMIT 500" grep). Ship's queue
orders Accepts by decided_at to the microsecond, then id (JS Dates compared to the millisecond: why ship.test slept).
The `shipWork.store` global is gone (the store a parameter); seeding moved out of `migrate()` into `src/seed.ts`.
`special` and the dead-file bound pass. Kept: import/plan.ts (sandboxes.ts and the held assetdocs.ts import it).
Left in the log: the intent lifecycle fixture still copied in ~25 files (F2), tests by subject (F5). **Noted for
Samuel:** versioned.ts's "Give edits or the whole document, not both." is reachable only with a `variant`; without
one, both given answers "neither". api.test now pins the real answer.

### Merged: sweep-site (fixes 4, 5, 7 in play/site), 11:10Z

27 commits (`log/sweep-site.md`), merged cleanly. play/site: dead exports 9 → 0, swallowed errors 17 → 6 (two
helpers: `lib/kept.ts` for localStorage, `kernel/media.js` for autoplay, tested), `as any` 34 → 14, comment lines 6,095
→ 5,659 (333 of them AirSup's factory files, kept line for line by their own header), layers 16 → 11. census-same
`same` ×3, full vitest 447/452 (the 5: old-city.test.ts, held). The merge split the one site folder cycle in two.

**Folder cycles, counted as the check says.** c1's words are "nothing … goes round in a circle any more, except where
a file another open intent is changing keeps it"; measure.ts's header leaves held files out of every count, but its
folder-cycle count didn't. It now counts the folder cycles left when held files' imports are set aside: main d5346b7
has 4, this head 2 (content/assets ↔ assets/render, biomes ↔ render/nodes), the bound ≤ 1. The cycle the held
`stories/old-city.test.ts → scripts/box-worker.ts` closes no longer counts.

### Re-audit, round 1 (11:12Z)

- infra (`audit/re-infra.md`): 14 findings; the fix pass `-u-infra2` takes 1–12 and 14 (not 13: the never-deployed
  compose files and Caddyfile, with F4 for Samuel).
- api (`audit/re-api.md`): 15 findings. **A bug the untangle made:** Ship's watcher calls `autoMove({ db })` with no
  file store (decide.ts casts it away), so an auto-accepted intent holding play's work would be accepted without one.
  The fix pass `-u-api2` takes it first, and 3–5, 7–15. **Not fixed (behaviour), for Samuel:** (2) versioned.ts's
  "not both" message never shows; (6) doc_edit's own intent guard skips the work-kind and dependency checks propose
  applies.

### Merged: infra2 (re-audit round 1 fixes), 13:58Z

16 commits (`log/infra2.md`), merged cleanly; gate green (all, 75 s; 356 API tests). CI's checks run the gate now
(`gate.sh api|site|website --no-up`; job and required-check names unchanged; the only difference: a skipped test is
red, as the gate always held it, and tsc runs after the Postgres wait). lib.sh holds APP_DIR, the backup layout
(`SNAPSHOTS_PREFIX`, `STORE_PREFIX`, `snapshots`), CADDY_CONTAINER: every deploy script and production.yml's HTTPS
diagnostics read them (old and new run against stand-ins logging every call: identical). intent.ts reads the box's
database URL from box.env; restore.sh's check uses production's database image and waits over TCP; the bucket-keys
guard lives in server-up.sh; deploy/test_publish_site.py runs in the gate (`gate.sh deploy`); three tests restating
bun's and Postgres's versions dropped. Kept: src/pg.ts and src/hash.ts (the held assetdocs.ts imports them).
(At 13:45Z the held set grew by ed6694c3: stories/live.ts and world.test.ts restored to main's; 159 files.)
- 14:10Z (the Orchestrator's finding, fix 8): API test files timed out in beforeAll at 5 s on busy runners (6fd5e63f,
  7af6e162), each migrating and seeding its own database since the files run in parallel (aa59f248). `freshDb` now
  copies one template per code (`play_tmpl_<hash of migrations and src>`), made once and claimed by a rename (a
  file losing the race drops its own): a copy 140 ms, a migrate and seed 661 ms on an idle box. `migrate: false` and
  `until` keep the slow path. gate api green twice (from no template, and with one): 356 pass.

### Merged: api2 (re-audit round 1 fixes), 14:15Z

18 commits (`log/api2.md`); one conflict (live-audit.ts: infra2's PLAY_SITE and api2's intentsIn); gate green (all,
75 s; 358 API tests: two pinning tests added). The watcher's missing store: the fixer found it couldn't be reached
(every intent the watcher reads has a pull request, accepted by acceptAndShip; a rule refuses an intent holding both
code and play's work), so a test now pins the watcher's rule path and the store is passed, the cast gone. One reader
of the `Intent:` trailer (`kit/ids.ts intentsIn`) for ship.ts, pr-intent.ts and live-audit.ts, each accepting exactly
what it did (intents.yml's grep kept; a bun line wouldn't behave the same). One stage list (`kit/stages.ts`, read by
the API, avenBOX and the site as `$stages`). Each kind carries its own edit text (mcp.ts names no kind; the composed
text byte-identical). `prepare(db)` (migrate then seed) at every entry point and the test template. One seed loop for
the repo's documents (import/seeddocs.ts). The shared intent fixture took over 12 `readyIntent`, 7 `SPEC`, all 5
`clearShips`; `human()` replaced 22 admin bootstraps. **For Samuel:** pr-intent.ts accepts an indented `Intent:` line
the reconcile and intents.yml never see, and the JS readers take the UUID on the line after `Intent:` where the
workflow's grep doesn't (kept as they are: behaviour).
