'use strict';
/*
 * QUINCE 'VRANJA' — Cydonia oblonga Mill. 'Vranja' (Vranjska dunja, 'Vranja Nenadović', Riesenquitte von Vranja,
 * Monstrueux de Vranja): the big golden pear-shaped quince of southern Serbia, the second quince of Serbia beside
 * 'Leskovačka'. Version 2 of plants/quince: one named cultivar, grown from a rootstock pip, budded, headed, to a laden
 * tree in its eighth October.
 *
 * Its numbers are the cultivar's where they are scored or measured (UPOV TG/100/4, where 'Vranja' is the example for a
 * strong upright tree, long leaves, large stipules, large dark-pink flowers and large pyriform fruit with a neck;
 * Radović et al. 2020 at Belgrade: self-compatible, 33.7 % initial and 16.2 % final set, the trees on quince MA at 4.5 ×
 * 3 m; 9–11 × 7–9 cm and 300–550 g fruit) and the species' otherwise (Flora of China and of North America: leaf,
 * flower, fruit; Klymenko & Ilyinska 2024: the season's stages; Çalhan & Koyuncu 2018, 'Eşme': growth and colour by
 * days after bloom); estimates are marked in the data sheet (references/quince-vranja.md in plant-skill).
 *
 * Its look is held to its reference sheet: one clean-lit plate of every stage and organ made for it by Google's Nano
 * Banana Pro, its ripe fruit redrawn the right way up, and kept on play by its hash (26a192a5…): its outlines and
 * colours traced off its panels. Where the plate is wrong against the data sheet (ten seeds in the cut fruit, a green
 * fruitlet), the data sheet wins.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag with `sound()`, Space,
 *                   roots), carried over from banana v2 as plum v2 has it (parsed colours kept, mipmapped pictures,
 *                   leaf undersides with their own normals), with the quince's materials and surfaces: small colour
 *                   pictures made from noise (the leaf's veins, the old bark's flaking plates, the ripe skin).
 *   2. ORGANS       the quince's own, each to its measure: pip, seed leaves, bark, leaf, bud, flower, fruit.
 *   3. THE TREE     its axes year by year (the stock, the bud, the whip headed at planting, low scaffolds, short
 *                   fruiting shoots in zig-zag chains, each ending in one flower), its roots, its seasons.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from germination (t = 0 late April); a year's season `s` from bud break
 * (−0.08, early April) through full bloom (0, about 1 May) round to the next.
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
		// the quince's: thousands of leaves and short shoots, so a crowd keeps fewer of them, each grown more
		[0.1, 0.1, 1.7, 0.006],
		[0.25, 0.17, 1.6, 0.003],
		[0.5, 0.45, 1.3, 0.001],
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
 * plates of old bark, the skin of a ripe quince. Laid on by the shape's UVs (a leaf's own, the bark's in metres:
 * `metric`), mipmapped. Colour pictures multiply the vertex colours (white leaves them as they are); no bump pictures
 * (see MATERIALS). Only at detail 0.5 and over: a crowd far off draws plain colours.
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
 *                        midrib at v = ½): the quince's pinnate veins, 6–8 pairs leaving the midrib at about 50° and
 *                        looping toward the tip well inside the entire margin (camptodromous), a little paler than the
 *                        smooth, dull blade; a fine faint net between them
 *   barkMap              0.25 m square of old quince bark, laid on in metres: thin plates 3–10 cm across, taller than
 *                        wide, their edges a little darker where they lift; the places where plates have fallen smooth
 *   skinMap              a ripe quince's skin: faint mottling, fine pale lenticel dots and wisps of the felt left on it
 */
function surface(name) {
	if (SURFACES[name]) return SURFACES[name];
	const VEINS = 7;
	const vein = (x, y, sharp) => {
		// side 0 at the midrib, 1 at the margin; the secondaries leave at ~50° and arch toward the tip
		const side = Math.abs(y - 0.5) * 2;
		const slant = side * 0.75 + 0.35 * side * side;
		const phase = (x - 0.05) * VEINS - slant * 1.0;
		const sec = Math.pow(Math.abs(Math.cos(phase * Math.PI)), sharp) * smooth((0.86 - side) / 0.12) * smooth((x - 0.03) / 0.05) * smooth((0.95 - x) / 0.1);
		const mid = Math.exp(-Math.pow((y - 0.5) / 0.012, 2));
		const c = tileCells(x, y, 16, 9, 7);
		const net = smooth((0.06 - (c.f2 - c.f1)) / 0.05);
		return { sec, mid, net, side };
	};
	const make = {
		leafMap: () =>
			picture(256, 128, (x, y) => {
				const { sec, mid, net } = vein(x, y, 26);
				const mottle = tileNoise(x, y, 14, 3) - 0.5;
				const k = 0.93 + 0.16 * sec + 0.2 * mid + 0.03 * net + 0.05 * mottle;
				return [k * 1.0, k * 1.01, k * 0.94];
			}, true),
		barkMap: () =>
			picture(256, 256, (x, y) => {
				// x round the trunk, y up it (0.25 m): plates 3–10 cm wide, taller than wide, their lifting edges darker
				const w = tileNoise(x, y, 4, 61, 2) - 0.5;
				const c = tileCells(x + w * 0.08, y + w * 0.05, 5, 3, 63);
				const edge = smooth((0.06 - (c.f2 - c.f1)) / 0.05);
				const grain = 0.88 + 0.2 * (tileNoise(x, y, 40, 65, 3, 10) - 0.5) + 0.12 * c.id;
				const k = grain * lerp(1, 0.62, edge);
				return [k, k * 0.98, k * 0.95];
			}, true),
		skinMap: () =>
			picture(256, 256, (x, y) => {
				const dots = tileCells(x, y, 30, 30, 73);
				const dot = dots.id < 0.35 ? smooth((0.08 - dots.f1) / 0.05) : 0;
				const k = 0.97 + 0.06 * (tileNoise(x, y, 10, 75) - 0.5);
				const wisp = smooth((tileNoise(x, y, 22, 79, 3) - 0.62) / 0.1) * 0.08;
				return [k + 0.05 * dot + wisp, k + 0.05 * dot + wisp, k + 0.03 * dot + wisp * 1.2];
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
 * The materials, made once, plain and with their surfaces. `bark` thick wood, matt, its plates; `twig` young wood,
 * felted then smooth; `leaf` a leaf's two faces (one-sided, each its own colour), dull; `felt` a young quince in its
 * grey felt (a soft sheen); `skin` a ripe quince, the felt rubbed off, its skin faintly greasy; `sheet` thin things seen
 * from both sides (petals, sepals, seed leaves); `body` buds, stalks, the pip, roots.
 */
const MATERIALS = {
	// colour pictures only, no bump: a bump picture's normal is NaN wherever a triangle stands edge-on or shrinks under a
	// pixel on screen (three's perturbNormalArb), and a dense tree of small triangles finds such a pixel from somewhere
	bark: (s) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...(s && { map: s('barkMap') }) }),
	twig: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
	// no clearcoat on leaves (a crown of them goes white at grazing angles); dull, a low specular
	leaf: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, specularIntensity: 0.3, ...(s && { map: s('leafMap') }) }),
	felt: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.85, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.62, 0.63, 0.57), specularIntensity: 0.3 }),
	skin: (s) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.46, specularIntensity: 0.55, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.55, 0.53, 0.42), ...(s && { map: s('skinMap') }) }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
};
const materials = {};
const material = (kind) => {
	const fine = DETAIL.level >= 0.5;
	return (materials[`${kind}${fine ? '+' : ''}`] ??= (MATERIALS[kind] ?? MATERIALS.body)(fine ? surface : null));
};
const KINDS = ['bark', 'twig', 'body', 'leaf', 'sheet', 'felt', 'skin', 'prop'];
// thousands of leaves and flowers: a crowd far off draws a share of them, each grown to fill the gap
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
 * 2. ORGANS — the quince's own, each to its measure
 * ============================================================================================================== */

/**
 * The 'Vranja' quince's numbers. Sizes in metres from the data sheet (UPOV TG/100/4, where 'Vranja' is the example
 * variety for a strong upright tree, long leaves, large stipules, large dark-pink flowers and large pyriform fruit
 * with a neck; Flora of China and of North America for the species; the measured 'Eşme' curve for growth and
 * colour), outlines and colours traced off its reference sheet (play file 26a192a5…, Nano Banana Pro, 2026-11-05,
 * grey-balanced to its first plate) with plant-skill's trace.py: the colours are the sheet's medians (sRGB hex), the
 * spread its p10–p90.
 */
const QV = {
	// the pip: ~9 × 5 × 2.5 mm, obovoid and wedge-shaped, glossy red-brown (the sheet's pip #9a4536, p10 #781f06);
	// sown 1.5 cm deep after its winter's cold
	pip: { length: 0.009, width: 0.005, thick: 0.0028, colour: '#5e3424', dark: '#38190e', light: '#86584a', depth: 0.015 },
	// epigeal: a hypocotyl 4–5 cm lifts two fleshy oval seed leaves 12 × 7 mm (the sheet's #9bac50)
	cotyledon: { length: 0.012, width: 0.0072, colour: '#9bac50', under: '#b4bf72', old: '#c9b762' },
	hypocotyl: { length: 0.045, colour: '#b3b878', red: '#8b5d4c' },
	// leaf: 'Vranja' long (UPOV 7): blade 9 × 6.2 cm (8–11 × 5–7), stalk 12 mm, felted; colours: the sheet's upper
	// side, its felted underside, its unfolding leaf, its autumn leaf
	leaf: {
		length: 0.09, width: 0.062, petiole: 0.012,
		top: '#5c7048', topDark: '#4e6139', under: '#a3a88f', underLight: '#b6b8a2', vein: '#a9ae88',
		wool: '#c9cbbb', young: '#8a9b62', autumn: '#efb726', autumnLate: '#b98b2b', petioleColour: '#8f8a68', stipule: 0.011,
	},
	// flower: 4.5–5 cm across ('Vranja' large, UPOV 7); five broadly obovate petals (15–20 mm in the Floras; drawn 23.5
	// mm so the open flower measures 4.4 cm across on the organ bench, its petals cupped), pink (the sheet's
	// #e2bfd6 grey-balanced; UPOV: dark pink as it opens), paler to the claw, pinker at the edge; ~20 stamens; 5 styles
	flower: {
		petal: 0.0235, petalColour: '#e0b6cf', edge: '#d49ab6', claw: '#f2e2ea', bud: '#d97a98', budDark: '#c4607f',
		hypanthium: '#8d9a5c', felt: '#c8ccb8', sepal: 0.0065, sepalColour: '#7f7c52', anther: '#d9b04a', filament: '#f3e6ea', style: '#ece9cf',
	},
	// fruit: ripe 100 × 80 mm (9–11 × 7–9 cm, 300–550 g); pyriform with a neck, widest in its lower third; stalk 5 mm;
	// skin by age: the sheet's July fruit #82904b under the felt, September #ccbe31, ripe golden (the sheet's middle
	// zones #e8bc35, the data sheet's #ddc137)
	fruit: { length: 0.1, width: 0.08, stalk: 0.005, stalkColour: '#6e6040', green: '#7f8f48', yellowGreen: '#d4c236', gold: '#ecc23a', ripeDeep: '#e4b42c', felt: '#c4c6ac', sepalGreen: '#7f7c52', sepalDry: '#6b4b2d' },
	// bark traced off the sheet's three swatches: the one-year shoot (#896770, felted tip p90 #a79ca2), three-year
	// wood (#6c4b59), the old trunk (median #ab835e: grey-brown plates and the orange-brown patches they leave)
	bark: { shoot: '#86606a', shootFelt: '#aaa0a4', young: '#6c4b59', youngGrey: '#6f625a', old: '#6e655a', plate: '#7b6c5c', orange: '#a2683e', tan: '#b59a74', greyGreen: '#8a8c74', edge: '#3c3028' },
	root: { young: '#ece0cc', old: '#6e4a2c' },
};

