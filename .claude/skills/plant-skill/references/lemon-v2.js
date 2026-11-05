'use strict';
/*
 * LEMON 'FEMMINELLO SANTA TERESA' — Citrus × limon (L.) Osbeck 'Femminello Santa Teresa', of the Femminello group (a
 * selection of Femminello Ovale): the Sicilian lemon of Siracusa, its mother tree a survivor in a grove all but killed
 * by mal secco. Version 2 of plants/lemon: one named cultivar, a grafted tree on sour orange grown flush by flush from
 * the nursery tree as planted to the ripe winter crop of its eighth year, three crops on it at once.
 *
 * Its numbers are the cultivar's where they are measured (UC Riverside CRC 3894; Catalano et al. 2022, Catania: fruit
 * 122 g, 62.3 × 67.2 mm, nipple 7 mm, 15 seeds; the UC desert trial: shape index 0.80, rind 3.9 mm; the Siracusa PGI's
 * crops and harvest windows) and the Femminello group's or the lemon's otherwise (tree heights and trunks at 10–12
 * years on sour orange; flushes, leaves, flowers). Every number with its source: plant-skill's data sheet for it
 * (references/lemon-femminello-santa-teresa.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its tree, flower and bark panels redrawn twice where they were wrong, kept on play by its hash
 * (6e0af40f…): the leaf's outline and the colours of leaf, flush, flower and fruit traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots,
 *                   sound()), as banana v2 carries it, with the lemon's materials and surfaces: leaf veins and oil
 *                   dots, the rind's oil glands, the fissures of old bark.
 *   2. ORGANS       the lemon's own, each to its measure: the leaf, the flower and its bud, the lemon, the bark.
 *   3. THE TREE     its shoots flush by flush, three flushes a year, inside the crown the grower keeps; the pipe
 *                   model for its wood; its roots; its leaves, flowers and three crops.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years since planting (mid-March).
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: the veins and oil dots of a
 * leaf, the oil glands of a lemon's rind, the fissures of old bark.
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
	// filtered and mipmapped: a DataTexture is nearest and unmipmapped by default, and a fine pattern (oil glands, veins)
	// seen from a few metres then shimmers into a coarse honeycomb
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
 * The surfaces, made the first time they are asked for:
 *   leafMap / leafBump   one leaf over its own UVs (u base to tip, v across): the pale midrib, about ten pairs of
 *                        secondary veins rising toward the tip and joined near the margin, the fine net between them
 *                        and the translucent oil dots; the bump lifts the veins a little (the sheet's panels 9 and 10)
 *   rindMap / rindBump   3 cm of lemon rind (UVs in metres): the oil glands, round pits about 1.2 mm across, each a
 *                        little paler at its rim and darker in it, and the faint mottle between
 *   barkMap / barkBump   16 × 5 cm of old bark (UVs in metres, along × round): fine shallow fissures running along it
 *                        between long narrow plates, and the grain (the sheet's panel 8, the old trunk)
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const veins = (x, y) => {
		// x along the leaf 0 … 1, y across −1 … 1: the midrib and the secondary veins, rising toward the tip
		const a = Math.abs(y);
		const mid = Math.exp(-Math.pow(a / 0.035, 2));
		const along = x - a * 0.32;
		const sec = Math.pow(Math.abs(Math.cos(along * Math.PI * 11)), 26) * smooth(a / 0.08) * (1 - smooth((a - 0.85) / 0.12));
		const loop = Math.exp(-Math.pow((a - 0.86) / 0.03, 2)) * 0.5;
		const net = (tileNoise(x, y * 0.5 + 0.5, 70, 3, 2) - 0.5) * 0.5;
		return { mid, sec: Math.max(sec, loop), net };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const v = veins(x, y * 2 - 1);
				const dot = tileCells(x, y, 40, 20, 5);
				const oil = dot.id < 0.5 ? smooth((0.18 - dot.f1) * 12) * 0.06 : 0;
				const k = 0.95 + 0.12 * v.mid + 0.06 * v.sec + 0.015 * v.net + oil * 0.5;
				return [k * 1.02, k, k * 0.92];
			}, true),
		leafBump: () =>
			picture(256, 128, (x, y) => {
				const v = veins(x, y * 2 - 1);
				return 0.5 + 0.25 * v.mid + 0.12 * v.sec + 0.05 * v.net;
			}),
		rindMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 26, 26, 61);
				const pit = smooth((0.3 - c.f1) * 9);
				const rim = Math.exp(-Math.pow((c.f1 - 0.36) / 0.08, 2));
				const k = 0.98 - 0.04 * pit + 0.025 * rim + 0.05 * (tileNoise(x, y, 6, 63) - 0.5);
				return [k, k, k];
			}, true),
		rindBump: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 26, 26, 61);
				const f = tileCells(x, y, 70, 70, 67);
				return 0.6 - 0.35 * smooth((0.34 - c.f1) * 6) + 0.12 * smooth(c.f2 - c.f1) - 0.06 * smooth((0.25 - f.f1) * 8);
			}),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x along the wood, y round it: long narrow plates (3 along × 14 round to the tile), their borders fissures
				const w = tileNoise(x, y, 4, 71, 2, 10) - 0.5;
				const c = tileCells(x + w * 0.05, y, 3, 14, 73);
				const fissure = 1 - smooth((c.f2 - c.f1) * 9);
				const grain = Math.pow(Math.abs(Math.cos(y * Math.PI * 90 + w * 6)), 6) * 0.06;
				const k = (0.9 + 0.12 * c.id) * (1 - 0.55 * fissure) - grain + 0.06 * (tileNoise(x, y, 20, 75) - 0.5);
				return [k, k * 0.98, k * 0.96];
			}, true),
		barkBump: () =>
			picture(256, 256, (x, y) => {
				const w = tileNoise(x, y, 4, 71, 2, 10) - 0.5;
				const c = tileCells(x + w * 0.05, y, 3, 14, 73);
				return 0.6 - 0.45 * (1 - smooth((c.f2 - c.f1) * 9)) + 0.1 * (tileNoise(x, y, 30, 77) - 0.5);
			}),
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
 * (one-sided), glossy above (a citrus leaf shines), veined; `rind` a lemon's skin, waxy and glossy, pitted with oil
 * glands; `bark` thick wood, matt, finely fissured; `twig` young shoots and stalks, a faint shine; `petal` the thick
 * waxy petals, white inside and purple outside (one-sided, two faces); `sheet` thin things seen from both sides (the
 * calyx, the stamens far off); `body` the roots, stamens, style and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, specularIntensity: 0.3, ...(s && { map: s('leafMap'), bumpMap: s('leafBump'), bumpScale: 0.04 }) }),
	rind: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, specularIntensity: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.35, ...(s && { map: s('rindMap'), bumpMap: s('rindBump'), bumpScale: 0.8 }) }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, ...(s && { map: s('barkMap'), bumpMap: s('barkBump'), bumpScale: 2 }) }),
	twig: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
	petal: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 1, 1) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'twig', 'leaf', 'petal', 'sheet', 'rind', 'prop'];
// a lemon tree has thousands of leaves and flowers: a crowd far off draws some of them, each grown to fill the gap
const THINNED = { leaf: true, petal: true };

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
 * 2. ORGANS — the Femminello Santa Teresa's own, each to its measure
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);

/**
 * The cultivar's numbers. Sizes in metres from the data sheet (references/lemon-femminello-santa-teresa.md); outlines
 * (half-widths along the length, 0 … 1) and colours (linear sRGB, the sheet white-balanced on its ground) traced off its
 * reference sheet (play file 6e0af40f…, Nano Banana Pro, 2026-11-05).
 */
