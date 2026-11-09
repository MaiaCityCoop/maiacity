// @ts-nocheck — plain JS, runs in the page
/*
 * THE CATALOG — play's one source of assets (play/SPEC.md §4): every accepted version and variant by its recipe file's
 * BLAKE3 hash (/api/catalog), each file read from play's files, held to that hash and kept on this device (./cache/files.js).
 * An asset is named only by a hash: a build, `<hash>?values` (../../kernel/builds.js), or a pin, `pin:<sandbox>/<slot>?values`,
 * which the sandbox's config (../game/code/index.js) maps to a build. A version's number, an id and a label are only shown.
 */
import { hashText, holds } from '../../kernel/hash.js';
import { configAt, configKey, loadConfig } from '../game/code/index.js';
import { BUILD_START, buildOf, parseBuild } from '../../kernel/builds.js';
import { playFile } from './cache/files.js';
import { LATEST } from './box/engines.js';
import { handedPieces } from './box/pieces.js';
import { lodOf } from './lodcard.js';

// the names of a build, which render/index.js and sandbox-4/scene.ts (held) take from here
export { buildOf, parseBuild };

/** a build the catalog can't give: a hash it doesn't hold, a slot its sandbox doesn't pin, or a name that is no hash */
export class NotInCatalog extends Error {}

/** the largest recipe file a page reads */
export const MOST = 16_000_000;

/** What the page knows of each recipe by hash (group, id, version, variant, label, values) and the default engine. */
export const INDEX = { engine: LATEST.v, recipes: {} };
const records = new Map();
const sizes = new Map();

/** where the catalog is: `phase` (idle, loading, ready, failed), how many recipes, why none */
export const catalog = { phase: 'idle', count: 0, error: '' };

async function load() {
	Object.assign(catalog, { phase: 'loading', count: 0, error: '' });
	try {
		// asked again, twice, where the proxy got no answer for a moment (502, 503, 504)
		let res = await fetch('/api/catalog', { credentials: 'same-origin' });
		for (const wait of [1000, 3000]) {
			if (![502, 503, 504].includes(res.status)) break;
			await new Promise((ok) => setTimeout(ok, wait));
			res = await fetch('/api/catalog', { credentials: 'same-origin' });
		}
		if (!res.ok) throw new Error(res.status === 401 ? 'Please sign in first.' : `The asset catalog could not be read (HTTP ${res.status}).`);
		const rows = await res.json();
		for (const k of Object.keys(INDEX.recipes)) delete INDEX.recipes[k];
		records.clear();
		for (const r of rows) keep(r);
		// what was handed to this page by hand stays beside it, over a row of the same hash (the bench's guests)
		for (const r of handedRows.values()) keep(r);
		INDEX.engine = LATEST.v;
		Object.assign(catalog, { phase: 'ready', count: rows.length });
	} catch (e) {
		Object.assign(catalog, { phase: 'failed', error: String(e?.message ?? e) });
	}
	return catalog;
}

const keep = (r) => {
	const params = r.record?.card?.params;
	// its levels of detail as its card names them (./lodcard.js): a version from before the contract read as it drew
	const lod = lodOf(r.record?.card);
	INDEX.recipes[r.hash] = { group: r.group, id: r.id ?? r.slug, v: r.v, variant: r.variant, first: r.first, asset: r.asset, label: r.label, lod, ...(r.proposed ? { proposed: true } : {}), ...(params?.length ? { params } : {}) };
	records.set(r.hash, r.record);
	sizes.set(r.hash, r.size);
};

/**
 * A proposed version's builds (/api/intents/:id `review.builds`), held beside the accepted ones so the board can build it
 * before anyone decides; no sandbox names a proposed hash. @param {any[]} rows
 */
export async function admitProposed(rows) {
	await loadRecipes();
	for (const r of rows) keep({ ...r, proposed: true });
}

let loading = null;
/** play's catalog read now, even where recipes handed by hand stood in for it (the world bench with --play) */
export function readRecipes() {
	loading = load();
	return loading;
}

export function loadRecipes() {
	if (catalog.phase === 'failed') loading = null;
	return (loading ??= load());
}

/** What a world waits for before its first build: play's catalog and its sandbox's config (failure said on its loading screen). @param {string} [sandbox] */
export async function catalogReady(sandbox) {
	const [r] = await Promise.all([loadRecipes(), sandbox ? loadConfig(sandbox) : null]);
	if (r.phase !== 'ready') throw new Error(r.error || 'The asset catalog could not be loaded.');
	return r;
}

