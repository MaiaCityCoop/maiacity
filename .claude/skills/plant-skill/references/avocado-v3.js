'use strict';
/*
 * AVOCADO 'FUERTE' — Persea americana Mill. 'Fuerte' (Lauraceae): the Mexican × Guatemalan race hybrid found at
 * Atlixco, Puebla, in 1911, for half a century the avocado of California. Version 3 of plants/avocado: one named
 * cultivar, grown from the seed of its rootstock, budded in the nursery, planted out, and followed through one season
 * of its tenth year from bloom to mature fruit.
 *
 * Its numbers are the Fuerte's where they are measured (Thorp 1992: 2.4 × 3.0 m in its fourth year on 3.7 limbs, 17.7
 * nodes a spring flush; Gregoriou & Kumar, Cyprus: trunk 18.9 cm at 16 years, 21.3 cm at 20, fruit 249–259 g; Kaska
 * et al., Turkey: fruit 106–130 × 65–77 mm, 209–349 g; UPOV TG/97/4: pear-shaped with a neck, smooth green skin with
 * many yellow dots that stays green ripe, a very long leaf stalk; fruit set 0.001–0.031 %, 260–290 days from set to
 * maturity) and the species' otherwise (Rauh's model, flushes, leaf life, the type B flower). Every number with its
 * source: plant-skill's data sheet for it (avocado-fuerte.md, S1–S35).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its wrong panels redrawn, kept on play by its hash (cfdd7b8f…): its leaf and fruit outlines and its
 * colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots, sound()),
 *                   as banana v2 carries it, with the avocado's materials and surfaces: a leaf's pinnate veins, the
 *                   bark's corky plates, the fruit's yellow dots.
 *   2. ORGANS       the avocado's own, each to its measure: the seed and its halves, the leaf, the flower and its
 *                   panicle, the fruit and its stalk, the bark.
 *   3. THE TREE     its axes flush by flush (Rauh's model: every axis grows up in rhythmic flushes, its branches out
 *                   of the buds below each flush's tip), girth by the pipe model, its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in years from sowing the rootstock's seed; a year begins at the bloom (about 1 March).
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
 * corky plates and fissures of old bark, the pale lenticels of young wood, the fruit's yellow dots. Colour pictures
 * multiply the vertex colours, so a picture that lightens (a vein, a dot) is darker everywhere else: its organ's
 * vertex colour is raised by `LIFT[name]` where the picture is laid on, and is as measured where it is not. Bump
 * pictures lift the light. Only at detail 0.5 and over: a crowd far off draws plain colours.
 */
