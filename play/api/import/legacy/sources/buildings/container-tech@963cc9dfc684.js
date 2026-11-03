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
/** A rack's front: 42 units of servers, GPU boxes and switches behind a mesh door, `leds` true for their lights alone. */
/** @param {number} seed @param {boolean} leds */
function rackFront(seed, leds) {
	return canvasTexture(`rack:${seed}:${leds}`, 128, 448, (x, r) => {
		x.fillStyle = leds ? "#000" : "#141518";
		x.fillRect(0, 0, 128, 448);
		const u = 10;
		let y = 14;
		while (y < 434) {
			const kind = r();
			const h = kind < .45 ? 4 : kind < .7 ? 2 : 1;
			const top = y, hh = Math.min(h * u, 434 - y);
			if (!leds) {
				x.fillStyle = h === 4 ? "#24272b" : h === 2 ? "#2c3035" : "#1d1f22";
				x.fillRect(8, top + 1, 112, hh - 2);
				x.fillStyle = "rgba(255,255,255,0.08)";
				if (h > 1) for (let gx = 14; gx < 100; gx += 4) for (let gy = top + 4; gy < top + hh - 4; gy += 4) x.fillRect(gx, gy, 2, 2);
				else for (let p = 0; p < 24; p++) x.fillRect(14 + p * 4, top + 3, 3, 4);
			}
			const n = h === 1 ? 6 : 2;
			for (let k = 0; k < n; k++) {
				const on = r();
				x.fillStyle = on < .75 ? "#38e07a" : on < .95 ? "#4aa8ff" : "#ff9a2e";
				if (leds || on < .2) x.fillRect(h === 1 ? 14 + k * 16 : 106 + k * 6, top + (h === 1 ? 7 : 4), 3, 2);
			}
			y += hh;
		}
	}, !leds);
}
/** The energy dashboard on the control desk: today's sun, the batteries' charge, the fuel cell, the servers' load. */
function dashboard() {
	return canvasTexture("energy-dashboard", 512, 300, (x, r) => {
		x.fillStyle = "#0d1418";
		x.fillRect(0, 0, 512, 300);
		x.fillStyle = "#7fe0a8";
		x.font = "bold 26px Arial, sans-serif";
		x.fillText("SOLAR  11.2 kWp   ·   8.7 kW", 18, 38);
		x.fillStyle = "#a9c4cf";
		x.font = "20px Arial, sans-serif";
		x.fillText("BATTERY 82 %   FUEL CELL standby   H₂ 64 %", 18, 72);
		x.fillText("STARLINK 212 ↓ 24 ↑ Mbit/s   AI RACKS 6.1 kW", 18, 100);
		x.strokeStyle = "#f2c230";
		x.lineWidth = 3;
		x.beginPath();
		for (let i = 0; i <= 48; i++) {
			const px = 18 + i * 9.8, py = 270 - Math.max(0, Math.sin((i - 6) / 36 * Math.PI)) * 130 - r() * 6;
			if (i === 0) x.moveTo(px, py);
			else x.lineTo(px, py);
		}
		x.stroke();
		x.strokeStyle = "#4aa8ff";
		x.beginPath();
		for (let i = 0; i <= 48; i++) {
			const px = 18 + i * 9.8, py = 230 - i * .6 - r() * 10;
			if (i === 0) x.moveTo(px, py);
			else x.lineTo(px, py);
		}
		x.stroke();
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
const screenMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: dashboard(),
	emissive: "#ffffff",
	emissiveMap: dashboard(),
	emissiveIntensity: .9
})))();
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
/** A fire extinguisher on its bracket, 6 kg, its back at z 0, its foot at y 0. */
function extinguisher() {
	const g = new three.Group();
	drum(g, .08, .5, m.red(), 0, 0, .09);
	drum(g, .03, .06, m.black(), 0, .5, .09);
	bar(g, v3(0, .56, .09), v3(.12, .5, .12), .008, m.black());
	part(g, .1, .05, .02, m.black(), 0, .35, .01);
	return g;
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
	part(p, 1.72, .035, 1.13, m.galv(), 0, 0, 0);
	const face = new three.Mesh(new three.PlaneGeometry(1.68, 1.09), pvMat());
	face.rotation.x = -Math.PI / 2;
	face.position.y = .019;
	face.receiveShadow = true;
	p.add(face);
	return p;
}
/** The solar array: two rows of seven panels on rails over the roof, a wing of seven folded out each side on struts — 28 panels, about 11 kWp. */
/** @param {THREE.Group} roof */
function solarArray(roof) {
	for (const sz of [-1, 1]) part(roof, L - .2, .05, .05, m.galv(), 0, H + .08, sz * .75);
	for (let i = 0; i < 7; i++) {
		const x = -L / 2 + .1 + .86 + i * 1.73;
		for (const sz of [-1, 1]) pvPanel(roof, x, H + .14 + (sz < 0 ? .04 : 0), sz * .575, .035);
		for (const sz of [-1, 1]) {
			pvPanel(roof, x, H + .02, sz * (W / 2 + .62), sz * .12);
			bar(roof, v3(x, 2.05, sz * (W / 2 + .03)), v3(x, H - .02, sz * (W / 2 + 1.05)), .02, m.galv());
		}
	}
}
/** Starlink on a mast: the rectangular dish (51 × 30 cm) tipped to the sky; its mast clamped to the end wall. */
function starlinkMast() {
	const g = new three.Group();
	bar(g, v3(0, 1.8, 0), v3(0, H + 1.25, 0), .025, m.galv());
	for (const y of [2, 2.7]) part(g, .12, .06, .06, m.frame(), .06, y, 0);
	const dish = new three.Group();
	dish.position.set(0, H + 1.3, 0);
	dish.rotation.x = -.35;
	g.add(dish);
	soft(dish, .513, .04, .303, .015, m.white(), 0, .05, 0);
	bar(dish, v3(0, 0, 0), v3(0, .04, 0), .02, m.white());
	bar(g, v3(0, 2.3, 0), v3(0, .8, 0), .006, m.black());
	return g;
}
/** A battery cabinet: 0.6 × 0.6 × 2.0 m, eight LFP modules of 5 kWh behind a glass door, their charge lights. */
function batteryCabinet() {
	const g = new three.Group();
	part(g, .6, 2, .6, m.white(), 0, 1, 0);
	part(g, .56, .1, .02, m.graphite(), 0, 1.92, .3);
	unlit(part(g, .14, .06, .004, m.ledBlue(), .15, 1.92, .312));
	for (let i = 0; i < 8; i++) {
		const y = .18 + i * .21;
		part(g, .52, .18, .02, m.graphite(), 0, y, .3);
		for (let k = 0; k < 4; k++) unlit(part(g, .018, .012, .004, k < 3 || i % 3 ? m.ledGreen() : m.black(), -.2 + k * .03, y + .05, .312));
	}
	return g;
}
/** A hybrid inverter on the wall, 0.5 × 0.7 × 0.22 m, its display and isolator under it; its back at z 0. */
function inverter() {
	const g = new three.Group();
	part(g, .5, .7, .22, m.blue(), 0, 1.45, .11);
	part(g, .3, .08, .01, m.black(), 0, 1.6, .225);
	unlit(part(g, .22, .05, .004, m.ledBlue(), 0, 1.6, .231));
	part(g, .16, .2, .1, m.grey(), 0, .92, .05);
	part(g, .04, .04, .03, m.red(), 0, .95, .11);
	part(g, .1, .7500000000000001, .06, m.grey(), 0, 2.1750000000000003, .03);
	return g;
}
/** A tall grey cabinet w wide with its name on it: the distribution board, the fuel cell, the electrolyser. */
/** @param {number} w @param {number} d @param {number} h @param {string} name @param {string} band */
function cabinet(w, d, h, name, band) {
	const g = new three.Group();
	part(g, w, h, d, m.grey(), 0, h / 2, 0);
	part(g, w, .12, .012, std(band, .5)(), 0, h - .2, d / 2 + .006);
	unlit(sheet(g, Math.min(.5, w - .1), .12, plateMat(name, "#d6d6d1", "#27312d"), 0, h - .4, d / 2 + .008));
	part(g, .008, h - .1, .004, m.graphite(), 0, h / 2, d / 2 + .003);
	for (let i = 0; i < 8; i++) part(g, w * .35, .012, .006, m.graphite(), -w / 4, .25 + i * .04, d / 2 + .003);
	part(g, .025, .12, .03, m.black(), w / 2 - .08, h / 2, d / 2 + .015);
	unlit(part(g, .12, .07, .004, m.ledGreen(), w / 4, h - .55, d / 2 + .008));
	return g;
}
/** A server rack, 0.6 × 1.0 × 2.0 m (42 units), its mesh door showing the servers and their lights. */
/** @param {number} seed */
function serverRack(seed) {
	const g = new three.Group();
	part(g, .6, 2, 1, m.black(), 0, 1, 0);
	const face = sheet(g, .56, 1.96, new three.MeshStandardMaterial({
		map: rackFront(seed, false),
		emissive: "#ffffff",
		emissiveMap: rackFront(seed, true),
		emissiveIntensity: 1.4,
		roughness: .5
	}), 0, 1, .501);
	face.receiveShadow = true;
	part(g, .025, 1.96, .02, m.graphite(), .27, 1, .51);
	return g;
}
/** A wall-mounted air conditioner's indoor unit, 0.9 × 0.3 × 0.22 m; its back at z 0. */
function acIndoor() {
	const g = new three.Group();
	soft(g, .9, .3, .22, .04, m.white(), 0, 0, .11);
	part(g, .8, .03, .02, m.grey(), 0, -.1, .22);
	unlit(part(g, .03, .012, .004, m.ledBlue(), .35, .05, .222));
	return g;
}
/** An air conditioner's outdoor unit, 0.8 × 0.3 × 0.6 m, its fan behind a grille facing +z. */
function acOutdoor() {
	const g = new three.Group();
	part(g, .8, .6, .3, m.white(), 0, .3, 0);
	const grille = new three.Mesh(new three.CircleGeometry(.22, 24), m.graphite());
	grille.position.set(-.1, .3, .151);
	g.add(grille);
	for (let i = 0; i < 4; i++) {
		const ring = new three.Mesh(new three.TorusGeometry(.06 + i * .05, .004, 4, 24), m.galv());
		ring.position.set(-.1, .3, .155);
		g.add(ring);
	}
	return g;
}
/** A bundle of six hydrogen bottles in a steel cage, 0.6 × 0.9 × 1.8 m, their red shoulders; the regulator and a yellow pipe. */
function hydrogenBundle() {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, .05, 1.8, .05, m.frame(), sx * .28, .9, sz * .43);
	for (const y of [
		.05,
		.9,
		1.75
	]) for (const sz of [-1, 1]) part(g, .6, .04, .03, m.frame(), 0, y, sz * .43);
	for (let i = 0; i < 6; i++) {
		const x = i % 2 ? .12 : -.12, z = -.28 + Math.floor(i / 2) * .28;
		drum(g, .11, 1.4, m.grey(), x, .05, z);
		drum(g, .11, .18, m.red(), x, 1.45, z);
		drum(g, .025, .08, m.chrome(), x, 1.63, z, 8);
	}
	part(g, .14, .1, .1, m.chrome(), .2, 1.7, 0);
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
* The tech container: the settlement's power, its link to the world and its AI. Solar on the roof and on wings
* folded out either side, about 11 kWp (as Africa GreenTec's Solartainer); inside from the open end the control desk,
* the hybrid inverters and the distribution board, 40 kWh of LFP batteries in five cabinets; a hydrogen fuel cell and
* the electrolyser that fills its bottles from the summer's surplus (the bottles caged outside); Starlink on its mast;
* and behind a glass wall the AI server room, seven racks along the back, cooled by two split units.
*/
function techContainer() {
	const b = box({
		name: "tech container",
		color: "#5e8a6b",
		floor: floorMaterial("#9b9e9f"),
		label: "TECH",
		labelX: 0,
		front: [{
			u0: 3.6,
			u1: 4.4,
			y0: 1.5,
			y1: 2.2,
			glass: "clear"
		}]
	});
	const { g, roof, solids } = b;
	const f = fitter(g, solids);
	solarArray(roof);
	f.put(starlinkMast(), -L / 2 - .08, .95, { y: 0 });
	part(g, .06, .12, .06, m.frame(), -L / 2 - .03, 2, .95);
	for (let i = 0; i < 5; i++) f.put(batteryCabinet(), 1.9 + i * .62, atBack(.6), {
		w: .6,
		d: .6
	});
	f.put(cabinet(.8, .4, 2, "DISTRIBUTION", "#f2c230"), 5.2, atBack(.4), {
		w: .8,
		d: .4
	});
	for (let i = 0; i < 3; i++) f.put(inverter(), 1.4 + i * .6, Z1, {
		ry: Math.PI,
		y: FLOOR
	});
	f.block(1.1, 2.9, Z1 - .22, Z1);
	part(g, 4.6, .08, .3, m.galv(), 3.3, 2.5500000000000003, Z1 - .3);
	part(g, 11.5, .08, .3, m.galv(), 0, 2.5500000000000003, Z0 + .25);
	const desk = f.put(steelTable(1.2, .6, {
		upstand: false,
		shelf: false
	}), 4.9, atFront(.6), {
		ry: Math.PI,
		w: 1.2,
		d: .6
	});
	part(desk, .55, .34, .03, m.black(), 0, 1.15, .1);
	unlit(sheet(desk, .52, .3, screenMat(), 0, 1.15, .116));
	bar(desk, v3(0, .9, .08), v3(0, .98, .08), .02, m.black());
	part(desk, .4, .015, .13, m.graphite(), 0, .91, -.12);
	drum(g, .2, .05, m.graphite(), 4.9, .6, Z1 - .9, 20);
	bar(g, v3(4.9, FLOOR, Z1 - .9), v3(4.9, .6, Z1 - .9), .025, m.graphite());
	f.put(extinguisher(), 5.75, Z1, {
		ry: Math.PI,
		y: 1.05
	});
	f.put(cabinet(1.1, .75, 1.9, "FUEL CELL H₂", "#2f8a4a"), -.35, atBack(.75), {
		w: 1.1,
		d: .75
	});
	f.put(cabinet(1, .75, 1.9, "ELECTROLYSER", "#2a64a8"), .8, atBack(.75), {
		w: 1,
		d: .75
	});
	drum(g, .22, 1.1, m.white(), .2, FLOOR, Z1 - .25, 24);
	f.block(-.02, .42, Z1 - .47, Z1);
	unlit(sheet(g, .3, .075, plateMat("H₂O", "#ffffff", "#2a64a8"), .2, .9500000000000001, Z1 - .47, Math.PI));
	bar(g, v3(-.35, 2.05, Z0 + .3), v3(-.35, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	bar(g, v3(-.35, 2.4000000000000004, Z0 + .3), v3(X0, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	unlit(sheet(g, .2, .18, plateMat("⚠ H₂", "#f2c230", "#1b1c1e"), 1.5, 1.75, Z0 + .01));
	const gx = -1.3;
	unlit(part(g, .012, 2.5500000000000003, 1.45, m.glass(), gx, 1.425, Z0 + .725));
	part(g, .05, 2.5500000000000003, .05, m.frame(), gx, 1.425, Z0 + 1.45);
	part(g, .05, .05, Z1 - Z0, m.frame(), gx, 2.6750000000000003, 0);
	part(g, .05, .40000000000000036, Z1 - Z0 - 1.45, m.frame(), gx, 2.5, Z1 - (Z1 - Z0 - 1.45) / 2);
	f.block(-1.33, -1.27, Z0, Z0 + 1.48);
	const door = new three.Group();
	door.position.set(gx, FLOOR, Z1 - .03);
	door.rotation.y = Math.PI;
	g.add(door);
	unlit(part(door, .72, 2.1, .012, m.glass(), .36, 1.05, 0));
	part(door, .03, .6, .03, m.chrome(), .65, 1.05, -.03);
	f.block(-2.05, gx, Z1 - .06, Z1);
	unlit(sheet(g, .5, .12, plateMat("AI SERVERS", "#1b1c1e", "#38e07a"), -1.29, 2.35, Z0 + .7, Math.PI / 2));
	for (let i = 0; i < 7; i++) f.put(serverRack(i + 1), -5.55 + i * .6, atBack(1), {
		w: .6,
		d: 1
	});
	for (const x of [-4.8, -2.6]) f.put(acIndoor(), x, Z1, {
		ry: Math.PI,
		y: 2.3
	});
	const net = f.put(new three.Group(), -3.7, Z1, {
		ry: Math.PI,
		y: 1.2
	});
	part(net, .6, .6, .45, m.black(), 0, .3, .225);
	unlit(part(net, .5, .5, .006, m.glass(), 0, .3, .452));
	part(net, .44, .045, .3, m.graphite(), 0, .42, .25);
	for (let k = 0; k < 12; k++) unlit(part(net, .012, .008, .004, k % 4 ? m.ledGreen() : m.ledBlue(), -.18 + k * .03, .43, .402));
	soft(net, .22, .05, .16, .02, m.white(), -.1, .17, .25);
	f.block(-4, -3.4, Z1 - .45, Z1);
	const gas = f.put(new three.Group(), -5.75, Z1 - .2, {
		w: .3,
		d: .3
	});
	drum(gas, .13, 1.3, m.red(), 0, 0, 0, 20);
	drum(gas, .04, .1, m.chrome(), 0, 1.3, 0, 10);
	f.put(hydrogenBundle(), -L / 2 - .45, -.55, {
		w: .6,
		d: .9
	});
	bar(g, v3(-L / 2 - .25, 1.75, -.55), v3(-L / 2 - .25, 2.4000000000000004, -.55), .014, m.yellow());
	bar(g, v3(-L / 2 - .25, 2.4000000000000004, -.55), v3(-L / 2 - .25, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	bar(g, v3(-L / 2 - .25, 2.4000000000000004, Z0 + .3), v3(X0, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	for (const y of [.1, .8]) f.put(acOutdoor(), -L / 2 - .2, .3, {
		ry: -Math.PI / 2,
		y,
		w: .3,
		d: .8
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
	id: "container-tech",
	label: "Tech container",
	note: "28 solar panels (about 11 kWp) on the roof and fold-out wings, 40 kWh of batteries, inverters, a hydrogen fuel cell and electrolyser, Starlink, and the AI server room behind glass. Walk in",
	usedIn: "Sandbox 1",
	make: () => techContainer()
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