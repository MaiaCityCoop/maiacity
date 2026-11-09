# Untangle audit: infra (intent 5884ade4, read only)

Area: `.github/` (workflows, actions, tested-tree.sh, template), `deploy/`, `docker-compose*.yml`, `play/Dockerfile`,
`play/deploy/`, `play/docker-compose.play.yml`, `play/avenbox/`, `.claude/` (settings.json, launch.json, workflows),
`play/site/scripts` (not held), the three package.json files, `website/`, `tools/` (motion, security-auditor, plant,
ground-sets; sheet and character HELD). Line numbers are of origin/main as checked out.

Git history (339 commits; co-change computed per commit): `.github/workflows/play-checks.yml`, `play/avenbox/gate.sh`,
`play/avenbox/setup.sh`, `play/avenbox/up.sh` and `play/api/test/workflows.test.ts` changed together in 5 of 5 commits
that touched any of them (they are one thing in five files). `docker-compose*.yml`, `deploy/Caddyfile`,
`deploy/server-care.sh`, `production.yml`, `server.yml`, `play/Dockerfile` likewise always together (5/5), though those
are mostly large import commits. `play/site/scripts/intent-shots.ts` changes with its own PNGs under `play/shots/` (4/4)
and `IntentDetail.svelte`: a check's script living apart from its intent.

## Problems

### Hidden links (must change together, nothing shows it)

1. **The checks are defined three times.** `play-checks.yml:30-47` (tsc, `bun test --parallel`, site build),
   `website-checks.yml:37-46` (check, build) and `gate.sh:97-109` + `select.ts:26` (STEPS) list the same steps; CLAUDE.md
   says gate.sh "runs what CI runs". `workflows.test.ts:276-305` exists only to compare the copies' text. They differ:
   gate counts a skipped test red (`gate.sh:88-94`), CI does not (`play-checks.yml:58`); gate runs actionlint, CI never.
2. **Two different boxes for "the same" checks.** CI's Postgres is `docker run postgres:17-alpine -c max_connections=500`
   (`play-checks.yml:41`); avenBOX's is apt's PostgreSQL 17 made by `setup.sh:23-80`; intents-pr/intents run setup.sh
   (`intents-pr.yml:58`, `intents.yml:58`). The required checks and the "evidence" run on different databases.
3. **The test database URL in four places**: `play-checks.yml:50` (`localhost`), `up.sh:18`, `gate.sh:68`, `intent.ts:32`.
4. **max_connections=500 in three places**: `play-checks.yml:41`, `setup.sh:66-67`, `up.sh:49` (+ its test).
5. **Postgres readiness loop copied five times**: `play-checks.yml:55-56`, `up.sh:41`, `up.sh:54`, `setup.sh:71`,
   `restore.sh:83-84` (each with its own count and sleep).
6. **"install every part's dependencies" loop twice**: `setup.sh:100-104` and `up.sh:62-67` (same dirs list
   `play/api play/site website`, same `touch node_modules` convention that only up.sh reads).
7. **actionlint install twice in setup.sh** (`setup.sh:110-114`, the SUDO_USER branch re-implementing `as_owner`
   of `setup.sh:96-98`) and again in `up.sh:74`.
8. **bun's version (1.4.4) in 11 places**: `play-checks.yml:45`, `website-checks.yml:41`, `intent-named.yml:41`,
   `intents.yml:55`, `intents-pr.yml:48,86,115` (+ comment :5), `production.yml:301`, `play/Dockerfile:5,13`,
   pinned again by `workflows.test.ts:225` and play/SPEC.md:661.
9. **The required check names are a string protocol in five places**: composed from job names in `main.yml:27/32` +
   `play-checks.yml:18` / `website-checks.yml:15`, restated as `CHECK:` in `play-checks.yml:35` and
   `website-checks.yml:35`, as `main-green/action.yml:20` default, as `play/api/src/substate.ts:8 REQUIRED_CHECKS`, and in
   the GitHub ruleset (`deploy/README.md:24,30`). Renaming a job silently breaks Ship's gate and tested-tree.
10. **The `Intent: <uuid>` trailer parsed four ways**: `play/api/src/ship.ts:678`, `pr-intent.ts:17` (allows leading
    space), `live-audit.ts:68` (`[0-9a-f-]{36}`, looser), `intents.yml:42-48` (grep). Same rule, four regexes.
