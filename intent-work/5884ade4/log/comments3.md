# Comments, third sweep (intent 5884ade4): 9,550 → 9,220 comment lines

Samuel's rule: a comment that restates the implementation goes, even phrased as a why; one about something outside the
code (a person's decision with its date, an intent, a SPEC section, a browser/GPU/proxy/GitHub quirk, a measured number,
a CLI's usage) stays. A header retelling SPEC keeps its pointer line and the decisions.

Comment-only commits, one folder each. Each file's code is shown unchanged: Bun's transpiler output (comments dropped)
compared before and after, identical for every file.

1. play/avenbox: vs-main.ts, intent.ts, select.ts (-54). Pinned: transpiler output; vs-main.test.ts (its one failure,
   "the command line …", fails the same on the untouched tree here: it measures a file against origin/main).
2. play/site/scripts/macjob: dry.ts, dry/playwright.ts, determinism.js.
3. play/site/scripts/census: box, settle, tree, viewer, match, own-versions, same (not the held census files).
4. play/site/scripts: intents-reach, world-shot, intent-shots, propose.mjs (its line on the Proposals page, gone, too).
5. play/site/src/routes/game-editor/levels.ts: field doc lines that repeat their names; Samuel's rules kept. vitest of
   the folder: 9 pass.
6. play/api/src: kinds, stories, substate, pieces. `gate.sh api` green.
7. play/api/test/kit.ts. `gate.sh api` green.

Held files untouched (held.sh before each commit).
