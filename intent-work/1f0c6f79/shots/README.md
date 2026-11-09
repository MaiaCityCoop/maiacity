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