11. **The UUID regex** again in `intent.ts:28`, `pr-intent.ts:16-17`, `intents.yml:42`.
12. **play's MCP JSON-RPC client copied 12 times**: `intent.ts:97-109`, `skills.ts:37-49`, `live-audit.ts:31-41`,
    `pr-intent.ts:53-61`, `play/site/scripts/propose.mjs:98`, `flyover/play.mjs:21-25`, `story-room-hands.ts:11`,
    `story-room-shots.ts`, `library-shots.ts`, `dashboard-library-shots.ts`, `world-shot.ts`, and `tools/sheet/fal.ts:90`
    (HELD). The default endpoint `https://play.maia.city/api/mcp` is hard-coded in 5 of them.
13. **The intent stage list copied**: `skills.ts:27` (says "play/api/src/skills.ts SKILL_STAGES"), `pr-intent.ts:18`
    (LIVE), `live-audit.ts:82`.
14. **live-audit.ts re-implements ship.ts's reconcile** ("the same rule", `live-audit.ts:2-3`, merge-commit regex
    `:69`) in a second language of the same rule.
15. **The production constants in three workflows**: `APP_DIR`, `HOST: api.maia.city`, `S3_BUCKET/ENDPOINT/REGION`
    (`production.yml:30-36`, `restore.yml:40-46`, `server.yml:32-38`).
16. **backup.env written three times** by the same printf (`production.yml:107-109`, `restore.yml:73-75`,
    `server.yml:101-103`) and the "bucket keys set?" guard four times (`production.yml:103-105, 209-211`,
    `restore.yml:68-70`; `server.yml:100` a soft variant). `backup.sh:24` is the reader of those names.
17. **Hetzner DNS zone discovery copied** (`production.yml:151-165` and `server.yml:60-70`, both APIs, both tokens).
18. **The aws-cli container invocation copied eight times** with the same Hetzner checksum flags: `backup.sh:52-56, 67-74,
    79-85`; `restore.sh:29-34, 63-68, 114-119`; `server-care.sh:77-81, 92-95`.
19. **The compose command string in four places**: `production.yml:236`, `restore.sh:107`, `server-care.sh:27`,
    the header of `play/docker-compose.play.yml:3`.
20. **The health probe** (`bun -e "fetch('http://localhost:3000/api/health')…"`) copied five times:
    `play/docker-compose.play.yml:40`, `docker-compose.yml:61`, `production.yml:271`, `restore.sh:96, 132`; container
    names `maia-city-db`/`maia-city-play` hard-coded in backup.sh, restore.sh, server-care.sh, production.yml.
21. **play.maia.city's Caddy block twice**: `deploy/Caddyfile:129-141` and `play/deploy/Caddyfile.play` (byte-identical),
    plus the append/grep/reload-from-site-folder dance that keeps them in step (`production.yml:256-266`).
22. **The SSH target is the legacy API's DNS name** (`HOST: api.maia.city` in the three workflows) though the deploy
    already reads the server's ipv4 from Pulumi (`production.yml:129-138`); `server.yml:57-58` refuses to remove `api`
    for that reason alone.
23. **The production website probe names a legal page by route** (`production.yml:321` `/site-notice/`), tied to
    `website/src/lib/legal` paths.
24. **avenBOX's environment id hard-coded** in `.claude/settings.json:8`, `setup.sh:3` and CLAUDE.md; the hook is a
    300-character inline shell line repeating up.sh+skills.ts orchestration.
25. **The website's PLAY constant bypassed**: `website/src/lib/FounderCounter.svelte:11` hard-codes
    `https://play.maia.city/api/founders` beside `website/src/lib/play.ts:3 PLAY`.
26. **Committed mirror of play's documents**: `tools/motion/pieces/*`, `tools/motion/assets/*`, `proposed.json`
    "mirror what intent b9e6ad45 proposes to play" (`tools/motion/README.md:15-17`): a second copy of versioned
    documents in git, kept in step by hand (`pieces.mjs`).
27. **tools reach into play/site's node_modules and src by relative path** six ways: `tools/motion/box.mjs:6,25`,
    `check.ts:12,195,220`, `boxtime.mjs:16`, `mocap.mjs:6`, `tools/plant/silhouette.cjs:21`, `nan-check.cjs:15`
    (and HELD `tools/character/render-gpu.mjs:5-6`, `build-recipe.mjs:6`); compose.ts's VENDOR hashes
    (`play/site/src/lib/stories/compose.ts:30-31`) are tied to the exact gsap/inter versions in `play/site/package.json`
    and their node_modules paths (`StoryPlayer.svelte:27,97`).
