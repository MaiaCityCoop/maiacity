# 6295a650 c4/c5 on Mac Metal: the second run, 2026-11-07

base = 6d0d7ac, head = 8103cb29d (fix 2d91cb60b: LEVELS [1.2, 0.56, 0.22], noon pinned). 1440×900. GPU: ANGLE (Apple,
ANGLE Metal Renderer: Apple M1). `play/site/scripts/selector-shots.mjs` as on the branch, unchanged, run with bun. Both
sites honour `window.__interiorHour` (base's sky.js reads it too); both shots are in daylight.

| Sandbox 1 | base ms (p95) | head ms (p95) | base tris | head tris | head vs base |
|---|---|---|---|---|---|
| near | 29.7 (33.4) | 26.8 (33.4) | 6,043,713 | 4,484,720 | −26% tris, −2.9 ms |
| mid | 35.3 (50.0) | 44.3 (50.1) | 6,325,095 | 9,384,401 | +48% tris, +9.0 ms |
| far | 16.7 (16.7) | 26.0 (33.4) | 2,636,712 | 4,032,346 | +53% tris, +9.3 ms |

Sandbox 3 open: base 753,594, head 700,188 tris. Settle: base 45 s, head 51 s.

**c4, read as measured:** the near view passes, cheaper than the base. Mid and far are still worse, about 9 ms more
per frame each; far drops from a steady 60 fps to a p95 of 30. Against run 1 (8.47M / 11.87M / 8.50M) the fix cut
the head by 47% near, 21% mid and 53% far.

**c5, seen:**
- Mid: the same path, trees, dome and library.
- Far: the base draws its far trees as thin, see-through cut-outs. The head draws them full and dense, a better
  picture, and that is where its extra triangles go. Nothing is missing on either side.
- Sandbox 3: the same land, house and grass. The visitor differs, as the world picks one each visit; that is not the
  change.

For a person at Proposal to weigh: the head looks better far off, but costs more there, so c4's "no worse" bound isn't met at mid
and far.

Run 1 (dusk against night, confounded) is kept in `run1/`.
