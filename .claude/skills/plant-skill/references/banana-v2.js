'use strict';
/*
 * BANANA 'DWARF CAVENDISH' — Musa acuminata Colla (AAA Group, Cavendish Subgroup) 'Dwarf Cavendish', syn. M. cavendishii
 * Lamb.: the banana of the hothouse, from Chatsworth in 1836, the shortest of the Cavendish clones and the most widely
 * grown edible banana. Version 2 of plants/banana: one named clone, grown from a tissue-culture plantlet under glass to
 * its ripe bunch, its follower and a peeper at its foot.
 *
 * Its numbers are the Dwarf Cavendish's where they are measured (Summerville 1944, M. cavendishii in Queensland: height,
 * girth and leaf life by leaf number; Galán Saúco et al. 1995, Tenerife: pseudostem 1.9–2.5 m and 0.74–0.81 m round at
 * shooting, leaves 1.8 × 0.8 m, 43–47 a cycle, 11.5–12.6 hands, bunch 60–76 cm and 33–40 kg; Pope 1926: fingers
 * 15–20 cm, 4.4–5.1 cm thick, the male bracts and dead male flowers persistent, the rachis to near the ground) and the
 * Cavendish subgroup's otherwise (UF/IFAS HS10; ProMusa; Turner et al. 2007; Robinson 1996's temperatures). Every number
 * with its source: plant-skill's data sheet for it.
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (b0331713…): its outlines, girths and colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   cacao v3 carries it, with the banana's materials and its surfaces: small pictures made from noise
 *                   for what vertex colours cannot carry (leaf veins, the pseudostem's blotches, sugar spots).
 *   2. ORGANS       the banana's own, each to its measure: the leaf (a torn blade, its midrib, the cigar), the
 *                   pseudostem, the corm and its cord roots, the finger, the bract, the male bell.
 *   3. THE PLANT    its leaves one by one out of the throat, the pseudostem growing with them, the bunch from
 *                   shooting to ripe, the mat (mother, follower, peeper).
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in days from planting the plantlet.
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
const toColor = (c) => (c instanceof THREE.Color ? c : C.set(c));
/** a colour between two, as a new THREE.Color */
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));

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
function sheet({ length, width, shape, lift = () => 0, paint, back, along = 16, across = 6 }) {
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
	if (back) {
		// the underside lit as the face above it is: a thin leaf lets the light through
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

/**
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: the veins of a leaf, the
 * blotches and fibres of a pseudostem, the faint lines and sugar spots of a finger's skin, the streaks of a bract.
 * Each a tile in metres (its `size`), laid on by the shape's UVs in metres over it (`metric`), so a blotch is a blotch's
 * size on every plant. Colour pictures multiply the vertex colours (white leaves them as they are); bump pictures lift
 * the light. Only at detail 0.5 and over: a crowd far off draws plain colours.
 */
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
 * The surfaces, made the first time they are asked for:
 *   leafMap / leafBump   a strip of leaf 1.6 m along the midrib (u) by one half-blade across (v, midrib to margin):
 *                        the parallel veins from the midrib out to the margin, bending towards the tip, a fine one
 *                        every 4 mm and a stronger one every 1.6 cm, a little lighter than the blade
 *   stemMap / stemBump   0.25 m square of pseudostem skin: the dark brown-black blotches of the Cavendish (traced off
 *                        the sheet's swatch: 21% of the skin, 0.5–2 cm tall, about 2.7 times as tall as wide) and the
 *                        fine fibres along it
 *   skinBump             a finger's skin: faint lines along it
 *   spotMap              a ripe finger's sugar spots: small brown dots, a few larger
 *   bractMap / bractBump a bract's and the bell's fine streaks along it
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(2048, 64, (x, y) => {
				const along = x * 1.6 - 0.06 * Math.pow(y, 1.3);
				const fine = Math.pow(Math.abs(Math.cos((along / 0.004) * Math.PI)), 40);
				const main = Math.pow(Math.abs(Math.cos((along / 0.016) * Math.PI)), 60);
				const mottle = tileNoise(x, y, 60, 3) - 0.5;
				const k = 0.9 + 0.05 * fine + 0.07 * main + 0.05 * mottle;
				return [k, k * 1.01, k * 0.96];
			}, true),
		leafBump: () =>
			picture(2048, 64, (x, y) => {
				const along = x * 1.6 - 0.06 * Math.pow(y, 1.3);
				const fine = Math.pow(Math.abs(Math.cos((along / 0.004) * Math.PI)), 6);
				const main = Math.pow(Math.abs(Math.cos((along / 0.016) * Math.PI)), 10);
				return 0.5 + 0.18 * fine + 0.3 * main + 0.05 * (tileNoise(x, y, 120, 5) - 0.5);
			}),
		stemMap: () =>
			picture(512, 512, (x, y) => {
				// x runs up the stem, y round it. Blotches: noise stretched up the stem (2.7 : 1, as on the swatch),
				// cut where it is high so a fifth of the skin is dark, their edges ragged; small flecks between
				// a blotch round a scattered point, each its own size (a cell is 2.3 × 0.96 cm: round in it is the
				// swatch's 2.4 : 1 up the stem), its edge ragged and nicked by noise; flecks between
				const warp = tileNoise(x, y, 8, 11, 2, 20) - 0.5;
				const ragged = tileNoise(x, y, 40, 13, 2, 90) - 0.5;
				const c = tileCells(x + warp * 0.03, y + warp * 0.012, 11, 26, 21);
				const size = 0.16 + 0.44 * Math.pow(hash3(Math.floor(c.id * 1e6), 0, 0, 5), 1.4);
				const blotch = c.id < 0.6 ? smooth((size - c.f1 + ragged * 0.4) * 14) : 0;
				const f = tileCells(x, y, 26, 70, 33);
				const fleck = f.id < 0.22 ? smooth((0.22 - f.f1 + ragged * 0.2) * 14) : 0;
				const dark = Math.max(blotch, fleck * 0.9);
				// pale fibre lines along it, a strong one about every 1.5 cm and fine ones between (the swatch's), and a
				// broad mottle of lighter and darker green
				const line = 0.1 * Math.pow(Math.abs(Math.cos(y * Math.PI * 17)), 30) + 0.04 * Math.pow(Math.abs(Math.cos(y * Math.PI * 70)), 8);
				const fibre = 0.86 + 0.16 * tileNoise(x, y, 2, 17, 2, 6) + line;
				// the blotch over the green, as the swatch has it (linear [0.026, 0.013, 0.007] over [0.093, 0.191, 0.017]),
				// and brown-black, not purple, over the paler dry sheaths
				return [fibre * lerp(1, 0.25, dark), fibre * lerp(1, 0.12, dark), fibre * lerp(1, 0.12, dark)];
			}, true),
		stemBump: () => picture(256, 256, (x, y) => 0.5 + 0.3 * (tileNoise(x, y, 3, 19, 2, 120) - 0.5) + 0.25 * Math.pow(Math.abs(Math.cos(y * 256 * 0.45)), 6)),
		skinBump: () => picture(64, 256, (x, y) => 0.5 + 0.25 * Math.pow(Math.abs(Math.cos(x * Math.PI * 24)), 5) + 0.1 * (tileNoise(x, y, 30, 23) - 0.5)),
		spotMap: () =>
			picture(256, 512, (x, y) => {
				const c = tileCells(x, y, 20, 40, 41);
				const big = tileCells(x, y, 4, 8, 43);
				const spot = c.id < 0.35 ? smooth((0.16 - c.f1 * (0.7 + c.id)) * 30) : 0;
				const bruise = big.id < 0.18 ? smooth((0.34 - big.f1 + (tileNoise(x, y, 20, 45) - 0.5) * 0.4) * 6) * 0.6 : 0;
				const d = Math.max(spot, bruise);
				return [lerp(1, 0.2, d), lerp(1, 0.12, d), lerp(1, 0.25, d)];
			}, true),
		bractMap: () => picture(128, 256, (x, y) => {
			const k = 0.9 + 0.1 * Math.pow(Math.abs(Math.cos(x * Math.PI * 40)), 3) + 0.06 * (tileNoise(x, y, 16, 51) - 0.5);
			return [k, k, k * 1.02];
		}, true),
		bractBump: () => picture(128, 256, (x) => 0.5 + 0.3 * Math.pow(Math.abs(Math.cos(x * Math.PI * 40)), 3)),
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
 * The materials, made once, plain and with their surfaces. `leaf` a leaf's two faces, each its own colour
 * (one-sided), a little glossy above, veined; `stem` the pseudostem, its petioles and the sheaths: smooth, a faint
 * shine, blotched; `fibre` dry sheaths and dead leaves, matt; `skin` a finger's skin, waxy; `spotted` a ripe finger's,
 * with its sugar spots; `bloom` the bell and the bracts: waxy with a blue-grey bloom (sheen); `sheet` thin things seen
 * from both sides (the flowers); `body` the corm, the roots, the peduncle and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, clearcoat: 0.05, clearcoatRoughness: 0.55, ...(s && { map: s('leafMap'), bumpMap: s('leafBump'), bumpScale: 1.2 }) }),
	stem: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.48, clearcoat: 0.2, clearcoatRoughness: 0.5, ...(s && { map: s('stemMap'), bumpMap: s('stemBump'), bumpScale: 0.8 }) }),
	fibre: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, ...(s && { bumpMap: s('stemBump'), bumpScale: 2 }) }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4, ...(s && { bumpMap: s('skinBump'), bumpScale: 0.6 }) }),
	spotted: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.45, ...(s && { map: s('spotMap'), bumpMap: s('skinBump'), bumpScale: 0.6 }) }),
	bloom: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.32, 0.34, 0.42), side: THREE.DoubleSide, ...(s && { map: s('bractMap'), bumpMap: s('bractBump'), bumpScale: 0.8 }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'stem', 'fibre', 'leaf', 'sheet', 'skin', 'spotted', 'bloom', 'prop'];
