'use strict';
/*
 * MORINGA 'PKM-1' — Moringa oleifera Lam. 'PKM-1' (Moringaceae), Periyakulam 1: the annual drumstick tree released by
 * the Horticultural Research Station, Periyakulam (Tamil Nadu Agricultural University) in 1989, the most planted
 * cultivated moringa in India. Version 1 of plants/moringa: one named cultivar grown from its winged seed, pinched at
 * 75 cm into a vase of slender branches, flowering from its fourth month and followed to its first pods ripe.
 *
 * Its numbers are PKM-1's where they are measured (Beaulah 2016, Madras Agric. J.: 2.86 m at harvest, 5 branches,
 * pods 61–75 cm and 118 g, 150 pods a tree; Raja et al. 2011, Indian J. Hort.: 75.8 cm pods, 86.5 flowers a panicle,
 * 3.6 % set, 17.3 seeds a pod; a 2019 trial: 2.04 m and a 4.6 cm trunk at flowering, 8.7 cm at pod set; TNAU: pinched
 * at 75 cm, flowers at 90–100 days, first harvest at 160–170, pods 6.3 cm round; leaflets 2.75 × 1.65 cm) and the
 * species' otherwise (hypogeal germination, 2–3-pinnate leaves, the zygomorphic flower, the three-angled nine-ribbed
 * pod that splits into three valves, the swollen taproot, the corky pale bark). Every number with its source:
 * plant-skill's data sheet for it (moringa-pkm1.md, S1–S25).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its old bark redrawn and its pods pasted in from a plate of their own, kept on play by its hash
 * (058c8664…): its leaflet's outline and its colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots, sound()),
 *                   as banana v2 carries it (picture() with mipmaps, named colours parsed once, leaf undersides with
 *                   their own normals), with the moringa's materials and colour surfaces: corky bark, lenticels, the
 *                   pod's stipple.
 *   2. ORGANS       the moringa's own, each to its measure: the winged seed, the compound leaf and its leaflets (laid
 *                   in batches), the flower and its panicle, the pod green and split, the tuberous taproot.
 *   3. THE TREE     its axes, each a function of its length (the leader to its pinch, the branches below the cut, their
 *                   side shoots), nodes every plastochron, girth by the pipe model, its roots, its season.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in days from sowing.
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: the corky warts and wrinkles of
 * the old trunk's pale bark, the small raised lenticels of young grey-green wood, the fine ribs and stipple of the pod.
 * Colour pictures only (plum v2's lesson: a bump picture on a tree of many small triangles makes NaN pixels): they
 * multiply the vertex colours, so a picture that darkens on average lifts its organ's vertex colour by `LIFT[name]`
 * where it is laid on. Only at detail 0.5 and over: a crowd far off draws plain colours.
 */
const SURFACES = {};
const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** how much an organ's vertex colour is raised under its picture, which is this much darker than white on average */
const LIFT = { twigMap: 1 / 0.9, podMap: 1 / 0.88, barkMap: 1 / 0.86 };
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
 * The surfaces, made the first time they are asked for:
 *   barkMap   0.10 m of old trunk bark (x along the trunk, y round it): pale grey-buff, soft and corky, rough with
 *             small corky warts 3–8 mm across and shallow wrinkles along the trunk, never deeply fissured (the data
 *             sheet's S11–S13; the sheet's 'Old corky bark' swatch)
 *   twigMap   0.05 m of young wood: smooth grey-green, its small raised pale lenticels about 1 mm, a few to a cm²
 *   podMap    0.04 m of the pod's skin: a fine stipple and faint lengthwise striations between its ribs
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		barkMap: () =>
			picture(512, 512, (x, y) => {
				const warp = tileNoise(x, y, 4, 71, 2) - 0.5;
				const c = tileCells(x + warp * 0.06, y + warp * 0.04, 14, 11, 73);
				// warts: raised corky knobs, pale on top, a darker rim round them
				const wart = c.id < 0.6 ? smooth((0.42 - c.f1) / 0.22) : 0;
				const rim = c.id < 0.6 ? smooth((c.f1 - 0.36) / 0.08) * smooth((0.6 - c.f1) / 0.12) : 0;
				const wrinkle = Math.pow(1 - Math.abs(tileNoise(x, y, 3, 75, 2, 22) - 0.5) * 2, 10);
				const grain = tileNoise(x, y, 10, 77, 3, 14) - 0.5;
				let k = 0.86 + 0.1 * grain;
				k = lerp(k, 1.0 + 0.03 * c.id, wart * 0.8);
				k *= 1 - 0.18 * rim - 0.2 * wrinkle;
				return [k, k * 0.985, k * 0.95];
			}, true),
		twigMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 8, 12, 81);
				const dot = c.id < 0.5 ? smooth((0.16 - c.f1) * 16) : 0;
				const k = 0.88 + 0.06 * (tileNoise(x, y, 6, 83, 2, 20) - 0.5);
				return [lerp(k, 1.08, dot), lerp(k, 1.05, dot), lerp(k, 0.92, dot)];
			}, true),
		podMap: () =>
			picture(256, 256, (x, y) => {
				// x along the pod, y round it
				const streak = tileNoise(x, y, 3, 91, 2, 40) - 0.5;
				const dots = tileCells(x, y, 24, 24, 93);
				const stip = dots.id < 0.5 ? smooth((0.12 - dots.f1) * 20) * 0.08 : 0;
				const k = 0.9 + 0.08 * streak - stip;
				return [k, k, k * 0.98];
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
 * The materials, made once, plain and with their surfaces (only plain settings: the asset box sends a material out by
 * its kind and settings, so no shader code). `leaf` the leaflets' two faces, each its own colour and its own normals
 * (one-sided; thin, matt-satin, no clearcoat: glossy leaves go white at a grazing angle); `bark` the trunk and old
 * limbs: matt, corky; `twig` young wood and the leaf stalks: a faint sheen, lenticels; `skin` the pods: matt with a
 * little sheen, finely striate; `sheet` thin things seen from both sides (petals, sepals, the seed's papery wings,
 * the dry pod's valves); `body` the seed, the roots and the rest.
 */
const MATERIALS = {
	leaf: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, specularIntensity: 0.3 }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, ...(s && { map: s('barkMap') }) }),
	twig: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, ...(s && { map: s('twigMap') }) }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, specularIntensity: 0.35, ...(s && { map: s('podMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'twig', 'leaf', 'sheet', 'skin', 'prop'];
// the leaflets and flowers are laid into batches of their own and thinned there (`Batch`), never by the Bag
const THINNED = {};

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
 * 2. ORGANS — the PKM-1's own, each to its measure
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
 * The PKM-1 in numbers: sizes in metres and times in days from the data sheet (moringa-pkm1.md, S1–S25), outlines and
 * colours traced off its reference sheet (058c8664…, Nano Banana Pro, 2026-11-05) in linear sRGB. The sheet's scale
 * bars are not used: every size is the data sheet's.
 */
const MO = {
	seed: {
		body: 0.011, // subglobose, faintly three-angled, 1–1.4 cm (S11, S16); 10.4 × 10.0 mm (S17)
		wing: [0.015, 0.007], // three papery wings 0.5–2.5 × 0.5–1 cm (S11, S12): ~3.5 cm across them
		depth: 0.025, // sown 2.5–3 cm deep (S1)
		coat: '#4b3524', // dark brown, three light chestnut lines (S17)
		line: '#7a5a3a',
		wingColour: lin(0.3, 0.2, 0.13), // light chestnut (S17); the sheet's seeds a pinkish tan
		wingEdge: lin(0.42, 0.32, 0.24),
		kernel: '#f1ead3',
	},
	leaf: {
		length: 0.45, // 2–3-pinnate, 25–60 cm (S12–S14); use 45 cm
		petiole: 0.1, // 4–15 cm (S11, S14), swollen and jointed at its base
		leaflet: [0.022, 0.013], // PKM-1: 2.75 × 1.65 cm (S9) and 0.93–1.33 cm² under cutting (S8): use 2.2 × 1.3 cm
		// the sheet's 'Pinna, upper side' and 'Pinna, underside' (median, linear): deep green above, pale grey-green below
		up: lin(0.068, 0.127, 0.033),
		upHi: lin(0.1, 0.165, 0.048), // its p90: the leaflets' own variation
		under: lin(0.27, 0.296, 0.231),
		young: lin(0.27, 0.45, 0.09), // young leaflets light yellow-green (data sheet #8fbf4a; the sheet's cream-yellow young leaf not followed)
		old: lin(0.72, 0.47, 0.04), // the sheet's 'Yellowing leaflets'
		rachis: lin(0.16, 0.22, 0.07),
		rachisYoung: lin(0.3, 0.24, 0.17), // the young rachis pinkish (S11)
		gland: '#9a7a3a',
		life: [60, 90], // days on a growing shoot [EST from the 40-day leaf cut, S8]
		expand: 10, // days from a node's leaf showing to its full size
	},
	// the leaflet's outline off the sheet's 'Pinna, upper side' (its middle right leaflet turned upright, base → tip,
	// trace.py): its width at 12 stations, broadest just past its middle, the tip rounded
	LEAFLET_W: rel([0.2, 4.9, 7.4, 8.9, 9.9, 10.6, 10.6, 10.3, 9.6, 8.2, 6.3, 0.9]),
	flower: {
		size: 0.025, // ~2.5 cm across (S14, S16)
		petal: lin(1, 0.97, 0.88), // cream (S13): the sheet's lit petals (p90 0.85, 0.79, 0.77)
		petalBase: lin(0.86, 0.86, 0.62), // the base tinged pale yellow-green
		sepal: '#e6e2b8', // cream inside with yellow streaks (S14), pale green outside
		sepalOut: '#c9cf96',
		streak: '#e3c24a',
		anther: '#e8c430',
		bud: '#d8dcaa',
		axis: '#8fa05a',
		dead: '#b8ab7a',
	},
	panicle: { length: 0.2, flowers: [40, 90], set: [0.32, 0.7, 0.96] }, // 10–25 cm, 86.5 flowers (S7), 1.2 pods (S5)
	pod: {
		length: 0.7, // PKM-1 61–76 cm (S4, S5, S7); use 70 cm
		width: 0.021, // girth 6.3 cm (S2): faces ~2.1 cm
		seeds: 17, // 17.3 (S7)
		stalk: 0.022, // 1.5–3 cm [EST]
		// the pods plate's pods (median, linear): light green young, mid green picked (S2), light brown dry (S15, S16)
		young: lin(0.39, 0.46, 0.15),
		green: lin(0.25, 0.34, 0.11),
		pick: lin(0.178, 0.262, 0.093),
		turning: lin(0.33, 0.31, 0.12),
		dry: lin(0.509, 0.347, 0.238),
		inside: '#cfc8b8', // silvery inside (S13)
		pith: '#eef0e0',
	},
	bark: {
		// the sheet's three bark swatches (median, linear)
		shoot: lin(0.127, 0.153, 0.04), // young shoots green (S11: purplish or greenish-white, puberulous)
		purple: '#8a6a7a',
		young: lin(0.198, 0.205, 0.133), // one-year wood: grey-green with lenticels
		old: lin(0.58, 0.5, 0.4), // corky, whitish, grey or pale buff (S11): the swatch 0.62, 0.52, 0.41
		weathered: lin(0.34, 0.29, 0.235), // its p10
		cut: '#e7dcc0', // a pruning cut: the soft pale wood
	},
	// the sheet's 'Tuberous taproot' (median 0.815, 0.591, 0.27, linear): yellowish cream to tan (S17, S19)
	root: { young: lin(0.86, 0.74, 0.46), old: lin(0.53, 0.32, 0.15), skin: lin(0.815, 0.591, 0.27) },
};

/* ---- batches: thousands of small parts laid from templates into one mesh ---- */

/**
 * A crown of moringa carries some twenty thousand leaflets: built as geometries one by one and merged by the Bag they
 * take seconds. A Batch lays a template (positions, normals, UVs, triangles, and which face each vertex is on) into
 * plain arrays through a matrix, each with its colours, and gives one geometry at the end. With `DETAIL.thin` under 1
 * only that share of what is laid is kept, each grown to fill.
 */
class Batch {
	constructor() {
		this.pos = [];
		this.nor = [];
		this.uv = [];
		this.col = [];
		this.idx = [];
		this.carry = 0;
	}
	/** lays `tpl` through matrix `m`; `colour(face, u, v)` gives each vertex's colour (face 0 above, 1 below) */
	lay(tpl, m, colour, thin = true) {
		if (thin && DETAIL.thin < 1) {
			this.carry += DETAIL.thin;
			if (this.carry < 1) return;
			this.carry -= 1;
			const g = Math.min(2.2, 1 / Math.sqrt(DETAIL.thin)) * DETAIL.fill;
			m = m.clone().multiply(new THREE.Matrix4().makeScale(g, g, g));
		}
		const e = m.elements;
		const base = this.pos.length / 3;
		const n = tpl.pos.length / 3;
		const cs = [];
		for (let i = 0; i < n; i++) {
			const x = tpl.pos[i * 3], y = tpl.pos[i * 3 + 1], z = tpl.pos[i * 3 + 2];
			this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
			const a = tpl.nor[i * 3], b = tpl.nor[i * 3 + 1], c = tpl.nor[i * 3 + 2];
			let nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
			const l = Math.hypot(nx, ny, nz) || 1;
			this.nor.push(nx / l, ny / l, nz / l);
			this.uv.push(tpl.uv[i * 2], tpl.uv[i * 2 + 1]);
			const key = tpl.face[i];
			const col = cs[key] ?? (cs[key] = toColor(colour(key, tpl.uv[i * 2], tpl.uv[i * 2 + 1])).clone());
			this.col.push(col.r, col.g, col.b);
		}
		for (const k of tpl.idx) this.idx.push(base + k);
	}
	geometry() {
		if (!this.idx.length) return null;
		return made(this.pos, this.nor, this.uv, this.col, this.idx, false);
	}
}

/**
 * A sheet as a template for a batch: built along +X from its base, across Z, its face up (+Y); `shape(u)` its half
 * width, `lift(u, v)` its rise, a face below of its own (its own normals: seen from below it is its underside, not the
 * sky), the faces named 0 and 1 for their colours.
 */
function template({ length, width, shape, lift = () => 0, along, across, both = true, ease = false }) {
	// with `ease`, its rows crowd toward its two ends by (1 − cos), so a rounded tip closes round, not to a point
	const g0 = (u) => (ease ? (1 - Math.cos(Math.PI * u)) / 2 : u);
	const g = sheet({ length, width, shape: (u) => shape(g0(u)), lift: (u, v) => lift(g0(u), v), paint: () => '#ffffff', back: both ? () => '#ffffff' : undefined, backLit: false, along, across });
	const pos = Array.from(g.attributes.position.array), nor = Array.from(g.attributes.normal.array), uv = Array.from(g.attributes.uv.array);
	const n = pos.length / 3;
	if (ease) for (let i = 0; i < n; i++) pos[i * 3] = length * g0(pos[i * 3] / length);
	const face = new Uint8Array(n);
	if (both) for (let i = n / 2; i < n; i++) face[i] = 1;
	if (both) for (let i = n / 2; i < n; i++) (nor[i * 3] = -nor[(i - n / 2) * 3]), (nor[i * 3 + 1] = -nor[(i - n / 2) * 3 + 1]), (nor[i * 3 + 2] = -nor[(i - n / 2) * 3 + 2]);
	const t = { pos, nor, uv, idx: Array.from(g.index.array), face };
	g.dispose();
	return t;
}

/** the leaflet's half width at u, a part of its greatest: the traced outline, its last 15 % a round cap (the tip
 *  "rounded to emarginate", S12, S13; straight between stations it closed to a point) */
function leafletHalf(u) {
	const c = 0.85;
	if (u <= c) return station(MO.LEAFLET_W, u);
	return station(MO.LEAFLET_W, c) * Math.sqrt(Math.max(0, 1 - Math.pow((u - c) / (1 - c), 2)));
}

/** a petal's half width at u: spoon-shaped, a narrow claw widening to a rounded blade (S11, S14) */
const petalHalf = (u) => (smooth(u / 0.5) * 0.78 + 0.16) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - 0.6) / 0.4, 2)));

