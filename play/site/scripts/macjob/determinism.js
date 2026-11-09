// The Mac render box's determinism, once for every Mac job and the census (intent 373050d1; kept here since intent
// cb52fbd9, before on the side branch intent-work/main-baseline-render): two things made the far view and the old
// city differ between two runs of the same commit, so SSIM measured the run, not the change.
//
// 1. SEEDED_RANDOM, an init script: Math.random is a fixed sequence (mulberry32, one seed) in every page and frame, so
//    the old city's visitor ($lib/character.ts randomCharacter, chosen at load) and every other random choice repeat.
// 2. QUIET, the body of a `building()` probe: a view counts as settled only when nothing is being built, no picture is
//    still being kept (read back or written), and no new picture was taken since the last poll. The far trees'
//    pictures are photographed after the builds finish (assets/render/impostors.js), so `building` alone let one run
//    shoot shapes and the next pictures.
//
// Use: `await page.addInitScript({ content: SEEDED_RANDOM })` before the first goto, and poll `page.evaluate(QUIET)`
// every 2 s until it returns 0 (null while the world has no __assets yet).
export const SEEDED_RANDOM = `(() => { let s = 0x2545f491; Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

export const QUIET = `(() => {
	const s = window.__assets?.stats?.();
	if (!s) return null;
	const parts = ['out', 'in', 'library'].map((k) => s[k]).filter(Boolean);
	const all = parts.length ? parts : [s];
	const busy = all.reduce((a, p) => a + (p.building ?? 0) + (p.keeping ?? 0), 0);
	const taken = all.reduce((a, p) => a + (p.taken ?? 0), 0);
	const changed = window.__quietTaken !== taken;
	window.__quietTaken = taken;
	return busy + (changed ? 1 : 0);
})()`;
