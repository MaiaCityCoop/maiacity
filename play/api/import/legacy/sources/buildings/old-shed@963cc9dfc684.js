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
/** An old timber shed, 6 × 4 m, 2.8 m high: grey planks with gaps, half its corrugated roof gone, one door hanging. */
function oldShed() {
	const g = new three.Group();
	g.name = "old-shed";
	part(g, 6.2, .1, 4.2, m.concrete(), 0, .05, 0, false);
	for (const x of [-3, 3]) for (const z of [-2, 2]) part(g, .14, 2.6, .14, m.greyPlank(), x, 1.3, z);
	part(g, 6.1, .14, .14, m.greyPlank(), 0, 2.8, 0);
	for (let x = -2.9; x <= 2.9; x += .32) part(g, .24, 2.4, .04, x % 1.3 < .2 ? m.plank() : m.greyPlank(), x, 1.25, -2);
	for (const sx of [-3, 3]) for (let z = -1.85; z <= 1.85; z += .32) if (Math.abs(z - .6 * sx) > .3) part(g, .04, 2.4, .24, m.greyPlank(), sx, 1.25, z);
	for (let x = -2.9; x <= 2.9; x += .32) if (Math.abs(x) > 1.1) part(g, .24, 2.4, .04, m.greyPlank(), x, 1.25, 2);
	const door = new three.Group();
	part(door, 1, 2.1, .05, m.plank(), .5, 1.05, 0);
	door.position.set(-1.05, .05, 2.05);
	door.rotation.set(0, -1.1, .12);
	g.add(door);
	const a = part(g, 6.2, .04, 2.3, m.corrugated(), 0, 2.45, -1);
	a.rotation.x = -.32;
	const b = part(g, 3, .04, 2.3, m.rust(), -1.6, 2.45, 1);
	b.rotation.x = .32;
	bar(g, v3(.2, 2.75, .3), v3(2.9, 2.2, 1.9), .04, m.greyPlank());
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
	id: "old-shed",
	label: "Old shed",
	group: "Wayside",
	note: WAYSIDE_INFO.shed.note,
	usedIn: "MaiaCity V1",
	make: () => oldShed()
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