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

//#region src/lib/models/minidomes.js
/** @typedef {{ x: number, z: number, r: number }} Collider */
/** @typedef {{ group: THREE.Group, colliders: Collider[] }} Space */
/** a small seeded random (mulberry32) */
function seeded$1(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const col$1 = (c, rough = .8) => new three.MeshStandardMaterial({
	color: c,
	roughness: rough
});
const MAT = /* @__PURE__ */ (() => ({
	strut: col$1("#8a6040", .8),
	log: col$1("#b98a5a", .75),
	darkLog: col$1("#7a5434", .85),
	cedar: new three.MeshStandardMaterial({
		color: "#9a5c3a",
		roughness: .9,
		side: three.DoubleSide
	}),
	shingle: new three.MeshStandardMaterial({
		color: "#6e4a33",
		roughness: .95,
		side: three.DoubleSide
	}),
	oak: col$1("#a8774c", .8),
	straw: col$1("#d8c38a", 1),
	hay: col$1("#cdb874", 1),
	grass: col$1("#7f9a52", 1),
	sand: col$1("#e3cf9c", 1),
	steel: new three.MeshStandardMaterial({
		color: "#9aa0a2",
		roughness: .35,
		metalness: .7
	}),
	rope: col$1("#d8c8a0", 1),
	slide: new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}),
	egg: col$1("#e9dcc6", .55),
	brownEgg: col$1("#c79a6a", .55),
	wire: new three.MeshStandardMaterial({
		color: "#c3c7bf",
		transparent: true,
		opacity: .16,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .6
	}),
	clear: new three.MeshStandardMaterial({
		color: "#e8f0ee",
		transparent: true,
		opacity: .2,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .15
	})
}))();
/**
* A geodesic dome: the triangles of an icosphere of radius R above the ground (squashed to `squash` of its height), a
* strut along every edge. Each triangle goes to the material `panel` gives it (null: left open), by its middle.
* @param {THREE.Group} g @param {number} R @param {number} detail @param {number} squash
* @param {number} strut the struts' radius @param {THREE.Material} strutMat
* @param {(c: THREE.Vector3, R: number) => THREE.Material | null} panel
*/
function dome(g, R, detail, squash, strut, strutMat, panel) {
	const ico = new three.IcosahedronGeometry(R, detail);
	const p = ico.attributes.position;
	/** @type {Map<THREE.Material, number[]>} */
	const panes = /* @__PURE__ */ new Map();
	/** @type {Map<string, [THREE.Vector3, THREE.Vector3]>} */
	const edges = /* @__PURE__ */ new Map();
	const key = (v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
	for (let i = 0; i < p.count; i += 3) {
		const tri = [
			0,
			1,
			2
		].map((k) => new three.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
		if ((tri[0].y + tri[1].y + tri[2].y) / 3 < -R * .02) continue;
		for (const v of tri) v.y = Math.max(0, v.y) * squash;
		const m = panel(tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3), R);
		if (m) {
			const list = panes.get(m) ?? [];
			list.push(...tri.flatMap((v) => [
				v.x,
				v.y,
				v.z
			]));
			panes.set(m, list);
		}
		for (let k = 0; k < 3; k++) {
			const a = tri[k], b = tri[(k + 1) % 3];
			if (a.y === 0 && b.y === 0) continue;
			const ka = key(a), kb = key(b);
			edges.set(ka < kb ? ka + kb : kb + ka, [a, b]);
		}
	}
	ico.dispose();
	for (const [m, list] of panes) {
		const geo = new three.BufferGeometry();
		geo.setAttribute("position", new three.Float32BufferAttribute(list, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array(list.length / 3 * 2), 2));
		geo.computeVertexNormals();
		const mesh = new three.Mesh(geo, m);
		mesh.receiveShadow = true;
		mesh.castShadow = !m.transparent;
		g.add(mesh);
	}
	/** @type {THREE.BufferGeometry[]} */
	const parts = [];
	/** @type {Map<string, THREE.Vector3>} */
	const hubs = /* @__PURE__ */ new Map();
	for (const [a, b] of edges.values()) {
		const len = a.distanceTo(b);
		const cyl = new three.CylinderGeometry(strut, strut, len, 6, 1, true);
		cyl.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
		cyl.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
		parts.push(cyl);
		hubs.set(key(a), a);
		hubs.set(key(b), b);
	}
	for (const h of hubs.values()) parts.push(new three.IcosahedronGeometry(strut * 1.6, 0).translate(h.x, h.y, h.z));
	const struts = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(parts.map((q) => q.toNonIndexed())), strutMat);
	for (const q of parts) q.dispose();
	struts.castShadow = true;
	g.add(struts);
}
/** A round timber from a to b. */
function log(g, a, b, r, mat = MAT.log) {
	const m = new three.Mesh(new three.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
	m.position.copy(a).add(b).multiplyScalar(.5);
	m.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	m.castShadow = true;
	g.add(m);
	return m;
}
const v = (x, y, z) => new three.Vector3(x, y, z);
/** a box resting on y */
function box(g, w, h, d, mat, x = 0, y = 0, z = 0, rot = 0) {
	const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
	m.position.set(x, y + h / 2, z);
	m.rotation.y = rot;
	m.castShadow = m.receiveShadow = true;
	g.add(m);
	return m;
}
/** a disc of something on the ground */
function floor(g, r, mat, x = 0, z = 0) {
	const m = new three.Mesh(new three.CircleGeometry(r, 40), mat);
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, .03, z);
	m.receiveShadow = true;
	g.add(m);
}
/** An egg, 5.7 cm long, lying on its side. */
const EGG = /* @__PURE__ */ (() => new three.SphereGeometry(.022, 10, 8).scale(1, 1, 1.3))();
function egg(g, x, y, z, r) {
	const e = new three.Mesh(EGG, r() < .45 ? MAT.brownEgg : MAT.egg);
	e.position.set(x, y + .021, z);
	e.rotation.set((r() - .5) * .3, r() * Math.PI * 2, 0);
	e.castShadow = true;
	g.add(e);
}
/**
* The hen dome: a timber geodesic dome 5.6 m across, 2.3 m high, the hens' house at its back (-z), their run under
* its clear panels toward +z; the nests with eggs in them.
* @param {number} [seed] @returns {Space}
*/
function henDome(seed = 3) {
	const r = seeded$1(seed);
	const g = new three.Group();
	const R = 2.8, O = .5;
	const shell = new three.Group();
	shell.position.z = O;
	dome(shell, R, 2, .82, .035, MAT.strut, (c) => c.z < -2.8 * .1 && c.y > R * .06 ? MAT.shingle : c.y < R * .42 ? MAT.wire : MAT.clear);
	g.add(shell);
	for (const sx of [-.42, .42]) box(g, .07, 1.6, .07, MAT.strut, sx, 0, 3.05);
	box(g, .9, .07, .07, MAT.strut, 0, 1.6, 3.05);
	floor(g, 2.6799999999999997, MAT.straw, 0, O);
	for (const sx of [-.55, .55]) log(g, v(sx, 0, -.7), v(sx, 1.55, -1.5499999999999998), .035, MAT.darkLog);
	for (let k = 0; k < 4; k++) {
		const u = (k + .6) / 4.4;
		log(g, v(-.6, u * 1.55, -.7 - u * .85), v(.6, u * 1.55, -.7 - u * .85), .025, MAT.log);
	}
	const nests = new three.Group();
	nests.position.set(-1.35, 0, -1.25);
	nests.rotation.y = .55;
	box(nests, 1.2, .08, .42, MAT.cedar, 0, .42, 0);
	box(nests, 1.2, .36, .04, MAT.cedar, 0, .5, -.19);
	box(nests, 1.2, .05, .46, MAT.shingle, 0, .88, -.02);
	for (const x of [
		-.6,
		-.2,
		.2,
		.6
	]) box(nests, .03, .36, .42, MAT.cedar, x, .5, 0);
	box(nests, 1.2, .07, .03, MAT.cedar, 0, .5, .2);
	for (const sx of [-.55, .55]) box(nests, .06, .42, .06, MAT.strut, sx, 0, .12);
	for (const x of [
		-.4,
		0,
		.4
	]) {
		box(nests, .34, .05, .36, MAT.hay, x, .5, 0);
		const n = 1 + Math.floor(r() * 3);
		for (let e = 0; e < n; e++) egg(nests, x + (r() - .5) * .16, .55, (r() - .5) * .14, r);
	}
	g.add(nests);
	for (let e = 0; e < 2; e++) egg(g, -1.7 + r() * .6, .03, -.09999999999999998 + r() * .6, r);
	const drum = new three.Mesh(new three.CylinderGeometry(.16, .16, .35, 16), MAT.steel);
	drum.position.set(1.05, .42, .2);
	g.add(drum);
	const pan = new three.Mesh(new three.CylinderGeometry(.26, .22, .05, 18), MAT.steel);
	pan.position.set(1.05, .22, .2);
	g.add(pan);
	log(g, v(1.05, .6, .2), v(1.05, 1.9, .2), .006, MAT.steel);
	box(g, .8, .14, .24, MAT.steel, .9, 0, 1.9, .4);
	return {
		group: g,
		colliders: [{
			x: 0,
			z: O,
			r: R
		}]
	};
}

