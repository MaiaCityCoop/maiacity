'use strict';
/*
 * ORANGE 'TAROCCO' — Citrus × sinensis (L.) Osbeck 'Tarocco', the Sicilian blood orange of the plain of Catania and the
 * slopes of Etna (PGI Arancia Rossa di Sicilia): a sweet orange whose flesh, and a patch of its rind, turn red with
 * anthocyanins after weeks of cold winter nights. Version 2 of plants/orange: one named cultivar, grown as it really is
 * grown, budded onto a sour-orange seedling in the nursery and planted out at two years, to a dome of a tree 3.4 m high
 * in its eighth year in the grove, through one season from the May bloom to ripe fruit in February.
 *
 * Its numbers are the Tarocco's where they are measured (Hodgson in The Citrus Industry, the PGI disciplinare, the UCR
 * Citrus Variety Collection, Tarocco clones measured in Spain and at Lentini: fruit 70–86 mm, 178–350 g, rind 3.5–6.6
 * mm, 9–12 segments, nearly seedless, a basal collar, the rind "neutral orange with patches of garnet red"; its three
 * flushes measured on young Tarocco in Sardinia; Scirè's fruit peaking at 78 mm in December and picked 275 days after
 * full bloom), the sweet orange's otherwise (leaves, flowers, tree size by age), every one with its source: the
 * plant-skill's data sheet for it (references/orange-tarocco.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its wrong cells redrawn, kept in play's Library by its hash (dca75395…): the leaf's outline, the fruit's
 * profile at four ages and their colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), as banana v2 carries it, with the orange's materials and surfaces: small pictures made
 *                   from noise for what vertex colours cannot carry (a leaf's veins, the rind's oil glands, the
 *                   bark's fine lines and lichen).
 *   2. ORGANS       the orange's own, each to its measure: the seed, the leaf (its winged stalk), the flower, the
 *                   fruit (its collar, its colour by days, its blush), a thorn.
 *   3. THE TREE     the sour-orange seedling, the Tarocco bud on it, the nursery whip, and the tree in the grove grown
 *                   flush by flush (three a year, each shoot ending as its tip aborts, the next flush breaking from
 *                   its upper buds), girth by the pipe model, leaves that live two to three years, the bloom on the
 *                   spring flush, the June drop, the fruit from set to ripe.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from sowing the rootstock's seed (on the first of March).
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
		// a tree of thousands of shoots and leaves: far off, its twigs left out and a part of its leaves, each grown bigger
		[0.1, 0.07, 2.2, 0.009],
		[0.25, 0.25, 1.6, 0.0035],
		[0.5, 0.55, 1.25, 0.0018],
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
 *   leafMap / leafBump   one leaf blade, base to tip (x) by margin to margin (y), in the leaf's own UVs: the midrib a
 *                        little paler, nine to eleven pairs of secondary veins leaving it at 50–60° toward the tip and
 *                        looping into one another short of the margin (the sheet's leaf panels), a faint mottle
 *   rindBump / rindMap   2 cm of rind: the oil glands, sunk pits about 1 mm apart, a few larger, and the fine
 *                        pebbling between them; a little darker in each pit
 *   barkMap / barkBump   20 cm of old trunk: grey-green bark striated along it with brown (RHS 197A with N200A, the
 *                        data sheet), smooth, with small round pale lichen spots
 *   woodMap / woodBump   20 cm of two- to five-year wood: the fine paler streaks along it, no lichen
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	// a vein of the blade at (x along 0 … 1, y across −1 … 1): how close it is to a secondary vein
	const vein = (x, y) => {
		const a = Math.abs(y);
		// each vein leaves the midrib and runs out toward the tip; the n-th starts at x0 = 0.06 + 0.087 n
		const along = x - a * 0.42;
		const k = (along - 0.04) / 0.087;
		const d = Math.abs(k - Math.round(k)) * 0.087;
		return Math.exp(-Math.pow(d / 0.0045, 2)) * smooth((0.9 - a) / 0.15) * smooth(along / 0.05) * smooth((1.0 - x) / 0.08);
	};
	const make = {
		leafMap: () =>
			picture(512, 256, (x, y) => {
				const v = y * 2 - 1;
				const mid = Math.exp(-Math.pow(v / 0.018, 2));
				const k = 0.95 + 0.07 * vein(x, v) + 0.1 * mid + 0.04 * (tileNoise(x, y, 4, 3) - 0.5);
				return [k, k * 1.01, k * 0.95];
			}, true),
		leafBump: () =>
			picture(512, 256, (x, y) => {
				const v = y * 2 - 1;
				const mid = Math.exp(-Math.pow(v / 0.02, 2));
				// the veins sunk a little on the upper side, the blade between them faintly domed
				return 0.5 - 0.22 * vein(x, v) - 0.18 * mid + 0.015 * (tileNoise(x, y, 6, 5) - 0.5);
			}),
		rindBump: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 18, 18, 61);
				const pit = smooth((0.42 - c.f1) * 4) * (0.7 + 0.3 * c.id);
				return 0.62 - 0.38 * pit + 0.06 * (tileNoise(x, y, 30, 63) - 0.5);
			}),
		rindMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 18, 18, 61);
				const pit = smooth((0.35 - c.f1) * 5);
				const k = 1.02 - 0.1 * pit + 0.06 * (tileNoise(x, y, 6, 65) - 0.5);
				return [k, k, k];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x along the trunk, y round it: brown striations, fine and long, and pale lichen spots
				const streak = tileNoise(x, y, 2, 71, 3, 40);
				const brown = smooth((streak - 0.56) * 8);
				const c = tileCells(x, y, 9, 9, 73);
				const lichen = c.id < 0.16 ? smooth((0.3 * (0.6 + c.id * 2.5) - c.f1 + (tileNoise(x, y, 24, 75) - 0.5) * 0.18) * 14) : 0;
				const k = 0.95 + 0.1 * (tileNoise(x, y, 4, 77, 2, 60) - 0.5);
				const r = k * lerp(1, 0.62, brown), g = k * lerp(1, 0.52, brown), b = k * lerp(1, 0.5, brown);
				return [lerp(r, 1.45, lichen), lerp(g, 1.55, lichen), lerp(b, 1.25, lichen)];
			}, true),
		barkBump: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 9, 9, 73);
				const lichen = c.id < 0.16 ? smooth((0.3 * (0.6 + c.id * 2.5) - c.f1) * 14) : 0;
				return 0.5 + 0.22 * (tileNoise(x, y, 3, 79, 2, 70) - 0.5) + 0.12 * lichen;
			}),
		woodMap: () =>
			picture(128, 128, (x, y) => {
				const k = 0.96 + 0.1 * Math.pow(Math.abs(Math.cos(y * Math.PI * 23 + tileNoise(x, y, 2, 81) * 4)), 30) + 0.06 * (tileNoise(x, y, 2, 83, 2, 30) - 0.5);
				return [k, k * 1.01, k * 0.98];
			}, true),
		woodBump: () => picture(128, 128, (x, y) => 0.5 + 0.2 * (tileNoise(x, y, 2, 85, 2, 50) - 0.5)),
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
 * The materials, made once, plain and with their surfaces. `leaf` a leaf's two faces, each its own colour (one-sided):
 * glossy above (a citrus leaf shines), veined; `rind` the fruit, glossy with its oil glands pitted in it; `petal` the
 * thick waxy petals and the stamens, seen from both sides; `bark` the trunk and old limbs, grey and lichened; `wood`
 * the limbs of two to five years; `twig` the green shoots; `body` the seed, the roots and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, specularIntensity: 0.55, clearcoat: 0, ...(s && { map: s('leafMap'), bumpMap: s('leafBump'), bumpScale: 0.25 }) }),
	rind: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.32, ...(s && { map: s('rindMap'), bumpMap: s('rindBump'), bumpScale: 0.9 }) }),
	petal: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.9, 0.9, 0.85), side: THREE.DoubleSide }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, ...(s && { map: s('barkMap'), bumpMap: s('barkBump'), bumpScale: 1.4 }) }),
	wood: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, ...(s && { map: s('woodMap'), bumpMap: s('woodBump'), bumpScale: 0.8 }) }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.48, clearcoat: 0.1, clearcoatRoughness: 0.5 }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'wood', 'twig', 'leaf', 'petal', 'rind', 'prop'];
// an orange has thousands of leaves and flowers: a crowd far off draws a part of them, each grown bigger to fill the gap
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
 * 2. ORGANS — the Tarocco's own, each to its measure (the sweet orange's where the cultivar was not measured)
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet's traces give them */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);

/**
 * The numbers of the organs (data sheet §1, §3–§6), sizes in metres. Colours as linear sRGB traced off the reference
 * sheet's panels (dca75395…, its medians; p10–p90 as each organ's own variation), or from the data sheet's RHS
 * colours where the sheet was wrong.
 */
