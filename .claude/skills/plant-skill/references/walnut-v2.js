'use strict';
/*
 * WALNUT 'FRANQUETTE' — Juglans regia L. 'Franquette' (Persian or English walnut; noyer commun): the classic walnut of
 * the Isère valley and the Noix de Grenoble (AOP). Version 2 of plants/walnut: one named cultivar, grown from its nut
 * (the seedling rootstock, grafted to Franquette in its second spring) to its fifteenth year, when it comes into full
 * bearing, through one season from budbreak to the harvest.
 *
 * Its numbers are the cultivar's where they are measured (the nut 38.6 × 30.1 × 30.5 mm and 10.5 g, kernel 45.7 %, in
 * the Slovenian trials; 38.7 × 32.2 mm in Moldova; 1,060 g a hundred nuts at Creysse; budbreak 19–26 April and the
 * female bloom 16–28 May in the Isère; a terminal bearer, one or two nuts a tip; protandrous; 11 kg a tree at 18
 * years) and the species' otherwise (the leaf, the catkins, hypogeal germination, forestry and open-grown girth and
 * crown by age); the age series of height, girth and crown is estimated between measured anchors and marked so in the
 * data sheet (plant-skill references, walnut-franquette.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its female flowers and sown nut redrawn by an edit pass, kept on play by its hash (6a9878f2…): the
 * leaflet, husk and nut outlines and every colour traced off its panels. Where the plate is wrong against the data
 * sheet (a branched, red-stemmed seedling; the nut drawn 1.4 : 1 where it is measured 1.22 : 1; its 10- and 20-year
 * trees drawn alike), the data sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots, pictures with their mipmaps, `named()` colours, leaves with their own underside normals),
 *                   carried over from plum v2 (banana v2's core with the lessons since), with the walnut's materials
 *                   and its surfaces: the leaflet's fine pale veins, the old bark's fissure net, the husk's dots.
 *   2. ORGANS       the walnut's own, each to its measure: nut, bark, pinnate leaf, buds, catkin, female flower, husk.
 *   3. THE TREE     its axes year by year (a leader with tiers of wide scaffolds; once bearing, every fruiting tip
 *                   relayed by one to three shoots below it, so the crown forks into a dome), its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from germination (t = 0 the nut splitting, early May); a year's season
 * `s` 0 … 1 from budbreak (about 22 April) round to the next.
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
		// the walnut's: thousands of big compound leaves, so a crowd keeps fewer of them, each grown more
		[0.1, 0.03, 2.6, 0.02],
		[0.25, 0.1, 1.9, 0.007],
		[0.5, 0.35, 1.35, 0.002],
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
 * fissures of old bark, the dots on a husk. Laid on by the shape's UVs (a leaf's own, the bark's in metres: `metric`),
 * mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); the walnut has no bump
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
 *   leafMap              one leaflet in its own coordinates (u along it from its base, v across from edge to edge, the
 *                        midrib at v = ½): the walnut's 12–15 pairs of fine, pale, almost straight side veins leaving
 *                        the midrib at about 50° and looping along the margin, the blade between them smooth (not
 *                        quilted), a faint mottle; the midrib pale yellow-green (the sheet's leaf)
 *   barkMap              0.3 m square of old walnut bark, laid on in metres: long, narrow, deep fissures that part and
 *                        join round flat grey ridges 2–4 cm wide (the interlacing, diamond net of a grown walnut)
 *   shellMap             the nut's shell: fine shallow grooves meandering lengthwise and joining, smooth faces
 *   huskMap              a green husk's skin: dense small pale lenticel dots (0.3–0.8 mm), a fine unevenness
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 13;
	const vein = (x, y, sharp) => {
		const side = Math.abs(y - 0.5) * 2;
		const slant = side * 0.42;
		const phase = (x - 0.03) * VEINS - slant * 1.0;
		const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), sharp) * smooth((0.92 - side) / 0.12) * smooth((x - 0.02) / 0.04) * smooth((0.98 - x) / 0.06);
		const mid = Math.exp(-Math.pow((y - 0.5) / 0.014, 2));
		return { sec, mid };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const { sec, mid } = vein(x, y, 40);
				const mottle = tileNoise(x, y, 14, 3) - 0.5;
				const k = 0.9 + 0.16 * sec + 0.3 * mid + 0.05 * mottle;
				return [k * 1.0, k * 1.0, k * 0.88];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// along the wood and round it (0.3 m): long fissures wandering up it, parting and joining (cells stretched
				// along the grain), the flat ridge faces between them grey and finely rough
				// (x is the tube's u, along the wood; y round it)
				const w = tileNoise(x, y, 4, 61, 2) - 0.5;
				const c = tileCells(x, y + w * 0.16, 2, 9, 63);
				const fissure = smooth((0.13 - (c.f2 - c.f1)) / 0.09);
				const face = 0.86 + 0.18 * c.id + 0.16 * (tileNoise(x, y, 40, 65, 3, 8) - 0.5);
				const k = face * lerp(1, 0.42, fissure);
				return [k, k * 0.97, k * 0.96];
			}, true),
		shellMap: () =>
			picture(256, 256, (x, y) => {
				// x round the nut, y along it: fine shallow grooves meandering lengthwise and joining (the borders of cells
				// drawn out along the nut), the faces between them smooth, a fine fibrous grain
				const w = tileNoise(x, y, 5, 81, 2) - 0.5;
				const c = tileCells(x + w * 0.1, y, 18, 3, 83);
				const groove = smooth((0.07 - (c.f2 - c.f1)) / 0.05);
				const grain = tileNoise(x, y, 60, 85, 2, 12) - 0.5;
				const k = (0.98 + 0.05 * grain) * lerp(1, 0.66, groove);
				return [k, k * 0.96, k * 0.92];
			}, true),
		huskMap: () =>
			picture(256, 256, (x, y) => {
				// dots: the tile is 1 cm square, some 40 lenticels on it, 0.5–1 mm across
				const d = tileCells(x, y, 7, 7, 73);
				const dot = d.id < 0.85 ? smooth((0.24 - d.f1) / 0.07) * (0.6 + 0.4 * d.id) : 0;
				// the ground a little under white (the vertex colours are lifted to match: HUSK_LIFT), the dots paler
				const k = 0.84 + 0.04 * (tileNoise(x, y, 10, 75) - 0.5);
				return [k + 0.3 * dot, k + 0.3 * dot, k + 0.18 * dot];
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
 * The materials, made once, plain and with their surfaces. `bark` thick wood, matt, its fissures; `twig` young wood,
 * a little glossy; `leaf` a leaflet's two faces (one-sided, each its own colour and its own normals), smooth, a
 * little glossy, no clearcoat (a clearcoat on thousands of leaflets turns a crown grey at grazing angles); `husk` the
 * green husk, its lenticel dots; `shell` the nut's shell, matt; `catkin` the male catkins; `sheet` thin things seen
 * from both sides (stigmas, bud scales); `body` buds, stalks, roots, the kernel.
 */
const MATERIALS = {
	// colour pictures only, no bump: a bump picture's normal is NaN wherever a triangle stands edge-on or shrinks under a
	// pixel on screen (three's perturbNormalArb), and a big tree of small triangles finds such a pixel from somewhere
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.72, specularIntensity: 0.45 }),
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, specularIntensity: 0.32, ...(s && { map: s('leafMap') }) }),
	husk: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.48, specularIntensity: 0.45, ...(s && { map: s('huskMap') }) }),
	shell: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, ...(s && { map: s('shellMap') }) }),
	catkin: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'husk', 'shell', 'catkin', 'prop'];
// a walnut has thousands of leaves and catkins: a crowd far off draws a share of them, each grown to fill the gap
const THINNED = { leaf: true, sheet: true, catkin: true };

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
			// (a walnut's leaf is 30 cm: a kept one may grow to fill its neighbours' gap up to some 40 cm round)
			const most = Math.max(1, 0.4 / Math.max(1e-4, sphere.radius));
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
 * 2. ORGANS — the Franquette's own, each to its measure
 * ============================================================================================================== */

/**
 * The Franquette's numbers. Sizes in metres from the data sheet (`walnut-franquette.md`: the cultivar measured in
 * Slovenia, Moldova and at Creysse where it was, the species otherwise); outlines and colours traced off its
 * reference sheet (play file 6a9878f2…, Nano Banana Pro, 2026-11-05) with plant-skill's trace.py, the colours as the
 * sheet's hex (sRGB) medians, the spread its p10–p90.
 */