const SURFACES = {};
const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** how much an organ's vertex colour is raised under its picture, which is this much darker than white on average */
const LIFT = { leafMap: 1 / 0.86, twigMap: 1 / 0.86, skinMap: 1 / 0.78, barkMap: 1 / 0.8 };
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
 * 0.5): nine pairs of laterals leaving the midrib at about 45°, curving forward toward the tip as they near the margin
 * and fading into it (the sheet's leaf: 8–10 pairs, the lowest close to the base), a little offset side to side, and
 * a faint net of finer veins between. 0 the blade, 1 on a vein.
 */
function leafVeins(x, y) {
	const a = Math.abs(y - 0.5) * 2;
	const side = y > 0.5 ? 0.028 : 0;
	const pairs = 9;
	// where along the midrib the lateral through this point left it
	const u0 = x - 0.17 * a - 0.16 * Math.pow(a, 2.4) - side;
	const k = (u0 - 0.05) * pairs;
	const near = Math.abs(k - Math.round(k)) / pairs; // in parts of the length
	const on = u0 > 0.02 && u0 < 0.86 && a < 0.94 ? Math.exp(-Math.pow(near / (0.0042 * (1 - 0.6 * a)), 2)) * (1 - smooth((a - 0.75) / 0.2)) : 0;
	const net = Math.pow(1 - Math.abs(tileNoise(x, y, 14, 61, 2, 5) - 0.5) * 2, 6) * 0.18;
	const mid = Math.exp(-Math.pow(a / 0.02, 2));
	return Math.max(on, mid, net * (1 - mid));
}

/**
 * The surfaces, made the first time they are asked for:
 *   leafMap / leafBump   the veins over a whole blade (above)
 *   barkMap / barkBump   0.12 m of old trunk bark: small corky plates 1–2 cm across and 2–4 cm along the trunk, the
 *                        fissures between them dark (the sheet's old swatch: plates [0.47, 0.34, 0.29] linear, the
 *                        fissures [0.07, 0.03, 0.02])
 *   twigMap / twigBump   0.06 m of one- and two-year wood: its small pale lenticels, about 1 mm, a few a cm²
 *   skinMap / skinBump   0.03 m of the fruit's skin: its many small yellow dots, about 0.4 mm, and a fine grain
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(512, 256, (x, y) => {
				const v = leafVeins(x, y);
				const k = 0.84 + 0.16 * v + 0.04 * (tileNoise(x, y, 18, 63) - 0.5);
				return [k, k * (1 + 0.04 * v), k * (1 - 0.05 * v)];
			}, true),
		leafBump: () => picture(512, 256, (x, y) => 0.5 - 0.3 * Math.min(1, leafVeins(x, y) * 1.4) * (1 - 0.6 * smooth((leafVeins(x, y) - 0.25) / -0.2))),
		barkMap: () =>
			picture(512, 512, (x, y) => {
				// x along the trunk, y round it
				const warp = tileNoise(x, y, 5, 71, 2) - 0.5;
				const c = tileCells(x + warp * 0.05, y + warp * 0.08, 4, 8, 73);
				const fissure = 1 - smooth((c.f2 - c.f1) / 0.16);
				const grain = tileNoise(x, y, 6, 75, 3, 30);
				const plate = 0.78 + 0.22 * c.id + 0.12 * (grain - 0.5);
				const k = lerp(plate, 0.16, fissure);
				return [k, k * (0.98 + 0.04 * c.id), k * (0.95 + 0.08 * c.id)];
			}, true),
		barkBump: () =>
			picture(512, 512, (x, y) => {
				const warp = tileNoise(x, y, 5, 71, 2) - 0.5;
				const c = tileCells(x + warp * 0.05, y + warp * 0.08, 4, 8, 73);
				const fissure = 1 - smooth((c.f2 - c.f1) / 0.16);
				return 0.62 - 0.55 * fissure + 0.12 * (tileNoise(x, y, 14, 77, 2, 40) - 0.5) + 0.06 * c.id;
			}),
		twigMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 9, 14, 81);
				const dot = c.id < 0.55 ? smooth((0.17 - c.f1) * 18) : 0;
				const k = 0.84 + 0.04 * (tileNoise(x, y, 8, 83, 2, 24) - 0.5);
				return [lerp(k, 1, dot), lerp(k, 0.98, dot), lerp(k, 0.86, dot)];
			}, true),
		twigBump: () => picture(256, 256, (x, y) => {
			const c = tileCells(x, y, 9, 14, 81);
			return 0.5 + (c.id < 0.55 ? 0.35 * smooth((0.17 - c.f1) * 18) : 0) + 0.05 * (tileNoise(x, y, 20, 85) - 0.5);
		}),
		skinMap: () =>
			picture(512, 512, (x, y) => {
				// x along the fruit, y round it; the dots (the sheet's mature fruit: pale yellow-green, a few to a mm²)
				const c = tileCells(x, y, 30, 30, 91);
				const size = 0.16 + 0.2 * c.id;
				const dot = c.id < 0.75 ? smooth((size - c.f1) * 12) : 0;
				const mottle = 0.04 * (tileNoise(x, y, 4, 93, 2) - 0.5);
				const k = 0.77 + mottle;
				return [lerp(k, 1, dot), lerp(k, 1, dot), lerp(k, 0.62, dot)];
			}, true),
		skinBump: () => picture(256, 256, (x, y) => 0.5 + 0.22 * (tileNoise(x, y, 70, 95, 2) - 0.5) + 0.1 * (tileNoise(x, y, 18, 97, 2) - 0.5)),
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
 * its kind and settings, so no shader code). `leaf` a leaf's two faces, each its own colour (one-sided): leathery, glossy above (a little clearcoat only, or the sky turns the undersides blue), veined;
 * `bark` the trunk and limbs: matt, corky plates and fissures; `twig` young wood: smooth, a faint shine, lenticels;
 * `skin` the fruit: satiny, dotted; `sheet` thin things seen from both sides (the flowers, the seed coat's flakes);
 * `body` the seed, the roots, the stalks and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.04, clearcoatRoughness: 0.55, ...(s && { map: s('leafMap'), bumpMap: s('leafBump'), bumpScale: 0.35 }) }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...(s && { map: s('barkMap'), bumpMap: s('barkBump'), bumpScale: 2.2 }) }),
	twig: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.5, ...(s && { map: s('twigMap'), bumpMap: s('twigBump'), bumpScale: 0.6 }) }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.28, ...(s && { map: s('skinMap'), bumpMap: s('skinBump'), bumpScale: 0.5 }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'twig', 'leaf', 'sheet', 'skin', 'prop'];
// an avocado has thousands of leaves and flowers: a crowd far off draws a part of them, each grown bigger to fill
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
 * 2. ORGANS — the Fuerte's own, each to its measure
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
 * The Fuerte in numbers: sizes in metres from the data sheet (avocado-fuerte.md), outlines and colours traced off the
 * reference sheet (cfdd7b8f…, Nano Banana Pro, 2026-11-05) in linear sRGB, its median as the colour and p10–p90 as
 * each organ's own variation. The sheet's scale bars are not used: every size is the data sheet's.
 */
const FU = {
	seed: {
		length: 0.052, // 50–55 × 40–45 mm, 40–50 g [EST, data sheet: seed]
		width: 0.04,
		out: 0.33, // sown broad end down, its top third out of the soil
		coat: lin(0.36, 0.13, 0.065), // the 'Seed with coat' panel's median (0.42, 0.16, 0.08) a little darker: in the sun it read salmon
		coatDark: lin(0.235, 0.054, 0.024),
		coatLight: lin(0.58, 0.29, 0.2),
		cotyledon: lin(0.74, 0.56, 0.27), // the split stone in 'Germination': cream to pale ochre
		rot: lin(0.16, 0.1, 0.06),
	},
	// the seed's outline off the same panel (52 mm): its width at 24 stations, broad base → tip
	SEED_W: rel([0.26, 1.62, 2.46, 2.97, 3.33, 3.59, 3.8, 3.92, 4.0, 4.04, 4.04, 4.02, 3.96, 3.87, 3.74, 3.58, 3.4, 3.19, 2.93, 2.64, 2.28, 1.83, 1.1, 0.08]),
	leaf: {
		length: 0.17, // blade 14–20 × 6–9 cm [EST from UPOV 'medium', scaled on Hass]; the sheet's 2.07 : 1
		petiole: 0.055, // 'very long' (UPOV): 4.5–6.5 cm [EST]
		up: lin(0.063, 0.091, 0.042), // 'Leaf, upper side': deep glossy green
		upLo: lin(0.037, 0.065, 0.019),
		upHi: lin(0.098, 0.13, 0.074),
		under: lin(0.266, 0.333, 0.296), // 'Leaf, underside': pale, glaucous blue-green
		flush: lin(0.296, 0.082, 0.051), // 'Young flush leaf': red-bronze
		flushHi: lin(0.356, 0.122, 0.08),
		flushUnder: lin(0.36, 0.2, 0.15),
		stalk: lin(0.3, 0.33, 0.09),
		old: lin(0.42, 0.33, 0.05), // yellowing before it falls
		life: [0.75, 1.25], // years: 8–13 months (Hass) [SP]
		expand: 0.05, // years from bud to full size (the flush grows 3–5 weeks)
		green: 0.13, // years from red-bronze to green
	},
	// the blade's outline off 'Leaf, upper side' (blade only, 17.5 cm): its width at 24 stations, base → tip
	LEAF_W: rel([0.59, 2.41, 3.93, 5.1, 6.08, 6.83, 7.41, 7.86, 8.16, 8.32, 8.43, 8.45, 8.41, 8.28, 7.88, 7.49, 7.01, 6.42, 5.69, 4.76, 3.69, 2.17, 0.83, 0.04]),
	leafAspect: 2.07,
	fruit: {
		length: 0.113, // 106–130 × 65–77 mm, 209–349 g (Kaska et al., S10); the model 115 × 70, 280 g
		aspect: 1.62, // the sheet's mature fruit, as the data sheet's 115 : 70
		youngAspect: 1.12,
		days: 275, // set to mature: 260–290 d (S2)
		set: 0.1, // the fruit set, in parts of a year after the bloom's peak (fruit sets 15 Feb–15 May)
		young: lin(0.318, 0.352, 0.07), // the fruitlet just set: bright, light green
		mid: lin(0.12, 0.162, 0.033), // at two months
		ripe: lin(0.072, 0.115, 0.018), // the mature fruit's body (its median; p10 [0.038, 0.063, 0.006])
		neck: lin(0.1, 0.14, 0.035), // a little lighter toward the stalk
		end: lin(0.12, 0.09, 0.03), // the dry style's dot at the blossom end
		stalk: lin(0.34, 0.37, 0.08), // the stalk, yellow-green, thickening to the fruit
		stalkOld: lin(0.22, 0.2, 0.07),
		stalkLength: 0.055, // [EST]
		flesh: lin(0.896, 0.738, 0.292),
	},
	// the fruit's outline off the sheet's mature fruit (body, 10.5 cm): its width at 24 stations, blossom end → stalk
	FRUIT_W: rel([0.27, 2.81, 4.07, 4.92, 5.51, 5.94, 6.21, 6.41, 6.48, 6.45, 6.36, 6.21, 5.96, 5.67, 5.33, 4.9, 4.54, 4.2, 3.91, 3.66, 3.35, 2.88, 1.87, 0.94]),
	bark: {
		shoot: lin(0.13, 0.165, 0.027), // 'Bark swatches': the green young shoot
		red: lin(0.2, 0.04, 0.03), // the seedling's first shoot, dark red ('Germination')
		young: lin(0.185, 0.117, 0.044), // two-year wood: olive-brown, pale lenticels
		grey: lin(0.24, 0.16, 0.12), // the trunk's bark: grey-brown, corky plates
		plate: lin(0.36, 0.27, 0.22),
		root: lin(0.2, 0.12, 0.07),
	},
	flower: {
		tepal: lin(0.53, 0.44, 0.17), // "Female flower", measured on the bench: yellow-green, green at the base
		base: lin(0.28, 0.36, 0.07),
		anther: lin(0.78, 0.48, 0.1),
		nectary: lin(0.85, 0.42, 0.05),
		stigma: lin(0.88, 0.9, 0.82),
		axis: lin(0.33, 0.38, 0.1), // the panicle's axes: yellow-green, finely hairy
		dry: lin(0.3, 0.24, 0.1),
	},
	root: { young: lin(0.85, 0.78, 0.62), old: lin(0.37, 0.147, 0.072) }, // the sheet's seedling roots: cream turning brown
};

/* ---- the seed ---- */

/**
 * Half of the seed: one cotyledon, its coat outside and its flat face inside, the base at the origin and its tip up
 * +Y, the flat face in the plane z = 0 on the side `side` (+1 or −1). `paint(u, a)` its coat (u base → tip, a 0 … 1
 * round the half), `inner` its flat face.
 */
function halfSeed(L, W, side, paint, inner, along = 24, round = 12) {
	along = fewer(along, 6);
	round = fewer(round, 4);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const R = (u) => (W / 2) * station(FU.SEED_W, u);
	// the coat: half a lathe
	for (let i = 0; i <= along; i++) {
		const u = i / along, r = R(u);
		for (let j = 0; j <= round; j++) {
			const a = (j / round) * Math.PI;
			const x = Math.cos(a), z = Math.sin(a) * side;
			pos.push(r * x, u * L, r * z);
			nor.push(x, 0, z);
			uv.push(u, j / round);
			const c = toColor(paint(u, j / round));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < along; i++)
		for (let j = 0; j < round; j++) {
			const a = i * (round + 1) + j, b = a + round + 1;
			if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
			else idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	// the flat face, a little inside the rim
	const base = pos.length / 3, cols = 4;
	for (let i = 0; i <= along; i++) {
		const u = i / along, r = R(u) * 0.97;
		for (let j = 0; j <= cols; j++) {
			const x = ((j / cols) * 2 - 1) * r;
			pos.push(x, u * L, 0);
			nor.push(0, 0, -side);
			uv.push(u, j / cols);
			const c = toColor(inner(u, j / cols));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < along; i++)
		for (let j = 0; j < cols; j++) {
			const a = base + i * (cols + 1) + j, b = a + cols + 1;
			if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
			else idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	return smoothNormals(made(pos, nor, uv, col, idx, false));
}

/**
 * The seed (the stone) as sown: broad end down, `at` its base, its brown papery coat flaking in places; `split` 0 … 1
 * how far its two cotyledons have opened from the base as it germinates, `spent` 0 … 1 how far they have shrunk and
 * darkened as the seedling has drawn on them.
 */
function seed(bag, at, split, spent, seedKey) {
	const S = FU.seed;
	const ns = hashText(seedKey) % 997;
	const r = chance(seedKey, 'seed');
	const k = about(r, 1, 0.05);
	const L = S.length * k * lerp(1, 0.9, spent), W = S.width * k * lerp(1, 0.86, spent);
	const turn = r() * Math.PI * 2;
	const coat = (u, a, side) => {
		const n = fbm(Math.cos(a * Math.PI) * 3 + side * 7, u * 5, Math.sin(a * Math.PI) * 3, 3, ns);
		const flake = smooth((fbm(a * 4 + side * 3, u * 6, 1, 2, ns + 5) - 0.58) / 0.08); // the papery coat torn away
		const c = mix(S.coatDark, S.coatLight, n * 1.3 - 0.15).lerp(S.coat, 0.55);
		c.lerp(lin(0.46, 0.2, 0.1), flake * 0.6); // the seed showing chestnut under the torn coat
		return c.lerp(S.rot, spent * 0.7);
	};
	const inner = (u, a) => mix(S.cotyledon, lin(0.6, 0.42, 0.18), Math.abs(a - 0.5) * 1.4).lerp(S.rot, spent * 0.6);
	const open = split * 0.16; // radians each half turns away from the other, hinged at its base
	for (const side of [1, -1]) {
		const g = halfSeed(L, W, side, (u, a) => coat(u, a, side), inner);
		const m = new THREE.Matrix4()
			.makeTranslation(at.x, at.y, at.z)
			.multiply(new THREE.Matrix4().makeRotationY(turn))
			.multiply(new THREE.Matrix4().makeTranslation(0, 0, side * split * 0.002))
			.multiply(new THREE.Matrix4().makeRotationX(side * open));
		bag.add('body', g, m);
	}
	return { L, W, turn };
}

/* ---- the leaf ---- */

/** the blade's half width at u (0 base … 1 tip), as a part of its greatest: the sheet's traced outline */
const leafHalf = (u) => station(FU.LEAF_W, u);

/**
 * One leaf at a node: its long slender petiole from the shoot's surface at `at`, out along `out` and rising, then the
 * blade, held out and drooping a little, folded slightly along its midrib, its margin a little wavy, its tip bent
 * down. `size` its blade's length as a part of the grown leaf's, `age` years since its node formed, `life` years it
 * lives; young it is limp, hanging and red-bronze (the flush), green and firm in about seven weeks, yellow before it
 * falls. `scale` a scale leaf (the seedling's first nodes): a small brown scale only.
 */
function leaf(bag, o) {
	const F = FU.leaf;
	const { at, out, size, age, life, r } = o;
	if (age <= 0 || age >= life) return;
	const expand = smooth(age / F.expand);
	const greening = smooth(age / F.green);
	const yellow = smooth((age - (life - 0.06)) / 0.06);
	if (o.scale) {
		// a scale leaf: a small pointed brown-green scale against the stem, dropping in a few months
		if (age > 0.4) return;
		const g = sheet({ length: 0.006, width: 0.0025, shape: (u) => Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u * 0.5), paint: () => lin(0.25, 0.12, 0.05), along: 2, across: 1 });
		bag.add('sheet', g, aim(at, out.clone().addScaledVector(UP, 2).normalize()));
		return;
	}
	const L = F.length * size * lerp(0.25, 1, expand);
	const W = L / FU.leafAspect / 2;
	const P = F.petiole * size * lerp(0.35, 1, expand);
	// the petiole: out and up (young: limp, down), curving over under the blade's weight
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const rise = o.flat ? 0 : lerp(-0.55, 0.62, greening) + about(r, 0, 0.18);
	const pDir = flat.clone().multiplyScalar(Math.cos(rise)).addScaledVector(UP, Math.sin(rise)).normalize();
	const bend = o.flat ? 0 : lerp(0.8, 0.45, greening) + about(r, 0, 0.15); // the petiole bends down along it
	const pts = [at.clone()];
	// the petiole: a slender straight stalk, bending at its foot (one segment: a crown has many thousands)
	pts.push(at.clone().addScaledVector(pDir.clone().lerp(flat.clone().multiplyScalar(Math.cos(rise - bend)).addScaledVector(UP, Math.sin(rise - bend)), 0.5).normalize(), P));
	const end = pts[1];
	const k = r();
	const colour = (u, v, back) => {
		const green = back ? F.under : mix(F.upLo, F.upHi, 0.35 + k * 0.5);
		const red = back ? F.flushUnder : mix(F.flush, F.flushHi, k);
		const c = mix(red, green, greening).lerp(F.old, yellow);
		return c.multiplyScalar(lifted('leafMap'));
	};
	const stalkColour = mix(F.flush, F.stalk, greening).lerp(F.old, yellow);
	const petiole = tube(pts, (u) => lerp(0.0016, 0.0011, u) * lerp(0.6, 1, expand), () => stalkColour, 3, false);
	// the blade: out from the petiole's end, drooping; young it hangs nearly straight down
	const droop = o.flat ? 0.1 : lerp(1.25, 0.32, greening) + about(r, 0, 0.18) + 0.25 * yellow;
	const bDir = flat.clone().multiplyScalar(Math.cos(-droop + 0.1)).addScaledVector(UP, Math.sin(-droop + 0.1)).normalize();
	const wave = r() * 6.283;
	const g = sheet({
		length: L,
		width: W,
		shape: leafHalf,
		lift: o.flat ? () => 0 : (u, v) => 0.035 * Math.abs(v) * (1 - 0.6 * u) - 0.07 * u * u * lerp(1.6, 1, greening) + 0.008 * Math.sin(u * 15 + wave) * v * v,
		paint: (u, v) => colour(u, v, false),
		back: (u, v) => colour(u, v, true),
		along: 5,
		across: 2,
	});
	// a leathery leaf lets little light through: its underside lit as itself, facing down, not as the face above it
	const nor = g.attributes.normal, half = nor.count / 2;
	for (let i = 0; i < half; i++) nor.setXYZ(half + i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
	g.applyMatrix4(aim(end, bDir, o.flat ? 0 : about(r, 0, 0.35)));
	// far off, the blade alone: its slender petiole is not seen
	if (DETAIL.level < 0.5) {
		petiole.dispose();
		bag.add('leaf', g);
		return;
	}
	const both = mergeGeometries([petiole, g]);
	petiole.dispose();
	g.dispose();
	if (both) bag.add('leaf', both);
}

/* ---- the flower ---- */

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
 * One flower, close up (the sheet's three flower panels): six greenish-cream tepals in two whorls of three, nine
 * stamens in three whorls, the inner three with an orange nectary gland at their foot, and one pistil, its single
 * small white stigma on a slender style. Type B: `phase` 'female' (the first afternoon: tepals spread, stamens bent
 * out and lying back on them, anthers closed, the stigma white) or 'male' (the next morning: stamens erect round the
 * pistil, anthers open and yellow, the stigma spent). From `at` along `dir`; `open` 0 … 1.
 */
function flower(bag, at, dir, o) {
	const Fl = FU.flower;
	const { phase = 'female', open = 1, r = chance('flower') } = o;
	const male = phase === 'male';
	const m = aim(at, dir);
	const local = (x, y, z) => v3(x, y, z).applyMatrix4(m);
	const ax = dir.clone().normalize();
	const side0 = across(ax).applyAxisAngle(ax, o.turn ?? 0);
	// the pedicel and the receptacle
	bag.add('twig', tube([local(-0.004, 0, 0), local(-0.0015, 0, 0), local(0, 0, 0)], (u) => lerp(0.00042, 0.0006, u), () => Fl.base, 6, false));
	for (let k = 0; k < 6; k++) {
		const inner = k % 2 === 1;
		const bearing = (k / 6) * Math.PI * 2;
		const side = side0.clone().applyAxisAngle(ax, bearing);
		const spread = open * (male ? 1.15 : 1.25) + about(r, 0, 0.05);
		const d = ax.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)).normalize();
		const len = (inner ? 0.0042 : 0.0048) * about(r, 1, 0.04);
		const g = sheet({
			length: len,
			width: len * 0.25,
			// elliptic, broadest a little past the middle, its tip rounded (the sheet's female flower)
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(0.985, 0.05 + u * 0.95)), 0.5) * (0.7 + 0.3 * u),
			lift: (u, v) => 0.12 * v * v - 0.1 * u * u,
			paint: (u) => mix(Fl.base, Fl.tepal, smooth(u / 0.4)),
			along: 5,
			across: 2,
		});
		bag.add('sheet', g, aimFace(at.clone().addScaledVector(ax, inner ? 0.0007 : 0.0005), d, ax));
	}
	// the stamens: outer six before the tepals, inner three between, with their glands
	for (let k = 0; k < 9; k++) {
		const inner = k >= 6;
		const bearing = inner ? ((k - 6) / 3) * Math.PI * 2 + Math.PI / 6 : (k / 6) * Math.PI * 2;
		const side = side0.clone().applyAxisAngle(ax, bearing);
		// female: bent out and lying back over the tepals' bases; male: standing up round the pistil
		const lean = male ? (inner ? 0.3 : 0.55) : inner ? 1.05 : 1.3;
		const d = ax.clone().multiplyScalar(Math.cos(lean * open)).addScaledVector(side, Math.sin(lean * open)).normalize();
		const foot = at.clone().addScaledVector(ax, 0.0009).addScaledVector(side, 0.0011);
		const len = (male ? 0.003 : 0.0013) * about(r, 1, 0.05);
		const tip = foot.clone().addScaledVector(d, len);
		bag.add('body', tube([foot, foot.clone().lerp(tip, 0.5), tip], () => 0.00016, () => mix(Fl.tepal, Fl.base, 0.2), 4, false));
		const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
		bag.add('body', bead(tip.clone().addScaledVector(d, 0.0007), v3(0.00042, 0.00105, 0.00036), male ? Fl.anther : mix(Fl.anther, Fl.tepal, 0.35), 5, q));
		if (inner) bag.add('body', bead(foot.clone().addScaledVector(side, 0.0003), v3(0.00045, 0.0004, 0.00045), Fl.nectary, 4));
	}
	// the pistil: the ovary, the style, one stigma
	const ov = at.clone().addScaledVector(ax, 0.0012);
	bag.add('body', bead(ov, v3(0.00105, 0.0013, 0.00105), lin(0.45, 0.55, 0.22), 6, new THREE.Quaternion().setFromUnitVectors(UP, ax)));
	const top = ov.clone().addScaledVector(ax, 0.0036);
	bag.add('body', tube([ov.clone().addScaledVector(ax, 0.0009), top], (u) => lerp(0.00026, 0.00018, u), () => mix(lin(0.55, 0.62, 0.35), Fl.stigma, 0.5), 5, false));
	bag.add('body', bead(top, v3(0.00036, 0.00028, 0.00036), male ? lin(0.42, 0.32, 0.16) : Fl.stigma, 5));
}

/**
 * A flower as the tree carries it, by the thousand: a small six-pointed star cupped along `dir` (a cymule's open
 * flowers as one), its tips cream and its heart yellow-green with the anthers; `open` 0 a bud, 1 open, `fade` 0 … 1
 * withering. Twelve triangles.
 */
function blossom(bag, at, dir, size, open, fade) {
	const Fl = FU.flower;
	const ax = dir.clone().normalize();
	const s0 = across(ax);
	const R = 0.0055 * size * lerp(0.35, 1, open);
	const pos = [], col = [], idx = [];
	const heart = mix(lin(0.55, 0.5, 0.12), Fl.dry, fade);
	const tip = mix(Fl.tepal, Fl.dry, fade);
	const c0 = at.clone().addScaledVector(ax, R * 0.25);
	pos.push(c0.x, c0.y, c0.z);
	col.push(heart.r, heart.g, heart.b);
	for (let k = 0; k < 12; k++) {
		const point = k % 2 === 0;
		const rr = point ? R : R * 0.38;
		const lift = point ? R * lerp(1.1, 0.25, open) : R * 0.15;
		const d = s0.clone().applyAxisAngle(ax, (k / 12) * Math.PI * 2);
		const p = at.clone().addScaledVector(d, rr).addScaledVector(ax, lift);
		pos.push(p.x, p.y, p.z);
		const c = point ? tip : mix(heart, tip, 0.5);
		col.push(c.r, c.g, c.b);
	}
	for (let k = 0; k < 12; k++) idx.push(0, 1 + k, 1 + ((k + 1) % 12));
	const g = made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true);
	bag.add('sheet', g);
}

/**
 * A panicle at a shoot's tip (the sheet's 'Flowering shoot tip'): six racemes from the axils of the top nodes, each
 * 7–12 cm, yellow-green and finely hairy, carrying its cymules from a third of the way out; the new shoot grows on out
 * of its middle (indeterminate). `phase` −0.25 … 0.3 years from the bloom's peak: buds, flowers opening, withering,
 * the bare axes falling; `keep` the raceme a fruit hangs from stays. Returns where a fruit may hang: the racemes' feet.
 */
function panicle(bag, seedKey, key, at, dir, phase, ns) {
	const Fl = FU.flower;
	const r = chance(seedKey, 'panicle', ...key);
	const feet = [];
	const grown = span(phase, -0.16, -0.06);
	const open = span(phase, -0.08, -0.02);
	const fade = span(phase, 0.05, 0.14);
	const gone = phase > 0.2;
	const n = 5 + Math.floor(r() * 3);
	const ax = dir.clone().normalize();
	if (phase < 0 && grown < 0.3) {
		// winter: the inflorescence bud at the shoot's tip, swelling, its scales green-bronze
		const k = lerp(0.6, 1.3, span(phase, -0.3, -0.12));
		bag.add('body', bead(at.clone().addScaledVector(ax, 0.006 * k), v3(0.0042 * k, 0.0075 * k, 0.0042 * k), lin(0.22, 0.2, 0.06), 4, new THREE.Quaternion().setFromUnitVectors(UP, ax)));
		return feet;
	}
	const s0 = across(ax);
	for (let k = 0; k < n; k++) {
		const bearing = k * 2.4 + r() * 0.5;
		const side = s0.clone().applyAxisAngle(ax, bearing);
		const tilt = between(r, 0.65, 1.1);
		const d0 = ax.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt)).normalize();
		const len = between(r, 0.07, 0.12) * lerp(0.15, 1, grown);
		const foot = at.clone().addScaledVector(ax, -0.004 * k);
		feet.push({ at: foot, dir: d0.clone() });
		if (gone || grown <= 0) {
			r(), r(), r();
			continue;
		}
		const pts = [foot];
		let d = d0.clone();
		for (let i = 1; i <= 4; i++) {
			d.y -= 0.12 * (1 - fade * 0.3);
			d.normalize();
			pts.push(pts[i - 1].clone().addScaledVector(d, len / 4));
		}
		const axisColour = mix(Fl.axis, Fl.dry, fade);
		bag.add('twig', tube(pts, (u) => lerp(0.0013, 0.0006, u), () => axisColour, 3, false));
		if (fade >= 1 || grown < 0.5) continue;
		const cymes = DETAIL.level < 0.5 ? 2 : 6; // far off, a raceme's flowers drawn as two clusters, each larger
		for (let i = 0; i < cymes; i++) {
			const u = 0.3 + (0.7 * i) / (cymes - 1);
			const x = u * 4;
			const j = Math.min(3, Math.floor(x));
			const p = pts[j].clone().lerp(pts[j + 1], x - j);
			const along = pts[j + 1].clone().sub(pts[j]).normalize();
			const out = across(along).applyAxisAngle(along, i * 2.1 + bearing);
			const fd = out.clone().addScaledVector(UP, 0.8).addScaledVector(along, 0.4).normalize();
			const at2 = p.clone().addScaledVector(out, 0.004);
			blossom(bag, at2, fd, about(r, 1.15, 0.12) * lerp(0.5, 1, grown) * (cymes < 6 ? 1.6 : 1), open * (1 - 0.3 * fade), fade);
		}
	}
	return feet;
}

