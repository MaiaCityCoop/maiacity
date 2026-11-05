'use strict';
/*
 * SERVICEBERRY 'SMOKY' — Amelanchier alnifolia (Nutt.) Nutt. ex M.Roem. 'Smoky' (Saskatoon berry, Saskatoon
 * serviceberry, western serviceberry, juneberry): the Saskatoon selected for fruit in Alberta and released in 1952,
 * the most planted Saskatoon of the Canadian prairie orchards. Version 2 of plants/serviceberry: one named cultivar,
 * grown from its seed to a suckering bush of many stems in its eighth summer, laden, then in its autumn colour.
 *
 * Its numbers are the cultivar's where they were measured (Zatylny et al. 2002 and McGarry et al. 1998/2001 at
 * Edmonton: fruit 11–13 mm and about 1 g, 3.2 seeds a fruit, ripe 56–63 days after bloom, 7–11 fruit a cluster,
 * 21.6 suckers a plant over its 2nd–7th seasons, a current shoot of 43 cm in its 3rd season; the Alberta Saskatoon
 * Berry Production Manual: 1.5–2.5 m at about seven years, stems renewed from the crown) and the species' otherwise
 * (Flora of North America for var. alnifolia: leaf 33–47 × 24–36 mm toothed only toward the tip, 8–13 vein pairs,
 * racemes 26–43 mm of 6–11 flowers, petals 9–14 × 4–5 mm, about 20 stamens; the Woody Plant Seed Manual: the seed and
 * its epigeal germination). Estimates are marked in the data sheet (plant-skill's serviceberry-smoky.md, S1–S23).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (0d8475b2…, sheet 2 with its leaves redrawn): its outlines and colours traced
 * off its panels. Where the plate is wrong against the data sheet (its 3-year and old bark deeply furrowed where the
 * real stems are smooth and grey; five seeds in a cut berry for about three; a leaf 1.45 : 1 for 1.3), the data sheet
 * wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from plum v2 (banana v2's with mipmapped pictures, `named()` and leaf
 *                   undersides with their own normals), with the serviceberry's surfaces: the leaf's straight
 *                   parallel veins, the stems' smooth grey bark with its darker lines, the berry's wax.
 *   2. ORGANS       the serviceberry's own, each to its measure: seed, seed leaves, bark, leaf, flower, raceme, berry.
 *   3. THE BUSH     its stems year by year (canes from the crown and suckers from its rhizomes, each a leader with
 *                   side shoots and short shoots), its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from germination (t = 0 the first of May of its first spring, when the seed
 * comes up); a year's season `s` 0 … 1 from the first of May round to the next (leaf-out s ≈ 0, bloom s ≈ 0.04, ripe
 * fruit s ≈ 0.2, autumn colour s ≈ 0.45).
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
		// the serviceberry's: thousands of small leaves, flowers and berries, so a crowd keeps fewer of them, each grown more
		[0.1, 0.07, 1.9, 0.008],
		[0.25, 0.2, 1.55, 0.0022],
		[0.5, 0.5, 1.25, 0.0008],
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
/** a colour by its name, parsed once and kept (a tree asks for the same few hundred thousand times) */
const PARSED = new Map();
const named = (c) => {
	if (c instanceof THREE.Color) return c;
	let k = PARSED.get(c);
	if (!k) PARSED.set(c, (k = new THREE.Color(c)));
	return k;
};
const toColor = (c) => (c instanceof THREE.Color ? c : C.copy(named(c)));
/** a colour between two, as a new THREE.Color */
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
		// the underside lit as the face above it is: a thin leaf lets the light through. (Not for small leaves seen from
		// every side: a normal facing away from the eye takes the whole sky in its Fresnel and the leaf draws white.)
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
 * lines of grey bark, the bloom on a berry. Laid on by the shape's UVs (a leaf's own, the bark's in metres: `metric`),
 * mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); the serviceberry has no bump
 * pictures (see MATERIALS). Only at detail 0.5 and over: a crowd far off draws plain colours.
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
	// mipmapped: a picture laid on a leaf a few pixels across is averaged, not sampled into noise
	t.generateMipmaps = true;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	t.magFilter = THREE.LinearFilter;
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
 *   leafMap              one blade in its own coordinates (u along it from the stalk, v across from edge to edge, the
 *                        midrib at v = ½): the Saskatoon's 10 pairs of straight, parallel side veins leaving the midrib
 *                        at about 40° and running nearly straight into the teeth (FNA: 8–13 pairs), a fine net
 *                        between them; the veins a little paler than the blade (the sheet's leaf)
 *   barkMap              0.2 m square of a grey stem, laid on in metres: smooth, with fine darker lines running up it in
 *                        a slightly twisted pattern (Alberta manual, S12), small pale lenticels across the grain
 *   bloomMap             a berry's skin under its wax: the bloom a little uneven, fine pale dots
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 10;
	const vein = (x, y, sharp) => {
		// side 0 at the midrib, 1 at the margin; the side veins leave at ~40° and run straight to the teeth
		const side = Math.abs(y - 0.5) * 2;
		const slant = side * 0.62 + 0.06 * side * side;
		const phase = (x - 0.03) * VEINS - slant * 1.1;
		const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), sharp) * smooth((0.95 - side) / 0.08) * smooth((x - 0.03) / 0.05) * smooth((0.98 - x) / 0.06);
		const mid = Math.exp(-Math.pow((y - 0.5) / 0.012, 2));
		const c = tileCells(x, y, 22, 12, 7);
		const net = smooth((0.08 - (c.f2 - c.f1)) / 0.06);
		return { sec, mid, net, side };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const { sec, mid, net } = vein(x, y, 34);
				const mottle = tileNoise(x, y, 18, 3) - 0.5;
				const k = 0.9 + 0.16 * sec + 0.16 * mid + 0.05 * net + 0.05 * mottle;
				return [k * 1.0, k * 1.01, k * 0.96];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x round the stem, y up it (0.2 m): fine darker lines up it, twisted a little, broken now and then; small pale
				// lenticels drawn out across it
				const w = tileNoise(x, y, 4, 61, 2) - 0.5;
				const line = Math.pow(Math.abs(Math.sin((x * 14 + y * 2 + w * 0.8) * Math.PI)), 10) * smooth((tileNoise(x, y, 6, 67, 2, 2) - 0.35) / 0.2);
				const l = tileCells(x, y, 18, 40, 63);
				const lent = l.id < 0.35 ? smooth((0.18 - l.f1) / 0.08) : 0;
				const k = (0.97 + 0.08 * (tileNoise(x, y, 20, 65, 3, 8) - 0.5)) * (1 - 0.32 * line) + 0.12 * lent;
				return [k, k * 0.98, k * 0.97];
			}, true),
		bloomMap: () =>
			picture(256, 256, (x, y) => {
				const dots = tileCells(x, y, 30, 30, 73);
				const dot = dots.id < 0.35 ? smooth((0.09 - dots.f1) / 0.05) : 0;
				const k = 0.97 + 0.06 * (tileNoise(x, y, 10, 75) - 0.5);
				return [k + 0.06 * dot, k + 0.06 * dot, k + 0.07 * dot];
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
 * The materials, made once, plain and with their surfaces. `bark` thick wood, matt, its plates and fissures;
 * `twig` young wood, a little glossy; `leaf` a leaf's two faces (one-sided, each its own colour), dull and quilted;
 * `bloom` the ripe berry's skin under its pale wax (sheen); `sheet` thin things seen from both sides (petals, sepals);
 * `body` buds, stalks, the stone, roots.
 */
const MATERIALS = {
	// colour pictures only, no bump: a bump picture's normal is NaN wherever a triangle stands edge-on or shrinks under a
	// pixel on screen (three's perturbNormalArb), and a dense tree of small triangles finds such a pixel from somewhere
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
	// no clearcoat on leaves: however thin, it mirrors the sky wherever a leaf is seen edge-on and a crown goes grey-white
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, specularIntensity: 0.3, ...(s && { map: s('leafMap') }) }),
	bloom: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.4, 0.37, 0.42), ...(s && { map: s('bloomMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'bloom', 'prop'];
// a serviceberry has thousands of leaves and flowers: a crowd far off draws a share of them, each grown to fill the gap
const THINNED = { leaf: true, sheet: true };

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
			mesh.name = kind;
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
				if (age > 0.3) c.lerp(named('#3c2c20'), 0.35 * noise3(v * 8, s * 30, 0, ns) * (1 - u));
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
 * 2. ORGANS — the Saskatoon 'Smoky''s own, each to its measure
 * ============================================================================================================== */

/**
 * The serviceberry's numbers. Sizes in metres from the data sheet (Smoky's own where measured, var. alnifolia's
 * otherwise); outlines and colours traced off its reference sheet (play file 0d8475b2…, Nano Banana Pro, 2026-11-05,
 * grey-balanced on its checker) with plant-skill's trace.py, the colours as the sheet's hex (sRGB) medians.
 */
const SM = {
	// the seed: 4–5 × 2–2.5 × 1.5 mm, a flattened ovoid with a curved back and a short beak, dark brown; sown ~1 cm deep
	seed: { length: 0.0045, width: 0.0023, thick: 0.0015, colour: '#7b5143', dark: '#4a2c22', depth: 0.01 },
	// two oval seed leaves on a reddish hypocotyl 1.5–3 cm [EST]
	cotyledon: { length: 0.0065, width: 0.0038, colour: '#6f9a4c', under: '#93ac70', hypocotyl: 0.02 },
	// leaf 40 × 30 mm on long shoots (FNA 33–47 × 24–36), smaller under the raceme, up to 60 mm on suckers; petiole
	// 12–18 mm; colours: the sheet's upper side, underside, young leaf, autumn leaf
	leaf: { length: 0.04, width: 0.03, petiole: 0.015, top: '#678469', topDark: '#587359', under: '#a8af94', vein: '#9eae8e', young: '#928158', youngGreen: '#8e9a5a', autumn: '#db6d37', autumnLate: '#c4482a', autumnYellow: '#dca23c', petioleColour: '#8a6a4a' },
	// flower ~25 mm across: five strap petals 9–14 × 4–5 mm, a bell cup, sepals 3 mm bent back, ~20 stamens, 5 styles
	flower: { petal: 0.012, petalWidth: 0.0045, petalColour: '#fbfbf6', base: '#eef0de', bud: '#f2f0e4', budTip: '#e8d8cc', cup: '#8e9a4c', sepal: '#86783e', anther: '#e8cf68', filament: '#f4f2e6', style: '#d6dea0', pedicelColour: '#8c8a4a' },
	// raceme 26–43 mm of 6–11 flowers, pedicels 8–16 mm (the lowest longest), 3.5 cm in fruit
	raceme: { length: 0.032, fruiting: 0.036, flowers: [7, 12], pedicel: [0.016, 0.008], axis: '#7c7a44', axisRipe: '#6a3a3a' },
	// fruit: Smoky 11.2–12.8 mm across, ~1 g (S7, S8); round (the sheet's 1.01 : 1: its height as drawn here, before the
	// stalk's cavity and the crown's cup take a millimetre off); its five sepals dry at the crown
	fruit: { diameter: 0.012, aspect: 1.08, crown: '#4a3028', crownGreen: '#7a7a3a' },
	// bark traced off the sheet's three swatches (a one-year shoot, a three-year stem, an old stem), the old one greyed
	// to the data sheet's "smooth, light grey" (the sheet's is furrowed and brown-grey)
	bark: { shoot: '#7e4c37', shootShade: '#6c5340', young: '#7d6a58', grey: '#9a9088', line: '#5e5650', lenticel: '#c4b8a4', fissure: '#4a4038', lichen: '#a2a68e' },
	root: { young: '#efe3c9', old: '#6a4a34' },
};

/**
 * The leaf's outline: half-widths along the blade (0 at the stalk … 1 at the tip, parts of its greatest width),
 * traced off the sheet's leaf (upper side) with its petiole cut off and its teeth smoothed over: the base rounded
 * into the stalk, widest a little above the middle, the tip ROUNDED (no point); the teeth are added by `leafShape`.
 */
const LEAF_W = [0.24, 0.38, 0.54, 0.66, 0.74, 0.81, 0.88, 0.92, 0.96, 0.99, 1.0, 1.0, 1.0, 0.97, 0.95, 0.91, 0.87, 0.82, 0.75, 0.64, 0.5, 0.31, 0.08];
/** the berry's profile from its stalk to its crown, half-widths as parts of the greatest, traced off the sheet's ripe
 * berry without its stalk and crown (0.98 : 1) */
const FRUIT_W = [0.41, 0.61, 0.73, 0.82, 0.89, 0.94, 0.97, 0.99, 1.0, 0.99, 0.98, 0.95, 0.9, 0.83, 0.74, 0.6, 0.35];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- the seed ---- */

/** The seed: a flattened ovoid 4.5 × 2.3 × 1.5 mm, its back curved, a short beak at the root's end (+X), dark brown,
 * leathery, finely wrinkled. Its coat splits as the root comes out. */
function seedShape(bag, at, turn, split, seed) {
	const S = SM.seed;
	const g = new THREE.SphereGeometry(1, fewer(28, 8), fewer(18, 6));
	const pos = g.attributes.position;
	const col = new Float32Array(pos.count * 3);
	const p = new THREE.Vector3();
	const ns = hashText(seed) % 997;
	for (let i = 0; i < pos.count; i++) {
		p.fromBufferAttribute(pos, i);
		const beak = Math.max(0, p.x);
		let x = p.x * (S.length / 2) * (1 + 0.12 * Math.pow(beak, 4));
		let y = p.y * (S.width / 2) * (1 - 0.45 * Math.pow(beak, 2.2));
		let z = p.z * (S.thick / 2) * (1 - 0.4 * Math.pow(beak, 2));
		y += 0.0004 * (1 - p.x * p.x); // the curved back
		const wr = fbm(x * 1500, y * 1500, z * 1500, 2, ns);
		const k = 1 + (wr - 0.5) * 0.05;
		x *= k;
		y *= k;
		z *= k;
		if (split > 0 && p.x > 0.3) y += Math.sign(p.y) * split * 0.0004 * (p.x - 0.3);
		pos.setXYZ(i, x, y, z);
		const c = mix(S.colour, S.dark, clamp((0.55 - wr) * 2.5) * 0.6 + 0.25 * beak);
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	const geo = made(Array.from(pos.array), Array.from(g.attributes.normal.array), new Array(pos.count * 2).fill(0), Array.from(col), Array.from(g.index.array), false);
	g.dispose();
	bag.add('body', geo, new THREE.Matrix4().compose(at, turn, v3(1, 1, 1)));
}

/* ---- bark ---- */

/**
 * Serviceberry bark by the age (years) and radius (m) of the wood, at a place on it (`v` round it, `s` along it, `sun`
 * 0 … 1 how much it faces the light): this year's shoot glossy red-brown (the sheet's 1-year swatch), olive-brown in
 * shade; two- to four-year wood grey-brown with small pale lenticels; older stems smooth light grey with fine darker
 * lines up them in a slightly twisted pattern (the picture `barkMap` carries the lines), only the foot of the oldest
 * shallowly fissured, a little grey-green lichen on the shaded side.
 */
const old = (r, age) => clamp((r - 0.006) / 0.01) * clamp((age - 2) / 3);
function barkColour(age, r, v, s, sun, ns) {
	const B = SM.bark;
	if (age < 0.6) return mix(B.shootShade, B.shoot, 0.35 + 0.65 * sun);
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const ln = noise3(cx * 160, s * 900, cz * 160, ns + 7);
	const lenticel = smooth((ln - 0.8) / 0.07);
	// one- to three-year wood: red-brown going grey-brown
	const c = mix(B.shoot, B.young, clamp((age - 0.6) / 1.6));
	const o = old(r, age);
	if (o > 0) {
		const shade = 0.88 + 0.24 * fbm(cx * 60, s * 8, cz * 60, 2, ns + 3);
		c.lerp(named(B.grey), smooth(o * 1.2)).multiplyScalar(shade);
		// the foot of an old stem: shallow fissures
		const foot = clamp(1 - s / 0.25) * clamp((r - 0.012) / 0.008);
		if (foot > 0) {
			const cc = cells(cx * 260, s * 50, cz * 260, ns + 5);
			c.lerp(named(B.fissure), smooth((0.1 - cc.edge) / 0.08) * foot * 0.7);
		}
		const lich = smooth((fbm(cx * 50, s * 16, cz * 50, 3, ns + 9) - 0.62) / 0.08) * clamp(0.3 - Math.sin(v * Math.PI * 2)) * o;
		c.lerp(named(B.lichen), lich * 0.35);
	}
	return c.lerp(named(B.lenticel), lenticel * 0.55 * (1 - o * 0.6));
}

/* ---- the leaf ---- */

/**
 * Its outline: the traced half-widths, and close up the margin's coarse sharp teeth on the upper part only (FNA: 0–3
 * on the lower half of each side, 3–5 a centimetre toward the tip; the sheet's leaf: the lower third smooth), about
 * nine to a side, coarsest round the rounded tip.
 */
const leafShape = (teeth) => (u) => {
	const w = along(LEAF_W, u);
	if (!teeth || u < 0.36 || u > 0.985) return w;
	const tooth = 1 - ((u * 15.5) % 1);
	return w * (1 + (0.02 + 0.05 * smooth((u - 0.36) / 0.4)) * tooth * tooth);
};

/**
 * One leaf: its slender stalk from the node, then the round blade, folded a little along the midrib; dull blue-green
 * above (its straight veins in its surface picture), paler grey-green below; young leaves bronze-olive and folded,
 * woolly below; in autumn yellow, orange and orange-red, then gone. `age` 0 … 1 from bud to grown, `fall` 0 … 1 its
 * autumn (colouring from 0, falling at 1).
 */
function leaf(bag, at, dir, size, age, fall, r, close = false, flat0 = false) {
	const L = SM.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const len = L.length * size * lerp(0.25, 1, smooth(age));
	const petLen = L.petiole * Math.sqrt(size) * lerp(0.3, 1, smooth(age));
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = flat0 ? 0 : lerp(1.05, about(r, 0.45, 0.25), smooth(age * 1.3));
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const end = at.clone().addScaledVector(pd, petLen).add(v3(0, -petLen * 0.12, 0));
	const mid = at.clone().lerp(end, 0.5).add(v3(0, petLen * 0.06, 0));
	const hue = r();
	const ripe = clamp(fall * 2); // the autumn colour, full by the time the leaves start to drop
	const autumn = (u) => mix(mix(L.autumnYellow, L.autumn, 0.35 + hue * 0.65 + u * 0.1), L.autumnLate, clamp(ripe * 1.2 - 0.6 + u * 0.15) * hue);
	bag.add('body', tube(close ? [at, mid, end] : [at, end], (u) => 0.0007 * Math.sqrt(size) * (1 - 0.3 * u) * lerp(0.5, 1, age), () => (ripe > 0.3 ? autumn(0) : mix(L.petioleColour, '#7a8a4a', 0.4 + (1 - age) * 0.3)), close ? 6 : 3));
	// each blade at its own angle, as the sheet's shoots show them: some held up, some hanging, turned on their stalks
	const droop = flat0 ? 0 : lerp(-0.6, about(r, -0.15, 0.55), smooth(age * 1.3)) - ripe * 0.2;
	const bd = flat.clone().applyAxisAngle(UP, flat0 ? 0 : about(r, 0, 0.35)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = flat0 ? 0 : lerp(0.9, about(r, 0.12, 0.06), smooth(age * 1.2));
	const curl = flat0 ? 0 : about(r, 0.08, 0.05);
	const ns = Math.floor(r() * 1000);
	const young = 1 - smooth(age * 1.25);
	const top = (u, v) => {
		const c = mix(L.top, mix(L.young, L.youngGreen, u * 0.4), young * 0.9);
		c.lerp(named(L.topDark), clamp((noise3(u * 3, v * 2, ns, 3) - 0.45) * 1.5) * 0.45);
		if (Math.abs(v) < 0.05) c.lerp(named(L.vein), 0.3 * (1 - u * 0.6));
		if (ripe > 0) c.lerp(autumn(u), clamp(ripe * 1.4 - u * 0.25 - (1 - Math.abs(v)) * 0.15));
		return c;
	};
	const under = (u, v) => {
		// woolly when young: silvery
		const c = mix(L.under, '#c4c0a8', young * 0.8);
		if (Math.abs(v) < 0.06) c.lerp(named('#c4c8b0'), 0.35);
		if (ripe > 0) c.lerp(autumn(u), clamp(ripe * 1.3 - u * 0.25) * 0.85);
		return c;
	};
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: leafShape(close),
		lift: (u, v) => fold * Math.abs(v) * 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.05)) - curl * u * u + 0.008 * Math.sin(u * 9 + v * 3) * v * v,
		paint: top,
		back: under,
		backLit: false, // its own normals: seen from below it is its underside, not the sky
		along: close ? 44 : 3,
		across: close ? 14 : 2,
	});
	bag.add('leaf', blade, aim(end, bd, flat0 ? 0 : about(r, 0, 0.75)));
}

/* ---- buds ---- */

/** a winter bud: narrow, pointed, red-brown, pressed to the twig; a mixed bud plumper, silver-haired as it opens */
function bud(bag, at, dir, mixed, swell, r) {
	const s = mixed ? lerp(0.0016, 0.0032, swell) : 0.0012;
	const col = mixed ? mix('#7a3e2c', '#c8c0b0', clamp(swell * 2 - 0.6)) : '#7a3e2c';
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	const c = at.clone().addScaledVector(dir, s * 1.2);
	bag.add('body', bead(c, v3(s * 0.55, s * (mixed ? 1.8 : 2.4), s * 0.55), col, DETAIL.fruit ? 4 : 2, q));
}

/* ---- the flower ---- */

/**
 * One flower at the end of its pedicel (drawn by `raceme`), facing along `facing`: a green bell-shaped cup, five
 * small sepals bent back, five narrow strap-shaped white petals (12 × 4.5 mm) spread like a loose star, some twenty
 * stamens with pale yellow anthers round the cup's rim, five short styles. About 25 mm across. `open` 0 … 1, `fall`
 * 0 … 1 petals dropping.
 */
function flower(bag, at, facing, open, fall, r, close = false) {
	const F = SM.flower;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const base = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const turn = (a, up) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(up));
	const roll = r() * Math.PI * 2;
	const cupH = 0.0022;
	// the cup (hypanthium): a small green bell
	bag.add('body', tube(close ? [v3(0, -0.0006, 0), v3(0, cupH * 0.5, 0), v3(0, cupH, 0)] : [v3(0, -0.0006, 0), v3(0, cupH, 0)], (u) => 0.0006 + 0.0012 * u * u, () => F.cup, close ? 10 : 3), base);
	const cupTop = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(0, cupH, 0));
	for (let k = 0; k < (close ? 5 : 0); k++) {
		const s = sheet({ length: 0.003, width: 0.0011, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.5 * u), lift: (u) => 0.05 * u * u, paint: (u) => mix(F.sepal, '#9aa058', u * 0.3), along: 4, across: 2 });
		const up = lerp(1.2, 0.02, smooth(open)); // spreading between the petals (the sheet's flower; FNA: erect to recurved)
		bag.add('sheet', s, cupTop.clone().multiply(turn((k / 5) * Math.PI * 2 + roll + 0.63, up)));
	}
	if (fall < 1) {
		for (let k = 0; k < 5; k++) {
			const len = F.petal * lerp(0.3, 1, smooth(open)) * about(r, 1, 0.1);
			const p = sheet({
				length: len,
				width: (F.petalWidth / 2) * lerp(0.6, 1, smooth(open)) * about(r, 1, 0.08),
				// strap-shaped: a narrow claw, then nearly parallel sides to a rounded tip (the sheet's flower, FNA)
				shape: (u) => (0.35 + 0.65 * smooth(u / 0.32)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - 0.62) / 0.38, 2))),
				lift: (u, v) => 0.1 * v * v * u + 0.1 * u * u * (1 - open * 0.7) + 0.03 * Math.sin(v * 4 + u * 6 + k),
				paint: (u) => mix(mix(F.petalColour, F.base, (1 - smooth(u / 0.25)) * 0.7), F.budTip, (1 - smooth(open * 1.5)) * 0.5).lerp(named('#e6dfcc'), fall * 0.6),
				along: close ? 14 : 2,
				across: close ? 6 : 1,
			});
			const up = lerp(1.45, 0.18, smooth(open)) - fall * 1.1 + about(r, 0, 0.12);
			const drop = 1 - fall * 0.5;
			bag.add('sheet', p, cupTop.clone().multiply(turn((k / 5) * Math.PI * 2 + roll + about(r, 0, 0.12), up)).multiply(new THREE.Matrix4().makeScale(drop, 1, drop)));
		}
	}
	if (open < 0.25 || (!close && DETAIL.level < 0.5)) return;
	const n = close ? 20 : 5;
	const brown = clamp(fall * 1.5);
	const fil = [];
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + roll;
		const spread = lerp(0.1, 0.42, smooth(open)) + (k % 2) * 0.1;
		const L = 0.0042 * (k % 2 ? 0.8 : 1);
		const d = v3(Math.cos(a) * Math.sin(spread), Math.cos(spread), Math.sin(a) * Math.sin(spread));
		const p0 = v3(Math.cos(a) * 0.0016, cupH, Math.sin(a) * 0.0016);
		const p1 = p0.clone().addScaledVector(d, L);
		fil.push([p0, p1, d]);
		if (close) bag.add('body', tube([p0, p0.clone().lerp(p1, 0.5).add(v3(0, 0.0002, 0)), p1], () => 0.00012, () => mix(F.filament, '#c9a070', brown), 3), base);
		if (close) bag.add('body', bead(p1, v3(0.00035, 0.00025, 0.00035), mix(F.anther, '#7a5a2a', brown), 6), base);
	}
	if (!close) {
		const pos = [], col = [], idx = [];
		const c0 = toColor(mix(F.filament, '#c9a070', brown)).clone();
		const c1 = toColor(mix(F.anther, '#7a5a2a', brown)).clone();
		for (let k = 0; k <= n; k++) {
			const [p0, p1, d] = fil[k % n];
			const p2 = p1.clone().addScaledVector(d, 0.0007);
			pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
			col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
		}
		for (let k = 0; k < n; k++) {
			const a = k * 3;
			idx.push(a, a + 1, a + 3, a + 3, a + 1, a + 4, a + 1, a + 2, a + 4, a + 4, a + 2, a + 5);
		}
		bag.add('sheet', made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true), base);
	}
	// five short styles, joined at their base, in the cup's woolly centre
	if (close) for (let k = 0; k < 5; k++) {
		const a = (k / 5) * Math.PI * 2 + roll;
		const tip = v3(Math.cos(a) * 0.0006, cupH + 0.0028, Math.sin(a) * 0.0006);
		bag.add('body', tube([v3(0, cupH - 0.0004, 0), tip], () => 0.00014, () => mix(F.style, '#b8a070', brown), 3, true), base);
	}
}

