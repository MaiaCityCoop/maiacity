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

//#region src/lib/models/units.js
const CM = .01;
const MM = .001;
/** a kilometre an hour, in metres a second */
const KMH = 1e3 / 3600;
/** how fast things move, at real speeds */
const SPEED = {
	walk: 5 * KMH,
	track: 30 * KMH,
	highway: 80 * KMH
};

//#endregion
//#region src/lib/models/planting.js
/** a packet's size: 7 × 10 cm, a few seeds thick */
const PACKET = {
	w: 7 * CM,
	h: 10 * CM,
	d: 4 * MM
};
/** A patch of dug earth, `radius` m across its middle: turned soil a little heaped, crumbs and clods on it, a hollow in
*  its middle for the seed. It darkens and shines as it gets wet: `userData.setWet(k)` (0 dry … 1 soaked). Its own
*  material, so one patch wets alone. */
function dugEarth({ radius = .3, seed = 7 } = {}) {
	const g = new three.Group();
	g.name = "dug-earth";
	let s = seed;
	const rand = () => ((s = s * 16807 % 2147483647) - 1) / 2147483646;
	const dry = new three.Color("#7a5a3e"), wet = new three.Color("#3a2717");
	const mat = new three.MeshStandardMaterial({
		color: dry.clone(),
		roughness: .97,
		vertexColors: true
	});
	const ring = new three.RingGeometry(.001, radius * 1.15, 72, 14);
	const pos = ring.attributes.position, col = [];
	const phase = [
		0,
		0,
		0,
		0
	].map(() => rand() * Math.PI * 2);
	const ragged = (a) => .93 + .05 * Math.sin(3 * a + phase[0]) + .035 * Math.sin(5 * a + phase[1]) + .025 * Math.sin(9 * a + phase[2]) + .015 * Math.sin(17 * a + phase[3]);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y);
		const edge = radius * ragged(Math.atan2(y, x));
		const u = r / edge;
		const heap = u < 1 ? .04 * Math.sin(Math.PI * (.15 + .85 * u)) ** .8 : 0;
		const lump = u < .95 ? .007 * (rand() - .5) : 0;
		const h = Math.max(.004, heap + lump);
		pos.setXYZ(i, x * (u > 1 ? edge / r : 1), h, -y * (u > 1 ? edge / r : 1));
		const c = .82 + .3 * rand();
		col.push(c, c * (.96 + .06 * rand()), c * .95);
	}
	ring.setAttribute("color", new three.Float32BufferAttribute(col, 3));
	ring.computeVertexNormals();
	const ground = new three.Mesh(ring, mat);
	ground.receiveShadow = true;
	g.add(ground);
	for (let i = 0; i < 40; i++) {
		const a = rand() * Math.PI * 2, r = radius * (.25 + .85 * rand()) * (i < 10 ? 1.1 : .9);
		const size = .008 + .022 * rand() ** 2;
		const clod = new three.Mesh(new three.DodecahedronGeometry(size, 0), mat);
		clod.geometry.setAttribute("color", new three.Float32BufferAttribute(new Array(clod.geometry.attributes.position.count * 3).fill(.85), 3));
		clod.position.set(Math.cos(a) * r, .02 * Math.max(0, 1 - r / radius) + size * .5, Math.sin(a) * r);
		clod.rotation.set(rand() * 3, rand() * 3, rand() * 3);
		clod.scale.y = .6;
		clod.castShadow = true;
		g.add(clod);
	}
	const setWet = (k) => {
		const t = Math.max(0, Math.min(1, k));
		mat.color.copy(dry).lerp(wet, t);
		mat.roughness = .97 - .4 * t;
	};
	g.userData = {
		setWet,
		material: mat
	};
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
	id: "dug-earth",
	label: "Dug earth",
	note: "a patch of turned soil 60 cm across, heaped a little, crumbs and clods on it, a hollow for the seed; it darkens and shines as it is watered",
	usedIn: "MaiaCity V1",
	make: () => dugEarth()
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