/**
 * The leaf's outline: half-widths along the blade (0 at the stalk … 1 at the tip, parts of its greatest width),
 * traced off the sheet's leaf (upper side) from its base: broadly ovate, the base rounded, widest a little below the
 * middle, narrowing evenly to a short point; entire. The sheet's blade is 1.38 : 1; the data sheet's 9 × 6.2 cm 1.45.
 */
const LEAF_W = [0.05, 0.47, 0.66, 0.76, 0.83, 0.89, 0.93, 0.96, 0.98, 1.0, 0.98, 0.96, 0.94, 0.91, 0.87, 0.82, 0.75, 0.69, 0.6, 0.51, 0.38, 0.18, 0.0];
/**
 * The ripe fruit's profile from its stalk to its calyx: half-widths as parts of the greatest, traced off the sheet's
 * ripe quince (sheet 3b, turned stalk down; 1.29 : 1, the data sheet's 9–11 × 7–9 cm 1.25): a short narrow neck
 * that swells into the body, widest a little past the middle, the calyx end broad and blunt round its eye.
 */
const FRUIT_W = [0.36, 0.44, 0.5, 0.55, 0.6, 0.66, 0.75, 0.82, 0.89, 0.94, 0.98, 1.0, 1.0, 0.98, 0.95, 0.91, 0.85, 0.77, 0.7, 0.63, 0.56, 0.48, 0.4];
/** the young fruit's (the sheet's 5 cm July fruit and the felted fruitlet): a long club, widest past the middle */
const YOUNG_W = [0.42, 0.5, 0.58, 0.66, 0.73, 0.8, 0.86, 0.91, 0.95, 0.98, 1.0, 1.0, 0.99, 0.97, 0.94, 0.9, 0.85, 0.79, 0.72, 0.65, 0.58, 0.52, 0.46];
const along = (rows, u) => {
	const x = clamp(u) * (rows.length - 1);
	const i = Math.min(rows.length - 2, Math.floor(x));
	return lerp(rows[i], rows[i + 1], x - i);
};

/* ---- the pip ---- */

/**
 * The pip: an obovoid wedge 9 × 5 × 2.8 mm, its narrow end (+X, the hilum) pointed, its back rounded, its faces flat
 * where it lay pressed against its neighbours in the locule; glossy red-brown, darker at the point.
 */
function pip(bag, at, turn, seed) {
	const P = QV.pip;
	const g = new THREE.SphereGeometry(1, fewer(28, 8), fewer(18, 6));
	const pos = g.attributes.position;
	const col = new Float32Array(pos.count * 3);
	const p = new THREE.Vector3();
	const ns = hashText(seed) % 997;
	for (let i = 0; i < pos.count; i++) {
		p.fromBufferAttribute(pos, i);
		const point = Math.max(0, p.x);
		const x = p.x * (P.length / 2);
		const y = p.y * (P.width / 2) * (1 - 0.62 * Math.pow(point, 1.5)) * (1 + 0.08 * Math.max(0, -p.x));
		const z = Math.sign(p.z) * Math.pow(Math.abs(p.z), 1.4) * (P.thick / 2) * (1 - 0.45 * point);
		pos.setXYZ(i, x, y, z);
		const c = mix(P.colour, P.dark, Math.pow(point, 2) * 0.8 + 0.25 * (noise3(x * 900, y * 900, z * 900, ns) - 0.5));
		c.lerp(named(P.light), clamp(0.6 - Math.abs(p.y)) * 0.25 * (p.z > 0 ? 1 : 0.5));
		col.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	const geo = made(Array.from(pos.array), Array.from(g.attributes.normal.array), new Array(pos.count * 2).fill(0), Array.from(col), Array.from(g.index.array), false);
	g.dispose();
	bag.add('body', geo, new THREE.Matrix4().compose(at, turn, v3(1, 1, 1)));
}

/* ---- the seed leaves ---- */

/**
 * The two seed leaves at the top of the hypocotyl, `dir` the stem's direction there: fleshy ovals 12 × 7 mm, folded
 * shut against each other and pointing back down while the hook is bent (`open` 0), spreading level as it straightens
 * (`open` 1); yellowing and drooping from about the seventh week, gone by the tenth (`wither` 0 … 1).
 */
function cotyledons(bag, at, dir, open, wither, r) {
	if (wither >= 1) return;
	const C0 = QV.cotyledon;
	const d = dir.clone().normalize();
	const side = across(d);
	for (const k of [0, 1]) {
		const s = side.clone().multiplyScalar(k ? 1 : -1);
		const up = lerp(-1.25, 0.18, smooth(open)) - wither * 0.9;
		const out = s.clone().multiplyScalar(Math.cos(up)).addScaledVector(d, Math.sin(up)).normalize();
		const len = C0.length * lerp(0.75, 1, smooth(open)) * (1 - 0.15 * wither);
		const leafy = sheet({
			length: len,
			width: len * (C0.width / C0.length) * 0.5,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.75),
			lift: (u, v) => 0.12 * v * v - 0.05 * u * u,
			paint: () => mix(mix(C0.colour, '#c8cf8a', 1 - smooth(open)), C0.old, wither),
			back: () => mix(C0.under, C0.old, wither),
			backLit: false,
			along: DETAIL.fruit ? 8 : 4,
			across: 2,
		});
		bag.add('leaf', leafy, aim(at.clone().addScaledVector(s, 0.0008), out, 0));
	}
}

/* ---- bark ---- */

/**
 * Quince bark by the age (years) and radius (m) of the wood: this year's shoot grey-felted at first, then purplish
 * red; two- to six-year wood smooth purple-brown going grey-brown, a few lenticels; old wood (over ~2.5 cm) grey-brown
 * in thin plates 3–10 cm across that flake away and leave smooth patches of orange-brown, tan and grey-green (the
 * sheet's old bark), the plates' lifting edges dark.
 */
const BARK_K = { across: 24, along: 8 }; // plates ~4 cm across, ~12 cm tall
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 30, s * 8, cz * 30, 2, ns + 5) - 0.5) * 0.7;
	const c = cells(cx * BARK_K.across + w, s * BARK_K.along + w * 0.4, cz * BARK_K.across - w, ns + 3);
	const c2 = cells(cx * BARK_K.across * 1.9 + 7, s * BARK_K.along * 1.7 + w, cz * BARK_K.across * 1.9, ns + 11);
	return { edge: c.edge, id: c.id, id2: c2.id, edge2: c2.edge, cx, cz };
}
const oldness = (r) => clamp((r - 0.012) / 0.022);
function barkColour(age, r, v, s, sun, ns) {
	const B = QV.bark;
	if (age < 0.15) return mix(B.shootFelt, B.shoot, smooth(age / 0.15) * 0.8 + sun * 0.2);
	if (age < 0.8) return mix(B.shoot, B.young, (age - 0.15) / 0.65).lerp(named(B.shootFelt), 0.08);
	const { edge, id, id2, cx, cz } = barkPattern(r, v, s, ns);
	const c = mix(B.young, B.youngGrey, clamp((age - 1.5) / 4) * 0.8);
	const ln = noise3(cx * 160, s * 900, cz * 160, ns + 7);
	c.lerp(named('#a89a8c'), smooth((ln - 0.82) / 0.06) * 0.45 * (1 - oldness(r)));
	const o = oldness(r);
	if (o > 0) {
		// a plate still on, or the patch a fallen one left: orange-brown when freshly bared, then tan, then grey-green
		const bared = id < 0.26 ? 1 : 0;
		const plate = mix(B.old, B.plate, id2 * 0.8 + 0.1 * fbm(cx * 90, s * 30, cz * 90, 2, ns));
		const patch = id < 0.08 ? mix(B.orange, '#b98450', id2) : id < 0.17 ? mix(B.tan, B.orange, id2 * 0.4) : mix(B.greyGreen, B.tan, id2 * 0.5);
		const bark = bared ? patch : plate;
		bark.lerp(named(B.edge), smooth((0.09 - edge) / 0.07) * 0.75);
		c.lerp(bark, smooth(o * 1.3));
	}
	return c;
}
function barkRelief(r, v, s, ns) {
	const o = oldness(r);
	if (o <= 0) return 0;
	const { edge, id } = barkPattern(r, v, s, ns);
	// a plate stands a little proud of the smooth patch under it, its edge lifting
	return o * ((id < 0.26 ? -0.012 : 0.008) + 0.012 * smooth((0.08 - edge) / 0.06) * (id < 0.26 ? 0 : 1));
}

/* ---- the leaf ---- */

/** its outline: the traced half-widths (the margin entire) */
const leafShape = (u) => along(LEAF_W, u);

/**
 * One leaf: its felted stalk from the node, then the blade, a little concave (folded along the midrib) and arched,
 * dull dark green above, grey-white felted below; unfolding silvery with wool, folded, its large round stipules at the
 * stalk's foot (shed as it grows); in autumn clear yellow, then gone. `age` 0 … 1 from bud to grown, `fall` 0 … 1.
 */
