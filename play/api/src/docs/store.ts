// Documents in Postgres (play/SPEC.md §4.4, "Version control"). The server is the only writer: every write locks its
// document's row, loads it (Main: its snapshot and the edits after it; an intent variant: Main forked at its seed, its
// own edits on top), applies the edit, checks the whole result against its type, and appends the edit (its Loro
// update, who, why, when, the frontiers after it) to its variant. Every document has one Main (play.doc_variants of
// type 'main'), what is accepted; an intent variant grows from a seed on Main, and accepting merges it into Main and
// names the result a version, whose canonical JSON's BLAKE3 is recorded. The browser never needs Loro: any edit's
// state is served as JSON.
import { randomInt } from "node:crypto";
import type { LoroDoc } from "loro-crdt";
import type { Db, Queryable } from "../pg";
import { applyEdits, contentHash, fromBytes, jsonAt, jsonOf, newDoc, patchTo, sameFrontiers, seed, type Edit, type Frontiers } from "./core";
import { typeFor } from "./schemas";
import { problemsOf, SchemaError, type DocType } from "./validate";

export class DocError extends Error {
  constructor(message: string, public status = 400, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/** who writes: a human (or the agent acting under their name), and through what */
export type Author = { human: string | null; via: "site" | "mcp" | "import" | "system" };
type DocRow = { id: string; type: string; schema: string; schema_id: string | null; head: Frontiers; snapshot: Uint8Array | null; snapshot_seq: string; main: string };
type VariantRow = { id: string; doc_id: string; type: "main" | "intent"; seed: Frontiers; head: Frontiers; status: string; note: string; created_by: string | null; created: Date; proposed_at: Date | null; decided_by: string | null; decided_at: Date | null; version: number | null; intent_id: string | null };
/** one edit: its seq, its variant (null: made on Main), its kind, who, why, when, the frontiers after it */
export type DocEdit = { seq: number; variant: number | null; kind: string; author: string | null; via: string; message: string; frontiers: Frontiers; created: Date; bytes: number };
export type Version = { number: number; frontiers: Frontiers; contentHash: string; note: string; author: string | null; variant: number | null; created: Date };
export type Variant = { id: number; type: "main" | "intent"; status: string; note: string; created_by: string | null; created: Date; intent_id: string | null; edits: number; seed: Frontiers };

/** edits on Main after a snapshot before a new snapshot is written (it keeps the whole history: only loading gets faster) */
export const COMPACT_AFTER = 32;
const ID = /^[a-z][a-z_]{0,31}:[a-z0-9][a-z0-9:-]{0,120}$/;
const toBytes = (b: unknown): Uint8Array => (b instanceof Uint8Array ? b : new Uint8Array(b as ArrayBuffer));
const seconds = (d?: Date) => Math.floor((d ?? new Date()).getTime() / 1000);
/** runs `fn` in its own transaction, or in the caller's when given one (a story decided with its intent: one transaction) */
const inTx = <R>(db: Db | Queryable, fn: (q: Queryable) => Promise<R>): Promise<R> => ("transaction" in db ? (db as Db).transaction(fn) : fn(db));

const DOC = `SELECT d.id, d.type, d.schema, d.schema_id, d.head, d.snapshot, d.snapshot_seq, m.id AS main FROM play.docs d JOIN play.doc_variants m ON m.doc_id = d.id AND m.type = 'main' WHERE d.id = $1`;
async function lock(q: Queryable, id: string): Promise<DocRow> {
  const { rows } = await q.query<DocRow>(`${DOC} FOR UPDATE OF d`, [id]);
  if (!rows[0]) throw new DocError(`no document ${id}`, 404);
  return rows[0];
}
async function rowOf(q: Queryable, id: string): Promise<DocRow> {
  const { rows } = await q.query<DocRow>(DOC, [id]);
  if (!rows[0]) throw new DocError(`no document ${id}`, 404);
  return rows[0];
}
async function variantRow(q: Queryable, docId: string, variant: number, forUpdate = false): Promise<VariantRow> {
  const { rows } = await q.query<VariantRow>(`SELECT * FROM play.doc_variants WHERE id = $1 AND doc_id = $2 AND type = 'intent'${forUpdate ? " FOR UPDATE" : ""}`, [variant, docId]);
  if (!rows[0]) throw new DocError(`${docId} has no variant ${variant}`, 404);
  return rows[0];
}

/** Main as it is now */
async function loadMain(q: Queryable, row: DocRow): Promise<LoroDoc> {
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_edits WHERE doc_id = $1 AND variant = $2 AND seq > $3 ORDER BY seq`, [row.id, row.main, row.snapshot_seq]);
  return fromBytes(row.snapshot ? toBytes(row.snapshot) : null, rows.map((r) => toBytes(r.bytes)));
}
/** an intent variant as it is now: Main at its seed, its own edits on top */
async function loadVariant(q: Queryable, row: DocRow, v: VariantRow, main?: LoroDoc): Promise<LoroDoc> {
  const m = main ?? (await loadMain(q, row));
  const d = m.forkAt(v.seed);
  d.setRecordTimestamp(true);
  d.setChangeMergeInterval(0);
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_edits WHERE doc_id = $1 AND variant = $2 ORDER BY seq`, [row.id, v.id]);
  if (rows.length) d.importBatch(rows.map((r) => toBytes(r.bytes)));
  return d;
}

/** the Loro peer `author` writes as on this variant (a new one the first time) */
async function peerFor(q: Queryable, docId: string, variant: string | number, a: Author): Promise<`${number}`> {
  const { rows } = await q.query<{ peer: `${number}` }>(
    `SELECT peer FROM play.doc_peers WHERE doc_id = $1 AND variant = $2 AND COALESCE(author, '') = COALESCE($3, '') AND via = $4`,
    [docId, variant, a.human, a.via],
  );
  if (rows[0]) return rows[0].peer;
  for (;;) {
    const peer = String(randomInt(1, 2 ** 47) * 4096 + randomInt(0, 4096)) as `${number}`;
    const r = await q.query(`INSERT INTO play.doc_peers (peer, doc_id, variant, author, via) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [peer, docId, variant, a.human, a.via]);
    if (r.affectedRows) return peer;
  }
}

/** commits what was applied to `d` as one edit of variant `v` (Main or an intent variant), after checking the whole document */
async function edit(q: Queryable, t: DocType, d: LoroDoc, before: ReturnType<LoroDoc["version"]>, line: { doc: DocRow; variant: string | number }, kind: "seed" | "edit" | "import" | "merge", message: string, a: Author, at?: Date, empty = false): Promise<DocEdit | null> {
  const json = jsonOf(d);
  // a new document's Main is empty until its first version is accepted: only that birth is not checked
  const problems = empty ? [] : problemsOf(t, json);
  if (problems.length) throw new SchemaError(problems);
  d.commit({ message, timestamp: seconds(at) });
  const bytes = d.export({ mode: "update", from: before });
  // nothing changed: no edit
  if (sameFrontiers(d.frontiers(), d.vvToFrontiers(before)) && kind !== "seed") return null;
  const frontiers = d.frontiers();
  const { rows } = await q.query<{ seq: string; created: Date }>(
    `INSERT INTO play.doc_edits (doc_id, variant, kind, bytes, peer, author, via, message, frontiers, created) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ($9::text)::jsonb, COALESCE($10, now())) RETURNING seq, created`,
    [line.doc.id, line.variant, kind, bytes, d.peerIdStr, a.human, a.via, message, JSON.stringify(frontiers), at ?? null],
  );
  const main = `${line.variant}` === `${line.doc.main}`;
  // the version of its schema the document was last written against
  await q.query(`UPDATE play.docs SET schema_version = $2 WHERE id = $1`, [line.doc.id, t.version]);
  if (main) await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb, updated = now() WHERE id = $1`, [line.doc.id, JSON.stringify(frontiers)]);
  await q.query(`UPDATE play.doc_variants SET head = ($2::text)::jsonb WHERE id = $1`, [line.variant, JSON.stringify(frontiers)]);
  return { seq: Number(rows[0].seq), variant: main ? null : Number(line.variant), kind, author: a.human, via: a.via, message, frontiers, created: rows[0].created, bytes: bytes.length };
}

/** writes a new snapshot of Main once enough edits have gathered after the last one */
async function compact(q: Queryable, row: DocRow, d: LoroDoc): Promise<void> {
  const { rows } = await q.query<{ n: string; last: string | null }>(`SELECT count(*) AS n, max(seq) AS last FROM play.doc_edits WHERE doc_id = $1 AND variant = $2 AND seq > $3`, [row.id, row.main, row.snapshot_seq]);
  if (Number(rows[0].n) < COMPACT_AFTER) return;
  await q.query(`UPDATE play.docs SET snapshot = $2, snapshot_seq = $3 WHERE id = $1`, [row.id, d.export({ mode: "snapshot" }), rows[0].last]);
}

// ---- writing

/**
 * A new document of schema `schema` (its UUID) from its first state, as one edit of its Main (and, if `version`, named
 * v1). With `empty`, its Main is born empty (no first state): a document proposed new, whose first version an intent
 * variant holds until it is accepted.
 */
export async function createDoc(db: Db | Queryable, o: { id: string; schema: string; json?: unknown; empty?: boolean; author: Author; message?: string; at?: Date; version?: string; number?: number }): Promise<{ id: string; edit: DocEdit; version: Version | null }> {
  if (!ID.test(o.id)) throw new DocError(`a document's id is its kind and a name, like story:<uuid>: not ${JSON.stringify(o.id)}`);
  return inTx(db, async (q) => {
    const t = await typeFor(q, o.schema);
    if (!o.id.startsWith(t.type + ":")) throw new DocError(`a ${t.type} document's id starts with ${t.type}:`);
    const made = await q.query(
      `INSERT INTO play.docs (id, type, schema, schema_id, schema_version, created_by, created) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now())) ON CONFLICT DO NOTHING`,
      [o.id, t.type, t.name, t.id, t.version, o.author.human, o.at ?? null],
    );
    if (!made.affectedRows) throw new DocError(`${o.id} is there already`, 409);
    await q.query(`INSERT INTO play.doc_variants (doc_id, type, seed, head, status, note, created_by, created) VALUES ($1, 'main', '[]', '[]', 'open', 'Main', $2, COALESCE($3, now()))`, [o.id, o.author.human, o.at ?? null]);
    const row = await lock(q, o.id);
    const d = newDoc();
    d.setPeerId(await peerFor(q, o.id, row.main, o.author));
    const before = d.version();
    if (!o.empty) seed(d, t, o.json);
    const e = (await edit(q, t, d, before, { doc: row, variant: row.main }, o.author.via === "import" ? "import" : "seed", o.message ?? "created", o.author, o.at, !!o.empty))!;
    const v = o.version !== undefined ? await name(q, row.id, d, o.version, o.author, null, o.at, o.number) : null;
    return { id: o.id, edit: e, version: v };
  });
}

async function name(q: Queryable, docId: string, d: LoroDoc, note: string, a: Author, variant: number | null, at?: Date, number?: number): Promise<Version> {
  const frontiers = d.frontiers(), hash = contentHash(jsonOf(d));
  // the next number, or the one given (an asset's history replayed keeps its versions' own numbers, a gap and all),
  // which must come after every number the document has named
  if (number !== undefined) {
    const { rows: m } = await q.query<{ n: number | null }>(`SELECT max(number) AS n FROM play.doc_versions WHERE doc_id = $1`, [docId]);
    if (!Number.isInteger(number) || number < 1 || number <= (m[0]?.n ?? 0)) throw new DocError(`${docId}: a version ${number} would not come after v${m[0]?.n ?? 0}`, 409);
  }
  const { rows } = await q.query<{ number: number; created: Date }>(
    `INSERT INTO play.doc_versions (doc_id, number, frontiers, content_hash, note, author, variant, created)
       SELECT $1, COALESCE($8::int, COALESCE(max(number), 0) + 1), ($2::text)::jsonb, $3, $4, $5, $6, COALESCE($7, now()) FROM play.doc_versions WHERE doc_id = $1
     RETURNING number, created`,
    [docId, JSON.stringify(frontiers), hash, note, a.human, variant, at ?? null, number ?? null],
  );
  return { number: rows[0].number, frontiers, contentHash: hash, note, author: a.human, variant, created: rows[0].created };
}

export type Write = { edits: Edit[] } | { target: unknown };

/**
 * One edit: `edits` (or the few operations that turn the document into `target`) on Main or, with `variant`, on that
 * intent variant, committed with `message`. Nothing changed: null. A variant already decided takes no more edits.
 */
export async function commit(db: Db | Queryable, id: string, w: Write & { message: string; author: Author; variant?: number; kind?: "edit" | "import"; at?: Date }): Promise<DocEdit | null> {
  if (!w.message?.trim()) throw new DocError("every edit says what it does: its message is empty");
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const t = await typeFor(q, row.schema_id);
    const main = await loadMain(q, row);
    let d = main, line: string | number = row.main;
    if (w.variant !== undefined) {
      const v = await variantRow(q, id, w.variant, true);
      if (v.status !== "open" && v.status !== "proposed") throw new DocError(`variant ${v.id} was ${v.status}: it takes no more edits`, 409);
      d = await loadVariant(q, row, v, main);
      line = Number(v.id);
    }
    d.setPeerId(await peerFor(q, id, line, w.author));
    const before = d.version();
    if ("edits" in w) applyEdits(d, t, w.edits);
    else patchTo(d, t, w.target);
    const e = await edit(q, t, d, before, { doc: row, variant: line }, w.kind ?? "edit", w.message.trim(), w.author, w.at);
    if (e && line === row.main) await compact(q, row, d);
    return e;
  });
}

