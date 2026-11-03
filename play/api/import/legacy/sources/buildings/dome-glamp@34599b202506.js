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
/** Irregular flagstones with sunken joints: a Voronoi of stones, each its own shade. */
let flagCache = null;
function flagstone() {
	if (flagCache) return flagCache;
	const size = 512;
	const r = rng(11);
	const pts = Array.from({ length: 42 }, () => [
		r() * size,
		r() * size,
		.85 + r() * .3
	]);
	const grain = fbm(size, 5, 8, 4);
	const edge = new Float32Array(size * size);
	const shade = new Float32Array(size * size);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		let d1 = 1e9, d2 = 1e9, s = 1;
		for (const [px, py, k] of pts) for (const ox of [
			-512,
			0,
			size
		]) for (const oy of [
			-512,
			0,
			size
		]) {
			const d = Math.hypot(x - px - ox, y - py - oy);
			if (d < d1) [d2, d1, s] = [
				d1,
				d,
				k
			];
			else if (d < d2) d2 = d;
		}
		edge[y * size + x] = d2 - d1;
		shade[y * size + x] = s;
	}
	return flagCache = {
		map: paint("flagstone", size, (img) => {
			for (let i = 0; i < size * size; i++) {
				const x = i % size, y = i / size | 0;
				const g = grain(x, y);
				const v = edge[i] < 3.2 ? .42 + g * .1 : (.7 + g * .22) * shade[i];
				set$1(img, i * 4, 205 * v, 196 * v, 178 * v);
			}
		}, 1),
		bump: paint("flagstone-bump", size, (img) => {
			for (let i = 0; i < size * size; i++) {
				const v = Math.min(1, edge[i] / 6) * 200 + grain(i % size, i / size | 0) * 55;
				set$1(img, i * 4, v, v, v);
			}
		}, 1, false)
	};
}
/** Pale limestone blocks in courses, for the pillars and knee walls. */
function limestone() {
	const size = 512;
	const grain = fbm(size, 21, 8, 5);
	const r = rng(3);
	const rows = 8;
	const offsets = Array.from({ length: rows }, () => r() * 256);
	const tints = Array.from({ length: 64 }, () => .9 + r() * .12);
	return paint("limestone", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const row = Math.floor(y / (size / rows));
			const bx = (x + offsets[row]) % size;
			const col = Math.floor(bx / (size / 4));
			const v = y % (size / rows) < 3 || bx % (size / 4) < 3 ? .66 : (.84 + grain(x, y) * .16) * tints[row * 8 + col];
			set$1(img, (y * size + x) * 4, 236 * v, 229 * v, 214 * v);
		}
	});
}
/** Oiled oak boards with grain running along them. */
function oak() {
	const size = 512;
	const grain = fbm(size, 31, 4, 4);
	const r = rng(8);
	const planks = 6;
	const tints = Array.from({ length: planks }, () => .85 + r() * .2);
	return paint("oak", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const p = Math.floor(y / (size / planks));
			const lines = Math.sin((y + grain(x * .2, y) * 60) * .35 + p * 7) * .5 + .5;
			const v = y % (size / planks) < 2 ? .45 : (.72 + lines * .14 + grain(x, y) * .14) * tints[p];
			set$1(img, (y * size + x) * 4, 181 * v, 128 * v, 78 * v);
		}
	});
}
/** Dark garden soil with mulch. */
function soil() {
	const size = 256;
	const grain = fbm(size, 41, 16, 4);
	const r = rng(9);
	return paint("soil", size, (img) => {
		for (let i = 0; i < size * size; i++) {
			const g = grain(i % size, i / size | 0);
			const speck = r() < .06 ? .25 : 0;
			const v = .5 + g * .35 + speck;
			set$1(img, i * 4, 96 * v, 70 * v, 48 * v);
		}
	});
}
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
/** A stream bed's water: cool green-blue with soft ripples. */
function water() {
	const size = 256;
	const grain = fbm(size, 61, 6, 4);
	return paint("water", size, (img) => {
		for (let i = 0; i < size * size; i++) {
			const g = grain(i % size, i / size | 0);
			set$1(img, i * 4, 58 + g * 40, 108 + g * 50, 112 + g * 45);
		}
	});
}
/**
* A card of leaves on transparent ground: broad glossy leaves for the fruit
* trees and the understorey. Drawn as tapered ellipses around a stem.
*/
function leaves(kind = "broad") {
	const key = `leaves-${kind}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const r = rng(kind === "broad" ? 71 : 73);
	const n = kind === "broad" ? 26 : 60;
	for (let i = 0; i < n; i++) {
		const x = 30 + r() * 196, y = 30 + r() * 196;
		const len = kind === "broad" ? 34 + r() * 30 : 14 + r() * 12;
		const a = r() * Math.PI * 2;
		const g = 90 + r() * 70;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(a);
		const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
		grad.addColorStop(0, `rgb(${40 + r() * 20},${g},${40 + r() * 20})`);
		grad.addColorStop(1, `rgb(${70 + r() * 30},${g + 40},${50 + r() * 25})`);
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.ellipse(0, 0, len / 2, len * (kind === "broad" ? .22 : .3), 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(210,235,170,0.5)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(-len / 2, 0);
		ctx.lineTo(len / 2, 0);
		ctx.stroke();
		ctx.restore();
	}
	const tex = new three.CanvasTexture(canvas);
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	cache.set(key, tex);
	return tex;
}
function grass() {
	const key = "grass";
	const hit = cache.get(key);
	if (hit) return hit;
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const x = canvas.getContext("2d");
	const base = fbm(size, 81, 6, 5);
	const img = x.createImageData(size, size);
	for (let i = 0; i < size * size; i++) {
		const g = base(i % size, i / size | 0);
		set$1(img, i * 4, 70 + g * 40, 112 + g * 48, 44 + g * 20);
	}
	x.putImageData(img, 0, 0);
	const r = rng(83);
	for (let i = 0; i < 9e3; i++) {
		const bx = r() * size, by = r() * size;
		const len = 4 + r() * 9, a = -Math.PI / 2 + (r() - .5) * 1.2;
		const dry = r() < .12;
		const gg = 110 + r() * 80;
		x.strokeStyle = dry ? `rgba(${170 + r() * 40},${160 + r() * 30},${90 + r() * 30},0.8)` : `rgba(${50 + r() * 50},${gg},${40 + r() * 30},0.75)`;
		x.lineWidth = .8 + r() * 1.1;
		x.beginPath();
		x.moveTo(bx, by);
		x.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
		x.stroke();
	}
	for (let i = 0; i < 260; i++) {
		const cx = r() * size, cy = r() * size;
		x.fillStyle = r() < .8 ? `rgba(60,${120 + r() * 40},50,0.9)` : [
			"#f4f1e8",
			"#e9d35a",
			"#b9a2d8"
		][Math.floor(r() * 3)];
		for (let k = 0; k < 3; k++) {
			x.beginPath();
			x.arc(cx + Math.cos(k * 2.1) * 2, cy + Math.sin(k * 2.1) * 2, 1.8, 0, Math.PI * 2);
			x.fill();
		}
	}
	const tex = new three.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = three.RepeatWrapping;
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	cache.set(key, tex);
	return tex;
}

//#endregion
//#region src/lib/assets/seeded.js
/** @param {number} seed */
function seeded(seed) {
	let state = seed >>> 0 || 1;
	return () => (state = state * 1664525 + 1013904223 >>> 0) / 4294967296;
}

//#endregion
//#region src/lib/sandbox-2/interior/plants.ts
/**
* The food forest under the glass: mango, avocado and citrus trees with their
* fruit hanging in them, coconut palms, bananas, an understorey of shrubs and
* beds of herbs. Geometry and materials are shared between every plant of a
* kind, so a dome can hold a hundred trees and stay light.
*/
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const barkMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
const leafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: leaves("broad"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .6
})))();
const fineLeafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: leaves("fine"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .7
})))();
const bananaStemMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	color: "#6f8a3f",
	roughness: .7
})))();
const bananaLeafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	color: "#5d9a3c",
	side: three.DoubleSide,
	roughness: .55
})))();
const card = /* @__PURE__ */ (() => shared(() => new three.PlaneGeometry(1, 1)))();
const trunkGeo = /* @__PURE__ */ (() => shared(() => new three.CylinderGeometry(.7, 1, 1, 8, 1).translate(0, .5, 0)))();
const sphere = /* @__PURE__ */ (() => shared(() => {
	const g = new three.IcosahedronGeometry(1, 0);
	g.deleteAttribute("normal");
	g.deleteAttribute("uv");
	const round = (0, three_addons_utils_BufferGeometryUtils_js.mergeVertices)(g);
	round.computeVertexNormals();
	round.setAttribute("uv", new three.BufferAttribute(new Float32Array(round.attributes.position.count * 2), 2));
	return round;
}))();
const fruit = /* @__PURE__ */ (() => ({
	mango: shared(() => new three.MeshStandardMaterial({
		color: "#e7a13a",
		roughness: .45
	})),
	mangoRipe: shared(() => new three.MeshStandardMaterial({
		color: "#d9622f",
		roughness: .45
	})),
	avocado: shared(() => new three.MeshStandardMaterial({
		color: "#3c5a22",
		roughness: .7
	})),
	orange: shared(() => new three.MeshStandardMaterial({
		color: "#f39c1f",
		roughness: .5
	})),
	lemon: shared(() => new three.MeshStandardMaterial({
		color: "#f2d43d",
		roughness: .5
	})),
	coconut: shared(() => new three.MeshStandardMaterial({
		color: "#6b4a2a",
		roughness: .85
	})),
	banana: shared(() => new three.MeshStandardMaterial({
		color: "#b8c34a",
		roughness: .6
	}))
}))();
/** A canopy of crossed leaf cards filling an ellipsoid. */
function canopy(group, r, cx, cy, cz, rx, ry, cards, mat, cardSize) {
	for (let i = 0; i < cards; i++) {
		const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = Math.cbrt(r());
		const m = new three.Mesh(card(), mat);
		m.position.set(cx + Math.sin(v) * Math.cos(u) * rx * d, cy + Math.cos(v) * ry * d, cz + Math.sin(v) * Math.sin(u) * rx * d);
		m.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
		m.scale.setScalar(cardSize * (.8 + r() * .5));
		m.castShadow = true;
		group.add(m);
	}
}
function hang(group, r, cy, rx, ry, n, mat, size) {
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, d = .55 + r() * .45;
		const m = new three.Mesh(sphere(), mat);
		m.position.set(Math.cos(a) * rx * d, cy - ry * (.2 + r() * .5), Math.sin(a) * rx * d);
		m.scale.set(...size);
		m.castShadow = true;
		group.add(m);
	}
}
function trunk(group, height, radius, lean = 0) {
	const t = new three.Mesh(trunkGeo(), barkMat());
	t.scale.set(radius, height, radius);
	t.rotation.z = lean;
	t.castShadow = true;
	group.add(t);
}
const mark = (o, legacy) => {
	o.userData.legacy = legacy;
	return o;
};
/** A broad fruit tree: mango, avocado or citrus. `scale` 1 is a mature tree of about six metres. */
function fruitTree(kind, seed, scale = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const h = (kind === "citrus" ? 2.2 : 3.2) * scale;
	const crown = (kind === "citrus" ? 1.6 : kind === "mango" ? 2.8 : 2.4) * scale;
	trunk(g, h, .16 * scale + .05, (r() - .5) * .12);
	for (let i = 0; i < 3; i++) {
		const limb = new three.Mesh(trunkGeo(), barkMat());
		limb.scale.set(.07 * scale, crown * .8, .07 * scale);
		limb.position.y = h * .85;
		limb.rotation.set((r() - .5) * 1.2, r() * Math.PI, (r() - .5) * 1.2);
		g.add(limb);
	}
	canopy(g, r, 0, h + crown * .55, 0, crown, crown * .75, Math.round(60 * scale + 30), kind === "citrus" ? fineLeafMat() : leafMat(), 1.3 * scale);
	if (kind === "mango") {
		hang(g, r, h + crown * .35, crown * .9, crown * .5, 14, fruit.mango(), [
			.05,
			.075,
			.045
		]);
		hang(g, r, h + crown * .35, crown * .9, crown * .5, 8, fruit.mangoRipe(), [
			.05,
			.075,
			.045
		]);
	} else if (kind === "avocado") hang(g, r, h + crown * .35, crown * .9, crown * .5, 16, fruit.avocado(), [
		.06,
		.09,
		.06
	]);
	else {
		hang(g, r, h + crown * .3, crown * .95, crown * .6, 18, fruit.orange(), [
			.06,
			.06,
			.06
		]);
		hang(g, r, h + crown * .3, crown * .95, crown * .6, 6, fruit.lemon(), [
			.05,
			.065,
			.05
		]);
	}
	return {
		object: mark(g, {
			plant: kind,
			size: scale
		}),
		radius: .35 * scale
	};
}
/** A banana plant: a green pseudostem, huge paddle leaves, and a hanging bunch. */
function banana(seed, height = 3.2) {
	const r = seeded(seed);
	const g = new three.Group();
	const stem = new three.Mesh(trunkGeo(), bananaStemMat());
	stem.scale.set(.16, height, .16);
	g.add(stem);
	const leaf = new three.Shape();
	leaf.moveTo(0, 0);
	leaf.quadraticCurveTo(.35, .9, 0, 2.2);
	leaf.quadraticCurveTo(-.35, .9, 0, 0);
	const leafGeo = new three.ShapeGeometry(leaf, 8);
	for (let i = 0; i < 9; i++) {
		const l = new three.Mesh(leafGeo, bananaLeafMat());
		l.position.y = height * (.85 + r() * .15);
		l.rotation.set(-.5 - r() * .8, i / 9 * Math.PI * 2, 0, "YXZ");
		l.scale.setScalar(.9 + r() * .4);
		l.castShadow = true;
		g.add(l);
	}
	const bunch = new three.Group();
	bunch.position.set(.25, height * .7, 0);
	for (let i = 0; i < 14; i++) {
		const b = new three.Mesh(sphere(), fruit.banana());
		b.position.set(Math.cos(i) * .1, -i * .04, Math.sin(i) * .1);
		b.scale.set(.03, .09, .03);
		bunch.add(b);
	}
	g.add(bunch);
	return {
		object: mark(g, {
			plant: "banana",
			size: height / 3.2
		}),
		radius: .25
	};
}
/** An understorey shrub — coffee, cacao, berries — about a metre high. */
function shrub(seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	canopy(g, r, 0, .55 * size, 0, .6 * size, .5 * size, 18, r() < .5 ? leafMat() : fineLeafMat(), .6 * size);
	if (r() < .5) hang(g, r, .6 * size, .5 * size, .3, 10, r() < .5 ? fruit.orange() : fruit.mangoRipe(), [
		.03,
		.03,
		.03
	]);
	return {
		object: mark(g, {
			plant: "shrub",
			size
		}),
		radius: 0
	};
}
/** A tuft of herbs or lettuce for the beds and the aquaponics troughs. */
function herb(seed, size = .3) {
	const r = seeded(seed);
	const g = new three.Group();
	canopy(g, r, 0, size * .5, 0, size, size * .6, 7, fineLeafMat(), size * .9);
	return mark(g, { herb: size });
}
const more = /* @__PURE__ */ (() => ({
	apple: shared(() => new three.MeshStandardMaterial({
		color: "#c23b2a",
		roughness: .5
	})),
	nut: shared(() => new three.MeshStandardMaterial({
		color: "#7b5a2e",
		roughness: .8
	})),
	berry: shared(() => new three.MeshStandardMaterial({
		color: "#5b1f3d",
		roughness: .5
	})),
	redBerry: shared(() => new three.MeshStandardMaterial({
		color: "#c8283a",
		roughness: .5
	})),
	flower: shared(() => new three.MeshStandardMaterial({
		color: "#9b7fd1",
		roughness: .7
	})),
	clover: shared(() => new three.MeshStandardMaterial({
		color: "#f4f1e8",
		roughness: .8
	})),
	pumpkin: shared(() => new three.MeshStandardMaterial({
		color: "#e0821f",
		roughness: .6
	})),
	grape: shared(() => new three.MeshStandardMaterial({
		color: "#4a2a5e",
		roughness: .4
	})),
	pole: shared(() => new three.MeshStandardMaterial({
		color: "#8a6a45",
		roughness: .9
	})),
	bigLeaf: shared(() => new three.MeshStandardMaterial({
		color: "#4f8a38",
		roughness: .6,
		side: three.DoubleSide
	}))
}))();
/** Layer 5 — ground cover: a low carpet of clover, white flowers in it. */
function clover(seed, size = 1.2) {
	const r = seeded(seed);
	const g = new three.Group();
	for (let i = 0; i < 12; i++) {
		const c = new three.Mesh(card(), fineLeafMat());
		c.rotation.set(-Math.PI / 2 + (r() - .5) * .5, 0, r() * 6.28);
		c.position.set((r() - .5) * size, .05 + r() * .05, (r() - .5) * size);
		c.scale.setScalar(.45);
		g.add(c);
	}
	for (let i = 0; i < 6; i++) {
		const f = new three.Mesh(sphere(), more.clover());
		f.position.set((r() - .5) * size, .12, (r() - .5) * size);
		f.scale.setScalar(.025);
		g.add(f);
	}
	return g;
}
const garden = /* @__PURE__ */ (() => ({
	papaya: shared(() => new three.MeshStandardMaterial({
		color: "#e9a23b",
		roughness: .5
	})),
	papayaGreen: shared(() => new three.MeshStandardMaterial({
		color: "#7fa13a",
		roughness: .5
	})),
	fig: shared(() => new three.MeshStandardMaterial({
		color: "#5a2d4a",
		roughness: .6
	})),
	pomegranate: shared(() => new three.MeshStandardMaterial({
		color: "#b3242e",
		roughness: .45
	})),
	cacao: shared(() => new three.MeshStandardMaterial({
		color: "#c7812e",
		roughness: .6
	})),
	passion: shared(() => new three.MeshStandardMaterial({
		color: "#4b2551",
		roughness: .5
	})),
	strawberry: shared(() => new three.MeshStandardMaterial({
		color: "#d8253a",
		roughness: .45
	})),
	lettuce: shared(() => new three.MeshStandardMaterial({
		color: "#9ccc5a",
		roughness: .7,
		side: three.DoubleSide
	})),
	lettuceRed: shared(() => new three.MeshStandardMaterial({
		color: "#8a3f4a",
		roughness: .7,
		side: three.DoubleSide
	})),
	radish: shared(() => new three.MeshStandardMaterial({
		color: "#d2385a",
		roughness: .5
	})),
	kale: shared(() => new three.MeshStandardMaterial({
		color: "#3f6b4a",
		roughness: .8,
		side: three.DoubleSide
	})),
	tomato: shared(() => new three.MeshStandardMaterial({
		color: "#d93a26",
		roughness: .35
	})),
	cucumber: shared(() => new three.MeshStandardMaterial({
		color: "#3f6b2a",
		roughness: .5
	})),
	pepperRed: shared(() => new three.MeshStandardMaterial({
		color: "#c8221c",
		roughness: .3
	})),
	pepperYellow: shared(() => new three.MeshStandardMaterial({
		color: "#f0c22b",
		roughness: .3
	})),
	aubergine: shared(() => new three.MeshStandardMaterial({
		color: "#3a1d3f",
		roughness: .25
	})),
	bean: shared(() => new three.MeshStandardMaterial({
		color: "#6c9a35",
		roughness: .5
	})),
	chard: [
		shared(() => new three.MeshStandardMaterial({
			color: "#c8323f",
			roughness: .6
		})),
		shared(() => new three.MeshStandardMaterial({
			color: "#e7b830",
			roughness: .6
		})),
		shared(() => new three.MeshStandardMaterial({
			color: "#f1ecd9",
			roughness: .6
		}))
	],
	chardLeaf: shared(() => new three.MeshStandardMaterial({
		color: "#2f5a2a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stake: shared(() => new three.MeshStandardMaterial({
		color: "#b89a64",
		roughness: .9
	})),
	net: shared(() => new three.MeshStandardMaterial({
		color: "#e8e2d0",
		transparent: true,
		opacity: .35,
		side: three.DoubleSide,
		depthWrite: false
	})),
	olive: shared(() => new three.MeshStandardMaterial({
		map: leaves("fine"),
		color: "#c9d3b4",
		alphaTest: .45,
		side: three.DoubleSide,
		roughness: .8
	})),
	oliveFruit: shared(() => new three.MeshStandardMaterial({
		color: "#3c3a22",
		roughness: .4
	})),
	lavender: shared(() => new three.MeshStandardMaterial({
		color: "#8f74c9",
		roughness: .8
	})),
	sage: shared(() => new three.MeshStandardMaterial({
		color: "#7d9170",
		roughness: .8
	})),
	terracotta: shared(() => new three.MeshStandardMaterial({
		color: "#c0663f",
		roughness: .9
	}))
}))();
/** A low-poly ball for the small fruit, so a garden of them stays light once baked. */
const small = /* @__PURE__ */ (() => shared(() => new three.IcosahedronGeometry(1, 1)))();
/** a small round thing seen only up close (a radish's shoulder): twenty faces */
const tiny = /* @__PURE__ */ (() => shared(() => new three.IcosahedronGeometry(1, 0)))();
const stickGeo = /* @__PURE__ */ (() => shared(() => new three.CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0)))();
const stick = (mat, x, z, h, r = .02) => {
	const m = new three.Mesh(stickGeo(), mat);
	m.scale.set(r, h, r);
	m.position.set(x, 0, z);
	return m;
};
/** Strawberries for ground cover: low leaves, red berries showing. */
function strawberries(seed, size = .9) {
	const g = clover(seed, size);
	const r = seeded(seed + 1);
	for (let i = 0; i < 8; i++) {
		const b = new three.Mesh(small(), garden.strawberry());
		b.position.set((r() - .5) * size, .07, (r() - .5) * size);
		b.scale.set(.028, .035, .028);
		g.add(b);
	}
	return g;
}
function lettuceHead(g, r, x, z, red) {
	const leaf = new three.CircleGeometry(.1, 6);
	for (let i = 0; i < 8; i++) {
		const l = new three.Mesh(leaf, red && i % 2 ? garden.lettuceRed() : garden.lettuce());
		const a = i / 8 * Math.PI * 2 + r();
		l.position.set(x + Math.cos(a) * .06, .08 + i % 3 * .02, z + Math.sin(a) * .06);
		l.rotation.set(-.6 - r() * .5, a, 0, "YXZ");
		g.add(l);
	}
}
const CROPS = [
	"lettuce",
	"tomato",
	"cucumber",
	"pepper",
	"chard",
	"beans",
	"aubergine",
	"strawberry",
	"herbs"
];
function crop(kind, seed, len) {
	const r = seeded(seed);
	const g = new three.Group();
	const along = (step, f, rows = [-.25, .25]) => {
		for (let x = -len / 2 + step / 2; x < len / 2; x += step) rows.forEach((z, i) => f(x + (i % 2 ? step / 2 : 0) * .5, z));
	};
	if (kind === "lettuce") along(.32, (x, z) => lettuceHead(g, r, x, z, r() < .35), [
		-.3,
		0,
		.3
	]);
	else if (kind === "radish") along(.16, (x, z) => {
		const leaf = new three.CircleGeometry(.045, 5);
		for (let i = 0; i < 5; i++) {
			const l = new three.Mesh(leaf, garden.lettuce());
			const a = i / 5 * Math.PI * 2 + r();
			l.position.set(x + Math.cos(a) * .035, .07 + r() * .02, z + Math.sin(a) * .035);
			l.rotation.set(-.9 - r() * .4, a, 0, "YXZ");
			g.add(l);
		}
		const root = new three.Mesh(tiny(), garden.radish());
		root.position.set(x, .015, z);
		root.scale.setScalar(.022 + r() * .01);
		g.add(root);
	}, [
		-.32,
		-.11,
		.11,
		.32
	]);
	else if (kind === "kale") along(.42, (x, z) => {
		const leaf = new three.CircleGeometry(.11, 7);
		for (let i = 0; i < 7; i++) {
			const l = new three.Mesh(leaf, i % 3 ? garden.kale() : garden.lettuce());
			const a = i / 7 * Math.PI * 2 + r();
			l.position.set(x + Math.cos(a) * .07, .12 + i * .025, z + Math.sin(a) * .07);
			l.rotation.set(-.35 - r() * .3, a, 0, "YXZ");
			l.scale.set(.8, 1.4, 1);
			g.add(l);
		}
	});
	else if (kind === "tomato") along(.6, (x, z) => {
		g.add(stick(garden.stake(), x, z, 1.6));
		canopy(g, r, x, .85, z, .25, .7, 14, fineLeafMat(), .35);
		for (let i = 0; i < 9; i++) {
			const t = new three.Mesh(small(), i < 6 ? garden.tomato() : garden.papayaGreen());
			t.position.set(x + (r() - .5) * .4, .4 + r() * 1, z + (r() - .5) * .4);
			t.scale.setScalar(.04);
			g.add(t);
		}
	});
	else if (kind === "cucumber") {
		for (const x of [
			-len / 2 + .1,
			0,
			len / 2 - .1
		]) for (const side of [-1, 1]) {
			const pole = stick(garden.stake(), x, side * .35, 1.9);
			pole.rotation.x = side * .18;
			g.add(pole);
		}
		for (const side of [-1, 1]) {
			const net = new three.Mesh(card(), garden.net());
			net.scale.set(len - .2, 1.8, 1);
			net.position.set(0, .95, side * .2);
			net.rotation.x = side * .18;
			g.add(net);
			for (let i = 0; i < len * 14; i++) {
				const c = new three.Mesh(card(), leafMat());
				const y = .2 + r() * 1.6;
				c.position.set(-len / 2 + .2 + r() * (len - .4), y, side * (.36 - y * .18));
				c.rotation.set(r() * 3, r() * 3, r() * 3);
				c.scale.setScalar(.3);
				g.add(c);
			}
			for (let i = 0; i < len * 3; i++) {
				const f = new three.Mesh(small(), garden.cucumber());
				const y = .3 + r() * 1.2;
				f.position.set(-len / 2 + .3 + r() * (len - .6), y, side * (.42 - y * .18));
				f.scale.set(.025, .1, .025);
				g.add(f);
			}
		}
	} else if (kind === "pepper" || kind === "aubergine") along(.5, (x, z) => {
		canopy(g, r, x, .35, z, .22, .2, 9, leafMat(), .28);
		for (let i = 0; i < 5; i++) {
			const f = new three.Mesh(small(), kind === "aubergine" ? garden.aubergine() : r() < .5 ? garden.pepperRed() : garden.pepperYellow());
			f.position.set(x + (r() - .5) * .3, .2 + r() * .2, z + (r() - .5) * .3);
			f.scale.set(kind === "aubergine" ? .05 : .035, kind === "aubergine" ? .1 : .06, kind === "aubergine" ? .05 : .035);
			g.add(f);
		}
	});
	else if (kind === "chard") along(.35, (x, z) => {
		for (let i = 0; i < 6; i++) {
			const a = r() * 6.28;
			const stem = stick(garden.chard[Math.floor(r() * 3)](), x, z, .3, .012);
			stem.rotation.set(Math.cos(a) * .35, 0, Math.sin(a) * .35);
			g.add(stem);
			const l = new three.Mesh(card(), garden.chardLeaf());
			l.scale.set(.16, .28, 1);
			l.position.set(x + Math.sin(a) * .1, .42, z + Math.cos(a) * .1);
			l.rotation.set(-.3, a, 0, "YXZ");
			g.add(l);
		}
	});
	else if (kind === "beans") along(1.1, (x) => {
		for (let k = 0; k < 4; k++) {
			const a = k / 4 * Math.PI * 2;
			const cane = stick(garden.stake(), x + Math.cos(a) * .3, Math.sin(a) * .3, 2.1, .015);
			cane.rotation.set(-Math.sin(a) * .15, 0, Math.cos(a) * .15);
			g.add(cane);
		}
		canopy(g, r, x, 1, 0, .3, .9, 30, fineLeafMat(), .3);
		for (let i = 0; i < 14; i++) {
			const pod = new three.Mesh(small(), garden.bean());
			pod.position.set(x + (r() - .5) * .5, .4 + r() * 1.3, (r() - .5) * .5);
			pod.scale.set(.012, .08, .012);
			g.add(pod);
		}
	}, [0]);
	else if (kind === "strawberry") along(.45, (x, z) => g.add(strawberries(seed + Math.round(x * 10), .4).translateX(x).translateZ(z)));
	else along(.3, (x, z) => g.add(herb(seed + Math.round(x * 100 + z * 10), .18 + r() * .1).translateX(x).translateZ(z)), [
		-.3,
		0,
		.3
	]);
	g.traverse((o) => o.castShadow = false);
	return mark(g, {
		crop: kind,
		len
	});
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
//#region src/lib/assets/register.js
/**
* @template {{ id: string }} T
* @param {T[]} items
* @param {keyof T} key
* @param {Record<string, (import('../app/versions.js').Change & { build?: any })[]>} [history]
*/
function registerAssets(items, key, history = {}) {
	const ids = /* @__PURE__ */ new Set();
	for (const item of items) {
		if (!item.id || /[@:?/]/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate asset identity: ${item.id}`);
		ids.add(item.id);
		const changes = history[item.id];
		if (changes && (!changes.length || changes.some((change, index) => change.v !== index + 1 || !/^\d{4}-\d{2}-\d{2}$/.test(change.date)))) throw new Error(`Invalid asset history: ${item.id}`);
	}
	const registered = versioned(items, key, history);
	for (const item of registered) for (const version of item.versions) {
		if (!version.kept) continue;
		const build = version.build;
		if (typeof build === "function") continue;
		if (!Array.isArray(build) || !build.length) throw new Error(`Missing builder: ${item.id}@${version.v}`);
		const variants = /* @__PURE__ */ new Set();
		for (const variant of build) {
			if (!variant.id || variants.has(variant.id) || typeof variant.make !== "function") throw new Error(`Invalid variant: ${item.id}@${version.v}`);
			variants.add(variant.id);
		}
	}
	return registered;
}

