/*
 * WHEN A WORLD HAS SETTLED — the one rule every check that waits on a world uses (intent 7af6e162): the census on the
 * CPU (../census/run.ts), the Mac's jobs (../mac-page.mjs, ../selector-shots.mjs) and the render box's. A world is
 * settled when its asset renderers (`__assets.stats()`: Sandbox 1's out, in and library) build nothing and keep
 * nothing (no picture being read back, no file waiting to be written), no dome's inside is building (`__domeStream`,
 * where the page shows it), and their copies, the pictures they took and the domes are as they were at the last look.
 *
 * `quietness(w)` is self-contained (Playwright sends its source to the page): the window to look at, its answer how
 * much is still moving — 0 when nothing is; null before the world has its renderers. Each look remembers what it saw
 * on `w.__quiet`, so the caller decides how long 0 must hold: the census 60 frames on end, a Mac job two looks 2 s apart.
 *
 * @param {any} [w] the page's window (globalThis: the census's, or the page's where Playwright runs it)
 * @returns {number | null}
 */
export function quietness(w = globalThis) {
	const s = w.__assets?.stats?.();
	if (!s) return null;
	const rs = ['out', 'in', 'library'].map((k) => s[k]).filter(Boolean);
	const domes = (w.__domeStream?.states?.() ?? []).map((e) => e.state);
	const busy = rs.reduce((a, r) => a + (r.building ?? 0) + (r.keeping ?? 0), 0) + domes.filter((d) => d === 'building').length;
	const seen = JSON.stringify([rs.map((r) => [r.copies, r.taken]), domes]);
	const moved = w.__quiet !== seen;
	w.__quiet = seen;
	return busy + (moved ? 1 : 0);
}

/** the pictures the asset renderers have taken since the page opened (`__assets.stats()`'s `taken`), or null */
export function taken(w = globalThis) {
	const s = w.__assets?.stats?.();
	return s ? ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.taken ?? 0), 0) : null;
}
