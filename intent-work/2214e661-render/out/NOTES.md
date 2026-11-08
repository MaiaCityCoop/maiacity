# 2214e661 c8 on Mac Metal, 2026-11-08: frame time passes, the look does not yet

base = main 57d0c71; head = 5506111 (the PR's head before it merged main f93ccba; since then it only merged main and
dropped the local handler line). GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). `look.mjs` with the render
box's determinism (`intent-work/main-baseline/determinism.mjs`: seeded `Math.random`, settle until pictures are kept),
base and head alike.

## Frame time: passes

Head is within +1.0 ms of base at every view:

| view | base | head | delta |
|---|---|---|---|
| noon near | 26.1 | 25.0 | −1.1 |
| noon mid | 35.7 | 32.3 | −3.4 |
| noon far | 16.8 | 16.7 | −0.1 |
| 8° near | 24.9 | 25.6 | +0.7 |
| 8° mid | 32.6 | 31.4 | −1.2 |
| 8° far | 16.7 | 16.7 | 0 |
| old city | 16.7 | 16.7 | 0 |

No shader or page errors on head; the two 401s are base's too.

## The look against Poly Haven's autumn_meadow and evening_field: not yet

**Right:**
- the sun is the key, with crisp shadows near and still some far off;
- haze deepens with distance toward the horizon's colour, with no grey fog wall;
- at 8° the light is low and golden.

**Wrong:**

1. **Noon is far too warm.** At h = 12 (a February noon in-game, the sun about 30° up) the whole frame has a peach
   cast:
   - the dome's grey stone reads beige;
   - the greens go olive and brown, so the food forest looks autumnal;
   - shadows are warm too, so there is no cool sky fill and no coloured shadows.

   autumn_meadow's noon sun is near white, with a blue sky and neutral greys. The likely cause is the curve: T =
   √sin(elevation) gives about 0.71 at 30°, so the sun is about (255, 207, 172), still orange. A real sun at 30° is near
   (255, 228, 206). Either take the sun's colour from the sky's own transmittance (Preetham), or reach near-white by
   about 20–25°; then check the fill is the sky's blue.
2. **The old city is washed out.** The near ground and grass are pale and low-contrast against main's: haze or exposure
   too strong in the near field.

Files: `results.json` (`views`, `delta`, `errors`), `<site>-sandbox-1-<noon|sun8>-<near|mid|far>.png`,
`<site>-sandbox-3-own-open.png`, `polyhaven-*.jpg`, `stdout.txt`.
