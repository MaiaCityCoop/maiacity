// One version control (play/SPEC.md "Version control"; intent 30dfa87a-b3c6-4af8-a3be-aac03907ff37, Samuel
// 2026-11-06): every versioned kind of document (an asset, a story, a factory, a game config, a skill, and any to come)
// is one entry here, and this one module does the rest for every one of them: list, read (at a version, an edit, or
// an intent's variant), history (its edits, versions and variants), edit, propose, review and decide. A kind writes
// only what is truly its own, as hooks: how its edits read, what proposing it makes beside its document (an asset's
// recipe built, a story's content-addressed version), what accepting it writes. The words (play/SPEC.md's table):
// an **edit** is one change, kept with who made it, why and when; a **variant** is a line of edits; **Main** is the
// accepted line; an **intent variant** is a variant inside an intent, merged into Main on Accept, closed on Archive;
// its **seed** is the version it grew from. Every change waits at Proposal for a person's Accept (no bypass).
import type { BlobStore } from "./blobs";
import { COOP, Denied, type Me } from "./access";
import * as docs from "./docs";
import { OpError } from "./docs/core";
import { canonical } from "./hash";
import type { Db, Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { UUID } from "./uuid";
import { closeWork, putAtProposal, settle, WORK_OF, workOf, WorkError } from "./work";
import type { IntentVerdict } from "./intents";
import type { GitHub } from "./ship";

export class VersionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** what every hook is given: the database, and the store play keeps its files in */
export type Env = { db: Db; store: BlobStore };
export type Verdict = "accept" | "archive";
export type Via = "web" | "mcp";

/** what an agent or the page sends to change a document: operations (or a kind's own edits), the whole of it, or a few of its fields */
export type Change = { edits?: unknown; whole?: unknown; fields?: Record<string, unknown> };
export type EditArgs = Change & { doc: string; message?: string; variant?: number };
export type ProposeArgs = Change & { doc: string; note?: string; variant?: number; intent?: string; extra?: Record<string, unknown> };

/** One versioned kind of document: its words, and the hooks where it truly differs. */
export type DocKind = {
  /** the documents' prefix: `<kind>:<uuid>` */
  kind: string;
  /** its intents' work (play.intents.work) */
  work: string;
  /** shown: what one is called, and the group the intents' board files its work under */
  title: string;
  grp: string;
  /** its JSON, said for an agent (MCP's doc_at and doc_edit) */
  format?: string;
  /** who may read and change it (an admin by default) */
  may?(me: Me | null): Me;
  /** a document not made yet that this kind makes on first use (an asset's, from its history) */
  exists?(q: Queryable, uuid: string): Promise<boolean>;
  ensure?(env: Env, q: Queryable, uuid: string): Promise<void>;
  /** its label and group, read from its JSON (kept on play.docs, only shown) */
  shown?(json: any): { label: string; grp?: string };
  /** the extra fields its list shows */
  listItem?(json: any): Record<string, unknown>;
  /** what reading it at a point gives beside its JSON (the versions a story links) */
  view?(db: Queryable, uuid: string, json: any): Promise<Record<string, unknown>>;
  /** its own edit language, or checks a whole state must pass before it is kept (a story's timeline) */
  change?(env: Env, tx: Queryable, uuid: string, cur: any, c: Change): Promise<{ ops: docs.Op[] } | { target: unknown }>;
  /** its own proposal, made from the variant (an asset's version built, a story's version written) */
  propose?(env: Env, me: Me, p: { uuid: string; variant: number | null; note: string; intent?: string; extra?: Record<string, unknown> }, via: Via): Promise<any>;
  /** what its review shows beside the field-by-field changes (an asset's builds, a story's player) */
  review?(env: Env | { db: Queryable; store?: BlobStore }, w: any): Promise<Record<string, unknown>>;
  /** its own decision (an asset accepted only on its head, a story's merged version) */
  decide?(env: { store: BlobStore }, tx: Queryable, me: Me, w: any, verdict: Verdict): Promise<any>;
};
/** work that is not a document's variant (a sandbox's change): reviewed and decided by its own kind */
export type WorkKind = { work: string; title: string; review(db: Queryable, w: any): Promise<Record<string, unknown>>; decide(tx: Queryable, me: Me, w: any, verdict: Verdict): Promise<any> };

const KINDS = new Map<string, DocKind>();
const BY_WORK = new Map<string, DocKind | WorkKind>();

/** a kind of document, declared once */
export function register(k: DocKind): DocKind {
  if (!/^[a-z]+$/.test(k.kind)) throw new Error(`a kind is lowercase letters: ${k.kind}`);
  KINDS.set(k.kind, k);
  BY_WORK.set(k.work, k);
  return k;
}
export function registerWork(w: WorkKind): WorkKind {
  BY_WORK.set(w.work, w);
  return w;
}
export const kinds = (): DocKind[] => [...KINDS.values()];
export const docKindOf = (kind: string): DocKind | undefined => KINDS.get(kind);
export const workKindOf = (work: string | null | undefined) => (work ? BY_WORK.get(work) : undefined);
/** every kind of work play knows */
export const workKinds = (): string[] => [...BY_WORK.keys()];
const isDocKind = (k: DocKind | WorkKind | undefined): k is DocKind => !!k && "kind" in k;
export const docIdOf = (kind: string, uuid: string) => `${kind}:${uuid}`;
const uuidOf = (docId: string) => docId.slice(docId.indexOf(":") + 1);
const iso = (d: Date | string) => new Date(d).toISOString();
const firstLine = (s: string, n = 300) => (s ?? "").split("\n")[0].slice(0, n);
export const authorOf = (me: Pick<Me, "id"> | null, via: Via | "import" | "system"): docs.Author => ({ human: me?.id ?? null, via: via === "mcp" ? "mcp" : via === "web" ? "site" : via });

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins read and change versioned documents, for now.");
  return me;
}
const mayOf = (k: DocKind, me: Me | null) => (k.may ? k.may(me) : admin(me));