const WN = {
	// the nut: 38.6 × 30.1 × 30.5 mm, 10.5 g [CV, Slovenia]; 38.7 × 32.2 mm [CV, Moldova]: 39 × 32 × 31; elliptic, a long
	// pointed tip, a strong pad along the upper two-thirds of the suture; shell thin (1.2–1.4 mm), light; sown 5–6 cm deep
	nut: { length: 0.039, width: 0.032, thick: 0.031, shell: '#d8a266', groove: '#ab7748', light: '#efc08a', seam: '#c08c5c', depth: 0.06 },
	kernel: { colour: '#efcb9a', skin: '#c89058' },
	// the leaf: 25–30 cm (to 45), petiole 5–7 cm, 7 (5–9) leaflets, entire; the terminal leaflet the largest (the sheet's
	// 2.2 : 1), the pairs smaller toward the base; colours the sheet's upper side, underside, young and autumn leaf
	leaf: { length: 0.3, petiole: 0.055, rachis: 0.11, terminal: 0.135, pairs: [0.072, 0.122, 0.135], terminalAspect: 2.2, aspect: 2.35, top: '#607538', topDark: '#566a30', under: '#8a8e54', vein: '#a9ad62', young: '#9d6243', youngGreen: '#8a7a40', autumn: '#d19338', autumnLate: '#8e6a2c', rachisColour: '#8f9a48' },
	// male catkins: 5–10 (–15) cm at shedding, use 10; ~1.5 cm thick; ~120 flowers; on one-year wood, laterally
	catkin: { length: 0.1, radius: 0.0078, young: '#8f8f41', shed: '#af9c3c', pollen: '#c9b44a', dead: '#5e4a2a' },
	// female flowers: 5–7 × 3–5 mm, 2 plumose stigmas yellow-orange when receptive, then brown; 1 (–2) at the tip
	female: { length: 0.006, width: 0.004, flask: '#9ea14a', stigma: '#e0a042', stigmaLate: '#8a5a30' },
	// the husked fruit: 4–6 cm in the species, ~5.8 mm husk; Franquette ~50 × 42 mm [EST]; the sheet's 1.21 : 1
	husk: { length: 0.05, width: 0.042, thick: 0.006, young: '#6c792d', green: '#859732', turning: '#a0a03c', split: '#4a3c24', black: '#221a12', inside: '#b7a92d', stalk: 0.012 },
	// bark: the sheet's swatches (a one-year shoot olive-brown with lenticels, a smooth silver-grey branch, the old
	// furrowed trunk), its winter shoot and buds
	bark: { shoot: '#816f51', shootGreen: '#7d7a4c', smooth: '#817e76', smoothDark: '#615e57', lenticel: '#d8cfc0', old: '#5d5953', ridge: '#87837b', fissure: '#2e2524', bud: '#6d4a38', budDown: '#8e6551', scar: '#c8b090' },
	root: { young: '#e8dcc0', old: '#7a4e30' },
};

/** the outlines, traced off the sheet (6a9878f2…): half-widths along the organ, as parts of the greatest */
// the terminal leaflet, from its base: a wedge into its stalk, widest just above the middle, a short drip point; the
// sheet's base hidden by the lateral pair, so its lowest fifth closes as the wedge the sheet's laterals show
const LEAFLET_W = [0.02, 0.18, 0.32, 0.43, 0.53, 0.61, 0.72, 0.79, 0.85, 0.9, 0.94, 0.98, 0.99, 0.99, 0.96, 0.93, 0.9, 0.83, 0.73, 0.6, 0.46, 0.26, 0.08, 0.01];
// the husk, from its stalk to its tip (the sheet's full-size green fruit without its stalk, 1.21 : 1)
const HUSK_W = [0.1, 0.47, 0.61, 0.72, 0.8, 0.86, 0.91, 0.95, 0.98, 0.99, 1, 1, 1, 1, 0.98, 0.95, 0.92, 0.88, 0.82, 0.75, 0.66, 0.51, 0.23, 0.04];
// the nut, from its base to its pointed tip (the sheet's nut side view, 1.4 : 1; its length comes from the data
// sheet, 39 × 32 mm, 1.22 : 1)
const NUT_W = [0.17, 0.43, 0.62, 0.73, 0.81, 0.87, 0.92, 0.96, 0.99, 0.99, 1, 1, 0.99, 0.98, 0.96, 0.92, 0.88, 0.82, 0.74, 0.65, 0.53, 0.38, 0.18, 0.0];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- the lathe: a fruit or a nut turned round its axis, its rings closing round at both ends ---- */

/**
 * A closed shape turned round −Y from the origin: `rings` along it, spaced by (1 − cos) toward the poles so its ends
 * close round, `sides` round; `at(u, ph)` gives the radius scale and colour and a nudge for each place (u 0 at the top,
 * 1 at the bottom; ph round it). H its length, W and D its widths. (Orange v2's lesson: a lathe from traced widths
 * closes round, or it is a box.)
 */
function lathe(H, W, D, rows, rings, sides, at) {
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((i / rings) * Math.PI)) / 2;
		// the traced profile as a correction of an ellipse, held to its neighbours' near the poles
		const ell = Math.sin(u * Math.PI);
		const tr = along(rows, u);
		const prof = i === 0 || i === rings ? 0 : lerp(ell, tr, smooth(Math.min(u, 1 - u) / 0.08));
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const o = at(u, ph);
			const r = prof * o.r;
			pos.push((W / 2) * r * Math.cos(ph) + (o.dx ?? 0), -H * u + (o.dy ?? 0), (D / 2) * r * Math.sin(ph) + (o.dz ?? 0));
			nor.push(0, 0, 0);
			uv.push((j / sides) * (o.su ?? 1), u * (o.sv ?? 1));
			const c = toColor(o.c);
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

/* ---- the nut ---- */

/**
 * The nut in its shell: 39 × 32 × 31 mm, its base blunt (at the origin), its tip pointed (down −Y), the suture a
 * raised seam right round it in the plane of its width (ph 0 and π), padded along the upper two-thirds; the shell
 * shallowly wrinkled in a net of grooves. `split` 0 … 1 parts the halves along the suture (germination).
 */
function nutGeometry(o) {
	const N = WN.nut;
	const { ns, res } = o;
	const k = o.k ?? 1;
	const H = N.length * k, W = N.width * k, D = N.thick * k;
	const rings = res ? 90 : fewer(7, 5);
	const sides = res ? 100 : fewer(8, 6);
	return lathe(H, W, D, NUT_W, rings, sides, (u, ph) => {
		// the seam's ridge and the pad beside it; the wrinkles as cells, sunk
		const seam = Math.exp(-Math.pow(Math.sin(ph) / 0.07, 2));
		const pad = Math.exp(-Math.pow(Math.sin(ph) / 0.22, 2)) * (1 - smooth((u - 0.6) / 0.25));
		const x = Math.cos(ph), z = Math.sin(ph);
		// the sheet's shell: shallow, fine, meandering grooves running mostly lengthwise and joining, the faces
		// between them smooth (cells drawn out along the nut, their borders the grooves)
		const w = fbm(x * 3, u * 3, z * 3, 2, ns + 7) - 0.5;
		const c = cells(x * 3.6 + w * 0.6 + ns, u * 2.2, z * 3.6 - w * 0.6, ns);
		const groove = smooth((0.1 - c.edge) / 0.07);
		const pit = fbm(x * 9, u * 16, z * 9, 2, ns + 3);
		const r = 1 + 0.05 * seam + 0.025 * pad - (res ? 0.022 * groove : 0.01 * groove) * (1 - seam) + 0.005 * (pit - 0.5);
		// the grooves' colour is in the shell's picture; here the larger mottle, paler on the faces, the seam darker
		const col = mix(N.shell, N.groove, clamp((0.42 - pit) * 1.5) * 0.25 + groove * 0.15).lerp(named(N.light), clamp((pit - 0.55) * 2.5) * 0.45);
		col.lerp(named(N.seam), seam * 0.5);
		return { r, c: col, su: 1, sv: 1 };
	});
}

/** the nut on the wood or in the soil, its base at `at`, its tip along `dir`; split along its seam as it germinates */
function nut(bag, at, dir, split, seed, kind = 'shell', res = false) {
	const ns = hashText(seed) % 997;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize());
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	if (split <= 0 && !res && DETAIL.level < 0.5) {
		// a crowd far off: a bead of its colour (thinned with the others)
		bag.add(kind, bead(v3(0, -WN.nut.length / 2, 0), v3(WN.nut.width / 2, WN.nut.length / 2, WN.nut.thick / 2), WN.nut.shell, 3), m);
		return;
	}
	if (split <= 0) {
		bag.add(kind, nutGeometry({ ns, res }), m);
		return;
	}
	// two halves, hinged at the base, opened along the seam (the plane of its width, x = 0 … the halves ±z)
	const N = WN.nut;
	for (const half of [1, -1]) {
		const g = nutGeometry({ ns, res });
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) {
			let z = p.getZ(i);
			if (z * half < 0) z = 0; // the half's flat face
			const y = p.getY(i);
			const ang = half * split * 0.35;
			const ny = y * Math.cos(ang) - z * Math.sin(ang);
			const nz = y * Math.sin(ang) + z * Math.cos(ang) + half * split * 0.0015;
			p.setXYZ(i, p.getX(i), ny, nz);
		}
		g.computeVertexNormals();
		bag.add(kind, g, m);
	}
	// the kernel's halves just showing in the gap
	bag.add('body', bead(v3(0, -N.length * 0.48, 0), v3(N.width * 0.36, N.length * 0.38, N.thick * 0.12), WN.kernel.colour, 8), m);
}

/* ---- bark ---- */

/**
 * Walnut bark by the age (years) and radius (m) of the wood, at a place on it (`v` round it, `s` along it, `sun`
 * 0 … 1 how much it faces the light): this year's shoot stout, olive-brown, greener in shade, dotted with pale
 * lenticels; two years on, smooth, silver to ash grey (it stays smooth to some 15 cm across); old wood grey, cut by
 * long, narrow, deep fissures into a net of flat ridges 2–4 cm wide.
 */
