# Untangle audit: api-docs (play/api/src versioned-document layer, play/api/migrations)

Read only, origin/main. Paths relative to /home/user/maiacity. HELD files (other intents): play/api/src/assetdocs.ts,
lod.ts, graphs.ts, play/api/test/assetdocs.test.ts, play/SPEC.md.

Graph today (`bun intent-work/5884ade4/graph.ts`):
- file cycle `docs/schemas.ts ↔ docs/store.ts`
- file cycle of 16 api files: access, assetdocs, assets, gist, intents, mainmerge, owners, pieces, retire, rules,
  sandboxes, ship, stories, storydocs, versioned, work
- module cycle `play/api/src ↔ play/api/src/docs`; `unstable`: src (I=0.14) → docs (I=0.25) ×14

## Problems

### Hidden links (must change together, code doesn't show it)

1. **Per-kind refs columns copied in 5 places.** The list `asset_id, base, version, story_id, story_base, story_version`
   is written out in work.ts:31 (`REFS`), work.ts:92-94 (`OWN_REFS` SQL), work.ts:47 (`WORK_OF`), versioned.ts:681
   (`asOne`), intents.ts:151 (board JSON), withdraw.ts:56 (clearing them), migration 202611071200-7c8986c5 (backfill).
   Two kinds' private refs live on the generic intent row and in generic code.
2. **The merge-or-archive decision is copied 3 times.** "previewMerge → if concurrent, overlap(diff(was,now),
   diff(was,mine)) → archive with the same sentence; if problems → archive" is in versioned.ts:830-838 (decideDoc),
   versioned.ts:889-900 (decideWork), and stories.ts:1122-1139 (decideStory, with its own wording).
3. **"Write the accepted version's row" copied 4 times.** `cols = {[labelColumn]: json.label ?? json.title, ...row}`
   then `UPDATE ${table} SET …` is in versioned.ts:840-842 (decideDoc), 917-919 (pieces), 939-942 (merges), and the
   INSERT variant in seedDoc 597-600. `label ?? title` also in newDocument 521, reviewVariant 711, gist.ts:44.
4. **openVariant copied 3 times.** versioned.ts:441, stories.ts:848 (same SQL, same messages, StoryError), and
   assetdocs.ts:274 `openVariantOf` (HELD).
5. **asVersionError copied.** versioned.ts:190-199 and stories.ts:837-846 (asStoryError) map DocError/SchemaError/
   EditError the same way; sandboxes.ts:521 a third partial copy.
6. **authorOf defined 3 times** (versioned.ts:161, storydocs.ts:24, assetdocs.ts:58 HELD) with slightly different
   `via` mapping; retire.ts:19 imports the story one for generic use.
7. **Human-name lookup copied 3 times** inside versioned.ts (166, 238, 336: `SELECT id, name FROM play.humans WHERE id = ANY`).
8. **reviewVariant and listedVariant (versioned.ts:701-745) compute the same `moved`, `open`, `breed`** with copied code.
9. **"A new document is one change of the whole → list its fields"** copied in versioned.ts:772-773 and gist.ts:37-39.
10. **Doc-id builders per kind**: `docIdOf` storydocs.ts:16 and skills.ts:22 (same name, two modules), `layoutDoc`
    sandboxes.ts:321, `assetDocId` assetdocs.ts:40 (HELD), `RULES_DOC` rules.ts:32, `` `artifact:${id}` `` versioned.ts:1248,
    `` `schema:${id}` `` ×4 in docs/schemas.ts; while the registry already holds every `prefix`. 25 `split(":")[1]` /
    `split_part(…, ':', 2)` parses across src.
