'use strict';
/*
 * PLUM 'HAUSZWETSCHGE' — Prunus domestica L. subsp. domestica 'Hauszwetschge' (Hauszwetsche, Gemeine Zwetsche,
 * Bauernzwetschge; Požegača in the Balkans, Domácí švestka in Czechia): the old blue plum of German farm orchards, the
 * Zwetschge of the Zwetschgendatschi. Version 2 of plants/plum: one named cultivar, grown from its stone to a laden
 * tree in its eighth September.
 *
 * Its numbers are the cultivar's where they are measured (the Holovousy trials of 'Domácí švestka': trunk 3.9 cm in
 * the 3rd leaf to 11 cm at 13 years, flowering from 25 April, ripe 134–135 days after, fruit 39 × 29 × 26 mm and
 * 18–19 g, 11 % set and 71 % kept; Bundessortenamt and German pomology: the stone 21.5–23.5 × 12 × 6–7 mm, stalk
 * 21–32 mm, the leaders steeply erect, the fine fruit wood hanging) and the species' otherwise (USDA Woody Plant Seed
 * Manual: chilling and hypogeal germination; Flora of China: leaf, flower); estimates are marked in the data sheet.
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro and kept on play by its hash (9f54892e…): its outlines and colours traced off its panels. Where the plate
 * is wrong against the data sheet (it draws the seed leaves out of the soil, a ripe plum too round, a blossoming crown
 * as broad as a cherry's), the data sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from banana v2, with the plum's materials and its surfaces: small pictures
 *                   made from noise for what vertex colours cannot carry (the leaf's quilted veins, the old bark's
 *                   scaly plates, the bloom on the skin).
 *   2. ORGANS       the plum's own, each to its measure: stone, bark, leaf, bud, flower, fruit.
 *   3. THE TREE     its axes year by year (a leader with tiers of steep limbs, long shoots, spurs), its roots, its
 *                   seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from germination (t = 0 the stone splitting, April); a year's season
 * `s` 0 … 1 from the bloom (late April) round to the next.
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
		// the plum's: thousands of small leaves and flowers, so a crowd keeps fewer of them, each grown more
		[0.1, 0.1, 1.7, 0.006],
		[0.25, 0.28, 1.45, 0.0016],
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
 * plates of old bark, the bloom on a plum. Laid on by the shape's UVs (a leaf's own, the bark's in metres: `metric`),
 * mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); the plum has no bump
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
 *                        midrib at v = ½): the plum's pinnate veins, 7–9 pairs leaving the midrib at about 45° and
 *                        arching toward the tip near the margin, the finer net between them sunk into the blade so it
 *                        is quilted (rugose), as a Zwetschge leaf is; the veins a little paler than the blade
 *   barkMap              0.2 m square of old plum bark, laid on in metres: small irregular scaly plates, the fissures
 *                        between them dark and deep, short pale lenticel dashes across the grain where it is younger
 *   bloomMap             a plum's skin under its wax: the bloom a little uneven, a few smears where it was rubbed off
 *                        (darker, the purple showing), and fine pale dots (lenticels)
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 8;
	const vein = (x, y, sharp) => {
		// side 0 at the midrib, 1 at the margin; the secondaries leave at ~45° and arch toward the tip
		const side = Math.abs(y - 0.5) * 2;
		const slant = side * 0.55 + 0.25 * side * side;
		const phase = (x - 0.04) * VEINS - slant * 1.1;
		const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), sharp) * smooth((0.94 - side) / 0.1) * smooth((x - 0.03) / 0.05) * smooth((0.97 - x) / 0.08);
		const mid = Math.exp(-Math.pow((y - 0.5) / 0.012, 2));
		// the net of fine veins between: cells
		const c = tileCells(x, y, 18, 10, 7);
		const net = smooth((0.08 - (c.f2 - c.f1)) / 0.06);
		return { sec, mid, net, side };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const { sec, mid, net } = vein(x, y, 30);
				const mottle = tileNoise(x, y, 18, 3) - 0.5;
				// the veins paler than the blade, the quilted areoles between a little darker (the sheet's leaf)
				const k = 0.88 + 0.2 * sec + 0.18 * mid + 0.08 * net + 0.06 * mottle;
				return [k * 1.0, k * 1.02, k * 0.92];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x round the trunk, y up it (0.2 m): long shallow fissures running up it and wandering, broken across now
				// and then into plates 2–3 cm wide and 5–10 cm tall, their faces scaly and uneven
				const w = tileNoise(x, y, 5, 61, 2) - 0.5;
				const c = tileCells(x + w * 0.06, y, 8, 2, 63);
				const fissure = smooth((0.07 - (c.f2 - c.f1)) / 0.06);
				const scale = 0.8 + 0.25 * c.id + 0.18 * (tileNoise(x, y, 30, 65, 3, 12) - 0.5);
				const k = scale * lerp(1, 0.5, fissure);
				return [k, k * 0.97, k * 0.95];
			}, true),
		bloomMap: () =>
			picture(256, 256, (x, y) => {
				// the wax a little uneven, a few faint finger-smears where it is thinner, fine pale lenticel dots
				const smear = 0;
				const dots = tileCells(x, y, 36, 36, 73);
				const dot = dots.id < 0.4 ? smooth((0.09 - dots.f1) / 0.05) : 0;
				const k = 0.98 + 0.04 * (tileNoise(x, y, 14, 75) - 0.5);
				return [k * lerp(1, 0.9, smear) + 0.08 * dot, k * lerp(1, 0.88, smear) + 0.08 * dot, k * lerp(1, 0.92, smear) + 0.07 * dot];
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
 * `bloom` the plum's skin under its blue-grey wax (sheen); `sheet` thin things seen from both sides (petals, sepals);
 * `body` buds, stalks, the stone, roots.
 */
