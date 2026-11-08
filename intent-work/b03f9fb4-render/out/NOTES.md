# b03f9fb4 c9 on Mac Metal, 2026-11-08

base = main 06fc8c9 (three 0.186.1); head = 9f54474 (one renderer on three 0.187.0, `WebGLNodesHandler`). GPU: ANGLE
(Apple, ANGLE Metal Renderer: Apple M1). The branch's `run.sh` as written, `node` a bun shim on this Mac (no node
here; nothing in the repo changed).

## Frame time: passes

Head is no slower anywhere; mid is faster.

| view | base ms (p95) | head ms (p95) | base GPU | head GPU | bound |
|---|---|---|---|---|---|
| Sandbox 1 near | 22.7 (33.4) | 22.3 (33.4) | 16.0 | 15.4 | gpu |
| Sandbox 1 mid | 31.9 (49.9) | 25.9 (33.4) | 24.1 | 19.3 | gpu |
| Sandbox 1 far | 16.7 (16.7) | 16.7 (16.7) | 8.5 | 8.1 | vsync |
| Sandbox 3 open | 16.7 (16.7) | 16.7 (16.8) | 5.9 | 5.9 | vsync |

## Story parity: passes (lossless)

- **Lossless (the spec's bound):** head `--lossless` at 1, 3 and 5 s gives 0.9968, 0.9972 and 0.9962; the lowest is
  0.9962 ≥ 0.98 (`parity-head-lossless.txt`).
- **Without `--lossless`:** run.sh's own runs give 0.960 on head and 0.9604 on base. That gap is H.264 alone, the same
  on main (f270269e's finding).

## Pictures: SSIM, base against head, and main against itself

| view | base vs head | main vs main (control) |
|---|---|---|
| Sandbox 1 near | **0.989** | 0.997 |
| Sandbox 1 mid | 0.961 | 0.992 |
| Sandbox 1 far | 0.787 | 0.913 |
| Sandbox 3 open | 0.797 | 0.881 |

The spec's ≥ 0.98 holds at near only. Why it misses at the other views:

- **Far and the old city** vary from run to run on main itself (control 0.91 and 0.88):
  - The far trees' pictures are baked on this GPU and cached per device. In this pair, base drew full trees and head
    drew the pictures, the same flip 6295a650's runs showed on main alone.
  - The old city picks a new random visitor each time it opens, and its opening view shifts slightly.
- **Mid** has the same layout, shadows and plants, but head is evenly a little lighter on the ground and foliage, where
  main against itself is 0.992. It looks like r187's new `PMREMGenerator` (the README expected it) or a changed
  exposure path. It's the builder's to say which; intent 2214e661 replaces the whole sky light next.

So the frame time and story parity meet c9; the SSIM bound does not, for the reasons above. Recording c9 needs either
the mid shift explained (and the bound restated with the control's noise), or a step back to Specify.

Files: `summary.json`, `shots/`, `ssim.txt`, `base-twice/` with `ssim-base-twice.txt`, `parity-*` (stills only),
`parity-head-lossless.txt`.
