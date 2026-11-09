# 1f0c6f79 · c5 screenshots (avenBOX, software rendering)

Taken in avenBOX's Chromium (SwiftShader, no WebGPU adapter: WebGPURenderer on its WebGL 2 backend), 1440 × 900, the
old city (Sandbox 3) as it opens at 12:00, after 150 s. Main draws on WebGLRenderer; head with `?renderer=webgl2`
(the switch's default backend stays `webgl` until intents 4–8) and `?finish=desktop` (the software browser counts as a
small device), so on the fallback's plan (`finish.js` `onFallback`: no AO, MSAA).

- `oldcity-noon-main.jpg`: main.
- `oldcity-noon-head.jpg`: head, through the world's finishing: soft contact shadows at the grass's feet, the haze
  toward the horizon, bloom only above the picture's own threshold, the grade (vignette 0.12, grain 0.012, a subtle LUT).

Not this intent's: the workshop container and, at times, the walker are not drawn on head with the finishing off too
(`?finish=off`), on the switch's WebGL 2 backend.

## Sandbox 4 (the cassette joint), at 120 s

- `sandbox4-main.jpg`: main (its clock further on: software rendering runs main faster).
- `sandbox4-head.jpg`: head through the finishing (fallback plan); `sandbox4-head-finish-off.jpg`: head with
  `?finish=off`, the same moment. The pale glass close up is the scene's own (it is so with the finishing off); bloom adds
  a mild glow on the glass. The canvas's own transparency is kept (the grade keeps the picture's alpha, premultiplied).

## Sandbox 1, near (0, 95), at 12:00 and with a sun of 8° (19.44)

- `s1-<noon|sun8>-main.jpg`, `s1-<noon|sun8>-head.jpg`: main and head (head `?finish=desktop`, on WebGPURenderer's WebGL 2
  fallback: no AO, MSAA), each after 240 s at the view.
- At 8° the warm low key on the colonnade and the cool fill hold as on main; head's grade a little richer, the grass's
  feet shadowed. Open: the pond shows horizontal streaks on head, not on main (the water's screen read under the pipeline,
  or the grade's grain over it): to fix before Proposal.
