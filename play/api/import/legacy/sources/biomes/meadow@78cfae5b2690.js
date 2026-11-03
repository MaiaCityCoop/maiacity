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

//#region src/lib/biomes/noise.js
const fract$1 = (x) => x - Math.floor(x);
/** a hash of a lattice point, 0…1 @param {number} x @param {number} y */
function h21(x, y) {
	let px = fract$1(x * 123.34), py = fract$1(y * 456.21);
	const d = px * (px + 45.32) + py * (py + 45.32);
	px += d;
	py += d;
	return fract$1(px * py);
}
/** smooth value noise, 0…1 @param {number} x @param {number} y */
function vn(x, y) {
	const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
	const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
	return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
/** three octaves of it, 0…1 @param {number} x @param {number} y */
const fbm2 = (x, y) => vn(x, y) * .55 + vn(x * 2.03 + 7.1, y * 2.03 + 7.1) * .3 + vn(x * 4.1 + 3.3, y * 4.1 + 3.3) * .15;
/** a seeded random number, the same every time @param {number} seed */
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

//#endregion
//#region src/lib/biomes/cover.js
/** the cover's one material: its colours in its vertices, both faces of a blade or a leaf */
let coverMat = null;
const material = () => coverMat ??= new three.MeshStandardMaterial({
	vertexColors: true,
	roughness: .88,
	side: three.DoubleSide
});
/** a geometry's vertices all coloured so @param {THREE.BufferGeometry} g @param {THREE.Color | ((p: THREE.Vector3) => THREE.Color)} c */
function paint(g, c) {
	const geo = g.index ? g.toNonIndexed() : g;
	for (const k of Object.keys(geo.attributes)) if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
	if (!geo.attributes.normal) geo.computeVertexNormals();
	const pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3), v = new three.Vector3();
	for (let i = 0; i < n; i++) {
		const cc = typeof c === "function" ? c(v.fromBufferAttribute(pos, i)) : c;
		col[i * 3] = cc.r;
		col[i * 3 + 1] = cc.g;
		col[i * 3 + 2] = cc.b;
	}
	geo.setAttribute("color", new three.BufferAttribute(col, 3));
	return geo;
}
/** the pieces as one mesh @param {THREE.BufferGeometry[]} geos */
function one(geos) {
	const g = new three.Group();
	const mesh = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos), material());
	mesh.receiveShadow = true;
	g.add(mesh);
	return g;
}
const col = (h) => new three.Color(h);
/**
* A blade (or a stem, a leaf on a stalk): a strip from its foot out along `dir`, bending over by `bend` towards its
* tip, `w` wide at its foot and narrowing to a point; dark at its foot, `tip` at its tip.
* @param {THREE.Vector3} foot @param {THREE.Vector3} dir @param {number} len @param {number} w @param {number} bend
* @param {THREE.Color} base @param {THREE.Color} tip
*/
function blade(foot, dir, len, w, bend, base, tip) {
	const segs = 4, pos = [];
	const up = dir.clone().normalize(), side = new three.Vector3(0, 1, 0).cross(up);
	if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
	side.normalize();
	const out = new three.Vector3(up.x, 0, up.z);
	if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
	out.normalize();
	const pts = [];
	for (let i = 0; i <= segs; i++) {
		const t = i / segs;
		pts.push(foot.clone().addScaledVector(up, len * t).addScaledVector(out, len * bend * t * t).addScaledVector(new three.Vector3(0, 1, 0), -len * bend * .6 * t * t));
	}
	/** @type {number[]} */
	const cols = [];
	for (let i = 0; i < segs; i++) {
		const t0 = i / segs, t1 = (i + 1) / segs;
		const w0 = w * (1 - t0), w1 = w * (1 - t1);
		const a = pts[i], b = pts[i + 1];
		const q = [
			a.clone().addScaledVector(side, -w0 / 2),
			a.clone().addScaledVector(side, w0 / 2),
			b.clone().addScaledVector(side, w1 / 2),
			b.clone().addScaledVector(side, -w1 / 2)
		];
		for (const [p, t] of [
			[q[0], t0],
			[q[1], t0],
			[q[2], t1],
			[q[0], t0],
			[q[2], t1],
			[q[3], t1]
		]) {
			pos.push(p.x, p.y, p.z);
			const c = base.clone().lerp(tip, t);
			cols.push(c.r, c.g, c.b);
		}
	}
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	g.setAttribute("color", new three.Float32BufferAttribute(cols, 3));
	g.computeVertexNormals();
	return g;
}
/** A clump of grass: 16–24 blades fanning out of one foot, some bent over, a few gone straw at the tip. */
function grassClump(seed, h) {
	const r = rng(seed), geos = [];
	const greens = [
		"#3d6a2a",
		"#4a7a30",
		"#56883a",
		"#2f5a24"
	].map(col);
	const n = 16 + Math.floor(r() * 9);
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, lean = .15 + r() * .45;
		const dir = new three.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean);
		const len = h * (.55 + r() * .5);
		const base = greens[Math.floor(r() * greens.length)];
		const tip = r() < .18 ? col("#b8a868") : base.clone().offsetHSL(.01, .02, .12);
		geos.push(blade(new three.Vector3((r() - .5) * .05, 0, (r() - .5) * .05), dir, len, .006 + r() * .004, .15 + r() * .45, base.clone().multiplyScalar(.6), tip));
	}
	for (let i = 0; i < (r() < .5 ? 2 : 0); i++) {
		const a = r() * Math.PI * 2;
		const foot = new three.Vector3(0, 0, 0), dir = new three.Vector3(Math.cos(a) * .12, 1, Math.sin(a) * .12);
		geos.push(blade(foot, dir, h * 1.35, .003, .05, col("#4a6a2c"), col("#8a8a4a")));
		const head = new three.ConeGeometry(.008, .05, 5).translate(Math.cos(a) * .12 * h * 1.3, h * 1.35, Math.sin(a) * .12 * h * 1.3);
		geos.push(paint(head, col("#a39a5a")));
	}
	return one(geos);
}
/** A cushion of moss: a few small lumpy domes run together, low and soft-edged, dark in its hollows and bright where
*  the light catches it, a scatter of its stalks with their capsules. */
function mossCushion(seed) {
	const r = rng(seed), geos = [];
	const n = 3 + Math.floor(r() * 4);
	const tone = r();
	for (let i = 0; i < n; i++) {
		const g = new three.IcosahedronGeometry(1, 2);
		const p = g.attributes.position, v = new three.Vector3();
		const ph = r() * 10;
		for (let k = 0; k < p.count; k++) {
			v.fromBufferAttribute(p, k);
			const bump = 1 + .18 * Math.sin(v.x * 7 + ph) * Math.sin(v.z * 6 + ph * 1.3) + .08 * Math.sin(v.x * 19 + v.z * 17 + ph);
			p.setXYZ(k, v.x * bump, Math.max(-.15, v.y) * bump, v.z * bump);
		}
		const rad = .035 + r() * .07;
		g.scale(rad, rad * (.35 + r() * .2), rad * (.8 + r() * .4));
		g.translate((r() - .5) * .16, 0, (r() - .5) * .16);
		const light = col(tone < .5 ? "#6f9a34" : "#7f9a3e"), dark = col("#2c4416");
		geos.push(paint(g, (q) => dark.clone().lerp(light, Math.min(1, Math.max(0, q.y / (rad * .32))) * (.65 + .35 * Math.sin(q.x * 140 + q.z * 110)))));
	}
	for (let i = 0; i < 8; i++) {
		const x = (r() - .5) * .18, z = (r() - .5) * .18;
		geos.push(blade(new three.Vector3(x, .012, z), new three.Vector3(0, 1, 0), .025, .0015, .2, col("#8a6a2a"), col("#c89a4a")));
	}
	return one(geos);
}
/** @typedef {'daisy' | 'buttercup' | 'clover' | 'forgetmenot' | 'anemone' | 'cranesbill'} Flower */
/** @type {Record<Flower, { petals: number, colour: string, eye: string, r: number, h: [number, number], heads: [number, number], leaf: string, ball?: boolean, cluster?: boolean }>} */
const FLOWERS = {
	daisy: {
		petals: 14,
		colour: "#f6f3ea",
		eye: "#f2c230",
		r: .014,
		h: [.05, .1],
		heads: [3, 6],
		leaf: "#4f7a34"
	},
	buttercup: {
		petals: 5,
		colour: "#f3cf26",
		eye: "#d8a81a",
		r: .013,
		h: [.18, .35],
		heads: [3, 7],
		leaf: "#3f6a2a"
	},
	clover: {
		petals: 0,
		colour: "#c7638a",
		eye: "#a84a72",
		r: .011,
		h: [.06, .12],
		heads: [3, 6],
		leaf: "#4a7a30",
		ball: true
	},
	forgetmenot: {
		petals: 5,
		colour: "#6f9fe0",
		eye: "#f2dc6a",
		r: .0045,
		h: [.12, .22],
		heads: [4, 7],
		leaf: "#4a7432",
		cluster: true
	},
	anemone: {
		petals: 6,
		colour: "#f4f1f4",
		eye: "#e8c84a",
		r: .016,
		h: [.1, .18],
		heads: [2, 5],
		leaf: "#3c6a2c"
	},
	cranesbill: {
		petals: 5,
		colour: "#a06ac2",
		eye: "#e2d6ea",
		r: .014,
		h: [.2, .38],
		heads: [3, 6],
		leaf: "#3f6a2e"
	}
};
/** A flower head facing up at `at`: its petals round its eye (or a ball of florets, a red clover's). */
function head(at, kind, r) {
	const f = FLOWERS[kind], geos = [];
	if (f.ball) {
		geos.push(paint(new three.IcosahedronGeometry(f.r, 0).scale(1, 1.15, 1).translate(at.x, at.y + f.r, at.z), (q) => col(f.colour).lerp(col(f.eye), Math.max(0, (at.y + f.r - q.y) / (f.r * 2)))));
		return geos;
	}
	const tilt = (r() - .5) * .6;
	for (let i = 0; i < f.petals; i++) {
		const a = i / f.petals * Math.PI * 2 + r() * .2;
		const len = f.r, wid = Math.PI * 2 * f.r / f.petals * (f.petals > 8 ? .7 : 1.1);
		const g = new three.PlaneGeometry(wid, len).translate(0, len / 2 + f.r * .25, 0).rotateX(-Math.PI / 2 + .25 + (kind === "buttercup" ? .5 : 0)).rotateY(-a + Math.PI / 2);
		g.rotateZ(tilt).translate(at.x, at.y, at.z);
		geos.push(paint(g, col(f.colour)));
	}
	geos.push(paint(new three.CircleGeometry(f.r * .32, 6).rotateX(-Math.PI / 2).rotateZ(tilt).translate(at.x, at.y + .002, at.z), col(f.eye)));
	return geos;
}
/** A clump of a low flower: a rosette of leaves on the ground, stems up out of it, a head on each. */
function flowerClump(kind, seed) {
	const r = rng(seed), f = FLOWERS[kind], geos = [];
	const leaf = col(f.leaf);
	const leaves = 6 + Math.floor(r() * 6);
	for (let i = 0; i < leaves; i++) {
		const a = r() * Math.PI * 2, len = .03 + r() * .035;
		const dir = new three.Vector3(Math.cos(a), .35 + r() * .4, Math.sin(a));
		geos.push(blade(new three.Vector3(0, .003, 0), dir, len, kind === "clover" || kind === "cranesbill" ? .026 : .016, .3, leaf.clone().multiplyScalar(.7), leaf.clone().offsetHSL(0, 0, .06)));
	}
	const heads = f.heads[0] + Math.floor(r() * (f.heads[1] - f.heads[0] + 1));
	for (let i = 0; i < heads; i++) {
		const a = r() * Math.PI * 2, d = .02 + r() * .05;
		const h = f.h[0] + r() * (f.h[1] - f.h[0]);
		const top = new three.Vector3(Math.cos(a) * d * 1.6, h, Math.sin(a) * d * 1.6);
		geos.push(blade(new three.Vector3(Math.cos(a) * d * .4, 0, Math.sin(a) * d * .4), top.clone().normalize(), h, .0025, .04, leaf.clone().multiplyScalar(.75), leaf));
		if (f.cluster) for (let k = 0; k < 4; k++) geos.push(...head(top.clone().add(new three.Vector3((r() - .5) * .02, (r() - .5) * .015, (r() - .5) * .02)), kind, r));
		else geos.push(...head(top, kind, r));
	}
	return one(geos);
}
/** Wild strawberries: their leaves in threes on stalks, toothed and veined, a few red berries hanging under them. */
function strawberries(seed) {
	const r = rng(seed), geos = [];
	const n = 5 + Math.floor(r() * 5);
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, d = r() * .08, h = .05 + r() * .07;
		const top = new three.Vector3(Math.cos(a) * (d + .03), h, Math.sin(a) * (d + .03));
		geos.push(blade(new three.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), top.clone().normalize(), h, .002, .05, col("#4a6a2a"), col("#5a7a32")));
		for (let k = 0; k < 3; k++) {
			const b = a + (k - 1) * .9;
			geos.push(blade(top, new three.Vector3(Math.cos(b), .15, Math.sin(b)), .03, .022, .25, col("#3a6a28"), col("#5a8a38")));
		}
	}
	for (let i = 0; i < 4; i++) geos.push(paint(new three.IcosahedronGeometry(.007, 0).scale(1, 1.3, 1).translate((r() - .5) * .14, .012, (r() - .5) * .14), col(r() < .75 ? "#c8252c" : "#e8d8a8")));
	return one(geos);
}
/** A fern: its fronds arching out of one crown, each a stalk with its pinnae either side, narrowing to the tip. */
function fern(seed) {
	const r = rng(seed), geos = [];
	const n = 6 + Math.floor(r() * 5), size = .3 + r() * .3;
	for (let i = 0; i < n; i++) {
		const a = i / n * Math.PI * 2 + r() * .4;
		const out = new three.Vector3(Math.cos(a), 0, Math.sin(a));
		const pts = [];
		for (let k = 0; k <= 8; k++) {
			const t = k / 8;
			pts.push(new three.Vector3(out.x * size * t, size * .75 * Math.sin(t * Math.PI * .75), out.z * size * t));
		}
		for (let k = 0; k < 8; k++) {
			const t = k / 8, p = pts[k], q = pts[k + 1];
			geos.push(blade(p, q.clone().sub(p).normalize(), p.distanceTo(q), .004, 0, col("#4a6a2a"), col("#4a6a2a")));
			const side = q.clone().sub(p).cross(new three.Vector3(0, 1, 0)).normalize();
			const len = size * .22 * (1 - t * .85);
			for (const s of [1, -1]) geos.push(blade(p, side.clone().multiplyScalar(s).add(new three.Vector3(0, .2, 0)), len, len * .35, .25, col("#3f6e2a"), col("#6a9a40")));
		}
	}
	return one(geos);
}
/** Fallen leaves on the humus, curled and in many browns, and a few twigs among them. */
function litter(seed) {
	const r = rng(seed), geos = [];
	const browns = [
		"#7a4e2e",
		"#6b4a32",
		"#8a6a4a",
		"#5a3e2a",
		"#9a7350",
		"#86603e",
		"#6e5a44"
	];
	for (let i = 0; i < 34; i++) {
		const len = .03 + r() * .035;
		const g = new three.PlaneGeometry(len * .6, len, 2, 2);
		const p = g.attributes.position;
		for (let k = 0; k < p.count; k++) p.setZ(k, Math.abs(p.getX(k)) * .5 + .004 * Math.sin(p.getY(k) * 60));
		g.rotateX(-Math.PI / 2).rotateY(r() * Math.PI * 2).translate((r() - .5) * .5, .004 + r() * .006, (r() - .5) * .5);
		geos.push(paint(g, col(browns[Math.floor(r() * browns.length)]).multiplyScalar(.85 + r() * .3)));
	}
	for (let i = 0; i < 3; i++) {
		const len = .15 + r() * .3;
		const g = new three.CylinderGeometry(.004 + r() * .004, .006, len, 5).rotateZ(Math.PI / 2).rotateY(r() * Math.PI).translate((r() - .5) * .4, .006, (r() - .5) * .4);
		geos.push(paint(g, col(r() < .5 ? "#4a3626" : "#6a5038")));
	}
	return one(geos);
}
/** Woodruff: upright stems with whorls of narrow leaves, a cluster of small white stars on top; a carpet of it. */
function woodruff(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 9; i++) {
		const x = (r() - .5) * .22, z = (r() - .5) * .22, h = .12 + r() * .1;
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3((r() - .5) * .2, 1, (r() - .5) * .2), h, .0025, .02, col("#3f6a2a"), col("#4f7a30")));
		for (let w = 1; w <= 3; w++) {
			const y = h * w / 3.3;
			for (let k = 0; k < 7; k++) {
				const a = k / 7 * Math.PI * 2 + w;
				geos.push(blade(new three.Vector3(x, y, z), new three.Vector3(Math.cos(a), .15, Math.sin(a)), .025, .007, .15, col("#3a6626"), col("#5a8a36")));
			}
		}
		if (r() < .7) for (let k = 0; k < 4; k++) geos.push(paint(new three.CircleGeometry(.0035, 5).rotateX(-Math.PI / 2).translate(x + (r() - .5) * .015, h + .003, z + (r() - .5) * .015), col("#f7f6f0")));
	}
	return one(geos);
}
/** Wood sorrel: pale trefoils on thin stalks, each leaflet a heart folded along its middle; a few white flowers veined lilac. */
function woodSorrel(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 12; i++) {
		const x = (r() - .5) * .2, z = (r() - .5) * .2, h = .05 + r() * .05;
		const top = new three.Vector3(x, h, z);
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3(0, 1, 0), h, .0015, 0, col("#7a8a4a"), col("#8a9a52")));
		for (let k = 0; k < 3; k++) {
			const a = k / 3 * Math.PI * 2 + r();
			const g = new three.CircleGeometry(.011, 7, 0, Math.PI).rotateX(-Math.PI / 2 + .35).rotateY(-a).translate(top.x, top.y, top.z);
			geos.push(paint(g, col("#7aa848")));
		}
	}
	for (let i = 0; i < 3; i++) geos.push(paint(new three.CircleGeometry(.008, 5).rotateX(-Math.PI / 2).translate((r() - .5) * .15, .06, (r() - .5) * .15), col("#f4eef2")));
	return one(geos);
}
/** Ramsons (wild garlic): broad bright leaves rising from the ground in a dense stand, white star-umbels over them. */
function ramsons(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 14; i++) {
		const a = r() * Math.PI * 2, d = r() * .12;
		geos.push(blade(new three.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), new three.Vector3(Math.cos(a) * .35, 1, Math.sin(a) * .35), .18 + r() * .1, .045, .35, col("#2f6a26"), col("#4a8a34")));
	}
	for (let i = 0; i < 4; i++) {
		const x = (r() - .5) * .15, z = (r() - .5) * .15, h = .24 + r() * .08;
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3(0, 1, 0), h, .003, 0, col("#3f6a2a"), col("#5a7a3a")));
		for (let k = 0; k < 9; k++) {
			const a = r() * Math.PI * 2, s = r() * .025;
			geos.push(paint(new three.CircleGeometry(.005, 6).rotateX(-Math.PI / 2 + (r() - .5)).translate(x + Math.cos(a) * s, h + .01 + r() * .012, z + Math.sin(a) * s), col("#f6f6f2")));
		}
	}
	return one(geos);
}
/** A tussock of sedge: many narrow keeled leaves arching right over, darker and bluer than grass. */
function sedge(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 26; i++) {
		const a = r() * Math.PI * 2, lean = .3 + r() * .6;
		geos.push(blade(new three.Vector3((r() - .5) * .04, 0, (r() - .5) * .04), new three.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean), .25 + r() * .2, .007, .7 + r() * .4, col("#2c4a26"), col("#5a7a4a")));
	}
	return one(geos);
}
/** Blueberry: a dwarf shrub knee-high, green twiggy stems, small oval leaves, blue berries with their bloom. */
function blueberry(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 7; i++) {
		const a = r() * Math.PI * 2, h = .2 + r() * .18;
		const foot = new three.Vector3((r() - .5) * .12, 0, (r() - .5) * .12), dir = new three.Vector3(Math.cos(a) * .3, 1, Math.sin(a) * .3).normalize();
		geos.push(blade(foot, dir, h, .004, .1, col("#4a6a2a"), col("#5a8a34")));
		for (let k = 0; k < 9; k++) {
			const t = .3 + r() * .7, p = foot.clone().addScaledVector(dir, h * t), b = r() * Math.PI * 2;
			geos.push(blade(p, new three.Vector3(Math.cos(b), .3, Math.sin(b)), .022, .013, .1, col("#3f6e2a"), col("#5a8a3a")));
			if (r() < .25) geos.push(paint(new three.IcosahedronGeometry(.0045, 0).translate(p.x, p.y - .006, p.z), col("#3a4a7a")));
		}
	}
	return one(geos);
}
/** Mushrooms in a ring: pale stems, brown caps, one or two red with white flecks. */
function mushrooms(seed) {
	const r = rng(seed), geos = [];
	const red = r() < .3;
	for (let i = 0; i < 7; i++) {
		const a = i / 7 * Math.PI * 2 + r() * .4, d = .18 + r() * .12, h = .04 + r() * .07;
		const x = Math.cos(a) * d, z = Math.sin(a) * d;
		geos.push(paint(new three.CylinderGeometry(.006, .009, h, 6).translate(x, h / 2, z), col("#e8e0cc")));
		const cap = new three.SphereGeometry(.022 + r() * .015, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .6, 1).translate(x, h, z);
		geos.push(paint(cap, (q) => red && q.y - h > .004 && Math.sin(q.x * 900) * Math.sin(q.z * 900) > .85 ? col("#f6f2ea") : col(red ? "#c62a1e" : "#8a5a32")));
	}
	return one(geos);
}
/** A few stones half sunk in the floor, grey and mossed on top. */
function stones(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 4; i++) {
		const s = .06 + r() * .16;
		const g = new three.DodecahedronGeometry(s, 0).scale(1.2, .6, 1).rotateY(r() * 3).translate((r() - .5) * .5, s * .15, (r() - .5) * .5);
		geos.push(paint(g, (q) => q.y > s * .35 ? col("#5a7a2c") : col(r() < .5 ? "#8a8a84" : "#7a766c")));
	}
	return one(geos);
}
/** A fallen branch, deadwood: bark grey-brown, moss along its top, a side twig or two. */
function deadwood(seed) {
	const r = rng(seed), geos = [];
	const len = .8 + r() * 1.4, rad = .035 + r() * .05;
	geos.push(paint(new three.CylinderGeometry(rad * .8, rad, len, 8, 6).rotateZ(Math.PI / 2).translate(0, rad * .8, 0), (q) => q.y > rad * 1.4 && Math.sin(q.x * 9 + seed) > .2 ? col("#4a6a26") : col(Math.sin(q.x * 31) > .6 ? "#4a3c30" : "#62523f")));
	for (let i = 0; i < 2; i++) {
		const x = (r() - .5) * len * .7, l2 = .2 + r() * .3, a = (r() - .5) * 1.6;
		geos.push(paint(new three.CylinderGeometry(rad * .25, rad * .4, l2, 5).rotateX(Math.PI / 2).rotateY(a).translate(x + Math.sin(a) * l2 * .5, rad * .6, Math.cos(a) * l2 * .5), col("#4a3a2c")));
	}
	return one(geos);
}
/** @typedef {'grass' | 'tallgrass' | 'sedge' | 'moss' | Flower | 'woodruff' | 'woodsorrel' | 'ramsons' | 'strawberry' | 'blueberry' | 'fern' | 'litter' | 'deadwood' | 'stones' | 'mushrooms'} Cover */
/** @type {Record<Cover, { label: string, build: (seed: number) => THREE.Group }>} every kind: its name, and how it is built */
const COVER = {
	grass: {
		label: "Grass",
		build: (s) => grassClump(s, .22)
	},
	tallgrass: {
		label: "Tall grass",
		build: (s) => grassClump(s, .45)
	},
	sedge: {
		label: "Sedge",
		build: sedge
	},
	moss: {
		label: "Moss cushions",
		build: mossCushion
	},
	daisy: {
		label: "Daisy",
		build: (s) => flowerClump("daisy", s)
	},
	buttercup: {
		label: "Buttercup",
		build: (s) => flowerClump("buttercup", s)
	},
	clover: {
		label: "Red clover",
		build: (s) => flowerClump("clover", s)
	},
	forgetmenot: {
		label: "Forget-me-not",
		build: (s) => flowerClump("forgetmenot", s)
	},
	anemone: {
		label: "Wood anemone",
		build: (s) => flowerClump("anemone", s)
	},
	cranesbill: {
		label: "Meadow cranesbill",
		build: (s) => flowerClump("cranesbill", s)
	},
	woodruff: {
		label: "Woodruff",
		build: woodruff
	},
	woodsorrel: {
		label: "Wood sorrel",
		build: woodSorrel
	},
	ramsons: {
		label: "Ramsons",
		build: ramsons
	},
	strawberry: {
		label: "Wild strawberry",
		build: strawberries
	},
	blueberry: {
		label: "Blueberry",
		build: blueberry
	},
	fern: {
		label: "Fern",
		build: fern
	},
	litter: {
		label: "Leaves and twigs",
		build: litter
	},
	deadwood: {
		label: "Deadwood",
		build: deadwood
	},
	stones: {
		label: "Stones",
		build: stones
	},
	mushrooms: {
		label: "Mushrooms",
		build: mushrooms
	}
};

