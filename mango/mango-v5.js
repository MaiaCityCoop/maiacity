'use strict';
/*
 * MANGO 'TOMMY ATKINS' — Mangifera indica L. 'Tommy Atkins' (Anacardiaceae), the Florida mango (a seedling of 'Haden',
 * selected in the 1920s, named 1948) that is now the mango most grown for trade the world over.
 * Version 2 of plants/mango: one named cultivar, grown from its stone to a tree in its eighth year, bearing.
 *
 * Its numbers are 'Tommy Atkins's where they are measured (Embrapa Cerrados and Petrolina: height 2.65 m at 4 years, 3.96 m
 * at 7, 4.46 m at 8, trunk 15.2–18.9 cm at 7; fruit 10.9 × 9.6 × 8.7 cm, mature 98–120 days after bloom; panicle
 * 28.4 × 21 cm, 500–750 flowers, 30 % perfect; UF/IFAS EDIS MG216 and its Tommy Atkins phenology page; Campbell &
 * Campbell 2006) and the species' otherwise (PROSEA 2, ICRAF Agroforestree, Morton 1987, Normand et al. 2009):
 * stone 28–42 g, germination hypogeal in 8–21 days; growth in flushes of 10–20 leaves crowded at the tips of growth
 * units, four or five flushes a year young, two or three bearing, every flush limp and wine-red at first; leaves
 * 15–30 × 3.5–7 cm, kept two to five years; panicles at the shoot tips in the cool dry season, fruit one to three a
 * panicle, hanging on its axis. Grown from the stone it is a seedling tree, flowering in its 5th–7th year; shown
 * bearing in its eighth.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   cacao v3 carries it, with a material for the mango's waxy skin.
 *   2. ORGANS       the mango's own organs, each to its measure: stone, leaf, flower, panicle, fruit, bark.
 *   3. THE TREE     its growth units flush by flush (Scarrone's model), how thick each is, its roots, the crop.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from sowing the stone.
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
const DETAIL = { level: 1, roots: true, thin: 1, fill: 1, finest: 0, fruit: false, old: false };

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
/** a colour written as text, parsed once and kept (never change the one it gives) */
const HEX = new Map();
const hex = (c) => {
	if (typeof c !== 'string') return c instanceof THREE.Color ? c : C.set(c);
	let k = HEX.get(c);
	if (!k) HEX.set(c, (k = new THREE.Color(c)));
	return k;
};
const toColor = (c) => (c instanceof THREE.Color ? c : hex(c));
/** a colour between two, as a new THREE.Color */
const mix = (a, b, t) => new THREE.Color().copy(hex(a)).lerp(hex(b), clamp(t));

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

/**
 * The materials, made once. `bark` old wood, matt; `twig` young wood, its skin glossy; `leaf` a leaf's two faces,
 * each its own colour (one-sided), the upper glossy; `sheet` thin things seen from both sides (petals, sepals);
 * `pod` the cacao pod's husk, smooth and a little waxy; `skin` the mango's skin, waxy with a pale bloom; `body`
 * everything else.
 */
const MATERIALS = {
	bark: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
	leaf: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.5 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
	pod: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.55 }),
	skin: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color('#e8e4dc') }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
	// a leaf on a tree of thousands: its outline and veins a picture (`bladeMap`) on a folded sheet, cut by the picture's alpha
	blade: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.5, alphaTest: 0.4, map: bladeMap() }),
};
const materials = {};
const material = (kind) => (materials[kind] ??= (MATERIALS[kind] ?? MATERIALS.body)());
const KINDS = ['bark', 'twig', 'body', 'leaf', 'blade', 'sheet', 'pod', 'skin', 'prop'];
const THINNED = { leaf: true, blade: true, sheet: true };

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
			const merged = mergeGeometries(list);
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
				if (age > 0.3) c.lerp(hex('#3c2c20'), 0.35 * noise3(v * 8, s * 30, 0, ns) * (1 - u));
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
 * 2. ORGANS — the mango's own, each to its measure ('Tommy Atkins' where it is measured, the species otherwise)
 * ============================================================================================================== */

/** The cultivar's numbers, in one place (metres, colours as seen in daylight). */
const MA = {
	stone: { length: 0.1, width: 0.042, thick: 0.022, husk: '#d9c89a', huskDark: '#b39a66', fibre: '#e6d9b4', wet: '#8a7650' },
	leaf: {
		length: 0.26, // a grown leaf: 15–35 cm …
		width: 0.065, // … by 5–7 cm (adult 'Tommy Atkins' 20–30 × 5–7 cm), the stalk a sixth of the blade
		petiole: 0.045, // 1.5–6 cm, swollen at its foot
		top: '#173414',
		topLight: '#28501e',
		under: '#43662e',
		vein: '#d2cf8c', // the midrib pale yellow-green above
		flush: '#6e2230', // a new flush: wine-red to burgundy …
		flushPurple: '#55203a', // … purple where the sun does not reach …
		flushCopper: '#9a4a34', // … bronze where it does
		flushGreen: '#7fa548', // then soft and light green
		old: '#c8a43e', // a leaf before it falls
	},
	panicle: { cyme: '#cbbd7c', cymeTan: '#ae8f60', cymePink: '#c38088', rachis: '#c0446a', rachisGreen: '#8a9a54', bud: '#c8b07a', petal: '#f2e7ae', blush: '#e8909a', stripe: '#d65a2e', disc: '#e6b03a', dry: '#8a6a48' },
	fruit: {
		length: 0.12, // 'Tommy Atkins': 10–14 cm long (10.9 measured in Brazil, 9.9 in Colombia, larger in Florida) …
		width: 0.096, // … 8.4–10.5 cm broad …
		thick: 0.086, // … 7.9–9.5 cm thick; 400–700 g
		stalk: 0.026, // its own pedicel, at the end of the hanging panicle axis
		green: '#4c862a',
		greenPale: '#93b44a',
		ground: '#e9b23a', // ripe ground colour, orange-yellow
		orange: '#e57f2a',
		blush: '#a8243e', // the red blush on the sunny side …
		deep: '#6e2440', // … deep purple-crimson where it is darkest
		youngBlush: '#8a5a72', // the dusty purple-pink of a green fruit's blush
		lenticel: '#f2e5a6',
		stalkWood: '#6a6a3a',
	},
	bark: { shoot: '#5c7a2e', shootRed: '#7a3a2e', young: '#6f6555', grey: '#645b50', plate: '#4f463c', dark: '#463c33', fissure: '#231d18', pale: '#8d8273', lichen: '#b9bbae', lichenGreen: '#929e7e', lenticel: '#b4a888' },
	root: { young: '#efe3c8', old: '#5e4632' },
};

/* ---- shapes made by turning a profile round an axis ---- */

/**
 * A body of revolution along −Y from the origin (0 at the top, 1 at the far end, `len` long): its radius at a place
 * `radius(u, ph)` (ph 0 … 2π round it), its colour `paint(u, ph, p)`, and where its axis runs `spine(u)` (an offset
 * in X and Z, for a body that is bent). A stone, a fruit, a bud.
 */
function turned({ len, radius, paint, rings, sides, spine }) {
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let i = 0; i <= rings; i++) {
		const u = i / rings;
		const o = spine ? spine(u) : null;
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const r = Math.max(0, radius(u, ph));
			const p = v3(r * Math.cos(ph) + (o ? o.x : 0), -u * len, r * Math.sin(ph) + (o ? o.z : 0));
			pos.push(p.x, p.y, p.z);
			nor.push(Math.cos(ph), 0, Math.sin(ph));
			uv.push(j / sides, u);
			const c = toColor(paint(u, ph, p));
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

/* ---- the stone ---- */

/**
 * The stone of a 'Tommy Atkins' mango as it is sown, the flesh scraped off: the woody, fibrous endocarp, flat and
 * kidney-shaped, about 10.5 × 4.8 × 2.4 cm, straw-coloured, its surface grooved lengthwise and furred with the short
 * fibres that ran into the flesh, a ridge along its convex (dorsal) edge. Inside, the single kernel (Tommy Atkins is
 * monoembryonic). Lying along +X, flat (thinnest along Y), its concave edge, where the shoot comes out, toward +Z.
 * `rot` 0 … 1 how far it has weathered in the soil.
 */
function stone(bag, m, seed, close, rot = 0) {
	const S = MA.stone;
	const ns = hashText(seed + 'stone') % 997;
	const L = S.length;
	const g = turned({
		len: L,
		rings: close ? 64 : fewer(14, 6),
		sides: close ? 56 : fewer(14, 6),
		radius: (u, ph) => {
			// oblong, the stalk end (u 0) blunter and broader, the far end rounded
			const body = Math.pow(Math.sin(Math.PI * clamp(0.008 + 0.984 * u)), 0.5) * (1 + 0.1 * (0.5 - u));
			const cx = Math.cos(ph), sz = Math.sin(ph);
			// flat: an ellipse W × T, a little keeled along the dorsal edge (−Z)
			const e = 1 / Math.sqrt(cx * cx * Math.pow(S.width / S.thick, 2) + sz * sz);
			const keel = 1 + 0.06 * Math.exp(-Math.pow((ph - Math.PI * 1.5) / 0.35, 2));
			const grooves = 1 + 0.03 * Math.sin(ph * 26 + 3 * fbm(u * 4, cx, sz, 2, ns)) * (close ? 1 : 0);
			return (S.width / 2) * body * e * keel * grooves * (1 + 0.05 * (fbm(u * 5, cx * 2, sz * 2, 2, ns) - 0.5));
		},
		// kidney-shaped: the ventral edge (+Z) a little hollowed
		spine: (u) => v3(0, 0, -0.06 * S.width * Math.sin(Math.PI * u)),
		paint: (u, ph, p) => {
			const streak = fbm(p.x * 900, p.y * 40, p.z * 900, 3, ns);
			const c = mix(S.husk, S.huskDark, smooth((streak - 0.35) / 0.4));
			c.lerp(hex(S.fibre), 0.3 * noise3(p.x * 1500, p.y * 60, p.z * 1500, ns + 3));
			return c.lerp(hex(S.wet), rot * 0.7).lerp(hex('#3e3020'), rot * rot * 0.5);
		},
	});
	g.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2)).applyMatrix4(new THREE.Matrix4().makeTranslation(-L / 2, 0, 0));
	// lie flat: the ellipse's width already along X of the turned body becomes Z after the turn
	bag.add('body', g, m);
	if (!close || rot > 0.6) return;
	// the fibres that ran into the flesh: a fine fur lying on it, combed toward the far end, a fringe along the edges
	const r = chance(seed, 'stone-fibres');
	for (let i = 0; i < 320; i++) {
		const u = between(r, 0.06, 0.97);
		const edge = r() < 0.65;
		const side = r() < 0.5 ? 1 : -1;
		const ph = edge ? (side > 0 ? 0 : Math.PI) + about(r, 0, 0.35) : (side > 0 ? 0.5 : 1.5) * Math.PI + about(r, 0, 0.9);
		const body = Math.pow(Math.sin(Math.PI * u), 0.5);
		const x = u * L - L / 2;
		const p0 = v3(x, Math.sin(ph) * S.thick * 0.5 * body * 0.97, Math.cos(ph) * S.width * 0.5 * body * 0.97 - 0.06 * S.width * Math.sin(Math.PI * u));
		const out = v3(0, Math.sin(ph), Math.cos(ph));
		const len = between(r, 0.004, edge ? 0.011 : 0.005) * (1 - rot);
		const p1 = p0.clone().addScaledVector(out, len * 0.25).add(v3(len * 0.7, 0, 0));
		const p2 = p1.clone().addScaledVector(out, len * 0.1).add(v3(len * 0.6, -len * 0.15, 0));
		bag.add('body', tube([p0, p1, p2], (k) => 0.00014 * (1 - 0.5 * k), () => mix(S.fibre, S.husk, r() * 0.6), 3), m);
	}
}

