/**
 * The way back, the nav pill's ($lib/app/NavPill.svelte): no page has its own. It goes up to the dashboard, but while a
 * page has something open over itself (a city, a dome's inside) it closes that first: the page calls `wayBack(label, go)`
 * while open and what it gets back once closed; the last opened is the first closed.
 */
import { base } from '$app/paths';
import { untrack } from 'svelte';

/** @typedef {{ label: string, go: () => void }} Way */

/** @type {Way[]} */
let ways = $state.raw([]);

/** what is open over the page, if anything: the way back closes it */
export const back = {
	get open() {
		return ways.at(-1) ?? null;
	}
};

/** Something open over the page, closed first by the way back (untracked: called from an effect, it must not make that
 * effect depend on the list it changes). @param {string} label what it says, e.g. 'Back to the planet'
 * @param {() => void} go closes it @returns {() => void} it has closed */
export function wayBack(label, go) {
	const way = { label, go };
	untrack(() => (ways = [...ways, way]));
	return () => untrack(() => (ways = ways.filter((w) => w !== way)));
}

/**
 * The place above a page by its path (without the base): the dashboard, which has none. With no Home in the pill (Samuel
 * 2026-11-05: the proposals' star took its place), Back leads there from everywhere.
 * @param {string} rel @param {string} [hash] @returns {{ href: string, label: string } | null}
 */
export function upFrom(rel, hash = '') {
	if (/^\/?$/.test(rel)) return null;
	return { href: `${base}/`, label: 'Back to the dashboard' };
}