/** the store's errors said as a version's (MCP shows them to the agent) */
export async function asVersionError<R>(run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof docs.DocError) throw new VersionError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof OpError) throw new VersionError(e.message);
    if (e instanceof WorkError) throw new VersionError(e.message, e.status);
    throw e;
  }
}

/** the frontiers of a point as one comparable key */
export const frontierKey = (f: docs.Frontiers) => canonical([...f].sort((a, b) => (a.peer < b.peer ? -1 : 1)));
/** the version whose point is `frontiers`, or null */
export async function versionAt(q: Queryable, docId: string, frontiers: docs.Frontiers): Promise<number | null> {
  const want = frontierKey(frontiers);
  for (const v of await docs.versionsOf(q, docId)) if (frontierKey(v.frontiers) === want) return v.number;
  return null;
}

/** do two sets of changed paths touch the same field (one the other's, or inside it)? */
export function overlap(a: string[], b: string[]): string[] {
  const inside = (x: string, y: string) => x === y || x.startsWith(y + ".") || x.startsWith(y + "[");
  return a.filter((x) => b.some((y) => inside(x, y) || inside(y, x)));
}

/** each edit with its author's name, and the version it was named where one was */
export async function named(db: Queryable, edits: docs.Edit[], versions: docs.Version[] = []) {
  const ids = [...new Set(edits.map((s) => s.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  const at = new Map(versions.map((v) => [frontierKey(v.frontiers), v.number]));
  // a version marks the latest edit at its point (a merge that only caught Main up stands where the variant's last edit
  // stood: the merge is the edit that made it the version)
  const marked = new Map<number, number>();
  for (let i = edits.length - 1; i >= 0; i--) {
    const n = at.get(frontierKey(edits[i].frontiers));
    if (n !== undefined && ![...marked.values()].includes(n)) marked.set(i, n);
  }
  return edits.map((s, i) => ({ seq: s.seq, variant: s.variant, kind: s.kind, author: s.author ? names.get(s.author) ?? null : null, via: s.via, message: s.message, at: iso(s.created), bytes: s.bytes, version: marked.get(i) ?? null }));
}

// ---- finding a document

/** the document a UUID names, and its kind (made first where its kind makes it on first use) */
export async function docOf(env: Env | { db: Queryable; store?: BlobStore }, uuid: unknown, q: Queryable = env.db): Promise<{ uuid: string; docId: string; k: DocKind }> {
  const id = `${uuid ?? ""}`.toLowerCase();
  if (!UUID.test(id)) throw new VersionError("Name the document by its id, a UUID (list_docs).", 404);
  const { rows } = await q.query<{ id: string; type: string }>(`SELECT id, type FROM play.docs WHERE split_part(id, ':', 2) = $1`, [id]);
  if (rows[0]) {
    const k = KINDS.get(rows[0].type);
    if (!k) throw new VersionError(`${rows[0].id} is of no kind play versions.`, 404);
    return { uuid: id, docId: rows[0].id, k };
  }
  for (const k of KINDS.values())
    if (k.exists && k.ensure && (await k.exists(q, id))) {
      if (!("store" in env) || !env.store) throw new VersionError(`${k.title} ${id} has no document yet.`, 404);
      await ("transaction" in q ? (q as Db).transaction((t) => k.ensure!(env as Env, t, id)) : k.ensure(env as Env, q, id));
      return { uuid: id, docId: docIdOf(k.kind, id), k };
    }
  throw new VersionError(`There is no document ${id} (list_docs).`, 404);
}

/** an open intent variant of a document, still taking edits */
export async function openVariant(q: Queryable, docId: string, b: unknown): Promise<{ id: number; seed: docs.Frontiers }> {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1) throw new VersionError("A variant is named by its number (doc_edit gives it).");
  const { rows } = await q.query<{ status: string; seed: docs.Frontiers }>(`SELECT status, seed FROM play.doc_variants WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0]) throw new VersionError(`${uuidOf(docId)} has no variant ${n}.`, 404);
  if (rows[0].status !== "open") throw new VersionError(`Variant ${n} of ${uuidOf(docId)} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new one" : rows[0].status}.`, 409);
  return { id: n, seed: rows[0].seed };
}

/** a variant's seed as a version number (null where it grew from no version) */
export async function seedNumberOf(q: Queryable, docId: string, variant: number): Promise<number | null> {
  const { rows } = await q.query<{ seed: docs.Frontiers }>(`SELECT seed FROM play.doc_variants WHERE id = $1`, [variant]);
  return rows[0] ? versionAt(q, docId, rows[0].seed) : null;
}

/** the variant an intent's work is, on this document */
async function intentVariant(q: Queryable, docId: string, intent: string): Promise<{ id: string; variant: number; status: string; note: string }> {
  if (!UUID.test(`${intent}`)) throw new VersionError("Name the intent by its id, a UUID.", 404);
  const { rows } = await q.query<{ id: string; doc_variant: string | null; status: string; note: string }>(
    `SELECT id, doc_variant, CASE stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END AS status, COALESCE(work_note, '') AS note
       FROM play.intents WHERE id = $1 AND doc_id = $2`, [intent, docId],
  );
  if (!rows[0]?.doc_variant) throw new VersionError(`${uuidOf(docId)} has no such intent's work.`, 404);
  return { id: rows[0].id, variant: Number(rows[0].doc_variant), status: rows[0].status, note: rows[0].note };
}

/** a kind's label and group, read from its JSON */
const shownOf = (k: DocKind, json: any) => (k.shown ? k.shown(json) : { label: `${json?.label ?? ""}`, grp: json?.group === undefined ? undefined : `${json.group}` });

// ---- seeding (the import)

/** A document's first version, as v1 (the deploy's import): only when play holds none of its id. Returns whether it was made. */
export async function seedDoc(db: Db, o: { kind: string; uuid: string; json: any; note: string; at?: Date }): Promise<boolean> {
  const k = KINDS.get(o.kind);
  if (!k) throw new VersionError(`There is no kind ${o.kind}.`);
  if (!UUID.test(o.uuid)) throw new VersionError("A document is named by a UUID.");
  return db.transaction(async (q) => {
    const docId = docIdOf(k.kind, o.uuid);
    if ((await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [docId])).rows.length) return false;
    const s = shownOf(k, o.json);
    await docs.createDoc(q, { id: docId, schema: o.json.schema, json: o.json, author: { human: null, via: "import" }, message: `v1: ${o.note}`, ...(o.at ? { at: o.at } : {}), version: o.note, label: s.label, grp: s.grp ?? "" });
    return true;
  });
}

// ---- reading

/** every document of a kind: its label and group (only shown), note, newest version's number, how many versions, and its kind's own fields */
export async function listDocs(env: Env | { db: Queryable }, me: Me | null, kind: unknown) {
  const k = KINDS.get(`${kind ?? ""}`);
  if (!k) throw new VersionError(`A kind is one of ${[...KINDS.keys()].join(", ")}.`);
  mayOf(k, me);
  const { rows } = await env.db.query<{ id: string; label: string; grp: string; updated: Date; number: number | null; versions: string }>(
    `SELECT d.id, d.label, d.grp, d.updated, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS number,
            (SELECT count(*) FROM play.doc_versions v WHERE v.doc_id = d.id) AS versions
       FROM play.docs d WHERE d.type = $1 ORDER BY d.created, d.id`, [k.kind],
  );
  const out = [];
  for (const r of rows) {
    const json = k.listItem ? (await docs.readDoc(env.db, r.id)).json : null;
    out.push({ id: uuidOf(r.id), kind: k.kind, label: r.label, group: r.grp, note: json?.note ?? "", number: r.number ?? 0, versions: Number(r.versions), updated: iso(r.updated), ...(json ? k.listItem!(json) : {}) });
  }
  return out;
}

/** the versions, each with who accepted it and its note */
async function versionsNamed(db: Queryable, docId: string) {
  const versions = await docs.versionsOf(db, docId);
  const ids = [...new Set(versions.map((v) => v.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  return versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), acceptedBy: v.author ? names.get(v.author) ?? null : null, contentHash: v.contentHash }));
}

/** One document whole: at Main's newest version, at version `v`, at edit `edit`, on variant `variant`, or as intent `intent`'s work would make it. */
export async function docAt(env: Env | { db: Queryable }, me: Me | null, uuid: unknown, at: { version?: number; edit?: number; variant?: number; intent?: string } = {}) {
  const { uuid: id, docId, k } = await docOf(env, uuid);
  mayOf(k, me);
  const db = env.db;
  return asVersionError(async () => {
    const versions = await versionsNamed(db, docId);
    const number = versions.at(-1)?.number ?? 0;
    const base = { id, kind: k.kind, doc: docId, number, versions };
    const seen = async <T extends { json: any }>(r: T) => ({ ...r, ...(k.view ? await k.view(db, id, r.json) : {}) });
    if (at.intent !== undefined) {
      const w = await intentVariant(db, docId, at.intent);
      return seen({ ...base, json: (await docs.readDoc(db, docId, { variant: w.variant })).json, variant: w.variant, intent: { id: w.id, status: w.status, note: w.note } });
    }
    if (at.variant !== undefined) {
      if (!Number.isInteger(at.variant) || at.variant < 1) throw new VersionError(`${at.variant} is not a variant.`, 404);
      return seen({ ...base, json: (await docs.readDoc(db, docId, { variant: at.variant })).json, variant: at.variant });
    }
    if (at.edit !== undefined) {
      if (!Number.isInteger(at.edit) || at.edit < 1) throw new VersionError(`${at.edit} is not an edit.`, 404);
      return seen({ ...base, json: await docs.stateAt(db, docId, { edit: at.edit }), edit: at.edit });
    }
    if (at.version !== undefined) {
      if (!versions.some((v) => v.number === at.version)) throw new VersionError(`${id} has no version ${at.version}.`, 404);
      return seen({ ...base, json: await docs.stateAt(db, docId, { version: at.version }), version: at.version });
    }
    return seen({ ...base, json: (await docs.readDoc(db, docId)).json, version: number });
  });
}

/** Every edit of a document (Main's, with each accepted variant's where it was made, or one variant's own), its versions and its variants. */
export async function docHistory(env: Env | { db: Queryable }, me: Me | null, uuid: unknown, o: { variant?: number } = {}) {
  const { uuid: id, docId, k } = await docOf(env, uuid);
  mayOf(k, me);
  const db = env.db;
  return asVersionError(async () => {
    const versions = await docs.versionsOf(db, docId);
    const edits = await named(db, await docs.history(db, docId, o.variant === undefined ? {} : { variant: o.variant }), versions);
    const { rows } = await db.query<any>(
      `SELECT v.id, v.type, v.status, v.note, v.created, v.seed, h.name AS author, i.id AS intent, i.stage AS intent_stage, i.title AS intent_title,
              (SELECT count(*) FROM play.doc_edits e WHERE e.variant = v.id) AS edits
         FROM play.doc_variants v LEFT JOIN play.humans h ON h.id = v.created_by LEFT JOIN play.intents i ON i.id = v.intent_id
        WHERE v.doc_id = $1 ORDER BY v.id`,
      [docId],
    );
    const at = new Map(versions.map((v) => [frontierKey(v.frontiers), v.number]));
    return {
      id,
      kind: k.kind,
      edits,
      versions: versions.map((v) => ({ number: v.number, note: firstLine(v.note), at: iso(v.created) })),
      variants: rows.map((v) => ({
        id: Number(v.id), type: v.type, status: v.status, note: firstLine(v.note), at: iso(v.created), author: v.author,
        intent: v.intent, intent_stage: v.intent_stage, intent_title: v.intent_title, edits: Number(v.edits), seed: at.get(frontierKey(v.seed)) ?? null,
      })),
    };
  });
}

/** What one edit changed (against the state just before it on its line), or what a variant changes (against its seed). */
export async function docChanges(env: Env | { db: Queryable }, me: Me | null, uuid: unknown, o: { edit?: number; variant?: number }) {
  const { docId, k } = await docOf(env, uuid);
  mayOf(k, me);
  const db = env.db;
  return asVersionError(async () => {
    if (o.variant !== undefined) {
      const b = Number(o.variant);
      const seed = await docs.seedOf(db, docId, b), now = (await docs.readDoc(db, docId, { variant: b })).json;
      return { against: { version: await seedNumberOf(db, docId, b), edit: null }, changes: docs.diff(seed, now), edits: await named(db, await docs.history(db, docId, { variant: b })) };
    }
    const seq = Number(o.edit);
    if (!Number.isInteger(seq) || seq < 1) throw new VersionError("Name an edit (its seq) or a variant.");
    const { rows } = await db.query<{ variant: string | null }>(`SELECT variant FROM play.doc_edits WHERE doc_id = $1 AND seq = $2`, [docId, seq]);
    if (!rows[0]) throw new VersionError(`No edit ${seq}.`, 404);
    const line = rows[0].variant === null ? null : Number(rows[0].variant);
    const { rows: p } = await db.query<{ seq: string | null }>(`SELECT max(seq) AS seq FROM play.doc_edits WHERE doc_id = $1 AND seq < $2 AND variant IS NOT DISTINCT FROM $3`, [docId, seq, line]);
    const prev = p[0]?.seq ? Number(p[0].seq) : null;
    const before = prev !== null ? await docs.stateAt(db, docId, { edit: prev }) : line !== null ? await docs.seedOf(db, docId, line) : {};
    const after = await docs.stateAt(db, docId, { edit: seq });
    return { against: { version: prev === null && line !== null ? await seedNumberOf(db, docId, line) : null, edit: prev }, changes: docs.diff(before, after) };
  });
}

// ---- editing and proposing

/**
 * An agent's edits as the document's own operations (set, insert, delete, move, text; ./docs/core.ts), with one help:
 * a step of a path may name a list's item by its id ({ id: 'weld' }) instead of its index, found in the state as it
 * stands before the operation.
 */
export function opsOf(json: any, edits: unknown): docs.Op[] {
  if (!Array.isArray(edits) || !edits.length) throw new VersionError("Edits are a list of at least one operation.");
  if (edits.length > 500) throw new VersionError("At most 500 operations an edit.");
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object" || !Array.isArray(e.path)) throw new VersionError(`Operation ${i + 1} names no path (a list of field names, indexes or { id }).`);
    if (e.path[0] === "schema") throw new VersionError(`Operation ${i + 1}: a document's schema is not edited.`);
    let at = json;
    const path = e.path.map((p: unknown, j: number) => {
      let key: string | number;
      if (p && typeof p === "object" && typeof (p as any).id === "string") {
        if (!Array.isArray(at)) throw new VersionError(`Operation ${i + 1}: part ${j + 1} of its path names { id: ${(p as any).id} } but there is no list there.`);
        const n = at.findIndex((x: any) => x?.id === (p as any).id);
        if (n < 0) throw new VersionError(`Operation ${i + 1}: there is no item ${(p as any).id} in the list at part ${j + 1} of its path.`);
        key = n;
      } else if (typeof p === "string" || (typeof p === "number" && Number.isInteger(p))) key = p;
      else throw new VersionError(`Operation ${i + 1}: part ${j + 1} of its path is a field name, an index or { id }.`);
      at = at?.[key as any];
      return key;
    });
    return { ...e, path } as docs.Op;
  });
}