28. **Skills (in play's DB) name committed files** (`.claude/workflows/*.js`, `.claude/agents/*.md`, `tools/plant/*`):
    a skill edit on play and a file rename here must go together; nothing checks it.
29. **intent-named and intents-pr judge the same pull request twice**: both run `pr-intent.ts` on the same events
    (`intent-named.yml:49`, `intents-pr.yml:57`), with the same fork guard written twice (`intent-named.yml:29-33`,
    `intents-pr.yml:33`).
30. **The record/intent-named jobs' sparse-checkout `play/avenbox`** (`intents-pr.yml:112`, `intent-named.yml:40`)
    silently forbids those scripts from importing anything outside play/avenbox; `skills.ts:19` already imports
    `../api/src/hash` (fine only because skills.ts is not run there). Any shared module must respect this.

### Needless links

31. **production.yml is a god file**: image, backup, DNS (48 lines of inline API code), server bootstrap (a 55-line
    heredoc writing play.env, migrating blobs, grants, import, Caddy), health, website publish (`production.yml:38-324`).
    The heredoc's escaping (`\$C`, `\$PW`) is what makes every copy (19, 20, 21) hard to share.
32. **deploy/README.md describes server-care differently from the code**: README:79 and `server-care.sh:10-11` say a
    lost file "is moved aside to broken-<when>/"; the code forgets its row (`server-care.sh:155-172`).
33. **The legacy compose files carry play**: `play/docker-compose.play.yml` layers on `docker-compose.yml` +
    `docker-compose.prod.yml`, which still define the legacy `api` service (`docker-compose.yml:28-64`, building
    `aven/api/Dockerfile`, which no longer exists) and Caddy `depends_on: api` (`docker-compose.prod.yml:25-26`).

### Surplus

34. **Legacy `api` service, `API_ADDRESS` site and `aven.maia.city` block** (`docker-compose.yml:28-64`,
    `docker-compose.prod.yml:14-19`, `deploy/Caddyfile:84-127`): the Aven Peer and aven/api are not in this repository.
35. **Legacy one-time import grants run on every deploy**: `play/deploy/setup.sql:13-15` grants `public.founders,
    passkeys`, `after-import.sql` revokes them, `production.yml:249,254`; `play/api/import/run.ts` no longer reads founders.
36. **One-time migrations kept in the deploy path**: `production.yml:110` (`rm /etc/cron.d/maia-city-backup`),
    `production.yml:242-247` (`src/tobucket.ts` folder→bucket move), `PLAY_BLOBS: /data/blobs` "without a bucket"
    (`play/docker-compose.play.yml:31`).
37. **Legacy backup layouts**: `restore.sh:48,75-76` (blobs.tar / blobs/ of pre-2026-11-05 backups), `restore.sh:120-126`
    (folder store), `backup.sh:60-89` (folder branch), `server-care.sh:25,63,97` (folder store, `blobs/blobs` path),
    `server-care.sh:105-118` (kept `play-folder-blobs-*` folders), `server-care.sh:132-146` (each old backup's blobs.tar).
38. **Stale references** to things that are gone: `prod-ssh/action.yml:6-12` (release.yml's "site, API and peer jobs",
    ops.yml), `docker-compose.prod.yml:1` (api.yml), `docker-compose.yml:4,48-56` (.env.example, theos/app, Prem),
    `deploy/Caddyfile:38-41` (code-architecture/…, aven/kernel/…), `play/Dockerfile:4` (play/deploy/README.md),
    `website/src/params/legal.js:2-3` (./moved.js), `website/src/routes/+layout.ts:3` (Bunny storage),
    `website/src/lib/fonts/README.md:6-7` (maia/site, aven/kernel), `website/src/app.css:35,49,398` (maia/site).
39. **`prod-ssh` input `wait`** (`prod-ssh/action.yml:23-26, 62-71`): no caller passes it.
40. **`pr-intent.ts:16 UUID_IN`** exported, used nowhere; `intent.ts:36 RUN_RECORDS` exported, read only in-file.
41. **`.claude/launch.json`**: `bun run dev` at the repository root, which has no package.json.
42. **`deploy/deploy-time.ts`**: called by nothing (no workflow, no package script, no doc but itself); hard-codes
    `myavenceo/maiacity` (`:14`).
43. **`deploy/test_publish_site.py`**: a test nothing runs (not gate.sh, not select.ts, not CI).
44. **`play/site/scripts/clone.py`**: clones legacy `maia/`/`aven/` paths into play, the direction CLAUDE.md now forbids.
45. **Per-intent one-off check scripts in play/site/scripts** (named for one intent's c2/c3/c4): `allwork-shots.ts`
    (7c8986c5), `characters-shots.ts` (89f3ad37), `library-shots.ts` (732d8a38), `dashboard-library-shots.ts`
    (1b2ebc8d; a 90 % copy of library-shots: 38 diff lines of 116), `intent-shots.ts` (bb3b0773),
    `story-room-hands.ts`, `story-room-shots.ts` (4d47a98c), `selector-shots.mjs` (6295a650). Each repeats BASE/PLAY/TOKEN
    and a `page.route('**/api/**')` proxy; their outputs live in `play/shots/` and `intent-work/`.
46. **Dead CSS in the website**: `website/src/app.css` defines 15 classes nothing uses (`.screen-*` ×11, `.app-dock`,
    `.foot-stack`, `.prose`, `.shifts`, `.tag-list`; roughly lines 97-130 and 199-445 of 445), legacy app-shell CSS.
47. **Option for what never varies**: `Manifesto.svelte:17,37,102` `banner` prop (one caller, always true) fed by a
    load function that returns a constant (`website/src/routes/+page.server.ts:4`).
48. **play/site's `test` script and vitest config run by nothing in CI or the gate** (see 52).
49. **`tools/ground-sets` is npm with package-lock** while everything else is bun (second lockfile format, second
    @noble/hashes pin).

Dependencies: every dependency in `play/site/package.json`, `play/api/package.json` and `website/package.json` is
imported (gsap and @fontsource-variable/inter only through node_modules paths, 27; @types/three for three). No unused
dependency found.

### Special cases

50. **Swallowed errors**: `FounderCounter.svelte:22`, `restore.sh:52` (docker login `|| true`), `server-care.sh:127,138`
    (`|| true` on fetches), `render.mjs:104,126`, `flyover/flyover.mjs:71,92,96,106`, `tools/motion/boxtime.mjs:122`,
    `tools/plant/organ.mjs:119`.
51. **Sleeps and retries papering over order**: `restore.sh:84` (`sleep 2` after pg_isready), `backup.sh:92-96` (sync
    retried 3× on GatewayTimeout), health loops with sleeps (`production.yml:271, 275-278, 320-323`,
    `restore.sh:95-100,131-136`), `main-green/action.yml:38-46` (13-minute poll).
52. **56 test files of play/site never run** (`find play/site/src play/site/scripts -name '*.test.*'`): `vite.config.ts:10`
    and `package.json:10` define them, but neither gate.sh, select.ts (`select.ts:97`: "play/site … no API test")
    nor play-checks.yml runs them. Some are HELD files (engine.test.ts, census tests).
53. **A broken default path**: `tools/plant/silhouette.cjs:21` and `nan-check.cjs:15` resolve `../../../../play/site`
    from `tools/plant/`, two levels above the repository (written for a skill folder): works only with `PLAY_SITE` set.
54. **Casts and opt-outs**: `website/vite.config.ts:9 as never`, `FounderCounter.svelte:7 @ts-nocheck`.
55. **`intents.yml`'s trailer extraction is shell over git log** (`intents.yml:44-48`) while every other reader is TS:
    the one place a malformed trailer is treated differently (case folding via `tr`).

## Fixes (fewest that remove the problems)

### F1 One box, one check list (problems 1-8, 24, 48, 52, 55-partial: 14 problems)
avenBOX's constants in one file (`play/avenbox/box.env`: PG version/port/password/URL, max_connections) sourced by
setup.sh, up.sh, gate.sh and read by intent.ts; one `wait_pg` and one `install_deps` function (in up.sh, setup.sh
calling it); bun's version in one `.bun-version` read by `oven-sh/setup-bun` (`bun-version-file`) and passed to the
Dockerfile as `ARG BUN_VERSION`; play-checks.yml and website-checks.yml run `bash play/avenbox/setup.sh` then
`bash play/avenbox/gate.sh --all api|site|website` (keeping job names); the gate gains a `site-tests` step (select.ts
picks it for play/site changes) so the 56 site tests run; the SessionStart hook becomes `bash play/avenbox/start.sh`.
- Files: `.github/workflows/{play,website}-checks.yml`, all `bun-version:` sites, `play/Dockerfile`, `play/avenbox/*`,
  `.claude/settings.json`, `play/site/package.json`, workflows/gate/avenbox tests. HELD: site tests under held paths
  (engine.test.ts, census) must pass or be left to their intents: partial HELD.
- Risk: CI time (apt Postgres vs a container; measure), site tests may be red on first run. Pinned by
  `workflows.test.ts:276-305`, `gate.test.ts`, `avenbox.test.ts`, `deploy-speed.test.ts:235-264`.
- Bound: `grep -rc 'postgres://postgres:play@' .github play/avenbox` sums to 1; `grep -rl 'max_connections' .github
  play/avenbox` = 1 file; `grep -rn '1\.4\.4' .github play/Dockerfile` = 0; `grep -c 'bun test\|tsc --noEmit\|bun run
  build' .github/workflows/*.yml` = 0; `gate.sh --all --plan | grep -c site-tests` = 1; settings.json command < 120 chars.

### F2 One play client and one intent vocabulary for scripts (problems 10-14, 29, 30, 40, 45-partial: 9)
`play/avenbox/play.ts`: `tool()`, `file()`, endpoint default, UUID and `INTENT_LINE` regexes, `intentsIn()`, the stage
list (one source shared with `play/api/src/skills.ts SKILL_STAGES`, e.g. a small `play/api/src/stages.ts` both import,
and the sparse checkouts widened to it). intent.ts, pr-intent.ts, skills.ts, live-audit.ts and the play/site scripts
import it; ship.ts and live-audit share the trailer regex; intents.yml calls a `bun play/avenbox/trailers.ts <range>`;
dead exports go. Optionally intents-pr's spec job reuses Intent named's verdict instead of judging again.
- Files: `play/avenbox/*.ts`, `play/api/src/ship.ts`, `.github/workflows/intents*.yml`, `intent-named.yml`,
  play/site/scripts (propose.mjs, flyover/play.mjs, shot scripts). HELD: `tools/sheet/fal.ts` (left).
- Risk: low; pinned by `workflows.test.ts:80-240` (Intent named, intents-pr), `avenbox.test.ts`, `ship.test.ts`.
- Bound: `grep -rl '"tools/call"\|'"'"'tools/call'"'"'' --exclude-dir=node_modules . | grep -v 'play/api/'` = 2 files
  (play.ts + HELD fal.ts); `grep -rn 'Intent:\\s\*(' play .github | grep -v test` = 1; `UUID_IN` = 0.

### F3 One deploy toolkit (problems 15-20, 23, 31, 32, 51-partial: 10)
`deploy/lib.sh` sourced by backup/restore/server-care: `s3 <access> <cmd>` (one aws-cli runner), `compose`, `health`
(compose's healthcheck status via `docker inspect`, one probe), container names once; `deploy/dns.sh set|remove`
(one Hetzner zone lookup); `deploy/server-up.sh` replaces production.yml's heredoc (run as `ssh prod bash -s <
deploy/server-up.sh` with env over stdin); production constants in one place (`deploy/prod.env` or the `prod-ssh`
action's outputs), and `prod-ssh` gains a `bucket-keys` input that checks and writes backup.env once. README and
server-care agree. Website probe hits `/`.
- Files: `.github/workflows/{production,restore,server}.yml`, `.github/actions/prod-ssh`, `deploy/*.sh`, `deploy/README.md`.
- Risk: high (production); only `workflows.test.ts` ("the way to production", "the server's care") pins text; nothing
  runs the scripts but a deploy and `restore.yml` check mode: run a restore check before and after.
- Bound: `grep -c AWS_REQUEST_CHECKSUM_CALCULATION deploy/*` sums to 1; `grep -rc 'hel1.your-objectstorage.com' .github
  deploy` = 1; `grep -rc 'dns.hetzner.com/api/v1/zones' .github deploy` = 1; `grep -rc 'docker compose -f' .github
  deploy` = 1; `grep -rc 'api/health' .github deploy docker-compose*.yml play/docker-compose.play.yml` ≤ 2;
  `production.yml` ≤ 200 lines; `grep -c 'BACKUP_BUCKET=%s' .github -r` = 1.

### F4 Legacy out of production (problems 21, 22, 33-38, 39: 9; needs Samuel's word on the server's legacy api and old backups)
Drop the legacy `api` service, `API_ADDRESS` and the aven.maia.city block; play gets its own compose file (db + caddy +
play-api) or the base file shrinks to those; SSH by the Pulumi ipv4 (or a host name of its own); delete
`play/deploy/Caddyfile.play`, `after-import.sql`, the founders grants, the cron removal, the tobucket step and the
folder-store/blobs.tar branches once every pre-2026-11-05 snapshot is past its keep (or one last conversion); stale
comments; `prod-ssh`'s `wait`.
- Files: `docker-compose*.yml`, `play/docker-compose.play.yml`, `deploy/Caddyfile`, `play/deploy/*`, `deploy/*.sh`,
  `production.yml`, `server.yml`, `prod-ssh`, `play/api/src/tobucket.ts` (play/api area).
- Risk: high; check on the server that nothing answers at api.maia.city/aven.maia.city first; pinned only by
  `workflows.test.ts:241-275` and a restore check.
- Bound: files deleted: `play/deploy/Caddyfile.play`, `play/deploy/after-import.sql`; `grep -rcE 'founders|passkeys'
  play/deploy` = 0; `grep -rcE 'aven(/|\.maia)|API_ADDRESS|api\.maia\.city' deploy docker-compose*.yml .github` = 0;
  `grep -rcE 'blobs\.tar|play-folder-blobs|tobucket|maia-city-backup' deploy .github` = 0.

### F5 Required checks named once (problem 9: 1)
`.github/required-checks.json` (the two names) read by main-green (default), passed as tested-tree's CHECK, imported by
`substate.ts`; a test asserts main.yml's composed job names equal it.
- Risk: low; pinned by `deploy-speed.test.ts:235-264`, `workflows.test.ts:60`, ship/substate tests.
- Bound: literal `play / API and site` in non-test, non-doc files = 1.

### F6 Nothing dead, nothing unrun (problems 41-45, 49: 6)
Delete `.claude/launch.json` (or give it play/site's cwd), `clone.py`, `deploy-time.ts` (or make it a check's run,
repo from env); run `test_publish_site.py` in the gate when `deploy/` changes; move the eight per-intent shot scripts to
`intent-work/<id>/` (outputs beside them) or onto one `play/site/scripts/shots/kit.ts`; merge library/dashboard-library
shots; ground-sets onto bun.
- Risk: low (no test imports them; check `intent-work` READMEs that name them).
- Bound: files gone: 4+; `ls play/site/scripts/*shots*` = 0 (or each < 60 lines importing kit.ts);
  `select.ts` maps `deploy/` to a step; `find tools -name package-lock.json` = 0.

### F7 The website on its own constants (problems 25, 46, 47, 50-partial, 54: 5)
FounderCounter uses `PLAY`; the dead 15 classes go from app.css; `banner` prop and `+page.server.ts` go; stale comments;
typed vite config; no `@ts-nocheck`.
- Risk: low; pinned by `bun run check && bun run build` (website) and a look.
- Bound: `grep -c 'play.maia.city' website/src/lib/*.svelte` = 0; unused-class script over app.css = 0;
  `website/src/app.css` ≤ 200 lines; `website/src/routes/+page.server.ts` deleted.

### F8 tools find play/site one way, and read play's documents from play (problems 26, 27, 28, 53: 4)
`tools/site.mjs` resolving `PLAY_SITE` (default `../play/site` from the repo root) used by motion and plant (character
HELD); `tools/motion` reads pieces/assets from play by hash once b9e6ad45 is accepted, dropping the mirror and
`proposed.json`; a check that every committed path a skill names exists (run by skills.ts at session start).
- Risk: medium; pinned by `bun tools/motion/check.ts …` (an intent's checks) only.
- Bound: `grep -rn '\.\./\.\./\.\./\.\./play' tools` = 0; `grep -rlc '\.\./\.\./play/site' tools/motion tools/plant` = 1
  file; `tools/motion/pieces` and `assets` gone (or 0 files).

Next untangles (HELD): `tools/sheet/fal.ts`'s MCP client (F2), `tools/character/*` site paths (F8), held site tests
(engine.test.ts, census/*.test.ts, biomes/render tests) entering the gate (F1), `play/site/scripts/census*` and
`bench-smoke.sh`.
