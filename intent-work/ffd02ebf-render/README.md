# Mac job: intent ffd02ebf ("The sandboxes load again"), run by the Mac render box

Production (main `b95da56`) and the fix's head (`da46ab0`, main with GPU 12/14's merge `be5126bd9` reverted, built and
served by vite preview with /api to play.maia.city), Sandbox 1 and Sandbox 5, each loaded alone on the Mac's real GPU
(Chromium 153 on Metal, WebGPU), a fresh profile each, the loading line every 10 s, up to 8 minutes.
`out/summary.json` (each load's timeline, renderer, time to the world, errors), `out/errors.txt`, the four end screenshots.
