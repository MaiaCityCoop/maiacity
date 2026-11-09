# Intent a5faafad · c5 screenshots (avenBOX Chromium, software rendering)

The test asset `play/site/src/lib/content/assets/box/fixtures/glow-mushroom.js` (a cap whose look is its own node graph:
teal, mottled by `fbm`, its glow pulsing, its top swaying with the wind), main against head
(`intent/a5faafad-recipe-shaders` @ a6a12f39f), by `play/site/scripts/render.mjs` in avenBOX's Chromium (SwiftShader):

- `*-viewer.png` — the render bench (`/render`: the asset box, the viewer's studio), front, side, close.
- `*-world.png` — five of it standing in `world.js` on the world bench (`/worlds/bench/`, the renderer every world
  draws its guests with), close at about 3, 8 and 15 s of the world's time, and wide.

Main (engine 5) draws the cap flat teal: its graph is dropped without a word. Head (engine 6) draws its graph the same
in the viewer and in the world: mottled teal whose glow pulses between shots.
