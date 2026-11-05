'use strict';
/*
 * COFFEE 'CATURRA' — Coffea arabica L. 'Caturra' (red Caturra: Caturra Rojo, Caturra Vermelho, café Nanico): the dwarf
 * mutation of red Bourbon found in Minas Gerais and Espírito Santo, Brazil (1915–1918; to the IAC in 1937), whose one
 * dominant gene (Ct) shortens every internode. A compact evergreen bush, 1.7 m tall and 1.55 m across at three to four
 * years, a dense green column leafy to the ground, the coffee that began dense sun-grown planting in the Americas: chosen
 * to fit a dome. Version 2 of plants/coffee: one named cultivar, grown from its seed in parchment to the ripe red crop
 * of its fifth year.
 *
 * Its numbers are the cultivar's where they are measured (Krug et al. 1949, IAC: leaf 132 × 55 mm, cherry 15.2 × 11.3
 * mm, bean 8.4 × 6.3 mm, 2.0 m at 11 years; Cenicafé: 1.70 m, crown 1.55 m and 43 branch pairs at 30–43 months, the
 * main-stem internode 3.95 cm against Typica's 5.65; Costa Rica: the fruit's growth by days after flowering, 351 young
 * fruit a branch falling to about 100 ripe; WCR: green tips, first crop in year 3) and the species' otherwise (BBCH,
 * Arcila-Pulgarín et al. 2002: the soldier, the butterfly, the bloom). Every number with its source: plant-skill's data
 * sheet for it (references/coffee-caturra.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its seed and young plant redrawn and its cut cherry taken from a second plate (a composite kept on play by
 * its hash, f53904fa…): the leaf's outline, the cherry's profile and every colour traced off its panels. Where the plate
 * is wrong against the data sheet (its cherries nearly round where Caturra's are 1.35 : 1, its crop only at the top),
 * the data sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from banana v2 as plum v2 has it (`picture()` with its mipmaps, `named()`,
 *                   `backLit`), with the coffee's materials and its surfaces: the leaf's arched veins and the fine
 *                   fissures of old bark, colour pictures only.
 *   2. ORGANS       the coffee's own, each to its measure: the seed in its parchment, the seed leaves, the leaf, the
 *                   bud, candle and flower, the cherry, the bark by age.
 *   3. THE BUSH     Roux's model node by node: one upright stem of decussate leaf pairs, a pair of horizontal branches
 *                   at every node from the seventh, each branch growing on node by node in its own plane with its
 *                   leaves in two flat rows, secondaries from its older nodes; each branch node flowering once, about a
 *                   year old, after the dry season; the cherries clustered round it, dropping, ripening unevenly.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from sowing; a crop's days `d` from its bloom.
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: the veins of a coffee leaf
 * and the fine fissures of its old stem. Laid on by the shape's UVs (a leaf's own, the bark's in metres: `metric`),
 * mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); no bump pictures: a dense
 * bush of small triangles finds a pixel where a bump's normal is NaN (plum v2). Only at detail 0.5 and over.
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
 *             v = ½): the pale midrib and 10 pairs of side veins leaving it at about 50° and arching toward the tip,
 *             joined in loops inside the margin; the blade between them a little darker, puckered (the sheet's leaf,
 *             'Leaf, upper and lower surface')
 *   barkMap   0.12 m of old stem, laid on in metres (u along, v round): thin grey-brown bark with fine shallow
 *             fissures running along it between long narrow strips, and small pale lenticels (the sheet's 'old stem')
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 10;
	const vein = (x, y) => {
		const side = Math.abs(y - 0.5) * 2; // 0 at the midrib, 1 at the margin
		const slant = side * 0.62 + 0.3 * side * side;
		const phase = (x - 0.05) * VEINS - slant * 1.2;
		const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), 24) * smooth((0.9 - side) / 0.1) * smooth((x - 0.04) / 0.05) * smooth((0.96 - x) / 0.08);
		const loop = Math.exp(-Math.pow((side - 0.88) / 0.035, 2)) * 0.45 * smooth((x - 0.08) / 0.1);
		const mid = Math.exp(-Math.pow((y - 0.5) / 0.014, 2));
		// between two veins the blade bulges (puckered): darker in the middle of each field
		const field = Math.pow(Math.sin(((phase % 1) + 1) % 1 * Math.PI), 2) * smooth((0.85 - side) / 0.2) * smooth(side / 0.15);
		return { sec: Math.max(sec, loop), mid, field };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const { sec, mid, field } = vein(x, y);
				const mottle = tileNoise(x, y, 16, 3) - 0.5;
				const k = 0.9 + 0.3 * sec + 0.38 * mid - 0.08 * field + 0.04 * mottle;
				return [k * 1.02, k, k * 0.9];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x along the stem, y round it: long thin strips (2 along × 16 round to the tile), fine fissures between
				const w = tileNoise(x, y, 3, 61, 2, 9) - 0.5;
				const c = tileCells(x, y + w * 0.04, 2, 16, 63);
				const fissure = smooth((0.1 - (c.f2 - c.f1)) / 0.08);
				const lent = tileCells(x, y, 9, 30, 67);
				const dot = lent.id < 0.3 ? smooth((0.12 - lent.f1) / 0.06) : 0;
				const k = (0.86 + 0.18 * c.id + 0.1 * (tileNoise(x, y, 24, 65, 3, 8) - 0.5)) * lerp(1, 0.62, fissure);
				return [k + 0.22 * dot, k * 0.97 + 0.2 * dot, k * 0.94 + 0.16 * dot];
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
 * The materials, made once, plain and with their surfaces. `bark` the old stem, matt, finely fissured; `twig` young
 * wood, green to tan, a faint shine; `leaf` a leaf's two faces (one-sided, each its own colour): the coffee leaf is
 * very glossy above, so low roughness, but no clearcoat (a crown of glossy leaves turns white at a grazing angle:
 * lemon v2); `skin` the cherry, smooth and glossy; `sheet` thin things seen from both sides (corolla lobes, the seed
 * leaves' edges, stipules); `body` buds, stalks, the seed, roots.
 */
const MATERIALS = {
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, specularIntensity: 0.28, ...(s && { map: s('leafMap') }) }),
	skin: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, specularIntensity: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'skin', 'prop'];
// a coffee bush has thousands of leaves and flowers: a crowd far off draws a share of them, each grown to fill the gap
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
 * 2. ORGANS — the Caturra's own, each to its measure
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
/** a traced table made relative to its largest value */
const rel = (a) => {
	const m = Math.max(...a);
	return a.map((x) => x / m);
};
/** a table of stations 0 … 1 read at u, straight between them */
function station(tbl, u) {
	const x = clamp(u) * (tbl.length - 1);
	const i = Math.min(tbl.length - 2, Math.floor(x));
	return lerp(tbl[i], tbl[i + 1], x - i);
}

/**
 * The Caturra in numbers: sizes in metres from the data sheet (coffee-caturra.md, S1–S34), outlines and colours traced
 * off the reference sheet (f53904fa…, Nano Banana Pro, 2026-11-05) in linear sRGB, its median as the colour and p10–p90
 * as each organ's own variation. The sheet's scale bars are not used: every size is the data sheet's.
 */
