# Audit: api-tests (play/api/test, test/fixtures, play/api/scripts, play/api/package.json)

Read only. Counts from `grep` on origin/main (detached HEAD). The HELD file in this area is `play/api/test/assetdocs.test.ts`
(and `src/assetdocs.ts`, `src/lod.ts`). A fix that must edit it is marked HELD. The fixes can leave it alone until its
intent closes, and adopt it after.

## Problems

### Hidden links (copied setup, values and protocol)

1. **Fresh-database bootstrap copied into 38 test files and 3 scripts.** Each repeats the same steps:
   - `name = play_test_${Date.now()}_…` (19 use that prefix; others differ: `play_characters_…`, `play_detailsize_…`);
   - `new Bun.SQL(URL_)`, then `CREATE DATABASE` (44 lines in 38 files) and `u.pathname = /${name}` (45);
   - `fromBunSql`, `migrate`, `initSessions` (34);
   - `DROP DATABASE … WITH (FORCE)` in afterAll (45).

   Examples: allwork.test.ts:36-49, withdraw.test.ts:30-43, api.test.ts:44-63. The scripts do the same:
   scripts/board-speed.ts, detail-size.ts:22-30, seed-look.ts:16-25. deploy-speed.test.ts and needsintent.test.ts each
   also define their own `freshDb`. There is no shared helper.
2. **App construction copied.** `app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0), github? })`
   appears in 36 files (40 lines for `folderStore(mkdtemp…`, 37 for `new Rate(0)`).
3. **Admin bootstrap copied.** Tests create the human and session cookie with `createHuman(db, …)` (45 lines in 34
   files) and `play_session=${tokenFor(id)}`. They make the admin with
   `UPDATE play.memberships SET level = 'admin'` (56 lines in 33 files). Then they make the agent token with
   `POST /api/tokens` (42 lines in 26 files) and the avenBOX flag with `POST /api/tokens/:id/avenbox` (13 lines in 10
   files). Examples: withdraw.test.ts:44-50, allwork.test.ts:50-54.
4. **The session cookie's name `play_session` is copied in 34 test files.** It is private in src/auth.ts:174 (`const COOKIE`).
   Renaming it would break every suite through a value src does not export.
5. **An HTTP `call` helper is re-implemented in 27 files.** Each builds `new Request("http://play.test"+path)` and ends in
   `r.json().catch(() => null)` (25 copies). The signatures differ: `(method, path, body)`, `(as, method, path, body)`,
   `(who, …)`, and api.test.ts:70 adds a text fallback with `catch {}`.
6. **An MCP `tool` / `rpc` helper is re-implemented in 26 files.** That is 41 `tools/call` envelopes built by hand, with
   3 ways of reading the result:
   - `JSON.parse(content[0].text)` in 27 files;
   - `structuredContent` in 2 files (api.test.ts:641);
   - `{error, out}` vs `{error}`.

   The JSON-RPC envelope from src/mcp.ts is repeated at each site.
7. **The intent lifecycle helper "an intent ready for work" exists in about 25 copies under 8 names.**
   - `readyIntent` in 14 files (api, artifacts, breeds, characters, factories, gameconfigs, intents, needsintent,
     nobypass, private, readable, rules, schemas, versioned).
   - `ready` in 4 files, `building` in 5, `built`/`specified`/`add`/`atProposal` in 3 to 4.
   - `codeAtProposal` in 4 files: depends.test.ts:121, mainmerge.test.ts:119, ship.test.ts:106, substate.test.ts:203.
     These four are near-identical, down to `gh.pulls.set({... base:{ref:"main"}, head:{ref:"claude/${pr}"} ...})` and
     `gh.checks.set(head, [green("play / API and site"), green("website / build")])`.

   Each copy runs the same steps: `add_intent`, then `specify_intent` with a spec, then `POST /approve`, then
   `check_intent` c1 pass. A change to the gate (for example a new required spec field) means editing about 25 places.
