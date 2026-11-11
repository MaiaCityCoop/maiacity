'use strict';
/*
 * HAZEL 'TONDA GENTILE DELLE LANGHE' — Corylus avellana L. 'Tonda Gentile delle Langhe' (syn. 'Tonda Gentile
 * Trilobata'), the round hazelnut of the Langhe in Piedmont, Nocciola Piemonte IGP.
 * Version 2 of plants/hazel: one named cultivar, grown from a nut to an orchard tree in its eighth year, bearing.
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   cacao v3 carries it, with materials for the nut's polished shell and its leafy husk.
 *   2. ORGANS       the hazel's own organs, each to its measure: nut, husk, cluster, catkin, female flower, bud,
 *                   leaf, bark.
 *   3. THE TREE     its axes year by year (the trunk headed into an open vase of four limbs, their shoots in flat
 *                   sprays, the suckers at its foot), how thick each is, its roots, what each season puts on it.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Everything in metres. Time `t` in years from the 1st of February of the year the nut germinates.
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

/**
 * The materials, made once. `bark` old wood, matt; `twig` young wood, its skin glossy; `leaf` a leaf's two faces,
 * each its own colour (one-sided), the upper glossy; `sheet` thin things seen from both sides (petals, sepals);
 * `shell` a ripe hazelnut's shell, polished; `husk` the leafy husk round it, seen from both sides; `body` everything else.
 */
const MATERIALS = {
	bark: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
	leaf: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.5 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
	shell: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35 }),
	husk: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
	// a leaf on a tree of thousands: its outline and veins a picture (`bladeMap`) on a cupped sheet, cut by the picture's alpha
	blade: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.5, alphaTest: 0.4, map: bladeMap() }),
};
const materials = {};
const material = (kind) => (materials[kind] ??= (MATERIALS[kind] ?? MATERIALS.body)());
const KINDS = ['bark', 'twig', 'body', 'leaf', 'blade', 'sheet', 'shell', 'husk', 'prop'];
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
 * 2. ORGANS — the hazel's own, each to its measure ('Tonda Gentile delle Langhe' where it differs from the species)
 * ============================================================================================================== */

/** The cultivar's numbers, in one place (metres, colours as seen in daylight). */
const HZ = {
	// the nut: spheroidal, a little wider than long and flatter one way, faintly three-lobed seen from its tip; a broad
	// pale scar at its base, about half its width (Valentini et al. 2014, 2015: W 17.8–20.2 mm, roundness 0.96–0.98,
	// 3,196 mm³, 2.2–2.4 g)
	nut: { height: 0.0185, width: 0.0195, thick: 0.017, depth: 0.025 },
	shell: { young: '#ecebd2', youngTip: '#c9d29a', tan: '#c99a5c', ripe: '#a65a2c', dark: '#7c3e1c', stripe: '#5e3418', tip: '#b9ab8c', scar: '#9c8466', scarDark: '#5e4834' },
	kernel: { skin: '#9a5a30', inside: '#f2e7cc' },
	// the husk (involucre): two leafy bracts grown together at the base into a bell; on 'Tonda Gentile' longer than the
	// nut (1.2–1.5 times), open at the mouth with no waist, its lobes deeply and jaggedly cut and spreading; green and
	// glandular-hairy, drying straw-brown as the nut ripens
	husk: { length: 1.3, lobes: 9, green: '#7a9e3e', deep: '#56782a', vein: '#a2bd66', dry: '#c0a060', brown: '#8e6a3c' },
	leaf: { length: 0.104, width: 0.094, petiole: 0.012, top: '#25451a', topLight: '#365c22', under: '#78935a', vein: '#a5b977', flush: '#a6c45a', autumn: '#d9b23c', autumnDeep: '#c4862a', dead: '#8a6a3c' },
	// catkins: formed in June, through the summer and autumn small, stiff and grey-green; in January they lengthen,
	// loosen and hang, yellow with pollen; then they brown and drop
	catkin: { closed: 0.026, open: 0.068, radius: 0.0034, openRadius: 0.0046, grey: '#8d8a5e', brown: '#7e6a48', yellow: '#e6cf4a', pale: '#d8c46a', spent: '#7a6440' },
	female: { bud: '#6e5a38', stigma: '#cf1d3c' },
	bud: { scale: '#7d6440', green: '#7b7a42' },
	bark: { shoot: '#6f6440', shootSun: '#7c5a3c', hair: '#a09470', young: '#6a5040', grey: '#8a8072', silver: '#b4ac9e', lenticel: '#c9b796', scar: '#5a4434', peel: '#8a6446', lichen: '#c7cbb6', lichenGreen: '#a4b08a', moss: '#4f6a2a', fissure: '#4e3e30' },
	root: { young: '#efe3c8', old: '#6a4a32' },
};

/* ---- the nut ---- */

/**
 * The nut's outline from its base (u 0, the scar) to its tip (u 1), as a part of its half width: the base broad and
 * flat, the widest a third of the way up, rounded over to a short point.
 */
const nutProfile = (u) => {
	const below = u < 0.36;
	const k = (u - 0.36) / (below ? 0.47 : 0.64);
	const body = Math.sqrt(Math.max(0, 1 - k * k));
	// a short blunt point (the remains of the style) at the very tip
	return u > 0.94 ? Math.max(body, 0.12 * (1 - u) / 0.06) : body;
};

/**
 * One hazelnut, its scar at the origin and its tip along +Y, `g` 0 … 1 of its grown size, `brown` 0 … 1 how far its
 * shell has ripened (cream and green-tipped while young, then tan, then a warm mid-brown with fine darker stripes from
 * base to tip; the tip paler and felted; the broad scar matt, pale, rough). Seen across its width it is faintly
 * three-sided (the 'trilobata' of its old name). `res` draws it as finely as the fruit view needs.
 */
