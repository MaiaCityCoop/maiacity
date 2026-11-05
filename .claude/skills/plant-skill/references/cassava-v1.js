'use strict';
/*
 * CASSAVA 'TME 419' — Manihot esculenta Crantz 'TME 419' (TMEB419, NICASS 20; IITA, Nigeria): the leading improved
 * cassava of Africa, a "sweet" white-fleshed clone for gari and fufu, resistant to cassava mosaic disease (CMD2).
 * Version 1 of plants/cassava: one named clone, grown from a 25 cm stem cutting through one season to its harvest of
 * storage roots at twelve months.
 *
 * Its numbers are TME 419's where they were measured (Aiyelari et al. 2019, Akure: height, stem girth and living
 * leaves at 4–24 weeks, its roots at harvest, 9.6 a plant, 44 cm, 4.9 kg; Rüscher et al. 2021, Ibadan: storage roots
 * swelling from 30–38 days; the Cassava Seed Tracker's characterisation: green petiole, brown stem, lanceolate lobe,
 * brown root skin, light-yellow cortex, white flesh, a short neck; Oluwasanya et al. 2021, Hyde & Setter 2020, 2022:
 * late and minimal flowering) and the species' otherwise (Alves 2002; Fukuda et al. 2010; IITA's growing guides). Every
 * number with its source: plant-skill's data sheet for it (references/cassava-tme-419.md).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its two root cells redrawn, kept on play by its hash (3e3fc7ad…): its lobe and root outlines and its
 * colours traced off its panels.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots, sound()),
 *                   as plum v2 carries it from banana v2 (mipmapped pictures, leaf undersides with their own normals,
 *                   colours parsed once), with cassava's materials and surfaces: lobe veins, cane striae, root skin.
 *   2. ORGANS       TME 419's own, each to its measure: the palmate leaf (its lobes traced), the leaf scar, the flower,
 *                   the panicle, the six-winged capsule, the storage root (its profile traced), the cut faces.
 *   3. THE PLANT    the cutting, its canes node by node (2/5 spiral, leaves living their real life so the cane below
 *                   the crown is bare and scarred), the late fork where it flowers, the fibrous and storage roots.
 *   4. RECIPE       its stages, its params, the fruit view (one storage root), and `module.exports.recipe`.
 *
 * Everything in metres. Time in days from planting the cutting.
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
const DETAIL = { level: 1, roots: true, thin: 1, fill: 1, finest: 0, fruit: false, storage: false, noShoot: false };

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
		// a cassava has a hundred-odd big leaves: a crowd keeps more of them than of a tree's thousands
		[0.1, 0.2, 1.5, 0.004],
		[0.25, 0.5, 1.25, 0.0016],
		[0.5, 0.7, 1.12, 0.0008],
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
 * What vertex colours cannot carry, a few small pictures made once from noise and kept: the veins of a lobe, the
 * striae of the cane, the corky skin of a storage root. Laid on by the shape's UVs (a lobe's own, the cane's and the
 * root's in metres: `metric`), mipmapped. Colour pictures multiply the vertex colours; no bump pictures (see
 * MATERIALS). Only at detail 0.5 and over: a crowd far off draws plain colours.
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
 *   leafMap   one lobe in its own coordinates (u along it from the junction, v across from edge to edge, the midrib at
 *             v = ½): the pale yellow-green midrib, some thirteen pairs of fine secondaries leaving it at about 55° and
 *             arching toward the tip near the margin (the sheet's leaf, both faces), a faint net between
 *   caneMap   0.1 m of the cane along it by 0.1 m round it, laid on in metres: fine pale striae along it, small pale
 *             lenticels, a faint mottle (the sheet's three stem swatches)
 *   rootMap   0.1 m of a storage root's skin by 0.1 m round it, in metres: corky, fine dark wrinkles across it, short
 *             pale lenticel dashes across it, and patches where the outer skin flakes (the sheet's roots by age)
 * Colour pictures only (no bump: plum v2's lesson), mipmapped. A picture darker than white on average darkens its organ:
 * the organ's vertex colour is raised by the picture's mean where the picture is laid (`lifted`, as avocado v3's
 * LIFT, measured). The leaf's picture is kept at 0.4 over the blade so its midrib can be 2.5 times lighter.
 */
const lifted = (name) => (DETAIL.level >= 0.5 ? 1 / surface(name).userData.mean : 1);

function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 13;
	const vein = (x, y) => {
		const side = Math.abs(y - 0.5) * 2;
		// the secondaries alternate a little side to side; each leaves the midrib at ~55° (a lobe 3.7 times as long as
		// wide: 0.095 of its length forward for its half width) and arches toward the tip as it nears the margin
		const off = y > 0.5 ? 0.45 / VEINS : 0;
		const u0 = x - 0.095 * side - 0.1 * side * side - off;
		const ph = u0 * VEINS;
		const near = Math.abs(ph - Math.round(ph));
		const sec = Math.exp(-Math.pow(near / (0.07 * (1 - 0.4 * side)), 2)) * smooth((0.94 - side) / 0.12) * smooth(u0 / 0.03) * smooth((0.95 - x) / 0.08);
		const mid = Math.exp(-Math.pow((y - 0.5) / (0.03 * (1 - 0.7 * x) + 0.006), 2));
		const c = tileCells(x, y, 34, 8, 7);
		const net = smooth((0.07 - (c.f2 - c.f1)) / 0.06);
		return { sec, mid, net };
	};
	const make = {
		leafMap: () =>
			picture(512, 128, (x, y) => {
				const { sec, mid, net } = vein(x, y);
				const mottle = tileNoise(x, y, 14, 3) - 0.5;
				const k = 0.4 * (1 + 0.14 * sec + 0.06 * net + 0.08 * mottle);
				// the midrib pale yellow-green on both faces (the sheet: [0.38, 0.43, 0.08] on the upper face)
				const m = 0.9 * mid;
				return [lerp(k, 1, m), lerp(k, 0.95, m), lerp(k, 0.7, m)];
			}, true),
		caneMap: () =>
			picture(256, 256, (x, y) => {
				// x along the cane (0.1 m), y round it (0.1 m): striae every 2–3 mm, wandering a little
				const w = tileNoise(x, y, 3, 31, 2) - 0.5;
				const striae = Math.pow(Math.abs(Math.cos((y + w * 0.04) * Math.PI * 40)), 6);
				const c = tileCells(x, y, 9, 14, 33);
				const lent = c.id < 0.5 ? smooth((0.13 - c.f1) / 0.06) : 0;
				const mottle = tileNoise(x, y, 6, 35, 3) - 0.5;
				const k = 0.92 + 0.05 * striae + 0.08 * mottle + 0.12 * lent;
				return [k, k * 0.99, k * 0.96];
			}, true),
		rootMap: () =>
			picture(256, 256, (x, y) => {
				// x along the root (0.1 m), y round it (0.1 m)
				const w = tileNoise(x, y, 4, 41, 2) - 0.5;
				const wrinkle = Math.pow(Math.abs(Math.cos((x + w * 0.12) * Math.PI * 22)), 18) * smooth((tileNoise(x, y, 6, 43, 2) - 0.45) / 0.2);
				const c = tileCells(x, y, 16, 7, 45);
				const dx = Math.abs(c.f1);
				const dash = c.id < 0.45 ? smooth((0.12 - dx) / 0.05) : 0;
				const flake = smooth((tileNoise(x, y, 5, 47, 3) - 0.6) / 0.08);
				const grain = tileNoise(x, y, 40, 49, 2) - 0.5;
				const k = (0.95 - 0.16 * wrinkle + 0.1 * grain) * lerp(1, 0.84, flake);
				// the lenticels pale, the flaked patches a little redder where the inner skin shows
				return [k + 0.25 * dash + 0.03 * flake, k * 0.97 + 0.2 * dash, k * 0.94 + 0.14 * dash];
			}, true),
	}[name];
	const t = make();
	// its mean (linear, green channel), by which its organ's vertex colour is raised
	const d = t.image.data;
	let sum = 0;
	for (let i = 1; i < d.length; i += 4) {
		const c = d[i] / 255;
		sum += c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	}
	t.userData.mean = sum / (d.length / 4);
	return (SURFACES[name] = t);
}

/** a shape's UVs set in metres over a surface's tile: `fu` and `fv` the tile's repeats along u and v of it */
function metric(geo, fu, fv) {
	const uv = geo.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fu, uv.getY(i) * fv);
	uv.needsUpdate = true;
	return geo;
}