function leaf(bag, at, dir, size, age, fall, r, close = false, flat0 = false) {
	const L = QV.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const len = L.length * size * lerp(0.22, 1, smooth(age));
	const petLen = L.petiole * size * lerp(0.4, 1, smooth(age));
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = flat0 ? 0 : lerp(1.0, about(r, 0.5, 0.25), smooth(age * 1.3));
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const end = at.clone().addScaledVector(pd, petLen);
	const hue = r();
	const autumn = (u) => mix(mix(L.autumn, '#e2c440', hue * 0.5), L.autumnLate, clamp(fall * 1.5 - 0.5 + u * 0.2));
	const wooly = 1 - smooth(age * 1.6);
	bag.add('body', tube(close ? [at, at.clone().lerp(end, 0.5).add(v3(0, petLen * 0.05, 0)), end] : [at, end], (u) => 0.001 * size * (1 - 0.3 * u) * lerp(0.5, 1, age), () => (fall > 0.3 ? autumn(0) : mix(L.petioleColour, L.wool, wooly * 0.7)), close ? 6 : 3));
	// the stipules: two round, gland-toothed leaflets at the stalk's foot, on the young leaves only (caducous)
	if (age < 0.75 && (close || DETAIL.level >= 1)) {
		for (const k of [-1, 1]) {
			const sd = across(pd).multiplyScalar(k).addScaledVector(pd, 0.6).normalize();
			const st = sheet({ length: L.stipule * size * lerp(0.5, 1, age), width: L.stipule * size * 0.42, shape: (u) => Math.sqrt(Math.max(0, Math.sin(Math.PI * u))), lift: (u, v) => 0.1 * v * v, paint: () => mix('#7d9a4a', L.wool, wooly * 0.5), along: 2, across: 1 });
			bag.add('sheet', st, aim(at, sd, 0));
		}
	}
	const droop = flat0 ? 0 : lerp(-0.9, about(r, -0.18, 0.25), smooth(age * 1.3)) - fall * 0.35;
	const bd = flat.clone().applyAxisAngle(UP, flat0 ? 0 : about(r, 0, 0.3)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = flat0 ? 0 : lerp(0.9, about(r, 0.11, 0.05), smooth(age)); // 'Vranja': the blade concave (UPOV)
	const curl = flat0 ? 0 : about(r, 0.1, 0.06);
	const ns = Math.floor(r() * 1000);
	const top = (u, v) => {
		const c = mix(L.top, L.young, wooly * 0.6);
		c.lerp(named(L.wool), wooly * 0.75);
		c.lerp(named(L.topDark), clamp((noise3(u * 3, v * 2, ns, 3) - 0.45) * 1.5) * 0.45);
		if (Math.abs(v) < 0.04) c.lerp(named(L.vein), 0.35 * (1 - u * 0.6));
		if (fall > 0) c.lerp(autumn(u), clamp(fall * 1.6 - u * 0.3 - Math.abs(v) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, L.wool, wooly * 0.7);
		c.lerp(named(L.underLight), clamp(noise3(u * 4, v * 3, ns + 5, 2) - 0.4));
		if (Math.abs(v) < 0.05) c.lerp(named('#c4c4a8'), 0.4);
		if (fall > 0) c.lerp(autumn(u).lerp(named('#d8c890'), 0.3), clamp(fall * 1.6 - u * 0.3));
		return c;
	};
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: leafShape,
		lift: (u, v) => fold * Math.abs(v) * 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.05)) - curl * u * u,
		paint: top,
		back: under,
		backLit: false, // its own normals: a felted underside seen from below is the underside, not the sky
		along: close ? 36 : 3,
		across: close ? 12 : 2,
	});
	bag.add('leaf', blade, aim(end, bd, flat0 ? 0 : about(r, 0, 0.25)));
}

/* ---- buds ---- */

/** a winter bud: small, felted, purplish-brown, pressed to the shoot (UPOV: adpressed); a mixed bud a little fatter */
function bud(bag, at, dir, mixed, swell, r) {
	const s = mixed ? lerp(0.0021, 0.0034, swell) : 0.0016;
	const col = mix(mix('#6a4a4e', '#8a7a78', 0.3), mix('#9aa070', QV.leaf.wool, 0.4), clamp(swell * 1.4 - 0.3));
	const d = dir.clone().normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
	bag.add('body', bead(at.clone().addScaledVector(d, s * 0.9), v3(s * 0.75, s * 1.35, s * 0.75), col, DETAIL.fruit ? 4 : 2, q));
}

/* ---- the flower ---- */

/**
 * One flower at the tip of its short shoot, facing along `facing`: a felted green bell (the hypanthium), five felted
 * sepals with gland-toothed edges bending back as it opens, five broad overlapping petals ~21 mm (4.5–5 cm across
 * open), pink, paler to the claw and pinker at the edge; dark pink and rolled in bud; ~20 stamens with yellow anthers
 * round five free styles woolly at their base. `open` 0 … 1, `fall` 0 … 1 petals dropping.
 */
function flower(bag, at, facing, open, fall, r, close = false) {
	const F = QV.flower;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, facing.clone().normalize());
	const base = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const turn = (a, up) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(up));
	const roll = r() * Math.PI * 2;
	// the hypanthium: a felted bell 6 mm tall, 8 mm across at its rim
	bag.add('felt', tube([v3(0, -0.001, 0), v3(0, 0.002, 0), v3(0, 0.005, 0)], (u) => 0.0018 + 0.0022 * Math.pow(u, 0.8), (u) => mix(F.hypanthium, F.felt, 0.35 + 0.2 * u), close ? 12 : 5, false), base);
	const rim = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(0, 0.005, 0));
	if (close || DETAIL.level >= 1) {
		for (let k = 0; k < 5; k++) {
			const s = sheet({
				length: F.sepal,
				width: F.sepal * 0.42,
				shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.75)) * (1 + (close ? 0.08 * Math.max(0, Math.sin(u * 40)) : 0)),
				lift: (u) => 0.08 * u * u,
				paint: (u) => mix(F.sepalColour, F.felt, 0.25 + u * 0.15),
				along: close ? 8 : 2,
				across: close ? 4 : 1,
			});
			const up = lerp(1.3, -0.6, smooth(open)) - fall * 0.15;
			bag.add('sheet', s, rim.clone().multiply(turn((k / 5) * Math.PI * 2 + roll + 0.63, up)));
		}
	}
	if (fall < 1) {
		for (let k = 0; k < 5; k++) {
			const len = F.petal * lerp(0.42, 1, smooth(open)) * about(r, 1, 0.05);
			const p = sheet({
				length: len,
				width: len * 0.37,
				// broadly obovate on a short narrow claw (the sheet's flower): overlapping its neighbours toward the base
				shape: (u) => Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.6) / 0.4, 2))) * (0.18 + 0.82 * smooth(u / 0.4)),
				lift: (u, v) => 0.1 * v * v * u + 0.16 * u * u * (1 - open * 0.75) + 0.02 * Math.sin(v * 4 + u * 6),
				paint: (u, v) => {
					const c = mix(F.claw, F.petalColour, smooth(u / 0.45));
					c.lerp(named(F.edge), smooth((u - 0.7) / 0.3) * 0.5 + Math.pow(Math.abs(v), 3) * 0.2);
					c.lerp(named(F.bud), (1 - smooth(open * 1.3)) * 0.85);
					return c.lerp(named('#e6d2c8'), fall * 0.5);
				},
				along: close ? 16 : 3,
				across: close ? 10 : 2,
			});
			// a shallow cup: petals rise ~12° from level when open; in bud they stand closed
			const up = lerp(1.45, 0.2, smooth(open)) - fall * 1.0;
			const drop = 1 - fall * 0.4;
			bag.add('sheet', p, rim.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.0002 * k, 0)).multiply(turn((k / 5) * Math.PI * 2 + roll, up)).multiply(new THREE.Matrix4().makeScale(drop, 1, drop)));
		}
	}
	if (open < 0.3 || (!close && DETAIL.level < 0.5)) return;
	// the floral cup's disc inside the stamens, yellow-green
	bag.add('body', bead(v3(0, 0.0047, 0), v3(0.0027, 0.0006, 0.0027), '#a89a58', close ? 8 : 3), base);
	const brown = clamp(fall * 1.4);
	const n = close ? 20 : 6;
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + roll;
		const spread = lerp(0.1, 0.32, smooth(open)) + (k % 2) * 0.08;
		const L = 0.0062 * (k % 2 ? 0.85 : 1);
		const d = v3(Math.cos(a) * Math.sin(spread), Math.cos(spread), Math.sin(a) * Math.sin(spread));
		const p0 = v3(Math.cos(a) * 0.0026, 0.0048, Math.sin(a) * 0.0026);
		const p1 = p0.clone().addScaledVector(d, L);
		if (close) bag.add('body', tube([p0, p0.clone().lerp(p1, 0.5).add(v3(0, 0.0003, 0)), p1], () => 0.00017, () => mix(F.filament, '#c9a070', brown), 3), base);
		else bag.add('body', tube([p0, p1], () => 0.0003, () => mix(F.filament, '#c9a070', brown), 3), base);
		bag.add('body', bead(p1, v3(0.0006, 0.00042, 0.0006), mix(F.anther, '#7a5a2a', brown), close ? 5 : 2), base);
	}
	if (close)
		for (let k = 0; k < 5; k++) {
			const a = (k / 5) * Math.PI * 2 + roll + 0.3;
			const d = v3(Math.cos(a) * 0.12, 1, Math.sin(a) * 0.12).normalize();
			const p0 = v3(Math.cos(a) * 0.0008, 0.0045, Math.sin(a) * 0.0008);
			bag.add('body', tube([p0, p0.clone().addScaledVector(d, 0.0065)], (u) => 0.0003 + 0.0003 * Math.max(0, 0.3 - u), (u) => mix('#f4f2e8', F.style, u), 4, true), base);
		}
}

/* ---- the fruit ---- */

/**
 * How long and how wide a fruit is, 0 … 1 of ripe, by days after full bloom: a single sigmoid, the length ahead of
 * the width (the young fruit long and narrow: 'Eşme' 51 × 32 mm at 59 days, 93.5 × 82.5 mm at ~175, data sheet).
 */