const MATERIALS = {
	// colour pictures only, no bump: a bump picture's normal is NaN wherever a triangle stands edge-on or shrinks under a
	// pixel on screen (three's perturbNormalArb), and a dense tree of small triangles finds such a pixel from somewhere
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.04, clearcoatRoughness: 0.6, ...(s && { map: s('leafMap') }) }),
	bloom: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.9, sheenRoughness: 0.42, sheenColor: new THREE.Color(0.42, 0.48, 0.62), ...(s && { map: s('bloomMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'bloom', 'prop'];
// a plum has thousands of leaves and flowers: a crowd far off draws a share of them, each grown to fill the gap
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
 * 2. ORGANS — the Hauszwetschge's own, each to its measure
 * ============================================================================================================== */

/**
 * The Hauszwetschge's numbers. Sizes in metres from the data sheet (cultivar trials under its own name and its
 * synonyms 'Domácí švestka' at Holovousy and Požegača; the species where it was not measured); outlines and colours
 * traced off its reference sheet (play file 9f54892e…, Nano Banana Pro, 2026-11-05) with plant-skill's trace.py, the
 * colours as the sheet's hex (sRGB) medians, the spread its p10–p90.
 */
const ZW = {
	// the stone: 21.5–23.5 × ~12 × 6–7 mm, 0.65–0.98 g, oval, a blunt main ridge, rough cheeks; sown 5 cm deep
	stone: { length: 0.0225, width: 0.012, thick: 0.0065, colour: '#c89058', groove: '#a06a40', light: '#dcab78', depth: 0.05 },
	kernel: { colour: '#9a6038', inside: '#f1e6cc' },
	// leaf: area 17–20 cm² [CV] → ~7.2 × 4.2 cm; petiole 1–2 cm; colours: the sheet's upper side, underside, young
	// leaf and autumn leaf
	leaf: { length: 0.072, width: 0.044, petiole: 0.015, top: '#6a7d48', topDark: '#5a6d3a', under: '#8c966a', vein: '#a9b27c', young: '#9bab3a', autumn: '#e4922a', autumnLate: '#c8641e', petioleColour: '#8a7a40' },
	flower: { petal: 0.0085, petalColour: '#fdfdfa', base: '#e8ecd2', bud: '#eef0e2', budScale: '#6a4a32', calyx: '#8a9a44', sepal: '#7f9240', anther: '#e6bf3a', filament: '#f5f3ea', pedicel: 0.016, pedicelColour: '#8a9a48' },
	// fruit 39 × 29 × 26 mm [CV, Holovousy] (34–42 mm long), ~22 g; stalk 21–32 mm [CV]
	fruit: { length: 0.039, width: 0.029, thick: 0.026, stalk: 0.025, stalkColour: '#7b7a40' },
	// bark traced off the sheet's three swatches: a one-year shoot, three-year wood, the old trunk
	bark: { shoot: '#86683a', shootShade: '#6f6c48', young: '#7b6758', lenticel: '#c8b89e', old: '#55493f', plate: '#73665a', fissure: '#241c18', lichen: '#8a9178' },
	root: { young: '#efe3c9', old: '#5a3f2c' },
};

/**
 * The leaf's outline: half-widths along the blade (0 at the stalk … 1 at the tip, parts of its greatest width),
 * traced off the sheet's leaf (upper side), from its base: oblong-elliptic, the base rounded into the stalk, widest a
 * little below the middle, drawn out to a pointed tip; its blade 1.6 : 1 (the sheet's 1.54, the data sheet's ~1.7).
 */
const LEAF_W = [0.03, 0.25, 0.41, 0.55, 0.64, 0.74, 0.82, 0.89, 0.93, 0.96, 0.99, 1, 0.99, 0.95, 0.9, 0.85, 0.78, 0.68, 0.58, 0.4, 0.27, 0.15, 0.01];
/** the fruit's profile from its stalk to its tip: half-widths as parts of the greatest, traced off the sheet's green
 * plum without its stalk (1.28 : 1; the ripe one there is drawn too round, 1.07 : 1, against the data sheet's 39 × 29
 * mm, so its length comes from the data sheet) */
const FRUIT_W = [0, 0.23, 0.48, 0.63, 0.73, 0.81, 0.88, 0.92, 0.96, 0.98, 1, 1, 0.99, 0.97, 0.94, 0.9, 0.85, 0.79, 0.71, 0.62, 0.5, 0.33, 0];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- the stone (endocarp) and the kernel in it ---- */

/**
 * The stone: an oval lens 22.5 × 12 × 6.5 mm, its tip (+X) pointed, its base blunt; the ventral edge (+Y) with its
 * blunt main ridge between two shallow grooves, the dorsal edge (−Y) a sharp rim; the cheeks rough with fine pits
 * and ridges. With `split` 0 … 1 the halves part along the ventral edge as the root comes out.
 */
function stone(bag, at, turn, split, seed) {
	const S = ZW.stone;
	const g = new THREE.SphereGeometry(1, fewer(56, 10), fewer(36, 8));
	const pos = g.attributes.position;
	const col = new Float32Array(pos.count * 3);
	const p = new THREE.Vector3();
	const ns = hashText(seed) % 997;
	for (let i = 0; i < pos.count; i++) {
		p.fromBufferAttribute(pos, i);
		const nx = p.x, ny = p.y, nz = p.z;
		const psi = Math.atan2(nz, ny);
		const a = Math.abs(psi);
		const point = Math.max(0, nx);
		// the sheet's stone: widest a little toward the base, drawn to a point at the tip
		let x = nx * (S.length / 2);
		let y = ny * (S.width / 2) * (1 - 0.5 * Math.pow(point, 1.7)) * (1 - 0.12 * Math.pow(Math.max(0, -nx), 3));
		let z = Math.sign(nz) * Math.pow(Math.abs(nz), 1.5) * (S.thick / 2) * (1 - 0.35 * point * point);
		const ridge = 0.0009 * Math.exp(-Math.pow(a / 0.16, 2)) - 0.0005 * Math.exp(-Math.pow((a - 0.36) / 0.1, 2)) + 0.0004 * Math.exp(-Math.pow((Math.PI - a) / 0.12, 2));
		const rim = 1 - Math.pow(Math.abs(nx), 6);
		const out = v3(0, y, z);
		const len = out.length() || 1;
		out.multiplyScalar((len + ridge * rim) / len);
		y = out.y;
		z = out.z;
		// rough cheeks: pits and short ridges running lengthwise
		const pit = fbm(x * 700, y * 1200, z * 1200, 3, ns);
		const bump = (pit - 0.5) * 0.0005 * rim;
		const nn = v3(x / (S.length / 2) ** 2, y / (S.width / 2) ** 2, z / (S.thick / 2) ** 2).normalize();
		x += nn.x * bump;
		y += nn.y * bump;
		z += nn.z * bump;
		if (split > 0) {
			const half = nz >= 0 ? 1 : -1;
			const ang = half * split * 0.45;
			const hy = -S.width / 2;
			const dy = y - hy, dz = z;
			y = hy + dy * Math.cos(ang) - dz * Math.sin(ang);
			z = dy * Math.sin(ang) + dz * Math.cos(ang) + half * split * 0.001;
		}
		pos.setXYZ(i, x, y, z);
		const c = mix(S.colour, S.groove, clamp((0.5 - pit) * 2.2) * 0.7 + 0.6 * Math.exp(-Math.pow((a - 0.36) / 0.1, 2)) * rim);
		c.lerp(new THREE.Color(S.light), clamp((pit - 0.55) * 3) * 0.5);
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	const geo = made(Array.from(pos.array), Array.from(g.attributes.normal.array), new Array(pos.count * 2).fill(0), Array.from(col), Array.from(g.index.array), false);
	g.dispose();
	const m = new THREE.Matrix4().compose(at, turn, v3(1, 1, 1));
	bag.add('body', geo, m);
	if (split > 0.05) {
		const k = bead(v3(0, 0, 0), v3(S.length * 0.32, S.width * 0.3, S.thick * 0.25), ZW.kernel.colour, 10);
		bag.add('body', k, m);
	}
}

/* ---- bark ---- */

/**
 * Plum bark by the age (years) and radius (m) of the wood, at a place on it (`v` round it, `s` along it, `sun` 0 … 1
 * how much it faces the light): this year's shoot olive red-brown, finely downy, greener in shade; two- to four-year
 * wood smooth grey-brown with small pale lenticels drawn out across it; old wood dark grey-brown, cracked into small
 * scaly plates (2–3 cm across, 5–7 cm tall) with dark fissures between them, grey-green lichen on the shaded side.
 */
const BARK_K = { across: 40, along: 8 }; // plates ~2.5 cm across, ~12 cm tall: long fissures up the trunk
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 50, s * 12, cz * 50, 2, ns + 5) - 0.5) * 0.9;
	const c = cells(cx * BARK_K.across + w, s * BARK_K.along + w * 0.5, cz * BARK_K.across - w, ns + 3);
	const ridge = c.edge;
	const plate = 0.6 * c.id + 0.4 * fbm(cx * 110, s * 40, cz * 110, 2, ns);
	return { ridge, plate, cx, cz, f1: c.f1 };
}
const old = (r) => clamp((r - 0.014) / 0.03);
function barkColour(age, r, v, s, sun, ns) {
	const B = ZW.bark;
	if (age < 0.6) return mix(B.shootShade, B.shoot, 0.3 + 0.7 * sun + age * 0.4);
	const { ridge, plate, cx, cz } = barkPattern(r, v, s, ns);
	const ln = noise3(cx * 170, s * 1100, cz * 170, ns + 7);
	const lenticel = smooth((ln - 0.8) / 0.07) * (1 - old(r));
	const young = clamp((r - 0.003) / 0.01);
	const c = mix(B.shoot, B.young, young * 0.9 + clamp((age - 2) / 4) * 0.1);
	const o = old(r);
	if (o > 0) {
		const fissure = smooth((0.12 - ridge) / 0.09);
		const bark = mix(B.old, B.plate, plate * 0.85).lerp(named(B.young), 0.25 * (1 - o));
		c.lerp(bark, smooth(o * 1.4));
		c.lerp(named(B.fissure), fissure * o * 0.85);
		// lichen in pale grey-green patches, on the shaded, wetter side of old wood
		const lich = smooth((fbm(cx * 40, s * 14, cz * 40, 3, ns + 9) - 0.58) / 0.08) * clamp(0.3 - Math.sin(v * Math.PI * 2)) * o;
		c.lerp(named(B.lichen), lich * 0.4);
	}
	return c.lerp(named(B.lenticel), lenticel * 0.7);
}
function barkRelief(r, v, s, ns) {
	const o = old(r);
	if (o <= 0) return 0;
	const { ridge, plate } = barkPattern(r, v, s, ns);
	return o * (-0.1 * smooth((0.22 - ridge) / 0.18) + 0.025 * (plate - 0.5) + 0.02 * smooth(ridge / 0.5));
}

/* ---- the leaf ---- */

/** its outline: the traced half-widths, and close up the margin's fine double teeth */
const leafShape = (teeth) => (u) => {
	const w = along(LEAF_W, u);
	if (!teeth || u < 0.08 || u > 0.97) return w;
	const big = 1 - Math.abs(((u * 18) % 1) * 2 - 1);
	const small = 1 - Math.abs(((u * 36) % 1) * 2 - 1);
	return w * (1 + 0.035 * big + 0.015 * small);
};

/**
 * One leaf: its short stalk from the node, then the blade, folded a little along the midrib, its tip hanging; dull
 * dark green above (the quilting is in its surface pictures), grey-green and downy below; young leaves light
 * yellow-green and folded; in autumn yellow to orange, then gone. `age` 0 … 1 from bud to grown, `fall` 0 … 1.
 */
function leaf(bag, at, dir, size, age, fall, r, close = false, flat0 = false) {
	const L = ZW.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const len = L.length * size * lerp(0.25, 1, smooth(age));
	const petLen = L.petiole * size * lerp(0.35, 1, smooth(age));
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = flat0 ? 0 : lerp(0.95, about(r, 0.4, 0.25), smooth(age * 1.4));
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const mid = at.clone().addScaledVector(pd, petLen * 0.55);
	const end = at.clone().addScaledVector(pd, petLen).add(v3(0, -petLen * 0.1, 0));
	const hue = r();
	const autumn = (u) => mix(mix(L.autumn, '#e8c23c', hue * 0.6), L.autumnLate, clamp(fall * 1.4 - 0.5 + u * 0.2));
	bag.add('body', tube(close ? [at, mid, end] : [at, end], (u) => 0.0009 * size * (1 - 0.3 * u) * lerp(0.5, 1, age), () => (fall > 0.2 ? autumn(0) : mix(L.petioleColour, '#7a8a3a', 0.2 + (1 - age) * 0.3)), close ? 6 : 3));
	const droop = flat0 ? 0 : lerp(-0.8, about(r, -0.3, 0.25), smooth(age * 1.3)) - fall * 0.35;
	const bd = flat.clone().applyAxisAngle(UP, flat0 ? 0 : about(r, 0, 0.35)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = flat0 ? 0 : lerp(0.5, about(r, 0.14, 0.06), smooth(age));
	const curl = flat0 ? 0 : about(r, 0.12, 0.06);
	const ns = Math.floor(r() * 1000);
	const young = 1 - smooth(age * 1.2);
	const top = (u, v) => {
		const c = mix(L.top, L.young, young * 0.9);
		c.lerp(named(L.topDark), clamp((noise3(u * 3, v * 2, ns, 3) - 0.45) * 1.5) * 0.5);
		if (Math.abs(v) < 0.05) c.lerp(named(L.vein), 0.3 * (1 - u * 0.6));
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3 - Math.abs(v) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#b6c07a', young * 0.6);
		if (Math.abs(v) < 0.06) c.lerp(named('#c9cba0'), 0.35);
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3));
		return c;
	};
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: leafShape(close),
		lift: (u, v) => fold * Math.abs(v) * 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.01 * Math.sin(u * 11 + v * 3) * v * v,
		paint: top,
		back: under,
		backLit: false, // its own normals: seen from below it is its underside, not the sky
		along: close ? 44 : 3,
		across: close ? 14 : 2,
	});
	bag.add('leaf', blade, aim(end, bd, flat0 ? 0 : about(r, 0, 0.3)));
}

