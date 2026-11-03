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
/** the matrix that sets a shape built along +X (normal +Y) at `at`, pointing along `dir`, rolled by `roll` round it */
function aim(at, dir, roll = 0) {
	const x = dir.clone().normalize();
	let z = new three.Vector3().crossVectors(x, UP$1);
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
	if (o.stem > o.radius * .5) bag.add("body", tube(path, (u) => o.radius * (1 - .25 * u), (u) => mix$1("#e9e3c8", o.stemColor, .35 + u * .65), 6));
	const coatAt = o.keepCoat ? o.at : top;
	if (o.shed < 1) {
		const s = o.size.clone().multiplyScalar(1 - .25 * o.shed);
		const turn = new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), o.keepCoat || o.stem < o.radius ? across : tip);
		const lift = o.keepCoat ? v3(0, 0, 0) : tip.clone().multiplyScalar(o.size.x * .6);
		bag.add("body", bead(coatAt.clone().add(lift), s, mix$1(o.coat, o.coatShade, o.shed), 7, turn));
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
				paint: (u, v) => mix$1(mix$1(o.leaf.color, o.leaf.vein, Math.abs(v) < .12 ? .6 : 0), "#d9c45a", o.wither * 1.2 - .1 + u * o.wither * .4),
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
//#region src/lib/plants/allies.js
/**
* A root drawn here rather than by `root`, so its path is known: wandering down from `from`, with the pink nodules of
* a legume (the clover's, the bean's) along it, where the bacteria fix nitrogen. Its laterals are ordinary roots.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], from: THREE.Vector3, dir: THREE.Vector3, length: number, grown: number, radius: number, nodules: number, laterals: number, age: number }} o
*/
function noduled(bag, o) {
	const r = chance(o.seed, "noduled", ...o.key);
	const grown = clamp(o.grown);
	if (grown <= .01) return;
	const steps = 12;
	const pts = [o.from.clone()];
	const d = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		d.y -= .06;
		d.x += (r() - .5) * .4;
		d.z += (r() - .5) * .4;
		if (d.y > -.2) d.y = -.2;
		d.normalize();
		pts.push(pts[i].clone().addScaledVector(d, o.length * grown / steps));
	}
	bag.add("body", tube(pts, (u) => o.radius * (.4 + .6 * grown) * (1 - .75 * u), (u) => mix$1("#c8a878", "#f4ecd8", u * 1.4 - clamp(o.age) + .3), 5));
	for (let k = 0; k < o.laterals; k++) {
		const u = .15 + .75 * (k / o.laterals);
		if (u > grown) break;
		const i = Math.min(11, Math.floor(u * steps));
		const a = k * 2.39996 + r();
		root(bag, {
			seed: o.seed,
			key: [
				...o.key,
				"lat",
				k
			],
			from: pts[i].clone(),
			dir: v3(Math.cos(a), -.4, Math.sin(a)),
			length: o.length * between(r, .3, .55),
			grown: (grown - u) * 2.2,
			radius: o.radius * .4,
			down: .04,
			wander: .3,
			laterals: 3,
			lateral: .3,
			depth: 1,
			young: "#f6efdc",
			old: "#c8ae84"
		});
	}
	const n = Math.round(o.nodules * clamp(o.age * 1.3));
	for (let k = 0; k < n; k++) {
		const f = between(r, .05, .6) * grown * steps, i = Math.min(11, Math.floor(f));
		const p = pts[i].clone().lerp(pts[i + 1], f - i);
		const a = r() * Math.PI * 2;
		const s = o.radius * between(r, .7, 1.3);
		bag.add("body", bead(p.add(v3(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius)), v3(s, s * .85, s), mix$1("#e8a0a0", "#c87a7a", r()), 3));
	}
}

