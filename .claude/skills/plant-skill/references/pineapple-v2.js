'use strict';
/*
 * PINEAPPLE 'QUEEN VICTORIA' — Ananas comosus (L.) Merr. (Bromeliaceae, Queen group) 'Queen Victoria', the "ananas
 * Victoria" of Réunion and Mauritius: a small, compact, very spiny pineapple whose small golden fruit (0.7–0.95 kg,
 * 17–19 °Brix) is the sweetest of the trade pineapples, Label Rouge in Réunion since 2006. Version 2 of
 * plants/pineapple: one named cultivar, grown from the 250 g sucker it is planted as, in the lowlands of Réunion, forced
 * at six months, to its ripe fruit and the suckers that follow it.
 *
 * Its numbers are Victoria's where they are measured (Darnaudery et al. 2018, Saint-Pierre, Réunion: 250 g suckers,
 * 0.17 leaves a day, 75–86 eyes, fruit 710–951 g, crown 119–160 g, 17.2–18.9 °Brix; Aubert 1977: red heart 60 days and
 * first flowers 75 days after induction, red heart to harvest 88–137 days, no slips; Fournier et al. 2007/2010: forced
 * at a 50 g D-leaf, a 1 kg plant) and the Queen group's or the species' otherwise (Bhowmick et al. 2022, Indian 'Queen':
 * D-leaf 69 × 5.2 cm, 67 leaves, crown 24.7 cm; OGTR 2008 and Py et al. 1987 for the plant's form; Onderdonk 1970: the
 * eyes in spirals of 8 and 13). Every number with its source: plant-skill's data sheet for it
 * (references/pineapple-queen-victoria.md); the estimates there are marked.
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (94c914d0…, sheet 2 with four cells redrawn): its leaf outline, the fruit's
 * profile and every organ's colours traced off its panels (grey-balanced on its checker first).
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   banana v2 carries it, with lemon's mipmapped pictures, plum's parsed colours and own undersides,
 *                   and the pineapple's materials and surfaces (the leaf's fine ribs, the silvery striped underside).
 *   2. ORGANS       the pineapple's own, each to its measure: the channelled spiny sword leaf with its clasping
 *                   sheath, the club stem and its roots, the syncarp of eyes in spirals of 8 and 13 (each eye a
 *                   shield, its bract, its flower), the crown.
 *   3. THE PLANT    its leaves one by one out of the heart, the red heart, the flowers from the base up, the fruit
 *                   filling and colouring from the base, the stem suckers that follow it.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in days from planting the sucker.
 */
const THREE = require('three');
const { mergeGeometries } = require('three/addons/utils/BufferGeometryUtils.js');

/* ================================================================================================================
 * 1. GROWING
 * ============================================================================================================== */

/**
 * How finely a plant is made: 1 in the plants viewer, less when a world plants hundreds of it (`lite`). Below 1 every
 * tube has fewer sides and rings, every sheet fewer rows; with `roots` off nothing under the soil is grown; with `thin`
 * under 1 only that part of the leaves, petals and beads is kept, each grown bigger to fill the gap; `fill` grows every
 * kept leaf more; a tube thinner than `finest` (metres) is left out. With `fruit` the key of one fruit, that fruit is
 * drawn as finely as the fruit view shows it up close.
 */
const DETAIL = { level: 1, roots: true, thin: 1, fill: 1, finest: 0, fruit: false };

/** builds with `make` at a lower detail, and puts it back as it was */
function lite(o, make) {
	const keep = { ...DETAIL };
	Object.assign(DETAIL, o);
	try {
		return make();
	} finally {
		Object.assign(DETAIL, keep);
	}
}

/** the detail of one number, 1 as built down to 0.05, as a world asks for a plant's levels (as in v1) */
function detailAt(d) {
	const AT = [
		[0.1, 0.12, 1.6, 0.006],
		[0.25, 0.45, 1.3, 0.0016],
		[0.5, 0.6, 1.2, 0.0008],
		[1, 1, 1, 0],
	];
	const level = Math.min(1, Math.max(0.05, d));
	const j = Math.max(1, AT.findIndex((x) => x[0] >= level));
	const [l0, t0, f0, n0] = AT[j - 1];
	const [l1, t1, f1, n1] = AT[j];
	const k = Math.min(1, Math.max(0, (level - l0) / (l1 - l0)));
	return { level, roots: level >= 1, thin: t0 + (t1 - t0) * k, fill: f0 + (f1 - f0) * k, finest: n0 + (n1 - n0) * k };
}

/** a count of divisions at the present detail, never under `least` */
const fewer = (n, least = 1) => (DETAIL.level >= 1 ? n : Math.max(least, Math.round(n * DETAIL.level)));

/** a 32-bit hash of a text (FNV-1a) */
function hashText(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** the chance of one organ of one plant: seed and the organ's name hashed into mulberry32, the same every time */
function chance(seed, ...keys) {
	let a = hashText(`${seed}|${keys.join('|')}`);
	return () => {
		a = (a + 1831565813) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const between = (r, a, b) => a + (b - a) * r();
const about = (r, m, by) => m + (r() * 2 - 1) * by;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => {
	const t = clamp(x);
	return t * t * (3 - 2 * t);
};
/** how far an organ has grown at g, if it grows from `from` to `to`: 0 … 1, eased */
const span = (g, from, to) => smooth((g - from) / (to - from));
/** a value through a table of [x, value] rows, eased between them */
function table(g, rows) {
	if (g <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		const [g1, v1] = rows[i];
		if (g <= g1) {
			const [g0, v0] = rows[i - 1];
			return lerp(v0, v1, smooth((g - g0) / (g1 - g0)));
		}
	}
	return rows[rows.length - 1][1];
}
/** the same, straight between the rows */
function straight(g, rows) {
	if (g <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		const [g1, v1] = rows[i];
		if (g <= g1) {
			const [g0, v0] = rows[i - 1];
			return lerp(v0, v1, (g - g0) / (g1 - g0));
		}
	}
	return rows[rows.length - 1][1];
}

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

/** the matrix that sets a shape built along +X (its face +Y) at `at`, pointing along `dir`, rolled by `roll` */
function aim(at, dir, roll = 0) {
	const x = dir.clone().normalize();
	let z = new THREE.Vector3().crossVectors(x, UP);
	if (z.lengthSq() < 1e-8) z = v3(0, 0, 1);
	z.normalize();
	const y = new THREE.Vector3().crossVectors(z, x).normalize();
	const m = new THREE.Matrix4().makeBasis(x, y, z);
	if (roll) m.multiply(new THREE.Matrix4().makeRotationX(roll));
	return m.setPosition(at);
}

/** a unit vector at right angles to `d` */
function across(d) {
	const s = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : v3(1, 0, 0));
	return s.normalize();
}

const C = new THREE.Color();
/** a colour by its name, parsed once and kept (a plant asks for the same few colours thousands of times) */
const PARSED = new Map();
const named = (c) => {
	if (c instanceof THREE.Color) return c;
	let k = PARSED.get(c);
	if (!k) PARSED.set(c, (k = new THREE.Color(c)));
	return k;
};
const toColor = (c) => (c instanceof THREE.Color ? c : C.copy(named(c)));
/** a colour between two, as a new THREE.Color (the factor clamped: a lerp past 1 overshoots) */
const mix = (a, b, t) => new THREE.Color().copy(named(a)).lerp(named(b), clamp(t));

/* ---- noise: for bark, skin and the small unevenness of everything grown ---- */

function hash3(x, y, z, s) {
	let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s | 0, 1911520717);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** smooth value noise in 3D, 0 … 1 */
function noise3(x, y, z, s = 0) {
	const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
	const xf = x - xi, yf = y - yi, zf = z - zi;
	const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
	const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s);
	const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
	const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
	return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}
/** a few octaves of it, 0 … 1 */
function fbm(x, y, z, octaves = 3, s = 0) {
	let sum = 0, amp = 0.5, total = 0, f = 1;
	for (let i = 0; i < octaves; i++) {
		sum += noise3(x * f, y * f, z * f, s + i * 17) * amp;
		total += amp;
		amp *= 0.5;
		f *= 2.03;
	}
	return sum / total;
}

/**
 * Cellular noise: space cut into irregular cells round jittered points; gives the distance to the nearest point and
 * the next nearest (F1, F2). Where F2 − F1 is small a place lies on the border between two cells: a crack in bark.
 */
function cells(x, y, z, s = 0) {
	const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
	let f1 = 9, f2 = 9, id = 0;
	for (let i = -1; i <= 1; i++)
		for (let j = -1; j <= 1; j++)
			for (let k = -1; k <= 1; k++) {
				const cx = xi + i, cy = yi + j, cz = zi + k;
				const px = cx + hash3(cx, cy, cz, s), py = cy + hash3(cx, cy, cz, s + 1), pz = cz + hash3(cx, cy, cz, s + 2);
				const d = Math.hypot(px - x, py - y, pz - z);
				if (d < f1) {
					f2 = f1;
					f1 = d;
					id = hash3(cx, cy, cz, s + 3);
				} else if (d < f2) f2 = d;
			}
	return { f1, f2, edge: f2 - f1, id };
}

/* ---- shapes ---- */

/**
 * A tube swept along points, its radius changing along and round it (`radius(u, v, s)`: u 0 … 1 base to tip, v 0 … 1
 * round it, s the length along it in metres), its frames carried without twist. A root, a stem, a limb, a trunk.
 */
function tube(points, radius, paint, sides = 6, cap = false) {
	if (DETAIL.finest > 0 && Math.max(radius(0, 0, 0), radius(0.5, 0, 0)) < DETAIL.finest) return made([], [], [], [], [], false);
	if (DETAIL.level < 1) {
		sides = fewer(sides, 3);
		const every = Math.max(1, Math.round(1 / DETAIL.level));
		if (every > 1 && points.length > 3) points = points.filter((_, i) => i % every === 0 || i === points.length - 1);
	}
	const n = points.length;
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const along = [0];
	for (let i = 1; i < n; i++) along.push(along[i - 1] + points[i].distanceTo(points[i - 1]));
	const total = along[n - 1] || 1;
	let normal = null;
	let prev = null;
	for (let i = 0; i < n; i++) {
		const t = points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]);
		if (t.lengthSq() < 1e-14) t.copy(prev ?? UP);
		t.normalize();
		if (!normal) normal = Math.abs(t.y) < 0.9 ? new THREE.Vector3().crossVectors(t, UP).normalize() : new THREE.Vector3().crossVectors(t, v3(1, 0, 0)).normalize();
		else if (prev) normal.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(prev, t)).normalize();
		prev = t;
		const bin = new THREE.Vector3().crossVectors(t, normal).normalize();
		const u = along[i] / total;
		for (let s = 0; s <= sides; s++) {
			const a = (s / sides) * Math.PI * 2;
			const d = normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(bin, Math.sin(a));
			const p = points[i].clone().addScaledVector(d, Math.max(0, radius(u, s / sides, along[i])));
			pos.push(p.x, p.y, p.z);
			nor.push(d.x, d.y, d.z);
			uv.push(u, s / sides);
			const c = toColor(paint(u, s / sides, along[i], d));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < n - 1; i++)
		for (let s = 0; s < sides; s++) {
			const a = i * (sides + 1) + s, b = a + sides + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	if (cap && n > 1) {
		// the tip closed: one more point on the axis, a hair beyond the last ring
		const last = points[n - 1].clone().addScaledVector(prev, Math.max(1e-4, radius(1, 0, total) * 0.5));
		const c = toColor(paint(1, 0, total, prev));
		const at = pos.length / 3;
		pos.push(last.x, last.y, last.z);
		nor.push(prev.x, prev.y, prev.z);
		uv.push(1, 0);
		col.push(c.r, c.g, c.b);
		const ring = (n - 1) * (sides + 1);
		for (let s = 0; s < sides; s++) idx.push(ring + s, ring + s + 1, at);
	}
	const g = made(pos, nor, uv, col, idx, false);
	return g;
}

