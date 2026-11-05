'use strict';
/*
 * SOURSOP 'MORADA' — Annona muricata L. 'Morada' (Annonaceae): the acid, large-fruited type brought to Brazil from
 * Colombia in 1980–81 and named there, its fruit the broadest of the soursops measured (24.7 × 15.8 cm, 3.2 kg, 259
 * seeds). Version 3 of plants/soursop: one named type, grown from the seed of its rootstock, top-cleft grafted in its
 * first year, planted out, topped and trained, and followed through one season of its fifth year planted from the
 * flowers on its bark to mature fruit.
 *
 * Its numbers are the Morada's where they are measured (Sacramento et al. 2003, Bahia: fruit 24.7 × 15.8 cm, 3.21 kg,
 * cordiform; Silva & Souza 1999, Manaus: 259 seeds, 16 °Brix, 18 fruit a tree in the third year; Embrapa Meio-Norte,
 * Piauí: 2.17 m and 4.4 cm at nine months, 4.68 m and 17.2 cm at 44 months; the ICUC monograph, Pinto et al. 2005)
 * and the species' otherwise (Troll's model and steady growth, PROSEA; leaves, flowers and seeds, the Flora of China
 * and Morton; training, Torres & Sánchez 1992 and Embrapa). Every number with its source: plant-skill's data sheet for
 * it (soursop-morada.md, S1–S30).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its front flower and old bark redrawn, kept on play by its hash (63056d78…): its leaf and fruit outlines
 * and its colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots, sound()),
 *                   as banana v2 carries it (with lemon v2's mipmapped pictures), with the soursop's materials and
 *                   surfaces: a leaf's fine veins, the trunk's smooth fissured bark, the fruit's areoles.
 *   2. ORGANS       the soursop's own, each to its measure: the seed, the leaf and seed leaf, the thick-petalled
 *                   flower and its cushion, the spiny fruit and its stalk.
 *   3. THE TREE     its axes shoot by shoot (Troll's model), its graft, topping and scaffolds, girth by the pipe
 *                   model, its roots, and its season on the bark.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in years from sowing the rootstock's seed.
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: a leaf's pinnate veins, the
 * fine fissures, lenticels and lichen of the trunk's smooth grey-brown bark, the pale lenticels of young wood, the
 * fruit's net of areoles. Colour pictures multiply the vertex colours, so a picture that lightens (a vein, a dot) is
 * darker everywhere else: its organ's vertex colour is raised by `LIFT[name]` where the picture is laid on, and is as
 * measured where it is not. Colour pictures only: a bump picture on a dense tree of small triangles makes a NaN pixel
 * somewhere (plum v2), so the relief that matters (the fruit's spines, the bark's flare) is geometry. Only at detail
 * 0.5 and over: a crowd far off draws plain colours.
 */
const SURFACES = {};
const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** how much an organ's vertex colour is raised under its picture, which is this much darker than white on average */
const LIFT = { leafMap: 1 / 0.88, twigMap: 1 / 0.86, skinMap: 1 / 0.86, barkMap: 1 / 0.84 };
/** the lift of a picture at the present detail (1 when no pictures are drawn) */
const lifted = (name) => (DETAIL.level >= 0.5 ? LIFT[name] : 1);

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
 * The leaf's veins, in the blade's own coordinates (x 0 … 1 from its base to its tip, y 0 … 1 across, the midrib at
 * 0.5): nine pairs of fine laterals (the floras' 6–13; the sheet's leaf about 9) leaving the midrib at about 55°,
 * curving forward and looping into one another near the margin, a little offset side to side, a faint net between.
 * 0 the blade, 1 on a vein.
 */
function leafVeins(x, y) {
	const a = Math.abs(y - 0.5) * 2;
	const side = y > 0.5 ? 0.03 : 0;
	const pairs = 9;
	const u0 = x - 0.12 * a - 0.14 * Math.pow(a, 2.2) - side;
	const k = (u0 - 0.06) * pairs;
	const near = Math.abs(k - Math.round(k)) / pairs;
	const on = u0 > 0.03 && u0 < 0.9 && a < 0.9 ? Math.exp(-Math.pow(near / (0.0036 * (1 - 0.5 * a)), 2)) * (1 - smooth((a - 0.7) / 0.2)) : 0;
	const net = Math.pow(1 - Math.abs(tileNoise(x, y, 16, 61, 2, 6) - 0.5) * 2, 6) * 0.14;
	const mid = Math.exp(-Math.pow(a / 0.022, 2));
	return Math.max(on * 0.8, mid, net * (1 - mid));
}

/**
 * The surfaces, made the first time they are asked for:
 *   leafMap   the veins over a whole blade (above): pale, the midrib palest (the sheet's leaves)
 *   barkMap   0.15 m of old trunk bark: smooth dull grey-brown, fine shallow darker fissures along the trunk, small
 *             pale raised lenticel dots, a few round pale grey-green lichen spots (the sheet's old swatch, redrawn)
 *   twigMap   0.06 m of one- and two-year wood: its small pale raised lenticels, a few a cm² (the sheet's swatch)
 *   skinMap   one fruit's skin, wrapped once round it and once along it (u along, v round): the faint net of
 *             polygonal areoles, one a carpel, about 13 mm across on the grown fruit, each a little paler at its
 *             middle where its spine stands; laid on by the fruit's own UVs (a carpel is a carpel at every size)
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(512, 256, (x, y) => {
				const v = leafVeins(x, y);
				const k = 0.86 + 0.14 * v + 0.04 * (tileNoise(x, y, 18, 63) - 0.5);
				return [k, k * (1 + 0.05 * v), k * (1 - 0.08 * v)];
			}, true),
		barkMap: () =>
			picture(512, 512, (x, y) => {
				// x along the trunk, y round it
				const warp = tileNoise(x, y, 4, 71, 2) - 0.5;
				const fis = Math.pow(1 - Math.abs(tileNoise(x * 0.25 + warp * 0.05, y, 2, 72, 3, 26) - 0.5) * 2, 10);
				const grain = tileNoise(x, y, 6, 75, 3, 24);
				const c = tileCells(x, y, 10, 22, 73);
				const dot = c.id < 0.35 ? smooth((0.16 - c.f1) * 14) : 0; // lenticels, stretched round the trunk
				const l = tileCells(x, y, 3, 5, 77);
				const lich = l.id < 0.3 ? smooth((0.24 + 0.12 * l.id - l.f1) * 16) : 0;
				let k = 0.82 + 0.12 * (grain - 0.5) - 0.42 * fis;
				const out = [k, k * 0.985, k * 0.97];
				for (let i = 0; i < 3; i++) out[i] = lerp(out[i], [1.04, 1.0, 0.9][i], dot * 0.6);
				return [lerp(out[0], 1.1, lich * 0.5), lerp(out[1], 1.18, lich * 0.5), lerp(out[2], 1.05, lich * 0.5)];
			}, true),
		twigMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 9, 14, 81);
				const dot = c.id < 0.55 ? smooth((0.17 - c.f1) * 18) : 0;
				const k = 0.84 + 0.04 * (tileNoise(x, y, 8, 83, 2, 24) - 0.5);
				return [lerp(k, 1.08, dot), lerp(k, 1.0, dot), lerp(k, 0.84, dot)];
			}, true),
		skinMap: () =>
			picture(1024, 512, (x, y) => {
				// the areoles: as many round the fruit (y) as along it (x) over its own length and girth (about 19 × 38)
				const c = tileCells(x, y, 19, 38, 91);
				// faint: the sheet's skin shows a soft mottle of the swollen carpels more than a net
				const edge = 1 - smooth((c.f2 - c.f1) / 0.1);
				const mid = smooth((0.35 - c.f1) / 0.35);
				const k = 0.86 + 0.04 * (c.id - 0.5) + 0.04 * mid - 0.06 * edge + 0.04 * (tileNoise(x, y, 6, 93, 2) - 0.5);
				return [k, k * (1 + 0.01 * mid), k * (1 - 0.03 * edge)];
			}, true),
	}[name];
	return (SURFACES[name] = make());
}

/**
 * The materials, made once, plain and with their surfaces (only plain settings: the asset box sends a material out by
 * its kind and settings, so no shader code). `leaf` a leaf's two faces, each its own colour (one-sided): leathery and
 * very glossy above, no clearcoat (a crown of glossy leaves seen edge-on goes white with one), veined; `bark` the trunk
 * and limbs: matt, smooth, fissured finely; `twig` young wood: a faint shine, lenticels; `skin` the fruit: leathery,
 * a satin gloss young, dull ripe (its gloss in its vertex colour's own lightness), its areoles; `petal` the flower's
 * thick fleshy petals, seen from both sides; `sheet` thin things seen from both sides (the seed leaves, sepals);
 * `body` the seed, the roots, the stalks, the spines and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, specularIntensity: 0.4, ...(s && { map: s('leafMap') }) }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...(s && { map: s('barkMap') }) }),
	twig: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, ...(s && { map: s('twigMap') }) }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, specularIntensity: 0.45, ...(s && { map: s('skinMap') }) }),
	petal: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	seed: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'twig', 'leaf', 'sheet', 'petal', 'skin', 'seed', 'prop'];
// a soursop has thousands of leaves: a crowd far off draws a part of them, each grown bigger to fill the gap
const THINNED = { leaf: true, sheet: true };

/** a shape's UVs set in metres over a surface's tile: `fu` and `fv` the tile's repeats along u and v of it */
function metric(geo, fu, fv) {
	const uv = geo.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fu, uv.getY(i) * fv);
	uv.needsUpdate = true;
	return geo;
}

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
 * 2. ORGANS — the Morada's own, each to its measure
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
 * The Morada in numbers: sizes in metres from the data sheet (soursop-morada.md, S1–S30), outlines and colours traced
 * off the reference sheet (63056d78…, Nano Banana Pro, 2026-11-05: sheet 2 with its front flower and old bark
 * redrawn) in linear sRGB, its median as the colour and p10–p90 as each organ's own variation. The sheet's scale bars
 * are not used: every size is the data sheet's.
 */