11. **Old schema names as string literals** beside schema UUIDs: `"story/1"` stories.ts:52, storydocs.ts:17,23;
    `"sandbox/1"` sandboxes.ts:327; `"artifact/1"` artifacts.ts:454, versioned.ts:1248; `"rules/1"` rules.ts:45;
    `"asset/1"` assetdocs.ts:48,73,159 (HELD). The JSON's `schema` field duplicates play.docs.schema_id and the
    `schema` column (0034 comment calls it "only shown"), and resolveEdits (versioned.ts:412) must special-case path `schema`.
12. **Seed list of schemas written twice**: ids.ts `SCHEMA` and docs/schemas.ts:28 `FILES` map (UUID→file name); a new
    seed schema needs both plus a JSON file.
13. **Advisory-lock numbers are magic and shared by accident**: 4711029 migrations.ts:56, 4711030 in both
    docs/schemas.ts:112 and rules.ts:54 (same lock, different purposes), 4711031 sandboxes.ts:556.
14. **Error classes listed by hand** at every boundary: mcp.ts:924 and app.ts:344 enumerate VersionError, WorkError,
    StoryError, SandboxError, SkillError, AssetDocError, ArtifactError…; each kind module re-wraps into VersionError
    (sandboxes.ts:387, assetdocs ×5, versioned.ts:628,1275, stories.ts:953, retire.ts:56).
15. **Piece specifics leak into generic SQL**: `'piece:%'` in pieces.ts:69 and versioned.ts:787 (same query twice),
    work.ts:106,118, and the partial unique index `WHERE doc_id NOT LIKE 'piece:%'` in migration 02e3a85f.
16. **Asset ownership hard-coded twice**: Kind.owned = "owner" (versioned.ts:1157) and owners.ts:49-52 `LIKE 'asset:%'`
    on play.assets; they must agree.
17. **Board label/group per kind written twice**: versioned.ts `workSql()` from the registry, and intents.ts:153-155
    `COALESCE(wa.label, sv.title, …)` joining asset and story-version tables directly.

### Needless links

18. **versioned.ts imports every per-kind module** (assetdocs HELD, stories, storydocs, sandboxes, skills, pieces, rules,
    retire, gist, listed) to register the kinds at its bottom (versioned.ts:1155-1293), while those modules import
    versioned (overlap, VersionError, docRef, proposeNewDoc…). This is the core of the 16-file cycle: the generic layer
    depends on every kind instead of kinds depending on it.
19. **versioned.ts is a god file (1295 lines) with four reasons to change**: the document API (list/read/history/edit/
    propose), the multi-document Accept (decideWork, piecesInOrder), the intent lifecycle (decide, decideAny,
    decideOne, archiveOwn: imports ship.ts acceptAndShip/acceptCode, intents.ts gate/mustDecide/autoAfter), and the
    kind registry with per-kind checks and per-kind code (storyCheck, assetCheck, factoryCheck, levelsCheck,
    ARTIFACT_ROW/ensureArtifactDoc, PIECE_CHECK, decideSchema). intents.ts → versioned (decideAny, workSql) and
    versioned → intents/ship close the loop.
20. **docs/store.ts ↔ docs/schemas.ts cycle**: store needs `typeFor` (schemas.ts), schemas needs `readDoc/createDoc/
    DocError` (store.ts).
21. **docs depends on src (module cycle)**: docs/schemas.ts imports ../ids (COOP, SCHEMA) and does play.records
    INSERTs (ensureSchemas, schemas.ts:116) — app-level bootstrap inside the storage layer; core.ts/store.ts import
    ../hash, ../pg. The leaf kit (pg.ts, hash.ts, ids.ts, uuid.ts import nothing of src) sits in the same directory
    as the app, so the module graph can't tell them apart.
22. **Generic docs layer knows the asset's fields**: docs/breeds.ts:11 `BREED_FIELDS = ["source","card"]`; gist.ts:40
    reads `source` and `variants[].source` and pieces' `require()` for every kind.
23. **migrations.ts (the runner) imports feature modules**: ensureLayouts (sandboxes.ts), ensureRules (rules.ts),
    ensureSchemas — the stable runner depends on volatile kinds; migrations.ts → sandboxes → versioned → … puts the
    runner inside the big cycle's reach.
