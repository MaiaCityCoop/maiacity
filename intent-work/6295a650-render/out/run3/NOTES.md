# 6295a650 c4/c5 on Mac Metal: run 3, 2026-11-07

base = 6d0d7ac, head = 658a50eaa. The fix: old plants at the forest's two details; shrubs and cover at 26 m and 13 m
in the village. 1440×900, noon pinned for both. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). The branch's
`selector-shots.mjs`, unchanged, run with bun.

| Sandbox 1 | base ms (p95) | head ms (p95) | base tris | head tris | head vs base |
|---|---|---|---|---|---|
| near | 34.3 (49.9) | 25.7 (33.4) | 5,946,533 | 4,252,635 | −29% tris, −8.6 ms |
| mid | 35.3 (50.0) | 36.0 (50.0) | 6,228,173 | 6,495,195 | +4% tris, +0.7 ms |
| far | 16.8 (16.8) | 21.2 (33.4) | 2,549,110 | 3,712,983 | +46% tris, +4.4 ms |

Sandbox 3 open: base 753,562, head 701,252 tris (−7%). Settle: base 58 s, head 53 s.

## Plainly

- **Near: better than the base.**
- **Mid: no worse in practice.** The head is +0.7 ms with the same p95, within the run-to-run noise: base mid measured
  36.5, 35.3 and 35.3 ms over three runs. Triangles are +4%.
- **Far: still worse.** The head is +46% triangles and +4.4 ms mean, and its p95 is 33.4 ms against the base's steady
  16.8 ms: it drops frames where the base holds 60 fps. Run 2 was +53% and +9.3 ms, so this is half the gap, not closed.

**c5, seen:**
- Mid: the same path, trees, dome and library.
- Far: the base draws its far trees as thin, see-through cut-outs, so the master dome shows between them. The head
  draws them full and dense, a fuller treeline that hides most of the dome. It is the far trees' level that still
  costs: the shrubs and cover now match.
- Nothing is missing on either side.

Runs 1 and 2 are in `../run1/` and `../run2/`.
