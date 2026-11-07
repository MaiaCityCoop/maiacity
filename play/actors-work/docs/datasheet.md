# Data sheet · People who move like people (Stand-in v12, Elder woman v3)

Maia City's intent 99b612ec-afa2-4dad-820b-cd2e0aff6bf5. Every person on play stands on one body made of shared pieces
(play/SPEC.md §4.5), and moves only by motion capture or by keyed animation released openly, never by hand-drawn sine
curves. This sheet lists every source with its licence, quoted as it reads, what was taken from it and how it was
changed. Each source is an Artifact on play (its UUID given), read on 2026-11-07.

## The skeleton

| What | Source | Licence | Artifact |
|---|---|---|---|
| Bone names and hierarchy: 52 of the standard's 55 humanoid bones (all but `leftEye`, `rightEye`, `jaw`) | VRM 1.0 `VRMC_vrm.humanoid`, VRM Consortium | The specification's repository has no licence file (checked 2026-11-07). VRM is an open standard published for anyone to implement; UniVRM, its reference implementation, is MIT. We use only the standard's bone names and parent-child relationships, facts of the standard, and copy none of its text or code. | 8ff23e6f-49b1-48be-b28e-28fc3d95119d |
| The head: MakeHuman's base head and neck (a man's or a woman's) and its expression units | MakeHuman (as the Stand-in's head has been since v6) | CC0 | (unchanged from Stand-in v6–v11) |

