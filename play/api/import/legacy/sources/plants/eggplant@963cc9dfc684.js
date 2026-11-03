Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");

//#region src/lib/plants/grow.js
/**
* How finely a plant is made: 1 in the plants viewer, less when a world plants hundreds of it (`lite`). Below 1 every
* tube has fewer sides and rings, every sheet fewer rows, every bead fewer facets — and with `roots` off nothing
* under the soil is grown at all, which no one walking a forest sees; and with `thin` under 1 only that part of the
* leaves, petals and beads is kept, each grown bigger to fill the gap (a crown seen from metres away reads the same);
* `fill` over 1 grows every kept leaf and petal by that much more, for a crown that reads full from far off; and any
* tube thinner than `finest` (a twig, a stalk, a spine, in metres) is left out, as no one sees it from there. With
* `fruit` the key of one fruit (`Bag.fruit`), a plant draws that one as finely as the fruit viewer shows it up close
* (an avocado's pebbles), which on the whole tree no one would see.
*/
const DETAIL = {
	level: 1,
	roots: true,
	thin: 1,
	fill: 1,
	finest: 0,
	fruit: false
};
/**
* Builds with `make` at a lower detail (see DETAIL), and puts it back as it was.
* @template T @param {Partial<typeof DETAIL>} o @param {() => T} make @returns {T}
*/
function lite(o, make) {
	const keep = { ...DETAIL };
	Object.assign(DETAIL, o);
	try {
		return make();
	} finally {
		Object.assign(DETAIL, keep);
	}
}
/**
* The detail of one number, 1 as built down to 0.05, as a world asks for a plant's levels ($lib/assets/render): at
* 0.25 and 0.1 the same as Sandbox 4's forest grows its near and far plants (src/lib/sandbox-2/interior/flora.grow.js),
* at 0.5 its plant card's, and between them in step; roots only at 1.
* @param {number} d @returns {Partial<typeof DETAIL>}
*/
function detailAt(d) {
	const AT = [
		[
			.1,
			.12,
			1.6,
			.006
		],
		[
			.25,
			.45,
			1.3,
			.0016
		],
		[
			.5,
			.6,
			1.2,
			8e-4
		],
		[
			1,
			1,
			1,
			0
		]
	];
	const level = Math.min(1, Math.max(.05, d));
	const j = Math.max(1, AT.findIndex((x) => x[0] >= level));
	const [l0, t0, f0, n0] = AT[j - 1], [l1, t1, f1, n1] = AT[j];
	const k = Math.min(1, Math.max(0, (level - l0) / (l1 - l0)));
	return {
		level,
		roots: level >= 1,
		thin: t0 + (t1 - t0) * k,
		fill: f0 + (f1 - f0) * k,
		finest: n0 + (n1 - n0) * k
	};
}
/** a count of divisions at the present detail, never under `least` */
const fewer = (n, least = 1) => DETAIL.level >= 1 ? n : Math.max(least, Math.round(n * DETAIL.level));
/** @typedef {() => number} Chance a number 0 … 1, the next one every call */
/** @typedef {(u: number, v: number) => THREE.ColorRepresentation | THREE.Color} Paint a colour for a place on a shape (u along it, v round or across it) */
/** a 32-bit hash of a text (FNV-1a) */
function hashText(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
}
/**
* The chance of one organ of one plant: the seed id and the organ's name hashed into a small fast generator
* (mulberry32), the same numbers every time.
* @param {string} seed
* @param {...(string | number)} keys
* @returns {Chance}
*/
function chance(seed, ...keys) {
	let a = hashText(`${seed}|${keys.join("|")}`);
	return () => {
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** a number between a and b */
const between = (r, a, b) => a + (b - a) * r();
/** a number round m, give or take `by` */
const about = (r, m, by) => m + (r() * 2 - 1) * by;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => {
	const t = clamp(x);
	return t * t * (3 - 2 * t);
};
/** how far an organ has grown at g, if it grows from `from` to `to`: 0 … 1, eased */
const span = (g, from, to) => smooth((g - from) / (to - from));
/**
* A value that follows growth through a table of [g, value] rows, straight between them.
* @param {number} g
* @param {[number, number][]} rows
*/
function table(g, rows) {
	if (g <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		const [g1, v1] = rows[i];
		if (g <= g1) {
			const [g0, v0] = rows[i - 1];
			return lerp(v0, v1, smooth((g - g0) / (g1 - g0)));
		}
	}
	return rows[rows.length - 1][1];
}
const v3 = (x, y, z) => new three.Vector3(x, y, z);
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** the matrix that sets a shape built along +X (normal +Y) at `at`, pointing along `dir`, rolled by `roll` round it */
function aim(at, dir, roll = 0) {
	const x = dir.clone().normalize();
	let z = new three.Vector3().crossVectors(x, UP);
	if (z.lengthSq() < 1e-8) z = v3(0, 0, 1);
	z.normalize();
	const y = new three.Vector3().crossVectors(z, x).normalize();
	const m = new three.Matrix4().makeBasis(x, y, z);
	if (roll) m.multiply(new three.Matrix4().makeRotationX(roll));
	return m.setPosition(at);
}
const C = /* @__PURE__ */ (() => new three.Color())();
const toColor = (c) => c instanceof three.Color ? c : C.set(c);
/** a colour between two, as a THREE.Color (a new one) */
const mix = (a, b, t) => new three.Color(a).lerp(new three.Color(b), clamp(t));
/**
* A tube swept along points, its radius changing along it (`radius(u, v)`, u 0 … 1 base to tip, v 0 … 1 round it — a
* tomato's ribs), its frames carried along without twist. A root, a stem, a petiole, a tendril, a berry, a cucumber.
* @param {THREE.Vector3[]} points
* @param {(u: number, v: number) => number} radius
* @param {Paint} paint
* @param {number} [sides]
*/
function tube(points, radius, paint, sides = 6) {
	if (DETAIL.finest > 0 && Math.max(radius(0, 0), radius(.5, 0)) < DETAIL.finest) return made([], [], [], [], [], false);
	if (DETAIL.level < 1) {
		sides = fewer(sides, 3);
		const every = Math.max(1, Math.round(1 / DETAIL.level));
		if (every > 1 && points.length > 3) points = points.filter((_, i) => i % every === 0 || i === points.length - 1);
	}
	const n = points.length;
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const along = [0];
	for (let i = 1; i < n; i++) along.push(along[i - 1] + points[i].distanceTo(points[i - 1]));
	const total = along[n - 1] || 1;
	let normal = null;
	let prev = null;
	for (let i = 0; i < n; i++) {
		const t = points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]);
		if (t.lengthSq() < 1e-14) t.copy(prev ?? UP);
		t.normalize();
		if (!normal) normal = Math.abs(t.y) < .9 ? new three.Vector3().crossVectors(t, UP).normalize() : new three.Vector3().crossVectors(t, v3(1, 0, 0)).normalize();
		else if (prev) normal.applyQuaternion(new three.Quaternion().setFromUnitVectors(prev, t)).normalize();
		prev = t;
		const bin = new three.Vector3().crossVectors(t, normal).normalize();
		const u = along[i] / total;
		for (let s = 0; s <= sides; s++) {
			const a = s / sides * Math.PI * 2;
			const d = normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(bin, Math.sin(a));
			const p = points[i].clone().addScaledVector(d, Math.max(0, radius(u, s / sides)));
			pos.push(p.x, p.y, p.z);
			nor.push(d.x, d.y, d.z);
			uv.push(u, s / sides);
			const c = toColor(paint(u, s / sides));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < n - 1; i++) for (let s = 0; s < sides; s++) {
		const a = i * (sides + 1) + s, b = a + sides + 1;
		idx.push(a, a + 1, b, b, a + 1, b + 1);
	}
	return made(pos, nor, uv, col, idx, false);
}
/**
* A sheet: a leaf, a leaflet, a petal, a sepal — built along +X from its base, across Z, its face up (+Y). `shape(u)`
* is its half-width at u (0 base … 1 tip, in parts of its length), `lift(u, v)` how far a place on it is raised (v
* −1 … 1 across), for a cupped or folded or drooping leaf.
* @param {{ length: number, width: number, shape: (u: number) => number, lift?: (u: number, v: number) => number, paint: Paint, along?: number, across?: number }} o
*/
function sheet({ length, width, shape, lift = () => 0, paint, along = 16, across = 6 }) {
	along = fewer(along, 2);
	across = fewer(across, 1);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let i = 0; i <= along; i++) {
		const u = i / along;
		const w = shape(u) * width;
		for (let j = 0; j <= across; j++) {
			const v = j / across * 2 - 1;
			pos.push(u * length, lift(u, v) * length, v * w);
			nor.push(0, 1, 0);
			uv.push(u, (v + 1) / 2);
			const c = toColor(paint(u, v));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) {
		const a = i * (across + 1) + j, b = a + across + 1;
		idx.push(a, a + 1, b, b, a + 1, b + 1);
	}
	return made(pos, nor, uv, col, idx, true);
}
/** a small round thing — a seed, an achene, a wart, a bud — at `at`, stretched by `scale`, of one colour */
function bead(at, scale, color, detail = 6, turn = new three.Quaternion()) {
	detail = fewer(detail, 2);
	const g = new three.SphereGeometry(1, detail + 2, detail);
	g.applyMatrix4(new three.Matrix4().compose(at, turn, scale));
	const c = new three.Color(color);
	const n = g.attributes.position.count;
	const col = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) col.set([
		c.r,
		c.g,
		c.b
	], i * 3);
	g.setAttribute("color", new three.BufferAttribute(col, 3));
	return g;
}
/**
* Its normals worked out from its shape, smooth across its seams: a swept tube's first and last sides meet at the same
* places without sharing vertices, so the normals of every vertex at one place are averaged.
* @param {THREE.BufferGeometry} geo
*/
function smoothNormals(geo) {
	geo.computeVertexNormals();
	const pos = geo.attributes.position, nor = geo.attributes.normal;
	/** @type {Map<string, number[]>} */
	const at = /* @__PURE__ */ new Map();
	for (let i = 0; i < pos.count; i++) {
		const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
		const list = at.get(k);
		if (list) list.push(i);
		else at.set(k, [i]);
	}
	const n = new three.Vector3();
	for (const list of at.values()) {
		if (list.length < 2) continue;
		n.set(0, 0, 0);
		for (const i of list) n.x += nor.getX(i), n.y += nor.getY(i), n.z += nor.getZ(i);
		n.normalize();
		for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
	}
	nor.needsUpdate = true;
	return geo;
}
/** @returns {THREE.BufferGeometry} */
function made(pos, nor, uv, col, idx, flat) {
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new three.Float32BufferAttribute(nor, 3));
	g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
	g.setAttribute("color", new three.Float32BufferAttribute(col, 3));
	g.setIndex(idx);
	if (flat) g.computeVertexNormals();
	return g;
}
/** the materials, made once: a plant's body, its thin sheets (lit from both sides), its glossy fruit */
const materials = {};
/** @param {'body' | 'sheet' | 'gloss'} kind */
function material(kind) {
	return materials[kind] ??= kind === "sheet" ? new three.MeshStandardMaterial({
		vertexColors: true,
		roughness: .62,
		side: three.DoubleSide
	}) : kind === "gloss" ? new three.MeshPhysicalMaterial({
		vertexColors: true,
		roughness: .32,
		clearcoat: .6,
		clearcoatRoughness: .35
	}) : new three.MeshStandardMaterial({
		vertexColors: true,
		roughness: .75
	});
}
/** @typedef {'body' | 'sheet' | 'gloss' | 'prop'} Kind */
/**
* @typedef {{ key: string, at: THREE.Vector3, dir: THREE.Vector3, parts: { kind: Kind, geometry: THREE.BufferGeometry }[] }} Fruit
*   one fruit as a plant drew it (`Bag.fruit`): its pieces, where its stalk leaves the plant and the way it lies
*/
/** while the fruit viewer grows a plant (`pickFruit`), the bags it makes and the fruit drawn into them */
const PICKING = {
	bags: null,
	fruits: []
};
/**
* Grows a plant with `make` and gathers every fruit it drew (`Bag.fruit`), each with its pieces as drawn.
* @param {() => THREE.Group} make @returns {{ plant: THREE.Group, fruits: Fruit[] }}
*/
function pickFruit(make) {
	PICKING.bags = [];
	PICKING.fruits = [];
	try {
		return {
			plant: make(),
			fruits: PICKING.fruits.filter((f) => f.parts.length)
		};
	} finally {
		PICKING.bags = null;
		PICKING.fruits = [];
	}
}
/**
* Everything a plant is, gathered by material and merged at the end into one mesh each. Above or below the soil, all
* one plant: the viewer cuts the soil away to show the roots.
*/
var Bag = class {
	constructor() {
		/** @type {Record<Kind, THREE.BufferGeometry[]>} */
		this.parts = {
			body: [],
			sheet: [],
			gloss: [],
			prop: []
		};
		/** what the plant has put where, for its fruit and leaves to keep clear of (see Space) */
		this.space = new Space();
		/** how far into the next sheet kept, when thinned (DETAIL.thin) */
		this.sheets = 0;
		/** @type {Fruit | null} the fruit being drawn, between `fruit()` and `fruitDone()` */
		this.drawing = null;
		if (PICKING.bags) PICKING.bags.push(this);
	}
	/**
	* What is added from here to `fruitDone()` is one fruit — the whole of it as one is picked: its stalk, its calyx,
	* the fruit itself (or for tiny berries borne in bunches, the bunch) — hanging from `at`, where its stalk leaves
	* the plant, its body lying along `dir` from there (down, for a hanging fruit); `key` names it, the same at every
	* stage. Only gathered when the fruit viewer asks for it (`pickFruit`), so it costs nothing otherwise.
	* @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} dir
	*/
	fruit(key, at, dir) {
		this.drawing = {
			key: key.join("|"),
			at: at.clone(),
			dir: dir.clone().normalize(),
			parts: []
		};
		if (PICKING.bags) PICKING.fruits.push(this.drawing);
		return this;
	}
	fruitDone() {
		this.drawing = null;
		return this;
	}
	/** @param {Kind} kind @param {THREE.BufferGeometry} geometry @param {THREE.Matrix4} [m] */
	add(kind, geometry, m) {
		if (!geometry.attributes.position.count) return this;
		if (m) geometry.applyMatrix4(m);
		if (this.drawing && PICKING.bags) this.drawing.parts.push({
			kind,
			geometry: geometry.clone()
		});
		const isBead = geometry.type === "SphereGeometry";
		if ((kind === "sheet" || isBead) && (DETAIL.thin < 1 || DETAIL.fill !== 1)) {
			this.sheets = (this.sheets ?? 0) + DETAIL.thin;
			if (this.sheets < 1) return this;
			this.sheets -= 1;
			geometry.computeBoundingSphere();
			const sphere = geometry.boundingSphere;
			const at = isBead ? sphere.center.clone() : new three.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
			const most = Math.max(1, .14 / Math.max(1e-4, sphere.radius));
			const grow = Math.min(2.6, most, (isBead ? 1 / Math.cbrt(DETAIL.thin) : 1 / Math.sqrt(DETAIL.thin)) * (isBead ? 1 : DETAIL.fill));
			geometry.applyMatrix4(new three.Matrix4().makeTranslation(-at.x, -at.y, -at.z)).applyMatrix4(new three.Matrix4().makeScale(grow, grow, grow)).applyMatrix4(new three.Matrix4().makeTranslation(at.x, at.y, at.z));
		}
		this.parts[kind].push(geometry);
		return this;
	}
	build() {
		const group = new three.Group();
		for (const kind of [
			"body",
			"sheet",
			"gloss",
			"prop"
		]) {
			const list = this.parts[kind];
			if (!list.length) continue;
			const merged = (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(list);
			for (const g of list) g.dispose();
			if (!merged) continue;
			const mesh = new three.Mesh(merged, material(kind === "prop" ? "body" : kind));
			mesh.userData.prop = kind === "prop";
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			group.add(mesh);
		}
		return group;
	}
};
/**
* A root and the roots it branches into, grown into the soil: it bends down (gravity) and wanders (stones, water),
* its whole path drawn from its own chance so that a younger root is the first part of the older one.
* @param {Bag} bag
* @param {{
*   seed: string, key: (string | number)[], from: THREE.Vector3, dir: THREE.Vector3, length: number, grown: number,
*   radius: number, down?: number, wander?: number, laterals?: number, lateral?: number, order?: number, depth?: number,
*   young: THREE.ColorRepresentation, old: THREE.ColorRepresentation, age?: number, floor?: number
* }} o
*/
function root(bag, o) {
	if (!DETAIL.roots) return;
	const { seed, key, from, length, radius, young, old } = o;
	const grown = clamp(o.grown);
	if (grown <= .002 || length * grown < 1e-4) return;
	const r = chance(seed, "root", ...key);
	const down = o.down ?? .15, wander = o.wander ?? .35, order = o.order ?? 0, depth = o.depth ?? 2;
	const steps = Math.max(4, Math.min(24, Math.round(10 + length * 40)));
	const step = length / steps;
	/** the whole path, drawn in full every time */
	const path = [from.clone()];
	const dir = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		dir.y -= down;
		dir.x += (r() * 2 - 1) * wander;
		dir.y += (r() * 2 - 1) * wander * .5;
		dir.z += (r() * 2 - 1) * wander;
		if (dir.y > -.05 && path[i].y > -.004) dir.y = -.25;
		dir.normalize();
		const next = path[i].clone().addScaledVector(dir, step);
		if (o.floor !== void 0 && next.y < o.floor) next.y = o.floor + (next.y - o.floor) * .1;
		path.push(next);
	}
	const reach = grown * steps;
	const whole = Math.floor(reach);
	const pts = path.slice(0, whole + 1);
	if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
	if (pts.length < 2) return;
	const age = clamp(o.age ?? 0);
	const r0 = radius * (.35 + .65 * grown);
	bag.add("body", tube(pts, (u) => r0 * (1 - .7 * u), (u) => mix(old, young, u * 1.5 + .5 - age), order ? 4 : 5));
	if (order >= depth) return;
	const n = Math.round(o.laterals ?? 6);
	for (let i = 0; i < n; i++) {
		const at = between(r, .12, .85);
		const bear = r() * Math.PI * 2;
		const longer = between(r, .5, 1);
		const here = at * steps;
		if (here > reach - .6) {
			r();
			continue;
		}
		const k = Math.floor(here);
		const p = path[k].clone().lerp(path[k + 1], here - k);
		const along = path[k + 1].clone().sub(path[k]).normalize();
		const ldir = new three.Vector3(Math.cos(bear), 0, Math.sin(bear)).addScaledVector(along, .35).normalize();
		root(bag, {
			...o,
			key: [...key, i],
			from: p,
			dir: ldir,
			length: length * (o.lateral ?? .35) * longer,
			grown: (reach - here) / (steps * .55),
			radius: radius * .45,
			down: down * .6,
			laterals: Math.round(n * .6),
			order: order + 1,
			age: age * .6,
			floor: o.floor
		});
		r();
	}
}
/**
* SPACE — what a plant has already put where, so that what comes next keeps clear of it: its stems and stakes as rods
* (capsules), its fruit as balls. A fruit looks for a way to hang that touches nothing (`settle`), a leaf turns on its
* stalk away from the fruit and the stems (`steer`). Nothing here is physics: a search, the same every time.
*/
var Space = class {
	constructor() {
		/** @type {{ c: THREE.Vector3, r: number }[]} */
		this.balls = [];
		/** @type {{ a: THREE.Vector3, b: THREE.Vector3, r: number }[]} */
		this.rods = [];
	}
	/** @param {THREE.Vector3} c @param {number} r */
	ball(c, r) {
		this.balls.push({
			c: c.clone(),
			r
		});
	}
	/** a rod along a path, as a capsule per few points @param {THREE.Vector3[]} pts @param {number} r */
	rod(pts, r) {
		const step = Math.max(1, Math.floor(pts.length / 12));
		for (let i = 0; i + step < pts.length; i += step) this.rods.push({
			a: pts[i].clone(),
			b: pts[Math.min(pts.length - 1, i + step)].clone(),
			r
		});
	}
	/** how deep a ball at c of radius r sinks into what is already there (0 when it touches nothing) */
	depth(c, r) {
		let worst = 0;
		for (const b of this.balls) worst = Math.max(worst, r + b.r - c.distanceTo(b.c));
		const ab = new three.Vector3(), ac = new three.Vector3(), q = new three.Vector3();
		for (const s of this.rods) {
			ab.subVectors(s.b, s.a);
			ac.subVectors(c, s.a);
			const t = clamp(ac.dot(ab) / Math.max(1e-12, ab.lengthSq()));
			q.copy(s.a).addScaledVector(ab, t);
			worst = Math.max(worst, r + s.r - c.distanceTo(q));
		}
		return Math.max(0, worst);
	}
	/** how far a set of balls overlaps what is there, all told */
	overlap(shape) {
		let sum = 0;
		for (const s of shape) sum += this.depth(s.c, s.r);
		return sum;
	}
	/**
	* Where a fruit hangs: from `at`, along a direction near `dir`, its stalk perhaps a little longer, so that its
	* balls (`shape(at, dir)`) touch nothing — or as little as can be. It keeps the place, and the fruit's balls are
	* added to the space.
	* @param {THREE.Vector3} at @param {THREE.Vector3} dir
	* @param {(at: THREE.Vector3, dir: THREE.Vector3) => { c: THREE.Vector3, r: number }[]} shape
	* @param {number} reach how far it may lengthen its stalk
	*/
	settle(at, dir, shape, reach) {
		const d0 = dir.clone().normalize();
		let best = {
			at: at.clone(),
			dir: d0,
			cost: Infinity
		};
		const side = new three.Vector3();
		for (const ext of [
			0,
			.5,
			1
		]) {
			for (const swing of [
				0,
				.45,
				.9,
				1.4,
				2
			]) {
				for (let k = 0; k < (swing ? 8 : 1); k++) {
					const a = k / 8 * Math.PI * 2;
					side.set(Math.cos(a), 0, Math.sin(a));
					const d = d0.clone().addScaledVector(side, swing).normalize();
					if (d.y > .35) continue;
					const p = at.clone().addScaledVector(d, ext * reach);
					const balls = shape(p, d);
					let cost = this.overlap(balls) * 10 + swing * .004 + ext * .003;
					for (const b of balls) cost += Math.max(0, b.r - b.c.y) * 10;
					if (cost < best.cost) best = {
						at: p,
						dir: d,
						cost
					};
				}
				if (best.cost < .004 * (swing + .5)) break;
			}
			if (best.cost < .01) break;
		}
		for (const b of shape(best.at, best.dir)) this.ball(b.c, b.r);
		return best;
	}
	/**
	* Of a few ways to place a thing (each its balls, and how much less it is liked than the first), the one that touches
	* least of what is already there — the first that touches nothing. Its balls are added to the space.
	* @template T
	* @param {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: T }[]} options
	* @returns {T}
	*/
	best(options) {
		let pick = options[0], low = Infinity;
		for (const o of options) {
			let cost = this.overlap(o.balls) * 10 + o.cost;
			for (const b of o.balls) cost += Math.max(0, b.r - b.c.y) * 10;
			if (cost < low) {
				low = cost;
				pick = o;
			}
			if (cost <= o.cost + 1e-9) break;
		}
		for (const b of pick.balls) this.ball(b.c, b.r);
		return pick.data;
	}
	/**
	* Which way a leaf reaches: its bearing turned as little as it needs so that its blade (points along it, out from
	* `at`) keeps out of the fruit and the stems.
	* @param {THREE.Vector3} at @param {THREE.Vector3} out level @param {number} lift @param {number} reach @param {number} r
	*/
	steer(at, out, lift, reach, r) {
		let best = {
			out: out.clone(),
			cost: Infinity
		};
		for (const turn of [
			0,
			.3,
			-.3,
			.6,
			-.6,
			.95,
			-.95,
			1.35,
			-1.35,
			1.8,
			-1.8,
			2.4,
			-2.4
		]) {
			const o = out.clone().applyAxisAngle(new three.Vector3(0, 1, 0), turn).setY(0).normalize();
			const d = o.clone().multiplyScalar(Math.cos(lift)).add(new three.Vector3(0, Math.sin(lift), 0));
			const across = new three.Vector3(-o.z, 0, o.x);
			let cost = Math.abs(turn) * .002;
			for (const f of [
				.3,
				.55,
				.8,
				1
			]) {
				const p = at.clone().addScaledVector(d, reach * f).add(new three.Vector3(0, -reach * .12 * f * f, 0));
				cost += this.depth(p, r);
				for (const side of [-1, 1]) cost += this.depth(p.clone().addScaledVector(across, side * reach * .22), r * .8);
			}
			if (cost < best.cost) best = {
				out: o,
				cost
			};
			if (cost < 5e-4) break;
		}
		return best.out;
	}
};