/* ---- the leaf ---- */

/**
 * Its outline: narrowly oblong-lanceolate, widest about the middle, the base wedge-shaped running into the stalk, the
 * tip drawn out (acuminate); the margin entire and wavy.
 */
const leafShape = (u) => {
	const base = Math.pow(smooth(u / 0.34), 0.8); // the wedge of the base
	const tip = Math.pow(clamp((1 - u) / 0.48), 0.75); // tapering to a pointed tip
	return Math.max(0.02, Math.min(base * 0.95 + 0.05, tip)) * (u < 0.015 ? 0.6 : 1);
};

/**
 * One leaf from its node: the stalk, swollen at its foot (the pulvinus), then the blade. `age` in years since its
 * flush broke: for about three weeks it expands, limp and hanging, deep red-bronze; then it turns soft lime-green and
 * lifts; it darkens to a deep glossy green by two months and lives two to three years before it yellows and falls.
 * `size` 0 … 1 of a grown leaf, `out` the way it leaves the node, `sun` 0 … 1 how lit it is, `droop` its grown angle.
 */
/** how much of its sheet's width a cut-out leaf fills at its widest */
const BLADE_FIT = 0.94;
let BLADE_MAP = null;
/**
 * The leaf's picture, made once from its numbers: x along it from its base to its tip, y across it; its outline
 * (`leafShape`) in the alpha, the pale midrib and the many fine, nearly straight side veins, a faint mottle; white
 * elsewhere, so the vertex colours give the leaf its colour (the flush's bronze, the lime, the dark green).
 */
function bladeMap() {
	if (BLADE_MAP) return BLADE_MAP;
	const W = 512, H = 128;
	const data = new Uint8Array(W * H * 4);
	const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const u = (x + 0.5) / W, v = ((y + 0.5) / H - 0.5) * 2;
			const half = leafShape(u) * BLADE_FIT;
			const k = (((u * 24 - (Math.abs(v) / BLADE_FIT) * 2.2) % 1) + 1) % 1;
			const side = smooth((0.05 - Math.abs(k - 0.5) * 2 + 0.95) / 0.05) * (Math.abs(v) < half * 0.9 ? 1 : 0);
			const mid = Math.abs(v) < 0.04 ? 1 - u * 0.5 : 0;
			const g = 0.97 + 0.07 * side + 0.3 * mid + 0.04 * (noise3(u * 20, v * 6, 3, 2) - 0.5);
			const i = (y * W + x) * 4;
			data[i] = data[i + 1] = Math.round(clamp(srgb(g)) * 255);
			data[i + 2] = Math.round(clamp(srgb(g * (1 - 0.12 * mid))) * 255);
			data[i + 3] = Math.round(clamp((half - Math.abs(v)) / 0.02 + 0.5) * 255);
		}
	const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
	t.colorSpace = THREE.SRGBColorSpace;
	t.generateMipmaps = true;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	t.magFilter = THREE.LinearFilter;
	t.anisotropy = 8;
	t.needsUpdate = true;
	return (BLADE_MAP = t);
}

/** whether a tree's leaves are cut out of their picture (a tree past its third year, of thousands of leaves) */
let CUT = false;

/**
 * A cut-out leaf's sheet: along +X from its base, `half` its half width, its face up; its upper face folded along the
 * midrib (`lift(u, v)`, as the built leaf's) in two spans; its underside one flat sheet a hair below, lit as the face
 * above it. Six triangles.
 */
function cutLeaf(len, half, lift, top, under) {
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (const u of [0, 0.5, 1])
		for (const v of [-1, 0, 1]) {
			pos.push(u * len, lift(u, v * BLADE_FIT) * len, v * half);
			nor.push(0, 1, 0);
			uv.push(u, (v + 1) / 2);
			const c = toColor(top(0.15 + 0.7 * u, v * 0.5));
			col.push(c.r, c.g, c.b);
		}
	for (let i = 0; i < 2; i++)
		for (let j = 0; j < 2; j++) {
			const a = i * 3 + j, b = a + 3;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	const base = pos.length / 3;
	for (const u of [0, 1])
		for (const v of [-1, 1]) {
			pos.push(u * len, lift(u, v * BLADE_FIT) * len - 0.003 * len, v * half);
			nor.push(0, -1, 0);
			uv.push(u, (v + 1) / 2);
			const c = toColor(under(0.15 + 0.7 * u, v * 0.5));
			col.push(c.r, c.g, c.b);
		}
	idx.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
	const g = made(pos, nor, uv, col, idx, true);
	const n = g.attributes.normal;
	[0, 2, 6, 8].forEach((k, i) => n.setXYZ(9 + i, n.getX(k), n.getY(k), n.getZ(k)));
	return g;
}

function leaf(bag, at, out, o) {
	const { age, life, size, petiole, r, close, sun = 0.5 } = o;
	const L = MA.leaf;
	if (age <= 0.003 || age >= life) return;
	const expand = smooth(age / 0.06); // three weeks to its full size
	const firm = smooth((age - 0.045) / 0.06); // then it hardens and lifts
	const green = smooth((age - 0.04) / 0.05); // red-bronze to lime …
	const dark = smooth((age - 0.075) / 0.1); // … to dark green
	const yellow = r() < 0.4 ? smooth((age - (life - 0.03)) / 0.025) : 0; // most fall still green-yellow
	const len = L.length * size * lerp(0.3, 1, expand) * about(r, 1, 0.1);
	const wid = len * (L.width / L.length) * about(r, 1, 0.1);
	const pet = petiole * lerp(0.5, 1, expand);
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	// the stalk: up and out from the node, firm
	const rise = lerp(-0.9, about(r, 0.5, 0.2) + (o.rise ?? 0), firm);
	const pd = flat.clone().multiplyScalar(Math.cos(rise)).add(v3(0, Math.sin(rise), 0)).normalize();
	const end = at.clone().addScaledVector(pd, pet);
	const rp = 0.0011 * Math.sqrt(size) + 0.0007 * firm * Math.sqrt(size);
	const stalkColour = mix(mix('#6a2a26', '#7d8a3c', green), '#a08a3a', yellow);
	// far off (a world's lower detail) the stalk is left out: the blade alone reads
	// (on a tree past its eighth year, 6–8 m of crown, the stalks are hidden under their blades: left out)
	if (close || (DETAIL.level >= 0.6 && !o.old && !(CUT && !DETAIL.fruit))) bag.add(
		'body',
		tube(
			close ? [at, at.clone().lerp(end, 0.5).add(v3(0, pet * 0.03, 0)), end] : [at, end],
			(u) => rp * (1 + 0.9 * Math.exp(-Math.pow(u / 0.12, 2))),
			() => stalkColour,
			close ? 8 : 3,
		),
	);
	// the blade: hanging limp while young; grown, held out and a little down, the tip drooping
	const droop = lerp(-1.45, o.droop ?? about(r, -0.35, 0.3), firm) - yellow * 0.4;
	const swing = about(r, 0, 0.3);
	const bd = flat.clone().applyAxisAngle(UP, swing).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = lerp(0.16, about(r, 0.08, 0.03), firm); // folded up along the midrib
	const curl = about(r, 0.1, 0.05) * firm + (1 - firm) * 0.05; // the tip arching down
	const wave = about(r, 0.012, 0.004) * firm;
	const ns = Math.floor(r() * 1000);
	const lit = clamp(sun);
	const top = (u, v) => {
		const c = mix(L.top, L.topLight, 0.2 + 0.55 * lit);
		// the flush: red-bronze (coppery in sun, purple-brown in shade), soft lime, then dark green
		const fl = mix(L.flushPurple, L.flushCopper, 0.15 + 0.7 * lit).lerp(hex(L.flush), 0.35);
		const lime = mix(L.flushGreen, '#5f7f34', smooth(dark * 1.2));
		c.lerp(lime, 1 - dark);
		c.lerp(fl, 1 - green);
		// the pale midrib and the many fine, nearly straight side veins
		const mid = Math.abs(v) < 0.05 ? (1 - u * 0.5) * (close ? 1 : 0.18) : 0;
		const side = close ? smooth((0.05 - Math.abs((((u * 24 - Math.abs(v) * 2.2) % 1) + 1) % 1 - 0.5) * 2 + 0.95) / 0.05) * (Math.abs(v) < 0.9 ? 1 : 0) : 0;
		c.lerp(hex(green > 0.5 ? L.vein : '#c88a6a'), mid * 0.55 + side * 0.12);
		c.lerp(hex('#3a5a2a'), (noise3(u * 5, v * 3, ns, 3) - 0.45) * 0.25);
		if (yellow > 0) c.lerp(hex(L.old), clamp(yellow * 1.4 - (1 - Math.abs(v)) * 0.2));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#6a2e26', (1 - green) * 0.9);
		if (Math.abs(v) < 0.06) c.lerp(hex('#d8d6a0'), close ? 0.5 : 0.1);
		if (yellow > 0) c.lerp(hex('#d2b766'), yellow);
		return c;
	};
	const lift = (u, v) => fold * Math.abs(v) * Math.sin(Math.PI * Math.min(1, u * 1.05)) * 0.5 - curl * u * u + wave * Math.sin(u * 30 + ns) * Math.abs(v);
	if (CUT && !close && !DETAIL.fruit) {
		bag.add('blade', cutLeaf(len, (wid * 0.5) / BLADE_FIT, lift, top, under), aim(end, bd, about(r, 0, 0.3)));
		return;
	}
	const blade = sheet({
		length: len,
		width: wid * 0.5,
		shape: leafShape,
		lift,
		paint: top,
		back: under,
		along: close ? 40 : fewer(o.along ?? (o.old ? 2 : 3), 2),
		across: close ? 12 : 2,
	});
	bag.add('leaf', blade, aim(end, bd, about(r, 0, 0.3)));
}

/* ---- the panicle and its flowers ---- */

/**
 * One flower, 6–8 mm across: four or five spreading sepals, pale green, hairy; five petals, cream-yellow, with three
 * to five raised ridges that are orange-yellow and turn red, the petals blushing pink as they age; the fleshy, five-
 * lobed yellow disc; one fertile stamen and the ovary with its style. Built at the origin facing +Y.
 */
function flower(bag, m, open, fade, r, close) {
	const P = MA.panicle;
	const roll = r() * Math.PI * 2;
	const turn = (a, up) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(up));
	const old = (c) => mix(mix(c, P.blush, fade * 0.6), P.dry, smooth((fade - 0.6) / 0.4));
	if (open < 0.2) {
		bag.add('body', bead(v3(0, 0.0012, 0), v3(0.0012, 0.0016, 0.0012), mix(P.bud, P.rachis, 0.25), close ? 6 : 2), m);
		return;
	}
	const o = smooth((open - 0.2) / 0.8);
	const n = close ? 5 : 5;
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + roll;
		const pet = sheet({
			length: 0.0036,
			width: 0.0011,
			shape: (u) => Math.pow(Math.sin(Math.PI * clamp(0.04 + 0.92 * u)), 0.6) * (0.65 + 0.35 * u),
			lift: (u) => 0.04 * u - 0.12 * u * u * o,
			paint: (u, v) => {
				const c = mix(P.petal, P.disc, Math.exp(-u * 6) * 0.4);
				if (close && Math.abs(Math.sin(v * 5.5)) > 0.75 && u < 0.75) c.lerp(hex(P.stripe), 0.7 * (1 - u));
				return old(c);
			},
			along: close ? 6 : 1,
			across: close ? 6 : 1,
		});
		bag.add('sheet', pet, m.clone().multiply(turn(a, lerp(1.2, 0.05, o))));
	}
	if (close) {
		// the disc and the stamen
		bag.add('body', bead(v3(0, 0.0004, 0), v3(0.0011, 0.0005, 0.0011), old(new THREE.Color(P.disc)), close ? 8 : 3), m);
		if (close) {
			const sa = roll + 0.6;
			const s0 = v3(Math.cos(sa) * 0.0007, 0.0006, Math.sin(sa) * 0.0007);
			const s1 = s0.clone().add(v3(Math.cos(sa) * 0.0006, 0.0024, Math.sin(sa) * 0.0006));
			bag.add('body', tube([s0, s1], () => 0.00012, () => old(new THREE.Color('#e8c0a0')), 4, true), m);
			bag.add('body', bead(s1, v3(0.00035, 0.0003, 0.00035), old(new THREE.Color('#8a3a5a')), 5), m);
			bag.add('body', bead(v3(0, 0.0011, 0), v3(0.0006, 0.0008, 0.0006), old(new THREE.Color('#c8d27a')), 5), m);
			bag.add('body', tube([v3(0, 0.0016, 0), v3(-0.0004, 0.0032, 0.0002)], () => 0.0001, () => old(new THREE.Color('#e8d0b0')), 4, true), m);
		}
	}
}