/** the templates, made once a detail: a leaflet (unit length, its traced outline), a pinna card, a petal, a sepal */
const TEMPLATES = {};
function tpl(name) {
	const key = `${name}${DETAIL.level >= 1 ? '' : DETAIL.level >= 0.5 ? '~' : '-'}`;
	if (TEMPLATES[key]) return TEMPLATES[key];
	const fine = DETAIL.level >= 1;
	const make = {
		// a leaflet, 1 long: elliptic, broadest a little below its middle, its tip rounded (the sheet's pinna)
		leaflet: () => template({ length: 1, width: 0.5 / (MO.leaf.leaflet[0] / MO.leaf.leaflet[1]) * 2, shape: (u) => leafletHalf(u) * 0.5, lift: (u, v) => 0.04 * v * v - 0.03 * u * u, along: fine ? 5 : 3, across: 1, ease: true }),
		// the smaller leaflets of the side shoots' leaves, a little coarser
		leafletS: () => template({ length: 1, width: 0.5 / (MO.leaf.leaflet[0] / MO.leaf.leaflet[1]) * 2, shape: (u) => leafletHalf(u) * 0.5, lift: (u, v) => 0.04 * v * v - 0.03 * u * u, along: 3, across: 1, ease: true }),
		// far off, a whole pinna as one feathery card, 1 long
		card: () => template({ length: 1, width: 0.34, shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + u * 0.94)), 0.7) * (0.8 + 0.2 * (1 - u)), lift: (u) => -0.06 * u * u, along: 3, across: 1 }),
		// a petal, 1 long: spoon-shaped, a narrow claw widening to a rounded blade
		petal: () => template({ length: 1, width: 0.25, shape: petalHalf, lift: (u, v) => 0.1 * v * v, along: 3, across: 1, both: false, ease: true }),
		// the same close up (the fruit view, the organ bench)
		petalFine: () => template({ length: 1, width: 0.25, shape: petalHalf, lift: (u, v) => 0.1 * v * v, along: 8, across: 2, both: false, ease: true }),
		// a sepal, 1 long: narrow, lanceolate, pointed
		sepal: () => template({ length: 1, width: 0.16, shape: (u) => Math.sin(Math.PI * Math.min(1, 0.08 + u * 0.92)) * (1 - 0.5 * u), lift: (u, v) => 0.05 * v * v, along: 2, across: 1, both: false }),
		// a seed's papery wing, 1 long
		wing: () => template({ length: 1, width: 1, shape: (u) => 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))), lift: (u, v) => 0.04 * v * v, along: 8, across: 2, both: false, ease: true }),
	}[name];
	return (TEMPLATES[key] = make());
}

/* ---- the seed ---- */

/**
 * A seed's three papery wings (S11, S12, S17): each a flange down one of its three angles, along the seed's axis
 * `ax` and standing out from its body by up to ~1 cm, so the seed is some 3 cm across them; straw, paler at the edge.
 */
function seedWings(batch, at, ax, turn, B, colour, edge, r) {
	const S = MO.seed;
	const a0 = across(ax);
	for (let k = 0; k < 3; k++) {
		const out = a0.clone().applyAxisAngle(ax, turn + (k / 3) * Math.PI * 2 + about(r, 0, 0.1)).normalize();
		const n = new THREE.Vector3().crossVectors(out, ax).normalize();
		const L = B * 1.15 * about(r, 1, 0.1); // about the body's length (the sheet's seeds)
		const W = S.wing[1] * about(r, 1, 0.1);
		// the template runs along +X (here the seed's axis), across Z (here out from the body), its face +Y
		const m = new THREE.Matrix4().makeBasis(ax.clone(), n, out).setPosition(at.clone().addScaledVector(ax, -L / 2).addScaledVector(out, B * 0.42 + W * 0.42));
		m.multiply(new THREE.Matrix4().makeScale(L, L, W));
		batch.lay(tpl('wing'), m, (f, u, v) => mix(colour, edge, Math.pow(Math.abs(v - 0.5) * 2, 2)), false);
	}
}


/**
 * The winged seed as sown, 2.5 cm deep: a dark brown, faintly three-angled body 11 mm across with three papery straw
 * wings down its angles. It stays in the soil as the seedling grows (hypogeal: its cotyledons never come up), feeding
 * it for some 25–49 days, and rots away after (S17, S18). `spent` 0 … 1 how far it has.
 */
function seed(bag, at, spent, seedKey, fine = false) {
	const S = MO.seed;
	const r = chance(seedKey, 'seed');
	const turn = r() * Math.PI * 2;
	const B = S.body * lerp(1, 0.85, spent);
	const rot = new THREE.Quaternion().setFromAxisAngle(UP, turn);
	const coat = mix(S.coat, '#2e2418', spent * 0.6);
	const body = bead(at, v3(B * 0.5, B * 0.46, B * 0.5), coat, fine ? 16 : 7, rot);
	// faintly three-angled: pushed out at three bearings, its pale lines on the angles
	const p = body.attributes.position, c = body.attributes.color;
	const line = named(S.line);
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i) - at.x, z = p.getZ(i) - at.z;
		const a = Math.atan2(z, x) - turn;
		const k = 1 + 0.07 * Math.cos(3 * a);
		p.setXYZ(i, at.x + x * k, p.getY(i), at.z + z * k);
		const on = Math.pow(Math.max(0, Math.cos(3 * a)), 12);
		c.setXYZ(i, lerp(c.getX(i), line.r, on * 0.6), lerp(c.getY(i), line.g, on * 0.6), lerp(c.getZ(i), line.b, on * 0.6));
	}
	body.computeVertexNormals();
	bag.add('body', body);
	if (spent > 0.85) return;
	const b = new Batch();
	seedWings(b, at, v3(about(r, 0, 0.3), 1, about(r, 0, 0.3)).normalize(), turn, B, mix(S.wingColour, '#6a5a40', spent), S.wingEdge, r);
	bag.add('sheet', b.geometry());
}

/* ---- the leaf ---- */

/**
 * The leaflets of one pinnule or pinna, into a leaf's plan: `n` opposite pairs and one at the tip, spaced by about their
 * own width so they nearly touch (the sheet's 'Pinna, upper side': three pairs and a tip, a small pair at its foot),
 * leaving the stalk at some 70° and leaning forward up it, along a stalk from `at` along `dir` in the leaf's frame
 * (its face +Y). Returns the stalk's length.
 */
