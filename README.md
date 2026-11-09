# e85a5860 · c4 in avenBOX (no frame of these reaches main)

Shot by `intent-work/e85a5860-shots/shots.mjs --skip-main` on `intent/e85a5860-grass-compute@8086e0131`, in avenBOX's own
Chromium in software (SwiftShader), the grass alone (`play/site/scripts/grass-shots/harness.js`) drawn into a target and
read back. In avenBOX's headless Chromium a WebGPU canvas never presents, so no world page can be shot on WebGPU there.

- `meadow-near.png`, `meadow-beside.png`: the same meadow at walking height. Left, intent 7's tiles (the WebGL 2
  fallback). Right, the blades chosen on the card (WebGPU): 180 blades a m² near, not 120.
  - The compute chose 7,748 / 8,742 / 8,883 blades by level (25,373).
  - The tiles sent 27,093 / 74,896 / 47,680 instances (149,669), most of them sunk or outside the view.
- `trample-strip.png` (before, 0, 3 and 10 s) and `trample-*.png`: a walker crossed 12 m of the meadow at 1.3 m/s,
  seen beside the walk's end. The trample map was read back along its last 4 m: at most 0.912 at 0 s, 0.371 at 3 s,
  0.151 at 6 s and 0.046 at 10 s.
- `shots.json`: every number above.
