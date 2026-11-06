// The Factories (play/SPEC.md §4.7, Samuel 2026-11-04): every production line play shows is a Loro document,
// `factory:<id>` (type factory/1, ./docs/schema.ts): its line as AirSup's factory runtime reads it and its bill of
// process, every step kept with its author, message and time, its versions numbered on accept. A factory changes only by
// proposal, as a story does: an agent drafts a change step by step (factory_edit, each step checked whole) and proposes
// the draft (propose_factory_version: an intent put at Proposal with its `factory_version` work, whose branch is the draft), or proposes edits at
// once; admins see it field by field on the intents' board and open the factory as it would be, then accept or archive
// it. Accepting merges the branch into the main line and names the next version; if another change went in since, it
// still goes in where the two touch different fields, and is archived where they touch the same. Admins only, as the
// Factories are. `play.factories` holds each factory's id and label, so an intent's work can name it.
import { COOP, Denied, type Me } from "./access";
import type { Db, Queryable } from "./pg";
import * as docs from "./docs";
import { EditError } from "./docs/core";
import { named } from "./stories";
import { overlap } from "./storydocs";
import { UUID } from "./uuid";
import { closeWork, intentIdOf, putAtProposal, settle, WorkError } from "./work";

export class FactoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const SCHEMA = "factory/1";
/** a factory is named by its UUID (play/SPEC.md §4.7); its label is only shown */
export const FACTORY_ID = UUID;
export const docIdOf = (factory: string) => `factory:${factory}`;
const iso = (d: Date | string) => new Date(d).toISOString();
const authorOf = (me: Me, via: "web" | "mcp"): docs.Author => ({ human: me.id, via: via === "mcp" ? "mcp" : "site" });

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins may open the Factories, for now.");
  return me;
}
function idOf(id: unknown): string {
  const s = `${id ?? ""}`;
  if (!FACTORY_ID.test(s)) throw new FactoryError("Name the factory by its id, a UUID (list_factories).", 404);
  return s;
}
function text(v: unknown, what: string, most: number): string {
  if (typeof v !== "string" || !v.trim()) throw new FactoryError(`${what} is missing.`);
  if (v.length > most) throw new FactoryError(`${what} is longer than ${most} characters.`);
  return v.trim();
}
async function asFactoryError<R>(run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof docs.DocError) throw new FactoryError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof EditError) throw new FactoryError(e.message);
    throw e;
  }
}
async function exists(q: Queryable, id: string): Promise<void> {
  const { rows } = await q.query(`SELECT 1 FROM play.factories WHERE id = $1`, [id]);
  if (!rows.length) throw new FactoryError(`There is no factory ${id} (list_factories).`, 404);
}

/**
 * A factory's first version, as a new document named v1 (the deploy's import, ../import/factories.ts): only when play
 * holds no factory of its id yet. Returns whether it was made.
 */
export async function seedFactory(db: Db, o: { id: string; json: any; note: string; at?: Date }): Promise<boolean> {
  return db.transaction(async (q) => {
    const id = idOf(o.id);
    const { rows } = await q.query(`SELECT 1 FROM play.factories WHERE id = $1`, [id]);
    if (rows.length) return false;
    await q.query(`INSERT INTO play.factories (id, coop_id, label) VALUES ($1, $2, $3)`, [id, COOP, o.json.label]);
    await docs.createDoc(q, { id: docIdOf(id), schema: SCHEMA, json: o.json, author: { human: null, via: "import" }, message: `v1: ${o.note}`, ...(o.at ? { at: o.at } : {}), version: o.note });
    return true;
  });
}

// ---- reading

export type FactoryItem = { id: string; label: string; note: string; number: number; versions: number; stations: number; parts: number; updated: string };

