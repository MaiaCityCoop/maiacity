# Untangle audit: api-flow (play/api/src's intent flow and plumbing)

Checked out at origin/main d5346b7. Read only. Paths are relative to `play/api/src/` unless they start with `play/`,
`.github/` or `intent-work/`. HELD files (held.txt): `assetdocs.ts`, `graphs.ts`, `lod.ts`, `play/SPEC.md`,
`test/assetdocs.test.ts`.

Cycle simulation: `scratchpad/sim/sim.ts` and `scratchpad/sim/sub.ts` replay the edges in `scratchpad/audit/api-edges.txt`
(from `bun intent-work/5884ade4/graph.ts edges`) with each fix's edge cuts and additions applied.

## The 16-file cycle: which edges close it

`bun intent-work/5884ade4/graph.ts cycles` gives one 16-file strongly connected set: access, assetdocs, assets, gist,
intents, mainmerge, owners, pieces, retire, rules, sandboxes, ship, stories, storydocs, versioned, work. (The graph counts
`import type` edges too, which is right: they still tie the modules together.) It is closed by five groups of upward
edges, and all five have to go. I simulated every subset (`sub.ts`): every 4-of-5 subset still leaves a cycle of 2 to 8
files, and only the five together give 0.

| # | edge(s) | what crosses | why it is upward |
|---|---|---|---|
| E1 | `access.ts:10` → rules | `import type { AutoBy }` | the lowest auth module names a type of the rules feature; it pulls owners, assets, pieces and gist into the cycle (cutting it alone: 16 → 11) |
| E2 | `rules.ts:15` → versioned (`kindOfWork`); `intents.ts:15` → versioned (`workKinds`, `workSql`); `assetdocs.ts:32`, `stories.ts:40`, `storydocs.ts:12`, `sandboxes.ts:20`, `retire.ts:20` → versioned (`VersionError`, `Ctx`, `Verdict`, `versionAt`, `named`, `asVersionError`, `overlap`, `resolveEdits`, `docRef`); `storydocs.ts:11` → stories (type `StoryBody`); `retire.ts:19` → storydocs (`authorOf`) | the kind registry and small generic helpers live in `versioned.ts`, which also registers every kind (`versioned.ts:1155-1293`) and so imports every kind module. Everyone who needs the registry or a helper imports the module that imports them |
| E3 | `versioned.ts:38` → ship (`acceptAndShip`, `acceptCode`, `runningCommit`); `intents.ts:15` → versioned (`decideAny` for `autoMove`) | `decideAny`/`decideOne` (`versioned.ts:1045-1076`) dispatch an intent's decision across code (ship), work (versioned) and the intent itself (intents). That dispatcher sits in the middle layer, and `autoMove` (`intents.ts:675`) calls it from below |
| E4 | `work.ts:18` → intents (`decisions`, `gate`, `IntentError`, `By`) | `putAtProposal` and `settle` are stage moves, but they live in work.ts, while intents.ts imports `closeWork`, `intentIdOf` and `WORK_STATUS` back from it (`intents.ts:14`) |
| E5 | `mainmerge.ts:16` → ship (`GitHubError`, `intentLink`, `GitHub`); `intents.ts:10` → ship (type `GitHub`); `delivery.ts:20` → ship (types) | the GitHub REST client (`ship.ts:139-235`) is inside ship.ts, which imports mainmerge (`ship.ts:19`) |

Neither a single registry nor a single lower layer breaks the cycle on its own. What does is **one layering of the
intent core**, five cuts made together (Fix A below). The simulation (`sim.ts`) goes 16 → 11 → 10 → 10 → 8 → 0 as
E1…E5 are applied in that order.

