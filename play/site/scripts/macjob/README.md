# Mac jobs

A **Mac job** is what only Samuel's Mac can run: frame times, stills and films on its GPU (Metal), for an intent's
look and time checks. It is a folder `intent-work/<intent>-render/` on a branch of the same name, holding a `run.sh`
(the trees it serves, the scripts it runs, the files it writes to `out/`), the scripts it runs, and a `README.md`
saying what it checks and how it passes. Everything a world draws that can be counted is counted in avenBOX by the
census first (`../census.ts`); the Mac is asked only for what needs a GPU.

## The dry run, before the Mac (intent cb52fbd9)

A job's script ran nowhere before the Mac, so each of its bugs cost a full cycle of the Mac's queue: a call that threw
(`__world.film.advance` with no film loaded), a `run.sh` whose server held its `$(…)` open, a warm-up that never
ended. So every job is dry-run in avenBOX first, on the CPU, with no browser, WebGL or GPU:

    bun play/site/scripts/macjob/dry.ts intent-work/<intent>-render --at <the job's commit>

It runs the job's `run.sh` as written, with stand-ins first on its PATH (`dry/bin`) for what needs a GPU or serves a
page: its scripts' `playwright` is a page on the census's CPU world (`dry/playwright.ts`): `goto` builds Sandbox 1,
Sandbox 3 or the worlds view from the tree serving that port, `evaluate` runs in that world's `window`, screenshots
and films are empty files, and waits are shortened (the clock moved on). It prints **DRY RUN PASSED**, or **DRY RUN
FAILED** with the kind (throw, hang, exit) and the first throw's stack and the job's line, or the step it hung at. It
proves the script and its plumbing, never the pictures or the times: those are the Mac's.

**The rule:** a job's README names its dry run, the exact command above, and the job is reported **MAC JOB READY**
only once that dry run printed DRY RUN PASSED in avenBOX (the Intents skill's Build part).

## What a job uses from here

- `determinism.js`: `SEEDED_RANDOM` (every page's Math.random one fixed sequence) and `QUIET` (a view settled), the
  same the census uses: import it from the tree the job runs (`<tree>/play/site/scripts/macjob/determinism.js`).
- `proxy.mjs`: `playProxy()`, the read-only proxy to play the dev servers' `PLAY_API=http://localhost:3911` names.

A route the census does not build (an asset's viewer, `/plants/…`) is an empty page in the dry run: its waits time
out as a page that never loads would, so a job that tolerates that passes, one that does not fails.