/**
 * The materials, made once, plain and with their surfaces. `cane` the stem and the cutting, matt, striate; `stalk`
 * the petioles and the soft green shoot tips, a faint shine; `leaf` a leaf's two faces (one-sided, each its own colour,
 * the underside with its own normals), no clearcoat (plum v2's lesson: glossy leaves go white at a grazing angle);
 * `root` the storage roots' corky brown skin; `sheet` thin things seen from both sides (flowers); `body` the fibrous
 * roots, buds, scars, the cut faces, capsules and seeds.
 */
const MATERIALS = {
	cane: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, ...(s && { map: s('caneMap') }) }),
	stalk: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, specularIntensity: 0.3, ...(s && { map: s('leafMap') }) }),
	root: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, ...(s && { map: s('rootMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};

const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['cane', 'stalk', 'body', 'leaf', 'root', 'sheet', 'prop'];
// a cassava's leaves are thinned whole, petiole and blade, by `thinLeaf` (part 2): nothing is thinned here by pieces
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
 * 2. ORGANS — TME 419's own, each to its measure (the species' where the clone was not measured)
 * ============================================================================================================== */

/** a colour from linear sRGB, as the sheet was traced (three's working colours) */
const lin = (r, g, b) => new THREE.Color(r, g, b);

/**
 * The clone's numbers: plant-skill's data sheet for it (references/cassava-tme-419.md, S1–S31). Colours traced off the
 * reference sheet (play keeps it by its hash, 3e3fc7ad…: sheet 1 of Nano Banana Pro with its two root cells redrawn),
 * linear sRGB, the median of each panel with its 10th and 90th percentiles as each organ's own spread; the checker's
 * greys came out grey (G 2–3 levels low).
 */
const CA = {
	// the planting cutting: 25 cm of 10–12-month stem, 2.5 cm thick, 6 nodes, slanted at 45°, two thirds buried (S6, S17,
	// S18; the sheet's row 1)
	cutting: { length: 0.25, radius: 0.0125, nodes: 6, slant: 45, buried: 2 / 3 },
	// the cane by age of its bark: the sheet's three swatches, young tip, three-month stem, old cane
	bark: { young: lin(0.162, 0.212, 0.03), mid: lin(0.283, 0.275, 0.202), old: lin(0.462, 0.337, 0.22), oldDark: lin(0.342, 0.22, 0.122), scar: lin(0.52, 0.42, 0.3), bud: lin(0.3, 0.2, 0.1) },
	// the cane cut across (the sheet's stem cross-section): skin, green cortex, cream wood, white pith
	cut: { skin: lin(0.296, 0.172, 0.093), cortex: lin(0.175, 0.159, 0.033), wood: lin(0.855, 0.694, 0.456), pith: lin(0.896, 0.761, 0.584) },
	// the leaf: the sheet's leaf upper side and underside, the shoot tip, the old leaf; petiole green (S1, S3)
	leaf: {
		lobe: 0.17, // the central lobe of a large leaf, m (14–18 cm, [EST] S19, S20)
		lobeAspect: 3.4, // 17 × 5 cm: lanceolate (S1), between the data sheet's ~3.7 : 1 [EST] and the sheet's 2.8 : 1; its outline the sheet's
		petiole: 1.45, // the petiole by the central lobe: 18–25 cm on large leaves (S19 [2nd], [EST]): 23 cm
		up: lin(0.048, 0.093, 0.033), up10: lin(0.04, 0.078, 0.022), up90: lin(0.067, 0.12, 0.045),
		under: lin(0.27, 0.292, 0.191), under10: lin(0.25, 0.275, 0.178), under90: lin(0.31, 0.33, 0.21),
		bright: lin(0.075, 0.16, 0.035), // the first expanded leaf: bright green (S1)
		unfolding: lin(0.552, 0.429, 0.112), // the unexpanded leaves at the tip: pale yellowish ('dark yellow', S1)
		yellow: lin(0.617, 0.462, 0.005), // an old leaf before it falls
		petioleGreen: lin(0.376, 0.434, 0.078), petioleUnder: lin(0.456, 0.479, 0.141),
	},
	// the storage root: the sheet's roots by age and cluster (skin), its cross-section (peel, flesh)
	root: { skin: lin(0.33, 0.15, 0.097), skin10: lin(0.25, 0.11, 0.068), skin90: lin(0.4, 0.19, 0.12), young: lin(0.45, 0.25, 0.16), peel: lin(0.82, 0.72, 0.5), flesh: lin(0.89, 0.84, 0.76), core: lin(0.86, 0.76, 0.6) },
	fibrous: { young: lin(0.8, 0.74, 0.6), old: lin(0.42, 0.28, 0.17) },
	flower: { tepal: lin(0.62, 0.62, 0.28), streak: lin(0.35, 0.08, 0.12), ovary: lin(0.2, 0.32, 0.05), stigma: lin(0.85, 0.85, 0.75), male: lin(0.75, 0.7, 0.35), disc: lin(0.75, 0.32, 0.04) },
	capsule: { green: lin(0.184, 0.242, 0.03), wing: lin(0.25, 0.3, 0.06), dry: lin(0.32, 0.22, 0.12) },
};

/**
 * The central lobe's half width along it (0 the junction … 1 the tip), as a part of its greatest: traced off the
 * sheet's leaf (upper side, its central lobe, 25 stations; below a sixth of its length its neighbours join it, there
 * drawn narrowing to the junction as the real lobes do). Widest at 0.62 of its length: lanceolate to oblanceolate.
 */
const LOBE_W = [0.08, 0.2, 0.3, 0.38, 0.417, 0.44, 0.514, 0.577, 0.63, 0.693, 0.757, 0.815, 0.878, 0.936, 0.978, 1, 0.983, 0.931, 0.843, 0.699, 0.519, 0.329, 0.169, 0.08, 0];
const lobeW = (u) => straight(clamp(u), LOBE_W.map((w, i) => [i / (LOBE_W.length - 1), w]));

/**
 * The lobes of a leaf by their count: each lobe's angle from the central one in the blade (degrees) and its length by
 * the central lobe's. Five as the sheet's leaf (0, ±45°, ±100°; 1, 0.94, 0.8), seven on the largest mid-season leaves,
 * three on the first small ones (S19 [2nd], S23; the sheet).
 */
const LOBES = {
	3: [[0, 1], [-52, 0.82], [52, 0.82]],
	5: [[0, 1], [-45, 0.94], [45, 0.94], [-100, 0.8], [100, 0.8]],
	7: [[0, 1], [-38, 0.93], [38, 0.93], [-80, 0.8], [80, 0.8], [-125, 0.48], [125, 0.48]],
};

/**
 * The storage root's half width along it, from its neck (0) to where its body ends (1), as a part of its greatest:
 * traced off the sheet's 12-month root (roots by age, sheet 5's redrawn cell, turned upright by 2°), its first 83 %
 * (the body: a stub of a neck a third as thick, the shoulders full by a sixth of its length, fullest a third of the way
 * down, then slowly narrowing and closing fast); past its body a root runs on as a thin tail into a fibrous root.
 */
const ROOT_W = [0.3, 0.32, 0.41, 0.59, 0.8, 0.91, 0.92, 0.94, 0.94, 0.95, 0.96, 0.97, 0.97, 0.96, 0.95, 0.93, 0.9, 0.87, 0.85, 0.84, 0.83, 0.8, 0.76, 0.7, 0.6, 0.42, 0.22];
const rootW = (u) => straight(clamp(u), ROOT_W.map((w, i) => [i / (ROOT_W.length - 1), w]));

/** a frame at `at` whose +X runs along `x` and whose +Y is as near `up` as it can be: for sheets laid in a blade */
function frame(at, x, up) {
	const X = x.clone().normalize();
	let Z = new THREE.Vector3().crossVectors(X, up);
	if (Z.lengthSq() < 1e-10) Z = across(X);
	Z.normalize();
	const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
	return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}

/**
 * A cut face: a flat disc at `at` facing `n`, of radius `r`, in bands of colour from its centre out (`bands`: [part of
 * the radius it reaches, colour]); the cutting's ends and a harvested root's neck.
 */
function cutFace(bag, at, n, r, bands, sides = 18) {
	sides = fewer(sides, 6);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const a = across(n), b = new THREE.Vector3().crossVectors(n, a).normalize();
	let inner = 0;
	for (const [outer, colour] of bands) {
		const base = pos.length / 3;
		const c = named(colour);
		for (const f of [inner, outer])
			for (let s = 0; s <= sides; s++) {
				const t = (s / sides) * Math.PI * 2;
				const p = at.clone().addScaledVector(a, Math.cos(t) * r * f).addScaledVector(b, Math.sin(t) * r * f);
				pos.push(p.x, p.y, p.z);
				nor.push(n.x, n.y, n.z);
				uv.push(f, s / sides);
				col.push(c.r, c.g, c.b);
			}
		for (let s = 0; s < sides; s++) {
			const i0 = base + s, i1 = base + sides + 1 + s;
			// wound so the face looks along n (the material is one-sided)
			if (inner > 0) idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
			else idx.push(i0, i1, i1 + 1);
		}
		inner = outer;
	}
	bag.add('body', made(pos, nor, uv, col, idx, false));
}

/**
 * One leaf at a node: its petiole from the cane's surface and its palmate blade, by its age `a` in days and its life.
 *   o: { at (on the cane's axis), out (horizontal unit vector, the leaf's side), r (cane radius there), size (1 the
 *        largest leaf), lobes (3, 5 or 7), a (days since it formed), life (days it lives), seed, key }
 * It unfolds over its first 12 days (the lobes folded together and pointing up, pale yellowish, opening to a bright
 * green hand), stands at 30–45° above level while young, goes level with age, then droops and yellows in its last two
 * weeks. Its whole geometry, petiole and blade, is added as one so a crowd keeps whole leaves (`thinLeaf`).
 */
function leaf(bag, o) {
	const r = chance(o.seed, 'leaf', ...o.key);
	const L = CA.leaf;
	const { a, life } = o;
	if (a < 0 || a > life) return;
	const keep = thinLeaf();
	if (!keep) return;
	const unfold = span(a, 0, 12);
	const grow = 0.18 + 0.82 * span(a, 0, 13);
	const old = span(a, life - 7, life);
	const lobe = CA.leaf.lobe * o.size * between(r, 0.9, 1.08) * grow * keep;
	const petiole = lobe * lerp(0.9, L.petiole, clamp((o.size - 0.3) / 0.5)) * between(r, 0.9, 1.1) * lerp(0.55, 1, span(a, 0, 16));
	// its angle above level: a young leaf stands up, a mature one near level, an old one droops
	const flat = !!o.flat; // on the organ bench: laid flat as the sheet's leaf, its petiole straight down the page
	const rise = flat ? 0 : THREE.MathUtils.degToRad(lerp(lerp(58, between(r, 20, 34), span(a, 4, 28)), between(r, -8, 4), span(a, 30, life * 0.85)) - 38 * old);
	const out = o.out.clone().normalize();
	const side = new THREE.Vector3().crossVectors(UP, out).normalize();
	// the petiole: from the cane's surface, rising, arching down toward the blade under its weight
	const sag = flat ? 0 : THREE.MathUtils.degToRad(lerp(8, 30, span(a, 10, 40)) + 25 * old);
	const pts = [];
	const n = 9;
	let p = o.at.clone().addScaledVector(out, o.r * 0.9);
	pts.push(p.clone());
	for (let i = 1; i <= n; i++) {
		const f = i / n;
		const e = rise - sag * Math.pow(f, 1.6);
		const d = out.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e));
		p = p.clone().addScaledVector(d, petiole / n);
		pts.push(p);
	}
	const end = pts[n];
	const tipDir = end.clone().sub(pts[n - 1]).normalize();
	const pc = mix(L.petioleGreen, L.yellow, old * 0.8);
	const pu = mix(L.petioleUnder, L.yellow, old);
	const pr = lerp(0.0011, 0.0024, clamp(o.size)) * (0.6 + 0.4 * grow);
	const geos = [];
	if (!o.bladeOnly) geos.push({
		kind: 'stalk',
		g: tube(pts, (u) => pr * (1.35 - 0.45 * u + 0.25 * Math.exp(-u * 30)), (u, v, s, d) => (d.y < 0 ? pu : pc), 5),
	});
	// the blade: its lobes radiate from the junction in a plane tilted down and outward, each lobe pitched below it
	const tilt = flat ? 0 : THREE.MathUtils.degToRad(lerp(-70, between(r, 4, 14), unfold) + 25 * old);
	const centre = out.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(UP, -Math.sin(tilt)).normalize();
	const normal = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(out, Math.sin(tilt)).normalize();
	// the blade's colours by age: pale yellowish unfolding, bright green, dark green, yellow before it falls
	const mature = mix(mix(L.up10, L.up90, r()), L.up, 0.5);
	const young = mix(L.unfolding, L.bright, span(a, 3, 11));
	const up = mix(mix(young, mature, span(a, 10, 30)), mix(L.yellow, mature, 0.3), old);
	const under = mix(mix(mix(L.under10, L.under90, r()), lin(0.42, 0.4, 0.15), 1 - span(a, 3, 14)), L.yellow, old * 0.9);
	const lift = lifted('leafMap');
	const lobeList = LOBES[o.lobes];
	for (const [deg, k, sweep = 0] of lobeList) {
		const phi = THREE.MathUtils.degToRad(deg) * lerp(0.08, 1, unfold) + (flat ? 0 : about(r, 0, 0.06));
		const len = lobe * k * (flat ? 1 : between(r, 0.94, 1.05));
		const w = (len / CA.leaf.lobeAspect) * lerp(0.35, 1, unfold);
		// side lobes droop more; a folded young lobe points up along the petiole
		const pitch = flat ? 0 : THREE.MathUtils.degToRad(lerp(0, 5 + Math.abs(deg) * 0.1 + 15 * old, unfold));
		const inPlane = centre.clone().multiplyScalar(Math.cos(phi)).addScaledVector(new THREE.Vector3().crossVectors(normal, centre).normalize(), Math.sin(phi));
		const dir = inPlane.multiplyScalar(Math.cos(pitch)).addScaledVector(normal, -Math.sin(pitch)).normalize();
		const fold = flat ? 0 : lerp(0.35, 0.05, unfold);
		const arch = flat ? 0 : lerp(0, 0.06, unfold) + 0.08 * old;
		const g = sheet({
			length: len,
			width: w / 2,
			shape: lobeW,
			lift: (u, v) => fold * Math.abs(v) * lobeW(u) / CA.leaf.lobeAspect - arch * u * u - 0.012 * v * v,
			paint: (u) => (lift === 1 ? up : up.clone().multiplyScalar(lift * (1 + 0.06 * (1 - u)))),
			back: () => (lift === 1 ? under : under.clone().multiplyScalar(lift)),
			backLit: false,
			along: 11,
			across: 4,
		});
		// a side lobe sweeps in the blade's plane: it leaves the junction steeper and turns toward the central lobe
		if (sweep) {
			const pa = g.attributes.position;
			const sg = Math.sign(deg);
			for (let i = 0; i < pa.count; i++) {
				const x = pa.getX(i) / len;
				pa.setZ(i, pa.getZ(i) - sg * sweep * len * x * x);
			}
			g.computeVertexNormals();
		}
		g.applyMatrix4(frame(end, dir, normal));
		geos.push({ kind: 'leaf', g });
	}
	for (const { kind, g } of geos) bag.add(kind, g);
	return { end, tipDir };
}

