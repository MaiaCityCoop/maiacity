'use strict';
/*
 * YAM 'PONA' — Dioscorea rotundata Poir. (white Guinea yam; syn. D. cayenensis subsp. rotundata (Poir.) J.Miège)
 * 'Pona' (Puna): the prized early white yam of Ghana, the yam of the new-yam season and its festivals. Version 1 of
 * plants/yam, the library's first twining vine: a head sett planted in a heaped mound, one spiny shoot out of it that
 * twines to the right up a stake, branches over the stake's top and hangs; one big cylindrical tuber growing down
 * through the mound under it, harvested as the vine yellows and dies, about eight months from planting.
 *
 * Its numbers are the species' and the Guinea yams' where Pona is not measured (PROTA 2: Dioscorea rotundata; IITA's
 * yam production manuals; Orkwor, Asiedu & Ekanayake 1998, Food Yams; Onwueme 1978 as cited; Ghana's CRI variety
 * tables for CRI-Pona: purple-green young stem, petiole 5 cm, cylindrical tuber with surface roots and no spines, ~33 %
 * dry matter); every number with its source in plant-skill's data sheet for it (references/yam-pona.md), estimates
 * marked there as such.
 *
 * Its look is held to its reference sheet: a clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro (sheet 2) with its two stem cells from the first plate pasted in, kept on play by its hash (b5143254…):
 * the leaf's outline, the tuber's profile by age and every colour traced off its panels. Where the plate and the data
 * sheet disagree (its mounds half as high, the sett and tuber under the field instead of in the mound, the vine at the
 * top of its stake a month early) the data sheet's numbers are kept.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   banana v2 carries it (with `sound()`; the pictures mipmapped as lemon v2's, undersides with their
 *                   own normals and colours parsed once as plum v2's), with the yam's materials and surfaces.
 *   2. ORGANS       the yam's own: the heart-shaped leaf (its outline traced, seven veins), the stem and its prickles,
 *                   the sett, the tuber (its profile by age traced, its skin, its rootlets, its head), the fibrous
 *                   roots, the mound (cut open in the viewer, whole in a world) and the stake.
 *   3. THE PLANT    the shoot out of the sett, twining up the stake as a right-handed helix, its leaves alternate low
 *                   and opposite above, the side shoots over the top; the tuber under it; the season to senescence.
 *   4. RECIPE       its stages, its params, the tuber view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in days from planting the sett. The field's ground is y = 0; the mound stands on it.
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
/** a named colour parsed once (plum v2): a plant asks for the same few thousands of times */
const NAMED = new Map();
const named = (c) => {
	if (c instanceof THREE.Color) return c;
	let k = NAMED.get(c);
	if (!k) NAMED.set(c, (k = new THREE.Color(c)));
	return k;
};
const toColor = (c) => (c instanceof THREE.Color ? c : C.copy(named(c)));
/** a colour between two, as a new THREE.Color, never past either */
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
		// the underside lit as the face above it is: a thin leaf lets the light through (backLit false: its own normals,
		// for small leaves seen from every side, plum v2)
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
	// mipmapped: a picture laid on a leaf a few pixels across is averaged, not sampled into noise (lemon v2)
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
 * The surfaces, made the first time they are asked for (colour pictures only: no bump pictures, which make NaN pixels
 * where a triangle stands edge-on on some GPUs, plum v2):
 *   leafMap    the whole blade in its own coordinates (u along the midrib from 0.25 behind the petiole's end to just
 *              past the tip, v across it, both in parts of its midrib's length): the seven main veins from the
 *              petiole's end (the midrib; a pair curving up to meet at the tip; a pair into the margin above the
 *              middle; a pair out into the basal lobes), lighter than the blade, and a fine net between them
 *   tuberMap   0.08 m square of the tuber's skin: corky brown scales parted by fine cracks, darker patches, pale
 *              specks where rootlets broke off (the sheet's swatch)
 *   soilMap    0.25 m square of the mound's earth: crumbs and clods, a few pale grains and stones
 *   barkMap    0.3 m of the stake's bark (along u): grey-brown fibres and darker flecks
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () => {
			// the veins as curves from the petiole's end (0, 0), each a quadratic Bézier sampled; [end, control, strength]
			const VEINS = [
				[[1.0, 0], [0.5, 0], 1],
				[[0.97, 0.004], [0.36, 0.3], 0.85],
				[[0.66, 0.36], [0.12, 0.43], 0.7],
				[[0.12, 0.5], [-0.12, 0.33], 0.6],
			];
			const curves = [];
			for (const [e, c, k] of VEINS)
				for (const side of k === 1 ? [1] : [1, -1]) {
					const pts = [];
					for (let i = 0; i <= 40; i++) {
						const t = i / 40, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
						pts.push([b * c[0] + d * e[0], side * (b * c[1] + d * e[1])]);
					}
					curves.push({ pts, k });
				}
			return picture(256, 256, (x, y) => {
				const X = x * 1.3 - 0.25, Z = (y - 0.5) * 1.3;
				let vein = 0;
				for (const { pts, k } of curves) {
					let best = 9, at = 0;
					for (let i = 0; i < pts.length; i++) {
						const d = (pts[i][0] - X) ** 2 + (pts[i][1] - Z) ** 2;
						if (d < best) (best = d), (at = i / (pts.length - 1));
					}
					// a vein narrows towards its end
					const w = (0.008 + 0.006 * k) * (1 - 0.6 * at);
					vein = Math.max(vein, k * smooth(1 - Math.sqrt(best) / w));
				}
				// the net between the veins: the borders of small irregular cells, faint
				const c = tileCells(x, y, 38, 38, 61);
				const net = smooth(1 - (c.f2 - c.f1) / 0.09) * 0.5;
				const k = 0.86 + 0.16 * vein + 0.05 * net * (1 - vein) + 0.03 * (tileNoise(x, y, 9, 63) - 0.5);
				return [k, k * 1.02, k * 0.95];
			}, true);
		},
		tuberMap: () =>
			picture(512, 512, (x, y) => {
				// x round the tuber, y along it: small corky scales of every size, fine cracks between them, broad darker
				// patches and lighter rubbed ones, dark specks where rootlets broke off (the sheet's swatch)
				const warp = tileNoise(x, y, 5, 71, 2) - 0.5;
				const c = tileCells(x + warp * 0.08, y + warp * 0.05, 26, 20, 73);
				const crack = smooth(1 - (c.f2 - c.f1) / 0.09) * (0.5 + 0.5 * tileNoise(x, y, 12, 87));
				const patch = tileNoise(x, y, 3, 75, 3);
				const scale = 0.94 + 0.12 * c.id;
				const f = tileCells(x, y, 46, 46, 77);
				const speck = f.id < 0.05 ? smooth((0.25 - f.f1) * 12) : 0;
				const grain = 0.92 + 0.16 * tileNoise(x, y, 70, 79, 2);
				const k = grain * scale * lerp(1, 0.6, crack) * lerp(1.12, 0.72, smooth((patch - 0.35) * 3));
				// the specks dark, as the sheet's tuber has them: rootlet scars and small pits
				return [k * (1 - 0.6 * speck), k * (1 - 0.65 * speck), k * (1 - 0.65 * speck)];
			}, true),
		soilMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 22, 22, 81);
				const crumb = 0.82 + 0.3 * c.id - 0.25 * smooth(1 - (c.f2 - c.f1) / 0.15);
				const g = tileCells(x, y, 60, 60, 83);
				const grain = g.id < 0.08 ? smooth((0.3 - g.f1) * 10) : 0;
				const k = crumb * (0.92 + 0.16 * tileNoise(x, y, 5, 85));
				return [lerp(k, 1.5, grain), lerp(k, 1.45, grain), lerp(k, 1.4, grain)];
			}, true),
		barkMap: () =>
			picture(128, 512, (x, y) => {
				const fibre = 0.85 + 0.2 * tileNoise(x, y, 3, 91, 2, 40);
				const c = tileCells(x, y, 6, 20, 93);
				const fleck = c.id < 0.15 ? smooth((0.3 - c.f1) * 8) * 0.4 : 0;
				const k = fibre * (1 - fleck);
				return [k, k * 0.98, k * 0.95];
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
 * The materials, made once, plain and with their surfaces. `leaf` a leaf's two faces, each its own colour (one-sided,
 * the underside with its own normals), satin: no clearcoat (a crown of leaves goes white at a grazing angle with one,
 * lemon v2) and a low specular; `stem` the vine; `skin` the tuber's and the sett's, matt and corky; `soil` the mound's
 * earth; `prop` the stake; `body` the roots, the prickles and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, specularIntensity: 0.2, ...(s && { map: s('leafMap') }) }),
	stem: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
	skin: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...(s && { map: s('tuberMap') }) }),
	soil: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, ...(s && { map: s('soilMap') }) }),
	prop: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...(s && { map: s('barkMap') }) }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'stem', 'leaf', 'skin', 'soil', 'prop'];
