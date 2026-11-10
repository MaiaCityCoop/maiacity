# Sweep of fixes 4, 5 and 7 in play/api/src, play/avenbox, tools, website, deploy (intent 5884ade4)

Not touched: held files (`held.sh` before each commit; play/api/src/assetdocs.ts, graphs.ts, lod.ts, play/avenbox/setup.sh),
tools/sheet (held), tools/motion's mirror of play's documents (`pieces/`, `assets/`, `baseline/`: held to their hashes
in `proposed.json`, waits for b9e6ad45), play/api/test, scripts and import (the tests builder's).

## 1. Dead: ship.ts's `Pending` unexported (fix 4)

- Used only in ship.ts. Pinned: `gate.sh api` (tsc, 329 tests).

## 2. `as any` replaced by the types the code has (fix 5): play/api/src 36 → 1, tools/motion 1 → 0, pr-intent.ts 1 → 0

- One commit per file (app, artifacts, auth, docs/core, intents, kinds, kit/pg, sandboxes, ship, substate, versioned,
  watcher): the libraries' own types (Bun's `SQL.unsafe` and `Timer`, @simplewebauthn's `transports: string[]`, Loro's
  `set`/`insert` take `unknown`), narrowing by `in` (an edit's `{ id }`, a config's `{ slot }`, a proposal's `number`),
  the row types (`Work`'s REFS, `Row.work`), `keyof ArtifactGiven`, a check's result as given (`ResultGiven`), `tx as Db`
  where Ship's reconcile hands its transaction to decideWork (as before; a typed cast, not any). None was about a
  library's missing type, so none is kept. The one left is prose in intenttools.ts' retire_doc description ("as any
  work"), a tool description pinned byte for byte: left as it is.
- tools/motion/check.ts: the knees a typed tuple. pr-intent.ts: GitHub's pull request and commits typed (`getJson<T>`).
- Pinned: `gate.sh api` (tsc, 329 pass) after the batch; `check.ts twist` and `directions` all ok; workflows.test.ts.

## 3. Swallowed errors in tools and play/avenbox (fix 5): 4 → 2

- pr-intent.ts: the intent's earlier pull request it could not read was noted "closed"; now "unread: <why>".
- tools/ground-sets: an unreadable ambient occlusion map still lit as open, now with a warning naming the set.
- tools/plant/organ.mjs: no playwright anywhere throws saying so (was: reading `chromium` of undefined); its
  look-up's empty catch kept with a comment, as boxtime.mjs's Chromium look-up (each try failing is the point).
- Pinned: workflows.test.ts; `node --check` (neither tool runs in CI: they render by hand).

## 4. Comments (fix 7): play/api/src 1,928 → 1,602, tools 582 → 574 (675 → 667 with the held tools/sheet), files gone 8 → 0

- Comment-only commits, one file or folder each, every one checked to leave every code line as it was (a script
  comparing non-comment lines with HEAD). Headers that restated SPEC (stories §12, intents and ship §4.12, versioned
  §4.15, retire, skills) are one to three lines: the SPEC section, Samuel's decisions with their dates, the intents
  behind a rule. Doc comments repeating a name or a body went. Paths in comments made relative to the file
  (docs/schemas, docs/validate, kit/ids, sandboxes). tools/ground-sets' generated header names `$lib/kernel/files.js`,
  and play/site's biomes/sets.js carries it as the generator writes it (one comment line, nothing drawn changes).
- tools: its comments are mostly usage and the captures' measured quirks; only restatements went. Bound: 582 ≤ 600 for
  tools' non-held files (tools/sheet held, 93 lines); counted with sheet, 667.
- play/avenbox, website, deploy: no comment added (113, 83, 8).

## Left

- intenttools.ts' "as any work" (a tool description). deploy/deploy-time.ts counted by `dead`'s file list: alive (infra).