/* ---- buds ---- */

/** a winter bud: pointed, dark brown; a flower bud rounder, its scales parting on green, then white petals showing */
function bud(bag, at, dir, flower, swell, r) {
	const F = ZW.flower;
	const s = flower ? lerp(0.0022, 0.0042, swell) : 0.0017;
	const col = flower ? mix(mix(F.budScale, F.calyx, clamp(swell * 2 - 0.4)), F.bud, clamp(swell * 3 - 2) * 0.8) : '#4e3426';
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	const c = at.clone().addScaledVector(dir, s * 0.9);
	bag.add('body', bead(c, v3(s * 0.75, s * (flower ? 1.2 : 1.7), s * 0.75), col, DETAIL.fruit ? 4 : 2, q));
	if (flower && swell > 0.7) bag.add('body', bead(c.clone().addScaledVector(dir, s * 0.9), v3(s * 0.5, s * 0.5, s * 0.5), F.bud, 2, q));
}

/* ---- the flower ---- */

/**
 * One flower at the end of its pedicel (the pedicel is drawn by `flowersAt`), facing along `facing`: a green cup,
 * five green sepals bent back as it opens, five round white petals with a short claw (a greenish base), some 25
 * stamens with yellow anthers round a green style. 15–20 mm across. `open` 0 … 1, `fall` 0 … 1 petals dropping.
 */
