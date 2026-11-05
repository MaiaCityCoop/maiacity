'use strict';
/*
 * MULBERRY 'BLACK' — Morus nigra L. (Moraceae), the black mulberry: the garden mulberry of Europe, the old tree of
 * English lawns and college gardens ('Chelsea' / 'King James', planted under James I for silk) and of the villages of
 * Anatolia and Persia. Version 2 of plants/mulberry: one named kind, grown from a hardwood cutting on its own roots to
 * a tree of 25 years in its August, its fruit ripening green, red and black at once.
 *
 * Why the species and no clone: no named clone ('Chelsea', 'King James', 'Wellington') has published measurements,
 * and the species is all but one clone (359 accessions from Anatolia and Iran identical at 15 SSR loci), so its
 * measured numbers are the clone's. Its numbers are the data sheet's (plant-skill references/mulberry-black.md):
 * the floras (Flora of China, PROSEA, Trees and Shrubs Online), the measured Turkish trees and fruit (Tokat: fruit
 * 25.6 × 17.5 mm, 2.6 g, 28 drupelets, first ripe 50 days after set, its growth week by week; Eğirdir and Sütçüler:
 * 3.1–5.7 g, 22–27 × 15–17 mm; the catkins measured on 122 trees), the RHS for 'King James', and measured old trees
 * for size by age; estimates are marked there.
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (a8e1d37d…): its leaf outline and colours traced off its panels. Where the
 * plate is wrong against the data sheet (its fruit drawn 1.77 : 1 for a measured 1.46, its female catkins long
 * bottle-brushes, a taproot under the cutting, the young tree on a tall clean stem), the data sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from banana v2 as plum v2 has it (mipmapped pictures, parsed colours,
 *                   leaves with their own underside), with the mulberry's materials and its surfaces: small
 *                   pictures made from noise (the leaf's fanned veins and roughness, the old bark's furrows).
 *   2. ORGANS       the mulberry's own, each to its measure: bark, leaf (heart-shaped or lobed), bud, male catkin,
 *                   the fruit of drupelets from catkin to black.
 *   3. THE TREE     its axes year by year (a short trunk, crooked spreading limbs, short fruiting shoots), held in its
 *                   crown by age, its lean, its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from the cutting's first spring (t = 0 its buds breaking, mid May); a
 * year's season `s` 0 … 1 from bud break round to the next.
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
		// the mulberry's: thousands of leaves and fruit, so a crowd keeps fewer of them, each grown more
		[0.1, 0.05, 2.2, 0.01],
		[0.25, 0.15, 1.75, 0.006],
		[0.5, 0.4, 1.3, 0.0025],
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
 * plates of old bark, the furrows of old bark. Laid on by the shape's UVs (a leaf's own, the bark's in metres: `metric`),
 * mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); the mulberry has no bump
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
 *                        midrib at v = ½): the mulberry's veins, three to five main veins fanning from the base (the
 *                        lowest pair running out into the basal lobes) and four to six pinnate pairs above them, all
 *                        sunk into the blade and a little paler than it, the net between them fine; and the blade's
 *                        roughness, short stiff hairs as a fine speckle (the sheet's leaf: dull, sandpaper-rough)
 *   barkMap              0.25 m square of old mulberry bark, laid on in metres: long, deep, wandering furrows up the
 *                        trunk between grey-brown ridges that split into flakes; the furrows dark (their rust-orange
 *                        colour is the vertex colour's: the sheet's old-trunk swatch)
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(256, 256, (x, y) => {
				// x along the blade (0 at the stalk), y across (½ the midrib)
				const side = Math.abs(y - 0.5) * 2;
				const mid = Math.exp(-Math.pow((y - 0.5) / 0.011, 2)) * smooth((0.96 - x) / 0.1);
				// the basal fan: veins from the stalk at about 35° and 65° from the midrib, out into the lobes
				const fanA = Math.exp(-Math.pow((side - x * 2.2) / 0.035, 2)) * smooth((0.42 - x) / 0.12);
				const fanB = Math.exp(-Math.pow((side - x * 5.5) / 0.05, 2)) * smooth((0.2 - x) / 0.08);
				// the pinnate pairs above, leaving at ~45° and arching toward the tip
				const slant = side * 0.5 + 0.2 * side * side;
				const phase = (x - 0.18) * 6.5 - slant * 1.0;
				const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), 34) * smooth((0.92 - side) / 0.1) * smooth((x - 0.2) / 0.06) * smooth((0.95 - x) / 0.08);
				const c = tileCells(x, y, 22, 16, 7);
				const net = smooth((0.07 - (c.f2 - c.f1)) / 0.05);
				const rough = tileNoise(x, y, 90, 5, 2) - 0.5;
				const mottle = tileNoise(x, y, 14, 3) - 0.5;
				const vein = Math.max(mid, fanA * 0.9, fanB * 0.7, sec * 0.8);
				// the veins pale yellow-green (the sheet's leaf), the areoles between a little darker and quilted
				const k = 0.9 + 0.04 * net + 0.07 * rough + 0.05 * mottle;
				return [k + 0.55 * vein, k * 1.02 + 0.5 * vein, k * 0.9 + 0.22 * vein];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x round the trunk, y up it (0.25 m): furrows wandering up it, ridges 2–4 cm wide and long, flaking
				const w = tileNoise(x, y, 4, 61, 2) - 0.5;
				const c = tileCells(x + w * 0.12, y, 9, 3, 63);
				const furrow = smooth((0.1 - (c.f2 - c.f1)) / 0.08);
				const flake = tileNoise(x, y, 26, 65, 3, 8) - 0.5;
				const k = (0.82 + 0.22 * c.id + 0.25 * flake) * lerp(1, 0.55, furrow);
				return [k, k * 0.97, k * 0.94];
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
 * The materials, made once, plain and with their surfaces. `bark` thick wood, matt, its furrows; `twig` young wood,
 * downy and dull; `leaf` a leaf's two faces (one-sided, each its own colour), rough and dull, no clearcoat; `berry` the
 * fruit, glossy and wet (a little clearcoat: it is the one shiny thing on the tree); `sheet` thin things seen from both
 * sides (catkin scales, stipules); `body` buds, stalks, catkins, the cutting, roots.
 */
const MATERIALS = {
	// colour pictures only, no bump: a bump picture's normal is NaN wherever a triangle stands edge-on or shrinks under a
	// pixel on screen (three's perturbNormalArb), and a dense tree of small triangles finds such a pixel from somewhere
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
	// no clearcoat on leaves (a crown of them goes white at a grazing angle); a rough, hairy blade
	leaf: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, ...(s && { map: s('leafMap') }) }),
	berry: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.22 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'berry', 'prop'];
// a mulberry has some fifteen thousand leaves: a crowd far off draws a share of them, each grown to fill the gap
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
 * 2. ORGANS — the black mulberry's own, each to its measure
 * ============================================================================================================== */

/**
 * The black mulberry's numbers. Sizes in metres from the data sheet (plant-skill references/mulberry-black.md: the
 * floras, the measured Turkish trees and fruit; the species is all but one clone, so its numbers are the clone's);
 * outlines and colours traced off its reference sheet (play file a8e1d37d…, Nano Banana Pro, 2026-11-05, sheet 2) with
 * plant-skill's trace.py, as the sheet's sRGB medians.
 */
const MN = {
	// the hardwood cutting: last year's shoot, 25–30 cm × 12–18 mm, set upright with its top 5 cm out of the soil
	cutting: { length: 0.27, above: 0.05, radius: 0.0075, cut: '#e6d39a' },
	// leaf: 10–14 × 9–12 cm on the bearing tree (FoC 6–12(–20) × 7–11; Tokat 15 × 14); the sheet's blade 1.24 : 1, the
	// data sheet's 1.0–1.2: kept at 1.2; stalk 1.5–2.5 cm; colours the sheet's upper side, underside, the leafing
	// crown (May) and the autumn leaf
	leaf: { length: 0.12, width: 0.1, petiole: 0.02, sinus: 0.1, top: '#4e623b', topDark: '#435331', under: '#8e9873', vein: '#a4ab78', young: '#b7b862', youngUnder: '#cfd0a0', autumn: '#e2c232', autumnLate: '#c9982a', petioleColour: '#8f9a52' },
	// male catkin: 23–43 × 5–8 mm on a 5–11 mm stalk [SP, S11]; the sheet's cream-green, yellow anthers
	male: { length: 0.033, width: 0.0068, stalk: 0.008, colour: '#b6aa88', light: '#d7d49d', anther: '#d8c46a', withered: '#7d6c48' },
	// fruit: 23–27 × 16–18 mm, 3.5–5 g, almost stalkless (3–7 mm) [SP, S9, S12, S13]; 'Chelsea' "very large": the upper
	// part of the range. Drupelets: 15–28 counted (S9, S10), 13.5–52 flowers to a female catkin (S11; a mean of 33,
	// Koyuncu & Vural): 34, the flowers' mean, each some 5 mm (the sheet draws more and smaller)
	fruit: { length: 0.026, width: 0.0178, stalk: 0.005, drupelets: 34, stalkColour: '#7f8e3a' },
	// the fruit's colour by its age: the sheet's five fruit (traced medians), the data sheet's order green → whitish →
	// pink → red → black-purple
	skin: { young: '#6f7a26', green: '#838228', pale: '#a8a63e', white: '#d9cfa2', pink: '#d58d6c', red: '#8c1a27', dark: '#4a0f20', ripe: '#26151d', stigma: '#ecebdc', stigmaDry: '#3a2a22', flesh: '#8e163e', core: '#d8d2b2' },
	// bark traced off the sheet's three swatches: a one-year shoot, ten-year wood, the old trunk (its furrows rust)
	bark: { shoot: '#858666', shootShade: '#706d49', young: '#857b6e', youngDark: '#6e6358', lenticel: '#b98a5e', old: '#806a5b', oldDark: '#3e3128', ridge: '#8c7e72', fissure: '#8e5a36', bud: '#2a1d1a' },
	root: { young: '#efe6cf', old: '#7a5434' },
};

