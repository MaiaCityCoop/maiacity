// One version control (play/SPEC.md "Version control", Samuel 2026-11-06): every versioned kind of play's (an asset, a
// story, a factory, a game config, a skill, and whatever comes next) is one entry of the registry below, and one module
// does the rest for each: list, read (at a version, an edit, or an intent's variant), history (edits, versions,
// variants), edit, propose, review and decide. The words are one set everywhere:
//
//   Edit            one change, kept with its author, message and time
//   Variant         a line of edits of one document
//   Main            the default variant: what is accepted
//   Intent variant  a variant that exists only inside an intent and goes through its stages; Accept merges it into
//                   Main, Archive closes it (kept in the history)
//   Seed            the version a variant grows from ("seeded from Main v3"); a document's first version is just v1
//   Version         a numbered state of Main, named on accept
//
// An entry holds its document prefix and type (./docs/schema.ts, until schemas are documents), its row table, label and
// group (only shown), and hooks only where the kind really differs: edit helpers, a whole-document check, its own
// propose (an asset's recipe built, a story's frozen row), its own decide, the fields its row keeps of an accepted
// version, its list item's extra fields. A kind is named by its document's UUID everywhere (MCP's list_docs, doc_at,
// doc_history, doc_edit, propose_doc_version; HTTP's /api/docs/<uuid>, /history, /changes; the board's review).
import { Denied, type Me } from "./access";
import type { BlobStore } from "./blobs";
import * as docs from "./docs";
import { ARTIFACT, ASSET, FACTORY, LEVELS, SKILL, SKILL_STAGES, STORY, TYPES, type DocType } from "./docs/schema";
import type { Db, Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { newId, UUID } from "./uuid";
import { closeWork, putAtProposal, SANDBOX_WORK, settle, WORK_OF, workOf, WorkError } from "./work";
import { decideSandbox, sandboxReview } from "./sandboxes";
import { decideIntent, getIntent, IntentError, type IntentVerdict } from "./intents";
import { acceptAndShip, type GitHub } from "./ship";
import { assetDocFor, assetEdits, assetReview, decideAsset, ensureAssetDoc, proposeAssetVariant } from "./assetdocs";
import { decideStory, proposeStoryVariant, storyEdit, storyReview } from "./stories";
import { ensureStoryDoc } from "./storydocs";
import { COOP } from "./access";

export class VersionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** how a hook is called: the database, the file store, who, how */
export type Ctx = { db: Db; store: BlobStore };
type Input = { edits?: unknown; whole?: unknown };

export type Kind = {
  /** its name, as list_docs takes it */
  name: string;
  /** its documents' id prefix: <prefix>:<uuid> */
  prefix: string;
  /** its document type (./docs/schema.ts) */
  type: DocType;
  /** the work an intent holding one of its versions names: <name>_version */
  work: string;
  /** the table of its rows (each its UUID and its label), the column its label is in, and a filter of the listed */
  table: string;
  labelColumn?: string;
  listed?: string;
  /** only shown: what one is called, the board's group for it, and the page that opens one (`{id}` its UUID, `{intent}` an intent's) */
  label: string;
  group: string;
  open?: string;
  /** an accepted version's fields its row keeps (column → field of the document) */
  row?: Record<string, (json: any) => unknown>;
  /** its document made where it is missing (from the kind's own history) */
  ensure?: (q: Queryable, ctx: Ctx, id: string) => Promise<void>;
  /** an edit of an agent's turned into the document's own: edits, or the whole new state */
  write?: (q: Queryable, id: string, cur: any, input: Input) => Promise<docs.Write>;
  /** the kind's own propose, its intent variant as it stands (an asset's recipe files and frozen version; a story's) */
  propose?: (ctx: Ctx, me: Me, o: { id: string; variant: number; note: string; intent?: string }, via: "web" | "mcp") => Promise<Record<string, unknown> & { intent: string }>;
  /** what the board shows of its work beside the changes and edits (an asset's builds, a story's player) */
  review?: (q: Queryable, p: any) => Promise<Record<string, unknown>>;
  /** the kind's own decide (an asset accepted only on the head it was made on; a story's frozen rows) */
  decide?: (tx: Queryable, ctx: Ctx, me: Me, p: any, verdict: Verdict) => Promise<any>;
  /** its list item's extra fields */
  item?: (json: any) => Record<string, unknown>;
};

const KINDS: Kind[] = [];

/** a kind registered: its document type known to the store, its entry to the module */
export function register(k: Kind): Kind {
  if (!/^[a-z][a-z_]{0,31}$/.test(k.name) || !/^[a-z][a-z_]{0,31}$/.test(k.prefix)) throw new Error(`a kind's name and prefix are lowercase words: ${k.name}, ${k.prefix}`);
  if (k.type.type !== k.prefix) throw new Error(`kind ${k.name}: its type's documents are ${k.type.type}:, not ${k.prefix}:`);
  if (k.work !== `${k.name}_version`) throw new Error(`kind ${k.name}: its work is ${k.name}_version`);
  const at = KINDS.findIndex((x) => x.name === k.name);
  if (at >= 0) KINDS.splice(at, 1);
  KINDS.push(k);
  TYPES[k.type.name] = k.type;
  return k;
}
/** a kind taken out of the registry again (a test's own kind, once its test is done) */
export function unregister(name: string): void {
  const at = KINDS.findIndex((x) => x.name === name);
  if (at >= 0) delete TYPES[KINDS.splice(at, 1)[0].type.name];
}
export const kinds = (): readonly Kind[] => KINDS;
export const kindNamed = (name: string) => KINDS.find((k) => k.name === name) ?? null;
export const kindOfWork = (work: string | null | undefined) => KINDS.find((k) => k.work === work) ?? null;
export const kindOfDoc = (docId: string | null | undefined) => KINDS.find((k) => `${docId ?? ""}`.startsWith(k.prefix + ":")) ?? null;
/** every kind of work an intent may hold */
export const workKinds = () => [...KINDS.map((k) => k.work), SANDBOX_WORK];

// ---- written once: who names an edit, the version an edit or a seed is, two changes that touch the same field, errors

const iso = (d: Date | string) => new Date(d).toISOString();
const authorOf = (me: Pick<Me, "id"> | null, via: string): docs.Author => ({ human: me?.id ?? null, via: via === "mcp" ? "mcp" : "site" });

/** each edit with its author's name, and the version it was named where one was */
export async function named(db: Queryable, edits: docs.DocEdit[], versions: docs.Version[] = []) {
  const ids = [...new Set(edits.map((s) => s.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  const at = new Map(versions.map((v) => [docs.frontiersKey(v.frontiers), v.number]));
  // a version marks the latest edit at its point (a merge that only caught Main up stands where the intent variant's
  // last edit stood: the merge is the edit that made it the version)
  const marked = new Map<number, number>();
  for (let i = edits.length - 1; i >= 0; i--) {
    const n = at.get(docs.frontiersKey(edits[i].frontiers));
    if (n !== undefined && ![...marked.values()].includes(n)) marked.set(i, n);
  }
  return edits.map((s, i) => ({ seq: s.seq, variant: s.variant, kind: s.kind, author: s.author ? names.get(s.author) ?? null : null, via: s.via, message: s.message, at: iso(s.created), bytes: s.bytes, version: marked.get(i) ?? null }));
}

/** the version whose point of Main is `frontiers` (a variant's seed), or null */
export const versionAt = (versions: docs.Version[], frontiers: docs.Frontiers): number | null =>
  versions.find((v) => docs.frontiersKey(v.frontiers) === docs.frontiersKey(frontiers))?.number ?? null;

/** do two sets of changed paths touch the same field (one the other's, or inside it)? */
export function overlap(a: string[], b: string[]): string[] {
  const inside = (x: string, y: string) => x === y || x.startsWith(y + ".") || x.startsWith(y + "[");
  return a.filter((x) => b.some((y) => inside(x, y) || inside(y, x)));
}

/** a document's errors said as the API's (MCP shows them to the agent) */
export async function asVersionError<R>(run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof docs.DocError) throw new VersionError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof docs.EditError) throw new VersionError(e.message);
    throw e;
  }
}

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("A document's versions, edits and variants are for Maia City's admins, for now.");
  return me;
}
function text(v: unknown, what: string, most: number): string {
  if (typeof v !== "string" || !v.trim()) throw new VersionError(`${what} is missing.`);
  if (v.length > most) throw new VersionError(`${what} is longer than ${most} characters.`);
  return v.trim();
}
const qi = (s: string) => s.replace(/[^a-z0-9_.]/g, "");

