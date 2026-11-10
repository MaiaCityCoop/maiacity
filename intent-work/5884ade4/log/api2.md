# api2: the re-audit's fixes in play/api (re-api.md, step 4)

Branch `intent/5884ade4-u-api2`. Each move: what, the problems it removes (`re-api#n`), how behaviour is pinned.
Not done here, on purpose: re-api#2 (the "not both" order) and re-api#6 (doc_edit through the gate) change behaviour:
left for Samuel.

## 1. The watcher hands its file store to an auto-accept rule (re-api#1)

- `watchPulls(db, gh, store, at)`; `autoMove` and `autoAfter` take `Ctx` (store required); decide.ts' `ctx.store as
  BlobStore` cast and `o.commit === undefined ? undefined : o.commit` are gone.
- Pinned first by a new rules.test case (its own commit): a code intent a rule matches, refused while a draft, is taken
  into Ship by the watcher's look once GitHub finds it ready. No test path through the watcher had existed.
- What the re-audit said and what is so: the store was **not reachable** from the watcher today, so no test could fail
  before the fix. Every intent watchPulls reads names a pull request, so decideOne takes it to acceptAndShip (no store),
  and matchRule refuses any intent holding code and play's work (`f.both`, rules.ts, not a rule a person can change).
  The fix stands as a type made true: the next path that would reach the store from there is caught by tsc.

## 2. One `authorOf` (re-api#3)

- storydocs.ts' byte-for-byte copy deleted; storydocs.ts and stories.ts import kinds.ts' `authorOf`. The re-maps before
  it (retire.ts, stories.ts proposeStory, versioned.ts' `via` to putAtProposal) are gone: each `via` there is typed
  `"web" | "mcp"`, so the re-map was the identity. stories.ts' `v.via === "web" ? "site" : "mcp"` (a stored version's
  via, null meaning MCP) stays: it maps differently.
- artifacts.ts' `authorOf` (an author row, a different thing) is `getAuthor`.
- assetdocs.ts keeps its own copy: held (Next untangles: import it from ./kinds).
- Pinned by the suite as it is (no behaviour moved).

## 3. One humans-name query (re-api#4)

- `namesOf(q, ids)` in kinds.ts (dedupes, drops nulls); `named`, versioned.ts' versionsNamed and docHistory's variants
  use it. Same query, same Map. Pinned by the suite (doc_history's and versions' authors are asserted in docs/api tests).

## 4. One `Intent:` trailer (re-api#5)

- `intentsIn(text, { indented? })` in play/api/src/kit/ids.ts, over one module-private `TRAILER` (and its indented
  twin, built from the same UUID pattern). ship.ts' trailersOf (its regex named `UUID`, shadowing kit/uuid's, gone),
  play/avenbox/pr-intent.ts and play/avenbox/live-audit.ts call it. `TRAILER` is not exported: every caller wants the
  ids, and an export nothing reads would be dead.
- Each caller's accepted set kept as it was (checked over CRLF, tabs, indents, case, a UUID on the next line, a
  malformed 36-character id: scratch trailer-eq.ts, all the same):
  - ship.ts and live-audit.ts: strict. live-audit's own `[0-9a-f-]{36}` took malformed ids too, but it only ever
    looks one up by a real intent's UUID, so the strict pattern answers the same.
  - pr-intent.ts: `{ indented: true }`, as it always took. **For Samuel:** this accepts what none of the others do: a
    PR whose only trailer is indented passes "Intent named" while the reconcile and intents.yml never see it. Kept.
  - Also kept, for Samuel: every JS reader's `\s*` takes `Intent:` and the UUID on the next line, which the workflow's
    grep (spaces only, one line) does not.
- .github/workflows/intents.yml keeps its grep (a bun one-liner would not do exactly the same, and bun is set up only
  after that step): one comment line names the constant. Nothing else touched there (infra2 works in .github).
- Pinned by workflows.test (pr-intent's judge), ship/allwork/depends tests (the reconcile's trailers).

## 5. The mirrored work columns listed once (re-api#7)

- `REFS` (held.ts) is the one list: WORK_OF's select, OWN_REFS' jsonb_build_object and asOne iterate it.
- `ownColumns` empties the columns when the intent holds no variant at all (a variant with refs but no kind still leaves
  them, as before); withdraw.ts calls it where it hand-wrote `SET work = NULL, asset_id = NULL, …`, under the same
  "none left" test. Its other callers (dropDoc on a fold, intents.ts after holdVariant) never reach the empty case: the
  fold proposes on the new timeline first, and holdVariant has just put one in.
- Pinned first by a new withdraw.test case (its own commit, green on the code before): the last document withdrawn
  leaves `work` and every ref column null.

## 6. readableRefs lives in src/recipes.ts; parseRef gone (re-api#8)

- `readableRefs` (a check every layout edit runs) moved from import/plan.ts into src/recipes.ts; sandboxes.ts imports
  it from there, so runtime code no longer imports the deploy's import folder. import/plan.ts is a one-line re-export
  kept for the held src/assetdocs.ts (Next untangles: assetdocs imports ./recipes, plan.ts goes).
- `parseRef` and `RefError` deleted: nothing in play called them but plan.test. plan.ts' re-exports of `labelOf`,
  `RECIPE_HEAD`, `Label` (only plan.test read them through it) gone; plan.test imports src/recipes.ts.
- plan.test's "refs parse" case went with parseRef; in its place a case for what sandboxes.ts actually asks (no self:
  every readable ref in a layout is found), which nothing tested. Count unchanged (356).

## 7. Errors: layoutWrite's no-op rethrow gone, docs.applied (re-api#9)

- layoutWrite's try/catch turned a SandboxError into an HttpError with the same message and status: gone.
  `SandboxError` itself stays: the kept-changes import in sandboxes.ts tells it apart (`instanceof SandboxError`).
- `docs.applied(t, json, edits)` (docs/core.ts): a document's state with edits applied, nothing kept. sandboxes.ts uses
  it instead of reaching into docs/core's newDoc/seed/applyEdits/jsonOf.
- SchemaError's `problems` was public and never read: a plain constructor parameter now.
- Not done, and why: `DocError.extra` **is** read (docs.test and the held assetdocs.test assert `extra.needsPreview`
  and `extra.mergedHash`): the re-audit missed it. EditError (docs.test's `toThrow(EditError)`) and OwnerError (the held
  assetdocs' rethrow) are told apart, so they stay.
- Pinned by the suite (sandboxdocs and docs tests cover layoutWrite's three paths and their refusals).

## 8. MCP's edit grammar and formats from the kinds (re-api#10)

- `Kind.edits` (what its documents take beyond a document's own) and `Kind.told` (its schema's description is among the
  formats tools/list tells). mcp.ts composes doc_edit's and propose_doc_version's edits text from the document's own
  ops plus each kind's `edits`, in registration order, and the formats from the `told` kinds: no kind named in mcp.ts.
- The story's text is `STORY_EDITS` in stories.ts and the layout's `LAYOUT_EDITS` in sandboxes.ts, beside the code that
  applies them. The asset's `replace` text sits in allkinds.ts' asset kind: its code is the held assetdocs.ts (Next
  untangles: move it there as `ASSET_EDITS`).
- Pinned: the composed text is byte-for-byte the old literal and the told kinds are the old seven in the old order
  (scratch edits-eq.ts: "same"); the suite's tools/list tests.

## 9. One boot: prepare(db) (re-api#11)

- `prepare(db)` in src/seed.ts: migrate, then seed; gives back the migrations that ran. play-api (index.ts),
  src/migrate.ts, import/run.ts, test/kit.ts freshDb (a database migrated `until` a migration still gets migrate alone)
  and play/site's library-shots.ts and dashboard-library-shots.ts call it. migrations.ts stays feature-free;
  migrate.test keeps migrate and seed apart (it tests the steps between).
- initSessions and syncKinds stay where each entry point needs them (play-api, the tests, the shot scripts): not every
  entry point wants them (migrate.ts, the import).
- Pinned by the suite (every test database is made by prepare now); the shot scripts bundle.

## 10. One seed loop for the repo's documents (re-api#13)

- import/seeddocs.ts: `seedDocs(db, kind, list)`, `SeedReport`, `Seed` (the loop, its 300-character cut, the
  allkinds import). factories.ts, gameconfigs.ts and skills.ts keep their lists and a one-line `seedX = (db) =>
  seedDocs(...)` (the tests and run.ts call them by name); their three Report types are run.ts' `SeedReport`.
- Their header comments named src/factories.ts, gameconfigs.ts, skills.ts (gone): they name ./seeddocs.ts now.
- Pinned by factories.test, gameconfigs.test and skills.test (each asserts the report, seeded then present).

## 11. One stages module, for play/api, avenBOX and the site (re-api#14, and the infra re-audit's twin)

- play/api/src/kit/stages.ts, importing nothing: `OPEN_STAGES`, `CLOSED_STAGES`, `INTENT_STAGES` (the two joined, so
  no stage can be missing from one list), `IntentStage`, `stagesSaid(stages)` (a skill's stage keys it says something
  for, in order) and `stagedBody(s, heading?)` (a skill's text with no body).
- Its users: intents.ts (no longer defines them), intenttools.ts, skills.ts (skillText's body, promptsOf), allkinds.ts
  (a skill's listed stages), wire.ts (the type), the tests; play/avenbox/skills.ts (its STAGES copy and its body
  rendering, now `stagedBody(s, "# label")`); play/site through a new alias `$stages` (svelte.config.js: values that
  import nothing), in lib/site/intents/board.ts (OPEN, CLOSED) and routes/skills/+page.svelte (its STAGES copy gone,
  `stagesSaid` for a skill's stages).
- `listIntents`/`pageIntents` take `readonly string[]` (OPEN_STAGES is a const tuple now).
- Pinned: skills.test, build.test, avenbox.test (the mirror's body: system, then stages in order), the site's
  board.test (vitest, 56 pass); site build green; svelte-check 9 errors, none in a touched file (all in content tests
  and sandbox-2, as before).

## 12. The intent-lifecycle fixture (re-api#12)

- test/fixtures/intents.ts: `spec(goal, scope)` (the one-must spec every suite wrote out), `readyIntent(hands, title,
  { spec, add?, evidence?, strict? })` (add_intent, specify_intent, an admin's approve, c1 passed; `strict` keeps the
  two stage assertions the suites that had them made) and `clearShips(db)`.
- Moved onto it, each keeping its own texts and assertions: readyIntent/ready in allwork, api (stories), artifacts,
  breeds, characters, factories, gameconfigs, needsintent, nobypass, readable, versioned, withdraw (12); SPEC in
  breeds, characters, needsintent, nobypass, readable, versioned, rules (7); clearShips in allwork, depends, rules,
  ship, substate (all 5).
- The admin bootstrap (`createHuman`, `UPDATE … level = 'admin'`, `cookieFor`) is the kit's `human(db, name, level)` in
  22 suites (levels as each had them: admins, citizens, a traveler left as made).
- Left, as they differ in what they do (not copies): rules.test's readyIntent (approves only where a rule did not),
  intents/skills' intentAt (to any stage), depends/substate's specified, build.test's inPrototype, retire/worldshot's
  building, ship.test's codeAtProposal and decisionAtProposal, api.test's `ready` (SQL), allwork/withdraw's look spec;
  migrate.test's admins (made between migrations); the held assetdocs.test.
- Same 356 tests, all green.

## 13. Comments that named moved or gone code (re-api#15)

- decide.ts (autoMove named "./versioned.ts decideAny": it is above it), mcp.ts and app.ts ("./work.ts" as the
  intent's work: ./held.ts and ./intents.ts), recipes.ts (named maia/content/assets/engines.js; the re-audit's
  play/site/src/lib/kernel/engines.js holds no RECIPE_HEAD: it is play/site/src/lib/content/assets/box/engines.js),
  kinds.ts' Ctx ("who, how": it is the database and the store), factories.test and gameconfigs.test (src/factories.ts,
  src/gameconfigs.ts, gone), rules.test ("./intents.ts" from test/); app.ts' fetch set apart by a blank line (the
  stray indent the re-audit saw was not there any more). import/factories, gameconfigs, skills: done in move 10.
- Left: build.test's `inPrototype` is right as it is: it puts intents at 'prototype' on a database migrated below
  0033-build, to test that migration.

## 14. test/kit.ts back as the branch found it (coordination)

- The orchestrator rewrote freshDb on intent/5884ade4-untangle (72571973: one migrated, seeded template database per
  code). Move 9's freshDb change (prepare) is undone here so the merge keeps their body untouched. For them: their
  template's `migrate(db, {}); seed(db)` is `prepare(db)` (src/seed.ts) once merged.

## 15. My own pass: two more copies in the docs store (same kind as re-api#4)

- docs/store.ts read a variant's edit bytes with the same query in four places: one `importEdits(q, d, id, v)`.
  (One of the four imported without the `rows.length` guard: importing no edits is nothing either way.)
- A version's frontiers were read in store.ts' stateAt, storydocs.ts and the held assetdocs.ts: `docs.versionFrontiers`
  (null where none), each caller keeping its own refusal (404 in stateAt, 500 in storydocs). assetdocs.ts' copy is
  held (Next untangles).
- Seen and left: sandboxes.ts' kept-change import builds `{ human, via: mcp|site }` by hand (authorOf would map an
  'import' via differently); assetdocs.ts' authorOf copy and its via re-maps (held).

## 16. The fixture imports nothing of test/ (cycles)

- test/fixtures/intents.ts took the `Answer` type from ../kit, a folder cycle test ↔ test/fixtures (cycles measure 2 → 3):
  its approve now gives `{ data: any }`. Folder cycles back to the 2 the branch had (both in play/site, neither mine).

## Measures (end)

api 9/9 ok, tests 6/6 ok, special 3/3 ok, dead 3/3 ok; cycles: file cycles ok, largest ok, folder cycles 2 (at most 1),
as at the start: both play/site's (lib/content…, and scripts ↔ lib/site/intents ↔ lib/stories), none in play/api.
Full gate green: 356 api tests (354 + the two pinning tests added here), site build, website, actionlint.
