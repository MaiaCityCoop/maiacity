'use strict';
/*
 * SAFOU — Dacryodes edulis (G.Don) H.J.Lam var. edulis (Burseraceae): the safou, African pear, bush butter, prune; the
 * cultivated large-fruited variety of Cameroon, Nigeria and the Congo basin. Version 2 of plants/safou: a female
 * seedling tree of the humid lowlands of Cameroon, grown from its fresh seed, sown in August, through its first
 * flushes and tiers, to one season of its tenth year, from the bloom in January to ripe fruit in June.
 *
 * It has no named clones: the model is the cultivated variety as measured on farm trees and ICRAF/IRAD's improved
 * trees (fruit 75 × 36 mm and 50 g, the means of 750 fruits each at five Cameroon localities and of 200 trees; Youmbi
 * 2010, Leakey et al. 2002, Waruhiu et al. 2004), and the species where nothing of the variety is measured (Rauh's
 * model, its flushes, epigeal germination, the dioecious flower: Kengue 1990, 1996, 2002; Verheij 2002, PROTA; Orwa
 * 2009; Silou; Okafor 1983). Every number with its source: plant-skill's data sheet for it (safou-dacryodes-edulis.md,
 * S1–S21).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its wrong cells redrawn, grey-balanced on its checker, its fruit row from a plate of the fruit alone (the
 * full sheet would not draw the variety's long cylindrical fruit), kept on play by its hash (3424d165…): its leaflet's
 * and fruit's outlines and its colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots, sound()),
 *                   as banana v2 carries it, with lemon v2's mipmapped pictures, plum v2's parsed colours and leaf
 *                   undersides with their own normals, and the safou's materials and surfaces (colour pictures only:
 *                   a leaflet's looping veins, the old bark's pale scales, the young wood's lenticels).
 *   2. ORGANS       the safou's own, each to its measure: the seed and its lobed cotyledons, the compound leaf, the
 *                   flower and its rusty panicle, the fruit and its woody infructescence, the bark.
 *   3. THE TREE     its axes flush by flush (Rauh's model: every axis grows upright in rhythmic flushes, its branches
 *                   in tiers from the top of a flush), girth by the pipe model, its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time in years from sowing the seed (1 August); the bloom of a year falls in late January,
 * about 0.47 of a year after.
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
		// a safou's leaves are big and compound: far off, a few of them grown to fill (crowds of trees)
		[0.1, 0.05, 2.2, 0.01],
		[0.25, 0.16, 1.7, 0.004],
		[0.5, 0.42, 1.25, 0.0012],
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
		// the underside lit as the face above it is: a thin leaf lets the light through (not for a thick leaf seen from
		// below: its normals facing away take the whole sky in their Fresnel, and it draws white)
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
	const c = named(color);
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: a leaflet's looping veins,
 * the pale scales and horizontal folds of old bark, the lenticels and rusty hairs of young wood, the fine grain of the
 * fruit's skin. Colour pictures only (they multiply the vertex colours, so a picture that lightens is darker
 * everywhere else: its organ's vertex colour is raised by `LIFT[name]`). No bump pictures: in a crown of a million
 * small triangles they make NaN pixels that whiten the frame (plum v2's lesson). Only at detail 0.5 and over.
 */
