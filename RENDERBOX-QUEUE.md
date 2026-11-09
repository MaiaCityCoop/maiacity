# Mac render box: queue and handover (2026-11-09 09:13 Berlin; main d5346b7ce)

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