//#endregion
//#region src/lib/plants/sprout.js
/**
* @param {import('./grow.js').Bag} bag
* @param {{
*   seed: string, at: THREE.Vector3, size: THREE.Vector3, coat: string, coatShade: string,
*   stem: number, hook: number, radius: number, stemColor: string,
*   leaf: { length: number, width: number, shape: (u: number) => number, color: string, vein: string },
*   open: number, shed: number, wither: number, keepCoat?: boolean
* }} o — `stem` the hypocotyl's length now, `hook` how bent over it is (1 a hook, 0 straight), `open` how far the seed
*   leaves have spread, `shed` 0 … 1 the coat coming off, `wither` 0 … 1 the seed leaves gone
* @returns {{ top: THREE.Vector3, dir: THREE.Vector3 }} the shoot's tip, and which way it points
*/
function sprout(bag, o) {
	const r = chance(o.seed, "sprout");
	const bearing = Math.atan2(-.9, 1.25) + (r() * 2 - 1) * .4;
	const across = v3(Math.cos(bearing), 0, Math.sin(bearing));
	const axis = new three.Vector3().crossVectors(across, v3(0, 1, 0)).normalize();
	const lean = (r() * 2 - 1) * .12;
	const steps = 14;
	/** @type {THREE.Vector3[]} */
	const path = [o.at.clone()];
	let dir = v3(0, 1, 0).addScaledVector(across, lean).normalize();
	const step = Math.max(1e-6, o.stem / steps);
	for (let i = 0; i < steps; i++) {
		const bend = (i + .5) / steps > .62 ? o.hook * Math.PI * .95 / (steps * .38) : 0;
		dir = dir.clone().applyAxisAngle(axis, -bend).normalize();
		path.push(path[i].clone().addScaledVector(dir, step));
	}
	const top = path[steps];
	const tip = path[steps].clone().sub(path[13]).normalize();
	if (o.stem > o.radius * .5) bag.add("body", tube(path, (u) => o.radius * (1 - .25 * u), (u) => mix("#e9e3c8", o.stemColor, .35 + u * .65), 6));
	const coatAt = o.keepCoat ? o.at : top;
	if (o.shed < 1) {
		const s = o.size.clone().multiplyScalar(1 - .25 * o.shed);
		const turn = new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), o.keepCoat || o.stem < o.radius ? across : tip);
		const lift = o.keepCoat ? v3(0, 0, 0) : tip.clone().multiplyScalar(o.size.x * .6);
		bag.add("body", bead(coatAt.clone().add(lift), s, mix(o.coat, o.coatShade, o.shed), 7, turn));
	}
	if (o.wither < 1 && o.stem > o.radius) {
		const shrink = 1 - .45 * o.wither;
		const grown = lerp(.35, 1, clamp(o.open * 1.3));
		for (const side of [-1, 1]) {
			const spread = lerp(.08, 1.35 + (r() - .5) * .2, o.open) + o.wither * .35;
			const d = tip.clone().multiplyScalar(Math.cos(spread)).addScaledVector(across, side * Math.sin(spread)).normalize();
			const len = o.leaf.length * grown * shrink;
			const leaf = sheet({
				length: len,
				width: o.leaf.width * grown * shrink,
				shape: o.leaf.shape,
				lift: (u, v) => .06 * v * v - .05 * u * u * (1 + o.wither * 4),
				paint: (u, v) => mix(mix(o.leaf.color, o.leaf.vein, Math.abs(v) < .12 ? .6 : 0), "#d9c45a", o.wither * 1.2 - .1 + u * o.wither * .4),
				along: 10,
				across: 6
			});
			bag.add("sheet", leaf, aim(top, d, side * (1 - o.open) * 1.4));
		}
	}
	return {
		top,
		dir: tip
	};
}