//#endregion
//#region src/lib/sandbox-2/interior/plants.ts
/**
* The food forest under the glass: mango, avocado and citrus trees with their
* fruit hanging in them, coconut palms, bananas, an understorey of shrubs and
* beds of herbs. Geometry and materials are shared between every plant of a
* kind, so a dome can hold a hundred trees and stay light.
*/
function seeded(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}

//#endregion
//#region src/lib/sandbox-2/interior/spaces.ts
/**
* The master dome's working life: the ring under its gallery holds the
* village's workshops (co-working desks, a woodshop, an art studio, a pottery,
* a bakery and a cooking school, a library, a repair bench) and round it, just
* outside the arcade, a ring of café squares where people eat in the open.
*
* Each space is drawn in its own frame: x runs along the ring, +z points out
* toward the glass, and the space is placed on the ring by `place`. The
* workshops are Things of the library ($lib/models/domerooms.js), and the
* master dome puts copies of them down on its ring (./things.js `workshopsOf`).
*/
const col = (c, rough = .8) => new three.MeshStandardMaterial({
	color: c,
	roughness: rough
});
const awnings = /* @__PURE__ */ (() => [
	"#c9623f",
	"#6f8f6a",
	"#e3cfa6",
	"#3f6f7a"
].map((c) => new three.MeshStandardMaterial({
	color: c,
	roughness: .9,
	side: three.DoubleSide
})))();
/** A coop: a timber henhouse on legs, a ramp down, and a fenced run (the hens are in animals.ts). */
function coop(k, seed) {
	const g = new three.Group();
	seeded(seed);
	const roofMat = awnings[seed % 2 ? 0 : 1];
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(k.box(.1, .6, .1, k.timber, sx * .85, 0, -1.2 + sz * .6));
	g.add(k.box(1.9, 1, 1.4, k.oak, 0, .6, -1.2));
	for (const side of [-1, 1]) {
		const roof = k.box(2.2, .06, 1, roofMat, 0, 0, 0);
		roof.position.set(0, 1.85, -1.2 + side * .38);
		roof.rotation.x = side * .6;
		g.add(roof);
	}
	g.add(k.box(.35, .4, .04, k.dark, .4, .75, -.48));
	g.add(k.box(.5, .45, 1.1, k.oak, 1.2, .8, -1.2));
	const ramp = k.box(.35, .03, 1, k.timber, .4, 0, 0);
	ramp.position.set(.4, .38, -.05);
	ramp.rotation.x = .62;
	g.add(ramp);
	const mesh = new three.MeshStandardMaterial({
		color: "#c9ccc4",
		transparent: true,
		opacity: .22,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .6
	});
	const w = 5, d = 4;
	for (const [x, z] of [
		[-5 / 2, -2],
		[w / 2, -2],
		[-5 / 2, d / 2],
		[w / 2, d / 2],
		[0, d / 2],
		[-5 / 2, 0],
		[w / 2, 0]
	]) g.add(k.box(.08, 1.2, .08, k.timber, x, 0, z));
	for (const [x, z, len, rot] of [
		[
			0,
			d / 2,
			w,
			0
		],
		[
			-5 / 2,
			0,
			d,
			Math.PI / 2
		],
		[
			w / 2,
			0,
			d,
			Math.PI / 2
		]
	]) {
		g.add(k.box(len, .06, .06, k.timber, x, 1.2, z, rot));
		const net = new three.Mesh(new three.PlaneGeometry(len, 1.2), mesh);
		net.position.set(x, .6, z);
		net.rotation.y = rot;
		g.add(net);
	}
	const straw = new three.Mesh(new three.PlaneGeometry(4.9, 3.9), col("#d8c38a", 1));
	straw.rotation.x = -Math.PI / 2;
	straw.position.y = .035;
	g.add(straw);
	g.add(k.box(.8, .15, .25, k.steel, -1.6, 0, 1.4));
	return {
		group: g,
		colliders: [
			{
				x: 0,
				z: -1.2,
				r: 1.3
			},
			{
				x: -1.3,
				z: .8,
				r: 1.3
			},
			{
				x: 1.3,
				z: .8,
				r: 1.3
			}
		]
	};
}
/** the plain surfaces the 3D models viewer builds the timber coop and hutch with (their v1), away from any world */
function plainKit() {
	const c = (hex, rough = .8) => new three.MeshStandardMaterial({
		color: hex,
		roughness: rough
	});
	const box = (w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) => {
		const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
		m.position.set(x, y + h / 2, z);
		m.rotation.y = rotY;
		m.castShadow = m.receiveShadow = true;
		return m;
	};
	const none = () => new three.Group();
	return {
		box,
		table: none,
		sofa: none,
		lantern: none,
		oak: c("#a8774c", .82),
		lime: c("#d9d2c2", .9),
		stone: () => c("#a9a49a", .85),
		dark: c("#23262a", .5),
		steel: c("#2e3236", .4),
		counter: c("#f3f1ec", .3),
		timber: c("#9c6b3f", .6),
		linen: c("#f1ece2", .95),
		cushion: c("#c47a4a", .9),
		rug: c("#b9a589", 1),
		paper: c("#fff4e2", .9)
	};
}
/** the timber henhouse and its run, as Sandbox 3 and 4 have it (the chicken coop's v1) */
const timberCoop = () => coop(plainKit(), 3).group;

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
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({ "chicken-coop": [{
	...FIRST,
	build: timberCoop
}, {
	v: 2,
	date: "2026-10-06",
	note: "A mini geodesic dome: wire round its foot, clear over the run, a shingled back to roost in; perches, three nesting boxes with eggs in them"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "chicken-coop",
	label: "Chicken coop",
	note: "a mini geodesic dome of timber struts, 5.6 m across and 2.3 m high: wire round its foot, clear panels over the run, a cedar-shingled back where the hens roost; a ladder of perches, three nesting boxes on hay with the day’s eggs, a feeder and a water trough",
	usedIn: "Sandbox 4",
	make: () => henDome().group
}])();
const MODELS = /* @__PURE__ */ (() => versioned([...LIST], "make", HISTORY))();

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
const recipe = (id, v, variant) => recipeIn("things", MODELS, id, v, variant);
const list = () => recipesIn(MODELS);

//#endregion
exports.list = list;
exports.recipe = recipe;