const CT = {
	seed: {
		// in its parchment: ~10.5 × 7.8 × 4.8 mm [EST from the bean, 8.43 × 6.32 mm, S2, and a 0.15–0.2 mm shell]
		length: 0.0105,
		width: 0.0078,
		thick: 0.0048,
		depth: 0.015, // sown under 1–2 cm of sand (S12, S13)
		parchment: lin(0.66, 0.49, 0.27), // 'Parchment seeds': straw-beige (its median 0.687, 0.515, 0.296; benched)
		parchmentDark: lin(0.54, 0.37, 0.18),
		soiled: lin(0.45, 0.34, 0.22),
	},
	hypocotyl: { pink: lin(0.7, 0.45, 0.45), green: lin(0.3, 0.42, 0.12), radius: 0.001 }, // 'Soldier seedling': pinkish-white, Ø 2 mm (S15)
	cotyledon: {
		length: 0.025, // 20–30 mm long × 35–40 mm wide: wider than long (S17)
		halfWidth: 0.019,
		up: lin(0.165, 0.305, 0.082), // 'Butterfly seedling'
		upLo: lin(0.109, 0.227, 0.026),
		upHi: lin(0.25, 0.392, 0.136),
		under: lin(0.3, 0.42, 0.16),
		falls: 0.6, // years: they drop about when the plant is set out [EST]
	},
	leaf: {
		length: 0.132, // blade 132 × 55 mm (105–163 × 47–71), L/W 2.39 (Krug et al., S2); the sheet's 1.99 : 1 not used
		aspect: 2.39,
		petiole: 0.0103, // 10.3 mm (S2)
		upLo: lin(0.05, 0.115, 0.022), // 'Leaf, upper surface': round its median (0.084, 0.162, 0.05; p10 0.034, 0.102,
		upHi: lin(0.105, 0.2, 0.06), //    0.006, p90 0.147, 0.235, 0.112), so the blade's mean is the panel's
		under: lin(0.255, 0.35, 0.115), // 'lower surface': pale, matt (its median 0.23, 0.325, 0.095 at the panel's mean, as benched)
		underLo: lin(0.215, 0.305, 0.08),
		young: lin(0.283, 0.397, 0.06), // the green tips: light green, never bronze (S1, S2)
		youngUnder: lin(0.36, 0.46, 0.13),
		old: lin(0.6, 0.42, 0.04), // yellow before it falls (BBCH 93)
		rust: lin(0.32, 0.1, 0.03),
		stalk: lin(0.12, 0.2, 0.03),
		life: [0.8, 1.25], // years: ~300 days (S4), longer on the inner, shaded nodes [EST]
		expand: 0.06, // years from bud to full size
		green: 0.14, // years from light green to dark (the 3rd pair from the tip is dark: S4)
	},
	// the blade's outline off 'Leaf, upper surface' (blade only, its petiole cut off): its width at 30 stations, base → tip
	LEAF_W: rel([4.4, 14.5, 25.8, 35.1, 41.2, 47.1, 51.5, 54.2, 56.7, 60.9, 62.0, 63.9, 64.1, 64.7, 64.5, 64.7, 63.6, 63.4, 60.7, 58.8, 56.1, 51.3, 47.9, 41.6, 34.4, 28.1, 16.2, 8.2, 4.2, 0.6]),
	flower: {
		lobe: 0.0095, // corolla lobes 8–11 mm, the flower 18–20 mm across (S17, S19; "a little smaller" than Bourbon's, S2)
		lobeHalf: 0.0016, // strap-shaped, ~3.2 mm wide, round at the tip ('Flower details', front)
		tube: 0.0085, // corolla tube 8–10 mm
		anther: 0.0055,
		style: 0.012,
		white: lin(0.9, 0.9, 0.86),
		cream: lin(0.85, 0.82, 0.68),
		antherColour: lin(0.72, 0.6, 0.38), // 'Flower details': cream-tan anthers
		calyx: lin(0.2, 0.32, 0.06),
		dead: lin(0.45, 0.33, 0.18),
		candle: lin(0.82, 0.8, 0.62), // 'Node with bud cluster': cream-white, green at the foot
		budGreen: lin(0.16, 0.3, 0.05), // the dormant buds: green, 4–6 mm (S4)
		perNode: [8, 16], // both axils together (S4, S8)
		blooms: 0.45, // the share of year-old nodes that flower [EST: ~2,400 ripe a bush in a heavy crop, S8]
	},
	cherry: {
		length: 0.01524, // 15.24 × 11.32 mm (S2): 1.35 : 1 (the sheet's ripe cherries are drawn 1.09 : 1; not used)
		aspect: 1.346,
		flat: 0.92, // a little flattened on the two sides where the seeds face [EST]
		stalk: 0.004, // 3–5 mm (S2: "short-pedunculate")
		ripe: 235, // days from bloom: red at ~225–240 (S4, S8)
	},
	// the cherry's profile off the sheet's 'Cherry development' glossy green cherry (body only): its width at 14
	// stations, stalk end → navel; its proportion is the data sheet's
	CHERRY_W: rel([5.0, 8.2, 9.8, 10.9, 11.5, 12.0, 12.1, 12.1, 11.7, 11.2, 10.3, 8.9, 6.9, 1.7]),
	bark: {
		shoot: lin(0.136, 0.188, 0.021), // 'Bark: young shoot'
		tan: lin(0.4, 0.25, 0.13), // '1-year branch' (0.48, 0.30, 0.17) toward the data sheet's #9a7a55
		old: lin(0.24, 0.185, 0.14), // 'old stem': grey-brown (0.305, 0.235, 0.178) a little darker: the light box lifts it
		oldDark: lin(0.18, 0.14, 0.11),
	},
	root: { young: lin(0.68, 0.59, 0.52), old: lin(0.45, 0.27, 0.13) }, // the seedlings' cream roots; the 1-year system's brown
};

/** the cherry's colour at `d` days from its bloom, ripening as the data sheet's BBCH stages and the sheet's panels */
const CHERRY_COLOURS = [
	[0, lin(0.14, 0.235, 0.02)], // pinhead (the sheet's 4 mm cherry, its middle 0.153, 0.254, 0.022)
	[60, lin(0.17, 0.29, 0.035)], // light, slightly translucent green
	[120, lin(0.12, 0.21, 0.012)], // glossy green ('Cherry development', 11 mm)
	[192, lin(0.13, 0.22, 0.012)],
	[203, lin(0.36, 0.4, 0.03)], // pale yellow-green (BBCH 79–81)
	[213, lin(0.84, 0.36, 0.03)], // yellow-orange ('Cherry development', 14 mm)
	[222, lin(0.66, 0.12, 0.02)], // orange-red
	[232, lin(0.43, 0.006, 0.014)], // ripe red ('Cherry development', 15 mm)
	[252, lin(0.25, 0.004, 0.012)], // deep cherry red
	[272, lin(0.07, 0.02, 0.03)], // overripe, purple-black (the sheet's fifth cherry)
	[300, lin(0.04, 0.026, 0.02)], // dried on the branch
];
function cherryColour(d) {
	const C0 = CHERRY_COLOURS;
	if (d <= C0[0][0]) return C0[0][1].clone();
	for (let i = 1; i < C0.length; i++)
		if (d <= C0[i][0]) return C0[i - 1][1].clone().lerp(C0[i][1], (d - C0[i - 1][0]) / (C0[i][0] - C0[i - 1][0]));
	return C0[C0.length - 1][1].clone();
}

/**
 * The cherry's length as a part of its ripe length by days from bloom: a double sigmoid, from the Caturra's fresh
 * masses (15 mg at 34 d, 124 mg at 65 d, 765 mg at 99 d, 1,103 mg at 217 d, 1,324 mg at 247 d; S8) as their cube roots:
 * the pinhead for six to eight weeks, the fast swell to week 17, then the bean filling.
 */
const cherrySize = (d) => straight(d, [[0, 0.12], [20, 0.17], [34, 0.22], [50, 0.3], [65, 0.44], [82, 0.65], [99, 0.8], [130, 0.86], [180, 0.9], [217, 0.94], [240, 1], [270, 0.99], [300, 0.86]]);

/** of the flowers of a node, how many are still on at `d` days: 351 → 260 → 154 → ~100 a branch (S8) */
const kept = (d) => straight(d, [[0, 1], [8, 0.95], [34, 0.85], [65, 0.63], [99, 0.37], [160, 0.3], [230, 0.28]]);

/* ---- the seed in its parchment ---- */

/**
 * The parchment seed: an oval domed on its back and flat on its face, a deep straight furrow down the middle of the
 * flat face, built along +X, its back up (+Y), at the origin. `paint(u, v, back)` its colour.
 */
function parchmentGeometry(L, W, T, paint) {
	const g = new THREE.SphereGeometry(1, fewer(24, 8), fewer(16, 6));
	const pos = g.attributes.position;
	const col = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i++) {
		let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
		const back = y > 0;
		// the flat face: squashed nearly flat, the furrow pressed into it along its middle
		if (!back) y *= 0.18;
		const furrow = Math.exp(-Math.pow(z / 0.13, 2)) * Math.sqrt(Math.max(0, 1 - x * x * 1.05));
		if (!back) y += 0.32 * furrow;
		pos.setXYZ(i, (x * L) / 2, y * T * 0.82, (z * W) / 2);
		const c = toColor(paint((x + 1) / 2, (z + 1) / 2, back, furrow));
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	return g;
}

