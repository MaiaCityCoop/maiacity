# Mac job: intent 6fd5e63f's c7: one wind for everything that grows, and light through leaves

**MAC JOB READY** (2026-11-09 14:30 UTC): head a7007834c (PR #2180) against main 12837b6; the dry run printed DRY RUN PASSED
in avenBOX for this branch's commit (`bun play/site/scripts/macjob/dry.ts intent-work/6fd5e63f-render --at <commit>`).



Intent 6fd5e63f-e195-4123-8604-c4f87c33869c (GPU 6/14), pull request #2180. Every plant material that says what it is
(a `look`: leaf, grass, petal, bark, stem, fruit, stone; from box format 5, or from its name for older builds) is drawn by
the page's own TSL (`render/foliage.js`, `render/wind.js`). One wind per world, with gust fronts that travel, each plant
on its own phase, trunks still, crowns bending with their length kept, and tips fluttering near the eye. Leaves and grass
are two-sided, darker toward the root, and glow with the sun behind them. The census (avenBOX) counts the same draws and
triangles as main, a little fewer (the steady census: near 10,523,087/5,665; mid 13,840,939/4,244; far 2,762,180/1,782). This job checks what the census can't:
frame time, the film, and that a frame repeats.

**The head is the change on main** (PR #2180's head, `intent/6fd5e63f-living-plants` @ a7007834c: main 12837b6 merged in (intent 24454c2d's placement), backlit leaves glowing in their crown's shade, the wind cheap at mid range, the film advancing). The looks are
drawn on the render kit's TSL materials (cb16b7a5) and the one cover stream (11ead007), both on main now (#2185). So two trees are measured: **main** 12837b6
(base, what the change sits on) and **head** a700783. head − main is this intent's own cost and what c7 bounds.

**Since the run on 8bab28a (mid 34.3 ms against main's 32.3):** the head leaves out at mid range what nobody sees there
(`render/foliage.js` `LEVELS`): no flutter compiled for looks without one (bark, fruit), flutter skipped per copy beyond
15 m, none from level 1, no light through leaves from level 2; the bend, the crowns' normals and the darker foot at every
level. Look for a pop in the film as a plant changes level (the glow fading at level 2 is the one thing that changes).
And `film.advance` works on main and head alike since intent 660ad67f (#2203) fixed the SunLight's missing target on main;
should it throw, the still pins `__worldTime` alone (`summary.json` `advance` says which).

**Since run 2 (mid +2.3 ms, within c7's new + 3 ms; the backlit still deep green, SSIM 0.78):** a leaf facing the eye in a
backlit crown is in the shade of the leaves behind it, and the shadow cancelled its glow. The light through a leaf is now
the sun before the shadow, let through the crown's shade by half (`render/foliage.js` `LEAK`), tinted by the leaf's colour
lightened (its square root), and the foot is darkened less (`FOOT` 0.7). Look at `head-golden.png` and the film: the
crowns facing the eye should glow golden-green at their edges and tips against the low sun.

**Dry run (intent cb52fbd9, before the Mac):** `bun play/site/scripts/macjob/dry.ts intent-work/6fd5e63f-render --at <this job's commit>`
from a checkout of main 11e518c or later: it printed DRY RUN PASSED in avenBOX for this commit. It ran the whole job on the
CPU: the views, the pose (the sun 8.1° up at 19:26, the stand a Plum at 5.5, 86.0), 480 film frames and the same t. In the
dry run main reuses head's world (one world a process), so `advance` there says film.advance everywhere; on the Mac main
throws in film.advance and falls back to `__worldTime`.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/6fd5e63f-render/run.sh` (bun, node with Playwright's Chromium, ffmpeg).
It makes two worktrees beside the repository (`../6fd5-main`, `../6fd5-head`) and serves them. It takes
the render box's `determinism.mjs` from `intent-work/main-baseline-render` (SEEDED_RANDOM as an init script, settled by
QUIET), then runs `wind.mjs`, one site after the other:

1. Sandbox 1 near, mid and far (the selector's views), noon pinned, the wind on the page's own clock: the meter's 4 s
   sample (frame ms, p95, cpu, gpu, bound) and a screenshot per site.
2. On head: the evening hour whose sun stands 8° up. The camera stands behind the stand of plants nearest (0, 70),
   on the side away from the sun, looking through it toward the sun. The same hour and pose are stilled on main
   (`<site>-golden.png`) for the backlight.
3. On head: a 20 s film at 24 fps, 1440×900, the clock pinned per frame (`window.__worldTime = t`, then the world's
   `film.advance(t)`), in `out/film-head.mp4`.
4. On head: t = 7.25 s drawn, then 3.0 s and 15.5 s, then 7.25 s again. The two PNGs' SHA-256 must be equal, and
   7.75 s must differ (the wind moves).

**Settling** is capped (4 min at open, 3 min a view): since intent 2 Sandbox 1 keeps taking pictures and is never quiet.

**Pass (c7):** in the film, trunks still, branches bending, tips fluttering near, and gust fronts visibly travelling
across the stand; backlit leaves glowing (against `main-golden.png`, compare Poly Haven's CC0 evening_field for the
look). `sameT.identical` true and `movedHalfASecondLater` true. Head's mean frame time at near at most main's + 8 ms and never above
33.4 ms, at mid at most main's + 3 ms and at far + 0.5 ms (`within_budget`; c7 respecified by Samuel 2026-11-09; the interim while TSL runs on WebGLNodesHandler, until intent 9), each with its bound and cpu_ms.

**Out:** `out/summary.json` (the table, same-t, pose), `out/film-head.mp4`, `out/*-{near,mid,far}.png`,
`out/*-golden.png`, `out/same-t-*.png`, `out/ssim.txt`, `out/results.json`, `out/wind.txt`. Commit `out/` and push to
the branch `intent-work/6fd5e63f-render`.

Note: only head draws a wind. If `same t` differs, the PNG pair shows where. If the pose found no stand (`stand.label`
"none found"), say so: the pose falls back to (0, 70).

**Accepted plants' looks:** few materials are named, so a plant's or living cover's unnamed material is read by itself
(`assets/look.js` `lookOfBuilt`: two-sided a leaf, grass on a grass; one-sided bark, moving only with its copy). The
whole copy bends as one, leaves never off their branches: say if any part of a plant parts from another in the film.

**The 0 draws seen on cb16b7a5's 78a881e:** three's WebGLNodesHandler never settled `compileAsync` for node materials on
Metal. Main (intent 2214e661) now warms every shader through `render/core.js` `precompile`, which leaves node materials
out, and main and head both carry it. Both should draw: if either draws nothing in Sandbox 1, say which and where.