const MO = {
	seed: {
		length: 0.018, // 17.7 × 10.8 × 5.5 mm, 0.45 g (S18; 'Morada' 0.46 g, S2)
		width: 0.011,
		thick: 0.0055,
		depth: 0.02, // sown ~2 cm deep (S4, S11)
		black: lin(0.02, 0.016, 0.016), // the sheet's seeds: glossy black, a faint violet-brown
		brown: lin(0.1, 0.055, 0.03), // drying dark brown
		perFruit: 259, // 'Morada' 259 ± 33 (S2)
	},
	cotyledon: { length: 0.022, width: 0.01, colour: lin(0.3, 0.42, 0.12), fall: [60, 80] }, // [EST] ~2 × 1 cm, shed by ~2 months
	hypocotyl: { length: 0.055, colour: lin(0.46, 0.5, 0.22) }, // [EST] 4–6 cm; the sheet's seedling stem, pale green
	leaf: {
		length: 0.12, // blade 12 × 5 cm typical, 8–16 on a shoot (S12, S14)
		aspect: 2.3, // the sheet's leaf 2.30 : 1 (the data sheet's 12 : 5 is 2.4)
		petiole: 0.006, // 3–7 mm (S12)
		up: lin(0.045, 0.078, 0.02), // 'mature leaf (upper side)': very glossy dark green
		upLo: lin(0.028, 0.055, 0.011),
		upHi: lin(0.085, 0.125, 0.045),
		under: lin(0.32, 0.35, 0.12), // 'underside': dull yellow-green (the sheet 0.37, 0.36, 0.12; the floras' #8fa66a)
		young: lin(0.44, 0.47, 0.09), // 'young leaf': soft, pale yellow-green (the sheet's a little yellower)
		youngUnder: lin(0.5, 0.52, 0.18),
		old: lin(0.45, 0.44, 0.1), // pale yellowish green before it falls (S9)
		stalk: lin(0.2, 0.24, 0.06),
		life: [0.9, 1.4], // years: ~12 months [EST from S9's yearly leaf change]
		expand: 0.05, // a leaf grows to size in ~3 weeks
		green: 0.09, // and darkens in ~4–5 weeks
	},
	// the blade's outline off 'mature leaf (upper side)' (blade only, base → tip, its width at 23 stations): obovate,
	// broadest at 0.58 of its length, the base wedge-shaped, the tip short-pointed
	LEAF_W: rel([7, 18.5, 27.1, 34.1, 39.1, 42.9, 45.3, 47.2, 48.4, 49.5, 50.9, 52.8, 54.4, 54.9, 53.8, 52.0, 49.7, 46.5, 41.5, 35.5, 26.2, 10.9, 0.5]),
	flower: {
		outer: 0.037, // outer petals 2.5–5 × 2–4 cm, ~3 mm thick (S14): 3.7 × 3.2 cm, broad as the sheet's
		outerWidth: 0.032,
		inner: 0.027, // inner petals 2–4 × 1.5–3.5 cm (S14): 2.7 × 2.6 cm, closed into the sheet's dome
		innerWidth: 0.026,
		thick: 0.0028,
		pedicel: 0.018, // 1.5–2 cm, stout, woody (S14b)
		outside: lin(0.46, 0.5, 0.1), // outer petal outside: yellow-green ('green, later yellowish', S14)
		inside: lin(0.66, 0.5, 0.09), // inside, the sheet's front flower: warm yellow
		base: lin(0.2, 0.3, 0.05), // the petals' green base
		innerPetal: lin(0.72, 0.56, 0.13), // the sheet's inner dome: pale yellow
		bud: lin(0.28, 0.32, 0.06), // the sheet's bud: green, light green near opening (S29)
		sepal: lin(0.16, 0.22, 0.04),
		stalk: lin(0.16, 0.13, 0.03), // the sheet's flower stalk: olive-brown, woody
		cushion: lin(0.18, 0.13, 0.07), // the flower cushions on the bark
		fallen: lin(0.3, 0.22, 0.07),
		budDays: 55, // from a 1 cm bud to opening: 42–70 d (S20)
		openDays: 4, // open over ~4 days, petals falling after the pollen is shed (S1, S12)
	},
	fruit: {
		length: 0.247, // 'Morada' 24.7 × 15.8 cm, L/D 1.56, 3.21 kg (S3)
		aspect: 1.56,
		youngAspect: 1.3,
		days: 150, // anthesis to mature: 5–6 months (S1, S4, S5), 'Elita' 16 weeks from set (S19)
		spines: 600, // one a carpel: ~3–4 per 2.5 × 2.5 cm at harvest (S22), ~550–700 on a 3.2 kg fruit [EST]
		spine: 0.006, // 3–8 mm (Torres & Sánchez in S3)
		young: lin(0.11, 0.16, 0.025), // 'fruit development', 30 days: dark glossy green
		mid: lin(0.14, 0.19, 0.05), // 90 days
		ripe: lin(0.425, 0.387, 0.078), // mature, light dull yellowish green: the sheet's mature fruit (its middle 0.415, 0.378, 0.078 under the areole map; 'amarelada', S4, S5)
		tip: lin(0.12, 0.07, 0.025), // the spines' tips browning when mature (the sheet's mature fruit)
		stalk: lin(0.18, 0.14, 0.06),
		stalkLength: 0.03, // 2–4 cm, 1.5–2.5 cm thick for a 3 kg fruit [EST]
		stalkRadius: 0.009,
		flesh: lin(0.8, 0.72, 0.62),
	},
	// the fruit's profile off the sheet's mature fruit (body only, 21 stations): its width from the blossom end to the
	// stalk, widest at 0.6 (its upper part), the shoulders rounding fast into the stalk: a broad heart
	FRUIT_W: rel([0, 60, 92, 110, 120, 128, 135, 141, 147, 152, 157, 162, 165, 165, 163, 158, 149, 134, 112, 76, 0]),
	bark: {
		hairy: lin(0.23, 0.09, 0.031), // 'young shoot': rusty-hairy
		shoot: lin(0.2, 0.2, 0.06), // the green under the hairs
		young: lin(0.181, 0.125, 0.089), // 'two-year wood': brown-grey, pale lenticels
		old: lin(0.2, 0.16, 0.13), // 'old trunk': dull grey-brown, smooth (its median 0.188, 0.15, 0.122, a little raised for the map)
		root: lin(0.32, 0.22, 0.13),
	},
	root: { young: lin(0.72, 0.6, 0.4), old: lin(0.3, 0.2, 0.11) }, // the sheet's seedling roots: tan
};

/* ---- the seed ---- */

/**
 * One seed: a flattened kidney, 18 × 11 × 5.5 mm, glossy black, at `at`, its length along `dir`, its flat sides facing
 * `face`. `brown` 0 … 1 how far it has dried (a coat dropped from the seedling, lying on the soil).
 */
