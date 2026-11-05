'use strict';
/*
 * POMEGRANATE 'WONDERFUL' — Punica granatum L. 'Wonderful' (Lythraceae; the Wonderful pomegranate, found as a chance
 * seedling at Porterville, California, in 1896): the world's most grown pomegranate. Version 2 of plants/pomegranate:
 * one named cultivar, grown as it is grown, from a hardwood cutting on its own roots, trained to four low trunks, to a
 * laden tree in its eighth October.
 *
 * Its numbers are the cultivar's where they are measured (Wetzstein et al. on 'Wonderful' at Delano: flowers, ovules
 * and set; Ferrara et al. 2023: 5.8 sepals, 5.7 petals, 169 stamens; UPOV TG/284/1, where 'Wonderful' is the example of
 * a long broad crown and narrow long leaves; Adiletta et al. 2018 and Narjesi et al. 2025: fruit 10.8 × 8.9 cm, the
 * crown 1.9 cm, rind 3.9 mm; Ginzberg & Faigenboim 2022: colour break at 11 weeks, deep red at 22; Wilkins & McCoy
 * 2015: yields at 5.2 × 4.3 m) and the species' otherwise (Flora of China, Flora of North America, UF/IFAS, UGA);
 * estimates are marked in the data sheet (plant-skill's references/pomegranate-wonderful.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (9f2814aa…): its outlines and colours traced off its panels. Where the plate
 * is wrong against the data sheet (its bearing tree's fruit twice their size, its old bark red and stringy), the data
 * sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from plum v2 (banana v2's core with mipmapped pictures, `backLit` and
 *                   `named()`), with the pomegranate's materials and its surfaces: small pictures made from noise for
 *                   what vertex colours cannot carry (the leaf's looping veins, the old bark's flaking strips, the
 *                   rind's dots and streaks).
 *   2. ORGANS       the pomegranate's own, each to its measure: the cutting, bark, leaf, the calyx (flower and crown),
 *                   petals and stamens, the fruit.
 *   3. THE TREE     its axes year by year (the cutting's shoots, four kept as trunks, laterals in opposite pairs, spurs
 *                   and thorns, suckers), its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from planting the cutting (t = 0 on 1 February); a year's season `s` 0 … 1
 * from 1 February round to the next: buds break late March (s ≈ 0.14), full bloom about 10 May (s ≈ 0.27) in three
 * waves from mid April to mid June, ripe from late September, picked by late October (s ≈ 0.72), leaves yellow in
 * November, bare from December.
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
		// the pomegranate's: tens of thousands of small narrow leaves and hundreds of flowers, so a crowd keeps few of them,
		// each grown more, and leaves out its fine wood
		[0.1, 0.035, 2.6, 0.01],
		[0.25, 0.07, 2.2, 0.004],
		[0.5, 0.25, 1.6, 0.0015],
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
 * strips of old bark, the dots on the rind. Laid on by the shape's UVs (a leaf's own, the bark's and the rind's in
 * metres or round the fruit: `metric`), mipmapped. Colour pictures only: they multiply the vertex colours (white leaves
 * them as they are). No bump pictures (plum v2's lesson: a dense tree finds a pixel where they are NaN). Only at
 * detail 0.5 and over: a crowd far off draws plain colours.
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
 *   leafMap   one blade in its own coordinates (u along it from the stalk, v across from edge to edge, the midrib at
 *             v = ½): a pomegranate leaf's veins are faint: a pale midrib, 10–14 pairs of fine side veins leaving it
 *             wide (60–70°) and looping into one another short of the margin (brochidodromous), the blade glossy and
 *             smooth between them
 *   barkMap   0.25 m square of old pomegranate bark, laid on in metres (x along the wood): long shallow flutes and ridges running up the
 *             trunk, the thin grey bark peeling in long narrow strips, paler grey-buff where a strip has come off,
 *             dark hair-lines between
 *   rindMap   the rind laid round the fruit (u round it, v from the stalk to the crown): fine brown dots (lenticels), a
 *             faint streaking along the meridians, a little mottling
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(256, 64, (x, y) => {
				const side = Math.abs(y - 0.5) * 2; // 0 at the midrib, 1 at the margin
				const mid = Math.exp(-Math.pow((y - 0.5) / 0.018, 2)) * (1 - 0.5 * x);
				// side veins: 12 pairs, leaving at ~65° from the midrib (steep in u), each bending forward to loop near the margin
				const phase = x * 12 - side * 0.55 - side * side * 0.6;
				const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), 40) * smooth((0.86 - side) / 0.1) * smooth((x - 0.04) / 0.05) * smooth((0.96 - x) / 0.06);
				// the loops: a faint vein running along the blade near the margin, joining the side veins
				const loop = Math.exp(-Math.pow((side - 0.82) / 0.035, 2)) * smooth((x - 0.08) / 0.1) * smooth((0.94 - x) / 0.1) * 0.6;
				const mottle = tileNoise(x, y, 16, 3) - 0.5;
				const k = 0.93 + 0.22 * mid + 0.1 * sec + 0.06 * loop + 0.05 * mottle;
				return [k * 1.0, k * 1.03, k * 0.9];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x up the trunk (a tube's u runs along it), y round it (0.25 m each): long strips 1–2 cm wide and 8–25 cm
				// long, some lifting at their edges
				const w = tileNoise(x, y, 4, 61, 2) - 0.5;
				const c = tileCells(x, y + w * 0.05, 2, 14, 63);
				const crack = smooth((0.06 - (c.f2 - c.f1)) / 0.05);
				const peeled = c.id < 0.22 ? 1 : 0; // a strip come off: the paler bark under it
				const grain = tileNoise(x, y, 6, 65, 2, 60) - 0.5;
				let k = 0.86 + 0.22 * c.id + 0.14 * grain;
				let r = k, g = k, b = k * 0.98;
				if (peeled) (r = 1.18 + 0.1 * grain), (g = 1.1 + 0.1 * grain), (b = 0.96 + 0.08 * grain);
				const dark = lerp(1, 0.42, crack);
				return [r * dark, g * dark, b * dark];
			}, true),
		rindMap: () =>
			picture(256, 256, (x, y) => {
				const dots = tileCells(x, y, 44, 44, 73);
				const dot = dots.id < 0.35 ? smooth((0.12 - dots.f1) / 0.06) : 0;
				const streak = tileNoise(x, y, 40, 75, 2, 6) - 0.5;
				const mottle = tileNoise(x, y, 8, 77, 3) - 0.5;
				const k = 1 + 0.06 * streak + 0.08 * mottle;
				// a dot a little browner and lighter than the skin round it
				return [k * (1 - 0.1 * dot) + 0.06 * dot, k * (1 - 0.05 * dot) + 0.1 * dot, k * (1 - 0.05 * dot) + 0.06 * dot];
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
 * The materials, made once, plain and with their surfaces. `bark` thick wood, matt, its flaking strips; `twig` young
 * wood, a little glossy; `leaf` a leaf's two faces (one-sided, each its own colour, its underside its own normals):
 * glossy above, no clearcoat (a crown of small glossy leaves goes white at grazing angles with one); `rind` the fruit's
 * leathery, faintly glossy skin; `calyx` the fleshy, waxy calyx tube and lobes of the flower and the fruit's crown;
 * `sheet` thin things seen from both sides (petals); `body` buds, stalks, stamens, roots.
 */
const MATERIALS = {
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, specularIntensity: 0.3, ...(s && { map: s('leafMap') }) }),
	rind: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.45, ...(s && { map: s('rindMap') }) }),
	calyx: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'calyx', 'rind', 'prop'];
// a pomegranate has tens of thousands of small leaves and hundreds of flowers: a crowd far off draws a share of them
const THINNED = { leaf: true, sheet: true, calyx: true };

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
 * 2. ORGANS — the Wonderful's own, each to its measure
 * ============================================================================================================== */

/**
 * The Wonderful's numbers. Sizes in metres from the data sheet (the cultivar where it was measured, the species
 * otherwise); outlines and colours traced off its reference sheet (play file 9f2814aa…, Nano Banana Pro, 2026-11-05,
 * sheet 1 with four cells redrawn and grey-balanced to its own checker) with plant-skill's trace.py, the colours as
 * the sheet's hex (sRGB) medians, the spread its p10–p90.
 */
const PG = {
	// a hardwood cutting of last year's wood, 25–30 cm long and 6–13 mm thick [CV, UC], set so two buds show
	cutting: { length: 0.28, radius: 0.0055, colour: '#6e6258', cut: '#d8c9a4' },
	// leaf: long and narrow (UPOV, example 'Wonderful'), ~6 × 1.7 cm on long shoots, 3–5 × 1–1.4 on spurs [EST from
	// measured cultivars]; stalk 4–6 mm, reddish; the sheet's upper side, underside, young shoot tip and autumn leaf
	leaf: { length: 0.06, width: 0.017, petiole: 0.005, top: '#435d2e', topDark: '#38502a', topLight: '#55703a', under: '#82956c', vein: '#8fa468', young: '#856232', youngRed: '#7a3424', autumn: '#e4ac22', autumnLate: '#d68d1c', petioleColour: '#8a4636' },
	// flower: the calyx tube fleshy orange-red (UPOV note 2, example 'Wonderful'), the perfect ('vase') flower ~42 mm
	// long, its ovary ~1.5 cm wide; 5–7 lobes (5.8 on average) ~1 cm long; as many crumpled scarlet petals 1.5–3 cm;
	// ~170 stamens, red filaments, yellow anthers [CV, Ferrara 2023; Wetzstein 2011]; colours the sheet's front flower,
	// tube and bud
	flower: { tube: 0.026, bellTube: 0.02, lobe: 0.011, petal: 0.024, petalColour: '#f4561c', petalDeep: '#d63a10', petalLight: '#f87a40', calyx: '#e2602c', calyxDeep: '#c84e14', calyxTip: '#d8a24a', inner: '#b8341a', filament: '#d8442a', anther: '#f0c23c', bud: '#d94e30', pedicel: 0.005 },
	// fruit: ~10.5 cm across and ~9 cm high (10.8 × 8.9 [CV, Adiletta 2018]), 350–550 g; the crown long and broad
	// (UPOV), 1.9 cm [CV] (2–2.5 cm the brief), its mouth 2.5–3.5 cm; rind 3.9 mm [CV]; colours the sheet's four ages
	fruit: { width: 0.105, height: 0.09, crown: 0.022, mouth: 0.0145, stalk: 0.007, set: '#7e561d', green: '#6f7a24', greenLate: '#949a3a', yellow: '#c8a050', blush: '#c4584a', red: '#b83a3e', ripe: '#b42c32', ripeShade: '#86161f', streak: '#c85a54', crownTip: '#7a4a2a', stamen: '#5a3424', inner: '#5a1a16' },
	// bark: the sheet's three swatches (a red four-angled current shoot, a grey two-year shoot with a spur and a thorn;
	// its old bark drawn red and stringy, against the data sheet's grey and flaking, so the old bark is the data
	// sheet's and the bearing tree's trunks on the sheet: '#685b52')
	bark: { shoot: '#884d3f', shootShade: '#6e5a3e', two: '#81766f', old: '#6c625a', strip: '#8a8076', under: '#a8957e', fissure: '#3e352e', lichen: '#9a9a86', thorn: '#8f857b' },
	root: { young: '#eadfc6', old: '#7a4c34' },
};

