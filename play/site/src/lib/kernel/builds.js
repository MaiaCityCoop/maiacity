// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A BUILD BY ITS NAME — what a build is named by wherever its recipe is kept: the recipe's hash, the BLAKE3 hash of its
 * bytes (./hash.js), and the values it is built with, sorted, `<hash>?seed=maia&stage=9`. Nothing here reads an index:
 * play's catalog (../content/assets/catalog.js) names its builds the same way, so the same bytes are the same build
 * anywhere. The one grammar of a build's name: every reader of one takes it from here.
 */
import { HEX } from './hash.js';

/** a build's name, its hash and its query */
const BUILD = new RegExp(`^(${HEX})(?:\\?(.*))?$`);
/** what starts as a build's name: a hash, alone or before its query */
export const BUILD_START = new RegExp(`^${HEX}(\\?|$)`);
/** the shape of a parameter's id, the same as the card's keys */
const KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

/**
 * The query of a ref: its parameters, sorted by id, as text (`seed=maia&stage=9`), so the same values always read the
 * same; empty for none.
 * @param {Record<string, unknown> | undefined} values
 */
export function queryOf(values) {
	if (!values) return '';
	const q = new URLSearchParams();
	for (const k of Object.keys(values).sort()) q.append(k, String(values[k]));
	return q.toString();
}

/**
 * The parameters a ref's query names, as text; undefined for none. Throws for an id out of shape or one named twice.
 * @param {string | undefined} query
 * @returns {Record<string, string> | undefined}
 */
export function paramsIn(query) {
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

/**
 * A build's name as its parts: the recipe's hash and the values, as text. Throws for anything else: an asset is named by its hash.
 * @param {string} ref @returns {{ hash: string, params?: Record<string, string> }}
 */
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