24. **Bypassing the docs barrel**: sandboxes.ts:18 imports `./docs/core` internals (applyEdits, jsonOf, newDoc, seed);
    migrations.ts:12 imports `./docs/schemas` directly.
25. **decideLayout takes the generic decide as a parameter** (sandboxes.ts:495, wired at versioned.ts:1192) only to
    avoid an import cycle; decideSchema (versioned.ts:1207) wraps decideDoc the same way. Both are "pre-check, then
    the generic accept, then post-write" — a hook shape the registry doesn't have.
26. **rules.ts imports versioned only for a legacy fallback** (rules.ts:15,103 kindOfWork for "work held in no
    intent variant"); versioned imports rules only for `type AutoBy` — two edges of the cycle for nothing structural.
27. **`Kind` is a 25-member hook interface** (versioned.ts:56-104): ensure, write, propose, review, decide, item, more,
    view, shown, ready, accepted, row, owned, breeds, check, build, listed, where, open… Most kinds use 3-5; `propose`
    and `decide` let a kind bypass the shared path entirely (asset, story).
28. **stories.ts is a god file (1340 lines)**: timeline checking, links, the story's parallel version store and
    propose/decide, folds (a one-time data move), and media upload (putAudio/putVideo/putFrame/putDocument/
    putComposition, 1200-1340) that has nothing to do with stories as documents (library/MCP use them).

### Surplus

29. **Story keeps a second version store**: play.story_versions (content-addressed id, number, approved_by, head on
    play.stories) is written in proposeStory (stories.ts:935), foldVersion, decideStory, seedStory beside the Loro
    document's play.doc_versions, with a runtime assertion that they agree (stories.ts:990, 1112 "story … and its
    document disagree"). Same for sandboxes: play.sandbox_pins/sandbox_configs re-written from the doc on accept
    (sandboxes.ts:470 writeRows), and artifacts: every field mirrored as a column (versioned.ts:1257-1260 `row`).
30. **Per-kind reads duplicating docAt**: storyAt (stories.ts:1159, `?edit=`/`?intent=` on /api/stories, MCP get_story),
    layoutAt/proposedState (sandboxes.ts:515-548), assetAt (HELD) re-implement docAt's `edit`/`intent` branches.
31. **seedStory duplicates seedDoc** (stories.ts:1179 vs versioned.ts:592); imports call seedDoc for skill/factory/
    game_config but seedStory for stories.
32. **Legacy "ensure from before documents" paths still run on every read or deploy**: Kind.ensure for story
    (ensureStoryDoc), sandbox (ensureLayoutDoc), artifact (ensureArtifactDoc), asset (HELD); ensureStoryDocs at every
    import; ensureLayouts at every migrate reading play.sandbox_changes_kept; foldStories "run with every deploy"
    (stories.ts:997). docRef does an extra `SELECT 1 FROM play.docs` per lookup for it (versioned.ts:228).
33. **Legacy fallbacks for schemas before a column**: gist.ts:23 `to_jsonb(v)->'gist'`, owners.ts:43-52
    `to_jsonb(pa)->>'owner'`, intents.ts:144-146 `to_jsonb(i)->…` — "so a migration's test still reads".
34. **`export { assetDocFor }` re-export** at versioned.ts:1295 (pass-through of a HELD module).
35. **syncKinds re-reads every schema before every lookup** (docRef, listDocs, newDocument; versioned.ts:126) and
    mutates the global KINDS array (register/unregister) — the registry is process-global mutable state tests must
    clean up (`unregister` exists only for tests).

### Special cases

36. **`if (k.name !== "piece") return;`** growFromHeld versioned.ts:478; `kindOf(h).name === "piece"` decideWork 875;
    `docId.startsWith("piece:")` work.ts:106. A piece's "several versions per intent" is a kind property written as ifs.
37. **`o.work.story_id ? SCHEMA.story : o.work.asset_id ? SCHEMA.asset`** work.ts:84 — kind guessed from refs.
38. **Hard-coded tool names in generic messages**: newDocument "propose_asset, propose_story" (versioned.ts:516),
    newVariant "only an asset has" breeds (499).
39. **Required fields faked in code because new Mains are born empty**: artifact.json and piece.json `required:
    ["schema"]` only, so ARTIFACT_CHECK (versioned.ts:1252) and PIECE_CHECK (1266) re-impose required fields when the
    doc has >1 key. "Unique id in a list" is written 6 times as code (grep "taken twice" = 6 in versioned.ts) because the
    schema subset (docs/validate.ts Node) has no uniqueness keyword.
40. **New types added as code, not as schema documents** (CLAUDE.md: "a new type is a schema document and its intent,
    no code … never by a migration"): piece (27f55a3: migrations/schemas/piece.json + ids.ts SCHEMA.piece + FILES +
    register() + migration 5a15e468 creating play.piece_versions) and rules (5efe452: rules.json + SCHEMA.rules +
    migration de24f1c5 + ensureRules) were both added after 0034 made schemas documents. The only code-free kind path
    (syncKinds → play.records) was bypassed by both.
41. **Migrations creating per-kind tables for document kinds**: 0009 factories, 0012 stories, 0019 game_configs,
    0027 artifacts, 0031 skills (later folded into play.records by 1d9995c3), 5a15e468 piece_versions. Kinds with their
    own table (asset, story, factory, game_config, sandbox, artifact) vs play.records (skill, schema, piece, rules,
    schema-only) — two storage conventions for the same thing.
42. **Migration-runner conventions**: numbered ids 0001-0037 with 0035 missing (harmless, but LAST_NUMBERED=37 is a
    hand-kept constant); post-migrate steps (ensureSchemas/ensureLayouts/ensureRules) are code steps hard-wired into
    migrate() and skipped under `until`, so a database "as it stood then" never has them — tests built with `until`
    need the to_jsonb fallbacks of #33.
43. **Swallowed error**: artifacts.ts:85 `catch {}` (URL parse).
44. **decide's admin check written per kind**: versioned.ts:821, 859; stories.ts:1092; sandboxes.ts:496 (`admin()`),
    with different messages, though decideWork already checks once for all.

## Fixes

**F1. Invert the kind registry: kinds register themselves; versioned.ts imports no kind.**
Move each `register({...})` and its check/ensure/row code out of versioned.ts into its kind's module (or one
`kinds/` folder: story.ts, sandbox.ts, factory.ts, game.ts, skill.ts, schema.ts, artifact.ts, piece.ts), each importing
versioned; one `kinds/index.ts` imported once by app.ts/index.ts/import. Give the registry the hook shape sandbox and
schema need (`before(tx, p)` pre-check, `after(tx, json)` post-write) so decideLayout/decideSchema stop taking/wrapping
decideDoc. Drop the `assetDocFor` re-export; move `type AutoBy` and the rules legacy fallback out of the cycle.
Removes 18, 25, 26, 34, part of 19. Touches versioned.ts, sandboxes.ts, stories.ts, storydocs.ts, skills.ts, pieces.ts,
artifacts.ts, rules.ts, app.ts, index.ts, import/run.ts; **assetdocs.ts registration is HELD** (asset entry stays in
versioned until assetdocs is free, or moved by its intent). Risk: registration order (docs.hook before first typeFor);
pinned by versioned.test.ts, schemas.test.ts, sandboxdocs.test.ts, onerecord.test.ts, allwork.test.ts, factories,
gameconfigs, skills, artifacts, pieces tests.
Bound: `grep -cE 'from "\./(stories|storydocs|sandboxes|skills|pieces|rules|artifacts|assetdocs)"' play/api/src/versioned.ts`
= 0 (today 7; 1 while assetdocs is HELD); `grep -c '^register(' play/api/src/versioned.ts` = 0.