/**
 * The leaf's outline: half-widths along the blade (0 at the stalk … 1 at the tip, parts of its greatest width),
 * traced off the sheet's leaf (upper side) from its base: narrowly oblong-lanceolate, the base tapering into the short
 * stalk in a short wedge, widest about the middle, the tip blunt; the blade 3.5 : 1 (the data sheet's; the sheet's 3.4).
 */
const LEAF_W = [0.06, 0.33, 0.49, 0.62, 0.73, 0.82, 0.89, 0.93, 0.96, 0.99, 1, 0.97, 0.96, 0.94, 0.91, 0.86, 0.8, 0.73, 0.64, 0.51, 0.33, 0];
/**
 * The fruit's body from its stalk end to the foot of its crown: half-widths as parts of the greatest, traced off the
 * sheet's ripe fruit (its crown cut off): round, a little flattened, widest just below the middle, the shoulder drawn
 * in to the crown's foot (a third of its width). Its height from the data sheet (10.8 × 8.9 cm), not the sheet's.
 */
const FRUIT_W = [0, 0.32, 0.55, 0.71, 0.82, 0.89, 0.94, 0.97, 0.99, 1, 1, 0.99, 0.96, 0.93, 0.89, 0.82, 0.73, 0.57, 0.32];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- the cutting ---- */

/**
 * The hardwood cutting: a straight piece of last year's wood, 28 cm × 11 mm, grey-brown with a few small pale
 * lenticels, cut square below a node at its foot and slanting above a bud at its top; its buds in opposite pairs.
 * Planted with 21 cm in the soil. It stays as the old base of the plant, swallowed by the trunks' foot.
 */
function cutting(bag, base, t, seed) {
	const C = PG.cutting;
	const top = base.clone().add(v3(0, C.length, 0));
	const ns = hashText(seed) % 997;
	const swell = 1 + 1.6 * span(t, 0.3, 4);
	const pts = [];
	for (let k = 0; k <= 12; k++) pts.push(base.clone().lerp(top, k / 12));
	const geo = tube(
		pts,
		(u, v) => C.radius * swell * (1 + 0.04 * Math.cos(v * Math.PI * 4)) * (u > 0.95 ? 1 - (u - 0.95) * 4 * (0.5 + 0.5 * Math.cos(v * Math.PI * 2)) : 1),
		(u, v, s) => {
			const c = mix(C.colour, '#6a5e54', noise3(v * 6, s * 40, ns, 2) * 0.6);
			if (noise3(v * 30, s * 300, ns + 3) > 0.82) c.lerp(named('#c8bca8'), 0.6);
			return c;
		},
		10,
		true,
	);
	bag.add('twig', geo);
	// the slanting cut at its top: the pale wood
	if (t < 1.5) bag.add('body', bead(top.clone().add(v3(0, -0.002, 0)), v3(C.radius * 0.9, 0.0012, C.radius * 0.9), C.cut, 6));
}

/* ---- bark ---- */

/**
 * Pomegranate bark by the age (years) and radius (m) of the wood, at a place on it (`v` round it, `s` along it, `sun`
 * 0 … 1 how much it faces the light): this year's shoot smooth and red (wine-red to red-brown on the sunny side,
 * greener in shade), four-angled; two-year wood grey to grey-brown, smooth, a few pale lenticels; old wood grey to
 * grey-brown, fluted and twisted, its thin bark peeling in long narrow strips with paler grey-buff under them.
 */
const OLD = (r) => clamp((r - 0.01) / 0.025);
function barkColour(age, r, v, s, sun, ns) {
	const B = PG.bark;
	if (age < 0.7) return mix(B.shootShade, B.shoot, 0.35 + 0.65 * sun).lerp(named(B.two), clamp((age - 0.45) / 0.25) * 0.8);
	const c = mix(B.two, B.old, clamp((r - 0.004) / 0.012) * 0.7 + clamp((age - 2) / 6) * 0.3);
	const o = OLD(r);
	if (o > 0) {
		const a = v * Math.PI * 2;
		const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
		// strips: long cells running up the trunk, following its twist
		const cl = cells(cx * 70, s * 7, cz * 70, ns + 3);
		const strip = mix(B.old, B.strip, cl.id * 0.9);
		c.lerp(strip, o * 0.8);
		if (cl.id < 0.18) c.lerp(named(B.under), 0.65 * o);
		c.lerp(named(B.fissure), smooth((0.08 - cl.edge) / 0.06) * 0.5 * o);
		// a little lichen on the shaded side of old wood
		const lich = smooth((fbm(cx * 40, s * 14, cz * 40, 3, ns + 9) - 0.62) / 0.08) * clamp(0.3 - Math.sin(a)) * o;
		c.lerp(named(B.lichen), lich * 0.35);
	} else if (noise3(v * 40, s * 400, ns + 7) > 0.84) c.lerp(named('#b8ad9c'), 0.5);
	return c;
}

/* ---- the leaf ---- */

/**
 * One leaf on its short reddish stalk from the node: the blade narrow and flat, a little folded along the midrib, its
 * tip held out or a little down; glossy dark green above with a paler midrib, paler matt green below (its own
 * normals: seen from below it is its underside, not the sky); new leaves bronze-red to coppery, greening in two to
 * three weeks; butter-yellow in November, then gone. `age` 0 … 1 from bud to grown (the flush colour by `young`, 0 …
 * 1, weeks since it unfolded), `fall` 0 … 1.
 */
function leaf(bag, at, dir, size, age, young, fall, r, close = false, few = false) {
	const L = PG.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const len = L.length * size * lerp(0.3, 1, smooth(age));
	const petLen = L.petiole * size * lerp(0.5, 1, smooth(age));
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = lerp(1.0, about(r, 0.45, 0.3), smooth(age * 1.4));
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const end = at.clone().addScaledVector(pd, petLen);
	const hue = r();
	const autumn = (u) => mix(mix(L.autumn, '#e8c84a', hue * 0.5), L.autumnLate, clamp(fall * 1.3 - 0.4 + u * 0.2));
	if (close) bag.add('body', tube([at, end], (u) => 0.0006 * size * (1 - 0.3 * u), () => (fall > 0.3 ? autumn(0) : L.petioleColour), close ? 5 : 3));
	const droop = lerp(0.3, about(r, 0.05, 0.45), smooth(age * 1.3)) - fall * 0.3;
	const bd = flat.clone().applyAxisAngle(UP, about(r, 0, 0.3)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = lerp(0.6, about(r, 0.16, 0.06), smooth(age));
	const curl = about(r, 0.06, 0.05);
	const ns = Math.floor(r() * 1000);
	const shade = r();
	const top = (u, v) => {
		const c = mix(mix(L.top, L.topLight, shade * 0.6), L.topDark, clamp((noise3(u * 3, v * 2, ns, 3) - 0.45) * 1.5) * 0.4);
		if (young > 0) c.lerp(named(mix(L.youngRed, L.young, u * 0.6 + 0.2)), young);
		if (Math.abs(v) < 0.06) c.lerp(named(young > 0.3 ? '#9a4a34' : L.vein), 0.35 * (1 - u * 0.5));
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.2 - Math.abs(v) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#93a37a', shade * 0.4);
		if (young > 0) c.lerp(named('#8a6a46'), young * 0.8);
		if (Math.abs(v) < 0.07) c.lerp(named('#a8b48c'), 0.3);
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.2));
		return c;
	};
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: (u) => along(LEAF_W, u),
		lift: (u, v) => fold * Math.abs(v) * 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.006 * Math.sin(u * 9 + v * 3) * v * v,
		paint: top,
		back: under,
		backLit: false,
		along: close ? 30 : DETAIL.level >= 0.5 && !few ? 3 : 2,
		across: close ? 8 : 1,
	});
	// held at every angle: a pomegranate's narrow leaves stand up and to the side along their twigs, not flat in a plane
	// (held flat, a crown seen from the side is every blade edge-on, and see-through)
	bag.add('leaf', blade, aim(end, bd, about(r, 0, 1.15)));
}

/* ---- the calyx: the flower's fleshy tube and lobes, and the fruit's crown ---- */

/**
 * A calyx: a fleshy tube standing on +Y from the origin, its radius `rAt(z)` at height z (0 … H), opening into `n`
 * thick triangular lobes `L` long whose sides run down to the notches between them; the lobes lean out by `spread`
 * radians (negative: closed over a bud) and curl by `curl`. Outside and inside faces, `thick` apart, and the rim
 * joining them. `paint(z, side, tri, inner)` its colour: z the height, `tri` 1 on a lobe's middle, 0 at a notch.
 * Built as one lathe whose top edge is a zigzag, so a crown is a crown at every distance.
 */