/** the seed as sown, or as the cap on the soldier's head: at `at`, its length along `dir`, its back toward `back` */
function parchmentSeed(bag, at, dir, back, soil, seedKey) {
	const S = CT.seed;
	const ns = hashText(seedKey) % 997;
	const g = parchmentGeometry(S.length, S.width, S.thick, (u, v, top, furrow) => {
		const n = fbm(u * 6, v * 6, top ? 1 : 3, 3, ns);
		const c = mix(S.parchmentDark, S.parchment, 0.4 + n * 0.9);
		if (!top) c.lerp(S.parchmentDark, furrow * 0.5);
		return c.lerp(S.soiled, soil);
	});
	bag.add('body', g, aimFace(at, dir, back));
}

/* ---- the seed leaves ---- */

/** one seed leaf's half width at u (0 its stalk … 1 its far edge): kidney-round, wider than long */
const cotyledonHalf = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * (0.06 + 0.9 * u))), 0.5) * (1 - 0.1 * u) + 0.02;

/**
 * The two seed leaves at the top of the hypocotyl: `open` 0 (folded up together inside the parchment) … 1 (spread
 * flat like a butterfly), `grown` 0 … 1 their size, `fade` 0 … 1 yellowing before they fall.
 */
function cotyledons(bag, top, turn, open, grown, fade, r) {
	const Cf = CT.cotyledon;
	const L = Cf.length * lerp(0.45, 1, grown), W = Cf.halfWidth * lerp(0.4, 1, grown);
	const k = r();
	for (const side of [1, -1]) {
		const out = v3(Math.cos(turn) * side, 0, Math.sin(turn) * side);
		const rise = lerp(1.35, 0.12, open);
		const dir = out.clone().multiplyScalar(Math.cos(rise)).addScaledVector(UP, Math.sin(rise)).normalize();
		const face = UP.clone().multiplyScalar(Math.cos(rise)).addScaledVector(out, -Math.sin(rise)).normalize();
		const g = sheet({
			length: L,
			width: W,
			shape: cotyledonHalf,
			lift: (u, v) => 0.05 * Math.abs(v) * (1 - u) - 0.06 * u * u + 0.012 * Math.sin(u * 9 + side) * v * v,
			paint: (u, v) => mix(Cf.upLo, Cf.upHi, 0.35 + 0.4 * k + 0.25 * (1 - Math.abs(v))).lerp(CT.leaf.old, fade),
			back: () => Cf.under.clone().lerp(CT.leaf.old, fade),
			backLit: false,
			along: 7,
			across: 4,
		});
		const n = g.attributes.normal, half = n.count / 2;
		for (let i = 0; i < half; i++) n.setXYZ(half + i, -n.getX(i), -n.getY(i), -n.getZ(i));
		bag.add('leaf', g, aimFace(top.clone().addScaledVector(out, 0.0012), dir, face));
	}
}

/* ---- the leaf ---- */

/** the blade's half width at u (0 base … 1 tip), as a part of its greatest: the sheet's traced outline */
const leafHalf = (u) => station(CT.LEAF_W, u);

/** the matrix that sets a sheet built along +X (its face +Y) at `at`, pointing along `dir`, its face turned toward `face` */
function aimFace(at, dir, face) {
	const x = dir.clone().normalize();
	const y = face.clone().addScaledVector(x, -face.dot(x));
	if (y.lengthSq() < 1e-10) return aim(at, dir);
	y.normalize();
	const z = new THREE.Vector3().crossVectors(x, y);
	return new THREE.Matrix4().makeBasis(x, y, z).setPosition(at);
}

/**
 * One leaf: its short petiole from the axis's surface at `at` along `out`, then the blade held out level (a branch's
 * leaves in two flat rows) or rising (on the young stem), drooping a little at its slender tip, folded slightly along
 * its midrib, its margin WAVY (the Caturra's undulate blade). `size` its length as a part of a grown leaf's, `age`
 * years since its node formed, `life` years it lives; light green and soft at first (Caturra's green tips), dark and
 * glossy from the third pair, yellow with rust spots before it falls.
 */
function leaf(bag, o) {
	const F = CT.leaf;
	const { at, out, size, age, life, r } = o;
	if (age <= 0 || age >= life) return;
	const expand = smooth(age / F.expand);
	const greening = smooth((age - 0.02) / F.green);
	const yellow = smooth((age - (life - 0.03)) / 0.03);
	const L = F.length * size * lerp(0.2, 1, expand);
	const W = L / F.aspect / 2;
	const P = F.petiole * size * lerp(0.4, 1, expand);
	const flat = out.clone();
	flat.y = 0;
	if (flat.lengthSq() < 1e-8) flat.set(1, 0, 0);
	flat.normalize();
	// held out: on a branch nearly level, on the young stem rising; the youngest pair still folded up along the shoot
	const rise = o.flat ? 0 : (o.rise ?? 0.15) + lerp(0.9, 0, expand) + about(r, 0, 0.1) - 0.15 * yellow;
	const droop = o.flat ? 0 : lerp(0.05, 0.3, greening) + 0.25 * smooth((age - 0.25) / 0.5) + about(r, 0, 0.1) + 0.3 * yellow; // older leaves hang
	const pDir = flat.clone().multiplyScalar(Math.cos(rise)).addScaledVector(UP, Math.sin(rise)).normalize();
	const end = at.clone().addScaledVector(pDir, P);
	const bDir = flat.clone().multiplyScalar(Math.cos(rise - droop)).addScaledVector(UP, Math.sin(rise - droop)).normalize();
	const side = new THREE.Vector3().crossVectors(bDir, UP).normalize();
	const face = o.flat ? UP.clone() : UP.clone().applyAxisAngle(bDir, about(r, 0, 0.18) + (o.roll ?? 0));
	const k = r();
	const wave = r() * 6.283;
	const spots = r() * 100;
	const colour = (u, v, back) => {
		const dark = back ? mix(F.underLo, F.under, 0.4 + 0.6 * k) : mix(F.upLo, F.upHi, 0.25 + 0.5 * k);
		const c = mix(back ? F.youngUnder : F.young, dark, greening);
		if (yellow > 0) {
			c.lerp(F.old, yellow);
			if (noise3(u * 9, v * 4, spots) > 0.66) c.lerp(F.rust, yellow * 0.7);
		}
		return c;
	};
	const g = sheet({
		length: L,
		width: W,
		shape: leafHalf,
		// a shallow V along the midrib, the wavy margin, the tip bent down
		lift: o.flat ? () => 0 : (u, v) => 0.04 * Math.abs(v) * (1 - 0.5 * u) + 0.009 * Math.sin(u * 10 + wave) * v * Math.abs(v) * smooth(u / 0.15) * (1 - smooth((u - 0.8) / 0.15)) - 0.07 * u * u * (1 + 0.6 * (1 - expand)),
		paint: (u, v) => colour(u, v, false),
		back: (u, v) => colour(u, v, true),
		backLit: false,
		along: o.flat ? 30 : 9,
		across: 2,
	});
	// a leathery leaf: its underside lit as itself, facing down (avocado v3)
	const nor = g.attributes.normal, half = nor.count / 2;
	for (let i = 0; i < half; i++) nor.setXYZ(half + i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
	g.applyMatrix4(aimFace(end, bDir, face));
	if (DETAIL.level < 0.5) {
		bag.add('leaf', g);
		return;
	}
	const stalkColour = mix(F.young, F.stalk, greening).lerp(F.old, yellow);
	const petiole = tube([at, end], (u) => lerp(0.0011, 0.0008, u) * lerp(0.6, 1, expand), () => stalkColour, 3, false);
	const both = mergeGeometries([petiole, g]);
	petiole.dispose();
	g.dispose();
	if (both) bag.add('leaf', both);
}

/** a stipule: the small green triangle between the two leaf stalks of a node, on young wood */
function stipule(bag, at, dir, out, age) {
	if (age > 0.6) return;
	const g = sheet({ length: 0.004, width: 0.0018, shape: (u) => 1 - u, paint: () => mix(CT.bark.shoot, CT.bark.tan, age * 1.5), along: 1, across: 1 });
	bag.add('sheet', g, aimFace(at, dir.clone().addScaledVector(out, 0.25).normalize(), out));
}

/* ---- the buds and the flower ---- */

/** a dormant flower bud (green, 3–5 mm) or a candle (`candle` 0 … 1: swelling white, 5–10 mm, the day before it opens) */
function bud(bag, at, dir, swell, candle) {
	const Fl = CT.flower;
	const len = lerp(0.003, 0.005, swell) + candle * 0.0055;
	const w = lerp(0.0011, 0.0016, swell) + candle * 0.0005;
	const tip = at.clone().addScaledVector(dir, len);
	const c0 = Fl.budGreen, c1 = mix(Fl.budGreen, Fl.candle, candle);
	bag.add('body', tube(candle > 0 ? [at, at.clone().addScaledVector(dir, len * 0.5), tip] : [at, tip], (u) => w * Math.sqrt(Math.max(0.02, Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.88)))), (u) => mix(c0, c1, smooth((u - 0.15) / 0.3)), candle > 0 ? 5 : 4, true));
}