//#endregion
//#region src/lib/biomes/surfaces.js
/** @typedef {'litter' | 'humus' | 'needles' | 'moss' | 'green' | 'soil'} Surface */
/** @type {Surface[]} */
const SURFACES = [
	"litter",
	"humus",
	"needles",
	"moss",
	"green",
	"soil"
];
/** @type {Record<Surface, { label: string, patch: number, tile: number }>} its name, how big its patches are (m), how much ground one tile of its texture covers (m) */
const SURFACE = {
	litter: {
		label: "Leaf litter",
		patch: 6,
		tile: 2.2
	},
	humus: {
		label: "Humus",
		patch: 3,
		tile: 2.4
	},
	needles: {
		label: "Needles",
		patch: 7,
		tile: 1.6
	},
	moss: {
		label: "Moss carpet",
		patch: 4,
		tile: 2
	},
	green: {
		label: "Living mat",
		patch: 9,
		tile: 1.7
	},
	soil: {
		label: "Bare soil",
		patch: 5,
		tile: 2.6
	}
};
const textures = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** @param {string} key @param {(x: CanvasRenderingContext2D, r: () => number) => void} draw */
function canvasTexture(key, draw) {
	const hit = textures.get(key);
	if (hit) return hit;
	const c = document.createElement("canvas");
	c.width = c.height = 512;
	draw(c.getContext("2d"), rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
	const t = new three.CanvasTexture(c);
	t.colorSpace = three.SRGBColorSpace;
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.anisotropy = 8;
	textures.set(key, t);
	return t;
}
/** a mottled base: two colours by a noise @param {CanvasRenderingContext2D} x @param {() => number} r @param {number[]} a @param {number[]} b @param {number} scale */
function base(x, r, a, b, scale) {
	const img = x.createImageData(512, 512);
	for (let i = 0; i < 262144; i++) {
		const g = fbm2(i % 512 / scale, (i / 512 | 0) / scale) * .75 + r() * .25;
		for (let k = 0; k < 3; k++) img.data[i * 4 + k] = a[k] + (b[k] - a[k]) * g;
		img.data[i * 4 + 3] = 255;
	}
	x.putImageData(img, 0, 0);
}
const pick$1 = (list, r) => list[Math.floor(r() * list.length)];
/** a leaf, its tip to one side, a midrib @param {CanvasRenderingContext2D} x */
function leaf(x, cx, cy, len, a, fill, wide) {
	x.save();
	x.translate(cx, cy);
	x.rotate(a);
	x.fillStyle = fill;
	x.beginPath();
	x.moveTo(-len, 0);
	x.quadraticCurveTo(-len * .2, -len * wide, len, 0);
	x.quadraticCurveTo(-len * .2, len * wide, -len, 0);
	x.fill();
	x.globalAlpha *= .5;
	x.strokeStyle = "#2a1a0c";
	x.lineWidth = .7;
	x.beginPath();
	x.moveTo(-len, 0);
	x.lineTo(len * .9, 0);
	x.stroke();
	x.restore();
}
/** @type {Record<Surface, () => THREE.Texture>} */
const TEXTURES = {
	litter: () => canvasTexture("biome-litter", (x, r) => {
		base(x, r, [
			44,
			30,
			18
		], [
			70,
			48,
			28
		], 20);
		const browns = [
			"#7a4e2e",
			"#6b4a32",
			"#8a6a4a",
			"#5a3e2a",
			"#9a7350",
			"#4e3a2a",
			"#86603e",
			"#6e5a44",
			"#a07a52"
		];
		for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 1700; i++) {
			x.globalAlpha = pass ? .92 : .6;
			leaf(x, r() * 512, r() * 512, 7 + r() * 11, r() * Math.PI * 2, pick$1(browns, r), .42 + r() * .2);
		}
		x.globalAlpha = 1;
		for (let i = 0; i < 40; i++) {
			x.strokeStyle = r() < .5 ? "#3a2a1c" : "#5a4430";
			x.lineWidth = 1 + r() * 2;
			const cx = r() * 512, cy = r() * 512, len = 15 + r() * 40, a = r() * Math.PI;
			x.beginPath();
			x.moveTo(cx, cy);
			x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
			x.stroke();
		}
	}),
	humus: () => canvasTexture("biome-humus", (x, r) => {
		base(x, r, [
			24,
			17,
			11
		], [
			52,
			37,
			24
		], 9);
		for (let i = 0; i < 3500; i++) {
			x.fillStyle = r() < .5 ? "rgba(20,14,9,0.6)" : "rgba(80,58,36,0.5)";
			x.beginPath();
			x.arc(r() * 512, r() * 512, .8 + r() * 2.2, 0, Math.PI * 2);
			x.fill();
		}
		for (let i = 0; i < 200; i++) {
			x.globalAlpha = .5;
			leaf(x, r() * 512, r() * 512, 3 + r() * 5, r() * 6.28, pick$1([
				"#5e3e22",
				"#4a3220",
				"#6a4a2a"
			], r), .5);
		}
		x.globalAlpha = 1;
	}),
	needles: () => canvasTexture("biome-needles", (x, r) => {
		base(x, r, [
			52,
			36,
			24
		], [
			88,
			60,
			38
		], 16);
		const tones = [
			"#8a5a32",
			"#a06a3a",
			"#6e5440",
			"#9a8268",
			"#5a4030",
			"#b0784a"
		];
		for (let i = 0; i < 9e3; i++) {
			const cx = r() * 512, cy = r() * 512, len = 4 + r() * 6, a = r() * Math.PI;
			x.strokeStyle = pick$1(tones, r);
			x.globalAlpha = .85;
			x.lineWidth = .9;
			x.beginPath();
			x.moveTo(cx, cy);
			x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
			x.stroke();
		}
		x.globalAlpha = 1;
	}),
	moss: () => canvasTexture("biome-moss", (x, r) => {
		base(x, r, [
			34,
			54,
			18
		], [
			96,
			128,
			46
		], 10);
		for (let i = 0; i < 9e3; i++) {
			x.fillStyle = pick$1([
				"#4a6a22",
				"#5e8028",
				"#78963a",
				"#3a5418",
				"#88a444"
			], r);
			x.globalAlpha = .7;
			x.beginPath();
			x.arc(r() * 512, r() * 512, 1 + r() * 2.2, 0, Math.PI * 2);
			x.fill();
		}
		x.globalAlpha = 1;
	}),
	green: () => canvasTexture("biome-green", (x, r) => {
		base(x, r, [
			28,
			48,
			22
		], [
			58,
			88,
			36
		], 22);
		const greens = [
			"#3f6a2c",
			"#4e7a34",
			"#5b8a3a",
			"#6a9842",
			"#466f30",
			"#78a44a"
		];
		for (let i = 0; i < 5200; i++) {
			const cx = r() * 512, cy = r() * 512, k = r();
			x.fillStyle = pick$1(greens, r);
			if (k < .45) {
				const s = 2.2 + r() * 2.4, a = r() * Math.PI * 2;
				for (let j = 0; j < 3; j++) {
					const b = a + j * Math.PI * 2 / 3;
					x.beginPath();
					x.arc(cx + Math.cos(b) * s, cy + Math.sin(b) * s, s * .95, 0, Math.PI * 2);
					x.fill();
				}
			} else if (k < .8) {
				const len = 6 + r() * 12, a = r() * Math.PI * 2;
				x.strokeStyle = pick$1(greens, r);
				x.lineWidth = 1 + r();
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
				x.stroke();
			} else {
				x.beginPath();
				x.ellipse(cx, cy, 2 + r() * 3, 1.5 + r() * 2, r() * Math.PI, 0, Math.PI * 2);
				x.fill();
			}
		}
	}),
	soil: () => canvasTexture("biome-soil", (x, r) => {
		base(x, r, [
			74,
			54,
			36
		], [
			116,
			88,
			60
		], 14);
		for (let i = 0; i < 1400; i++) {
			x.fillStyle = pick$1([
				"#8a8076",
				"#6a6058",
				"#a09486",
				"#5a4a3a"
			], r);
			x.beginPath();
			x.ellipse(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 2.4, r() * 3, 0, Math.PI * 2);
			x.fill();
		}
	})
};
/** @typedef {Partial<Record<Surface, number>>} Weights how much of the floor each surface takes (any scale) */
/**
* How much of the floor at x, z (world metres) each surface is: the same sums as the shader's. (Ground laid flat:
* its other axis runs −z.)
* @param {Weights} weights @param {number} x @param {number} z
* @returns {Record<Surface, number>}
*/
function surfacesAt(weights, x, z) {
	const u = x, v = -z;
	/** @type {Record<string, number>} */
	const out = {};
	let sum = 0;
	SURFACES.forEach((s, i) => {
		const w = weights[s] ?? 0;
		if (w <= 0) return out[s] = 0;
		const p = SURFACE[s].patch, f = fbm2(u / p + i * 17.3, v / p + i * 17.3);
		const v6 = w * Math.pow(.35 + f, 6);
		out[s] = v6;
		sum += v6;
	});
	for (const s of SURFACES) out[s] = sum > 0 ? out[s] / sum : 0;
	return out;
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
//#region src/lib/biomes/index.js
/** @typedef {import('./cover.js').Cover} Cover */
/** @typedef {import('./surfaces.js').Surface} Surface */
/**
* @typedef {object} Colony one kind of cover in a biome
* @property {Cover} kind
* @property {number} share how often it is met where its colonies are, against the others
* @property {number} colony how big its colonies are across (m)
* @property {number} spread how much of the ground its colonies take (0…1)
* @property {Surface} [on] the surface it grows on (it is met there, and seldom elsewhere)
* @property {number} [fill] how full its colonies are (0…1, 0.85 if not said)
* @property {string} [ref] the asset it is, as a biome's card names it (./card.js): the cover's kind at its seed; where a
*   biome says none, ./built.js `coverRef` of its kind and ./index.js `coverSeed`
*/
/**
* @typedef {object} Recipe a biome
* @property {string} id
* @property {string} label
* @property {string} note
* @property {string} from where it is used
* @property {Partial<Record<Surface, number>>} surface how much of the floor each surface takes
* @property {number} density how many plants (or things) of its cover stand on a square metre inside their colonies
* @property {Colony[]} cover
*/
/** @type {Recipe[]} */
const LIST$1 = [{
	id: "meadow",
	label: "Meadow",
	note: "Open and sunny: grasses tall and short, buttercups, daisies, red clover and cranesbill in drifts, now and then a patch of bare soil.",
	from: "The open ground round the forests",
	surface: {
		green: 9,
		soil: .6,
		moss: .4
	},
	density: 10,
	cover: [
		{
			kind: "grass",
			share: 8,
			colony: 6,
			spread: .8
		},
		{
			kind: "tallgrass",
			share: 6,
			colony: 5,
			spread: .6
		},
		{
			kind: "buttercup",
			share: 3,
			colony: 4,
			spread: .35
		},
		{
			kind: "daisy",
			share: 3,
			colony: 3,
			spread: .3
		},
		{
			kind: "clover",
			share: 3,
			colony: 3,
			spread: .35
		},
		{
			kind: "cranesbill",
			share: 2,
			colony: 4,
			spread: .3
		},
		{
			kind: "forgetmenot",
			share: .6,
			colony: 2,
			spread: .15
		}
	]
}];
/** the biomes, each with its version and history ($lib/app/versions.js) */
const BIOMES = /* @__PURE__ */ (() => versioned(LIST$1, "cover", {}))();
/**
* Which kind of a biome's cover stands at x, z (its index in `recipe.cover`), or −1 for none. Each kind grows in its
* colonies (its own noise, at its colony's size, over the threshold its spread sets) on the surface it belongs on;
* inside a colony its plants stand close (as many as the biome's density says a square metre holds), outside it none —
* so a wood anemone carpets its patch and leaves the next bare. Where colonies overlap, the kinds share the ground by
* their shares. `hidden`, the kinds to leave out (the explorer's toggles).
* @param {Recipe} recipe @param {() => number} r @param {number} x @param {number} z @param {Set<number>} [hidden]
*/
function coverAt(recipe, r, x, z, hidden) {
	const here = surfacesAt(recipe.surface, x, z);
	let empty = 1, total = 0;
	const w = recipe.cover.map((c, i) => {
		if (hidden?.has(i)) return 0;
		const f = fbm2(x / c.colony + i * 9.7 + 3.1, z / c.colony - i * 5.3);
		const cut = .5 + (.5 - c.spread) * .55;
		const m = Math.min(1, Math.max(0, (f - cut) / .04 + .5)) * (c.on ? Math.min(1, here[c.on] * 2.2 + .05) : 1), fill = c.fill ?? .85;
		empty *= 1 - fill * m;
		const v = c.share * fill * m;
		total += v;
		return v;
	});
	if (total <= 0 || r() < empty) return -1;
	let t = r() * total;
	for (let i = 0; i < w.length; i++) if ((t -= w[i]) < 0) return i;
	return w.length - 1;
}
/**
* The seed a kind of a biome's cover is built at: by its place in the recipe and its name, so each kind of a floor is
* built a little differently, and the same every time. @param {number} i @param {Cover} kind
*/
const coverSeed = (i, kind) => 7100 + i * 13 + kind.length * 31;

//#endregion
//#region src/lib/biomes/card.js
/** the specs' names, as the card shows them to people and a world reads them back */
const WEIGHT = "Weight";
const DENSITY = "Plants a square metre";
const SHARE = "Share";
const COLONY = "Colony across";
const SPREAD = "Ground its colonies take";
const FILL = "How full its colonies are";
const ON = "Grows on";
/** a number as a spec writes it: as it is, so it reads back the same @param {number} n */
const num = (n) => String(Number(n));
/**
* A biome's parts as a card's catalog: its surfaces and its cover, each with its numbers.
* @param {import('./index.js').Recipe} recipe
* @param {{ ref: (kind: string, i: number) => string, label: (kind: string) => string }} kinds the asset each kind of its
*   cover is, and its name
*/
function biomeCatalog(recipe, kinds) {
	const ground = SURFACES.filter((s) => (recipe.surface[s] ?? 0) > 0).map((s) => ({
		id: `ground-${s}`,
		label: SURFACE[s].label,
		assembly: "ground",
		what: "A surface of the ground, painted in patches that run into the others; its weight is how much of the floor it takes against them.",
		specs: [[WEIGHT, num(recipe.surface[s])]]
	}));
	const cover = recipe.cover.map((c, i) => ({
		id: `cover-${c.kind}`,
		label: kinds.label(c.kind),
		assembly: "cover",
		what: "A kind of the cover, standing in colonies of its own on the surface it belongs on.",
		ref: kinds.ref(c.kind, i),
		specs: [
			[SHARE, num(c.share)],
			[COLONY, `${num(c.colony)} m`],
			[SPREAD, num(c.spread)],
			...c.fill === void 0 ? [] : [[FILL, num(c.fill)]],
			...c.on ? [[ON, c.on]] : []
		]
	}));
	return {
		assemblies: [{
			id: "ground",
			label: "The ground",
			note: "The surfaces it is painted with, each in patches of its own size."
		}, {
			id: "cover",
			label: "The cover",
			note: "What grows and lies on it, kind by kind, each in its colonies."
		}],
		parts: [
			...ground,
			{
				id: "density",
				label: "How dense the cover stands",
				assembly: "cover",
				what: "How many plants (or things) of the cover stand on a square metre inside their colonies.",
				specs: [[DENSITY, num(recipe.density)]]
			},
			...cover
		]
	};
}

//#endregion
//#region src/lib/biomes/stream.js
/** @typedef {{ m: Float32Array, rank: Float32Array }[]} TileKinds each kind's plants in a tile, by rank, least first */
/**
* One tile of a biome's cover, worked out from its place alone (the same tile, the same plants, every time): each kind's
* plants in it (by its index in `recipe.cover`), their places and their ranks, least first.
* @param {import('./index.js').Recipe} recipe @param {number} ix @param {number} iz
* @param {{ tile?: number, seed?: number, density?: number, open?: (x: number, z: number) => boolean, origin?: [number, number], hidden?: Set<number> }} [o]
* @returns {TileKinds}
*/
function coverTile(recipe, ix, iz, o = {}) {
	const tile = o.tile ?? 12, seed = o.seed ?? 1, hidden = o.hidden ?? /* @__PURE__ */ new Set();
	const [ox, oz] = o.origin ?? [0, 0];
	const r = rng(ix * 73856093 ^ iz * 19349663 ^ seed * 83492791);
	/** @type {{ rank: number, m: THREE.Matrix4 }[][]} */
	const at = recipe.cover.map(() => []);
	const s = 1 / Math.sqrt(o.density ?? recipe.density), x0 = ix * tile, z0 = iz * tile;
	const q = new three.Quaternion(), up = new three.Vector3(0, 1, 0), p = new three.Vector3(), sc = new three.Vector3();
	for (let x = x0; x < x0 + tile; x += s) for (let z = z0; z < z0 + tile; z += s) {
		const px = x + r() * s, pz = z + r() * s;
		const k = coverAt(recipe, r, px + ox, pz + oz, hidden);
		const turn = r() * Math.PI * 2, size = .75 + r() * .6, rank = r();
		if (k < 0 || o.open && !o.open(px, pz)) continue;
		at[k]?.push({
			rank,
			m: new three.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size))
		});
	}
	return at.map((list) => {
		list.sort((a, b) => a.rank - b.rank);
		const m = new Float32Array(list.length * 16), rank = new Float32Array(list.length);
		list.forEach((e, i) => {
			e.m.toArray(m, i * 16);
			rank[i] = e.rank;
		});
		return {
			m,
			rank
		};
	});
}

