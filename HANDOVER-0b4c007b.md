# Handover: 0b4c007b, daylight clear and neutral again (from the Mac render box, 2026-11-09 15:50 Berlin)

Branch `intent/0b4c007b-neutral-daylight` (PR #2189), its tip `8fb07d1fd` (main `12837b65e` merged in by play). Mine on
it: the Neutral picture (`render/core.js` `PICTURE`, `neutral()`, `tonemap`, `untonemap`), the overhead sun `0xf4f7ff`,
and `89f357d34`: the sky's light keeps three quarters of its blue (`sky.js` white balance exponent 0.25; was 0.65 on
main, 0.15 before). I won't push to this branch again.

## Recorded
- c1, c2: the box's run.
- **c4 PASS** on `8fb07d1fd`: the viewers cooler than main, none warmer — grass 1.085 vs 1.122, goat 1.087 vs 1.131,
  forklift 1.087 vs 1.130, the biome page's still 1.068 vs 1.096.

## Measured, not recorded (stopped when the Mac stopped gating)
- **c3** (worlds at noon within 10 % of the pre-programme `06fc8c947`, by eye stone grey, grass green, wood brown):
  - Sandbox 1 near: head .969 against pre .909 (+6.6 %, within); main 1.219.
  - Sandbox 5 inside (walker at 0, 6, 0, −0.05): head 1.057 against pre .925 (**+14 %**); main 1.426.
  - By eye both read right on head: neutral light, grey stone, green leaves, brown wood, blue sky through the glass; main
    is sepia. The frame means moved with content since pre (intent 4's dry scanned soil, #13's cover and deadwood,
    browner trunks): neutral patches agree (Sandbox 5's sky through the glass .759 vs pre .945; Sandbox 1's stone .897
    vs .769). The 10 % frame-mean rule against pre no longer compares like with like in Sandbox 5.
- **c5**, near only: main 28.9 ms (cpu 18.8, gpu 21.0, bound gpu) against head **51.4 ms (cpu 50.2, bound cpu)**; head's
  CPU profile has 40 % native "(program)" time against main's 25 %, and `getParameters`/`getProgram` in its top
  functions (main's has neither). Measured right after the job's own `bun install`s, which re-trigger Spotlight's
  indexing on this Mac, so it may be load; it needs a quiet re-measure before anyone believes it. Mid, far and the WebKit
  walk weren't measured.
- An earlier selector-shots run showed head's Sandbox 1 never quiet ("still building"); a fresh probe (counters every
  10 s) showed head and main settling identically, so that wasn't the code.

## The sky light's white balance (Sandbox 1 at noon, mean R/B near / mid / far)
| exponent | near | mid | far |
|---|---|---|---|
| pre-programme | .909 | .852 | .975 |
| 0.15 | .911 | .645 (navy shade) | .909 |
| 0.35 | 1.031 | .802 | .953 |
| 0.50 | 1.142 | .954 | .984 |
| 0.65 (main's) | 1.267 | 1.106 | 1.007 |
| 0.50, main's warm sun `0xfff2e0` | 1.241 | .971 | 1.030 |
0.25 was chosen to keep near within 10 % of pre with less navy shade; 0.35 looks best by eye at mid (shade cool, not
navy, stone grey) but puts near 13 % over pre.