/* ---- the fruit ---- */

/** the fruit's length, as a part of its mature length, by days since set: one long sigmoid, fastest Jul–Oct (S2) */
const fruitLength = (d) => straight(d, [[0, 0.07], [20, 0.14], [45, 0.3], [80, 0.48], [130, 0.72], [175, 0.88], [220, 0.96], [275, 1], [320, 1.02]]);

/**
 * One fruit hanging from its stalk: built from `top` (where the stalk joins it) down along `dir`: its profile the
 * sheet's traced outline, a round fruitlet growing a neck as it lengthens (its aspect 1.12 to 1.62), its broad end a
 * little lopsided and the stalk joining it a little off its axis (UPOV); its skin dark green with many small yellow
 * dots, lighter toward the neck; a fruitlet bright light green. `days` since set, `k` its own size.
 */
function fruitBody(bag, top, dir, days, k, r, fine) {
	const Fr = FU.fruit;
	const g = fruitLength(days) * k;
	const L = Fr.length * g;
	const aspect = lerp(Fr.youngAspect, Fr.aspect, span(days, 15, 160));
	const W = L / aspect;
	const neck = span(days, 25, 170); // how far the pear's neck has formed
	const d = dir.clone().normalize();
	const side = across(d).applyAxisAngle(d, r() * 6.283);
	// a fruitlet the size of a pea needs few rings; the fruit grown, more
	const rings = fine ? 72 : fewer(Math.round(lerp(8, 22, g)), 6);
	const sides = fine ? 48 : Math.round(lerp(8, 15, g));
	const pts = [];
	for (let i = 0; i <= rings; i++) {
		const u = i / rings; // 0 at the stalk, 1 at the blossom end
		const lop = 0.05 * W * Math.pow(u, 2.2); // the broad end set a little to one side
		pts.push(top.clone().addScaledVector(d, u * L).addScaledVector(side, lop - 0.02 * W));
	}
	const round = (x) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * x - 1, 2))); // a fruitlet's ellipse, 0 … 1 … 0
	const radius = (u) => {
		const x = 1 - u; // 0 blossom end … 1 stalk end, as the trace runs
		const pear = station(FU.FRUIT_W, x);
		const ell = Math.max(round(x), x > 0.9 ? 0.25 : 0);
		const w = lerp(ell, pear, neck);
		return (W / 2) * (u > 0.995 ? 0 : w);
	};
	const base = mix(mix(Fr.young, Fr.mid, span(days, 0, 60)), Fr.ripe, span(days, 50, 200));
	const ownK = about(r, 1, 0.06);
	const lift = lifted('skinMap');
	const paint = (u, v) => {
		const c = base.clone().multiplyScalar(ownK).lerp(mix(Fr.young, Fr.neck, span(days, 0, 120)), 0.25 * smooth((0.25 - u) / 0.25));
		if (u > 0.985) c.lerp(Fr.end, 0.8);
		return c.multiplyScalar(lift);
	};
	const geo = tube(pts, (u) => radius(u), paint, sides, true);
	metric(geo, L / 0.03, (Math.PI * W) / 0.03);
	bag.add('skin', geo);
	return { L, W };
}