8. **The spec fixture is copied in 22 files.** `const SPEC = { goal, nothing_to_reduce: "A test fixture: nothing to
   reduce.", scope, checks: [{ check: "It holds", how: "test", by: "true", run: "true" }] }` appears 22 times, and the
   string appears 27 times in 25 files. fixtures/board.ts has a third shape.
9. **Specs written straight into play.intents.** These rows bypass specify_intent's validation, so they are built from a
   column list that must track migrations:
   - `ready`/`building` insert full rows: api.test.ts:86-96, assetdocs.test.ts:186-195 (HELD), intentpieces.test.ts:60,
     pieces.test.ts:40.
   - The check shape `{id:"c1", …, must:true, step:"mvp"}` and the results shape `{pass, evidence, by, at}` are
     hand-copied from src/intents.ts.
   - In total: 14 `INSERT INTO play.intents` and 41 `UPDATE play.intents` in tests.
10. **The artifact summary fixture `words()` + `SUMMARY` is copied 3 times** (needsintent.test.ts:32-33, nobypass.test.ts:36-37,
    rules.test.ts:25-26). artifacts.test.ts:34 has `summaryOf`. The 593-word body is sized by hand to fall inside
    `SUMMARY_WORDS` (src/artifacts.ts:32), which none of these copies import.
11. **Readable-recipe `SOURCE` strings in 20 files.** That is 33 copies of `module.exports.recipe = function (id, v…) {…}`,
    plus `READABLE`/`LONG` variants in readable.test.ts:34-35. If src/recipes.ts changes its contract, every copy must
    change.
12. **Constants copied from src instead of imported.**
    - `COOP = "12f8…ea867"` is redefined in 5 tests (assetdocs:28 HELD, deploy-speed:61, intentpieces:24, migrate:62,
      pieces:22) and in scripts/heavy.ts:13. It is inlined in SQL at api.test.ts:516,548,1289.
    - `SANDBOX.one` / `two` / `factories` UUIDs are written out in api.test.ts (lines 123-321, 10 times),
      assetdocs.test.ts:114-134 (HELD), migrate.test.ts:298 and sandboxdocs.test.ts:24.
    - The bucket-key formula `blobs/${hash.slice(0,2)}/${hash}` (src/blobs.ts:31 `keyOf`) is copied 7 times:
      readable:77, deploy-speed:95,149, migrate:161,308,501, api:510 (via key).
    - The engine number `5` (src/engines.ts `LATEST_BOX`) is hard-coded in 12 asset_versions INSERTs.
    - The play.migrations DDL (src/migrations.ts:69) is copied 3 times: build:49, onerecord:45, uuids:48.
    - Artifact limits 70 / 280 / 500–1500 appear as literals in artifacts.test.ts:220-288, although src exports
      `TITLE_MOST`, `DESCRIPTION_MOST` and `SUMMARY_WORDS`. This is lower priority: the numbers are spec numbers.
    - COOP is imported from 2 places: `../src/access` (a re-export, 5 tests) and `../src/ids` (4 tests).
13. **A play.files row is written by hand in 7 files (12 INSERTs)** instead of src's `keepFile` (src/owners.ts) or the
    upload route. Examples: readable.test.ts:74-78 (`keep`) and assetdocs.test.ts:41 (HELD). The tests that build an old
    database (migrate) legitimately need raw rows; the others do not.
14. **CI and workflow names are written as strings on both sides.**
    - The required checks `"play / API and site"` / `"website / build"` appear 38 times across 8 test files. src
      exports them as `REQUIRED_CHECKS` (src/substate.ts:8), but tests do not import it.
    - The deploy job names `"The image"`/`"The backup"`/`"The server"`/`"The website"` appear 37 times across 5 files.
      src exports them as `STEPS` (src/ship.ts:87-90); only deploy-speed.test.ts:290 imports it, and
      workflows.test.ts:57 lists them again.
    - The fake GitHub hard-codes workflow file names (fixtures/github.ts:15).