//#endregion
//#region src/lib/biomes/patch.js
/** how far the patch reaches from its middle (m) */
const RADIUS = 6;
/** the side of the ground's picture (pixels): about 2.3 cm a pixel */
const PX = 512;
/** the tiles of the cover, as a world lays them (m) */
const TILE = 8;
/** a texture's pixels, to read the way a shader reads it (repeating, its rows upside down as three.js uploads them) */
function pixelsOf(t) {
	const c = t.image;
	const data = c?.getContext?.("2d")?.getImageData?.(0, 0, c.width, c.height)?.data;
	return data instanceof Uint8ClampedArray && data.length === c.width * c.height * 4 ? {
		data,
		w: c.width,
		h: c.height
	} : null;
}
/** sRGB to linear light, and back */
const lin = (v) => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055)));
const fract = (x) => x - Math.floor(x);
const smoothstep = (a, b, v) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/**
* The ground of the patch as one picture: the shader's sums (./surfaces.js `groundMaterial`) worked out for each of its
* pixels. Null where nothing can be painted (a stand-in canvas outside a page or the box: the card needs no picture).
* @param {import('./surfaces.js').Weights} weights @param {number} radius
*/
function groundPicture(weights, radius) {
	const layers = SURFACES.map((s, i) => ({
		s,
		i,
		w: weights[s] ?? 0
	})).filter((l) => l.w > 0);
	const px = layers.map((l) => pixelsOf(TEXTURES[l.s]()));
	if (px.some((p) => !p)) return null;
	const c = document.createElement("canvas");
	c.width = c.height = PX;
	const ctx = c.getContext("2d");
	const img = ctx?.createImageData?.(PX, PX);
	if (!(img?.data instanceof Uint8ClampedArray)) return null;
	const out = [
		0,
		0,
		0
	];
	const read = (p, u, v) => {
		const x = fract(u) * p.w - .5, y = (1 - fract(v)) * p.h - .5;
		const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
		for (let k = 0; k < 3; k++) {
			const at = (xx, yy) => p.data[((yy % p.h + p.h) % p.h * p.w + (xx % p.w + p.w) % p.w) * 4 + k];
			const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
			out[k] = lin(a + (b - a) * fy);
		}
		return out;
	};
	const cos = .8253, sin = .5646;
	for (let j = 0; j < PX; j++) for (let i = 0; i < PX; i++) {
		const bx = radius * ((i + .5) / PX * 2 - 1), by = radius * ((1 - (j + .5) / PX) * 2 - 1);
		const swap = smoothstep(.32, .68, vn(bx * .23 + 5.1, by * .23 + 5.1));
		let r = 0, g = 0, b = 0, sum = 0;
		layers.forEach((l, n) => {
			const P = SURFACE[l.s].patch, T = SURFACE[l.s].tile;
			const f = fbm2(bx / P + l.i * 17.3, by / P + l.i * 17.3), s = l.w * Math.pow(.35 + f, 6);
			const u = bx / T + l.i * .37, v = by / T + l.i * .37;
			const p = px[n];
			const [r1, g1, b1] = read(p, u, v);
			const [r2, g2, b2] = read(p, (cos * u - sin * v) * .83 + .41, (sin * u + cos * v) * .83 + .41);
			r += (r1 + (r2 - r1) * swap) * s;
			g += (g1 + (g2 - g1) * swap) * s;
			b += (b1 + (b2 - b1) * swap) * s;
			sum += s;
		});
		const shade = (.82 + .32 * fbm2(bx * .021 + 11, by * .021 + 11)) / Math.max(sum, 1e-5);
		const o = (j * PX + i) * 4;
		img.data[o] = srgb(r * shade);
		img.data[o + 1] = srgb(g * shade);
		img.data[o + 2] = srgb(b * shade);
		img.data[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	const t = new three.CanvasTexture(c);
	t.colorSpace = three.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
}
/**
* A biome's floor as a patch RADIUS metres round: its ground and its cover, its card's catalog its parts and numbers.
* @param {import('./index.js').Recipe} recipe
* @param {{ ref: (kind: string, i: number) => string }} kinds the asset each kind of its cover is
*/
function floorPatch(recipe, kinds) {
	const root = new three.Group();
	root.name = recipe.id;
	const picture = groundPicture(recipe.surface, 6);
	const ground = new three.Mesh(new three.CircleGeometry(6, 96).rotateX(-Math.PI / 2), new three.MeshStandardMaterial({
		color: picture ? "#ffffff" : "#5d6b3a",
		map: picture,
		roughness: 1
	}));
	ground.name = "ground";
	ground.receiveShadow = true;
	root.add(ground);
	const n = Math.ceil(6 / TILE);
	/** @type {number[][]} */
	const laid = recipe.cover.map(() => []);
	for (let ix = -1; ix < n; ix++) for (let iz = -1; iz < n; iz++) coverTile(recipe, ix, iz, { tile: TILE }).forEach(({ m }, k) => {
		for (let i = 0; i < m.length / 16; i++) if (Math.hypot(m[i * 16 + 12], m[i * 16 + 14]) < 5.85) laid[k]?.push(...m.subarray(i * 16, i * 16 + 16));
	});
	const at = new three.Matrix4();
	recipe.cover.forEach((c, k) => {
		const list = laid[k];
		if (!list.length) return;
		const built = COVER[c.kind].build(coverSeed(k, c.kind));
		/** @type {THREE.Mesh[]} */
		const meshes = [];
		built.updateMatrixWorld(true);
		built.traverse((o) => o.isMesh && meshes.push(o));
		const kind = new three.Group();
		kind.name = `cover-${c.kind}`;
		for (const mesh of meshes) {
			const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
			const copies = new three.InstancedMesh(geo, mesh.material, list.length / 16);
			for (let i = 0; i < copies.count; i++) copies.setMatrixAt(i, at.fromArray(list, i * 16));
			copies.castShadow = true;
			copies.receiveShadow = true;
			copies.computeBoundingSphere();
			kind.add(copies);
		}
		root.add(kind);
	});
	root.userData.catalog = biomeCatalog(recipe, {
		ref: kinds.ref,
		label: (kind) => COVER[kind].label
	});
	return root;
}

//#endregion
//#region src/lib/biomes/floors.js
/** the cover's version every biome's kinds are of (as ./built.js's HISTORY has it) */
const COVER_V = 1;
/**
* A biome's patch, its note and where it is met, each kind of its cover the cover's asset at its seed.
* @param {string} id
*/
const floor = (id) => {
	const b = BIOMES.find((x) => x.id === id);
	return {
		note: b.note,
		from: b.from,
		make: () => floorPatch(b, { ref: (kind, i) => `biomes/cover@${COVER_V}:${kind}?seed=${coverSeed(i, kind)}` })
	};
};
const FLOORS = /* @__PURE__ */ (() => [{
	id: "meadow",
	label: "Meadow",
	...floor("meadow")
}])();

//#endregion
//#region src/lib/biomes/built.js
/**
* the cover's older versions, with their frozen builders (none yet)
* @type {Record<string, import('../app/versions.js').Change[]>}
*/
const HISTORY = {};
const LIST = /* @__PURE__ */ (() => [...FLOORS])();
/** the biomes and the cover, their versions and history ($lib/app/versions.js): the `biomes` group's recipes */
const BUILT = /* @__PURE__ */ (() => versioned(LIST, "make", HISTORY))();

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
const recipe = (id, v, variant) => recipeIn("biomes", BUILT, id, v, variant);
const list = () => recipesIn(BUILT);

//#endregion
exports.list = list;
exports.recipe = recipe;