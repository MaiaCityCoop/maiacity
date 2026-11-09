// @ts-nocheck — plain JS, runs in the page
/*
 * Pieces (play/SPEC.md §4.5; intent 5a15e468): a recipe requires a shared piece by its BLAKE3 hash, `require('<64 hex>')`,
 * listed in its manifest's `pieces`, so a frozen version always builds the pieces it was accepted with. Resolved here
 * from play's files alone (../cache/files.js), held to the hash, and handed to the worker in one script with the recipe
 * (the engine unchanged, the worker loading nothing). Refused, saying which: a piece not in the manifest, not held, not
 * its hash, a cycle, a chain past MOST_DEEP.
 */
import { HASH, hashBytes, holds } from '../../../kernel/hash.js';
import { playFile } from '../cache/files.js';

export const PIECE = HASH;
/** the longest chain of pieces a recipe may require: the recipe's own, and three more beneath it */
export const MOST_DEEP = 4;

/** everything a code requires, by name, in order @param {string} code */
export const requiresOf = (code) => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];
/** the pieces a code requires itself, by hash @param {string} code */
export const piecesOf = (code) => requiresOf(code).filter((n) => PIECE.test(n));

const short = (h) => `${h.slice(0, 12)}…`;

/** pieces handed to the page by hand, by their hashes (the render bench's, in development: routes/render/RenderBench.svelte) */
const handed = new Map();
/** a piece's readable source handed to the page (the render bench): gives the hash a recipe requires it by @param {string} code */
export function handPiece(code) {
	const bytes = new TextEncoder().encode(code);
	const hash = hashBytes(bytes);
	handed.set(hash, bytes);
	return hash;
}
export const handedPieces = () => [...handed.keys()];

/** A piece's bytes by hash: one handed to the page (the bench), else play's file; null where play has none. @param {string} hash @returns {Promise<Uint8Array | null>} */
const pieceFile = (hash) =>
	handed.has(hash) ? Promise.resolve(handed.get(hash)) : playFile(hash, (status) => new Error(`refused: piece ${short(hash)} could not be read from play's files (HTTP ${status})`));

/**
 * The pieces a recipe requires, and theirs, each read and held to its hash: `{ hash, code, depth }` in the order a build
 * first needs them; throws why one is refused. @param {string} code the recipe's file @param {string[]} named its manifest's pieces
 * @param {{ fileAt?: (hash: string) => Promise<Uint8Array | null>, held?: (bytes: Uint8Array, hash: string) => boolean }} [o]
 *   where a piece's bytes come from (play's files) and how they are held to its hash (a test's stand-ins)
 */
export async function piecesFor(code, named = [], { fileAt = pieceFile, held = holds } = {}) {
	const listed = new Set(Array.isArray(named) ? named : []);
	/** each piece read once, by hash, held to it: all of a level asked for at once, not one after another */
	const reads = new Map();
	const read = (hash) => {
		if (!reads.has(hash))
			reads.set(
				hash,
				(async () => {
					const bytes = await fileAt(hash);
					if (!bytes) throw new Error(`refused: piece ${short(hash)} is not held among play's files`);
					if (!held(bytes, hash)) throw new Error(`refused: piece ${short(hash)} does not hash to its name`);
					return new TextDecoder().decode(bytes);
				})()
			);
		return reads.get(hash);
	};
	/** every path from `from` held to the manifest, depth and no cycle, each level read together (a piece met again is held, read once) */
	const walk = async (from, path) => {
		const next = piecesOf(from);
		for (const hash of next) {
			if (path.includes(hash)) throw new Error(`refused: piece ${short(hash)} requires itself (${[...path, hash].map(short).join(' → ')})`);
			if (path.length + 1 > MOST_DEEP) throw new Error(`refused: its pieces go more than ${MOST_DEEP} deep (${[...path, hash].map(short).join(' → ')})`);
			if (!listed.has(hash)) throw new Error(`refused: it requires piece ${short(hash)}, which its manifest doesn't name`);
		}
		const codes = await Promise.all(next.map(read));
		await Promise.all(next.map((hash, i) => walk(codes[i], [...path, hash])));
	};
	await walk(code, []);
	// in the order they are first met, depth first (as they were read one by one before)
	const out = [], seen = new Set();
	const list = async (from, depth) => {
		for (const hash of piecesOf(from)) {
			if (seen.has(hash)) continue;
			seen.add(hash);
			const piece = { hash, code: await reads.get(hash), depth: depth + 1 };
			out.push(piece);
			await list(piece.code, depth + 1);
		}
	};
	await list(code, 0);
	return out;
}

/** The worker's script for a recipe: its file alone without pieces, else its pieces then its file. @param {string} code @param {{ hash: string, code: string }[]} pieces */
export function withPieces(code, pieces) {
	if (!pieces.length) return code;
	const each = pieces.map((p) => `${JSON.stringify(p.hash)}: function (require, module, exports) {\n"use strict";\n${p.code}\n}`).join(',\n');
	return (
		`(function (define) {\nvar pieces = {\n${each}\n};\n` +
		`var own = Object.prototype.hasOwnProperty;\n` +
		`self.defineRecipe = function (recipe) {\n\treturn define(function (require) {\n\t\tvar made = {};\n` +
		`\t\tfunction need(name) {\n\t\t\tif (!own.call(pieces, name)) return require(name);\n` +
		`\t\t\tif (!own.call(made, name)) {\n\t\t\t\tvar m = { exports: {} };\n\t\t\t\tmade[name] = m;\n\t\t\t\tpieces[name](need, m, m.exports);\n\t\t\t}\n` +
		`\t\t\treturn made[name].exports;\n\t\t}\n\t\treturn recipe(need);\n\t});\n};\n})(self.defineRecipe);\n` +
		code
	);
}

/**
 * A recipe ready for the box, its pieces before it, held as above (its manifest's `pieces` from ../catalog.js `recipeAt`).
 * @param {{ hash: string, code: string, pieces?: string[] }} recipe @param {Parameters<typeof piecesFor>[2]} [o]
 * @returns {Promise<{ hash: string, code: string }>}
 */
export async function resolved(recipe, o) {
	if (!piecesOf(recipe.code).length) return { hash: recipe.hash, code: recipe.code };
	const pieces = await piecesFor(recipe.code, recipe.pieces ?? [], o);
	return { hash: recipe.hash, code: withPieces(recipe.code, pieces) };
}