function pinnateInto(stalks, leaflets, at, dir, n, lf, key, droop, c, r) {
	const up = UP;
	const foot = n >= 3 ? 0.42 : 0.3; // a bare stalk below the first pair
	const len = lf * (foot + 0.6 * Math.max(0, n - 1) + (n ? 0.3 : 0.1));
	const end = at.clone().addScaledVector(dir, len);
	stalks.push({ pts: [at, end], r0: 0.0005 + 0.0004 * c, r1: 0.00035, order: 2 });
	const side = new THREE.Vector3().crossVectors(dir, up).normalize();
	const face = new THREE.Vector3().crossVectors(side, dir).normalize();
	for (let k = 0; k < n; k++) {
		const s = lf * (foot + 0.6 * k);
		const p = at.clone().addScaledVector(dir, s);
		for (const sgn of [-1, 1]) {
			const out = dir.clone().multiplyScalar(lerp(0.4, 0.8, k / Math.max(1, n - 1))).addScaledVector(side, sgn).normalize();
			leaflets.push({ at: p, dir: out.addScaledVector(face, -droop * 0.3).normalize(), face, len: lf * about(r, 1, 0.07), key });
		}
	}
	// a small pair at the foot of a pinna of three pairs or more (the sheet's)
	if (n >= 3 && c > 0.5)
		for (const sgn of [-1, 1]) {
			const out = dir.clone().multiplyScalar(-0.1).addScaledVector(side, sgn).normalize();
			leaflets.push({ at: at.clone().addScaledVector(dir, lf * foot), dir: out.addScaledVector(face, -droop * 0.3).normalize(), face, len: lf * 0.55 * about(r, 1, 0.08), key });
		}
	// spreading at ~55° off the stalk at its foot, leaning forward to ~40° near its tip
	// the terminal leaflet: obovate and some 20 % larger (S14, S16), on a longer stalk (S19)
	leaflets.push({ at: end, dir: dir.clone().addScaledVector(face, -droop * 0.2).normalize(), face, len: lf * 1.18 * about(r, 1, 0.05), key, tip: true });
	return len;
}

/**
 * The plan of one compound leaf, in its own frame (the rachis along +X from the node, its face up +Y, its pinnae out
 * to ±Z), at `size` (its length as a part of the grown leaf's 45 cm) and `complexity` 0 … 1: the seedling's first
 * leaves twice-pinnate with two pairs of pinnae of 3–5 leaflets, 6–10 cm (S19); later ones with more pinnae and
 * leaflets; from about the twelfth leaf thrice-pinnate on the lowest pinnae, the grown leaf (S13, S14): a petiole of a
 * fifth of its length, 4–8 pairs of opposite pinnae ~5 cm apart, the lowest largest and twice-divided into pinnules
 * of 3–7 leaflets, the upper simply pinnate, a single leaflet at each tip; 75–150 leaflets. `r` its chance.
 * Returns the stalks (as paths) and the leaflets (each at, dir, side, length) in the leaf's frame.
 */
function leafPlan(size, complexity, r, arch, spread) {
	const F = MO.leaf;
	const L = F.length * size;
	const c = clamp(complexity);
	const P = L * lerp(0.28, 0.22, c); // the petiole: long on the first leaves
	const R = L - P;
	const pairs = Math.round(lerp(2, 4.4, c) + r() * 0.9); // 2 pinnae pairs on the first leaves, 4–5 grown (S11–S13)
	// a seedling's first leaflets about half a grown one's (S19's drawings), full size on leaves of two thirds' length
	const leafletL = F.leaflet[0] * lerp(0.42, 1, Math.min(1, size * 1.5)) * about(r, 1, 0.06);
	const stalks = [], leaflets = [];
	// the rachis: an arc bending down by `arch` radians over its length, in the x-y plane
	const N = 10;
	const pts = [v3(0, 0, 0)];
	for (let i = 1; i <= N; i++) {
		const th = arch * Math.pow((i - 0.5) / N, 1.4);
		pts.push(pts[i - 1].clone().addScaledVector(v3(Math.cos(th), -Math.sin(th), 0), L / N));
	}
	stalks.push({ pts, r0: lerp(0.0011, 0.0024, c) * Math.sqrt(size / 0.5 + 0.2), r1: 0.0005, order: 0 });
	const along = (s) => {
		const x = clamp(s / L) * N;
		const i = Math.min(N - 1, Math.floor(x));
		const at = pts[i].clone().lerp(pts[i + 1], x - i);
		const dir = pts[i + 1].clone().sub(pts[i]).normalize();
		return { at, dir };
	};
	const up = v3(0, 1, 0);
	const pinnate = (at, dir, n, lf, key, droop) => pinnateInto(stalks, leaflets, at, dir, n, lf, key, droop, c, r);
	for (let j = 0; j < pairs; j++) {
		const x = j / Math.max(1, pairs - 1); // 0 the lowest pair … 1 the highest
		const s = P + R * (0.04 + 0.8 * Math.pow(x, 1.05));
		const { at, dir } = along(s);
		const n = Math.max(1, Math.round(lerp(lerp(1.6, 4, c), lerp(1, 2, c), x) + r() * 0.5));
		// the lowest pair twice-divided on a grown leaf: a pair of pinnules (or two) and a pinnate tip (S13, S14)
		const bip = c > 0.6 && j === 0;
		for (const sgn of [-1, 1]) {
			const side = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(sgn);
			const pd = side.clone().addScaledVector(dir, spread).addScaledVector(up, -0.12).normalize();
			if (!bip) {
				pinnate(at, pd, n, leafletL, j, 0.3);
				continue;
			}
			const pn = c > 0.9 && r() < 0.5 ? 2 : 1;
			const pinnaL = leafletL * (1.2 + 2.6 * pn);
			const end = at.clone().addScaledVector(pd, pinnaL);
			stalks.push({ pts: [at, at.clone().addScaledVector(pd, pinnaL * 0.5), end], r0: 0.0009, r1: 0.0005, order: 1 });
			const pside = new THREE.Vector3().crossVectors(pd, up).normalize();
			for (let k = 0; k < pn; k++) {
				const p2 = at.clone().addScaledVector(pd, leafletL * (1 + 2.6 * k));
				for (const sg2 of [-1, 1]) {
					const d2 = pd.clone().multiplyScalar(0.55).addScaledVector(pside, sg2).normalize();
					pinnate(p2, d2, 3, leafletL * 0.95, `${j}.${k}`, 0.25);
				}
			}
			pinnate(end, pd, 3, leafletL, `${j}.t`, 0.3);
		}
	}
	// the tip: a single leaflet or a small pinnate end
	const tip = along(L);
	pinnate(tip.at, tip.dir, c > 0.4 ? 1 : 0, leafletL * 1.05, 'tip', 0.3);
	return { stalks, leaflets, L, P };
}

/**
 * One compound leaf at a node: `at` on the axis's surface, `out` the way it leaves (out and up from the axis), its
 * frame `face` (up), its size and complexity, `age` days since its node formed, `life` days it lives. Young it is
 * small, pale yellow-green and held up folded; grown it spreads, its rachis arching out and down under the leaflets;
 * old it yellows and drops its leaflets before the rachis falls at its joint (S11, S14).
 */
function leaf(bag, batch, o) {
	const F = MO.leaf;
	const { at, out, size, complexity, age, life, r } = o;
	if (age <= 0 || age >= life) return;
	const grown = smooth(age / F.expand);
	const green = smooth((age - 2) / 14);
	const yellow = smooth((age - (life - 9)) / 5);
	const shed = smooth((age - (life - 6)) / 5); // the leaflets falling
	// the leaf rises at 35–60° from its axis and arches over; young ones stand up, old ones hang
	const arch = lerp(0.25, 1.15, grown) + about(r, 0, 0.18) + 0.5 * yellow + (o.load ?? 0);
	const spread = lerp(0.9, 0.42, grown);
	const plan = o.plan ?? leafPlan(size * lerp(0.35, 1, grown), complexity, r, arch, spread);
	const m = new THREE.Matrix4().makeBasis(out, o.face, new THREE.Vector3().crossVectors(out, o.face)).setPosition(at);
	// the rachis and stalks: green, the young pinkish; far off only the rachis
	const stalk = mix(mix(F.rachisYoung, F.rachis, green), F.old, yellow * 0.7);
	for (const s of plan.stalks) {
		if (DETAIL.level < 0.5 && s.order > 0) continue;
		if (DETAIL.level < 1 && s.order > 1) continue;
		const pts = s.pts.map((p) => p.clone().applyMatrix4(m));
		if (s.order === 0) {
			// the rachis, its petiole's base swollen and jointed (S14); every other point is enough for its gentle arc
			const few = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
			bag.add('twig', tube([pts[0], pts[0].clone().lerp(pts[1], 0.35), ...few.slice(1)], (u, v, sl) => lerp(s.r0, s.r1, u) * (1 + 0.9 * Math.exp(-sl / 0.012)), () => stalk, 4, false));
		} else bag.add('twig', tube(pts, (u) => lerp(s.r0, s.r1, u), () => stalk, 3, false));
	}
	if (shed >= 1) return;
	// the leaflets
	const k = r();
	const lf = tpl(o.coarse ? 'leafletS' : 'leaflet');
	const top = mix(mix(F.young, mix(F.up, F.upHi ?? F.up, k * 0.6), green), F.old, yellow);
	const under = mix(mix(F.young, F.under, green), mix(F.old, '#e0d68a', 0.3), yellow);
	if (DETAIL.level < 0.5) {
		// far off: each pinna as one card along its stalk, the leaflets' green
		const card = tpl('card');
		for (const s of plan.stalks) {
			if (s.order !== 2) continue;
			const a = s.pts[0].clone().applyMatrix4(m), b = s.pts[s.pts.length - 1].clone().applyMatrix4(m);
			const d = b.clone().sub(a);
			const len = d.length() + F.leaflet[0] * size * 1.2;
			if (len < 1e-4) continue;
			const fm = aim(a, d.normalize(), 0).multiply(new THREE.Matrix4().makeScale(len, len, len * 1.2 * (F.leaflet[0] * 2.4) / Math.max(0.02, len)));
			batch.lay(card, fm, (f) => (f ? under : top));
		}
		return;
	}
	const sc = new THREE.Matrix4();
	for (const l of plan.leaflets) {
		if (shed > 0 && chance(o.key, 'shed', l.key, l.at.x)() < shed) continue;
		const p = l.at.clone().applyMatrix4(m);
		const d = l.dir.clone().transformDirection(m);
		const f = l.face.clone().transformDirection(m);
		const x = d;
		const y = f.clone().addScaledVector(x, -f.dot(x));
		if (y.lengthSq() < 1e-8) continue;
		y.normalize();
		const z = new THREE.Vector3().crossVectors(x, y);
		const len = l.len * lerp(0.4, 1, grown);
		const wide = l.tip ? 1.1 : 1;
		sc.makeBasis(x, y, z).setPosition(p.addScaledVector(x, 0.0012));
		sc.multiply(new THREE.Matrix4().makeScale(len, len, len * wide));
		batch.lay(lf, sc, (face) => (face ? under : top));
	}
}

/* ---- the flower and its panicle ---- */

/**
 * One flower (the sheet's 'Flower, front' and 'Flower, side'): zygomorphic, ~2.5 cm across, like a pea flower upside
 * down (S12): five narrow cream sepals with yellow streaks, reflexed; five unequal spoon-shaped cream petals, the upper
 * one erect and the four others spreading and bent back; five yellow stamens and five shorter staminodes in a bunch
 * against the upper petal. Laid into `batch` (petals, sepals) and the bag (the stamens); from `at` along `dir` (out
 * of its stalk), `up` the way its upper petal stands; `open` 0 a bud, 1 open; `fade` 0 … 1 withering.
 */
