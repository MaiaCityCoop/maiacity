# CPU profiles at near noon (Mac render box, 2026-11-08)

`intent-work/main-baseline/profile.mjs` (branch intent-work/main-baseline-render): Sandbox 1, 1440×900, noon, seeded,
settled, the walker placed at near; a CDP CPU profile over 5 s; functions by self time.

- base: main 5ae3807 · head: 19ee818 (the ground's head then)
- both at 36 frames/s in the second before the profile; the same functions on top (three's `multiplyMatrices`,
  `getParameters`, `renderBufferDirect`, `setProgram`, core.js `place`) in about the same shares.
- head's `(program)` (the browser's own work: GL calls, compiles) is lower, not higher.

So at near noon the ground's head spent no more CPU per frame than main; c7's +5.8 ms CPU was not in the frame's
JavaScript at this view. The rerun on the newest head measures each view on a fresh page with its own profile.
