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
const WAYSIDE_INFO = {
	van: {
		name: "The travel van",
		note: "an old minibus that has crossed a continent: 5.0 × 1.9 m, 2.3 m high, its blue paint sun-faded and rusting through, a sliding side door, a roof rack piled with bags, a sack of rice and a spare tyre"
	},
	busStop: {
		name: "The bus stop",
		note: "a bus stop on the dusty highway: a concrete slab, a rusty corrugated roof on two steel posts, a plank bench, a round sign on a pole and a faded timetable"
	},
	gasStation: {
		name: "The old gas station",
		note: "an abandoned gas station, 24 × 16 m: a faded canopy on four pillars with a panel missing, two old pumps, a kiosk with broken windows, a leaning sign with nothing on it, oil drums and cracked concrete"
	},
	shed: {
		name: "The old shed",
		note: "an old timber shed, 6 × 4 m, 2.8 m high: grey planks with gaps, half its corrugated roof gone, one door hanging. The Village COOP keeps its powercube here: the village centre’s future store"
	}
};
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
	id: "gas-station",
	label: "Abandoned gas station",
	group: "Wayside",
	note: `${WAYSIDE_INFO.gasStation.note}. The old world, left behind at the city's centre`,
	usedIn: "MaiaCity V1",
	make: () => gasStation()
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