const CL = {
	leaf: {
		blade: 0.1, // 9–11 cm [SP]; the model's 10 cm
		width: 0.052, // 4.5–5.5 cm; the sheet's blade 1.93 : 1
		petiole: 0.012, // 1–1.5 cm, a very narrow wing, jointed to the blade
		wing: 0.0016,
		// the blade's half-width from its base (where the petiole joins) to its tip, 21 stations: panel 9, upper side,
		// turned upright on its midrib and traced (2.0 : 1 with what shows of its petiole)
		outline: [0.128, 0.419, 0.617, 0.74, 0.859, 0.931, 0.966, 0.978, 0.991, 1.0, 0.997, 0.974, 0.95, 0.915, 0.855, 0.777, 0.654, 0.53, 0.392, 0.192, 0.021],
		top: lin(0.1, 0.14, 0.04), // panel 9, its median; p10 … p90 below
		topLow: lin(0.076, 0.105, 0.025),
		topHigh: lin(0.13, 0.181, 0.065),
		under: lin(0.25, 0.3, 0.068), // panel 10
		rib: lin(0.3, 0.33, 0.1),
		flush: lin(0.3, 0.095, 0.065), // panel 11: the new flush, red-purple to bronze
		flushDeep: lin(0.15, 0.035, 0.022),
		turning: lin(0.15, 0.13, 0.045),
		old: lin(0.55, 0.42, 0.06), // the yellow of a leaf about to fall
	},
	flower: {
		petal: 0.017, // 1.5–2 cm: a flower 3–4 cm across [SP]
		petalW: 0.0078, // panel 12: oblong, round-tipped, 2.2 times as long as wide
		white: lin(0.92, 0.88, 0.8), // panel 12: a warm cream-white
		cream: lin(0.86, 0.82, 0.62),
		back: lin(0.42, 0.11, 0.26), // panels 13 and 14: the petals' backs magenta-purple
		bud: lin(0.2, 0.026, 0.095), // the closed bud, deep purple-red
		filament: lin(0.86, 0.86, 0.74),
		anther: lin(0.72, 0.32, 0.04), // panel 12: small, orange-brown
		style: lin(0.3, 0.45, 0.08),
		stigma: lin(0.72, 0.68, 0.1),
		calyx: lin(0.12, 0.2, 0.03),
		stamens: 32, // 30–40 [SP]
	},
	fruit: {
		length: 0.074, // with its nipple: 67.2 mm measured [CV]; the data sheet's model 67–76
		diameter: 0.062, // 62.3 mm [CV]
		nipple: 0.007, // 7 mm, the shortest of 24 lemons [CV]
		stalk: 0.01, // 5–15 mm [EST]
		stalkR: 0.0016,
		calyx: 0.0047, // the star-shaped button, 8–10 mm across [EST]
		dark: lin(0.06, 0.08, 0.012), // panel 15, the 1 and 3 cm fruit
		green: lin(0.17, 0.26, 0.006), // panel 15, full-size green
		pale: lin(0.5, 0.52, 0.035),
		yellow: lin(0.95, 0.66, 0.012), // panel 15, ripe: p10 (0.91, 0.51, 0.0) … p90 (1.0, 0.78, 0.036)
		yellowLow: lin(0.9, 0.58, 0.005),
		yellowHigh: lin(0.99, 0.74, 0.025),
		calyxColour: lin(0.1, 0.17, 0.025),
		stalkColour: lin(0.12, 0.15, 0.04),
	},
	bark: {
		shoot: lin(0.12, 0.13, 0.034), // panel 8, the angular young shoot
		flushShoot: lin(0.22, 0.07, 0.05),
		young: lin(0.15, 0.15, 0.075), // panel 8, two-year wood, green-grey
		old: lin(0.17, 0.14, 0.11), // panel 8, the old trunk: grey-brown, fine shallow fissures
		plate: lin(0.25, 0.22, 0.18),
		fissure: lin(0.06, 0.05, 0.04),
		lichen: lin(0.42, 0.44, 0.34),
		stock: lin(0.22, 0.2, 0.17), // the sour-orange stock, greyer
		dead: lin(0.2, 0.18, 0.15),
	},
	root: { young: lin(0.5, 0.36, 0.2), old: lin(0.17, 0.1, 0.06) },
};

/* ---- the leaf ---- */

/** the blade's half-width at u (0 base … 1 tip): the traced outline, straight between its stations */
const leafShape = (u) => {
	const o = CL.leaf.outline;
	const x = clamp(u) * (o.length - 1);
	const i = Math.min(o.length - 2, Math.floor(x));
	return lerp(o[i], o[i + 1], x - i);
};

/**
 * One leaf: its short narrowly winged petiole from the node, then the blade held out and a little down, folded along
 * the midrib. `age` years since its flush began (it unfolds in about three weeks, red-purple and limp, greening over
 * the next three); `fade` 0 … 1 its last weeks, yellowing (a citrus leaf lives one and a half to two years).
 */