// a yam has some hundreds of small leaves: a crowd far off draws a part of them, each a little bigger
const THINNED = { leaf: true };


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
			const mesh = new THREE.Mesh(merged, material(kind));
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
 * 2. ORGANS — the yam's own, each to its measure
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);

/**
 * The yam's numbers. Sizes in metres from the data sheet (references/yam-pona.md, its rows named); shapes and colours
 * (linear sRGB) traced off its reference sheet (play file b5143254…, Nano Banana Pro, 2026-11-05) with plant-skill's
 * trace.py: each panel's median, the spread its p10–p90.
 */
const DR = {
	/** days from planting to the shoot breaking the mound's surface: 1–3 months, in the rains 36–40 d (Vine, S1, S22) */
	emerge: 40,
	/** the stake pushed in beside it 3–4 weeks after it comes up (Ghana 4–6 weeks, IITA "a month after planting") */
	staked: 40 + 24,
	/** the mound: 0.6 m high (PROTA 0.3–0.6, IITA 0.5–1.0, Ghana 0.6–1.0), 1.2 m across its foot (1 m spacing) */
	mound: { h: 0.6, R: 0.6 },
	/** the stake: a rough bush pole 3–5 cm thick standing 2.2 m over the mound (data sheet: Stake for the model) */
	stake: { top: 2.8, foot: 0.08, r: 0.021, rTop: 0.016 },
	/** the sett: a head sett 10 cm long, 7.5 cm across (~0.37 kg; seed yams 100–500 g, S1), 13 cm under the top */
	sett: { L: 0.1, D: 0.075, deep: 0.13 },
	/**
	 * The main stem's length (m) by days since it came up, the sett's 13 cm under the mound's top first: 0.3–0.5 m at
	 * 2 weeks, 1–1.5 m at 4, at the top of a 2.2 m stake by 6–8 weeks, 3–4 m by 3 months and no longer after (Vine:
	 * length by age, S1's phases); measured along the stem, which winds round the stake (×1.45 its rise)
	 */
	length: [[0, 0], [7, 0.12], [14, 0.4], [21, 0.8], [28, 1.35], [42, 2.6], [56, 3.6], [75, 4.3], [95, 4.6]],
	/** a right-handed helix round the stake: 0.15 m to a turn (8–15 cm, EST), as close round it as the stem lies */
	pitch: 0.15,
	/** internodes along the main stem: 4 cm in the reduced base, 11–12 cm at a metre and over (8–15 cm, EST) */
	internode: [[0.4, 0.045], [1.0, 0.11], [3.0, 0.12], [4.6, 0.09]],
	/** leaves alternate on the lowest part (the first 0.5–1 m), opposite above (S1, S5) */
	opposite: 1.1,
	/** the scale leaves (cataphylls) at the first nodes: 3–10 mm, brown-green (S1, S6, EST) */
	scales: 6,
	/** a grown leaf's midrib, petiole's end to tip: 10.4 cm, so the blade is 12 cm tip to lobes and 10 cm wide (Pona's
	 *  "large" leaves, 9–14 × 6–10 cm; the sheet's outline 1.16 : 0.97 of it); its petiole 0.6 of it (5–8 cm, CRI-Pona 5) */
	leaf: 0.104,
	/** a leaf's size along the main stem (as a part of a grown one): small low down, "strongly reduced" at the base */
	leafBy: [[0.35, 0.3], [0.8, 0.6], [1.4, 0.95], [2.5, 1], [4, 0.9], [4.6, 0.75]],
	/** days a leaf takes to open full size */
	opens: 16,
	/** senescence: the lowest leaves yellow 5.5 months after emergence, the whole vine dry by 7 (Senescence, S1) */
	yellows: 40 + 157,
	/** the side shoots: 4–10 from the upper axils, 0.5–3 m (EST from S7 and field photos) */
	laterals: 14,
	/** the tuber starts 3–4 weeks after emergence (19–28 d, Trouslot 1982 in S6) */
	tuberFrom: 40 + 25,
	/**
	 * The tuber's length and its narrower width (m; across its face it is `flat` times that) by days from planting:
	 * 8 cm at 2 months after emergence, 15 × 6.5 at 3, 21 × 8.8 at 4, 25 × 9.8 at 5 (the data sheet's logistic
	 * bulking, half its mass at ~4 months), 27 × 10.3 (11.5 across its face) at 6 months and done: 2.1 kg (`tuberMass`;
	 * Pona 1.5–2.5 kg). Its proportion, 2.35 : 1 to its face, is the sheet's grown tubers' (rootlets left out) and near
	 * Ghana's measured white yams' (30.6 × 13.6 cm, S8); the data sheet's month-by-month sizes are estimates.
	 */
	tuberL: [[65, 0.006], [100, 0.08], [130, 0.15], [160, 0.21], [190, 0.25], [220, 0.27], [250, 0.27]],
	tuberW: [[65, 0.004], [100, 0.033], [130, 0.065], [160, 0.088], [190, 0.098], [220, 0.103], [250, 0.103]],
	/** across, the tuber is a little flattened: 1.12 : 1 (the sheet's cross-section 1.08, its longitudinal cut more) */
	flat: 1.12,
	/**
	 * The tuber's half-width along it, head (0) to tail (1), as a part of its widest: young, a club narrowing to its
	 * tail (the sheet's tuber at 3½ months, widest two fifths down); grown, a blunt cylinder a little broader below
	 * (the sheet's harvest tuber, 2.26 : 1 there)
	 */
	tuberYoung: [[0, 0.33], [0.04, 0.36], [0.08, 0.47], [0.12, 0.62], [0.16, 0.77], [0.2, 0.87], [0.24, 0.93], [0.28, 0.97], [0.32, 0.99], [0.38, 1], [0.44, 1], [0.48, 0.97], [0.52, 0.95], [0.56, 0.92], [0.6, 0.87], [0.64, 0.83], [0.68, 0.78], [0.72, 0.7], [0.76, 0.64], [0.8, 0.58], [0.84, 0.51], [0.88, 0.44], [0.92, 0.37], [0.96, 0.26], [1, 0]],
	tuberGrown: [[0, 0.38], [0.04, 0.69], [0.08, 0.84], [0.12, 0.92], [0.16, 0.95], [0.2, 0.96], [0.24, 0.97], [0.3, 0.99], [0.4, 1], [0.5, 1], [0.57, 0.995], [0.61, 0.97], [0.65, 0.96], [0.69, 0.95], [0.73, 0.93], [0.77, 0.89], [0.81, 0.85], [0.85, 0.78], [0.89, 0.68], [0.93, 0.52], [0.97, 0.25], [1, 0]],
	/** the fibrous roots: from the head, 1–2 mm, mostly in the top 0.3 m, a few to 1 m, spreading wide (S5) */
	roots: { n: 30, reach: [0.6, 2.0], r: 0.0008 },
	/**
	 * The leaf blade's outline: its radius from a point a quarter of the midrib up from the petiole's end, in parts of
	 * the midrib, every 3.75° from the tip (0) round to the petiole (180°), traced off the sheet's leaf (upper side,
	 * both halves averaged): broad, the tip drawn out, the basal lobes rounded either side of an open notch
	 */
	outline: [0.743, 0.677, 0.627, 0.603, 0.579, 0.559, 0.54, 0.526, 0.511, 0.495, 0.482, 0.471, 0.463, 0.457, 0.452, 0.449, 0.447, 0.446, 0.448, 0.449, 0.452, 0.457, 0.461, 0.466, 0.472, 0.481, 0.488, 0.491, 0.494, 0.497, 0.501, 0.506, 0.511, 0.514, 0.515, 0.514, 0.511, 0.506, 0.499, 0.486, 0.472, 0.448, 0.42, 0.385, 0.32, 0.276, 0.257, 0.252, 0.25],

	colour: {
		leaf: lin(0.084, 0.134, 0.056), // the grown leaf, upper side: the panel's 0.073/0.117/0.049 (p10 0.05/0.084/0.032, p90 0.091/0.141/0.068) over the vein picture's mean, 0.87
		leafUnder: lin(0.35, 0.35, 0.26), // the underside, pale greyish green: the panel's 0.31/0.31/0.22 over the vein picture's 0.87
		leafYoung: lin(0.25, 0.17, 0.087), // a young leaf, bronze (the sheet's young leaf 0.22/0.15/0.076, over 0.87)
		leafYoungUnder: lin(0.26, 0.2, 0.12),
		yellow: lin(0.57, 0.33, 0.04), // the old leaf, yellow (the sheet's old leaf: 0.50/0.26/0.04, p90 0.78/0.43/0.07)
		brown: lin(0.2, 0.09, 0.03), // dry and brown
		petiole: lin(0.14, 0.19, 0.05),
		petioleEnd: lin(0.16, 0.07, 0.07), // purple at both ends (S11)
		stem: lin(0.16, 0.19, 0.05), // the vine (the sheet's twining stem 0.21/0.20/0.05)
		stemFoot: lin(0.19, 0.12, 0.06), // flushed purplish-brown at its foot (the sheet's stem base 0.19/0.14/0.06)
		shoot: lin(0.175, 0.1, 0.093), // the young shoot, purple-green (the sheet's sprout; CRI-Pona "purple green")
		straw: lin(0.36, 0.25, 0.1), // the dead vine
		scale: lin(0.17, 0.1, 0.05), // a scale leaf
		prickle: lin(0.16, 0.08, 0.04),
		skinYoung: lin(0.72, 0.41, 0.2), // the tuber's skin at 2½ months, pale tan (the sheet)
		skinMid: lin(0.7, 0.355, 0.155), // at 3½ months (the sheet 0.67/0.35/0.15; its middle zones 0.63/0.32/0.14 under the picture)
		skinBrown: lin(0.39, 0.17, 0.082), // at 5 months
		skin: lin(0.28, 0.114, 0.054), // at harvest (p10 0.17/0.067/0.033, p90 0.42/0.18/0.09)
		head: lin(0.45, 0.25, 0.12), // the head, a paler knob (the sheet's 0.50/0.28/0.14)
		rootlet: lin(0.2, 0.1, 0.05),
		flesh: lin(0.86, 0.74, 0.59), // the flesh, white with a cream tint (the sheet's cut: 0.86/0.74/0.59)
		cutDry: lin(0.55, 0.42, 0.3), // the sett's cut face, dried and ashed
		rootYoung: lin(0.68, 0.56, 0.4), // the fibrous roots, cream when young
		rootOld: lin(0.4, 0.24, 0.12), // browning (the sheet's washed roots 0.52/0.29/0.15)
		soil: lin(0.314, 0.159, 0.08), // the mound (the sheet's 0.31/0.16/0.08)
		soilCut: lin(0.2, 0.1, 0.05), // its inside, moist
		stake: lin(0.3, 0.17, 0.12), // the stake's bark (the sheet's 0.30/0.17/0.12)
	},
};

