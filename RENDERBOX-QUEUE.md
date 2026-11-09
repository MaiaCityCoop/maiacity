# Mac render box: queue and handover (2026-11-09 09:13 Berlin; main d5346b7ce)

## 11:02 Berlin
- **#6 run 2 recorded: c7 FAIL** (on b5d2fbf69 vs main 54c17d998). Same t twice identical (pass), film 20 s (pass), near
  +0.8 ms and far 0 (pass), but **mid 31.9 → 34.2 ms (+2.3 against +0.5; p95 49.9; gpu-bound +2.3 ms GPU)**, as run 1
  (+2.0); and in the 8° backlit still the foreground leaves come out darker (deep green), not glowing (golden SSIM 0.78).
  #6's PR head is e5ac544be now; its next job runs when pushed.
- **660ad67f run 2 is running** (render fe23c07f0, started 10:58).

## 11:00 Berlin
- **#13 run 2 recorded: c6 FAIL again** (on ff3cc57a1; out/ 1942b4871). SSIM base vs head is the same as run 1 to the third
  decimal (0.967/0.983/0.997/0.962/0.995/0.973): "gather instead of cut off" changes nothing visible in these views. Still
  sprigs spread evenly at walking height, no edge band, no litter at trunks in shot. Its builder should say which cards and
  kinds the masks change and aim the shots there (a food-forest trunk close up), or strengthen the drifts.
- **#6 run 2 is running** (head b5d2fbf69 against main 54c17d998, started 10:49).

## 10:55 Berlin — 660ad67f c6 recorded: FAIL, but close (evidence on the intent; out/ 46306577f)
- **Passes:** Sandbox 5 draws again in Chromium and WebKit (plants, path), no uniform3fv error, no plant fails to load,
  Sandbox 1's film advances 0…5 s in both.
- **Fails:** 14 "uniform buffer that is too small" GL errors per engine in Sandbox 5 (glDrawElementsInstanced). They come
  from the guard's mismatch frame (uniformsGroups = [] leaves the program's block on another material's smaller buffer,
  GL drops the draw): 14 clashes shapeOf still misses. Fix: key what still differs (compare the full program cacheKey
  against the built source to find it), or skip the draw on the mismatch frame instead of drawing with no groups.
- **The spec's program bound can't be met as written:** "≤ bd087014's count + 10 %" — that count (1) came from the blank
  world. WebKit linked 35 while walking (Chromium 42); main before bd087014 linked 88 in 8 frames. Restate it (needs
  Samuel's approval of the spec change).
- Its next job goes first in the loop again, the moment it's pushed.
- Now running: #13 run 2 (since 10:43).

## 10:50 Berlin
- **#8 recorded on a6f20d941: c7 FAIL, c8 FAIL** (evidence on the intent; out/ d1eee495a). c7: parity never ran (the
  `import.meta` in live-runtime.js). c8: the job's SSIM step gave NaN; with ffmpeg on its PNGs every view is ≥ 0.989
  except **s1-far 0.870** (a large broadleaf tree in the far band drawn as ragged grey-brown cut-outs on head, conifers and
  sky there on base) and s3-open 0.856 (by eye identical: wind and idle timing). Far's frame 16.8 → 17.7 ms (+5.4 %, bound
  cpu). For #8's new builder: fix the bundle, look at the far forest (or show it is timing), and fix the job's SSIM.
- **660ad67f's job is running** (started 10:39 on render ceb22e982).

## 10:40 Berlin
Loop (chain13): #8 ends (its last head views now) → **660ad67f** (render ceb22e982, its PR head e716813cf with the
source-compare fix) → #13 run 2 → #6 run 2 → #8's c7 re-run when relayed → 0b4c007b's calibration → 544485e2's. I record
#8's c8 from this run as it ends.

## 10:20 Berlin
- The loop now checks for 660ad67f's job before each next job and runs it first once its run.sh no longer uses
  `vite preview` (chain12; generic runner: fetch intent-work/660ad67f-render, `bash …/run.sh`, push out/).
- **#8 c7 failed on head a6f20d941**: story-parity's hyperframes capture threw in the composition script ("Cannot use
  'import.meta' outside a module", "playLive is not defined" at hyperframes-composition://body:11) in both runs, so no
  parity numbers. c8's views are still being shot; I record c7/c8 when the job ends.

## 10:00 Berlin: on "5 minutes, not 25"
1. **Production build + preview: tried on 2026-11-08, it broke Sandbox 1** (its asset box never builds under `vite preview`),
   so the loop stays on the dev server. A build that works for the box would need its own fix first.