/** the fruit's stalk, from `at` on the panicle out along `dir` and hanging over, thickening toward the fruit */
function fruitStalk(bag, at, dir, len, days, r) {
	const Fr = FU.fruit;
	const pts = [at.clone()];
	let d = dir.clone().normalize();
	const n = 6;
	for (let i = 1; i <= n; i++) {
		d.lerp(v3(0, -1, 0), 0.35).normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, len / n));
	}
	const thick = lerp(0.6, 1, span(days, 0, 120));
	const colour = mix(Fr.stalk, Fr.stalkOld, span(days, 90, 260) * 0.6);
	bag.add('twig', tube(pts, (u) => thick * lerp(0.0021, 0.0042, Math.pow(u, 2.5)), () => colour, 7, false));
	return { end: pts[n], dir: d };
}

/** the fruit's shape for `Space`: balls along it from where it hangs, for its mature size */
function fruitBalls(top, dir) {
	const Fr = FU.fruit;
	const L = Fr.length, W = L / Fr.aspect;
	const d = dir.clone().normalize();
	return [
		{ c: top.clone().addScaledVector(d, L * 0.25), r: W * 0.3 },
		{ c: top.clone().addScaledVector(d, L * 0.55), r: W * 0.45 },
		{ c: top.clone().addScaledVector(d, L * 0.78), r: W * 0.46 },
	];
}
/* ================================================================================================================
 * 3. THE TREE — its axes flush by flush, its girth, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A Fuerte budded onto a Mexican-race seedling in its seventh month, planted out at
 * fourteen months, grown in the open in a frost-free garden. Rauh's model: every axis grows upward in rhythmic
 * flushes (the seedling's four in its first year in the nursery, then three a year while young and two when grown: a
 * spring flush out of the bloom and a summer one), and its branches come from the buds just below a flush's tip, so
 * they grow in loose tiers. The Fuerte spreads: its limbs leave a short trunk at 50–60° from upright and arch over,
 * the crown wider than tall (Thorp: 2.4 × 3.0 m in its fourth year, on 3.7 limbs).
 */