const RIPE_DAYS = 175;
const fruitLength = (d) => straight(d, [[0, 0.1], [10, 0.13], [22, 0.2], [40, 0.36], [59, 0.52], [90, 0.72], [120, 0.86], [150, 0.96], [RIPE_DAYS, 1]]);
const fruitWidth = (d) => straight(d, [[0, 0.1], [10, 0.12], [22, 0.16], [40, 0.26], [59, 0.37], [90, 0.58], [120, 0.79], [150, 0.94], [RIPE_DAYS, 1]]);

/** the skin by days after bloom: green under the felt to ~110 days, yellow-green by 150, golden by 175 */
function skinAt(d, lit) {
	const F = QV.fruit;
	const k = d + lit * 8;
	if (k < 110) return mix('#8f9d58', F.green, clamp(k / 60));
	if (k < 150) return mix(F.green, F.yellowGreen, (k - 110) / 40);
	if (k < 178) return mix(F.yellowGreen, F.gold, (k - 150) / 28);
	return mix(F.gold, F.ripeDeep, (k - 178) / 25);
}
/** how much of the felt is left, 1 … 0: thick on the fruitlet, thinning as it swells, rubbed off at ripeness */
const feltAt = (d) => straight(d, [[0, 1], [30, 0.95], [60, 0.75], [100, 0.45], [140, 0.2], [160, 0.09], [RIPE_DAYS, 0.04]]);

/**
 * One quince: its profile turned, from the traced young club to the traced ripe pear by its age; the neck a little
 * crooked, the shoulders lumpy, five low rounded ribs round the calyx end and its eye: a shallow hollow with the
 * dried calyx in it; a small cavity round the stalk. Built from the stalk at the origin down −Y; `sun` the light's
 * direction in the fruit's own frame. Its rings close round at both ends (spaced by 1 − cos toward the poles).
 */