/**
 * A terminal panicle: an upright pyramid, 25–40 cm, at the tip of a resting shoot. Its axis and branches red (in
 * 'Tommy Atkins' a strong pink-red), hairy; the side branches spiral up it, the lowest longest, each branching again
 * into small cymes of flowers. Hundreds to a few thousand flowers, 2–35 % of them perfect, the rest male; they open
 * from the base up over three to four weeks. `grow` 0 … 1 its elongation, `bloom` 0 … 1 how far the opening has
 * climbed it, `dry` 0 … 1 the spent panicle browning after the set, `keep` true where only the bare axis stays (it
 * bears fruit). Draws from `base` along `dir`; gives the place on its axis that each fruit hangs from.
 */
function panicle(bag, base, dir, o) {
	const P = MA.panicle;
	const { r, grow, bloom, dry, close, len } = o;
	const L = len * lerp(0.12, 1, grow);
	const d0 = dir.clone().normalize();
	// the axis: from the shoot tip, nearly upright, bending a little
	const lean = across(d0).multiplyScalar(about(r, 0, 0.15));
	const axisAt = (s) => base.clone().addScaledVector(d0, s).addScaledVector(lean, (s * s) / Math.max(0.05, L));
	const n = close ? 16 : 6;
	const pts = [];
	for (let i = 0; i <= n; i++) pts.push(axisAt((i / n) * L));
	const rachisCol = (u) => mix(mix(P.rachisGreen, P.rachis, smooth(grow * 1.6) * (0.75 + 0.25 * u)), P.dry, dry);
	bag.add('body', tube(pts, (u) => lerp(0.0034, 0.0011, u) * lerp(0.5, 1, grow), (u) => rachisCol(u), close ? 7 : 4, true));
	if (o.keep) return;
	// the side branches, the lowest longest (a panicle 28 × 21 cm), each branching again into cymes of three to seven
	const count = Math.max(3, Math.round(lerp(8, 16, grow) * (close ? 1 : lerp(0.3, 1, DETAIL.level))));
	const phase = r() * Math.PI * 2;
	const flowers = [];
	for (let i = 0; i < count; i++) {
		const f = (i + 0.5) / count;
		const s = L * lerp(0.08, 0.9, f);
		const at = axisAt(s);
		const bl = len * 0.4 * Math.pow(1 - f, 0.9) * lerp(0.3, 1, grow) + 0.015;
		const side = across(d0).applyAxisAngle(d0, phase + i * 2.39996);
		const up = lerp(0.35, 0.8, f); // the lower branches spread wider
		const bd = side.clone().multiplyScalar(Math.cos(up)).addScaledVector(d0, Math.sin(up)).normalize();
		const tip = at.clone().addScaledVector(bd, bl);
		const mid = at.clone().addScaledVector(bd, bl * 0.5).addScaledVector(d0, bl * 0.1);
		bag.add('body', tube([at, mid, tip], (u) => lerp(0.0015, 0.0006, u) * lerp(0.6, 1, grow), () => rachisCol(f), close ? 5 : 3));
		// its cymes along it and at its end, each a knot of flowers on short pink stalks
		const k = Math.max(1, Math.round((bl / 0.012) * (close ? 1 : lerp(0.4, 1, DETAIL.level))));
		for (let j = 0; j < k; j++) {
			const g = k === 1 ? 1 : 0.35 + (0.65 * j) / (k - 1);
			const cAt = at.clone().lerp(tip, g);
			const cd = bd.clone().applyAxisAngle(d0, about(r, 0, 0.8)).addScaledVector(d0, 0.5).normalize();
			const cl = 0.008 + 0.01 * (1 - f);
			const cEnd = cAt.clone().addScaledVector(cd, cl);
			if (close) bag.add('body', tube([cAt, cEnd], () => 0.0005, () => rachisCol(f), 3));
			// far off a cyme reads as a fluffy knot of buds and flowers, cream, tan or pink
			if (!close) {
				const open = clamp((bloom * 1.25 - f) / 0.25);
				const fade = clamp((bloom * 1.25 - f - 0.45) / 0.5) * 0.6 + dry;
				if (r() >= smooth((dry - 0.15) / 0.55)) {
					const x = r();
					const knot = mix(mix('#98a058', P.cyme, open), x < 0.4 ? P.cymeTan : x < 0.65 ? P.cymePink : '#d2c47a', 0.3 + fade * 0.5).lerp(hex(P.dry), dry);
					const sz = (0.0055 + 0.0045 * (1 - f)) * lerp(0.5, 1, grow) * lerp(0.75, 1.1, open);
					const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
					bag.add('sheet', bead(cEnd.clone().addScaledVector(cd, sz * 0.3), v3(sz * about(r, 1, 0.25), sz * 1.3, sz * about(r, 1, 0.25)), knot, 2, spin));
				}
			}
			const m = close ? 7 : j % 3 === 0 ? 1 : 0;
			for (let e = 0; e < m; e++) {
				const p = cEnd.clone().add(v3(about(r, 0, 0.007), about(r, 0, 0.006), about(r, 0, 0.007)));
				flowers.push({ p, f, n: cd });
			}
		}
	}
	for (const fl of flowers) {
		const open = clamp((bloom * 1.25 - fl.f) / 0.25);
		const fade = clamp((bloom * 1.25 - fl.f - 0.45) / 0.5) * 0.6 + dry;
		if (r() < smooth((dry - 0.15) / 0.55)) continue; // the spent flowers shed
		const facing = fl.n.clone().add(v3(0, 0.4, 0)).add(across(fl.n).multiplyScalar(r() * 1.6 - 0.8)).normalize();
		const mm = new THREE.Matrix4().compose(fl.p, new THREE.Quaternion().setFromUnitVectors(UP, facing), v3(1, 1, 1).multiplyScalar(close ? 1 : 1.5));
		if (close || DETAIL.level >= 0.5) flower(bag, mm, open * lerp(0.4, 1, grow), fade, r, close);
		else bag.add('sheet', bead(fl.p, v3(0.005, 0.005, 0.005), mix(P.petal, P.rachis, 0.25 + fade * 0.4), 2), new THREE.Matrix4());
	}
}

/* ---- the fruit ---- */

/** how big a fruit is, 0 … 1 of its ripe length, by days since full bloom (a sigmoid: slow, the swell, slow) */
const fruitSize = (d) => straight(d, [[0, 0.02], [7, 0.05], [14, 0.1], [21, 0.17], [30, 0.28], [42, 0.44], [56, 0.62], [70, 0.77], [84, 0.88], [98, 0.95], [112, 0.99], [125, 1]]);

/**
 * One 'Tommy Atkins' mango at `days` since full bloom, hanging from its stalk at the origin down −Y: oval, broad-
 * shouldered, the base rounded round a small stalk cavity, the apex rounded with hardly a beak; flattened (thickness
 * about seven-eighths of its breadth) and a little bent, the ventral shoulder (+X) standing higher. Young, olive-like
 * and purple-tinged; green while it swells, its sunny side flushed dull purple-red; ripening the ground turns
 * yellow, then orange-yellow, and the blush bright crimson to deep red over half or more of it; pale yellow lenticels
 * all over and a whitish bloom.
 */
