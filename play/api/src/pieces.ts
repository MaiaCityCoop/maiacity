// Pieces (play/SPEC.md §4.5; intent 5a15e468, Samuel 2026-11-07): a recipe names a shared piece by its hash. A piece is
// readable source, a document `piece:<uuid>` of its own schema (./kit/ids.ts SCHEMA.piece), changed by an intent variant
// like any document; each accepted version's source is kept among play's files by its BLAKE3 hash and listed in
// play.piece_versions with the pieces it requires and how deep it goes. A recipe (an asset's source) requires one by
// that hash, `require('<64 hex>')`, and its manifest's `pieces` names it and every piece beneath it, so a frozen
// version always builds the pieces it was accepted with: a newer piece version is a new version of the asset.
//
// A piece is a CommonJS module as written (no minified lines: ./assetdocs.ts `unreadable`), requiring only three.js,
// three's addons and other pieces by hash, at most MOST_DEEP deep counted from the recipe (its own piece the first),
// with no cycle. The box resolves them from play's files (play/site's content/assets/box/pieces.js).
import { keepFile } from "./owners";
import type { BlobStore } from "./blobs";
import { keyOf } from "./blobs";
import { HASH, hashText } from "./kit/hash";
import type { Queryable } from "./kit/pg";
import { readDoc } from "./docs";
import { UUID } from "./kit/uuid";
import { HttpError } from "./kit/errors";

/** the longest chain of pieces a recipe may require: its own piece and three more beneath it */
export const MOST_DEEP = 4;
/** what a piece may require besides pieces: three.js and its addons, as the frozen engines hold them */
const THREE = /^three(\/addons\/[A-Za-z0-9_./-]+\.js)?$/;

/** everything a code requires, by name, in order */
export const requiresOf = (code: string): string[] => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];
/** the pieces a code requires itself, by hash */
export const piecesOf = (code: string): string[] => requiresOf(code).filter((n) => HASH.test(n));
/** the modules of the engine a code requires (all but its pieces) */
export const libsOf = (code: string): string[] => requiresOf(code).filter((n) => !HASH.test(n));

export class PieceError extends HttpError {}

const short = (h: string) => `${h.slice(0, 12)}…`;

/** what a piece's source can't be, said (the whole-document check: its schema can't say it) */
export function pieceProblems(source: string, unreadable: (s: string) => string | null): string[] {
  const out: string[] = [];
  if (!/\bmodule\.exports\b|\bexports\.[A-Za-z_$]/.test(source)) out.push("$.source: a piece is a CommonJS module: it sets module.exports (or exports.<name>)");
  const why = unreadable(source);
  if (why) out.push(`$.source: not readable: ${why}`);
  const other = requiresOf(source).filter((n) => !HASH.test(n) && !THREE.test(n));
  if (other.length) out.push(`$.source: a piece requires only three.js, its addons and other pieces by their hashes, not ${other.slice(0, 3).join(", ")}`);
  return out;
}

/** what the resolver knows of one piece version: what it requires, and how deep it goes where that is kept (an accepted one's) */
export type Known = { requires: string[]; depth?: number };
/** looks up piece versions by their hashes: those it knows, by hash */
type Lookup = (hashes: string[]) => Promise<Map<string, Known>>;

/** the accepted piece versions among `hashes` (play.piece_versions) */
const acceptedPieces = (q: Queryable): Lookup => async (hashes) => {
  const { rows } = await q.query<{ hash: string; requires: string[]; depth: number }>(
    `SELECT DISTINCT ON (hash) hash, requires, depth FROM play.piece_versions WHERE hash = ANY($1::text[]) ORDER BY hash, created`,
    [hashes],
  );
  return new Map(rows.map((r) => [r.hash, { requires: r.requires, depth: r.depth }]));
};

/**
 * The piece versions proposed in intent `intent` (intent 02e3a85f), by the hash of each one's source as it stands: every
 * proposed intent variant of a piece document it holds, in order (several versions of one piece among them).
 */
export async function intentPieces(q: Queryable, intent: string): Promise<{ doc_id: string; variant: number; position: number; hash: string; source: string; requires: string[] }[]> {
  const { rows } = await q.query<{ doc_id: string; variant_id: string; position: number }>(
    `SELECT iv.doc_id, iv.variant_id, iv.position FROM play.intent_variants iv JOIN play.doc_variants dv ON dv.id = iv.variant_id
      WHERE iv.intent_id = $1 AND iv.doc_id LIKE 'piece:%' AND dv.status = 'proposed' ORDER BY iv.position`,
    [intent],
  );
  const out = [];
  for (const r of rows) {
    const source = `${(await readDoc(q, r.doc_id, { variant: Number(r.variant_id) })).json?.source ?? ""}`;
    out.push({ doc_id: r.doc_id, variant: Number(r.variant_id), position: r.position, hash: hashText(source), source, requires: piecesOf(source) });
  }
  return out;
}

/**
 * The pieces `hashes` and every piece beneath them, found by `lookup`: in order, with the deepest chain (1 for a piece
 * that requires none). Throws a PieceError naming one `lookup` doesn't know (`unknown` says what it is not), pieces
 * that require each other in a circle, or a chain deeper than `most`.
 */
