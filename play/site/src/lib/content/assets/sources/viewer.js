// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * AN ASSET AS ITS VIEWER SHOWS IT — a build of one of play's recipes for the asset viewer (../VaultAsset.svelte) and the
 * Worlds page (../../worlds/view.js), made the one way a page makes a build (../load.js): its recipe's file read first,
 * from play's files and held to its hash, so what play lacks fails even where this device has built it before; then
 * this device's cache, else the box, on the engine its card names and held to its manifest and contract.
 */
import { buildOf } from '../../../kernel/builds.js';
import { NotInCatalog, declaredOf } from '../catalog.js';
import * as cache from '../cache/builds.js';
import { boxOf, cached, engineOf, heldTo, keyOf, kept, open } from '../load.js';
import { valuesOf } from '../params.js';

/** a build's name (../../../kernel/builds.js `buildOf`), as ../VaultAsset.svelte (held) imports it from here */
export { buildOf as buildName };

/** a value an object holds of its own, never one it inherits @param {Record<string, any>} o @param {string} k */
const own = (o, k) => (Object.hasOwn(o, k) ? o[k] : undefined);

/** the reason in an error, after the recipe's name */
const labelled = (label, e) => new Error(`${label}: ${e instanceof Error ? e.message : String(e)}`);

/**
 * A build of one of play's recipes (`hash`, with the values `given` as text, its own where not given): its file first
 * (`source.recipeAt`, which throws NotInCatalog naming it), then this device's cache under the build's key, else the
 * box (a box of the engine its card names, where `box` runs another). Checked either way (../load.js `open`).
 * @param {typeof import('../catalog.js').source} source play's recipes
 * @param {string} hash @param {Record<string, string>} [given]
 * @param {{ box: import('../box/host.js').AssetBox, store?: Pick<typeof cache, 'get' | 'put' | 'drop'>, keep?: boolean, phase?: (step: 'file' | 'cache' | 'build') => void }} o
 *   the box it builds in, the cache (this device's), and whether the cache is read and kept to
 * @returns {Promise<{ obj: any, card: any, data: any, from: 'cache' | 'box', name: string, label: string,
 *   recipe: { hash: string, code: string }, values: Record<string, number | string> | undefined,
 *   given: Record<string, string> | undefined, stored: Promise<boolean> }>}
 */
export async function vaultBuild(source, hash, given = {}, { box, store = cache, keep = true, phase = () => {} }) {
	const at = typeof hash === 'string' ? own(source.index.recipes, hash) : undefined;
	if (!at) throw new NotInCatalog(`no recipe ${String(hash).slice(0, 12)}… is in the Maia City vault`);
	const asked = Object.keys(given).length ? given : undefined;
	if (asked && !at.params?.length) throw new Error(`${at.label} takes no parameters`);
	let values;
	try {
		values = at.params?.length ? valuesOf(at.params, given) : undefined;
	} catch (e) {
		throw labelled(at.label, e);
	}
	phase('file');
	const recipe = await source.recipeAt(hash);
	const name = buildOf(hash, values);
	let engine, timeout, key;
	try {
		engine = engineOf(hash);
		timeout = heldTo(recipe.code, declaredOf(hash), engine);
		key = keyOf(name);
	} catch (e) {
		throw labelled(at.label, e);
	}
	const text = values && Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)]));
	const said = { name, label: at.label, recipe, values, given: text };
	if (keep) {
		phase('cache');
		const hit = await cached(store, key, hash, at.label);
		if (hit) {
			const { read, ...got } = hit;
			return { ...got, ...said, from: 'cache', stored: Promise.resolve(true) };
		}
	}
	let built;
	phase('build');
	try {
		built = await (box.engine === engine.v ? box : boxOf(engine.v)).build(recipe, text, { timeout });
	} catch (e) {
		throw new Error(`${at.label}: the box could not build it (${e instanceof Error ? e.message : String(e)})`);
	}
	const got = open(built, hash, at.label);
	return { ...got, ...said, from: 'box', stored: keep ? kept(store, key, built) : Promise.resolve(false) };
}