/** the camera's side, as play's viewer frames an asset (from (1.5, 0.45, 1.9) of its middle): the mound is cut open
 *  towards it in the viewer, the sett and the tuber a little to that side of the middle, the stake a little behind */
const FACING = v3(1.5, 0, 1.9).normalize();

/** how high the mound stands at `r` metres from its middle: a rounded heap, flattish on top, its foot gentle */
function moundY(r) {
	const { h, R } = DR.mound;
	if (r >= R) return 0;
	return h * Math.pow(1 - Math.pow(r / R, 2.4), 1.3);
}
/** the soil's surface over a point: the mound, or the field */
const surfaceAt = (x, z) => moundY(Math.hypot(x, z));

/* ---- the leaf ---- */

/** the outline's radius at an angle from the tip (0 … π, the same on both sides), in parts of the midrib */
function outlineAt(a) {
	const x = (Math.abs(a) / Math.PI) * (DR.outline.length - 1);
	const i = Math.min(DR.outline.length - 2, Math.floor(x));
	return lerp(DR.outline[i], DR.outline[i + 1], x - i);
}

/**
 * One leaf blade, built along +X from the petiole's end (its midrib from 0 to L), its face up (+Y), across Z: rings
 * round a point a quarter up the midrib out to the traced outline, so the open notch between the basal lobes is the
 * sheet's. Cupped a little from the midrib, the long tip drooping. `paint(x, z)` and `under(x, z)` its two faces'
 * colours by place (in parts of the midrib). The underside has its own normals (plum v2: a small leaf's underside
 * lit with the upper face's draws white from below). UVs over the leaf picture's square (`leafMap`).
 */
