/*
 * A world's forest of our own plants, drawn by ./drawn.js `createFlora`: each kind built once in the asset box, each
 * plant a copy; trees drawn however far off, small plants as far as the forest streams them (`STREAMS`).
 */
import * as THREE from 'three';
import { NotInCatalog, withQuery } from '../../assets/catalog.js';

/** @typedef {import('./sandbox5.js').Kind} Kind */
/** @typedef {'tree' | 'shrub' | 'cover'} Reach how far off a plant is drawn: a tree always, the others until a picture */
/** @typedef {{ height: number, reach: number, foot: number, leaf: [number, number, number] }} Shape a kind's measure off its build */
/**
 * @typedef {{
 *   use: (ref: string, shadows?: boolean, picture?: boolean) => any,
 *   take: (k: any, at: { x: number, y: number, z: number, turn: number, scale: number }) => any,
 *   give: (c: any) => void,
 *   far: (k: any, r: 'shrub' | 'cover') => number,
 *   assets: { stats: () => { tris: number } }
 * }} FloraDrawn the renderer a forest's plants are drawn by (./drawn.js `createFlora`)
 */

/** @typedef {{ shrub: number, cover: number }} Streams how far off (m) a forest puts its small plants down */
/** Sandbox 4's reach for small plants (shrubs 26 m, cover 13 m; 40 and 22 under a dome); how finely is the selector's. */
export const STREAMS = /** @type {{ village: Streams, inside: Streams }} */ ({ village: { shrub: 26, cover: 13 }, inside: { shrub: 40, cover: 22 } });

/** @param {Kind} k */
export const keyOf = (k) => `${k.id}@${k.v}:${k.stage}:${k.seed}`;
/**
 * A kind as the asset it is built from and its values, by its pin alone (Samuel 2026-10-20, 2026-10-22: no old ref
 * stands behind it). Throws NotInVault for a kind the garden pins no version of. @param {Kind} k
 */
export const refOf = (k) => {
	// play: the garden names each plant by the build of its slot (Sandbox 1's garden config), a hash
	if (!k.asset) throw new NotInCatalog(`the garden names no asset for ${k.id} (Sandbox 1's garden config)`);
	return withQuery(k.asset, `stage=${k.stage}&seed=${encodeURIComponent(k.seed)}`);
};

/**
 * A plant that did not grow: its kind's key and why (a setting its recipe refuses, a version play has not got). Never only
 * a warning (intent 4a199916): every forest's are kept here and `grown()` gives its own back, so the census counts them.
 * @typedef {{ kind: string, error: string }} DidNotGrow
 */
/** @type {DidNotGrow[]} every plant of every forest that did not grow since the page (or the census) began */
export const didNotGrow = [];

/** How near the start (m) a kind stands for a world to wait for it before it shows (`grown`): a tree where its shape is drawn (past it, its picture), a small plant as far as the village streams it. */
export const NEAR = { tree: 40, ...STREAMS.village };
/** a plant is before the eye within this cosine of where it looks (the worlds' view, 68° high, is 47° to either side), else BEHIND times as far */
export const AHEAD = 0.68, BEHIND = 4;

/** the side of a cell of the ground the small plants are filed in, metres */
const CELL = 8;
/** @param {number} ix @param {number} iz */
const cellKey = (ix, iz) => (ix + 4096) * 8192 + (iz + 4096);

/**
 * A kind's measure off its built shape: everything over the soil, its wood (one-sided) at its foot, its leaves and
 * petals (two-sided). @param {any} level the renderer's level (its drawings, each at its places) @returns {Shape}
 */