function flower(bag, at, facing, open, fall, r, close = false) {
	const F = ZW.flower;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const base = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const turn = (a, up) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(up));
	const roll = r() * Math.PI * 2;
	if (close) bag.add('body', tube(close ? [v3(0, -0.001, 0), v3(0, 0.001, 0), v3(0, 0.0025, 0)] : [v3(0, -0.001, 0), v3(0, 0.0025, 0)], (u) => 0.0007 + 0.0018 * u * u, () => F.calyx, close ? 10 : 3), base);
	const cupTop = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(0, 0.0025, 0));
	// far off the sepals, bent back under the petals, are not seen
	for (let k = 0; k < (close ? 5 : 0); k++) {
		const s = sheet({ length: 0.0042, width: 0.0016, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.4 * u), lift: (u) => 0.06 * u * u, paint: (u) => mix(F.sepal, '#9aac58', u * 0.4), along: close ? 6 : 1, across: close ? 4 : 1 });
		const up = lerp(1.2, -0.7, smooth(open)) - fall * 0.2;
		bag.add('sheet', s, cupTop.clone().multiply(turn((k / 5) * Math.PI * 2 + roll + 0.63, up)));
	}
	if (fall < 1) {
		for (let k = 0; k < 5; k++) {
			const len = F.petal * lerp(0.35, 1, smooth(open)) * about(r, 1, 0.06);
			const p = sheet({
				length: len,
				width: len * 0.36,
				// round, on a short narrow claw: an ellipse from a fifth of the way out to the rounded tip (the sheet's flower)
				shape: (u) => Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.56) / 0.44, 2))) * (0.25 + 0.75 * smooth(u / 0.28)),
				lift: (u, v) => 0.16 * v * v * u + 0.12 * u * u * (1 - open * 0.6) + 0.02 * Math.sin(v * 5 + u * 7),
				paint: (u, v) => mix(mix(F.petalColour, F.base, (1 - smooth(u / 0.3)) * 0.8), F.bud, (1 - smooth(open * 1.4)) * 0.6).lerp(named('#e3dcc8'), fall * 0.6),
				along: close ? 14 : 2,
				across: close ? 10 : 1,
			});
			const up = lerp(1.45, 0.12, smooth(open)) - fall * 1.1;
			const drop = 1 - fall * 0.5;
			bag.add('sheet', p, cupTop.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.0003, 0)).multiply(turn((k / 5) * Math.PI * 2 + roll, up)).multiply(new THREE.Matrix4().makeScale(drop, 1, drop)));
		}
	}
	// a crowd far off: the petals alone, no stamens
	if (open < 0.25 || (!close && DETAIL.level < 0.5)) return;
	const n = close ? 25 : 5;
	const brown = clamp(fall * 1.5);
	const fil = [];
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + roll;
		const spread = lerp(0.12, 0.5, smooth(open)) + (k % 2) * 0.12;
		const L = 0.0062 * (k % 3 === 0 ? 0.7 : k % 3 === 1 ? 0.9 : 1);
		const d = v3(Math.cos(a) * Math.sin(spread), Math.cos(spread), Math.sin(a) * Math.sin(spread));
		const p0 = v3(Math.cos(a) * 0.0024, 0.0025, Math.sin(a) * 0.0024);
		const p1 = p0.clone().addScaledVector(d, L);
		fil.push([p0, p1, d]);
		if (close) bag.add('body', tube([p0, p0.clone().lerp(p1, 0.5).add(v3(0, 0.0003, 0)), p1], () => 0.00016, () => mix(F.filament, '#c9a070', brown), 3), base);
		if (close) bag.add('body', bead(p1, v3(0.00042, 0.0003, 0.00042), mix(F.anther, '#7a5a2a', brown), 6), base);
	}
	if (!close) {
		const pos = [], col = [], idx = [];
		const c0 = toColor(mix(F.filament, '#c9a070', brown)).clone();
		const c1 = toColor(mix(F.anther, '#7a5a2a', brown)).clone();
		for (let k = 0; k <= n; k++) {
			const [p0, p1, d] = fil[k % n];
			const p2 = p1.clone().addScaledVector(d, 0.0008);
			pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
			col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
		}
		for (let k = 0; k < n; k++) {
			const a = k * 3;
			idx.push(a, a + 1, a + 3, a + 3, a + 1, a + 4, a + 1, a + 2, a + 4, a + 4, a + 2, a + 5);
		}
		bag.add('sheet', made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true), base);
	}
	if (close) bag.add('body', tube([v3(0, 0.0025, 0), v3(0, 0.0065, 0), v3(0, 0.0095, 0)], (u) => 0.0003 * (1 - 0.3 * u) + 0.0004 * Math.max(0, (0.15 - u) / 0.15), () => mix('#cfdc8a', '#b8a070', brown), 4, true), base);
}

/* ---- the fruit ---- */

/** how big a fruit is, 0 … 1 of its ripe size, by days after full bloom: a stone fruit's double sigmoid, ripe at ~135 */
const RIPE_DAYS = 135;
function fruitSize(d) {
	// I: cell division to ~45 d; II: the stone hardens (~50 d), little growth to ~85 d; III: the final swell
	return straight(d, [
		[0, 0.05],
		[15, 0.16],
		[30, 0.34],
		[45, 0.47],
		[60, 0.53],
		[75, 0.57],
		[90, 0.66],
		[105, 0.8],
		[120, 0.93],
		[RIPE_DAYS, 1],
	]);
}

/**
 * The skin by days after bloom (the sheet's four ages): green, then from about 95 days the red-violet flush comes
 * over it (the sunny side first), turning violet-blue and at ripeness nearly black-blue; the waxy bloom thickens
 * over the last weeks (`bloom` 0 … 1), drawn as a pale blue-grey veil on the colour and as the material's sheen.
 */
function skinAt(d, lit) {
	// the sheet's green plum, its colouring one (red-violet over green), its ripe one under the bloom
	const turn = d - 104 + lit * 8;
	let c;
	if (turn < 0) c = mix('#86a64c', '#9ab85a', clamp(d / 80));
	else if (turn < 12) c = mix('#9ab85a', '#b84a5e', turn / 12);
	else if (turn < 22) c = mix('#b84a5e', '#6a3c6e', (turn - 12) / 10);
	else c = mix('#6a3c6e', '#24264a', (turn - 22) / 10);
	return c;
}
const bloomAt = (d) => clamp((d - 104) / 28);

/**
 * One plum: an elongated oval, 39 × 29 × 26 mm ripe, its profile the traced one (blunt at the stalk, drawn in to a
 * blunt point at the tip), a little lopsided (the suture side straighter, the back fuller, the tip a little toward
 * the suture), the suture a faint groove from the stalk down one side, a shallow stalk cavity. Built hanging from
 * the origin down −Y, its suture toward +X; `sun` the light's direction in the fruit's own frame.
 */
