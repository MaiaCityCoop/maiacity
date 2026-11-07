# a4f8dc85 c2: the Mac Metal run, 2026-11-07

The face fit ran, the six renders ran on Metal, and the review image is kept in Samuel's personal library on play:

    c00653fa1f2ad56b681967cd9fdf56bd749798b5a1ef21f3e9d279ae10fed07e

Nothing of his face is in git: no photo, sheet, texture, render or review here. Only `fit-report.json`, the log and the patch.

- **Renderer:** ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version). The six views (neutral and smiling × front, three-quarter, profile) took 6.2 s in all. The whole job took about 6 min 20 s, most of it pip and the MakeHuman clone.
- **Landmarks fitted** (mean px, % of eye distance), base → fitted:
  - photo-front: 6.48 → 2.14 (1.54%)
  - photo-34: 7.65 → 2.05 (1.38%)
  - sheet-front: 5.09 → 3.65 (1.95%)
- **Outline** (mean px), before → after:
  - sheet-front: 3.62 → 1.24
  - sheet-profile: 3.26 → 1.35
- **Texture:** 4096 px, with 2,659,738 of 3,474,657 head texels painted.
- **Seen in the review**, for the builder:
  - The eyes read almost white. The iris is barely visible, so the eye discs sit too far in or are too small.
  - "Smiling" is only faintly different from neutral, though the smiling front photo scores 0.77/0.78.
  - The mesh is visibly faceted on the cheeks and scalp.
  - The neck cut is jagged.

## Bugs in the job, fixed only in my worktree (`mac-patch.diff`)

1. `tools/character/render-gpu.mjs:25`: the for-loop's closing `}` was inside the `//` comment at the line's end, so the script doesn't parse (`Unexpected ,` at line 42) under node or bun. **This needs a fix on the branch.**
2. The script resolved Playwright from `npm root -g`, but this Mac has no node. It now resolves Playwright from play/site's node_modules, and run.sh calls `bun`.
3. The script launched a visible Chrome window (`headless: false`). It now runs headless on Chromium with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`, and the renderer string is still printed.