const OT = {
	seed: { length: 0.0095, width: 0.0062, thick: 0.0042, coat: lin(0.78, 0.72, 0.56), depth: 0.012 }, // sour orange's: club-shaped, wrinkled, cream
	leaf: {
		length: 0.1, // blade 9–11 cm on grown leaves (sweet orange 105 × 48 mm, 'OLL-8'; the sheet's 1.8 : 1)
		width: 0.052,
		petiole: 0.015, // 1–2.5 cm
		wing: 0.0032, // the sweet orange's narrow wing: 13–16 × 2.8–4.8 mm
		stockWing: 0.013, // the sour orange's broad one, on the seedling (the sheet's leaf panels drew this one)
		upper: lin(0.062, 0.105, 0.022), // the sheet's #5c6e35 (lit flat on a light box) darkened toward the data sheet's RHS 137A (#3c5a24)
		under: lin(0.15, 0.2, 0.05), // the data sheet's RHS 137C (#6f8a3c), toward the sheet's #93974c: paler, matt, yellower
		young: lin(0.28, 0.4, 0.07), // the flush: pale lime green, soft, darkening over 4–6 weeks (not red: lemons flush red)
		youngUnder: lin(0.36, 0.46, 0.12),
		old: lin(0.42, 0.34, 0.05), // yellowing before it falls, at two to three years
	},
	flower: {
		petal: 0.021, // 19.5–23 × 8 mm, five, thick, white, curving back
		petalWidth: 0.008,
		white: lin(0.86, 0.85, 0.78),
		glands: lin(0.78, 0.8, 0.6),
		filament: 0.0135, // 20–25 stamens, 13–15 mm, joined at the base in bundles
		anther: lin(0.86, 0.6, 0.06),
		style: 0.009, // 8.9 mm, yellow-green, a capitate yellow stigma
		styleColour: lin(0.42, 0.55, 0.12),
		pedicel: 0.0075,
		calyx: 0.0035, // a small green cup, five short lobes
		green: lin(0.16, 0.26, 0.05),
		bud: 0.0187, // a mature bud 18.7 × 6 mm, an elongated white olive
	},
	fruit: {
		diameter: 0.074, // Tarocco clones 70–86 mm (Scirè 70–78, Gallo 72, Sant'Alfio 78, Meli 84.5); PGI calibre 73/84
		length: 0.076, // L/D 0.96–1.05 measured (Bream 0.91–1.12)
		collar: 0.006, // the "muso": a broad furrowed basal collar, short on Scirè and Gallo, long on Dal Muso [EST height]
		rind: 0.0045, // 3.5–6.6 mm by clone
		stalk: 0.008,
		// colours traced off the sheet's fruit at four ages
		fruitlet: lin(0.117, 0.144, 0.013),
		green: lin(0.068, 0.088, 0.01), // #485116 … #5a6726
		greenLight: lin(0.12, 0.155, 0.025),
		turning: lin(0.38, 0.29, 0.004), // colour break: the green clears to yellow-orange
		yellow: lin(0.42, 0.36, 0.015),
		orange: lin(0.68, 0.16, 0.03), // ripe: neutral orange #d56532 … #d87230
		blush: lin(0.33, 0.035, 0.022), // the garnet-red patches (#a14739 … #b54710 at their deepest)
		calyx: lin(0.14, 0.2, 0.04),
		stalkColour: lin(0.2, 0.24, 0.08),
	},
	bark: {
		shoot: lin(0.11, 0.2, 0.045), // RHS 138A, a hardened shoot
		young: lin(0.16, 0.24, 0.06), // first-year green, angular
		grey: lin(0.13, 0.145, 0.095), // two to five years: grey-green, smooth (RHS 197A)
		old: lin(0.14, 0.135, 0.105), // the trunk: greyed green streaked with brown (#8a8f78 with #5b4a3a), in shade
		stock: lin(0.13, 0.115, 0.09), // the sour-orange shank below the union, a little browner
	},
	root: { young: lin(0.62, 0.42, 0.22), old: lin(0.2, 0.12, 0.06) },
	thorn: { length: [0.006, 0.016], colour: lin(0.12, 0.2, 0.05) },
};

/**
 * The blade's outline: its half width at 20 stations from the base to the tip, as parts of its greatest — traced off
 * the sheet's leaf panel (upper side; the underside the same within 2%), its base taken narrower than the sheet's (a
 * sweet orange's blade is cuneate to the jointed stalk).
 */
const BLADE = [0.06, 0.38, 0.55, 0.68, 0.8, 0.89, 0.95, 0.99, 1.0, 1.0, 0.99, 0.94, 0.88, 0.82, 0.74, 0.61, 0.49, 0.32, 0.16, 0.0];
const bladeAt = (u) => {
	const x = clamp(u) * (BLADE.length - 1);
	const i = Math.min(BLADE.length - 2, Math.floor(x));
	return lerp(BLADE[i], BLADE[i + 1], x - i);
};

/**
 * One leaf: its winged stalk and its blade, built along +X from where the stalk leaves the twig, its face up (+Y),
 * both faces (the paler matt underside its own colour). `size` × the grown leaf; `age` in years from when it unfolded
 * (the flush pale and limp for its first weeks); `life` its whole life in years (yellowing at the end); `stock` a sour
 * orange's (the seedling's broad wing).
 */
function leafGeometry(size, age, life, r, stock = false) {
	const L = OT.leaf.length * size, W = OT.leaf.width * size * about(r, 1, 0.06);
	const P = OT.leaf.petiole * size * about(r, 1, 0.2);
	const wing = (stock ? OT.leaf.stockWing : OT.leaf.wing) * size;
	const grow = smooth(age / 0.06); // it unfolds over about three weeks
	const young = 1 - smooth((age - 0.03) / 0.09);
	const old = smooth((age - life + 0.25) / 0.25);
	const fold = 0.06 + 0.06 * young; // the blade weakly folded along its midrib (conduplicate), more when young
	const droop = 0.05 + 0.18 * young + 0.03 * r(); // a young leaf hangs limp, a grown one sags a little toward its tip
	const wave = 0.012 * r();
	const k = (0.35 + 0.65 * grow);
	const tone = about(r, 1, 0.12);
	const up = OT.leaf.upper.clone().multiplyScalar(tone).lerp(OT.leaf.young, young).lerp(OT.leaf.old, old * 0.85);
	const dn = OT.leaf.under.clone().multiplyScalar(tone).lerp(OT.leaf.youngUnder, young).lerp(OT.leaf.old, old * 0.7);
	// the stations along it: the stalk with its wing, the joint, then the blade (fewer where it is narrow and straight)
	const S = DETAIL.level >= 1 ? [0, 0.1, 0.28, 0.5, 0.72, 0.9] : DETAIL.level >= 0.4 ? [0, 0.3, 0.62, 0.9] : [0, 0.5, 0.92];
	const rows = [{ x: 0, w: wing * 0.4 }];
	for (const u of S) rows.push({ x: (P + u * L) * k, w: (u === 0 ? Math.max(wing * 0.5, bladeAt(0) * W * 0.5) : bladeAt(u) * W * 0.5) * k, u });
	rows.push({ x: (P + L) * k, w: 0, u: 1 });
	const across = DETAIL.level >= 0.4 ? [-1, 0, 1] : [-1, 1];
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let f = 0; f < 2; f++) {
		const base = pos.length / 3;
		const c = f ? dn : up;
		for (const row of rows) {
			const u = row.u ?? 0;
			const s = row.x / ((P + L) * k);
			for (const v of across) {
				const z = v * row.w;
				const y = -droop * s * s * L - fold * Math.abs(z) * (row.u === undefined ? 0 : 1) * 1.6 + wave * Math.sin(u * 9 + v * 2) * W * Math.abs(v) - f * 0.0003;
				pos.push(row.x, y, z);
				nor.push(0, f ? -1 : 1, 0);
				uv.push(u, (v + 1) / 2);
				col.push(c.r, c.g, c.b);
			}
		}
		const n = across.length;
		for (let i = 0; i < rows.length - 1; i++)
			for (let j = 0; j < n - 1; j++) {
				const a = base + i * n + j, b = a + n;
				if (f === 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
				else idx.push(a, b, a + 1, b, b + 1, a + 1);
			}
	}
	const g = made(pos, nor, uv, col, idx, true);
	const nn = g.attributes.normal, half = nn.count / 2;
	for (let i = 0; i < half; i++) nn.setXYZ(half + i, nn.getX(i), nn.getY(i), nn.getZ(i)); // the underside lit as the face above it
	return g;
}

/** a leaf on the plant: its stalk at `at`, pointing along `dir`, its face turned up as far as `dir` lets it, rolled by `roll` */
function leaf(bag, at, dir, roll, size, age, life, r, stock = false) {
	if (age < 0 || age > life) return;
	bag.add('leaf', leafGeometry(size, age, life, r, stock), aim(at, dir, roll));
}

/** a thorn in a leaf's axil: a short green spine, 6–16 mm, mostly on vigorous young shoots */
function thorn(bag, at, dir, length) {
	const tip = at.clone().addScaledVector(dir, length);
	bag.add('twig', tube([at, at.clone().lerp(tip, 0.5), tip], (u) => 0.0011 * (1 - u * 0.92), () => OT.thorn.colour, 4, true));
}

/** the seed: club-shaped, flattened, its cream coat wrinkled along it, its pointed end down */
function seedOf(bag, at, turn, r) {
	const { length, width, thick, coat } = OT.seed;
	const g = new THREE.SphereGeometry(1, fewer(14, 6), fewer(10, 4));
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
		const along = (y + 1) / 2; // 0 the pointed end, 1 the broad
		const club = 0.55 + 0.45 * Math.pow(along, 0.6);
		const wr = 1 + 0.06 * Math.sin(Math.atan2(z, x) * 7 + y * 3);
		p.setXYZ(i, x * width * 0.5 * club * wr, y * length * 0.5, z * thick * 0.5 * club * wr);
	}
	g.computeVertexNormals();
	const c = new Float32Array(p.count * 3);
	for (let i = 0; i < p.count; i++) {
		const k = 0.92 + 0.12 * noise3(p.getX(i) * 900, p.getY(i) * 900, p.getZ(i) * 900, 7);
		c.set([coat.r * k, coat.g * k, coat.b * k], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(c, 3));
	bag.add('body', g, new THREE.Matrix4().compose(at, turn, v3(1, 1, 1)));
}

/* ---- the flower ---- */

/** a petal's outline: oblong, broadest about three fifths out, its tip rounded (the sheet's open flower) */
const petalShape = (u) => (u < 0.62 ? lerp(0.42, 1, Math.sqrt(u / 0.62)) : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.62) / 0.38, 2))));

/**
 * A flower at `at` on its stalk along `dir`: the bud an elongated white olive, swelling; open, five thick waxy petals
 * curving back (3 cm across), the column of stamens with yellow anthers round the green-yellow style and its knob;
 * `fall` 0 … 1 its petals dropping. Petals and stamens are `petal` (seen from both sides), the rest `twig`.
 */
