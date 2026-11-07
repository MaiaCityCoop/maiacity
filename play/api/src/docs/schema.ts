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
 * An asset as a document (play/SPEC.md §4.4, ../assetdocs.ts): its readable source as text, kept line by line and
 * character by character; its label, note and engine; its card (the version's record, a map of plain fields); and,
 * for a kind of variants, its default variant and each variant's card and, where it differs from the asset's own, its
 * source. A merged source is code: built and previewed in the box before it is accepted.
 */
const VARIANT = "^[a-z0-9][a-z0-9-]{0,79}$";
const variant: Node = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", pattern: VARIANT },
    source: { type: "string", maxLength: 16_000_000, "x-loro": "text" },
    card: { type: "object", additionalProperties: true },
    values: { type: "object", additionalProperties: true },
  },
  additionalProperties: true,
};
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
      source: { type: "string", maxLength: 16_000_000, "x-loro": "text" },
      engine: { type: "integer", minimum: 1 },
      card: { type: "object", additionalProperties: true },
      defaultVariant: { type: "string", pattern: VARIANT },
      variants: { type: "array", maxItems: 256, items: variant },
    },
    additionalProperties: true,
  },
  check(doc) {
    const out: string[] = [];
    const names = new Set<string>();
    for (const v of doc.variants ?? []) {
      if (names.has(v.name)) out.push(`variant ${v.name}: its name is taken twice`);
      names.add(v.name);
    }
    if (doc.defaultVariant !== undefined && doc.variants?.length && !names.has(doc.defaultVariant)) out.push(`its default variant ${doc.defaultVariant} is none of its variants`);
    return out;
  },
};

/**
 * A factory as a document (one kind of ../versioned.ts, Samuel 2026-11-04): a production line as AirSup's factory runtime reads it
 * (`line`: the product, the demand, the calendar, every station with its machine, its buffers, its breakdowns and what
 * it feeds, the stages' looks, the floor's layout), and its bill of process: every part of what it builds (`parts`, each
 * with what it is made from and every operation it goes through, at which station and for how many seconds), the raw
 * stock it buys (`stock`), the assemblies the parts are grouped in, and each station's own handling (`handling`). A
 * station's cycle time is the sum of its operations and its handling, worked out where the line is drawn, unless the
 * station gives its own `ct`. Data only: nothing of it is code.
 */