/** a document named by its UUID: its kind and id, its document made where its kind makes it from its own history */
export async function docRef(q: Queryable, ctx: Ctx | null, id: unknown): Promise<{ kind: Kind; uuid: string; docId: string }> {
  const uuid = `${id ?? ""}`.toLowerCase();
  if (!UUID.test(uuid)) throw new VersionError("Name the document by its UUID (list_docs).", 404);
  if (!KINDS.length) throw new VersionError("play keeps no versioned kind.", 500);
  const { rows } = await q.query<{ k: string }>(KINDS.map((k, i) => `SELECT '${k.name}' AS k, ${i} AS o FROM ${qi(k.table)} WHERE id::text = $1`).join(" UNION ALL ") + " ORDER BY o LIMIT 1", [uuid]);
  const kind = rows[0] ? kindNamed(rows[0].k) : null;
  if (!kind) throw new VersionError(`play keeps no document ${uuid} (list_docs).`, 404);
  const docId = `${kind.prefix}:${uuid}`;
  if (kind.ensure && ctx) {
    const { rows: have } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [docId]);
    if (!have.length) await kind.ensure(q, ctx, uuid);
  }
  return { kind, uuid, docId };
}

/** a document's versions, each with who accepted it and its note */
async function versionsNamed(db: Queryable, docId: string) {
  const versions = await docs.versionsOf(db, docId);
  const ids = [...new Set(versions.map((v) => v.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  return versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), acceptedBy: v.author ? names.get(v.author) ?? null : null, contentHash: v.contentHash }));
}

/** an intent's variant of document `docId`, by the intent's id: the one it holds as its work, else the one it is making */
async function intentVariant(db: Queryable, docId: string, intent: unknown) {
  const s = `${intent ?? ""}`.toLowerCase();
  if (!UUID.test(s)) throw new VersionError("Name the intent by its id (a UUID).", 404);
  const { rows } = await db.query<{ id: string; doc_variant: string | null; stage: string; note: string; title: string }>(
    `SELECT i.id, COALESCE((SELECT iv.variant_id FROM play.intent_variants iv WHERE iv.intent_id = i.id AND iv.doc_id = $3),
                           (SELECT max(v.id) FROM play.doc_variants v WHERE v.intent_id = i.id AND v.doc_id = $3)) AS doc_variant,
            i.stage, COALESCE(i.work_note, '') AS note, i.title FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2`,
    [s, COOP, docId],
  );
  if (!rows[0]?.doc_variant) throw new VersionError(`${docId} has no variant of intent ${s}.`, 404);
  const status = rows[0].stage === "proposal" ? "proposal" : rows[0].stage === "accepted" ? "accepted" : "archived";
  return { id: rows[0].id, variant: Number(rows[0].doc_variant), stage: rows[0].stage, status, note: rows[0].note, title: rows[0].title };
}

// ---- reading

/** every document of kind `kind` (every kind's where none is named): its UUID, kind, label, newest version, how many versions */
export async function listDocs(db: Queryable, me: Me | null, kind?: string) {
  admin(me);
  const ks = kind === undefined || kind === null || kind === "" ? KINDS : [kindNamed(`${kind}`)].filter((k): k is Kind => !!k);
  if (!ks.length) throw new VersionError(`A kind is one of ${KINDS.map((k) => k.name).join(", ")}.`);
  const out: Record<string, unknown>[] = [];
  for (const k of ks) {
    const { rows } = await db.query<any>(
      `SELECT r.id::text AS id, r.${qi(k.labelColumn ?? "label")} AS label, d.id AS doc,
              (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS number,
              (SELECT count(*) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS versions,
              (SELECT max(created) FROM play.doc_versions v WHERE v.doc_id = '${k.prefix}:' || r.id::text) AS updated
         FROM ${qi(k.table)} r LEFT JOIN play.docs d ON d.id = '${k.prefix}:' || r.id::text
        ${k.listed ? `WHERE ${k.listed}` : ""} ORDER BY r.created, r.id`,
    );
    for (const r of rows) {
      const extra = k.item && r.doc ? k.item((await docs.readDoc(db, r.doc)).json) : {};
      out.push({ id: r.id, kind: k.name, label: r.label, number: r.number ?? 0, versions: Number(r.versions), updated: r.updated ? iso(r.updated) : null, ...extra });
    }
  }
  return out;
}

