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
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");

//#region src/lib/sandbox-2/interior/textures.ts
/**
* Real-world surfaces, painted at runtime: flagstone, limestone blocks, oak
* boards, garden soil, bark, water and leaves. Nothing is downloaded — every
* texture is drawn once into a canvas and cached, so the dome interiors look
* like stone and timber without shipping a megabyte of photographs.
*/
const cache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** A small seeded random, so every texture is the same on every visit. */
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
/** Smooth value noise in 0..1, tileable over `period`. */
function noise(period, seed) {
	const r = rng(seed);
	const g = Array.from({ length: period * period }, () => r());
	const at = (x, y) => g[(y % period + period) % period * period + (x % period + period) % period];
	return (x, y) => {
		const xi = Math.floor(x), yi = Math.floor(y);
		const fx = x - xi, fy = y - yi;
		const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
		const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
		return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
	};
}
/** Several octaves of noise, tileable over the canvas. */
function fbm(size, seed, base = 4, octaves = 4) {
	const layers = Array.from({ length: octaves }, (_, i) => ({
		n: noise(base << i, seed + i * 97),
		f: (base << i) / size,
		w: 1 / (1 << i)
	}));
	const total = layers.reduce((s, l) => s + l.w, 0);
	return (x, y) => layers.reduce((s, l) => s + l.n(x * l.f, y * l.f) * l.w, 0) / total;
}
function paint(key, size, draw, repeat = 1, colour = true) {
	const hit = cache.get(key);
	if (hit) return hit;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const img = ctx.createImageData(size, size);
	draw(img);
	ctx.putImageData(img, 0, 0);
	const tex = new three.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = three.RepeatWrapping;
	tex.repeat.set(repeat, repeat);
	tex.anisotropy = 8;
	if (colour) tex.colorSpace = three.SRGBColorSpace;
	cache.set(key, tex);
	return tex;
}
const set$1 = (img, i, r, g, b, a = 255) => {
	img.data[i] = r;
	img.data[i + 1] = g;
	img.data[i + 2] = b;
	img.data[i + 3] = a;
};
/** Grey-brown bark in vertical fissures. */
function bark() {
	const size = 256;
	const grain = fbm(size, 51, 6, 4);
	return paint("bark", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const v = .45 + Math.abs(Math.sin((x + grain(x, y * .3) * 40) * .2)) * .3 + grain(x, y) * .25;
			set$1(img, (y * size + x) * 4, 118 * v, 98 * v, 80 * v);
		}
	});
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
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const barkMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
const sphere = /* @__PURE__ */ (() => shared(() => {
	const g = new three.IcosahedronGeometry(1, 0);
	g.deleteAttribute("normal");
	g.deleteAttribute("uv");
	const round = (0, three_addons_utils_BufferGeometryUtils_js.mergeVertices)(g);
	round.computeVertexNormals();
	round.setAttribute("uv", new three.BufferAttribute(new Float32Array(round.attributes.position.count * 2), 2));
	return round;
}))();
const house = /* @__PURE__ */ (() => ({
	monstera: shared(() => new three.MeshStandardMaterial({
		color: "#2f6b3a",
		roughness: .55,
		side: three.DoubleSide
	})),
	fig: shared(() => new three.MeshStandardMaterial({
		color: "#3d7a3a",
		roughness: .45,
		side: three.DoubleSide
	})),
	snake: shared(() => new three.MeshStandardMaterial({
		color: "#4f7d3c",
		roughness: .6,
		side: three.DoubleSide
	})),
	pothos: shared(() => new three.MeshStandardMaterial({
		color: "#6aa84a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stem: shared(() => new three.MeshStandardMaterial({
		color: "#58743a",
		roughness: .8
	})),
	clay: shared(() => new three.MeshStandardMaterial({
		color: "#b9703f",
		roughness: .95
	})),
	basket: shared(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1
	}))
}))();
/** A leaf: a flat oval, with a notch cut into it for the monstera. */
const leafGeo = /* @__PURE__ */ (() => shared(() => {
	const s = new three.Shape();
	s.moveTo(0, 0);
	s.bezierCurveTo(.45, .15, .45, .85, 0, 1);
	s.bezierCurveTo(-.45, .85, -.45, .15, 0, 0);
	return new three.ShapeGeometry(s, 6);
}))();
/** A houseplant in a round clay pot or a woven basket: monstera, fiddle-leaf fig, snake plant, or a trailing pothos. */
function houseplant(kind, seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const pr = .22 * size, ph = .3 * size;
	const pot = new three.Mesh(new three.CylinderGeometry(pr, pr * .8, ph, 16), r() < .5 ? house.clay() : house.basket());
	pot.position.y = ph / 2;
	g.add(pot);
	if (kind === "monstera") for (let i = 0; i < 8; i++) {
		const a = i / 8 * Math.PI * 2 + r();
		const len = (.5 + r() * .4) * size;
		const stem = new three.Mesh(sphere(), house.stem());
		stem.scale.set(.012, len / 2, .012);
		stem.position.set(Math.sin(a) * .1, ph + len / 2, Math.cos(a) * .1);
		stem.rotation.set(Math.cos(a) * .5, 0, -Math.sin(a) * .5);
		g.add(stem);
		const leaf = new three.Mesh(leafGeo(), house.monstera());
		leaf.scale.setScalar((.45 + r() * .2) * size);
		leaf.position.set(Math.sin(a) * len * .5, ph + len * .9, Math.cos(a) * len * .5);
		leaf.rotation.set(-.9 - r() * .4, a, 0, "YXZ");
		g.add(leaf);
	}
	else if (kind === "fig") {
		const t = new three.Mesh(sphere(), barkMat());
		t.scale.set(.03 * size, .7 * size, .03 * size);
		t.position.y = ph + .6 * size;
		g.add(t);
		for (let i = 0; i < 22; i++) {
			const leaf = new three.Mesh(leafGeo(), house.fig());
			leaf.scale.setScalar((.22 + r() * .08) * size);
			leaf.position.set((r() - .5) * .4 * size, ph + (.6 + r() * .9) * size, (r() - .5) * .4 * size);
			leaf.rotation.set(r() * 3, r() * 6, r() * 3);
			g.add(leaf);
		}
	} else if (kind === "snake") for (let i = 0; i < 9; i++) {
		const leaf = new three.Mesh(leafGeo(), house.snake());
		leaf.scale.set(.12 * size, (.6 + r() * .4) * size, 1);
		leaf.position.set((r() - .5) * .18, ph, (r() - .5) * .18);
		leaf.rotation.set((r() - .5) * .3, r() * 6, (r() - .5) * .3);
		g.add(leaf);
	}
	else for (let i = 0; i < 30; i++) {
		const a = r() * Math.PI * 2;
		const down = r() * .8 * size;
		const leaf = new three.Mesh(leafGeo(), house.pothos());
		leaf.scale.setScalar(.1 * size);
		leaf.position.set(Math.sin(a) * (pr + .02), ph - down, Math.cos(a) * (pr + .02));
		leaf.rotation.set(r() * 3, a, r() * 3);
		g.add(leaf);
	}
	return g;
}

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
var init_refs = __esmMin((() => {}));

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
	id: "fiddle-leaf-fig",
	label: "Fiddle-leaf fig",
	note: "big leathery leaves up a slim stem, by the bed",
	usedIn: "Dome rooms",
	make: () => houseplant("fig", 4, 1)
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