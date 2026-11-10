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
 * once every one of those stands on drawings of its own and its picture is taken: until a copy comes near enough to
 * be drawn at it, when the renderer asks for it again, as for any level, and the cache hands it back. A recipe's own
 * coarsest level stays: it is light, and all its copies far away are drawn at it.
 */

/** how long (ms) no copy must have been drawn at a kind's full build before it is let go of, on every device */
export const FULL_AFTER = 15_000;

/** whether a kind's levels are made from its one build (../lodcard.js: derived), not built each from its recipe */
export const derived = (k) => k.names.length === 1 && k.levels.length > 1;

/**
 * Whether level `L` of kind `k` may be let go of now (see above).
 * @param {{ names: string[], base: number, picture?: boolean, slot?: any, levels: { state: string, name?: string | null, kept?: boolean, obj?: any, as: number, meshes?: any[] | null }[] }} k
 * @param {number} L
 */
export function mayLetGo(k, L) {
	const lv = k.levels[L];
	if (!lv || lv.state !== 'ready' || lv.obj || lv.as >= 0 || !lv.meshes?.length) return false;
	// one built from its recipe only where this device's cache holds it: built again, it would cost what letting go saves
	if (lv.name && !lv.kept) return false;
	if (L !== k.base) return true;
	if (!derived(k) || (k.picture !== false && !k.slot)) return false;
	return k.levels.every((other, j) => j === L || (other.state === 'ready' && other.as < 0));
}

/**
 * After how long (ms) unseen level `L` of `k` is let go of: its full build `FULL_AFTER` on every device, any other
 * level the device's budget's `evict` (0: never). @param {number} evict
 */
export const letGoAfter = (k, L, evict) => (L === k.base ? (derived(k) ? FULL_AFTER : 0) : evict);

/** A level as it stands once let go of: asked for again (`idle`) by the next copy that wants it. */
export const LET_GO = Object.freeze({ state: 'idle', level: null, meshes: null, mats: null, promise: null, released: false, kept: false, as: -1, from: undefined, seen: 0 });