const SURFACES = {};
const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** how much an organ's vertex colour is raised under its picture, which is this much darker than white on average */
const LIFT = { leafMap: 1 / 0.9, twigMap: 1 / 0.88, skinMap: 1 / 0.94, barkMap: 1 / 0.82 };
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
 * A leaflet's veins, in its own coordinates (x 0 … 1 from its base to its tip, y 0 … 1 across, the midrib at 0.5):
 * twelve pairs of laterals (9–15, PROTA) leaving the midrib at about 55°, curving forward and looping into one another
 * a little inside the margin (anastomosing, the sheet's leaflet underside), a little offset side to side, and a faint
 * net between. 0 the blade, 1 on a vein.
 */
function leafVeins(x, y) {
	const a = Math.abs(y - 0.5) * 2;
	const side = y > 0.5 ? 0.02 : 0;
	const pairs = 12;
	const u0 = x - 0.12 * a - 0.1 * Math.pow(a, 2.2) - side;
	const k = (u0 - 0.04) * pairs;
	const near = Math.abs(k - Math.round(k)) / pairs;
	const on = u0 > 0.02 && u0 < 0.9 && a < 0.86 ? Math.exp(-Math.pow(near / (0.0035 * (1 - 0.5 * a)), 2)) * (1 - smooth((a - 0.72) / 0.14)) : 0;
	// the loop joining each lateral to the next, a band a little inside the margin
	const loop = Math.exp(-Math.pow((a - 0.8) / 0.018, 2)) * 0.6 * (x > 0.06 && x < 0.92 ? 1 : 0);
	const net = Math.pow(1 - Math.abs(tileNoise(x, y, 16, 61, 2, 6) - 0.5) * 2, 6) * 0.16;
	const mid = Math.exp(-Math.pow(a / 0.022, 2));
	return Math.max(on, mid, loop, net * (1 - mid));
}

/**
 * The surfaces, made the first time they are asked for:
 *   leafMap   a leaflet's veins (above), a little lighter than the blade, over each leaflet's own 0 … 1
 *   barkMap   0.15 m of old trunk bark (x along the trunk, y round it): pale yellowish-grey shallow scales a few cm
 *             across, their edges and the horizontal folds a little darker, scattered lenticels (the sheet's old
 *             swatch: [0.42, 0.35, 0.31] linear, its darkest cracks [0.17, 0.12, 0.09])
 *   twigMap   0.06 m of young wood: pale lenticels on grey-green and the rust-brown down of the young shoot
 *   skinMap   0.03 m of the fruit's skin: a fine grain only (its colours are vertex colours, round patches on the ball)
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const make = {
		leafMap: () =>
			picture(512, 256, (x, y) => {
				const v = leafVeins(x, y);
				const k = 0.88 + 0.14 * v + 0.04 * (tileNoise(x, y, 18, 63) - 0.5);
				return [k * (1 + 0.04 * v), k * (1 + 0.06 * v), k * (1 - 0.04 * v)];
			}, true),
		barkMap: () =>
			picture(512, 512, (x, y) => {
				const warp = tileNoise(x, y, 4, 71, 2) - 0.5;
				const c = tileCells(x + warp * 0.06, y + warp * 0.05, 5, 6, 73);
				const edge = 1 - smooth((c.f2 - c.f1) / 0.1);
				const fold = Math.pow(Math.abs(Math.cos((x + 0.05 * tileNoise(x, y, 3, 79, 2)) * Math.PI * 7)), 40) * smooth((tileNoise(x, y, 2, 81, 2) - 0.45) / 0.15);
				const lent = tileCells(x, y, 18, 26, 83);
				const dot = lent.id < 0.3 ? smooth((0.14 - lent.f1) * 20) : 0;
				const grain = tileNoise(x, y, 8, 75, 3, 24);
				const plate = 0.84 + 0.12 * c.id + 0.12 * (grain - 0.5);
				let k = lerp(plate, 0.45, edge * 0.8);
				k = lerp(k, 0.55, fold * 0.7);
				return [lerp(k, 1.02, dot * 0.5), lerp(k, 0.98, dot * 0.5) * (0.98 + 0.03 * c.id), lerp(k, 0.9, dot * 0.5) * (0.96 + 0.05 * c.id)];
			}, true),
		twigMap: () =>
			picture(256, 256, (x, y) => {
				const c = tileCells(x, y, 8, 12, 87);
				const dot = c.id < 0.5 ? smooth((0.15 - c.f1) * 18) : 0;
				const down = tileNoise(x, y, 40, 89, 2, 40);
				const k = 0.86 + 0.08 * (down - 0.5);
				return [lerp(k, 1.1, dot), lerp(k, 1.05, dot), lerp(k, 0.9, dot)];
			}, true),
		skinMap: () => picture(256, 256, (x, y) => {
			const k = 0.94 + 0.06 * (tileNoise(x, y, 40, 91, 2) - 0.5);
			return [k, k, k];
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
 * its kind and settings, so no shader code). `leaf` a leaflet's two faces, each its own colour (one-sided): very
 * glossy above, yet no clearcoat (a crown of glossy leaves seen edge-on turns white-grey with one) but a low
 * roughness and a low specular; `bark` the trunk and limbs: matt pale scales; `twig` young wood, downy, lenticels;
 * `skin` the fruit: thin, waxy and glossy (its bloom drawn as colour); `sheet` thin things seen from both sides (the
 * flowers, the cotyledons' lobes); `body` the seed, the roots, the stalks and everything else.
 */
const MATERIALS = {
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, specularIntensity: 0.22, ...(s && { map: s('leafMap') }) }),
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...(s && { map: s('barkMap') }) }),
	twig: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, ...(s && { map: s('twigMap') }) }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.35, ...(s && { map: s('skinMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['body', 'bark', 'twig', 'leaf', 'sheet', 'skin', 'prop'];
// a safou has thousands of compound leaves and flowers: a crowd far off draws a part of them, each grown bigger to fill
const THINNED = { leaf: true, sheet: true };
// how big a thinned leaf may be grown to fill the gap (a compound leaf is 0.4 m: it may grow up to this radius)
const THIN_REACH = 0.36;

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
			const most = Math.max(1, THIN_REACH / Math.max(1e-4, sphere.radius));
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
 * 2. ORGANS — the safou's own, each to its measure
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
 * The safou in numbers: sizes in metres from the data sheet (safou-dacryodes-edulis.md), outlines and colours traced
 * off the reference sheet (3424d165…, Nano Banana Pro, 2026-11-05, grey-balanced on its checker) in linear sRGB, its
 * median as the colour and p10–p90 as each organ's own variation. The sheet's scale bars are never used.
 */
const SA = {
	seed: {
		length: 0.045, // 42–47 × 18–22 mm, 10–14 g (Youmbi 2010, 750 fruits a locality) [CV]
		width: 0.02,
		thick: 0.016, // [EST] from the width and its flattened shape
		depth: 0.02, // sown lying flat, 2 cm deep (S3, S6)
		coat: lin(0.44, 0.45, 0.2), // 'Seed (4.5 cm)' [0.48, 0.48, 0.26] and the seed as sown in row 1 [0.38, 0.44, 0.19]: light green, its pellicle a little pink in places
		coatGreen: lin(0.37, 0.42, 0.17),
		pink: lin(0.6, 0.38, 0.32),
		radicle: lin(0.8, 0.74, 0.58),
	},
	cotyledon: {
		length: 0.04, // each ~4–4.5 × 2 cm folded in the seed, 4–5-lobed [EST from the seed, S11]; opened, as wide as long
		colour: lin(0.328, 0.44, 0.195), // 'Seedling (3 weeks)': light green
		lo: lin(0.246, 0.347, 0.136),
		hi: lin(0.413, 0.521, 0.262),
		dry: lin(0.3, 0.22, 0.08),
		fall: [0.28, 0.4], // shrivel and fall at 3–5 months [EST]; still on at 2 months (S14)
	},
	hypocotyl: { length: 0.06, colour: lin(0.191, 0.159, 0.033), red: lin(0.36, 0.08, 0.07) }, // 4–8 cm [EST], green to reddish
	leaf: {
		length: 0.36, // a grown leaf 30–50 cm with its leaflets [EST]; the rachis from the foot to the end leaflet's petiolule
		petiole: 0.04, // to 7.5 cm (PROTA); the sheet's leaf has a short one
		pairs: 6, // 11–19 leaflets (PROTA): 6 pairs + 1 on grown trees, 1–3 pairs on the seedling's first leaves [EST]
		leaflet: 0.155, // the upper leaflets 14–17 × 5.5–6.5 cm, the lowest smaller (PROTA: up to 20(–30) × 6(–8)); the sheet's leaf
		aspect: 2.65, // the sheet's 'Leaflet underside' traced 2.9 : 1, the compound leaf's leaflets 2.4–2.6 : 1
		petiolule: 0.007, // to 1 cm (PROTA)
		up: lin(0.054, 0.102, 0.037), // 'Compound leaf': dark green, very glossy
		upLo: lin(0.03, 0.065, 0.016),
		upHi: lin(0.085, 0.14, 0.06),
		under: lin(0.24, 0.32, 0.14), // 'Leaflet underside': paler, dull
		flush: lin(0.342, 0.162, 0.202), // 'Young flush leaf': rose-violet (anthocyanin, S4)
		flushHi: lin(0.407, 0.22, 0.266),
		flushUnder: lin(0.4, 0.26, 0.26),
		bronze: lin(0.11, 0.075, 0.045), // turning bronze-green as it hardens (kept dark: in the sun a light bronze reads yellow)
		rachis: lin(0.13, 0.11, 0.035),
		old: lin(0.45, 0.36, 0.06), // yellow before it falls
		life: [0.6, 0.95], // years [EST: evergreen, continuous leaf fall; no measured life; held to a rosette of ~10–15 leaves a tip]
		expand: 0.04, // years from bud to full size (a flush grows ~2–3 weeks)
		green: 0.07, // years from rose-violet to green: 3–4 weeks [EST]
	},
	// the leaflet blade's outline off 'Leaflet underside' (14 cm, its petiolule cut off): width at 22 stations, base → tip
	LEAFLET_W: rel([13.7, 24.3, 31.4, 36.6, 39.5, 42.8, 45.1, 46.9, 47.5, 47.7, 47.7, 48.5, 48.3, 46.5, 43.5, 40.9, 37.4, 31.8, 23.2, 12.6, 5.5, 0.8]),
	fruit: {
		length: 0.075, // 75 × 36 mm, 50 g: the locality means 62.8–73.1 × 30.9–36.0 mm, 34.6–47.3 g (Youmbi) [CV]
		aspect: 2.1, // the fruit plate's full-size fruit traced 2.15, the ripe 2.27; the measured 2.08
		days: 145, // fruit set to ripe 18–26 weeks, mean 20.3–21.4 (Kengue & Tchio; Mpemboura 2021) [CV]
		full: 90, // full length by 8–15 weeks [CV]
		turn: 112, // darkening in the last 3–5 weeks [CV]
		green: lin(0.402, 0.456, 0.068), // the fruitlet's green ('fruitlet, just set')
		blush: lin(0.578, 0.178, 0.162), // its pink tip
		youngPink: lin(0.53, 0.24, 0.15), // at 6 weeks, pink over green
		youngGreen: lin(0.36, 0.32, 0.07),
		pink: lin(0.745, 0.15, 0.178), // 'full size, 14 weeks': rose-pink (median of its middle)
		pinkLo: lin(0.57, 0.1, 0.12), // its p10 (the ends, a little deeper)
		violet: lin(0.2, 0.1, 0.18), // 'turning': its blue-violet patches
		ripe: lin(0.034, 0.04, 0.062), // 'ripe': blue-black
		bloom: lin(0.15, 0.155, 0.2), // its bloom, the p90 of the ripe fruit: a pale grey-blue frost in patches
		stalk: lin(0.275, 0.168, 0.091), // the woody infructescence ('ripe cluster')
		stalkGreen: lin(0.2, 0.2, 0.05),
		flesh: lin(0.68, 0.687, 0.25), // cut: pale green buttery flesh, 6 mm (29A7, S11)
		seed: lin(0.571, 0.624, 0.223),
	},
	// the fruit's profile off the fruit plate's full-size fruit (7.5 cm): its width at 24 stations, blossom end → stalk
	FRUIT_W: rel([1.2, 16.3, 23.0, 27.5, 30.5, 32.3, 33.6, 34.2, 34.7, 34.9, 34.8, 34.8, 34.8, 34.8, 34.8, 34.6, 34.3, 33.7, 32.6, 30.9, 28.4, 24.8, 18.8, 0.4]),
	flower: {
		petal: lin(0.701, 0.584, 0.283), // 'Female flower': cream-yellow inside
		petalOut: lin(0.42, 0.28, 0.1), // brown-hairy outside
		sepal: lin(0.246, 0.15, 0.012), // brown, ferruginous
		disc: lin(0.45, 0.48, 0.1), // the 6-lobed yellow-green disc
		stamen: lin(0.82, 0.82, 0.74),
		ovary: lin(0.25, 0.38, 0.08),
		axis: lin(0.15, 0.056, 0.016), // the panicle's axes, rust-brown tomentose
		bud: lin(0.22, 0.1, 0.03),
		dry: lin(0.16, 0.09, 0.03),
	},
	bark: {
		shoot: lin(0.136, 0.153, 0.023), // 'Young shoot': green
		rust: lin(0.2, 0.1, 0.03), // the rusty stellate down of the young shoot (PROTA) [the sheet drew it green]
		young: lin(0.191, 0.184, 0.122), // 'Young bark': grey-green, lenticels
		old: lin(0.24, 0.21, 0.18), // 'Old trunk bark': pale yellowish-grey, scaly (its median 0.42, 0.35, 0.31 lit flat on the light box; the plate's trunks in row 1 are far darker, 0.05, 0.04, 0.02: taken between, as the trunk reads white in the sun)
		resin: lin(0.82, 0.8, 0.68), // its drops of whitish resin
		root: lin(0.47, 0.31, 0.17),
	},
	root: { young: lin(0.8, 0.72, 0.55), old: lin(0.33, 0.22, 0.12) },
};

/* ---- the seed and its seed leaves ---- */

/**
 * The seed as sown: oblong, a little flattened, lying on its side 2 cm under the soil, its light green pellicle a
 * little pink; `root` 0 … 1 how far its radicle is out (in a fully ripe fruit it is often out already).
 */
function seed(bag, at, root, seedKey) {
	const S = SA.seed;
	const r = chance(seedKey, 'seed');
	const k = about(r, 1, 0.05);
	const L = S.length * k, W = S.width * k, T = S.thick * k;
	const turn = r() * Math.PI * 2;
	const ns = hashText(seedKey) % 991;
	const g = new THREE.SphereGeometry(1, fewer(24, 8), fewer(14, 5));
	const pos = g.attributes.position;
	const col = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
		// a cylinder with round ends rather than an egg: flatten the ellipsoid's sides
		const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.8);
		pos.setXYZ(i, sq(x) * L / 2, sq(y) * T / 2, sq(z) * W / 2);
		const c = mix(S.coatGreen, S.coat, fbm(x * 2, y * 2, z * 2, 2, ns)).lerp(S.pink, 0.4 * smooth((fbm(x * 3 + 5, y * 3, z * 3, 2, ns) - 0.55) / 0.15));
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	bag.add('body', g, new THREE.Matrix4().makeRotationY(turn).setPosition(at));
	if (root > 0) {
		// the radicle from one end, white, turning down
		const d = v3(Math.cos(turn), 0, -Math.sin(turn));
		const from = at.clone().addScaledVector(d, L * 0.48);
		const pts = [from];
		const len = 0.006 + 0.03 * root;
		for (let i = 1; i <= 6; i++) pts.push(pts[i - 1].clone().addScaledVector(d.clone().multiplyScalar(1 - i / 6).addScaledVector(v3(0, -1, 0), i / 4).normalize(), len / 6));
		bag.add('body', tube(pts, (u) => lerp(0.0018, 0.0007, u), () => S.radicle, 6, true));
	}
	return { L, W, T, turn };
}

/**
 * One seed leaf (cotyledon) as the germinating safou lifts it (the sheet's 'Seedling (3 weeks)'): thick, light green,
 * deeply cut into four or five finger-like lobes like a small hand, held out flat from the top of the hypocotyl.
 * Built along +X from its foot, its face up. `open` 0 folded in the seed … 1 spread; `dry` 0 … 1 shrivelling.
 */
function cotyledon(o) {
	const Co = SA.cotyledon;
	const L = Co.length * lerp(0.8, 1, o.open);
	const paint = (u, v) => mix(mix(Co.lo, Co.hi, 0.4 + 0.3 * u + 0.1 * v), Co.dry, o.dry);
	const back = () => mix(Co.colour, Co.dry, o.dry).multiplyScalar(0.9);
	const lift = (u, v) => 0.05 * v * v - 0.04 * u * u * o.open - 0.15 * o.dry * u * u;
	// the palm: from a narrow foot, broadening (the sheet: a small hand)
	const palmL = L * 0.5;
	const parts = [
		sheet({ length: palmL, width: L * 0.3 * lerp(0.5, 1, o.open), shape: (u) => Math.max(0.05, Math.pow(smooth(u / 0.9), 0.7)), lift, paint: (u, v) => paint(u * 0.5, v), back, backLit: false, along: 8, across: 4 }),
	];
	// three rounded finger-like lobes from its end, spreading as it opens, the middle one longest
	for (const [k, a, len] of [[-1, -0.6, 0.48], [0, 0, 0.56], [1, 0.6, 0.48]]) {
		const g = sheet({
			length: L * len,
			width: L * 0.13 * lerp(0.6, 1, o.open),
			// broad and round-ended, a little narrower toward the tip
			shape: (u) => Math.max(0.05, (1 - 0.12 * u) * (u > 0.72 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.72) / 0.28, 2))) : 1)),
			lift: (u, v) => lift(0.5 + u * 0.5, v),
			paint: (u, v) => paint(0.5 + 0.5 * u, v),
			back,
			backLit: false,
			along: 8,
			across: 2,
		});
		g.applyMatrix4(new THREE.Matrix4().makeRotationY(-a * o.open).setPosition(palmL * 0.8, 0.0004 * (k + 2), k * L * 0.13 * lerp(0.6, 1, o.open)));
		parts.push(g);
	}
	const g = mergeGeometries(parts);
	for (const p of parts) p.dispose();
	return g;
}