//#endregion
//#region src/lib/sandbox-2/interior/interior.ts
/**
* INSIDE A DOME — a walkable, first-person interior for each dome of a village:
*
*   glamp   16 m   a home for four under canvas and glass, a door onto a deck
*   home    40 m   the small domes of the first ring
*   large   70 m   the medium domes of the second ring
*   grand  100 m   the large dome: a green middle, and on its north a sunken pond with a waterfall, the wall behind closed stone
*   master 136 m   the master dome in the centre: a round theatre sunk into its floor,
*                  and its ground ring given to the village's workshops (Things of the
*                  library, built in the asset box: ./things.js)
*
* The big domes have four doors, one to each point of the compass (the
* glamping dome one), and every dome stands in a
* seven-layer food forest with streams and paths. The big domes follow one
* plan. The private rooms are on galleries round the edge — two floors of them
* in the large and master domes — facing out through the glass onto terraces
* carried on a stone arcade. The ground floor is shared:
* a stone plaza in the middle, paths winding through a food forest of mango,
* avocado, citrus, banana and coconut, a stream running to a pond, raised
* beds, and under the gallery the kitchen and the aquaponics.
*
* Noon sun, a physical sky for the light and reflections, real-world surfaces
* painted at runtime (textures.ts), plants from plants.ts.
*/
const DOMES = {
	tent: {
		label: "Bell tent",
		people: "two people",
		diameter: 4.2,
		detail: 0,
		strut: 0
	},
	glamp: {
		label: "Glamping dome",
		people: "four people",
		diameter: 16,
		detail: 3,
		strut: .06
	},
	home: {
		label: "Small dome",
		people: "twelve people",
		diameter: 40,
		detail: 4,
		strut: .09,
		gallery: {
			height: 4.2,
			depth: 8,
			rooms: 6,
			floors: 1
		}
	},
	large: {
		label: "Medium dome",
		people: "twenty-four people",
		diameter: 70,
		detail: 5,
		strut: .12,
		gallery: {
			height: 5,
			depth: 10.5,
			rooms: 10,
			floors: 2
		}
	},
	grand: {
		label: "Large dome",
		people: "forty-eight people",
		diameter: 100,
		detail: 6,
		strut: .14,
		gallery: {
			height: 5.5,
			depth: 11.5,
			rooms: 12,
			floors: 2
		}
	},
	master: {
		label: "Master dome",
		people: "the commons",
		diameter: 136,
		detail: 7,
		strut: .16,
		gallery: {
			height: 6,
			depth: 12.5,
			rooms: 16,
			floors: 2
		}
	},
	factory: {
		label: "Solar factory dome",
		people: "the factory coop",
		diameter: 136,
		detail: 7,
		strut: .16
	}
};
/** The big domes have four doors, one to each point of the compass; the glamping dome has one; the large dome
*  none to the north, where its pond lies against a closed wall. */
const DOORS = /* @__PURE__ */ (() => [
	0,
	Math.PI / 2,
	Math.PI,
	-Math.PI / 2
])();
const doorsOf = (kind) => kind === "glamp" || kind === "tent" ? [0] : kind === "grand" ? DOORS.slice(1) : DOORS;
/** The large dome's closed north: its shell north of this line (z, a seventh of the dome's width in from the north
*  wall) is massive stone, over its pond. Null in every other dome. */
const tankLine = (kind, R) => kind === "grand" ? R - 2 * R / 7 : null;
/** A door's half-width, and its height at the top of the arch (the glamping door is square-headed). */
const doorSize = (kind) => kind === "tent" ? {
	dw: .55,
	dh: 1.8,
	top: 1.8
} : kind === "glamp" ? {
	dw: .75,
	dh: 2.5,
	top: 2.5
} : {
	dw: 1.3,
	dh: 3,
	top: 3.52
};
/** The signed difference between two angles, in -π..π. */
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** A texture tiled to a world size: `metres` of surface per repeat of the image. */
function tiled(tex, repeatX, repeatY = repeatX) {
	const t = tex.clone();
	t.repeat.set(repeatX, repeatY);
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.needsUpdate = true;
	return t;
}
/**
* The low sun on the glass: the panels that face it glow warm, most where they are seen at a grazing angle. Off (0)
* unless a film shot turns it up (its `glass` light); the world sets where the sun is every frame. Shared by every
* dome's glass, near or far.
*/
const glassSheen = /* @__PURE__ */ (() => ({
	uGlassSheen: { value: 0 },
	uGlassSheenColor: { value: new three.Color("#ffb070") },
	uGlassSun: { value: new three.Vector3(0, 1, 0) }
}))();
function withSheen(m) {
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, glassSheen);
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uGlassSheen;\nuniform vec3 uGlassSheenColor;\nuniform vec3 uGlassSun;").replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
				if ( uGlassSheen > 0.0 ) {
					vec3 sunV = normalize( ( viewMatrix * vec4( uGlassSun, 0.0 ) ).xyz );
					float facing = max( dot( normal, sunV ), 0.0 );
					float grazing = pow( 1.0 - abs( dot( normal, normalize( vViewPosition ) ) ), 2.0 );
					totalEmissiveRadiance += uGlassSheenColor * uGlassSheen * facing * ( 0.35 + 0.65 * grazing );
				}`);
	};
	m.customProgramCacheKey = () => "glass-sheen";
	return m;
}
/**
* The dome's panels are solar glass: clear glass with rows of cells laid in it,
* lightly tinted, with gaps between the cells so the light still falls through
* to the forest inside. One triangle of it, drawn once, on every panel.
*/
let solarCache = null;
function solarGlass() {
	if (solarCache) return solarCache;
	const s = 256;
	const c = document.createElement("canvas");
	c.width = c.height = s;
	const x = c.getContext("2d");
	x.fillStyle = "rgba(220,238,242,0.10)";
	x.fillRect(0, 0, s, s);
	x.save();
	x.beginPath();
	x.moveTo(s / 2, s * .1);
	x.lineTo(s * .92, s * .9);
	x.lineTo(s * .08, s * .9);
	x.closePath();
	x.clip();
	for (let yy = 0; yy < s; yy += 26) for (let xx = 0; xx < s; xx += 26) {
		x.fillStyle = "rgba(24,40,86,0.55)";
		x.fillRect(xx + 5, yy + 5, 17, 17);
		x.fillStyle = "rgba(210,216,226,0.5)";
		x.fillRect(xx + 5, yy + 12, 17, 1);
	}
	x.restore();
	const tex = new three.CanvasTexture(c);
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	solarCache = withSheen(new three.MeshPhysicalMaterial({
		map: tex,
		color: "#ffffff",
		roughness: .06,
		metalness: .1,
		transparent: true,
		envMapIntensity: 1.4,
		side: three.DoubleSide,
		depthWrite: false
	}));
	return solarCache;
}
/**
* The surfaces are shared: every call for oak at the same scale, in any dome, gets the
* same material. A dome that asked for a new one each time had nearly two thousand, and
* every one of them cost the graphics card its own work.
*/
const surfaces = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
function surface(key, make) {
	let s = surfaces.get(key);
	if (!s) surfaces.set(key, s = make());
	return s;
}
const k2 = (v) => Math.round(v * 20) / 20;
/**
* The lawn: the grass texture laid down in world space, about three metres to a
* tile, so it never stretches whatever shape the ground is; and a slow drift
* of lighter and darker patches over tens of metres, so no two stretches of
* meadow look the same.
*/
let meadowCache = null;
function meadow() {
	if (meadowCache) return meadowCache;
	const mat = new three.MeshStandardMaterial({
		map: grass(),
		roughness: 1
	});
	mat.onBeforeCompile = (sh) => {
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGround;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvec4 gp = modelMatrix * vec4(position, 1.0);\nvGround = gp.xz;\nvMapUv = gp.xz / 3.2;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vGround;").replace("#include <map_fragment>", "#include <map_fragment>\nfloat drift = texture2D(map, vGround / 61.0).g * 0.6 + texture2D(map, vGround / 23.0 + 0.3).r * 0.4;\ndiffuseColor.rgb *= mix(0.78, 1.18, drift);");
	};
	mat.customProgramCacheKey = () => "meadow";
	return meadowCache = mat;
}
/**
* The surfaces a dome is made of. The painted ones are painted when first asked for (the flagstone, the solar glass,
* the meadow): a sofa or a lantern on its own then paints only what it is made of, not the whole dome's, which made
* every dome-room thing take about three seconds to build from cold.
*/
const mats = () => {
	return {
		stone: (rx, ry = rx) => surface(`stone ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(flagstone().map, k2(rx), k2(ry)),
			bumpMap: tiled(flagstone().bump, k2(rx), k2(ry)),
			bumpScale: 2,
			roughness: .85
		})),
		lime: (rx, ry = rx) => surface(`lime ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(limestone(), k2(rx), k2(ry)),
			roughness: .9
		})),
		oak: (rx, ry = rx) => surface(`oak ${k2(rx)} ${k2(ry)}`, () => new three.MeshStandardMaterial({
			map: tiled(oak(), k2(rx), k2(ry)),
			roughness: .82,
			envMapIntensity: .4
		})),
		soil: (rep) => surface(`soil ${k2(rep)}`, () => new three.MeshStandardMaterial({
			map: tiled(soil(), k2(rep)),
			roughness: 1
		})),
		water: (rep) => surface(`water ${k2(rep)}`, () => new three.MeshPhysicalMaterial({
			map: tiled(water(), k2(rep)),
			roughness: .08,
			metalness: 0,
			transparent: true,
			opacity: .88,
			envMapIntensity: 1.4
		})),
		steel: new three.MeshStandardMaterial({
			color: "#2e3236",
			roughness: .4,
			metalness: .7
		}),
		timberFrame: new three.MeshStandardMaterial({
			color: "#9c6b3f",
			roughness: .6
		}),
		get solar() {
			return solarGlass();
		},
		glass: withSheen(new three.MeshPhysicalMaterial({
			color: "#eef6f4",
			roughness: .04,
			metalness: 0,
			transparent: true,
			opacity: .1,
			envMapIntensity: 1.5,
			side: three.DoubleSide,
			depthWrite: false
		})),
		canvas: new three.MeshStandardMaterial({
			color: "#efe8da",
			roughness: .95,
			side: three.DoubleSide
		}),
		linen: new three.MeshStandardMaterial({
			color: "#f1ece2",
			roughness: .95
		}),
		cushion: new three.MeshStandardMaterial({
			color: "#c47a4a",
			roughness: .9
		}),
		sofa: new three.MeshStandardMaterial({
			color: "#c9b596",
			roughness: .95
		}),
		counter: new three.MeshStandardMaterial({
			color: "#f3f1ec",
			roughness: .3
		}),
		dark: new three.MeshStandardMaterial({
			color: "#23262a",
			roughness: .5,
			metalness: .4
		}),
		paper: new three.MeshStandardMaterial({
			color: "#fff4e2",
			emissive: "#ffd9a0",
			emissiveIntensity: .6,
			roughness: .9
		}),
		rug: new three.MeshStandardMaterial({
			color: "#b9a589",
			roughness: 1
		}),
		pebble: new three.MeshStandardMaterial({
			color: "#8d8a83",
			roughness: .9
		}),
		tank: new three.MeshStandardMaterial({
			color: "#56666b",
			roughness: .5,
			metalness: .3
		}),
		get grass() {
			return meadow();
		}
	};
};
/** Polar placement: angle 0 faces +z, clockwise to +x — the same sense as three's cylinders. */
const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
function box(w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) {
	const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
	m.position.set(x, y + h / 2, z);
	m.rotation.y = rotY;
	m.castShadow = m.receiveShadow = true;
	return m;
}
/**
* The geodesic shell: triangles of an icosphere above the ground, and a strut
* on every edge. At each of the four doors the lowest panels are left out; the
* hole is measured and returned, so a portal wall can close it round the door.
*/
function geodesic(spec, m, kind) {
	const R = spec.diameter / 2;
	const p = new three.IcosahedronGeometry(R, spec.detail).attributes.position;
	const glass = [];
	const clear = [];
	const cloth = [];
	const wall = [];
	const tankZ = tankLine(kind, R);
	const edges = /* @__PURE__ */ new Map();
	const key = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
	const tris = [];
	for (let i = 0; i < p.count; i += 3) {
		const tri = [
			0,
			1,
			2
		].map((k) => new three.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
		if ((tri[0].y + tri[1].y + tri[2].y) / 3 < -R * .02) continue;
		for (const v of tri) v.y = Math.max(0, v.y);
		const c = tri.reduce((s, v) => s.clone().add(v), new three.Vector3()).divideScalar(3);
		tris.push({
			tri,
			c,
			ca: Math.atan2(c.x, c.z)
		});
	}
	const { dw, top } = doorSize(kind);
	const skip = /* @__PURE__ */ new Set();
	const holes = [];
	for (const d of doorsOf(kind)) {
		const tang = (v) => v.x * Math.cos(d) - v.z * Math.sin(d);
		const inDoorway = (v) => Math.abs(tang(v)) < dw + .35 && v.y < top + .35;
		const cand = tris.map((t, i) => ({
			i,
			t
		})).filter(({ t }) => Math.abs(adiff(t.ca, d)) < Math.PI / 4);
		const nearest = Math.min(...cand.filter(({ t }) => t.c.y < R * .3).map(({ t }) => Math.abs(tang(t.c))));
		let halfWidth = 0, height = 0, depth = Infinity;
		for (const { i, t } of cand) {
			const [a, b, c] = t.tri;
			let hit = kind === "glamp" && t.c.y < R * .3 && Math.abs(tang(t.c)) <= nearest + .6;
			if (kind === "glamp" && !hit) continue;
			for (let u = 0; u <= 6 && !hit; u++) for (let w = 0; w <= 6 - u && !hit; w++) hit = inDoorway(a.clone().multiplyScalar(u / 6).addScaledVector(b, w / 6).addScaledVector(c, (6 - u - w) / 6));
			if (!hit) continue;
			skip.add(i);
			for (const v of t.tri) {
				halfWidth = Math.max(halfWidth, Math.abs(tang(v)));
				height = Math.max(height, v.y);
				depth = Math.min(depth, v.x * Math.sin(d) + v.z * Math.cos(d));
			}
		}
		holes.push({
			a: d,
			halfWidth,
			height,
			depth
		});
	}
	tris.forEach(({ tri, c, ca }, i) => {
		if (skip.has(i)) return;
		const isWindow = kind !== "glamp" || c.y > R * .78 || Math.abs(ca) < 1.8 && c.y > R * .08 && c.y < R * .62;
		const gal = spec.gallery;
		const byRooms = gal && [gal.height, ...gal.floors === 2 ? [gal.height + 3.6] : []].some((f) => c.y > f - .4 && c.y < f + 3.4);
		(tankZ !== null && c.z > tankZ ? wall : !isWindow ? cloth : byRooms ? clear : glass).push(...tri.flatMap((v) => [
			v.x,
			v.y,
			v.z
		]));
		for (let k = 0; k < 3; k++) {
			const a = tri[k], b = tri[(k + 1) % 3];
			const id = [key(a), key(b)].sort().join("|");
			if (!edges.has(id)) edges.set(id, [a.clone(), b.clone()]);
		}
	});
	const g = new three.Group();
	const shell = (arr, mat, shadow) => {
		if (!arr.length) return;
		const geo = new three.BufferGeometry();
		geo.setAttribute("position", new three.Float32BufferAttribute(arr, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(Array.from({ length: arr.length / 9 }, () => [
			.5,
			.9,
			.92,
			.1,
			.08,
			.1
		]).flat(), 2));
		geo.computeVertexNormals();
		const mesh = new three.Mesh(geo, mat);
		mesh.castShadow = shadow;
		mesh.renderOrder = 2;
		g.add(mesh);
	};
	shell(glass, m.solar, false);
	shell(clear, m.glass, false);
	shell(cloth, m.canvas, true);
	if (wall.length) {
		const stone = m.lime(1).clone();
		stone.side = three.DoubleSide;
		stone.color.set("#cfc3ad");
		shell(wall, stone, true);
	}
	const strut = new three.CylinderGeometry(spec.strut, spec.strut, 1, 6);
	const inst = new three.InstancedMesh(strut, kind === "glamp" ? m.timberFrame : m.steel, edges.size);
	const mtx = new three.Matrix4(), q = new three.Quaternion(), up = new three.Vector3(0, 1, 0);
	let i = 0;
	for (const [a, b] of edges.values()) {
		const d = b.clone().sub(a);
		q.setFromUnitVectors(up, d.clone().normalize());
		mtx.compose(a.clone().add(b).multiplyScalar(.5), q, new three.Vector3(1, d.length(), 1));
		inst.setMatrixAt(i++, mtx);
	}
	inst.castShadow = true;
	g.add(inst);
	return {
		group: g,
		holes
	};
}
/**
* A portal: the wall that closes a door hole in the shell — canvas on the
* glamping dome, limestone on the big ones — with an opening, a timber frame,
* and the glazed door standing open.
*/
function portal(m, hole, kind) {
	const g = new three.Group();
	const W = hole.halfWidth + .15;
	const Ht = Math.max(hole.height, 3.2);
	const { dw, dh } = doorSize(kind);
	const spring = dh - dw * .6;
	const shape = new three.Shape();
	shape.moveTo(-W, 0);
	shape.lineTo(W, 0);
	shape.lineTo(W, Ht);
	shape.lineTo(-W, Ht);
	shape.closePath();
	const opening = new three.Path();
	opening.moveTo(-dw, 0);
	opening.lineTo(dw, 0);
	if (kind === "glamp") opening.lineTo(dw, dh), opening.lineTo(-dw, dh);
	else opening.lineTo(dw, spring), opening.absarc(0, spring, dw, 0, Math.PI, false);
	opening.lineTo(-dw, 0);
	shape.holes.push(opening);
	const geo = new three.ShapeGeometry(shape, 16);
	const wall = new three.Mesh(geo, kind === "glamp" ? m.canvas : m.lime(1 / 3.2, 1 / 3.2));
	wall.material.side = three.DoubleSide;
	wall.castShadow = wall.receiveShadow = true;
	g.add(wall);
	if (kind === "glamp") {
		g.add(box(.18, dh, .3, m.timberFrame, -dw - .05, 0, 0));
		g.add(box(.18, dh, .3, m.timberFrame, dw + .05, 0, 0));
		g.add(box(dw * 2 + .3, .2, .32, m.timberFrame, 0, dh, 0));
	} else {
		const trim = m.lime(.5, 1);
		for (const side of [-1, 1]) g.add(box(.4, spring, .5, trim, side * (dw + .2), 0, 0));
		const arch = new three.Mesh(new three.TorusGeometry(dw + .2, .22, 8, 24, Math.PI), trim);
		arch.scale.z = 1.1;
		arch.position.y = spring;
		arch.castShadow = true;
		g.add(arch);
	}
	const leaf = new three.Group();
	leaf.add(box(dw, dh - .15, .05, m.glass, dw / 2, 0, 0));
	leaf.add(box(.07, dh - .15, .07, m.timberFrame, 0, 0, 0));
	leaf.add(box(.07, dh - .15, .07, m.timberFrame, dw, 0, 0));
	leaf.position.set(dw, 0, .1);
	leaf.rotation.y = -1.9;
	g.add(leaf);
	const [x, z] = polar(hole.depth - .08, hole.a);
	g.position.set(x, 0, z);
	g.rotation.y = hole.a;
	return g;
}
function bed(m, w = 1.6) {
	const g = new three.Group();
	g.add(box(w + .1, .35, 2.1, m.oak(1)));
	g.add(box(w, .2, 2, m.linen, 0, .35));
	g.add(box(w * .4, .14, .4, m.linen, -w * .22, .55, -.75));
	g.add(box(w * .4, .14, .4, m.linen, w * .22, .55, -.75));
	g.add(box(w, .06, .9, m.cushion, 0, .55, .45));
	g.add(box(w + .1, .9, .08, m.oak(1), 0, 0, -1.05));
	return g;
}
function sofa(m, len = 2.4) {
	const g = new three.Group();
	g.add(box(len, .42, .95, m.sofa));
	g.add(box(len, .45, .25, m.sofa, 0, .42, -.36));
	for (let i = 0; i < 3; i++) g.add(box(.45, .4, .14, m.cushion, (i - 1) * len * .3, .5, -.22));
	return g;
}
function table(m, len, chairs) {
	const g = new three.Group();
	g.add(box(len, .06, .95, m.oak(1), 0, .72));
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.07, .72, .07, m.dark, sx * (len / 2 - .15), 0, sz * .38));
	for (let i = 0; i < chairs; i++) {
		const x = i % Math.ceil(chairs / 2) * (len / Math.ceil(chairs / 2)) - len / 2 + len / chairs;
		const z = i < chairs / 2 ? -.75 : .75;
		g.add(box(.45, .45, .45, m.oak(1), x, 0, z));
		g.add(box(.45, .5, .05, m.oak(1), x, .45, z + (z < 0 ? -.2 : .2)));
	}
	return g;
}
function lantern(m, r, y) {
	const g = new three.Group();
	const s = new three.Mesh(new three.SphereGeometry(r, 20, 12), m.paper);
	s.scale.y = .72;
	s.position.y = y;
	g.add(s);
	const cable = new three.Mesh(new three.CylinderGeometry(.008, .008, 3, 4), m.dark);
	cable.position.y = y + 1.5;
	g.add(cable);
	return g;
}
/**
* The glamping dome's inside, in `scene` round its middle: its v1 in Sandbox 3 (raised here, `raiseInterior`), and from
* its v2 the asset box's (../../buildings/glamp.js). `addLamp` hangs a lamp (its light, and with `floor` a cone of it),
* `glowMat` is what a lamp's shade glows with. Hands back the things in the way and where it is walked in from.
*/
function glampInside({ scene, R, m, addLamp, glowMat }) {
	const colliders = [];
	const floor = new three.Mesh(new three.CircleGeometry(R, 64), m.oak(R / 1.5));
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = .01;
	floor.receiveShadow = true;
	scene.add(floor);
	const at = (rr, a) => polar(rr, a);
	const put = (o, rr, a, face = a + Math.PI, collide = 0) => {
		const [x, z] = at(rr, a);
		o.position.set(x, o.position.y, z);
		o.rotation.y = face;
		scene.add(o);
		if (collide) colliders.push({
			x,
			z,
			r: collide
		});
	};
	const rug = new three.Mesh(new three.CircleGeometry(1.8, 40), m.rug);
	rug.rotation.x = -Math.PI / 2;
	rug.position.y = .02;
	put(rug, 4.4, -1.05);
	rug.rotation.set(-Math.PI / 2, 0, 0);
	put(sofa(m, 2.8), 5.6, -1.05, -1.05 + Math.PI, 1.4);
	put(box(1.1, .4, .6, m.oak(1)), 4.2, -1.05, -1.05, .6);
	put(box(.6, .75, .55, m.dark), 6.6, -1.75, -1.75 + Math.PI, .5);
	const [fx, fz] = at(6.6, -1.75);
	const flue = new three.Mesh(new three.CylinderGeometry(.08, .08, R * .9, 10), m.dark);
	flue.position.set(fx * .9, .75 + R * .9 / 2, fz * .9);
	scene.add(flue);
	put(box(1.2, 2, .4, m.oak(1)), 6.9, -.55, -.55 + Math.PI);
	for (let k = 0; k < 4; k++) {
		const a = .85 + k * .17;
		put(box(1.05, .9, .62, m.oak(1)), 7, a, a + Math.PI, .55);
		put(box(1.08, .05, .66, m.counter), 7, a, a + Math.PI);
		const c = scene.children[scene.children.length - 1];
		c.position.y = .9;
	}
	put(box(1, .9, .5, m.dark), 7.1, 1.55, 1.55 + Math.PI);
	put(table(m, 1.6, 4), 4.6, 1.2, 1.2 + Math.PI / 2, 1.2);
	const screen = (rr0, rr1, a) => {
		const [x, z] = at((rr0 + rr1) / 2, a);
		scene.add(box(.1, 2.2, rr1 - rr0, m.oak(.5, 1), x, 0, z, a));
	};
	for (const a of [
		2.35,
		2.95,
		-2.95,
		-2.35
	]) screen(3.4, 7.2, a);
	put(bed(m, 1.7), 6.2, 2.65, 2.65 + Math.PI, 1.1);
	put(bed(m, .95), 6.2, 3.02, 3.14, .7);
	put(bed(m, .95), 6.2, -3.02, 3.14, .7);
	const pod = new three.Mesh(new three.CylinderGeometry(1.2, 1.2, 2.3, 24, 1, true, .5, Math.PI * 2 - 1), m.oak(3, 1));
	pod.material.side = three.DoubleSide;
	const [px, pz] = at(5.9, -2.65);
	pod.position.set(px, 1.15, pz);
	pod.rotation.y = -2.65 + Math.PI;
	scene.add(pod);
	colliders.push({
		x: px,
		z: pz,
		r: 1.25
	});
	const planter = new three.Mesh(new three.CylinderGeometry(1.3, 1.4, .55, 32), m.lime(3, .3));
	planter.position.y = .275;
	scene.add(planter);
	const planterSoil = new three.Mesh(new three.CircleGeometry(1.25, 32), m.soil(1));
	planterSoil.rotation.x = -Math.PI / 2;
	planterSoil.position.y = .56;
	scene.add(planterSoil);
	const lemon = fruitTree("citrus", 77, .75);
	lemon.object.position.y = .55;
	scene.add(lemon.object);
	colliders.push({
		x: 0,
		z: 0,
		r: 1.5
	});
	for (let k = 0; k < 6; k++) {
		const h = herb(80 + k, .25);
		const [hx, hz] = at(.9, k);
		h.position.set(hx, .56, hz);
		scene.add(h);
	}
	for (const a of [
		-.55,
		.55,
		1.95
	]) {
		const patch = crop(CROPS[Math.round(a * 10 + 20) % CROPS.length], 90 + Math.round(a * 10), 2.2);
		patch.position.y = .02;
		put(patch, 7.3, a, a + Math.PI / 2, .9);
	}
	for (let k = 0; k < 5; k++) {
		const potA = -1.9 + k * .28;
		const pot = new three.Mesh(new three.CylinderGeometry(.28, .22, .45, 16), m.dark);
		const [x, z] = at(7.4, potA);
		pot.position.set(x, .22, z);
		scene.add(pot);
		const plant = k % 2 ? shrub(120 + k, 1.1) : banana(130 + k, 1.6);
		plant.object.position.set(x, .4, z);
		scene.add(plant.object);
	}
	scene.add(lantern(m, .4, 3.4));
	const l2 = lantern(m, .3, 2.6);
	const [lx, lz] = at(4.6, 1.2);
	l2.position.set(lx, 0, lz);
	scene.add(l2);
	addLamp(0, 3.1, 0, 16, 11, .56);
	addLamp(lx, 2.35, lz, 10, 8, 0);
	for (const [rr, a, base] of [
		[
			6.4,
			1.1,
			10
		],
		[
			5.8,
			2.65,
			6
		],
		[
			5.8,
			-3.02,
			6
		],
		[
			5.4,
			-1.05,
			8
		]
	]) {
		const [x, z] = at(rr, a);
		scene.add(box(.3, .06, .3, glowMat, x, 2.45, z));
		addLamp(x, 2.3, z, base, 7);
	}
	const gh = 1.1 / R;
	const plinth = new three.Mesh(new three.CylinderGeometry(R + .35, R + .45, .45, 96, 1, true, gh, Math.PI * 2 - 2 * gh), m.lime(Math.PI * R / 1.5, .3));
	plinth.material.side = three.DoubleSide;
	plinth.position.y = .2;
	scene.add(plinth);
	const deck = new three.Mesh(new three.CircleGeometry(3.4, 48), m.oak(4));
	deck.rotation.x = -Math.PI / 2;
	deck.position.set(0, .04, R + 2.2);
	deck.receiveShadow = true;
	scene.add(deck);
	const outTable = table(m, 1.2, 4);
	outTable.position.set(1.8, .06, R + 2.4);
	scene.add(outTable);
	colliders.push({
		x: 1.8,
		z: R + 2.4,
		r: 1.1
	});
	return {
		colliders,
		start: {
			x: 0,
			z: R - 2.2,
			look: 0
		}
	};
}

//#endregion
//#region src/lib/buildings/glamp.js
/** The glamping dome: its shell, its door and the home inside it, the middle of its floor at the origin. */
function glampDome() {
	const spec = DOMES.glamp;
	const R = spec.diameter / 2;
	const m = mats();
	const g = new three.Group();
	g.name = "glamping-dome";
	const shell = geodesic(spec, m, "glamp");
	g.add(shell.group);
	for (const hole of shell.holes) g.add(portal(m, hole, "glamp"));
	const glow = new three.MeshStandardMaterial({
		color: "#fff0d0",
		emissive: "#ffc070",
		emissiveIntensity: .1,
		roughness: .5
	});
	const home = glampInside({
		scene: g,
		R,
		m,
		addLamp: () => {},
		glowMat: glow
	});
	g.userData = { walk: {
		x: home.start.x,
		z: home.start.z,
		yaw: home.start.look,
		lamps: []
	} };
	return g;
}

//#endregion
//#region src/lib/buildings/built.js
/** @typedef {import('$lib/models').Model} Model */
/**
* the buildings' older versions, by id, each with its frozen builder (the tent's, the factory's and the glamping
* dome's v1, Sandbox 3's interiors, have none here; every other one is at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: () => import('three').Object3D })[]>}
*/
const HISTORY = { "dome-glamp": [{
	v: 1,
	date: "2026-10-05",
	note: "Sandbox 3’s glamping dome: its interior, raised by that world’s own code (./inside.js)"
}, {
	v: 2,
	date: "2026-10-26",
	note: "Built in the asset box, so the Maia City vault can hold it: the same shell and door, the home for four round its garden, the stone ring and the deck, as by day; walked in by its own shape"
}] };
/** the shipping containers, fitted out to walk in */
/** @type {Omit<Model, 'versions' | 'version'>[]} */
const CONTAINER_LIST = [];
/** @type {Model[]} */
const CONTAINERS = /* @__PURE__ */ (() => registerAssets(CONTAINER_LIST, "make", HISTORY))();
/** the wayside of MaiaCity V1: buildings on the dusty highway and at the village centre, and the places they make
*  together; and at its end the bell tent (./tent.js), the solar factory dome (./factory.js) and the glamping
*  dome (./glamp.js) from their v2, which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
const WAYSIDE_LIST = /* @__PURE__ */ (() => [{
	id: "dome-glamp",
	label: "Glamping dome",
	group: "Tents and domes",
	note: "the first home after the tents: a home for four in zones round a garden under the skylight, the living room by its wood stove, the kitchen along the glass, two sleeping nooks and the bathroom behind timber screens, a deck at its door. Walk in",
	usedIn: "Sandbox 3",
	make: () => glampDome()
}])();
/** @type {(Model & { group: string })[]} */
const WAYSIDE = /* @__PURE__ */ (() => registerAssets(WAYSIDE_LIST, "make", HISTORY))();
/** every building built as one object, in the viewer's order: the `buildings` group's recipes */
const BUILT = /* @__PURE__ */ (() => [...CONTAINERS, ...WAYSIDE])();

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
const recipe = (id, v, variant) => recipeIn("buildings", BUILT, id, v, variant);
const list = () => recipesIn(BUILT);

//#endregion
exports.list = list;
exports.recipe = recipe;