const BARK_K = { across: 28, along: 3.2 }; // ridges ~3 cm across, fissures running ~30 cm before they part or join
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 30, s * 6, cz * 30, 2, ns + 5) - 0.5) * 0.9;
	const c = cells(cx * BARK_K.across + w, s * BARK_K.along + w * 0.4, cz * BARK_K.across - w, ns + 3);
	const ridge = c.edge;
	const plate = 0.6 * c.id + 0.4 * fbm(cx * 90, s * 30, cz * 90, 2, ns);
	return { ridge, plate, cx, cz };
}
const old = (r) => clamp((r - 0.055) / 0.05);
function barkColour(age, r, v, s, sun, ns) {
	const B = WN.bark;
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const ln = noise3(cx * 260, s * 420, cz * 260, ns + 7);
	const lenticel = smooth((ln - 0.78) / 0.06) * (1 - clamp((r - 0.02) / 0.03));
	let c;
	if (age < 0.7) c = mix(B.shootGreen, B.shoot, 0.35 + 0.6 * sun + age * 0.3);
	else {
		const grey = clamp((age - 0.7) / 2.5);
		c = mix(B.shoot, B.smooth, grey).lerp(named(B.smoothDark), 0.3 * fbm(cx * 40, s * 8, cz * 40, 2, ns + 11));
	}
	const o = old(r);
	if (o > 0) {
		const { ridge, plate } = barkPattern(r, v, s, ns);
		const fissure = smooth((0.13 - ridge) / 0.1);
		const bark = mix(B.old, B.ridge, plate * 0.8);
		c.lerp(bark, smooth(o * 1.3));
		c.lerp(named(B.fissure), fissure * o * 0.8);
	}
	return c.lerp(named(B.lenticel), lenticel * 0.6);
}
function barkRelief(r, v, s, ns) {
	const o = old(r);
	if (o <= 0) return 0;
	const { ridge, plate } = barkPattern(r, v, s, ns);
	return o * (-0.08 * smooth((0.24 - ridge) / 0.2) + 0.02 * (plate - 0.5) + 0.015 * smooth(ridge / 0.5));
}

/* ---- the leaf ---- */

/** a leaflet's outline: the traced half-widths */
const leafletShape = (u) => along(LEAFLET_W, u);

/**
 * One pinnate leaf from its node: the stout petiole (6 cm, swollen at its base) rising out from the shoot, the rachis
 * arching out and down, three pairs of opposite, almost stalkless leaflets smaller toward the base and the largest at
 * the tip on its own short stalk; entire, smooth, a little glossy, mid-green above with pale veins, matt grey-green
 * below. Young leaves unfold limp and hanging, bronze-red, greening in two to three weeks; in autumn yellow, then
 * brown. `size` scales it, `age` 0 … 1 from bud to grown, `bronze` 0 … 1 how red it still is, `fall` 0 … 1,
 * `pairs` 1 … 3 (a seedling's first leaves have one or two).
 */
function leaf(bag, at, dir, size, age, bronze, fall, r, close = false, pairs = 3, flat0 = false) {
	const L = WN.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const grow = lerp(0.22, 1, smooth(age));
	const pet = L.petiole * size * grow;
	const rach = L.rachis * size * grow * (pairs / 3);
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	// the rachis: rises at the node, then arches out and down under its leaflets; a young leaf hangs limp
	const lift0 = flat0 ? 0 : lerp(-0.5, about(r, 0.75, 0.2), smooth(age * 1.2)) - fall * 0.3;
	const bend = flat0 ? 0 : lerp(1.6, about(r, 1.5, 0.3), smooth(age));
	const total = pet + rach;
	const steps = close ? 12 : 3;
	const pts = [at.clone()];
	const yaw = flat0 ? 0 : about(r, 0, 0.25);
	const fd = flat.clone().applyAxisAngle(UP, yaw);
	for (let i = 1; i <= steps; i++) {
		const s = (i / steps) * total;
		const el = lift0 - bend * (s / Math.max(0.05, total)) * (s / Math.max(0.05, total));
		const d = fd.clone().multiplyScalar(Math.cos(el)).add(v3(0, Math.sin(el), 0));
		pts.push(pts[i - 1].clone().addScaledVector(d, total / steps));
	}
	const path = { pts, pathLen: lengths(pts) };
	const hue = r();
	const autumn = (u) => mix(mix(L.autumn, '#c9a83a', hue * 0.5), L.autumnLate, clamp(fall * 1.4 - 0.4 + u * 0.2));
	const young = bronze;
	const top = (u, v) => {
		const c = mix(L.top, L.young, young);
		c.lerp(named(L.topDark), clamp((noise3(u * 3, v * 2, hue * 50, 3) - 0.45) * 1.5) * 0.45 * (1 - young));
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3 - Math.abs(v) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#a0784e', young * 0.8);
		if (Math.abs(v) < 0.06) c.lerp(named('#b8b47a'), 0.35);
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3));
		return c;
	};
	const parts = [];
	// the petiole and rachis
	parts.push(tube(pts, (u) => (0.0028 * (1 - 0.55 * u) + 0.0012 * Math.exp(-u / 0.04)) * size * lerp(0.5, 1, age), () => (fall > 0.2 ? autumn(0.5) : mix(L.rachisColour, L.young, young * 0.7)), close ? 6 : 2));
	const blade = (len, aspect, atp, d, roll) => {
		const g = sheet({
			length: len,
			width: (len / aspect) * 0.5,
			shape: leafletShape,
			// folded a little along the midrib, the tip curling down, a faint wave at the margin
			lift: (u, v) => fold * Math.abs(v) * 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.008 * Math.sin(u * 9 + v * 3) * v * v,
			paint: top,
			back: under,
			backLit: false, // its own normals: seen from below it is its underside, not the sky
			// far off a leaflet is three rows of two triangles a face: a tree of five thousand leaves stays in budget
			along: close ? 30 : 3,
			across: close ? 10 : 1,
		});
		g.applyMatrix4(aim(atp, d, roll));
		parts.push(g);
	};
	const fold = flat0 ? 0 : lerp(0.6, about(r, 0.16, 0.06), smooth(age));
	const curl = flat0 ? 0 : about(r, 0.1, 0.05) + (1 - smooth(age)) * 0.3;
	const k = lerp(0.3, 1, smooth(age));
	// pairs from the base: the lowest the smallest; each pair leaves the rachis ~60° forward, lying nearly level
	const P = L.pairs.slice(3 - pairs);
	for (let i = 0; i < pairs; i++) {
		// the sheet's spacing: the lowest two pairs closer together than the upper two
		const sAt = pet + rach * (pairs === 1 ? 0.9 : pairs === 2 ? [0.3, 1][i] : [0, 0.55, 1][i]) * 0.97;
		const { at: p, dir: t } = pointAt(path, sAt);
		const side = new THREE.Vector3().crossVectors(t, UP);
		if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
		side.normalize();
		for (const sg of [1, -1]) {
			// the sheet's leaf: the pairs stand out nearly at right angles, the upper pair a little forward
			const a = about(r, (pairs === 3 ? [1.0, 1.42, 1.13] : [1.2, 1.02])[i + (pairs === 1 ? 1 : 0)], 0.08) * lerp(0.6, 1, smooth(age));
			const d = t.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, sg * Math.sin(a));
			d.y = flat0 ? 0 : d.y * 0.4 - about(r, 0.12, 0.08) - (1 - smooth(age)) * 0.6;
			d.normalize();
			blade(P[i] * size * k * about(r, 1, 0.06), L.aspect, p, d, flat0 ? 0 : sg * about(r, 0.12, 0.08));
		}
	}
	// the terminal leaflet on its short stalk
	const end = pointAt(path, total);
	const td = end.dir.clone();
	td.y = flat0 ? 0 : td.y * 0.5 - 0.1;
	td.normalize();
	const tStart = end.at.clone().addScaledVector(td, 0.008 * size * k);
	if (close) parts.push(tube([end.at, tStart], () => 0.0012 * size, () => mix(L.rachisColour, L.young, young * 0.7), 3));
	blade(L.terminal * size * k * about(r, 1, 0.05), L.terminalAspect, tStart, td, about(r, 0, 0.1));
	const g = mergeGeometries(parts);
	for (const p of parts) p.dispose();
	bag.add('leaf', g);
}

/* ---- buds ---- */

/**
 * A winter bud: the terminal one fat, rounded, downy grey-brown (6–9 mm); lateral ones small and triangular; a male
 * catkin bud a small scaly cone (6–10 mm) beside a leaf scar.
 */
function bud(bag, at, dir, kind, r) {
	const B = WN.bark;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	const s = kind === 'terminal' ? 0.0042 : kind === 'male' ? 0.0035 : 0.0022;
	const c = at.clone().addScaledVector(dir, s * 0.8);
	const col = kind === 'male' ? '#7a6a48' : kind === 'terminal' ? B.budDown : B.bud;
	bag.add('body', bead(c, v3(s * 0.8, s * (kind === 'male' ? 1.5 : 1.3), s * 0.8), col, DETAIL.fruit ? 6 : 3, q));
}

/* ---- the male catkin ---- */

/**
 * A catkin from a lateral bud on last year's wood: through April a stiff green cone 2–3 cm pointing out, then it
 * lengthens and hangs, 10 cm, its ~120 small flowers as knobbly scales, yellow-green as it sheds its pollen in mid May,
 * then brown and dropped. `phase` 0 … 1 through its life (0.5 shedding).
 */
