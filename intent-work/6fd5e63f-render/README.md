# Mac job: intent 6fd5e63f's c7: one wind for everything that grows, and light through leaves

Intent 6fd5e63f-e195-4123-8604-c4f87c33869c (GPU 6/14), pull request #2180. Every plant material that says what it is
(a `look`: leaf, grass, petal, bark, stem, fruit, stone; from box format 5, or from its name for older builds) is drawn by
the page's own TSL (`render/foliage.js`, `render/wind.js`). One wind per world, with gust fronts that travel, each plant
on its own phase, trunks still, crowns bending with their length kept, and tips fluttering near the eye. Leaves and grass
are two-sided, darker toward the root, and glow with the sun behind them. The census (avenBOX) counts the same draws and
triangles as main (near 3,282,183/1,807; mid 5,176,156/1,778; far 1,403,927/877). This job checks what the census can't:
frame time, the film, and that a frame repeats.

**The head is the change on intent cb16b7a5's render kit** (`intent-work/6fd5e63f-on-kit` @ c0bdd0893). The looks are
drawn on the kit's TSL materials, and cb16b7a5 isn't on main yet. So three trees are measured: **main** 5ae3807 (base, with intents b03f9fb4 and 2214e661),
**kit** 512bdd8 (cb16b7a5's head, what the change sits on) and **head** c0bdd08. head − kit is this intent's own cost;
head − main is what c7 bounds.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/6fd5e63f-render/run.sh` (bun, node with Playwright's Chromium, ffmpeg).
It makes three worktrees beside the repository (`../6fd5-main`, `../6fd5-kit`, `../6fd5-head`) and serves them. It takes
the render box's `determinism.mjs` from `intent-work/main-baseline-render` (SEEDED_RANDOM as an init script, settled by
QUIET), then runs `wind.mjs`, one site after the other:

1. Sandbox 1 near, mid and far (the selector's views), noon pinned, the wind on the page's own clock: the meter's 4 s
   sample (frame ms, p95, cpu, gpu, bound) and a screenshot per site.
2. On head: the evening hour whose sun stands 8° up. The camera stands behind the stand of plants nearest (0, 70),
   on the side away from the sun, looking through it toward the sun. The same hour and pose are stilled on kit and main
   (`<site>-golden.png`) for the backlight.
3. On head: a 20 s film at 24 fps, 1440×900, the clock pinned per frame (`window.__worldTime = t`, then the world's
   `film.advance(t)`), in `out/film-head.mp4`.
4. On head: t = 7.25 s drawn, then 3.0 s and 15.5 s, then 7.25 s again. The two PNGs' SHA-256 must be equal, and
   7.75 s must differ (the wind moves).

**Pass (c7):** in the film, trunks still, branches bending, tips fluttering near, and gust fronts visibly travelling
across the stand; backlit leaves glowing (against `main-golden.png`, compare Poly Haven's CC0 evening_field for the
look). `sameT.identical` true and `movedHalfASecondLater` true. Head's mean frame time at most main's + 0.5 ms at near,
mid and far (`within_half_ms`), each with its bound.

**Out:** `out/summary.json` (the table, same-t, pose), `out/film-head.mp4`, `out/*-{near,mid,far}.png`,
`out/*-golden.png`, `out/same-t-*.png`, `out/ssim.txt`, `out/results.json`, `out/wind.txt`. Commit `out/` and push to
the branch `intent-work/6fd5e63f-render`.

Note: only head draws a wind. If `same t` differs, the PNG pair shows where. If the pose found no stand (`stand.label`
"none found"), say so: the pose falls back to (0, 70).

**The 0 draws seen on cb16b7a5's 78a881e:** three's WebGLNodesHandler never settled `compileAsync` for node materials on
Metal. Main (intent 2214e661) now warms every shader through `render/core.js` `precompile`, which leaves node materials
out, and kit and head both carry it. Both should draw: if either draws nothing in Sandbox 1, say which and where.