/* ---- the compound leaf ---- */

/** the leaflet's half width at u (0 base … 1 tip), as a part of its greatest: the sheet's traced outline */
const leafletHalf = (u) => station(SA.LEAFLET_W, u);

/**
 * One imparipinnate leaf at a node (the sheet's 'Compound leaf (40 cm)'): a grooved petiole from the shoot at `at`,
 * out along `out` and rising, the rachis arching over under the weight, `pairs` pairs of opposite leaflets on short
 * petiolules and one at the tip, the lowest pairs smaller; each leaflet the traced outline, its tip bent down a
 * little, dark glossy green above and paler below. `size` the leaf's length as a part of the grown leaf's, `age` years
 * since its node formed, `life` years it lives: young it is limp, hanging and rose-violet (the flush), bronze-green
 * then green and firm in about four weeks, yellow before it falls. One geometry a leaf (a crown has thousands).
 */
function compoundLeaf(bag, o) {
	const F = SA.leaf;
	const { at, out, size, age, life, r } = o;
	if (age <= 0 || age >= life) return;
	const expand = smooth(age / F.expand);
	const greening = smooth(age / F.green);
	const yellow = smooth((age - (life - 0.045)) / 0.045);
	const pairs = o.pairs ?? F.pairs;
	const L = F.length * size * lerp(0.3, 1, expand);
	const P = F.petiole * size * lerp(0.5, 1, expand);
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const side = new THREE.Vector3().crossVectors(UP, flat).normalize();
	// the rachis: rising from the shoot at `rise` and arching down along its length; young, limp and hanging
	const limp = o.limp ?? 1; // how limp it hangs while young (the seedling's first pair stands up)
	const rise = o.flat ? 0 : lerp(-0.7 * limp + (1 - limp) * (o.rise ?? 0.75), o.rise ?? 0.75, greening) + about(r, 0, 0.15);
	const bend = o.flat ? 0 : lerp(0.5, o.bend ?? 0.85, greening) + about(r, 0, 0.15) + 0.3 * yellow;
	const twist = o.flat ? 0 : about(r, 0, 0.25);
	const n = 4;
	const pts = [at.clone()];
	const dirs = [];
	for (let i = 0; i <= n; i++) {
		const s = i / n;
		const a = rise - bend * Math.pow(s, 1.3);
		const d = flat.clone().multiplyScalar(Math.cos(a)).addScaledVector(UP, Math.sin(a)).addScaledVector(side, twist * s * 0.3).normalize();
		dirs.push(d);
		if (i > 0) pts.push(pts[i - 1].clone().addScaledVector(dirs[i - 1].clone().add(d).normalize(), L / n));
	}
	const pointOn = (s) => {
		const x = clamp(s) * n;
		const i = Math.min(n - 1, Math.floor(x));
		return { p: pts[i].clone().lerp(pts[i + 1], x - i), d: dirs[i].clone().lerp(dirs[i + 1], x - i).normalize() };
	};
	const k = r();
	const top = mix(F.upLo, F.upHi, 0.3 + k * 0.5);
	const red = mix(F.flush, F.flushHi, k);
	const green = (back) => {
		const g = back ? F.under : top;
		const young = back ? F.flushUnder : greening < 0.6 ? red : mix(red, F.bronze, (greening - 0.6) / 0.4);
		return mix(young, g, smooth((greening - 0.35) / 0.65)).lerp(F.old, yellow);
	};
	const lift = lifted('leafMap');
	const cTop = green(false).multiplyScalar(lift);
	const cBack = green(true).multiplyScalar(lift);
	const rachisColour = mix(F.flush, F.rachis, greening).lerp(F.old, yellow);
	const fine = DETAIL.level >= 0.5;
	const rachis = tube(pts, (u) => lerp(0.0028, 0.0011, u) * lerp(0.5, 1, expand) * Math.sqrt(size), () => rachisColour, 3, false);
	// the leaflets, written straight into one set of arrays
	const pos = [], uv = [], col = [], idx = [];
	const U = !fine ? [0, 0.45, 1] : o.coarse ? [0, 0.28, 0.66, 1] : [0, 0.17, 0.45, 0.76, 1];
	const droopAll = o.flat ? 0 : lerp(0.9 * limp + 0.18 * (1 - limp), 0.18, greening) + 0.2 * yellow;
	const leaflet = (base, along, face, len, keyed) => {
		const W = len / F.aspect / 2;
		// each leaflet rolled a little about its midrib and hanging a little from its petiolule: never all flat
		const rollA = keyed * 0.45;
		const face2 = face.clone().applyAxisAngle(along, rollA);
		const across = new THREE.Vector3().crossVectors(face2, along).normalize();
		const nf = new THREE.Vector3().crossVectors(along, across).normalize();
		const roll = 0;
		const droop = droopAll + 0.35 + keyed * 0.25;
		for (let f = 0; f < 2; f++) {
			const b0 = pos.length / 3;
			for (const u of U) {
				const w = W * Math.max(0.04, leafletHalf(u));
				for (const v of [-1, 1]) {
					const p = base.clone().addScaledVector(along, u * len).addScaledVector(across, v * w).addScaledVector(nf, (-droop * u * u * 0.22 + roll * v * 0.08) * len - f * 0.0004);
					pos.push(p.x, p.y, p.z);
					uv.push(u, (v + 1) / 2);
					const c = f ? cBack : cTop;
					col.push(c.r, c.g, c.b);
				}
			}
			for (let i = 0; i < U.length - 1; i++) {
				const a = b0 + i * 2, b = a + 2;
				// wound so the upper face's normal is the leaflet's face (+nf) and the lower face's its opposite
				if (f === 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
				else idx.push(a, a + 1, b, b, a + 1, b + 1);
			}
		}
	};
	const span0 = P / L; // the leaflets start beyond the petiole
	for (let i = 0; i < pairs; i++) {
		const s = span0 + (1 - span0) * (i + 0.08) / (pairs + 0.05);
		const { p, d } = pointOn(s);
		const lside = new THREE.Vector3().crossVectors(d, UP);
		if (lside.lengthSq() < 1e-6) lside.copy(side);
		lside.normalize();
		const face = new THREE.Vector3().crossVectors(lside, d).normalize();
		if (face.y < 0) face.negate();
		const len = F.leaflet * size * lerp(0.35, 1, expand) * lerp(0.72, 1.04, Math.pow(i / Math.max(1, pairs - 1), 0.8)) * about(r, 1, 0.05);
		for (const sgn of [-1, 1]) {
			const ang = 1.32 - 0.22 * (i / Math.max(1, pairs - 1)) + about(r, 0, 0.08);
			const along = d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(lside, sgn * Math.sin(ang)).addScaledVector(face, -0.15 * droopAll - 0.22).normalize();
			const base = p.clone().addScaledVector(along, F.petiolule * size);
			leaflet(base, along, face, len, about(r, 0, 1));
		}
	}
	// the terminal leaflet
	const end = pointOn(1);
	const tFace = new THREE.Vector3().crossVectors(new THREE.Vector3().crossVectors(end.d, UP).normalize(), end.d).normalize();
	if (tFace.y < 0) tFace.negate();
	leaflet(end.p.clone().addScaledVector(end.d, F.petiolule * size), end.d.clone().addScaledVector(tFace, -0.2 * droopAll).normalize(), tFace, F.leaflet * size * lerp(0.35, 1, expand) * 0.95, about(r, 0, 1));
	const g = made(pos, new Array(pos.length).fill(0), uv, col, idx, true);
	const both = mergeGeometries([rachis, g]);
	rachis.dispose();
	g.dispose();
	if (both) bag.add('leaf', both);
}

/* ---- the flower and the panicle ---- */

/**
 * One flower, close up (the sheet's 'Female flower'): about 5 mm across; three brown hairy sepals, three broad
 * incurved petals cream-yellow inside, six short white stamens (sterile in a female flower) round a yellow-green
 * six-lobed disc and a green ovary with a short two- to three-lobed stigma. From `at` along `dir`; `open` 0 … 1.
 * `turn` rolls it so its first petal lies where a panel's does.
 */
function flower(bag, at, dir, o = {}) {
	const Fl = SA.flower;
	const { open = 1, r = chance('flower') } = o;
	const ax = dir.clone().normalize();
	const side0 = across(ax).applyAxisAngle(ax, o.turn ?? 0);
	bag.add('twig', tube([at.clone().addScaledVector(ax, -0.004), at.clone().addScaledVector(ax, -0.0015), at.clone()], (u) => lerp(0.00045, 0.0007, u), () => Fl.axis, 6, false));
	const petal = (k, inner) => {
		const bearing = ((k + (inner ? 0 : 0.5)) / 3) * Math.PI * 2;
		const sd = side0.clone().applyAxisAngle(ax, bearing);
		const spread = inner ? open * 1.2 + about(r, 0, 0.05) : open * 1.45;
		const d = ax.clone().multiplyScalar(Math.cos(spread)).addScaledVector(sd, Math.sin(spread)).normalize();
		const len = inner ? 0.0028 * about(r, 1, 0.04) : 0.0017;
		const g = sheet({
			length: len,
			width: len * (inner ? 0.42 : 0.35),
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.06 + u * 0.92)), 0.55) * (inner ? 0.75 + 0.35 * u : 1),
			// a petal curls in at its tip (incurved)
			lift: (u, v) => (inner ? 0.18 * v * v + 0.35 * u * u * u : 0.12 * v * v),
			paint: (u) => (inner ? mix(Fl.disc, Fl.petal, smooth(u / 0.25)) : Fl.sepal),
			along: 6,
			across: 2,
		});
		bag.add('sheet', g, aimFace(at.clone().addScaledVector(ax, inner ? 0.0006 : 0.0003), d, ax));
	};
	for (let k = 0; k < 3; k++) petal(k, false), petal(k, true);
	// the disc, the stamens, the ovary and its stigma
	bag.add('body', bead(at.clone().addScaledVector(ax, 0.0007), v3(0.0011, 0.00035, 0.0011), Fl.disc, 8, new THREE.Quaternion().setFromUnitVectors(UP, ax)));
	for (let k = 0; k < 6; k++) {
		const sd = side0.clone().applyAxisAngle(ax, (k / 6) * Math.PI * 2 + 0.3);
		const foot = at.clone().addScaledVector(ax, 0.0008).addScaledVector(sd, 0.0009);
		const tip = foot.clone().addScaledVector(ax.clone().multiplyScalar(0.8).addScaledVector(sd, 0.6).normalize(), 0.0011);
		bag.add('body', tube([foot, tip], () => 0.00012, () => Fl.stamen, 4, false));
		bag.add('body', bead(tip, v3(0.00025, 0.0003, 0.00025), mix(Fl.stamen, Fl.petal, 0.3), 4));
	}
	const ov = at.clone().addScaledVector(ax, 0.0012);
	bag.add('body', bead(ov, v3(0.0006, 0.0009, 0.0006), Fl.ovary, 6, new THREE.Quaternion().setFromUnitVectors(UP, ax)));
	bag.add('body', bead(ov.clone().addScaledVector(ax, 0.0009), v3(0.00035, 0.0002, 0.00035), mix(Fl.ovary, Fl.petal, 0.5), 4));
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
 * A small flower as the tree carries it, by the thousand: three cream-yellow petals between three brown sepals,
 * cupped along `dir`, `open` 0 a bud, 1 open, `fade` 0 … 1 withering. Seven triangles.
 */
