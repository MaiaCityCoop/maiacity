/*
 * PAPAYA (Carica papaya), version 2 — grown from its seed through ten stages to ripe fruit, by real days.
 *
 * What a papaya is, and what this draws:
 *   - One soft, hollow, unbranched stem. It makes a new leaf at its tip every two to three days (a spiral, ~137°
 *     apart). Each leaf lives two to three months, then yellows, hangs down along the stem and falls, leaving a
 *     broad crescent scar. So the stem is green at the top, grey below and covered in a spiral of leaf scars.
 *   - The leaves: a blade 50–70 cm across, palmately cut into seven to nine lobes, each lobe lobed again, pale veins
 *     above, a paler underside, on a hollow stalk up to 80 cm long. Young leaves stand up folded, mature ones spread
 *     out into an umbrella, old ones droop below the horizontal.
 *   - From about five months, a cream five-petalled flower in the axil of each new leaf, right on the stem. Some set
 *     fruit: big oblong berries on short stalks, crowded round the stem in a column under the leaves, the oldest
 *     (lowest) ripening first, yellow from the blossom end, about five months after the flower.
 *   - A thick, fleshy, cream tap root and a wide spread of shallow side roots.
 *
 * How it is built:
 *   - Every organ draws its own chance by name from the seed (`chance(seed, 'leaf', i)`), so leaf 40 is the same leaf
 *     at every stage and the plant grows rather than being redrawn; another seed grows a sister plant.
 *   - One clock in days: a node (a leaf, its axil's flower and fruit, and later its scar) is made at its own day; its
 *     age at the stage's day decides everything about it.
 *   - Leaf blades are a polar mesh carrying a picture of the leaf drawn here, pixel by pixel (its lobes, veins and
 *     colour), cut out by an alpha map; the stem's bark is a picture of its colour and scars, with a bump map.
 *   - Fruit are placed round the stem by a search at their full size, oldest first, so none pierces another or the
 *     stem, and a flower whose fruit has no room drops, as on a real papaya. The search doesn't depend on the stage, so
 *     the fruit at every stage are the same fruit.
 *   - Everything else is swept tubes and sheets painted by vertex colours, merged per material.
 *
 * Parameters: stage (0 seed … 9 ripe, fractional stages grow in between), seed (any text), detail (1 full … 0.05
 * light, for crowds), fruit (0 the plant, 1 one fruit with a cut half beside it).
 */
'use strict';
const THREE = require('three');
const { mergeGeometries } = require('three/addons/utils/BufferGeometryUtils.js');

/* ------------------------------------------------------------------------------------------- chance and maths */