/** names Main as it is now a version (an import's history, or an admin's own edit) */
export async function nameVersion(db: Db | Queryable, id: string, o: { note: string; author: Author; at?: Date; number?: number }): Promise<Version> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    return name(q, id, await loadMain(q, row), o.note, o.author, null, o.at, o.number);
  });
}

/** a new intent variant, seeded at Main's head (or at `at`): where an intent's work is made, edit by edit */
export async function variant(db: Db | Queryable, id: string, o: { author: Author; note?: string; at?: Frontiers }): Promise<{ id: number; seed: Frontiers }> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const seedAt = o.at ?? row.head;
    const { rows } = await q.query<{ id: string }>(
      `INSERT INTO play.doc_variants (doc_id, type, seed, head, note, created_by) VALUES ($1, 'intent', ($2::text)::jsonb, ($2::text)::jsonb, $3, $4) RETURNING id`,
      [id, JSON.stringify(seedAt), o.note ?? "", o.author.human],
    );
    return { id: Number(rows[0].id), seed: seedAt };
  });
}

/** names an intent variant proposed (with what it is for); it may still take edits until it is decided */
export async function propose(db: Db | Queryable, id: string, v: number, o: { note: string; author: Author }): Promise<void> {
  await inTx(db, async (q) => {
    await lock(q, id);
    const r = await variantRow(q, id, v, true);
    if (r.status !== "open" && r.status !== "proposed") throw new DocError(`variant ${v} was ${r.status}`, 409);
    const { rows } = await q.query<{ n: string }>(`SELECT count(*) AS n FROM play.doc_edits WHERE doc_id = $1 AND variant = $2`, [id, v]);
    if (Number(rows[0].n) === 0) throw new DocError(`variant ${v} has no edits: there is nothing to propose`);
    await q.query(`UPDATE play.doc_variants SET status = 'proposed', note = $2, proposed_at = COALESCE(proposed_at, now()) WHERE id = $1`, [v, o.note]);
  });
}