/**
 * The leaf's outline: half-widths along the blade (0 at the base of its basal lobes … 1 at the tip, parts of its
 * greatest width), traced off the sheet's grown leaf (upper side) without its stalk: broadly heart-shaped, widest a
 * third of the way up, the basal lobes rounded, narrowing straight to a short point.
 */
const LEAF_W = [0.03, 0.59, 0.71, 0.76, 0.8, 0.89, 0.9, 0.95, 0.96, 1, 0.99, 0.99, 0.98, 0.94, 0.91, 0.89, 0.83, 0.79, 0.74, 0.69, 0.62, 0.57, 0.49, 0.42, 0.35, 0.24, 0.13, 0.07, 0.04, 0];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- bark ---- */

/**
 * Mulberry bark by the age (years) and radius (m) of the wood, at a place on it (`v` round it, `s` along it, `sun`
 * 0 … 1 how much it faces the light): this year's shoot grey-green and downy with pale lenticels; wood of a few years
 * smooth grey-brown with orange-brown lenticel dashes drawn out along it (the sheet's ten-year swatch); old wood
 * furrowed deep, grey-brown ridges flaking, the furrows rust-orange (the old-trunk swatch).
 */
const BARK_K = { across: 26, along: 3.2 }; // ridges ~3–4 cm across and long up the trunk
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 30, s * 6, cz * 30, 2, ns + 5) - 0.5) * 1.2;
	const c = cells(cx * BARK_K.across + w, s * BARK_K.along + w * 0.4, cz * BARK_K.across - w, ns + 3);
	const flake = fbm(cx * 120, s * 30, cz * 120, 2, ns);
	return { ridge: c.edge, plate: 0.55 * c.id + 0.45 * flake, cx, cz };
}
const old = (r) => clamp((r - 0.02) / 0.04);
function barkColour(age, r, v, s, sun, ns) {
	const B = MN.bark;
	if (age < 0.6) return mix(B.shootShade, B.shoot, 0.3 + 0.7 * sun);
	const { ridge, plate, cx, cz } = barkPattern(r, v, s, ns);
	const c = mix(B.young, B.youngDark, 0.3 + 0.5 * fbm(cx * 60, s * 8, cz * 60, 2, ns + 11));
	// orange-brown lenticel dashes, drawn out along the young wood (the sheet's ten-year swatch)
	const ln = noise3(cx * 260, s * 70, cz * 260, ns + 7);
	const o = old(r);
	c.lerp(named(B.lenticel), smooth((ln - 0.78) / 0.06) * 0.8 * (1 - o) * clamp((age - 0.6) / 1.5));
	if (o > 0) {
		const fissure = smooth((0.07 - ridge) / 0.05);
		const bark = mix(B.oldDark, B.ridge, 0.25 + 0.75 * plate);
		c.lerp(bark, smooth(o * 1.3));
		// the furrows: rust-orange in their depth, dark at their lips
		c.lerp(named(B.fissure), fissure * o * 0.85);
		c.lerp(named(B.oldDark), smooth((0.13 - ridge) / 0.05) * (1 - fissure) * o * 0.5);
		// green algae on the shaded side low down
		c.lerp(named('#5f6a48'), clamp(0.25 - Math.sin(v * Math.PI * 2)) * o * 0.35 * clamp(1 - s / 2));
	}
	return c;
}
function barkRelief(r, v, s, ns) {
	const o = old(r);
	if (o <= 0) return 0;
	const { ridge, plate } = barkPattern(r, v, s, ns);
	return o * (-0.13 * smooth((0.14 - ridge) / 0.11) + 0.035 * (plate - 0.5));
}

/* ---- the leaf ---- */

/**
 * Its outline: the traced half-widths, deepened into two to four lobes on a vigorous young shoot (`lobed` 0 … 1, the
 * sheet's lobed leaf: a sinus a third and another three fifths up), and close up the margin's coarse blunt teeth,
 * some 28 a side on a 12 cm blade (the data sheet: 25–40, 3–5 mm wide).
 */
const leafShape = (lobed, teeth) => (u) => {
	let w = along(LEAF_W, teeth ? u : Math.max(u, 0.04));
	if (lobed > 0) w *= 1 - lobed * (0.62 * Math.exp(-Math.pow((u - 0.4) / 0.05, 2)) + 0.5 * Math.exp(-Math.pow((u - 0.66) / 0.045, 2)));
	if (!teeth || u < 0.05 || u > 0.97) return w;
	// each tooth's tip forward (toward the leaf's tip), its back edge steep
	const tooth = Math.pow((u * 28) % 1, 1.8);
	return w * (1 + 0.06 * tooth) + 0.006 * tooth;
};

/**
 * One leaf: its short stout stalk from the node, then the blade, its heart-shaped base notched round the stalk (the
 * sinus, a tenth of its length), held out flat with the tip a little down; dull dark green and rough above (its veins
 * in its surface picture), grey-green and downy below with its own normals; young leaves pale yellow-green, soft and
 * hanging; in autumn clear yellow, then gone. `age` 0 … 1 from bud to grown, `fall` 0 … 1, `lobed` 0 … 1.
 */
function leaf(bag, at, dir, size, age, fall, r, lobed = 0, close = false, flat0 = false, drawStalk = true, fine = false) {
	const L = MN.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const grown = smooth(age);
	const len = L.length * size * lerp(0.22, 1, grown);
	const petLen = L.petiole * size * lerp(0.4, 1, grown) * (lobed > 0 ? 1.6 : 1);
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = flat0 ? 0 : lerp(0.9, about(r, 0.35, 0.25), smooth(age * 1.4));
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const end = at.clone().addScaledVector(pd, petLen).add(v3(0, -petLen * 0.08, 0));
	const hue = r();
	const autumn = (u) => mix(mix(L.autumn, '#d6c84a', hue * 0.5), L.autumnLate, clamp(fall * 1.4 - 0.5 + u * 0.2));
	const young = 1 - smooth(age * 1.15);
	// the stalk: 2 cm, seen only near (a young plant, a close look); on a grown tree's crown it is not drawn
	if (close || drawStalk) bag.add('twig', tube(close ? [at, at.clone().lerp(end, 0.5).add(v3(0, petLen * 0.05, 0)), end] : [at, end], (u) => 0.0012 * size * (1 - 0.25 * u) * lerp(0.5, 1, grown), () => (fall > 0.2 ? autumn(0) : mix(L.petioleColour, L.young, young * 0.6)), close ? 6 : 3));
	// grown leaves turn every way to the light: some flat, many tilted steeply (a crown seen from the side shows them)
	const droop = flat0 ? 0 : lerp(-0.9, about(r, -0.3, 0.55), smooth(age * 1.3)) - fall * 0.35;
	const bd = flat.clone().applyAxisAngle(UP, flat0 ? 0 : about(r, 0, 0.3)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = flat0 ? 0 : lerp(0.55, about(r, 0.1, 0.05), grown);
	const curl = flat0 ? 0 : about(r, 0.1, 0.05);
	const ns = Math.floor(r() * 1000);
	const top = (u, v) => {
		const c = mix(L.top, L.young, young * 0.95);
		c.lerp(named(L.topDark), clamp((noise3(u * 3, v * 2, ns, 3) - 0.45) * 1.5) * 0.45 * (1 - young));
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3 - Math.abs(v) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, L.youngUnder, young * 0.8);
		if (Math.abs(v) < 0.06) c.lerp(named('#b4ba92'), 0.35);
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3));
		return c;
	};
	// the rows crowded toward the base, where the outline turns (few rows far off: they fall where it is widest)
	const rows = close || fine ? (u) => u : (u) => Math.pow(u, 1.45);
	const outline = leafShape(lobed, close || fine);
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: (u) => outline(rows(u)),
		lift: (u, v) => fold * Math.abs(v) * 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.012 * Math.sin(u * 9 + v * 4) * v * v,
		paint: top,
		back: under,
		backLit: false, // its own normals: seen from below it is its underside, not the sky
		along: close ? 48 : fine ? 18 : drawStalk ? 4 : 3,
		across: close ? 16 : fine ? 6 : 2,
	});
	// the heart-shaped base: the midline pulled up to the sinus, the basal lobes left round below it
	const sinus = len * L.sinus;
	const pos = blade.attributes.position, uv = blade.attributes.uv;
	for (let i = 0; i < pos.count; i++) {
		const v = Math.abs(uv.getY(i) * 2 - 1);
		const x = rows(pos.getX(i) / len) * len;
		uv.setX(i, x / len);
		pos.setX(i, x + sinus * Math.pow(1 - v, 1.5) * Math.max(0, 1 - x / (len * 0.35)));
	}
	blade.computeVertexNormals();
	blade.applyMatrix4(new THREE.Matrix4().makeTranslation(-sinus, 0, 0));
	bag.add('leaf', blade, aim(end, bd, flat0 ? 0 : about(r, 0, 0.85)));
}

