# 6295a650 run 5: the far view's census, on Mac Metal, 2026-11-07

base = 6d0d7ac with the README's one-line census hook (`base-census-hook.diff`); head = 8e9a45210. Far view only, noon
pinned, 1440×900. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). The branch's `selector-shots.mjs --census far`,
unchanged, run with bun.

| far | ms (p95) | tris drawn | tris in shapes (census) |
|---|---|---|---|
| base | 16.7 (16.8) | 1,844,669 | 114,378 |
| head | 16.7 (16.7) | 2,635,042 | 959,932 |

## Plainly: the suspected cause is confirmed

- **Base:** the far forest (`out`) draws **no tree as a shape**. Every tree is a picture or not drawn. All of its
  114k shape triangles are the library's buildings (chicken coop, rabbit hutch, playground…) and two biome covers.
- **Head:** 959,932 triangles in shapes, almost all of them a few big forest trees still drawn as shapes at their 0.56
  / 0.22 thresholds. From the head's table:

  | kind | radius | shapes | tris | farthest shape |
  |---|---|---|---|---|
  | Pecan | 15.14 | 8 | 507,600 | 90 m |
  | Small-leaved lime | 13.84 | 2 | 150,020 | 61 m |
  | Turkish tree hazel | 11.66 | 2 | 78,556 | 54 m |
  | Korean pine | 13.33 | 2 | 77,916 | 78 m |
  | Small-leaved lime | 11.3 | 1 | 61,880 | 75 m |
  | Turkish tree hazel | 7.72 | 2 | 48,756 | 48 m |
  | Black alder | 9.56 | 4 | 35,204 | 67 m |

  21 shapes cost about 960k triangles. The 8 pecans alone (~63k each) are over half, and they stay shapes out to 90 m.
  This matches the README: a tree turns into its picture at about 6.7 × r m, so r 12–15 m trees stay shapes to 60–90 m,
  where the base made every tree a picture past 40 m.
- **The same kinds are pictures on the base.** For example, its Korean pine has thresholds [0.98, 0.39], a picture at
  any distance in this view.

## Timing, this run

Both sides held 60 fps at far (16.7 ms, p95 16.7–16.8), although the head drew 0.79M more triangles. Runs 3 and 4 had
the head at 21–23 ms with a p95 of 33.4. So the timing at far sits near the edge of a frame here and is not stable run
to run; the triangle gap is. I'd judge c4's far view by triangles and by more than one run.

Files: `base-census.json` and `head-census.json` (each kind's radius, thresholds and levels; each copy's distance,
size, level and triangles), the two far PNGs, `results.json` and `stdout.txt`.
