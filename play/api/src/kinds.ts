// One version control (play/SPEC.md "Version control", Samuel 2026-11-06): every versioned kind is one entry of the
// registry below (each kind's entry is ./allkinds.ts's); ./versioned.ts does the rest for each.
//
// A schema with no hooks needs no code (Samuel 2026-11-06): every accepted schema whose documents no entry here holds is
// a kind of its own (syncKinds), its rows in play.records, so a new type is a schema document and the intent that
// accepts it. A schema's new version is accepted only while every document on Main still validates against it.
import { COOP } from "./kit/ids";
import type { Me } from "./access";
import type { BlobStore } from "./blobs";
import * as docs from "./docs";
import type { Db, Queryable } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { HttpError } from "./kit/errors";

export type Ctx = { db: Db; store: BlobStore };
export type Input = { edits?: unknown; whole?: unknown };

export type Kind = {
  name: string;
  prefix: string;
  schema: string;
  /** what its schema can't say: a whole-document check, and that its content is code (built and previewed before it is accepted) */
  check?: (doc: any) => string[];
  build?: boolean;
  where?: string;
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
  ensure?: (q: Queryable, ctx: Ctx, id: string) => Promise<void>;
  edits?: string;
  told?: boolean;
  write?: (q: Queryable, id: string, cur: any, input: Input) => Promise<docs.Write>;
  /** the kind's own propose, its intent variant as it stands (an asset's recipe files and frozen version; a story's) */
  propose?: (ctx: Ctx, me: Me, o: { id: string; variant: number; note: string; intent?: string }, via: "web" | "mcp") => Promise<Record<string, unknown> & { intent: string }>;
  /** what the board shows of its work beside the changes and edits (an asset's builds, a story's player) */
  review?: (q: Queryable, p: any) => Promise<Record<string, unknown>>;
  /** the kind's own decide (an asset accepted only on the head it was made on; a story's frozen rows) */
  decide?: (tx: Queryable, ctx: Ctx, me: Me, p: any, verdict: Verdict) => Promise<any>;
  /** what its Accept holds a version to first, in the Accept's transaction, with the state the merge makes: why it no
   *  longer holds (archived, back to Build), else null; a refusal throws (a sandbox's pins play no longer keeps; a
   *  schema failing a document on Main) */
  before?: (tx: Queryable, docId: string, variant: number, merged: any) => Promise<string | null>;
  item?: (json: any) => Record<string, unknown>;
  more?: (q: Queryable, uuid: string) => Promise<Record<string, unknown>>;
  /** what a read of one shows beside its `json` (a sandbox's pins by their assets' labels and versions) */
  view?: (q: Queryable, json: any, id: string) => Promise<Record<string, unknown>>;
  /** what a change shows beside its field diff, from the state before it and after it (a sandbox's pins before and after) */
  shown?: (q: Queryable, before: any, after: any) => Promise<Record<string, unknown>>;
  /** its row's owner column (an asset's: ./owners.ts), where a document may be a person's own, private to them: to anyone else it is as one that never was */
  owned?: string;
  /** whether an intent may hold several versions of one of its documents, in order, each the next (a piece's: intent 02e3a85f) */
  manyPerIntent?: boolean;
  /** whether its documents have breeds (an asset's: play/SPEC.md "Breeds") */
  breeds?: boolean;
  /** what its schema and check can't say without the database, held as its version is proposed for intent `intent` (a piece's pieces: each an accepted one or one proposed in the same intent); throws why not */
  ready?: (q: Queryable, json: any, intent?: string | null) => Promise<void>;
  /** what an accepted version keeps beside its row, in the Accept's transaction (a piece's source among play's files, a
   *  sandbox's pins for the worlds, a schema's kinds read again) */
  accepted?: (tx: Queryable, ctx: Ctx, docId: string, number: number, json: any, intent?: string | null) => Promise<void>;
};

const KINDS: Kind[] = [];
const SCHEMA_KINDS = new Set<string>();