/* ---- the berry ---- */

/** how big a berry is, 0 … 1 of its ripe size, by days after bloom: slow at first, the last swell as it colours */
const RIPE_DAYS = 60;
function fruitSize(d) {
	return straight(d, [
		[0, 0.25],
		[10, 0.36],
		[20, 0.5],
		[30, 0.62],
		[40, 0.74],
		[48, 0.86],
		[55, 0.96],
		[RIPE_DAYS, 1],
	]);
}

/**
 * The skin by days after bloom (the sheet's four ages): yellow-green as it sets, green, then from about 40 days pink
 * to red (the sunny side first), red-purple, and ripe deep purple-black at 56–63 days (Smoky at Edmonton); the pale
 * waxy bloom comes over it as it darkens.
 */
function skinAt(d, lit) {
	const turn = d - 40 + lit * 4;
	if (turn < 0) return mix('#838834', '#86963a', clamp(d / 30));
	if (turn < 6) return mix('#86963a', '#b04858', turn / 6);
	if (turn < 11) return mix('#b04858', '#7a2a44', (turn - 6) / 5);
	if (turn < 18) return mix('#7a2a44', '#34182e', (turn - 11) / 7);
	return mix('#34182e', '#2e1426', clamp((turn - 18) / 6));
}
const bloomAt = (d) => clamp((d - 49) / 10);
const BLOOM_VEIL = '#8a8290';