function seedBean(bag, at, dir, face, k = 1, brown = 0, kind = 'seed') {
	const S = MO.seed;
	const L = S.length * k, W = S.width * k, T = S.thick * k;
	const along = fewer(14, 6), round = fewer(14, 6);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const c = mix(S.black, S.brown, brown);
	for (let i = 0; i <= along; i++) {
		const u = i / along;
		const x = (u - 0.5) * L;
		const w = Math.pow(Math.sin(Math.PI * clamp(u, 0.001, 0.999)), 0.55);
		for (let j = 0; j <= round; j++) {
			const a = (j / round) * Math.PI * 2;
			// the kidney: the hilum side drawn in a little at the middle
			const notch = Math.sin(a) > 0 ? 1 - 0.18 * Math.sin(a) * Math.pow(Math.sin(Math.PI * u), 3) : 1;
			const y = Math.sin(a) * (W / 2) * w * notch + 0.06 * W * Math.sin(Math.PI * u);
			const z = Math.cos(a) * (T / 2) * w;
			pos.push(x, y, z);
			nor.push(0, Math.sin(a), Math.cos(a) * 2);
			uv.push(u, j / round);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < along; i++)
		for (let j = 0; j < round; j++) {
			const a = i * (round + 1) + j, b = a + round + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const g = smoothNormals(made(pos, nor, uv, col, idx, false));
	const x = dir.clone().normalize();
	const z = face.clone().addScaledVector(x, -face.dot(x)).normalize();
	const y = new THREE.Vector3().crossVectors(z, x);
	bag.add(kind, g, new THREE.Matrix4().makeBasis(x, y, z).setPosition(at));
}

/* ---- the leaf ---- */

const leafHalf = (u) => station(MO.LEAF_W, u);

/**
 * One leaf at a node: its short petiole (6 mm) from the shoot at `at`, out along `out`, then the blade held out
 * nearly level, its face up (on a level branch the leaves of both rows lie in one plane, a flat spray), folded a
 * little along its midrib, its tip bent down. `size` its blade's length as a part of the grown leaf's, `age` years
 * since its node formed, `life` years it lives: young soft, pale yellow-green and hanging, firm and dark glossy green in
 * about five weeks, pale yellowish before it falls. `cot` a seed leaf: oblong, thin, pale green.
 */
function leaf(bag, o) {
	const F = MO.leaf;
	const { at, out, size, age, life, r } = o;
	if (age <= 0 || age >= life) return;
	const expand = smooth(age / F.expand);
	const greening = smooth(age / F.green);
	const yellow = smooth((age - (life - 0.08)) / 0.08);
	const L = (o.cot ? MO.cotyledon.length : F.length) * size * lerp(0.3, 1, expand);
	const W = o.cot ? MO.cotyledon.width / 2 : L / F.aspect / 2;
	const P = o.cot ? 0.002 : F.petiole * size;
	const flat = out.clone();
	const h = flat.clone().setY(0);
	if (h.lengthSq() < 1e-6) h.set(1, 0, 0);
	h.normalize();
	// the petiole: short, out and a little up
	const lift0 = o.rise ?? 0.35;
	const pDir = h.clone().multiplyScalar(Math.cos(lift0)).addScaledVector(UP, Math.sin(lift0)).normalize();
	const end = at.clone().addScaledVector(pDir, P);
	const k = r();
	const colour = (u, v, back) => {
		if (o.cot) return mix(MO.cotyledon.colour, F.old, yellow).multiplyScalar(lifted('leafMap'));
		const green = back ? F.under : mix(F.upLo, F.upHi, 0.3 + k * 0.5);
		const young = back ? F.youngUnder : F.young;
		const c = mix(young, green, greening).lerp(F.old, yellow);
		return c.multiplyScalar(lifted('leafMap'));
	};
	// the blade: nearly level when grown (the flat spray); young it hangs limp
	const droop = (o.droop ?? 0.08) + lerp(0.9, 0, greening) + about(r, 0, 0.12) + 0.3 * yellow;
	const bDir = h.clone().multiplyScalar(Math.cos(-droop)).addScaledVector(UP, Math.sin(-droop)).normalize();
	const wave = r() * 6.283;
	const g = sheet({
		length: L,
		width: W,
		shape: o.cot ? (u) => Math.pow(Math.sin(Math.PI * Math.min(0.98, 0.04 + u * 0.96)), 0.5) : leafHalf,
		lift: o.flat ? () => 0 : (u, v) => 0.045 * Math.abs(v) * (1 - 0.5 * u) - 0.06 * u * u * lerp(1.8, 1, greening) + 0.006 * Math.sin(u * 13 + wave) * v * v,
		paint: (u, v) => colour(u, v, false),
		back: (u, v) => colour(u, v, true),
		along: o.cot ? 4 : 6,
		across: 2,
	});
	// a leathery leaf lets little light through: its underside lit as itself, facing down (avocado v3's lesson)
	const nor = g.attributes.normal, half = nor.count / 2;
	for (let i = 0; i < half; i++) nor.setXYZ(half + i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
	g.applyMatrix4(aim(end, bDir, o.flat ? 0 : about(r, 0, 0.2) + (o.roll ?? 0)));
	if (DETAIL.level < 0.5 || P < 0.003) {
		bag.add('leaf', g);
		return;
	}
	const petiole = tube([at.clone(), end], () => 0.0012 * size, () => mix(F.young, F.stalk, greening), 3, false);
	const both = mergeGeometries([petiole, g]);
	petiole.dispose();
	g.dispose();
	if (both) bag.add('leaf', both);
}

/* ---- the flower ---- */

/**
 * A thick, fleshy petal (a slab): its outside face `paint`, its inside `inner`, `thick` metres between them and a rim
 * joining them round its outline; built along +X from its base, its outside facing +Y. `shape(u)` its half width,
 * `lift(u, v)` its curve (in parts of its length).
 */
function slab({ length, width, thick, shape, lift, paint, inner, along = 8, across = 4 }) {
	along = fewer(along, 3);
	across = fewer(across, 2);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const at = (u, v, f) => {
		const w = shape(u) * width;
		const t = thick * Math.pow(Math.max(0, 1 - Math.abs(v)), 0.3) * (1 - 0.6 * u);
		return [u * length, lift(u, v) * length - f * t, v * w];
	};
	for (let f = 0; f < 2; f++) {
		const base = pos.length / 3;
		for (let i = 0; i <= along; i++) {
			const u = i / along;
			for (let j = 0; j <= across; j++) {
				const v = (j / across) * 2 - 1;
				pos.push(...at(u, v, f));
				nor.push(0, f ? -1 : 1, 0);
				uv.push(u, (v + 1) / 2);
				const c = toColor((f ? inner : paint)(u, v));
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
	// the rim: both long edges and the tip, the outside's edge to the inside's
	const n = (along + 1) * (across + 1);
	const edge = [];
	for (let i = 0; i <= along; i++) edge.push(i * (across + 1));
	for (let j = 1; j <= across; j++) edge.push(along * (across + 1) + j);
	for (let i = along - 1; i >= 0; i--) edge.push(i * (across + 1) + across);
	for (let e = 0; e + 1 < edge.length; e++) {
		const a = edge[e], b = edge[e + 1];
		idx.push(a, a + n, b, b, a + n, b + n);
	}
	return made(pos, nor, uv, col, idx, true);
}

/**
 * One flower, as it hangs from the bark (the sheet's bud, front, side and cut): a stout woody stalk, three tiny green
 * sepals, three thick fleshy valvate outer petals (4 × 3 cm, 3 mm thick, broad at the base and pointed), yellow-green
 * outside and warm yellow inside, and between them three smaller pale-yellow inner petals that stay closed into a
 * dome over the stamens and carpels. `open` 0 a bud (the outer petals closed into a plump three-sided cone, green), 1
 * open (spread), `fade` 0 … 1 the spent flower browning; `size` its own size; from `at` along `dir`.
 */
function flower(bag, at, dir, o) {
	const Fl = MO.flower;
	const { open = 1, fade = 0, size = 1, r = chance('flower') } = o;
	const ax = dir.clone().normalize();
	const side0 = across(ax).applyAxisAngle(ax, o.turn ?? r() * 6.283);
	const grown = o.grown ?? 1; // a bud's size as it swells (0.3 … 1)
	const k = size * lerp(0.3, 1, grown);
	// the stalk, short and stout, from the cushion
	const st = at.clone().addScaledVector(ax, Fl.pedicel * lerp(0.5, 1, grown));
	bag.add('twig', tube([at.clone(), at.clone().lerp(st, 0.5), st], (u) => lerp(0.0028, 0.0034, u) * Math.sqrt(k), () => mix(Fl.stalk, Fl.fallen, fade), 5, false));
	if (o.stalkOnly) return st;
	// the receptacle
	bag.add('body', bead(st.clone().addScaledVector(ax, 0.003 * k), v3(0.0055 * k, 0.004 * k, 0.0055 * k), mix(Fl.base, Fl.fallen, fade), 5, new THREE.Quaternion().setFromUnitVectors(UP, ax)));
	const colourOut = (u) => mix(mix(Fl.bud, mix(Fl.base, Fl.outside, smooth(u / 0.35)), smooth(open * 1.3)), Fl.fallen, fade);
	const colourIn = (u) => mix(mix(Fl.bud, mix(Fl.base, Fl.inside, smooth(u / 0.25)), smooth(open * 1.3)), Fl.fallen, fade);
	const hinge = st.clone().addScaledVector(ax, 0.004 * k);
	for (let p = 0; p < 3; p++) {
		const side = side0.clone().applyAxisAngle(ax, (p / 3) * Math.PI * 2);
		// the sepals: tiny triangles at the foot, turned back
		const sd = ax.clone().multiplyScalar(Math.cos(2.2)).addScaledVector(side, Math.sin(2.2)).normalize();
		bag.add('sheet', sheet({ length: 0.0042 * k, width: 0.003 * k, shape: (u) => 1 - u, paint: () => mix(Fl.sepal, Fl.fallen, fade), along: 1, across: 1 }), aimFace(st.clone().addScaledVector(side, 0.004 * k), sd, ax.clone().negate()));
		// the outer petal: closed in the bud (leaning in, cupped, its edges meeting its neighbours': a plump ovoid
		// bud), open like a water lily's (its base spread ~50° from the axis, its tip curving back up), broad and ovate
		const lean = lerp(-0.05, 0.97 + about(r, 0, 0.06), open) + 0.35 * fade;
		const d = ax.clone().multiplyScalar(Math.cos(lean)).addScaledVector(side, Math.sin(lean)).normalize();
		const face = side.clone().multiplyScalar(Math.cos(lean)).addScaledVector(ax, -Math.sin(lean)).normalize();
		const L = Fl.outer * k * about(r, 1, 0.05) * lerp(0.85, 1, open), W = (Fl.outerWidth / 2) * k * lerp(0.92, 1, open);
		
		const g = slab({
			length: L,
			width: W,
			thick: Fl.thick * k,
			// ovate: broad from its base, widest a little under half way, drawn to a short point (the sheet's front)
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.13 + u * 0.88)), 0.62) * (1 - 0.12 * u),
			// cupped (its edges toward the flower's middle), its tip curving back toward the axis
			// open: cupped and curving back up; in the bud bulging out at the middle and closing over the top
			lift: (u, v) => lerp(-0.1 * v * v + 0.2 * Math.sin(Math.PI * Math.pow(u, 0.75)) - 0.2 * u * u, -0.16 * v * v * (1 - 0.2 * u) - 0.24 * u * u, open),
			paint: (u) => colourOut(u),
			inner: (u) => colourIn(u),
			along: 8,
			across: 4,
		});
		bag.add('petal', g, aimFace(hinge.clone().addScaledVector(side, lerp(0.0062, 0.0075, open) * k), d, face));
		// the inner petal, between two outer ones: closed into a round dome over the stamens, opening only a little
		const sideI = side.clone().applyAxisAngle(ax, Math.PI / 3);
		const leanI = lerp(-0.2, 0.5, open) + 0.3 * fade;
		const dI = ax.clone().multiplyScalar(Math.cos(leanI)).addScaledVector(sideI, Math.sin(leanI)).normalize();
		const faceI = sideI.clone().multiplyScalar(Math.cos(leanI)).addScaledVector(ax, -Math.sin(leanI)).normalize();
		if (open > 0.15) {
			const gi = slab({
				length: Fl.inner * k,
				width: (Fl.innerWidth / 2) * k,
				thick: Fl.thick * k * 0.7,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(0.985, 0.14 + u * 0.86)), 0.55),
				lift: (u, v) => -0.2 * v * v - 0.85 * u * u,
				paint: (u) => mix(mix(Fl.base, Fl.innerPetal, smooth(u / 0.3)), Fl.fallen, fade),
				inner: () => mix(Fl.innerPetal, Fl.base, 0.3),
				along: 6,
				across: 4,
			});
			bag.add('petal', gi, aimFace(hinge.clone().addScaledVector(sideI, 0.0085 * k), dI, faceI));
		}
	}
	return st;
}

/* ---- the fruit ---- */

/** the fruit's mass as a part of its mature mass by days from anthesis: double-sigmoid (S22) [EST] */
const fruitMass = (d) => straight(d, [[0, 0.0007], [12, 0.0016], [22, 0.004], [35, 0.02], [50, 0.08], [65, 0.2], [80, 0.42], [95, 0.58], [110, 0.63], [122, 0.68], [135, 0.84], [150, 1], [170, 1.02]]);

/** where a fruit's spines stand: `n` places spread evenly over the lathe (u along 0 … 1 blossom end → stalk, a round) */
const SPINE_AT = {};
function spineAt(n) {
	if (SPINE_AT[n]) return SPINE_AT[n];
	// even over the surface: u by the area each band of the profile holds, round by the golden angle
	const W = MO.FRUIT_W, N = 200;
	const cum = [0];
	for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + station(W, (i - 0.5) / N));
	const total = cum[N];
	const out = [];
	for (let k = 0; k < n; k++) {
		const target = ((k + 0.5) / n) * total;
		let i = 1;
		while (i < N && cum[i] < target) i++;
		const u = (i - 1 + (target - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1])) / N;
		out.push({ u, a: (k * 2.39996) % (Math.PI * 2) });
	}
	return (SPINE_AT[n] = out);
}

/**
 * One fruit hanging from its stalk: built from `top` (where the stalk joins it) down along `dir`. Its profile the
 * sheet's traced heart (widest in its upper part, its shoulders rounding fast into the stalk, a blunt round tip), a
 * little lopsided and curved by its own chance (poorly pollinated carpels stay small, S1); its rings spaced by
 * (1 − cos) toward the poles so it closes round (orange v2's lesson). Its skin dark glossy green, light dull yellowish
 * green when mature, a net of areoles; on every areole a soft fleshy spine curving toward the tip, the spines browning
 * at their tips and spreading apart when mature. `days` from anthesis, `k` its own size.
 */
