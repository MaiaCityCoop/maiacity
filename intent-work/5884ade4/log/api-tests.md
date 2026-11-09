# api-tests: decision 8 (Tests, last) for play/api

Builder's log, move by move: what moved, the problems it removes (`api-tests#n`, from `audit/api-tests.md`), how
behaviour is pinned, and for every test removed why it could not fail or only repeated the implementation.

## Moves

1. **Pinning tests first (F8), and the kit they stand on (`test/kit.ts`).** New suites pin what nothing pinned:
   `limits.test.ts` (the token bucket, `API_RATE`, the costly routes, the last X-Forwarded-For address, the app's 429
   with Retry-After for one address and not another), `site.test.ts` (index pages, the 200.html fallback, hashed chunks
   and engines immutable, media types, nothing outside the build, GET/HEAD only), `auth.test.ts` (a session token's
   30-day life, forged ids/expiries/signatures refused, the cookie's flags with and without Secure, `/api/me` with an
   expired or forged cookie, `/api/founders`), `bucket.test.ts` (bucketStore against a fake S3, `test/fixtures/s3.ts`:
   keys `blobs/<2>/<hash>`, the backups' root, held to the hash both ways, a missing setting named; blobStore's choice
   of folder, bucket, bucket with its second copy mending a lost file), `tobucket.test.ts` and `verify.test.ts` (each run
   as its workflow runs it, against a fresh database: copied, broken named, nothing copied again; ok vs. a broken and a
   missing file, exit 1). The kit (`freshDb`, `appOn`, `human`, `cookieFor`, `request`, `agentToken`, `rpc`, `tool`,
   `quiet`, `suite`) is what the next moves move every suite onto; its `suite` fails, never skips, without
   `TEST_DATABASE_URL` (api-tests#30). src/auth.ts exports the cookie's name `COOKIE` (export only; api-tests#4).
   Tests: 329 → 355 (26 added).
2. **Every suite on the kit (F1, F3 in part, F4).** 37 suites (all but the held `assetdocs.test.ts`) make their database
   with `freshDb` (one `CREATE DATABASE` left, the kit's; migrate.test's old databases are `freshDb({ migrate: false })`
   or `{ until }`), their app with `appOn`, their admins and tokens with `human`/`agentToken`, and call play with the
   kit's `request` (non-JSON bodies kept as text, never null), `rpc` and `tool` (one result shape: a tool's text as JSON
   or `{ error }`, a JSON-RPC error's message, a refused request's status). What each file kept is a one-line adapter
   naming whom it calls as. `suite` replaces the 37 `describe.skip`s: without `TEST_DATABASE_URL` a suite fails. The
   hand loops "migrate up to X" (onerecord, uuids, artifacts' 0026 database) are `migrate`'s `until`; the copied
   `COOP` literals in intentpieces and migrate import it. The legacy-tool shims are gone (F4): api.test's
   `propose_story_version`/`story_edit`/`propose_version` are named fixtures (`proposeStory`, `editStory`,
   `proposeAssetEdits`) that build `propose_doc_version`/`doc_edit` calls, and intents.test's is `proposeSource`.
   Removes api-tests#1, #2, #3 (cookies through the exported name), #4, #5, #6, #17 (onerecord, uuids), #24, #25 (the
   names), #28, #30, #32. Pinned: the whole suite, 355 tests, none removed.
   - Assertions that changed, each because it tested the test's own code:
     - api.test "a story proposal is checked whole": the shim answered "Give edits or the whole document, not both."
       itself, before play saw the call. Play's own answer to a timeline and edits at once is "Propose an intent
       variant (its number), edits, or the whole document." (versioned.ts' "not both" is reachable only with a
       `variant`): the test now holds play's answer. Found for the api area: that message misleads for "both".
     - api.test "an agent makes a change edit by edit": `not.toContain("story_edit")` became "no tool named story_*":
       the same guard (a story is edited as every document is), without naming the gone tool.
   - Assertions removed: skills.test `expect([...SKILL_STAGES]).toEqual([...INTENT_STAGES])` compared
     `INTENT_STAGES` with itself (both names import the one constant since the api merge): it could not fail.
     withdraw.test's `spyOn(held, "dropDoc")` + `toHaveBeenCalledTimes(1)` (api-tests#20) pinned which function is
     called; the test already asserts what it does (the variant archived, the work list, the stage, the reason).
   - schemas.test keeps its wrapper that names an intent for a `doc_edit`/`propose_doc_version` without one (now a
     function over the kit's `tool`): the `variantIntent` part of F4 is left (*Next untangles*).
3. **Behaviour, not src's text (F6, first half).** `app()` hands out its route table (`routes()`: every
   "<METHOD> <path>" it answers; src/app.ts, nothing else changes), and nobypass.test's sweep of every writing route
   reads it instead of regexing app.ts' text: a route added another way than a literal `on(…)` is now in the sweep too.
   Removes api-tests#19. Removed, each with why:
   - board.test "no LIMIT 500 is left in intents.ts" (1 test, 355 → 354): intent 2cb70fb8's c1 grep kept as a test;
     a text search of a file can't tell a slow board from a fast one, and the board's paging is pinned by the tests
     beside it (pages walked whole in order, bad pages refused).
   - ship.test "one place makes a code intent Accepted", its first part: regexes over ship.ts, intents.ts and
     decide.ts counting `SET … stage = 'accepted'` and matching the literal call `acceptAndShip(db, gh, me, w.id)) ??
     (await acceptCode(`. They restated the implementation (renaming a variable broke them, a second writer by
     another spelling passed them). The test's behaviour half stays: a green ship stays in Ship until the reconcile
     sees its merge live, flagged while play runs an older commit, Accepted once.