function flower(bag, batch, at, dir, up, open, fade, r, fine = false) {
	const Fl = MO.flower;
	const x = dir.clone().normalize();
	const u0 = up.clone().addScaledVector(x, -up.dot(x));
	if (u0.lengthSq() < 1e-8) u0.copy(across(x));
	u0.normalize();
	if (open < 0.15) {
		// a bud: round, cream-green, on its stalk
		const b = 0.0028 * lerp(0.5, 1.2, open / 0.15);
		bag.add('body', bead(at.clone().addScaledVector(x, b), v3(b, b * 1.2, b), Fl.bud, fine ? 10 : 3, new THREE.Quaternion().setFromUnitVectors(UP, x)));
		return;
	}
	const o = smooth((open - 0.15) / 0.85);
	const petal = tpl(fine ? 'petalFine' : 'petal'), sepal = tpl('sepal');
	const pc = (u, v) => mix(mix(mix(Fl.petalBase, Fl.petal, smooth(u / 0.35)), Fl.streak, 0.35 * Math.exp(-Math.pow((v - 0.5) / 0.1, 2)) * (1 - smooth((u - 0.25) / 0.45))), Fl.dead, fade);
	const sc = (u, v) => mix(mix(Fl.sepal, Fl.streak, Math.exp(-Math.pow((v - 0.5) / 0.14, 2)) * smooth(u / 0.3) * 0.75), Fl.dead, fade);
	const S = Fl.size * about(r, 1, 0.05);
	const put = (tplt, bearing, lean, len, colour, face) => {
		// out at `bearing` round the flower's axis (0 the upper side), `lean` from the axis
		const side = u0.clone().applyAxisAngle(x, bearing);
		const d = x.clone().multiplyScalar(Math.cos(lean)).addScaledVector(side, Math.sin(lean)).normalize();
		const fy = face.clone().addScaledVector(d, -face.dot(d));
		if (fy.lengthSq() < 1e-8) return;
		fy.normalize();
		const fz = new THREE.Vector3().crossVectors(d, fy);
		const m = new THREE.Matrix4().makeBasis(d, fy, fz).setPosition(at.clone().addScaledVector(x, 0.0012));
		m.multiply(new THREE.Matrix4().makeScale(len, len, len));
		batch.lay(tplt, m, (f, u, v) => colour(u, v), false);
	};
	// the sepals: five, narrow, reflexed back behind the petals when open (S13)
	for (let k = 0; k < 5; k++) {
		const bearing = (k / 5) * Math.PI * 2 + Math.PI / 5;
		put(sepal, bearing, lerp(0.4, 2.15, o) + about(r, 0, 0.1), S * 0.55 * about(r, 1, 0.06), sc, x.clone().negate());
	}
	// the petals, open nearly flat to the axis: the upper one erect, the two at its sides spreading, the two lower
	// ones bent back (the sheet's 'Flower, front': like a pea flower upside down, S12); cream, a yellow streak up
	// each from its base
	const leanOf = [1.2, 1.5, 1.78, 1.78, 1.5];
	for (let k = 0; k < 5; k++) {
		const bearing = (k / 5) * Math.PI * 2 + about(r, 0, 0.06);
		const lean = lerp(0.3, leanOf[k], o) + about(r, 0, 0.08);
		const len = S * (k === 0 ? 0.62 : 0.56) * about(r, 1, 0.05);
		put(petal, bearing, lean, len, pc, x);
	}
	// the five stamens and five staminodes: yellow, curving out and up in front of the upper petal, their anthers in a
	// small tier (S13); a yellow bunch on the tree, each one only close up
	const yellow = mix(Fl.anther, Fl.dead, fade);
	if (!fine) {
		const st = at.clone().addScaledVector(x, S * 0.2).addScaledVector(u0, S * 0.08);
		bag.add('body', bead(st, v3(S * 0.05, S * 0.14, S * 0.05), yellow, 3, new THREE.Quaternion().setFromUnitVectors(UP, x.clone().addScaledVector(u0, 0.8).normalize())));
		return;
	}
	const side = new THREE.Vector3().crossVectors(x, u0);
	for (let k = 0; k < 10; k++) {
		const fertile = k % 2 === 0;
		const spread = ((k - 4.5) / 4.5) * 0.16; // held together in a bunch
		const len = S * (fertile ? 0.42 : 0.3) * about(r, 1, 0.05);
		const pts = [];
		for (let i = 0; i <= 5; i++) {
			const q = i / 5;
			// out of the flower's heart, then curving up toward the upper petal
			pts.push(at.clone().addScaledVector(x, len * (0.15 + 0.6 * q - 0.15 * q * q)).addScaledVector(u0, len * (0.08 + 0.75 * q * q)).addScaledVector(side, len * spread * q));
		}
		bag.add('body', tube(pts, (u) => lerp(0.00028, 0.00018, u), () => mix('#e8d878', Fl.dead, fade), 4, false));
		if (fertile) bag.add('body', bead(pts[5], v3(0.0006, 0.0011, 0.0005), yellow, 6, new THREE.Quaternion().setFromUnitVectors(UP, pts[5].clone().sub(pts[4]).normalize())));
	}
}

/**
 * A panicle in a leaf's axil (the sheet's 'Flowering panicle'): a loose, drooping, branched spray 10–25 cm long of
 * 40–90 flowers (S7, S13), opening a few at a time from the base up over some three weeks, the spent ones falling.
 * `age` days since it showed. Returns the places pods may hang from (its lower side branches' feet).
 */
function panicle(bag, batch, seedKey, key, at, dir, age, fine = false) {
	const P = MO.panicle, Fl = MO.flower;
	const r = chance(seedKey, 'panicle', ...key);
	const grown = span(age, 0, 9);
	const L = P.length * about(r, 1, 0.15) * lerp(0.25, 1, grown);
	const nf = Math.round(between(r, P.flowers[0], P.flowers[1]));
	const d0 = dir.clone().normalize();
	// the axis: out from the axil and arching over to hang
	const pts = [at.clone()];
	let d = d0.clone();
	const N = 6;
	for (let i = 1; i <= N; i++) {
		d.y -= 0.22;
		d.normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, L / N));
	}
	const gone = age > 34;
	const axisCol = mix(Fl.axis, Fl.dead, span(age, 26, 34));
	if (!gone) bag.add('twig', tube(pts, (u) => lerp(0.0015, 0.0006, u), () => axisCol, 3, false));
	const feet = [];
	const sides = 7;
	const at_ = (u) => {
		const x = clamp(u) * N;
		const i = Math.min(N - 1, Math.floor(x));
		return { p: pts[i].clone().lerp(pts[i + 1], x - i), t: pts[i + 1].clone().sub(pts[i]).normalize() };
	};
	let left = nf;
	for (let k = 0; k < sides; k++) {
		const u = 0.12 + (0.8 * k) / sides;
		const { p, t } = at_(u);
		const side = across(t).applyAxisAngle(t, k * 2.4 + r());
		const sl = L * lerp(0.42, 0.14, k / sides);
		const sd = t.clone().multiplyScalar(0.5).addScaledVector(side, 1).normalize();
		sd.y -= 0.25;
		sd.normalize();
		const end = p.clone().addScaledVector(sd, sl);
		feet.push({ at: p.clone().lerp(end, 0.3), dir: sd.clone() });
		if (gone) continue;
		bag.add('twig', tube([p, end], (q) => lerp(0.0009, 0.0005, q), () => axisCol, 3, false));
		// its flowers along it, each on a slender stalk, opening from the panicle's base up
		const n = Math.min(left, Math.max(2, Math.round((nf / sides) * lerp(1.3, 0.7, k / sides))));
		left -= n;
		const shown = DETAIL.level < 0.5 ? Math.ceil(n / 3) : n;
		for (let j = 0; j < shown; j++) {
			const q = 0.25 + (0.75 * j) / Math.max(1, shown - 1);
			const fp = p.clone().lerp(end, q);
			const opens = 9 + (k / sides) * 10 + q * 4 + r() * 5;
			const open = span(age, opens - 6, opens + 1);
			const fall = opens + 4 + r() * 4;
			if (age > fall) continue;
			const fade = span(age, fall - 2, fall);
			const fd = sd.clone().addScaledVector(across(sd).applyAxisAngle(sd, r() * 6.283), 0.9).normalize();
			fd.y -= 0.3;
			fd.normalize();
			const stalkEnd = fp.clone().addScaledVector(fd, 0.008);
			if (DETAIL.level >= 0.5) bag.add('twig', tube([fp, stalkEnd], () => 0.00035, () => axisCol, 3, false));
			flower(bag, batch, stalkEnd, fd, UP, open * lerp(0.4, 1, grown), fade, r, fine);
		}
	}
	return feet;
}

/* ---- the pod ---- */

/** the pod's length as a part of its full 70 cm, by days after flowering: half by 10 days, full by ~28 (S22) */
const podLength = (d) => straight(d, [[0, 0.03], [3, 0.1], [6, 0.26], [10, 0.5], [15, 0.72], [20, 0.9], [28, 1]]);
/** its thickness as a part of its full 2.1 cm: it fills after it has its length, to ~40 days */
const podGirth = (d) => straight(d, [[0, 0.16], [8, 0.24], [16, 0.42], [26, 0.68], [40, 0.95], [55, 1], [100, 0.92]]);
/** its colour by days: light green young, mid green picked (45–70 days), turning, light brown dry by ~105 (S11, S15) */
function podColour(d) {
	const Pd = MO.pod;
	if (d < 25) return mix(Pd.young, Pd.green, d / 25);
	if (d < 60) return mix(Pd.green, Pd.pick, (d - 25) / 35);
	if (d < 85) return mix(Pd.pick, Pd.turning, smooth((d - 60) / 25));
	return mix(Pd.turning, Pd.dry, smooth((d - 85) / 20));
}

/**
 * The pod's section at `a` round it (0 … 2π) as a part of its half width: a rounded triangle, three-angled, its faces
 * a little hollow with two grooves on each (S15), so nine ribs: three on the angles, two on each face (S14, S16).
 */
const podSection = (a) => 1 + 0.13 * Math.cos(3 * a) + 0.035 * Math.cos(9 * a);

/**
 * One pod hanging from `top` along `dir` (straight down and a little swung): a long, slender, three-angled rod,
 * narrowing over its first 5 cm to the stalk and tapering over its last 10 cm to a beak, slightly swollen over each
 * of its ~17 seeds (S15). `days` after flowering. A dry pod splits into its three valves (`podValves`).
 */
function podBody(bag, top, dir, days, k, r, fine) {
	const Pd = MO.pod;
	const L = Pd.length * podLength(days) * k;
	const W = Pd.width * podGirth(days) * lerp(1, 0.9, span(days, 80, 105));
	const d = dir.clone().normalize();
	const side = across(d);
	const turn = r() * 6.283;
	const bend = about(r, 0, 0.05) * L; // a gentle curve, a few cm over its length
	const rings = fine ? 220 : fewer(Math.round(lerp(8, 26, podLength(days))), 6);
	const sides = fine ? 54 : DETAIL.level >= 1 ? 18 : 9;
	const pts = [];
	for (let i = 0; i <= rings; i++) {
		const u = i / rings;
		pts.push(top.clone().addScaledVector(d, u * L).addScaledVector(side, bend * u * u));
	}
	const seeds = Pd.seeds;
	const radius = (u, v, s) => {
		const x = s / Math.max(1e-4, L);
		const base = smooth(s / Math.max(0.004, 0.05 * L / Pd.length * 1.0)) * 0.55 + 0.45; // narrowing to the stalk
		// its last fifth tapering evenly to a beak (the pods plate: 0.75 of its width at 90 %, half at 95 %, a third at 98 %)
		const tipK = x < 0.8 ? 1 : lerp(1, 0.2, Math.pow((x - 0.8) / 0.2, 1.25));
		const bead = 1 + 0.06 * smooth((days - 15) / 20) * Math.max(0, Math.cos(x * seeds * Math.PI * 2 + v * 0.3));
		const a = v * Math.PI * 2 + turn;
		return (W / 2) * base * tipK * bead * podSection(a) * (x > 0.995 ? 0.25 : 1);
	};
	const col = podColour(days);
	const lift = lifted('podMap');
	const ns = r() * 100;
	const paint = (u, v, s) => {
		const a = v * Math.PI * 2 + turn;
		const rib = Math.pow(Math.max(0, Math.cos(9 * a)), 6);
		// darker at its stalk end, lighter toward its tip (the pods plate's harvest pod: 0.15 → 0.22 in red)
		const c = col.clone().multiplyScalar((1 - 0.12 * rib + 0.06 * (noise3(s * 30, a, ns) - 0.5)) * lerp(0.84, 1.2, u));
		if (u > 0.97) c.lerp(named('#6a6a3a'), 0.5);
		return c.multiplyScalar(lift);
	};
	const geo = tube(pts, radius, paint, sides, true);
	metric(geo, L / 0.04, (Math.PI * W) / 0.04);
	bag.add('skin', geo);
	return { L, W };
}