function flower(bag, at, dir, open, fall, r, swell = 1) {
	const F = OT.flower;
	const d = dir.clone().normalize();
	const ped = at.clone().addScaledVector(d, F.pedicel);
	bag.add('twig', tube([at, at.clone().lerp(ped, 0.5).addScaledVector(UP, 0.001), ped], () => 0.0005, () => F.green, 4));
	bag.add('twig', bead(ped.clone().addScaledVector(d, 0.0008), v3(F.calyx, F.calyx * 0.7, F.calyx), F.green, 2, new THREE.Quaternion().setFromUnitVectors(UP, d)));
	if (fall >= 1) return;
	const base = ped.clone().addScaledVector(d, 0.0016);
	if (open < 0.12) {
		// the bud: white, olive-shaped, from 2 mm to 18.7 × 6 mm
		const s = clamp(swell);
		const L = lerp(0.003, F.bud, s), Wd = lerp(0.0022, 0.0058, s);
		const c = mix(lin(0.5, 0.62, 0.25), F.white, smooth(s * 1.6));
		bag.add('petal', bead(base.clone().addScaledVector(d, L * 0.5), v3(Wd * 0.5, L * 0.5, Wd * 0.5), c, 5, new THREE.Quaternion().setFromUnitVectors(UP, d)));
		return;
	}
	const side0 = across(d);
	const spread = lerp(0.15, 1.45, smooth((open - 0.12) / 0.6)) + 0.25 * fall; // from the axis, radians
	const turn0 = r() * Math.PI * 2;
	for (let k = 0; k < 5; k++) {
		if (fall > 0 && chance(r() * 1e9, 'p')() < fall) continue;
		const a = turn0 + (k / 5) * Math.PI * 2 + about(r, 0, 0.12);
		const out = side0.clone().applyAxisAngle(d, a);
		const pd = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(out, Math.sin(spread)).normalize();
		const L = F.petal * about(r, 1, 0.06);
		const g = sheet({
			length: L,
			width: F.petalWidth * 0.5,
			shape: petalShape,
			// cupped across, and its tip curving back
			lift: (u, v) => 0.1 * v * v - 0.22 * Math.pow(u, 2.2) * smooth((open - 0.4) / 0.5),
			paint: (u, v) => mix(F.white, F.glands, 0.25 * Math.pow(u, 3) * (0.5 + 0.5 * Math.cos(v * 9))),
			along: 5,
			across: 2,
		});
		// the petal's inner face (+Y) turned to the flower's front: its frame from its own direction and the flower's axis
		const fy = d.clone().addScaledVector(pd, -d.dot(pd));
		if (fy.lengthSq() < 1e-8) fy.copy(out).multiplyScalar(-1);
		fy.normalize();
		const fz = new THREE.Vector3().crossVectors(pd, fy).normalize();
		const m = new THREE.Matrix4().makeBasis(pd, fy, fz).setPosition(base.clone().addScaledVector(out, 0.0012));
		bag.add('petal', g, m);
	}
	// the stamens, their filaments joined in bundles: a column, and the anthers a yellow ring round its top
	const top = base.clone().addScaledVector(d, F.filament * 0.92);
	const flare = 0.0022 + 0.0016 * smooth(open);
	bag.add('petal', tube([base, base.clone().lerp(top, 0.6), top], (u) => lerp(0.0016, flare, u * u), (u) => mix(F.white, lin(0.85, 0.82, 0.55), u), 7));
	bag.add('petal', tube([top, top.clone().addScaledVector(d, 0.0024)], () => flare + 0.0007, () => F.anther, 7, true));
	// the style and its knob of a stigma, a little above the anthers
	const st = base.clone().addScaledVector(d, F.style + 0.004);
	bag.add('twig', tube([base, st], () => 0.0005, () => F.styleColour, 4));
	bag.add('petal', bead(st, v3(0.0013, 0.0011, 0.0013), lin(0.8, 0.7, 0.12), 2));
}

/* ---- the fruit ---- */

/**
 * The fruit's profile, its width at 21 stations from the stylar end (0) to the stalk (1) as parts of its greatest,
 * measured off the sheet's fruit row (dca75395…, the fruit cut from the ground by its colour): the green one of 4 cm
 * (young: longer, tapering a little toward the stalk) and the ripe one (H/W 1.056: nearly an ellipse, a little
 * narrower at the stalk end, where the collar is).
 */
const PROFILE_GREEN = [0.03, 0.34, 0.6, 0.73, 0.82, 0.89, 0.93, 0.97, 0.99, 1.0, 0.99, 0.98, 0.94, 0.89, 0.83, 0.77, 0.66, 0.53, 0.4, 0.26, 0.05];
const PROFILE_RIPE = [0.06, 0.52, 0.67, 0.77, 0.85, 0.9, 0.94, 0.97, 0.99, 1.0, 1.0, 0.99, 0.97, 0.94, 0.9, 0.86, 0.8, 0.71, 0.61, 0.47, 0.05];
const profileAt = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};
/**
 * The profile as a correction of an ellipse: the traced width over the ellipse's at each station (the ends, where
 * the trace cannot see the curve close, held at their neighbours'), so the lathe closes round at both poles
 */
const ellipseAt = (u) => Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1)));
const correction = (rows) => rows.map((w, i) => {
	const j = clamp(i, 2, rows.length - 3);
	return rows[j] / ellipseAt(j / (rows.length - 1));
});
const CORR_GREEN = correction(PROFILE_GREEN);
const CORR_RIPE = correction(PROFILE_RIPE);

/**
 * The fruit by days from full bloom (data sheet §5: Scirè-sized): its diameter and its length over diameter, from
 * the ovary of 2.6 mm through the June drop at 12–18 mm and the long swelling of phase II to 78 mm in December.
 */
function fruitSize(d) {
	const D = straight(d, [[0, 0.0028], [12, 0.006], [45, 0.015], [75, 0.031], [105, 0.046], [135, 0.058], [165, 0.067], [195, 0.072], [220, 0.074], [275, 0.074]]);
	const aspect = straight(d, [[0, 1.28], [45, 1.2], [105, 1.17], [165, 1.08], [220, 1.05]]); // the sheet's fruit: 1.28, 1.17, 1.065, 1.056
	return { D, L: D * aspect };
}

/**
 * The rind's colour at a place on the fruit, `d` days from bloom: dark glossy green through the summer; colour break
 * from late November, the green clearing first at the stylar end and on the sunny cheek; deep neutral orange by
 * January; then, after weeks of cold nights, patches of garnet red spreading over the sunny side (anthocyanins).
 */
function rindColour(d, u, v, sun, ns, k, q) {
	const F = OT.fruit;
	// q: the place on the fruit as a point on a unit ball, so its patches are round, not stretched along it
	const n = fbm(q.x * 1.6 + ns, q.y * 1.6, q.z * 1.6, 3, ns);
	if (d < 40) return F.fruitlet.clone().lerp(F.greenLight, 0.3 * n);
	const green = F.greenLight.clone().lerp(F.green, smooth((d - 40) / 80)).multiplyScalar(0.9 + 0.2 * n);
	// how far it has turned: by days, the stylar end and the sunny cheek first, in patches
	// the green itself paling to yellow-green as the chlorophyll goes, the orange coming first on the sunny cheek
	green.lerp(lin(0.16, 0.21, 0.022), smooth((d - 165) / 45));
	const turn = clamp((d - 198) / 45 + (sun - 0.5) * 1.1 + (0.5 - u) * 0.2 + (n - 0.5) * 0.45 + (k - 0.5) * 0.2);
	let c = green;
	// green to orange through a narrow band of yellow, so a turning fruit is green with orange patches, as the sheet's
	if (turn > 0) c = turn < 0.5 ? green.lerp(F.yellow, smooth((turn - 0.3) * 5)) : F.yellow.clone().lerp(F.orange, smooth((turn - 0.5) * 3));
	// the blush of a Tarocco: garnet patches on the sunny cheek after the cold nights of January
	const cold = smooth((d - 222) / 50);
	if (cold > 0) {
		// patches, not the whole fruit: about a quarter to a third of the rind, on the sunny cheek, some fruit hardly any
		const wash = fbm(q.x * 2.4 + 9, q.y * 2.4, q.z * 2.4, 3, ns + 5) - 0.5;
		const fleck = fbm(q.x * 14, q.y * 14, q.z * 14, 2, ns + 11) - 0.5;
		const patch = smooth((sun * 0.7 + wash * 1.8 + fleck * 0.9 + (k - 0.5) * 0.6 + (0.5 - u) * 0.3 - 0.35) * 1.5);
		c.lerp(F.blush, cold * patch * 0.8);
	}
	return c;
}

/**
 * One fruit, hanging from `at` along `dir` (its stalk end at `at`), `d` days from bloom: a lathe to its traced
 * profile, its collar furrowed at the stalk end, the stylar end a small round scar, the calyx a green star on its
 * short stalk; the rind pitted with oil glands (a surface in metres). Young ones still carry the style.
 */