function measure(level) {
	let height = 0, reach = 0, foot = 0, leaves = 0;
	const leaf = [0, 0, 0];
	const v = new THREE.Vector3(), m = new THREE.Matrix4();
	for (const d of level.draws) {
		const sheet = d.material.side === THREE.DoubleSide, body = !sheet && !d.material.isMeshPhysicalMaterial;
		const P = d.geometry.attributes.position, C = d.geometry.attributes.color;
		for (let k = 0; k < d.n; k++) {
			m.fromArray(d.locals, k * 16);
			for (let i = 0; i < P.count; i++) {
				v.fromBufferAttribute(P, i).applyMatrix4(m);
				if (v.y > height) height = v.y;
				const h = Math.hypot(v.x, v.z);
				if (v.y > 0 && h > reach) reach = h;
				if (body && v.y > 0.05 && v.y < 0.5 && h < 0.8 && h > foot) foot = h;
				if (sheet && C) {
					leaf[0] += C.getX(i);
					leaf[1] += C.getY(i);
					leaf[2] += C.getZ(i);
					leaves++;
				}
			}
		}
	}
	const n = Math.max(1, leaves);
	return { height, reach, foot: foot || reach * 0.4, leaf: leaves ? [leaf[0] / n, leaf[1] / n, leaf[2] / n] : [0.3, 0.45, 0.2] };
}

/**
 * @typedef {{
 *   kind: Kind, reach: Reach, n: number, add: number[], k?: any, shape?: Shape,
 *   x?: Float32Array, y?: Float32Array, z?: Float32Array, turn?: Float32Array, scale?: Float32Array,
 *   copies?: (any | null)[], cells?: Map<number, number[]>, placed?: number[]
 * }} Stand all the plants of one kind in a forest, the small ones filed by their cell of the ground
 */

/**
 * A forest: plants in its own ground, which lies at `origin` in the renderer's world (a dome's inside stands off the
 * village's middle); `hidden`, none drawn until shown. @param {{ flora: FloraDrawn, origin?: [number, number, number], hidden?: boolean }} o
 */