//#endregion
//#region src/lib/plants/bloom.js
/**
* @typedef {{
*   petals: number, length: number, width: number, colour: string, heart: string, shape?: (u: number) => number,
*   sepals?: number, sepal?: number, sepalColour?: string, sepalBack?: number, stamens?: number, stamenColour?: string,
*   cone?: boolean, flat?: number
* }} Kind — `sepalBack` how far the sepals bend back (radians), `cone` a tomato's cone of anthers in place of a
*   cushion, `flat` how far the open petals lie back (0 level, more for a reflexed star)
*/
/**
* @param {import('./grow.js').Bag} bag
* @param {Kind} kind
* @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} size
* @param {number} open 0 … 1 the bud opening @param {number} fall 0 … 1 the petals dropping
*/
function bloom(bag, kind, at, facing, size, open, fall) {
	const m = new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), facing.clone().normalize()), v3(size, size, size));
	const turn = (a, up) => new three.Matrix4().makeRotationY(-a).multiply(new three.Matrix4().makeRotationZ(up));
	const sepals = kind.sepals ?? 10;
	for (let k = 0; k < sepals; k++) {
		const sepal = sheet({
			length: (kind.sepal ?? .008) * (sepals > 6 && k % 2 ? .75 : 1),
			width: (kind.sepal ?? .008) * .22,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)) * (1 - u * .6),
			lift: (u) => -.15 * u,
			paint: () => kind.sepalColour ?? "#5f8f34",
			along: 6,
			across: 2
		});
		bag.add("sheet", sepal, m.clone().multiply(turn(k / sepals * Math.PI * 2 + .3, -(kind.sepalBack ?? .25) * lerp(.3, 1, open))));
	}
	if (fall < 1) {
		const shape = kind.shape ?? ((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .55));
		for (let k = 0; k < kind.petals; k++) {
			const petal = sheet({
				length: kind.length * lerp(.4, 1, open),
				width: kind.width * lerp(.4, 1, open),
				shape,
				lift: (u, v) => .12 * u * u + .04 * v * v,
				paint: (u) => mix(kind.colour, "#fffdf6", kind.colour.startsWith("#f") ? u * .4 : 0),
				along: 10,
				across: 6
			});
			const up = lerp(1.25, .12 - (kind.flat ?? 0), open) - fall * .9;
			bag.add("sheet", petal, m.clone().multiply(new three.Matrix4().makeTranslation(0, 6e-4, 0)).multiply(turn(k / kind.petals * Math.PI * 2, up)).multiply(new three.Matrix4().makeScale(1 - fall * .6, 1, 1 - fall * .6)));
		}
	}
	if (kind.cone) {
		bag.add("body", bead(v3(0, .003, 0).applyMatrix4(m), v3(.0018, .0042, .0018).multiplyScalar(size), fall > .5 ? "#a99a3a" : kind.heart, 6));
		return;
	}
	bag.add("body", bead(v3(0, .0012, 0).applyMatrix4(m), v3(.0034, .0022, .0034).multiplyScalar(size), fall > .5 ? "#bfc35a" : kind.heart, 8));
	const stamens = kind.stamens ?? 20;
	for (let k = 0; k < stamens; k++) {
		const a = k / stamens * Math.PI * 2;
		bag.add("body", bead(v3(Math.cos(a) * .0042, .0018, Math.sin(a) * .0042).applyMatrix4(m), v3(6e-4, 6e-4, 6e-4).multiplyScalar(size), fall > .5 ? "#9c7a3a" : kind.stamenColour ?? "#e9b52a", 2));
	}
}

