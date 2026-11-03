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
//#region src/lib/models/textures.ts
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const cache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
function canvasTexture(key, w, h, draw, srgb = true) {
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	draw(c.getContext("2d"), rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
	const t = new three.CanvasTexture(c);
	if (srgb) t.colorSpace = three.SRGBColorSpace;
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.anisotropy = 8;
	cache.set(key, t);
	return t;
}

//#endregion
//#region src/lib/models/containers.js
/** a 40-foot high cube, outside */
const CONTAINER = {
	length: 12.192,
	width: 2.438,
	height: 2.896
};
const L = /* @__PURE__ */ (() => CONTAINER.length)();
const W = /* @__PURE__ */ (() => CONTAINER.width)();
/** the wall's thickness (steel, insulation, lining), the floor and the ceiling inside */
const T = .1;
/** the inside's edges */
const X0 = -L / 2 + T;
const X1 = L / 2 - T;
const Z0 = -W / 2 + T;
const Z1 = W / 2 - T;
/** @typedef {{ x0: number, x1: number, z0: number, z1: number }} Rect a footprint on the floor that is in the way */
/** @typedef {{ u0: number, u1: number, y0: number, y1: number, door?: boolean, glass?: 'clear' | 'frosted' }} Hole an opening in a wall, along it from u0 to u1 */
/**
* @typedef {object} Walk how to walk a container: where to start, facing which way (the walker's yaw), what may be stood on
* @property {number} x
* @property {number} z
* @property {number} yaw
* @property {(x: number, z: number, here: number, ground: number, from: { x: number, z: number }) => boolean} canStand
* @property {(x: number, z: number) => number} floorAt
* @property {[number, number, number][]} lamps where the ceiling lights are
*/
const m$1 = /* @__PURE__ */ (() => ({
	frame: std("#3d3f41", .6, { metalness: .4 }),
	casting: std("#2f3032", .7, { metalness: .5 }),
	steel: std("#c9cdd0", .32, { metalness: .45 }),
	steelDark: std("#8e9396", .35, { metalness: .45 }),
	galv: std("#aeb3b5", .45, { metalness: .4 }),
	chrome: std("#e2e2e2", .18, { metalness: .55 }),
	black: std("#1b1c1e", .55),
	graphite: std("#34373a", .5, { metalness: .3 }),
	white: std("#f1f0ec", .45),
	cream: std("#e9e4d8", .6),
	lining: std("#ecebe6", .85),
	grey: std("#d6d6d1", .6),
	rubber: std("#262729", .9),
	cardboard: std("#b48d5c", .9),
	sack: std("#d8c8a2", .95),
	pine: std("#d9b47e", .7),
	pineDark: std("#b98d55", .7),
	osb: std("#c9a46a", .85),
	beech: std("#d8b27f", .5),
	red: std("#b8262b", .4, { metalness: .2 }),
	tool: std("#e8a317", .45),
	teal: std("#16838c", .45),
	blue: std("#2a5fa4", .45, { metalness: .2 }),
	green: std("#2f8a4a", .5),
	orange: std("#e0661f", .5),
	yellow: std("#f2c230", .5),
	glass: shared(() => new three.MeshPhysicalMaterial({
		color: "#dcebef",
		roughness: .05,
		transmission: .9,
		transparent: true,
		opacity: .28,
		depthWrite: false
	})),
	frosted: shared(() => new three.MeshPhysicalMaterial({
		color: "#eef3f4",
		roughness: .55,
		transmission: .6,
		transparent: true,
		opacity: .8
	})),
	mirror: std("#c8d3d8", .06, { metalness: .35 }),
	led: shared(() => new three.MeshStandardMaterial({
		color: "#ffffff",
		emissive: "#fff4e2",
		emissiveIntensity: 2
	})),
	ledGreen: shared(() => new three.MeshStandardMaterial({
		color: "#2bd46a",
		emissive: "#2bd46a",
		emissiveIntensity: 2.5
	})),
	ledBlue: shared(() => new three.MeshStandardMaterial({
		color: "#3fa4ff",
		emissive: "#3fa4ff",
		emissiveIntensity: 2.5
	})),
	ledRed: shared(() => new three.MeshStandardMaterial({
		color: "#ff3b30",
		emissive: "#ff3b30",
		emissiveIntensity: 2.5
	})),
	heat: shared(() => new three.MeshStandardMaterial({
		color: "#ff8a3c",
		emissive: "#ff5a1c",
		emissiveIntensity: 1.6
	}))
}))();
/** Solar cells: 6 × 10 monocrystalline cells, their silver busbars, a white gap round each. */
function pvCells() {
	return canvasTexture("pv-cells", 320, 192, (x) => {
		x.fillStyle = "#d8dde2";
		x.fillRect(0, 0, 320, 192);
		for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) {
			const cx = 2 + i * 31.8, cy = 2 + j * 31.6;
			x.fillStyle = "#16233d";
			x.fillRect(cx, cy, 30, 30);
			x.fillStyle = "#1d2e50";
			x.fillRect(cx + 1, cy + 1, 28, 14);
			x.fillStyle = "rgba(200,205,215,0.55)";
			for (const b of [
				8,
				15,
				22
			]) x.fillRect(cx + b, cy, 1, 30);
		}
	});
}
/** A solar panel, 1.72 × 1.13 m, its aluminium frame, lying flat at its origin. */
const pvMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: pvCells(),
	roughness: .25,
	metalness: .3
})))();
/** @param {THREE.Object3D} g @param {number} x @param {number} y @param {number} z @param {number} tilt about x (the low edge towards +z for a positive tilt) */
function pvPanel(g, x, y, z, tilt) {
	const p = new three.Group();
	p.position.set(x, y, z);
	p.rotation.x = tilt;
	g.add(p);
	part(p, 1.72, .035, 1.13, m$1.galv(), 0, 0, 0);
	const face = new three.Mesh(new three.PlaneGeometry(1.68, 1.09), pvMat());
	face.rotation.x = -Math.PI / 2;
	face.position.y = .019;
	face.receiveShadow = true;
	p.add(face);
	return p;
}

