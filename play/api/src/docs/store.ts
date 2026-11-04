// Documents in Postgres (play/SPEC.md §4.4). The server is the only writer: every write locks its document's row,
// loads it (its snapshot and the main steps after it; a branch: forked from the main line at its base, its own steps
// on top), applies the edit, checks the whole result against its type, and appends the step (its Loro update, who,
// why, when, the frontiers after it). A proposal is a branch; accepting merges it into the main line and names the
// result a version, whose canonical JSON's BLAKE3 is recorded. The browser never needs Loro: any step is served as JSON.
import { randomInt } from "node:crypto";
import type { LoroDoc } from "loro-crdt";
import type { Db, Queryable } from "../pg";
import { applyEdits, contentHash, diff, fromBytes, jsonAt, jsonOf, newDoc, patchTo, sameFrontiers, seed, type Change, type Edit, type Frontiers } from "./core";
import { problemsOf, SchemaError, typeOf, type DocType } from "./schema";

export class DocError extends Error {
  constructor(message: string, public status = 400, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/** who writes: a human (or the agent acting under their name), and through what */
export type Author = { human: string | null; via: "site" | "mcp" | "import" | "system" };
type DocRow = { id: string; type: string; schema: string; head: Frontiers; snapshot: Uint8Array | null; snapshot_seq: string };
type BranchRow = { id: string; doc_id: string; base: Frontiers; head: Frontiers; status: string; note: string; created_by: string | null; created: Date; proposed_at: Date | null; decided_by: string | null; decided_at: Date | null; version: number | null };
export type Step = { seq: number; branch: number | null; kind: string; author: string | null; via: string; message: string; frontiers: Frontiers; created: Date; bytes: number };
export type Version = { number: number; frontiers: Frontiers; contentHash: string; note: string; author: string | null; branch: number | null; created: Date };

/** main steps after a snapshot before a new snapshot is written (it keeps the whole history: only loading gets faster) */
export const COMPACT_AFTER = 32;
const ID = /^[a-z]+:[a-z0-9][a-z0-9:-]{0,120}$/;
const toBytes = (b: unknown): Uint8Array => (b instanceof Uint8Array ? b : new Uint8Array(b as ArrayBuffer));
const seconds = (d?: Date) => Math.floor((d ?? new Date()).getTime() / 1000);
/** runs `fn` in its own transaction, or in the caller's when given one (a story decided with its proposal: one transaction) */
const inTx = <R>(db: Db | Queryable, fn: (q: Queryable) => Promise<R>): Promise<R> => ("transaction" in db ? (db as Db).transaction(fn) : fn(db));

async function lock(q: Queryable, id: string): Promise<DocRow> {
  const { rows } = await q.query<DocRow>(`SELECT id, type, schema, head, snapshot, snapshot_seq FROM play.docs WHERE id = $1 FOR UPDATE`, [id]);
  if (!rows[0]) throw new DocError(`no document ${id}`, 404);
  return rows[0];
}
async function rowOf(q: Queryable, id: string): Promise<DocRow> {
  const { rows } = await q.query<DocRow>(`SELECT id, type, schema, head, snapshot, snapshot_seq FROM play.docs WHERE id = $1`, [id]);
  if (!rows[0]) throw new DocError(`no document ${id}`, 404);
  return rows[0];
}
async function branchOf(q: Queryable, docId: string, branch: number, forUpdate = false): Promise<BranchRow> {
  const { rows } = await q.query<BranchRow>(`SELECT * FROM play.doc_branches WHERE id = $1 AND doc_id = $2${forUpdate ? " FOR UPDATE" : ""}`, [branch, docId]);
  if (!rows[0]) throw new DocError(`${docId} has no branch ${branch}`, 404);
  return rows[0];
}

/** the main line as it is now */
async function loadMain(q: Queryable, row: DocRow): Promise<LoroDoc> {
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch IS NULL AND seq > $2 ORDER BY seq`, [row.id, row.snapshot_seq]);
  return fromBytes(row.snapshot ? toBytes(row.snapshot) : null, rows.map((r) => toBytes(r.bytes)));
}
/** a branch as it is now: the main line at its base, its own steps on top */
async function loadBranch(q: Queryable, row: DocRow, b: BranchRow, main?: LoroDoc): Promise<LoroDoc> {
  const m = main ?? (await loadMain(q, row));
  const d = m.forkAt(b.base);
  d.setRecordTimestamp(true);
  d.setChangeMergeInterval(0);
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [row.id, b.id]);
  if (rows.length) d.importBatch(rows.map((r) => toBytes(r.bytes)));
  return d;
}

/** the Loro peer `author` writes as on this line (a new one the first time) */
async function peerFor(q: Queryable, docId: string, branch: number | null, a: Author): Promise<`${number}`> {
  const { rows } = await q.query<{ peer: `${number}` }>(
    `SELECT peer FROM play.doc_peers WHERE doc_id = $1 AND COALESCE(branch, 0) = COALESCE($2::bigint, 0) AND COALESCE(author, '') = COALESCE($3, '') AND via = $4`,
    [docId, branch, a.human, a.via],
  );
  if (rows[0]) return rows[0].peer;
  for (;;) {
    const peer = String(randomInt(1, 2 ** 47) * 4096 + randomInt(0, 4096)) as `${number}`;
    const r = await q.query(`INSERT INTO play.doc_peers (peer, doc_id, branch, author, via) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [peer, docId, branch, a.human, a.via]);
    if (r.affectedRows) return peer;
  }
}

