// @ts-nocheck — plain JS, runs in the page
/*
 * SHORT OF MEMORY, SAID (intent 1893a631) — a browser that ends a page for the memory it holds (Safari: "This webpage
 * was reloaded because it was using significant memory") tells the page nothing: it is simply loaded again, and would
 * do the same again. So a world leaves a note in the tab's session storage while it loads, and takes it away once it
 * has settled or the page is left by the person (`pagehide`: a page ended for memory never hears it). A load that
 * finds the note knows the load before it was ended:
 *
 * - once: it opens lighter (the small device's budget, ./budget.js `lighter`) and says so;
 * - twice in a row: it says so and loads no world by itself (the page shows what it has: its bar, its cards), so a
 *   page is never loaded and ended in a loop. A reload by the person tries again, lighter.
 *
 * A visit that settled starts clean. Where the tab keeps no session storage, nothing is noted and every load is a first.
 */

const KEY = 'play.world.loading';

/** how long (ms) after its world is shown a page counts as settled: the far plants have grown in behind */
export const SETTLED_AFTER = 90_000;

export const LIGHTER = 'This device ran short of memory for this world: it is shown lighter.';
export const STOPPED = 'This device ran short of memory for this world twice. Reload the page to try once more.';

const read = (storage) => {
	try {
		const note = JSON.parse(storage.getItem(KEY) ?? 'null');
		return note && typeof note === 'object' && typeof note.route === 'string' && Number.isInteger(note.ended) ? note : null;
	} catch {
		return null;
	}
};
const write = (storage, note) => {
	try {
		if (note) storage.setItem(KEY, JSON.stringify(note));
		else storage.removeItem(KEY);
	} catch {
		// (no storage in this tab: nothing is noted)
	}
};

/**
 * A world of `route` begins to load: how often in a row its load was ended (`ended`), whether it opens lighter, whether
 * it loads at all (`stop`), and what to say (`message`, '' for nothing).
 * @param {string} route @param {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null | undefined} storage
 */
export function begin(route, storage) {
	const first = { ended: 0, lighter: false, stop: false, message: '' };
	if (!storage) return first;
	const note = read(storage);
	const ended = note?.route === route ? note.ended + (note.loading ? 1 : 0) : 0;
	if (ended >= 2) {
		// said, and no load: the person's reload is one more try, lighter
		write(storage, { route, ended: 1, loading: false });
		return { ended, lighter: true, stop: true, message: STOPPED };
	}
	write(storage, { route, ended, loading: true });
	return ended ? { ended, lighter: true, stop: false, message: LIGHTER } : first;
}

/** The world has settled, or the page is left: the note is taken away. @param {Pick<Storage, 'removeItem'> | null | undefined} storage */
export function end(storage) {
	if (storage) write(storage, null);
}

/** this tab's session storage, or null where it has none */
export function tabStorage() {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

/**
 * A page's world begins to load: `begin` for this page's route in this tab, the budget made the small device's where
 * it opens lighter, and the note taken away when the page is left. Gives `begin`'s answer with `shown()`, to call once
 * the world is shown (the note goes `SETTLED_AFTER` later), and `leave()`, to call when the page's world is disposed.
 * @param {{ lighter: () => void }} budget ./budget.js
 */
export function arrive(budget, route = location.pathname, storage = tabStorage()) {
	const at = begin(route, storage);
	if (at.lighter) budget.lighter();
	let timer = 0;
	const done = () => end(storage);
	if (!at.stop) addEventListener('pagehide', done);
	return {
		...at,
		shown: () => void (timer = setTimeout(done, SETTLED_AFTER)),
		leave() {
			clearTimeout(timer);
			removeEventListener('pagehide', done);
			if (!at.stop) done();
		}
	};
}
