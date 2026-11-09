# infra: fix 6, one deploy toolkit, one check list (intent 5884ade4)

Problems are `infra#n` of `audit/infra.md`. Each move: what, what it removes, how behaviour is pinned. Deploys can't run
here: every workflow change says how its commands were shown to be the same.

## 1. The required checks named once (infra F5; infra#9)

- `.github/required-checks.json` `{play, website}` names `play / API and site` and `website / build`.
- `main-green` reads it (its `checks` input, which no caller passed, is gone); `tested-tree.sh` takes `PART=play|website`
  and reads its check's name from it; `play/api/src/substate.ts`'s `REQUIRED_CHECKS` reads it at `PLAY_REPO` (as
  `engines.ts` reads engines.json), and `play/Dockerfile` copies it to `/app/.github/required-checks.json`.
- `deploy/README.md` points at the file instead of spelling the names.
- Pinned: `deploy-speed.test.ts` now asserts the file equals main.yml's composed job names (`<caller job> / <called
  job>`), the tested-tree tests run with `PART` (and a part that names no check runs the checks); `substate.test.ts`,
  `ship.test.ts` unchanged and green.
- Same commands: main-green's step run against a stub `curl` printing its arguments asks GitHub the same two URLs, in
  the same order (`check_name=play%20%2F%20API%20and%20site`, then `website%20%2F%20build`), and stops red when the
  file is missing. tested-tree.sh is run by deploy-speed.test.ts against its stand-in GitHub.
- Left: `CLAUDE.md` (project instructions, which an agent may not change) and `play/SPEC.md` (not this area's) still
  spell the names, so the bound is 3 files, not 1.

## 2. One deploy toolkit (infra F3; infra#15, 16, 17, 18, 19 (scripts), 20 (scripts), 23, 31, 32, 39)

- `deploy/lib.sh` (sourced, changes nothing): production's constants (`APP_DIR`, `HOST`, `S3_BUCKET/ENDPOINT/REGION`,
  the two container names), `compose`, `answers <container> <tries> <pause>` (the one /api/health probe) and
  `s3 <backup|play> [docker run options] -- <aws args>` (the one aws-cli runner: the Hetzner checksum flags, retries,
  timeouts). backup.sh, restore.sh and server-care.sh source it; their eight aws-cli calls, three compose strings and
  hard-coded container names are calls of it.
- `deploy/dns.sh set|remove <name> [ipv4]`: the one Hetzner zone lookup and record writer (was inline in
  production.yml's DNS step and server.yml's remove-dns). server.yml's job now checks out first (remove-dns runs the
  script); its name check and refusals stay in the step.
- `deploy/server-up.sh`: production.yml's 55-line heredoc, as a script. The step sends the values it needs (printf
  `%q`) and the script over stdin to `bash -s`, never as arguments, as before; the server sources the lib.sh the
  backup job has just copied (added to its tar; restore.yml and server.yml scp it beside their scripts).
- `deploy/bucket-keys.sh [--if-set]`: the one writer of backup.env (was a printf in three workflows) and the one
  "keys set?" guard.
- `.github/actions/prod-ssh`: reads `HOST` from lib.sh and puts `APP_DIR` and `S3_*` into the job's environment; the
  workflows' three `env:` blocks of constants and the action's `host` input go; its `wait` input (no caller) goes.
- The website probe hits `/`, not the legal page's route (infra#23).
- server-care.sh's header and deploy/README.md now say what the code does with a file in no backup (forgotten when
  nothing names it, else kept and reported), not "moved aside to broken-<when>/" (infra#32).
- production.yml 324 → 199 lines.

How the commands were shown to be the same (stand-ins under the scratchpad's `infra/`, each run on the script as
committed before and as now, every call they make logged and diffed):

- backup.sh, against a stand-in docker/sudo/date/timeout that answers its queries and lists the mounted /work: the
  bucket path and the folder path are byte-identical, every docker call and every timeout.
- restore.sh check (latest), rollback (bucket) and rollback (folder): identical but for two calls that had no retry
  flags and now carry `AWS_RETRY_MODE=adaptive AWS_MAX_ATTEMPTS=6` (the `s3 ls`/`s3 cp` of the snapshot and the
  rollback's `s3 sync` into play's bucket).
- server-care.sh clean (report, mend from the store, forget-lost, report): identical but for its aws calls, which now
  carry the retry flags, run under `timeout 0` (no bound, as before), drop `-i` (stdin was /dev/null already), and
  put_back's gain the connect/read timeouts the others had.
- The DNS steps: the old inline scripts (extracted from the old workflows) and dns.sh against a stand-in curl, 27
  scenarios each for set and remove (Console API, Cloud API, no zone; no record, another value, the same value; one
  or both tokens): calls and output identical.
- The server steps: the old step (its heredoc expanded on the runner) and the new one (values + server-up.sh), with a
  stand-in ssh running the command in a fake app folder and stand-in docker/sudo/openssl/flock, four scenarios (Caddy
  reads the block or not; play's folder still on the volume or not): every call, play.env and the Caddyfile
  identical (the health probe's JS string quoted with ' instead of \", the same code). One difference found: the old
  heredoc expanded a value twice, so a bucket key holding `$` was cut in play.env; now it is written as given.
- bucket-keys.sh writes the same backup.env (mode 600) as the old printf, red without keys, nothing with `--if-set`.
- prod-ssh's step, old and new, with a temp HOME: ~/.ssh identical, GITHUB_ENV gains the four constants.
- `actionlint` (play/avenbox/actionlint.sh) clean; `bash -n` and `shellcheck -S warning` clean on the new scripts.
- Tests followed the moves: workflows.test.ts reads play.env's lines from server-up.sh, runs remove-dns from the
  repository's root, and allows remove-dns's job its checkout.

## 3. Dead files out (infra F6; infra#41, 44)

- `.claude/launch.json` (`bun run dev` at the root, which has no package.json) and `play/site/scripts/clone.py`
  (cloned legacy maia/ aven/ paths into play, the direction CLAUDE.md forbids) go. Nothing names them: `git grep`
  over the repository (but intent-work's audit) finds no reader, no workflow, script or skill file runs them.
- `deploy/deploy-time.ts` stays: it is the `run` of check c12 of intent 5ab64b8e (accepted; `bun deploy/deploy-time.ts
  --most 90`, recorded by hand by Samuel 2026-11-07), the one measure of merge → live. Not dead.

## 4. Exports nothing uses, comments naming gone files (measure `dead`, `comments`, in this area)

- Unexported (used only in their file): `RUN_RECORDS` (intent.ts), `intentsIn` (pr-intent.ts), `Plan`, `allTests`
  (select.ts), `falKey` (tools/sheet/fal.ts), the legal types (website/src/lib/legal/types.ts). Gone (used nowhere):
  `UUID_IN` (pr-intent.ts, infra#40), `restFrame` (tools/motion/mocap.mjs).
- Comments: select.ts's `./x.js` example (read as a file) said in words; website/src/params/legal.js no longer names
  the `./moved.js` that went.
- Pinned: tsc (play/api's gate includes play/avenbox through its tests), workflows.test.ts runs pr-intent.ts;
  website check and build.

## 5. Errors no longer swallowed in the dev-server scripts (measure `special`; infra#50)

- play/site/scripts/flyover/flyover.mjs: stopping the dev server's process group ignores only ESRCH (the group gone
  already), any other error is thrown; waiting for it ignores only fetch's TypeError (refused until it listens).
  render.mjs: the same wait. Same behaviour wherever the old one worked; an unexpected error now shows.
- Left as they are: the Playwright and Chromium look-ups that try one place after another (flyover, render,
  tools/plant/organ.mjs, tools/motion/boxtime.mjs): the failure of each try is the point; tools/sheet/allow.ts's
  body parse (an unreadable body is asked as one image).
- Pinned: `node --check` on each; nothing runs them in CI (they film and render by hand).

## 6. The website on its own constants (infra F7; infra#25, 38 (website), 46, 47, 50 (FounderCounter), 54)

- FounderCounter.svelte asks `new URL('api/founders', PLAY)` (`$lib/play`), is TypeScript (no `@ts-nocheck`), and
  says why a failed read leaves the number as it is instead of an empty catch.
- Manifesto's `banner` prop (one caller, always true, from a load function that returned a constant) and its
  `afterHero` slot (never given) go, with `+page.server.ts` and `.after-hero`'s CSS: the page renders as before
  (the banner, its h1 and the h2 headline).
- app.css 445 → 134 lines: the legacy app shell's rules nothing names (`.app-dock`, `.foot-stack`, `.tag-list`,
  `.prose`, `.shifts`, `.screen-*`, `.tb-*`, `.cc-city`, `.lab-controls`) and the custom properties only they read
  (`--nav-*`, `--stick-*`, `--overlay-*`, `--screen-head-room`); an unused-class scan of website/src now finds none.
- Comments naming gone places (maia/site/app.html, Bunny storage, maia/site and aven/kernel in the fonts README);
  the two `*-latin-wght-normal.woff2` faces only aven/kernel's view engine inlined go.
- vite.config.ts without `as never` (vite 8 types `tsconfig`; the website's tsc and svelte-check are clean).
- Pinned: `bash play/avenbox/gate.sh website` (check and build) green.

## 7. The image's context takes required-checks.json (completes move 1)

- `play/Dockerfile.dockerignore` excludes everything but play's site, API and media: without `!.github/
  required-checks.json` the image's COPY of it (move 1) would fail. Docker's ignore file re-includes a file under an
  excluded folder by its `!` line (unlike Git's). No Docker daemon here to build the image: the deploy's image job is
  its test.

## 8. bun's version in one place (infra F1, part; infra#8)

- `.bun-version` (1.4.4): every `oven-sh/setup-bun@v2` step reads it (`bun-version-file`, 8 steps in 6 workflows);
  play/Dockerfile takes it as `ARG BUN_VERSION` for both stages, production.yml passing `$(cat .bun-version)`. The
  sparse checkouts (`sparse-checkout: play/avenbox`, cone mode) keep the root's files, so `.bun-version` is there.
- Pinned: workflows.test.ts reads intents-pr's `bun-version-file` and `.bun-version`'s 1.4.4; actionlint clean. The
  image can't be built here (no Docker daemon): production's image job builds it.
- Left: play/SPEC.md names 1.4.4 (not this area's).

## 9. avenBOX's Postgres said once, in play/avenbox/box.env (infra F1, part; infra#3, 4)

- `box.env`: the version (17), port, password, max_connections (500) and the test database's URL. setup.sh, up.sh
  and gate.sh source it; play-checks.yml's Postgres step sources it for CI's container and writes TEST_DATABASE_URL
  into the job's environment (127.0.0.1 for localhost, the same port).
- Same commands: with box.env's values the CI step expands to `docker run -d --name postgres -e
  POSTGRES_PASSWORD=play -p 5432:5432 postgres:17-alpine -c max_connections=500`, as before; setup.sh's sed and grep
  and its `ALTER ROLE postgres PASSWORD 'play'` expand as before. setup.sh run again here (as root): every step green,
  the cluster's `max_connections = 500` as it was; `gate.sh api` green (329 pass) after up.sh.
- Left: intent.ts keeps its own copy of the URL (intents-pr hands it alone to the box's run, away from the
  repository); the readiness loops (infra#5) and the two dependency loops (infra#6) are still each script's own.
- Pinned: workflows.test.ts and deploy-speed.test.ts read the step's `max_connections` and image through box.env.

## 10. The tools find play/site one way (infra F8, part; infra#27, 53)

- `tools/site.cjs`: `SITE` (PLAY_SITE when set, else the repository's play/site beside tools/) and `siteRequire`
  (require as play/site resolves). tools/motion (box.mjs, boxtime.mjs, check.ts, mocap.mjs) and tools/plant
  (silhouette.cjs, nan-check.cjs, organ.mjs) take it instead of six relative paths of their own.
- Fixed with it: silhouette.cjs and nan-check.cjs resolved `../../../../play/site`, two levels above the repository
  (written for a skill's folder), so they worked only with PLAY_SITE set; organ.mjs defaulted to an absolute
  /home/user/maiacity path. Now each finds the checkout it is in.
- Pinned: `bun tools/motion/check.ts directions` and `wave` all ok; box.mjs and mocap.mjs import (their exports as
  before); site.cjs's named exports load from node's ESM and bun.
- Left: tools/character (held at the audit; its files name `../../play/site` too), the committed mirror of play's
  documents in tools/motion (pieces/, assets/, proposed.json: needs intent b9e6ad45 accepted first), and a check of
  the committed paths skills name (infra#28).

## 11. One play MCP client for the box's scripts (infra F2, part; infra#12 (avenbox), 30)

- `play/avenbox/play.ts`: `PLAY_MCP` (PLAY_MCP_URL, else play.maia.city's), `call()` (one JSON-RPC tools/call: throws
  when play does not answer, returns the tool's text and whether it is an error) and `tool()` (its JSON, or throws
  with the tool's words). intent.ts, skills.ts, live-audit.ts (its own endpoint, from PLAY_URL) and pr-intent.ts take
  it instead of four copies and four defaults.
- intents-pr.yml's spec job hands play.ts beside intent.ts to the box's run (`cp play/avenbox/intent.ts
  play/avenbox/play.ts "$RUNNER_TEMP/box/"`); the sparse checkouts of play/avenbox hold it (infra#30: play.ts imports
  nothing outside play/avenbox).
- Pinned: workflows.test.ts's Intent named suite (judge() against a stand-in play, and the CLI) green; against play
  itself: `intent.ts <uuid> --spec-out` writes the spec, `skills.ts` writes the 44 skills, `live-audit.ts` lists the
  74 code intents; intent.ts copied alone with play.ts into a folder runs from there.
- Left: the play/site scripts' and tools/sheet's own clients (not in the box's sparse checkout; a play/site kit is the
  next step), ship.ts's and live-audit's trailer rules (play/api is the api builder's).

## 12. `gate.sh site-tests`: play/site's own tests on demand (infra F1, part; infra#48, 52)

- `bash play/avenbox/gate.sh site-tests` runs `bunx vitest run` in play/site (the box up first, as for every part
  that needs its dependencies). Not in `--all`, select.ts's plan or CI: whether they join the default gate is a speed
  decision left to Samuel.
- Pinned: `gate.sh --all --plan` unchanged (workflows.test.ts's gate test green), `gate.sh site-tests --plan` names
  the one step. A full vitest run did not finish here within 25 minutes while other builders' vitest runs shared the
  machine; the known 5 failures (old-city.test.ts, decisions.md) showed in the first minute. Fixing those is fix 8's.