/**
 * The crowd's share of leaves: at detail under 1 only `thin` of them are drawn, each a little bigger to fill the gap
 * (whole leaves, petiole and blade, never single lobes). Gives the size factor of a leaf kept, or 0.
 */
const THIN = { carry: 0 };
function thinLeaf() {
	if (DETAIL.thin >= 1 && DETAIL.fill === 1) return 1;
	THIN.carry += DETAIL.thin;
	if (THIN.carry < 1) return 0;
	THIN.carry -= 1;
	return Math.min(1.6, (1 / Math.sqrt(DETAIL.thin)) * DETAIL.fill);
}

/** a fallen leaf's scar on the cane: a raised pale crescent, the bud above it */
function scar(bag, at, out, r, size, budSwell) {
	const w = r * lerp(0.5, 0.7, size) + 0.0018;
	const q = new THREE.Quaternion().setFromRotationMatrix(frame(v3(0, 0, 0), out, UP));
	bag.add('body', bead(at.clone().addScaledVector(out, r * 0.94), v3(w * 0.45, w * 0.5, w * 0.95), CA.bark.scar, 5, q));
	bag.add('body', bead(at.clone().addScaledVector(out, r * 0.85).addScaledVector(UP, w * 0.55), v3(w * 0.3, w * 0.38, w * 0.3).multiplyScalar(1 + budSwell), CA.bark.bud, 4, q));
}