function hashOf(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** a stream of numbers in [0, 1) for one organ, by the seed and its name */
function chance(seed, ...keys) {
	let s = hashOf(`${seed}|${keys.join('|')}`);
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => {
	const t = clamp(x);
	return t * t * (3 - 2 * t);
};
/** 0 before a, 1 after b, smooth between */
const span = (x, a, b) => smooth((x - a) / (b - a));
const between = (r, a, b) => a + (b - a) * r();
const about = (r, x, d) => x * (1 + (r() * 2 - 1) * d);

/** a value from a table of [x, y] rows, straight between them */
function table(x, rows) {
	if (x <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		const [x1, y1] = rows[i];
		if (x <= x1) {
			const [x0, y0] = rows[i - 1];
			return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
		}
	}
	return rows[rows.length - 1][1];
}

/** …and smooth between them */
function curve(x, rows) {
	if (x <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		const [x1, y1] = rows[i];
		if (x <= x1) {
			const [x0, y0] = rows[i - 1];
			return lerp(y0, y1, smooth((x - x0) / (x1 - x0)));
		}
	}
	return rows[rows.length - 1][1];
}

/** where a rising table reaches y (its inverse) */
function inverse(y, rows) {
	if (y <= rows[0][1]) return rows[0][0];
	for (let i = 1; i < rows.length; i++) {
		const [x1, y1] = rows[i];
		if (y <= y1) {
			const [x0, y0] = rows[i - 1];
			return x0 + ((x1 - x0) * (y - y0)) / Math.max(1e-9, y1 - y0);
		}
	}
	const [xa, ya] = rows[rows.length - 2], [xb, yb] = rows[rows.length - 1];
	return xb + ((y - yb) * (xb - xa)) / Math.max(1e-9, yb - ya);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const HEX = new Map();
/** a colour by its hex (parsed once and kept: they are asked for per vertex and per pixel) */
const colour = (hex) => {
	if (typeof hex !== 'string') return new THREE.Color(hex);
	let c = HEX.get(hex);
	if (!c) HEX.set(hex, (c = new THREE.Color(hex)));
	return c.clone();
};
const mix = (a, b, t) => colour(a).lerp(colour(b), clamp(t));

/** value noise on a lattice, optionally repeating every `wrap` cells in x */
function noise2(x, y, s, wrap = 0) {
	const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
	const h = (i, j) => {
		if (wrap) i = ((i % wrap) + wrap) % wrap;
		let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
		n = Math.imul(n ^ (n >>> 13), 1274126177);
		return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
	};
	const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
	return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

function fbm(x, y, s, octaves = 4, wrap = 0) {
	let a = 0.5, f = 1, t = 0, n = 0;
	for (let o = 0; o < octaves; o++) {
		t += a * noise2(x * f, y * f, s + o * 17, wrap ? wrap * f : 0);
		n += a;
		a *= 0.5;
		f *= 2;
	}
	return t / n;
}

/* ------------------------------------------------------------------------------------------- detail */

/** how finely this build is drawn: 1 in full, less for crowds */
const D = { level: 1 };
const res = (n, least) => Math.max(least, Math.round(n * Math.min(1, D.level)));

/* ------------------------------------------------------------------------------------------- geometry */

/** a geometry from plain arrays (every one of ours has position, normal, uv and colour, so they merge) */
function geometryOf(pos, nor, uv, col, index, normals = false) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor.length ? nor : new Array(pos.length).fill(0), 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	g.setIndex(index);
	if (normals) g.computeVertexNormals();
	return g;
}

/**
 * A tube swept along points: `radius(t, a)` (m) and `paint(t, a)` (a colour) at t along it (0 … 1 by length) and a
 * around it (0 … 1). Its frame is carried along without twisting.
 */
function tube(points, radius, paint, sides = 8, { cap = false } = {}) {
	sides = res(sides, 3);
	const n = points.length;
	if (n < 2) return null;
	const len = [0];
	for (let i = 1; i < n; i++) len.push(len[i - 1] + points[i].distanceTo(points[i - 1]));
	const total = len[n - 1] || 1;
	const pos = [], nor = [], uv = [], col = [], index = [];
	let normal = null, prev = null;
	const tan = new THREE.Vector3(), bi = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion();
	for (let i = 0; i < n; i++) {
		tan.copy(points[Math.min(n - 1, i + 1)]).sub(points[Math.max(0, i - 1)]);
		if (tan.lengthSq() < 1e-16) tan.copy(prev ?? UP);
		tan.normalize();
		if (!normal) {
			normal = Math.abs(tan.y) < 0.9 ? new THREE.Vector3().crossVectors(tan, UP).normalize() : new THREE.Vector3().crossVectors(tan, V(1, 0, 0)).normalize();
		} else if (prev) {
			q.setFromUnitVectors(prev, tan);
			normal.applyQuaternion(q).normalize();
		}
		prev = (prev ?? new THREE.Vector3()).copy(tan);
		bi.crossVectors(tan, normal).normalize();
		const t = len[i] / total;
		const dt = 1 / Math.max(2, n - 1);
		for (let k = 0; k <= sides; k++) {
			const a = k / sides, ang = a * Math.PI * 2;
			d.copy(normal).multiplyScalar(Math.cos(ang)).addScaledVector(bi, Math.sin(ang));
			const r = Math.max(0, radius(t, a));
			const slope = (radius(Math.min(1, t + dt), a) - radius(Math.max(0, t - dt), a)) / (2 * dt * total);
			const p = points[i].clone().addScaledVector(d, r);
			pos.push(p.x, p.y, p.z);
			const nn = d.clone().addScaledVector(tan, -slope).normalize();
			nor.push(nn.x, nn.y, nn.z);
			uv.push(a, t);
			const c = paint(t, a);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < n - 1; i++)
		for (let k = 0; k < sides; k++) {
			const a = i * (sides + 1) + k, b = a + sides + 1;
			index.push(a, b, a + 1, b, b + 1, a + 1);
		}
	if (cap) {
		// a round end at the last point
		const end = points[n - 1], c = paint(1, 0), at = pos.length / 3;
		pos.push(end.x + tan.x * radius(1, 0) * 0.6, end.y + tan.y * radius(1, 0) * 0.6, end.z + tan.z * radius(1, 0) * 0.6);
		nor.push(tan.x, tan.y, tan.z);
		uv.push(0.5, 1);
		col.push(c.r, c.g, c.b);
		const last = (n - 1) * (sides + 1);
		for (let k = 0; k < sides; k++) index.push(last + k, at, last + k + 1);
	}
	return geometryOf(pos, nor, uv, col, index);
}

/** a ball (or an egg, by its scale), painted one colour or by `paint(normal)` */
function ball(at, scale, paint, segments = 8, quaternion = new THREE.Quaternion()) {
	segments = res(segments, 3);
	const g = new THREE.SphereGeometry(1, segments + 2, segments);
	const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), v = new THREE.Vector3();
	const one = typeof paint === 'function' ? null : colour(paint);
	for (let i = 0; i < n; i++) {
		v.fromBufferAttribute(p, i);
		const c = one ?? paint(v);
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.applyMatrix4(new THREE.Matrix4().compose(at, quaternion, scale));
	return g;
}

/** a frame whose x is `forward`, y as near `up` as it can be, at `at` */
function frame(at, forward, up = UP, roll = 0) {
	const x = forward.clone().normalize();
	let z = new THREE.Vector3().crossVectors(x, up);
	if (z.lengthSq() < 1e-10) z = new THREE.Vector3().crossVectors(x, V(0, 0, 1));
	z.normalize();
	const y = new THREE.Vector3().crossVectors(z, x).normalize();
	const m = new THREE.Matrix4().makeBasis(x, y, z);
	if (roll) m.multiply(new THREE.Matrix4().makeRotationX(roll));
	return m.setPosition(at);
}

/** geometries gathered by material, merged into one mesh each at the end */
class Bag {
	constructor() {
		this.parts = {};
	}
	add(kind, geometry, matrix) {
		if (!geometry || !geometry.attributes.position.count) return this;
		if (matrix) geometry.applyMatrix4(matrix);
		(this.parts[kind] ??= []).push(geometry);
		return this;
	}
	build(materials) {
		const group = new THREE.Group();
		for (const [kind, list] of Object.entries(this.parts)) {
			const merged = list.length === 1 ? list[0] : mergeGeometries(list);
			if (list.length > 1) for (const g of list) g.dispose();
			if (!merged) continue;
			const looks = materials(kind);
			for (const m of Array.isArray(looks) ? looks : [looks]) {
				const mesh = new THREE.Mesh(merged, m);
				mesh.name = kind;
				mesh.castShadow = true;
				mesh.receiveShadow = true;
				group.add(mesh);
			}
		}
		return group;
	}
}

/* ------------------------------------------------------------------------------------------- pictures */

/** a canvas to paint pixels into: the page's, the box's (an OffscreenCanvas), or none */
function canvasOf(w, h) {
	try {
		if (typeof document !== 'undefined' && document.createElement) {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			if (c.getContext) return c;
		}
	} catch {
		// no document here
	}
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	return null;
}

/**
 * A texture from RGBA pixels, row 0 at v = 0 (flipY off, which is also how a picture leaves the box). Through a
 * canvas, so it is filtered and mipmapped wherever it is drawn.
 */
function picture(rgba, w, h, { srgb = true, repeat = false } = {}) {
	const c = canvasOf(w, h);
	const ctx = c && c.getContext('2d');
	let t;
	if (ctx) {
		const img = ctx.createImageData(w, h);
		img.data.set(rgba);
		ctx.putImageData(img, 0, 0);
		t = new THREE.Texture(c);
	} else {
		t = new THREE.DataTexture(rgba, w, h);
		t.magFilter = THREE.LinearFilter;
		t.minFilter = THREE.LinearMipmapLinearFilter;
		t.generateMipmaps = true;
	}
	t.flipY = false;
	t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	t.anisotropy = 8;
	if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.needsUpdate = true;
	return t;
}

/* ------------------------------------------------------------------------------------------- the leaf */

/*
 * A papaya leaf by its lobes: [angle from the midline (rad), length (of the middle lobe's), half width, how many
 * lobes it is cut into on each side, how deep]. The first leaves are simple and toothed, then three-, five- and
 * finally seven-to-nine-lobed, each lobe lobed again.
 */
const LOBING = {
	simple: { centre: 0.12, outline: null, k: [0.5, 0.75], lobes: [[0, 1, 0.5, 8, 0.06]] },
	three: { centre: 0.16, outline: [[0, 0.7], [0.3, 0.75], [0.55, 1], [0.8, 0.75], [0.95, 0.3], [1, 0]], lobes: [[0, 1, 0.34, 4, 0.16], [1.05, 0.8, 0.3, 3, 0.16]] },
	five: { centre: 0.18, outline: [[0, 0.55], [0.2, 0.45], [0.35, 0.6], [0.55, 1], [0.75, 0.82], [0.92, 0.35], [1, 0]], lobes: [[0, 1, 0.24, 3, 0.4], [0.8, 0.88, 0.22, 3, 0.4], [1.65, 0.64, 0.18, 2, 0.36]] },
	// a mature leaf: seven lobes, the lowest pair split again, each narrow where it leaves the middle, broad and cut
	// deeply into lobes of its own further out, its tip long and pointed
	seven: { centre: 0.2, outline: [[0, 0.52], [0.15, 0.44], [0.3, 0.5], [0.45, 0.86], [0.6, 1], [0.74, 0.9], [0.87, 0.6], [0.95, 0.27], [1, 0]], lobes: [[0, 1, 0.19, 3, 0.56], [0.63, 0.95, 0.185, 3, 0.56], [1.25, 0.83, 0.17, 3, 0.54], [1.87, 0.65, 0.15, 2, 0.5], [2.48, 0.45, 0.12, 1, 0.45]] }
};
/** the leaf's picture covers x (along the midline) from -0.62 to 1.04 and z (across) from -1 to 1, in lobe lengths */
const LEAF_X0 = -0.62, LEAF_XW = 1.66;
const leafU = (x) => (x - LEAF_X0) / LEAF_XW;
const leafV = (z) => (z + 1) / 2;

/** every lobe of a lobing, both sides, with what its edge needs */
function lobesOf(cls) {
	const L = LOBING[cls], out = [];
	for (const [a, len, w, n, d] of L.lobes)
		for (const side of a === 0 ? [1] : [1, -1]) out.push({ a: a * side, c: Math.cos(a * side), s: Math.sin(a * side), len, w, n, d, outline: L.outline, k1: L.k?.[0], k2: L.k?.[1] });
	return out;
}

const SEC0 = 0.36, SEC1 = 0.93;

/** a lobe's half width at t along it (0 … 1) on one side: its outline, cut into lobes of its own */
function halfWidth(lobe, t, side) {
	if (t <= 0 || t >= 1) return 0;
	let w = lobe.outline ? lobe.w * curve(t, lobe.outline) : lobe.w * Math.pow(Math.sin(Math.PI * Math.pow(t, lobe.k1)), lobe.k2);
	// small teeth all along the edge
	const tooth = (t * (lobe.n + 1) * 5) % 1;
	w *= 1 - 0.035 * (tooth < 0.75 ? tooth / 0.75 : (1 - tooth) / 0.25) * Math.sin(Math.PI * t);
	if (lobe.n > 0 && t > SEC0 && t < SEC1) {
		const ph = ((t - SEC0) / (SEC1 - SEC0)) * lobe.n + (side > 0 ? 0 : 0.35);
		const f = ph - Math.floor(ph);
		const g = f < 0.68 ? 1 - Math.pow(1 - f / 0.68, 2) : 1 - Math.pow((f - 0.68) / 0.32, 1.4);
		const fade = Math.pow(Math.sin((Math.PI * (t - SEC0)) / (SEC1 - SEC0)), 0.4);
		w *= 1 - lobe.d * (1 - g) * fade;
	}
	return w;
}

/** the tips of a lobe's own lobes on one side, as t along it: where its side veins run */
function sideTips(lobe, side) {
	const out = [];
	if (!lobe.n) return out;
	const off = side > 0 ? 0 : 0.35;
	for (let j = -1; j <= lobe.n; j++) {
		const t = SEC0 + ((j + 0.68 - off) / lobe.n) * (SEC1 - SEC0);
		if (t > SEC0 + 0.02 && t < SEC1 - 0.02) out.push(t);
	}
	return out;
}

const PIXELS = new Map();
/** linear (0 … 1, in 4096 steps) to an sRGB byte, and an sRGB byte back to linear */
const TO_SRGB = new Uint8Array(4096), FROM_SRGB = new Float32Array(256);
for (let i = 0; i < 4096; i++) {
	const v = i / 4095;
	TO_SRGB[i] = Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
}
for (let i = 0; i < 256; i++) {
	const v = i / 255;
	FROM_SRGB[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
const byteOf = (x) => TO_SRGB[(clamp(x) * 4095) | 0];
/** a colour of ours (linear, as three.js keeps them) written into a picture's pixels, which hold sRGB */
function putColour(arr, i, col, a = 255) {
	const k = i * 4;
	arr[k] = byteOf(col.r);
	arr[k + 1] = byteOf(col.g);
	arr[k + 2] = byteOf(col.b);
	arr[k + 3] = a;
}
/** …and read back */
function getColour(arr, i, out) {
	const k = i * 4;
	return out.setRGB(FROM_SRGB[arr[k]], FROM_SRGB[arr[k + 1]], FROM_SRGB[arr[k + 2]]);
}

/** how far p is from the segment ab (2D); how far along it, in SEG_T */
let SEG_T = 0;
function segmentAway(px, py, ax, ay, bx, by) {
	const dx = bx - ax, dy = by - ay;
	const t = clamp(((px - ax) * dx + (py - ay) * dy) / Math.max(1e-12, dx * dx + dy * dy));
	SEG_T = t;
	const x = ax + dx * t - px, y = ay + dy * t - py;
	return Math.sqrt(x * x + y * y);
}

const LEAF_TOP = [colour('#26501b'), colour('#3a6a26')], LEAF_TOP_VEIN = colour('#a3bd66'), LEAF_TOP_VEIN2 = colour('#7fa24b');
const LEAF_BOT = [colour('#5f8a45'), colour('#7aa05a')], LEAF_BOT_VEIN = colour('#d3dca4'), LEAF_BOT_VEIN2 = colour('#b6c88c');
const LEAF_OLD = [colour('#c9a227'), colour('#e2c446')], LEAF_OLD_VEIN = colour('#ead77a'), LEAF_OLD_EDGE = colour('#7d5a24'), LEAF_OLD_GREEN = colour('#a9a43c');

/**
 * The leaf's pictures, pixel by pixel: its cut-out (alpha), its upper side (dark glossy green, pale sunken veins),
 * its underside (paler, the veins standing out) and the old leaf (yellow, browning at the edge). The same for every
 * papaya, so made once for each lobing and size and kept.
 */
function leafPixels(cls, S) {
	const key = `${cls}|${S}`;
	if (PIXELS.has(key)) return PIXELS.get(key);
	const lobes = lobesOf(cls), centre = LOBING[cls].centre;
	const sh = 4242;
	// each lobe's side veins, in its own frame: [from u, from v, to u, to v], and how wide it ever gets
	for (const lobe of lobes) {
		lobe.veins = [];
		lobe.most = lobe.w * 1.05;
		for (const side of [1, -1])
			for (const t of sideTips(lobe, side)) {
				const w = halfWidth(lobe, t, side);
				lobe.veins.push([Math.max(0, t - 0.13) * lobe.len, 0, t * lobe.len, side * w * 0.9]);
			}
	}
	const n = S * S, alpha = new Uint8ClampedArray(n * 4), top = new Uint8ClampedArray(n * 4), bottom = new Uint8ClampedArray(n * 4), old = new Uint8ClampedArray(n * 4);
	const px = 2 / S;
	const cell = 0.03;
	const c = new THREE.Color(), b = new THREE.Color(), o = new THREE.Color();
	for (let row = 0; row < S; row++) {
		const z = ((row + 0.5) / S) * 2 - 1;
		for (let col = 0; col < S; col++) {
			const x = LEAF_X0 + ((col + 0.5) / S) * LEAF_XW;
			const i = row * S + col;
			let edge = centre - Math.sqrt(x * x + z * z);
			let mid = 0, side = 0, tAlong = 0;
			for (const lobe of lobes) {
				const lu = x * lobe.c + z * lobe.s, lv = -x * lobe.s + z * lobe.c;
				if (lu < -0.04 || lu > lobe.len) continue;
				const av = Math.abs(lv);
				if (av - lobe.most > Math.max(0.03, -edge)) continue;
				const t = lu / lobe.len;
				const sd = halfWidth(lobe, t, lv >= 0 ? 1 : -1) - av;
				if (sd > edge) edge = sd;
				if (lu > 0 && sd > -0.012) {
					// the midrib: thick at the base, thin at the tip
					const mw = 0.013 * (1 - t) + 0.0025;
					const m = 1 - smooth((av - mw * 0.35) / (mw * 0.75));
					if (m > mid) mid = m;
					tAlong = Math.max(tAlong, 1 - t);
					for (const v of lobe.veins) {
						const dist = segmentAway(lu, lv, v[0], v[1], v[2], v[3]);
						const vw = 0.0055 * (1 - 0.7 * SEG_T) + 0.0012;
						const s = 1 - smooth((dist - vw * 0.3) / (vw * 0.8));
						if (s > side) side = s;
					}
				}
			}
			const a = Math.round(clamp(0.5 + edge / px) * 255);
			alpha[i * 4] = alpha[i * 4 + 1] = alpha[i * 4 + 2] = a;
			alpha[i * 4 + 3] = 255;
			const mott = fbm(x * 6, z * 6, sh, 3);
			if (edge < -0.03) {
				// well outside the leaf: only its colour, for the filtering at its edge to blend with
				putColour(top, i, c.copy(LEAF_TOP[0]).lerp(LEAF_TOP[1], mott));
				putColour(bottom, i, b.copy(LEAF_BOT[0]).lerp(LEAF_BOT[1], mott));
				putColour(old, i, o.copy(LEAF_OLD[0]).lerp(LEAF_OLD_EDGE, 0.7));
				continue;
			}
			// the small veins: the edges of cells round scattered points (a Worley pattern)
			const ci = Math.floor(x / cell), cj = Math.floor(z / cell);
			let f1 = 9, f2 = 9;
			for (let di = -1; di <= 1; di++)
				for (let dj = -1; dj <= 1; dj++) {
					const ii = ci + di, jj = cj + dj;
					let h = (Math.imul(ii, 73856093) ^ Math.imul(jj, 19349663) ^ Math.imul(sh, 83492791)) >>> 0;
					h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
					const qx = (ii + 0.15 + ((h & 0xffff) / 65536) * 0.7) * cell, qz = (jj + 0.15 + ((h >>> 16) / 65536) * 0.7) * cell;
					const dd = Math.sqrt((qx - x) * (qx - x) + (qz - z) * (qz - z));
					if (dd < f1) {
						f2 = f1;
						f1 = dd;
					} else if (dd < f2) f2 = dd;
				}
			const net = (1 - smooth((f2 - f1) / 0.0035)) * (0.6 + 0.4 * noise2(x * 20, z * 20, sh + 8));
			const fine = noise2(x * 140, z * 140, sh + 5);
			const vein = Math.max(mid, side * 0.85);
			// the blade between the veins: a little puckered (lighter in the middle of each cell), mottled
			const puck = smooth(f1 / (cell * 0.6)) * 0.6;
			const near = Math.max(mid, side);
			// upper side
			c.copy(LEAF_TOP[0]).lerp(LEAF_TOP[1], clamp(mott * 1.1 - 0.05 + puck * 0.25));
			c.multiplyScalar(1 - 0.12 * near * (1 - vein) + 0.04 * (fine - 0.5));
			c.lerp(LEAF_TOP_VEIN2, net * 0.08);
			c.lerp(LEAF_TOP_VEIN2, side * 0.75);
			c.lerp(LEAF_TOP_VEIN, mid * 0.9);
			// underside
			b.copy(LEAF_BOT[0]).lerp(LEAF_BOT[1], clamp(mott + puck * 0.3));
			b.multiplyScalar(1 + 0.04 * (fine - 0.5));
			b.lerp(LEAF_BOT_VEIN2, net * 0.16);
			b.lerp(LEAF_BOT_VEIN2, side * 0.85);
			b.lerp(LEAF_BOT_VEIN, mid * 0.95);
			// the old leaf: yellow, a little green left along the veins, browning from the edge
			o.copy(LEAF_OLD[0]).lerp(LEAF_OLD[1], clamp(mott * 1.2 - 0.1));
			o.lerp(LEAF_OLD_GREEN, clamp(near * 0.35 + (fbm(x * 3, z * 3, sh + 9, 2) - 0.6) * 1.5) * 0.5);
			o.lerp(LEAF_OLD_VEIN, vein * 0.6);
			const brown = clamp(1 - (edge + 0.01 + (fbm(x * 9, z * 9, sh + 3, 2) - 0.5) * 0.05) / 0.035);
			o.lerp(LEAF_OLD_EDGE, brown * 0.85 * clamp(0.8 + tAlong * 0.2));
			putColour(top, i, c);
			putColour(bottom, i, b);
			putColour(old, i, o);
		}
	}
	const out = { alpha, top, bottom, old, S };
	PIXELS.set(key, out);
	if (PIXELS.size > 12) PIXELS.delete(PIXELS.keys().next().value);
	return out;
}

/**
 * A leaf blade's mesh: a polar grid over the leaf's picture, bent as the leaf is held. `open` 0 is a young leaf still
 * folded up, 1 spread; `droop` how far the lobes hang at their tips, `fold` how much each lobe arches over its midrib,
 * `wave` how much its edge ripples. Its upper side faces +y, its midline runs along +x from the stalk's end.
 */
function bladeGeometry(cls, R, { open = 1, droop = 0.3, fold = 0.25, wave = 0.03, phase = 0, cup = 0 } = {}, tint = colour('#ffffff')) {
	const lobes = lobesOf(cls);
	const nT = res(72, 14), nR = res(16, 4), RMAX = 1.04;
	const pos = [], uv = [], col = [], index = [];
	const close = lerp(0.1, 1, open);
	for (let i = 0; i <= nR; i++) {
		const rho = (i / nR) * RMAX;
		for (let j = 0; j <= nT; j++) {
			const th = -Math.PI + (j / nT) * Math.PI * 2;
			const x = rho * Math.cos(th), z = rho * Math.sin(th);
			uv.push(leafU(x), leafV(z));
			// the nearest lobe: how far off its midrib this point is
			let best = 9, len = 1;
			for (const l of lobes) {
				let d = Math.abs(th - l.a);
				if (d > Math.PI) d = Math.PI * 2 - d;
				if (d < best) {
					best = d;
					len = l.len;
				}
			}
			const off = rho * Math.sin(Math.min(best, Math.PI / 2));
			const along = rho / len;
			const tc = th * close;
			let X = rho * Math.cos(tc), Z = rho * Math.sin(tc);
			let Y = -droop * rho * rho - fold * Math.pow(off, 1.35) * (0.6 + along) + wave * rho * Math.sin(th * 9 + rho * 7 + phase) + cup * rho;
			// folded: the lobes stand up together, like a closed umbrella
			Y += (1 - open) * rho * 0.55;
			X *= lerp(0.55, 1, open);
			pos.push(X * R, Y * R, Z * R);
			const k = 1 - 0.1 * (1 - rho);
			col.push(tint.r * k, tint.g * k, tint.b * k);
		}
	}
	for (let i = 0; i < nR; i++)
		for (let j = 0; j < nT; j++) {
			const a = i * (nT + 1) + j, b = a + nT + 1;
			index.push(a, a + 1, b, b, a + 1, b + 1);
		}
	return geometryOf(pos, [], uv, col, index, true);
}

/* ------------------------------------------------------------------------------------------- the plant's clock */

const STAGES = [
	['Seed', 0, 'A black, wrinkled seed about 6 mm long in its clear jelly coat, a centimetre down in warm soil.'],
	['Germination', 12, 'After about two weeks the root goes down and the stem comes up as a hook, still dragging the seed coat.'],
	['Seed leaves', 20, 'Two smooth oval seed leaves open on a pale stem four centimetres tall; the first true leaf is between them.'],
	['Seedling', 50, 'A soft green stem a hand tall: the first leaves simple and toothed, the next three- and five-lobed.'],
	['Young papaya', 120, 'One unbranched stem, green above and scarred where the first leaves fell; a crown of big seven-lobed leaves.'],
	['Flowering', 175, 'About five months: cream, five-petalled flowers open in the axils of the new leaves, right on the stem.'],
	['Fruit set', 205, 'The first fruits swell on short stalks against the stem; flowers that find no room drop.'],
	['Green fruit', 265, 'A column of heavy green papayas round the stem under the crown, the lowest and oldest biggest.'],
	['Colouring', 315, 'Five months after their flowers the lowest turn yellow from the blossom end, along their furrows first.'],
	['Ripe', 345, 'Yellow-orange papayas at the bottom of the column, green ones above, flowers still opening at the top: it fruits on as it grows.']
].map(([name, day, note]) => ({ name, day, note }));

/** the day of a stage, fractional stages between */
const dayOf = (stage) => table(stage, STAGES.map((s, i) => [i, s.day]));

/** how many leaves (nodes) the stem has made by a day */
const NODES = [[20, 0], [30, 1.5], [50, 6], [80, 13], [120, 25], [175, 45], [205, 57], [265, 81], [315, 101], [345, 113], [420, 140]];
/** how tall the stem is by a day (m), before the seed's own vigour */
const HEIGHT = [[20, 0.06], [30, 0.066], [50, 0.095], [80, 0.22], [120, 0.68], [175, 1.22], [205, 1.44], [265, 1.78], [315, 2.02], [345, 2.14], [420, 2.4]];
/** the stem's radius at its foot and just under its crown by a day (m) */
const FOOT = [[20, 0.0011], [50, 0.0021], [80, 0.0065], [120, 0.024], [175, 0.045], [265, 0.064], [345, 0.074], [420, 0.08]];
const NECK = [[20, 0.0011], [50, 0.002], [80, 0.005], [120, 0.018], [175, 0.028], [265, 0.033], [345, 0.035], [420, 0.036]];
/** the last day any stage shows: the fruit are placed for everything made by then */
const LAST = STAGES[STAGES.length - 1].day;

/**
 * The plant of a seed, everything about it that does not depend on the day: its vigour, its lean, every node's day,
 * height, direction and sizes, and where each fruit hangs (or that its flower drops).
 */
const PLANTS = new Map();
function plantOf(seed) {
	if (PLANTS.has(seed)) return PLANTS.get(seed);
	const P = growPlant(seed);
	PLANTS.set(seed, P);
	if (PLANTS.size > 16) PLANTS.delete(PLANTS.keys().next().value);
	return P;
}

function growPlant(seed) {
	const r = chance(seed, 'plant');
	const P = {
		seed,
		vigour: about(r, 1, 0.07),
		tall: about(r, 1, 0.08),
		lean: [between(r, -1, 1) * 0.035, between(r, -1, 1) * 0.035],
		bend: between(r, 0, Math.PI * 2),
		turn: between(r, 0, Math.PI * 2),
		purple: r() < 0.3 ? between(r, 0.25, 0.6) : 0,
		fruitLength: about(r, 0.205, 0.1),
		fruitShape: between(r, 1.75, 2.05),
		flowerDay: 150 + between(r, -8, 8),
		bark: between(r, -1, 1)
	};
	P.height = (day) => table(day, HEIGHT) * P.tall;
	P.dayAt = (y) => inverse(y / P.tall, HEIGHT);
	/** where the stem's axis is at height y (it leans and bends a little) */
	P.axis = (y, H = 2) => {
		const k = y / Math.max(0.5, H);
		return V(P.lean[0] * y * k + Math.sin(P.bend) * 0.012 * Math.sin(Math.PI * k), y, P.lean[1] * y * k + Math.cos(P.bend) * 0.012 * Math.sin(Math.PI * k));
	};
	/** the stem's radius at height y on a day */
	P.radius = (y, day) => {
		const H = P.height(day);
		if (y > H) return 0;
		const foot = table(day, FOOT) * P.vigour, neck = table(day, NECK) * P.vigour;
		const k = clamp(y / Math.max(1e-3, H));
		const flare = 1 + 0.22 * span(day, 100, 260) * Math.exp(-Math.max(0, y) / 0.07);
		const tip = 1 - 0.75 * span(k, 0.985, 1.0);
		return (neck + (foot - neck) * Math.pow(1 - k, 0.85)) * flare * tip;
	};
	const count = Math.ceil(table(LAST + 0.5, NODES)) + 1;
	P.nodes = [];
	for (let i = 0; i < count; i++) {
		const nr = chance(seed, 'node', i);
		const born = inverse(i + 0.5, NODES);
		const az = P.turn + i * 2.39996 + between(nr, -0.12, 0.12);
		const m = span(born, 20, 190);
		const node = {
			i,
			born,
			y: P.height(born),
			az,
			out: V(Math.cos(az), 0, Math.sin(az)),
			cls: i <= 1 ? 'simple' : i <= 4 ? 'three' : i <= 8 ? 'five' : 'seven',
			life: lerp(42, 80, span(born, 20, 160)) * about(nr, 1, 0.1),
			blade: table(born, [[20, 0.018], [30, 0.03], [50, 0.065], [80, 0.13], [120, 0.25], [175, 0.33], [250, 0.37]]) * P.vigour * about(nr, 1, 0.06),
			stalk: table(born, [[20, 0.01], [30, 0.022], [50, 0.05], [80, 0.14], [120, 0.36], [175, 0.55], [250, 0.64]]) * P.vigour * about(nr, 1, 0.08),
			thick: table(born, [[20, 0.0007], [50, 0.0013], [80, 0.003], [120, 0.007], [175, 0.0095], [250, 0.011]]) * P.vigour,
			m,
			flowers: born >= P.flowerDay,
			roll: between(nr, -0.25, 0.25),
			lift: between(nr, -0.12, 0.12),
			droop: between(nr, 0.8, 1.2),
			fruit: null
		};
		P.nodes.push(node);
	}
	placeFruit(P);
	return P;
}

/* ------------------------------------------------------------------------------------------- fruit, placed */

/** the closest two points of two segments are this far apart */
function segmentDistance(p1, q1, p2, q2) {
	const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
	const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
	let s, t;
	if (a <= 1e-12 && e <= 1e-12) return p1.distanceTo(p2);
	if (a <= 1e-12) {
		s = 0;
		t = clamp(f / e);
	} else {
		const c = d1.dot(r);
		if (e <= 1e-12) {
			t = 0;
			s = clamp(-c / a);
		} else {
			const b = d1.dot(d2), den = a * e - b * b;
			s = den !== 0 ? clamp((b * f - c * e) / den) : 0;
			t = (b * s + f) / e;
			if (t < 0) {
				t = 0;
				s = clamp(-c / a);
			} else if (t > 1) {
				t = 1;
				s = clamp((b - c) / a);
			}
		}
	}
	return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
}

/**
 * Where each flower's fruit hangs, at its full size, oldest first: tried at its own side of the stem and a little
 * to either side, hanging steeper or freer, and kept only where it touches no other fruit and not the stem. A flower
 * with no room drops, as most do on a crowded papaya.
 */
function placeFruit(P) {
	const H = P.height(LAST), placed = [];
	for (const node of P.nodes) {
		if (!node.flowers || node.born > LAST - 20) continue;
		const r = chance(P.seed, 'fruit', node.i);
		if (r() > lerp(0.35, 0.92, span(node.born, P.flowerDay, P.flowerDay + 45))) continue; // a flower that never sets (most of the first do)
		const L = P.fruitLength * about(r, 1, 0.1) * lerp(1.06, 0.94, span(node.born, 150, 320));
		const Dm = L / (P.fruitShape * about(r, 1, 0.05));
		const fr = Dm / 2;
		const yAt = node.y - 0.008;
		const stem = P.radius(yAt, LAST);
		const axis = P.axis(yAt, H);
		let found = null;
		search: for (const stalk of [0.022, 0.034, 0.048]) {
			for (const turn of [0, 0.25, -0.25, 0.5, -0.5, 0.78, -0.78, 1.05, -1.05]) {
				for (const tilt of [0.22, 0.38, 0.56, 0.78]) {
					const az = node.az + turn;
					const out = V(Math.cos(az), 0, Math.sin(az));
					const dir = out.clone().multiplyScalar(Math.sin(tilt)).addScaledVector(UP, -Math.cos(tilt)).normalize();
					// its stalk: out from the stem and a little up; the fruit hangs from its end
					const attach = axis.clone().addScaledVector(out, stem * 0.9);
					const end = attach.clone().addScaledVector(out, stalk * 0.85).addScaledVector(UP, stalk * 0.3);
					const a = end.clone().addScaledVector(dir, 0.32 * L), b = end.clone().addScaledVector(dir, 0.76 * L);
					if (b.y - fr < 0.35) continue;
					// not into the stem
					let ok = true;
					for (const s of [0.18, 0.32, 0.5, 0.7, 0.9]) {
						const p = end.clone().addScaledVector(dir, s * L);
						const ax = P.axis(p.y, H);
						const d = Math.hypot(p.x - ax.x, p.z - ax.z);
						const prof = s < 0.3 ? lerp(0.6, 0.95, s / 0.3) : s > 0.85 ? 0.7 : 1;
						if (d < P.radius(Math.max(0, p.y), LAST) + fr * prof * 0.9) ok = false;
					}
					if (!ok) continue;
					// nor into another fruit (they may press a little: crowded papayas squeeze each other)
					for (const q of placed)
						if (segmentDistance(a, b, q.a, q.b) < (fr + q.fr) * 0.86) {
							ok = false;
							break;
						}
					if (!ok) continue;
					found = { attach, end, dir, L, D: Dm, fr, a, b, out, az, stalk };
					break search;
				}
			}
		}
		if (!found) continue;
		found.bend = between(r, -1, 1);
		found.twist = between(r, 0, Math.PI * 2);
		found.lop = between(r, -1, 1);
		found.speck = hashOf(`${P.seed}|fruit-skin|${node.i}`) & 0xffff;
		node.fruit = found;
		placed.push(found);
	}
}

/* ------------------------------------------------------------------------------------------- organs */

/** the colour of the stem's skin, by how many days ago that part of it was made */
function barkColour(age, y, P) {
	// green while young, then a grey-green, then (the stem's oldest part) a pale grey
	const c = mix('#7aa44c', '#8aa062', span(age, 20, 70));
	c.lerp(colour('#9fa186'), span(age, 60, 150));
	c.lerp(colour('#aeae9f'), span(age, 140, 280));
	c.lerp(colour('#a59c8a'), span(0.2 - y, 0, 0.2) * span(age, 150, 300) * 0.6);
	c.offsetHSL(0, 0, P.bark * 0.02);
	return c;
}

/**
 * The stem's pictures for this day, and a bump map of the same. Its u runs round the stem (the angle a node faces),
 * its v up from the foot to the tip. Its skin is green near the top, grey-green below and pale grey at the foot,
 * flecked with lenticels that line up in rows as the stem ages. Every leaf that fell left a scar where its stalk
 * was: fresh, a big pale-tan shield, papery, speckled brown, raised, about half as wide as the stem; as the stem
 * thickens it is stretched sideways, corks over into a beige band, and at last is only a crease round the grey
 * stem. Above it, a small scar where a flower dropped.
 */
function barkPictures(P, day, H, leafless) {
	const W = res(256, 64), Hpx = clamp(Math.round((H / 0.0028) * Math.min(1, D.level * 1.2)), 64, 1024);
	const rgb = new Uint8ClampedArray(W * Hpx * 4), bump = new Float32Array(W * Hpx);
	const sh = hashOf(`${P.seed}|bark`) & 0xffff;
	const c = new THREE.Color();
	const circ = (y) => 2 * Math.PI * Math.max(1e-4, P.radius(Math.max(0, Math.min(H, y)), day));
	// the skin
	for (let row = 0; row < Hpx; row++) {
		const y = ((row + 0.5) / Hpx) * H;
		const age = day - P.dayAt(y);
		const base = barkColour(age, y, P);
		const old = span(age, 120, 280);
		const C = circ(y);
		const cells = Math.max(4, Math.round(C / 0.01));
		for (let col = 0; col < W; col++) {
			const u = (col + 0.5) / W;
			const n1 = fbm(u * cells, y / 0.012, sh, 3, cells);
			const n2 = noise2(u * cells * 4, y / 0.003, sh + 7, cells * 4);
			c.copy(base).multiplyScalar(0.92 + 0.16 * n1 + 0.06 * (n2 - 0.5));
			// lenticels: brownish flecks, stretched sideways and lined up in rows on the old grey skin
			const lc = Math.round(cells * 5);
			const lent = smooth((noise2(u * lc, y / lerp(0.003, 0.0022, old), sh + 21, lc) - lerp(0.84, 0.66, old)) / 0.06) * span(age, 25, 90);
			c.lerp(mix('#b1aa8e', '#8f8572', old), lent * lerp(0.4, 0.7, old));
			const i = row * W + col;
			putColour(rgb, i, c);
			bump[i] = 0.4 + 0.1 * n1 + 0.04 * n2 + 0.08 * lent;
		}
	}
	// the scars, oldest first, each painted into its own patch
	for (const node of leafless) {
		const age = day - node.born, fell = node.born + node.life, scarAge = day - fell;
		const r = chance(P.seed, 'scar', node.i);
		const C = circ(node.y);
		// its size when the leaf fell, then stretched round as the stem thickened
		const rFell = Math.max(1e-4, P.radius(node.y, fell)), rNow = Math.max(rFell, P.radius(node.y, day));
		const w0 = Math.max(rFell * 1.15, node.thick * 3.6);
		const cork = span(scarAge, 25, 110), crease = span(scarAge, 100, 230);
		const wide = w0 * (rNow / rFell) * lerp(1, 2.3, crease);
		const tall = w0 * lerp(0.82, 0.55, cork) * lerp(1, 0.14, crease);
		const uw = wide / C, vh = tall / H;
		const u0 = (((node.az / (Math.PI * 2)) % 1) + 1) % 1, v0 = node.y / H;
		const fresh = mix('#d9c99e', '#c9b487', r());
		const corky = mix('#cdbf9c', '#bfb08e', r());
		const inside = fresh.clone().lerp(corky, cork).lerp(colour('#b1ab98'), crease);
		const rim = mix('#8a7650', '#6f6a58', cork);
		const rows = Math.ceil(vh * Hpx * 0.75) + 3, cols = Math.ceil(uw * W * 0.65) + 3;
		const rc = Math.round(v0 * Hpx), cc = Math.round(u0 * W);
		const pxY = (vh / 2) * Hpx;
		for (let dr = -rows; dr <= rows; dr++) {
			const row = rc + dr;
			if (row < 0 || row >= Hpx) continue;
			for (let dc = -cols; dc <= cols; dc++) {
				const col = (((cc + dc) % W) + W) % W;
				let du = (col + 0.5) / W - u0;
				du -= Math.round(du);
				const X = du / (uw / 2), Y = ((row + 0.5) / Hpx - v0) / (vh / 2);
				if (Math.abs(X) > 1.2 || Math.abs(Y) > 1.3) continue;
				// a shield: a broad, gently rounded top with round shoulders, narrowing to a rounded foot
				const half = lerp(0.5, 1, Math.pow(clamp((Y + 1) / 1.75), 0.6)) * lerp(1, 1.05, crease);
				const topY = 0.82 + 0.16 * (1 - X * X) - 0.25 * Math.pow(Math.abs(X), 4);
				const botY = -1 + 0.35 * X * X;
				const ragged = (noise2(X * 4 + node.i * 3.1, Y * 4, sh + 40) - 0.5) * 0.18;
				const sd = Math.min(topY - Y, Y - botY, half - Math.abs(X)) + ragged; // + inside, in half-heights
				const sdp = sd * Math.min(pxY, (uw / 2) * W); // in pixels
				if (sdp < -2) continue;
				const i = row * W + col;
				getColour(rgb, i, c);
				const into = clamp(sdp / 1.4 + 0.3);
				const edge = clamp(1 - Math.abs(sdp) / 1.6);
				// papery and speckled brown while fresh, a corky band later
				const n = noise2(X * 6 + node.i, Y * 5, sh + 50), speck = smooth((noise2(X * 16 + node.i * 7, Y * 12, sh + 51) - 0.78) / 0.08);
				const own = inside.clone().multiplyScalar(0.9 + 0.2 * n);
				own.lerp(colour('#6e4f32'), speck * 0.7 * (1 - crease));
				c.lerp(own, into * lerp(1, 0.35, crease));
				c.lerp(rim, edge * lerp(0.6, 0.45, crease));
				// the deep line under its upper edge, the last of it on an old stem
				const lip = clamp(1 - Math.abs(topY - Y) * pxY / 1.3) * (X * X < half * half ? 1 : 0);
				c.lerp(colour('#6a6455'), lip * lerp(0.35, 0.5, crease));
				putColour(rgb, i, c);
				bump[i] += into * (0.32 + 0.1 * n) * lerp(1, 0.1, crease) - lip * lerp(0.25, 0.12, crease) - edge * 0.05;
			}
		}
		// the scar of the flower that dropped from its axil (a small pale dot just above)
		if (node.flowers && !node.fruit && age > 30) {
			const row = Math.round((v0 + (tall * 0.75) / H) * Hpx);
			for (let dr = -3; dr <= 3; dr++)
				for (let dc = -3; dc <= 3; dc++) {
					const rr = row + dr, cl = (((cc + dc) % W) + W) % W;
					if (rr < 0 || rr >= Hpx) continue;
					const dd = Math.hypot(dr * (H / Hpx), dc * (C / W)) / 0.004;
					if (dd > 1) continue;
					getColour(rgb, rr * W + cl, c).lerp(colour('#c8b991'), (1 - dd) * 0.8);
					putColour(rgb, rr * W + cl, c);
					bump[rr * W + cl] += (1 - dd) * 0.15;
				}
		}
	}
	const grey = new Uint8ClampedArray(W * Hpx * 4);
	for (let i = 0; i < W * Hpx; i++) {
		const g = clamp(bump[i]) * 255;
		grey[i * 4] = grey[i * 4 + 1] = grey[i * 4 + 2] = g;
		grey[i * 4 + 3] = 255;
	}
	return { map: picture(rgb, W, Hpx), bump: picture(grey, W, Hpx, { srgb: false }) };
}

/** the stem: a lathe up its leaning axis, its skin a picture; it narrows into its growing tip */
function stemGeometry(P, day, H) {
	const sides = res(36, 8), rows = clamp(Math.round(H / 0.02), 6, res(140, 12));
	const pos = [], nor = [], uv = [], col = [], index = [];
	const y0 = -0.04;
	for (let i = 0; i <= rows; i++) {
		const y = y0 + ((H - y0) * i) / rows;
		const a = P.axis(y, H), r = P.radius(Math.max(0, y), day);
		const dr = (P.radius(Math.min(H, Math.max(0, y) + 0.01), day) - P.radius(Math.max(0, y - 0.01), day)) / 0.02;
		for (let k = 0; k <= sides; k++) {
			const phi = (k / sides) * Math.PI * 2;
			const cx = Math.cos(phi), cz = Math.sin(phi);
			pos.push(a.x + cx * r, y, a.z + cz * r);
			const n = V(cx, -dr, cz).normalize();
			nor.push(n.x, n.y, n.z);
			uv.push(k / sides, y / H);
			col.push(1, 1, 1);
		}
	}
	for (let i = 0; i < rows; i++)
		for (let k = 0; k < sides; k++) {
			const a = i * (sides + 1) + k, b = a + sides + 1;
			index.push(a, b, a + 1, b, b + 1, a + 1);
		}
	return geometryOf(pos, nor, uv, col, index);
}

/** a leaf stalk from the stem to the blade: up and out, sagging under the blade; its base clasps the stem */
function stalkPoints(start, out, length, beta0, bend, steps = 14) {
	const pts = [start.clone()];
	let p = start.clone();
	for (let s = 1; s <= steps; s++) {
		const t = s / steps;
		const beta = beta0 + bend * Math.pow(t, 1.4);
		const dir = out.clone().multiplyScalar(Math.sin(beta)).addScaledVector(UP, Math.cos(beta));
		p = p.clone().addScaledVector(dir, length / steps);
		pts.push(p);
	}
	return pts;
}

/**
 * One leaf at its age: its stalk and its blade. Young (a few days) it stands up small and folded; at two to three
 * weeks it has spread; mature it holds its blade out round the crown; old it droops, yellows, hangs along the stem.
 */
function leaf(bag, P, node, day, H) {
	const age = day - node.born, life = node.life;
	const r = chance(P.seed, 'leaf', node.i);
	const grow = span(age, 0, 20);
	const size = lerp(0.2, 1, Math.pow(grow, 0.7));
	const open = span(age, 3, 17);
	const yellow = span(age, life - 7, life - 3);
	const dying = span(age, life - 3, life);
	// the stalk's angle from upright at its base, and how much it sags to its end
	const beta0 =
		curve(age, [[0, 0.05], [8, 0.2], [18, 0.5], [30, 0.82], [45, 1.0]]) * (node.cls === 'seven' ? 1 : 0.9) +
		node.lift +
		0.35 * span(age, life * 0.55, life - 8) +
		0.9 * span(age, life - 5, life - 0.5);
	const bend = lerp(0.05, 0.42, span(age, 8, 35)) * node.droop + 0.25 * span(age, life * 0.6, life - 6) + 0.4 * dying;
	const length = node.stalk * lerp(0.15, 1, Math.pow(span(age, 0, 26), 0.7));
	const axis = P.axis(node.y, H);
	const stemR = P.radius(node.y, day);
	// its base comes out of the stem sideways and clasps it, then the stalk turns up and out
	const inner = axis.clone().addScaledVector(node.out, stemR * 0.25).addScaledVector(UP, -stemR * 0.12);
	const start = axis.clone().addScaledVector(node.out, stemR * 0.95).addScaledVector(UP, stemR * 0.1);
	const pts = [inner, ...stalkPoints(start, node.out, length, beta0, bend, 18)];
	const end = pts[pts.length - 1];
	const thick = node.thick * lerp(0.4, 1, grow);
	const stalkCol = mix('#a9b968', '#c7c37c', 0.15);
	const purple = P.purple;
	bag.add(
		'stalk',
		tube(
			pts,
			(t) => thick * (1 - 0.5 * t) * (1 + 1.3 * Math.exp(-t / 0.07)) * (1 + 0.25 * Math.exp(-(1 - t) / 0.03)),
			(t, a) => {
				const c = stalkCol.clone().lerp(colour('#8aa04f'), 0.3 * (1 - t));
				if (purple) c.lerp(colour('#8a5a6a'), purple * (0.6 - 0.4 * t) * (0.5 + 0.5 * Math.cos(a * Math.PI * 2)));
				c.lerp(colour('#d9c25a'), yellow * 0.8).lerp(colour('#9a7a44'), dying * 0.7);
				return c;
			},
			7
		)
	);
	if (length < 0.002) return;
	// the blade, held at the stalk's end
	const lastDir = end.clone().sub(pts[pts.length - 2]).normalize();
	const pitch = curve(age, [[0, 1.25], [8, 1.0], [16, 0.45], [28, 0.0], [40, -0.12]]) - 0.35 * span(age, life * 0.6, life - 6) - 0.9 * dying + node.lift * 0.5;
	const fwd = node.out.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(UP, Math.sin(pitch));
	const R = node.blade * size * (1 - 0.25 * dying);
	const tint = mix('#ffffff', '#e8ffb0', (1 - span(age, 6, 26)) * 0.55);
	tint.multiplyScalar(about(r, 1, 0.05));
	const old = yellow > 0.5;
	const shape = {
		open: open * (1 - 0.35 * dying),
		droop: lerp(0.05, 0.42, open) + 0.25 * span(age, life * 0.6, life) + 0.3 * dying,
		fold: lerp(0.1, 0.4, open) + 0.25 * dying,
		wave: 0.025 + 0.02 * dying,
		phase: r() * 6,
		cup: 0.06 * open
	};
	const g = bladeGeometry(node.cls, R, shape, old ? mix('#ffffff', '#c9a070', dying * 0.8) : tint);
	const at = end.clone().addScaledVector(lastDir, R * 0.02);
	bag.add(`${old ? 'old' : 'leaf'}-${node.cls}`, g, frame(at, fwd, UP, node.roll));
}

/**
 * A flower in a leaf's axil, right on the stem (female or hermaphrodite, as on fruiting papayas): a long cream bud
 * first, then five thick, twisted ivory petals 4–5 cm long round a big green ovary crowned by five fringed yellowish
 * stigmas; often a second bud beside it. The petals fall and the ovary swells into the fruit.
 */
function flower(bag, P, node, day, H) {
	const age = day - node.born;
	const r = chance(P.seed, 'flower', node.i);
	const axis = P.axis(node.y + 0.006, H);
	const stemR = P.radius(node.y, day);
	const base = axis.clone().addScaledVector(node.out, stemR * 0.9);
	const grow = span(age, 3, 14), opening = span(age, 13, 17), fading = span(age, 20, 24);
	if (grow <= 0 || fading >= 1) return;
	const out = node.out;
	const dir = out.clone().multiplyScalar(0.8).addScaledVector(UP, 0.55).normalize();
	const L = 0.046 * lerp(0.3, 1, grow) * about(r, 1, 0.08);
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
	// its short thick stalk
	const neck = base.clone().addScaledVector(dir, 0.007);
	bag.add('stalk', tube([base, neck], () => 0.0035, () => colour('#8fa64e'), 6));
	// the ovary (it will be the fruit) and its stigmas
	const oh = L * lerp(0.3, 0.42, opening), ow = L * 0.17;
	const ovary = neck.clone().addScaledVector(dir, oh * 0.9);
	bag.add('fruit', ball(ovary, V(ow, oh, ow), mix('#b8cf78', '#93b250', 0.4), 9, q));
	if (opening > 0.2) {
		const top = ovary.clone().addScaledVector(dir, oh * 0.95);
		for (let k = 0; k < 5; k++) {
			const a = (k / 5) * Math.PI * 2;
			const side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q);
			const sd = dir.clone().multiplyScalar(0.35).addScaledVector(side, 1).normalize();
			const sq = new THREE.Quaternion().setFromUnitVectors(UP, sd);
			bag.add('petal', ball(top.clone().addScaledVector(sd, L * 0.08), V(L * 0.05, L * 0.11, L * 0.025), mix('#eee6a2', '#d9c86a', fading), 5, sq));
		}
	}
	// the petals: thick, ivory, each twisted along its length and curling back at its tip as it opens
	for (let k = 0; k < 5; k++) {
		const a = (k / 5) * Math.PI * 2 + r() * 0.25;
		const spread = lerp(0.08, 1.05, opening) - fading * 0.35;
		const side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q);
		const len = L * (0.92 + r() * 0.15), w = L * 0.24;
		const pts = [];
		for (let s = 0; s <= 8; s++) {
			const t = s / 8;
			const ang = spread * (0.35 + 0.9 * t) + opening * 0.7 * t * t * t;
			const d = dir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).normalize();
			const prev = pts.length ? pts[pts.length - 1] : neck.clone().addScaledVector(dir, L * 0.04).addScaledVector(side, ow * 0.8);
			pts.push(s === 0 ? prev : prev.clone().addScaledVector(d, len / 8));
		}
		const twist = (0.9 + r() * 0.6) * opening;
		bag.add(
			'petal',
			tube(
				pts,
				(t, aa) => {
					const ph = aa * Math.PI * 2 + twist * t * Math.PI;
					return w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.92)), 0.55) * (0.22 + 0.78 * Math.abs(Math.cos(ph)));
				},
				(t) => mix('#cdd894', '#f8f5e2', span(t, 0.05, 0.35)).lerp(colour('#d8c47a'), fading * 0.7),
				10
			)
		);
	}
	// a second, smaller bud beside it on most nodes
	if (r() < 0.6) {
		const side = new THREE.Vector3().crossVectors(UP, out).normalize().multiplyScalar(r() < 0.5 ? 1 : -1);
		const bd = dir.clone().addScaledVector(side, 0.6).normalize();
		const bq = new THREE.Quaternion().setFromUnitVectors(UP, bd);
		const bl = L * 0.6;
		bag.add('stalk', tube([neck, neck.clone().addScaledVector(bd, bl * 0.2)], () => 0.0018, () => colour('#8fa64e'), 5));
		bag.add('petal', ball(neck.clone().addScaledVector(bd, bl * 0.65), V(bl * 0.18, bl * 0.48, bl * 0.18), mix('#cfdc98', '#f0ebcc', grow), 8, bq));
	}
}

