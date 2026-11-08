# db87a28f c7, second Mac run (2026-11-08): head loads now, but its frame costs +5.8 ms, CPU-bound

head = bebff0f (main f93ccba merged); base = main f93ccba. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1), GPU
timer offered. `shots.mjs` as the builder pushed it (determinism.mjs).

**Near at noon, the one view this run measured validly:**

| | frame (p95) | CPU | GPU | calls | triangles | textures |
|---|---|---|---|---|---|---|
| base | 25.6 (33.4) | 16.5 | 17.0 | 1,785 | 3,271,783 | 252 MiB |
| head | 31.4 (49.9) | **26.8** | 19.6 | 1,785 | 3,394,546 | 279 MiB |

- **Cost fails:** +5.8 ms against +1.5. Head is **CPU-bound**: 10.3 ms more CPU per frame with the same number of calls.
  - Suspects: per-frame work for the ground (its canopy or ground map, the relief), or the node material's uniforms
    updated every frame through `WebGLNodesHandler` (nine surfaces' arrays).
  - The GPU's share (+2.6 ms) would fit the budget on its own.
- **Texture memory passes:** 279 MiB ≤ 330.
- **Small device (390×844, `?budget=small`):** 17.0 ms, 108 MiB.

**Not measured validly (a fault in the measurement, not the ground):** every later shot repeats near-at-noon's frame
exactly.
- mid at noon reads 16.7 ms with 0.3–0.5 ms of GPU on both sides;
- the sun at 10° looks like noon.

So neither the camera move (`__walker.place`) nor the hour change took effect after the first view, on base as on head.
The sky's second run showed the same on base. The render box is finding the cause; until then only each job's first
view counts.

**Look at near, noon** (beside Poly Haven's forrest_ground_01, forest_leaves_02 and brown_mud_leaves_01): the beds now
show a mottled litter and soil texture where main had flat green. The relief and wet paths can't be judged until the
low-sun view works.
