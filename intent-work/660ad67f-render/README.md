# 660ad67f · the Mac look (c6)

Two regressions on main, fixed on this branch (`intent/660ad67f-regressions`, PR #2203):
- **Sandbox 5 drew nothing.** Kit materials of one shape on meshes built differently shared one program (`uniform3fv … @@iterator`). The drawn geometry now joins the program key.
- **Sandbox 1's film threw** on `sky.sun.target`. The film now reads the SunLight's own direction.

Both are proven on the CPU in avenBOX (c3, c4). This job is the one look on a real GPU.

**On the Mac**, in a checkout of this branch, from the repository's root:

```sh
export PLAY_MCP_TOKEN=…                      # Samuel's play token (sent to play only, through a read-only proxy)
bash intent-work/660ad67f-render/run.sh ~/660ad67f-look
```

- It installs play/site's dependencies (and Playwright's WebKit if missing), serves this branch's site on :5190 against play read-only, and runs `look.mjs`.
- **Per browser** (Chromium on Metal, Playwright's WebKit):
  - Sandbox 5 builds (up to 120 s) and is walked forward 12 s; it counts the programs linked while walking and keeps every console error.
  - Sandbox 1 opens and its film is advanced over 5 s (`__world.film.advance`).
- It prints the GPU first (it should name Metal / Apple). If it does not, stop and say so.
- **c6 passes when** it prints `OK`:
  - no `uniform3fv`, `@@iterator` or `did not load` in either browser;
  - the film advanced;
  - the screenshots show the dome's plants (Lemon, Strawberry, Basil, Nasturtium) drawn;
  - WebKit's programs linked while walking are at most bd087014's count plus 10 %. bd087014 measured 1 while walking, but on a blank world; a handful is expected now that the plants draw, and every shape compiles once.
- **Out:** `~/660ad67f-look/{chromium,webkit}-sandbox-5.png`, `…-sandbox-1-film.png` and `results.json`.
- **Send back** to the 660ad67f builder or the Orchestrator: the printed lines, `results.json` and the screenshots, for check_intent c6.