/**
 * A dry pod split open (by ~115 days, S11, S16): its three valves parted along the angles, light brown outside and
 * silvery inside (S13), curling a little apart from the middle, the dark winged seeds showing in a row down each
 * valve's middle. `open` 0 … 1.
 */
function podValves(bag, top, dir, days, k, r, open, fine) {
	const Pd = MO.pod;
	const L = Pd.length * k;
	const W = Pd.width * 0.9;
	const d = dir.clone().normalize();
	const side = across(d);
	const s2 = new THREE.Vector3().crossVectors(d, side);
	const turn = r() * 6.283;
	const rings = fine ? 140 : DETAIL.level >= 1 ? 18 : 9;
	const cols = fine ? 14 : 3;
	const outC = podColour(days), inC = named(Pd.inside);
	const lift = lifted('podMap');
	for (let vk = 0; vk < 3; vk++) {
		const a0 = turn + (vk / 3) * Math.PI * 2 + Math.PI / 3, a1 = a0 + (Math.PI * 2) / 3;
		const mid = (a0 + a1) / 2;
		const out = side.clone().multiplyScalar(Math.cos(mid)).addScaledVector(s2, Math.sin(mid));
		const pos = [], nor = [], uv = [], col = [], idx = [];
		for (let f = 0; f < 2; f++) {
			const base = pos.length / 3;
			for (let i = 0; i <= rings; i++) {
				const u = i / rings;
				const s = u * L;
				const taper = (smooth(s / 0.035) * 0.55 + 0.45) * (1 - smooth((u - 0.84) / 0.16) * 0.9);
				const gap = open * W * 1.1 * Math.pow(Math.sin(Math.PI * clamp((u - 0.03) / 0.95)), 0.8);
				const c0 = top.clone().addScaledVector(d, s).addScaledVector(out, gap);
				for (let j = 0; j <= cols; j++) {
					const a = lerp(a0, a1, j / cols);
					const rr = (W / 2) * taper * podSection(a) * (f ? 0.78 : 1);
					// the valve's edges curl outward as it dries
					const curl = open * 0.6 * Math.pow(Math.abs(j / cols - 0.5) * 2, 2) * Math.pow(Math.sin(Math.PI * u), 0.5);
					const rd = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(s2, Math.sin(a));
					const p = c0.clone().addScaledVector(rd, rr * (1 + curl));
					pos.push(p.x, p.y, p.z);
					nor.push(f ? -rd.x : rd.x, f ? -rd.y : rd.y, f ? -rd.z : rd.z);
					uv.push((s / 0.04), (j / cols) * 0.5);
					const c = (f ? inC.clone() : outC.clone().multiplyScalar(lift * (1 - 0.1 * Math.pow(Math.max(0, Math.cos(9 * a)), 6))));
					col.push(c.r, c.g, c.b);
				}
			}
			for (let i = 0; i < rings; i++)
				for (let j = 0; j < cols; j++) {
					const a = base + i * (cols + 1) + j, b = a + cols + 1;
					if (f === 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
					else idx.push(a, a + 1, b, b, a + 1, b + 1);
				}
		}
		bag.add('skin', made(pos, nor, uv, col, idx, false));
	}
	// its seeds: ~17 in a row down the pod's middle, each in its pit, showing through the gaping valves (S15, S16)
	const n = Pd.seeds;
	for (let q = 0; q < n; q++) {
		const u = 0.1 + (0.8 * q) / (n - 1);
		if (chance(`${turn}`, 'gone', q)() < span(days, 125, 160)) continue; // they drop from the open pod (S15)
		const B = MO.seed.body * 0.95;
		const wob = across(d).applyAxisAngle(d, q * 2.1).multiplyScalar(W * 0.08);
		const sp = top.clone().addScaledVector(d, u * L).add(wob);
		bag.add('body', bead(sp, v3(B * 0.5, B * 0.45, B * 0.5), MO.seed.coat, fine ? 12 : 3, new THREE.Quaternion().setFromUnitVectors(UP, d)));
		if (DETAIL.level >= 1) {
			const b = new Batch();
			seedWings(b, sp, d, q * 1.7, B, MO.seed.wingColour, MO.seed.wingEdge, chance('valve-seed', q));
			bag.add('sheet', b.geometry());
		}
	}
	return { L, W };
}

/** the pod's shape for `Space`: balls down it from where it hangs, for its full size */
function podBalls(top, dir) {
	const L = MO.pod.length, W = MO.pod.width;
	const d = dir.clone().normalize();
	return [0.12, 0.35, 0.6, 0.85].map((u) => ({ c: top.clone().addScaledVector(d, u * L), r: W * 0.7 }));
}

/* ---- the root ---- */

/**
 * The swollen, carrot-like taproot (S13, S17, S19): yellowish cream-white, thick at its shoulder and tapering like a
 * parsnip, fine laterals off it; woody and browner with age. `L` its length, `R` its shoulder's radius.
 */
function taproot(bag, seedKey, top, L, R, age) {
	if (!DETAIL.roots || L < 0.002) return;
	const r = chance(seedKey, 'taproot');
	const n = Math.max(6, Math.round(L / 0.012));
	const pts = [top.clone()];
	const d = v3(about(r, 0, 0.06), -1, about(r, 0, 0.06)).normalize();
	for (let i = 1; i <= n; i++) {
		d.x += about(r, 0, 0.05) * (i / n);
		d.z += about(r, 0, 0.05) * (i / n);
		d.normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, L / n));
	}
	const ns = r() * 100;
	const R0 = MO.root;
	const radius = (u, v, s) => {
		// a parsnip: a rounded shoulder, swelling a little below it, tapering over its lower half to a thin tail
		const shoulder = smooth(u / 0.06) * 0.15 + 0.85;
		const carrot = (Math.max(0, 1 - Math.pow(u, 2.1)) * (1 + 0.14 * Math.sin(Math.PI * Math.min(1, u / 0.6))) * shoulder) * 0.94 + 0.06 * (1 - u);
		return R * carrot * (1 + 0.05 * (noise3(Math.cos(v * 6.283) * 2, s * 18, Math.sin(v * 6.283) * 2, ns) - 0.5));
	};
	const paint = (u, v, s) => {
		const c = mix(R0.young, R0.skin, 0.6 + 0.3 * age);
		// faint brown rings across it, where the fine roots left
		const ring = Math.pow(Math.max(0, Math.sin(s * 160 + noise3(v * 4, s * 6, ns) * 3)), 18);
		c.lerp(named(R0.old), ring * 0.45 + 0.25 * age * (1 - u));
		return c;
	};
	bag.add('body', tube(pts, radius, paint, R > 0.006 ? 14 : 7, true));
	return pts;
}
/* ================================================================================================================
 * 3. THE TREE — its axes, its girth, its roots, its season
 * ============================================================================================================== */

/**
 * How the PKM-1 grows, in days from sowing (data sheet §2, §7). The seed sown 2.5 cm deep; the epicotyl's hook at the
 * surface on day 7–8; the first twice-pinnate leaves on day 13; 20–30 cm at a month; one fast leader, pinched at
 * about 75 cm (here day 52); 3–6 shoots from the nodes just below the cut, and a few weaker ones lower (the first
 * branch at 0.36 m, S7), rising into a vase of 5–10 branches (S4, S7, S10), about 2 cm a day while young, slower as it
 * bears; panicles in the axils of the new leaves from about day 95 (S2); pods from about day 100, picked green from
 * day 160–170 (here left on the tree: the last stage shows the first ones dry and split).
 */
const GROW = {
	// the leader's length from the seed (m) by day: hook up at 7–8 d, slow while the seed feeds it, then ~2–3 cm a day
	leader: [[0, 0], [4, 0.003], [7, 0.024], [10, 0.055], [13, 0.07], [20, 0.088], [25, 0.11], [32, 0.2], [38, 0.3], [45, 0.5], [52, 0.79]],
	pinch: 52, // pinched at ~75 cm (S1, S2): its top 2 cm cut
	// a vigorous shoot's growth (m a day) by day: fast to flowering, slower as the crop sets
	rate: [[52, 0.004], [58, 0.012], [66, 0.025], [100, 0.027], [130, 0.016], [170, 0.007], [240, 0.002]],
	plastochron: 2.6, // days between leaves on a growing shoot [EST, data sheet: ~1 leaf every 2–3 days]
	firstFlower: 90, // first panicles from day 90, their first flowers open by ~100 (S2: 90–100 d)
	panicleShare: 0.55,
	crop: 150, // pods carried through the main crop (S4: 150 a tree, control) // of the new leaves from then, how many carry a panicle in their axil [EST: 16–70 a tree, S5]
};

/** the trunk's diameter near its base by day: ~1 cm at the pinch, 4.6 cm at flowering, 8.7 cm at pod set (S5) */
const TRUNK_D = [[0, 0.0012], [13, 0.0018], [25, 0.0025], [35, 0.005], [52, 0.01], [75, 0.022], [100, 0.044], [130, 0.066], [165, 0.083], [240, 0.098]];

/** a shoot's length at day t, born at day `born` with vigour `v`: the growth rate integrated */
const RATE_SUM = (() => {
	const out = [[0, 0]];
	let acc = 0;
	for (let d = 1; d <= 400; d++) {
		acc += straight(d - 0.5, GROW.rate);
		out.push([d, acc]);
	}
	return out;
})();
const grownBy = (t) => straight(t, RATE_SUM);

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

/**
 * The tree's axes at day t. Each axis is a function of the length along it: its heading at s metres from its foot is
 * set by s (and a little by t, as it bends under its leaves and pods), so a young axis is exactly the first part of
 * the old one; its length by its age from the growth rate; its nodes where it had grown to every plastochron, so they
 * crowd where its growth slows (the leaves "crowded towards the twig-ends", S11).
 */
