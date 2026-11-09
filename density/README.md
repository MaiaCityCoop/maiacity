# 090168c8 · density follow-up (branch intent-work/090168c8-density, 683c2bb on main 4417092)

avenBOX Chromium (SwiftShader), 960 × 600, same seeded script as c7/. Handed to intent e85a5860.

- `main-viewer-meadow.png`: the meadow's own 12 m patch in the asset viewer on main 91e1f32 (`/biomes/#e36c9671…`):
  its grass kinds as the old cover asset's tufts, about 10 a square metre.
- `head-viewer-meadow.png`: the same on the density branch: the patch's grass grown by the grass field
  (`assets/plantings.js` `patch`, the `viewer` profile, 700 a square metre all over it), meadow v2.
- `head-meadow-noon.png`: Sandbox 1's meadow view (x −38, z 105, noon) on the density branch: 700 a square metre within
  2.5 m of the eye, thinning as the square of the distance. Compare `../c7/head-meadow-noon.png` (150 out to 6 m, shipped).

Census against main 3115e56: near tris +2.83 % (≤ 7 %), mid tris +3.84 % (≤ 4.5 %, the binding bound; 800 a square metre
gave +4.49 %), far tris +0.70 %; draws +1.25 / +1.67 / +0.90 %. The other views were not taken (stopped on request).