/**
 * One berry: a small round pome, its profile the traced one, a little flattened at the stalk, at its crown (the tip,
 * −Y as it hangs) a small cup ringed by the five dry sepals, erect while it is green, dark and curled in when ripe.
 * Built hanging from the origin down −Y; `sun` the light's direction in the berry's own frame.
 */
function berryGeometry(o) {
	const { D, H, days, sun, ns, res } = o;
	const rings = res ? 48 : fewer(5, 4);
	const sides = res ? 56 : fewer(6, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const bloom = bloomAt(days);
	const veil = named(BLOOM_VEIL);
	for (let i = 0; i <= rings; i++) {
		// rings spaced by (1 − cos) toward the poles, so the lathe closes round
		const u = (1 - Math.cos((i / rings) * Math.PI)) / 2;
		const th = u * Math.PI;
		// the traced profile, closing round at both ends: never wider than the circle there (2√(u(1−u)) along its
		// height; a sine of u closes in a point)
		const prof = Math.min(along(FRUIT_W, u), 2 * Math.sqrt(u * (1 - u)));
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const lump = 1 + 0.025 * (fbm(Math.cos(ph) * 1.5, Math.sin(ph) * 1.5, u * 2, 2, ns) - 0.5);
			// the crown: a small dent at the tip where the cup is
			const cup = 1 - 0.1 * Math.exp(-Math.pow((1 - u) / 0.05, 2));
			const rr = (D / 2) * prof * lump * cup;
			const x = rr * Math.cos(ph);
			const z = rr * Math.sin(ph);
			let y = -H * u;
			y -= 0.0006 * Math.exp(-Math.pow(u / 0.06, 2)); // the stalk's little cavity
			y += 0.0005 * (D / 0.012) * Math.exp(-Math.pow((1 - u) / 0.05, 2)); // the cup's dent at the crown
			pos.push(x, y, z);
			nor.push(0, 0, 0);
			uv.push((j / sides) * 2, u * 2);
			const n = v3(Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
			const lit = Math.max(0, n.dot(sun));
			const c = skinAt(days + 5 * (fbm(x * 300, y * 300, z * 300, 2, ns + 9) - 0.5), lit);
			const rub = smooth((fbm(x * 600, y * 600, z * 600, 3, ns + 3) - 0.64) / 0.08);
			c.lerp(veil, bloom * (0.3 - 0.06 * lit) * (1 - 0.8 * rub));
			// the crown's cup dark, the stalk end a little greener till late
			c.lerp(named('#3a2420'), clamp(1 - (1 - u) / 0.07) * 0.6);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	return smoothNormals(made(pos, nor, uv, col, idx, false));
}

/**
 * A berry on its raceme, hanging from the end of its pedicel `at` along `dir`: the berry and its crown of sepals.
 * `days` after its flower opened. Returns its size.
 */
function berry(bag, at, dir, days, sunWorld, seedKey, key) {
	const Fr = SM.fruit;
	const size = fruitSize(days);
	const r = chance(seedKey, 'fruit', key);
	const k = about(r, 1, 0.07);
	const D = Fr.diameter * size * k;
	const H = D * Fr.aspect * lerp(1.15, 1, clamp(days / 25)) * about(r, 1, 0.03);
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const res = DETAIL.fruit === key;
	if (DETAIL.level < 0.5 && !res) {
		// a crowd far off: each berry a small bead of its colour
		const c = skinAt(days, 0.5).lerp(named(BLOOM_VEIL), bloomAt(days) * 0.25);
		bag.add('body', bead(v3(0, -H * 0.5, 0), v3(D / 2, H / 2, D / 2), c, 2), m);
		return { D, H };
	}
	const g = berryGeometry({ D, H, days, sun, ns: hashText(key) % 991, res });
	bag.add(days > 50 ? 'bloom' : 'body', g, m);
	// the crown: five dry sepals round the cup, erect and green at first, dark and curled in when ripe
	// (2–3 mm: drawn for the fruit view and close-ups; on the bush the cup's dark ring in the skin stands for them)
	if (res || DETAIL.closeFlowers) {
		const dry = clamp((days - 25) / 25);
		for (let s = 0; s < 5; s++) {
			const sl = 0.0026 * lerp(0.8, 1, size);
			const sh = sheet({ length: sl, width: 0.0008, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.5 * u), lift: (u) => 0.12 * u * u * (1 + dry), paint: (u) => mix(SM.fruit.crownGreen, SM.fruit.crown, dry * 0.8 + u * 0.2), along: res ? 5 : 2, across: res ? 2 : 1 });
			const a = (s / 5) * Math.PI * 2;
			// out and down from the tip, erect at first (flaring), curled in over the cup when ripe
			const tilt = -Math.PI / 2 + lerp(0.55, 0.08, dry);
			bag.add('sheet', sh, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -H + 0.0009 * (D / 0.012), 0)).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeTranslation(D * 0.1, 0, 0)).multiply(new THREE.Matrix4().makeRotationZ(tilt)));
		}
	}
	return { D, H };
}