function blade(o) {
	const { L, cup = 0.12, droop = 0.25, curl = 0, paint, under } = o;
	const rings = fewer(o.rings ?? 5, 2);
	const round = Math.max(10, fewer(o.round ?? 32, 10));
	const pos = [], uv = [], col = [], idx = [], colB = [];
	const cx = 0.25;
	for (let k = 0; k <= rings; k++) {
		const rho = Math.pow(k / rings, 0.85);
		for (let j = 0; j <= round; j++) {
			const a = (j / round) * Math.PI * 2 - Math.PI; // −π … π, 0 to the tip
			const rr = outlineAt(a) * rho * (1 - curl * 0.12);
			const X = cx + Math.cos(a) * rr, Z = Math.sin(a) * rr;
			// cupped up from the midrib, the tip and the lobes drooping, a dry leaf curling
			const y = cup * Math.pow(Math.abs(Z), 1.4) * (1 + curl * 2) - droop * Math.pow(Math.max(0, X - 0.55), 2) - 0.08 * Math.pow(Math.max(0, -X), 1.5) + curl * 0.15 * Math.pow(Math.abs(Z), 2) * (X - 0.3);
			pos.push(X * L, y * L, Z * L);
			uv.push((X + 0.25) / 1.3, Z / 1.3 + 0.5);
			const c = paint(X, Z);
			col.push(c.r, c.g, c.b);
			const b = under(X, Z);
			colB.push(b.r, b.g, b.b);
		}
	}
	for (let k = 0; k < rings; k++)
		for (let j = 0; j < round; j++) {
			const a = k * (round + 1) + j, b = a + round + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	const front = made(pos, pos.map(() => 0), uv, col, idx, true);
	const n = front.attributes.normal;
	const posB = [], nor = [];
	for (let i = 0; i < n.count; i++) {
		posB.push(pos[i * 3] - n.getX(i) * 0.0003, pos[i * 3 + 1] - n.getY(i) * 0.0003, pos[i * 3 + 2] - n.getZ(i) * 0.0003);
		nor.push(-n.getX(i), -n.getY(i), -n.getZ(i));
	}
	const idxB = [];
	for (let i = 0; i < idx.length; i += 3) idxB.push(idx[i], idx[i + 2], idx[i + 1]);
	const back = made(posB, nor, uv.slice(), colB, idxB, false);
	return [front, back];
}

/**
 * A leaf on the vine: its petiole from the node at `at` out along the azimuth `az`, rising a little, then its blade
 * hanging from it, tip down, its face turned to `out` (away from the stake, to the light). `size` its midrib (m),
 * `age` days since its node formed, `sen` 0 green … 1 yellow … 2 dry brown.
 */
function leafOn(bag, o) {
	const { at, az, out, size, age, sen, seed, key } = o;
	const r = chance(seed, 'leaf', ...key);
	const grown = Math.max(0.12, span(age, 0, DR.opens));
	const L = size * grown * about(r, 1, 0.08);
	if (L < 0.004) return;
	const C = DR.colour;
	const young = 1 - span(age, 6, 22);
	const dry = clamp(sen - 1), yel = clamp(sen);
	// the petiole: out and a little up, twisted, purple at both ends
	const dir = v3(Math.cos(az), 0, Math.sin(az));
	const rise = about(r, 0.35, 0.25) - dry * 0.6;
	const pl = L * about(r, 0.6, 0.08);
	const pts = [];
	for (let i = 0; i <= 5; i++) {
		const s = i / 5;
		const d = dir.clone().multiplyScalar(Math.cos(rise - s * 0.5)).add(v3(0, Math.sin(rise - s * 0.5), 0));
		pts.push(i ? pts[i - 1].clone().addScaledVector(d.normalize(), pl / 5) : at.clone());
	}
	const pr = 0.0006 + 0.008 * L;
	const pc = mix(C.petiole, C.leafYoung, young * 0.6).lerp(C.yellow, yel * 0.7).lerp(C.brown, dry);
	bag.add('stem', tube(pts, (u) => pr * (u < 0.1 || u > 0.9 ? 1.25 : 1), (u) => mix(pc, mix(C.petioleEnd, C.brown, dry), (u < 0.12 || u > 0.88 ? 0.7 : 0) * (1 - yel)), fewer(5, 3)));
	// the blade: hanging from the petiole's end, its midrib out and down, its face to the light
	const tip = pts[5];
	const o2 = Math.atan2(out.z, out.x);
	let da = o2 - az;
	while (da > Math.PI) da -= Math.PI * 2;
	while (da < -Math.PI) da += Math.PI * 2;
	const baz = az + da * 0.5 + about(r, 0, 0.25);
	const hang = about(r, 0.62, 0.3) + young * 0.35 + dry * 0.5;
	const m = v3(Math.cos(baz) * Math.cos(hang), -Math.sin(hang), Math.sin(baz) * Math.cos(hang)).normalize();
	const want = out.clone().setY(0).normalize().multiplyScalar(0.55).add(v3(0, 0.85, 0));
	const face = want.addScaledVector(m, -want.dot(m)).normalize();
	const M = new THREE.Matrix4().makeBasis(m, face, new THREE.Vector3().crossVectors(m, face)).setPosition(tip);
	M.multiply(new THREE.Matrix4().makeRotationX(about(r, 0, 0.25)));
	const tone = about(r, 1, 0.07);
	const blotch = r() * 50;
	const paint = (x, z) => {
		const c = mix(C.leaf, C.leafYoung, young).multiplyScalar(tone);
		// yellowing from the margin in, then browning from the tip and the margin
		const edge = clamp(Math.hypot(x - 0.25, z) / outlineAt(Math.atan2(z, x - 0.25)));
		c.lerp(C.yellow, clamp(yel * 1.5 - (1 - edge) * 0.5 + (noise3(x * 6, z * 6, 1, blotch) - 0.5) * 0.4));
		c.lerp(mix(C.brown, C.yellow, noise3(x * 9, z * 9, 2, blotch) * 0.5), clamp(dry * 1.6 - (1 - edge) * 0.6));
		return c;
	};
	const underP = (x, z) => {
		const c = mix(C.leafUnder, C.leafYoungUnder, young);
		c.lerp(C.yellow, clamp(yel * 1.2 - 0.2)).lerp(C.brown, clamp(dry * 1.3));
		return c;
	};
	for (const g of blade({ L, cup: 0.12 + dry * 0.2, droop: 0.3 + young * 0.3, curl: dry, paint, under: underP })) bag.add('leaf', g, M);
}

/* ---- the stem ---- */

/**
 * A path made once at its whole length, its points and the length along it at each; `upto(len)` its first `len`
 * metres as points (a younger stem is the first part of the older one), `at(s)` a point and its direction.
 */
function pathOf(points) {
	const s = [0];
	for (let i = 1; i < points.length; i++) s.push(s[i - 1] + points[i].distanceTo(points[i - 1]));
	const total = s[s.length - 1];
	const find = (len) => {
		let lo = 0, hi = s.length - 1;
		while (hi - lo > 1) {
			const mid = (lo + hi) >> 1;
			if (s[mid] <= len) lo = mid;
			else hi = mid;
		}
		return lo;
	};
	return {
		points,
		s,
		total,
		at(len) {
			const x = clamp(len, 0, total);
			const i = Math.min(points.length - 2, find(x));
			const k = (x - s[i]) / Math.max(1e-9, s[i + 1] - s[i]);
			return { p: points[i].clone().lerp(points[i + 1], clamp(k)), t: points[i + 1].clone().sub(points[i]).normalize() };
		},
		upto(len, every = 1) {
			const x = clamp(len, 0, total);
			const i = find(x);
			const out = points.slice(0, i + 1).filter((_, j) => j % every === 0 || j === i);
			const end = this.at(x).p;
			if (end.distanceTo(out[out.length - 1]) > 1e-4) out.push(end);
			return out;
		},
	};
}

/** the stake's axis at height y: a straight pole leaning a little */
function stakeAxis(plant, y) {
	return plant.stake.clone().addScaledVector(plant.lean, y - DR.stake.foot).setY(y);
}
const stakeR = (y) => lerp(DR.stake.r, DR.stake.rTop, clamp((y - DR.stake.foot) / (DR.stake.top - DR.stake.foot)));

/**
 * The main stem's path once the stake is in: up from the head through the mound to its surface, over to the stake,
 * then round it as a right-handed helix (anticlockwise seen from above: x = r cos θ, z = −r sin θ, θ rising with
 * height; on the side facing the eye each turn rises from lower left to upper right) to its top, then up a little
 * more, over, and hanging down beside it.
 */
function twinedPath(plant) {
	const r = chance(plant.seed, 'twine');
	const pts = [];
	const H = plant.head;
	const surf = surfaceAt(H.x, H.z);
	for (let y = H.y; y < surf; y += 0.02) pts.push(v3(H.x, y, H.z));
	const P1 = v3(H.x, surf + 0.02, H.z);
	pts.push(P1);
	// where it meets the stake: on the stake's side towards the head, a little round
	const y0 = surf + 0.22;
	const ax0 = stakeAxis(plant, y0);
	const toward = P1.clone().sub(ax0).setY(0).normalize();
	let theta = Math.atan2(-toward.z, toward.x) + 0.6;
	const coil = (y, th) => {
		const ax = stakeAxis(plant, y);
		const R = stakeR(y) + 0.004;
		return v3(ax.x + R * Math.cos(th), y, ax.z - R * Math.sin(th));
	};
	const E0 = coil(y0, theta);
	// over to it: a smooth curve from straight up at the surface to along the helix
	const T0 = v3(0, 1, 0), T1 = coil(y0 + 0.01, theta + (2 * Math.PI * 0.01) / DR.pitch).sub(E0).normalize();
	const d = P1.distanceTo(E0);
	for (let i = 1; i < 12; i++) {
		const t = i / 12, h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
		pts.push(P1.clone().multiplyScalar(h00).addScaledVector(T0, h10 * d).addScaledVector(E0, h01).addScaledVector(T1, h11 * d));
	}
	// round the stake to its top, the turns a little uneven
	const wob = r() * 10;
	for (let y = y0; y <= DR.stake.top; y += 0.012) {
		pts.push(coil(y, theta));
		theta += (2 * Math.PI * 0.012) / (DR.pitch * (1 + 0.18 * (noise3(y * 3, wob, 0) - 0.5)));
	}
	// over the top: up a little, bending out, then hanging down beside the stake
	const outAz = Math.atan2(FACING.z, FACING.x) + Math.PI * 0.5 + about(r, 0, 0.8);
	const out = v3(Math.cos(outAz), 0, Math.sin(outAz));
	let p = pts[pts.length - 1].clone();
	const steps = 80;
	for (let i = 1; i <= steps; i++) {
		const s = (i / steps) * 1.3;
		const bend = Math.PI * 0.95 * span(s, 0, 0.55);
		const sway = 0.25 * Math.sin(s * 4 + wob);
		const dir = v3(0, Math.cos(bend), 0).addScaledVector(out, Math.sin(bend)).add(v3(-out.z * sway * 0.3, 0, out.x * sway * 0.3)).normalize();
		p = p.clone().addScaledVector(dir, 1.3 / steps);
		pts.push(p);
	}
	return pathOf(pts);
}

/** the shoot before the stake is in: straight up out of the mound, its tip nodding over as it grows */
function freePath(plant) {
	const r = chance(plant.seed, 'free');
	const pts = [];
	const H = plant.head;
	const surf = surfaceAt(H.x, H.z);
	const az = Math.atan2(-FACING.z, -FACING.x) + about(r, 0, 0.6);
	const h = v3(Math.cos(az), 0, Math.sin(az));
	let p = H.clone();
	for (let s = 0; s <= 1.8; s += 0.02) {
		const above = Math.max(0, p.y - surf);
		const lean = above > 0 ? 0.06 + 1.15 * span(s - (surf - H.y), 0.25, 0.95) : 0;
		const dir = v3(0, Math.cos(lean), 0).addScaledVector(h, Math.sin(lean));
		p = p.clone().addScaledVector(dir, 0.02);
		const floor = surfaceAt(p.x, p.z) + 0.01;
		if (s > surf - H.y + 0.05 && p.y < floor) p.y = floor;
		pts.push(p);
	}
	return pathOf(pts);
}

/** the main stem's length (m) at `day`: through the mound to its surface before it comes up, then DR.length */
function mainLength(plant, day) {
	const under = surfaceAt(plant.head.x, plant.head.z) - plant.head.y;
	if (day < DR.emerge) return under * span(day, DR.emerge - 18, DR.emerge);
	return under + table(day - DR.emerge, DR.length);
}
/** the day the main stem reached a length (the inverse of mainLength) */
function dayOfLength(plant, len) {
	let lo = DR.emerge - 20, hi = DR.emerge + 140;
	if (mainLength(plant, hi) < len) return Infinity;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (mainLength(plant, mid) < len) lo = mid;
		else hi = mid;
	}
	return hi;
}

/** a stem along `pts`: round, `r0` at its foot thinning towards its tip, its colour by where along it (s) */
function stemTube(bag, pts, r0, paint, sides = 6) {
	if (pts.length < 2) return;
	bag.add('stem', tube(pts, (u, v, s) => r0 * (1 - 0.65 * u), (u, v, s) => paint(u, s), fewer(sides, 3), true));
}

/** the prickles of the stem's foot: short, hard, hooked downward, many near the soil and none by 0.6 m along it */
function prickles(bag, path, from, len, seed) {
	const r = chance(seed, 'prickles');
	const C = DR.colour;
	for (let s = from; s < Math.min(len, from + 0.62); s += 0.004) {
		const dens = 1 - (s - from) / 0.62;
		if (r() > dens * 0.32) continue;
		const { p, t } = path.at(s);
		const a = r() * Math.PI * 2;
		const side = across(t);
		const rad = side.clone().applyAxisAngle(t, a);
		const dir = rad.clone().multiplyScalar(0.8).addScaledVector(t, -0.6).normalize();
		const len2 = between(r, 0.002, 0.0045);
		const g = new THREE.ConeGeometry(0.0007, len2, fewer(4, 3), 1);
		g.translate(0, len2 / 2, 0);
		const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
		g.applyMatrix4(new THREE.Matrix4().compose(p.clone().addScaledVector(rad, 0.0035), q, v3(1, 1, 1)));
		const n = g.attributes.position.count, col = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) col.set([C.prickle.r, C.prickle.g, C.prickle.b], i * 3);
		g.setAttribute('color', new THREE.BufferAttribute(col, 3));
		bag.add('body', g);
	}
}