function fruitBody(bag, top, dir, days, k, r, fine) {
	const Fr = MO.fruit;
	const g = Math.cbrt(fruitMass(days)) * k;
	const L = Fr.length * g;
	const aspect = lerp(Fr.youngAspect, Fr.aspect, span(days, 20, 110));
	const W = L / aspect;
	const d = dir.clone().normalize();
	const side = across(d).applyAxisAngle(d, r() * 6.283);
	const side2 = new THREE.Vector3().crossVectors(d, side);
	const lop = about(r, 0.04, 0.035); // how lopsided
	const ripe = span(days, 125, 152);
	const rings = fine ? 64 : fewer(Math.round(lerp(10, 28, Math.min(1, g * 1.4))), 6);
	const sides = fine ? 56 : fewer(Math.round(lerp(10, 26, Math.min(1, g * 1.4))), 6);
	// the axis: from the stalk (x = 1) to the blossom end (x = 0), bending a little toward `side`
	const xs = [], pts = [];
	for (let i = 0; i <= rings; i++) {
		const x = 1 - (1 - Math.cos((i / rings) * Math.PI)) / 2; // 1 … 0, dense at both poles
		xs.push(x);
		pts.push(top.clone().addScaledVector(d, (1 - x) * L).addScaledVector(side, lop * W * Math.sin(Math.PI * x)));
	}
	const prof = (x) => station(MO.FRUIT_W, x);
	const radiusX = (x) => (W / 2) * prof(x); // round in section: the lop is in its curved axis (the tube's frame is its own)
	// the tube gives the length along it: back to the ring it is
	const ringOf = new Map();
	{
		let s = 0;
		ringOf.set(0, 0);
		for (let i = 1; i <= rings; i++) ringOf.set(Math.round((s += pts[i].distanceTo(pts[i - 1])) * 1e7), i);
	}
	const radius = (u, v, s) => radiusX(xs[ringOf.get(Math.round(s * 1e7)) ?? Math.round(u * rings)], v * Math.PI * 2);
	const base = mix(mix(Fr.young, Fr.mid, span(days, 30, 90)), Fr.ripe, ripe);
	const ownK = about(r, 1, 0.05);
	const lift = lifted('skinMap');
	const paint = (u) => base.clone().multiplyScalar(ownK * lift * (u > 0.97 ? 0.85 : 1));
	const geo = tube(pts, radius, paint, sides, true);
	bag.add('skin', geo);
	// the spines: soft, fleshy, curved toward the tip, one on every areole; a fruitlet bristles (the 'brush'), a grown
	// fruit's stand ~13 mm apart; drawn where they are seen
	if (DETAIL.level >= 0.5 || fine) {
		const n = fine ? MO.fruit.spines : Math.round(MO.fruit.spines * (DETAIL.level >= 1 ? 1 : 0.6));
		const sl = (Fr.spine * lerp(0.55, 1, span(days, 0, 60)) + 0.002 * (1 - span(days, 0, 25))) * about(r, 1, 0.08);
		const tipC = mix(mix(base, Fr.tip, 0.35), Fr.tip, ripe); // the tips darker, brown when mature (the sheet's)
		const bodyC = base.clone().multiplyScalar(0.92);
		const pos = [], nor = [], col = [], idx = [], uvs = [];
		const sideN = fine ? 5 : 3;
		const q = new THREE.Vector3(), out = new THREE.Vector3(), tang = new THREE.Vector3();
		for (const s of spineAt(n)) {
			const x = s.u;
			if (x < 0.015 || x > 0.95) continue;
			// the place on the surface, the outward normal and the way to the tip
			const i = (Math.acos(clamp(1 - 2 * (1 - x), -1, 1)) / Math.PI) * rings; // the ring index for x
			const ii = Math.min(rings - 1, Math.max(0, Math.floor(i)));
			const at = pts[ii].clone().lerp(pts[ii + 1], i - ii);
			const rad = radiusX(x, s.a);
			out.copy(side).multiplyScalar(Math.cos(s.a)).addScaledVector(side2, Math.sin(s.a));
			// the profile's slope tilts the normal toward the stalk or the tip
			const slope = (prof(Math.min(1, x + 0.02)) - prof(Math.max(0, x - 0.02))) / 0.04 * (W / 2) / L;
			const nrm = out.clone().addScaledVector(d, slope).normalize();
			q.copy(at).addScaledVector(out, rad * 0.985);
			tang.copy(d); // toward the blossom end
			const len = sl * lerp(0.6, 1, Math.sin(Math.PI * clamp(x * 1.1))) * (1 + 0.25 * ripe);
			const curve = lerp(0.3, 0.75, ripe); // spread apart as it ripens
			const p1 = q.clone().addScaledVector(nrm, len * 0.62).addScaledVector(tang, len * 0.1 * (1 + curve));
			const p2 = q.clone().addScaledVector(nrm, len * 0.92).addScaledVector(tang, len * 0.42 * (1 + curve * 0.5));
			const ring = [q, p1];
			const rr = [len * 0.34, len * 0.12]; // stout at the foot, a thin hook, as the sheet's
			const b0 = pos.length / 3;
			const ax2 = p1.clone().sub(q).normalize();
			const s1 = across(ax2), s2 = new THREE.Vector3().crossVectors(ax2, s1);
			for (let rI = 0; rI < 2; rI++)
				for (let j = 0; j < sideN; j++) {
					const a = (j / sideN) * Math.PI * 2;
					const dd = s1.clone().multiplyScalar(Math.cos(a)).addScaledVector(s2, Math.sin(a));
					const p = ring[rI].clone().addScaledVector(dd, rr[rI]);
					pos.push(p.x, p.y, p.z);
					nor.push(dd.x, dd.y, dd.z);
					uvs.push(0, 0);
					const c = rI ? mix(bodyC, tipC, 0.5) : bodyC;
					col.push(c.r, c.g, c.b);
				}
			pos.push(p2.x, p2.y, p2.z);
			nor.push(ax2.x, ax2.y, ax2.z);
			uvs.push(0, 0);
			col.push(tipC.r, tipC.g, tipC.b);
			for (let j = 0; j < sideN; j++) {
				const j1 = (j + 1) % sideN;
				idx.push(b0 + j, b0 + sideN + j, b0 + j1, b0 + j1, b0 + sideN + j, b0 + sideN + j1);
				idx.push(b0 + sideN + j, b0 + 2 * sideN, b0 + sideN + j1);
			}
		}
		if (idx.length) bag.add('body', made(pos, nor, uvs, col, idx, false));
	}
	return { L, W };
}

/** the fruit's stalk: short and stout, out of its cushion on the bark and turning straight down */
function fruitStalk(bag, at, out, days, r) {
	const Fr = MO.fruit;
	const g = Math.cbrt(fruitMass(days));
	const len = Fr.stalkLength * lerp(0.6, 1, g) * about(r, 1, 0.15);
	const rad = Fr.stalkRadius * lerp(0.35, 1, Math.sqrt(g));
	const pts = [at.clone()];
	let d = out.clone().normalize();
	for (let i = 1; i <= 4; i++) {
		d.lerp(v3(0, -1, 0), lerp(0.2, 0.55, g)).normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, len / 4));
	}
	bag.add('twig', tube(pts, (u) => rad * lerp(0.85, 1.15, u), () => Fr.stalk, 7, false));
	return { end: pts[4], dir: d };
}

/** the fruit's shape for `Space`: balls along it from where it hangs, for its mature size */
function fruitBalls(top, dir) {
	const Fr = MO.fruit;
	const L = Fr.length, W = L / Fr.aspect;
	const d = dir.clone().normalize();
	return [
		{ c: top.clone().addScaledVector(d, L * 0.3), r: W * 0.42 },
		{ c: top.clone().addScaledVector(d, L * 0.62), r: W * 0.4 },
		{ c: top.clone().addScaledVector(d, L * 0.86), r: W * 0.24 },
	];
}

/** a flower cushion: the small woody knob on the bark that flowers year after year */
function cushion(bag, at, out, k = 1) {
	const q = new THREE.Quaternion().setFromUnitVectors(UP, out.clone().normalize());
	bag.add('bark', bead(at.clone().addScaledVector(out, 0.002), v3(0.007 * k, 0.005 * k, 0.007 * k), MO.flower.cushion, 4, q));
}
/* ================================================================================================================
 * 3. THE TREE — Troll's model shoot by shoot, its graft and training, its girth, its roots, its season
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A Morada scion top-cleft grafted at 22 cm onto a soursop seedling in its first year,
 * planted out at about 17 months, topped at 0.7 m and trained on three or four scaffolds into a rounded head kept at
 * about 3.5 m (Colombia: Torres & Sánchez 1992 in S1; Embrapa: S4, S5). Troll's model (PROSEA, S12): every shoot grows
 * out and up, its end bends over and lies out level, its leaves in two rows, and a new upright shoot (a relay) rises
 * from the top of the bend, so the crown is built of arching, overlapping layers; side shoots grow at once (sylleptic)
 * from the level parts. Extension is steady through the year (no distinct flushes, S12): the year here in four
 * pulses, each drawn as far as grown.
 */
const TREE = {
	// the seedling (the rootstock): its pulses (start, length of the stem, years it grows). The first is the
	// hypocotyl: 2 cm under the soil and 5.5 cm over it, drawn as its hook until it straightens (day ~32)
	seedling: [
		{ ts: 0.03, len: 0.075, dur: 0.058 },
		{ ts: 0.075, len: 0.03, dur: 0.05 },
		{ ts: 0.16, len: 0.08, dur: 0.1 },
		{ ts: 0.3, len: 0.08, dur: 0.12 },
		{ ts: 0.5, len: 0.06, dur: 0.15 },
		{ ts: 0.72, len: 0.05, dur: 0.15 },
	],
	graft: { t: 1.0, h: 0.22 }, // top cleft graft at 12–13 months, 20–25 cm up (S1, S4)
	scion: [
		{ ts: 1.03, len: 0.1, dur: 0.12 },
		{ ts: 1.17, len: 0.1, dur: 0.12 },
		{ ts: 1.3, len: 0.1, dur: 0.1 },
	],
	planted: 1.4, // 4–5 months after grafting (S4)
	top: { t: 1.62, h: 0.7 }, // topped at 0.6–0.8 m (S1, S4)
	scaffolds: { n: [3, 4], low: 0.47, high: 0.68, tilt: [0.52, 0.78] }, // 3–4 scaffolds, 30–45° from upright (S1)
	pulses: [0.05, 0.3, 0.55, 0.8], // steady growth, as four pulses a year from planting
	dur: 0.2,
	internode: 0.025, // 2–4 cm [EST]
	cell: 0.42,
	cap: 5, // a tip with this many tips in its cell makes no new shoot
	crowd: 10, // and with more than this it may be shaded out
	maxOrder: 7,
	tipRadius: 0.0016,
	pipe: 2.5,
};

/** the trunk's diameter at 30 cm by age (years from sowing): stock 1 cm at grafting (S4), 4.4 cm 9 months planted unpruned (S6), the pruned tree 15 cm in its fifth year [EST within S2, S6, S11] */
const TRUNK_D = [[0, 0.0016], [0.1, 0.0022], [0.3, 0.004], [1.0, 0.01], [1.4, 0.013], [2.2, 0.033], [3.4, 0.072], [4.5, 0.11], [5.9, 0.15], [8, 0.18], [12, 0.22]];

/**
 * The room the grower keeps the crown in by age: its height, its radius and how low its skirt comes, from the data
 * sheet (2.5 m at two years planted; kept at 3.5 m, 3.8 m across in its fifth year: S1, S4, S5, and the sheet's
 * bearing tree). A dome above its widest, a little below half way, sides falling to the skirt. A shoot meeting its
 * edge turns along it; one well past it is headed back (it stops).
 */