/**
 * One flower, close up (the sheet's three flower panels): a short green calyx rim on a 3 mm pedicel, the narrow white
 * corolla tube, five pointed lobes spread flat as a star, five cream anthers lying out between the lobes on short
 * filaments, and the slender white style with its two curled stigma branches. From `at` along `dir`; `open` 0 … 1,
 * `fall` 0 … 1 browning and dropping after the second day.
 */
function flower(bag, at, dir, open, fall, r, turn = 0) {
	const Fl = CT.flower;
	if (fall >= 1) return;
	const d = dir.clone().normalize();
	const s1 = across(d), s2 = new THREE.Vector3().crossVectors(d, s1).normalize();
	const white = mix(Fl.white, Fl.dead, fall);
	const pedicel = at.clone().addScaledVector(d, 0.003);
	bag.add('body', tube([at, pedicel], () => 0.0005, () => Fl.calyx, 3));
	if (DETAIL.fruit) bag.add('body', bead(pedicel, v3(0.0012, 0.0012, 0.0012), Fl.calyx, 4));
	const mouth = pedicel.clone().addScaledVector(d, Fl.tube * lerp(0.75, 1, open));
	bag.add('body', tube([pedicel, mouth], (u) => lerp(0.0009, 0.0014, u), () => white, 4));
	const spread = lerp(0.25, 1.45, open) - 0.4 * fall; // the lobes from along the tube (closed) to flat out
	for (let i = 0; i < 5; i++) {
		const a = turn + (i / 5) * Math.PI * 2 + about(r, 0, 0.06);
		const radial = s1.clone().multiplyScalar(Math.cos(a)).addScaledVector(s2, Math.sin(a));
		const ld = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(radial, Math.sin(spread)).normalize();
		const g = sheet({
			length: Fl.lobe * lerp(0.9, 1, open) * about(r, 1, 0.05),
			width: Fl.lobeHalf,
			shape: (u) => (u < 0.15 ? 0.65 + (0.35 * u) / 0.15 : 1) * (u > 0.78 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.78) / 0.22, 2))) : 1),
			lift: (u, v) => 0.06 * v * v - 0.05 * u * u * open,
			paint: (u) => mix(Fl.cream, white, smooth(u / 0.3)),
			along: DETAIL.fruit ? 12 : 3,
			across: DETAIL.fruit ? 2 : 1,
		});
		bag.add('sheet', g, aimFace(mouth, ld, d));
		if (open > 0.3 && fall < 0.5) {
			// a stamen between this lobe and the next: a short filament, the long anther lying out
			const a2 = a + Math.PI / 5;
			const rad2 = s1.clone().multiplyScalar(Math.cos(a2)).addScaledVector(s2, Math.sin(a2));
			const ad = d.clone().multiplyScalar(0.55).addScaledVector(rad2, 0.85).normalize();
			const p0 = mouth.clone().addScaledVector(d, 0.0008);
			const p1 = p0.clone().addScaledVector(ad, Fl.anther * open);
			bag.add('body', tube([0, 0.15, 0.3, 0.55, 0.8, 1].map((k) => p0.clone().lerp(p1, k)), (u) => (u < 0.15 ? 0.00018 : 0.0005 * Math.pow(Math.max(0.03, Math.sin(Math.PI * Math.min(1, (u - 0.15) / 0.85))), 0.3)), () => Fl.antherColour, DETAIL.fruit ? 6 : 3)); // a short filament, the long oblong anther
		}
	}
	if (open > 0.2 && fall < 0.6 && DETAIL.level >= 0.5) {
		const top = mouth.clone().addScaledVector(d, Fl.style - Fl.tube);
		bag.add('body', tube([pedicel, top], () => 0.00028, () => Fl.white, 3));
		for (const s of [1, -1]) {
			const b = top.clone().addScaledVector(s1, 0.0015 * s).addScaledVector(d, 0.002);
			bag.add('body', tube([top, b], () => 0.00022, () => Fl.white, 3));
		}
	}
}

/* ---- the cherry ---- */

/** the cherry's radius at u (0 stalk end … 1 navel) as a part of its greatest: an ellipse corrected by the traced profile */
const CHERRY_CORR = (() => {
	const n = CT.CHERRY_W.length;
	const c = CT.CHERRY_W.map((w, i) => {
		const u = (i + 0.5) / n;
		const e = Math.sqrt(Math.max(1e-3, 1 - Math.pow(2 * u - 1, 2)));
		return clamp(w / e, 0.6, 1.25);
	});
	// the traced end stations lie in the stalk's and the navel's shadow: held at their inner neighbours'
	c[0] = c[1] = c[2];
	c[n - 1] = c[n - 2];
	return c;
})();
function cherryRadius(u) {
	const e = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
	// near the poles the correction is held at its neighbours': the lathe closes round (orange v2)
	const c = station(CHERRY_CORR, clamp((u - 0.5 / CHERRY_CORR.length) * (CHERRY_CORR.length / (CHERRY_CORR.length - 1)), 0, 1));
	return e * c;
}

/**
 * One cherry as a lathe along +X from its stalk end to its navel, its rings closer toward the poles (orange v2), its
 * width `W` and length `L`, flattened a little across (`flat`); `paint(u, a)` its colour (a 0 … 1 round it). The navel:
 * a small dark disc at the tip, ringed by the calyx's remnant.
 */
