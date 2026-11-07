# f270269e c4: story parity at 1/3/5 s on Mac Metal, 2026-11-07

Head 8928077 (intent/f270269e-live-shots), play/site, PLAY_MCP_TOKEN set:

    bun scripts/story-parity.ts src/lib/stories/fixtures/king-coconut-live.json --at 1,3,5 --min-ssim 0.98 --lossless --keep /tmp/f270269e-c4

**Result: passes.** SSIM 0.9967 at 1 s, 0.9971 at 3 s and 0.9961 at 5 s. The lowest, 0.9961, is above the 0.98 bound. Seen side by side, render and player show the same palm, fruit, sun and "King coconut / Ten years" title. Wall time 2 min 12 s.

- **Player GPU:** Chrome 156.0.8078.80, ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version).
- **Patch, worktree only, not committed** (`story-parity-metal.patch`):
  - the player's launch flags get `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`, plus a line that prints the renderer string;
  - `hyperframes render` gets `--browser-gpu`, which forces host GPU instead of its auto probe. HyperFrames doesn't print its renderer string under `--quiet`, so the renderer side's GPU is as forced, not as read.
- **Files:**
  - `render-{1,3,5}.png`: HyperFrames' lossless png-sequence frames;
  - `player-{1,3,5}.png`: the Stories player's frames;
  - `stdout.txt`.

  The full 500 MB frame sequence is not pushed.