export function createForest(o) {
	const { flora } = o;
	const [ox, oy, oz] = o.origin ?? [0, 0, 0];
	/** @type {Map<string, Stand>} */
	const stands = new Map();
	/** the circles of ground whose plants are not drawn (a dome whose own full forest is shown there) */
	/** @type {{ x: number, z: number, r: number }[]} */
	let masked = [];
	let hidden = !!o.hidden, dirty = true, gone = false;
	const last = { x: Infinity, z: Infinity };
	const at = { x: 0, y: 0, z: 0, turn: 0, scale: 1 };

	/** @param {Kind} kind @param {Reach} reach @param {number} x @param {number} y @param {number} z @param {number} turn @param {number} scale */
	function add(kind, reach, x, y, z, turn, scale) {
		const key = keyOf(kind);
		let st = stands.get(key);
		if (!st) stands.set(key, (st = { kind, reach, n: 0, add: [] }));
		st.add.push(x, y, z, turn, scale);
		st.n++;
		dirty = true;
	}

	const kinds = () => [...stands.values()].map((st) => st.kind);

	const isMasked = (/** @type {number} */ x, /** @type {number} */ z) => masked.some((m) => (x - m.x) ** 2 + (z - m.z) ** 2 < m.r * m.r);
	/** plant i of a stand where the world draws it @param {Stand} st @param {number} i */
	const where = (st, i) => {
		at.x = /** @type {Float32Array} */ (st.x)[i] + ox;
		at.y = /** @type {Float32Array} */ (st.y)[i] + oy;
		at.z = /** @type {Float32Array} */ (st.z)[i] + oz;
		at.turn = /** @type {Float32Array} */ (st.turn)[i];
		at.scale = /** @type {Float32Array} */ (st.scale)[i];
		return at;
	};
	/** plant i drawn, or not @param {Stand} st @param {number} i @param {boolean} on */
	const draw = (st, i, on) => {
		const copies = /** @type {(any | null)[]} */ (st.copies);
		if (on && !copies[i]) copies[i] = flora.take(st.k, where(st, i));
		else if (!on && copies[i]) {
			flora.give(copies[i]);
			copies[i] = null;
		}
	};

	/**
	 * Builds every kind (coarsest shape first, side by side) and puts its trees down. A kind that will not build leaves
	 * its places empty and the rest grow: a failure, given back and kept in `didNotGrow`. With `from` (where the eye
	 * starts and which way it looks, a unit) it settles once the kinds within NEAR of it are built (a plant not before the
	 * eye counted BEHIND times as far): the world shows, the others grow in behind it, nearest first (`rest()`: all have).
	 * @param {(done: number, of: number) => void} [onKind] @param {{ x: number, z: number, dx: number, dz: number }} [from]
	 * @returns {Promise<DidNotGrow[]>} this forest's kinds that did not grow (so far)
	 */
	async function grown(onKind, from) {
		const list = [...stands.values()];
		const failed = /** @type {DidNotGrow[]} */ ([]);
		const far = (/** @type {number} */ x, /** @type {number} */ z, d = Math.hypot(x, z)) => (x * from.dx + z * from.dz > d * AHEAD ? d : d * BEHIND);
		const off = new Map(list.map((st) => [st, from ? st.add.reduce((d, x, i, a) => (i % 5 ? d : Math.min(d, far(x - from.x, a[i + 2] - from.z))), Infinity) : 0]));
		const first = new Set(list.filter((st) => /** @type {number} */ (off.get(st)) < NEAR[st.reach]));
		// those the world waits for before all others, each lot nearest first: its turn is how much a kind is wanted
		list.sort((a, b) => Number(first.has(b)) - Number(first.has(a)) || /** @type {number} */ (off.get(a)) - /** @type {number} */ (off.get(b)));
		list.forEach((st, i) => off.set(st, i));
		let done = 0;
		const jobs = list.map(async (st) => {
			let k = null;
			try {
				// a tree casts its shadow at every level, also as a picture; small plants cast none and are left out first
				const tree = st.reach === 'tree';
				k = flora.use(refOf(st.kind), tree, tree);
				// built before whatever stands further off (the renderer's boxes take the most wanted first)
				k.rank ??= () => -(/** @type {number} */ (off.get(st)));
				await k.ready;
			} catch (err) {
				k = { error: String(/** @type {Error} */ (err)?.message ?? err) };
			}
			if (gone) return;
			if (first.has(st)) onKind?.(++done, first.size);
			if (k.error) {
				// a kind that will not build (a setting its recipe refuses, a version the library has not got): a failure, counted
				const f = { kind: keyOf(st.kind), error: k.error };
				failed.push(f), didNotGrow.push(f);
				return console.error(`flora: ${f.kind} did not grow: ${f.error}`);
			}
			st.k = k;
			st.shape = measure(k.levels[k.base].level);
			// where each stands, packed; and the small ones filed by their cell of the ground
			const n = st.n, a = st.add;
			[st.x, st.y, st.z, st.turn, st.scale] = [0, 1, 2, 3, 4].map((j) => Float32Array.from({ length: n }, (_, i) => a[i * 5 + j]));
			st.copies = new Array(n).fill(null);
			if (st.reach !== 'tree') {
				(st.cells = new Map()), (st.placed = []);
				for (let i = 0; i < n; i++) {
					const key = cellKey(Math.floor(st.x[i] / CELL), Math.floor(st.z[i] / CELL));
					st.cells.set(key, [...(st.cells.get(key) ?? []), i]);
				}
			}
			st.add = [];
			// every tree stands from the start, however far off (as its picture); the rest come as the eye nears them
			if (!st.cells && !hidden) for (let i = 0; i < n; i++) if (!isMasked(st.x[i], st.z[i])) draw(st, i, true);
			dirty = true;
		});
		whole = Promise.all(jobs).then(() => failed);
		await Promise.all(jobs.filter((_, i) => first.has(list[i])));
		return failed;
	}
	/** @type {Promise<DidNotGrow[]>} every kind built (or failed): what `grown` left growing has grown */
	let whole = Promise.resolve([]);

	/** the plants of a stand within `far` of x, z, by their cells @param {Stand} st @param {number} x @param {number} z @param {number} far @param {(i: number) => void} each */
	const within = (st, x, z, far, each) => {
		const cells = /** @type {Map<number, number[]>} */ (st.cells);
		const span = Math.ceil(far / CELL), cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
		for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) for (const k of cells.get(cellKey(cx + i, cz + j)) ?? []) each(k);
	};

	/** marks: which plants of a small stand stand within reach now */
	let mark = new Uint32Array(0), epoch = 0;
	/** Puts down the small plants within reach of x, z and takes away the rest, once the eye has moved a little. @param {number} x @param {number} z */
	function update(x, z) {
		if (hidden || gone || (!dirty && Math.hypot(x - last.x, z - last.z) < 2)) return;
		dirty = false;
		last.x = x;
		last.z = z;
		for (const st of stands.values()) {
			if (!st.cells || !st.k) continue;
			const far = flora.far(st.k, /** @type {'shrub' | 'cover'} */ (st.reach));
			const X = /** @type {Float32Array} */ (st.x), Z = /** @type {Float32Array} */ (st.z), placed = /** @type {number[]} */ (st.placed);
			if (mark.length < st.n) mark = new Uint32Array(Math.max(st.n, mark.length * 2));
			const now = ++epoch;
			within(st, x, z, far, (i) => {
				if (Math.hypot(X[i] - x, Z[i] - z) >= far || isMasked(X[i], Z[i])) return;
				mark[i] = now;
				if (!(/** @type {any[]} */ (st.copies)[i])) {
					draw(st, i, true);
					placed.push(i);
				}
			});
			let w = 0;
			for (const i of placed) {
				if (mark[i] === now) placed[w++] = i;
				else draw(st, i, false);
			}
			placed.length = w;
		}
	}

	/** Leaves out every plant in these circles until the next mask. @param {{ x: number, z: number, r: number }[]} list */
	function mask(list) {
		masked = list.slice();
		if (!hidden)
			for (const st of stands.values()) {
				if (st.cells || !st.k) continue;
				const X = /** @type {Float32Array} */ (st.x), Z = /** @type {Float32Array} */ (st.z);
				for (let i = 0; i < st.n; i++) draw(st, i, !isMasked(X[i], Z[i]));
			}
		dirty = true;
	}

	/** every copy taken away (a dome's inside while it is not shown), or put back @param {boolean} on */
	function show(on) {
		if (hidden === !on || gone) return;
		hidden = !on;
		for (const st of stands.values()) {
			if (!st.k) continue;
			if (st.cells) {
				if (!on) {
					for (const i of /** @type {number[]} */ (st.placed)) draw(st, i, false);
					/** @type {number[]} */ (st.placed).length = 0;
				}
				continue;
			}
			const X = /** @type {Float32Array} */ (st.x), Z = /** @type {Float32Array} */ (st.z);
			for (let i = 0; i < st.n; i++) draw(st, i, on && !isMasked(X[i], Z[i]));
		}
		dirty = true;
	}

	/** how many triangles the plants' renderer draws now, for a check on its weight; and how many plants it has */
	const weight = () => flora.assets.stats().tris;
	const plants = () => [...stands.values()].reduce((a, st) => a + st.n, 0);

	/** a mesh to cast rays at one plant's own shape, moved to wherever it stands */
	const probe = new THREE.Mesh();
	const caster = new THREE.Raycaster();
	const M = new THREE.Matrix4(), L = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
	/**
	 * The plant a ray from o along d meets first within `far` (nearest cylinders tried against their shapes), else null.
	 * @param {THREE.Vector3} o @param {THREE.Vector3} d @param {number} [far]
	 * @returns {{ kind: Kind, x: number, y: number, z: number, height: number, reach: number, t: number } | null}
	 */
	function pick(o, d, far = 45) {
		/** @type {{ st: Stand, i: number, t: number }[]} */
		const near = [];
		const dd = d.x * d.x + d.z * d.z;
		for (const st of stands.values()) {
			if (!st.k || !st.shape) continue;
			const X = /** @type {Float32Array} */ (st.x), Y = /** @type {Float32Array} */ (st.y), Z = /** @type {Float32Array} */ (st.z), S = /** @type {Float32Array} */ (st.scale);
			const shape = st.shape;
			const test = (/** @type {number} */ i) => {
				const cx = X[i] - o.x, cz = Z[i] - o.z;
				if (cx * cx + cz * cz > far * far) return;
				const k = S[i];
				const w = Math.max(0.3, shape.reach * k + 0.2), h = Math.max(0.2, shape.height * k);
				// the stretch of the ray inside the plant's cylinder, if any: where it enters (or 0, from inside)
				let t0 = 0, t1 = far;
				if (dd > 1e-9) {
					const b = -(cx * d.x + cz * d.z), c = cx * cx + cz * cz - w * w;
					const disc = b * b - dd * c;
					if (disc < 0) return;
					t0 = Math.max(0, (-b - Math.sqrt(disc)) / dd);
					t1 = (-b + Math.sqrt(disc)) / dd;
					if (t1 < 0) return;
				} else if (cx * cx + cz * cz > w * w) return;
				const ya = o.y + d.y * t0, yb = o.y + d.y * t1;
				if (Math.max(ya, yb) < Y[i] - 0.1 || Math.min(ya, yb) > Y[i] + h + 0.1) return;
				near.push({ st, i, t: t0 });
			};
			if (st.cells) within(st, o.x, o.z, far, test);
			else for (let i = 0; i < st.n; i++) test(i);
		}
		near.sort((a, b) => a.t - b.t);
		caster.set(o, d.clone().normalize());
		caster.far = far;
		/** @type {{ kind: Kind, x: number, y: number, z: number, height: number, reach: number, t: number } | null} */
		let best = null;
		for (const { st, i, t } of near.slice(0, 40)) {
			// nothing nearer than the one already found can come after it
			if (best && t > best.t) break;
			const k = st.k, X = /** @type {Float32Array} */ (st.x), Y = /** @type {Float32Array} */ (st.y), Z = /** @type {Float32Array} */ (st.z);
			const sc = /** @type {Float32Array} */ (st.scale)[i];
			// its finest shape here, as drawn near you (its coarsest where a phone's budget let go, ../../render/budget.js)
			const level = (k.levels[0].state === 'ready' && !k.levels[0].released ? k.levels[0] : k.levels[k.base]).level;
			M.compose(_p.set(X[i], Y[i], Z[i]), _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, /** @type {Float32Array} */ (st.turn)[i]), _s.setScalar(sc));
			for (const dr of level.draws) {
				probe.geometry = dr.geometry;
				probe.material = dr.material;
				for (let j = 0; j < dr.n; j++) {
					probe.matrixWorld.multiplyMatrices(M, L.fromArray(dr.locals, j * 16));
					const hit = caster.intersectObject(probe, false)[0];
					if (hit && (!best || hit.distance < best.t)) {
						const shape = /** @type {Shape} */ (st.shape);
						best = { kind: st.kind, x: X[i], y: Y[i], z: Z[i], height: shape.height * sc, reach: shape.reach * sc, t: hit.distance };
					}
				}
			}
		}
		return best;
	}

	/** The kind's measure, once it is built (how far a plant of it reaches, how thick its foot). @param {Kind} kind */
	const shape = (kind) => stands.get(keyOf(kind))?.shape;

	/** every copy handed back to the renderer's keeping (the renderer is the world's: a village's, shared by its domes) */
	function dispose() {
		gone = true;
		for (const st of stands.values()) for (const c of st.copies ?? []) if (c) flora.give(c);
		stands.clear();
	}

	return { add, kinds, grown, rest: () => whole, update, weight, plants, shape, pick, mask, show, dispose };
}

/** @typedef {ReturnType<typeof createForest>} Forest */
