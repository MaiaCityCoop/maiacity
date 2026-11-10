# c929d52c · The sky's clouds are soft, never blocks · round log

Builder's plain log, one entry a round. Code: branch `intent/c929d52c-clouds`, pull request #2254.
Box pictures (`box/`) are the sky alone, drawn by the box's software renderer through `harness/` (WebGL 2 backend,
SwiftShader, 960 × 600 a panel: dawn 5.6, noon 12.5 / afternoon 16, dusk 19.4 / night 23). They decide what the code
decides (blocks or none); the look on a real GPU is the macOS runner's (`gpu/`, added as its runs finish).

## The cause (23:20 UTC, before the spec)

The clouds are noise in the sky's shader, no picture. `sky.js` set `drift = hour · 60`; the shader computed
`(d.xz / (0.55·h) · 0.0002 + drift) · 1000` and per octave `q·2 + drift·300`. At noon: 720 000 cells, then 1.7, 3.5,
7.1 million. A 32-bit float holds 1/16 of a cell at 720 000 and half a cell at 7 million. `harness/f32.mjs` in 32-bit
arithmetic: at hour 12, 200 neighbouring pixels read **one** value (hour 0.5: 15 values; the true span is 0.028 cells).
The game's clock runs 30 × real time and the sky is set once a second, so the drift also moved 500 cells a second: the
clouds never drifted, they were made anew every second.

## Round 0 · main's clouds in the box (23:29)

`box/round0-main.png` (commit d935eef0: the clouds moved to clouds.js, same sums as main). **Large flat blocks with
hard straight edges at every daytime hour**, exactly Samuel's screenshot, in a software renderer: so it is the
arithmetic, not Safari, not Metal, not the WebGPU switch's backend. Chromium must show it too (the runner's before
pictures will say).

## Round 1 · the numbers small (23:29)

Each octave's lattice repeats (16 cells of the first octave), the hour reaches the shader as a fraction of the day,
the day's drift is a whole number of periods (midnight joins). Five octaves; a coarse second sample toward the sun for
shade. First try had a NaN constant (a node multiplied by a JS number): the box's shader compile said so, the unit
tests did not. `box/round1.png`: **no blocks, soft edges.** As a critic: flat lavender-grey smears, darker than they
should be by day, no depth; a pale wash round the noon sun.

## Round 2 · light (23:30)

Brighter sunlit part, tighter rim toward the sun, firmer bodies (opacity rises faster with depth), a little more fine
detail. `box/round2.png`: reads as clouds now; interiors still one flat tone, edges smooth and blobby.

## Round 3 · seen from below (23:31)

A cumulus from the ground has a grey base and bright thin edges: brightness by thinness, the middles grey; the plane
bent by the slow octave so no outline runs along the lattice. `box/round3.png`: bodies with a grey middle and a light
edge, broken small clouds toward the horizon, thinning into the haze; night: faint dark shapes against the stars.
Honest: these are good stylised fair-weather clouds, **not yet photographic**: the outlines are still rounded noise
(no cauliflower tops, no wisps), and one layer has no parallax.
