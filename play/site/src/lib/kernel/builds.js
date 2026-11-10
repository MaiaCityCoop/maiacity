// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A BUILD BY ITS NAME — the recipe's BLAKE3 hash (./hash.js) and its values sorted, `<hash>?seed=maia&stage=9`, wherever
 * the recipe is kept; nothing reads an index, and play's catalog (../content/assets/catalog.js) names builds the same
 * way. The one grammar of a build's name: every reader takes it from here.
 */
import { HEX } from './hash.js';

/** a build's name, its hash and its query */
const BUILD = new RegExp(`^(${HEX})(?:\\?(.*))?$`);
/** what starts as a build's name: a hash, alone or before its query */
export const BUILD_START = new RegExp(`^${HEX}(\\?|$)`);
/** the shape of a parameter's id, the same as the card's keys */
const KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

/** A ref's query: its values sorted by id as text (`seed=maia&stage=9`), the same values always alike; empty for none. @param {Record<string, unknown> | undefined} values */
export function queryOf(values) {
	if (!values) return '';
	const q = new URLSearchParams();
	for (const k of Object.keys(values).sort()) q.append(k, String(values[k]));
	return q.toString();
}

/**
 * The values a ref's query names, as text; undefined for none; throws for an id out of shape or named twice.
 * @param {string | undefined} query @returns {Record<string, string> | undefined}
 */
function paramsIn(query) {
	if (!query) return undefined;
	/** @type {Record<string, string>} */
	const out = {};
	for (const [k, v] of new URLSearchParams(query)) {
		if (!KEY.test(k)) throw new Error(`not a parameter: ${k.slice(0, 40)}`);
		if (Object.hasOwn(out, k)) throw new Error(`parameter ${k} named twice`);
		out[k] = v;
	}
	return Object.keys(out).length ? out : undefined;
}

/** A build's name as its parts (hash, values as text); anything else throws: an asset is named by its hash. @param {string} ref @returns {{ hash: string, params?: Record<string, string> }} */
export function parseBuild(ref) {
	const m = BUILD.exec(ref);
	if (!m) throw new Error(`not a build: ${String(ref).slice(0, 80)} (a recipe's hash, then ?its=values)`);
	const params = paramsIn(m[2]);
	return { hash: m[1], ...(params && { params }) };
}

/** A build's name: a recipe's hash and the values, sorted. @param {string} hash @param {Record<string, unknown>} [values] */
export const buildOf = (hash, values) => {
	const q = queryOf(values);
	return q ? `${hash}?${q}` : hash;
};