function simulate(seedKey, t) {
	const all = [];
	const tr = chance(seedKey, 'tree');
	const leanA = tr() * Math.PI * 2;
	const lean = v3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(0.03 + tr() * 0.03);
	const load = span(t, 105, 170); // the pods' weight, bending the branches out

	/** an axis grown from `from`: its length `len(t)`, and its heading at s: `head(s)` */
	const make = (key, parent, sp, from, born, len, head, order, vigour, plast) => {
		const ax = { key, parent, sp, order, vigour, born, kids: [], r: chance(seedKey, 'axis', ...key), len, head, plast };
		ax.phase = ax.r() * Math.PI * 2;
		ax.L = Math.max(0, len(t));
		const step = order === 0 ? clamp(len(t) / 30, 0.0015, 0.012) : 0.03;
		const n = Math.max(1, Math.ceil(ax.L / step));
		ax.pts = [from.clone()];
		for (let i = 1; i <= n; i++) {
			const s = ((i - 0.5) / n) * ax.L;
			ax.pts.push(ax.pts[i - 1].clone().addScaledVector(head(s), ax.L / n));
		}
		ax.pathLen = lengths(ax.pts);
		ax.dir0 = head(0);
		// its nodes: one every plastochron from its birth, where it had grown to then
		ax.nodes = [];
		// the leader's first leaves unfold on day 13 (S17), then one every plastochron, which stretches as the shoot's
		// growth slows (a shoot growing a fifth as fast makes leaves at about half the pace)
		let tk = order === 0 ? 13 - plast : born;
		for (let k = 1; ; k++) {
			tk += order === 0 ? plast : plast / (0.35 + 0.65 * clamp(straight(tk, GROW.rate) / 0.027));
			if (tk > t || tk > (ax.stop ?? Infinity)) break;
			const s = len(tk);
			if (s > ax.L + 1e-6) break;
			if (ax.nodes.length && s - ax.nodes[ax.nodes.length - 1].s < 0.004) continue;
			ax.nodes.push({ i: ax.nodes.length, s, formed: tk, bearing: ax.phase + ax.nodes.length * 2.39996 });
		}
		all.push(ax);
		if (parent) parent.kids.push(ax);
		return ax;
	};

	// the leader: up from the seed, the hook straightening; stopped at the pinch
	const base = v3(0, -MO.seed.depth, 0);
	const leaderLen = (d) => (d >= GROW.pinch ? straight(GROW.pinch, GROW.leader) : straight(d, GROW.leader));
	const leader = make(['leader'], null, 0, base, 0, leaderLen, (s) => v3(lean.x * Math.min(1, s * 2), 1, lean.z * Math.min(1, s * 2)).normalize(), 0, 1, GROW.plastochron);
	leader.pinched = t >= GROW.pinch;
	// the epicotyl comes up as a hook (S17, 7–13 d): its top bent over, straightening as the first leaves unfold
	const hook = 1 - span(t, 9, 14);
	if (hook > 0 && leader.L > 0.004) {
		const L = leader.pathLen, total = L[L.length - 1];
		const bend = Math.min(0.02, total * 0.6);
		const side = v3(1, 0, 0);
		for (let i = 1; i < leader.pts.length; i++) {
			const x = (L[i] - (total - bend)) / bend;
			if (x <= 0) continue;
			// its top `bend` metres a smooth arch over through up to 170°, the tip pointing down into the soil it left
			const th = hook * Math.PI * 0.95;
			const R = bend / Math.max(1e-4, th);
			const a = th * x;
			const o = pointAt(leader, total - bend).at;
			leader.pts[i] = o.clone().add(v3(0, Math.sin(a) * R, 0)).addScaledVector(side, (1 - Math.cos(a)) * R);
		}
		leader.pathLen = lengths(leader.pts);
	}
	if (t < GROW.pinch + 1) return { all, leader, load };

	// the branches: from the nodes just below the cut, the top ones first and strongest; a few weaker ones lower
	const br = chance(seedKey, 'branches');
	const n = 4 + Math.floor(br() * 3); // 4–6 from below the cut, 5–10 in all (S4, S7)
	const top = leader.nodes.filter((nd) => nd.s > leader.L - 0.22).reverse();
	const low = leader.nodes.filter((nd) => nd.s > 0.36 + MO.seed.depth && nd.s < 0.58);
	const picks = [];
	for (let i = 0; i < n && i < top.length; i++) picks.push({ node: top[i], rank: i, vig: lerp(0.98, 0.9, i / Math.max(1, n - 1)) * about(br, 1, 0.05), born: GROW.pinch + 1 + i * 1.2 });
	const lowN = br() < 0.35 ? 1 : 0; // now and then a weak low branch (the first at 0.36 m, S7)
	for (let i = 0; i < lowN && low.length; i++) picks.push({ node: low[Math.floor(br() * low.length)], rank: n + i, vig: between(br, 0.45, 0.62), born: GROW.pinch + 6 + i * 4 });
	const spin = br() * Math.PI * 2;
	function branchHead(a0, aUp, az, droop, r, out = 0, s1 = 1) {
		const wob = r() * 6.283, wob2 = r() * 6.283;
		return (s) => {
			// it leaves at a0 from upright and turns up toward aUp over its first third of a metre; past s1 it turns
			// out toward the level (the umbrella the crown spreads into, the sheet's bearing tree), and its end bends
			// a little further down under its pods
			let a = aUp + (a0 - aUp) * Math.exp(-s / 0.35);
			a += out * smooth((s - s1) / 0.9);
			a += droop * load * smooth((s - s1 - 0.4) / 1.2);
			a += 0.04 * Math.sin(s * 3.1 + wob);
			const b = az + 0.05 * Math.sin(s * 2.3 + wob2);
			return v3(Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b));
		};
	};
	for (const p of picks) {
		const r = chance(seedKey, 'branch', p.rank);
		const az = spin + p.node.bearing * 0 + p.rank * 2.39996 + about(r, 0, 0.2);
		const topOne = p.rank === 0;
		// they leave at 40–57° from upright (35–55°, data sheet [EST]), settle to 22–34° and arch out under their load
		const a0 = topOne ? between(r, 0.4, 0.55) : between(r, 0.7, 1.0);
		const aUp = topOne ? 0.34 : lerp(0.36, 0.55, p.rank / (n + 2)) + about(r, 0, 0.05);
		const droop = lerp(0.15, 0.3, p.rank / (n + 2)) * (p.vig < 0.65 ? 1.5 : 1);
		const out = topOne ? between(r, 0.5, 0.65) : between(r, 0.45, 0.62);
		const vig = p.vig;
		const born = p.born;
		const len = (d) => Math.max(0, vig * (grownBy(d) - grownBy(born)));
		const at = pointAt(leader, p.node.s).at;
		const ax = make(['branch', p.rank], leader, p.node.s, at, born, len, branchHead(a0, aUp, az, droop, r, out, 1.15), 1, vig, GROW.plastochron);
		// its own side shoots from about day 95: one or two from its middle, weaker, spreading wider (S7: 9.8 branches)
		const nk = vig > 0.75 ? 2 + (r() < 0.5 ? 1 : 0) : vig > 0.55 ? 1 : 0;
		for (let j = 0; j < nk; j++) {
			const b2 = 84 + j * 13 + r() * 12;
			if (t < b2 + 0.5) continue;
			const cand = ax.nodes.filter((nd) => nd.formed < b2 - 8 && nd.s > 0.5);
			if (!cand.length) continue;
			const nd = cand[Math.floor(cand.length * between(r, 0.55, 0.92))];
			const pa = pointAt(ax, nd.s);
			const flat = pa.dir.clone().setY(0);
			const az2 = Math.atan2(flat.z, flat.x) + (r() < 0.5 ? -1 : 1) * between(r, 0.5, 1.1);
			const v2 = vig * between(r, 0.42, 0.55);
			const len2 = (d) => Math.max(0, v2 * (grownBy(d) - grownBy(b2)));
			make(['branch', p.rank, j], ax, nd.s, pa.at, b2, len2, branchHead(between(r, 0.9, 1.1), between(r, 0.75, 0.95), az2, 0.3, r, 0.25, 0.45), 2, v2, GROW.plastochron * 1.2);
		}
	}
	// and all season the branches put out side shoots from their nodes, weaker, spreading wider, flowering in turn:
	// what fills the crown into the sheet's umbrella (the PKM-1's 'widest, most branched canopy', S10)
	const sprout = (ax) => {
		if (ax.order >= 3) return;
		for (const nd of ax.nodes) {
			if (nd.formed < 70) continue;
			const r = chance(seedKey, 'sprout', ...ax.key, nd.i);
			if (r() > (ax.order === 1 ? 0.2 : 0.09)) continue;
			const born = nd.formed + between(r, 10, 24);
			if (t < born + 0.5 || born > 185) continue;
			const pa = pointAt(ax, nd.s);
			const flat = pa.dir.clone().setY(0);
			const side = across(pa.dir).applyAxisAngle(pa.dir, nd.bearing).setY(0);
			const az2 = Math.atan2(flat.z + side.z * 0.8, flat.x + side.x * 0.8);
			const v2 = ax.vigour * between(r, 0.3, 0.46);
			const len2 = (d) => Math.max(0, v2 * (grownBy(d) - grownBy(born)));
			const kid = make([...ax.key, 's', nd.i], ax, nd.s, pa.at, born, len2, branchHead(between(r, 0.95, 1.3), between(r, 0.95, 1.2), az2, 0.3, r, 0.2, 0.25), ax.order + 1, v2, GROW.plastochron * 1.25);
			sprout(kid);
		}
	};
	for (const ax of all.slice()) if (ax.order >= 1) sprout(ax);
	return { all, leader, load };
}

/**
 * How thick each axis is along it: the pipe model (the wood at a place carries what every shoot beyond it needs,
 * r^2.5 summed) plus a share for the length beyond, then the whole tree scaled so its trunk near the base has the
 * measured diameter of its age (TRUNK_D, S5), measured at `min(0.15, half the length grown)` (avocado v3's lesson).
 */
function thicken(all, leader, t) {
	const P = 2.5;
	const tipR = 0.0018;
	const walk = (ax) => {
		const L = ax.pathLen;
		const n = ax.pts.length;
		ax.q = new Array(n).fill(0);
		const add = new Array(n).fill(0);
		for (const k of ax.kids) {
			if (k.L <= 0.002) continue;
			walk(k);
			const { i } = pointAt(ax, k.sp);
			add[Math.max(0, i - 1)] += k.q[0];
		}
		let acc = 0;
		for (let i = n - 1; i >= 0; i--) {
			acc += add[i];
			const beyond = Math.max(0, ax.L - L[i]);
			ax.q[i] = Math.pow(tipR, P) + acc + 4e-7 * beyond;
		}
	};
	for (const ax of all) ax.q = null;
	walk(leader);
	const at = pointAt(leader, Math.min(0.17, leader.L * 0.5)).i;
	const raw = Math.pow(leader.q[Math.min(leader.q.length - 1, at)], 1 / P);
	const k = straight(t, TRUNK_D) / 2 / Math.max(1e-6, raw);
	for (const ax of all) ax.rad = (ax.q ?? new Array(ax.pts.length).fill(0)).map((q) => Math.max(0.0009, Math.pow(q, 1 / P) * k));
}

/** the wood's colour by its age (days) and radius: green and downy young, grey-green with lenticels, pale corky buff old */
function barkColour(age, r, ns, s) {
	const B = MO.bark;
	let c = mix(B.shoot, B.young, span(age, 8, 40));
	// young shoots flushed purplish on their sunny side (S11)
	c.lerp(named(B.purple), 0.25 * (1 - span(age, 0, 12)));
	c.lerp(named(B.old), span(r, 0.006, 0.018));
	c.lerp(named(B.weathered), 0.25 * span(r, 0.02, 0.045) * noise3(s * 4, ns, 0));
	return c;
}

