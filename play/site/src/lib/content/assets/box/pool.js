// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE PAGE'S POOL OF ASSET BOXES — the one place a build finds its box (intent 08d00b84). Every build a page asks for
 * (a world's plants, a crowd's actors, a viewer's levels, whichever renderer asks) waits in one line an engine, the most
 * wanted first, and is built in the first box free: as many boxes as the device's budget lets the page build at once
 * (../../render/budget.js `builds`: every core but one on a desktop, two on a phone), each a frame and workers of its
 * own (./host.js), started only as builds wait for them.
 *
 * A build is its recipe's alone: the box hands a worker the recipe's file (its pieces before it, each held to its hash),
 * its values and nothing else, so the same recipe gives the same build in whichever box it lands, and what comes back
 * is moved, not copied (the shell passes its arrays on, ../../../kernel/sandbox/policy.js).
 *
 * Before it, each renderer kept boxes of the newest engine, and every recipe made for an older one (all of play's, on
 * engine 5 while 7 was the newest) fell through to one box of its own engine, built one after another on one core.
 */
import { AssetBox } from './host.js';
import { budget } from '../../render/budget.js';

/**
 * A pool of `size` boxes of one engine. `build` as ./host.js `AssetBox.build`, with `rank` (how much it is wanted while
 * it waits: a number, or a function asked again each time a box is free; the first asked of those wanted alike) and
 * `unwanted` (asked as its turn comes: true, and it is not built: whoever asked is gone).
 * @param {{ engine: number, size?: number, box?: () => Pick<AssetBox, 'start' | 'build' | 'stop'> }} o `box`: how a box
 *   is made (a test's stand-in)
 */
export function createPool({ engine, size = budget().builds, box = () => new AssetBox({ engine, rooms: 1, spare: false }) }) {
	/** @type {{ box: ReturnType<typeof box> | null, busy: boolean, starting: boolean, up: boolean }[]} */
	const slots = Array.from({ length: Math.max(1, size) }, () => ({ box: null, busy: false, starting: false, up: false }));
	/** @type {{ rank: any, recipe: any, given: any, o: any, unwanted?: () => boolean, ok: Function, no: Function }[]} */
	const line = [];
	const rankOf = (q) => {
		const r = typeof q.rank === 'function' ? q.rank() : q.rank;
		return Number.isFinite(r) ? r : 0;
	};
	/** the most wanted of the line taken from it */
	const take = () => {
		let i = 0;
		for (let j = 1, best = rankOf(line[0]); j < line.length; j++) {
			const r = rankOf(line[j]);
			if (r > best) (i = j), (best = r);
		}
		return line.splice(i, 1)[0];
	};
	function pump() {
		// as many boxes started as builds wait for them (none for a page that finds all it asks for in its cache)
		let started = slots.filter((s) => s.starting).length;
		const need = Math.min(slots.length, line.length + slots.filter((s) => s.busy).length);
		for (const s of slots) {
			if (started >= need) break;
			if (s.starting) continue;
			s.starting = true;
			started++;
			s.box = box();
			// (a box that will not start fails its builds itself, each saying why)
			Promise.resolve(s.box.start())
				.catch(() => {})
				.then(() => {
					s.up = true;
					pump();
				});
		}
		for (const s of slots) {
			if (!s.up || s.busy) continue;
			let b = null;
			while (line.length && !b) {
				b = take();
				if (b.unwanted?.()) b.no(new Error('the build is no longer wanted')), (b = null);
			}
			if (!b) break;
			s.busy = true;
			s.box
				.build(b.recipe, b.given, b.o)
				.then(b.ok, b.no)
				.finally(() => {
					s.busy = false;
					pump();
				});
		}
	}
	return {
		engine,
		size: slots.length,
		/** @param {{ hash: string, code: string, pieces?: string[] }} recipe @param {Record<string, string>} [given] */
		build(recipe, given, { rank = 0, unwanted, ...o } = {}) {
			return new Promise((ok, no) => {
				line.push({ rank, recipe, given, o, unwanted, ok, no });
				pump();
			});
		},
		/** how many it builds now, and how many wait */
		get building() {
			return slots.filter((s) => s.busy).length;
		},
		get waiting() {
			return line.length;
		},
		/** every box let go, what waits failed (a page's own pools live as long as the page) */
		stop(why = 'the pool was stopped') {
			for (const b of line.splice(0)) b.no(new Error(why));
			for (const s of slots) s.box?.stop(why), Object.assign(s, { box: null, busy: false, starting: false, up: false });
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
