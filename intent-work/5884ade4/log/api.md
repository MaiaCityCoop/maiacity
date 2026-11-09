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