// a banana has few leaves, each of several strips: a crowd far off draws every leaf with fewer rows, never half of one
const THINNED = { sheet: true };

/** while the fruit view grows a plant (`pickFruit`), the bags it makes and the fruit drawn into them */
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
 * 2. ORGANS — the Dwarf Cavendish's own, each to its measure
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);

/**
 * The Dwarf Cavendish's numbers. Sizes in metres from the data sheet; shapes (outlines as half-widths along the
 * length, 0 … 1) and colours (linear sRGB) traced off its reference sheet (play file b0331713…, Nano Banana Pro,
 * 2026-11-04) with plant-skill's trace.py: each panel's median, the spread its p10–p90.
 */
const MU = {
	/** a leaf blade's half-width along it, base to tip, traced off the sheet's whole leaf (blade 2.4 : 1 there) */
	bladeShape: [[0, 0.31], [0.057, 0.556], [0.114, 0.704], [0.171, 0.814], [0.229, 0.915], [0.286, 0.968], [0.343, 1], [0.457, 0.99], [0.571, 0.968], [0.629, 0.936], [0.686, 0.883], [0.743, 0.822], [0.8, 0.745], [0.857, 0.652], [0.914, 0.538], [0.971, 0.328], [1, 0.02]],
	/** a finger's girth along it, stalk to tip, traced off the sheet's full green finger */
	fingerShape: [[0, 0.21], [0.087, 0.27], [0.13, 0.4], [0.174, 0.59], [0.217, 0.75], [0.261, 0.865], [0.304, 0.933], [0.348, 0.97], [0.391, 1], [0.6, 0.975], [0.696, 0.963], [0.739, 0.944], [0.783, 0.9], [0.826, 0.822], [0.87, 0.703], [0.913, 0.548], [0.957, 0.43], [1, 0.2]],
	/** the male bell's girth along it, from its stalk to its point, traced off the sheet's bell (2.5 : 1) */
	bellShape: [[0, 0.12], [0.06, 0.2], [0.13, 0.6], [0.217, 0.87], [0.261, 0.95], [0.348, 1], [0.391, 0.994], [0.435, 0.965], [0.478, 0.932], [0.522, 0.899], [0.565, 0.863], [0.609, 0.817], [0.652, 0.771], [0.696, 0.722], [0.739, 0.657], [0.783, 0.579], [0.826, 0.484], [0.87, 0.369], [0.913, 0.274], [0.957, 0.15], [1, 0.01]],
	/** a bract's half-width along it, base to tip, traced off the sheet's bract (1.9 : 1) */
	bractShape: [[0, 0.05], [0.043, 0.425], [0.087, 0.614], [0.13, 0.794], [0.174, 0.859], [0.217, 0.911], [0.261, 0.964], [0.33, 1], [0.391, 0.974], [0.478, 0.895], [0.565, 0.787], [0.652, 0.679], [0.739, 0.564], [0.826, 0.437], [0.913, 0.271], [0.957, 0.156], [1, 0.01]],

	colour: {
		leaf: lin(0.11, 0.254, 0.016), // the whole leaf, upper side (p10 0.08/0.20/0.004, p90 0.19/0.33/0.045)
		leafYoung: lin(0.168, 0.235, 0.084), // the cigar leaf, pale
		leafUnder: lin(0.19, 0.27, 0.15), // the underside, with its waxy bloom (the sheet's panel 0.35/0.42/0.33 lit by its light box: a little less)
		midrib: lin(0.32, 0.42, 0.11),
		midribUnder: lin(0.42, 0.48, 0.3),
		yellowing: lin(0.55, 0.42, 0.04),
		dead: lin(0.292, 0.12, 0.063),
		juvenile: lin(0.13, 0.035, 0.03), // the maroon blotches of the young leaves (S10) // the old dead leaf (p15 0.18/0.07/0.04, p85 0.40/0.19/0.10)
		deadPale: lin(0.4, 0.26, 0.12),
		stem: lin(0.093, 0.191, 0.017), // the pseudostem's skin between its blotches (p10 0.07/0.14/0.007, p90 0.15/0.24/0.047)
		stemPale: lin(0.2, 0.28, 0.07),
		sheathDry: lin(0.21, 0.145, 0.08),
		sheathPale: lin(0.36, 0.28, 0.17),
		petiole: lin(0.12, 0.22, 0.03),
		corm: lin(0.136, 0.065, 0.041), // the corm's skin
		cormInside: lin(0.6, 0.45, 0.32),
		rootYoung: lin(0.62, 0.5, 0.36), // the cord roots, washed (median 0.60/0.45/0.32)
		rootOld: lin(0.25, 0.15, 0.08),
		fingerYoung: lin(0.086, 0.162, 0.026), // just set, dark green (0.09/0.16/0.03)
		fingerGreen: lin(0.156, 0.262, 0.041), // full green (0.16/0.26/0.04)
		fingerFull: lin(0.32, 0.4, 0.063), // full, light green (0.32/0.40/0.06)
		fingerRipe: lin(0.913, 0.552, 0.065), // ripe, bright yellow (0.91/0.55/0.07)
		fingerStalk: lin(0.55, 0.36, 0.06), // a ripe finger's stalk, darker yellow-brown
		tip: lin(0.11, 0.065, 0.035), // the dry style at a finger's tip
		flower: lin(0.62, 0.52, 0.26), // a flower's perianth, cream-yellow
		flowerTip: lin(0.7, 0.55, 0.12),
		bell: lin(0.095, 0.047, 0.072), // the male bell outside (0.10/0.05/0.07), a dusky purple under a bloom
		bractIn: lin(0.16, 0.025, 0.045), // a bract inside, crimson (0.14–0.17/0.02–0.03/0.03–0.05)
		peduncle: lin(0.12, 0.2, 0.045),
		crown: lin(0.14, 0.22, 0.05),
	},
};

/* ---- the leaf ---- */

/**
 * One leaf blade, built along +X from its base (where the petiole ends), its face up (+Y), across Z. Its midrib arches
 * down along it (`bend`, radians at the tip), the two halves droop from it (`fold`) and their margins curl under; a
 * blade still opening (`open` under 1) has its halves rolled up round the midrib. Torn (`tears`: where along it, which
 * half), a half falls into strips between its veins, each hanging a little more. Its veins run from the midrib to the
 * margin bending towards the tip, and every tear follows one. `paint(u, v, side)` its upper side's colour (v 0 at the
 * midrib … 1 at the margin), `under` the underside's.
 */