/** a scale leaf (cataphyll) at one of the first nodes: a small brown-green triangle along the stem */
function scaleLeaf(bag, at, t, seed, key) {
	const r = chance(seed, 'scale', ...key);
	const a = r() * Math.PI * 2;
	const rad = across(t).applyAxisAngle(t, a);
	const dir = t.clone().multiplyScalar(0.9).addScaledVector(rad, 0.35).normalize();
	const L = between(r, 0.004, 0.009);
	const g = sheet({ length: L, width: L * 0.45, shape: (u) => 1 - u, lift: () => 0, paint: () => DR.colour.scale, back: () => DR.colour.scale, backLit: false, along: 2, across: 2 });
	const face = rad.clone().addScaledVector(dir, -rad.dot(dir)).normalize();
	const M = new THREE.Matrix4().makeBasis(dir, face, new THREE.Vector3().crossVectors(dir, face)).setPosition(at.clone().addScaledVector(rad, 0.003));
	bag.add('body', g, M);
}

/* ---- the sett, the tuber, the roots ---- */

/**
 * A lathe turned round +Y downward from its top at the origin: `len` long, its half-width `w(u)` (u 0 top … 1 bottom),
 * flattened across by `flat`, its rings spaced by (1 − cos) toward both poles so it closes round (orange v2), its
 * surface lumped a little by noise; painted by `paint(u, a)`. UVs in metres for the skin's tile.
 */
function lathe(len, w, flat, paint, o = {}) {
	const rings = fewer(o.rings ?? 36, 6), sides = fewer(o.sides ?? 28, 6);
	const pos = [], uv = [], col = [], idx = [];
	const ns = o.ns ?? 0;
	const lump = o.lump ?? 0.03;
	let around = 0;
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((i / rings) * Math.PI)) / 2;
		const R = w(u);
		around = Math.max(around, R * Math.PI * 2);
		for (let j = 0; j <= sides; j++) {
			const a = (j / sides) * Math.PI * 2;
			const n = 1 + lump * (noise3(Math.cos(a) * 3, u * len * 18, Math.sin(a) * 3, ns) - 0.5) * 2 + lump * 0.4 * (noise3(Math.cos(a) * 9, u * len * 60, Math.sin(a) * 9, ns + 5) - 0.5);
			const bend = o.bend ? o.bend(u) : 0;
			pos.push(Math.cos(a) * R * n * flat + bend, -u * len, Math.sin(a) * R * n);
			uv.push(j / sides, (u * len) / 0.08);
			const c = paint(u, a);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const g = made(pos, pos.map(() => 0), uv, col, idx, true);
	smoothNormals(g);
	// round it the skin's tile is laid in metres too
	const t = g.attributes.uv;
	for (let i = 0; i < t.count; i++) t.setX(i, (t.getX(i) * around) / 0.08);
	return g;
}

/**
 * The tuber at `day`, hanging straight down from its head at `at` (its top), as finely as the tuber view needs when
 * `fine`: its profile by age traced off the sheet, flattened a little, bent a little by its own chance; its skin pale
 * tan when young, browning as it bulks, with the skin's picture; its head a paler knob; scattered short wiry rootlets,
 * most on its upper third.
 */
function tuber(bag, o) {
	const { at, day, seed, fine = false } = o;
	if (day < DR.tuberFrom) return null;
	const r = chance(seed, 'tuber');
	const L = table(day, DR.tuberL) * about(r, 1, 0.05);
	const W = table(day, DR.tuberW) * about(r, 1, 0.05);
	const grown = span(day, 115, 200);
	// the traced profiles, their tails closed round as an ellipse's end (a lathe from traced widths otherwise ends in a
	// point, orange v2)
	const close = (rows, u0, u) => (u <= u0 ? table(u, rows) : table(u0, rows) * Math.sqrt(Math.max(0, 1 - ((u - u0) / (1 - u0)) ** 2)));
	const shape = (u) => lerp(close(DR.tuberYoung, 0.8, u), close(DR.tuberGrown, 0.84, u), grown);
	const C = DR.colour;
	const skin = day < 130 ? mix(C.skinYoung, C.skinMid, span(day, 100, 130)) : day < 190 ? mix(C.skinMid, C.skinBrown, span(day, 130, 190)) : mix(C.skinBrown, C.skin, span(day, 190, 225));
	const ns = r() * 100;
	const bendBy = about(r, 0, 0.035) * L;
	const paint = (u, a) => {
		const c = skin.clone().multiplyScalar(0.85 + 0.3 * noise3(Math.cos(a) * 2, u * L * 12, Math.sin(a) * 2, ns));
		// the head end paler, the tail a little darker
		if (u < 0.06) c.lerp(C.head, 1 - u / 0.06);
		return c;
	};
	const g = lathe(L, (u) => (W / 2) * shape(u), DR.flat, paint, { rings: fine ? 48 : 30, sides: fine ? 36 : 22, ns, lump: 0.035, bend: (u) => bendBy * Math.sin(u * Math.PI) });
	g.translate(at.x, at.y, at.z);
	bag.add('skin', g);
	// the head: a small hard knob where the stem joins
	const hr = clamp(W * 0.2, 0.004, 0.016);
	bag.add('body', bead(at.clone().add(v3(0, hr * 0.2, 0)), v3(hr, hr * 0.7, hr), mix(C.head, skin, 0.5), 8));
	// rootlets: fine and wiry, 1–4.5 cm, most on the upper third; none on a young smooth tuber
	const n = Math.round(clamp((L - 0.1) / 0.2) * (fine ? 90 : 50) * Math.min(1, DETAIL.level * 1.5));
	for (let i = 0; i < n; i++) {
		const u = Math.pow(r(), 1.7) * 0.92 + 0.03;
		const a = r() * Math.PI * 2;
		const R = (W / 2) * shape(u);
		const base = v3(Math.cos(a) * R * DR.flat + bendBy * Math.sin(u * Math.PI), -u * L, Math.sin(a) * R).add(at);
		const out = v3(Math.cos(a), between(r, -0.6, 0.1), Math.sin(a)).normalize();
		const len = between(r, 0.01, 0.045);
		const pts = [base];
		const d = out.clone();
		for (let k = 1; k <= 3; k++) {
			d.add(v3(about(r, 0, 0.35), -0.15, about(r, 0, 0.35))).normalize();
			pts.push(pts[k - 1].clone().addScaledVector(d, len / 3));
		}
		bag.add('body', tube(pts, (uu) => 0.0006 * (1 - 0.6 * uu), () => C.rootlet.clone().multiplyScalar(about(r, 1, 0.2)), 3));
	}
	return { L, W };
}

/** the tuber's mass (kg) at `day`: its lathe's volume (its profile as at that age) at a density of 1.05 (S1: ~67 % water) */
function tuberMass(day) {
	if (day < DR.tuberFrom) return 0;
	const L = table(day, DR.tuberL), W = table(day, DR.tuberW), grown = span(day, 115, 200);
	let v = 0;
	for (let i = 0; i < 200; i++) {
		const u = (i + 0.5) / 200;
		const w = lerp(table(u, DR.tuberYoung), table(u, DR.tuberGrown), grown) * (W / 2);
		v += Math.PI * w * w * DR.flat * (L / 200);
	}
	return v * 1050;
}

/**
 * The sett at `day`: a head sett lying in the mound, its skin end (the old tuber's head, where the shoot breaks) at
 * `at`, its cut end towards `dir`, dried and dusted with ash; shrinking and darkening as the vine lives on it.
 */
function sett(bag, o) {
	const { at, dir, day, seed } = o;
	const r = chance(seed, 'sett');
	const C = DR.colour;
	const spent = span(day, DR.emerge, DR.emerge + 150);
	const k = 1 - 0.32 * spent;
	const L = DR.sett.L * k, R = (DR.sett.D / 2) * k;
	// rounded at its head end, cut square at the other
	const w = (u) => R * (u < 0.25 ? Math.sqrt(1 - Math.pow(1 - u / 0.25, 2)) * 0.85 + 0.15 * (u / 0.25) : 1 - 0.04 * u);
	const skin = mix(C.skinBrown, C.skin, 0.6).lerp(lin(0.12, 0.07, 0.04), spent * 0.7);
	const ns = r() * 100;
	const g = lathe(L, w, 1.05, (u, a) => skin.clone().multiplyScalar(0.8 + 0.35 * noise3(Math.cos(a) * 2, u * 8, Math.sin(a) * 2, ns)), { rings: 14, sides: 18, ns, lump: 0.08 + 0.1 * spent });
	// the cut face, a disc at the end
	const cut = new THREE.CircleGeometry(R * 0.98, fewer(18, 6));
	cut.rotateX(Math.PI / 2);
	cut.translate(0, -L, 0);
	const cc = mix(C.cutDry, C.flesh, 0.25).lerp(lin(0.2, 0.12, 0.07), spent * 0.8);
	const n = cut.attributes.position.count, col = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const rr = Math.hypot(cut.attributes.position.getX(i), cut.attributes.position.getZ(i)) / R;
		const c = mix(cc, lin(0.25, 0.14, 0.08), smooth((rr - 0.82) * 6));
		col.set([c.r, c.g, c.b], i * 3);
	}
	cut.setAttribute('color', new THREE.BufferAttribute(col, 3));
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize());
	const M = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	bag.add('skin', g, M);
	bag.add('body', cut, M.clone());
}

