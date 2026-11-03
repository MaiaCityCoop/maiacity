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

//#region src/lib/actors/excavator-rig.js
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}

//#endregion
//#region src/lib/actors/pallet.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} Add */
/** a Euro pallet's length, width and height; the forks' openings: their middles across it (x), bottom and top */
const PL = 1.2;
const PW = .8;
const PH = .144;
const WOOD = "#c9a878";
const WOOD2 = "#b8955f";
const CRATE = "#b98d55";
const CRATE2 = "#a87f4c";
const WRAP = "#dfe3e2";
/**
* A Euro pallet standing at `at` (the middle of its underside), turned `yaw` about y from lying along x, on `bone`;
* loaded with cartons to `stack` (m from the floor; 0: empty). The wrap is the actor's material 1 (its glass).
* @param {Add} add @param {V3} at @param {number} yaw @param {string} bone @param {{ stack?: number }} [o]
*/
function euroPallet(add, at, yaw, bone, { stack = 1.6 } = {}) {
	const place = new three.Matrix4().makeTranslation(...at).multiply(new three.Matrix4().makeRotationY(yaw));
	/** @type {Add} */
	const put = (geo, color, b, mat) => add(geo.applyMatrix4(place), color, b, mat);
	for (const [bz, w] of [
		[-.3275, .145],
		[-.16, .1],
		[0, .145],
		[.16, .1],
		[.3275, .145]
	]) put(block(PL, .022, w, [
		0,
		.13299999999999998,
		bz
	], .004), WOOD, bone);
	for (const bx of [
		-.5275,
		0,
		.5275
	]) {
		put(block(.145, .022, PW, [
			bx,
			.111,
			0
		], .004), WOOD2, bone);
		for (const bz of [
			-.3275,
			0,
			.3275
		]) put(block(.145, .078, .145, [
			bx,
			.061,
			bz
		], .006), WOOD2, bone);
	}
	for (const bz of [
		-.3275,
		0,
		.3275
	]) put(block(PL, .022, .1, [
		0,
		.011,
		bz
	], .004), WOOD, bone);
	if (stack <= .144) return;
	const top = stack - PH;
	for (let k = 0; k < 3; k++) put(block(1.18, top / 3 - .01, .78, [
		0,
		PH + (k + .5) * (top / 3),
		0
	], .02), k % 2 ? CRATE : CRATE2, bone);
	put(block(1.204, top * .7, .804, [
		0,
		PH + top * .5,
		0
	], .02), WRAP, bone, 1);
}

//#endregion
//#region src/lib/models/pallet.js
/** An empty Euro pallet lying along x, the middle of its underside at the origin: one mesh a piece. */
function pallet() {
	const g = new three.Group();
	g.name = "euro-pallet";
	const woods = /* @__PURE__ */ new Map();
	euroPallet((geo, color, _bone, mat) => {
		if (mat) return;
		if (!woods.has(color)) woods.set(color, new three.MeshStandardMaterial({
			color,
			roughness: .85,
			metalness: .04
		}));
		const m = new three.Mesh(geo, woods.get(color));
		m.castShadow = m.receiveShadow = true;
		g.add(m);
	}, [
		0,
		0,
		0
	], 0, "x", { stack: 0 });
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
	id: "euro-pallet",
	label: "Euro pallet",
	note: "an empty EPAL, 1200 × 800 mm and 144 mm high: five top boards on three cross boards, nine blocks under them and three bottom boards, in two woods. The machines carry it loaded (the goods pod, the forklift); a factory’s line stacks its raw material and its product on it",
	usedIn: "Factories",
	make: () => pallet()
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