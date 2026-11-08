# cb16b7a5 c7 on Mac Metal, 2026-11-08: head's Sandbox 1 stops drawing

base = main f93ccba; head = 78a881e7 (merged main). GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). run.sh with
its pipe fix, `node` a bun shim on this Mac.

**Sandbox 1** (selector-shots.mjs, noon, 1440×900):

| view | base ms | base triangles | head ms | head triangles |
|---|---|---|---|---|
| near | 25.7 | 3,276,879 | 16.7 | **0** |
| mid | 31.3 | 5,168,926 | 16.7 | **0** |
| far | 16.7 | 1,392,509 | 16.7 | **0** |

- Head counted 478–480 frames per view with **no WebGL draw at all**: the frame is requestAnimationFrame alone.
- Its screenshots still show the scene, but as a stale frame: the page drew while loading, then stopped.
- The old city on head draws normally (674,854 triangles), so the counting itself works.

Next to check: does the village's loop stop calling `render` once settled, or do the new node materials draw through
an entry point the count doesn't wrap (`WEBGL_multi_draw`)? The census and a live look at `/sandbox-1/` on head will
say which.

**What differs in the stale frame, against base:**
- the dome's glass has lost its blue pattern (clear glass, bare lattice);
- the pond is brown instead of grey-green.

**Not run:** `assets.mjs` (five assets and the walk). It resolved Playwright from bun's global cache (1.65, whose
browser isn't installed here) because the script runs from the job folder. That's this Mac's fault; next run I'll put
it beside play/site's node_modules.
