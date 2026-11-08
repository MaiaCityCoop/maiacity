# Render job: intent db87a28f's ground of real surfaces (c7, c8), on a Mac's Metal

Intent db87a28f-2d3a-41d9-8a2b-40314fdb2d40 (GPU 4/14: every biome's floor from CC0 scanned surfaces in TSL, blended
by height, never repeating, with relief, wetness and shade from the real crowns). Its pull request is #2178, branch
`intent/db87a28f-real-ground`. This job measures **main** (`base`) and the pull request's **head**, one after the
other, never side by side.

## What it measures

- **Sandbox 1** (`/sandbox-1/`), 1440×900, bba9c796's views placed with `__walker.place`, each once nothing more is
  being built:
  - near: x 0, z 95, pitch −0.05; mid: x 0, z 235, pitch −0.05;
  - each at 12:00 and with the sun 10° up (`__interiorHour` 5.7: low from the east, across the relief);
  - at 12:00 the frame meter (`render/meter.js`) over 3 s: mean and p95 frame, CPU and GPU ms, calls, triangles,
    the bound; and the probe's `texture_mib`.
  Each view is its own fresh page (the hour pinned before it loads, built, settled, placed, settled, measured), so
  nothing of one view carries into the next.
- **Where the CPU goes:** at near at noon, Chrome's own CPU profile over the same 3 s (`<site>-near-noon.cpuprofile`,
  and the top functions by self time in `results.json` and on stdout), base and head.
- **A biome patch in the viewer** (`/biomes/#<asset>`): the food forest floor and the beech forest, after 45 s.
- **Head on a small device:** Sandbox 1 near at 390×844 with `?budget=small` (the 1024 px sets): screenshot, frame,
  texture memory.
- **References:** Poly Haven's CC0 `forrest_ground_01`, `forest_leaves_02` and `brown_mud_leaves_01`, their colour at
  1k, beside the shots.

`probe.js` is bba9c796's, with one change: a compressed texture counts at its format's real size (one byte a pixel
for ETC2 RGBA, BC3/BC7 and ASTC 4×4, half for BC1/ETC RGB), where it counted 4. The ground's scans are KTX2 array
textures; at 4 bytes a pixel they would read four times what the card holds.

The ground's KTX2 files are not on play until the pull request is deployed: the job's proxy serves
`/api/files/<hash>` from the head's `play/media/` where the file is there, and forwards every other GET or HEAD of
`/api/…` to play.maia.city with the token (sent to play and nowhere else).

**Determinism:** the render box's `determinism.mjs` (from `intent-work/main-baseline-render`): `SEEDED_RANDOM` as an
init script on every page, base and head alike, and a view counts as settled only when `QUIET` reads 0 (nothing
building or being kept, no new far-tree picture in 2 s). Main's own baseline for the same views is under
`intent-work/main-baseline/out/<commit>/`; this job still measures main itself, one after the other with the head.

## Run it

```sh
git fetch origin intent-work/db87a28f-render
git checkout intent-work/db87a28f-render          # or a worktree of it
PLAY_MCP_TOKEN=play_… bash intent-work/db87a28f-render/run.sh
```

`run.sh` puts main and the head in worktrees (`../db87-base`, `../db87-head`), runs `bun install`, starts their dev
servers on :5191 and :5192 with `PLAY_API` at the proxy (127.0.0.1:3913), and runs `shots.mjs` with the head's
Playwright (Chromium with `--use-angle=metal`). About 20–30 minutes.

**Out**, in `intent-work/db87a28f-render/out/`:

- `results.json`: per site the views (meter, texture_mib, png), the biomes, the head's small device, page errors;
- `<site>-sandbox-1-<view>-<noon|sun10>.png`, `<site>-biome-<name>.png`, `head-sandbox-1-near-small.png`;
- `ref-<id>.jpg`;
- `stdout.txt`; its last line compares the near frame time and texture memory.

Commit `out/` (without `vite-*.log`) to this branch and push.

**If the first line says `GPU timer NOT offered`,** `gpu_ms` is null; the frame time still stands. Say so with the
output; don't rerun with other flags unasked.

## Then

The builder reads `out/` and records c7 and c8: near frame time at most main's + 1.5 ms with the bound, texture
memory at most 330 MiB, and the looks (no repeat across 30 m, surfaces meeting by height, relief in the low sun, wet
paths) beside the references.
