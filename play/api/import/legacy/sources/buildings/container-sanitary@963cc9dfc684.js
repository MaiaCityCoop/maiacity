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
//#region src/lib/models/bathroom.ts
const m$1 = /* @__PURE__ */ (() => ({
	porcelain: std("#f7f7f4", .22),
	chrome: std("#dadada", .15, { metalness: 1 }),
	white: std("#f4f4f1", .35)
}))();
/** A wall-hung WC: the bowl 36 × 54 cm, its seat at 42 cm, the white flush plate on the wall above it. */
function wallToilet() {
	const g = new three.Group();
	g.name = "wall-hung WC";
	const bowl = new three.Mesh(new three.SphereGeometry(1, 32, 16), m$1.porcelain());
	bowl.scale.set(.18, .16, .27);
	bowl.position.set(0, .3, .27);
	bowl.castShadow = true;
	g.add(bowl);
	const tank = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(.36, .2, .12, 3, .04), m$1.porcelain());
	tank.position.set(0, .32, .06);
	g.add(tank);
	const seat = new three.Mesh(new three.TorusGeometry(1, .12, 8, 32), m$1.porcelain());
	seat.scale.set(.17, .25, .18);
	seat.rotation.x = Math.PI / 2;
	seat.position.set(0, .42, .29);
	g.add(seat);
	part(g, .25, .16, .012, m$1.white(), 0, 1.02, .006, false);
	return g;
}
/** A wall-hung basin, `w` wide and 42 cm deep, its rim at 85 cm, a chrome spout from the wall above it. */
function washbasin({ w = .6 } = {}) {
	const g = new three.Group();
	g.name = "washbasin";
	const basin = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, .14, .42, 3, .02), m$1.porcelain());
	basin.position.set(0, .78, .21);
	basin.castShadow = true;
	g.add(basin);
	part(g, w - .08, .004, .32, std("#e8e8e4", .2)(), 0, .852, .22, false);
	bar(g, v3(0, 1, 0), v3(0, 1, .16), .012, m$1.chrome());
	const lever = new three.Mesh(new three.CylinderGeometry(.025, .025, .01, 16), m$1.chrome());
	lever.rotation.x = Math.PI / 2;
	lever.position.set(0, 1.1, .005);
	g.add(lever);
	return g;
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
/** A word on a panel: a cabinet's name, a warning. */
/** @param {string} text @param {string} bg @param {string} fg */
function plate(text, bg, fg) {
	return canvasTexture(`plate:${text}:${bg}`, 512, 128, (x) => {
		x.fillStyle = bg;
		x.fillRect(0, 0, 512, 128);
		x.fillStyle = fg;
		x.font = "bold 56px Arial, sans-serif";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText(text, 256, 66);
	});
}
/** Floor tiles 30 cm square, grey grout: the sanitary container's floor. */
function tiles() {
	return canvasTexture("container-tiles", 256, 256, (x, r) => {
		x.fillStyle = "#8f9192";
		x.fillRect(0, 0, 256, 256);
		for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
			const v = 196 + Math.floor(r() * 14);
			x.fillStyle = `rgb(${v},${v},${v - 4})`;
			x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
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
/** @param {string} text @param {string} bg @param {string} fg */
const plateMat = (text, bg, fg) => new three.MeshStandardMaterial({
	map: plate(text, bg, fg),
	roughness: .5
});
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
/**
* Fill a shelf from −w/2 to w/2 at y with goods of a kind: glass jars, tins, cardboard boxes, sacks, crates of
* vegetables, bottles, folded towels, detergent.
* @param {THREE.Group} g @param {number} w @param {number} d @param {number} y
* @param {'jars' | 'tins' | 'boxes' | 'sacks' | 'crates' | 'bottles' | 'towels' | 'pots'} kind @param {() => number} r
*/
function stock(g, w, d, y, kind, r) {
	let x = -w / 2 + .03;
	const jarTops = [
		m.red(),
		m.white(),
		m.green()
	];
	const fills = [
		"#d9a441",
		"#9b3b2a",
		"#e7dcc0",
		"#6b8f3a",
		"#c86d2a",
		"#f2e6c8",
		"#5a3a22"
	].map((c) => std(c, .4)());
	const veg = [
		"#b07a3c",
		"#d9c06a",
		"#9c2a2a",
		"#e08a2e",
		"#6c8f2a"
	].map((c) => std(c, .7)());
	while (x < w / 2 - .08) if (kind === "jars") {
		const rr = .045 + r() * .02, h = .12 + r() * .08;
		for (const z of [-d / 4, d / 4]) {
			drum(g, rr, h * .85, fills[Math.floor(r() * fills.length)], x + rr, y, z);
			unlit(drum(g, rr + .004, h, m.glass(), x + rr, y, z));
			drum(g, rr + .003, .02, jarTops[Math.floor(r() * 3)], x + rr, y + h, z);
		}
		x += rr * 2 + .02;
	} else if (kind === "tins") {
		for (const z of [
			-d / 3,
			0,
			d / 3
		]) for (let k = 0; k < 2; k++) {
			drum(g, .04, .11, m.steel(), x + .04, y + k * .11, z);
			drum(g, .041, .07, fills[Math.floor(r() * fills.length)], x + .04, y + k * .11 + .02, z);
		}
		x += .09;
	} else if (kind === "boxes") {
		const bw = .2 + r() * .2, bh = .15 + r() * .15;
		part(g, bw, bh, d * .85, m.cardboard(), x + bw / 2, y + bh / 2, 0);
		x += bw + .02;
	} else if (kind === "sacks") {
		soft(g, .32, .18, d * .85, .06, m.sack(), x + .16, y + .09, 0);
		soft(g, .3, .16, d * .8, .06, m.sack(), x + .16, y + .25, 0);
		x += .36;
	} else if (kind === "crates") {
		const cw = .4, ch = .24;
		part(g, cw, .02, d * .9, m.pine(), x + cw / 2, y + .01, 0);
		for (const sz of [-1, 1]) part(g, cw, ch, .015, m.pine(), x + cw / 2, y + ch / 2, sz * d * .9 / 2);
		for (const sx of [-1, 1]) part(g, .015, ch, d * .9, m.pine(), x + cw / 2 + sx * cw / 2, y + ch / 2, 0);
		const v = veg[Math.floor(r() * veg.length)];
		const ball = new three.SphereGeometry(.045, 8, 6);
		const n = 14;
		const heap = new three.InstancedMesh(ball, v, n);
		const mx = new three.Matrix4();
		for (let i = 0; i < n; i++) {
			mx.makeTranslation(x + .06 + i % 5 * .07, y + .07 + Math.floor(i / 10) * .06 + r() * .03, -d * .3 + Math.floor(i / 5) % 2 * d * .4 + r() * .06);
			heap.setMatrixAt(i, mx);
		}
		heap.castShadow = true;
		g.add(heap);
		x += .43000000000000005;
	} else if (kind === "bottles") {
		for (const z of [-d / 4, d / 4]) {
			drum(g, .04, .24, fills[Math.floor(r() * fills.length)], x + .04, y, z, 10);
			drum(g, .015, .06, m.black(), x + .04, y + .24, z, 8);
		}
		x += .095;
	} else if (kind === "towels") {
		const c = [
			m.white(),
			m.cream(),
			std("#8fb3c4", .95)()
		][Math.floor(r() * 3)];
		for (let k = 0; k < 4; k++) soft(g, .3, .05, d * .8, .02, c, x + .15, y + .025 + k * .052, 0);
		x += .34;
	} else {
		const rr = .1 + r() * .06;
		drum(g, rr, rr * 1.3, m.steel(), x + rr, y, 0, 20);
		x += rr * 2 + .03;
	}
}
/** A stainless worktable w × d, its top at h, an upstand at the back, a shelf under it. */
/** @param {number} w @param {number} d @param {{ h?: number, shelf?: boolean, upstand?: boolean }} [o] */
function steelTable(w, d, { h = .9, shelf = true, upstand = true } = {}) {
	const g = new three.Group();
	part(g, w, .04, d, m.steel(), 0, h - .02, 0);
	if (upstand) part(g, w, .1, .012, m.steel(), 0, h + .05, -d / 2 + .006);
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * (w / 2 - .04), 0, sz * (d / 2 - .04)), v3(sx * (w / 2 - .04), h - .04, sz * (d / 2 - .04)), .02, m.steel());
	if (shelf) part(g, w - .04, .02, d - .04, m.steel(), 0, .2, 0);
	return g;
}
/** A wall shelf of steel, w long, d deep, its top at y; its back at z 0. What stands on it goes in `userData.on`, at its middle. */
/** @param {number} w @param {number} d @param {number} y @param {THREE.Material} [mat] */
function wallShelf(w, d, y, mat = m.steel()) {
	const g = new three.Group();
	part(g, w, .025, d, mat, 0, y, d / 2);
	for (const x of [-w / 2 + .1, w / 2 - .1]) part(g, .02, .2, d * .9, m.frame(), x, y - .11, d * .45);
	const on = new three.Group();
	on.position.z = d / 2;
	g.add(on);
	g.userData.on = on;
	return g;
}
/** A front-loading washing machine (or a tumble dryer), 60 × 60 × 85 cm, its round door. */
/** @param {boolean} dryer */
function frontLoader(dryer) {
	const g = new three.Group();
	part(g, .6, .85, .6, m.white(), 0, .425, 0);
	part(g, .6, .1, .012, m.grey(), 0, .78, .306);
	const ring = new three.Mesh(new three.TorusGeometry(.17, .03, 10, 32), m.grey());
	ring.position.set(0, .42, .31);
	g.add(ring);
	const door = new three.Mesh(new three.CircleGeometry(.15, 32), dryer ? m.white() : m.black());
	door.position.set(0, .42, .315);
	g.add(door);
	const knob = new three.Mesh(new three.CylinderGeometry(.025, .025, .02, 16), m.chrome());
	knob.rotation.x = Math.PI / 2;
	knob.position.set(.18, .78, .32);
	g.add(knob);
	unlit(part(g, .08, .03, .004, m.ledBlue(), 0, .78, .314));
	return g;
}
/** A dryer stacked on a washer in its frame: 60 × 62 × 175 cm. */
function laundryTower() {
	const g = new three.Group();
	g.add(frontLoader(false));
	const top = frontLoader(true);
	top.position.y = .88;
	g.add(top);
	part(g, .62, .03, .62, m.grey(), 0, .865, 0);
	return g;
}
/** A utility sink: a deep steel tub on legs, a tap. */
function utilitySink() {
	const g = steelTable(.6, .55, {
		h: .9,
		shelf: true,
		upstand: true
	});
	part(g, .5, .3, .45, m.steelDark(), 0, .75, .02);
	bar(g, v3(0, .95, -.24), v3(0, 1.25, -.24), .015, m.chrome());
	bar(g, v3(0, 1.25, -.24), v3(0, 1.22, -.05), .012, m.chrome());
	return g;
}
/** A heat-pump water heater: 300 litres, 0.65 m across, 1.9 m high, its fan unit on top. */
function heatPumpBoiler() {
	const g = new three.Group();
	drum(g, .32, 1.55, m.white(), 0, 0, 0, 32);
	drum(g, .3, .35, m.grey(), 0, 1.55, 0, 32);
	unlit(part(g, .12, .06, .004, m.ledBlue(), 0, 1.3, .322));
	bar(g, v3(-.1, .4, -.3), v3(-.1, 2.5000000000000004, -.3), .015, m.red());
	bar(g, v3(.1, .2, -.3), v3(.1, 2.5000000000000004, -.3), .015, m.blue());
	return g;
}
/** A shower: a white tray 0.9 m square, a rain head from the wall, a hand shower on its rail, the mixer. Its back at z 0. */
function showerSet() {
	const g = new three.Group();
	part(g, .9, .04, .9, m.white(), 0, .02, .45);
	part(g, .6, .006, .05, m.graphite(), 0, .043, .8);
	bar(g, v3(0, 2.05, .02), v3(0, 2.05, .35), .012, m.chrome());
	drum(g, .13, .012, m.chrome(), 0, 2.03, .35, 32);
	bar(g, v3(.3, .9, .03), v3(.3, 1.9, .03), .01, m.chrome());
	part(g, .04, .2, .04, m.chrome(), .3, 1.5, .06);
	part(g, .2, .06, .06, m.chrome(), 0, 1.05, .03);
	return g;
}
/** A dryer for hands on the wall, its back at z 0. */
function handDryer() {
	const g = new three.Group();
	soft(g, .3, .6, .2, .05, m.steel(), 0, 0, .1);
	part(g, .22, .03, .08, m.graphite(), 0, -.18, .18);
	return g;
}
/** An IBC tank: 1000 litres of rainwater in a white bottle inside a galvanised cage, on its pallet. */
function ibcTank() {
	const g = new three.Group();
	part(g, 1.2, .14, 1, m.galv(), 0, .07, 0);
	soft(g, 1.12, .95, .94, .06, std("#f2f0e6", .4, {
		transparent: true,
		opacity: .92
	})(), 0, .62, 0);
	for (let i = 0; i <= 4; i++) {
		const x = -.58 + i * .29;
		for (const sz of [-1, 1]) bar(g, v3(x, .14, sz * .5), v3(x, 1.12, sz * .5), .01, m.galv());
	}
	for (const y of [
		.4,
		.75,
		1.12
	]) for (const sz of [-1, 1]) bar(g, v3(-.6, y, sz * .5), v3(.6, y, sz * .5), .01, m.galv());
	drum(g, .08, .04, m.graphite(), 0, 1.1, 0);
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
* The sanitary container. From the open end: the laundry — two washing machines with dryers stacked on
* them, a utility sink, a folding table, the heat-pump water heater — then three washbasins under their mirrors, a bench
* and a hand dryer; then a corridor along the front past three toilets and three showers in their cubicles, frosted
* windows high over it and a door out at its end. Rainwater waits outside in a tank.
*/
function sanitaryContainer() {
	const b = box({
		name: "sanitary container",
		color: "#d8d2c4",
		floor: floorMaterial("#ffffff", tiles(), 1.2),
		lining: m.white(),
		label: "SANITARY",
		labelX: 3.6,
		front: [
			{
				u0: -5.85,
				u1: -4.95,
				y0: FLOOR,
				y1: 2.2,
				door: true
			},
			...[
				-4.3,
				-2.8,
				-1.3
			].map((x) => ({
				u0: x,
				u1: x + .8,
				y0: 1.9,
				y1: 2.45,
				glass: "frosted"
			})),
			{
				u0: .9,
				u1: 2.2,
				y0: 1.75,
				y1: 2.45,
				glass: "frosted"
			}
		]
	});
	const { g, solids } = b;
	const f = fitter(g, solids);
	const r = rng(5);
	unlit(sheet(g, .5, .18, plateMat("WC · SHOWERS", "#1f6f8b", "#ffffff"), -5.4, 2.45, W / 2 + .003));
	for (const x of [3, 3.65]) f.put(laundryTower(), x, atBack(.62), {
		w: .62,
		d: .62
	});
	f.put(utilitySink(), 4.35, atBack(.55), {
		w: .6,
		d: .55
	});
	stock(f.put(wallShelf(2, .3, 2.15, m.white()), 3.65, Z0, { y: FLOOR }).userData.on, 1.9, .26, 2.17, "bottles", r);
	f.put(heatPumpBoiler(), 5.45, Z0 + .4, {
		w: .65,
		d: .65
	});
	const fold = f.put(steelTable(1.6, .6, { upstand: false }), 3.6, atFront(.6), {
		ry: Math.PI,
		w: 1.6,
		d: .6
	});
	stock(fold, 1, .5, .92, "towels", r);
	stock(fold, 1.4, .5, .2, "towels", r);
	const basket = f.put(new three.Group(), 5, Z1 - .3, {
		w: .5,
		d: .4
	});
	part(basket, .5, .3, .38, std("#5f8fb0", .6)(), 0, .15, 0);
	soft(basket, .46, .08, .34, .03, m.cream(), 0, .31, 0);
	for (const x of [
		.9,
		1.6,
		2.3
	]) {
		f.put(washbasin(), x, Z0, { y: FLOOR });
		f.block(x - .3, x + .3, Z0, Z0 + .42);
		unlit(part(g, .55, .7, .01, m.mirror(), x, 1.5999999999999999, Z0 + .006));
		drum(g, .03, .14, m.white(), x + .2, 1.01, Z0 + .06, 10);
	}
	f.put(handDryer(), 2.5, Z1, {
		ry: Math.PI,
		y: 1.45
	});
	const bench = f.put(new three.Group(), 1.35, atFront(.35), {
		ry: Math.PI,
		w: 1.2,
		d: .35
	});
	part(bench, 1.2, .04, .35, m.beech(), 0, .45, 0);
	for (const sx of [-1, 1]) part(bench, .04, .43, .3, m.chrome(), sx * .55, .215, 0);
	for (let i = 0; i < 4; i++) {
		const x = .85 + i * .32;
		bar(g, v3(x, 1.75, Z1), v3(x, 1.77, Z1 - .06), .008, m.chrome());
		if (i % 2 === 0) soft(g, .22, .45, .04, .02, i ? std("#8fb3c4", .95)() : m.cream(), x, 1.5, Z1 - .06);
	}
	const zc = .13;
	const hpl = std("#7fa597", .5)();
	const edges = [
		.45,
		-.6,
		-1.65,
		-2.7,
		-3.8,
		-4.9,
		X0
	];
	/** a partition panel from x0 to x1, z0 to z1, raised off the floor @param {number} x0 @param {number} x1 @param {number} z0 @param {number} z1 */
	const panel = (x0, x1, z0, z1) => {
		part(g, Math.max(.025, x1 - x0), 1.88, Math.max(.025, z1 - z0), hpl, (x0 + x1) / 2, 1.21, (z0 + z1) / 2);
		f.block(Math.min(x0, x1 - .025), Math.max(x1, x0 + .025), Math.min(z0, z1 - .025), Math.max(z1, z0 + .025));
	};
	for (let i = 0; i < edges.length - 1; i++) {
		const xr = edges[i], xl = edges[i + 1], shower = i >= 3;
		if (i === 0) panel(xr - .0125, xr + .0125, Z0, zc);
		if (i < edges.length - 2) panel(xl - .0125, xl + .0125, Z0, zc);
		const dw = .7, d0 = xr - .05 - dw;
		panel(xl, d0, .11750000000000001, .14250000000000002);
		panel(xr - .05, xr, .11750000000000001, .14250000000000002);
		const leaf = new three.Group();
		leaf.position.set(xr - .05, .27, zc);
		leaf.rotation.y = -Math.PI / 2 + .1;
		g.add(leaf);
		part(leaf, dw, 1.88, .025, hpl, -.7 / 2, 1.88 / 2, 0);
		unlit(part(leaf, .04, .04, .004, m.ledGreen(), -.62, 1, .014));
		f.block(xr - .14, xr - .04, -.57, zc);
		const mid = (xl + xr) / 2;
		if (shower) {
			f.put(showerSet(), mid, Z0, { y: FLOOR });
			bar(g, v3(xl + .05, 2.05, -.12), v3(xl + .6, 2.05, -.12), .008, m.chrome());
			soft(g, .25, .5, .04, .02, m.white(), xl + .2, 1.75, -.12);
		} else {
			f.put(wallToilet(), mid, Z0, { y: FLOOR });
			f.block(mid - .2, mid + .2, Z0, Z0 + .6);
			drum(g, .05, .1, m.white(), xl + .08, .85, Z0 + .5).rotation.z = Math.PI / 2;
		}
		unlit(sheet(g, .16, .1, plateMat(shower ? "SHOWER" : "WC", "#ffffff", "#1f6f8b"), (xl + d0) / 2, 1.75, .14400000000000002));
	}
	f.put(ibcTank(), -L / 2 - .65, -.3, {
		ry: Math.PI / 2,
		w: 1.2,
		d: 1
	});
	bar(g, v3(-L / 2 - .65, 1.15, -.3), v3(-L / 2 - .65, 1.4, -.3), .025, m.grey());
	bar(g, v3(-L / 2 - .65, 1.4, -.3), v3(-L / 2, 1.4, -.3), .025, m.grey());
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
	id: "container-sanitary",
	label: "Sanitary container",
	note: "washing machines and dryers, three washbasins, three showers and three toilets in cubicles, the hot-water heat pump; a rainwater tank outside. Walk in",
	usedIn: "Sandbox 1",
	make: () => sanitaryContainer()
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