function leaf(bag, at, out, size, age, fade, r) {
	const L = CL.leaf;
	const grow = span(age, 0, 0.055);
	if (grow <= 0.03) return;
	const young = 1 - span(age, 0.02, 0.075);
	const len = L.blade * size * lerp(0.35, 1, grow);
	const pet = L.petiole * size * lerp(0.5, 1, grow);
	const o = out.clone().normalize();
	const flat = o.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	// the petiole out from the node; the blade from its end, held toward the light, a young one hanging limp
	const pd = o.clone().addScaledVector(flat, 0.4).normalize();
	const end = at.clone().addScaledVector(pd, pet);
	const tint = r();
	const droop = lerp(-0.25, -1.0, young * 0.8) + about(r, 0, 0.3) - fade * 0.3;
	const bd = flat.clone().applyAxisAngle(UP, about(r, 0, 0.5)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const shoot = mix(L.flush, CL.bark.shoot, 1 - young);
	if (DETAIL.level >= 0.5) bag.add('twig', tube([at, end], (u) => 0.0007 * size * (1 - 0.25 * u), () => shoot, 3)); // far off, the blade alone
	const fold = lerp(0.42, about(r, 0.16, 0.06), 1 - young);
	const curl = about(r, 0.08, 0.06);
	const base = mix(L.topLow, L.topHigh, tint);
	const top = (u, v) => {
		const c = base.clone();
		c.lerp(L.flushDeep, young * 0.75 * (1 - u * 0.3)).lerp(L.flush, young * young * 0.5);
		if (young > 0 && young < 1) c.lerp(L.turning, 4 * young * (1 - young) * 0.4);
		if (Math.abs(v) < 0.06) c.lerp(L.rib, 0.25 * (1 - young));
		if (fade > 0) c.lerp(L.old, clamp(fade * 1.4 - (1 - Math.abs(v)) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, L.flush, young * 0.8);
		if (Math.abs(v) < 0.06) c.lerp(L.rib, 0.5);
		if (fade > 0) c.lerp(L.old, clamp(fade * 1.4));
		return c;
	};
	const blade = sheet({
		length: len,
		width: len * (L.width / L.blade) * 0.5,
		shape: leafShape,
		lift: (u, v) => fold * Math.abs(v) * 0.22 * Math.sin(Math.PI * Math.min(1, u * 1.05)) - curl * u * u * 0.4,
		paint: top,
		back: under,
		along: 6,
		across: 1,
	});
	// the wing: a narrow green border along the petiole, drawn as the blade's base reaching back over it
	bag.add('leaf', blade, aim(end, bd, about(r, 0, 0.25)));
}

/* ---- the flower and its bud ---- */

/**
 * One flower on its short stalk: a small green cup of five lobes, five (now and then four) thick waxy petals white
 * inside and magenta-purple on their backs, curling back once open; some thirty stamens in bundles, white filaments,
 * yellow anthers; the stout green style and its big yellow-green stigma. `open` 0 … 1 the bud opening (a closed bud is
 * the petals' purple backs), `fall` 0 … 1 the petals dropping. Built pointing up its +Y, set along `facing`.
 */
function flower(bag, at, facing, open, fall, r, close = false) {
	const F = CL.flower;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const base = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const turn = (a, up) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(up));
	const roll = r() * Math.PI * 2;
	const petals = r() < 0.15 ? 4 : 5;
	const swell = lerp(0.55, 1, smooth(open * 3));
	bag.add('twig', tube([v3(0, -0.008, 0), v3(0, -0.003, 0), v3(0, 0.002, 0)], (u) => 0.0007 + 0.0009 * u * u, () => CL.bark.shoot, close ? 8 : 3), base);
	const cupTop = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(0, 0.002, 0));
	for (let k = 0; k < 5 && close; k++) {
		const s = sheet({ length: 0.0028, width: 0.0016, shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.6)), paint: () => F.calyx, along: 3, across: 1 });
		bag.add('sheet', s, cupTop.clone().multiply(turn((k / 5) * Math.PI * 2 + roll + 0.6, 0.9)));
	}
	if (fall < 1) {
		for (let k = 0; k < petals; k++) {
			const len = F.petal * swell * about(r, 1, 0.06) * (1 - fall * 0.3);
			const p = sheet({
				length: len,
				width: F.petalW * 0.5 * swell,
				// oblong: a short claw, the sides nearly parallel, the tip round
				shape: (u) => (u < 0.6 ? 0.5 + 0.5 * smooth(u / 0.45) : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.6) / 0.4, 2)))),
				// cupped across; a closed bud's petals bow inward to meet at its tip, an open one's tips curl back
				lift: (u, v) => 0.16 * v * v * (1 - u * 0.5) + lerp(0.18, -0.16, smooth(open)) * u * u,
				paint: (u) => mix(F.white, F.cream, (1 - u) * 0.25).lerp(new THREE.Color('#d9ccb0'), fall * 0.6),
				back: (u, v) => mix(F.back, F.white, smooth(Math.abs(v) * 1.3 - 0.35) * 0.7 + u * 0.25).lerp(F.bud, (1 - smooth(open * 2)) * 0.6),
				along: close ? 12 : 2,
				across: close ? 6 : 1,
			});
			const up = lerp(1.38, 0.7, smooth(open)) - fall * 0.6;
			bag.add('petal', p, cupTop.clone().multiply(turn((k / petals) * Math.PI * 2 + roll, up)));
		}
	}
	if (open < 0.3 || (!close && DETAIL.level < 0.5)) return;
	// stamens in a ring round the style, a little shorter than it
	const n = close ? F.stamens : fewer(8, 5);
	const fil = [];
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + roll + (k % 4) * 0.08;
		const spread = lerp(0.05, 0.22, smooth(open)) + (k % 3) * 0.04;
		const L = 0.0085 * (k % 2 ? 0.88 : 1);
		const d = v3(Math.cos(a) * Math.sin(spread), Math.cos(spread), Math.sin(a) * Math.sin(spread));
		const p0 = v3(Math.cos(a) * 0.0022, 0.002, Math.sin(a) * 0.0022);
		const p1 = p0.clone().addScaledVector(d, L);
		fil.push([p0, p1, d]);
		if (close) {
			bag.add('body', tube([p0, p1], () => 0.00022, () => F.filament, 3), base);
			bag.add('body', bead(p1, v3(0.0004, 0.0008, 0.0004), mix(F.anther, '#5a3a18', fall), 4), base);
		}
	}
	if (!close) {
		// far off, the stamens as one flared ring
		const pos = [], col = [], idx = [];
		const c0 = F.filament.clone(), c1 = F.anther.clone();
		for (let k = 0; k <= n; k++) {
			const [p0, p1, d] = fil[k % n];
			const p2 = p1.clone().addScaledVector(d, 0.0012);
			pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
			col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
		}
		for (let k = 0; k < n; k++) {
			const a = k * 3;
			idx.push(a, a + 1, a + 3, a + 3, a + 1, a + 4, a + 1, a + 2, a + 4, a + 4, a + 2, a + 5);
		}
		bag.add('sheet', made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true), base);
	}
	// the stout style and its big stigma
	bag.add('body', tube([v3(0, 0.002, 0), v3(0, 0.008, 0), v3(0, 0.011, 0)], (u) => 0.0009 * (1 - 0.2 * u), () => F.style, close ? 8 : 3), base);
	bag.add('body', bead(v3(0, 0.0118, 0), v3(0.0023, 0.0018, 0.0023), F.stigma, close ? 6 : 1), base);
}

/* ---- the fruit ---- */

/** how big a lemon is, 0 … 1 of its full size across, by days after bloom: slow at first, fast through summer */
function fruitSize(d) {
	return table(d, [
		[0, 0.07],
		[20, 0.12],
		[45, 0.22],
		[70, 0.38],
		[100, 0.6],
		[140, 0.82],
		[180, 0.94],
		[240, 1],
	]);
}

/**
 * Its rind's colour by days after bloom and how far its crop yellows: dark green while small, mid green when full,
 * then the green fades and it turns lemon-yellow from about 200 days (a verdello, picked in summer, stays greener).
 */
function rindColour(d, crop, tint) {
	const F = CL.fruit;
	const c = mix(F.dark, F.green, span(d, 30, 150));
	const turn = span(d, crop.turn, crop.turn + 45) * crop.yellow;
	c.lerp(F.pale, clamp(turn * 1.6)).lerp(mix(F.yellowLow, F.yellowHigh, tint), clamp((turn * 1.6 - 0.6) * 1.5));
	return { c, turn };
}

/**
 * One lemon: short-oval (the roundest of lemons, 72 × 62 mm with its nipple), the base rounded with a shallow dip
 * where the calyx sits, a short blunt nipple at the tip with the scar of its style. Its skin pitted with oil glands
 * (a bump picture in metres), yellowing last at the stalk and the nipple. Built from its stalk at the origin down −Y,
 * its UVs in metres over the rind's 3 cm tile.
 */