function calyx(o) {
	const { H, L, n, rAt, spread, curl = 0, thick, paint, roll = 0 } = o;
	const per = o.per ?? 8;
	const rows = o.rows ?? 10;
	const cols = n * per;
	const pos = [], uv = [], col = [], idx = [];
	const at = (z, phi, inner) => {
		let r = rAt(Math.min(z, H));
		if (z > H) {
			const e = z - H;
			r += Math.sin(spread) * e + curl * e * e / Math.max(1e-6, L);
			z = H + Math.cos(spread) * e;
		}
		if (inner) r = Math.max(r * 0.15, r - thick);
		return [r * Math.cos(phi), z, r * Math.sin(phi)];
	};
	const face = (inner) => {
		const base = pos.length / 3;
		for (let i = 0; i <= rows; i++) {
			const u = i / rows;
			for (let j = 0; j <= cols; j++) {
				const phi = roll + (j / cols) * Math.PI * 2;
				const tri = 1 - Math.abs(2 * ((j % per) / per) - 1); // 1 on a lobe's middle, 0 in a notch
				const top = H + L * Math.pow(tri, 0.9);
				const z = u * top;
				const p = at(z, phi, inner);
				pos.push(p[0], p[1], p[2]);
				uv.push(j / cols, u);
				const c = toColor(paint(z, j / cols, tri, inner));
				col.push(c.r, c.g, c.b);
			}
		}
		for (let i = 0; i < rows; i++)
			for (let j = 0; j < cols; j++) {
				const a = base + i * (cols + 1) + j, b = a + cols + 1;
				if (!inner) idx.push(a, b, a + 1, b, b + 1, a + 1);
				else idx.push(a, a + 1, b, b, a + 1, b + 1);
			}
		return base;
	};
	const outer = face(false);
	const inner = face(true);
	// the rim: the top row of the outside joined to the top row of the inside
	for (let j = 0; j < cols; j++) {
		const a = outer + rows * (cols + 1) + j, b = inner + rows * (cols + 1) + j;
		idx.push(a, b, a + 1, b, b + 1, a + 1);
	}
	return made(pos, new Array(pos.length).fill(0), uv, col, idx, true);
}

/** a table's value straight between rows of [x, value] (for profiles) */
const profile = (rows) => (x) => straight(x, rows);

/* ---- the flower ---- */

/**
 * One flower at the end of its short pedicel, facing along `facing`. The calyx is its body: a fleshy waxy orange-red
 * tube, in the perfect ('vase') flower swollen at its foot round the ovary (~1.5 cm) and drawn in above it, in the
 * functionally male ('bell') flower a slim cone; its 5–7 thick pointed lobes spread as it opens. Between them as many
 * thin crumpled scarlet petals rise out of the mouth, the open flower 4–5 cm across, and inside a dense brush of about
 * 170 stamens, red filaments with yellow anthers, round one style. A bud is the closed calyx, a pointed red vase.
 * `open` 0 … 1, `fall` 0 … 1 (petals drop; a male flower drops whole, from the caller).
 */
function flower(bag, at, facing, open, fall, perfect, r, close = false, parts) {
	const F = PG.flower;
	const n = parts ?? flowerParts(r);
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const roll = r() * Math.PI * 2;
	const base = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const grow = lerp(0.55, 1, smooth(open * 1.3 + 0.2));
	const H = (perfect ? F.tube : F.bellTube) * grow;
	const rAt = perfect
		? profile([[0, 0.003], [0.12, 0.0052], [0.35, 0.0066], [0.65, 0.0072], [0.88, 0.0078], [1, 0.009]].map(([z, v]) => [z * H, v * grow]))
		: profile([[0, 0.0018], [0.25, 0.0034], [0.55, 0.0054], [0.8, 0.0064], [1, 0.0076]].map(([z, v]) => [z * H, v * grow]));
	const mouth = rAt(H);
	const L = F.lobe * grow;
	// closed: the lobes meet over the bud; open: they spread ~35°
	const spread = lerp(-Math.atan2(mouth, L) * 0.95, perfect ? 0.95 : 0.7, smooth((open - 0.05) / 0.5));
	const paint = (z, v, tri, inner) => {
		if (inner) return mix(F.inner, '#d86a3a', z / (H + L));
		const c = mix(F.calyxDeep, F.calyx, smooth(z / H) * 0.8 + 0.2 * noise3(v * 9, z * 300, roll * 10));
		if (z > H) c.lerp(named(F.calyxTip), smooth((z - H - L * 0.55) / (L * 0.45)) * 0.55 * tri);
		return c;
	};
	bag.add('calyx', calyx({ H, L, n, rAt, spread, curl: open > 0.3 ? 0.15 : 0, thick: 0.0018, paint, roll, per: close ? 8 : open < 0.12 || DETAIL.level < 1 ? 1 : 2, rows: close ? 14 : 2 }), base);
	if (open < 0.12) return n;
	// the petals: as many as the lobes, standing between them out of the mouth, crumpled like tissue paper
	if (fall < 1) {
		for (let k = 0; k < n; k++) {
			const pr = chance(roll, 'petal', k);
			const len = F.petal * (perfect ? 1 : 0.85) * lerp(0.4, 1, smooth((open - 0.1) / 0.5)) * about(pr, 1, 0.1);
			const ns = pr() * 100;
			const p = sheet({
				length: len,
				width: len * 0.42,
				// obovate on a short claw: narrow at the mouth, broad and round at its end
				shape: (u) => (0.22 + 0.78 * smooth(u / 0.55)) * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.6) / 0.41, 2))),
				lift: (u, v) => 0.1 * v * v * u + 0.06 * u * (noise3(u * 5, v * 4, ns) - 0.5) + 0.035 * Math.sin(u * 17 + v * 9 + ns) * u + 0.025 * Math.sin(v * 13 - u * 6 + ns) * u,
				paint: (u, v) => mix(mix(F.petalDeep, F.petalColour, smooth(u / 0.4)), F.petalLight, 0.25 * noise3(u * 6, v * 5, ns)).lerp(named('#8a3a24'), fall * 0.5),
				along: close ? 14 : 2,
				across: close ? 10 : 1,
			});
			const a = roll + (k / n) * Math.PI * 2; // in a notch between two lobes (the lobes' middles are at k + ½)
			// rising in a loose cup out of the mouth, ~20° from upright (the sheet's flowers), opening a little more with age
			const up = lerp(0.1, perfect ? 0.52 : 0.36, smooth((open - 0.15) / 0.7)) + fall * 0.9 + about(pr, 0, 0.08); // from upright
			const m = base.clone().multiply(new THREE.Matrix4().makeTranslation(Math.cos(a) * mouth * 0.8, H - 0.001, Math.sin(a) * mouth * 0.8)).multiply(new THREE.Matrix4().makeRotationY(-a)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 - up));
			bag.add('sheet', p, m);
		}
	}
	// a crowd far off: the calyx and petals alone
	if (!close && DETAIL.level < 0.5) return n;
	stamens(bag, base, H, mouth, open, fall, perfect, close, roll);
	return n;
}

/** how many lobes and petals a flower (and its fruit's crown) has: 5–7, mostly 6 (5.8 on average in 'Wonderful') */
function flowerParts(r) {
	const x = r();
	return x < 0.22 ? 5 : x < 0.9 ? 6 : 7;
}

/** the brush of stamens in the mouth of the calyx: red filaments, yellow anthers; browning as they dry on the fruit */
function stamens(bag, base, H, mouth, open, dry, perfect, close, roll) {
	const F = PG.flower;
	const n = close ? 90 : 14;
	const brown = clamp(dry * 1.2);
	const fil = mix(F.filament, PG.fruit.stamen, brown);
	const ant = mix(F.anther, '#6a4a2a', brown);
	const pos = [], col = [], idx = [];
	for (let k = 0; k < n; k++) {
		const a = roll + k * 2.39996;
		const ring = Math.sqrt((k + 0.5) / n);
		const r0 = mouth * (0.2 + 0.55 * ring);
		const len = lerp(0.005, 0.0075, (k * 0.618) % 1) * lerp(0.6, 1, open) * (1 - 0.5 * brown);
		const tilt = lerp(0.05, 0.32, ring) * lerp(0.6, 1, open) + brown * 0.1;
		const d = v3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
		const p0 = v3(Math.cos(a) * r0, H - 0.005, Math.sin(a) * r0);
		const p1 = p0.clone().addScaledVector(d, len);
		if (close) {
			bag.add('body', tube([p0, p1], () => 0.00014, () => fil, 3), base);
			bag.add('body', bead(p1, v3(0.00045, 0.00032, 0.00045), ant, 3), base);
		} else {
			// far off: each stamen a thin blade, the brush as one sheet
			const s = across(d).multiplyScalar(0.00035);
			const at0 = pos.length / 3;
			const tip = p1.clone().addScaledVector(d, 0.0008);
			for (const [p, c] of [[p0.clone().sub(s), fil], [p0.clone().add(s), fil], [p1.clone().sub(s), ant], [p1.clone().add(s), ant], [tip, ant]]) {
				pos.push(p.x, p.y, p.z);
				const cc = toColor(c);
				col.push(cc.r, cc.g, cc.b);
			}
			idx.push(at0, at0 + 1, at0 + 2, at0 + 2, at0 + 1, at0 + 3, at0 + 2, at0 + 3, at0 + 4);
		}
	}
	if (!close) bag.add('sheet', made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true), base);
	// the style: one, from the ovary to just over the stamens
	if (perfect && close) bag.add('body', tube([v3(0, H * 0.3, 0), v3(0, H + 0.004, 0), v3(0.0008, H + 0.009, 0)], (u) => 0.0005 * (1 - 0.3 * u) + 0.0004 * Math.max(0, (u - 0.85) / 0.15), () => mix('#d8442a', '#e8b040', 0.3), 5, true), base);
}

/* ---- the fruit ---- */

/** how big a fruit is, 0 … 1 of its ripe size, by days after its flower opened: from the ovary (~1.5 cm) to ~155 d */
const RIPE_DAYS = 155;
function fruitSize(d) {
	return table(d, [
		[0, 0.14],
		[10, 0.19],
		[30, 0.38],
		[60, 0.58],
		[90, 0.76],
		[120, 0.9],
		[RIPE_DAYS, 1],
	]);
}