function nutGeometry({ g, brown, ns, res }) {
	const N = HZ.nut, S = HZ.shell;
	const H = N.height * g, W = N.width * g, T = N.thick * g;
	// (on the grown tree, past its eighth year, with twice the crop, each nut but the one looked at is coarser)
	const rings = res ? 64 : DETAIL.old || CUT ? 4 : fewer(6, 4);
	const sides = res ? 96 : DETAIL.old || CUT ? 6 : fewer(8, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const young = new THREE.Color(S.young), tan = new THREE.Color(S.tan), ripe = new THREE.Color(S.ripe), dark = new THREE.Color(S.dark), stripe = new THREE.Color(S.stripe);
	const colourAt = (u, ph) => {
		const c = young.clone().lerp(new THREE.Color(S.youngTip), smooth((u - 0.6) / 0.4) * 0.6);
		const b = ripe.clone().lerp(dark, 0.35 * fbm(Math.cos(ph) * 3, Math.sin(ph) * 3, u * 4, 2, ns));
		// the fine stripes, darker, from the scar toward the tip
		const st = Math.pow(Math.abs(Math.sin(ph * 13 + 2.2 * fbm(u * 3, Math.cos(ph), Math.sin(ph), 2, ns + 4))), 6) * smooth(u / 0.2) * (1 - smooth((u - 0.75) / 0.2));
		b.lerp(stripe, st * 0.45);
		// it turns from the tip and the sun side first: cream, tan, brown
		const turn = clamp(brown * 1.5 - (1 - u) * 0.35);
		c.lerp(tan, clamp(turn * 2)).lerp(b, clamp(turn * 2 - 1));
		// the felted tip, grey-beige, its felt running down the shell in streaks
		const streak = Math.pow(Math.abs(Math.sin(ph * 9 + 3 * fbm(u * 2, Math.cos(ph), Math.sin(ph), 2, ns + 6))), 8);
		const felt = smooth((u - 0.82) / 0.1) + streak * smooth((u - 0.45) / 0.4) * 0.8;
		c.lerp(new THREE.Color(S.tip), clamp(felt) * 0.85 * clamp(turn * 1.5));
		c.lerp(new THREE.Color('#dfe2c0'), smooth((u - 0.85) / 0.1) * 0.5 * (1 - turn));
		// toward the scar the shell darkens a little
		c.lerp(dark, smooth((0.12 - u) / 0.1) * 0.4 * turn);
		return c;
	};
	for (let i = 0; i <= rings; i++) {
		const u = i / rings;
		const pr = nutProfile(u);
		for (let j = 0; j <= sides; j++) {
			const ph = (j / sides) * Math.PI * 2;
			const lobe = 1 + 0.06 * Math.cos(3 * ph) * Math.pow(Math.sin(Math.PI * clamp(u * 0.8 + 0.1)), 0.7);
			const bump = res ? 1 + 0.006 * (fbm(Math.cos(ph) * 4, Math.sin(ph) * 4, u * 6, 2, ns) - 0.5) : 1;
			const x = (W / 2) * pr * lobe * bump * Math.cos(ph), z = (T / 2) * pr * lobe * bump * Math.sin(ph);
			pos.push(x, u * H, z);
			nor.push(Math.cos(ph), 0, Math.sin(ph));
			uv.push(j / sides, u);
			const c = colourAt(u, ph);
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	// the scar: a broad, flat, rough disc closing the base, pale and matt
	const centre = pos.length / 3;
	const sc = mix(S.scar, '#b8a07c', 0.3);
	pos.push(0, -H * 0.012, 0);
	nor.push(0, -1, 0);
	uv.push(0.5, 0);
	col.push(sc.r, sc.g, sc.b);
	for (let j = 0; j <= sides; j++) {
		const ph = (j / sides) * Math.PI * 2;
		const pr = nutProfile(0);
		pos.push((W / 2) * pr * Math.cos(ph), 0, (T / 2) * pr * Math.sin(ph));
		nor.push(0, -1, 0);
		uv.push(j / sides, 0);
		const c = mix(S.scar, S.scarDark, 0.55); // its rim dark
		col.push(c.r, c.g, c.b);
	}
	for (let j = 0; j < sides; j++) idx.push(centre, centre + 1 + j, centre + 2 + j);
	return smoothNormals(made(pos, nor, uv, col, idx, false));
}

/**
 * The husk round one nut: a cup of two leafy bracts from the base of the nut, hugging it below its widest, then
 * standing open and flared above it, its mouth cut into irregular, jagged teeth, split deeper on two sides where the
 * bracts meet. `g` 0 … 1 grown, `dry` 0 … 1 how far it has dried. While the nut is still small the husk is the most
 * of the young fruit, longer than the nut and closed over it. Built round +Y from the origin.
 */
function huskGeometry({ g, nutG, dry, ns, res, r }) {
	const N = HZ.nut, K = HZ.husk;
	const R = (N.width / 2) * Math.max(0.25, g);
	const H = N.height * Math.max(0.25, g) * K.length * lerp(1.25, 1, smooth(nutG));
	const rows = res ? 26 : DETAIL.old ? 2 : fewer(3, 2);
	const cols = res ? 120 : DETAIL.old ? 7 : fewer(10, 6);
	// the mouth: lobes of different depths, each cut into a few sharp teeth; the two splits between the bracts
	const lobes = [];
	for (let k = 0; k < K.lobes; k++) lobes.push({ depth: between(r, 0.2, 0.45), teeth: 2 + Math.floor(r() * 3) });
	const splitAt = r() * Math.PI;
	const mouth = (ph) => {
		const x = (ph / (Math.PI * 2)) * K.lobes;
		const k = Math.floor(x) % K.lobes, f = x - Math.floor(x);
		const L = lobes[k];
		const lobe = 1 - L.depth * Math.pow(Math.abs(f * 2 - 1), 1.4);
		const tf = f * L.teeth;
		const tooth = 1 - 0.07 * Math.pow(Math.abs((tf - Math.floor(tf)) * 2 - 1), 0.8);
		const split = Math.max(Math.exp(-Math.pow(Math.sin(ph - splitAt) / 0.09, 2)), 0) * 0.32;
		return lobe * tooth * (1 - split);
	};
	const open = lerp(0.12, 0.4, smooth(nutG)) + dry * 0.3;
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const green = new THREE.Color(K.green), deep = new THREE.Color(K.deep), vein = new THREE.Color(K.vein), dryC = new THREE.Color(K.dry), brownC = new THREE.Color(K.brown);
	for (let i = 0; i <= rows; i++) {
		const u = i / rows;
		for (let j = 0; j <= cols; j++) {
			const ph = (j / cols) * Math.PI * 2;
			const top = mouth(ph);
			// the base closed round the stalk: the husk's first rows curl in under the nut's scar
			const close = smooth(u / 0.16);
			const y = u * top * H - 0.07 * H * (1 - close);
			const yn = y / (N.height * Math.max(0.25, g));
			// hugging the nut's flanks below its widest, standing off and flaring outward above
			const hug = nutProfile(clamp(yn)) * 1.02 + 0.06;
			const flare = yn > 0.35 ? 1 + open * Math.pow((yn - 0.35) / 0.8, 1.5) : 1;
			const rr = R * Math.max(hug * (yn < 0.36 ? 1 : 0) + (yn >= 0.36 ? 1.06 : 0), 0.62) * flare;
			const wob = 1 + 0.04 * (noise3(Math.cos(ph) * 3, Math.sin(ph) * 3, u * 4, ns) - 0.5);
			const rc = rr * lerp(0.28, 1, close);
			const x = rc * wob * Math.cos(ph), z = rc * wob * Math.sin(ph) * (N.thick / N.width);
			pos.push(x, y, z);
			nor.push(Math.cos(ph), 0.2, Math.sin(ph));
			uv.push(j / cols, u);
			// green, glandular, its veins running up into the teeth; drying from the teeth down
			const c = green.clone().lerp(deep, 0.35 * fbm(Math.cos(ph) * 5, Math.sin(ph) * 5, u * 6, 2, ns + 1));
			const vv = Math.pow(Math.abs(Math.sin(ph * K.lobes * 1.5)), 10);
			c.lerp(vein, vv * 0.35 * (0.4 + u));
			c.lerp(deep, (1 - u) * 0.25);
			const d = clamp(dry * 1.6 - (1 - u) * 0.6);
			c.lerp(dryC, d).lerp(brownC, clamp(d * 1.5 - 1) * 0.6 + 0.2 * d * fbm(Math.cos(ph) * 9, Math.sin(ph) * 9, u * 9, 2, ns + 2));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rows; i++)
		for (let j = 0; j < cols; j++) {
			const a = i * (cols + 1) + j, b = a + cols + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const geo = made(pos, nor, uv, col, idx, false);
	geo.computeVertexNormals();
	return geo;
}

/**
 * A cluster of hazelnuts (a 'cluster' or 'glomerule'), each nut in its own husk, the husks joined at their base on a
 * short common stalk; the nuts point on from the stalk, splayed. Built hanging: the stalk from `at` along `dir`.
 * `n` nuts; `nutG`, `huskG` 0 … 1 grown; `brown` the shells' ripening; `dry` the husks'; `fallen` which nuts have
 * dropped out of their husks. Returns where each nut is (for the ground below).
 */
function cluster(bag, at, dir, o) {
	const { n, nutG, huskG, brown, dry, fallen, seedKey, key, res } = o;
	const r = chance(seedKey, 'cluster', key);
	const d = dir.clone().normalize();
	const stalkLen = 0.012 * lerp(0.4, 1, huskG) + 0.006 * r();
	const end = at.clone().addScaledVector(d, stalkLen);
	bag.add('body', tube([at, at.clone().lerp(end, 0.5).add(v3(0, 0.001, 0)), end], (u) => 0.0018 * lerp(0.6, 1, huskG) * (1 + 0.3 * u), () => mix('#7d8a40', '#8a7448', dry), res ? 10 : 4));
	const side0 = across(d);
	const roll = r() * Math.PI * 2;
	const out = [];
	if (DETAIL.level < 0.5 && !res) {
		// seen from afar (a world planting hundreds): the cluster as one round lump, of the husks' and the nuts' colour
		const kept = n - (fallen ? fallen.filter(Boolean).length : 0);
		if (huskG > 0.01 && kept > 0) {
			const R = HZ.nut.width * 0.5 * lerp(0.3, 1, huskG) * (1 + 0.25 * Math.min(3, kept - 1));
			const c = mix(mix(HZ.husk.green, HZ.husk.dry, dry), mix(HZ.shell.young, HZ.shell.ripe, brown), 0.35 * nutG);
			bag.add('husk', bead(end.clone().addScaledVector(d, R * 0.9), v3(R, R, R), c, 3));
		}
		for (let k = 0; k < n; k++) out.push({ at: end.clone(), dir: d, size: 1 });
		return out;
	}
	for (let k = 0; k < n; k++) {
		const kr = chance(seedKey, 'nut', key, k);
		// the nuts of a cluster fan out from its end, each tilted off the stalk's line
		const a = roll + (k / Math.max(1, n)) * Math.PI * 2 + about(kr, 0, 0.3);
		const tilt = n === 1 ? about(kr, 0.1, 0.1) : between(kr, 0.62, 0.95);
		const side = side0.clone().applyAxisAngle(d, a);
		const nd = d.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt)).normalize();
		const size = about(kr, 1, 0.06) * (n >= 4 ? 0.95 : 1);
		const base = end.clone().addScaledVector(side, (n === 1 ? 0 : 0.006) * huskG);
		const q = new THREE.Quaternion().setFromUnitVectors(UP, nd).multiply(new THREE.Quaternion().setFromAxisAngle(UP, kr() * Math.PI * 2));
		const m = new THREE.Matrix4().compose(base, q, v3(size, size, size));
		const ns = hashText(`${key}|${k}`) % 991;
		const gone = fallen && fallen[k];
		if (!gone && nutG > 0.02) bag.add('shell', nutGeometry({ g: lerp(0.08, 1, nutG), brown, ns, res }), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.0012, 0)));
		if (huskG > 0.01) bag.add('husk', huskGeometry({ g: lerp(0.15, 1, huskG), nutG, dry, ns, res, r: kr }), m);
		out.push({ at: base.clone(), dir: nd, size });
	}
	return out;
}

/** a nut lying on the ground under the tree, fallen out of its husk */
function fallenNut(bag, at, seedKey, key) {
	const r = chance(seedKey, 'fallen', key);
	if (DETAIL.level < 0.5) {
		bag.add('shell', bead(at.clone().add(v3(0, HZ.nut.thick * 0.45, 0)), v3(HZ.nut.width / 2, HZ.nut.thick / 2, HZ.nut.width / 2), HZ.shell.ripe, 3));
		return;
	}
	const lie = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + about(r, 0, 0.5), r() * Math.PI * 2, about(r, 0, 0.4)));
	const m = new THREE.Matrix4().compose(at.clone().add(v3(0, HZ.nut.thick * 0.45, 0)), lie, v3(1, 1, 1));
	m.multiply(new THREE.Matrix4().makeTranslation(0, -HZ.nut.height * 0.4, 0));
	bag.add('shell', nutGeometry({ g: 1, brown: 1, ns: hashText(key) % 991, res: false }), m);
}

/** the nut as sown: lying on its side in the soil; the shell parting at its scar as the root comes out */
function sownNut(bag, at, seed, crack) {
	const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.7, -Math.PI / 2 + 0.3));
	const m = new THREE.Matrix4().compose(at, turn, v3(1, 1, 1)); // its scar at `at`, where root and shoot come out
	bag.add('shell', nutGeometry({ g: 1, brown: 1, ns: hashText(seed) % 991, res: true }), m);
	if (crack > 0) {
		// the shell split at its scar, where the root comes out: the pale kernel showing in the crack
		bag.add('body', bead(v3(0, HZ.nut.height * 0.03, 0), v3(0.0035 * crack, 0.0016, 0.0022 * crack), HZ.kernel.inside, 6), m);
	}
	return m;
}

/* ---- catkins, the female flower and the buds ---- */

/**
 * A catkin from its node: its short stalk, then the spike of scales round its axis. `open` 0 … 1 from closed (stiff,
 * short, grey-green, its scales tight) to open (long, loose, hanging, yellow with pollen); `spent` 0 … 1 browning
 * after the pollen is shed; `g` 0 … 1 how far it has grown since it formed.
 */
