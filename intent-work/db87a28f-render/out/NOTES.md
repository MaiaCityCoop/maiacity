# db87a28f c7 on Mac Metal, 2026-11-08: head never leaves the loading screen

base = main 57d0c71; head = eaffe9fb (before merging main f93ccba, with its local `WebGLNodesHandler` line). GPU:
ANGLE (Apple, ANGLE Metal Renderer: Apple M1), GPU timer offered. `shots.mjs` with the render box's determinism.
The job was stopped by hand after the head's Sandbox 1 views: nothing past them could be measured.

**Base** measured normally:
- near at noon: 24.0 ms (p95 33.4), GPU 15.8, 1,785 calls, 3.27M triangles, 252 MiB of textures;
- the biome patches (`base-biome-*.png`).

**Head** shows the loading cover in every shot (`head-sandbox-1-*.png`): "Growing the forest: the plants near you…".
- The frame meter counts **0 draws** over each 3 s window (frame 0.00, bound null), while 232 MiB of textures are up.
- The same head opened in a normal Chrome (the Claude browser pane, its dev server on :5192) stays on "Letting in the
  light…" for 20 s and more, with no canvas, no `__assets` and no console error but a 401 that main shows too.
- No KTX2 or Basis transcoder request was made in that time.

Suspects, for the builder:
1. `village.ts` builds `reliefGround(WORLD, 2.5, …)` right after "Letting in the light"; a dense relief mesh over the
   whole cell may hold the main thread.
2. The head still calls `renderer.compileAsync` (`render/core.js:133`) with TSL node materials on its local handler,
   which `WebGLNodesHandler` does not support. Main's core.js since b03f9fb4 handles the warm-up.

So: merge main, check that `/sandbox-1/` loads in a browser, then send a new MAC JOB READY.