/** a papaya's outline from its stalk end (0) to its blossom end (1), as a share of its widest */
const FRUIT_PROFILE = [[0, 0.12], [0.03, 0.36], [0.08, 0.6], [0.15, 0.78], [0.25, 0.91], [0.4, 0.985], [0.55, 1.0], [0.7, 0.96], [0.82, 0.85], [0.9, 0.68], [0.95, 0.48], [0.985, 0.22], [1, 0.0]];

/**
 * One papaya as a shape: an oblong berry, its stalk end broad and round-shouldered, widest about its middle, tapering
 * to a point at the blossom end, with five ridges that stand out most towards the tip; green with paler flecks,
 * turning yellow from the blossom end and in its furrows first while the ridges stay green longest, ripe
 * yellow-orange with a few dark blemishes. Its stalk end at the origin, it hangs along -y.
 */
/** a fruit's radius at s along it (0 stalk end … 1 blossom end) and phi round it, at its full width Dm */
function fruitRadius(f, Dm, s, phi) {
	const prof = curve(s, FRUIT_PROFILE);
	const amp = 0.03 + 0.03 * (1 - s) * (1 - s) + 0.035 * s * s;
	const cr = Math.cos(5 * phi + f.twist);
	const rid = Math.sign(cr) * Math.pow(Math.abs(cr), 0.75);
	const lop = 1 + 0.05 * f.lop * Math.cos(phi - f.twist) * Math.sin(Math.PI * s);
	return (Dm / 2) * prof * (1 + amp * rid) * lop;
}
const fruitWidth = (f, size) => f.D * size * lerp(0.8, 1, smooth(size * 1.4));