const TREE = {
	// the nursery: the rootstock seedling's flushes (start, length of the leader, days it grows), budded at 7 months
	seedling: [
		{ ts: 0.05, len: 0.2, dur: 0.17 },
		{ ts: 0.33, len: 0.22, dur: 0.1 },
		{ ts: 0.6, len: 0.18, dur: 0.1 },
		{ ts: 0.84, len: 0.22, dur: 0.1 },
	],
	graft: { h: 0.2, t: 0.58 },
	scaffolds: { ts: 1.42, n: 4, low: 0.42, high: 0.85 }, // the limbs, from the trunk's buds the first summer out
	calendar: (y) => (y < 5 ? [[0.1, 'spring'], [0.42, 'summer'], [0.68, 'autumn']] : [[0.1, 'spring'], [0.42, 'summer']]),
	dur: 0.09, // a flush grows 3–5 weeks
	internode: 0.022, // a spring flush of 0.3–0.4 m carries ~17.7 nodes (Thorp)
	cell: 0.6, // the grid the crown's shoot tips are counted in
	cap: 5, // a tip with more tips than this in its cell makes no new branch
	crowd: 10, // and with more than this it is shaded out and stops
	maxOrder: 9,
	tipRadius: 0.0021,
	pipe: 2.5,
	firstBloom: 3, // flowers from the third year after planting (S12) — here the spring of its fourth year from sowing
};

/** the trunk's diameter at 30 cm by age (years from sowing): nursery 1–2 cm, Cyprus 18.9 cm at 16 y, 21.3 at 20 */
const TRUNK_D = [[0, 0.003], [0.25, 0.006], [0.6, 0.01], [1.17, 0.016], [2, 0.03], [3.6, 0.07], [6, 0.11], [10, 0.16], [16, 0.19], [20, 0.213]];

/**
 * The room the crown grows into by age, from the data sheet: its height, its radius and how low its skirt comes
 * (4th year 2.4 × 3.0 m on a short trunk; 10th year 5–6.5 × 7–8 m, skirted nearly to the ground; 20th 8–10 × 12 m).
 * A dome above its widest, about half way up, and below that sides falling nearly straight to the skirt. Shoots grow
 * toward the light into it: a shoot meeting its edge turns along it, and one far past it stops (where the light is
 * taken by its neighbours) — the Fuerte's dense dome, not a vase.
 */
const CROWN = { height: [[1, 1.0], [2, 1.5], [3.6, 2.45], [6, 3.6], [10, 5.9], [20, 9]], radius: [[1, 0.3], [2, 0.7], [3.6, 1.5], [6, 2.3], [10, 3.75], [20, 6]], skirt: [[2, 0.5], [3.6, 0.55], [6, 0.4], [10, 0.25]] };
function crownAt(t) {
	const H = straight(t, CROWN.height), R = straight(t, CROWN.radius), yb = straight(t, CROWN.skirt);
	return { H, R, yb, yc: lerp(yb, H, 0.33) };
}
/** how far a place is out of the crown's room: under 1 inside, 1 on its edge; and the way out of it there */
function crownOut(c, p) {
	// below its widest the crown draws in a little toward its skirt
	const under = clamp((c.yc - p.y) / Math.max(0.1, c.yc - c.yb));
	const rr = Math.hypot(p.x, p.z) / (c.R * (1 - 0.14 * under * under));
	const up = Math.max(0, p.y - c.yc) / Math.max(0.1, c.H - c.yc);
	const down = Math.max(0, c.yb + 0.15 - p.y) / 0.3;
	const f = Math.sqrt(rr * rr + up * up) + down * down;
	const n = v3(p.x / c.R, (up / Math.max(0.1, c.H - c.yc)) * c.R - down, p.z / c.R);
	if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
	return { f, n: n.normalize() };
}

/** the flush events up to time t, in the order they happen (the same list at every t, cut where t is) */
function flushEvents(t) {
	const list = [];
	TREE.seedling.forEach((e, i) => e.ts <= t && list.push({ ...e, kind: 'seed', i }));
	for (let y = 1; y <= Math.floor(t); y++) for (const [f, kind] of TREE.calendar(y)) if (y + f <= t) list.push({ ts: y + f, dur: TREE.dur, kind, year: y });
	return list;
}

/** how far a flush has grown at t: the seedling's first slowly out of the seed, the others eased */
const flushGrown = (e, t) => (e.kind === 'seed' && e.i === 0 ? Math.pow(clamp((t - e.ts) / e.dur), 1.2) : span(t, e.ts, e.ts + e.dur));

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

/** an axis's length at time t: its flushes as far as grown */
function lengthAt(ax, t) {
	let s = 0;
	for (const f of ax.flushes) if (t > f.e.ts) s = Math.max(s, f.s0 + (f.s1 - f.s0) * flushGrown(f.e, t));
	return s;
}

/**
 * The tree's axes, simulated flush by flush up to time t. Each decision (a new branch, a shoot shaded out) is made at
 * a flush's start from what the tree was then, and each axis draws its own chance, so the tree at an earlier t is the
 * first part of the tree at a later one; the flush growing at t is laid out whole and drawn as far as it has grown.
 */
