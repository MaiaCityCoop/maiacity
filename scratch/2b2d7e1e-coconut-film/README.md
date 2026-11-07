# Scratch for intent 2b2d7e1e-f04a-419a-989c-d462557b8c29 (the king coconut dev-log film)

Not for main: the builder's working files, kept so they outlive the session.

## Renders

Every palm picture is King coconut v3 (asset e43e66c1-963d-5d63-987d-ceed30f8f2dd, source 8bb994ef…, play's
recipe dc347478…), rebuilt by play's render bench to the same recipe hash play holds, and v2 (source 895c9c1b…)
for the dev-log split only.

    cd play/site && bun run dev -- --port 5555 &
    node scripts/render.mjs --url http://localhost:5555 --slack 3 --file v3.js --id king-coconut --v 3 \
      --shots stills.json --out stills --size 1440
    node scripts/render.mjs ... --shots timelapse.json --out tl --size 1080      # stages 0 → 11 in quarter steps
    node scripts/render.mjs ... --file v2.js --id king-coconut --v 2 --shots v2split.json --out v2

`v3.js` / `v2.js` are play's files 8bb994ef… / 895c9c1b… (GET /api/files/<hash>).

## What the bench cannot do (said, not faked)

- **The sun's hour:** the viewer's sky (play/site/src/lib/content/assets/sky.js `SUN`) is fixed at about 4 pm,
  bearing 218°, 14° high. Backlight is real (the camera at az ≈ 38° looks toward the sun); golden-hour colour and a
  lower sun are not settable.
- **The lens:** fov is fixed at 40° (viewer.js); no focal length per shot, no depth of field.
- **Camera paths:** a shot is one still camera (az, el, dist, target). Moves are made as slow push/pan over
  high-resolution stills (ffmpeg), the time-lapse as one render per quarter stage.
- **The food forest:** Sandbox 1's garden pins King coconut v1 (recipe 36c753b1…), not v3, so the palm among the
  forest's layers cannot be filmed with v3 without re-pinning that sandbox (its own intent).
