/**
 * The app's dock (the nav pill and what floats over it, ../../../routes/+layout.svelte) kept at the foot of what is
 * seen (Samuel 2026-11-04: on the iPad it sometimes floated up the page and stayed there).
 *
 * The dock is `position: fixed; bottom: var(--nav-foot)` (../../../app.css), placed against the browser's layout
 * viewport. In a web app on the home screen, and in Split View beside another app, iPadOS can leave that viewport
 * shorter than the window after a keyboard has come and gone (this app's, or the other app's beside it) or after the
 * split was dragged: the dock then sits where that shorter viewport ends, high up the page, until something makes the
 * browser measure again. The visual viewport (`window.visualViewport`) is what is really on screen. So after each
 * such moment the dock is measured where it stands and moved, by a transform, back to `--nav-foot` above the bottom
 * of what is seen; where nothing is wrong (every desktop, almost always) the shift is 0 and nothing is set.
 *
 * Never pulled up over a keyboard opened for a field of this page (the dock stays under it, as the browser keeps it),
 * and left alone while the page is pinch-zoomed (the visual viewport then pans over the page on purpose).
 */

/**
 * The shift (px, down when positive) that puts the dock's foot `gap` above the bottom of what is seen.
 * @param {{ naturalBottom: number, visibleBottom: number, gap: number, scale?: number, typing?: boolean }} at
 *   naturalBottom: where the dock's foot stands without any shift (client px); visibleBottom: the bottom of the
 *   visual viewport in the same coordinates (its offsetTop + height); gap: the dock's own distance from the bottom;
 *   scale: the visual viewport's pinch zoom; typing: a field of this page has the focus (its keyboard may be up)
 */
export function shiftFor({ naturalBottom, visibleBottom, gap, scale = 1, typing = false }) {
	if (!(Number.isFinite(naturalBottom) && Number.isFinite(visibleBottom) && Number.isFinite(gap))) return 0;
	if (scale > 1.01) return 0;
	const shift = Math.round(visibleBottom - gap - naturalBottom);
	if (Math.abs(shift) < 1) return 0;
	if (shift < 0 && typing) return 0;
	return shift;
}

/** a field of this page has the focus: its own keyboard may be up */
const typing = () => {
	const a = /** @type {HTMLElement | null} */ (document.activeElement);
	return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
};

/**
 * Svelte action for the dock: measures it after every moment the viewport may have changed and moves it back to the
 * foot of what is seen.
 * @param {HTMLElement} node
 */
export function pinned(node) {
	const vv = typeof window === 'undefined' ? null : window.visualViewport;
	if (!vv) return {};
	let shift = 0;
	let raf = 0;
	/** @type {ReturnType<typeof setTimeout>[]} */
	let timers = [];
	const place = () => {
		raf = 0;
		const rect = node.getBoundingClientRect();
		const next = shiftFor({
			naturalBottom: rect.bottom - shift,
			visibleBottom: vv.offsetTop + vv.height,
			gap: parseFloat(getComputedStyle(node).bottom) || 0,
			scale: vv.scale,
			typing: typing()
		});
		if (next === shift) return;
		shift = next;
		node.style.transform = shift ? `translateY(${shift}px)` : '';
	};
	const soon = () => {
		if (!raf) raf = requestAnimationFrame(place);
	};
	// a keyboard and a rotation animate: measured again as they settle
	const settled = () => {
		soon();
		timers.forEach(clearTimeout);
		timers = [150, 400, 800].map((ms) => setTimeout(soon, ms));
	};
	const passive = { passive: true };
	vv.addEventListener('resize', soon);
	vv.addEventListener('scroll', soon);
	window.addEventListener('resize', settled);
	window.addEventListener('scroll', soon, passive);
	window.addEventListener('orientationchange', settled);
	window.addEventListener('pageshow', settled);
	document.addEventListener('focusout', settled);
	document.addEventListener('focusin', settled);
	document.addEventListener('visibilitychange', settled);
	soon();
	return {
		destroy() {
			vv.removeEventListener('resize', soon);
			vv.removeEventListener('scroll', soon);
			window.removeEventListener('resize', settled);
			window.removeEventListener('scroll', soon);
			window.removeEventListener('orientationchange', settled);
			window.removeEventListener('pageshow', settled);
			document.removeEventListener('focusout', settled);
			document.removeEventListener('focusin', settled);
			document.removeEventListener('visibilitychange', settled);
			cancelAnimationFrame(raf);
			timers.forEach(clearTimeout);
			node.style.transform = '';
		}
	};
}
