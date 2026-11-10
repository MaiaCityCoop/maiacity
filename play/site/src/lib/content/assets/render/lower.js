// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * The renderer's (./index.js) lower levels made by ./simplify.js in workers of their own where there are any, so even the
 * LifeTrac (one shape of 437,713 corners: a second or two) never holds the page's frames, and a world's kinds are made
 * side by side (intent 08d00b84: one worker made them one after another, the longest wait of a first visit); else in
 * the page, a step at a time between frames. Kept on the device by ./levels.js.
 */
import * as THREE from 'three';
import { LEFT, lowerDraws } from './simplify.js';
import { buildTurn } from '../../render/budget.js';

/** a typed array on a buffer of its own, so that sending it copies only itself */
const own = (A) => (A.byteOffset === 0 && A.byteLength === A.buffer.byteLength ? A : A.slice());

const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();

/** a material a drawing is seen through, at least in places: it hides nothing behind it */
const through = (m) => !!(m.transparent || m.opacity < 1 || m.transmission > 0 || m.alphaTest > 0 || m.alphaMap || m.alphaHash);

/**
 * A level's drawing as plain arrays, with its biggest drawn size (ball diameter, m) and how much bigger than made
 * (`scale`), where drawn (`locals`), its side, whether seen through, and whether painted (`painted`, its colour map).
 */
function plainOf(d) {
	const g = d.geometry;
	const attributes = {};
	for (const [k, a] of Object.entries(g.attributes)) {
		if (LEFT.has(k)) continue;
		const array = a.isInterleavedBufferAttribute ? Float32Array.from({ length: a.count * a.itemSize }, (_, i) => a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize)) : own(a.array);
		attributes[k] = { array, itemSize: a.itemSize, normalized: a.normalized };
	}
	const index = g.index ? own(g.index.array) : Uint32Array.from({ length: g.attributes.position.count }, (_, i) => i);
	if (!g.boundingSphere) g.computeBoundingSphere();
	let scale = 0;
	for (let k = 0; k < d.n; k++) {
		_m.fromArray(d.locals, k * 16).decompose(_p, _q, _s);
		scale = Math.max(scale, Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z));
	}
	return { attributes, index, tris: d.tris, n: d.n, size: 2 * g.boundingSphere.radius * scale, scale, locals: d.locals.slice(0, d.n * 16), side: d.material.side, see: through(d.material), painted: !!d.material.map };
}

const picked = (A, pick, size) => {
	const out = new A.constructor(pick.length * size);
	pick.forEach((c, i) => out.set(A.subarray(c * size, c * size + size), i * size));
	return out;
};

/** A level made from `source` and what the simplifier made of its drawings (shape, seen copies, or both), its measure the source's. */
export function levelOf(source, made) {
	const draws = [];
	made.draws.forEach((r, i) => {
		const d = source.draws[i];
		if (r === 'same') draws.push(d);
		else if (r) {
			let to = d;
			if (r.index) {
				const g = new THREE.BufferGeometry();
				for (const [k, a] of Object.entries(r.attributes)) g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized));
				g.setIndex(new THREE.BufferAttribute(r.index, 1));
				g.computeBoundingBox();
				g.computeBoundingSphere();
				to = { ...d, geometry: g, tris: r.index.length / 3 };
			}
			if (r.copies) to = { ...to, locals: picked(d.locals, r.copies, 16), colors: d.colors && picked(d.colors, r.copies, 3), n: r.copies.length };
			draws.push(to);
		}
	});
	// `same`: nothing taken away (every drawing kept as it is), so drawn as the level it was made from
	const same = made.draws.every((r) => r === 'same');
	return { ...source, draws, tris: draws.reduce((a, d) => a + d.tris * d.n, 0), same, made: { error: made.error, passes: made.passes } };
}

/**
 * The renderer's maker of lower levels: several kinds at once, each in a worker of its own, as many as the page's turns
 * let work (../../render/budget.js `buildTurn`: the turns the recipes' builds take too, so the two together never ask
 * more of the device than its cores to spare). @param {{ worker?: boolean }} [o] `worker: false` makes them in the page
 * @returns {{ lower: (source: import('./prepare.js').Level, plans: { budget: number, most?: number, error: number, smallest: number, every?: boolean }[], later?: boolean, raw?: boolean, rank?: (() => number) | null) => Promise<import('./prepare.js').Level[]>, readonly busy: number, dispose: () => void }}
 */
