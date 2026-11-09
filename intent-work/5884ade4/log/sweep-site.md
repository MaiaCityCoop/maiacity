# Sweep of play/site (fixes 4, 5 and 7, and the layers left): the moves

Branch `intent/5884ade4-u-sweep-site`, from `intent/5884ade4-untangle` 2a93b59 (fixes 1, 2, 3 and 6 merged). Held set
refreshed with `held.sh` from `held-intents.txt` before each commit (153 files, 131 of them in play/site).

Before, play/site's non-held files: layers 16 (all of the repo; at most 10), swallowed errors 17 (src 15, scripts 2),
`as any` 34 (src 20, scripts 14), comment lines 6,095; the 11 dead exports, 9 of them play/site's.

## Moves

1. **The site's client and scripts take the hash from the kernel** (layers: `lib → content/game`). `lib/api.ts`,
   `scripts/{world-shot,webkit-world,box-worker}.ts` and two stories tests imported `hashText`/`hashBytes` through
   `content/game/hash.js`, a re-export of `kernel/hash.js`; they import the kernel now. The re-export stays for the
   held `stories/compose.ts`, `stories/live-runtime.ts`, `scripts/live-runtime.ts` and their tests. Pinned: the same
   functions (one `export *`); gate site, `stories/{inputs,world}.test.ts`.
2. **The intents' modal state to `site/app`** (layers: `site/app → site/intents`, and with it `site/intents →
   content/worlds`). `intents.svelte.ts` holds only whether the board's modal is open and its focus: the nav pill's
   state, as `pill.svelte.js` and `back.svelte.js` beside it. In `site/app` the stabler folder no longer leans on the
   board's; `site/intents` rises to I=0.73, above `content/worlds` (0.67), so BuildView's and IntentDetail's
   WorldStage are no longer an upward import. Pinned: the same module, moved; gate site, `src/lib/site` tests (56).
3. **Each dome-cell page pinned beside itself** (layers: `routes/sandbox-1 → content/sandbox-2/interior`). Sandbox 5's
   test imported Sandbox 1's page, which made `routes/sandbox-1` a folder something leans on (I=0.80, below the
   interior's 0.83). Each page's served-HTML snapshot now sits in its own route's `page.test.ts`; the two snapshots are
   byte-identical to the one file's before.
4. **Playwright looked for, no other error swallowed** (special: swallowed, scripts 2 → 0). `scripts/render.mjs` and
   `scripts/flyover/flyover.mjs` tried each place Playwright may be installed with an empty `catch`: a broken install
   was taken for none. Now only `MODULE_NOT_FOUND` (Node's and Bun's code for it, checked) moves to the next place;
   anything else is thrown. Pinned: `node --check`; both are run by hand (`bench-smoke.sh`, the flyover's lists).
5. **`span` and `took` into `lib/format.ts`** (layers, with move 6: `site/intents → stories`). `site/intents/took.ts`
   said how long something took, for the intent detail and the delivery page: a way of writing a number, beside
   `format.ts`'s dates. The delivery route no longer leans on the board's folder. Pinned: the same functions, moved;
   gate site, `src/lib/site` tests; svelte-check's errors unchanged (13, all in held files, `pieces` and vite.config).