function fruitGeometry({ days, sun, ns, res, k }) {
	const F = MA.fruit;
	const g = fruitSize(days);
	const L = F.length * g * k;
	const young = 1 - smooth((days - 10) / 40);
	const W = L * lerp(F.width / F.length, 0.62, young);
	const T = W * lerp(F.thick / F.width, 0.92, young);
	const ripe = smooth((days - 92) / 32);
	const green = new THREE.Color(F.green), pale = new THREE.Color(F.greenPale), ground = new THREE.Color(F.ground), orange = new THREE.Color(F.orange);
	const blush = new THREE.Color(F.blush), deep = new THREE.Color(F.deep), yb = new THREE.Color(F.youngBlush), lent = new THREE.Color(F.lenticel);
	return turned({
		len: L,
		rings: res ? 120 : fewer(Math.round(lerp(5, 14, g)), 5),
		sides: res ? 160 : fewer(Math.round(lerp(7, 18, g)), 6),
		radius: (u, ph) => {
			// broad shoulders on a rounded base, broadest at about 40 %, the apex rounded
			// a blunt oval: a superellipse in profile, broadest at about 40 % (the shoulders), rounded at both ends
			const x = clamp(Math.abs((u - 0.42) / (u < 0.42 ? 0.42 : 0.58)));
			const prof = Math.pow(1 - Math.pow(x, lerp(2.6, 2, young)), 1 / lerp(2.2, 1.8, young)) * (u < 0.42 ? 1 : 1 - 0.06 * x);
			const cavity = 1 - 0.25 * Math.exp(-Math.pow(u / 0.035, 2));
			const c = Math.cos(ph), s = Math.sin(ph);
			const e = 1 / Math.sqrt((c * c) / 1 + (s * s) * Math.pow(W / T, 2));
			const lumpy = 1 + 0.01 * (fbm(c * 2, s * 2, u * 6, 2, ns) - 0.5);
			return (W / 2) * prof * cavity * e * lumpy;
		},
		// bent: the ventral side (+X) bulges, the apex (u 1) turned a little toward it
		spine: (u) => v3(W * (0.06 * Math.sin(Math.PI * u) + 0.05 * u * u - 0.02), 0, 0),
		paint: (u, ph, p) => {
			// how much this place faces the sun: the blush there
			const lit = (Math.cos(ph) * sun.x + Math.sin(ph) * sun.z) * 0.5 + 0.5 + 0.25 * (1 - u);
			const bl = clamp(smooth((lit - 0.52 + 0.35 * (fbm(p.x * 30, p.y * 30, p.z * 30, 3, ns) - 0.5)) / 0.6));
			const c = green.clone().lerp(pale, young * 0.3);
			c.lerp(yb, bl * 0.5 * smooth((days - 35) / 45) * Math.pow(1 - ripe, 2));
			// ripening: the ground green → yellow-green → orange-yellow, from the apex up; the blush brightens
			const gr = clamp(ripe * 1.3 - (1 - u) * 0.3);
			c.lerp(pale, clamp(ripe * 2.5) * (1 - gr) * 0.6); // first yellow-green
			c.lerp(ground, gr);
			c.lerp(orange, clamp(ripe * 1.2 - 0.4) * (0.4 + 0.6 * (1 - bl)) * 0.6);
			const red = blush.clone().lerp(deep, clamp(bl * 1.1 - 0.35) * (0.6 + 0.4 * fbm(p.x * 25, p.y * 25, p.z * 25, 2, ns + 9)));
			c.lerp(red, bl * smooth((days - 96) / 25) * 0.95); // the red from about day 99, on the sunny side
			// the shoulders near the stalk stay greener longest
			c.lerp(hex('#5a7a2e'), Math.exp(-Math.pow(u / 0.12, 2)) * 0.45 * (1 - ripe * 0.6));
			// lenticels: small pale dots, denser toward the apex
			const cl = cells(p.x * 420, p.y * 420, p.z * 420, ns + 7);
			if (cl.id < 0.3) c.lerp(lent, smooth((0.2 - cl.f1) / 0.1) * lerp(0.3, 0.6, ripe) * (res ? 1 : 0.6));
			// the bloom: a whitish haze, more on the green fruit
			c.lerp(hex('#c4c8c0'), 0.06 * smooth(days / 50) * (1 - ripe * 0.4));
			return c;
		},
	});
}

/** a mango on its stalk; the stalk's foot at `at`, the fruit hanging along `dir` */
function fruit(bag, at, dir, days, sunWorld, seedKey, key) {
	const r = chance(seedKey, 'fruit', key);
	const k = about(r, 1, 0.07);
	const roll = r() * Math.PI * 2;
	const q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
	const m = new THREE.Matrix4().compose(at, q, v3(1, 1, 1));
	const sun = sunWorld.clone().applyQuaternion(q.clone().invert()).setY(0).normalize();
	const res = DETAIL.fruit === key;
	// (on the tree, one fruit of hundreds: half the fruit view's rings and sides; past FRUIT_FINE, fewer still)
	const level = res ? DETAIL.level : Math.min(DETAIL.level, CUT ? (++FRUITS > FRUIT_FINE ? 0.3 : 0.6) : 1);
	bag.add('skin', lite({ level }, () => fruitGeometry({ days, sun, ns: hashText(key) % 991, res, k })), m);
}

/* ---- bark ---- */

/**
 * Mango bark by the girth and age of the wood: this flush's shoot smooth, green (red-brown while it flushes); then
 * grey-brown, smooth, with pale lenticels; the trunk and old limbs dark grey-brown to nearly black, thick and rough,
 * cut by deep lengthwise fissures into irregular scaly plates that flake, paler grey on their faces, lichen in
 * patches. Latex (resin) bleeds where it is wounded.
 */
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 30, s * 8, cz * 30, 2, ns + 5) - 0.5) * 0.5;
	const c = cells(cx * 34 + w, s * 24 + w * 0.4, cz * 34 - w, ns + 3); // small thick blocks, 3 × 4 cm
	return { ridge: c.edge, plate: 0.6 * c.id + 0.4 * fbm(cx * 90, s * 30, cz * 90, 2, ns), cx, cz };
}
const oldWood = (r) => clamp((r - 0.018) / 0.04);
function barkColour(age, r, v, s, sun, ns, low) {
	const B = MA.bark;
	if (age < 0.12 && r < 0.008) return mix(B.shootRed, B.shoot, smooth(age / 0.1));
	if (age < 0.5 && r < 0.006) return mix(B.shoot, B.young, smooth((age - 0.12) / 0.4) * 0.6);
	const { ridge, plate, cx, cz } = barkPattern(r, v, s, ns);
	const c = mix(mix(B.shoot, B.young, smooth((age - 0.12) / 0.8)), B.grey, clamp((r - 0.006) / 0.02));
	// the lenticels of young bark: small pale dashes
	const ln = noise3(cx * 260, s * 600, cz * 260, ns + 7);
	c.lerp(hex(B.lenticel), smooth((ln - 0.8) / 0.06) * 0.6 * (1 - oldWood(r)));
	const o = oldWood(r);
	if (o > 0) {
		c.lerp(mix(B.dark, B.pale, plate * 0.8), o * 0.85);
		c.lerp(hex(B.fissure), smooth((0.14 - ridge) / 0.09) * o * 0.9);
		// lichen: grey-white and grey-green crusts
		const spot = cells(cx * 12, s * 9, cz * 12, ns + 11);
		const edge = smooth((0.42 - spot.f1 + 0.1 * fbm(cx * 60, s * 60, cz * 60, 2, ns)) / 0.12);
		if (spot.id < 0.12) c.lerp(hex(spot.id < 0.04 ? B.lichen : B.lichenGreen), edge * o * 0.35);
		// darker, damp, low on the shaded side
		c.lerp(hex('#2a2c20'), clamp(low) * o * clamp(0.4 - sun) * 0.4);
	}
	return c;
}
function barkRelief(r, v, s, ns) {
	const o = oldWood(r);
	if (o <= 0) return 0;
	const { ridge, plate } = barkPattern(r, v, s, ns);
	return o * (-0.05 * smooth((0.16 - ridge) / 0.1) + 0.015 * (plate - 0.5));
}

/* ================================================================================================================
 * 3. THE TREE — its growth units flush by flush, how thick each is, its roots
 * ============================================================================================================== */

/**
 * How a mango grows, in numbers (Scarrone's model: rhythmic growth and terminal flowering). Every shoot grows in
 * growth units: in a flush of three or four weeks a unit extends 10–40 cm, its lower part bare (scale leaves), its
 * leaves crowded in a spiral toward its tip, and then it rests. At the next flush the unit's apical bud or the buds in
 * the axils of that tuft break: one to four new units, the side ones at 30–60° from it; so a mango branches in
 * whorls at the end of each unit, and its crown is built of thousands of short units, each ending in a tuft of leaves.
 * A unit that ends in a panicle stops; its fruit hangs on the panicle's axis. Young trees flush four or five times a
 * year, bearing trees two or three; the crown fills its dome and stops where it meets the light (a unit that would
 * grow into a full place or out of the crown's envelope never breaks), so it is dense and round, near the ground.
 * Leaves live about two to three years: the wood inside the crown is bare, the leaves on its outer metre.
 */
const END_T = 15.6;
const TREE = {
	depth: 0.02, // the stone's top just at the soil
	firstFlowers: 5, // a seedling tree flowers in its 5th–7th year (a grafted one in its 3rd–4th)
	leafLife: 2.9, // years a leaf is kept (up to 5 on the outer crown; shaded inner ones drop sooner)
	oldLeafLife: 0.72, // on a bearing tree past its eighth year, about two years (2–5): its dense outer shell of leaves, the inside bare
	tip: 0.0032, // a new growth unit's radius, 6–8 mm thick
	end: END_T, // the simulation's horizon: past the oldest stage
};

/**
 * The crown's height and half-width, metres, by age in years from sowing, in full sun: 'Tommy Atkins' measured 2.65 m
 * tall and 2.6 m across at 4 years, 3.96 m at 7, 4.46 m tall and 4.45 m across at 8 (Embrapa Cerrados, 10 × 10 m).
 */
/**
 * Past the eighth year [EST], no measured Tommy Atkins series runs on: the Embrapa tempo (about 0.45 m a year up and
 * across at 7–8 years) slowing to about 0.25 m a year by the twentieth, toward the 10–15 m of an unpruned grown tree
 * (PROSEA 2; Morton 1987) and the broad dome a little wider than tall that the cultivar keeps. The flat step at 8.1
 * keeps every younger stage exactly as it was.
 */
const OLDER = {
	height: [[8.1, 4.55], [10, 5.35], [12, 6.1], [14, 6.75], [16, 7.35], [18, 7.9], [20, 8.4]],
	spread: [[8.1, 2.2], [10, 2.7], [12, 3.15], [14, 3.5], [16, 3.8], [18, 4.05], [20, 4.25]],
};
const HEIGHT = [[0, 0], [0.1, 0.18], [0.5, 0.5], [1, 0.8], [1.5, 1.15], [2, 1.5], [3, 2.15], [4, 2.75], [5, 3.25], [6, 3.7], [7, 4.1], [8, 4.55], ...OLDER.height];
const SPREAD = [[0, 0.04], [0.5, 0.2], [1, 0.35], [1.5, 0.5], [2, 0.68], [3, 1.0], [4, 1.3], [5, 1.55], [6, 1.78], [7, 2.0], [8, 2.2], ...OLDER.spread];

/** how long a unit rests between flushes, by the tree's age (years): four or five flushes a year young, two or three bearing */
const REST = [[0, 0.11], [1, 0.15], [2, 0.18], [4, 0.26], [6, 0.32], [8, 0.36], [10, 0.34], [20, 0.36]];
/** a unit's length by the tree's age when it broke */
const GU_LENGTH = [[0, 0.15], [0.5, 0.17], [1, 0.22], [2, 0.27], [3, 0.24], [5, 0.19], [8, 0.15], [9.5, 0.22], [20, 0.2]];

/** the crop shown: its panicles break in the cool dry weeks before CROP, flower at CROP, its fruit ripe ~125 days on */
const CROP = 7.15;
/** and every year after it, the same weeks: the bearing tree flowers and fruits each year (the older stages show one) */
const CROPS = [];
for (let c = CROP; c < END_T; c += 1) CROPS.push(+c.toFixed(2));
/** the crop whose weeks t falls in, from its panicles breaking to the last fruit picked, or none */
const cropAt = (t, before = 0.2, after = 0.6) => CROPS.find((c) => t >= c - before && t < c + after);