/** every factory: its label and note, its newest version's number, how many versions, stations and parts */
export async function listFactories(db: Queryable, me: Me | null): Promise<FactoryItem[]> {
  admin(me);
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM play.factories ORDER BY created, id`);
  const out: FactoryItem[] = [];
  for (const r of rows) {
    const d = await docs.readDoc(db, docIdOf(r.id));
    out.push({
      id: r.id,
      label: d.json.label,
      note: d.json.note ?? "",
      number: d.versions.at(-1)?.number ?? 0,
      versions: d.versions.length,
      stations: d.json.line?.stations?.length ?? 0,
      parts: d.json.parts?.length ?? 0,
      updated: iso(d.versions.at(-1)?.created ?? new Date()),
    });
  }
  return out;
}

/** the factory's versions, each with who made it and its note */
async function versionsNamed(db: Queryable, id: string) {
  const versions = await docs.versionsOf(db, docIdOf(id));
  const ids = [...new Set(versions.map((v) => v.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  return versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), acceptedBy: v.author ? names.get(v.author) ?? null : null, contentHash: v.contentHash }));
}

/**
 * One factory, whole: at its newest version, at version `v`, at step `step` of its history, or as intent
 * `intent`'s work would make it (its branch; an old proposal's id finds its intent). With its versions, and, so, the intent.
 */
export async function factoryOf(db: Queryable, me: Me | null, id: string, at: { version?: number; step?: number; intent?: string } = {}) {
  admin(me);
  const f = idOf(id);
  await exists(db, f);
  return asFactoryError(async () => {
    const docId = docIdOf(f);
    const versions = await versionsNamed(db, f);
    const number = versions.at(-1)?.number ?? 0;
    if (at.intent !== undefined) {
      const intent = await intentIdOf(db, at.intent);
      const { rows } = await db.query<{ id: string; doc_branch: string | null; status: string; note: string }>(
        `SELECT id, doc_branch, CASE stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END AS status, COALESCE(work_note, '') AS note
           FROM play.intents WHERE id = $1 AND work = 'factory_version' AND factory_id = $2`, [intent, f],
      );
      if (!rows[0]?.doc_branch) throw new FactoryError(`Factory ${f} has no such intent's work.`, 404);
      const json = (await docs.readDoc(db, docId, { branch: Number(rows[0].doc_branch) })).json;
      return { id: f, json, number, versions, intent: { id: rows[0].id, status: rows[0].status, note: rows[0].note } };
    }
    if (at.step !== undefined) {
      if (!Number.isInteger(at.step) || at.step < 1) throw new FactoryError(`${at.step} is not a step.`, 404);
      return { id: f, json: await docs.stateAt(db, docId, { step: at.step }), number, versions, step: at.step };
    }
    if (at.version !== undefined) {
      if (!versions.some((v) => v.number === at.version)) throw new FactoryError(`Factory ${f} has no version ${at.version}.`, 404);
      return { id: f, json: await docs.stateAt(db, docId, { version: at.version }), number, versions, version: at.version };
    }
    return { id: f, json: (await docs.readDoc(db, docId)).json, number, versions, version: number };
  });
}

/** every step of a factory (its main line with each accepted proposal's steps, or one draft's), its versions and drafts */
export async function factoryHistory(db: Queryable, me: Me | null, id: string, o: { branch?: number } = {}) {
  admin(me);
  const f = idOf(id);
  await exists(db, f);
  return asFactoryError(async () => {
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
      factory: f,
      steps,
      versions: versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created) })),
      drafts: drafts.map((d) => ({ id: Number(d.id), status: d.status, note: d.note, at: iso(d.created), author: d.author, intent: d.intent, intent_stage: d.intent_stage, steps: Number(d.steps) })),
    };
  });
}

// ---- drafting and proposing

/**
 * The edits an agent sends, as the document's own (set, insert, delete, move, text; ./docs/core.ts), with one help: a
 * step of a path may name an item of a list by its id ({ id: 'weld' }) instead of its index, worked out against the
 * draft as it stands before the edit.
 */
