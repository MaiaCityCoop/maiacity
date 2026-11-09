// The JSON Schema subset play validates every document against (play/SPEC.md "Version control"), with Loro's container
// hints, so one document maps to Loro the same way every time:
//
//   an object                      → a LoroMap
//   an array                       → a LoroMovableList (items can be moved without being deleted and inserted)
//   a string with "x-loro": "text" → a LoroText (edited character by character, its history kept per edit)
//   anything else                  → a plain value in its map or list
//
// No schema is written here: every schema is a document of the meta-schema in play's Postgres (./schemas.ts), and
// this is only how a node is read and a value checked against it.
import { HttpError } from "../kit/errors";

export type Node = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Node>;
  required?: string[];
  additionalProperties?: boolean | Node;
  items?: Node;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  "x-loro"?: "text";
};

/**
 * A document type as the store checks it: the schema's UUID and the version of it in force (its Main's newest), the
 * documents' id prefix (`type`), the schema's old name (only shown), its node, and what its kind says in code beside
 * it (../versioned.ts's hooks, by the schema's UUID): a whole-document `check`, and `build` for code.
 */
export type DocType = {
  id: string;
  version: number;
  name: string;
  type: string;
  schema: Node;
  /** what the schema can't say; returns the problems found */
  check?: (doc: any) => string[];
  /** a merged result is code that must be built and previewed in the box before it is accepted */
  build?: boolean;
};

export class SchemaError extends HttpError {
  constructor(public problems: string[]) {
    super(problems.slice(0, 6).join("; ") + (problems.length > 6 ? ` (and ${problems.length - 6} more)` : ""));
  }
}

const kindOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** the problems of `v` against `n`, each with its path */
export function validate(n: Node, v: unknown, path = "$", out: string[] = []): string[] {
  if (out.length > 50) return out;
  if (n.const !== undefined && v !== n.const) out.push(`${path}: must be ${JSON.stringify(n.const)}`);
  if (n.enum && !n.enum.includes(v as never)) out.push(`${path}: must be one of ${n.enum.map((e) => JSON.stringify(e)).join(", ")}`);
  const k = kindOf(v);
  if (n.type) {
    const ok = n.type === "integer" ? typeof v === "number" && Number.isInteger(v) : n.type === "number" ? typeof v === "number" && Number.isFinite(v) : n.type === k;
    if (!ok) return out.push(`${path}: must be ${n.type === "integer" ? "a whole number" : `a${/^[ao]/.test(n.type) ? "n" : ""} ${n.type}`}`), out;
  }
  if (typeof v === "number") {
    if (n.minimum !== undefined && v < n.minimum) out.push(`${path}: must be at least ${n.minimum}`);
    if (n.maximum !== undefined && v > n.maximum) out.push(`${path}: must be at most ${n.maximum}`);
  }
  if (typeof v === "string") {
    if (n.minLength !== undefined && v.length < n.minLength) out.push(`${path}: must be at least ${n.minLength} characters`);
    if (n.maxLength !== undefined && v.length > n.maxLength) out.push(`${path}: must be at most ${n.maxLength} characters`);
    if (n.pattern && !new RegExp(n.pattern).test(v)) out.push(`${path}: must match ${n.pattern}`);
  }
  if (Array.isArray(v)) {
    if (n.minItems !== undefined && v.length < n.minItems) out.push(`${path}: must hold at least ${n.minItems}`);
    if (n.maxItems !== undefined && v.length > n.maxItems) out.push(`${path}: must hold at most ${n.maxItems}`);
    if (n.items) v.forEach((x, i) => validate(n.items!, x, `${path}[${i}]`, out));
  }
  if (k === "object") {
    const o = v as Record<string, unknown>;
    for (const r of n.required ?? []) if (!(r in o)) out.push(`${path}.${r}: is missing`);
    for (const [key, x] of Object.entries(o)) {
      const child = n.properties?.[key] ?? (typeof n.additionalProperties === "object" ? n.additionalProperties : undefined);
      if (child) validate(child, x, `${path}.${key}`, out);
      else if (n.additionalProperties === false) out.push(`${path}.${key}: is not a field of this document`);
    }
  }
  return out;
}

/** the schema node for the value at `path` under `n` (a field that a schema doesn't name: an open node) */
export function nodeAt(n: Node, path: (string | number)[]): Node {
  let at: Node = n;
  for (const p of path) {
    if (typeof p === "number") at = at.items ?? {};
    else at = at.properties?.[p] ?? (typeof at.additionalProperties === "object" ? at.additionalProperties : {});
  }
  return at;
}

/** the problems of a whole document against its type */
export function problemsOf(t: Pick<DocType, "schema" | "check">, doc: unknown): string[] {
  const out = validate(t.schema, doc);
  if (!out.length && t.check) out.push(...t.check(doc));
  return out;
}

const KEYS = new Set(["type", "const", "enum", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "pattern", "x-loro", "description"]);

/**
 * The problems of a node as a node: only the words this subset knows, its children nodes in turn, its pattern one that
 * compiles. What the meta-schema can't say of itself (it has no $ref), said in code by the meta-schema's hook.
 */
export function nodeProblems(n: unknown, path = "$.node", out: string[] = []): string[] {
  if (out.length > 50) return out;
  if (!n || typeof n !== "object" || Array.isArray(n)) return out.push(`${path}: a node is an object`), out;
  const o = n as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!KEYS.has(k)) out.push(`${path}.${k}: is no word of a schema's node`);
  if (o.pattern !== undefined) {
    try {
      new RegExp(`${o.pattern}`);
    } catch {
      out.push(`${path}.pattern: does not compile`);
    }
  }
  if (o.properties !== undefined) {
    if (!o.properties || typeof o.properties !== "object" || Array.isArray(o.properties)) out.push(`${path}.properties: an object of nodes`);
    else for (const [k, c] of Object.entries(o.properties)) nodeProblems(c, `${path}.properties.${k}`, out);
  }
  if (o.items !== undefined) nodeProblems(o.items, `${path}.items`, out);
  if (o.additionalProperties !== undefined && typeof o.additionalProperties !== "boolean") nodeProblems(o.additionalProperties, `${path}.additionalProperties`, out);
  return out;
}