function lemonGeometry(o) {
	const { L, D, nip, d, crop, tint, ns, res } = o;
	// a fruitlet a centimetre or two across needs few rings; a grown lemon more
	const small = D < 0.03;
	const rings = res ? 110 : DETAIL.level < 0.2 ? 4 : fewer(small ? 7 : 12, 5);
	const sides = res ? 150 : DETAIL.level < 0.2 ? 5 : fewer(small ? 8 : 14, 6);
	const Lb = L - nip;
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const { c: ground, turn } = rindColour(d, crop, tint);
	const greenEnds = clamp(turn * 1.8) * (1 - clamp(turn * 1.3 - 0.4));
	const n = new THREE.Vector3();
	for (let i = 0; i <= rings; i++) {
		const th = (i / rings) * Math.PI; // 0 at the stalk, π at the nipple
		const st = Math.sin(th);
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const lump = 1 + 0.012 * (fbm(Math.cos(ph) * 1.5, Math.sin(ph) * 1.5, th * 1.2, 2, ns) - 0.5);
			// an ellipse, its nipple end fuller and blunter than its stalk end (panel 15)
			const r = (D / 2) * Math.pow(st, lerp(1.05, 0.8, smooth((th - 1.2) / 1.4))) * lump;
			let y = (Lb / 2) * (1 - Math.cos(th));
			// the nipple, blunt, on the tip; the shallow dip where the calyx sits
			if (th > Math.PI / 2) y += nip * Math.exp(-Math.pow(r / (D * 0.1 + 0.0012), 2));
			else y -= 0.0018 * (D / 0.062) * Math.exp(-Math.pow(r / (D * 0.12), 2));
			pos.push(r * Math.cos(ph), -y, r * Math.sin(ph));
			uv.push((ph * (D / 2)) / 0.03, y / 0.03);
			n.set(Math.cos(ph) * st, -Math.cos(th), Math.sin(ph) * st).normalize();
			nor.push(n.x, n.y, n.z);
			const c = ground.clone();
			c.lerp(CL.fruit.green, greenEnds * 0.55 * (Math.exp(-Math.pow(th / 0.45, 2)) + Math.exp(-Math.pow((Math.PI - th) / 0.35, 2))));
			c.multiplyScalar(0.94 + 0.12 * fbm(Math.cos(ph) * 3, Math.sin(ph) * 3, th * 2.5, 2, ns + 7));
			if (Math.PI - th < 0.06) c.lerp(new THREE.Color('#6b6a3a'), 0.5); // the style's scar
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

/** the lemon's crops: when each blooms (a part of the year from mid-March), how it yellows and when it is picked */
const CROPS = {
	primofiore: { turn: 195, yellow: 1, pick: [225, 340] }, // the spring bloom: limoni invernali, Oct–Apr
	bianchetti: { turn: 230, yellow: 0.9, pick: [285, 360] }, // the early-summer bloom, picked Apr–Jun
	verdelli: { turn: 250, yellow: 0.6, pick: [290, 370] }, // the forced late-summer bloom, picked green-yellow Jul–Sep
};

/**
 * A lemon on its shoot, `d` days after its flower opened: the short woody stalk, the green star of the calyx at its
 * base, the fruit; while it is small the style still on its tip.
 */
function lemon(bag, at, dir, d, crop, seedKey, key) {
	const F = CL.fruit;
	const r = chance(seedKey, 'fruit', key);
	const size = fruitSize(d) * about(r, 1, 0.05);
	const tint = r();
	// a young lemon is longer than round, its nipple a large part of it
	const long = lerp(1.32, 1, span(d, 25, 160));
	const D = F.diameter * size;
	const nip = F.nipple * lerp(1.6, 1, span(d, 10, 120)) * Math.sqrt(size);
	const L = Math.max(D * long, (F.length - F.nipple) * size * long * 0.98 + nip);
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const res = DETAIL.fruit === key;
	const stalk = F.stalk * lerp(0.5, 1, size);
	bag.add('twig', tube([v3(0, 0.001, 0), v3(0, -stalk * 0.5, 0), v3(0, -stalk, 0)], (u) => F.stalkR * lerp(0.6, 1, size) * (1 + 0.4 * u), () => F.stalkColour, res ? 10 : 3), m);
	// the calyx: five short broad lobes, a star round the stalk
	const cal = F.calyx * lerp(0.6, 1, size);
	for (let k = 0; k < (res ? 5 : DETAIL.level >= 0.5 ? 5 : 0); k++) {
		const s = sheet({ length: cal, width: cal * 0.5, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.55)), 0.7), lift: (u) => -0.15 * u * u, paint: (u) => mix(F.calyxColour, '#7a6a3a', span(d, 280, 420) * u), along: res ? 6 : 2, across: res ? 3 : 1 });
		bag.add('sheet', s, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -stalk + 0.0006, 0)).multiply(new THREE.Matrix4().makeRotationY((k / 5) * Math.PI * 2)).multiply(new THREE.Matrix4().makeRotationZ(-1.25)));
	}
	const g = lemonGeometry({ L, D, nip, d, crop, tint, ns: hashText(key) % 991, res });
	g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -stalk + 0.0012 * size, 0));
	bag.add('rind', g, m);
	if (d < 25) {
		// the style, still on the fruitlet's tip until it falls
		const tip = -stalk - L + 0.001;
		bag.add('body', tube([v3(0, tip, 0), v3(0, tip - 0.006, 0)], () => 0.0008, () => CL.flower.style, 3), m);
		bag.add('body', bead(v3(0, tip - 0.0068, 0), v3(0.0017, 0.0013, 0.0017), CL.flower.stigma, 3), m);
	}
	return { L, D, stalk };
}

/* ---- bark ---- */

/**
 * Lemon bark by the radius (m) and age (years) of the wood: this flush's shoots three-angled, green flushed purple;
 * then green; two- and three-year wood smooth green-grey; old wood grey-brown, thin, fairly smooth, finely fissured
 * lengthwise, with round pale lichen spots. The fissures and grain are the bark picture; colour and lichen are here.
 */
function barkColour(r, age, v, s, ns, flushed) {
	const B = CL.bark;
	const c = mix(B.shoot, B.young, clamp((r - 0.0035) / 0.009) + clamp(age - 1) * 0.3);
	if (flushed) c.lerp(B.flushShoot, (1 - span(age, 0.03, 0.12)) * 0.8);
	const o = clamp((r - 0.012) / 0.03);
	if (o > 0) {
		const a = v * Math.PI * 2;
		const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
		c.lerp(mix(B.old, B.plate, fbm(cx * 60, s * 14, cz * 60, 2, ns) * 0.8), smooth(o * 1.3));
		// lichen: round pale spots, 0.5–2 cm, most on the oldest wood
		const cl = cells(cx * 55, s * 55, cz * 55, ns + 11);
		const spot = cl.id < 0.16 * o ? smooth((0.42 - cl.f1) / 0.12) : 0;
		c.lerp(B.lichen, spot * 0.7 * o);
	}
	return c;
}

/* ================================================================================================================
 * 3. THE TREE — a grafted tree grown flush by flush
 * ============================================================================================================== */

/**
 * How it grows. A Sicilian orchard lemon: a two-year nursery tree (sour-orange stock, the bud union 25 cm up, its
 * stem headed at 55 cm with three shoots), planted in mid-March and trained to a short trunk and three or four limbs
 * spreading into a dense round crown that reaches down to near the ground, kept at 3–3.6 m by pruning.
 *
 * Citrus grows in flushes (Scarrone's model): three a year in Sicily (spring, early summer, early autumn), each shoot
 * growing for three or four weeks and then stopping, its tip aborting, the next flush breaking from the buds below it.
 * Each flush event below is the whole tree at that moment: every shoot finished and not yet branched may break again,
 * from its top one to three buds, unless it is crowded or deep in the crown's shade, or outside the crown the grower
 * keeps (the pruning: `CROWN`, sized by the data sheet's heights and widths). Every shoot draws its own chance, and a
 * flush depends only on those before it, so the tree at an earlier time is the first part of the tree at a later one.
 */
