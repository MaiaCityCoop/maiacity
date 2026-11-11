/*
 * WHEN A WORLD HAS SETTLED — the one rule every check waiting on a world uses (intent 7af6e162): the census
 * (../census/run.ts), the Mac's jobs (../mac-page.mjs, ../selector-shots.mjs) and the render box's. Settled: its asset
 * renderers (`__assets.stats()`) build and keep nothing (no picture read back, no file waiting), no dome's inside builds
 * (`__domeStream`), no pipeline compiles (`__pipelinesPending`), and copies, pictures and domes are as at the last look.
 *
 * `quietness(w)` is self-contained (Playwright sends its source): how much of window `w` still moves, 0 when nothing,
 * null before its renderers; each look kept on `w.__quiet`, the caller deciding how long 0 holds (the census 60 frames, a Mac job two looks 2 s apart).
 *
 * @param {any} [w] the page's window (globalThis: the census's, or the page's where Playwright runs it)
 * @returns {number | null}
 */
export function quietness(w = globalThis) {
	const s = w.__assets?.stats?.();
	if (!s) return null;
	const rs = ['out', 'in', 'library'].map((k) => s[k]).filter(Boolean);
	const domes = (w.__domeStream?.states?.() ?? []).map((e) => e.state);
	// and no pipeline is being compiled beside the page (what the walker meets is drawn once it is: render/making.js)
	const busy = rs.reduce((a, r) => a + (r.building ?? 0) + (r.keeping ?? 0), 0) + domes.filter((d) => d === 'building').length + (w.__pipelinesPending?.() ?? 0);
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