15. **release.yml is asserted twice.** The checkout `blob:none` + sparse checkout, the fast-forward `merge-base` lines and
    "no --force" are checked in workflows.test.ts:38-53 and again in deploy-speed.test.ts:173-190. A change to
    release.yml must edit both.
16. **The default avenBOX URL `postgres://postgres:play@127.0.0.1:5432/postgres` is copied.** It appears in
    scripts/detail-size.ts:22, scripts/seed-look.ts:16, play/avenbox/gate.sh:68 and avenbox/intent.ts. The tests
    instead skip when `TEST_DATABASE_URL` is unset, so the scripts and tests disagree on the default.
17. **Hand-rolled "migrate up to X" loops.**
    - onerecord.test.ts:28-33 `ran(below)` and uuids.test.ts:49 re-implement `migrate(db, { until })`
      (src/migrations.ts:55), including the play.migrations insert.
    - build.test.ts:50 needs "all but one", which `migrate` cannot express. That is a missing option in src, so the
      test copies the runner's internals.
18. **Order-dependent state across tests in one file.**
    - Tokens are created inside the first `test()` and used by later ones: factories.test.ts:92,
      gameconfigs.test.ts:90, api.test.ts:718 (`storyToken`).
    - `clearShips()` (an UPDATE that archives every Ship intent) is copied in 5 files (allwork:220, depends:145,
      rules:104, ship:130, substate:187) and called 29 times to undo earlier tests' shared state.
    - mainmerge.test.ts:72 archives every open intent before each test.

### Needless links (tests tied to internals)

19. **Tests that assert on src source text, not behaviour.**
    - board.test.ts:104-106 ("no LIMIT 500 is left in intents.ts").
    - ship.test.ts:541-551 runs regexes over ship.ts, intents.ts and versioned.ts. It slices by function names and
      matches the literal call text `acceptAndShip(db, gh, me, w.id)) ?? (await acceptCode(`.
    - nobypass.test.ts:219 parses `on("METHOD", "path"` out of app.ts to list routes.

    Renaming or reformatting the code breaks these tests although behaviour is unchanged. The nobypass one is the most
    useful (route exhaustiveness), but it should read the route table from `app`, not from the file's text.
20. **A spy on an internal.** withdraw.test.ts:108 `spyOn(work, "dropDoc")` + `toHaveBeenCalledTimes(1)` pins which
    module function is called, not what happens.
21. **About 210 direct reads of play.* tables in tests** (`FROM`/`JOIN play.`). The largest counts are migrate (31, which
    is legitimate) and api (29). Tests also write 41 `UPDATE play.intents` to force stages, bypassing the lifecycle:
    intents.test.ts:197,314,327,334,470,480,516,581; depends:149 `setStage`; needsintent:160; skills:232. Every column
    or constraint rename in src/intents.ts ripples into about 20 test files.
22. **Tests of other folders live in play/api/test.**
    - gate.test.ts tests `play/avenbox/select`.
    - avenbox.test.ts tests play/avenbox/intent.ts.
    - workflows.test.ts and deploy-speed.test.ts (sections "the workflows" and "tested tree") test `.github/` and
      `.github/workflows/tested-tree.sh`.
    - sources.test.ts and plan.test.ts test `play/api/import`.

    The change to these subjects lives elsewhere, but their tests are here, so `gate.sh api` must run for a workflow-only
    change.
23. **Test files are named after intents, not modules:** deploy-speed, detailfast, needsintent, nobypass, onerecord,
    allwork. deploy-speed.test.ts mixes 4 unrelated subjects: import no-op, workflows, tested-tree.sh, and SIGTERM in
    src/index.ts. Nothing tells a maintainer of src/index.ts or tested-tree.sh where their test is.
24. **The test-only `rate` parameter.** Every test passes `new Rate(0)` (37 times). If `app()`'s `rate` defaulted to
    "no limit" for tests, or the fixture supplied it, the option would not need repeating; the parameter matters only
    to src/index.ts.

### Surplus