/* ---- buds ---- */

/** a winter bud: large, ovoid, pointed, nearly black, scaly (the sheet's winter twig), swelling green in May */
function bud(bag, at, dir, swell, r) {
	const s = lerp(0.0028, 0.0042, swell);
	const col = mix(MN.bark.bud, '#8a9a48', clamp(swell * 1.4 - 0.3));
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	bag.add('body', bead(at.clone().addScaledVector(dir, s * 0.9), v3(s * 0.62, s * 1.15, s * 0.62), col, DETAIL.fruit ? 4 : 2, q));
}

/* ---- catkins ---- */

/**
 * A male catkin: a hanging cylinder 2.5–4 cm long on a short stalk, its tiny flowers packed round it (bumps), cream-
 * green, the stamens springing out yellow as it sheds pollen; then it browns and drops. `days` since bud break.
 */
function maleCatkin(bag, at, dir, days, r, close = false) {
	const M = MN.male;
	const grow = span(days, 2, 16);
	const shed = span(days, 16, 26);
	const gone = days > 34;
	if (grow <= 0.02 || gone) return;
	const L = M.length * lerp(0.3, 1, grow) * about(r, 1, 0.12);
	const hang = dir.clone().multiplyScalar(0.3).add(v3(0, -1, 0)).normalize();
	const p0 = at.clone();
	const p1 = p0.clone().addScaledVector(dir, M.stalk * 0.6).addScaledVector(hang, M.stalk * 0.4);
	const pts = [p0, p1];
	const n = close ? 60 : 3;
	for (let k = 1; k <= n; k++) pts.push(p1.clone().addScaledVector(hang, (L * k) / n).add(v3(about(r, 0, 0.002) * (k / n), 0, about(r, 0, 0.002) * (k / n))));
	const ns = Math.floor(r() * 999);
	const wither = clamp((days - 26) / 8);
	bag.add('body', tube(pts, (u, v, s) => {
		if (s < M.stalk * 0.9) return 0.0007;
		const w = (M.width / 2) * lerp(0.6, 1, grow) * (1 - 0.3 * wither) * Math.sin(Math.PI * clamp((s - M.stalk * 0.8) / (L * 1.05) + 0.06)) ** 0.35;
		// close up its little flowers, packed round it in a spiral, each a knob
		return close ? w * (1 + 0.28 * (0.45 - cells(Math.cos(v * 6.283) * 4.2, s * 620, Math.sin(v * 6.283) * 4.2, ns).f1)) : w;
	}, (u, v, s) => {
		if (s < M.stalk * 0.9) return MN.fruit.stalkColour;
		const c = mix(M.colour, M.light, 0.5 + 0.5 * noise3(v * 9, s * 600, 0, ns));
		// each flower's centre a darker green dot (the sheet's male catkin)
		if (close) c.lerp(named('#7f8440'), 0.55 * smooth((0.28 - cells(Math.cos(v * 6.283) * 4.2, s * 620, Math.sin(v * 6.283) * 4.2, ns).f1) / 0.12));
		c.lerp(named(M.anther), shed * 0.5 * noise3(v * 13, s * 900, 3, ns));
		return c.lerp(named(M.withered), wither);
	}, close ? 28 : 4, true));
}

/* ---- the fruit (the female catkin grown) ---- */

/**
 * How big a fruit is, its length and width as parts of the ripe ones, by `q` its age over its days to ripe: the
 * Tokat genotype's weekly means (S9: 14.1 × 8.6 mm a week after set, 15.0 × 9.1, 16.1 × 7.8, 17.9 × 9.2, 16.5 × 10.8,
 * 22.9 × 13.2, ripe 25.6 × 17.5 at 50 days), a double sigmoid: a slow middle, a steep final swell. Before set (`q` <
 * 0) the green catkin, 1 cm and growing.
 */
function fruitSize(q) {
	return {
		long: straight(q, [[-0.3, 0.22], [0, 0.48], [0.14, 0.55], [0.28, 0.59], [0.42, 0.63], [0.58, 0.68], [0.72, 0.78], [0.86, 0.89], [1, 1]]),
		wide: straight(q, [[-0.3, 0.3], [0, 0.45], [0.14, 0.49], [0.28, 0.5], [0.42, 0.52], [0.58, 0.56], [0.72, 0.65], [0.86, 0.75], [1, 1]]),
	};
}

/**
 * A drupelet's colour by `dr` days from the day its fruit is ripe (negative before): green while it swells, in the
 * last fortnight pale green-white, then pink, red, dark red, and purple-black (the sheet's five fruit; the data
 * sheet's order and timing, S5, S7, S19).
 */
function skinAt(dr, young = 0) {
	const K = MN.skin;
	if (dr < -15) return mix(K.green, K.young, young);
	if (dr < -11) return mix(K.green, K.pale, (dr + 15) / 4);
	if (dr < -8) return mix(K.pale, K.white, (dr + 11) / 3);
	if (dr < -6) return mix(K.white, K.pink, (dr + 8) / 2);
	if (dr < -4) return mix(K.pink, K.red, (dr + 6) / 2);
	if (dr < -1.5) return mix(K.red, K.dark, (dr + 4) / 2.5);
	return mix(K.dark, K.ripe, (dr + 1.5) / 1.5);
}

/**
 * The fruit's drupelets: `n` of them (the data sheet's 15–28, so each large) laid in a loose spiral over the
 * fruit's surface between its ends, each at (u along the fruit 0 … 1 from the stalk, φ round it), with its own chance
 * of ripening a day or two before or after its neighbours.
 */
function drupelets(n, ns) {
	const r = chance(ns, 'drupelets');
	const list = [];
	for (let i = 0; i < n; i++) {
		const u = 0.07 + 0.86 * ((i + 0.5) / n) + about(r, 0, 0.012);
		list.push({ u, ph: i * 2.39996 + about(r, 0, 0.12), lag: about(r, 0, 1.4) });
	}
	return list;
}

/**
 * One mulberry: a short fat cylinder blunt at both ends (length to width 1.46 : 1, the data sheet's; the sheet draws
 * it longer, 1.77), built hanging from the origin down −Y, of large rounded drupelets each tipped by its stigma's
 * remains; coloured drupelet by drupelet, the sunny side ahead. `age` days since its flowering, `R` its days to ripe,
 * `sun` the light in the fruit's own frame. With `res` as finely as the fruit view needs.
 */
function mulberryGeometry(o) {
	const { H, W, age, R, sun, ns, res } = o;
	const rings = res ? 120 : fewer(5, 4);
	const sides = res ? 100 : fewer(5, 4);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const D = drupelets(MN.fruit.drupelets + Math.round(about(chance(ns, 'n'), 0, 3)), ns);
	const dr = age - R;
	const young = clamp(1 - age / (R * 0.5));
	const cell = Math.sqrt((Math.PI * W * H) / D.length); // a drupelet's size on the fruit (m)
	const bump = W * 0.14 * clamp(0.5 + age / R);
	const sunny = (ph, u) => Math.max(0, v3(Math.cos(ph), 0.3 - u * 0.6, Math.sin(ph)).normalize().dot(sun));
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((i / rings) * Math.PI)) / 2; // rings crowded toward the ends, so they close round
		// blunt at both ends: a superellipse, its stalk end a little broader than its tip
		const e = Math.abs(2 * u - 1);
		const prof = Math.pow(Math.max(0, 1 - Math.pow(e, 3.2)), 1 / 3.2) * (1 + 0.04 * (1 - u) - 0.04 * u);
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			let rr = prof;
			let c;
			if (res) {
				// the nearest drupelet and the next: rounded beads with grooves between them
				let f1 = 9, f2 = 9, best = null;
				for (const d of D) {
					let dp = Math.abs(ph - d.ph) % (Math.PI * 2);
					if (dp > Math.PI) dp = Math.PI * 2 - dp;
					const dd = Math.hypot((u - d.u) * H, dp * (W / 2) * Math.max(0.3, prof));
					if (dd < f1) (f2 = f1), (f1 = dd), (best = d);
					else if (dd < f2) f2 = dd;
				}
				// each drupelet a round bead (a cap of a ball), the grooves between them where the beads end
				const k = clamp(f1 / (cell * 0.5));
				const groove = smooth(clamp((f2 - f1) / (cell * 0.28)));
				rr = prof - (bump / (W / 2)) * 0.5 + (bump / (W / 2)) * Math.sqrt(Math.max(0, 1 - k * k)) * lerp(0.6, 1, groove) * Math.pow(Math.sin(Math.PI * clamp(u * 1.05 - 0.02)), 0.3);
				// each drupelet a day or so ahead or behind, the sunny side ahead; all alike once the fruit is ripe
				c = skinAt(dr + (best.lag + sunny(ph, u) * 1.5) * clamp(0.3 - dr / 5), young);
				// the drupelet's crown a little lighter, its sides into the groove darker
				c.multiplyScalar(lerp(0.72, 1.06, Math.sqrt(Math.max(0, 1 - k * k))));
			} else c = skinAt(dr + (sunny(ph, u) * 1.5 + 2 * (noise3(Math.cos(ph) * 2, u * 3, Math.sin(ph) * 2, ns) - 0.5)) * clamp(0.3 - dr / 5), young);
			// while it flowers its white stigmas stand out all over it: far off, a pale fuzz in its colour
			if (!res) c.lerp(named(MN.skin.stigma), 0.55 * span(age, -4, 0) * (1 - span(age, 5, 11)));
			const x = (W / 2) * rr * Math.cos(ph);
			const z = (W / 2) * rr * Math.sin(ph);
			pos.push(x, -H * u, z);
			nor.push(0, 0, 0);
			uv.push(j / sides, u);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	const g = made(pos, nor, uv, col, idx, true);
	if (!res) return g;
	// close up: each drupelet's stigma, white and long while it flowers, then dry and dark, a short bristle
	const parts = [g];
	const fresh = 1 - span(age, 6, 14);
	for (const d of D) {
		const u = d.u, e = Math.abs(2 * u - 1);
		const prof = Math.pow(Math.max(0, 1 - Math.pow(e, 3.2)), 1 / 3.2);
		const n = v3(Math.cos(d.ph), (0.5 - u) * 0.8, Math.sin(d.ph)).normalize();
		const base = v3((W / 2) * (prof + (0.45 * bump) / (W / 2)) * Math.cos(d.ph), -H * u, (W / 2) * (prof + (0.45 * bump) / (W / 2)) * Math.sin(d.ph));
		const L = lerp(0.0007, 0.0028, fresh);
		const r2 = chance(ns, 'stigma', d.ph);
		for (let k = 0; k < 2; k++) {
			const dir = n.clone().multiplyScalar(lerp(0.35, 1, fresh)).add(v3(about(r2, 0, 0.6), about(r2, 0, 0.6), about(r2, 0, 0.6))).normalize();
			const tip = base.clone().addScaledVector(dir, L);
			parts.push(tube([base, base.clone().lerp(tip, 0.5).addScaledVector(dir, 0.0002), tip], (q) => 0.00014 * (1 - 0.6 * q) * lerp(1, 1.5, fresh), () => mix(MN.skin.stigmaDry, MN.skin.stigma, fresh), 3));
		}
	}
	const merged = mergeGeometries(parts);
	for (const p of parts) p.dispose();
	return merged;
}

