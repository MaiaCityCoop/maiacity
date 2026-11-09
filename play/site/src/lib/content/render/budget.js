/*
 * THE DEVICE'S BUDGET — how much a world may hold on the device it is opened on. A phone's browser keeps a page, its
 * frames and every worker it starts in one process, and ends that process when it holds too much ("A problem
 * repeatedly occurred", Samuel's iPhone in Sandbox 5 and Sandbox 1, 2026-11-06: measured 2.5 GB while loading, 1.6 GB
 * of it the asset boxes' workers, and as much on a desktop: nothing was sized by the device). Every world draws from
 * this one budget at the layers they share (the asset boxes, the asset renderer and its pictures, the sky, the
 * device's cache), so none needs its own rule:
 *
 * - builds: how many recipes are built at once in the whole page, whatever the boxes asked for (each build's worker
 *   holds three.js, the recipe and what it is building, up to 170 MB for a tree at its finest)
 * - boxes: how many boxes one renderer of assets starts (each a frame of workers of its own)
 * - rooms: how many recipes' workers a box keeps between builds; spare: whether it makes one ahead
 * - idle: how long (ms) a box with nothing to do keeps its workers before it lets them go (it starts again for the
 *   next build; 0: as long as it lives)
 * - reads: how many builds are read from the device's cache at once (each whole in memory while it is unpacked)
 * - shadowMap: the most pixels a side the sun's shadow map has (three makes a colour and a depth texture of it: 128 MB
 *   at 4096, 32 MB at 2048)
 * - picture: each far kind's picture, `views` × `views` views (../assets/render/impostors.js) of `px` pixels a side, on
 *   pages of `page` pixels a side
 * - texture: the most pixels a side a build's own picture (a bark, a cloth, a label) is kept at
 * - evict: after how long (ms) a shape no copy was drawn at is let go of, its graphics card's copy too (0: never); it is
 *   read again from the device's cache when a copy comes near it again
 * - release: whether what is drawn lets go of its corners in the page once the graphics card has them (a phone holds
 *   both in one memory: two copies of every shape), where nothing reads them again (`dropOnUpload`)
 *
 * A small device is a phone or a tablet (every iPhone and iPad, which keeps WebGL, workers and the page in one budget
 * of memory; any touch screen under 1100 px), or one that says it has little memory. Not one with few cores: Safari
 * says 4 on every Mac with fewer than 8, whatever its memory. `?budget=small` or `?budget=full` in the page's address
 * picks one by hand, to check a world as a phone would hold it.
 */

/** whether this is an iPhone, an iPad (iPadOS calls itself a Mac, but has a touch screen) or an iPod */
export function appleTouch() {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent ?? '';
	return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
}

/** whether the page is opened on a small device (see above), or told to be held as one */
export function smallDevice() {
	if (typeof window === 'undefined') return false;
	const asked = new URLSearchParams(window.location?.search ?? '').get('budget');
	if (asked === 'small') return true;
	if (asked === 'full') return false;
	const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
	const small = Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0) < 1100;
	const memory = /** @type {Navigator & { deviceMemory?: number }} */ (navigator).deviceMemory;
	return appleTouch() || (touch && small) || (memory ?? 8) <= 4;
}

/**
 * @typedef {{ small: boolean, builds: number, boxes: number, rooms: number, spare: boolean, idle: number, reads: number,
 *   shadowMap: number, picture: { px: number, page: number, views: number }, texture: number, evict: number, release: boolean }} Budget
 */

/** @returns {Budget} the budget for a device, small or not */
export function budgetFor(small, cores = 8) {
	return small
		? { small: true, builds: 2, boxes: 1, rooms: 1, spare: false, idle: 4000, reads: 4, shadowMap: 2048, picture: { px: 40, page: 1280, views: 6 }, texture: 1024, evict: 15000, release: true }
		: { small: false, builds: Math.max(2, Math.min(8, cores - 1)), boxes: 6, rooms: 4, spare: true, idle: 0, reads: 16, shadowMap: 4096, picture: { px: 64, page: 2048, views: 8 }, texture: 4096, evict: 0, release: false };
}

/** @type {Budget | null} */
let held = null;

/** This device's budget: decided once a page. @returns {Budget} */
export function budget() {
	return (held ??= budgetFor(smallDevice(), (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4));
}

/* ── the builds at once, in the whole page ── */
let building = 0;
/** @type {(() => void)[]} */
const waiting = [];

/**
 * A turn to build: resolves once fewer than the budget's `builds` are building in the page, with the function that
 * gives the turn back (call it once, when the build is done or failed).
 * @returns {Promise<() => void>}
 */
export function buildTurn() {
	return new Promise((ok) => {
		const go = () => {
			building++;
			let back = false;
			ok(() => {
				if (back) return;
				back = true;
				building--;
				waiting.shift()?.();
			});
		};
		if (building < budget().builds) go();
		else waiting.push(go);
	});
}

/* ── what is drawn, its corners let go once the graphics card has them ── */
/** whether anything let go of its corners: a lost graphics context cannot be given them again (the world is opened anew) */
export const released = { any: false };

/**
 * Lets go of an attribute's array in the page once it is uploaded to the graphics card (the budget's `release`; on a
 * device that keeps both, nothing is done). Its count, size and buffer stay; its array becomes an empty one of its kind,
 * so whatever reads it later finds nothing rather than failing. Only for a shape nothing reads again (not one walked
 * on, measured, picked, lowered or cached from this array: the cache keeps its own reference to its data).
 * @param {import('three').BufferAttribute | null | undefined} a
 */
export function dropOnUpload(a) {
	if (!budget().release || !a?.isBufferAttribute || /** @type {any} */ (a).isInterleavedBufferAttribute || !a.array?.length) return;
	const before = a.onUploadCallback;
	a.onUpload(function () {
		before?.call(this);
		const array = /** @type {any} */ (a.array);
		/** @type {any} */ (a).array = new array.constructor(0);
		released.any = true;
	});
}

/**
 * A page drawing on `canvas` opened anew when the graphics card gives its context back after taking it (the app sent to
 * the background), if anything let go of what it would have to upload again (`released`): drawn without it, shapes and
 * pictures would be missing. Every renderer of the app is made by ./core.js `createRenderer`, which calls this.
 * @param {HTMLCanvasElement} canvas
 */
export function reopenOnRestore(canvas) {
	canvas.addEventListener?.('webglcontextrestored', () => released.any && location.reload());
}