/** the tree's wood drawn: every axis a tube as far as it has grown, its bark by the age and girth of each part */
function wood(bag, ax, t, ns) {
	const L = ax.pathLen;
	const total = ax.L;
	if (total < 0.002) return;
	const n = ax.pts.length;
	const radiusAt = (s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		const k = clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return lerp(ax.rad[i - 1], ax.rad[i] ?? ax.rad[i - 1], k);
	};
	// when the wood at s was made: the day its axis grew past it
	const formedAt = (s) => {
		let lo = ax.born, hi = t;
		for (let i = 0; i < 18; i++) {
			const m = (lo + hi) / 2;
			if (ax.len(m) < s) lo = m;
			else hi = m;
		}
		return hi;
	};
	const R0 = Math.max(radiusAt(0), 0.0008);
	const isTrunk = ax.order === 0;
	const step = isTrunk ? clamp(R0 * 0.6, 0.004, 0.03) : R0 > 0.012 ? clamp(R0 * 1.6, 0.02, 0.08) : clamp(R0 * 25, 0.04, 0.12);
	const count = Math.max(2, Math.ceil(total / step));
	const pts = [], ss = [];
	for (let k = 0; k <= count; k++) {
		const s = (k / count) * total;
		ss.push(s);
		pts.push(pointAt(ax, s).at);
	}
	const sides = Math.round(clamp(R0 * 700, R0 < 0.003 ? 4 : 5, 30));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			// the foot swelling into the tuberous root
			const h = pts[0].y + s;
			r *= 1 + 0.35 * span(t, 40, 160) * Math.exp(-Math.max(0, h + 0.02) / 0.08);
		}
		if (ax.parent && s < r * 2.5) r *= 1 + 0.2 * (1 - s / (r * 2.5)); // the branch collar
		// the pinched leader's end: cut square
		if (r > 0.012) r *= 1 + 0.06 * (fbm(Math.cos(v * 6.283) * 3, s * 5, Math.sin(v * 6.283) * 3, 2, nsAx) - 0.5);
		return r;
	};
	const kind = R0 > 0.01 ? 'bark' : 'twig';
	const lift = lifted(kind === 'bark' ? 'barkMap' : 'twigMap');
	const paint = (u, v, s) => {
		const c = barkColour(t - formedAt(s), radiusAt(s), nsAx, s);
		if (isTrunk && pts[0].y + s < 0) c.lerp(named(MO.root.skin), 0.6);
		if (isTrunk && ax.pinched && u > 0.995) c.copy(named(MO.bark.cut));
		return c.multiplyScalar(lift);
	};
	const g = tube(pts, radius, paint, sides, true);
	// UVs in metres: along the wood and round it, over the bark's (0.10 m) or the twig's (0.05 m) tile
	const tile = kind === 'bark' ? 0.1 : 0.05;
	const uv = g.attributes.uv;
	const rings = pts.length;
	const per = sides + 1;
	for (let i = 0; i < uv.count; i++) {
		const ring = Math.min(rings - 1, Math.floor(i / per));
		const v = i < rings * per ? (i % per) / sides : 0;
		uv.setXY(i, ss[ring] / tile, (v * 2 * Math.PI * Math.max(radiusAt(ss[ring]), 0.003)) / tile);
	}
	bag.add(kind, g);
}

/**
 * The roots: the swollen taproot from the seed (12–20 cm and up to 1 cm thick at a month, 25–35 cm and 1.5–2.5 cm at
 * two, woody and 5–10 cm thick at a year, S13, S19 [EST sizes]), its fine laterals, and 4–8 long laterals spreading
 * in the top 30 cm once the tree is grown (data sheet: Roots).
 */
function roots(bag, seedKey, t, base, minR = 0) {
	if (!DETAIL.roots) return;
	const L = table(t, [[3, 0], [5, 0.012], [8, 0.03], [13, 0.05], [20, 0.08], [30, 0.14], [45, 0.22], [60, 0.3], [100, 0.48], [165, 0.7], [240, 0.85]]);
	const R = Math.max(minR, table(t, [[4, 0.0006], [10, 0.001], [20, 0.0018], [30, 0.0032], [45, 0.006], [60, 0.0095], [100, 0.018], [165, 0.028], [240, 0.034]]));
	const pts = taproot(bag, seedKey, base, L, R, span(t, 60, 240));
	if (!pts) return;
	// fine laterals off the taproot, more and longer as it grows (secondary roots from day 20, S17)
	const n = Math.round(table(t, [[15, 0], [25, 4], [60, 9], [165, 14]]));
	for (let i = 0; i < n; i++) {
		const rr = chance(seedKey, 'fine-root', i);
		const u = i < 6 ? between(rr, 0.08, 0.45) : between(rr, 0.3, 0.85);
		const k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
		const bear = i * 2.39996 + rr();
		const born = 18 + i * 6;
		root(bag, {
			seed: seedKey,
			key: ['fine', i],
			from: pts[k].clone().add(v3(Math.cos(bear) * R * (1 - u) * 0.9, 0, Math.sin(bear) * R * (1 - u) * 0.9)),
			dir: v3(Math.cos(bear), -0.5, Math.sin(bear)),
			length: between(rr, 0.08, 0.2) * lerp(0.6, 2.2, span(t, 30, 200)),
			grown: (t - born) / 40,
			radius: lerp(0.0008, 0.008, span(t, 30, 170)) * (i < 6 ? 1 : 0.4), // a few stout ones from the shoulder, finer below
			down: 0.06,
			wander: 0.3,
			laterals: 3,
			lateral: 0.35,
			depth: 1,
			age: span(t, 40, 240),
			young: MO.root.young,
			old: MO.root.old,
		});
	}
	// the long spreading laterals near the top
	for (let i = 0; i < 6; i++) {
		const rr = chance(seedKey, 'lateral-root', i);
		const born = 45 + i * 12;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed: seedKey,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * R * 0.7, -0.03 - rr() * 0.08, Math.sin(bear) * R * 0.7)),
			dir: v3(Math.cos(bear), -0.3 - rr() * 0.2, Math.sin(bear)),
			length: between(rr, 0.6, 1.3),
			grown: (t - born) / 160,
			radius: lerp(0.0015, 0.009, span(t, born, 240)) * between(rr, 0.7, 1),
			down: 0.025,
			wander: 0.16,
			laterals: 5,
			lateral: 0.3,
			depth: 2,
			taper: 0.8,
			age: (t - born) / 150,
			young: MO.root.young,
			old: MO.root.old,
			floor: -0.45,
		});
	}
}

/**
 * The whole PKM-1 at day t: the seed as long as it lasts, its roots, its wood, its leaves where they live, and from
 * about day 95 its panicles and the pods they set, lengthening to 70 cm in four weeks, filling, picked green at 45–70
 * days (left on here), drying light brown and splitting into three valves by ~115 days.
 */
function moringaTree(t, seedKey) {
	const bag = new Bag();
	const leaves = new Batch();
	const blooms = new Batch();
	const ns = hashText(seedKey) % 997;
	const seedAt = v3(0.006, -MO.seed.depth, 0.004);
	if (t < 62) seed(bag, seedAt, span(t, 20, 60), seedKey);

	const { all, leader, load } = simulate(seedKey, t);
	thicken(all, leader, t);
	for (const ax of all) wood(bag, ax, t, ns);
	// the taproot under the trunk's foot, its shoulder never narrower than the foot
	roots(bag, seedKey, t, v3(0, -MO.seed.depth + 0.004, 0), (leader.rad[0] ?? 0) * (1 + 0.35 * span(t, 40, 160)) * 1.03);

	// the wood in the space, for the pods to hang clear of
	const space = bag.space;
	for (const ax of all) {
		if (ax.L < 0.05) continue;
		const pts = [];
		for (let i = 0; i < ax.pts.length; i += 2) pts.push(ax.pts[i]);
		if (pts.length > 1) space.rod(pts, (u) => (ax.rad[Math.round(u * (ax.pts.length - 1))] ?? 0.002) + 0.004);
	}

	// the leaves and what their axils bear
	let pods = 0;
	const setting = [];
	for (const ax of all) {
		const radAt = (s) => ax.rad[pointAt(ax, s).i] ?? 0.002;
		for (const nd of ax.nodes) {
			const age = t - nd.formed;
			const r = chance(seedKey, 'leaf', ...ax.key, nd.i);
			const life = between(r, MO.leaf.life[0], MO.leaf.life[1]);
			const p = pointAt(ax, nd.s);
			const side = across(p.dir).applyAxisAngle(p.dir, nd.bearing);
			const at = p.at.clone().addScaledVector(side, radAt(nd.s));
			// leaf size and complexity: the leader's first leaves small and simpler (S19), later grown; the late leaves
			// of a bearing branch smaller
			const idx = ax.order === 0 ? nd.i : 14;
			const size = (ax.order === 0 ? table(idx, [[0, 0.17], [2, 0.26], [5, 0.42], [9, 0.68], [14, 0.95]]) : lerp(0.95, 0.62, span(nd.formed, 120, 220)) * lerp(0.75, 1, ax.vigour) * (ax.order >= 2 ? 0.85 : 1)) * about(r, 1, 0.08);
			const complexity = ax.order === 0 ? table(idx, [[0, 0], [3, 0.25], [9, 0.55], [15, 1]]) : [1, 1, 0.75, 0.6][ax.order];
			// grown leaves held out from the shoot and arching (young ones upright, the arch in leaf())
			const rise = lerp(1.0, 1.35, r());
			const out = p.dir.clone().multiplyScalar(Math.cos(rise)).addScaledVector(side, Math.sin(rise)).normalize();
			const face = new THREE.Vector3().crossVectors(new THREE.Vector3().crossVectors(out, UP), out).normalize();
			if (face.y < 0) face.negate();
			leaf(bag, leaves, { at, out, face, size, complexity, age, life, r, coarse: ax.order >= 2, key: `${seedKey}|${ax.key.join('.')}|${nd.i}` });

			// a panicle in this leaf's axil, on the new growth from about day 95 (S2)
			if (ax.order === 0 || nd.formed < GROW.firstFlower - 8) continue;
			const pr = chance(seedKey, 'panicle?', ...ax.key, nd.i);
			// more of them high in the crown, where the light is (the first one about 0.9 m up, S7)
			// and fewer as the crop ends at 8–10 months (S1, S2)
			if (pr() > GROW.panicleShare * [1, 1, 0.75, 0.5][ax.order] * lerp(0.3, 1, smooth((at.y - 0.9) / 1.1)) * (1 - 0.8 * span(nd.formed, 175, 215))) continue;
			const shows = Math.max(nd.formed + 4, GROW.firstFlower) + pr() * 6;
			const pAge = t - shows;
			if (pAge <= 0) continue;
			const pd = out.clone().addScaledVector(p.dir, 0.6).normalize();
			const feet = panicle(bag, blooms, seedKey, [...ax.key, nd.i], at, pd, pAge);
			// the pods it sets: 1.2 a panicle (S5), set as its flowers open, ~3 weeks after it shows
			const x = pr();
			const np = x < MO.panicle.set[0] ? 0 : x < MO.panicle.set[1] ? 1 : x < MO.panicle.set[2] ? 2 : 3;
			for (let j = 0; j < np && j < feet.length; j++) {
				const set = shows + 12 + pr() * 10;
				if (t <= set) continue;
				const key = [...ax.key, nd.i, 'pod', j];
				setting.push({ set, key, foot: feet[feet.length - 1 - j] });
			}
		}
	}
	// the pods in the order they set: a tree carries some 150 pods through its main crop (S4); past that, and one in
	// six before it, a young pod drops in its first fortnight (S7). The order never changes as the tree grows on, so
	// a pod kept is kept at every later stage.
	setting.sort((a, b) => a.set - b.set);
	let kept = 0;
	for (const p of setting) {
		const pr = chance(seedKey, 'pod', ...p.key);
		const days = t - p.set;
		const keep = pr() < 0.84 && kept < GROW.crop;
		if (keep) kept++;
		const k = about(pr, 1, 0.08);
		if (!keep && days > 14) continue;
		const { foot, key } = p;
		bag.fruit(key, foot.at, v3(0, -1, 0));
		// its stalk, then the pod hanging straight down from it, swung a little to hang clear of the wood
		const stalkEnd = foot.at.clone().addScaledVector(foot.dir.clone().lerp(v3(0, -1, 0), 0.6).normalize(), MO.pod.stalk);
		bag.add('twig', tube([foot.at, stalkEnd], () => 0.0018 * lerp(0.6, 1, span(days, 0, 30)), () => mix(MO.flower.axis, MO.pod.dry, span(days, 80, 105)), 5, false));
		const hang = v3(about(pr, 0, 0.12), -1, about(pr, 0, 0.12)).normalize();
		const place = keep && days > 8 ? space.settle(stalkEnd, hang, podBalls, 0.01) : { at: stalkEnd, dir: hang };
		const fine = DETAIL.fruit === key.join('|');
		const open = span(days, 104, 116);
		if (open > 0) podValves(bag, place.at, place.dir, days, k, pr, open, fine);
		else podBody(bag, place.at, place.dir, days, keep ? k : k * lerp(1, 0.6, span(days, 6, 14)), pr, fine);
		bag.fruitDone();
		pods++;
	}
	const lg = leaves.geometry();
	if (lg) bag.add('leaf', lg);
	const fg = blooms.geometry();
	if (fg) bag.add('sheet', fg);
	const group = bag.build();
	group.userData.pods = pods;
	return group;
}
/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages from the seed sown to the first pods ripe; `t` the days since sowing each is grown at (between two stages,
 * on the way). A PKM-1 sown in a pit in Tamil Nadu: pinched at 75 cm, flowering from its fourth month, its first green
 * pods picked in its sixth, the first pods left on the tree dry and split in its eighth.
 */
