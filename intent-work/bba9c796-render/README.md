# Render job: intent bba9c796's audit of Sandbox 1 and Sandbox 3 (c7), on a Mac's Metal

Intent bba9c796-5126-4175-8ea5-466c84372459 (a three.js performance skill, the frame meter, and this audit). Its pull
request is #2165, branch `intent/bba9c796-three-performance`. The audit measures **main** as it is. The frame meter
comes from the pull request: `play/site/src/lib/content/render/meter.js`, injected whole as an init script, so main
needs none of the pull request's code.

## What it measures

At 1440×900 with noon pinned. Each view is measured once nothing more is being built, over 3 s of frames:

- **The meter:** mean and p95 frame time, CPU ms (the frame's animation callbacks), GPU ms
  (`EXT_disjoint_timer_query_webgl2`), draw calls, triangles, and the bound:
  - `gpu` or `cpu`, whichever is longer;
  - `vsync` when both fit inside the display's interval.
- **The probe (`probe.js`):** the same frames split into buckets, plus the materials and texture memory. The buckets:
  - shadow-map passes;
  - blended (transparent) draws;
  - other offscreen draws;
  - opaque draws to the screen.

  The materials are counted by three's shader type, and texture memory is the bytes of level 0 uploaded.
- **Three ablations per view.** The probe leaves a part out, so each win's saving is measured, not guessed:
  - `noshadow`: the shadow maps' draws are not made;
  - `noblend`: the blended draws are not made;
  - `half`: the page at 720×450. GPU ms that falls with the pixels is fill (fragments, overdraw); what stays is
    geometry and draw calls.

The views:

- **Sandbox 1** (`/sandbox-1/`, the village of `play/site/src/lib/content/sandbox-2/interior`): 6295a650's three views
  on the line x = 0, looking towards the master dome, placed with `__walker.place(x, z, yaw, pitch)`:
  - near: z 95, pitch −0.05;
  - mid: z 235, pitch −0.05;
  - far: z 370, pitch −0.12.
- **Sandbox 3** (`/sandbox-3/`, the old city): it has no hook to place its camera, so:
  - `open`: as it opens, after 60 s;
  - `walk5`: after W is held 5 s;
  - `walk15`: after W is held another 10 s.

## Run it

```sh
git fetch origin intent-work/bba9c796-render
git checkout intent-work/bba9c796-render          # or a worktree of it
PLAY_MCP_TOKEN=play_… bash intent-work/bba9c796-render/run.sh
```

`run.sh` does the rest:

1. It fetches `main` and the pull request's branch.
2. It puts main in a worktree at `../bba9-main`, runs `bun install`, and starts its dev server on :5183 with
   `PLAY_API` pointed at the audit's read-only proxy on 127.0.0.1:3912. The proxy forwards GET and HEAD of `/api/…`
   only, to play.maia.city with the token; the token is sent to play and nowhere else.
3. It runs `audit.mjs` with play/site's Playwright. Its Chromium runs with `--use-angle=metal` on a Mac.

It takes about 10–15 minutes: Sandbox 1 settles in about a minute, and each view takes about 25 s.

**Out**, in `intent-work/bba9c796-render/out/`:

- `audit.json`: the views, with `wins` empty;
- `<world>-<view>.png`;
- `stdout.txt`;
- `meter.js`: the meter as it ran;
- `vite.log`.

Commit `out/` (without `vite.log`) to this branch and push.

**If the first line says `GPU timer NOT offered`,** every `gpu_ms` is null and c7 cannot pass. Say so with the
output; don't rerun with other flags unasked.

## Then

The builder reads `out/audit.json` and writes:

- **`wins`:** three per sandbox, ranked by expected saving in ms. Each saving is taken from the ablations and the
  split, and each win names the code it changes.
- **`out/AUDIT.md`:** the same in plain words.

c7 then runs on the pull request's head (`git show FETCH_HEAD:intent-work/bba9c796-render/out/audit.json | jq …`).
Each win becomes its own intent afterwards.

## Tried in the cloud

`audit.mjs --only sandbox-3` ran end to end in the cloud on SwiftShader. Its numbers say nothing: frames take about
750 ms there, and SwiftShader has no GPU timer.