/**
 * A fruit on its short shoot, from `at` along `dir` (mostly down): its short stalk, the fruit at its end. From the
 * green catkin among the new leaves (its white stigmas out while it flowers) to the ripe black fruit, which falls a
 * few days after it is ripe. `days` since bud break; the catkin flowers at `df` and is ripe `R` days after.
 */
function mulberry(bag, at, dir, days, df, R, sunWorld, seed, key) {
	const F = MN.fruit;
	const age = days - df;
	if (days < 3) return null;
	const r = chance(seed, 'fruit', key);
	const k = about(r, 1, 0.07);
	const sz = fruitSize(age / R);
	const H = F.length * sz.long * k * clamp(days / 12, 0.4, 1), W = F.width * sz.wide * k * about(r, 1, 0.03) * clamp(days / 12, 0.4, 1);
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, r() * Math.PI * 2));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const res = DETAIL.fruit === key;
	const stalk = F.stalk * lerp(0.6, 1, clamp(days / 30)) * about(r, 1, 0.2);
	bag.add('body', tube(res ? [v3(0, 0, 0), v3(0.0005, -stalk * 0.5, 0), v3(0, -stalk, 0)] : [v3(0, 0, 0), v3(0, -stalk, 0)], (u) => 0.0007 + 0.0003 * u, () => F.stalkColour, res ? 8 : 3), m);
	if (DETAIL.level < 0.5 && !res) {
		// a crowd far off: each fruit a small bead of its colour, thinned with the others
		bag.add('berry', bead(v3(0, -stalk - H * 0.5, 0), v3(W / 2, H / 2, W / 2), skinAt(age - R), 2), m);
		return { H, W };
	}
	const g = mulberryGeometry({ H, W, age, R, sun, ns: hashText(key) % 991, res });
	g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -stalk + 0.0006, 0));
	bag.add(age > 0 ? 'berry' : 'body', g, m);
	return { H, W };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A black mulberry from a hardwood cutting, on its own roots, on a lawn, hardly
 * pruned. No shoot of a mulberry keeps its tip: each summer the soft tip dies back and the top side bud takes the lead
 * the next spring (sympodial), so every axis zigzags and the crown is crooked and gnarled. The leader stops leading
 * after its third or fourth year: four to six limbs leave a short trunk between 0.85 and 1.5 m and spread out, their
 * side shoots set in two rows and spreading too, so the crown is a low dome wider than tall, its lowest limbs sagging
 * toward the ground. Short shoots crowd the older wood and carry the fruit. Its size by age is held to the data
 * sheet's (an envelope it does not grow out of: `CROWN`), its girth by the pipe model calibrated to its trunk.
 */
const TREE = {
	internode: 0.045,
	tipRadius: 0.0019,
	spurRadius: 0.003,
	pipeLength: 2.4e-7,
	leader: [0.37, 0.78, 0.42, 0.28], // the leader's extension in its first four years (m); then it is one limb of many
	shoot: [0, 0.8, 0.55, 0.4, 0.28, 0.2, 0.15], // a side axis's first year by its order (1 the limbs), at vigour 1
	fade: [1, 0.86, 0.74, 0.64, 0.56, 0.5, 0.45, 0.41, 0.38, 0.35, 0.33, 0.31, 0.3],
	forkLow: 0.75, // the limbs leave the trunk between these heights (m above the soil)
	forkHigh: 1.5,
	firstFruit: 3, // 'Chelsea' "crops from a young age": a few fruit in its fourth summer from the cutting
	cell: 0.4, // the crowding grid (m)
	tips: 4, // at most this many young long shoots to a cell
	spurs: 6, // and this many short shoots
};

/**
 * The crown the tree keeps to, by its age in years (the data sheet's table, own-rooted from a cutting: 1.0–1.5 m at
 * 2 y, 2–3 m and 1.5–2.5 m wide at 5 y, 3–4 m at 8 y, 5–6 m and as wide at 15 y, 7–9 m at 30 y): a dome widest two
 * fifths of the way up, its skirt of leaves near the ground, wider than tall from about its tenth year.
 */
const CROWN = {
	height: [[0, 0.45], [1, 1.3], [4, 2.6], [7, 3.6], [14, 5.5], [24, 7.0], [40, 8.5]],
	width: [[0, 0.4], [1, 0.8], [4, 2.3], [7, 3.7], [14, 6.2], [24, 8.8], [40, 10]],
	skirt: [[0, 0], [3, 0.2], [10, 0.4], [24, 0.45]],
};
function crownAt(a) {
	return { H: straight(a, CROWN.height), W: straight(a, CROWN.width), y0: straight(a, CROWN.skirt) };
}
/** where a point is in the crown of that age: `g` under 1 inside (its distance out over the radius at its height) */
function inCrown(p, c) {
	const span0 = Math.max(0.2, c.H - c.y0);
	const eta = (p.y - c.y0) / span0;
	const b = 0.45, k0 = 0.78;
	let f;
	if (eta < 0) f = k0 * clamp(1 + eta * 3, 0.12);
	else if (eta < b) f = Math.sqrt(1 - Math.pow((b - eta) / b, 2) * (1 - k0 * k0));
	else f = Math.pow(Math.max(0, 1 - Math.pow((eta - b) / (1 - b), 2)), 0.75);
	const R = (c.W / 2) * f;
	const r = Math.hypot(p.x, p.z);
	const yc = c.y0 + b * span0;
	const ry = p.y > yc ? (1 - b) * span0 : b * span0 * 1.4;
	const n = v3(p.x / Math.pow(c.W / 2, 2), (p.y - yc) / (ry * ry), p.z / Math.pow(c.W / 2, 2)).normalize();
	return { g: p.y > c.H ? 9 : R > 1e-3 ? r / R : 9, R, n, depth: R - r };
}

/** a year's season: `year` since the cutting first broke, `s` 0 … 1 from bud break (mid May) round, `days` since */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** how much of a year's extension is grown `s` into its season: shoots from bud break to late July (the first year
 * later, the cutting rooting first) */
const extension = (s, first) => (first ? span(s, -0.04, 0.34) : span(s, 0.0, 0.24));
/** the season's moment a shoot is `u` of its year's length (the inverse of `extension`) */
const formedAt = (u, first) => {
	const x = 0.5 - Math.sin(Math.asin(clamp(1 - 2 * u, -1, 1)) / 3);
	return first ? -0.04 + 0.38 * x : 0.24 * x;
};

/**
 * The tree's axes up to year Y (whole years: its shape in year Y is grown whole, and cut to the season when drawn).
 * Time-ordered, year by year: deaths, then buds of last year's wood breaking into long shoots or short (fruiting)
 * shoots, then each living axis's extension of the year, held inside its crown. Every axis and node draws its own
 * chance, and each year rests only on the years before, so the tree at an earlier time is the first part of the tree
 * at a later one.
 */