function plumGeometry(o) {
	const { H, W, D, days, sun, ns, res } = o;
	const rings = res ? 140 : fewer(10, 5);
	const sides = res ? 160 : fewer(10, 6);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const bloom = bloomAt(days);
	const veil = named('#7e98bc');
	for (let i = 0; i <= rings; i++) {
		const u = i / rings; // 0 at the stalk, 1 at the tip
		const th = u * Math.PI;
		const prof = along(FRUIT_W, u);
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2; // 0 at the suture
			const dphi = Math.atan2(Math.sin(ph), Math.cos(ph));
			const groove = 1 - (0.035 + 0.05 * Math.exp(-u / 0.12)) * Math.exp(-Math.pow(dphi / 0.16, 2)) * Math.pow(Math.sin(th), 0.4);
			const lump = 1 + 0.02 * (fbm(Math.cos(ph) * 1.3, Math.sin(ph) * 1.3, u * 2.4, 2, ns) - 0.5);
			// lopsided: the back (−X) fuller than the suture side
			const side = Math.cos(ph) > 0 ? 1 - 0.07 * Math.cos(ph) : 1 + 0.03 * -Math.cos(ph);
			const rr = prof * groove * lump * side;
			const bend = 0.05 * W * Math.pow(u, 2.2); // the tip a little toward the suture
			const x = (W / 2) * rr * Math.cos(ph) - 0.025 * W * Math.sin(th) + bend;
			const z = (D / 2) * rr * Math.sin(ph);
			let y = -H * u;
			y -= 0.0014 * (H / 0.039) * Math.exp(-Math.pow(u / 0.04, 2)); // the stalk cavity
			pos.push(x, y, z);
			nor.push(0, 0, 0);
			uv.push((j / sides) * 3, u * 4);
			const n = v3(Math.cos(ph), 0.4 * (0.5 - u), Math.sin(ph)).normalize();
			const lit = Math.max(0, n.dot(sun));
			// the colour comes in patches, not evenly: some places a few days ahead of others
			const c = skinAt(days + 9 * (fbm(x * 70, y * 70, z * 70, 2, ns + 9) - 0.5), lit);
			// the bloom: a pale blue veil over the dark skin (the sheet's ripe plum), rubbed off in patches where the
			// dark skin shows, a little thinner on the sunny cheek
			const rub = smooth((fbm(x * 160, y * 160, z * 160, 3, ns + 3) - 0.62) / 0.08);
			c.lerp(veil, bloom * (0.56 + 0.05 * u - 0.05 * lit) * (1 - 0.85 * rub));
			// the stalk cavity stays a little greener till late
			c.lerp(named('#6a7a3a'), clamp(1 - u / 0.07) * 0.4 * (1 - bloom * 0.7));
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
 * A plum on the wood, hanging from `at` along `dir`: its thin stalk (the pedicel grown on, 2.5 cm ripe), the plum at
 * its end; while it is small the dry calyx (the 'shuck') still round it, split and shed by three weeks. `days` after
 * bloom.
 */
function plum(bag, at, dir, days, sunWorld, seedKey, key) {
	const F = ZW.fruit;
	const size = fruitSize(days);
	const r = chance(seedKey, 'fruit', key);
	const k = about(r, 1, 0.07);
	const long = lerp(1.18, 1, clamp((days - 20) / 80));
	const H = F.length * size * k * long, W = F.width * size * k * about(r, 1, 0.03), D = F.thick * size * k;
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const res = DETAIL.fruit === key;
	const stalk = F.stalk * lerp(0.62, 1, clamp(days / 60)) * about(r, 1, 0.12);
	// the stalk: thin, green-brown, a little thicker where it meets the fruit, bent a touch
	const sp = [v3(0, 0, 0), v3(0.0012, -stalk * 0.5, 0), v3(0, -stalk, 0)];
	bag.add('body', tube(res ? sp : [sp[0], sp[2]], (u) => 0.0006 + 0.0004 * u * u, () => ZW.fruit.stalkColour, res ? 8 : 3), m);
	if (DETAIL.level < 0.5 && !res) {
		// a crowd far off: each plum a small bead of its colour, thinned with the others
		const c = skinAt(days, 0.5).lerp(named('#7e98bc'), bloomAt(days) * 0.5);
		bag.add('body', bead(v3(0, -stalk - H * 0.5, 0), v3(W / 2, H / 2, D / 2), c, 3), m);
		return { H, W, stalk };
	}
	const g = plumGeometry({ H, W, D, days, sun, ns: hashText(key) % 991, res });
	g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -stalk + 0.0015 * size, 0));
	bag.add(days > 108 ? 'bloom' : 'body', g, m);
	if (days < 22) {
		const split = clamp((days - 5) / 15);
		for (let s = 0; s < 5; s++) {
			const sh = sheet({ length: 0.006, width: 0.003, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)), lift: (u) => -0.05 * u, paint: (u) => mix('#9a7a48', '#6a4a30', u + split * 0.3), along: res ? 6 : 3, across: 2 });
			const a = (s / 5) * Math.PI * 2;
			const tilt = -Math.PI / 2 + lerp(0.3, 0.95 + s * 0.08, split);
			bag.add('sheet', sh, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -stalk + 0.001, 0)).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(tilt)));
		}
	}
	return { H, W, stalk };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A Hauszwetschge from its stone on its own roots in an orchard meadow, lightly
 * pruned: a straight leader that keeps the lead (Rauh's model), each year's leader shoot breaking the next spring
 * into a tier of steep limbs near its top (30–40° from upright: "the leaders steeply erect"), spurs along older wood
 * ("spurs well"), its stem cleared of side shoots to 0.9 m. Height and girth are calibrated to the data sheet: a
 * whip of ~1.1 m in its first year, 3–3.5 m and a trunk of 4–5 cm in its fourth summer, ~5 m and 10–12 cm in its
 * eighth.
 */
const TREE = {
	depth: ZW.stone.depth,
	clear: 0.9, // the stem cleared of side shoots to this height
	leader: [1.1, 0.78, 0.66, 0.56, 0.46, 0.4, 0.34, 0.3, 0.28], // the leader's extension each year (m)
	// a side axis's first year by its order (1 the limbs off the leader), at vigour 1, and how each later year fades
	shoot: [0, 0.68, 0.48, 0.34, 0.25, 0.2],
	fade: [1, 0.8, 0.62, 0.5, 0.42, 0.36, 0.32, 0.3],
	limbAngle: 0.62, // from the leader, radians (~35°)
	internode: 0.028,
	tipRadius: 0.0016,
	pipeLength: 2.5e-7,
	spurRadius: 0.0026,
	firstFlowers: 4, // first blossom in its fifth spring (first crops in the 4th–6th leaf on seedling roots)
};

/** a year's season: `year` since germination, `s` 0 … 1 from the bloom (late April) round, `days` since the bloom */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** how much of a year's extension is grown, `dt` years into that season (shoots grow from bloom to July) */
const extension = (dt, first) => (first ? table(dt, [[-0.02, 0], [0.0, 0.02], [0.1, 0.06], [0.22, 0.17], [0.32, 0.55], [0.42, 0.92], [0.5, 1]]) : span(dt, 0.0, 0.25));

/**
 * The tree's axes at time t: each axis a polyline as far as grown, its nodes, the year each part grew in, and the
 * axes it bears. Every axis and node draws its own chance, so the tree at an earlier t is the first part of the tree
 * at a later one.
 */
function axes(seed, t, base) {
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.06);
	const lean = (() => {
		const r = chance(seed, 'lean');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.03 + r() * 0.04);
	})();

	const grow = (key, from, dir, born, order, vigour, kind, parent, at, low = 0) => {
		if (t < born + (kind === 'trunk' ? -0.03 : 0.01)) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, low, pts: [from.clone()], years: [born], nodes: [], kids: [], vigour, dir0: dir.clone() };
		all.push(ax);
		if (kind === 'spur') {
			// a spur: short, knobbly, crowded with buds, a few millimetres to a centimetre a year
			const d = dir.clone();
			let p = from.clone();
			const yearsOld = Math.min(7, Math.floor(t - born) + 1);
			for (let y = 0; y < yearsOld; y++) {
				const f = y === yearsOld - 1 ? span(t - (born + y), 0.0, 0.12) : 1;
				const len = between(r, 0.006, 0.013) * (y === 0 ? 1.8 : 1) * f;
				d.add(v3(about(r, 0, 0.25), 0.1, about(r, 0, 0.25))).normalize();
				p = p.clone().addScaledVector(d, Math.max(0.0005, len));
				ax.pts.push(p);
				ax.years.push(born + y);
			}
			ax.tipYear = born + yearsOld - 1;
			return ax;
		}
		const d = dir.clone().normalize();
		const outward = from.clone().setY(0);
		let node = 0;
		for (let y = born; y <= Math.floor(t); y++) {
			const ageAxis = y - born;
			const first = kind === 'trunk' && y === 0;
			let len = kind === 'trunk' ? TREE.leader[Math.min(y, TREE.leader.length - 1)] * vigourTree * about(r, 1, 0.05) : TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree;
			// an old tree's shoots shorten as it comes into full crop
			if (kind !== 'trunk') len *= lerp(1, 0.7, clamp((y - 4) / 4));
			if (len < 0.03) break;
			const f = extension(t - y, first);
			if (f <= 0) break;
			const step = first && t < 0.2 ? 0.005 : 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'trunk') d.add(v3(lean.x * 0.06 + about(r, 0, 0.03), 0.3, lean.z * 0.06 + about(r, 0, 0.03)));
				else {
					// a limb keeps to its steep angle and rises to the light; its fine fruit wood sags as it lengthens and
					// bears ("through the heavy crop the fine fruit wood mostly hangs")
					// the lower limbs keep their spread and do not turn up (the sheet's crown, fullest low)
					const up = (order === 1 ? 0.018 : 0.03) * (1 - 0.75 * low);
					const sag = 0.003 * (order + 0.6) * Math.min(5, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.4) * (order === 1 ? 0.9 : 1.15);
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(0.01) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, 0.09);
					d.add(v3(about(r, 0, 0.06) + out.x, up - sag, about(r, 0, 0.06) + out.z));
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				while (node * TREE.internode < (ax.nodeBase ?? 0) + walked) {
					const within = node * TREE.internode - (ax.nodeBase ?? 0);
					const u = within / len;
					ax.nodes.push({ i: node, year: y, u, s: node * TREE.internode, formed: y + (first ? 0.02 : 0.01) + 0.24 * Math.pow(clamp(u), 1.3) });
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
			n.bearing = phase + n.i * 2.513; // 2/5 phyllotaxis: two fifths of a turn between leaves
		}
		// lateral buds: the next spring each breaks into a long shoot, a spur, or stays (a flower bud or asleep)
		for (const n of ax.nodes) {
			n.flowerBud = chance(seed, 'flower-bud', ...key, n.i)() < (kind === 'trunk' ? 0.25 : n.u > 0.06 && n.u < 0.95 ? 0.6 : 0.2);
			if (n.year + 1 > t - 0.01) continue;
			const br = chance(seed, 'bud', ...key, n.i);
			const u = n.u;
			const roll = br();
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			let pLong, pSpur, angle, vig;
			if (kind === 'trunk') {
				// the leader: below the clear stem nothing is kept; above it a tier of limbs from the top of each year's
				// growth, fewer lower down, spurs between
				const h = n.s - TREE.depth;
				if (h < TREE.clear) continue;
				pLong = u > 0.62 ? 0.3 : u > 0.3 ? 0.11 : 0.025;
				pSpur = 0.08;
				// the lower tiers leave wider and grow stronger (they are older and lit from the side), the upper ones
				// steeper: an upright oval, widest through its middle
				const low = clamp(1 - (h - TREE.clear) / 2.0);
				const high = clamp((h - TREE.clear - 2.2) / 1.2);
				angle = lerp(TREE.limbAngle, 1.0, low) * about(br, 1, 0.12);
				vig = lerp(0.7, 1.0, u) * (1 + 0.15 * low) * (1 - 0.12 * high) * about(br, 1, 0.1);
			} else {
				const yearLen = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(n.year - born, TREE.fade.length - 1)];
				const above = side.y > 0.55 ? 0.5 : side.y < -0.55 ? 0.35 : 1;
				pLong = order >= 3 ? 0 : (u > 0.65 ? 0.34 : u > 0.32 ? 0.13 : u > 0.15 ? 0.04 : 0) * clamp(yearLen / 0.18) * above * (order === 2 ? 0.6 : 1);
				pSpur = u > 0.08 && u < 0.93 ? 0.36 : 0.03; // 'spurs well' (7 of 9 in the Holovousy trials)
				angle = (order === 1 ? lerp(0.75, 0.5, u) : lerp(0.95, 0.6, u)) * about(br, 1, 0.15);
				vig = vigour * lerp(0.45, 0.85, u) * about(br, 1, 0.12);
			}
			if (roll < pLong) {
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const k = grow([...key, n.i], n.at, d0, n.year + 1, order + 1, vig, 'long', ax, n.s, kind === 'trunk' ? clamp(1 - (n.s - TREE.depth - TREE.clear) / 2.0) : ax.low);
				if (k) ax.kids.push(k);
			} else if (roll < pLong + pSpur) {
				const d0 = n.dir.clone().multiplyScalar(0.4).addScaledVector(side, 1).normalize();
				const k = grow([...key, n.i, 's'], n.at, d0, n.year + 1, order + 1, 0, 'spur', ax, n.s);
				if (k) {
					k.node = n;
					ax.kids.push(k);
				}
			}
		}
		return ax;
	};
	const trunk = grow(['trunk'], base.clone(), v3(0, 1, 0), 0, 0, 1, 'trunk', null, 0);
	return { all, trunk };
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
 * calibrated to the data sheet: a trunk of 4–5 cm in its fourth summer and 10–12 cm in its eighth at 1 m.
 */