function fruit(bag, at, dir, d, sunDir, seedKey, r) {
	const F = OT.fruit;
	const { D, L } = fruitSize(d);
	const ripe = smooth((d - 120) / 100);
	const k = r(); // this fruit's own: how far its colour is ahead, how strong its blush
	const ns = hashText(seedKey) % 997;
	const furrows = 5 + Math.floor(r() * 4);
	const collar = F.collar * smooth((d - 90) / 120) * about(r, 1, 0.5);
	const close = DETAIL.fruit && DETAIL.fruit === seedKey;
	const rings = close ? 48 : DETAIL.level >= 1 ? 14 : Math.max(4, Math.round(14 * DETAIL.level));
	const sides = close ? 64 : DETAIL.level >= 1 ? 16 : Math.max(5, Math.round(16 * DETAIL.level));
	const down = dir.clone().normalize();
	const side = across(down);
	const side2 = new THREE.Vector3().crossVectors(down, side).normalize();
	const stalkEnd = at.clone().addScaledVector(down, F.stalk * (0.4 + 0.6 * smooth(d / 60)));
	bag.add('twig', tube([at, at.clone().lerp(stalkEnd, 0.5), stalkEnd], () => 0.0012 + 0.0012 * ripe, () => F.stalkColour, 5));
	// along the fruit: u 0 at the stylar end (far from the stalk) to 1 at the stalk end
	const top = stalkEnd.clone().addScaledVector(down, 0.0005);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const sunLocal = sunDir.clone();
	for (let i = 0; i <= rings; i++) {
		// rings closer toward the poles, where the rind curves fastest
		const u = (1 - Math.cos((i / rings) * Math.PI)) / 2;
		// the collar: the stalk end drawn out a little into a neck, furrowed
		const neck = smooth((u - 0.8) / 0.2);
		const prof = ellipseAt(u) * lerp(profileAt(CORR_GREEN, u), profileAt(CORR_RIPE, u), ripe);
		const y = (1 - u) * L + neck * neck * collar * 0.5; // distance from the stalk end, down the fruit
		for (let j = 0; j <= sides; j++) {
			const v = j / sides;
			const a = v * Math.PI * 2;
			const radial = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(side2, Math.sin(a));
			let rad = prof * D * 0.5;
			rad *= 1 - 0.18 * neck * ripe * (0.5 + 0.5 * Math.cos(a * furrows + k * 6)) * clamp(collar / F.collar);
			rad *= 1 + 0.012 * (noise3(Math.cos(a) * 2, Math.sin(a) * 2, u * 3, ns) - 0.5);
			if (i === 0 || i === rings) rad = 0;
			const p = top.clone().addScaledVector(down, y).addScaledVector(radial, rad);
			pos.push(p.x, p.y, p.z);
			nor.push(radial.x, radial.y, radial.z);
			uv.push(u * (L / 0.02), v * ((Math.PI * D) / 0.02)); // in metres over the rind's 2 cm tile
			const sun = clamp(radial.dot(sunLocal) * 0.5 + 0.5);
			const sinT = Math.sin((i / rings) * Math.PI);
			const q = v3(Math.cos(a) * sinT, Math.cos((i / rings) * Math.PI), Math.sin(a) * sinT);
			const c = rindColour(d, u, v, sun, ns, k, q);
			if (u < 0.035) c.lerp(lin(0.3, 0.25, 0.08), 0.5); // the stylar scar
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const g = made(pos, nor, uv, col, idx, false);
	g.computeVertexNormals();
	smoothNormals(g);
	bag.add('rind', g);
	// the calyx: a green star, five short lobes, pressed on the stalk end
	const cal = top.clone().addScaledVector(down, 0.0006);
	bag.add('twig', bead(cal, v3(0.0045 + 0.002 * ripe, 0.0012, 0.0045 + 0.002 * ripe), F.calyx, 4, new THREE.Quaternion().setFromUnitVectors(UP, down)));
	// the style, still on the young fruitlet, falling by the June drop
	if (d < 40) {
		const tip = top.clone().addScaledVector(down, L + 0.006 * (1 - d / 40));
		bag.add('twig', tube([top.clone().addScaledVector(down, L), tip], () => 0.0005, () => OT.flower.styleColour, 4, true));
	}
	return { D, L };
}

/* ================================================================================================================
 * 3. THE TREE — the seedling, the bud, the nursery whip, and the tree in the grove flush by flush
 * ============================================================================================================== */

const YEAR = 365;
/** days since the first of January of the year the rootstock's seed was sown (on the first of March) */
const dayOf = (t) => t * YEAR + 59;
const tOf = (day) => (day - 59) / YEAR;

/**
 * How the tree is grown, in numbers (data sheet §1, §2, §7). A sour-orange seedling, trained to one stem, budded with
 * Tarocco 18 cm up in its second spring; the stock cut back above the bud; the Tarocco shoot staked; planted in May of
 * its third year with its head cut at 62 cm, three or four scaffolds left from 25–30 cm above the union. Then flushes:
 * spring (February to May, short shoots, and the bloom on them), summer (June to August, the longest) and autumn
 * (late August to October), measured on young Tarocco in Sardinia; each shoot stops when its tip aborts, and the next
 * flush breaks from the buds just below it.
 */
const GROVE = {
	union: 0.18, // the bud set 15–20 cm above the soil
	budded: 1.08, // its second April
	pushes: 1.16, // the bud breaks once the stock is lopped
	stockCut: 1.22, // the stock cut back 6–8 weeks after budding
	planted: 2.2, // May of its third year: a whip of about 1 m, headed
	head: 0.62, // the head cut, above the soil
	scaffoldFrom: 0.43, // the scaffolds 25–30 cm above the union
	scaffoldTo: 0.58,
	// the crown's envelope by years from planting (height, width; data sheet §2: 3.4–3.6 × 3.0–3.2 m at 7 years,
	// the sheet's 1.8 m at 4 years; Scirè's 4.7–10 m³ at ~6)
	height: [[0, 0.95], [1, 1.25], [2, 1.55], [4, 2.15], [6, 3.0], [8, 3.6], [12, 4.3], [20, 4.8]],
	width: [[0, 0.42], [1, 0.75], [2, 1.05], [4, 1.75], [6, 2.5], [8, 3.1], [12, 3.9], [20, 4.8]],
	// the trunk's diameter 30 cm above the union (data sheet §2: 10–11 cm at 7 years, Scirè 9.8–13.3 cm at ~6)
	trunk: [[-1, 0.006], [0, 0.013], [2, 0.034], [4, 0.068], [6, 0.1], [8, 0.125], [12, 0.165], [20, 0.23]],
	skirt: 0.36, // a grown tree's lowest leaves, above the soil
	flushes: [
		{ day: 48, len: 0.5, name: 'spring' },
		{ day: 160, len: 1, name: 'summer' },
		{ day: 243, len: 0.62, name: 'autumn' },
	],
	flushDays: 32, // a shoot grows out in about a month
	shoot: 0.44, // the longest summer shoot of a young vigorous tree (m)
	life: [2, 3], // years a leaf lives
	bloom: 128, // full bloom, 8 May (late April – May in Sicily)
	firstBloom: 1.9, // years from planting: first flowers in its third spring in the grove
	tip: 0.0016, // a shoot's radius at its tip
};

/** the time a flush starts: `f` counts flushes from the first January of the sowing year (three a year) */
const flushStart = (f) => tOf(Math.floor(f / 3) * YEAR + GROVE.flushes[f % 3].day);
/** the flush running at or last started before t */
function flushAt(t) {
	const day = dayOf(t);
	const y = Math.floor(day / YEAR);
	let f = y * 3 - 1;
	for (let k = 0; k < 3; k++) if (day - y * YEAR >= GROVE.flushes[k].day) f = y * 3 + k;
	return f;
}

/** the crown's envelope at `a` years from planting: a dome on the trunk, its skirt near the ground */
function envelope(a) {
	const H = table(a, GROVE.height), W = table(a, GROVE.width);
	const bottom = lerp(GROVE.head - 0.08, GROVE.skirt, clamp(a / 3));
	// widest at about two fifths of its height: a dome on a short skirt
	const cy = bottom + (H - bottom) * lerp(0.5, 0.4, clamp(a / 4));
	return { cy, ry: H - cy, ryLow: cy - bottom, rx: W * 0.5, H, W, bottom };
}
/** where a point is in an envelope: 0 at its centre, 1 on its surface; the top flatter than the bottom (a dome) */
function inEnvelope(p, e) {
	const y = (p.y - e.cy) / (p.y > e.cy ? e.ry : e.ryLow);
	const h = Math.hypot(p.x, p.z) / e.rx;
	return Math.sqrt(h * h + y * y);
}

/** the way out of the crown at a point: the normal of the envelope's shell through it (up at the top, out and down at the skirt) */
function outOf(p, e) {
	const ry = p.y > e.cy ? e.ry : e.ryLow;
	const n = v3(p.x / (e.rx * e.rx), (p.y - e.cy) / (ry * ry), p.z / (e.rx * e.rx));
	if (n.lengthSq() < 1e-9) return v3(0, 1, 0);
	return n.normalize();
}

/**
 * The shoots of the tree in the grove up to time t, flush by flush, oldest first: each a shoot unit (one flush's
 * growth, its tip aborted when it stops), born at a flush, its vigour handed down from the shoot it broke from, its
 * length clipped to the crown's envelope as the grower keeps it, kept out of space already crowded by younger shoots
 * (a light competition), its own chance by its path. Every decision rests on shoots of earlier flushes, so the tree at
 * an earlier time is the first part of the tree at a later one.
 */
function shoots(seed, t, trunkTop) {
	const all = [];
	if (t < GROVE.planted) return all;
	const pending = new Map();
	const later = (f, spec) => {
		if (!pending.has(f)) pending.set(f, []);
		pending.get(f).push(spec);
	};
	const crowd = new Map();
	const CELL = 0.16;
	const cellOf = (p) => `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)},${Math.floor(p.z / CELL)}`;
	const crowded = (p, tb) => {
		let n = 0;
		for (const born of crowd.get(cellOf(p)) ?? []) if (born > tb - 1.6) n++;
		return n;
	};
	// the scaffolds, from the first flush after planting
	const f0 = flushAt(GROVE.planted) + 1;
	const rs = chance(seed, 'scaffolds');
	const nScaffolds = rs() < 0.45 ? 4 : 3;
	const turn0 = rs() * Math.PI * 2;
	for (let i = 0; i < nScaffolds; i++) {
		const h = lerp(GROVE.scaffoldFrom, GROVE.scaffoldTo, (i + about(rs, 0.5, 0.3)) / nScaffolds);
		const a = turn0 + (i / nScaffolds) * Math.PI * 2 + about(rs, 0, 0.3);
		const tilt = about(rs, 0.72, 0.12); // 35–50° from upright
		const dir = v3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
		later(f0, { key: ['s', i], from: v3(trunkTop.x, h, trunkTop.z), dir, vig: about(rs, 1, 0.08), order: 1, parent: null, h });
	}
	const last = flushAt(t);
	for (let f = f0; f <= last; f++) {
		const list = pending.get(f);
		if (!list) continue;
		const fl = GROVE.flushes[f % 3];
		const tf = flushStart(f);
		for (const spec of list) {
			const r = chance(seed, 'su', ...spec.key);
			const tb = tf + r() * 0.035; // within the flush, each shoot a little earlier or later
			if (t < tb) continue;
			const a = tb - GROVE.planted;
			const env = envelope(a + 0.35);
			let L = GROVE.shoot * spec.vig * fl.len * about(r, 1, 0.22);
			// the inflorescences of the spring flush: short shoots, leafy or leafless, ending in flowers
			const yearsIn = a;
			const bloomYear = f % 3 === 0 && yearsIn >= GROVE.firstBloom - 0.3;
			let flowers = 0, leafless = false;
			if (bloomYear && spec.order > 1) {
				const pf = spec.vig < 0.55 ? 0.85 : 0.25;
				if (r() < pf) {
					leafless = spec.vig < 0.32 && r() < 0.55;
					flowers = leafless ? 2 + Math.floor(r() * 5) : 1 + Math.floor(r() * 3);
					L = leafless ? between(r, 0.015, 0.045) : Math.min(L, between(r, 0.06, 0.16));
				}
			}
			// a grown tree's crown is full: fewer of its buds break into leafy shoots than a young one's (not its flowers)
			if (spec.order > 1 && !flowers && !spec.waited && r() < 0.35 * clamp((a - 4.5) / 3)) continue;
			// the shoot bends a little up toward the light as it grows, and out from the crown's middle
			const out = spec.from.clone().setY(0);
			if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
			out.normalize();
			const dir = spec.dir.clone().normalize();
			// clipped to the envelope: the grower keeps the crown in its dome, hedged where it meets the next tree
			// how high in the crown it starts: 0 at the skirt, 1 at the top; low shoots arch out and down, high ones rise
			const hf = clamp((spec.from.y - env.bottom) / Math.max(0.1, env.H - env.bottom));
			const rise = lerp(-0.1, 0.12, hf);
			const nrm = outOf(spec.from, env);
			const tipAt = (len) => {
				const d2 = dir.clone().addScaledVector(nrm, 0.25).normalize();
				return spec.from.clone().addScaledVector(dir, len * 0.5).addScaledVector(d2, len * 0.5);
			};
			if (spec.order > 1 && inEnvelope(tipAt(L), env) > 1) {
				let lo = 0, hi = L;
				for (let k = 0; k < 7; k++) {
					const mid = (lo + hi) / 2;
					if (inEnvelope(tipAt(mid), env) > 1) hi = mid;
					else lo = mid;
				}
				L = lo;
				if (L < 0.03) {
					// no room yet: the bud waits for the crown to grow round it, a flush or a few
					if ((spec.waited ?? 0) < 4) later(f + 1, { ...spec, waited: (spec.waited ?? 0) + 1 });
					continue;
				}
			}
			if (spec.from.y + 0.02 < 0.25 && dir.y < 0) continue; // nothing grows into the ground
			const tip = tipAt(L);
			if (tip.y < GROVE.skirt * 0.85) continue;
			// crowded: the space at its tip already holds enough young shoots
			if (spec.order > 1 && crowded(tip, tb) >= (flowers ? 3 : 2) + Math.round(2 * clamp(1 - a / 6))) continue; // a young tree's crown is denser
			// how deep in the crown its tip is, in metres from the envelope's surface: more than half a metre in, the shade
			const depthM = Math.max(0, 1 - inEnvelope(tip, env)) * Math.min(env.rx, env.ry, env.ryLow * 1.5);
			const su = { key: spec.key, born: tb, f, L, dir, from: spec.from.clone(), tip, order: spec.order, vig: spec.vig, parent: spec.parent, kids: [], flowers, leafless, depth: depthM, shade: clamp((depthM - 0.3) / 0.5), h: spec.h };
			su.grown = span(t - tb, 0, GROVE.flushDays / YEAR);
			// its path: a gentle curve, the young shoot up toward the light
			const n = Math.max(2, Math.min(6, Math.round(L / 0.05) + 1));
			su.pts = [];
			for (let i = 0; i <= n; i++) {
				const s = (i / n) * L * su.grown;
				const p = spec.from.clone().addScaledVector(dir, s);
				const bend = (s / Math.max(1e-6, L)) ** 2 * L * 0.5;
				p.addScaledVector(nrm, 0.25 * bend);
				su.pts.push(p);
			}
			all.push(su);
			if (spec.parent) spec.parent.kids.push(su);
			const key = cellOf(tip);
			if (!crowd.has(key)) crowd.set(key, []);
			crowd.get(key).push(tb);
			if (flowers && leafless) continue; // a leafless inflorescence ends there
			const light = 1 - su.shade;
			// a year or two on, a bud further back along it may break too, where the light reaches: so the crown's shell,
			// down to its skirt, keeps its young shoots as the older ones shed their leaves
			if (spec.order > 1 && r() < 0.32 * light) {
				const s = between(r, 0.25, 0.85) * L;
				const at = spec.from.clone().addScaledVector(dir, s);
				const side = across(dir).applyAxisAngle(dir, r() * Math.PI * 2);
				const nrm2 = outOf(at, env);
				const d = side.clone().addScaledVector(nrm2, 0.9).addScaledVector(dir, 0.3).normalize();
				later(f + 3 + Math.floor(r() * 4), { key: [...spec.key, f, 'r'], from: at, dir: d, vig: about(r, 0.38, 0.1) + 0.2 * light, order: spec.order + 1, parent: su });
			}
			// when it breaks again: soon if vigorous, later or never if weak or deep in the shade
			const pNext = Math.min(0.95, (0.38 + 0.5 * spec.vig) * (0.3 + 0.7 * light) * (1 + 0.45 * clamp(1 - a / 6)));
			let fc = null;
			if (r() < pNext) fc = f + 1;
			else if (r() < 0.55 * light + 0.1) fc = f + 2;
			else if (r() < 0.4 * light) fc = f + 3 + Math.floor(r() * 2);
			if (fc === null) continue;
			// how many: the vigorous two or three, the weak one; the first goes on as the leader of its axis
			const nk = spec.vig > 0.5 ? 2 + (r() < 0.5 ? 1 : 0) : spec.vig > 0.22 ? 1 + (r() < 0.65 ? 1 : 0) : 1 + (r() < 0.3 ? 1 : 0);
			const ang0 = r() * Math.PI * 2;
			for (let k = 0; k < nk; k++) {
				const lead = k === 0;
				const top = tip.y > env.cy;
				// a shoot of the crown's top keeps its vigour (the light), one on its side less, one inside little
				let v = spec.vig * (lead ? about(r, 0.86, 0.08) : about(r, 0.6, 0.12));
				v *= 0.75 + 0.35 * light + (top ? 0.1 : 0);
				// a leader with room before it to the crown's shell grows on strongly into it, as the tree fills its space
				if (lead) v = Math.max(v, 0.22 + 0.85 * clamp(su.depth / 0.7) * (tip.y > env.cy ? 1 : 0.6));
				v = Math.min(1.05, v);
				// in an older tree the shoots are shorter (the crown full)
				v *= 1 - 0.04 * clamp(a - 5, 0, 10) * (lead ? 0.5 : 1);
				if (v < 0.1) continue;
				const side = across(dir).applyAxisAngle(dir, ang0 + k * 2.4);
				const angle = lead ? about(r, 0.2, 0.12) : about(r, 0.75, 0.2);
				let d = dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
				// toward the crown's shell, where the light is: along its normal through the tip
				d.addScaledVector(outOf(tip, env), lead ? 0.6 : 0.5);
				// and the vigorous ones upright (the crown's leaders and its water sprouts), the weak ones as they lie
				const ht = clamp((tip.y - env.bottom) / Math.max(0.1, env.H - env.bottom));
				const upright = clamp((v - 0.2) / 0.5) * (lead ? lerp(0.2, 1, smooth((ht - 0.15) / 0.45)) : smooth((ht - 0.25) / 0.3));
				d.add(v3(0, (lead ? 0.9 : 0.55) * upright, 0));
				// high in the crown the strong shoots lean in over its middle, closing the dome's top
				d.addScaledVector(out, -0.6 * upright * smooth((ht - 0.3) / 0.3));
				// low in it the side shoots arch out and down, the skirt hanging to near the ground
				if (!lead) d.add(v3(0, -0.55 * (1 - smooth(ht / 0.55)), 0)).addScaledVector(out, 0.3 * (1 - smooth(ht / 0.55)));
				d.normalize();
				const back = Math.min(L * 0.15, 0.02) * (lead ? 0 : 1);
				const from = tip.clone().addScaledVector(dir, -back);
				later(fc, { key: [...spec.key, f, k], from, dir: d, vig: v, order: spec.order + 1, parent: su });
			}
		}
		pending.delete(f);
	}
	return all;
}

/**
 * How thick the wood is: the pipe model (r^2.5 summed over what a place carries) plus a ring a year, then the whole
 * tree scaled so its trunk keeps the diameters measured by age (GROVE.trunk).
 */
const PIPE = 2.5;
function thicken(list, t) {
	for (let i = list.length - 1; i >= 0; i--) {
		const su = list[i];
		let q = Math.pow(GROVE.tip, PIPE) * (su.leafless ? 0.5 : 1) + 2.4e-8 * su.L;
		for (const k of su.kids) q += k.q;
		su.q = q;
		const age = Math.max(0, t - su.born);
		su.r0 = Math.pow(q, 1 / PIPE) * (1 + 0.16 * age);
	}
}

/** the colour of the bark of wood `age` years old and `r` metres thick, at a place round it */
function barkColour(age, r, v, s, ns) {
	const B = OT.bark;
	if (age < 0.08) return B.young.clone();
	const c = B.young.clone().lerp(B.shoot, smooth(age / 0.4)).lerp(B.grey, smooth((age - 0.8) / 2.2));
	c.lerp(B.old, smooth((r - 0.02) / 0.04));
	// a fine streaked unevenness along the wood
	const n = noise3(Math.cos(v * 6.283) * 2, Math.sin(v * 6.283) * 2, s * 18, ns);
	return c.multiplyScalar(0.92 + 0.16 * n);
}

/**
 * A run of wood drawn as one tube: the points, the radius at each, the age of the wood at each. Green and angular
 * (three ridges) in its first months, grey-green, then grey with lichen; `kind` by how thick it is.
 */
function woodTube(bag, pts, radii, ages, ns, opts = {}) {
	const n = pts.length;
	if (n < 2) return;
	const L = lengths(pts);
	const total = L[n - 1];
	if (total < 1e-4) return;
	const at = (arr, s) => {
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		return lerp(arr[i - 1], arr[i], clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1])));
	};
	const R0 = Math.max(...radii);
	const step = R0 > 0.02 ? clamp(R0 * 0.35, 0.008, 0.04) : R0 > 0.006 ? 0.04 : 0.08;
	const count = Math.max(1, Math.ceil(total / step));
	const rp = [];
	for (let k = 0; k <= count; k++) {
		const s = (k / count) * total;
		let i = 1;
		while (i < n - 1 && L[i] < s) i++;
		rp.push(pts[i - 1].clone().lerp(pts[i], clamp((s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]))));
	}
	const sides = Math.round(clamp(R0 * 900, R0 < 0.003 ? 3 : 5, 40));
	const radius = (u, v, s) => {
		let r = at(radii, s);
		const age = at(ages, s);
		if (age < 0.5) r *= 1 + 0.16 * (1 - age / 0.5) * Math.cos(v * Math.PI * 6); // three ridges down from each leaf base
		if (opts.radius) r = opts.radius(r, u, v, s);
		return r;
	};
	const paint = (u, v, s) => {
		const c = barkColour(at(ages, s), at(radii, s), v, s, ns);
		return opts.paint ? opts.paint(c, u, v, s) : c;
	};
	const kind = R0 > 0.022 ? 'bark' : R0 > 0.005 ? 'wood' : 'twig';
	const g = tube(rp, radius, paint, sides, true);
	if (kind !== 'twig') metric(g, total / 0.2, (2 * Math.PI * R0) / 0.2);
	bag.add(kind, g);
}