//#endregion
//#region src/lib/plants/tree.js
/** @typedef {{ pts: THREE.Vector3[], tip: THREE.Vector3, dir: THREE.Vector3, order: number, key: (string | number)[], grown: number, end: boolean, length: number }} Limb */
/**
* @param {import('./grow.js').Bag} bag
* @param {{
*   seed: string, key: (string | number)[], from: THREE.Vector3, dir: THREE.Vector3, length: number, grown: number,
*   radius: number, up?: number, wander?: number, spread?: number, children?: number, shorten?: [number, number],
*   depth?: number, order?: number, young: string, old: string, age?: number, out: Limb[], from0?: number, sides?: number
* }} o — `up` how strongly it turns to the light, `spread` how far its limbs leave it (radians), `children` how many,
*   `shorten` a limb's length against its parent's, `from0` how far along it the limbs start (0 … 1), `grown` how far
*   it has grown: past 1 it is full length and the rest goes on into its limbs (a tree of three orders, about 3)
*/
function limb(bag, o) {
	const r = chance(o.seed, "limb", ...o.key);
	const grown = clamp(o.grown);
	if (grown <= .003) return;
	const order = o.order ?? 0, depth = o.depth ?? 3;
	const up = o.up ?? .08, wander = o.wander ?? .12;
	const steps = order ? 6 : 10;
	const step = o.length / steps;
	/** the whole path, drawn in full every time */
	const path = [o.from.clone()];
	const dir = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		dir.y += up;
		dir.x += (r() * 2 - 1) * wander;
		dir.z += (r() * 2 - 1) * wander;
		dir.normalize();
		path.push(path[i].clone().addScaledVector(dir, step));
	}
	const reach = grown * steps;
	/** its growth beyond its own length, for its limbs */
	const reachAll = Math.max(0, o.grown) * steps;
	const whole = Math.floor(reach);
	const pts = path.slice(0, whole + 1);
	if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
	if (pts.length < 2) return;
	const r0 = o.radius * (.1 + .9 * Math.pow(grown, 1.5));
	const age = clamp(o.age ?? 0);
	bag.add("body", tube(pts, (u) => r0 * (1 - .65 * u), (u) => mix(o.old, o.young, u * 1.4 - age + .4), o.sides ?? (order ? 5 : 8)));
	const tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
	let end = true;
	const n = order < depth ? o.children ?? 3 : 0;
	const [s0, s1] = o.shorten ?? [.5, .75];
	for (let i = 0; i < n; i++) {
		const at = i === n - 1 ? 1 : between(r, o.from0 ?? .35, .92);
		const turn = r() * Math.PI * 2;
		const tilt = between(r, .6, 1) * (o.spread ?? .75) * (i === n - 1 ? .45 : 1);
		const short = between(r, s0, s1);
		const here = at * steps;
		if (here > reachAll - .4) continue;
		if (at === 1) end = false;
		const k = Math.min(steps - 1, Math.floor(here));
		const p = path[k].clone().lerp(path[k + 1], here - k);
		const along = path[k + 1].clone().sub(path[k]).normalize();
		const side = new three.Vector3().crossVectors(along, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
		side.normalize().applyAxisAngle(along, turn);
		const d = along.clone().applyAxisAngle(side, tilt);
		limb(bag, {
			...o,
			key: [...o.key, i],
			from: p,
			dir: d,
			length: o.length * short,
			grown: (reachAll - here) / (steps * .7),
			radius: o.radius * (at === 1 ? .75 : .6),
			order: order + 1,
			age: age * .7
		});
	}
	o.out.push({
		pts,
		tip: pts[pts.length - 1].clone(),
		dir: tipDir,
		order,
		key: o.key,
		grown,
		end,
		length: o.length * grown
	});
}