const TREE = {
	graft: 0.25, // the bud union above the soil, 20–30 cm [EST]
	head: 0.55, // where the nursery tree was headed: the trunk to the first limbs, 50–70 cm
	flushes: [
		{ name: 'spring', at: 0.015, p: 0.95, kids: [2, 4], len: 1 }, // late March
		{ name: 'summer', at: 0.27, p: 0.6, kids: [1, 3], len: 0.85 }, // mid-June
		{ name: 'autumn', at: 0.49, p: 0.55, kids: [1, 3], len: 0.75 }, // early September
	],
	grow: 0.065, // years a flush shoot takes to reach its length (3–4 weeks)
	internode: 0.023, // 7–9 leaves on a 15–20 cm shoot
	tipRadius: 0.0013,
	pipeLength: 1.6e-8,
	ring: 0.035, // how much a year of rings adds to what the wood carries
	cell: 0.25, // the crowding grid (m)
	crowd: 6, // young shoots a cell holds before it is crowded
	firstBloom: 2.9, // the spring of its fourth year from planting (first fruit 1–3 years after grafting)
};

/** the crown the grower keeps, by years since planting: height, width, and how low its skirt hangs [data sheet] */
const CROWN = [
	[-1, 1.0, 0.45, 0.48],
	[0, 1.08, 0.55, 0.48],
	[1, 1.55, 1.15, 0.44],
	[2, 2.05, 1.65, 0.4],
	[4, 2.65, 2.4, 0.36],
	[8, 3.3, 3.3, 0.36],
	[12, 3.6, 3.6, 0.36],
	[20, 3.9, 4.4, 0.36],
];
function crownAt(t, k = 1) {
	const H = straight(t, CROWN.map((r) => [r[0], r[1]])) * k;
	const W = straight(t, CROWN.map((r) => [r[0], r[2]])) * k;
	const base = straight(t, CROWN.map((r) => [r[0], r[3]]));
	return { H, R: W / 2, base };
}
/** how far a place lies inside the kept crown (negative: outside): a haystack, widest a third of the way up */
function inside(p, e) {
	const u = (p.y - e.base) / Math.max(0.1, e.H - e.base);
	const prof = u < 0 ? 0.72 * clamp(1 + u * 3) : u < 0.36 ? 0.8 + 0.2 * Math.sin(((Math.PI / 2) * u) / 0.36) : Math.pow(Math.max(0, 1 - Math.pow((u - 0.36) / 0.64, 2.1)), 1 / 2.1);
	const wob = 1 + 0.06 * Math.sin(Math.atan2(p.z, p.x) * 3 + e.wob) + 0.04 * Math.sin(Math.atan2(p.z, p.x) * 5 + e.wob * 2);
	return Math.min(e.R * prof * wob - Math.hypot(p.x, p.z), e.H - p.y);
}

/** the length along a path at each of its points */
function lengths(pts) {
	const l = [0];
	for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return l;
}
/** the place and direction at `s` metres along a path */
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
 * The tree's shoots at time T (years since planting), flush by flush: each shoot a path at its full length (`full`),
 * the year it broke (`born`), the flush it came in, its nodes, the shoots it bore.
 */
function canopy(seed, T) {
	const all = [];
	const rt = chance(seed, 'tree');
	const size = about(rt, 1, 0.04);
	const wob = rt() * 6.283;
	const lean = (() => {
		const a = rt() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.03 + rt() * 0.03);
	})();
	const grid = new Map();
	const cellKey = (p) => `${Math.floor(p.x / TREE.cell)},${Math.floor(p.y / TREE.cell)},${Math.floor(p.z / TREE.cell)}`;
	const note = (p, born) => {
		const k = cellKey(p);
		const l = grid.get(k);
		if (l) l.push(born);
		else grid.set(k, [born]);
	};
	const crowded = (p, t) => (grid.get(cellKey(p)) ?? []).filter((b) => b > t - 1.5 && b <= t).length;

	/** a shoot's path from `from` along about `dir`, `len` long, kept inside the crown `e` */
	const path = (r, from, dir, len, e, order) => {
		const pts = [from.clone()];
		const d = dir.clone().normalize();
		const out = from.clone().setY(0);
		if (out.lengthSq() > 1e-6) out.normalize();
		const step = 0.02;
		for (let walked = 0; walked < len - 1e-6; walked += step) {
			// a little up to the light, out from the centre, wandering; a long shoot bowing under its leaves
			d.add(v3(about(r, 0, 0.05) + out.x * 0.012, 0.018 - 0.0035 * order * (walked / 0.2), about(r, 0, 0.05) + out.z * 0.012)).normalize();
			const next = pts[pts.length - 1].clone().addScaledVector(d, Math.min(step, len - walked));
			if (e && inside(next, e) < 0) break;
			pts.push(next);
		}
		return pts;
	};

	const shoot = (id, parent, at, from, dir, born, flush, order, len, e, r) => {
		const pts = path(r, from, dir, len, e, order);
		const L = lengths(pts);
		const total = L[L.length - 1];
		if (total < 0.03 && parent) return null;
		const s = { id, parent, at, pts, pathLen: L, len: total, born, flush, order, kids: [], nodes: [], branched: false };
		const r2 = chance(seed, 'phyllo', id);
		const phase = r2() * Math.PI * 2;
		const n = Math.max(1, Math.floor(total / TREE.internode));
		for (let i = 1; i <= n; i++) {
			const sAt = Math.min(total - 0.004, i * TREE.internode * about(r2, 1, 0.1));
			const p = pointAt(s, sAt);
			s.nodes.push({ i, s: sAt, at: p.at, dir: p.dir, bearing: phase + i * 2.513 }); // two fifths of a turn [EST]
		}
		all.push(s);
		if (parent) parent.kids.push(s);
		note(pts[pts.length - 1], born);
		return s;
	};

	// the nursery tree: its stem (the stock below the union, the scion above), headed at 55 cm, and three or four
	// shoots from its top that the grower keeps as the limbs
	const trunkPts = [];
	for (let i = 0; i <= 12; i++) trunkPts.push(v3(lean.x * (i / 12) * 0.3, (i / 12) * (TREE.head + 0.02), lean.z * (i / 12) * 0.3));
	const trunk = { id: 'trunk', parent: null, at: 0, pts: trunkPts, pathLen: lengths(trunkPts), len: TREE.head + 0.02, born: -1.6, flush: -1, order: 0, kids: [], nodes: [], branched: true, trunk: true };
	all.push(trunk);
	const rs = chance(seed, 'limbs');
	const limbs = rs() < 0.35 ? 4 : 3;
	const turn0 = rs() * Math.PI * 2;
	const e0 = crownAt(0, size);
	e0.wob = wob;
	for (let i = 0; i < limbs; i++) {
		const h = TREE.head - 0.1 + (i / limbs) * 0.11 + about(rs, 0, 0.01);
		const p = pointAt(trunk, h);
		const bear = turn0 + (i / limbs) * Math.PI * 2 + about(rs, 0, 0.3);
		const tilt = about(rs, 0.62, 0.08);
		const d = v3(Math.cos(bear) * Math.sin(tilt), Math.cos(tilt), Math.sin(bear) * Math.sin(tilt));
		shoot(`l${i}`, trunk, h, p.at, d, -0.45, 2, 1, about(rs, 0.48, 0.05), null, chance(seed, 'limb', i));
	}

	// the flushes since planting
	const yearEnd = Math.floor(T) + 1;
	outer: for (let y = 0; y <= yearEnd; y++)
		for (let k = 0; k < TREE.flushes.length; k++) {
			const F = TREE.flushes[k];
			const tf = y + F.at + about(chance(seed, 'flush-time', y, k), 0, 0.012);
			if (tf > T) break outer;
			const e = crownAt(tf + 0.25, size);
			e.wob = wob;
			const ageTree = tf;
			const vigour = table(ageTree, [[0, 1.5], [1, 1.35], [2, 1.15], [4, 0.95], [8, 0.8], [12, 0.75]]);
			const list = all.filter((s) => !s.branched && !s.trunk && tf - s.born >= TREE.grow && tf - s.born < 1.6);
			for (const c of list) {
				const r = chance(seed, 'flush', c.id, y, k);
				const tip = c.pts[c.pts.length - 1];
				const depth = inside(tip, e);
				let p = F.p * (ageTree < 2 ? 1.08 : 1);
				if (depth > 0.5 && e.R > 0.7) p *= 0.12; // deep in the crown's shade
				if (crowded(tip, tf) >= TREE.crowd) p *= 0.04; // a crowded shoot hardly breaks again
				if (c.fruit) p *= 0.5;
				if (r() > p) continue;
				c.branched = true;
				const n = Math.min(c.nodes.length, Math.round(lerp(F.kids[0], F.kids[1] + (ageTree < 2 ? 1 : 0), r())));
				const tipDir = pointAt(c, c.len).dir;
				for (let i = 0; i < n; i++) {
					const node = c.nodes[c.nodes.length - 1 - i];
					const kr = chance(seed, 'shoot', c.id, y, k, i);
					const side = across(tipDir).applyAxisAngle(tipDir, node.bearing);
					const ang = i === 0 ? between(kr, 0.2, 0.45) : between(kr, 0.5, 0.95);
					const d = tipDir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang));
					const out = node.at.clone().setY(0);
					if (out.lengthSq() > 1e-6) d.addScaledVector(out.normalize(), 0.25 * clamp(ageTree / 2));
					// low in the crown the shoots spread out level and bow down, filling its skirt; high up they rise
					const low = 1 - clamp((node.at.y - e.base) / Math.max(0.3, (e.H - e.base) * 0.45));
					d.y += 0.08 - 0.45 * low * clamp(ageTree / 3);
					d.normalize();
					const len = 0.2 * F.len * vigour * about(kr, 1, 0.3) * (i === 0 ? 1 : 0.8);
					shoot(`${c.id}.${y}${k}${i}`, c, node.s, node.at, d, tf, k, c.order + 1, len, e, kr);
				}
			}
		}
	return { all, trunk, size };
}

