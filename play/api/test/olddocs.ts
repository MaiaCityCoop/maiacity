// Documents written as play's store wrote them before migration 0032-versioned (play.doc_branches, play.doc_updates),
// for the tests that build a database at an older migration and migrate it on: the store itself only knows the tables
// as they are now (doc_variants, doc_edits).
import { applyOps, contentHash, fromBytes, jsonOf, newDoc, patchTo, seed, type Op } from "../src/docs/core";
import { typeOf } from "../src/docs/schema";
import type { Queryable } from "../src/pg";

type Author = { human: string | null; via: string };
const peer = () => `${Math.floor(Math.random() * 2 ** 40) + 1}` as `${number}`;
const toBytes = (b: unknown): Uint8Array => (b instanceof Uint8Array ? b : new Uint8Array(b as ArrayBuffer));

async function lineOf(q: Queryable, id: string, branch: number | null) {
  const main = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch IS NULL ORDER BY seq`, [id]);
  const d = fromBytes(null, main.rows.map((r) => toBytes(r.bytes)));
  if (branch === null) return d;
  const { rows: b } = await q.query<{ base: any }>(`SELECT base FROM play.doc_branches WHERE id = $1`, [branch]);
  const f = d.forkAt(b[0].base);
  const own = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [id, branch]);
  if (own.rows.length) f.importBatch(own.rows.map((r) => toBytes(r.bytes)));
  return f;
}

async function keep(q: Queryable, id: string, branch: number | null, d: ReturnType<typeof newDoc>, before: any, kind: string, message: string, a: Author) {
  d.commit({ message });
  const bytes = d.export({ mode: "update", from: before });
  const frontiers = JSON.stringify(d.frontiers());
  await q.query(
    `INSERT INTO play.doc_updates (doc_id, branch, kind, bytes, peer, author, via, message, frontiers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ($9::text)::jsonb)`,
    [id, branch, kind, bytes, d.peerIdStr, a.human, a.via, message, frontiers],
  );
  if (branch === null) await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb WHERE id = $1`, [id, frontiers]);
  else await q.query(`UPDATE play.doc_branches SET head = ($2::text)::jsonb WHERE id = $1`, [branch, frontiers]);
}

/** a new document, its first state one step of its main line (and, with `version`, named v1) */
export async function createOldDoc(q: Queryable, o: { id: string; schema: string; json: unknown; author: Author; message: string; version?: string }) {
  const t = typeOf(o.schema);
  await q.query(`INSERT INTO play.docs (id, type, schema, created_by) VALUES ($1, $2, $3, $4)`, [o.id, t.type, t.name, o.author.human]);
  const d = newDoc();
  d.setPeerId(peer());
  const before = d.version();
  seed(d, t, o.json);
  await keep(q, o.id, null, d, before, "seed", o.message, o.author);
  if (o.version !== undefined)
    await q.query(`INSERT INTO play.doc_versions (doc_id, number, frontiers, content_hash, note, author) VALUES ($1, 1, ($2::text)::jsonb, $3, $4, $5)`, [
      o.id, JSON.stringify(d.frontiers()), contentHash(jsonOf(d)), o.version, o.author.human,
    ]);
}

/** one step on the main line, or on `branch`: operations, or the whole new state */
export async function commitOld(q: Queryable, id: string, o: { branch?: number; ops?: Op[]; target?: unknown; message: string; author: Author }) {
  const { rows } = await q.query<{ schema: string }>(`SELECT schema FROM play.docs WHERE id = $1`, [id]);
  const t = typeOf(rows[0].schema);
  const d = await lineOf(q, id, o.branch ?? null);
  d.setPeerId(peer());
  const before = d.version();
  if (o.ops) applyOps(d, t, o.ops);
  else patchTo(d, t, o.target);
  await keep(q, id, o.branch ?? null, d, before, "edit", o.message, o.author);
}

/** a new branch at the main line's head, as an old proposal's */
export async function branchOld(q: Queryable, id: string, o: { author: Author; note: string }): Promise<number> {
  const { rows } = await q.query<{ id: string }>(
    `INSERT INTO play.doc_branches (doc_id, base, head, note, created_by) SELECT id, head, head, $2, $3 FROM play.docs WHERE id = $1 RETURNING id`, [id, o.note, o.author.human],
  );
  return Number(rows[0].id);
}

/** a branch named a proposal */
export async function proposeOld(q: Queryable, branch: number, note: string) {
  await q.query(`UPDATE play.doc_branches SET status = 'proposed', note = $2, proposed_at = now() WHERE id = $1`, [branch, note]);
}