export async function resolvePieces(lookup: Lookup, hashes: string[], most = MOST_DEEP, unknown = "no accepted version of a piece"): Promise<{ all: string[]; depth: number }> {
  if (!hashes.length) return { all: [], depth: 0 };
  const all: string[] = [];
  const known = new Map<string, Known>();
  let level = [...new Set(hashes)];
  while (level.length) {
    const got = await lookup(level);
    const missing = level.filter((h) => !got.has(h));
    if (missing.length) throw new PieceError(`It requires ${short(missing[0])}, which is ${unknown}: a recipe names a piece by the hash of an accepted version's source (list_docs kind piece, doc_history), or of one proposed in the same intent.`);
    for (const h of level) {
      known.set(h, got.get(h)!);
      if (!all.includes(h)) all.push(h);
    }
    level = [...new Set(level.flatMap((h) => known.get(h)!.requires))].filter((h) => !known.has(h));
  }
  // how deep each goes: an accepted one as it was kept, one proposed beside it counted through what it requires
  const deep = new Map<string, number>();
  const depthOf = (h: string, path: string[]): number => {
    if (path.includes(h)) throw new PieceError(`Its pieces require each other in a circle: ${[...path.slice(path.indexOf(h)), h].map(short).join(" → ")}.`);
    if (deep.has(h)) return deep.get(h)!;
    const k = known.get(h)!;
    const d = k.depth ?? 1 + Math.max(0, ...k.requires.map((r) => depthOf(r, [...path, h])));
    deep.set(h, d);
    return d;
  };
  const depth = Math.max(...[...new Set(hashes)].map((h) => depthOf(h, [])));
  if (depth > most) throw new PieceError(`Its pieces go ${depth} deep: a recipe's pieces go at most ${most} deep, its own counted.`);
  return { all, depth };
}

/**
 * The one resolver of a source's pieces, at propose, at preview and at Accept (play/SPEC.md §4.5; intent 02e3a85f): the
 * pieces `hashes` and every piece beneath them, each an accepted piece version play holds or, with `intent`, a piece
 * version proposed in that same intent; in order, with the deepest chain. Throws a PieceError naming one that is
 * neither, pieces in a circle, or a chain deeper than `most` (the intent's own pieces counted).
 */
export async function piecesHeld(q: Queryable, hashes: string[], most = MOST_DEEP, intent?: string | null): Promise<{ all: string[]; depth: number }> {
  if (!hashes.length) return { all: [], depth: 0 };
  const accepted = acceptedPieces(q);
  intent = intent && UUID.test(`${intent}`.toLowerCase()) ? `${intent}`.toLowerCase() : null;
  if (!intent) return resolvePieces(accepted, hashes, most);
  const of = intent;
  let own: Map<string, Known> | null = null;
  const lookup: Lookup = async (level) => {
    const got = await accepted(level);
    const rest = level.filter((h) => !got.has(h));
    if (rest.length) {
      own ??= new Map((await intentPieces(q, of)).map((p) => [p.hash, { requires: p.requires }]));
      for (const h of rest) if (own.has(h)) got.set(h, own.get(h)!);
    }
    return got;
  };
  return resolvePieces(lookup, hashes, most, "no accepted version of a piece, nor one proposed in this intent");
}

/**
 * A piece's accepted version kept (the kind's `accepted` hook, in the Accept's transaction): its source among play's
 * files by its hash, and its row in play.piece_versions with what it requires and how deep it goes.
 */
export async function keepPiece(tx: Queryable, store: BlobStore, docId: string, number: number, json: any, intent?: string | null): Promise<string> {
  const source = `${json?.source ?? ""}`;
  const own = piecesOf(source);
  // what it requires is held as a recipe's would be, one deeper: itself (an Accept keeps an intent's pieces before what
  // requires them, so by now those it requires are kept)
  const { depth } = await piecesHeld(tx, own, MOST_DEEP - 1, intent).catch((e) => {
    if (e instanceof PieceError) throw new PieceError(`This piece: ${e.message}`);
    throw e;
  });
  const hash = hashText(source);
  const bytes = new TextEncoder().encode(source);
  const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, "text/javascript");
  await keepFile(tx, { hash, size: bytes.length, media_type: "text/javascript", bucket_key: key });
  await tx.query(`INSERT INTO play.piece_versions (hash, piece_id, number, requires, depth) VALUES ($1, $2, $3, $4, $5)`, [hash, docId.split(":")[1], number, own, depth + 1]);
  return hash;
}

/** the pieces a version names, as its card and viewer show them: each its hash, its piece, its label and version */
export async function piecesShown(q: Queryable, hashes: string[]): Promise<{ hash: string; piece: string; label: string; version: number }[]> {
  if (!hashes.length) return [];
  const { rows } = await q.query<{ hash: string; piece: string; label: string; version: number }>(
    `SELECT DISTINCT ON (v.hash) v.hash, v.piece_id AS piece, COALESCE(r.label, 'A piece') AS label, v.number AS version
       FROM play.piece_versions v LEFT JOIN play.records r ON r.id = v.piece_id WHERE v.hash = ANY($1::text[]) ORDER BY v.hash, v.created`,
    [hashes],
  );
  const by = new Map(rows.map((r) => [r.hash, r]));
  return hashes.map((h) => by.get(h) ?? { hash: h, piece: "", label: "A piece", version: 0 });
}
