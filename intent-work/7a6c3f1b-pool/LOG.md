# Intent 7a6c3f1b: the log

## 2026-11-10 23:20 UTC · the kinds without levels of their own (the next untangle, NOT in this intent)

What it is. Six kinds make 400 of a first visit's 550 CPU seconds in Sandbox 1 (and Sandbox 5, which draws Sandbox 1's
layout: it has no pins of its own; Sandbox 3 pins no plant). They are not old versions: they are the **newest accepted
version** of each, and Sandbox 1 pins exactly these at their newest:

| plant | asset | version pinned (newest) | recipe | stages drawn | built at | simplify, one kind |
|---|---|---|---|---|---|---|
| Walnut | 34c5d8e0-48e4-541e-8e1d-3f7bfce8e1fe | 5 | 96e31d8c… | 10, 11, 12 | 493,199 / 741,564 / 1,679,476 triangles | 13–34 s alone, 36–78 s eight at once |
| Sweet chestnut | c0382a47-a3ee-58c4-b83a-65df5c71c18e | 6 | ecae8ac2… | 9, 10, 11, 12 | 951,296 / 636,082 / 1,270,618 / 1,586,890 | 15–39 s alone, 44–94 s |
| Hazel, tree | 33a534e9-80c7-5892-89b2-84d1a2efbdac | 5 | bda5f47f… | 10, 11, 12 | 501,625 / 543,606 / 740,888 | 12–21 s alone, 34–56 s |
| Mango | 5ac03d06-26c5-5d1b-af91-62c5ae40880d | 4 | 345412c3… | 11, 12, 13 | 384,445 / 617,298 / 887,690 | 6–23 s |
| Moringa | 76b97cae-fa1d-4bfc-a07c-5f093343919f | 3 | f36e4737… | 6, 8, 9 | 244,906 / 716,177 / 754,718 | 6–30 s |
| Yam | ec65e757-0c6d-4513-b802-8c8f7a679d3f | 3 | cc8cdaac… | 4, 5, 6, 7 | 194,556–433,083 | about 5 s |

(also pinned at its newest and of the same kind: cassava v3, hazel bush v5; lighter, under 150,000 triangles.)

Why. Each of these versions' cards says `lod: { levels: "derived" }`, although its recipe takes a `detail`
(`play/site/src/lib/content/assets/lodcard.js` `lodOf`). A version from before the contract has no `lod`, and one that
takes a `detail` is then read as declaring the forest's two details (0.25, 0.1): built light, three builds a kind, no
simplifying. A card that says "derived" is taken at its word: the plant is built whole at detail 1 and its two lower
levels are simplified from that.

How far it goes. **135 versions in play's catalog carry `derived` and a `detail`** (`derived-versions.json`): the newest
version of nearly every plant (about 90) and of every animal. Sandbox 1 pins most plants one or two versions back (1 of
2, 1 of 3 …), so today only the eight above bite. **Any pin moved to the newest (`pin_latest`) makes that plant heavy
the same way**: apple 222,758, pecan 431,608, jackfruit 628,634 triangles on their cards.

There is no newer accepted version that declares levels: for all six the pinned version is the newest.

What it would take (its own intent, in the morning). One of:
1. The cause, in one place: where a version's card gets its `lod` (play/api `src/lod.ts`, read off the recipe's source
   at accept), a recipe that takes a `detail` and exports no `levels` is not stamped `derived`, or `lodOf` reads
   `derived` with a `detail` as the old details, as it reads a missing `lod`. The 135 cards then draw as their
   older versions do, with no new versions and no pins moved. Cost: a first visit loses about 400 of 550 CPU s here.
   Check before choosing: whether any of the 135 was meant to be derived (the animals are skinned; a posed copy is drawn
   from level 0's tree, so their case may differ from the plants').
2. Or play's work: a next version of each of the six whose recipe exports its levels
   (`module.exports.levels = [{ values: { detail: 0.25 } }, { values: { detail: 0.1 } }]`), and Sandbox 1's layout
   (`sandbox:ec08b07d-6ec0-8f65-92b2-3efe7d91df5d`) pinned to them. It leaves the other 127 as they are.
3. Or the simplifier made cheaper (render/simplify.js: 12–39 s for 0.5–1.7 M triangles alone), which helps every derived
   kind but still builds each tree at a million triangles (the suspect for the memory of intent 1893a631).

The first is the smallest and removes the cause.

## 2026-11-10 23:25–23:50 UTC · Build, round 1 (pull request #2256, branch intent/7a6c3f1b-turns)

Approved 23:22 UTC (the dependency on 405f7a85 dropped by the Orchestrator). Branched from origin/main eadbf2f7.

| round | the change | before (main) | after | kept |
|---|---|---|---|---|
| 1 | `content/render/turns.js`: one line of turns, the most wanted first, a build before a level; the pool, the box, the level maker on it; the renderer's cache reads on a line of the same kind (`lineOf`) | beside.ts: 382 % of alone, 85 % of one box, 93 % of its CPU | 99 %, 42 %, 96 % | kept |
| 1 | c1: places that pick the most wanted under content/assets | 4 | 0 | kept |
| 1 | c2: lines of pool.js, host.js, lower.js, budget.js, turns.js | 609 | 605 | kept |
| 1 | `render/levels.js` `once`: a level two renderers ask for at once is made once a page | two makings | one (levels.test.ts "made once a page") | kept |
| 1 | vitest content/render, assets/box, assets/render | 233 pass | 234 pass (one moved, new cases) | |
| 1 | `gate.sh site` | green | green (130 s) | |

Decisions.
- A pool given a `size` (a test's, cores.ts's, beside.ts's "one box" arm) is a pool apart with a line of its own; the
  page's own pool (`poolOf`) takes the page's turns. So every existing pool test stands unchanged.
- A box of the pool takes no turn itself (`turns: false`): the pool took one for its build. A box used alone (a
  viewer's, the live box) still takes the page's turn for each build, as before.
- No turn is kept free for a build that may come while only levels work: a build asked then waits for the next level
  job to end (as on main, where it waited for all of them). Keeping one free would cost a core through the whole
  level phase; left for a measure on a real world if it shows.
- c9 (nice: a recipe's next build in the box that built it) not built: c2 leaves 4 lines, and it is 7 % of a visit at
  most. Left red, as specified.
- Merges with the load path's branch: `git merge --no-commit origin/intent/405f7a85-worlds-fast` in a scratch worktree
  goes through by itself (render/index.js, render/levels.js, SPEC.md auto-merged). levels.js is written for that:
  405f7a85's changed lines (the rank handed to the level maker) are not touched; `once` stands in for the keeper's
  level maker for one asking and passes every argument on, the rank too.
- 1893a631 (memory): its "one maker of lighter shapes a page" replaces `createLowering(` in render/index.js and its
  workers' lifetime is in lower.js `free`/`run`; this change touches lower.js only where a job takes its turn
  (`lower`, `dispose`), and index.js only at the reads' line.

Marked ready 23:50 UTC; the box's run records.
