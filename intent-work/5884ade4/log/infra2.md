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