/** one edit of variant `b`: the kind's own reading of the change, else operations, the whole, or a few fields */
async function keepEdit(env: Env, tx: Queryable, k: DocKind, uuid: string, docId: string, b: number, c: Change, message: string, author: docs.Author) {
  const cur = (await docs.readDoc(tx, docId, { variant: b })).json;
  const given = [c.edits, c.whole, c.fields].filter((x) => x !== undefined).length;
  if (given !== 1) throw new VersionError("An edit is operations (edits), the whole document (whole) or a few of its fields (fields): one of them.");
  if (k.change) {
    const w = await k.change(env, tx, uuid, cur, c);
    return docs.commit(tx, docId, { variant: b, ...w, message, author });
  }
  if (c.edits !== undefined) return docs.commit(tx, docId, { variant: b, ops: opsOf(cur, c.edits), message, author });
  const whole = c.whole !== undefined ? c.whole : { ...cur, ...(c.fields as object) };
  if (!whole || typeof whole !== "object" || Array.isArray(whole)) throw new VersionError("A whole document is an object (doc_at's `json`).");
  return docs.commit(tx, docId, { variant: b, target: { ...(whole as object), schema: cur.schema }, message, author });
}

const textOf = (v: unknown, what: string, most: number) => {
  if (typeof v !== "string" || !v.trim()) throw new VersionError(`${what} is missing.`);
  if (v.length > most) throw new VersionError(`${what} is longer than ${most} characters.`);
  return v.trim();
};

