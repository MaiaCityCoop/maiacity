# play/site, third pass (after 6fd5e63f landed): the moves

Branch `intent/5884ade4-u-site3`, from `intent/5884ade4-untangle` 82f3e4b5f (its merge of main with 6fd5e63f). Held set
refreshed with `held.sh` from `held-intents.txt` before each commit (137 files).

Before (`measure.ts all`): folder cycles a held file does not close 2 (≤ 1), box imports of content/assets 4 (0),
comment lines 9,506 (≤ 9,400), comments naming a gone file 1 (0); every other bound ok.

## Moves

1. **Sandbox 1's film test above the census and the interior** (cycles: `scripts/census ↔ content/sandbox-2/interior`).
   `interior/film.test.ts` runs `scripts/census/film.ts`, which imports `interior/interior.ts`: the pair's one cycle no
   held file closes (`census/run.ts`'s imports of the interior are held). The test is now `content/sandbox-2/film.test.ts`,
   one folder above `interior/`, still under vitest's `src/**` include. Pinned: the same test, its script path one level
   shorter; it passes (vitest, 10 s).
2. **`vaultBuild` into `load.js`** (cycles: `content/assets ↔ content/assets/sources`; site-assets U6, its viewer part).
   `VaultAsset.svelte` imported `sources/viewer.js`, which imported `load.js`, `catalog.js` and `params.js` back: the
   pair's cycle. `vaultBuild` now sits in `load.js`, the one way a page gets a build, beside the `open`/`cached`/`kept`
   it uses; `VaultAsset.svelte` and `census/viewer.ts` import it there (and `buildOf` from `catalog.js` for the
   former's `buildName`). `sources/viewer.js` is a one-line re-export for the held `worlds/view.js`. Its test stays in
   `sources/` (now importing `../load.js`): moved beside `load.js` it shifts the folders' instability so that the
   layers count goes 10 → 12. `sources/biome.js` stays (its importers, `interior.ts`/`village.ts`, are held). Pinned:
   the moved function byte for byte (only its JSDoc type paths), its test (3) and `catalog.test.ts`, census-same.
