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
