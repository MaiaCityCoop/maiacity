# The compile fix, verified on the Mac (2026-11-08)

`compile-fix.diff` applied by the render box on head c634e0b8c (not pushed to the intent's branch), step 0 (errors.mjs, Sandbox 1, 180 s):

| | c634e0b8c | c634e0b8c + compile-fix.diff |
|---|---|---|
| BADUNIFORM (a vec3 handed the sky's PMREM) | 15,588 | 0 |
| draws left out (install's catch) | 6 (King coconut, Durian: level 1) | 0 |
| "uniform buffer that is too small" | 256 | 0 |
| draws in the last 5 s | 164,844 | 271,524 |
| "Light node not found for SunLight" | 269 | 85 |
| page errors | 5 (media currentTime, base too) | 5 (the same) |

**Cause.** three r187's `compile` gathers materials with `scene.traverse`, hidden objects included, and builds a node material's
program through `getProgram` with no `onUpdateProgram` after it (only `setProgram` calls it). The kit's `precompile` hides
node-material objects, which three's compile ignores, and core.js's `r.compile` passes scenes with node materials straight
through. So the levels' warm-up builds programs the WebGLNodesHandler never registers; when a material comes back to one, the
handler registers it with the uniforms (and uniform groups) of another build of that material: the PMREM cube lands on a vec3,
and the uniform blocks don't fit.

**Fix.** core.js's `r.compile`, the one gate of every `compile` and `compileAsync`, takes node materials out (material null)
while three gathers, and puts them back: node materials are built at their first frame, as every draw is, so every program
the handler sees comes with its own build.
