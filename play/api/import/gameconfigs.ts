// The game's configs kept in the repo as they were first made (./gameconfigs/: the levelling first): each written into
// play's Postgres as the v1 of its Loro document (./seeddocs.ts) only when play holds no config of its id yet.
// From then on play's Postgres is the source of truth: a config changes only by proposal (over MCP), and nothing here
// writes over it. Run with every deploy, by ./run.ts.
import type { Db } from "../src/kit/pg";
import { seedDocs, type Seed } from "./seeddocs";
import { GAME_CONFIG } from "../src/kit/ids";
import { levelling } from "./gameconfigs/levelling";

export { levelling };

export const GAME_CONFIGS: Seed[] = [
  {
    id: GAME_CONFIG.levelling,
    at: new Date("2026-11-04T12:00:00Z"),
    note: "First version: 16 levels from 1 villager in a tent to 1,597 with three master domes and an enhanced geothermal plant; €12,500 and 50,000 hearts a villager, an investor adding 2× to 8× the new villagers' euros at each level",
    json: levelling,
  },
];

export const seedGameConfigs = (db: Db) => seedDocs(db, "game_config", GAME_CONFIGS);