/**
 * The fibrous roots from the head: thin, wiry, unbranched, out through the mound just under its surface and down
 * into the field's soil beyond it, cream when young, browning; grown in the vine's first six weeks.
 */
function fibrous(bag, o) {
	const { at, day, seed } = o;
	const r = chance(seed, 'roots');
	const C = DR.colour;
	const n = fewer(DR.roots.n, 6);
	const age = span(day, DR.emerge + 20, DR.emerge + 170);
	for (let i = 0; i < n; i++) {
		const az = (i / n) * Math.PI * 2 + about(r, 0, 0.25);
		const reach = between(r, DR.roots.reach[0], DR.roots.reach[1]);
		const start = DR.emerge - 10 + r() * 25;
		const grown = span(day, start, start + 40 + reach * 20);
		const slope = between(r, 0.08, 0.55);
		const wob = r() * 40;
		if (grown <= 0.01) {
			r(), r();
			continue;
		}
		const steps = Math.max(6, Math.round(reach * 30));
		const pts = [at.clone()];
		let p = at.clone();
		const dir = v3(Math.cos(az), -slope, Math.sin(az)).normalize();
		for (let k = 1; k <= steps; k++) {
			dir.x += (noise3(k * 0.3, wob, 0) - 0.5) * 0.3;
			dir.z += (noise3(k * 0.3, wob, 7) - 0.5) * 0.3;
			dir.y += (noise3(k * 0.3, wob, 13) - 0.5) * 0.2 - 0.01;
			dir.normalize();
			p = p.clone().addScaledVector(dir, reach / steps);
			// in the soil: under the mound's surface, or under the field's past its foot, and no deeper than a metre
			const top = surfaceAt(p.x, p.z) - 0.025;
			if (p.y > top) p.y = top;
			if (p.y < -0.6) p.y = -0.6;
			pts.push(p);
		}
		const m = Math.max(2, Math.round(grown * steps) + 1);
		const ps = pts.slice(0, m);
		const rr = DR.roots.r * between(r, 0.8, 1.3);
		bag.add('body', tube(ps, (u) => rr * (1 - 0.5 * u), (u) => mix(C.rootYoung, C.rootOld, age * 0.8 + (1 - u) * 0.2), 3));
	}
}

/* ---- the mound and the stake ---- */

/**
 * The mound: a heap of the field's topsoil, rounded and flat-topped, clods on its surface. Whole in a world; in the
 * viewer (where the roots are drawn) cut open as the sheet shows it: a wedge towards the eye taken out from a line a
 * little behind the middle, its two faces the moist soil inside, so the sett, the tuber and the roots in it are seen.
 */