/**
 * Does a place lie inside the crown at time t? A dome on a short trunk: broadest at about two fifths of its height,
 * rounded over the top, its lowest leaves 0.3–0.6 m above the ground on a grown tree.
 */
function inCrown(p, t, k = 1) {
	const H = table(t, HEIGHT) * k;
	const R = table(t, SPREAD) * k;
	const yc = H * 0.42;
	const rh = Math.hypot(p.x, p.z);
	if (p.y > H * 1.02) return false;
	if (p.y >= yc) return rh <= R * Math.sqrt(Math.max(0, 1 - Math.pow((p.y - yc) / (H - yc), 2.1))) + 0.05;
	const low = Math.min(0.55, H * 0.12);
	if (p.y < low) return rh < 0.25;
	return rh <= R * Math.pow(clamp((p.y - low) / (yc - low)), 0.42) + 0.05;
}

/**
 * Every growth unit the tree makes up to the horizon, in the order they break. A unit is { key, parent, born, dur,
 * len, from, dir, ctrl, to, order, apical, kids, leaves, panicle }: its path a gentle arc from where its parent ended.
 * Everything a unit decides it decides from its own chance and the units that broke before it, so the tree at an
 * earlier time is exactly the first part of the later one: draw the units born before t, the growing ones in part.
 */
function growthUnits(seed) {
	const all = [];
	const rt = chance(seed, 'tree');
	const vigour = about(rt, 1, 0.06);
	const tierAt = between(rt, 0.55, 0.8); // where the stem first branches out in a whorl
	const leanA = rt() * Math.PI * 2;
	const lean = v3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(0.04 + rt() * 0.04);
	// the crown's tips in a grid of cells: a place already full of tips breaks no more units
	const CELL = 0.25;
	const grid = new Map();
	const cellOf = (p) => `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)},${Math.floor(p.z / CELL)}`;
	const crowd = (p) => {
		let n = 0;
		const [x, y, z] = [Math.floor(p.x / CELL), Math.floor(p.y / CELL), Math.floor(p.z / CELL)];
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) n += (grid.get(`${x + i},${y + j},${z + k}`) ?? 0) * (i || j || k ? 0.2 : 1);
		return n;
	};
	const queue = [];
	const push = (g) => {
		// in order of when each unit next does something
		let i = queue.length;
		while (i > 0 && queue[i - 1].when > g.when) i--;
		queue.splice(i, 0, g);
	};
	const make = (spec) => {
		const g = { kids: [], leaves: [], ...spec };
		const r = chance(seed, 'gu', g.key);
		// its path: from its foot, bending from the way its parent ended to its own way
		const c = g.from.clone().addScaledVector(g.inDir, g.len * 0.35);
		const to = c.clone().addScaledVector(g.dir, g.len * 0.68);
		g.ctrl = c;
		g.to = g.from.clone().add(to.sub(g.from).setLength(g.len));
		g.endDir = g.to.clone().sub(g.ctrl).normalize();
		// its leaves: a tuft toward its tip, the lower part of the unit bare, in a 2/5 spiral
		const n = Math.max(5, Math.round(g.nLeaves * about(r, 1, 0.15)));
		const ph = r() * Math.PI * 2;
		for (let i = 0; i < n; i++) {
			const x = i / (n - 1);
			const s = g.len * (g.bare + (1 - g.bare) * (1 - Math.pow(1 - x, 1.7)) * 0.985);
			g.leaves.push({ i, s, bearing: ph + i * 2.513, life: TREE.leafLife * about(r, 1, 0.25) * (g.born > 8 ? TREE.oldLeafLife : 1), sizeK: about(r, 1, 0.12) * lerp(0.75, 1.05, x) });
		}
		all.push(g);
		const tip = g.to;
		grid.set(cellOf(tip), (grid.get(cellOf(tip)) ?? 0) + 1);
		return g;
	};
	const ageAt = (when) => Math.max(0, when);
	// the first unit: out of the stone, the epicotyl and the first flush
	const first = make({ key: '0', parent: null, order: 0, apical: true, born: 0.035, dur: 0.065, len: 0.165 * vigour, from: v3(0, -TREE.depth * 0.4, 0), inDir: UP.clone(), dir: v3(lean.x, 1, lean.z).normalize(), nLeaves: 11, bare: 0.62, stem: true });
	first.when = first.born + first.dur + table(0, REST);
	push(first);
	while (queue.length) {
		const g = queue.shift();
		const t = g.when;
		if (t > TREE.end) continue;
		const r = chance(seed, 'flush', g.key, g.tries ?? 0);
		const age = ageAt(t);
		// before the crop, the tree rests in the cool dry weeks and its resting tips turn to flowering
		const C = CROPS.find((c) => t > c - 0.3 && t < c + 0.02);
		const winter = C !== undefined && age > TREE.firstFlowers;
		// only the tips on the crown's outside, in the light, flower (a tip that bore once does not again)
		const flowers = winter && !g.stem && !g.panicle && g.to.y > 0.6 && !inCrown(g.to, t, 0.84) && r() < 0.62 && g.order > 1;
		if (flowers) {
			g.panicle = { crop: C, born: C - 0.09 - r() * 0.05, len: between(r, 0.24, 0.4), r: C === CROP ? chance(seed, 'panicle', g.key) : chance(seed, 'panicle', g.key, C) };
			// after the harvest the buds below the spent panicle break: the limb goes on sideways (sympodially)
			g.when = C + 0.45 + r() * 0.2;
			push(g);
			continue;
		}
		if (winter) {
			g.when = C + 0.05 + r() * 0.15;
			push(g);
			continue;
		}
		// a resting tip may skip a flush: more often as the tree grows old and the tip is shaded inside the crown
		const deep = !inCrown(g.to, t, 0.85) ? 0 : 1;
		const skip = straight(age, [[0, 0], [1, 0.05], [3, 0.15], [6, 0.28], [8, 0.32]]) + deep * 0.2;
		if (!g.stem && r() < skip) {
			g.tries = (g.tries ?? 0) + 1;
			if (g.tries > 3) continue; // dormant for good
			g.when = t + table(age, REST) * between(r, 0.8, 1.2);
			push(g);
			continue;
		}
		// how many units break from it: the stem alone until its first whorl, then one to four
		let count;
		const tier = g.stem && g.to.y > tierAt;
		if (g.stem && !tier) count = 1;
		else if (tier) count = 3 + Math.floor(r() * 2.2);
		else {
			const young = clamp(1 - age / 4);
			const x = r();
			count = x < lerp(0.32, 0.18, young) ? 1 : x < lerp(0.74, 0.58, young) ? 2 : x < lerp(0.94, 0.86, young) ? 3 : 4;
		}
		const born = t;
		const len0 = table(age, GU_LENGTH) * vigour;
		const az0 = r() * Math.PI * 2;
		const outward = v3(g.to.x, 0, g.to.z);
		const out = outward.lengthSq() > 1e-6 ? outward.normalize() : across(g.endDir);
		let made = 0;
		for (let k = 0; k < count; k++) {
			const apical = k === 0 && !tier && !g.panicle;
			const kr = chance(seed, 'kid', g.key, k);
			let d;
			if (apical) {
				// the apical bud: on in its parent's way, turning up, and out toward the light
				d = g.endDir.clone().addScaledVector(UP, g.stem ? 1.2 : 0.18).addScaledVector(out, 0.12 * clamp(age / 2));
				if (g.stem) d.add(lean);
				d.add(v3(about(kr, 0, 0.12), 0, about(kr, 0, 0.12)));
			} else {
				// a bud of the tuft: 30–60° out from it, spread round
				const spread = tier ? between(kr, 0.62, 0.85) : between(kr, 0.5, 0.95);
				const az = az0 + ((k + (tier ? 0 : 0.5)) / count) * Math.PI * 2 + about(kr, 0, 0.35);
				const side = across(g.endDir).applyAxisAngle(g.endDir, az);
				d = g.endDir.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread));
				d.addScaledVector(out, 0.15 * clamp(age / 3));
				if (tier) d.add(v3(0, 0.15, 0));
			}
			d.normalize();
			// the outer, older crown spreads and its lowest shoots grow level or a little down; none grow steeply down
			if (d.y < -0.35) d.y = -0.35;
			d.normalize();
			const len = len0 * (apical ? 1 : 0.86) * about(kr, 1, 0.22) * (g.stem && !tier ? 1.05 : 1) * (tier ? 1.15 : 1);
			const from = g.to.clone();
			const tipAt = from.clone().addScaledVector(d, len);
			if (!g.stem || tier) {
				if (!inCrown(tipAt, born + 0.6)) continue;
				if (crowd(tipAt) > (age < 3 ? 2.6 : 3.6)) continue;
			}
			const kid = make({
				key: `${g.key}.${k}`,
				parent: g,
				order: apical ? g.order : g.order + 1,
				apical,
				born: born + kr() * 0.012,
				dur: 0.06,
				len,
				from,
				inDir: apical ? g.endDir.clone() : g.endDir.clone().lerp(d, 0.75).normalize(),
				dir: d,
				nLeaves: lerp(9, 13, kr()) * (apical ? 1 : 0.9),
				bare: between(kr, 0.4, 0.58),
				stem: g.stem && !tier && apical,
			});
			kid.when = kid.born + kid.dur + table(age, REST) * between(kr, 0.8, 1.25);
			g.kids.push(kid);
			push(kid);
			made++;
		}
		if (!made && !g.stem) {
			g.tries = (g.tries ?? 0) + 1;
			if (g.tries <= 2) {
				g.when = t + table(age, REST);
				push(g);
			}
		}
	}
	return { all, first };
}

/** the units grown at time t, and how far each is grown (0 … 1) */
function unitsAt(units, t) {
	const list = [];
	for (const g of units.all) {
		if (t <= g.born) continue;
		g.grown = smooth((t - g.born) / g.dur);
		list.push(g);
	}
	return list;
}

/** the point at `s` (0 … 1 of its length) on a unit's arc, and its direction there */
function onUnit(g, x) {
	const a = g.from, b = g.ctrl, c = g.to;
	const y = 1 - x;
	const at = a.clone().multiplyScalar(y * y).addScaledVector(b, 2 * y * x).addScaledVector(c, x * x);
	const dir = b.clone().sub(a).multiplyScalar(2 * y).addScaledVector(c.clone().sub(b), 2 * x).normalize();
	return { at, dir };
}

/**
 * How thick each unit is at its foot: the pipe model (the wood as thick as all it feeds beyond it, r^2.5 summed) and
 * a ring a year from the cambium. Calibrated to 'Tommy Atkins': the stem about 1 cm at six months (when it is grafted),
 * 2–2.5 cm at eighteen months, about 8 cm at four years and 15–19 cm at seven (measured: 15.2 cm under the graft,
 * 18.9 cm above it), the foot flaring.
 */
