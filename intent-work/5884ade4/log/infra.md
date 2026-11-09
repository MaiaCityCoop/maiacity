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