function catkin(bag, at, dir, phase, r, close = false) {
	const C = WN.catkin;
	if (phase <= 0 || phase >= 1) return;
	const len = C.length * lerp(0.25, 1, smooth(phase / 0.42)) * about(r, 1, 0.15);
	const hang = smooth((phase - 0.1) / 0.3);
	const n = close ? 48 : 5;
	const pts = [at.clone()];
	const d = dir.clone().normalize();
	const step = len / n;
	for (let i = 1; i <= n; i++) {
		// out from the bud, then over and down: a hanging catkin's tip straight below
		d.lerp(v3(about(r, 0, 0.06), -1, about(r, 0, 0.06)).normalize(), hang * 0.35).normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, step));
	}
	const ns = Math.floor(r() * 1000);
	const colour = phase < 0.4 ? mix(C.young, C.shed, phase / 0.4) : phase < 0.62 ? mix(C.shed, C.pollen, (phase - 0.4) / 0.22) : mix(C.pollen, C.dead, (phase - 0.62) / 0.2);
	const R = C.radius * lerp(0.6, 1, smooth(phase / 0.4)) * (1 - 0.35 * smooth((phase - 0.7) / 0.2));
	bag.add(
		'catkin',
		tube(
			pts,
			(u, v, s) => {
				// the flowers as scales: bumps in a lattice round and along it
				// the flowers as round scales, some 120 in a spiral
				const bump = close ? Math.pow(Math.abs(Math.sin(v * Math.PI * 6 + s * 240) * Math.sin(s * 470 - v * Math.PI * 2)), 0.5) : 0.5;
				return R * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.15))) * (0.75 + 0.45 * bump);
			},
			(u, v, s) => toColor(colour).clone().lerp(named(C.dead), close ? 0.25 * noise3(v * 9, s * 300, ns, 1) : 0),
			close ? 14 : 4,
			true,
		),
	);
	if (!close) return;
	// close up the ~120 flowers as knobs round it, in a spiral
	const path = { pts, pathLen: lengths(pts) };
	const total = path.pathLen[path.pathLen.length - 1];
	for (let i = 0; i < 110; i++) {
		const u = (i + 0.5) / 110;
		const { at: p, dir: t } = pointAt(path, u * total);
		const side = across(t).applyAxisAngle(t, i * 2.39996);
		const rr = R * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.15)));
		const c = toColor(colour).clone().lerp(named(C.dead), 0.3 * noise3(i * 0.7, ns, 0, 2));
		bag.add('catkin', bead(p.clone().addScaledVector(side, rr * 0.85), v3(rr * 0.6, rr * 0.5, rr * 0.6), c, 3));
	}
}

/* ---- the female flower ---- */

/**
 * A female flower at the tip of a bearing shoot: a small green flask (the ovary in its bracts), finely hairy,
 * 6 × 4 mm, crowned by two curled, feathery stigmas 4–6 mm long, yellow-orange when ready, then browning. `open`
 * 0 … 1.
 */
function female(bag, at, facing, open, r, close = false) {
	const F = WN.female;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const k = lerp(0.6, 1, smooth(open));
	bag.add('body', bead(v3(0, F.length * 0.45 * k, 0), v3(F.width * 0.5 * k, F.length * 0.5 * k, F.width * 0.5 * k), F.flask, close ? 10 : 3), m);
	if (close)
		for (let j = 0; j < 5; j++) {
			// the collar of small pointed bracts round the flask's mouth
			const br = sheet({ length: 0.0026 * k, width: 0.0007, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.5)) * (1 - u * 0.6), lift: (u) => 0.1 * u, paint: () => F.flask, along: 3, across: 1 });
			const tilt = new THREE.Matrix4().makeTranslation(0, F.length * 0.86 * k, 0).multiply(new THREE.Matrix4().makeRotationY((j / 5) * Math.PI * 2)).multiply(new THREE.Matrix4().makeRotationZ(1.1));
			bag.add('sheet', br, m.clone().multiply(tilt));
		}
	if (open < 0.15) return;
	const late = smooth((open - 0.7) / 0.3);
	for (const sg of [1, -1]) {
		const roll = r() * 0.4;
		const s = sheet({
			length: 0.0055 * k,
			width: 0.0034,
			// a broad feathery plume curling out and over
			shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.25 * u) * (1 + 0.12 * Math.sin(u * 40)),
			lift: (u, v) => -0.75 * u * u * u + 0.05 * v * v,
			paint: (u) => mix(F.stigma, F.stigmaLate, late + u * 0.1),
			along: close ? 10 : 2,
			across: close ? 6 : 1,
		});
		const tilt = new THREE.Matrix4().makeTranslation(0, F.length * 0.9 * k, 0).multiply(new THREE.Matrix4().makeRotationY(sg > 0 ? roll : Math.PI + roll)).multiply(new THREE.Matrix4().makeRotationZ(lerp(1.45, 1.2, smooth(open))));
		bag.add('sheet', s, m.clone().multiply(tilt));
	}
}

/* ---- the fruit ---- */

/**
 * How big a husked fruit is, 0 … 1 of its full size, by days after the female bloom: full size at ~8 weeks (the
 * shell hardens in July, then the kernel fills inside without the husk growing).
 */
function fruitSize(d) {
	return straight(d, [
		[0, 0.12],
		[10, 0.2],
		[20, 0.36],
		[30, 0.55],
		[42, 0.78],
		[56, 0.95],
		[70, 1],
	]);
}
const HUSK_LIFT = 1.17;
/** the husk splits ~140 days after bloom (late September), the nut drops a week or two after */
const SPLIT_DAYS = 138;
function huskAt(d, lit) {
	const H = WN.husk;
	if (d < 70) return mix(H.young, H.green, clamp(d / 50) + lit * 0.1);
	if (d < SPLIT_DAYS - 15) return mix(H.green, '#8e9c38', (d - 70) / 60 + lit * 0.05);
	return mix('#8e9c38', H.turning, (d - SPLIT_DAYS + 15) / 15);
}

/**
 * One husked walnut on its stalk from `at` along `dir`: egg-shaped, 50 × 42 mm when grown (the sheet's profile), a
 * little point at its tip with the dry stigma scar, the husk green and densely dotted with pale lenticels; from ~138
 * days after bloom it yellows, cracks from the tip into three or four valves that curl back and blacken, and the nut
 * shows, then drops. `days` after the female bloom.
 */