function blossom(bag, at, dir, size, open, fade) {
	const Fl = SA.flower;
	const ax = dir.clone().normalize();
	const s0 = across(ax);
	const R = 0.0028 * size * lerp(0.4, 1, open);
	const pos = [], col = [], idx = [];
	const heart = mix(Fl.disc, Fl.dry, fade);
	const tip = mix(mix(Fl.bud, Fl.petal, open), Fl.dry, fade);
	const c0 = at.clone().addScaledVector(ax, R * 0.3);
	pos.push(c0.x, c0.y, c0.z);
	col.push(heart.r, heart.g, heart.b);
	for (let k = 0; k < 6; k++) {
		const petal = k % 2 === 0;
		const rr = petal ? R : R * 0.55;
		const lift = petal ? R * lerp(1.2, 0.35, open) : R * 0.1;
		const d = s0.clone().applyAxisAngle(ax, (k / 6) * Math.PI * 2);
		const p = at.clone().addScaledVector(d, rr).addScaledVector(ax, lift);
		pos.push(p.x, p.y, p.z);
		const c = petal ? tip : Fl.sepal;
		col.push(c.r, c.g, c.b);
	}
	for (let k = 0; k < 6; k++) idx.push(0, 1 + k, 1 + ((k + 1) % 6));
	bag.add('sheet', made(pos, new Array(pos.length).fill(0), new Array((pos.length / 3) * 2).fill(0), col, idx, true));
}

/**
 * A female panicle near a shoot's tip (the sheet's 'Female flowering shoot tip'): an axis 10–15 cm, densely rust-brown
 * and grooved, with four to six side branches, each with a few clusters of three small flowers; the shoot's own bud
 * stays at its tip and flushes again (it looks terminal; Rauh's model). `phase` years from the bloom: buds, flowers
 * opening, withering; after the set the axes stay as the woody infructescence where fruit hang. Returns its axis.
 */
function panicle(bag, seedKey, key, at, dir, phase) {
	const Fl = SA.flower;
	const r = chance(seedKey, 'panicle', ...key);
	const grown = span(phase, -0.08, -0.02);
	const open = span(phase, -0.03, 0.0);
	const fade = span(phase, 0.03, 0.07);
	const L = between(r, 0.1, 0.15) * lerp(0.2, 1, grown);
	const ax = dir.clone().normalize();
	const side = across(ax).applyAxisAngle(ax, r() * 6.283);
	// it stands up beside the tip, leaning out a little (the sheet's shoot tip: erect, compact)
	const d0 = ax.clone().multiplyScalar(0.85).addScaledVector(side, 0.45).addScaledVector(UP, 0.4).normalize();
	const pts = [at.clone()];
	let d = d0.clone();
	for (let i = 1; i <= 5; i++) {
		d.y -= 0.04;
		d.normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, L / 5));
	}
	const out = { pts, L };
	if (phase > 0.08) return out; // the flowers gone: what is left is drawn with the fruit
	const axisColour = mix(Fl.axis, Fl.dry, fade * 0.5);
	bag.add('twig', tube(pts, (u) => lerp(0.0022, 0.0009, u), () => axisColour, 4, false));
	if (grown < 0.3) return out;
	const branches = 6 + Math.floor(r() * 4);
	const fine = DETAIL.level >= 0.5;
	for (let b = 0; b < branches; b++) {
		const u = 0.2 + (0.75 * b) / branches;
		const x = u * 5;
		const j = Math.min(4, Math.floor(x));
		const p = pts[j].clone().lerp(pts[j + 1], x - j);
		const along = pts[j + 1].clone().sub(pts[j]).normalize();
		const bd = across(along).applyAxisAngle(along, b * 2.4).addScaledVector(along, 0.9).normalize();
		const bl = L * 0.26 * (1 - 0.5 * u);
		const q = p.clone().addScaledVector(bd, bl);
		bag.add('twig', tube([p, q], (w) => lerp(0.0011, 0.0006, w), () => axisColour, 3, false));
		if (fade >= 1) continue;
		// clusters of three at its end and along it
		for (let c = 0; c < (fine ? 2 : 1); c++) {
			const cp = p.clone().lerp(q, 1 - c * 0.45);
			for (let f = 0; f < 3; f++) {
				const fd = across(bd).applyAxisAngle(bd, f * 2.1 + b).addScaledVector(bd, 0.5).addScaledVector(UP, 0.4).normalize();
				blossom(bag, cp.clone().addScaledVector(fd, 0.0025), fd, about(r, 1, 0.12), open * (1 - 0.4 * fade), fade);
			}
		}
	}
	return out;
}

/* ---- the fruit ---- */

/** the fruit's length, as a part of its grown length, by days since set: sigmoid, full length by 8–15 weeks (S12) */
const fruitLength = (d) => straight(d, [[0, 0.18], [10, 0.21], [21, 0.34], [35, 0.58], [50, 0.8], [70, 0.95], [90, 1], [200, 1]]);
/** its width as a part of its grown width: a little behind the length, filled out by ~16 weeks (mass at 13–17 weeks) */
const fruitWidth = (d) => straight(d, [[0, 0.21], [10, 0.23], [21, 0.33], [35, 0.55], [50, 0.74], [70, 0.88], [90, 0.95], [115, 1], [200, 1]]);

/**
 * The fruit's colour at a place on it (`u` 0 stalk … 1 blossom end, `p` the place on the unit ball) by days since set,
 * as the fruit plate shows the ages: just set, green with a pink tip; at six weeks pink over green, in patches; full
 * size, rose-pink, the ends a little deeper; turning from 112 days, blue-violet patches spreading from the tip and here
 * and there; ripe at 145 days, blue-black, with a pale grey-blue bloom in patches. Patches are noise on the ball, so
 * they are round.
 */
function fruitColour(days, u, p, ns, own) {
	const Fr = SA.fruit;
	const n1 = fbm(p.x * 2.2 + 3, p.y * 2.2, p.z * 2.2, 3, ns);
	const n2 = fbm(p.x * 3.5, p.y * 3.5 + 7, p.z * 3.5, 3, ns + 11);
	const ends = Math.pow(Math.abs(u - 0.5) * 2, 3);
	// green to pink: the tip first, then in patches, by ~60 days pink all over
	const pinkness = clamp(span(days, 2, 60) * 1.25 + (u - 0.5) * 1.1 + (n1 - 0.5) * 0.9 - 0.15 + span(days, 40, 70));
	const young = mix(mix(Fr.green, Fr.youngGreen, span(days, 5, 30)), mix(Fr.youngPink, Fr.pink, span(days, 30, 70)), pinkness);
	young.lerp(Fr.pinkLo, 0.5 * ends * span(days, 50, 90));
	// the darkening: from the blossom end and in patches
	const f = clamp((days - Fr.turn) / (Fr.days - Fr.turn), 0, 1.5);
	const dark = clamp(Math.pow(f, 1.5) * 2.2 + (u - 0.6) * 0.8 + (n2 - 0.5) * 1.2 - 0.55);
	const c = dark < 0.5 ? mix(young, Fr.violet, dark * 2) : mix(Fr.violet, Fr.ripe, (dark - 0.5) * 2);
	// the bloom: a frost in patches on the dark skin
	const bloom = smooth((n1 - 0.48) / 0.14) * smooth((dark - 0.7) / 0.3);
	c.lerp(Fr.bloom, 0.75 * bloom);
	return c.multiplyScalar(own);
}

/**
 * One fruit hanging from its pedicel: built from `top` (where the stalk joins it) down along `dir`, a lathe of the
 * traced profile (long, cylindrical, round at both ends), its rings spaced closer toward the poles so its ends close
 * round. `days` since set, `k` its own size.
 */
