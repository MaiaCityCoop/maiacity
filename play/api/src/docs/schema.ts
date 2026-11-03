// The kinds of document play keeps in Loro (play/SPEC.md §4.4): each a JSON Schema (the subset below) with Loro
// container hints, so one document type maps to Loro the same way every time:
//
//   an object                      → a LoroMap
//   an array                       → a LoroMovableList (items can be moved without being deleted and inserted)
//   a string with "x-loro": "text" → a LoroText (edited character by character, its history kept per edit)
//   anything else                  → a plain value in its map or list
//
// Every commit is checked against its type's schema (and its `check`, for what a schema can't say, such as a clip
// inside its story's duration) before it is kept, and a document is always read back as plain JSON.

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

export type DocType = {
  /** the schema's name and version, as a document's `schema` field says it: story/1 */
  name: string;
  /** the kind of document: story, asset */
  type: string;
  schema: Node;
  /** what the schema can't say; returns the problems found */
  check?: (doc: any) => string[];
  /** a merged result is code that must be built and previewed in the box before it is accepted */
  build?: boolean;
};

export class SchemaError extends Error {
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

// ---- the types

const ID = "^[a-z0-9][a-z0-9-]{0,63}$";
const WORD = "^[a-z0-9][a-z0-9-]{0,31}$";
/**
 * A story as a document: its title and its timeline, in the format ../stories.ts checks in full before every step
 * (play/SPEC.md §12); here what the document itself must hold. A clip's texts (its line, transition, camera, retention)
 * are Loro texts, kept character by character; a clip may carry fields no kind names, kept as they are.
 */
const clip: Node = {
  type: "object",
  required: ["id", "at", "duration"],
  properties: {
    id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$" },
    at: { type: "number", minimum: 0 },
    duration: { type: "number", minimum: 0 },
    transition: { type: "string", maxLength: 2000, "x-loro": "text" },
    line: { type: "string", maxLength: 4000, "x-loro": "text" },
    camera: { type: "string", maxLength: 2000, "x-loro": "text" },
    retention: { type: "string", maxLength: 2000, "x-loro": "text" },
  },
  additionalProperties: true,
};

export const STORY: DocType = {
  name: "story/1",
  type: "story",
  schema: {
    type: "object",
    required: ["schema", "title", "format", "fps", "duration", "tracks"],
    properties: {
      schema: { const: "story/1" },
      title: { type: "string", minLength: 1, maxLength: 120 },
      format: { type: "string", enum: ["9:16", "16:9", "1:1", "4:5"] },
      fps: { type: "number", minimum: 1, maximum: 120 },
      duration: { type: "number", minimum: 0, maximum: 36000 },
      tracks: {
        type: "array",
        maxItems: 64,
        items: {
          type: "object",
          required: ["id", "kind", "clips"],
          properties: { id: { type: "string", pattern: WORD }, kind: { type: "string", pattern: WORD }, clips: { type: "array", maxItems: 4000, items: clip } },
          additionalProperties: true,
        },
      },
    },
    additionalProperties: true,
  },
  check(doc) {
    const out: string[] = [];
    const tracks = new Set<string>();
    for (const t of doc.tracks ?? []) {
      if (tracks.has(t.id)) out.push(`track ${t.id}: its id is taken twice`);
      tracks.add(t.id);
      const clips = new Set<string>();
      for (const c of t.clips ?? []) {
        if (clips.has(c.id)) out.push(`track ${t.id}, clip ${c.id}: its id is taken twice`);
        clips.add(c.id);
        if (c.at + c.duration > doc.duration + 1e-6) out.push(`track ${t.id}, clip ${c.id}: ends at ${+(c.at + c.duration).toFixed(3)} s, after the story's ${doc.duration} s`);
      }
    }
    return out;
  },
};

/**
 * An asset as a document (play/SPEC.md §4.4, its move onto Loro comes later): its readable source as text, edited
 * and kept character by character; its card and its variants. A merged source is code: built and previewed in the box
 * before it is accepted.
 */
export const ASSET: DocType = {
  name: "asset/1",
  type: "asset",
  build: true,
  schema: {
    type: "object",
    required: ["schema", "label", "source"],
    properties: {
      schema: { const: "asset/1" },
      label: { type: "string", minLength: 1, maxLength: 200 },
      note: { type: "string", maxLength: 20000, "x-loro": "text" },
      source: { type: "string", maxLength: 4_000_000, "x-loro": "text" },
      engine: { type: "integer", minimum: 1 },
      card: { type: "object", additionalProperties: true },
      variants: {
        type: "array",
        maxItems: 256,
        items: { type: "object", required: ["name"], properties: { name: { type: "string", pattern: ID }, values: { type: "object", additionalProperties: true } }, additionalProperties: true },
      },
    },
    additionalProperties: true,
  },
};

export const TYPES: Record<string, DocType> = { [STORY.name]: STORY, [ASSET.name]: ASSET };

/** the type a schema name names, or a SchemaError */
export function typeOf(name: string): DocType {
  const t = TYPES[name];
  if (!t) throw new SchemaError([`no document type ${JSON.stringify(name)}: one of ${Object.keys(TYPES).join(", ")}`]);
  return t;
}

/** the problems of a whole document against its type */
export function problemsOf(t: DocType, doc: unknown): string[] {
  const out = validate(t.schema, doc);
  if (!out.length && t.check) out.push(...t.check(doc));
  return out;
}