const CROWN = {
	height: [[1.6, 0.8], [2.4, 1.7], [3.4, 2.6], [4.5, 3.2], [5.9, 3.6], [10, 3.8]],
	radius: [[1.6, 0.25], [2.4, 0.8], [3.4, 1.25], [4.5, 1.65], [5.9, 1.95], [10, 2.2]],
	skirt: [[1.6, 0.5], [3.4, 0.65], [5.9, 0.85]],
};
function crownAt(t) {
	const H = straight(t, CROWN.height), R = straight(t, CROWN.radius), yb = straight(t, CROWN.skirt);
	return { H, R, yb, yc: lerp(yb, H, 0.5) };
}
function crownOut(c, p) {
	const under = clamp((c.yc - p.y) / Math.max(0.1, c.yc - c.yb));
	const rr = Math.hypot(p.x, p.z) / (c.R * (1 - 0.25 * under * under));
	const up = Math.max(0, p.y - c.yc) / Math.max(0.1, c.H - c.yc);
	const down = Math.max(0, c.yb - p.y) / 0.35;
	const f = Math.pow(Math.pow(rr, 3) + Math.pow(up, 3), 1 / 3) + down * down; // a dome with full shoulders
	const n = v3(p.x / c.R, (up / Math.max(0.1, c.H - c.yc)) * c.R - down, p.z / c.R);
	if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
	return { f, n: n.normalize() };
}

/** the growth events up to time t, in the order they happen (the same list at every t, cut where t is) */
function events(t) {
	const list = [];
	TREE.seedling.forEach((e, i) => e.ts <= t && list.push({ ...e, kind: 'seed', i }));
	if (t >= TREE.graft.t) list.push({ ts: TREE.graft.t, dur: 0, kind: 'graft' });
	TREE.scion.forEach((e, i) => e.ts <= t && list.push({ ...e, kind: 'scion', i }));
	for (let y = 1; y <= Math.floor(t); y++)
		for (const f of TREE.pulses) {
			const ts = y + f + (y === 1 ? 0.4 : 0);
			if (y === 1 && ts >= 2) continue; // the first year's: from planting on
			if (ts <= t) list.push({ ts, dur: TREE.dur, kind: 'grow' });
		}
	if (t >= TREE.top.t) list.push({ ts: TREE.top.t, dur: 0, kind: 'top' });
	return list.sort((a, b) => a.ts - b.ts);
}

const pulseGrown = (e, t) => span(t, e.ts, e.ts + e.dur);

/** the length along a path at each of its points */
function lengths(pts) {
	const l = [0];
	for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return l;
}
/** the place and direction at `s` metres along a path */
function pointAt(ax, s) {
	if (ax.pts.length < 2) return { at: ax.pts[0].clone(), dir: (ax.dir0 ?? UP).clone(), i: 0 };
	const L = ax.pathLen ?? (ax.pathLen = lengths(ax.pts));
	const total = L[L.length - 1];
	const x = clamp(s, 0, total);
	let i = 1;
	while (i < L.length - 1 && L[i] < x) i++;
	const k = (x - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
	return { at: ax.pts[i - 1].clone().lerp(ax.pts[i], k), dir: ax.pts[i].clone().sub(ax.pts[i - 1]).normalize(), i };
}
/** an axis's length at time t: its pulses as far as grown, and no longer than it was cut to */
function lengthAt(ax, t) {
	let s = 0;
	for (const f of ax.pulses) {
		if (t <= f.e.ts) continue;
		let g = f.s0 + (f.s1 - f.s0) * pulseGrown(f.e, t);
		// a cut made after this pulse took away what it grew beyond the cut
		for (const c of ax.cuts) if (t >= c.t && c.t > f.e.ts) g = Math.min(g, c.s);
		s = Math.max(s, g);
	}
	return s;
}

/** an elevation (radians over level) and a heading made a direction */
const towards = (heading, e) => heading.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e)).normalize();

/**
 * The tree's axes, grown event by event up to time t. Each decision (a relay, a side shoot, a shoot shaded out or
 * headed back) is made at a pulse's start from what the tree was then, and each axis draws its own chance, so the
 * tree at an earlier t is the first part of the tree at a later one; the pulse growing at t is laid out whole and
 * drawn as far as it has grown.
 */
function simulate(seedKey, t) {
	const all = [];
	const tr = chance(seedKey, 'tree');
	const vigourTree = about(tr, 1, 0.05);
	const leanA = tr() * Math.PI * 2;
	const lean = v3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(0.03 + tr() * 0.03);
	/** a new axis: its heading (level), how it rises at first (e0) and lies at last (eEnd) over `arch` metres */
	const make = (key, parent, sp, from, o, e, order, vigour) => {
		const dir0 = towards(o.heading, o.e0);
		const ax = { key, parent, sp, order, vigour, born: e ? e.ts : 0, pts: [from.clone()], dir0, d: dir0.clone(), heading: o.heading.clone().setY(0).normalize(), e0: o.e0, eEnd: o.eEnd, arch: o.arch, nodes: [], pulses: [], cuts: [], len: 0, alive: true, died: Infinity, kids: [], relayed: 0, r: chance(seedKey, 'axis', ...key) };
		ax.phase = ax.r() * Math.PI * 2;
		// its tier: a relay carries its parent's on (it is the axis going on, Troll), a side shoot one more
		ax.tier = o.tier ?? order;
		all.push(ax);
		if (parent) parent.kids.push(ax);
		return ax;
	};
	const trunk = make(['trunk'], null, 0, v3(0, -MO.seed.depth, 0), { heading: v3(1, 0, 0), e0: Math.PI / 2, eEnd: Math.PI / 2, arch: 1 }, null, 0, 1);
	trunk.orth = true;
	const cellOf = (p) => `${Math.floor(p.x / TREE.cell)},${Math.floor(p.y / TREE.cell)},${Math.floor(p.z / TREE.cell)}`;
	const tipOf = (ax) => ax.pts[ax.pts.length - 1];
	/** the elevation of a direction over level */
	const elev = (d) => Math.asin(clamp(d.y, -1, 1));

	/** cut an axis back to `s` at time `at`: what grew beyond it is gone, with everything it carried */
	const cut = (ax, s, at) => {
		ax.cuts.push({ t: at, s });
		for (const k of ax.kids) if (k.sp > s) kill(k, at, true);
		for (const n of ax.nodes) if (n.s > s) n.gone = Math.min(n.gone ?? Infinity, at);
		ax.len = Math.min(ax.len, s);
		// the path kept to the cut, so it grows on from there
		const L = lengths(ax.pts);
		let i = 1;
		while (i < L.length && L[i] < s) i++;
		if (i < L.length) {
			const p = pointAt(ax, s);
			ax.pts = ax.pts.slice(0, i);
			ax.pts.push(p.at);
			ax.d = p.dir.clone();
		}
		ax.pathLen = null;
	};
	const kill = (a, at, now) => {
		if (a.alive) (a.alive = false), (a.died = at), (a.removed = now);
		a.kids.forEach((k) => kill(k, at, now));
	};

	/** one pulse of one axis: its length, its path step by step, its nodes */
	const grow = (ax, e) => {
		const r = ax.r;
		let len;
		if (e.kind === 'seed') len = ax === trunk ? e.len * about(r, 1, 0.05) : 0;
		else if (e.kind === 'scion') len = ax === trunk ? e.len * about(r, 1, 0.08) : 0;
		else {
			if (ax === trunk && ax.topped) {
				r();
				return;
			}
			const age = e.ts - TREE.planted;
			const base = age < 1 ? 0.32 : age < 2.2 ? 0.37 : age < 3.5 ? 0.28 : 0.22;
			len = base * Math.pow(0.86, Math.max(0, ax.tier - 1)) * ax.vigour * vigourTree * about(r, 1, 0.15);
			if (ax === trunk) len = 0.25 * about(r, 1, 0.05);
		}
		if (len < 0.012) {
			r();
			ax.pulses.push({ e, s0: ax.len, s1: ax.len });
			return;
		}
		const s0 = ax.len;
		const steps = Math.max(2, Math.ceil(len / 0.03));
		const room = crownAt(e.ts + e.dur);
		let madeN = 0;
		for (let k = 0; k < steps; k++) {
			const p = tipOf(ax);
			const d = ax.d;
			if (ax.orth) d.add(v3(lean.x * 0.1 + about(r, 0, 0.03), 0.4, lean.z * 0.1 + about(r, 0, 0.03)));
			else {
				// Troll: up and out at first, bending over to level along its arch, then sagging a little under
				// its own length; the heading wanders a little
				const s = ax.len + (k / steps) * len;
				const sag = 0.05 * Math.max(0, s - ax.arch) * (1 + 0.3 * ax.order);
				const e1 = lerp(ax.e0, ax.eEnd, smooth(s / ax.arch)) - sag;
				const want = towards(ax.heading, Math.max(-0.45, e1));
				d.lerp(want, 0.45);
				d.x += about(r, 0, 0.04);
				d.z += about(r, 0, 0.04);
				d.y += about(r, 0, 0.02);
				if (p.y < 0.45 && d.y < 0) d.y = Math.max(d.y, 0.02);
			}
			d.normalize();
			if (e.kind === 'grow' && ax !== trunk) {
				const out = crownOut(room, p);
				if (out.f > 1.05) break;
				if (out.f > 0.9) {
					const into = d.dot(out.n);
					if (into > 0) d.addScaledVector(out.n, -into * smooth((out.f - 0.9) / 0.12)).normalize();
				}
			}
			ax.pts.push(p.clone().addScaledVector(d, len / steps));
			madeN++;
		}
		len = (len / steps) * madeN;
		if (madeN === 0) {
			ax.pulses.push({ e, s0, s1: s0 });
			ax.stalled = (ax.stalled ?? 0) + 1;
			return;
		}
		ax.len = s0 + len;
		ax.pathLen = null;
		const first = e.kind === 'seed' && e.i === 0; // the hypocotyl: no leaves
		const n = first ? 0 : e.kind === 'seed' && e.i === 1 ? 2 : Math.round(clamp(len / TREE.internode, 1, 14));
		const size = e.kind === 'seed' ? [0, 0.45, 0.62, 0.74, 0.8, 0.84][e.i] : e.kind === 'scion' ? 0.86 : 1;
		const pulseI = ax.pulses.length;
		for (let j = 1; j <= n; j++) {
			const s = s0 + len * (j / n) * (e.kind === 'seed' ? 0.85 : 1); // a seedling's top leaves just under its tip
			const p = pointAt(ax, s);
			const i = ax.nodes.length;
			const early = e.kind === 'seed' ? 0.4 : 0.95; // a seedling's leaves unfold as its stem grows
			ax.nodes.push({ i, s, at: p.at, dir: p.dir, pulse: pulseI, formed: e.ts + e.dur * (j / n) * early, size: size * about(r, 1, 0.1), life: between(r, MO.leaf.life[0], MO.leaf.life[1]), level: elev(p.dir) < 0.75 });
		}
		ax.pulses.push({ e, s0, s1: ax.len });
	};

	/** what a shoot puts out at a pulse: a relay from the top of its bend, side shoots from its level part */
	const branch = (ax, e, tips) => {
		const r = ax.r;
		const roll = r();
		if (!ax.pulses.length || ax.order >= 12 || ax.tier >= TREE.maxOrder || ax === trunk) return;
		const last = ax.nodes.filter((n) => n.pulse === ax.pulses.length - 1);
		if (!last.length) return;
		// the relay: once the shoot has bent over, from the top of its bend, upright
		if (!ax.relayed && ax.len > 0.35 && elev(ax.d) < 0.62 && ax.vigour > 0.35) {
			const bend = ax.nodes.find((n) => elev(n.dir) < 0.85 && n.s > 0.15) ?? last[0];
			if ((tips.get(cellOf(bend.at)) ?? 0) < TREE.cap + 1 && roll < (ax.order <= 2 ? 0.92 : 0.6)) {
				// the relay rises; out in the crown it turns back over its middle, so the dome's top fills (orange v2's lesson)
				const h = ax.heading.clone().applyAxisAngle(UP, about(r, 0, 0.6));
				const inward = bend.at.clone().setY(0).negate();
				const room = crownAt(e.ts);
				const far = clamp(inward.length() / Math.max(0.3, room.R) - 0.1) * between(r, 0.9, 1.6);
				if (inward.lengthSq() > 1e-6) h.lerp(inward.normalize(), Math.min(0.92, far)).normalize();
				const low = 1 - smooth((bend.at.y - room.yc) / Math.max(0.2, room.H - room.yc)); // below the crown's top, it rises steeply
				make([...ax.key, 'relay'], ax, bend.s, bend.at, { heading: h, e0: between(r, 1.3, 1.5), eEnd: between(r, 0.05, 0.3) + 0.35 * low, arch: between(r, 0.9, 1.3) * Math.sqrt(ax.vigour) * lerp(0.8, 1.15, low), tier: ax.tier }, e, ax.order + 1, ax.vigour * between(r, 0.9, 1.0));
				ax.relayed = 1;
				ax.vigour *= 0.6; // the bent end goes on as a level branch, slower
			}
		}
		// side shoots: from the level part of this pulse, in the branch's own plane, left and right in turn
		for (const n of last) {
			if (!n.level) continue;
			const x = r();
			if (x > (ax.order <= 1 ? 0.62 : 0.5) || ax.vigour < 0.2) continue;
			if ((tips.get(cellOf(n.at)) ?? 0) >= TREE.cap) continue;
			const sideSign = n.i % 2 ? 1 : -1;
			const h = ax.heading.clone().applyAxisAngle(UP, sideSign * between(r, 0.7, 1.2));
			make([...ax.key, n.i], ax, n.s, n.at, { heading: h, e0: between(r, 0.3, 0.7), eEnd: between(r, -0.1, 0.1) - 0.25 * (1 - smooth((n.at.y - 0.8) / 1.0)), arch: between(r, 0.25, 0.45), tier: ax.tier + 1 }, e, ax.order + 1, ax.vigour * between(r, 0.5, 0.7));
		}
	};

	/** renewal: a new side shoot from older wood where it is lit (few tips near), or the crown's skirt goes bare */
	const renew = (ax, e, tips) => {
		const r = ax.r;
		const x = r(), pick = r();
		if (ax === trunk || ax.tier > 3 || x > 0.4) return;
		const old = ax.nodes.filter((n) => e.ts - n.formed > 0.8 && n.s < ax.len - 0.1 && !(n.gone <= e.ts));
		if (!old.length) return;
		const n = old[Math.floor(pick * old.length)];
		const room = crownAt(e.ts);
		if (n.at.y > room.yc + 0.4 || n.at.y < room.yb + 0.15 || (tips.get(cellOf(n.at)) ?? 0) >= 2) return;
		const out = n.at.clone().setY(0);
		const h = out.lengthSq() > 1e-4 ? out.normalize().applyAxisAngle(UP, about(r, 0, 0.7)) : ax.heading.clone();
		make([...ax.key, 'r', n.i], ax, n.s, n.at, { heading: h, e0: between(r, 0.35, 0.8), eEnd: between(r, -0.25, 0.05), arch: between(r, 0.3, 0.5), tier: ax.tier + 1 }, e, ax.order + 1, between(r, 0.45, 0.65));
	};

	for (const e of events(t)) {
		if (e.kind === 'graft') {
			// the stock cut at 22 cm and the scion set on it: the stock's leaves above are gone with its top
			cut(trunk, TREE.graft.h, e.ts);
			continue;
		}
		if (e.kind === 'top') {
			// topped at 0.7 m; the scaffolds from its buds below the cut, spread round it
			if (trunk.len > TREE.top.h) cut(trunk, TREE.top.h, e.ts);
			trunk.topped = true;
			const S = TREE.scaffolds;
			const rr = chance(seedKey, 'scaffolds');
			const n = rr() < 0.5 ? S.n[0] : S.n[1];
			const turn0 = rr() * Math.PI * 2;
			const cand = trunk.nodes.filter((nd) => nd.at.y > S.low && nd.at.y < S.high && !(nd.gone <= e.ts));
			for (let i = 0; i < n && cand.length; i++) {
				const node = cand[Math.min(cand.length - 1, Math.floor(((n - 1 - i + 0.5) / n) * cand.length))];
				const h = v3(Math.cos(turn0 + (i * Math.PI * 2) / n + about(rr, 0, 0.25)), 0, Math.sin(turn0 + (i * Math.PI * 2) / n + about(rr, 0, 0.25)));
				const tilt = between(rr, S.tilt[0], S.tilt[1]);
				make(['limb', i], trunk, node.s, node.at, { heading: h, e0: Math.PI / 2 - tilt, eEnd: between(rr, 0.35, 0.55), arch: between(rr, 1.3, 1.8) }, e, 1, about(rr, 1, 0.06) * (i === 0 ? 1.05 : 1));
			}
			continue;
		}
		const tips = new Map();
		for (const ax of all) if (ax.alive) tips.set(cellOf(tipOf(ax)), (tips.get(cellOf(tipOf(ax))) ?? 0) + 1);
		if (e.kind === 'grow') {
			for (const ax of all.filter((a) => a.alive)) {
				// a tip deep in a crowd, or stalled at the crown's edge for a year, is shaded out or headed back
				const crowd = tips.get(cellOf(tipOf(ax))) ?? 0;
				const shade = ax.r();
				if (ax.tier >= 2 && ((crowd > TREE.crowd && shade < 0.55) || (ax.stalled ?? 0) >= 4)) {
					kill(ax, e.ts, false);
					continue;
				}
				branch(ax, e, tips);
				renew(ax, e, tips);
			}
		}
		for (const ax of all) if (ax.alive) grow(ax, e);
	}
	return { all, trunk };
}