25. **Legacy MCP tool names are emulated inside tests.**
    - api.test.ts:656-686 translates the removed tools `propose_story_version` (called 28 times), `story_edit` (9) and
      `propose_version` (13) into `doc_edit`/`propose_doc_version`.
    - intents.test.ts:87-90 does the same for `propose_version` (3).
    - schemas.test.ts:104-115 auto-makes intents for `doc_edit`/`propose_doc_version` calls without one. This
      re-introduces in tests the "no intent" path that src now refuses.

    About 53 call sites go through these shims. They test the shim plus the real tool.
26. **A fixture comment names a missing file.** scripts/heavy.ts:4 names "./seed-heavy.ts"; the file is seed-look.ts.
27. **Measure scripts of accepted intents kept as code.**
    - scripts/board-speed.ts is the c3 measure of intent 2cb70fb8, Accepted 2026-11-07.
    - board.test.ts:104 "no LIMIT 500" is the same intent's c1 grep, duplicated as a test.
    - scripts/detail-size.ts and seed-look.ts belong to intent 2df30a21.

    No repository file runs them (no workflow or gate.sh references them). They are kept alive only by
    fixtures/board.ts:2 and scripts/heavy.ts. Each also copies the fresh-database setup (problem 1).
28. **Two `freshDb` helpers** (deploy-speed.test.ts, needsintent.test.ts(prefix)) beside 36 inline copies.
29. **package.json.** The `"import"` script points at `import/run.ts` (outside this area; it exists). Its
    `@simplewebauthn/server` dependency uses a caret range, while `loro-crdt` and `@noble/hashes` are pinned; this is a
    nit and has no unused dependency. No problem beyond that.

### Special cases

30. **38 suites skip silently with `const suite = URL_ ? describe : describe.skip`.** migrate.test.ts:427 has a
    `test.skip` variant. `bun test` without `TEST_DATABASE_URL` reports green with about 90% of the suite skipped. Only
    gate.sh:93 turns skip into red; CI's play-checks.yml runs `bun test --parallel`, and its grep is in gate.sh, not CI.
31. **Sleeps that cover ordering.**
    - ship.test.ts:235,237 `Bun.sleep(5)` between Accepts, so `decided_at` timestamps differ and the queue order is
      stable. The queue's tiebreak is the timestamp alone, which is a src design gap.
    - ship.test.ts:434 polls with `Bun.sleep(20)` up to 100 times on the background watcher.
    - deploy-speed.test.ts:434,460 poll loops with no bound of their own (only the 30 s test timeout), and :476 races a
      2.5 s sleep.
32. **Swallowed errors in helpers:** `r.json().catch(() => null)` in 25 copies, so a 500 with an HTML body becomes
    `data: null`. api.test.ts:79 has `catch {}`.
33. **Lookups by slug or name, not UUID** (a CLAUDE.md rule):
    - api.test.ts:398,425,434,445 find the waiting intent by `p.slug === "mcp-fern"` and similar.
    - breeds.test.ts:72,158,172 find breeds by `name`.
    - intents.test.ts:262,369-370 filter by title or token name.
34. **Long per-test timeouts** (60–120 s) on 30 tests: private.test.ts has 12 at 60 s, and detailfast, migrate and
    gate have more. Together with problem 1 (one CREATE DATABASE plus a full migrate per file), each file pays the
    whole migration chain.

## Which src behaviour no test pins (pin it before refactoring)

"Direct" means the test imports the file. "Via API" means it is reached through `app()` or MCP.

