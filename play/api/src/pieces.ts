// Pieces (play/SPEC.md §4.5; intent 5a15e468, Samuel 2026-11-07): a recipe names a shared piece by its hash. A piece is
// readable source, a document `piece:<uuid>` of its own schema (./ids.ts SCHEMA.piece), changed by an intent variant
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
import { hashText } from "./hash";
import type { Queryable } from "./pg";

/** a piece's name in a require: its BLAKE3 hash */
export const PIECE = /^[0-9a-f]{64}$/;
/** the longest chain of pieces a recipe may require: its own piece and three more beneath it */
export const MOST_DEEP = 4;
/** what a piece may require besides pieces: three.js and its addons, as the frozen engines hold them */
const THREE = /^three(\/addons\/[A-Za-z0-9_./-]+\.js)?$/;

/** everything a code requires, by name, in order */
export const requiresOf = (code: string): string[] => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];
/** the pieces a code requires itself, by hash */
export const piecesOf = (code: string): string[] => requiresOf(code).filter((n) => PIECE.test(n));
/** the modules of the engine a code requires (all but its pieces) */
export const libsOf = (code: string): string[] => requiresOf(code).filter((n) => !PIECE.test(n));

export class PieceError extends Error {}

const short = (h: string) => `${h.slice(0, 12)}…`;

/** what a piece's source can't be, said (the whole-document check: its schema can't say it) */
export function pieceProblems(source: string, unreadable: (s: string) => string | null): string[] {
  const out: string[] = [];
  if (!/\bmodule\.exports\b|\bexports\.[A-Za-z_$]/.test(source)) out.push("$.source: a piece is a CommonJS module: it sets module.exports (or exports.<name>)");
  const why = unreadable(source);
  if (why) out.push(`$.source: not readable: ${why}`);
  const other = requiresOf(source).filter((n) => !PIECE.test(n) && !THREE.test(n));
  if (other.length) out.push(`$.source: a piece requires only three.js, its addons and other pieces by their hashes, not ${other.slice(0, 3).join(", ")}`);
  return out;
}

/**
 * The pieces `hashes` and every piece beneath them, each an accepted piece version play holds: in order, with the
 * deepest chain (1 for a piece that requires none). Throws a PieceError naming one that is no accepted piece's
 * version, or a chain deeper than `most`.
 */
export async function piecesHeld(q: Queryable, hashes: string[], most = MOST_DEEP): Promise<{ all: string[]; depth: number }> {
  if (!hashes.length) return { all: [], depth: 0 };
  const all: string[] = [];
  let depth = 0;
  let level = [...new Set(hashes)];
  for (let d = 1; level.length; d++) {
    const { rows } = await q.query<{ hash: string; requires: string[]; depth: number }>(
      `SELECT DISTINCT ON (hash) hash, requires, depth FROM play.piece_versions WHERE hash = ANY($1::text[]) ORDER BY hash, created`,
      [level],
    );
    const got = new Map(rows.map((r) => [r.hash, r]));
    const missing = level.filter((h) => !got.has(h));
    if (missing.length) throw new PieceError(`It requires ${short(missing[0])}, which is no accepted version of a piece: a recipe names a piece by the hash of an accepted version's source (list_docs kind piece, doc_history).`);
    for (const r of rows) depth = Math.max(depth, d - 1 + r.depth);
    if (depth > most) throw new PieceError(`Its pieces go ${depth} deep: a recipe's pieces go at most ${most} deep, its own counted.`);
    for (const h of level) if (!all.includes(h)) all.push(h);
    level = [...new Set(rows.flatMap((r) => r.requires))].filter((h) => !all.includes(h));
  }
  return { all, depth };
}

/**
 * A piece's accepted version kept (the kind's `accepted` hook, in the Accept's transaction): its source among play's
 * files by its hash, and its row in play.piece_versions with what it requires and how deep it goes.
 */
export async function keepPiece(tx: Queryable, store: BlobStore, docId: string, number: number, json: any): Promise<string> {
  const source = `${json?.source ?? ""}`;
  const own = piecesOf(source);
  // what it requires is held as a recipe's would be, one deeper: itself
  const { depth } = await piecesHeld(tx, own, MOST_DEEP - 1).catch((e) => {
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