//#endregion
//#region src/lib/plants/eggplant.js
const STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "A flat, kidney-shaped tan seed, half a centimetre down: eggplants want the soil warm, 25 °C and more."
	},
	{
		name: "Germination",
		day: 8,
		note: "The radicle goes down; the hypocotyl hooks up into the light."
	},
	{
		name: "Seed leaves",
		day: 14,
		note: "Two oval cotyledons on a short stem."
	},
	{
		name: "True leaves",
		day: 30,
		note: "The first true leaves: soft, felted, grey-green, the midrib already purple."
	},
	{
		name: "Bushing",
		day: 55,
		note: "Planted out, the stem forks into a bush of big wavy leaves."
	},
	{
		name: "Flowering",
		day: 70,
		note: "Nodding violet stars in the leaf axils, a yellow cone of anthers at their heart."
	},
	{
		name: "Fruit set",
		day: 80,
		note: "The petals fall; under each spiny green calyx a little violet fruit swells."
	},
	{
		name: "Swelling",
		day: 95,
		note: "The fruit lengthen and darken, hanging under the leaves."
	},
	{
		name: "Glossy",
		day: 105,
		note: "Full-sized and deep purple, the skin taut and shining: the time to pick."
	},
	{
		name: "Harvest",
		day: 115,
		note: "Branch after branch of black-purple fruit, new flowers still opening above."
	}
];
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.006, 0))();
/** the eggplant's leaf: broad, ovate, its edge in shallow waves */
function leafShape(u) {
	return Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .68) * (1 - .15 * u) * (1 + .1 * Math.sin(u * Math.PI * 5.5) * (u > .1 ? 1 : 0));
}
/** an eggplant flower: five or six violet petals in a star, the anthers a yellow cone, the calyx purple-green */
const FLOWER = {
	petals: 6,
	length: .019,
	width: .011,
	colour: "#8d6cb8",
	heart: "#f0c419",
	cone: true,
	flat: .25,
	sepals: 6,
	sepal: .012,
	sepalBack: .2,
	sepalColour: "#5f5a4a",
	shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .7)
};
/**
* The eggplant at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function eggplant(g, seed) {
	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .1);
	const s = sprout(bag, {
		seed,
		at: SEED_AT,
		size: v3(.0016, 5e-4, .0013),
		coat: "#d2b98a",
		coatShade: "#a68a5a",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .011],
			[2, .03],
			[3, .034],
			[9, .036]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .0011 + .004 * span(g, 2, 6),
		stemColor: "#6e7a48",
		leaf: {
			length: .02,
			width: .0075,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .65),
			color: "#5a8a3c",
			vein: "#98bb78"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 4.3, 5.2)
	});
	root(bag, {
		seed,
		key: ["taproot"],
		from: SEED_AT.clone(),
		dir: v3(.03, -1, 0),
		length: .42,
		grown: table(g, [
			[0, 0],
			[.35, .006],
			[1, .05],
			[2, .14],
			[3, .3],
			[4, .6],
			[5, .85],
			[7, 1]
		]),
		radius: .0024,
		down: .04,
		wander: .15,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 6),
		young: "#f7f1e0",
		old: "#c4a37a"
	});
	const lr = chance(seed, "laterals");
	for (let i = 0; i < 26; i++) {
		const at = .005 + i * .012 + lr() * .005;
		const born = 1.3 + i * .14;
		const bear = i * 2.39996 + lr() * .5;
		root(bag, {
			seed,
			key: ["lateral", i],
			from: SEED_AT.clone().add(v3(0, -at, 0)),
			dir: v3(Math.cos(bear), -.4, Math.sin(bear)),
			length: between(lr, .12, .28) * vigour,
			grown: (g - born) / 2.6,
			radius: .0012,
			down: .05,
			wander: .3,
			laterals: 7,
			lateral: .3,
			depth: 2,
			age: (g - born - 1) / 3,
			young: "#f6efdc",
			old: "#bf9c72"
		});
	}
	/** @type {import('./tree.js').Limb[]} */
	const limbs = [];
	limb(bag, {
		seed,
		key: ["stem"],
		from: s.top.clone(),
		dir: v3(0, 1, 0),
		length: .42 * vigour,
		grown: table(g, [
			[2.1, 0],
			[3, .12],
			[4, .6],
			[5, 1.3],
			[6, 1.75],
			[7, 2],
			[9, 2.15]
		]),
		radius: .0085,
		up: .05,
		wander: .1,
		spread: .75,
		children: 3,
		shorten: [.6, .85],
		depth: 2,
		from0: .45,
		young: "#7c8a52",
		old: "#5e4f5c",
		age: span(g, 4, 8),
		out: limbs
	});
	const space = bag.space;
	for (const l of limbs) space.rod(l.pts, .008 * (l.order ? .6 : 1) + .004);
	/** the leaves wait until the fruit hang, then turn away from them @type {(() => void)[]} */
	const leaves = [];
	let flowered = 0;
	for (const l of limbs) {
		const total = l.length;
		const lr2 = chance(seed, "leaves", ...l.key);
		let s0 = .03 + lr2() * .03;
		for (let k = 0; k < 9; k++, s0 += between(lr2, .055, .08)) {
			const past = total - s0;
			const bear = k * 2.4 + lr2() * .5;
			const size = about(lr2, 1, .12) * vigour * lerp(.55, 1, clamp(g - 3));
			if (past <= 0) continue;
			const { p } = along(l.pts, s0 / total);
			const old = l.order === 0 && k < 3 ? span(g, 7 + k * .4, 8.5 + k * .4) : 0;
			const grownLeaf = clamp(past / .1);
			if (old < 1) leaves.push(() => leaf(bag, p, space.steer(p, v3(Math.cos(bear), 0, Math.sin(bear)), -.1, .24 * size, .035 * size), size, grownLeaf, old));
			if (l.order >= 1 && k === 1 && flowered < 9) {
				flowered++;
				blossom(bag, seed, [...l.key, k], p, v3(Math.cos(bear + Math.PI), 0, Math.sin(bear + Math.PI)), g, vigour, space);
			}
		}
	}
	for (const leaf of leaves) leaf();
	return bag.build();
}
/** a point along a limb's path at u (0 … 1 of its grown length) */
function along(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return {
		p: pts[k].clone().lerp(pts[k + 1], f - k),
		d: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/**
* An eggplant leaf: a stout purple-tinged stalk and a broad soft wavy blade, hanging out and down.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} size @param {number} grown @param {number} old
*/
function leaf(bag, at, out, size, grown, old) {
	const len = .06 * size * lerp(.3, 1, grown);
	const stalkDir = out.clone().multiplyScalar(.7).add(v3(0, lerp(1, .55, grown) - old * .6, 0)).normalize();
	const end = at.clone().addScaledVector(stalkDir, len);
	bag.add("body", tube([
		at,
		at.clone().lerp(end, .5).add(v3(0, len * .08, 0)),
		end
	], (u) => .0022 * size * (1 - .3 * u), () => mix("#6f6a52", "#b9a14a", old), 5));
	const blade = .2 * size * lerp(.25, 1, grown);
	const tilt = lerp(.9, -.35, grown) - old * .6;
	const dir = out.clone().multiplyScalar(Math.cos(tilt)).add(v3(0, Math.sin(tilt), 0)).normalize();
	const fold = (1 - grown) * .7 + .05;
	bag.add("sheet", sheet({
		length: blade,
		width: blade * .36,
		shape: leafShape,
		lift: (u, v) => fold * Math.abs(v) * .3 - .1 * u * u + .025 * Math.sin(u * Math.PI * 7) * v * v,
		paint: (u, v) => {
			const vein = Math.abs(v) < .07 ? .7 : 0;
			const green = mix(mix("#57774a", "#7fa262", 1 - grown), "#7a4f7e", vein * (1 - u * .6));
			return old ? green.lerp(mix("#c9b04a", "#9a7a3a", u), clamp(old * 1.3)) : green;
		},
		along: 22,
		across: 6
	}), aim(end, dir));
}
/**
* A flower in a leaf axil, nodding on its stalk; then the fruit it sets, under its spiny calyx, growing long and dark.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} g @param {number} vigour
* @param {Space} space
*/
function blossom(bag, seed, key, at, out, g, vigour, space) {
	const fr = chance(seed, "eggplant-flower", ...key);
	const opens = 4.4 + fr() * 1.3;
	const bud = clamp((g - (opens - .35)) / .35);
	if (bud <= 0) return;
	const set = span(g, opens + .4, opens + 2.3);
	const hang = clamp(set * 1.5);
	const d = out.clone().multiplyScalar(.6).add(v3(0, .2 - hang * 1.1, 0)).normalize();
	const end = at.clone().addScaledVector(d, .035);
	if (set < .03) bag.add("body", tube([at, end], () => .0018, () => "#6a6150", 5));
	const facing = d.clone().lerp(v3(0, -1, 0), .4).normalize();
	if (g < opens) bag.add("body", bead(end.clone().addScaledVector(facing, .006), v3(.004, .008, .004).multiplyScalar(.5 + bud * .5), mix("#5f5a4a", "#8d6cb8", bud * .7)));
	else if (set < .03) bloom(bag, FLOWER, end, facing, 1.4, clamp((g - opens) / .2), span(g, opens + .25, opens + .4));
	else {
		const size = vigour * about(fr, 1, .12);
		const place = space.settle(end, d.clone().lerp(v3(0, -1, 0), .6), (a, dd) => fruitBalls(a, dd, size, set), .05);
		bag.fruit(key, at, place.dir);
		bag.add("body", tube([
			at,
			end,
			place.at
		], () => .0018 + .0018 * set, () => "#6a6150", 5));
		fruit(bag, {
			seed,
			key,
			at: place.at,
			dir: place.dir,
			size,
			set,
			gloss: span(g, opens + 1.2, opens + 2.5)
		});
		bag.fruitDone();
	}
}
/** the room an eggplant takes: three balls down its length, the last the broadest */
function fruitBalls(at, dir, size, set) {
	const L = .2 * size * lerp(.12, 1, set);
	const R = L * .25;
	return [
		.22,
		.52,
		.8
	].map((f, i) => ({
		c: at.clone().addScaledVector(dir, .004 + L * f),
		r: R * [
			.75,
			.92,
			1
		][i]
	}));
}
/**
* An eggplant: long and full, broadest toward its end, glossy; pale violet when small, deep black-purple full-grown. A
* big green calyx with soft spines clasps its top.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, set: number, gloss: number }} o
*/
function fruit(bag, o) {
	const fr = chance(o.seed, "eggplant", ...o.key);
	const L = .2 * o.size * lerp(.12, 1, o.set);
	const R = L * between(fr, .22, .27);
	const bend = about(fr, 0, .12);
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), o.dir), v3(1, 1, 1));
	const axis = [];
	for (let k = 0; k <= 18; k++) {
		const u = k / 18;
		axis.push(v3(bend * L * u * u, -.004 - u * L, 0));
	}
	const radius = (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .08 + u * .92))), .45) * (.68 + .32 * u);
	const colour = mix(mix("#9c78c0", "#4a2560", o.set), "#2a1236", o.gloss);
	bag.add("gloss", tube(axis, radius, (u) => colour.clone().lerp(new three.Color("#5b3a6e"), (1 - u) * .15), 18), m);
	const cap = [];
	for (let k = 0; k <= 5; k++) cap.push(v3(0, -.001 - k / 5 * L * .12, 0));
	bag.add("body", tube(cap, (u) => radius(.02 + u * .1) * 1.05 + .002, () => "#5c7a3c", 12), m);
	for (let k = 0; k < 6; k++) {
		const lobe = sheet({
			length: L * .2 + .01,
			width: R * .35,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)) * (1 - .6 * u),
			lift: (u) => -.35 * u * u,
			paint: (u) => mix("#5c7a3c", "#7f9a52", u),
			along: 6,
			across: 2
		});
		bag.add("sheet", lobe, m.clone().multiply(new three.Matrix4().makeRotationY(k / 6 * Math.PI * 2 + fr())).multiply(new three.Matrix4().makeTranslation(radius(.06) * 1.02, -.004, 0)).multiply(new three.Matrix4().makeRotationZ(-1.25)));
	}
}

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/plants/fruit.js
/** @typedef {import('./grow.js').Fruit} Fruit */
/** a fruit's size: the longest side of its bounds */
function sizeOf(f) {
	const b = new three.Box3();
	for (const p of f.parts) {
		p.geometry.computeBoundingBox();
		b.union(p.geometry.boundingBox);
	}
	const s = b.getSize(new three.Vector3());
	return Math.max(s.x, s.y, s.z);
}
/**
* A plant grown from `seed` to its last stage, ripe, once for all the viewer needs of it then: the plant itself, the
* fruit it bears and which of them the seed picks — one of the well-grown ones, not a straggler (`fruit` undefined if
* it bears none).
* @param {(g: number, seed: string) => THREE.Group} grow @param {number} last @param {string} seed
* @returns {{ plant: THREE.Group, fruit: { keys: string[], pick: string } | undefined }}
*/
function ripeOf(grow, last, seed) {
	const { plant, fruits } = pickFruit(() => grow(last, seed));
	return {
		plant,
		fruit: fruits.length ? pick$1(fruits, seed) : void 0
	};
}
/** of a plant's fruit, the well-grown ones, and the one the seed picks @param {Fruit[]} fruits @param {string} seed */
function pick$1(fruits, seed) {
	const sized = fruits.map((f) => ({
		key: f.key,
		size: sizeOf(f)
	}));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * .7);
	const r = chance(seed, "one-fruit");
	return {
		keys: good.map((f) => f.key),
		pick: good[Math.floor(r() * good.length)].key
	};
}
/**
* The fruit named `key` of the plant grown from `seed` at `g`, on its own: hanging from its stalk at the origin, its
* own small differences given it by the seed. Undefined if it has not set yet at g.
* @param {(g: number, seed: string) => THREE.Group} grow @param {number} g @param {string} seed @param {string} key
* @returns {THREE.Group | undefined}
*/
function oneFruit(grow, g, seed, key) {
	const { plant, fruits } = lite({ fruit: key }, () => pickFruit(() => grow(g, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return void 0;
	const hang = new three.Matrix4().makeRotationFromQuaternion(new three.Quaternion().setFromUnitVectors(f.dir, new three.Vector3(0, -1, 0))).multiply(new three.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	for (const p of f.parts) p.geometry.applyMatrix4(hang);
	vary(f, chance(seed, "one-fruit-shape", key));
	const group = new three.Group();
	/** @type {Record<string, THREE.BufferGeometry[]>} */
	const kinds = {};
	for (const p of f.parts) (kinds[p.kind === "prop" ? "body" : p.kind] ??= []).push(p.geometry);
	for (const [kind, list] of Object.entries(kinds)) {
		const merged = list.length === 1 ? list[0] : (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(list);
		if (list.length > 1) for (const g of list) g.dispose();
		if (!merged) continue;
		const mesh = new three.Mesh(merged, material(kind));
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	return group;
}
/**
* A fruit's own small differences, worked into its pieces where they hang (stalk at the origin, body down -y).
* @param {Fruit} f @param {() => number} r
*/
function vary(f, r) {
	const box = new three.Box3();
	for (const p of f.parts) box.union(new three.Box3().setFromBufferAttribute(p.geometry.attributes.position));
	const L = Math.max(1e-4, -box.min.y);
	const mid = box.getCenter(new three.Vector3());
	const size = about(r, 1, .1);
	const long = about(r, 1, .08);
	const flat = about(r, 0, .06);
	const lop = between(r, 0, .07), lopAt = r() * Math.PI * 2;
	const bend = about(r, 0, .05), bendAt = r() * Math.PI * 2;
	const lump = about(r, 0, .05), lumpAt = r() * Math.PI * 2, lumpU = between(r, .3, .8);
	const hue = about(r, 0, .012), sat = about(r, 0, .07), light = about(r, 0, .045), sunAt = r() * Math.PI * 2, sun = between(r, .02, .07);
	const p = new three.Vector3(), c = new three.Color(), hsl = {
		h: 0,
		s: 0,
		l: 0
	};
	for (const part of f.parts) {
		const pos = part.geometry.attributes.position;
		const col = part.geometry.attributes.color;
		for (let i = 0; i < pos.count; i++) {
			p.fromBufferAttribute(pos, i);
			const u = clamp(-p.y / L);
			const w = clamp((u - .04) / .25);
			const x = p.x - mid.x, z = p.z - mid.z;
			const a = Math.atan2(z, x);
			const body = Math.sin(Math.PI * u);
			const k = 1 + w * (lop * Math.cos(a - lopAt) * body + lump * Math.exp(-Math.pow((u - lumpU) / .18, 2)) * Math.max(0, Math.cos(a - lumpAt)));
			const sx = (1 + w * flat) / Math.sqrt(lerp1(long, w));
			const sz = (1 - w * flat) / Math.sqrt(lerp1(long, w));
			const nx = mid.x + x * k * sx + w * bend * L * body * Math.cos(bendAt);
			const nz = mid.z + z * k * sz + w * bend * L * body * Math.sin(bendAt);
			const ny = p.y * lerp1(long, w);
			pos.setXYZ(i, nx * size, ny * size, nz * size);
			if (col && w > 0) {
				c.fromBufferAttribute(col, i);
				c.getHSL(hsl);
				const lit = sun * Math.max(0, Math.cos(a - sunAt)) * body;
				c.setHSL((hsl.h + hue * w + 1) % 1, clamp(hsl.s * (1 + sat * w)), clamp(hsl.l * (1 + light * w) + lit * w));
				col.setXYZ(i, c.r, c.g, c.b);
			}
		}
		pos.needsUpdate = true;
		if (col) col.needsUpdate = true;
		if (part.kind !== "sheet") smoothNormals(part.geometry);
		else part.geometry.computeVertexNormals();
	}
}
/** a factor that comes in from 1 as w goes 0 … 1 */
const lerp1 = (x, w) => 1 + (x - 1) * w;
const dispose = (o) => o.traverse((m) => m.geometry?.dispose());

//#endregion
//#region src/lib/plants/index.js
/** @typedef {{ name: string, day: number, note: string }} Stage */
/**
* @typedef {{
*   id: string, label: string, latin: string, note: string, from: string, stages: Stage[],
*   grow: (stage: number, seed: string) => import('three').Group, layer?: Layer
* }} Plant — `grow` builds it at a stage (0 … 9, the stages' indices; between them, on the way)
*/
/** @type {Plant[]} */
const ALL = [{
	id: "eggplant",
	label: "Eggplant",
	latin: "Solanum melongena · Aubergine",
	note: "A forked bush of big soft grey-green leaves with purple midribs, nodding violet stars, long glossy black-purple fruit under spiny green calyxes.",
	from: "Bush · 115 days",
	stages: STAGES,
	grow: eggplant
}];
/** seed ids to start from: any text grows a plant */
/**
* THE SEVEN LAYERS of a food forest, as permaculture plants one — from the canopy down through the soil, and up the
* others: every plant here is put in the one it grows in when grown, and the list is shown layer by layer. The fungi,
* the mycelium threading the soil and feeding the roots, are the eighth layer some count.
* @typedef {'canopy' | 'sub-canopy' | 'shrub' | 'herbaceous' | 'ground' | 'root' | 'climber' | 'fungi'} Layer
*/
/** @type {{ id: Layer, label: string, note: string }[]} */
const LAYERS = [
	{
		id: "canopy",
		label: "1 · Canopy",
		note: "the tall trees over everything"
	},
	{
		id: "sub-canopy",
		label: "2 · Low trees",
		note: "the smaller trees under the canopy: fruit and nut trees, the big herbs that stand like them"
	},
	{
		id: "shrub",
		label: "3 · Shrubs",
		note: "the bushes: berries, woody herbs"
	},
	{
		id: "herbaceous",
		label: "4 · Herbaceous",
		note: "soft plants that die back or are grown each year: vegetables and herbs"
	},
	{
		id: "ground",
		label: "5 · Ground cover",
		note: "low and spreading over the soil, keeping it covered"
	},
	{
		id: "root",
		label: "6 · Roots",
		note: "grown for what they swell below the soil: roots, tubers, bulbs"
	},
	{
		id: "climber",
		label: "7 · Climbers",
		note: "vines that climb the trees, the stakes and the wires"
	},
	{
		id: "fungi",
		label: "8 · Fungi",
		note: "the mycelium in the soil and the wood, and the mushrooms it fruits"
	}
];
/** which layer each plant grows in */
const LAYER_OF = {
	"king-coconut": "canopy",
	mango: "canopy",
	durian: "canopy",
	jackfruit: "canopy",
	avocado: "canopy",
	safou: "canopy",
	sapodilla: "canopy",
	persimmon: "sub-canopy",
	mulberry: "sub-canopy",
	fig: "sub-canopy",
	pomegranate: "sub-canopy",
	olive: "sub-canopy",
	cacao: "sub-canopy",
	coffee: "shrub",
	lavender: "shrub",
	comfrey: "herbaceous",
	chard: "herbaceous",
	kale: "herbaceous",
	clover: "ground",
	ginger: "root",
	beans: "climber",
	apple: "sub-canopy",
	pear: "sub-canopy",
	cherry: "sub-canopy",
	peach: "sub-canopy",
	apricot: "sub-canopy",
	plum: "sub-canopy",
	orange: "sub-canopy",
	lemon: "sub-canopy",
	soursop: "sub-canopy",
	papaya: "sub-canopy",
	banana: "sub-canopy",
	"red-banana": "sub-canopy",
	raspberry: "shrub",
	blueberry: "shrub",
	rosemary: "shrub",
	sage: "shrub",
	tomato: "herbaceous",
	oxheart: "herbaceous",
	eggplant: "herbaceous",
	pepper: "herbaceous",
	lettuce: "herbaceous",
	pineapple: "herbaceous",
	basil: "herbaceous",
	parsley: "herbaceous",
	chives: "herbaceous",
	mint: "herbaceous",
	"lemon-balm": "herbaceous",
	dill: "herbaceous",
	coriander: "herbaceous",
	strawberry: "ground",
	thyme: "ground",
	oregano: "ground",
	pumpkin: "ground",
	moss: "ground",
	"wild-garlic": "ground",
	carrot: "root",
	radish: "root",
	garlic: "root",
	cucumber: "climber",
	grape: "climber",
	"passion-fruit": "climber",
	"wine-cap": "fungi",
	shiitake: "fungi",
	oyster: "fungi"
};
/**
* The plants' older versions, by id, each with its frozen `grow` ($lib/app/versions.js): a plant changed goes up a
* version, its old grow function kept here, so the worlds anchored to it (Sandbox 5) grow it as they were planted.
* Plants changed since their first version keep each older one here.
* @type {Record<string, (import('../app/versions.js').Change & { build?: Plant['grow'] })[]>}
*/
const HISTORY = /* @__PURE__ */ (() => ({}))();
const SEEDS = [
	"maia",
	"isar",
	"samuel",
	"backyard",
	"seed-0042",
	"sun",
	"rain",
	"domes"
];
/**
* What a plant is grown with, in the order `grow` takes it ($lib/assets/params.js): its stage, from seed to ripe fruit
* (between two stages, on the way), and its seed id.
* @param {{ stages: Stage[] }} p @returns {import('$lib/assets/params.js').Param[]}
*/
const paramsOf = (p) => [
	{
		id: "stage",
		label: "Stage",
		type: "number",
		min: 0,
		max: p.stages.length - 1,
		value: p.stages.length - 1,
		names: p.stages.map((s) => s.name)
	},
	{
		id: "seed",
		label: "Seed",
		type: "string",
		value: SEEDS[0],
		maxLength: 40
	},
	{
		id: "detail",
		label: "Detail",
		type: "number",
		min: .05,
		max: 1,
		step: .05,
		value: 1
	},
	{
		id: "fruit",
		label: "View",
		type: "integer",
		min: 0,
		max: 1,
		value: 0,
		names: ["Plant", "Fruit"]
	}
];
/**
* A version's grow, taking a detail as well: at 1 (or none) grown as it always was, below grown lighter (./grow.js
* `lite`); and with `fruit` 1, one of its fruit on its own instead of the whole plant (./fruit.js: the one its seed
* picks of the fruit it bears ripe at its `last` stage, as it is at `stage`). Every version takes both, as every
* version grows through the same detail and bears its fruit the same way.
* @param {(stage: number, seed: string) => any} grow @param {number} last
*/
const detailed = (grow, last) => (stage, seed, detail, fruit) => {
	const made = fruit ? () => fruitOf(grow, last, stage, seed) : () => grow(stage, seed);
	return detail === void 0 || detail >= 1 ? made() : lite(detailAt(detail), made);
};
/**
* One fruit of a plant on its own, or, when there is none to show, nothing with a note saying why.
* @param {(stage: number, seed: string) => any} grow @param {number} last @param {number} stage @param {string} seed
*/
function fruitOf(grow, last, stage, seed) {
	const { plant, fruit } = ripeOf(grow, last, seed);
	plant.traverse((o) => o.geometry?.dispose());
	const one = fruit && oneFruit(grow, stage, seed, fruit.pick);
	if (one) return one;
	const none = new three.Group();
	none.userData.note = fruit ? "This fruit has not set yet." : "This plant bears no fruit.";
	return none;
}
/**
* every plant, layer by layer from the canopy down (in each layer as they were added), with its versions and what it
* is grown with
* @type {(Plant & { versions: import('../app/versions.js').Version<Plant['grow']>[], version: number, params: import('$lib/assets/params.js').Param[] })[]}
*/
const PLANTS = /* @__PURE__ */ (() => versioned(LAYERS.flatMap((l) => [...ALL].filter((p) => (p.layer ?? LAYER_OF[p.id] ?? "herbaceous") === l.id).map((p) => ({
	...p,
	layer: l.id,
	params: paramsOf(p)
}))), "grow", HISTORY).map((p) => ({
	...p,
	versions: p.versions.map((ver) => typeof ver.build === "function" ? {
		...ver,
		build: detailed(ver.build, p.stages.length - 1)
	} : ver)
})))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("plants", PLANTS, id, v, variant);
const list = () => recipesIn(PLANTS);

//#endregion
exports.list = list;
exports.recipe = recipe;