# Mac render job for the king coconut film (intent 2b2d7e1e-f04a-419a-989c-d462557b8c29), a later version

Samuel's rule (2026-11-07): render.mjs and every 3D render run only in a Mac session on Metal. These were left out of
version 1 (story e26e4c8e-1a8c-48ad-bc63-3b33c9aad3d4) when the cloud renders stopped.

Sources: King coconut v3 = play's file 8bb994ef660024d8d994f2fe3651cf87b36de40e37de18fdb12ec5db76d3c2a1, v2 =
895c9c1b5e9106a199ddc553351d056eed8af569c8336b3e5f5dbce784f97797 (GET /api/files/<hash>). Shot lists:
scratch/2b2d7e1e-coconut-film/ on branch intent/2b2d7e1e-coconut-film. Hide the viewer's cards (a CSS rule
`.turntable .deck { display: none }`, as scratch/2b2d7e1e-coconut-film/render-film.mjs adds) and crop the canvas square.

1. **v2's own split frame:** `render.mjs --file v2.js --id king-coconut --v 2 --shots v2split.json --size 1080`
   (stage 9, az 38°, el 3°, dist 19 m, target [0, 4.6, 0]); replaces the split's "before" half (now v3 at Ripe).
2. **The dense time-lapse:** `--file v3.js --id king-coconut --v 3 --shots timelapse.json --size 1080`, 45 frames
   (stages 0 → 11 in quarter steps), assembled at 9 fps; then retime the composition's counters (compositions.py, STAGES).
3. **Golden hour:** needs the bench's sun settable (play/site/src/lib/content/assets/sky.js `SUN`, fixed at bearing
   218°, 14°): a code intent first, then re-render hook, hero wide and old palm at a lower, warmer sun.