function walnut(bag, at, dir, days, sunWorld, seedKey, key, fallen) {
	const H = WN.husk;
	const r = chance(seedKey, 'fruit', key);
	const size = fruitSize(days);
	const k = about(r, 1, 0.07);
	const L = H.length * size * k, W = H.width * size * k * about(r, 1, 0.03), D = H.width * size * k;
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const res = DETAIL.fruit === key;
	const stalk = H.stalk * lerp(0.4, 1, clamp(days / 40)) * about(r, 1, 0.15);
	const ns = hashText(key) % 991;
	// the stalk: short and stout, green-brown
	bag.add('twig', tube([v3(0, 0, 0), v3(0.0008, -stalk * 0.5, 0), v3(0, -stalk, 0)], (u) => 0.0022 - 0.0005 * u, () => '#7a7a3a', res ? 10 : 4), m);
	const top = new THREE.Matrix4().multiplyMatrices(m, new THREE.Matrix4().makeTranslation(0, -stalk + 0.0015, 0));
	if (DETAIL.level < 0.5 && !res) {
		// a crowd far off: each fruit a small bead of its colour, thinned with the leaves
		const c = days > SPLIT_DAYS ? named(H.split) : huskAt(days, 0.5);
		bag.add('husk', bead(v3(0, -L * 0.5, 0), v3(W / 2, L / 2, D / 2), c, 3), top);
		return { L, W, stalk };
	}
	const split = smooth((days - SPLIT_DAYS - about(r, 0, 4)) / 8);
	const dark = smooth((days - SPLIT_DAYS - 2) / 30);
	const rings = res ? 80 : fewer(split > 0.001 || fallen ? 7 : 9, 5);
	const sides = res ? 90 : fewer(10, 6);
	const paint = (u, ph) => {
		const n = v3(Math.cos(ph), 0.4 * (0.5 - u), Math.sin(ph)).normalize();
		const lit = Math.max(0, n.dot(sun));
		const c = huskAt(days + 8 * (fbm(Math.cos(ph) * 2, u * 3, Math.sin(ph) * 2, 2, ns) - 0.5), lit);
		// the dry stigma scar at the tip, the stalk end a little darker
		c.lerp(named('#5a4a2a'), clamp(1 - (1 - u) / 0.04) * 0.6);
		// once split, the valves blacken from their edges in
		if (dark > 0) c.lerp(named(H.split), clamp(dark * 1.3 + 0.3 * (fbm(Math.cos(ph) * 4, u * 6, Math.sin(ph) * 4, 3, ns + 2) - 0.5))).lerp(named(H.black), clamp(dark * 1.2 - 0.5));
		// the husk's picture (its dots) darkens its ground a little: lift the colour under it to the sheet's
		return DETAIL.level >= 0.5 ? c.multiplyScalar(HUSK_LIFT) : c;
	};
	const shape = (u, ph) => ({ r: 1 + 0.015 * (fbm(Math.cos(ph) * 1.4, u * 2, Math.sin(ph) * 1.4, 2, ns) - 0.5), c: paint(u, ph), su: 13.2 * W / 0.042, sv: 5 * L / 0.05 });
	if (split <= 0.001 && !fallen) {
		const g = lathe(L, W, D, HUSK_W, rings, sides, shape);
		bag.add('husk', g, top);
		return { L, W, stalk };
	}
	// split: 3 or 4 valves, hinged near the stalk, peeled back from the tip; their inner faces fibrous brown
	const valves = r() < 0.25 ? 3 : 4;
	const gap = 0.08 + 0.1 * split;
	for (let vk = 0; vk < valves; vk++) {
		const a0 = (vk / valves) * Math.PI * 2 + gap, a1 = ((vk + 1) / valves) * Math.PI * 2 - gap;
		const mid = (a0 + a1) / 2;
		const vs = Math.max(4, Math.round(sides / valves));
		// far off a valve is its outer face; close up its fibrous inner face too
		for (const face of res ? [1, 0.86] : [1]) {
			const g = lathe(L, W * face, D * face, HUSK_W, rings, vs, (u, ph0) => {
				const o = shape(u, ph0);
				if (face < 1) o.c = mix(WN.husk.inside, '#5a3e22', 0.4 + dark * 0.6);
				return o;
			});
			// the lathe's angles laid on the valve's own, then the valve turned back about its hinge at the top
			const p = g.attributes.position;
			for (let i = 0; i < p.count; i++) {
				const j = i % (vs + 1);
				const ph = a0 + ((a1 - a0) * j) / vs;
				const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
				const rr = Math.hypot(x / (W * face / 2), z / (D * face / 2)) || 0;
				let X = (W * face / 2) * rr * Math.cos(ph), Z = (D * face / 2) * rr * Math.sin(ph), Y = y;
				// the hinge a third of the way down; below it the valve gapes out by `split` (the sheet's split husk: the
				// valves cracked apart and curling a little, the nut showing between them, not peeled back)
				const h = -L * 0.4;
				if (Y < h) {
					const ang = split * 0.3 * clamp((h - Y) / (L * 0.45) + 0.2);
					const out = v3(Math.cos(mid), 0, Math.sin(mid));
					const radial = X * out.x + Z * out.z;
					const dy = Y - h;
					const nr = radial * Math.cos(ang) - dy * Math.sin(ang);
					const ny = radial * Math.sin(ang) + dy * Math.cos(ang);
					X += (nr - radial) * out.x;
					Z += (nr - radial) * out.z;
					Y = h + ny;
				}
				p.setXYZ(i, X, Y, Z);
			}
			if (face < 1) {
				// the inner face wound the other way, to be seen from inside
				const ix = g.index.array;
				for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
			}
			g.computeVertexNormals();
			bag.add('husk', g, top);
		}
	}
	// the nut in its opened husk, until it drops
	if (!fallen) nut(bag, v3(0, -L * 0.12, 0).applyMatrix4(top), v3(0, -1, 0).applyQuaternion(q), 0, `${seedKey}|${key}`, 'shell', res);
	return { L, W, stalk };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A walnut from its nut, grafted to Franquette in its second spring 20 cm above the
 * soil, grown in an orchard at 10 × 10 m and lightly pruned: while young a monopodial cone (Rauh's model: a leader in
 * yearly flushes, each year's top buds breaking into a tier of wide scaffolds, acrotonic), its stem cleared to 1.6 m;
 * once it bears (its ninth year from the nut), every tip that flowers stops and is carried on by one to three relay
 * shoots from the buds below it, so the outer crown forks and rounds into a broad dome. Height, girth and crown are
 * calibrated to the data sheet's table: 0.3–0.5 m in its first year, 2.5–3.5 m and 4–5 cm at 30 cm in its fourth,
 * 5–6 m, 12–15 cm and a crown 4–5 m across in its eighth, 8–10 m, 24–28 cm and 6–7 m in its fifteenth.
 */
const TREE = {
	depth: WN.nut.depth,
	clear: 1.6, // the stem cleared of side shoots to this height (1.5–2.0 m)
	graft: 0.2, // the graft union above the soil, from the second spring
	// the leader's extension each year (m): 0.3–0.5 m the first, then 60–100 cm, slowing to 30–40 cm as it bears
	leader: [0.42, 1.0, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.55, 0.5, 0.45, 0.42, 0.38, 0.35, 0.32],
	// a side axis's first year by its order (1 the scaffolds), at vigour 1, and how each later year fades
	shoot: [0, 0.95, 0.6, 0.4, 0.27, 0.2],
	fade: [1, 0.86, 0.74, 0.64, 0.57, 0.52, 0.48, 0.45, 0.43, 0.41, 0.4, 0.39, 0.38, 0.37, 0.36],
	limbAngle: 0.92, // from the leader, radians (~53°; the lower tiers wider, to ~72°)
	tipRadius: 0.0034, // a walnut's one-year shoot is stout: 7–10 mm across
	pipeLength: 2.2e-6,
	spurRadius: 0.004,
	firstNuts: 8, // the ninth year from the nut (7–8 years after planting a graft)
	firstCatkins: 9, // catkins a year or two after the first female flowers on a graft
};

/** a year's season: `year` since germination, `s` 0 … 1 from budbreak (~22 April) round to the next */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** the female bloom, ~28 days after budbreak (16–28 May in the Isère) */
const BLOOM = 0.08;
/** how much of a year's extension is grown, `dt` years into that season (shoots grow from budbreak to early July) */
const extension = (dt, first) => (first ? table(dt, [[-0.02, 0], [0.0, 0.03], [0.03, 0.2], [0.1, 0.38], [0.2, 0.72], [0.3, 0.93], [0.4, 1]]) : span(dt, 0.0, 0.2));

/** the crown the grower keeps by the tree's year: its radius R, its height, the dome's middle c and half-height b */
function envelope(y) {
	const R = crownAt(y);
	const H = table(y, [[0, 0.45], [1, 1.45], [3, 3.1], [7, 5.6], [14, 8.6], [24, 12.5], [39, 16]]);
	const clear = clearAt(y + 1);
	const c = clear + 0.4 * (H - clear);
	return { R, H, c, b: H - c };
}
/** the crown's radius the grower keeps by the tree's year (the data sheet's crown widths by age, halved) */
const crownAt = (y) => table(y, [[1, 0.3], [3, 0.85], [7, 2.5], [14, 3.7], [24, 4.6], [39, 5.8]]);
/** the clear stem by age: the young tree branches from a metre; its lowest limbs are taken off as it grows */
const clearAt = (t) => table(t, [[0, 1.0], [4, 1.0], [9, 1.5]]);

/** the nodes of one year's growth of `len` metres: a few leaves on a short shoot, up to 14 on a long one */
const nodesIn = (len) => Math.round(clamp(3 + len * 11, 3, 14));

/**
 * The tree's axes at time t: each axis a polyline as far as grown, its nodes, the year each part grew in, the axes it
 * bears, and the year it bore its nut at its tip (and stopped). Every axis and node draws its own chance, so the tree
 * at an earlier t is the first part of the tree at a later one.
 */
function axes(seed, t, base) {
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.05);
	const lean = (() => {
		const r = chance(seed, 'lean');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.02 + r() * 0.03);
	})();
	/** the share of a year's strong tips that bear, by the tree's year: a few in its ninth, most by its fifteenth */
	const bearing = (y) => (y < TREE.firstNuts ? 0 : lerp(0.18, 0.62, clamp((y - TREE.firstNuts) / 5)));

	const grow = (key, from, dir, born, order, vigour, kind, parent, at, low = 0) => {
		if (t < born + (kind === 'trunk' ? -0.03 : 0.0)) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, low, pts: [from.clone()], years: [born], nodes: [], kids: [], vigour, dir0: dir.clone(), bore: null };
		all.push(ax);
		if (kind === 'spur') {
			// a short shoot: 3–6 cm its first year, a centimetre or two after, a rosette of leaves at its tip each spring;
			// it lives five or six years
			const d = dir.clone();
			let p = from.clone();
			const yearsOld = Math.min(6, Math.floor(t - born) + 1);
			for (let y = 0; y < yearsOld; y++) {
				const f = y === yearsOld - 1 ? span(t - (born + y), 0.0, 0.1) : 1;
				const len = between(r, 0.012, 0.022) * (y === 0 ? 2.5 : 1) * f;
				d.add(v3(about(r, 0, 0.2), 0.2, about(r, 0, 0.2))).normalize();
				p = p.clone().addScaledVector(d, Math.max(0.0005, len));
				ax.pts.push(p);
				ax.years.push(born + y);
				// a short shoot of a bearing tree may end in a female flower (Franquette rarely bears laterally)
				if (y > 0 && chance(seed, 'spur-bears', ...key, y)() < bearing(born + y) * 0.12) {
					ax.bore = born + y;
					break;
				}
			}
			ax.tipYear = ax.years[ax.years.length - 1];
			return ax;
		}
		const d = dir.clone().normalize();
		const outward = from.clone().setY(0);
		let walkedAll = 0;
		for (let y = born; y <= Math.floor(t); y++) {
			const ageAxis = y - born;
			const first = kind === 'trunk' && y === 0;
			let len = kind === 'trunk' ? TREE.leader[Math.min(y, TREE.leader.length - 1)] * vigourTree * about(r, 1, 0.05) : TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree;
			// a bearing tree's shoots shorten
			if (kind !== 'trunk') len *= lerp(1, 0.62, clamp((y - 6) / 6));
			// does this year's shoot end in a female flower? Then it is short, and the axis stops there
			// the leader too ends in a nut once the tree bears well, and the crown's top forks (a modified leader)
			const bears = len > 0.06 && chance(seed, 'bears', ...key, y)() < (kind === 'trunk' ? (y >= TREE.firstNuts + 3 ? 1 : 0) : bearing(y));
			if (bears) len *= 0.5;
			if (len < 0.025) break;
			const f = extension(t - y, first);
			if (f <= 0) break;
			// the shoot's fate is in its bud: one that will end in a female flower bears from its budbreak on
			if (bears) ax.bore = y;
			const step = first && t < 0.2 ? 0.005 : 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			const nn = nodesIn(len);
			let walked = 0;
			let node = 0;
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'trunk') d.add(v3(lean.x * 0.06 + about(r, 0, 0.03), 0.3, lean.z * 0.06 + about(r, 0, 0.03)));
				else {
					// a limb keeps to its angle and rises to the light; lower limbs spread and turn up less; the older
					// and longer it is the more it bends out and down under its own weight and its crop
					const up = (order === 1 ? 0.011 : 0.016) * (1 - 0.7 * low);
					const sag = 0.0026 * (order + 0.5) * Math.min(6, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.35) * (order === 1 ? 0.8 : 1.1);
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(0.012) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, 0.08);
					d.add(v3(about(r, 0, 0.06) + out.x, up - sag, about(r, 0, 0.06) + out.z));
					// the crown the grower keeps (10 × 10 m, contour-pruned): a dome by the tree's age, widest about two fifths
					// of the way up, its skirt a little below the clear stem; near its face a shoot turns in, past it it stops
					// for the year
					const here = ax.pts[ax.pts.length - 1];
					const E = envelope(y);
					const rad = Math.hypot(here.x, here.z);
					const ex = rad / E.R, ey = (here.y - E.c) / E.b;
					const e = Math.hypot(ex, ey);
					if (e > 0.8) {
						const k2 = smooth((e - 0.8) / 0.25);
						const inX = rad > 1e-6 ? -here.x / rad : 0, inZ = rad > 1e-6 ? -here.z / rad : 0;
						d.add(v3(inX * 0.2 * k2 * ex, -0.22 * k2 * ey, inZ * 0.2 * k2 * ex));
					}
					if (e > 1.04) break;
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				// a short shoot is preformed in its bud: all its nodes are there from budbreak, the internodes stretching
				// as it grows; a long one adds its nodes as it goes
				const span0 = len < 0.35 ? grown : len;
				while (node < nn && ((node + 1) / nn) * span0 * 0.98 <= walked + 1e-9) {
					const u = (node + 1) / nn;
					// a short shoot's leaves are in its bud and unfold together; a long one's open one by one into July
					ax.nodes.push({ i: ax.nodes.length, year: y, u, s: walkedAll + u * span0 * 0.98, formed: y + (first ? 0.02 : 0.005) + Math.min(0.17, 0.3 * len) * Math.pow(u, 1.2), last: node === nn - 1 });
					node++;
				}
			}
			walkedAll += walked;
			if (f < 1 || bears) break;
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
			n.bearing = phase + n.i * 2.513; // alternate, 2/5 of a turn between leaves [EST]
		}
		// lateral buds: the next spring the top ones break into long shoots (acrotony), some lower ones into short
		// shoots, the rest stay (male catkin buds, or asleep). A tip that bore is carried on by one to three relays
		// from just below it.
		const yearLenOf = (yy) => TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(yy - born, TREE.fade.length - 1)];
		for (const n of ax.nodes) {
			n.male = chance(seed, 'male-bud', ...key, n.i)() < (kind === 'trunk' ? 0.15 : n.u > 0.2 && n.u < 0.9 ? 0.42 : 0.15);
			if (n.year + 1 > t) continue;
			const br = chance(seed, 'bud', ...key, n.i);
			const u = n.u;
			const roll = br();
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			let pLong, pSpur, angle, vig, ord = order + 1;
			const relay = ax.bore === n.year && u > 0.55;
			if (relay) {
				// the relays: the axis's own order (the leader's: scaffolds) and nearly its vigour, close to its direction
				pLong = n.last ? 0.78 : u > 0.75 ? 0.3 : 0.06;
				pSpur = 0.05;
				angle = about(br, kind === 'trunk' ? 0.62 : 0.45, 0.15);
				vig = kind === 'trunk' ? about(br, 0.8, 0.1) : vigour * about(br, 0.92, 0.1);
				ord = Math.max(1, order);
			} else if (kind === 'trunk') {
				const h = n.s - TREE.depth;
				if (h < clearAt(n.year + 1)) continue;
				pLong = u > 0.7 ? 0.45 : u > 0.4 ? 0.26 : 0.06;
				pSpur = 0.05;
				// the lower tiers leave wider and grow stronger, the upper ones steeper: a dome, not a cone
				const low = clamp(1 - (h - TREE.clear) / 2.4);
				const high = clamp((h - TREE.clear - 3.0) / 2.0);
				angle = lerp(TREE.limbAngle, 1.25, low) * about(br, 1, 0.1);
				vig = lerp(0.75, 1.0, u) * (1 + 0.35 * low) * (1 + 0.1 * high) * about(br, 1, 0.1);
			} else {
				const yearLen = yearLenOf(n.year);
				const above = side.y > 0.6 ? 0.55 : side.y < -0.6 ? 0.4 : 1;
				pLong = order >= 4 ? 0 : (u > 0.75 ? 0.46 : u > 0.5 ? 0.17 : u > 0.25 ? 0.05 : 0) * clamp(yearLen / 0.12) * above * (order === 3 ? 0.6 : 1);
				pSpur = u > 0.15 && u < 0.75 && order <= 3 ? 0.03 : 0.015;
				angle = (order === 1 ? lerp(0.85, 0.55, u) : lerp(0.95, 0.6, u)) * about(br, 1, 0.15);
				vig = vigour * lerp(0.5, 0.88, u) * about(br, 1, 0.12);
			}
			if (roll < pLong) {
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const k = grow([...key, n.i], n.at, d0, n.year + 1, ord, vig, 'long', ax, n.s, kind === 'trunk' ? clamp(1 - (n.s - TREE.depth - TREE.clear) / 2.4) : ax.low);
				if (k) {
					n.kid = true;
					ax.kids.push(k);
				}
			} else if (roll < pLong + pSpur) {
				const d0 = n.dir.clone().multiplyScalar(0.4).addScaledVector(side, 1).normalize();
				const k = grow([...key, n.i, 's'], n.at, d0, n.year + 1, order + 1, 0, 'spur', ax, n.s);
				if (k) {
					n.kid = true;
					k.node = n;
					ax.kids.push(k);
				}
			}
		}
		return ax;
	};
	const trunk = grow(['trunk'], base.clone(), v3(0, 1, 0), 0, 0, 1, 'trunk', null, 0);
	// what grew and was shaded out inside the crown falls: a side shoot of the third order or more whose tip has not
	// grown for three years dies, and everything on it (the inner crown of a walnut is bare wood)
	const dead = new Set();
	const prune = (ax) => {
		// the lowest scaffolds of the young tree, taken off as the clear stem is lifted
		const lifted = ax.kind !== 'spur' && ax.parent?.kind === 'trunk' && ax.at - TREE.depth < clearAt(t) - 0.02;
		if (lifted || (ax.kind === 'long' && ax.order >= 3 && ax.bore === null && Math.floor(t) - ax.tipYear >= 3)) {
			const mark = (a) => {
				dead.add(a);
				a.kids.forEach(mark);
			};
			mark(ax);
			return;
		}
		ax.kids.forEach(prune);
	};
	if (trunk) prune(trunk);
	for (const ax of all) if (ax.parent && dead.has(ax) && !dead.has(ax.parent)) ax.parent.kids = ax.parent.kids.filter((k) => k !== ax);
	return { all: all.filter((a) => !dead.has(a)), trunk };
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
 * calibrated to the data sheet: 4–5 cm at 30 cm in its fourth year, 12–15 cm in its eighth, 24–28 cm in its fifteenth.
 */