/** `half`: only the half of it behind z = 0 (phi from pi to 2 pi), for a fruit cut lengthwise */
function fruitGeometry(f, size, ripe, young, half = false) {
	const L = f.L * size, Dm = fruitWidth(f, size);
	const nA = res(34, 10), nS = res(30, 8);
	const pos = [], uv = [], col = [], index = [];
	const green = mix('#3d6a26', '#517f2e', smooth(size)), green2 = mix('#4a7a2c', '#6e9a40', smooth(size));
	const yellow = colour('#f2b42a'), orange = colour('#ee8f20');
	const c = new THREE.Color();
	const ringAt = [];
	for (let i = 0; i <= nS; i++) {
		const s = i / nS;
		const bendX = half ? 0 : f.bend * 0.05 * L * Math.sin(Math.PI * s);
		ringAt.push(pos.length / 3);
		const count = !half && (i === 0 || i === nS) ? 1 : half ? nA / 2 + 1 : nA;
		for (let k = 0; k < count; k++) {
			const phi = half ? Math.PI + (k / (nA / 2)) * Math.PI : (k / nA) * Math.PI * 2;
			const cr = Math.cos(5 * phi + f.twist);
			const rid = Math.sign(cr) * Math.pow(Math.abs(cr), 0.75);
			const rad = fruitRadius(f, Dm, s, phi);
			const x = Math.cos(phi) * rad + bendX, z = Math.sin(phi) * rad;
			pos.push(x, -s * L, z);
			uv.push(k / nA, s);
			// green, a little paler on the ridges, flecked
			const n = noise2(phi * 3, s * 9, f.speck), speck = noise2(phi * 24, s * 64, f.speck + 3);
			c.copy(green).lerp(green2, clamp(0.5 + 0.5 * rid) * 0.5 + n * 0.3);
			c.lerp(colour('#a9c47a'), smooth((speck - 0.8) / 0.1) * 0.35);
			// ripening: from the blossom end, in the furrows first
			const turn = clamp(ripe * 1.85 - (1 - s) * 1.05 - rid * 0.42 + (n - 0.5) * 0.4);
			c.lerp(yellow, smooth(turn) * clamp(ripe * 6));
			c.lerp(orange, smooth(ripe * 1.5 - 0.6 - (1 - s) * 0.4 + rid * -0.1) * 0.55);
			// a few dark blemishes on the ripe skin
			const spot = smooth((noise2(phi * 18 + 3, s * 50, f.speck + 9) - 0.9) / 0.04) * smooth(ripe * 2 - 0.8);
			c.lerp(colour('#6a6a30'), spot * 0.4);
			if (young) c.lerp(colour('#93b25a'), 0.18);
			col.push(c.r, c.g, c.b);
		}
	}
	if (half) {
		const m = nA / 2 + 1;
		for (let i = 0; i < nS; i++)
			for (let k = 0; k < m - 1; k++) {
				const a = ringAt[i] + k, b = ringAt[i + 1] + k;
				index.push(a, a + 1, b, b, a + 1, b + 1);
			}
		return geometryOf(pos, [], uv, col, index, true);
	}
	for (let i = 0; i < nS; i++) {
		const a0 = ringAt[i], b0 = ringAt[i + 1];
		const ca = i === 0 ? 1 : nA, cb = i + 1 === nS ? 1 : nA;
		for (let k = 0; k < nA; k++) {
			const k1 = (k + 1) % nA;
			if (ca === 1) index.push(a0, b0 + k1, b0 + k);
			else if (cb === 1) index.push(a0 + k, a0 + k1, b0);
			else index.push(a0 + k, a0 + k1, b0 + k, b0 + k, a0 + k1, b0 + k1);
		}
	}
	return geometryOf(pos, [], uv, col, index, true);
}