2–5. **Base once, one page load, short films, one browser:** these live in each job's own `run.sh` and scripts, which their
   builders write; the loop runs each job exactly as pushed, so the builders should change them: run head only against a
   shared baseline in `intent-work/main-baseline/out/d5346b7/`, place the walker between views in one page with one
   settle capped at 60 s, films of 5 s unless a check names a length. I'll make that baseline (near/mid/far, Sandbox 3,
   the meter, stills) as soon as the queue gives me a slot, and run any job rewritten that way.
- The loop itself already runs back to back with no wait between jobs.

## 09:58 Berlin (08:58 UTC): the loop
#8 (a6f20d941, started 09:47, at its c8 views now) → #13 run 2 (24454c2d-render@b852dd8b4, head bf417ab) → #6 run 2
(6fd5e63f-render@0cf50a18a, head a095a3b) → 0b4c007b's sky-light calibration → 544485e2's viewer calibration, all in
one nohup loop (chain11). 660ad67f's job goes first as soon as it is pushed (tell me its branch@commit here or by relay).

## 09:55 Berlin (08:55 UTC)
- **#13 c6 recorded: FAIL** (on 78f941f8, evidence on the intent). Base vs head SSIM 0.96–0.997: the masks change little on
  screen. Paths are clear, but at walking height the small cover is still single sprigs spread evenly over bare soil
  (confetti, not colonies), no edge band along the forest, no litter at trunks visible. Its out/ is 05daab46c. A new job
  with stronger drifts, an edge band, litter rings and a shot close to a food-forest trunk would show it.