**F2. Split versioned.ts by reason: documents / accept / intent decisions.**
Keep versioned.ts = registry + list/read/history/edit/propose; `accept.ts` = decideDoc/decideWork/piecesInOrder with
ONE `mergeOrWhy(tx, docId, v)` (used by decideStory too) and ONE `writeRow(tx, k, docId, json)`; move decide/decideAny/
decideOne/archiveOwn to intents' side (a `decide.ts` beside intents.ts/ship.ts). Unify helpers: one authorOf, one
namesOf(humans), one openVariant, one asVersionError, one admin check in decideWork, shared `variantSummary` for
reviewVariant/listedVariant, shared `wholeAsFields` with gist.ts.
Removes 2, 3, 4 (non-HELD copies), 5, 6, 7, 8, 9, 19, 44. Touches versioned.ts, stories.ts, storydocs.ts, retire.ts,
sandboxes.ts, gist.ts, intents.ts, ship.ts, app.ts, mcp.ts; assetdocs' copies (openVariantOf, authorOf) HELD.
Risk: Accept transaction semantics (savepoints, archive wording asserted in tests); pinned by versioned.test.ts,
allwork.test.ts, intentpieces.test.ts, ship.test.ts, board.test.ts, nobypass.test.ts, retire.test.ts.
Bound: versioned.ts ≤ 700 lines (today 1295); `grep -c "overlap(" play/api/src/*.ts` = 2 (def + 1 use; today 4);
`grep -c "SELECT id, name FROM play.humans WHERE id = ANY" play/api/src/*.ts` = 1 (today 3);
`grep -c "instanceof docs.DocError" play/api/src/*.ts` = 1 (today 3); `grep -cE "^(export )?(const|async function|function) (authorOf|openVariant)\b" play/api/src/{versioned,stories,storydocs}.ts` = 2;
graph: no SCC containing both versioned.ts and intents.ts/ship.ts.

