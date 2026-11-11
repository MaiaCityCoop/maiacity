# Intent 1893a631: the build's rounds (avenBOX; `play/site/scripts/memory.ts`, the page told 8 cores unless said)

| round | change | Sandbox | peak MB | rest MB | world s | kept? |
|---|---|---|---|---|---|---|
| main eadbf2f7 | — | 1 (told 4) | 7,060 | 5,741 | 132 | |
| main eadbf2f7 | — | 5 | 8,614 | 5,220 | 127 | |
| main eadbf2f7 | — | 3 | 992 | 517 | 10 | |
| 1 | one level maker a page (`lowerer()`), a job's arrays handed over, a worker ended when none waits or after a heavy shape (150,000 triangles), one heavy shape at a time | 5 | 3,978 | 2,094 | 183 | kept. The world shows 56 s later in the box (4 real cores told 8): the heavy trees near the start are now made lighter one after another, and the cover waits up to two minutes for them |
| 2 | a kind's full build let go 15 s after no copy is drawn at it, once its lighter levels stand, its picture is taken and the cache keeps it (`render/hold.js`); every device lets go of an array once the card has it (`budget().release` gone) | 1 | 4,878 | 1,985 | 172 | kept. Rest 5,741 → 1,985. The peak (207 s, "Welcome") is the inside dome's renderer building its plants while the outside's heavy trees are still being made lighter |
| 3 | the shapes made lighter at once hold at most 150,000 triangles between them (a heavy one alone) | 1 | 4,305 | 1,796 | 174 | kept, then widened in round 4: too strict for the world's time |
| 3 | the same | 5 | 4,123 | 1,207 | 179 | |
| 3 | the same | 3 | 1,125 | 524 | 8 | holds (bound 1,200 / 700) |
| 4 | at once at most 1.7 million triangles (what the heaviest tree holds alone): middling trees side by side, two great ones never; the pool's boxes keep no spare worker (seven engines held for a 29 ms start) | 1 | 4,872 | 2,106 | 190 | spare workers kept out; the 1.7 million thrown away in round 5. The peak moved to 45 s: seven boxes building great trees at once (1,148 MB of their workers' heaps), two trees made lighter (534 MB), the page's arrived builds (914 MB). The probe again: 4,771 MB |
| 4 | the same | 5 | 3,904 | 1,120 | 210 | |
| 4 | the same | 3 | 1,054 | 427 | 11 | |
| 5 | at once at most 400,000 triangles: a few middling trees, never two great ones | 1 | 4,619 | 2,169 | 186 | kept. What is left of the peak at 46 s is the pool's builds in flight, seven trees at full detail at once: intent 7a6c3f1b's files (`box/pool.js`), and gone with the six trees' own levels (play's work) |
| 5 | the same | 5 | 3,702 | 1,072 | 201 | |
| 5 | the same | 3 | 1,080 | 435 | 11 | |
| — | `bash play/avenbox/gate.sh site` on round 5 | | | | | green: the build, and its tests (38 pass, 0 fail) |
| — | the dry run of intents-pr.yml (round 4's head) | | | | | the box job's memory checks failed at once: GitHub's run job has no site build and no Playwright browser. `memory.ts` now builds the site where there is none and installs Playwright's Chromium where it is missing (the `run`s stay as approved); tried with no build in a fresh worktree: built, then Sandbox 3 at 1,050 / 436 MB. The GPU job was cancelled by the next push (one concurrency group), so dispatched again |

**The world shows later in the box than on main** (Sandbox 1 172 to 190 s against 132 s, Sandbox 5 179 to 210 s against 127 s): the cover waits up to two minutes for the plants near the start to settle (`village.ts`), and fewer shapes are made lighter at once. The box has 4 real cores told 8; a Mac has 8. Intent 405f7a85 changes that wait (the world shown once the kinds near its start stand). Not bounded by this intent's checks; Samuel's to weigh at Proposal.

**The graphics card's render targets** (holder 4): the four sizes alive are exactly the world stage's steps down in resolution (`render/world.js` `adapt`: 1.25, 1.15, 1.05, 1.0 of the CSS pixels, 1800 to 1440 px wide). three r187 destroys a resized target's textures (`RenderTarget.setSize` disposes them, the backend destroys the GPU texture), so what stays is still to be named: the probe now lists the live textures by size and label (`mem.ts`, `liveTextures`).

## Before ready (head 4c30f9cd)

- `bun play/avenbox/intent.ts 1893a631-…` here: c1 to c8 pass (Sandbox 1 431 s to measure, Sandbox 5 299 s, Sandbox 3 136 s); c9 and c10 fail here as they must (no GPU in the box); c11 (nice) 4,499 / 2,129 MB against its 2,500 / 1,500: it needs the six trees' own levels.
- The dry run of intents-pr.yml on this head (run 42935262585): the box job measured the worlds this time (19 minutes, the build and the browser provided by `memory.ts`). The GPU job, GitHub's macOS runner on Metal: **Chromium showed both worlds and held the device** (Sandbox 1 at 274 s, 61.8 ms a frame; Sandbox 5 at 247 s, 37.3 ms a frame, settled 49 s later), and then **each check was stopped at 600 s while WebKit was loading** (exit 124): `intent.ts` gives a check 600 s, and `gpu.ts` measures Chromium and WebKit one after the other.
- **c9 and c10 cannot pass on that runner as written, on main either**: play/SPEC.md §4.12 has main's WebKit at 396 s for Sandbox 5 alone there. My spec's mistake: I could not run them in the box (no GPU) and did not know the 600 s. Their `run`s stay as approved (a changed run is Samuel's); they stay red with this reason. They turn green when a world comes up in well under 300 s a browser on that runner (the load path, intent 405f7a85: Sandbox 1 at 42 s in the box against main's 224 s), or with a longer limit for the GPU checks on main (`intents-pr.yml`'s gpu job, `intent.ts --timeout`).

**Correction (01:20 UTC):** intent d3f98bcc went live at 00:30 (main 0b03c3d): a check whose run is `gpu.ts` now gets 1,500 s and the GPU job 90 minutes, so c9 and c10 are measured in full on the ready run. The 600 s above was main's limit before it; nothing in this pull request goes round it.

| round | change | Sandbox | peak MB | rest MB | world s | kept? |
|---|---|---|---|---|---|---|
| 6 | the picture first (Samuel: realism is a hard limit): a kind's full build is kept while any copy was drawn at the level next to it within 15 s, and a copy drawn at that level asks for it back at once (`hold.js` `ahead`), so it is read from the cache while you are a band away and never stands in lighter as you walk up | 1 | 4,474 | 2,414 | 181 | kept: the picture is a hard limit. It costs about 250 MB at rest in Sandbox 1 (2,169 → 2,414): the full trees within a band of the start stay |
| 6 | the same | 5 | 3,856 | 1,303 | 195 | |

Round 6 against the absolute aim (2,500 / 1,500 MB): Sandbox 1 1,974 MB over at its peak and 914 MB over at rest; Sandbox 5 1,356 MB over at its peak and 197 MB under at rest.

**Against the absolute aim** (c11: a world never more than 2,500 MB, at rest 1,500 MB, on an 8 GB Mac), round 5: Sandbox 1 2,119 MB over at its peak and 669 MB over at rest; Sandbox 5 1,202 MB over and 428 MB under at rest; Sandbox 3 holds (1,080 / 435). What is left at the peak is the asset boxes building seven full-detail trees at once (about 1.1 GB of their heaps at 45 s) and the full builds waiting for their lighter levels: both go with the six trees' own levels (play's work).

## The recorded run on 15b31c29 (run 42938950733, 01:54 UTC)

Every must passed but c2. c9 and c10 passed on Metal in both engines:
- Sandbox 1 in WebKit: shown at 305 s, 234 ms a frame.
- Sandbox 5 in WebKit: shown at 314 s, 48 ms a frame.
- The device was never lost.

The memory checks on GitHub's runner:

| | peak MB | at rest MB | over the absolute aim (2,500 / 1,500) |
|---|---|---|---|
| Sandbox 1 | 4,265 | 2,366 | 1,765 at the peak, 866 at rest |
| Sandbox 5 | 3,738 | 1,326 | 1,238 at the peak, under at rest |
| Sandbox 3 | 1,110 | 453 | within both |

**c2 is main's `vs-main.ts`, not this pull request.**
- The head counts 0 and main 3, but the comparison found no main value.
- `words()` drops a backslash inside double quotes before any character. Bash keeps it, except before `$`, a backtick, `"`, `\` and a newline.
- So main's measure was keyed `budget().release` and the head's `budget\(\)\.release`. Reproduced in avenBOX.
- The recorded run always takes `vs-main.ts` from main, and c2's `run` is Samuel's.
- The fix is a small intent on main: `words()` keeps a backslash where bash does. Then re-run #2253's recorded run.
- Said in a comment on #2253. My message to the Orchestrator was refused: its session needs a trusted device.

**06:13 UTC: stepped back to Specify by Samuel.** c2 re-specified as the same count with a fixed string, `grep -rhoF 'budget().release' …` (no backslash for `vs-main.ts` to drop); every other check as approved. Tried here: main 3 → head 0, within the bound; `words()` now reads the command as bash runs it. No code changes. Waiting for his approval, then the head's recorded run (run 42938950733) is run again on 15b31c29.