/**
 * How thick each axis is along it, as far as it has grown at t: the pipe model (the wood at a place carries what all
 * the shoots beyond it need, r^2.5 summed), then the whole tree scaled so its trunk at 30 cm has the measured girth
 * of its age (TRUNK_D), no shoot thinner than a young one. A shoot shaded out dries and falls within the year; one
 * headed back or cut is gone at once.
 */
function thicken(all, trunk, t) {
	for (const ax of all) {
		const full = ax.pathLen ?? (ax.pathLen = lengths(ax.pts));
		ax.shown = t > ax.died + (ax.removed ? 0 : 0.8) ? 0 : Math.min(full[full.length - 1], lengthAt(ax, t));
	}
	const P = TREE.pipe;
	const walk = (ax) => {
		const L = ax.pathLen;
		const n = ax.pts.length;
		ax.q = new Array(n).fill(0);
		const add = new Array(n).fill(0);
		for (const k of ax.kids) {
			if (k.shown <= 0.002 || k.sp > ax.shown) continue;
			walk(k);
			const { i } = pointAt(ax, k.sp);
			add[Math.max(0, i - 1)] += k.q[0];
		}
		let acc = 0;
		for (let i = n - 1; i >= 0; i--) {
			acc += add[i];
			const beyond = Math.max(0, ax.shown - L[i]);
			ax.q[i] = L[i] > ax.shown + 1e-6 ? 0 : Math.pow(TREE.tipRadius, P) + acc + 2e-7 * beyond;
		}
	};
	for (const ax of all) ax.q = null;
	walk(trunk);
	const at30 = pointAt(trunk, Math.min(0.32 + MO.seed.depth, trunk.shown * 0.5)).i;
	const raw = Math.pow(trunk.q[Math.min(trunk.q.length - 1, at30)], 1 / P);
	const k = straight(t, TRUNK_D) / 2 / Math.max(1e-6, raw);
	for (const ax of all) ax.rad = (ax.q ?? new Array(ax.pts.length).fill(0)).map((q) => Math.max(q > 0 ? 0.001 : 0, Math.pow(q, 1 / P) * k));
}

/** the wood's colour by its age (years) and radius: the seedling's pale green stem, the rusty-hairy young shoot, brown-grey two-year wood with its lenticels, the dull grey-brown trunk */
function barkColour(age, r, trunk, t, h) {
	const B = MO.bark;
	let c = mix(B.hairy, B.young, span(age, 0.15, 0.9));
	if (trunk && t < 0.9 && h < 0.08) c = mix(MO.hypocotyl.colour, c, span(t, 0.2, 0.9)); // the hypocotyl, pale green
	else if (trunk && t < 0.6) c = mix(B.shoot, c, span(t, 0.15, 0.6));
	c.lerp(B.old, span(r, 0.008, 0.025));
	return c;
}

