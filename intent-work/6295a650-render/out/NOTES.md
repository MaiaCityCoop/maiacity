# Mac Metal run, 2026-11-07

- GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version). Chromium 1243 (`channel: 'chromium'`, headless), `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`; the launch line is the only change from `play/site/scripts/selector-shots.mjs` (copy: `selector-shots-gpu.mjs`).
- base = 6d0d7ac (port 5181), head = 1da824045 (port 5182), 1440×900, one after the other.
- **Confound:** the world clock was on Auto. Base was shot at in-world 24.01.32 19:24–19:39 (dusk), head at 20:45–21:05 (night, lamps lit). Lighting, and maybe the lamps' draw calls, differ between the two runs. The head's far view is too dark to see the master dome, so c5 can't be judged from it. Rerun with the world's time fixed (Manual, the same hour) before deciding c4/c5.