/** the place and direction at `s` metres along a path */
function lengths(pts) {
	const l = [0];
	for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return l;
}
function pointOn(pts, s) {
	const L = lengths(pts);
	const x = clamp(s, 0, L[L.length - 1]);
	let i = 1;
	while (i < L.length - 1 && L[i] < x) i++;
	const k = (x - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
	return { at: pts[i - 1].clone().lerp(pts[i], k), dir: pts[i].clone().sub(pts[i - 1]).normalize() };
}

/** the roots: a taproot and spreading laterals, the feeders mostly in the top 60 cm (sour orange: deep-rooted) */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	const age = clamp(t / 10);
	root(bag, {
		seed, key: ['tap'], from: base.clone(), dir: v3(0.04, -1, 0.03),
		length: 1.3,
		grown: table(t, [[0.02, 0], [0.045, 0.02], [0.25, 0.12], [1, 0.3], [2.2, 0.45], [5, 0.8], [10, 1]]),
		radius: 0.0008 + 0.045 * span(t, 0.3, 12), down: 0.03, wander: 0.1, laterals: 8, lateral: 0.3, depth: 2,
		age: span(t, 0.2, 4), young: OT.root.young, old: OT.root.old,
	});
	const count = t < 0.5 ? 4 : 10;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.06 + i * 0.12;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed, key: ['lateral', i],
			from: base.clone().add(v3(0, -0.01 - rr() * 0.12 * clamp(t), 0)),
			dir: v3(Math.cos(bear), -0.1 - rr() * 0.15, Math.sin(bear)),
			length: between(rr, 1.2, 2.2) * lerp(0.35, 1, age),
			grown: (t - born) / 6,
			radius: 0.0006 + 0.03 * span(t, born + 0.4, 12) * between(rr, 0.6, 1),
			down: 0.014, wander: 0.15, laterals: 6, lateral: 0.32, depth: 2, taper: 0.8,
			age: (t - born - 0.4) / 4, young: OT.root.young, old: OT.root.old, floor: -0.6,
		});
	}
}

