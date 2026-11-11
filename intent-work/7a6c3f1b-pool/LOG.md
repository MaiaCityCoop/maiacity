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

## 2026-11-10 23:25–23:35 UTC · Build, round 1 (pull request #2256, branch intent/7a6c3f1b-turns)

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

Marked ready 23:35 UTC; the box's run records.

## 2026-11-10 23:35–23:42 UTC · round 2: written to merge with the memory intent (1893a631)

| round | the change | before | after | kept |
|---|---|---|---|---|
| 2 | round 1's level maker (each job asking its own ranked turn, no line of its own) | merge with origin/intent/1893a631-memory: conflict in render/lower.js (it rebuilds the jobs, one heavy shape at a time, the workers' lifetime) | — | thrown away |
| 2 | lower.js as on main but for one line: the turn it asks is a level's (`levelTurn`, after every build); the line's `when` gone with it | conflict | both neighbours merge by themselves (`git merge --no-commit`, 1893a631-memory and 405f7a85-worlds-fast) | kept |
| 2 | c2 lines after that | 621 | 608 of 609 (history retold in comments cut: it is in git) | kept |
| 2 | beside.ts on it | 99 %, 42 %, 96 % | 113 %, 47 %, 103 % then 100 %, 40 %, 89 % | kept |
| 2 | beside.ts: the two arms held against each other run twice, the sooner taken (8 s arms moved by a second of noise; the command and its bounds unchanged) | one run each | 2 min 52 s for the whole measure | kept |