/**
 * A sheet: a leaf, a petal, a sepal — built along +X from its base, across Z, its face up (+Y). `shape(u)` its half
 * width at u (0 base … 1 tip, in parts of its length), `lift(u, v)` how far a place on it is raised (v −1 … 1 across).
 * With `back`, a second face is laid under it, wound the other way and painted by `back(u, v)`: a leaf's paler
 * underside, drawn with a one-sided material so each face shows its own colour.
 */
function sheet({ length, width, shape, lift = () => 0, paint, back, backLit = true, along = 16, across = 6 }) {
	along = fewer(along, 2);
	across = fewer(across, 1);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const faces = back ? 2 : 1;
	for (let f = 0; f < faces; f++) {
		const base = pos.length / 3;
		const pt = f === 0 ? paint : back;
		for (let i = 0; i <= along; i++) {
			const u = i / along;
			const w = shape(u) * width;
			for (let j = 0; j <= across; j++) {
				const v = (j / across) * 2 - 1;
				pos.push(u * length, lift(u, v) * length - f * length * 0.004, v * w);
				nor.push(0, f ? -1 : 1, 0);
				uv.push(u, (v + 1) / 2);
				const c = toColor(pt(u, v));
				col.push(c.r, c.g, c.b);
			}
		}
		for (let i = 0; i < along; i++)
			for (let j = 0; j < across; j++) {
				const a = base + i * (across + 1) + j, b = a + across + 1;
				if (f === 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
				else idx.push(a, b, a + 1, b, b + 1, a + 1);
			}
	}
	const g = made(pos, nor, uv, col, idx, true);
	if (back && backLit) {
		// the underside lit as the face above it is: a thin leaf lets the light through. (Not for small or thick leaves
		// seen from every side: a normal facing away from the eye takes the whole sky in its Fresnel and draws white.)
		const n = g.attributes.normal, half = n.count / 2;
		for (let i = 0; i < half; i++) n.setXYZ(half + i, n.getX(i), n.getY(i), n.getZ(i));
	}
	return g;
}

/** a small round thing — a bud, an anther, a gland — at `at`, stretched by `scale`, of one colour */
function bead(at, scale, color, detail = 6, turn = new THREE.Quaternion()) {
	detail = fewer(detail, 2);
	const g = new THREE.SphereGeometry(1, detail + 2, detail);
	g.applyMatrix4(new THREE.Matrix4().compose(at, turn, scale));
	const c = new THREE.Color(color);
	const n = g.attributes.position.count;
	const col = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	return g;
}

/** normals worked out from the shape, smooth across a swept shape's seams */
function smoothNormals(geo) {
	geo.computeVertexNormals();
	const pos = geo.attributes.position, nor = geo.attributes.normal;
	const at = new Map();
	for (let i = 0; i < pos.count; i++) {
		const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
		const list = at.get(k);
		if (list) list.push(i);
		else at.set(k, [i]);
	}
	const n = new THREE.Vector3();
	for (const list of at.values()) {
		if (list.length < 2) continue;
		n.set(0, 0, 0);
		for (const i of list) (n.x += nor.getX(i)), (n.y += nor.getY(i)), (n.z += nor.getZ(i));
		n.normalize();
		for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
	}
	nor.needsUpdate = true;
	return geo;
}

function made(pos, nor, uv, col, idx, flat) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	g.setIndex(idx);
	if (flat) g.computeVertexNormals();
	return g;
}

/* ---- surfaces: fine detail as pictures, made here from noise (nothing is loaded) ---- */

const SURFACES = {};
const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

/** a picture w × h of RGBA from `pixel(x, y)` (0 … 1 across the tile) giving [r, g, b] linear 0 … 1, or one grey */
function picture(w, h, pixel, colour) {
	const data = new Uint8Array(w * h * 4);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const p = pixel(x / w, y / h);
			const i = (y * w + x) * 4;
			const [r, g, b] = typeof p === 'number' ? [p, p, p] : p;
			data[i] = Math.round(clamp(colour ? srgb(r) : r) * 255);
			data[i + 1] = Math.round(clamp(colour ? srgb(g) : g) * 255);
			data[i + 2] = Math.round(clamp(colour ? srgb(b) : b) * 255);
			data[i + 3] = 255;
		}
	const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	t.anisotropy = 8;
	t.magFilter = THREE.LinearFilter;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	t.generateMipmaps = true;
	t.needsUpdate = true;
	return t;
}

/** noise that tiles: the same at x and x + 1 (and y), on a torus; `fy` for a finer grain across than along */
function tileNoise(x, y, f, s, octaves = 3, fy = f) {
	const a = x * Math.PI * 2, b = y * Math.PI * 2;
	const r = f / (Math.PI * 2), q = fy / (Math.PI * 2);
	return fbm(Math.cos(a) * r, Math.sin(a) * r + Math.cos(b) * q, Math.sin(b) * q, octaves, s);
}
/** cells that tile in x and y (`nx` × `ny` cells to the tile): F1, F2 and the cell's id */
function tileCells(x, y, nx, ny, s) {
	const cx = x * nx, cy = y * ny;
	const xi = Math.floor(cx), yi = Math.floor(cy);
	let f1 = 9, f2 = 9, id = 0;
	for (let i = -1; i <= 1; i++)
		for (let j = -1; j <= 1; j++) {
			const gx = xi + i, gy = yi + j;
			const wx = ((gx % nx) + nx) % nx, wy = ((gy % ny) + ny) % ny;
			const px = gx + hash3(wx, wy, 0, s), py = gy + hash3(wx, wy, 1, s);
			const dd = Math.hypot(px - cx, py - cy);
			if (dd < f1) {
				f2 = f1;
				f1 = dd;
				id = hash3(wx, wy, 2, s);
			} else if (dd < f2) f2 = dd;
		}
	return { f1, f2, id };
}


/**
 * The surfaces, made the first time they are asked for (x across a leaf, y along it):
 *   leafMap    a leaf's upper face over 0.25 m of its length: fine ribs along it, about 1 mm apart, a little paler
 *              than the blade between, and a faint mottle (the sheet's D leaf)
 *   underMap   its underside: the silvery coat of scales in stripes along it, 1–3 mm wide, some broken, the green
 *              showing between (the sheet's underside piece: silver [0.55, 0.52, 0.52], between [0.25, 0.24, 0.21])
 *   skinMap    3 cm of the fruit's shell: a fine grain, so its colours are not plastic smooth
 * No bump pictures: the relief of the eyes and the channel of the leaf is geometry (plum v2's lesson: a bump picture
 * on a mesh of many small triangles makes NaN pixels).
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(256, 512, (x, y) => {
				const rib = Math.pow(Math.abs(Math.cos(x * Math.PI * 34 + 0.6 * (tileNoise(x, y, 3, 5, 2, 1) - 0.5))), 6);
				const k = 0.9 + 0.07 * rib + 0.05 * (tileNoise(x, y, 6, 7, 2, 30) - 0.5);
				return [k, k * 1.01, k * 0.98];
			}, true),
		underMap: () =>
			picture(256, 512, (x, y) => {
				// stripes along the leaf: a band of scales, now and then broken, the green between
				const n = tileNoise(x, y, 9, 11, 2, 2);
				const band = 0.5 + 0.5 * Math.cos(x * Math.PI * 2 * 22 + 4 * (n - 0.5));
				const broken = tileNoise(x, y, 26, 13, 2, 7);
				const silver = smooth((band - 0.35) / 0.4) * smooth((broken - 0.3) / 0.25);
				const k = lerp(0.64, 1, silver) + 0.04 * (tileNoise(x, y, 40, 17, 2, 60) - 0.5);
				return [k, k * lerp(1.04, 1, silver), k * lerp(0.9, 1, silver)];
			}, true),
		skinMap: () =>
			picture(256, 256, (x, y) => {
				const k = 0.9 + 0.12 * (tileNoise(x, y, 40, 21, 3) - 0.5) + 0.06 * (tileNoise(x, y, 8, 23, 2) - 0.5);
				return [k, k, k * 0.97];
			}, true),
	}[name];
	return (SURFACES[name] = make());
}

/** a shape's UVs set in metres over a surface's tile: `fu` and `fv` the tile's repeats along u and v of it */
function metric(geo, fu, fv) {
	const uv = geo.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fu, uv.getY(i) * fv);
	uv.needsUpdate = true;
	return geo;
}

/**
 * The materials, made once, plain and with their surfaces (only plain settings: the asset box sends a material out by
 * its kind and settings). `leaf` the leaves' upper face: waxy, a soft sheen, no clearcoat (a clearcoat on leaves turns a
 * rosette white where they are seen edge on); `under` their undersides, silvery (a sheen); `fibre` dead and drying
 * leaves, matt; `skin` the fruit's shell, waxy; `sheet` thin things seen from both sides (bracts, petals, spines);
 * `body` the stem, the roots, the peduncle and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, specularIntensity: 0.4, ...(s && { map: s('leafMap') }) }),
	under: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, specularIntensity: 0.3, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.42, 0.44, 0.42), ...(s && { map: s('underMap') }) }),
	fibre: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, specularIntensity: 0.45, ...(s && { map: s('skinMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'leaf', 'under', 'fibre', 'skin', 'sheet', 'prop'];
// a pineapple has some sixty leaves, each one strip: a crowd far off draws every leaf with fewer rows, never half of one
const THINNED = {};

const PICKING = { bags: null, fruits: [] };
function pickFruit(make) {
	PICKING.bags = [];
	PICKING.fruits = [];
	try {
		return { plant: make(), fruits: PICKING.fruits.filter((f) => f.parts.length) };
	} finally {
		PICKING.bags = null;
		PICKING.fruits = [];
	}
}

/**
 * A mesh made safe to draw on every GPU: its collapsed triangles (no area: where a blade's rows meet at its tip) taken
 * out, and every normal of no length given its triangles' own, or else up. A zero normal, or a bump picture on a
 * triangle of no area, is NaN on some GPUs (Apple's): one such pixel and a viewer that meters its exposure off the
 * whole frame goes black.
 */
function sound(geo) {
	if (!geo?.index) return geo;
	const pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index.array;
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
	const kept = [];
	const sum = new Float32Array(pos.count * 3);
	for (let i = 0; i < idx.length; i += 3) {
		a.fromBufferAttribute(pos, idx[i]);
		b.fromBufferAttribute(pos, idx[i + 1]);
		c.fromBufferAttribute(pos, idx[i + 2]);
		n.subVectors(c, b).cross(a.sub(b));
		if (!(n.lengthSq() > 1e-16)) continue;
		kept.push(idx[i], idx[i + 1], idx[i + 2]);
		for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) sum[idx[i + k] * 3 + j] += n.getComponent(j);
	}
	for (let i = 0; i < pos.count; i++) {
		n.fromBufferAttribute(nor, i);
		if (n.lengthSq() > 1e-10 && Number.isFinite(n.x + n.y + n.z)) continue;
		n.set(sum[i * 3], sum[i * 3 + 1], sum[i * 3 + 2]);
		if (!(n.lengthSq() > 1e-20)) n.set(0, 1, 0);
		n.normalize();
		nor.setXYZ(i, n.x, n.y, n.z);
	}
	geo.setIndex(kept);
	nor.needsUpdate = true;
	return geo;
}