export function register(k: Kind): Kind {
  if (!/^[a-z][a-z_]{0,31}$/.test(k.name) || !/^[a-z][a-z_]{0,31}$/.test(k.prefix)) throw new Error(`a kind's name and prefix are lowercase words: ${k.name}, ${k.prefix}`);
  if (!UUID.test(k.schema)) throw new Error(`kind ${k.name}: its schema is named by its UUID`);
  if (k.work !== `${k.name}_version`) throw new Error(`kind ${k.name}: its work is ${k.name}_version`);
  const at = KINDS.findIndex((x) => x.name === k.name);
  if (at >= 0) KINDS.splice(at, 1);
  KINDS.push(k);
  SCHEMA_KINDS.delete(k.name);
  docs.hook(k.schema, { check: k.check, build: k.build });
  return k;
}
export function unregister(name: string): void {
  const at = KINDS.findIndex((x) => x.name === name);
  if (at >= 0) docs.hook(KINDS.splice(at, 1)[0].schema, {});
  SCHEMA_KINDS.delete(name);
}

/**
 * Every accepted schema whose documents no kind holds becomes a kind of its own: its name and prefix its `type`, its
 * label its schema's, its rows in play.records. Read again before every lookup, so a schema accepted in one process is a
 * kind in every other; a kind registered in code stays as its code says.
 */
export async function syncKinds(q: Queryable): Promise<void> {
  const schemas = await docs.schemasOf(q);
  // a kind whose schema is no accepted one (its Accept rolled back) is no kind
  for (const name of [...SCHEMA_KINDS]) if (!schemas.some((s) => s.id === kindNamed(name)?.schema)) unregister(name);
  for (const s of schemas) {
    const type = s.json.type;
    if (KINDS.some((k) => k.schema === s.id || (k.prefix === type && !SCHEMA_KINDS.has(k.name)))) continue;
    if (!/^[a-z][a-z_]{0,31}$/.test(type)) continue;
    const label = `${s.json.label}`.toLowerCase();
    register({ name: type, prefix: type, schema: s.id, work: `${type}_version`, table: "play.records", where: `r.kind = '${type}'`, row: { kind: () => type, updated: () => new Date() }, label, group: label });
    SCHEMA_KINDS.add(type);
  }
}
export const kinds = (): readonly Kind[] => KINDS;
export const kindNamed = (name: string) => KINDS.find((k) => k.name === name) ?? null;
export const kindOfWork = (work: string | null | undefined) => KINDS.find((k) => k.work === work) ?? null;
export const kindOfDoc = (docId: string | null | undefined) => KINDS.find((k) => `${docId ?? ""}`.startsWith(k.prefix + ":")) ?? null;
export const workKinds = () => KINDS.map((k) => k.work);

// ---- written once: who names an edit, the version an edit or a seed is, two changes that touch the same field, errors

export const iso = (d: Date | string) => new Date(d).toISOString();
export const authorOf = (me: Pick<Me, "id"> | null, via: string | null | undefined): docs.Author => ({ human: me?.id ?? null, via: via === "mcp" ? "mcp" : via === "import" ? "import" : "site" });

export async function namesOf(q: Queryable, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const some = [...new Set(ids.filter((x): x is string => !!x))];
  return new Map((await q.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [some])).rows.map((r) => [r.id, r.name]));
}

export async function named(db: Queryable, edits: docs.DocEdit[], versions: docs.Version[] = []) {
  const names = await namesOf(db, edits.map((s) => s.author));
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

export const versionAt = (versions: docs.Version[], frontiers: docs.Frontiers): number | null =>
  // the newest of those at that point: an Accept on a breed names Main's next version where Main stands
  versions.findLast((v) => docs.frontiersKey(v.frontiers) === docs.frontiersKey(frontiers))?.number ?? null;

export function overlap(a: string[], b: string[]): string[] {
  const inside = (x: string, y: string) => x === y || x.startsWith(y + ".") || x.startsWith(y + "[");
  return a.filter((x) => b.some((y) => inside(x, y) || inside(y, x)));
}

export const qi = (s: string) => s.replace(/[^a-z0-9_.]/g, "");

/** the SQL of a kind's rows `r` that `p` sees: a document that may be a person's own is theirs or the coop's (./owners.ts) */
export const seen = (k: Kind, p: string) => (k.owned ? `(r.${qi(k.owned)} = '${COOP}' OR r.${qi(k.owned)} = ${p}::uuid)` : "");

/**
 * A document named by its UUID, as `me` sees it (another's private one is as one that never was): its kind and id, its
 */
export async function docRef(q: Queryable, ctx: Ctx | null, id: unknown, me: Pick<Me, "id"> | null): Promise<{ kind: Kind; uuid: string; docId: string }> {
  const uuid = `${id ?? ""}`.toLowerCase();
  if (!UUID.test(uuid)) throw new HttpError("Name the document by its UUID (list_docs).", 404);
  await syncKinds(q);
  if (!KINDS.length) throw new HttpError("play keeps no versioned kind.", 500);
  const { rows } = await q.query<{ k: string }>(
    KINDS.map((k, i) => `SELECT '${k.name}' AS k, ${i} AS o FROM ${qi(k.table)} r WHERE r.id::text = $1${[k.where, seen(k, "$2")].filter(Boolean).map((w) => ` AND ${w}`).join("")}`).join(" UNION ALL ") + " ORDER BY o LIMIT 1",
    KINDS.some((k) => k.owned) ? [uuid, me?.id ?? null] : [uuid],
  );
  const kind = rows[0] ? kindNamed(rows[0].k) : null;
  if (!kind) throw new HttpError(`play keeps no document ${uuid} (list_docs).`, 404);
  const docId = `${kind.prefix}:${uuid}`;
  if (kind.ensure && ctx) {
    const { rows: have } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [docId]);
    if (!have.length) await kind.ensure(q, ctx, uuid);
  }
  return { kind, uuid, docId };
}

