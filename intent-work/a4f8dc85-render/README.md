# a4f8dc85 · the Mac render job (c2's renders)

Samuel's rule (2026-11-07): GPU work runs only on his Mac (Metal), never on SwiftShader in the cloud. The face fit and its
texture are CPU and run in avenBOX too; this job runs the whole of it on the Mac, so nothing of Samuel's is handed over
in git: it fetches his photos and sheet from **his personal library on play by hash**, fits, renders, and keeps the
review image in his personal library again.

**On the Mac**, in a session on this branch (`intent/a4f8dc85-own-character`), from the repository's root:

```sh
cd play/site && bun install && cd ../..            # three.js and Playwright for the renderer
export PLAY_MCP_TOKEN=…                             # Samuel's own play token (sent to play only)
bash intent-work/a4f8dc85-render/run.sh ~/a4f8dc85-work
```

- Needs: python3, bun, git, and play/site's node_modules (`bun install` there: three.js and Playwright, whose Chromium
  renders headless on Metal). No fal, nothing paid.

**Run 2** (after the first Mac run, `5e513a1`, review `c00653fa…`): the Mac's patch is in (the parse error at
render-gpu.mjs:25, Playwright from play/site, bun, headless Metal), and what that review showed is fixed: the iris and
the pupil are caps on the eyeball's surface (they sat inside it: the eyes read white), the normals are smooth across
the UV seams (the cheeks and scalp were faceted), "smiling" is the house joy (the Person head's `SMILES` v7 units; the
fitted smile was too faint), and the head and neck are textured down to the shoulders so the cut falls below the frame.
- It prints the renderer (`renderer: ANGLE (Apple, … Metal …)`): if it is not Metal, stop and say so.
- **Out:** `~/a4f8dc85-work/c2-review.jpg`: his photos and the sheet's head cells on top, then the renders (front,
  three-quarter, profile), neutral and with his own smile (the expression fitted on his smiling front photo), and the
  fit's numbers. It is kept in his personal library; the job prints its hash and `fit-report.json`.
- **Send back** (to the a4f8dc85 builder session, or the Orchestrator): the review image's hash and the fit report.
  Never the files themselves, and nothing into git.

The same job runs in avenBOX with `RENDERER=cpu UPLOAD=0` (the CPU checker's flat renders) to test it end to end.

**Run 3** (after run 2's review `9ff6d82a…`: eyes, smile, facets and neck right): the texture blend. The photos' part
now fades in over half an eye distance above the brows (the band across the forehead); a source well darker than the
sources' weighted mean at a texel counts as a shadow and steps back (the brown smudges under the cheekbones), while the
beard, dark in every source, stays; and no front-on photo paints a surface facing well downward (the dark line under
the beard). The fit is as it was.

## c3: the bench film (`bench.sh`, after `run.sh` in the same work folder)

```sh
bash intent-work/a4f8dc85-render/run.sh ~/a4f8dc85-work      # the fit and the texture (as above), if not run yet
bash intent-work/a4f8dc85-render/bench.sh ~/a4f8dc85-work
```

- It makes the Person head v2 and body v2 and v3 from v1 (fetched from play by hash) and this intent's diffs
  (`intent-work/a4f8dc85/person-*.diff`), checks each against its hash, bakes Samuel's face into the head's own-face
  inputs (`tools/character/bake.py`), makes his recipe from `samuel.template.js` (his look and clothes; no face in git),
  and renders 20 s at 24 fps on Metal (`tools/character/bench-gpu.mjs`): idle, walk, a quarter turn, sit down on a
  chair, sitting (smiling), stand up, wave (smiling), idle.
- **Out:** `bench.mp4` (needs ffmpeg) and `bench/frames/` stay on the Mac, as his face is in them (play keeps a video
  only in Maia City's Library). A contact sheet of 12 frames, `c3-bench.jpg`, goes to his personal library; the job
  prints its hash. Send back that hash and what you see; nothing into git.
- **Blink:** every few seconds (the head v2's new `blink`).
- **Look for:** the garments (cream linen shirt, long sleeves, untucked; loose trousers to the ankle; sandals) moving
  with the body and never through it; the face smiling where it should. Known: "sit down" ends 0.23 m behind where "sitting" starts (a pop from the motion pieces, b9e6ad45's).