function mound(bag, o) {
	const { seed, open } = o;
	const r = chance(seed, 'mound');
	const C = DR.colour;
	const { R } = DR.mound;
	const ns = r() * 100;
	const apex = FACING.clone().multiplyScalar(-0.05);
	const half = 0.7; // the wedge's half-angle (radians): 80° opened
	const face = Math.atan2(FACING.z, FACING.x);
	const rough = (x, z) => 0.045 * (noise3(x * 7, z * 7, 0, ns) - 0.5) + 0.02 * (noise3(x * 22, z * 22, 3, ns) - 0.5) + 0.012 * Math.max(0, cells(x * 14, 0, z * 14, ns).f1 - 0.3);
	const yAt = (x, z) => {
		const rr = Math.hypot(x, z);
		return rr >= R ? 0 : Math.max(0, moundY(rr) + rough(x, z) * smooth((R - rr) / 0.08));
	};
	// the surface: rings round the apex, out to the mound's foot, round the angles not cut away
	const rings = fewer(26, 5), round = fewer(open ? 80 : 96, 12);
	const a0 = open ? face + half : 0, a1 = open ? face + Math.PI * 2 - half : Math.PI * 2;
	const c0 = open ? apex : v3(0, 0, 0);
	const footAt = (a) => {
		// where the ray from c0 at angle a leaves the circle of radius R (round the middle)
		const dx = Math.cos(a), dz = Math.sin(a);
		const b = c0.x * dx + c0.z * dz, c = c0.x * c0.x + c0.z * c0.z - R * R;
		return -b + Math.sqrt(Math.max(0, b * b - c));
	};
	const pos = [], uv = [], col = [], idx = [];
	for (let k = 0; k <= rings; k++) {
		const t = Math.pow(k / rings, 0.8);
		for (let j = 0; j <= round; j++) {
			const a = lerp(a0, a1, j / round);
			const d = footAt(a) * t;
			const x = c0.x + Math.cos(a) * d, z = c0.z + Math.sin(a) * d;
			const y = yAt(x, z) + (k === rings ? -0.005 : 0);
			pos.push(x, y, z);
			uv.push(x / 0.25, z / 0.25);
			const c = C.soil.clone().multiplyScalar(0.7 + 0.5 * noise3(x * 5, z * 5, 9, ns) + 0.15 * (noise3(x * 25, z * 25, 11, ns) - 0.5));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let k = 0; k < rings; k++)
		for (let j = 0; j < round; j++) {
			const a = k * (round + 1) + j, b = a + round + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	bag.add('soil', made(pos, pos.map(() => 0), uv, col, idx, true));
	if (!open) return;
	// the two cut faces: from the apex out to the foot, from the field's level up to the surface
	for (const [a, sideSign] of [[a0, 1], [a1, -1]]) {
		const L = footAt(a);
		const n = fewer(20, 5), up = 6;
		const p2 = [], u2 = [], c2 = [], i2 = [];
		for (let i = 0; i <= n; i++) {
			const d = (i / n) * L;
			const x = c0.x + Math.cos(a) * d, z = c0.z + Math.sin(a) * d;
			const top = yAt(x, z);
			for (let j = 0; j <= up; j++) {
				const y = (j / up) * top;
				p2.push(x, y, z);
				u2.push(d / 0.25, y / 0.25);
				const c = mix(C.soilCut, C.soil, 0.1 + 0.3 * noise3(d * 8, y * 8, 4, ns) + 0.5 * smooth((y - top + 0.06) / 0.06));
				c2.push(c.r, c.g, c.b);
			}
		}
		for (let i = 0; i < n; i++)
			for (let j = 0; j < up; j++) {
				const q = i * (up + 1) + j, b = q + up + 1;
				if (sideSign < 0) i2.push(q, b, q + 1, b, b + 1, q + 1);
				else i2.push(q, q + 1, b, b, q + 1, b + 1);
			}
		bag.add('soil', made(p2, p2.map(() => 0), u2, c2, i2, true));
	}
	// the field's earth under the opened wedge, its floor
	const fl = [], fu = [], fc = [], fi = [];
	const m = fewer(16, 4);
	for (let j = 0; j <= m; j++) {
		const a = lerp(a1 - Math.PI * 2, a0, j / m);
		const L = footAt(a);
		fl.push(c0.x, 0.002, c0.z, c0.x + Math.cos(a) * L, 0.002, c0.z + Math.sin(a) * L);
		fu.push(c0.x / 0.25, c0.z / 0.25, (c0.x + Math.cos(a) * L) / 0.25, (c0.z + Math.sin(a) * L) / 0.25);
		const c = mix(C.soilCut, C.soil, 0.4);
		fc.push(c.r, c.g, c.b, c.r, c.g, c.b);
	}
	for (let j = 0; j < m; j++) fi.push(j * 2, j * 2 + 3, j * 2 + 1, j * 2, j * 2 + 2, j * 2 + 3);
	bag.add('soil', made(fl, fl.map(() => 0), fu, fc, fi, true));
}

/** the stake: a rough bush pole, grey-brown, a few knots, from inside the mound to 2.2 m over it */
function stake(bag, plant) {
	const r = chance(plant.seed, 'stake');
	const C = DR.colour;
	const pts = [];
	const n = fewer(24, 4);
	for (let i = 0; i <= n; i++) {
		const y = lerp(DR.stake.foot, DR.stake.top, i / n);
		pts.push(stakeAxis(plant, y).add(v3(0.004 * (noise3(y * 2, 0, 0, 5) - 0.5), 0, 0.004 * (noise3(y * 2, 0, 3, 5) - 0.5))));
	}
	const ns = r() * 100;
	const g = tube(
		pts,
		(u, v, s) => lerp(DR.stake.r, DR.stake.rTop, u) * (1 + 0.06 * (noise3(Math.cos(v * 6.283) * 2, s * 6, Math.sin(v * 6.283) * 2, ns) - 0.5)),
		(u, v, s) => C.stake.clone().multiplyScalar(0.7 + 0.5 * noise3(v * 6, s * 3, 1, ns)),
		fewer(10, 4),
		true,
	);
	metric(g, (DR.stake.top - DR.stake.foot) / 0.3, (DR.stake.r * Math.PI * 2) / 0.3 * 4);
	bag.add('prop', g);
	// a cut-off twig or two
	for (let i = 0; i < 2; i++) {
		const y = between(r, 0.9, 2.4);
		const a = r() * Math.PI * 2;
		const p = stakeAxis(plant, y);
		const d = v3(Math.cos(a), 0.8, Math.sin(a)).normalize();
		bag.add('prop', tube([p, p.clone().addScaledVector(d, 0.035)], () => 0.006, () => C.stake.clone().multiplyScalar(0.85), fewer(6, 3), true));
	}
}

/* ================================================================================================================
 * 3. THE PLANT — the shoot out of its sett, up its stake, its tuber under it, the season to its end
 * ============================================================================================================== */

/** where one stand's parts are: the head (the shoot's foot, where the tuber hangs from), the stake, its lean */
function standOf(seed) {
	const r = chance(seed, 'stand');
	const h = FACING.clone().multiplyScalar(0.08);
	const head = v3(h.x, surfaceAt(h.x, h.z) - DR.sett.deep, h.z);
	const st = FACING.clone().multiplyScalar(-0.08);
	const la = r() * Math.PI * 2, lean = about(r, 0.02, 0.015);
	return { seed, head, stake: v3(st.x, 0, st.z), lean: v3(Math.cos(la) * lean, 0, Math.sin(la) * lean) };
}

/** a leaf's season: 0 green … 1 yellow … 2 dry brown, and whether it has fallen; the lowest yellow first */
function seasonOf(day, y, seed, key) {
	const r = chance(seed, 'season', ...key);
	const Y = DR.yellows + 26 * clamp(y / DR.stake.top) + about(r, 0, 6);
	return { sen: span(day, Y, Y + 10) + span(day, Y + 10, Y + 18), fallen: day > Y + 20 + r() * 12 };
}

/** the nodes along a stem from `from` to `to` (m along it): the scale leaves first on the main stem, then leaves */
function nodesOf(from, to, main) {
	const out = [];
	let s = from;
	let n = 0;
	while (s < to) {
		const scale = main && n < DR.scales;
		out.push({ s, n, scale, pair: !scale && (main ? s > DR.opposite : true) });
		s += scale ? 0.035 : main ? table(s, DR.internode) : 0.075;
		n++;
	}
	return out;
}

/** the direction away from the stake at a point, level */
function outward(plant, p) {
	const d = p.clone().sub(stakeAxis(plant, p.y)).setY(0);
	return d.lengthSq() > 1e-8 ? d.normalize() : FACING.clone();
}

/** the leaves at one node of a stem: one (alternate, turning half round) or a pair (opposite) */
function nodeLeaves(bag, o) {
	const { plant, day, node, at, out, size, formed, key } = o;
	if (day < formed) return;
	const r = chance(plant.seed, 'node', ...key);
	const oaz = Math.atan2(out.z, out.x);
	const leaves = node.pair ? [oaz + about(r, 1.2, 0.3), oaz - about(r, 1.2, 0.3)] : [oaz + (node.n % 2 ? 1 : -1) * about(r, 0.8, 0.35)];
	leaves.forEach((az, i) => {
		const { sen, fallen } = seasonOf(day, at.y, plant.seed, [...key, i]);
		if (fallen) return;
		leafOn(bag, { at, az, out, size: size * about(r, 1, 0.08), age: day - formed, sen, seed: plant.seed, key: [...key, i] });
	});
}

/**
 * A side shoot from an axil high on the main stem: out from the stake and up, then over and hanging, a little
 * swaying; its own leaves opposite, a little smaller than the main stem's.
 */
function lateral(bag, o) {
	const { plant, day, from, out, start, Lf, key } = o;
	if (day < start) return;
	const r = chance(plant.seed, 'lateral', ...key);
	const len = Lf * span(day, start, start + Lf / 0.05);
	if (len < 0.01) return;
	// it climbs too: loosely round the stake (and the stems already on it), right-handed, a wide slow helix out to
	// 0.08–0.22 m from the stake's axis; past the stake's top, or once it has climbed its share, it bends over and hangs
	const rho = between(r, 0.12, 0.3);
	const pitch = between(r, 0.35, 0.6);
	const climb = Lf * between(r, 0.45, 0.75);
	const steps = Math.max(8, Math.round(Lf * 50));
	const ax0 = stakeAxis(plant, from.y);
	const off0 = from.clone().sub(ax0).setY(0);
	let th = Math.atan2(-off0.z, off0.x);
	let rr = off0.length();
	const pts = [from.clone()];
	let p = from.clone();
	let over = null;
	const wob = r() * 30;
	for (let i = 1; i <= steps; i++) {
		const s = (i / steps) * Lf;
		const ds = Lf / steps;
		if (!over && (s > climb || p.y > DR.stake.top + 0.12)) {
			// over: from here on out and down, its direction turning from where it was going to hanging
			const prev = pts[pts.length - 2] ?? from;
			over = { s, d: p.clone().sub(prev).normalize(), out: p.clone().sub(stakeAxis(plant, p.y)).setY(0).normalize() };
		}
		if (!over) {
			rr = lerp(rr, rho, 0.12);
			const R = Math.max(rr, stakeR(p.y) + 0.012);
			const rise = ds * pitch / Math.hypot(pitch, 2 * Math.PI * R);
			th += (ds * 2 * Math.PI) / Math.hypot(pitch, 2 * Math.PI * R) * (1 + 0.3 * (noise3(s * 2, wob, 0) - 0.5));
			const ax = stakeAxis(plant, p.y + rise);
			p = v3(ax.x + R * Math.cos(th), p.y + rise, ax.z - R * Math.sin(th));
		} else {
			const k = span(s - over.s, 0, 0.6);
			const d = over.d.clone().multiplyScalar(1 - k).addScaledVector(over.out.clone().multiplyScalar(0.35).add(v3(0, -1, 0)).normalize(), k).normalize();
			d.x += 0.15 * (noise3(s * 3, wob, 5) - 0.5);
			d.z += 0.15 * (noise3(s * 3, wob, 9) - 0.5);
			p = p.clone().addScaledVector(d.normalize(), ds);
			const floor = surfaceAt(p.x, p.z) + 0.05;
			if (p.y < floor) p.y = floor;
		}
		pts.push(p);
	}
	const path = pathOf(pts);
	const C = DR.colour;
	const de = day - start;
	stemTube(bag, path.upto(len), 0.0018, (u, s) => mix(C.stem, C.shoot, span(s, len - 0.2, len) * (1 - span(de, 40, 60))).lerp(C.straw, span(day, 222, 240)), 5);
	for (const node of nodesOf(0.06, len, false)) {
		const { p: at } = path.at(node.s);
		nodeLeaves(bag, { plant, day, node, at, out: outward(plant, at), size: DR.leaf * 0.85 * table(node.s / Lf, [[0, 0.85], [0.6, 1], [1, 0.75]]), formed: start + node.s / 0.05 + 2, key: [...key, node.n] });
	}
}

/**
 * One stand at `day`: the mound, the sett in it and the shoot out of it; the stake from three weeks after it comes up,
 * the stem twining up it, its leaves, its side shoots; the tuber under the head, the fibrous roots; and from 5½
 * months after emergence the leaves yellowing from the bottom up, browning and falling, the vine dying to straw.
 */
function yamPlant(day, seed) {
	const bag = new Bag();
	const plant = standOf(seed);
	const C = DR.colour;
	const below = DETAIL.roots;
	mound(bag, { seed, open: below });
	const staked = day >= DR.staked;
	if (staked) stake(bag, plant);
	const shootDir = FACING.clone().applyAxisAngle(UP, 0.5);
	if (below) {
		sett(bag, { at: plant.head.clone().addScaledVector(shootDir, 0.01).add(v3(0, -0.012, 0)), dir: shootDir, day, seed });
		tuber(bag, { at: plant.head.clone().add(v3(0, -0.01, 0)), day, seed });
		fibrous(bag, { at: plant.head.clone().add(v3(0, 0.005, 0)), day, seed });
	}
	const len = mainLength(plant, day);
	if (len <= 0.005) return bag.build();
	const path = staked ? twinedPath(plant) : freePath(plant);
	const under = surfaceAt(plant.head.x, plant.head.z) - plant.head.y;
	const de = day - DR.emerge;
	const r0 = 0.0026 + 0.0014 * span(de, 0, 70);
	const total = Math.min(len, path.total);
	const pts = path.upto(total);
	stemTube(bag, pts, r0, (u, s) => {
		const c = mix(C.stemFoot, C.stem, span(s, under + 0.05, under + 0.5));
		// the growing tip purple-green, as the young shoot is (CRI-Pona); the whole shoot so while it is short
		c.lerp(C.shoot, Math.max(span(s, total - 0.35, total) * (1 - span(de, 75, 95)), 1 - span(de, 6, 20)));
		// dying back from its foot up
		return c.lerp(C.straw, span(day, 213 + (8 * s) / 4.6, 236 + (8 * s) / 4.6));
	});
	if (DETAIL.level >= 0.5) prickles(bag, path, under, total, seed);
	// its nodes: the scale leaves, then leaves alternate and above a metre or so opposite
	const lats = [];
	const lr = chance(seed, 'laterals');
	for (const node of nodesOf(under + 0.02, path.total, true)) {
		const formed = dayOfLength(plant, node.s + 0.1);
		if (node.s > total) break;
		const { p: at, t } = path.at(node.s);
		if (node.scale) {
			if (DETAIL.level >= 0.5 && day >= formed && day < DR.yellows + 30) scaleLeaf(bag, at, t, seed, ['main', node.n]);
			continue;
		}
		const out = staked ? outward(plant, at) : v3(Math.cos(node.n * 2.4), 0, Math.sin(node.n * 2.4));
		nodeLeaves(bag, { plant, day, node, at, out, size: DR.leaf * table(node.s, DR.leafBy), formed, key: ['main', node.n] });
		// side shoots from the upper axils: about one node in three from 0.3 m up (some from near the base, S7)
		if (staked && at.y > 0.3 && lats.length < DR.laterals && lr() < 0.3) lats.push({ at, out, formed, n: node.n, Lf: between(lr, 0.6, 1.2) + 1.0 * clamp((at.y - 0.3) / 2.2) });
	}
	for (const l of lats) lateral(bag, { plant, day, from: l.at, out: l.out, start: l.formed + 10, Lf: l.Lf, key: ['lat', l.n] });
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the tuber view
 * ============================================================================================================== */

/**
 * Ten stages from the sett in its mound to the harvest; `day` the days since planting each is grown at (between two
 * stages, on the way). Planted in the dry season's end, the shoot up with the first rains 40 days on.
 */
const E = DR.emerge;
const STAGES = [
	{ name: 'Planted', day: 0, note: 'A head sett of last year\'s tuber, 10 cm long and some 0.37 kg, its cut face dried and dusted with ash, laid 13 cm deep in the top of a mound of loosened topsoil 0.6 m high and 1.2 m across; it sleeps there until the rains (1–3 months; here 40 days).' },
	{ name: 'Sprouting', day: E + 6, note: 'The shoot is through: one stout leafless spear 5–8 mm thick, purple-green, scale leaves at its first nodes and short hard prickles hooked down. Thin white roots have come from its foot, not from the sett, which feeds it.' },
	{ name: 'Shoot', day: E + 18, note: 'Two and a half weeks up: half a metre of vine, its tip circling as it seeks something to climb, the first small leaves alternate; the roots run out through the mound, most of them in its top 30 cm.' },
	{ name: 'Staked', day: E + 36, note: 'Staked at three to four weeks, the vine has been led onto the pole and twines up it to the right, about a turn every 15 cm; above a metre its leaves come in opposite pairs. The tuber has begun under the head (19–28 days after emergence).' },
	{ name: 'Top of the stake', day: E + 60, note: 'Two months up: the main stem at the top of its 2.2 m stake and over it, side shoots out of the upper axils, the leaves opening fast now; a tuber 8 cm long and 3.5 cm across, pale and smooth.' },
	{ name: 'Full canopy', day: E + 88, note: 'Three months: the vine at its full length, 4–5 m of main stem and its side shoots hanging round the stake in a column of glossy heart-shaped leaves; the tuber bulking fast, 15 × 7 cm and some 0.35 kg.' },
	{ name: 'Bulking', day: E + 120, note: 'Four months: the canopy at its peak (leaf area about 3 m² to the stand), the tuber 21 cm long and 10 cm across, browning, a kilogram.' },
	{ name: 'New yam', day: E + 150, note: 'Five months: Pona\'s new yam, 25 cm and some 1.7 kg, dug in late July or August for the new-yam festivals; a farmer who milks it cuts it off below the head and covers the head again, to regrow seed yams.' },
	{ name: 'Yellowing', day: E + 180, note: 'Six months: the leaves yellow from the foot of the vine up and the lowest fall; the tuber has stopped growing, 27 cm long and 11.5 cm across, 2.1 kg, rough brown skin and fine wiry rootlets on its upper part.' },
	{ name: 'Harvest', day: E + 210, note: 'Seven months after it came up the vine is dry straw on its stake, a few curled brown leaves left: the signal to dig. The tuber, cylindrical and blunt, white-fleshed, about 2.1 kg, lies dormant for two or three months; the old sett is a shrivelled husk.' },
];

/** the days since planting at a stage (0 … 9, between two stages on the way) */
function dayAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].day, STAGES[i + 1].day, x - i);
}