/** commits what was applied to `d` as one step of `line` (null: the main line), after checking the whole document */
async function step(q: Queryable, t: DocType, d: LoroDoc, before: ReturnType<LoroDoc["version"]>, line: { doc: DocRow; branch: number | null }, kind: "seed" | "edit" | "import" | "merge", message: string, a: Author, at?: Date): Promise<Step | null> {
  const json = jsonOf(d);
  const problems = problemsOf(t, json);
  if (problems.length) throw new SchemaError(problems);
  d.commit({ message, timestamp: seconds(at) });
  const bytes = d.export({ mode: "update", from: before });
  // nothing changed: no step
  if (sameFrontiers(d.frontiers(), d.vvToFrontiers(before)) && kind !== "seed") return null;
  const frontiers = d.frontiers();
  const { rows } = await q.query<{ seq: string; created: Date }>(
    `INSERT INTO play.doc_updates (doc_id, branch, kind, bytes, peer, author, via, message, frontiers, created) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ($9::text)::jsonb, COALESCE($10, now())) RETURNING seq, created`,
    [line.doc.id, line.branch, kind, bytes, d.peerIdStr, a.human, a.via, message, JSON.stringify(frontiers), at ?? null],
  );
  if (line.branch === null) await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb, updated = now() WHERE id = $1`, [line.doc.id, JSON.stringify(frontiers)]);
  else await q.query(`UPDATE play.doc_branches SET head = ($2::text)::jsonb WHERE id = $1`, [line.branch, JSON.stringify(frontiers)]);
  return { seq: Number(rows[0].seq), branch: line.branch, kind, author: a.human, via: a.via, message, frontiers, created: rows[0].created, bytes: bytes.length };
}

/** writes a new snapshot of the main line once enough steps have gathered after the last one */
async function compact(q: Queryable, row: DocRow, d: LoroDoc): Promise<void> {
  const { rows } = await q.query<{ n: string; last: string | null }>(`SELECT count(*) AS n, max(seq) AS last FROM play.doc_updates WHERE doc_id = $1 AND branch IS NULL AND seq > $2`, [row.id, row.snapshot_seq]);
  if (Number(rows[0].n) < COMPACT_AFTER) return;
  await q.query(`UPDATE play.docs SET snapshot = $2, snapshot_seq = $3 WHERE id = $1`, [row.id, d.export({ mode: "snapshot" }), rows[0].last]);
}

// ---- writing

/** a new document from its first state, as one step of its main line (and, if `version`, named v1) */
export async function createDoc(db: Db | Queryable, o: { id: string; schema: string; json: unknown; author: Author; message?: string; at?: Date; version?: string; number?: number }): Promise<{ id: string; step: Step; version: Version | null }> {
  if (!ID.test(o.id)) throw new DocError(`a document's id is its type and a name, like story:<uuid>: not ${JSON.stringify(o.id)}`);
  const t = typeOf(o.schema);
  if (!o.id.startsWith(t.type + ":")) throw new DocError(`a ${t.type} document's id starts with ${t.type}:`);
  return inTx(db, async (q) => {
    const made = await q.query(`INSERT INTO play.docs (id, type, schema, created_by, created) VALUES ($1, $2, $3, $4, COALESCE($5, now())) ON CONFLICT DO NOTHING`, [o.id, t.type, t.name, o.author.human, o.at ?? null]);
    if (!made.affectedRows) throw new DocError(`${o.id} is there already`, 409);
    const row = await lock(q, o.id);
    const d = newDoc();
    d.setPeerId(await peerFor(q, o.id, null, o.author));
    const before = d.version();
    seed(d, t, o.json);
    const s = (await step(q, t, d, before, { doc: row, branch: null }, o.author.via === "import" ? "import" : "seed", o.message ?? "created", o.author, o.at))!;
    const v = o.version !== undefined ? await name(q, row.id, d, o.version, o.author, null, o.at, o.number) : null;
    return { id: o.id, step: s, version: v };
  });
}