/** One edit of an intent variant, as `me`: on variant `variant`, or on a new one seeded at Main's newest version. */
export async function editDoc(env: Env, me: Me | null, p: EditArgs, via: Via = "mcp") {
  const { uuid, docId, k } = await docOf(env, p?.doc);
  const who = mayOf(k, me);
  const message = textOf(p.message, "The edit's message (what it does)", 500);
  return asVersionError(() =>
    env.db.transaction(async (tx) => {
      const author = authorOf(who, via);
      const b = p.variant == null ? (await docs.variant(tx, docId, { author, note: message })).id : (await openVariant(tx, docId, p.variant)).id;
      const e = await keepEdit(env, tx, k, uuid, docId, b, p, message, author);
      const changes = docs.diff(await docs.seedOf(tx, docId, b), (await docs.readDoc(tx, docId, { variant: b })).json);
      return { doc: uuid, kind: k.kind, variant: b, edit: e?.seq ?? null, changed: !!e, edits: (await docs.history(tx, docId, { variant: b })).length, changes: changes.length };
    }),
  );
}

/**
 * Propose an intent variant, as `me`: one made edit by edit (its `variant`, perhaps with one more edit), or a change
 * at once on Main's newest version. It puts an intent at Proposal with it (the intent named, held to its gate by the
 * caller, or a new one of its own), for a person to accept or archive. A kind with a proposal of its own (an asset's
 * version, a story's) makes it from the variant.
 */