function blade(o) {
	const { length: L, width: W, bend = 0.4, fold = 0.2, open = 1, tears = [], shrivel = 0, r } = o;
	const along = fewer(o.along ?? 56, 6);
	const across = fewer(o.across ?? 8, 2);
	// the midrib: its points and frames, arching down by `bend` and swaying a little sideways
	const N = along;
	const mid = [], tan = [], nrm = [];
	const sway = (r() - 0.5) * 0.25;
	let p = v3(0, 0, 0);
	for (let i = 0; i <= N; i++) {
		const u = i / N;
		const pitch = -bend * Math.pow(u, 1.5);
		const yaw = sway * u;
		const t = v3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
		if (i) p = p.clone().addScaledVector(tan[i - 1].clone().add(t).normalize(), L / N);
		mid.push(p);
		tan.push(t);
		nrm.push(v3(-Math.sin(pitch) * Math.cos(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.sin(yaw)));
	}
	const at = (u) => {
		const x = clamp(u) * N, i = Math.min(N - 1, Math.floor(x)), k = x - i;
		return { p: mid[i].clone().lerp(mid[i + 1], k), t: tan[i].clone().lerp(tan[i + 1], k).normalize(), n: nrm[i].clone().lerp(nrm[i + 1], k).normalize() };
	};
	const half = (u) => table(u, MU.bladeShape) * (W / 2) * (1 - shrivel * 0.45);
	// how far a vein bends towards the tip by the margin, in parts of the length
	const forward = (0.06 / Math.max(0.2, L)) * (W / 0.65);
	const parts = [];
	const wave = r() * 10;
	for (const side of [-1, 1]) {
		// the half's strips: from the base to the first tear, from one tear to the next, to the tip
		const cuts = tears.filter((x) => x.side === side).map((x) => x.at).sort((a, b) => a - b);
		const edges = [-forward, ...cuts, 1];
		for (let k = 0; k + 1 < edges.length; k++) {
			const q0 = edges[k], q1 = edges[k + 1];
			if (q1 - q0 < 0.004) continue;
			const rows = Math.max(2, Math.ceil(along * (q1 - q0)));
			const torn = k > 0 || cuts.length > 0;
			const hang = torn ? (0.15 + 0.35 * hash3(k, side + 3, 7, wave * 100)) * (cuts.length ? 1 : 0) : 0;
			const pos = [], uv = [], col = [], idx = [];
			const colB = [];
			for (let i = 0; i <= rows; i++) {
				const q = lerp(q0, q1, i / rows);
				for (let j = 0; j <= across; j++) {
					const v = j / across;
					const u = clamp(q + forward * Math.pow(v, 1.3));
					const m = at(u);
					const side3 = new THREE.Vector3().crossVectors(m.t, m.n).normalize().multiplyScalar(side);
					const x = v * half(u);
					// rolled while it opens; open, the half droops from the midrib, the margin curls under, a strip
					// torn free hangs more; the margin waves a little
					const rolled = (1 - open) * 2.6 * v;
					const droop = fold + hang * v + 0.35 * Math.pow(v, 3) * (0.5 + fold);
					const ang = rolled > 0.001 ? -rolled * (0.6 + 0.4 * v) : droop * (0.4 + 0.6 * v);
					const waveY = 0.006 * L * Math.sin(u * L * 26 + wave + side) * v * v * open;
					const crumple = shrivel * 0.03 * W * (noise3(u * 30, v * 6, side, wave) - 0.5);
					const pt = m.p.clone()
						.addScaledVector(side3, x * Math.cos(ang))
						.addScaledVector(m.n, -x * Math.sin(ang) + waveY + crumple + 0.003 * L * v);
					pos.push(pt.x, pt.y, pt.z);
					// uv in the leaf surface's tile: along the midrib 1.6 m to the tile, across a half-blade
					uv.push((u * L) / 1.6, v);
					const c = o.paint(u, v, side);
					col.push(c.r, c.g, c.b);
					const b = o.under(u, v, side);
					colB.push(b.r, b.g, b.b);
				}
			}
			for (let i = 0; i < rows; i++)
				for (let j = 0; j < across; j++) {
					const a = i * (across + 1) + j, b = a + across + 1;
					if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
					else idx.push(a, b, a + 1, b, b + 1, a + 1);
				}
			const front = made(pos, pos.map(() => 0), uv, col, idx, true);
			// the underside: the same strip a hair below, wound the other way, its own colour, lit as the face above
			const n = front.attributes.normal;
			const posB = [], nor = [];
			for (let i = 0; i < n.count; i++) {
				posB.push(pos[i * 3] - n.getX(i) * 0.0008, pos[i * 3 + 1] - n.getY(i) * 0.0008, pos[i * 3 + 2] - n.getZ(i) * 0.0008);
				nor.push(n.getX(i), n.getY(i), n.getZ(i));
			}
			const idxB = [];
			for (let i = 0; i < idx.length; i += 3) idxB.push(idx[i], idx[i + 2], idx[i + 1]);
			const back = made(posB, nor, uv.slice(), colB, idxB, false);
			parts.push(front, back);
		}
	}
	return { parts, at, mid };
}

/** the midrib: a stout ridge under the blade, pale, from the petiole to the tip */
function midrib(bag, leaf, L, M, young) {
	const pts = leaf.mid.filter((_, i) => i % 2 === 0 || i === leaf.mid.length - 1).map((p) => p.clone().applyMatrix4(M));
	const r0 = 0.012 * (L / 1.5) + 0.002;
	bag.add(
		'stem',
		tube(pts, (u) => r0 * (1 - 0.85 * u), (u, v) => mix(MU.colour.midrib, MU.colour.midribUnder, 0.5 + 0.5 * Math.sin(v * 6.283)).lerp(MU.colour.leafYoung, young * 0.5), fewer(8, 3)),
	);
}

/**
 * A leaf on the pseudostem: its petiole from the top of the stem out along `dir`, then its blade. `age` days since it
 * came out of the stem as a rolled cigar: rolled for about a week, then opening; its petiole leaning further out and
 * its blade arching more as it ages; at the end of its `life` it yellows from the margin, browns, breaks at its
 * petiole and hangs down the stem (a grower cuts it off a month or so later).
 */
function leafOn(bag, o) {
	const { from, az, age, life, L, ratio, petiole, seed, key, upright = 0 } = o;
	const r = chance(seed, 'leaf', ...key);
	const W = L / ratio;
	const out = v3(Math.cos(az), 0, Math.sin(az));
	const dead = clamp((age - life) / 18); // 0 green … 1 dry brown
	const broken = clamp((age - life - 12) / 10); // the petiole gives way
	// the cigar: the new leaf pushing up out of the middle of the stem, rolled tight
	if (age < 0) return;
	const emerge = clamp(age / 6);
	if (age < 7) {
		const len = L * (0.35 + 0.65 * emerge) + petiole;
		const lean = 0.08 + 0.1 * span(age, 4, 7);
		const pts = [];
		for (let i = 0; i <= 10; i++) {
			const s = i / 10;
			pts.push(from.clone().addScaledVector(UP, s * len * Math.cos(lean * s)).addScaledVector(out, s * s * len * Math.sin(lean)));
		}
		const R = Math.max(0.004, W * 0.05);
		bag.add('leaf', tube(pts, (u) => R * (u < 0.25 ? 0.75 + u : 1) * (1 - Math.pow(u, 3) * 0.85), (u, v) => mix(MU.colour.leafYoung, MU.colour.leaf, u * 0.3 + 0.2 * Math.sin(v * 12)), fewer(10, 4), true));
		if (age < 4) return;
	}
	const opened = span(age, 4, 12);
	// how the leaf stands: the petiole leans out with age; a dead one hangs
	const lean = (table(age, [[4, 0.12], [12, 0.3], [30, 0.5], [70, 0.66], [130, 0.76], [220, 0.86]]) - upright) * (1 - broken) + broken * 3.02;
	const pdir = UP.clone().multiplyScalar(Math.cos(lean)).addScaledVector(out, Math.sin(lean)).normalize();
	const ppts = [];
	const steps = 6;
	for (let i = 0; i <= steps; i++) {
		const s = (i / steps) * petiole;
		// a broken petiole kinks near its base
		const k = broken > 0 ? clamp((s / petiole) * 3) : 1;
		const d = broken > 0 ? UP.clone().lerp(pdir, k).normalize() : pdir;
		ppts.push(i ? ppts[i - 1].clone().addScaledVector(d, petiole / steps) : from.clone());
	}
	const end = ppts[steps];
	const pr = 0.009 + 0.012 * (L / 1.5);
	bag.add(
		'stem',
		tube(
			ppts,
			(u) => pr * (1.25 - 0.4 * u),
			(u, v) => mix(MU.colour.petiole, MU.colour.leaf, u * 0.5).lerp(MU.colour.sheathDry, dead).lerp(MU.colour.stemPale, 0.25 * (0.5 + 0.5 * Math.sin(v * 6.283))),
			fewer(8, 3),
		),
	);
	// the blade
	const bend = table(age, [[4, 0.05], [12, 0.3], [30, 0.55], [70, 0.8], [130, 1.0], [220, 1.15]]) * (1 - broken) + broken * 0.08 + about(r, 0, 0.12) * (1 - broken);
	const fold = (0.12 + 0.18 * span(age, 10, 120)) * (1 - dead) + dead * 0.9;
	const torn = Math.round(span(age, 40, 160) * (o.tearing ?? 1) * (0.3 + r()) + dead * 3);
	const tears = [];
	for (let i = 0; i < torn; i++) tears.push({ at: between(r, 0.15, 0.95), side: r() < 0.5 ? -1 : 1 });
	const yellow = clamp((age - life + 8) / 10);
	const edgeDry = span(age, 60, life) * 0.6;
	const tone = about(r, 1, 0.08);
	const C = MU.colour;
	const paint = (u, v) => {
		const c = mix(C.leafYoung, C.leaf, span(age, 6, 20)).multiplyScalar(tone / 0.93);
		c.lerp(C.midrib, (v < 0.025 ? 0.6 : 0) * (1 - u * 0.5));
		// yellowing creeps in from the margin, then it browns and dries; an older leaf's margin dries first
		const fromEdge = clamp(v * 1.3 - 0.3 + noise3(u * 9, v * 3, 1, r() * 50) * 0.4);
		c.lerp(C.yellowing, clamp(yellow * 1.6 - (1 - fromEdge)));
		c.lerp(mix(C.dead, C.deadPale, noise3(u * 14, v * 5, 2, 9)), clamp(dead * 1.4 - (1 - fromEdge) * 0.6));
		if (v > 0.965) c.lerp(C.dead, edgeDry);
		// a young plant's leaves blotched maroon, fading as the plant grows up (S10)
		if (o.juvenile > 0) c.lerp(C.juvenile, o.juvenile * smooth((noise3(u * L * 18, v * W * 18, 5, 7) - 0.62) * 9) * (1 - span(age, 30, 90) * 0.5));
		return c;
	};
	const under = (u, v) => {
		const c = mix(C.leafUnder, C.leafYoung, 1 - span(age, 6, 20)).lerp(C.midribUnder, v < 0.03 ? 0.5 : 0);
		c.lerp(C.yellowing, clamp(yellow * 1.2 - 0.3)).lerp(mix(C.dead, C.deadPale, 0.5), clamp(dead * 1.2));
		return c;
	};
	const b = blade({ length: L * (0.55 + 0.45 * opened), width: W, bend, fold, open: opened, tears, shrivel: dead, r, paint, under, along: o.along, across: o.across });
	// the blade goes on as the petiole leaves off, rolled about its axis a little
	// a broken leaf's blade hangs down along the stem (the dry skirt)
	const bdir = broken ? pdir.clone().addScaledVector(out, -0.12 * broken).normalize() : pdir.clone().lerp(out.clone().setY(0.2).normalize(), 0.35).normalize();
	// its upper face towards the stem and the sky (aim() has no up for a leaf standing straight up)
	const face = UP.clone().sub(out).addScaledVector(bdir, -bdir.dot(UP.clone().sub(out))).normalize();
	const M = new THREE.Matrix4().makeBasis(bdir, face, new THREE.Vector3().crossVectors(bdir, face)).setPosition(end);
	M.multiply(new THREE.Matrix4().makeRotationX(about(r, 0, 0.12)));
	for (const g of b.parts) bag.add('leaf', g, M);
	midrib(bag, b, L, M, 1 - opened);
}

/* ---- the pseudostem ---- */

/**
 * The pseudostem: the leaf sheaths rolled tight one inside the other from the corm up, `H` high, `D` across at its foot,
 * narrowing upward; green with the Cavendish's dark brown-black blotches; its outer, oldest sheaths drying brown and
 * papery from the foot up, splitting into strips. `sheaths` the azimuths and tops of the outer sheaths: where one ends
 * its margin shows as a seam.
 */
function pseudostem(bag, o) {
	const { base, H, D, age, seed, key, lean = 0, leanAz = 0 } = o;
	const r = chance(seed, 'stem', ...key);
	const rings = fewer(Math.max(10, Math.round(H * 30)), 4);
	const pts = [];
	const leanDir = v3(Math.cos(leanAz), 0, Math.sin(leanAz));
	for (let i = 0; i <= rings; i++) {
		const s = i / rings;
		pts.push(base.clone().add(v3(0, s * H, 0)).addScaledVector(leanDir, lean * s * s * H));
	}
	const ns = hashText(seed + key.join('.')) % 997;
	const dry = clamp((age - 120) / 160); // how far up the dry outer sheaths reach, as it ages
	const dryTo = 0.05 + 0.2 * dry;
	const R = (u, v) => {
		const taper = 1 - 0.36 * Math.pow(u, 1.1);
		const foot = 1 + 0.16 * Math.pow(clamp(1 - u * H / 0.12), 2);
		// a sheath's edge every so often round it: a small step in the surface
		let step = 0;
		for (const s of o.sheaths ?? []) {
			const d = Math.abs(((v - s.v + 1.5) % 1) - 0.5);
			if (u * H < s.top) step += d < 0.012 ? -0.012 : 0;
		}
		const lumpy = (noise3(Math.cos(v * 6.283) * 2, Math.sin(v * 6.283) * 2, u * H * 6, ns) - 0.5) * 0.04;
		return (D / 2) * taper * foot * (1 + step + lumpy);
	};
	const C = MU.colour;
	const geo = tube(
		pts,
		R,
		(u, v) => {
			const y = u * H;
			const c = mix(C.stem, C.stemPale, 0.05 + 0.25 * u + 0.15 * (noise3(v * 6, y * 3, 0, ns) - 0.5));
			// the outer sheaths drying from the foot: brown, paler in streaks
			const d = clamp((dryTo - u + (noise3(Math.cos(v * 6.283) * 3, Math.sin(v * 6.283) * 3, y * 4, ns + 5) - 0.5) * 0.25) * 8);
			c.lerp(mix(C.sheathDry, C.sheathPale, noise3(v * 40, y * 2, 3, ns)), d * clamp(age / 90));
			for (const s of o.sheaths ?? []) {
				const dv = Math.abs(((v - s.v + 1.5) % 1) - 0.5);
				if (y < s.top && dv < 0.006) c.multiplyScalar(0.6);
			}
			return c;
		},
		fewer(28, 6),
		false,
	);
	// the blotches and fibres in metres: the stem's tile is 0.6 m (blotches 1–4.5 cm: the swatch's shapes, at the
	// size the data sheet's "large irregular blotches" asks; the sheet's own scale bars are not to be trusted)
	metric(geo, H / 0.6, Math.max(1, Math.round((Math.PI * D) / 0.6)));
	bag.add('stem', geo);
	// the dry outer sheaths at its foot, split into papery strips that peel away
	if (age > 150) {
		const strips = fewer(Math.round(2 + dry * 4), 1);
		for (let i = 0; i < strips; i++) {
			const v = r();
			const top = H * between(r, 0.08, dryTo + 0.06);
			const wide = between(r, 0.025, 0.06) * D * 2;
			const peel = between(r, 0.05, 0.5);
			const az = v * Math.PI * 2;
			const outv = v3(Math.cos(az), 0, Math.sin(az));
			const g = sheet({
				length: top,
				width: wide,
				shape: (u) => 0.6 + 0.4 * Math.sin(u * 9 + i) * 0.3 * u + (u > 0.9 ? -(u - 0.9) * 5 : 0),
				lift: (u, w) => (Math.pow(u, 2) * peel + 0.02 * w * w),
				paint: (u, w) => mix(C.sheathDry, C.sheathPale, noise3(u * 20, w * 3, i, ns)).multiplyScalar(0.9 + 0.2 * u),
				along: 8,
				across: 2,
			});
			// stood up the stem, its face outward
			const M = new THREE.Matrix4().makeBasis(UP, outv, new THREE.Vector3().crossVectors(UP, outv)).setPosition(base.clone().addScaledVector(outv, D * 0.52));
			bag.add('fibre', g, M);
		}
	}
	return { top: pts[rings], R };
}

/* ---- the corm and its roots ---- */

/** the corm under the stem's foot, lumpy, its leaf scars in rings, and the cord roots out of it */
function corm(bag, o) {
	if (!DETAIL.roots) return;
	const { base, D, age, seed, key } = o;
	const r = chance(seed, 'corm', ...key);
	const size = D * 0.85 + 0.02;
	const g = new THREE.SphereGeometry(1, fewer(20, 6), fewer(14, 4));
	const p = g.attributes.position;
	const col = new Float32Array(p.count * 3);
	const ns = r() * 100;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
		const k = 1 + 0.12 * (noise3(x * 2, y * 2, z * 2, ns) - 0.5) + 0.04 * Math.sin(y * 18);
		p.setXYZ(i, x * size * k, (y * 0.75 - 0.35) * size * k, z * size * k);
		const c = mix(MU.colour.corm, MU.colour.cormInside, 0.2 + 0.4 * noise3(x * 5, y * 5, z * 5, ns + 1));
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	g.translate(base.x, base.y, base.z);
	bag.add('body', g);
	// the cord roots: thick, white turning brown, spreading wide in the top 40 cm
	const n = fewer(Math.round(8 + clamp(age / 300) * 34), 4);
	const reach = 0.12 + 2.2 * clamp(age / 300);
	for (let i = 0; i < n; i++) {
		const az = (i / n) * Math.PI * 2 + about(r, 0, 0.3);
		const dir = v3(Math.cos(az), -between(r, 0.05, 0.6), Math.sin(az));
		const from = base.clone().add(v3(Math.cos(az) * size * 0.8, -size * between(r, 0.1, 0.7), Math.sin(az) * size * 0.8));
		root(bag, {
			seed, key: [...key, 'root', i], from, dir, length: reach * between(r, 0.5, 1), radius: 0.0032 + 0.0015 * clamp(age / 200),
			grown: 1, young: MU.colour.rootYoung, old: MU.colour.rootOld, age: clamp(age / 400), down: 0.015, wander: 0.18,
			laterals: 5, lateral: 0.25, thin: 0.35, depth: 1, taper: 0.4, floor: -0.45,
		});
	}
}

/* ---- the fruit: fingers, hands, the bunch ---- */

/** a finger's length (as a part of its full length) by the days since its bract lifted */
const fingerLength = (d) => straight(d, [[0, 0.46], [10, 0.54], [20, 0.66], [35, 0.8], [50, 0.9], [70, 0.97], [90, 1]]);
/** its girth, the same way: it fills until it is cut */
const fingerGirth = (d) => straight(d, [[0, 0.55], [10, 0.58], [25, 0.66], [45, 0.77], [70, 0.88], [100, 0.96], [125, 1], [145, 1.07]]);

/** a finger's colour by days, where along it (u: stalk 0 … tip 1), and its own small difference `k` */
function fingerColour(d, u, k, ripeAt) {
	const C = MU.colour;
	const c = mix(C.fingerYoung, C.fingerGreen, span(d, 5, 45));
	// full, it stays a deep green (data sheet: dark green when full), lightening only as it turns
	c.lerp(C.fingerFull, span(d, 60, ripeAt - 5) * 0.25 + span(d, ripeAt - 6, ripeAt + 2) * 0.5);
	// ripening: yellow from the middle out, the stalk and the tip last
	const ripe = clamp((d - ripeAt) / 14 - Math.abs(u - 0.55) * 0.9 + k * 0.3);
	c.lerp(C.fingerRipe, smooth(ripe));
	if (u < 0.14) c.lerp(mix(C.fingerGreen, C.fingerStalk, smooth(ripe)), 0.5);
	return c.multiplyScalar(0.94 + 0.12 * k);
}

/**
 * One finger: its stalk on the hand's crown at `at`, first along `dir` (out from the rachis), curving towards `up`
 * (the bunch's base: fingers turn up as they grow, negative geotropism) by `turn` radians; five-angled while green,
 * rounding as it fills; its dry style at the tip, and while young the flower still on it. Drawn as a fruit.
 */
function finger(bag, o) {
	const { at, dir, up, d, full, girth, turn, k, ripeAt, key, seed } = o;
	const len = full * fingerLength(d);
	const R = (girth / 2) * fingerGirth(d);
	const steps = fewer(DETAIL.fruit ? 28 : 16, 5);
	const pts = [];
	let p = at.clone();
	const side = new THREE.Vector3().crossVectors(dir, up).normalize();
	for (let i = 0; i <= steps; i++) {
		const s = i / steps;
		const bendBy = turn * Math.pow(s, 0.9);
		// it bends towards `up` (a rotation about dir × up by a positive angle turns dir towards up)
		const t = dir.clone().applyAxisAngle(side.lengthSq() > 1e-6 ? side : across(dir), bendBy).normalize();
		if (i) p = p.clone().addScaledVector(t, len / steps);
		pts.push(p);
	}
	const ripe = d > ripeAt + 10;
	bag.fruit(key, at, pts[1].clone().sub(at));
	const angles = 0.07 * (1 - span(d, 30, ripeAt + 20) * 0.7);
	const twist = k * 2;
	const geo = tube(
		pts,
		(u, v) => R * table(u, MU.fingerShape) * (1 + angles * Math.cos(v * Math.PI * 10 + twist)) * (1 + 0.06 * Math.cos(v * Math.PI * 4)),
		(u) => fingerColour(d, u, k, ripeAt),
		fewer(DETAIL.fruit ? 30 : 15, 5),
		true,
	);
	metric(geo, 1, 1);
	bag.add(ripe ? 'spotted' : 'skin', geo);
	// the dry style at its tip, and while young the flower: a cream tube, wilting brown
	const tipAt = pts[steps];
	const tdir = pts[steps].clone().sub(pts[steps - 1]).normalize();
	bag.add('body', bead(tipAt.clone().addScaledVector(tdir, R * 0.05), v3(R * 0.32, R * 0.32, R * 0.32), MU.colour.tip, 5));
	if (d < 26) {
		const wilt = span(d, 8, 24);
		const fl = 0.038 * (1 - wilt * 0.4);
		const fpts = [tipAt, tipAt.clone().addScaledVector(tdir, fl * 0.5), tipAt.clone().addScaledVector(tdir.clone().lerp(UP.clone().negate(), wilt * 0.5).normalize(), fl)];
		bag.add('sheet', tube(fpts, (u) => R * 0.32 * (1 - u * 0.35), (u) => mix(MU.colour.flower, MU.colour.flowerTip, u).lerp(MU.colour.sheathDry, wilt), fewer(7, 3), true));
	}
	bag.fruitDone();
}

/** a bract: a broad waxy scale, crimson inside, purple under its bloom outside, lifting off and curling back */
function bract(bag, at, dir, out, lift, size, seed, key) {
	const r = chance(seed, 'bract', ...key);
	const L = size, W = size / 1.9;
	const curl = 0.4 + lift * 2.2;
	const g = sheet({
		length: L,
		width: W,
		shape: (u) => table(u, MU.bractShape) * 0.5,
		lift: (u, v) => -Math.pow(u, 2) * curl * 0.35 + (1 - Math.abs(v)) * 0.12 - Math.pow(Math.abs(v), 2) * 0.05,
		paint: (u) => mix(MU.colour.bractIn, MU.colour.bell, 0.15 + 0.2 * u),
		back: (u) => mix(MU.colour.bell, MU.colour.bractIn, 0.25 - u * 0.2),
		along: 12,
		across: 6,
	});
	// along `dir` from its base, its inside towards `out`, opened by `lift`
	const d = dir.clone().applyAxisAngle(new THREE.Vector3().crossVectors(dir, out).normalize(), lift * 1.3 + about(r, 0, 0.1));
	bag.add('bloom', g, aim(at, d, Math.PI));
}

/** the male bell: a heart-shaped bud of tight purple bracts, from its stalk at `at` pointing along `dir` */
function bell(bag, at, dir, L, seed, key) {
	const steps = fewer(24, 6);
	const pts = [];
	for (let i = 0; i <= steps; i++) pts.push(at.clone().addScaledVector(dir, (i / steps) * L));
	const W = L / 2.5;
	const ns = hashText(seed + key.join('.')) % 911;
	const geo = tube(
		pts,
		(u, v) => {
			// the bracts' edges: each overlapping the next, a small step round the bud and down it
			const scale = ((v * 3 + u * 2.2) % 1) < 0.08 ? 0.97 : 1;
			return (W / 2) * table(u, MU.bellShape) * scale;
		},
		(u, v) => mix(MU.colour.bell, MU.colour.bractIn, 0.12 + 0.18 * noise3(v * 8, u * 3, 0, ns)).lerp(MU.colour.peduncle, u < 0.06 ? 0.6 : 0),
		fewer(22, 6),
		true,
	);
	metric(geo, 2, 2);
	bag.add('bloom', geo);
}
/* ================================================================================================================
 * 3. THE PLANT — the mother, its leaves one by one, its bunch, and its suckers
 * ============================================================================================================== */

/**
 * How it grows, in days from planting a tissue-culture plantlet under glass (a heated dome, about 25 °C):
 * a leaf about every nine days (one a week in summer, S7), 44 in the cycle (43–47, S4), the plantlet coming with 4;
 * shooting at 12 months (10–15 in the field, S1; 12–18 under glass, data sheet), when the last, small bract-leaf is out;
 * the pseudostem's height and girth by the leaves it has made (Summerville 1944, Table 2; 1.9–2.5 m and 0.74–0.81 m
 * round at shooting, S4, made 10% more under glass, S8, S9).
 */
const GROW = {
	shooting: 365, // days from planting
	leaves: 44, // leaves in the cycle
	first: 4, // leaves the plantlet comes with
	divergence: (140 / 180) * Math.PI, // between one leaf and the next round the stem (~140°, [EST])
	/** the pseudostem's height to its throat (m) by the leaves made so far */
	height: [[4, 0.05], [8, 0.16], [12, 0.34], [16, 0.56], [19, 0.71], [22, 0.95], [26, 1.12], [30, 1.3], [34, 1.55], [38, 1.82], [42, 2.08], [44, 2.2]],
	/** its girth round the foot (m) by the leaves made so far (0.74–0.81 m at 1 m at shooting, more at the foot) */
	girth: [[4, 0.04], [8, 0.08], [12, 0.16], [16, 0.32], [19, 0.39], [22, 0.5], [26, 0.57], [30, 0.68], [36, 0.8], [44, 0.9]],
	/** a leaf blade's length (m) by its number: the juvenile leaves small and narrow, the longest 1.8 m (S4) */
	blade: [[1, 0.04], [4, 0.08], [8, 0.2], [12, 0.38], [16, 0.6], [20, 0.85], [24, 1.1], [28, 1.3], [32, 1.5], [36, 1.66], [40, 1.78], [42, 1.72], [43, 1.35], [44, 0.62]],
	/** its length over its width: 3–4 on the juvenile leaves, 2.3 on the adult (S4) */
	ratio: [[1, 2.6], [5, 2.9], [10, 3.1], [14, 2.6], [20, 2.35], [44, 2.25]],
	/** days a leaf stays green: 76–146 (S7); the last ones, with no new leaves above them, longest */
	life: (n) => (n < 12 ? 70 : 110) + Math.max(0, n - 33) * 12,
};

/** the day leaf `n` came out of the throat (the plantlet's own four before day 0) */
const leafDay = (n) => (n <= GROW.first ? -40 + n * 9 : (GROW.shooting * (n - GROW.first)) / (GROW.leaves - GROW.first));
/** how many leaves it has made by `day` (fractional: the next one on its way) */
const leavesBy = (day) => clamp(GROW.first + ((GROW.leaves - GROW.first) * day) / GROW.shooting, GROW.first, GROW.leaves);

/**
 * The bunch: from shooting (`ds` days since), the purple bud rises out of the throat on its peduncle, bends over and
 * hangs; its bracts lift one a day, each freeing a hand of female flowers that turn their fingers up; after the last
 * female hand the male bell goes on down, its rachis growing about a centimetre a day and keeping its dry bracts and
 * dead male flowers (the Dwarf Cavendish's own mark: the rachis reaches nearly to the ground, S3). The hands fill for
 * about 115 days under glass (89–182, S7) and, left on the plant, yellow from the top hand down.
 */
const BUNCH = {
	hands: 11, // 11.5–12.8 scored hands (S4); 11 drawn
	fingers: [22, 14], // on the top hand and the bottom one (25.6 on the 2nd hand, S12; 12–16 below, [EST])
	spacing: 0.058, // along the rachis from one hand to the next (5.2–6.2 cm, S4)
	finger: 0.19, // a finger's full length along its curve (15–20 cm, S3; 15–25, S10)
	girth: 0.046, // its thickness when full and ripe (4.4–5.1 cm, S3; 37–38 mm caliper at harvest, S12, S16)
	opens: 6, // days after shooting the first bract lifts
	ripe: 118, // days after shooting the top hand starts to yellow on the plant
	bell: 0.22, // the male bud's length (20–25 cm, [EST])
	peduncle: 0.025, // its radius (about 5 cm thick, S7)
};

function bunch(bag, o) {
	const { top, ds, seed, key, az, stemR } = o;
	if (ds < 0) return;
	const r = chance(seed, 'bunch', ...key);
	const out = v3(Math.cos(az), 0, Math.sin(az));
	const axis = new THREE.Vector3().crossVectors(UP, out).normalize();
	// the peduncle: up out of the throat, then over and down
	const bendBy = table(ds, [[0, 0], [3, 0.4], [6, 1.3], [10, 2.4], [16, 2.95]]);
	const len = 0.22 + 0.48 * span(ds, 0, 12); // the peduncle reaches out of the crown before it hangs
	const steps = fewer(16, 5);
	const ped = [top.clone().add(v3(0, -0.1, 0))];
	for (let i = 1; i <= steps; i++) {
		const s = i / steps;
		const d = UP.clone().applyAxisAngle(axis, bendBy * Math.pow(s, 1.2));
		ped.push(ped[i - 1].clone().addScaledVector(d, (len + 0.1) / steps));
	}
	const pedR = BUNCH.peduncle * (0.7 + 0.3 * span(ds, 0, 10));
	bag.add('body', tube(ped, (u) => pedR * (1.15 - 0.2 * u), (u, v) => mix(MU.colour.peduncle, MU.colour.stemPale, 0.2 + 0.2 * Math.sin(v * 12.5)), fewer(10, 4)));
	const end = ped[steps];
	const endDir = ped[steps].clone().sub(ped[steps - 1]).normalize();
	// before the first bract lifts the whole bunch is in the bud: big, purple, pointing where the peduncle points
	const opened = ds < BUNCH.opens ? 0 : Math.min(BUNCH.hands, Math.floor(ds - BUNCH.opens) + 1);
	if (!opened) {
		bell(bag, end, endDir, 0.3 + 0.12 * span(ds, 0, 6), seed, [...key, 'bud']);
		return;
	}
	// the rachis hangs: from the peduncle's end straight down, the open hands along it
	const down = endDir.clone().lerp(v3(0, -1, 0), 0.7).normalize();
	const at = (s) => end.clone().addScaledVector(down, s);
	const female = BUNCH.spacing * (opened + 0.3);
	const maleDays = Math.max(0, ds - BUNCH.opens - BUNCH.hands);
	// the male rachis down to near the ground, a centimetre a day
	const lowest = at(female).y;
	const male = Math.min(maleDays * 0.0095, Math.max(0, lowest - 0.3));
	const rachisLen = female + male;
	const rpts = [];
	const rsteps = fewer(Math.max(6, Math.round(rachisLen * 30)), 4);
	for (let i = 0; i <= rsteps; i++) {
		const s = (i / rsteps) * rachisLen;
		const sway = Math.max(0, s - female);
		rpts.push(at(s).addScaledVector(out, sway * sway * 0.08));
	}
	bag.add('body', tube(rpts, (u) => (u * rachisLen < female ? 0.02 : 0.011), () => mix(MU.colour.peduncle, MU.colour.sheathDry, 0.2), fewer(8, 3)));
	// the hands, each its crown on the rachis and its fingers in two rows, the top hand the oldest
	for (let k = 0; k < opened; k++) {
		const dk = ds - BUNCH.opens - k; // days since its bract lifted
		const P = at(BUNCH.spacing * (k + 0.5));
		const phi = az + k * 2.4 + about(r, 0, 0.2);
		const radial = v3(Math.cos(phi), 0, Math.sin(phi));
		const nk = Math.round(lerp(BUNCH.fingers[0], BUNCH.fingers[1], k / (BUNCH.hands - 1)));
		const up = span(dk, 1, 14); // how far its fingers have turned up
		const crownR = 0.045;
		bag.add('body', bead(P.clone().addScaledVector(radial, 0.02), v3(0.03, 0.022, 0.03), MU.colour.crown, 6));
		for (let i = 0; i < nk; i++) {
			const row = i % 2; // two rows: the upper and outer, the lower and inner
			const j = Math.floor(i / 2), m = Math.ceil(nk / 2);
			const spread = ((j + 0.5) / m - 0.5) * (row ? 2.4 : 2.8);
			const fr = chance(seed, 'finger', ...key, k, i);
			const ang = phi + spread + about(fr, 0, 0.04);
			const rad = v3(Math.cos(ang), 0, Math.sin(ang));
			const base = P.clone().addScaledVector(rad, crownR * (row ? 0.75 : 1)).add(v3(0, row ? -0.016 : 0.004, 0));
			const d0 = v3(0, -1, 0).lerp(rad.clone().add(v3(0, -0.22, 0)).normalize(), 0.35 + 0.65 * up).normalize();
			finger(bag, {
				at: base, dir: d0, up: UP, d: dk, full: BUNCH.finger * (1 - 0.18 * (k / BUNCH.hands)) * (row ? 0.94 : 1) * about(fr, 1, 0.04),
				girth: BUNCH.girth * about(fr, 1, 0.04), turn: 0.15 + up * (row ? 1.0 : 0.85), k: fr(), ripeAt: BUNCH.ripe + k * 1.6,
				key: [...key, 'finger', k, i], seed,
			});
		}
		// the bract that freed it, lifting and curling back for a day or two before it falls
		if (dk < 2.2) bract(bag, P.clone().addScaledVector(radial, 0.03), v3(0, -1, 0), radial, span(dk, 0, 2), 0.2, seed, [...key, 'b', k]);
	}
	// the female hands still in the bud: the bud below the last open hand, smaller as it gives them up
	const left = BUNCH.hands - opened;
	const budAt = at(female + male);
	const budDir = male > 0 ? rpts[rsteps].clone().sub(rpts[rsteps - 1]).normalize() : down;
	const budLen = BUNCH.bell * (1 + 0.6 * (left / BUNCH.hands)) * (1 - 0.15 * span(ds, 30, 130));
	// the male part: the persistent bracts, dried brown and curled, and the dead male flowers at every node
	if (male > 0.01) {
		const nodes = Math.floor(male / 0.022);
		for (let i = 0; i < nodes; i++) {
			const s = female + 0.012 + i * 0.022;
			const p = rpts[Math.min(rsteps, Math.round((s / rachisLen) * rsteps))];
			const a = az + i * 2.4;
			const rd = v3(Math.cos(a), 0, Math.sin(a));
			const age = (male - (s - female)) / 0.0095; // days since this node opened
			const dry = span(age, 3, 14);
			const br = chance(seed, 'male', ...key, i);
			const g = sheet({
				length: 0.07 * (1 - 0.4 * dry),
				width: 0.045,
				shape: (u) => table(u, MU.bractShape) * 0.5 * (1 - 0.3 * dry),
				lift: (u, v) => -u * u * (0.3 + dry * 0.8) + (1 - Math.abs(v)) * 0.15 * (1 - dry) + (noise3(u * 9, v * 4, i, 3) - 0.5) * 0.15 * dry,
				paint: (u) => mix(MU.colour.bractIn, MU.colour.sheathDry, dry).lerp(MU.colour.sheathPale, dry * 0.3 * u),
				back: () => mix(MU.colour.bell, MU.colour.sheathDry, dry),
				along: 6,
				across: 3,
			});
			bag.add('fibre', g, aim(p.clone().addScaledVector(rd, 0.008), rd.clone().add(v3(0, -0.6 + dry * 0.9, 0)).normalize(), about(br, 0, 0.5)));
			// the cluster of dead male flowers under it: a few dry tubes
			if (DETAIL.level >= 0.5)
				for (let f = 0; f < 3; f++) {
					const fd = rd.clone().applyAxisAngle(UP, (f - 1) * 0.35).add(v3(0, -0.5, 0)).normalize();
					const q = p.clone().addScaledVector(rd, 0.01);
					bag.add('sheet', tube([q, q.clone().addScaledVector(fd, 0.03)], (u) => 0.0035 * (1 - 0.4 * u), () => mix(MU.colour.flower, MU.colour.sheathDry, dry), 4, true));
				}
		}
	}
	bell(bag, budAt, budDir, budLen, seed, [...key, 'bell']);
	// the bract lifting at the top of the bell, freeing the next hand or the next male cluster
	bract(bag, budAt.clone().addScaledVector(budDir, budLen * 0.12), budDir, v3(Math.cos(az + ds * 2.4), 0, Math.sin(az + ds * 2.4)), (ds % 1) * 0.8 + 0.2, budLen * 0.75, seed, [...key, 'bb', Math.floor(ds)]);
}

/**
 * One banana plant, `day` days into its life from its planting (or, a sucker, from coming out of the soil), at `at`:
 * its corm and roots, its pseudostem, its leaves from the oldest still hanging to the cigar, and, from shooting, its
 * bunch. A sucker (`sword`) keeps its narrow sword leaves longer, and grows in its mother's shade at `pace`.
 */
function bananaPlant(bag, day, seed, key, at, o = {}) {
	if (day < 0) return;
	const made = leavesBy(day);
	const H = table(made, GROW.height) * (o.size ?? 1);
	const D = table(made, GROW.girth) / Math.PI * (o.size ?? 1);
	const r = chance(seed, 'plant', ...key);
	const turn = r() * Math.PI * 2;
	const lean = o.lean ?? about(r, 0.02, 0.02);
	const leanAz = turn + 1.3;
	const base = at.clone();
	// the leaves standing: each its own number, out of the throat on its day, round the stem by the divergence
	const now = Math.ceil(made + (day >= GROW.shooting ? 0 : 0.7));
	const leaves = [];
	for (let n = 1; n <= Math.min(GROW.leaves, now); n++) {
		const age = day - leafDay(n);
		const life = GROW.life(n);
		if (age < -0.5 || age > life + 32) continue; // a grower cuts the dead ones off
		leaves.push({ n, age, life, az: turn + n * GROW.divergence });
	}
	corm(bag, { base: base.clone().add(v3(0, -0.02 - D * 0.3, 0)), D: Math.max(D, 0.03), age: day, seed, key });
	const sheaths = leaves.slice(0, 6).map((l) => ({ v: (((l.az + Math.PI) / (Math.PI * 2)) % 1 + 1) % 1, top: H * (0.4 + 0.1 * (l.n % 5)) }));
	const stem = pseudostem(bag, { base, H, D, age: day, seed, key, lean, leanAz, sheaths });
	const top = stem.top;
	const topR = (D / 2) * 0.64;
	for (const l of leaves) {
		const L = table(l.n, GROW.blade) * (o.size ?? 1);
		const sword = o.sword ? clamp(1 - (l.n - 8) / 14) : 0;
		const ratio = table(l.n, GROW.ratio) * (1 + sword * 1.4);
		const petiole = Math.min(0.38, 0.03 + 0.2 * L);
		// the petiole out of the throat: the older the leaf, the lower down and further out it sits
		const below = clamp((made - l.n) * 0.035, 0, H * 0.28);
		const out = v3(Math.cos(l.az), 0, Math.sin(l.az));
		const from = top.clone().add(v3(0, -below, 0)).addScaledVector(out, l.age < 7 ? 0 : topR * 0.55);
		leafOn(bag, { from, az: l.az, age: l.age, life: l.life, L, ratio, petiole, seed, key: [...key, l.n], upright: 0.12 + sword * 0.3, tearing: o.sword ? 0 : 2.5, juvenile: l.n <= 12 ? 1 - l.n / 12 : 0 });
	}
	if (o.mother && day >= GROW.shooting) bunch(bag, { top, ds: day - GROW.shooting, seed, key, az: turn + 0.6, stemR: topR });
	return { H, D, top };
}

/** the mat: the mother plant, and from her sixth and eleventh months the sucker kept to follow her and a peeper */
function bananaMat(day, seed) {
	const bag = new Bag();
	const r = chance(seed, 'mat');
	const mother = bananaPlant(bag, day, seed, ['mother'], v3(0, 0, 0), { mother: true });
	const D = mother ? mother.D : 0.05;
	const az = r() * Math.PI * 2;
	// the follower, a sword sucker in its mother's shade: 1–2 m by her harvest (data sheet)
	bananaPlant(bag, (day - 200) * 0.62, seed, ['follower'], v3(Math.cos(az), 0, Math.sin(az)).multiplyScalar(D * 0.5 + 0.12), { sword: true, lean: 0.12, size: 0.95 });
	// a peeper on the other side
	const az2 = az + 2.3 + r();
	bananaPlant(bag, (day - 330) * 0.45, seed, ['peeper'], v3(Math.cos(az2), 0, Math.sin(az2)).multiplyScalar(D * 0.5 + 0.06), { sword: true, lean: 0.08, size: 0.85 });
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the plantlet to ripe fingers; `day` the days since planting each is grown at (between two stages,
 * on the way). Under glass, about 25 °C: shooting at 12 months, the bunch full about 115 days after.
 */
const S = GROW.shooting;
const STAGES = [
	{ name: 'Plantlet', day: 0, note: 'A tissue-culture plantlet, hardened and planted out: 10–15 cm, four small leaves round a pseudostem a finger thick, its white cord roots just reaching into the soil. Sterile and seedless, every Dwarf Cavendish is a clone of the one grown in a hothouse at Chatsworth in 1836.' },
	{ name: 'Young plant', day: 91, note: 'Three months: about 0.45 m to the throat and some 14 leaves made, a new one every week or so, unrolling from a pale cigar; the first are narrow, the newer ones broad, often blotched maroon.' },
	{ name: 'Six months', day: 182, note: 'About 1 m to the throat, 0.5 m round: a stout, squat pseudostem blotched dark brown, ten or more broad leaves on short stout petioles, the oldest yellowing from the margin and hanging dead against the stem.' },
	{ name: 'Nine months', day: 274, note: 'About 1.4 m to the throat and 1.8 m to the leaf tips, leaves up to 1.5 m long; the flower was set at the corm when 11 leaves were still to come. A sword sucker has come up at the foot: the follower.' },
	{ name: 'Shooting', day: S, note: 'Twelve months, 44 leaves made: the small bract-leaf is out and the purple bud rises from the throat on its peduncle, 5 cm thick. The pseudostem stands 2.2 m to the throat, 0.8 m round; 12 green leaves.' },
	{ name: 'Bunch hangs', day: S + 10, note: 'The peduncle has bent over and the bud hangs; its dark purple bracts lift one a day and roll back, each freeing a hand of female flowers, cream tubes on the tips of little green fingers.' },
	{ name: 'Hands open', day: S + 22, note: 'All eleven hands are out, two rows of fingers on each, turning up as they grow; below them the male bell goes on down, its bracts and the dead male flowers left on the rachis.' },
	{ name: 'Filling', day: S + 60, note: 'Two months: the fingers near full length, still angular and dark green; the rachis is half way to the ground, clothed in dry bracts.' },
	{ name: 'Full', day: S + 115, note: 'Ready to cut: about 115 days after shooting under glass (89 in summer to 182 in winter in the open), the fingers rounded and full, 20 cm long, 4 cm thick; the bunch some 35–40 kg, 11 hands, about 200 fingers. The follower is 1–1.5 m.' },
	{ name: 'Ripe', day: S + 136, note: 'Left on the plant it ripens from the top hand down: bright yellow, the stalk and tip last to turn, sugar spots coming. Cut, the mother is felled and the follower takes her place, harvest to harvest about a year.' },
];

/** the days since planting at a stage (0 … 9, between two stages on the way) */
function dayAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].day, STAGES[i + 1].day, x - i);
}