export function createLowering(o = {}) {
	/** the workers started, each with the job it is on (none: free) @type {{ w: Worker, job: { ok: Function, no: Function } | null }[]} */
	const workers = [];
	let gone = o.worker === false;
	let disposed = false;
	let busy = 0;
	/** the most wanted first (`rank`, as the renderer's builds: what stands near the eye), else in the order asked for,
	 *  those that can wait (`later`) after all the others */
	/** @type {{ source: any, plans: any[], later: boolean, raw: boolean, rank?: (() => number) | null, ok: Function, no: Function }[]} */
	const jobs = [];
	/** the jobs being made, and whether a turn is asked for and not yet given */
	let running = 0, asking = false;

	/** a worker with nothing to do: one started before, else a new one; none where there are no workers (the page makes it) */
	function free() {
		const idle = workers.find((x) => !x.job);
		if (idle || gone || typeof Worker === 'undefined') return idle ?? null;
		/** @type {{ w: Worker, job: { ok: Function, no: Function } | null }} */
		let mine;
		try {
			mine = { w: new Worker(new URL('./simplify.worker.js', import.meta.url), { type: 'module' }), job: null };
		} catch {
			gone = true;
			return null;
		}
		mine.w.onmessage = (e) => {
			const job = mine.job;
			mine.job = null;
			if (e.data.error) job?.no(new Error(e.data.error));
			else job?.ok(e.data.out);
		};
		// a worker that cannot start (no module workers, its code refused): the page does it, between frames
		mine.w.onerror = (e) => {
			e.preventDefault?.();
			gone = true;
			for (const x of workers.splice(0)) {
				x.w.terminate();
				x.job?.no(Object.assign(new Error('the simplifying worker stopped'), { again: true }));
			}
		};
		workers.push(mine);
		return mine;
	}

	const frame = () => new Promise((ok) => setTimeout(ok, 0));

	async function run(draws, plans) {
		if (disposed) throw new Error('the renderer was disposed');
		const x = free();
		if (x) {
			try {
				return await new Promise((ok, no) => {
					x.job = { ok, no };
					x.w.postMessage({ draws, plans });
				});
			} catch (err) {
				if (!err.again) throw err;
			}
		}
		return lowerDraws(draws, plans, frame);
	}

	const wanted = (j) => (j.later ? -Infinity : (j.rank?.() ?? 0));

	function pump() {
		// one turn asked for at a time, the next as soon as it is given: as many kinds at once as the page has turns free,
		// yet where recipes wait for turns too, the levels stand in that line once, not once a kind (a world's builds, which
		// show its plants, are not held up behind every level still to be made lighter). The job is chosen only once its
		// turn has come: what is wanted most by then. In the page (no workers) one at a time, a step between frames.
		if (asking || !jobs.length || ((gone || typeof Worker === 'undefined') && running)) return;
		asking = true;
		buildTurn().then((back) => {
			asking = false;
			if (!jobs.length) return back();
			const job = jobs.splice(jobs.reduce((best, j, i) => (wanted(j) > wanted(jobs[best]) ? i : best), 0), 1)[0];
			running++;
			Promise.resolve()
				.then(() => run(job.source.draws.map(plainOf), job.plans))
				.then((made) => job.ok(job.raw ? made : made.map((m) => levelOf(job.source, m))), job.no)
				.finally(() => {
					running--;
					busy--;
					back();
					pump();
				});
			pump();
		});
	}

	return {
		/**
		 * The levels of `source` each plan asks for; `later` (a recipe's level made lighter, drawn as it came meanwhile)
		 * waits for every other; `raw` gives the simplifier's plain data (to keep: ./levels.js), not yet a level (`levelOf`);
		 * `rank` how much it is wanted while it waits (asked again each time the worker is free).
		 */
		lower(source, plans, later = false, raw = false, rank = null) {
			busy++;
			return new Promise((ok, no) => {
				jobs.push({ source, plans, later, raw, rank, ok, no });
				pump();
			});
		},
		get busy() {
			return busy;
		},
		dispose() {
			disposed = true;
			for (const x of workers.splice(0)) {
				x.w.terminate();
				x.job?.no(new Error('the renderer was disposed'));
			}
			for (const j of jobs.splice(0)) {
				busy--;
				j.no(new Error('the renderer was disposed'));
			}
		}
	};
}
