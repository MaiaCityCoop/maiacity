# Untangle: play/api (decision 1, a layered API core)

Area builder's log, move by move: what moved, the audit problems it removes (`api-flow#n`, `api-docs#n`), and how
behaviour is pinned. Measured with `bun intent-work/5884ade4/measure.ts api|cycles|layers|special|dead`.

## Moves

1. **The kit: `src/kit/` holds pg, ids, hash, uuid** (`git mv`, every import updated: src, docs, tests, scripts,
   import/, play/avenbox/skills.ts, play/site/scripts' library shots). The leaf modules that import nothing of play
   are a folder of their own, so the module graph can tell them from the app (api-docs#21, api-flow *Next untangles*:
   "a lower core/ folder"). One-line re-exports stay at `src/{pg,ids,hash,uuid}.ts` for the held `assetdocs.ts` and
   `test/assetdocs.test.ts`, and `src/{pg,hash}.ts` also for `deploy/server-care.sh`, which runs them inside whatever
   image is deployed (a rollback's included). Pinned: the whole suite, unchanged (329 tests).
2. **`src/docs` imports only the kit, and store ↔ schemas is one way.** The seed schemas and their hooks are
   `docs/seed.ts` (no store), `typeFor` (it reads a document) is in `docs/store.ts`, `DocError` beside `EditError` in
   `docs/core.ts`, `docs/schemas.ts` keeps `schemasOf` and `ensureSchemas` (importing the store). Removes the file
   cycle `docs/schemas ↔ docs/store` (api-docs#20, F6), the folder cycle `play/api/src ↔ play/api/src/docs`
   (api-docs#21) and with it the `play/api/src → play/api/src/docs` line of `graph.ts unstable`. Pinned: docs.test,
   schemas.test, migrate.test (ensureSchemas), the whole suite.
3. **One `HttpError(message, status)`** (`src/kit/errors.ts`) in place of VersionError, WorkError, IntentError,
   StoryError, SkillError, ArtifactError, MemberError, TableError, Denied (403) and NotFound (404), each `new X(m)`
   now `new HttpError(m, <its old default>)`; a subclass stays only where a caller tells it apart (PieceError,
   OwnerError, SandboxError, InviteUsed, and docs' DocError, SchemaError, EditError, now HttpErrors with the statuses
   they were converted to). `src/fault.ts` `statusOf` is the one mapping, used by app.ts, MCP's tools/call and
   prompts/get: an HttpError (and the held AssetDocError) answers its message and status, anything else 500. The
   converters that only re-threw one class as another go: asStoryError, asVersionError's body, five
   `instanceof X ? new Y` rethrows (stories, versioned, retire, work, sandboxes' stays: it tells a refused helper from
   a broken document). GitHubError stays an `Error` of its own: its status is GitHub's, not play's answer (a 401 of
   GitHub must not reach the site as "sign in"). For the held assetdocs.ts, `VersionError` and `WorkError` are
   re-exported names of HttpError and `asVersionError` is the identity (versioned.ts, work.ts). Removes api-flow#5
   (B), api-docs#14 (F10). What changes: an error not on app.ts' old list (a DocError, a PieceError) now answers its
   own status over HTTP, as it already did over MCP (the audit's intended change). Pinned: api.test,
   toolschemas.test, needsintent.test, nobypass.test (statuses), the whole suite. `error classes` 19 → 2.
4. **Every advisory lock named once** (`src/kit/locks.ts` `LOCK`, `lockSql`): migrations 4711029, Ship's queue
   4711030, intent edges 4711031, and the three that shared a number by accident get their own: the schemas' seed
   (was Ship's 4711030), the rule set's seed (was 4711030) and the layouts' move (was the intent edges' 4711031).
   Removes api-flow#1, api-docs#13. Pinned: depends.test (edges added at once), ship.test (the queue), migrate.test
   and rules.test (seeds), the whole suite.
5. **The kind registry below versioned.ts; every kind registered in one place.** `src/kinds.ts` holds the `Kind`
   type, the registry (register, syncKinds, kindNamed, kindOfWork, kindOfDoc, workKinds, workSql), `docRef`,
   `resolveEdits` and the helpers every kind shares (one `authorOf` with the import's `via` too, `named`, `versionAt`,
   `overlap`, `Ctx`, `Verdict`). `src/allkinds.ts` registers the nine kinds in their old order (asset, story, factory,
   game_config, skill, sandbox, schema, artifact, piece), wiring each to the module that does its part; it is the new
   small entry that imports the held assetdocs.ts, so versioned.ts imports no kind module. Entry points import it:
   app.ts, index.ts, import/{run,factories,gameconfigs,skills,stories}.ts, scripts/heavy.ts, and the tests that
   reached the kinds through versioned.ts' side effect (docs, migrate, pieces, intentpieces). The layout's and the
   schema's Accept no longer take the generic decide as a parameter or wrap it: the registry has a `before` hook (what
   an Accept holds a merge to: a layout's pins still kept, a schema failing no document on Main, its prefix) and the
   `accepted` hook writes the sandbox's rows and reads the schemas' kinds again, so `decideDoc` (a copy of
   decideWork's merge) goes, and one `writeRow` replaces three copies of the row update. `AutoBy` moves to access.ts
   beside `Me`. Removes api-flow E1, E2 (part), #19 (part), #25 (decideLayout's callback), api-docs#2, #3, #18,
   #25, #26, #34 (the `assetDocFor` re-export). The file cycle goes from 16 files to 6 (+ stories ↔ storydocs);
   versioned.ts 1,295 → 822 lines. Pinned: versioned.test (register/unregister), schemas.test (prefix, failing
   documents, syncKinds), sandboxdocs.test (a layout's Accept and rows), allwork.test (several documents, one
   Accept), intentpieces.test, the whole suite.
6. **A story's types and its schema's name in storydocs.ts.** `Clip`, `Track`, `StoryBody` move to storydocs.ts (which
   builds the documents), so it no longer imports stories.ts back (the 2-file cycle goes); the name a story document
   gives its schema is read from the seed schema (`STORY_SCHEMA = docs.seedType(SCHEMA.story).name`) instead of the
   literal `"story/1"` written in stories.ts and storydocs.ts (api-docs#11, F5 for stories). Pinned: api.test
   (stories proposed and read), docs.test, migrate.test (stories as documents), the whole suite.
7. **`src/github.ts`: GitHub's client out of ship.ts** — the REST client, its types, `GitHubError`, `shipGitHub`,
   the two commit status contexts (`Intent accepted`, `Merges with main`), `intentLink`, `readPull`, and once each
   what was written twice: `keepSeen` (ship.ts' and mainmerge.ts' `keep`), `openPulls` (the open intents' pull
   requests, queried by watchPulls and mergeMain alike). `short` is substate.ts' alone (delivery.ts and mainmerge.ts
   had copies, the reconcile a third). mainmerge.ts and delivery.ts no longer import ship.ts. Removes api-flow E5,
   #10, #20 (the client part), #22 (delivery's ship types). Pinned: ship.test, mainmerge.test, delivery.test,
   substate.test (the fake GitHub, test/fixtures/github.ts, now over github.ts), the whole suite. (Its log entry and
   the fixture's comment landed with the next commit.)
8. **An intent's work: its SQL in `held.ts`, its stage moves in intents.ts.** work.ts (renamed `held.ts`, `git mv`)
   keeps what an intent holds and how (WORK_OF, workOf, holdVariant, closeWork, dropDoc, unhold, stageAfter, and
   `heldOf`/`asOne`, the work's shape, from versioned.ts) and imports nothing of intents.ts; `putAtProposal`,
   `settle` and `archiveAsAuthor`/`archiveOwn` (from versioned.ts) are stage moves and live in intents.ts beside
   the gate and `decided`. `src/work.ts` is now a re-export for the held assetdocs.ts only. `heldWith` (dead) goes.
   Removes api-flow E4, #26 (heldWith). The cycle is down to intents ↔ versioned ↔ ship ↔ retire (autoMove,
   decideAny: next move). Pinned: withdraw.test (its spy on `dropDoc`, now on held.ts), onerecord.test,
   allwork.test, intents.test, rules.test (the stubbed `decisions.decided`), the whole suite.