function fruitBody(bag, top, dir, days, k, r, fine) {
	const Fr = SA.fruit;
	const L = Fr.length * fruitLength(days) * k;
	const W = (Fr.length / Fr.aspect) * fruitWidth(days) * k;
	const d = dir.clone().normalize();
	const bendSide = across(d).applyAxisAngle(d, r() * 6.283);
	const bow = about(r, 0, 0.02) * L; // a fruit is seldom quite straight
	const rings = fine ? 64 : fewer(Math.round(lerp(6, 10, fruitLength(days))), 5);
	const sides = fine ? 40 : fewer(Math.round(lerp(6, 8, fruitLength(days))), 5);
	const us = [], pts = [];
	for (let i = 0; i <= rings; i++) {
		const u = (1 - Math.cos((Math.PI * i) / rings)) / 2;
		us.push(u);
		pts.push(top.clone().addScaledVector(d, u * L).addScaledVector(bendSide, bow * Math.sin(Math.PI * u)));
	}
	const radius = (u) => {
		const prof = station(SA.FRUIT_W, 1 - u); // the trace runs blossom end → stalk
		const ell = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
		// near the poles the traced width is held to an ellipse's, so the ends close round
		const pole = smooth(Math.min(u, 1 - u) / 0.08);
		return (W / 2) * (u <= 0 || u >= 1 ? 0 : lerp(ell * 1.02, prof, pole));
	};
	const ns = (hashText(String(r())) % 997) + 1;
	const own = about(r, 1, 0.05) * lifted('skinMap');
	const ring = (u) => us.reduce((best, x, i) => (Math.abs(x - u) < Math.abs(us[best] - u) ? i : best), 0);
	void ring;
	const paint = (u, v) => {
		const th = v * Math.PI * 2;
		const s = Math.sin(Math.PI * u);
		const p = v3(s * Math.cos(th), Math.cos(Math.PI * u), s * Math.sin(th));
		return fruitColour(days, u, p, ns, own);
	};
	// the tube's u is its length along; ours is the (1 − cos) spacing, so paint and radius by the length
	const geo = tube(pts, (u2, v, s) => radius(s / Math.max(1e-6, L)), (u2, v, s) => paint(clamp(s / Math.max(1e-6, L)), v), sides, true);
	metric(geo, L / 0.03, (Math.PI * W) / 0.03);
	bag.add('skin', geo);
	return { L, W };
}

/** the fruit's shape for `Space`: balls along it from where it hangs, for its ripe size */
function fruitBalls(top, dir) {
	const Fr = SA.fruit;
	const L = Fr.length, W = L / Fr.aspect;
	const d = dir.clone().normalize();
	return [0.2, 0.5, 0.8].map((u) => ({ c: top.clone().addScaledVector(d, L * u), r: W * 0.42 }));
}

/**
 * A cluster of fruit as the infructescence carries it (the sheet's 'ripe cluster'): the panicle's axis, now woody and
 * hanging, a few short branches, and `n` fruit on short stout pedicels, each hanging down and a little out. `days`
 * since set; `drop` how many of them are fruitlets that will fall; `fine` the key of the one fruit drawn finely.
 */
function cluster(bag, seedKey, key, at, dir, n, days, keepN, fineKey) {
	const Fr = SA.fruit;
	const r = chance(seedKey, 'cluster', ...key);
	const ax = dir.clone().normalize();
	const side = across(ax).applyAxisAngle(ax, r() * 6.283);
	// the axis: out from the tip and bending down under the fruit's weight as they swell
	const heavy = span(days, 20, 100);
	const L = between(r, 0.12, 0.18);
	const pts = [at.clone()];
	let d = ax.clone().multiplyScalar(0.5).addScaledVector(side, 0.85).normalize();
	for (let i = 1; i <= 5; i++) {
		d.y -= lerp(0.15, 0.45, heavy);
		d.normalize();
		pts.push(pts[i - 1].clone().addScaledVector(d, L / 5));
	}
	const stalkColour = mix(SA.flower.axis, Fr.stalk, span(days, 20, 80));
	bag.add('twig', tube(pts, (u) => lerp(0.0032, 0.0017, u) * lerp(0.7, 1, heavy), () => stalkColour, 5, false));
	const fruits = [];
	for (let i = 0; i < n; i++) {
		const u = 0.35 + 0.65 * ((i + 0.5) / n);
		const x = u * 5;
		const j = Math.min(4, Math.floor(x));
		const p = pts[j].clone().lerp(pts[j + 1], x - j);
		const along = pts[j + 1].clone().sub(pts[j]).normalize();
		const out = across(along).applyAxisAngle(along, i * 2.39 + r());
		const kept = i < keepN;
		const pedLen = between(r, 0.01, 0.022);
		const pd = out.clone().addScaledVector(v3(0, -1, 0), 0.35).normalize();
		const foot = p.clone();
		const end = foot.clone().addScaledVector(pd, pedLen);
		const k = about(r, 1, 0.07);
		const fkey = [...key, i];
		bag.fruit(fkey, end, v3(0, -1, 0));
		bag.add('twig', tube([foot, end], (w) => lerp(0.0014, 0.0022, w) * lerp(0.6, 1, heavy), () => stalkColour, 5, false));
		// a fruit hangs from its pedicel, down and out at 15–50°
		const hang = v3(0, -1, 0).addScaledVector(out, between(r, 0.55, 1.3)).normalize();
		const fdays = kept ? days : Math.min(days, 40);
		fruitBody(bag, end, hang, fdays, k, r, fineKey === fkey.join('|'));
		bag.fruitDone();
		fruits.push(end);
	}
	return { pts, fruits };
}

/** the fruit view's stalk: as the cluster's, alone */
function fruitStalk(bag, at, dir, len, days) {
	const Fr = SA.fruit;
	bag.add('twig', tube([at.clone(), at.clone().addScaledVector(dir, len)], (u) => lerp(0.0014, 0.0022, u), () => mix(SA.flower.axis, Fr.stalk, span(days, 20, 80)), 7, false));
}
/* ================================================================================================================
 * 3. THE TREE — its axes flush by flush, its girth, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A seedling sown fresh in August, raised in a bag under shade, planted out at ten
 * months, grown in the open in a cocoa-farm garden of the humid lowlands. Rauh's model (Hallé & Oldeman 1970; Kengue
 * 1990, 1996): every axis grows upright in rhythmic flushes (a few cataphylls, then the leaves, then a pink-brown
 * abortive leaf), and its branches come from the axils at the top of a flush, so they stand in tiers; var. edulis's
 * branches are stout, whorled and ascending (Okafor 1983). The seedling flushes every five or six weeks; a grown tree
 * three times a year, its main flush in the dry season with the bloom.
 */
const TREE = {
	// the seedling's flushes: about every 6 weeks its first year (5–9 leaves in 4 months, S4)
	seedling: [0.1, 0.2, 0.31, 0.43, 0.56, 0.7, 0.84],
	firstFlush: 0.062, // the first leaves come out with the cotyledons
	calendar: (y) => (y < 4 ? [[0.05, 'rains'], [0.3, 'dry'], [0.55, 'spring'], [0.8, 'summer']] : [[0.1, 'rains'], [0.4, 'dry'], [0.75, 'spring']]),
	dur: 0.06, // a flush grows ~3 weeks
	internode: 0.028, // bearing shoots 1–3 cm [EST]; seedlings 4.9–6.1 cm (S16)
	firstTier: { ts: 1.3, low: 0.7, high: 1.05, n: [3, 5] }, // the first tier at ~0.8–1 m in the second year (sheet: ~0.9 m)
	cell: 0.65,
	cap: 2, // a tip with this many tips in its cell makes no new branch
	crowd: 4, // and with more than this it is shaded out and dies
	maxOrder: 9,
	tipRadius: 0.0026,
	pipe: 2.5,
	firstBloom: 5, // seedlings first flower at 4–6 years (PROTA): here its sixth bloom season
};

/** the trunk's diameter at 30 cm by age (years from sowing): 3 cm at 0.5 m at ~2 y (Kengue 2003), 10 at 5, 20 at 10 */
const TRUNK_D = [[0, 0.0025], [0.08, 0.003], [0.5, 0.007], [1, 0.013], [2, 0.032], [3, 0.052], [5, 0.1], [10, 0.2], [20, 0.35]];

/**
 * The room the crown grows into by age, from the data sheet: its height, its radius, and how high its skirt stays
 * (2 y 1.5 m; 3 y 2.5 m; 5 y 4.3 m and 4 m across; 10 y 7.2 m and 7 m across, the crown down to ~1.4 m; 20 y 10 m).
 * Dense, rounded to broadly ovoid, about as wide as tall; a shoot meeting its edge turns along it.
 */
const CROWN = { height: [[1, 0.9], [2, 1.6], [3, 2.6], [5, 4.4], [10, 7.3], [20, 10.5]], radius: [[1, 0.28], [2, 0.6], [3, 1.1], [5, 2.25], [10, 3.85], [20, 4.8]], skirt: [[2, 0.5], [3, 0.55], [5, 0.7], [10, 1.15], [20, 1.6]] };
function crownAt(t) {
	const H = straight(t, CROWN.height), R = straight(t, CROWN.radius), yb = straight(t, CROWN.skirt);
	return { H, R, yb, yc: lerp(yb, H, 0.5) };
}
/** how far a place is out of the crown's room: under 1 inside, 1 on its edge; and the way out of it there */
function crownOut(c, p) {
	const under = clamp((c.yc - p.y) / Math.max(0.1, c.yc - c.yb));
	const rr = Math.hypot(p.x, p.z) / (c.R * (1 - 0.18 * under * under));
	const up = Math.max(0, p.y - c.yc) / Math.max(0.1, c.H - c.yc);
	const f = Math.sqrt(rr * rr + up * up);
	const n = v3(p.x / c.R, (up / Math.max(0.1, c.H - c.yc)) * c.R, p.z / c.R);
	if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
	return { f, n: n.normalize() };
}

/** the flush events up to time t, in the order they happen (the same list at every t, cut where t is) */
function flushEvents(t) {
	const list = [];
	if (TREE.firstFlush <= t) list.push({ ts: TREE.firstFlush, dur: 0.05, kind: 'seed', i: 0 });
	TREE.seedling.forEach((ts, i) => ts <= t && list.push({ ts, dur: TREE.dur, kind: 'seed', i: i + 1 }));
	for (let y = 1; y <= Math.floor(t); y++) for (const [f, kind] of TREE.calendar(y)) if (y + f <= t) list.push({ ts: y + f, dur: TREE.dur, kind, year: y });
	return list;
}
const flushGrown = (e, t) => span(t, e.ts, e.ts + e.dur);

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

/** the size and leaflet pairs of a leaf by the tree's age when it formed: the seedling's small, few-paired leaves first */
const leafSize = (t) => table(t, [[0.07, 0.3], [0.3, 0.45], [0.6, 0.55], [1, 0.65], [2, 0.8], [4, 0.92], [6, 1]]);
const leafPairs = (t) => Math.round(table(t, [[0.07, 1.4], [0.3, 2.5], [0.7, 3.5], [1.5, 4.5], [3, 5.5], [5, 6.2]]));

