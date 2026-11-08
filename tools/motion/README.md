# tools/motion: motion capture onto a person's skeleton (intent b9e6ad45)

The one retargeter for Maia City's people. It takes motion capture from ACCAD's Open Motion Project (CC BY 3.0),
100STYLE (CC BY 4.0) and Quaternius' Universal Animation Library (CC0) and puts it on the VRM humanoid skeleton, the
piece "Person skeleton". It also holds the checks that keep the clips true to the captures.

- `retarget.mjs` lines every bone up with its source's by a whole frame.
  - The frame is the bone's direction plus the body's forward. A hinge (a knee, an elbow, a finger's first joint) is
    lined up instead by the axis it really bends about in the take.
  - The source is lined up while its performer stands relaxed (`stand`), not in its zero pose, which need not be a pose
    at all (ACCAD's leans its back 54°).
  - One path serves every source and every bone.
- `convert.mjs` cuts the clips, retargets and settles them, closes loops in the world from both ends, and writes the
  data pieces `pieces/clips-*.js`. Beside them it writes `sources/*.json.gz`: each clip's source directions, by the
  source's own forward kinematics.
- `pieces/` and `assets/` mirror what intent b9e6ad45 proposes to play: the three clip pieces, the Stand-in and the Elder
  woman, and the accepted pieces they stand on. `proposed.json` holds the BLAKE3 hash of every file. `pieces.mjs`
  rewrites the assets to name the clip pieces as they now are, and writes the hashes.
- `check.ts` decides the intent's checks on the CPU, with no GPU: `bun tools/motion/check.ts
  directions|twist|head|idle|gait|wave|skin|page`.
- `box.mjs` runs pieces and assets in Node as play's asset box does.
- `boxtime.mjs` times a person's build in the box's own frozen engine, run as a Worker in headless Chromium on the CPU
  (intent 67d5e185): `node tools/motion/boxtime.mjs stand-in|elder-woman|samuel --under 3`. With `--clips` it times
  the box's clip tables for walk and run with the mirror's Person motion against `baseline/motion-v2.js`, the version
  before it: `--clips stand-in --at-most 0.6`.
- Person motion v3 (intent 67d5e185) plays the moves on numbers by bone index: the same sums as three's slerp and
  Euler, without making objects at every step. Each move costs about a third of what it did. Its poses equal v2's, to
  1e-8 rad: a clip blended in all the way leaves the turns under it unread.

To make the clips again, put the captures under `$MOCAP` (default `/tmp/claude-0/data`):
- `accad/`: `Female1_bvh.zip` and `Male2_bvh.zip` from accad.osu.edu/research/motion-lab/mocap-system-and-data,
  unzipped.
- `style/100STYLE/<Style>/<file>.bvh`: from zenodo.org/records/8127870 (`100STYLE.zip`; a member at a time by range
  requests is enough).
- `ual/x/…/UAL1_Standard.glb` and `UAL1_Standard_RM.glb`: from quaternius.itch.io/universal-animation-library.

Then run `node tools/motion/convert.mjs && node tools/motion/pieces.mjs`.

Credits: ACCAD, The Ohio State University, Open Motion Project (CC BY 3.0); Ian Mason, Sebastian Starke, Taku Komura,
100STYLE (CC BY 4.0, doi:10.1145/3522618); Quaternius (CC0).