export type DocAt = { version?: number; edit?: number; intent?: string };

/** One document, whole: at Main's newest version, at version `version`, at edit `edit`, or as intent `intent`'s variant would make it. With its versions. */
export async function docAt(ctx: Ctx, me: Me | null, id: unknown, at: DocAt = {}) {
  admin(me);
  return asVersionError(async () => {
    const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id));
    const db = ctx.db;
    const versions = await versionsNamed(db, docId);
    const number = versions.at(-1)?.number ?? 0;
    const base = { id: uuid, kind: kind.name, number, versions };
    if (at.intent !== undefined && at.intent !== null) {
      const iv = await intentVariant(db, docId, at.intent);
      return { ...base, json: (await docs.readDoc(db, docId, { variant: iv.variant })).json, intent: { id: iv.id, stage: iv.stage, status: iv.status, note: iv.note, title: iv.title, variant: iv.variant } };
    }
    if (at.edit !== undefined && at.edit !== null) {
      if (!Number.isInteger(at.edit) || at.edit < 1) throw new VersionError(`${at.edit} is not an edit.`, 404);
      return { ...base, json: await docs.stateAt(db, docId, { edit: at.edit }), edit: at.edit };
    }
    if (at.version !== undefined && at.version !== null) {
      if (!versions.some((v) => v.number === at.version)) throw new VersionError(`${uuid} has no version ${at.version}.`, 404);
      return { ...base, json: await docs.stateAt(db, docId, { version: at.version }), version: at.version };
    }
    return { ...base, json: (await docs.readDoc(db, docId)).json, version: number };
  });
}

/**
 * A document's history: its edits, oldest first (Main's, with each accepted intent variant's where it was made; with
 * `variant`, that variant's own), its versions, and its variants (Main, then each intent variant with its intent, its
 * seed and how many edits it holds).
 */
export async function docHistory(ctx: Ctx, me: Me | null, id: unknown, o: { variant?: number } = {}) {
  admin(me);
  return asVersionError(async () => {
    const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id));
    const db = ctx.db;
    const versions = await docs.versionsOf(db, docId);
    if (o.variant !== undefined && !(Number.isInteger(o.variant) && o.variant >= 1)) throw new VersionError("A variant is named by its number (doc_history gives them).", 404);
    const edits = await named(db, await docs.history(db, docId, o.variant === undefined ? {} : { variant: o.variant }), versions);
    const vs = await docs.variantsOf(db, docId);
    const ids = [...new Set(vs.map((v) => v.created_by).filter((x): x is string => !!x))];
    const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
    const intents = new Map(
      (await db.query<{ id: string; stage: string; title: string }>(`SELECT id, stage, title FROM play.intents WHERE id = ANY($1::uuid[])`, [vs.map((v) => v.intent_id).filter(Boolean)])).rows.map((r) => [r.id, r]),
    );
    return {
      id: uuid,
      kind: kind.name,
      edits,
      versions: (await versionsNamed(db, docId)).map((v, i) => ({ ...v, variant: versions[i].variant })),
      variants: vs.map((v) => ({
        id: v.id,
        type: v.type,
        status: v.status,
        note: v.note,
        at: iso(v.created),
        author: v.created_by ? names.get(v.created_by) ?? null : null,
        edits: v.edits,
        seed: v.type === "main" ? null : versionAt(versions, v.seed),
        intent: v.intent_id ? { id: v.intent_id, stage: intents.get(v.intent_id)?.stage ?? null, title: intents.get(v.intent_id)?.title ?? null } : null,
      })),
    };
  });
}

/**
 * What an edit or an intent variant changes, against the version it grew from: with `edit`, the state before it and
 * after it; with `variant`, its seed and where it stands now. The changes field by field, and the edits that made them.
 */
export async function docChanges(ctx: Ctx, me: Me | null, id: unknown, o: { edit?: number; variant?: number }) {
  admin(me);
  return asVersionError(async () => {
    const { kind, uuid, docId } = await (ctx.db as Db).transaction((q) => docRef(q, ctx, id));
    const db = ctx.db;
    const versions = await docs.versionsOf(db, docId);
    if (o.variant !== undefined && o.variant !== null) {
      const v = await docs.variantOf(db, docId, o.variant);
      const seed = await docs.seedOf(db, docId, o.variant);
      const now = (await docs.readDoc(db, docId, { variant: o.variant })).json;
      return { id: uuid, kind: kind.name, variant: v.id, seed: versionAt(versions, v.seed), changes: docs.diff(seed, now), edits: await named(db, await docs.history(db, docId, { variant: o.variant }), versions) };
    }
    if (o.edit === undefined || o.edit === null || !Number.isInteger(o.edit) || o.edit < 1) throw new VersionError("Name an edit (its seq) or an intent variant.", 404);
    const all = await docs.history(db, docId);
    const { rows } = await db.query<{ variant: string; type: string }>(`SELECT e.variant, v.type FROM play.doc_edits e JOIN play.doc_variants v ON v.id = e.variant WHERE e.doc_id = $1 AND e.seq = $2`, [docId, o.edit]);
    if (!rows[0]) throw new VersionError(`${uuid} has no edit ${o.edit}.`, 404);
    const line = rows[0].type === "intent" && !all.some((e) => e.seq === o.edit) ? await docs.history(db, docId, { variant: Number(rows[0].variant) }) : all;
    const i = line.findIndex((e) => e.seq === o.edit);
    const after = await docs.stateAt(db, docId, { edit: o.edit });
    const before = i > 0 ? await docs.stateAt(db, docId, { edit: line[i - 1].seq }) : line === all ? null : await docs.seedOf(db, docId, Number(rows[0].variant));
    return { id: uuid, kind: kind.name, edit: o.edit, changes: docs.diff(before, after), edits: await named(db, [line[i]], versions) };
  });
}