const PIPE = 2.5;
const RING = 0.3;
const RING_ADD = 0.0035; // and a fixed ring the first years, which a young tree's few shoots would not explain
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	const tip = ax.kind === 'spur' ? TREE.spurRadius : TREE.tipRadius;
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.kind === 'spur' ? Math.pow(0.0011, PIPE) : k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'spur' ? 0 : TREE.pipeLength * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'spur' ? 0 : RING_ADD * Math.min(woodAge, 2.5) * clamp(Math.pow(q, 1 / PIPE) / 0.008));
		ax.r2[i] = r * r;
	}
}

/** the tree's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2) return;
	// a crowd far off: no spur wood (a few centimetres; its leaves and fruit still drawn)
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
	const step = ax.kind === 'trunk' ? clamp(R0 * 0.3, 0.006, 0.03) : ax.kind === 'spur' ? 0.02 : R0 > 0.014 ? clamp(R0 * 1.0, 0.015, 0.05) : clamp(R0 * 2, R0 < 0.004 ? 0.04 : 0.02, 0.08);
	const pts = [];
	const count = Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'spur' ? 3 : Math.round(clamp(R0 * (R0 > 0.014 ? 520 : 450), R0 < 0.0035 ? 4 : 5, 40));
	const isTrunk = ax.kind === 'trunk';
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			// the root flare, in low buttresses
			const ground = s - TREE.depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.1);
			r *= 1 + 0.5 * clamp(t / 4) * flare * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
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
			// the seedling's stem: pale under the soil, reddish-green above
			const young = s < TREE.depth ? mix('#ece4c8', '#c9c08a', s / TREE.depth) : mix('#6e8b3d', '#8a4a2e', sun * 0.6 + clamp(t * 2) * 0.3);
			c.lerp(young, 1 - clamp((t - 0.4) / 0.6));
		}
		if (isTrunk && s < TREE.depth + 0.01) c.lerp(new THREE.Color(ZW.root.old), clamp((TREE.depth + 0.01 - s) / 0.03) * clamp(t));
		return c;
	};
	const kind = R0 < 0.006 && ax.kind !== 'trunk' ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	// the bark's fine plates as a picture in metres (a 0.2 m tile), on thick wood
	if (kind === 'bark') metric(geo, total / 0.2, (Math.PI * 2 * Math.max(R0, 0.01)) / 0.2);
	bag.add(kind, geo);
}

/** the roots: the radicle going down from the stone, then the taproot and the spreading laterals that take over */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	const age = clamp(t / 7);
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.05, -1, 0.02),
		length: 1.3,
		grown: table(t, [[-0.06, 0], [-0.04, 0.004], [0, 0.03], [0.15, 0.13], [1, 0.4], [2, 0.65], [4, 0.9], [7, 1]]),
		radius: 0.0012 + 0.04 * span(t, 0.5, 7),
		down: 0.03,
		wander: 0.12,
		laterals: 9,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.2, 3),
		young: ZW.root.young,
		old: ZW.root.old,
	});
	const count = 10;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.08 + i * 0.3;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.01, -0.01 - rr() * 0.08, Math.sin(bear) * 0.01)),
			dir: v3(Math.cos(bear), -0.08 - rr() * 0.12, Math.sin(bear)),
			length: between(rr, 1.5, 2.6) * lerp(0.4, 1, age),
			grown: (t - born) / 5,
			radius: 0.0014 + 0.045 * span(t, born + 0.5, 7.5) * between(rr, 0.6, 1),
			down: 0.012,
			wander: 0.16,
			laterals: 6,
			lateral: 0.32,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.4) / 3,
			young: ZW.root.young,
			old: ZW.root.old,
			floor: -0.75,
		});
	}
}

/**
 * The whole plum at time t (years from germination): the stone, the roots, the wood, and what the season puts on
 * it — buds in winter, blossom in late April with the first leaves, leaves, plums from set to ripe, autumn colour.
 */
