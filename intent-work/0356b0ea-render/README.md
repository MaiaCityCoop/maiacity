# 0356b0ea · the Mac job: what a frame of Sandbox 1 costs Safari's engine, part by part

GitHub's macOS runner (Metal) at commit 2a5aef60: Sandbox 1 in WebKit 793 ms a frame (13 frames in 10 s, CPU 85 ms,
728 draws, 2.6 M triangles), where Sandbox 5 is 29 ms with 3.9 M triangles and Sandbox 3 17 ms. The page's JavaScript
is not it. This job finds which part of the world costs WebKit the rest: Sandbox 1 shown and settled, measured whole,
then with each part of its scene hidden in turn (a dome's inside part by part), each for 4 s, then whole again.

**On the Mac**, from the repository's root, on this branch (`intent-work/0356b0ea-render`, the pull request's tree):

```sh
bash intent-work/0356b0ea-render/run.sh                      # WebKit, then Chromium; about 15 minutes
bash intent-work/0356b0ea-render/run.sh --browser webkit     # WebKit alone
```

- Needs bun and play/site's node_modules (`bun install`, done by run.sh if missing): Playwright's WebKit and Chromium,
  headless, on Metal. No token, no network: the build is served from the pinned inputs as `play/site/scripts/gpu.ts`
  serves it.
- **Out:** printed only, a few dozen lines: a browser's frame whole, a line a part (`without <part> (<meshes>,
  <triangles>): <ms> · it costs <ms>`), and whole again. **Send back** those lines to the 0356b0ea builder session.

**Dry run** (avenBOX, CPU, no GPU), passed before this job was handed on:

    bun play/site/scripts/macjob/dry.ts intent-work/0356b0ea-render --at <the job's commit>
