# b9e6ad45 c11 on Mac Metal, 2026-11-07

Head 27d1ba41b. GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M1). The whole job took 59 s. Outputs: both films, a
sheet per person and clip, the Elder beside Pyrkon, and the log.

**Pushed here, not on the intent branch.** The README says to push `out/` on `intent/b9e6ad45-motion`. I pushed it to
`intent-work/b9e6ad45-render`, because the render box pushes only to `*-render` branches (a push to the intent's pull
request would change its head and rerun its checks). The builder can bring it over.

## Patches, in my worktree only (`mac-patch.diff`)

1. `run.sh`: `node` → `bun`, since this Mac has no node.
2. `render.mjs`: it looked for Playwright on the global path first, which here was bun's auto-installed 1.65 with no
   browser. It now prefers play/site's, and launches `channel: 'chromium'`; the flags are unchanged.
3. **A bug to fix on the branch**, `render.mjs:21`: the file server calls `writeHead(200)` before `readFile`, so any
   missing file (here the page's `/favicon.ico`) throws `ERR_HTTP_HEADERS_SENT` in the catch and kills the run. It now
   reads first, then writes 200 or 404.

## A framing fault in the job itself

The blue recorded skeleton is drawn about half a body too low in every panel. Its feet run off the bottom of the
panel, and only the torso and arms show above the ground line. So the legs can't be compared with the recording from
these panels: what follows judges the people's legs on their own, and against the recording only where it shows.

## Plainly, per clip

| clip | Stand-in v14 | Elder woman v5 |
|---|---|---|
| **idle** | Front: right; feet apart, arms down. Side: a slight knee bend and forward lean; the hips are not pushed back. Hands: loose fists, small and curled: mildly claw-like. | **Hips pushed back:** in side view she stands with her knees well bent and her pelvis behind her feet, like a half squat. The stoop is meant, but this is more than an 8° stoop. **Claw hands:** in front she holds both hands curled in front of her pelvis, fingers hooked. |
| **walk** | **Legs cross:** in front view the feet land on one line and pass across each other, like a catwalk. Side: a normal stride. Hands: curled fists. | **Legs cross:** the same in front, knees close and ankles crossing. Side: short steps with bent knees; acceptable for an elder. Hands: curled fists. |
| **run** | **Legs cross:** front, the swinging foot crosses behind the standing one. Side: a good running stride and arm swing. | A hurried, stooped shuffle, as the README says. Front: knees slightly in, feet close, hands hooked at the hips (claw-like). Side: matches its stoop. |
| **sit down** | Right: bends at hips and knees, hands to thighs, sits upright, much like the recording's arms and torso. Knees stay apart; nothing crosses. | Right, the same as the Stand-in. |
| **wave** | **Hand above the shoulder: yes**, at 0.5 s the hand is above the head. But it is a **closed fist**, and the forearm is drawn across the face in front view. At 1.1 s the arm swings out low to the side with the torso tilted, which the recording's arm does too. | The same: the hand is above the shoulder, as a fist, with the forearm across the face. |

## In short

- **Sit down:** right for both.
- **Wave:** the height is right (hand above the shoulder) for both, but the hand is a fist, not an open wave.
- **Walk and run:** the legs cross in front view for both people. This is the main fault.
- **Elder's idle:** the hips are pushed back into a half squat.
- **Claw hands:** all clips have curled, hooked hands at rest. The Elder's are the clearest.
- **Elder woman's face:** from the front she reads male, with short hair visible; her bun shows only from the side.
  This is outside c11, but it shows in every panel.
