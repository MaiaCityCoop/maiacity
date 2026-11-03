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
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");
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
function rng$1(seed) {
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
	draw(c.getContext("2d"), rng$1([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
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
const H = /* @__PURE__ */ (() => CONTAINER.height)();
/** the wall's thickness (steel, insulation, lining), the floor and the ceiling inside */
const T = .1;
const FLOOR = .15;
const CEIL = 2.7;
/** the inside's edges */
const X0 = -L / 2 + T;
const X1 = L / 2 - T;
const Z0 = -W / 2 + T;
const Z1 = W / 2 - T;
/** how close a walker's middle comes to anything */
const PAD = .22;
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
const m = /* @__PURE__ */ (() => ({
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
/** Sandbox 1's paint, one material for every container of a colour */
const paints = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** @param {string} color @returns {THREE.MeshStandardMaterial} */
function paint(color) {
	let p = paints.get(color);
	if (!p) paints.set(color, p = new three.MeshStandardMaterial({
		color,
		roughness: .55,
		metalness: .3
	}));
	return p;
}
/** a seeded random number, the same every time */
/** @param {number} seed */
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
/** a mesh that neither casts nor catches a shadow (glass, a light, a screen) */
/** @param {THREE.Mesh} p */
const unlit = (p) => (p.castShadow = p.receiveShadow = false, p);
/** A round thing standing up (a tin, a bottle, a drum), its foot at y. */
/** @param {THREE.Object3D} g @param {number} r @param {number} h @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z */
function drum(g, r, h, mat, x, y, z, seg = 16) {
	const p = new three.Mesh(new three.CylinderGeometry(r, r, h, seg), mat);
	p.position.set(x, y + h / 2, z);
	p.castShadow = p.receiveShadow = true;
	g.add(p);
	return p;
}
/** Stencilled letters on the steel, as a container's owner paints its name. */
/** @param {string} text */
function stencil(text) {
	return canvasTexture(`stencil:${text}`, 1024, 256, (x) => {
		x.clearRect(0, 0, 1024, 256);
		x.fillStyle = "#f4f1ea";
		x.font = "bold 150px \"Arial Narrow\", Arial, sans-serif";
		x.textBaseline = "middle";
		x.fillText(text, 24, 110);
		x.font = "bold 44px Arial, sans-serif";
		x.fillText("MAIA 400 1" + text.length + "4  ·  45G1", 28, 222);
	});
}
/** Hardboard with holes every 25 mm, the pegboard's. */
function pegHoles() {
	return canvasTexture("pegboard", 256, 256, (x) => {
		x.fillStyle = "#b48a5a";
		x.fillRect(0, 0, 256, 256);
		x.fillStyle = "#4a3523";
		for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
			x.beginPath();
			x.arc(8 + i * 16, 8 + j * 16, 2.6, 0, Math.PI * 2);
			x.fill();
		}
	});
}
/** A floor of its own colour, or a texture repeated at its real size over the inside. */
/** @param {string} color @param {THREE.Texture} [map] @param {number} [size] */
function floorMaterial(color, map, size = 1) {
	if (!map) return new three.MeshStandardMaterial({
		color,
		roughness: .75
	});
	const t = map.clone();
	t.repeat.set((X1 - X0) / size, (Z1 - Z0) / size);
	t.needsUpdate = true;
	return new three.MeshStandardMaterial({
		color,
		map: t,
		roughness: .5
	});
}
/** A flat picture on a panel (a screen, a label), facing +z. */
/** @param {THREE.Object3D} g @param {number} w @param {number} h @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z @param {number} [ry] */
function sheet(g, w, h, mat, x, y, z, ry = 0) {
	const p = new three.Mesh(new three.PlaneGeometry(w, h), mat);
	p.position.set(x, y, z);
	p.rotation.y = ry;
	g.add(p);
	return p;
}
/**
* The parts of a wall from a to b and y0 to y1 that are not openings.
* @param {number} a @param {number} b @param {number} y0 @param {number} y1 @param {Hole[]} holes
*/
function cut(a, b, y0, y1, holes) {
	const us = [a, b];
	for (const h of holes) us.push(Math.max(a, Math.min(b, h.u0)), Math.max(a, Math.min(b, h.u1)));
	us.sort((p, q) => p - q);
	/** @type {{ u0: number, u1: number, y0: number, y1: number }[]} */
	const out = [];
	for (let i = 0; i < us.length - 1; i++) {
		const u0 = us[i], u1 = us[i + 1];
		if (u1 - u0 < 1e-4) continue;
		const mid = (u0 + u1) / 2;
		const h = holes.find((o) => mid > o.u0 && mid < o.u1);
		if (!h) out.push({
			u0,
			u1,
			y0,
			y1
		});
		else {
			if (h.y0 > y0 + .001) out.push({
				u0,
				u1,
				y0,
				y1: Math.min(h.y0, y1)
			});
			if (h.y1 < y1 - .001) out.push({
				u0,
				u1,
				y0: Math.max(h.y1, y0),
				y1
			});
		}
	}
	return out;
}
/**
* One wall, built in its own frame — u along it, w out of it, the outer face at `half` — and turned into place by
* `rot`: its steel skin and corrugation outside, its lining inside, a reveal round each opening, glass in a window, a
* door swung open. Returns what of it is in the way, on the floor.
* @param {THREE.Group} g
* @param {{ rot: number, half: number, span: number, inner: number, holes: Hole[], skin: THREE.Material, lining: THREE.Material }} o
* @returns {Rect[]}
*/
function wall(g, { rot, half, span, inner, holes, skin, lining }) {
	const w = new three.Group();
	w.rotation.y = rot;
	g.add(w);
	for (const r of cut(-span, span, .16, H - .1, holes)) part(w, r.u1 - r.u0, r.y1 - r.y0, .02, skin, (r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - .045);
	/** @type {THREE.BufferGeometry[]} */
	const geos = [];
	const pitch = .278, n = Math.floor(2 * span / pitch);
	const first = -span + (2 * span - (n - 1) * pitch) / 2;
	for (let i = 0; i < n; i++) {
		const u = first + i * pitch;
		for (const r of cut(u - .065, u + .065, .2, H - .14, holes)) {
			if (r.u1 - r.u0 < .03 || r.y1 - r.y0 < .03) continue;
			const b = new three.BoxGeometry(r.u1 - r.u0, r.y1 - r.y0, .03);
			b.translate((r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - .02);
			geos.push(b);
		}
	}
	if (geos.length) {
		const ribs = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos), skin);
		ribs.castShadow = ribs.receiveShadow = true;
		w.add(ribs);
		for (const b of geos) b.dispose();
	}
	for (const r of cut(-inner, inner, FLOOR, CEIL, holes)) part(w, r.u1 - r.u0, r.y1 - r.y0, .02, lining, (r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, half - T + .01);
	const rw0 = half - T, rw1 = half - .035, rc = (rw0 + rw1) / 2, rd = rw1 - rw0;
	/** @type {{ u0: number, u1: number, w0: number, w1: number }[]} */
	const leaves = [];
	for (const h of holes) {
		const hu = (h.u0 + h.u1) / 2, hy = (h.y0 + h.y1) / 2;
		part(w, .04, h.y1 - h.y0, rd, m.frame(), h.u0 + .02, hy, rc);
		part(w, .04, h.y1 - h.y0, rd, m.frame(), h.u1 - .02, hy, rc);
		part(w, h.u1 - h.u0, .04, rd, m.frame(), hu, h.y1 - .02, rc);
		if (!h.door) part(w, h.u1 - h.u0 + .06, .04, rd + .05, m.frame(), hu, h.y0 + .02, rc + .025);
		if (h.glass) {
			unlit(part(w, h.u1 - h.u0 - .08, h.y1 - h.y0 - .08, .008, h.glass === "frosted" ? m.frosted() : m.glass(), hu, hy, rc));
			if (h.u1 - h.u0 > 1.2) part(w, .04, h.y1 - h.y0 - .08, .04, m.frame(), hu, hy, rc);
		}
		if (h.door) {
			const leaf = h.u1 - h.u0 - .08, open = 1.75;
			const pivot = new three.Group();
			pivot.position.set(h.u0 + .04, 0, half - .01);
			pivot.rotation.y = -1.75;
			w.add(pivot);
			part(pivot, leaf, h.y1 - h.y0 - .04, .045, skin, leaf / 2, hy, .0225);
			bar(pivot, v3(leaf - .08, 1, .045), v3(leaf - .08, 1, .1), .012, m.chrome());
			bar(pivot, v3(leaf - .08, 1, .1), v3(leaf - .2, 1, .1), .012, m.chrome());
			const ex = h.u0 + .04 + leaf * Math.cos(open), ew = half - .01 + leaf * Math.sin(open);
			leaves.push({
				u0: Math.min(h.u0, ex) - .03,
				u1: Math.max(h.u0 + .06, ex + .03),
				w0: half,
				w1: ew + .05
			});
		}
	}
	const c = Math.cos(rot), s = Math.sin(rot);
	/** @param {number} u0 @param {number} u1 @param {number} w0 @param {number} w1 @returns {Rect} */
	const toFloor = (u0, u1, w0, w1) => {
		const xs = [u0 * c + w0 * s, u1 * c + w1 * s], zs = [-u0 * s + w0 * c, -u1 * s + w1 * c];
		return {
			x0: Math.min(...xs),
			x1: Math.max(...xs),
			z0: Math.min(...zs),
			z1: Math.max(...zs)
		};
	};
	const doors = holes.filter((h) => h.door).map((h) => ({
		...h,
		y0: -1,
		y1: 2
	}));
	return [...cut(-span, span, 0, 1, doors).filter((r) => r.y0 < .5).map((r) => toFloor(r.u0, r.u1, half - T, half)), ...leaves.map((l) => toFloor(l.u0, l.u1, l.w0, l.w1))];
}
/**
* The container itself, before it is fitted out: its walls with their openings (`front` along +z and `back` along −z,
* from −x to +x; `end` across −x, from −z to +z), its frame, floor, roof and ceiling lights, the cargo doors swung
* back and the step at the open end, its name stencilled on both flanks at `labelX`.
* @param {{ name: string, color: string, floor: THREE.Material, lining?: THREE.Material, front?: Hole[], back?: Hole[], end?: Hole[], label: string, labelX: number }} o
*/
function box({ name, color, floor, lining = m.lining(), front = [], back = [], end = [], label, labelX }) {
	const g = new three.Group();
	g.name = name;
	const skin = paint(color);
	/** @type {Rect[]} */
	const solids = [];
	const long = {
		half: W / 2,
		span: L / 2 - .15,
		inner: X1,
		skin,
		lining
	};
	solids.push(...wall(g, {
		...long,
		rot: 0,
		holes: front
	}));
	solids.push(...wall(g, {
		...long,
		rot: Math.PI,
		holes: back.map((h) => ({
			...h,
			u0: -h.u1,
			u1: -h.u0
		}))
	}));
	solids.push(...wall(g, {
		rot: -Math.PI / 2,
		half: L / 2,
		span: W / 2 - .15,
		inner: Z1,
		holes: end,
		skin,
		lining
	}));
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
		part(g, .15, H, .15, skin, sx * (L / 2 - .075), H / 2, sz * (W / 2 - .075));
		for (const y of [.059, H - .059]) part(g, .178, .118, .162, m.casting(), sx * (L / 2 - .089), y, sz * (W / 2 - .081));
		solids.push({
			x0: sx * (L / 2 - .075) - .075,
			x1: sx * (L / 2 - .075) + .075,
			z0: sz * (W / 2 - .075) - .075,
			z1: sz * (W / 2 - .075) + .075
		});
	}
	for (const sz of [-1, 1]) {
		part(g, L - .3, .16, .06, skin, 0, .08, sz * (W / 2 - .03));
		part(g, L - .3, .1, .06, skin, 0, H - .05, sz * (W / 2 - .03));
	}
	part(g, .06, .16, W - .3, skin, -L / 2 + .03, .08, 0);
	part(g, .06, .1, W - .3, skin, -L / 2 + .03, H - .05, 0);
	part(g, .08, FLOOR, W - .3, m.casting(), L / 2 - .04, FLOOR / 2, 0);
	part(g, .1, .2, W - .3, skin, L / 2 - .05, H - .1, 0);
	part(g, X1 - X0 + .02, .03, Z1 - Z0 + .02, floor, 0, .135, 0);
	part(g, L - .12, .12, W - .12, m.frame(), 0, .12 / 2, 0, false);
	const roof = new three.Group();
	roof.name = "roof";
	g.add(roof);
	part(roof, L, .04, W, skin, 0, H - .02, 0);
	part(roof, X1 - X0, .02, Z1 - Z0, lining, 0, 2.71, 0);
	/** @type {[number, number, number][]} */
	const lamps = [];
	for (const x of [
		-4.8,
		-2.4,
		0,
		2.4,
		4.8
	]) {
		unlit(part(roof, 1.2, .025, .07, m.led(), x, 2.6875, 0));
		lamps.push([
			x,
			2.5500000000000003,
			0
		]);
	}
	for (const sz of [-1, 1]) {
		const z = sz * (W / 2 + .04);
		part(g, 1.17, H - .24, .04, skin, L / 2 - .62, (H - .24) / 2 + .12, z);
		for (let i = 0; i < 4; i++) part(g, .12, H - .5, .03, skin, L / 2 - 1.08 + i * .3, H / 2, z + sz * .03);
		for (const x of [L / 2 - .35, L / 2 - .85]) {
			bar(g, v3(x, .14, z + sz * .07), v3(x, H - .14, z + sz * .07), .016, m.galv());
			bar(g, v3(x, 1.2, z + sz * .07), v3(x + .24, 1.2, z + sz * .09), .012, m.galv());
		}
		solids.push({
			x0: L / 2 - 1.22,
			x1: L / 2,
			z0: Math.min(z, z + sz * .1),
			z1: Math.max(z, z + sz * .1)
		});
	}
	part(g, .45, .075, 1.6, m.galv(), L / 2 + .24, .0375, 0);
	const word = new three.MeshStandardMaterial({
		map: stencil(label),
		transparent: true,
		roughness: .6,
		depthWrite: false
	});
	unlit(sheet(g, 2.4, .6, word, labelX, 2.3, W / 2 + .002));
	unlit(sheet(g, 2.4, .6, word, -labelX, 2.3, -W / 2 - .002, Math.PI));
	return {
		g,
		roof,
		solids,
		lamps,
		skin
	};
}
/**
* How to walk a container and the ground round it: a step is refused into anything in the way (padded by a body's
* width), or deeper into what it already stands in; inside the floor is 15 cm up, on the step 7.5 cm.
* @param {Rect[]} solids @param {[number, number, number][]} lamps @returns {Walk}
*/
function walkway(solids, lamps) {
	/** how deep x, z is in r (padded), or ≤ 0 outside it @param {Rect} r @param {number} x @param {number} z */
	const depth = (r, x, z) => Math.min(x - r.x0 + PAD, r.x1 + PAD - x, z - r.z0 + PAD, r.z1 + PAD - z);
	return {
		x: L / 2 + 2.4,
		z: .2,
		yaw: Math.PI / 2,
		canStand(x, z, _here, _ground, from) {
			for (const r of solids) {
				const d = depth(r, x, z);
				if (d <= 0) continue;
				const before = depth(r, from.x, from.z);
				if (before > 0 && d < before) continue;
				return false;
			}
			return true;
		},
		floorAt(x, z) {
			if (Math.abs(x) < L / 2 && Math.abs(z) < W / 2) return FLOOR;
			if (x >= L / 2 && x < L / 2 + .47 && Math.abs(z) < .8) return .075;
			return 0;
		},
		lamps
	};
}
/**
* The fit-out: things put on the floor (or on the ground outside), each turned so, its footprint in the way.
* @param {THREE.Group} g @param {Rect[]} solids
*/
function fitter(g, solids) {
	return {
		/**
		* Put `o` with its middle at x, z (on the floor inside, unless `y`), turned `ry`; `w` × `d` (along x and z before
		* turning) is in the way.
		* @template {THREE.Object3D} O
		* @param {O} o @param {number} x @param {number} z
		* @param {{ ry?: number, w?: number, d?: number, y?: number }} [opts]
		* @returns {O}
		*/
		put(o, x, z, { ry = 0, w = 0, d = 0, y } = {}) {
			o.position.set(x, y ?? (Math.abs(x) < L / 2 && Math.abs(z) < W / 2 ? FLOOR : 0), z);
			o.rotation.y = ry;
			g.add(o);
			if (w && d) {
				const turned = Math.abs(Math.sin(ry)) > .7;
				const hw = (turned ? d : w) / 2, hd = (turned ? w : d) / 2;
				solids.push({
					x0: x - hw,
					x1: x + hw,
					z0: z - hd,
					z1: z + hd
				});
			}
			return o;
		},
		/** @param {number} x0 @param {number} x1 @param {number} z0 @param {number} z1 */
		block(x0, x1, z0, z1) {
			solids.push({
				x0,
				x1,
				z0,
				z1
			});
		}
	};
}
/** against the back wall, facing in: z of a thing `d` deep */
/** @param {number} d */
const atBack = (d) => Z0 + d / 2;
/** against the front wall, facing in (turned π) */
/** @param {number} d */
const atFront = (d) => Z1 - d / 2;
/** A wire shelving rack w × d × h, `levels` shelves; its shelves' heights in userData.shelves. */
/** @param {number} w @param {number} d @param {number} h @param {number} levels @param {THREE.Material} [mat] */
function rack(w, d, h, levels, mat = m.chrome()) {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * (w / 2 - .015), 0, sz * (d / 2 - .015)), v3(sx * (w / 2 - .015), h, sz * (d / 2 - .015)), .013, mat);
	/** @type {number[]} */
	const shelves = [];
	for (let i = 0; i < levels; i++) {
		const y = .15 + i * (h - .2) / (levels - 1);
		part(g, w, .02, d, mat, 0, y, 0);
		shelves.push(y + .01);
	}
	g.userData.shelves = shelves;
	return g;
}
/** A fire extinguisher on its bracket, 6 kg, its back at z 0, its foot at y 0. */
function extinguisher() {
	const g = new three.Group();
	drum(g, .08, .5, m.red(), 0, 0, .09);
	drum(g, .03, .06, m.black(), 0, .5, .09);
	bar(g, v3(0, .56, .09), v3(.12, .5, .12), .008, m.black());
	part(g, .1, .05, .02, m.black(), 0, .35, .01);
	return g;
}
/** A workbench, w long, 0.75 deep, a beech top at 0.9 m, drawers at one end, a vice at the other. */
/** @param {number} w */
function workbench(w) {
	const g = new three.Group();
	const d = .75;
	part(g, w, .06, d, m.beech(), 0, .87, 0);
	for (let i = 0; i <= Math.round(w / 1.3); i++) {
		const x = -w / 2 + .04 + i * (w - .08) / Math.round(w / 1.3);
		for (const sz of [-1, 1]) part(g, .05, .84, .05, m.blue(), x, .42, sz * (d / 2 - .05));
	}
	part(g, w - .1, .02, .65, m.osb(), 0, .15, 0);
	part(g, .55, .62, .69, m.blue(), w / 2 - .35, .53, 0);
	for (let i = 0; i < 4; i++) {
		part(g, .5, .13, .012, m.grey(), w / 2 - .35, .3 + i * .15, d / 2 - .02);
		part(g, .14, .015, .02, m.chrome(), w / 2 - .35, .33 + i * .15, d / 2 - .005);
	}
	const vx = -w / 2 + .3;
	part(g, .2, .12, .22, m.blue(), vx, .96, d / 2 - .12);
	part(g, .2, .1, .05, m.graphite(), vx, .98, .395);
	bar(g, v3(vx, .96, .415), v3(vx, .96, .495), .012, m.chrome());
	bar(g, v3(vx - .12, .96, .495), v3(vx + .12, .96, .495), .008, m.chrome());
	part(g, .25, .06, .07, m.blue(), .2, .93, .1);
	part(g, .3, .008, .04, m.chrome(), -.2, .904, .05);
	part(g, .6, .045, .145, m.pine(), -.6, .922, -.1);
	g.add(cordlessDrill(.6, .9, .05));
	return g;
}
/** A cordless drill lying at x, y, z. */
/** @param {number} x @param {number} y @param {number} z */
function cordlessDrill(x, y, z) {
	const g = new three.Group();
	part(g, .2, .07, .06, m.tool(), .02, .18, 0);
	part(g, .05, .14, .05, m.black(), .06, .08, 0);
	part(g, .1, .06, .08, m.black(), .06, .02, 0);
	bar(g, v3(-.08, .18, 0), v3(-.16, .18, 0), .01, m.chrome());
	g.position.set(x, y, z);
	g.rotation.z = Math.PI / 2;
	g.position.y = y + .035;
	return g;
}
/** A pegboard w × h, its back at z 0, hung with the hand tools a crew builds with. */
/** @param {number} w @param {number} h */
function pegboard(w, h) {
	const g = new three.Group();
	const holes = pegHoles().clone();
	holes.repeat.set(w / .4, h / .4);
	holes.needsUpdate = true;
	part(g, w, h, .012, new three.MeshStandardMaterial({
		map: holes,
		roughness: .8
	}), 0, h / 2, .02);
	const r = rng(7);
	const z = .04;
	let x = -w / 2 + .12;
	/** @param {number} hx @param {number} hy @param {THREE.Material} handle @param {number} len */
	const hammer = (hx, hy, handle, len) => {
		bar(g, v3(hx, hy - len, z), v3(hx, hy, z), .014, handle);
		part(g, .13, .035, .035, m.graphite(), hx, hy, z);
	};
	while (x < w / 2 - .2) {
		const k = Math.floor(r() * 7);
		const top = h - .15;
		if (k === 0) {
			hammer(x, top - .05, m.pineDark(), .32);
			hammer(x + .14, top - .05, m.red(), .28);
			x += .3;
		} else if (k === 1) {
			part(g, .5, .11, .004, m.chrome(), x + .25, top - .1, z);
			part(g, .12, .13, .03, m.red(), x - .02, top - .08, z);
			x += .6;
		} else if (k === 2) {
			for (let i = 0; i < 7; i++) part(g, .025, .24 - i * .02, .008, m.chrome(), x + i * .04, top - .12 - i * .01, z);
			x += .34;
		} else if (k === 3) {
			for (let i = 0; i < 6; i++) {
				const hx = x + i * .04;
				bar(g, v3(hx, top - .28, z), v3(hx, top - .14, z), .004, m.chrome());
				bar(g, v3(hx, top - .14, z), v3(hx, top - .04, z), .013, i % 2 ? m.red() : m.tool());
			}
			x += .3;
		} else if (k === 4) {
			part(g, .6, .06, .03, m.yellow(), x + .3, top - .03, z);
			drum(g, .04, .03, m.tool(), x + .1, top - .2, z).rotation.x = Math.PI / 2;
			part(g, .3, .03, .006, m.chrome(), x + .4, top - .2, z);
			x += .7;
		} else if (k === 5) {
			for (let i = 0; i < 4; i++) {
				const cx = x + i * .07;
				part(g, .015, .4, .015, m.chrome(), cx, top - .22, z);
				part(g, .06, .02, .02, m.red(), cx + .03, top - .04, z);
				part(g, .06, .025, .02, m.red(), cx + .03, top - .3, z);
			}
			x += .36;
		} else {
			for (let i = 0; i < 4; i++) {
				bar(g, v3(x + i * .05, top - .24, z), v3(x + i * .05 - .015, top - .06, z), .008, m.red());
				bar(g, v3(x + i * .05 + .02, top - .24, z), v3(x + i * .05 + .035, top - .06, z), .008, m.red());
			}
			for (let i = 0; i < 4; i++) {
				const cx = x + .25 + i * .045;
				bar(g, v3(cx, top - .3, z), v3(cx, top - .18, z), .005 + i * .002, m.chrome());
				bar(g, v3(cx, top - .18, z), v3(cx, top - .06, z), .014, m.pineDark());
			}
			x += .48;
		}
		x += .08;
	}
	part(g, w, .025, .25, m.osb(), 0, h + .02, .125);
	return g;
}
/** A cantilever timber rack on the wall, w long: posts, arms at four heights, boards, beams and OSB sheets on them. */
/** @param {number} w */
function timberRack(w) {
	const g = new three.Group();
	const posts = Math.max(2, Math.round(w / 1.3) + 1);
	const levels = [
		.35,
		.95,
		1.55,
		2.15
	];
	for (let i = 0; i < posts; i++) {
		const x = -w / 2 + .05 + i * (w - .1) / (posts - 1);
		part(g, .06, 2.4, .08, m.frame(), x, 1.2, .04);
		for (const y of levels) part(g, .05, .05, .55, m.frame(), x, y, .32);
	}
	const r = rng(3);
	levels.forEach((y, li) => {
		if (li === 0) {
			for (let k = 0; k < 6; k++) part(g, w - .2, .018, .5, m.osb(), 0, y + .035 + k * .019, .33);
			return;
		}
		for (let s = 0; s < 3; s++) for (let k = 0; k < (li === 3 ? 2 : 3); k++) {
			const tw = li === 3 ? .1 : .145, th = li === 3 ? .1 : .045;
			part(g, w - .3 - r() * .6, th, tw, r() < .5 ? m.pine() : m.pineDark(), r() * .2, y + .025 + th / 2 + k * th, .12 + s * (tw + .01));
		}
	});
	return g;
}
/** A pillar drill on its stand, 1.6 m. */
function drillPress() {
	const g = new three.Group();
	part(g, .4, .05, .5, m.graphite(), 0, .025, 0);
	bar(g, v3(0, .05, -.15), v3(0, 1.55, -.15), .04, m.chrome());
	part(g, .3, .03, .3, m.graphite(), 0, .8, .05);
	part(g, .24, .24, .5, m.green(), 0, 1.45, 0);
	drum(g, .08, .2, m.green(), 0, 1.57, -.2);
	bar(g, v3(0, 1.33, .12), v3(0, 1.15, .12), .012, m.chrome());
	for (let i = 0; i < 3; i++) {
		const a = i * Math.PI * 2 / 3;
		bar(g, v3(.14, 1.42, .05), v3(.14, 1.42 + Math.cos(a) * .2, .05 + Math.sin(a) * .2), .008, m.chrome());
	}
	return g;
}
/** A bench grinder on its pedestal: two stones, their guards, 1.15 m. */
function benchGrinder() {
	const g = new three.Group();
	part(g, .35, .03, .35, m.graphite(), 0, .015, 0);
	bar(g, v3(0, .03, 0), v3(0, .85, 0), .04, m.graphite());
	const motor = new three.Mesh(new three.CylinderGeometry(.08, .08, .22, 16), m.green());
	motor.rotation.z = Math.PI / 2;
	motor.position.set(0, .95, 0);
	g.add(motor);
	for (const sx of [-1, 1]) {
		const stone = new three.Mesh(new three.CylinderGeometry(.075, .075, .025, 20), m.grey());
		stone.rotation.z = Math.PI / 2;
		stone.position.set(sx * .16, .95, 0);
		g.add(stone);
		const guard = new three.Mesh(new three.CylinderGeometry(.09, .09, .05, 20, 1, false, Math.PI, Math.PI), m.green());
		guard.rotation.z = Math.PI / 2;
		guard.position.set(sx * .16, .95, 0);
		g.add(guard);
	}
	return g;
}
/** A mitre saw on its station: a table w long, the saw in the middle, wings for long boards. */
/** @param {number} w */
function mitreStation(w) {
	const g = new three.Group();
	part(g, w, .04, .6, m.osb(), 0, .88, 0);
	for (const sx of [-1, 1]) part(g, .05, .86, .5, m.frame(), sx * (w / 2 - .1), .43, 0);
	part(g, w - .1, .02, .5, m.osb(), 0, .2, 0);
	const saw = new three.Group();
	saw.position.set(0, .9, 0);
	g.add(saw);
	drum(saw, .22, .04, m.graphite(), 0, 0, .02, 24);
	part(saw, .5, .05, .12, m.graphite(), 0, .05, -.08);
	part(saw, .08, .3, .08, m.teal(), 0, .2, -.2);
	bar(saw, v3(0, .33, -.2), v3(0, .35, .12), .03, m.teal());
	const guard = new three.Mesh(new three.CylinderGeometry(.16, .16, .05, 24, 1, false, 0, Math.PI), m.teal());
	guard.rotation.z = Math.PI / 2;
	guard.rotation.y = Math.PI / 2;
	guard.position.set(0, .25, .06);
	saw.add(guard);
	part(saw, .12, .08, .06, m.black(), .06, .38, .12);
	return g;
}
/** A rolling tool chest, red, 0.7 × 0.46 × 1.0 m, a top box over it. */
function toolChest() {
	const g = new three.Group();
	part(g, .7, .85, .46, m.red(), 0, .5, 0);
	part(g, .68, .32, .42, m.red(), 0, 1.09, -.02);
	for (let i = 0; i < 7; i++) {
		const y = .15 + i * .12;
		part(g, .66, .1, .01, m.red(), 0, y, .235);
		part(g, .4, .012, .02, m.chrome(), 0, y + .04, .245);
	}
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) drum(g, .04, .03, m.rubber(), sx * .3, .01, sz * .18, 10);
	return g;
}
/** A MIG welder on its trolley with a gas bottle, its torch coiled on the hook. */
function welder() {
	const g = new three.Group();
	part(g, .6, .04, .42, m.graphite(), 0, .25, 0);
	for (const sx of [-1, 1]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.12, .12, .05, 16), m.rubber());
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(0, .12, sx * .24);
		g.add(wheel);
	}
	part(g, .5, .42, .32, m.blue(), .03, .48, 0);
	unlit(part(g, .1, .05, .004, m.ledGreen(), .17, .62, .162));
	drum(g, .11, 1.05, m.grey(), -.24, .27, 0);
	drum(g, .112, .15, m.green(), -.24, 1.2, 0);
	drum(g, .03, .08, m.chrome(), -.24, 1.35, 0, 10);
	const coil = new three.Mesh(new three.TorusGeometry(.14, .015, 8, 24), m.black());
	coil.position.set(.3, .75, .05);
	coil.rotation.y = Math.PI / 2;
	g.add(coil);
	return g;
}
/** An air compressor: a red tank on wheels, the pump and motor on it, a gauge. */
function compressor() {
	const g = new three.Group();
	const tank = new three.Mesh(new three.CylinderGeometry(.18, .18, .75, 20), m.red());
	tank.rotation.z = Math.PI / 2;
	tank.position.set(0, .28, 0);
	tank.castShadow = true;
	g.add(tank);
	drum(g, .1, .22, m.graphite(), -.15, .45, 0);
	part(g, .22, .18, .2, m.graphite(), .15, .54, 0);
	drum(g, .035, .02, m.white(), .3, .5, .12).rotation.x = Math.PI / 2;
	for (const sz of [-1, 1]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.08, .08, .04, 14), m.rubber());
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set(.3, .08, sz * .2);
		g.add(wheel);
	}
	bar(g, v3(-.38, .28, -.15), v3(-.45, .75, -.15), .012, m.graphite());
	bar(g, v3(-.38, .28, .15), v3(-.45, .75, .15), .012, m.graphite());
	bar(g, v3(-.45, .75, -.15), v3(-.45, .75, .15), .012, m.graphite());
	return g;
}
/** A steel shelf of stacked cordless tool cases (drills, impact drivers, saws, grinders) and their chargers. */
/** @param {number} w */
function caseShelf(w) {
	const g = rack(w, .42, 2, 4, m.frame());
	const r = rng(11);
	for (const y of g.userData.shelves) {
		let x = -w / 2 + .03;
		while (x < w / 2 - .42) {
			const tall = r() < .5 ? .16 : .22;
			const c = r() < .6 ? m.tool() : r() < .5 ? m.teal() : m.graphite();
			for (let k = 0; k < (y > 1.6 ? 1 : 2); k++) soft(g, .39, tall - .01, .3, .02, c, x + .2, y + tall / 2 + k * tall, 0);
			x += .42;
		}
	}
	return g;
}
/** A ladder, w long, hung flat on hooks; its back at z 0. */
/** @param {number} w */
function hungLadder(w) {
	const g = new three.Group();
	for (const y of [0, .42]) part(g, w, .07, .03, m.galv(), 0, y, .06);
	for (let x = -w / 2 + .15; x < w / 2; x += .28) bar(g, v3(x, 0, .06), v3(x, .42, .06), .014, m.galv());
	for (const x of [-w / 3, w / 3]) part(g, .03, .08, .1, m.frame(), x, -.06, .05);
	return g;
}
/** Long-handled tools in a wall rack: spades, a shovel, a pickaxe, a rake, a sledgehammer, a crowbar. */
function toolRack() {
	const g = new three.Group();
	part(g, 1.4, .06, .12, m.frame(), 0, 1.45, .06);
	[
		[m.chrome(), "spade"],
		[m.chrome(), "shovel"],
		[m.graphite(), "pick"],
		[m.green(), "rake"],
		[m.graphite(), "sledge"],
		[m.red(), "bar"]
	].forEach(([mat, kind], i) => {
		const x = -.6 + i * .24;
		if (kind === "bar") return bar(g, v3(x, .05, .08), v3(x, 1.5, .08), .014, mat);
		bar(g, v3(x, .3, .12), v3(x, 1.55, .12), .016, m.pineDark());
		if (kind === "spade" || kind === "shovel") part(g, kind === "spade" ? .18 : .25, .3, .012, mat, x, .18, .12);
		if (kind === "pick") part(g, .6, .04, .04, mat, x, .32, .12);
		if (kind === "rake") part(g, .35, .04, .06, mat, x, .3, .12);
		if (kind === "sledge") part(g, .08, .18, .08, mat, x, .32, .12);
	});
	return g;
}
/** A wheelbarrow, 1.45 m long, its wheel at +x. */
function wheelbarrow() {
	const g = new three.Group();
	part(g, .75, .04, .55, m.green(), .05, .38, 0);
	for (const sz of [-1, 1]) {
		const side = part(g, .75, .26, .03, m.green(), .05, .5, sz * .32);
		side.rotation.x = sz * .3;
		bar(g, v3(.55, .22, sz * .12), v3(-.75, .6, sz * .25), .015, m.graphite());
		bar(g, v3(-.25, .37, sz * .2), v3(-.3, 0, sz * .22), .012, m.graphite());
	}
	for (const sx of [-1, 1]) part(g, .03, .26, .6, m.green(), .05 + sx * .38, .5, 0).rotation.z = -sx * .4;
	const wheel = new three.Mesh(new three.TorusGeometry(.16, .05, 10, 20), m.rubber());
	wheel.position.set(.58, .2, 0);
	g.add(wheel);
	return g;
}
/** A site table saw on its stand, 0.75 × 0.65 m, its blade up through the top, the red stop button. */
function tableSaw() {
	const g = new three.Group();
	part(g, .75, .04, .65, m.grey(), 0, .9, 0);
	part(g, .6, .28, .5, m.teal(), 0, .74, 0);
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * .3, 0, sz * .25), v3(sx * .25, .6, sz * .2), .015, m.graphite());
	const blade = new three.Mesh(new three.CylinderGeometry(.12, .12, .004, 32, 1, false, 0, Math.PI), m.chrome());
	blade.rotation.z = Math.PI / 2;
	blade.rotation.y = Math.PI / 2;
	blade.position.set(0, .92, 0);
	g.add(blade);
	part(g, .04, .06, .65, m.chrome(), .2, .95, 0);
	part(g, .04, .04, .02, m.red(), -.25, .8, .26);
	return g;
}
/** A concrete mixer: its orange drum tilted on a frame, two wheels, the motor box. */
function concreteMixer() {
	const g = new three.Group();
	for (const sz of [-1, 1]) {
		bar(g, v3(-.45, 0, sz * .3), v3(0, .75, sz * .3), .025, m.frame());
		bar(g, v3(.45, .18, sz * .3), v3(0, .75, sz * .3), .025, m.frame());
		const wheel = new three.Mesh(new three.CylinderGeometry(.18, .18, .06, 16), m.rubber());
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set(.45, .18, sz * .38);
		g.add(wheel);
	}
	const pts = [
		v3(0, -.35, 0),
		v3(.3, -.3, 0),
		v3(.38, -.05, 0),
		v3(.36, .1, 0),
		v3(.18, .4, 0),
		v3(.17, .42, 0)
	].map((p) => new three.Vector2(p.x, p.y));
	const drumMesh = new three.Mesh(new three.LatheGeometry(pts, 24), paint("#e0661f"));
	drumMesh.material.side = three.DoubleSide;
	drumMesh.position.set(0, 1.05, 0);
	drumMesh.rotation.z = .6;
	drumMesh.castShadow = true;
	g.add(drumMesh);
	part(g, .3, .25, .25, m.graphite(), -.2, .7, 0);
	return g;
}
/** A pair of sawhorses and a board across them. */
function sawhorses() {
	const g = new three.Group();
	for (const x of [-.6, .6]) {
		part(g, .08, .06, .9, m.pine(), x, .72, 0);
		for (const sz of [-1, 1]) for (const sx of [-1, 1]) bar(g, v3(x, .7, sz * .38), v3(x + sx * .18, 0, sz * .42), .02, m.pine());
	}
	part(g, 2, .045, .2, m.pineDark(), 0, .775, .1);
	return g;
}
/** Finish a container: what walks it, and the handles a world (or the viewer) needs. */
/** @param {ReturnType<typeof box>} b */
function done(b) {
	b.g.userData.roof = b.roof;
	b.g.userData.walk = walkway(b.solids, b.lamps);
	return b.g;
}
/**
* The workshop container: what a crew needs to build a small settlement. On the back wall the timber rack
* (boards, beams, OSB) and a 4 m bench under a pegboard of hand tools, the pillar drill and the grinder; on the front,
* under a band of windows, the mitre saw on its station, the tool chest, the welder and the compressor, cordless tools
* in their cases, the spades and a ladder, a wheelbarrow; the table saw by the door; a concrete mixer and sawhorses
* outside.
*/
function workshopContainer() {
	const b = box({
		name: "workshop container",
		color: "#3f6f93",
		floor: floorMaterial("#a98757"),
		label: "WORKSHOP",
		labelX: 3,
		front: [{
			u0: -2.9,
			u1: 1.9,
			y0: 1.35,
			y1: 2.15,
			glass: "clear"
		}]
	});
	const { g, solids } = b;
	const f = fitter(g, solids);
	f.put(timberRack(3.9), -3.95, Z0, { y: FLOOR });
	f.block(-5.9, -2, Z0, Z0 + .6);
	f.put(workbench(4), .1, atBack(.75), {
		w: 4,
		d: .75
	});
	f.put(pegboard(4, 1.25), .1, Z0, { y: 1.15 });
	f.put(drillPress(), 2.6, Z0 + .32, {
		w: .45,
		d: .55
	});
	f.put(benchGrinder(), 3.4, Z0 + .3, {
		w: .45,
		d: .4
	});
	f.put(caseShelf(1.3), 4.6, atBack(.42), {
		w: 1.3,
		d: .42
	});
	f.put(extinguisher(), 5.6, Z0, { y: 1.05 });
	f.put(hungLadder(2.6), -4.5, Z1, {
		ry: Math.PI,
		y: 1.95
	});
	f.put(toolRack(), -5.1, Z1, { ry: Math.PI });
	f.block(-5.85, -4.35, Z1 - .2, Z1);
	f.put(wheelbarrow(), -3.55, Z1 - .38, {
		ry: Math.PI,
		w: 1.45,
		d: .65
	});
	f.put(mitreStation(2.2), -1.5, atFront(.6), {
		ry: Math.PI,
		w: 2.2,
		d: .6
	});
	f.put(toolChest(), .15, atFront(.46), {
		ry: Math.PI,
		w: .7,
		d: .46
	});
	f.put(welder(), 1, Z1 - .28, {
		ry: Math.PI,
		w: .62,
		d: .5
	});
	f.put(compressor(), 2.05, Z1 - .3, {
		ry: Math.PI,
		w: .95,
		d: .48
	});
	f.put(tableSaw(), 4.55, Z1 - .4, {
		ry: Math.PI / 2,
		w: .75,
		d: .65
	});
	const reel = new three.Mesh(new three.TorusGeometry(.13, .06, 10, 20), m.red());
	reel.position.set(3.4, .35, Z1 - .2);
	g.add(reel);
	part(g, .3, .3, .12, std("#2e9e4f", .5)(), 5.55, 1.65, Z1 - .06);
	part(g, .12, .03, .005, m.white(), 5.55, 1.65, Z1 - .12);
	part(g, .03, .12, .005, m.white(), 5.55, 1.65, Z1 - .12);
	f.put(concreteMixer(), L / 2 + 1, W / 2 + 1.4, {
		ry: .5,
		w: 1.1,
		d: .9
	});
	f.put(sawhorses(), L / 2 - 2, W / 2 + 1.5, {
		w: 2,
		d: .95
	});
	return done(b);
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
const CONTAINER_LIST = [{
	id: "container-workshop",
	label: "Workshop container",
	note: "the workshop: a 4 m bench under a pegboard of hand tools, timber rack, pillar drill, grinder, mitre saw, table saw, welder, compressor, cordless tools in their cases, spades, ladder, wheelbarrow; a mixer outside. Walk in",
	usedIn: "Sandbox 1",
	make: () => workshopContainer()
}];
/** @type {Model[]} */
const CONTAINERS = /* @__PURE__ */ (() => versioned(CONTAINER_LIST, "make", HISTORY))();
/** the wayside of MaiaCity V1: buildings on the dusty highway and at the village centre, and the places they make
*  together; and at its end the bell tent from its v2 (./tent.js), which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
const WAYSIDE_LIST = /* @__PURE__ */ (() => [])();
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