/** what accepting intent variant `v` would give now: the merged JSON, its hash, whether Main moved since its seed */
export async function previewMerge(db: Queryable, id: string, v: number): Promise<{ json: any; contentHash: string; concurrent: boolean; problems: string[] }> {
  const row = await rowOf(db, id);
  const r = await variantRow(db, id, v);
  const main = await loadMain(db, row);
  const { rows } = await db.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_edits WHERE doc_id = $1 AND variant = $2 ORDER BY seq`, [id, v]);
  if (rows.length) main.importBatch(rows.map((x) => toBytes(x.bytes)));
  const json = jsonOf(main);
  return { json, contentHash: contentHash(json), concurrent: !sameFrontiers(r.seed, row.head), problems: problemsOf(await typeFor(db, row.schema_id), json) };
}

/**
 * Accepts proposed intent variant `v`: its edits merged into Main (a CRDT merge: if Main moved on since the variant's
 * seed, both sets of edits stand), the result checked against the type and named the next version. A type whose
 * content is code (`build`) whose merge met other edits is accepted only with `mergedHash`, the hash of the merged
 * result as it was built and previewed in the box (previewMerge): never code nobody has seen run.
 */
export async function accept(db: Db | Queryable, id: string, v: number, o: { author: Author; note?: string; mergedHash?: string }): Promise<Version> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const t = await typeFor(q, row.schema_id);
    const r = await variantRow(q, id, v, true);
    if (r.status !== "proposed") throw new DocError(r.status === "open" ? `variant ${v} is not proposed yet` : `variant ${v} was ${r.status}`, 409);
    const main = await loadMain(q, row);
    const before = main.version();
    const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_edits WHERE doc_id = $1 AND variant = $2 ORDER BY seq`, [id, v]);
    main.importBatch(rows.map((x) => toBytes(x.bytes)));
    const json = jsonOf(main), hash = contentHash(json);
    const problems = problemsOf(t, json);
    if (problems.length) throw new DocError(`merged into Main as it is now, the intent variant is no longer a valid ${t.name}: ${problems.slice(0, 4).join("; ")}. Propose it again on Main's newest version.`, 409, { problems });
    const concurrent = !sameFrontiers(r.seed, row.head);
    if (t.build && concurrent && o.mergedHash !== hash)
      throw new DocError(`Main moved on since this was made: its merge with Main's newest version is code nobody has seen run. Build and preview the merged result (${hash}) in the box, then accept it with that hash.`, 409, { needsPreview: true, mergedHash: hash });
    const note = o.note ?? r.note;
    const merged = main.export({ mode: "update", from: before });
    const frontiers = main.frontiers();
    await q.query(
      `INSERT INTO play.doc_edits (doc_id, variant, kind, bytes, peer, author, via, message, frontiers) VALUES ($1, $2, 'merge', $3, NULL, $4, $5, $6, ($7::text)::jsonb)`,
      [id, row.main, merged, o.author.human, o.author.via, `merged variant ${v}${note ? `: ${note}` : ""}`, JSON.stringify(frontiers)],
    );
    await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb, updated = now() WHERE id = $1`, [id, JSON.stringify(frontiers)]);
    await q.query(`UPDATE play.doc_variants SET head = ($2::text)::jsonb WHERE id = $1`, [row.main, JSON.stringify(frontiers)]);
    await q.query(`UPDATE play.docs SET schema_version = $2 WHERE id = $1`, [id, t.version]);
    const named = await name(q, id, main, note, o.author, v);
    await q.query(`UPDATE play.doc_variants SET status = 'accepted', decided_by = $2, decided_at = now(), version = $3 WHERE id = $1`, [v, o.author.human, named.number]);
    await compact(q, row, main);
    return named;
  });
}

/** archives an intent variant (an admin, its author, or a moved seed): its edits stay in the history, on their own line */
export async function close(db: Db | Queryable, id: string, v: number, o: { author: Author; status: "archived" }): Promise<void> {
  await inTx(db, async (q) => {
    await lock(q, id);
    const r = await variantRow(q, id, v, true);
    if (r.status !== "open" && r.status !== "proposed") throw new DocError(`variant ${v} was ${r.status}`, 409);
    await q.query(`UPDATE play.doc_variants SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [v, o.status, o.author.human]);
  });
}

