# 090168c8 · the Mac render job (c7 and c8: real grass)

GPU work runs only on Samuel's Mac (Metal), never on SwiftShader in the cloud. This job draws Sandbox 1's grass, the
blades of `play/site/src/lib/content/biomes/grass.js`, and measures what they cost on the GPU.

**On the Mac**, from the repository's root:

```sh
git fetch origin intent/090168c8-real-grass && git checkout intent/090168c8-real-grass
bash intent-work/090168c8-render/run.sh
```

- **Needs:** bun, node, Playwright with its Chromium, ffmpeg, curl, and `PLAY_MCP_TOKEN`. The token is read by the
  read-only proxy, as `selector-shots.mjs` reads play. No fal, nothing paid.
- **Determinism:** the render box's `determinism.mjs`, fetched from `intent-work/main-baseline-render`.
  - `SEEDED_RANDOM` is an init script.
  - Every view waits for `QUIET`, for at most about 3–4 minutes: since intent 2, Sandbox 1 keeps taking far-tree
    pictures for minutes and never counts as quiet. `settled` in `results.json` says whether a view got there.
  - The hour is pinned (`__interiorHour`), and so is the world's clock (`__worldTime` = 100 for the stills, stepped
    1/24 s a frame for the films). The gusts are the same in every run.
- **Renderer:** it prints `renderer: …`. If that is not Apple's Metal, it stops and draws nothing.
- **Where it shoots:** the meadow. That is the most grassy 12 m round Sandbox 1's near view (0, 95), found from the
  grass's own mask; its place is printed and kept in `results.json`.

**Out**, in `intent-work/090168c8-render/out/` (pushed by the Mac to the branch `intent-work/090168c8-render`, as every
job's is, never onto the pull request's branch, so no frame reaches main; the full frames stay in
`~/090168c8-work`):

- `noon-walk.jpg`, `noon-up2.jpg`, `sun8-walk.jpg`, `sun8-up2.jpg`: the meadow at 1440 × 900.
  - **Lights:** at 12:00, and with a sun of 8° (19.44 on the sky's day).
  - **Heights:** at walking height (eye 1.65 m), and 2 m higher (eye 3.65 m).
  - **Facing:** at 8° the camera faces the sun, so the tips are backlit.
- `beside-meadow_2-*.jpg`, `beside-autumn_meadow-*.jpg`: the walking-height stills beside Poly Haven's CC0
  `meadow_2` and `autumn_meadow` (their previews).
- `film-noon.mp4`, `film-sun8.mp4`: 20 s of walking at 1.3 m/s straight through the meadow, 24 fps.
- `results.json`: for each still,
  - the frame meter with the grass and without it (`__grass.object.visible`);
  - **`grassGpuMs`**, the grass's own GPU time (c7: at most 3.5 ms at 1440p);
  - the blades drawn at each level (`__grass.count()`: 15-, 7- and 4-vertex).
- `results-small.json` and `small-*.jpg`: the same stills at 390 × 844 on the small device's budget (`?budget=small`),
  with density, levels and frame time (c8).
- `run-log.txt`, `run-log-small.txt`.

**What to look for (c7):**

- Dense, varied blades in clumps, not confetti.
- Tips glowing where the low sun is behind them.
- Gusts rolling across the meadow in the films.
- No ring, pop or edge where the blades thin out and end, while walking.
- The grass's GPU ms at most 3.5.

The branch is stacked on intents 4 (db87a28f, the ground), 5 (11ead007, the cover stream) and 6 (6fd5e63f, one wind):
the grass stands on the ground's relief, brightens and darkens with it over 5, 20 and 80 m, and sways in the same
wind as every plant, on the world's clock (pinned here, so the gusts repeat).