const grow = (stage, seed) => yamPlant(dayAt(stage), `${seed ?? 'maia'}`);

/** the tuber on its own at a stage: its head at the origin, hanging down −Y, as finely as close up needs */
function tuberView(stage, seed) {
	const day = dayAt(stage);
	const bag = new Bag();
	const got = lite({ roots: true }, () => tuber(bag, { at: v3(0, 0, 0), day, seed: `${seed ?? 'maia'}`, fine: true }));
	const g = bag.build();
	if (!got) g.userData.note = 'The tuber has not begun yet: it starts under the head some three weeks after the shoot comes up.';
	return g;
}

/** what the plant is grown with, in the order `build` takes it: stage, seed, detail, and the view (plant or tuber) */
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Tuber'] },
];

const PLANT = {
	id: 'yam',
	label: "Yam 'Pona' · Dioscorea rotundata",
	latin: "Dioscorea rotundata Poir. · syn. D. cayenensis subsp. rotundata (Poir.) J.Miège · white Guinea yam 'Pona' (Puna; CRI-Pona) · igname blanche · ji (Igbo), isu (Yoruba), doya (Hausa)",
	note: "Pona, Ghana's prized early white yam and the yam of the new-yam festivals: a head sett in a heaped mound, one spiny purple-green shoot that twines to the right up a 2.2 m stake, its broad heart-shaped leaves alternate low and opposite above, side shoots hanging over the top; under it one blunt cylindrical tuber, rough brown and white-fleshed, about 27 cm and 2 kg, dug as the vine yellows and dies some eight months from planting.",
	from: 'Twining vine · 8 months from a sett',
	layer: 'climber',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'b5143254caefa11455f955f7b8998c8b556dfeeab0dc479660fec2b6e21f6193', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, day, note }) => ({ name, day: Math.round(day), note })), // days from planting
	// what a world needs to plant it right; data sheet rows (references/yam-pona.md)
	facts: {
		planting: { sett: [0.1, 0.5], depth: [0.1, 0.2], mound: { height: [0.3, 1.0], width: [1.0, 1.5] }, unit: 'kg, m' },
		spacing: [1, 1.2], // 6,900–10,000 stands a hectare
		stake: { height: [2, 3], setAfterEmergence: [28, 42], unit: 'm, days' },
		days: { toEmergence: [30, 90], stemAtStakeTop: [42, 56], tuberStarts: [19, 28], senescenceAfterEmergence: [180, 210], toHarvest: [210, 270], dormancy: [60, 90] },
		vine: { mainStem: [3, 4.6], withSideShoots: [6, 10], stemDiameter: [0.006, 0.01], twines: 'right (anticlockwise seen from above)', prickles: 'lower 0.5 m', unit: 'm' },
		leaf: { length: [0.09, 0.14], width: [0.06, 0.1], petiole: [0.05, 0.08], veins: [5, 7], perStand: [250, 500], lai: 3, unit: 'm' },
		tuber: { length: [0.25, 0.4], diameter: [0.1, 0.15], mass: [1.5, 2.5], dryMatter: 0.33, top: [0.1, 0.2], unit: 'm, kg (top: m under the mound\'s surface)' },
		roots: { mostIn: 0.3, deepest: 1, spread: [3, 4], unit: 'm' },
		flowers: 'none in Pona (dioecious; most clones male or flowerless)',
		climate: 'humid and savanna tropics: 25–30 °C, vine growth severely limited below 20 °C; 1,500 mm of rain spread over 6–7 months (600 mm the least); full sun; deep loose well-drained soil, pH 5.5–6.5',
		yield: { tPerHa: [10, 15], ghanaAverage: 12.7, criPonaPotential: [26, 42] },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 its tuber) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => tuberView(stage ?? STAGES.length - 1, seed) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'yam' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'yam',
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
module.exports.organs = { DR, FACING, blade, leafOn, tuber, tuberMass, sett, fibrous, mound, stake, standOf, twinedPath, freePath, yamPlant, Bag, dayAt, STAGES, surface, lite, detailAt, outlineAt, lin, v3 };
