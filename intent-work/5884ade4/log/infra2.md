# infra2: the re-audit's leftovers (intent 5884ade4)

Problems are `re-infra#n` of the infra re-audit (findings 1–12 and 14; not 13, never-deployed compose files and
Caddyfile, Samuel's decision with F4; not `.claude/settings.json`, a person's). 5 (the `Intent:` trailer) and 12 (the
stage list) went to the api fixer (`intent/5884ade4-u-api2`). Deploy scripts can't run here: each change to one is shown
the same as infra.md did, the old and new run against stand-ins that log every call, diffed (scripts in the session's
scratchpad, `infra2/`).

## 1. CI's checks call avenBOX's gate (re-infra#1)

- play-checks.yml's "The API" step: `bun install --frozen-lockfile`, Postgres's readiness wait, then `bash
  ../avenbox/gate.sh api --no-up`; "The site": install, then `gate.sh site --no-up`; website-checks.yml: install, then
  `bash ../play/avenbox/gate.sh website --no-up` (the check and the build, one step). Job names, step names and the
  required checks (`play / API and site`, `website / build`) unchanged.
- gate.sh's `--no-up`: the caller has Postgres answering at TEST_DATABASE_URL and the part's dependencies installed, so
  up.sh (which on a runner would find the image's own Postgres cluster on the same port) is not run. On GitHub
  (`GITHUB_ACTIONS`) each step's whole output is printed, folded, and in full when it fails (a runner keeps no log file).
- What CI runs now is what it ran plus the gate's one rule: a skipped test is red.
- Same commands: every `run:` of both workflows, old and new, run with stand-in bun/bunx/docker logging each call
  (`ci-same.sh`): identical calls, in the same directories; the one difference is order, `bunx tsc --noEmit -p .`
  after the readiness wait instead of before it.
- Pinned: workflows.test.ts's suite test now reads the workflows' gate lines and `gate.sh api --no-up --plan` (types,
  every file) instead of a `bun test --parallel` copy; deploy-speed.test.ts's step check names the gate. actionlint
  clean; `gate.sh website --no-up` green with GITHUB_ACTIONS set.

## 2. server-care.sh on lib.sh's APP_DIR (re-infra#2)

- Its seven `/opt/maia-city/…` (the disk report, the kept folders, its temporary files, the leftovers' cleaning) are
  `"$APP_DIR"/…`, the constant of the lib.sh it sources; backup.sh's usage line no longer spells the folder.
- Same commands (stand-ins as infra.md's, `infra2/fake/`, old = the branch before the move): server-care.sh report and
  clean, with the bucket and with the folder; backup.sh and restore.sh (check, rollback both ways) as a guard: every
  call identical (mktemp's random suffix normalised). `bash -n`; shellcheck finds only the warning it had (SC2024).

## 3. The backups' layout said once, in lib.sh (re-infra#3)

- lib.sh: `SNAPSHOTS_PREFIX=BACKUPS/play`, `STORE_PREFIX=BACKUPS/play-files/blobs`, `snapshot_name <label>` (the
  `<when>-<label>` backup.sh names a snapshot) and `snapshots [docker run options]` (the one "list snapshots" pipeline,
  oldest first, matching that `<when>`). backup.sh, restore.sh and server-care.sh use them instead of their own
  prefixes and two copies of the pipeline; server-up.sh writes `PLAY_MIRROR_ROOT=$STORE_PREFIX` into play.env, so
  play's second copy and the backups name one store.
- Same commands: backup.sh (bucket, folder), restore.sh (check latest and by name, rollback both ways), server-care.sh
  clean (bucket, folder, and with the store missing the file, so it walks the older snapshots: a new stand-in case)
  and server-up.sh (a new stand-in run, `fake/up.sh`: its calls and the play.env it writes): identical. (The stand-in's
  log orders `openssl` and `sudo tee` of one pipe as they happen to run; normalised.)
- Left: play/api (`blobs.ts`' comments, `bucket.test.ts`) and restore.yml's header name the prefix in words; the image
  takes it from play.env.

## 4. intent.ts reads the box's database from box.env (re-infra#4)

- intent.ts's own `DATABASE` URL goes: without TEST_DATABASE_URL, the checks get `BOX_DATABASE_URL` of
  `<root>/play/avenbox/box.env` (its `--root`: in intents-pr.yml's run job the head's checkout, whose setup.sh made the
  box it runs in; locally the repository). It is sourced by bash with only PATH in its environment (no token near
  it). intents-pr.yml unchanged (it already hands play.ts beside intent.ts; the checkout holds box.env); box.env's
  comment loses the exception.
- Pinned: avenbox.test.ts, a new case: `--from` with no TEST_DATABASE_URL and a root whose box.env names another port
  and password: the check sees that URL. The suite's other cases, with TEST_DATABASE_URL set, unchanged and green.

## 6. server-care.sh imports the image's kit, not the shims (re-infra#6)

- Its two programs in play's image import `/app/api/src/kit/pg.ts` and `/app/api/src/kit/hash.ts` (the Dockerfile
  copies src/ whole); blobs.ts stays where it is. Main's image has no kit/ yet: the server care, by hand only, takes
  these paths once this intent's deploy has run (its first image carries kit/).
- `src/pg.ts` and `src/hash.ts` stay, as the one-line re-exports for the held assetdocs.ts and its test only (their
  comments now say so); `grep -rn "src/pg\|src/hash"` finds nothing else. They go with those files' next untangle.
- Pinned: the same imports, run from play/api, load `connect`, `blobStore` and a `hashBytes` equal to the shim's;
  `bash -n`; the stand-in server-care runs (§2) log the new paths, the rest the same.

## 7. tools/sheet and tools/character on the shared helpers (re-infra#7; no longer held)

- tools/sheet/fal.ts's `upload` calls `add_story_frame` through play/avenbox/play.ts's `tool` (its token passed as
  before, still refused unset) instead of its own JSON-RPC client and hard-coded endpoint (PLAY_MCP_URL now reaches it,
  as every other client). tools/character's render-gpu.mjs, bench-gpu.mjs and build-recipe.mjs find play/site by
  tools/site.cjs (`SITE`, `siteRequire`) as motion and plant do.
- Same behaviour: `upload` old and new against a stand-in fetch (`infra2/upload.ts`): the same request (URL, bearer,
  tools/call add_story_frame with the same arguments), the same result; a tool error still throws, now with the
  tool's words instead of the raw JSON. fal itself never called: sheet.test.ts (its fal and play stubbed) 13 pass.
  The three character paths (three's build/, three/, Playwright's entry) resolve to the same files from site.cjs as
  from their own relative URLs (`infra2/paths.mjs`, PLAY_SITE unset); `node --check` on each.
- Next untangles: play/site/scripts' own MCP clients (propose.mjs runs on node, world-shot.ts reads an SSE answer and
  stops by its own `fail`, flyover/play.mjs reads `structuredContent`'s `items`): each needs its own pinning, play/site's.

## 8. prod-ssh exports APP_DIR only (re-infra#8)

- The action put `S3_BUCKET/S3_ENDPOINT/S3_REGION` and the server's address as `HOST` into the job's environment; no
  step reads them (bucket-keys.sh sources lib.sh itself, server-up.sh the server's copy, the DNS steps take their
  record from inputs), and `HOST` there was an IP shadowing lib.sh's name. Now only `APP_DIR`, which the jobs' `ssh
  prod "… $APP_DIR …"` lines use. `grep` of .github/ finds no other reader.
- Same: the step, old and new, with a temp HOME and GITHUB_ENV and a stand-in getent (`infra2/ssh-same.sh`):
  ~/.ssh (config, known_hosts, the key) identical; GITHUB_ENV keeps `APP_DIR=/opt/maia-city` and loses the four lines.
  actionlint clean; deploy-speed.test.ts and workflows.test.ts green.