export async function proposeDoc(env: Env, me: Me | null, p: ProposeArgs, via: Via = "mcp") {
  const { uuid, docId, k } = await docOf(env, p?.doc);
  const who = mayOf(k, me);
  const note = textOf(p.note, "The note (what changes and why)", NOTE_MOST);
  const changing = p.edits !== undefined || p.whole !== undefined || p.fields !== undefined;
  if (p.variant == null && !changing && !k.propose) throw new VersionError("Propose a variant (its number), or a change: edits, the whole document or a few fields.");
  if (k.propose) {
    // the change kept first as an edit of the variant; a variant this call opened is closed again where the change
    // altered nothing or the kind refuses the proposal, so a refused proposal leaves no open variant behind
    let variant: number | null = p.variant == null ? null : Number(p.variant);
    let opened: number | null = null;
    if (changing) {
      const e = await editDoc(env, who, { doc: uuid, variant: variant ?? undefined, edits: p.edits, whole: p.whole, fields: p.fields, message: firstLine(note, 500) }, via);
      if (variant === null) opened = e.variant;
      variant = e.variant;
      if (opened !== null && !e.changed) {
        await docs.close(env.db, docId, opened, { author: authorOf(who, via), status: "archived" });
        throw new VersionError(`That is the ${k.title.toLowerCase()} as it is: nothing changed.`);
      }
    }
    try {
      return await k.propose(env, who, { uuid, variant, note, intent: p.intent, extra: p.extra }, via);
    } catch (e) {
      if (opened !== null) await docs.close(env.db, docId, opened, { author: authorOf(who, via), status: "archived" }).catch(() => {});
      throw e;
    }
  }
  return asVersionError(() =>
    env.db.transaction(async (tx) => {
      const author = authorOf(who, via);
      const b = p.variant == null ? (await docs.variant(tx, docId, { author, note })).id : (await openVariant(tx, docId, p.variant)).id;
      if (changing) await keepEdit(env, tx, k, uuid, docId, b, p, firstLine(note, 500), author);
      const changes = docs.diff(await docs.seedOf(tx, docId, b), (await docs.readDoc(tx, docId, { variant: b })).json);
      if (!changes.length) throw new VersionError(`That is the ${k.title.toLowerCase()} as it is: nothing changed.`);
      await docs.propose(tx, docId, b, { note, author });
      const intent = await putAtProposal(tx, who, { intent: p.intent, work: { kind: k.work, doc_id: docId, doc_variant: b }, note, via });
      const number = ((await docs.versionsOf(tx, docId)).at(-1)?.number ?? 0) + 1;
      return { intent, stage: "proposal" as const, doc: uuid, kind: k.kind, number, variant: b, edits: (await docs.history(tx, docId, { variant: b })).length, changes: changes.length };
    }),
  );
}

