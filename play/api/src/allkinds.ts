// The kinds play keeps (play/SPEC.md "Version control"), each registered once, in this order, into ./kinds.ts's
// registry: what its schema can't say, its rows and its hooks, wired to the module that does its own part. Whatever
// reads or writes a document (./app.ts, the import, a script) imports this first; ./versioned.ts, the generic layer,
// imports no kind. A schema with no hooks needs no entry here: it is a kind by ./kinds.ts syncKinds alone.
import * as docs from "./docs";
import { SCHEMA } from "./kit/ids";
import { hashText } from "./kit/hash";
import { HttpError } from "./kit/errors";
import { kinds, kindOfDoc, register, syncKinds, type Kind } from "./kinds";
import { assetEdits, assetReview, decideAsset, ensureAssetDoc, proposeAssetVariant, unreadable } from "./assetdocs";
import { decideStory, proposeStoryVariant, storyCheck, storyEdit, storyReview } from "./stories";
import { ensureStoryDoc } from "./storydocs";
import { storyListed } from "./listed";
import { INTENT_STAGES } from "./intents";
import { ensureLayoutDoc, layoutBefore, layoutReview, layoutShown, layoutView, layoutWrite, sandboxCheck, writeRows } from "./sandboxes";
import { ensureArtifactDoc } from "./artifacts";
import { intentPieces, keepPiece, PieceError, pieceProblems, piecesHeld, piecesOf } from "./pieces";

/** an asset: its variants' names each once, its default variant one of them */
function assetCheck(doc: any): string[] {
  const out: string[] = [];
  const names = new Set<string>();
  for (const v of doc.variants ?? []) {
    if (names.has(v.name)) out.push(`variant ${v.name}: its name is taken twice`);
    names.add(v.name);
  }
  if (doc.defaultVariant !== undefined && doc.variants?.length && !names.has(doc.defaultVariant)) out.push(`its default variant ${doc.defaultVariant} is none of its variants`);
  return out;
}
/** a factory: its stations, parts and stock named once and named only where they are (an operation at a station of the line) */
function factoryCheck(doc: any): string[] {
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
}
/** the levelling: its levels' ids each once, each level more villagers than the one before */
function levelsCheck(doc: any): string[] {
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
}