export type Verdict = "accept" | "archive";

/**
 * The edits an agent sends, as the document's own (set, insert, delete, move, text; ./docs/core.ts), with one help: a
 * part of a path may name an item of a list by its id ({ id: 'weld' }) instead of its index, worked out against the
 * state as it stands before the edit.
 */
export function resolveEdits(json: any, edits: unknown): docs.Edit[] {
  if (!Array.isArray(edits) || !edits.length) throw new HttpError("Edits are a list of at least one edit.");
  if (edits.length > 500) throw new HttpError("At most 500 edits at once.");
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object" || !Array.isArray(e.path)) throw new HttpError(`Edit ${i + 1} names no path (a list of field names, indexes or { id }).`);
    if (e.path[0] === "schema") throw new HttpError(`Edit ${i + 1}: a document's schema is not edited.`);
    let at = json;
    const path = e.path.map((p: unknown, j: number) => {
      let part: string | number;
      if (p && typeof p === "object" && "id" in p && typeof p.id === "string") {
        if (!Array.isArray(at)) throw new HttpError(`Edit ${i + 1}: part ${j + 1} of its path names { id: ${p.id} } but there is no list there.`);
        const k = at.findIndex((x: any) => x?.id === p.id);
        if (k < 0) throw new HttpError(`Edit ${i + 1}: there is no item ${p.id} in the list at part ${j + 1} of its path.`);
        part = k;
      } else if (typeof p === "string" || (typeof p === "number" && Number.isInteger(p))) part = p;
      else throw new HttpError(`Edit ${i + 1}: part ${j + 1} of its path is a field name, an index or { id }.`);
      at = at?.[part];
      return part;
    });
    return { ...e, path } as docs.Edit;
  });
}

/**
 * What a kind's documents hold, as its schema says it, for the agents over MCP (the tools' descriptions): its node's
 * description, or a field's; from its accepted schema, else from its seed (a schema accepted before it said one).
 */
export async function formatOf(q: Queryable, kind: string, field?: string): Promise<string> {
  const k = kindNamed(kind);
  if (!k) return "";
  const of = (j: docs.SchemaJson | null | undefined) => ((field ? j?.node?.properties?.[field] : j?.node) as { description?: string } | undefined)?.description;
  return of((await docs.schemasOf(q)).find((s) => s.id === k.schema)?.json) ?? of(docs.schemaSeedOf(k.schema)) ?? "";
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

/** an open intent variant of document `docId` by its number, its seed and its intent (doc_edit and propose name it) */
export async function openVariant(q: Queryable, docId: string, uuid: string, v: unknown): Promise<{ id: number; seed: docs.Frontiers; intent: string | null }> {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError("An intent variant is named by its number (doc_edit gives it).");
  const { rows } = await q.query<{ status: string; seed: docs.Frontiers; type: string; intent_id: string | null }>(`SELECT status, seed, type, intent_id FROM play.doc_variants WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0] || rows[0].type !== "intent") throw new HttpError(`${uuid} has no intent variant ${n}.`, 404);
  if (rows[0].status !== "open") throw new HttpError(`Variant ${n} of ${uuid} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new variant" : rows[0].status}.`, 409);
  return { id: n, seed: rows[0].seed, intent: rows[0].intent_id };
}