function quinceGeometry(o) {
	const { H, W, days, sun, ns, res } = o;
	const rings = res ? 120 : fewer(16, 6);
	const sides = res ? 120 : fewer(14, 6);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const ripe = smooth((days - 40) / 120);
	const felt = feltAt(days);
	const F = QV.fruit;
	const feltC = named(F.felt);
	const lean = (hashText(`${ns}`) % 100) / 100 - 0.5;
	const eye = 0.05; // the calyx end's radius closing, as a part of the length
	for (let i = 0; i <= rings; i++) {
		const th = (i / rings) * Math.PI;
		const u = (1 - Math.cos(th)) / 2; // 0 at the stalk, 1 at the calyx
		const prof = lerp(along(YOUNG_W, u), along(FRUIT_W, u), ripe);
		// close the ends round: the stalk end into its little cavity, the calyx end into its eye
		// round shoulders: a quarter circle over the last part of the length at each end
		const a0 = clamp(u / 0.16), a1 = clamp((1 - u) / 0.2);
		const close = Math.min(Math.sqrt(1 - (1 - a0) * (1 - a0)), Math.sqrt(1 - (1 - a1) * (1 - a1)));
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const ribs = 1 + 0.035 * Math.cos(5 * ph + ns) * smooth((u - 0.55) / 0.3) * ripe;
			const lump = 1 + 0.045 * (fbm(Math.cos(ph) * 1.6, Math.sin(ph) * 1.6, u * 3, 2, ns) - 0.5) * (0.4 + ripe);
			const rr = (W / 2) * prof * close * ribs * lump;
			const neck = 0.06 * W * lean * Math.pow(1 - u, 2) * ripe; // the neck a little crooked
			const x = rr * Math.cos(ph) + neck;
			const z = rr * Math.sin(ph);
			let y = -H * u;
			// the stalk cavity (small) and the eye (a shallow hollow round the calyx)
			y -= 0.004 * (H / 0.1) * (1 - smooth(u / 0.06)) * 0.6;
			y += 0.012 * (H / 0.1) * (1 - smooth((1 - u) / eye)) * (0.4 + 0.6 * ripe);
			pos.push(x, y, z);
			nor.push(0, 0, 0);
			uv.push((j / sides) * 3, u * 4);
			const n = v3(Math.cos(ph), 0.3 * (0.5 - u), Math.sin(ph)).normalize();
			const lit = Math.max(0, n.dot(sun));
			const c = skinAt(days + 10 * (fbm(x * 40, y * 40, z * 40, 2, ns + 9) - 0.5), lit);
			// the felt: grey-white over all of a young fruit, thinning; left longest in the neck's and the eye's hollows
			const hollow = Math.max(1 - smooth(u / 0.18), 1 - smooth((1 - u) / 0.14), 0.5 * (1 - ribs) / 0.035);
			const tuft = fbm(x * 260, y * 260, z * 260, 2, ns + 3);
			c.lerp(feltC, clamp(felt * 0.26 + hollow * felt * 1.6 * (days > 120 ? 1 : 0.4)) * (0.75 + 0.5 * (tuft - 0.5)));
			// a little greener at the neck and the eye till late
			c.lerp(named('#a8ac46'), (1 - smooth(u / 0.15)) * 0.25 * smooth((days - 120) / 40));
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
 * A quince on its shoot: the stalk 5 mm and stout, from `at` along `dir`; the fruit at its end; at its calyx end the
 * five sepals, green and felted on the fruitlet (spread, bigger than it), drying brown and bending back into the eye
 * as it ripens, the styles' brown tuft between them. `days` after bloom.
 */
function quince(bag, at, dir, days, sunWorld, seedKey, key) {
	const F = QV.fruit;
	const r = chance(seedKey, 'fruit', key);
	const k = about(r, 1, 0.08);
	const H = F.length * fruitLength(days) * k, W = F.width * fruitWidth(days) * k * about(r, 1, 0.04);
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).normalize();
	const res = DETAIL.fruit === key;
	const stalk = F.stalk * lerp(0.7, 1, clamp(days / 60));
	bag.add('body', tube(res ? [v3(0, 0, 0), v3(0.0004, -stalk * 0.5, 0), v3(0, -stalk, 0)] : [v3(0, 0, 0), v3(0, -stalk, 0)], (u) => 0.0018 + 0.0012 * u * clamp(days / 60), () => mix('#8a8a64', F.stalkColour, clamp(days / 90)), res ? 10 : 4), m);
	const kind = days < 140 ? 'felt' : 'skin';
	if (DETAIL.level < 0.5 && !res) {
		const c = skinAt(days, 0.5).lerp(named(F.felt), feltAt(days) * 0.6);
		bag.add('body', bead(v3(0, -stalk - H * 0.52, 0), v3(W / 2, H / 2, W / 2), c, 3), m);
		return { H, W, stalk };
	}
	const g = quinceGeometry({ H, W, days, sun, ns: hashText(key) % 991, res });
	g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -stalk + 0.001, 0));
	bag.add(kind, g, m);
	// the calyx at the far end: sepals (green, felted → dry brown, reflexed into the eye) and the styles' tuft
	const eyeY = -stalk - H + 0.012 * (H / 0.1) * 0.8;
	const dry = smooth((days - 50) / 70);
	const sl = lerp(0.0075, 0.009, dry) * (1 - 0.25 * dry);
	if (res || DETAIL.level >= 1 || days < 50) {
		for (let s = 0; s < 5; s++) {
			const sh = sheet({
				length: sl,
				width: sl * 0.45,
				shape: (u) => Math.sin(Math.PI * Math.pow(u, 0.7)),
				lift: (u) => 0.25 * u * u * dry,
				paint: (u) => mix(mix(F.sepalGreen, F.felt, 0.3), mix(F.sepalDry, '#3e2a1a', u * 0.6), dry),
				along: res ? 8 : 2,
				across: res ? 3 : 1,
			});
			const a = (s / 5) * Math.PI * 2 + roll;
			// spread out like a star over the fruitlet, then bent back into the eye as it widens
			const tilt = -Math.PI / 2 + lerp(1.1, 1.65, dry);
			bag.add('sheet', sh, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, eyeY, 0)).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(tilt)));
		}
		bag.add('body', bead(v3(0, eyeY - 0.0005, 0), v3(0.0022, 0.0012, 0.0022), mix('#9a9a6a', '#4e3622', dry), res ? 6 : 2), m);
	}
	return { H, W, stalk };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A quince pip sown as a rootstock seedling, budded with 'Vranja' low on its stem in
 * its first August; the next spring the stock is cut above the bud and the bud grows into a single whip (1.3 m in its
 * second September); planted out and headed back to 0.72 m, the top buds break into three to five upright scaffold
 * limbs at 30–45° from upright round a weak leader, the modified central leader the Belgrade trees are trained to
 * (Scarrone's model as the data sheet reads it: orthotropic, rhythmic axes, one flush a year). Along two-year and older
 * wood the buds break into short leafy shoots, 4–12 cm with 5–8 leaves, each ending in ONE flower when its bud was a
 * mixed one; the next year the shoot goes on from a bud just below the flower (or the fruit's scar), aside, so the
 * fruit wood grows as crooked zig-zag chains (sympodial). Heights and girth calibrated to the data sheet: 1.3 m and
 * ~1.5 cm in the whip's September, ~2.4 m and ~4 cm in its fourth summer, ~3.5 m and ~9 cm in its eighth autumn.
 */
const TREE = {
	depth: QV.pip.depth,
	union: 0.12, // the bud union above the soil
	head: 0.72, // the whip headed back to this at planting
	clear: 0.42, // no scaffolds below this
	seedling: 0.45, // the stock's first year
	whip: 1.18, // the 'Vranja' bud's first year
	leader: [0.45, 1.18, 0.92, 0.72, 0.48, 0.36, 0.28, 0.24, 0.2], // the leader's extension each year (m)
	// a side axis's first year by its order (1 the scaffolds), at vigour 1, and how each later year fades
	shoot: [0, 0.75, 0.55, 0.4, 0.28],
	fade: [1, 0.85, 0.72, 0.62, 0.55, 0.5, 0.46, 0.43],
	scaffoldAngle: 0.9, // from upright (~46°)
	internode: 0.026,
	tipRadius: 0.0019,
	unitRadius: 0.0024,
	pipeLength: 2.4e-7,
	trunkPipe: 4.5e-6, // the trunk's own sapwood for the leaves along it: a whip of 1.5 cm
	firstFlowers: 4, // first flowers in its fifth spring from sowing, the third after planting
	unitFlower: 0.17, // a short shoot's chance of a mixed bud (a flower at its tip) once the tree bears
	set: 0.34, // initial set, open-pollinated (Belgrade: 33.7 %)
	kept: 0.5, // of those, kept to harvest (final 16.2 %)
};

/**
 * The crown the tree keeps by its age (years from sowing): its height and width from the data sheet (2.4 × 1.6 m in its
 * fourth summer, 3.5 × 3.3 m in its eighth autumn; 3–5 m grown) and the sheet's 8-year tree, a dome widest about two
 * fifths up, its skirt near a metre from the ground. Each year's growth is steered inside the crown of that year.
 */
const CROWN = [
	[2, 1.4, 0.6],
	[3.5, 2.45, 1.8],
	[5.5, 3.15, 2.9],
	[7.5, 3.6, 3.8],
	[12, 4.2, 4.0],
];
function crownAt(age) {
	const H = straight(age, CROWN.map((r) => [r[0], r[1]]));
	const W = straight(age, CROWN.map((r) => [r[0], r[2]]));
	const yc = TREE.head + 0.4 * (H - TREE.head);
	return { H, W, yc };
}
/** the crown's radius at height y */
function crownRadius(y, c) {
	const k = y > c.yc ? (y - c.yc) / Math.max(0.2, c.H - c.yc) : (c.yc - y) / Math.max(0.2, c.yc - 0.25);
	// above its widest the dome's shoulders are full (a superellipse), below it rounds in to the skirt
	return (c.W / 2) * (y > c.yc ? Math.cbrt(Math.max(0.005, 1 - k * k * k)) : Math.sqrt(Math.max(0.02, 1 - k * k)));
}

/**
 * A year's season: the year turns at bud break, ~4 weeks before full bloom (`s` −0.08); `s` 0 the full bloom (about
 * 1 May), `days` since it. Germination is at t = 0.
 */
const seasonOf = (t) => {
	const year = Math.floor(t + 0.08);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** how much of a year's extension is grown, `dt` years into that season: shoots grow from late April to September */
const extension = (dt, kind, y) => {
	if (kind === 'trunk' && y === 0) return table(dt, [[-0.02, 0], [0, 0.04], [0.03, 0.12], [0.08, 0.18], [0.15, 0.25], [0.22, 0.34], [0.32, 0.62], [0.42, 0.9], [0.48, 1]]);
	if (kind === 'short') return span(dt, -0.075, 0.0);
	return span(dt, -0.06, 0.38);
};

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
 * The tree's axes at time t: each axis a polyline as far as grown, its nodes, the year each part grew in, and the
 * axes it bears. Every axis and node draws its own chance, so the tree at an earlier t is the first part of the tree
 * at a later one (but for what the grower cuts: the stock above the bud, the whip above 0.72 m).
 */
function axes(seed, t, base) {
	const all = [];
	const { year: nowYear, days: nowDays } = seasonOf(t);
	const vigourTree = about(chance(seed, 'tree'), 1, 0.05);
	const lean = (() => {
		const r = chance(seed, 'lean');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.03 + r() * 0.05);
	})();
	const grafted = t >= 0.92;
	const headed = t >= 1.92;

	/** the nodes along a stretch just walked: a leaf at each, as the axis grew past it */
	const addNodes = (ax, y, walked0, walked, len, first) => {
		while (ax.nodeAt < walked) {
			const within = ax.nodeAt - walked0;
			const u = within / Math.max(1e-6, len);
			ax.nodes.push({ i: ax.nodes.length, year: y, u, s: ax.nodeAt, formed: y + (first ? 0.02 : -0.06) + (ax.kind === 'short' ? 0.03 * u : 0.42 * Math.pow(clamp(u), 1.2)) });
			ax.nodeAt += ax.kind === 'short' ? ax.unitStep : TREE.internode * (ax.kind === 'trunk' && y === 0 ? 0.7 : 1);
		}
	};

	const grow = (key, from, dir, born, order, vigour, kind, parent, at, low = 0) => {
		if (t < born - 0.08 + (kind === 'trunk' ? 0.06 : 0.0)) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, low, pts: [from.clone()], years: [born], nodes: [], kids: [], vigour, dir0: dir.clone(), units: [], nodeAt: 0 };
		all.push(ax);
		const d = dir.clone().normalize();
		if (kind === 'short') {
			// a chain of short leafy shoots, one a year: each 4–12 cm with 5–8 leaves, ending in one flower when its bud
			// was a mixed one; the next goes on from a bud just below that tip, aside (sympodial)
			let p = from.clone();
			let side = across(d).applyAxisAngle(d, r() * Math.PI * 2);
			for (let y = born; y <= nowYear; y++) {
				const k = y - born;
				const ur = chance(seed, 'unit', ...key, k);
				// a chain shaded out or worn out stops and is shed with what it carries
				// inside the crown's shade more die (the leaves of a crown live in its outer shell)
				const shade = 1 - clamp(Math.hypot(p.x, p.z) / Math.max(0.2, crownRadius(p.y, crownAt(y))) / 0.8);
				if (k >= 1 && ur() < (k >= 2 ? 0.08 + 0.04 * k : 0) + 0.2 * shade * shade) {
					ax.died = y;
					break;
				}
				const treeYear = y;
				const flowering = treeYear >= TREE.firstFlowers && ur() < TREE.unitFlower * (k === 0 ? 0.85 : 1);
				const len = between(ur, 0.045, 0.11) * (flowering ? 1 : 0.75) * (k === 0 ? 1.15 : 1) * lerp(1, 0.75, clamp(k / 5));
				const f = extension(t - y, 'short', y);
				if (f <= 0) break;
				if (k > 0) {
					const prev = ax.units[k - 1];
					if (prev.flowering) {
						// on from the top bud below the flower: aside, a little up
						side.negate();
						d.copy(prev.dir).addScaledVector(side, 0.85).add(v3(0, 0.25, 0)).normalize();
					} else d.copy(prev.dir).add(v3(about(ur, 0, 0.2), 0.08, about(ur, 0, 0.2))).normalize();
				}
				const n = 5 + Math.floor(ur() * 3);
				ax.unitStep = len / n;
				const unit = { k, year: y, flowering, n, len, start: p.clone(), dir: d.clone(), opens: about(ur, 0.0, 0.016) };
				// will its flower set, and keep its fruit? (decided now: a fruit's weight bends its shoot down)
				unit.sets = flowering && ur() < TREE.set;
				unit.keeps = unit.sets && ur() < TREE.kept;
				ax.units.push(unit);
				const steps = 2;
				ax.nodeAt = (ax.pathLen0 ?? 0) + ax.unitStep * 0.5;
				const grown = len * f;
				const walked0 = ax.pathLen0 ?? 0;
				let walked = 0;
				const days = y === nowYear ? nowDays - unit.opens * 365 : 400;
				const load = unit.keeps && y === nowYear ? fruitLength(Math.max(0, days)) * fruitWidth(Math.max(0, days)) : 0;
				for (let i = 0; i < steps; i++) {
					const h = grown / steps;
					// it bends under its fruit, more toward its tip
					d.add(v3(about(ur, 0, 0.05), -0.28 * load * (i + 1) / steps, about(ur, 0, 0.05))).normalize();
					p = p.clone().addScaledVector(d, h);
					ax.pts.push(p);
					ax.years.push(y);
					walked += h;
				}
				addNodes(ax, y, walked0, walked0 + walked, len, false);
				ax.pathLen0 = walked0 + walked;
				unit.tip = p.clone();
				unit.tipDir = d.clone();
				unit.dir = d.clone();
				if (f < 1) break;
			}
			ax.tipYear = ax.years[ax.years.length - 1];
			finish(ax);
			// a second bud below a flower now and then grows too: the chain forks
			for (const u of ax.units)
				if (u.flowering && chance(seed, 'fork', ...key, u.k)() < 0.22 && order < 6) {
					const sd = across(u.dir).applyAxisAngle(u.dir, Math.PI * 2 * chance(seed, 'forkdir', ...key, u.k)());
					const kid = grow([...key, 'f', u.k], u.tip.clone().addScaledVector(u.dir, -0.004), u.dir.clone().addScaledVector(sd, 0.9).add(v3(0, 0.2, 0)).normalize(), u.year + 1, order + 1, 0, 'short', ax, ax.pathLen0);
					if (kid) ax.kids.push(kid);
				}
			return ax;
		}
		const outward = from.clone().setY(0);
		const crownOf = (y) => crownAt(y + 0.5);
		let walkedAll = 0;
		for (let y = born; y <= nowYear; y++) {
			const ageAxis = y - born;
			let len;
			let start = 0;
			if (kind === 'trunk') {
				if (y === 0) len = grafted ? TREE.depth + TREE.union : TREE.depth + TREE.seedling * vigourTree;
				else if (y === 1) len = headed ? TREE.head - TREE.union : TREE.whip * vigourTree * about(r, 1, 0.04);
				else len = 0; // headed: the top bud grows on as one of the scaffolds (below), and the centre stays open
			} else {
				len = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree;
				len *= lerp(1, 0.7, clamp((y - 4) / 4)); // shorter as it comes into full crop
			}
			if (len < 0.025) break;
			const f = kind === 'trunk' && y === 0 && grafted ? 1 : extension(t - y, kind, y);
			if (f <= 0) break;
			const first = kind === 'trunk' && y === 0;
			const step = first && t < 0.25 ? 0.004 : 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			const walked0 = walkedAll;
			if (kind === 'trunk' && y === 1) {
				// the 'Vranja' bud grows out of the side of the stock's stub, then straight up: a small kink at the union
				d.set(0.35, 1, 0.1).normalize();
			}
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'trunk') d.add(v3(lean.x * 0.08 + about(r, 0, 0.035), 0.32, lean.z * 0.08 + about(r, 0, 0.035)));
				else {
					// a limb keeps to its angle and rises to the light; its tip arches a little as it lengthens and bears
					// vigorous shoots grow upright, the more so the lower they are under the crown's top
					const c0 = crownOf(y);
					const up = (order === 1 ? 0.022 : 0.03) * (1 - 0.6 * low) ;
					// kept inside the crown of its year: what grows out of it turns in and down, over the top down
					const last = ax.pts[ax.pts.length - 1];
					const rr = Math.hypot(last.x, last.z);
					const R = crownRadius(last.y, crownOf(y));
					if (rr > R * 0.85 && rr > 1e-3) {
						const k = clamp((rr - R * 0.85) / Math.max(0.15, R * 0.3));
						d.add(v3((-last.x / rr) * 0.12 * k, (last.y > crownOf(y).yc ? -0.08 : 0.08) * k, (-last.z / rr) * 0.12 * k));
					}
					const over = last.y - crownOf(y).H;
					if (over > 0.1) d.y -= 0.1 * clamp((over - 0.1) / 0.3);
					// toward its place on the dome: its own bearing out from the stem, a height drawn from where it starts
					if (!ax.aim) {
						const ar = chance(seed, 'aim', ...key);
						const o2 = from.clone().addScaledVector(ax.dir0, 0.3).setY(0);
						const az = o2.lengthSq() > 1e-6 ? Math.atan2(o2.z, o2.x) : ar() * Math.PI * 2;
						ax.aim = { az: az + about(ar, 0, 0.25), up: low > 0.9 ? between(ar, -0.15, 0.1) : lerp(0.3, 1.0, Math.sqrt(ar())) };
						ax.aim.y0 = from.y;
					}
					{
						const yt = clamp(lerp(ax.aim.y0, c0.H, ax.aim.up), 0.75, c0.H * 0.97);
						const Rt = crownRadius(yt, c0) * 0.9;
						const want = v3(Math.cos(ax.aim.az) * Rt, yt, Math.sin(ax.aim.az) * Rt).sub(last);
						if (want.lengthSq() > 0.0025) d.addScaledVector(want.normalize(), order === 1 ? 0.07 : order === 2 ? 0.07 : 0.04);
					}
					// nothing grows down into the grass: a limb low over the ground turns up
					if (last.y < 0.7) d.y += 0.06 * clamp((0.7 - last.y) / 0.3);
					const sag = 0.0038 * (order + 0.5) * (order === 1 ? 1 - 0.55 * low : 1) * Math.min(5, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.35) * (nowYear >= TREE.firstFlowers + 1 ? 1.35 : 1);
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(0.012) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, 0.03);
					d.add(v3(about(r, 0, 0.11) + out.x, up - sag + about(r, 0, 0.04), about(r, 0, 0.11) + out.z)); // UPOV: one-year shoots wavy; old limbs crooked
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				walkedAll += h;
				addNodes(ax, y, walked0, walkedAll, len, first);
			}
			if (f < 1) break;
		}
		ax.tipYear = ax.years[ax.years.length - 1];
		finish(ax);
		// lateral buds: the next spring each breaks into a long shoot, a short leafy shoot (a fruiting one, once the
		// tree bears), or stays asleep
		for (const n of ax.nodes) {
			if (n.year + 1 > nowYear) continue;
			const br = chance(seed, 'bud', ...key, n.i);
			const u = n.u;
			const roll = br();
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			let pLong = 0, pShort = 0, angle = 0.8, vig = 0.5, skirt = false;
			if (kind === 'trunk') {
				const h = n.s - TREE.depth;
				if (n.year === 0) continue; // the stock: its buds are rubbed off
				if (n.year === 1) {
					// the whip headed at 0.72 m: its top buds make the scaffolds
					if (h < TREE.clear || !headed) continue;
					// the top bud and the four below it (2/5 apart round the stem: well spread) make the scaffolds
					const fromTop = ax.nodes.length - 1 - n.i;
					const top = fromTop === 0;
					pLong = fromTop < 5 ? 1 : 0; // (the grower takes off any lower)
					pShort = 0.2;
					// tiered: the top one upright, the lowest nearly level (it makes the skirt), the others between
					angle = fromTop < 5 ? [0.5, 0.72, 0.9, 1.02, 1.12][fromTop] * about(br, 1, 0.06) : TREE.scaffoldAngle * about(br, 1, 0.15);
					vig = [1.0, 1.0, 0.95, 0.9, 0.85][Math.min(4, fromTop)] * about(br, 1, 0.06);
				} else {
					pLong = u > 0.6 ? 0.36 : u > 0.3 ? 0.14 : 0.03;
					pShort = 0.25;
					angle = lerp(TREE.scaffoldAngle, 1.05, clamp(1 - (h - TREE.head) / 1.5)) * about(br, 1, 0.15);
					vig = lerp(0.55, 0.8, u) * about(br, 1, 0.1);
				}
			} else {
				const above = side.y > 0.55 ? 0.6 : side.y < -0.55 ? 0.3 : 1;
				const yearLen = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(n.year - born, TREE.fade.length - 1)];
				pLong = order >= 4 ? 0 : (u > 0.7 ? 0.42 : u > 0.4 ? 0.17 : u > 0.15 ? 0.05 : 0) * clamp(yearLen / 0.2) * above * (order === 2 ? 0.65 : order === 3 ? 0.3 : 1);
				pShort = u > 0.06 && u < 0.95 ? 0.34 : 0.04;
				angle = (order === 1 ? lerp(0.75, 0.5, u) : lerp(0.95, 0.65, u)) * about(br, 1, 0.15);
				vig = vigour * lerp(0.45, 0.85, u) * about(br, 1, 0.12);
				// low in the crown, a bud on the outer, lower side of a limb makes a shoot that arches out and down: the
				// crown's skirt (the sheet's tree is leafy down to a quarter of its height)
				const cr = crownAt(n.year + 1);
				if (order <= 2 && n.at.y < cr.yc && side.y < 0.25 && pLong < 0.4) {
					const outer = n.at.clone().setY(0);
					if (outer.lengthSq() > 1e-4 && side.dot(outer.normalize()) > -0.2) {
						pLong = Math.max(pLong, order === 1 ? 0.4 : 0.15);
						angle = 1.15 * about(br, 1, 0.1);
						vig = Math.max(vig, 0.55 * about(br, 1, 0.1));
						skirt = true;
					}
				}
			}
			if (roll < pLong) {
				// a side shoot leaves toward the outside of the crown more often than across it
				const outside = n.at.clone().setY(0);
				if (kind !== 'trunk' && outside.lengthSq() > 1e-4) side.addScaledVector(outside.normalize(), 0.45).sub(n.dir.clone().multiplyScalar(side.dot(n.dir))).normalize();
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const lowK = skirt ? 1 : kind === 'trunk' ? (n.year === 1 ? clamp((ax.nodes.length - 1 - n.i) / 4) : clamp(1 - (n.s - TREE.depth - TREE.clear) / 1.6)) : ax.low;
				const k = grow([...key, n.i], n.at, d0, n.year + 1, order + 1, vig, 'long', ax, n.s, lowK);
				if (k) ax.kids.push(k);
			} else if (roll < pLong + pShort * (kind === 'trunk' ? 1 : lerp(0.45, 1.5, clamp(Math.hypot(n.at.x, n.at.z) / Math.max(0.2, crownRadius(n.at.y, crownAt(n.year + 1))))))) {
				const d0 = n.dir.clone().multiplyScalar(0.55).addScaledVector(side, 1).add(v3(0, 0.3, 0)).normalize();
				const k = grow([...key, n.i, 's'], n.at, d0, n.year + 1, order + 1, 0, 'short', ax, n.s);
				if (k) {
					k.node = n;
					ax.kids.push(k);
				}
			}
		}
		return ax;
	};
	/** an axis's path lengths, its nodes placed, and their 2/5 phyllotaxis */
	const finish = (ax) => {
		ax.pathLen = lengths(ax.pts);
		ax.len = ax.pathLen[ax.pathLen.length - 1];
		const r2 = chance(seed, 'phyllo', ...ax.key);
		const phase = r2() * Math.PI * 2;
		ax.nodes = ax.nodes.filter((n) => n.s <= ax.len + 1e-6);
		for (const n of ax.nodes) {
			const p = pointAt(ax, n.s);
			n.at = p.at;
			n.dir = p.dir;
			n.bearing = phase + n.i * 2.513; // 2/5: two fifths of a turn between leaves
		}
	};
	const trunk = grow(['trunk'], base.clone(), v3(0, 1, 0), 0, 0, 1, 'trunk', null, 0);
	return { all, trunk };
}

