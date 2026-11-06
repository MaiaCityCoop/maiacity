// Skills (play/SPEC.md §4.14, Samuel 2026-11-06): what play teaches its agents, kept once, in play's Postgres. Each is a
// Loro document, `skill:<id>` (skill/1, ./docs/schema.ts), every step kept with its author, message and time, its
// versions numbered on accept: its `system`, its part of the system prompt every agent connected over MCP gets
// (initialize's instructions are the system skills' parts, ./ids.ts SKILL, read on each request), and the Intents
// skill's `stages`, what to do at each of an intent's stages (an intent's `brief`, get_intent and the intents' board;
// MCP's prompts). A skill changes only by proposal, as a game config does (./gameconfigs.ts, which this follows step
// for step): an agent drafts a change step by step (skill_edit, each step checked whole) and proposes the draft
// (propose_skill_version, a `skill_version` intent whose branch is the draft); admins see it field by field on the
// intents' board, then accept or archive it. Admins only, as every MCP tool is. `play.skills` holds each skill's id,
// label and group, both only shown: a skill is named by its id.
import { COOP, Denied, type Me } from "./access";
import type { Db, Queryable } from "./pg";
import * as docs from "./docs";
import { EditError } from "./docs/core";
import { SKILL_STAGES } from "./docs/schema";
import { SKILL } from "./ids";
import { named } from "./stories";
import { overlap } from "./storydocs";
import { UUID } from "./uuid";
import { closeWork, intentIdOf, putAtProposal, settle, WorkError } from "./work";

export class SkillError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type SkillStage = (typeof SKILL_STAGES)[number];
export const docIdOf = (skill: string) => `skill:${skill}`;
/** the skills whose `system` makes the system prompt, in this order: who the agent is, then the intents */
export const SYSTEM_SKILLS = [SKILL.avenmaia, SKILL.intents];
const iso = (d: Date | string) => new Date(d).toISOString();
const authorOf = (me: Me, via: "web" | "mcp"): docs.Author => ({ human: me.id, via: via === "mcp" ? "mcp" : "site" });

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins read and change the skills, for now.");
  return me;
}
function idOf(id: unknown): string {
  const s = `${id ?? ""}`;
  if (!UUID.test(s)) throw new SkillError("Name the skill by its id, a UUID (list_skills).", 404);
  return s;
}
function text(v: unknown, what: string, most: number): string {
  if (typeof v !== "string" || !v.trim()) throw new SkillError(`${what} is missing.`);
  if (v.length > most) throw new SkillError(`${what} is longer than ${most} characters.`);
  return v.trim();
}
async function asSkillError<R>(run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof docs.DocError) throw new SkillError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof EditError) throw new SkillError(e.message);
    throw e;
  }
}
async function exists(q: Queryable, id: string): Promise<void> {
  const { rows } = await q.query(`SELECT 1 FROM play.skills WHERE id = $1`, [id]);
  if (!rows.length) throw new SkillError(`There is no skill ${id} (list_skills).`, 404);
}

/**
 * A skill's first version, as a new document named v1 (the deploy's import, ../import/skills.ts): only when play holds
 * no skill of its id yet. Returns whether it was made.
 */
export async function seedSkill(db: Db, o: { id: string; json: any; note: string; at?: Date }): Promise<boolean> {
  return db.transaction(async (q) => {
    const id = idOf(o.id);
    const { rows } = await q.query(`SELECT 1 FROM play.skills WHERE id = $1`, [id]);
    if (rows.length) return false;
    await q.query(`INSERT INTO play.skills (id, coop_id, label, grp) VALUES ($1, $2, $3, $4)`, [id, COOP, o.json.label, o.json.group]);
    await docs.createDoc(q, { id: docIdOf(id), schema: o.json.schema, json: o.json, author: { human: null, via: "import" }, message: `v1: ${o.note}`, ...(o.at ? { at: o.at } : {}), version: o.note });
    return true;
  });
}

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

// ---- reading

export type SkillItem = { id: string; label: string; group: string; note: string; stages: string[]; number: number; versions: number; updated: string };