export const SLOT = /^pin:([a-z0-9][a-z0-9-]*)\/([a-zA-Z0-9][a-zA-Z0-9/-]*)(?:\?([^#\s]*))?$/;

/** @param {string} name @param {string} query */
export const withQuery = (name, query) => `${name}${name.includes('?') ? '&' : '?'}${query}`;

/** A pin by sandbox UUID (./sandboxes.js) and slot, with its values (`query`, as given). @param {string} sandbox @param {string} slot @param {string} [query] */
export const slotRef = (sandbox, slot, query = '') => `pin:${sandbox}/${slot}${query ? `?${query}` : ''}`;

/** A name as its build (a pin's values after its own); anything else refused. @param {string} name @returns {{ hash: string, params?: Record<string, string> }} */
export function resolve(name) {
	if (typeof name !== 'string') throw new NotInCatalog(`not a build: ${JSON.stringify(name)}`);
	const slot = SLOT.exec(name);
	if (!slot) {
		if (!BUILD_START.test(name)) throw new NotInCatalog(`${name}: an asset is named by its hash (a build, <hash>?values) or a sandbox's slot`);
		return parseBuild(name);
	}
	const [, sandbox, key, query = ''] = slot;
	const pins = configAt(configKey(sandbox, 'assets'));
	const pinned = pins && Object.hasOwn(pins, key) ? pins[key] : undefined;
	if (typeof pinned !== 'string') throw new NotInCatalog(`${name}: ${sandbox} pins no asset in slot ${key}`);
	return parseBuild(query ? withQuery(pinned, query) : pinned);
}

/** @param {string} name */
export function hashOf(name) {
	const { hash } = resolve(name);
	heldAt(hash);
	return hash;
}

/** @param {string} name */
export const paramsOf = (name) => resolve(name).params;

/** @param {string} name */
export const buildAt = (name) => {
	const { hash, params } = resolve(name);
	return buildOf(hash, params);
};

export const recipeInfo = (hash) => (typeof hash === 'string' && Object.hasOwn(INDEX.recipes, hash) ? INDEX.recipes[hash] : undefined);

export function heldAt(hash) {
	const at = recipeInfo(hash);
	if (at) return at;
	throw new NotInCatalog(
		catalog.phase === 'ready'
			? `no recipe ${String(hash).slice(0, 12)}… is in play's catalog`
			: `recipe ${String(hash).slice(0, 12)}… can't be built yet: ${catalog.error || "play's catalog is not loaded (loadRecipes)"}`
	);
}

/** a recipe's name as it is shown: its label and its version ("Goat: Saanen v2") */
export const nameOf = (hash) => {
	const at = recipeInfo(hash);
	return at ? `${at.label} v${at.v}` : `recipe ${String(hash).slice(0, 12)}…`;
};

export const cardOf = (hash) => (recipeInfo(hash) ? records.get(hash)?.card : undefined);

/** what a recipe's record declares (its manifest and contract), which ./load.js holds its builds to */
export const declaredOf = (hash) => {
	const r = recipeInfo(hash) ? records.get(hash) : undefined;
	return r ? { manifest: r.manifest, contract: r.contract } : undefined;
};

/** A recipe by its hash, from this device's cache or play, held to it. @param {string} hash @returns {Promise<{ hash: string, code: string }>} */
export async function recipeAt(hash) {
	// the pieces its manifest names go with it: the box reads them from play's files (./box/pieces.js)
	const pieces = records.get(hash)?.manifest?.pieces ?? [];
	// a recipe handed in by hand (the benches) takes every piece handed in beside it
	if (handed.has(hash)) return { hash, code: handed.get(hash), pieces: pieces.length ? pieces : handedPieces() };
	await loadRecipes();
	heldAt(hash);
	if ((sizes.get(hash) ?? 0) > MOST) throw new NotInCatalog(`${nameOf(hash)}: its file is larger than a page reads`);
	const unread = (status) => new NotInCatalog(`${nameOf(hash)}: its file could not be read (HTTP ${status})`);
	const bytes = await playFile(hash, unread);
	if (!bytes) throw unread(404);
	if (!holds(bytes, hash)) throw new NotInCatalog(`${nameOf(hash)}: its file does not hash to its name`);
	return { hash, code: new TextDecoder().decode(bytes), pieces };
}

/** the catalog as the asset viewer reads it (./VaultAsset.svelte) */
export const source = { index: INDEX, recipeAt, nameOf, hashOf, cardOf };

/** a plant version's record (`plant`): Latin name, layer, origin, note, stages; undefined for anything else */
export const plantOf = (hash) => (recipeInfo(hash) ? records.get(hash)?.plant : undefined);

const handed = new Map();
/** and their rows, kept over play's catalog when it is read after them */
const handedRows = new Map();
/**
 * Recipes handed to this page by hand (the render bench's guests), held to their hashes, for this page alone.
 * @param {{ hash: string, code: string, group: string, id: string, v: number, variant?: string | null, label: string, params?: any[], card?: any }[]} rows
 */
export function admitHanded(rows) {
	for (const r of rows) {
		if (hashText(r.code) !== r.hash) throw new Error(`refused: the recipe handed as ${String(r.hash).slice(0, 12)}… hashes otherwise`);
		handed.set(r.hash, r.code);
		const row = { hash: r.hash, group: r.group, id: r.id, v: r.v, variant: r.variant ?? null, label: r.label, record: { card: r.card ?? { params: r.params ?? [] } }, size: r.code.length };
		handedRows.set(r.hash, row);
		keep(row);
	}
	if (catalog.phase !== 'ready') {
		Object.assign(catalog, { phase: 'ready', count: Object.keys(INDEX.recipes).length, error: '' });
		loading = Promise.resolve(catalog);
	}
}