// ---- reviewing and deciding

/** A document's work as people review it: what it changes, field by field, against its seed; its edits; and its kind's own review beside. */
async function docReview(env: { db: Queryable; store?: BlobStore }, k: DocKind, w: any) {
  const db = env.db;
  const docId = w.doc_id as string | null;
  const b = w.doc_variant == null ? null : Number(w.doc_variant);
  let generic: Record<string, unknown> = {};
  if (docId && b !== null) {
    const seed = await docs.seedOf(db, docId, b);
    const next = (await docs.readDoc(db, docId, { variant: b })).json;
    const row = await docs.readDoc(db, docId);
    const seedNumber = await seedNumberOf(db, docId, b);
    const moved = w.status === "proposal" && seedNumber !== null && seedNumber !== row.versions.at(-1)?.number;
    generic = { doc: { id: uuidOf(docId), kind: k.kind, label: shownOf(k, next).label || row.label, group: row.grp }, seedNumber, moved, changes: docs.diff(seed, next), edits: await named(db, await docs.history(db, docId, { variant: b })) };
  }
  return { ...generic, ...(k.review ? await k.review(env as Env, w) : {}) };
}

/** Accept or archive a document's work (locked by the caller's transaction): merged into Main and named its next version, or closed. */
async function docDecide(env: { store: BlobStore }, tx: Queryable, me: Me, k: DocKind, w: any, verdict: Verdict) {
  mayOf(k, me);
  if (k.decide) return k.decide(env, tx, me, w, verdict);
  return asVersionError(async () => {
    const docId = w.doc_id as string, b = Number(w.doc_variant);
    const archive = async (message?: string) => {
      await settle(tx, w.id, "archived", verdict === "archive" ? me.id : null);
      await closeWork(tx, me, w);
      return { id: w.id as string, status: "archived" as const, ...(message ? { message } : {}) };
    };
    if (verdict === "archive") return archive();
    const preview = await docs.previewMerge(tx, docId, b);
    if (preview.concurrent) {
      const was = await docs.seedOf(tx, docId, b);
      const now = (await docs.readDoc(tx, docId)).json, mine = (await docs.readDoc(tx, docId, { variant: b })).json;
      const clash = overlap(docs.diff(was, now).map((c) => c.path), docs.diff(was, mine).map((c) => c.path));
      if (clash.length) return archive(`The ${k.title.toLowerCase()} has a newer version than the one this was made on, and it changes what that changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")}). Propose the change again on its newest version.`);
    }
    if (preview.problems.length) return archive(`Merged into the ${k.title.toLowerCase()} as it is now, this is no longer valid: ${preview.problems.slice(0, 3).join("; ")}. Propose it again on its newest version.`);
    const s = shownOf(k, preview.json);
    const v = await docs.accept(tx, docId, b, { author: authorOf(me, "web"), note: w.note, label: s.label, ...(s.grp !== undefined ? { grp: s.grp } : {}) });
    await settle(tx, w.id, "accepted", me.id);
    return { id: w.id as string, status: "accepted" as const, number: v.number, ...(preview.concurrent ? { merged: true } : {}) };
  });
}

