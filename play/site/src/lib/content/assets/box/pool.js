// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE PAGE'S POOL OF ASSET BOXES — the one place a build finds its box (intent 08d00b84). Every build a page asks for
 * (a world's plants, a crowd's actors, a viewer's levels, whichever renderer asks) waits in the page's one line of
 * turns (../../render/turns.js: the most wanted first, a build before a level) and is built in a box that is free: as
 * many boxes as the page has turns (../../render/budget.js `builds`: every core but one on a desktop, two on a
 * phone), each a frame and workers of its own (./host.js), started only as a build takes it.
 *
 * A build is its recipe's alone: the box hands a worker the recipe's file (its pieces before it, each held to its hash),
 * its values and nothing else, so the same recipe gives the same build in whichever box it lands, and what comes back
 * is moved, not copied (the shell passes its arrays on, ../../../kernel/sandbox/policy.js).
 */
import { AssetBox } from './host.js';
import { budget } from '../../render/budget.js';
import { lineOf, turn as pageTurn } from '../../render/turns.js';

/**
 * A pool of boxes of one engine. `build` as ./host.js `AssetBox.build`, with `rank` (how much it is wanted while it
 * waits, ../../render/turns.js) and `unwanted` (asked as its turn comes: true, and it is not built: whoever asked is gone).
 * @param {{ engine: number, size?: number, box?: () => Pick<AssetBox, 'start' | 'build' | 'stop'>, turn?: ReturnType<typeof lineOf> }} o
 *   `size`: its boxes, where not the page's own pool (as many as the page has turns, each build on one of them, a
 *   build before a level); given, it is a pool apart with a line of its own. `box`: how a box is made (a test's stand-in)
 */
export function createPool({ engine, size, box = () => new AssetBox({ engine, rooms: 1, turns: false }), turn: line }) {
	/** @type {{ box: ReturnType<typeof box> | null, busy: boolean, up: Promise<unknown> | null }[]} */
	const slots = Array.from({ length: Math.max(1, size ?? budget().builds) }, () => ({ box: null, busy: false, up: null }));
	const turn = line ?? (size === undefined ? pageTurn : lineOf(() => slots.length));
	let waiting = 0, stops = 0, stopped = '';
	return {
		engine,
		size: slots.length,
		/** @param {{ hash: string, code: string, pieces?: string[] }} recipe @param {Record<string, string>} [given] */
		async build(recipe, given, { rank = 0, unwanted, ...o } = {}) {
			const asked = stops;
			waiting++;
			const back = await turn({ rank });
			waiting--;
			// a box is free: the line gives no more turns than the pool has boxes (started only now: none for a page
			// that finds all it asks for in its cache)
			const s = slots.find((x) => !x.busy);
			try {
				if (stops !== asked) throw new Error(stopped);
				if (unwanted?.()) throw new Error('the build is no longer wanted');
				s.busy = true;
				s.box ??= box();
				// (a box that will not start fails its builds itself, each saying why)
				await (s.up ??= Promise.resolve(s.box.start()).catch(() => {}));
				return await s.box.build(recipe, given, o);
			} finally {
				if (stops === asked) s.busy = false;
				back();
			}
		},
		/** how many it builds now, and how many wait */
		get building() {
			return slots.filter((s) => s.busy).length;
		},
		get waiting() {
			return waiting;
		},
		/** every box let go, what waits failed (a page's own pools live as long as the page) */
		stop(why = 'the pool was stopped') {
			stops++;
			stopped = why;
			for (const s of slots) s.box?.stop(why), Object.assign(s, { box: null, busy: false, up: null });
		}
	};
}

/** @type {Map<number, ReturnType<typeof createPool>>} */
const pools = new Map();
/** The page's pool for a box engine, made when a build first needs it. @param {number} engine */
export function poolOf(engine) {
	if (!pools.has(engine)) pools.set(engine, createPool({ engine }));
	return pools.get(engine);
}