function resolveEdits(json: any, edits: unknown): docs.Edit[] {
  if (!Array.isArray(edits) || !edits.length) throw new FactoryError("Edits are a list of at least one edit.");
  if (edits.length > 500) throw new FactoryError("At most 500 edits at once.");
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object" || !Array.isArray(e.path)) throw new FactoryError(`Edit ${i + 1} names no path (a list of field names, indexes or { id }).`);
    let at = json;
    const path = e.path.map((p: unknown, j: number) => {
      let step: string | number;
      if (p && typeof p === "object" && typeof (p as any).id === "string") {
        if (!Array.isArray(at)) throw new FactoryError(`Edit ${i + 1}: step ${j + 1} of its path names { id: ${(p as any).id} } but there is no list there.`);
        const k = at.findIndex((x: any) => x?.id === (p as any).id);
        if (k < 0) throw new FactoryError(`Edit ${i + 1}: there is no item ${(p as any).id} in the list at step ${j + 1} of its path.`);
        step = k;
      } else if (typeof p === "string" || (typeof p === "number" && Number.isInteger(p))) step = p;
      else throw new FactoryError(`Edit ${i + 1}: step ${j + 1} of its path is a field name, an index or { id }.`);
      at = at?.[step as any];
      return step;
    });
    return { ...e, path } as docs.Edit;
  });
}

/** a draft branch of factory `id`'s document, still open for steps */
async function draftOf(tx: Queryable, docId: string, f: string, b: unknown): Promise<{ id: number; base: docs.Frontiers }> {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1) throw new FactoryError("A draft is named by its number (factory_edit gives it).");
  const { rows } = await tx.query<{ status: string; base: docs.Frontiers }>(`SELECT status, base FROM play.doc_branches WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0]) throw new FactoryError(`Factory ${f} has no draft ${n}.`, 404);
  if (rows[0].status !== "open") throw new FactoryError(`Draft ${n} of ${f} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new draft" : rows[0].status}.`, 409);
  return { id: n, base: rows[0].base };
}

/** one step on draft `b`: edits, or the whole factory, checked whole */
async function draftStep(tx: Queryable, docId: string, b: number, p: { edits?: unknown; factory?: unknown }, message: string, author: docs.Author) {
  if (p.factory !== undefined) {
    if (!p.factory || typeof p.factory !== "object") throw new FactoryError("A whole factory is an object (get_factory's `json`).");
    return docs.commit(tx, docId, { branch: b, target: { ...(p.factory as object), schema: SCHEMA }, message, author });
  }
  const now = (await docs.readDoc(tx, docId, { branch: b })).json;
  return docs.commit(tx, docId, { branch: b, edits: resolveEdits(now, p.edits), message, author });
}

export type FactoryDraft = { factory: string; branch?: number; edits?: unknown; whole?: unknown; message?: string };

/** One step of a draft change to a factory, as the admin `me`: on draft `branch`, or on a new draft from its newest version. */
export async function editFactory(db: Db, me: Me | null, p: FactoryDraft, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const f = idOf(p?.factory);
  const message = text(p.message, "The step's message (what it does)", 500);
  if ((p.edits === undefined) === (p.whole === undefined)) throw new FactoryError("A step is edits or the whole factory, one of them.");
  return asFactoryError(() =>
    db.transaction(async (tx) => {
      await exists(tx, f);
      const docId = docIdOf(f), author = authorOf(who, via);
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note: message })).id : (await draftOf(tx, docId, f, p.branch)).id;
      const step = await draftStep(tx, docId, b, { edits: p.edits, factory: p.whole }, message, author);
      const changes = docs.diff(await docs.baseOf(tx, docId, b), (await docs.readDoc(tx, docId, { branch: b })).json);
      return { factory: f, branch: b, step: step?.seq ?? null, changed: !!step, steps: (await docs.history(tx, docId, { branch: b })).length, changes: changes.length };
    }),
  );
}

export type FactoryProposal = { factory: string; note: string; branch?: number; edits?: unknown; whole?: unknown; intent?: string };

