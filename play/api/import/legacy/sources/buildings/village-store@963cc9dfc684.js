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
const m$2 = /* @__PURE__ */ (() => ({
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
	part(p, 1.72, .035, 1.13, m$2.galv(), 0, 0, 0);
	const face = new three.Mesh(new three.PlaneGeometry(1.68, 1.09), pvMat());
	face.rotation.x = -Math.PI / 2;
	face.position.y = .019;
	face.receiveShadow = true;
	p.add(face);
	return p;
}

//#endregion
//#region src/lib/models/village.js
const m$1 = /* @__PURE__ */ (() => ({
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
/** The powercube: a diesel generator in a silenced cube, 2.2 m each way, about 60 kVA; a 500-litre tank in its skid, louvres each side, the control panel behind its front door, the exhaust up through its roof. */
function powercube() {
	const g = new three.Group();
	g.name = "powercube";
	part(g, 2.3, .3, 2.3, m$1.skid(), 0, .15, 0);
	soft(g, 2.2, 1.9, 2.2, .05, m$1.genset(), 0, 1.25, 0);
	for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) part(g, .03, .06, 1.5, m$1.louvre(), sx * 1.11, .75 + i * .13, 0);
	part(g, .02, 1.6, .02, m$1.louvre(), 0, 1.25, 1.105);
	part(g, .5, .36, .03, m$1.screen(), -.5, 1.6, 1.11);
	for (const x of [-.12, .12]) part(g, .04, .22, .05, m$1.steel(), x, 1.3, 1.12);
	part(g, 1.6, .1, .03, m$1.louvre(), 0, 2, 1.11);
	bar(g, v3(.6, 2.2, -.6), v3(.6, 2.75, -.6), .075, m$1.steel());
	part(g, .22, .02, .22, m$1.steel(), .6, 2.78, -.6).rotation.x = .35;
	part(g, .14, .08, .14, m$1.louvre(), .9, .34, 1);
	for (const [x, z] of [
		[-.9, -.9],
		[-.9, .9],
		[.9, .9]
	]) bar(g, v3(x, 2.2, z), v3(x, 2.3, z), .04, m$1.steel());
	return g;
}
/** A solar row: n real panels side by side on their racks, 1.8 m apart, centred on the origin, along x. */
function solarRow(n = 6) {
	const g = new three.Group();
	g.name = "solar-row";
	for (let i = 0; i < n; i++) {
		const p = solarPanel();
		p.position.x = (i - (n - 1) / 2) * 1.8;
		g.add(p);
	}
	return g;
}
/** A solar panel: one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, its cable down to the ground. */
function solarPanel() {
	const g = new three.Group();
	g.name = "solar-panel";
	const tilt = Math.PI / 6;
	const low = .5, half = 1.13 / 2;
	pvPanel(g, 0, low + half * Math.sin(tilt), 0, tilt);
	const front = half * Math.cos(tilt), high = low + 1.13 * Math.sin(tilt);
	for (const x of [-.7, .7]) {
		bar(g, v3(x, .1, front), v3(x, .47, front), .025, m$1.galv());
		bar(g, v3(x, .1, -front), v3(x, high - .03, -front), .025, m$1.galv());
		bar(g, v3(x, .12, front), v3(x, .12, -front), .02, m$1.galv());
		for (const z of [front, -front]) part(g, .3, .12, .3, m$1.concrete(), x, .06, z);
	}
	part(g, .12, .08, .05, m$1.trim(), 0, high - .12, -front + .08);
	bar(g, v3(0, high - .15, -front + .08), v3(0, .02, -front - .3), .012, m$1.cable());
	return g;
}
/** A big battery pack: an outdoor lithium iron phosphate cabinet, 1.3 × 1.1 m, 2.3 m high, about 230 kWh; two doors, vents, its status lights and screen, on a concrete plinth. */
function batteryPack() {
	const g = new three.Group();
	g.name = "battery-pack";
	part(g, 1.6, .15, 1.4, m$1.concrete(), 0, .075, 0);
	soft(g, 1.3, 2.3, 1.1, .03, m$1.cabinet(), 0, 1.3, 0);
	part(g, 1.36, .06, 1.16, m$1.cabinet(), 0, 2.48, 0);
	part(g, .015, 2, .02, m$1.trim(), 0, 1.3, .555);
	for (const x of [-.08, .08]) part(g, .03, .25, .04, m$1.steel(), x, 1.35, .57);
	part(g, .28, .18, .02, m$1.screen(), -.38, 1.8, .56);
	for (let i = 0; i < 4; i++) part(g, .04, .04, .02, m$1.ok(), .25 + i * .07, 1.85, .56);
	for (let i = 0; i < 6; i++) for (const x of [-.38, .38]) part(g, .4, .025, .02, m$1.louvre(), x, .4 + i * .06, .56);
	for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) part(g, .02, .03, .7, m$1.louvre(), sx * .655, 2 + i * .07, 0);
	const sign = new three.Mesh(new three.CircleGeometry(.09, 3), m$1.warn());
	sign.position.set(.38, 1.55, .565);
	sign.rotation.z = Math.PI / 2;
	g.add(sign);
	bar(g, v3(.5, .15, -.55), v3(.5, .02, -.9), .025, m$1.cable());
	return g;
}

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
/** A place: the village store, the village centre's future storage area: the broken shed with the powercube inside,
*  and beside it the solar row and the big battery that still stand there. About 30 × 20 m. */
function villageStore({ withPowercube = true } = {}) {
	const g = new three.Group();
	g.name = "village-store";
	const shed = oldShed();
	g.add(shed);
	if (withPowercube) {
		const cube = powercube();
		cube.position.set(.6, .1, -.4);
		g.add(cube);
	}
	const solar = solarRow(6);
	solar.position.set(0, 0, -9);
	solar.rotation.y = Math.PI;
	const battery = batteryPack();
	battery.position.set(7, 0, -2);
	g.add(solar, battery);
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
	id: "village-store",
	label: "Village store",
	group: "Places",
	note: "the village centre's future storage area: the broken shed with the powercube inside, the solar row and the battery beside it. All the Village COOP's",
	usedIn: "MaiaCity V1",
	make: () => villageStore()
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