/** a fruit's size (0 … 1 of its full size) and ripeness at its age in days since its flower set */
const fruitSize = (age) => 0.09 + 0.91 * Math.min(1, (1 - Math.exp(-age / 34)) / (1 - Math.exp(-115 / 34)));
const fruitRipe = (age) => span(age, 138, 180);

/** the dried stigma on a fruit's tip: five short dark arms round a knob, ~7 mm across */
function stigma(bag, at, dir, out, s, dry) {
	const col = mix('#8a8a4a', '#1c1712', dry);
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
	bag.add('stalk', ball(at, V(0.0016, 0.0016, 0.0016).multiplyScalar(s), col, 5, q));
	for (let k = 0; k < 5; k++) {
		const a = (k / 5) * Math.PI * 2;
		const side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q);
		const aq = new THREE.Quaternion().setFromUnitVectors(UP, side);
		bag.add('stalk', ball(at.clone().addScaledVector(side, 0.0022 * s), V(0.0009, 0.0024, 0.0006).multiplyScalar(s), col, 4, aq));
	}
}

/** a fruit on the stem at its age: its short curved stalk, its body, the dry tip of its flower */
function fruit(bag, P, node, day, H) {
	const f = node.fruit, age = day - node.born - 20;
	if (age <= 0) return;
	const size = fruitSize(age), ripe = fruitRipe(age);
	const down = f.dir.clone().negate();
	const xAxis = new THREE.Vector3().crossVectors(down, f.out).normalize();
	const zAxis = new THREE.Vector3().crossVectors(xAxis, down).normalize();
	const m = new THREE.Matrix4().makeBasis(xAxis, down, zAxis).setPosition(f.end);
	bag.add('fruit', fruitGeometry(f, size, ripe, age < 25), m);
	// its stalk, from the stem out and a little up, then down into the fruit's top
	const from = P.axis(node.y - 0.008, H).addScaledVector(f.out, P.radius(node.y, day) * 0.85);
	const into = f.end.clone().addScaledVector(f.dir, 0.006 * size);
	const midp = from.clone().lerp(f.end, 0.55).addScaledVector(UP, f.stalk * 0.18);
	const thick = 0.0055 * lerp(0.55, 1, size);
	bag.add('stalk', tube([from, midp, f.end.clone().addScaledVector(UP, 0.004), into], (t) => thick * (1.25 - 0.35 * t + 0.4 * Math.pow(t, 6)), (t) => mix('#86a24a', '#a3a85a', ripe * 0.5 + t * 0.2), 7));
	// the dry stigma at the blossom end: a small black five-armed star
	const tip = f.end.clone().addScaledVector(f.dir, f.L * size * 0.995);
	stigma(bag, tip, f.dir, f.out, lerp(0.5, 1, size), span(age, 10, 40));
}