/* ================================================================================================================
 * 3. THE BUSH — its stems year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the bush grows, in numbers. A Saskatoon from its seed, on its own roots, lightly pruned (a garden or food-forest
 * bush, not an orchard hedgerow): no source places Amelanchier in one of Hallé's models; it grows as the data sheet
 * describes it, a basitonic clump: each spring new stems (canes) come up from the crown at the ground, 5–20° from
 * upright, and from the second or third year suckers from rhizomes round it (Smoky: 21.6 suckers over its 2nd–7th
 * seasons, S6); each stem is a leader that grows in one flush a spring (late April to early July) and carries side
 * shoots from its upper buds and short shoots (1–5 cm, "spur-like projections") along its older wood, each short shoot
 * ending every spring in a raceme from a mixed bud with two or three leaves at its base. The bush is calibrated to the
 * data sheet's table: about 0.3 m in its first year from seed, 1.1–1.4 m and 5–8 stems in its third, 1.6–2.0 m in its
 * fifth, 2.0–2.5 m and 15–25 stems in its seventh and eighth, the thickest stem 30–40 mm at its foot.
 */
const BUSH = {
	depth: SM.seed.depth,
	// new stems from the crown each year, and suckers from the rhizomes
	canes: [1, 2, 2, 2, 3, 2, 2, 2, 2, 2],
	suckers: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2],
	// a new stem's first-year growth by the bush's age (the crown grows stronger), and how each later year's extension
	// fades with the stem's own age
	firstYear: [0.3, 0.6, 0.8, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0],
	fade: [1, 0.62, 0.46, 0.36, 0.3, 0.25, 0.22, 0.2, 0.18, 0.16],
	// a side shoot's first year by its order (1 the shoots off a stem), at vigour 1
	shoot: [0, 0.34, 0.2, 0.12],
	internode: 0.02,
	tipRadius: 0.0011,
	spurRadius: 0.0016,
	pipeLength: 2.2e-7,
	clear: 0.22, // stems carry no side wood below this
	firstFlowers: 4, // first blossom in its fifth spring from seed ("up to 5 years from seed", S10)
};

/** a year's season: `year` since germination, `s` 0 … 1 from the first of May round */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** how much of a year's extension is grown, `dt` years into that season: one flush, from leaf-out to early July */
const extension = (dt, first) => (first ? table(dt, [[-0.005, 0], [0.0, 0.01], [0.012, 0.04], [0.04, 0.11], [0.12, 0.2], [0.25, 0.37], [0.35, 0.74], [0.45, 1]]) : span(dt, 0.0, 0.19));

/**
 * The stems the bush has at time t, oldest first: each with its year, where it comes up and how it leans. The first is
 * the seedling's own stem; from the second spring two or three canes a year from the crown, which widens year by year;
 * from the third, suckers from the rhizomes 20–80 cm out.
 */
function stemsOf(seed, t) {
	const out = [];
	for (let y = 0; y <= Math.floor(t); y++) {
		const n = BUSH.canes[Math.min(y, BUSH.canes.length - 1)];
		for (let k = 0; k < n; k++) {
			const r = chance(seed, 'cane', y, k);
			const az = r() * Math.PI * 2;
			const rc = y === 0 ? 0 : (0.015 + 0.022 * Math.min(y, 7)) * Math.sqrt(r());
			const born = y === 0 ? 0 : y + between(r, 0.0, 0.04);
			// the outer stems lean out more; all come up 5–20° from upright
			const tilt = y === 0 ? 0.03 : between(r, 0.16, 0.36) + 2.8 * rc;
			out.push({ key: ['cane', y, k], born, az, at: v3(Math.cos(az) * rc, -0.02, Math.sin(az) * rc), tilt, vig: BUSH.firstYear[Math.min(y, BUSH.firstYear.length - 1)] * about(r, 1, 0.12), sucker: false });
		}
		const m = BUSH.suckers[Math.min(y, BUSH.suckers.length - 1)];
		for (let k = 0; k < m; k++) {
			const r = chance(seed, 'sucker', y, k);
			const az = r() * Math.PI * 2;
			const dist = between(r, 0.2, Math.min(0.6, 0.28 + 0.05 * y));
			out.push({ key: ['sucker', y, k], born: y + between(r, 0.01, 0.08), az, at: v3(Math.cos(az) * dist, -0.03, Math.sin(az) * dist), tilt: between(r, 0.06, 0.24), vig: 0.7 * about(r, 1, 0.12), sucker: true, dist });
		}
	}
	return out;
}

