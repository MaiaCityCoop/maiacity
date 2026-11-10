// Schemas as documents (play/SPEC.md "Version control", Samuel 2026-11-06): every schema is a document `schema:<uuid>` of
// the meta-schema (itself one, `schema:<SCHEMA.meta>`): its label (only shown), the documents' prefix (`type`), its old
// `name` (story/1 …, only shown) and its `node`, the JSON Schema subset ./validate.ts reads. Postgres is the source:
// every commit, merge and preview checks against the schema's Main (typeFor, cached by its head), and every document
// names its schema (play.docs.schema_id) and version (schema_version). A schema changes only by an intent variant
// accepted by a person (../versioned.ts refuses while a document on Main fails it). The seed (each v1, and what a schema
// can't say) is ./seed.ts; ensureSchemas makes its documents in play's seed (../seed.ts) where absent.
import { COOP, SCHEMA } from "../kit/ids";
import type { Db, Queryable } from "../kit/pg";
import { seedOf, SEEDED, type SchemaJson } from "./seed";
import { createDoc, readDoc } from "./store";
import { LOCK, lockSql } from "../kit/locks";

/** every accepted schema, as its document says it: its UUID, version and JSON (each read again only once its head moved) */
const read = new Map<string, { key: string; json: SchemaJson }>();
export async function schemasOf(q: Queryable): Promise<{ id: string; version: number; json: SchemaJson }[]> {
  const { rows } = await q.query<{ id: string; n: number; head: unknown }>(
    `SELECT split_part(d.id, ':', 2) AS id, d.head, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS n
       FROM play.docs d WHERE d.id LIKE 'schema:%' AND EXISTS (SELECT 1 FROM play.doc_versions v WHERE v.doc_id = d.id) ORDER BY d.created, d.id`,
  );
  const out = [];
  for (const r of rows) {
    const key = `${JSON.stringify(r.head)}#${r.n}`;
    let got = read.get(r.id);
    if (got?.key !== key) read.set(r.id, (got = { key, json: (await readDoc(q, `schema:${r.id}`)).json as SchemaJson }));
    out.push({ id: r.id, version: r.n, json: got.json });
  }
  return out;
}

// ---- the bootstrap

/**
 * Play's seed (../seed.ts), first: each seed schema made a document, v1, where absent (the meta-schema first, a document
 * of itself); then every document naming no schema yet named by its old `schema` name's, at v1.
 */
export async function ensureSchemas(db: Db): Promise<string[]> {
  const made: string[] = [];
  for (const id of SEEDED) {
    const did = await db.transaction(async (q) => {
      await q.query(lockSql(LOCK.schemaSeed));
      const { rows } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [`schema:${id}`]);
      if (rows.length) return false;
      const j = seedOf(id)!;
      await q.query(`INSERT INTO play.records (id, coop_id, kind, label) VALUES ($1, $2, 'schema', $3) ON CONFLICT (id) DO NOTHING`, [id, COOP, j.label]);
      await createDoc(q, { id: `schema:${id}`, schema: SCHEMA.meta, json: j, author: { human: null, via: "import" }, message: `v1: ${j.name}, as play wrote it in code before schemas were documents`, version: `${j.name} as it was written in code` });
      return true;
    });
    if (did) made.push(id);
  }
  await db.transaction(async (q) => {
    for (const id of SEEDED) await q.query(`UPDATE play.docs SET schema_id = $1, schema_version = 1 WHERE schema_id IS NULL AND schema = $2`, [id, seedOf(id)!.name]);
  });
  return made;
}