/** the tree's wood drawn: every axis a tube as far as it has grown, its bark by the age and girth of each part */
function wood(bag, ax, t, ns) {
	const L = ax.pathLen;
	const total = ax.shown;
	if (total < 0.003) return;
	const n = ax.pts.length;
	const radiusAt = (s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		const k = clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return lerp(ax.rad[i - 1], ax.rad[i] || ax.rad[i - 1], k);
	};
	const formedAt = (s) => {
		for (const f of ax.pulses) if (s <= f.s1 + 1e-6 && f.s1 > f.s0) return f.e.ts + f.e.dur * clamp((s - f.s0) / Math.max(1e-6, f.s1 - f.s0));
		return t;
	};
	const R0 = Math.max(radiusAt(0), 0.001);
	const isTrunk = ax.order === 0;
	const step = isTrunk ? clamp(R0 * 0.5, 0.004, 0.04) : R0 > 0.015 ? clamp(R0 * 1.6, 0.025, 0.1) : clamp(R0 * 40, 0.06, 0.18);
	const count = Math.max(2, Math.ceil(total / step));
	const pts = [], ss = [];
	for (let k = 0; k <= count; k++) {
		const s = (k / count) * total;
		ss.push(s);
		pts.push(pointAt(ax, s).at);
	}
	const sides = Math.round(clamp(R0 * (R0 > 0.015 ? 600 : 700), R0 < 0.004 ? 3 : R0 < 0.007 ? 4 : 5, 36));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const flare = isTrunk ? span(t, 2, 6) : 0;
	const graft = span(t, TREE.graft.t, TREE.graft.t + 0.4);
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			const h = pts[0].y + s;
			r *= 1 + 0.45 * flare * Math.exp(-Math.max(0, h) / 0.12) * (0.8 + 0.3 * Math.cos(v * Math.PI * 2 * 4 + nsAx));
			// the graft union: the scion a little thicker than its stock, a step 22 cm up
			r *= 1 + graft * (0.08 * Math.exp(-Math.pow((h - TREE.graft.h) / 0.02, 2)) + 0.04 * smooth((h - TREE.graft.h) / 0.03));
		}
		if (ax.parent && s < r * 2.5) r *= 1 + 0.2 * (1 - s / (r * 2.5)); // the branch collar
		if (r > 0.02) r *= 1 + 0.035 * (fbm(Math.cos(v * 6.283) * 3, s * 5, Math.sin(v * 6.283) * 3, 2, nsAx) - 0.5);
		return r;
	};
	const kind = R0 > 0.01 ? 'bark' : 'twig';
	const lift = lifted(kind === 'bark' ? 'barkMap' : 'twigMap');
	const paint = (u, v, s) => {
		const r = radiusAt(s);
		const h = pts[0].y + s;
		const c = barkColour(t - formedAt(s), r, isTrunk, t, h);
		if (isTrunk && h < 0) c.lerp(MO.bark.root, 0.7);
		return c.multiplyScalar(lift);
	};
	const g = tube(pts, radius, paint, sides, true);
	const tile = kind === 'bark' ? 0.15 : 0.06;
	const uv = g.attributes.uv;
	const rings = pts.length;
	const per = uv.count >= rings * (sides + 1) ? sides + 1 : 0;
	if (per)
		for (let i = 0; i < uv.count; i++) {
			const ring = Math.min(rings - 1, Math.floor(i / per));
			const v = i < rings * per ? (i % per) / sides : 0;
			uv.setXY(i, ss[ring] / tile, (v * 2 * Math.PI * Math.max(radiusAt(ss[ring]), 0.003)) / tile);
		}
	bag.add(kind, g);
}

/** the roots: the seed's taproot (1.5–1.8 m in an old tree, S1), then the shallow spreading feeders beyond the crown */
function roots(bag, seedKey, t, base) {
	if (!DETAIL.roots) return;
	const d = t * 365;
	root(bag, {
		seed: seedKey,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.03, -1, 0.02),
		length: 1.5,
		grown: table(d, [[5, 0], [10, 0.012], [20, 0.035], [45, 0.07], [365, 0.2], [600, 0.35], [2000, 0.8], [3600, 1]]),
		radius: 0.0012 + 0.03 * span(t, 0.3, 8),
		down: 0.04,
		wander: 0.1,
		laterals: 7,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.1, 2),
		young: MO.root.young,
		old: MO.root.old,
	});
	for (let i = 0; i < 8; i++) {
		const rr = chance(seedKey, 'lateral-root', i);
		const born = 0.1 + i * 0.12;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed: seedKey,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.008, -0.01 - rr() * 0.04, Math.sin(bear) * 0.008)),
			dir: v3(Math.cos(bear), -0.25 - rr() * 0.15, Math.sin(bear)),
			length: between(rr, 1.6, 2.6) * lerp(0.2, 1, span(t, 0.4, 7)),
			grown: (t - born) / 3,
			radius: 0.0015 + 0.022 * span(t, born + 0.5, 8) * between(rr, 0.6, 1),
			down: 0.02,
			wander: 0.14,
			laterals: 6,
			lateral: 0.32,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.2) / 2,
			young: MO.root.young,
			old: MO.root.old,
			floor: -0.7,
		});
	}
}

/* ---- the season: flowers and fruit from the bark ---- */

const B = 5.9; // the season's main bloom, in the tree's fifth year after planting
/** the fruit carried to maturity in the fifth year: 15–20 once stable (S5), 'Morada' 18 ± 8 in the 3rd year (S2) */
const CROP = 16;

/**
 * The flower sites: cushions on wood at least a year old at the bloom (the trunk above 25 cm, the scaffolds, the older
 * limbs and twigs: cauliflory and ramiflory, S13), denser on the thick wood, each with its own bloom day: most in the
 * season (±12 days round B), some through the year (it flowers nearly all year, S1, S12). The fruit are set on
 * season sites, the thick wood first ("often low on the trunk"); a few more set and drop as young fruit. Fixed by
 * what the tree was at B − 1 year, so every stage shows the same sites.
 */
function flowerSites(all, seedKey) {
	const sites = [];
	const at = B - 1;
	for (const ax of all) {
		if (ax.born > at - 0.3) continue;
		const sw = Math.min(lengthAt(ax, at), ax.removed ? 0 : Infinity);
		if (!(sw > 0.05) || ax.died < B + 0.5) continue;
		const density = ax.order === 0 ? 7 : ax.order === 1 ? 3.2 : ax.order === 2 ? 1.6 : 0.6;
		const r = chance(seedKey, 'sites', ...ax.key);
		const n = Math.floor(sw * density + r());
		for (let i = 0; i < n; i++) {
			const s = ax.order === 0 ? between(r, 0.45 + MO.seed.depth, Math.max(0.5, sw - 0.03)) : between(r, 0.05, sw);
			const a = r() * Math.PI * 2;
			const stray = r() < 0.3;
			const off = stray ? between(r, -180, 240) : about(r, 0, 12);
			const rank = r() / (ax.order === 0 ? 1.8 : ax.order === 1 ? 1.7 : ax.order === 2 ? 1.2 : 1);
			sites.push({ ax, s, a, off, stray, rank, key: [...ax.key, 'site', i], k: about(r, 1, 0.08) });
		}
	}
	const season = sites.filter((x) => !x.stray).sort((a, b) => a.rank - b.rank);
	season.forEach((x, i) => {
		if (i < CROP) x.keep = true;
		else if (i < CROP + 8) x.drop = between(chance(seedKey, 'drop', ...x.key), 18, 45);
	});
	return sites;
}

/**
 * The whole Morada at time t (years from sowing): the seed until it germinates and its coat after, the roots, the
 * hypocotyl's hook, the wood, the seed leaves and leaves, and from the fifth year the season: buds, flowers and the
 * fruit swelling where they hang from the bark, each mature 150 days after its flower opened.
 */
function soursopTree(t, seedKey) {
	const bag = new Bag();
	const ns = hashText(seedKey) % 997;
	const days = t * 365;
	const D = MO.seed.depth;
	const sr = chance(seedKey, 'seed');
	const lieA = sr() * Math.PI * 2;
	const lie = v3(Math.cos(lieA), 0, Math.sin(lieA));
	roots(bag, seedKey, t, v3(0, -D, 0));
	// the seed in the soil, lying flat, until its hypocotyl lifts it
	if (days < 11) seedBean(bag, v3(0, -D, 0), lie, v3(0, 1, 0).applyAxisAngle(lie, 0.15), 1, 0);

	const { all, trunk } = simulate(seedKey, t);
	thicken(all, trunk, t);
	const hookDays = 32;
	const hyp = MO.hypocotyl.length + D;
	if (days >= 11 && days < hookDays) {
		// epigeal: the hypocotyl comes up as a hook and pulls the seed (the seed leaves still in its coat) out after it
		const Lh = hyp * span(days, 10, 26) + 0.004;
		const bend = 1 - span(days, 23, hookDays);
		const pts = [v3(0, -D, 0)];
		let d = UP.clone();
		const n = 16;
		for (let i = 1; i <= n; i++) {
			const u = i / n;
			const th = bend * Math.PI * 0.95 * smooth((u - 0.4) / 0.6);
			d = lie.clone().multiplyScalar(Math.sin(th)).addScaledVector(UP, Math.cos(th));
			pts.push(pts[i - 1].clone().addScaledVector(d, Lh / n));
		}
		bag.add('twig', tube(pts, (u) => lerp(0.0014, 0.0011, u), () => MO.hypocotyl.colour, 6, false));
		const tip = pts[n];
		seedBean(bag, tip.clone().addScaledVector(d, MO.seed.length * 0.42), d, lie.clone().cross(UP).normalize(), 1, 0);
	}
	if (days >= hookDays && days < 75) {
		// the coat held between the opening seed leaves, then dropped on the soil beside the stem
		const top = v3(0, MO.hypocotyl.length, 0);
		if (days < 40) seedBean(bag, top.clone().add(v3(0, 0.008 * (1 - span(days, 32, 40)), 0)), UP.clone(), lie.clone().cross(UP).normalize(), 1, span(days, 32, 40) * 0.3);
		else seedBean(bag, lie.clone().multiplyScalar(0.03).setY(0.003), lie.clone().applyAxisAngle(UP, 1.1), UP.clone(), 1, span(days, 40, 70), 'body'); // the empty coat, drying dull
	}
	const skip = new Set();
	if (days < hookDays) skip.add(trunk);
	for (const ax of all) if (!skip.has(ax)) wood(bag, ax, t, ns);

	// the seed leaves: a pair at the hypocotyl's top, opening out of the coat, shed by about two months
	if (days >= hookDays - 2) {
		const fall = between(chance(seedKey, 'cotyledons'), MO.cotyledon.fall[0], MO.cotyledon.fall[1]);
		const top = pointAt(trunk, hyp).at;
		const open = span(days, hookDays, 42);
		for (const sgn of [1, -1]) {
			const out = lie.clone().cross(UP).normalize().multiplyScalar(sgn);
			leaf(bag, { at: top.clone().addScaledVector(out, 0.001), out, size: 1, age: Math.max(1e-4, (days - hookDays + 6) / 365), life: (fall - hookDays + 6) / 365, r: chance(seedKey, 'cot', sgn), cot: true, rise: lerp(1.4, 0.25, open), droop: lerp(-1.2, 0.05, open) });
		}
	}

	// the wood in the space, for the fruit to hang clear of
	const space = bag.space;
	for (const ax of all) {
		if (ax.shown < 0.01) continue;
		const pts = [];
		for (let i = 0; i < ax.pts.length && ax.pathLen[i] <= ax.shown; i += 2) pts.push(ax.pts[i]);
		if (pts.length > 1) space.rod(pts, (u) => (ax.rad[Math.round(u * (pts.length - 1)) * 2] ?? 0.002) + 0.004);
	}

	// the season
	if (t > B - 0.5) {
		const Fl = MO.flower;
		const sites = flowerSites(all, seedKey);
		// the fruit first (the biggest need room), then the flowers
		sites.sort((a, b) => (b.keep ? 1 : 0) - (a.keep ? 1 : 0));
		for (const x of sites) {
			const dd = (t - B) * 365 - x.off;
			if (dd < -Fl.budDays || x.ax.shown < x.s) continue;
			const set = x.keep || (x.drop && dd < x.drop);
			if (dd > 9 && !set) continue;
			if (dd > MO.fruit.days + 20) continue;
			const p = pointAt(x.ax, x.s);
			const rad = x.ax.rad[Math.min(x.ax.rad.length - 1, p.i)] ?? 0.003;
			// out of the bark, turned a little down
			const side = across(p.dir).applyAxisAngle(p.dir, x.a);
			const foot = p.at.clone().addScaledVector(side, rad * 0.95);
			cushion(bag, foot, side, Math.min(1.4, 0.7 + rad * 20));
			const r = chance(seedKey, 'bloom', ...x.key);
			if (dd < 0 || (dd <= 9 && !(set && dd > 6))) {
				// a bud swelling, opening, open, spent
				const grown = span(dd, -Fl.budDays, -4);
				const open = span(dd, -2.5, 0.5);
				const fade = span(dd, Fl.openDays, Fl.openDays + 4);
				const dir = side.clone().addScaledVector(v3(0, -1, 0), lerp(0.4, 1.1, grown)).normalize();
				if (fade < 1) flower(bag, foot, dir, { open, fade, grown, size: x.k, r, turn: r() * 6.28 });
				continue;
			}
			if (!set) continue;
			// the fruit, from the flower's stalk, hanging straight down
			const fd = dd - Fl.openDays;
			const key = [...x.key, 'fruit'];
			bag.fruit(key, foot, v3(0, -1, 0));
			const stalk = fruitStalk(bag, foot, side.clone().addScaledVector(v3(0, -1, 0), 0.6), Math.max(0, fd), r);
			const place = x.keep && DETAIL.level > 0.12 ? space.settle(stalk.end, stalk.dir.clone().lerp(v3(0, -1, 0), 0.7), (c, d) => fruitBalls(c, d), 0.03) : { at: stalk.end, dir: stalk.dir.clone().lerp(v3(0, -1, 0), 0.7).normalize() };
			if (place.at.distanceTo(stalk.end) > 0.001) bag.add('twig', tube([stalk.end, place.at], () => MO.fruit.stalkRadius * 0.9, () => MO.fruit.stalk, 7, false));
			fruitBody(bag, place.at, place.dir, Math.max(0.5, fd), x.k, r, DETAIL.fruit === key.join('|'));
			bag.fruitDone();
		}
	}

	// the leaves: on every node as long as each lives; two rows in one plane on the level shoots, a spiral on the upright
	for (const ax of all) {
		if (ax === trunk && days < hookDays) continue;
		const tr = Math.max(ax.rad[ax.rad.length - 1] ?? 0.002, 0.0012);
		for (const n of ax.nodes) {
			if (n.s > ax.shown + 1e-6) continue;
			const age = t - n.formed;
			const life = Math.min(n.life, ax.died + (ax.removed ? 0 : 0.3) - n.formed, (n.gone ?? Infinity) - n.formed);
			if (age <= 0 || age >= life) continue;
			const r = chance(seedKey, 'leaf', ...ax.key, n.i);
			let out;
			if (n.level) {
				const h = new THREE.Vector3().crossVectors(n.dir, UP);
				if (h.lengthSq() < 1e-6) h.set(1, 0, 0);
				h.normalize().multiplyScalar(n.i % 2 ? 1 : -1);
				out = h.addScaledVector(n.dir, 0.45).normalize();
			} else {
				out = across(n.dir).applyAxisAngle(n.dir, ax.phase + n.i * 2.513).addScaledVector(n.dir, 0.5).normalize();
			}
			const at = n.at.clone().addScaledVector(out, tr);
			// on the level shoots the two rows droop and twist a little each (the sheet's tree: leaves at every angle), on upright ones they ascend
			leaf(bag, { at, out, size: n.size, age, life, r, rise: n.level ? 0.2 : 0.6, droop: n.level ? between(r, -0.05, 0.55) : -0.45, roll: n.level ? about(r, 0, 0.45) : 0 });
		}
	}
	return bag.build();
}
/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the seed sown to mature fruit; `t` the years since sowing each is grown at (between two stages, on
 * the way). The bearing season is the tree's fifth year after planting: the main bloom at B, the fruit mature 150
 * days after its flower opened.
 */
