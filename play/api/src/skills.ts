// Skills (play/SPEC.md §4.14, Samuel 2026-11-06): what play teaches its agents, kept once, in play's Postgres. Each is a
// Loro document, `skill:<id>` (its schema a document, ./ids.ts SCHEMA.skill), one kind of ./versioned.ts, versioned as every other kind
// is (doc_edit, propose_doc_version; its History tab on /skills/): its `system`, its part of the system prompt every
// agent connected over MCP gets (initialize's instructions are the system skills' parts, ./ids.ts SKILL, read on each
// request), and the Intents skill's `stages`, what to do at each of an intent's stages (an intent's `brief`,
// get_intent and the intents' board; MCP's prompts). What is here is only what is a skill's own: what it teaches, from
// Main. `play.skills` holds each skill's id, label and group, both only shown: a skill is named by its id.
import type { Queryable } from "./pg";
import * as docs from "./docs";
import { SKILL } from "./ids";

export class SkillError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** an intent's stages, each a part of the Intents skill (./intents.ts INTENT_STAGES, the same list; the skill schema names them) */
export const SKILL_STAGES = ["idea", "specify", "build", "proposal", "ship", "accepted", "archived"] as const;
export type SkillStage = (typeof SKILL_STAGES)[number];
export const docIdOf = (skill: string) => `skill:${skill}`;
/** the skills whose `system` makes the system prompt, in this order: who the agent is, then the intents */
export const SYSTEM_SKILLS = [SKILL.avenmaia, SKILL.intents];
// ---- what it teaches: the system prompt, an intent's brief, the prompts

/** a skill as accepted (its document's main line), or null where play holds none of that id */
async function accepted(db: Queryable, id: string): Promise<any | null> {
  const { rows } = await db.query(`SELECT 1 FROM play.skills WHERE id = $1`, [id]);
  return rows.length ? (await docs.readDoc(db, docIdOf(id))).json : null;
}

/** The system prompt every agent connected over MCP gets (initialize's instructions): the system skills' parts as accepted, in order. */
export async function instructionsOf(db: Queryable): Promise<string> {
  const parts: string[] = [];
  for (const id of SYSTEM_SKILLS) {
    const s = await accepted(db, id);
    if (s?.system?.trim()) parts.push(s.system.trim());
  }
  return parts.join("\n\n");
}

/** a stage's text with the intent's id and title in it */
const filled = (t: string, i: { id: string; title: string }) => t.replace(/\{(intent|title)\}/g, (_, k) => (k === "intent" ? i.id : i.title));

/** What an agent sent to intent `i` does now: the Intents skill's text for stage `stage` (its own, if none is named), filled; null where it says nothing. */
export async function briefOf(db: Queryable, i: { id: string; title: string; stage: string }, stage: string = i.stage): Promise<string | null> {
  const s = await accepted(db, SKILL.intents);
  const t = `${s?.stages?.[stage] ?? ""}`.trim();
  return t ? filled(t, i) : null;
}

const STAGE_PROMPT = /^intent_([a-z]+)$/;

/** MCP's prompts: one for each of an intent's stages the Intents skill says something for, its argument the intent's id */
export async function promptsOf(db: Queryable) {
  const s = await accepted(db, SKILL.intents);
  return SKILL_STAGES.filter((st) => `${s?.stages?.[st] ?? ""}`.trim()).map((st) => ({
    name: `intent_${st}`,
    title: `An intent at ${st[0].toUpperCase()}${st.slice(1)}`,
    description: `What to do with an intent at the ${st} stage (the Intents skill's ${st} part, ${SKILL.intents}), for the intent named by its id.`,
    arguments: [{ name: "intent", description: "the intent's id (a UUID: list_intents gives it)", required: true }],
  }));
}

/** One prompt, for intent `intent`: the Intents skill's text for its stage, filled (`intentRow` reads the intent as the board does). */
export async function promptOf(db: Queryable, name: unknown, args: any, intentRow: (db: Queryable, id: string) => Promise<{ id: string; title: string; stage: string }>) {
  const m = STAGE_PROMPT.exec(`${name ?? ""}`);
  if (!m || !SKILL_STAGES.includes(m[1] as SkillStage)) throw new SkillError(`There is no prompt ${name} (prompts/list).`, 404);
  const i = await intentRow(db, `${args?.intent ?? ""}`);
  const brief = await briefOf(db, i, m[1]);
  if (!brief) throw new SkillError(`The Intents skill says nothing for the ${m[1]} stage.`, 404);
  return { description: `Intent ${i.id} ("${i.title}"), at the ${m[1]} stage`, messages: [{ role: "user", content: { type: "text", text: brief } }] };
}