// ---- editing and proposing

/**
 * The edits an agent sends, as the document's own (set, insert, delete, move, text; ./docs/core.ts), with one help: a
 * part of a path may name an item of a list by its id ({ id: 'weld' }) instead of its index, worked out against the
 * state as it stands before the edit.
 */
export function resolveEdits(json: any, edits: unknown): docs.Edit[] {
  if (!Array.isArray(edits) || !edits.length) throw new VersionError("Edits are a list of at least one edit.");
  if (edits.length > 500) throw new VersionError("At most 500 edits at once.");
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object" || !Array.isArray(e.path)) throw new VersionError(`Edit ${i + 1} names no path (a list of field names, indexes or { id }).`);
    if (e.path[0] === "schema") throw new VersionError(`Edit ${i + 1}: a document's schema is not edited.`);
    let at = json;
    const path = e.path.map((p: unknown, j: number) => {
      let part: string | number;
      if (p && typeof p === "object" && typeof (p as any).id === "string") {
        if (!Array.isArray(at)) throw new VersionError(`Edit ${i + 1}: part ${j + 1} of its path names { id: ${(p as any).id} } but there is no list there.`);
        const k = at.findIndex((x: any) => x?.id === (p as any).id);
        if (k < 0) throw new VersionError(`Edit ${i + 1}: there is no item ${(p as any).id} in the list at part ${j + 1} of its path.`);
        part = k;
      } else if (typeof p === "string" || (typeof p === "number" && Number.isInteger(p))) part = p;
      else throw new VersionError(`Edit ${i + 1}: part ${j + 1} of its path is a field name, an index or { id }.`);
      at = at?.[part as any];
      return part;
    });
    return { ...e, path } as docs.Edit;
  });
}

/** an edit's write: the kind's own, else the edits resolved, or the whole state with its schema kept */
async function writeOf(q: Queryable, k: Kind, uuid: string, cur: any, input: Input): Promise<docs.Write> {
  if (k.write) return k.write(q, uuid, cur, input);
  if (input.whole !== undefined) {
    if (!input.whole || typeof input.whole !== "object" || Array.isArray(input.whole)) throw new VersionError(`A whole ${k.label} is an object (doc_at's \`json\`).`);
    return { target: { ...(input.whole as object), schema: cur.schema } };
  }
  return { edits: resolveEdits(cur, input.edits) };
}

/** an intent variant of the document still open for edits, and the intent it is the work of (null: none yet) */
async function openVariant(q: Queryable, docId: string, uuid: string, v: unknown): Promise<{ id: number; seed: docs.Frontiers; intent: string | null }> {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new VersionError("An intent variant is named by its number (doc_edit gives it).");
  const { rows } = await q.query<{ status: string; seed: docs.Frontiers; type: string; intent_id: string | null }>(`SELECT status, seed, type, intent_id FROM play.doc_variants WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0] || rows[0].type !== "intent") throw new VersionError(`${uuid} has no intent variant ${n}.`, 404);
  if (rows[0].status !== "open") throw new VersionError(`Variant ${n} of ${uuid} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new variant" : rows[0].status}.`, 409);
  return { id: n, seed: rows[0].seed, intent: rows[0].intent_id };
}

/** the intent an edit is made for (no edit without one): one that is being built or waits at Proposal */
async function editingIntent(q: Queryable, intent: unknown): Promise<string> {
  const s = `${intent ?? ""}`.toLowerCase();
  if (!s) throw new VersionError("Every edit is an intent's: name the intent it is made for (`intent`, its id: add_intent makes one).");
  if (!UUID.test(s)) throw new VersionError("Name the intent by its id (a UUID: list_intents gives it).", 404);
  const { rows } = await q.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1 AND coop_id = $2`, [s, COOP]);
  if (!rows[0]) throw new VersionError(`There is no intent ${s}.`, 404);
  if (rows[0].stage !== "prototype" && rows[0].stage !== "proposal")
    throw new VersionError(`Intent ${s} is at the ${rows[0].stage} stage: it is edited for once its spec is approved (Prototype), or while it waits at Proposal.`, 409);
  return s;
}

/** the variant an edit goes on: the one named (the intent's, or none's yet), else the intent's open one of this document, else a new one seeded from Main's newest version */
async function variantFor(q: Queryable, docId: string, uuid: string, intent: string | null, v: unknown, author: docs.Author, note: string): Promise<number> {
  if (v != null) {
    const o = await openVariant(q, docId, uuid, v);
    if (o.intent && intent && o.intent !== intent) throw new VersionError(`Variant ${o.id} of ${uuid} is intent ${o.intent}'s, not ${intent}'s.`, 409);
    if (o.intent && !intent) throw new VersionError(`Variant ${o.id} of ${uuid} is intent ${o.intent}'s: name it (\`intent\`).`, 409);
    if (intent && !o.intent) await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [o.id, intent]);
    return o.id;
  }
  if (intent) {
    const { rows } = await q.query<{ id: string }>(`SELECT max(id) AS id FROM play.doc_variants WHERE doc_id = $1 AND intent_id = $2 AND status = 'open'`, [docId, intent]);
    if (rows[0]?.id) return Number(rows[0].id);
  }
  const made = (await docs.variant(q, docId, { author, note })).id;
  if (intent) await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [made, intent]);
  return made;
}

export type DocEditBody = { doc: unknown; intent?: unknown; variant?: number | null; edits?: unknown; whole?: unknown; message?: unknown };

/**
 * One edit of an intent variant, as the admin `me`, for intent `intent` (no edit without one: Main is written only by an
 * Accept): on variant `variant`, else on the intent's open variant of the document, else on a new one seeded from Main's
 * newest version. (`unnamed`: an edit a propose makes on its way to a new intent of its own.)
 */
