# 660ad67f · the Mac look (c6)

Sandbox 5 is blank in production. Two regressions on main are fixed in PR #2203 (`intent/660ad67f-regressions`):
- **Sandbox 5:** kit materials of one shape on meshes built differently shared one program (`uniform3fv … @@iterator`). The drawn geometry now joins the program key. A kit material whose built source differs from its program's uploads nothing into it and takes its own program, whatever the clash.
- **Sandbox 1's film:** it threw on `sky.sun.target`. It now reads the SunLight's own direction.

Both are proven on the CPU in avenBOX; this job is the one look on a real GPU.

**On the Mac**, in a checkout of this branch (`intent-work/660ad67f-render`):

```sh
export PLAY_MCP_TOKEN=…        # the admin token, sent to play only (read-only proxy on 127.0.0.1:3911)
bash intent-work/660ad67f-render/run.sh      # optional: a commit of the fix; default the PR's head
```

- It checks the fix's commit out beside the repository (`../660ad67f-head`) and serves it with vite's dev server on :5190, as the other jobs do. The asset box doesn't build under `vite preview`.
- **Per browser** (Chromium on Metal, Playwright's WebKit), one load of each page:
  - Sandbox 5 builds (up to 120 s) and is walked forward 12 s; the programs linked while walking are counted and every console error kept.
  - Sandbox 1's film is advanced over 5 s (`__world.film.advance`).
- It prints the GPU (it should name Apple / Metal) and ends with `OK`, or `FAILED` (exit 1).
- **c6 passes when:**
  - it prints `OK`: no `uniform3fv`, `@@iterator`, `uniform buffer that is too small` or `did not load`, and the film advanced;
  - `out/*-sandbox-5.png` shows the dome's plants (Lemon, Strawberry, Basil, Nasturtium);
  - WebKit's count of programs linked while walking is reported.
- **Run 2** (after run 1, `out/` 46306577f: plants drawn, film fine, but 14 "uniform buffer that is too small" per engine from the guard's frame): the guard's frame now draws with the program owner's uniforms and buffers. The job also prints the clashes it caught (`window.__clashes`: both materials and where their sources first differ), to pin what the key still misses. The run-1 outputs in `out/` are overwritten.
- **Out:** `out/` (screenshots, `results-<browser>.json`, `stdout-<browser>.txt`). Commit it to this branch and push.

**Dry run** (intent cb52fbd9; it passed in avenBOX before this was reported ready): `bun play/site/scripts/macjob/dry.ts intent-work/660ad67f-render --at <this branch's commit>`, from a checkout holding cb52fbd9's `scripts/macjob`. It builds Sandbox 1 on the CPU. Sandbox 5's route is an empty page there, so its waits time out, and the job tolerates that.