/**
 * The bush's axes at time t: each axis a polyline as far as grown, its nodes, the year each part grew in, and the
 * axes it bears. Every axis and node draws its own chance, so the bush at an earlier t is the first part of the bush
 * at a later one.
 */
function axes(seed, t, base) {
	const all = [];
	const stems = [];
	const grow = (key, from, dir, born, order, vigour, kind, parent, at, stem) => {
		if (t < born + (kind === 'cane' && born === 0 ? -0.005 : 0.004)) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, pts: [from.clone()], years: [Math.floor(born)], nodes: [], kids: [], vigour, dir0: dir.clone(), stem };
		if (kind === 'spur') {
			// a short shoot: a few millimetres a year, knobbly with the scars of its racemes; it lives a few years
			ax.life = between(r, 2, 5);
			if (t > born + ax.life) return null;
			all.push(ax);
			const d = dir.clone();
			let p = from.clone();
			const yearsOld = Math.floor(t - born) + 1;
			for (let y = 0; y < yearsOld; y++) {
				const f = y === yearsOld - 1 ? span(t - (born + y), 0.0, 0.08) : 1;
				const len = between(r, 0.004, 0.01) * (y === 0 ? 2 : 1) * f;
				d.add(v3(about(r, 0, 0.25), 0.15, about(r, 0, 0.25))).normalize();
				p = p.clone().addScaledVector(d, Math.max(0.0005, len));
				ax.pts.push(p);
				ax.years.push(Math.floor(born) + y);
			}
			ax.tipYear = Math.floor(born) + yearsOld - 1;
			return ax;
		}
		all.push(ax);
		const d = dir.clone().normalize();
		const outward = dir.clone().setY(0);
		const out = outward.lengthSq() > 1e-8 ? outward.normalize() : v3(0, 0, 0);
		let node = 0;
		const y0 = Math.floor(born);
		// the seedling's stem: its first 2 cm the hypocotyl under the seed leaves, no leaves on it
		const nodeStart = kind === 'cane' && born === 0 ? BUSH.depth + SM.cotyledon.hypocotyl : kind === 'cane' ? 0.05 : 0;
		ax.nodeBase = 0;
		for (let y = y0; y <= Math.floor(t); y++) {
			const ageAxis = y - y0;
			const first = kind === 'cane' && born === 0 && y === 0;
			let len = kind === 'cane' ? vigour * BUSH.fade[Math.min(ageAxis, BUSH.fade.length - 1)] * about(r, 1, 0.08) : BUSH.shoot[Math.min(order, BUSH.shoot.length - 1)] * vigour * BUSH.fade[Math.min(ageAxis, BUSH.fade.length - 1)] * about(r, 1, 0.15);
			if (kind === 'cane' && ageAxis === 0 && !first) len += 0.02; // from under the soil
			if (len < 0.02) break;
			const f = extension(t - Math.max(y, born), first);
			if (f <= 0) break;
			const step = first && t < 0.1 ? 0.004 : 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'cane') {
					// a stem keeps its lean and rises; with the years, and the fruit on it, it arches out a little
					const arch = 0.003 * Math.min(6, ageAxis) * (ax.nodeBase + walked > 0.6 ? 1 : 0.3);
					d.addScaledVector(stem.dir0, 0.22);
					d.add(v3(about(r, 0, 0.025) + out.x * arch, 0.035 - arch, about(r, 0, 0.025) + out.z * arch));
				} else {
					// a side shoot keeps its angle and turns up toward the light; its fine wood sags as it lengthens and bears
					const up = order === 1 ? 0.02 : 0.03;
					const sag = 0.0035 * (order + 0.5) * Math.min(5, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.4);
					d.addScaledVector(ax.dir0, 0.09);
					d.add(v3(about(r, 0, 0.06) + out.x * 0.02 + stem.dir0.x * 0.03, up - sag, about(r, 0, 0.06) + out.z * 0.02 + stem.dir0.z * 0.03));
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				const inter = first ? 0.011 : BUSH.internode; // the seedling's leaves close together
				while (nodeStart + node * inter < ax.nodeBase + walked) {
					const sAt = nodeStart + node * inter;
					const u = (sAt - ax.nodeBase) / len;
					ax.nodes.push({ i: node, year: y, u, s: sAt, formed: Math.max(y, born) + (first ? 0.03 : 0.004) + (first ? 0.4 : 0.17) * Math.pow(clamp(u), 1.2) });
					node++;
				}
			}
			ax.nodeBase += grown;
			if (f < 1) break;
		}
		ax.tipYear = ax.years[ax.years.length - 1];
		const pathLen = [0];
		for (let i = 1; i < ax.pts.length; i++) pathLen.push(pathLen[i - 1] + ax.pts[i].distanceTo(ax.pts[i - 1]));
		ax.len = pathLen[pathLen.length - 1];
		ax.pathLen = pathLen;
		const r2 = chance(seed, 'phyllo', ...key);
		const phase = r2() * Math.PI * 2;
		for (const n of ax.nodes) {
			const p = pointAt(ax, n.s);
			n.at = p.at;
			n.dir = p.dir;
			n.bearing = phase + n.i * 2.513; // 2/5 phyllotaxis
		}
		// lateral buds: the next spring each breaks into a side shoot, a short shoot (from a mixed bud: it flowers at once),
		// or sleeps
		for (const n of ax.nodes) {
			if (n.year + 1 > t - 0.002) continue;
			const br = chance(seed, 'bud', ...key, n.i);
			const u = n.u;
			const roll = br();
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			let pLong, pSpur, angle, vig;
			if (kind === 'cane') {
				// below knee height nothing is kept (the bush is open and leggy at its foot); above it side shoots from the
				// upper buds of each year's growth, short shoots between
				if (n.at.y < BUSH.clear) continue;
				// the bush is fullest through its lower middle (the sheet's bush in fruit): side shoots low on a stem leave
				// wider and grow stronger, those near its top steeper and weaker, so its top is a dome and not a broom
				const low = clamp(1 - (n.at.y - 0.45) / 1.1);
				const high = clamp((n.at.y - 1.6) / 0.6);
				pLong = (u > 0.72 ? 0.32 + 0.1 * high : u > 0.42 ? 0.1 + 0.12 * low : 0.04 + 0.08 * low) * (stem.sucker ? 0.7 : 1);
				pSpur = u > 0.06 && u < 0.96 ? 0.45 : 0.04;
				angle = lerp(lerp(0.95, 0.6, u), 1.05, low) * about(br, 1, 0.15);
				vig = Math.min(1, vigour * 1.3) * lerp(0.75, 0.95, u) * (1 + 0.22 * low) * (1 - 0.1 * high) * about(br, 1, 0.12);
			} else {
				const yearLen = BUSH.shoot[Math.min(order, BUSH.shoot.length - 1)] * vigour * BUSH.fade[Math.min(n.year - Math.floor(born), BUSH.fade.length - 1)];
				const above = side.y > 0.55 ? 0.5 : side.y < -0.55 ? 0.3 : 1;
				pLong = order >= 2 ? 0 : (u > 0.65 ? 0.26 : u > 0.32 ? 0.08 : 0) * clamp(yearLen / 0.14) * above;
				pSpur = u > 0.05 && u < 0.96 ? 0.45 : 0.03;
				angle = (order === 1 ? lerp(0.8, 0.5, u) : lerp(0.95, 0.6, u)) * about(br, 1, 0.15);
				vig = vigour * lerp(0.45, 0.85, u) * about(br, 1, 0.12);
			}
			if (roll < pLong) {
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const k = grow([...key, n.i], n.at, d0, n.year + 1 + about(br, 0.005, 0.005), order + 1, vig, 'long', ax, n.s, stem);
				if (k) ax.kids.push(k);
			} else if (roll < pLong + pSpur) {
				const d0 = n.dir.clone().multiplyScalar(0.45).addScaledVector(side, 1).normalize();
				const k = grow([...key, n.i, 's'], n.at, d0, n.year + 1, order + 1, 0, 'spur', ax, n.s, stem);
				if (k) {
					k.node = n;
					ax.kids.push(k);
				}
			}
		}
		return ax;
	};
	for (const st of stemsOf(seed, t)) {
		const out = v3(Math.cos(st.az), 0, Math.sin(st.az));
		const dir0 = out.clone().multiplyScalar(Math.sin(st.tilt)).add(v3(0, Math.cos(st.tilt), 0)).normalize();
		const stem = { ...st, dir0 };
		const from = st.born === 0 ? base.clone() : base.clone().add(v3(0, BUSH.depth, 0)).add(st.at);
		const ax = grow(st.key, from, dir0, st.born, 0, st.vig, 'cane', null, 0, stem);
		if (ax) stems.push(ax);
	}
	return { all, stems };
}

