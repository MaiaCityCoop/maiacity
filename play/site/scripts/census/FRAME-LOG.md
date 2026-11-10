# The frame, round by round (intent 0356b0ea)

Each round: the change, the number before and after, kept or thrown away. Two kinds of number, never mixed:

- **box**: `vs-main.ts frame` in avenBOX (a visitor's frame on three's WebGPU backend over a device that only answers):
  WebGPU calls and buffers written a frame, standing / walking. Deterministic; decides what the CPU does.
- **runner**: `gpu.ts` on GitHub's macOS runner (a small VM, Metal), Chromium / WebKit: ms a frame. Compares only with
  that runner's own. Nothing here is Samuel's Mac.

## Round 0: where main stands (eadbf2f7)

box, from 416c555c's run on main (ead28d2): Sandbox 1 near 9,364 calls standing, 12,534 walking, 555 / 1,618 buffers
written; Sandbox 5 near 5,980 / 7,494, 573 / 1,270; Sandbox 3 1,492 calls, 81 written.

- `scripts/census/frame-bound.ts` removed: `vs-main.ts frame` is on main and is the one command.
- A lesson of the box: three frame measures at once starve it (builds time out at 20 s, a world missing its trees is
  measured and cached as main's). One at a time.
