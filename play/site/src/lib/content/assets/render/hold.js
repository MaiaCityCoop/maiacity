// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT A KIND KEEPS IN THE PAGE — the one rule by which the renderer (./index.js) lets go of a level of a kind: its
 * drawings, the graphics card's copy of its corners, and its arrays in the page (intent 1893a631: every kind's full
 * build was kept for good, in the page and on the card, 1.1 GB of Sandbox 1 each, most of it trees no copy stood near).
 *
 * A level is let go of only when it comes back for nothing: a made one is read from this device's cache or made again
 * from the kind's build, a built one only where the cache keeps it. Never one kept whole for its controls (a posed
 * copy is a tree copied from it), one drawn as another, or one with no drawings.
 *
 * A kind's coarsest build (`base`: the one its other levels are made from, and its measure and picture taken from) is
 * let go of too where it is the kind's full build with lighter levels made from it (a kind whose levels are derived),
 * once every one of those stands on drawings of its own and its picture is taken, and no copy stands at the level next
 * to it either. It is never swapped for a lighter shape before your eyes: a copy drawn at that next level asks for it
 * back at once (`ahead`), so it is read from the cache while you are still a band away, and is there when you arrive.
 * A recipe's own coarsest level stays: it is light, and all its copies far away are drawn at it.
 */

/** how long (ms) no copy must have been drawn at a kind's full build before it is let go of, on every device */
export const FULL_AFTER = 15_000;

/** whether a kind's levels are made from its one build (../lodcard.js: derived), not built each from its recipe */
export const derived = (k) => k.names.length === 1 && k.levels.length > 1;

/**
 * Whether level `L` of kind `k` may be let go of now (see above): `now` and each level's `seen` (when a copy was last
 * drawn at it) by the same clock.
 * @param {{ names: string[], base: number, picture?: boolean, slot?: any, levels: { state: string, name?: string | null, kept?: boolean, obj?: any, as: number, meshes?: any[] | null, seen?: number }[] }} k
 * @param {number} L @param {number} [now]
 */
export function mayLetGo(k, L, now = performance.now()) {
	const lv = k.levels[L];
	if (!lv || lv.state !== 'ready' || lv.obj || lv.as >= 0 || !lv.meshes?.length) return false;
	// one built from its recipe only where this device's cache holds it: built again, it would cost what letting go saves
	if (lv.name && !lv.kept) return false;
	if (L !== k.base) return true;
	if (!derived(k) || (k.picture !== false && !k.slot)) return false;
	// a copy at the level next to it is a walk away from wanting it
	if (now - (k.levels[L + 1]?.seen || -Infinity) < FULL_AFTER) return false;
	return k.levels.every((other, j) => j === L || (other.state === 'ready' && other.as < 0));
}

/**
 * The level a copy drawn at `L` wants here ahead of time: a kind's full build, when `L` is the level next to it and it
 * was let go of; else -1. @returns {number}
 */
export const ahead = (k, L) => (derived(k) && L === k.base + 1 && k.levels[k.base]?.state === 'idle' ? k.base : -1);

/**
 * After how long (ms) unseen level `L` of `k` is let go of: its full build `FULL_AFTER` on every device, any other
 * level the device's budget's `evict` (0: never). @param {number} evict
 */
export const letGoAfter = (k, L, evict) => (L === k.base ? (derived(k) ? FULL_AFTER : 0) : evict);

/** A level as it stands once let go of: asked for again (`idle`) by the next copy that wants it. */
export const LET_GO = Object.freeze({ state: 'idle', level: null, meshes: null, mats: null, promise: null, released: false, kept: false, as: -1, from: undefined, seen: 0 });