/** everything a plant is, gathered by material and merged at the end into one mesh each */
class Bag {
	constructor() {
		this.parts = Object.fromEntries(KINDS.map((k) => [k, []]));
		this.space = new Space();
		this.sheets = 0;
		this.drawing = null;
		if (PICKING.bags) PICKING.bags.push(this);
	}
	/** what is added from here to `fruitDone()` is one fruit, hanging from `at` along `dir`, named by `key` */
	fruit(key, at, dir) {
		this.drawing = { key: key.join('|'), at: at.clone(), dir: dir.clone().normalize(), parts: [] };
		if (PICKING.bags) PICKING.fruits.push(this.drawing);
		return this;
	}
	fruitDone() {
		this.drawing = null;
		return this;
	}
	add(kind, geometry, m) {
		if (!geometry.attributes.position.count) return this;
		if (m) geometry.applyMatrix4(m);
		if (this.drawing && PICKING.bags) this.drawing.parts.push({ kind, geometry: geometry.clone() });
		const isBead = geometry.type === 'SphereGeometry';
		if ((THINNED[kind] || isBead) && (DETAIL.thin < 1 || DETAIL.fill !== 1) && !this.drawing) {
			this.sheets += DETAIL.thin;
			if (this.sheets < 1) {
				geometry.dispose();
				return this;
			}
			this.sheets -= 1;
			geometry.computeBoundingSphere();
			const sphere = geometry.boundingSphere;
			const at = isBead ? sphere.center.clone() : new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
			const most = Math.max(1, 0.14 / Math.max(1e-4, sphere.radius));
			const grow = Math.min(2.6, most, (isBead ? 1 / Math.cbrt(DETAIL.thin) : 1 / Math.sqrt(DETAIL.thin)) * (isBead ? 1 : DETAIL.fill));
			geometry
				.applyMatrix4(new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z))
				.applyMatrix4(new THREE.Matrix4().makeScale(grow, grow, grow))
				.applyMatrix4(new THREE.Matrix4().makeTranslation(at.x, at.y, at.z));
		}
		this.parts[kind].push(geometry);
		return this;
	}
	build() {
		const group = new THREE.Group();
		for (const kind of KINDS) {
			const list = this.parts[kind];
			if (!list.length) continue;
			const merged = sound(mergeGeometries(list));
			for (const g of list) g.dispose();
			if (!merged) continue;
			const mesh = new THREE.Mesh(merged, material(kind === 'prop' ? 'body' : kind));
			mesh.userData.prop = kind === 'prop';
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			group.add(mesh);
		}
		return group;
	}
}

/**
 * SPACE — what the plant has already put where, so that what comes next keeps clear of it: its wood as rods, its fruit
 * as balls. A fruit looks for a way to hang that touches nothing (`settle`). A search, the same every time.
 * Kept in a grid of cells so a tree of thousands of rods stays quick.
 */