/** every skill: its label and group (only shown), its note, which stages it speaks to, its newest version's number and how many versions */
export async function listSkills(db: Queryable, me: Me | null): Promise<SkillItem[]> {
  admin(me);
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM play.skills ORDER BY created, id`);
  const out: SkillItem[] = [];
  for (const r of rows) {
    const d = await docs.readDoc(db, docIdOf(r.id));
    out.push({
      id: r.id,
      label: d.json.label,
      group: d.json.group,
      note: d.json.note ?? "",
      stages: SKILL_STAGES.filter((k) => `${d.json.stages?.[k] ?? ""}`.trim()),
      number: d.versions.at(-1)?.number ?? 0,
      versions: d.versions.length,
      updated: iso(d.versions.at(-1)?.created ?? new Date()),
    });
  }
  return out;
}

/** the skill's versions, each with who made it and its note */
async function versionsNamed(db: Queryable, id: string) {
  const versions = await docs.versionsOf(db, docIdOf(id));
  const ids = [...new Set(versions.map((v) => v.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  return versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), acceptedBy: v.author ? names.get(v.author) ?? null : null, contentHash: v.contentHash }));
}

/**
 * One skill, whole: at its newest version, at version `v`, at step `step` of its history, or as intent `intent`'s
 * work would make it (its branch). With its versions.
 */
export async function skillOf(db: Queryable, me: Me | null, id: string, at: { version?: number; step?: number; intent?: string } = {}) {
  admin(me);
  const f = idOf(id);
  await exists(db, f);
  return asSkillError(async () => {
    const docId = docIdOf(f);
    const versions = await versionsNamed(db, f);
    const number = versions.at(-1)?.number ?? 0;
    if (at.intent !== undefined) {
      const intent = await intentIdOf(db, at.intent);
      const { rows } = await db.query<{ id: string; doc_branch: string | null; status: string; note: string }>(
        `SELECT id, doc_branch, CASE stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END AS status, COALESCE(work_note, '') AS note
           FROM play.intents WHERE id = $1 AND work = 'skill_version' AND skill_id = $2`, [intent, f],
      );
      if (!rows[0]?.doc_branch) throw new SkillError(`Skill ${f} has no such intent's work.`, 404);
      const json = (await docs.readDoc(db, docId, { branch: Number(rows[0].doc_branch) })).json;
      return { id: f, json, number, versions, intent: { id: rows[0].id, status: rows[0].status, note: rows[0].note } };
    }
    if (at.step !== undefined) {
      if (!Number.isInteger(at.step) || at.step < 1) throw new SkillError(`${at.step} is not a step.`, 404);
      return { id: f, json: await docs.stateAt(db, docId, { step: at.step }), number, versions, step: at.step };
    }
    if (at.version !== undefined) {
      if (!versions.some((v) => v.number === at.version)) throw new SkillError(`Skill ${f} has no version ${at.version}.`, 404);
      return { id: f, json: await docs.stateAt(db, docId, { version: at.version }), number, versions, version: at.version };
    }
    return { id: f, json: (await docs.readDoc(db, docId)).json, number, versions, version: number };
  });
}

/** every step of a skill (its main line with each accepted proposal's steps, or one draft's), its versions and drafts */
export async function skillHistory(db: Queryable, me: Me | null, id: string, o: { branch?: number } = {}) {
  admin(me);
  const f = idOf(id);
  await exists(db, f);
  return asSkillError(async () => {
    const docId = docIdOf(f);
    const versions = await docs.versionsOf(db, docId);
    const steps = await named(db, await docs.history(db, docId, o.branch === undefined ? {} : { branch: o.branch }), versions);
    const { rows: drafts } = await db.query<any>(
      `SELECT b.id, b.status, b.note, b.created, h.name AS author, p.id AS intent, p.stage AS intent_stage,
              (SELECT count(*) FROM play.doc_updates u WHERE u.branch = b.id) AS steps
         FROM play.doc_branches b LEFT JOIN play.humans h ON h.id = b.created_by LEFT JOIN play.intents p ON p.id = b.intent_id
        WHERE b.doc_id = $1 ORDER BY b.id`,
      [docId],
    );
    return {
      skill: f,
      steps,
      versions: versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created) })),
      drafts: drafts.map((d) => ({ id: Number(d.id), status: d.status, note: d.note, at: iso(d.created), author: d.author, intent: d.intent, intent_stage: d.intent_stage, steps: Number(d.steps) })),
    };
  });
}

// ---- drafting and proposing