Where each bone sits (a person of 1.80 m to the crown, metres) is ours: the v11 Stand-in's 17 joints kept where they
were, the spine's `chest` and `upperChest` set between them, the clavicles at the sternum's ends, the fingers' joints
measured on the v11 hand (palm 9 cm, fingers 7–8.5 cm, the thumb from the wrist's side), and the toes at the ball of
the foot (13.5 cm ahead of the ankle).

## The motion

Only CC0, CC BY or public domain. Credit for the CC BY sources is also on both assets' cards (in their notes and their
sources' headers).

| Clip | Taken from | Licence, quoted | Artifact |
|---|---|---|---|
| Stand-in: walk | ACCAD Open Motion Project, `Male2_B3_Walk.bvh`, one cycle 1.62–2.62 s (1.64 m/s captured) | "Open Motion Project by ACCAD/The Ohio State University is licensed under a Creative Commons Attribution 3.0 Unported License." | 71df3fea-6eca-4938-a566-6d8d72f34532 |
| Stand-in: run | ACCAD, `Male2_C3_Run.bvh`, one cycle 0.05–0.85 s (3.6 m/s) | CC BY 3.0, as above | 71df3fea-… |
| Stand-in: start, stop | ACCAD, `Male2_B1_StandToWalk.bvh` 0.4–2.4 s, `Male2_B2_WalkToStand.bvh` 0.6–3.2 s | CC BY 3.0 | 71df3fea-… |
| Stand-in: idle | 100STYLE, `Neutral/Neutral_ID.bvh`, 9–17 s (after the take's T-pose calibration) | Zenodo record 8127870: "Creative Commons Attribution 4.0 International. The Creative Commons Attribution license allows re-distribution and re-use of a licensed work on the condition that the creator is appropriately credited." | 57f8c217-545b-4afd-8cb0-e5866771668c |
| Elder woman: walk | ACCAD, `Female1_B03_Walk1.bvh`, one cycle 0.40–1.83 s, with half of 100STYLE's Old stoop laid over her back (the mean turn of spine, chest, upper chest, neck and head over `Old/Old_ID.bvh` 10–18 s) | CC BY 3.0; CC BY 4.0 | 71df3fea-…; 57f8c217-… |
| Elder woman: start, stop | ACCAD, `Female1_B01_StandToWalk.bvh` 0.6–2.8 s, `Female1_B02_WalkToStand.bvh` 0.8–3.4 s, with half the Old stoop | CC BY 3.0; CC BY 4.0 | 71df3fea-…; 57f8c217-… |
| Elder woman: idle | 100STYLE, `Old/Old_ID.bvh`, 10–18 s, her back eased half way upright | CC BY 4.0 | 57f8c217-… |
| Elder woman: run (a hurried shuffle) | 100STYLE, `Old/Old_FR.bvh`, one cycle 14.48–15.25 s, her back eased half way upright | CC BY 4.0 | 57f8c217-… |
| Everyone: sit down, sitting, stand up | Quaternius, Universal Animation Library (Standard), `Sitting_Enter`, `Sitting_Idle_Loop`, `Sitting_Exit` | "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication" (the download's License.txt; the page: "Free to use in personal, educational and commercial projects. (CC0 License)") | e3defae6-324d-43c9-8f8b-d66b49b5aecf |
| Everyone: the fingers at rest (under every captured clip, none of which has fingers) | Quaternius UAL, `Idle_Loop`, its first frame | CC0 | e3defae6-… |
| Everyone: wave (a hand raised in greeting) | ACCAD, `Female1_D1_Urban.bvh`, 0.7–2.7 s | CC BY 3.0 | 71df3fea-… |
| Everyone: pick up | ACCAD, `Male2_A5_PickUpBox.bvh`, 1.2–4.8 s | CC BY 3.0 | 71df3fea-… |
| Everyone: turn left, turn right (a quarter turn on the spot) | the idle's own capture (above), the hips turned round and each foot stepped round by the IK; no capture of turning on the spot under these licences was found | as the idle's | — |

**Left out:** Carnegie Mellon's motion capture database (ca0033b0-89fe-436a-8725-0cf1f91694eb): its terms are its own,
not CC0, CC BY or public domain: "This data is free for use in research projects. You may include this data in
commercially-sold products, but you may not resell this data directly, even in converted form." LAFAN1 and Bandai
Namco's sets (CC BY-NC-ND), SFU's database ("cannot be used for commercial products or resale") and Mixamo were never
candidates.

**Credits (CC BY):** ACCAD, The Ohio State University, Open Motion Project, CC BY 3.0 (accad.osu.edu). Ian Mason,
Sebastian Starke, Taku Komura, *100STYLE*, CC BY 4.0, doi:10.1145/3522618 (zenodo.org/records/8127870). CC0:
Quaternius, Universal Animation Library; MakeHuman. Changes: retargeted onto the VRM humanoid skeleton, cut, looped,
the feet re-placed by IK on our own strides, the Old style's back eased or laid over another clip as stated above.

## Pace and stride

| Number | Value | Source |
|---|---|---|
| Stand-in's walking speed (its `walk` gear) | 1.4 m/s | Bohannon & Andrews 2011: men 40–49, 143.4 cm/s (d791aec7-2476-4c30-824a-19e95a2c46fc) |
| Stand-in's stride (two steps) walking, running | 1.5 m, 2.3 m at 1.80 m tall (scaled with height) | ours: a step of 0.75 m at 1.4 m/s is a cadence of 112 steps a minute; 2.3 m at 3 m/s, 157 steps a minute |
| Elder woman's walking speed | 0.95 m/s | Bohannon & Andrews 2011: women 80–99, 94.3 cm/s |
| Elder woman's stride | 1.1 m at 1.80 m (1.00 m at her 1.64 m) | ours: shorter steps at much the same cadence (about 110 a minute), the pattern of an older walk |
| Elder woman's hurry (her `run` gear) | 1.5 m/s, stride 1.3 m | ours |
| Walking to running | `walk` to about 2 m/s, `run` from there; each blends with the idle below 0.6 m/s | ours |

## How it is built (the pieces)

- **Person skeleton** (`piece`): the VRM bone set and where each bone sits.
- **Person head** (`piece`): the v11 Stand-in's MakeHuman head, word for word.
- **Gait and reach** (`piece`): the animals' `$lib/actors/motion.ts`, word for word: `reach()`, the one two-bone IK.
- **Person body** (`piece`): the rig (v11's), the clothes and the 52-bone skin.
- **Person motion** (`piece`): how clips are played: blended by speed, by distance, the feet planted by `reach()`.
- **Motion: a man's gait**, **Motion: an elder's gait**, **Motion: everyday actions** (`piece`s): the clips as data,
  quantised quaternions at 30 frames a second (an idle at 15), made by the retargeter on the branch
  `intent/99b612ec-people-move` (`play/actors-work/convert.mjs`).
