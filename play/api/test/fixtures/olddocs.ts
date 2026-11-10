// Documents written as play's store wrote them before migration 0032-versioned: play.doc_updates and
// play.doc_branches, the main line the rows whose branch is NULL. A test that builds a database as it stood at an older
// migration (0017, 0029, 0031) writes its documents with these, then migrates it and reads it with today's store.
import type { LoroDoc } from "loro-crdt";
import type { Queryable } from "../../src/kit/pg";
import { applyEdits, contentHash, fromBytes, jsonOf, newDoc, patchTo, seed, type Edit, type Frontiers } from "../../src/docs/core";
import { seedType } from "../../src/docs/seed";
import { SCHEMA } from "../../src/kit/ids";

/** a type as play's code wrote it then, by its old name: the seed's v1 */
const OLD: Record<string, string> = { "story/1": SCHEMA.story, "asset/1": SCHEMA.asset, "factory/1": SCHEMA.factory, "levels/1": SCHEMA.levels, "skill/1": SCHEMA.skill };
const typeOf = (name: string) => seedType(OLD[name]);

type Author = { human: string | null; via: string };
const bytes = (b: unknown): Uint8Array => (b instanceof Uint8Array ? b : new Uint8Array(b as ArrayBuffer));
let peers = 1;
const peer = () => `${7_000_000 + peers++ * 4096}` as `${number}`;

async function main(q: Queryable, id: string): Promise<LoroDoc> {
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch IS NULL ORDER BY seq`, [id]);
  return fromBytes(null, rows.map((r) => bytes(r.bytes)));
}
async function onBranch(q: Queryable, id: string, b: number): Promise<LoroDoc> {
  const { rows: br } = await q.query<{ base: Frontiers }>(`SELECT base FROM play.doc_branches WHERE id = $1`, [b]);
  const d = (await main(q, id)).forkAt(br[0].base);
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [id, b]);
  if (rows.length) d.importBatch(rows.map((r) => bytes(r.bytes)));
  return d;
}
async function step(q: Queryable, id: string, branch: number | null, d: LoroDoc, before: ReturnType<LoroDoc["version"]>, kind: string, message: string, a: Author) {
  d.commit({ message });
  const update = d.export({ mode: "update", from: before });
  const frontiers = d.frontiers();
  await q.query(
    `INSERT INTO play.doc_updates (doc_id, branch, kind, bytes, peer, author, via, message, frontiers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ($9::text)::jsonb)`,
    [id, branch, kind, update, d.peerIdStr, a.human, a.via, message, JSON.stringify(frontiers)],
  );
  if (branch === null) await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb WHERE id = $1`, [id, JSON.stringify(frontiers)]);
  else await q.query(`UPDATE play.doc_branches SET head = ($2::text)::jsonb WHERE id = $1`, [branch, JSON.stringify(frontiers)]);
  return frontiers;
}
async function name(q: Queryable, id: string, d: LoroDoc, note: string, a: Author, branch: number | null) {
  const { rows } = await q.query<{ number: number }>(
    `INSERT INTO play.doc_versions (doc_id, number, frontiers, content_hash, note, author, branch)
       SELECT $1, COALESCE(max(number), 0) + 1, ($2::text)::jsonb, $3, $4, $5, $6 FROM play.doc_versions WHERE doc_id = $1 RETURNING number`,
    [id, JSON.stringify(d.frontiers()), contentHash(jsonOf(d)), note, a.human, branch],
  );
  return rows[0].number;
}

/** a new document, its first state a step of the main line, named v1 where `version` is given */
export async function oldCreate(q: Queryable, o: { id: string; schema: string; json: unknown; author: Author; message?: string; version?: string }) {
  const t = typeOf(o.schema);
  await q.query(`INSERT INTO play.docs (id, type, schema, created_by) VALUES ($1, $2, $3, $4)`, [o.id, t.type, t.name, o.author.human]);
  const d = newDoc();
  d.setPeerId(peer());
  const before = d.version();
  seed(d, t, o.json);
  await step(q, o.id, null, d, before, "seed", o.message ?? "created", o.author);
  if (o.version !== undefined) await name(q, o.id, d, o.version, o.author, null);
}

/** one step, on the main line or on branch `branch` */
export async function oldCommit(q: Queryable, id: string, w: ({ edits: Edit[] } | { target: unknown }) & { message: string; author: Author; branch?: number }) {
  const { rows } = await q.query<{ schema: string }>(`SELECT schema FROM play.docs WHERE id = $1`, [id]);
  const t = typeOf(rows[0].schema);
  const d = w.branch === undefined ? await main(q, id) : await onBranch(q, id, w.branch);
  d.setPeerId(peer());
  const before = d.version();
  if ("edits" in w) applyEdits(d, t, w.edits);
  else patchTo(d, t, w.target);
  await step(q, id, w.branch ?? null, d, before, "edit", w.message, w.author);
}

/** names the main line as it is now a version */
export async function oldNameVersion(q: Queryable, id: string, note: string, a: Author) {
  return name(q, id, await main(q, id), note, a, null);
}

/** a new branch at the main line's head */
export async function oldBranch(q: Queryable, id: string, o: { author: Author; note?: string }): Promise<number> {
  const { rows } = await q.query<{ head: Frontiers }>(`SELECT head FROM play.docs WHERE id = $1`, [id]);
  const r = await q.query<{ id: string }>(
    `INSERT INTO play.doc_branches (doc_id, base, head, note, created_by) VALUES ($1, ($2::text)::jsonb, ($2::text)::jsonb, $3, $4) RETURNING id`,
    [id, JSON.stringify(rows[0].head), o.note ?? "", o.author.human],
  );
  return Number(r.rows[0].id);
}

export async function oldPropose(q: Queryable, b: number, note: string) {
  await q.query(`UPDATE play.doc_branches SET status = 'proposed', note = $2, proposed_at = now() WHERE id = $1`, [b, note]);
}

/** a proposed branch merged into the main line and named its next version */
export async function oldAccept(q: Queryable, id: string, b: number, a: Author, note: string): Promise<number> {
  const d = await main(q, id);
  const before = d.version();
  const { rows } = await q.query<{ bytes: Uint8Array }>(`SELECT bytes FROM play.doc_updates WHERE doc_id = $1 AND branch = $2 ORDER BY seq`, [id, b]);
  d.importBatch(rows.map((r) => bytes(r.bytes)));
  const update = d.export({ mode: "update", from: before });
  await q.query(
    `INSERT INTO play.doc_updates (doc_id, branch, kind, bytes, peer, author, via, message, frontiers) VALUES ($1, NULL, 'merge', $2, NULL, $3, $4, $5, ($6::text)::jsonb)`,
    [id, update, a.human, a.via, `accepted branch ${b}`, JSON.stringify(d.frontiers())],
  );
  await q.query(`UPDATE play.docs SET head = ($2::text)::jsonb WHERE id = $1`, [id, JSON.stringify(d.frontiers())]);
  const n = await name(q, id, d, note, a, b);
  await q.query(`UPDATE play.doc_branches SET status = 'accepted', version = $2, decided_at = now() WHERE id = $1`, [b, n]);
  return n;
}