function simulate(seedKey, t) {
	const all = [];
	const tr = chance(seedKey, 'tree');
	const vigourTree = about(tr, 1, 0.06);
	const leanA = tr() * Math.PI * 2;
	const lean = v3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(0.04 + tr() * 0.04);
	const make = (key, parent, sp, from, dir, e, order, vigour) => {
		const ax = { key, parent, sp, order, vigour, born: e ? e.ts : 0, pts: [from.clone()], dir0: dir.clone().normalize(), d: dir.clone().normalize(), nodes: [], flushes: [], len: 0, alive: true, died: Infinity, kids: [], r: chance(seedKey, 'axis', ...key) };
		ax.phase = ax.r() * Math.PI * 2;
		all.push(ax);
		if (parent) parent.kids.push(ax);
		return ax;
	};
	const trunk = make(['trunk'], null, 0, v3(0, -0.012, 0), UP, null, 0, 1);

	const cellOf = (p) => `${Math.floor(p.x / TREE.cell)},${Math.floor(p.y / TREE.cell)},${Math.floor(p.z / TREE.cell)}`;
	const tipOf = (ax) => ax.pts[ax.pts.length - 1];

	/** one flush of one axis: its length, its path step by step, its nodes */
	const grow = (ax, e) => {
		const r = ax.r;
		let len;
		if (e.kind === 'seed') len = ax.order === 0 ? e.len * about(r, 1, 0.06) : 0.06 * ax.vigour;
		else {
			const y = e.ts;
			const base = y < 2 ? 0.4 : y < 4 ? 0.37 : y < 7 ? 0.36 : 0.33;
			const kind = e.kind === 'spring' ? 1.08 : e.kind === 'summer' ? 0.95 : 0.68;
			const lead = ax.order === 0 ? (e.ts >= TREE.scaffolds.ts ? 0.5 : 0.75) : 1;
			len = base * kind * lead * Math.pow(0.88, Math.max(0, ax.order - 2)) * ax.vigour * vigourTree * about(r, 1, 0.15);
		}
		if (len < 0.015) {
			r();
			return;
		}
		const s0 = ax.len;
		const steps = Math.max(2, Math.ceil(len / 0.03));
		const room = crownAt(e.ts + e.dur);
		let made = 0;
		for (let k = 0; k < steps; k++) {
			const p = tipOf(ax);
			const d = ax.d;
			if (ax.order === 0) d.add(v3(lean.x * 0.12 + about(r, 0, 0.04), 0.3, lean.z * 0.12 + about(r, 0, 0.04)));
			else {
				// each limb keeps its heading, rises a little to the light, leans out of the crown, and bends down
				// under its own length as it grows (the Fuerte's limbs arch over into a skirt)
				const out = p.clone().setY(0);
				if (out.lengthSq() > 1e-6) out.normalize();
				// the lower crown's shoots hang out over the skirt, the upper ones keep rising
				const low = 1 - smooth((p.y - 1.2) / 1.6);
				const sag = Math.min(0.12, 0.0075 * ax.len * (1 + 0.3 * ax.order)) * lerp(0.45, 1.7, low);
				d.addScaledVector(ax.dir0, 0.04).addScaledVector(out, 0.018);
				d.y += (ax.order === 1 ? 0.036 : 0.03) * lerp(1.7, 0.8, low) - sag;
				d.x += about(r, 0, 0.05);
				d.z += about(r, 0, 0.05);
				// the skirt rests just off the ground
				if (p.y < 0.45 && d.y < 0) d.y *= 0.5;
				if (p.y < 0.22) d.y = Math.max(d.y, 0.06);
			}
			d.normalize();
			if (e.kind !== 'seed') {
				// the crown's edge: a shoot meeting it turns along it; one already well past it stops
				const out = crownOut(room, p);
				if (out.f > 1.06 && k > 0) break;
				if (out.f > 0.92) {
					const into = d.dot(out.n);
					if (into > 0) d.addScaledVector(out.n, -into * smooth((out.f - 0.92) / 0.12)).normalize();
				}
			}
			ax.pts.push(p.clone().addScaledVector(d, len / steps));
			made++;
		}
		len = (len / steps) * made;
		if (made === 0) {
			ax.flushes.push({ e, s0, s1: s0 });
			return;
		}
		ax.len = s0 + len;
		ax.pathLen = null;
		// its nodes: crowded toward the flush's tip, two fifths of a turn apart
		const first = e.kind === 'seed' && e.i === 0;
		const n = first ? 11 : Math.round(clamp(len / TREE.internode, 3, 18));
		const size = e.kind === 'seed' ? [0.6, 0.76, 0.86, 0.92][e.i] : e.ts < 2 ? 0.95 : 1;
		const flushI = ax.flushes.length;
		for (let j = 1; j <= n; j++) {
			const s = s0 + len * Math.pow(j / n, 0.8);
			const p = pointAt(ax, s);
			const i = ax.nodes.length;
			ax.nodes.push({
				i,
				s,
				at: p.at,
				dir: p.dir,
				flush: flushI,
				formed: e.ts + e.dur * Math.pow(j / n, 0.9) * 0.9,
				bearing: ax.phase + i * 2.513,
				size: size * about(r, 1, 0.08),
				life: between(r, FU.leaf.life[0], FU.leaf.life[1]),
				scale: first && j <= 5,
			});
		}
		ax.flushes.push({ e, s0, s1: ax.len });
	};

	/** the branches a shoot puts out at a flush, from the buds below its last flush's tip */
	const branch = (ax, e, tips) => {
		const r = ax.r;
		const roll = r();
		if (!ax.flushes.length || e.kind === 'seed' || ax.order >= TREE.maxOrder) return;
		const last = ax.nodes.filter((n) => n.flush === ax.flushes.length - 1);
		if (last.length < 2) return;
		const young = e.ts < 5;
		const P = young ? [0.15, 0.55, 0.88, 1] : [0.18, 0.6, 0.9, 1];
		let n = P.findIndex((p) => roll < p);
		if (ax.vigour < 0.42) n = Math.min(n, 1);
		for (let k = 0; k < n; k++) {
			const node = last[Math.max(0, last.length - 1 - k - Math.floor(r() * 2))];
			const side = across(node.dir).applyAxisAngle(node.dir, node.bearing);
			const out = node.at.clone().setY(0);
			if (out.lengthSq() > 1e-4) side.lerp(out.normalize(), 0.3).normalize();
			const angle = between(r, 0.45, 0.85);
			const d0 = node.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
			const vig = ax.vigour * between(r, 0.62, 0.88);
			if ((tips.get(cellOf(node.at)) ?? 0) >= TREE.cap || vig < 0.3) continue;
			make([...ax.key, node.i], ax, node.s, node.at, d0, e, ax.order + 1, vig);
		}
	};

	for (const e of flushEvents(t)) {
		// the tips as they stand, counted in the crown's cells
		const tips = new Map();
		for (const ax of all) if (ax.alive) tips.set(cellOf(tipOf(ax)), (tips.get(cellOf(tipOf(ax))) ?? 0) + 1);
		const now = all.filter((ax) => ax.alive);
		if (e.ts === TREE.scaffolds.ts) {
			// the scaffold limbs, from the trunk's buds between 42 and 85 cm, round it
			const S = TREE.scaffolds;
			const rr = chance(seedKey, 'scaffolds');
			const cand = trunk.nodes.filter((n) => n.at.y > S.low && n.at.y < S.high);
			const turn0 = rr() * Math.PI * 2;
			for (let i = 0; i < S.n && cand.length; i++) {
				const node = cand[Math.min(cand.length - 1, Math.floor(((i + 0.5) / S.n) * cand.length))];
				const bearing = turn0 + i * ((Math.PI * 2) / S.n) + about(rr, 0, 0.3);
				const side = v3(Math.cos(bearing), 0, Math.sin(bearing));
				const tilt = between(rr, 0.82, 1.0);
				const d0 = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt));
				make(['limb', i], trunk, node.s, node.at, d0, e, 1, about(rr, 1, 0.08));
			}
		}
		for (const ax of now) {
			// a tip deep in a crowd is shaded out: it stops, and its leaves fall in a few months
			const crowd = tips.get(cellOf(tipOf(ax))) ?? 0;
			const shade = ax.r();
			if (ax.alive && ax.order >= 2 && crowd > TREE.crowd && shade < 0.6) {
				// it dies with everything it carries, and falls within the year
				const kill = (a) => {
					if (a.alive) (a.alive = false), (a.died = e.ts);
					a.kids.forEach(kill);
				};
				kill(ax);
				continue;
			}
			if (!ax.alive) continue;
			// the trunk's own buds give the limbs; above them it branches as a limb does, only in spring
			if (ax !== trunk || (e.ts > TREE.scaffolds.ts && e.kind === 'spring')) branch(ax, e, tips);
		}
		for (const ax of all) if (ax.alive) grow(ax, e);
	}
	return { all, trunk };
}

/**
 * How thick each axis is along it, as far as it has grown at t: the pipe model (the wood at a place carries what all
 * the shoots beyond it need, r^2.5 summed), then the whole tree scaled so its trunk at 30 cm has the measured girth
 * of its age (TRUNK_D), no shoot thinner than a young one.
 */