const ITEM_ID = "^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$";
const op: Node = {
  type: "object",
  required: ["at", "s"],
  properties: { at: { type: "string", pattern: ITEM_ID }, s: { type: "number", minimum: 0, maximum: 1e7 }, what: { type: "string", maxLength: 2000 } },
  additionalProperties: true,
};
const station: Node = {
  type: "object",
  required: ["id", "name", "machine"],
  properties: {
    id: { type: "string", pattern: ITEM_ID },
    name: { type: "string", minLength: 1, maxLength: 200 },
    machine: { type: "string", pattern: ITEM_ID },
    ct: { type: "number", minimum: 0 },
    cv: { type: "number", minimum: 0, maximum: 2 },
    buffer: { type: "integer", minimum: 0, maximum: 1000 },
    reserve: { type: "integer", minimum: 0, maximum: 100 },
    operators: { type: "integer", minimum: 0, maximum: 1000 },
    yield: { type: "number", minimum: 0, maximum: 1 },
    after: { type: "array", maxItems: 32, items: { type: "string", pattern: ITEM_ID } },
    what: { type: "string", maxLength: 4000 },
    rate: { type: "string", maxLength: 4000 },
  },
  additionalProperties: true,
};
export const FACTORY: DocType = {
  name: "factory/1",
  type: "factory",
  schema: {
    type: "object",
    required: ["schema", "label", "line", "parts"],
    properties: {
      schema: { const: "factory/1" },
      label: { type: "string", minLength: 1, maxLength: 200 },
      note: { type: "string", maxLength: 20000, "x-loro": "text" },
      from: { type: "string", maxLength: 2000 },
      builds: { type: "string", maxLength: 200 },
      line: {
        type: "object",
        required: ["product", "demand", "calendar", "stations"],
        properties: {
          product: { type: "object", required: ["name"], additionalProperties: true },
          demand: { type: "object", required: ["perDay"], properties: { perDay: { type: "number", minimum: 0 } }, additionalProperties: true },
          calendar: { type: "object", additionalProperties: true },
          stations: { type: "array", minItems: 1, maxItems: 500, items: station },
          stages: { type: "object", additionalProperties: true },
          layout: { type: "object", additionalProperties: true },
        },
        additionalProperties: true,
      },
      stock: { type: "object", additionalProperties: { type: "object", required: ["label"], additionalProperties: true } },
      assemblies: { type: "array", maxItems: 200, items: { type: "object", required: ["id", "label"], properties: { id: { type: "string", pattern: ITEM_ID }, label: { type: "string", maxLength: 200 } }, additionalProperties: true } },
      parts: {
        type: "array",
        maxItems: 5000,
        items: {
          type: "object",
          required: ["id", "label", "qty", "ops"],
          properties: {
            id: { type: "string", pattern: ITEM_ID },
            label: { type: "string", minLength: 1, maxLength: 300 },
            assembly: { type: "string", pattern: ITEM_ID },
            qty: { type: "number", minimum: 0 },
            raw: { type: "object", additionalProperties: true },
            ops: { type: "array", maxItems: 200, items: op },
          },
          additionalProperties: true,
        },
      },
      handling: { type: "object", additionalProperties: { type: "array", maxItems: 200, items: op } },
    },
    additionalProperties: true,
  },
  check(doc) {
    const out: string[] = [];
    const stations = new Set<string>();
    for (const s of doc.line?.stations ?? []) {
      if (stations.has(s.id)) out.push(`station ${s.id}: its id is taken twice`);
      stations.add(s.id);
    }
    for (const s of doc.line?.stations ?? []) for (const a of s.after ?? []) if (!stations.has(a)) out.push(`station ${s.id}: it comes after ${a}, which is no station of the line`);
    for (const r of doc.line?.layout?.ring ?? []) if (typeof r === "string" && !stations.has(r)) out.push(`the layout's ring names ${r}, which is no station of the line`);
    const assemblies = new Set((doc.assemblies ?? []).map((a: any) => a.id));
    const parts = new Set<string>();
    for (const p of doc.parts ?? []) {
      if (parts.has(p.id)) out.push(`part ${p.id}: its id is taken twice`);
      parts.add(p.id);
      if (p.assembly !== undefined && assemblies.size && !assemblies.has(p.assembly)) out.push(`part ${p.id}: its assembly ${p.assembly} is none of the factory's`);
      for (const k of [p.raw?.stock, ...(p.raw?.also ?? [])]) if (k !== undefined && !doc.stock?.[k]) out.push(`part ${p.id}: it is made from ${k}, which is no stock the factory buys`);
      for (const o of p.ops ?? []) if (!stations.has(o.at)) out.push(`part ${p.id}: an operation at ${o.at}, which is no station of the line`);
    }
    for (const [st, ops] of Object.entries<any[]>(doc.handling ?? {})) {
      if (!stations.has(st)) out.push(`handling at ${st}, which is no station of the line`);
      for (const o of ops) if (o.at !== st) out.push(`handling at ${st}: an operation names ${o.at}`);
    }
    return out;
  },
};

/**
 * A game config's levelling (one kind of ../versioned.ts, Samuel 2026-11-04): how a village grows. Each level is reached at a
 * number of villagers (Fibonacci counts: 1, 2, 3, 5, 8 …) and unlocks what the village builds next (a tent, a
 * container, a dome, an energy plant), each with its cost in euros; every new villager brings `villager.euros` and
 * `villager.hearts`, and an investor adds `investor` times what the level's new villagers brought in euros. Minds are
 * minted at a price that climbs with the level (`minds`); everything else (the minds each gets, the treasury in euros,
 * hearts and minds, who owns what) is worked out where it is shown (play/site's routes/game-editor/levels.ts). Data
 * only.
 */
