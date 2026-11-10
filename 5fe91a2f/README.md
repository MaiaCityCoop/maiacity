# 5fe91a2f · c3: the biome viewer grows its biome over the whole ground

Shot in avenBOX's headless Chromium in software (SwiftShader).

- `viewer-grid.png` and `viewer/`: the asset viewer itself, main (639e92a3d) | head (0320c53fc). Meadow and Food
  forest floor at 390 × 844 (a phone: `smallDevice()`) and 1440 × 900, the viewer's own view and one from the eye
  (1.65 m). On `?renderer=webgl2`: a WebGPU canvas never presents in this Chromium, so the grass here is the WebGL 2
  fallback's tiles. Main: the patch's tufts as a disc, bare soil round it. Head: no disc; blades over the near and
  middle ground on both sides, the patch's copies put away (scene: an object `grass`, every `cover-*` hidden).
- `gpu-grid.png` and `gpu/`: the same field the viewer now grows on WebGPU (`grassFieldOn`, each biome's own grass,
  each device's budget), drawn offscreen and read back (play/site/scripts/grass-shots/harness.js `?biome= &device=`).
  Top row the phone (390 × 844; meadow eye, down; food forest eye, down), below the desktop (1440 × 900). The meadow
  closes into one cover on both, the phone's blades wider; the food forest floor patchy between its litter.
- Near view measured ('biome over the whole ground', grass-cover.js): the meadow covers 88.8 % of the ground 1.5–10 m
  out at 1440 × 900 and 88.5 % at 390 × 844 (53.5 % before the phone's profile).
