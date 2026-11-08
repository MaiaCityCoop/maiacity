# c7 on 1c7f2afa8, run 6: Sandbox 1 and the old city, main ff391a7 (left/top) against head (right/bottom)

Selector-shots, seeded by the render box's patch.py, 1440×900, noon.

| view | SSIM | frame base → head | read |
|---|---|---|---|
| Sandbox 1 near | 0.982 | 23.2 → 30.3 ms | the same picture |
| Sandbox 1 mid | 0.918 | 30.2 → 29.9 ms | the same layout; foliage differs in detail |
| Sandbox 1 far | **0.768** | 16.7 → 16.7 ms | **the far trees' pictures lose most of their crowns: bare trunk tops above sparse, lower foliage** (`cmp-far-crop.png`) |
| old city open | 0.902 | — | the same scene; only the random visitor differs (1.73 m vs 1.81 m, other colours): not seeded |

The far view is drawn from the impostors (L3 pictures): head's pictures of the same trees are not the same pictures.
