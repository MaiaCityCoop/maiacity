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

## Round 3: what is written to the graphics card every frame though nothing changed

How it was found: `FRAME_PASSES=1 bun play/site/scripts/census.ts --frame --world sandbox-5 --view near` now prints
the buffers written a frame by buffer, and for each, which of its floats differ from the last write. Standing still in
Sandbox 5, 567 buffers were written a frame. Two causes:

- **The wind's clock and the cover's eye were each drawing's own.** Every swaying plant's and every piece of cover's
  per-drawing buffer was written again every frame, only for the wind's time and the eye's place (the same few
  floats in every one). They are the world's and now sit in three's one shared buffer (`renderGroup`), sent once a
  frame (`render/wind.js`, `render/nodes/index.js`). box, Sandbox 5 near: buffers written 567 → 432 standing,
  1,248 → 932 walking; calls 5,941 → 5,471 standing. Same values in the shaders, read from another buffer. **Kept.**
- **A crowd's places were sent whole every frame** (`crowd.js`, `instanceMatrix.needsUpdate`). They now go through the
  same sender as the forest's copies (`send.js`): only what moved. box: Sandbox 5 writes 432 → 420 standing;
  walking within noise (989). **Kept.**

Where the box stands after round 3 (vs main, Sandbox near view; standing / walking):

| | draws | buffers written | WebGPU calls | JavaScript ms (the box's CPU) |
|---|---|---|---|---|
| Sandbox 1 main | 1,709 / 2,075 | 555 / 1,618 | 9,362 / 12,538 | 39 / 55 |
| Sandbox 1 head | 849 / 1,079 | 443 / 1,303 | 6,630 / 8,925 | 27 / 41 |
| Sandbox 5 main | 597 / 679 | 567 / 1,248 | 5,941 / 7,459 | 22 / 31 |
| Sandbox 5 head | 597 / 715 | 420 / 989 | 5,455 / 6,921 | 19 / 33 |

`gpu.ts --walk` now lets the world settle where the walk starts before it walks (what streams in round a new place is
no part of a walk), and in Chromium profiles 5 s more of the walk and prints a walking frame's JavaScript by function
(with `--steps`): the next rounds cut by what the runner's real browser says, not the box's.

## Round 4: the shadow pass

The audit of intent 1f6a98dd (box, main eadbf2f7): a shadow redraw in Sandbox 1 near is 6.67 M triangles, more than
the picture's 3.84 M, and it comes every 2 m walked or 2° turned (`sandbox-kit/sky.js`), so walking pays it every few
frames; 72 % of it is the dome's inside. In Sandbox 5 near: 5.15 M, the forest dome 46 %.

- **A see-through caster seen from both sides is drawn once into the shadow map** (`sky.js shadowsInOnePass`, its
  test in `sky.test.js`). three draws such a material's back faces and then its front faces, as a picture must to
  blend it, and its shadow pass keeps both flags, so every glass pane, leaf card and canopy was drawn twice into a
  depth map that is the same either way. The box's frame count barely moves (1,079 → 1,073 draws walking in Sandbox 1:
  they are few draws); the triangles it saves are the GPU's, for the runner to show. **Kept.**
- **Not cut, and why:** the dome's glazing casts no shadow (`interior.ts geodesic`: `shell(glass, …, false)`), so the
  sun reaches the inside and every shadow cast there is seen through the glass: they stay. What would cut them without
  a loss is the inside drawn by levels (a coarser shape far off, as the plants are): the domes rebuilt as assets with
  levels, beyond tonight. Its size: up to 4.8 M of a 6.67 M-triangle shadow redraw in Sandbox 1 near, and 1.7 M of
  the 3.84 M picture (the audit's counts).
- **Not cut:** a shadow redraw on every 2° turned. The cascades are fitted to the view, so a turned eye sees ground the
  old map does not cover; holding the map longer would leave that ground unshadowed for a moment: a loss.
- `gpu.ts` measures its browsers one after the other again, as on main: loading them side by side was a way round a
  check's 600 s limit, which intent d3f98bcc fixes in `intent.ts`.

## Round 5: what has not moved is not placed again

- **An object's matrix is made again only when its place, turn or size changed** (`render/core.js place`, its test
  `render/place.test.js`: the same world matrices as three's own `updateMatrixWorld`, frame by frame, while objects
  move, hide and show again; nothing made again where nothing moved). three made every shown object's matrix again
  every frame, and so every world matrix under it. box profile, Sandbox 1 near walking: `place` 8.5 % → 5.0 % of the
  frame's JavaScript, three's `updateMatrix` gone from it. The box's milliseconds are too noisy to read this in (the
  same head measured 19.7 and 25.4 ms in Sandbox 5); the runner's profile decides. **Kept.**

## The runner at 2a5aef60 (rounds 1 to 5), run 42932103689: both engines, the first time

GitHub's macOS VM, Metal; 1,500 s a check since intent d3f98bcc. Each against the aim: 16.7 ms a frame (60 a second).

| | WebKit standing | WebKit walking | Chromium standing | Chromium walking |
|---|---|---|---|---|
| Sandbox 3 | **16.8 ms** (p95 20), 0.1 ms off the aim | (no walker) | 42.1 ms (p95 116.6, CPU 10.3) | (no walker) |
| Sandbox 5 | 29.4 ms (p95 51, CPU 23.1), 12.7 ms off | 50.6 ms (p95 114, CPU 38.1), 33.9 ms off | not in the log (only a check's tail is printed) | not in the log |
| Sandbox 1 | **792.8 ms** (p95 1,975, CPU 85.2), 13 frames in 10 s | not measured (see below) | not in the log | not in the log |

Before (round 0, main's render code, Chromium only): Sandbox 1 104.6 ms standing, 492.7 ms walking; Sandbox 5
standing 1 frame in 10 s, walking 162.2 ms.

**Sandbox 1 in WebKit is the problem of the night**, and it is the 1.5 to 6 frames a second Samuel saw in his Safari:
793 ms a frame with 728 draws and 2.6 M triangles, where Sandbox 5 takes 29 ms with 3.9 M. The page's JavaScript is
85 ms of it, so the rest is WebKit's own (its GPU process, Metal), and something in Sandbox 1 that Sandbox 5 lacks.
c5 failed on it: its picture was not read ("null painted": taking or reading the screenshot threw), so its walk was
not measured. `gpu.ts --steps` now prints every error the page said, not only the first.

The box cannot see a GPU's cost, so the next step is a Mac job (`intent-work/0356b0ea-render`, branch of that name,
dry run passed): Sandbox 1 in WebKit and Chromium, measured whole, then with each part of its scene hidden in turn
(a dome's inside part by part), to find the part that costs WebKit the 700 ms.

Chromium's walking frame, by its own profiler (Sandbox 1, top of 7.9 s sampled): (program) 17.8 %, idle 13.6 %, then
three's render loop and WebGPU's own calls (submit, writeBuffer, setVertexBuffer, createBuffer 1.3 %), each a few per
cent. No one function of ours stands out: the walking frame waits on the GPU as much as it works.