/** the length along a path at each of its points */
function lengths(pts) {
	const l = [0];
	for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return l;
}

/** the place and direction at `s` metres along an axis */
function pointAt(ax, s) {
	const L = ax.pathLen ?? lengths(ax.pts);
	const total = L[L.length - 1];
	const x = clamp(s, 0, total);
	let i = 1;
	while (i < L.length - 1 && L[i] < x) i++;
	const k = (x - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
	return { at: ax.pts[i - 1].clone().lerp(ax.pts[i], k), dir: ax.pts[i].clone().sub(ax.pts[i - 1]).normalize(), i };
}

/**
 * How thick each axis is along it: the pipe model (r^2.5 summed over what the wood feeds) plus a ring a year,
 * calibrated to the data sheet's stems: 22–28 mm at the foot of the thickest in the fifth year, 30–40 mm in the seventh.
 */
const PIPE = 2.5;
const RING = 0.1;
const RING_ADD = 0.001;
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	const tip = ax.kind === 'spur' ? BUSH.spurRadius : BUSH.tipRadius;
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.kind === 'spur' ? Math.pow(0.0009, PIPE) : k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'spur' ? 0 : BUSH.pipeLength * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.25);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'spur' ? 0 : RING_ADD * Math.min(woodAge, 4) * clamp(Math.pow(q, 1 / PIPE) / 0.004));
		ax.r2[i] = r * r;
	}
}

/** the bush's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2) return;
	if (ax.kind === 'spur' && DETAIL.level < 0.5) return;
	const L = (ax.pathLen ??= lengths(ax.pts));
	const total = L[n - 1];
	if (total < 1e-4) return;
	const radiusAt = (s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		const k = clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return Math.sqrt(lerp(ax.r2[i - 1], ax.r2[i], k));
	};
	const yearAt = (s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		return ax.years[i];
	};
	const R0 = Math.sqrt(ax.r2[0]);
	const isSeedling = ax.kind === 'cane' && ax.born === 0;
	const step = ax.kind === 'spur' ? 0.02 : isSeedling && t < 0.3 ? 0.003 : R0 > 0.008 ? clamp(R0 * 3, 0.02, 0.06) : clamp(R0 * 3, R0 < 0.003 ? 0.035 : 0.02, 0.07);
	const pts = [];
	// a short shoot (a centimetre or two) as one straight piece
	const count = ax.kind === 'spur' ? 1 : Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'spur' ? 3 : Math.round(clamp(R0 * 800, R0 < 0.002 ? 4 : 5, 14));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (ax.kind === 'cane') r *= 1 + 0.25 * Math.exp(-Math.max(0, s - 0.02) / 0.05) * clamp(t - ax.born); // its foot swells where it leaves the crown
		else if (ax.kind !== 'spur' && s < r * 2.2) r *= 1 + 0.2 * (1 - s / (r * 2.2)); // the branch collar
		return r;
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - (ax.kind === 'spur' ? 0.6 : 0.2);
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx);
		if (isSeedling && t < 1.2) {
			// the seedling's stem: pale under the soil, the hypocotyl red, the stem above red-brown and green
			const hyp = BUSH.depth + SM.cotyledon.hypocotyl;
			const young = s < BUSH.depth ? mix('#ece4c8', '#d8c8a0', s / BUSH.depth) : s < hyp ? mix('#b8604a', '#a04838', (s - BUSH.depth) / SM.cotyledon.hypocotyl) : mix('#7a8a42', '#8a4a32', sun * 0.6 + clamp(t * 2) * 0.3);
			c.lerp(young, 1 - clamp((t - 0.5) / 0.7));
		}
		if (ax.kind === 'cane' && s < 0.03) c.lerp(named(SM.root.old), clamp((0.03 - s) / 0.02) * clamp(t - ax.born));
		return c;
	};
	const kind = R0 < 0.004 ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	if (kind === 'bark') metric(geo, total / 0.2, (Math.PI * 2 * Math.max(R0, 0.01)) / 0.2);
	bag.add(kind, geo);
}

/** the roots: the seedling's root going down, then a fibrous mat in the top half metre, and the rhizomes out to the
 * suckers (S1: "a massive root crown with horizontal and vertical rhizomes"; roots to 80 cm) */
function roots(bag, seed, t, base, stems) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.05, -1, 0.02),
		length: 0.8,
		grown: table(t, [[-0.01, 0], [0.0, 0.01], [0.01, 0.025], [0.05, 0.06], [0.3, 0.2], [1, 0.4], [3, 0.8], [6, 1]]),
		radius: 0.001 + 0.012 * span(t, 0.5, 7),
		down: 0.03,
		wander: 0.14,
		laterals: 8,
		lateral: 0.35,
		depth: 2,
		age: span(t, 0.2, 3),
		young: SM.root.young,
		old: SM.root.old,
	});
	const count = 9;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.1 + i * 0.35;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.01, -0.005 - rr() * 0.05, Math.sin(bear) * 0.01)),
			dir: v3(Math.cos(bear), -0.25 - rr() * 0.2, Math.sin(bear)),
			length: between(rr, 0.7, 1.2) * lerp(0.4, 1, clamp(t / 7)),
			grown: (t - born) / 4,
			radius: 0.0012 + 0.01 * span(t, born + 0.5, 7.5) * between(rr, 0.6, 1),
			down: 0.02,
			wander: 0.2,
			laterals: 7,
			lateral: 0.35,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.4) / 3,
			young: SM.root.young,
			old: SM.root.old,
			floor: -0.8,
		});
	}
	// the rhizomes: from the crown out under the soil to each sucker, 6–10 cm down, pale brown
	for (const st of stems) {
		if (!st.stem.sucker) continue;
		const r = chance(seed, 'rhizome', ...st.key);
		const end = st.pts[0].clone();
		const start = base.clone().add(v3(Math.cos(st.stem.az) * 0.04, -0.04, Math.sin(st.stem.az) * 0.04));
		const depth = -between(r, 0.06, 0.1);
		const pts = [];
		for (let k = 0; k <= 8; k++) {
			const u = k / 8;
			const p = start.clone().lerp(end, u);
			p.y = lerp(start.y, end.y, u) + Math.sin(u * Math.PI) * (depth + 0.03) + about(r, 0, 0.008);
			p.x += about(r, 0, 0.015) * Math.sin(u * Math.PI);
			p.z += about(r, 0, 0.015) * Math.sin(u * Math.PI);
			pts.push(p);
		}
		const age = clamp(t - st.born);
		bag.add('body', tube(pts, (u) => 0.0035 + 0.003 * age * (1 - 0.4 * u), (u) => mix(SM.root.old, '#9a7a5a', 0.4 + 0.4 * u), 6));
	}
}

/**
 * The seed leaves: two small ovals on the hypocotyl's top, pressed together in the seed coat as the hook comes up
 * (epigeal), opening flat in a few days, yellowing and gone by midsummer of the first year.
 */
function seedLeaves(bag, at, dir, t, seed) {
	const C = SM.cotyledon;
	const open = span(t, 0.012, 0.03);
	const gone = span(t, 0.22, 0.3);
	if (gone >= 1) return;
	const r = chance(seed, 'seed-leaves');
	const az = r() * Math.PI * 2;
	for (let k = 0; k < 2; k++) {
		const side = v3(Math.cos(az + k * Math.PI), 0, Math.sin(az + k * Math.PI));
		const up = lerp(1.45, 0.12, open) + gone * 0.4;
		const d = side.clone().multiplyScalar(Math.cos(up)).addScaledVector(dir, Math.sin(up)).normalize();
		const len = C.length * lerp(0.75, 1, open);
		const c = (u) => mix(mix(C.colour, '#c8c060', gone), '#c8d090', (1 - open) * 0.5 + u * 0.05);
		bag.add('leaf', sheet({ length: len, width: C.width * 0.5, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.7), lift: (u, v) => 0.08 * v * v - 0.04 * u * u, paint: c, back: (u) => mix(C.under, '#d0d098', gone), backLit: false, along: 8, across: 4 }), aim(at.clone().addScaledVector(side, 0.0004), d, 0));
	}
	bag.add('body', bead(at.clone().addScaledVector(dir, 0.0007), v3(0.0006, 0.0008, 0.0006), '#7a8a42', 3));
}

/**
 * A raceme on a short shoot's tip, through its season: the mixed bud swelling silver, the raceme pushing out with
 * its buds as the leaves unfold, 6–11 white flowers opening from the base up (2–3 cm, upright to spreading), petal
 * fall, nearly every flower setting (Smoky's clusters of 7–11), the berries swelling green on pedicels grown to a
 * centimetre and the raceme bending over under them, colouring unevenly berry by berry, ripe 56–63 days after bloom;
 * then picked by the birds or the grower.
 */