So the scope's "lower.js keeps no order of its own" is not what was built: the level maker still picks its most
wanted job as its turn comes (main's code, which 1893a631 builds on). The fault was never that order; it was that a
level's turn came before a build's. c1 and c2 hold as specified.

Pushed 50bd98b5 to the ready pull request #2256 at 23:42 UTC.

## 2026-11-11 00:00–00:07 UTC · round 3: the box's first recorded run, and what the world's last step waits for

The box's run on 50bd98b5 (https://github.com/MyAvenCEO/maiacity/actions/runs/42925494879), recorded:

| check | result |
|---|---|
| c1 | pass: 4 → 0 |
| c2 | pass: 609 → 608 |
| c3, c4 | pass |
| c5 (GitHub's runner, 4 cores) | pass: 103 % of alone, 42 % of one box, 95 % of its CPU |
| c8 | pass (187 s) |
| c6 Sandbox 1 on Metal | **failed: killed after 600 s.** Chromium ✓ (drew with webgpu, 95 % painted, the device held), the world at 205.3 s; WebKit had not finished when the check's 600 s ran out |
| c7 Sandbox 5 on Metal | **failed the same way.** Chromium ✓ (96 % painted), the world at 212 s |
| c9 (nice) | red, not built |

What the runner's steps show (Sandbox 1, a 3-core VM): the forest's 198 kinds grown at **72 s** (the builds no longer
wait behind levels), then "the plants near you" from 73 s to 205 s. That step (village.ts) waits until nothing is
building, two minutes at most, and counted the levels being made lighter as building: with a build before a level, the
big trees' levels are all still to make when the builds are done, so it waited its whole two minutes for them.

| round | the change | before | after | kept |
|---|---|---|---|---|
| 3 | sandbox-2/interior/drawn.js `settled`: nothing read, built or compiled for it; the levels being made lighter are not waited for (a kind is drawn as its build until its lower levels come) | the runner: world at 205 s (Sandbox 1), 212 s (Sandbox 5), 132 s of it that wait | to be read off the next run | kept, pending the run |

Why here and not left to 405f7a85 (which takes that step out altogether): without it this change alone shows the
world no sooner on main, and the two real-GPU checks cannot finish two browsers in their 600 s. It is the same
decision as the intent's (the world waits for builds, not for levels), in the one place that still asked the other
way; 405f7a85's branch still merges by itself (it does not touch that line), and so does 1893a631's.
The picture: unchanged once grown; while the levels are being made a far tree without its lighter levels is drawn as
its build (finer than it will be), never thinner.

Pushed 6d895786 at 00:06 UTC.

### Seen on the way, outside this intent (for the realism programme and the morning)
- The frame on GitHub's runner once the world shows: Sandbox 1 87.9 ms a frame, 774 draws, 2.24 M triangles; Sandbox 5
  62.1 ms, 852 draws, 5.23 M triangles (a paravirtual GPU: its own numbers only).
- An intent's real-GPU check runs both browsers inside one 600 s limit (main's intent.ts); on main as it is, one
  browser alone takes 280 s (205 s to the world, 60 s waiting to settle, the frames). Any intent with such a check
  (1893a631 has the same two) meets this until the load path is live.

## 2026-11-11 00:07–00:20 UTC · round 4: c9, and a run cancelled by another's dry run

| round | the change | before | after | kept |
|---|---|---|---|---|
| 4 | pool.js: a recipe built again goes to the free box that built it last (its worker warm), else any free box, never waiting (c9, nice; `pool.test.ts` "the box that built it") | 113 of 177 recipes built more than once a visit, each in whichever box was free | the same recipe's next build in its warm worker where that box is free (bench.ts: a warm second build is half a fresh one's, 5.8 s against 11.7 s for 24 plants) | kept (0c40886d) |
| 4 | c2 lines after it | 608 | 608 (the slot's comment and the pick folded) | |
| 4 | vitest box, render, assets/render; gate.sh site | green | green (120 s) | |

The recorded run on 6d895786 was **cancelled, not failed**, at 00:16: d3f98bcc's builder dispatched a dry run of its
own intents-pr.yml (the longer limit for a check on a real GPU) with `pr: 2256`, which shares this pull request's
concurrency group. It runs my spec on my head and records nothing; its gpu job is the reading c6 and c7 could not give.
So 0c40886d waits locally until that dry run ends, then is pushed for the recorded run.

## 2026-11-11 00:16–00:52 UTC · round 5: the first real-GPU reading, and main measured beside it

d3f98bcc's builder ran its dry run (each real-GPU check given 1,500 s, not 600) on this pull request's head 6d895786
(run 42929781719, GitHub's macOS runner: a 3-core VM, paravirtual Metal). It records nothing; what it printed:

| world | Chromium | WebKit |
|---|---|---|
| Sandbox 1 | ✓ world in **62.2 s** (205.3 s on 50bd98b5, before round 3), 95.8 % painted, the device held; forest grown at 50.9 s | **never reached the world**: killed at 1,500 s, no step printed |
| Sandbox 5 | ✓ (forest grown at 50.4 s) | ✓ world in 106.7 s, 92.3 % painted, the device held |

So on a real GPU the change shows: Sandbox 1's forest grows in 51 s where it took 72 s, and its world comes 143 s
sooner (the last step no longer waits for levels). That runner's seconds compare only with its own.

What is not known: whether WebKit fails on Sandbox 1 because of this change or on main too. No run tonight has a
WebKit Sandbox 1 result on main (every one was cut at 600 s), and the box has no WebKit. 1893a631 found WebKit holding
8.7 GB on Sandbox 1 on an 8 GB Mac, which makes the world itself a suspect on a VM of 7 GB. So main is measured the
same way: d3f98bcc's workflow dispatched with `pr: 2258` (1f6a98dd's pull request, whose site code is main's exactly)
and `intent: 7a6c3f1b` (my c6, c7 on main's code), run 42934566916, recording nothing.

0c40886d (c9) pushed at 00:49 UTC once that dry run had ended; its recorded run is going (main's intent.ts: c6 and c7
will be cut at 600 s again until d3f98bcc lands).

## 2026-11-11 01:08 UTC · round 6: at Proposal

The box's run on 0c40886d (run 42934313267, main's intent.ts with d3f98bcc's 1,500 s limit) recorded every check
green, c9 too; the intent moved to Proposal by itself (waiting: Accept and ship).

| check | result |
|---|---|
| c1 | 4 → 0 |
| c2 | 609 → 608 lines |
| c3, c4, c8, c9 | pass |
| c5 (GitHub's 4-core runner) | 103 % of alone, 42 % of one box, 95 % of its CPU |
| c6 Sandbox 1, Metal | both engines shown, the device held; WebKit's world in 143.4 s, 95.4 % painted; Chromium's last step began at 77 s |
| c7 Sandbox 5, Metal | both engines shown, the device held; WebKit's world in 150.6 s, 97 % painted |

WebKit's miss on Sandbox 1 in the earlier dry run on 6d895786 (no step printed in 1,500 s) did not repeat on this head;
main's same measurement (run 42934566916 on #2258) was cancelled once it was no longer needed. If it comes back, the
first suspect is the runner's memory (a 7 GB VM; 1893a631 measured WebKit at 8.7 GB on Sandbox 1).

Stopped at Proposal. Never merged.