/** the edits an agent sends, as the document's own (set, insert, delete, move, text; ./docs/core.ts), each with its path */
function editsOf(edits: unknown): docs.Edit[] {
  if (!Array.isArray(edits) || !edits.length) throw new SkillError("Edits are a list of at least one edit.");
  if (edits.length > 500) throw new SkillError("At most 500 edits at once.");
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object" || !Array.isArray(e.path) || !e.path.every((p: unknown) => typeof p === "string" || (typeof p === "number" && Number.isInteger(p))))
      throw new SkillError(`Edit ${i + 1} names no path (a list of field names: ['stages', 'build']).`);
    return e as docs.Edit;
  });
}

/** a draft branch of skill `id`'s document, still open for steps */
async function draftOf(tx: Queryable, docId: string, f: string, b: unknown): Promise<{ id: number; base: docs.Frontiers }> {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1) throw new SkillError("A draft is named by its number (skill_edit gives it).");
  const { rows } = await tx.query<{ status: string; base: docs.Frontiers }>(`SELECT status, base FROM play.doc_branches WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0]) throw new SkillError(`Skill ${f} has no draft ${n}.`, 404);
  if (rows[0].status !== "open") throw new SkillError(`Draft ${n} of ${f} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new draft" : rows[0].status}.`, 409);
  return { id: n, base: rows[0].base };
}

/** one step on draft `b`: edits, or the whole skill, checked whole */
async function draftStep(tx: Queryable, docId: string, b: number, p: { edits?: unknown; skill?: unknown }, message: string, author: docs.Author) {
  const now = (await docs.readDoc(tx, docId, { branch: b })).json;
  if (p.skill !== undefined) {
    if (!p.skill || typeof p.skill !== "object") throw new SkillError("A whole skill is an object (get_skill's `json`).");
    return docs.commit(tx, docId, { branch: b, target: { ...(p.skill as object), schema: now.schema }, message, author });
  }
  return docs.commit(tx, docId, { branch: b, edits: editsOf(p.edits), message, author });
}

export type SkillDraft = { skill: string; branch?: number; edits?: unknown; whole?: unknown; message?: string };

/** One step of a draft change to a skill, as the admin `me`: on draft `branch`, or on a new draft from its newest version. */
export async function editSkill(db: Db, me: Me | null, p: SkillDraft, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const f = idOf(p?.skill);
  const message = text(p.message, "The step's message (what it does)", 500);
  if ((p.edits === undefined) === (p.whole === undefined)) throw new SkillError("A step is edits or the whole skill, one of them.");
  return asSkillError(() =>
    db.transaction(async (tx) => {
      await exists(tx, f);
      const docId = docIdOf(f), author = authorOf(who, via);
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note: message })).id : (await draftOf(tx, docId, f, p.branch)).id;
      const step = await draftStep(tx, docId, b, { edits: p.edits, skill: p.whole }, message, author);
      const changes = docs.diff(await docs.baseOf(tx, docId, b), (await docs.readDoc(tx, docId, { branch: b })).json);
      return { skill: f, branch: b, step: step?.seq ?? null, changed: !!step, steps: (await docs.history(tx, docId, { branch: b })).length, changes: changes.length };
    }),
  );
}

export type SkillProposal = { skill: string; note: string; branch?: number; edits?: unknown; whole?: unknown; intent?: string };

/** Propose a new version of a skill, as the admin `me`: a draft (its `branch`, perhaps with one more step), or edits at once. */
export async function proposeSkill(db: Db, me: Me | null, p: SkillProposal, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const f = idOf(p?.skill);
  const note = text(p.note, "The note (what changes and why)", 4000);
  if (p.branch == null && (p.edits === undefined) === (p.whole === undefined)) throw new SkillError("Propose a draft (its branch), edits, or the whole skill.");
  if (p.edits !== undefined && p.whole !== undefined) throw new SkillError("Give edits or the whole skill, not both.");
  return asSkillError(() =>
    db.transaction(async (tx) => {
      await exists(tx, f);
      const docId = docIdOf(f), author = authorOf(who, via);
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note })).id : (await draftOf(tx, docId, f, p.branch)).id;
      if (p.edits !== undefined || p.whole !== undefined) await draftStep(tx, docId, b, { edits: p.edits, skill: p.whole }, note, author);
      const changes = docs.diff(await docs.baseOf(tx, docId, b), (await docs.readDoc(tx, docId, { branch: b })).json);
      if (!changes.length) throw new SkillError("That is the skill as it is: nothing changed.");
      await docs.propose(tx, docId, b, { note, author });
      const intent = await putAtProposal(tx, who, { intent: p.intent, work: { kind: "skill_version", skill_id: f, doc_branch: b }, note, via: via === "mcp" ? "mcp" : "web" }).catch((e) => {
        throw e instanceof WorkError ? new SkillError(e.message, e.status) : e;
      });
      const number = ((await docs.versionsOf(tx, docId)).at(-1)?.number ?? 0) + 1;
      return { intent, stage: "proposal" as const, skill: f, number, branch: b, steps: (await docs.history(tx, docId, { branch: b })).length, changes: changes.length };
    }),
  );
}