function raceme(bag, seed, key, at, dir, s, sunDir) {
	const R = SM.raceme;
	const r = chance(seed, 'raceme', ...key);
	const opens = 0.036 + about(r, 0, 0.007); // full bloom about the 14th of May
	const ph = s - opens;
	const n = R.flowers[0] + Math.floor(r() * (R.flowers[1] - R.flowers[0] + 1));
	if (s > 0.42) return; // the year's racemes are gone by autumn
	if (ph < -0.03) {
		bud(bag, at, dir, true, clamp((s + 0.02) / 0.03), r);
		return;
	}
	const days = ph * 365;
	if (days > RIPE_DAYS + 18) return; // picked
	const emerge = span(ph, -0.03, 0.0);
	const load = span(days, 4, 40);
	const out = dir.clone().setY(0);
	if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
	out.normalize();
	// upright and spreading in bloom; bending over as the berries weigh on it
	const up = lerp(1.25, 1.15, emerge) - load * 1.9;
	const axisDir = out.clone().multiplyScalar(Math.cos(up)).add(v3(0, Math.sin(up), 0)).normalize();
	const len = lerp(R.length * 0.35, R.length, emerge) + (R.fruiting - R.length) * load;
	const mid = at.clone().addScaledVector(axisDir, len * 0.5).add(v3(0, len * 0.12 * load * (1 - load), 0));
	const tip = at.clone().addScaledVector(axisDir, len).add(v3(0, -len * 0.18 * load, 0));
	const axCol = () => mix(R.axis, R.axisRipe, span(days, 40, 58));
	bag.add('body', tube([at, mid, tip], (u) => 0.0007 * (1 - 0.4 * u) * lerp(0.7, 1, load), axCol, 3));
	const along = (u) => {
		const a = 1 - u;
		return at.clone().multiplyScalar(a * a).addScaledVector(mid, 2 * a * u).addScaledVector(tip, u * u);
	};
	const sunHit = clamp(axisDir.dot(sunDir) * 0.5 + 0.5);
	for (let k = 0; k < n; k++) {
		const fr = chance(seed, 'flower', ...key, k);
		const u = n === 1 ? 1 : 0.14 + (0.86 * k) / (n - 1);
		const p = along(u);
		const side = across(axisDir).applyAxisAngle(axisDir, k * 2.39996 + fr() * 0.5);
		const fph = ph - k * 0.0015; // the lowest open first, the raceme open in about a week
		const open = span(fph, -0.012, 0.004);
		const fall = span(fph, 0.022, 0.034);
		const pedLen = lerp(R.pedicel[0], R.pedicel[1], k / Math.max(1, n - 1)) * lerp(0.35, 1, emerge) * lerp(1, 0.6, load) * about(fr, 1, 0.1);
		const sets = fr() < 0.82; // Smoky's clusters of 7–11 (S1, S14)
		if (fall < 1 || fph < 0.03) {
			// the flower on its pedicel, held up and out
			const pd = side.clone().multiplyScalar(0.8).addScaledVector(axisDir, 0.45).add(v3(0, 0.35, 0)).normalize();
			const fp = p.clone().addScaledVector(pd, pedLen);
			bag.add('body', tube([p, fp], () => 0.00035, () => SM.flower.pedicelColour, 3));
			if (open < 0.05) bag.add('body', bead(fp.clone().addScaledVector(pd, 0.0018), v3(0.0013, 0.0022, 0.0013), mix(SM.flower.cup, SM.flower.bud, emerge * 0.6), 3, new THREE.Quaternion().setFromUnitVectors(UP, pd)));
			else if (fall < 1) flower(bag, fp, pd.clone().lerp(UP, 0.25).normalize(), open, fall, fr, DETAIL.closeFlowers === true);
			if (fall < 1) continue;
		}
		if (!sets) continue;
		const d = (fph - 0.0) * 365;
		if (d < 0) continue;
		// the berry hangs from its pedicel, which bends down under it
		// grape-like: every berry out round the axis on its pedicel, hanging a little under its own weight
		const pd = side.clone().multiplyScalar(0.9).addScaledVector(axisDir, 0.25).add(v3(0, lerp(0.3, -0.25, load), 0)).normalize();
		const pe = p.clone().addScaledVector(pd, pedLen);
		const hang = pd.clone().add(v3(0, -0.9, 0)).normalize();
		const dd = d + about(fr, 0, 4) + (sunHit - 0.5) * 6;
		const fruitKey = [...key, k];
		if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit(fruitKey, pe, hang);
		const res = DETAIL.fruit === fruitKey.join('|');
		bag.add('body', tube(res ? [p, p.clone().lerp(pe, 0.3).add(v3(0, pedLen * 0.08, 0)), p.clone().lerp(pe, 0.65).add(v3(0, pedLen * 0.08, 0)), pe] : [p, pe], (uu) => 0.00034 + 0.00012 * uu, axCol, res ? 8 : 3));
		berry(bag, pe, hang, dd, sunDir, seed, fruitKey.join('|'));
		bag.fruitDone();
	}
}

/**
 * The whole serviceberry at time t (years from germination): the seed, the roots, the stems, and what the season puts
 * on them: leaves from late April, racemes of white flowers in mid May with the leaves half out, berries from set to
 * ripe in mid July, orange-red leaves in October.
 */
function serviceberry(t, seed) {
	const bag = new Bag();
	const { year, s } = seasonOf(t);
	const base = v3(0, -BUSH.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	// the seed, sown in autumn and chilled through the winter; its coat rides up on the seed leaves (epigeal) and drops
	if (t < 0.035) {
		const up = span(t, 0.0, 0.012);
		const split = span(t, -0.01, 0.004);
		if (t < 0.0) seedShape(bag, base.clone(), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.7, 0.3)), split, seed);
		else seedShape(bag, base.clone().lerp(v3(0, 0, 0), up), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.7, -Math.PI / 2 + 0.3)), 1, seed);
	}
	const { all, stems } = axes(seed, t, base.clone());
	roots(bag, seed, t, base.clone().add(v3(0, -0.002, 0)), stems);
	if (!stems.length) return bag.build();
	// the seedling comes up in a hook, its seed leaves held in the coat, and straightens as they open
	const seedling = stems[0].born === 0 ? stems[0] : null;
	if (seedling) {
		const hook = 1 - span(t, 0.008, 0.03);
		const pts = seedling.pts;
		if (hook > 0 && pts.length > 2) {
			const L = lengths(pts);
			const total = L[L.length - 1];
			const Lh = Math.min(0.008, total * 0.5);
			const s0 = total - Lh;
			const piv = pointAt({ pts, pathLen: L }, s0);
			const Rc = Lh / (hook * Math.PI * 0.95);
			const side = v3(1, 0, 0.3).normalize();
			for (let i = 0; i < pts.length; i++) {
				if (L[i] <= s0) continue;
				const ang = (L[i] - s0) / Rc;
				pts[i].copy(piv.at).addScaledVector(piv.dir, Rc * Math.sin(ang)).addScaledVector(side, Rc * (1 - Math.cos(ang)));
			}
			seedling.pathLen = null;
		}
	}
	for (const st of stems) thicken(st, t);
	for (const ax of all) wood(bag, ax, t, hashText(seed) % 997, sunDir);
	if (seedling && t < 0.3) {
		const hyp = BUSH.depth + SM.cotyledon.hypocotyl;
		const p = pointAt(seedling, Math.min(hyp, seedling.len ?? lengths(seedling.pts).at(-1)));
		const tip = seedling.pts[seedling.pts.length - 1];
		const d = t < 0.03 ? tip.clone().sub(seedling.pts[seedling.pts.length - 2]).normalize() : p.dir;
		seedLeaves(bag, t < 0.03 ? tip : p.at, d, t, seed);
		if (t < 0.035) {
			// the seed coat, carried up on the closed seed leaves
			const coat = tip.clone().addScaledVector(d, 0.002);
			if (t >= 0.0) seedShape(bag, coat, new THREE.Quaternion().setFromUnitVectors(v3(1, 0, 0), d), 1, seed);
		}
	}

	const leafy = s > 0.0 && s < 0.53;
	const fall = span(s, 0.36, 0.52); // the leaves colour through late September, fall through October
	const autumnBuds = s > 0.4;
	const flowering = (stem) => year >= BUSH.firstFlowers && !(stem.born >= year);
	// the bush's shade: how far out its wood reaches at each height (20 cm bands); a short shoot deep inside, under the
	// leaves of the face, is shaded out and bears nothing (a grown bush is leafy on its face, bare sticks inside)
	const reach = [];
	for (const ax of all) for (const p of ax.pts) {
		const b = Math.max(0, Math.floor(p.y / 0.2));
		reach[b] = Math.max(reach[b] ?? 0, Math.hypot(p.x, p.z));
	}
	const shaded = (p, r) => {
		if (year < 4) return false;
		const R = reach[Math.max(0, Math.floor(p.y / 0.2))] ?? 0;
		return Math.hypot(p.x, p.z) < 0.5 * R && p.y > 0.35 && r() < 0.6 * clamp((year - 3) / 2);
	};
	for (const ax of all) {
		if (ax.kind === 'spur') {
			const tip = ax.pts[ax.pts.length - 1];
			const dir = tip.clone().sub(ax.pts[ax.pts.length - 2]).normalize();
			const kr = chance(seed, 'spur', ...ax.key, year);
			if (shaded(tip, chance(seed, 'shade', ...ax.key))) continue;
			// a rosette of three to five leaves each spring, a raceme from the mixed bud between them
			if (leafy) {
				const n = 3 + Math.floor(kr() * 3);
				const ageL = clamp((s - 0.004) / 0.09); // half out at bloom
				for (let k = 0; k < n; k++) {
					const a = (k / n) * Math.PI * 2 + kr() * 0.6;
					const side = across(dir).applyAxisAngle(dir, a);
					const size = about(kr, 0.78, 0.1);
					const drop = between(kr, 0.55, 1);
					leaf(bag, tip.clone().addScaledVector(side, 0.0012), side.clone().addScaledVector(dir, 0.6).normalize(), size, ageL, fall >= drop ? 1 : fall * 0.6 / drop, kr);
				}
			}
			if (flowering(ax.stem) && kr() < 0.27) raceme(bag, seed, [...ax.key, year], tip.clone().addScaledVector(dir, 0.001), dir, s, sunDir);
			else if (autumnBuds) bud(bag, tip, dir, false, 0, kr);
			continue;
		}
		const tipRadius = Math.sqrt(ax.r2[ax.r2.length - 1]);
		const vigorous = ax.kind === 'cane' && ax.born > 0;
		for (const n of ax.nodes) {
			if (n.year !== year || t < n.formed) continue;
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const surf = n.at.clone().addScaledVector(side, Math.max(tipRadius, 0.0012));
			if (leafy) {
				const ageL = clamp((t - n.formed) / 0.09);
				// the seedling's first leaves small, larger node by node; a strong new cane's larger (to 6 cm)
				const scale = ax.kind === 'cane' && ax.born === 0 && year === 0 ? Math.min(1, 0.45 + 0.06 * n.i) : vigorous && year === Math.floor(ax.born) ? 1.2 : 1;
				const size = scale * about(nr, 1, 0.1);
				const drop = between(nr, 0.55, 1);
				leaf(bag, surf, side.clone().addScaledVector(n.dir, 0.5).normalize(), size, ageL, fall >= drop ? 1 : (fall * 0.6) / drop, nr);
			}
			if (autumnBuds) bud(bag, surf, side.clone().addScaledVector(n.dir, 1.2).normalize(), false, 0, nr);
		}
	}
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Twelve stages, from the seed to the bush in its autumn colour; `t` the years since germination each is grown at
 * (between two stages, on the way). The last six are one season of the bush's eighth year: bloom in mid May, ripe
 * berries about 60 days after (mid July), orange-red leaves in October.
 */
