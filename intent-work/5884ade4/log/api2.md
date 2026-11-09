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