/**
 * The rind by days after the flower opened and how much it faces the sun (`lit` 0 … 1): bronze-green as it sets, dark
 * green at three weeks, lighter yellow-green by ten; at about eleven weeks after the petals fall the red breaks on
 * the sunny side and spreads over it, deep red by twenty-two weeks (Ginzberg & Faigenboim 2022, 'Wonderful'); ripe a
 * deep crimson, the shaded side a little darker and browner. Its colours the sheet's set, green, colouring and ripe
 * fruit.
 */
function rindAt(d, lit) {
	const R = PG.fruit;
	let c;
	if (d < 20) c = mix(R.set, R.green, d / 20);
	else if (d < 70) c = mix(R.green, R.greenLate, (d - 20) / 50);
	else c = mix(R.greenLate, R.yellow, clamp((d - 70) / 30));
	const blush = clamp((d - 82 + 25 * lit) / 62);
	if (blush > 0) {
		const red = mix(R.blush, R.red, clamp((d - 95) / 30));
		red.lerp(named(R.ripe), clamp((d - 120) / 30));
		red.lerp(named(R.ripeShade), (1 - lit) * 0.45 * clamp((d - 110) / 40));
		c.lerp(red, smooth(blush));
	}
	return c;
}

/**
 * One fruit, built standing on its stalk end at the origin up +Y: the body a lathe of the traced profile (round, a
 * little flattened, faintly lumpy over its chambers), widest just below its middle, the shoulder drawn in to the crown;
 * the crown the calyx grown on (its tube 1.2–1.4 cm and its 5–7 thick lobes ~1 cm), spread wide over the young fruit,
 * standing up stiff and a little out on the ripe one, dry brown stamens in its mouth. `sun` the light's direction in
 * the fruit's own frame. `n` the lobes (its flower's).
 */
function fruitGeometry(bag, m, o) {
	const { W, H, days, sun, ns, res, n, roll } = o;
	const R = PG.fruit;
	const rings = res ? 120 : fewer(12, 6);
	const sides = res ? 144 : fewer(14, 6);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const neck = Math.max(0.32 * W * 0.5, 0.0052);
	const topRatio = neck / (W * 0.5);
	const ell = (u) => Math.sqrt(Math.max(0, 1 - Math.pow(1 - 2 * u, 2)));
	const prof = (u) => {
		let p = u < 0.06 ? (along(FRUIT_W, 0.06) / ell(0.06)) * ell(u) : along(FRUIT_W, u);
		// a young fruit is the ovary under its calyx: its shoulder goes straight into the tube
		if (topRatio > 0.33) p = Math.max(p, topRatio * smooth((u - 0.55) / 0.45));
		return p;
	};
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((Math.PI * i) / rings)) / 2;
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2 + roll;
			// faint lumps over the chambers and an unevenness of its own
			const lump = 1 + 0.007 * Math.cos(ph * n) * Math.sin(Math.PI * u) + 0.03 * (fbm(Math.cos(ph) * 1.4, Math.sin(ph) * 1.4, u * 2.2, 2, ns) - 0.5);
			const rr = (W / 2) * prof(u) * lump;
			let y = H * u - 0.0012 * (W / 0.1) * Math.exp(-Math.pow(u / 0.05, 2));
			const x = rr * Math.cos(ph), z = rr * Math.sin(ph);
			pos.push(x, y, z);
			nor.push(0, 0, 0);
			uv.push((j / sides) * 3, u * 3);
			const nn = v3(Math.cos(ph), 0.5 * (u - 0.5), Math.sin(ph)).normalize();
			const lit = Math.max(0, nn.dot(sun));
			const c = rindAt(days + 14 * (fbm(x * 40, y * 40, z * 40, 2, ns + 9) - 0.5), lit);
			// the ripe rind's paler streaks and patches running from the stalk to the crown (the sheet's ripe fruit)
			if (days > 110) c.lerp(named(R.streak), smooth((fbm(Math.cos(ph) * 6, Math.sin(ph) * 6, u * 1.6, 3, ns + 5) - 0.56) / 0.12) * 0.45 * clamp((days - 110) / 40));
			// fine russet streaks and the stalk end a little browner
			c.lerp(named('#6a3a26'), clamp(1 - u / 0.06) * 0.35);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const body = smoothNormals(made(pos, nor, uv, col, idx, false));
	bag.add('rind', body, m);
	// the crown: its tube from the shoulder, waisted a little, then flaring into the lobes
	const size = fruitSize(days);
	const Hc = lerp(0.016, 0.0135, size) * lerp(0.85, 1, size);
	const L = lerp(0.011, 0.0108, size);
	const mouth = Math.max(neck * 0.95, lerp(0.0085, R.mouth, size));
	const rAt = profile([[0, neck], [0.4 * Hc, Math.min(neck, mouth) * 0.88], [Hc, mouth]]);
	// spread wide over the young fruit (its flower's calyx), stiff and nearly upright on the ripe one, the tips turned out
	const spread = lerp(0.5, 0.06, smooth((days - 8) / 45));
	const curl = lerp(0.1, 0.12, smooth((days - 40) / 80));
	const crownColour = (z, v, tri, inner) => {
		if (inner) return mix(R.inner, '#3a1a12', z / (Hc + L));
		const flowerRed = mix(PG.flower.calyxDeep, PG.flower.calyx, 0.6);
		const c = rindAt(days - 6, 0.6).lerp(flowerRed, clamp(1 - days / 40) * 0.8);
		if (z > Hc) c.lerp(named(R.crownTip), smooth((z - Hc - L * 0.6) / (L * 0.4)) * tri * clamp((days - 50) / 60) * 0.7);
		return c;
	};
	bag.add('calyx', calyx({ H: Hc, L, n, rAt, spread, curl, thick: 0.002, paint: crownColour, roll, per: res ? 10 : 2, rows: res ? 18 : 3 }), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, H - 0.0006, 0)));
	if (res || DETAIL.level >= 1) stamens(bag, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, H, 0)), Hc, mouth * 0.9, 1, 1, false, res, roll);
}

/**
 * A fruit on the wood, from `at` along `dir` (its stalk end there, its crown away: on the tree it hangs crown down
 * from the tip of its shoot, the bent shoot doing the hanging): a short thick pedicel, the fruit, sized by `days`
 * after its flower opened.
 */
function fruit(bag, at, dir, days, sunWorld, seedKey, key, n) {
	const R = PG.fruit;
	const size = fruitSize(days);
	const r = chance(seedKey, 'fruit', key);
	const k = about(r, 1, 0.08);
	const W = R.width * size * k;
	const H = W * lerp(1.02, R.height / R.width, smooth(size)) * about(r, 1, 0.03);
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	const res = DETAIL.fruit === key;
	const stalk = R.stalk * lerp(0.6, 1, size);
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	bag.add('body', tube(res ? [v3(0, 0, 0), v3(0, stalk * 0.5, 0.0005), v3(0, stalk, 0)] : [v3(0, 0, 0), v3(0, stalk, 0)], (u) => 0.0018 + 0.0012 * u * size, () => mix('#6a5a3a', '#8a4636', 0.4), res ? 10 : 4), m);
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const mf = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, stalk - 0.001, 0));
	if (DETAIL.level < 0.5 && !res) {
		// a crowd far off: each fruit a ball of its colour with its crown as a nub
		bag.add('body', bead(v3(0, H * 0.5, 0), v3(W / 2, H / 2, W / 2), rindAt(days, 0.5), 3), mf);
		bag.add('body', bead(v3(0, H + 0.008, 0), v3(0.009 * size + 0.004, 0.012, 0.009 * size + 0.004), rindAt(days - 6, 0.5), 2), mf);
		return { H, W, stalk };
	}
	fruitGeometry(bag, mf, { W, H, days, sun, ns: hashText(key) % 991, res, n, roll });
	return { H, W, stalk };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the plant grows, in numbers. A 'Wonderful' from a hardwood cutting on its own roots in a California orchard
 * (no rootstocks are used there), trained as a multi-trunk vase: in its first year the cutting sends up five to seven
 * reddish shoots from its buds and from below the soil, a bush of ~1.2 m; that winter four of them (three to five)
 * are kept as its trunks and the rest cut out, and each year suckers come up from its foot and are cut away. The
 * trunks lean out 10–25° and branch from 0.4 m up into a dense, twiggy, rounded vase as wide as it is tall: laterals in
 * opposite pairs, short spurs crowded with leaves, many ending in a sharp thorn, the outer shoots arching over under
 * the fruit. Calibrated to the data sheet: ~1.2 m in its first autumn, 2–2.5 m with stems 2.5–3.5 cm in its third,
 * 3–3.5 m and 3–4 m across with stems 7–10 cm in its eighth.
 */
const TREE = {
	depth: 0.21, // the cutting's foot under the soil (its top 7 cm above)
	leader: [0.95, 0.6, 0.45, 0.36, 0.3, 0.25, 0.21, 0.18, 0.16, 0.15], // a trunk's extension each year (m)
	// a side axis's first year by its order (1 the laterals off the trunks), at vigour 1, and how each later year fades
	shoot: [0, 0.46, 0.32, 0.22, 0.15],
	fade: [1, 0.74, 0.58, 0.47, 0.4, 0.35, 0.32, 0.3],
	clear: 0.4, // the trunks kept clear of side shoots to this height
	internode: 0.03,
	tipRadius: 0.0009,
	pipeLength: 1.1e-7,
	spurRadius: 0.0017,
	firstFlowers: 1, // a few flowers in its second summer
	firstFruit: 2, // the first fruit kept in its third (UGA: first fruit in year 2–3)
};

/** a year's season: `year` since planting, `s` 0 … 1 from 1 February round */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year };
};
const FALL = [0.76, 0.86]; // leaves yellow through November and are down by early December
/** how much of a year's extension is grown at `dt` years into that year: from bud break (late March) to August */
const extension = (dt, first) =>
	first
		? table(dt, [[0.17, 0], [0.24, 0.12], [0.33, 0.45], [0.43, 0.78], [0.53, 0.95], [0.62, 1]])
		: table(dt, [[0.14, 0], [0.2, 0.15], [0.3, 0.5], [0.4, 0.8], [0.5, 0.95], [0.58, 1]]);