// ---- reading

/** a document now, as JSON: its Main (or an intent variant), and its versions */
export async function readDoc(db: Queryable, id: string, o: { variant?: number } = {}): Promise<{ id: string; type: string; schema: string; schemaId: string | null; json: any; head: Frontiers; versions: Version[] }> {
  const row = await rowOf(db, id);
  const main = await loadMain(db, row);
  const d = o.variant !== undefined ? await loadVariant(db, row, await variantRow(db, id, o.variant), main) : main;
  return { id, type: row.type, schema: row.schema, schemaId: row.schema_id, json: jsonOf(d), head: d.frontiers(), versions: await versionsOf(db, id) };
}

export async function versionsOf(db: Queryable, id: string): Promise<Version[]> {
  const { rows } = await db.query<any>(`SELECT number, frontiers, content_hash, note, author, variant, created FROM play.doc_versions WHERE doc_id = $1 ORDER BY number`, [id]);
  return rows.map((r) => ({ number: r.number, frontiers: r.frontiers, contentHash: r.content_hash, note: r.note, author: r.author, variant: r.variant === null ? null : Number(r.variant), created: r.created }));
}

/** every variant of a document, Main first, each with how many edits it holds */
export async function variantsOf(db: Queryable, id: string): Promise<Variant[]> {
  const { rows } = await db.query<any>(
    `SELECT v.id, v.type, v.status, v.note, v.created_by, v.created, v.intent_id, v.seed, (SELECT count(*) FROM play.doc_edits e WHERE e.variant = v.id) AS edits
       FROM play.doc_variants v WHERE v.doc_id = $1 ORDER BY (v.type = 'main') DESC, v.id`,
    [id],
  );
  return rows.map((r) => ({ id: Number(r.id), type: r.type, status: r.status, note: r.note, created_by: r.created_by, created: r.created, intent_id: r.intent_id, edits: Number(r.edits), seed: r.seed }));
}