/**
 * An intent's work as people review it before they decide (`shown`: the work as ./intents.ts lists it, with its label,
 * group and number): a document's, field by field against its seed with its edits, and its kind's own review beside
 * (an asset built in the box, a story played); other work (a sandbox's change), its kind's.
 */
export async function reviewOf(env: { db: Queryable; store?: BlobStore }, id: string, shown: any) {
  const p = { ...(await workOf(env.db, id)), ...shown, id };
  if (!p.kind) return null;
  const k = workKindOf(p.kind);
  if (!k) return p;
  if (isDocKind(k)) return { ...p, ...(await docReview(env, k, p)) };
  return { ...p, ...(await k.review(env.db, p)) };
}

/** An intent's work archived by whoever proposed it: the intent archived, its variant closed, kept in the history. */
async function archiveAsAuthor(tx: Queryable, me: Me, p: any) {
  await settle(tx, p.id, "archived", me.id);
  await closeWork(tx, me, p);
  return { id: p.id as string, status: "archived" as const };
}

/**
 * An agent archives its own intent over MCP (Samuel 2026-11-04): one at Proposal whose work it no longer stands by, or
 * one newer work of its own replaces elsewhere. Only an intent its admin put at Proposal over MCP, never anyone else's
 * and never one proposed on the page; accepting stays a person's, on the intents' board.
 */