/** Propose a new version of a factory, as the admin `me`: a draft (its `branch`, perhaps with one more step), or edits at once. */
export async function proposeFactory(db: Db, me: Me | null, p: FactoryProposal, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const f = idOf(p?.factory);
  const note = text(p.note, "The note (what changes and why)", 4000);
  if (p.branch == null && (p.edits === undefined) === (p.whole === undefined)) throw new FactoryError("Propose a draft (its branch), edits, or the whole factory.");
  if (p.edits !== undefined && p.whole !== undefined) throw new FactoryError("Give edits or the whole factory, not both.");
  return asFactoryError(() =>
    db.transaction(async (tx) => {
      await exists(tx, f);
      const docId = docIdOf(f), author = authorOf(who, via);
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note })).id : (await draftOf(tx, docId, f, p.branch)).id;
      if (p.edits !== undefined || p.whole !== undefined) await draftStep(tx, docId, b, { edits: p.edits, factory: p.whole }, note, author);
      const changes = docs.diff(await docs.baseOf(tx, docId, b), (await docs.readDoc(tx, docId, { branch: b })).json);
      if (!changes.length) throw new FactoryError("That is the factory as it is: nothing changed.");
      await docs.propose(tx, docId, b, { note, author });
      const intent = await putAtProposal(tx, who, { intent: p.intent, work: { kind: "factory_version", factory_id: f, doc_branch: b }, note, via: via === "mcp" ? "mcp" : "web" }).catch((e) => {
        throw e instanceof WorkError ? new FactoryError(e.message, e.status) : e;
      });
      const number = ((await docs.versionsOf(tx, docId)).at(-1)?.number ?? 0) + 1;
      return { intent, stage: "proposal" as const, factory: f, number, branch: b, steps: (await docs.history(tx, docId, { branch: b })).length, changes: changes.length };
    }),
  );
}

// ---- deciding

/** a factory proposal as people review it: what changed, field by field, against the version it was made on; its steps */
export async function factoryReview(db: Queryable, p: { id: string; factory_id: string; doc_branch: string | number | null; status: string }) {
  const docId = docIdOf(p.factory_id), b = Number(p.doc_branch);
  const base = await docs.baseOf(db, docId, b);
  const next = (await docs.readDoc(db, docId, { branch: b })).json;
  const versions = await docs.versionsOf(db, docId);
  const key = (fr: docs.Frontiers) => JSON.stringify([...fr].sort((x, y) => (x.peer < y.peer ? -1 : 1)));
  const { rows } = await db.query<{ base: docs.Frontiers }>(`SELECT base FROM play.doc_branches WHERE id = $1`, [b]);
  const baseNumber = rows[0] ? versions.find((v) => key(v.frontiers) === key(rows[0].base))?.number ?? null : null;
  const steps = await named(db, await docs.history(db, docId, { branch: b }));
  const moved = p.status === "proposal" && baseNumber !== null && baseNumber !== versions.at(-1)?.number;
  return { factory: { id: p.factory_id, label: next.label }, baseNumber, moved, changes: docs.diff(base, next), steps };
}

/**
 * Accept or archive factory proposal `p` (locked by the caller's transaction), as admin `me`. Accepted, its branch is
 * merged into the factory's document and named its next version; made on a version that is no longer the newest, it
 * still goes in where the two changes touch different fields, and is archived where they touch the same.
 */
export async function decideFactory(tx: Queryable, me: Me, p: any, verdict: "accept" | "archive") {
  if (me.level !== "admin") throw new Denied("Only Maia City's admins decide on the Factories.");
  return asFactoryError(async () => {
    const docId = docIdOf(p.factory_id), b = Number(p.doc_branch);
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
      if (clash.length) return archive(`The factory has a newer version than the one this was made on, and it changes what that changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")}). Propose the change again on its newest version.`);
    }
    if (preview.problems.length) return archive(`Merged into the factory as it is now, this is no longer a valid factory: ${preview.problems.slice(0, 3).join("; ")}. Propose it again on its newest version.`);
    const v = await docs.accept(tx, docId, b, { author, note: p.note });
    await tx.query(`UPDATE play.factories SET label = $2, updated = now() WHERE id = $1`, [p.factory_id, preview.json.label]);
    await settle(tx, p.id, "accepted", me.id);
    return { id: p.id as string, status: "accepted" as const, number: v.number, ...(preview.concurrent ? { merged: true } : {}) };
  });
}