/**
 * The plant's axes at time t: each axis a polyline as far as grown, its nodes (in opposite pairs), the year each part
 * grew in, and the axes it bears. Every axis and node draws its own chance, so the plant at an earlier t is the first
 * part of the plant at a later one; what the grower cuts out is drawn until it is cut.
 */
function axes(seed, t, load) {
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.06);
	const { year: nowYear } = seasonOf(t);

	const grow = (key, from, dir, born, order, vigour, kind, parent, at, extra = {}) => {
		if (t < born + 0.001) return null;
		if (extra.removed !== undefined && t >= extra.removed) return null;
		// what dies falls, with all it bears: spurs after a few years, fine shoots inside the crown after some more
		if (extra.life !== undefined && t >= born + extra.life) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, pts: [from.clone()], years: [Math.floor(born)], nodes: [], kids: [], vigour, dir0: dir.clone(), ...extra };
		all.push(ax);
		if (kind === 'thorn') {
			// a short shoot ending in a stiff sharp spine, grown in the season it was born and no more
			const f = span(t - born, 0, 0.12);
			const len = extra.length * f;
			ax.pts.push(from.clone().addScaledVector(dir, Math.max(0.0005, len)));
			ax.years.push(Math.floor(born));
			ax.tipYear = Math.floor(born);
			return ax;
		}
		if (kind === 'spur') {
			// a spur: short, knobbly, a few millimetres a year, crowded with leaves; it bears the flowering shoots
			const d = dir.clone();
			let p = from.clone();
			const yearsOld = Math.min(8, Math.floor(t - born) + 1);
			for (let y = 0; y < yearsOld; y++) {
				const f = y === yearsOld - 1 ? span(t - (born + y), 0.14, 0.3) : 1;
				const len = between(r, 0.004, 0.009) * (y === 0 ? 2.5 : 1) * f;
				d.add(v3(about(r, 0, 0.2), 0.08, about(r, 0, 0.2))).normalize();
				p = p.clone().addScaledVector(d, Math.max(0.0005, len));
				ax.pts.push(p);
				ax.years.push(Math.floor(born) + y);
			}
			ax.tipYear = Math.floor(born) + yearsOld - 1;
			return ax;
		}
		const d = dir.clone().normalize();
		const outward = from.clone().setY(0);
		let node = 0;
		const y0 = Math.floor(born);
		const sylleptic = !!extra.sylleptic; // born in the season, from a bud of a shoot still growing
		for (let y = y0; y <= Math.floor(t); y++) {
			const ageAxis = y - y0;
			const first = y === 0;
			let len;
			if (kind === 'stem') len = TREE.leader[Math.min(y, TREE.leader.length - 1)] * vigour * vigourTree * about(r, 1, 0.05);
			else if (kind === 'sucker') len = extra.length * vigour;
			else len = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree;
			// an old tree's shoots shorten as it comes into full crop
			if (kind === 'long') len *= lerp(1, 0.75, clamp((y - 3) / 4));
			if (sylleptic && y === y0) len *= 0.5;
			if (len < 0.025) break;
			const f = sylleptic && y === y0 ? span(t - born, 0, 0.25) : extension(t - y, first);
			if (f <= 0) break;
			const step = 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'stem' || kind === 'sucker') {
					// a trunk keeps its lean out from the middle and wanders a little (old trunks are twisted, never straight)
					// the vase opens as it grows: higher up a stem leans further out
					const lean = (ax.lean ?? 0.2) + (kind === 'stem' ? 0.2 * clamp((ax.pts[ax.pts.length - 1].y - 0.8) / 2) : 0);
					const want = v3(Math.cos(ax.bearing) * Math.sin(lean), Math.cos(lean), Math.sin(ax.bearing) * Math.sin(lean));
					d.addScaledVector(want, 0.25).add(v3(about(r, 0, 0.05), 0, about(r, 0, 0.05)));
				} else {
					// a lateral keeps to its angle and rises a little to the light; its fine wood arches over and down as it
					// lengthens, the more under the season's fruit
					const up = (order === 1 ? 0.018 : 0.016) * (1 - 0.85 * (ax.low ?? 0));
					const bend = 0.0034 * (order + 0.4) * Math.min(5, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.35);
					const sag = bend * (1 + 1.3 * load * (order >= 2 ? 1 : 0.5));
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(0.02) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, 0.07);
					d.add(v3(about(r, 0, 0.07) + out.x, up - sag, about(r, 0, 0.07) + out.z));
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				while (node * TREE.internode < (ax.nodeBase ?? 0) + walked) {
					const within = node * TREE.internode - (ax.nodeBase ?? 0);
					const u = within / len;
					const start = sylleptic && y === y0 ? born - y : first ? 0.18 : 0.15;
					ax.nodes.push({ i: node, year: y, u, s: node * TREE.internode, formed: y + start + (sylleptic && y === y0 ? 0.25 : 0.38) * Math.pow(clamp(u), 1.2) });
					node++;
				}
			}
			ax.nodeBase = (ax.nodeBase ?? 0) + grown;
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
			n.bearing = phase + n.i * (Math.PI / 2); // decussate: each pair a quarter turn from the last
		}
		if (kind === 'sucker') return ax;
		// the buds in each node's two axils: the next spring each breaks into a long shoot, a spur, or stays asleep; some
		// break at once as thorny short shoots, and on vigorous young shoots a few as sylleptic laterals
		for (const n of ax.nodes) {
			for (const side of [0, 1]) {
				const br = chance(seed, 'bud', ...key, n.i, side);
				const u = n.u;
				const roll = br();
				const sd = across(n.dir).applyAxisAngle(n.dir, n.bearing + side * Math.PI);
				const h = n.at.y;
				if (kind === 'stem' && h < TREE.clear) continue; // the trunks kept clear below (the grower's)
				// a thorn: a short shoot ending in a spine, mostly on young laterals and weak wood
				const pThorn = kind === 'stem' ? 0.01 : order === 1 ? 0.02 : 0.022;
				if (roll > 1 - pThorn && t >= n.formed + 0.02) {
					const d0 = n.dir.clone().multiplyScalar(0.5).addScaledVector(sd, 1).normalize();
					const k = grow([...key, n.i, side, 't'], n.at.clone().addScaledVector(sd, 0.0015), d0, n.formed + 0.02, order + 1, 0, 'thorn', ax, n.s, { length: between(br, 0.012, 0.035) });
					if (k) ax.kids.push(k);
					continue;
				}
				// sylleptic: a lateral from a bud of a vigorous shoot still growing (pomegranates are twiggy from the first year)
				const sylleptic = (kind === 'stem' || (order === 1 && ax.vigour > 0.7)) && n.year === Math.floor(ax.born) + 0 && u > 0.25 && u < 0.85 && roll < (kind === 'stem' && n.year === 0 ? 0.28 : 0.07);
				if (!sylleptic && n.year + 1 > t - 0.01) continue;
				let pLong, pSpur, angle, vig;
				if (kind === 'stem') {
					pLong = u > 0.6 ? 0.34 : u > 0.3 ? 0.2 : 0.1;
					pSpur = 0.25;
					const low = clamp(1 - (h - TREE.clear) / 1.6);
					angle = lerp(0.75, 1.0, low) * about(br, 1, 0.12);
					vig = lerp(0.7, 1.0, u) * (0.95 + 0.1 * low) * about(br, 1, 0.12);
				} else {
					const yearLen = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * ax.vigour * TREE.fade[Math.min(n.year - Math.floor(born), TREE.fade.length - 1)];
					const above = sd.y > 0.55 ? 0.6 : sd.y < -0.55 ? 0.3 : 1;
					pLong = order >= 4 ? 0 : (u > 0.6 ? 0.18 : u > 0.3 ? 0.07 : u > 0.12 ? 0.02 : 0) * clamp(yearLen / 0.15) * above * (order === 3 ? 0.18 : order === 2 ? 0.45 : 1);
					pSpur = u > 0.06 && u < 0.95 ? 0.17 : 0.03;
					angle = (order === 1 ? lerp(0.7, 0.5, u) : lerp(0.8, 0.55, u)) * about(br, 1, 0.15);
					vig = ax.vigour * lerp(0.5, 0.85, u) * about(br, 1, 0.12);
				}
				if (sylleptic) {
					const d0 = n.dir.clone().multiplyScalar(Math.cos(0.9)).addScaledVector(sd, Math.sin(0.9)).normalize();
					const k = grow([...key, n.i, side, 'y'], n.at, d0, n.formed + 0.05, order + 1, 0.5 * vig, 'long', ax, n.s, { low: 0, sylleptic: true, life: lifeOf(br, order + 1) });
					if (k) ax.kids.push(k);
				} else if (roll < pLong) {
					const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(sd, Math.sin(angle)).normalize();
					const low = kind === 'stem' ? clamp(1 - (h - TREE.clear) / 1.6) : ax.low ?? 0;
					const k = grow([...key, n.i, side], n.at, d0, n.year + 1, order + 1, vig, 'long', ax, n.s, { low, life: lifeOf(br, order + 1) });
					if (k) ax.kids.push(k);
				} else if (roll < pLong + pSpur) {
					const d0 = n.dir.clone().multiplyScalar(0.4).addScaledVector(sd, 1).normalize();
					const k = grow([...key, n.i, side, 's'], n.at.clone().addScaledVector(sd, 0.001), d0, n.year + 1, order + 1, 0, 'spur', ax, n.s, { life: between(br, 3, 6) });
					if (k) {
						k.node = n;
						ax.kids.push(k);
					}
				}
			}
		}
		return ax;
	};

	// the shoots of the cutting: from its two top pairs of buds and from buds under the soil
	const rs = chance(seed, 'stems');
	const count = 5 + Math.floor(rs() * 3);
	const pick = rs();
	const keep = pick < 0.12 ? 3 : pick < 0.88 ? 4 : 5;
	const phase = rs() * Math.PI * 2;
	const stems = [];
	for (let i = 0; i < count; i++) {
		const sr = chance(seed, 'stem', i);
		const y = [0.058, 0.058, 0.026, 0.026, -0.03, -0.03, -0.07][i];
		const bearing = phase + i * 2.39996 + about(sr, 0, 0.25);
		stems.push({ i, y, bearing, vigour: i < 4 ? about(sr, 1, 0.12) : about(sr, 0.85, 0.12), lean: between(sr, 0.34, 0.5) });
	}
	const kept = new Set([...stems].sort((a, b) => b.vigour - a.vigour).slice(0, keep).map((s) => s.i));
	const trunks = [];
	for (const st of stems) {
		const from = v3(Math.cos(st.bearing) * 0.006, st.y, Math.sin(st.bearing) * 0.006);
		const dir = v3(Math.cos(st.bearing) * Math.sin(st.lean), Math.cos(st.lean), Math.sin(st.bearing) * Math.sin(st.lean));
		const ax = grow(['stem', st.i], from, dir, 0.17, 0, kept.has(st.i) ? Math.max(0.95, st.vigour) : Math.min(0.85, st.vigour), 'stem', null, 0, { bearing: st.bearing, lean: st.lean, removed: kept.has(st.i) ? undefined : 0.97 });
		if (ax) trunks.push(ax);
	}
	// suckers from the foot each year, cut away by the grower in the autumn
	for (let y = 1; y <= nowYear; y++) {
		const sr = chance(seed, 'suckers', y);
		const n = 1 + Math.floor(sr() * 3);
		for (let k = 0; k < n; k++) {
			const b = sr() * Math.PI * 2;
			const d = between(sr, 0.05, 0.16);
			grow(['sucker', y, k], v3(Math.cos(b) * d, -0.02, Math.sin(b) * d), v3(Math.cos(b) * 0.15, 1, Math.sin(b) * 0.15), y + between(sr, 0.16, 0.24), 0, 1, 'sucker', null, 0, { bearing: b, lean: 0.12, length: between(sr, 0.35, 0.8), removed: y + 0.9 });
		}
	}
	return { all, trunks };
}

