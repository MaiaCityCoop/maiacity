# Intent 873c6ef2: the shared copies become pieces (work branch, never merged)

This is play's work, not code. It is kept here while the intent is held on 7c8986c5 and on how play accepts pieces that
require pieces. Nothing in it is imported by play or the website.

- `heads/`: the 14 hosts' heads as play holds them (doc_at, 2026-11-07).
- `regions/`: each copied region's text.
- `build.mjs` (`node build.mjs`): writes `out/pieces/<key>.js` (each piece: its requires, the copy's text as it
  was, module.exports), `out/hosts/<host>.js` (each host's next source, each copy replaced by a require of its
  piece's hash) and `out/plan.json` (hashes, sizes).
- `fp.mjs <source> [out/pieces]`: builds every recipe a source holds, headless, its pieces run as the box runs them,
  and prints a geometry fingerprint per recipe. `fp/<host>.head.txt` and `fp/<host>.next.txt` are the results; all 59
  recipes are the same.
- `edit-piece.mjs <key>`: doc_edits a piece onto the intent. `docs.json` holds the piece documents' UUIDs.
- Run with `npm i eslint-scope@8 acorn@8 @noble/hashes@1` here and three from `play/site/node_modules`.
