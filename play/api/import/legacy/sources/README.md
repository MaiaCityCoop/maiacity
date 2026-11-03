# The imported versions' readable sources

Legacy (avenDB, branch `SNAPSHOT_2611101`) bundled each asset's library and minified it into the recipe files play
imported. Here is each library again **as legacy's code was written** (its modules, their comments, each marked by the
file it came from: `//#region maia/content/plants/grow.js`), one file per asset and the commit it was seeded from:
`<group>/<id>@<commit>.js`. `index.json` lists them by their BLAKE3 hash (`sources`) and, by its hash, every imported
recipe file each was checked against: the asset, version and variant it builds, its source and the legacy commit
(`recipes`).

The import (`../../sources.ts`, run with every deploy) checks each file against its hash and each recipe file's last
line against the asset, version and variant listed, keeps the source among play's files and gives it to every imported
version and variant of that recipe file that has none yet (`source_hash`, migration `0010-legacy-sources`).

## How they were made, and proved

At each legacy commit a recipe file came from, in a checkout of that commit:

1. legacy's own bundler made the asset's library: `bundleAsset(group, id, bundleGroup(group))` of its
   `assets/box/plugin.js` (rolldown 1.2.8, as pinned by its `bun.lock`), the group's list narrowed to the asset, three.js
   left to the engine;
2. **minified** (`minify: true`, as legacy's seed made them), `RECIPE_HEAD + library + recipeTail(id, v, variant)` hashed
   to **exactly** the imported recipe file's hash, for every version and variant listed here: the same bytes, so the
   same code;
3. **readable** (`minify: false`), the same bundle unminified, kept here.

Which commit each file came from was found by making every library again at each legacy commit that changed one of its
inputs (15–29 October 2026, the window avenDB's recipe entries were written in), until every imported recipe file had
its match: 338 of the 340, most from one seed (`963cc9dfc684`, 18 October), the rest from six later ones.

Two were never in git: **birch v2** and the **elder woman v2** (its `elder-woman` variant) were written into avenDB from
code that was not committed (it is on no branch of the repository, nor in the vault's records). For them the file is
their recipe file's own library, the code the box runs, only laid out to be read (prettier 3.3.3), its names the
minifier's: `<group>/<id>@v2-laid-out.js`, its commit `null` in the index, a note at its top. Both were built in play's
box engine beside their recipe files and give the same build.

Not needed in a checkout but asked for by the bundler: `.svelte-kit/tsconfig.json` (made by `svelte-kit sync`; target
ESNext), and a stand-in for `aven/db/page/device/avendb_browser.js` (wasm-pack's output, not in git, never part of a
library).

A few legacy libraries hold a line longer than play lets a proposal have (1000 characters: the stand-in's and the elder
woman's inlined tables, three machines): a version proposed from one wraps them.
