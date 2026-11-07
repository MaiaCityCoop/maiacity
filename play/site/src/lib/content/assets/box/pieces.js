// @ts-nocheck — plain JS, runs in the page
/*
 * PIECES — a recipe names a shared piece by hash (play/SPEC.md §4.5; intent 5a15e468). A piece is readable source kept
 * among play's files by its BLAKE3 hash, a version of a `piece:<uuid>` document; a recipe requires it by that hash,
 * `require('<64 hex>')`, and lists it in its manifest's `pieces` with every piece those require, so a frozen version
 * always builds the pieces it was accepted with.
 *
 * Before a build the page resolves them here, from play's files alone (`/api/files/<hash>`, held to the hash, kept on
 * this device as every file is), and hands the worker one script: the pieces, each a CommonJS module, then the
 * recipe's own file as it is. The frozen engine is not changed: its `defineRecipe` takes the recipe's function, and the
 * pieces' part hands it on with a `require` that gives a piece by its hash and anything else (three.js and its addons)
 * from the engine. The worker still loads nothing.
 *
 * Refused, saying which: a piece not in the manifest, one play's files don't hold, one whose bytes are not its hash,
 * a piece requiring itself (a cycle), and a chain of pieces more than MOST_DEEP deep.
 */
import { hashBytes, holds } from '../../game/hash.js';
import * as cache from '../cache.js';

/** a piece's name: its BLAKE3 hash */
export const PIECE = /^[0-9a-f]{64}$/;
/** the longest chain of pieces a recipe may require: the recipe's own, and three more beneath it */
export const MOST_DEEP = 4;

/** everything a code requires, by name, in order @param {string} code */
export const requiresOf = (code) => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];
/** the pieces a code requires itself, by hash @param {string} code */
export const piecesOf = (code) => requiresOf(code).filter((n) => PIECE.test(n));

const short = (h) => `${h.slice(0, 12)}…`;

/** pieces handed to the page by hand, by their hashes (the render bench's, in development: ../RenderBench.svelte) */
const handed = new Map();
/** a piece's readable source handed to the page (the render bench): gives the hash a recipe requires it by @param {string} code */
export function handPiece(code) {
	const bytes = new TextEncoder().encode(code);
	const hash = hashBytes(bytes);
	handed.set(hash, bytes);
	return hash;
}
/** every piece handed to the page, by hash */
export const handedPieces = () => [...handed.keys()];

/**
 * A file of play's by its hash, held to it: one handed to the page (the bench), this device's copy, else
 * `/api/files/<hash>` on play's own origin (never another). Null when play doesn't hold it.
 * @param {string} hash @returns {Promise<Uint8Array | null>}
 */
export async function playFile(hash) {
	if (handed.has(hash)) return handed.get(hash);
	let bytes;
	try {
		bytes = await cache.fileAt(hash);
	} catch {
		// (no cache on this device)
	}
	if (holds(bytes, hash)) return bytes;
	const res = await fetch(`/api/files/${hash}`, { credentials: 'same-origin' });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`refused: piece ${short(hash)} could not be read from play's files (HTTP ${res.status})`);
	bytes = new Uint8Array(await res.arrayBuffer());
	if (holds(bytes, hash)) Promise.resolve().then(() => cache.keepFile(hash, bytes)).catch(() => {});
	return bytes;
}

/**
 * The pieces a recipe's code requires, and the pieces they require, each read and held to its hash: `{ hash, code,
 * depth }` in the order a build first needs them. Throws why one is refused.
 * @param {string} code the recipe's file
 * @param {string[]} named the pieces its manifest names
 * @param {{ fileAt?: (hash: string) => Promise<Uint8Array | null>, held?: (bytes: Uint8Array, hash: string) => boolean }} [o]
 *   where a piece's bytes come from (play's files) and how they are held to its hash (a test's stand-ins)
 */
export async function piecesFor(code, named = [], { fileAt = playFile, held = holds } = {}) {
	const listed = new Set(Array.isArray(named) ? named : []);
	const got = new Map();
	const walk = async (from, path) => {
		for (const hash of piecesOf(from)) {
			if (path.includes(hash)) throw new Error(`refused: piece ${short(hash)} requires itself (${[...path, hash].map(short).join(' → ')})`);
			if (path.length + 1 > MOST_DEEP) throw new Error(`refused: its pieces go more than ${MOST_DEEP} deep (${[...path, hash].map(short).join(' → ')})`);
			if (!listed.has(hash)) throw new Error(`refused: it requires piece ${short(hash)}, which its manifest doesn't name`);
			if (got.has(hash)) {
				// met again on another path: still held to the depth and to no cycle from here
				await walk(got.get(hash).code, [...path, hash]);
				continue;
			}
			const bytes = await fileAt(hash);
			if (!bytes) throw new Error(`refused: piece ${short(hash)} is not held among play's files`);
			if (!held(bytes, hash)) throw new Error(`refused: piece ${short(hash)} does not hash to its name`);
			const piece = { hash, code: new TextDecoder().decode(bytes), depth: path.length + 1 };
			got.set(hash, piece);
			await walk(piece.code, [...path, hash]);
		}
	};
	await walk(code, []);
	return [...got.values()];
}

/**
 * The script the worker runs for a recipe: its file alone when it requires no piece; else its pieces, then its file.
 * @param {string} code @param {{ hash: string, code: string }[]} pieces
 */
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
 * A recipe ready for the box: its code with its pieces before it, held as above. Its `pieces` (the manifest's) go with
 * it from the catalog (./catalog.js `recipeAt`).
 * @param {{ hash: string, code: string, pieces?: string[] }} recipe
 * @param {Parameters<typeof piecesFor>[2]} [o]
 * @returns {Promise<{ hash: string, code: string }>}
 */
export async function resolved(recipe, o) {
	if (!piecesOf(recipe.code).length) return { hash: recipe.hash, code: recipe.code };
	const pieces = await piecesFor(recipe.code, recipe.pieces ?? [], o);
	return { hash: recipe.hash, code: withPieces(recipe.code, pieces) };
}
