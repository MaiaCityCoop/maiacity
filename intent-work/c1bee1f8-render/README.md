# Mac job: intent c1bee1f8's c8, the smoke: every page on WebGPU in Chrome and in Safari

Run 1 (5f829ca, head a1c2823) found WebGPU's own shader errors (fixed in the pull request, 817fe84); this job then
names the URL of every failed request, keeps the job's own errors apart, and smokes a production build (run 2).

MAC JOB READY: intent-work/c1bee1f8-render@{JOB} intent-work/c1bee1f8-render/README.md, run 3, on the pull request's head
`d9628c78040d69d6c8a5ab55782b43b00b9bff11` (`HEAD_COMMIT=d9628c78040d69d6c8a5ab55782b43b00b9bff11`; main merged in twice since 817fe84, and main's new plantings test), a production build.
Dry run: DRY RUN PASSED at c28ad3d (23.2 s; only this line changed since).

Intent c1bee1f8-e738-4ff3-aace-4aea1d7e74ae (GPU 9/14), pull request #2186, branch `intent/c1bee1f8-webgpu-switch`.
Every page draws with `WebGPURenderer`: WebGPU where the browser has it, its own WebGL 2 backend where not. The
census counts the same main pass in avenBOX (c5, c6), and its smoke (`census.ts --smoke`) runs each world on
WebGPURenderer's own code without an error. This job checks what only a GPU shows: every page opens and draws on a
real browser's WebGPU with no console error. It takes about 5 minutes (Samuel 2026-11-09: frame times logged, not
bounded; films are c9's, after the deploy).

**Run:** `PLAY_MCP_TOKEN=play_… HEAD_COMMIT=b798efcfda9f82a9edb41856b9034026e7ca7f2a bash intent-work/c1bee1f8-render/run.sh` (bun, node
with Playwright's Chromium and WebKit: `npx playwright install chromium webkit` once). It checks out the head in a
worktree beside the repository (`../c1bee-head`), builds it as production does (`bun run build`) and serves it with
`vite preview` on 5183 through play's read-only proxy, and runs
`smoke.mjs` (this folder):

1. **Chrome:** Chromium on Metal with WebGPU on (`--enable-unsafe-webgpu`). It prints the WebGPU adapter it found.
2. **Safari:** Safari's engine, Playwright's WebKit. It prints its adapter, or `no navigator.gpu`. Where it has no
   WebGPU, the pages draw on the WebGL 2 backend, and that is said as their backend.

Each browser opens every page of play, one after the other: the seven sandboxes, the worlds view, the game and its
map, the factories, the stories, the asset viewer on the goat (rigged, dual quaternions) and on a machine (the kit's
caps), every group's library, and every admin page (these have nothing to draw and are opened for their console).
For each page it waits for the renderer's backend (`window.__rendererBackend`) or 8 s, then 4 s more. It then records:
- the frame time over 3 s (mean and p95, logged only);
- the backend that drew (`webgpu`, `webgl2`, or `none`);
- a 1440×900 screenshot;
- every console error and page error.

**Pass (c8):** every page in both browsers opened with no console error and no page error of its own (`c8: PASS` on
the last line), and Chrome's drawing pages say `webgpu`. Two kinds are the job's, not the page's, and are kept apart
(`aside`) and shown: play's member routes answer 401, because the job signs no one in; and, should Safari still
refuse an inline style under a CSP on the production build, that line is kept apart too: play's pages carry no
`style-src`, the asset box's sandboxed frame has `style-src 'none'` (src/lib/kernel/sandbox/policy.js), and this pull
request touches neither. Every failed request is listed by its address
(`failed`). Look at the screenshots: every world shows its ground, sky and things
(no black or empty frame), the goat is whole and the machine shows its parts.

**Dry run (in avenBOX, before this is sent):**
`bun play/site/scripts/macjob/dry.ts intent-work/c1bee1f8-render --at <the job's commit>`. It must print DRY RUN PASSED.

**Out:** `out/smoke/results.json` (each page: browser, backend, frame ms, errors, screenshot), `out/smoke/*.png`,
`out/smoke.txt`, `out/commits.txt`. Commit `out/` and push to the branch `intent-work/c1bee1f8-render`.