//#endregion
//#region src/lib/plants/fields.js
const stages = (rows) => rows.map(([name, day, note]) => ({
	name,
	day,
	note
}));
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** @type {Map<string, THREE.Color>} the colours, each read from its text once (never changed: `mix` makes new ones) */
const COLOURS = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** a colour by its text, read once */
const tint = (c) => {
	if (c instanceof three.Color) return c;
	const key = String(c);
	let got = COLOURS.get(key);
	if (!got) COLOURS.set(key, got = new three.Color(c));
	return got;
};
/** a colour between two, as a new THREE.Color */
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
/** the first part of a path, to u (0 … 1) of its points */
function upto(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.floor(f);
	const out = pts.slice(0, k + 1).map((p) => p.clone());
	if (k < pts.length - 1 && f - k > 1e-4) out.push(pts[k].clone().lerp(pts[k + 1], f - k));
	if (out.length < 2) out.push(out[0].clone().add(v3(0, 1e-5, 0)));
	return out;
}
/** a level direction at the compass bearing a */
const level = (a) => v3(Math.cos(a), 0, Math.sin(a));
/** a direction `tilt` (radians) from upright toward the level `out` */
const tilted = (out, tilt) => out.clone().setY(0).normalize().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
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
/**
* BLADES — the many small flat things of a plant (leaflets, grass blades, spikelets, bracts, pods, petals) and its
* fine stalks as ribbons, gathered into one geometry of the double-sided sheet material, so that thousands are one
* piece. Thinned as ./grow.js's Bag thins its sheets (DETAIL.thin, DETAIL.fill): one in so many kept and grown from
* its base to cover for the rest; and made of fewer rows at a lower DETAIL.level, down to a single diamond.
*/
var Blades = class {
	constructor() {
		/** @type {number[]} */
		this.pos = [];
		/** @type {number[]} */
		this.col = [];
		/** @type {number[]} */
		this.idx = [];
		/** how far into the next one kept, when thinned */
		this.acc = 0;
	}
	/** how much bigger a thing this long is grown when kept at this detail; 0 when it is one of those left out */
	keep(size, round = false) {
		if (DETAIL.thin >= 1 && DETAIL.fill === 1) return 1;
		this.acc += DETAIL.thin;
		if (this.acc < 1) return 0;
		this.acc -= 1;
		const most = Math.max(1, .14 / Math.max(1e-4, size / 2));
		return Math.min(2.6, most, round ? 1 / Math.cbrt(DETAIL.thin) : DETAIL.fill / Math.sqrt(DETAIL.thin));
	}
	/** a vertex, its index */
	vert(p, c) {
		const k = tint(c);
		this.pos.push(p.x, p.y, p.z);
		this.col.push(k.r, k.g, k.b);
		return this.pos.length / 3 - 1;
	}
	/**
	* One blade from `at` along `dir`, its face toward `up`: `shape(u)` its half-width (0 … 1 of `width`) from base to
	* tip; `fold` lifts its edges (a V along the midrib), `droop` bends its tip down, `twin` makes it two faces bulging
	* apart along the midrib — a pod, a spikelet (one folded face at the lowest detail).
	* @param {{
	*   at: THREE.Vector3, dir: THREE.Vector3, up?: THREE.Vector3, length: number, width: number, shape: (u: number) => number,
	*   segs: number, paint: THREE.ColorRepresentation | ((u: number, v: number) => THREE.ColorRepresentation),
	*   fold?: number, droop?: number, twin?: number, round?: boolean, keep?: boolean
	* }} o — `round` grows it as a bead is when thinned (less), `keep` never thins it
	*/
	add(o) {
		const s = o.keep ? 1 : this.keep(Math.max(o.length, o.width * 2), o.round);
		if (!s) return;
		const L = o.length * s, W = o.width * s;
		const X = o.dir.clone().normalize();
		let Z = new three.Vector3().crossVectors(X, o.up ?? UP);
		if (Z.lengthSq() < 1e-8) Z = new three.Vector3().crossVectors(X, Math.abs(X.y) < .9 ? UP : v3(1, 0, 0));
		Z.normalize();
		const Y = new three.Vector3().crossVectors(Z, X);
		const n = DETAIL.level >= 1 ? o.segs : Math.max(1, Math.round(o.segs * DETAIL.level));
		const { shape, at } = o;
		const droop = o.droop ?? 0, twin = o.twin ?? 0;
		const faces = twin && n > 1 ? [1, -1] : [1];
		const fold = (o.fold ?? 0) + (twin && n <= 1 ? twin : 0);
		const paint = typeof o.paint === "function" ? o.paint : () => o.paint;
		const place = (u, v, f) => {
			const w = W * shape(u);
			const lift = w * (fold * Math.abs(v) + (faces.length > 1 ? f * twin : 0) * (1 - Math.abs(v)));
			return v3(at.x + X.x * u * L + Z.x * w * v + Y.x * lift, at.y + X.y * u * L + Z.y * w * v + Y.y * lift - droop * L * u * u, at.z + X.z * u * L + Z.z * w * v + Y.z * lift);
		};
		if (n === 1 && shape(0) < 1e-6 && shape(1) < 1e-6) {
			const b = this.vert(place(0, 0, 1), paint(0, 0)), t = this.vert(place(1, 0, 1), paint(1, 0));
			const l = this.vert(place(.45, -1, 1), paint(.45, -1)), r = this.vert(place(.45, 1, 1), paint(.45, 1));
			this.idx.push(b, l, t, b, t, r);
			return;
		}
		for (const f of faces) {
			/** @type {number[][]} each row's left edge, midrib, right edge */
			const rows = [];
			const wide = [];
			for (let i = 0; i <= n; i++) {
				const u = i / n;
				wide.push(shape(u) > 1e-6);
				rows.push([
					-1,
					0,
					1
				].map((v) => this.vert(place(u, v, f), paint(u, v))));
			}
			for (let i = 0; i < n; i++) for (const e of [0, 2]) {
				const a = rows[i][1], b = rows[i][e], c = rows[i + 1][1], d = rows[i + 1][e];
				if (wide[i]) this.idx.push(a, b, d);
				if (wide[i + 1]) this.idx.push(a, d, c);
			}
		}
	}
	/**
	* A flat ribbon along a path, `width` wide, lying across `side` — a fine stalk as a world sees it from metres away.
	* @param {THREE.Vector3[]} pts @param {number} width @param {(u: number) => THREE.ColorRepresentation} paint @param {THREE.Vector3} [side]
	*/
	strip(pts, width, paint, side = v3(1, 0, 0)) {
		if (DETAIL.level < 1) {
			const every = Math.max(1, Math.round(1 / DETAIL.level));
			if (every > 1 && pts.length > 2) pts = pts.filter((_, i) => i % every === 0 || i === pts.length - 1);
		}
		const n = pts.length;
		if (n < 2) return;
		let first = -1;
		for (let i = 0; i < n; i++) {
			const t = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]);
			let across = new three.Vector3().crossVectors(t, side);
			if (across.lengthSq() < 1e-12) across = new three.Vector3().crossVectors(t, v3(0, 0, 1));
			if (across.lengthSq() < 1e-12) across = v3(1, 0, 0);
			across.normalize().multiplyScalar(width / 2 * (1 - .4 * (i / (n - 1))));
			const c = paint(i / (n - 1));
			const a = this.vert(pts[i].clone().add(across), c);
			this.vert(pts[i].clone().sub(across), c);
			if (first < 0) first = a;
			if (i) this.idx.push(a - 2, a - 1, a, a, a - 1, a + 1);
		}
	}
	/** how far it has got: where what is drawn next begins (see `pick`) */
	mark() {
		return {
			v: this.pos.length / 3,
			i: this.idx.length
		};
	}
	/**
	* What was drawn here since `from` (a `mark()`), as a piece of the fruit `bag` is drawing (Bag.fruit): the bag
	* only sees what goes through its own `add`, and blades go into it whole at the end. The piece is made only when
	* asked for (the fruit viewer, `pickFruit`), so it costs next to nothing otherwise.
	* @param {Bag} bag @param {{ v: number, i: number }} from
	*/
	pick(bag, from) {
		const fruit = bag.drawing;
		if (!fruit || this.idx.length === from.i) return;
		const v1 = this.pos.length / 3, i1 = this.idx.length;
		const { pos, col, idx } = this;
		/** @type {THREE.BufferGeometry | null} */
		let made = null;
		fruit.parts.push({
			kind: "sheet",
			get geometry() {
				if (made) return made;
				made = new three.BufferGeometry();
				made.setAttribute("position", new three.Float32BufferAttribute(pos.slice(from.v * 3, v1 * 3), 3));
				made.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array((v1 - from.v) * 2), 2));
				made.setAttribute("color", new three.Float32BufferAttribute(col.slice(from.v * 3, v1 * 3), 3));
				made.setIndex(idx.slice(from.i, i1).map((k) => k - from.v));
				made.computeVertexNormals();
				return made;
			}
		});
	}
	/** into the bag, as one piece of its sheets (past the bag's own thinning: it is thinned here) */
	into(bag) {
		if (!this.idx.length) return;
		const geo = new three.BufferGeometry();
		const n = this.pos.length / 3;
		geo.setAttribute("position", new three.Float32BufferAttribute(this.pos, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array(n * 2), 2));
		geo.setAttribute("color", new three.Float32BufferAttribute(this.col, 3));
		geo.setIndex(this.idx);
		geo.computeVertexNormals();
		bag.parts.sheet.push(geo);
	}
};
/**
* A fine stalk: a tube at full detail; a ribbon when the world grows the plant lighter (where a tube this thin would be
* left out, see DETAIL.finest); nothing at all when it is too fine even for that.
* @param {Bag} bag @param {Blades} blades @param {THREE.Vector3[]} pts @param {number} r
* @param {(u: number) => THREE.ColorRepresentation} paint @param {number} [sides] @param {THREE.Vector3} [side]
*/
function wire(bag, blades, pts, r, paint, sides = 4, side) {
	if (DETAIL.level >= 1 && r >= DETAIL.finest) bag.add("body", tube(pts, (u) => r * (1 - .35 * u), paint, sides));
	else if (r * 2 >= DETAIL.finest * .6) blades.strip(pts, r * 2.4, paint, side);
}
/** a legume's roots, its nodules on them — none when the world leaves out what is under the soil */
function legumeRoots(bag, o) {
	if (DETAIL.roots) noduled(bag, o);
}
const oval = (u) => Math.pow(Math.sin(Math.PI * u), .7);
/**
* A pea flower (a lentil's, a chickpea's, a soya's): the standard petal up and back, the wings and the keel folded
* forward; a closed bud before it opens.
* @param {Blades} blades @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} size
* @param {THREE.ColorRepresentation} colour @param {THREE.ColorRepresentation} keel @param {number} open @param {number} fall
*/
function peaFlower(blades, at, facing, size, colour, keel, open, fall) {
	if (fall >= 1) return;
	const f = facing.clone().setY(0);
	if (f.lengthSq() < 1e-8) f.set(1, 0, 0);
	f.normalize();
	const s = size * lerp(.55, 1, open) * (1 - .3 * fall);
	const up = f.clone().lerp(v3(0, 1, 0).addScaledVector(f, -.3), open).add(v3(0, -fall, 0)).normalize();
	blades.add({
		at,
		dir: up,
		up: f.clone().negate(),
		length: s,
		width: s * lerp(.25, .5, open),
		shape: oval,
		segs: 2,
		fold: -.3,
		paint: (u) => mix(open > .3 ? colour : "#a8c080", colour, u + open),
		round: true
	});
	if (open > .2) blades.add({
		at,
		dir: f.clone().add(v3(0, -.25 - fall, 0)),
		length: s * .75,
		width: s * .22,
		shape: oval,
		segs: 2,
		twin: .6,
		paint: keel,
		round: true
	});
}
/**
* A pinnate leaf (a lentil's, a chickpea's): its rachis out from `at`, leaflets in pairs along it, and a leaflet or a
* tendril at its end. From far off (a world's lower detail) the whole leaf is one feathery blade.
* @param {Bag} bag @param {Blades} blades
* @param {{
*   r: () => number, at: THREE.Vector3, out: THREE.Vector3, lift: number, length: number, pairs: number,
*   leaflet: { length: number, width: number, shape: (u: number) => number, segs: number }, paint: (u: number, v: number) => THREE.Color,
*   stalk: THREE.ColorRepresentation, radius: number, grown: number, old: number, terminal?: boolean, tendril?: number, drop?: number
* }} o — `drop` the part of its leaflets fallen (an old leaf at harvest)
*/
function pinnateLeaf(bag, blades, o) {
	const g = clamp(o.grown);
	if (g <= .02) return;
	const len = o.length * lerp(.3, 1, g);
	const lift = lerp(1.2, o.lift, g) - o.old * .5;
	const d = o.out.clone().setY(0).normalize().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const pts = arch(o.at, d, len, .3 + o.old * .4, 2);
	const leafLen = o.leaflet.length * lerp(.35, 1, g), leafWide = o.leaflet.width * lerp(.35, 1, g);
	const drop = o.drop ?? 0;
	if (DETAIL.level < .5) {
		if (o.r() < drop) return;
		const end = pts[pts.length - 1];
		blades.add({
			at: o.at,
			dir: end.clone().sub(o.at),
			length: len + (o.terminal ? leafLen * .6 : 0),
			width: leafLen * .8,
			shape: oval,
			segs: 2,
			fold: .2,
			droop: .1,
			paint: o.paint(.5, 0)
		});
		return;
	}
	wire(bag, blades, pts, o.radius, () => o.stalk, 3, o.out);
	const fold = .35 * (1 - g) + .12;
	for (let k = 0; k < o.pairs; k++) {
		const u = lerp(.3, .92, o.pairs === 1 ? 1 : k / (o.pairs - 1));
		const p = point(pts, u), t = towards(pts, u);
		const across = new three.Vector3().crossVectors(t, UP);
		if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
		across.normalize();
		for (const side of [-1, 1]) {
			const size = lerp(.8, 1, k / Math.max(1, o.pairs - 1)) * about(o.r, 1, .08);
			if (o.r() < drop) continue;
			const dir = across.clone().multiplyScalar(side * .85).addScaledVector(t, .45).add(v3(0, -.1 - o.old * .4, 0)).normalize();
			blades.add({
				at: p,
				dir,
				length: leafLen * size,
				width: leafWide * size,
				shape: o.leaflet.shape,
				segs: o.leaflet.segs,
				fold,
				droop: .08 + o.old * .3,
				paint: o.paint
			});
		}
	}
	const end = pts[pts.length - 1], t = towards(pts, 1);
	if (o.terminal && o.r() >= drop) blades.add({
		at: end,
		dir: t,
		length: leafLen,
		width: leafWide,
		shape: o.leaflet.shape,
		segs: o.leaflet.segs,
		fold,
		droop: .1 + o.old * .3,
		paint: o.paint
	});
	if (o.tendril) {
		const tp = [end.clone()];
		const td = t.clone();
		const axis = new three.Vector3().crossVectors(t, UP).normalize();
		for (let k = 0; k < 5; k++) {
			td.applyAxisAngle(axis, -.55 * (k + 1) * .5).normalize();
			tp.push(tp[k].clone().addScaledVector(td, o.tendril * g / 5));
		}
		blades.strip(tp, 7e-4, () => o.stalk, o.out);
	}
}
const LENTIL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small flat lens of a seed, green-brown, two or three centimetres down in early spring — it does not mind the cold."
	],
	[
		"Germination",
		7,
		"The root goes down; the seed itself stays below, and a hooked shoot pushes up from it."
	],
	[
		"First leaves",
		14,
		"Above two scale leaves, the first leaf: a pair of small oval leaflets and a bristle."
	],
	[
		"Seedling",
		24,
		"Leaves of more leaflet pairs, side stems from the base."
	],
	[
		"Branching",
		38,
		"A low, fine, bushy plant, feathery pinnate leaves ending in little tendrils that catch on its neighbours."
	],
	[
		"Flowering",
		52,
		"Tiny white flowers veined with lilac, one or two on a short stalk from the upper axils."
	],
	[
		"Pods set",
		60,
		"Behind the flowers, small flat pods."
	],
	[
		"Green pods",
		72,
		"Pods full, one or two lentils in each; on the roots, the pink nodules have been fixing nitrogen all along."
	],
	[
		"Drying",
		88,
		"Leaves yellowing from the bottom up, the pods turning tan."
	],
	[
		"Harvest",
		100,
		"The whole plant dry and straw-coloured, the lentils rattling in their pods: pulled or cut, and threshed."
	]
]))();
/**
* The lentil at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function lentil(g, seed) {
	const bag = new Bag(), blades = new Blades();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const at = v3(0, -.025, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0026, .0011, .0026),
		coat: "#8a7a48",
		coatShade: "#5a4a2a",
		stem: table(g, [
			[0, 0],
			[.4, .002],
			[1, .022],
			[1.6, .03],
			[9, .03]
		]),
		hook: table(g, [
			[0, 1],
			[1.1, 1],
			[1.6, 0]
		]),
		radius: 6e-4,
		stemColor: "#6a8a3a",
		leaf: {
			length: 5e-4,
			width: 3e-4,
			shape: () => 1,
			color: "#7a8a4a",
			vein: "#7a8a4a"
		},
		open: 0,
		shed: span(g, 4, 5.5),
		wither: 1,
		keepCoat: true
	});
	legumeRoots(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .3,
		grown: table(g, [
			[0, 0],
			[.4, .04],
			[1, .15],
			[3, .5],
			[5, .9],
			[6, 1]
		]),
		radius: .0012,
		nodules: 10,
		laterals: 3,
		age: span(g, 3, 6)
	});
	const ctx = {
		bag,
		blades,
		seed,
		g,
		vigour,
		dry: span(g, 7.4, 8.8),
		straw: span(g, 8.4, 9.2)
	};
	const r = chance(seed, "lentil");
	const stems = 3 + Math.floor(r() * 2);
	for (let j = 0; j < stems; j++) {
		const born = j ? 2.7 + j * .25 : 1.3;
		const max = .42 * vigour * (j ? between(r, .7, .9) : 1);
		const reach = max * table(g - (j ? .3 : 0), [
			[1.3, 0],
			[2, .05],
			[3, .2],
			[4, .5],
			[5, .8],
			[6, .95],
			[7, 1]
		]);
		if (g <= born) break;
		lentilStem(ctx, [j], s.top.clone(), tilted(level(j * 2.39996 + r()), j ? between(r, .7, 1.05) : between(r, .15, .35)), max, reach, 0);
	}
	blades.into(bag);
	return bag.build();
}
/**
* A lentil stem: fine, zigzag at its nodes, a leaf at each node, the flowers and pods from the upper axils; a side
* stem or two from its lower nodes.
* @param {{ bag: Bag, blades: Blades, seed: string, g: number, vigour: number, dry: number, straw: number }} ctx
* @param {number[]} key @param {THREE.Vector3} from @param {THREE.Vector3} dir @param {number} max @param {number} reach @param {number} order
*/
function lentilStem(ctx, key, from, dir, max, reach, order) {
	const { bag, blades, seed, g, dry, straw } = ctx;
	if (reach < .004) return;
	const r = chance(seed, "lentil-stem", ...key);
	const d = dir.clone().normalize();
	const full = [from.clone()];
	for (let k = 0; k < 10; k++) {
		d.lerp(UP, .07).add(v3((r() - .5) * .15, 0, (r() - .5) * .15)).normalize();
		full.push(full[k].clone().addScaledVector(d, max / 10));
	}
	const pts = upto(full, reach / max);
	const stalk = (u) => mix(mix("#5a8a38", "#7aa04a", u), "#cdb47c", dry + straw);
	wire(bag, blades, pts, order ? .0011 : .0016, stalk, 4, UP);
	const nodes = Math.floor(max / .036);
	const b0 = r() * Math.PI * 2;
	for (let n = 1; n < nodes; n++) {
		const f = n / nodes;
		const h = f * max;
		if (h > reach - .004) break;
		const nr = chance(seed, "lentil-node", ...key, n);
		const p = point(full, f);
		const bear = b0 + n * Math.PI + about(nr, 0, .3);
		const grown = clamp((reach - h) / .05);
		const old = clamp(dry * 1.6 - f * .6) * (1 - straw * .3) + straw * .3;
		const pairs = order ? 3 : n < 2 ? 1 : n < 4 ? 3 : 3 + Math.floor(nr() * 2);
		pinnateLeaf(bag, blades, {
			r: nr,
			at: p,
			out: level(bear),
			lift: .55,
			length: (.018 + .026 * clamp(n / 5)) * ctx.vigour,
			pairs,
			leaflet: {
				length: .013,
				width: .0038,
				shape: oval,
				segs: 2
			},
			paint: (u, v) => mix(mix(mix("#8ab860", "#4f8436", grown), "#7aa85a", Math.abs(v) < .1 ? .3 : 0), mix("#d2c070", "#c8b080", u), old),
			stalk: mix("#6a9a42", "#cdb47c", old),
			radius: 5e-4,
			grown,
			old,
			tendril: n >= 3 ? .012 : 0,
			drop: straw * .5
		});
		if (!order && (n === 2 || n === 4) && g > 3.4) lentilStem(ctx, [...key, n], p, tilted(level(bear + Math.PI * .5), .95), max * .5, max * .45 * span(g, 3.4 + n * .1, 5.4), 1);
		if (f < .4 || n < 3) continue;
		const opens = 4.5 + f * .9 + nr() * .3;
		if (g < opens - .3) continue;
		const fout = level(bear + Math.PI * .4);
		const ped = arch(p, tilted(fout, .6), .014, .1, 1);
		const end = ped[ped.length - 1];
		wire(bag, blades, ped, 4e-4, stalk, 3, UP);
		const count = 1 + (nr() < .4 ? 1 : 0);
		for (let m = 0; m < count; m++) {
			const o = opens + m * .15;
			const open = span(g, o - .3, o), fall = span(g, o + .5, o + .7);
			const set = nr() < .75 ? span(g, o + .5, o + 1.6) : 0;
			const fa = end.clone().addScaledVector(level(bear + m * 2), .003);
			if (set < .05) peaFlower(blades, fa, fout, .006, "#f4f0f4", "#c8b0e0", open, fall);
			else {
				const len = .014 * lerp(.4, 1, set);
				const pd = level(bear + m * 1.4 - .3).multiplyScalar(.6).add(v3(0, -.4, 0)).normalize();
				const seeds = 1 + (nr() < .5 ? 1 : 0);
				bag.fruit([
					...key,
					n,
					m
				], fa, pd);
				const from = blades.mark();
				blades.add({
					at: fa,
					dir: pd,
					up: level(bear + m * 1.4 - .3 + Math.PI / 2),
					length: len,
					width: .0045 * lerp(.5, 1, set),
					shape: (u) => oval(u) * (seeds > 1 ? 1 - .12 * Math.cos(u * Math.PI * 4) : 1),
					segs: 4,
					twin: .35 * set,
					paint: (u) => mix(mix("#9ac464", "#72a048", set), "#c8a868", dry * 1.2 - u * .1),
					round: true
				});
				blades.pick(bag, from);
				bag.fruitDone();
			}
		}
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "lentil",
	label: "Lentil",
	latin: "Lens culinaris · Linse",
	note: "A low, fine, bushy annual of feathery leaves ending in little tendrils; tiny white-lilac flowers, small flat pods of one or two lentils, the whole plant drying to straw.",
	from: "Annual · 100 days",
	stages: LENTIL_STAGES,
	grow: lentil,
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
const PLANTS = /* @__PURE__ */ (() => versioned(LAYERS.flatMap((l) => [...FIELDS].filter((p) => (p.layer ?? LAYER_OF[p.id] ?? "herbaceous") === l.id).map((p) => ({
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