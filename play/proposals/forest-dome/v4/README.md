# Forest dome v4 — the terrace on the arcade

Proposed over play's MCP on 2026-11-05 as version 4 of buildings/forest-dome (asset cac16350-08a4-4d51-8cdf-3ade5f61836e,
base v3 92716408…), proposal 76c3acac-1c05-4240-be63-1ecb5c8399b1. What it changes: `note.md`.

- `forest-dome-v4.js` — the whole readable source as proposed.
- `30-outside.js` — its outside part (the arcade, the terrace, its stairs, pergolas and furnishing), which replaces
  v3's lines 2485–3409; `make.py` assembles v4 from v3's source (fetched from play by its source hash) and this part.
- `route1.json` — the walk tested with `play/site/.dome/walksim.mjs` (the viewer's walker rules, in node).
- `renders/` — the render bench's pictures (stand-in plants of legacy versions; play draws its own).

## v5 — roots stay in their pots

Proposed on 2026-11-05 on base v4 421d9ce3… (accepted), proposal c303f544-b447-4934-8583-eab1e58e5404:
`forest-dome-v5.js` (the whole source), `note-v5.md`. The terrace's pots hold lemons in their second year in great
conche; the troughs hold herbs; the rooms' banana and coffee pots hold young lemons. A plant's roots are part of
its build, so only plants whose roots fit go into a pot (`play/site/.dome/roots2.mjs` measures them by stage).
`30-outside.js` and `make.py` are v5's (make.py also applies the plan's and the rooms' changes to v3's source).