/**
 * How thick each axis is along it: the pipe model (r^2.5 summed over what the wood feeds) plus a ring a year,
 * calibrated to the data sheet: a trunk of ~1.5 cm in the whip's September, ~4 cm in its fourth summer and ~9 cm in its
 * eighth autumn, at 30 cm.
 */
const PIPE = 2.5;
const RING = 0.04;
const RING_ADD = 0.0032;
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	const tip = ax.kind === 'short' ? TREE.unitRadius : TREE.tipRadius * (ax.kind === 'trunk' ? lerp(0.5, 1, clamp(t / 0.8)) : 1);
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		if (k.died !== undefined) continue;
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.q[0] * (k.born >= Math.floor(t + 0.08) ? 0.5 : 1) * (k.kind === 'short' ? 0.3 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(tip, PIPE) + acc + (ax.kind === 'short' ? 0 : (ax.kind === 'trunk' ? TREE.trunkPipe * clamp((t - 0.6) / 0.8) + TREE.pipeLength : TREE.pipeLength) * beyond);
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		const r = Math.pow(q * (1 + RING * woodAge), 1 / PIPE) + (ax.kind === 'short' ? 0.0002 * Math.min(woodAge, 5) : RING_ADD * Math.min(woodAge, 2.5) * clamp(Math.pow(q, 1 / PIPE) / 0.008));
		ax.r2[i] = r * r;
	}
}