/**
 * The roots: a short, fleshy, turnip-shaped tap root and a wide spread of cream side roots, nine in ten of them in
 * the top 30 cm of soil, reaching out about as far as the leaves do; their young tips white. Each from its own
 * chance, drawn along its whole path and shown as far as it has grown.
 */
function roots(bag, P, day) {
	if (D.level < 1) return;
	const foot = Math.max(0.0008, table(day, FOOT) * P.vigour);
	const young = colour('#f3ead6'), old = colour('#cdb993');
	function walk(key, from, dir, length, radius, grown, order, down, wander, floor, shape = null) {
		if (grown <= 0.01 || length * grown < 0.003) return;
		const r = chance(P.seed, 'root', ...key);
		const steps = clamp(Math.round(length / 0.03), 4, 28);
		const pts = [from.clone()];
		const d = dir.clone().normalize();
		for (let s = 0; s < steps; s++) {
			d.y -= down;
			d.x += (r() * 2 - 1) * wander;
			d.y += (r() * 2 - 1) * wander * 0.4;
			d.z += (r() * 2 - 1) * wander;
			if (d.y > -0.02 && pts[s].y > -0.01) d.y = -0.2;
			d.normalize();
			const p = pts[s].clone().addScaledVector(d, length / steps);
			if (p.y > -0.004) p.y = -0.004;
			if (p.y < floor) p.y = floor + (p.y - floor) * 0.15;
			pts.push(p);
		}
		const shown = grown * steps;
		const whole = Math.floor(shown);
		const path = pts.slice(0, whole + 1);
		if (whole < steps) path.push(pts[whole].clone().lerp(pts[whole + 1], shown - whole));
		if (path.length < 2) return;
		const rad = radius * (0.4 + 0.6 * clamp(grown));
		bag.add(
			'root',
			tube(path, shape ? (t) => rad * shape(t) : (t) => rad * (1 - 0.8 * Math.pow(t, 0.8)), (t) => old.clone().lerp(young, span(t, 0.45, 1) * 0.9 + (1 - span(day, 30, 200)) * 0.5), order ? 5 : 10, { cap: true })
		);
		if (order >= 2) return;
		const kids = order === 0 ? 6 : 4;
		for (let k = 0; k < kids; k++) {
			const at = between(r, 0.15, 0.85);
			if (at * steps > shown - 0.5) continue;
			const idx = Math.floor(at * steps);
			const p = pts[idx].clone().lerp(pts[idx + 1], at * steps - idx);
			const a = r() * Math.PI * 2;
			const kd = V(Math.cos(a), -0.15, Math.sin(a));
			walk([...key, k], p, kd, length * between(r, 0.22, 0.42), radius * 0.38, (shown - at * steps) / (steps * 0.6), order + 1, down * 0.6, wander, floor - 0.08);
		}
	}
	// the tap root: thick and turnip-shaped near the top, quickly thin below
	const tapLength = table(day, [[0, 0], [6, 0.003], [12, 0.03], [20, 0.05], [50, 0.1], [120, 0.24], [200, 0.34], [345, 0.42]]);
	walk(['tap'], V(0, -0.005, 0), V(0, -1, 0), 0.42, Math.max(0.0008, foot * 1.05), tapLength / 0.42, 0, 0.02, 0.08, -0.6, (t) => 1 - 0.55 * smooth(t / 0.35) - 0.4 * Math.pow(t, 0.9));
	// the side roots, in the top 30 cm, spreading wide
	const sideLength = table(day, [[30, 0], [50, 0.07], [120, 0.4], [200, 0.75], [345, 1.0]]);
	for (let k = 0; k < 16; k++) {
		const a = k * 2.39996 + 0.3;
		const r = chance(P.seed, 'side-root', k);
		const start = 30 + k * 6;
		if (day < start) continue;
		const grown = span(day, start, start + 150) * 0.9 + 0.1 * span(day, start, start + 20);
		const depth = -0.02 - between(r, 0, 0.1) * span(day, 40, 200);
		walk(['side', k], V(Math.cos(a) * foot * 0.7, depth, Math.sin(a) * foot * 0.7), V(Math.cos(a), -0.1, Math.sin(a)), Math.max(0.06, sideLength * about(r, 1, 0.2)), foot * 0.3, grown, 1, 0.006, 0.16, -0.3);
	}
}