// ---- deciding

/** a skill proposal as people review it: what changed, field by field, against the version it was made on; its steps */
export async function skillReview(db: Queryable, p: { id: string; skill_id: string; doc_branch: string | number | null; status: string }) {
  const docId = docIdOf(p.skill_id), b = Number(p.doc_branch);
  const base = await docs.baseOf(db, docId, b);
  const next = (await docs.readDoc(db, docId, { branch: b })).json;
  const versions = await docs.versionsOf(db, docId);
  const key = (fr: docs.Frontiers) => JSON.stringify([...fr].sort((x, y) => (x.peer < y.peer ? -1 : 1)));
  const { rows } = await db.query<{ base: docs.Frontiers }>(`SELECT base FROM play.doc_branches WHERE id = $1`, [b]);
  const baseNumber = rows[0] ? versions.find((v) => key(v.frontiers) === key(rows[0].base))?.number ?? null : null;
  const steps = await named(db, await docs.history(db, docId, { branch: b }));
  const moved = p.status === "proposal" && baseNumber !== null && baseNumber !== versions.at(-1)?.number;
  return { skill: { id: p.skill_id, label: next.label, group: next.group }, baseNumber, moved, changes: docs.diff(base, next), steps };
}

/**
 * Accept or archive skill proposal `p` (locked by the caller's transaction), as admin `me`. Accepted, its branch is
 * merged into the skill's document and named its next version, what every agent is taught from the next request on;
 * made on a version that is no longer the newest, it still goes in where the two changes touch different fields, and
 * is archived where they touch the same.
 */
export async function decideSkill(tx: Queryable, me: Me, p: any, verdict: "accept" | "archive") {
  if (me.level !== "admin") throw new Denied("Only Maia City's admins decide on the skills.");
  return asSkillError(async () => {
    const docId = docIdOf(p.skill_id), b = Number(p.doc_branch);
    const author = authorOf(me, "web");
    const archive = async (message?: string) => {
      await settle(tx, p.id, "archived", verdict === "archive" ? me.id : null);
      await closeWork(tx, me, p);
      return { id: p.id as string, status: "archived" as const, ...(message ? { message } : {}) };
    };
    if (verdict === "archive") return archive();
    const preview = await docs.previewMerge(tx, docId, b);
    if (preview.concurrent) {
      const was = await docs.baseOf(tx, docId, b);
      const now = (await docs.readDoc(tx, docId)).json, mine = (await docs.readDoc(tx, docId, { branch: b })).json;
      const clash = overlap(docs.diff(was, now).map((c) => c.path), docs.diff(was, mine).map((c) => c.path));
      if (clash.length) return archive(`The skill has a newer version than the one this was made on, and it changes what that changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")}). Propose the change again on its newest version.`);
    }
    if (preview.problems.length) return archive(`Merged into the skill as it is now, this is no longer a valid skill: ${preview.problems.slice(0, 3).join("; ")}. Propose it again on its newest version.`);
    const v = await docs.accept(tx, docId, b, { author, note: p.note });
    await tx.query(`UPDATE play.skills SET label = $2, grp = $3, updated = now() WHERE id = $1`, [p.skill_id, preview.json.label, preview.json.group]);
    await settle(tx, p.id, "accepted", me.id);
    return { id: p.id as string, status: "accepted" as const, number: v.number, ...(preview.concurrent ? { merged: true } : {}) };
  });
}
