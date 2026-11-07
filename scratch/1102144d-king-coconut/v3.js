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
	if (DETAIL.finest > 0 && Math.max(radius(0, 0), radius(.5, 0)) < DETAIL.finest) return made$1([], [], [], [], [], false);
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
	return made$1(pos, nor, uv, col, idx, false);
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
	return made$1(pos, nor, uv, col, idx, true);
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
function made$1(pos, nor, uv, col, idx, flat) {
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new three.Float32BufferAttribute(nor, 3));
	g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
	g.setAttribute("color", new three.Float32BufferAttribute(col, 3));
	g.setIndex(idx);
	if (flat) {
		g.computeVertexNormals();
		const n = g.attributes.normal;
		for (let i = 0; i < n.count; i++) if (n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2 < 1e-12) n.setXYZ(i, 0, 1, 0);
	}
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
//#region src/lib/plants/coconut.js
const STAGES = [
	{
		name: "Seed nut",
		day: 0,
		note: "The whole golden husked nut, laid on its side half sunk in moist soil: the seed of a palm is its fruit."
	},
	{
		name: "Germination",
		day: 120,
		note: "A pointed spike breaks out of the nut’s stem end, roots push down through the husk."
	},
	{
		name: "Seedling",
		day: 240,
		note: "The first leaves, whole and split only at their tip; the seedling still feeds on the nut."
	},
	{
		name: "Young palm",
		day: 540,
		note: "Its leaves start to split into leaflets; the nut beside it, spent, rots away."
	},
	{
		name: "Juvenile",
		day: 1100,
		note: "A broad base, no trunk yet, a fountain of pinnate fronds two metres long."
	},
	{
		name: "Flowering",
		day: 2e3,
		note: "A grey trunk ringed with leaf scars; boat-shaped spathes split and the cream flower spikes open."
	},
	{
		name: "Fruit set",
		day: 2100,
		note: "Green-gold buttons set on the branched spikes; many drop, the best hold on."
	},
	{
		name: "Young nuts",
		day: 2250,
		note: "Bunches of bright golden-orange nuts, full of sweet water: the king coconut’s drinking stage."
	},
	{
		name: "Maturing",
		day: 2380,
		note: "The nuts fill their shells with white meat, a new bunch every month above them."
	},
	{
		name: "Ripe",
		day: 2480,
		note: "Heavy bunches dulling to orange-brown under a crown of thirty fronds; the palm keeps fruiting for decades."
	},
	{
		name: "Bearing palm",
		day: 3652,
		note: "Ten years old, in full bearing: a bunch from every leaf axil, a dozen hanging at once, the ringed grey trunk a third of its height."
	},
	{
		name: "Grown palm",
		day: 8036,
		note: "Twenty-two years old: the tall palm people know, a slender ringed grey trunk curving up to a round crown of thirty arching fronds."
	},
	{
		name: "Old palm",
		day: 18262,
		note: "Fifty years old: a tall bare trunk, rings close together near its top, a smaller crown of shorter fronds; it still bears."
	}
];
/** the stage worlds draw when they name none: the grown palm */
const GROWN = 11;
/**
* The palm's age in days at a stage: its stage's `day` (between two stages, on the way). Every size below is a
* function of this age, never of a stage's index, so a stage added or moved changes no other stage's size.
* @param {number} g
*/
function dayAt(g) {
	const i = clamp(Math.floor(g), 0, STAGES.length - 2);
	return lerp(STAGES[i].day, STAGES[i + 1].day, clamp(g - i));
}
/** the day of its first ripe nuts, after which its oldest bunches are cut */
const FIRST_CROP = 2480;
/**
* The king coconut by age (days from sowing), from its data sheet (the card's `datasheet`). Up to day 2480 (Ripe) the
* young palm as v2 drew it; after it the intermediate palm the Coconut Research Institute measured (Liyanage 1958:
* 12 m grown, fronds 4.3 m at ten years, girth 71 cm at 1.5 m): a trunk growing about 0.35 m a year, 0.2 after 25
* years and 0.1 after 40, to about 12.5 m; 15–16 fronds and bunches a year; a crown of about thirty fronds.
*/
const KING = {
	/** the bare trunk's height (m) to the crown by age */
	trunk: [[988, 0], [1100, .031], [1460, .12], [2000, 1], [2100, 1.3], [2250, 1.6], [2380, 1.9], [2480, 2.2], [3652, 3], [5479, 4.25], [8036, 6.3], [9131, 6.8], [14610, 9.8], [18262, 11.1], [21915, 11.8], [27393, 12.4]],
	/** the trunk's radius over its flare, as a share of a grown trunk's (BOLE) */
	girth: [[216, 0], [240, .007], [540, .198], [1100, .536], [2000, .857], [2100, 1]],
	/** fronds made in all */
	made: [[120, 0], [192, 1], [240, 2], [540, 6], [1100, 13], [2000, 24], [2100, 36], [2250, 48], [2380, 60], [2480, 72]],
	/** after Ripe, fronds a year */
	fronds: 15.5,
	/** fronds it holds at once */
	holds: [[120, 0], [192, 1], [240, 2], [540, 5], [1100, 10], [2000, 18], [2100, 24], [2250, 28], [2380, 29], [2480, 30], [14610, 30], [18262, 26]],
	/** a frond's full length (m) by the day it was made */
	frond: [[120, .35], [240, .6], [540, 1], [1100, 2.1], [2000, 3.6], [2100, 4.7], [2250, 4.881], [2380, 5.219], [2480, 5.4], [3652, 4.8], [7305, 4.3], [14610, 4.2], [18262, 3.9]],
	/** roots grown from the base by age */
	roots: [[48, 0], [120, 4], [240, 9], [540, 16], [1100, 25], [2000, 34], [2100, 41], [2250, 48], [2380, 52], [2480, 56]],
	/** the base root ring's spread, 0 … 1 */
	spread: [[1100, 0], [2000, .259], [2100, .741], [2250, 1]],
	/** the seed nut rotting away, 0 … 1 */
	rot: [[652, 0], [1100, .741], [1460, 1]],
	/** the first spike's growth, 0 … 1 */
	spike: [[30, 0], [120, .721], [168, 1]]
};
/** a value of one of KING's curves at an age in days */
const byAge = (day, rows) => table(day, rows);
/** the nut lies along +X, its stem end (where it sprouts) at +X */
const NUT_AT = /* @__PURE__ */ (() => v3(-.1, -.035, 0))();
const BASE = /* @__PURE__ */ (() => v3(.02, 0, .01))();
/** how many fronds the palm has made by its age in days, all told */
const made = (day) => day <= FIRST_CROP ? byAge(day, KING.made) : 72 + (day - FIRST_CROP) / 365.25 * KING.fronds;
/** how many it holds at once */
const holds = (day) => byAge(day, KING.holds);
/** the day frond j was made */
function bornAt(j) {
	let lo = 120, hi = 4e4;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (made(mid) > j) hi = mid;
		else lo = mid;
	}
	return hi;
}
/**
* The king coconut at a stage (0 … 12, between them on the way) from the seed id: grown to its age in days.
* @param {number} g
* @param {string} seed
*/
function coconut(g, seed) {
	const day = dayAt(g);
	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .08);
	const rot = byAge(day, KING.rot);
	if (rot < 1) nut(bag, {
		seed,
		key: ["seed"],
		at: NUT_AT,
		dir: v3(1, -.08, 0).normalize(),
		size: 1 - rot * .25,
		grown: 1,
		colour: mix("#c8853a", "#5a4630", rot)
	});
	const roots = Math.round(byAge(day, KING.roots));
	const spread = byAge(day, KING.spread);
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "palm-root", i);
		const born = i < 4 ? 48 + i * 14.4 : bornRoot(i);
		const bear = i * 2.39996 + rr() * .4;
		const fromNut = i < 4;
		const from = fromNut ? NUT_AT.clone().add(v3(.04 + i * .03, -.06, (rr() - .5) * .05)) : BASE.clone().add(v3(Math.cos(bear) * .06 * lerp(1, 2.5, spread), -.03 - rr() * .06, Math.sin(bear) * .06 * lerp(1, 2.5, spread)));
		root(bag, {
			seed,
			key: ["palm", i],
			from,
			dir: fromNut ? v3((rr() - .5) * .4, -1, (rr() - .5) * .4) : v3(Math.cos(bear), -between(rr, .3, 1.1), Math.sin(bear)),
			length: fromNut ? .45 : between(rr, 1.2, 2.4) * vigour,
			grown: (day - born) / rootGrows(born),
			radius: fromNut ? .003 : .0045,
			down: .025,
			wander: .12,
			laterals: 4,
			lateral: .18,
			depth: 1,
			age: (day - born - rootAges(born)[0]) / rootAges(born)[1],
			young: "#efd2a6",
			old: "#b5683a"
		});
	}
	const H = byAge(day, KING.trunk) * vigour;
	const lean = chance(seed, "lean");
	const leanTo = v3(Math.cos(lean() * 6.283), 0, Math.sin(lean() * 6.283));
	const bow = between(lean, .04, .1);
	const trunkAt = (u) => BASE.clone().addScaledVector(leanTo, Math.sin(u * 1.4) * bow * H).add(v3(0, u * H, 0));
	const bole = lerp(.03, BOLE, byAge(day, KING.girth)) * vigour;
	const sr = chance(seed, "scars");
	const scars = [.25];
	while (scars[scars.length - 1] < 2.6) scars.push(scars[scars.length - 1] + between(sr, .07, .13));
	while (scars[scars.length - 1] < H + .5) {
		const h = scars[scars.length - 1];
		scars.push(h + ringAt(h / vigour) * vigour * between(sr, .8, 1.2));
	}
	/** how far from the nearest scar a height is (above it +, below it −), and the scar's own depth */
	const nearest = (h) => {
		let lo = 0, hi = scars.length - 1;
		while (hi - lo > 1) {
			const mid = lo + hi >> 1;
			if (scars[mid] > h) hi = mid;
			else lo = mid;
		}
		const a = h - scars[lo], b = h - scars[hi];
		return Math.abs(a) < Math.abs(b) ? a : b;
	};
	/** what is where: the trunk, then the nuts, so none grows through the trunk or another */
	const space = bag.space;
	if (g > 1.6) {
		const ht = Math.max(.05, H);
		const n = Math.max(24, Math.min(2400, Math.round(ht / .012)));
		const pts = [];
		for (let k = 0; k <= n; k++) pts.push(trunkAt(k / n));
		if (H > .3) space.rod(pts, bole * 1.05);
		bag.add("body", tube(H > .02 ? pts : [BASE.clone().add(v3(0, -.05, 0)), BASE.clone().add(v3(0, bole * .8, 0))], (u, v) => {
			const h = u * ht;
			const young = 1 - .28 * u + .12 * Math.pow(u, 6);
			const tall = .66 + .34 * Math.exp(-h / .9) + .12 * Math.exp(-(ht - h) / .6);
			const body = bole * (1 + .7 * Math.pow(1 - Math.min(1, h / .8), 2)) * lerp(young, tall, clamp((ht - 2.3) / 2));
			const d = nearest(h);
			return body * (1 + (h > .2 ? -.035 * Math.exp(-Math.pow(d / .006, 2)) + .03 * Math.exp(-Math.pow((d - .014) / .01, 2)) : 0) + .008 * Math.sin(v * Math.PI * 2 * 9 + h * 3));
		}, (u, v) => {
			const h = u * ht;
			const d = nearest(h);
			const scar = h > .2 ? Math.exp(-Math.pow(d / .007, 2)) : 0;
			const lip = h > .2 ? Math.exp(-Math.pow((d - .016) / .012, 2)) : 0;
			return mix(mix(mix("#8d8476", "#9a958c", clamp((day - 5479) / 9e3)), "#7a6a52", clamp((h - ht + Math.min(.3 * ht, 1.2)) / Math.min(.3 * ht, 1.2))), "#6c5f4c", Math.pow(Math.abs(Math.sin(v * Math.PI * 2 * 23 + h * 1.7)), 12) * .6).lerp(new three.Color("#463d33"), scar * .75).lerp(new three.Color("#aaa08e"), lip * .35).lerp(new three.Color("#6b7a3c"), clamp(1 - H / .4) * .6);
		}, 22));
		if (H > .3) {
			const boot = [trunkAt(Math.max(0, 1 - .45 / ht)), trunkAt(1).add(v3(0, .12, 0))];
			bag.add("body", tube(boot, (u) => bole * (.98 + .25 * Math.sin(Math.PI * u)), (u, v) => mix("#7a5f3e", "#9a8358", Math.abs(Math.sin(v * 40 + u * 9))), 18));
		}
	}
	const crown = H > .02 ? trunkAt(1) : BASE.clone().add(v3(0, day < 192 ? 0 : bole * .6, 0));
	const spike = byAge(day, KING.spike);
	const sprouting = NUT_AT.clone().add(v3(.11, .05, 0));
	if (spike > 0 && day < 300) {
		const top = (day < 192 ? sprouting : crown).clone().add(v3(0, .02 + .2 * spike, 0));
		bag.add("body", tube([day < 192 ? sprouting : crown, top], (u) => .02 * (1 - u * .85) * lerp(.4, 1, spike), (u) => mix("#c9a45a", "#7fa046", u), 8));
	}
	const total = made(day);
	const live = holds(day);
	for (let j = Math.max(0, Math.floor(total - live - 1)); j < Math.ceil(total); j++) {
		const age = (total - j) / Math.max(1, live);
		if (age < 0 || age > 1.05) continue;
		const born = bornAt(j);
		frond(bag, {
			seed,
			j,
			at: day < 192 ? sprouting : crown,
			age,
			opened: clamp((total - j) / 1.2),
			born,
			vigour
		});
	}
	const last = Math.min(BUNCHES, Math.floor(bunchOf(day + .3 * PHASE)));
	for (let b = Math.max(0, Math.floor(bunchOf(day - CUT * PHASE)) - 1); b <= last; b++) {
		const opens = opensAt(b);
		const phase = (day - opens) / PHASE;
		if (phase < -.3 || H < .3) continue;
		if (phase > CUT && day > FIRST_CROP + 30) continue;
		bunch(bag, {
			seed,
			b,
			at: crown,
			phase,
			vigour,
			bear: made(opens) % 5 * 2.513 + b * 2.513,
			space,
			reach: bole
		});
	}
	return bag.build();
}
/** the day a root from the base is made: a few a month */
const bornRoot = (i) => table(i, [[4, 168], [10, 294], [20, 809], [30, 1802], [40, 2112], [50, 2299], [56, 2396]]);
/** the days a root made on `born` takes to grow */
const rootGrows = (born) => table(born, [[48, 432], [91, 538], [168, 820], [294, 1328], [809, 1279], [1802, 471], [2112, 316], [2299, 181], [2396, 84]]);
/** when a root made on `born` starts to brown, and over how many days */
const rootAges = (born) => [table(born, [[48, 72], [168, 72], [294, 180], [809, 363], [1802, 236], [2112, 90], [2299, 78], [2396, 60]]), table(born, [[48, 700], [168, 1310], [294, 1554], [809, 1015], [1802, 326], [2112, 278], [2299, 103], [2396, 24]])];
/** a grown trunk's radius over its flare (m) */
const BOLE = .17;
/** the leaf-scar ring's spacing (m) at a height of trunk: the trunk's growth over the days one frond takes */
function ringAt(h) {
	let lo = 2480, hi = 27393;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (table(mid, KING.trunk) > h) hi = mid;
		else lo = mid;
	}
	const rate = (table(lo + 60, KING.trunk) - table(lo - 60, KING.trunk)) / 120;
	return clamp(rate * 365.25 / KING.fronds, .025, .13);
}
/** days of a bunch's growth that one unit of its phase stands for: opening to ripe nuts is about 3.4 of them */
const PHASE = 125;
/** the phase a bunch is cut at, its nuts ripe */
const CUT = 3.8;
/** the most bunches a palm ever makes here */
const BUNCHES = 1200;
/** the day bunch b opens: the first seven every 40 days, then from the first crop on one with each new frond */
const opensAt = (b) => b < 7 ? 1974 + b * 40 : FIRST_CROP + 40 + (b - 7) * 365.25 / KING.fronds;
/** which bunch opens on a day (fractional) */
const bunchOf = (day) => day < FIRST_CROP + 40 ? Math.min(6.99, (day - 1974) / 40) : 7 + (day - FIRST_CROP - 40) / (365.25 / KING.fronds);
/**
* A frond: its sheathing base, a long stalk, and its blade — while young whole and pleated, split only at its tip;
* on the grown palm cut into a hundred narrow leaflets each side, held in a shallow V, arching over.
* @param {Bag} bag
* @param {{ seed: string, j: number, at: THREE.Vector3, age: number, opened: number, born: number, vigour: number }} o — `born` the day it was made
*/
function frond(bag, o) {
	const fr = chance(o.seed, "frond", o.j);
	const bear = o.j * 2.513 + about(fr, 0, .15);
	const out = v3(Math.cos(bear), 0, Math.sin(bear));
	const full = byAge(o.born, KING.frond) * o.vigour;
	const len = full * lerp(.35, 1, o.opened);
	const tilt = lerp(.1 + .35 * span(o.born, 3652, 8036), 1.55, Math.pow(clamp(o.age), .75)) + Math.max(0, o.age - .85) * 4 + about(fr, 0, .1);
	const dying = span(o.age, .82, 1.02);
	const pinnate = o.born > 596;
	const steps = 14;
	const pts = [o.at.clone()];
	let d = out.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
	const arch = .06 + .06 * o.age + .1 * span(o.born, 3652, 8036);
	for (let k = 0; k < steps; k++) {
		d = d.clone().add(v3(0, -arch * (k / steps) * (o.opened > .7 ? 1 : .3), 0)).normalize();
		pts.push(pts[k].clone().addScaledVector(d, len / steps));
	}
	const colour = (u) => mix(mix("#c4b25a", "#5f8a38", clamp(u * 3)), "#b98f4a", dying);
	bag.add("body", tube(pts, (u) => (.012 + .03 * clamp(full / 4)) * (1 - .8 * u), colour, 6));
	const along = (u) => {
		const f = u * steps, k = Math.min(13, Math.floor(f));
		return {
			p: pts[k].clone().lerp(pts[k + 1], f - k),
			t: pts[k + 1].clone().sub(pts[k]).normalize()
		};
	};
	const green = (u) => mix(mix("#3f7a2e", "#a7c25a", 1 - clamp(o.opened)), "#c7a24c", clamp(dying * 1.3 - u * .2));
	if (!pinnate) {
		for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
			const u0 = .3 + k * .115;
			const { p, t } = along(u0);
			const dir = new three.Vector3().crossVectors(t, v3(0, 1, 0)).normalize().multiplyScalar(side).multiplyScalar(.45).addScaledVector(t, .9).add(v3(0, .12, 0)).normalize();
			const l = len * (.36 - k * .03) * lerp(.4, 1, o.opened);
			bag.add("sheet", sheet({
				length: l,
				width: len * .05,
				shape: (u) => Math.sin(Math.PI * Math.pow(u, .7)) * .9 + .1,
				lift: (u, v) => .04 * v * v + (1 - o.opened) * .2 * Math.abs(v),
				paint: (u, v) => green(u0).lerp(new three.Color("#2f5f24"), Math.abs(v) > .7 ? .3 : 0),
				along: 6,
				across: 2
			}), aim(p, dir, side * .4));
		}
		return;
	}
	const pairs = Math.round(lerp(28, 70, o.born < 1100 ? clamp((o.born - 540) / 560) * .5 : .5 + clamp((o.born - 1100) / 900) * .5));
	for (let k = 0; k < pairs; k++) {
		const u0 = .18 + k / pairs * .8;
		const { p, t } = along(u0);
		const lengthHere = full * .24 * Math.pow(Math.sin(Math.PI * Math.min(1, .1 + k / pairs * .95)), .6) * lerp(.3, 1, o.opened);
		for (const side of [-1, 1]) {
			const across = new three.Vector3().crossVectors(t, v3(0, 1, 0));
			if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
			across.normalize().multiplyScalar(side);
			const dir = across.multiplyScalar(.8).addScaledVector(t, .55).add(v3(0, .25 - o.age * .35 - dying * .5, 0)).normalize();
			bag.add("sheet", sheet({
				length: lengthHere,
				width: .018 + .006 * clamp(full / 4),
				shape: (u) => Math.sin(Math.PI * Math.pow(u, .55)) * (1 - .5 * u),
				lift: (u) => -.15 * u * u,
				paint: () => green(u0),
				along: 5,
				across: 1
			}), aim(p, dir, side * .35));
		}
	}
}
/**
* A bunch from a leaf axil: first a closed spathe, then the branched cream flower spike, then the buttons, then the nuts
* swelling, golden-orange, hanging below the crown on a long stalk.
* @param {Bag} bag
* @param {{ seed: string, b: number, at: THREE.Vector3, phase: number, vigour: number, bear: number, space: Space, reach: number }} o
*/
function bunch(bag, o) {
	const br = chance(o.seed, "bunch", o.b);
	const out = v3(Math.cos(o.bear), 0, Math.sin(o.bear));
	const heavy = span(o.phase, .6, 2.2);
	const stalkLen = .55 * lerp(.5, 1, clamp(o.phase + .3));
	const d = out.clone().multiplyScalar(.8).add(v3(0, lerp(.5, -.9, heavy), 0)).normalize();
	const start = o.at.clone().addScaledVector(out, o.reach * 1.25 + .03).add(v3(0, -.2, 0));
	const end = start.clone().addScaledVector(d, stalkLen);
	if (o.phase < 0) {
		const grow = clamp((o.phase + .3) / .3);
		bag.add("body", tube([start, start.clone().addScaledVector(d, .7 * grow)], (u) => .06 * Math.sin(Math.PI * Math.min(1, .15 + u * .85)) * grow, (u) => mix("#7d8a46", "#a07a42", u), 10));
		return;
	}
	bag.add("body", tube([
		start,
		start.clone().lerp(end, .5).add(v3(0, .05, 0)),
		end
	], (u) => .03 * (1 - .4 * u), () => mix("#c9a45a", "#8f7444", heavy), 7));
	if (o.phase < 1.5) bag.add("sheet", sheet({
		length: .75,
		width: .08,
		shape: (u) => Math.sin(Math.PI * Math.pow(u, .7)),
		lift: (u, v) => .3 * v * v,
		paint: () => mix("#a58a52", "#7a5a38", clamp(o.phase)),
		along: 8,
		across: 4
	}), aim(start, d.clone().add(v3(0, -.6, 0)).normalize()));
	const flowering = o.phase < .6;
	const rachillae = 12;
	const nuts = Math.round(lerp(18, 9 + br() * 6, span(o.phase, .4, 1.2)));
	for (let k = 0; k < rachillae; k++) {
		const a = k / rachillae * Math.PI * 2 + br() * .3;
		const spray = new three.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(.55).addScaledVector(d, .6).add(v3(0, -.2 * heavy, 0)).normalize();
		const tip = end.clone().addScaledVector(spray, .35 * lerp(.6, 1, clamp(o.phase * 2)));
		bag.add("body", tube([end, tip], (u) => .008 * (1 - .6 * u), () => flowering ? "#e9dca0" : "#b39a5a", 4));
		if (flowering) for (let m = 1; m <= 6; m++) bag.add("body", bead(end.clone().lerp(tip, m / 6.5), v3(.008, .008, .008), "#f2e6b8", 2));
	}
	for (let n = 0; n < nuts; n++) {
		const nr = chance(o.seed, "nut", o.b, n);
		const a = n * 2.39996;
		const ring = .08 + .08 * Math.sqrt(n / nuts);
		const grown = span(o.phase, .4, 1.9);
		const at = end.clone().add(v3(Math.cos(a) * ring * lerp(.6, 1.6, grown), -.06 - n % 4 * .05 * lerp(.3, 1.4, grown), Math.sin(a) * ring * lerp(.6, 1.6, grown)));
		const dir = at.clone().sub(end).add(v3(0, -.25, 0)).normalize();
		const ripe = span(o.phase, 2.2, 3.4);
		const size = lerp(.12, 1, grown) * about(nr, .9, .08) * o.vigour;
		const place = o.space.settle(at, dir, (a, d) => [{
			c: a.clone(),
			r: .23 * size * .38
		}], .08);
		if (grown > 0) bag.fruit([
			"bunch",
			o.b,
			n
		], place.at.clone().addScaledVector(place.dir, -.23 * size * .5), place.dir);
		nut(bag, {
			seed: o.seed,
			key: [
				"bunch",
				o.b,
				n
			],
			at: place.at,
			dir: place.dir,
			size,
			grown,
			colour: mix(mix("#c9b04a", "#f29a2e", clamp(grown * 1.5)), "#a8692e", ripe)
		});
		bag.fruitDone();
	}
}
/**
* A husked coconut: an ovoid, faintly three-cornered, pointed at its far end, a brown calyx at its stem end.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, grown: number, colour: THREE.Color | string }} o
*/
function nut(bag, o) {
	const L = .23 * o.size;
	const R = L * .4;
	const q = new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), o.dir.clone().normalize());
	const m = new three.Matrix4().compose(o.at, q, v3(1, 1, 1));
	const axis = [];
	for (let k = 0; k <= 22; k++) axis.push(v3(-L / 2 + k / 22 * L, 0, 0));
	const colour = new three.Color(o.colour);
	bag.add("gloss", tube(axis, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 - .18 * u * u) * (1 + .05 * Math.cos(v * Math.PI * 6)), (u) => colour.clone().lerp(new three.Color("#e8c25a"), (1 - u) * .12), 22), m);
	bag.add("body", bead(v3(-L / 2 + .005, 0, 0), v3(.012, .03, .03).multiplyScalar(o.size + .2), "#7a5a32", 4), m);
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
	id: "king-coconut",
	label: "King coconut",
	latin: "Cocos nucifera 'King' · Thambili",
	note: "A palm from a whole golden nut: whole first leaves, then a ringed trunk and a crown of arching fronds, cream flower spikes and bunches of golden-orange nuts.",
	from: "Palm · 50 years",
	grownStage: GROWN,
	stages: STAGES,
	grow: coconut
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
const HISTORY = /* @__PURE__ */ (() => ({ "king-coconut": [FIRST, { v: 2, date: "2026-11-05", note: "Sizes to the real king coconut" }, { v: 3, date: "2026-11-07", note: "Grows on past its first harvest into the tall palm, sized by its age" }] }))();
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
		value: p.grownStage ?? p.stages.length - 1,
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