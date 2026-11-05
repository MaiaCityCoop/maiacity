# The forest dome and its things, ready to propose to play

An 80 m food-forest dome for play's Buildings (Samuel 2026-11-05) and the 31 pieces of furniture that furnish it, each
its own asset of the Things group. Built, rendered and walk-tested in the session that made them; what is left is to
propose them over play's MCP as an admin's agent (this folder is only how they reach that session: once accepted, play's
database is their source of truth, and this folder can go).

- `forest-dome.js` — the dome's readable source (349 kB). `notes/forest-dome.md` its proposal note.
- `things/<slug>.js` — each thing's readable source; `notes/<slug>.md` its note; `things.json` each slug's label and the
  hash of the recipe file play will make of it as version 1 (`RECIPE_HEAD + source + recipeTail(slug, 1, null)`), the
  hash the dome names it by.
- `parts/` — how they were made: the dome's parts (`src/NN-*.js`, joined in order), the things' own parts
  (`things-src/`), the shared kit (`src/01-core.js`, `src/05-materials.js`) and `make.mjs` (`node make.mjs` remakes
  `forest-dome.js`; `node make.mjs things` remakes the things, `things.json` and `src/15-things.js` first).
- `renders/` — pictures of it as play's viewer shows it.
- `run.sh` — proposes everything in order (below).

What the dome names, by hash: its 31 things (proposed with it, pending until accepted), 27 plants of play's library
(`src/10-plan.js` `PLANTS`: their newest versions as of 2026-11-05, among them avocado v3, orange v2, lemon v2, papaya
v2 and banana v2) and the biome 'Food forest under glass' (biomes/warm-food-forest@1). The viewer draws each where the
dome marks it (play/site `assets/plantings.js`, live since #1997) and lays the biome on its forest floor.

## Proposing (for the session that holds `PLAY_MCP_TOKEN`)

From the repository's root, with `PLAY_MCP_TOKEN` (an admin's token, made on play's profile page) in the environment:

1. Check the token: `curl -s -H "Authorization: Bearer $PLAY_MCP_TOKEN" https://play.maia.city/api/me` names an admin.
2. Check what the dome names against play's catalog, proposing nothing:
   `node play/site/scripts/propose.mjs --file play/proposals/forest-dome/forest-dome.js --check --pending play/proposals/forest-dome/things.json`
   Every plant and the biome must be found (the things show as pending). If a plant is MISSING (its hash differs from the
   version play holds), the script names the newest version play has of it: put that hash (and its `v`) into
   `parts/src/10-plan.js` `PLANTS`, run `node play/proposals/forest-dome/parts/make.mjs`, and check again. Say so in the
   dome's note.
3. Propose: `bash play/proposals/forest-dome/run.sh` — the 31 things first (each `propose_asset` in the Things group, its
   label from `things.json`, its slug its file name, its note from `notes/`), then the dome (`propose_asset`, Buildings,
   label "Forest dome · 80 m", slug `forest-dome`). It stops at the first refusal. Each answer gives the proposal's id
   and the recipe hash play made: it must equal the hash in `things.json` (for the dome, the one `make.mjs` prints),
   or the dome would name a thing that never comes.
4. Tell Samuel the proposals are on https://play.maia.city/proposals/ : accept the things first (or together with the
   dome); the dome draws a thing only once it is accepted. Nothing is accepted over MCP.

## Checked

- Box budgets, in node as the box builds it: 853k triangles, 33 pictures, 11 lights, 1,236 marks; 3.6–4.5 s.
- play's own checks of a source (lines < 1000, readable, `module.exports.recipe`): the dome and all 31 things pass.
- Walked with the viewer's walker rules (play/site `assets/hero.js` walkOf, `sandbox-kit/walker.js`): south gate →
  paths → bridge → clearing → plaza → grand stair → a first-floor suite; plaza → each spiral stair → the sky garden;
  plaza → hall → north gate. Every step ≤ 0.18 m.
- Rendered in play's render bench with every plant, the biome and every thing drawn (none missing).