const asset: Kind = {
  name: "asset", prefix: "asset", schema: SCHEMA.asset, check: assetCheck, build: true, work: "asset_version", table: "play.assets", owned: "owner", label: "asset", group: "assets", breeds: true,
  ensure: (q, ctx, id) => ensureAssetDoc(q, ctx.store, id).then(() => undefined),
  write: async (_q, _id, cur, input) => (input.whole !== undefined ? { target: { ...(input.whole as object), schema: cur.schema } } : { edits: assetEdits(cur, input.edits) }),
  propose: (ctx, me, o, via) => proposeAssetVariant(ctx, me, o, via),
  review: (q, p) => assetReview(q, p),
  decide: (tx, ctx, me, p, verdict) => decideAsset(tx, ctx.store, me, p, verdict),
};
const story: Kind = {
  name: "story", prefix: "story", schema: SCHEMA.story, check: storyCheck, work: "story_version", table: "play.stories", labelColumn: "title", listed: storyListed("r"), label: "story", group: "stories",
  ensure: (q, _ctx, id) => ensureStoryDoc(q, id).then(() => undefined),
  write: (q, id, cur, input) => storyEdit(q, id, cur, input),
  propose: (ctx, me, o, via) => proposeStoryVariant(ctx.db, me, o, via),
  review: (q, p) => storyReview(q, p),
  decide: (tx, _ctx, me, p, verdict) => decideStory(tx, me, p, verdict),
};
const factory: Kind = {
  name: "factory", prefix: "factory", schema: SCHEMA.factory, check: factoryCheck, work: "factory_version", table: "play.factories", label: "factory", group: "factories", open: "/factories/?factory={id}&intent={intent}",
  row: { updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", stations: json.line?.stations?.length ?? 0, parts: json.parts?.length ?? 0 }),
};
const gameConfig: Kind = {
  name: "game_config", prefix: "game", schema: SCHEMA.levels, check: levelsCheck, work: "game_config_version", table: "play.game_configs", label: "config", group: "game", open: "/game-editor/?config={id}&intent={intent}",
  row: { updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", schema: json.schema }),
};
const skill: Kind = {
  name: "skill", prefix: "skill", schema: SCHEMA.skill, work: "skill_version", table: "play.records", where: "r.kind = 'skill'", label: "skill", group: "skills", open: "/skills/?skill={id}&intent={intent}",
  row: { kind: () => "skill", updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", group: json.group, stages: INTENT_STAGES.filter((s) => `${json.stages?.[s] ?? ""}`.trim()) }),
};
const sandbox: Kind = {
  name: "sandbox", prefix: "sandbox", schema: SCHEMA.sandbox, check: sandboxCheck, work: "sandbox_version", table: "play.sandboxes", labelColumn: "title", label: "layout", group: "sandboxes", open: "/sandboxes/{id}/?intent={intent}",
  ensure: (q, _ctx, id) => ensureLayoutDoc(q, id).then(() => undefined),
  write: (q, _id, cur, input) => layoutWrite(q, cur, input),
  review: (q, p) => layoutReview(q, p),
  before: (tx, docId, variant, merged) => layoutBefore(tx, docId, variant, merged),
  accepted: (tx, _ctx, docId, _number, json) => writeRows(tx, docId.split(":")[1], json),
  item: (json) => ({ pins: Object.keys(json.pins ?? {}).length, configs: Object.keys(json.configs ?? {}) }),
  view: (q, json, id) => layoutView(q, json, id),
  shown: (q, before, after) => layoutShown(q, before, after),
};

/**
 * A schema's new version (Samuel 2026-11-06) is refused while any document on Main fails it, naming them; a schema's
 * documents keep their prefix (its `type` never changes), and a new schema's prefix is no other kind's. Accepted as
 * every document is, every process's kinds are read again.
 */
const schema: Kind = {
  name: "schema", prefix: "schema", schema: SCHEMA.meta, check: (doc) => docs.nodeProblems(doc?.node), work: "schema_version", table: "play.records", where: "r.kind = 'schema'", label: "schema", group: "schemas", open: "/schemas/?schema={id}&intent={intent}",
  row: { kind: () => "schema", updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", type: json.type, name: json.name }),
  // the documents written against it: each its UUID, its kind, and the version of the schema it was last written against
  more: async (q, uuid) => ({
    documents: (await q.query<{ id: string; v: number | null }>(`SELECT id, schema_version AS v FROM play.docs WHERE schema_id = $1 AND id <> 'schema:' || $1::text ORDER BY created, id`, [uuid])).rows.map((r) => ({ id: r.id.split(":")[1], kind: kindOfDoc(r.id)?.name ?? null, schemaVersion: r.v })),
  }),
  before: async (tx, docId, _variant, merged) => {
    const next = merged as docs.SchemaJson, uuid = docId.split(":")[1];
    if ((await docs.versionsOf(tx, docId)).length > 0) {
      const was = (await docs.readDoc(tx, docId)).json as docs.SchemaJson;
      if (was.type !== next.type) throw new HttpError(`A schema's documents keep their prefix: this one's are ${was.type}:, not ${next.type}:.`, 409);
    } else if (kinds().some((k) => k.prefix === next.type) || (await docs.schemasOf(tx)).some((x) => x.json.type === next.type)) {
      throw new HttpError(`The prefix ${next.type}: is another kind's: a new schema names its own.`, 409);
    }
    const type = { schema: next.node, check: docs.hooksOf(uuid).check };
    const { rows } = await tx.query<{ id: string }>(`SELECT d.id FROM play.docs d WHERE d.schema_id = $1 AND EXISTS (SELECT 1 FROM play.doc_versions v WHERE v.doc_id = d.id) ORDER BY d.id`, [uuid]);
    const failing: string[] = [];
    for (const r of rows) {
      const problems = docs.problemsOf(type, (await docs.readDoc(tx, r.id)).json);
      if (problems.length) failing.push(`${r.id.split(":")[1]} (${problems.slice(0, 2).join("; ")})`);
    }
    if (failing.length) throw new HttpError(`This version of the schema fails ${failing.length} document${failing.length > 1 ? "s" : ""} on Main: ${failing.slice(0, 10).join(", ")}${failing.length > 10 ? " …" : ""}. Change them first, or the schema so they still validate.`, 409);
    return null;
  },
  accepted: (tx) => syncKinds(tx),
};

const field = (f: string) => (json: any) => json[f] ?? null;
/** a kept artifact has every field (a new one's Main is only its schema until it is accepted) */
const ARTIFACT_FIELDS = ["url", "title", "description", "summary", "kind", "origin", "agent", "authors"];
const artifact: Kind = {
  name: "artifact", prefix: "artifact", schema: SCHEMA.artifact, work: "artifact_version", table: "play.artifacts", labelColumn: "title", listed: "r.title IS NOT NULL", label: "artifact", group: "artifacts", open: "/artifacts/?artifact={id}&intent={intent}",
  check: (doc) => (Object.keys(doc ?? {}).length > 1 ? ARTIFACT_FIELDS.filter((f) => doc[f] === undefined).map((f) => `$.${f}: an artifact has its ${f}`) : []),
  ensure: (q, _ctx, id) => ensureArtifactDoc(q, id),
  row: {
    ...Object.fromEntries(["url", "description", "summary", "kind", "published", "text_hash", "origin"].map((f) => [f, field(f)])),
    tags: (j) => j.tags ?? [], author_ids: (j) => j.authors ?? [], agent_id: field("agent"), operator_id: field("operator"), token_id: field("token"),
  },
  item: (json) => ({ url: json.url ?? null }),
};

// a piece (./pieces.ts, play/SPEC.md §4.5): readable source a recipe names by its hash, read as an asset's source is
// (./assetdocs.ts unreadable); each accepted version's source kept among play's files by its hash. A new piece's Main
// is only its schema until it is accepted. An intent may hold several versions of one piece, in order (intent 02e3a85f).
const piece: Kind = {
  name: "piece", prefix: "piece", schema: SCHEMA.piece, work: "piece_version", table: "play.records", where: "r.kind = 'piece'", label: "piece", group: "pieces", manyPerIntent: true,
  check: (doc) => {
    if (Object.keys(doc ?? {}).length <= 1) return [];
    const out = ["label", "source"].filter((f) => doc[f] === undefined).map((f) => `$.${f}: a piece has its ${f}`);
    return out.length ? out : pieceProblems(doc.source, unreadable);
  },
  row: { kind: () => "piece", updated: () => new Date() },
  item: (json) => ({ note: json.note ?? "", bytes: Buffer.byteLength(`${json.source ?? ""}`) }),
  ready: async (q, json, intent) => {
    const source = `${json?.source ?? ""}`;
    // one version of a piece's source per intent: a second the same is no new version
    if (intent && (await intentPieces(q, intent)).some((x) => x.hash === hashText(source))) throw new PieceError("This intent proposes that piece's source already: a version of a piece is new source.");
    await piecesHeld(q, piecesOf(source), 3, intent);
  },
  accepted: (tx, ctx, docId, number, json, intent) => keepPiece(tx, ctx.store, docId, number, json, intent).then(() => undefined),
  more: async (q, uuid) => ({
    versions: (await q.query<{ number: number; hash: string; requires: string[]; depth: number }>(`SELECT number, hash, requires, depth FROM play.piece_versions WHERE piece_id = $1 ORDER BY number`, [uuid])).rows,
  }),
};

for (const k of [asset, story, factory, gameConfig, skill, sandbox, schema, artifact, piece]) register(k);
