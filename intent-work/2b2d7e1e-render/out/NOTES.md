# Mac Metal run, 2026-11-07: steps 1 and 2 of the README

- GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version). Chromium 1243, `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`. `render-film-gpu.mjs` is `scratch/2b2d7e1e-coconut-film/render-film.mjs` with only its launch line (and `site` path) changed. Dev server: this branch's play/site, run with `--url`.
- Sources from play: v3 = 8bb994ef…c2a1 (recipe dc3474786784…), v2 = 895c9c1b…7797 (recipe 777dc6ced3f5…).
1. **v2 split frame:** `v2split/v2-split-wide.png` (raw canvas, 1080×923) and `v2split/v2-split-wide-square.png` (centre crop, 1080²). Stage 9, az 38°, el 3°, dist 19 m, target [0, 4.6, 0]. 184,434 triangles, 532 ms.
2. **Dense time-lapse:** `timelapse/v3-tl-000…044.png` (45 frames, raw canvas 1080×957, stages 0 → 11 in quarter steps), `timelapse/sheet.png`, `timelapse/shots.json`. `timelapse-9fps.mp4`: 1080×1080 centre crop at 9 fps, 5.0 s, H.264, crf 16. Build time per frame: mean 349 ms (225–587 ms). Triangles: 1,004 (nut) to 398,040 (mature).
3. **Golden hour:** not run. It needs the bench's sun to be settable (sky.js `SUN`), which takes a code intent first.

The composition's counters (compositions.py, STAGES) are not retimed here: that is the builder's.
