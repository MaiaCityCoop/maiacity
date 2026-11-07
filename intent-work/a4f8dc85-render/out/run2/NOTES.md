# a4f8dc85 c2, run 2: Mac Metal, 2026-11-07

Commit eaa6d0e, run as the branch's `run.sh` with no patch. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). The
whole job took 2 min 48 s. The review image is kept in Samuel's personal library on play only:

    9ff6d82a8d8042a28f9f8a2d13df2db2d0c14b355d39ee7f80d3c0db6a3c1b29

No face image is here.

- **Fit:** identical to run 1 (the fit did not change).
  - Landmarks fitted, mean px: photo-front 2.14, photo-34 2.05, sheet-front 3.65.
  - Outline: 1.24 px front, 1.35 px profile.
- **Texture:** 4096 px, 2,962,577 of 4,521,502 texels painted, against run 1's 2,659,738 of 3,474,657. The mesh now
  runs down to the shoulders.

## Plainly: what is now right

- **Eyes: yes.** Blue irises and pupils sit on the eyeball and read clearly in every view. In run 1 they were almost
  white.
- **Smile: yes, in front and three-quarter.** A clear, natural smile with the cheeks lifted and the eyes narrowed. In
  profile it shows only slightly, which is fair for that view.
- **Facets: yes.** The shading is smooth on the scalp, cheeks and jaw, with no visible flat triangles.
- **Neck: yes, mostly.** The texture runs down to the shirt collar and shoulders, with no jagged cut. One thin dark
  line remains where the beard's underside meets the neck, in front and three-quarter.

## New or still wrong

1. **A seam across the forehead.** A clear lighter/darker band runs across the forehead just above the brows, in every
   view. It looks like where the photos' projection stops and the sheet's (or the unpainted base) takes over.
2. **Brown smudges on both cheeks**, under the cheekbones, in front and three-quarter. They look like texture from
   shadowed photo pixels or a blend error, not skin.
3. The dark line under the beard, at the neck (above).
