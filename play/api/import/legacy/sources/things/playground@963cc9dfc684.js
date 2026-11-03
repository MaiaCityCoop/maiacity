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
const col = (c, rough = .8) => new three.MeshStandardMaterial({
	color: c,
	roughness: rough
});
const MAT = /* @__PURE__ */ (() => ({
	strut: col("#8a6040", .8),
	log: col("#b98a5a", .75),
	darkLog: col("#7a5434", .85),
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
	oak: col("#a8774c", .8),
	straw: col("#d8c38a", 1),
	hay: col("#cdb874", 1),
	grass: col("#7f9a52", 1),
	sand: col("#e3cf9c", 1),
	steel: new three.MeshStandardMaterial({
		color: "#9aa0a2",
		roughness: .35,
		metalness: .7
	}),
	rope: col("#d8c8a0", 1),
	slide: new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}),
	egg: col("#e9dcc6", .55),
	brownEgg: col("#c79a6a", .55),
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
function log$1(g, a, b, r, mat = MAT.log) {
	const m = new three.Mesh(new three.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
	m.position.copy(a).add(b).multiplyScalar(.5);
	m.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	m.castShadow = true;
	g.add(m);
	return m;
}
const v$1 = (x, y, z) => new three.Vector3(x, y, z);
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
/**
* The play dome: a sandpit ringed with stumps round a climbing dome of round logs, a platform in it and a slide out
* of its side; a swing on an arch of logs; balance logs and stepping stumps. About 16 m across.
* @param {number} [seed] @returns {Space}
*/
function playDome(seed = 90) {
	const r = seeded$1(seed);
	const g = new three.Group();
	/** @type {Collider[]} */
	const cs = [];
	floor(g, 4.2, MAT.sand);
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const stump = new three.Mesh(new three.CylinderGeometry(.2, .22, .35 + r() * .25, 10), MAT.darkLog);
		stump.position.set(Math.sin(a) * 4.3, .2, Math.cos(a) * 4.3);
		stump.castShadow = true;
		g.add(stump);
	}
	const T = {
		x: -1.1,
		z: -.7,
		R: 2.2
	};
	const climber = new three.Group();
	climber.position.set(T.x, 0, T.z);
	dome(climber, T.R, 2, .95, .045, MAT.log, (c, R) => c.y > R * .82 ? MAT.rope : null);
	const deck = new three.Mesh(new three.CylinderGeometry(1.25, 1.25, .08, 20), MAT.oak);
	deck.position.y = 1.2;
	deck.castShadow = true;
	climber.add(deck);
	for (const [sx, sz] of [
		[-.7, -.7],
		[.7, -.7],
		[-.7, .7],
		[.7, .7]
	]) log$1(climber, v$1(sx, 0, sz), v$1(sx, 1.2, sz), .06, MAT.darkLog);
	g.add(climber);
	const slidePath = new three.CatmullRomCurve3([
		v$1(T.x + 1, 1.2, T.z + .2),
		v$1(T.x + 2.4, .75, T.z + .1),
		v$1(T.x + 3.6, .22, T.z + .35)
	]);
	const chute = new three.Mesh(new three.TubeGeometry(slidePath, 20, .4, 10, false), MAT.slide);
	chute.scale.y = .6;
	chute.position.y = .2;
	g.add(chute);
	cs.push({
		x: T.x,
		z: T.z,
		r: T.R
	});
	const S = {
		x: 2,
		z: 2.3,
		w: 1.5,
		h: 2.4
	};
	const arch = new three.CatmullRomCurve3([
		v$1(S.x - S.w, 0, S.z),
		v$1(S.x - S.w * .85, S.h * .8, S.z),
		v$1(S.x, S.h, S.z),
		v$1(S.x + S.w * .85, S.h * .8, S.z),
		v$1(S.x + S.w, 0, S.z)
	]);
	const beam = new three.Mesh(new three.TubeGeometry(arch, 30, .09, 8, false), MAT.log);
	beam.castShadow = true;
	g.add(beam);
	for (const sx of [-1, 1]) log$1(g, v$1(S.x + sx * S.w, 0, S.z - .7), v$1(S.x + sx * S.w * .9, 1.4, S.z), .06, MAT.darkLog);
	for (const sx of [-.45, .45]) {
		const top = arch.getPoint(.5 + sx / (S.w * 4.4));
		for (const dz of [-.18, .18]) log$1(g, v$1(S.x + sx, top.y - .05, S.z + dz * .2), v$1(S.x + sx, .55, S.z + dz), .012, MAT.rope);
		box(g, .22, .05, .5, MAT.oak, S.x + sx, .5, S.z, Math.PI / 2);
	}
	cs.push({
		x: S.x - S.w,
		z: S.z,
		r: .5
	}, {
		x: S.x + S.w,
		z: S.z,
		r: .5
	});
	for (let i = 0; i < 3; i++) {
		const a = 3.6 + i * .5;
		log$1(g, v$1(Math.sin(a) * 5.2, .25, Math.cos(a) * 5.2), v$1(Math.sin(a + .35) * 6.8, .25, Math.cos(a + .35) * 6.8), .15, MAT.darkLog);
	}
	for (let i = 0; i < 7; i++) {
		const a = .9 + i * .28, h = .2 + i * .08;
		const st = new three.Mesh(new three.CylinderGeometry(.28, .3, h, 12), MAT.log);
		st.position.set(Math.sin(a) * 6.2, h / 2, Math.cos(a) * 6.2);
		st.castShadow = true;
		g.add(st);
	}
	g.traverse((o) => {
		const m = o;
		if (m.isMesh) m.receiveShadow = true;
	});
	return {
		group: g,
		colliders: cs
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
const wood = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#b98a5a",
	roughness: .75
}))();
const darkWood = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#8a6040",
	roughness: .8
}))();
const rope = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#d8c8a0",
	roughness: 1
}))();
const sand = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#e3cf9c",
	roughness: 1
}))();
/** A log: a round timber from a to b. */
function log(g, a, b, r, mat = wood) {
	const m = new three.Mesh(new three.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
	m.position.copy(a).add(b).multiplyScalar(.5);
	m.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	m.castShadow = true;
	g.add(m);
}
const v = (x, y, z) => new three.Vector3(x, y, z);
/**
* A wooden playground: a sandpit ring of logs, a climbing tower with a tent roof
* and a slide, a two-seat swing, balance logs and stepping stumps. About 16 m across.
*/
function playground(seed) {
	const r = seeded(seed);
	const g = new three.Group();
	const cs = [];
	const pit = new three.Mesh(new three.CircleGeometry(4.2, 40), sand);
	pit.rotation.x = -Math.PI / 2;
	pit.position.y = .03;
	g.add(pit);
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const stump = new three.Mesh(new three.CylinderGeometry(.2, .22, .35 + r() * .25, 10), darkWood);
		stump.position.set(Math.sin(a) * 4.3, .2, Math.cos(a) * 4.3);
		g.add(stump);
	}
	const T = {
		x: -1.2,
		z: -.8,
		h: 1.6
	};
	for (const [sx, sz] of [
		[-1, -1],
		[1, -1],
		[-1, 1],
		[1, 1]
	]) log(g, v(T.x + sx * .8, 0, T.z + sz * .8), v(T.x + sx * .8, T.h + 1.6, T.z + sz * .8), .09);
	g.add(new three.Mesh(new three.CylinderGeometry(1.15, 1.15, .1, 24), wood).translateX(T.x).translateY(T.h).translateZ(T.z));
	const roof = new three.Mesh(new three.ConeGeometry(1.35, 1, 4), new three.MeshStandardMaterial({
		color: "#c9623f",
		roughness: .9
	}));
	roof.position.set(T.x, T.h + 2.1, T.z);
	roof.rotation.y = Math.PI / 4;
	g.add(roof);
	for (let i = 0; i < 5; i++) log(g, v(T.x - .8, .3 + i * .3, T.z + 1.1), v(T.x + .8, .3 + i * .3, T.z + 1.1), .03);
	for (const sx of [-.8, .8]) log(g, v(T.x + sx, 0, T.z + 1.1), v(T.x + sx, T.h, T.z + .8), .05);
	const slidePath = new three.CatmullRomCurve3([
		v(T.x + .9, T.h, T.z),
		v(T.x + 2.2, T.h * .6, T.z - .3),
		v(T.x + 3.4, .25, T.z - .2)
	]);
	const chute = new three.Mesh(new three.TubeGeometry(slidePath, 20, .4, 10, false), new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}));
	chute.scale.y = .6;
	chute.position.y = .25;
	g.add(chute);
	cs.push({
		x: T.x,
		z: T.z,
		r: 1.3
	});
	const S = {
		x: 1.8,
		z: 2.2
	};
	for (const sx of [-1.4, 1.4]) {
		log(g, v(S.x + sx, 0, S.z - .8), v(S.x + sx, 2.4, S.z), .08);
		log(g, v(S.x + sx, 0, S.z + .8), v(S.x + sx, 2.4, S.z), .08);
	}
	log(g, v(S.x - 1.5, 2.4, S.z), v(S.x + 1.5, 2.4, S.z), .09);
	for (const sx of [-.6, .6]) {
		for (const dz of [-.18, .18]) log(g, v(S.x + sx + dz, 2.4, S.z), v(S.x + sx + dz, .55, S.z), .012, rope);
		g.add(new three.Mesh(new three.BoxGeometry(.5, .05, .22), wood).translateX(S.x + sx).translateY(.53).translateZ(S.z));
	}
	cs.push({
		x: S.x - 1.4,
		z: S.z,
		r: .6
	}, {
		x: S.x + 1.4,
		z: S.z,
		r: .6
	});
	for (let i = 0; i < 3; i++) {
		const a = 3.6 + i * .5;
		log(g, v(Math.sin(a) * 5.2, .25, Math.cos(a) * 5.2), v(Math.sin(a + .35) * 6.8, .25, Math.cos(a + .35) * 6.8), .15, darkWood);
	}
	for (let i = 0; i < 7; i++) {
		const a = .9 + i * .28;
		const st = new three.Mesh(new three.CylinderGeometry(.28, .3, .2 + i * .08, 12), wood);
		st.position.set(Math.sin(a) * 6.2, (.2 + i * .08) / 2, Math.cos(a) * 6.2);
		g.add(st);
	}
	g.traverse((o) => o.isMesh && (o.castShadow = true, o.receiveShadow = true));
	return {
		group: g,
		colliders: cs
	};
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
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({ playground: [{
	...FIRST,
	build: () => playground(90).group
}, {
	v: 2,
	date: "2026-10-06",
	note: "A climbing dome of round logs with a platform and a slide at its middle; the swing on an arch of logs"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "playground",
	label: "Playground",
	note: "about 16 m across, all wood: a sandpit ringed with stumps round a climbing dome of round logs (4.4 m across, a platform at 1.2 m, a rope net under its crown, a slide out of its side), a swing on an arch of logs, balance logs and stepping stumps",
	usedIn: "Sandbox 4",
	make: () => playDome().group
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