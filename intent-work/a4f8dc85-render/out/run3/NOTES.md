# a4f8dc85 c2, run 3: Mac Metal, 2026-11-07

Head afad5c3e2 (includes 6e1e4eef3, the texture blend). Run as the branch's `run.sh`, with no patch. GPU: ANGLE
(Apple, ANGLE Metal Renderer: Apple M1). The whole job took 2 min 42 s. The review image is kept in Samuel's personal
library on play only:

    509efe8a3a1b0f96c9c7ad79888190b8a308afc1e9020e347a3ddb7d7c2b9796

No face image is here.

- **Fit:** unchanged from runs 1 and 2. Landmarks 2.14 / 2.05 / 3.65 px; outline 1.24 / 1.35 px.
- **Texture:** 2,962,295 of 4,521,502 texels painted (run 2: 2,962,577).
- **What stays right:** the eyes, the smile, the smooth shading and the shoulders, as in run 2.

## Plainly: are the three faults gone?

- **Forehead band: softer, not gone.** The hard step above the brows from run 2 is now a soft, blended edge. A lighter
  strip still reads across the forehead in the front views, and a wavy edge at the temple in three-quarter.
- **Cheek smudges: lighter, not gone.** Brownish patches still sit under both cheekbones and beside the nose, in front
  and three-quarter.
- **Beard line: not gone, and changed.** The dark line under the chin is thinner. In its place there are pale, patchy
  streaks where the beard's underside meets the neck, in front and three-quarter. It looks like unblended neck or sheet
  texture showing through. In profile the jaw-to-neck join looks clean.

All three improved; none of the three is gone.
