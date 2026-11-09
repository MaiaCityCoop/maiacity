# e85a5860 · c4 in avenBOX (no frame of these reaches main)

Shot by `intent-work/e85a5860-shots/run.sh` on `intent/e85a5860-grass-compute@18db9c05b`, in avenBOX's own Chromium in
software (SwiftShader). The grass is shot alone (`play/site/scripts/grass-shots/harness.js`), drawn into a target and
read back: a WebGPU canvas never presents in avenBOX's headless Chromium, so no world page can be shot on WebGPU there.

- `meadow-near.png`, three pictures at walking height, near:
  - **main today:** main's Sandbox 1 meadow (14, 81) on WebGL, `main.png` whole: its grass is scattered tufts.
  - **intent 7's tiles:** the WebGL 2 fallback, 120 blades a m² near. Sends 30,720 / 93,344 / 56,128 instances by level
    (180,192), most of them sunk or outside the view.
  - **this branch:** the blades chosen on the card (WebGPU), 180 a m² near. Draws 9,421 / 11,657 / 11,751 by level
    (32,829).
- `trample-strip.png` (before, 0, 3 and 10 s) and `trample-*.png`:
  - A walker crossed 12 m of the meadow at 1.3 m/s, seen beside the walk's end.
  - The trample map was read back along its last 4 m: at most 0.912 at 0 s, 0.371 at 3 s, 0.151 at 6 s and 0.046 at
    10 s.
  - The flattened band shows at 0 s, fades by 3 s and is gone by 10 s.
- `shots.json`: every number above.