- **#8's job is running** (step 0 at 09:47 on a6f20d941; ETA ~10:20), then I record c7/c8.
- **660ad67f, for its cloud builder:** I pushed the film fix as the first commit of `intent/660ad67f-regressions`
  (6519afb36, one line in village.ts). On Sandbox 5, my clash logger compared only the handler's custom key: the clashes it
  showed (side 2 vs 0, clearcoat 0.3 vs 0) are already split by three's own parameter key (doubleSided, the clearcoat bit),
  so they are false positives, and the clash behind "uniform3fv … @@iterator" is not pinned yet. A fix that holds
  whatever the cause: when a kit material first meets a program (the handler's onUpdateProgram), compare its builder's
  vertex+fragment source with the source the program was compiled from; on a mismatch give the material a key of its own
  (its id) and needsUpdate, and upload nothing into the other's layout that frame. Sharing stays where the code is equal.
  Check in a real browser: Sandbox 5 inside the dome draws (not the page's dark green), no "did not load" warnings.

## 09:46 Berlin (08:46 UTC): confirmed
#13's job is running (started 09:40:33, now at head's walk shots); #8's job follows it automatically in the same nohup
loop; I record c6, then c7/c8, the moment each out/ lands. Nothing blocks. I'm doing nothing else on the GPU until then.

## Now (09:45 Berlin, 08:45 UTC)
**#13's job is running** (24454c2d-render, started 09:40:33; ETA ~10:05), then #8's (dbcbd89b, ETA ~10:35), back to back, each
out/ pushed as it ends; I record c6 / c7 / c8 as they land. Nothing blocks the runner. The 09:00–09:40 slot went to 0b4c007b's
checks, the viewer calibration (544485e2), #6's job (crashed on main's film bug, below) and the Sandbox 5 diagnosis.
Fix-forward intent for both production regressions: **660ad67f-c23b-4c88-bd11-11c6e6594eb7** (Idea; I specify it now; it
needs Samuel's spec approval, then its PR intent/660ad67f-s5-films).

## To the Orchestrator (09:40) — two production regressions on main
1. **Sandbox 5 draws nothing on main** (Chromium and Safari's engine; d5346b7ce and 9f1442dfe): plants inside the dome
   throw "Lemon/Strawberry/Basil/Nasturtium did not load: uniform3fv … callable @@iterator" and the frame dies. Cause: my
   Safari fix bd087014 (37bd0d1bb) shares a program by shape; two kit materials that build different shaders share one,
   and one uploads its uniforms into the other's layout. Its evidence (17.9 ms walk) walked a blank world: my error.
   I'm diagnosing which property splits them (09:42), then a fix-forward intent (spec for Samuel's approval) and its PR.
2. **Sandbox 1's film step throws on main**: sandbox-2/interior/village.ts:1600 reads `sky.sun.target.position`, but the
   one sky's sun is three's SunLight (no target) since 2214e661. That is #6's crash, not #6's code. The fix is one line:
   `glassSheen.uGlassSun.value.copy(sky.sun.position).normalize()` (SunLight shines from its position toward the origin).
   If #6's builder fixes it in #2180, please use exactly that line, so my fix intent merges cleanly with it.
- Queue now: 0b4c007b probe (ends ~09:42) → Sandbox 5 diagnosis (3 min) → #13 → #8 → #6 when its new job is in.

## To the Orchestrator (09:16)
I can't send_message any more (this session's remote-session tools are gone), so I answer here.
- The runner is `chain5.sh`, started 09:00, serial, each out/ pushed as it ends (see below). #6's c7 ETA ~09:50.
- 544485e2: its code and its CPU test are pushed (PR #2194 @ 1b4192914: install() makes every node material linear in a
  target; nodes.test.ts checks it). What's left is the viewers' calibration in stage.js, which is look work only the GPU
  shows, so please don't start a cloud builder for it: I'll push it and mark the PR ready myself.
- 0b4c007b: no code left to write unless the probe finds a cause for head's Sandbox 1 never settling; I'll say so here.

## The runner
One serial chain, no agent in between: `chain6.sh` (scratchpad below; chain5 before it), started 09:00, nohup'd, log `logs/chain5.log`,
milestones in `renderbox.log`. Order: recB (0b4c007b's checks, running) → recB3 (0b4c007b: machine viewer, Sandbox 5,
a Sandbox 1 busy probe) → viewlook (544485e2's viewer look vs pre-programme 06fc8c947) → run6 (#6, pushes out/ to
intent-work/6fd5e63f-render) → run13 (#13 c6, pushes to intent-work/24454c2d-render) → run8 (#8 step 0 + job, pushes to
intent-work/602a8849-render). Each job fetches its render branch and the PR head when it starts and pushes out/ as it ends.
Scratchpad: /private/tmp/claude-501/-Users-samuelandert-Documents-Development-maiaCITY/49f6bdcc-aac2-4801-b604-2e57dc732015/scratchpad
(record.py <uuid> <check> pass|fail <40-hex head> <evidence file>; mcp.py <tool> '<json>'; both send PLAY_MCP_TOKEN to play only).

## Intents
| # | intent | PR | head | missing | state |
|---|---|---|---|---|---|
| 1 | #6 6fd5e63f | #2180 | 8bab28a80 | c7 | builder fixed wind.mjs (SunLight) in 2adeda78d/1a7d6f14c; run6 ETA ~09:50 |
| 2 | 0b4c007b | #2189 | f82d4dae1 (= 70b717810 + main d5346b7ce, no rendered file) | c3 c4 c5 | see below |
| 3 | #13 24454c2d | #2193 | 78f941f8c | c6 (c7 by its builder) | run13 after #6 |
| 4 | 544485e2 | #2194 draft | 1b4192914 | c3 c4 (after its box run) | viewlook, then calibrate stage.js, mark ready |
| 5 | #8 602a8849 | #2182 | a6f20d941 | c7 c8 | run8 last in the chain (reads the PR head itself) |
| 6 | #7 090168c8 | #2183 | 4734e9f95 | after #6 accepted | not started |

## 0b4c007b so far (measured on 70b717810 vs main 9f1442dfe)
- c4 (viewers no warmer than main): grass R/B 1.085 vs main 1.122, goat 1.081 vs 1.131, biome page 1.063 vs 1.096. Pass; machine shot in recB3.
- c3 (worlds within 10 % of pre 06fc8c947): Sandbox 1 near .911 vs .909, neutral by eye. Sandbox 5 shot came out blank (world not up in 250 s): re-shot in recB3.
- c5: head near 25.2 ms vs main 26.2 (mid/far pending; WebKit walk after). BUT head's Sandbox 1 never settles
  ("still building after 619 s"; main settled in 56 s). recB3's probe logs which counter stays busy. Not recorded until understood.

## 544485e2 plan
The pre-programme viewer had its own pale sky (assets/sky.js, zenith #5a8ccc … low #dde7ee), NeutralToneMapping, environment
from that sky at 1.35, hemisphere fill 0.5, rim 1.8. The one sky with the sun pinned at 14° is physically a low, warm sun, hence
the sepia haze. Calibrate stage.js: Neutral (PICTURE) instead of AgX, sun higher (~35–40°, still behind), environment and fill
up, bloom threshold above the sky; judge against pre (grass, goat, machine).

## Rules
Accept/merge/archive are Samuel's. No fal. No face images in git. WebGL only on this Mac, one job at a time. Guard every cd.
This session lost its remote-session tools, so it can't send_message to the Orchestrator; it reads this file's copy on
intent-work/main-baseline-render (RENDERBOX-QUEUE.md).
