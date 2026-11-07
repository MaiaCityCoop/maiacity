# 6295a650 run 6, on Mac Metal, 2026-11-07

base = 6d0d7ac (with run 5's census hook); head = 0e955d4e5, which includes DENSITY 0.2 (`lod.js` `heldTo`). Noon
pinned, 1440×900. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). Two passes, as the README asks: the full job
(`./`), then the census at far (`census/`). The branch's `selector-shots.mjs`, unchanged, run with bun.

## Pass 1: the full job

| Sandbox 1 | base ms (p95) | head ms (p95) | base tris | head tris | head vs base |
|---|---|---|---|---|---|
| near | 37.4 (50.0) | 25.2 (33.4) | 6,043,847 | 3,524,363 | −42% tris, −12.2 ms |
| mid | 34.8 (50.0) | 31.3 (33.4) | 6,327,099 | 5,576,807 | −12% tris, −3.5 ms, p95 50 → 33 |
| far | 16.7 (16.7) | 16.9 (16.8) | 2,638,760 | 1,992,124 | −25% tris, the same frame |

Sandbox 3 open: base 754,646, head 697,780 tris (−8%).

## Pass 2: the census at far

| far | ms (p95) | tris drawn | tris in shapes |
|---|---|---|---|
| base | 33.3 (33.4) | 1,826,777 | 96,486 |
| head | 33.6 (33.4) | 1,546,753 (max 2,763,741) | 35,204 |

In this pass both sides ran at 30 fps alike, a slower state of the Mac for both, not a difference between them. The
head's only tree shapes left at far are 4 black alders (35,204 triangles, to 67 m). The pecans, limes, hazels and
pines are all pictures now: run 5 had 21 shapes and 959,932 triangles.

## Plainly

- **Near: no worse.** Much better.
- **Mid: no worse.** Better: −12% triangles, −3.5 ms, and a p95 of 33 against the base's 50.
- **Far: no worse.** −25% triangles, and the same frame time as the base in both passes (16.7 against 16.9 ms in pass
  1, 33.3 against 33.6 in pass 2).
- **Sandbox 3: no worse.**

c5, seen at far: the same treeline and dome on both. This time the head draws its far trees as pictures (see-through
cut-outs) where the base drew them full, the other way round from runs 2–4. Nothing is missing.
