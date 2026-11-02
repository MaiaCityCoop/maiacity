/**
 * The way back, the one in the nav pill ($lib/app/NavPill.svelte): no page has a back button of its own.
 *
 * By default it goes up a place: an asset's page to the library, anything else to the dashboard, which shows them all. While a page has something
 * open over itself (a city on the planet, the inside of a dome, the island's sandbox), the way back closes that
 * first: the page calls `wayBack(label, go)` while it is open, and calls what it gets back once it has closed. The
 * last one opened is the first one closed.
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

/**
 * Something is open over the page: until it closes, the way back closes it.
 * (untracked: called from an effect, it must not make that effect depend on the list it changes)
 * @param {string} label what the way back says, e.g. 'Back to the planet'
 * @param {() => void} go closes it
 * @returns {() => void} it has closed
 */
export function wayBack(label, go) {
	const way = { label, go };
	untrack(() => (ways = [...ways, way]));
	return () => untrack(() => (ways = ways.filter((w) => w !== way)));
}

/**
 * The place above a page, by its path (without the base): an asset's own page goes back to the library, everything
 * else (a sandbox, the library, proposals, the game, admin) to the dashboard, which has none.
 * @param {string} rel
 * @param {string} [hash]
 * @returns {{ href: string, label: string } | null}
 */
export function upFrom(rel, hash = '') {
	if (/^\/?$/.test(rel)) return null;
	if (/^\/assets\/.+/.test(rel)) return { href: `${base}/assets/`, label: 'Back to the assets' };
	return { href: `${base}/`, label: 'Back to the dashboard' };
}

/** Whether the dashboard itself is shown (play's dashboard has no views in its hash). @param {string} hash */
export const onDashboard = (hash) => /^#?$/.test(hash);