/**
 * How thick each axis is along it: the pipe model, r^2.5 of everything beyond summed, and a ring a year on top,
 * calibrated to the data sheet: a stem 1.5 cm at planting, a trunk about 5 cm at two years, 10 cm at eight, 13–15 at
 * twelve (Femminello clones on sour orange) [S10–S12].
 */
const PIPE = 2.5;
function thicken(ax, T) {
	const n = ax.draw.length;
	const L = ax.drawLen;
	ax.r2 = new Array(n).fill(0);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		if (!k.draw) continue;
		thicken(k, T);
		let i = 1;
		while (i < n - 1 && L[i] < k.at) i++;
		add[i - 1] += k.q0 * span(T - k.born, 0, 0.3);
	}
	let acc = 0;
	const total = L[n - 1];
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const q = Math.pow(TREE.tipRadius, PIPE) + acc + TREE.pipeLength * (total - L[i]);
		const woodAge = Math.max(0, T - ax.born - 0.2);
		ax.r2[i] = Math.pow(q * (1 + TREE.ring * woodAge), 2 / PIPE);
		if (i === 0) ax.q0 = q;
	}
}

/** a shoot's wood drawn: a tube, three-angled while young, its bark by its girth and age */
function wood(bag, ax, T, ns) {
	const n = ax.draw.length;
	if (n < 2) return;
	const L = ax.drawLen;
	const total = L[n - 1];
	if (total < 1e-4) return;
	const radiusAt = (s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		const k = clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return Math.sqrt(lerp(ax.r2[i - 1], ax.r2[i], k));
	};
	const R0 = Math.sqrt(ax.r2[0]);
	const isTrunk = !!ax.trunk;
	const step = isTrunk ? 0.02 : R0 > 0.01 ? clamp(R0 * 1.2, 0.012, 0.04) : R0 > 0.004 ? 0.06 : 0.09;
	const pts = [];
	const count = Math.max(1, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.draw, pathLen: L }, (k / count) * total).at);
	const sides = isTrunk ? fewer(40, 6) : Math.round(clamp(R0 * 900, 3, 24));
	const nsAx = (ns + hashText(ax.id)) % 9973;
	const age = T - ax.born;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			// the root flare at the soil; the bud union 25 cm up, the scion a little thicker than the stock
			r *= 1 + 0.35 * clamp(T / 4 + 0.3) * Math.exp(-Math.max(0, s) / 0.07) * (0.8 + 0.25 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			r *= 1 + 0.06 * (Math.exp(-Math.pow((s - TREE.graft) / 0.015, 2)) + 0.7 * smooth((s - TREE.graft) / 0.02)) - 0.04;
		} else if (s < r * 2 && ax.parent && !ax.parent.trunk) r *= 1 + 0.2 * (1 - s / (r * 2)); // the collar
		// young shoots three-angled
		const angular = (1 - clamp((r - 0.002) / 0.004)) * 0.18;
		return r * (1 + angular * Math.cos(v * Math.PI * 6));
	};
	const paint = (u, v, s) => {
		const r = radiusAt(s);
		const c = barkColour(r, age - (s / Math.max(0.01, total)) * 0.02, v, s, nsAx, ax.flush >= 0);
		if (ax.dead) c.lerp(CL.bark.dead, 0.7);
		if (isTrunk && s < TREE.graft) c.lerp(CL.bark.stock, 0.5 * clamp(r / 0.02));
		if (isTrunk && s < 0.02) c.lerp(CL.root.old, 0.5);
		return c;
	};
	// the old bark's fissures only on wood old and thick enough to have them; young wood is smooth
	const kind = R0 > 0.035 && age > 4 ? 'bark' : 'twig';
	// far off, the finest shoots are lost among the leaves
	if (!isTrunk && R0 < (DETAIL.level < 0.2 ? 0.006 : DETAIL.level < 0.5 ? 0.0028 : 0)) return;
	const g = tube(pts, radius, paint, sides, !isTrunk && R0 > 0.003);
	if (kind === 'bark') metric(g, total / 0.16, (2 * Math.PI * R0) / 0.05);
	bag.add(kind, g);
}

/** the roots of the sour-orange stock: a short taproot and many laterals in the top 60 cm, spreading with the crown */
function roots(bag, seed, T, crownR) {
	if (!DETAIL.roots) return;
	const age = clamp((T + 1.6) / 10);
	root(bag, { seed, key: ['tap'], from: v3(0, 0, 0), dir: v3(0.04, -1, 0.02), length: 1.0, grown: lerp(0.35, 1, age), radius: 0.006 + 0.04 * age, down: 0.03, wander: 0.12, laterals: 6, lateral: 0.3, depth: 2, age, young: CL.root.young, old: CL.root.old });
	const count = 8;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: v3(Math.cos(bear) * 0.012, -0.02 - rr() * 0.12, Math.sin(bear) * 0.012),
			dir: v3(Math.cos(bear), -0.12 - rr() * 0.15, Math.sin(bear)),
			length: between(rr, 0.8, 1.2) * Math.max(0.35, crownR * 1.1),
			grown: clamp(age * 1.3 - i * 0.03),
			radius: 0.003 + 0.03 * age * between(rr, 0.6, 1),
			down: 0.01,
			wander: 0.16,
			laterals: 5,
			lateral: 0.32,
			depth: 2,
			taper: 0.8,
			age: age * 0.9,
			young: CL.root.young,
			old: CL.root.old,
			floor: -0.6,
		});
	}
}

