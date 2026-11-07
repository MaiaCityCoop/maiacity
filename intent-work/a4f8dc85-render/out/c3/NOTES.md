# a4f8dc85 c3: the bench film, on Mac Metal, 2026-11-07

Head 747d39fec. `bench.sh ~/a4f8dc85-work`, after run 3's `run.sh` in the same folder (nothing run.sh uses changed
since). GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1).

- **Pieces:** head v2, body v2 and v3 were made from v1 and the diffs, and all three hashes checked.
- **Bake:** the piece's head on MakeHuman's is off by 2.15 mm mean (4.10 mm p95). Colours sit 0.74 mm median from the
  fitted surface (3.33 mm p95).
- **Recipe:** "Samuel", 50,365 vertices, 1 skinned mesh, 1.689 m tall, 12 clips, built in 243 ms.
- **Film:** 480 frames (20 s at 24 fps), 1280×720, with the morphs joy and friendly. `bench.mp4` and the frames stay on
  the Mac.
- **Contact sheet** (12 frames), in Samuel's personal library only:

      525356eab68c05507d6a3e8a30fb9ba9ab80194cb09a6ee14a4c6acc5313d02c

No image is here.

## Patches, in my worktree only (`mac-patch.diff`); the first two are bugs to fix on the branch

1. **`bench-gpu.mjs`: `Failed to resolve module specifier "three"`.** The page imports three's addons
   (BufferGeometryUtils, RoundedBoxGeometry), which import the bare name `three`, and the page has no import map. I
   added `<script type="importmap">{"imports":{"three":"http://r/three/build/three.module.js"}}` to the page.
2. **`bake.py` calls `node -e`**, and this Mac has no node. Fixed for this run only by a `node` shim on the PATH that runs
   bun, keeping node's `-e` argv (nothing changed in the repo). Better: call bun, or fall back to it, as `bench.sh`
   already does for `build-recipe.mjs`.

## Plainly: the garments

**They are not there as clothes.** Every frame shows one skin-tight, cream-coloured body suit from neck to ankle, like
a mannequin's. The cream colour is the only sign of the outfit:

- **Shirt:** no linen shirt. There is no collar, no hem, no untucked edge over the hips, and no loose cloth.
- **Sleeves:** long and cream, but skin-tight, with a round ball showing at each shoulder joint.
- **Trousers:** no loose trousers. The legs are tight tubes, the crotch and buttocks are modelled as on a bare body,
  and there's no break between shirt and trousers.
- **Sandals: yes.** Brown straps on the feet, and they move with the feet.

**How they move:** as skin, since they are the skin. Nothing passes through the body, because there's no separate cloth
to do so. There's no sway, no drape and no lag when walking, sitting or waving.

## The rest

- **Chair:** only a floating seat board, with no legs. Sitting on it reads right: hips on the board, hands on the
  thighs. At stand-up and the wave, the board cuts through the standing man's thighs: the 0.23 m pop the README knows.
- **Face:** the eyeballs bulge out of the sockets, white all round, so he looks startled in every frame. The smile
  (sitting, wave) is too small to read at this framing, and the face is mostly in profile there.
- **Throat:** a dark brown V shows at the neck where the head's texture meets the suit.
- **Hands:** closed fists throughout, and the wave is a raised fist (as in b9e6ad45).
- **Camera:** the figure is small in a wide 1280×720 frame, so the face is about 60 px tall.