function simulate(seed, Y) {
	const C0 = MN.cutting;
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.05);
	const cut = v3(0, C0.above, 0);
	const make = (o) => {
		const ax = { nodes: [], kids: [], died: Infinity, lastGrow: o.born, grown: [], ...o };
		all.push(ax);
		if (ax.parent) ax.parent.kids.push(ax);
		return ax;
	};
	// the cutting is the trunk's first part: last year's wood, straight, its top 5 cm out of the soil
	const trunk = make({ key: ['trunk'], order: 0, kind: 'trunk', born: -1, pts: [v3(0, C0.above - C0.length, 0), cut.clone()], years: [-2, -2], ws: [0, 0], dir: v3(0, 1, 0), dir0: v3(0, 1, 0), parent: null, at: 0, vigour: 1 });
	const lean0 = (() => {
		const r = chance(seed, 'kink');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a));
	})();
	const descend = (ax, y) => {
		ax.died = Math.min(ax.died, y);
		for (const k of ax.kids) descend(k, y);
	};
	const alive = (ax, y) => ax.died > y;
	const cellOf = (p) => `${Math.floor(p.x / TREE.cell)},${Math.floor(p.y / TREE.cell)},${Math.floor(p.z / TREE.cell)}`;

	for (let y = 0; y <= Y; y++) {
		const crown = crownAt(y);
		// 1. what dies: shoots shaded out inside the crown, short shoots grown old, the cutting's weak shoots pruned
		if (y > 0)
			for (const ax of all) {
				if (!alive(ax, y) || ax.order === 0 || ax.born >= y) continue;
				const r = chance(seed, 'death', ...ax.key, y);
				const tip = ax.pts[ax.pts.length - 1];
				const c = inCrown(tip, crown);
				const age = y - ax.born;
				let p = 0;
				if (ax.basal) p = y >= (ax.basal === true ? 2 : ax.basal) ? 1 : 0; // the low shoots, cut away to a clean stem
				else if (ax.kind === 'short') p = age > ax.life ? 1 : c.depth > 1.7 && age > 2 ? 0.3 : 0;
				else if (ax.order >= 2) {
					if (y - ax.lastGrow > 2 && age > 3 && c.depth > 0.6) p = 0.5;
					if (c.depth > 1.8 && age >= 3) p = Math.max(p, ax.order >= 3 ? 0.3 : 0.18);
					if (ax.order >= 3 && age > ax.life) p = 1;
				}
				if (p > 0 && r() < p) descend(ax, y);
			}
		// the crowding of last year's young long shoots and the short shoots, cell by cell
		const tips = new Map(), spurs = new Map();
		for (const ax of all) {
			if (!alive(ax, y)) continue;
			const k = cellOf(ax.pts[ax.pts.length - 1]);
			if (ax.kind === 'short') spurs.set(k, (spurs.get(k) ?? 0) + 1);
			else if (ax.lastGrow >= y - 1) tips.set(k, (tips.get(k) ?? 0) + 1);
		}
		// 2. the buds of last year's wood break: into long shoots, short shoots, or they sleep
		const born = [];
		for (const ax of all) {
			if (!alive(ax, y) || ax.kind === 'short') continue;
			for (const n of ax.nodes) {
				if (n.year !== y - 1) {
					// renewal: where the light comes in (no young shoot in its cell, near the crown's face), a sleeping bud
					// on wood of two to seven years breaks into a new shoot toward the light, so the crown fills its gaps
					if (n.used || !n.at || ax.order < 1 || n.year < y - 7 || n.year > y - 2 || y < 5) continue;
					const key = cellOf(n.at);
					if ((tips.get(key) ?? 0) > 0) continue;
					if (chance(seed, 'renew', ...ax.key, n.i, y)() > 0.06) continue;
					const c = inCrown(n.at, crown);
					if (c.depth > 1.3) continue;
					const d0 = c.n.clone().add(v3(0, 0.45, 0)).addScaledVector(n.dir, 0.4).normalize();
					n.used = true;
					tips.set(key, 1);
					born.push({ key: [...ax.key, n.i, 'r', y], order: ax.order + 1, kind: 'long', born: y, pts: [n.at.clone()], years: [y], ws: [0], dir: d0.clone(), dir0: d0.clone(), parent: ax, at: n.s, vigour: 0.75, low: ax.low ?? 0, life: 10 });
					continue;
				}
				const br = chance(seed, 'bud', ...ax.key, n.i);
				const roll = br();
				const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
				let pLong = 0, pShort = 0, angle = 0.8, vig = 0.6, limb = false, temp = false;
				if (ax.order === 0) {
					const h = n.at.y;
					if (y === 1 && n.year === 0 && h > 0.12) (pLong = 0.5), (angle = 0.9), (vig = 0.6), (temp = true);
					else if (y <= 1) continue;
					else if (h >= TREE.forkLow && h <= TREE.forkHigh && n.year >= 1) (pLong = 0.32), (angle = lerp(1.3, 0.95, (h - TREE.forkLow) / 0.75)), (vig = 1), (limb = true);
					else if (h > TREE.forkHigh) (pLong = 0.22), (angle = 0.45), (vig = 0.9), (limb = true);
				} else {
					const yearLen = ax.yearLen[n.year] ?? 0;
					const up = side.y > 0.35 ? 1.3 : side.y < -0.5 ? 0.3 : 1;
					const acro = n.u > 0.7 ? 0.5 : n.u > 0.4 ? 0.2 : 0.05;
					// a young tree branches freely (it has light all round): more shoots its first years
					pLong = acro * [0, 1, 0.9, 0.7, 0.45, 0.25, 0][Math.min(6, ax.order)] * clamp(yearLen / 0.15) * up * (1 + 0.8 * clamp((7 - y) / 4));
					pShort = n.u > 0.08 && n.u < 0.95 && y >= 2 ? 0.4 : 0;
					angle = lerp(0.95, 0.6, n.u) * about(br, 1, 0.15);
					vig = ax.vigour * lerp(0.55, 0.85, n.u) * about(br, 1, 0.12);
				}
				// a long shoot from a side bud: from the buds on the upper flank more often and more upright (the two rows of
				// leaves face sideways, but the strong shoots of a limb rise from its upper side)
				let kside = side;
				if (ax.order >= 1) {
					const upPerp = UP.clone().addScaledVector(n.dir, -UP.dot(n.dir));
					if (upPerp.lengthSq() > 1e-6) {
						const k = br() * (0.4 + 0.6 * br()) * (ax.low ? 0.6 : 0.95);
						kside = side.clone().multiplyScalar(1 - k).addScaledVector(upPerp.normalize(), k).normalize();
						vig *= 1 + 0.35 * k;
					}
				}
				// the limbs leave the trunk all round it, each about a golden angle on from the last
				if (limb) {
					const az = (trunk.az0 ??= chance(seed, 'limbs')() * Math.PI * 2) + (trunk.limbs ?? 0) * 2.39996 + about(br, 0, 0.25);
					kside = v3(Math.cos(az), 0, Math.sin(az));
				}
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(kside, Math.sin(angle)).normalize();
				const key = cellOf(n.at);
				if (limb && (trunk.limbs ?? 0) >= (n.at.y > TREE.forkHigh ? 8 : 6)) pLong = 0;
				if (roll < pLong && (limb || (tips.get(key) ?? 0) < TREE.tips)) {
					if (limb) trunk.limbs = (trunk.limbs ?? 0) + 1;
					n.used = true;
					tips.set(key, (tips.get(key) ?? 0) + 1);
					born.push({ key: [...ax.key, n.i], order: ax.order + 1, kind: 'long', born: y, pts: [n.at.clone()], years: [y], ws: [0], dir: d0.clone(), dir0: d0.clone(), parent: ax, at: n.s, vigour: vig, low: ax.order === 0 ? clamp(1 - (n.at.y - TREE.forkLow) / 0.8) : ax.low ?? 0, life: 8 + Math.floor(br() * 7), basal: temp ? 4 : undefined });
				} else if (roll < pLong + pShort && (spurs.get(key) ?? 0) < TREE.spurs) {
					spurs.set(key, (spurs.get(key) ?? 0) + 1);
					n.used = true;
					const sd = side.clone().multiplyScalar(0.8).addScaledVector(n.dir, 0.4).add(v3(0, 0.35, 0)).normalize();
					born.push({ key: [...ax.key, n.i, 's'], order: ax.order + 1, kind: 'short', born: y, pts: [n.at.clone()], years: [y], ws: [0], dir: sd, dir0: sd.clone(), parent: ax, at: n.s, vigour: 0, node: n, life: 6 + Math.floor(br() * 7) });
				}
			}
		}
		// the cutting's own buds, in its first spring: the top one the leader, one or two below it weak side shoots
		if (y === 0)
			for (let k = 0; k < 2; k++) {
				const br = chance(seed, 'cutting-shoot', k);
				if (k === 1 && br() < 0.4) continue;
				const a = k * 2.6 + br() * 0.8;
				const d0 = v3(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize();
				born.push({ key: ['basal', k], order: 1, kind: 'long', born: 0, pts: [v3(0, C0.above - 0.012 - k * 0.018, 0)], years: [0], ws: [0], dir: d0.clone(), dir0: d0.clone(), parent: trunk, at: C0.length - 0.012 - k * 0.018, vigour: 0.45, basal: true, life: 2 });
			}
		for (const b of born) make(b);

		// 3. this year's extension of every living axis
		for (const ax of all) {
			if (!alive(ax, y) || ax.born > y) continue;
			const r = chance(seed, 'grow', ...ax.key, y);
			if (ax.kind === 'short') {
				// a short shoot: its wood a centimetre a year, knobbly; the year's leafy shoot is drawn with the season
				const d = ax.dir.add(v3(about(r, 0, 0.2), 0.12, about(r, 0, 0.2))).normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, between(r, 0.006, 0.014) * (y === ax.born ? 1.6 : 1)));
				ax.years.push(y);
				ax.ws.push(1);
				ax.lastGrow = y;
				continue;
			}
			const age = y - ax.born;
			const mature = lerp(1, 0.6, clamp((y - 5) / 15)); // a grown tree's shoots are shorter (5–20 cm on old trees)
			let len;
			if (ax.order === 0) len = y < TREE.leader.length ? TREE.leader[y] * vigourTree * about(r, 1, 0.05) : 0; // then its tip dies back and the limbs lead
			else len = TREE.shoot[Math.min(ax.order, TREE.shoot.length - 1)] * ax.vigour * TREE.fade[Math.min(age, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree * mature;
			if (len < 0.025) continue;
			// sympodial: the tip died back last summer and a side bud leads, so each year's growth sets off a little askew
			if (age > 0) ax.dir.applyAxisAngle(across(ax.dir).applyAxisAngle(ax.dir, r() * Math.PI * 2), about(r, 0, ax.order === 0 ? 0.12 : 0.42)).normalize();
			const first = ax.order === 0 && y === 0;
			const step = first ? 0.01 : 0.035;
			const steps = Math.max(2, Math.ceil(len / step));
			const h = len / steps;
			const d = ax.dir;
			// outward: away from the trunk, or for a limb leaving it, the way it set off
			const outward = ax.order === 1 ? ax.dir0.clone().setY(0) : ax.pts[0].clone().setY(0);
			const out = outward.lengthSq() > 1e-4 ? outward.normalize() : null;
			const free = ax.order === 0 && y < 4;
			// the internodes: long on a vigorous shoot (4–5 cm), short on the little growth of an old one (2–3 cm)
			const ix = clamp(len * 0.13, TREE.internode * 0.5, TREE.internode * 1.1);
			if (ax.nextNode === undefined || ax.nextNode < (ax.nodeBase ?? 0)) ax.nextNode = (ax.nodeBase ?? 0) + ix * 0.5;
			let walked = 0;
			for (let k = 0; k < steps; k++) {
				const last = ax.pts[ax.pts.length - 1];
				if (ax.order === 0 && y < 4) d.add(v3(about(r, 0, 0.05) + lean0.x * 0.012, 0.25, about(r, 0, 0.05) + lean0.z * 0.012));
				else {
					// a little up to the light, and out toward the crown's surface where the light is; held down by the
					// wood's own weight as it lengthens and ages (the lowest limbs most)
					const up = (ax.order === 0 ? 0.03 : ax.order === 1 ? 0.012 : 0.008) * (1 - 0.8 * (ax.low ?? 0));
					const sag = Math.min(0.014, 0.0016 * (ax.order + 0.5) * Math.min(4, age + 1) * (walked / Math.max(0.05, len) + Math.min(age, 4) * 0.25)) * (ax.order === 1 ? 0.5 + 0.9 * (ax.low ?? 0) : 1);
					d.addScaledVector(ax.dir0, 0.04);
					d.add(v3(about(r, 0, 0.03), up - sag, about(r, 0, 0.03)));
					if (out && ax.order <= 2) d.addScaledVector(out, 0.01);
					const c = inCrown(last, crown);
					// high in the crown the strong shoots lean in over its middle, or the dome's top stays hollow
					const high = clamp((last.y - crown.y0) / Math.max(0.2, crown.H - crown.y0) - 0.55) * 2.2;
					if (high > 0 && ax.order >= 2) d.addScaledVector(v3(-last.x, 0, -last.z).normalize(), 0.012 * high);
					if (c.g < 0.85) d.addScaledVector(c.n, 0.022);
					// near the surface a shoot slides along it rather than out of it
					else d.addScaledVector(c.n, -Math.max(0, d.dot(c.n)) * 0.6 * clamp((c.g - 0.85) / 0.15));
				}
				d.normalize();
				const next = last.clone().addScaledVector(d, h);
				if (!free && (inCrown(next, crown).g > 1 || next.y < 0.3)) break;
				ax.pts.push(next);
				ax.years.push(y);
				walked += h;
				ax.ws.push(walked);
				// a node every internode, formed as the shoot grows past it
				const base = ax.nodeBase ?? 0;
				while ((ax.nextNode ?? 0) < base + walked) {
					const i = ax.nodeCount ?? 0;
					const within = ax.nextNode - base;
					ax.nodes.push({ i, year: y, u: within / len, s: (ax.order === 0 ? MN.cutting.length : 0) + ax.nextNode });
					ax.nodeCount = i + 1;
					ax.nextNode += ix;
				}
			}
			ax.yearLen = ax.yearLen ?? {};
			ax.yearLen[y] = walked;
			ax.yearFull = ax.yearFull ?? {};
			ax.yearFull[y] = len;
			if (walked > 0.01) ax.lastGrow = y;
			ax.nodeBase = (ax.nodeBase ?? 0) + walked;
		}
		// each node's place, direction and the way its leaf faces, from the path as grown
		for (const ax of all) {
			if (ax.kind === 'short' || ax.placed === ax.pts.length) continue;
			ax.pathLen = lengths(ax.pts);
			ax.placed = ax.pts.length;
			const r2 = chance(seed, 'phyllo', ...ax.key);
			const phase = r2() * Math.PI * 2;
			const two = ax.order >= 1; // two rows on the side shoots, a 2/5 spiral up the trunk
			for (const n of ax.nodes) {
				if (n.at) continue;
				const p = pointAt(ax, n.s);
				n.at = p.at;
				n.dir = p.dir;
				n.bearing = two ? Math.PI * (n.i % 2) + about(chance(seed, 'b', ...ax.key, n.i), 0, 0.35) + Math.PI / 2 : phase + n.i * 2.513;
			}
		}
	}
	return { all, trunk, lean0 };
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
	return { at: ax.pts[i - 1].clone().lerp(ax.pts[i], k), dir: ax.pts[Math.min(i, L.length - 1)].clone().sub(ax.pts[i - 1]).normalize(), i };
}

