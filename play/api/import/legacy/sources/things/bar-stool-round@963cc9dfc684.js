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
//#region src/lib/sandbox-2/interior/spaces.ts
/**
* The master dome's working life: the ring under its gallery holds the
* village's workshops (co-working desks, a woodshop, an art studio, a pottery,
* a bakery and a cooking school, a library, a repair bench) and round it, just
* outside the arcade, a ring of café squares where people eat in the open.
*
* Each space is drawn in its own frame: x runs along the ring, +z points out
* toward the glass, and the space is placed on the ring by `place`. The
* workshops are Things of the library ($lib/models/domerooms.js), and the
* master dome puts copies of them down on its ring (./things.js `workshopsOf`).
*/
function stool(k, x, z, h = .62) {
	const g = new three.Group();
	g.add(k.box(.05, h, .05, k.dark, x, 0, z));
	const seat = new three.Mesh(new three.CylinderGeometry(.2, .2, .05, 14), k.oak);
	seat.position.set(x, h, z);
	g.add(seat);
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
function box(w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) {
	const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
	m.position.set(x, y + h / 2, z);
	m.rotation.y = rotY;
	m.castShadow = m.receiveShadow = true;
	return m;
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

//#endregion
//#region src/lib/models/domerooms.js
/** @typedef {import('$lib/sandbox-2/interior/spaces').Kit} Kit */
/** the domes' surfaces and furniture, as a dome lends them to its spaces; made once, when the first is built */
/** @type {Kit | null} */
let kit = null;
const kitOf = () => {
	if (kit) return kit;
	const m = mats();
	return kit = {
		box,
		table: (len, chairs) => table(m, len, chairs),
		sofa: (len) => sofa(m, len),
		lantern: (r, y) => lantern(m, r, y),
		oak: m.oak(1),
		lime: m.lime(1),
		stone: (rep) => m.stone(rep),
		dark: m.dark,
		steel: m.steel,
		counter: m.counter,
		timber: m.timberFrame,
		linen: m.linen,
		cushion: m.cushion,
		rug: m.rug,
		paper: m.paper
	};
};
/** @type {{ id: string, label: string, note: string, usedIn: string, make: () => THREE.Object3D }[]} */
const DOME_ROOMS = [{
	id: "bar-stool-round",
	label: "Round stool",
	note: "a round oak seat on a dark post, 62 cm high",
	usedIn: "Dome rooms",
	make: () => stool(kitOf(), 0, 0)
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