function catkin(bag, at, out, o) {
	const { g, open, spent, r } = o;
	const K = HZ.catkin;
	const len = lerp(K.closed * lerp(0.25, 1, g), K.open, smooth(open)) * about(r, 1, 0.1);
	const rad = lerp(K.radius * lerp(0.5, 1, g), K.openRadius, smooth(open)) * (1 - 0.25 * spent);
	// closed it stands out stiffly and droops a little; open it hangs straight down, swaying
	const hang = lerp(about(r, -0.45, 0.25), -1.45, smooth(open));
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const d0 = flat.clone().multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
	const stalk = at.clone().addScaledVector(flat, 0.003).add(v3(0, -0.001, 0));
	const pts = [at, stalk];
	// (closed on a tree of thousands: a short stiff cone of two spans)
	const steps = CUT && !DETAIL.fruit && open < 0.2 ? 2 : DETAIL.level < 1 || open < 0.2 ? 4 : 8;
	let p = stalk.clone();
	const d = d0.clone();
	const sway = about(r, 0, 0.12);
	for (let i = 0; i < steps; i++) {
		d.add(v3(sway * 0.3, -0.06 * smooth(open), 0)).normalize();
		p = p.clone().addScaledVector(d, len / steps);
		pts.push(p);
	}
	const colour = mix(mix(K.grey, K.brown, 0.3 * r()), K.yellow, smooth(open * 1.3)).lerp(new THREE.Color(K.spent), spent);
	const ns = Math.floor(r() * 997);
	bag.add(
		'body',
		tube(
			pts,
			(u, v, s) => {
				if (s < 0.0035) return 0.0007;
				const w = (s - 0.0035) / Math.max(1e-4, len);
				// the scales in a tight spiral, loosening as it opens
				const scales = 1 + lerp(0.12, 0.26, open) * Math.pow(Math.abs(Math.sin(v * Math.PI * 6 + w * 40)), 2);
				return rad * scales * Math.pow(Math.sin(Math.PI * clamp(0.04 + 0.96 * w)), 0.35) * (1 - 0.2 * w);
			},
			(u, v, s) => {
				const w = (s - 0.0035) / Math.max(1e-4, len);
				const c = colour.clone();
				c.lerp(new THREE.Color(open > 0.3 ? K.pale : '#6a5a3a'), 0.35 * Math.pow(Math.abs(Math.sin(v * Math.PI * 6 + w * 40)), 4));
				c.lerp(new THREE.Color('#5a4a30'), (noise3(v * 8, w * 20, ns, 3) - 0.5) * 0.3);
				return s < 0.0035 ? new THREE.Color('#6a6040') : c;
			},
			DETAIL.level < 1 || open < 0.2 ? 3 : 6,
			true,
		),
	);
}

/**
 * A female flower: it looks like a leaf bud, plump and brown, until in late winter a tuft of crimson stigmas,
 * 2–5 mm, pushes out of its tip; they wither dark in a few weeks.
 */
function femaleFlower(bag, at, dir, bloom, r) {
	const F = HZ.female;
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
	const c = at.clone().addScaledVector(dir, 0.0028);
	bag.add('body', bead(c, v3(0.0021, 0.0034, 0.0021), F.bud, 4, q));
	if (bloom <= 0) return;
	const tip = c.clone().addScaledVector(dir, 0.0028);
	const n = DETAIL.level < 1 ? 4 : 9;
	const withered = clamp((bloom - 0.7) / 0.3);
	const col = mix(F.stigma, '#5a2a24', withered);
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + r() * 0.5;
		const side = across(dir).applyAxisAngle(dir, a);
		const L = 0.0045 * smooth(Math.min(1, bloom * 2.5)) * about(r, 1, 0.25);
		const e = tip.clone().addScaledVector(dir, L * 0.7).addScaledVector(side, L * 0.6);
		bag.add('body', tube([tip, tip.clone().lerp(e, 0.5).addScaledVector(dir, L * 0.1), e], (u) => 0.00034 * (1 - 0.5 * u), () => col, 3));
	}
}

/** a winter bud on the wood: blunt, ovoid, its scales brown edged green-ochre */
function bud(bag, at, dir, swell, r) {
	const B = HZ.bud;
	const s = lerp(0.0019, 0.0026, swell) * about(r, 1, 0.1);
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	bag.add('body', bead(at.clone().addScaledVector(dir, s * 0.9), v3(s * 0.8, s * 1.35, s * 0.8), mix(B.scale, B.green, 0.3 + 0.4 * swell), DETAIL.fruit ? 4 : 2, q));
}

/* ---- the leaf ---- */

/**
 * Its outline: nearly round, the base deeply heart-shaped (cordate), widest at the middle, the top cut off into a
 * short, abrupt point (cuspidate); the margin doubly toothed, the teeth larger and nearly lobes toward the top.
 * The blade starts a little behind the end of its stalk, its two basal lobes either side of it.
 */
const leafShape = (teeth) => {
	const rows = [[0, 0.42], [0.05, 0.72], [0.13, 0.9], [0.28, 0.99], [0.45, 1], [0.6, 0.95], [0.72, 0.82], [0.82, 0.58], [0.88, 0.3], [0.93, 0.11], [1, 0]];
	return (u) => {
		const w = table(u, rows);
		if (!teeth || u < 0.03 || u > 0.94) return w;
		const saw = (x) => 1 - Math.abs(((x % 1) + 1) % 1 * 2 - 1);
		return w * (1 + 0.035 * saw(u * 19) + 0.018 * saw(u * 38) + 0.03 * saw(u * 6.5) * smooth((u - 0.45) / 0.2));
	};
};

/** how much of its sheet's width a cut-out leaf fills at its widest (its teeth inside the sheet) */
const BLADE_FIT = 0.92;
let BLADE_MAP = null;
/**
 * The leaf's picture, made once from its numbers: x along it from its base to its tip, y across it; its outline
 * (`leafShape` with its double teeth) in the alpha, the midrib and the seven or so pairs of straight side veins pressed
 * in, a faint mottle; white elsewhere, so the vertex colours give the leaf its colour.
 */