const PIPE = 2.5;
const RING = 0.1;
const RING_ADD = 0.0062; // a fixed ring a year, which a young tree's few shoots would not explain
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	// (the seedling's first shoot is thinner: 4–5 mm)
	const tip = ax.kind === 'spur' ? TREE.spurRadius : ax.kind === 'trunk' && t < 1 ? lerp(0.0022, TREE.tipRadius, clamp(t)) : TREE.tipRadius;
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.kind === 'spur' ? Math.pow(0.0025, PIPE) : k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'spur' ? 0 : TREE.pipeLength * Math.pow(tip, 0.5) * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'spur' ? 0 : RING_ADD * Math.min(woodAge, 5) * clamp(Math.pow(q, 1 / PIPE) / 0.012));
		ax.r2[i] = r * r;
	}
}

/** the tree's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
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
	const step = ax.kind === 'trunk' ? clamp(R0 * 0.3, 0.006, 0.04) : ax.kind === 'spur' ? 0.02 : R0 > 0.02 ? clamp(R0 * 2.2, 0.04, 0.14) : clamp(R0 * 5, 0.04, 0.14);
	const pts = [];
	const count = Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'spur' ? 4 : Math.round(clamp(R0 * (R0 > 0.02 ? 300 : 250), ax.kind === 'trunk' ? 8 : 4, 40));
	const isTrunk = ax.kind === 'trunk';
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			// the root flare, in low buttresses; the graft union a gentle swelling 20 cm up from the second year
			const ground = s - TREE.depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.14);
			r *= 1 + 0.45 * clamp(t / 6) * flare * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			r *= 1 + 0.06 * clamp(t - 1.3) * Math.exp(-Math.pow((ground - TREE.graft) / 0.03, 2));
		}
		if (ax.kind !== 'spur' && s < r * 2.2 && ax.parent) r *= 1 + 0.25 * (1 - s / (r * 2.2)); // the branch collar
		return r * (1 + barkRelief(r, v, s, nsAx));
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - (ax.kind === 'spur' ? 0.6 : 0.2);
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx);
		if (isTrunk && t < 1) {
			// the seedling's stem: pale under the soil, green-brown above, reddish where the sun meets it
			const young = s < TREE.depth ? mix('#ece4c8', '#c9c08a', s / TREE.depth) : mix('#7a8a3d', '#8a5a3e', sun * 0.5 + clamp(t * 2) * 0.3);
			c.lerp(young, 1 - clamp((t - 0.4) / 0.6));
		}
		if (isTrunk && s < TREE.depth + 0.01) c.lerp(named(WN.root.old), clamp((TREE.depth + 0.01 - s) / 0.03) * clamp(t));
		return c;
	};
	// the fissured bark's picture only where the bark is old (from some 10 cm across); smooth wood plain
	const kind = R0 < 0.045 && !(ax.kind === 'trunk' && t > 6) ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	if (kind === 'bark') metric(geo, total / 0.3, (Math.PI * 2 * Math.max(R0, 0.01)) / 0.3);
	bag.add(kind, geo);
}

/** the roots: the thick taproot down from the nut, then the laterals spreading wider than the crown */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	const age = clamp(t / 12);
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.03, -1, 0.02),
		length: 2.6,
		// the taproot first: 50–80 cm in its first autumn (longer than the shoot), 2–3 m grown
		grown: table(t, [[-0.06, 0], [-0.03, 0.006], [0.03, 0.04], [0.25, 0.2], [1, 0.3], [3, 0.55], [8, 0.85], [15, 1]]),
		radius: 0.0045 + 0.07 * span(t, 0.3, 14),
		down: 0.02,
		wander: 0.08,
		laterals: 10,
		lateral: 0.3,
		depth: 2,
		taper: 0.8,
		age: span(t, 0.2, 4),
		young: WN.root.young,
		old: WN.root.old,
	});
	const count = 8;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.2 + i * 0.5;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.02, -0.03 - rr() * 0.2, Math.sin(bear) * 0.02)),
			dir: v3(Math.cos(bear), -0.1 - rr() * 0.12, Math.sin(bear)),
			length: between(rr, 3, 4.5) * lerp(0.35, 1, age),
			grown: (t - born) / 8,
			radius: 0.002 + 0.07 * span(t, born + 0.5, 15) * between(rr, 0.6, 1),
			down: 0.012,
			wander: 0.14,
			laterals: 5,
			lateral: 0.32,
			depth: 2,
			taper: 0.85,
			age: (t - born - 0.4) / 4,
			young: WN.root.young,
			old: WN.root.old,
			floor: -1.1,
		});
	}
}