const STAGES = [
	{ name: 'Seed', t: 0, note: 'A fresh seed of the rootstock, washed from the pulp: glossy black, a flattened kidney 18 × 11 × 5.5 mm, 0.45 g, sown 2 cm deep in half shade. A Morada fruit holds some 259 of them.' },
	{ name: 'Germination', t: 20 / 365, note: 'Day 20: germination is epigeal. A thick white root has gone down and the pale green hypocotyl comes up as a hook, pulling the seed out of the soil after it, the seed leaves still inside the coat.' },
	{ name: 'Seedling', t: 42 / 365, note: 'Six weeks, 8 cm: the hook has straightened, two thin oblong seed leaves (about 2 × 1 cm) have opened out of the black coat, which lies on the soil, and the first two true leaves (day 23–30) are out, small, obovate and glossy.' },
	{ name: 'Rootstock', t: 0.99, note: 'A year: the rootstock seedling, 36 cm, its stem 1 cm thick, ready for the top cleft graft at 20–25 cm (S1, S4).' },
	{ name: 'Nursery tree', t: TREE.planted, note: 'Seventeen months, planted out: the Morada scion grown 30 cm from the graft (a slight step 22 cm up) to a slender 0.5 m tree, its leaves spiralled, the newest soft and pale.' },
	{ name: 'Young tree', t: 3.4, note: 'Two years planted: topped at 0.7 m, trained on three or four scaffolds at 30–45° from upright; each shoot grows up and out, bends over and lies out level with its leaves in two flat rows, and a new upright shoot rises from its bend (Troll’s model). About 2.5 m.' },
	{ name: 'Flowering', t: B, note: 'Its fifth year planted: 3.5 m, the rounded head 3.8 m across kept by pruning, the trunk 15 cm. Flowers straight out of the bark of the trunk and the limbs (cauliflory), three thick fleshy yellow-green outer petals spread round three pale inner ones closed over the stamens; most of a cohort opens within a few weeks, some all year.' },
	{ name: 'Fruit set', t: B + 30 / 365, note: 'A month: of the flowers only a few per cent set (1.7–4.8 % naturally, S20); the young fruit are green spiny eggs of 4–5 cm on stout stalks from the bark, some that will drop.' },
	{ name: 'Green fruit', t: B + 95 / 365, note: 'Three months: the fruit half grown, dark glossy green, its soft curved spines close set, in its long pause before the second swell (double-sigmoid growth); about 16 kept, hanging from the trunk and limbs.' },
	{ name: 'Mature', t: B + (MO.fruit.days + MO.flower.openDays) / 365, note: '150 days from flowering: mature Morada fruit, broad hearts about 25 × 16 cm and 3 kg, the skin a dull light yellowish green, the spines spread apart and browning at their tips. Picked so, it softens in 4–6 days to white, juicy, fibrous, acid flesh.' },
];

/** the years since sowing at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => soursopTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one fruit on its own ---- */

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

/** the fruit the tree carries to maturity, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ roots: false, level: 0.6 }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.9);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one fruit at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This tree bears no fruit.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This fruit has not set yet: it is a flower until the season (stage Flowering).');
	const hang = new THREE.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z);
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

/** what the tree is grown with, in the order `build` takes it: stage, seed, detail, and the view (tree or fruit) */
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Tree', 'Fruit'] },
];

const PLANT = {
	id: 'soursop',
	label: "Soursop 'Morada' · Annona muricata",
	latin: "Annona muricata L. 'Morada' (the acid, large-fruited type from Colombia, named in Brazil; Annonaceae) · guanábana Morada · graviola Morada · corossol · soursop",
	note: "The Morada soursop: a small evergreen tree grown in Troll's model (each shoot rising, bending over and lying out level with its leaves in two flat rows, a new shoot rising from its bend), grafted, topped and kept as a rounded head of 3.5 m; glossy dark green obovate leaves, dull yellow-green below; thick fleshy three-petalled yellow-green flowers straight out of the bark of the trunk and limbs; and big heart-shaped spiny fruit, 25 × 16 cm and 3 kg, light dull yellowish green when mature 150 days from the flower, white fibrous acid flesh and some 259 glossy black seeds.",
	from: 'Tree · grafted on a seedling, bearing from its second year planted, full crop from its fifth',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '63056d78dcb9e6ce075aff15ad7ad234e81feb50e9c09b45e91973e992199c91', model: 'fal-ai/nano-banana-pro (+ /edit, two cells pasted back grey-balanced)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from sowing
	// what a world needs to plant it right; data sheet soursop-morada.md, S1–S30
	facts: {
		height: { atPlanting: [0.4, 0.6], at2planted: 2.5, at5planted: 3.5, prunedTo: [2.5, 3.5], unpruned44months: 4.68, mature: [4, 8], unit: 'm' },
		crownWidth: { at9months: 1.21, at3to4: 3.0, at44months: 4.11, at5planted: 3.8, unit: 'm' },
		trunkDiameter: { atGrafting: 0.01, at9months: 0.044, at44monthsUnpruned: 0.172, at5planted: 0.15, mature: [0.15, 0.3], unit: 'm' },
		spacing: [6, 8], // 6 × 6 to 8 × 8 m (Brazil, S1; Colombia 8 × 8, S20)
		shade: 'full sun (nursery under ~50 % shade)',
		climate: 'humid tropics, 22–30 °C, no frost; > 1,000 mm rain with a dry spell at flowering; 0–1,200 m (Colombia 500–1,250 m)',
		years: { grafted: 1, planted: 1.4, firstFlowers: 1.25, firstCrop: 2, fullBearing: 7, productiveLife: [25, 30] },
		architecture: "Troll's model; leaves distichous; steady growth, no distinct flushes",
		leaf: { length: [0.08, 0.16], width: [0.03, 0.07], petiole: [0.003, 0.007], life: 365, unit: 'm, days' },
		flower: { across: 0.038, outerPetal: [0.04, 0.03], innerPetal: [0.028, 0.022], borne: 'trunk, old limbs and twigs', budDays: [50, 100], set: [0.017, 0.048], setHand: 0.5 },
		fruit: { length: 0.247, diameter: 0.158, mass: [2, 4.5], meanMass: 3.0, record: 7, spines: 600, spineLength: [0.003, 0.008], daysFlowerToMature: [115, 180], perTree: [15, 20], pulpShare: 0.84, brix: 16, unit: 'm, kg' },
		seed: { length: 0.0177, width: 0.0108, thick: 0.0055, mass: 0.00046, perFruit: 259, germinationDays: [10, 35], germination: 'epigeal', unit: 'm, kg' },
		yield: { at3: 50, at7: [50, 60], unit: 'kg a tree' },
		roots: { taproot: [1.5, 1.8], feeders: 'shallow, beyond the crown', unit: 'm' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the tree, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'soursop' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'soursop',
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
module.exports.organs = { MO, TREE, seedBean, leaf, slab, flower, fruitBody, fruitStalk, fruitMass, cushion, simulate, thicken, soursopTree, flowerSites, Bag, timeAt, STAGES, surface, lite, detailAt, sound, B };
