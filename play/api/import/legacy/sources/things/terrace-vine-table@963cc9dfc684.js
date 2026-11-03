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
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");

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
const shared$1 = (make) => {
	let v;
	return () => v ??= make();
};
const barkMat = /* @__PURE__ */ (() => shared$1(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
const fineLeafMat = /* @__PURE__ */ (() => shared$1(() => new three.MeshStandardMaterial({
	map: leaves("fine"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .7
})))();
const card = /* @__PURE__ */ (() => shared$1(() => new three.PlaneGeometry(1, 1)))();
const trunkGeo = /* @__PURE__ */ (() => shared$1(() => new three.CylinderGeometry(.7, 1, 1, 8, 1).translate(0, .5, 0)))();
const sphere = /* @__PURE__ */ (() => shared$1(() => {
	const g = new three.IcosahedronGeometry(1, 0);
	g.deleteAttribute("normal");
	g.deleteAttribute("uv");
	const round = (0, three_addons_utils_BufferGeometryUtils_js.mergeVertices)(g);
	round.computeVertexNormals();
	round.setAttribute("uv", new three.BufferAttribute(new Float32Array(round.attributes.position.count * 2), 2));
	return round;
}))();
const fruit = /* @__PURE__ */ (() => ({
	mango: shared$1(() => new three.MeshStandardMaterial({
		color: "#e7a13a",
		roughness: .45
	})),
	mangoRipe: shared$1(() => new three.MeshStandardMaterial({
		color: "#d9622f",
		roughness: .45
	})),
	avocado: shared$1(() => new three.MeshStandardMaterial({
		color: "#3c5a22",
		roughness: .7
	})),
	orange: shared$1(() => new three.MeshStandardMaterial({
		color: "#f39c1f",
		roughness: .5
	})),
	lemon: shared$1(() => new three.MeshStandardMaterial({
		color: "#f2d43d",
		roughness: .5
	})),
	coconut: shared$1(() => new three.MeshStandardMaterial({
		color: "#6b4a2a",
		roughness: .85
	})),
	banana: shared$1(() => new three.MeshStandardMaterial({
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
const garden = /* @__PURE__ */ (() => ({
	papaya: shared$1(() => new three.MeshStandardMaterial({
		color: "#e9a23b",
		roughness: .5
	})),
	papayaGreen: shared$1(() => new three.MeshStandardMaterial({
		color: "#7fa13a",
		roughness: .5
	})),
	fig: shared$1(() => new three.MeshStandardMaterial({
		color: "#5a2d4a",
		roughness: .6
	})),
	pomegranate: shared$1(() => new three.MeshStandardMaterial({
		color: "#b3242e",
		roughness: .45
	})),
	cacao: shared$1(() => new three.MeshStandardMaterial({
		color: "#c7812e",
		roughness: .6
	})),
	passion: shared$1(() => new three.MeshStandardMaterial({
		color: "#4b2551",
		roughness: .5
	})),
	strawberry: shared$1(() => new three.MeshStandardMaterial({
		color: "#d8253a",
		roughness: .45
	})),
	lettuce: shared$1(() => new three.MeshStandardMaterial({
		color: "#9ccc5a",
		roughness: .7,
		side: three.DoubleSide
	})),
	lettuceRed: shared$1(() => new three.MeshStandardMaterial({
		color: "#8a3f4a",
		roughness: .7,
		side: three.DoubleSide
	})),
	radish: shared$1(() => new three.MeshStandardMaterial({
		color: "#d2385a",
		roughness: .5
	})),
	kale: shared$1(() => new three.MeshStandardMaterial({
		color: "#3f6b4a",
		roughness: .8,
		side: three.DoubleSide
	})),
	tomato: shared$1(() => new three.MeshStandardMaterial({
		color: "#d93a26",
		roughness: .35
	})),
	cucumber: shared$1(() => new three.MeshStandardMaterial({
		color: "#3f6b2a",
		roughness: .5
	})),
	pepperRed: shared$1(() => new three.MeshStandardMaterial({
		color: "#c8221c",
		roughness: .3
	})),
	pepperYellow: shared$1(() => new three.MeshStandardMaterial({
		color: "#f0c22b",
		roughness: .3
	})),
	aubergine: shared$1(() => new three.MeshStandardMaterial({
		color: "#3a1d3f",
		roughness: .25
	})),
	bean: shared$1(() => new three.MeshStandardMaterial({
		color: "#6c9a35",
		roughness: .5
	})),
	chard: [
		shared$1(() => new three.MeshStandardMaterial({
			color: "#c8323f",
			roughness: .6
		})),
		shared$1(() => new three.MeshStandardMaterial({
			color: "#e7b830",
			roughness: .6
		})),
		shared$1(() => new three.MeshStandardMaterial({
			color: "#f1ecd9",
			roughness: .6
		}))
	],
	chardLeaf: shared$1(() => new three.MeshStandardMaterial({
		color: "#2f5a2a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stake: shared$1(() => new three.MeshStandardMaterial({
		color: "#b89a64",
		roughness: .9
	})),
	net: shared$1(() => new three.MeshStandardMaterial({
		color: "#e8e2d0",
		transparent: true,
		opacity: .35,
		side: three.DoubleSide,
		depthWrite: false
	})),
	olive: shared$1(() => new three.MeshStandardMaterial({
		map: leaves("fine"),
		color: "#c9d3b4",
		alphaTest: .45,
		side: three.DoubleSide,
		roughness: .8
	})),
	oliveFruit: shared$1(() => new three.MeshStandardMaterial({
		color: "#3c3a22",
		roughness: .4
	})),
	lavender: shared$1(() => new three.MeshStandardMaterial({
		color: "#8f74c9",
		roughness: .8
	})),
	sage: shared$1(() => new three.MeshStandardMaterial({
		color: "#7d9170",
		roughness: .8
	})),
	terracotta: shared$1(() => new three.MeshStandardMaterial({
		color: "#c0663f",
		roughness: .9
	}))
}))();
/** A low-poly ball for the small fruit, so a garden of them stays light once baked. */
const small = /* @__PURE__ */ (() => shared$1(() => new three.IcosahedronGeometry(1, 1)))();
const stickGeo = /* @__PURE__ */ (() => shared$1(() => new three.CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0)))();
const stick = (mat, x, z, h, r = .02) => {
	const m = new three.Mesh(stickGeo(), mat);
	m.scale.set(r, h, r);
	m.position.set(x, 0, z);
	return m;
};
/** A terracotta pot with a plant in it. */
function potted(kind, seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const big = kind === "olive" || kind === "lemon";
	const pr = (big ? .38 : .24) * size;
	const ph = (big ? .55 : .32) * size;
	const pot = new three.Mesh(new three.CylinderGeometry(pr, pr * .75, ph, 14), garden.terracotta());
	pot.position.y = ph / 2;
	g.add(pot);
	const rim = new three.Mesh(new three.TorusGeometry(pr, .03 * size, 5, 16), garden.terracotta());
	rim.rotation.x = Math.PI / 2;
	rim.position.y = ph;
	g.add(rim);
	if (kind === "olive") {
		const t = new three.Group();
		trunk(t, 1.1 * size, .07 * size, .15);
		t.position.y = ph;
		g.add(t);
		canopy(g, r, 0, ph + 1.4 * size, 0, .75 * size, .55 * size, 34, garden.olive(), .55 * size);
		hang(g, r, ph + 1.35 * size, .6 * size, .3, 14, garden.oliveFruit(), [
			.018,
			.024,
			.018
		]);
	} else if (kind === "lemon") {
		const t = new three.Group();
		trunk(t, .8 * size, .05 * size);
		t.position.y = ph;
		g.add(t);
		canopy(g, r, 0, ph + 1.1 * size, 0, .55 * size, .5 * size, 28, fineLeafMat(), .5 * size);
		hang(g, r, ph + 1.05 * size, .5 * size, .3, 10, fruit.lemon(), [
			.045,
			.055,
			.045
		]);
	} else if (kind === "lavender") for (let i = 0; i < 22; i++) {
		const a = r() * 6.28, d = r() * pr * .8;
		const s = stick(garden.sage(), Math.cos(a) * d, Math.sin(a) * d, .35 * size, .008);
		s.position.y = ph;
		s.rotation.set((r() - .5) * .6, 0, (r() - .5) * .6);
		g.add(s);
		const f = new three.Mesh(small(), garden.lavender());
		f.scale.set(.02, .06, .02);
		f.position.set(Math.cos(a) * d * 1.3, ph + .37 * size, Math.sin(a) * d * 1.3);
		g.add(f);
	}
	else canopy(g, r, 0, ph + .28 * size, 0, pr * 1.1, .3 * size, 16, garden.olive(), .28 * size);
	return mark(g, {
		potted: kind,
		ph,
		size
	});
}
const house = /* @__PURE__ */ (() => ({
	monstera: shared$1(() => new three.MeshStandardMaterial({
		color: "#2f6b3a",
		roughness: .55,
		side: three.DoubleSide
	})),
	fig: shared$1(() => new three.MeshStandardMaterial({
		color: "#3d7a3a",
		roughness: .45,
		side: three.DoubleSide
	})),
	snake: shared$1(() => new three.MeshStandardMaterial({
		color: "#4f7d3c",
		roughness: .6,
		side: three.DoubleSide
	})),
	pothos: shared$1(() => new three.MeshStandardMaterial({
		color: "#6aa84a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stem: shared$1(() => new three.MeshStandardMaterial({
		color: "#58743a",
		roughness: .8
	})),
	clay: shared$1(() => new three.MeshStandardMaterial({
		color: "#b9703f",
		roughness: .95
	})),
	basket: shared$1(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1
	}))
}))();
/** A leaf: a flat oval, with a notch cut into it for the monstera. */
const leafGeo = /* @__PURE__ */ (() => shared$1(() => {
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
//#region src/lib/sandbox-2/interior/rooms.ts
/**
* THE PRIVATE ROOMS — furnished the way a Waldorf school is built: few hard
* corners, walls and furniture of hand-smoothed plaster in soft lazure
* colours, oiled wood with rounded edges, and plants everywhere.
*
* Every room, between its two partition walls, from the walkway to the glass:
*   by the door   a curved plaster bench, a round table, stools, a niche shelf
*   in the middle a round rug, a wide bed facing out through the glass
*   by the glass  a natural stone bath, sunk in pebbles, looking at the forest
*   at the end    a round bathroom pod: a pebble-floored walk-in shower, a basin
*   everywhere    monstera, fiddle-leaf fig, snake plant, trailing pothos, olive
*/
const shared = (make) => {
	let v;
	return () => v ??= make();
};
/** Lazure plaster: warm white, peach, rose, sage, ochre. */
const PLASTER = /* @__PURE__ */ (() => [
	"#efe4d2",
	"#ecd1b8",
	"#e3c1b4",
	"#cfd8bf",
	"#ead6a8"
].map((c) => shared(() => new three.MeshStandardMaterial({
	color: c,
	roughness: .96,
	side: three.DoubleSide
}))))();
const M = /* @__PURE__ */ (() => ({
	wood: shared(() => new three.MeshStandardMaterial({
		color: "#b98a5a",
		roughness: .7
	})),
	darkWood: shared(() => new three.MeshStandardMaterial({
		color: "#8a6040",
		roughness: .7
	})),
	wool: shared(() => new three.MeshStandardMaterial({
		color: "#efe8da",
		roughness: 1
	})),
	felt: [
		"#b8674a",
		"#7d8f5c",
		"#c9a15a",
		"#6f7fa0"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: 1
	}))),
	stone: shared(() => new three.MeshStandardMaterial({
		color: "#a39d92",
		roughness: .85
	})),
	pebble: shared(() => new three.MeshStandardMaterial({
		color: "#8d877c",
		roughness: .9
	})),
	basket: shared(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1,
		side: three.DoubleSide
	})),
	water: shared(() => new three.MeshStandardMaterial({
		color: "#7fc9cf",
		roughness: .08,
		metalness: .1,
		transparent: true,
		opacity: .8
	})),
	brass: shared(() => new three.MeshStandardMaterial({
		color: "#b08d57",
		roughness: .35,
		metalness: .8
	})),
	book: [
		"#8a4b3a",
		"#4f6b5a",
		"#c9a15a",
		"#5b6a8a",
		"#a8683a"
	].map((c) => shared(() => new three.MeshStandardMaterial({
		color: c,
		roughness: .8
	})))
}))();
/** A rounded box, made once for each size and shared: every room asks for the same few. */
const rounded = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const round = (w, h, d, r = .08) => {
	const key = `${w} ${h} ${d} ${r}`;
	let geo = rounded.get(key);
	if (!geo) rounded.set(key, geo = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
	return geo;
};
/**
* The terraces' furniture: rounded, handmade, and never twice the same in a row.
* Built in a local frame: +z points out over the balustrade, the set centred on
* the origin; kind 0..3 picks which.
*/
function terraceSet(kind, seed) {
	const r = seeded(seed);
	const g = new three.Group();
	const plaster = PLASTER[seed % PLASTER.length]();
	const accent = M.felt[seed % M.felt.length]();
	if (kind === 0) {
		g.add(new three.Mesh(new three.CylinderGeometry(.75, .75, .06, 32), M.wood()).translateY(.74));
		g.add(new three.Mesh(new three.CylinderGeometry(.14, .34, .74, 16), M.darkWood()).translateY(.37));
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI * 2;
			g.add(new three.Mesh(new three.CylinderGeometry(.2, .17, .45, 18), M.wood()).translateX(Math.sin(a) * 1.15).translateY(.225).translateZ(Math.cos(a) * 1.15));
		}
		g.add(new three.Mesh(new three.SphereGeometry(.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.darkWood()).translateY(.94));
	} else if (kind === 1) {
		for (const x of [-.95, .95]) {
			const bed = new three.Group();
			bed.add(new three.Mesh(round(.8, .3, 1.9, .14), M.wood()).translateY(.15));
			bed.add(new three.Mesh(round(.74, .16, 1.8, .08), M.wool()).translateY(.38));
			const back = new three.Mesh(round(.74, .14, .7, .07), accent);
			back.position.set(0, .6, -.62);
			back.rotation.x = .7;
			bed.add(back);
			bed.position.x = x;
			g.add(bed);
		}
		g.add(new three.Mesh(new three.CylinderGeometry(.3, .3, .4, 20), plaster).translateY(.2));
	} else if (kind === 2) {
		const bench = new three.Mesh(new three.TorusGeometry(1.25, .24, 10, 28, Math.PI), plaster);
		bench.rotation.x = Math.PI / 2;
		bench.scale.z = 1.4;
		bench.position.set(0, .3, -.2);
		g.add(bench);
		for (let i = 0; i < 4; i++) {
			const a = Math.PI * (.15 + i / 3 * .7);
			g.add(new three.Mesh(round(.45, .1, .45, .05), accent).translateX(Math.cos(a) * 1.25).translateY(.58).translateZ(-.2 - Math.sin(a) * 1.25));
		}
		g.add(new three.Mesh(new three.CylinderGeometry(.5, .45, .4, 24), M.wood()).translateY(.2).translateZ(.35));
		for (const x of [-1.8, 1.8]) {
			g.add(new three.Mesh(new three.SphereGeometry(.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), plaster).translateX(x).translateY(.1).rotateX(Math.PI));
			const olive = potted("olive", seed + Math.round(x * 10), .9);
			olive.position.set(x, .1, 0);
			g.add(olive);
		}
	} else {
		const frame = new three.Mesh(new three.TorusGeometry(1.4, .07, 8, 24, Math.PI), M.wood());
		frame.position.y = .05;
		g.add(frame);
		for (const x of [-.7, .7]) {
			g.add(new three.Mesh(new three.CylinderGeometry(.015, .015, .7, 6), M.darkWood()).translateX(x).translateY(1.2));
			const egg = new three.Mesh(new three.SphereGeometry(.5, 20, 14, 0, Math.PI * 2, .35, Math.PI - .35), M.basket());
			egg.scale.set(1, 1.2, 1);
			egg.position.set(x, .85, 0);
			egg.rotation.x = -.25;
			g.add(egg);
			g.add(new three.Mesh(round(.55, .1, .5, .05), M.wool()).translateX(x).translateY(.52).translateZ(.05));
		}
		g.add(houseplant("monstera", seed + 3, 1.3).translateX(1.9));
	}
	for (let i = 0; i < 2; i++) {
		const kind = r() < .5 ? "lavender" : "rosemary";
		g.add(potted(kind, seed * 3 + i, 1.2).translateX(i ? 2.2 : -2.2).translateZ(.6));
	}
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
//#region src/lib/models/domerooms.js
/** @type {{ id: string, label: string, note: string, usedIn: string, make: () => THREE.Object3D }[]} */
const DOME_ROOMS = [{
	id: "terrace-vine-table",
	label: "Terrace: table under the vines",
	note: "a round table for six, round stools all round",
	usedIn: "Dome rooms",
	make: () => terraceSet(0, 40)
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