/** how much of its full length a shoot has grown, `dt` years after it broke */
const elongation = (dt) => span(dt, 0, TREE.grow);

/** the chance a shoot of a flush flowers, and how its flowers become a crop */
const BLOOM = [
	{ crop: 'primofiore', p: 0.6, flowers: [1, 5], after: 0.07, set: 0.42 }, // the spring flush: the main bloom, late April
	{ crop: 'bianchetti', p: 0.2, flowers: [1, 3], after: 0.06, set: 0.3 }, // early summer
	{ crop: 'verdelli', p: 0.35, flowers: [1, 3], after: 0.05, set: 0.38 }, // late summer, the forced bloom
];

/**
 * The whole lemon at time T (years since planting): its roots, its wood, its leaves where they live, its flowers in
 * their seasons and its fruit of three crops at once.
 */
function lemonTree(T, seed) {
	const bag = new Bag();
	const counts = { shoots: 0, leaves: 0, flowers: 0, fruit: 0, ripe: 0 };
	const { all, trunk, size } = canopy(seed, T);
	const ns = hashText(seed) % 997;
	const e = crownAt(T, size);
	e.wob = 0;
	// the dead twigs: a shoot that never broke again, deep in the shade, loses its leaves and dies; a dead branchlet
	// (it and all it bore) stands grey a while and then falls
	const gone = (s) => {
		if (s.trunk || s.born < -0.2) return false;
		let all = true;
		for (const k of s.kids) if (!gone(k)) all = false;
		s.dead = all && T - s.born > 2.0 && (s.kids.length === 0 || T - s.born > 2.6);
		s.gone = s.dead && T - s.born > (s.kids.length ? 2.9 : 2.3);
		return s.gone;
	};
	gone(trunk);
	// what is grown of each shoot by now
	for (const s of all) {
		if (s.gone) continue;
		const f = s.trunk || s.born < -0.2 ? 1 : elongation(T - s.born);
		if (f <= 0) continue;
		const want = s.len * f;
		const pts = [];
		for (let i = 0; i < s.pts.length; i++) {
			if (s.pathLen[i] <= want) pts.push(s.pts[i]);
			else {
				const p = pointAt(s, want).at;
				pts.push(p);
				break;
			}
		}
		if (pts.length < 2) pts.push(pts[0].clone().add(pointAt(s, 0).dir.multiplyScalar(0.001)));
		s.draw = pts;
		s.drawLen = lengths(pts);
		s.grown = want;
	}
	thicken(trunk, T);
	roots(bag, seed, T, e.R);
	for (const s of all) if (s.draw) wood(bag, s, T, ns);
	const space = bag.space;
	for (const s of all) if (s.draw && s.r2[0] > 0.004 * 0.004) space.rod(s.draw, Math.sqrt(s.r2[0]) + 0.003);

	for (const s of all) {
		if (!s.draw || s.trunk) continue;
		// leaves at the nodes grown so far, each living its own life; deep in the crown they fall sooner
		const sr = chance(seed, 'leaves', s.id);
		for (const node of s.nodes) {
			if (node.s > s.grown) break;
			const nr = chance(seed, 'leaf', s.id, node.i);
			const born = s.born + (node.s / Math.max(0.05, s.len)) * TREE.grow * 0.8;
			const age = T - born;
			const shade = inside(node.at, e) > 0.38 && e.R > 0.6;
			const life = between(nr, 1.25, 2.0) * (shade ? 0.5 : 1);
			if (age > life || age <= 0) continue;
			const u = node.s / Math.max(0.05, s.len);
			// far off, a lemon's many leaves thinned further than the shared thinning does, the kept ones grown to the same leaf area
			const keep = DETAIL.level < 0.5 ? 0.55 : 1;
			if (keep < 1 && nr() > keep) continue;
			const sizeL = (1 / Math.sqrt(keep)) * (u < 0.15 ? 0.55 + u * 2.5 : 1 - 0.18 * Math.max(0, u - 0.75) * 4) * about(nr, 1, 0.08) * (s.order <= 1 ? 1.1 : 1);
			const side = across(node.dir).applyAxisAngle(node.dir, node.bearing);
			const out = side.clone().addScaledVector(node.dir, 0.7).normalize();
			const at = node.at.clone().addScaledVector(side, 0.0012);
			leaf(bag, at, out, sizeL, age, span(age, life - 0.04, life), nr);
			counts.leaves++;
			// now and then a short thorn in the axil of a vigorous shoot (nearly thornless)
			if (s.len > 0.25 && sr() < 0.08 && DETAIL.level >= 0.5) {
				const td = side.clone().addScaledVector(node.dir, 0.5).normalize();
				bag.add('twig', tube([node.at, node.at.clone().addScaledVector(td, 0.009)], (uu) => 0.0011 * (1 - uu), () => mix(CL.bark.shoot, '#6a5a3a', clamp(age - 0.5)), 3, true));
			}
		}
		// flowers and fruit at the tip of a shoot that bloomed
		if (s.flush < 0 || s.born < TREE.firstBloom - 0.05) continue;
		const B = BLOOM[s.flush];
		const br = chance(seed, 'bloom', s.id);
		if (br() > B.p * span(s.born, TREE.firstBloom - 0.05, TREE.firstBloom + 2)) continue;
		const nF = Math.round(lerp(B.flowers[0], B.flowers[1], br() * br()));
		const tipP = pointAt(s, s.len);
		const opens0 = s.born + B.after;
		for (let k = 0; k < nF; k++) {
			const fr = chance(seed, 'flower', s.id, k);
			const opens = opens0 + about(fr, 0, 0.012) + k * 0.006;
			const d = (T - opens) * 365;
			const side = across(tipP.dir).applyAxisAngle(tipP.dir, k * 2.4 + fr() * 0.6);
			const facing = tipP.dir.clone().multiplyScalar(k ? 0.6 : 1).addScaledVector(side, k ? 0.8 : 0.2).normalize();
			const at = (k ? pointAt(s, Math.max(0, s.len - k * 0.012)).at : tipP.at).clone().addScaledVector(side, k ? 0.002 : 0);
			if (T < s.born + 0.02 || T > opens + 1.4) continue;
			const sets = fr() < B.set;
			const kept = fr() < 0.55; // the fruitlets that stay through the June drop
			if (d < -0.5) {
				// the bud, swelling purple at the tip of the young shoot
				const g = span(T, s.born + 0.02, opens - 0.004);
				if (s.draw && g > 0.05) flower(bag, at, facing, 0, 0, fr);
				continue;
			}
			if (d < 14) {
				const open = span(d, -0.5, 3);
				const fall = span(d, 7, 13);
				if (!sets && d > 12) continue;
				if (fall < 1 && (DETAIL.level >= 0.5 || k % 2 === 0)) flower(bag, at, facing, open, fall, fr), counts.flowers++;
				if (!sets || d < 8) continue;
			}
			if (!sets) continue;
			if (!kept && d > 45) continue; // shed in the June drop
			const crop = CROPS[B.crop];
			const pick = between(fr, crop.pick[0], crop.pick[1]);
			if (d > pick) continue;
			// the fruit hangs from the tip where its flower was, finding a place for the size it will be
			const hang = v3(0, -1, 0).addScaledVector(facing.clone().setY(0), 0.5).normalize();
			const ripe = (a2, d2) => [{ c: a2.clone().addScaledVector(d2, CL.fruit.stalk + CL.fruit.length * 0.5), r: CL.fruit.diameter * 0.5 }];
			const place = space.settle(at, hang, ripe, 0.01, 0.03) ?? (d < 45 ? { at, dir: hang } : null);
			if (!place) continue;
			s.fruit = true;
			const key = [s.id, k, B.crop];
			bag.fruit(key, at, place.dir);
			if (place.at.distanceTo(at) > 1e-4) bag.add('twig', tube([at, place.at], () => 0.0012, () => CL.fruit.stalkColour, 3));
			lemon(bag, place.at, place.dir, d, crop, seed, key.join('|'));
			counts.fruit++;
			if (d > crop.turn + 30) counts.ripe++;
			bag.fruitDone();
		}
	}
	counts.shoots = all.filter((s) => s.draw).length;
	// the trunk's diameter 30 cm up, for checking against the data sheet
	counts.trunk30 = 2 * Math.sqrt(trunk.r2[Math.round((0.3 / trunk.len) * (trunk.r2.length - 1))]);
	const group = bag.build();
	group.userData.counts = counts;
	return group;
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from planting to the ripe winter crop of its eighth year; `t` the years since planting (mid-March) each
 * is grown at (between two stages, on the way). A Femminello flowers and fruits several times a year, so a grown tree
 * carries ripe lemons, green ones and flowers at once.
 */
const STAGES = [
	{ name: 'Planted', t: 0, note: "A two-year nursery tree, planted in mid-March: a straight stem 1.5 cm thick, 'Femminello Santa Teresa' budded 25 cm up onto a sour-orange stock, headed at 55 cm, and three shoots from its top, about 1.05 m in all." },
	{ name: 'First flush', t: 0.1, note: 'Five weeks on: the spring flush breaks from the top buds of every shoot, soft and red-purple, greening as its leaves harden.' },
	{ name: 'One year', t: 1.0, note: 'A year after planting: three flushes have grown, 1.5 m high and 1.1 m across; the shoots three-angled and green, few thorns.' },
	{ name: 'Two years', t: 2.08, note: "Trained to three or four limbs from a short trunk, a dense round crown 2 m high, the spring flush coming red at its tips." },
	{ name: 'First lemons', t: 3.83, note: 'Its fourth winter: 2.6 m high and 2.4 m across, the first crop yellow in the crown, 1–3 years after the graft as the Femminello bears.' },
	{ name: 'Bloom', t: 7.1, note: "Its eighth spring, late April: the main bloom on the new flush, purple buds opening white and scented, while the bianchetti from last summer's flowers hang yellow and the verdelli green." },
	{ name: 'Fruit set', t: 7.19, note: 'Late May: the petals fall, the ovaries swell into dark-green fruitlets with their styles still on; most will drop by the end of June.' },
	{ name: 'Summer', t: 7.4, note: "Late July: the primofiore crop walnut- to egg-sized and green; the summer flush red at the tips; the bianchetti picked." },
	{ name: 'Verdelli bloom', t: 7.55, note: 'September: after the summer\'s thirst and the first water, the forced bloom of the verdelli; the main crop full-sized and still green.' },
	{ name: 'Ripe', t: 7.83, note: "Mid-January: the primofiore ripe, bright lemon-yellow, short-oval, 122 g, about 72 × 62 mm with its short nipple; picking runs October to April. Bianchetti full and green, verdelli young below them." },
];

/** the years since planting at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => lemonTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one lemon on its own ---- */

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

/** the lemons the ripe tree bears, and which of the well-grown ones the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ roots: false }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	// a lemon of the main crop, yellow in January (the others on the tree then are green)
	const main = fruits.filter((f) => f.key.endsWith('primofiore'));
	const sized = (main.length ? main : fruits).map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.95);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one lemon at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This tree bears no fruit yet.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This lemon has not set yet, or has been picked.');
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
	id: 'lemon',
	label: "Lemon 'Femminello Santa Teresa' · Citrus × limon",
	latin: "Citrus × limon (L.) Osbeck 'Femminello Santa Teresa' (Femminello group; a selection of Femminello Ovale) · on sour orange, Citrus × aurantium L. · limone Femminello, Santa Teresa · Zitrone",
	note: "The Sicilian lemon of Siracusa, chosen from a Femminello tree that lived through mal secco: an evergreen kept at 3–3.6 m, a short grey trunk and a dense round crown down to near the ground, glossy leaves 10 × 5 cm, purple buds opening to white flowers purple on their backs. It flowers several times a year, so its short-oval lemons (122 g, 72 × 62 mm, a short blunt nipple) hang yellow and green among the flowers: primofiore from the spring bloom, bianchetti from early summer, verdelli from the forced late-summer bloom.",
	from: 'Grafted tree · 8 years from planting',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '6e0af40f5ccca49a1f6e6abe7519c578089bb4e18a2346852b7c8d2c879c884c', model: 'fal-ai/nano-banana-pro (+ /edit, two passes)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from planting
	// what a world needs to plant it right; data sheet S1–S22 (references/lemon-femminello-santa-teresa.md)
	facts: {
		height: { at1y: [1.5, 2.1], at2y: [2.0, 2.6], at5y: [2.7, 3.2], at8y: [3.0, 3.6], at10to12y: [3.2, 4.2], kept: [3, 4], unit: 'm' },
		trunkDiameter: { atPlanting: [0.012, 0.018], at3y: [0.034, 0.045], at8y: [0.09, 0.12], at10to12y: [0.123, 0.157], unit: 'm' },
		crownWidth: { at10to12y: [2.6, 3.7], at20y: [4, 5], unit: 'm' },
		trunkToFirstLimbs: [0.5, 0.7],
		graftUnion: [0.2, 0.3],
		rootstock: 'sour orange (Citrus × aurantium) historically; now C. volkameriana, Carrizo, C-35, C. macrophylla',
		spacing: [5, 5], // 400 trees a hectare, Sicily
		shade: 'full sun',
		climate: 'Mediterranean coast: unripe fruit hurt below about −1.4 °C, ripe below −3.3 °C; leaves and wood about −2 and −4 °C [EST]; irrigated in summer',
		flushes: { perYear: 3, months: ['Mar–Apr', 'Jun–Jul', 'Aug–Sep'], days: [21, 35] },
		leaf: { length: [0.08, 0.14], width: [0.04, 0.06], petiole: [0.01, 0.015], life: [450, 730], unit: 'm, days' },
		flower: { diameter: [0.03, 0.04], petals: [4, 5], stamens: [30, 40], unit: 'm' },
		fruit: { length: [0.067, 0.076], diameter: [0.06, 0.064], mass: 0.122, nipple: 0.007, rind: [0.004, 0.006], segments: 10, seeds: [10, 18], juice: 0.344, unit: 'm, kg' },
		crops: {
			primofiore: { bloom: 'Apr–Jun', harvest: 'Oct–Apr', days: [170, 330] },
			bianchetti: { bloom: 'Jun–Jul', harvest: 'Apr–Jun', days: [290, 330] },
			verdelli: { bloom: 'forced, Aug–Sep', harvest: 'Jul–Sep', days: [300, 360] },
		},
		years: { firstFruit: [1, 3], fullBearing: [6, 8], productiveLife: [30, 50] },
		yield: { kgPerTree7to11y: [24, 36], kgPerTreeGrown: [50, 80], tPerHaCap: 29 },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one lemon) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'lemon' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'lemon',
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
module.exports.organs = { CL, CROPS, TREE, CROWN, leaf, leafShape, flower, lemon, lemonGeometry, fruitSize, rindColour, barkColour, canopy, crownAt, inside, lemonTree, timeAt, Bag, surface, lite, detailAt, STAGES };