async function name(q: Queryable, docId: string, d: LoroDoc, note: string, a: Author, branch: number | null, at?: Date, number?: number): Promise<Version> {
  const frontiers = d.frontiers(), hash = contentHash(jsonOf(d));
  // the next number, or the one given (an asset's history replayed keeps its versions' own numbers, a gap and all),
  // which must come after every number the document has named
  if (number !== undefined) {
    const { rows: m } = await q.query<{ n: number | null }>(`SELECT max(number) AS n FROM play.doc_versions WHERE doc_id = $1`, [docId]);
    if (!Number.isInteger(number) || number < 1 || number <= (m[0]?.n ?? 0)) throw new DocError(`${docId}: a version ${number} would not come after v${m[0]?.n ?? 0}`, 409);
  }
  const { rows } = await q.query<{ number: number; created: Date }>(
    `INSERT INTO play.doc_versions (doc_id, number, frontiers, content_hash, note, author, branch, created)
       SELECT $1, COALESCE($8::int, COALESCE(max(number), 0) + 1), ($2::text)::jsonb, $3, $4, $5, $6, COALESCE($7, now()) FROM play.doc_versions WHERE doc_id = $1
     RETURNING number, created`,
    [docId, JSON.stringify(frontiers), hash, note, a.human, branch, at ?? null, number ?? null],
  );
  return { number: rows[0].number, frontiers, contentHash: hash, note, author: a.human, branch, created: rows[0].created };
}

export type Write = { edits: Edit[] } | { target: unknown };

/**
 * One step: `edits` (or the few operations that turn the document into `target`) on the main line or, with `branch`,
 * on that branch, committed with `message`. Nothing changed: null. A branch already decided takes no more steps.
 */
export async function commit(db: Db | Queryable, id: string, w: Write & { message: string; author: Author; branch?: number; kind?: "edit" | "import"; at?: Date }): Promise<Step | null> {
  if (!w.message?.trim()) throw new DocError("every step says what it does: its message is empty");
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const t = typeOf(row.schema);
    const main = await loadMain(q, row);
    let d = main, branch: number | null = null;
    if (w.branch !== undefined) {
      const b = await branchOf(q, id, w.branch, true);
      if (b.status !== "open" && b.status !== "proposed") throw new DocError(`branch ${b.id} was ${b.status}: it takes no more steps`, 409);
      d = await loadBranch(q, row, b, main);
      branch = Number(b.id);
    }
    d.setPeerId(await peerFor(q, id, branch, w.author));
    const before = d.version();
    if ("edits" in w) applyEdits(d, t, w.edits);
    else patchTo(d, t, w.target);
    const s = await step(q, t, d, before, { doc: row, branch }, w.kind ?? "edit", w.message.trim(), w.author, w.at);
    if (s && branch === null) await compact(q, row, d);
    return s;
  });
}

/** names the main line as it is now a version (an import's history, or an admin's own step) */
export async function nameVersion(db: Db | Queryable, id: string, o: { note: string; author: Author; at?: Date; number?: number }): Promise<Version> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    return name(q, id, await loadMain(q, row), o.note, o.author, null, o.at, o.number);
  });
}

/** a new branch, forked at the main line's head: where a proposal is made, step by step */
export async function branch(db: Db | Queryable, id: string, o: { author: Author; note?: string; at?: Frontiers }): Promise<{ id: number; base: Frontiers }> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const base = o.at ?? row.head;
    const { rows } = await q.query<{ id: string }>(`INSERT INTO play.doc_branches (doc_id, base, head, note, created_by) VALUES ($1, ($2::text)::jsonb, ($2::text)::jsonb, $3, $4) RETURNING id`, [id, JSON.stringify(base), o.note ?? "", o.author.human]);
    return { id: Number(rows[0].id), base };
  });
}

/** names a branch a proposal (with what it is for); it may still take steps until it is decided */
export async function propose(db: Db | Queryable, id: string, b: number, o: { note: string; author: Author }): Promise<void> {
  await inTx(db, async (q) => {
    await lock(q, id);
    const r = await branchOf(q, id, b, true);
    if (r.status !== "open" && r.status !== "proposed") throw new DocError(`branch ${b} was ${r.status}`, 409);
    const { rows } = await q.query<{ n: string }>(`SELECT count(*) AS n FROM play.doc_updates WHERE doc_id = $1 AND branch = $2`, [id, b]);
    if (Number(rows[0].n) === 0) throw new DocError(`branch ${b} has no steps: there is nothing to propose`);
    await q.query(`UPDATE play.doc_branches SET status = 'proposed', note = $2, proposed_at = COALESCE(proposed_at, now()) WHERE id = $1`, [b, o.note]);
  });
}