const grow = (stage, seed) => bananaMat(dayAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one finger on its own ---- */

function sizeOf(f) {
	const b = new THREE.Box3();
	for (const p of f.parts) {
		p.geometry.computeBoundingBox();
		b.union(p.geometry.boundingBox);
	}
	const s = b.getSize(new THREE.Vector3());
	return Math.max(s.x, s.y, s.z);
}
const dispose = (o) => o.traverse((m) => m.geometry?.dispose());

/** the fingers the plant bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ roots: false }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.9);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one finger at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant bears no fruit.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This finger has not come out of its bract yet.');
	const hang = new THREE.Matrix4()
		.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(f.dir, v3(0, -1, 0)))
		.multiply(new THREE.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	const kinds = {};
	for (const p of f.parts) {
		p.geometry.applyMatrix4(hang);
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
	id: 'banana',
	label: "Banana 'Dwarf Cavendish' · Musa acuminata",
	latin: "Musa acuminata Colla (AAA Group, Cavendish Subgroup) 'Dwarf Cavendish' · syn. M. cavendishii Lamb. · Dwarf Chinese, Pequeña Enana, Petite Naine · Zwergbanane",
	note: "The Dwarf Cavendish, the banana of the hothouse since Chatsworth in 1836 and the shortest Cavendish: a squat pseudostem blotched dark brown, 2.2 m to the throat and 0.8 m round, broad leaves 1.8 × 0.8 m on short stout petioles; at a year the purple bud hangs, eleven hands of curved fingers turn up, and the male rachis goes on to near the ground in its dry bracts.",
	from: 'Giant herb · 16 months from a plantlet',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'b0331713c677679651762d5176bbd94e52ae936eb30738896af5f8b6fa44bee9', model: 'fal-ai/nano-banana-pro', made: '2026-11-04' },
	stages: STAGES.map(({ name, day, note }) => ({ name, day: Math.round(day), note })), // days from planting
	// what a world needs to plant it right (spacing, climate, how fast it grows and how big it gets); data sheet S1–S23
	facts: {
		height: { throatAtShooting: [1.9, 2.5], leafTips: [2.4, 3.7], at3months: [0.4, 0.5], at6months: [0.7, 1.5], unit: 'm' },
		pseudostem: { girthAt1m: [0.74, 0.81], baseDiameter: [0.2, 0.36], unit: 'm' },
		spacing: [2, 2.5], // 1,667–2,000 plants a hectare (Canaries)
		shade: 'full sun best; up to 50% shade, slower',
		climate: 'tropics and subtropics, or under glass: 27 °C best, leaves stop below 16 °C, growth below 10 °C; chilling and chokethroat after long spells under 15 °C; killed to the ground below −2 °C',
		days: { leafEvery: [7, 30], toShooting: [300, 450], shootingToHarvest: [89, 182], harvestToHarvest: [343, 404] },
		leaf: { length: [1.3, 1.9], width: [0.57, 0.86], green: [10, 14], perCycle: [43, 47], life: [76, 146], unit: 'm, days' },
		bunch: { mass: [33, 40], hands: [11.5, 12.8], fingersPerHand: [14, 26], length: [0.6, 0.76], unit: 'kg, m' },
		finger: { length: [0.15, 0.25], diameter: [0.037, 0.051], mass: 0.165, unit: 'm, kg' },
		roots: { count: [200, 500], diameter: 0.0043, mostIn: 0.15, deepest: 1.5, spread: 4.9, unit: 'm' },
		corm: { mass: [2.1, 9], unit: 'kg' },
		yield: { tPerHa: [55, 67], underGlass: '+20–30%' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one finger) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'banana' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'banana',
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
module.exports.organs = { MU, GROW, BUNCH, blade, leafOn, pseudostem, corm, finger, bract, bell, bunch, bananaPlant, bananaMat, Bag, dayAt, leavesBy, leafDay, surface, lite, detailAt };