/**
 * The tree's axes, simulated flush by flush up to time t. Each decision (a tier of branches, a shoot shaded out) is
 * made at a flush's start from what the tree was then, and each axis draws its own chance, so the tree at an earlier t
 * is the first part of the tree at a later one; the flush growing at t is laid out whole and drawn as far as it has grown.
 */
function simulate(seedKey, t) {
	const all = [];
	const tr = chance(seedKey, 'tree');
	const vigourTree = about(tr, 1, 0.06);
	const leanA = tr() * Math.PI * 2;
	const lean = v3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(0.03 + tr() * 0.03);
	const top0 = SA.hypocotyl.length;
	const make = (key, parent, sp, from, dir, e, order, vigour) => {
		const ax = { key, parent, sp, order, vigour, born: e ? e.ts : 0, pts: [from.clone()], dir0: dir.clone().normalize(), d: dir.clone().normalize(), nodes: [], flushes: [], len: 0, alive: true, died: Infinity, kids: [], r: chance(seedKey, 'axis', ...key) };
		ax.phase = ax.r() * Math.PI * 2;
		all.push(ax);
		if (parent) parent.kids.push(ax);
		return ax;
	};
	// the trunk starts at the top of the hypocotyl (the epicotyl): the hypocotyl itself is drawn as its first part
	const trunk = make(['trunk'], null, 0, v3(0, -SA.seed.depth, 0), UP, null, 0, 1);
	trunk.pts.push(v3(0, top0 * 0.5, 0), v3(0, top0, 0));
	trunk.len = trunk.pts[1].distanceTo(trunk.pts[0]) + top0 * 0.5;
	trunk.flushes.push({ e: { ts: 0.03, dur: 0.045, kind: 'germ' }, s0: 0, s1: trunk.len });

	const cellOf = (p) => `${Math.floor(p.x / TREE.cell)},${Math.floor(p.y / TREE.cell)},${Math.floor(p.z / TREE.cell)}`;
	const tipOf = (ax) => ax.pts[ax.pts.length - 1];

	/** one flush of one axis: its length, its path step by step, its nodes */
	const grow = (ax, e) => {
		const r = ax.r;
		let len;
		if (e.kind === 'seed') len = ax.order === 0 ? (e.i === 0 ? 0.025 : 0.09) * about(r, 1, 0.08) : 0;
		else {
			const y = e.ts;
			const base = y < 2 ? 0.17 : y < 4 ? 0.2 : y < 7 ? 0.18 : 0.17;
			const kind = e.kind === 'dry' ? 1.15 : e.kind === 'rains' ? 1 : 0.85;
			const lead = ax.order === 0 ? (y < 4 ? 1.15 : y < 6 ? 0.95 : 0.8) : 1;
			len = base * kind * lead * Math.pow(0.9, Math.max(0, ax.order - 1)) * ax.vigour * vigourTree * about(r, 1, 0.15);
		}
		if (len < 0.012) {
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
			if (ax.order === 0) d.add(v3(lean.x * 0.1 + about(r, 0, 0.03), 0.35, lean.z * 0.1 + about(r, 0, 0.03)));
			else {
				// orthotropic: each branch keeps its heading and turns up toward the light (Rauh's model), the lower
				// ones held out wider by their own weight, the outer tips arching a little
				const out = p.clone().setY(0);
				if (out.lengthSq() > 1e-6) out.normalize();
				const low = 1 - smooth((p.y - room.yb) / Math.max(0.3, room.H - room.yb));
				const sag = Math.min(0.09, 0.0045 * ax.len * (1 + 0.4 * ax.order)) * lerp(0.6, 1.8, low);
				d.addScaledVector(ax.dir0, 0.05).addScaledVector(out, 0.012);
				d.y += (ax.up ?? 0.035) - sag;
				d.x += about(r, 0, 0.05);
				d.z += about(r, 0, 0.05);
				if (p.y < room.yb * 0.7 && d.y < 0.05) d.y = 0.05;
			}
			d.normalize();
			if (e.kind !== 'seed') {
				const o = crownOut(room, p);
				if (o.f > 1.06 && k > 0) break;
				if (o.f > 0.9) {
					const into = d.dot(o.n);
					if (into > 0) d.addScaledVector(o.n, -into * smooth((o.f - 0.9) / 0.12)).normalize();
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
		// its nodes: a bare stretch at the flush's foot (the cataphylls' scars), the leaves crowded toward its tip, two
		// fifths of a turn apart; the seedling's first two leaves together, as a pair
		const seedling = e.kind === 'seed';
		const first = seedling && e.i === 0;
		const n = first ? 2 : seedling ? 2 + Math.floor(r() * 2) : Math.round(clamp(len / TREE.internode, 2, e.ts < 5 ? 4 : 3));
		const size = leafSize(e.ts) * (ax.order >= 3 ? 0.92 : 1);
		const pairs = leafPairs(e.ts);
		const flushI = ax.flushes.length;
		for (let j = 1; j <= n; j++) {
			const s = first ? s0 + 0.004 : s0 + len * (0.3 + 0.7 * Math.pow(j / n, 0.75));
			const p = pointAt(ax, s);
			const i = ax.nodes.length;
			ax.nodes.push({
				i,
				s,
				at: p.at,
				dir: p.dir,
				flush: flushI,
				formed: first ? e.ts : e.ts + e.dur * Math.pow(j / n, 0.9) * 0.9,
				bearing: first ? ax.phase + j * Math.PI : ax.phase + i * 2.513,
				size: size * about(r, 1, 0.08),
				pairs,
				// a young tree keeps its leaves longer (1–2 years, as the species is estimated); a grown one's crown is
				// held to a rosette of the last flushes at the shoot tips
				life: between(r, SA.leaf.life[0], SA.leaf.life[1]) * (e.ts < 6 ? 1.6 : 1),
			});
		}
		ax.flushes.push({ e, s0, s1: ax.len });
	};

	/** a tier: the branches an axis puts out at a flush, from the axils at the top of its last flush */
	const tier = (ax, e, tips, n, angle, vig, up) => {
		const r = ax.r;
		const last = ax.nodes.filter((nd) => nd.flush === ax.flushes.length - 1);
		if (last.length < 2) return;
		for (let k = 0; k < n; k++) {
			const node = last[Math.max(0, last.length - 1 - (k % last.length))];
			const bearing = ax.phase + (k / n) * Math.PI * 2 + about(r, 0, 0.35) + ax.flushes.length * 0.9;
			let side = across(node.dir).applyAxisAngle(node.dir, bearing);
			const out = node.at.clone().setY(0);
			if (out.lengthSq() > 1e-4 && ax.order > 0) side.lerp(out.normalize(), 0.35).normalize();
			const a = angle + about(r, 0, 0.12);
			const d0 = node.dir.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).normalize();
			const v = vig * about(r, 1, 0.12);
			if ((tips.get(cellOf(node.at)) ?? 0) >= TREE.cap || v < 0.3) continue;
			const b = make([...ax.key, node.i, k], ax, node.s, node.at, d0, e, ax.order + 1, v);
			b.up = up;
		}
	};

	for (const e of flushEvents(t)) {
		const tips = new Map();
		for (const ax of all) if (ax.alive) tips.set(cellOf(tipOf(ax)), (tips.get(cellOf(tipOf(ax))) ?? 0) + 1);
		const now = all.filter((ax) => ax.alive);
		for (const ax of now) {
			const crowd = tips.get(cellOf(tipOf(ax))) ?? 0;
			const shade = ax.r();
			if (ax.order >= 2 && crowd > TREE.crowd && shade < 0.55) {
				const kill = (a) => {
					if (a.alive) (a.alive = false), (a.died = e.ts);
					a.kids.forEach(kill);
				};
				kill(ax);
				continue;
			}
			if (e.kind === 'seed') continue;
			const r = ax.r;
			if (ax === trunk) {
				// the trunk's tiers: the first in the second year at 0.7–1.05 m, then one at most flushes, 3–5 limbs each
				if (e.ts < TREE.firstTier.ts) continue;
				const roll = r();
				const n = e.ts < TREE.firstTier.ts + 0.3 ? TREE.firstTier.n[0] + Math.floor(roll * 3) : roll < 0.3 ? 0 : 2 + Math.floor(r() * 3);
				const tierH = tipOf(ax).y;
				// the lower tiers wider and more vigorous, the upper ones steeper (a dome, not a broom)
				const low = 1 - smooth((tierH - 0.8) / 4);
				tier(ax, e, tips, n, lerp(0.95, 1.3, low), lerp(0.85, 1.1, low), lerp(0.024, 0.012, low));
			} else if (ax.order < TREE.maxOrder) {
				const roll = r();
				const P = ax.vigour > 0.5 ? [0.12, 0.45, 0.85, 1] : [0.3, 0.78, 1, 1];
				const n = P.findIndex((p) => roll < p);
				if (n > 0) tier(ax, e, tips, n, between(r, 0.6, 1.0), ax.vigour * between(r, 0.7, 0.9), (ax.up ?? 0.03) * 0.9);
			}
		}
		for (const ax of all) if (ax.alive) grow(ax, e);
	}
	return { all, trunk };
}

/**
 * How thick each axis is along it, as far as it has grown at t: the pipe model (the wood at a place carries what all
 * the shoots beyond it need, r^2.5 summed), then the whole tree scaled so its trunk at 30 cm (or half way up where
 * it is shorter) has the girth of its age (TRUNK_D), no shoot thinner than a young one.
 */
function thicken(all, trunk, t) {
	for (const ax of all) {
		const full = ax.pathLen ?? (ax.pathLen = lengths(ax.pts));
		ax.shown = t > ax.died + 0.8 ? 0 : Math.min(full[full.length - 1], ax === trunk ? Math.max(lengthAt(ax, t), 0) : lengthAt(ax, t));
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
			ax.q[i] = L[i] > ax.shown ? 0 : Math.pow(TREE.tipRadius, P) + acc + 4e-7 * beyond;
		}
	};
	for (const ax of all) ax.q = null;
	walk(trunk);
	// measured at 30 cm above the soil, or half way up a stem still shorter (avocado v3's lesson)
	const above = SA.seed.depth;
	const at30 = pointAt(trunk, Math.min(0.3 + above, Math.max(0.005, trunk.shown * 0.5))).i;
	const raw = Math.pow(trunk.q[Math.min(trunk.q.length - 1, at30)], 1 / P);
	const k = straight(t, TRUNK_D) / 2 / Math.max(1e-6, raw);
	for (const ax of all) ax.rad = (ax.q ?? new Array(ax.pts.length).fill(0)).map((q) => Math.max(q > 0 ? 0.0012 : 0, Math.pow(q, 1 / P) * k));
}

/** the wood's colour by its age (years) and radius: green and rusty-downy shoots, grey-green young bark, pale grey */
function barkColour(age, r) {
	const B = SA.bark;
	const c = mix(B.shoot, B.rust, 0.45 * (1 - span(age, 0.1, 0.5)));
	c.lerp(B.young, span(age, 0.25, 1.2));
	c.lerp(B.old, span(r, 0.012, 0.04));
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
	const step = isTrunk ? clamp(R0 * 0.7, 0.006, 0.07) : R0 > 0.015 ? clamp(R0 * 1.6, 0.03, 0.1) : clamp(R0 * 50, 0.08, 0.2);
	const count = Math.max(2, Math.ceil(total / step));
	const pts = [], ss = [];
	for (let k = 0; k <= count; k++) {
		const s = (k / count) * total;
		ss.push(s);
		pts.push(pointAt(ax, s).at);
	}
	const sides = Math.round(clamp(R0 * (R0 > 0.015 ? 400 : 700), R0 < 0.004 ? 3 : R0 < 0.007 ? 4 : 5, 22));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const flare = isTrunk ? span(t, 2, 8) : 0;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			const h = pts[0].y + s;
			// the foot flaring into its roots; the bole shallowly fluted (PROTA), no buttresses
			r *= 1 + 0.35 * flare * Math.exp(-Math.max(0, h) / 0.18) * (0.85 + 0.25 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			r *= 1 + 0.035 * flare * Math.cos(v * Math.PI * 2 * 7 + nsAx + s * 0.6);
		}
		if (ax.parent && s < r * 2.5) r *= 1 + 0.2 * (1 - s / (r * 2.5));
		if (r > 0.02) r *= 1 + 0.04 * (fbm(Math.cos(v * 6.283) * 3, s * 6, Math.sin(v * 6.283) * 3, 2, nsAx) - 0.5);
		return r;
	};
	const kind = R0 > 0.012 ? 'bark' : 'twig';
	const lift = lifted(kind === 'bark' ? 'barkMap' : 'twigMap');
	const paint = (u, v, s) => {
		const c = barkColour(t - formedAt(s), radiusAt(s));
		// the hypocotyl's reddish foot, green above; what is under the soil, root-coloured
		if (isTrunk && t < 0.5 && s < SA.hypocotyl.length + SA.seed.depth) c.copy(mix(SA.hypocotyl.red, SA.hypocotyl.colour, span(s, 0.02, 0.06)));
		if (isTrunk && pts[0].y + s < 0) c.lerp(SA.bark.root, 0.7);
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
	// the resin: small whitish drops hardened on the old bark (the "tears" of Dacryodes)
	if (isTrunk && R0 > 0.04) {
		const rr = chance(String(nsAx), 'resin');
		const drops = Math.round(lerp(4, 22, span(R0, 0.04, 0.12)) * (DETAIL.level >= 0.5 ? 1 : 0));
		for (let i = 0; i < drops; i++) {
			const s = between(rr, 0.15, Math.min(total * 0.8, 1.4));
			const v = rr();
			const p = pointAt(ax, s);
			const sd = across(p.dir).applyAxisAngle(p.dir, v * Math.PI * 2);
			const rad = radius(0, v, s);
			const size = between(rr, 0.002, 0.005);
			bag.add('body', bead(p.at.clone().addScaledVector(sd, rad + size * 0.3), v3(size, size * 1.5, size), mix(SA.bark.resin, SA.bark.old, rr() * 0.4), 4));
		}
	}
}

/** the roots: the strong taproot first (still almost the only root at 8–9 months, S3), then laterals in the top 0.3–0.5 m */
function roots(bag, seedKey, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed: seedKey,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.02, -1, 0.03),
		length: 2.2,
		grown: table(t, [[0, 0.004], [0.06, 0.03], [0.5, 0.14], [1, 0.25], [3, 0.5], [10, 1]]),
		radius: 0.003 + 0.05 * span(t, 0.5, 10),
		down: 0.05,
		wander: 0.08,
		laterals: 7,
		lateral: 0.25,
		depth: 2,
		age: span(t, 0.2, 2),
		young: SA.root.young,
		old: SA.root.old,
	});
	for (let i = 0; i < 9; i++) {
		const rr = chance(seedKey, 'lateral-root', i);
		const born = 0.6 + i * 0.25;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed: seedKey,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.02, -0.05 - rr() * 0.1, Math.sin(bear) * 0.02)),
			dir: v3(Math.cos(bear), -0.2 - rr() * 0.15, Math.sin(bear)),
			length: between(rr, 2, 3.5) * lerp(0.2, 1, span(t, 1, 10)),
			grown: (t - born) / 5,
			radius: 0.002 + 0.035 * span(t, born + 0.5, 10) * between(rr, 0.6, 1),
			down: 0.02,
			wander: 0.13,
			laterals: 6,
			lateral: 0.3,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.2) / 2,
			young: SA.root.young,
			old: SA.root.old,
			floor: -0.5,
		});
	}
}

