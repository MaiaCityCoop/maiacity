Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
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
var init_refs = __esmMin((() => {}));

//#endregion
//#region src/lib/sandbox-2/interior/rooms.ts
/**
* THE PRIVATE ROOMS — furnished the way a Waldorf school is built: few hard
* corners, walls and furniture of hand-smoothed plaster in soft lazure
* colours, oiled wood with rounded edges, and plants everywhere.
*
* Every room, between its two partition walls, from the walkway to the glass:
*   by the door   a curved plaster bench, a round table, stools, a niche shelf
*   in the middle a round rug, a wide bed facing out through the glass
*   by the glass  a natural stone bath, sunk in pebbles, looking at the forest
*   at the end    a round bathroom pod: a pebble-floored walk-in shower, a basin
*   everywhere    monstera, fiddle-leaf fig, snake plant, trailing pothos, olive
*/
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const M = /* @__PURE__ */ (() => ({
	wood: shared(() => new three.MeshStandardMaterial({
		color: "#b98a5a",
		roughness: .7
	})),
	darkWood: shared(() => new three.MeshStandardMaterial({
		color: "#8a6040",
		roughness: .7
	})),
	wool: shared(() => new three.MeshStandardMaterial({
		color: "#efe8da",
		roughness: 1
	})),
	felt: [
		"#b8674a",
		"#7d8f5c",
		"#c9a15a",
		"#6f7fa0"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: 1
	}))),
	stone: shared(() => new three.MeshStandardMaterial({
		color: "#a39d92",
		roughness: .85
	})),
	pebble: shared(() => new three.MeshStandardMaterial({
		color: "#8d877c",
		roughness: .9
	})),
	basket: shared(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1,
		side: three.DoubleSide
	})),
	water: shared(() => new three.MeshStandardMaterial({
		color: "#7fc9cf",
		roughness: .08,
		metalness: .1,
		transparent: true,
		opacity: .8
	})),
	brass: shared(() => new three.MeshStandardMaterial({
		color: "#b08d57",
		roughness: .35,
		metalness: .8
	})),
	book: [
		"#8a4b3a",
		"#4f6b5a",
		"#c9a15a",
		"#5b6a8a",
		"#a8683a"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: .8
	})))
}))();
/** A rounded box, made once for each size and shared: every room asks for the same few. */
const rounded = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const round = (w, h, d, r = .08) => {
	const key = `${w} ${h} ${d} ${r}`;
	let geo = rounded.get(key);
	if (!geo) rounded.set(key, geo = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
	return geo;
};
/**
* A balcony door: a round-headed timber frame at the glass, its glazed leaf
* standing open onto the terrace. Built facing +z (outward), standing on y 0.
*/
function balconyDoor() {
	const g = new three.Group();
	const w = .95, h = 2.1;
	for (const sx of [-1, 1]) g.add(new three.Mesh(round(.12, h, .14, .04), M.wood()).translateX(sx * .5349999999999999).translateY(h / 2));
	const arch = new three.Mesh(new three.TorusGeometry(.5349999999999999, .06, 8, 20, Math.PI), M.wood());
	arch.position.y = h;
	g.add(arch);
	g.add(new three.Mesh(round(1.25, .05, .5, .02), M.stone()).translateY(.025));
	const leaf = new three.Group();
	leaf.add(new three.Mesh(new three.BoxGeometry(w, 2.0500000000000003, .03), new three.MeshStandardMaterial({
		color: "#dfeef0",
		roughness: .05,
		transparent: true,
		opacity: .25
	})).translateX(w / 2).translateY(h / 2));
	for (const x of [0, w]) leaf.add(new three.Mesh(new three.BoxGeometry(.05, h, .05), M.wood()).translateX(x).translateY(h / 2));
	leaf.position.x = -.95 / 2;
	leaf.rotation.y = 1.9;
	g.add(leaf);
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
//#region src/lib/models/domerooms.js
/** @type {{ id: string, label: string, note: string, usedIn: string, make: () => THREE.Object3D }[]} */
const DOME_ROOMS = [{
	id: "balcony-door",
	label: "Balcony door",
	note: "a round-headed timber frame at the glass, its glazed leaf standing open onto the terrace, 0.95 × 2.1 m",
	usedIn: "Dome rooms",
	make: () => balconyDoor()
}];

//#endregion
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({}))();
const MODELS = /* @__PURE__ */ (() => versioned([...DOME_ROOMS], "make", HISTORY))();

//#endregion
//#region src/lib/assets/recipe.js
init_refs();
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