Beside it: `docs/schemas.ts ↔ docs/store.ts` (the documents auditor's) and the module cycle `play/api/src ↔
play/api/src/docs` (docs/ imports `../pg`, `../ids`, `../hash`, while src imports docs/). There is also a cycle the
script cannot see, because it skips `play/api/import/`: `sandboxes.ts:13` and `assetdocs.ts:29` import
`../import/plan`, which re-exports `../src/recipes` (`import/plan.ts:4`).

## Problems

### Hidden links (must change together; the code doesn't show it)

1. **Advisory lock numbers reused across features.** `4711030` is the ship queue (`ship.ts:245,373`), the rule set's
   seed (`rules.ts:54`) and the schemas' seed (`docs/schemas.ts:112`). `4711031` is the intent-dependency edges
   (`intents.ts:207`) and the layout migration (`sandboxes.ts:554`). `4_711_029` is migrations (`migrations.ts:52`).
   Each lock is a bare literal with no registry, so the Ship queue unknowingly serializes with schema seeding.
2. **Doc-author helper defined three times:** `versioned.ts:161`, `storydocs.ts:24` (handles "import" too) and
   `assetdocs.ts:58`. On top of that, `via === "mcp" ? "mcp" : "site"` appears 11 times (assetdocs ×6, stories ×2, retire,
   sandboxes, versioned). The "via" vocabulary differs per layer: author `mcp|site|import`, work `web|mcp`
   (`work.ts:189`), withdraw `mcp|site` (`withdraw.ts:32`), retire `mcp|web` (`retire.ts:41`). `app.ts:227` passes
   "site" to withdraw while `app.ts:233` passes "web" to retire. 13 signatures spell one of these unions.
3. **The same "reason in a line" validator three times:** `reasonOf` in `retire.ts:23`, `withdraw.ts:24` and
   `stepback.ts:82`. Only the noun differs.
4. **"Can this admin see this intent" written out eight times:** `admin(me, INTENT_ADMINS)` + `intentRow` + `seesIntent`
   → `"There is no such intent." 404` appears in `intents.ts:340,353,573`, `retire.ts:268`, `withdraw.ts:36`,
   `versioned.ts:1048`, and `mcp.ts:921` (again, for every tool). It also exists as a SQL fragment in `owners.ts:48`.
   The literal "There is no such intent." occurs 13 times in 7 files.
5. **Error-class allowlists in two transports, and they differ.** `app.ts:344` lists 13 classes. `mcp.ts:924` lists 9,
   plus `name === "Denied"` and a catch-all on `.status`. So an error with a status but not on app's list
   (`GitHubError`, `PieceError` once given one) gives a 4xx over MCP and a 500 over HTTP. There are 21 `extends Error`
   classes in src (20 with a `status`, written the same way each time), and 18 catch-rethrow sites translate one class
   into another only to get past an allowlist (`retire.ts:56`, `versioned.ts:194,195,628,1275`, `stories.ts:953`,
   `sandboxes.ts:387`, `assetdocs.ts:605…1007` ×9).
6. **A global set by app.ts and read by ship.ts:** `shipWork.store` (`ship.ts:27`, set at `app.ts:55`, read at
   `ship.ts:795,798`). The reconcile's ability to accept work depends on `app()` having been called first in the same
   process. Two `app()` calls (tests) mean the last store wins.
7. **autoMove is a convention every path must remember.** It is called from the MCP propose wrapper (`mcp.ts:140`),
   check_intent (`mcp.ts:702`), `artifacts.ts:421,425`, `ship.ts:633` (watchPulls, without a store, so
   `ctx.store as BlobStore` at `intents.ts:690` passes undefined) and `versioned.ts:1054` (autoAfter). The HTTP propose
   route (`app.ts:212-222`) never calls it, so a rule applies over MCP but not over HTTP for the same work.
8. **The intent's own work columns mirror its first intent variant's `refs`.** `work.ts:139-140` (OWN_REFS) and
   `work.ts:219-223` (ownColumns) copy `asset_id, base, version, story_id, story_base, story_version` both ways.
   `withdraw.ts:56` clears the same seven columns from its own hand-written list. `intents.ts:149-176` and
   `rules.ts:103` read the columns, `work.ts:93` reads the refs. Two homes for one fact.
9. **`SKILL_STAGES` (`skills.ts:20`) is a copy of `INTENT_STAGES` (`intents.ts:28`)**, and its comment says so.
10. **The same SQL in two files:** keepSeen `ship.ts:291` = keep `mainmerge.ts:50`
    (`UPDATE play.intents SET pr_seen …`), and the open-PR query `ship.ts:622` = `mainmerge.ts:72`. `short = s.slice(0,7)`
    three times (`ship.ts:721`, `mainmerge.ts:28`, `substate.ts:43`). `ship.ts:581` `stable()` is `hash.ts:9`
    `canonical()` again.
11. **The invite-open predicate three times:** `used_by IS NULL AND expires_at > now()` at `auth.ts:60,88` and
    `members.ts:107`. The name rule `cleanName(...).length < 2` + message three times (`auth.ts:57`,
    `members.ts:46-47,55-56`). The last-admin check twice (`members.ts:35-36,82-83`). "That human is not a member" ×3.
12. **The intent trailer regex in four places:** `ship.ts:678`, `play/avenbox/pr-intent.ts:17`,
    `play/avenbox/live-audit.ts:68` (looser, `[0-9a-f-]{36}`, and a second `trailersOf`), and
    `.github/workflows/intents.yml:48`.
13. **Required check names written on both sides:** `substate.ts:8` REQUIRED_CHECKS = `.github/actions/main-green/action.yml:20`
    = `play-checks.yml:35` / `website-checks.yml:35` = main's ruleset. `ACCEPTED_CONTEXT` (`ship.ts:31`) and
    `MERGES_CONTEXT` (`mainmerge.ts:20`) are also named by the ruleset and `release.yml:3`.
14. **Each kind's document format written in prose in mcp.ts:** `*_FORMAT`, `RECIPE_RULE` and `EDITS`
    (`mcp.ts:61-131`, about 12.6 KB). They restate `migrations/schemas/*.json`. A schema is a document changed by
    intent (CLAUDE.md: "never a type written in code"), but these strings only change by a code deploy.
15. **`HASH` regex redefined** at `mcp.ts:51` instead of imported from `hash.ts:7`.
16. **`readableRefs`' group list** (`play/api/import/plan.ts:7`: plants…biomes) has drifted from `groups.ts:5`: it has no
    `characters` and no `worlds`. Live code (`sandboxes.ts:13`, `assetdocs.ts:29`) imports it from the import/ folder.
17. **COOP has two sources:** `ids.ts:7`, re-exported by `access.ts:5`. 12 files take it from access, 3 from ids.
18. **`app()` and `mcp()` each default `commit = runningCommit()`, and so does `decideAny`** (`app.ts:53`, `ship.ts`
    ×4 defaults, `versioned.ts:1045`). index.ts passes `github` but not `commit` (`index.ts:30`), so every layer reads
    `PLAY_COMMIT` from env on its own.

### Needless links (tied, but change for different reasons)

19. **versioned.ts is a god module** (1,295 lines, 88 KB): the registry, the generic doc API (docAt/docEdit/propose),
    review, decideWork, decideAny (intent dispatch across ship), schema acceptance, and the registration of 9 kinds with
    their checks (story, asset, factory, levels, skill, sandbox, schema, artifact, piece: `versioned.ts:1090-1293`).
    It co-changed with intents.ts in 9 of the 10 intents.ts commits sampled.
20. **ship.ts mixes four reasons to change** (828 lines): the GitHub REST client (`:139-235`), Accept→Ship queue
    (`:300-454`), the watcher loop (`:599-664`) and the reconcile (`:666-808`). mainmerge and delivery reach in only
    for the client.
21. **migrations.ts, the low-level schema runner, imports feature modules:** `docs/schemas` (fine), `sandboxes.ts:13`
    (ensureLayouts) and `rules.ts:14` (ensureRules). So `migrate()` transitively loads versioned and every kind. The
    seeding steps belong at the composition root (index.ts, import/run.ts, the test helper).
22. **delivery.ts imports intents.ts only for the `INTENT_ADMINS` string** (`delivery.ts:17`), and ship.ts for types
    only (`:20`).
23. **The board query hard-codes two kinds:** `intentsWhere` (`intents.ts:149-176`) joins `play.assets`,
    `asset_versions` and `story_versions` by the legacy columns, beside the registry's `workSql()`. `owners.ts:50-51,170`
    hard-codes `'asset:%'` / `'asset:'`, although the registry knows which kind is owned (`Kind.owned`,
    `versioned.ts:209`).
24. **`flat()` (`artifacts.ts:405`) fakes a `Db` over a transaction** so it can call `addIntent`, `specifyIntent` and
    `recordChecks`, which each take a `Db` to open their own transaction. The flow functions mix "open a transaction"
    with "do the move". Five redundant `(ctx.db as Db)` casts (`versioned.ts:293,329,372,586`, `retire.ts:46`) and
    `tx as any` (`ship.ts:798`) are the same seam.
25. **Callbacks passed only to dodge the cycle:** `intentOf(…, reviewOf)` (`intents.ts:336`), `intentDocOf(…,
    reviewHeld)` (`:350`) and `promptOf(…, intentRow)` (`skills.ts:89`). Every caller passes the same function
    (`app.ts:203,209`, `mcp.ts:527,912`). These are parameters for one caller, symptoms of E2/E3.

### Surplus (no reason of its own to change)

26. **Dead exports:** `pg.ts:54-57` `db`/`useDb` (a global never set or read), `uuid.ts:14` `uuidv5` and its `NAMESPACE`,
    `work.ts:202` `heldWith`, `engines.ts:11` `BOX_ENGINES`, `recipes.ts:4,33` `RefError`/`parseRef` (only
    `test/plan.test.ts`, through the barrel `import/plan.ts:4`).
27. **`library.ts:18` `LIBRARY_OPEN_TO = "admin"`:** a config for a value that never varies, with one branch on it
    (`:34`).
28. **`tobucket.ts`:** a one-time move from the folder to the bucket, guarded in `production.yml:242` by
    `[ -d $DATA_MOUNT/play/blobs ]`. The folder is moved away the first time it runs, so the step is dead after one
    deploy, and so is the file shipped in the image.
29. **`migrate.ts` and package.json's `"migrate"` script:** nothing runs them (index.ts and import/run.ts call
    `migrate()` themselves; no workflow, script or doc names it).
30. **`import/plan.ts` is a re-export barrel** of src/recipes plus one 8-line validator that only src uses. It belongs in
    src.
31. **Blank lines and duplicate imports:** `intents.ts:586-588` (empty block), `ship.ts:16,22` (two imports from
    `./access`), `mcp.ts:41-48` (an import after a `const`).

### Special cases (evidence of a missing design)

32. **`to_jsonb(x)->'col'` reads kept so code runs against databases migrated short** (migration tests):
    `intents.ts:145-146` (steps, pr_seen, work_kind, auto), `owners.ts:52` (owner), `rules.ts:91` (work_kind),
    `ship.ts:785` (auto), `gist.ts:23` (gist, plus a "kept" probe), `work.ts:93` (refs). Live code carries fallbacks for
    columns that exist on every real database. The fault is the tests running today's code on yesterday's schema.
33. **`piece:` special-cased by prefix in the flow:** `work.ts:152-155,164` (a piece may be held in several versions;
    the `ON CONFLICT … WHERE doc_id NOT LIKE 'piece:%'` partial index) and `versioned.ts:787`. This should be a `Kind`
    flag (several versions per intent).
34. **One sandbox special-cased by UUID in routing:** `app.ts:166`
    `if (p.id === SANDBOX.factories && m.level !== "admin")`. It is a per-sandbox access rule written as an `if` in the
    router.
35. **MCP picks its propose tools by name:** `mcp.ts:844-846` matches `startsWith("propose_")` or `add_artifact` /
    `update_artifact` to decide which tools get the `intent` argument and the gate. A tool flag (`proposes: "required" |
    "own"`) would say it.
36. **Swallowed errors:** `ship.ts:447` `.catch(() => {})` (a failed "failure" status after a failed merge),
    `ship.ts:566` `.catch(() => [])`, `artifacts.ts:85` `catch {}`, `blobs.ts:171,179,181` (the mirror's fallbacks,
    intended but silent), `intents.ts:702` and `ship.ts:633` (autoMove failures only warned), `intents.ts:689-693`
    (any error with a `status` turned into "refused"). `app.ts:45-50` turns a bad JSON body into `null`.
37. **`decideIntent` reject/reopen, `stepBack` and `withdrawDoc` each write stage SQL directly.** 13 raw stage writes
    across 5 files (`intents.ts` ×6, `ship.ts` ×2, `stepback.ts` ×2, `withdraw.ts`, `work.ts` ×2), and 8 copies of
    "clear the rule's accept" (`auto - 'accept'` / `auto = '{}'`). The single gate covers only forward moves. Backward
    moves have no single writer, so each must remember `auto`, `results`, `decided_*` and `approved_*`.
38. **`intents.ts:690` casts `ctx.store as BlobStore`** where it may be undefined (watchPulls passes `{ db }`). A rule
    accepting work from the watcher would then call decideWork without a store.
39. **`intentLink` hard-codes `https://play.maia.city`** (`ship.ts:243`), though origins come from env elsewhere
    (`auth.ts:17` SITE_ORIGIN).

## Fixes (fewest that remove the most)

### A. Layer the intent core (cycle 16 → 0)

Five cuts, all needed (simulated):

- **A1.** Move `AutoBy` into access.ts; rules.ts imports it from there. (E1)
- **A2.** Add **`kinds.ts`** below versioned: the `Kind` type, `register`/`unregister`/`syncKinds`/`kinds`/`kindNamed`/
  `kindOfWork`/`kindOfDoc`/`workKinds`/`workSql`/`docRef`, `VersionError`, `Ctx`, `Verdict`, and the generic helpers
  (`versionAt`, `named`, `overlap`, `asVersionError`, `resolveEdits`, the one doc `authorOf` with one `Via` type). It
  imports only docs, pg, ids, uuid and access. Kind modules import kinds.ts, never versioned. Move `StoryBody` to
  storydocs. Kind registrations go to each kind's module, or to `kinds/all.ts` imported by app.ts, index.ts and the
  tests. (E2; also removes 2, 19, 23, 25)
- **A3.** Add **`decide.ts`** at the top, holding `decideAny`, `decideOne`, `autoMove` and `autoAfter`, and
  **`watcher.ts`** holding watchTick, startShipWatcher and watchPulls (so autoMove after a PR read lives above ship).
  decide.ts runs autoMove after every successful move itself. (E3; also 7, 18, 38)
- **A4.** Make work.ts pure SQL on the intent's work. `putAtProposal` and `settle` move into intents.ts, beside `gate`
  and `decided`. (E4)
- **A5.** Add **`github.ts`**: the REST client, types, `GitHubError`, `intentLink` and the status contexts. ship,
  mainmerge, intents and delivery import it. (E5; also 13 in part, 20, 22, 39)

Removes problems 2, 7, 18, 19, 20, 22, 23, 25, 38 and the cycle.

- **Files:** access, rules, versioned, kinds (new), decide (new), watcher (new), github (new), work, intents, ship,
  mainmerge, delivery, retire, withdraw, stepback, storydocs, stories, sandboxes, pieces, gist, mcp, app, index, and
  **assetdocs.ts (HELD**: its import of versioned → kinds and of `byOf`/`putAtProposal`).
- **Risk:** medium. It moves code without changing logic, but registration order matters (`docs.hook` at register).
  Behaviour is pinned by `versioned.test.ts` (register/unregister), `schemas.test.ts` (syncKinds), `rules.test.ts`
  (stubs `decisions.decided`, autoMove), `depends.test.ts` (stubs `gate.mayMove`), `gate.test`, `intents.test`,
  `onerecord.test`, `nobypass.test`, `needsintent.test`, `ship.test`, `mainmerge.test` and `delivery.test`
  (watchTick/watchPulls imports move to watcher.ts), `allwork.test` and `api.test`.
- **Bound:** `bun intent-work/5884ade4/graph.ts cycles` shows no `play/api/src` file cycle except
  `docs/schemas↔docs/store` (big SCC 16 → 0). `grep -lE 'from "\./versioned"' play/api/src/*.ts` lists only versioned's
  callers above it (mcp, app, decide, ship, artifacts, kinds/all), never rules, intents, work, assetdocs, stories,
  storydocs, sandboxes or retire. versioned.ts ≤ 900 lines.

### B. One error type with a status

Replace the 20 status-carrying classes with one `HttpError(message, status)` (in access.ts or a new `errors.ts`
beside pg); keep domain subclasses only where callers branch on them (`InviteUsed`, `GitHubError`). app.ts and mcp.ts
both map `instanceof HttpError` → its status, else 500.

- **Removes:** 5, and the translate-and-rethrow seams in 24.
- **Files:** every module with an `extends Error`, app.ts, mcp.ts, **assetdocs.ts (HELD**, 9 rethrows), `lod.ts`
  (HELD).
- **Risk:** low to medium. Error messages and statuses stay the same, but the HTTP status of errors that are not on
  app's list today changes from 500 to their own (intended). Pinned by `api.test`, `toolschemas.test`,
  `needsintent.test` and `nobypass.test` (status asserts).
- **Bound:** `grep -c 'extends Error' play/api/src/*.ts play/api/src/docs/*.ts` ≤ 5 (from 21);
  `grep -cE 'instanceof \w+Error \? new' play/api/src/*.ts` = 0 (from 18);
  `grep -c 'instanceof' play/api/src/app.ts` ≤ 2.

### C. One intent guard and one stage writer

- `intentFor(db, me, id)` does admin + intentRow + seesIntent + the 404, and is used by intentOf, intentDocOf,
  intentReady, retire, withdraw, decideAny and mcp's pre-check.
- One `reasonOf(noun)`.
- One `moveBack(q, id, to, step)` in intents.ts writes every backward move: reject, reopen, stepBack, withdraw, settle's
  self-archive and saveShip back to Proposal. It clears `auto`, results and decided/approved fields in one place.

- **Removes:** 3, 4, 37.
- **Files:** intents, retire, withdraw, stepback, work, ship, versioned, mcp.
- **Risk:** low to medium (stage side effects). Pinned by `intents.test`, `withdraw.test`, `retire.test`,
  `private.test` (same 404 text), `ship.test`, `depends.test` and `rules.test` (auto cleared).
- **Bound:** `grep -c "There is no such intent" play/api/src/*.ts` ≤ 2 (from 13); `grep -l 'const reasonOf'` = 1
  (from 3); `grep -cE "SET (.*, )?stage =|stage = CASE" play/api/src/{stepback,withdraw,work,ship}.ts` = 0 (from 7).

### D. Intent's work in one place (drop the mirrored columns)

The intent's refs live only in `intent_variants.refs`. Drop `play.intents.asset_id, base, version, story_id,
story_base, story_version` (one migration, a table change, not a type). intentsWhere and rules read the first
variant's refs, and the board's label, group and number come from the registry (`workSql`) for every kind, assets and
stories included. Make a piece's several-versions rule the `Kind` flag `manyPerIntent` instead of the prefix. Use
`Kind.owned` for owners' SQL instead of `'asset:%'`.

- **Removes:** 8, 23, 33.
- **Files:** work, intents, rules, withdraw, owners, versioned/kinds, a new migration, plus readers outside the area
  (stories.ts, assetdocs.ts **HELD**, which write `asset_id`/`story_id` into `Work`).
- **Risk:** medium to high (the board's JSON shape `work.asset_id`/`story_id` is read by the site). Pinned by
  `board.test`, `onerecord.test`, `allwork.test`, `migrate.test`, `intentpieces.test`, `private.test` and `rules.test`.
- **Bound:** `grep -c "OWN_REFS\|ownColumns" play/api/src/work.ts` = 0; `grep -c "'piece:\|LIKE 'piece" play/api/src/work.ts`
  = 0; `grep -c "asset:%" play/api/src/owners.ts` = 0; `grep -cE "\b(asset_id|story_id|story_base|story_version)\b"
  play/api/src/{intents,work,withdraw,rules}.ts` = 0.

### E. Tests build today's schema; drop the `to_jsonb` fallbacks

Migration tests that run `migrate(db, { until })` assert the SQL state only and never run the flow's code on the
shortened schema. Then read the columns directly.

- **Removes:** 32.
- **Files:** intents, owners, rules, ship, gist, work, and the tests `migrate`, `onerecord`, `uuids` and `build`.
- **Risk:** low for production (the columns exist everywhere live). The fallbacks are pinned only by those migration
  tests.
- **Bound:** `grep -c "to_jsonb(" play/api/src/{intents,owners,rules,ship,gist,work}.ts` = 0 (from 7).

### F. MCP and HTTP share one handler per read

Each read that both transports expose (file by hash, story at
`intent|edit|version`, asset at `intent|edit`, doc at/history, intent with `reviewOf`) becomes one function taking
parsed args, called by both the route and the tool. Mask and see-checks happen in one wrapper used by both. Propose
tools declare `proposes: "required" | "own"` instead of being matched by name. HTTP propose goes through the same
gate-and-autoMove wrapper (with A3). mcp.ts takes kind formats from each schema document (a `description` on the
meta-schema, served by `doc_at` and the tool description at `tools/list`, which already calls syncKinds) instead of
`*_FORMAT` constants. `HASH` is imported.

- **Removes:** 7 (with A3), 14, 15, 35, and the get_file / get_story / get_asset / doc_at copies (`mcp.ts:182-192`
  vs `app.ts:132-158`; `mcp.ts:426-430` vs `app.ts:321-327`; `mcp.ts:178` vs `app.ts:109-127`; `mcp.ts:329,341` vs
  `app.ts:246-254`).
- **Files:** mcp.ts, app.ts, and schemas in `migrations/schemas/*.json` (a description per schema, proposed as schema
  versions: no code type).
- **Risk:** medium (tool descriptions change what agents read). Pinned by `toolschemas.test`, `api.test` and
  `skills.test`.
- **Bound:** `grep -cE '^const [A-Z_]+(FORMAT|RULE|EDITS)\b' play/api/src/mcp.ts` = 0 (from 8);
  `grep -c 'startsWith("propose_")' play/api/src/mcp.ts` = 0; `grep -c '^const HASH' play/api/src/mcp.ts` = 0;
  `wc -c play/api/src/mcp.ts` ≤ 60 KB (from 84.8 KB).

### G. Small shared plumbing and surplus removed

- A `locks.ts` names each advisory lock once, so no two features share a number.
- The PR-seen SQL lives once (github or ship store), as do `short` and `canonical` (drop `stable`).
- auth/members use one `inviteOpenSql`, one `nameOf` (clean + ≥2 rule) and one `lastAdmin` check.
- `SKILL_STAGES` imports `INTENT_STAGES` from a lower constant.
- COOP is imported from ids only (drop the access re-export).
- `readableRefs` moves into `src/recipes.ts` with its groups from `groups.ts`.
- Delete `pg.db/useDb`, `uuidv5`, `heldWith`, `BOX_ENGINES`, `parseRef/RefError` (and its test lines),
  `LIBRARY_OPEN_TO`, `import/plan.ts`, `migrate.ts` + its package script, and `tobucket.ts` + its production.yml step
  (once confirmed run).
- ensureLayouts and ensureRules move out of migrations.ts to a `seed()` called by index.ts, import/run.ts and the test
  helper.
- Remove `shipWork`: the store is passed in `{ db, store }` like everywhere else.
- Name the swallowed catches or log them.

- **Removes:** 1, 6, 9, 10, 11, 12 (TS side), 15, 16, 17, 21, 26, 27, 28, 29, 30, 31, 34 (the Factories rule as a
  sandbox's data or one `mayOpen` in sandboxes), 36, 39.
- **Files:** ship, mainmerge, substate, rules, intents, sandboxes, docs/schemas, migrations, auth, members, skills,
  access + its 12 importers, pg, uuid, work, engines, recipes, library, import/plan.ts, tobucket.ts, migrate.ts,
  package.json, production.yml, index, app, `play/avenbox/{pr-intent,live-audit}.ts` (share ship's trailer parser),
  **assetdocs.ts (HELD**: its `readableRefs` import).
- **Risk:** low. The deletions are dead or test-only. Moving the seed is pinned by `migrate.test`, `rules.test`,
  `sandboxdocs.test` and `schemas.test`. Locks are pinned by `depends.test` (concurrent edges) and `ship.test` (queue).
- **Bound:** `grep -cE 'pg_advisory_xact_lock\(4711|_LOCK = 4_711' play/api/src/**/*.ts` counted outside `locks.ts` = 0;
  `test ! -e play/api/src/tobucket.ts && test ! -e play/api/src/migrate.ts && test ! -e play/api/import/plan.ts`;
  `grep -c 'from "./sandboxes"\|from "./rules"' play/api/src/migrations.ts` = 0;
  `grep -c 'shipWork' play/api/src/*.ts` = 0; `grep -c 'export { COOP }' play/api/src/access.ts` = 0;
  `grep -cE "catch\(\(\) => \{\}\)|catch \{\}" play/api/src/*.ts` = 0;
  `grep -c 'const short = (s: string) => s.slice(0, 7)' play/api/src/*.ts` ≤ 1;
  `bun intent-work/5884ade4/graph.ts orphans | grep play/api/src` lists only `verify.ts`.

### Next untangles (HELD)

- assetdocs.ts: its parts of A2/A4 (imports kinds and intents), B (9 rethrows), D (`Work` refs) and G
  (`readableRefs` import).
- lod.ts: B (`LodError`).
- play/SPEC.md: references to `versioned.ts decideAny` and `ship.ts` watcher locations need updating after A3/A5.
- Outside this area: the `docs/schemas ↔ docs/store` cycle and the `src ↔ src/docs` module cycle (docs/ importing
  `../pg`, `../ids` and `../hash`) belong to the documents auditor. A lower `core/` folder for pg, ids, hash and uuid
  would close the module cycle.
