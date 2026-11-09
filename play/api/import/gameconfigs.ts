// The game's configs kept in the repo as they were first made (./gameconfigs/: the levelling first): each written into
// play's Postgres as the v1 of its Loro document (../src/gameconfigs.ts) only when play holds no config of its id yet.
// From then on play's Postgres is the source of truth: a config changes only by proposal (over MCP), and nothing here
// writes over it. Run with every deploy, by ./run.ts.
import type { Db } from "../src/kit/pg";
import { seedDoc } from "../src/versioned";
import { GAME_CONFIG } from "../src/kit/ids";
import { levelling } from "./gameconfigs/levelling";
import "../src/allkinds";

export { levelling };
export type GameConfigsReport = { seeded: string[]; present: string[]; errors: string[] };

export const GAME_CONFIGS = [
  {
    id: GAME_CONFIG.levelling,
    at: new Date("2026-11-04T12:00:00Z"),
    note: "First version: 16 levels from 1 villager in a tent to 1,597 with three master domes and an enhanced geothermal plant; €12,500 and 50,000 hearts a villager, an investor adding 2× to 8× the new villagers' euros at each level",
    json: levelling,
  },
];

export async function seedGameConfigs(db: Db): Promise<GameConfigsReport> {
  const out: GameConfigsReport = { seeded: [], present: [], errors: [] };
  for (const c of GAME_CONFIGS) {
    try {
      if (await seedDoc(db, "game_config", { id: c.id, json: c.json(), note: c.note, at: c.at })) out.seeded.push(c.id);
      else out.present.push(c.id);
    } catch (e) {
      out.errors.push(`${c.id}: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
    }
  }
  return out;
}