const unlock: Node = {
  type: "object",
  required: ["label", "cost"],
  properties: { label: { type: "string", minLength: 1, maxLength: 300 }, cost: { type: "number", minimum: 0, maximum: 1e12 }, kind: { type: "string", maxLength: 40 }, note: { type: "string", maxLength: 2000 } },
  additionalProperties: true,
};
export const LEVELS: DocType = {
  name: "levels/1",
  type: "game",
  schema: {
    type: "object",
    required: ["schema", "label", "villager", "minds", "levels"],
    properties: {
      schema: { const: "levels/1" },
      label: { type: "string", minLength: 1, maxLength: 200 },
      note: { type: "string", maxLength: 20000, "x-loro": "text" },
      villager: {
        type: "object",
        required: ["euros", "hearts"],
        properties: { euros: { type: "number", minimum: 0, maximum: 1e9 }, hearts: { type: "number", minimum: 0, maximum: 1e12 } },
        additionalProperties: true,
      },
      minds: {
        type: "object",
        required: ["heartsPerMind", "step", "heartsPerEuro"],
        properties: {
          heartsPerMind: { type: "number", minimum: 0.0001, maximum: 1e9 },
          step: { type: "number", minimum: 0, maximum: 1e9 },
          heartsPerEuro: { type: "number", minimum: 0.0001, maximum: 1e9 },
        },
        additionalProperties: true,
      },
      levels: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: {
          type: "object",
          required: ["id", "villagers", "phase", "investor", "unlocks"],
          properties: {
            id: { type: "string", pattern: ITEM_ID },
            villagers: { type: "integer", minimum: 1, maximum: 1e9 },
            phase: { type: "string", minLength: 1, maxLength: 100 },
            investor: { type: "number", minimum: 0, maximum: 1000 },
            unlocks: { type: "array", maxItems: 50, items: unlock },
            note: { type: "string", maxLength: 4000 },
          },
          additionalProperties: true,
        },
      },
    },
    additionalProperties: true,
  },
  check(doc) {
    const out: string[] = [];
    const ids = new Set<string>();
    let last = 0;
    for (const l of doc.levels ?? []) {
      if (ids.has(l.id)) out.push(`level ${l.id}: its id is taken twice`);
      ids.add(l.id);
      if (l.villagers <= last) out.push(`level ${l.id}: ${l.villagers} villagers, not more than the level before (${last})`);
      last = l.villagers;
    }
    return out;
  },
};

/** an intent's stages, each a part of the Intents skill (../intents.ts INTENT_STAGES, the same list) */
export const SKILL_STAGES = ["idea", "specify", "prototype", "proposal", "ship", "accepted", "archived"] as const;
const skillText = (most: number): Node => ({ type: "string", maxLength: most, "x-loro": "text" });

/**
 * A skill (../skills.ts, play/SPEC.md §4.14): what play teaches its agents, kept once. Its `system` is its part of the
 * system prompt every MCP agent gets; the Intents skill's `stages` say what to do at each of an intent's stages, its
 * `{intent}` and `{title}` filled with the intent's id and title where it is served. Its label and group are only shown.
 */
export const SKILL: DocType = {
  name: "skill/1",
  type: "skill",
  schema: {
    type: "object",
    required: ["schema", "label", "group", "system"],
    properties: {
      schema: { const: "skill/1" },
      label: { type: "string", minLength: 1, maxLength: 200 },
      group: { type: "string", minLength: 1, maxLength: 100 },
      note: skillText(20000),
      system: skillText(50000),
      stages: { type: "object", properties: Object.fromEntries(SKILL_STAGES.map((s) => [s, skillText(20000)])), additionalProperties: false },
    },
    additionalProperties: false,
  },
};

export const TYPES: Record<string, DocType> = { [STORY.name]: STORY, [ASSET.name]: ASSET, [FACTORY.name]: FACTORY, [LEVELS.name]: LEVELS, [SKILL.name]: SKILL };

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