function plumTree(t, seed) {
	const bag = new Bag();
	const { year, s, days } = seasonOf(t);
	const base = v3(0, -TREE.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	// the stone, sown in autumn, chilled through the winter, splitting as it germinates; it rots in the soil in a year
	if (t < 1.2) {
		const split = span(t, -0.06, -0.02);
		const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0.6, -Math.PI / 2 + 0.25));
		const at = base.clone().add(v3(0.004, -0.004, 0));
		lite(t > 0.6 ? { level: Math.min(DETAIL.level, 0.5) } : {}, () => stone(bag, at, turn, split, seed));
	}

	roots(bag, seed, t, base.clone().add(v3(0, -0.006, 0)));

	// the shoot from the stone: hypogeal — the seed leaves stay in the stone; the stem comes up bent in a hook
	const { all, trunk } = axes(seed, t, base.clone().add(v3(0, 0.004, 0)));
	if (!trunk) return bag.build();
	const hook = 1 - span(t, 0.0, 0.05);
	if (hook > 0 && trunk.pts.length > 2) {
		const pts = trunk.pts;
		const L = [0];
		for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
		const total = L[L.length - 1];
		const Lh = Math.min(0.015, total * 0.5);
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
		space.rod(ax.pts, (u) => R(u) + 0.002);
	}

	const treeAge = year;
	const leafSize = (y) => (y < 1 ? 0.75 : y < 2 ? 0.9 : 1);
	const fall = span(s, 0.48, 0.56); // leaves yellow and fall from mid October to mid November
	const leafy = year >= 0 && s > 0.0 && fall < 1;

	/** a leaf turned on its stalk, as little as it needs, out of the way of the fruit */
	const clearOfFruit = (at, out, size) => {
		if (!space.balls.length) return out;
		const len = ZW.leaf.length * size, pet = ZW.leaf.petiole * size;
		let best = out, low = Infinity;
		for (const turn of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
			const o = out.clone().applyAxisAngle(UP, turn);
			const flat = o.clone().setY(0).normalize();
			let cost = Math.abs(turn) * 0.0005;
			for (const f of [0.35, 0.7, 1]) cost += space.inFruit(at.clone().addScaledVector(flat, pet + f * len * 0.9).add(v3(0, -0.3 * f * len, 0)), len * 0.26);
			if (cost < low) (low = cost), (best = o);
			if (cost < 0.001) break;
		}
		return best;
	};

	for (const pass of ['blossom', 'leaves'])
		for (const ax of all) {
			const tipRadius = Math.sqrt(ax.r2[ax.r2.length - 1]);
			if (ax.kind === 'spur') {
				const tip = ax.pts[ax.pts.length - 1];
				const dir = tip.clone().sub(ax.pts[ax.pts.length - 2]).normalize();
				const spurAge = t - ax.born;
				if (pass === 'leaves' && leafy && spurAge > 0.0) {
					// a rosette of leaves at the tip each spring, unfolding with the blossom
					const kr = chance(seed, 'spur-leaves', ...ax.key);
					const n = 4 + Math.floor(kr() * 3);
					const ageL = clamp((s + 0.01) / 0.08);
					for (let k = 0; k < n; k++) {
						const a = (k / n) * Math.PI * 2 + kr() * 0.6;
						const side = across(dir).applyAxisAngle(dir, a);
						const size = leafSize(year) * about(kr, 0.85, 0.1);
						const at = tip.clone().addScaledVector(side, 0.002);
						leaf(bag, at, clearOfFruit(at, side.clone().addScaledVector(dir, 0.5).normalize(), size), size, ageL, fall, kr);
					}
				}
				if (pass === 'blossom') {
					const kr = chance(seed, 'spur-flowers', ...ax.key);
					// a spur a season old: several flower buds, one or two flowers from each
					if (spurAge >= 0.9 && treeAge >= TREE.firstFlowers) flowersAt(bag, seed, [...ax.key, 'f'], tip, dir, s, days, 4 + Math.floor(kr() * 5), space, sunDir, true);
					else if (spurAge >= 0.5 && treeAge + 1 >= TREE.firstFlowers && s > 0.45) budsAt(bag, tip, dir, 3, s, kr);
				}
				continue;
			}
			for (const n of ax.nodes) {
				const nr = chance(seed, 'node', ...ax.key, n.i);
				const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
				const surf = n.at.clone().addScaledVector(side, Math.max(tipRadius, 0.0015));
				const axil = n.at.clone().addScaledVector(side, Math.max(tipRadius, 0.0015) * 0.8);
				const budDir = side.clone().addScaledVector(n.dir, 0.8).normalize();
				const flowering = n.flowerBud && treeAge + 1 >= TREE.firstFlowers;
				if (n.year === year && t >= n.formed && leafy) {
					if (pass !== 'leaves') continue;
					const ageL = clamp((t - n.formed) / 0.08);
					const scale = ax.kind === 'trunk' && n.year === 0 ? Math.min(1, 0.55 + 0.07 * n.i) : 1; // the seedling's first leaves, small
					const size = leafSize(year) * scale * about(nr, 1.05, 0.1);
					leaf(bag, surf, clearOfFruit(surf, side.clone().addScaledVector(n.dir, 0.5).normalize(), size), size, ageL, fall, nr);
					if (s > 0.45) bud(bag, axil, budDir, flowering, 0, nr);
				} else if (n.year === year - 1 && n.flowerBud && treeAge >= TREE.firstFlowers && ax.kind !== 'trunk') {
					// one-year wood: one or two flowers from the buds beside the node, with the first leaves
					if (pass === 'blossom') flowersAt(bag, seed, [...ax.key, n.i], surf, side.clone().addScaledVector(n.dir, 0.4).normalize(), s, days, 1 + (nr() < 0.5 ? 1 : 0), space, sunDir, false);
				} else if (n.year === year && s > 0.56 && t >= n.formed && pass === 'blossom') {
					bud(bag, axil, budDir, flowering, clamp((s - 0.85) / 0.15), nr);
				}
			}
			if (pass === 'blossom' && (s > 0.3 || s < 0.02) && ax.pts.length > 1 && ax.tipYear === (s < 0.02 ? year - 1 : year)) {
				const n = ax.pts.length;
				bud(bag, ax.pts[n - 1], ax.pts[n - 1].clone().sub(ax.pts[n - 2]).normalize(), false, 0, chance(seed, 'season', ...ax.key));
			}
		}
	return bag.build();
}

/** the flower buds of a winter spur, swelling toward spring */
function budsAt(bag, at, dir, n, s, r) {
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + r();
		const d = dir.clone().add(across(dir).applyAxisAngle(dir, a).multiplyScalar(0.7)).normalize();
		bud(bag, at, d, true, clamp((s - 0.85) / 0.15), r);
	}
}

/**
 * A flower site through its season: the buds swelling white, the blossom on its long pedicel with the first leaves,
 * petal fall, and the few that set (about one in ten: 11 % set, 71 % of them kept, data sheet) growing into plums
 * hanging on the pedicel grown into their stalk: green, red-violet, blue; the others drop.
 */
