// Skills (play/SPEC.md §4.14, Samuel 2026-11-06; intent a90151df: play's database the one source of every skill): what
// each teaches, read from Main on each request (initialize's instructions, an intent's `brief`, MCP's prompts).
import type { Queryable } from "./kit/pg";
import * as docs from "./docs";
import { SKILL } from "./kit/ids";
import { HttpError } from "./kit/errors";
import { intentRow } from "./intents";
import { INTENT_STAGES, stagedBody, stagesSaid, type IntentStage } from "./kit/stages";

export const docIdOf = (skill: string) => `skill:${skill}`;
/** the skills whose `system` makes the system prompt, in this order: who the agent is, then the intents */
const SYSTEM_SKILLS = [SKILL.avenmaia, SKILL.intents];
// ---- what it teaches: the system prompt, an intent's brief, the prompts

/** a skill as accepted (its document's main line), or null where play holds none of that id */
async function accepted(db: Queryable, id: string): Promise<any | null> {
  const { rows } = await db.query(`SELECT 1 FROM play.records WHERE id = $1 AND kind = 'skill'`, [id]);
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
const SKILL_PROMPT = /^skill:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** a skill's whole text as one prompt: its description, its body (or its system part and stages, avenMAIA's and the
 *  Intents skill's), and the index of its references, each read whole with doc_at (a file by its hash from play's files) */
function skillText(id: string, s: any): string {
  const body = `${s.body ?? ""}`.trim() || stagedBody(s);
  const refs = (s.references ?? []).map((r: any) => `- ${r.path}: ${typeof r.text === "string" ? `text, ${r.text.length} characters` : `file ${r.file}${r.type ? ` (${r.type})` : ""}`}`);
  const parts = [`# ${s.label}`, `${s.description ?? s.note ?? ""}`.trim(), body];
  if (refs.length) parts.push(`## References\n\nSkill ${id}'s references, each whole in doc_at's json.references (a file by its hash from play's files):\n\n${refs.join("\n")}`);
  if (s.uses?.length) parts.push(`Uses the skills ${s.uses.map((u: string) => `skill:${u}`).join(", ")}.`);
  return parts.filter(Boolean).join("\n\n");
}

/** MCP's prompts: one for each of an intent's stages the Intents skill says something for, its argument the intent's
 *  id; then every skill, named `skill:<its UUID>`, its whole text */
export async function promptsOf(db: Queryable) {
  const s = await accepted(db, SKILL.intents);
  const stages = stagesSaid(s?.stages).map((st) => ({
    name: `intent_${st}`,
    title: `An intent at ${st[0].toUpperCase()}${st.slice(1)}`,
    description: `What to do with an intent at the ${st} stage (the Intents skill's ${st} part, ${SKILL.intents}), for the intent named by its id.`,
    arguments: [{ name: "intent", description: "the intent's id (a UUID: list_intents gives it)", required: true }],
  }));
  const { rows } = await db.query(`SELECT id FROM play.records WHERE kind = 'skill' ORDER BY created, id`);
  const skills = [];
  for (const { id } of rows as { id: string }[]) {
    const k = await accepted(db, id);
    if (!k) continue;
    skills.push({ name: `skill:${id}`, title: `${k.label}`, description: `${k.description ?? k.note ?? k.label}`.trim() || `${k.label}`, arguments: [] });
  }
  return [...stages, ...skills];
}

/** One prompt: a skill's whole text (`skill:<id>`), or for intent `intent` the Intents skill's text for its stage,
 *  filled. */
export async function promptOf(db: Queryable, name: unknown, args: any) {
  const k = SKILL_PROMPT.exec(`${name ?? ""}`);
  if (k) {
    const s = await accepted(db, k[1]);
    if (!s) throw new HttpError(`There is no prompt ${name} (prompts/list).`, 404);
    return { description: `The skill ${s.label} (${k[1]})`, messages: [{ role: "user", content: { type: "text", text: skillText(k[1], s) } }] };
  }
  const m = STAGE_PROMPT.exec(`${name ?? ""}`);
  if (!m || !INTENT_STAGES.includes(m[1] as IntentStage)) throw new HttpError(`There is no prompt ${name} (prompts/list).`, 404);
  const i = await intentRow(db, `${args?.intent ?? ""}`);
  const brief = await briefOf(db, i, m[1]);
  if (!brief) throw new HttpError(`The Intents skill says nothing for the ${m[1]} stage.`, 404);
  return { description: `Intent ${i.id} ("${i.title}"), at the ${m[1]} stage`, messages: [{ role: "user", content: { type: "text", text: brief } }] };
}