/** how long a side shoot lives (years): the scaffolds' laterals for good, the finer wood a few years before the
 * crown shades it out and it dies and falls */
const lifeOf = (r, order) => (order <= 1 ? undefined : order === 2 ? between(r, 6, 10) : between(r, 3.5, 6.5));

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
 * calibrated to the data sheet: each of four stems 2.5–3.5 cm at 30 cm in its third year and 7–10 cm in its eighth.
 */
const PIPE = 2.5;
const RING = 0.3;
const RING_ADD = 0.003; // and a fixed ring the first years, which a young plant's few shoots would not explain
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	const tip = ax.kind === 'spur' ? TREE.spurRadius : ax.kind === 'thorn' ? 0.0011 : TREE.tipRadius;
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.kind === 'spur' || k.kind === 'thorn' ? Math.pow(0.0009, PIPE) : k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'spur' || ax.kind === 'thorn' ? 0 : TREE.pipeLength * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.4);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'spur' || ax.kind === 'thorn' ? 0 : RING_ADD * Math.min(woodAge, 2.5) * clamp(Math.pow(q, 1 / PIPE) / 0.006));
		ax.r2[i] = r * r;
	}
}

/** the plant's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2) return;
	// a crowd far off: no spur or thorn wood (a few centimetres; the spurs' leaves and fruit still drawn)
	if ((ax.kind === 'spur' || ax.kind === 'thorn') && DETAIL.level < 0.5) return;
	const L = (ax.pathLen ??= lengths(ax.pts));
	const total = L[n - 1];
	if (total < 1e-4) return;
	if (ax.kind === 'thorn') {
		// the spine: tapering from its foot to a sharp point, grey-brown, red while young
		const age = t - ax.born;
		const c = mix(PG.bark.shoot, PG.bark.thorn, clamp((age - 0.3) / 0.5));
		bag.add('twig', tube([ax.pts[0], ax.pts[1]], (u) => 0.0011 * (1 - 0.97 * u), () => c, 3, false));
		return;
	}
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
	const isStem = ax.kind === 'stem';
	const step = isStem ? clamp(R0 * 0.6, 0.012, 0.05) : ax.kind === 'spur' ? 0.03 : R0 > 0.012 ? clamp(R0 * 1.2, 0.02, 0.06) : clamp(R0 * 3, R0 < 0.004 ? 0.08 : 0.04, 0.12);
	const pts = [];
	const count = Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'spur' ? 3 : Math.round(clamp(R0 * (R0 > 0.012 ? 420 : 400), R0 < 0.0035 ? 3 : 4, 24));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const twist = about(chance(ns, 'twist', ...ax.key), 3, 1.5);
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		const age = t - yearAt(s);
		// this year's shoots four-angled
		if (age < 0.8 && r < 0.004) r *= 1 + 0.1 * Math.cos(v * Math.PI * 8);
		// old stems fluted and twisted: long ridges spiralling up them
		const o = OLD(r);
		if (o > 0) r *= 1 + 0.07 * o * Math.cos(v * Math.PI * 2 * 5 + s * twist + nsAx) + 0.035 * o * Math.cos(v * Math.PI * 2 * 9 - s * twist * 0.7);
		if (isStem && s < 0.12) {
			// the stems' feet swell where they join the old cutting
			r *= 1 + 0.4 * clamp(t / 5) * Math.exp(-s / 0.05);
		}
		if (ax.kind !== 'spur' && s < r * 2.2 && ax.parent) r *= 1 + 0.25 * (1 - s / (r * 2.2)); // the branch collar
		return r;
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - (ax.kind === 'spur' ? 0.6 : 0.25);
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s + twist * v * 0.02, sun, nsAx);
		if ((isStem || ax.kind === 'sucker') && ax.pts[0].y < 0) {
			// under the soil: pale, then brown like a root
			const p = pointAt({ pts: ax.pts, pathLen: L }, s).at;
			if (p.y < 0) c.lerp(named(PG.root.old), clamp(-p.y / 0.03));
		}
		return c;
	};
	const kind = R0 < 0.005 && !isStem ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	// the bark's strips as a picture in metres (a 0.25 m tile), on thick wood
	if (kind === 'bark') metric(geo, total / 0.25, (Math.PI * 2 * Math.max(R0, 0.008)) / 0.25);
	bag.add(kind, geo);
}

/**
 * The roots: no taproot (a cutting): roots from the callus at its foot and from its buried nodes, spreading wide in
 * the top 60 cm, red-brown, many fine feeders; under an old plant they reach out past the crown.
 */
function roots(bag, seed, t) {
	if (!DETAIL.roots) return;
	const age = clamp(t / 7);
	const count = 9;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'root', i);
		const born = 0.04 + i * 0.012 + (i > 5 ? 0.6 : 0);
		const bear = i * 2.39996 + rr() * 0.5;
		const y = -TREE.depth + (i < 4 ? 0.005 : between(rr, 0.03, 0.16));
		root(bag, {
			seed,
			key: ['root', i],
			from: v3(Math.cos(bear) * 0.005, y, Math.sin(bear) * 0.005),
			dir: v3(Math.cos(bear), -0.25 - rr() * 0.4, Math.sin(bear)),
			length: between(rr, 1.2, 2.2) * lerp(0.3, 1, age),
			grown: table(t - born, [[0, 0], [0.05, 0.03], [0.3, 0.15], [1, 0.35], [3, 0.7], [6, 1]]),
			radius: 0.0009 + 0.03 * span(t, born + 0.5, 8) * between(rr, 0.6, 1),
			down: 0.02,
			wander: 0.2,
			laterals: 7,
			lateral: 0.34,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.4) / 3,
			young: PG.root.young,
			old: PG.root.old,
			floor: -0.65,
		});
	}
}

/**
 * The whole pomegranate at time t (years from planting the cutting): the cutting, its roots, the wood, and what the
 * season puts on it — bronze-red leaves in spring, scarlet flowers in waves from April to June, fruit from set to ripe,
 * the leaves butter-yellow in November, bare in winter.
 */