export async function docEdit(ctx: Ctx, me: Me | null, p: DocEditBody, via: "web" | "mcp" = "mcp", unnamed = false) {
  const who = admin(me);
  const message = text(p?.message, "The edit's message (what it does)", 500);
  if ((p.edits === undefined) === (p.whole === undefined)) throw new VersionError("An edit is edits or the whole document, one of them.");
  return asVersionError(() =>
    ctx.db.transaction(async (tx) => {
      const intent = unnamed && (p.intent === undefined || p.intent === null || p.intent === "") ? null : await editingIntent(tx, p.intent);
      const { kind, uuid, docId } = await docRef(tx, ctx, p.doc);
      const author = authorOf(who, via);
      const v = await variantFor(tx, docId, uuid, intent, p.variant, author, message);
      const cur = (await docs.readDoc(tx, docId, { variant: v })).json;
      const e = await docs.commit(tx, docId, { variant: v, ...(await writeOf(tx, kind, uuid, cur, p)), message, author });
      const changes = docs.diff(await docs.seedOf(tx, docId, v), (await docs.readDoc(tx, docId, { variant: v })).json);
      return { doc: uuid, kind: kind.name, intent, variant: v, edit: e?.seq ?? null, changed: !!e, edits: (await docs.history(tx, docId, { variant: v })).length, changes: changes.length };
    }),
  );
}

export type ProposeBody = { doc: unknown; note?: unknown; variant?: number | null; edits?: unknown; whole?: unknown; intent?: string };

/** a variant made edit by edit is proposed for the intent it was made for, and only for it */
async function proposedFor(q: Queryable, docId: string, uuid: string, v: number, intent: string | undefined) {
  const o = await openVariant(q, docId, uuid, v);
  if (o.intent && o.intent !== intent) throw new VersionError(`Variant ${v} of ${uuid} is intent ${o.intent}'s: propose it naming that intent (\`intent\`).`, 409);
  return o;
}

/**
 * Propose the document's next version, as the admin `me`: an intent variant made edit by edit (its `variant`, perhaps
 * with one more edit), or edits (or the whole) at once. To propose is to put an intent at Proposal with the work: the
 * intent named (beside the other documents it changes), or a new one of its own.
 */
export async function proposeDocVersion(ctx: Ctx, me: Me | null, p: ProposeBody, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const note = text(p?.note, "The note (what changes and why)", NOTE_MOST);
  if (p.variant == null && (p.edits === undefined) === (p.whole === undefined)) throw new VersionError("Propose an intent variant (its number), edits, or the whole document.");
  if (p.edits !== undefined && p.whole !== undefined) throw new VersionError("Give edits or the whole document, not both.");
  const ref = await (ctx.db as Db).transaction((q) => docRef(q, ctx, p.doc));
  const { kind, uuid, docId } = ref;
  if (kind.propose) {
    // the kind's own propose (an asset's recipe files, a story's frozen row), on its intent variant as it stands
    let v = p.variant ?? null;
    if (v != null) await ctx.db.transaction((q) => proposedFor(q, docId, uuid, Number(v), p.intent));
    if (p.edits !== undefined || p.whole !== undefined) {
      const e = await docEdit(ctx, who, { doc: uuid, intent: p.intent, variant: v, edits: p.edits, whole: p.whole, message: note.split("\n")[0].slice(0, 500) }, via, true);
      if (!e.edits) throw new VersionError(`That is the ${kind.label} as it is: nothing changed.`);
      v = e.variant;
    }
    const out = await asVersionError(() => kind.propose!(ctx, who, { id: uuid, variant: Number(v), note, intent: p.intent }, via));
    const edits = (await docs.history(ctx.db, docId, { variant: Number(v) })).length;
    return { ...out, stage: "proposal" as const, doc: uuid, kind: kind.name, variant: Number(v), edits };
  }
  return asVersionError(() => ctx.db.transaction((tx) => proposeIn(tx, ctx, who, kind, uuid, docId, p, note, via)));
}

/** a document's next version proposed, in the caller's transaction (./versioned.ts proposeDocVersion, proposeNewDoc) */
async function proposeIn(tx: Queryable, ctx: Ctx, who: Me, kind: Kind, uuid: string, docId: string, p: ProposeBody, note: string, via: "web" | "mcp") {
  const author = authorOf(who, via);
  const v = p.variant == null ? (await docs.variant(tx, docId, { author, note })).id : (await proposedFor(tx, docId, uuid, p.variant, p.intent)).id;
  if (p.edits !== undefined || p.whole !== undefined) {
    const cur = (await docs.readDoc(tx, docId, { variant: v })).json;
    await docs.commit(tx, docId, { variant: v, ...(await writeOf(tx, kind, uuid, cur, p)), message: note, author });
  }
  const now = (await docs.readDoc(tx, docId, { variant: v })).json;
  const changes = docs.diff(await docs.seedOf(tx, docId, v), now);
  if (!changes.length) throw new VersionError(`That is the ${kind.label} as it is: nothing changed.`);
  await docs.propose(tx, docId, v, { note, author });
  const intent = await putAtProposal(tx, who, { intent: p.intent, work: { kind: kind.work, doc_id: docId, doc_variant: v }, note, via: via === "mcp" ? "mcp" : "web", title: `${now.label ?? now.title ?? kind.label}` }).catch((e) => {
    throw e instanceof WorkError ? new VersionError(e.message, e.status) : e;
  });
  const number = ((await docs.versionsOf(tx, docId)).at(-1)?.number ?? 0) + 1;
  return { intent, stage: "proposal" as const, doc: uuid, kind: kind.name, number, variant: v, edits: (await docs.history(tx, docId, { variant: v })).length, changes: changes.length };
}

/**
 * A new document of kind `kindName` proposed (an artifact kept for the first time): its row holding only its id until
 * an Accept writes it, its Main only its schema (no version yet), its first state an intent variant proposed for the
 * intent named, or a new one of its own. Nothing of it is Main's until it is accepted.
 */
