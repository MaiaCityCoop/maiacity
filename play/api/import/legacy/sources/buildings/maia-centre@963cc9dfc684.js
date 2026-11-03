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
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");

//#region src/lib/models/parts.ts
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const std = (color, roughness = .8, more = {}) => shared(() => new three.MeshStandardMaterial({
	color,
	roughness,
	...more
}));
/** A part: a box at its place, casting shadows (and catching them, unless `catches` is false). */
function part(g, w, h, d, m, x, y, z, catches = true) {
	const p = new three.Mesh(new three.BoxGeometry(w, h, d), m);
	p.position.set(x, y, z);
	p.castShadow = true;
	p.receiveShadow = catches;
	g.add(p);
	return p;
}
/** A soft part: a box with rounded edges (a mattress, a pillow, a seat). */
function soft(g, w, h, d, radius, m, x, y, z) {
	const p = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2)), m);
	p.position.set(x, y, z);
	p.castShadow = p.receiveShadow = true;
	g.add(p);
	return p;
}
/** A round bar from a to b (a leg, a tube, a spindle). */
function bar(g, a, b, r0, m, r1 = r0) {
	const len = a.distanceTo(b);
	const p = new three.Mesh(new three.CylinderGeometry(r1, r0, len, 12), m);
	p.position.copy(a).add(b).multiplyScalar(.5);
	p.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	p.castShadow = true;
	g.add(p);
	return p;
}
const v3 = (x, y, z) => new three.Vector3(x, y, z);