/** a leaf's own life: when it unfolded on its shoot and how long it lives (two to three years, less in deep shade) */
function leafLife(r, shade) {
	return between(r, GROVE.life[0], GROVE.life[1]) * (1 - 0.5 * shade);
}

/**
 * The leaves along one stretch of stem: a node every `internode`, 3/8 of a turn between them, each leaf on its stalk
 * angled out and turned up to the light, its age from when that node grew.
 */
function leavesAlong(bag, seed, key, pts, born, grown, t, size, opts = {}) {
	const L = lengths(pts);
	const total = L[L.length - 1];
	if (total < 0.004) return;
	const internode = opts.internode ?? 0.028;
	const r0 = chance(seed, 'phyllo', ...key);
	const phase = r0() * Math.PI * 2;
	const n = Math.floor((opts.length ?? total) / internode);
	for (let i = opts.skip ?? 0; i < n; i++) {
		const s = (i + 0.6) * internode;
		if (s > total) break;
		const r = chance(seed, 'leaf', ...key, i);
		const formed = opts.formed ? opts.formed(s) : born + (s / Math.max(total, 1e-4)) * (GROVE.flushDays / YEAR) * 0.8;
		const life = opts.life ? opts.life(r) : leafLife(r, opts.shade ?? 0);
		const age = t - formed;
		if (age < 0 || age > life) {
			r();
			continue;
		}
		const { at, dir } = pointOn(pts, s);
		const bearing = phase + i * 2.356; // 3/8 of a turn
		const side = across(dir).applyAxisAngle(dir, bearing);
		const out = opts.out ?? v3(0, 0, 0);
		const petiole = dir.clone().multiplyScalar(0.55).addScaledVector(side, 0.85).addScaledVector(out, 0.35).add(v3(0, 0.25 + 0.15 * r(), 0)).normalize();
		const roll = about(r, 0, 0.35) + (side.y < -0.3 ? 0.4 * Math.sign(r() - 0.5) : 0);
		const sz = size * (opts.small && i < 2 ? 0.55 + 0.2 * i : 1) * about(r, 1, 0.1);
		leaf(bag, at.clone().addScaledVector(side, 0.001), petiole, roll, sz, age, life, r, opts.stock);
		if (opts.thorns && r() < opts.thorns) thorn(bag, at.clone().addScaledVector(side, 0.001), side.clone().addScaledVector(dir, 0.6).normalize(), between(r, OT.thorn.length[0], OT.thorn.length[1]));
	}
}

/** the sour-orange seedling's height (m) by t: up 16 days after sowing, trained to one stem, pencil-thick by budding */
const STOCK_H = [[0.042, 0], [0.06, 0.012], [0.12, 0.045], [0.25, 0.12], [0.6, 0.26], [1.0, 0.44], [1.1, 0.47]];
/** the Tarocco shoot's length above the union by t: from the bud to a staked whip of about 1 m */
const SCION_H = [[GROVE.pushes, 0], [1.22, 0.05], [1.4, 0.3], [1.65, 0.52], [2.0, 0.72], [2.2, 0.82]];
/** when a stem (by a height table) reached `h`: the time its node there grew */
const reached = (rows, h) => {
	let lo = rows[0][0], hi = rows[rows.length - 1][0];
	if (table(hi, rows) < h) return hi;
	for (let k = 0; k < 24; k++) {
		const mid = (lo + hi) / 2;
		if (table(mid, rows) < h) lo = mid;
		else hi = mid;
	}
	return hi;
};

/**
 * The whole tree at time t (years from sowing the rootstock's seed): the seed, the roots, the sour-orange stock, the
 * Tarocco budded on it, the trunk, the crown flush by flush, its leaves, the bloom, the fruit from set to ripe.
 */