//#endregion
//#region src/lib/models/village.js
/** What each machine is, by the engine's asset id (COOPS.village): the Assets viewer's note, and the facts the game's asset card lists. */
const VILLAGE_INFO = {
	pickup: {
		model: "pickup",
		note: "a double-cab pickup, 5.33 × 1.86 m, 1.82 m high, a 3.1 m wheelbase: four doors, an open 1.55 m bed with a tool box and a jerrycan in it",
		specs: [
			["Size", "5.33 × 1.86 × 1.82 m"],
			["Seats", "5, a double cab"],
			["Payload", "about 1 t"],
			["Bed", "1.55 × 1.52 m, open"],
			["Fuel", "diesel, about 9 l per 100 km"],
			["Weight", "about 2.1 t"]
		]
	},
	powercube: {
		model: "electrocube",
		note: "the ElectroCube: our own cube on Open Source Ecology’s Power Cube frame (a 28 hp V-twin in a 27-inch steel frame) with a flat axial-flux generator on its shaft where the hydraulic pump would be, a power converter, breakers and sockets on the back, the same 27-inch size as every cube. Not an OSE design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Power", "about 15 kW [inferred]"],
			["Output", "400 V three-phase, 2 × 230 V"],
			["Engine", "28 hp (20.9 kW) petrol V-twin"],
			["Fuel tank", "7 gal (26.5 l)"],
			["Design", "ours, on the OSE Power Cube VII frame"]
		]
	},
	solar: {
		model: "solar-panel",
		note: "one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, on ballast blocks",
		specs: [
			["Size", "1.72 × 1.13 m"],
			["Peak power", "about 410 W"],
			["Cells", "60 monocrystalline"],
			["Tilt", "30°, facing the sun"],
			["Yield", "about 1.4 kWh on a sunny day"],
			["Weight", "about 21 kg, on 4 ballast blocks"]
		]
	},
	battery: {
		model: "battery-pack",
		note: "the BatteryCube: the Power Cube’s 27-inch frame with no engine, four BatteryPacks of 280 cells each stacked to its top (about 20.7 kWh) and a 6 kW hybrid inverter on its back that turns their 52 V into 230 V and takes a solar panel straight in. Our design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Capacity", "about 20.7 kWh, 4 BatteryPacks"],
			["Cells", "1,120 × 21700, 14S80P [inferred]"],
			["Power", "6 kW at 230 V, 12 kW peak"],
			["Solar in", "MPPT, up to 8 kWp"],
			["Weight", "about 140 kg"]
		]
	}
};
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
/** A solar panel: one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, its cable down to the ground. */
function solarPanel() {
	const g = new three.Group();
	g.name = "solar-panel";
	const tilt = Math.PI / 6;
	const low = .5, half = 1.13 / 2;
	pvPanel(g, 0, low + half * Math.sin(tilt), 0, tilt);
	const front = half * Math.cos(tilt), high = low + 1.13 * Math.sin(tilt);
	for (const x of [-.7, .7]) {
		bar(g, v3(x, .1, front), v3(x, .47, front), .025, m.galv());
		bar(g, v3(x, .1, -front), v3(x, high - .03, -front), .025, m.galv());
		bar(g, v3(x, .12, front), v3(x, .12, -front), .02, m.galv());
		for (const z of [front, -front]) part(g, .3, .12, .3, m.concrete(), x, .06, z);
	}
	part(g, .12, .08, .05, m.trim(), 0, high - .12, -front + .08);
	bar(g, v3(0, high - .15, -front + .08), v3(0, .02, -front - .3), .012, m.cable());
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
	id: "solar-panel",
	label: "Solar panel",
	note: `${VILLAGE_INFO.solar.note}. The Village COOP’s`,
	usedIn: "MaiaCity V1",
	make: () => solarPanel()
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