/**
 * The edits of a document, oldest first: Main's, with the edits of every accepted intent variant where they were made
 * (`merge` marks where one went in), or, with `variant`, that intent variant's own.
 */
export async function history(db: Queryable, id: string, o: { variant?: number } = {}): Promise<DocEdit[]> {
  await rowOf(db, id);
  const { rows } = await db.query<any>(
    `SELECT u.seq, u.variant, v.type, u.kind, u.author, u.via, u.message, u.frontiers, u.created, length(u.bytes) AS bytes
       FROM play.doc_edits u JOIN play.doc_variants v ON v.id = u.variant
      WHERE u.doc_id = $1 AND ${o.variant !== undefined ? "u.variant = $2" : "(v.type = 'main' OR v.status = 'accepted')"} ORDER BY u.seq`,
    o.variant !== undefined ? [id, o.variant] : [id],
  );
  return rows.map((r) => ({ seq: Number(r.seq), variant: r.type === "main" ? null : Number(r.variant), kind: r.kind, author: r.author, via: r.via, message: r.message, frontiers: r.frontiers, created: r.created, bytes: Number(r.bytes) }));
}

/** the document's JSON at an edit (its seq) or a named version */
export async function stateAt(db: Queryable, id: string, at: { edit: number } | { version: number }): Promise<any> {
  const row = await rowOf(db, id);
  if ("version" in at) {
    const { rows } = await db.query<{ frontiers: Frontiers }>(`SELECT frontiers FROM play.doc_versions WHERE doc_id = $1 AND number = $2`, [id, at.version]);
    if (!rows[0]) throw new DocError(`${id} has no version ${at.version}`, 404);
    return jsonAt(await loadMain(db, row), rows[0].frontiers);
  }
  const { rows } = await db.query<{ variant: string; frontiers: Frontiers; type: string; status: string }>(
    `SELECT u.variant, u.frontiers, v.type, v.status FROM play.doc_edits u JOIN play.doc_variants v ON v.id = u.variant WHERE u.doc_id = $1 AND u.seq = $2`,
    [id, at.edit],
  );
  if (!rows[0]) throw new DocError(`${id} has no edit ${at.edit}`, 404);
  const main = await loadMain(db, row);
  // an edit on an intent variant not merged lives only on that variant
  const d = rows[0].type === "intent" && rows[0].status !== "accepted" ? await loadVariant(db, row, await variantRow(db, id, Number(rows[0].variant)), main) : main;
  return jsonAt(d, rows[0].frontiers);
}

/** the document's JSON at intent variant `v`'s seed on Main: what its changes are read against */
export async function seedOf(db: Queryable, id: string, v: number): Promise<any> {
  const row = await rowOf(db, id);
  return jsonAt(await loadMain(db, row), (await variantRow(db, id, v)).seed);
}

/** an intent variant's row: its seed, status, note and intent */
export async function variantOf(db: Queryable, id: string, v: number) {
  const r = await variantRow(db, id, v);
  return { id: Number(r.id), seed: r.seed, status: r.status, note: r.note, intent_id: r.intent_id, created_by: r.created_by, created: r.created };
}
