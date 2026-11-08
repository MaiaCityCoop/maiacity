# Mac job: intent cb16b7a5's c7 — the render kit's shaders in TSL look and run as main did

Intent cb16b7a5-66c2-47d7-8e69-d3f6328e0e72 (GPU 2/14), pull request #2179, branch `intent/cb16b7a5-render-tsl`.
The level fades, cut-outs, section caps, far pictures and the asset stage (its gloss, floor, x-ray ghost and contact
shadow) are TSL node materials now (`play/site/src/lib/content/render/nodes/`), drawn on WebGL through three's
WebGLNodesHandler (installed locally in `createRenderer` until intent b03f9fb4 lands). Nothing should look different;
the census (avenBOX) already counts the same triangles and draws. This job checks the pictures and the frame time.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/cb16b7a5-render/run.sh` (bun, node with Playwright's Chromium,
ffmpeg). It makes two worktrees beside the repository (`../cb16-base` at main where the branch left it, `../cb16-head`
at the branch's tip), serves both on 5181/5182 with play's read-only proxy, and then:

1. `scripts/selector-shots.mjs`: Sandbox 1 near, mid, far, 1440×900, noon, base then head: frame time, p95,
   triangles, a screenshot each.
2. `assets.mjs` (this folder): assets in the asset library, base then head: the walnut (levels), the goat (skinned),
   the water canister, and two machines with the kit's section caps whole and cut open (`stage.target.cut = 1`): the
   first two of its list that build through the token's routes and have capped materials, picked on base and the same
   on head (`assets.txt` says which); frame time over 6 s and a screenshot each. Then Sandbox 1 walked 30 m in from z = 160, a frame every
   0.5 s (`walk-00` … `walk-12`), for the level changes.
3. SSIM of every picture, base against head (ffmpeg); the walk as one strip per site (`walk-base.png`,
   `walk-head.png`).

**Determinism:** `assets.mjs` uses the render box's `determinism.mjs` (copied from `intent-work/main-baseline/`):
a seeded `Math.random` in every page and a settle on `QUIET`. `selector-shots.mjs` is main's script: patch it with the
render box's `patch.py` as usual, for base and head alike, or judge Sandbox 1's far SSIM against the main-vs-main
control (far 0.913).

**Pass (c7):** SSIM ≥ 0.98 per shot (the walk's frames too: a frame where head pops and base dithers drops there);
head's mean and p95 frame time no worse than base's (say so if any shot is worse by more than 5 %); the cut shots show
the red section faces on head as on base; no `pageerror` in `assets.txt`.

**Out:** `out/summary.json` (the table), `out/ssim.txt`, `out/shots/`, `out/assets/`, `out/walk-*.png`,
`out/*.txt`. Commit `out/` and push to the branch `intent-work/cb16b7a5-render`.