export async function proposeNewDoc(ctx: Ctx, me: Me | null, kindName: string, o: { whole: Record<string, unknown>; note: string; intent?: string }, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const kind = kindNamed(kindName);
  if (!kind) throw new VersionError(`There is no kind ${kindName}.`, 500);
  const note = text(o.note, "The note (what it is and why)", NOTE_MOST);
  const uuid = newId();
  const docId = `${kind.prefix}:${uuid}`;
  return asVersionError(() =>
    ctx.db.transaction(async (tx) => {
      await tx.query(`INSERT INTO ${qi(kind.table)} (id, coop_id) VALUES ($1, $2)`, [uuid, COOP]);
      await docs.createDoc(tx, { id: docId, schema: kind.type.name, json: { schema: kind.type.name }, author: { human: who.id, via: "system" }, message: `a new ${kind.label}, not yet accepted` });
      return proposeIn(tx, ctx, who, kind, uuid, docId, { doc: uuid, whole: o.whole, intent: o.intent }, note, via);
    }),
  );
}

/** A document's first version, as a new document named v1 (the deploy's import): only when play holds none of its id. Gives back whether it was made. */
export async function seedDoc(db: Db, kindName: string, o: { id: string; json: any; note: string; at?: Date }): Promise<boolean> {
  const k = kindNamed(kindName);
  if (!k) throw new VersionError(`There is no kind ${kindName}.`);
  if (!UUID.test(o.id)) throw new VersionError(`A ${k.label} is named by its UUID, not ${o.id}.`);
  return db.transaction(async (q) => {
    const { rows } = await q.query(`SELECT 1 FROM ${qi(k.table)} WHERE id = $1`, [o.id]);
    if (rows.length) return false;
    const cols = { [k.labelColumn ?? "label"]: o.json.label, ...Object.fromEntries(Object.entries(k.row ?? {}).map(([c, f]) => [c, f(o.json)])) };
    const names = Object.keys(cols).map(qi);
    await q.query(`INSERT INTO ${qi(k.table)} (id, coop_id, ${names.join(", ")}) VALUES ($1, $2, ${names.map((_, i) => `$${i + 3}`).join(", ")})`, [o.id, COOP, ...Object.values(cols)]);
    await docs.createDoc(q, { id: `${k.prefix}:${o.id}`, schema: o.json.schema ?? k.type.name, json: o.json, author: { human: null, via: "import" }, message: `v1: ${o.note}`, ...(o.at ? { at: o.at } : {}), version: o.note });
    return true;
  });
}

// ---- reviewing and deciding

/** the documents an intent's work holds, each its document and its variant, the first its work's own */
const heldOf = (p: any): { doc_id: string; doc_variant: number | null }[] =>
  p.variants?.length ? p.variants : p.doc_id ? [{ doc_id: p.doc_id, doc_variant: p.doc_variant == null ? null : Number(p.doc_variant) }] : [];

/** one document's intent variant as people review it: what changed, field by field, against its seed, the edits that made it, whether Main moved since */
async function reviewVariant(db: Queryable, p: any, h: { doc_id: string; doc_variant: number | null }) {
  const k = kindOfDoc(h.doc_id) ?? kindOfWork(p.kind)!;
  const docId = h.doc_id;
  const uuid = docId.split(":")[1];
  if (h.doc_variant == null) return { doc: { id: uuid, kind: k.name }, seedNumber: null, moved: false, changes: [], edits: [] };
  const v = Number(h.doc_variant);
  const versions = await docs.versionsOf(db, docId);
  const row = await docs.variantOf(db, docId, v);
  const seed = await docs.seedOf(db, docId, v);
  const next = (await docs.readDoc(db, docId, { variant: v })).json;
  const seedNumber = versionAt(versions, row.seed);
  const moved = p.status === "proposal" && seedNumber !== null && seedNumber !== versions.at(-1)?.number;
  const edits = await named(db, await docs.history(db, docId, { variant: v }));
  const open = k.open ? k.open.replace("{id}", encodeURIComponent(uuid)).replace("{intent}", encodeURIComponent(p.id)) : null;
  return { doc: { id: uuid, kind: k.name, what: k.label, label: next.label ?? next.title ?? k.label, ...(next.group ? { group: next.group } : {}), open }, variant: v, seedNumber, moved, changes: docs.diff(seed, next), edits };
}

/** an intent's work on its documents as people review it: its first document's review (with its kind's own extras: an asset's builds, a story's player), and every document's in `docs` */
export async function reviewDoc(db: Queryable, p: any) {
  const k = kindOfWork(p.kind)!;
  const extra = k.review ? await k.review(db, p) : {};
  const each = [];
  for (const h of heldOf(p)) each.push(await reviewVariant(db, p, h));
  const first = each[0] ?? { doc: null, seedNumber: null, moved: false, changes: [], edits: [] };
  return { ...first, ...extra, docs: each };
}

/**
 * Accept or archive an intent's work on its documents (`p`, its intent locked by the caller's transaction), as admin
 * `me`: every one of them in this one transaction, or none. Accepted, each intent variant is merged into its Main and
 * named its next version, its row keeping what the version says; seeded from a version that is no longer Main's
 * newest, it still goes in where the two changes touch different fields. Where one clashes (the same field changed) or
 * is no longer valid merged, none goes in: the intent is archived whole. A kind with its own decide (an asset's, a
 * story's frozen rows) decides its own document, the first, once every other one has been found to go in.
 */