const PIPE = 3; // da Vinci's rule, r³ summed: what matched the measured girths best
function thicken(g, t) {
	let q = Math.pow(TREE.tip, PIPE) * (0.35 + 0.65 * (g.grown ?? 1));
	for (const k of g.kids) if (k.born < t) q += thicken(k, t);
	if (g.panicle && t > g.panicle.born) q += Math.pow(0.0025, PIPE);
	g.q = q;
	const woodAge = Math.max(0, t - g.born - 0.08);
	// past seven and a half years of wood the ring a year narrows (a bearing tree puts its sugars in its crop) [EST]:
	// about 2 cm of trunk a year, 35 cm at sixteen years
	g.r = Math.pow(q, 1 / PIPE) * (1 + 0.2 * Math.min(woodAge, 7.5) + 0.06 * Math.max(0, woodAge - 7.5));
	return q;
}

/** the axes the eye follows: a unit and its apical successors drawn as one tube */
function chains(list, t) {
	const out = [];
	const visit = (g) => {
		const chain = [g];
		let c = g;
		for (;;) {
			// on through its apical bud, or where it broke into a whorl without one through its strongest shoot
			let next = c.kids.find((k) => k.apical && k.born < t);
			if (!next) next = c.kids.filter((k) => k.born < t).sort((a, b) => b.q - a.q)[0];
			if (!next) break;
			chain.push(next);
			c = next;
		}
		out.push(chain);
		for (const u of chain) for (const k of u.kids) if (k.born < t && !chain.includes(k)) visit(k);
	};
	if (list.length) visit(list[0]);
	return out;
}

/** one axis drawn: its units' arcs end to end, its bark by its girth and age */
function wood(bag, chain, t, ns, sunDir) {
	const pts = [], rad = [], born = [];
	let s = 0;
	const isStem = chain[0].stem || chain[0].key === '0';
	// a side shoot starts inside the wood it breaks from
	if (chain[0].parent && !chain[0].apical) {
		const p = chain[0].parent;
		pts.push(chain[0].from.clone().addScaledVector(chain[0].inDir, -Math.min(p.r * 1.2, 0.03)));
		rad.push(chain[0].r);
		born.push(chain[0].born);
	}
	for (let ci = 0; ci < chain.length; ci++) {
		const g = chain[ci];
		const next = chain[ci + 1];
		const r0 = g.r, r1 = next ? next.r : Math.max(TREE.tip * 0.6, g.r * 0.7);
		const steps = Math.max(g.r > 0.012 ? 3 : 2, Math.ceil((g.len * g.grown) / (g.r > 0.03 ? 0.05 : 0.12)));
		for (let i = ci ? 1 : 0; i <= steps; i++) {
			const x = (i / steps) * g.grown;
			const { at } = onUnit(g, x);
			if (pts.length) s += at.distanceTo(pts[pts.length - 1]);
			pts.push(at);
			rad.push(lerp(r0, r1, Math.pow(x, 1.5)) * (next ? 1 : lerp(0.6, 1, 1 - x)));
			born.push(g.born + g.dur * x);
		}
	}
	if (pts.length < 2) return;
	const L = lengths(pts);
	const total = L[L.length - 1];
	if (total < 1e-4) return;
	const at = (sv, list) => {
		let i = 1;
		while (i < L.length - 1 && L[i] < sv) i++;
		const k = clamp((sv - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return lerp(list[i - 1], list[i], k);
	};
	const R0 = rad[0];
	// thick wood gets rings and sides for its bark; twigs few
	const dense = [];
	// rings where the wood is thick close together (its bark needs them), far apart on twigs
	const svs = [0];
	while (svs[svs.length - 1] < total - 1e-6) {
		const r = at(svs[svs.length - 1], rad);
		// (an old tree's thick wood, far from any eye at its size, takes its rings half as close)
		const st = (t > 8 ? 2 : 1) * (r > 0.03 ? clamp(r * (isStem ? 0.11 : 0.3), 0.008, 0.04) : r > 0.012 ? 0.06 : r > 0.006 ? 0.1 : 0.14);
		svs.push(Math.min(total, svs[svs.length - 1] + st));
	}
	const pathAt = (sv) => {
		let i = 1;
		while (i < L.length - 1 && L[i] < sv) i++;
		const k = clamp((sv - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
		return pts[i - 1].clone().lerp(pts[i], k);
	};
	for (const sv of svs) dense.push(pathAt(sv));
	// past its third year, its rings where it bends or changes girth: one kept where the wood leaves the straight line
	// between its neighbours by a share of its radius, and at least every few girths (the trunk keeps its fine rings
	// to above the eye: its flare and its scaly plates are read there)
	if (t > 3) {
		const keep = new Set(spare(dense.map((p, i) => Object.assign(p.clone(), { i })), clamp(R0 * 0.7, 0.003, 0.03), isStem ? 0.3 : clamp(R0 * 16, 0.25, 0.8)).map((p) => p.i));
		for (let i = 0; i < dense.length; i++) if (isStem && svs[i] < 1.5) keep.add(i);
		for (let i = dense.length - 1; i >= 0; i--) if (!keep.has(i)) dense.splice(i, 1), svs.splice(i, 1);
	}
	const sides = t <= 3 ? (R0 < 0.005 ? 3 : R0 < 0.01 ? 5 : R0 < 0.02 ? 7 : Math.round(clamp(R0 * (isStem ? 900 : 320), 8, isStem ? 96 : 20))) : isStem ? Math.round(clamp(R0 * 900, 8, 48)) : R0 < 0.008 ? 3 : R0 < 0.025 ? 4 : R0 < 0.05 ? 5 : R0 < 0.1 ? 7 : 9;
	const nsAx = (ns + hashText(chain[0].key)) % 9973;
	const soil = TREE.depth;
	const radius = (u, v, sv) => {
		let r = at(sv, rad);
		if (isStem && t > 0.8) {
			// the foot of the trunk flaring into its roots
			const ground = dense[0].y + sv;
			r *= 1 + 0.5 * clamp((t - 0.8) / 5) * Math.exp(-Math.max(0, ground + 0.02) / 0.14) * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
		}
		if (!isStem && sv < r * 2.5) r *= 1 + 0.25 * (1 - sv / (r * 2.5)); // the branch collar
		return r * (1 + barkRelief(r, v, sv, nsAx));
	};
	const paint = (u, v, sv, d) => {
		const r = at(sv, rad);
		const age = t - at(sv, born);
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const low = isStem ? 1 - smooth(sv / 0.8) : 0;
		const c = barkColour(Math.max(0, age), r, v, sv, sun, nsAx, low);
		return c;
	};
	const geo = tube(dense, radius, paint, sides, isStem || t <= 3 || at(total, rad) > 0.01);
	bag.add(R0 < 0.005 && !isStem ? 'twig' : 'bark', geo);
	return { pts: dense, rad: svs.map((sv) => at(sv, rad)), tris: geo.index.count / 3 };
}

/** a line's points thinned: one kept wherever the line leaves the chord between those kept by more than `tol` (m), and at least every `most` (m) */
function spare(pts, tol, most) {
	if (pts.length < 3) return pts;
	const out = [pts[0]];
	let a = 0;
	const seg = new THREE.Line3(), near = new THREE.Vector3();
	for (let i = 2; i < pts.length; i++) {
		seg.set(pts[a], pts[i]);
		let far = pts[a].distanceTo(pts[i]) > most;
		for (let j = a + 1; j < i && !far; j++) far = seg.closestPointToPoint(pts[j], true, near).distanceTo(pts[j]) > tol;
		if (far) {
			out.push(pts[i - 1]);
			a = i - 1;
		}
	}
	out.push(pts[pts.length - 1]);
	return out;
}

/** the length along a path at each of its points */
function lengths(pts) {
	const l = [0];
	for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + pts[i].distanceTo(pts[i - 1]));
	return l;
}

/**
 * The roots: a seedling mango's taproot goes down fast and deep (1–2 m in the first years, 6 m and more in an old
 * tree); its laterals spread wide, most in the top metre, as far as the crown and beyond.
 */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.03, -1, 0.02),
		length: 3.2,
		grown: table(t, [[0.02, 0], [0.04, 0.012], [0.1, 0.04], [0.5, 0.12], [1.5, 0.3], [4, 0.65], [8, 1]]),
		radius: 0.0012 + 0.06 * span(t, 0.3, 8) + 0.05 * span(t, 8, 16),
		down: 0.03,
		wander: 0.08,
		laterals: 10,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.2, 4),
		young: MA.root.young,
		old: MA.root.old,
	});
	const count = 10;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.08 + i * 0.1;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.02, -0.03 - rr() * 0.1, Math.sin(bear) * 0.02)),
			dir: v3(Math.cos(bear), -0.12 - rr() * 0.1, Math.sin(bear)),
			length: between(rr, 2.4, 4),
			grown: (t - born) / 7,
			radius: 0.0012 + (0.035 * span(t, born + 0.8, 8) + 0.025 * span(t, 8, 16)) * between(rr, 0.6, 1),
			down: 0.012,
			wander: 0.15,
			laterals: 6,
			lateral: 0.3,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.3) / 3,
			young: MA.root.young,
			old: MA.root.old,
			floor: -0.9,
		});
	}
}

/** a seed's tree, made once: the growth units are the same at every stage */
const UNITS = new Map();
function unitsOf(seed) {
	if (!UNITS.has(seed)) {
		if (UNITS.size > 6) UNITS.clear();
		UNITS.set(seed, growthUnits(seed));
	}
	return UNITS.get(seed);
}

/**
 * The whole mango at time t (years from sowing): the stone, its roots, its wood, the leaves of every unit in their
 * flushes, the panicles of the crop and its fruit from set to ripe.
 */
