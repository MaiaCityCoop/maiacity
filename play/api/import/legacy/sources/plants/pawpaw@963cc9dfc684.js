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
//#region src/lib/plants/wald-lowtrees.js
const stages = (rows) => rows.map(([name, day, note]) => ({
	name,
	day,
	note
}));
/** a colour by its hex, made once (a tube or sheet painted one colour asks for it at every vertex) */
const COLOURS = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const col = (hex) => COLOURS.get(hex) ?? COLOURS.set(hex, new three.Color(hex)).get(hex);
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
const DOWN = /* @__PURE__ */ (() => v3(0, -1, 0))();
/**
* @typedef {{
*   bag: Bag, seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, g: number, phase: number,
*   grid: Grid, vigour: number, shoot: import('./crown.js').Shoot
* }} Site — one flowering site as its plant draws it: where it is on the bark and which way it faces, `phase` how far
*   past its opening (below 0 a bud; flowers to about 0.55, then the fruit), `grid` what the fruit and berries must
*   keep clear of (the thick wood, and every fruit and berry so far), and the leaves after them
*/
/**
* @typedef {{
*   length: number, width: number, shape: (u: number) => number, colour: string, dark: string, young: string,
*   opposite?: boolean, pinnate?: { pairs: [number, number], length: number, width: number },
*   spacing: number, droop: number, from: number, start?: number, tuft?: number, max?: number,
*   on?: [number, number][], along?: number, across?: number, curl?: number
* }} Leaf — `spacing` a node every so many leaf lengths along a shoot, `from` the first generation of shoot that
*   keeps leaves (the outer ones), `start` how far along a fruit-packed shoot they begin, `tuft` leaves crowded at a shoot's tip,
*   `on` how far in leaf through the stages (0 bare, for a tree that flowers before its leaves), `pinnate` leaflets
*   in pairs along a rachis `length` long, `curl` how far the blade folds up along its midrib
*/
/**
* @typedef {{
*   seed: { size: THREE.Vector3, coat: string, shade: string, depth: number }, hypogeal: boolean,
*   cotyledon?: { length: number, width: number, colour: string },
*   roots: { tap: number, spread: number, count: number, radius: number, nodules?: boolean },
*   flush?: import('./crown.js').Flush, leader?: import('./crown.js').Leader,
*   leaf: Leaf,
*   bloom: { sites: 'tips' | 'twigs' | 'wood', opens: number, chance: number, gen: number, pairs?: boolean },
*   thorns?: number,
*   site: (s: Site) => void
* }} Grove — a low tree or a big shrub, described: its flowering sites at the tips of the outermost shoots (`tips`,
*   `chance` of them), along last year's twigs (`twigs`, `chance` a metre, in opposite `pairs` or one by one), or
*   whole shoots handed to `site` (`wood`), from shoots of generation `gen` on
*/
/**
* What the plant has put where — its thick wood as chains of balls, its fruit and berries as balls — in cells, so a
* fruit can look for a place to hang and a leaf ask whether it would run into one cheaply (a berry bush has thousands;
* ./grow.js's Space asks every ball every time).
*/
var Grid = class {
	constructor(cell = .2) {
		this.cell = cell;
		/** @type {Grid | null} the thick wood, kept apart: a fruit keeps clear of it, a leaf grows out of it */
		this.wood = null;
		/** @type {Map<number, { c: THREE.Vector3, r: number }[]>} */
		this.cells = /* @__PURE__ */ new Map();
	}
	/** @param {number} x @param {number} y @param {number} z */
	key(x, y, z) {
		return ((x + 400) * 1e3 + (y + 400)) * 1e3 + (z + 400);
	}
	/** @param {THREE.Vector3} c @param {number} r */
	add(c, r) {
		const s = this.cell;
		const k = this.key(Math.floor(c.x / s), Math.floor(c.y / s), Math.floor(c.z / s));
		let list = this.cells.get(k);
		if (!list) this.cells.set(k, list = []);
		list.push({
			c: c.clone(),
			r
		});
	}
	/** how deep a ball at c of radius r would sink into what is here (0 when it touches nothing) @param {THREE.Vector3} c @param {number} r */
	depth(c, r) {
		const s = this.cell;
		const x = Math.floor(c.x / s), y = Math.floor(c.y / s), z = Math.floor(c.z / s);
		let worst = 0;
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
			const list = this.cells.get(this.key(x + i, y + j, z + k));
			if (list) for (const b of list) worst = Math.max(worst, r + b.r - c.distanceTo(b.c));
		}
		return worst;
	}
	/** a rod along a path, as a chain of balls @param {THREE.Vector3[]} pts @param {number} r */
	rod(pts, r) {
		for (let i = 0; i + 1 < pts.length; i++) {
			const n = Math.max(1, Math.ceil(pts[i].distanceTo(pts[i + 1]) / r));
			for (let k = 0; k < n; k++) this.add(pts[i].clone().lerp(pts[i + 1], k / n), r);
		}
	}
	/**
	* Where a fruit hangs, as Space.settle has it: from `at`, along a direction near `dir`, its stalk perhaps a little
	* longer, so that its balls (`shape(at, dir)`) touch nothing, or as little as can be. Its balls are added.
	* @param {THREE.Vector3} at @param {THREE.Vector3} dir
	* @param {(at: THREE.Vector3, dir: THREE.Vector3) => { c: THREE.Vector3, r: number }[]} shape @param {number} reach
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
					let cost = swing * .004 + ext * .003;
					for (const b of shape(p, d)) cost += (this.depth(b.c, b.r) + (this.wood?.depth(b.c, b.r) ?? 0)) * 10 + Math.max(0, b.r - b.c.y) * 10;
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
		for (const b of shape(best.at, best.dir)) this.add(b.c, b.r);
		return best;
	}
};
/** a place along a path, u 0 … 1 */
function along(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return {
		at: pts[k].clone().lerp(pts[k + 1], f - k),
		dir: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/** a direction square to `dir`, turned round it by `turn` */
function across(dir, turn) {
	return new three.Vector3().crossVectors(dir, Math.abs(dir.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(dir, turn);
}
/**
* @param {Grove} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function grove(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const grid = new Grid();
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
			stemColor: "#7a7a42",
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
		const R = spec.roots;
		root(bag, {
			seed,
			key: ["tap"],
			from: at.clone(),
			dir: v3(.02, -1, .01),
			length: R.tap,
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
			radius: .002 + R.radius * span(g, 2, 8),
			down: .03,
			wander: .1,
			laterals: 8,
			lateral: .3,
			depth: 2,
			age: span(g, 1.5, 6),
			young: "#f3e6cc",
			old: "#6e5032"
		});
		for (let i = 0; i < R.count; i++) {
			const rr = chance(seed, "feeder", i);
			const born = 2.6 + i * (4 / R.count);
			const bear = i * 2.39996 + rr() * .4;
			const from = at.clone().add(v3(0, -.04 - rr() * .12, 0));
			const dir = v3(Math.cos(bear), -.15, Math.sin(bear));
			const grown = (g - born) / 2.8;
			root(bag, {
				seed,
				key: ["feeder", i],
				from,
				dir,
				length: between(rr, .6, 1) * R.spread * vigour,
				grown,
				radius: .003 + R.radius * .4 * span(g, 3, 8),
				down: .01,
				wander: .14,
				laterals: 4,
				lateral: .25,
				depth: 2,
				age: (g - born - .6) / 2.5,
				young: "#efdcb8",
				old: "#6e5032"
			});
			if (R.nodules && DETAIL.roots && grown > .15) {
				const n = 3 + Math.floor(rr() * 3);
				const p = from.clone().addScaledVector(dir.clone().normalize(), .03 + rr() * .03);
				for (let k = 0; k < n; k++) {
					const d = v3(rr() - .5, rr() - .7, rr() - .5).normalize();
					bag.add("body", bead(p.clone().addScaledVector(d, .006), v3(.003, .006, .003).multiplyScalar(clamp(grown * 2)), "#c08a4a", 3, new three.Quaternion().setFromUnitVectors(UP, d)));
				}
			}
		}
		const shoots = spec.flush ? flushCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.flush
		}) : spec.leader ? leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		}) : [];
		const gens = spec.flush ? spec.flush.gens : 2;
		grid.wood = new Grid();
		for (const sh of shoots) if (sh.gen <= 2 && sh.radius > .01) grid.wood.rod(sh.pts, sh.radius + .01);
		if (spec.thorns) for (const sh of shoots) {
			if (sh.gen < gens - 1 || sh.length < .05) continue;
			const tr = chance(seed, "thorns", ...sh.key);
			const n = Math.floor(sh.length * spec.thorns);
			for (let k = 0; k < n; k++) {
				const p = along(sh.pts, between(tr, .15, .9));
				const d = across(p.dir, tr() * Math.PI * 2).addScaledVector(p.dir, .8).normalize();
				const len = between(tr, .012, .025) * clamp((g - sh.born) / .8);
				bag.add("body", tube([p.at, p.at.clone().addScaledVector(d, len)], (u) => .0016 * (1 - u), () => col("#6a5a4a"), 3));
			}
		}
		const B = spec.bloom;
		/** @type {Set<import('./crown.js').Shoot>} */
		const bearing = /* @__PURE__ */ new Set();
		for (const sh of shoots) {
			if (sh.gen < B.gen) continue;
			const sr = chance(seed, "site", ...sh.key);
			const opens = B.opens + sr() * .2;
			const phase = g - opens;
			if (phase < -.4) continue;
			/** @param {THREE.Vector3} p @param {THREE.Vector3} d @param {(string | number)[]} key */
			const draw = (p, d, key) => spec.site({
				bag,
				seed,
				key,
				at: p,
				dir: d,
				g,
				phase,
				grid,
				vigour,
				shoot: sh
			});
			const old = !!spec.leader || sh.born < opens - .15;
			if (B.sites === "tips") {
				if (sh.end && old && sr() < B.chance) {
					bearing.add(sh);
					draw(sh.tip.clone(), sh.dir.clone(), sh.key);
				}
			} else if (B.sites === "wood") {
				if (old && sr() < B.chance) {
					bearing.add(sh);
					draw(sh.tip.clone(), sh.dir.clone(), sh.key);
				}
			} else if (old) {
				const from = spec.leader && sh.gen === 1 ? .5 : .2;
				const n = Math.floor(sh.length * (1 - from) * B.chance + sr());
				for (let k = 0; k < n; k++) {
					const p = along(sh.pts, from + (1 - from) * ((k + .3 + sr() * .4) / n) * .95);
					const turn = sr() * Math.PI * 2;
					for (let m = 0; m < (B.pairs ? 2 : 1); m++) {
						const side = across(p.dir, turn + m * Math.PI);
						if (!B.pairs && side.y > .3) side.y *= -1;
						draw(p.at.clone().addScaledVector(side, sh.radius * .9), side.addScaledVector(p.dir, .5).normalize(), [
							...sh.key,
							k,
							m
						]);
					}
				}
			}
		}
		for (const sh of shoots) foliage(bag, spec, seed, g, sh, grid, bearing.has(sh));
		return bag.build();
	};
}
/**
* The leaves of a shoot: at nodes along its outer part, one to a node in a spiral or two opposite (each pair square to
* the last), a tuft at its tip; each turned on its stalk away from any fruit it would run into.
* @param {Bag} bag @param {Grove} spec @param {string} seed @param {number} g @param {import('./crown.js').Shoot} sh
* @param {Grid} grid @param {boolean} bears whether it flowers and fruits at its tip, or along its old wood (its leaves
*   then only beyond it)
*/
function foliage(bag, spec, seed, g, sh, grid, bears) {
	const L = spec.leaf;
	const leader = !!spec.leader;
	if (!(leader || sh.end || sh.gen >= L.from || g - sh.born < 1.1)) return;
	const on = L.on ? table(g, L.on) : 1;
	if (on < .04) return;
	const lr = chance(seed, "leaves", ...sh.key);
	const age = clamp((g - sh.born) / .8);
	const youth = Math.max(1 - age, 1 - on);
	const shade = mix(L.colour, L.dark, lr());
	const colour = mix(shade, L.young, youth);
	const vein = colour.clone().lerp(new three.Color("#e0e4b0"), .3);
	const paint = (u, v) => Math.abs(v) < .1 ? vein : colour;
	const grownBy = lerp(.35, 1, age) * lerp(.5, 1, clamp(g - 2)) * lerp(.3, 1, on);
	/** one leaf (or compound leaf) at p, reaching out along `out` @param {THREE.Vector3} p @param {THREE.Vector3} out */
	const leaf = (p, out) => {
		const len = (L.pinnate ? L.pinnate.length : L.length) * between(lr, .78, 1.08) * grownBy * vigourOf(lr);
		const wid = (L.pinnate ? L.pinnate.width / L.pinnate.length : L.width / L.length) * len;
		const hang = lerp(.9, -L.droop, Math.min(age, on)) + about(lr, 0, .3);
		/** its direction, turned `turn` round the vertical */
		const aimed = (turn) => {
			const level = out.clone().setY(0);
			if (level.lengthSq() < 1e-6) level.set(1, 0, 0);
			level.normalize().applyAxisAngle(UP, turn);
			return level.multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
		};
		let dir = aimed(0);
		let ok = false;
		for (const turn of [
			0,
			.7,
			-.7,
			1.4,
			-1.4,
			2.2,
			-2.2
		]) {
			const d = aimed(turn);
			if (grid.depth(p.clone().addScaledVector(d, len * .5), wid * .5) + grid.depth(p.clone().addScaledVector(d, len * .92), wid * .35) < wid * .1) {
				dir = d;
				ok = true;
				break;
			}
		}
		if (!ok) return;
		const base = p.clone().addScaledVector(dir, .006);
		if (L.pinnate) return pinnateLeaf(bag, L, lr, base, dir, len, paint, Math.min(age, on));
		bag.add("sheet", sheet({
			length: len,
			width: wid,
			shape: L.shape,
			lift: (u, v) => (L.curl ?? .06) * v * v - .07 * u * u,
			paint,
			along: L.along ?? 5,
			across: L.across ?? 2
		}), aim(base, dir, (lr() - .5) * .6));
	};
	const start = leader && sh.gen === 1 ? .45 : leader && sh.gen === 0 ? g < 3.6 ? .1 : 1 - Math.min(.35, 1.2 / Math.max(.1, sh.length)) : bears ? L.start ?? .12 : .12;
	const step = (L.pinnate ? L.pinnate.length : L.length) * L.spacing;
	const n = Math.min(L.max ?? 18, Math.max(1, Math.floor(sh.length * (1 - start) / step)));
	for (let k = 0; k < n; k++) {
		const { at, dir } = along(sh.pts, start + (1 - start) * (k + .5) / n);
		if (L.opposite) {
			const turn = k % 2 * (Math.PI / 2) + about(lr, 0, .15);
			for (const m of [0, Math.PI]) leaf(at, across(dir, turn + m).addScaledVector(dir, .45));
		} else leaf(at, across(dir, k * 2.39996 + about(lr, 0, .3)).addScaledVector(dir, .45));
	}
	if (sh.end && L.tuft && !bears) for (let k = 0; k < L.tuft; k++) leaf(sh.tip, across(sh.dir, k * 2.39996 + lr()).multiplyScalar(.6).addScaledVector(sh.dir, 1));
}
/** a leaf's own size, give or take */
const vigourOf = (r) => about(r, 1, .06);
/**
* A compound leaf: a rachis, leaflets in pairs along it, one at its end (the elder's five or seven).
* @param {Bag} bag @param {Leaf} L @param {() => number} r @param {THREE.Vector3} at @param {THREE.Vector3} dir
* @param {number} len @param {(u: number, v: number) => THREE.Color} paint @param {number} grown
*/
function pinnateLeaf(bag, L, r, at, dir, len, paint, grown) {
	const P = L.pinnate;
	const scale = len / P.length;
	const end = at.clone().addScaledVector(dir, len).add(v3(0, -len * .12, 0));
	bag.add("body", tube([at, end], (u) => .0022 * (1 - .6 * u), () => col("#5a7a34"), 3));
	const pairs = P.pairs[0] + Math.floor(r() * (P.pairs[1] - P.pairs[0] + 1));
	const fold = lerp(.35, .06, grown);
	const blade = (p, d, s) => bag.add("sheet", sheet({
		length: L.length * s * scale,
		width: L.width * s * scale,
		shape: L.shape,
		lift: (u, v) => fold * v * v - .06 * u * u,
		paint,
		along: L.along ?? 4,
		across: L.across ?? 2
	}), aim(p, d, (r() - .5) * .4));
	const rachis = end.clone().sub(at).normalize();
	for (let k = 0; k < pairs; k++) {
		const u = lerp(.3, .82, pairs === 1 ? .5 : k / (pairs - 1));
		const p = at.clone().lerp(end, u);
		for (const side of [-1, 1]) {
			const d = across(rachis, side > 0 ? Math.PI / 2 : -Math.PI / 2);
			if (d.y > .5) d.y = .2;
			blade(p, d.normalize().multiplyScalar(.9).addScaledVector(rachis, .55).add(v3(0, -.1, 0)).normalize(), lerp(.85, 1, u));
		}
	}
	blade(end, rachis.clone().add(v3(0, -.15, 0)).normalize(), 1.05);
}
/**
* A fruit swept along its axis from `at` down `dir`: `shape(u, v)` its radius (0 … 1) along and round it, `bend` how
* far its axis bows to one side (a pawpaw's kidney).
* @param {Bag} bag
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, shape: (u: number, v: number) => number,
*   paint: (u: number, v: number) => THREE.Color, sides: number, rings: number, gloss: boolean, turn: number, bend?: number }} o
*/
function fruitBody(bag, o) {
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(DOWN, o.dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(UP, o.turn)), v3(1, 1, 1));
	const axis = [];
	for (let k = 0; k <= o.rings; k++) {
		const u = k / o.rings;
		axis.push(v3((o.bend ?? 0) * o.L * Math.sin(Math.PI * u), -.001 - u * o.L, 0));
	}
	bag.add(o.gloss ? "gloss" : "body", tube(axis, (u, v) => o.W * o.shape(u, v), o.paint, o.sides), m);
	return m;
}
/**
* A big fruit hanging from a site: a place found for it clear of the wood and the other fruit (`grid`), its stalk,
* and its body. Hands back its matrix, its length and girth, for anything more on it (an eye, a calyx). It starts
* the fruit's mark (`Bag.fruit`): the caller ends it (`fruitDone`) once it has drawn the rest of it.
* @param {Site} s @param {number} k
* @param {{ L: number, W: number, stalk: number, shape: (u: number, v: number) => number, paint: (u: number, v: number) => THREE.Color,
*   gloss: boolean, set: number, sides?: number, rings?: number, bend?: number, out?: number, stalkColour?: string }} F
*/
function hangFruit(s, k, F) {
	const kr = chance(s.seed, "fruit", ...s.key, k);
	const size = s.vigour * about(kr, 1, .1);
	const L = F.L * size * lerp(.15, 1, F.set);
	const W = F.W * size * lerp(.15, 1, F.set);
	const swing = v3(Math.cos(k * 2.4 + kr() * 3), 0, Math.sin(k * 2.4 + kr() * 3));
	const start = s.at.clone().addScaledVector(s.dir, F.stalk * .3);
	const hangFrom = start.clone().addScaledVector(swing, F.stalk * (F.out ?? .25)).add(v3(0, -F.stalk * lerp(.3, .8, F.set), 0));
	const place = s.grid.settle(hangFrom, DOWN.clone().addScaledVector(swing, .15), (a, d) => [.3, .72].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * .95
	})), F.stalk * .5 + W);
	s.bag.fruit([...s.key, k], s.at, place.dir);
	s.bag.add("body", tube([
		s.at,
		start,
		place.at
	], (u) => (.0015 + .0035 * F.set * (F.W / .03)) * (1 - .4 * u), () => col(F.stalkColour ?? "#6f6a3a"), 4));
	return {
		m: fruitBody(s.bag, {
			at: place.at,
			dir: place.dir,
			L,
			W,
			shape: F.shape,
			paint: F.paint,
			sides: F.sides ?? 12,
			rings: F.rings ?? 10,
			gloss: F.gloss,
			turn: kr() * Math.PI * 2,
			bend: F.bend
		}),
		L,
		W
	};
}
/** a colour from green through `turning` to `ripe`, as t goes 0 … 1 */
const ripening = (green, turning, ripe, t) => t < .5 ? mix(green, turning, t * 2) : mix(turning, ripe, (t - .5) * 2);
/** how far a site's fruit has set and ripened, from its phase: set from 0.55, colouring from `from` over `over` */
const fruiting = (phase, from = 2.6, over = 1.2, setFor = 1.6) => ({
	set: span(phase, .55, .55 + setFor),
	ripe: span(phase, from, from + over)
});
const obovate = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 1.45)), .6) * (u < .05 ? u / .05 : 1);
const PAWPAW_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big flat brown seed from a pawpaw, never dried, chilled through the winter, two centimetres down."
	],
	[
		"Germination",
		60,
		"Slow: the root goes deep first; the seed leaves stay in the seed below the soil."
	],
	[
		"Seedling",
		100,
		"A shoot with its first long leaves, wanting shade its first years."
	],
	[
		"Sapling",
		1100,
		"A slender young tree, its leaves big and drooping, its limbs in tiers."
	],
	[
		"Young tree",
		1800,
		"A narrow pyramid four metres high, its great drooping leaves hanging in layers, tropical-looking."
	],
	[
		"Flowering",
		2200,
		"In spring, as the leaves unfold: nodding maroon bells, three-petalled twice, on last year’s bare wood, smelling faintly of yeast."
	],
	[
		"Fruit set",
		2220,
		"Several fruit from each flower: little green clusters, like tiny bananas."
	],
	[
		"Green fruit",
		2300,
		"Clusters of two to four green fruit, kidney-shaped, swelling under the leaves."
	],
	[
		"Colouring",
		2360,
		"The green pales toward yellow; the fruit softens."
	],
	[
		"Ripe",
		2380,
		"Soft yellow-green pawpaws freckled brown, smelling of mango and banana: custard inside, big brown seeds."
	]
]))();
const pawpaw = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.022, .008, .013),
		coat: "#6a4424",
		shade: "#3e2410",
		depth: .02
	},
	hypogeal: true,
	leader: {
		height: [
			[1.8, 0],
			[3, .6],
			[4, 2.6],
			[5, 3.9],
			[6, 4.5],
			[7, 4.8],
			[9, 5.1]
		],
		radius: .17,
		tiers: 36,
		clear: .7,
		spacing: .12,
		angle: 1,
		limb: (h) => 1.8 * (1 - h) + .35,
		rate: 1.4,
		crown: 4.6,
		sides: .55,
		side: .11,
		bark: ["#8a8070", "#5e564c"],
		droop: .14
	},
	roots: {
		tap: 1.3,
		spread: 1.8,
		count: 10,
		radius: .035
	},
	leaf: {
		length: .26,
		width: .11,
		shape: obovate,
		colour: "#3e6a2c",
		dark: "#34602a",
		young: "#9ab86a",
		spacing: .24,
		droop: .85,
		from: 1,
		tuft: 3,
		max: 12,
		curl: .05,
		on: [
			[4.3, 1],
			[4.6, .15],
			[5.5, 1]
		]
	},
	bloom: {
		sites: "twigs",
		opens: 4.6,
		chance: 2.4,
		gen: 1
	},
	site: (s) => {
		const out = s.dir.clone().setY(0);
		if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
		out.normalize();
		if (s.phase < .55) {
			const open = clamp((s.phase + .4) / .6), fall = span(s.phase, .38, .55);
			const face = out.clone().multiplyScalar(.4).add(v3(0, -1, 0)).normalize();
			const at = s.at.clone().addScaledVector(face, .012);
			s.bag.add("body", tube([s.at, at], () => .0012, () => col("#5a4a30"), 3));
			if (fall >= 1) return;
			const colour = mix("#6a7a3a", "#5a1424", open);
			for (let k = 0; k < 6; k++) {
				const inner = k >= 3;
				const side = across(face, k / 3 * Math.PI * 2 + (inner ? Math.PI / 3 : 0));
				const flare = inner ? .25 : lerp(.15, .75, open);
				const d = face.clone().multiplyScalar(Math.cos(flare)).addScaledVector(side, Math.sin(flare)).normalize();
				const len = (inner ? .012 : .022) * lerp(.4, 1, open) * (1 - fall * .4);
				s.bag.add("sheet", sheet({
					length: len,
					width: len * .7,
					shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .6),
					lift: (u, v) => .12 * v * v - .15 * u * u,
					paint: (u) => colour.clone().lerp(new three.Color("#2a0a12"), u * .3),
					along: 4,
					across: 2
				}), aim(at, d, 0));
			}
			return;
		}
		const fr = chance(s.seed, "cluster", ...s.key);
		const x = fr();
		const keep = x < .78 ? 0 : x < .86 ? 1 : x < .95 ? 2 : 3 + Math.floor(fr() * 2);
		const { set, ripe } = fruiting(s.phase, 2.6, 1.2, 1.9);
		const ground = ripening("#5f8a34", "#8aa040", "#c0be5a", ripe);
		for (let k = 0; k < keep; k++) {
			hangFruit(s, k, {
				L: .1,
				W: .03,
				stalk: .025,
				set,
				gloss: false,
				out: .8,
				sides: 12,
				rings: 10,
				bend: .12,
				shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (.82 + .18 * u),
				paint: (u, v) => ground.clone().lerp(new three.Color("#6a4a2a"), ripe * .6 * Math.pow(Math.abs(Math.sin(u * 53 + v * 71)), 24))
			});
			s.bag.fruitDone();
		}
	}
}))();
/** @type {(import('./index.js').Plant & { layer: import('./index.js').Layer })[]} */
const WALD$1 = [{
	id: "pawpaw",
	label: "Pawpaw",
	latin: "Asimina triloba · Indianerbanane",
	note: "A small pyramidal tree of great drooping leaves; nodding maroon bells on last year’s wood, then clusters of green kidney-shaped fruit, custard inside.",
	from: "Tree · 6 years",
	stages: PAWPAW_STAGES,
	grow: pawpaw,
	layer: "sub-canopy"
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