/**
 * The tree as it stands at time t: the simulated axes cut to the season (this year's growth as far as grown, the dead
 * gone), and leaned: an old mulberry's trunk leans 10–30° (the data sheet), here about 12° by its 25th year, the crown
 * carried over it.
 */
function treeAt(seed, t) {
	const { year, s } = seasonOf(t);
	const { all, trunk, lean0 } = simulate(seed, Math.max(-1, year));
	const keep = [];
	for (const ax of all) {
		if (ax.died <= t + 1e-9 || ax.born > year) continue;
		const first = year === 0;
		const f = extension(s, first);
		const full = ax.yearFull?.[year] ?? 0;
		const pts = [], years = [];
		for (let i = 0; i < ax.pts.length; i++) {
			if (ax.years[i] < year) {
				pts.push(ax.pts[i]);
				years.push(ax.years[i]);
				continue;
			}
			if (ax.kind === 'short') {
				if (i === 0 || s > 0.05) pts.push(ax.pts[i]), years.push(ax.years[i]);
				continue;
			}
			if (ax.ws[i] <= full * f + 1e-6) {
				pts.push(ax.pts[i]);
				years.push(ax.years[i]);
			}
		}
		if (pts.length < 2 && ax.kind !== 'short') continue;
		const nodes = ax.nodes.filter((n) => n.year < year || (n.year === year && n.u <= f + 1e-6));
		for (const n of nodes) n.formed = n.year + (n.year === year || n.year < year ? formedAt(n.u, n.year === 0) : 0);
		keep.push({ ...ax, pts, years, nodes, pathLen: null, tipYear: years[years.length - 1] });
	}
	// the kids that are kept, by their parents
	const byKey = new Map(keep.map((k) => [k.key.join('.'), k]));
	for (const k of keep) k.kids = [];
	for (const k of keep) {
		const p = k.parent && byKey.get(k.parent.key.join('.'));
		k.parentKept = p ?? null;
		if (p) p.kids.push(k);
	}
	// the lean, growing from its seventh year: the trunk tilts, the crown above it carried across
	const lean = 0.03 + 0.19 * clamp((t - 6) / 18);
	const tl = Math.tan(lean);
	const shift = (p) => {
		const h = Math.max(0, p.y);
		const o = tl * (h < 1.4 ? h * (1 - (0.25 * h) / 1.4) : 1.4 * 0.75 + (h - 1.4) * 0.12);
		return p.clone().addScaledVector(lean0, o);
	};
	for (const k of keep) {
		k.pts = k.pts.map(shift);
		k.pathLen = lengths(k.pts);
		for (const n of k.nodes) {
			if (!n.at) continue;
			n.atL = shift(n.at);
		}
	}
	const T = byKey.get('trunk');
	return { all: keep, trunk: T, shift };
}

/**
 * How thick each axis is along it: the pipe model (r^2.5 summed over what the wood feeds) plus a ring a year,
 * calibrated to the data sheet's trunk: 1.5–2 cm at 2 y, 4–6 cm at 5 y, 8–10 cm at 8 y, 22–28 cm at 25–30 y (at 1 m).
 */
const PIPE = 2.5;
const RING = 0.32;
const RING_ADD = 0.003;
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	const tip = ax.kind === 'short' ? TREE.spurRadius : TREE.tipRadius;
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.kind === 'short' ? Math.pow(0.0016, PIPE) : k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'short' ? 0 : TREE.pipeLength * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'short' ? 0 : RING_ADD * Math.min(woodAge, 3) * clamp(Math.pow(q, 1 / PIPE) / 0.008));
		ax.r2[i] = r * r;
	}
}

