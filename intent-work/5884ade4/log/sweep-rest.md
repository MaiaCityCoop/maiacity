# Sweep of fixes 4, 5 and 7 in play/api/src, play/avenbox, tools, website, deploy (intent 5884ade4)

Not touched: held files (`held.sh` before each commit; play/api/src/assetdocs.ts, graphs.ts, lod.ts, play/avenbox/setup.sh),
tools/sheet (held), tools/motion's mirror of play's documents (`pieces/`, `assets/`, `baseline/`: held to their hashes
in `proposed.json`, waits for b9e6ad45), play/api/test, scripts and import (the tests builder's).

## 1. Dead: ship.ts's `Pending` unexported (fix 4)

- Used only in ship.ts. Pinned: `gate.sh api` (tsc, 329 tests).