/* ------------------------------------------------------------------------------------------- seed and sprout */

/** the seed: black, wrinkled, in its clear jelly coat */
function seedBody(bag, at, s = 1, shed = 0, q = new THREE.Quaternion()) {
	const wr = (v) => {
		const n = noise2(v.x * 9 + 3, v.y * 9 + v.z * 7, 77) * 0.6 + noise2(v.x * 19, v.z * 19 + v.y * 5, 78) * 0.4;
		return mix('#0e0b09', '#2d2620', n);
	};
	const g = ball(V(0, 0, 0), V(0.0029 * s, 0.0023 * s, 0.0022 * s), wr, 10);
	// its wrinkles: the surface pushed in along ridges
	const p = g.attributes.position, v = new THREE.Vector3();
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		const ridge = 1 - Math.abs(noise2(v.x * 1500 + 7, v.y * 1500 + v.z * 1100, 31) * 2 - 1);
		const k = 1 + 0.16 * (ridge - 0.5) + 0.05 * (noise2(v.x * 4000, v.z * 4000 + v.y * 3000, 32) - 0.5);
		p.setXYZ(i, v.x * k, v.y * k, v.z * k);
	}
	g.computeVertexNormals();
	g.applyMatrix4(new THREE.Matrix4().compose(at, q, V(1, 1, 1)));
	bag.add('seed', g);
	if (shed < 1) bag.add('jelly', ball(at.clone(), V(0.0036, 0.003, 0.0029).multiplyScalar(s * (1 - 0.3 * shed)), '#d9c39a', 12, q));
}

/** the first three weeks: the seed, its root, the hooked stem coming up, the seed leaves opening */
function sprout(bag, P, day) {
	const at = V(0, -0.01, 0);
	const r = chance(P.seed, 'sprout');
	const hypo = table(day, [[0, 0], [8, 0], [12, 0.022], [16, 0.045], [20, 0.06]]) * P.tall;
	if (hypo <= 0.0005) {
		seedBody(bag, at, 1, 0);
		return;
	}
	const hook = 1 - span(day, 13, 18.5);
	const side = V(Math.cos(r() * 6.28), 0, Math.sin(r() * 6.28));
	const bendAxis = new THREE.Vector3().crossVectors(side, UP).normalize();
	const pts = [at.clone()];
	let d = UP.clone();
	const steps = 16;
	for (let s = 0; s < steps; s++) {
		const t = (s + 0.5) / steps;
		if (t > 0.55) d = d.clone().applyAxisAngle(bendAxis, -hook * (Math.PI * 1.0) / (steps * 0.45)).normalize();
		pts.push(pts[s].clone().addScaledVector(d, hypo / steps));
	}
	const thick = 0.0011 + 0.0006 * span(day, 12, 20);
	bag.add('stalk', tube(pts, (t) => thick * (1 - 0.2 * t), (t) => mix('#efe8cf', '#a5c46a', span(t, 0.2, 0.9) * span(day, 12, 18) + 0.15), 8));
	const top = pts[pts.length - 1], tdir = top.clone().sub(pts[pts.length - 2]).normalize();
	cotyledons(bag, top, tdir, day, side);
	if (day < 17) seedBody(bag, top.clone().addScaledVector(tdir, 0.0025), 1, span(day, 14, 17), new THREE.Quaternion().setFromUnitVectors(UP, tdir));
}

/** the two seed leaves: smooth, oval, opening flat, yellowing and falling once the true leaves have taken over */
function cotyledons(bag, top, dir, day, side) {
	const open = span(day, 15, 20), size = table(day, [[10, 0.005], [20, 0.019], [40, 0.025]]), wither = span(day, 42, 56);
	if (day > 58) return;
	for (const s of [1, -1]) {
		const spread = lerp(0.1, 1.05, open) + wither * 0.6;
		const out = side.clone().multiplyScalar(s);
		const ldir = dir.clone().multiplyScalar(Math.cos(spread)).addScaledVector(out, Math.sin(spread)).normalize();
		const len = size, w = size * 0.36;
		const pos = [], uv = [], col = [], index = [];
		const nA = 10, nB = 4;
		for (let i = 0; i <= nA; i++) {
			const t = i / nA;
			const half = w * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7);
			for (let j = 0; j <= nB; j++) {
				const v = (j / nB) * 2 - 1;
				pos.push(t * len, (0.08 * v * v - 0.1 * t * t * (1 + wither * 3)) * len, v * half);
				uv.push(t, (v + 1) / 2);
				const c = mix('#6fa245', '#a7c876', Math.abs(v) < 0.15 ? 0.5 : 0).lerp(colour('#d9c45a'), wither * 1.1);
				col.push(c.r, c.g, c.b);
			}
		}
		for (let i = 0; i < nA; i++)
			for (let j = 0; j < nB; j++) {
				const a = i * (nB + 1) + j, b = a + nB + 1;
				index.push(a, b, a + 1, b, b + 1, a + 1);
			}
		const g = geometryOf(pos, [], uv, col, index, true);
		bag.add('seedleaf', g, frame(top, ldir, out.clone().cross(ldir).cross(ldir).negate().add(UP).normalize()));
	}
}

