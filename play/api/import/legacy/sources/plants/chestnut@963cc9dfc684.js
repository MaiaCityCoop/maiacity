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
//#region src/lib/plants/crown.js
/**
* @typedef {{ pts: THREE.Vector3[], tip: THREE.Vector3, dir: THREE.Vector3, gen: number, key: (string | number)[],
*   grown: number, end: boolean, radius: number, born: number, length: number }} Shoot — one shoot as far as it has
*   grown; `end` while nothing has broken from its tip yet (where the leaves, the flowers and the fruit are)
*/
/**
* @typedef {{
*   trunk: number, trunkBorn: number, trunkFlush: number, scaffolds: [number, number], scaffoldAngle: number,
*   gens: number, flush: number, rest: number, shoot: (gen: number) => number, whorl: [number, number], spread: number,
*   up: number, droop: number, wander: number, radius: number, taper: number, thicken: number, bark: [string, string],
*   stop?: (key: (string | number)[], gen: number, born: number) => boolean
* }} Flush — `trunk` the clear trunk's length, its flush from `trunkBorn` over `trunkFlush`; then `scaffolds` limbs
*   (at least, at most) at `scaffoldAngle` from it; then `gens` generations of flushes, each `flush` long with a `rest`
*   between, of `shoot(gen)` metres, `whorl` new shoots each, leaving their parent at `spread`; a shoot that
*   `stop`s flushes no further (it has become a flowering and fruiting tip)
*/
/**
* A tree that grows in flushes. Its shoots are drawn into `bag` and handed back.
* @param {import('./grow.js').Bag} bag
* @param {{ seed: string, g: number, from: THREE.Vector3, spec: Flush }} o
* @returns {Shoot[]}
*/
function flushCrown(bag, o) {
	const { seed, g, spec } = o;
	/** @type {Shoot[]} */
	const out = [];
	/**
	* @param {(string | number)[]} key @param {THREE.Vector3} from @param {THREE.Vector3} dir @param {number} gen @param {number} born
	*/
	const grow = (key, from, dir, gen, born) => {
		if (g <= born) return;
		const r = chance(seed, "shoot", ...key);
		const length = (gen === 0 ? spec.trunk : spec.shoot(gen)) * about(r, 1, .18);
		const flush = gen === 0 ? spec.trunkFlush : spec.flush;
		const grown = clamp((g - born) / flush);
		const steps = gen === 0 ? 10 : 5;
		const path = [from.clone()];
		const d = dir.clone().normalize();
		for (let i = 0; i < steps; i++) {
			d.y += spec.up - spec.droop * gen * (i / steps);
			d.x += (r() * 2 - 1) * spec.wander;
			d.z += (r() * 2 - 1) * spec.wander;
			d.normalize();
			path.push(path[i].clone().addScaledVector(d, length / steps));
		}
		const reach = grown * steps, whole = Math.floor(reach);
		const pts = path.slice(0, whole + 1);
		if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
		if (pts.length < 2) return;
		const age = g - born;
		const radius = spec.radius * Math.pow(spec.taper, gen) * (.12 + .88 * clamp(age / spec.thicken));
		bag.add("body", tube(pts, (u) => radius * (1 - .35 * u), (u) => mix(spec.bark[1], spec.bark[0], clamp((u - .4) * 1.5 + (1 - clamp(age / 2)) * .8)), gen < 2 ? 9 : 5));
		const tip = pts[pts.length - 1];
		const tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
		let end = true;
		if (grown >= 1 && gen < spec.gens && !spec.stop?.(key, gen, born)) {
			const [a, b] = gen === 0 ? spec.scaffolds : spec.whorl;
			const n = a + Math.floor(r() * (b - a + 1));
			const turn0 = r() * Math.PI * 2;
			for (let i = 0; i < n; i++) {
				const bearing = turn0 + i / n * Math.PI * 2 + about(r, 0, .35);
				const tilt = (gen === 0 ? spec.scaffoldAngle : spec.spread) * about(r, 1, .2);
				const side = new three.Vector3().crossVectors(tipDir, v3(0, 1, 0));
				if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
				side.normalize().applyAxisAngle(tipDir, bearing);
				const cd = tipDir.clone().applyAxisAngle(side, tilt);
				const next = born + flush + spec.rest * about(r, 1, .25);
				if (g > next) end = false;
				grow([...key, i], tip, cd, gen + 1, next);
			}
		}
		out.push({
			pts,
			tip: tip.clone(),
			dir: tipDir,
			gen,
			key,
			grown,
			end,
			radius,
			born,
			length: length * grown
		});
	};
	grow(["trunk"], o.from, v3(0, 1, 0), 0, spec.trunkBorn);
	return out;
}
/**
* @typedef {{
*   height: [number, number][], radius: number, tiers: number, clear: number, spacing: number, angle: number,
*   limb: (h: number) => number, rate: number, crown: number, sides: number, side: number, bark: [string, string],
*   droop: number
* }} Leader — the trunk's height through the stages, how thick it grows, a limb every `spacing` metres from `clear`
*   (`tiers` of them at most), at `angle` from upright, as long as `limb(h)` (h 0 … 1 up the tree) once grown, growing
*   `rate` metres a stage; limbs further than `crown` below the top have died off; each limb with side shoots every
*   `side` metres
*/
/**
* A tree with a leader. Its trunk, limbs and side shoots are drawn into `bag` and handed back.
* @param {import('./grow.js').Bag} bag
* @param {{ seed: string, g: number, from: THREE.Vector3, spec: Leader }} o
* @returns {Shoot[]}
*/
function leaderCrown(bag, o) {
	const { seed, g, spec } = o;
	/** @type {Shoot[]} */
	const out = [];
	const r = chance(seed, "leader");
	const H = tableAt(g, spec.height);
	if (H < .005) return out;
	const lean = v3(r() - .5, 0, r() - .5).multiplyScalar(.06);
	const trunkAt = (h) => o.from.clone().add(v3(lean.x * h * h, h, lean.z * h * h));
	const n = Math.max(2, Math.ceil(H / .1));
	const pts = [];
	for (let k = 0; k <= n; k++) pts.push(trunkAt(k / n * H));
	const R = spec.radius * clamp(H / 8) + .004;
	bag.add("body", tube(pts, (u) => R * (1 - .7 * u) * (1 + .35 * Math.pow(1 - Math.min(1, u * H / .6), 3)), (u) => mix(spec.bark[1], spec.bark[0], clamp((u - .75) * 4)), 12));
	out.push({
		pts,
		tip: pts[n].clone(),
		dir: v3(0, 1, 0),
		gen: 0,
		key: ["trunk"],
		grown: 1,
		end: true,
		radius: R,
		born: 0,
		length: H
	});
	for (let i = 0; i < spec.tiers; i++) {
		const lr = chance(seed, "limb", i);
		const h = spec.clear * .3 + i * spec.spacing * about(lr, 1, .15);
		const bear = i * 2.39996 + about(lr, 0, .3);
		const ageLen = H - h;
		if (ageLen <= .05) break;
		if (h < H - spec.crown || h < spec.clear * clamp(H / 4)) {
			lr();
			continue;
		}
		const full = spec.limb(h / Math.max(1, H)) * about(lr, 1, .15);
		const len = Math.min(full, ageLen / spec.rate * full * .5 + .05);
		const out0 = v3(Math.cos(bear), 0, Math.sin(bear));
		const tilt = spec.angle * about(lr, 1, .08);
		let d = out0.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
		const lp = [trunkAt(h)];
		for (let k = 0; k < 8; k++) {
			d = d.clone().add(v3(0, -spec.droop * (k / 8), 0)).normalize();
			lp.push(lp[k].clone().addScaledVector(d, len / 8));
		}
		const lrad = R * .45 * clamp(len / 2 + .2);
		bag.add("body", tube(lp, (u) => lrad * (1 - .75 * u), () => spec.bark[1], 7));
		out.push({
			pts: lp,
			tip: lp[8].clone(),
			dir: d.clone(),
			gen: 1,
			key: ["limb", i],
			grown: 1,
			end: true,
			radius: lrad,
			born: g - 2,
			length: len
		});
		const count = Math.floor(len / spec.side);
		for (let k = 0; k < count; k++) {
			const u = (k + .7) / (count + .7);
			const f = u * 8, kk = Math.min(7, Math.floor(f));
			const p = lp[kk].clone().lerp(lp[kk + 1], f - kk);
			const along = lp[kk + 1].clone().sub(lp[kk]).normalize();
			const sd = new three.Vector3().crossVectors(along, v3(0, 1, 0)).normalize().multiplyScalar(k % 2 ? 1 : -1).multiplyScalar(.8).addScaledVector(along, .6).add(v3(0, between(lr, -.35, .55), 0)).normalize();
			const slen = spec.sides * (1 - .6 * u) * between(lr, .7, 1.1) * clamp(len / 1.5 + .2);
			const sp = [
				p,
				p.clone().addScaledVector(sd, slen * .5),
				p.clone().addScaledVector(sd, slen).add(v3(0, -slen * .12, 0))
			];
			bag.add("body", tube(sp, (uu) => lrad * .3 * (1 - .6 * uu) + .002, () => spec.bark[0], 4));
			out.push({
				pts: sp,
				tip: sp[2].clone(),
				dir: sd,
				gen: 2,
				key: [
					"side",
					i,
					k
				],
				grown: 1,
				end: true,
				radius: lrad * .3,
				born: g - 2 + clamp(1 - len / full) * 1.5,
				length: slen
			});
		}
	}
	return out;
}
/** a value through a table of [g, value] rows, straight between them */
function tableAt(g, rows) {
	if (g <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) if (g <= rows[i][0]) return rows[i - 1][1] + (rows[i][1] - rows[i - 1][1]) * ((g - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
	return rows[rows.length - 1][1];
}

//#endregion
//#region src/lib/plants/wald-canopy.js
const stages = (rows) => rows.map(([name, day, note]) => ({
	name,
	day,
	note
}));
const TAU = /* @__PURE__ */ (() => Math.PI * 2)();
const DOWN = /* @__PURE__ */ (() => v3(0, -1, 0))();
/**
* A leaf made once and stamped onto the tree as often as it has leaves: its pieces merged, built along +X from the
* foot of its stalk (its first vertex), face up; its colours kept as shades of the leaf's own colour (1 the colour).
* @param {THREE.BufferGeometry[]} parts
*/
function template(parts) {
	const g = (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(parts);
	for (const p of parts) p.dispose();
	return g;
}
/**
* All a tree's leaves, gathered straight into one geometry as they are stamped: the template set at `m` and coloured,
* thousands of times, without a geometry each. Thinned as the bag thins its sheets (DETAIL.thin): one leaf in so many
* kept, grown bigger from its stalk.
*/
var Foliage = class {
	constructor() {
		this.verts = 0;
		this.tris = 0;
		this.pos = /* @__PURE__ */ new Float32Array(12288);
		this.nor = /* @__PURE__ */ new Float32Array(12288);
		this.uv = /* @__PURE__ */ new Float32Array(8192);
		this.col = /* @__PURE__ */ new Float32Array(12288);
		this.idx = /* @__PURE__ */ new Uint32Array(12288);
		this.kept = 0;
	}
	/** room for `v` more vertices and `t` more indices, doubling as it fills @param {number} v @param {number} t */
	room(v, t) {
		/** @template {Float32Array | Uint32Array} A @param {A} a @param {number} need @returns {A} */
		const grow = (a, need) => {
			if (need <= a.length) return a;
			const b = new a.constructor(Math.max(need, a.length * 2));
			b.set(a);
			return b;
		};
		const n = this.verts + v;
		this.pos = grow(this.pos, n * 3);
		this.nor = grow(this.nor, n * 3);
		this.col = grow(this.col, n * 3);
		this.uv = grow(this.uv, n * 2);
		this.idx = grow(this.idx, this.tris + t);
	}
	/** @param {THREE.BufferGeometry} tpl @param {THREE.Matrix4} m @param {THREE.Color} colour */
	stamp(tpl, m, colour) {
		if (DETAIL.thin < 1) {
			this.kept += DETAIL.thin;
			if (this.kept < 1) return;
			this.kept -= 1;
			const grow = Math.min(1.8, 1 / Math.sqrt(DETAIL.thin));
			m = m.clone().multiply(new three.Matrix4().makeScale(grow, grow, grow));
		}
		const e = m.elements;
		const P = tpl.attributes.position.array, N = tpl.attributes.normal.array;
		const C = tpl.attributes.color.array, U = tpl.attributes.uv.array;
		const I = tpl.index.array;
		const nv = P.length / 3;
		this.room(nv, I.length);
		const base = this.verts;
		const pos = this.pos, nor = this.nor, col = this.col;
		for (let i = 0, o = base * 3; i < P.length; i += 3, o += 3) {
			const x = P[i], y = P[i + 1], z = P[i + 2];
			pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
			pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
			pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
			const a = N[i], b = N[i + 1], c = N[i + 2];
			const nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
			const l = Math.hypot(nx, ny, nz) || 1;
			nor[o] = nx / l;
			nor[o + 1] = ny / l;
			nor[o + 2] = nz / l;
			col[o] = C[i] * colour.r;
			col[o + 1] = C[i + 1] * colour.g;
			col[o + 2] = C[i + 2] * colour.b;
		}
		this.uv.set(U, base * 2);
		for (let i = 0; i < I.length; i++) this.idx[this.tris + i] = I[i] + base;
		this.verts += nv;
		this.tris += I.length;
	}
	/** the leaves into the bag, among its sheets (as they are: already thinned) @param {Bag} bag */
	into(bag) {
		if (!this.tris) return;
		const g = new three.BufferGeometry();
		g.setAttribute("position", new three.BufferAttribute(this.pos.slice(0, this.verts * 3), 3));
		g.setAttribute("normal", new three.BufferAttribute(this.nor.slice(0, this.verts * 3), 3));
		g.setAttribute("uv", new three.BufferAttribute(this.uv.slice(0, this.verts * 2), 2));
		g.setAttribute("color", new three.BufferAttribute(this.col.slice(0, this.verts * 3), 3));
		g.setIndex(new three.BufferAttribute(this.idx.slice(0, this.tris), 1));
		bag.parts.sheet.push(g);
	}
};
/** a shade: the leaf's colour lighter or darker, or warmer (the stalk, the midrib) */
const shade = (r, g = r, b = r) => new three.Color(r, g, b);
/**
* A simple leaf: its stalk, then its blade, bowed down at the tip — a few rows only, for a crown of thousands (cupped,
* and its midrib paler, with `across` 2). The blade
* can be set back over the stalk's end (`back`, parts of its length), so a heart-shaped base wraps round it.
* @param {{ stalk: number, length: number, width: number, shape: (u: number) => number, back?: number, cup?: number, bow?: number, along: number, across?: number, cross?: boolean }} o
*/
function simpleLeaf(o) {
	const parts = [];
	if (o.stalk > 0) parts.push(sheet({
		length: o.stalk,
		width: .0012,
		shape: () => 1,
		paint: () => shade(1.05, 1.05, .7),
		along: 1,
		across: 1
	}));
	const blade = sheet({
		length: o.length,
		width: o.width,
		shape: o.shape,
		lift: (u, v) => (o.cup ?? .05) * v * v - (o.bow ?? .08) * u * u,
		paint: (u, v) => Math.abs(v) < .2 ? shade(1.18, 1.2, 1) : shade(lerp(1.06, .92, u)),
		along: o.along,
		across: o.across ?? 1
	});
	blade.translate(o.stalk - (o.back ?? 0) * o.length, 0, 0);
	parts.push(blade);
	if (o.cross) parts.push(blade.clone().rotateX(Math.PI / 2));
	return template(parts);
}
/**
* The walnut's leaf: a long arching rachis, its leaflets in pairs growing larger toward the tip, and one at the end
* (`wide`, how broad a leaflet is for its length: the walnut's long, the pecan's longer still).
* @param {number} length the rachis @param {number} pairs @param {number} [wide]
*/
function pinnateLeaf(length, pairs, wide = .24) {
	const parts = [];
	const bow = (u) => -.16 * u * u * length;
	parts.push(sheet({
		length,
		width: .0028,
		shape: (u) => 1 - .5 * u,
		lift: (u) => -.16 * u * u,
		paint: () => shade(1.1, 1.08, .75),
		along: 2,
		across: 1
	}));
	const leaflet = (u, len, side) => {
		const x = u * length, slope = -.32 * u;
		const turn = side === 0 ? 0 : side * .95;
		const d = v3(Math.cos(turn), slope + (side ? -.05 : 0), Math.sin(turn)).normalize();
		const blade = sheet({
			length: len,
			width: len * wide,
			shape: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, .85)), .6) * (t < .05 ? t / .05 : 1),
			lift: (t) => -.06 * t * t,
			paint: () => shade(side > 0 ? 1.04 : side < 0 ? .96 : 1.08),
			along: 3,
			across: 1
		});
		blade.applyMatrix4(aim(v3(x, bow(u), 0), d, side * .25));
		parts.push(blade);
	};
	for (let k = 0; k < pairs; k++) {
		const u = .38 + .5 * k / Math.max(1, pairs - 1);
		const len = length * (.27 + .1 * (k / Math.max(1, pairs - 1)));
		leaflet(u, len, 1);
		leaflet(u + .03, len, -1);
	}
	leaflet(1, length * .4, 0);
	return template(parts);
}
/**
* Where the nuts and flowers already hang, for the leaves to keep out of: balls in a coarse grid, quick to ask.
*/
var Clear = class {
	constructor() {
		/** @type {Map<number, { c: THREE.Vector3, r: number }[]>} */
		this.cells = /* @__PURE__ */ new Map();
		this.size = .3;
	}
	/** @param {number} x @param {number} y @param {number} z */
	key(x, y, z) {
		return ((Math.floor(x / this.size) + 512) * 1024 + Math.floor(y / this.size) + 512) * 1024 + Math.floor(z / this.size) + 512;
	}
	/** @param {THREE.Vector3} c @param {number} r */
	add(c, r) {
		const k = this.key(c.x, c.y, c.z);
		const list = this.cells.get(k);
		if (list) list.push({
			c: c.clone(),
			r
		});
		else this.cells.set(k, [{
			c: c.clone(),
			r
		}]);
	}
	/** how deep a ball at p of radius r sinks into what is here (0 when it touches nothing) @param {THREE.Vector3} p @param {number} r */
	depth(p, r) {
		let worst = 0;
		const s = this.size;
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
			const list = this.cells.get(this.key(p.x + dx * s, p.y + dy * s, p.z + dz * s));
			if (list) for (const b of list) worst = Math.max(worst, b.r + r - b.c.distanceTo(p));
		}
		return worst;
	}
	/** whether a ball at p of radius r touches anything here @param {THREE.Vector3} p @param {number} r */
	hit(p, r) {
		if (!this.cells.size) return false;
		const s = this.size;
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
			const list = this.cells.get(this.key(p.x + dx * s, p.y + dy * s, p.z + dz * s));
			if (list) {
				for (const b of list) if (b.c.distanceTo(p) < b.r + r) return true;
			}
		}
		return false;
	}
};
/** @typedef {import('./crown.js').Shoot} Shoot */
/**
* @typedef {{ bag: Bag, g: number, seed: string, shoots: Shoot[], vigour: number, clear: Clear, gens: number }} Ctx —
*   what a tree's flowers and nuts are grown with: its shoots (`gens` the last flush of a flushing crown), and where
*   things already are
*/
/**
* @typedef {{
*   stalk: number, length: number, width: number, shape: (u: number) => number, back?: number, cup?: number, bow?: number,
*   along: number, pinnate?: number, wide?: number, cross?: boolean
* }} Blade — a leaf's make: a simple blade, or `pinnate` pairs of leaflets along a rachis `length` long (`wide` how
*   broad each leaflet is for its length); `cross`, a second blade across the first (a bundle of needles)
*/
/**
* @typedef {{
*   seed: { size: THREE.Vector3, coat: string, shade: string, depth: number }, hypogeal: boolean,
*   cotyledon?: { length: number, width: number, colour: string },
*   roots: { tap: number, spread: number, count: number, radius: number }, nodules?: boolean,
*   flush?: import('./crown.js').Flush, leader?: import('./crown.js').Leader,
*   coppice?: { stems: [number, number], from: number, every: number, lean: number, stool: number, leader: import('./crown.js').Leader },
*   leaf: { blade: Blade, colour: string, young: string, autumn: string, droop: number, gap: number, per: number, twig: number, tuft: number, from?: number, inner?: number, limb?: number, top?: number, bare?: boolean, spring?: boolean },
*   bear: (ctx: Ctx) => void
* }} Wood — a tree of the forest garden, described: its seed, its roots (`nodules` the alder's), its crown (in flushes,
*   with a leader, or a coppice of `stems` leaders from the stool, one every `every` stages from `from`), its leaves
*   (a node every `gap` metres along the outer shoots, of one leaf or a short twig `twig` long with `per`; `tuft` more
*   at each tip; along the older wood within, `inner` times sparser; on a leader's limbs from `limb` of the way out,
*   and in sprays up its `top` metres; `bare` if it flowers before they come, `spring` if as they come)
*   and `bear`, which grows its flowers and its nuts
*/
/**
* @param {Wood} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function wood(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .08);
		const at = v3(0, -spec.seed.depth, 0);
		const s = sprout(bag, {
			seed,
			at,
			size: spec.seed.size,
			coat: spec.seed.coat,
			coatShade: spec.seed.shade,
			stem: table(g, [
				[0, 0],
				[.3, spec.seed.depth * .1 + .001],
				[1, spec.seed.depth + .03],
				[2, spec.seed.depth + .07],
				[9, spec.seed.depth + .07]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.6, 0]
			]),
			radius: .0018 + .004 * span(g, 1, 3),
			stemColor: "#7a6a42",
			leaf: spec.cotyledon ? {
				length: spec.cotyledon.length,
				width: spec.cotyledon.width,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7),
				color: spec.cotyledon.colour,
				vein: "#a6c47e"
			} : {
				length: .001,
				width: 5e-4,
				shape: () => 1,
				color: "#7a8a4a",
				vein: "#7a8a4a"
			},
			open: spec.hypogeal ? 0 : span(g, 1.1, 2),
			shed: spec.hypogeal ? span(g, 3.5, 4.5) : span(g, 1, 1.6),
			wither: spec.hypogeal ? 1 : span(g, 3, 3.8),
			keepCoat: spec.hypogeal
		});
		root(bag, {
			seed,
			key: ["tap"],
			from: at.clone(),
			dir: v3(.02, -1, .01),
			length: spec.roots.tap,
			grown: table(g, [
				[0, 0],
				[.3, .004],
				[1, .03],
				[2, .07],
				[3, .2],
				[4, .45],
				[5, .75],
				[6, .9],
				[8, 1]
			]),
			radius: .002 + spec.roots.radius * span(g, 2, 8),
			down: .03,
			wander: .1,
			laterals: 10,
			lateral: .3,
			depth: 2,
			age: span(g, 1.5, 6),
			young: "#f3e6cc",
			old: "#5e4632"
		});
		for (let i = 0; i < spec.roots.count; i++) {
			const rr = chance(seed, "feeder", i);
			const born = 2.6 + i * (4 / spec.roots.count);
			const bear = i * 2.39996 + rr() * .4;
			root(bag, {
				seed,
				key: ["feeder", i],
				from: at.clone().add(v3(0, -.04 - rr() * .12, 0)),
				dir: v3(Math.cos(bear), -.15, Math.sin(bear)),
				length: between(rr, .6, 1) * spec.roots.spread * vigour,
				grown: (g - born) / 2.8,
				radius: .003 + spec.roots.radius * .4 * span(g, 3, 8),
				down: .01,
				wander: .14,
				laterals: 4,
				lateral: .25,
				depth: 2,
				age: (g - born - .6) / 2.5,
				young: "#efdcb8",
				old: "#5e4632"
			});
		}
		if (spec.nodules) nodules(bag, seed, g, at);
		/** @type {Shoot[]} */
		let shoots = [];
		const girth = table(g, [
			[2, .12],
			[3, .25],
			[4, .55],
			[5, .8],
			[6, .92],
			[9, 1]
		]);
		if (spec.flush) shoots = flushCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: {
				...spec.flush,
				radius: spec.flush.radius * girth
			}
		});
		else if (spec.leader) shoots = leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		});
		else if (spec.coppice) shoots = coppice(bag, seed, g, s.top.clone(), spec.coppice);
		for (const sh of shoots) if (sh.gen <= (spec.flush ? 2 : 1) && sh.radius > .01) bag.space.rod(sh.pts, sh.radius + .01);
		const clear = new Clear();
		spec.bear({
			bag,
			g,
			seed,
			shoots,
			vigour,
			clear,
			gens: spec.flush?.gens ?? 2
		});
		const L = spec.leaf;
		const tr = chance(seed, "leaf-make");
		const B = L.blade;
		const make = () => B.pinnate ? pinnateLeaf(B.length * about(tr, 1, .06), B.pinnate, B.wide) : simpleLeaf({
			...B,
			length: B.length * about(tr, 1, .06)
		});
		const tpls = [
			make(),
			make(),
			make()
		];
		const season = L.bare ? table(g, [
			[4.3, 1],
			[4.5, 0],
			[5.25, 0],
			[5.8, 1]
		]) : 1;
		const unfold = L.bare ? clamp((g - 5.25) / .9) : 1;
		const fall = span(g, 8.2, 9.2);
		const leaves = new Foliage();
		if (season > .03) for (const sh of shoots) foliage(bag, leaves, spec, seed, g, sh, tpls, clear, season, g > 5.25 && g < 6.2 ? unfold : 1, fall);
		leaves.into(bag);
		for (const t of tpls) t.dispose();
		return bag.build();
	};
}
/**
* The leaves of a shoot: one by one along it in a spiral, turned out toward the light, and a tuft at its tip; on a
* leader's limbs along their outer half, and up the leader's own top. New leaves their young colour, darkening as they
* harden; in the autumn some yellowing.
* @param {Bag} bag @param {Foliage} leaves @param {Wood} spec @param {string} seed @param {number} g @param {Shoot} sh
* @param {THREE.BufferGeometry[]} tpls @param {Clear} clear @param {number} season @param {number} unfold @param {number} fall
*/
function foliage(bag, leaves, spec, seed, g, sh, tpls, clear, season, unfold, fall) {
	const L = spec.leaf;
	const lr = chance(seed, "leaves", ...sh.key);
	const leader = !spec.flush;
	const outer = (spec.flush?.gens ?? 0) - 1;
	const leafy = leader ? true : sh.end || sh.gen === 0 && g < 3.4 || sh.gen >= Math.min(L.from ?? 99, outer);
	const inner = !leafy && sh.gen >= 1 && L.inner ? L.inner : 0;
	if (!leafy && !inner) return;
	const age = Math.min(clamp((g - sh.born) / .6), unfold);
	const reach = L.blade.pinnate ? L.blade.length * 1.1 : L.blade.length + L.blade.stalk;
	const young = new three.Color(L.young), old = new three.Color(L.colour), autumn = new three.Color(L.autumn);
	const spring = L.spring ? .75 * table(g, [
		[4.4, 0],
		[4.75, 1],
		[5.3, 1],
		[5.9, 0]
	]) : 0;
	/** one leaf at p, reaching out along `out` @param {THREE.Vector3} p @param {THREE.Vector3} out */
	const leaf = (p, out) => {
		const size = between(lr, .8, 1.1) * lerp(.45, 1, age) * lerp(.55, 1, clamp(g - 2)) * season;
		const hang = lerp(-.7, -L.droop, age) + about(lr, 0, .3);
		const tpl = tpls[Math.floor(lr() * tpls.length)];
		const roll = (lr() - .5) * .6;
		const tint = lr();
		const yellow = fall * clamp((lr() - .6) * 1.6);
		if (size < .02) return;
		let dir = null;
		const flat = out.clone().setY(0);
		if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
		flat.normalize();
		for (const turn of [
			0,
			.7,
			-.7,
			1.5,
			-1.5,
			2.4,
			-2.4
		]) {
			const d = flat.clone().applyAxisAngle(v3(0, 1, 0), turn).multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
			let hit = false;
			for (const f of [
				.35,
				.7,
				1
			]) if (clear.hit(p.clone().addScaledVector(d, reach * size * f), reach * size * .16)) hit = true;
			if (!hit) {
				dir = d;
				break;
			}
		}
		if (!dir) return;
		const colour = young.clone().lerp(old, age * (1 - spring)).multiplyScalar(.92 + .16 * tint).lerp(autumn, yellow * .75);
		leaves.stamp(tpl, aim(p, dir, roll).multiply(new three.Matrix4().makeScale(size, size, size)), colour);
	};
	/** out from the shoot, round it by `bear`, and a little out from the trunk */
	const outFrom = (p, dir, bear, forward) => {
		let side = new three.Vector3().crossVectors(dir, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side = v3(1, 0, 0);
		side.normalize().applyAxisAngle(dir, bear);
		const away = v3(p.x, 0, p.z);
		if (away.lengthSq() > 1e-6) side.addScaledVector(away.normalize(), .45);
		return side.addScaledVector(dir, forward);
	};
	if (leader && sh.gen === 0) {
		const top = Math.min(L.top ?? 2.4, sh.length * .6);
		const n = Math.max(2, Math.min(40, Math.round(top / L.gap)));
		for (let k = 0; k < n; k++) {
			const { at, dir } = along(sh.pts, 1 - top / sh.length * (k / n));
			const twig = .06 + .3 * (k / n) * clamp(sh.length / 4);
			for (let m = 0; m < 4; m++) {
				const a = (k * 4 + m) * 2.39996;
				const o = v3(Math.cos(a), 0, Math.sin(a));
				leaf(at.clone().addScaledVector(o, twig), o.addScaledVector(dir, .5));
			}
		}
		return;
	}
	const from = leader && sh.gen === 1 ? L.limb ?? .5 : inner ? .3 : .12;
	const gap = sh.gen === 0 && !leader ? Math.min(L.gap, .09) : L.gap * (inner || 1);
	const n = Math.min(40, Math.max(1, Math.round(sh.length * (1 - from) / gap)));
	const bark = new three.Color(spec.flush?.bark[0] ?? spec.leader?.bark[0] ?? spec.coppice?.leader.bark[0] ?? "#6a5a4a");
	for (let k = 0; k < n; k++) {
		const u = from + (k + .5) / n * (1 - from);
		const { at, dir } = along(sh.pts, u);
		const out = outFrom(at, dir, k * 2.39996 + lr() * .5, .45);
		if (L.per <= 1) {
			leaf(at, out);
			continue;
		}
		const td = out.clone().normalize().add(v3(0, .25, 0)).normalize();
		const tl = L.twig * between(lr, .7, 1.15) * lerp(.4, 1, age) * season + .01;
		const end = at.clone().addScaledVector(td, tl);
		bag.add("body", tube([at, end], (t) => .003 * (1 - .5 * t), () => bark, 3));
		for (let m = 0; m < L.per; m++) {
			const p = at.clone().lerp(end, (m + 1) / L.per);
			leaf(p, outFrom(p, td, (m % 2 ? 1 : -1) * 1.3 + lr() * .4, m === L.per - 1 ? 1.2 : .4));
		}
	}
	if ((sh.end || leader) && !inner) for (let k = 0; k < L.tuft; k++) {
		const { at, dir } = along(sh.pts, 1 - k % 3 * .05);
		leaf(at, outFrom(at, dir, k * 2.39996 + 1, 1.1));
	}
}
/** a place along a path, u 0 … 1 */
function along(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return {
		at: pts[k].clone().lerp(pts[k + 1], f - k),
		dir: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/**
* The hazel's stool: stems coming up from the base one after another, each a leader of its own leaning out from the
* middle, the first the seedling's own; they are grown upright (./crown.js) and tipped over at their foot.
* @param {Bag} bag @param {string} seed @param {number} g @param {THREE.Vector3} top
* @param {NonNullable<Wood['coppice']>} c
* @returns {Shoot[]}
*/
function coppice(bag, seed, g, top, c) {
	/** @type {Shoot[]} */
	const out = [];
	const cr = chance(seed, "stool");
	const count = c.stems[0] + Math.floor(cr() * (c.stems[1] - c.stems[0] + 1));
	for (let i = 0; i < count; i++) {
		const sr = chance(seed, "stem", i);
		const born = c.from + i * c.every * about(sr, 1, .25);
		const bear = i * 2.39996 + about(sr, 0, .3);
		const off = i === 0 ? 0 : c.stool * between(sr, .4, 1);
		const tilt = i === 0 ? about(sr, .05, .03) : c.lean * between(sr, .55, 1.2);
		const local = g - born + 2;
		if (local <= 2) continue;
		const base = top.clone().add(v3(Math.cos(bear) * off, -.02, Math.sin(bear) * off));
		const m = new three.Matrix4().makeTranslation(base.x, base.y, base.z).multiply(new three.Matrix4().makeRotationAxis(v3(-Math.sin(bear), 0, Math.cos(bear)), -tilt));
		const proxy = {
			/** @param {import('./grow.js').Kind} kind @param {THREE.BufferGeometry} geo @param {THREE.Matrix4} [mm] */
			add(kind, geo, mm) {
				if (mm) geo.applyMatrix4(mm);
				geo.applyMatrix4(m);
				bag.add(kind, geo);
				return proxy;
			},
			space: bag.space
		};
		const tall = about(sr, 1, .12) * (1 - .06 * i);
		const spec = {
			...c.leader,
			height: c.leader.height.map(([a, h]) => [a, h * tall])
		};
		const shoots = leaderCrown(proxy, {
			seed: `${seed}·${i}`,
			g: local,
			from: v3(0, 0, 0),
			spec
		});
		const turn = new three.Matrix3().setFromMatrix4(m);
		for (const sh of shoots) {
			sh.pts = sh.pts.map((p) => p.clone().applyMatrix4(m));
			sh.tip = sh.tip.clone().applyMatrix4(m);
			sh.dir = sh.dir.clone().applyMatrix3(turn).normalize();
			sh.key = [
				"stem",
				i,
				...sh.key
			];
			out.push(sh);
		}
	}
	return out;
}
/**
* The alder's root nodules: clusters of knobbly orange-brown lumps on its shallow roots, where Frankia, living in
* them, fixes nitrogen from the air for the alder and, as roots and leaves rot, for the plants round it.
* @param {Bag} bag @param {string} seed @param {number} g @param {THREE.Vector3} at
*/
function nodules(bag, seed, g, at) {
	const grown = span(g, 2.4, 6);
	if (grown <= .01) return;
	const nr = chance(seed, "nodules");
	const count = 9;
	for (let i = 0; i < count; i++) {
		const bear = i * 2.39996 + nr() * .8;
		const reach = between(nr, .12, .7) * lerp(.3, 1, grown);
		const deep = between(nr, .06, .25);
		const o = v3(Math.cos(bear), 0, Math.sin(bear));
		const end = at.clone().addScaledVector(o, reach).add(v3(0, -deep, 0));
		root(bag, {
			seed,
			key: ["nodule-root", i],
			from: at.clone().add(v3(0, -.03, 0)),
			dir: o.clone().add(v3(0, -deep / Math.max(.1, reach), 0)),
			length: end.distanceTo(at) * 1.1,
			grown: grown * 1.2,
			radius: .004 + .008 * grown,
			down: 0,
			wander: .04,
			laterals: 0,
			depth: 0,
			age: grown,
			young: "#e8d4b0",
			old: "#6a4e36"
		});
		const size = (.008 + .022 * nr()) * grown;
		const lumps = 5 + Math.floor(nr() * 5);
		for (let k = 0; k < lumps; k++) {
			const d = v3(nr() - .5, nr() - .5, nr() - .5).normalize();
			bag.add("body", bead(end.clone().addScaledVector(d, size * .6), v3(1, .8, 1).multiplyScalar(size * between(nr, .35, .6)), mix("#d0884a", "#8a5a34", nr()), 3));
		}
	}
}
/** the shoots a flushing tree flowers on: the outermost, its last flush, `share` of them (the same at every stage) */
function tips(ctx, share) {
	return ctx.shoots.filter((sh) => sh.end && sh.gen >= ctx.gens - 1 && sh.grown > .6 && chance(ctx.seed, "tip", ...sh.key)() < share);
}
/**
* A catkin: a slender spike from `at`, out along `dir` and then hanging (or held stiffly, `stiff` 1), its length `len`.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} dir @param {number} len @param {number} radius
* @param {THREE.ColorRepresentation} colour @param {number} stiff
*/
function catkin(bag, at, dir, len, radius, colour, stiff) {
	if (len < .003) return;
	const pts = [at.clone()];
	const d = dir.clone().normalize();
	for (let i = 0; i < 5; i++) {
		d.lerp(DOWN, (1 - stiff) * .45).normalize();
		pts.push(pts[i].clone().addScaledVector(d, len / 5));
	}
	const c = new three.Color(colour);
	bag.add("body", tube(pts, (u) => radius * (u < .1 ? .5 + 5 * u : 1 - .45 * u * u), (u) => c.clone().multiplyScalar(.85 + .25 * u), 5));
}
/**
* Where a nut hangs from its site, touching nothing: from `from`, along a direction near `dir`, its stalk perhaps a
* little longer, so that it keeps clear of the thick wood (the bag's Space) and of the nuts and flowers already hung
* (Clear, a grid — quick however many there are), which it then joins, for the leaves to keep out of too.
* @param {Ctx} ctx @param {THREE.Vector3} from @param {THREE.Vector3} dir @param {number} L @param {number} W @param {number} reach
*/
function hang(ctx, from, dir, L, W, reach) {
	const balls = (a, d) => [.3, .7].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * .95
	}));
	const d0 = dir.clone().normalize();
	let best = {
		at: from.clone(),
		dir: d0,
		cost: Infinity
	};
	const side = new three.Vector3();
	search: for (const ext of [
		0,
		.5,
		1
	]) for (const swing of [
		0,
		.45,
		.9,
		1.4,
		2
	]) {
		for (let k = 0; k < (swing ? 8 : 1); k++) {
			const a = k / 8 * TAU;
			side.set(Math.cos(a), 0, Math.sin(a));
			const d = d0.clone().addScaledVector(side, swing).normalize();
			if (d.y > .35) continue;
			const p = from.clone().addScaledVector(d, ext * reach);
			let cost = swing * .004 + ext * .003;
			for (const b of balls(p, d)) cost += (ctx.bag.space.depth(b.c, b.r) + ctx.clear.depth(b.c, b.r)) * 10 + Math.max(0, b.r - b.c.y) * 10;
			if (cost < best.cost) best = {
				at: p,
				dir: d,
				cost
			};
		}
		if (best.cost < .004 * (swing + .5)) break search;
	}
	for (const b of balls(best.at, best.dir)) ctx.clear.add(b.c, b.r);
	return best;
}
/** the matrix that hangs a thing built down -Y from `at` along `dir`, turned round it by `spin` */
const hung = (at, dir, spin) => new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(DOWN, dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(v3(0, 1, 0), spin)), v3(1, 1, 1));
/**
* A husked nut: the husk (smooth, or spiny like the chestnut's burr) round it, splitting into `valves` from the tip as
* it ripens, the nuts inside showing in the clefts; built down -Y from its stalk.
* @param {Bag} bag @param {THREE.Matrix4} m @param {number} L @param {number} W
* @param {{ shape: (u: number) => number, husk: (u: number, v: number) => THREE.Color, split: number, valves: number,
*   spines?: number, rings: number, sides: number, nut: string, nuts: number, nutSize: number, kind?: 'body' | 'gloss' }} o
*/
function husked(bag, m, L, W, o) {
	const axis = [];
	for (let k = 0; k <= o.rings; k++) axis.push(v3(0, -.001 - k / o.rings * L, 0));
	const cleft = (u, v) => {
		if (o.split <= 0) return 1;
		let c = 1;
		for (let k = 0; k < o.valves; k++) c = Math.min(c, Math.abs((v - k / o.valves + 1.5) % 1 - .5));
		const wide = .02 + .07 * o.split;
		return 1 - o.split * .75 * Math.exp(-Math.pow(c / wide, 2)) * clamp(u * 2.2 - .1);
	};
	const radius = (u, v) => {
		const spike = o.spines && u > .06 && u < .94 ? o.spines * ((Math.round(u * o.rings) + Math.round(v * o.sides)) % 2) : 0;
		return W * o.shape(u) * (1 + .12 * o.split) * (1 + spike) * cleft(u, v);
	};
	bag.add(o.kind ?? "body", tube(axis, radius, (u, v) => cleft(u, v) < .75 ? o.husk(u, v).multiplyScalar(.55) : o.husk(u, v), o.sides), m);
	if (o.split > .05) for (let k = 0; k < o.nuts; k++) {
		const a = k / o.nuts * TAU + .4;
		const off = o.nuts > 1 ? W * .32 : 0;
		const c = v3(Math.cos(a) * off, -L * .5, Math.sin(a) * off);
		bag.add("gloss", bead(c, v3(W * o.nutSize * (o.nuts > 1 ? .62 : .9), L * .42 * o.nutSize, W * o.nutSize * (o.nuts > 1 ? .5 : .85)), o.nut, 3, new three.Quaternion().setFromAxisAngle(v3(0, 1, 0), -a)), m);
	}
}
const CHESTNUT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A fresh chestnut, glossy brown, sown in the autumn before it dries out, four centimetres down."
	],
	[
		"Germination",
		150,
		"In the spring a thick root pushes out of the pointed tip and down; the seed leaves stay in the nut."
	],
	[
		"Seedling",
		180,
		"A straight shoot of long, toothed leaves, each tooth ending in a bristle."
	],
	[
		"Sapling",
		730,
		"A fast young tree, its bark smooth and olive-grey, its leaves in two rows along the shoots."
	],
	[
		"Young tree",
		2200,
		"A broad dome on a stout trunk, its bark beginning to fissure — and to twist, in a spiral, as it ages."
	],
	[
		"Flowering",
		3080,
		"Late, at midsummer, in full leaf: long cream catkins stand out from the shoot tips by the hundred, heavy-scented; small green female flowers sit at the base of the upper ones."
	],
	[
		"Burr set",
		3100,
		"The catkins brown and fall; where the female flowers were, little green burrs bristle."
	],
	[
		"Green burrs",
		3170,
		"Spiny green burrs the size of a fist at the shoot tips, one to three nuts in each."
	],
	[
		"Turning",
		3240,
		"The burrs fade yellow-brown; the nuts inside harden and darken."
	],
	[
		"Ripe",
		3270,
		"The burrs split in four and gape: two or three glossy red-brown chestnuts in each, dropping in October."
	]
]))();
const chestnut = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.014, .011, .016),
		coat: "#6a3a20",
		shade: "#3a2010",
		depth: .04
	},
	hypogeal: true,
	flush: {
		trunk: 1.9,
		trunkBorn: 1.6,
		trunkFlush: 1.2,
		scaffolds: [3, 5],
		scaffoldAngle: .6,
		gens: 6,
		flush: .16,
		rest: .08,
		shoot: (gen) => [
			0,
			1.6,
			1.2,
			.9,
			.7,
			.52,
			.4
		][gen] ?? .38,
		whorl: [2, 3],
		spread: .6,
		up: .055,
		droop: .045,
		wander: .12,
		radius: .16,
		taper: .62,
		thicken: 3.5,
		bark: ["#7e7462", "#5a5044"]
	},
	roots: {
		tap: 2.2,
		spread: 3.4,
		count: 9,
		radius: .08
	},
	leaf: {
		blade: {
			stalk: .02,
			length: .21,
			width: .032,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7) * (u < .05 ? u / .05 : 1),
			along: 5,
			bow: .1
		},
		colour: "#2c5420",
		young: "#4a7a2a",
		autumn: "#c8a038",
		droop: .25,
		gap: .1,
		per: 3,
		twig: .16,
		tuft: 4,
		from: 4,
		inner: 3
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of tips(ctx, .75)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const phase = g - (4.8 + fr() * .3);
			if (phase < -.35) continue;
			const up = sh.dir.clone().lerp(v3(0, 1, 0), .35).normalize();
			if (phase < .95) {
				const n = 3 + Math.floor(fr() * 3);
				for (let k = 0; k < n; k++) {
					const { at, dir } = along(sh.pts, .55 + .45 * k / n);
					const a = k * 2.39996 + fr();
					catkin(bag, at, dir.clone().add(v3(Math.cos(a), .4, Math.sin(a)).multiplyScalar(.8)).normalize(), .19 * lerp(.2, 1, span(phase, -.35, .05)) * lerp(1, .55, span(phase, .4, .95)), .0062, phase < .35 ? mix("#d8dc9a", "#fbf0b8", span(phase, -.2, .05)) : mix("#fbf0b8", "#8a6a3a", span(phase, .35, .8)), .55);
				}
			}
			if (fr() > .35) continue;
			const set = span(phase, .15, 2.3);
			const ripe = span(phase, 2.5, 3.6);
			const split = span(ripe, .55, 1);
			const keep = 1 + Math.floor(fr() * 3);
			for (let k = 0; k < keep; k++) {
				const kr = chance(seed, "burr", ...sh.key, k);
				const size = ctx.vigour * about(kr, 1, .1);
				const W = .032 * size * lerp(.15, 1, set), L = .062 * size * lerp(.15, 1, set);
				const swing = v3(Math.cos(k * 2.4 + kr() * 2), 0, Math.sin(k * 2.4 + kr() * 2));
				const start = sh.tip.clone().addScaledVector(up, .01);
				const place = hang(ctx, start.clone().addScaledVector(swing, .01), swing.clone().add(v3(0, -.5, 0)), L, W * 1.35, .02 + W);
				bag.fruit([
					"burr",
					...sh.key,
					k
				], sh.tip, place.dir);
				bag.add("body", tube([
					sh.tip,
					start,
					place.at
				], () => .0035 + .002 * set, () => "#6a7040", 4));
				const green = mix("#86b03e", "#b8b84a", ripe * 1.5);
				husked(bag, hung(place.at, place.dir, kr() * TAU), L, W, {
					shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .96))), .45),
					husk: (u) => (ripe < .6 ? green.clone() : mix("#b8a04a", "#8a6a38", (ripe - .6) / .4)).multiplyScalar(.9 + .2 * u),
					split,
					valves: 4,
					spines: 1.1 * lerp(.4, 1, set),
					rings: 8,
					sides: 12,
					nut: "#6a3218",
					nuts: 2 + Math.floor(kr() * 2),
					nutSize: .95
				});
				bag.fruitDone();
			}
		}
	}
}))();
/** @type {(import('./index.js').Plant & { layer: import('./index.js').Layer })[]} */
const WALD$1 = [{
	id: "chestnut",
	label: "Sweet chestnut",
	latin: "Castanea sativa · Esskastanie",
	note: "A big domed tree of long, bristle-toothed leaves; at midsummer long cream catkins all over the crown, then spiny green burrs at the shoot tips, fading yellow-brown and splitting over two or three glossy chestnuts.",
	from: "Tree · 9 years",
	stages: CHESTNUT_STAGES,
	grow: chestnut,
	layer: "canopy"
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