function bladeMap() {
	if (BLADE_MAP) return BLADE_MAP;
	const W = 256, H = 256;
	const shape = leafShape(true);
	const data = new Uint8Array(W * H * 4);
	const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const u = (x + 0.5) / W, v = ((y + 0.5) / H - 0.5) * 2;
			const half = shape(u) * BLADE_FIT;
			const k = (((u * 8.5 - (Math.abs(v) / BLADE_FIT) * 1.1) % 1) + 1) % 1;
			const side = smooth((0.08 - Math.abs(k - 0.5) * 2 + 0.92) / 0.08) * (Math.abs(v) < half * 0.94 ? 1 : 0);
			const mid = Math.abs(v) < 0.035 ? 1 : 0;
			const g = 0.98 - 0.16 * side * (1 - u * 0.5) + 0.25 * mid * (1 - u * 0.6) + 0.04 * (noise3(u * 20, v * 20, 5, 2) - 0.5);
			const i = (y * W + x) * 4;
			data[i] = data[i + 1] = data[i + 2] = Math.round(clamp(srgb(g)) * 255);
			data[i + 3] = Math.round(clamp((half - Math.abs(v)) / 0.012 + 0.5) * 255);
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
/** the nut clusters drawn on the tree so far (see TREE.clustersFine) */
let CLUSTERS = 0, CATKINS = 0;

/**
 * A cut-out leaf's sheet: along +X from its base, `half` its half width, its face up; its upper face cupped along the
 * midrib (`lift(u, v)`, as the built leaf's) in two spans; its underside one flat sheet a hair below, lit as the face
 * above it (a thin leaf lets the light through). Six triangles.
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

/**
 * One hazel leaf: a short, glandular-hairy stalk, then the blade, held out flat beside the shoot (the leaves of a
 * hazel shoot stand in two rows), a little cupped, its tip down. The upper face mid to dark green, a little rough,
 * its seven or so pairs of straight side veins pressed in; the underside paler and greyer, the veins standing out.
 * `age` 0 … 1 from bud to grown (the spring flush pale yellow-green and soft), `fall` 0 … 1 the autumn (butter
 * yellow, then gone), `size` 0 … 1 of a grown leaf, `out` the side it is held to, `sun` 0 … 1.
 */
function leaf(bag, at, out, o) {
	const { age, fall, size, r, close = false, sun = 0.5, up = 0 } = o;
	const L = HZ.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const grown = smooth(age);
	const len = L.length * size * lerp(0.22, 1, grown) * about(r, 1, 0.08);
	const wid = len * (L.width / L.length) * about(r, 1, 0.06);
	const pet = L.petiole * Math.sqrt(size) * lerp(0.4, 1, grown);
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const rise = lerp(0.9, about(r, 0.3, 0.2), grown) + up * 0.4;
	const pd = flat.clone().multiplyScalar(Math.cos(rise)).add(v3(0, Math.sin(rise), 0)).normalize();
	const end = at.clone().addScaledVector(pd, pet);
	// (on the grown tree the short stalk is hidden under its blade: left out, and each blade drawn in fewer rows)
	if (close || (!DETAIL.old && !(CUT && !DETAIL.fruit))) bag.add('body', tube([at, end], (u) => 0.0009 * Math.sqrt(size) * (1 - 0.25 * u) * lerp(0.6, 1, grown), () => (fall > 0.2 ? mix(L.autumn, L.dead, fall) : mix('#8a8a44', '#6a7a36', grown)), close ? 6 : 3));
	// held out level and a little down, the tip hanging; the spring leaf still folded and drooping
	const droop = lerp(-0.8, about(r, -0.18, 0.18), grown) - fall * 0.35 + up * 0.3;
	const bd = flat.clone().applyAxisAngle(UP, about(r, 0, 0.3)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = lerp(0.3, about(r, 0.08, 0.04), grown);
	const curl = about(r, 0.09, 0.05);
	const ns = Math.floor(r() * 1000);
	const lit = clamp(sun);
	const yellow = (u) => mix(L.autumn, L.autumnDeep, 0.25 + 0.35 * r()).lerp(new THREE.Color(L.dead), clamp(fall * 1.6 - 0.9));
	const fallTint = r() * 0.25;
	const top = (u, v) => {
		const c = mix(L.top, L.topLight, 0.2 + 0.6 * lit);
		c.lerp(new THREE.Color(L.flush), (1 - smooth(age * 1.3)) * 0.85);
		// the midrib and the straight side veins, running out to the bigger teeth
		const mid = Math.abs(v) < 0.04 ? 1 : 0;
		const side = close ? smooth((0.08 - Math.abs((((u * 8.5 - Math.abs(v) * 1.1) % 1) + 1) % 1 - 0.5) * 2 + 0.92) / 0.08) * (Math.abs(v) < 0.94 ? 1 : 0) : 0;
		c.lerp(new THREE.Color('#2b4d1a'), side * 0.3 * (1 - u * 0.5));
		c.lerp(new THREE.Color(L.vein), mid * 0.35 * (1 - u * 0.6));
		c.lerp(new THREE.Color('#4a7030'), (noise3(u * 5, v * 3, ns, 3) - 0.45) * 0.3);
		if (fall > 0) c.lerp(yellow(u), clamp(fall * 1.7 - (1 - Math.abs(v)) * 0.2 + fallTint - 0.15));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#c4cf9a', (1 - smooth(age * 1.3)) * 0.5);
		const side = close ? smooth((0.1 - Math.abs((((u * 8.5 - Math.abs(v) * 1.1) % 1) + 1) % 1 - 0.5) * 2 + 0.9) / 0.1) : 0;
		if (Math.abs(v) < 0.05) c.lerp(new THREE.Color('#c8cf9e'), 0.45);
		c.lerp(new THREE.Color('#b9c48e'), side * 0.3);
		if (fall > 0) c.lerp(yellow(u), clamp(fall * 1.7));
		return c;
	};
	const behind = 0.07; // the basal lobes reach back past the stalk's end
	const lift = (u, v) => fold * Math.abs(v) * 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.01 * Math.sin(u * 13 + v * 4 + ns) * v * v - 0.05 * v * v * (1 - u);
	if (CUT && !close && !DETAIL.fruit) {
		bag.add('blade', cutLeaf(len, (wid * 0.5) / BLADE_FIT, lift, top, under), aim(end, bd, about(r, 0, 0.25)).multiply(new THREE.Matrix4().makeTranslation(-behind * len, 0, 0)));
		return;
	}
	const blade = sheet({
		length: len,
		width: wid * 0.5,
		shape: leafShape(close || DETAIL.level >= 1),
		lift: (u, v) => fold * Math.abs(v) * 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - curl * u * u + 0.01 * Math.sin(u * 13 + v * 4 + ns) * v * v - 0.05 * v * v * (1 - u),
		paint: top,
		back: under,
		along: close ? 40 : DETAIL.old ? fewer(3, 3) : fewer(6, 3),
		across: close ? 14 : 2,
	});
	const m = aim(end, bd, about(r, 0, 0.25)).multiply(new THREE.Matrix4().makeTranslation(-behind * len, 0, 0));
	bag.add('leaf', blade, m);
}

/* ---- bark ---- */

/**
 * Hazel bark by the age (years) and radius (m) of the wood: this year's shoot olive-brown, flushed red-brown where
 * the sun reaches it, and bristly with glandular hairs; then smooth and glossy brown, dotted with pale lenticels;
 * older stems smooth, shining grey-brown to silvery, the lenticels drawn out sideways into pale dashes, the thin
 * outer bark peeling here and there in papery strips that show copper-brown beneath; pale lichen and, low down on
 * the shaded side, moss. It never cracks deeply.
 */
function barkPattern(r, v, s, ns) {
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 40, s * 10, cz * 40, 2, ns + 5) - 0.5) * 0.6;
	// peeling strips: wide round the stem, short along it
	const c = cells(cx * 45 + w, s * 16 + w * 0.3, cz * 45 - w, ns + 3);
	return { peel: c.id < 0.16 ? smooth((0.42 - c.f1) / 0.16) : 0, edge: c.edge, cx, cz };
}
const oldWood = (r) => clamp((r - 0.01) / 0.03);
function barkColour(age, r, v, s, sun, ns, low) {
	const B = HZ.bark;
	const a = v * Math.PI * 2;
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	if (age < 0.6) {
		const c = mix(B.shoot, B.shootSun, 0.2 + 0.6 * sun);
		return c.lerp(new THREE.Color(B.hair), 0.25 * noise3(cx * 900, s * 400, cz * 900, ns));
	}
	const c = mix(B.young, B.grey, clamp((r - 0.003) / 0.016) * 0.8 + clamp((age - 2) / 6) * 0.2);
	// lenticels: pale, a millimetre or two, drawn out sideways round the stem as it thickens
	const stretch = lerp(1, 3.5, clamp(r / 0.03));
	const ln = noise3((cx * 260) / stretch, s * 650, (cz * 260) / stretch, ns + 7);
	c.lerp(new THREE.Color(B.lenticel), smooth((ln - 0.8) / 0.06) * 0.8);
	const o = oldWood(r);
	if (o > 0) {
		const { peel, cx: px, cz: pz } = barkPattern(r, v, s, ns);
		c.lerp(mix(B.grey, B.silver, fbm(px * 30, s * 6, pz * 30, 2, ns + 2)), smooth(o * 1.4) * 0.85);
		// on old smooth bark the lenticels are dark brown dashes, a centimetre or two across the stem
		const dash = noise3((cx * 90) / stretch, s * 260, (cz * 90) / stretch, ns + 29);
		c.lerp(new THREE.Color(B.scar), smooth((dash - 0.78) / 0.05) * o * 0.75);
		c.lerp(new THREE.Color(B.peel), peel * o * 0.65);
		// lichen in pale patches; moss low on the shaded side
		const spot = cells(cx * 22, s * 14, cz * 22, ns + 11);
		if (spot.id < 0.22) c.lerp(new THREE.Color(spot.id < 0.08 ? B.lichen : B.lichenGreen), smooth((0.38 - spot.f1 + 0.1 * fbm(cx * 60, s * 60, cz * 60, 2, ns)) / 0.12) * o * 0.7);
		c.lerp(new THREE.Color(B.moss), clamp(low) * o * clamp(0.35 - sun) * 1.8 * fbm(cx * 10, s * 4, cz * 10, 2, ns + 17));
	}
	return c;
}
function barkRelief(r, v, s, ns) {
	const o = oldWood(r);
	if (o <= 0) return 0;
	const { peel } = barkPattern(r, v, s, ns);
	return o * (0.012 * peel + 0.004 * (noise3(v * 20, s * 30, 0, ns) - 0.5));
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, how thick each is, its roots, its seasons
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. 'Tonda Gentile delle Langhe' grown as Piedmont's orchards grow it, in one of two
 * forms (the version's two variants):
 *   - TREE (vaso cespugliato), the newer orchards': a single short trunk headed at about 55 cm in its second winter,
 *     four limbs from its top as an open vase, rising at about 29° from upright and arching out;
 *   - BUSH (cespuglio), the old way of the Alta Langa: cut to the ground in its second winter, five stems kept from
 *     the stool, long, straight and smooth, leaning out at about 23°, bare of side shoots below about 1.2 m.
 * Measured: 3.24 m tall, the trunk 7.9 cm, 1.35 kg of nuts at 6–7 years in the orchard (Valentini et al. 2014);
 * 3.8 m tall, 3.2 m wide at 11 (Solar & Štampar 2009).
 * Either way the suckers a hazel sends up from its foot every year are cut away (this year's stand till winter).
 * Each year's shoots grow from bud break in early April to mid July; the next spring the buds near the top of last
 * year's shoots break into long shoots, those along the middle into short ones, the ones at the base stay asleep. The
 * leaves of a shoot stand in two rows, and its side shoots leave it in the same plane, so a hazel's shoots make flat
 * sprays.
 *
 * Time `t` is in years from the 1st of February of the year the nut germinates: the hazel's year starts with its
 * flowering, in midwinter. `s` is the part of the year (Langhe, Valentini et al. 2014, 2015; Alta Langa handbook):
 * the catkins shed their pollen from the end of December to mid January (s −0.1 … −0.04), the red stigmas show from
 * mid January to the end of February (−0.05 … 0.08); the leaf buds break about the 20th of March (0.13); the ovules
 * are fertilised at the start of June (0.33) and the nut grows at once, 90 % of its size by the 4th of July (0.42);
 * the kernel fills in July, the shell browns in early August, and the nuts fall from the 10th to the 25th of August
 * (0.52 … 0.57); the leaves yellow at the end of October and are gone in November (0.72 … 0.8).
 */
const FORMS = {
	tree: { head: 0.55, limbs: 4, angle: 0.5, apart: 0.05, bareBelow: 0, vigour: 1, grown: { height: [[8, 4.0], [12, 5.2], [16, 6.0], [20, 6.5]], reach: [[8, 2.0], [12, 2.2], [16, 2.45], [20, 2.6]], long: 0.8, skirt: 0.8, up: 0.045 } },
	bush: { head: 0.07, limbs: 5, angle: 0.4, apart: 0.01, bareBelow: 1.2, vigour: 1.2, grown: { height: [[8, 4.0], [12, 4.8], [16, 5.4], [20, 5.8]], reach: [[8, 2.1], [12, 2.35], [16, 2.6], [20, 2.75]], long: 0.75, skirt: 0.6, up: 0.03 } },
};
/**
 * Past its eighth year [EST from the species' and the cultivar's grown sizes: 3.8–4.2 m tall and 3.2–3.8 m wide at
 * 12, 4.5–6 m and 4.5–5.5 m at 20; a bush 4–6 m, a tree trained on one trunk 6–8 m (Trees and Shrubs Online; Solar &
 * Štampar 2009; Agrion 2024)] the grower keeps the hazel in the crown its row allows (`grown`: height and half-width
 * by year, each form its own): a tip past it is headed back each winter and the buds below the cut break instead, and
 * shoots bowed down or hanging under the skirt are cut away for the harvest. The grown shoots stand more upright
 * (`up`, ADULT.sag), break into long shoots less often (`long`), flower on fewer nodes (ADULT.flowers), and the twigs
 * die in the shaded middle of the crown but live on in its light. None of it touches a year before the ninth, so every
 * younger stage is as it was.
 */
const ADULT = { from: 8, vigour: [[7, 1], [12, 1.1], [20, 1.1]], sag: 0.4, flowers: 0.65 };
/** a place deep in the grown crown, where the shade kills the twigs */
const shaded = (p, t) => Math.hypot(p.x, p.z) < straight(t, FORM.grown.reach) * 0.6 && p.y < straight(t, FORM.grown.height) * 0.7;
/** the form being grown (set by `build` from the variant) */
let FORM = FORMS.tree;
const P = { long: [0.34, 0.16, 0.05], short: 0.17, shortOfShort: 0.35, shortLife: 2.6, twigLife: 3.5 };
const TREE = {
	depth: HZ.nut.depth, // the nut sown 4 cm deep in autumn
	// how long a year's extension of an axis is by its order (trunk 0, limb 1, …) at vigour 1
	shoot: [0.3, 0.75, 0.42, 0.3, 0.2, 0.14],
	fade: [1, 0.85, 0.72, 0.62, 0.55, 0.5, 0.46, 0.43],
	internode: 0.034,
	tipRadius: 0.0015,
	pipeLength: 2.4e-7,
	ring: 0.3, // how much each year's ring adds to what the wood carries
	firstFlowers: 4, // catkins and female flowers from its fifth winter (the 4th after planting)
	// which of last year's buds break, and how long the shoots they make live
	leafOut: 0.13,
	stop: 0.42,
	leafFall: [0.72, 0.8],
	clustersFine: 300, // the nut clusters drawn as nuts in their husks; any more of a heavy crop are round lumps
	catkinsFine: 1500, // next year's closed catkins drawn in summer; past them not drawn
	woodMost: 70000, // the triangles its wood may take at full detail: past them its thinnest shoots are not drawn
	leavesMost: 12000, // the leaves it may carry at full detail: past them a share is kept, each grown to fill the gap
};

/** a year's season: the year, `s` 0 … 1 through it */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year };
};
/** how much of a year's extension is grown, `dt` years into that year (from bud break to mid July) */
const extension = (dt, first) => (first ? table(dt, [[0.16, 0], [0.2, 0.08], [0.28, 0.4], [0.4, 0.85], [0.5, 1]]) : span(dt, TREE.leafOut, TREE.stop));

/**
 * The tree's axes at time t: each a polyline as far as grown, its nodes (where its leaves, buds, catkins and female
 * flowers are), the year each part grew in, and the axes it bears. Every axis and node draws its own chance, so the
 * tree at an earlier t is the first part of the tree at a later one.
 */
function axes(seed, t, base) {
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.07);
	const lean = (() => {
		const r = chance(seed, 'lean');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.03 + r() * 0.05);
	})();

	const grow = (key, from, dir, born, order, vigour, kind, parent, at, most = 99) => {
		if (t < born + (kind === 'trunk' ? 0.16 : TREE.leafOut)) return null;
		// short shoots live three or four years, then die in the shade of the crown and are shed; so do weak twigs
		if (kind === 'short' && t > born + P.shortLife + chance(seed, 'life', ...key)() * 1.5) return null;
		if (kind === 'long' && order >= 3) {
			const dies = born + P.twigLife + chance(seed, 'life', ...key)() * 3;
			// a twig of the grown tree dies only in the shade inside its crown; out in the light it lives on and branches
			if (t > dies && (dies < ADULT.from || shaded(from, t))) return null;
		}
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, kind, parent, at, pts: [from.clone()], years: [born], nodes: [], kids: [], vigour, dir0: dir.clone() };
		all.push(ax);
		const d = dir.clone().normalize();
		const outward = from.clone().setY(0);
		let node = 0;
		let years = 0;
		for (let y = born; y <= Math.floor(t) && years < most; y++, years++) {
			const ageAxis = y - born;
			const first = kind === 'trunk' && y === 0;
			let len = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * about(r, 1, 0.12) * vigourTree;
			if (y >= ADULT.from && kind !== 'sucker') {
				// the grown tree: its yearly shoots (ADULT.vigour), and none past the crown the grower keeps
				len *= straight(y, ADULT.vigour);
				const tip = ax.pts[ax.pts.length - 1];
				const prev = ax.pts[Math.max(0, ax.pts.length - 3)];
				// a shoot bowed down under its own weight and crop grows on no more, its upper buds taking over; the low
				// ones the grower cuts away, to keep the ground under the crown clear for the harvest
				if (order >= 2 && (tip.y - prev.y < -0.6 * tip.distanceTo(prev) || tip.y < FORM.grown.skirt)) break;
				// a tip past the crown kept (a dome over its height) is headed back each winter: it grows only a short
				// shoot, its buds below breaking instead
				const H = straight(y, FORM.grown.height), R = straight(y, FORM.grown.reach);
				const reach = tip.y < H * 0.5 ? R : R * Math.sqrt(Math.max(0, 1 - Math.pow((tip.y - H * 0.5) / (H * 0.5), 2)));
				if (tip.y > H || Math.hypot(tip.x, tip.z) > reach) len *= 0.3;
			}
			if (kind === 'trunk' && y === 1) len *= 1.6;
			if (kind === 'sucker') len = between(r, 0.3, 0.75);
			if (len < 0.025) break;
			const f = extension(t - y, first);
			if (f <= 0) break;
			const step = first && t < 0.4 ? 0.004 : 0.025;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (kind === 'trunk' || kind === 'sucker') d.add(v3(lean.x * 0.1 + about(r, 0, 0.04), 0.3, lean.z * 0.1 + about(r, 0, 0.04)));
				else {
					// a limb keeps near the angle it set out at, rising a little; a side shoot rises at first and then
					// its tip nods outward and down, more as it lengthens and bears
					// (the grown tree's shoots reach up for the light over a crown that has closed: more upright, less bowed)
					const adult = y >= ADULT.from;
					const up = (order === 1 ? 0.016 : 0.012) + (adult ? FORM.grown.up : 0);
					const sag = (order === 1 ? 0.004 : 0.011 * order) * Math.min(4, ageAxis + 1) * (walked / Math.max(0.05, len) + ageAxis * 0.45) * (adult ? ADULT.sag : 1);
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(order === 1 ? 0.008 : 0.004) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, order === 1 ? 0.1 : 0.05);
					d.add(v3(about(r, 0, 0.05) + out.x, up - sag, about(r, 0, 0.05) + out.z));
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				const gap = kind === 'trunk' && y === 0 ? 0.028 : TREE.internode * (order >= 3 ? 0.85 : 1);
				while (node * gap < (ax.nodeBase ?? 0) + walked) {
					const within = node * gap - (ax.nodeBase ?? 0);
					const u = within / len;
					const start = first ? 0.2 : TREE.leafOut + 0.01;
					ax.nodes.push({ i: node, year: y, u, s: node * gap, formed: y + start + (TREE.stop - start) * Math.pow(clamp(u), 1.2) * 0.9 });
					node++;
				}
			}
			ax.nodeBase = (ax.nodeBase ?? 0) + grown;
			if (f < 1) break;
		}
		ax.tipYear = ax.years[ax.years.length - 1];
		const pathLen = [0];
		for (let i = 1; i < ax.pts.length; i++) pathLen.push(pathLen[i - 1] + ax.pts[i].distanceTo(ax.pts[i - 1]));
		ax.len = pathLen[pathLen.length - 1];
		ax.pathLen = pathLen;
		// the leaves in two rows: on a leaning shoot to its left and right, on an upright one turning slowly round it
		const r2 = chance(seed, 'phyllo', ...key);
		const phase = r2() * Math.PI * 2;
		for (const n of ax.nodes) {
			const p = pointAt(ax, n.s);
			n.at = p.at;
			n.dir = p.dir;
			const flat = p.dir.clone().setY(0);
			const level = flat.length() > 0.35;
			const sideSign = n.i % 2 ? 1 : -1;
			if (level) {
				flat.normalize();
				n.side = v3(-flat.z, 0, flat.x).multiplyScalar(sideSign).add(v3(0, 0.15, 0)).normalize();
			} else n.side = across(p.dir).applyAxisAngle(p.dir, phase + n.i * Math.PI + n.i * 0.12);
		}
		if (kind === 'trunk') {
			// headed in its second winter (a tree at 60 cm, a bush to the ground); the buds under the cut grow into
			// the limbs of an open vase, or the stems of the bush
			const cut = TREE.depth + FORM.head;
			if (t > 1.9 && ax.len > cut) {
				const keep = [];
				for (let i = 0; i < ax.pts.length && pathLen[i] <= cut; i++) keep.push(i);
				const end = pointAt(ax, cut).at;
				ax.pts = keep.map((i) => ax.pts[i]).concat([end]);
				ax.years = keep.map((i) => ax.years[i]).concat([ax.years[keep[keep.length - 1]]]);
				ax.pathLen = keep.map((i) => pathLen[i]).concat([cut]);
				ax.len = cut;
				ax.nodes = ax.nodes.filter((n) => n.s < cut);
				ax.pruned = true;
			}
			const rr = chance(seed, 'scaffolds');
			const turn0 = rr() * Math.PI * 2;
			for (let i = 0; i < FORM.limbs; i++) {
				const s = cut - 0.02 - i * FORM.apart * about(rr, 1, 0.2);
				if (t < 2 || s > ax.len) continue;
				const bearing = turn0 + (i * Math.PI * 2) / FORM.limbs + about(rr, 0, 0.3);
				const p = pointAt(ax, s);
				const side = v3(Math.cos(bearing), 0, Math.sin(bearing));
				const tilt = FORM.angle * about(rr, 1, 0.12);
				const d0 = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt)).normalize();
				const k = grow([...key, 'limb', i], p.at, d0, 2, 1, about(rr, 1, 0.08) * FORM.vigour, 'long', ax, s);
				if (k) ax.kids.push(k);
			}
			// the suckers of this year from the foot of the trunk, cut away each winter
			const year = Math.floor(t);
			if (year >= 1) {
				const rs = chance(seed, 'suckers', year);
				const n = 1 + Math.floor(rs() * 3);
				for (let i = 0; i < n; i++) {
					const a = rs() * Math.PI * 2;
					const out = v3(Math.cos(a), 0, Math.sin(a));
					const from = base.clone().add(v3(0, TREE.depth * 0.5, 0)).addScaledVector(out, 0.03 + 0.06 * clamp(t / 6));
					const d0 = UP.clone().addScaledVector(out, between(rs, 0.25, 0.6)).normalize();
					const k = grow(['sucker', year, i], from, d0, year, 2, 1, 'sucker', ax, 0.01, 1);
					if (k) ax.kids.push(k);
				}
			}
			return ax;
		}
		if (kind === 'sucker') return ax;
		// lateral buds: the next spring each breaks into a long shoot, a short one, or stays asleep (a catkin, a
		// female flower, or nothing)
		for (const n of ax.nodes) {
			if (n.year + 1 > t - TREE.leafOut) continue;
			const br = chance(seed, 'bud', ...key, n.i);
			const yearLen = TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(n.year - born, TREE.fade.length - 1)];
			const u = n.u;
			const roll = br();
			const side = n.side;
			const below = side.y < -0.5 ? 0.3 : 1;
			// a bush's stems are bare low down: shaded by each other, and cleared for the harvest
			if (FORM.bareBelow && order === 1 && n.at.y < FORM.bareBelow) continue;
			// a short shoot carries on at most from its tip; a long one breaks near its top, little below
			const isShort = kind === 'short';
			let pLong = isShort || order >= 5 ? 0 : (u > 0.75 ? P.long[0] : u > 0.45 ? P.long[1] : u > 0.2 ? P.long[2] : 0) * clamp(yearLen / 0.15) * below * (order === 1 ? 1.4 : 1);
			const pShort = isShort ? (u > 0.6 ? P.shortOfShort : 0) : u > 0.15 && u < 0.95 ? P.short : 0.03;
			// the grown tree's buds break into long shoots less often: a closed crown makes fewer, shorter new shoots
			if (n.year >= ADULT.from) pLong *= FORM.grown.long;
			if (roll < pLong) {
				const angle = lerp(0.95, 0.6, u) * about(br, 1, 0.15);
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const vig = vigour * lerp(0.5, 0.9, u) * about(br, 1, 0.15);
				const k = grow([...key, n.i], n.at, d0, n.year + 1, order + 1, vig, 'long', ax, n.s);
				if (k) ax.kids.push(k);
			} else if (roll < pLong + pShort) {
				// a short shoot: a few centimetres and three to five leaves in its year, little more after
				const angle = about(br, 0.8, 0.2);
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const k = grow([...key, n.i, 's'], n.at, d0, n.year + 1, Math.max(order + 1, 4), between(br, 0.35, 0.7), 'short', ax, n.s, 3);
				if (k) ax.kids.push(k);
			}
		}
		return ax;
	};
	const trunk = grow(['trunk'], base.clone(), v3(0, 1, 0), 0, 0, 1, 'trunk', null, 0);
	return { all, trunk };
}

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
 * How thick each axis is along it: the pipe model — the wood at a place as thick as all it feeds beyond it taken
 * together, r^2.5 summed — and every year it stands the cambium lays on another ring. Calibrated to an orchard
 * 'Tonda Gentile': the trunk about 2 cm in its second year, 6 cm in its fifth, 10–12 cm in its eighth.
 */