/** the tree's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2 || ax.died !== undefined) return;
	if (ax.kind === 'short' && DETAIL.level < 0.3) return;
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
	const isTrunk = ax.kind === 'trunk';
	const step = isTrunk ? clamp(R0 * 0.3, 0.004, 0.03) : ax.kind === 'short' ? 0.02 : R0 > 0.012 ? clamp(R0 * 1.0, 0.015, 0.05) : clamp(R0 * 2, R0 < 0.004 ? 0.04 : 0.02, 0.08);
	const pts = [];
	const count = Math.max(2, Math.ceil(total / step));
	if (ax.kind === 'short') for (const p of ax.pts) pts.push(p);
	else for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	const sides = ax.kind === 'short' ? 3 : Math.round(clamp(R0 * (R0 > 0.012 ? 520 : 400), R0 < 0.005 ? 3 : 5, 40));
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const unionS = TREE.depth + TREE.union;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			const ground = s - TREE.depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.09);
			r *= 1 + 0.45 * clamp(t / 4) * flare * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 4 + nsAx));
			// the bud union: a swelling with a step where the 'Vranja' wood sits on the stock
			if (t > 0.92) r *= 1 + 0.12 * clamp((t - 0.92) / 2) * Math.exp(-Math.pow((s - unionS) / 0.025, 2));
			// an old trunk is a little fluted and twisted
			r *= 1 + 0.06 * clamp((t - 3) / 4) * Math.sin(v * Math.PI * 2 * 3 + s * 6 + nsAx);
		}
		if (ax.kind !== 'short' && s < r * 2.2 && ax.parent) r *= 1 + 0.25 * (1 - s / (r * 2.2)); // the branch collar
		return r * (1 + barkRelief(r, v, s, nsAx));
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - (ax.kind === 'short' ? 0.05 : 0.0) + 0.08;
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx);
		if (isTrunk && t < 1.2 && s < unionS + 0.02) {
			// the seedling: its hypocotyl pale green, reddening in the sun; its stem reddish and downy
			const hyp = s < TREE.depth ? mix('#ece4c8', QV.hypocotyl.colour, s / TREE.depth) : mix(QV.hypocotyl.colour, QV.hypocotyl.red, sun * 0.5 + clamp(t * 3) * 0.3);
			c.lerp(hyp, 1 - clamp((t - 0.5) / 0.7));
		} else if (isTrunk && t < 1.0 && yearAt(s) === 0) c.lerp(mix(QV.hypocotyl.red, QV.bark.shootFelt, 0.3), 1 - clamp((t - 0.3) / 0.6));
		if (isTrunk && s < TREE.depth + 0.01) c.lerp(named(QV.root.old), clamp((TREE.depth + 0.01 - s) / 0.03) * clamp(t));
		return c;
	};
	const kind = R0 < 0.006 && !isTrunk ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, true);
	if (kind === 'bark') metric(geo, total / 0.25, (Math.PI * 2 * Math.max(R0, 0.01)) / 0.25);
	bag.add(kind, geo);
}

/** the roots: the seedling's taproot, then the fibrous, shallow quince roots that spread wider than the crown */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.05, -1, 0.02),
		length: 0.7,
		grown: table(t, [[-0.06, 0], [-0.02, 0.01], [0, 0.04], [0.1, 0.16], [0.4, 0.35], [1, 0.55], [3, 0.8], [7, 1]]),
		radius: 0.0012 + 0.025 * span(t, 0.5, 7),
		down: 0.03,
		wander: 0.14,
		laterals: 9,
		lateral: 0.35,
		depth: 2,
		age: span(t, 0.2, 3),
		young: QV.root.young,
		old: QV.root.old,
	});
	const count = 12;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.05 + i * 0.25;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.01, -0.01 - rr() * 0.06, Math.sin(bear) * 0.01)),
			dir: v3(Math.cos(bear), -0.1 - rr() * 0.12, Math.sin(bear)),
			length: between(rr, 1.4, 2.3),
			grown: (t - born) / 5.5,
			radius: 0.0012 + 0.03 * span(t, born + 0.5, 7.5) * between(rr, 0.6, 1),
			down: 0.01,
			wander: 0.2,
			laterals: 7,
			lateral: 0.35,
			depth: 2,
			taper: 0.85,
			age: (t - born - 0.4) / 3,
			young: QV.root.young,
			old: QV.root.old,
			floor: -0.5,
		});
	}
}

/**
 * The whole quince at time t (years from germination): the pip, the roots, the wood, and what the season puts on it:
 * the seed leaves, buds in winter, leaves from early April, one flower at the tip of each fruiting short shoot about
 * 1 May, quinces from set to ripe, autumn yellow.
 */
function quinceTree(t, seed) {
	const bag = new Bag();
	const { year, s, days } = seasonOf(t);
	const base = v3(0, -TREE.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	const close = DETAIL.level >= 1 && t < 0.4; // a seedling is seen close up

	const { all, trunk } = axes(seed, t, base.clone());
	// the pip, sown after its winter's cold; lifted on the seed leaves as they come up, then shed
	if (t < 0.05) {
		const coat = t < 0 ? 0 : span(t, 0.0, 0.03);
		if (!trunk || t < 0.004) {
			const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.5, -Math.PI / 2 + 0.3));
			lite(t > 0.6 ? { level: Math.min(DETAIL.level, 0.5) } : {}, () => pip(bag, base.clone().add(v3(0.002, 0.0, 0)), turn, seed));
		} else if (coat < 1) {
			const tip = trunk.pts[trunk.pts.length - 1];
			const dir = trunk.pts.length > 1 ? tip.clone().sub(trunk.pts[trunk.pts.length - 2]).normalize() : UP;
			const q = new THREE.Quaternion().setFromUnitVectors(v3(1, 0, 0), dir.clone().negate());
			pip(bag, tip.clone().addScaledVector(dir, -0.003), q, seed);
		}
	}

	roots(bag, seed, t, base.clone().add(v3(0, -0.004, 0)));
	if (!trunk) return bag.build();
	// the hook: the hypocotyl comes up bent, the seed leaves pulled up backwards, and straightens in a week or two
	const hook = 1 - span(t, 0.005, 0.03);
	if (hook > 0 && trunk.pts.length > 2) {
		const pts = trunk.pts;
		const L = lengths(pts);
		const total = L[L.length - 1];
		const Lh = Math.min(0.016, total * 0.45);
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
	trunk.pathLen = lengths(trunk.pts);
	thicken(trunk, t);
	for (const ax of all) wood(bag, ax, t, hashText(seed) % 997, sunDir);

	// the seed leaves at the hypocotyl's top
	if (t >= 0 && t < 0.3 && year === 0) {
		const hs = Math.min(trunk.len, TREE.depth + QV.hypocotyl.length * lerp(0.4, 1, span(t, 0, 0.03)));
		const p = pointAt(trunk, hs);
		const tip = hs >= trunk.len - 1e-4;
		cotyledons(bag, p.at, tip ? p.dir : p.dir, span(t, 0.012, 0.035), span(t, 0.17, 0.27), chance(seed, 'cotyledons'));
	}

	const space = bag.space;
	for (const ax of all) {
		if (ax.pts.length < 2 || ax.died !== undefined) continue;
		const R = (i) => Math.sqrt(ax.r2[Math.min(ax.r2.length - 1, Math.round(i * (ax.r2.length - 1)))]);
		space.rod(ax.pts, (u) => R(u) + 0.002);
	}

	// leaves from bud break (early April) to fall (yellowing from mid October, bare by late November)
	const fall = span(s, 0.45, 0.58);
	const leafy = s > -0.07 && fall < 1;

	/** a leaf turned on its stalk, as little as it needs, out of the way of the fruit */
	const clearOfFruit = (at, out, size) => {
		if (!space.balls.length) return out;
		const len = QV.leaf.length * size, pet = QV.leaf.petiole * size;
		let best = out, low = Infinity;
		for (const turn of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
			const o = out.clone().applyAxisAngle(UP, turn);
			const flat = o.clone().setY(0).normalize();
			let cost = Math.abs(turn) * 0.0005;
			for (const f of [0.35, 0.7, 1]) cost += space.inFruit(at.clone().addScaledVector(flat, pet + f * len * 0.9).add(v3(0, -0.2 * f * len, 0)), len * 0.28);
			if (cost < low) (low = cost), (best = o);
			if (cost < 0.001) break;
		}
		return best;
	};

	// first the flowers and fruit (their places taken in the space), then the leaves round them
	for (const ax of all) {
		if (ax.kind !== 'short' || ax.died !== undefined) continue;
		for (const u of ax.units) {
			if (!u.flowering) continue;
			if (u.year === year) flowerSite(bag, seed, [...ax.key, u.k], u, s, days, space, sunDir);
			else if (u.year === year - 1 && s < -0.03 && u.keeps) {
				// last year's fruit scar: a little knob at the old tip (the fruit picked)
			}
		}
	}
	for (const ax of all) {
		if (ax.died !== undefined) continue;
		const tipRadius = Math.sqrt(ax.r2[ax.r2.length - 1]);
		for (const n of ax.nodes) {
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const surf = n.at.clone().addScaledVector(side, Math.max(tipRadius, 0.0015));
			const budDir = side.clone().addScaledVector(n.dir, 1.4).normalize();
			if (n.year === year && t >= n.formed && leafy) {
				const ageL = clamp((t - n.formed) / (ax.kind === 'short' ? 0.07 : 0.06));
				let size;
				if (ax.kind === 'short') {
					// the first two leaves of a short shoot small, the ones under the flower the largest
					const unit = ax.units.find((x) => x.year === n.year);
					const j = unit ? Math.round(n.u * unit.n) : 3;
					size = (j < 1 ? 0.3 : j < 2 ? 0.55 : j < 3 ? 0.8 : 0.95) * about(nr, 1, 0.08);
				} else if (ax.kind === 'trunk' && n.year === 0) size = Math.min(0.85, 0.22 + 0.05 * n.i) * about(nr, 1, 0.08); // the seedling's first leaves small
				else size = (n.i < 2 && ax.kind !== 'trunk' ? 0.4 : 1) * about(nr, 1.0, 0.1) * (year < 2 ? 0.85 : 1);
				if (ax.kind === 'trunk' && n.year === 0 && n.s < TREE.depth + QV.hypocotyl.length) continue; // the hypocotyl has none
				leaf(bag, surf, clearOfFruit(surf, side.clone().addScaledVector(n.dir, 0.45).normalize(), size), size, ageL, fall, nr, close);
			} else if (n.year < year && n.year >= year - 1 && (s < -0.04 || s > 0.5) && ax.kind !== 'short' && n.u > 0.1) {
				// winter: the buds along last year's wood
				bud(bag, n.at.clone().addScaledVector(side, Math.max(tipRadius, 0.0015) * 0.8), budDir, false, clamp((s + 0.08) / 0.05), nr);
			}
		}
		// the shoot's end bud in autumn and winter
		if ((s > 0.52 || s < -0.04) && ax.pts.length > 1 && ax.kind !== 'trunk') {
			const n = ax.pts.length;
			const mixed = ax.kind === 'short' && year + (s > 0.3 ? 1 : 0) >= TREE.firstFlowers;
			bud(bag, ax.pts[n - 1], ax.pts[n - 1].clone().sub(ax.pts[n - 2]).normalize(), mixed, clamp((s + 0.08) / 0.06), chance(seed, 'season', ...ax.key));
		}
	}
	return bag.build();
}