function orangeTree(t, seed) {
	const bag = new Bag();
	const space = bag.space;
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	const ns = hashText(seed) % 997;
	const depth = OT.seed.depth;
	const crown = v3(0, -depth, 0);
	const rlean = chance(seed, 'lean');
	const lean = v3(about(rlean, 0, 0.02), 0, about(rlean, 0, 0.02));

	// the seed: sown 12 mm deep; hypogeal, it stays in the soil, its seed leaves inside it
	if (t < 0.7) {
		const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.8, Math.PI * 0.85));
		lite(t > 0.2 ? { level: Math.min(DETAIL.level, 0.5) } : {}, () => seedOf(bag, crown.clone().add(v3(0.002, -0.002, 0)), turn, chance(seed, 'seed')));
	}
	if (t < 0.035) {
		if (t > 0.02) root(bag, { seed, key: ['radicle'], from: crown.clone().add(v3(0, -0.006, 0)), dir: v3(0.1, -1, 0), length: 0.03, grown: span(t, 0.02, 0.035), radius: 0.0006, down: 0.05, wander: 0.05, laterals: 0, depth: 0, young: OT.root.young, old: OT.root.old });
		return bag.build();
	}
	roots(bag, seed, t, crown.clone().add(v3(0, -0.004, 0)));

	// ---- the stem: the stock below the union, the Tarocco above it ----
	const a = t - GROVE.planted; // years in the grove
	const trunkD = table(a, GROVE.trunk);
	const stockTop = t < GROVE.stockCut ? table(t, STOCK_H) : GROVE.union + 0.025;
	const scion = t < GROVE.pushes ? 0 : t < GROVE.planted ? table(t, SCION_H) : GROVE.head - GROVE.union;
	const rs = chance(seed, 'stem');
	const stockPts = [];
	const stockLen = stockTop + depth;
	const nStock = Math.max(3, Math.ceil(stockLen / 0.03));
	for (let i = 0; i <= nStock; i++) {
		const s = (i / nStock) * stockLen;
		stockPts.push(crown.clone().add(v3(0.004 * Math.sin(s * 9 + 1), s, 0.003 * Math.cos(s * 7)).addScaledVector(lean, s)));
	}
	// germinating: the top of the young stem bent over in a hook as it comes up through the soil
	const hook = 1 - span(t, 0.05, 0.085);
	if (hook > 0 && stockPts.length > 2) {
		const L = lengths(stockPts);
		const total = L[L.length - 1];
		const Lh = Math.min(0.012, total * 0.5), s0 = total - Lh;
		const piv = pointOn(stockPts, s0);
		const Rc = Lh / (hook * Math.PI * 0.9);
		for (let i = 0; i < stockPts.length; i++) {
			if (L[i] <= s0) continue;
			const ang = (L[i] - s0) / Rc;
			stockPts[i].copy(piv.at).addScaledVector(piv.dir, Rc * Math.sin(ang)).addScaledVector(v3(1, 0, 0.3).normalize(), Rc * (1 - Math.cos(ang)));
		}
	}
	// the stock's own radius: a thread at germination, pencil-thick (6–10 mm) by budding; after it, the trunk's
	const stockR = (s) => {
		const h = s - depth;
		if (t < GROVE.pushes) return lerp(0.0009, 0.0042, span(t, 0.05, 1.05)) * (1 - 0.45 * clamp(h / Math.max(0.05, stockTop)));
		const below = t < GROVE.planted ? lerp(0.0042, 0.0062, span(t, 1.1, 2.2)) : trunkD * 0.5 * 0.97;
		// the root collar flares into the roots; the stock a little narrower than the Tarocco above the union
		const flare = 1 + 0.4 * clamp(a / 6) * Math.exp(-Math.max(0, h + 0.02) / 0.07);
		const stub = h > GROVE.union + 0.005 ? lerp(1, 0.75, clamp((h - GROVE.union) / 0.03)) : 1;
		return below * flare * stub;
	};
	const stockAge = (s) => Math.max(0, t - reached(STOCK_H, Math.max(0, s - depth)));
	woodTube(bag, stockPts, stockPts.map((_, i) => stockR(lengths(stockPts)[i])), stockPts.map((_, i) => stockAge(lengths(stockPts)[i])), ns, {
		paint: (c, u, v, s) => {
			const h = s - depth;
			if (h < 0) return c.lerp(lin(0.75, 0.68, 0.5), clamp(-h / 0.01) * (1 - clamp(t / 0.6))); // pale under the soil
			return t > GROVE.planted ? c.lerp(OT.bark.stock, 0.6) : c;
		},
	});
	// the stock's leaves (a sour orange's: their stalks broadly winged), stripped below the bud, gone when it is cut back
	if (t < GROVE.stockCut) {
		const L = lengths(stockPts);
		leavesAlong(bag, seed, ['stock'], stockPts, 0, 1, t, 0.62, {
			internode: 0.014, skip: Math.ceil((depth + 0.012) / 0.014), stock: true, small: true, thorns: 0.25,
			life: (r) => (t > GROVE.budded ? 0 : 3),
			formed: (s) => reached(STOCK_H, s - depth),
			out: v3(0, 0, 0),
		});
		void L;
	}
	if (t < GROVE.pushes) return finish(bag);

	// the Tarocco: from the bud on the stock's side, staked upright; headed at planting
	const union = v3(0.004, GROVE.union, 0).addScaledVector(lean, GROVE.union + depth);
	const scionPts = [union.clone()];
	const nS = Math.max(2, Math.ceil(scion / 0.04));
	for (let i = 1; i <= nS; i++) {
		const s = (i / nS) * scion;
		scionPts.push(union.clone().add(v3(0.004 * Math.sin(s * 5 + 2) + 0.006 * smooth(s / 0.06), s, 0.004 * Math.cos(s * 4))).addScaledVector(lean, s));
	}
	const trunkTop = scionPts[scionPts.length - 1];
	const scionAge = (s) => (t < GROVE.planted ? Math.max(0, t - reached(SCION_H, s)) : t - GROVE.pushes);
	const SL = lengths(scionPts);
	// the trunk's radius: the whip's, then the measured trunk (GROVE.trunk) tapering little to the head
	const trunkR = (s) => {
		if (t < GROVE.planted) return lerp(0.0045, 0.0013, clamp(s / Math.max(0.05, scion))) * lerp(0.4, 1.25, span(t, GROVE.pushes, GROVE.planted)) + 0.0004;
		const top = clamp(s / scion);
		const union0 = s < 0.02 ? 1.04 + 0.04 * Math.exp(-s / 0.008) : 1; // the bud union: a slight bench
		return trunkD * 0.5 * lerp(1.02, 0.86, top) * union0;
	};
	woodTube(bag, scionPts, SL.map((s) => trunkR(s)), SL.map((s) => scionAge(s)), ns + 3, {
		radius: (r, u, v, s) => r * (1 + 0.04 * clamp(a / 6) * (noise3(Math.cos(v * 6.283) * 1.5, Math.sin(v * 6.283) * 1.5, s * 6, ns) - 0.5)),
	});
	if (t < GROVE.planted + 1.5) {
		// the leaves of the whip, a few lasting on the trunk after it is headed
		leavesAlong(bag, seed, ['whip'], scionPts, GROVE.pushes, 1, t, 0.85, {
			internode: 0.026, skip: 1, thorns: 0.3, small: true,
			life: (r) => (t >= GROVE.planted ? between(r, 0.3, 2.6) : 3),
			formed: (s) => reached(SCION_H, s),
		});
		// a bamboo cane the whip is tied to, kept the first year in the grove
		const cane = 1.05;
		if (t < GROVE.planted + 1) bag.add('prop', tube([v3(-0.012, -0.15, 0.006), v3(-0.012, cane - 0.15, 0.006)], (u) => 0.0055 * (1 - 0.25 * u), (u, v, s) => lin(0.5, 0.4, 0.2).multiplyScalar(0.9 + 0.2 * Math.pow(Math.abs(Math.cos(s * 18)), 30)), 6, true));
	}
	if (t < GROVE.planted) {
		// the nursery whip's leaves form as it grows: their time from the height table
		return finish(bag);
	}

	// ---- the crown, flush by flush ----
	const list = shoots(seed, t, trunkTop);
	thicken(list, t);
	const scaffolds = list.filter((s) => !s.parent);
	const raw = Math.pow(scaffolds.reduce((q, s) => q + s.q, 0), 1 / PIPE) * (1 + 0.16 * Math.max(0, a));
	const k = (trunkD * 0.5 * 0.86) / Math.max(1e-6, raw);
	for (const su of list) su.r = Math.max(GROVE.tip, su.r0 * k);
	// the wood: each axis drawn as one tube, a shoot and the leader it went on into
	for (const su of list) {
		if (su.parent && su.parent.kids[0] === su) continue; // drawn with its parent's axis
		const pts = [], radii = [], ages = [];
		let s = su;
		while (s) {
			const next = s.kids[0];
			const rTip = next ? next.r : Math.max(GROVE.tip, s.r * 0.5);
			const P = s.pts;
			for (let i = pts.length ? 1 : 0; i < P.length; i++) {
				pts.push(P[i]);
				radii.push(lerp(s.r, rTip, i / (P.length - 1)));
				ages.push(t - s.born - (i / (P.length - 1)) * 0.02);
			}
			s = next && s.grown >= 1 ? next : null;
		}
		const collar = su.parent ? (r, u, v, sm) => r * (1 + 0.3 * Math.exp(-sm / (su.r * 3 + 1e-3))) : null;
		woodTube(bag, pts, radii, ages, ns + 7, collar ? { radius: collar } : {});
		if (radii[0] > 0.004) space.rod(pts, (u) => lerp(radii[0], radii[radii.length - 1], u) + 0.002);
	}

	// ---- flowers and fruit first, then the leaves ----
	const day = dayOf(t);
	let nFruit = 0, nFlowers = 0;
	for (const su of list) {
		if (!su.flowers) continue;
		const year = Math.floor(su.f / 3); // the calendar year of its spring flush
		const bloomDay = year * YEAR + GROVE.bloom;
		const rf = chance(seed, 'inflorescence', ...su.key);
		const tipP = su.pts[su.pts.length - 1];
		const tipDir = su.pts[su.pts.length - 1].clone().sub(su.pts[su.pts.length - 2]).normalize();
		// which of its flowers sets and stays to ripen: about one in three leafy inflorescences, fewer leafless
		const keeper = rf() < (su.leafless ? 0.36 : su.flowers === 1 ? 0.8 : 0.66) ? Math.floor(rf() * su.flowers) : -1;
		for (let i = 0; i < su.flowers; i++) {
			const r = chance(seed, 'flower', ...su.key, i);
			const opens = bloomDay + about(r, 0, 9) + (su.leafless ? -4 : 2);
			const d = day - opens;
			const kept = i === keeper;
			const drop = kept ? Infinity : d > 9 ? (r() < 0.55 ? between(r, 9, 14) : between(r, 25, 62)) : Infinity;
			if (d > drop || d > 330) continue;
			if (!kept && d > 70) continue;
			// along the raceme: the first at the tip, the others below it on short stalks
			const along = i === 0 ? 0 : Math.min(0.85, 0.12 + 0.18 * i) * Math.min(1, su.L / 0.05);
			const p = pointOn(su.pts, Math.max(0, lengths(su.pts).at(-1) - along * 0.04));
			const side = across(tipDir).applyAxisAngle(tipDir, i * 2.4 + r() * 0.6);
			const fdir = (i === 0 ? tipDir.clone() : tipDir.clone().multiplyScalar(0.5).addScaledVector(side, 0.85)).add(v3(0, 0.25, 0)).normalize();
			const at = i === 0 ? tipP.clone() : p.at.clone().addScaledVector(side, 0.0015);
			if (d < 9) {
				// bud and flower: buds from the flush's third week, open about eight days, then the petals drop
				const swell = clamp((day - (opens - 40)) / 40);
				if (swell <= 0) continue;
				const open = d < 0 ? 0 : smooth(d / 1.6);
				const fall = smooth((d - 6) / 3);
				flower(bag, at, fdir, open, fall, r, swell);
				nFlowers++;
				continue;
			}
			// the young fruit: hangs as it grows heavy, placed for its ripe size so it swells where it hangs
			const out = at.clone().setY(0).normalize();
			const hangDir = v3(0, -1, 0).addScaledVector(out, 0.55).addScaledVector(fdir, 0.3).normalize();
			const ripeR = OT.fruit.diameter * 0.5;
			const shape = (a2, d2) => [{ c: a2.clone().addScaledVector(d2, OT.fruit.stalk + ripeR), r: ripeR * 0.95 }];
			const place = d > 40 ? space.settle(at, hangDir, shape, 0.012, 0.03) ?? { at, dir: hangDir } : { at, dir: fdir.clone().lerp(hangDir, smooth(d / 40)).normalize() };
			const key = [...su.key, i];
			bag.fruit(key, at, place.dir);
			if (place.at.distanceTo(at) > 1e-4) bag.add('twig', tube([at, place.at], () => 0.0013, () => OT.fruit.stalkColour, 4));
			fruit(bag, place.at, place.dir, d, sunDir, key.join('|'), r);
			bag.fruitDone();
			nFruit++;
		}
	}
	// the leaves of every shoot, as long as they live; thorns on the vigorous ones
	for (const su of list) {
		if (su.leafless) continue;
		const fl = GROVE.flushes[su.f % 3];
		const size = (0.74 + 0.42 * Math.min(1, su.vig)) * (fl.name === 'spring' ? 0.9 : 1) * (su.flowers ? 0.8 : 1);
		const out = su.tip.clone().setY(0);
		if (out.lengthSq() > 1e-6) out.normalize();
		leavesAlong(bag, seed, su.key, su.pts, su.born, su.grown, t, size, {
			internode: 0.017 + 0.02 * Math.min(1, su.vig),
			length: su.L * su.grown,
			skip: 1,
			shade: su.shade,
			thorns: su.vig > 0.7 ? 0.18 : 0.02,
			out,
		});
	}
	bag.counts = { shoots: list.length, flowers: nFlowers, fruit: nFruit };
	return finish(bag);
}