//#endregion
//#region src/lib/models/wayside.js
const m = /* @__PURE__ */ (() => ({
	vanPaint: std("#5f8aa6", .75, { metalness: .15 }),
	vanCream: std("#e2d8bf", .8),
	rust: std("#8a4a26", .95),
	glass: shared(() => new three.MeshStandardMaterial({
		color: "#27323a",
		roughness: .15,
		metalness: .4
	})),
	tyre: std("#1f1f1f", .9),
	rim: std("#8d8f90", .5, { metalness: .6 }),
	trim: std("#2a2c2e", .7),
	light: std("#efe6c6", .4),
	tail: std("#8f2a20", .6),
	rack: std("#3b3b3b", .6, { metalness: .5 }),
	bagRed: std("#9c3b2f", .95),
	bagGreen: std("#4f6b3a", .95),
	bagBlue: std("#2f4f7a", .95),
	sack: std("#d8ccaa", 1),
	concrete: std("#b9b2a2", .95),
	crackedConcrete: std("#a39b8a", 1),
	corrugated: std("#8e6a4a", .85, { metalness: .3 }),
	steel: std("#6d6f70", .6, { metalness: .5 }),
	plank: std("#8a7a62", .95),
	greyPlank: std("#7d776b", 1),
	sign: std("#c8b88a", .8),
	signRed: std("#a8473a", .8),
	canopy: std("#d8d2c2", .8),
	canopyStripe: std("#b8574a", .8),
	pump: std("#c9a24a", .8),
	pumpFace: std("#3a3a36", .7),
	kiosk: std("#d9cfb8", .95),
	dark: std("#1d1d1b", 1),
	drum: std("#4a6a7a", .8, { metalness: .3 }),
	tumble: std("#a08b5c", 1),
	sand: std("#d6c39a", 1)
}))();
function wheel(g, x, z, r = .36) {
	const w = new three.Group();
	const tyre = new three.Mesh(new three.CylinderGeometry(r, r, .22, 18), m.tyre());
	const rim = new three.Mesh(new three.CylinderGeometry(r * .55, r * .55, .23, 10), m.rim());
	tyre.castShadow = true;
	w.add(tyre, rim);
	w.rotation.z = Math.PI / 2;
	w.position.set(x, r, z);
	g.add(w);
}
/** The old rusty travel van: a minibus 5.0 × 1.9 m, 2.3 m high, faded blue over cream, rust through its sills and
*  arches, a sliding side door, a roof rack piled with bags, a sack of rice and a spare tyre. */
function travelVan() {
	const g = new three.Group();
	g.name = "travel-van";
	for (const x of [-.82, .82]) for (const z of [-1.55, 1.6]) wheel(g, x, z);
	soft(g, 1.9, .9, 4.9, .1, m.vanCream(), 0, .85, 0);
	soft(g, 1.88, .85, 4.6, .12, m.vanPaint(), 0, 1.7, -.12);
	soft(g, 1.84, .5, .5, .15, m.vanPaint(), 0, 1.25, 2.3);
	part(g, 1.86, .08, 4.5, m.vanPaint(), 0, 2.15, -.12);
	for (const x of [-.95, .95]) for (const z of [
		-1.6,
		-.6,
		.4
	]) part(g, .02, .48, .8, m.glass(), x, 1.78, z);
	const screen = part(g, 1.7, .6, .04, m.glass(), 0, 1.72, 2.12);
	screen.rotation.x = -.25;
	part(g, 1.86, .5, .02, m.glass(), 0, 1.78, -2.43);
	part(g, .02, .9, 1.1, m.trim(), .96, 1.25, .9);
	for (const x of [-.96, .96]) {
		part(g, .02, .12, 4.6, m.rust(), x, .45, 0);
		for (const z of [-1.55, 1.6]) part(g, .03, .22, .85, m.rust(), x, .78, z);
		part(g, .02, .25, .5, m.rust(), x, 1.25, -.9);
	}
	part(g, 1.92, .16, .2, m.trim(), 0, .5, 2.5);
	part(g, 1.92, .16, .2, m.trim(), 0, .5, -2.5);
	for (const x of [-.7, .7]) {
		part(g, .26, .18, .04, m.light(), x, 1, 2.52);
		part(g, .14, .3, .04, m.tail(), x * 1.15, 1.1, -2.47);
		part(g, .05, .16, .18, m.trim(), x * 1.42, 1.65, 1.95);
	}
	for (const x of [-.85, .85]) bar(g, v3(x, 2.32, -2.1), v3(x, 2.32, 1.9), .025, m.rack());
	for (const z of [
		-2.1,
		-.7,
		.6,
		1.9
	]) bar(g, v3(-.85, 2.32, z), v3(.85, 2.32, z), .02, m.rack());
	part(g, .7, .4, .9, m.bagRed(), -.4, 2.55, -1.3);
	part(g, .6, .35, .8, m.bagBlue(), .4, 2.52, -1.2);
	part(g, .8, .45, .7, m.bagGreen(), .25, 2.57, .1);
	soft(g, .6, .35, .9, .15, m.sack(), -.4, 2.52, .2);
	const spare = new three.Mesh(new three.TorusGeometry(.3, .11, 8, 16), m.tyre());
	spare.rotation.x = Math.PI / 2;
	spare.position.set(0, 2.45, 1.4);
	g.add(spare);
	return g;
}
/** A bus stop on the dusty highway: a concrete slab, a rusty corrugated roof on two steel posts, a plank bench, a
*  round sign on a pole and a faded timetable. 4 × 2 m, 2.6 m high. */
function busStop() {
	const g = new three.Group();
	g.name = "bus-stop";
	part(g, 4.4, .15, 2.2, m.concrete(), 0, .075, 0);
	for (const x of [-1.8, 1.8]) bar(g, v3(x, .15, -.8), v3(x, 2.5, -.8), .05, m.steel());
	for (const x of [-1.8, 1.8]) bar(g, v3(x, .15, -.8), v3(x, 2.3, .6), .03, m.steel());
	const roof = part(g, 4.4, .05, 2, m.corrugated(), 0, 2.5, -.1);
	roof.rotation.x = .12;
	for (let x = -2; x <= 2; x += .4) part(g, .04, .03, 2, m.rust(), x, 2.53, -.1);
	part(g, 3.2, .06, .4, m.plank(), 0, .5, -.5);
	for (const x of [-1.4, 1.4]) part(g, .08, .4, .35, m.steel(), x, .3, -.5);
	part(g, 3.2, .3, .04, m.plank(), 0, .85, -.72);
	part(g, .8, 1, .03, m.sign(), 1.1, 1.5, -.83);
	bar(g, v3(2.6, 0, .9), v3(2.6, 2.6, .9), .04, m.steel());
	const disc = new three.Mesh(new three.CylinderGeometry(.32, .32, .03, 20), m.signRed());
	disc.rotation.x = Math.PI / 2;
	disc.position.set(2.6, 2.6, .9);
	disc.castShadow = true;
	g.add(disc);
	const inner = new three.Mesh(new three.CylinderGeometry(.22, .22, .035, 20), m.sign());
	inner.rotation.x = Math.PI / 2;
	inner.position.set(2.6, 2.6, .9);
	g.add(inner);
	return g;
}
/** An abandoned gas station, 24 × 16 m: cracked concrete, a faded canopy on four pillars with a panel missing, two
*  old pumps, a kiosk with broken windows and a dark door, a leaning sign pole with nothing left on it, oil drums,
*  a tumbleweed. */
function gasStation() {
	const g = new three.Group();
	g.name = "gas-station";
	part(g, 24, .12, 16, m.crackedConcrete(), 0, .06, 0, false);
	for (const [x, z, w, d] of [
		[
			-6,
			3,
			7,
			.1
		],
		[
			2,
			-2,
			.1,
			6
		],
		[
			7,
			5,
			5,
			.1
		]
	]) part(g, w, .02, d, m.dark(), x, .13, z, false);
	for (const x of [-4.5, 4.5]) for (const z of [1.5, 6.5]) part(g, .4, 4.6, .4, m.canopy(), x, 2.3, z);
	part(g, 11, .5, 7, m.canopy(), 0, 4.85, 4);
	part(g, 11.05, .25, 7.05, m.canopyStripe(), 0, 4.6, 4);
	part(g, 2.5, .06, 2.5, m.dark(), -2.8, 5.12, 2.8, false);
	part(g, 5, .25, 1.2, m.concrete(), 0, .25, 4);
	for (const x of [-1.4, 1.4]) {
		part(g, .7, 1.7, .5, m.pump(), x, 1.2, 4);
		part(g, .5, .45, .02, m.pumpFace(), x, 1.55, 4.26);
		bar(g, v3(x + .36, 1.2, 4), v3(x + .5, .4, 4.4), .03, m.dark());
	}
	part(g, 9, 3.2, 5, m.kiosk(), 0, 1.72, -4.5);
	part(g, 9.4, .25, 5.4, m.rust(), 0, 3.4, -4.5);
	for (const x of [-3, -1]) part(g, 1.6, 1.2, .04, m.dark(), x, 1.9, -1.98);
	part(g, 1.4, .4, .04, m.glass(), -3, 2.3, -1.97);
	part(g, 1.1, 2.1, .04, m.dark(), 2.2, 1.2, -1.98);
	const pole = new three.Group();
	part(pole, .3, 7, .3, m.steel(), 0, 3.5, 0);
	part(pole, 2.6, 1.8, .25, m.sign(), 0, 7.2, 0);
	part(pole, 2.7, .2, .3, m.signRed(), 0, 6.25, 0);
	pole.position.set(9.5, 0, 6.5);
	pole.rotation.z = -.08;
	g.add(pole);
	for (const [x, z] of [
		[5.5, -2.5],
		[6.3, -2.2],
		[5.9, -1.5]
	]) {
		const d = new three.Mesh(new three.CylinderGeometry(.3, .3, .9, 12), m.drum());
		d.position.set(x, .57, z);
		d.castShadow = true;
		g.add(d);
	}
	const fallen = new three.Mesh(new three.CylinderGeometry(.3, .3, .9, 12), m.rust());
	fallen.rotation.z = Math.PI / 2;
	fallen.position.set(7.2, .42, -1.8);
	g.add(fallen);
	const weed = new three.Mesh(new three.IcosahedronGeometry(.45, 0), m.tumble());
	weed.position.set(-8, .5, 6);
	g.add(weed);
	return g;
}
/** A place: the MaiaCity centre as the newcomer finds it, where the dusty highway ends: the road comes in from the
*  west (−x) and stops at this place's origin, the abandoned gas station's forecourt facing its end, the bus stop on
*  its south side, the old travel van pulled up at it, its side door to the stop. About 70 × 30 m. */
function maiaCentre({ withVan = true, withRoad = true } = {}) {
	const g = new three.Group();
	g.name = "maia-centre";
	const road = new three.Mesh(new three.PlaneGeometry(60, 7), m.sand());
	road.rotation.x = -Math.PI / 2;
	road.position.set(-30, .02, 0);
	road.receiveShadow = true;
	if (withRoad) g.add(road);
	const stop = busStop();
	stop.position.set(-14, 0, -6.5);
	const station = gasStation();
	station.position.set(10, 0, 0);
	station.rotation.y = -Math.PI / 2;
	g.add(stop, station);
	if (withVan) {
		const van = travelVan();
		van.position.set(-14, 0, -1.8);
		van.rotation.y = Math.PI / 2;
		g.add(van);
	}
	return g;
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
//#region src/lib/buildings/built.js
/** @typedef {import('$lib/models').Model} Model */
/**
* the buildings' older versions, by id, each with its frozen builder (the tent's v1, Sandbox 3's interior, has none
* here; every other one is at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: () => import('three').Object3D })[]>}
*/
const HISTORY = {};
/** the shipping containers, fitted out to walk in */
/** @type {Omit<Model, 'versions' | 'version'>[]} */
const CONTAINER_LIST = [];
/** @type {Model[]} */
const CONTAINERS = /* @__PURE__ */ (() => versioned(CONTAINER_LIST, "make", HISTORY))();
/** the wayside of MaiaCity V1: buildings on the dusty highway and at the village centre, and the places they make
*  together; and at its end the bell tent from its v2 (./tent.js), which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
const WAYSIDE_LIST = /* @__PURE__ */ (() => [{
	id: "maia-centre",
	label: "MaiaCity centre",
	group: "Places",
	note: "the centre of the city plot today, where the sand highway ends: the abandoned gas station at the road’s end, the bus stop, the travel van pulling in. Where the story starts",
	usedIn: "MaiaCity V1",
	make: () => maiaCentre()
}])();
/** @type {(Model & { group: string })[]} */
const WAYSIDE = /* @__PURE__ */ (() => versioned(WAYSIDE_LIST, "make", HISTORY))();
/** every building built as one object, in the viewer's order: the `buildings` group's recipes */
const BUILT = /* @__PURE__ */ (() => [...CONTAINERS, ...WAYSIDE])();

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
const recipe = (id, v, variant) => recipeIn("buildings", BUILT, id, v, variant);
const list = () => recipesIn(BUILT);

//#endregion
exports.list = list;
exports.recipe = recipe;