/* ------------------------------------------------------------------------------------------- the whole plant */

/** the materials of one build (its pictures made for it) */
function looksOf(P, day, H, leafless, used) {
	const cache = {};
	const leafPics = {};
	const S = D.level >= 0.6 ? 512 : D.level >= 0.25 ? 256 : 128;
	const picsOf = (cls) => {
		if (leafPics[cls]) return leafPics[cls];
		const px = leafPixels(cls, S);
		return (leafPics[cls] = { alpha: picture(px.alpha, S, S, { srgb: false }), top: picture(px.top, S, S), bottom: picture(px.bottom, S, S), old: picture(px.old, S, S) });
	};
	return (kind) => {
		if (cache[kind]) return cache[kind];
		let m;
		if (kind === 'stem') {
			const bark = barkPictures(P, day, H, leafless);
			m = new THREE.MeshStandardMaterial({ map: bark.map, bumpMap: bark.bump, bumpScale: 2.2, roughness: 0.86, vertexColors: true, name: 'papaya bark' });
		} else if (kind.startsWith('leaf-') || kind.startsWith('old-')) {
			const [age, cls] = kind.split('-');
			const p = picsOf(cls);
			const common = { alphaMap: p.alpha, alphaTest: 0.5, vertexColors: true };
			m = [
				new THREE.MeshStandardMaterial({ ...common, map: age === 'old' ? p.old : p.top, roughness: age === 'old' ? 0.72 : 0.48, side: THREE.FrontSide, name: `papaya leaf ${age} upper` }),
				new THREE.MeshStandardMaterial({ ...common, map: age === 'old' ? p.old : p.bottom, roughness: 0.78, side: THREE.BackSide, name: `papaya leaf ${age} under` })
			];
		} else if (kind === 'fruit') m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.45, name: 'papaya skin' });
		else if (kind === 'flesh') m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25, name: 'papaya flesh' });
		else if (kind === 'petal') m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.6, sheenColor: colour('#fff7e0'), name: 'papaya petal' });
		else if (kind === 'root') m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, name: 'papaya root' });
		else if (kind === 'seed') m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.6, name: 'papaya seed' });
		else if (kind === 'jelly') m = new THREE.MeshPhysicalMaterial({ color: colour('#e2cfa6'), roughness: 0.08, transmission: 0.85, thickness: 0.002, ior: 1.36, transparent: true, opacity: 0.55, name: 'seed jelly' });
		else if (kind === 'seedleaf') m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, name: 'seed leaf' });
		else m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, name: `papaya ${kind}` });
		return (cache[kind] = m);
	};
}

/** the papaya of a seed on the day of a stage */
function papaya(stage, seed) {
	const day = dayOf(stage);
	const P = plantOf(seed);
	const bag = new Bag();
	roots(bag, P, day);
	if (day < 20) {
		sprout(bag, P, day);
		return bag.build(looksOf(P, day, 0, []));
	}
	const H = P.height(day);
	const made = P.nodes.filter((n) => n.born <= day);
	const leafless = made.filter((n) => day - n.born >= n.life);
	// the stem, and the seed leaves at its foot while they last
	bag.add('stem', stemGeometry(P, day, H));
	const hypo = P.height(20);
	cotyledons(bag, P.axis(hypo, H).add(V(0, 0, 0)), UP, day, V(Math.cos(P.turn + 1), 0, Math.sin(P.turn + 1)));
	// the growing tip: a small green cone the newest leaves come out of
	const tipR = P.radius(H * 0.985, day);
	bag.add('stalk', ball(P.axis(H, H), V(tipR * 0.9, tipR * 1.3, tipR * 0.9), '#8fb050', 8));
	for (const node of made) {
		const age = day - node.born;
		if (age < node.life) leaf(bag, P, node, day, H);
		if (node.flowers && !node.fruit) flower(bag, P, node, day, H);
		else if (node.fruit) {
			if (age < 22) flower(bag, P, node, day, H);
			fruit(bag, P, node, day, H);
		}
	}
	return bag.build(looksOf(P, day, H, leafless));
}

/* ------------------------------------------------------------------------------------------- one fruit */

/**
 * The cut face of half a papaya: a thin skin, thick flesh (orange when ripe, pale while green), and the long cavity
 * down its middle lined with cream fibres and packed with seeds (glossy and nearly black when ripe, white before).
 * On the plane z = 0, the fruit hanging along -y from its stalk end.
 */
function cutHalf(bag, f, size, ripe) {
	const L = f.L * size, Dm = fruitWidth(f, size), R = Dm / 2;
	const nS = res(48, 10), nX = res(36, 8);
	const pos = [], uv = [], col = [], index = [];
	const skin = mix('#5d8a30', '#d8b232', ripe), rimFlesh = mix('#e7ecc4', '#f6a25e', ripe), deep = mix('#f2efd2', '#ee7434', ripe);
	const lining = mix('#f4efdc', '#f1dfbc', ripe);
	const cav = (s) => 0.4 * Math.pow(Math.max(0, Math.sin((Math.PI * (s - 0.13)) / 0.74)), 0.65) * (s > 0.13 && s < 0.87 ? 1 : 0);
	const sh = f.speck ?? 1;
	const c = new THREE.Color();
	for (let i = 0; i <= nS; i++) {
		const s = i / nS, rad = R * curve(s, FRUIT_PROFILE);
		const right = fruitRadius(f, Dm, s, 0) * 0.995, left = fruitRadius(f, Dm, s, Math.PI) * 0.995;
		for (let j = 0; j <= nX; j++) {
			const x = (j / nX) * 2 - 1;
			pos.push(x * (x > 0 ? right : left), -s * L, 0);
			uv.push(s, (x + 1) / 2);
			const ax = Math.abs(x), cv = cav(s);
			const fib = noise2(x * 30, s * 80, sh + 4);
			if (ax > 0.965) c.copy(skin);
			else if (ax < cv * 0.92) c.copy(lining).lerp(colour('#3a2a1c'), ripe * 0.15).multiplyScalar(0.8 + 0.3 * fib);
			else if (ax < cv * 1.08) c.copy(lining).multiplyScalar(0.92 + 0.15 * fib);
			else c.copy(deep).lerp(rimFlesh, clamp((ax - cv) / Math.max(0.05, 0.965 - cv)) * 0.8).multiplyScalar(0.97 + 0.06 * noise2(x * 12, s * 30, sh));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < nS; i++)
		for (let j = 0; j < nX; j++) {
			const a = i * (nX + 1) + j, b = a + nX + 1;
			index.push(a, b, a + 1, b, b + 1, a + 1);
		}
	bag.add('flesh', geometryOf(pos, [], uv, col, index, true));
	// the seeds, packed in the cavity, some standing proud of the cut
	const r = chance('cut-seeds', sh);
	const n = res(170, 20);
	for (let k = 0; k < n; k++) {
		const s = between(r, 0.16, 0.84);
		const w = cav(s) * R * curve(s, FRUIT_PROFILE) * 0.88;
		if (w < 0.004) continue;
		const x = between(r, -1, 1) * w;
		const at = V(x, -s * L, between(r, -0.001, 0.0028));
		const sz = 0.9 + r() * 0.25;
		const dark = ripe > 0.5;
		bag.add('seed', ball(at, V(0.0031, 0.0029, 0.0028).multiplyScalar(sz), dark ? mix('#11120e', '#2c2e22', r()) : mix('#f2ecda', '#ddd2b0', r()), 6));
	}
}

/** the fruit view: the most grown fruit of the plant at this stage, whole, with a half of it cut open beside it */
function oneFruit(stage, seed) {
	const day = dayOf(stage);
	const P = plantOf(seed);
	let best = null, bestAge = -1;
	for (const node of P.nodes) {
		if (!node.fruit || node.born > day) continue;
		const age = day - node.born - 20;
		if (age > bestAge) {
			best = node;
			bestAge = age;
		}
	}
	const group = new THREE.Group();
	if (!best || bestAge <= 0) {
		group.userData.note = day < P.flowerDay ? 'This papaya has not flowered yet.' : 'This fruit has not set yet.';
		return group;
	}
	const f = best.fruit;
	const size = fruitSize(bestAge), ripe = fruitRipe(bestAge);
	const bag = new Bag();
	const whole = fruitGeometry(f, size, ripe, bestAge < 25);
	whole.translate(0, f.L * size, 0);
	bag.add('fruit', whole);
	bag.add('stalk', tube([V(0, f.L * size - 0.002, 0), V(0, f.L * size + 0.025, 0)], () => 0.0055, () => colour('#7e9a45'), 7));
	stigma(bag, V(0, f.L * size * 0.005, 0), V(0, -1, 0), V(1, 0, 0), lerp(0.5, 1, size), span(bestAge, 10, 40));
	if (size > 0.5) {
		// half of a sister fruit, cut lengthwise, lying on its back beside it
		const half = new Bag();
		const sh = fruitGeometry(f, size, ripe, false, true);
		sh.translate(0, f.L * size, 0);
		half.add('fruit', sh);
		const face = new Bag();
		cutHalf(face, f, size, ripe);
		for (const list of Object.values(face.parts)) for (const g of list) g.translate(0, f.L * size, 0);
		for (const [k, list] of Object.entries(face.parts)) for (const g of list) half.add(k, g);
		const g = half.build(looksOf(P, day, 0, []));
		// lying on its back, cut face up, beside the whole one
		g.rotation.set(-Math.PI / 2, 0, 0);
		g.rotation.z = Math.PI / 2;
		g.position.set(f.L * size * 0.55, f.D * size * 0.5, f.D * size * 1.15);
		group.add(g);
	}
	group.add(bag.build(looksOf(P, day, 0, [])));
	return group;
}

/* ------------------------------------------------------------------------------------------- the recipe */

const SEEDS = ['maia', 'isar', 'samuel', 'backyard', 'seed-0042', 'sun', 'rain', 'domes'];
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: SEEDS[0], maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] }
];

module.exports.stages = STAGES;

module.exports.recipe = function (id, v, variant) {
	return {
		meta: {
			group: 'plants',
			id: id ?? 'papaya',
			version: v ?? 2,
			label: 'Papaya',
			note: 'Carica papaya: one soft unbranched stem, green above and grey below with a spiral of crescent leaf scars; a crown of big seven-to-nine-lobed leaves on long hollow stalks; cream flowers in the leaf axils and a column of oblong papayas crowded round the stem, ripening yellow from the lowest up.',
			params: JSON.parse(JSON.stringify(PARAMS))
		},
		build(stage = 9, seed = 'maia', detail = 1, view = 0) {
			const was = D.level;
			D.level = clamp(Number(detail) || 1, 0.05, 1);
			try {
				return view ? oneFruit(Number(stage), String(seed)) : papaya(Number(stage), String(seed));
			} finally {
				D.level = was;
			}
		}
	};
};