/**
 * The whole walnut at time t (years from germination): the nut, the roots, the wood, and what the season puts on it:
 * bronze leaves at budbreak, catkins on last year's wood, the female flowers at the tips, leaves, husked nuts from set
 * to split, nuts on the ground, autumn colour.
 */
function walnutTree(t, seed) {
	const bag = new Bag();
	const { year, s } = seasonOf(t);
	const base = v3(0, -TREE.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	// the nut, sown in autumn and chilled through the winter, split along its seam as it germinates; it stays in the
	// soil with the seed leaves in it (hypogeal) and rots in its second year
	if (t < 1.5) {
		const split = span(t, -0.06, -0.02);
		const at = base.clone().add(v3(0.016, -0.005, 0.004));
		// drawn finely while it is what the stage shows (the nut, the germination); coarse once the tree is up
		lite(t > 0.6 ? { level: Math.min(DETAIL.level, 0.5) } : {}, () => nut(bag, at, v3(-1, -0.15, 0.1).normalize(), split, seed, 'shell', t < 0.2 && DETAIL.level >= 0.5));
	}

	roots(bag, seed, t, base.clone().add(v3(0, -0.01, 0)));

	// the shoot from between the seed leaves' stalks: it comes up bent in a hook
	const { all, trunk } = axes(seed, t, base.clone().add(v3(0, 0.006, 0)));
	if (!trunk) return bag.build();
	const hook = 1 - span(t, 0.03, 0.07);
	if (hook > 0 && trunk.pts.length > 2) {
		const pts = trunk.pts;
		const L = lengths(pts);
		const total = L[L.length - 1];
		const Lh = Math.min(0.02, total * 0.5);
		const s0 = total - Lh;
		const piv = pointAt({ pts, pathLen: L }, s0);
		const bend = hook * Math.PI * 0.95;
		const Rc = Lh / bend;
		const side = v3(1, 0, 0.3).normalize();
		for (let i = 0; i < pts.length; i++) {
			if (L[i] <= s0) continue;
			const ang = (L[i] - s0) / Rc;
			pts[i].copy(piv.at).addScaledVector(piv.dir, Rc * Math.sin(ang)).addScaledVector(side, Rc * (1 - Math.cos(ang)));
		}
		trunk.pathLen = null;
	}
	thicken(trunk, t);
	for (const ax of all) wood(bag, ax, t, hashText(seed) % 997, sunDir);

	const space = bag.space;
	for (const ax of all) {
		if (ax.kind === 'spur' || ax.pts.length < 2) continue;
		const R = (i) => Math.sqrt(ax.r2[Math.min(ax.r2.length - 1, Math.round(i * (ax.r2.length - 1)))]);
		space.rod(ax.pts, (u) => R(u) + 0.003);
	}

	// leaves 25–30 cm, to 45 on vigorous shoots: a young tree's and a strong crown's run large
	const leafSize = (y) => (y < 1 ? 0.72 : y < 3 ? 1.05 : 1.15);
	const fall = span(s, 0.5, 0.57); // leaves yellow-brown and fall at the end of October
	const leafy = s >= 0 && fall < 1;
	// the first year's leaves: one pair of leaflets at the first node, then two, then three (the seedling's)
	const pairsAt = (ax, n) => (ax.kind === 'trunk' && n.year === 0 ? (n.i < 1 ? 1 : n.i < 3 ? 2 : 3) : 3);
	const bronzeOf = (formed) => 1 - smooth((t - formed) / 0.055);
	const ageOf = (formed) => clamp((t - formed) / 0.06);

	// the fruit first (they keep their place), then the leaves
	for (const ax of all) {
		if (ax.bore !== year || ax.pts.length < 2) continue;
		const tip = ax.pts[ax.pts.length - 1];
		const dir = tip.clone().sub(ax.pts[ax.pts.length - 2]).normalize();
		femaleAt(bag, seed, ax.key, tip, dir, s, t, space, sunDir);
	}
	for (const ax of all) {
		const tipR = Math.sqrt(ax.r2[ax.r2.length - 1]);
		if (ax.kind === 'spur') {
			const tip = ax.pts[ax.pts.length - 1];
			const dir = tip.clone().sub(ax.pts[ax.pts.length - 2]).normalize();
			if (leafy && t - ax.born > 0) {
				// a rosette of three to five leaves at its tip each spring
				const kr = chance(seed, 'spur-leaves', ...ax.key, year);
				const n = 2 + Math.floor(kr() * 3);
				const formed = year + 0.01 + kr() * 0.02;
				if (t >= formed)
					for (let k = 0; k < n; k++) {
						const a = (k / n) * Math.PI * 2 + kr() * 0.6;
						const side = across(dir).applyAxisAngle(dir, a);
						const at = tip.clone().addScaledVector(side, 0.003);
						leaf(bag, at, side.clone().addScaledVector(dir, 0.6).normalize(), leafSize(year) * about(kr, 0.78, 0.1), ageOf(formed), bronzeOf(formed), fall, kr);
					}
			}
			if (s > 0.3 && ax.bore !== year) bud(bag, tip, dir, 'terminal', chance(seed, 'bud-t', ...ax.key));
			continue;
		}
		for (const n of ax.nodes) {
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const surf = n.at.clone().addScaledVector(side, Math.max(tipR, 0.0025));
			const budDir = side.clone().addScaledVector(n.dir, 0.9).normalize();
			if (n.year === year && t >= n.formed && leafy) {
				const size = leafSize(year) * (ax.kind === 'trunk' && n.year === 0 ? Math.min(1, 0.5 + 0.08 * n.i) : 1) * about(nr, 1.02, 0.1);
				leaf(bag, surf, side.clone().addScaledVector(n.dir, 0.55).normalize(), size, ageOf(n.formed), bronzeOf(n.formed), fall, nr, false, pairsAt(ax, n));
				// next year's buds in its axils from late summer: male catkin buds (little cones) where the tree is old enough
				// (only once the leaves fall: under them they are a few millimetres, and a tree has thousands)
				if (s > 0.5) bud(bag, surf, budDir, n.male && year + 1 >= TREE.firstCatkins ? 'male' : 'lateral', nr);
			} else if (n.year === year - 1 && n.male && !n.kid && year >= TREE.firstCatkins && s < 0.11) {
				// a catkin from last year's wood: out in late April, shedding in mid May, dropped by the end of May
				const ph = (s + 0.012 + about(nr, 0, 0.008)) / 0.11;
				catkin(bag, surf, side.clone().addScaledVector(n.dir, 0.25).normalize(), ph, nr);
			}
		}
		// the fat terminal bud at the tip of this year's growth, from late summer
		if (s > 0.3 && ax.tipYear === year && ax.bore !== year && ax.pts.length > 1) {
			const n = ax.pts.length;
			bud(bag, ax.pts[n - 1], ax.pts[n - 1].clone().sub(ax.pts[n - 2]).normalize(), 'terminal', chance(seed, 'season', ...ax.key));
		}
	}
	return bag.build();
}

/**
 * A bearing tip through its season: one (sometimes two) female flowers among the young leaves, receptive about four
 * weeks after budbreak; most set (unpollinated ones drop in June); the husked walnut grows full size by mid July on a
 * short stout stalk, its weight bending the tip down; from late September the husk yellows, splits and blackens, and
 * the nut drops to the ground under the crown.
 */
function femaleAt(bag, seed, key, at, dir, s, t, space, sunDir) {
	const fr0 = chance(seed, 'female', ...key);
	const n = fr0() < 0.22 ? 2 : 1;
	for (let k = 0; k < n; k++) {
		const fr = chance(seed, 'female', ...key, k);
		const opens = BLOOM + about(fr, 0, 0.012);
		const ph = s - opens;
		const side = across(dir).applyAxisAngle(dir, (k / n) * Math.PI * 2 + fr() * 1.2);
		const p = at.clone().addScaledVector(side, n > 1 ? 0.004 : 0.0);
		const facing = dir.clone().addScaledVector(side, n > 1 ? 0.5 : 0.1).normalize();
		if (ph < -0.045) continue; // still inside the bud with the leaves
		if (ph < 0.03) {
			female(bag, p, facing, span(ph, -0.04, 0.0) * 0.8 + span(ph, 0.0, 0.03) * 0.2, fr);
			continue;
		}
		const sets = fr() < 0.82 && (k === 0 || fr() < 0.7);
		if (!sets) continue;
		const d = (s - opens) * 365;
		// the walnut hangs from the tip as it grows heavy: up at first, bending over and down by July
		const hang = facing.clone().lerp(v3(0, -1, 0).addScaledVector(facing.clone().setY(0), 0.6), smooth(d / 60)).normalize();
		const Hk = WN.husk;
		const ripe = (a2, d2) => [{ c: a2.clone().addScaledVector(d2, Hk.stalk + Hk.length * 0.5), r: Hk.width * 0.44 }];
		const place = space.settle(p, hang, ripe, 0.006, 0.03) ?? { at: p, dir: hang };
		const dropAt = SPLIT_DAYS + 8 + about(fr, 0, 6);
		const fallen = d > dropAt && !DETAIL.fruit;
		if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit([...key, k], p, place.dir);
		walnut(bag, place.at, place.dir, d, sunDir, seed, [...key, k].join('|'), fallen);
		bag.fruitDone();
		if (fallen) {
			// on the ground below, where it fell, lying on its side
			const g = at.clone().add(v3(about(fr, 0, 0.4), 0, about(fr, 0, 0.4)));
			g.y = WN.nut.width * 0.47;
			const lay = v3(Math.cos(fr() * 6.28), about(fr, 0, 0.15), Math.sin(fr() * 6.28)).normalize();
			nut(bag, g.clone().addScaledVector(lay, -WN.nut.length * 0.5), lay, 0, `${seed}|${key.join('|')}|${k}`, 'shell');
		}
	}
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Eleven stages, from the nut to the harvest; `t` the years since germination each is grown at (between two stages,
 * on the way). The last five are one season of the tree's fifteenth year, when it comes into full bearing: budbreak
 * in late April, the female bloom in late May, the husks splitting about 140 days after, early October.
 */
const STAGES = [
	{ name: 'Nut', t: -0.45, note: "The nut, 39 × 32 × 31 mm and 10.5 g, elongated with a pointed tip and a raised seam right round it, its shell thin and light; sown 5–6 cm deep in early November and chilled by the winter (30–150 days of cold)." },
	{ name: 'Germination', t: 0.03, note: 'May: the shell splits along its seam; a thick white taproot goes straight down; the seed leaves stay inside the shell in the soil (hypogeal) and the stout shoot comes up bent in a hook.' },
	{ name: 'Seedling', t: 0.25, note: 'Late July of its first summer: one stout stem some 30 cm tall, its first leaves with one or two pairs of leaflets, then three, bronze-red as they open; the taproot already longer than the shoot.' },
	{ name: 'Whip', t: 1.3, note: 'Its second summer, grafted to Franquette in the spring 20 cm above the soil: a straight whip of 1.2–1.8 m, olive-brown and dotted with lenticels, its big pinnate leaves 25–30 cm long.' },
	{ name: 'Young tree', t: 3.3, note: 'Its fourth summer: about 3 m, a leader with a first tier of wide scaffolds above a stem cleared toward 1.6 m, the trunk 4–5 cm across and smooth, silver-grey. No flowers yet.' },
	{ name: 'Conic tree', t: 7.3, note: 'Its eighth summer: 5–6 m tall and 4–5 m across, still a cone round its leader, tier on tier of spreading scaffolds; the trunk 12–15 cm at 30 cm, its bark beginning to fissure at the foot. The first nuts come next year.' },
	{ name: 'Budbreak', t: 14.042, note: "Its fifteenth spring, early May (Franquette leafs out late, 19–26 April, and so escapes the late frosts): the new leaves bronze-red and limp; green catkins lengthening from last year's wood. 8–10 m, a broad crown 6–7 m across on a grey trunk 24–28 cm thick." },
	{ name: 'Flowering', t: 14.085, note: 'Late May: the catkins have shed their pollen (the tree is protandrous) and are falling; at the tips of the strongest new shoots one, sometimes two, female flowers with two feathery yellow-orange stigmas. The leaves greening.' },
	{ name: 'Green walnuts', t: 14.3, note: 'Early August: the husked walnuts full size since mid July, 50 × 42 mm, bright green densely dotted pale, one (or two) at each bearing tip, their weight bending the tips down; the shell inside hard, the kernel filling.' },
	{ name: 'Husks split', t: 14.47, note: 'Late September, some 140 days after the bloom: the husks yellow, crack into three or four valves and blacken; the light-shelled nuts show in them.' },
	{ name: 'Harvest', t: 14.5, note: 'Early October: the nuts drop from the open black husks to the grass and are gathered from the ground: 39 × 32 mm, light shells, pale kernels (45 % of the nut), 15–25 kg a tree in full bearing. Noix de Grenoble.' },
];

/** the years since germination at a stage (between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => walnutTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one walnut on its own ---- */

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

/** the fruit the tree bears at its harvest, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false, fruit: '-' }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.85);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one walnut at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This tree bears no nuts yet.');
	const { plant, fruits } = lite({ ...detailAt(1), fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This walnut has not set yet.');
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
	id: 'walnut',
	label: "Walnut 'Franquette' · Juglans regia",
	latin: "Juglans regia L. 'Franquette' · Persian or English walnut · noyer commun · Noix de Grenoble (AOP) · Walnuss",
	note: "Franquette, the classic walnut of the Isère and the Noix de Grenoble: a large spreading tree, 8–10 m at fifteen years and to 20 m, on a short stout trunk, smooth silver-grey when young and furrowed grey when old; pinnate leaves of seven leaflets, bronze as they open late in April; green catkins on last year's wood, then one or two small female flowers with yellow-orange stigmas at the tips of the new shoots; green husked walnuts 50 × 42 mm, densely dotted pale, splitting black in early October over elongated, pointed, light-shelled nuts 39 × 32 mm.",
	from: 'Tree · 15 years from the nut',
	layer: 'canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '6a9878f231aee812cb3492ba2fbec6e2041d357da9e64c78b1fd04282a96346f', model: 'fal-ai/nano-banana-pro (+ /edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right; plant-skill's data sheet for the walnut, S1–S37
	facts: {
		height: { at1: [0.3, 0.5], at2: [1.2, 1.8], at4: [2.5, 3.5], at8: [5, 6], at15: [8, 10], at25: [11, 14], at40: [14, 18], grown: [15, 20], unit: 'm' },
		trunk: { at4: [0.04, 0.05], at8: [0.12, 0.15], at15: [0.24, 0.28], at25: [0.38, 0.44], at40: [0.55, 0.62], measuredAt: 0.3, unit: 'm' },
		crown: { at4: [1.2, 1.8], at8: [4, 5], at15: [6, 7], at25: [8, 9.5], at40: [10.5, 12], unit: 'm' },
		spacing: { orchard: [10, 10], least: 8, unit: 'm' },
		shade: 'full sun; strongly phototropic; some shade in youth at the cost of growth',
		climate: 'temperate; the AOP area 10.5 °C mean, 800–1,100 mm rain, orchards at or below 800 m; a growing season of 180 days or more; late leafing escapes late frosts; deep, well-drained soil (80 cm or more)',
		years: { firstNuts: [9, 11], firstCatkins: [10, 12], fullBearing: [15, 20], productiveLife: [50, 70], lifespan: [150, 200] },
		leaf: { length: [0.25, 0.45], petiole: [0.05, 0.07], leaflets: [5, 9], terminalLeaflet: [0.12, 0.15], budBreak: '19–26 April', fall: 'end of October–early November', unit: 'm' },
		catkin: { length: [0.05, 0.15], flowers: 120, pollen: 'about 8–20 May', unit: 'm' },
		flower: { female: 'at the tips of the new shoots, 1 (–2)', size: [0.005, 0.007], femaleBloom: '16–28 May', protandrous: true, unit: 'm' },
		fruit: { husk: [0.05, 0.042], nut: [0.039, 0.032, 0.031], nutMass: 0.0105, kernel: 0.457, shell: [0.0012, 0.0014], fullSizeDays: 56, splitDays: [135, 150], harvest: 'late September–mid October', unit: 'm, kg, days' },
		nut: { perKg: [66, 110], chilling: [30, 156], depth: 0.05, germination: 'hypogeal', unit: 'kg, days, m' },
		yield: { perTree: [15, 25], at18: 11, perHectare: [1.5, 2.5], aopCap: 4, unit: 'kg a tree a year; t a hectare' },
		diseases: 'bacterial blight (black spots on husks and leaves), anthracnose, husk fly, codling moth',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one walnut) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'walnut' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'walnut',
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
module.exports.organs = { WN, LEAFLET_W, HUSK_W, NUT_W, nut, nutGeometry, leaf, catkin, female, walnut, bud, Bag, timeAt, walnutTree, axes, thicken, fruitSize, huskAt, surface, lite, detailAt, STAGES, lathe };