class Space {
	constructor() {
		this.balls = [];
		this.rods = [];
		this.cell = 0.25;
		this.grid = new Map();
	}
	keyOf(x, y, z) {
		return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)},${Math.floor(z / this.cell)}`;
	}
	put(item, min, max) {
		const c = this.cell;
		for (let x = Math.floor(min.x / c); x <= Math.floor(max.x / c); x++)
			for (let y = Math.floor(min.y / c); y <= Math.floor(max.y / c); y++)
				for (let z = Math.floor(min.z / c); z <= Math.floor(max.z / c); z++) {
					const k = `${x},${y},${z}`;
					const list = this.grid.get(k);
					if (list) list.push(item);
					else this.grid.set(k, [item]);
				}
	}
	ball(c, r) {
		const b = { c: c.clone(), r };
		this.balls.push(b);
		this.put(b, v3(c.x - r, c.y - r, c.z - r), v3(c.x + r, c.y + r, c.z + r));
	}
	rod1(a, b, r) {
		const s = { a: a.clone(), b: b.clone(), r };
		this.rods.push(s);
		this.put(s, v3(Math.min(a.x, b.x) - r, Math.min(a.y, b.y) - r, Math.min(a.z, b.z) - r), v3(Math.max(a.x, b.x) + r, Math.max(a.y, b.y) + r, Math.max(a.z, b.z) + r));
	}
	/** a rod along a path */
	rod(pts, r) {
		for (let i = 0; i + 1 < pts.length; i++) this.rod1(pts[i], pts[i + 1], typeof r === 'function' ? r(i / (pts.length - 1)) : r);
	}
	/** how deep a ball at c of radius r sinks into what is already there (0 when it touches nothing) */
	depth(c, r) {
		let worst = 0;
		const seen = new Set();
		const ab = new THREE.Vector3(), ac = new THREE.Vector3(), q = new THREE.Vector3();
		const cs = this.cell;
		const reach = r + 0.08;
		for (let x = Math.floor((c.x - reach) / cs); x <= Math.floor((c.x + reach) / cs); x++)
			for (let y = Math.floor((c.y - reach) / cs); y <= Math.floor((c.y + reach) / cs); y++)
				for (let z = Math.floor((c.z - reach) / cs); z <= Math.floor((c.z + reach) / cs); z++) {
					const list = this.grid.get(`${x},${y},${z}`);
					if (!list) continue;
					for (const it of list) {
						if (seen.has(it)) continue;
						seen.add(it);
						if (it.c) worst = Math.max(worst, r + it.r - c.distanceTo(it.c));
						else {
							ab.subVectors(it.b, it.a);
							ac.subVectors(c, it.a);
							const t = clamp(ac.dot(ab) / Math.max(1e-12, ab.lengthSq()));
							q.copy(it.a).addScaledVector(ab, t);
							worst = Math.max(worst, r + it.r - c.distanceTo(q));
						}
					}
				}
		return Math.max(0, worst);
	}
	overlap(shape) {
		let sum = 0;
		for (const s of shape) sum += this.depth(s.c, s.r);
		return sum;
	}
	/**
	 * Where a fruit hangs: from `at`, along a direction near `dir`, its stalk perhaps a little longer (up to `reach`),
	 * so that its balls (`shape(at, dir)`) touch nothing, or as little as can be; its balls are added to the space.
	 * With `most`, a place that costs more than that is no place: nothing is added, and it gives null.
	 */
	settle(at, dir, shape, reach, most = Infinity) {
		const d0 = dir.clone().normalize();
		let best = { at: at.clone(), dir: d0, cost: Infinity };
		const side = new THREE.Vector3();
		for (const ext of [0, 0.5, 1]) {
			for (const swing of [0, 0.45, 0.9, 1.4, 2.2]) {
				for (let k = 0; k < (swing ? 8 : 1); k++) {
					const a = (k / 8) * Math.PI * 2;
					side.set(Math.cos(a), 0, Math.sin(a));
					const d = d0.clone().addScaledVector(side, swing).normalize();
					if (d.y > 0.5) continue;
					const p = at.clone().addScaledVector(d, ext * reach);
					const balls = shape(p, d);
					const cost = this.overlap(balls) * 10 + swing * 0.004 + ext * 0.003;
					if (cost < best.cost) best = { at: p, dir: d, cost };
				}
				if (best.cost < 0.004 * (swing + 0.5)) break;
			}
			if (best.cost < 0.01) break;
		}
		if (best.cost > most) return null;
		for (const b of shape(best.at, best.dir)) this.ball(b.c, b.r);
		return best;
	}
	/** how deep a ball sinks into the fruit already placed (the wood not counted) */
	inFruit(c, r) {
		let worst = 0;
		const cs = this.cell;
		for (let x = Math.floor((c.x - r) / cs); x <= Math.floor((c.x + r) / cs); x++)
			for (let y = Math.floor((c.y - r) / cs); y <= Math.floor((c.y + r) / cs); y++)
				for (let z = Math.floor((c.z - r) / cs); z <= Math.floor((c.z + r) / cs); z++)
					for (const it of this.grid.get(`${x},${y},${z}`) ?? []) if (it.c) worst = Math.max(worst, r + it.r - c.distanceTo(it.c));
		return worst;
	}
}

/**
 * A root and the roots it branches into, grown into the soil: it bends down and wanders, its whole path drawn from its
 * own chance so that a younger root is the first part of the older one. Its bark darkens and roughens with age.
 */
function root(bag, o) {
	if (!DETAIL.roots) return;
	const { seed, key, from, length, radius, young, old } = o;
	const grown = clamp(o.grown);
	if (grown <= 0.002 || length * grown < 1e-4) return;
	const r = chance(seed, 'root', ...key);
	const down = o.down ?? 0.15, wander = o.wander ?? 0.35, order = o.order ?? 0, depth = o.depth ?? 2;
	const steps = Math.max(4, Math.min(28, Math.round(10 + length * 30)));
	const step = length / steps;
	const path = [from.clone()];
	const dir = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		dir.y -= down;
		dir.x += (r() * 2 - 1) * wander;
		dir.y += (r() * 2 - 1) * wander * 0.5;
		dir.z += (r() * 2 - 1) * wander;
		if (dir.y > -0.05 && path[i].y > -0.004) dir.y = -0.25;
		dir.normalize();
		const next = path[i].clone().addScaledVector(dir, step);
		if (o.floor !== undefined && next.y < o.floor) next.y = o.floor + (next.y - o.floor) * 0.1;
		path.push(next);
	}
	const reach = grown * steps;
	const whole = Math.floor(reach);
	const pts = path.slice(0, whole + 1);
	if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
	if (pts.length < 2) return;
	const age = clamp(o.age ?? 0);
	const r0 = radius * (0.35 + 0.65 * grown);
	const taper = o.taper ?? 0.7;
	const ns = hashText(seed + key.join('.')) % 1000;
	bag.add(
		'body',
		tube(
			pts,
			(u, v, s) => r0 * (1 - taper * Math.pow(u, 0.7)) * (1 + (age > 0.3 ? 0.08 * (noise3(Math.cos(v * 6.283) * 2, Math.sin(v * 6.283) * 2, s * 25, ns) - 0.5) : 0)),
			(u, v, s) => {
				const c = mix(old, young, u * 1.6 + 0.45 - age);
				if (age > 0.3) c.lerp(new THREE.Color('#3c2c20'), 0.35 * noise3(v * 8, s * 30, 0, ns) * (1 - u));
				return c;
			},
			order ? 4 : 6,
			true,
		),
	);
	if (order >= depth) return;
	const n = Math.round(o.laterals ?? 6);
	for (let i = 0; i < n; i++) {
		const at = between(r, 0.1, 0.88);
		const bear = r() * Math.PI * 2;
		const longer = between(r, 0.5, 1);
		const here = at * steps;
		if (here > reach - 0.6) {
			r();
			continue;
		}
		const k = Math.floor(here);
		const p = path[k].clone().lerp(path[k + 1], here - k);
		const along = path[k + 1].clone().sub(path[k]).normalize();
		const ldir = new THREE.Vector3(Math.cos(bear), 0, Math.sin(bear)).addScaledVector(along, 0.35).normalize();
		root(bag, {
			...o,
			key: [...key, i],
			from: p,
			dir: ldir,
			length: length * (o.lateral ?? 0.35) * longer,
			grown: (reach - here) / (steps * 0.55),
			radius: radius * (o.thin ?? 0.42) * (1 - 0.5 * at),
			down: down * 0.6,
			laterals: Math.round(n * 0.6),
			order: order + 1,
			age: age * 0.7,
			floor: o.floor,
		});
		r();
	}
}

/* ================================================================================================================
 * 2. ORGANS — the Queen Victoria's own, each to its measure
 * ============================================================================================================== */

/** as many zeros as a list has numbers: normals to be worked out from the shape */
const zeros = (a) => new Array(a.length).fill(0);
/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);

/**
 * The Queen Victoria's numbers. Sizes in metres from the data sheet; the leaf's outline and the fruit's profile traced
 * off its reference sheet (play file 94c914d0…, Nano Banana Pro, 2026-11-05) with plant-skill's trace.py, and its
 * colours (linear sRGB) clustered off its panels after grey-balancing the plate on its checker.
 */
const QV = {
	/**
	 * A leaf's half-width along it, base to tip, as parts of the blade's widest (the sheet's D leaf, turned upright
	 * and traced): the clasping sheath a quarter wider than the blade, a waist where it narrows into the blade, the
	 * blade nearly even to half way and then tapering nearly straight to its spine (24 stations, spines and all).
	 */
	leafShape: [[0, 1.26], [0.05, 1.2], [0.1, 1.16], [0.15, 1.08], [0.2, 0.97], [0.26, 0.93], [0.35, 0.95], [0.45, 0.96], [0.52, 0.93], [0.57, 0.9], [0.62, 0.82], [0.7, 0.72], [0.78, 0.61], [0.83, 0.52], [0.87, 0.43], [0.91, 0.33], [0.96, 0.17], [1, 0.03]],
	/** how far round its channel a leaf curls along it (half the arc, radians): the sheath wrapped round the stem, the blade a U */
	leafCurl: [[0, 2.0], [0.08, 1.75], [0.18, 1.0], [0.3, 0.85], [0.7, 0.82], [0.92, 1.05], [1, 1.15]],
	/**
	 * The fruit's radius along its height as parts of its widest, base to top: the ripe fruit on the sheet (a short
	 * cylinder narrowing in its top third), its ends rounded closed; the young cone (red heart to dry petal) is more
	 * pointed (the sheet's red cone and dry-petal fruit).
	 */
	fruitShape: [[0, 0], [0.01, 0.45], [0.04, 0.7], [0.09, 0.84], [0.16, 0.92], [0.26, 0.97], [0.38, 1], [0.5, 1], [0.6, 0.98], [0.7, 0.94], [0.8, 0.86], [0.88, 0.76], [0.95, 0.6], [1, 0.3]],
	coneShape: [[0, 0], [0.03, 0.45], [0.1, 0.78], [0.22, 0.95], [0.34, 1], [0.48, 0.97], [0.62, 0.88], [0.76, 0.72], [0.88, 0.52], [0.96, 0.33], [1, 0.18]],

	colour: {
		leaf: lin(0.17, 0.2, 0.115), // a grown leaf's upper face, grey-green (the rosettes of row 1: 0.19/0.21/0.14; the D leaf 0.18/0.21/0.09)
		leafPale: lin(0.27, 0.3, 0.2), // its glaucous light (p90 0.28/0.30/0.23)
		leafYoung: lin(0.2, 0.25, 0.1), // a young heart leaf, greener
		sheath: lin(0.72, 0.57, 0.38), // the clasping base, cream (the D leaf's base 0.64–0.67/0.52/0.33–0.37)
		sheathGreen: lin(0.34, 0.36, 0.16), // where the sheath goes into the blade
		under: lin(0.42, 0.41, 0.39), // the underside, silvery (the panel's 0.37/0.36/0.35 median, 0.55 at its lightest; its picture darkens the stripes between)
		underBase: lin(0.6, 0.55, 0.42),
		bronze: lin(0.3, 0.11, 0.065), // the red-bronze flush of an old leaf's margins and tip (the old leaf 0.28/0.10/0.06)
		bronzePale: lin(0.42, 0.18, 0.13),
		straw: lin(0.55, 0.42, 0.22), // a leaf tip drying
		dead: lin(0.26, 0.17, 0.09), // a dead outer leaf
		spine: lin(0.32, 0.12, 0.07), // a spine's tip, red-brown
		spineBase: lin(0.45, 0.42, 0.22),
		heartRed: lin(0.62, 0.06, 0.05), // the red heart's bracts and the heart leaves' flush (0.44–0.62/0.04–0.07/0.04–0.05)
		heartDark: lin(0.3, 0.05, 0.04),
		stem: lin(0.59, 0.44, 0.27), // the stem inside its sheaths (the cut stem: cream 0.59/0.44/0.27)
		stemDark: lin(0.25, 0.21, 0.13),
		rootYoung: lin(0.42, 0.33, 0.19),
		rootOld: lin(0.12, 0.1, 0.04), // the washed roots, brown (0.12–0.25)
		peduncle: lin(0.2, 0.22, 0.09),
		// the fruit by age (the four fruits of row 3): a dome (the eye), its bract, the groove between eyes
		// each eye as the sheet draws it: the crescent along its lower rim, the shield's upper part round the bract, the
		// bract, the groove under the crescent
		redCrescent: lin(0.46, 0.07, 0.07), redUpper: lin(0.52, 0.1, 0.1), redBract: lin(0.58, 0.16, 0.15), redGroove: lin(0.25, 0.02, 0.022),
		dryCrescent: lin(0.17, 0.15, 0.085), dryUpper: lin(0.25, 0.21, 0.125), dryBract: lin(0.34, 0.29, 0.19), dryGroove: lin(0.06, 0.05, 0.025),
		greenCrescent: lin(0.17, 0.155, 0.15), greenUpper: lin(0.26, 0.215, 0.185), greenBract: lin(0.39, 0.32, 0.27), greenGroove: lin(0.02, 0.02, 0.014),
		ripeCrescent: lin(0.86, 0.32, 0.045), ripeUpper: lin(0.72, 0.27, 0.055), ripeBract: lin(0.58, 0.37, 0.18), ripeGroove: lin(0.4, 0.14, 0.03),
		scar: lin(0.12, 0.07, 0.035), // the dried flower in the eye's cup
		petal: lin(0.33, 0.25, 0.67), // the petals, violet-blue (0.33/0.25/0.67; light 0.44/0.35/0.72)
		petalLight: lin(0.44, 0.35, 0.72),
		petalBase: lin(0.75, 0.74, 0.78),
		withered: lin(0.16, 0.09, 0.13),
		crown: lin(0.27, 0.26, 0.18), // the crown's leaves, grey-green (0.22/0.20/0.15 in the plate's light; its upper faces stand in their own shade)
		crownRed: lin(0.42, 0.1, 0.08),
	},
};

/* ---- the leaf ---- */

/**
 * One leaf: a stiff sword, built in the plant's own frame from `at` (its foot on the stem) out along azimuth `az`,
 * `pitch` radians from the vertical at its foot, arching out a further `bend` by its tip. Its cross-section is an arc
 * (`QV.leafCurl`): at its foot the broad pale sheath wrapped round the stem, then a deep U channel, its upper face
 * towards the plant's axis and the sky. Hooked spines along the whole margin (the Queen group's mark), curving toward
 * the tip, about every 4–5 mm, closer at its foot. `paint(u, v)` its upper face's colour (u 0 … 1 foot to tip, v −1 … 1
 * across), `under(u, v)` its underside's, each its own face with its own normals. Gives { parts: [{ kind, geo }] }.
 */
function pineLeaf(o) {
	const { L, W, pitch, bend, az, at, r, paint, under } = o;
	const along = Math.max(5, fewer(o.along ?? 34, 5));
	const across = Math.max(2, 2 * Math.round(fewer(o.across ?? 8, 2) / 2));
	const yaw = (r() - 0.5) * 0.18;
	const roll = (r() - 0.5) * 0.25;
	const thick = Math.max(0.0006, 0.0025 * Math.min(1, L / 0.5));
	// the midline, its tangent t, its face n (toward the axis and the sky) and its side b
	const C = [], T = [], N = [], B = [];
	let p = at.clone();
	for (let i = 0; i <= along; i++) {
		const u = i / along;
		const th = pitch + bend * Math.pow(u, 1.7);
		const a = az + yaw * u;
		const out = v3(Math.cos(a), 0, Math.sin(a));
		const t = out.clone().multiplyScalar(Math.sin(th)).addScaledVector(UP, Math.cos(th)).normalize();
		const b = v3(-Math.sin(a), 0, Math.cos(a));
		b.applyAxisAngle(t, roll * u);
		const n = new THREE.Vector3().crossVectors(b, t).normalize();
		if (i) p = p.clone().addScaledVector(T[i - 1].clone().add(t).normalize(), L / along);
		C.push(p);
		T.push(t);
		N.push(n);
		B.push(new THREE.Vector3().crossVectors(t, n).normalize());
	}
	const half = (u) => Math.max(0.0004, table(u, QV.leafShape) * W * 0.5);
	const pos = [], posB = [], uv = [], col = [], colB = [], idx = [], idxB = [];
	const ns = new THREE.Vector3();
	const edge = [[], []];
	for (let i = 0; i <= along; i++) {
		const u = i / along;
		const w = half(u);
		const A = table(u, QV.leafCurl);
		const rho = w / Math.sin(A);
		for (let j = 0; j <= across; j++) {
			const v = (j / across) * 2 - 1;
			const x = rho * Math.sin(v * A), y = rho * (1 - Math.cos(v * A));
			const P = C[i].clone().addScaledVector(B[i], x).addScaledVector(N[i], y);
			ns.copy(N[i]).multiplyScalar(Math.cos(v * A)).addScaledVector(B[i], -Math.sin(v * A));
			pos.push(P.x, P.y, P.z);
			posB.push(P.x - ns.x * thick, P.y - ns.y * thick, P.z - ns.z * thick);
			uv.push((v + 1) / 2, (u * L) / 0.25);
			const c = paint(u, v), cb = under(u, v);
			col.push(c.r, c.g, c.b);
			colB.push(cb.r, cb.g, cb.b);
			if (j === 0 || j === across) {
				// the margin, and which way a spine on it points: on along the arc, out of the leaf
				const dir = B[i].clone().multiplyScalar(Math.cos(A) * v).addScaledVector(N[i], Math.sin(A));
				edge[j ? 1 : 0].push({ P, dir: dir.normalize(), t: T[i], u, w });
			}
		}
	}
	for (let i = 0; i < along; i++)
		for (let j = 0; j < across; j++) {
			const a = i * (across + 1) + j, b = a + across + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
			idxB.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const dry = o.dead > 0.6;
	const parts = [
		{ kind: dry ? 'fibre' : 'leaf', geo: made(pos, zeros(pos), uv, col, idx, true) },
		{ kind: dry ? 'fibre' : 'under', geo: made(posB, zeros(posB), uv.slice(), colB, idxB, true) },
	];
	// the spines: a small hooked tooth every few millimetres along both margins, from above the sheath to the tip
	if (o.spines && DETAIL.level >= 0.5) {
		const sp = [], su = [], sc = [], si = [];
		const size = o.spines;
		for (const list of edge) {
			let s = 0.12 * L + (r() * 0.004);
			const total = L * 0.985;
			while (s < total) {
				const u = s / L;
				const k = Math.min(list.length - 2, Math.floor(u * along));
				const f = u * along - k;
				const P = list[k].P.clone().lerp(list[k + 1].P, f);
				const d = list[k].dir.clone().lerp(list[k + 1].dir, f).normalize();
				const t = list[k].t.clone().lerp(list[k + 1].t, f).normalize();
				const len = size * 0.0016 * (0.75 + 0.5 * r()) * (u > 0.9 ? 0.7 : 1);
				const base = size * 0.0008;
				const tip = P.clone().addScaledVector(d, len).addScaledVector(t, len * 0.7);
				const at0 = sp.length / 3;
				for (const q of [P.clone().addScaledVector(t, -base), P.clone().addScaledVector(t, base), tip]) sp.push(q.x, q.y, q.z);
				const c0 = mix(QV.colour.spineBase, QV.colour.spine, 0.3 + 0.5 * u), c1 = QV.colour.spine;
				sc.push(c0.r, c0.g, c0.b, c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
				su.push(0, 0, 1, 0, 0.5, 1);
				si.push(at0, at0 + 1, at0 + 2);
				s += (u < 0.35 ? 0.0035 : 0.0048) * (0.85 + 0.3 * r()) * Math.max(0.6, size);
			}
		}
		// the hard spine at the tip
		const tp = C[along], tt = T[along];
		const at0 = sp.length / 3;
		const sideways = B[along].clone().multiplyScalar(0.0006 * size);
		for (const q of [tp.clone().sub(sideways), tp.clone().add(sideways), tp.clone().addScaledVector(tt, 0.004 * size)]) sp.push(q.x, q.y, q.z);
		for (let k = 0; k < 3; k++) sc.push(QV.colour.spine.r, QV.colour.spine.g, QV.colour.spine.b);
		su.push(0, 0, 1, 0, 0.5, 1);
		si.push(at0, at0 + 1, at0 + 2);
		if (si.length) parts.push({ kind: 'sheet', geo: made(sp, zeros(sp), su, sc, si, true) });
	}
	return { parts, tip: C[along], mid: C };
}

/**
 * How a leaf is painted, from what it is: `tone` its own lightness, `young` 1 for a leaf still coming out of the heart
 * (greener), `red` its red-bronze flush (margins and tip, in the sun), `heart` the red heart's flush at its foot, `dry`
 * how far down from its tip it has dried, `dead` the whole leaf browned.
 */
function leafPaint(o) {
	const K = QV.colour;
	const { tone = 1, young = 0, red = 0, heart = 0, dry = 0, dead = 0, crown = 0, seed = 0 } = o;
	const green = mix(K.leaf, K.leafYoung, young).lerp(K.crown, crown).multiplyScalar(tone);
	const sheathTo = (u) => smooth((u - 0.09) / 0.12);
	const paint = (u, v) => {
		const a = Math.abs(v);
		const c = mix(K.sheath, K.sheathGreen, sheathTo(u)).lerp(green, smooth((u - 0.17) / 0.2));
		c.lerp(K.leafPale, 0.25 * (noise3(u * 9, v * 2, seed, 3) - 0.3));
		// the margins and the tip flushed red-bronze on a leaf in the sun
		if (red > 0) c.lerp(mix(K.bronze, K.bronzePale, noise3(u * 12, v, seed, 4)), clamp(red * (smooth((a - 0.55) / 0.4) * 0.8 + smooth((u - 0.55) / 0.45) * 0.7) * smooth((u - 0.12) / 0.1)));
		// the red heart: the young heart leaves red at their feet
		if (heart > 0) c.lerp(K.heartRed, heart * (1 - smooth((u - 0.04) / 0.22)));
		// drying from the tip down
		if (dry > 0) {
			const d = smooth((u - (1 - dry)) / 0.12 + (noise3(u * 20, v * 3, seed, 6) - 0.5) * 0.6);
			c.lerp(mix(K.straw, K.dead, smooth((u - (1 - dry * 0.6)) / 0.1)), d);
		}
		if (dead > 0) c.lerp(mix(K.dead, K.straw, noise3(u * 14, v * 2, seed, 7)), dead);
		return c;
	};
	const under = (u, v) => {
		const c = mix(K.underBase, K.under, smooth((u - 0.08) / 0.12)).lerp(green, young * 0.4 + crown * 0.5);
		if (red > 0) c.lerp(K.bronzePale, red * 0.4 * smooth((u - 0.6) / 0.4));
		if (heart > 0) c.lerp(K.heartRed, heart * 0.7 * (1 - smooth((u - 0.04) / 0.2)));
		if (dry > 0) c.lerp(K.straw, smooth((u - (1 - dry)) / 0.12));
		if (dead > 0) c.lerp(K.dead, dead);
		return c;
	};
	return { paint, under };
}

/* ---- the stem and its roots ---- */

/**
 * The stem: a club, `len` long from its buried foot (`foot`, below the soil) to its top, `r0` thick at its foot and
 * `r1` at its top, wholly hidden by the leaf bases above the soil; cream inside its sheaths, brown where buried.
 */
function stem(bag, o) {
	const { foot, len, r0, r1, curve = 0, az = 0 } = o;
	const pts = [];
	const steps = fewer(10, 4);
	const side = v3(Math.cos(az), 0, Math.sin(az));
	for (let i = 0; i <= steps; i++) {
		const s = i / steps;
		// a sucker's foot is curved: it grew out sideways from its mother's stem before it was cut and planted
		pts.push(foot.clone().addScaledVector(UP, s * len).addScaledVector(side, curve * Math.pow(1 - s, 2)));
	}
	bag.add('body', tube(pts, (u) => lerp(r0, r1, Math.pow(u, 0.8)) * (u > 0.98 ? 0.7 : 1), (u, v, s) => mix(QV.colour.stemDark, QV.colour.stem, smooth((foot.y + s + 0.02) / 0.05)), fewer(10, 4), true));
	return pts[steps];
}

/* ---- the fruit ---- */

/** the shortest way round from angle b to angle a */
const turnTo = (a, b) => {
	let d = (a - b) % (Math.PI * 2);
	if (d > Math.PI) d -= Math.PI * 2;
	if (d < -Math.PI) d += Math.PI * 2;
	return d;
};

/**
 * The eyes of a fruit `H` tall and `R` round at its widest, profile `shape`: `count` eyes on a generative spiral at the
 * golden angle (one hand or the other, by the plant's chance), each the next a step up the surface in proportion to the
 * girth there, so that the nearest neighbours of each are its 8th and 13th, the two families of spirals a pineapple
 * shows (Onderdonk 1970: 8 and 13 on a normal fruit, 5 and 21 seen too). The lattice is laid on the surface's own
 * length (σ, along its profile from the foot) and angle. Gives the eyes and the profile as a table of σ.
 */
function eyeLattice(H, R, shape, count, hand) {
	// the profile by its length along the surface: rows of [σ, radius, height, s]
	const prof = [];
	let sig = 0;
	let last = null;
	for (let i = 0; i <= 200; i++) {
		const s = (1 - Math.cos((Math.PI * i) / 200)) / 2;
		const rr = table(s, shape) * R, yy = s * H;
		if (last) sig += Math.hypot(rr - last[0], yy - last[1]);
		prof.push([sig, rr, yy, s]);
		last = [rr, yy];
	}
	const total = sig;
	const radiusAt = (g) => {
		let lo = 0, hi = prof.length - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (prof[m][0] < g) lo = m;
			else hi = m;
		}
		const k = (g - prof[lo][0]) / Math.max(1e-9, prof[hi][0] - prof[lo][0]);
		return { r: lerp(prof[lo][1], prof[hi][1], k), y: lerp(prof[lo][2], prof[hi][2], k), s: lerp(prof[lo][3], prof[hi][3], k) };
	};
	// eyes from just above the foot to under the crown; the step up the surface by the girth there, scaled so `count` fit
	const from = 0.035 * total, to = 0.94 * total;
	const lay = (c) => {
		const eyes = [];
		let g = from;
		while (g < to && eyes.length < 400) {
			eyes.push(g);
			g += c * 2 * Math.PI * Math.max(0.15 * R, radiusAt(g).r);
		}
		return eyes;
	};
	let lo = 0.0005, hi = 0.05;
	for (let it = 0; it < 40; it++) {
		const m = (lo + hi) / 2;
		if (lay(m).length > count) lo = m;
		else hi = m;
	}
	const c = hi;
	const phi = (hand * 137.508 * Math.PI) / 180;
	const eyes = lay(c).map((g, k) => ({ k, g, a: k * phi, r: radiusAt(g).r }));
	// each eye's size: the distance to its 8th neighbour (the spirals' own step)
	for (const e of eyes) {
		const n = eyes[e.k + 8] ?? eyes[e.k - 8];
		e.size = n ? Math.hypot(e.r * turnTo(e.a, n.a), e.g - n.g) : 0.02;
	}
	return { eyes, total, radiusAt, prof };
}

/**
 * The fruit: a lathe from its foot (`at`, standing up along `dir`) its eyes raised on it as shields — each a rounded dome
 * between deep grooves (Queen's eyes are deep), its floral bract a pale triangle over its lower half with its tip
 * standing free, the dried flower in a small cup above the bract — coloured by its age: `stage` 0 red (the red heart),
 * 1 flowering, 2 dry petal, 3 grey-green filling, and `yellow` how far up from its foot it has turned (0 … 1).
 * `flowers(k)` says of eye k whether its flower is open (1), withered (0 … 1 left), or neither (−1).
 */
function fruitBody(bag, o) {
	const { at, dir, H, R, seed, key, stage, yellow = 0, count = 80, hand = 1, flowers } = o;
	const r = chance(seed, 'fruit', ...key);
	const shape = QV.fruitShape.map(([s, x]) => [s, lerp(table(s, QV.coneShape), x, clamp(o.full ?? 1))]);
	const lat = eyeLattice(H, R, shape, count, hand);
	const { eyes, total, radiusAt } = lat;
	const close = DETAIL.fruit ? 1.6 : 1;
	const around = Math.max(12, Math.round(fewer(150, 10) * close));
	const rows = Math.max(10, Math.round(fewer(110, 8) * close));
	const K = QV.colour;
	// the colours of this age
	const age = (w) => [K[`${w}Crescent`], K[`${w}Upper`], K[`${w}Bract`], K[`${w}Groove`]];
	const ages = [age('red'), age('red').map((c, j) => mix(c, age('dry')[j], j === 2 ? 0 : 0.45)), age('dry'), age('green')];
	const st = clamp(stage, 0, 3);
	const i0 = Math.min(2, Math.floor(st)), f = st - i0;
	const [cres0, upper0, bract0, groove0] = [0, 1, 2, 3].map((j) => mix(ages[i0][j], ages[i0 + 1][j], f));
	const eyeTone = eyes.map((e) => ({ t: about(r, 1, 0.07), y: about(r, 0, 0.06), a: r() }));
	// how far the fruit has turned at a height (for the bract's shape: young and green, or swollen and ripening)
	const turnedAt = (s) => clamp(clamp(st - 2) * 0.4 + yellow * 0.6 + (o.full ?? 1) * 0.3 - s * 0.1);
	// the eye nearest a point on the surface, and its second nearest
	const near = (g, a, rr) => {
		let lo = 0, hi = eyes.length - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (eyes[m].g < g) lo = m;
			else hi = m;
		}
		let f1 = 9, f2 = 9, best = null, bx = 0, by = 0;
		for (let k = Math.max(0, lo - 26); k <= Math.min(eyes.length - 1, lo + 26); k++) {
			const e = eyes[k];
			const dx = Math.max(rr, 0.2 * R) * turnTo(a, e.a), dy = g - e.g;
			const d = Math.hypot(dx, dy);
			if (d < f1) {
				f2 = f1;
				f1 = d;
				best = e;
				bx = dx;
				by = dy;
			} else if (d < f2) f2 = d;
		}
		return { e: best, f1, f2, dx: bx, dy: by };
	};
	const pos = [], uv = [], col = [], idx = [];
	const side = across(dir);
	const side2 = new THREE.Vector3().crossVectors(dir, side).normalize();
	const frame = (y, rr, a) => at.clone().addScaledVector(dir, y).addScaledVector(side, rr * Math.cos(a)).addScaledVector(side2, rr * Math.sin(a));
	for (let i = 0; i <= rows; i++) {
		const g = ((1 - Math.cos((Math.PI * i) / rows)) / 2) * total;
		const here = radiusAt(g);
		for (let j = 0; j <= around; j++) {
			const a = (j / around) * Math.PI * 2;
			let lift = 0;
			let c;
			const ends = smooth(Math.min(g, total - g) / (0.04 * total));
			if (eyes.length) {
				const n = near(g, a, here.r);
				const e = n.e, size = e.size;
				// the eye's own coordinates: x round, y up the fruit, in parts of its size; b 0 on its border … 1 inside,
				// rounded off toward its corners so the eye is a rounded shield, not a lozenge
				const x = n.dx / size, y = n.dy / size;
				const b = Math.min(clamp((n.f2 - n.f1) / size), smooth((0.62 - n.f1 / size) / 0.5));
				// a rounded shield between deep grooves, swollen most along its lower rim (the sheet: a crescent under
				// each bract, dark on the green fruit, bright orange on the ripe)
				const dome = Math.pow(smooth(b / 0.6), 0.38) * (0.86 + 0.24 * Math.exp(-Math.pow((y + 0.3) / 0.22, 2)));
				// the bract: a pale triangle over the eye's middle, its base across the eye a little below its centre and its
				// tip at the eye's top; broad while the fruit is young (it covers most of the green eye), narrower ripe
				const t0 = turnedAt(here.s);
				const bw = lerp(0.55, 0.46, t0), base0 = lerp(-0.3, -0.12, t0), apex = 0.52;
				const bract = y > base0 && y < apex ? smooth((bw * (apex - y) / (apex - base0) - Math.abs(x)) / 0.12 + 0.3) * smooth((y - base0) / 0.12) : 0;
				const cup = Math.exp(-((x * x + (y - 0.06) * (y - 0.06)) / 0.004));
				const A = 0.21 * size * (0.55 + 0.45 * clamp(o.full ?? 1)) * ends;
				lift = A * (dome + 0.15 * bract * dome - 0.35 * cup * dome) - 0.1 * size * ends;
				// colour: yellowing from the foot up, eye by eye
				const tone = eyeTone[e.k];
				const turned = clamp((yellow * 1.15 - here.s + tone.y) / 0.12);
				const ripe = (c0, c1) => mix(c0, c1, turned);
				const crescent = smooth((base0 + 0.02 - y) / 0.14);
				c = mix(ripe(upper0, K.ripeUpper), ripe(cres0, K.ripeCrescent), crescent).multiplyScalar(tone.t);
				// the groove: deep and dark under the crescent, a fine line above
				const groove = 1 - smooth(b / (y < 0 ? 0.13 : 0.06));
				c.lerp(ripe(groove0, K.ripeGroove), groove);
				const fibres = 0.8 + 0.3 * noise3(x * 34, y * 3, e.k, 31) - 0.15 * Math.pow(Math.abs(Math.cos(Math.atan2(x, 0.55 - y) * 9)), 8);
				c.lerp(ripe(bract0, K.ripeBract).multiplyScalar(lerp(0.85, 1.05, tone.a) * fibres), bract * 0.85);
				c.lerp(K.scar, cup * 0.8 * clamp(st - 1 + turned));
			} else c = upper0.clone();
			const P = frame(here.y, Math.max(0, here.r + lift * (here.r > 0.15 * R ? 1 : here.r / (0.15 * R))), a);
			pos.push(P.x, P.y, P.z);
			uv.push((a * Math.max(R, 0.01)) / 0.03, g / 0.03);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rows; i++)
		for (let j = 0; j < around; j++) {
			const a = i * (around + 1) + j, b = a + around + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	const geo = made(pos, zeros(pos), uv, col, idx, true);
	smoothSeam(geo, around, rows);
	bag.add('skin', geo);
	// the bracts' tips standing free of the shell, and the flowers
	const fine = DETAIL.level >= 0.3;
	for (const e of eyes) {
		const g0 = e.g + 0.3 * e.size;
		const here = radiusAt(g0);
		if (here.r < 0.2 * R) continue;
		const P = frame(here.y, here.r + 0.1 * e.size, e.a);
		const above = radiusAt(g0 + 0.01 * total);
		const upS = frame(above.y, above.r, e.a).sub(frame(here.y, here.r, e.a)).normalize();
		const outN = frame(here.y, 1, e.a).sub(frame(here.y, 0, e.a)).normalize();
		const turned = clamp((yellow * 1.15 - here.s + eyeTone[e.k].y) / 0.12);
		if (fine) {
			const L = e.size * 0.36;
			const d = upS.clone().multiplyScalar(Math.cos(0.5)).addScaledVector(outN, Math.sin(0.5)).normalize();
			const nrm = outN.clone().addScaledVector(d, -outN.dot(d)).normalize();
			const M = new THREE.Matrix4().makeBasis(d, nrm, new THREE.Vector3().crossVectors(d, nrm)).setPosition(P);
			const bc = mix(mix(K.redBract, mix(K.dryBract, K.greenBract, clamp(st - 2)), clamp(st - 1)), K.ripeBract, turned);
			const tipC = mix(bc, K.scar, 0.5 * clamp(st - 1.5));
			bag.add('sheet', sheet({ length: L, width: e.size * 0.13, shape: (u) => Math.pow(1 - u, 1.1) * (0.6 + 0.4 * Math.min(1, u * 6)), lift: (u, v) => 0.12 * v * v - 0.1 * u * u, paint: (u) => mix(bc, tipC, smooth((u - 0.55) / 0.4)), along: 3, across: 2 }), M);
		}
		// a flower: a violet tube from the eye's cup, its three petals open for a day; then withered
		const fl = flowers ? flowers(e.k) : -1;
		if (fl < 0 || !fine) continue;
		const cupAt = radiusAt(e.g + 0.06 * e.size);
		const Q = frame(cupAt.y, cupAt.r + 0.05 * e.size, e.a);
		const fdir = upS.clone().multiplyScalar(0.55).addScaledVector(outN, 0.85).normalize();
		if (fl >= 1) {
			const len = 0.02;
			const tip = Q.clone().addScaledVector(fdir, len);
			bag.add('sheet', tube([Q, Q.clone().addScaledVector(fdir, len * 0.5), tip], (u) => 0.0028 + 0.001 * u, (u) => mix(K.petalBase, K.petal, smooth((u - 0.35) / 0.5)), fewer(6, 3)));
			const s1 = across(fdir), s2 = new THREE.Vector3().crossVectors(fdir, s1);
			for (let p = 0; p < 3; p++) {
				const ang = e.a * 3 + (p * Math.PI * 2) / 3;
				const rad = s1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(s2, Math.sin(ang));
				const pd = fdir.clone().multiplyScalar(0.55).addScaledVector(rad, 0.83).normalize();
				const face = rad.clone().multiplyScalar(-1).addScaledVector(pd, pd.dot(rad)).normalize();
				const M = new THREE.Matrix4().makeBasis(pd, face, new THREE.Vector3().crossVectors(pd, face)).setPosition(tip.clone().addScaledVector(fdir, -0.003));
				bag.add('sheet', sheet({ length: 0.01, width: 0.008, shape: (u) => Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.85)) * 0.5, lift: (u) => -0.25 * u * u, paint: (u) => mix(K.petal, K.petalLight, u), along: 4, across: 2 }), M);
			}
		} else if (fl > 0) {
			// withered: a short dark curl of the dead perianth
			const len = 0.008 * (0.5 + 0.5 * fl);
			const pts = [Q, Q.clone().addScaledVector(fdir, len * 0.6), Q.clone().addScaledVector(fdir, len).addScaledVector(upS, -0.002)];
			bag.add('sheet', tube(pts, (u) => 0.0022 * (1 - 0.5 * u), () => mix(K.withered, K.scar, 1 - fl), 4, true));
		}
	}
	return { top: frame(H * 0.985, 0, 0), eyes, total };
}

/** a lathe's seam (the first and last columns at the same place) given one normal, so no line shows down it */
function smoothSeam(geo, around, rows) {
	const n = geo.attributes.normal;
	const v = new THREE.Vector3();
	for (let i = 0; i <= rows; i++) {
		const a = i * (around + 1), b = a + around;
		v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b));
		if (v.lengthSq() < 1e-12) continue;
		v.normalize();
		n.setXYZ(a, v.x, v.y, v.z);
		n.setXYZ(b, v.x, v.y, v.z);
	}
	n.needsUpdate = true;
}

/* ================================================================================================================
 * 3. THE PLANT — the mother, her leaves one by one, her fruit, and the suckers that follow her
 * ============================================================================================================== */

/**
 * How it grows, in days from planting a 250 g sucker in the lowlands of Réunion (Saint-Pierre, about 23 °C):
 * the sucker comes with about 27 leaves (S3); a new leaf every 7 days or so (0.13–0.17 a day, S1, S3); forced with
 * ethephon at six months, when the D leaf weighs 50 g and the plant about 1 kg with some 50 leaves (S1, S3, S5; 5–7
 * months in the lowlands); the leaves already begun come out after it, ever shorter (S6); nothing shows for two months,
 * then the red heart (60 days), the first flowers (75), 5–10 a day from the base up (S2, S6), dry petal (~92); harvest
 * 150–200 days after forcing (88–137 from the red heart, S2), here 170.
 */
const GROW = {
	sucker: 27, // leaves the planted sucker comes with
	rate: 0.14, // new leaves a day
	forcing: 182, // days from planting
	leaves: 56, // leaves in all: 27 + 25 to forcing + the four already begun
	divergence: (137.508 * Math.PI) / 180, // between one leaf and the next round the stem ([EST], the Fibonacci angle)
	/** a leaf's full length (m) by its number: the sucker's short ones, rising to the D leaves (55–65 cm), the last ones short */
	// (the D leaf, the youngest grown, from 10 g at planting to 50 g at forcing (S3), its length as about mass^0.43)
	length: [[1, 0.13], [6, 0.19], [12, 0.25], [20, 0.29], [27, 0.3], [32, 0.31], [36, 0.33], [40, 0.4], [44, 0.48], [48, 0.56], [51, 0.6], [52, 0.6], [53, 0.52], [54, 0.43], [55, 0.34], [56, 0.25]],
	/** a leaf's blade width (m) by its length: D leaf 4.8 cm at 60 cm (4.5–5, data sheet), the sucker's about 10 : 1 */
	width: (L) => 0.012 + 0.06 * L,
	/** days a new leaf takes to grow out to its length */
	elongation: 55,
	/** the day the oldest leaves of the sucker die, by number: they yellow from the tip, brown and lie on the mulch */
	death: (n) => (n <= 10 ? 70 + n * 12 : Infinity),
};
/** the day leaf `n` came out of the heart (the sucker's own before planting) */
const leafDay = (n) => (n <= GROW.sucker ? -(GROW.sucker - n) * 8 : (n - GROW.sucker) / GROW.rate);

/** the fruit: its size and its time, in days from forcing (`ds`) */
const FRUIT = {
	redHeart: 60, // the young red fruit shows in the heart (S2)
	firstFlower: 75, // the first flowers open at its foot (S2)
	flowering: 16, // days from the first flower to the last (75–86 at 5–10 a day)
	dryPetal: 93,
	harvest: 170, // all yellow (C4); half yellow (C2) about ten days before
	eyes: 80, // 75–86 (S1)
	H: 0.14, // ripe, without its crown (13–15 cm [EST from its mass])
	D: 0.102, // across (9.5–11 cm [EST])
	crown: 0.17, // the crown's height ripe (15–20 cm [EST]; 24.7 cm on India's larger Queen)
	peduncle: 0.09, // its stalk, ripe (8–15 cm [EST from Aubert's photographs])
};

/** how big the fruit is at `ds` days from forcing, as parts of its ripe height, width and the share of its full form */
function fruitSize(ds) {
	// a young cone: 4 cm at the red heart, 6 at first flower, about 6.5 × 4.7 cm at dry petal; then filling (10 % of the
	// mass at dry petal, half at mid-fill, 90 % at three quarters: data sheet), its size as the cube root of the mass
	if (ds < 30) return null;
	if (ds < FRUIT.dryPetal) {
		const h = table(ds, [[30, 0.004], [45, 0.016], [60, 0.04], [75, 0.056], [FRUIT.dryPetal, 0.065]]);
		return { H: h, D: h * table(ds, [[30, 1.2], [60, 0.9], [FRUIT.dryPetal, 0.72]]), full: 0 };
	}
	const k = clamp((ds - FRUIT.dryPetal) / (FRUIT.harvest - FRUIT.dryPetal));
	const curve = (x) => 1 / (1 + Math.exp(-9 * (x - 0.5)));
	const mass = 0.1 + (0.9 * (curve(k) - curve(0))) / (curve(1) - curve(0));
	const s = Math.cbrt(mass);
	const young = 0.72 * 0.065 / FRUIT.D;
	return { H: FRUIT.H * s, D: FRUIT.D * lerp(young / Math.cbrt(0.1), 1, smooth(k / 0.6)) * s, full: smooth(k / 0.45) };
}

/**
 * A rosette of leaves round an axis standing up at the origin of its own frame `M` (the mother's stem, a sucker's, the
 * crown): `leaves` each { n, L, W, pitch, bend, height (on the axis), r (the axis's radius there), paint } laid round it
 * by the divergence. Every leaf its own chance.
 */
function rosette(bag, o) {
	const { leaves, seed, key, M, turn = 0 } = o;
	for (const l of leaves) {
		const r = chance(seed, 'leaf', ...key, l.n);
		const az = turn + l.n * GROW.divergence * (o.hand ?? 1) + about(r, 0, 0.05);
		const at = v3(Math.cos(az) * l.r, l.height, Math.sin(az) * l.r);
		const { paint, under } = leafPaint({ ...l.look, seed: l.n * 7.3 });
		const leaf = pineLeaf({ L: l.L, W: l.W, pitch: l.pitch, bend: l.bend, az, at, r, paint, under, spines: l.spines, dead: l.look.dead ?? 0, along: l.along, across: l.across });
		for (const p of leaf.parts) bag.add(p.kind, p.geo, M);
	}
}

/**
 * The mother's leaves at `day`: each its own number, out of the heart on its day, grown to its length over some eight
 * weeks; standing upright in the heart and leaning out the older it is (the D leaves at about 45°, the old outer ones
 * flatter), arching more at the tip; the red heart's flush on the youngest; the sucker's oldest leaves dying and lying
 * down; the outer leaves flushed red-bronze in the sun.
 */
function motherLeaves(day, seed, o = {}) {
	const out = [];
	const made = Math.min(GROW.leaves, GROW.sucker + Math.max(0, day) * GROW.rate + 0.6);
	const ds = day - GROW.forcing;
	// how open the rosette stands: the planted sucker a tight fan, opening as it roots and grows
	const open = lerp(0.45, 1, smooth(day / 110));
	for (let n = 1; n <= Math.floor(made + 4.2) && n <= GROW.leaves; n++) {
		const born = leafDay(n);
		const r = chance(seed, 'leafplan', n);
		const age = day - born;
		if (age < -45) continue; // still deep in the heart
		const g = smooth((age + 45) / (GROW.elongation + 45));
		const Lf = table(n, GROW.length) * about(r, 1, 0.05) * (o.size ?? 1);
		const L = Lf * lerp(0.12, 1, g);
		if (L < 0.02) continue;
		// how many leaves came after it; after forcing, when no more come, the heart still opens out
		const rank = made - n + Math.max(0, ds) * 0.04;
		const died = GROW.death(n) + about(r, 0, 12);
		const dying = clamp((day - died) / 25);
		const down = clamp((day - died - 20) / 30);
		let pitch = table(rank, [[-4, 0.02], [0, 0.12], [2, 0.3], [4, 0.52], [8, 0.72], [14, 0.86], [22, 0.98], [32, 1.12], [45, 1.25], [56, 1.35]]) * open * lerp(0.55, 1, g);
		pitch += about(r, 0, 0.07);
		// stiff, but arching over toward the tip the further out it leans (the sheet's fountain)
		let bend = 0.25 + 1.0 * smooth(rank / 22) + about(r, 0, 0.1);
		// a dead leaf lies down on the mulch, and stays there, its sheath round the stem's foot
		pitch = lerp(pitch, 1.48, down);
		bend = lerp(bend, 0.15, down);
		const heart = ds > 35 ? clamp((ds - 38) / 20) * (1 - clamp((ds - 110) / 40)) * clamp(1 - (made - n) / 5) : 0;
		const red = clamp(rank / 26) * 0.55 * about(r, 1, 0.3);
		const height = -0.025 + 0.0032 * n;
		out.push({
			n, L, W: GROW.width(Lf) * lerp(0.75, 1, g) * (o.size ?? 1), pitch, bend, height: Math.max(-0.02, height) * (o.size ?? 1),
			r: (0.012 + 0.0003 * n) * (o.size ?? 1), spines: 1,
			look: { tone: about(r, 1, 0.06), young: 1 - smooth(age / 40), red, heart, dry: Math.max(dying * 0.9, clamp((rank - 30) / 30) * 0.12), dead: down },
		});
	}
	return { leaves: out, made };
}

/**
 * The crown: a small rosette on top of the fruit, its leaves short and stiff and spiny, the outer ones spreading,
 * the inner upright; `h` its height. Tinged red while the fruit is in flower.
 */
function crownLeaves(h, seed, redness) {
	const out = [];
	const count = Math.round(lerp(16, 64, smooth(h / 0.08)));
	for (let i = 0; i < count; i++) {
		const r = chance(seed, 'crownleaf', i);
		const k = i / Math.max(1, count - 1); // 0 the outermost, 1 the innermost
		const L = h * (0.32 + 0.72 * Math.sin(Math.PI * Math.min(1, 0.18 + k * 0.82))) * about(r, 1, 0.07);
		out.push({
			n: i, L, W: Math.max(0.004, L / 5.5), pitch: lerp(1.2, 0.05, Math.pow(k, 0.7)) + about(r, 0, 0.06), bend: lerp(0.35, 0.05, k), height: k * h * 0.12, r: 0.006 * (1 - k * 0.7),
			spines: 0.7, along: 12, across: 4,
			look: { tone: about(r, 1, 0.06), crown: 1, red: 0.1, heart: redness * (1 - k * 0.5), young: k * 0.3 },
		});
	}
	return out;
}

/**
 * One plant at `day` days from its planting: its stem and roots, its leaves, and (the mother only, after forcing) its
 * fruit on its peduncle, the red bracts under it, its crown, and two stem suckers out of the leaf axils.
 */
function pineapplePlant(bag, day, seed, key) {
	const r = chance(seed, 'plant', ...key);
	const turn = r() * Math.PI * 2;
	const hand = r() < 0.5 ? 1 : -1;
	const lean = about(r, 0, 0.03);
	const M = new THREE.Matrix4().makeRotationAxis(v3(Math.cos(turn), 0, Math.sin(turn)), lean);
	const { leaves, made } = motherLeaves(day, seed);
	// the stem: buried 8 cm, its top rising as the leaves come
	const top = -0.03 + 0.0032 * made + 0.01;
	const stemTop = stem(bag, { foot: v3(0, -0.09, 0), len: top + 0.09, r0: 0.014, r1: lerp(0.016, 0.026, smooth(day / 180)), curve: 0.04 * (1 - smooth(day / 200)), az: turn });
	// roots from the stem's foot, out and a little down into the ridge: a few on the planted sucker, some thirty at forcing
	const nr = Math.round(table(day, [[0, 5], [40, 14], [100, 24], [180, 32], [300, 36]]));
	for (let i = 0; i < nr; i++) {
		const rr = chance(seed, 'root', ...key, i);
		const born = i < 5 ? -30 : (i - 5) * 6;
		const a = i * 2.39996 + turn;
		root(bag, {
			seed, key: [...key, 'r', i], from: v3(Math.cos(a) * 0.012, -0.07 + i * 0.0012, Math.sin(a) * 0.012),
			dir: v3(Math.cos(a), -between(rr, 0.15, 0.6), Math.sin(a)), length: between(rr, 0.35, 0.75), grown: (day - born) / 160,
			radius: 0.0016, down: 0.025, wander: 0.22, laterals: 4, lateral: 0.3, depth: 1, age: (day - born) / 120, young: QV.colour.rootYoung, old: QV.colour.rootOld, floor: -0.45,
		});
	}
	rosette(bag, { leaves, seed, key, M, turn, hand });
	const ds = day - GROW.forcing;
	const size = fruitSize(ds);
	if (!size) return;
	// the peduncle: lengthening from the start of flowering (S6), finally 8–15 cm, the fruit rising clear of the heart
	const ped = FRUIT.peduncle * smooth((ds - 40) / 110);
	const foot = stemTop.clone().applyMatrix4(M);
	const dir = UP.clone().applyAxisAngle(v3(Math.cos(turn), 0, Math.sin(turn)), lean * 1.5).normalize();
	const fruitAt = foot.clone().addScaledVector(dir, Math.max(0.004, ped));
	const steps = fewer(6, 3);
	const pp = [];
	for (let i = 0; i <= steps; i++) pp.push(foot.clone().addScaledVector(dir, (i / steps) * (ped + size.H * 0.1)));
	bag.add('body', tube(pp, (u) => 0.011 * (1 - 0.15 * u) * lerp(0.6, 1, smooth(ds / 120)), () => QV.colour.peduncle, fewer(8, 4)));
	// the red bracts at the foot of the fruit: 5–7, red-orange at the red heart, spreading like a star; greening after
	const nb = 6;
	const red = clamp((ds - 40) / 18) * (1 - clamp((ds - 95) / 50));
	for (let i = 0; i < nb; i++) {
		const br = chance(seed, 'bract', ...key, i);
		const a = turn + (i * Math.PI * 2) / nb + about(br, 0, 0.15);
		const out = v3(Math.cos(a), 0, Math.sin(a));
		const L = (0.05 + 0.035 * smooth((ds - 40) / 40)) * about(br, 1, 0.1);
		const look = { tone: 1, heart: red, young: 0.6, red: 0.2 };
		const { paint, under } = leafPaint(look);
		const leaf = pineLeaf({ L, W: L / 5.5, pitch: lerp(0.35, 0.95, smooth((ds - 50) / 30)), bend: 0.4, az: a, at: fruitAt.clone().addScaledVector(out, size.D * 0.25).addScaledVector(dir, size.H * 0.04), r: br, paint, under, spines: 0.6, along: 10, across: 4 });
		for (const p of leaf.parts) bag.add(p.kind, p.geo);
	}
	// the fruit: red at the red heart, flowering from the base up, green, grey-green, yellowing from the base
	const stage = ds < FRUIT.firstFlower ? 0 : ds < FRUIT.dryPetal ? lerp(1, 2, (ds - FRUIT.firstFlower) / (FRUIT.dryPetal - FRUIT.firstFlower)) : lerp(2, 3, smooth((ds - FRUIT.dryPetal) / 30));
	const yellow = clamp((ds - (FRUIT.harvest - 22)) / 22);
	const opens = (k) => FRUIT.firstFlower + (FRUIT.flowering * k) / FRUIT.eyes + about(chance(seed, 'flower', ...key, k), 0, 1);
	const flowers = (k) => {
		const d = ds - opens(k);
		if (d < 0) return -1;
		// open a day, its petals lasting a day or two more before they wither (5–10 a day: a band of 10–15 in flower)
		if (d < 2.2) return 1;
		return d < 16 ? 1 - (d - 2.2) / 14 : -1;
	};
	bag.fruit([...key, 'fruit'], fruitAt, dir);
	const body = fruitBody(bag, { at: fruitAt, dir, H: size.H, R: size.D / 2, seed, key, stage, yellow, count: FRUIT.eyes, hand, flowers, full: size.full });
	// the crown on top: a tuft at the red heart, 15–20 cm ripe
	const ch = table(ds, [[45, 0.008], [75, 0.02], [FRUIT.dryPetal, 0.035], [130, 0.11], [FRUIT.harvest, FRUIT.crown]]);
	const cM = new THREE.Matrix4().makeBasis(across(dir).negate(), dir, new THREE.Vector3().crossVectors(across(dir).negate(), dir)).setPosition(body.top);
	cM.multiply(new THREE.Matrix4().makeRotationY(turn));
	rosette(bag, { leaves: crownLeaves(ch, seed + key.join('.'), red), seed, key: [...key, 'crown'], M: cM, hand: -hand });
	bag.fruitDone();
	// the stem suckers: from floral differentiation (S8), out of two leaf axils half way up, curving out and up
	for (const [i, n] of [[0, 30], [1, 37]]) {
		const sd = ds - 55 - i * 12;
		if (sd <= 0) continue;
		const sr = chance(seed, 'sucker', ...key, i);
		const a = turn + n * GROW.divergence * hand;
		const out = v3(Math.cos(a), 0, Math.sin(a));
		const base = v3(0, -0.025 + 0.0032 * n, 0).addScaledVector(out, 0.02).applyMatrix4(M);
		const tilt = lerp(0.75, 0.42, smooth(sd / 100)) + about(sr, 0, 0.08);
		const sdir = out.clone().multiplyScalar(Math.sin(tilt)).addScaledVector(UP, Math.cos(tilt));
		const x = across(sdir);
		const sM = new THREE.Matrix4().makeBasis(x, sdir, new THREE.Vector3().crossVectors(x, sdir)).setPosition(base.addScaledVector(sdir, 0.03));
		const sl = [];
		const count = Math.min(24, Math.round(4 + sd * 0.16));
		const grown = smooth(sd / 115);
		for (let j = 1; j <= count; j++) {
			const lr = chance(seed, 'suckerleaf', ...key, i, j);
			const rank = count - j;
			const L = 0.36 * grown * table(j, [[1, 0.35], [6, 0.6], [14, 0.95], [20, 1], [24, 0.8]]) * about(lr, 1, 0.06) * (rank < 3 ? lerp(0.5, 1, rank / 3) : 1);
			if (L < 0.015) continue;
			sl.push({ n: j, L, W: Math.max(0.005, L / 11), pitch: table(rank, [[0, 0.05], [4, 0.22], [10, 0.45], [20, 0.75]]), bend: 0.15 + 0.2 * smooth(rank / 15), height: j * 0.0018, r: 0.008, spines: 0.8, along: 18, across: 6, look: { tone: about(lr, 1, 0.06), young: rank < 3 ? 0.6 : 0, red: clamp(rank / 18) * 0.4 } });
		}
		rosette(bag, { leaves: sl, seed, key: [...key, 'sucker', i], M: sM, turn: a, hand });
		// its short foot from the axil, buried among the sheaths
		bag.add('body', tube([base.clone().addScaledVector(sdir, -0.03), base.clone()], () => 0.008, () => QV.colour.sheathGreen, fewer(6, 3)));
	}
}

/** the pineapple at `day`: the mother, grown from her sucker, and the suckers that follow her */
function pineapple(day, seed) {
	const bag = new Bag();
	pineapplePlant(bag, day, seed, ['mother']);
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Eleven stages, from the planted sucker to the ripe fruit; `day` the days since planting each is grown at (between two
 * stages, on the way). The lowlands of Réunion, forced at six months: harvest about eleven and a half months from
 * planting (12–13 months in Réunion's trials, 14–20 months as a rule; 17–19 at 750 m).
 */
const F = GROW.forcing;
const STAGES = [
	{ name: 'Sucker', day: 0, note: "A 250 g sucker planted through the black mulch of a ridge: 30–40 cm, a tight fan of about 27 short stiff leaves spiny all along their margins, its foot curved where it grew out from its mother's stem, a few brown roots already on it. 'Queen Victoria' makes no slips; it is planted from its suckers." },
	{ name: 'Rooted', day: 45, note: 'Six weeks: new roots out of the stem into the ridge, the fan opening, the first new leaves greener in its heart, about one a week (0.13–0.17 a day).' },
	{ name: 'Three months', day: 91, note: 'About 0.35 kg and some 40 leaves: a spiny rosette 40 cm high and 55 across, the oldest leaves of the sucker yellowing from the tip and lying on the mulch.' },
	{ name: 'Five months', day: 150, note: 'About 0.65 kg, 46 leaves; the D leaves, the youngest grown ones, reach 55–60 cm and stand at about 45°, the outer leaves flushed red-bronze along their margins in the sun.' },
	{ name: 'Forcing', day: F, note: 'Six months: the D leaf weighs 50 g, the plant about 1 kg with some 50 leaves, a dense grey-green fountain 0.6 m high and 0.9 m across: forced with ethephon. The leaves already begun still come out; no more are made.' },
	{ name: 'Red heart', day: F + 60, note: 'Two months after forcing the heart turns red: a small red cone deep in the centre, ringed by five or six red-orange bracts, the youngest leaves round it flushed red at their feet.' },
	{ name: 'In flower', day: F + 80, note: 'From day 75 the flowers open from the base up, 5–10 a day, each for one day: violet-blue petals, white at their base, out of the eyes of the red-pink cone, now about 6 cm and rising on its stalk.' },
	{ name: 'Dry petal', day: F + 95, note: 'The last flowers withered: a dull green cone some 6.5 × 4.7 cm, the dry flowers in the cups of its eyes, the crown a tuft on top; about a tenth of its ripe mass.' },
	{ name: 'Green fruit', day: F + 135, note: 'Filling: the fruit grey-green, its 80 eyes deep and pointed under their pale bracts, in spirals of 8 and 13, the crown growing; two suckers come out of the leaf axils.' },
	{ name: 'Colouring', day: F + 160, note: 'It yellows from the base up, eye by eye: half yellow (C2), when the first are picked.' },
	{ name: 'Ripe', day: F + 170, note: "All golden (C4), about 14 × 10 cm and 0.8 kg (0.7–0.95), 17–19 °Brix, its crown 15–20 cm; the suckers that will bear the next crop stand at its side. 'Queen Victoria': small, deep-eyed, the sweetest." },
];

/** the days since planting at a stage (0 … 10, between two stages on the way) */
function dayAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].day, STAGES[i + 1].day, x - i);
}

const grow = (stage, seed) => pineapple(dayAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: the fruit and its crown on their own ---- */

const dispose = (o) => o.traverse((m) => m.geometry?.dispose());

/** the fruit at a stage, on its own: its foot at the origin, standing up +Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = 'mother|fruit';
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('No fruit yet: a pineapple flowers once, when it is forced (or flowers on its own) at about six months; its fruit shows in the heart two months after.');
	const stand = new THREE.Matrix4()
		.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(f.dir, v3(0, 1, 0)))
		.multiply(new THREE.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	const kinds = {};
	for (const p of f.parts) {
		p.geometry.applyMatrix4(stand);
		(kinds[p.kind === 'prop' ? 'body' : p.kind] ??= []).push(p.geometry);
	}
	const group = new THREE.Group();
	for (const [kind, list] of Object.entries(kinds)) {
		const merged = sound(list.length === 1 ? list[0] : mergeGeometries(list));
		if (list.length > 1) for (const g of list) g.dispose();
		if (!merged) continue;
		const mesh = new THREE.Mesh(merged, material(kind));
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	return group;
}

/** what the plant is grown with, in the order `build` takes it: stage, seed, detail, and the view (plant or fruit) */
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] },
];

const PLANT = {
	id: 'pineapple',
	label: "Pineapple 'Queen Victoria' · Ananas comosus",
	latin: "Ananas comosus (L.) Merr. var. comosus (Queen group) 'Queen Victoria' · syn. 'Victoria' · ananas Victoria (Réunion), Queen Victoria (Mauritius); Queen, Natal Queen · Ananas",
	note: "The Queen Victoria pineapple of Réunion and Mauritius, the sweetest of the trade pineapples: a compact grey-green rosette of stiff channelled leaves spiny all along their margins, silvery beneath, the outer ones flushed red-bronze; forced at six months, its heart turns red, violet flowers open from the base up, and a small deep-eyed fruit of 80 eyes in spirals of 8 and 13 fills and turns golden from the base, 14 × 10 cm under its spiny crown, with suckers at its side for the next crop.",
	from: 'Rosette herb · 11–12 months from a sucker (lowlands, forced)',
	layer: 'herbaceous',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '94c914d0949b22e4714d4f447270bce0448ee658ce78461dcc725940cc6081ae', model: 'fal-ai/nano-banana-pro (+ /edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, day, note }) => ({ name, day: Math.round(day), note })), // days from planting
	// what a world needs to plant it right; data sheet S1–S25 (references/pineapple-queen-victoria.md)
	facts: {
		height: { atForcing: [0.55, 0.7], at3months: [0.35, 0.4], withFruit: [0.6, 0.8], unit: 'm' },
		spread: { atForcing: [0.8, 1.0], at3months: [0.5, 0.6], unit: 'm' },
		plantMass: { planted: 0.25, at3months: 0.35, at6months: 0.8, atForcing: 1.0, unit: 'kg' },
		spacing: { rows: 'double rows on ridges under black mulch, 90 × 40 × 30 cm', perHa: [51000, 66000] },
		shade: 'full sun',
		climate: 'tropics and warm subtropics: Réunion 50–900 m, mean 19–25 °C; above 15 °C; hurt above 35 °C and below 10 °C, no frost; about 50 mm of rain a month (CAM, drought tolerant)',
		days: { leafEvery: [6, 8], plantingToForcing: [150, 210], forcingToRedHeart: 60, forcingToFlower: 75, flowering: [10, 17], forcingToHarvest: [150, 200], plantingToHarvest: [330, 660] },
		leaf: { count: [50, 56], dLeaf: { length: [0.55, 0.65], width: [0.045, 0.05], mass: 0.05 }, rate: [0.13, 0.17], unit: 'm, kg, leaves a day' },
		flowers: { count: [75, 86], perDay: [5, 10], petals: 'violet-blue, white at the base' },
		fruit: { mass: [0.7, 0.95], length: [0.13, 0.15], diameter: [0.095, 0.11], eyes: [75, 86], spirals: [8, 13], brix: [17.2, 18.9], crownMass: [0.119, 0.16], crownHeight: [0.15, 0.2], unit: 'kg, m' },
		suckers: 'many (a ratoon crop without replanting, thinned to one or two); no slips',
		yield: { tPerHa: [47, 61], ratoonFarm: 30 },
		productiveLife: 'a plant crop and one or two ratoons, then replanted',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 the fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'pineapple' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'pineapple',
			version: v,
			label: PLANT.label,
			latin: PLANT.latin,
			note: PLANT.note,
			from: PLANT.from,
			layer: PLANT.layer,
			sheet: { ...PLANT.sheet },
			stages: PLANT.stages,
			facts: JSON.parse(JSON.stringify(PLANT.facts)),
			params: JSON.parse(JSON.stringify(PARAMS)),
		},
		build,
	};
};

/** the organs on their own, for checking them against the reference sheet's panels */
module.exports.organs = { QV, GROW, FRUIT, pineLeaf, leafPaint, stem, eyeLattice, fruitBody, fruitSize, rosette, motherLeaves, crownLeaves, pineapplePlant, pineapple, Bag, dayAt, leafDay, surface, lite, detailAt, STAGES };
