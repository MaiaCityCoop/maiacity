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
const UP$1 = /* @__PURE__ */ (() => v3(0, 1, 0))();
const C = /* @__PURE__ */ (() => new three.Color())();
const toColor = (c) => c instanceof three.Color ? c : C.set(c);
/** a colour between two, as a THREE.Color (a new one) */
const mix$1 = (a, b, t) => new three.Color(a).lerp(new three.Color(b), clamp(t));
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
		if (t.lengthSq() < 1e-14) t.copy(prev ?? UP$1);
		t.normalize();
		if (!normal) normal = Math.abs(t.y) < .9 ? new three.Vector3().crossVectors(t, UP$1).normalize() : new three.Vector3().crossVectors(t, v3(1, 0, 0)).normalize();
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
* A round sheet spread from one point (where its stalk meets it): a palmate leaf, a flower's disc. `edge(a)` is its
* reach at the angle a (0 straight on along +X, ±π behind), `lift(s, a)` its rise at the part s of the reach.
* @param {{ size: number, from: number, to: number, edge: (a: number) => number, lift?: (s: number, a: number) => number, paint: Paint, rings?: number, rays?: number }} o
*/
function fan({ size, from, to, edge, lift = () => 0, paint, rings = 8, rays = 40 }) {
	rings = fewer(rings, 1);
	rays = fewer(rays, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let j = 0; j <= rays; j++) {
		const a = lerp(from, to, j / rays);
		const reach = edge(a) * size;
		for (let i = 0; i <= rings; i++) {
			const s = i / rings;
			pos.push(Math.cos(a) * reach * s, lift(s, a) * size, Math.sin(a) * reach * s);
			nor.push(0, 1, 0);
			uv.push(s, j / rays);
			const c = toColor(paint(s, a));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let j = 0; j < rays; j++) for (let i = 0; i < rings; i++) {
		const a = j * (rings + 1) + i, b = a + rings + 1;
		idx.push(a, b, a + 1, b, b + 1, a + 1);
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
	bag.add("body", tube(pts, (u) => r0 * (1 - .7 * u), (u) => mix$1(old, young, u * 1.5 + .5 - age), order ? 4 : 5));
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
//#region src/lib/plants/wald-perennials.js
const stages = (rows) => rows.map(([name, day, note]) => ({
	name,
	day,
	note
}));
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/**
* The colours, each read from its text once: a plant paints thousands of vertices, and reading '#3d6a28' afresh for
* every one of them costs more than the shapes. (Never changed: `mix` makes a new colour from them.)
* @type {Map<string, THREE.Color>}
*/
const COLOURS = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** a colour by its text, read once */
const tint = (c) => {
	if (c instanceof three.Color) return c;
	const key = String(c);
	let got = COLOURS.get(key);
	if (!got) COLOURS.set(key, got = new three.Color(c));
	return got;
};
/** a colour between two, as a new THREE.Color (./grow.js's `mix`, with the colours read once) */
const mix = (a, b, t) => tint(a).clone().lerp(tint(b), clamp(t));
/** a point along a path at u (0 … 1) */
function point(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return pts[k].clone().lerp(pts[k + 1], f - k);
}
/** which way a path runs at u (0 … 1) */
function towards(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return pts[k + 1].clone().sub(pts[k]).normalize();
}
/** a direction `tilt` (radians) from upright toward the level `out` */
const tilted = (out, tilt) => out.clone().setY(0).normalize().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
/** a level direction at the compass bearing a */
const level = (a) => v3(Math.cos(a), 0, Math.sin(a));
/**
* The matrix that sets a shape built along +X (its face +Y) at `at`, pointing along `x`, its face turned toward `up`
* as far as it can — a bract's face outward from its bud, a petal's toward where the flower looks.
* @param {THREE.Vector3} at @param {THREE.Vector3} x @param {THREE.Vector3} up
*/
function face(at, x, up) {
	const X = x.clone().normalize();
	let Z = new three.Vector3().crossVectors(X, up);
	if (Z.lengthSq() < 1e-8) Z = new three.Vector3().crossVectors(X, Math.abs(X.y) < .9 ? UP : v3(1, 0, 0));
	Z.normalize();
	const Y = new three.Vector3().crossVectors(Z, X).normalize();
	return new three.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}
/**
* A stalk's points from `at`, setting out along `dir` and bowing down as it goes (up, for `bow` below 0).
* @param {THREE.Vector3} at @param {THREE.Vector3} dir @param {number} length @param {number} bow @param {number} [n]
*/
function arch(at, dir, length, bow, n = 6) {
	const pts = [at.clone()];
	const d = dir.clone().normalize();
	for (let k = 0; k < n; k++) {
		d.y -= bow / n;
		d.normalize();
		pts.push(pts[k].clone().addScaledVector(d, length / n));
	}
	return pts;
}
/** a leaf's colour: its green (paler while young), the midrib lighter, yellowing and browning as it gets old */
function leafColour(green, young, grown, old, u) {
	return mix(green, young, (1 - grown) * .8).lerp(mix("#c8b04a", "#8a6a3a", u), clamp(old * 1.3 - (1 - u) * .3));
}
const RHUBARB_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Crown",
		0,
		"A division of an old crown — a fat red bud or two on a piece of knobbly rootstock — set level with the soil in late winter."
	],
	[
		"Bud break",
		14,
		"Red knobbly buds push through the soil, the crumpled leaves packed tight inside them."
	],
	[
		"Unfurling",
		30,
		"The first leaves unfurl, crinkled and bronze-green, on short red stalks."
	],
	[
		"First summer",
		90,
		"A clump of big leaves; none pulled in the first year, so the crown can build."
	],
	[
		"Second spring",
		400,
		"Back from the winter with more buds, broader leaves and thicker stalks."
	],
	[
		"Full clump",
		430,
		"Leaves half a metre across on stalks thick as a thumb, the clump a metre and more wide."
	],
	[
		"First pull",
		450,
		"The first stalks pulled — held low and twisted off the crown, never cut — a few only."
	],
	[
		"Pulling",
		480,
		"Pulled from the outside week by week, the leaves cut off onto the compost (they are poisonous); never more than a third, and no more after midsummer."
	],
	[
		"Flower spike",
		500,
		"A thick hollow stem shoots up two metres from the crown, papery sheaths at its nodes, a great plume of tiny cream flowers."
	],
	[
		"Seed",
		530,
		"The plume turns rusty red with winged seeds; the old leaves yellow at their edges. (Cut the spike early and the crown keeps its strength.)"
	]
]))();
/** a rhubarb blade's reach at the angle a: roundly heart-shaped, the stalk in its notch, the margin wavy */
const rhubarbEdge = (a) => {
	const c = .45, rho = .72, s = Math.sin(a);
	const d = c * Math.cos(a) + Math.sqrt(rho * rho - c * c * s * s);
	const notch = 1 - .85 * Math.exp(-Math.pow((Math.abs(a) - Math.PI) / .3, 2));
	return d / 1.17 * notch * (1 + .04 * Math.sin(a * 13));
};
/**
* Rhubarb at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function rhubarb(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const crown = v3(0, -.025, 0);
	const build = span(g, 0, 5.5);
	const cr = chance(seed, "rhubarb-crown");
	for (let k = 0; k < 5; k++) {
		const a = k * 2.39996 + cr();
		const d = k ? .025 + .035 * build : 0;
		bag.add("body", bead(crown.clone().add(v3(Math.cos(a) * d, -.01 - cr() * .015, Math.sin(a) * d)), v3(1, .7, 1).multiplyScalar((.03 + .02 * build) * vigour), mix("#5a3e2c", "#7a5440", cr()), 5));
	}
	for (let k = 0; k < 2; k++) {
		const swell = 1 - span(g, .7 + k * .3, 1.2 + k * .3);
		if (swell > 0) bag.add("gloss", bead(crown.clone().add(v3(k * .035 - .015, .03 + .01 * (1 - swell), k * .01)), v3(.018, .024, .018).multiplyScalar(lerp(.6, 1, swell)), "#b02238", 6));
	}
	for (let i = 0; i < 6; i++) {
		const rr = chance(seed, "rhubarb-root", i);
		const a = i * 2.39996 + rr();
		root(bag, {
			seed,
			key: ["root", i],
			from: crown.clone().add(v3(Math.cos(a) * .03, -.03, Math.sin(a) * .03)),
			dir: v3(Math.cos(a) * .6, -1, Math.sin(a) * .6),
			length: between(rr, .5, .9) * vigour,
			grown: table(g, [
				[0, .3],
				[2, .5],
				[4, .8],
				[6, 1]
			]),
			radius: .007 + .008 * build,
			down: .05,
			wander: .2,
			laterals: 4,
			lateral: .35,
			depth: 1,
			age: .6 + .4 * build,
			young: "#e8c890",
			old: "#6a4a30"
		});
	}
	/** @type {{ key: number, born: number, size: number, wither: number, pulled: number, old: number }[]} */
	const leaves = [];
	for (let i = 0; i < 8; i++) leaves.push({
		key: i,
		born: .7 + i * .27,
		size: .42 + .06 * i,
		wither: span(g, 3.2 + i * .03, 3.85),
		pulled: Infinity,
		old: 0
	});
	for (let j = 0; j < 18; j++) leaves.push({
		key: 8 + j,
		born: 3.6 + j * .15,
		size: j < 3 ? .8 : .95,
		wither: 0,
		pulled: j % 2 === 0 && j < 10 ? 5.9 + j * .15 : Infinity,
		old: span(g, 8.3, 9.4) * (j < 9 ? .55 : .25)
	});
	for (const L of leaves) {
		if (g <= L.born || L.wither >= 1 || g > L.pulled) continue;
		const lr = chance(seed, "rhubarb-leaf", L.key);
		const grown = clamp((g - L.born) / 1.1);
		const bear = L.key * 2.39996 + about(lr, 0, .2);
		const out = level(bear);
		const S = L.size * vigour * about(lr, 1, .08);
		if (grown < .25) bag.add("body", bead(crown.clone().addScaledVector(out, .02).add(v3(0, .025, 0)), v3(.014, .022, .014).multiplyScalar(lerp(.6, 1, S) * (1 - grown * 2)), "#b0283a", 4));
		const P = (.08 + .32 * S) * lerp(.15, 1, grown);
		const tilt = lerp(.06, between(lr, .45, .85), grown) + L.wither * .7;
		const pts = arch(crown.clone().addScaledVector(out, .02).add(v3(0, .02, 0)), tilted(out, tilt), P, .25 * grown + L.wither * .6, 6);
		const pr = (.004 + .011 * S) * lerp(.35, 1, grown);
		const fleck = lr() * 10;
		bag.add("gloss", tube(pts, (u) => pr * (1 - .35 * u), (u, v) => mix(mix("#a8182e", "#c0384a", Math.abs(Math.sin(v * 9 + fleck)) > .9 ? .6 : 0), "#7a8a3a", clamp(u * .9 - .3 + L.wither)).lerp(tint("#8a7a4a"), L.wither), 6));
		bag.space.rod(pts, pr);
		const R = (.12 + .4 * S) * lerp(.15, 1, grown);
		const fold = (1 - grown) * .9;
		const top = pts[pts.length - 1];
		const lift = lerp(1.1, -.05 + lr() * .2, grown) - L.wither * .8;
		const dir = out.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0));
		const crinkle = lerp(1.6, 1, grown);
		bag.add("sheet", fan({
			size: R,
			from: -Math.PI,
			to: Math.PI,
			edge: (a) => rhubarbEdge(a) * (1 - .45 * fold * Math.abs(Math.sin(a))),
			lift: (s, a) => fold * Math.abs(Math.sin(a)) * s * .8 - (.1 + L.wither * .3) * s * s + crinkle * (.045 * Math.sin(a * 8 + s * 5) * s * s + .014 * Math.sin(s * 22) * Math.cos(a * 11) * s),
			paint: (s, a) => {
				const m = Math.abs(a) % .95, vein = Math.min(m, .95 - m) < .03 + .03 * (1 - s);
				const base = leafColour("#3d6a28", "#7a6a2a", grown, Math.max(L.wither, L.old * clamp((s - .6) * 3)), s);
				return vein ? base.lerp(tint(s < .3 ? "#b04050" : "#b8c48a"), .5) : base;
			},
			rings: 10,
			rays: 30
		}), face(top, dir, UP));
	}
	const rise = span(g, 7.3, 8.1);
	if (rise > 0) {
		const fr = chance(seed, "rhubarb-spike");
		const H = (1.5 + .4 * fr()) * vigour * rise;
		const lean = v3(fr() - .5, 0, fr() - .5).multiplyScalar(.12);
		const stem = [];
		for (let k = 0; k <= 10; k++) {
			const h = k / 10 * H;
			stem.push(crown.clone().add(v3(lean.x * h * h, .02 + h, lean.z * h * h)));
		}
		bag.add("body", tube(stem, (u) => .02 * (1 - .65 * u) * lerp(.6, 1, rise), (u, v) => mix("#6a8a3a", "#a83040", Math.abs(Math.sin(u * 40 + v * 13)) > .92 ? .7 : .15), 8));
		bag.space.rod(stem, .02);
		const bloom = span(g, 7.8, 8.3), seeding = span(g, 8.6, 9.3);
		for (let k = 1; k <= 4; k++) {
			const u = .1 * k;
			const p = point(stem, u);
			bag.add("body", bead(p, v3(.03, .014, .03).multiplyScalar(1 - u), mix("#d8c8a0", "#a8865a", seeding), 4));
			if (k > 3) continue;
			const a = k * 2.4 + fr();
			const leafAt = p.clone().addScaledVector(level(a), .02);
			bag.add("sheet", fan({
				size: .12 * (1 - k * .2) * rise,
				from: -Math.PI,
				to: Math.PI,
				edge: rhubarbEdge,
				lift: (s, aa) => -.12 * s * s + .03 * Math.sin(aa * 8) * s,
				paint: (s) => leafColour("#3d6a28", "#6a8a3a", 1, seeding * .6, s),
				rings: 5,
				rays: 16
			}), face(leafAt, tilted(level(a), 1.2), UP));
		}
		if (bloom <= .05) bag.add("body", bead(stem[10], v3(.035, .05, .035).multiplyScalar(lerp(.6, 1, rise)), "#d8c8a8", 6));
		else {
			const flower = seeding > 0 ? mix("#efe6c8", "#a8402c", seeding) : mix("#d8d0a8", "#f2ecd2", bloom);
			if (seeding > 0) bag.fruit(["rhubarb-spike"], point(stem, .45), towards(stem, .45));
			const branches = 22;
			for (let b = 0; b < branches; b++) {
				const t = b / 21;
				const from = point(stem, .45 + .52 * t);
				const len = (.3 - .2 * t) * bloom;
				const twig = arch(from, level(b * 2.39996 + fr()).multiplyScalar(.6).add(v3(0, .8, 0)), len, -.15, 3);
				bag.add("body", tube(twig, () => .003 * (1 - .5 * t), () => tint("#8a9a5a"), 3));
				for (let m = 1; m <= 6; m++) {
					const p = point(twig, m / 6);
					for (let q = 0; q < 3; q++) {
						const side = level(m * 2.39996 + b + q * 2.1).multiplyScalar(.012 + .006 * q).add(v3(0, .006 * q, 0));
						bag.add("body", bead(p.clone().add(side), v3(.011, .009, .011).multiplyScalar(lerp(.5, 1, bloom) * (1 - .35 * t)), flower, 2));
					}
				}
			}
			for (let m = 0; m < 6; m++) bag.add("body", bead(point(stem, .94 + m * .012).add(level(m * 2.4).multiplyScalar(.008)), v3(.008, .008, .008), flower, 2));
			if (seeding > 0) bag.fruitDone();
		}
	}
	return bag.build();
}
/** @type {(import('./index.js').Plant & { layer: import('./index.js').Layer })[]} */
const WALD$1 = [{
	id: "rhubarb",
	label: "Rhubarb",
	latin: "Rheum rhabarbarum · Rhabarber",
	note: "From a knobbly crown, red buds and huge crinkled leaves on thick red stalks — pulled from the outside in its second spring — then a hollow stem two metres high with a cream plume.",
	from: "Perennial · 2 years",
	stages: RHUBARB_STAGES,
	grow: rhubarb,
	layer: "herbaceous"
}];

//#endregion
//#region src/lib/plants/index.js
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
/** the plants of the temperate forest garden, each file with its own entries and their layers (./wald-*.js) */
const WALD = /* @__PURE__ */ (() => [...WALD$1])();
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
const PLANTS = /* @__PURE__ */ (() => versioned(LAYERS.flatMap((l) => [...WALD].filter((p) => (p.layer ?? LAYER_OF[p.id] ?? "herbaceous") === l.id).map((p) => ({
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