function flowersAt(bag, seed, key, at, dir, s, days, n, space, sunDir, spur) {
	const F = ZW.flower;
	for (let k = 0; k < n; k++) {
		const fr = chance(seed, 'flower', ...key, k);
		const a = (k / n) * Math.PI * 2 + fr() * 1.2;
		const side = across(dir).applyAxisAngle(dir, a);
		const facing = dir.clone().multiplyScalar(spur ? 0.7 : 0.5).addScaledVector(side, 0.7).add(v3(0, 0.15, 0)).normalize();
		const opens = about(fr, 0.0, 0.01);
		const ph = s - opens;
		const sets = fr() < (spur ? 0.075 : 0.07);
		const p = at.clone().addScaledVector(side, 0.0012);
		if (s > 0.56) {
			bud(bag, p, facing, true, clamp((s - 0.85) / 0.15), fr);
			continue;
		}
		if (ph < -0.025) {
			bud(bag, p, facing, true, 1, fr);
			continue;
		}
		if (ph < 0.05) {
			const open = span(ph, -0.022, 0.004);
			const fall = span(ph, 0.02, 0.04);
			if (!sets && ph > 0.042) continue;
			if (open < 0.08) bud(bag, p, facing, true, 1, fr);
			else if (fall < 1) {
				// the pedicel, 1.5 cm, holding the flower out and a little down as it opens
				const pd = facing.clone().add(v3(0, -0.35 * open, 0)).normalize();
				const fp = p.clone().addScaledVector(pd, F.pedicel * lerp(0.4, 1, open));
				bag.add('body', tube([p, fp], () => 0.00045, () => F.pedicelColour, 3));
				flower(bag, fp, pd.clone().lerp(facing, 0.6).normalize(), open, fall, fr);
			}
			if (!sets || fall < 1) continue;
		}
		if (!sets) continue;
		const d = days - opens * 365;
		if (d > RIPE_DAYS + 25) continue; // picked
		// the plum hangs from the spur on its stalk; it finds its place for its ripe size, so it swells where it hangs;
		// one that finds no room is shed in the June drop
		const hang = v3(0, -1, 0).addScaledVector(facing.clone().setY(0), 0.35).normalize();
		const Fr = ZW.fruit;
		const ripe = (a2, d2) => [
			{ c: a2.clone().addScaledVector(d2, Fr.stalk + Fr.length * 0.3), r: Fr.width * 0.5 },
			{ c: a2.clone().addScaledVector(d2, Fr.stalk + Fr.length * 0.72), r: Fr.width * 0.42 },
		];
		const place = space.settle(p, hang, ripe, 0.004, 0.02) ?? (d < 45 ? { at: p, dir: hang } : null);
		if (!place) continue;
		// marked as one fruit for the fruit view (which grows the plant at full detail); a crowd's plums are thinned
		if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit([...key, k], p, place.dir);
		if (place.at.distanceToSquared(p) > 1e-10) bag.add('body', tube([p, place.at], () => 0.0007, () => ZW.fruit.stalkColour, 3));
		plum(bag, place.at, place.dir, d, sunDir, seed, [...key, k].join('|'));
		bag.fruitDone();
	}
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the stone to ripe plums; `t` the years since germination each is grown at (between two stages,
 * on the way). The last five are one season of the tree's eighth year: blossom at the end of April, ripe Zwetschgen
 * about 135 days after (early to mid September).
 */
const STAGES = [
	{ name: 'Stone', t: -0.4, note: 'The stone, 22.5 × 12 × 6.5 mm, oval and flat with a blunt ridge down one edge, sown 5 cm deep in November and chilled through the winter (90–150 days of cold).' },
	{ name: 'Germination', t: 0.0, note: 'April: the stone splits along its edge; the white root goes down, the shoot comes up bent in a hook. The seed leaves stay in the stone (hypogeal).' },
	{ name: 'Seedling', t: 0.22, note: 'July, three months up: a reddish-green stem 15–20 cm tall, its toothed oval leaves small at first, larger node by node.' },
	{ name: 'Whip', t: 0.42, note: 'September of its first year: a single stem a metre tall, olive red-brown and finely downy, leaves 7 × 4 cm.' },
	{ name: 'Young tree', t: 3.3, note: 'Its fourth summer: 3.3 m, a straight leader with tiers of steep limbs above a stem cleared to 0.9 m, the trunk 4–5 cm across; spurs along its two-year wood. No blossom yet.' },
	{ name: 'Blossom', t: 7.008, note: 'Eighth spring, late April (the latest of the plums): white flowers 15–20 mm across, one or two from each bud on the spurs and last year\'s shoots, on long pedicels, as the first leaves unfold. Self-fertile.' },
	{ name: 'Fruit set', t: 7.06, note: 'Three weeks on: petals fallen, the leaves out, about one flower in ten set; the fruitlets 1 cm, green, pushing off the dry calyx. In June a third of them drop.' },
	{ name: 'Green plums', t: 7.2, note: 'Early July: oval green plums of 2–2.5 cm, the suture down one side; the stone has hardened inside.' },
	{ name: 'Colouring', t: 7.31, note: 'Mid August: the final swell; red-violet flushes over the green, sunny side first, turning violet-blue, and the waxy bloom thickens.' },
	{ name: 'Ripe', t: 7.37, note: "Early to mid September, about 135 days after bloom: ripe Hauszwetschgen, 39 × 29 × 26 mm and about 22 g, nearly black-blue under a pale blue-grey bloom, the flesh yellow and coming clean off the stone; the fine fruit wood hangs under them. Zwetschgendatschi time." },
];

/** the years since germination at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => plumTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one plum on its own ---- */

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

/** one plum at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This plum has not set yet.');
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
	id: 'plum',
	label: "Plum 'Hauszwetschge' · Prunus domestica",
	latin: "Prunus domestica L. subsp. domestica 'Hauszwetschge' · syn. Hauszwetsche, Gemeine Zwetsche, Bauernzwetschge, Požegača, Domácí švestka · Zwetschge",
	note: "The Hauszwetschge, the old blue plum of German farm orchards: an upright tree 6–8 m tall with steep leaders and a dense crown whose fine fruit wood hangs under the crop; dull dark green, quilted, downy leaves 7 × 4 cm; white blossom late in April with the first leaves; elongated oval plums 39 × 29 mm, nearly black-blue under a pale blue-grey bloom, yellow flesh coming clean off the stone, ripe in September.",
	from: 'Tree · 8 years from the stone',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '9f54892e279087ab118f26f6af185cc2fe3d39f78ffaaab23adb2f9431b3d417', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right; plant-skill's data sheet for the plum, S1–S31
	facts: {
		height: { at1: [1, 1.8], at3: [3, 3.5], at5: [4, 4.5], at8: [4.5, 5.5], at15: [5.5, 6.5], grown: [6, 8], unit: 'm' },
		trunk: { at3: [0.039, 0.05], at5: [0.066, 0.08], at8: [0.1, 0.12], at15: [0.16, 0.2], at30: [0.25, 0.35], unit: 'm' },
		crown: { at8: [3, 4], grown: [4, 6], unit: 'm' },
		spacing: { standard: [[8, 10], [5, 6]], spindle: [[3.5, 6], [2, 4]], unit: 'm' },
		shade: 'full sun; in shade fewer flowers and poorer colour',
		climate: 'cool-temperate central Europe, hardy to USDA zone 6 (−23 to −18 °C), to over 1,000 m; prefers moister soils; any clay, loam or sand',
		years: { firstFlowers: [4, 6], firstCrop: [4, 6], fullBearing: [6, 8], productiveLife: [40, 60] },
		leaf: { length: [0.06, 0.1], width: [0.035, 0.05], petiole: [0.01, 0.02], area: [0.0017, 0.002], budBreak: 'early–mid April', fall: 'mid October–mid November', unit: 'm' },
		flower: { diameter: [0.015, 0.02], perBud: [1, 2], start: '25 April (17 April–6 May)', set: 0.11, kept: 0.71, selfFertile: true, unit: 'm' },
		fruit: { length: [0.034, 0.042], width: [0.024, 0.029], thick: [0.024, 0.026], mass: [0.018, 0.025], stalk: [0.021, 0.0325], daysFromBloom: [129, 141], harvest: 'early–mid September', brix: 20.4, freestone: true, unit: 'm, kg, days' },
		stone: { length: [0.0215, 0.0235], width: 0.012, thick: [0.006, 0.007], mass: [0.00065, 0.00098], chilling: [90, 150], depth: 0.05, germination: 'hypogeal', unit: 'm, kg, days' },
		yield: { spindle: [10.8, 12.2], standard: 40, standardGoodYear: [60, 100], unit: 'kg a tree a year' },
		diseases: 'sharka (very susceptible), pocket plums, rust, brown rot, plum moth',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one plum) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'plum' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'plum',
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
module.exports.organs = { ZW, LEAF_W, FRUIT_W, stone, leaf, flower, plum, plumGeometry, bud, Bag, timeAt, plumTree, axes, thicken, fruitSize, skinAt, surface, lite, detailAt, STAGES };
