# 92fbecea: the domes and their insides at levels — build log

Census in avenBOX (main pass triangles, the box's exact count; main = 0b03c3d / 85a7861, cached by vs-main).

## Where the far views went (main, CENSUS_DEBUG by part)

Sandbox 1 far 1.55 M: domes' simple selves 481k (bodies 288k, shells 168k — struts 6-sided with caps, 24 triangles
each — doors 25k), waterside 195k (bulrush heads, pads, blooms), bank stones 84k, ground 123k.
Sandbox 1 mid 5.79 M: one dome's full inside 985k drawn from 50 m outside (the nearest built dome).
Sandbox 5 far 2.19 M: forest dome 1.24 M (outside:limestone 4 × 133k = 533k, building:* ~250k), waterside 191k,
stones 82k. The forest dome is an asset: its own levels are play's work.

## Round 1 (06:50): the dome in levels, the full inside only at the dome

| | near | mid | far |
|---|---|---|---|
| Sandbox 1 main | 3,836,023 | 5,788,896 | 1,552,860 |
| head | 3,671,147 | 4,523,322 | 1,095,392 |

A dome per level (shell.test.ts, a dome without the world's forest): master 83,942 / 21,338 / 8,658 / 2,940;
large 49,610 / 12,778 / 5,142 / 1,824; small 24,774 / 6,444 / 2,482 / 1,088.

## Round 2 (07:00): waterside in cells, stones in cells, forest dome's buildings

| | near | mid | far |
|---|---|---|---|
| Sandbox 1 | 3,436,515 (−10 %) | 4,302,062 (−26 %) | 887,610 (−43 %) |
| Sandbox 5 | 4,557,631 (−5 %) | 4,686,328 (−10 %) | 1,677,058 (−23 %) |

Bug found and fixed: an object at two levels ([fine, fine, light, light]) was shown only at the second.

## The forest dome as an asset (play's work, not this intent)

`buildings/forest-dome` 6 (cac16350-08a4-4d51-8cdf-3ade5f61836e), 1,241,499 triangles at its one level. To come
under a7507347's rule it needs a next version whose source exports `module.exports.levels` and stays ≤ 300,000 at
L0: its `outside:limestone` alone is 533k (four tiles of 133,198: the arcade's and paving's stone, which reads at
every distance), `building:oak`/`plaster` ~305k, `shell:ceramic` ~208k, `ground` ~167k.

## Round 3 (07:20): café squares, main merged (c929d52c, 1893a631), ready

Café squares round the master dome drawn to their level 2. gpu.ts keeps both `--views` (this intent) and `--sky`
(c929d52c). intent.ts in the box on b5bae1ea's successor: c1–c5 green; c8 (S1 far −45.8 %) and c10 (draws mid −41 %,
far −25 %) green; c9 (S5 far −23.4 % of 25 %) short: the rest is the forest dome's arcade stone (asset) and the herds.

| | near | mid | far |
|---|---|---|---|
| Sandbox 1 | 3,413,873 (−11 %) | 4,255,738 (−29 %) | 841,286 (−46 %) |
| Sandbox 5 | 4,557,631 (−5 %) | 4,686,328 (−10 %) | 1,677,058 (−23 %) |

Marked ready: the box run on GitHub records the checks; c6/c7 on the macOS runner, c7 judged by hand from its pictures.