/**
 * The flowers at a fork (rare in TME 419: S9–S11): a small panicle 6–10 cm, a few female flowers at its base, many
 * smaller male ones above, the females opening some ten days before the males (protogyny). `a` days since it showed.
 */
function panicle(bag, at, seed, a, capsules) {
	const r = chance(seed, 'panicle');
	const F = CA.flower;
	const len = 0.075 * span(a, 0, 12);
	if (len < 0.004) return;
	const dry = span(a, 40, 70);
	const stalkCol = mix(lin(0.25, 0.3, 0.06), lin(0.3, 0.22, 0.13), dry);
	const pts = [];
	for (let i = 0; i <= 6; i++) pts.push(at.clone().add(v3(0.004 * Math.sin(i), (i / 6) * len, 0.003 * Math.cos(i * 1.3))));
	bag.add('stalk', tube(pts, (u) => 0.0012 * (1 - 0.6 * u), () => stalkCol, 4));
	// the female flowers low on it, on long thick pedicels; each turns into a capsule if it sets
	const nf = 3;
	for (let i = 0; i < nf; i++) {
		const h = len * (0.1 + 0.1 * i);
		const out = v3(Math.cos(i * 2.2 + 0.4), 0, Math.sin(i * 2.2 + 0.4));
		const p0 = pts[0].clone().add(v3(0, h, 0));
		const dir = out.clone().multiplyScalar(0.8).add(v3(0, 0.6, 0)).normalize();
		const p1 = p0.clone().addScaledVector(dir, 0.018);
		bag.add('stalk', tube([p0, p1], () => 0.0008, () => stalkCol, 4));
		if (i < capsules) capsule(bag, p1, dir, a, seed, i);
		else if (a < 22) flower(bag, p1, dir, span(a, 0, 6) * (1 - span(a, 14, 22)), true, r);
	}
	// the male flowers above: buds, open 10–25 days after it showed, then fallen
	const nm = 14;
	for (let i = 0; i < nm; i++) {
		if (a > 34) break;
		const h = len * (0.4 + 0.6 * (i / nm));
		const t = i * 2.4;
		const out = v3(Math.cos(t), 0, Math.sin(t));
		const p0 = pts[0].clone().add(v3(0, h, 0));
		const dir = out.clone().multiplyScalar(0.7).add(v3(0, -0.2 + 0.5 * r(), 0)).normalize();
		const p1 = p0.clone().addScaledVector(dir, 0.008);
		bag.add('stalk', tube([p0, p1], () => 0.0004, () => stalkCol, 3));
		flower(bag, p1, dir, span(a, 8, 13) * (1 - span(a, 26, 34)), false, r);
	}
}

/** one flower: five tepals joined into a bell, the female's 1 cm with a ridged ovary, the male's 0.6 cm with its disc */
function flower(bag, at, dir, open, female, r) {
	const F = CA.flower;
	const size = female ? 0.01 : 0.0065;
	if (open <= 0.02) {
		bag.add('body', bead(at.clone().addScaledVector(dir, size * 0.3), v3(size * 0.3, size * 0.3, size * 0.3), female ? F.ovary : F.tepal, 4));
		return;
	}
	for (let i = 0; i < 5; i++) {
		const t = (i / 5) * Math.PI * 2;
		const a = across(dir), b = new THREE.Vector3().crossVectors(dir, a).normalize();
		const out = a.clone().multiplyScalar(Math.cos(t)).addScaledVector(b, Math.sin(t));
		const d = dir.clone().multiplyScalar(Math.cos(0.3 + 0.7 * open)).addScaledVector(out, Math.sin(0.3 + 0.7 * open)).normalize();
		const g = sheet({
			length: size * 0.55,
			width: size * 0.18,
			shape: (u) => Math.sin(Math.PI * clamp(u * 0.9 + 0.08)),
			lift: (u) => -0.15 * u * u,
			paint: (u, v) => mix(F.tepal, F.streak, Math.exp(-Math.pow(v / 0.18, 2)) * 0.7 * u),
			along: 4,
			across: 2,
		});
		g.applyMatrix4(frame(at, d, out));
		bag.add('sheet', g);
	}
	if (female) {
		bag.add('body', bead(at.clone().addScaledVector(dir, size * 0.2), v3(size * 0.22, size * 0.22, size * 0.22), F.ovary, 5));
		bag.add('body', bead(at.clone().addScaledVector(dir, size * 0.42), v3(size * 0.12, size * 0.08, size * 0.12), F.stigma, 4));
	} else bag.add('body', bead(at.clone().addScaledVector(dir, size * 0.12), v3(size * 0.16, size * 0.08, size * 0.16), F.disc, 4));
}

/**
 * A capsule: 1.5 × 1.3 cm, globose-ellipsoid with six narrow wings from pole to pole, green, drying brown when ripe
 * some 75–90 days after the flower (S23, S24 [2nd]; the sheet's capsule).
 */
function capsule(bag, at, dir, a, seed, i) {
	const C = CA.capsule;
	const g = span(a, 2, 45);
	const L = 0.016 * (0.3 + 0.7 * g), R = 0.0055 * (0.3 + 0.7 * g);
	const pts = [];
	for (let k = 0; k <= 10; k++) pts.push(at.clone().addScaledVector(dir, (k / 10) * L));
	const ripe = span(a, 80, 100);
	bag.add(
		'body',
		tube(
			pts,
			(u, v) => R * Math.pow(Math.sin(Math.PI * clamp(u * 0.96 + 0.02)), 0.38) * (1 + 0.1 * Math.pow(Math.abs(Math.cos(v * Math.PI * 3)), 6)),
			(u, v) => mix(mix(C.green, C.wing, Math.pow(Math.abs(Math.cos(v * Math.PI * 3)), 10)), C.dry, ripe),
			fewer(18, 8),
			true,
		),
	);
}

/**
 * A storage root, its neck at `from` leaving along `dir`: its length and greatest thickness by `L` and `D` (m), its
 * body the traced profile (`ROOT_W`) over `body` of its length, the rest a thin tail into a fibrous root. Its path is a
 * function of the length along it (bending down, wandering), so a young root is the first part of the old one.
 */
