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
