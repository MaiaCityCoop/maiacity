// Schemas as documents (play/SPEC.md "Version control", Samuel 2026-11-06). Every schema is a document `schema:<uuid>`
// of the meta-schema (itself one, `schema:<SCHEMA.meta>`, describing every schema and itself): its label (only shown),
// the documents' id prefix (`type`), its old name (`name`: story/1 …, only shown), and its `node`, the JSON Schema
// subset ./validate.ts reads. Postgres is the source: every commit, merge and preview checks against the schema's Main
// (typeFor, cached by the schema document's head), and every document names the schema it was written against
// (play.docs.schema_id) and that schema's version (schema_version). A schema changes only as every document does: by an
// intent variant, accepted by a person (./versioned.ts refuses the Accept while a document on Main fails it).
//
// What a schema can't say stays code, by the schema's UUID (hook, from ./versioned.ts's kinds): a story's clips inside
// its duration, an asset's variants and that it is code (`build`), the levelling's rising villagers, a node's own words.
//
// The seed: each schema's v1 as it was written in code before (../../migrations/schemas), made by ensureSchemas at the
// end of migrate(), only where absent; nothing reads the seed once its document is there.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COOP, SCHEMA } from "../kit/ids";
import type { Db, Queryable } from "../kit/pg";
import { readDoc, createDoc, DocError } from "./store";
import type { DocType, Node } from "./validate";

export type SchemaJson = { label: string; type: string; name: string; note?: string; node: Node };

/** each schema's v1, by its UUID, read from ../../migrations/schemas (the seed) */
const FILES: Record<string, string> = { [SCHEMA.meta]: "meta", [SCHEMA.story]: "story", [SCHEMA.asset]: "asset", [SCHEMA.factory]: "factory", [SCHEMA.levels]: "levels", [SCHEMA.skill]: "skill", [SCHEMA.sandbox]: "sandbox", [SCHEMA.artifact]: "artifact", [SCHEMA.rules]: "rules", [SCHEMA.piece]: "piece" };
const DIR = join(import.meta.dir, "..", "..", "migrations", "schemas");
const seeds = new Map<string, SchemaJson>();
export function seedOf(id: string): SchemaJson | null {
  if (!FILES[id]) return null;
  if (!seeds.has(id)) seeds.set(id, JSON.parse(readFileSync(join(DIR, `${FILES[id]}.json`), "utf8")));
  return seeds.get(id)!;
}
/** the seed's schemas, the meta-schema first */
export const SEEDED = Object.keys(FILES);

// ---- hooks: what a schema can't say, by its UUID

export type Hooks = { check?: (doc: any) => string[]; build?: boolean };
const HOOKS = new Map<string, Hooks>();
export function hook(schemaId: string, h: Hooks): void {
  if (h.check || h.build) HOOKS.set(schemaId, h);
  else HOOKS.delete(schemaId);
}
export const hooksOf = (schemaId: string): Hooks => HOOKS.get(schemaId) ?? {};

const asType = (id: string, version: number, j: SchemaJson): DocType => ({ id, version, name: j.name, type: j.type, schema: j.node, ...hooksOf(id) });

/** a seed's schema as a type, without the database (a test's documents as play wrote them before schemas were documents) */
export function seedType(id: string): DocType {
  const j = seedOf(id);
  if (!j) throw new DocError(`the seed has no schema ${id}`, 404);
  return asType(id, 1, j);
}

// ---- reading a schema from Postgres

const cache = new Map<string, { key: string; type: DocType }>();

/**
 * The type schema `id` is now: its Main's newest version, from Postgres, cached by the schema document's head. A schema
 * not yet a document is its seed's v1 (the meta-schema as ensureSchemas makes it, a database before it); one proposed
 * and not yet accepted is no type yet.
 */
export async function typeFor(q: Queryable, id: string | null | undefined): Promise<DocType> {
  if (!id) throw new DocError("this document names no schema (play.docs.schema_id): run the migrations", 500);
  const { rows } = await q.query<{ head: unknown; n: number | null }>(
    `SELECT d.head, (SELECT max(number) FROM play.doc_versions v WHERE v.doc_id = d.id) AS n FROM play.docs d WHERE d.id = $1`,
    [`schema:${id}`],
  );
  if (!rows[0]) {
    const j = seedOf(id);
    if (!j) throw new DocError(`there is no schema ${id}`, 404);
    return asType(id, 1, j);
  }
  if (!rows[0].n) throw new DocError(`schema ${id} is not accepted yet: no document is written against it until it is`, 409);
  const key = `${JSON.stringify(rows[0].head)}#${rows[0].n}#${HOOKS.has(id) ? "h" : ""}`;
  const was = cache.get(id);
  if (was?.key === key) return was.type;
  const j = (await readDoc(q, `schema:${id}`)).json as SchemaJson;
  const type = asType(id, rows[0].n, j);
  cache.set(id, { key, type });
  return type;
}

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
      await q.query(`SELECT pg_advisory_xact_lock(4711030)`);
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