const STAGES = [
	{ name: 'Seed', t: -0.55, note: 'The seed, 4.5 × 2.3 × 1.5 mm, flattened, dark brown, about 5.5 mg, sown fresh about a centimetre deep in October and chilled through the winter (2–6 months of moist cold).' },
	{ name: 'Germination', t: 0.012, note: 'Early May: a reddish hypocotyl comes up bent in a hook, carrying the seed coat on its closed seed leaves (epigeal); the white root goes down.' },
	{ name: 'Seed leaves', t: 0.04, note: 'A week on: the hook straightened, two oval seed leaves 6–7 mm open flat on a red stem 2 cm tall, the coat dropped; the first true leaf in the bud between them.' },
	{ name: 'Seedling', t: 0.25, note: 'Three months up: about 10 cm, a red-brown stem with round leaves toothed at the tip, small at first, larger node by node; the seed leaves gone.' },
	{ name: 'One year', t: 0.35, note: 'Its first September: a single thin red-brown stem 30–35 cm tall. Smoky comes nearly true from seed.' },
	{ name: 'Young bush', t: 2.3, note: 'Its third summer: about 1.2 m, five to eight stems from the crown, red-brown when young and greying, the first sucker coming up beside it. No blossom yet.' },
	{ name: 'Blossom', t: 7.042, note: 'Eighth spring, mid May, the leaves half out: white starry flowers about 25 mm across, five strap-shaped petals, 6–11 on each upright raceme 3–4 cm long at the tips of the short shoots; a white cloud over a bush 2.4 m tall of some twenty stems.' },
	{ name: 'Fruit set', t: 7.08, note: 'Two weeks on: petals fallen, nearly every flower set, green fruitlets 3–4 mm crowned by their sepals; the leaves full grown, blue-green.' },
	{ name: 'Green berries', t: 7.12, note: 'Mid June: round green berries 8 mm in loose clusters of 7–11, the racemes bending over under them; the bush\'s new canes shooting up.' },
	{ name: 'Colouring', t: 7.168, note: 'Early July: the berries turn pink, red and red-purple, the sunny ones and the lowest of each cluster first; ripening is uneven.' },
	{ name: 'Ripe', t: 7.205, note: 'Mid July, about 60 days after bloom (56–63 at Edmonton): Smoky\'s berries 12 mm and about 1 g, deep purple-black under a pale waxy bloom, sweet (16–17 °Brix) with an almond note, in heavy clusters; the outer stems arch under them.' },
	{ name: 'Autumn', t: 7.45, note: 'Mid October: the leaves yellow, orange and orange-red before they fall; the year\'s shoots red-brown, the winter buds narrow and pointed.' },
];

/** the years since germination at a stage (0 … 11, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => serviceberry(timeAt(stage), `${seed ?? 'maia'}`);
const RIPE_STAGE = STAGES.findIndex((s) => s.name === 'Ripe');

/* ---- the fruit view: one berry on its own ---- */

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

/** the berries the bush bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false }, () => pickFruit(() => grow(RIPE_STAGE, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.9);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one berry at a stage, on its own: its stalk end at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant bears no fruit.');
	const { plant, fruits } = lite({ ...detailAt(1), fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none(stage > RIPE_STAGE ? 'The berries are picked: by autumn the birds have had them.' : 'This berry has not set yet.');
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
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: RIPE_STAGE, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] },
];

const PLANT = {
	id: 'serviceberry',
	label: "Serviceberry 'Smoky' · Amelanchier alnifolia",
	latin: "Amelanchier alnifolia (Nutt.) Nutt. ex M.Roem. 'Smoky' · Saskatoon berry, Saskatoon serviceberry, western serviceberry, juneberry",
	note: "The Saskatoon 'Smoky', selected for fruit in Alberta and released in 1952: a suckering bush of many stems from one crown, upright to arching, 2–2.5 m in its seventh or eighth year and 4–4.5 m when old; round blue-green leaves toothed only toward the tip; white starry flowers in short racemes in May with the young leaves; round purple-black berries 12 mm under a pale bloom, sweet, in clusters of 7–11, ripe in mid July; orange-red in autumn.",
	from: 'Bush · 8 years from seed',
	layer: 'shrub',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '0d8475b205781b85015ba245b1b29cbd8d2081c356aa4c6b1698c5e115e1a2e8', model: 'fal-ai/nano-banana-pro (edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right; plant-skill's data sheet for the serviceberry, S1–S23 ([EST] rows fitted)
	facts: {
		height: { at1: [0.3, 0.7], at3: [1.1, 1.4], at5: [1.6, 2.0], at7: [2.0, 2.5], at10: [2.8, 3.5], at15: [3.5, 4.2], grown: [4, 4.5], unit: 'm' },
		spread: { at3: [0.5, 0.8], at5: [1.2, 1.6], at7: [1.6, 2.4], at15: [3.5, 5], grown: [4.5, 6], unit: 'm' },
		stems: { at3: [5, 8], at7: [15, 25], grown: [25, 50], thickestBase: { at5: [0.022, 0.028], at7: [0.03, 0.04] }, suckersTo: 0.8, unit: 'count, m' },
		spacing: { inRow: [1, 1.5], betweenRows: [3.5, 6], unit: 'm' },
		shade: 'full sun for fruit; tolerates part shade as an understorey shrub, with fewer flowers',
		climate: 'cold-continental prairie and mountain west of North America, hardy to USDA zone 1–2 (flower buds to −50 to −60 °C, open flowers killed by frost); needs a long winter chill; light to medium well-drained soils',
		years: { firstFlowers: [3, 5], firstCrop: [3, 5], fullBearing: [7, 8], maxYield: [12, 15], productiveLife: [30, 50] },
		leaf: { length: [0.033, 0.047], width: [0.024, 0.036], petiole: [0.012, 0.018], veinPairs: [8, 13], leafOut: 'late April–early May', colour: 'late September–October', unit: 'm' },
		flower: { diameter: [0.022, 0.03], petal: [[0.009, 0.014], [0.0037, 0.0051]], perRaceme: [6, 11], raceme: [0.026, 0.043], bloom: 'mid–late May, 3–20 days', selfFertile: true, unit: 'm' },
		fruit: { diameter: [0.0112, 0.0128], mass: [0.0009, 0.0011], perCluster: [7, 11], seeds: 3.2, daysFromBloom: [56, 63], harvest: 'mid July', brix: [15.9, 17.4], unit: 'm, kg, days' },
		seed: { length: [0.0035, 0.005], mass: [0.004, 0.0125], chilling: [60, 180], depth: 0.01, germination: 'epigeal', unit: 'm, kg, days' },
		yield: { perPlant8to12: 4.6, perHectare: 6000, unit: 'kg' },
		diseases: 'saskatoon-juniper rust (orange spots and horned galls on leaves and fruit), entomosporium leaf and berry spot, Cytospora canker on old stems, fire blight',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one berry) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? RIPE_STAGE, `${seed ?? 'maia'}`) : () => grow(stage ?? RIPE_STAGE, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'serviceberry' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'serviceberry',
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
module.exports.organs = { SM, LEAF_W, FRUIT_W, seedShape, leaf, flower, berry, berryGeometry, raceme, bud, Bag, timeAt, serviceberry, axes, stemsOf, thicken, fruitSize, skinAt, surface, lite, detailAt, grow, STAGES, DETAIL };