function pomegranate(t, seed) {
	const bag = new Bag();
	const { year, s } = seasonOf(t);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	const bearing = year >= TREE.firstFruit;
	// how heavy the season's fruit are (0 … 1), for the shoots that arch under them
	const load = bearing ? fruitSize(clamp((s - 0.28) * 365, 0, RIPE_DAYS)) * clamp((s - 0.28) / 0.05) * (s < 0.74 ? 1 : 0) * clamp((year - 1) / 4) : 0;

	cutting(bag, v3(0, -TREE.depth, 0), t, seed);
	roots(bag, seed, t);
	const { all } = axes(seed, t, load);
	for (const ax of all) if (!ax.parent) thicken(ax, t);
	for (const ax of all) wood(bag, ax, t, hashText(seed) % 997, sunDir);

	const space = bag.space;
	for (const ax of all) {
		if (ax.kind === 'spur' || ax.kind === 'thorn' || ax.pts.length < 2) continue;
		const R = (i) => Math.sqrt(ax.r2[Math.min(ax.r2.length - 1, Math.round(i * (ax.r2.length - 1)))]);
		space.rod(ax.pts, (u) => R(u) + 0.002);
	}

	const leafy = s > 0.13 && s < FALL[1];
	const fall = span(s, FALL[0], FALL[1]);
	/** a leaf's flush colour by how long ago it unfolded (bronze-red, greening in two to three weeks) */
	const youngOf = (formed) => 1 - smooth((t - formed - 0.015) / 0.06);
	/** a leaf turned on its stalk, as little as it needs, out of the way of the fruit */
	const clearOfFruit = (at, out, size) => {
		if (!space.balls.length) return out;
		const len = PG.leaf.length * size;
		let best = out, low = Infinity;
		for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 2, -2, Math.PI]) {
			const o = out.clone().applyAxisAngle(UP, turn);
			let cost = Math.abs(turn) * 0.0005;
			for (const f of [0.4, 0.9]) cost += space.inFruit(at.clone().addScaledVector(o, f * len), len * 0.2);
			if (cost < low) (low = cost), (best = o);
			if (cost < 0.001) break;
		}
		return best;
	};

	for (const pass of ['flowers', 'leaves'])
		for (const ax of all) {
			const tipRadius = Math.sqrt(ax.r2[ax.r2.length - 1]);
			if (ax.kind === 'thorn') continue;
			if (ax.kind === 'spur') {
				spurSeason(bag, seed, ax, t, year, s, pass, leafy, fall, space, sunDir, clearOfFruit);
				continue;
			}
			if (pass !== 'leaves' || !leafy) continue;
			for (const n of ax.nodes) {
				if ((n.year === year - 1 || n.year === year - 2) && s > 0.13) {
					// last year's wood (and some of the year before's): a rosette of leaves from the bud in one axil of most nodes,
					// the short leafy shoots that clothe a pomegranate's outer crown
					const rr = chance(seed, 'rosette', ...ax.key, n.i);
					if (rr() > (n.year === year - 1 ? 0.7 : 0.35) || ax.kind === 'sucker') continue;
					const side = rr() < 0.5 ? 0 : 1;
					const sd = across(n.dir).applyAxisAngle(n.dir, n.bearing + side * Math.PI);
					const at = n.at.clone().addScaledVector(sd, Math.max(Math.sqrt(ax.r2[0]) * 0.5, 0.0015));
					const k = 5 + Math.floor(rr() * 4);
					const ageL = clamp((s - 0.13) / 0.06);
					const young = 1 - smooth((s - 0.15) / 0.06);
					for (let j = 0; j < k; j++) {
						const lr = chance(seed, 'rosette-leaf', ...ax.key, n.i, j);
						const d = sd.clone().addScaledVector(n.dir, 0.5).applyAxisAngle(sd, (j / k) * Math.PI * 2 + lr()).normalize();
						const size = about(lr, 0.78, 0.1);
						leaf(bag, at, clearOfFruit(at, d.addScaledVector(sd, 0.6).normalize(), size), size, ageL, young, fall, lr, false, true);
					}
					continue;
				}
				if (n.year !== year || t < n.formed) continue;
				const ageL = clamp((t - n.formed) / 0.06);
				const young = youngOf(n.formed);
				for (const side of [0, 1]) {
					const nr = chance(seed, 'leaf', ...ax.key, n.i, side);
					const sd = across(n.dir).applyAxisAngle(n.dir, n.bearing + side * Math.PI);
					const at = n.at.clone().addScaledVector(sd, Math.max(tipRadius, 0.0012));
					const size = (year === 0 ? 0.85 : 1) * about(nr, 1.0, 0.12);
					leaf(bag, at, clearOfFruit(at, sd.clone().addScaledVector(n.dir, 0.6).normalize(), size), size, ageL, young, fall, nr);
				}
			}
		}
	return bag.build();
}

/**
 * A spur through the year: in spring a rosette of 4–8 leaves at its tip and, on most, a short current shoot (2–10
 * cm, a few pairs of leaves) at whose end the flowers open, singly or two or three together, in waves from mid
 * April to mid June; most are male 'bell' flowers that drop a week after opening, the few perfect 'vase' flowers set
 * and grow on into fruit, the shoot bending down under it.
 */