export async function decideDoc(tx: Queryable, ctx: Ctx, me: Me, p: any, verdict: Verdict) {
  const own = kindOfWork(p.kind)!;
  if (me.level !== "admin") throw new Denied(`Only Maia City's admins decide on ${own.group}.`);
  return asVersionError(async () => {
    const author = authorOf(me, "web");
    const held = heldOf(p).filter((h) => h.doc_variant != null) as { doc_id: string; doc_variant: number }[];
    const archive = async (message?: string) => {
      await settle(tx, p.id, "archived", verdict === "archive" ? me.id : null);
      await closeWork(tx, me, p);
      return { id: p.id as string, status: "archived" as const, ...(message ? { message } : {}) };
    };
    const hooked = own.decide ? held[0] : undefined;
    if (verdict === "archive") {
      if (!hooked) return archive();
      const r = await own.decide!(tx, ctx, me, { ...p, doc_id: hooked.doc_id, doc_variant: hooked.doc_variant }, verdict);
      await closeWork(tx, me, p);
      return r;
    }
    // every document's merge worked out first: one that would not go in archives them all
    const merges: { h: { doc_id: string; doc_variant: number }; k: Kind; preview: Awaited<ReturnType<typeof docs.previewMerge>> }[] = [];
    for (const h of held.filter((x) => x !== hooked)) {
      const k = kindOfDoc(h.doc_id)!;
      const several = held.length > 1 ? ` (${k.label} ${h.doc_id.split(":")[1]}: nothing of this intent went in)` : "";
      const preview = await docs.previewMerge(tx, h.doc_id, h.doc_variant);
      if (preview.concurrent) {
        const was = await docs.seedOf(tx, h.doc_id, h.doc_variant);
        const now = (await docs.readDoc(tx, h.doc_id)).json, mine = (await docs.readDoc(tx, h.doc_id, { variant: h.doc_variant })).json;
        const clash = overlap(docs.diff(was, now).map((c) => c.path), docs.diff(was, mine).map((c) => c.path));
        if (clash.length) return archive(`The ${k.label} has a newer version than the one this was seeded from, and it changes what that changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")})${several}. Propose the change again on its newest version.`);
      }
      if (preview.problems.length) return archive(`Merged into the ${k.label} as it is now, this is no longer a valid ${k.label}: ${preview.problems.slice(0, 3).join("; ")}${several}. Propose it again on its newest version.`);
      merges.push({ h, k, preview });
    }
    let first: any = null;
    if (hooked) {
      first = await own.decide!(tx, ctx, me, { ...p, doc_id: hooked.doc_id, doc_variant: hooked.doc_variant }, verdict);
      if (first?.status !== "accepted") {
        await closeWork(tx, me, p);
        return first;
      }
    }
    const numbers: number[] = [];
    for (const { h, k, preview } of merges) {
      const v = await docs.accept(tx, h.doc_id, h.doc_variant, { author, note: p.note });
      const cols = { [k.labelColumn ?? "label"]: preview.json.label ?? preview.json.title, ...Object.fromEntries(Object.entries(k.row ?? {}).map(([c, f]) => [c, f(preview.json)])) };
      const names = Object.keys(cols).map(qi);
      await tx.query(`UPDATE ${qi(k.table)} SET ${names.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [h.doc_id.split(":")[1], ...Object.values(cols)]);
      numbers.push(v.number);
    }
    if (first) return { ...first, ...(numbers.length ? { numbers } : {}) };
    await settle(tx, p.id, "accepted", me.id);
    return { id: p.id as string, status: "accepted" as const, number: numbers[0], ...(numbers.length > 1 ? { numbers } : {}), ...(merges[0]?.preview.concurrent ? { merged: true } : {}) };
  });
}

export type Verdict = "accept" | "archive";

/**
 * An intent's work as people review it before they decide (`shown`: the intent's work as ./intents.ts lists it): for
 * a document's version, what it changes and the edits it was made in (./versioned.ts reviewDoc, with its kind's own
 * extras: an asset's builds, a story's player); for a sandbox's change, its edits before and after.
 */
export async function reviewOf(db: Queryable, id: string, shown: any) {
  const p = { ...(await workOf(db, id)), ...shown, id };
  if (!p.kind) return null;
  if (p.kind === SANDBOX_WORK) return { ...p, ...(await sandboxReview(db, p)) };
  if (!kindOfWork(p.kind)) return { ...p };
  return { ...p, ...(await reviewDoc(db, p)) };
}

/** An intent's work archived by whoever proposed it: the intent archived, its intent variant closed, kept in the history. */
async function archiveAsAuthor(tx: Queryable, me: Me, p: any) {
  await settle(tx, p.id, "archived", me.id);
  await closeWork(tx, me, p);
  return { id: p.id as string, status: "archived" as const };
}

/**
 * An agent archives its own intent over MCP (Samuel 2026-11-04): one at Proposal whose work it no longer stands by.
 * Only an intent its admin put at Proposal over MCP (its work proposed so, or, with no work, added so), never anyone
 * else's and never one proposed on the page; accepting stays a person's, on the intents' board.
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
 * Accept or archive an intent's work at Proposal (Samuel 2026-11-04: it ends accepted or archived, nothing else). An
 * admin decides any; whoever proposed it may archive their own. The answer says the stage the intent settled at.
 */
export async function decide(ctx: Ctx, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return ctx.db.transaction(async (tx) => {
    const p = await workOf(tx, id, true);
    if (!p) throw new VersionError("There is no such intent.", 404);
    if (!p.kind) throw new VersionError(`Intent ${p.id} holds no work of play's to decide.`, 409);
    if (p.stage !== "proposal") throw new VersionError(`This intent is at the ${p.stage} stage: only one at Proposal is decided.`, 409);
    let r: any;
    if (verdict === "archive" && p.author === me.id && me.level !== "admin") r = await archiveAsAuthor(tx, me, p);
    else if (p.kind === SANDBOX_WORK) r = await decideSandbox(tx, me, p, verdict);
    else {
      const k = kindOfWork(p.kind);
      if (!k) throw new VersionError(`play keeps no kind for ${p.kind}.`, 500);
      r = await decideDoc(tx, ctx, me, p, verdict);
    }
    const { rows } = await tx.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [p.id]);
    return { ...r, intent: p.id as string, stage: rows[0]?.stage };
  });
}

/**
 * An admin's decision on an intent, whatever its stage (the one place an intent is decided; play/SPEC.md §4.12): at
 * Proposal with work of play's, accepting applies it and archiving archives it (decide); anything else is the intent's
 * own decision (./intents.ts decideIntent), except that accepting an intent whose code is a pull request ships it
 * (./ship.ts acceptAndShip). Gives back the intent, with the decision's message where it has one.
 */
export async function decideAny(ctx: Ctx, me: Me | null, id: string, verdict: IntentVerdict | "archive", gh: GitHub | null = null) {
  const db = ctx.db;
  const w = await workOf(db, id);
  if (!w) throw new IntentError("There is no such intent.", 404);
  if (verdict === "accept" && !w.kind) {
    const shipped = await acceptAndShip(db, gh, me, w.id);
    if (shipped) return shipped;
  }
  let decision: { status: string; number?: number; version?: string; merged?: boolean; message?: string } | undefined;
  if (w.kind && w.stage === "proposal" && (verdict === "accept" || verdict === "archive" || verdict === "reject")) {
    const { id: _id, intent: _i, stage: _s, why, ...r }: any = await decide(ctx, me, w.id, verdict === "accept" ? "accept" : "archive");
    decision = { ...r, ...(r.message ?? why ? { message: r.message ?? why } : {}) };
  } else await decideIntent(db, me, w.id, verdict === "archive" ? "reject" : verdict);
  const said = decision ? { decision, ...(decision.message ? { message: decision.message } : {}) } : {};
  if (me?.level !== "admin") return { id: w.id, stage: (await workOf(db, w.id))?.stage, ...said };
  return { ...(await getIntent(db, w.id)), ...said };
}

// ---- the board's SQL, from the registry: a document's label and group by its kind

/** the SQL of a work's label and group, by its document's kind (`i` the intent) */
export function workSql() {
  const label = KINDS.length
    ? `CASE split_part(iv0.doc_id, ':', 1) ${KINDS.map((k) => `WHEN '${k.prefix}' THEN (SELECT r.${qi(k.labelColumn ?? "label")} FROM ${qi(k.table)} r WHERE r.id::text = split_part(iv0.doc_id, ':', 2))`).join(" ")} END`
    : "NULL";
  const group = KINDS.length ? `CASE split_part(iv0.doc_id, ':', 1) ${KINDS.map((k) => `WHEN '${k.prefix}' THEN '${k.group}'`).join(" ")} END` : "NULL";
  const what = KINDS.length ? `CASE split_part(iv0.doc_id, ':', 1) ${KINDS.map((k) => `WHEN '${k.prefix}' THEN '${k.label}'`).join(" ")} END` : "NULL";
  return { label, group, what };
}

// ---- the kinds

const ensureAsset = (q: Queryable, ctx: Ctx, id: string) => ensureAssetDoc(q, ctx.store, id).then(() => undefined);
register({
  name: "asset", prefix: "asset", type: ASSET, work: "asset_version", table: "play.assets", label: "asset", group: "assets",
  ensure: ensureAsset,
  write: async (_q, _id, cur, input) => (input.whole !== undefined ? { target: { ...(input.whole as object), schema: cur.schema } } : { edits: assetEdits(cur, input.edits) }),
  propose: (ctx, me, o, via) => proposeAssetVariant(ctx, me, o, via),
  review: (q, p) => assetReview(q, p),
  decide: (tx, ctx, me, p, verdict) => decideAsset(tx, ctx.store, me, p, verdict),
});
register({
  name: "story", prefix: "story", type: STORY, work: "story_version", table: "play.stories", labelColumn: "title", listed: "r.folded_into IS NULL", label: "story", group: "stories",
  ensure: (q, _ctx, id) => ensureStoryDoc(q, id).then(() => undefined),
  write: (q, id, cur, input) => storyEdit(q, id, cur, input),
  propose: (ctx, me, o, via) => proposeStoryVariant(ctx.db, me, o, via),
  review: (q, p) => storyReview(q, p),
  decide: (tx, _ctx, me, p, verdict) => decideStory(tx, me, p, verdict),
});
register({
  name: "factory", prefix: "factory", type: FACTORY, work: "factory_version", table: "play.factories", label: "factory", group: "factories", open: "/factories/?factory={id}&intent={intent}",
  row: { updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", stations: json.line?.stations?.length ?? 0, parts: json.parts?.length ?? 0 }),
});
register({
  name: "game_config", prefix: "game", type: LEVELS, work: "game_config_version", table: "play.game_configs", label: "config", group: "game", open: "/game-editor/?config={id}&intent={intent}",
  row: { updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", schema: json.schema }),
});
register({
  name: "skill", prefix: "skill", type: SKILL, work: "skill_version", table: "play.skills", label: "skill", group: "skills", open: "/skills/?skill={id}&intent={intent}",
  row: { grp: (json) => json.group, updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", group: json.group, stages: SKILL_STAGES.filter((s) => `${json.stages?.[s] ?? ""}`.trim()) }),
});

// an artifact (./artifacts.ts): its row is what its accepted version says; one kept before artifacts were documents
// gets its document made from its row, as its v1, the first time it is read
const ARTIFACT_ROW = `url, title, description, summary, kind, tags, to_char(published, 'YYYY-MM-DD') AS published, text_hash, origin, agent_id AS agent, operator_id AS operator, token_id AS token, author_ids AS authors`;
async function ensureArtifactDoc(q: Queryable, id: string) {
  const { rows } = await q.query<any>(`SELECT ${ARTIFACT_ROW}, created FROM play.artifacts WHERE id = $1`, [id]);
  const { created, ...r } = rows[0] ?? {};
  if (!r.title) return;
  const note = "kept before artifacts were documents";
  await docs.createDoc(q, { id: `artifact:${id}`, schema: ARTIFACT.name, json: { schema: ARTIFACT.name, ...r, tags: r.tags ?? [], authors: r.authors ?? [] }, author: { human: r.operator, via: "import" }, message: `v1: ${note}`, at: created, version: note });
}
const field = (f: string) => (json: any) => json[f] ?? null;
register({
  name: "artifact", prefix: "artifact", type: ARTIFACT, work: "artifact_version", table: "play.artifacts", labelColumn: "title", listed: "r.title IS NOT NULL", label: "artifact", group: "artifacts", open: "/artifacts/?artifact={id}&intent={intent}",
  ensure: (q, _ctx, id) => ensureArtifactDoc(q, id),
  row: {
    ...Object.fromEntries(["url", "description", "summary", "kind", "published", "text_hash", "origin"].map((f) => [f, field(f)])),
    tags: (j) => j.tags ?? [], author_ids: (j) => j.authors ?? [], agent_id: field("agent"), operator_id: field("operator"), token_id: field("token"),
  },
  item: (json) => ({ url: json.url ?? null }),
});

export { assetDocFor };
