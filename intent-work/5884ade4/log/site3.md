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
3. **drawn.js's comment names `assets/render/lod.js`** (comments: gone file 1 → 0). Comment only.
4. **Comment cuts, one folder a commit** (comments): `assets/render/simplify.js` 197 → 120, sandbox-kit (film, orbit,
   walker, obstacles), Sandbox 2's interior headers, Sandbox 6's headers, render/wind.js and foliage.js, mcp.ts and
   held.ts (they pointed at SPEC instead of retelling it), box/live.js, animals.ts, worlds/film.js, kernel/look.js,
   withdraw/stepback, avenbox's skills/live-audit/pr-intent. Each checked: Bun's transpiled output the same.
   Kept: decisions with dates, browser/GPU quirks, measured numbers, SPEC pointers, CLI usage.

## After 67f0404a and ed6694c3 landed (merged 6676f4b74, ba05fad17)

5. **params.js's `argsOf`/`queryOf`/`paramsIn` and bake.js's `SLOTS`/`materialsOf` exported again** (a bug, not a
   move): an earlier dead sweep took their export while their users (`refs.js`, `box/live.js`, from 6fd5e63f) were not
   on this branch; once 6fd5e63f landed, `box/engine.js` no longer bundled (rolldown MISSING_EXPORT). Restored as main
   has them; `scripts/freeze-engine.ts --hash` bundles again (25085cea…, the same before and after every later move).
6. **Dead exports** (dead 14 → 0): `refs.js`'s `pick`/`assetIn`/`objectIn` and `animals.ts`'s `CASTS` deleted (no user
   anywhere); `bundleEngine`, `RANGES`, `CROWN`, `WRAP`, `FoliageMaterial`, `SWAY`, `FLUTTER_NEAR`, `Eye`, `actorRef`,
   `Patch`, `POND_FISH` lose `export`.
7. **Comments in the freed box files name files that exist** (gone-file comments 14 → 0).
8. **Tests beside what they test** (layers): `render/nodes/tsl.test.js` → `assets/ground.test.js`;
   `render/foliage.test.js` → `render/nodes/foliage.test.js`.
9. **`look.js` into `kernel/`** (layers 14 → 8): the render kit's wind and foliage read it there; `content/assets/look.js`
   is a re-export for the held `box/serialize.js`, `box/rebuild.js`, `box/look.test.ts`, `assets/render/index.js` and
   `presets.js`. Engine bundle unchanged.

## Next untangles (held)

- **Box imports of content/assets (4 → 0)**: `box/engine.js` → `../card.js`, `../refs.js`; `box/rebuild.js`,
  `box/serialize.js` → `../look.js`. All three box files are held by a5faafad (recipe shaders, engine 7: it changes
  their imports). Once it lands: move `card.js`, `refs.js` (and `params.js`, which refs imports) into `box/` (or the
  kernel), and point rebuild/serialize at `$lib/kernel/look.js`; drop the re-exports.
- Note: `held.sh`'s three-dot diff lists files a branch never changed when the branch has several merge bases with
  main (090168c8 listed card.js, refs.js, look.js and the box files; its two-dot diff touches none).