function storageRoot(bag, o) {
	const { seed, key, from, dir, L, D, body, skin, close } = o;
	if (L < 0.004) return;
	const r = chance(seed, 'storage', ...key);
	const ns = hashText(seed + key.join('.')) % 1000;
	const total = o.reach; // the length its path is drawn out to when grown (m)
	const steps = close ? 64 : 34;
	const step = total / steps;
	const path = [from.clone()];
	const d = dir.clone().normalize();
	const bendDown = between(r, 0.6, 1.4);
	for (let i = 0; i < steps; i++) {
		const s = i * step;
		const w = noise3(s * 6, ns, 0.5, 3) - 0.5, w2 = noise3(s * 6, ns, 2.5, 5) - 0.5;
		const e = d.clone();
		const k = o.straight ? 0 : 1; // on the organ bench: laid straight, as the sheet's roots lie
		e.y -= k * bendDown * 0.55 * s;
		e.x += k * w * 0.5 * Math.min(1, s * 4);
		e.z += k * w2 * 0.5 * Math.min(1, s * 4);
		e.normalize();
		path.push(path[i].clone().addScaledVector(e, step));
	}
	const reach = Math.min(steps, (L / total) * steps);
	const whole = Math.floor(reach);
	const pts = path.slice(0, whole + 1);
	if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
	if (pts.length < 2) return;
	const R = D / 2;
	const tailR = Math.min(R * 0.12, 0.0025);
	const radius = (u, v, s) => {
		const x = s / Math.max(1e-6, L);
		const lump = 1 + 0.05 * (noise3(Math.cos(v * 6.283) * 1.5, Math.sin(v * 6.283) * 1.5, s * 12, ns) - 0.5) + 0.04 * (noise3(s * 5, ns, 7, 9) - 0.5);
		if (x <= body) return Math.max(tailR, R * rootW(x / body) * lump);
		const t = (x - body) / (1 - body);
		return lerp(Math.max(tailR, R * ROOT_W[ROOT_W.length - 1]), 0.0006, Math.pow(t, 0.7));
	};
	const lift = lifted('rootMap');
	const g = tube(
		pts,
		radius,
		(u, v, s) => {
			const x = s / Math.max(1e-6, L);
			const c = mix(skin, CA.fibrous.old, smooth((x - body) / 0.1) * 0.6);
			// the neck woody and darker
			if (x < 0.04) c.lerp(CA.bark.oldDark, 0.6 * (1 - x / 0.04));
			return lift === 1 ? c : c.multiplyScalar(lift);
		},
		fewer(close ? 20 : 12, 5),
		true,
	);
	// the skin's picture in metres along it and round it
	metric(g, L / 0.1, (Math.PI * D) / 0.1);
	bag.add('root', g);
	// rootlets along its tail and a few from its body
	if (DETAIL.level >= 1 && L > 0.08) {
		const n = 3 + Math.floor(r() * 4);
		for (let i = 0; i < n; i++) {
			const x = between(r, 0.15, 1);
			const k = Math.min(pts.length - 2, Math.floor(x * (pts.length - 1)));
			const p = pts[k];
			const along = pts[k + 1].clone().sub(p).normalize();
			const out = across(along).applyAxisAngle(along, r() * 6.283);
			root(bag, { seed, key: [...key, 'let', i], from: p.clone().addScaledVector(out, radius(0, 0, x * L) * 0.9), dir: out.addScaledVector(along, 0.5), length: between(r, 0.04, 0.14), radius: 0.0006, grown: 1, young: CA.fibrous.young, old: CA.fibrous.old, age: 0.8, laterals: 0, order: 1, depth: 1, down: 0.05 });
		}
	}
	return pts;
}

/* ================================================================================================================
 * 3. THE PLANT — the cutting, its canes node by node, the fork, its roots
 * ============================================================================================================== */

/**
 * How it grows, in days from planting the cutting (the data sheet's growth table; TME 419 at Akure, S5, to six months,
 * then slowing to ~2.8 m at twelve, [EST] from S4's ~3 m and the season's slowing, S19).
 */
const GROW = {
	// the tallest cane's length (m): 0.21 at one month, 1.05 at two, 1.25, 1.37, 1.63, 1.90 at six (S5)
	length: [[0, 0], [9, 0.004], [12, 0.02], [16, 0.045], [22, 0.1], [30, 0.21], [45, 0.6], [60, 1.05], [90, 1.25], [120, 1.37], [150, 1.63], [180, 1.9], [240, 2.3], [300, 2.6], [365, 2.82]],
	// the cane's diameter at its foot (m): 0.68, 1.67, 1.80, 1.89, 2.03 cm at 1–6 months (S5), ~2.6 at twelve [EST]
	foot: [[0, 0.003], [14, 0.004], [30, 0.0068], [60, 0.0167], [90, 0.018], [120, 0.0189], [180, 0.0203], [270, 0.0235], [365, 0.026]],
	// nodes (leaves) the plant forms a day, shared among its canes by their vigour: tuned to the living leaves a plant
	// carries, 10.7, 32.9, 40.3, 46, 55 at 1, 2, 3, 5, 6 months (S5), with a leaf's life of 60–120 days (S19 [2nd])
	nodes: [[0, 0.3], [20, 0.6], [40, 0.85], [60, 0.8], [100, 0.62], [130, 0.62], [180, 0.62], [270, 0.45], [365, 0.4]],
	// a leaf's size (the largest leaf 1) by the day it formed: the first small and 3-lobed, the largest at 3–4 months,
	// the upper ones later smaller (S19 [2nd])
	size: [[0, 0.3], [15, 0.4], [30, 0.55], [50, 0.75], [80, 0.95], [120, 1], [170, 0.95], [240, 0.88], [365, 0.82]],
	// the storage roots: when they begin to swell (30–38 days, S8), length and greatest thickness by day ([EST]: S8's
	// onset, S5's 44 × 6 cm at harvest, the length set early and the thickness following the mass)
	rootStart: [30, 38],
	rootL: [[30, 0], [40, 0.08], [60, 0.2], [90, 0.28], [120, 0.33], [180, 0.38], [240, 0.41], [365, 0.44]],
	rootD: [[30, 0.002], [40, 0.004], [60, 0.015], [90, 0.028], [120, 0.043], [180, 0.049], [240, 0.054], [365, 0.06]],
	// the share of its length a root's body takes: a young root is mostly tail (the sheet's 2-month root), an old one full
	rootBody: [[40, 0.45], [90, 0.62], [180, 0.76], [365, 0.83]],
};

/** the length of the tallest cane at day t */
const caneLength = (t) => straight(t, GROW.length);

/** the time (days) a cane of vigour `k`, started at `t0`, reached length s: the inverse of its growth */
function timeAtLength(s, k, t0) {
	let lo = t0, hi = 400;
	if (k * caneLength(hi - t0 + 9) < s) return Infinity;
	for (let i = 0; i < 36; i++) {
		const m = (lo + hi) / 2;
		if (k * caneLength(m - t0 + 9) < s) lo = m;
		else hi = m;
	}
	return hi;
}

/**
 * An axis (a cane from the cutting, or a branch from a fork): its path as a function of the length along it, its
 * length by time, its nodes in the order and at the times they formed.
 *   { key, from, dir0 (its first direction), lean (where it settles, from vertical), az (its azimuth), k (vigour),
 *     t0 (bud break, days), stop (the day its tip stops: a fork), size (its leaves by the plant's), length(t) }
 */
function axisPath(ax, seed) {
	if (ax.path) return ax.path;
	const ns = hashText(`${seed}|${ax.key.join('.')}`) % 1000;
	const total = ax.reach;
	const step = 0.01;
	const n = Math.max(2, Math.ceil(total / step));
	const pts = [ax.from.clone()];
	const settle = v3(Math.sin(ax.lean) * Math.cos(ax.az), Math.cos(ax.lean), Math.sin(ax.lean) * Math.sin(ax.az));
	for (let i = 0; i < n; i++) {
		const s = i * step;
		// it leaves along its first direction and turns up toward where it settles within ~15 cm (a cane) or ~25 cm
		// (a branch), then runs straight but for a slight wander
		const f = 1 - Math.exp(-s / ax.turn);
		const d = ax.dir0.clone().lerp(settle, f);
		d.x += (noise3(s * 1.5, ns, 0, 11) - 0.5) * 0.06 * f;
		d.z += (noise3(s * 1.5, ns, 3, 13) - 0.5) * 0.06 * f;
		d.normalize();
		pts.push(pts[i].clone().addScaledVector(d, step));
	}
	return (ax.path = pts);
}

/** the point and direction at length s along an axis's path */
function along(ax, s) {
	const pts = ax.path;
	const x = clamp(s / 0.01, 0, pts.length - 1.001);
	const i = Math.floor(x);
	const p = pts[i].clone().lerp(pts[i + 1], x - i);
	const d = pts[i + 1].clone().sub(pts[i]).normalize();
	return { p, d };
}

/** an axis's nodes: the day each formed and where it sits on the axis when its internode has grown (s) */
function nodesOf(ax) {
	if (ax.nodes) return ax.nodes;
	const nodes = [];
	let have = 0.9; // a bud breaks with its first leaf already folded in it
	const end = Math.min(400, ax.stop ?? 400);
	for (let t = ax.t0; t < end; t += 0.5) {
		have += straight(t, GROW.nodes) * ax.share * 0.5;
		while (have >= 1) {
			have -= 1;
			// its internode is done some 10 days after it forms: it sits where the tip was then
			const s = ax.length(t + 10);
			nodes.push({ t, s: Math.min(s, ax.length(end) - 0.002 * (nodes.length ? 1 : 0)), i: nodes.length });
		}
	}
	return (ax.nodes = nodes);
}