/** what accepting branch `b` would give now: the merged JSON, its hash, whether the main line moved since its base */
export async function previewMerge(db: Queryable, id: string, b: number): Promise<{ json: any; contentHash: string; concurrent: boolean; problems: string[] }> {
  const row = await rowOf(db, id);
  const r = await branchOf(db, id, b);
  const main = await loadMain(db, row);
  const { rows } = await db.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [id, b]);
  if (rows.length) main.importBatch(rows.map((x) => toBytes(x.bytes)));
  const json = jsonOf(main);
  return { json, contentHash: contentHash(json), concurrent: !sameFrontiers(r.base, row.head), problems: problemsOf(typeOf(row.schema), json) };
}

/**
 * Accepts proposal branch `b`: its steps merged into the main line (a CRDT merge: if the line moved on since the
 * branch's base, both sets of edits stand), the result checked against the type and named the next version. A type
 * whose content is code (`build`) whose merge met other edits is accepted only with `mergedHash`, the hash of the
 * merged result as it was built and previewed in the box (previewMerge): never code nobody has seen run.
 */
export async function accept(db: Db | Queryable, id: string, b: number, o: { author: Author; note?: string; mergedHash?: string }): Promise<Version> {
  return inTx(db, async (q) => {
    const row = await lock(q, id);
    const t = typeOf(row.schema);
    const r = await branchOf(q, id, b, true);
    if (r.status !== "proposed") throw new DocError(r.status === "open" ? `branch ${b} is not proposed yet` : `branch ${b} was ${r.status}`, 409);
    const main = await loadMain(q, row);
    const before = main.version();
    const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [id, b]);
    main.importBatch(rows.map((x) => toBytes(x.bytes)));
    const json = jsonOf(main), hash = contentHash(json);
    const problems = problemsOf(t, json);
    if (problems.length) throw new DocError(`merged into the main line as it is now, the proposal is no longer a valid ${t.name}: ${problems.slice(0, 4).join("; ")}. Propose it again on the new head.`, 409, { problems });
    const concurrent = !sameFrontiers(r.base, row.head);
    if (t.build && concurrent && o.mergedHash !== hash)
      throw new DocError(`the main line moved on since this proposal was made: its merge with the new head is code nobody has seen run. Build and preview the merged result (${hash}) in the box, then accept it with that hash.`, 409, { needsPreview: true, mergedHash: hash });
    const note = o.note ?? r.note;
    const merged = main.export({ mode: "update", from: before });
    const frontiers = main.frontiers();
    await q.query(
      `INSERT INTO play.doc_updates (doc_id, branch, kind, bytes, peer, author, via, message, frontiers) VALUES ($1, NULL, 'merge', $2, NULL, $3, $4, $5, ($6::text)::jsonb)`,
      [id, merged, o.author.human, o.author.via, `accepted branch ${b}${note ? `: ${note}` : ""}`, JSON.stringify(frontiers)],
    );
    await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb, updated = now() WHERE id = $1`, [id, JSON.stringify(frontiers)]);
    const v = await name(q, id, main, note, o.author, b);
    await q.query(`UPDATE play.doc_branches SET status = 'accepted', decided_by = $2, decided_at = now(), version = $3 WHERE id = $1`, [b, o.author.human, v.number]);
    await compact(q, row, main);
    return v;
  });
}

/** archives a branch (an admin, its author, or a moved head): its steps stay in the history, on their side line */
export async function close(db: Db | Queryable, id: string, b: number, o: { author: Author; status: "archived" }): Promise<void> {
  await inTx(db, async (q) => {
    await lock(q, id);
    const r = await branchOf(q, id, b, true);
    if (r.status !== "open" && r.status !== "proposed") throw new DocError(`branch ${b} was ${r.status}`, 409);
    await q.query(`UPDATE play.doc_branches SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [b, o.status, o.author.human]);
  });
}

// ---- reading