const PIPE = 2.5;
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1) * (k.kind === 'sucker' ? 0.3 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(TREE.tipRadius, PIPE) + acc + TREE.pipeLength * beyond;
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		ax.r2[i] = Math.pow(q * (1 + TREE.ring * woodAge), 2 / PIPE);
	}
}

/** the tree's wood drawn: every axis a tube, its bark by the age and girth of each part of it */
function wood(bag, ax, t, ns, sunDir) {
	const n = ax.pts.length;
	if (n < 2) return;
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
	// seen from afar the year's thin shoots are lost among their leaves: left out
	if (DETAIL.level < 0.5 && !isTrunk && R0 < (0.0016 + 0.004 * (0.5 - DETAIL.level)) * (DETAIL.old ? 2 : 1)) return;
	const step = (DETAIL.old && !isTrunk ? 1.8 : 1) * (isTrunk ? clamp(R0 * 0.16, 0.004, 0.03) : R0 > 0.014 ? clamp(R0 * 0.6, 0.008, 0.04) : clamp(R0 * 1.4, R0 < 0.004 ? 0.03 : 0.014, 0.07));
	const pts = [];
	const count = Math.max(2, Math.ceil(total / step));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	// past its seedling years, its rings where it bends or changes girth, not every centimetre or two: a ring kept where
	// the wood leaves the straight line between its neighbours by a share of its radius, and at least every few girths
	// (the stems keep their fine rings to above the eye: their foot, the peeling bark and the lenticels are read there)
	if (t >= 2) {
		const from = isTrunk ? pts.findIndex((p, k) => (k / count) * total > TREE.depth + 2.2) : 0;
		if (from >= 0) pts.splice(from, pts.length - from, ...spare(pts.slice(from), clamp(R0 * 0.7, 0.003, 0.025), isTrunk ? 0.25 : clamp(R0 * 16, 0.2, 0.6)));
	}
	// and as many sides as its girth shows: three on a shoot a pencil thick, to twenty-four on the stems
	const sides = isTrunk && t < 1 ? 8 : t < 2 ? Math.round(clamp(R0 * (R0 > 0.014 ? 1000 : 520), R0 < 0.003 ? 4 : 5, 64)) : isTrunk ? Math.round(clamp(R0 * 250, 6, 24)) : R0 < 0.006 ? 3 : R0 < 0.015 ? 4 : R0 < 0.03 ? 5 : R0 < 0.05 ? 7 : 9;
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		// the epicotyl of the first spring: 2 mm, thickening through the summer
		if (isTrunk && t < 0.8) r *= lerp(0.45, 1, smooth((t - 0.15) / 0.65));
		if (isTrunk) {
			// the foot of the trunk spreading into its roots, in low buttresses
			const ground = s - TREE.depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.08);
			r *= 1 + 0.5 * clamp(t / 4) * flare * (0.75 + 0.35 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			// where the limbs leave the headed trunk it swells into a knot
			if (ax.pruned) r *= 1 + 0.18 * smooth((s - (TREE.depth + FORM.head * 0.6)) / (FORM.head * 0.35));
		}
		if (s < r * 2.2 && ax.parent && ax.kind !== 'sucker') r *= 1 + 0.25 * (1 - s / (r * 2.2)); // the branch collar
		return r * (1 + barkRelief(r, v, s, nsAx));
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - 0.2;
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const low = isTrunk ? 1 - smooth((s - TREE.depth) / 0.5) : 0;
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx, low);
		if (isTrunk && t < 0.8) {
			// the seedling's stem: pale where it is still under the soil
			if (s < TREE.depth) c.lerp(mix('#ece4c8', '#c9c08a', s / TREE.depth), 1 - clamp((t - 0.5) / 0.3));
			// the young epicotyl above it reddish brown, hairy
			else c.lerp(mix('#8a4a32', '#6e6a3a', clamp((s - TREE.depth) / 0.15)), 1 - clamp((t - 0.6) / 0.4));
		}
		if (isTrunk && s < TREE.depth + 0.01) c.lerp(new THREE.Color(HZ.root.old), clamp((TREE.depth + 0.01 - s) / 0.03) * clamp(t));
		return c;
	};
	const geo = tube(pts, radius, paint, sides, isTrunk || t < 2 || Math.sqrt(ax.r2[n - 1]) > 0.008);
	bag.add(R0 < 0.005 && !isTrunk ? 'twig' : 'bark', geo);
	return geo.index.count / 3;
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

