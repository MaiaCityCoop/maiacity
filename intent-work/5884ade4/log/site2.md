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
