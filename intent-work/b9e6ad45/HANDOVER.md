# b9e6ad45: people move as recorded (handover)

Stage: **Specify**, waiting for Samuel to approve the spec (2026-11-07). Nothing is built yet.

## The diagnosis (CPU, forward kinematics)

These scripts run from `play/actors-work` on the branch `intent/99b612ec-people-move`: copy them there. They need
`/tmp/claude-0/data` laid out as follows:
- ACCAD: `Female1_bvh.zip` and `Male2_bvh.zip` from accad.osu.edu, unzipped into `accad/`.
- 100STYLE: the `.bvh` files range-read from zenodo record 8127870 with that branch's `rangezip.py`, into `style/`.

What each script measured:

- `dircheck.mjs`: `retarget()` against the source's FK, bone by bone. Every direction is within 0.0°; the head is 5.7°, a constant.
- `clipcheck.mjs`: the published clip data through the target's FK. The posture is right (Stand-in idle 2°; the wave's hand
  32 cm above the shoulder).
- `rtcheck.mjs`: the clips as the asset plays them (`cast.clips[name](t, m)`). Same numbers.
- `pagecheck.mjs`: the box's tables (`box/clips.js` motionOf) played back by the page (`clips.js` playerOf). Within 4 cm.
- `skincheck.mjs`: the box's skin, dual quaternions on the CPU as the shader does. It follows its bones.
- `pagepath.ts` (bun --preload ./pagepath-lib.ts): the box's scene `serialize` → `rebuild`, then the TRS put on it as
  hero.js follow() does, then skinned. Identical to the box's skin (0.00 cm).
- `twist.mjs`: **the fault**. A knee or elbow bends 14–59° off its bone's own across axis, and a mid-finger joint 90° off.
  The retarget lines limbs, feet, head and fingers up by direction only (`setFromUnitVectors`), so their roll is arbitrary.

## The fix (Build, once the spec is approved)

- Line every bone up by a full frame at rest: its direction, plus the body's forward (or up, for the feet).
- This is one path for every source, with no `@pos` path.
- Retarget all clips again. The Elder takes 100STYLE Old captures, her idle eased toward upright (3–10°).
- Put the tool and the checks in `tools/motion/` (see the spec's checks c1–c10).
- Propose the new clip pieces and Stand-in v14 and Elder woman v5.
- A Mac render job goes in `intent-work/b9e6ad45-render/`.
- Person body changes only if c9 (skin) still fails. If it does, sequence with a4f8dc85.

The viewer: `hero.js` advances `state.t` even while the box is not yet running. A once-clip (wave) can therefore be over
before the box first answers, and it then holds its last frame, arm down. This is not in this intent's scope; noted.
