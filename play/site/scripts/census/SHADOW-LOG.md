# The shadows' log (intent 7313fb26)

Each round: the change, the box's count (census, pinned inputs, a shadow redraw's triangles), kept or thrown away.
Base: main 85a78610 (after 0356b0ea, 1f6a98dd, a7507347). Sandbox 1 near on main: picture 3,836,023, shadow
6,668,975, 3,876 draws (as the audit counted it). A census round takes 40 s once its kinds are kept.

## Round 1: a bake casts by stand-ins

`CENSUS_DEBUG=1` now lists the shadows' casters beside the picture's. Sandbox 1 near: the dome's inside cast 5.2 M of
the 6.67 M, three times its picture: every `bake` cast its whole merged geometry (furniture of 300 to 590 triangles a
piece, cups, leaves), in both cascades, whatever its pieces said, and as one dome-sized mesh nothing culled or dropped.

- **A bake casts by two stand-ins**, one a cascade (`sandbox-kit/casters.js` `standIns`): each piece simplified by
  meshoptimizer until its outline moves at most 2 cm (near; the near cascade's texel is some 7 cm) or 7 cm (far, some
  20 cm), what is narrower than 4 cm (near) or 15 cm (far) left out, all of one shadow side in one draw. Each hangs on
  its cascade's layer (28, 29), which only that cascade's camera sees (`seeStandIns`, set where the sun is made:
  `sky.js`); the picture's baked meshes cast nothing. The census draws a cascade on its camera's own layers, as
  SunShadowNode does. Sandbox 1 near: shadow **6.67 M → 2.27 M**, draws 3,876 → 1,532, picture the same. **Kept.**

## Round 2: every hand-built caster casts by its stand-ins

- **A caster met for the first time is cast by twins** (`casters.js castByTwins`, in the size rule's own walk): one a
  cascade it is wide enough to show in, its shape simplified as above, hung under it (so it moves, turns and hides
  with it; an instanced one shares its copies' buffer and count). Left to themselves: what draws its own shadow (the
  asset renderer's copies, by their `onBeforeShadow`), skinned and morphing meshes. The walkers' bodies, the struts,
  posts and props of the village were each drawn whole into both cascades. Sandbox 1 near: shadow **2.27 M → 1.77 M**.
  **Kept.**
- Fixed on the way: the village's forest tiles took every child of a bake as a part, stand-ins too.

Head after round 2 (shadow / picture): Sandbox 1 near 1.77 M / 3.84 M, mid 4.46 M / 5.96 M, far 0.50 M / 1.55 M;
Sandbox 5 near 2.89 M / 4.79 M, mid 3.09 M / 5.21 M, far 0.51 M / 2.19 M.

## Round 3: the trees' shadows, a cascade at a time

Sandbox 1 mid on main: shadow 6.71 M (the census in the same run); the head after round 2: 4.46 M, the asset
renderer's trees 2.9 M of it (lime, pecan, chestnut, walnut, hazel at levels 1 and 2), each copy drawn into both
cascades, plus a flock of sheep (275 k, skinned: left as they are).

- **Thrown away: a built kind cast by its coarsest level in the far cascade.** The lime's coarsest built level is the
  one drawn (level 1), so nothing fell; and the coarsest level's own copies, which cast nothing before, then cast:
  lime 671 k → 795 k, chestnut 376 k → 577 k. A simplifier is no answer for a canopy either: its leaves are cards of
  two triangles, and pruning them would hollow the shadow.
- **Measured, nothing to gain here: copies outside a cascade's box.** Every tree copy at mid lies in both boxes (the
  near one is some 210 m across). The test stays (it is the next one's first half, and cheap).
- **A copy casts only into the cascades its shadow can reach** (`assets/render/index.js castersFirst`): a cascade's
  receivers lie in its slice of the view's depth (three's own `_cascadeData`, handed to the cascade's camera by
  `casters.js seeStandIns`); a copy whose ball, with its longest shadow (its ball's width and half again over the
  sun's slope), cannot reach the slice is left out of that pass, its instances put after those drawn (and put back
  after the pass where the picture draws them first). A near tree is no longer drawn into the far cascade, whose
  receivers begin some 70 m out. Sandbox 1 mid: **4.46 M → 3.01 M** (main 6.71 M: −55 %), near 1.77 M → 1.74 M
  (main 6.68 M: −74 %). **Kept.**