/** how many fruit a tree carries to ripeness, by the year of its bloom: >30 kg at 5 y in good orchards, 20–50 kg on farms, 50 g each */
const CROP = [[5, 0], [6, 60], [7, 200], [8, 380], [10, 600], [15, 1200]];
/** how many of its shoot tips flower, by the year */
const BLOOM = [[5, 0.1], [6, 0.25], [8, 0.4], [10, 0.45]];
/** the bloom's peak in a year, in years after sowing on 1 August: late January */
const BLOOM_AT = 0.47;
/** fruit set, about two weeks after the bloom's peak (the embryo forms 15–40 days after anthesis, S8) */
const SET_AT = 0.04;

/**
 * The whole safou at time t (years from sowing): the seed, then the seedling on its cotyledons, the roots, the wood,
 * the leaves of the last flushes, and what the season puts on it: panicles near the shoot tips in the dry season,
 * clusters of fruit set from a few of their flowers, swelling where they hang and ripening some 145 days after.
 */
function safouTree(t, seedKey) {
	const bag = new Bag();
	const ns = hashText(seedKey) % 997;
	const S = SA.seed;
	const seedAt = v3(0, -S.depth, 0);
	const germ = span(t, 0.025, 0.06); // the hypocotyl's hook comes up at 12–21 days and straightens
	if (t < 0.045) {
		// the seed in the soil, its radicle out; then the cotyledons pulled up out of their pellicle
		const lifted0 = span(t, 0.03, 0.045);
		seed(bag, seedAt.clone().add(v3(0, lifted0 * 0.03, 0)), span(t, 0, 0.03), seedKey);
	}
	roots(bag, seedKey, t, seedAt.clone().add(v3(0, -0.005, 0)));
	if (t < 0.03) return bag.build();

	const { all, trunk } = simulate(seedKey, t);
	thicken(all, trunk, t);
	// the germinating shoot: the hypocotyl as a hook until it straightens
	if (t < 0.06) {
		const top = v3(0, -S.depth + (S.depth + SA.hypocotyl.length) * germ, 0);
		const hook = 1 - span(t, 0.045, 0.06);
		const pts = [];
		for (let i = 0; i <= 8; i++) {
			const u = i / 8;
			pts.push(v3(Math.sin(u * Math.PI) * 0.012 * hook, lerp(-S.depth, top.y, u) - hook * 0.01 * u * u, 0));
		}
		bag.add('twig', tube(pts, (u) => lerp(0.0022, 0.0019, u), (u) => mix(SA.hypocotyl.red, SA.hypocotyl.colour, u), 6, false));
		const g = cotyledon({ open: 0.15, dry: 0 });
		for (const sgn of [1, -1]) bag.add('body', g.clone(), aimFace(top, v3(0, -1, 0).addScaledVector(v3(sgn * 0.3, 0, 0), 1).normalize(), v3(sgn, 0, 0)));
		g.dispose();
		return bag.build();
	}
	for (const ax of all) wood(bag, ax, t, ns);

	// the cotyledons, open on top of the hypocotyl until they shrivel and fall at three to five months
	const Co = SA.cotyledon;
	if (t < Co.fall[1]) {
		const top = v3(0, SA.hypocotyl.length, 0);
		const dry = span(t, Co.fall[0] - 0.08, Co.fall[1]);
		const g = cotyledon({ open: span(t, 0.045, 0.07), dry });
		const turn = chance(seedKey, 'cotyledons')() * Math.PI;
		for (const sgn of [1, -1]) {
			if (t > lerp(Co.fall[0], Co.fall[1], sgn > 0 ? 0.4 : 1)) continue;
			const out = v3(Math.cos(turn) * sgn, 0, Math.sin(turn) * sgn);
			const d = out.clone().addScaledVector(UP, lerp(0.35, -0.6, dry)).normalize();
			bag.add('body', g.clone(), aimFace(top.clone().addScaledVector(out, 0.003), d, UP));
		}
		g.dispose();
	}

	// the wood in the space, for the fruit to hang clear of
	const space = bag.space;
	for (const ax of all) {
		if (ax.shown < 0.01) continue;
		const pts = [];
		for (let i = 0; i < ax.pts.length && ax.pathLen[i] <= ax.shown; i += 2) pts.push(ax.pts[i]);
		if (pts.length > 1) space.rod(pts, (u) => (ax.rad[Math.round(u * (pts.length - 1)) * 2] ?? 0.002) + 0.004);
	}

	// the season: panicles in the dry season, clusters of fruit from their set to ripe
	const year = Math.floor(t - BLOOM_AT + 0.15);
	for (const y of [year - 1, year]) {
		if (y < TREE.firstBloom) continue;
		const bloom = y + BLOOM_AT;
		const phase = t - bloom;
		const showFlowers = phase > -0.08 && phase < 0.08;
		const showFruit = phase > SET_AT && phase < SET_AT + SA.fruit.days / 365 + 0.08;
		if (!showFlowers && !showFruit) continue;
		const pf = straight(y, BLOOM);
		const at = bloom - 0.1;
		// the tree fruits on its sunlit crown: shoots whose tips stood near its face at the bloom
		const room = crownAt(bloom);
		const flowering = all.filter((ax) => ax.order >= 1 && ax.born < at && ax.died > bloom && lengthAt(ax, at) > 0.05 && crownOut(room, pointAt(ax, lengthAt(ax, at)).at).f > 0.72 && chance(seedKey, 'bloom', y, ...ax.key)() < pf);
		const crop = straight(y, CROP);
		const days = (phase - SET_AT) * 365;
		for (const ax of flowering) {
			const sAt = Math.min(ax.shown, lengthAt(ax, at));
			const p = pointAt(ax, sAt);
			const rr = chance(seedKey, 'set', y, ...ax.key);
			const key = [y, ...ax.key];
			if (showFlowers && phase < SET_AT) {
				panicle(bag, seedKey, key, p.at, p.dir, phase);
				continue;
			}
			if (!showFruit) continue;
			// fruit set on a share of the panicles; most clusters keep 3–15 fruit to ripeness [EST], more fruitlets set
			const share = crop / 7 / Math.max(1, flowering.length);
			const x = rr();
			if (x > Math.min(0.95, share * 1.4)) {
				if (phase < 0.08) panicle(bag, seedKey, key, p.at, p.dir, phase);
				continue;
			}
			const keep = Math.max(1, Math.round(between(rr, 3, 11)));
			const set = keep + Math.round(between(rr, 2, 6));
			const n = days < 50 ? set : keep;
			// the cluster hangs from the tip, where it finds room for its fruit
			const hang = space.settle(p.at, p.dir.clone().multiplyScalar(0.3).add(across(p.dir).applyAxisAngle(p.dir, rr() * 6.28)).normalize(), (c, d) => [{ c: c.clone().addScaledVector(d, 0.06).add(v3(0, -0.06, 0)), r: 0.06 }], 0.03);
			cluster(bag, seedKey, [y, ...ax.key, 'fruit'], hang.at, hang.dir, n, days, keep, DETAIL.fruit);
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
			const young = t < 1.2;
			// the seedling's first two leaves stand up between the cotyledons, small
			const firstPair = ax === trunk && n.i < 2 && n.flush === 1;
			compoundLeaf(bag, { at, out: side.clone().addScaledVector(n.dir, 0.25).normalize(), size: firstPair ? 0.2 : n.size, pairs: firstPair ? 2 : n.pairs, age, life, r, rise: firstPair ? 1.25 : young ? 0.6 : 0.85, bend: firstPair ? 0.5 : young ? 0.6 : 0.95, limp: firstPair ? 0.15 : 1, coarse: n.formed > 4 });
		}
	}
	return bag.build();
}
/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the fresh seed sown to ripe fruit; `t` the years since sowing each is grown at (between two stages,
 * on the way). The bearing season is the tree's tenth year: the bloom in late January, the set two weeks after, ripe
 * some 145 days later, in June.
 */