**F3. Kind refs off the intent row: every kind's refs in `intent_variants.refs`, read by its own kind.**
Stop writing asset_id/base/version/story_id/story_base/story_version on play.intents (one forward migration dropping
them after backfill into refs — already done by 7c8986c5); REFS, OWN_REFS, asOne's list, withdraw's clear and the
board JSON read refs from the variant. Replace `story_id ? SCHEMA.story : asset_id ? SCHEMA.asset` with the doc's schema.
Removes 1, 37, part of 17. Touches work.ts, versioned.ts, intents.ts, withdraw.ts, stories.ts (folds query
`i.story_version`), rules.ts, a new migration; **assetdocs.ts writes asset refs: HELD** for its part.
Risk: board payload shape (site reads work.asset_id/story_*); pinned by onerecord.test.ts, board.test.ts,
withdraw.test.ts, intents.test.ts, api.test.ts, detailfast.test.ts.
Bound: `grep -c "story_base" play/api/src/*.ts` limited to stories.ts (today in work.ts, versioned.ts, intents.ts,
withdraw.ts); `grep -cE "asset_id = NULL|'story_version', " play/api/src/*.ts` = 0.

**F4. Piece's "many versions per intent" as a kind flag, not ifs.**
`Kind.versionsPerIntent: "many"` (or `ordered`) read by holdVariant, growFromHeld, decideWork ordering and the board;
one `intentPieces` query (pieces.ts) used by piecesReviewed.
Removes 15 (code side), 36. Touches versioned.ts, work.ts, pieces.ts. Not HELD. Risk: low; pinned by
intentpieces.test.ts, pieces.test.ts. Bound: `grep -cE "\"piece\"|'piece:%'|\"piece:\"" play/api/src/{versioned,work}.ts` = 0
(today 5).