function spurSeason(bag, seed, ax, t, year, s, pass, leafy, fall, space, sunDir, clearOfFruit) {
	const tip = ax.pts[ax.pts.length - 1];
	const dir = tip.clone().sub(ax.pts[ax.pts.length - 2]).normalize();
	const spurAge = t - ax.born;
	if (spurAge < 0.05) return;
	const kr = chance(seed, 'spur', ...ax.key, year);
	// this year's short shoot from the spur's tip, and whether it flowers
	const shootLen = between(kr, 0.02, 0.09);
	const flowering = year >= TREE.firstFlowers && spurAge >= 0.9 && kr() < (year >= TREE.firstFruit ? 0.42 : 0.3) * (ax.order >= 2 ? 1 : 0.7);
	const grown = span(s, 0.14, 0.24);
	const out = dir.clone().add(v3(0, 0.25, 0)).normalize();
	if (pass === 'leaves' && leafy) {
		const n = 4 + Math.floor(kr() * 3);
		const ageL = clamp((s - 0.13) / 0.06);
		const young = 1 - smooth((s - 0.15) / 0.06);
		for (let k = 0; k < n; k++) {
			const lr = chance(seed, 'spur-leaf', ...ax.key, year, k);
			const a = (k / n) * Math.PI * 2 + lr() * 0.5;
			const sd = across(dir).applyAxisAngle(dir, a);
			const size = about(lr, 0.72, 0.1);
			const at = tip.clone().addScaledVector(sd, 0.0015);
			leaf(bag, at, clearOfFruit(at, sd.clone().addScaledVector(dir, 0.7).normalize(), size), size, ageL, young, fall, lr, false, true);
		}
	}
	if (!flowering || grown <= 0) return;
	// the flowers, at the end of the short shoot; the shoot is drawn here, bending down under its fruit
	const fr0 = chance(seed, 'flowers', ...ax.key, year);
	const count = 1 + (fr0() < 0.45 ? 1 : 0) + (fr0() < 0.15 ? 1 : 0);
	// three waves (mid April, early to mid May, June), the second the main one: full bloom about 10 May
	const w = fr0();
	const wave = w < 0.3 ? 0 : w < 0.82 ? 1 : 2;
	const opens0 = [0.225, 0.262, 0.33][wave] + about(fr0, 0, 0.012);
	// a perfect flower: most often the terminal one; on 'Wonderful' some 7–10 % of all flowers on a grown tree [CV]
	const perfect = [];
	for (let k = 0; k < count; k++) perfect.push(fr0() < (k === 0 ? (year >= TREE.firstFruit ? 0.15 : 0.12) : 0.02));
	const setsAt = perfect.map((p) => p && fr0() < 0.72);
	const keepOne = setsAt.indexOf(true); // the grower and the tree keep one fruit at a site
	const daysOf = (k) => (s - opens0 - k * 0.012) * 365;
	const fruitDays = keepOne >= 0 ? daysOf(keepOne) : -1;
	const hanging = keepOne >= 0 && fruitDays > 0 && fruitDays < RIPE_DAYS + 40 && year >= TREE.firstFruit;
	const bendDown = hanging ? smooth(fruitSize(fruitDays) * 1.6 - 0.2) : 0;
	const sd0 = dir.clone().lerp(v3(0, -1, 0), 0.05 + 0.85 * bendDown).add(out.clone().multiplyScalar(1 - bendDown)).normalize();
	const len = shootLen * grown;
	const mid = tip.clone().addScaledVector(out, len * 0.5);
	const end = mid.clone().addScaledVector(sd0, len * 0.5);
	if (pass === 'flowers') {
		bag.add('twig', tube([tip, mid, end], (u) => 0.0012 * (1 - 0.3 * u) + 0.0012 * bendDown, () => mix(PG.bark.shoot, PG.bark.two, clamp((s - 0.45) / 0.3)), 3));
		if (leafy) {
			// a pair or two of leaves on the short shoot
			const pairs = len > 0.05 ? 2 : 1;
			for (let p = 0; p < pairs; p++) {
				const at = tip.clone().lerp(mid, 0.5 + p * 0.8);
				for (const side of [0, 1]) {
					const lr = chance(seed, 'shoot-leaf', ...ax.key, year, p, side);
					const sd = across(out).applyAxisAngle(out, p * Math.PI / 2 + side * Math.PI);
					const size = about(lr, 0.8, 0.1);
					leaf(bag, at, clearOfFruit(at, sd.clone().addScaledVector(out, 0.5).normalize(), size), size, clamp((s - 0.15) / 0.06), 1 - smooth((s - 0.17) / 0.06), span(s, FALL[0], FALL[1]), lr);
				}
			}
		}
	}
	if (pass !== 'flowers') return;
	for (let k = 0; k < count; k++) {
		const fr = chance(seed, 'flower', ...ax.key, year, k);
		const parts = flowerParts(chance(seed, 'parts', ...ax.key, year, k));
		const opens = opens0 + k * 0.012;
		const ph = s - opens; // years since it opened
		const a = (k / count) * Math.PI * 2 + fr() * 1.2;
		const side = across(sd0).applyAxisAngle(sd0, a);
		const facing = k === 0 ? sd0.clone() : sd0.clone().multiplyScalar(0.5).addScaledVector(side, 0.8).normalize();
		const at = end.clone().addScaledVector(side, k === 0 ? 0 : 0.003);
		const male = !perfect[k];
		if (ph < -0.05) {
			// a small bud, swelling for three weeks before it opens
			if (ph > -0.09 && s > 0.15) flower(bag, at, facing.clone().add(v3(0, 0.4, 0)).normalize(), 0, 0, !male, fr, false, parts);
			continue;
		}
		if (ph < 0) {
			flower(bag, at, facing.clone().add(v3(0, 0.3, 0)).normalize(), 0.08 * (1 + ph / 0.05), 0, !male, fr, false, parts);
			continue;
		}
		const open = span(ph, 0, 0.006);
		if (male || !setsAt[k]) {
			// a male flower (or a perfect one that does not set) withers and drops whole about a week after opening
			if (ph > 0.025) continue;
			const fl = facing.clone().add(v3(0, 0.35, 0)).normalize();
			flower(bag, at, fl, open, span(ph, 0.015, 0.025), !male, fr, false, parts);
			continue;
		}
		if (k !== keepOne || year < TREE.firstFruit) {
			if (ph < 0.05) flower(bag, at, facing.clone().add(v3(0, 0.35, 0)).normalize(), open, span(ph, 0.014, 0.025), true, fr, false, parts);
			continue;
		}
		const d = ph * 365;
		if (d > RIPE_DAYS + 40) continue; // picked (they hang to 185 days and more: the data sheet measures their cracking there)
		if (ph < 0.025) {
			// the perfect flower, its petals falling after four or five days; then the calyx and ovary go on as the fruit
			flower(bag, at, facing.clone().add(v3(0, 0.35, 0)).normalize(), open, span(ph, 0.012, 0.025), true, fr, false, parts);
			if (ph < 0.02) continue;
		}
		// the fruit hangs from the shoot's end, crown down; it finds its place for its ripe size, so it swells where it
		// hangs; one that finds no room is shed (June drop)
		const hang = v3(0, -1, 0).addScaledVector(sd0.clone().setY(0), 0.4).normalize();
		const R = PG.fruit;
		const ripe = (a2, d2) => [
			{ c: a2.clone().addScaledVector(d2, R.stalk + R.height * 0.45), r: R.width * 0.44 },
			{ c: a2.clone().addScaledVector(d2, R.stalk + R.height + 0.012), r: 0.015 },
		];
		const place = space.settle(end, hang, ripe, 0.01, 0.03) ?? (d < 45 ? { at: end, dir: hang } : null);
		if (!place) continue;
		// marked as one fruit (for the fruit view; and a crowd far off keeps every fruit, which is what it is seen by)
		bag.fruit([...ax.key, year, k], end, place.dir);
		if (place.at.distanceToSquared(end) > 1e-10) bag.add('twig', tube([end, place.at], () => 0.002, () => PG.bark.two, 4));
		fruit(bag, place.at, place.dir, d, sunDir, seed, [...ax.key, year, k].join('|'), parts); // its crown the lobes its flower had
		bag.fruitDone();
	}
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the cutting to ripe fruit; `t` the years since the cutting was planted (1 February) each is grown
 * at (between two stages, on the way). The last six are the plant's eighth year: bare in February, full bloom about
 * 10 May, ripe fruit picked about 155 days after (October).
 */
const STAGES = [
	{ name: 'Cutting', t: 0.0, note: 'February: a hardwood cutting of last year\'s wood, 28 cm long and 11 mm thick, grey-brown, set 21 cm deep so two pairs of buds show. No rootstock: a Wonderful grows on its own roots.' },
	{ name: 'Rooting', t: 0.24, note: 'Late April: white roots from its foot and its buried nodes; bronze-red shoots break from the buds above and below the soil, their leaves in opposite pairs.' },
	{ name: 'Bush', t: 0.68, note: 'Its first autumn (September): a bush of five to seven reddish, four-angled stems from the ground, 1–1.2 m, twiggy, a few thorns; narrow glossy leaves 5–6 cm.' },
	{ name: 'Young tree', t: 2.67, note: 'Its third October: four of the stems kept as low trunks (the rest cut out in its first winter), 2–2.5 m, a small twiggy vase; its first few fruit ripe, deep red under their crowns. Suckers at its foot.' },
	{ name: 'Winter', t: 7.02, note: 'Its eighth winter: bare, a dense twiggy grey vase 3.3 m tall on four twisted, fluted trunks 7–10 cm thick, the thin bark peeling in strips; short spurs and thorns all over the outer wood.' },
	{ name: 'Blossom', t: 7.27, note: 'About 10 May, full bloom (waves from mid April to mid June): scarlet flowers 4–5 cm across at the tips of short shoots all over the outside of the crown, their fleshy orange-red calyx tubes crowned by six pointed lobes, crumpled petals, a brush of ~170 stamens. Most are male "bell" flowers that drop; the few "vase" flowers, swollen at the foot, set.' },
	{ name: 'Fruit set', t: 7.37, note: 'Early June: the first fruit 3–4 cm, bronze-green under the red calyx that becomes their crown, the dry stamens inside; the last wave of flowers still opening; fallen bell flowers under the tree.' },
	{ name: 'Green fruit', t: 7.43, note: 'Early July, about two months after bloom: round green fruit of 6 cm, hanging crown-down from the ends of the shoots, which bend under them.' },
	{ name: 'Colouring', t: 7.55, note: 'Mid to late August, about eleven to fourteen weeks after the petals fell: the colour breaks, red flushing over the yellow-green from the sunny side; 8–9 cm.' },
	{ name: 'Ripe', t: 7.74, note: 'Late October, about 155 days after full bloom: ripe Wonderfuls, 10–11 cm across and 9 cm high, 350–550 g, deep crimson all over under a tall crown of six stiff lobes; inside some 500 ruby-red arils. The outer shoots arch down under them.' },
];

/** the years since planting at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => pomegranate(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one pomegranate on its own ---- */

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

/** the fruit the tree bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.85);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one pomegranate at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This fruit has not set yet.');
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
	id: 'pomegranate',
	label: "Pomegranate 'Wonderful' · Punica granatum",
	latin: "Punica granatum L. 'Wonderful' · Lythraceae (formerly Punicaceae) · Wonderful pomegranate, Granatapfel, granada, anar",
	note: "The Wonderful, the world's most grown pomegranate (Porterville, California, 1896): a deciduous, twiggy, thorny shrubby tree 3–4 m tall and as wide, grown from cuttings on its own roots and trained to a few low, twisted grey trunks; narrow glossy leaves 6 × 1.7 cm in opposite pairs and rosettes, bronze-red in spring and butter-yellow in November; scarlet flowers from April to June, their fleshy orange-red calyx the flower's body; large round fruit 10–11 cm across, deep crimson under a tall crown of six stiff lobes, full of ruby-red arils, ripe in October.",
	from: 'Tree · 8 years from a hardwood cutting',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '9f2814aa6af803418c2f4ccfb01595bb4c9cf76a62d20257ee5a3fa955301c4b', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from planting
	// what a world needs to plant it right; plant-skill's data sheet for the pomegranate, S1–S42
	facts: {
		height: { at1: [1, 1.6], at3: [2, 2.5], at5: [2.8, 3.5], at8: [3, 3.5], at15: [3.5, 4.5], grown: [3, 5], unit: 'm' },
		trunk: { stems: [3, 5], perStemAt3: [0.025, 0.035], perStemAt8: [0.07, 0.1], perStemAt15: [0.1, 0.15], singleTrunkAt10: 0.25, unit: 'm' },
		crown: { at3: [1.8, 2.5], at8: [3, 4], at15: [4.3, 5.2], unit: 'm' },
		spacing: { orchard: [[5.2, 5.5], [3.7, 4.3]], unit: 'm' },
		shade: 'full sun; flowers and colours poorly in shade',
		climate: 'hot dry summers, cool winters (Mediterranean, semi-arid); ~300–400 chill hours; damaged below about −11 °C; drought-tolerant once grown; splits after late rain on dry soil',
		years: { firstFlowers: [1, 2], firstCrop: [2, 3], fullBearing: [5, 7], productiveLife: [20, 30], lives: 200 },
		leaf: { length: [0.055, 0.075], width: [0.014, 0.02], spurLength: [0.03, 0.05], petiole: [0.004, 0.006], arrangement: 'opposite (decussate) and in rosettes of 4–8 on spurs', budBreak: 'late March', fall: 'November', flush: 'bronze-red', autumn: 'butter-yellow', unit: 'm' },
		flower: { length: 0.042, diameter: [0.04, 0.05], sepals: 5.8, petals: 5.7, stamens: 169, maleShare: 0.93, bloom: 'mid April – mid June in three waves, full bloom early–mid May', unit: 'm' },
		fruit: { width: [0.095, 0.115], height: [0.085, 0.092], crown: [0.019, 0.025], rind: 0.0039, mass: [0.345, 0.55], arils: [201, 985], arilsMean: 488, aril: [0.0106, 0.0076], daysFromBloom: [150, 165], colourBreakWeeks: 11, deepRedWeeks: 22, harvest: 'late September – October', cracking: [0.12, 0.3], unit: 'm, kg, days' },
		yield: { at15to18: [70, 97], perHectare: [31, 43], unit: 'kg a tree a year; t a hectare' },
		propagation: 'hardwood cuttings 25 cm × 6–13 mm, own-rooted; no rootstocks in California',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'pomegranate' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'pomegranate',
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

/* ---- the organ bench: each organ laid as its panel on the sheet lays it ---- */

/** a leaf flat, its upper (or under) side to +Z, its stalk down (−Y), at its full size, finely made */
function leafBench(under = false, young = 0, fall = 0) {
	const bag = new Bag();
	const r = chance('bench', 'leaf');
	const L = PG.leaf;
	const len = L.length;
	bag.add('body', tube([v3(0, -L.petiole, 0), v3(0, 0, 0)], () => 0.0006, () => L.petioleColour, 6));
	const blade = sheet({ length: len, width: len * (L.width / L.length) * 0.5, shape: (u) => along(LEAF_W, u), paint: (u, v) => mix(L.top, L.topDark, 0.2).lerp(named(L.vein), Math.abs(v) < 0.06 ? 0.3 * (1 - u * 0.5) : 0).lerp(named(L.youngRed), young).lerp(named(L.autumn), fall), back: (u, v) => mix(L.under, '#93a37a', 0.2).lerp(named(L.autumn), fall), backLit: false, along: 40, across: 8 });
	// along +X, face +Y → along +Y, face +Z (or −Z for its underside)
	const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(under ? -Math.PI / 2 : Math.PI / 2));
	bag.add('leaf', blade, new THREE.Matrix4().makeRotationX(0).multiply(m));
	void r;
	return bag.build();
}

/** a fruit `days` after its flower opened, standing on its stalk end, its crown up (+Y), finely made */
function fruitBench(days, n = 6) {
	const bag = new Bag();
	const sun = v3(0, 0, 1);
	lite({ ...DETAIL, fruit: 'bench' }, () => {
		const R = PG.fruit;
		const size = fruitSize(days);
		const W = R.width * size;
		const H = W * lerp(1.02, R.height / R.width, smooth(size));
		fruitGeometry(bag, new THREE.Matrix4(), { W, H, days, sun, ns: 7, res: true, n, roll: 0.3 });
	});
	return bag.build();
}

/** a flower standing on its foot, facing up (+Y), finely made */
function flowerBench(perfect = true, open = 1, n = 6) {
	const bag = new Bag();
	flower(bag, v3(0, 0, 0), v3(0, 1, 0), open, 0, perfect, chance('bench', 'flower'), true, n);
	return bag.build();
}

/** the organs on their own, for checking them against the reference sheet's panels */
module.exports.organs = { leafBench, fruitBench, flowerBench, PG, LEAF_W, FRUIT_W, cutting, leaf, flower, calyx, fruit, fruitGeometry, Bag, timeAt, pomegranate, axes, thicken, fruitSize, rindAt, surface, lite, detailAt, STAGES, TREE };
