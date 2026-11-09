# Intent 7af6e162's Mac job: Sandbox 1 settles in seconds (c7)

**What it shows:** on the Mac's Metal, Sandbox 1's second load in the same browser profile settles in seconds and takes
no new far picture, while the first load in a fresh profile takes minutes. Both loads draw the same picture.

Before this intent, every Mac job opened Sandbox 1 in a fresh browser context, so every load was cold. The page's asset
cache keeps builds, levels and far pictures by hash in OPFS, but in a fresh profile it starts empty. Jobs now open
each site through `play/site/scripts/mac-page.mjs`: a profile kept between jobs, warmed by one load before the
measured one, and settled by one rule, `play/site/scripts/quiet.js`.

## Run

```sh
git fetch origin intent-work/7af6e162-render && git checkout origin/intent-work/7af6e162-render -- intent-work/7af6e162-render
PLAY_MCP_TOKEN=play_… bash intent-work/7af6e162-render/run.sh      # about 10–15 minutes: the cold loads are most of it
```

It uses the pull request's head (`intent/7af6e162-settle-fast`) only, served as its production build on port 5197
(`node scripts/mac-page.mjs serve`: `bun run build`, then the build served by play-api's own handler, `scripts/serve-built.ts`;
not the dev server, and not `vite preview`, under which the asset box never built), with its profiles in a fresh
folder under `out/` that is deleted at the end. It runs selector-shots twice:

1. `--cold`: the first load in a fresh profile is measured (near, mid, far, then the old city).
2. Another fresh profile is opened once (a cold load again, its settle time printed as "first load") and measured on
   its next load (the "measured load").

**First, check that the asset box builds on the build.** Sandbox 1's first load should print "first load up and quiet"
with pictures taken, not "still building" at 600 s. If it is still building, rerun with the dev server
(`SERVE=dev bash run.sh`) and say so: the build path then needs its own fix. The cloud checked what it can without WebGL:
the page and the five box engines are served from the build, each engine's bytes matching its hash.

**Dry run** (intent cb52fbd9's rule): `bun play/site/scripts/macjob/dry.ts intent-work/7af6e162-render --at <this job's commit>`.

## What to send back

`out/SUMMARY.txt` holds:
- the settle lines: "first load up and quiet after N s (P pictures taken)" for both runs, and the warm run's "measured
  load …";
- each view's triangles, cold and warm (no frame meter: c7 judges settling and the picture, not frame time);
- with ImageMagick, the pixels that differ between cold and warm at near, mid and far.

Also send `out/cold/*.png`, `out/warm/*.png` and `results.json`.

**Expected:** the measured (warm) load is quiet within about 30 s with 0 pictures taken; the cold loads take minutes; the
triangles are the same cold and warm, and the pictures the same (or within the noise of the moving water and leaves).

Commit `out/` (without `profiles/`) and push to `intent-work/7af6e162-render`.

## For the render box (every job, from now on)

- **Settle by `play/site/scripts/quiet.js`** (`quietness`, self-contained: `page.evaluate(quietness)` until it is 0
  twice, 2 s apart, as `mac-page.mjs` `settle` does). It replaces `intent-work/main-baseline/determinism.mjs`'s `QUIET`:
  the same building, keeping and pictures-taken terms, plus the copies and the domes.
- **Serve each side's production build** (`node play/site/scripts/mac-page.mjs serve <port> <api>` from its play/site, served as play-api serves it):
  the dev server transforms hundreds of modules on the first load (on the CPU, Sandbox 1's page shell alone: 240
  modules, 2.7 s, against 36 files, 0.65 s built).
- **Open pages through `play/site/scripts/mac-page.mjs` `openSite(<side>)`**, or at least with
  `chromium.launchPersistentContext(~/.cache/maiacity-render/profiles/<side>, …)` in place of `browser.newContext()`.
  Keep each side's port from job to job (the cache is per origin), and warm once before measuring. The cache's keys are
  content hashes, so a profile shared by every commit is never stale.
