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
const v3 = (x, y, z) => new three.Vector3(x, y, z);

//#endregion
//#region src/lib/models/village.js
const m = /* @__PURE__ */ (() => ({
	paint: shared(() => new three.MeshStandardMaterial({
		color: "#3d6a8f",
		roughness: .35,
		metalness: .35
	})),
	glass: shared(() => new three.MeshStandardMaterial({
		color: "#1c2630",
		roughness: .08,
		metalness: .5
	})),
	tyre: std("#1f1f1f", .9),
	rim: std("#9a9ea2", .35, { metalness: .8 }),
	trim: std("#2a2c2e", .6),
	light: shared(() => new three.MeshStandardMaterial({
		color: "#f4f1e2",
		emissive: "#f4ecc8",
		emissiveIntensity: .5
	})),
	tail: shared(() => new three.MeshStandardMaterial({
		color: "#b3261e",
		emissive: "#7a140f",
		emissiveIntensity: .4
	})),
	bedliner: std("#2b2b2b", .95),
	jerry: std("#3f5a2a", .6),
	box: std("#b6b8b8", .35, { metalness: .75 }),
	genset: std("#d9a332", .5, { metalness: .2 }),
	skid: std("#3a3c3e", .55, { metalness: .4 }),
	louvre: std("#2d2f31", .7),
	steel: std("#8b8f92", .4, { metalness: .7 }),
	screen: shared(() => new three.MeshStandardMaterial({
		color: "#16303a",
		emissive: "#2c7f8f",
		emissiveIntensity: .6
	})),
	galv: std("#aeb3b5", .45, { metalness: .4 }),
	concrete: std("#b9b5ab", .95),
	cabinet: std("#ecebe6", .45, { metalness: .1 }),
	ok: shared(() => new three.MeshStandardMaterial({
		color: "#3fbf6a",
		emissive: "#3fbf6a",
		emissiveIntensity: .9
	})),
	warn: std("#f2c230", .5),
	cable: std("#161616", .7)
}))();
/** where things are in the pickup (v2), in its own frame (+z ahead, its left +x, the ground at 0): the driver's and
*  the passenger's hip points on their seats, the cab's floor, the steering wheel's middle, the bed's floor and its
*  back edge (where the tailgate hinges), and how far the tailgate reaches when it is down */
const PICKUP = /* @__PURE__ */ (() => ({
	driver: v3(.42, .84, .62),
	passenger: v3(-.42, .84, .62),
	floor: .56,
	wheel: v3(.42, 1.2, 1.12),
	bed: 1.16,
	tailgate: -2.62,
	gate: .44,
	/** v3's four doors: which side (x of their outer face), and the z of their front edge (the hinge) and back edge */
	doors: {
		driver: {
			x: .93,
			front: 1.53,
			back: .47
		},
		passenger: {
			x: -.93,
			front: 1.53,
			back: .47
		},
		rearL: {
			x: .93,
			front: .43,
			back: -.6
		},
		rearR: {
			x: -.93,
			front: .43,
			back: -.6
		}
	}
}))();
/** the ramp's measures: from the ground up to the bed's floor (1.16 m) over 2 m, 0.86 m wide between its rails */
const RAMP = /* @__PURE__ */ (() => ({
	rise: PICKUP.bed,
	run: 2,
	w: .86
}))();
/** A loading ramp: one folding aluminium ramp, 0.86 m wide between two side rails, its deck crossed with grip bars
*  every 10 cm, a hinged lip at the top to rest on the bed and rubber feet at the bottom, rising 1.16 m over 2 m
*  (30°). Its origin is its foot, on the ground; it rises towards +z to its lip at (0, 1.16, 2.0): set it behind a
*  pickup facing the same way, its lip on the bed's back edge (PICKUP.tailgate, or the tailgate's end when it is
*  down). */
function loadingRamp() {
	const g = new three.Group();
	g.name = "loading-ramp";
	const { rise, run, w } = RAMP;
	const len = Math.hypot(rise, run), a = Math.atan2(rise, run);
	const deck = new three.Group();
	deck.rotation.x = -a;
	part(deck, w, .006, len - .12, m.galv(), 0, .03, len / 2);
	for (const sx of [-1, 1]) {
		part(deck, .04, .09, len, m.galv(), sx * (w / 2 + .02), .045, len / 2);
		part(deck, .045, .012, len, m.steel(), sx * (w / 2 + .02), .095, len / 2);
	}
	for (let z = .1; z < len - .1; z += .1) part(deck, w, .012, .014, m.steel(), 0, .039, z);
	for (const z of [len * .33, len * .66]) part(deck, w, .04, .03, m.galv(), 0, .012, z);
	const lip = new three.Group();
	lip.position.set(0, .03, len);
	lip.rotation.x = a;
	part(lip, w + .08, .008, .14, m.galv(), 0, 0, .07);
	deck.add(lip);
	for (const sx of [-1, 1]) part(deck, .06, .03, .08, m.cable(), sx * (w / 2 + .02), 0, .03);
	deck.position.y = -.03 * Math.cos(a);
	g.add(deck);
	g.traverse((o) => o.isMesh && (o.castShadow = true));
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
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({}))();
const LIST = /* @__PURE__ */ (() => [{
	id: "loading-ramp",
	label: "Loading ramp",
	note: "one folding aluminium ramp, 0.86 m wide between its rails, grip bars every 10 cm, a lip to lie on the bed: up 1.16 m over 2 m, from the ground to the pickup’s bed",
	usedIn: "MaiaCity V1",
	make: () => loadingRamp()
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