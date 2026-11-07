# 6295a650 c4/c5 on Mac Metal: run 4, 2026-11-07

base = 6d0d7ac, head = 129cc30c0 (the fix: a plant drawn far off takes its picture at its last threshold, however
light). 1440×900, noon pinned for both. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). The branch's
`selector-shots.mjs`, unchanged, run with bun.

| Sandbox 1 | base ms (p95) | head ms (p95) | base tris | head tris | head vs base |
|---|---|---|---|---|---|
| near | 33.7 (50.0) | 25.4 (33.4) | 6,323,758 | 3,833,220 | −39% tris, −8.3 ms |
| mid | 38.9 (50.1) | 38.0 (50.0) | 6,229,591 | 6,327,273 | +2% tris, −0.9 ms |
| far | 16.7 (16.8) | 23.0 (33.4) | 2,551,158 | 3,603,020 | +41% tris, +6.3 ms |

Sandbox 3 open: base 758,034, head 701,324 tris (−7%). Settle: base 71 s, head 25 s.

## Plainly

- **Near: no worse.** Better: 39% fewer triangles, 8 ms faster.
- **Mid: no worse.** −0.9 ms with the same p95. Triangles +2%, within noise.
- **Far: still worse.** +41% triangles, +6.3 ms mean, and a p95 of 33.4 ms against the base's steady 16.8 ms: it drops
  frames where the base holds 60 fps.

**This fix barely moved far.** Run 3's head was 3,712,983 triangles there, run 4's 3,603,020 (−3%), and the head's far
shot looks the same as run 3's: full, dense trees. The base, as in every run, draws its far trees as see-through
cut-outs. So at this view, the far trees aren't being drawn as their pictures on the head, whatever the threshold
does. Worth checking which trees at 100–400 m from z 370 get which level on the head and on the base.

c5: nothing is missing on either side. The head's far treeline is fuller and hides more of the dome.

Runs 1–3 are in `../run1/` to `../run3/`.