/** a document now, as JSON: its main line (or a branch), its versions and open branches */
export async function readDoc(db: Queryable, id: string, o: { branch?: number } = {}): Promise<{ id: string; type: string; schema: string; json: any; head: Frontiers; versions: Version[]; branches: { id: number; status: string; note: string; created_by: string | null }[] }> {
  const row = await rowOf(db, id);
  const main = await loadMain(db, row);
  const d = o.branch !== undefined ? await loadBranch(db, row, await branchOf(db, id, o.branch), main) : main;
  return { id, type: row.type, schema: row.schema, json: jsonOf(d), head: d.frontiers(), versions: await versionsOf(db, id), branches: (await db.query<any>(`SELECT id, status, note, created_by FROM play.doc_branches WHERE doc_id = $1 ORDER BY id`, [id])).rows.map((r) => ({ ...r, id: Number(r.id) })) };
}

export async function versionsOf(db: Queryable, id: string): Promise<Version[]> {
  const { rows } = await db.query<any>(`SELECT number, frontiers, content_hash, note, author, branch, created FROM play.doc_versions WHERE doc_id = $1 ORDER BY number`, [id]);
  return rows.map((r) => ({ number: r.number, frontiers: r.frontiers, contentHash: r.content_hash, note: r.note, author: r.author, branch: r.branch === null ? null : Number(r.branch), created: r.created }));
}

/**
 * The steps of a document, oldest first: its main line with the steps of every accepted branch where they were
 * made (`merge` marks where one went in), or, with `branch`, that branch's own steps.
 */
export async function history(db: Queryable, id: string, o: { branch?: number } = {}): Promise<Step[]> {
  await rowOf(db, id);
  const { rows } = await db.query<any>(
    o.branch !== undefined
      ? `SELECT seq, branch, kind, author, via, message, frontiers, created, length(bytes) AS bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`
      : `SELECT u.seq, u.branch, u.kind, u.author, u.via, u.message, u.frontiers, u.created, length(u.bytes) AS bytes FROM play.doc_updates u
           LEFT JOIN play.doc_branches b ON b.id = u.branch
          WHERE u.doc_id = $1 AND (u.branch IS NULL OR b.status = 'accepted') ORDER BY u.seq`,
    o.branch !== undefined ? [id, o.branch] : [id],
  );
  return rows.map((r) => ({ seq: Number(r.seq), branch: r.branch === null ? null : Number(r.branch), kind: r.kind, author: r.author, via: r.via, message: r.message, frontiers: r.frontiers, created: r.created, bytes: Number(r.bytes) }));
}

/** the document's JSON at a step (its seq) or a named version */
export async function stateAt(db: Queryable, id: string, at: { step: number } | { version: number }): Promise<any> {
  const row = await rowOf(db, id);
  if ("version" in at) {
    const { rows } = await db.query<{ frontiers: Frontiers }>(`SELECT frontiers FROM play.doc_versions WHERE doc_id = $1 AND number = $2`, [id, at.version]);
    if (!rows[0]) throw new DocError(`${id} has no version ${at.version}`, 404);
    return jsonAt(await loadMain(db, row), rows[0].frontiers);
  }
  const { rows } = await db.query<{ branch: string | null; frontiers: Frontiers; status: string | null }>(
    `SELECT u.branch, u.frontiers, b.status FROM play.doc_updates u LEFT JOIN play.doc_branches b ON b.id = u.branch WHERE u.doc_id = $1 AND u.seq = $2`,
    [id, at.step],
  );
  if (!rows[0]) throw new DocError(`${id} has no step ${at.step}`, 404);
  const main = await loadMain(db, row);
  // a step on a branch not merged lives only on that branch
  const d = rows[0].branch !== null && rows[0].status !== "accepted" ? await loadBranch(db, row, await branchOf(db, id, Number(rows[0].branch)), main) : main;
  return jsonAt(d, rows[0].frontiers);
}

/** what changed between two points (a step's seq or a version's number) */
export async function diffBetween(db: Queryable, id: string, a: { step: number } | { version: number }, b: { step: number } | { version: number }): Promise<Change[]> {
  return diff(await stateAt(db, id, a), await stateAt(db, id, b));
}

/** how big a document is: its snapshot, its steps, and the state alone */
export async function sizeOf(db: Queryable, id: string): Promise<{ snapshot: number; steps: number; stepBytes: number; full: number; shallow: number }> {
  const row = await rowOf(db, id);
  const { rows } = await db.query<{ n: string; b: string }>(`SELECT count(*) AS n, COALESCE(sum(length(bytes)), 0) AS b FROM play.doc_updates WHERE doc_id = $1`, [id]);
  const d = await loadMain(db, row);
  return { snapshot: row.snapshot ? toBytes(row.snapshot).length : 0, steps: Number(rows[0].n), stepBytes: Number(rows[0].b), full: d.export({ mode: "snapshot" }).length, shallow: d.export({ mode: "shallow-snapshot", frontiers: d.frontiers() }).length };
}
