// What a world builds, decided by what is seen: one scheduler for every world. A world hands it the heavy things it can
// build (where, how big) and says each frame what is looking (the player's camera, or a shot's); it builds what those
// see, biggest on screen first, within the budget, and lets go of the longest unseen. One build at a time
// (`concurrency`): two at once halve each other's speed and double peak memory. No THREE (a frustum is anything with
// `intersectsSphere`), so it runs in a test as in a world.

/**
 * @typedef {{ x: number, y: number, z: number, frustum?: { intersectsSphere(s: { center: { x: number, y: number, z: number }, radius: number }): boolean, containsPoint(p: { x: number, y: number, z: number }): boolean } | null, near?: number }} View
 *   a camera looking: where it stands, what it sees (none: all round it), and how near round it a thing is wanted unseen
 * @typedef {{ id: string | number, x: number, y?: number, z: number, r: number, cost?: number, build: (job: { cancelled: boolean }) => Promise<any>, dispose?: (handle: any) => void }} Item
 *   a thing a world can build: its middle, reach (bounding radius), budget cost (1), how to build it (the job told when
 *   cancelled) and let it go
 * @typedef {{ item: Item, state: 'idle' | 'building' | 'built' | 'failed', handle: any, job: { cancelled: boolean } | null, seen: number, failedAt: number }} Entry
 */

/** how long a failed build waits before it is tried again (ms) */
const RETRY = 10000;

/**
 * @param {{ budget?: number, concurrency?: number, far?: number, near?: number, ahead?: boolean, now?: () => number,
 *   onBuilt?: (item: Item, handle: any) => void, onDisposed?: (item: Item) => void }} [o]
 *   budget: the most built and building may cost; far: nothing wanted beyond it; near: the views' default; ahead: build
 *   the nearest unwanted into spare room while nothing wanted waits; onBuilt / onDisposed: the world shows and hides them
 */
