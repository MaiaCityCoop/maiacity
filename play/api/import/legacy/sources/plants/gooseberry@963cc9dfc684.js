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
//#region src/lib/plants/wald-berries.js
const stages = (rows) => rows.map(([name, day, note]) => ({
	name,
	day,
	note
}));
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** @typedef {{ c: THREE.Vector3, r: number }} Ball */
/** @typedef {import('./tree.js').Limb} Limb */
/** the point at the distance s along a path, and its direction there — null past its end */
function walk(pts, s) {
	let left = Math.max(0, s);
	for (let i = 1; i < pts.length; i++) {
		const seg = pts[i].distanceTo(pts[i - 1]);
		if (left <= seg) {
			const t = seg > 1e-9 ? left / seg : 0;
			return {
				p: pts[i - 1].clone().lerp(pts[i], t),
				d: pts[i].clone().sub(pts[i - 1]).normalize()
			};
		}
		left -= seg;
	}
	return null;
}
/** a direction square to d, turned round it by a */
function round(d, a) {
	return new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, a);
}
/** level and of unit length, or `or` when it has no level part */
function level(d, or = v3(1, 0, 0)) {
	const h = d.clone().setY(0);
	return h.lengthSq() < 1e-8 ? or.clone() : h.normalize();
}
/** a colour along stops ([t, colour], t rising), at t */
function ramp(stops, t) {
	if (t <= stops[0][0]) return new three.Color(stops[0][1]);
	for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
	return new three.Color(stops[stops.length - 1][1]);
}
/**
* Which way a leaf reaches so that its blade keeps out of the fruit: its bearing turned round the upright as little
* as it needs. Only when it would touch one does it look further.
* @param {Ball[]} balls @param {THREE.Vector3} p @param {THREE.Vector3} dir @param {number} len
*/
function clear(balls, p, dir, len) {
	if (!balls.length) return dir;
	const r = len * .24;
	const q = new three.Vector3();
	const cost = (d) => {
		let c = 0;
		for (const f of [.45, .95]) {
			q.copy(p).addScaledVector(d, len * f);
			for (const b of balls) {
				if (r + b.r - Math.abs(q.x - b.c.x) <= 0) continue;
				const into = r + b.r - q.distanceTo(b.c);
				if (into > 0) c += into;
			}
		}
		return c;
	};
	let best = dir, low = cost(dir);
	if (low === 0) return dir;
	for (const t of [
		.5,
		-.5,
		1,
		-1,
		1.6,
		-1.6,
		2.3,
		-2.3,
		3.1
	]) {
		const d = dir.clone().applyAxisAngle(UP, t);
		const c = cost(d);
		if (c < low) {
			low = c;
			best = d;
		}
		if (c === 0) break;
	}
	return best;
}
/** @typedef {(u: number, v: number) => THREE.Color} LeafPaint */
/** a leaf's blade, built along +X from where its stalk meets it, its face up, set by `m` @typedef {(bag: Bag, m: THREE.Matrix4, len: number, paint: LeafPaint) => void} Blade */
/**
* A palmately lobed blade (a currant's, a gooseberry's): a fan from the stalk, its edge reaching out to each of five
* lobes' tips and back into the notches between, the two basal lobes reaching back beside the stalk. Its rays fall on
* the tips and the notches, so ten of them draw it.
* @param {number} side the side lobes' reach against the middle one's @param {number} basal the basal lobes'
* @param {number} deep how far the notches cut in
* @returns {Blade}
*/
const lobed = (side, basal, deep) => (bag, m, len, paint) => {
	const step = .95;
	const reach = [
		basal,
		side,
		1,
		side,
		basal
	];
	const edge = (a) => {
		const i = Math.max(-2, Math.min(2, Math.round(a / step)));
		return reach[i + 2] * (1 - deep * Math.min(1, Math.abs(a - i * step) / (step / 2)));
	};
	bag.add("sheet", fan({
		size: len,
		from: -2.5 * step,
		to: 2.5 * step,
		edge,
		lift: (s, a) => -.12 * s * s + .06 * s * Math.cos(a * 2.2),
		paint: (s, a) => paint(s, a / 2.4),
		rings: 1,
		rays: 10
	}), m);
};
/**
* @typedef {{
*   blade: Blade, length: number, stalk: number, stalkColour: string, spacing: number, opposite?: boolean, from: number,
*   bare: number, colour: string, young: string, vein: string, droop: number, shade?: string, tuft?: number, spur?: number,
*   autumn?: { colour: string, from: number, share: number }
* }} Leafing — the leaves of a shrub: their blade, their size, how far apart along the wood, opposite or one by one,
*   from which order of wood (0 the stems), how much of each stem's base is bare, their greens, and on the older wood
*   (the stems and their first branches) `tuft` leaves in a rosette on each spur, the spurs `spur` apart; `autumn`
*   the share of them that colour, and from when
*/
/**
* The leaves along a shrub's wood, at fixed distances from each twig's base so that a leaf once out stays where it
* is as the twig lengthens; the youngest, near the tip, smaller and standing up.
* @param {Ctx} ctx @param {Leafing} L
* @param {{ pts: THREE.Vector3[], length: number, order: number, key: (string | number)[], fade?: number }[]} twigs `fade` 0 … 1 its leaves falling
*/
function leafOut(ctx, L, twigs) {
	const { bag, seed, g, vigour } = ctx;
	const balls = bag.space.balls;
	const fall = L.autumn ? span(g, L.autumn.from, L.autumn.from + .8) * L.autumn.share : 0;
	for (const t of twigs) {
		const fade = t.fade ?? 0;
		if (t.order < L.from || fade >= 1) continue;
		const lr = chance(seed, "leafing", ...t.key);
		const bare = t.order === 0 ? Math.min(L.bare, t.length * .3) : 0;
		const old = t.order <= 1 && !!L.tuft;
		const spacing = old ? L.spur ?? L.spacing * 1.6 : L.spacing;
		const n = Math.floor(t.length / spacing);
		for (let k = 0; k < n; k++) {
			const s = (k + .4) * spacing;
			const r1 = lr(), r2 = lr(), r3 = lr();
			if (s < bare) continue;
			const w = walk(t.pts, s);
			if (!w) break;
			const young = clamp((t.length - s) / .14);
			const size = lerp(.5, 1, young) * vigour * (.85 + r2 * .3) * (1 - fade * .6);
			const len = L.length * size;
			const autumn = L.autumn && r3 < fall ? clamp((fall - r3) * 6) : 0;
			const green = mix(L.young, L.colour, young * .9 + .1).lerp(new three.Color(L.shade ?? L.colour), r2 * .5);
			if (autumn) green.lerp(new three.Color(
				/** @type {{ colour: string }} */
				L.autumn.colour
			), autumn);
			const vein = green.clone().lerp(new three.Color(L.vein), .35), dark = green.clone().multiplyScalar(.94), light = green.clone().multiplyScalar(1.06);
			/** @type {LeafPaint} */
			const paint = (u, v) => Math.abs(v) < .07 ? vein : u > .5 ? light : dark;
			const sides = L.opposite ? [0, Math.PI] : [0];
			const tuft = old ? L.tuft ?? 1 : 1;
			for (const side of sides) for (let f = 0; f < tuft; f++) {
				const a = (L.opposite ? k * Math.PI / 2 : k * 2.39996) + side + r1 * .4 + f * 1.25;
				const h = level(round(w.d, a).clone().addScaledVector(w.d, .35), level(w.d));
				const lift = lerp(.9, -L.droop, young) + (r2 - .5) * .35 - f * .15;
				const stalkDir = h.clone().multiplyScalar(Math.cos(.55)).add(v3(0, Math.sin(.55), 0));
				const end = w.p.clone().addScaledVector(stalkDir, L.stalk * size);
				let dir = h.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
				dir = clear(balls, end, dir, len);
				if (L.stalk * size > .012) bag.add("body", tube([w.p, end], () => 9e-4, () => L.stalkColour, 3));
				L.blade(bag, aim(end, dir, (r3 - .5) * .5), len * (f ? .85 : 1), paint);
			}
		}
	}
}
/**
* A berry, hanging or held, that is not round: an oval or a cylinder, swept along its axis, its stripes or its bloom
* painted on; its calyx scar at the far end.
* @param {Bag} bag @param {THREE.Vector3} at where its stalk meets it @param {THREE.Vector3} dir which way it hangs
* @param {number} L its length @param {number} W its radius @param {(u: number) => number} shape its radius along it (0 … 1)
* @param {(u: number, v: number) => THREE.Color} paint @param {string} tip its scar's colour @param {number} [sides]
*/
function oblong(bag, at, dir, L, W, shape, paint, tip, sides = 8) {
	const pts = [];
	for (let k = 0; k <= 6; k++) pts.push(at.clone().addScaledVector(dir, k / 6 * L));
	bag.add("gloss", tube(pts, (u) => W * shape(u), paint, sides));
	bag.add("body", bead(at.clone().addScaledVector(dir, L * .98), v3(1, 1, 1).multiplyScalar(Math.max(8e-4, W * .2)), tip, 2));
}
/** a round berry's profile along its axis, closed at both ends */
const ovalShape = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .62);
/**
* @typedef {{
*   L: number, W: number, stalk: number, stalkColour: string, season: Season,
*   draw: (bag: Bag, at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, ripe: number) => void,
*   bud: (bag: Bag, at: THREE.Vector3, down: THREE.Vector3, open: number, fall: number) => void
* }} Hanging — a berry that hangs alone: its length and radius grown, its stalk, its season, how it is drawn and how
*   its flower is
*/
/**
* One berry (or a few) hanging under a node, on its own stalk, where it touches nothing.
* @param {Ctx} ctx @param {THREE.Vector3} at @param {THREE.Vector3} out @param {(string | number)[]} key
* @param {Hanging} o
*/
function hanging(ctx, at, out, key, o) {
	const { bag, seed, g, vigour } = ctx;
	const fr = chance(seed, "hanging", ...key);
	const opens = o.season.opens + fr() * .35;
	const size = vigour * about(fr, 1, .1);
	const ripeAt = o.season.ripeFrom + fr() * .35;
	if (g < opens - .5) return;
	const set = span(g, opens + .45, opens + .45 + o.season.setFor);
	const L = o.L * size, W = o.W * size;
	const start = at.clone().addScaledVector(out, .004);
	const place = bag.space.settle(start.clone().add(v3(0, -o.stalk * .5, 0)).addScaledVector(out, o.stalk * .3), v3(0, -1, 0).addScaledVector(out, .3), (a, d) => [.3, .72].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * 1.05
	})), o.stalk * .6);
	if (set >= .02) bag.fruit(key, at, place.dir);
	bag.add("body", tube([
		at,
		start,
		place.at
	], () => 6e-4, () => o.stalkColour, 3));
	if (set < .02) {
		o.bud(bag, place.at, place.dir, clamp((g - opens) / .2), span(g, opens + .3, opens + .45));
		return;
	}
	o.draw(bag, place.at, place.dir, L * lerp(.25, 1, set), W * lerp(.22, 1, set), span(g, ripeAt, ripeAt + o.season.ripeFor));
	bag.fruitDone();
}
/**
* @typedef {{
*   seed: { size: THREE.Vector3, coat: string, shade: string }, cotyledon: { length: number, width: number, colour: string },
*   stems: {
*     count: number, first: number, every: number, rate: number, length: [number, number], lean: [number, number],
*     crown: number, radius: number, up: number, wander: number, spread: number, children: number,
*     shorten: [number, number], depth: number, from0: number, young: string, old: string, size: [number, number][]
*   },
*   roots: { length: number, count: number },
*   leaf: Leafing,
*   wood?: (ctx: Ctx, t: Limb) => void,
*   fruit: (ctx: Ctx) => void
* }} Shrub — a bush, described: its seed and seed leaves; its stems (how many, from when and how often a new one
*   comes up from the crown, how fast they grow, how long and how far they lean, how wide the crown they rise from,
*   how they branch, their bark young and old, and `size` the whole bush's size through the stages); its roots; its
*   leaves; what its wood bears (spines, prickles) and its flowers and fruit
*/
/**
* @param {Shrub} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function shrub(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .08);
		const at = v3(0, -.004, 0);
		const s = sprout(bag, {
			seed,
			at,
			size: spec.seed.size,
			coat: spec.seed.coat,
			coatShade: spec.seed.shade,
			stem: table(g, [
				[0, 0],
				[.35, 6e-4],
				[1, .006],
				[2, .014],
				[9, .014]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.6, 0]
			]),
			radius: 6e-4 + .0025 * span(g, 1.5, 4),
			stemColor: "#8a8a4a",
			leaf: {
				length: spec.cotyledon.length,
				width: spec.cotyledon.width,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .65),
				color: spec.cotyledon.colour,
				vein: "#a6c47e"
			},
			open: span(g, 1.15, 2),
			shed: span(g, 1, 1.6),
			wither: span(g, 2.9, 3.6)
		});
		shrubRoots(bag, seed, g, at, spec.roots, vigour);
		const S = spec.stems;
		const size = table(g, S.size);
		/** @type {Limb[]} */
		const twigs = [];
		for (let c = 0; c < S.count; c++) {
			const cr = chance(seed, "stem", c);
			const born = c === 0 ? S.first : S.first + .5 + (c - 1) * S.every + cr() * .25;
			const bear = c * 2.39996 + cr() * .6;
			const off = S.crown * Math.sqrt(c / S.count) * between(cr, .6, 1);
			const lean = c === 0 ? between(cr, .03, .12) : between(cr, S.lean[0], S.lean[1]);
			const length = between(cr, S.length[0], S.length[1]);
			if (g <= born) continue;
			const from = c === 0 ? s.top.clone() : v3(Math.cos(bear) * off, 0, Math.sin(bear) * off);
			limb(bag, {
				seed,
				key: ["stem", c],
				from,
				dir: v3(Math.cos(bear) * Math.sin(lean), Math.cos(lean), Math.sin(bear) * Math.sin(lean)),
				length: length * vigour * size,
				grown: Math.min(2.6, (g - born) * S.rate),
				radius: S.radius * lerp(.3, 1, size),
				up: S.up,
				wander: S.wander,
				spread: S.spread,
				children: S.children,
				shorten: S.shorten,
				depth: S.depth,
				from0: S.from0,
				young: S.young,
				old: S.old,
				age: clamp((g - born) / 3),
				out: twigs,
				sides: 5
			});
		}
		const ctx = {
			bag,
			seed,
			g,
			vigour,
			twigs
		};
		for (const t of twigs) if (t.order <= 1) bag.space.rod(t.pts, t.order ? .007 : .013);
		if (spec.wood) for (const t of twigs) spec.wood(ctx, t);
		spec.fruit(ctx);
		leafOut(ctx, spec.leaf, twigs);
		return bag.build();
	};
}
/**
* A shrub's roots: a short taproot, and fibrous roots spreading near the surface.
* @param {Bag} bag @param {string} seed @param {number} g @param {THREE.Vector3} at @param {{ length: number, count: number }} o @param {number} vigour
*/
function shrubRoots(bag, seed, g, at, o, vigour) {
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(.03, -1, 0),
		length: o.length * .7,
		grown: table(g, [
			[0, 0],
			[.35, .005],
			[1, .04],
			[2, .1],
			[3, .35],
			[4, .7],
			[5, 1]
		]),
		radius: .0015 + .006 * span(g, 2.5, 6),
		down: .04,
		wander: .18,
		laterals: 5,
		lateral: .3,
		depth: 1,
		age: span(g, 2, 5),
		young: "#f1e4cc",
		old: "#7a5a3e"
	});
	for (let i = 0; i < o.count; i++) {
		const rr = chance(seed, "shrub-root", i);
		const a = i * 2.39996 + rr() * .4;
		const born = 2.4 + i * .22;
		root(bag, {
			seed,
			key: ["spread", i],
			from: at.clone().add(v3(0, -.015 - rr() * .03, 0)),
			dir: v3(Math.cos(a), -between(rr, .12, .4), Math.sin(a)),
			length: between(rr, .6, 1) * o.length * vigour,
			grown: (g - born) / 2.4,
			radius: .0016 + .004 * span(g, 3, 7),
			down: .012,
			wander: .22,
			laterals: 3,
			lateral: .3,
			depth: 1,
			age: (g - born - .5) / 2.5,
			young: "#f1e4cc",
			old: "#7a5a3e"
		});
	}
}
/** a thin sharp spine or prickle out of the bark: a cone along `dir`, bent at its tip by `hook` */
function prickle(bag, at, dir, len, base, colour, hook = 0) {
	const mid = at.clone().addScaledVector(dir, len * .55);
	const tip = mid.clone().addScaledVector(dir, len * .45).add(v3(0, -hook * len, 0));
	bag.add("body", tube([
		at,
		mid,
		tip
	], (u) => base * (1 - .95 * u), () => colour, 3));
}
/** @type {Leafing} */
const CURRANT_LEAF = /* @__PURE__ */ (() => ({
	blade: lobed(.88, .6, .32),
	length: .06,
	stalk: .04,
	stalkColour: "#8a9a52",
	spacing: .045,
	tuft: 3,
	spur: .07,
	from: 0,
	bare: .2,
	colour: "#4c8a36",
	young: "#8abc58",
	vein: "#a8c47e",
	shade: "#3e7430",
	droop: .15
}))();
const GOOSEBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small seed from a berry, sown in autumn for the winter to chill."
	],
	[
		"Germination",
		30,
		"A root down, a hooked shoot up."
	],
	[
		"Seed leaves",
		45,
		"Two small oval seed leaves; the first spines already at the first nodes."
	],
	[
		"Young bush",
		365,
		"A few spiny shoots, small lobed leaves in tufts."
	],
	[
		"Bush",
		1100,
		"A low bush of arching spiny branches a metre high, sharp spines at every node."
	],
	[
		"Flowering",
		1200,
		"Small green, purple-flushed bells hang in ones and twos under the branches."
	],
	[
		"Fruit set",
		1215,
		"Each bell leaves a little hairy berry behind it, its withered flower at its tip."
	],
	[
		"Green berries",
		1250,
		"Big green veined berries hanging under the branches, hard and sour."
	],
	[
		"Turning",
		1280,
		"The berries soften and blush, the veins showing pale."
	],
	[
		"Ripe",
		1295,
		"Plump dark red gooseberries, hairy and veined, sweet now."
	]
]))();
/** a gooseberry: an oval, faintly hairy, its pale veins running from end to end */
const gooseberryPaint = (ripe) => (u, v) => {
	const c = ramp([
		[0, "#9cc068"],
		[.45, "#b8b060"],
		[.75, "#a84a48"],
		[1, "#7a1e30"]
	], ripe);
	const vein = Math.pow(Math.abs(Math.cos(v * Math.PI * 7)), 22);
	return c.lerp(new three.Color(ripe > .6 ? "#d89a8a" : "#d8e8b0"), vein * .45);
};
const gooseberry = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0016, .001, .0011),
		coat: "#b8a07a",
		shade: "#8a7450"
	},
	cotyledon: {
		length: .005,
		width: .003,
		colour: "#6aa046"
	},
	stems: {
		count: 9,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.52, .68],
		lean: [.35, .75],
		crown: .12,
		radius: .011,
		up: -.035,
		wander: .1,
		spread: .85,
		children: 4,
		shorten: [.45, .68],
		depth: 2,
		from0: .22,
		young: "#a8946a",
		old: "#6a5a48",
		size: [
			[2, .2],
			[3, .4],
			[4, .8],
			[5, 1]
		]
	},
	roots: {
		length: .4,
		count: 7
	},
	leaf: {
		...CURRANT_LEAF,
		blade: lobed(.85, .55, .36),
		length: .045,
		stalk: .02,
		spacing: .03,
		tuft: 4,
		spur: .04,
		colour: "#4a8a3a",
		shade: "#3a7432",
		young: "#8ac05a",
		bare: .2
	},
	wood: (ctx, t) => {
		const pr = chance(ctx.seed, "spines", ...t.key);
		const n = Math.floor(t.length / .045);
		for (let k = 0; k < n; k++) {
			const w = walk(t.pts, (k + .4) * .045);
			const a = pr(), many = pr();
			if (!w) break;
			const thick = t.order === 0 ? .006 : t.order === 1 ? .004 : .0025;
			if (t.order === 2 && k % 2) continue;
			for (let m = 0; m < 1 + Math.floor(many * 2.2); m++) {
				const out = round(w.d, a * 6.28 + (m - 1) * .9).addScaledVector(w.d, -.35).normalize();
				prickle(ctx.bag, w.p.clone().addScaledVector(out, thick * .6), out, .008 + many * .004, 9e-4, "#c8b890");
			}
		}
	},
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			if (t.order < 1) continue;
			const fr = chance(ctx.seed, "goose-node", ...t.key);
			const n = Math.floor(t.length / .045);
			for (let k = 1; k < n; k++) {
				const pick = fr(), two = fr(), a = fr();
				if (pick > .16) continue;
				const w = walk(t.pts, (k + .4) * .045);
				if (!w) break;
				for (let m = 0; m < (two < .35 ? 2 : 1); m++) hanging(ctx, w.p, level(round(w.d, a * 6.28 + m * 2.2), level(w.d)), [
					...t.key,
					k,
					m
				], GOOSE);
			}
		}
	}
}))();
/**
* A small hanging bell (a gooseberry's, a haskap's): a cone from where its stalk meets it, widening to its mouth,
* opening, then shrivelling as it falls.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} down @param {number} len @param {number} mouth
* @param {string} colour @param {string} lip @param {number} open @param {number} fall
*/
function bell(bag, at, down, len, mouth, colour, lip, open, fall) {
	const l = len * lerp(.5, 1, open) * (1 - fall * .4);
	const pts = [
		0,
		.4,
		.8,
		1
	].map((t) => at.clone().addScaledVector(down, l * t));
	bag.add("body", tube(pts, (u) => mouth * lerp(.3, 1, Math.pow(u, .8)) * lerp(.5, 1, open) * (1 - fall * .5), (u) => mix(colour, lip, u * u), 6));
}
/** @type {Hanging} */
const GOOSE = {
	L: .024,
	W: .0098,
	stalk: .014,
	stalkColour: "#8a8a52",
	season: {
		opens: 4.6,
		setFor: 2.2,
		ripeFrom: 7.6,
		ripeFor: 1.1
	},
	bud: (bag, at, down, open, fall) => bell(bag, at, down, .009, .003, "#a8b066", "#8a4a5e", open, fall),
	draw: (bag, at, dir, L, W, ripe) => {
		oblong(bag, at, dir, L, W, ovalShape, gooseberryPaint(ripe), "#5a3a2a", 10);
		const side = round(dir, 0);
		for (let k = 0; k < 6; k++) {
			const out = side.clone().applyAxisAngle(dir, k * 1.05);
			const p = at.clone().addScaledVector(dir, L * (.3 + k % 3 * .2)).addScaledVector(out, W * .95);
			bag.add("body", tube([p, p.clone().addScaledVector(out, W * .25)], () => 12e-5, () => "#c8b898", 3));
		}
	}
};
/** @type {(import('./index.js').Plant & { layer: import('./index.js').Layer })[]} */
const WALD$1 = [{
	id: "gooseberry",
	label: "Gooseberry",
	latin: "Ribes uva-crispa · Stachelbeere",
	note: "Arching branches a metre high with sharp spines at every node, small lobed leaves in tufts; single hairy, veined berries hanging under the branches, green turning dark red.",
	from: "Shrub · 3 years",
	stages: GOOSEBERRY_STAGES,
	grow: gooseberry,
	layer: "shrub"
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