/**
 * A flowering short shoot's tip through its season: the dark pink bud among the unfolding leaves, the flower (about 1
 * May, ten days to a fortnight over the tree), petal fall; a third set, half of those kept (the rest drop by June),
 * swelling into quinces that sit almost stalkless at the shoot's tip and hang over as they grow heavy: grey-felted and
 * green, yellow-green, golden.
 */
function flowerSite(bag, seed, key, unit, s, days, space, sunDir) {
	const fr = chance(seed, 'flower', ...key);
	const at = unit.tip;
	const facing = unit.dir.clone().add(v3(0, 0.6, 0)).normalize();
	const ph = s - unit.opens;
	if (ph < -0.075) return;
	if (ph < -0.012) {
		// the bud on the growing shoot: green, then the dark pink petals showing
		const sw = clamp((ph + 0.075) / 0.06);
		const q = new THREE.Quaternion().setFromUnitVectors(UP, facing);
		const c = mix('#9aa070', QV.flower.budDark, smooth((sw - 0.4) / 0.5));
		bag.add('body', bead(at.clone().addScaledVector(facing, 0.004 + 0.004 * sw), v3(0.003 + 0.003 * sw, 0.004 + 0.005 * sw, 0.003 + 0.003 * sw), c, DETAIL.fruit ? 5 : 3, q));
		return;
	}
	if (ph < 0.06) {
		const open = span(ph, -0.012, 0.006);
		const fall = span(ph, 0.028, 0.044); // each flower open about ten days
		if (fall < 1) {
			const fp = at.clone().addScaledVector(facing, 0.002);
			flower(bag, fp, facing, open, fall, fr, DETAIL.fruit === key.join('|'));
		}
		if (!unit.sets || fall < 1) return;
	}
	if (!unit.sets) return;
	const d = days - unit.opens * 365;
	if (d > RIPE_DAYS + 20) return; // picked
	if (!unit.keeps && d > 45) return; // dropped
	// it hangs over as it grows heavy: from facing up the shoot to hanging out and down
	const out = unit.dir.clone().setY(0);
	if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
	out.normalize();
	const heavy = smooth(fruitWidth(d) * 1.6 - 0.25);
	const down = v3(0, -1, 0).addScaledVector(out, 0.55).normalize();
	const hang = facing.clone().lerp(down, heavy).normalize();
	const F = QV.fruit;
	const ripe = (a2, d2) => [
		{ c: a2.clone().addScaledVector(d2, F.stalk + F.length * 0.3), r: F.width * 0.32 },
		{ c: a2.clone().addScaledVector(d2, F.stalk + F.length * 0.66), r: F.width * 0.44 },
	];
	let place = { at, dir: hang };
	if (unit.keeps) {
		// a fruit kept to ripeness finds its place for its ripe size (the ones that drop hang as they are)
		const settled = space.settle(at, down, ripe, 0.0, 0.03);
		if (settled) place = { at, dir: facing.clone().lerp(settled.dir, heavy).normalize() };
	}
	if (DETAIL.level >= 0.5 || DETAIL.fruit) bag.fruit(key, at, place.dir);
	quince(bag, at, place.dir, d, sunDir, seed, key.join('|'));
	bag.fruitDone();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the pip to ripe quinces; `t` the years since germination each is grown at (between two stages, on
 * the way). The last five are one season of the tree's eighth year: full bloom about 1 May, ripe 'Vranja' quinces
 * some 175 days after (late October).
 */
const STAGES = [
	{ name: 'Pip', t: -0.3, note: 'A quince pip, 9 × 5 × 2.8 mm, glossy red-brown and wedge-shaped, its coat slimy when wet; sown 1.5 cm deep after 60–120 days of moist cold. Quinces do not come true from seed: the seedling will be the rootstock.' },
	{ name: 'Germination', t: 0.016, note: 'Late April: the root goes down and the hypocotyl comes up in a hook, pulling the two seed leaves out of the pip (epigeal); the coat is lifted on them and shed.' },
	{ name: 'Seedling', t: 0.22, note: 'July, three months up: a reddish, downy stem 15 cm tall, the seed leaves yellowing, the first true leaves small and round, white-woolly beneath. In August it is budded with \'Vranja\' a hand above the soil.' },
	{ name: 'Grafted whip', t: 1.4, note: 'Its second September: the stock was cut above the \'Vranja\' bud in spring and the bud grew into a single whip 1.3 m tall, purplish-red and felted at its tip, the bud union a step low on the stem; leaves 9 × 6 cm.' },
	{ name: 'Young tree', t: 3.32, note: 'Its fourth summer, the second after planting: headed at 0.72 m, it branched low into four upright, crooked limbs, the top one leading; about 2 m tall, the trunk 3.5–4 cm across. Short leafy shoots along its two-year wood; no flowers yet.' },
	{ name: 'Blossom', t: 7.012, note: 'Eighth spring, about 1 May, after the leaves: one large flower, 4.5–5 cm across, alone at the tip of each short new leafy shoot, dark pink in bud, opening pale pink; the tree in flower for ten days to a fortnight. Self-fertile.' },
	{ name: 'Fruit set', t: 7.065, note: 'Late May, three weeks on: the petals fallen; about a third set, small grey-white felted clubs under five green sepals spread like a star; unfertilised ones drop within four weeks, and half the rest by June.' },
	{ name: 'Green quinces', t: 7.28, note: 'Early August, about 100 days: long green pear-shaped quinces 7 × 5 cm, still in their grey felt, sitting at the tips of their shoots and bending them over.' },
	{ name: 'Colouring', t: 7.41, note: 'Late September, about 150 days: nearly full size, yellow-green, the felt thinning and rubbing off; the tree begins to smell of them.' },
	{ name: 'Ripe', t: 7.48, note: "Late October, about 175 days after bloom: ripe 'Vranja' quinces, 10 × 8 cm and about 400 g, pear-shaped with a short neck, golden yellow and faintly greasy, the dry calyx in a hollow at the broad end, rock hard and fragrant; the leaves turning yellow. Picked for jelly, paste and the cellar." },
];

/** the years since germination at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => quinceTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one quince on its own ---- */

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

/** one quince at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
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
	if (!f) return none('This quince has not set yet.');
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
	id: 'quince',
	label: "Quince 'Vranja' · Cydonia oblonga",
	latin: "Cydonia oblonga Mill. 'Vranja' · syn. Vranjska, 'Vranja Nenadović', Riesenquitte von Vranja, Monstrueux de Vranja · Vranjska dunja",
	note: "'Vranja', the big pear-shaped quince of southern Serbia: a strong, upright, dense little tree 3.5–5 m tall, branching low into crooked limbs, its old bark flaking to orange-brown patches; broad ovate leaves 9 × 6 cm, dull dark green above and grey-white felted beneath; one large pink flower at the tip of each short leafy shoot in early May; golden pear-shaped quinces with a neck, 10 × 8 cm and about 400 g, grey-felted while young, ripe in late October.",
	from: 'Tree · grafted, its eighth year from the pip',
	layer: 'sub-canopy',
	// the reference sheet it was made and checked against: play keeps it by its hash
	sheet: { hash: '26a192a56cc98409a5a546f077fbf88ddebeac006fd137c7205f3bf02d194081', model: 'fal-ai/nano-banana-pro (sheet 2, its ripe fruit redrawn with nano-banana-pro/edit)', made: '2026-11-05' },
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right; plant-skill's data sheet for the quince ('Vranja'), S1–S28
	facts: {
		height: { at2: [1.2, 1.5], at4: [1.9, 2.3], at5: [2.3, 2.7], at6: [3, 3.5], at8: [3.3, 3.8], at12: [3.5, 4.5], grown: [3.5, 5], unit: 'm' },
		trunk: { at2: [0.015, 0.02], at4: [0.035, 0.045], at6: [0.06, 0.08], at8: [0.08, 0.1], at12: [0.1, 0.13], at22: [0.16, 0.22], unit: 'm' },
		crown: { at4: [1.2, 1.6], at6: [2, 2.5], at8: [2.6, 3.2], at12: [3, 3.5], grown: [3, 5], unit: 'm' },
		spacing: { orchard: [[4.5, 5], [3, 3.5]], garden: [4, 5], unit: 'm' },
		shade: 'full sun',
		climate: 'temperate continental to Mediterranean; hardy to −15 to −25 °C (RHS H5, zones 5–9); chilling 100–450 h; late flowering escapes spring frost; moist, well-drained loam or clay, some drought',
		years: { firstFlowers: [2, 3], firstCrop: [3, 4], fullBearing: [6, 8], productiveLife: [25, 50], note: 'years after planting a one-year grafted tree' },
		leaf: { length: [0.08, 0.11], width: [0.05, 0.07], petiole: [0.008, 0.015], budBreak: 'early April', fall: 'mid October–mid November', autumn: 'yellow', unit: 'm' },
		flower: { diameter: [0.045, 0.05], perShoot: 1, petals: 5, stamens: 20, styles: 5, start: 'late April–mid May', colour: 'dark pink in bud, pale pink open', set: 0.337, kept: 0.162, selfFertile: true, unit: 'm' },
		fruit: { length: [0.09, 0.11], width: [0.07, 0.09], mass: [0.3, 0.55], shape: 'pyriform with a neck', stalk: 0.005, daysFromBloom: [165, 180], harvest: 'mid–late October', seeds: [20, 30], felt: 'grey-white, rubbed off when ripe', unit: 'm, kg, days' },
		seed: { length: [0.0084, 0.0106], mass: [0.000036, 0.000042], chilling: [60, 120], depth: 0.015, germination: 'epigeal', trueToType: false, unit: 'm, kg, days' },
		yield: { at6to8: [10, 20], fullBearing: [30, 50], unit: 'kg a tree a year' },
		rootstock: 'quince seedling (here), or Quince A / MA, BA 29',
		diseases: 'fire blight (the main one in Serbia), quince leaf blight, brown rot, powdery mildew',
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one quince) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? STAGES.length - 1, `${seed ?? 'maia'}`) : () => grow(stage ?? STAGES.length - 1, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'quince' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'quince',
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
module.exports.organs = { QV, LEAF_W, FRUIT_W, YOUNG_W, pip, cotyledons, leaf, flower, quince, quinceGeometry, bud, Bag, timeAt, quinceTree, axes, thicken, fruitLength, fruitWidth, skinAt, surface, lite, detailAt, STAGES, grow };
