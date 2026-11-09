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

It uses the pull request's head (`intent/7af6e162-settle-fast`) only, served on port 5197, with its profiles in a fresh
folder under `out/` that is deleted at the end. It runs selector-shots twice:

1. `--cold`: the first load in a fresh profile is measured (near, mid, far, then the old city).
2. Another fresh profile is opened once (a cold load again, its settle time printed as "first load") and measured on
   its next load (the "measured load").

## What to send back

`out/SUMMARY.txt` holds:
- the settle lines: "first load up and quiet after N s (P pictures taken)" for both runs, and the warm run's "measured
  load …";
- each view's frame time and triangles, cold and warm;
- with ImageMagick, the pixels that differ between cold and warm at near, mid and far.

Also send `out/cold/*.png`, `out/warm/*.png` and `results.json`.

**Expected:** the measured (warm) load is quiet within about 30 s with 0 pictures taken; the cold loads take minutes; the
triangles are the same cold and warm, and the pictures the same (or within the noise of the moving water and leaves).

Commit `out/` (without `profiles/`) and push to `intent-work/7af6e162-render`.

## For the render box (every job, from now on)

- **Settle by `play/site/scripts/quiet.js`** (`quietness`, self-contained: `page.evaluate(quietness)` until it is 0
  twice, 2 s apart, as `mac-page.mjs` `settle` does). It replaces `intent-work/main-baseline/determinism.mjs`'s `QUIET`:
  the same building, keeping and pictures-taken terms, plus the copies and the domes.
- **Open pages through `play/site/scripts/mac-page.mjs` `openSite(<side>)`**, or at least with
  `chromium.launchPersistentContext(~/.cache/maiacity-render/profiles/<side>, …)` in place of `browser.newContext()`.
  Keep each side's port from job to job (the cache is per origin), and warm once before measuring. The cache's keys are
  content hashes, so a profile shared by every commit is never stale.