export async function archiveOwn(db: Db, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (!UUID.test(id)) throw new VersionError("Name the intent by its id (list_intents gives it).");
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT ${WORK_OF}, i.author AS intent_author, i.via AS intent_via FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2 FOR UPDATE`, [id, COOP]);
    const p = rows[0];
    if (!p) throw new VersionError("There is no such intent.", 404);
    const [by, via] = p.kind ? [p.author, p.via] : [p.intent_author, p.intent_via];
    if (by !== me.id || via !== "mcp") throw new VersionError("Only an intent you put at Proposal over MCP is yours to archive; the rest are decided on the intents' board.", 403);
    if (p.stage !== "proposal") throw new VersionError(`This intent is at the ${p.stage} stage: only one at Proposal is archived so.`, 409);
    return { ...(await archiveAsAuthor(tx, me, p)), intent: p.id as string, stage: "archived" as const };
  });
}

/**
 * Accept or archive an intent's work at Proposal (it ends accepted or archived, nothing else): a person decides any;
 * whoever proposed it may archive their own. Its kind decides how it goes in. The answer says the stage it settled at.
 */
export async function decide(env: { db: Db; store: BlobStore }, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return env.db.transaction(async (tx) => {
    const p = await workOf(tx, id, true);
    if (!p) throw new VersionError("There is no such intent.", 404);
    if (!p.kind) throw new VersionError(`Intent ${p.id} holds no work of play's to decide.`, 409);
    if (p.stage !== "proposal") throw new VersionError(`This intent is at the ${p.stage} stage: only one at Proposal is decided.`, 409);
    let r: any;
    const k = workKindOf(p.kind);
    if (verdict === "archive" && p.author === me.id && me.level !== "admin") r = await archiveAsAuthor(tx, me, p);
    else if (!k) throw new VersionError(`Work of kind ${p.kind} is decided nowhere.`, 500);
    else if (isDocKind(k)) r = await docDecide(env, tx, me, k, p, verdict);
    else r = await k.decide(tx, me, p, verdict);
    const { rows } = await tx.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [p.id]);
    return { ...r, intent: p.id as string, stage: rows[0]?.stage };
  });
}

/**
 * A person's decision on an intent, whatever its stage (the one place an intent is decided; play/SPEC.md §4.12): at
 * Proposal with work of play's, accepting applies it and archiving archives it (decide); anything else is the intent's
 * own decision (./intents.ts decideIntent), except that accepting an intent whose code is a pull request ships it
 * (./ship.ts acceptAndShip). Gives back the intent, with the decision's message where it has one.
 */
export async function decideAny(env: { db: Db; store: BlobStore }, me: Me | null, id: string, verdict: IntentVerdict | "archive", gh: GitHub | null = null) {
  const { decideIntent, getIntent, IntentError } = await import("./intents");
  const { acceptAndShip } = await import("./ship");
  const w = await workOf(env.db, id);
  if (!w) throw new IntentError("There is no such intent.", 404);
  if (verdict === "accept" && !w.kind) {
    const shipped = await acceptAndShip(env.db, gh, me, w.id);
    if (shipped) return shipped;
  }
  let decision: { status: string; number?: number; version?: string; merged?: boolean; message?: string } | undefined;
  if (w.kind && w.stage === "proposal" && (verdict === "accept" || verdict === "archive" || verdict === "reject")) {
    const { id: _id, intent: _i, stage: _s, why, ...r }: any = await decide(env, me, w.id, verdict === "accept" ? "accept" : "archive");
    decision = { ...r, ...(r.message ?? why ? { message: r.message ?? why } : {}) };
  } else await decideIntent(env.db, me, w.id, verdict === "archive" ? "reject" : verdict);
  const said = decision ? { decision, ...(decision.message ? { message: decision.message } : {}) } : {};
  if (me?.level !== "admin") return { id: w.id, stage: (await workOf(env.db, w.id))?.stage, ...said };
  return { ...(await getIntent(env.db, w.id)), ...said };
}