**F5. Doc ids and schema names from the registry only.**
One `docIdOf(kind, uuid)` / `uuidOf(docId)` in versioned.ts (prefix from the registry); drop the per-module builders
and the in-JSON `"<name>/1"` literals (write schema_id; the JSON `schema` field set by the store from the type, never by
callers). One FILES source: derive docs/schemas.ts FILES from ids.ts SCHEMA keys (or the seed file names).
Removes 10, 11, 12, 38. Touches storydocs.ts, skills.ts, sandboxes.ts, rules.ts, artifacts.ts, stories.ts, versioned.ts,
docs/schemas.ts, docs/store.ts; assetdocs.ts literals HELD. Risk: stored JSON keeps `schema` (only shown) — keep reading
it, stop writing literals. Pinned by docs.test.ts, schemas.test.ts, uuids.test.ts.
Bound: `grep -cE '"(story|sandbox|artifact|rules|asset|skill|factory|levels|piece)/1"' play/api/src/*.ts` = 0 outside
assetdocs.ts (today 8); `grep -cE "export const (docIdOf|layoutDoc)" play/api/src/*.ts` = 0 (today 3).

**F6. Make docs/ a leaf: break store ↔ schemas and docs → src.**
Move `seedOf/FILES/HOOKS/hook/hooksOf/asType` to `docs/types.ts` (no store import); `typeFor` into store.ts (it reads
a document); schemas.ts keeps schemasOf/ensureSchemas importing store. Move the bootstrap that writes play.records
(ensureSchemas' INSERT, COOP) out of docs to the registry side. Move the leaf kit (pg.ts, hash.ts, ids.ts, uuid.ts) to
`play/api/src/kit/` so src and docs both depend on it. Generalise BREED_FIELDS into the kind (`Kind.breeds: ["source",
"card"]`) passed to the store. Route sandboxes.ts and migrations.ts through the barrel.
Removes 20, 21, 22, 24. Touches docs/*, every importer of pg/hash/ids/uuid (mechanical), sandboxes.ts, migrations.ts;
assetdocs.ts/lod.ts import paths HELD (mechanical edit only — coordinate). Risk: low (moves); pinned by docs.test.ts,
breeds.test.ts, schemas.test.ts, migrate.test.ts.
Bound: graph `cycles` shows no `docs/schemas.ts ↔ docs/store.ts` and no module cycle `play/api/src ↔ play/api/src/docs`;
`grep -c 'from "\.\./' play/api/src/docs/*.ts` imports only `../kit/` (today ../ids, ../pg, ../hash);
`unstable` has no `play/api/src → play/api/src/docs` line.

**F7. One storage convention: a kind's Main is the document; rows are derived, not a second store.**
Retire play.story_versions as a source (story versions = doc_versions; frozen content-hash id kept as a column of
doc_versions or computed), sandbox pins/configs and artifact columns as projections written by one generic
`after`-hook; replace storyAt/layoutAt/proposedState with docAt (+ kind.view); seedStory → seedDoc. New kinds only in
play.records via schema documents.
Removes 29, 30, 31, 41 (going forward), most of 28. Touches stories.ts, storydocs.ts, sandboxes.ts, artifacts.ts,
library.ts, app.ts, mcp.ts, import/stories.ts, migrations (forward only). Assets (play.versions) HELD. Risk: HIGH —
worlds read sandbox_pins, the Stories player and links read story_versions ids (hashes are references: must be
preserved). Pinned by sandboxdocs.test.ts, api.test.ts, versioned.test.ts, summary.test.ts, worldshot.test.ts,
library tests. Bound: `grep -c "play.story_versions" play/api/src/stories.ts` → reads only (0 INSERT/UPDATE; today 5
writes); `grep -cE "export async function (storyAt|layoutAt|seedStory)" play/api/src/*.ts` = 0.

**F8. Retire the legacy "from before documents" paths.**
One forward step (already-run import) then delete: Kind.ensure for story/sandbox/artifact, ensureStoryDocs,
ensureLayouts + play.sandbox_changes_kept, ensureArtifactDoc, foldStories-on-every-deploy, the to_jsonb column
fallbacks (gist.ts, owners.ts, intents.ts) — make migration tests build the current schema instead. Fixed post-migrate
steps become a registered list (no feature imports in migrations.ts), and named lock constants in one place.
Removes 13, 23, 32, 33, 42. Touches versioned.ts, storydocs.ts, sandboxes.ts, stories.ts, gist.ts, owners.ts,
intents.ts, migrations.ts, rules.ts, import/*. assetdocs' ensure HELD. Risk: medium (a production database must have
every doc made: verify with a count query before deleting); pinned by migrate.test.ts, sandboxdocs.test.ts,
onerecord.test.ts, private.test.ts. Bound: `grep -c "to_jsonb(" play/api/src/{gist,owners}.ts` = 0;
`grep -cE "import .* from \"\./(sandboxes|rules)\"" play/api/src/migrations.ts` = 0; `grep -cE "ensure: " play/api/src/versioned.ts` = 0 (1 while asset HELD);
`grep -cE "pg_advisory_xact_lock\([0-9]" play/api/src` = 0 (named constants).

**F9. Say in the schema what code says today; new types by schema document only.**
Add `uniqueBy` (list items unique by a field) and conditional `required` (or let new Mains be born with the full
first state, which removes the "only its schema" special case) to docs/validate.ts's Node; move the 6 "taken twice"
loops and ARTIFACT_CHECK/PIECE_CHECK into the seed schemas' next versions (accepted by intent, not migration). Record a
rule (gate check) that no migration CREATEs a table for a document kind and no new `migrations/schemas/*.json` seed is
added.
Removes 39, 40, and the per-kind check code of 19. Touches docs/validate.ts, versioned.ts (checks), schema documents
(by intent). Not HELD (assetCheck lives in versioned.ts). Risk: medium (existing docs must still validate: decideSchema
refuses otherwise — that's the safety net); pinned by schemas.test.ts, docs.test.ts, factories/gameconfigs tests.
Bound: `grep -c "taken twice" play/api/src/versioned.ts` = 0 (today 6); `ls play/api/migrations/schemas | wc -l` stays
10; no new `CREATE TABLE` in migrations after this point (`grep -l "CREATE TABLE" <new migrations>` empty).

**F10. One error type at the boundary.**
Kind errors extend one `PlayError {status}` (or VersionError); mcp.ts/app.ts catch that one class; drop the re-wraps.
Removes 14; fix 43 (`catch {}` → explicit invalid-URL error). Touches every *Error class module, mcp.ts, app.ts;
AssetDocError HELD. Risk: low; pinned by api.test.ts, toolschemas.test.ts. Bound:
`grep -c "instanceof" play/api/src/mcp.ts` ≤ 2 at the error mapper (today the 924 line lists ~10); `grep -c "catch {}" play/api/src/artifacts.ts` = 0.

Remaining singletons: 16 (owners.ts asset ownership vs Kind.owned) folds into F1/F3 once assetdocs is free (HELD);
27 (Kind's 25 hooks) shrinks as F1/F7/F8 remove ensure/propose/decide/view/more; 35 (syncKinds per lookup, global
mutable KINDS) — cache by schemas' max(created) and drop `unregister` from production code with F1.

## Next untangles (HELD)
- assetdocs.ts: its registration (F1), openVariantOf/authorOf/asVersionError copies (F2), asset refs on the intent
  row (F3), `"asset/1"` literals (F5), ensureAssetDoc (F8), AssetDocError (F10), owners.ts asset hard-code (16),
  `unreadable` imported by stories.ts and versioned.ts (piece check) from assetdocs.
- lod.ts / graphs.ts: only reached through assets.ts/assetdocs.ts in this area; no fix here needs them.
