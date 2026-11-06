// The Game editor (Samuel 2026-11-04, play/SPEC.md §4.9): each of the game's configs (first the levelling: how a
// village grows, level by level, what it unlocks, what villagers and investors bring and the minds they get) is a Loro
// document, `game:<uuid>` (its type by its kind: levels/1 now, ./docs/schema.ts), versioned like every other
// (./versioned.ts, play/SPEC.md "Version control"): drafted edit by edit in an intent variant (doc_edit), proposed
// (propose_doc_version), seen field by field on the intents' board and opened in the Game editor as it would be, then
// accepted or archived by a person. Admins only, as the Game editor is.
import type { Db } from "./pg";
import { register, seedDoc } from "./versioned";

/** the levelling's JSON, said for an agent (MCP) */
export const LEVELS_FORMAT =
  "The levelling config is { schema: 'levels/1', label, note, villager: { euros, hearts } (what each new villager brings), minds: { heartsPerMind, step, heartsPerEuro } (a mind costs heartsPerMind + step × (level − 1) hearts, or that over heartsPerEuro in euros), " +
  "levels: [{ id, villagers (the count that reaches it: Fibonacci 1, 2, 3, 5, 8 …), phase, investor (the investor's ticket as a multiple of the euros the level's new villagers bring), unlocks: [{ label, cost (euros), kind? }], note? }] }. " +
  "The Game editor works out the rest: each level's new villagers, their euros and hearts and the minds they get, the investor's euros and minds and share, the minds minted, and the treasury in euros (raised and left after building), hearts and minds.";

export const GAME_CONFIG = register({
  kind: "game",
  work: "game_config_version",
  title: "Game config",
  grp: "game",
  format: LEVELS_FORMAT,
  listItem: (json) => ({ schema: json.schema }),
});

/** A config's first version, as v1 (the deploy's import, ../import/gameconfigs.ts): only when play holds none of its id. */
export const seedGameConfig = (db: Db, o: { id: string; json: any; note: string; at?: Date }) => seedDoc(db, { kind: "game", uuid: o.id, json: o.json, note: o.note, at: o.at });