const STAGES = [
	{ name: 'Seed', t: 0, note: 'The winged seed sown 2.5 cm deep in a pit: a dark brown, faintly three-angled body 11 mm across with three papery straw wings, 0.27 g (S1, S2, S17). PKM-1 is grown from seed.' },
	{ name: 'Germination', t: 10, note: 'Ten days: the root went down on day 4–5, and the shoot broke the soil as a hook on day 7–8. Germination is hypogeal: the seed and its seed leaves stay in the soil, feeding the seedling for a month and more (S17, S18).' },
	{ name: 'First leaves', t: 18, note: 'Eighteen days: the first true leaves, already twice-pinnate, two pairs of pinnae of a few small oval leaflets, 6–10 cm long; the taproot thickening (S17, S19).' },
	{ name: 'Seedling', t: 35, note: 'Five weeks: 20–30 cm, a thin green stem with feathery leaves, the seed still in the soil at its foot, the taproot already swollen like a small carrot, 12–20 cm long (S19, S20).' },
	{ name: 'Pinched', t: 55, note: 'Eight weeks: the leader reached about 75 cm and was pinched (S1, S2); shoots break from the nodes just below the cut. The leaves are now thrice-pinnate, up to 45 cm.' },
	{ name: 'Branching', t: 75, note: 'Eleven weeks: 1.1 m, the trunk about 2 cm thick; four to six shoots from below the cut and a weaker one or two lower down rise into a vase, growing 2–3 cm a day.' },
	{ name: 'Flowering', t: 110, note: 'Fifteen weeks: about 2 m, the trunk 4.6 cm thick (S5); loose drooping panicles of fragrant cream flowers in the axils of the new leaves, 40–90 a panicle (S2, S7); carpenter bees work them; 2–4 % set (S7).' },
	{ name: 'Pod set', t: 132, note: 'Nineteen weeks: the first pods hang from the panicles, thin green rods lengthening half their length in ten days and to their full 70 cm in four weeks; the panicles still opening further up.' },
	{ name: 'Harvest', t: 168, note: 'Twenty-four weeks: about 3 m on 5–10 branches, the trunk 8–9 cm (S4, S5); green drumsticks 70 cm long, 2 cm across, three-angled and ribbed, 130 g, ready to pick at 45–70 days after flowering (S2, S4, S7). Here none are picked.' },
	{ name: 'Pods ripe', t: 236, note: 'Thirty-four weeks: the first pods, left on the tree, are dry and light brown at 100–115 days after flowering and split along their three angles into three valves, silvery inside, their winged seeds falling (S11, S15, S16); younger pods still green below them. The crop ends at 8–10 months; the tree is then cut back to 1 m for its ratoon.' },
];

/** the days since sowing at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => moringaTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one pod on its own ---- */

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

/** the pod the seed picks: one of the well-grown pods already on the tree at harvest, so it is seen at every later stage */
function ripePick(seed) {
	const at = STAGES.findIndex((s) => s.name === 'Harvest');
	const { plant, fruits } = lite({ roots: false }, () => pickFruit(() => grow(at, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.92);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one pod at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This tree bears no pods.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This pod has not set yet: the tree flowers from about its fourteenth week.');
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

/** what the tree is grown with, in the order `build` takes it: stage, seed, detail, and the view (plant or pod) */
const PARAMS = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: STAGES.length - 1, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] },
];

const PLANT = {
	id: 'moringa',
	label: "Moringa 'PKM-1' · Moringa oleifera",
	latin: "Moringa oleifera Lam. 'PKM-1' (Periyakulam 1; Horticultural Research Station, Periyakulam, TNAU, 1989) · drumstick tree, murungai, sahjan",
	note: "The annual drumstick tree of Tamil Nadu, grown from seed and the most planted cultivated moringa in India: a fast, soft-wooded tree pinched at 75 cm into a vase of 5–10 slender branches, its pale grey corky trunk 8–9 cm thick by its sixth month; feathery leaves 2–3 times pinnate, 45 cm long, with small oval leaflets 2.2 × 1.3 cm; loose drooping panicles of fragrant cream flowers from its fourth month; green, three-angled, nine-ribbed drumsticks 70 cm long and 130 g, picked at 45–70 days after flowering, light brown and split into three valves by 115; a swollen, carrot-like taproot.",
	from: 'Tree · grown from seed, pinched at 75 cm, bearing in its sixth month',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '058c8664474845d907ce0711fbfa37e9b84baff2739005aecdb618c7118e6456', model: 'fal-ai/nano-banana-pro (+ /edit, a pods plate pasted in)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t), note })), // days from sowing
	// what a world needs to plant it right; data sheet moringa-pkm1.md, S1–S25
	facts: {
		height: { at35d: [0.2, 0.3], atPinch: 0.75, at105d: [2, 2.4], atHarvest: [2.6, 3.7], ratoon: [3.4, 4.8], unmanaged: [4, 6], unit: 'm' },
		crownWidth: { atHarvest: [1.7, 2.5], unit: 'm' },
		trunkDiameter: { atPinch: 0.01, at105d: [0.046, 0.057], at165d: [0.083, 0.102], unit: 'm' },
		spacing: [2.0, 2.5], // pits 45 cm, 2–2.5 m apart either way (1,600 a hectare); high density 1.5 × 1.0 m
		shade: 'full sun',
		climate: 'tropical lowland, best 25–30 °C (heat above sheds flowers), to 48 °C in shade; frost kills it to the ground; 250–1,500 mm rain, irrigated every 10–15 days as a crop; no waterlogging; best below 600 m',
		days: { emergence: [7, 8], firstLeaves: 13, pinch: [45, 60], firstFlowers: [90, 100], fiftyPercentFlowering: [105, 165], firstHarvest: [160, 170], cropEnds: [240, 300] },
		years: { productiveLife: [3, 4], ratoons: 3 },
		leaf: { length: [0.25, 0.6], pinnaePairs: [4, 8], leaflets: [75, 150], leaflet: [0.022, 0.013], life: [60, 90], unit: 'm, days' },
		flower: { diameter: 0.025, perPanicle: [40, 90], panicleLength: [0.1, 0.25], set: [0.018, 0.036], pollinators: 'carpenter bees (Xylocopa), sunbirds' },
		fruit: { length: [0.61, 0.76], width: 0.021, girth: 0.063, mass: [0.118, 0.146], seeds: [14, 20], daysToFullLength: 28, daysToPick: [45, 70], daysToDry: [100, 115], podsPerTree: [150, 255], unit: 'm, kg, days' },
		seed: { body: [0.01, 0.014], acrossWings: 0.035, mass: 0.00027, germination: 'hypogeal', unit: 'm, kg' },
		yield: { podsPerTree: 150, kgPerTree: [17.7, 36.7], tPerHa: [28, 55], unit: 'kg, t' },
		roots: { taproot: 'swollen, carrot-like, pungent', at2months: [0.25, 0.35], deepAt1y: [1, 1.5], unit: 'm' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one pod) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'moringa' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'moringa',
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


/**
 * The organs on their own for the organ bench (organ.mjs), laid as the sheet's panels lie: a leaflet base down, a pinna
 * stalk down (its face to the camera, +Z), a pod along +X, a flower facing the camera.
 */
function benchOrgan(kind, o = {}) {
	const bag = new Bag();
	const batch = new Batch();
	const r = chance('bench', kind);
	if (kind === 'leaflet') {
		const L = o.length ?? MO.leaf.leaflet[0];
		const m = new THREE.Matrix4().makeBasis(v3(0, 1, 0), v3(0, 0, 1), v3(1, 0, 0)).multiply(new THREE.Matrix4().makeScale(L, L, L * (o.tip ? 1.1 : 1)));
		batch.lay(tpl('leaflet'), m, (f) => (f ? MO.leaf.under : MO.leaf.up), false);
		bag.add('leaf', batch.geometry());
	} else if (kind === 'pinna') {
		const stalks = [], leaflets = [];
		pinnateInto(stalks, leaflets, v3(0, 0, 0), v3(1, 0, 0), o.n ?? 3, o.lf ?? MO.leaf.leaflet[0], 'bench', 0, 1, r);
		const face = o.under ? v3(0, 0, -1) : v3(0, 0, 1);
		leaf(bag, batch, { at: v3(0, 0, 0), out: v3(0, 1, 0), face, size: 1, complexity: 1, age: 40, life: 90, r, plan: { stalks, leaflets } });
		const g = batch.geometry();
		if (g) bag.add('leaf', g);
	} else if (kind === 'pod') {
		podBody(bag, v3(0, 0, 0), v3(1, 0, 0), o.days ?? 55, 1, r, true);
	} else if (kind === 'dryPod') {
		podValves(bag, v3(0, 0, 0), v3(1, 0, 0), o.days ?? 118, 1, r, 1, true);
	} else if (kind === 'flower') {
		flower(bag, batch, v3(0, 0, 0), o.dir ?? v3(0, 0, 1), UP, 1, 0, r, true);
		bag.add('sheet', batch.geometry());
	} else if (kind === 'seed') {
		seed(bag, v3(0, 0, 0), 0, 'bench', true);
	} else if (kind === 'root') {
		lite({ roots: true }, () => roots(bag, o.seed ?? 'maia', o.t ?? 90, v3(0, 0, 0)));
	}
	return bag.build();
}

/** the organs on their own, for checking them against the reference sheet's panels */
module.exports.organs = { benchOrgan, pinnateInto, MO, GROW, seed, leaf, leafPlan, flower, panicle, podBody, podValves, podLength, podGirth, taproot, roots, simulate, thicken, moringaTree, grow, Bag, Batch, tpl, timeAt, STAGES, surface, lite, detailAt, sound };