/** the axes of the plant: its canes from the cutting and, where it forks, its branches; all its plan, by its seed */
function planOf(seed) {
	const r = chance(seed, 'plan');
	const C = CA.cutting;
	const slant = THREE.MathUtils.degToRad(C.slant + about(r, 0, 5));
	const az = r() * Math.PI * 2;
	// the cutting: its top end up the slant, two thirds of it under the ground line
	const along0 = v3(Math.cos(slant) * Math.cos(az), Math.sin(slant), Math.cos(slant) * Math.sin(az));
	const base = along0.clone().multiplyScalar(-C.length * C.buried);
	const top = along0.clone().multiplyScalar(C.length * (1 - C.buried));
	const nodes = [];
	for (let i = 0; i < C.nodes; i++) {
		const s = 0.025 + (i / (C.nodes - 1)) * (C.length - 0.045);
		nodes.push({ s, p: base.clone().addScaledVector(along0, s), turn: i * 2.4 + r() * 0.5 });
	}
	// the canes: from the top one to three nodes above the ground (1–3 stems, mean 1–2; [EST] S5)
	const up = nodes.filter((n) => n.p.y > 0.004).reverse();
	const count = Math.min(up.length, r() < 0.7 ? 2 : r() < 0.6 ? 1 : 3);
	const vigour = [1, between(r, 0.86, 0.95), between(r, 0.7, 0.82)];
	const axes = [];
	const side = across(along0);
	for (let c = 0; c < count; c++) {
		const n = up[c];
		// it leaves its node out of the cutting's side and up
		const out = side.clone().applyAxisAngle(along0, n.turn).normalize();
		if (out.y < 0) out.negate();
		const dir0 = out.clone().multiplyScalar(0.6).add(v3(0, 1, 0)).addScaledVector(along0, 0.3).normalize();
		const caz = Math.atan2(out.z, out.x);
		const k = vigour[c];
		const t0 = between(r, 7, 10) + c * between(r, 0.5, 2.5); // bud break 7–15 days (S19 [2nd])
		const ax = {
			key: ['cane', c], from: n.p.clone().addScaledVector(out, C.radius * 0.8), dir0, lean: THREE.MathUtils.degToRad(between(r, 2, 6) + c * 3), az: caz,
			turn: 0.12, k, t0, size: 1 - 0.06 * c, reach: 3.2, branch: false,
			length: (t) => (t < t0 ? 0 : k * caneLength(t - t0 + 9)),
		};
		axes.push(ax);
	}
	const vig = axes.reduce((a, x) => a + x.k, 0);
	for (const ax of axes) ax.share = ax.k / vig;
	// the fork: TME 419 flowers late and little (S9–S11) and cassava forks only where it flowers; about one plant in
	// three forks once, at 8.5–10 months, its tallest cane into three (or two) branches round a small panicle ([EST])
	const fr = chance(seed, 'flowers');
	const forks = fr() < 0.35;
	let fork = null;
	if (forks && axes.length) {
		const cane = axes[0];
		const tf = between(fr, 250, 275);
		cane.stop = tf;
		const L0 = cane.length(tf);
		cane.length = ((f) => (t) => Math.min(f(t), L0))(cane.length);
		axisPath(cane, seed);
		const { p, d } = along(cane, L0);
		const nb = fr() < 0.7 ? 3 : 2;
		const a0 = fr() * Math.PI * 2;
		fork = { t: tf, at: p, cane, capsules: fr() < 0.5 ? 1 + Math.floor(fr() * 2) : 0, branches: nb };
		for (let b = 0; b < nb; b++) {
			const baz = a0 + (b / nb) * Math.PI * 2 + about(fr, 0, 0.3);
			const lean0 = THREE.MathUtils.degToRad(between(fr, 32, 42));
			const dir0 = v3(Math.sin(lean0) * Math.cos(baz), Math.cos(lean0), Math.sin(lean0) * Math.sin(baz)).lerp(d, 0.2).normalize();
			const t0 = tf + between(fr, 4, 10);
			const kb = between(fr, 0.85, 1.1);
			axes.push({
				share: (cane.share * 1.1) / nb, key: ['branch', b], from: p.clone(), dir0, lean: THREE.MathUtils.degToRad(between(fr, 14, 22)), az: baz, turn: 0.22, k: kb, t0, size: 0.82, reach: 1.0, branch: true,
				// a branch grows ~0.5 m in its first three months ([EST]: the 12-month plant ~2.8 m)
				length: (t) => (t < t0 ? 0 : kb * straight(t - t0, [[0, 0], [10, 0.02], [40, 0.18], [100, 0.5], [160, 0.7]])),
			});
		}
	}
	return { slant, az, along0, base, top, nodes, axes, fork };
}

/** a cane's bark by the age of its tissue (days): green, grey-green, light brown, as the sheet's swatches */
function barkAt(age, n) {
	const B = CA.bark;
	const c = mix(B.young, B.mid, span(age, 18, 60));
	c.lerp(B.old, span(age, 55, 150));
	c.lerp(B.oldDark, (0.06 + 0.22 * n) * span(age, 80, 220));
	return c;
}

/** one axis at day t: its wood, its leaves, its scars */
function growAxis(bag, ax, t, seed, sunDir) {
	const L = ax.length(t);
	if (L < 0.002) return;
	axisPath(ax, seed);
	const ns = hashText(`${seed}|${ax.key.join('.')}`) % 1000;
	const nodes = nodesOf(ax).filter((n) => n.t <= t);
	// its radius along it: the foot's diameter by its age (a branch thinner), tapering through its top ~0.5 m of soft
	// green shoot to ~5 mm at the tip; a node a little swollen
	const foot = (straight(t - ax.t0 + 9, GROW.foot) / 2) * (ax.branch ? 0.5 : 0.88 + 0.12 * ax.k);
	const tipR = 0.0028;
	const nodeS = nodes.map((n) => Math.min(n.s, L));
	const radiusAt = (s) => {
		const fromTip = L - s;
		const k = Math.pow(clamp(fromTip / Math.min(0.55, L * 0.6 + 0.02)), 0.55);
		let r = lerp(tipR, foot, k) * (1 - 0.12 * (s / Math.max(L, 0.3)));
		// a node's swelling: the nearest node below or above
		let lo = 0, hi = nodeS.length - 1;
		while (lo < hi) {
			const m = (lo + hi) >> 1;
			if (nodeS[m] < s) lo = m + 1;
			else hi = m;
		}
		for (const j of [lo - 1, lo]) if (j >= 0 && j < nodeS.length) r *= 1 + 0.07 * Math.exp(-Math.pow((s - nodeS[j]) / 0.004, 2));
		return Math.max(0.0012, r);
	};
	const pts = [];
	const step = 0.008;
	const n = Math.max(2, Math.ceil(L / step));
	for (let i = 0; i <= n; i++) pts.push(along(ax, (i / n) * L).p);
	const lift = lifted('caneMap');
	const g = tube(
		pts,
		(u, v, s) => radiusAt(s),
		(u, v, s) => {
			const born = timeAtLengthOf(ax, s);
			const c = barkAt(t - born, noise3(s * 8, v * 3, 0, ns));
			return lift === 1 ? c : c.multiplyScalar(lift);
		},
		fewer(L > 0.5 ? 9 : 7, 4),
		true,
	);
	metric(g, L / 0.1, (Math.PI * 2 * foot) / 0.1);
	bag.add('cane', g);
	bag.space.rod(pts.filter((_, i) => i % 6 === 0 || i === pts.length - 1), foot);
	// the leaves and, where they fell, their scars; phyllotaxis 2/5 (144°) (S19 [2nd])
	for (const node of nodes) {
		const s = Math.min(node.s, L - 0.001);
		const { p, d } = along(ax, s);
		const turn = ax.az + node.i * ((144 * Math.PI) / 180);
		let out = v3(Math.cos(turn), 0, Math.sin(turn));
		out.addScaledVector(d, -out.dot(d)).normalize();
		const a = t - node.t;
		const rl = chance(seed, 'life', ...ax.key, node.i);
		const formed = node.t;
		const size = straight(formed, GROW.size) * ax.size * (ax.branch ? 0.85 : 1);
		// a leaf lives 60–120 days (S19 [2nd]); the first leaves, soon shaded under the crown, fall sooner, so the cane
		// is bare below the crown from the third month (the sheet's row 1)
		const life = ax.branch ? between(rl, 60, 110) : lerp(between(rl, 32, 50), between(rl, 60, 120), span(formed, 25, 80));
		const lobes = size < 0.32 ? 3 : size < 0.88 ? 5 : rl() < 0.4 ? 7 : 5;
		const r = radiusAt(s);
		if (a <= life) {
			STATS.leaves++;
			leaf(bag, { at: p, out, r, size, lobes, a, life, seed, key: [...ax.key, node.i] });
		}
		else if (DETAIL.level >= 0.3) scar(bag, p, out, r, size, 0);
	}
}

