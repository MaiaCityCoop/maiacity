# Handover: 544485e2, the viewers' sky clear again (from the Mac render box, 2026-11-09 15:50 Berlin)

Branch `intent/544485e2-viewer-sky` (PR #2194, draft), its tip `bc2884817`:
- `1b4192914`: `render/nodes/index.js` `install()` draws every node material linear and untoned into a target, as
  three's own materials are (the sky was toned twice in the viewer's post stack). `nodes.test.ts` checks it.
- `bc2884817`: `assets/stage.js` sets the bloom's threshold each frame as `1.6 / sky.exposure()` (the lens's units) and
  keeps the sky's dome and stars out of the ambient occlusion (`userData.noAO`, as the old viewer sky was).
I won't push to this branch again.

## What the Mac found (Chromium on Metal, 1440×900, a 760×900 clip of the viewer)

References: the pre-programme viewer (`06fc8c947`, its own painted sky, NeutralToneMapping): mean R/B grass .946,
goat .936, forklift .936. Main's viewer: grass 1.122, goat 1.131, machine 1.130 (sepia, hazy, a dark band on top).

1. **The haze over the asset is the bloom.** Under the one sky the viewer's exposure is about 0.42 (sun pinned at 14°),
   0.21 at 30°, 0.18 at 35° (computed from `sky.js` on the CPU: `exposureFor`). Bloom's threshold of 1.6 is in the
   scene's units, so nearly every lit surface bloomed into a white veil. Threshold 3 (or 1.6 / exposure) and strength
   0.12–0.22: the goat and forklift crisp, shadows clear. Fixed on the branch.
2. **The black band over the goat and machine viewers is not the sky's colour, and the dome isn't drawn there.**
   - It appears over `/animals/` and `/machines/`, never over `/biomes/` (the grass), and only with the sun at 30–35°
     (at 14° the same region reads warm and bright).
   - Painting the dome flat magenta (`universe.js` colorNode → `vec4(1,0,1,1)`): the biome viewer's sky turns magenta;
     over the goat and the forklift the region stays black. So something stops the dome being drawn there, or covers it.
   - No change with: AO off (`ao: false`), the post stack's FINITE pass removed (no NaN blotches: the pixels are 0, not
     NaN), clouds 0, a mood lid at 0.7–0.9 (`sky.mood({ lid })`), the dome's depth at 0.9999 of the far plane.
   - Bloom off: the band is pure black (0,0,0); with bloom on it's dark teal (bloom's halo from the bright floor band).
   - Cameras: animals near 0.0049 / far 117.9 (dome scale 58.9 = ±29.5 m), biomes near 0.0012 / far 28.4 (dome ±7.1 m),
     both exposure 0.236. The camera sits at bearing 38° (`viewer.js` `BACK`), looking toward the sun's bearing 218°.
   - On the CPU (`skyAt`, Preetham), toward the sun at elevations 10–35° the sky is bright (4–19 linear), so a dark
     band there can't be its own colour.
   - **Untested lead:** only the studio stage (animals, machines) has the contact shadow (`kit.js` `ContactShadow`:
     a plane, an orthographic camera added to `stage.scene`, a blur quad); the biome viewer has none. The knob to test it
     is ready in the Mac's scratch tree (`nocontact`).
3. **Tone and sun, with the bloom fixed** (R/B grass / goat / machine):
   - Neutral, sun 30°: .943 / 1.057 / 1.072; Neutral 35°: .938 / 1.055 / 1.064 — the goat and machine 13–15 % warmer
     than pre (the beige floor `#c8bfae` under a low warm sun; pre's floor read blue-grey under its painted sky).
   - AgX, sun 30°: .990 / 1.020 / 1.027 — all within 10 % of pre.
   - Sun 14° (the stage's pin): a warm, sunset sky (R/B ~1.3), sepia by eye.
4. A mood lid (`sky.mood`, needs `lid` to be settable) over the sky did not lift the black band (see 2) and made the
   environment flatter (a grey haze back on the asset at lid 0.7–0.9).

## The Mac's scratch tree (for reproducing; not on any branch)

`~/Documents/Development/sfixC-cal` at `1b4192914` with knobs read from `globalThis.__cal` (set by an init script):
`tone` (agx|neutral), `el`/`az` (the pinned sun), `ex` (lens ×), `env` (environment intensity), `key`, `rim`, `bs`/`bt`
(bloom strength/threshold), `noao`, `aooff`, `lid`/`haze`/`zen` (mood lid), `zw` (dome depth), `clouds`, `nofinite`
(`post.js`), `magenta` (`universe.js`), `nocontact`. The shots: `calib.mjs` (grass, goat, forklift per variant).