/**
 * The roots: from the nut the radicle goes down; a hazel's taproot soon gives way to many strong roots spreading
 * wide in the top 40 cm, the most of them within 60 cm of the surface.
 */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.05, -1, 0.02),
		length: 0.9,
		grown: table(t, [[0.1, 0], [0.13, 0.025], [0.17, 0.07], [0.4, 0.17], [1, 0.4], [2, 0.65], [4, 0.9], [6, 1]]),
		radius: 0.001 + 0.02 * span(t, 0.5, 6),
		down: 0.03,
		wander: 0.14,
		laterals: 8,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.3, 3),
		young: HZ.root.young,
		old: HZ.root.old,
	});
	const count = 11;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.25 + i * 0.22;
		const bear = i * 2.39996 + rr() * 0.5;
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.012, -0.01 - rr() * 0.06, Math.sin(bear) * 0.012)),
			dir: v3(Math.cos(bear), -0.06 - rr() * 0.1, Math.sin(bear)),
			length: between(rr, 1.5, 2.6),
			grown: (t - born) / 5,
			radius: 0.0013 + 0.032 * span(t, born + 0.5, 7.5) * between(rr, 0.6, 1),
			down: 0.01,
			wander: 0.17,
			laterals: 6,
			lateral: 0.32,
			depth: 2,
			taper: 0.8,
			age: (t - born - 0.4) / 3,
			young: HZ.root.young,
			old: HZ.root.old,
			floor: -0.5,
		});
	}
}

/* ---- what a year puts on the wood ---- */

/**
 * The catkins and female flowers a node of `year`'s growth bears. Both form in that summer's leaf axils, mostly on
 * the upper half of the year's shoots and on short shoots: catkins one to four together, on a short stalk; female
 * flowers in buds like leaf buds. They flower the next January–February, before the leaves.
 */
function nodeFlowers(seed, ax, n, treeYearOfFlowering) {
	const r = chance(seed, 'flowers', ...ax.key, n.i);
	const short = ax.kind === 'short';
	const upper = n.u > 0.3 || short;
	// (from its ninth winter the grown crown flowers on more nodes than it can fill: a node bears a little less often,
	// so the crop stays near the 3–4 kg a grown plant gives at 500 a hectare)
	const able = treeYearOfFlowering >= TREE.firstFlowers ? (treeYearOfFlowering > ADULT.from ? ADULT.flowers : 1) : treeYearOfFlowering >= TREE.firstFlowers - 1 ? 0.25 : 0;
	const male = able > 0 && upper && r() < 0.18 * able * (short ? 1.3 : 1) ? 1 + Math.floor(r() * (r() < 0.5 ? 2 : 4)) : 0;
	const female = able > 0 && upper && r() < 0.13 * able * (short ? 1.5 : 1);
	return { male, female, r };
}

/**
 * A catkin's life, `T` years from the 1st of February after the summer it formed in: it starts in mid May and shows
 * in June, grows to 1.5–3 cm by autumn, lengthens and sheds its pollen from the end of December to mid January,
 * browns and drops.
 */
function catkinState(T) {
	if (T < -0.71 || T > 0.06) return null;
	return { g: span(T, -0.71, -0.45), open: span(T, -0.11, -0.08), spent: span(T, -0.045, 0.02) };
}

/** a female flower's bloom by `T`: its stigmas out from mid January to the end of February, then withered */
const bloomOf = (T) => (T < -0.055 || T > 0.12 ? 0 : clamp((T + 0.055) / 0.16));

/** the crop through its season `s`: husk and nut grown, the shell browning, the husk drying */
const cropOf = (s) => ({
	husk: span(s, 0.12, 0.4),
	// the nut's size, as the cube root of its measured volume: 5 % on the 3rd of June, 87 % on the 23rd, 90 % on
	// the 4th of July, all of it by mid August (Valentini et al. 2015, Cravanzana)
	nut: straight(s, [[0.3, 0], [0.335, 0.37], [0.36, 0.72], [0.39, 0.955], [0.42, 0.966], [0.46, 0.985], [0.54, 1]]),
	brown: span(s, 0.48, 0.545),
	dry: span(s, 0.5, 0.585),
});

/** how many nuts a cluster grows: two or three most often, one or four now and then; some set nothing */
function nutsOf(r) {
	const x = r();
	return x < 0.2 ? 0 : x < 0.32 ? 1 : x < 0.64 ? 2 : x < 0.92 ? 3 : 4;
}

/**
 * The whole hazel at time t (years from the February its nut germinates): the nut, the roots, the wood, and what the
 * season puts on it — catkins and red stigmas in winter, leaves from April, clusters of nuts in their husks from
 * June to late August, yellow leaves in October.
 */
