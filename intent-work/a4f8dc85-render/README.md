# a4f8dc85 · the Mac render job (c2's renders)

Samuel's rule (2026-11-07): GPU work runs only on his Mac (Metal), never on SwiftShader in the cloud. The face fit and its
texture are CPU and run in avenBOX too; this job runs the whole of it on the Mac, so nothing of Samuel's is handed over
in git: it fetches his photos and sheet from **his personal library on play by hash**, fits, renders, and keeps the
review image in his personal library again.

**On the Mac**, in a session on this branch (`intent/a4f8dc85-own-character`), from the repository's root:

```sh
cd play/site && bun install && cd ../..            # three.js for the renderer
export PLAY_MCP_TOKEN=…                             # Samuel's own play token (sent to play only)
bash intent-work/a4f8dc85-render/run.sh ~/a4f8dc85-work
```

- Needs: python3, node with Playwright (global) and its Chromium, bun, git. No fal, nothing paid.
- It prints the renderer (`renderer: ANGLE (Apple, … Metal …)`): if it is not Metal, stop and say so.
- **Out:** `~/a4f8dc85-work/c2-review.jpg`: his photos and the sheet's head cells on top, then the renders (front,
  three-quarter, profile), neutral and with his own smile (the expression fitted on his smiling front photo), and the
  fit's numbers. It is kept in his personal library; the job prints its hash and `fit-report.json`.
- **Send back** (to the a4f8dc85 builder session, or the Orchestrator): the review image's hash and the fit report.
  Never the files themselves, and nothing into git.

The same job runs in avenBOX with `RENDERER=cpu UPLOAD=0` (the CPU checker's flat renders) to test it end to end.
