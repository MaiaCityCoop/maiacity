# bba9c796 c7 audit on Mac Metal, 2026-11-07

main = 8b5b4a7fe; the meter is the one on the pull request's branch. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple
M1). **The GPU timer is offered**, so every `gpu_ms` is real. The audit took 302 s. `run.sh` and `audit.mjs` ran as on
the branch; `node` was a bun shim on the PATH (this Mac has no node; nothing in the repo changed).

| view | frame (p95) | cpu | gpu | calls | tris | bound | gpu with no shadow / no blend / half size |
|---|---|---|---|---|---|---|---|
| S1 near | 31.8 (50.0) | 13.4 | 23.1 | 2104 | 5.95M | gpu | 22.8 / 21.0 / 14.5 |
| S1 mid | 36.1 (50.0) | 15.2 | 26.6 | 2080 | 6.23M | gpu | 27.0 / 27.6 / 16.8 |
| S1 far | 16.7 (16.7) | 7.3 | 9.7 | 1087 | 2.55M | vsync | 9.5 / 9.2 / 8.4 |
| S3 open | 16.7 (16.7) | 4.1 | 6.1 | 1058 | 0.76M | vsync | 4.8 / 6.0 / 4.2 |
| S3 walk5 | 16.7 (16.7) | 3.3 | 5.6 | 919 | 0.66M | vsync | 4.4 / 5.6 / 3.8 |
| S3 walk15 | 16.7 (16.7) | 3.2 | 5.4 | 835 | 0.66M | vsync | 4.3 / 5.4 / 3.6 |

What stands out, for the builder's wins:

- **Sandbox 1 near and mid are GPU-bound (23–27 ms).** Halving the pixels saves 8.6–9.8 ms, about 37%, so a good part
  is fill (fragments and overdraw). The rest scales with geometry: 5.9–6.2M triangles in about 2,100 calls, over 1,780
  of them MeshStandardMaterial.
- **In Sandbox 1, the probe counts no shadow-map draws** (0 calls) at any view. Dropping shadows changes nothing there
  (±0.4 ms). Blended draws cost about 2 ms near and nothing at mid. If the village does draw shadows, the probe
  doesn't see them.
- **Sandbox 3 is vsync-bound,** at 5–6 ms GPU. 60–75% of its draw calls are shadow-map depth passes (649–788 calls),
  and leaving them out saves 1.1–1.3 ms.
- **Textures:** about 265 MiB in Sandbox 1, about 43 MiB in Sandbox 3.