/** what the last build grew, for checking it against the data sheet */
const STATS = { leaves: 0, roots: [] };

/** the time a point s along an axis was laid down by its tip (cached per axis) */
function timeAtLengthOf(ax, s) {
	if (!ax.born) {
		ax.born = [];
		for (let t = ax.t0, i = 0; t <= 400; t += 1) ax.born.push([t, ax.length(t)]);
	}
	const b = ax.born;
	if (s <= 0) return ax.t0;
	let lo = 0, hi = b.length - 1;
	if (b[hi][1] < s) return b[hi][0];
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (b[m][1] < s) lo = m;
		else hi = m;
	}
	const [t0, l0] = b[lo], [t1, l1] = b[hi];
	return l1 > l0 ? lerp(t0, t1, (s - l0) / (l1 - l0)) : t1;
}

/** the planting cutting: 25 cm of light-brown stem, its nodes' scars and buds, its cut ends */
function cutting(bag, plan, t, seed) {
	const C = CA.cutting;
	const { base, along0, nodes } = plan;
	const pts = [];
	for (let i = 0; i <= 25; i++) pts.push(base.clone().addScaledVector(along0, (i / 25) * C.length));
	const ns = hashText(seed + 'cutting') % 1000;
	// the old wood, slowly thickening where the canes and roots draw through it
	const R = C.radius * (1 + 0.25 * span(t, 60, 365));
	const old = mix(CA.bark.old, lin(0.242, 0.141, 0.093), 0.4);
	const lift = lifted('caneMap');
	const g = tube(
		pts,
		(u, v, s) => {
			let r = R;
			for (const n of nodes) r *= 1 + 0.12 * Math.exp(-Math.pow((s - n.s) / 0.005, 2));
			return r;
		},
		(u, v, s) => {
			const c = mix(old, CA.bark.oldDark, 0.5 * noise3(s * 10, v * 4, 0, ns) + 0.3 * span(t, 30, 365));
			return lift === 1 ? c : c.multiplyScalar(lift);
		},
		fewer(10, 5),
	);
	metric(g, C.length / 0.1, (Math.PI * 2 * R) / 0.1);
	bag.add('cane', g);
	bag.space.rod([pts[0], pts[25]], R);
	// the cut ends: skin, green cortex, cream wood, white pith (the sheet's stem cross-section); the lower end grown over
	// with callus and roots after a few weeks
	const K = CA.cut;
	cutFace(bag, pts[25].clone().addScaledVector(along0, 0.0002), along0.clone(), R, [[0.18, mix(K.pith, CA.bark.oldDark, span(t, 10, 120) * 0.7)], [0.78, mix(K.wood, CA.bark.oldDark, span(t, 10, 120) * 0.7)], [0.92, K.cortex], [1, K.skin]]);
	cutFace(bag, pts[0].clone().addScaledVector(along0, -0.0002), along0.clone().negate(), R, [[0.18, K.pith], [0.78, mix(K.wood, lin(0.75, 0.66, 0.5), span(t, 4, 20))], [0.92, K.cortex], [1, K.skin]]);
	// its nodes: the old leaf scars, each with a bud; the buds above the ground break into canes
	const side = across(along0);
	for (const n of nodes) {
		const out = side.clone().applyAxisAngle(along0, n.turn).normalize();
		const used = plan.axes.some((a) => !a.branch && a.from.distanceTo(n.p) < 0.03);
		const swell = used ? 0 : span(t, 5, 14) * (n.p.y > 0 ? 0.6 : 0.2);
		scar(bag, n.p, out, R, 0.6, swell);
	}
}

/**
 * The roots: the fibrous roots from the cutting's buried end and nodes (from 5 days), and the storage roots, 8–11
 * radiating from its base like the spokes of a wheel, 20–45° below level (S5: 9.6 a plant; [EST] their angle), each
 * swelling from 30–38 days (S8) to 44 × 6 cm at twelve months (S5). Each storage root is marked as a fruit: the fruit
 * view shows one.
 */