| src file | pinned by |
|---|---|
| limits.ts (`Rate`, `perMinute`, `costly`, `clientOf`) | **nothing**: every test passes `Rate(0)`; no 429, X-Forwarded-For or API_RATE test |
| site.ts (`siteHandler`: hashed-chunk caching, 200.html fallback) | **nothing** |
| tobucket.ts (production.yml:243) | **nothing** |
| verify.ts (deploy/restore.sh:90) | **nothing** |
| index.ts | only SIGTERM (deploy-speed.test.ts:404); env and startup wiring not pinned |
| pg.ts `connect()` (env) | nothing (tests use `fromBunSql`) |
| blobs.ts `bucketStore`, `blobStore(env)` | nothing (blobs.test covers folder, steady, mirrored, cached) |
| auth.ts sessions: `humanIdFrom` expiry and forgery, `sessionCookie` flags | not pinned directly; passkey `register/finish` and `login/finish` hit only in nobypass's route sweep |
| app.ts `GET /api/founders` | **no test** |
| engines.ts | one refusal (api.test.ts:557-563) |
| gist.ts | indirectly (detailfast intent detail) |
| lod.ts (HELD) | via proposals' `lod:` in about 19 files; limits only in assetdocs (HELD) and intents |
| members.ts, tables.ts | api.test.ts, nobypass, private (routes) |
| stepback.ts, withdraw.ts, retire.ts | 4 / 1 / 2 files via MCP |
| work.ts | withdraw (spy), allwork |
| storydocs.ts, stories.ts | api.test.ts (story block, through the legacy shims of problem 25) |
| sandboxes.ts | sandboxdocs, api |
| docs/* (core, store, validate, schemas, breeds, index) | docs, schemas, versioned, breeds, migrate |
| mcp.ts | 29 files; all 37 tools called at least once (`withdraw_doc` and `add_story_composition` by one file each) |
| ship, mainmerge, substate, delivery, rules, intents, versioned, artifacts, owners, pieces, assets, access, tokens, migrations, uuid, versions, recipes, hash, notes, groups | each has a dedicated or heavy test |
| assetdocs.ts (HELD) | assetdocs.test (HELD), api, pieces, intentpieces |

## Fixes

**F1. One test kit: `play/api/test/kit.ts`.** It holds `freshDb()` (database name, create, migrate, initSessions, drop),
`world({ github?, humans: {ada:'admin', …} })` returning `{db, api, store, gh, who, cookie(as)}`, `call(as, method, path,
body)` (keeping a non-JSON body as text, never null), and `mcp(token).tool/rpc` with one result shape. Tokens and the
avenBOX flag are made through the routes. The kit exports `suite` (problem 30), but it should *fail* when
`TEST_DATABASE_URL` is missing under CI or avenBOX, not skip.
- Removes problems 1, 2, 3, 4 (the kit imports the cookie name, once src exports it), 5, 6, 24, 28, 30 and 32.
- Touches: 38 test files and 3 scripts. assetdocs.test.ts is HELD and adopts the kit later.
- Risk: low. The kit only moves bootstrap; every test's assertions stay.
- Bound: `grep -l 'CREATE DATABASE' play/api/test/*.test.ts play/api/scripts/*.ts | wc -l` goes from 41 to ≤ 2 (the
  kit plus migrate.test's old-DB builds). `grep -c 'const call = async\|const tool = async' play/api/test/*.test.ts`
  sums from 53 to 0. `grep -c "describe.skip"` goes from 38 to 0.

**F2. One intent-lifecycle fixture: `test/fixtures/intents.ts`.** It holds `SPEC`, `specified()`, `inBuild()`,
`atProposal()`, `codeAtProposal(gh, …)` (taking `REQUIRED_CHECKS` from src/substate.ts) and `clearShips()` (through a
route, or kept in one place).
- Removes problems 7, 8, 9 (for the copies that do not need raw rows) and 18 (`clearShips` in one place).
- Touches: about 25 test files; assetdocs `building` is HELD.
- Risk: medium. Some copies assert intermediate stages; keep those `expect`s inside the fixture.
- Bound: `grep -c 'A test fixture: nothing to reduce' play/api/test/*.test.ts` sums from 27 to 0.
  `grep -cE 'const (readyIntent|ready|building|built|codeAtProposal) = ' …` sums from 33 to 0.
  `INSERT INTO play.intents` in *.test.ts goes from 14 to ≤ 6 (migrate, onerecord and uuids old-DB cases only).

**F3. Import, don't copy, src's constants and builders.**
- `COOP`, `SANDBOX`, `keyOf`, `LATEST_BOX` and `REQUIRED_CHECKS` are imported.
- `STEPS` is imported in workflows.test.ts.
- src/auth.ts exports the cookie name.
- `migrate` gains `except` for build.test, and `until` replaces the hand loops.
- One `SOURCE(line)` fixture and one `summaryOf` live in the kit.
- Removes problems 10, 11, 12, 13 (via `keepFile`), 14, 16 and 17.
- Touches: about 20 tests, scripts/heavy.ts, src/auth.ts (export only) and src/migrations.ts (one option).
  assetdocs is HELD.
- Bound: `grep -E '"12f8d4e7-701f-8727-a327-de9b240ea867"|ec08b07d-6ec0|7a7894a9-f37a|9862777e-04c2' play/api/test/*.ts play/api/scripts/*.ts | wc -l`
  goes from about 20 to 0. `grep -c 'hash.slice(0, 2)' play/api/test` goes from 7 to 0. `grep -c 'CREATE TABLE IF NOT
  EXISTS play.migrations' play/api/test` goes from 3 to 0. `grep -c '"play / API and site"' play/api/test/*.test.ts`
  goes from 38 to ≤ 2 (workflows and deploy-speed YAML).

**F4. Drop the legacy-tool shims.** Call `doc_edit` and `propose_doc_version` directly in api.test.ts' story and asset
blocks, intents.test.ts and schemas.test.ts, naming an F2 intent.
- Removes problems 25 and 33 (look up by the UUID that propose returns).
- Risk: medium. These tests are long; rewrite them mechanically.
- Bound: `grep -cE 'tool\("(propose_story_version|story_edit|propose_version)"' play/api/test` goes from 53 to 0.
  `grep -c 'variantIntent' play/api/test` goes from 9 to 0.

**F5. Tests by subject, not by intent.**
- Move gate, avenbox, workflows and the "workflows" and "tested tree" sections of deploy-speed to `play/avenbox/test`
  and `.github`'s own test file (one release.yml assertion set).
- Move SIGTERM to an index.test.ts.
- Rename needsintent, nobypass, onerecord, allwork and detailfast after the modules they pin.
- Removes problems 15, 22 and 23.
- Bound: `grep -l 'release.yml' play/api/test/*.test.ts | wc -l` goes from 2 to 0. play/api/test contains no file that
  reads `.github/` or `play/avenbox`.

**F6. Behaviour, not text, and no sleeps.**
- Replace the source-regex tests (board:104, ship:541-551) with route-level assertions, or delete them (the LIMIT one
  is an accepted intent's grep).
- nobypass reads the routes from an exported route table.
- Drop the `spyOn(work)` and assert the variant's status.
- Give the Ship queue a deterministic tiebreak (accept sequence) so ship.test drops `Bun.sleep(5)`.
- Bound the deploy-speed polls.
- Removes problems 19, 20 and 31.
- Bound: `grep -c 'readFileSync(join(import.meta.dir, "../src/' play/api/test` goes from 5 to 0.
  `grep -c 'Bun.sleep' play/api/test` goes from 6 to ≤ 2 (bounded polls). `grep -c spyOn` goes from 1 to 0.

**F7. Retire the accepted intents' measure scripts.** Delete scripts/board-speed.ts, detail-size.ts and seed-look.ts
(or move them under `intent-work/<id>/`), keep heavy.ts as a test fixture, and fix its comment.
- Removes problems 26 and 27.
- Bound: `ls play/api/scripts` drops from 4 files to 0, with heavy.ts moved to test/fixtures.

**F8. Pinning tests before any refactor** of limits.ts, site.ts, auth sessions, blobs `bucketStore`/`blobStore`,
`/api/founders`, tobucket.ts and verify.ts (see the table). This is not a refactor; it is a precondition.
- Bound: each named file is imported by at least 1 test file (today 0 for limits behaviour, site, tobucket and verify).

Problem 21 (about 210 direct table reads) shrinks as a consequence of F2 and F4. The rest are migration tests, where
raw SQL is the point.
