# The frame, round by round (intent 0356b0ea)

Each round: the change, the number before and after, kept or thrown away. Two kinds of number, never mixed:

- **box**: `vs-main.ts frame` in avenBOX (a visitor's frame on three's WebGPU backend over a device that only answers):
  WebGPU calls and buffers written a frame, standing / walking. Deterministic; decides what the CPU does.
- **runner**: `gpu.ts` on GitHub's macOS runner (a small VM, Metal), Chromium / WebKit: ms a frame. Compares only with
  that runner's own. Nothing here is Samuel's Mac.

## Round 0: where main stands (eadbf2f7)

box, from 416c555c's run on main (ead28d2): Sandbox 1 near 9,364 calls standing, 12,534 walking, 555 / 1,618 buffers
written; Sandbox 5 near 5,980 / 7,494, 573 / 1,270; Sandbox 3 1,492 calls, 81 written.

- The second command that bound a frame against main (416c555c's, for its own run) is removed: `vs-main.ts frame`
  is on main and is the one command.
- A lesson of the box: three frame measures at once starve it (builds time out at 20 s, a world missing its trees is
  measured and cached as main's). One at a time.

## Round 1: where a frame's JavaScript goes (box, Sandbox 1 near, a CPU profile of 300 walking frames)

Measured before any cut: 46 ms of JavaScript a frame standing, 54 ms walking (the box's CPU, with the profiler; 39 / 55
without). Of the walking frame: three's own work per draw about 78 % (its bindings 19 %, its nodes' updates 17 %), the
sun's shadows 13 %, the asset renderer's `update` 8 %, every object placed again (`core.js place`) 7 %. The scene pass
sends 1,688 draws; the instanced asset renderers are 200 of them. The rest, by the line that adds them
(`FRAME_PASSES=1 bun play/site/scripts/census.ts --frame …` prints it): the crowds 613 (`assets/render/crowd.js`), the
domes' insides about 720 (`sandbox-2/interior/interior.ts`), the village 50.

- **A walk looks at a cell before its copies** (`assets/render/walk.js`, c8). box: calls unchanged (it cuts no call);
  JavaScript 39.1 / 55.1 ms → 40.3 / 55.9 ms standing / walking: no gain the box can see (the loop was 4 % of the
  frame). 4,818 of Sandbox 1's 8,411 forest copies are no longer looked at or are out of view. **Kept**: the spec's
  c8, and the same drawing by its test; its worth is small.
- **A crowd's coat none of which stands afar is not drawn.** box: 1,709 draws before and after: every coat has
  animals afar. **Kept** (two lines, right, worth nothing here).
- **A crowd's shape is drawn in one run of triangles per material** (`crowd.js oneRunPerMaterial`): a build comes with
  2 materials in about 9 runs, and three sends a draw a run. box, Sandbox 1 near: draws 1,709 → 1,173 standing, 2,075
  → 1,430 walking; calls 9,362 → 8,803 standing (−6 %), 12,538 → 11,553 walking (−8 %); JavaScript 39.6 / 53.3 ms
  (within noise). Same triangles, same materials; a shape with a see-through material is left as it is. **Kept.**