function mangoTree(t, seed) {
	// a tree past its eighth year, seen at a lower detail (a world's far trees), is held to about the eighth year's
	// budget: fewer of its leaves (each drawn larger) and its finest twigs left out
	if (t > 8 && DETAIL.level < 1 && !DETAIL.old) {
		const k = straight(t, [[8, 1], [16, 0.36]]);
		return lite({ old: true, thin: DETAIL.thin * k, finest: Math.max(DETAIL.finest, 0.0005) * straight(t, [[8, 1], [16, 8]]) }, () => mangoTree(t, seed));
	}
	const bag = new Bag();
	// from its fourth year a mango carries thousands of leaves: each cut out of its picture (`cutLeaf`)
	CUT = t > 3;
	FRUITS = 0;
	const base = v3(0, -TREE.depth * 0.4, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();
	const units = unitsOf(seed);
	// the stone, lying flat in the soil, its concave edge toward the shoot; it rots away in the first year
	if (t < 1.2) {
		const m = new THREE.Matrix4().makeRotationY(0.4).setPosition(v3(0.004, -0.005, -MA.stone.width * 0.5));
		stone(bag, m, seed, t < 0.5, span(t, 0.15, 1.2));
	}
	// (under the soil: once the tree is up they are drawn coarsely)
	lite(t > 1.2 ? { level: Math.min(DETAIL.level, t > 6 ? 0.2 : 0.3) } : {}, () => roots(bag, seed, t, base.clone().add(v3(0, -0.01, 0))));
	if (t <= units.first.born) return bag.build();
	const list = unitsAt(units, t);
	const first = units.first;
	// hypogeal: the seed leaves stay in the stone; the shoot comes up bent in a hook and straightens
	const hook = 1 - span(t, 0.05, 0.075);
	thicken(first, t);
	const ns = hashText(seed) % 997;
	const space = bag.space;
	const draw = chains(list, t);
	if (hook > 0 && first.grown < 1) {
		// the shoot breaking out of the husk: up, its tip bent over in a hook, red-purple, 4–5 mm thick
		const Lg = Math.max(0.004, first.len * first.grown);
		const bend = hook * Math.PI * 0.85;
		const arc = Math.min(Lg * 0.6, 0.025);
		const s0 = Lg - arc;
		const Rc = arc / bend;
		const side = v3(1, 0, 0.3).normalize();
		const pts = [];
		for (let i = 0; i <= 16; i++) {
			const s = (i / 16) * Lg;
			if (s <= s0) pts.push(first.from.clone().add(v3(0, s, 0)));
			else {
				const a = (s - s0) / Rc;
				pts.push(first.from.clone().add(v3(0, s0 + Rc * Math.sin(a), 0)).addScaledVector(side, Rc * (1 - Math.cos(a))));
			}
		}
		bag.add('twig', tube(pts, (u) => 0.0022 * (1 - 0.35 * u), (u, v, sv) => (sv < TREE.depth * 0.6 ? mix('#e8dcc0', '#c9a0a0', sv / 0.012) : mix('#8a3a44', '#5e2a3a', u)), 7, true));
		// the folded first leaves at its tip, tiny and red
		const tipAt = pts[pts.length - 1], tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
		bag.add('body', bead(tipAt.clone().addScaledVector(tipDir, 0.003), v3(0.0028, 0.0045, 0.0028), '#6a2430', 6, new THREE.Quaternion().setFromUnitVectors(UP, tipDir)));
	} else {
		// the thickest first: whatever the seed, the wood stays within its ceiling (WOOD_MOST)
		let woodTris = 0;
		for (const ch of [...draw].sort((a, b) => (b[0]?.r ?? 0) - (a[0]?.r ?? 0))) {
			if (woodTris > WOOD_MOST && t > 3 && (ch[0]?.r ?? 0) < 0.03) continue;
			const w = wood(bag, ch, t, ns, sunDir);
			woodTris += w?.tris ?? 0;
			if (w && w.rad[0] > 0.005) space.rod(w.pts.filter((_, i) => i % 2 === 0 || i === w.pts.length - 1), (u) => w.rad[Math.min(w.rad.length - 1, Math.round(u * (w.rad.length - 1)))] + 0.005);
		}
	}

	// leaves: each unit's tuft, flushed together; whatever the seed within their ceiling (LEAVES_MOST, at full
	// detail): a share kept, each grown to fill the gap
	let leaves = 0;
	for (const g of list)
		for (const lf of g.leaves) {
			const age = t - (g.born + g.dur * (lf.s / g.len) * 0.6);
			if (lf.s / g.len <= g.grown && age > 0 && age < lf.life * (inCrown(g.to, t, 0.72) && t > 3 ? 0.55 : 1)) leaves++;
		}
	const thin0 = DETAIL.thin;
	if (CUT && leaves > LEAVES_MOST) DETAIL.thin *= LEAVES_MOST / leaves;
	const H = Math.max(0.2, table(t, HEIGHT));
	const lit = (at) => clamp(0.3 + (at.y / H) * 0.4 + (Math.hypot(at.x, at.z) / Math.max(0.2, table(t, SPREAD))) * 0.3);
	const sizeAt = (born) => table(born, [[0.03, 0.5], [0.3, 0.7], [1, 0.85], [2.5, 0.95], [4, 1]]);
	for (const g of list) {
		if (hook > 0.3) break;
		for (const lf of g.leaves) {
			const x = lf.s / g.len;
			if (x > g.grown) continue;
			const formed = g.born + g.dur * x * 0.6;
			const age = t - formed;
			// in the shade inside the crown a leaf lives only half as long
			const life = lf.life * (inCrown(g.to, t, 0.72) && t > 3 ? 0.55 : 1);
			if (age <= 0 || age >= life) continue;
			const r = chance(seed, 'leaf', g.key, lf.i);
			const { at, dir } = onUnit(g, Math.min(x, g.grown));
			const out = across(dir).applyAxisAngle(dir, lf.bearing);
			// the leaves stand up and out from the shoot; the tuft's outer ones lie lower
			const tuft = x > 0.75 ? 1 : 0;
			const size = sizeAt(g.born) * lf.sizeK;
			leaf(bag, at.clone().addScaledVector(out, g.r * 0.9 + 0.001), out.clone().addScaledVector(dir, 0.6 + tuft * 0.4).normalize(), {
				age,
				life,
				size,
				petiole: MA.leaf.petiole * Math.sqrt(size) * lerp(0.7, 1.1, r()),
				r,
				close: false,
				sun: lit(at),
				droop: about(r, g.born < 0.5 ? -0.35 : -0.75, 0.3), // grown leaves droop 30–60° below level
				rise: g.born < 0.5 ? 0.15 : 0,
				old: t > 8,
			});
		}
	}

	DETAIL.thin = thin0;
	const C = cropAt(t);
	if (C === undefined) return bag.build();
	panicles(bag, seed, t, list, space, sunDir, C);
	return bag.build();
}

/** a grown mango's ceilings at full detail: its wood's triangles, its leaves, the fruit drawn as fruit (past them beads of their colour) */
const WOOD_MOST = 80000, LEAVES_MOST = 12500, FRUIT_FINE = 220;
/** the fruit drawn on the tree so far (see FRUIT_FINE) */
let FRUITS = 0;

/* ---- the crop: panicles, the set and the fruit ---- */

/**
 * The crop of one year: in the cool dry weeks the resting tips of the outer crown break into panicles instead of
 * shoots; they open from the base up over three or four weeks, insects (flies, bees) pollinate the perfect flowers;
 * of hundreds of flowers a panicle sets a few small fruit, most of which drop in the first weeks (the set and the
 * June drop of the mango), so at harvest one in a few panicles carries one to three fruit, hanging on its axis, the
 * rest of it shed; the panicles that set nothing dry and break off.
 */
function panicles(bag, seed, t, list, space, sunDir, C = CROP) {
	const days = (t - C) * 365;
	for (const g of list) {
		const p = g.panicle;
		if (!p || p.crop !== C || t <= p.born || g.grown < 1) continue;
		const r = p.r;
		const rr = chance(seed, 'panicle-fate', g.key);
		const grow = smooth((t - p.born) / 0.075);
		const bloom = clamp((days + 18) / 32);
		const dry = clamp((days - 12) / 30);
		// how many fruit this panicle keeps to harvest (0 most often), and how many it sets for a while
		const keep = rr() < 0.68 ? (rr() < 0.5 ? 1 : rr() < 0.7 ? 2 : 3) : 0; // 1–3 fruit kept on a panicle that holds any
		const set = keep + (rr() < 0.7 ? 2 + Math.floor(rr() * 6) : 0);
		const gone = !keep && days > between(rr, 40, 60);
		const tip = g.to.clone();
		const dir = g.endDir.clone().add(v3(0, 1.4, 0)).normalize();
		if (gone) continue;
		const fallen = keep && days > 45;
		// before fruit hangs on it, the panicle stands; once it bears, its axis bends to the fruit
		if (!fallen) panicle(bag, tip, dir, { r: chance(seed, 'panicle-draw', g.key), grow, bloom, dry, close: false, len: p.len });
		if (days < 4) continue;
		for (let k = 0; k < set; k++) {
			const fr = chance(seed, 'fruit-of', g.key, k);
			const lives = k < keep;
			const drop = lives ? Infinity : between(fr, 10, 45);
			if (days > drop) continue;
			const d = Math.min(days, drop);
			const key = `${g.key}|fruit|${k}`;
			// where it hangs is found for its ripe size, so a fruit swells where it hangs
			const full = lives ? 125 : drop;
			const F = MA.fruit;
			const Lf = F.length * fruitSize(full) * 1.04, Wf = Lf * lerp(F.width / F.length, 0.62, 1 - smooth((full - 10) / 40));
			// the axis it hangs on: from the shoot tip out, then down; 15–40 cm long
			const reach = p.len * lerp(0.45, 0.85, fr());
			const out = v3(tip.x, 0, tip.z);
			out.lengthSq() < 1e-6 ? out.set(1, 0, 0) : out.normalize();
			const az = (k / Math.max(1, set)) * 6.28 + fr() * 2;
			const outAz = out.clone().applyAxisAngle(UP, about(fr, 0, 0.7) + (k ? Math.sin(az) * 0.6 : 0));
			const hangDir = v3(0, -1, 0).addScaledVector(outAz, 0.35).normalize();
			const start = tip.clone().addScaledVector(outAz, reach * 0.35).add(v3(0, -reach * 0.55, 0));
			// a fruit hangs plumb from its stalk, wherever the search puts the stalk's end
			const plumb = (d2) => v3(0, -1, 0).addScaledVector(d2, 0.15).normalize();
			const shape = (a2, d2) => [0.25, 0.55, 0.82].map((x) => ({ c: a2.clone().addScaledVector(plumb(d2), F.stalk + Lf * x), r: Wf * 0.5 * (x === 0.55 ? 1 : 0.82) }));
			const place = lives ? space.settle(start, hangDir, shape, reach * 0.5, Wf * 0.6) : { at: start, dir: hangDir };
			if (!place) continue;
			// the young fruit sits on the standing panicle; as it grows the axis bends over and hangs
			const bend = smooth((d - 10) / 35);
			const onPanicle = onUnit({ from: tip, ctrl: tip.clone().addScaledVector(dir, p.len * 0.5), to: tip.clone().addScaledVector(dir, p.len) }, lerp(0.25, 0.55, fr()));
			const hangAt = onPanicle.at.clone().lerp(place.at, bend);
			const hd = v3(0, -1, 0).lerp(plumb(place.dir), bend).normalize();
			// the axis from the shoot tip to the fruit: up and out, then arching down
			const c1 = tip.clone().addScaledVector(dir, 0.06 + 0.04 * (1 - bend)).addScaledVector(outAz, 0.04 * bend);
			const c2 = hangAt.clone().add(v3(0, lerp(0.02, 0.08, bend), 0));
			const path = [];
			for (let i = 0; i <= 10; i++) {
				const x = i / 10, y = 1 - x;
				path.push(tip.clone().multiplyScalar(y * y * y).addScaledVector(c1, 3 * y * y * x).addScaledVector(c2, 3 * y * x * x).addScaledVector(hangAt, x * x * x));
			}
			const res = DETAIL.fruit === key;
			bag.fruit(key.split('|'), hangAt, hd);
			if (bend > 0.05 || fallen) bag.add('body', tube(path, (u) => lerp(0.0034, 0.0022, u) * lerp(0.6, 1, smooth(d / 60)), (u) => mix(MA.panicle.rachis, '#6e5a3a', clamp(d / 50) * 0.8), res ? 8 : 4));
			// its own short stalk
			const stalkEnd = hangAt.clone().addScaledVector(hd, F.stalk * lerp(0.4, 1, fruitSize(d)));
			bag.add('body', tube([hangAt, hangAt.clone().lerp(stalkEnd, 0.5), stalkEnd], (u) => lerp(0.0028, 0.004, u) * lerp(0.4, 1, fruitSize(d)), () => mix('#6f8a3a', MA.fruit.stalkWood, clamp(d / 60)), res ? 10 : 4));
			fruit(bag, stalkEnd, hd, d, sunDir, seed, key);
			bag.fruitDone();
		}
	}
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Fourteen stages, from the stone to ripe fruit; `t` the years since sowing each is grown at (between two stages, on
 * the way). Stages 6–10 are one crop of the tree's eighth year: panicles in the cool dry season, fruit ripe about four
 * months after full bloom. Stages 11–13 are the tree grown on, each at the ripe crop of its year (the tree bears every
 * year from its eighth), to the size a garden keeps it at: about 6.3 m high and 8.2 m across in its sixteenth year,
 * inside a dome's 12 m and 9 m. The default stays the eighth year's ripe crop (RIPE).
 */
const STAGES = [
	{ name: 'Stone', t: 0, note: "The stone of a ripe 'Tommy Atkins' fruit, the flesh scraped off: a flat, kidney-shaped, fibrous husk about 10.5 × 4.8 × 2.4 cm holding one kernel (Tommy Atkins is monoembryonic: one seedling, not true to its parent). Sown fresh, lying flat, just covered." },
	{ name: 'Germination', t: 0.055, note: 'Day 20: the root has gone down; the shoot breaks out of the husk at its concave edge and comes up bent in a hook (hypogeal: the seed leaves stay inside the stone and feed it), red-purple.' },
	{ name: 'First flush', t: 0.11, note: 'Six weeks: a stem 15–20 cm high ending in a tuft of eight to twelve soft leaves, hanging limp, deep red-bronze, that green in three or four weeks. The stone still lies beside it.' },
	{ name: 'Seedling', t: 0.5, note: 'Six months: a single stem 40–55 cm, about 1 cm thick, in three or four growth units, each a bare stretch and then a tuft of leaves 15–25 cm long; a new flush every two or three months, red while it hangs.' },
	{ name: 'Sapling', t: 1.5, note: 'Eighteen months: about 1.4 m, the stem 2.5 cm thick; at 0.6–0.8 m it has broken into a whorl of three or four shoots at the end of a growth unit, and they into more: the mango branches in whorls, unit by unit, each unit a bare stretch and a tuft.' },
	{ name: 'Young tree', t: 3.3, note: 'Fourth year: about 2.3 m high and 2.7 m across, a dense round crown on a short grey trunk about 6 cm thick, coloured flushes of red-bronze leaves hanging here and there on its outside. A seedling tree has not flowered yet (a grafted one would, from its third year).' },
	{ name: 'Flowering', t: CROP, note: "Eighth year, the end of the cool dry season: a dome about 4 m high and 4.5 m across, its lowest leaves half a metre above the ground, on a dark trunk of small, thick bark plates, about 17 cm thick. The resting tips of the outer crown have broken into upright panicles 25–40 cm long, their axes pink-red, with hundreds to thousands of small cream-yellow flowers, red-striped, opening from the base up over three or four weeks." },
	{ name: 'Fruit set', t: CROP + 0.07, note: 'Three to four weeks after full bloom: the panicles spent and browning, each with a few green fruitlets the size of an olive; most of them drop in the weeks to come (fruit drop), the tree keeping what it can feed.' },
	{ name: 'Green fruit', t: CROP + 0.21, note: "Eleven weeks: one to three fruit on the panicles that held any, the rest shed; each hangs on the panicle's bare axis 15–40 cm below the shoot tip, dark green, its sunny side flushed dull purple-red, nearly full size." },
	{ name: 'Colouring', t: CROP + 0.29, note: 'Fifteen weeks: full size and mature; the ground colour yellowing from the apex, the blush on the sunny side turning bright red.' },
	{ name: 'Ripe', t: CROP + 0.34, note: "About 125 days after full bloom (mature from 98–120 days): ripe 'Tommy Atkins', 10–14 × 8.5–10.5 cm, 400–700 g, purple-red to crimson over most of it, orange-yellow to yellow-green where it was shaded, dense pale lenticels, a whitish bloom; firm, fibrous orange flesh round a flat stone. A tree in its eighth year gives 100–300 fruit (78–150 kg at 6–8 years in Brazil)." },
	{ name: 'Bearing tree · 11th year', t: CROP + 3.34, note: "Ten and a half years from the stone, ripe at the end of its eleventh season: a broad dome about 4.7 m high and 6.3 m across on a dark, blocky trunk about 23 cm thick, its skirt of leaves half a metre above the ground and the inside bare wood. It has borne every year since its eighth; each limb that fruited went on sideways from the buds below its spent panicle, so the crown is a mass of short zig-zag units. About 125 fruit hang ripe on the bare panicle axes." },
	{ name: 'Grown tree · 13th year', t: CROP + 5.34, note: "Twelve and a half years: in full bearing (8–12 years on), about 5.5 m high and 7.2 m across, the trunk about 29 cm. Some 250 ripe fruit (about 125 kg; 150–300 kg a tree at twelve in the orchards), most on the sunny outside of the dome." },
	{ name: 'Kept tree · 16th year', t: CROP + 8.34, note: "Fifteen and a half years, the oldest kept here: about 6.3 m high and 8.2 m across on a trunk about 37 cm thick, wider than tall as 'Tommy Atkins' grows. A mango left alone grows on for decades to 10–15 m (some to 30 m); kept in a garden, as here under a dome, it is held at this size by pruning after the harvest, so this is the tree a garden keeps. About 375 ripe fruit (about 190 kg)." },
];

/** the years since sowing at a stage (0 … 10, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => mangoTree(timeAt(stage), `${seed ?? 'maia'}`);
/** the stage the tree is shown at by default, and whose fruit the Fruit view picks: the eighth year's ripe crop */
const RIPE = 10;

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

/** the fruit the tree bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed, stage = RIPE) {
	// an older tree's crop is its own: the fruit is picked from the stage itself (its ripe crop), else from the eighth year's
	const from = timeAt(stage) > 8 ? stage : RIPE;
	const { plant, fruits } = lite({ roots: false, thin: 0.12 }, () => pickFruit(() => grow(from, seed)));
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
	const key = ripePick(seed, stage);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant bears no fruit.');
	const { plant, fruits } = lite({ fruit: key, roots: false, thin: 0.12 }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This fruit has not set yet.');
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
		const merged = list.length === 1 ? list[0] : mergeGeometries(list);
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
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: STAGES.length - 1, value: RIPE, names: STAGES.map((s) => s.name) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] },
];

const PLANT = {
	id: 'mango',
	label: "Mango 'Tommy Atkins' · Mangifera indica",
	latin: "Mangifera indica L. 'Tommy Atkins' (Anacardiaceae) · Florida mango, a seedling of 'Haden' · Mango, Mangue",
	note: "'Tommy Atkins', the mango most grown for trade the world over. A dense, round, evergreen dome on a short dark trunk, built of thousands of short growth units each ending in a tuft of long, narrow, leathery leaves; new flushes hang limp and red-bronze. Upright pink-red panicles at the shoot tips in the dry season; oval fruit 12–14 cm hanging on the bare panicle axes, green ripening orange-yellow under a deep red blush.",
	from: 'Tree · 7½ years from the stone (to 15½ in its older stages)',
	layer: 'canopy',
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round(t * 365), note })), // days from sowing
	// what a world needs to plant it right; ages in years from sowing (a seedling tree), TA = measured on 'Tommy Atkins'
	facts: {
		height: { at0_5: [0.3, 0.55], at1_5: [1, 1.4], at4: [2.5, 2.9], at7_5: [3.9, 4.5], at10_5: [4.4, 5.2], at12_5: [5.2, 6], at15_5: [6, 7], pruned21y: 5.5, unpruned: [10, 15], unit: 'm' }, // TA 2.65 m at 4 y, 3.96 at 7, 4.46 at 8 (Embrapa Cerrados); past 8 y [EST], the Embrapa tempo slowing
		trunk: { at0_5: [0.008, 0.01], at1_5: [0.02, 0.03], at4: [0.07, 0.09], at7: [0.152, 0.189], at12_5: [0.26, 0.32], at15_5: [0.33, 0.4], unit: 'm diameter' }, // TA 15.2–18.9 cm at 7 y; past 8 y [EST], about 2 cm a year
		crown: { at4: [2.5, 2.9], at8: [4.4, 5.2], at10_5: [5.8, 6.6], at12_5: [6.8, 7.6], at15_5: [7.8, 8.6], unit: 'm across' }, // past 8 y [EST]
		spacing: { orchard: [10, 10], dense: [8, 5], highDensity: [7, 4], unit: 'm' },
		shade: 'full sun; fruits poorly in shade',
		climate: 'tropics and frost-free subtropics, 24–27 °C best, 750–2,500 mm rain with a dry season of 3 months or more for flowering; flowers hurt below 4.4 °C, grown trees killed below about −4 °C',
		years: { firstFlowersSeedling: [5, 7], firstFlowersGrafted: [2, 3], firstCropGrafted: [3, 4], fullBearing: [8, 12], productive: [25, 40] },
		flushes: { young: [3, 5], bearing: [2, 3], leavesEach: [10, 20] },
		leaf: { length: [0.15, 0.3], width: [0.035, 0.07], life: [2, 5], unit: 'm, years' },
		panicle: { length: [0.25, 0.35], width: [0.18, 0.24], flowers: [500, 750], perfect: 0.3 }, // TA 28.4 × 21 cm
		fruit: { length: [0.099, 0.14], width: [0.084, 0.105], thick: [0.079, 0.095], mass: [0.4, 0.7], perPanicle: [1, 3], days: [98, 140], unit: 'm, kg, days' },
		stone: { length: [0.085, 0.105], mass: [0.028, 0.042], embryony: 'monoembryonic' },
		yield: { perTree6to8y: [78, 150], perTree12y: [150, 300], perHectare: [20, 25], unit: 'kg, t' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one fruit) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? RIPE, `${seed ?? 'maia'}`) : () => grow(stage ?? RIPE, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'mango' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'mango',
			version: v,
			label: PLANT.label,
			latin: PLANT.latin,
			note: PLANT.note,
			from: PLANT.from,
			layer: PLANT.layer,
			stages: PLANT.stages,
			facts: JSON.parse(JSON.stringify(PLANT.facts)),
			params: JSON.parse(JSON.stringify(PARAMS)),
		},
		build,
	};
};

/** its lighter levels, built by the worlds as they are (L1, L2): the same tree at these details */
module.exports.levels = [{ values: { detail: 0.25 } }, { values: { detail: 0.2 } }];

/** the organs on their own, for checking them against photographs of the real thing */
module.exports.organs = { pickFruit, grow, MA, TREE, stone, leaf, flower, panicle, fruit, fruitGeometry, Bag, timeAt, mangoTree, growthUnits, unitsOf, unitsAt, thicken, inCrown, HEIGHT, SPREAD, CROP, STAGES };
