// The seed of the schemas and what a schema can't say (play/SPEC.md "Version control", Samuel 2026-11-06): each seed
// schema's v1 as it was written in code before schemas were documents (../../migrations/schemas), read only where its
// document is not there yet (./schemas.ts ensureSchemas makes it), and the hooks by a schema's UUID that stay code (a
// story's clips inside its duration, an asset's variants and that it is code, the levelling's rising villagers).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA } from "../kit/ids";
import { DocError } from "./core";
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

type Hooks = { check?: (doc: any) => string[]; build?: boolean };
const HOOKS = new Map<string, Hooks>();
export function hook(schemaId: string, h: Hooks): void {
  if (h.check || h.build) HOOKS.set(schemaId, h);
  else HOOKS.delete(schemaId);
}
export const hooksOf = (schemaId: string): Hooks => HOOKS.get(schemaId) ?? {};
export const hooked = (schemaId: string) => HOOKS.has(schemaId);

export const asType = (id: string, version: number, j: SchemaJson): DocType => ({ id, version, name: j.name, type: j.type, schema: j.node, ...hooksOf(id) });

/** a seed's schema as a type, without the database (a test's documents as play wrote them before schemas were documents) */
export function seedType(id: string): DocType {
  const j = seedOf(id);
  if (!j) throw new DocError(`the seed has no schema ${id}`, 404);
  return asType(id, 1, j);
}
