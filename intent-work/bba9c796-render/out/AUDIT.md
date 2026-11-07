# Sandbox 1 and Sandbox 3: what bounds them, and the three biggest wins each

Intent bba9c796 (c7). Main 8b5b4a7fe, measured on Samuel's Mac (ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)) with the frame meter of pull request #2165 and `probe.js`, 1440×900, noon, 3 s of frames a view. The numbers are in `audit.json`, the pictures beside it, the run's notes in `NOTES.md`. Each win is a measured or estimated saving in GPU ms on this M1 (CPU where it says so); each becomes its own intent.

## Plainly

- **Sandbox 1 is slow up close.** Near and mid take 32–36 ms a frame (about 30 fps), held back by the graphics card (23–27 ms of GPU work). About half of that is the sheer number of triangles, 6 million in about 2,100 draws; the other half is painting pixels. Far off it holds 60 fps.
- **Sandbox 3 is fast:** 60 fps everywhere, with 5–6 ms of GPU work. Its one oddity is shadows: it draws more into its shadow map (650–790 draws) than to the screen (180–260), every frame.
- **Shadows in Sandbox 1 cost nothing while you stand still:** the sandbox kit's sky redraws them only when something moves. Sandbox 3 should do the same.

## The views

| view | frame ms (p95) | CPU ms | GPU ms | calls | triangles | bound | GPU: no shadows / no blending / half size |
|---|---|---|---|---|---|---|---|
| sandbox-1 near | 31.8 (50) | 13.4 | 23.1 | 2,104 | 5,946,579 | gpu | 22.8 / 21 / 14.5 |
| sandbox-1 mid | 36.1 (50) | 15.2 | 26.6 | 2,080 | 6,229,969 | gpu | 27 / 27.6 / 16.8 |
| sandbox-1 far | 16.7 (16.7) | 7.3 | 9.7 | 1,087 | 2,551,158 | vsync | 9.5 / 9.2 / 8.4 |
| sandbox-3 open | 16.7 (16.7) | 4.1 | 6.1 | 1,058 | 755,686 | vsync | 4.8 / 6 / 4.2 |
| sandbox-3 walk5 | 16.7 (16.7) | 3.3 | 5.6 | 919 | 658,084 | vsync | 4.4 / 5.6 / 3.8 |
| sandbox-3 walk15 | 16.7 (16.7) | 3.2 | 5.4 | 835 | 656,376 | vsync | 4.3 / 5.4 / 3.6 |

## Sandbox 1 (the village, GPU-bound near and mid): the wins, ranked

1. **About 6.5 ms.** Halve the triangles the village's forest draws near and mid (6.0-6.2M in about 1,800 MeshStandardMaterial calls): the plants' L0/L1 crowns held to lod.js's budgets, the levels switched as the contract says (6295a650's thread).
   - *Why that much:* mid: GPU 26.6 ms, 16.8 at a quarter of the pixels, so fill is about (26.6-16.8)/0.75 = 13.1 ms and geometry and calls about 13.5 ms for 6.23M triangles; halving the triangles saves about half of that. Near: about 5 ms.
   - *Where:* play/site/src/lib/content/assets/render/lod.js (BUDGETS, LEVELS), play/site/src/lib/content/sandbox-2/interior/flora.js and village.ts (the forest's plants and their declared levels)
2. **About 4.7 ms.** Let a GPU-bound frame drop below one pixel per CSS pixel: adaptiveResolution's floor from 1 to 0.8 for the village while its GPU ms is over the display's interval (a quality trade, held off while a film holds the size).
   - *Why that much:* fill at mid about 13.1 ms (above); a pixel ratio of 0.8 draws 0.64 of the pixels: 13.1 x 0.36 = 4.7 ms. Near: fill about 11.5 ms, about 4.1 ms.
   - *Where:* play/site/src/lib/content/render/core.js (adaptiveResolution, its floor), play/site/src/lib/content/sandbox-2/interior/village.ts (stage.adapt)
3. **About 2.1 ms.** The domes' blended glass, solar glass and water (MeshPhysicalMaterial with sheen, about 190 draws and 0.6-0.9M triangles, transparent and double-sided) drawn as MeshStandardMaterial and, where it is a thin sheet, alphaHash instead of blending.
   - *Why that much:* near: GPU 23.1 ms with the 209 blended draws, 21.0 without (the probe's noblend); mid about 0.
   - *Where:* play/site/src/lib/content/sandbox-2/interior/interior.ts (solarGlass, glass, water, withSheen), play/site/src/lib/content/sandbox-2/interior/factory.ts (glassWall, fence, film)

## Sandbox 3 (the old city, vsync-bound): the wins, ranked

1. **About 1.3 ms.** The sun's shadow map drawn only when something moved and only from what is near: its camera from a fixed 220 x 220 m box to one following the walker (about 80 m), casters only what reads as a shadow (not the grass clumps), shadowMap.autoUpdate off with needsUpdate when the walker, the van or the sun moves, as the sandbox kit's sky does.
   - *Why that much:* open: GPU 6.1 ms, 4.8 with no shadow-map draws (the probe's noshadow); walk5 1.2, walk15 1.1. Also about 650-790 of 835-1,058 draw calls: at about 3.9 us a call, about 2.5-3 ms of CPU.
   - *Where:* play/site/src/lib/content/maiacity-v2/world.js (sun.shadow.camera, castShadow on its trees and props), play/site/src/lib/content/maiacity-v2/drawn.js (cast on every loaded mesh), play/site/src/lib/content/sandbox-kit/sky.js (the pattern)
2. **About 1.0 ms.** Less overdraw from the grass in front of a low camera: the close clump and the tall grass single-sided, thinned near the eye by screen size, alpha-tested cards beyond a few metres.
   - *Why that much:* open: GPU 6.1 ms, 4.2 at a quarter of the pixels, so fill is about 2.5 ms; the low walking camera looks through grass that fills most of the frame (sandbox-3-*.png). Estimated: about 40% of that fill is the grass's double-sided blades overlapping.
   - *Where:* play/site/src/lib/content/maiacity-v2/world.js (clump, tallGrass, steppe)
3. **About 0.5 ms.** Weld or instance the land's static set (ground, highway, gravel, bushes, the props that never move) and set matrixAutoUpdate = false on it.
   - *Why that much:* 184-264 screen draws of MeshStandardMaterial at about 3.9 us each (CPU 3.2-4.1 ms for 835-1,058 calls); welding or instancing the static set to about 60 saves about 0.5-0.8 ms of CPU. The GPU barely changes.
   - *Where:* play/site/src/lib/content/maiacity-v2/world.js (land, highway, gravel, bushes, things), play/site/src/lib/content/maiacity-v2/things.js

## After these

- Sandbox 1's CPU is 13–15 ms a frame for about 2,100 draw calls. Once the GPU wins land, draw calls become its bound: batching the village's varied plants (BatchedMesh) is the next measure.
- Texture memory is about 265 MiB in Sandbox 1 and about 43 MiB in Sandbox 3 (level 0 at 4 bytes a pixel, an upper bound): within a desktop's budget, over a phone's.