4. **No sleeps in play/api but the kit's bounded poll (F6, second half; `special`'s sleeps).** Ship's queue tells two
   Accepts apart by their order: `startIfReady` compares `decided_at` to the microsecond (`turn`, read in SQL) and then
   the id, where it compared JavaScript Dates, whose milliseconds can hold two Accepts made one after the other
   (src/ship.ts; the watcher already ordered by the full `decided_at, id` in SQL). ship.test's two `Bun.sleep(5)`
   between Accepts go. They covered a tie that, measured here, the test never hit (five runs pass on the old code
   without them too): the order is now play's, not the test's timing. The polls (ship.test's background watcher,
   deploy-speed's "play-api says it" and "the request waits on the lock", which had no bound of their own) are the
   kit's `until(what, ok, { withinMs })`, which fails naming what it waited for; the SIGTERM test's race with a 2.5 s
   sleep is the kit's `within(promise, ms, late)`. Removes api-tests#31. Pinned: ship.test "one ship at a time, in the
   order accepted", deploy-speed's SIGTERM test, the whole suite. Sleeps in play/api: 6 → 1 (the kit's poll).
5. **The accepted intents' measure scripts out (F7; `dead`).** play/api/scripts' board-speed.ts (intent 2cb70fb8's c3,
   Accepted 2026-11-07), detail-size.ts and seed-look.ts (intent 2df30a21's) are deleted: no workflow, gate step or
   package script runs them, and each copied the database bootstrap. heavy.ts, which detailfast.test uses, is
   `test/fixtures/heavy.ts`; its comment names what uses it now (it named ./seed-heavy.ts, a file that never was), its
   `COOP` is imported, and `motion`, `pieceSource`, `hostSource`, `building` are its own (no one else used them: the
   dead-export list's `hostSource`). tsconfig no longer includes the gone folder. import/plan.ts stays: it is alive
   (src/sandboxes.ts and the held src/assetdocs.ts import `readableRefs`; plan.test pins it). Removes api-tests#26,
   #27. Pinned: detailfast.test (the heavy intent's detail and Accept), board.test.
6. **Type escapes and swallowed errors out of the tests (`special`).** The last hand-made requests (board's `get`,
   api.test's Library `by`) are the kit's `request`, so no `r.json().catch(() => null)` is left in play/api/test (the
   kit keeps a body that isn't JSON as its text). `as any` in play/api/test: 40 → 6 (4 in workflows.test.ts, left as
   main changes it; 2 in substate.test's table of rows): each cast is the type it is (`Me`, `Pull`, `Rule`, `Edit`,
   `typeof fetch`, delivery's `Timeline["ci"]`, the MCP request a fake server reads), or none where the value was
   already typed (tool results, `console[k]`, the gate ids); deploy-speed's YAML is data of any shape, said once in
   `yaml`'s return type. Five comments that said "as any" in prose say "like any other". No test changed what it
   asserts. Pinned: the whole suite, unchanged.
7. **The store passed in, not a global (log/api.md *Next untangles*: `shipWork`, api-flow#6).** `app()` set
   `shipWork.store` and the reconcile read it to accept a shipped intent's work of play's: whichever app was made last
   in a process won. Now `reconcile(db, gh, store, commit)`, `watchShips`/`watchTick`/`startShipWatcher(db, gh,
   store, …)` and `acceptCode(db, gh, store, …)` take it; play-api makes one `blobStore()` and hands it to the app,
   the watcher and the reconcile at start (src/index.ts); decide.ts passes its `ctx.store`. The "play holds no store"
   branch goes (there always is one). The tests that reconcile give the app and the reconcile one store (`tempStore`)
   instead of trusting the last app made. Pinned: allwork.test (work accepted live by the reconcile), ship.test,
   depends.test, mainmerge.test, substate.test, delivery.test: the whole suite, unchanged.
8. **The seed steps out of migrations.ts, into the entry points (log/api.md *Next untangles*; api-flow#21,
   api-docs#23).** `migrate()` runs the migrations alone; what SQL can't write (the schemas as documents, every
   sandbox's layout, the rule set's v1) is `src/seed.ts` `seed(db)`, run after `migrate()` by every entry point that
   migrated: play-api (src/index.ts), `bun src/migrate.ts`, the import (import/run.ts), the kit's `freshDb`, and
   play/site's two library-shot scripts (each starts a database of its own). migrations.ts imports no feature module
   now (docs/schemas, sandboxes, rules). migrate.test's two migrations whose checks read seeded documents (0032 and
   the layouts) call `seed` after `migrate`, as play-api does; the comments that said "the end of migrate()" name the
   seed. The held assetdocs.test.ts calls `migrate` alone and needs no seed (run, 7 pass). Pinned: migrate.test
   (each old database migrated and seeded), rules.test, sandboxdocs.test, schemas.test, the whole suite.
9. **Imported, not copied (F3, in part).** build.test's "every migration but 0033-build" is `migrate`'s own
   `migrations` option (no new option needed), not a hand loop over the runner's table; no test writes the
   play.migrations DDL now (api-tests#17). The coop's UUID is imported from `src/kit/ids` everywhere (the literal in
   api.test's SQL, deploy-speed and pieces; the `access.ts` re-export in six tests and fixtures/board), and the
   bucket key is `keyOf` (readable, deploy-speed), not `blobs/${hash.slice(0, 2)}/…` (api-tests#12). Pinned: the
   files touched, unchanged.

## Tests removed, all of them

- board.test "no LIMIT 500 is left in intents.ts": a grep of a file kept as a test (move 3).

Assertions removed inside tests that stay: skills.test's `SKILL_STAGES` vs `INTENT_STAGES` (one constant compared with
itself), withdraw.test's spy on `dropDoc`, ship.test's regexes over ship.ts, intents.ts and decide.ts (moves 2, 3).
329 tests before this area's work; 355 after the pinning tests (move 1); 354 now.

## Measures (`bun intent-work/5884ade4/measure.ts`)

- `tests`: files creating their own database 41 → 2 (the kit; the held assetdocs.test), call/tool helpers copied
  52 → 0, suites that skip without a database 37 → 0, sleeps in tests 6 → 1, calls of gone MCP tools 58 → 0, tests
  reading src's source text 5 → 0. All in bounds.
- `special`, play/api's part: sleeps in play/api 6 → 1; in play/api/test, swallowed errors → 0 and `as any` 40 → 6.
- `dead`, this area's part: play/api/scripts' three files gone, heavy.ts a fixture, `hostSource` no export.

## Next untangles (api-tests)

- **F2, one intent-lifecycle fixture**: `SPEC` and "an intent ready for work" (`readyIntent`, `ready`, `building`…)
  are still copied in about 25 files, and four `codeAtProposal`s; `clearShips` in five. Next: `test/fixtures/intents.ts`.
- **F4's other half**: schemas.test's wrapper that names an intent for a call without one (`variantIntent`); api.test
  finds intents by `slug` (api-tests#33).
- **F5, tests by subject**: gate, avenbox, workflows and deploy-speed's workflow and tested-tree sections still live in
  play/api/test (workflows.test.ts changes on main, f63774a3: left until play merges it in); SIGTERM still in
  deploy-speed; files still named after intents (needsintent, nobypass, onerecord, allwork, detailfast).
- **Admin bootstrap** left inline in about 20 files (`createHuman` + `UPDATE … level = 'admin'`, now with the kit's
  `cookieFor`): the kit's `human` takes it where a file is next changed.
- The held assetdocs.test.ts adopts the kit once its intent closes (its own database bootstrap and MCP call stay).
- Found for the api area: `proposeDocVersion`'s "Give edits or the whole document, not both." (src/versioned.ts) is
  reachable only with a `variant`; without one, both given answers the "neither" message.