export function createStream(o = {}) {
	const budget = o.budget ?? Infinity, concurrency = o.concurrency ?? 1, far = o.far ?? Infinity, near = o.near ?? 0;
	const now = o.now ?? (() => performance.now());
	/** @type {Map<string | number, Entry>} */
	const entries = new Map();
	/** @type {View[]} the views it serves now (the player's camera, or the shot being filmed) */
	let looking = [];
	/** @type {View[][]} view sets kept built whatever is looked at (the shots ahead) */
	let pinned = [];
	/** @type {Set<View[]>} the views a `ready` is waiting on: built before anything else */
	const awaited = new Set();
	/** @type {Set<() => void>} */
	const waiting = new Set();
	const cost = (/** @type {Item} */ i) => i.cost ?? 1;

	/** How much view `v` wants item `i`: 0 not at all, else more the more of the picture it covers. @param {Item} i @param {View} v */
	function want(i, v) {
		const y = i.y ?? 0;
		const d = Math.max(0, Math.hypot(i.x - v.x, y - v.y, i.z - v.z) - i.r);
		if (d > far) return 0;
		const seen = !v.frustum || v.frustum.intersectsSphere({ center: { x: i.x, y, z: i.z }, radius: i.r });
		if (seen) return 1 + i.r / Math.max(d, 1);
		return d < (v.near ?? near) ? i.r / Math.max(d, 1) : 0;
	}
	/** The items views `vs` want, most wanted first, as many as the budget holds. @param {View[]} vs @returns {Item[]} */
	function wanted(vs) {
		const scored = [];
		for (const e of entries.values()) {
			let s = 0;
			for (const v of vs) s = Math.max(s, want(e.item, v));
			if (s > 0) scored.push({ i: e.item, s });
		}
		scored.sort((a, b) => b.s - a.s);
		const out = [];
		let spent = 0;
		for (const { i } of scored) {
			if (spent + cost(i) > budget) continue;
			spent += cost(i);
			out.push(i);
		}
		return out;
	}
	/** what is to be built now, in order: the shots ahead first, then what is looked at — within the budget */
	function desired() {
		const order = [...[...awaited, ...pinned].flatMap((vs) => wanted(vs)), ...wanted(looking)];
		const out = new Map();
		let spent = 0;
		for (const i of order) {
			if (out.has(i.id) || spent + cost(i) > budget) continue;
			spent += cost(i);
			out.set(i.id, i);
		}
		return out;
	}
	function settle() {
		for (const f of [...waiting]) f();
	}
	/** @param {Entry} e */
	function letGo(e) {
		if (e.job) e.job.cancelled = true;
		if (e.state === 'built') {
			e.item.dispose?.(e.handle);
			o.onDisposed?.(e.item);
		}
		Object.assign(e, { state: 'idle', handle: null, job: null });
	}
	/** @param {Entry} e */
	function start(e) {
		const job = { cancelled: false };
		Object.assign(e, { state: 'building', job });
		e.item
			.build(job)
			.then((h) => {
				if (job.cancelled || e.job !== job) return void e.item.dispose?.(h);
				Object.assign(e, { state: 'built', handle: h, job: null });
				o.onBuilt?.(e.item, h);
			})
			.catch(() => {
				if (e.job !== job) return;
				Object.assign(e, { state: 'failed', job: null, failedAt: now() });
			})
			.finally(() => {
				tick();
				settle();
			});
	}

	/** The nearest unwanted things within `far`, built ahead into room the budget has (never by a let-go) while nothing wanted waits. */
	function ahead() {
		const views = [...looking, ...pinned.flat()];
		return [...entries.values()]
			.filter((e) => e.state === 'idle')
			.map((e) => ({ e, d: Math.min(...views.map((v) => Math.max(0, Math.hypot(e.item.x - v.x, (e.item.y ?? 0) - v.y, e.item.z - v.z) - e.item.r))) }))
			.filter((x) => x.d <= far)
			.sort((a, b) => a.d - b.d)
			.map((x) => x.e);
	}

	/** Schedule: the wanted built first (a build ahead gives up its turn to one), what the budget needs let go, then ahead. */
	function tick() {
		const want = desired(), t = now();
		for (const e of entries.values()) if (want.has(e.item.id)) e.seen = t;
		const live = (/** @type {Entry} */ e) => e.state === 'built' || e.state === 'building';
		let spent = 0, running = 0;
		for (const e of entries.values()) {
			if (live(e)) spent += cost(e.item);
			if (e.state === 'building') running++;
		}
		const waits = [...want.values()].map((i) => /** @type {Entry} */ (entries.get(i.id))).filter((e) => !live(e) && !(e.state === 'failed' && t - e.failedAt < RETRY));
		// an unwanted build finishes (often wanted again soon) unless something wanted waits for its turn: then it gives way
		if (waits.length)
			for (const e of entries.values())
				if (running >= concurrency && e.state === 'building' && !want.has(e.item.id)) {
					spent -= cost(e.item);
					running--;
					letGo(e);
				}
		// room for what waits: the built nobody wants go, the longest unseen first
		const need = waits.reduce((a, e) => a + cost(e.item), 0);
		const spare = [...entries.values()].filter((e) => e.state === 'built' && !want.has(e.item.id)).sort((a, b) => a.seen - b.seen);
		while (spent + need > budget && spare.length) {
			const e = /** @type {Entry} */ (spare.shift());
			spent -= cost(e.item);
			letGo(e);
		}
		for (const e of waits) {
			if (running >= concurrency || spent + cost(e.item) > budget) break;
			spent += cost(e.item);
			running++;
			start(e);
		}
		if (!o.ahead || pinned.length) return;
		for (const e of ahead()) {
			if (running >= concurrency || spent + cost(e.item) > budget) break;
			spent += cost(e.item);
			running++;
			start(e);
		}
	}

	return {
		/** @param {Item} item */
		add(item) {
			entries.set(item.id, { item, state: 'idle', handle: null, job: null, seen: 0, failedAt: 0 });
		},
		/** The views it serves now (each frame, or as often as the world checks): the player's camera, or a shot's. @param {View[]} views */
		look(views) {
			looking = views;
		},
		/** View sets kept built whatever is looked at: the shots the film will draw next. @param {View[][]} sets */
		pin(sets) {
			pinned = sets;
		},
		tick,
		/** The ids views `vs` want, most wanted first, within the budget. @param {View[]} vs */
		wanted: (vs) => wanted(vs).map((i) => i.id),
		/** Whether item `id` is wanted by what is looked at now (a world shows it in full then, once built). @param {string | number} id */
		wants: (id) => desired().has(id),
		/** @param {string | number} id */
		built: (id) => entries.get(id)?.state === 'built',
		/** @param {string | number} id */
		handle: (id) => entries.get(id)?.handle ?? null,
		/** @param {string | number} id */
		building: (id) => entries.get(id)?.state === 'building',
		/**
		 * Resolves once all views `vs` want is built (or failed: an unbuildable thing holds no shot back), the views
		 * pinned meanwhile. @param {View[]} vs
		 */
		ready(vs) {
			const ids = wanted(vs).map((i) => i.id);
			const done = () => ids.every((id) => {
				const s = entries.get(id)?.state;
				return s === 'built' || s === 'failed';
			});
			awaited.add(vs);
			tick();
			return new Promise((resolve) => {
				const check = () => {
					if (!done()) return;
					waiting.delete(check);
					awaited.delete(vs);
					resolve(undefined);
				};
				waiting.add(check);
				check();
			});
		},
		/** Every item and its state, for a world's own debugging. */
		states: () => [...entries.values()].map((e) => ({ id: e.item.id, state: e.state })),
		dispose() {
			for (const e of entries.values()) letGo(e);
			entries.clear();
			waiting.clear();
			awaited.clear();
		}
	};
}
