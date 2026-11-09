# e85a5860 · c4 in avenBOX (no frame of these reaches main)

Shot by `intent-work/e85a5860-shots/run.sh` on `intent/e85a5860-grass-compute@20761b65c (2026-11-09 23:21, the GPU profile: 4 m near, 3× wider blades)`, in avenBOX's own Chromium in
software (SwiftShader). The grass is shot alone (`play/site/scripts/grass-shots/harness.js`), drawn into a target and
read back: a WebGPU canvas never presents in avenBOX's headless Chromium, so no world page can be shot on WebGPU there.

- `meadow-near.png`, three pictures at walking height, near:
  - **main today:** main's Sandbox 1 meadow (14, 81) on WebGL, `main.png` whole: its grass is scattered tufts.
  - **intent 7's tiles:** the WebGL 2 fallback (#7's 683c2bb density). Sends 71,424 / 74,304 / 33,536 instances by
    level (179,264), most of them sunk or outside the view; soil shows between its blades.
  - **this branch:** the blades chosen on the card (WebGPU), about 600 kept a m² near (c4's measure). Draws 24,106 /
    15,234 / 12,223 by level (51,563): one closed cover near, thinning with distance.
- `lane-*.png`: the trodden lane seen from behind its start, 3 m up, before and 0, 3, 6, 10 s after.
- `trample-strip.png` (before, 0, 3 and 10 s) and `trample-*.png`:
  - A walker crossed 12 m of the meadow at 1.3 m/s, seen beside the walk's end.
  - The trample map was read back along its last 4 m: at most 0.912 at 0 s, 0.371 at 3 s, 0.151 at 6 s and 0.046 at
    10 s.
  - The flattened band shows at 0 s, fades by 3 s and is gone by 10 s.
- `shots.json`: every number above.