const B = 9 + BLOOM_AT; // the bloom of the tenth year
const SET = B + SET_AT;
const STAGES = [
	{ name: 'Seed', t: 0, note: 'A fresh seed, sown at once in August (it will not keep: dried or chilled, it dies): about 4.5 × 2 cm, oblong, its thin pellicle light green and a little pink, lying on its side 2 cm under the soil, its root already pushing out. There is no hard stone: the seed is two fleshy folded green cotyledons.' },
	{ name: 'Germination', t: 0.09, note: 'A month: germination is epigeal: a reddish-green hypocotyl 6 cm tall has lifted the two thick light-green cotyledons above the soil, each spread into four or five finger-like lobes, and between them the first two leaves came together, small pinnate leaves of one or two pairs of leaflets, rose-violet as they unfold. A white taproot goes straight down.' },
	{ name: 'Seedling', t: 0.5, note: 'Six months, about 0.5 m: one stem grown flush after flush, every five or six weeks a few compound leaves of three to four pairs of leaflets, the newest rose-violet and limp; the cotyledons have shrivelled and fallen. Ready to plant out at eight to ten months; the taproot is still almost the only root.' },
	{ name: 'Young tree', t: 2.1, note: 'Two years, about 1.6 m: its first tier of three to five stout ascending branches at 0.7–1 m (Rauh’s model: every axis grows upright in flushes, its branches in tiers from the top of a flush), its stem about 3 cm thick at 0.5 m; leaves of five pairs, 30 cm.' },
	{ name: 'Five years', t: 5.2, note: 'Five years: about 4.3 m high and 4 m across, branched low into tiers of ascending limbs, a dense rounded crown of glossy dark-green compound leaves, each flush rose-violet as it comes. Seedling trees first flower now, at four to six years.' },
	{ name: 'Flowering', t: B, note: 'The bloom of its tenth year, late January in the dry season: about 7 m high and 7 m across, the crown dense and rounded down to some 1.4 m off the ground, the trunk 20 cm across, pale grey, scaly, weeping drops of whitish resin. A female tree: short rust-brown panicles near the shoot tips, their small flowers cream-yellow inside, after the new flush.' },
	{ name: 'Fruit set', t: SET + 21 / 365, note: 'Three weeks after the set: the flowers spent, small green fruitlets with pink tips on the woody panicles, more than will stay: many drop in the coming weeks (and Carpophilus beetles bore some at about 45 days).' },
	{ name: 'Pink fruit', t: SET + 98 / 365, note: 'Fourteen weeks: the fruit at full length, rose-pink, 7.5 × 3.6 cm, long and cylindrical with round ends, in loose clusters of three to eleven hanging under the leaves; still hard, still pink while they fill.' },
	{ name: 'Turning', t: SET + 128 / 365, note: 'Some 18 weeks: in their last three to five weeks the fruit darken, blue-violet from the tip and in patches over the pink. The harvest is judged by this change from pink to bluish.' },
	{ name: 'Ripe', t: SET + SA.fruit.days / 365, note: 'June, about 145 days from set: clusters of ripe safous, deep blue-black to violet-black, thin-skinned, glossy, with a pale bloom in patches, 7.5 × 3.6 cm and 50 g; inside, 6 mm of pale green buttery flesh round a long light-green seed. They hang on the tree a long time; roasted or boiled, they are bush butter.' },
];

/** the years since sowing at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => safouTree(timeAt(stage), `${seed ?? 'maia'}`);

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

/** the fruit the tree carries to ripeness, and which of the well-grown ones the seed picks */
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

/** one fruit at a stage, on its own: its pedicel at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This fruit has not set yet: it is a flower until early February.');
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
	id: 'safou',
	label: 'Safou · Dacryodes edulis',
	latin: 'Dacryodes edulis (G.Don) H.J.Lam var. edulis (Burseraceae) · safou, safoutier, prunier · African pear, bush butter · atanga, ube, nsafu',
	note: 'The safou of Cameroon’s and Nigeria’s home gardens and cocoa farms, the large-fruited var. edulis, a female seedling tree: a dense evergreen tree branched low into tiers of stout ascending limbs (Rauh’s model), glossy dark-green compound leaves of six pairs and one, every flush rose-violet; short rust-brown panicles of small cream-yellow flowers in the dry season; long cylindrical fruit like big olives, 7.5 × 3.6 cm and 50 g, pink while they grow and blue-black when ripe, some 145 days from set, with pale green buttery flesh.',
	from: 'Tree · from a fresh seed, bearing from its fifth or sixth year',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '3424d1651c7c517f690f885f945a550c1c57b36626320c4f8ac7af1e53389e68', model: 'fal-ai/nano-banana-pro (+ /edit; the fruit row from a fruit plate, 05aad80b…)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from sowing
	// what a world needs to plant it right; data sheet safou-dacryodes-edulis.md, S1–S21
	facts: {
		height: { at1: [0.7, 1], at2: [1.2, 1.8], at5: [3.5, 5], at10: [6, 9], at20: [8, 12], forest: [18, 25], unit: 'm' },
		crownWidth: { at5: [3, 5], at10: [6, 8], at20: [8, 10], unit: 'm' },
		trunkDiameter: { at2: 0.03, at5: [0.08, 0.12], at10: [0.18, 0.25], at20: [0.3, 0.4], unit: 'm' },
		spacing: [8, 12], // 10 × 10 m in wet forest zones, 10 × 8 m medium rain, 6 × 8 m humid savanna; crowns close at 5–8 y
		shade: 'seedlings under ~50 % shade; grown trees in full sun or light shade (sources differ)',
		climate: 'humid tropics, 0–1,000 m (to ~2,000 m in western Cameroon), 1,400–4,000 mm rain, mean 23–25 °C; tolerates up to 4 dry months',
		years: { plantedOut: [0.7, 0.9], firstFlowers: [4, 6], fullBearing: [10, 15], productiveLife: 50, marcottFruits: 1.5 },
		flushes: { seedling: 'every 5–6 weeks', grown: 3, leavesPerFlush: [3, 8] },
		leaf: { length: [0.3, 0.5], leaflets: [11, 19], leaflet: [0.1, 0.16], leafletWidth: [0.04, 0.06], life: [1.2, 2], unit: 'm, years' },
		flower: { diameter: 0.005, panicle: [0.1, 0.4], perInflorescence: [21, 110], sex: 'dioecious (female, male, rarely hermaphrodite trees)', season: 'January–February (north of the equator)' },
		fruit: { length: [0.05, 0.12], diameter: [0.025, 0.05], mass: [0.02, 0.1], model: { length: 0.075, diameter: 0.036, mass: 0.05 }, flesh: [0.0035, 0.009], daysSetToRipe: [126, 182], perCluster: [3, 15], harvest: 'June–November', unit: 'm, kg, days' },
		seed: { length: [0.042, 0.047], width: [0.018, 0.022], mass: [0.01, 0.014], germinationDays: [12, 21], germination: 'epigeal', recalcitrant: true, unit: 'm, kg' },
		yield: { at5orchard: 30, farm: [20, 50], at20: 110, unit: 'kg a tree' },
		roots: { taproot: [1.5, 3], lateralsIn: [0.3, 0.5], unit: 'm' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the tree, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'safou' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'safou',
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
module.exports.organs = { SA, TREE, seed, cotyledon, compoundLeaf, leafletHalf, sheet, flower, blossom, panicle, fruitBody, fruitStalk, fruitLength, fruitColour, cluster, simulate, thicken, safouTree, grow, Bag, timeAt, STAGES, surface, lite, detailAt, sound, aimFace };
