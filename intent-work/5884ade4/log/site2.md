# play/site, second pass (cycles, layers, comments, re-audit): the moves

Branch `intent/5884ade4-u-site2`, from `intent/5884ade4-untangle` a053b9c (fixes 2, 3 and the sweep merged). Held set
refreshed with `held.sh` from `held-intents.txt` before each commit (155 files).

Before (`measure.ts all`): folder cycles a held file does not close 2 (≤ 1), layers 11 (≤ 10), comment lines 9,495
(≤ 9,400), comments naming a gone file 3 (0); every other bound ok.

## Moves

1. **The render bench beside its page** (cycles: `content/assets ↔ content/assets/render`). `RenderBench.svelte` was
   in `content/assets` and imported `render/crowd.js`, while `crowd.js` imports `clips.js`, `load.js` and `catalog.js`
   from `content/assets`: the folder pair's one cycle no held file closes. The bench is one page's developer tool
   (`routes/render/+page.svelte` its one importer, in development only): it now sits beside that page and imports
   the asset kit by `$lib`. Pinned: the same component, moved; gate site; svelte-check's errors unchanged (all in held
   files).
2. **The ground's TSL test beside the ground** (cycles: `content/biomes ↔ content/render/nodes`). `render/nodes/tsl.test.js`
   built `biomes/surfaces.js`'s `groundMaterial` and `assets/ground.js`'s `groundOf`: the one non-held import from
   `render/nodes` back into `biomes` (the other, `render/nodes/ground.js → biomes/sets.js`, is held), and the layers'
   `render/nodes → content/assets`. It is now `content/assets/ground.test.js`, beside `ground.js`, which already
   imports `biomes`; its warm-ups check (no `compileAsync` but `render/core.js`'s, a walk of `src/lib`, importing
   nothing) is `content/render/warmups.test.js`, beside `core.js`. Folder cycles no held file closes: 2 → 0. Layers
   stay 11: `render/nodes` turns more stable (I 0.43 → 0.33) and the held `render/nodes/ground.js → biomes/sets.js`
   is now the upward import in its place, held alone. Pinned: the same 5 tests, passing; gate site.
3. **Comments naming a file that is gone: 3 (6 after move 1) → 0** (comments only). The bench's own `./catalog.js`,
   `./clips.js` and `./render/crowd.js` name `content/assets/…` now; three of play/api's tests named
   `./intents.ts` and `./select.ts` beside them, which are `../src/intents.ts` and `play/avenbox/select.ts`.
4. **`census/away.test.ts` reads the catalog and the sandboxes where they are** (re-audit: re-exports). It took
   `catalogReady` from `lib/recipes.ts` and `SANDBOX` from `content/assets/sandboxes.js`, both one-line re-exports kept
   for the held `census/run.ts` and held worlds; it now imports `content/assets/catalog.js` (which it read already) and
   `kernel/sandboxes.js`. Pinned: `bun test scripts/census/away.test.ts` (2 pass). The site's three importers of
   `lib/recipes.ts` (AssetLibrary, the Worlds page, Sandbox 3) stay: moved to `catalog.js`, the graph sees nothing
   import `recipes.ts` (run.ts reads it by a computed path) and counts it dead; it and they go once run.ts imports
   `catalog.js` itself.
