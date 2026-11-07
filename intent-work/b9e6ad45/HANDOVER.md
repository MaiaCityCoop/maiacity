# b9e6ad45: people move as recorded (handover)

Stage: **Build**; Samuel approved the spec at 17:03 UTC on 2026-11-07.

## Done

- `tools/motion/`: the one retargeter, the clips made again, a mirror of the proposed pieces and assets held to their
  hashes, and `check.ts` (c3–c10 on the CPU). Draft PR #2164.
- Proposed on play, naming the intent:
  - the clip pieces' v2: Motion: a man's gait `20edab62`, Motion: an elder's gait `2ec46fc8`, Motion: everyday actions
    `93003c82`;
  - Stand-in v14 `8ff16823` and Elder woman v5 `682d0d05`.
- The Mac render job for c11: `intent-work/b9e6ad45-render/` (README.md, run.sh).
- Person body and Person motion are unchanged. The skin check passes without them, so nothing here touches a4f8dc85's
  piece.

## What was really wrong (it corrects the spec's first diagnosis)

The spec's 14–59° and 90° hinge figures were measured against the wrong bone and axis. Measured right, v1's faults are:
- **Its line-up came from the capture's zero pose.** That isn't a pose: ACCAD's leans its back 54° and lays its hips
  across z.
- **Its limbs were lined up by direction alone.** So the Stand-in's upper arms were rolled half a turn (elbows bent
  172–180° the wrong way round against them).
- **Trunk and head:** his head was turned 32° and his hips' forward tipped 24° up.
- **The Elder** stooped 30°, her knees passed 9 cm apart and a foot crossed 4 cm.

The new retargeter lines up from the performer standing, each hinge by the axis it bends about in the take.

## Open: three bounds that the captures themselves fail

- **c3 (≤ 3°):** two loop seams, 3.38° (the Stand-in's run, ACCAD Male2_C3) and 3.22° (the Elder's walk, ACCAD
  Female1_B14). A loop's seam is at best half the gap between the stride's two ends; these takes hold one or two
  strides. Every other bone of every clip is within 2.7°.
- **c4 (≤ 10°):** knees pass (0.0°). Elbows bend 19.6–24.6° off one fixed axis and fingers 42°. That is the recorded
  joints' own spread about their mean axis (the line-up uses that mean); forcing a strict hinge would move the forearm
  about 8° off its recorded direction and fail c3.
- **c7 (≤ 1 cm past the line):** the Stand-in's run lands a foot 1.6–1.8 cm past the line under his hips. Every window
  of ACCAD's run does this (≥ 1 cm): runners land near the line. The Elder and all walks pass.

## After the Mac render (run 1, c39255d61 on `intent-work/b9e6ad45-render`)

- **Claw hands:** Quaternius' walks and idles hold fists (77° a finger joint). The hands at rest now take its sitting
  idle's relaxed, slightly open hand (5–10°), and so does the wave.
- **The Elder's half squat:** Person motion v2. A leg now reaches 99.7% of its length, not 97.5% (which bent every
  standing knee 26°). Her idle's legs are eased 90% straight and her feet laid flat: her knees are at 11°, her pelvis over
  her feet.
- **Catwalk feet:** c7 was right; the page plays the recordings' own narrow step (the Female1 walker sets her feet almost
  on one line). Person motion v2 takes `width`: the Elder steps 3 cm wider each side, the Stand-in 1.5 cm. c7 is now
  measured as the box plays the clips and as the page plays them back.
- **The job:** the recorded skeleton is no longer drawn half a body low (settle no longer takes the hips' height off its
  joints). render.mjs reads a file before answering 200, takes Playwright from play/site and launches `channel:
  'chromium'`; run.sh runs bun.
- **On play:** the clip pieces' v2 (man 1462, elder 1477, actions 1478), Person motion v2 (1474), Stand-in v14 (1475)
  and Elder woman v5 (1476).
- **Next:** the Mac's run 2, then mark PR #2164 ready.