function cherryGeometry(L, W, paint, fine) {
	const small = L < 0.008;
	const rings = fine ? 22 : small ? 4 : fewer(7, 4), sides = fine ? 24 : small ? 6 : fewer(8, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const R = W / 2;
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((Math.PI * i) / rings)) / 2;
		// the navel a little sunk: the profile flattened over the last few per cent
		const x = u * L - (u > 0.94 ? (u - 0.94) * L * 0.5 : 0);
		const rr = R * cherryRadius(u);
		for (let j = 0; j <= sides; j++) {
			const a = (j / sides) * Math.PI * 2;
			pos.push(x, rr * Math.cos(a), rr * Math.sin(a) * CT.cherry.flat);
			nor.push(0, Math.cos(a), Math.sin(a));
			uv.push(u, j / sides);
			const c = toColor(paint(u, j / sides));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	return smoothNormals(made(pos, nor, uv, col, idx, false));
}

/**
 * A cherry `d` days from its bloom, hanging from `at` (the node's surface) along `dir` on its short stalk: its size by
 * the double sigmoid, its colour by days (the sheet's five ages), each ripening a little apart (`late` days).
 */
function cherry(bag, at, dir, d, late, r, seedKey, stalk = true) {
	const Ch = CT.cherry;
	const dd = d - late;
	const g = cherrySize(dd) * about(r, 1, 0.05);
	const L = Ch.length * g, W = (Ch.length / Ch.aspect) * g * lerp(1.15, 1, smooth(dd / 99)); // a pinhead is rounder
	const stalkEnd = at.clone().addScaledVector(dir, stalk ? Ch.stalk * lerp(0.5, 1, smooth(dd / 60)) : 0);
	const stalkC = mix(CT.flower.calyx, CT.bark.tan, smooth((dd - 150) / 80));
	if (stalk) bag.add('twig', tube([at, stalkEnd], (u) => lerp(0.0006, 0.0009, u), () => stalkC, 3));
	const base = cherryColour(dd);
	const ns = hashText(seedKey) % 991;
	const fine = !!DETAIL.fruit && DETAIL.fruit === seedKey;
	const geo = cherryGeometry(L, W, (u, a) => {
		// ripening runs from the stalk end and the sunny side; the navel a dark disc ringed paler
		const c = cherryColour(dd + 5 * (0.5 - u) + 3 * Math.cos(a * 6.283)).lerp(base, 0.4);
		c.multiplyScalar(0.94 + 0.12 * noise3(u * 5, Math.cos(a * 6.283) * 2, Math.sin(a * 6.283) * 2, ns));
		if (u > 0.955) c.lerp(lin(0.06, 0.04, 0.02), smooth((u - 0.955) / 0.03));
		else if (u > 0.9) c.lerp(mix(base, lin(0.5, 0.4, 0.15), 0.3), 0.5 * smooth((u - 0.9) / 0.04));
		return c;
	}, fine);
	bag.add('skin', geo, aim(stalkEnd, dir, r() * 6.283));
}

/* ---- the bark ---- */

/** wood's colour by its age (years): the green young shoot, tan 1-year wood, the grey-brown old stem */
function woodColour(age, v, s, ns) {
	const B = CT.bark;
	let c = mix(B.shoot, B.tan, smooth((age - 0.15) / 0.6));
	c.lerp(B.old, smooth((age - 1.0) / 1.6));
	if (age > 1.2) c.lerp(B.oldDark, 0.35 * fbm(Math.cos(v * 6.283) * 3, s * 20, Math.sin(v * 6.283) * 3, 2, ns));
	return c;
}

/* ================================================================================================================
 * 3. THE BUSH — Roux's model node by node, its roots, its crops
 * ============================================================================================================== */

/**
 * The plant's tempo, from the data sheet's timeline (Colombia, ~1,400 m, ~21 °C): the root out at 3 weeks, the
 * soldier at ~50 days, the butterfly at ~75, a leaf pair every 2–3 weeks in the nursery (7 pairs at planting, 7–8
 * months), then ~14–15 node pairs a year on the stem (43 branch pairs at 30–43 months, S5), slowing in the fourth
 * year (2.0 m at 11 years, S2). The main bloom once a year after the dry season, the first 330 days after planting
 * (S6), on nodes about a year old; ripe ~235 days after.
 */
const BUSH = {
	// stem node pairs formed by year t from sowing (node 0 the seed leaves)
	NODES: [[0.2, 0], [0.25, 1], [0.55, 7], [0.62, 7.4], [0.72, 8], [1.0, 11.5], [1.52, 19], [2.15, 28.5], [3.0, 41], [3.52, 46], [4.2, 51], [5, 55], [7, 61], [11, 70]],
	firstBranch: 7, // the first branch pair after node 6–7 (S4): none on the nursery plant
	internode: (n) => (n <= 1 ? 0.012 : n <= 6 ? 0.021 : n <= 30 ? 0.041 : 0.03), // 1–2.5 cm in the nursery, then ~3.4 cm (S5)
	// branch nodes by the branch's age: ~40 cm in its first year, fastest at first (the young upper branches reach out
	// nearly as far as the old lower ones, so the bush is a cylinder, not a cone: S2), ~60–70 cm at two years (S8), then
	// little more (S27), at ~3 cm a node
	branchNodes: (a) => (a <= 0 ? 0 : a < 1 ? (13 * (1 - Math.exp(-2.2 * a))) / (1 - Math.exp(-2.2)) : a < 2 ? 13 + 7 * (a - 1) : a < 3 ? 20 + 2.5 * (a - 2) : 22.5 + 1 * (a - 3)),
	branchInternode: 0.03, // 2.5–4 cm (S31, S2)
	bloom0: 0.52, // the main bloom each year at t ≡ 0.52 (the first at 1.52: 330 days after planting at 0.62)
	// stem diameter at the collar by year: 2 mm at the butterfly, 4–5 mm at planting, ~5 cm at 3.6 years (Catuaí, S20)
	COLLAR: [[0.2, 0.002], [0.62, 0.0045], [1.0, 0.009], [1.52, 0.016], [2.15, 0.027], [3.0, 0.04], [3.6, 0.048], [4.2, 0.053], [7, 0.068], [11, 0.085]],
	ROOT: [[0, 0], [0.058, 0.012], [0.1, 0.03], [0.137, 0.06], [0.205, 0.09], [0.62, 0.18], [1, 0.25], [2, 0.35], [4, 0.42]], // the taproot, to 0.3–0.45 m (S22)
	SPREAD: [[0.2, 0.03], [0.62, 0.12], [1, 0.3], [2, 0.65], [3.5, 1.0], [6, 1.3]], // the laterals, 1–1.5 m from the stem
};

/** a monotonic table read backwards: the x at which it reaches y */
function inverse(rows, y) {
	if (y <= rows[0][1]) return rows[0][0];
	for (let i = 1; i < rows.length; i++)
		if (y <= rows[i][1]) {
			const [x0, y0] = rows[i - 1], [x1, y1] = rows[i];
			return lerp(x0, x1, (y - y0) / (y1 - y0));
		}
	const [x0, y0] = rows[rows.length - 2], [x1, y1] = rows[rows.length - 1];
	return x1 + ((y - y1) * (x1 - x0)) / (y1 - y0);
}
const nodesAt = (t) => (t < BUSH.NODES[0][0] ? 0 : straight(t, BUSH.NODES));
const nodeTime = (n) => inverse(BUSH.NODES, n);
/** the branch's age at which it has n nodes */
function branchNodeAge(n) {
	if (n <= 13) return -Math.log(1 - (n / 13) * (1 - Math.exp(-2.2))) / 2.2;
	if (n <= 20) return 1 + (n - 13) / 7;
	if (n <= 22.5) return 2 + (n - 20) / 2.5;
	return 3 + (n - 22.5);
}

/** the bloom a node born at `born` flowers in (once, when it is 0.3–1.3 years old), as a time, or null */
function bloomOf(born) {
	const k = Math.ceil(born + 0.3 - BUSH.bloom0);
	return Math.max(1, k) + BUSH.bloom0;
}

/** a polyline's lengths along it */
function lengths(pts) {
	const s = [0];
	for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return s;
}
/** the point and direction at length s along a polyline (its lengths `ls`) */
function pointAt(pts, ls, s) {
	let i = 1;
	while (i < ls.length - 1 && ls[i] < s) i++;
	const k = clamp((s - ls[i - 1]) / Math.max(1e-9, ls[i] - ls[i - 1]));
	const dir = pts[i].clone().sub(pts[i - 1]).normalize();
	return { at: pts[i - 1].clone().lerp(pts[i], k), dir };
}

/**
 * A plagiotropic branch (or a secondary off one): it leaves at `from` toward azimuth `phi` at `theta` from vertical,
 * level-ish, and bends down along its length and with its age and load: its direction at s depends only on s and on
 * the slow sag, so a younger branch is the first part of the older one. Its nodes come at its own tempo from `born`.
 */
function plagiotrope(seed, key, from, born, t, o) {
	const r = chance(seed, 'branch', ...key);
	const vig = about(r, 1, 0.12) * (o.vigour ?? 1);
	const age = t - born;
	if (age <= 0) return null;
	const nodes = Math.min(o.most ?? 60, BUSH.branchNodes(age) * vig);
	const whole = Math.floor(nodes);
	const ib = [];
	for (let j = 0; j <= whole + 1; j++) ib.push(BUSH.branchInternode * (j === 0 ? 1.2 : about(r, 1, 0.14)));
	// where its nodes are and when each formed; the youngest internode still lengthening
	const ns = [];
	let s = 0;
	for (let j = 0; j < whole; j++) {
		s += ib[j];
		ns.push({ j, s, born: born + branchNodeAge((j + 1) / vig) });
	}
	const tipS = s + ib[whole] * (nodes - whole);
	const sag = o.theta + 0.06 * smooth(age / 2.5);
	const bend = 0.3 + 0.6 * smooth((age - 0.8) / 2.5) + (o.load ?? 0) * 0.45; // old lower branches hang (S5: "more hanging with age")
	const wig = r() * 6.28;
	const dirAt = (x) => {
		const th = Math.min(2.1, sag + bend * x);
		const ph = o.phi + 0.06 * Math.sin(x * 7 + wig);
		return v3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
	};
	const step = 0.03;
	const pts = [from.clone()];
	let p = from.clone();
	for (let x = 0; x < tipS - 1e-6; x += step) {
		const h = Math.min(step, tipS - x);
		p = p.clone().addScaledVector(dirAt(x + h / 2), h);
		pts.push(p);
	}
	if (pts.length < 2) pts.push(from.clone().addScaledVector(dirAt(0), Math.max(1e-4, tipS)));
	const ls = lengths(pts);
	for (const n of ns) Object.assign(n, pointAt(pts, ls, n.s));
	return { key, pts, ls, nodes: ns, tipS, born, age, vig, r };
}

/** the radius of a branch at length s, by its age: 1 mm at the tip, 5–6 mm at the foot of a three-year branch */
const branchRadius = (b, s) => lerp(0.0011 + 0.0045 * Math.sqrt(clamp(b.age / 3, 0, 1.4)), 0.001, clamp(s / Math.max(0.01, b.tipS)));

/**
 * The coffee bush at `t` years from sowing.
 */
function coffeeBush(t, seed) {
	const bag = new Bag();
	const ns = hashText(seed) % 1000;
	const r0 = chance(seed, 'plant');
	const days = t * 365;
	const S = CT.seed;
	const base = v3(0, -S.depth, 0); // the root collar, where the seed lay
	const turn0 = r0() * Math.PI * 2;
	const lean = v3(about(r0, 0, 1), 0, about(r0, 0, 1)).normalize().multiplyScalar(0.025);

	/* -- the seed, before it rises -- */
	const hyp = straight(days, [[0, 0], [21, 0], [38, 0.012], [45, 0.035], [50, 0.065], [75, 0.075], [150, 0.08]]);
	const rootLen = straight(t, BUSH.ROOT);
	if (DETAIL.roots && rootLen > 0) {
		root(bag, { seed, key: ['tap'], from: base, dir: v3(0, -1, 0), length: Math.max(0.42, rootLen), grown: rootLen / Math.max(0.42, rootLen), radius: lerp(0.0007, 0.012, smooth(t / 4)), young: CT.root.young, old: CT.root.old, down: 0.25, wander: 0.12, laterals: t < 0.1 ? 0 : 7, lateral: 0.5, depth: t < 0.6 ? 1 : 2, age: smooth(t / 2), taper: 0.8 });
		const spread = t < 0.2 ? 0 : straight(t, BUSH.SPREAD);
		for (let i = 0; i < (t < 0.6 ? 5 : 9) && spread > 0; i++) {
			const rr = chance(seed, 'lateral', i);
			const a = (i / 9) * Math.PI * 2 + rr();
			root(bag, { seed, key: ['lat', i], from: base.clone().add(v3(0, -0.01 - i * 0.004, 0)), dir: v3(Math.cos(a), -0.25, Math.sin(a)), length: 1.4, grown: spread / 1.4 * about(rr, 1, 0.15), radius: lerp(0.0005, 0.007, smooth(t / 4)), young: CT.root.young, old: CT.root.old, down: 0.03, wander: 0.3, laterals: 6, lateral: 0.35, depth: 2, age: smooth(t / 3), floor: -0.35, taper: 0.85 });
		}
	}
	if (hyp <= 0) {
		// the seed lying in the sand, flat face down
		parchmentSeed(bag, base.clone().add(v3(0, 0.0012, 0)), v3(Math.cos(turn0), 0, Math.sin(turn0)), UP, 0.15, seed);
		return bag.build();
	}

	/* -- the stem: the hypocotyl (a hook, then straight), then the epicotyl node by node -- */
	const N = nodesAt(t);
	const whole = Math.floor(N);
	const stemNodes = []; // { n, s, born }
	let s = hyp;
	for (let n = 1; n <= whole; n++) {
		const rn = chance(seed, 'internode', n);
		const born = nodeTime(n);
		s += BUSH.internode(n) * about(rn, 1, 0.12) * lerp(0.3, 1, smooth((t - born) / 0.08));
		stemNodes.push({ n, s, born });
	}
	const tipLen = s + BUSH.internode(whole + 1) * 0.3 * (N - whole);
	const hook = 1 - span(days, 44, 53); // the hypocotyl's top bent over, pulling the seed up out of the sand
	const pts = [];
	const step = 0.005;
	let p = base.clone();
	let dir = UP.clone();
	pts.push(p.clone());
	const wig = r0() * 6.28;
	for (let x = 0; x < tipLen - 1e-6; x += step) {
		const h = Math.min(step, tipLen - x);
		const fromTop = hyp - x; // within the hypocotyl's top, bent while it is a hook
		let d = UP.clone().add(lean.clone().multiplyScalar(Math.min(1, x / 0.3))).add(v3(0.02 * Math.sin(x * 9 + wig), 0, 0.02 * Math.cos(x * 7 + wig)));
		if (hook > 0 && x < hyp && fromTop < 0.014) {
			const bendA = hook * Math.PI * (1 - fromTop / 0.014);
			d = v3(Math.sin(bendA) * Math.cos(turn0), Math.cos(bendA), Math.sin(bendA) * Math.sin(turn0));
		}
		dir = d.normalize();
		p = p.clone().addScaledVector(dir, h);
		pts.push(p);
	}
	const ls = lengths(pts);
	const collar = straight(t, BUSH.COLLAR) / 2;
	const stemR = (x) => Math.max(0.0011 + 0.0003 * smooth(t / 1), collar * Math.pow(clamp(1 - x / (tipLen + 0.04)), 0.8)) * (1 + 0.25 * Math.exp(-Math.max(0, x - CT.seed.depth) / 0.03) * smooth(t / 2));
	const bornAt = (x) => {
		if (x <= hyp) return 0.14;
		for (const nd of stemNodes) if (nd.s >= x) return nd.born;
		return t;
	};
	const stemGeo = tube(
		pts,
		(u, v, x) => stemR(x),
		(u, v, x) => {
			if (x <= hyp && t < 0.4) return mix(CT.hypocotyl.pink, CT.hypocotyl.green, smooth((days - 50) / 60) * smooth((x - 0.02) / 0.04));
			return woodColour(t - bornAt(x), v, x, ns);
		},
		fewer(collar > 0.008 ? 10 : 6, 4),
		true,
	);
	if (collar > 0.008 && DETAIL.level >= 0.5) metric(stemGeo, tipLen / 0.12, 1);
	bag.add(collar > 0.008 ? 'bark' : 'twig', stemGeo);
	const top = pts[pts.length - 1];
	const topDir = dir.clone();

	/* -- what the hypocotyl carries: the seed as a cap, then the seed leaves -- */
	const capOff = 68;
	if (days < capOff) {
		// the soldier: the parchment still on the head of the hypocotyl, its root end down into the hook
		const capAt = top.clone().addScaledVector(topDir, CT.seed.length * 0.42);
		parchmentSeed(bag, capAt, topDir, across(topDir), days < 47 ? 0.4 : 0.15, seed);
	} else if (days < 140) {
		// the cap fallen beside the seedling, lying on the ground
		const a = turn0 + 1.3;
		parchmentSeed(bag, v3(Math.cos(a) * 0.025, 0.002, Math.sin(a) * 0.025), v3(Math.cos(a + 0.6), 0, Math.sin(a + 0.6)), UP, 0.5, seed);
	}
	if (t < CT.cotyledon.falls && days > 58) {
		const cotTop = pointAt(pts, ls, hyp).at;
		cotyledons(bag, cotTop, turn0 + Math.PI / 2, span(days, 64, 80), span(days, 60, 100), smooth((t - (CT.cotyledon.falls - 0.08)) / 0.08), chance(seed, 'cotyledons'));
	}

	/* -- the stem's leaf pairs (decussate) and its branch pairs, node by node -- */
	const rLeaf = (n) => (n <= 1 ? 0.42 : n <= 3 ? 0.55 : Math.min(1, 0.55 + 0.075 * (n - 3)));
	const branches = [];
	for (const nd of stemNodes) {
		const rn = chance(seed, 'node', nd.n);
		const { at, dir: d } = pointAt(pts, ls, nd.s);
		const az = turn0 + (nd.n * Math.PI) / 2 + about(rn, 0, 0.08);
		const radius = stemR(nd.s);
		const life = between(rn, CT.leaf.life[0], CT.leaf.life[1]);
		for (const side of [0, 1]) {
			const a = az + side * Math.PI;
			const out = v3(Math.cos(a), 0, Math.sin(a));
			leaf(bag, { at: at.clone().addScaledVector(out, radius * 0.9), out, size: rLeaf(nd.n) * about(rn, 1, 0.06), age: t - nd.born, life, r: rn, rise: 0.55 });
			if (DETAIL.level >= 0.5) {
				const sa = a + Math.PI / 2;
				const so = v3(Math.cos(sa), 0, Math.sin(sa));
				stipule(bag, at.clone().addScaledVector(so, radius * 0.95), d, so, t - nd.born);
			}
			if (nd.n >= BUSH.firstBranch) branches.push({ n: nd.n, side, at: at.clone().addScaledVector(out, radius * 0.6), phi: a, born: nd.born + 0.1 });
		}
	}

	/* -- the branches: primaries, their secondaries, their leaves, buds, flowers and cherries -- */
	const topY = top.y;
	const stats = { leaves: 0, cherries: 0, flowers: 0, branches: 0 };
	const grow = (spec, key, depthOrder) => {
		const age = t - spec.born;
		if (age <= 0) return;
		// the crop it carries now, to sag it: its fruiting nodes' cherries, by their days
		const rb = chance(seed, 'b', ...key);
		const theta = spec.theta ?? lerp(0.9, 1.36, smooth(age / 2.6)) + about(rb, 0, 0.07); // young: rising ~35°; old: level
		let load = 0;
		const probe = plagiotrope(seed, key, spec.at, spec.born, t, { phi: spec.phi, theta, most: spec.most, vigour: spec.vigour });
		if (!probe) return;
		for (const nd of probe.nodes) {
			const tb = bloomOf(nd.born);
			const d = (t - tb) * 365;
			if (d > 30 && d < 290) load += 0.012 * smooth(d / 120);
		}
		const b = load > 0 ? plagiotrope(seed, key, spec.at, spec.born, t, { phi: spec.phi, theta, most: spec.most, vigour: spec.vigour, load: Math.min(1, load) }) : probe;
		stats.branches++;
		const nb = hashText(key.join('.')) % 1000;
		const wood = tube(b.pts, (u, v, x) => branchRadius(b, x), (u, v, x) => {
			const j = Math.floor(x / BUSH.branchInternode);
			const born = b.nodes[Math.min(b.nodes.length - 1, j)]?.born ?? t;
			return woodColour(Math.max(0, t - born) * 0.8, v, x, nb);
		}, fewer(b.age > 1 ? 5 : 4, 3), true);
		bag.add('twig', wood);
		for (const nd of b.nodes) {
			const rn = chance(seed, 'bn', ...key, nd.j);
			const nAge = t - nd.born;
			const sv = new THREE.Vector3().crossVectors(nd.dir, UP);
			if (sv.lengthSq() < 1e-6) sv.set(1, 0, 0);
			sv.normalize();
			const rr = branchRadius(b, nd.s);
			const life = between(rn, CT.leaf.life[0], CT.leaf.life[1]);
			// two leaves in one flat row each side, angled forward toward the tip
			for (const side of [1, -1]) {
				const out = sv.clone().multiplyScalar(side).multiplyScalar(0.8).addScaledVector(nd.dir, 0.6).normalize();
				if (nAge > 0 && nAge < life) stats.leaves++;
				leaf(bag, { at: nd.at.clone().addScaledVector(sv, side * rr), out, size: about(rn, 1, 0.08), age: nAge, life, r: rn, rise: 0.12, roll: -side * 0.15 });
			}
			if (DETAIL.level >= 0.5 && nAge < 0.25 && nAge > 0) stipule(bag, nd.at.clone().addScaledVector(UP, rr), nd.dir, UP, nAge);
			// a secondary from an inner node of a primary in its second year (1–3 a primary, S2, S4)
			if (depthOrder === 0 && nd.j >= 1 && nd.j <= 14 && rn() < 0.34) {
				const side = rn() < 0.5 ? 1 : -1;
				const bornS = nd.born + 0.55 + rn() * 0.4;
				const phiS = Math.atan2(nd.dir.z, nd.dir.x) + side * 0.75;
				grow({ at: nd.at.clone().addScaledVector(sv, side * rr), phi: phiS, born: bornS, theta: Math.acos(clamp(nd.dir.y, -1, 1)) - 0.08, most: 12, vigour: 0.8 }, [...key, 's', nd.j], 1);
			}
			// the node's one bloom, about a year old
			const tb = bloomOf(nd.born);
			flowersAt(bag, seed, [...key, nd.j], nd, sv, rr, (t - tb) * 365, rn, stats);
		}
		// the growing tip: a small green bud
		const tip = pointAt(b.pts, b.ls, b.tipS);
		bag.add('body', bead(tip.at, v3(0.0014, 0.0014, 0.0014), CT.leaf.young, 4));
	};
	for (const br of branches) grow({ at: br.at, phi: br.phi, born: br.born }, ['p', br.n, br.side], 0);
	// the stem's growing tip
	bag.add('body', bead(top, v3(0.0015, 0.0022, 0.0015), CT.leaf.young, 4));
	const g = bag.build();
	g.userData.stats = { ...stats, height: topY, nodes: N };
	return g;
}

/**
 * A node's one bloom, `d` days from the main bloom (each node opening on one of two or three flowerings a few weeks
 * apart): its dormant green buds through the dry season, the white candles swelling in the last ten days, the open
 * white stars for two or three days, then the set: about 85 % at a month, 37 % at a hundred days, 28 % ripe (S8),
 * the cherries clustered round the node in one or two rings, ripening each a few days apart.
 */
function flowersAt(bag, seed, key, nd, sv, rr, d0, rn, stats) {
	if (d0 < -140 || d0 > 300) return;
	const fr = chance(seed, 'flowers', ...key);
	// not every year-old node blooms: the shaded and the overloaded rest (~100 ripe cherries a fruiting branch, S8)
	if (fr() > CT.flower.blooms) return;
	const off = [0, 0, 0, 0, 13, 13, 26][Math.floor(fr() * 7)]; // which flowering this node opens with
	const d = d0 - off;
	const n = Math.round(between(fr, CT.flower.perNode[0], CT.flower.perNode[1]));
	const upv = UP.clone().addScaledVector(nd.dir, -UP.dot(nd.dir)).normalize();
	if (d < 0) {
		// buds in both axils: 3–5 serial buds each, green through the dry season, then the candles
		const candle = smooth((d + 12) / 12);
		const swell = smooth((d + 140) / 120);
		for (const side of [1, -1]) {
			const m = Math.ceil(n / 2);
			for (let k = 0; k < (candle > 0 ? m : 2); k++) {
				const a = (k / m - 0.5) * 1.6;
				const out = sv.clone().multiplyScalar(side * Math.cos(a)).addScaledVector(upv, 0.6 + Math.sin(a) * 0.6).addScaledVector(nd.dir, 0.3).normalize();
				bud(bag, nd.at.clone().addScaledVector(out, rr * 0.9).addScaledVector(nd.dir, (k % 2) * 0.002), out, swell, candle * about(fr, 1, 0.1));
			}
		}
		return;
	}
	const keptNow = kept(d) * between(fr, 0.45, 1.6); // the best nodes keep ten, the poorest one or none (S8)
	let i = 0;
	const rings = n > 7 ? 2 : 1;
	for (let k = 0; k < n; k++) {
		const kr = chance(seed, 'fl', ...key, k);
		const survives = kr() < keptNow; // the drop: each flower's own chance against the share still on
		const a = (k / n) * Math.PI * 2 * rings + kr() * 0.4 + (k % 2) * 0.3;
		const radial = upv.clone().multiplyScalar(Math.cos(a)).addScaledVector(sv, Math.sin(a));
		const along = rings === 2 ? (k % 2 ? 0.0055 : -0.0055) : 0;
		if (d < 8) {
			if (!survives && d > 4) continue;
			stats.flowers++;
			const open = smooth(d / 0.6);
			const fall = smooth((d - 3) / 4);
			const fd = radial.clone().multiplyScalar(0.85).addScaledVector(nd.dir, 0.35).add(v3(0, 0.25, 0)).normalize();
			flower(bag, nd.at.clone().addScaledVector(radial, rr).addScaledVector(nd.dir, along), fd, open, fall, kr, kr() * 6.28);
			if (fall < 0.2) continue;
		}
		if (!survives || d < 4) continue;
		const late = about(kr, 0, 10) + (i++ % 3) * 2;
		if (d - late > 285) continue; // picked
		stats.cherries++;
		const cd = radial.clone().multiplyScalar(0.92).addScaledVector(nd.dir, 0.25).add(v3(0, -0.12, 0)).normalize();
		const at = nd.at.clone().addScaledVector(radial, rr * 0.9).addScaledVector(nd.dir, along);
		const fk = [...key, k].join('|');
		if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit([...key, k], at, cd);
		if (bag.drawing) bag.drawing.days = d - late;
		cherry(bag, at, cd, d, late, kr, fk);
		bag.fruitDone();
	}
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Twelve stages, from the seed in its parchment to the ripe crop; `t` the years from sowing each is grown at (between
 * two stages, on the way). The last five are one crop of the bush in its fourth year: the main bloom after the dry
 * season, ripe about 235 days after.
 */
const B = 3.52; // the bloom of the crop shown
const STAGES = [
	{ name: 'Seed', t: 0.0, note: 'The seed in its parchment, 10.5 × 7.8 mm, straw-beige, flat on one face with a furrow down it, sown under 1–2 cm of sand in the shade.' },
	{ name: 'Root', t: 21 / 365, note: 'Three weeks: the first root out of one end of the parchment, hooking down into the sand.' },
	{ name: 'Soldier', t: 50 / 365, note: 'About 50 days: the pinkish-white hypocotyl, 2 mm thick, straightens out of the sand and holds the parchment up on its head 5 cm high, like a matchstick (the soldier, fósforo).' },
	{ name: 'Butterfly', t: 78 / 365, note: 'About 11 weeks: the parchment has fallen and the two seed leaves open flat like a butterfly (chapola), each wider than long, 2.5 × 3.8 cm, glossy green; the first true pair parting between them.' },
	{ name: 'Nursery plant', t: 0.62, note: 'Seven and a half months: 25 cm, seven pairs of leaves crossing each other, the newest light green (Caturra\'s green tips), no branches yet; set out in the field.' },
	{ name: 'Young plant', t: 1.2, note: 'A year and two months: 0.5 m, the first pairs of side branches standing out level in four directions, tier on tier, their leaves in two flat rows.' },
	{ name: 'First flowering', t: 1.52 + 2 / 365, note: 'About a year and a half, 330 days after planting: 0.7 m, the first white flowers in clusters at the year-old nodes of its lowest branches.' },
	{ name: 'Flowering', t: B + 2 / 365, note: 'The fourth year, after the dry season\'s first rain: the bush 1.6 m, a dense green column; white star flowers crowd every year-old node of its branches, scented like jasmine, open for two or three days; on some nodes the white candles still to open.' },
	{ name: 'Fruit set', t: B + 45 / 365, note: 'Six weeks on: the petals fallen, green pinhead cherries of 4–5 mm packed round the nodes, ten or so to each; many will drop.' },
	{ name: 'Green cherries', t: B + 150 / 365, note: 'Five months: hard glossy green cherries 13–14 mm, three or four to a node on average, the beans filling inside.' },
	{ name: 'Turning', t: B + 212 / 365, note: 'Seven months: yellow-green cherries turning yellow-orange and red, node by node and cherry by cherry.' },
	{ name: 'Ripe', t: B + 235 / 365, note: 'About 235 days after the bloom: glossy red cherries 15 × 11 mm, about 1.6 g, two beans in each, in tight clusters along the branches, some still orange or green, a few already dark: picked by hand, the ripe ones only, over several passes.' },
];

/** the years from sowing at a stage (0 … 11, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => coffeeBush(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one cherry on its own ---- */

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

/** the cherries the bush bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f), days: f.days ?? 0 }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	// a red ripe one (228–250 days), of the well-grown
	const red = sized.filter((f) => f.days >= 228 && f.days <= 250);
	const pool = red.length ? red : sized;
	const most = Math.max(...pool.map((f) => f.size));
	const good = pool.filter((f) => f.size >= most * 0.92);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one cherry at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This cherry has not set yet.');
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
	id: 'coffee',
	label: "Coffee 'Caturra' · Coffea arabica",
	latin: "Coffea arabica L. 'Caturra' · syn. Caturra Rojo, Caturra Vermelho, café Nanico · arabica coffee, Kaffee",
	note: "Caturra, the dwarf mutation of red Bourbon from Brazil: one gene shortens every internode, so the bush is a dense green column 1.7 m tall and 1.55 m across at three to four years (2 m at eleven), leafy to the ground, a pair of level branches at every node of its stem, each pair crossing the last. Glossy, very dark green leaves 13 × 5.5 cm with wavy margins, light green at the tips; white jasmine-scented star flowers in clusters at the year-old nodes after the first rain; cherries 15 × 11 mm in tight clusters round the nodes, green for half a year, then yellow-orange and glossy red, about 235 days after the bloom. Grown sun-dense (5,000–10,000 a hectare), so it fits a dome.",
	from: 'Bush · 4 years from the seed',
	layer: 'shrub',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'f53904fab8cfa239eca7939c582fda27aef2234bdf96547433a334b3297b23d4', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from sowing
	// what a world needs to plant it right; plant-skill's data sheet for the coffee, S1–S34
	facts: {
		height: { at0_6: [0.2, 0.3], at1_5: [0.7, 0.9], at3_5: [1.6, 1.8], at11: 2.0, grown: [2, 2.5], unit: 'm' },
		trunk: { at0_6: [0.004, 0.005], at3_6: [0.049, 0.055], at10: [0.07, 0.09], unit: 'm (at the collar)' },
		crown: { at3_5: [1.5, 1.6], grown: [1.6, 2.0], unit: 'm' },
		internode: { stem: 0.0395, branch: [0.025, 0.04], unit: 'm' },
		spacing: { dense: [[1.0, 1.0]], usual: [[1.0, 1.5], [2.0, 2.0]], plantsPerHectare: [5000, 10000], unit: 'm' },
		shade: 'full sun when dense and well fed; tolerates light shade (fewer flowers)',
		climate: 'tropical highlands, 18–22 °C best (growth stops below ~10 and above ~32 °C), 1,500–2,500 mm rain with a short dry season to set the bloom; frost kills it',
		years: { firstFlowers: 1.5, firstCrop: [2.2, 3], fullBearing: [4, 5], productiveLife: [6, 8], renewal: 'stumped at 30 cm after 6–8 years, a new bush in ~2 years' },
		leaf: { length: [0.105, 0.163], width: [0.047, 0.071], petiole: 0.0103, life: [0.75, 1], flush: 'light green', unit: 'm, years' },
		flower: { diameter: [0.018, 0.02], perNode: [8, 16], opensAfterRain: [10, 15], lasts: [2, 3], selfFertile: true, unit: 'm, days' },
		fruit: { length: 0.01524, width: 0.01132, mass: [0.0013, 0.0019], daysFromBloom: [215, 250], seeds: 2, set: 0.28, perBranch: 100, unit: 'm, kg, days' },
		seed: { bean: [0.0084, 0.0063, 0.0035], parchment: [0.0105, 0.0078, 0.0048], mass: 0.00017, emergence: [40, 70], butterfly: [63, 80], germination: 'epigeal', unit: 'm, kg, days' },
		yield: { cherryPerPlant: [6.5, 10], parchmentPerHectare: [3750, 4350], unit: 'kg a year' },
		altitude: 'by latitude: ~1,000–2,000 m near the equator, lower toward the tropics\' edges (WCR)',
		diseases: 'coffee leaf rust (susceptible), coffee berry disease, berry borer',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one cherry) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'coffee' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'coffee',
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
module.exports.organs = { CT, LEAF_W: CT.LEAF_W, CHERRY_W: CT.CHERRY_W, parchmentGeometry, parchmentSeed, cotyledons, leaf, flower, bud, cherry, cherryGeometry, cherryColour, cherrySize, Bag, timeAt, coffeeBush, BUSH, nodesAt, surface, lite, detailAt, STAGES, aimFace, v3 };