/** what the last tree grown bore, counted, for checking it against the real numbers */
const STATS = {};
function hazelTree(t, seed) {
	// past its eighth year the tree is drawn more cheaply (its budget: a crown twice as big, twice the crop); at a
	// lower detail (a world's far trees) fewer of its leaves, each larger, and its finest shoots left out
	if (t > ADULT.from && !DETAIL.old) {
		const k = DETAIL.level < 1 ? straight(t, [[8, 1], [12, 0.6], [20, 0.4]]) : 1;
		return lite({ old: true, thin: DETAIL.thin * k }, () => hazelTree(t, seed));
	}
	for (const k of Object.keys(STATS)) delete STATS[k];
	// from its fourth year a hazel carries thousands of leaves: each cut out of its picture (`cutLeaf`)
	CUT = t >= 3;
	CLUSTERS = 0;
	const count = (k, n = 1) => (STATS[k] = (STATS[k] ?? 0) + n);
	const bag = new Bag();
	const { year, s } = seasonOf(t);
	const base = v3(0, -TREE.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();

	// the nut, sown in October, through the winter in the soil; it splits at its scar in March as the root comes out
	if (t < 1.1) sownNut(bag, base.clone().add(v3(0.006, -0.004, 0)), seed, span(t, 0.1, 0.15));
	// (under the soil: once the tree is up they are drawn coarsely)
	lite(t > 1.5 ? { level: Math.min(DETAIL.level, t > 6 ? 0.2 : 0.3) } : {}, () => roots(bag, seed, t, base.clone().add(v3(0.006, -0.004, 0))));

	// hypogeal: the seed leaves stay in the shell under the soil; the reddish shoot rises straight from it, its first
	// two or three leaves mere scales
	const { all, trunk } = axes(seed, t, base.clone().add(v3(0.004, 0.002, 0)));
	if (!trunk) return bag.build();
	thicken(trunk, t);
	const ns = hashText(seed) % 997;
	// the thickest first: whatever the seed, the wood stays within its ceiling (TREE.woodMost)
	let woodTris = 0;
	for (const ax of [...all].sort((a, b) => b.r2[0] - a.r2[0])) {
		if (woodTris > TREE.woodMost && ax.kind !== 'trunk') continue;
		woodTris += wood(bag, ax, t, ns, sunDir) ?? 0;
	}
	// and its leaves within theirs (TREE.leavesMost, at full detail): a share kept, each grown to fill the gap
	const { s: s0 } = seasonOf(t);
	let leaves = 0;
	if (s0 >= TREE.leafOut && s0 < TREE.leafFall[1]) for (const ax of all) for (const n of ax.nodes) if (n.year === Math.floor(t) && t >= n.formed) leaves++;
	const thin0 = DETAIL.thin;
	if (leaves > TREE.leavesMost) DETAIL.thin *= TREE.leavesMost / leaves;
	const space = bag.space;
	for (const ax of all) {
		if (ax.pts.length < 2) continue;
		const R = (u) => Math.sqrt(ax.r2[Math.min(ax.r2.length - 1, Math.round(u * (ax.r2.length - 1)))]);
		space.rod(ax.pts, (u) => R(u) + 0.002);
	}

	const leafSize = (y) => (y < 1 ? 0.55 : y < 2 ? 0.8 : 1);
	const fall = span(s, TREE.leafFall[0], TREE.leafFall[1]);
	const lit = (at) => clamp(0.3 + at.y * 0.1 + Math.hypot(at.x, at.z) * 0.12);
	const crop = cropOf(s);
	const ground = [];

	// first the clusters and the catkins, then the leaves
	for (const ax of all) {
		const tipR = Math.sqrt(ax.r2[ax.r2.length - 1]);
		for (const n of ax.nodes) {
			const side = n.side;
			const surf = n.at.clone().addScaledVector(side, Math.max(tipR, 0.0015));
			// what last year's node bears this year, and what this year's will bear next year
			for (const which of [year - 1, year]) {
				if (n.year !== which) continue;
				const fl = nodeFlowers(seed, ax, n, which + 1);
				const T = t - (which + 1);
				if (t < n.formed + 0.04) continue;
				if (fl.male) {
					const cs = catkinState(T);
					if (cs)
						for (let k = 0; k < fl.male; k++) {
							const kr = chance(seed, 'catkin', ...ax.key, n.i, k);
							const out = side.clone().applyAxisAngle(n.dir, (k - (fl.male - 1) / 2) * 0.6).addScaledVector(n.dir, 0.3).normalize();
							// (next year's closed catkins, 2–3 cm, past TREE.catkinsFine of them not drawn: the tree's triangles hold whatever the seed)
							if (!(CUT && !DETAIL.fruit && cs.open < 0.2 && ++CATKINS > TREE.catkinsFine)) catkin(bag, surf, out, { ...cs, r: kr });
							count('catkins');
						}
				}
				if (!fl.female) continue;
				const fdir = side.clone().addScaledVector(n.dir, 0.9).add(v3(0, 0.3, 0)).normalize();
				if (T < 0.14) {
					// through the summer the female bud is hidden under the leaves; drawn from leaf fall to its flowering
					if (T > -0.3 || T < -0.95) femaleFlower(bag, surf, fdir, bloomOf(T), fl.r);
					count('female');
					continue;
				}
				// the flowered bud grows into a short leafy shoot with the cluster at its end
				if (which !== year - 1 || s > 0.64) continue;
				const kr = chance(seed, 'set', ...ax.key, n.i);
				const n0 = nutsOf(kr);
				const pedLen = 0.025 + kr() * 0.03;
				const pdir = fdir.clone().lerp(v3(0, -1, 0), 0.15 + 0.5 * crop.nut).normalize();
				const start = surf.clone().addScaledVector(pdir, pedLen * lerp(0.3, 1, crop.husk));
				// the leaves of the little shoot under the cluster
				if (s > TREE.leafOut && fall < 1)
					for (let k = 0; k < 2; k++) {
						const lr = chance(seed, 'cluster-leaf', ...ax.key, n.i, k);
						const lo = across(pdir).applyAxisAngle(pdir, k * Math.PI + lr() * 0.5).addScaledVector(pdir, 0.3).normalize();
						leaf(bag, surf.clone().lerp(start, 0.35 + 0.4 * k), lo, { age: clamp((s - TREE.leafOut) / 0.08), fall, size: 0.75 * about(lr, 1, 0.1), r: lr, sun: lit(surf) });
					}
				bag.add('twig', tube([surf, surf.clone().lerp(start, 0.5).add(v3(0, 0.003, 0)), start], () => 0.0013, () => mix('#7a6a3e', '#6c4a32', crop.husk), 3));
				if (n0 === 0) {
					// a cluster that set nothing: the husks stay small and drop
					if (s < 0.38) cluster(bag, start, pdir, { n: 2, nutG: 0, huskG: crop.husk * 0.35, brown: 0, dry: 0, seedKey: seed, key: [...ax.key, n.i].join('|'), res: false });
					continue;
				}
				// where the cluster hangs is found for the size it will reach, so it swells where it hangs
				const ripeR = HZ.nut.width * (n0 === 1 ? 0.75 : 1.15);
				const shape = (a2, d2) => [{ c: a2.clone().addScaledVector(d2, ripeR * 1.1), r: ripeR }];
				const place = space.settle(start, pdir.clone().lerp(v3(0, -1, 0), 0.4).normalize(), shape, 0.012, 0.02) ?? { at: start, dir: pdir };
				const key = [...ax.key, n.i, 'cluster'];
				const fallen = [];
				for (let k = 0; k < n0; k++) fallen.push(s > between(chance(seed, 'drop', ...key, k), 0.555, 0.62));
				const res = DETAIL.fruit === key.join('|');
				bag.fruit(key, start, place.dir);
				if (place.at.distanceTo(start) > 1e-4) bag.add('twig', tube([start, place.at], () => 0.0012, () => '#6c5a36', 3));
				// (past TREE.clustersFine of a heavy crop, one round lump each: the tree's triangles hold whatever the seed)
				const nuts = lite(!res && ++CLUSTERS > TREE.clustersFine ? { level: Math.min(DETAIL.level, 0.3) } : {}, () => cluster(bag, place.at, place.dir, { n: n0, nutG: crop.nut, huskG: crop.husk, brown: crop.brown, dry: crop.dry, fallen, seedKey: seed, key: key.join('|'), res }));
				bag.fruitDone();
				count('clusters');
				count('nuts', n0);
				for (let k = 0; k < n0; k++) if (fallen[k]) ground.push({ at: nuts[k].at, key: `${key.join('|')}|${k}` });
			}
		}
	}

	// the leaves of this year's shoots, in two rows
	const leafy = s > TREE.leafOut && fall < 1;
	for (const ax of all) {
		const tipR = Math.sqrt(ax.r2[ax.r2.length - 1]);
		for (const n of ax.nodes) {
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const surf = n.at.clone().addScaledVector(n.side, Math.max(tipR, 0.0015));
			const budDir = n.side.clone().addScaledVector(n.dir, 0.8).normalize();
			if (n.year === year && t >= n.formed && leafy) {
				const age = clamp((t - n.formed) / 0.07);
				const first = ax.kind === 'trunk' && n.year === 0;
				// the first three or four leaves of the seedling are scales, then small leaves, growing node by node
				if (first && n.i < 3) continue;
				const scale = first ? Math.min(1, 0.32 + 0.08 * n.i) : ax.kind === 'short' ? 0.82 : ax.kind === 'sucker' ? 0.9 : 1;
				const size = leafSize(year) * scale * about(nr, 1, 0.1);
				leaf(bag, surf, n.side, { age, fall, size, r: nr, sun: lit(surf), up: n.side.y });
				count('leaves');
				if (s > 0.6) bud(bag, surf.clone().addScaledVector(n.side, -0.0005), budDir, 0, nr);
			} else if (n.year === year && (s > TREE.leafFall[1] || s < TREE.leafOut) && t > n.formed) {
				// winter: the buds left on this year's shoots
				const fl = nodeFlowers(seed, ax, n, year + 1);
				if (!fl.female) bud(bag, surf, budDir, clamp((s - 0.9) / 0.1), nr);
			}
		}
	}

	// the nuts fallen under the tree, where they dropped, rolled a little
	for (const g of ground) {
		const r = chance(seed, 'rolled', g.key);
		const at = v3(g.at.x + about(r, 0, 0.25), 0, g.at.z + about(r, 0, 0.25));
		fallenNut(bag, at, seed, g.key);
	}
	DETAIL.thin = thin0;
	return bag.build();
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Thirteen stages, from the nut to ripe nuts; `t` the years from the February the nut germinates (between two stages,
 * on the way). Stages 5–9 are one year of the tree in its eighth: catkins in February, the nuts set in June, ripe and
 * falling at the end of August. Stages 10–12 are the plant grown on, each at the 20th of August of its year: in full
 * bearing in its twelfth, grown in its sixteenth and twentieth. The default stays the eighth year's ripe nuts (RIPE).
 */
const STAGES = [
	{ name: 'Nut', t: -0.33, note: "October: a ripe nut, about 18.5 × 19.5 × 17 mm and 2.3 g, sown 2.5 cm deep and chilled through the winter, as a hazel needs before it will germinate." },
	{ name: 'Germination', t: 0.21, note: 'Mid April: the shell has split at its scar; the white root has gone down and the reddish shoot is just through the soil, its first leaves mere scales. The seed leaves stay in the shell (hypogeal).' },
	{ name: 'Seedling', t: 0.45, note: "July of its first summer: a hairy shoot 15–30 cm tall, a few round, doubly toothed leaves 3–6 cm in two rows, the nut still at its foot. A seedling does not come true to its cultivar ('Tonda Gentile' is self-incompatible): orchards plant rooted layers from mother stools; the seedling stands for one here." },
	{ name: 'Whip', t: 1.5, note: 'Its second summer: a single stem about 80 cm, suckers coming up at its foot (cut away). That winter it is headed: at 55 cm for a tree, to the ground for a bush.' },
	{ name: 'Young tree', t: 3.45, note: 'Fourth summer: four limbs (or five stems) rising at 20–35° from upright, their shoots in flat sprays; the first catkins forming for next winter.' },
	{ name: 'Catkins', t: 6.96, note: 'Its eighth winter, mid January, the tree bare: pale yellow catkins 3–8 cm hang in twos to fours and shed their pollen on the wind (TGL sheds early, from the end of December); the female flowers, buds like leaf buds, push out tufts of crimson stigmas 2–5 mm long.' },
	{ name: 'Nut set', t: 7.36, note: 'Mid June: four to five months after pollination the ovules are fertilised at last and the nuts grow fast, from 5 % of their size on the 3rd of June to 87 % by the 23rd; clusters of two or three, each nut in its own green husk. The catkins for next winter are already showing.' },
	{ name: 'Green nuts', t: 7.45, note: 'Mid July: the nuts at full size, the shells still pale green-cream and soft, each in a green, jagged husk longer than itself; the kernels filling.' },
	{ name: 'Turning', t: 7.51, note: 'Early August: the shells turn tan, then light brown, from the tip; the husks yellow and their teeth brown.' },
	{ name: 'Ripe', t: 7.555, note: "20th of August: ripe 'Tonda Gentile delle Langhe', round, about 2.3 g, the shell thin (1.1 mm), light brown with darker stripes and a pale felted tip, the kernel 46–49 % of its weight. They fall free of their dry husks from the 10th to the 25th of August and are gathered from the ground. About 1.35 kg a tree at this age, 1.5–2 t a hectare grown." },
	{ name: 'Full bearing · 12th year', t: 11.555, note: "The 20th of August of its twelfth year, the nuts ripe and falling: in full bearing (8–15 years on). The tree about 4.3 m high and 4.6 m across on a trunk about 14 cm thick, its four limbs grown long over a crown that has closed; the bush about 4.4 m high and 5.1 m across on its five stems. About 1,100 nuts on the tree (2.5 kg) and 1,600 on the bush (3.6 kg); a grown plant gives 3–4 kg at 500 a hectare." },
	{ name: 'Grown · 16th year', t: 15.555, note: "Its sixteenth August: its yearly shoots short now, the tips the grower heads back each winter branching below the cut, the low and bowed-down shoots cut away to keep the ground clear for the harvest, the twigs in the shaded middle dead and shed, the leaves on the outer metre of the crown. The tree about 5–5.4 m high and 5.3 m across, its trunk about 17 cm; the bush 5.1 by 5.7 m. About 1,200–1,300 nuts each." },
	{ name: 'Grown · 20th year', t: 19.555, note: "Its twentieth August, a grown hazel: the tree about 5.6–6 m high and 5.7 m across, a flat-topped vase on a smooth silvery trunk about 22 cm thick (a hazel trained on one trunk grows to 6–8 m); the bush about 5.6 m high and 6 m across (4–6 m grown). About 1,400–1,500 nuts. It goes on bearing to 25–30 years; then an orchard is cut back hard or replanted." },
];

/** the years at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => hazelTree(timeAt(stage), `${seed ?? 'maia'}`);
/** the stage shown by default: the eighth year's ripe nuts */
const RIPE = 9;

/* ---- the fruit view: one cluster on its own ---- */

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

/** the clusters the tree bears in green nut (all there, none fallen), and which of the full ones the seed picks */
function ripePick(seed, stage = RIPE) {
	// in green nut: the eighth year's, or for an older stage its own year's (mid July of it)
	const T = timeAt(stage);
	const at = T > ADULT.from ? Math.floor(T) + (STAGES[7].t - Math.floor(STAGES[7].t)) : STAGES[7].t;
	const { plant, fruits } = lite({ roots: false }, () => pickFruit(() => hazelTree(at, `${seed ?? 'maia'}`)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f), parts: f.parts.length }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.parts));
	const good = sized.filter((f) => f.parts >= Math.min(most, 6));
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one cluster at a stage, on its own: its stalk at the origin, hanging down −Y, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed, stage);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant bears no nuts.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This cluster has not set yet.');
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
	id: 'hazel',
	label: "Hazel 'Tonda Gentile delle Langhe' · Corylus avellana",
	latin: "Corylus avellana L. 'Tonda Gentile delle Langhe' (syn. 'Tonda Gentile Trilobata') · Nocciola Piemonte IGP · Haselnuss",
	note: "Corylus avellana 'Tonda Gentile delle Langhe', the round hazelnut of the Langhe in Piedmont (Nocciola Piemonte IGP), held the finest for confectionery. Grown as an open vase of four limbs on a short trunk; round, toothed, heart-based leaves in two rows along flat sprays of shoots; yellow catkins and crimson-tufted female flowers on the bare wood in winter; round nuts in twos and threes, each in a jagged green husk about as long as itself, ripe and falling at the end of August.",
	from: 'Tree or bush · 8 years from the nut (to 20 in its older stages)',
	forms: {
		tree: 'Tree (monocaule): an open vase of four limbs on a 60 cm trunk, as the newer orchards of Piedmont grow it.',
		bush: 'Bush (cespuglio): five long stems from the ground, leaning out, as the Langhe has grown its hazels for generations.',
	},
	layer: 'sub-canopy',
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right; measured where marked in the note, the rest interpolated
	facts: {
		height: { at1: [0.15, 0.3], at3: [1.8, 2.3], at5: [2.6, 3.0], at8: [3.2, 3.6], at12: [3.8, 4.2], at20: [4.5, 6], grownBush: [4, 6], grownTree: [6, 8], unit: 'm, years from the nut' }, // grown sizes of the species (Trees and Shrubs Online; RHS)
		trunk: { at8: [0.075, 0.085], bushStem12: [0.065, 0.08], unit: 'm diameter at 30 cm' },
		crown: { at8: [2.8, 3.2], at12: [3.2, 3.8], at20: [4.5, 5.5], unit: 'm wide' },
		spacing: [5, 4], // 5 × 4 m (500 a hectare) to 6 × 6 m (278)
		shade: 'full sun; tolerates light shade but bears less',
		climate: 'hills at 250–700 m, ≥ 800 mm rain; chill < 7 °C: catkins < 100 h, female flowers and leaf buds 760–860 h; damaged at −20 °C, stigmas at −10 °C; suffers above 30 °C; pH 6–7.8',
		years: { firstFlowers: [4, 5], firstCrop: [4, 5], fullBearing: [8, 15], productive: [25, 30] },
		leaf: { length: [0.05, 0.12], width: [0.04, 0.12], petiole: [0.006, 0.019], life: [0.62, 0.66], unit: 'm, years' },
		catkin: { closed: [0.015, 0.03], open: [0.03, 0.08], perNode: [1, 4], unit: 'm' },
		nut: { length: 0.0185, width: 0.0195, thick: 0.017, mass: 0.0023, shell: 0.0012, kernelShare: [0.46, 0.49], perCluster: [2, 3], husk: [1.2, 1.5], unit: 'm, kg; husk × the nut' },
		season: { pollen: ['end Dec', 'mid Jan'], stigmas: ['mid Jan', 'end Feb'], leafOut: '20 Mar', fertilised: 'early Jun', fullSize: '4 Jul', drop: ['10 Aug', '25 Aug'], leafFall: 'Nov' },
		yield: { tree6to7: 1.35, hectare: [1500, 2000], unit: 'kg in shell' },
		pollinizers: ["'Tonda Romana'", "'Daria'", "'Negret'", "'Pauetet'", "'UNITO-119'", "'UNITO-G1'", "'UNITO-3L'", "'Cosford'"],
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one cluster) */
function build(stage, seed, detail, fruit, variant) {
	FORM = FORMS[variant] ?? FORMS.tree;
	const make = fruit ? () => fruitView(stage ?? RIPE, `${seed ?? 'maia'}`) : () => grow(stage ?? RIPE, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'hazel' || (variant && !FORMS[variant])) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	const form = variant ?? 'tree';
	return {
		meta: {
			group: 'plants',
			id: 'hazel',
			version: v,
			label: PLANT.label,
			variant: form,
			form: PLANT.forms[form],
			latin: PLANT.latin,
			note: PLANT.note,
			from: PLANT.from,
			layer: PLANT.layer,
			stages: PLANT.stages,
			facts: JSON.parse(JSON.stringify(PLANT.facts)),
			params: JSON.parse(JSON.stringify(PARAMS)),
		},
		build: (stage, seed, detail, fruit) => build(stage, seed, detail, fruit, form),
	};
};

/** its lighter levels, built by the worlds as they are (L1, L2): the same plant at these details */
module.exports.levels = [{ values: { detail: 0.25 } }, { values: { detail: 0.1 } }];

/** the organs on their own, for checking them against photographs of the real thing */
module.exports.organs = { HZ, TREE, nutGeometry, huskGeometry, cluster, catkin, femaleFlower, leaf, bud, Bag, timeAt, hazelTree, axes, thicken, cropOf, STATS, pickFruit, grow };
