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

## Round 0 on the runner: main's render code (head a74e640: main plus `gpu.ts --walk`), Chromium only

runner, run 42923712272 (cancelled by my next push; a push to the pull request cancels a dry run):

| | world up | standing | walking | draws, triangles (the meter's) |
|---|---|---|---|---|
| Sandbox 1 | 300.3 s | 104.6 ms a frame (p95 316.6, CPU 63.5) | 492.7 ms (p95 1,583, CPU 284.6) | 699, 1.96 M |
| Sandbox 5 | 303 s | 1 frame in 10 s (CPU 426 ms) | 162.2 ms (p95 400, CPU 89.9) | 1,519, 8.35 M |

**No WebKit number, and c5 and c6 failed there for a reason that is not the frame:** a check is killed after 600 s
(`intent.ts`), and a world alone takes 300 s to come up on the runner with main's load path, so the second browser
never had its turn. Round 2 answers it in `gpu.ts`.

## Round 2

- **The dome's stairs and gallery pillars are baked** (`sandbox-2/interior/interior.ts`): each tread, each tread's
  light and each pillar was a mesh and a draw of its own (387 of the big dome's 562 draws were such single pieces).
  box, Sandbox 1 near: draws 1,173 → 918 standing, 1,430 → 1,136 walking; JavaScript 39.6 → 26.3 ms a frame standing,
  53.3 → 41.9 ms walking. A stair is now one thing to the shadows' size rule (`sandbox-kit/casters.js`), where its
  treads were each too small to cast: a stair may cast a shadow where it cast none. **Kept.**
- **A dome's small baked meshes are joined, one a material** (`interior.ts joinBaked`): baked in a few dozen goes, one
  material was drawn many times. Only meshes under 20,000 vertices of the very same material. box: the big dome 307 →
  238 draws; Sandbox 1 near 918 → 849 standing, 1,136 → 1,079 walking; JavaScript 31.8 / 43.6 ms (noise: no worse).
  **Kept.**
- **`gpu.ts` brings every browser's world up at once, then measures each alone** (the others' frames held), and
  settles for 30 s at most (60 before): so two engines fit in a check's 600 s. A time to the world is now a time
  beside the other browser, longer than alone; frame times are still one browser at a time.
