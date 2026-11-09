# ed6694c3 · the Mac look (c5): Safari walks Sandbox 5 smoothly

660ad67f (#2203, shipped) made Sandbox 5 draw again. But walking the dome, WebKit (Safari's engine) linked 47 programs:
mean frame 43.8 ms, p95 109 ms, 17 frames over 100 ms (660ad67f run 3). This intent's fix (PR #2208,
`intent/ed6694c3-safari-warm`): `render/core.js`'s `precompile` now builds the kit's node materials too, each paired
with its program, so a level's plant programs link while it loads, not mid-walk.

**On the Mac**, in a checkout of this branch (`intent-work/ed6694c3-render`):

```sh
export PLAY_MCP_TOKEN=…        # the admin token, sent to play only (read-only proxy on 127.0.0.1:3911)
bash intent-work/ed6694c3-render/run.sh      # optional: a commit of the fix; default PR #2208's head
```

- **Serving:** the fix's head is checked out beside the repository (`../ed6694c3-head`) and served by vite's dev server on :5190 (the asset box doesn't build under `vite preview`).
- **Per browser** (Chromium on Metal, then Playwright's WebKit), each in its own process:
  - Sandbox 5 builds (up to 120 s).
  - **The walk, as the render box walks it:** 20 s after it is up, 24 m straight ahead through the dome over 12 s (`__walker.place` each frame). It keeps every frame interval (frames, mean, p95, over 100 ms, max) and the programs linked while walking.
  - Then Sandbox 1's film is advanced over 5 s.
- **c5 passes when it prints `OK`:**
  - WebKit's walk has a mean of at most **31.2 ms** (1.5 × main's 20.8 ms before the programme);
  - at most **3** frames over 100 ms;
  - at most **5** programs linked while walking;
  - no `uniform3fv`, `@@iterator`, `uniform buffer that is too small` or `did not load` in either browser;
  - the film advanced.
- Chromium's walk is reported. The GPU is printed first; it should name Apple / Metal.
- **Out:** `out/` (screenshots, `results-<browser>.json`, `stdout-<browser>.txt`). Commit it to this branch and push.

**Dry run** (cb52fbd9): `bun play/site/scripts/macjob/dry.ts intent-work/ed6694c3-render --at <this branch's commit>`. It passed in avenBOX before this was reported ready. Sandbox 5 is an empty page there (not walked); the walk runs on the Mac only.

MAC JOB READY: intent-work/ed6694c3-render@c90d1c1 intent-work/ed6694c3-render/README.md (dry run passed in avenBOX, 2026-11-09 14:27 UTC, serving PR #2208's head a2088e9; this line's commit changes the README only)