/** the tree's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2) return;
	if (ax.kind === 'short' && DETAIL.level < 0.5) return;
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
	const isTrunk = ax.kind === 'trunk';
	const step = isTrunk ? clamp(R0 * 0.3, 0.006, 0.035) : ax.kind === 'short' ? 0.03 : R0 > 0.03 ? clamp(R0 * 1.2, 0.03, 0.06) : R0 > 0.008 ? clamp(R0 * 3.5, 0.04, 0.1) : clamp(R0 * 3, R0 < 0.004 ? 0.1 : 0.04, 0.12);
	const pts = [];
	const count = ax.kind === 'short' ? 1 : Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'short' || R0 < 0.0045 ? 3 : Math.round(clamp(R0 * (R0 > 0.03 ? 340 : 260), R0 < 0.008 ? 4 : 5, 40));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const depth = MN.cutting.length - MN.cutting.above;
	const burrs = isTrunk ? [0, 1, 2].map((k) => { const r = chance(ns, 'burr', k); return { s: depth + between(r, 0.15, 1.1), v: r(), size: between(r, 0.5, 1) }; }) : [];
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk && s <= MN.cutting.length + 0.002) r = Math.max(r, MN.cutting.radius * (1 - 0.15 * (s / MN.cutting.length)));
		if (isTrunk) {
			// the root flare, in low buttresses
			const ground = s - depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.14);
			r *= 1 + 0.55 * clamp(t / 10) * flare * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			// burrs on an old trunk, and the deep seam where it has begun to split in two (the sheet's grown trees)
			const o = clamp((r - 0.06) / 0.06);
			if (o > 0) {
				for (const b of burrs) {
					let dv = Math.abs(v - b.v);
					dv = Math.min(dv, 1 - dv);
					r *= 1 + 0.22 * b.size * o * Math.exp(-Math.pow(dv / 0.07, 2) - Math.pow((s - b.s) / 0.11, 2));
				}
				let dv = Math.abs(v - 0.25);
				dv = Math.min(dv, 1 - dv);
				r *= 1 - 0.12 * o * Math.exp(-Math.pow(dv / 0.025, 2)) * span(s, depth + 0.1, depth + 0.4);
			}
		}
		if (ax.kind !== 'short' && s < r * 2.2 && ax.parentKept) r *= 1 + 0.25 * (1 - s / (r * 2.2)); // the branch collar
		return r * (1 + barkRelief(r, v, s, nsAx));
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - (ax.kind === 'short' ? 0.6 : 0.2);
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx);
		if (isTrunk && s < depth + 0.01) c.lerp(named(MN.root.old), clamp((depth + 0.01 - s) / 0.03) * clamp(t + 0.5));
		return c;
	};
	const kind = R0 < 0.006 && !isTrunk ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	if (kind === 'bark') metric(geo, total / 0.25, (Math.PI * 2 * Math.max(R0, 0.01)) / 0.25);
	bag.add(kind, geo);
	// the cutting's top, cut flat and pale, until the shoot from its top bud has grown over it
	if (isTrunk && t < 0.4) bag.add('body', bead(ax.pts[1].clone().add(v3(0, 0.0005, 0)), v3(R0 * 0.95, 0.0008, R0 * 0.95), MN.cutting.cut, 8));
}

/** the roots: from the cutting's buried base, white roots out sideways (no taproot), then thick orange-brown wandering
 * roots, mostly shallow, spreading wider than the crown */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots || t < 0) return;
	const count = 9;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'root', i);
		const born = i < 6 ? 0.0 : 0.6 + (i - 6) * 0.8;
		const bear = i * 2.39996 + rr() * 0.5;
		const at = base.clone().add(v3(Math.cos(bear) * 0.006, 0.02 + rr() * 0.06, Math.sin(bear) * 0.006));
		root(bag, {
			seed,
			key: ['root', i],
			from: at,
			dir: v3(Math.cos(bear), -0.25 - rr() * 0.3, Math.sin(bear)),
			length: between(rr, 1.8, 3.2) * lerp(0.3, 1, clamp(t / 12)),
			grown: table(t - born, [[0, 0], [0.02, 0.02], [0.3, 0.12], [1, 0.3], [4, 0.6], [12, 1]]),
			radius: 0.0011 + 0.055 * span(t, born + 0.5, 25) * between(rr, 0.55, 1),
			down: 0.02,
			wander: 0.2,
			laterals: 7,
			lateral: 0.32,
			depth: 2,
			taper: 0.82,
			age: (t - born - 0.4) / 4,
			young: MN.root.young,
			old: MN.root.old,
			floor: -0.9,
		});
	}
}

/**
 * The whole mulberry at time t (years from the cutting's first spring; t < 0 the cutting in the winter before): its
 * roots, its wood, and what the season puts on it — black buds in winter, leaves unfolding late (mid May) with the
 * catkins at the foot of each new short shoot, fruit from set to ripe over the summer, yellow leaves in autumn.
 */
