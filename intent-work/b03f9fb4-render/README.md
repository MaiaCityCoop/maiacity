# Mac job: intent b03f9fb4's c9 — one renderer on three r187 looks and runs as main did

Intent b03f9fb4-e05a-4357-ac97-9d1ef5b7cf41 (GPU 1/14), pull request #2176, branch `intent/b03f9fb4-one-renderer`.
Every page's renderer is now `createRenderer`'s, on three r187, with three's WebGLNodesHandler installed (TSL node
materials draw on WebGL). Nothing drawn should change: the census (avenBOX) counts the same triangles and draws. This
job checks what the census can't: the pictures and the frame time, on Metal.

**Run:** `PLAY_MCP_TOKEN=play_… bash intent-work/b03f9fb4-render/run.sh` (bun, node with Playwright's Chromium, ffmpeg).
It makes two worktrees beside the repository (`../b03f-base` at main 06fc8c9, `../b03f-head` at the branch's tip),
serves both, and then:

1. `scripts/selector-shots.mjs` (head's copy, with `--meter`): Sandbox 1 near, mid, far and Sandbox 3 open, 1440×900,
   noon pinned, base then head; each view's frame time and p95 (its own clock and the frame meter's), the meter's bound
   and GPU time, triangles, a screenshot.
2. SSIM of each view's screenshot, base against head (ffmpeg).
3. `scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98` in head's tree
   (the live shot on the re-pinned r187 live runtime), and in base's for reference.

**Pass (c9):** SSIM ≥ 0.98 per view; head's mean and p95 frame time no worse than base's (within the run's noise: say
so if a view is worse by more than 5 %), each with its bound; story parity's lowest SSIM ≥ 0.98 at head.

**Out:** `out/summary.json` (the table), `out/shots/` (PNGs, results.json), `out/ssim.txt`, `out/parity-*/`,
`out/*.txt`. Commit `out/` and push to the branch `intent-work/b03f9fb4-render`.

Note for the look: r187 rewrote `PMREMGenerator` (cube targets, new filtering), so the sky's light on surfaces may
differ slightly from r186 in reflections; that is three's change, and what the SSIM is for.
