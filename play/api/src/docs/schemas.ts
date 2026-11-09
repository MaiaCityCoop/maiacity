// Schemas as documents (play/SPEC.md "Version control", Samuel 2026-11-06). Every schema is a document `schema:<uuid>`
// of the meta-schema (itself one, `schema:<SCHEMA.meta>`, describing every schema and itself): its label (only shown),
// the documents' id prefix (`type`), its old name (`name`: story/1 …, only shown), and its `node`, the JSON Schema
// subset ./validate.ts reads. Postgres is the source: every commit, merge and preview checks against the schema's Main
// (typeFor, cached by the schema document's head), and every document names the schema it was written against
// (play.docs.schema_id) and that schema's version (schema_version). A schema changes only as every document does: by an
// intent variant, accepted by a person (./versioned.ts refuses the Accept while a document on Main fails it).
//
// The seed (each schema's v1 as play wrote it in code before) and what a schema can't say are ./seed.ts; ensureSchemas
// makes the seed's documents at the end of migrate(), only where absent; a schema is read as a type by ./store.ts typeFor.
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
 * The end of migrate(): each schema of the seed made a document, its v1, only where absent (the meta-schema first, a
 * document of itself), each its row among play.records; then every document that names no schema yet named by the
 * schema its old `schema` name was, at v1. From then on Postgres is the source.
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