function roots(bag, plan, t, seed) {
	const r = chance(seed, 'roots');
	const C = CA.cutting;
	const { base, along0, nodes } = plan;
	if (DETAIL.roots) {
		// fibrous roots: white string 1–2 mm from the basal cut and the buried nodes, down to ~1–2 m (S19, S21 [2nd])
		const buried = nodes.filter((n) => n.p.y < -0.01);
		const starts = [];
		for (let i = 0; i < 9; i++) starts.push({ p: base.clone(), key: ['b', i], t0: between(r, 4, 9) });
		buried.forEach((n, j) => {
			for (let i = 0; i < 2; i++) starts.push({ p: n.p.clone(), key: ['n', j, i], t0: between(r, 6, 14) });
		});
		for (const st of starts) {
			const g = span(t, st.t0, st.t0 + 50) * 0.5 + span(t, st.t0 + 50, 240) * 0.5;
			const az = r() * Math.PI * 2;
			const dir = v3(Math.cos(az), -between(r, 0.4, 1.4), Math.sin(az)).normalize();
			root(bag, { seed, key: ['fibrous', ...st.key], from: st.p, dir, length: between(r, 0.7, 1.4), radius: 0.0011, grown: g, young: CA.fibrous.young, old: CA.fibrous.old, age: span(t, 20, 200), laterals: 5, depth: 2, down: 0.12, wander: 0.3 });
		}
	}
	if (!(DETAIL.roots || DETAIL.storage)) return;
	// the storage roots
	const rs = chance(seed, 'storage-plan');
	const n = 9 + Math.floor(rs() * 3);
	const az0 = rs() * Math.PI * 2;
	const sizes = [];
	for (let i = 0; i < n; i++) sizes.push(between(rs, 0.55, 1.12));
	sizes.sort((a, b) => b - a);
	// two or three small ones, set late or starved
	for (let i = n - 2; i < n; i++) sizes[i] *= between(rs, 0.45, 0.7);
	const order = sizes.map((_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rs() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	for (let i = 0; i < n; i++) {
		const sz = sizes[order[i]];
		const az = az0 + (i / n) * Math.PI * 2 + about(rs, 0, 0.25);
		const dip = THREE.MathUtils.degToRad(between(rs, 18, 42));
		const dir = v3(Math.cos(az) * Math.cos(dip), -Math.sin(dip), Math.sin(az) * Math.cos(dip));
		const t0 = between(rs, GROW.rootStart[0], GROW.rootStart[1]);
		const from = base.clone().add(v3(Math.cos(az) * C.radius * 0.8, between(rs, 0, 0.012), Math.sin(az) * C.radius * 0.8));
		const tt = t - t0 + 30;
		const Lb = straight(tt, GROW.rootL) * (0.7 + 0.3 * sz) * between(rs, 0.9, 1.1);
		const D = straight(tt, GROW.rootD) * sz;
		const body = straight(tt, GROW.rootBody);
		const L = t < t0 ? 0 : Lb / body; // body and tail
		const skin = mix(mix(CA.root.skin10, CA.root.skin90, rs()), CA.root.skin, 0.4);
		const key = ['storage', i];
		const close = DETAIL.fruit === key.join('|');
		bag.fruit(key, from, dir);
		STATS.roots.push({ L: L * body, D, body });
		const pts = storageRoot(bag, { seed, key, from, dir, L, D, body, reach: (0.44 * (0.7 + 0.3 * sz) * 1.1) / 0.8, skin: mix(CA.root.young, skin, span(tt, 45, 110)), close });
		// harvested: the neck broken from the cutting, its cut showing the white flesh, the cream peel, the brown skin
		if (close && pts && D > 0.01) {
			const R = (D / 2) * rootW(0.02 / Math.max(L * body, 0.02));
			cutFace(bag, from.clone().addScaledVector(dir, -0.0005), dir.clone().negate(), Math.max(0.003, R), [[0.08, CA.root.core], [0.86, CA.root.flesh], [0.96, CA.root.peel], [1, skin]]);
		}
		bag.fruitDone();
	}
}

/**
 * The whole TME 419 at day t from planting its cutting: the cutting, its canes node by node, their leaves (a crown in
 * the top half metre or so, the cane below bare and scarred), the fork with its flowers where it forks, the roots.
 */
function cassava(t, seed) {
	const bag = new Bag();
	THIN.carry = 0.5;
	STATS.leaves = 0;
	STATS.roots = [];
	const plan = planOf(seed);
	const sunDir = v3(0.3, 1, 0.2).normalize();
	cutting(bag, plan, t, seed);
	if (!DETAIL.noShoot) {
		for (const ax of plan.axes) growAxis(bag, ax, t, seed, sunDir);
		if (plan.fork && t >= plan.fork.t) panicle(bag, plan.fork.at, seed, t - plan.fork.t, plan.fork.capsules);
	}
	roots(bag, plan, t, seed);
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Eight stages, from the cutting planted to the harvest; `t` the days since planting each is grown at (between two
 * stages, on the way).
 */
const STAGES = [
	{ name: 'Cutting', t: 0, note: 'A 25 cm stem cutting of TME 419, 2.5 cm thick with six nodes, its light-brown bark knobbly with leaf scars and a bud above each, pushed into the ridge at 45°, two thirds of it buried. Taken from the lower metre of a 10–12-month plant. Spacing 1 × 1 m: 10,000 plants a hectare.' },
	{ name: 'Sprouting', t: 14, note: 'Two weeks: the buds above the ground have broken into short green shoots with small pale folded leaves; white string roots, 1–2 mm thick, have come from the buried cut end and nodes since the fifth day. The plant lives on the cutting\'s reserves.' },
	{ name: 'One month', t: 30, note: 'One month: a shoot about 21 cm tall with some eleven leaves, the first small and three-lobed, the newer ones five-lobed; the stem soft, green and 7 mm thick. Under the ground the fibrous roots fan out, and some of them have begun to thicken (30–38 days): they will be the storage roots.' },
	{ name: 'Two months', t: 60, note: 'Two months: canes about a metre tall, 1.7 cm thick at the foot, some thirty-three living leaves along their upper two thirds on long green petioles; the first, lowest leaves already fallen, leaving scars. The storage roots are clearly tuberous, pencil-thick and 15–25 cm long; their number is set by about 120 days.' },
	{ name: 'Four months', t: 120, note: 'Four months: 1.4 m, the canes light brown and bare below with prominent leaf scars, a crown of large 5- and 7-lobed leaves on 20–25 cm green petioles above; the canopy nears its peak (LAI 2–3). Eight to eleven storage roots radiate from the cutting\'s base, about 33 cm long and 4.5 cm thick.' },
	{ name: 'Six months', t: 180, note: 'Six months: 1.9 m, the canes 2 cm thick, some fifty-five living leaves in the top 0.8 m; most of the season\'s assimilate now goes into the roots, about 38 × 5 cm, some 2 kg a plant.' },
	{ name: 'Nine months', t: 280, note: 'Nine months: about 2.45 m. TME 419 flowers late and little; about one plant in three forks once now, its tallest cane ending in a small panicle (a few female flowers at its base, many small male ones above) as two or three branches break round it. The crop could be lifted now (S7: 9 MAP), but it is still filling.' },
	{ name: 'Harvest', t: 365, note: 'Twelve months, the harvest: canes about 2.8 m tall and 2.6 cm thick at the foot, bare and scarred with a crown of smaller leaves at the top (on a forked plant, the branches with a capsule or two at the fork). Under the ridge, about ten brown-skinned storage roots radiate from the old cutting: 44 cm long and 6 cm thick, white-fleshed, some 0.5 kg each and 4.9 kg a plant (49 t/ha at Akure, S5). Lifted by hand; the canes are cut for the next planting.' },
];

/** the days since planting at a stage (0 … 7, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => cassava(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one storage root on its own ---- */

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

/** which of the well-grown storage roots at the harvest the seed picks */
function ripePick(seed) {
	const { plant, fruits } = lite({ ...detailAt(1), roots: false, storage: true, noShoot: true }, () => pickFruit(() => grow(STAGES.length - 1, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.85);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one storage root at a stage, on its own: its neck at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant has no storage roots.');
	const { plant, fruits } = lite({ ...detailAt(1), fruit: key, roots: false, storage: true, noShoot: true }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f || !f.parts.length) return none('Its storage roots have not begun to swell yet (30–38 days after planting).');
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
	id: 'cassava',
	label: "Cassava 'TME 419' · Manihot esculenta",
	latin: "Manihot esculenta Crantz 'TME 419' · syn. TMEB419, TME-419, NICASS 20 (Nigeria 2005) · cassava, manioc · ẹ̀gẹ́ (Yoruba), akpu (Igbo), rogo (Hausa)",
	note: "TME 419, the leading improved cassava of Africa (IITA; NICASS 20 in Nigeria), resistant to cassava mosaic disease (CMD2): a tall, erect, straight cane that hardly branches (it flowers late and little), 2.5–3 m at twelve months, light brown and knobbly with leaf scars below a crown of palmate 5–7-lobed leaves on long green petioles; grown from a 25 cm stem cutting, it bears about ten brown-skinned storage roots with a cream peel and white flesh, 44 × 6 cm and 0.5 kg each, for gari and fufu, harvested at 10–13 months.",
	from: 'Shrub · one season from a 25 cm stem cutting',
	layer: 'shrub',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '3e3fc7ade0db7d0aeb3f2d04205f0d04313c23230440f901fbfc86bc37e029b1', model: 'fal-ai/nano-banana-pro', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t), note })), // days from planting the cutting
	// what a world needs to plant it right; plant-skill's data sheet for TME 419 (S1–S31)
	facts: {
		height: { at1m: 0.21, at2m: 1.05, at3m: 1.25, at4m: 1.37, at6m: 1.9, at12m: [2.5, 3], unit: 'm' },
		stem: { at1m: 0.0068, at2m: 0.0167, at6m: 0.0203, at12m: [0.025, 0.03], stemsPerCutting: [1, 3], unit: 'm' },
		crown: { width: [0.8, 1.0], unit: 'm' },
		branching: 'erect, mostly unbranched; about one plant in three forks once, late and high (9–10 months at ~2.4 m), into two or three',
		spacing: { sole: [[1, 1], [1, 0.8]], unit: 'm', perHectare: 10000 },
		shade: 'full sun; under plantain it is shorter and yields about half',
		climate: 'humid and subhumid tropics, 25–29 °C best, 1,000–1,500 mm rain (500–5,000), survives a 4–6-month dry season by shedding leaves; 0–1,500 m; well-drained loams, pH 4.5–7',
		planting: { cutting: [0.2, 0.25], diameter: [0.02, 0.03], nodes: [5, 7], angle: 45, buried: 2 / 3, unit: 'm, degrees' },
		days: { roots: 5, budBreak: [7, 15], firstLeaves: 30, rootBulking: [30, 38], rootNumberSet: 120, flowering: [110, 290], harvest: [270, 400] },
		leaf: { lobes: [3, 7], centralLobe: [0.14, 0.18], lobeWidth: [0.035, 0.045], petiole: [0.18, 0.25], life: [60, 120], living: { at1m: 10.7, at2m: 32.9, at3m: 40.3, at6m: 55 }, unit: 'm, days' },
		flower: { panicle: [0.06, 0.1], femaleSize: 0.01, rare: true, unit: 'm' },
		fruit: { kind: 'six-winged capsule (rare)', length: [0.015, 0.018], width: [0.01, 0.015], seeds: 3, seedLength: [0.006, 0.01], daysToRipe: [75, 90], unit: 'm, days' },
		storageRoots: { perPlant: [8, 11], length: 0.44, diameter: [0.05, 0.07], mass: 0.5, perPlantMass: 4.92, skin: 'brown', peel: 'light yellow / cream', flesh: 'white', neck: 'short', depth: [0.05, 0.35], unit: 'm, kg' },
		yield: { akure: 49.2, trials: [15, 36], dryMatter: [0.275, 0.4], harvestIndex: 0.54, unit: 't/ha fresh roots' },
		diseases: 'CMD resistant (CMD2 locus); CBSD tolerant, not immune; low cyanide (sweet)',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one storage root) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'cassava' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'cassava',
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
module.exports.organs = { STATS, nodesOf, axisPath, along, CA, LOBE_W, LOBES, ROOT_W, GROW, leaf, storageRoot, capsule, flower, panicle, cutting, cutFace, planOf, cassava, Bag, timeAt, surface, lite, detailAt, STAGES, frame, v3, lin, sound, material, mergeGeometries };
