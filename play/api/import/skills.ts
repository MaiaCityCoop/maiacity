// The skills kept in the repo as they were first written (./skills/: avenMAIA and the Intents skill): each written into
// play's Postgres as the v1 of its Loro document (./seeddocs.ts) only when play holds no skill of its id yet. From
// then on play's Postgres is the source of truth: a skill changes only by proposal (over MCP), and nothing here writes
// over it. Run with every deploy, by ./run.ts.
import type { Db } from "../src/kit/pg";
import { seedDocs, type Seed } from "./seeddocs";
import { SKILL } from "../src/kit/ids";
import { avenmaia } from "./skills/avenmaia";
import { intents } from "./skills/intents";

export { avenmaia, intents };

export const SKILLS: Seed[] = [
  {
    id: SKILL.avenmaia,
    at: new Date("2026-11-06T12:00:00Z"),
    note: "First version: who every agent connected over MCP is and what it does on play, and the Artifacts' rule, moved from play/api/src/mcp.ts's initialize and artifacts.ts",
    json: avenmaia,
  },
  {
    id: SKILL.intents,
    at: new Date("2026-11-06T12:00:01Z"),
    note: "First version: the intents' lifecycle and each stage's instructions, moved from play/api/src/mcp.ts (initialize, list_intents) and the intents' board's briefs, with Ship (intent d29933ff-3636-4148-8df7-c183c6065216)",
    json: intents,
  },
];

export const seedSkills = (db: Db) => seedDocs(db, "skill", SKILLS);