function thicken(all, trunk, t) {
	for (const ax of all) {
		const full = ax.pathLen ?? (ax.pathLen = lengths(ax.pts));
		// a shoot shaded out dries and falls within the year
		ax.shown = t > ax.died + 0.8 ? 0 : Math.min(full[full.length - 1], lengthAt(ax, t));
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
			ax.q[i] = L[i] > ax.shown ? 0 : Math.pow(TREE.tipRadius, P) + acc + 3e-7 * beyond;
		}
	};
	for (const ax of all) ax.q = null;
	walk(trunk);
	const at30 = pointAt(trunk, Math.min(0.32, trunk.shown * 0.5)).i;
	const raw = Math.pow(trunk.q[Math.min(trunk.q.length - 1, at30)], 1 / P);
	const k = straight(t, TRUNK_D) / 2 / Math.max(1e-6, raw);
	for (const ax of all) ax.rad = (ax.q ?? new Array(ax.pts.length).fill(0)).map((q) => Math.max(q > 0 ? 0.0012 : 0, Math.pow(q, 1 / P) * k));
}

/** the wood's colour by its age (years) and radius: the seedling's red shoot, green shoots, olive-brown, grey-brown */
function barkColour(age, r, trunk, t) {
	const B = FU.bark;
	let c = mix(B.shoot, B.young, span(age, 0.35, 1.6));
	if (trunk && t < 0.6) c = mix(B.red, c, span(t, 0.12, 0.55));
	c.lerp(B.grey, span(r, 0.009, 0.03));
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
		for (const f of ax.flushes) if (s <= f.s1 + 1e-6) return f.e.ts + f.e.dur * clamp((s - f.s0) / Math.max(1e-6, f.s1 - f.s0));
		return t;
	};
	const R0 = Math.max(radiusAt(0), 0.001);
	const isTrunk = ax.order === 0;
	const step = isTrunk ? clamp(R0 * 0.5, 0.006, 0.04) : R0 > 0.015 ? clamp(R0 * 1.6, 0.025, 0.1) : clamp(R0 * 50, 0.1, 0.22);
	const count = Math.max(2, Math.ceil(total / step));
	const pts = [], ss = [];
	for (let k = 0; k <= count; k++) {
		const s = (k / count) * total;
		ss.push(s);
		pts.push(pointAt(ax, s).at);
	}
	const sides = Math.round(clamp(R0 * (R0 > 0.015 ? 600 : 700), R0 < 0.004 ? 3 : R0 < 0.007 ? 4 : 5, 36));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const flare = isTrunk ? span(t, 1.5, 6) : 0;
	const graft = span(t, TREE.graft.t, TREE.graft.t + 0.5);
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			const h = pts[0].y + s;
			r *= 1 + 0.55 * flare * Math.exp(-Math.max(0, h) / 0.14) * (0.8 + 0.3 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			// the bud union: the Fuerte scion a little thicker than its seedling stock, a bulge 20 cm up
			r *= 1 + graft * (0.1 * Math.exp(-Math.pow((h - TREE.graft.h) / 0.025, 2)) + 0.05 * smooth((h - TREE.graft.h) / 0.04));
		}
		if (ax.parent && s < r * 2.5) r *= 1 + 0.22 * (1 - s / (r * 2.5)); // the branch collar
		if (r > 0.03) r *= 1 + 0.05 * (fbm(Math.cos(v * 6.283) * 3, s * 6, Math.sin(v * 6.283) * 3, 2, nsAx) - 0.5);
		return r;
	};
	const kind = R0 > 0.012 ? 'bark' : 'twig';
	const lift = lifted(kind === 'bark' ? 'barkMap' : 'twigMap');
	const paint = (u, v, s) => {
		const r = radiusAt(s);
		const c = barkColour(t - formedAt(s), r, isTrunk, t);
		if (isTrunk && pts[0].y + s < 0) c.lerp(FU.bark.root, 0.7);
		return c.multiplyScalar(lift);
	};
	const g = tube(pts, radius, paint, sides, true);
	// UVs in metres: along the wood and round it, over the bark's (0.12 m) or the twig's (0.06 m) tile
	const tile = kind === 'bark' ? 0.12 : 0.06;
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

/** the roots: the seed's taproot, white and thick, then the shallow spreading laterals (80–90 % in the top 25 cm) */
function roots(bag, seedKey, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed: seedKey,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.03, -1, 0.02),
		length: 1.1,
		grown: table(t, [[0.02, 0], [0.04, 0.03], [0.085, 0.09], [0.25, 0.2], [1.17, 0.4], [4, 0.7], [10, 1]]),
		radius: 0.0035 + 0.03 * span(t, 0.6, 10),
		down: 0.04,
		wander: 0.1,
		laterals: 7,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.15, 2),
		young: FU.root.young,
		old: FU.root.old,
	});
	for (let i = 0; i < 8; i++) {
		const rr = chance(seedKey, 'lateral-root', i);
		const born = 0.12 + i * 0.14;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed: seedKey,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.01, -0.005 - rr() * 0.04, Math.sin(bear) * 0.01)),
			dir: v3(Math.cos(bear), -0.25 - rr() * 0.15, Math.sin(bear)),
			length: between(rr, 1.5, 2.8) * lerp(0.25, 1, span(t, 0.5, 10)),
			grown: (t - born) / 4,
			radius: 0.0022 + 0.03 * span(t, born + 0.5, 10) * between(rr, 0.6, 1),
			down: 0.02,
			wander: 0.14,
			laterals: 6,
			lateral: 0.32,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.2) / 2,
			young: FU.root.young,
			old: FU.root.old,
			floor: -0.6,
		});
	}
}

/** how many fruit a tree carries to maturity, by the year of its bloom (6 kg at ~5 y, 22–46 kg at 8–11 y; 0.28 kg each) */
const CROP = [[3, 0], [4, 6], [5, 20], [6, 40], [8, 90], [10, 120]];
/** how many of its shoot tips flower, by the year */
const BLOOM = [[3, 0.15], [4, 0.35], [5, 0.55], [7, 0.7]];

/**
 * The whole Fuerte at time t (years from sowing): the seed as long as it lasts, the roots, the wood, the leaves of the
 * last year's flushes, and what the season puts on it: panicles at the shoot tips from late winter, a few fruit set of
 * the many flowers, and those swelling where they hang to maturity 260–290 days after.
 */