function mulberryTree(t, seed) {
	const bag = new Bag();
	const { year, s, days } = seasonOf(t);
	const depth = MN.cutting.length - MN.cutting.above;
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	roots(bag, seed, t, v3(0, -depth, 0));
	const { all, trunk } = treeAt(seed, t);
	if (!trunk) return bag.build();
	thicken(trunk, t);
	for (const ax of all) if (!ax.r2) thicken(ax, t); // (an axis whose parent was not kept)
	for (const ax of all) wood(bag, ax, t, hashText(seed) % 997, sunDir);

	const fall = year < 0 ? 1 : span(s, 0.4, 0.5); // leaves yellow in October and fall in November
	const leafy = t >= 0 && fall < 1;
	const bearing = year >= TREE.firstFruit;
	const pBear = table(year, [[TREE.firstFruit, 0.12], [4, 0.25], [6, 0.45], [10, 0.6], [15, 0.65]]);
	for (const ax of all) {
		const tipR = Math.sqrt(ax.r2[ax.r2.length - 1]);
		if (ax.kind === 'short') {
			// a short shoot: each May a leafy shoot of 3–8 cm from its tip, four to six leaves on it in two rows, the
			// catkins at the foot of its lowest leaves; it fruits from its second spring
			const tip = ax.pts[ax.pts.length - 1];
			const dir = tip.clone().sub(ax.pts[Math.max(0, ax.pts.length - 2)]);
			if (dir.lengthSq() < 1e-10) dir.copy(ax.dir0);
			dir.normalize();
			const kr = chance(seed, 'short-shoot', ...ax.key, year);
			const sl = between(kr, 0.03, 0.08) * span(days, 0, 30);
			const sd = dir.clone().add(v3(0, 0.25, 0)).normalize();
			const n = 3 + Math.floor(kr() * 3);
			if (leafy && days > 0) {
				if (sl > 0.004) bag.add('twig', tube([tip, tip.clone().addScaledVector(sd, sl)], (u) => 0.0014 * (1 - 0.5 * u), () => mix(MN.bark.shoot, MN.leaf.young, 0.3), 3));
				for (let k = 0; k < n; k++) {
					const u = (k + 0.6) / n;
					const at = tip.clone().addScaledVector(sd, sl * u);
					const side = across(sd).applyAxisAngle(sd, Math.PI * (k % 2) + Math.PI / 2 + about(kr, 0, 0.4));
					const ageL = clamp((days - 1 - k * 2.5) / 20);
					leaf(bag, at, side.clone().addScaledVector(sd, 0.4).normalize(), about(kr, 1.12, 0.1), ageL, fall, kr, 0, false, false, year < 6);
				}
			} else if (t >= 0 || ax.born < year) {
				bud(bag, tip, dir, t < 0 ? 0 : clamp((s - 0.95) / 0.05), kr);
			}
			// catkins: from its second spring, on a share of the short shoots that grows with the tree's age
			const fr = chance(seed, 'bears', ...ax.key, year);
			if (!bearing || year - ax.born < 1 || fr() > pBear || !leafy) continue;
			const nF = 1 + Math.floor(fr() * 2.6);
			const male = fr() < 0.3;
			for (let k = 0; k < nF + (male ? 1 : 0); k++) {
				const u = (k * 0.5 + 0.2) / n;
				const at = tip.clone().addScaledVector(sd, sl * u);
				const side = across(sd).applyAxisAngle(sd, Math.PI * (k % 2) + Math.PI / 2 + about(fr, 0, 0.6));
				const hang = side.clone().multiplyScalar(0.55).add(v3(0, -1, 0)).addScaledVector(sd, 0.2).normalize();
				if (male && k === nF) {
					maleCatkin(bag, at, side, days, fr);
					continue;
				}
				const df = between(fr, 8, 36);
				const R = about(fr, 66, 6);
				if (days > df + R + 7) continue; // ripe and fallen (it falls within days of ripening)
				const key = [...ax.key, year, k];
				if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit(key, at, hang);
				mulberry(bag, at, hang, days, df, R, sunDir, seed, key.join('|'));
				bag.fruitDone();
			}
			continue;
		}
		for (const n of ax.nodes) {
			if (!n.atL) continue;
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const surf = n.atL.clone().addScaledVector(side, Math.max(tipR, 0.0016));
			if (n.year === year && t >= n.formed && leafy) {
				const ageL = clamp((t - n.formed) / 0.06);
				const yl = ax.yearFull?.[n.year] ?? 0.2;
				// lobed leaves on the young plant and on vigorous shoots (data sheet: seedlings, suckers, strong shoots)
				const lobed = year <= 1 ? clamp(0.6 + nr() * 0.5) : year < 8 ? clamp((yl - 0.42) / 0.3) * (nr() < 0.7 ? 1 : 0.3) : 0;
				const size = (year <= 1 ? 1.3 : lerp(1.12, 1.3, clamp((yl - 0.15) / 0.5))) * about(nr, 1, 0.08) * (n.year === 0 ? Math.min(1, 0.35 + 0.12 * n.i) : 1); // the cutting's first leaves small
				leaf(bag, surf, side.clone().addScaledVector(n.dir, 0.35).normalize(), size, ageL, fall, nr, lobed, false, false, year < 6, year < 3);
				if (s > 0.3) bud(bag, surf, side.clone().addScaledVector(n.dir, 0.9).normalize(), 0, nr);
			} else if ((n.year === year - 1 && s < 0.02) || (n.year === year && s >= 0.5) || (t < 0 && ax.order === 0)) {
				bud(bag, surf, side.clone().addScaledVector(n.dir, 0.9).normalize(), clamp((s - 0.95) / 0.05), nr);
			}
		}
	}
	// the cutting's own buds (the winter before, and its first spring): two above the soil, one below
	if (t < 0.05) {
		for (const [h, a] of [[0.262, 0.4], [0.236, 3.3]]) {
			const r = chance(seed, 'cutting-bud', h);
			const side = v3(Math.cos(a), 0, Math.sin(a));
			const at = v3(0, MN.cutting.above - MN.cutting.length + h, 0).addScaledVector(side, MN.cutting.radius * 0.9);
			bud(bag, at, side.clone().add(v3(0, 1.4, 0)).normalize(), clamp((t + 0.02) / 0.04), r);
		}
	}
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the cutting to ripe fruit; `t` the years since the cutting's first spring (bud break, mid May)
 * each is grown at (between two stages, on the way). The last five are one season of the tree's 25th year, in a
 * southern English garden: the leaves out late in May with the catkins, the fruit set in June, ripening one by one
 * from late July for eight weeks and more.
 */
const STAGES = [
	{ name: 'Cutting', t: -0.4, note: "December: a hardwood cutting of last year's shoot, 27 cm long and 15 mm thick, grey-brown, set upright in the soil with its top 5 cm and two black buds above it. Black mulberries are grown from cuttings or layers, hardly ever from seed (no tree from seed was seen in a survey of Turkey's)." },
	{ name: 'Rooting', t: 0.06, note: 'Early June, three weeks after its buds broke: white roots out sideways from its buried base (a cutting has no taproot), two shoots a few centimetres long from its top buds, their first leaves pale and downy.' },
	{ name: 'Rooted cutting', t: 0.33, note: 'September of its first summer: a shoot of about 40 cm from the top bud and a weaker one beside it, green and downy, their leaves large and deeply lobed (as on every young plant and vigorous shoot).' },
	{ name: 'Two years', t: 1.3, note: 'Its second summer: a crooked stem 1.2–1.3 m tall, zigzag (no shoot keeps its tip: a side bud takes the lead each spring), its leaves lobed and heart-shaped mixed.' },
	{ name: 'Young tree', t: 4.3, note: "Its fifth summer: 2.5 m, a short trunk of 5 cm branching at about a metre into spreading limbs, heart-shaped leaves; 'Chelsea' crops young, its first few fruit ripening." },
	{ name: 'Leafing out', t: 24.045, note: 'Its 25th spring, mid to late May (the last tree in the garden to leaf, "the wisest of trees"): pale yellow-green leaves unfolding on short new shoots, the catkins at their foot: hanging cream male catkins 3–4 cm, plump green female ones. The tree 7 m tall and 8 m wide, its short trunk leaning, its crooked limbs spreading.' },
	{ name: 'Flowering', t: 24.07, note: 'Early June: the female catkins, 1–1.5 cm, bristle with white two-lobed stigmas; the males shed their pollen to the wind and drop. Almost every flower sets, pollinated or not (parthenocarpy).' },
	{ name: 'Green fruit', t: 24.17, note: 'Early July: green fruit 1.5–2 cm, lumpy with their few large drupelets, firm, sitting almost without a stalk at the foot of the short shoots; the crown full and dark.' },
	{ name: 'Colouring', t: 24.2, note: 'Late July: the first fruit turning, green to pale green-white, pink, red; the sunny side and some drupelets ahead of the rest.' },
	{ name: 'Ripe', t: 24.24, note: 'Early August, the harvest begun: ripe fruit 26 × 18 mm and about 4.5 g, glossy purple-black and soft, falling within days, with red and green ones beside them on every branch (a tree ripens over eight to ten weeks). The juice stains whatever it falls on.' },
];

/** the years since the cutting's first spring at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => mulberryTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one mulberry on its own ---- */

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

/** the fruit the tree bears ripe (black) at the last stage, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.97);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one mulberry at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This mulberry has not flowered yet.');
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
	id: 'mulberry',
	label: "Mulberry 'Black' · Morus nigra",
	latin: "Morus nigra L. (Moraceae) · black mulberry, the garden mulberry of Europe ('Chelsea' / 'King James' in Britain); Schwarze Maulbeere, mûrier noir, gelso nero, moral, kara dut, shah toot (Persian, not 'Shahtoot' = M. alba)",
	note: 'The black mulberry, the old garden mulberry of English lawns and college gardens and of Anatolian and Persian villages: a slow, long-lived tree, grown from a cutting on its own roots, with a short, leaning, furrowed trunk under a low dome of crooked limbs wider than tall; rough, heart-shaped, coarsely toothed leaves 12 × 10 cm (lobed on young shoots); catkins in late May, the last tree to leaf; fruit like a short fat blackberry, 26 × 18 mm, of a few large drupelets, almost stalkless, ripening one by one from green through white-pink and red to glossy purple-black over eight weeks from late July.',
	from: 'Tree · 25 years from a cutting',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'a8e1d37d21eb6da78ac4a565486d3133ca790ff6cbe4e3169568869bb3102318', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from planting the cutting
	// what a world needs to plant it right; plant-skill's data sheet for the black mulberry (references/mulberry-black.md)
	facts: {
		height: { at2: [1, 1.5], at5: [2, 3], at8: [3, 4], at15: [5, 6], at30: [7, 9], at50: [9, 12], grown: [6, 12], unit: 'm' },
		trunk: { at2: [0.015, 0.02], at5: [0.04, 0.06], at8: [0.08, 0.1], at15: [0.15, 0.2], at30: [0.22, 0.28], at50: 0.32, at150: [0.8, 1.0], unit: 'm' },
		crown: { at5: [1.5, 2.5], at8: [3, 4], at15: [5, 6], at30: [7, 9], old: [9, 12], unit: 'm' },
		lean: { at100: [10, 30], unit: 'degrees' },
		spacing: { garden: [9, 12], orchard: [7, 7], least: 4.5, unit: 'm' },
		shade: 'full sun to part shade; open-grown trees fruit far more',
		climate: 'warm-temperate to Mediterranean and continental with hot summers; hardy to RHS H6 / USDA 6b (−20 to −15 °C); 0–2,000 m; best sheltered from wind; deep, well-drained loam',
		years: { firstFruit: [3, 8], muchFruit: [10, 15], productiveLife: [100, 400] },
		leaf: { length: [0.06, 0.14], width: [0.07, 0.12], lobedOnVigorousShoots: [0.15, 0.23], petiole: [0.015, 0.025], budBreak: 'May (the last tree to leaf; 2–3 weeks after other mulberries)', fall: 'October–November', colourAutumn: 'yellow', unit: 'm' },
		flower: { male: { length: [0.023, 0.043], width: [0.005, 0.008] }, female: { length: [0.004, 0.024], width: [0.0046, 0.0078], flowers: [13.5, 52] }, season: 'late May–June', pollination: 'wind', set: [0.97, 1.0], parthenocarpic: true, monoecious: true, unit: 'm' },
		fruit: { length: [0.018, 0.027], width: [0.014, 0.018], mass: [0.0025, 0.0057], drupelets: [15, 28], stalk: [0.0046, 0.007], daysFromFlowering: [50, 90], harvestWeeks: [8, 10], harvest: 'late July–September (England)', brix: [13, 19], acidity: [1.2, 2.7], juiceShare: 0.8, unit: 'm, kg, days' },
		propagation: 'hardwood cuttings (0 % untreated, 23–67 % with IBA), layering; grafted on M. alba in Turkey; seed rarely (epigeal, 88 % after 100 days of chilling)',
		yield: { tree15to30: [10, 30], oldTreeGoodYear: [30, 80], unit: 'kg a tree a year [estimate]' },
		chromosomes: '2n = 22x = 308',
		diseases: 'mostly healthy: mildew, leaf spot, coral spot, cankers, popcorn disease; birds take the fruit',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'mulberry' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'mulberry',
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
module.exports.organs = { MN, LEAF_W, leaf, leafShape, maleCatkin, mulberry, mulberryGeometry, fruitSize, skinAt, bud, Bag, timeAt, mulberryTree, simulate, treeAt, thicken, crownAt, surface, lite, detailAt, STAGES, barkColour };
