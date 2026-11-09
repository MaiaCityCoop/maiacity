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