function avocadoTree(t, seedKey) {
	const bag = new Bag();
	const ns = hashText(seedKey) % 997;
	const S = FU.seed;
	const seedBase = v3(0, -S.length * (1 - S.out), 0);
	if (t < 1.05) seed(bag, seedBase.clone(), span(t, 0.025, 0.08), span(t, 0.35, 1.05), seedKey);
	roots(bag, seedKey, t, t < 1 ? seedBase.clone() : v3(0, -0.04, 0));

	const { all, trunk } = simulate(seedKey, t);
	thicken(all, trunk, t);
	for (const ax of all) wood(bag, ax, t, ns);

	// the wood in the space, for the fruit to hang clear of
	const space = bag.space;
	for (const ax of all) {
		if (ax.shown < 0.01) continue;
		const pts = [];
		for (let i = 0; i < ax.pts.length && ax.pathLen[i] <= ax.shown; i += 2) pts.push(ax.pts[i]);
		if (pts.length > 1) space.rod(pts, (u) => (ax.rad[Math.round(u * (pts.length - 1)) * 2] ?? 0.002) + 0.004);
	}

	// the season: panicles from late winter, the fruit from their set
	const year = Math.floor(t + 0.3);
	for (const y of [year - 1, year]) {
		if (y < TREE.firstBloom) continue;
		const phase = t - y;
		const showFlowers = phase > -0.25 && phase < 0.22;
		const showFruit = phase > FU.fruit.set && phase < FU.fruit.set + FU.fruit.days / 365 + 0.12;
		if (!showFlowers && !showFruit) continue;
		const pf = straight(y, BLOOM);
		const at = y - 0.15;
		const flowering = all.filter((ax) => ax.born < at && ax.died > y && lengthAt(ax, at) > 0.05 && chance(seedKey, 'bloom', y, ...ax.key)() < pf);
		const crop = straight(y, CROP);
		for (const ax of flowering) {
			const sAt = Math.min(ax.shown, lengthAt(ax, at));
			const p = pointAt(ax, sAt);
			const rr = chance(seedKey, 'set', y, ...ax.key);
			if (showFlowers) panicle(bag, seedKey, [y, ...ax.key], p.at, p.dir, phase, ns);
			if (!showFruit) continue;
			const x = rr();
			const share = crop / Math.max(1, flowering.length);
			const keep = x < share;
			const dropAt = FU.fruit.set + between(rr, 0.06, 0.2);
			if (!(x < share * 3) || (!keep && phase > dropAt)) continue;
			const days = (phase - FU.fruit.set) * 365;
			// it hangs from a raceme's foot at the old tip, under the new flush grown out of it
			const side = across(p.dir).applyAxisAngle(p.dir, rr() * 6.283);
			const d0 = p.dir.clone().multiplyScalar(0.3).addScaledVector(side, 1).normalize();
			const foot = p.at.clone().addScaledVector(side, 0.004);
			const key = [y, ...ax.key, 'fruit'];
			const k = about(rr, 1, 0.07);
			bag.fruit(key, foot, v3(0, -1, 0));
			const stalk = fruitStalk(bag, foot, d0, FU.fruit.stalkLength * between(rr, 0.8, 1.25), days, rr);
			const hang = stalk.dir.clone().lerp(v3(0, -1, 0), 0.6).normalize();
			// a fruit kept looks for room to hang for its mature size; a fruitlet that will drop hangs as it is
			const place = keep ? space.settle(stalk.end, hang, (c, d) => fruitBalls(c, d), 0.04) : { at: stalk.end, dir: hang };
			if (place.at.distanceTo(stalk.end) > 0.001) bag.add('twig', tube([stalk.end, place.at], () => 0.0042 * lerp(0.6, 1, span(days, 0, 120)), () => FU.fruit.stalk, 7, false));
			fruitBody(bag, place.at, place.dir, days, k, rr, DETAIL.fruit === key.join('|'));
			bag.fruitDone();
		}
	}

	// the leaves: on every node as long as each lives (shoots shaded out lose theirs over a few months)
	for (const ax of all) {
		const tr = Math.max(ax.rad[ax.rad.length - 1] ?? 0.002, 0.0015);
		for (const n of ax.nodes) {
			if (n.s > ax.shown) break;
			const age = t - n.formed;
			const life = Math.min(n.life, ax.died + 0.3 - n.formed);
			if (age <= 0 || age >= life) continue;
			const r = chance(seedKey, 'leaf', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const at = n.at.clone().addScaledVector(side, tr);
			leaf(bag, { at, out: side.clone().addScaledVector(n.dir, 0.4).normalize(), size: n.size, age, life, r, scale: n.scale });
		}
	}
	return bag.build();
}
/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the seed sown to mature fruit; `t` the years since sowing each is grown at (between two stages, on
 * the way). The bearing season is the tree's tenth year: bloom at its turn (about 1 March), the fruit set some five
 * weeks later, mature 275 days after that.
 */
const B = 9; // the bloom of the tenth year
const SET = B + FU.fruit.set;
const STAGES = [
	{ name: 'Seed', t: 0, note: 'The seed of the rootstock, a Mexican-race seedling: a stone of about 5 × 4 cm in its thin brown papery coat, sown broad end down with its top third out of the soil. A Fuerte is never grown true from seed: it will be budded onto this seedling.' },
	{ name: 'Germination', t: 0.085, note: 'A month: the stone has split in two from its base; a thick white root has gone 10 cm down and a red shoot comes up between the halves. Germination is hypogeal: the cotyledons stay in the stone and feed the seedling for months.' },
	{ name: 'Seedling', t: 0.25, note: 'Three months: about 25 cm, its first nodes carrying only small scale leaves, a tuft of true leaves at the top, red-bronze and limp as they unfold, greening as they firm; the stone still plump at its foot.' },
	{ name: 'Nursery tree', t: 1.17, note: "Fourteen months: budded with Fuerte in its seventh month 20 cm up (the bud union a slight bulge), grown on in four flushes to about 0.9 m and a stem 1.5 cm thick, and planted out." },
	{ name: 'Young tree', t: 3.6, note: 'Its fourth year: about 2.4 m high and 3 m across (Thorp 1992), four limbs leaving a short trunk at 50–60° and arching over, the leaves crowded on the last year’s flushes, the newest red-bronze.' },
	{ name: 'Flowering', t: B, note: 'The bloom of its tenth year: 5–6.5 m high and 7–8 m across, a dense dome skirted nearly to the ground; panicles at the tips of last year’s shoots, a million small greenish-cream flowers. Type B: each opens female one afternoon and male the next morning.' },
	{ name: 'Fruit set', t: SET + 0.04, note: 'Late April: the flowers are spent; of a tree’s many hundred thousand flowers a few hundred fruitlets set, pea-sized and bright green, and most of them will drop by early summer. The spring flush grows out of each panicle’s tip, red-bronze.' },
	{ name: 'Young fruit', t: SET + 100 / 365, note: 'Early August, 100 days: the fruit half grown and growing fastest (July to October), a neck forming, dark green under the summer flush; some 120 kept of the set.' },
	{ name: 'Full size', t: SET + 190 / 365, note: 'November, 190 days: the fruit near full size, pear-shaped with its neck, 11 × 7 cm, but its oil still low.' },
	{ name: 'Mature', t: SET + FU.fruit.days / 365, note: 'January, 275 days from set: about 11.5 × 7 cm and 280 g, smooth thin skin still green with many small yellow dots (it stays green ripe), oil 12–17 %; picked from November to March, it softens off the tree. Next spring’s panicle buds swell at the shoot tips.' },
];

/** the years since sowing at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => avocadoTree(timeAt(stage), `${seed ?? 'maia'}`);

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
	if (!f) return none('This fruit has not set yet: it is a flower until late April.');
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

/** what the tree is grown with, in the order `build` takes it: stage, seed, detail, and the view (tree or fruit) */
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Tree', 'Fruit'] },
];

const PLANT = {
	id: 'avocado',
	label: "Avocado 'Fuerte' · Persea americana",
	latin: "Persea americana Mill. 'Fuerte' (Mexican × Guatemalan race hybrid; Atlixco, Puebla, 1911) · Aguacate Fuerte · Avocado",
	note: "The Fuerte, the avocado of California for half a century: a large spreading tree, wider than tall and skirted nearly to the ground, its leaves dark glossy green above and glaucous below, red-bronze in each flush; small greenish-cream flowers by the hundred thousand (type B); smooth green pear-shaped fruit with a neck, 11.5 × 7 cm and 280 g, that stay green ripe, 260–290 days from set.",
	from: 'Tree · budded on a seedling, bearing from its fourth year',
	layer: 'canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'cfdd7b8fb9bd1eb6b1c4a920f336d8b7f6936dac928dbba7886d997e62d9c6a5', model: 'fal-ai/nano-banana-pro (+ /edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from sowing
	// what a world needs to plant it right; data sheet avocado-fuerte.md, S1–S35
	facts: {
		height: { at1: [0.45, 0.9], at4: [2.2, 2.6], at6: [3, 4], at10: [5, 6.5], at20: [8, 10], unit: 'm' },
		crownWidth: { at4: 3, at6: [4, 5], at10: [7, 8], at20: [12, 14], unit: 'm' },
		trunkDiameter: { atPlanting: [0.012, 0.02], at10: [0.15, 0.17], at16: 0.189, at20: 0.213, unit: 'm' },
		spacing: [6, 12], // 6 × 6 m (Cyprus) to 12–18 m on deep soil; crowns meet at 6.1 m by year 6–7
		shade: 'full sun',
		climate: 'subtropical, frost-free or nearly: mature trees damaged at −2.2 °C, fruit frozen after 4 h at −3.3 to −2.8 °C; females fail to open in cool spells (days 18–21 °C, nights 7–12 °C)',
		years: { budded: 0.6, planted: [1, 1.5], firstFlowers: 3, firstCrop: [4, 5], fullBearing: [8, 11], productiveLife: 50 },
		flushes: { young: 3, grown: 2, nodesSpring: 17.7, growsDays: [21, 35] },
		leaf: { length: [0.14, 0.2], width: [0.06, 0.09], petiole: [0.045, 0.065], life: [240, 400], unit: 'm, days' },
		flower: { diameter: 0.01, perPanicle: 150, perTree: 1e6, type: 'B', set: [0.00001, 0.0003] },
		fruit: { length: [0.106, 0.13], diameter: [0.065, 0.077], mass: [0.21, 0.35], seedShare: 0.16, oil: [0.12, 0.17], daysSetToMature: [260, 290], harvest: 'November–March', unit: 'm, kg' },
		seed: { length: [0.05, 0.055], width: [0.04, 0.045], mass: [0.04, 0.05], germinationDays: [28, 35], unit: 'm, kg' },
		yield: { at5: 6, at8to11: [22, 46], heavyYear: 95, alternate: 'strong', unit: 'kg a tree' },
		roots: { feedersIn: 0.25, share: [0.8, 0.9], rootHairs: false, unit: 'm' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the tree, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'avocado' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'avocado',
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
module.exports.organs = { FU, TREE, seed, halfSeed, leaf, flower, blossom, panicle, fruitBody, fruitStalk, fruitLength, simulate, thicken, avocadoTree, Bag, timeAt, STAGES, surface, lite, detailAt, sound };