/** the bag built, and what it counted kept on the group (for checking) */
function finish(bag) {
	const g = bag.build();
	if (bag.counts) g.userData.counts = bag.counts;
	return g;
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/** the time of a day of the bearing season: `d` days from full bloom in the tree's eighth summer in the grove */
const SEASON = 10; // the calendar year of that bloom, from the sowing year
const bloomT = (d) => tOf(SEASON * YEAR + GROVE.bloom + d);

/**
 * Eleven stages, from the rootstock's seed to ripe fruit; `t` the years from sowing each is grown at (between two
 * stages, on the way). The last five are one season of the tree's eighth year in the grove: full bloom on 8 May,
 * ripe 275 days after (Scirè and Rosso are picked about then, mid-February; data sheet §5).
 */
const STAGES = [
	{ name: 'Seed', t: 0, note: "The rootstock's seed: a sour orange's (Citrus × aurantium), club-shaped, 9–10 mm, cream and wrinkled, sown 12 mm deep on the first of March. A Tarocco is never grown from its own seed (it has almost none, and a seedling would not bear for 8–15 years): it is budded onto a seedling of the stock." },
	{ name: 'Germination', t: 0.06, note: 'About two weeks: the root goes down and the shoot comes up bent in a hook; hypogeal, the seed leaves stay inside the seed in the soil. The seed is polyembryonic: nucellar seedlings, true to their mother.' },
	{ name: 'Seedling', t: 0.25, note: "Three months: a sour-orange seedling of 10–12 cm, trained to one stem, its glossy leaves on broadly winged stalks (the stock's, not the Tarocco's), a few thorns." },
	{ name: 'Budded', t: 1.38, note: "Its second spring: budded with Tarocco 18 cm above the soil when pencil-thick; the stock cut back above the bud six weeks later. The Tarocco shoot, 30 cm, grows from the bud on the side of the stock's stub, tied to a cane." },
	{ name: 'Nursery tree', t: 2.12, note: 'Two years from sowing: a staked Tarocco whip of about 1 m on its sour-orange stock, the union a slight bench 18 cm up, ready to be planted out in May and headed at 62 cm.' },
	{ name: 'Young tree', t: tOf(6 * YEAR + 36), note: 'February of its fourth winter in the grove: a round bush 1.8–2 m high on a short trunk, three or four scaffolds from 45–58 cm, the crown down near the ground; its first crop of a few dozen oranges, blushed red.' },
	{ name: 'Blossom', t: bloomT(0), note: 'Its eighth May in the grove, 3.4 m high and 3.1 m across: full bloom on the spring flush, single flowers and racemes of two to six, white and waxy, 3 cm across, heavy with scent; leafy inflorescences among the pale new leaves, leafless ones on the old wood.' },
	{ name: 'Fruit set', t: bloomT(50), note: 'Late June: the petals long fallen, the flowers that did not set dropped with their stalks; of the green fruitlets of 1–2 cm, most fall in the June drop. Less than 1% of the flowers ripen. The summer flush begins, the longest shoots of the year.' },
	{ name: 'Green fruit', t: bloomT(140), note: 'End of September: dark glossy green oranges of 5–6 cm, swelling (phase II, cell expansion), among the summer flush; the autumn flush breaking.' },
	{ name: 'Colour break', t: bloomT(205), note: 'Early December: full-sized, 72–76 mm; the green clearing from the stylar end and the sunny cheek to yellow and orange as the nights cool. Early clones (Nucellare, Gallo) are picked now.' },
	{ name: 'Ripe', t: bloomT(275), note: "Mid-February, 275 days after full bloom: Tarocco oranges of 70–78 mm and about 190 g, obovoid with a short furrowed collar at the stalk, neutral orange with patches of garnet red where the cold nights of January (8–15 °C and under) turned them; inside, amber flesh streaked with crimson, 10–12 segments, almost seedless. 50–60 kg on the tree." },
];

/** the years from sowing at a stage (0 … 10, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => orangeTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one orange on its own ---- */

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
	const { plant, fruits } = lite({ roots: false, level: 0.3, thin: 0.12, fill: 1 }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.92);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one orange at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This tree bears no fruit.');
	const { plant, fruits } = lite({ fruit: key, roots: false, level: 0.3, thin: 0.12, fill: 1 }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This orange has not set yet: its flower opens in May.');
	const hang = new THREE.Matrix4()
		.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(f.dir, v3(0, -1, 0)))
		.multiply(new THREE.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	const kinds = {};
	for (const p of f.parts) {
		p.geometry.applyMatrix4(hang);
		(kinds[p.kind === 'prop' ? 'body' : p.kind] ??= []).push(p.geometry);
	}
	const group = new THREE.Group();
	const fine = DETAIL.level;
	DETAIL.level = 1; // the fruit view always with its surfaces
	for (const [kind, list] of Object.entries(kinds)) {
		const merged = sound(list.length === 1 ? list[0] : mergeGeometries(list));
		if (list.length > 1) for (const g of list) g.dispose();
		if (!merged) continue;
		const mesh = new THREE.Mesh(merged, material(kind));
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	DETAIL.level = fine;
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
	id: 'orange',
	label: "Orange 'Tarocco' · Citrus × sinensis",
	latin: "Citrus × sinensis (L.) Osbeck 'Tarocco' · syn. C. × aurantium L. [Blood Orange Group] · Tarocco, arancia rossa di Sicilia (PGI) · Sicilian blood orange · Blutorange · orange sanguine",
	note: "The Tarocco, the blood orange of the plain of Catania and the slopes of Etna, budded on sour orange: a dome of glossy dark leaves 3.4 m high in its eighth year in the grove, white waxy blossom on the spring flush in May, and in February oranges of 74 mm, obovoid with a short furrowed collar, neutral orange with patches of garnet red after the cold nights, the flesh amber streaked crimson.",
	from: 'Tree · 8 years in the grove (10 from sowing its stock)',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: 'dca753958ba0945942df3d257486f1a5d8a637219d6616cfbde2c7bf4e526360', model: 'fal-ai/nano-banana-pro (+ /edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * YEAR), note })), // days from sowing the stock
	// what a world needs to plant it right; data sheet orange-tarocco.md
	facts: {
		height: { at2y: [1.2, 1.6], at6y: [2.0, 2.8], at7y: [3.4, 3.6], grown: [4, 5], unit: 'm, years from planting' },
		crownWidth: { at7y: [3.0, 3.2], grown: [4.5, 5], unit: 'm' },
		trunkDiameter: { at6y: [0.098, 0.133], at7y: [0.1, 0.11], grown: [0.2, 0.3], unit: 'm' },
		spacing: [[5, 3.2], [6.5, 6.5]], // 230–625 trees a hectare (PGI; commonest in Sicily 400–625)
		shade: 'full sun, 6–8 h a day at least; shade gives fewer and paler fruit',
		climate: 'Mediterranean: long hot dry summers, cool winter nights; the red forms at 8–15 °C over 15–30 days (5–10 °C best); damaged below −4 °C; shoots start at a 10 °C mean',
		rootstock: 'sour orange (old groves) or Carrizo / Troyer citrange (since tristeza); budded 15–20 cm up',
		years: { budding: [1, 1.3], planting: [2, 3], firstFruit: [2, 3], fullBearing: [8, 10], productiveLife: [40, 60], fromPlanting: true },
		flushes: { spring: ['Feb', 'May'], summer: ['Jun', 'Aug'], autumn: ['late Aug', 'Oct'] },
		leaf: { length: [0.07, 0.15], width: [0.035, 0.07], life: [2, 3], unit: 'm, years' },
		flower: { across: [0.03, 0.032], perCluster: [1, 6], bloom: ['late Apr', 'May'], set: '< 1 %' },
		fruit: { diameter: [0.07, 0.086], mass: [0.178, 0.35], rind: [0.0035, 0.0066], segments: [9, 12], seeds: [0, 0.3], daysBloomToRipe: [220, 360], harvest: ['Dec', 'May'], unit: 'm, kg' },
		yield: { perTree: [50, 80], maxTPerHa: 25, unit: 'kg a tree grown; t/ha (PGI)' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the tree, 1 one orange) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'orange' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'orange',
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
module.exports.organs = { OT, GROVE, BLADE, leafGeometry, leaf, flower, fruit, fruitSize, rindColour, seedOf, thorn, shoots, envelope, orangeTree, timeAt, STAGES, Bag, surface, lite, detailAt, v3, lin };
