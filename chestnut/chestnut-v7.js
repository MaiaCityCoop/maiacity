'use strict';
/*
 * SWEET CHESTNUT 'BELLE ÉPINE' — Castanea sativa Mill. 'Belle Épine', a French marron-type chestnut of the Périgord and
 * the Limousin, one of the most planted pure C. sativa cultivars of Europe.
 * Version 3 of plants/chestnut: one named cultivar, grown from a nut to a bearing tree in its tenth summer — the nut a
 * seedling rootstock, grafted with 'Belle Épine' in its second spring, grown open in a grove as a central leader.
 *
 * Its numbers are the cultivar's where they are known (INRA's inventory, CA 114, in Bounous et al., FAO/ESCORENA
 * 2001: nut size code 2–1, 60–80 to the kilo, hardly striped, 1–8 % divided; the CTIFL/Invenio variety trial in the
 * Chambres d'agriculture Dordogne guide, 2015: semi-erect, longistaminate, drop 4–18 October; nursery sheets: male
 * catkins 20 June–2 July, female flowers 30 June–11 July, first nuts in the 5th–6th year) and the species' otherwise
 * (Conedera et al. 2016, European Atlas of Forest Tree Species; EUFORGEN guidelines; USDA Woody Plant Seed Manual;
 * Cuenca & Majada 2012; Maltoni et al., seedlings; Perulli et al. 2020, burr growth: ~20 mm at 27 days after female
 * bloom, 61 mm at 103): nut about 35 × 32 × 19 mm and 14 g, dark mahogany and satiny; germination hypogeal, the shoot
 * up in mid April; 25–60 cm the first year; leaves 16–22 × 5.5–7.5 cm, ~15 pairs of straight veins each ending in a
 * bristle-tipped tooth, petiole 1.3–2.5 cm; male catkins 12–18 cm, bisexual ones 8–12 cm with three female flowers in
 * each cup at their base; the burr 6–7 cm across its spines, splitting in four over its nuts
 * (one or two here; the species sets up to three). No height or girth
 * series of open-grown chestnuts is published: the sizes by age (about 6–7.5 m, a 16–20 cm stem and a 5–6 m crown in
 * its tenth year) are fitted to the few anchors there are (8 m in 12 years; 1–2 cm of girth a year; adult at 30 years,
 * 10–15 m).
 *
 * The file in four parts:
 *   1. GROWING      the shared core every plant grows through (chance, tubes, sheets, the Bag, Space, roots), as
 *                   cacao v3 carries it, with a `gloss` material for the polished shell and `fuzz` for the burr's
 *                   spines and the catkins.
 *   2. ORGANS       the chestnut's own organs, each to its measure: nut, bark, leaf, bud, catkin, burr.
 *   3. THE TREE     its axes year by year (sympodial shoots, the top buds breaking), its girth, its roots, its season.
 *   4. RECIPE       its stages, its params, the fruit view, and `module.exports.recipe`.
 *
 * Version 5 grows it on past its tenth year to a grown tree: three stages appended, 20, 35 and 50 years (10.5, 15
 * and 19.5 m), on the same clock: past the tenth year the upper crown's shoots climb, the crown keeps to a dome that rises and
 * spreads by age, a new shoot breaks only where there is light for it and shaded ones fall, the trunk keeps its rings,
 * and the side wood and leaves are drawn more sparingly.
 *
 * Everything in metres. Time `t` in years from germination (t = 0 the root coming out of the nut, early April); a
 * year's `season` 0 … 1 from 1 April round to the next.
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

/**
 * The materials, made once. `bark` old wood, matt; `twig` young wood, its skin glossy; `leaf` a leaf's two faces,
 * each its own colour (one-sided), the upper glossy; `sheet` thin things seen from both sides (petals, sepals);
 * `gloss` the chestnut's shell, polished and hard; `fuzz` the burr's spines and the catkins, dry and matt, seen from
 * both sides; `body` everything else.
 */
const MATERIALS = {
	bark: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }),
	twig: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
	leaf: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
	sheet: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
	gloss: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
	fuzz: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
	body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
	// a leaf on a tree of thousands: its outline and veins a picture (`bladeMap`) on a folded sheet, cut by the picture's alpha
	blade: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35, alphaTest: 0.4, map: bladeMap() }),
};
const materials = {};
const material = (kind) => (materials[kind] ??= (MATERIALS[kind] ?? MATERIALS.body)());
const KINDS = ['bark', 'twig', 'body', 'leaf', 'blade', 'sheet', 'gloss', 'fuzz', 'prop'];
const THINNED = { leaf: true, blade: true, sheet: true, fuzz: true };

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
 * 2. ORGANS — the chestnut's own, each to its measure ('Belle Épine' where the cultivar differs from the species)
 * ============================================================================================================== */

/** The cultivar's numbers, in one place (metres, colours as seen in daylight). */
const BE = {
	// the nut: one of a pair in the burr, flat on its inner face; height base to tip, width, thickness
	nut: { height: 0.035, width: 0.032, thick: 0.019, shell: '#5e2c16', stripe: '#3e1c0e', tip: '#a8835a', hilum: '#a8977a', hilumWidth: 0.6, torch: 0.006, depth: 0.04 },
	kernel: { skin: '#a0652f', flesh: '#f1e3c0' },
	leaf: { length: 0.19, width: 0.064, petiole: 0.018, teeth: 16, top: '#34521b', under: '#8a9a5b', vein: '#a9bd6f', young: '#a9b85a', petioleColour: '#8d9a42' },
	catkin: { length: 0.15, thick: 0.0032, fluff: 0.007, colour: '#efe3a2', young: '#c9d48a', dry: '#8a6a3c' },
	burr: { width: 0.05, spine: 0.013, green: '#93b33f', young: '#7da23a', turning: '#b9a548', brown: '#9a7640', inside: '#d6c49a' },
	bark: { shoot: '#8a4b2c', shootShade: '#6f7a34', twig: '#6a4a30', young: '#6b5e4a', grey: '#6f675c', old: '#625a50', plate: '#7a7166', fissure: '#3a2c22', lenticel: '#d2bf98' },
	root: { young: '#f2e6cc', old: '#5c4331' },
};

/* ---- the nut ---- */

/**
 * One chestnut, built up +Y from the middle of its hilum (the broad pale scar where it sat in the burr) to its tip,
 * where the dry styles stand in a little pale tuft (the 'torch'). Its outline broad and rounded at the shoulders,
 * drawn in to the tip; across, one of a pair is flat on its inner face (−Z), where it lay against the other, and domed
 * outside (+Z); a nut alone in its burr is plump and domed on both faces. Its shell glossy dark mahogany, faint darker
 * lines from the hilum to the tip, the tip pale and downy. `grown` 0 … 1 its size, `ripe` 0 … 1 its colour (pale and
 * soft, then brown), `alone` true for a single nut.
 */
function nutGeometry({ grown = 1, ripe = 1, alone = false, ns = 0, res = false, size = 1 }) {
	const N = BE.nut;
	const H = N.height * size * grown, W = N.width * size * grown, T = N.thick * size * grown;
	const rings = res ? 60 : fewer(5, 4);
	const sides = res ? 72 : fewer(7, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	const shellC = mix('#e9dcc0', N.shell, ripe);
	const stripeC = mix('#d8c6a0', N.stripe, ripe);
	const tipC = mix('#efe6d2', N.tip, ripe);
	for (let i = 0; i <= rings; i++) {
		const u = i / rings; // 0 at the hilum, 1 at the tip
		// the outline: the hilum broad, widening a little to the shoulders a third of the way up, then rounded in to a
		// short point at the tip
		const x = (u - 0.32) / 0.68;
		const half = u < 0.32 ? lerp(N.hilumWidth, 1, Math.sin((Math.PI / 2) * (u / 0.32))) : Math.pow(Math.max(0, 1 - Math.pow(x, 2.6)), 0.55) * (1 - 0.1 * x * x);
		const y = H * u;
		for (let j = 0; j <= sides; j++) {
			const a = (j / sides) * Math.PI * 2;
			const cx = Math.cos(a), sz = Math.sin(a);
			const x = (W / 2) * half * cx * (alone ? 0.94 : 1);
			// one of a pair: its whole thickness T from the flat inner face (−Z, at −T/4) to the top of the dome (+Z, at
			// 3T/4); alone: plump, domed both sides, a little narrower
			const z = alone ? (T / 2) * half * sz * 1.05 : sz >= 0 ? T * 0.75 * half * Math.pow(sz, 0.85) : -T * 0.25 * half * Math.pow(-sz, 0.25);
			// faint ribs along it
			const rib = 1 + 0.012 * Math.sin(a * 22 + ns) * (1 - u);
			pos.push(x * rib, y, z * rib);
			nor.push(cx, 0.1, sz);
			uv.push(j / sides, u);
			// colour: the hilum's dull pale scar at the base, stripes, the pale downy tip
			const stripe = 0.35 * Math.pow(Math.abs(Math.sin(a * 11 + 2.2 * fbm(cx * 3, u * 4, sz * 3, 2, ns))), 6); // 'Belle Épine': hardly striped
			const c = shellC.clone().lerp(stripeC, 0.55 * stripe * (0.4 + 0.6 * u));
			c.lerp(new THREE.Color('#9a5a30'), 0.25 * (fbm(cx * 6, u * 9, sz * 6, 2, ns + 3) - 0.3));
			c.lerp(tipC, smooth((u - 0.88) / 0.12) * 0.6);
			c.lerp(new THREE.Color(N.hilum), smooth((0.09 - u) / 0.05));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sides; j++) {
			const a = i * (sides + 1) + j, b = a + sides + 1;
			idx.push(a, a + 1, b, b, a + 1, b + 1);
		}
	// the hilum: the bottom closed by a fan, dull and pale
	const at = pos.length / 3;
	pos.push(0, 0, 0);
	nor.push(0, -1, 0);
	uv.push(0, 0);
	const h = toColor(N.hilum);
	col.push(h.r, h.g, h.b);
	for (let j = 0; j < sides; j++) idx.push(at, j + 1, j);
	const g = made(pos, nor, uv, col, idx, false);
	g.computeVertexNormals();
	return { g, H, W, T };
}

/**
 * A nut put into the bag at `m` (its hilum at the origin, up +Y), with its torch: the dry styles, a tuft of 5–8 pale
 * hairs at the tip. `kind` gloss once it is ripe.
 */
function nut(bag, m, o) {
	const { g, H } = nutGeometry(o);
	bag.add(o.ripe > 0.6 ? 'gloss' : 'body', g, m);
	const tuft = BE.nut.torch * (o.size ?? 1) * (o.grown ?? 1);
	if (tuft < 0.0008 || !o.res) return H;
	const r = chance(o.ns ?? 0, 'torch');
	const n = o.res ? 7 : 3;
	for (let k = 0; k < n; k++) {
		const a = (k / n) * Math.PI * 2 + r();
		const d = v3(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize();
		const p0 = v3(0, H * 0.985, 0);
		bag.add('fuzz', tube([p0, p0.clone().addScaledVector(d, tuft * 0.6), p0.clone().addScaledVector(d, tuft).add(v3(0, 0, 0.0004))], (u) => 0.00045 * (1 - 0.7 * u), () => mix('#d9c9a6', '#8a7050', (o.ripe ?? 1) * 0.6), 3), m);
	}
	return H;
}

/* ---- bark ---- */

/**
 * Chestnut bark by the age (years) and radius (m) of the wood (`v` round it, `s` along it, `sun` how much it faces the
 * light): this year's shoot olive green flushed red-brown on its sunny side, its lenticels many, small and pale; one-
 * to several-year wood glossy red-brown to olive-brown with the lenticels drawn out sideways; then smooth grey-brown
 * with a net of shallow cracks opening as the stem passes ~10 cm; old bark (here only begun) ridged lengthwise, the
 * ridges turning in a slow spiral round the trunk as it ages, the furrows deep and dark.
 */
const BARK_K = { across: 22, along: 4.5 }; // the plates: about 4–6 cm across, 20–25 cm long, drawn out lengthwise
function barkPattern(r, v, s, ns, twist) {
	const a = v * Math.PI * 2 + s * twist; // the ridges turn round the stem as it climbs
	const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
	const w = (fbm(cx * 30, s * 6, cz * 30, 2, ns + 5) - 0.5) * 0.8;
	const c = cells(cx * BARK_K.across + w, s * BARK_K.along + w * 0.4, cz * BARK_K.across - w, ns + 3);
	const plate = 0.6 * c.id + 0.4 * fbm(cx * 80, s * 25, cz * 80, 2, ns);
	return { ridge: c.edge, plate, cx, cz };
}
const old = (r) => clamp((r - 0.13) / 0.1); // the bark cracks from about 15–20 years (~25 cm across), plates later
function barkColour(age, r, v, s, sun, ns, twist) {
	const B = BE.bark;
	if (age < 0.6) return mix(B.shootShade, B.shoot, 0.2 + 0.7 * sun + age * 0.4);
	const { ridge, plate, cx, cz } = barkPattern(r, v, s, ns, twist);
	// lenticels: pale dashes drawn out round the wood
	const ln = noise3(cx * 150, s * 900, cz * 150, ns + 7);
	const lenticel = smooth((ln - 0.78) / 0.07) * (1 - old(r));
	const young = clamp((r - 0.004) / 0.03); // glossy red-brown to olive-grey-brown
	const c = mix(mix(B.twig, B.shoot, 0.25 * sun), B.young, young).lerp(new THREE.Color(B.grey), clamp((r - 0.02) / 0.05) * 0.6);
	const o = old(r);
	if (o > 0) {
		const fissure = smooth((0.15 - ridge) / 0.11);
		const bark = mix(B.old, B.plate, plate * 0.9);
		c.lerp(bark, smooth(o * 1.3) * 0.8);
		c.lerp(new THREE.Color(B.fissure), fissure * o * 0.85);
		// green algae and grey lichen on the shaded side of the old bark
		c.lerp(new THREE.Color('#5d6b3c'), 0.25 * o * clamp(-Math.sin(v * Math.PI * 2)) * fbm(cx * 12, s * 4, cz * 12, 2, ns + 9));
		const lich = cells(cx * 9, s * 7, cz * 9, ns + 13);
		c.lerp(new THREE.Color('#9a9e8c'), o * 0.3 * (lich.id < 0.08 ? smooth((0.35 - lich.f1) / 0.1) : 0));
	}
	// the young stem's fine vertical scoring, and its greyish-purple sheen in the light
	const score = Math.pow(noise3(cx * 400, s * 12, cz * 400, ns + 21), 3) * clamp((r - 0.015) / 0.03) * (1 - o);
	c.lerp(new THREE.Color('#4a3e34'), score * 0.5).lerp(new THREE.Color('#7a6670'), 0.12 * sun * clamp((r - 0.02) / 0.04) * (1 - o));
	return c.lerp(new THREE.Color(B.lenticel), lenticel * lerp(0.55, 0.15, clamp((r - 0.01) / 0.04)));
}
/** how far bark is pushed out or cracked in at a place, as a part of the radius */
function barkRelief(r, v, s, ns, twist) {
	const o = old(r);
	if (o <= 0) return 0;
	const { ridge, plate } = barkPattern(r, v, s, ns, twist);
	return o * (-0.09 * smooth((0.2 - ridge) / 0.18) + 0.015 * (plate - 0.5) + 0.015 * smooth(ridge / 0.5));
}

/* ---- the leaf ---- */

/**
 * Its outline: oblong-lanceolate, about three and a half times as long as wide, widest a little below the middle,
 * the base rounded (a little uneven), drawn out to a sharp tip; the margin cut into coarse teeth, one at the end of
 * each of the 15–20 straight side veins, each tooth drawn out forward into a bristle.
 */
const leafShape = (teeth, n) => (u) => {
	const body = Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), 0.88)), 0.72);
	const base = 0.5 + 0.5 * smooth(u / 0.12);
	if (!teeth || u < 0.06 || u > 0.97) return body * base;
	// a tooth: the margin rises slowly to its point then drops back (the point toward the tip), the bristle beyond it
	const k = (u * n) % 1;
	const tooth = k < 0.8 ? k / 0.8 : (1 - k) / 0.2;
	const bristle = k > 0.74 && k < 0.82 ? 0.09 * (1 - Math.abs(k - 0.78) / 0.04) : 0;
	return body * base * (0.9 + 0.1 * tooth) + bristle * body;
};

/** how much of its sheet's width a cut-out leaf fills at its widest (its teeth and bristles inside the sheet) */
const BLADE_FIT = 0.9;
let BLADE_MAP = null;
/**
 * The leaf's picture, made once from its numbers: x along it from its base to its tip, y across it; its outline
 * (`leafShape` with its teeth and bristles) in the alpha, the midrib and the straight parallel side veins pale and sunk,
 * a faint mottle; white elsewhere, so the vertex colours give the leaf its colour.
 */
function bladeMap() {
	if (BLADE_MAP) return BLADE_MAP;
	const W = 512, H = 128;
	const shape = leafShape(true, BE.leaf.teeth);
	const data = new Uint8Array(W * H * 4);
	const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const u = (x + 0.5) / W, v = ((y + 0.5) / H - 0.5) * 2;
			const half = shape(u) * BLADE_FIT;
			const k = (u - Math.abs(v) * 0.12) * BE.leaf.teeth;
			const vein = Math.abs(v) < 0.035 ? 1 : Math.pow(Math.abs(Math.cos(Math.PI * k)), 30) * (Math.abs(v) < half * 0.92 ? 0.7 : 0);
			// (white but for the veins and a faint mottle: the leaf's colour is its vertex colours', as the built leaf's)
			const g = 0.97 + 0.18 * vein + 0.04 * (noise3(u * 30, v * 8, 7, 2) - 0.5);
			const i = (y * W + x) * 4;
			data[i] = Math.round(clamp(srgb(g)) * 255);
			data[i + 1] = Math.round(clamp(srgb(g)) * 255);
			data[i + 2] = Math.round(clamp(srgb(g)) * 255);
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

/** whether a tree's leaves are cut out of their picture (a tree past its fourth year, of thousands of leaves) */
let CUT = false;

/**
 * A cut-out leaf's sheet: along +X from its base, `half` its half width, its face up; its upper face folded along the
 * midrib (`fold`) and its tip hanging (`curl`), in two spans; its underside one flat sheet a hair below, lit as the face above it. Six triangles.
 */
function cutLeaf(len, half, fold, curl, top, under) {
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (const u of [0, 0.5, 1])
		for (const v of [-1, 0, 1]) {
			pos.push(u * len, (fold * Math.abs(v) * 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.15)) - curl * u * u) * len, v * half);
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
			pos.push(u * len, (fold * 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.15)) * (u ? 0.3 : 1) - curl * u * u) * len - 0.002 * len, v * half);
			nor.push(0, -1, 0);
			uv.push(u, (v + 1) / 2);
			const c = toColor(under(0.15 + 0.7 * u, v * 0.5));
			col.push(c.r, c.g, c.b);
		}
	idx.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
	const g = made(pos, nor, uv, col, idx, true);
	// the underside lit as the face above it is (a thin leaf lets the light through), as `sheet` lights a built leaf's
	const n = g.attributes.normal;
	[0, 2, 6, 8].forEach((k, i) => n.setXYZ(9 + i, n.getX(k), n.getY(k), n.getZ(k)));
	return g;
}

/**
 * One leaf: its short stalk from the node, the blade held out and arching down a little, folded slightly along the
 * midrib; the upper face dark glossy green, the parallel side veins sunk and pale, the underside paler and dull.
 * `age` 0 … 1 from bud to grown (young leaves pale yellow-green, soft and hanging), `fall` 0 … 1 its autumn (yellow,
 * then golden brown, then gone; chestnut leaves hold on long, brown and dry).
 */
function leaf(bag, at, dir, size, age, fall, r, close = false) {
	const L = BE.leaf;
	if (fall >= 1 || age <= 0.01) return;
	const len = L.length * size * lerp(0.2, 1, smooth(age));
	const petLen = L.petiole * size * lerp(0.4, 1, smooth(age));
	const out = dir.clone().normalize();
	const flat = out.clone().setY(0);
	if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
	flat.normalize();
	const lift = lerp(0.6, about(r, 0.3, 0.25), smooth(age * 1.4)) + out.y * 0.3;
	const pd = flat.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const end = at.clone().addScaledVector(pd, petLen);
	const autumn = mix(mix('#d9b23a', '#c98a2c', r() * 0.6), '#8e6234', clamp(fall * 1.5 - 0.5));
	if (close || DETAIL.fruit) bag.add('body', tube([at, end], (u) => 0.0012 * size * (1 - 0.3 * u) * lerp(0.5, 1, age), () => (fall > 0.3 ? autumn : mix(L.petioleColour, '#a0662e', 0.2 + r() * 0.2)), close ? 6 : 3));
	// the blade: out from the stalk's end, a little down, its tip hanging
	const droop = lerp(-0.85, about(r, -0.18, 0.22), smooth(age * 1.3)) - fall * 0.3;
	const bd = flat.clone().applyAxisAngle(UP, about(r, 0, 0.3)).multiplyScalar(Math.cos(droop)).add(v3(0, Math.sin(droop), 0)).normalize();
	const fold = lerp(0.4, about(r, 0.12, 0.05), smooth(age));
	const curl = about(r, 0.1, 0.05) + fall * 0.15;
	const ns = Math.floor(r() * 1000);
	const young = 1 - smooth(age * 1.25);
	const veins = L.teeth;
	const vein = (u, v) => {
		// the side veins: straight, parallel, from the midrib out and forward to the teeth
		const k = (u - Math.abs(v) * 0.12) * veins;
		return Math.abs(v) < 0.06 ? 1 : Math.pow(Math.abs(Math.cos(Math.PI * k)), 24) * (Math.abs(v) < 0.94 ? 0.7 : 0);
	};
	const top = (u, v) => {
		const c = mix(L.top, L.young, young * 0.9);
		c.lerp(new THREE.Color(L.vein), vein(u, v) * 0.38 * (close ? 1 : 0.4));
		c.lerp(new THREE.Color('#4f7a2a'), (noise3(u * 4, v * 3, ns, 3) - 0.4) * 0.3);
		if (fall > 0) c.lerp(autumn.clone().lerp(new THREE.Color('#7c5a2c'), (1 - u) * 0.1), clamp(fall * 1.7 - (1 - Math.abs(v)) * 0.25));
		return c;
	};
	const under = (u, v) => {
		const c = mix(L.under, '#c9d48e', young * 0.6);
		c.lerp(new THREE.Color('#c5cc94'), vein(u, v) * 0.4 * (close ? 1 : 0.4));
		if (fall > 0) c.lerp(autumn, clamp(fall * 1.7));
		return c;
	};
	if (CUT && !close && !DETAIL.fruit) {
		bag.add('blade', cutLeaf(len, (len * (L.width / L.length) * 0.5) / BLADE_FIT, fold, curl, top, under), aim(end, bd, about(r, 0, 0.25)));
		return;
	}
	const blade = sheet({
		length: len,
		width: len * (L.width / L.length) * 0.5,
		shape: leafShape(close, veins),
		lift: (u, v) => fold * Math.abs(v) * 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.05)) - curl * u * u + (close ? 0.006 * Math.cos(Math.PI * ((u - Math.abs(v) * 0.12) * veins)) * Math.abs(v) : 0),
		paint: top,
		back: under,
		along: close ? 90 : 3,
		across: close ? 10 : DETAIL.lean ? 1 : 2, // (a grown tree's tens of thousands of leaves: one row across)
	});
	bag.add('leaf', blade, aim(end, bd, about(r, 0, 0.25)));
}

/* ---- buds ---- */

/** a winter bud: small, plump, red-brown, two or three scales, set a little to one side of the leaf scar */
function bud(bag, at, dir, swell, r) {
	const s = lerp(0.0022, 0.0032, swell);
	const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	const c = at.clone().addScaledVector(dir, s * 0.9);
	bag.add('body', bead(c, v3(s * 0.8, s * 1.25, s * 0.8), mix('#7a3a22', '#9a5a2a', swell + r() * 0.2), 2, q));
}

/* ---- the catkins ---- */

/**
 * A catkin, from the axil of a leaf near the tip of this year's shoot: a stiff axis set with clusters of tiny flowers
 * all along it (glomerules about a centimetre apart), each with 10–20 long stamens, so that it looks a cream bottle-
 * brush; held up and out from the shoot, then arching over as it lengthens. A bisexual catkin (`female` > 0) is
 * shorter and bears, at its base, one to three female flowers: little green spiny cups each with its pale styles.
 * `phase` its life: < 0 growing (green, short), 0 … 0.35 in flower (cream, the stamens out), then browning and shed
 * by 0.9 — all but the base of a bisexual one, where the burr stays.
 */
function catkin(bag, at, dir, len, phase, r, close = false, maleLength = 1) {
	const K = BE.catkin;
	if (phase > 0.9 || phase < -0.4) return;
	const grow = lerp(0.18, 1, span(phase, -0.4, 0.02)) * maleLength;
	const L = len * grow * (1 - 0.15 * span(phase, 0.45, 0.85));
	if (L < 0.004) return;
	const colour = phase < 0 ? mix(K.young, K.colour, span(phase, -0.2, 0)) : mix(K.colour, K.dry, span(phase, 0.32, 0.7));
	const fl = span(phase, -0.12, 0.05) * (1 - 0.5 * span(phase, 0.4, 0.8));
	// the path: out from the axil, rising, then arching over as it lengthens (and more as it fades)
	const steps = close ? 24 : fewer(5, 3);
	const d = dir.clone().normalize();
	const side = d.clone().setY(0);
	if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
	side.normalize();
	const pts = [at.clone()];
	const bend = about(r, 0.55, 0.25) * (L / 0.17) + span(phase, 0.3, 0.8) * 0.6;
	const twist = v3(about(r, 0, 0.3), 0, about(r, 0, 0.3));
	for (let i = 1; i <= steps; i++) {
		const u = i / steps;
		const dd = d.clone().lerp(side.clone().add(v3(0, -0.6, 0)).add(twist).normalize(), clamp(bend * u * u)).normalize();
		pts.push(pts[i - 1].clone().addScaledVector(dd, L / steps));
	}
	const ns = Math.floor(r() * 1000);
	const glom = Math.max(4, Math.round(L / 0.008)); // the flower clusters along it
	const rad = (u, v, s) => {
		const k = (s / L) * glom;
		const lump = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(Math.PI * k)), 0.7);
		const tip = 1 - 0.55 * smooth((u - 0.82) / 0.18);
		return (K.thick + K.fluff * fl * lump * (0.8 + 0.4 * noise3(v * 5, s * 60, ns, 1))) * tip * lerp(0.5, 1, grow) * (u < 0.04 ? 0.6 + u * 10 : 1);
	};
	bag.add('fuzz', tube(pts, rad, (u, v, s) => colour.clone().lerp(new THREE.Color('#fbf3c8'), fl * 0.35 * noise3(v * 7, s * 90, ns, 2)).lerp(new THREE.Color('#9cb04c'), (1 - fl) * 0.3), close ? 10 : 3, true));
	if (close && fl > 0.2) {
		// up close, the stamens: fine pale filaments standing out of each cluster, their anthers yellow
		for (let g = 0; g < glom; g++) {
			const s = ((g + 0.5) / glom) * L;
			const i = Math.min(steps - 1, Math.floor((s / L) * steps));
			const p = pts[i].clone().lerp(pts[i + 1], (s / L) * steps - i);
			const along = pts[i + 1].clone().sub(pts[i]).normalize();
			for (let k = 0; k < 10; k++) {
				const a = (k / 10) * Math.PI * 2 + g * 1.3;
				const out = across(along).applyAxisAngle(along, a).addScaledVector(along, about(r, 0.2, 0.3)).normalize();
				const fil = K.fluff * 1.9 * fl * about(r, 1, 0.25);
				const p1 = p.clone().addScaledVector(out, K.thick + fil);
				bag.add('fuzz', tube([p.clone().addScaledVector(out, K.thick * 0.6), p1], () => 0.00012, () => mix('#f6f0d0', K.dry, span(phase, 0.32, 0.7)), 3));
				bag.add('body', bead(p1, v3(0.0004, 0.0003, 0.0004), mix('#e8c84a', '#7a5a2a', span(phase, 0.3, 0.7)), 2));
			}
		}
	}
	return pts;
}

/* ---- the burr ---- */

/** how big a burr is, 0 … 1 of its ripe size, by days after the female flowers open (a slow start, a summer swell) */
function burrSize(d) {
	// measured across the spines (Perulli et al. 2020): ~20 mm at 27 days, 37 at 50, 52 at 80, 61 at 103
	return straight(d, [[0, 0.1], [27, 0.33], [50, 0.6], [80, 0.85], [103, 1]]);
}
/** the burr's colour by days: a darker green while young, yellow-green through summer, then yellow and brown */
function burrColour(d) {
	const B = BE.burr;
	if (d < 40) return mix(B.young, B.green, d / 40);
	if (d < 80) return mix(B.green, '#a8b742', (d - 40) / 40);
	if (d < 96) return mix('#a8b742', B.turning, (d - 80) / 16);
	return mix(B.turning, B.brown, (d - 96) / 12);
}

/**
 * The burr (the cupule): a husk round its one or two nuts, set all over with long, stiff, branched spines in bundles,
 * pointing every way; built standing up +Y from its short stalk at the origin. It splits from the top into four
 * valves that gape back (`days` from ~97) to show the felted pale inside and the nuts: a pair flat on their inner
 * faces, or one alone, plump.
 */
function burr(bag, m, days, seed, key, res) {
	const B = BE.burr;
	const r = chance(seed, 'burr', key);
	const size = burrSize(days) * about(r, 1, 0.07);
	const R = (B.width / 2) * size; // the husk's radius
	const H = R * 1.75 * lerp(1.1, 1, size); // its height, a little more than its width (the nuts inside stand up)
	const colour = burrColour(days);
	const open = span(days, 97, 108); // the burrs split ~100 days after the female flowers, early to mid October
	const ns = hashText(key) % 991;
	// the stalk: short and stout
	bag.add('body', tube([v3(0, -0.012, 0), v3(0, -0.004, 0), v3(0, 0.002, 0)], (u) => 0.0028 * lerp(0.5, 1, size) * (1 + 0.4 * u), () => mix('#7a7a3a', '#6a4a2a', open), res ? 8 : 4), m);
	if (DETAIL.level < 0.5 && !res) {
		// far off, in a crowd: the burr a bristly ball, the nuts two dark beads once it gapes
		const ball = bead(v3(0, H * 0.5, 0), v3(R * 1.35, H * 0.62, R * 1.35), colour.clone().lerp(new THREE.Color('#c9c46a'), 0.15), 4);
		bag.add('body', ball, m);
		if (open > 0.3) bag.add('gloss', bead(v3(0, H * 0.75, 0), v3(R * 0.7, R * 0.5, R * 0.45), BE.nut.shell, 3), m);
		return { R, H, size, open };
	}
	// four valves: each a quarter of the husk round, hinged at its base, laid open from the top
	const rings = res ? 22 : fewer(4, 3);
	const sides = res ? 14 : fewer(3, 2);
	const shape = (u) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + u * 0.94)), 0.6); // u 0 base … 1 top
	const valve = new THREE.Matrix4();
	for (let k = 0; k < 4; k++) {
		const a0 = (k / 4) * Math.PI * 2 + 0.03 * open, a1 = ((k + 1) / 4) * Math.PI * 2 - 0.03 * open;
		const gape = open * about(r, 1.45, 0.2);
		const mid = (a0 + a1) / 2;
		const hinge = v3(Math.cos(mid) * R * 0.45, H * 0.12, Math.sin(mid) * R * 0.45);
		// the valve swings out about a horizontal line through its hinge, at right angles to its middle
		const axis = v3(-Math.sin(mid), 0, Math.cos(mid));
		valve.makeTranslation(hinge.x, hinge.y, hinge.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, -gape)).multiply(new THREE.Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z));
		const pos = [], nor = [], uv = [], col = [], idx = [];
		for (let face = 0; face < (res || open > 0.02 ? 2 : 1); face++) {
			const base = pos.length / 3;
			const th = face ? 0.0025 * size : 0;
			for (let i = 0; i <= rings; i++) {
				const u = i / rings;
				for (let j = 0; j <= sides; j++) {
					const a = lerp(a0, a1, j / sides);
					const w = (R - th) * shape(u) * (1 + 0.04 * (noise3(Math.cos(a) * 3, u * 3, Math.sin(a) * 3, ns) - 0.5));
					pos.push(Math.cos(a) * w, u * H, Math.sin(a) * w);
					nor.push(Math.cos(a) * (face ? -1 : 1), 0, Math.sin(a) * (face ? -1 : 1));
					uv.push(j / sides, u);
					const c = face ? mix(B.inside, '#b8a070', 0.3 * u) : colour.clone().multiplyScalar(0.8 + 0.2 * u);
					col.push(c.r, c.g, c.b);
				}
			}
			for (let i = 0; i < rings; i++)
				for (let j = 0; j < sides; j++) {
					const a = base + i * (sides + 1) + j, b = a + sides + 1;
					if (face) idx.push(a, a + 1, b, b, a + 1, b + 1);
					else idx.push(a, b, a + 1, b, b + 1, a + 1);
				}
		}
		const g = made(pos, nor, uv, col, idx, false);
		g.computeVertexNormals();
		bag.add('body', g, m.clone().multiply(valve));
		// the spines: in bundles of a few, each a thin cone, all over the valve, longer toward the top
		const bundles = res ? 110 : fewer(Math.round(5 + 13 * size), 5);
		const per = res ? 5 : 2;
		const spine = B.spine * lerp(0.35, 1, size);
		const sp = new THREE.Vector3();
		const sPos = [], sCol = [], sIdx = [];
		const tipC = mix(colour, open > 0 ? '#6a4a2a' : '#c9c46a', open > 0 ? 0.6 : 0.3);
		const baseC = colour.clone();
		for (let b = 0; b < bundles; b++) {
			const u = 0.08 + 0.9 * ((b + r()) / bundles) ** 0.85;
			const a = lerp(a0 + 0.06, a1 - 0.06, r());
			const w = R * shape(u);
			const p = v3(Math.cos(a) * w, u * H, Math.sin(a) * w);
			const n = v3(Math.cos(a) * shape(u), 0.35 * (u - 0.5) * 2 + 0.25, Math.sin(a) * shape(u)).normalize();
			for (let k = 0; k < per; k++) {
				const d = n.clone().add(v3(about(r, 0, 0.55), about(r, 0, 0.55), about(r, 0, 0.55))).normalize();
				const len = spine * about(r, 1, 0.25) * (0.8 + 0.3 * u);
				const tip = p.clone().addScaledVector(d, len);
				const side1 = across(d).multiplyScalar(0.00045 * lerp(0.6, 1, size));
				const side2 = side1.clone().applyAxisAngle(d, (Math.PI * 2) / 3);
				const side3 = side1.clone().applyAxisAngle(d, (Math.PI * 4) / 3);
				const at = sPos.length / 3;
				// up close a thin cone of three faces; on the tree one blade (the fuzz is drawn from both sides)
				for (const s of res ? [side1, side2, side3] : [side1, side1.clone().negate()]) {
					sp.copy(p).add(s);
					sPos.push(sp.x, sp.y, sp.z);
					sCol.push(baseC.r, baseC.g, baseC.b);
				}
				sPos.push(tip.x, tip.y, tip.z);
				sCol.push(tipC.r, tipC.g, tipC.b);
				if (res) sIdx.push(at, at + 1, at + 3, at + 1, at + 2, at + 3, at + 2, at, at + 3);
				else sIdx.push(at, at + 1, at + 2);
			}
		}
		if (sPos.length) {
			const sg = made(sPos, new Array(sPos.length).fill(0), new Array((sPos.length / 3) * 2).fill(0), sCol, sIdx, true);
			bag.add('fuzz', sg, m.clone().multiply(valve));
		}
	}
	// the nuts inside: seen only as the burr opens (and in the fruit view): one or two, standing on their hilums at the
	// bottom of the husk; a pair face to face, their flat faces together, their domes out toward the valves
	if (open > 0.02 || res) {
		const ripe = clamp((days - 80) / 22);
		const nuts = r() < 0.4 ? 1 : 2;
		const T = BE.nut.thick * size * 0.95;
		for (let k = 0; k < nuts; k++) {
			const side = nuts === 1 ? 0 : k === 0 ? 1 : -1;
			// a nut of a pair sits with its flat face on the burr's middle (its own origin a quarter of its thickness
			// in from it), its dome turned out (+Z to ±X), leaning out a little as the valves part
			const nm = m.clone()
				.multiply(new THREE.Matrix4().makeTranslation(side * T * 0.25, H * 0.1, 0))
				.multiply(new THREE.Matrix4().makeRotationZ(-side * 0.12 * open))
				.multiply(new THREE.Matrix4().makeRotationY(side ? (side * Math.PI) / 2 : 0));
			nut(bag, nm, { grown: size * 0.95, ripe, alone: nuts === 1, ns: ns + k, res });
		}
	}
	return { R, H, size, open };
}

/* ================================================================================================================
 * 3. THE TREE — its axes year by year, its girth, its roots, its season
 * ============================================================================================================== */

/**
 * How the tree grows, in numbers. A 'Belle Épine' grafted in its second spring on its own seedling, 12 cm up, and
 * grown open in a grove as a central leader: the stem kept clear to about 1.2 m, the limbs above it the leader's own
 * shoots, left to grow. Every year's shoot stops in June: its tip withers (no terminal bud: the chestnut grows
 * sympodially), and the next spring the uppermost buds break — the top one carries the axis on, a little to one side,
 * the next few give the year's side shoots (acrotony), the buds lower down stay asleep. So the shoots come in fans at
 * the ends of the last year's growth, and the crown is a dome of leafy shoot ends over bare inner wood.
 */
const TREE = {
	depth: BE.nut.depth, // the nut sown 4 cm deep
	clear: 1.0, // the stem kept clear of limbs below this (m above the soil)
	graft: 0.12, // the graft union, 12 cm above the soil
	// how long a year's extension of an axis is, by its order (stem 0, limbs 1, …), at vigour 1
	shoot: [1.15, 1.05, 0.76, 0.56, 0.44, 0.32, 0.28],
	// how much less each later year of one axis extends (by the axis's age), and how much less as the tree ages
	fade: [1, 0.9, 0.8, 0.72, 0.66, 0.62, 0.58, 0.56, 0.55, 0.54],
	treeFade: [[0, 1], [3, 1], [6, 0.85], [10, 0.7], [20, 0.6], [40, 0.5], [60, 0.45]],
	internode: 0.034,
	tipRadius: 0.0017,
	pipeLength: 3e-7, // how much a metre of shoot beyond adds to what its wood must carry (r^2.5 per metre)
	ring: 0.5, // how much a year's ring adds to the pipe-model girth, per year of the wood's age
	firstFlowers: 4, // its fifth summer from the nut (fourth from the graft): the first catkins and a few burrs
	flowering: 0.235, // the male catkins in flower ~23 June (s 0 … 1 from 1 April); the female flowers a week later
	leafOut: 0.06, // buds break ~22 April
	stop: 0.23, // the shoots stop and their tips wither ~22 June
	fall: [0.52, 0.64], // the leaves turn from mid October and are down by mid November
	// version 5, the tree grown on past its tenth year (nothing before its eleventh spring changes):
	late: 9.6, // the year from which the grown tree's clock runs
	climb: 1.2, // how much longer the upper crown's shoots grow, so the dome keeps rising
	rise: 0.025, // and how much more they turn up to the light
	shadeInside: 0.6, // in a grown crown, a shoot whose tip is this deep inside the dome (its share of the way out) is shaded
	lateBranch: 0.5, // the share of the side shoots a full crown still breaks from its buds
	lateRing: 0.3, // past its tenth year, how much a year of old wood's rings still adds to its girth (the pipe model's share)
	sagYears: 3,
	skirt: 0.9, // the lowest (m) a grown crown's bowed limbs grow to
	lateStep: 0.09, // the step (m) a grown crown's shoots are walked in
	cell: 0.5, // the cells (m) of a grown crown's light
	perCell: [[10, 1.5], [20, 1.5], [35, 0.7], [50, 0.4]], // the new shoots a year one cell has light for, by the tree's year
	lateRings: 8, // the side wood's rings this much farther apart once grown (a grown tree has tens of thousands of shoots)
	lateSides: 0.45, // and fewer sides round
	lateLeaves: [[10, 1], [20, 0.75], [35, 0.6], [50, 0.5]], // the share of the leaves drawn by the tree's year
	lateGrow: 1.35, // each drawn leaf grown at most this much to fill the gap
	lateBurr: 0.5, // the detail a grown tree's burrs are drawn at
	lateShort: 1.5, // seen from afar (detail under 1), side shoots shorter than this (m, at detail 0) not drawn
	woodMost: 85000, // the triangles its wood may take at full detail: past them its thinnest shoots are not drawn
	leavesMost: 11000, // the leaves it may carry at full detail: past them a share is kept, each grown to fill the gap
	burrsFine: 350, // the burrs drawn as burrs; any more of a heavy crop are bristly balls
	lateFine: 0.02, // and side wood thinner than this (m, radius, at detail 0.3) not drawn either: under a pixel there
};

/**
 * The grown tree's crown by its year, past its tenth: its height and its radius, fitted to the anchors there are
 * (adult at 30 years 10–15 m; 20–30 m and as wide when old; a 100-year open-grown tree 20 m tall and 27 m across,
 * one of 110 years 29 m and 20 m across): a dome the shoots keep to, rising and spreading year by year.
 */
const grownH = (y) => table(y, [[9, 6.4], [19, 11], [34, 16], [49, 21.3], [69, 24]]);
const grownR = (y) => table(y, [[9, 3.4], [19, 4.3], [34, 5.8], [49, 7.1], [69, 9]]);
const grownEnvelope = (y) => {
	const H = grownH(y);
	const c = TREE.clear + 0.42 * (H - TREE.clear);
	return { H, R: grownR(y), c, b: H - c };
};

/** a year's season: `year` since germination, `s` 0 … 1 from 1 April, `days` since 1 April */
const seasonOf = (t) => {
	const year = Math.floor(t);
	return { year, s: t - year, days: (t - year) * 365 };
};
/** how much of a year's extension is grown, `dt` years into that season */
const extension = (dt, first) => (first ? table(dt, [[0.03, 0], [0.065, 0.13], [0.12, 0.35], [0.25, 0.75], [0.36, 1]]) : span(dt, TREE.leafOut - 0.01, TREE.stop));

/** the tree's vigour by its age: a young chestnut grows a metre a year, a grown one far less */
const treeVigour = (year) => straight(year, TREE.treeFade);

/**
 * The tree's axes at time t: each axis a polyline as far as grown, its nodes (where its leaves and buds are), the
 * year each part grew in, and the axes it bears. Every axis and node draws its own chance, so the tree at an
 * earlier t is the first part of the tree at a later one.
 */
function axes(seed, t, base) {
	const all = [];
	const vigourTree = about(chance(seed, 'tree'), 1, 0.07);
	const lean = (() => {
		const r = chance(seed, 'lean');
		const a = r() * Math.PI * 2;
		return v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.04 + r() * 0.05);
	})();

	/** how many new shoots of a grown crown's year have broken in each cell of its space */
	const room = new Map();
	/** a year's extension of an axis of `order`, in the axis's `ageAxis` year, the tree in its `year` */
	const yearLength = (order, vigour, ageAxis, year, r) => TREE.shoot[Math.min(order, TREE.shoot.length - 1)] * vigour * TREE.fade[Math.min(ageAxis, TREE.fade.length - 1)] * treeVigour(year) * about(r, 1, 0.12) * vigourTree;

	const grow = (key, from, dir, born, order, vigour, parent, at) => {
		if (t < born + (order === 0 ? 0.03 : TREE.leafOut - 0.005)) return null;
		const r = chance(seed, 'axis', ...key);
		const ax = { key, order, born, parent, at, pts: [from.clone()], years: [born], nodes: [], kids: [], vigour, dir0: dir.clone(), segs: [] };
		all.push(ax);
		const d = dir.clone().normalize();
		const outward = from.clone().setY(0);
		let node = 0;
		let s0 = 0;
		for (let y = born; y <= Math.floor(t); y++) {
			const ageAxis = y - born;
			const first = order === 0 && y === 0;
			let len = yearLength(order, vigour, ageAxis, y, r);
			if (first) len = 0.32 * vigourTree; // the seedling's first year
			if (order === 0 && y === 1) len *= 0.85; // the graft takes, then grows away
			if (order === 0 && y >= 6) len *= 0.8; // the leader slows; the limbs catch up: a dome // the leader loses its lead to the limbs: a dome
			// the grown tree's clock: the shoots high in the crown, in full light, keep climbing
			const late = clamp((y - TREE.late) / 4);
			const E = late > 0 ? grownEnvelope(y) : null;
			const top0 = ax.pts[ax.pts.length - 1];
			const upper = late > 0 ? clamp((top0.y - 0.45 * E.H) / (0.45 * E.H)) : 0;
			if (order > 0) len *= 1 + late * TREE.climb * upper;
			if (len < (order >= 3 ? 0.06 : 0.03)) break; // a weak twig stops growing, and soon dies
			const f = extension(t - y, first);
			if (f <= 0) break;
			// sympodial: the tip withered last June; the uppermost bud carries the axis on, a little to one side
			if (y > born) {
				const side = across(d).applyAxisAngle(d, (order === 0 ? r() * Math.PI * 2 : (ax.nodes.length % 2 ? Math.PI : 0) + about(r, 0, 0.4)));
				d.addScaledVector(side, order === 0 ? 0.06 : 0.16).normalize();
			}
			// (a grown crown's shoots are walked in longer steps: it has kilometres of them)
			const step = first && t < 0.2 ? 0.006 : late > 0 ? lerp(0.03, TREE.lateStep, late) : 0.03;
			const steps = Math.max(2, Math.ceil(len / step));
			const grown = len * f;
			let walked = 0;
			let stopped = false;
			const seg = { year: y, from: s0, len, grown, nodes: [] };
			ax.segs.push(seg);
			for (let k = 0; k < steps && walked < grown - 1e-6; k++) {
				const h = Math.min(step, grown - walked, len / steps);
				if (order === 0) d.add(v3(lean.x * 0.06 + about(r, 0, 0.025), 0.22, lean.z * 0.06 + about(r, 0, 0.025)));
				else {
					// a limb keeps to the angle it set out at, rises to the light (limbs more, twigs less), and sags as
					// it lengthens and bears; the outward pull keeps the crown open
					const up = (order === 1 ? 0.016 : order === 2 ? 0.01 : 0.004) + late * TREE.rise * upper;
					// (a grown crown's long-lived limbs have set their wood: past the tenth year their bending counts its first years only)
					const ageSag = y > TREE.late ? Math.min(ageAxis, TREE.sagYears) : ageAxis;
					const sag = 0.0022 * (order + 0.5) * Math.min(5, ageAxis + 1) * (walked / Math.max(0.05, len) + ageSag * 0.4);
					const out = outward.lengthSq() > 1e-6 ? outward.clone().normalize().multiplyScalar(0.01) : v3(0, 0, 0);
					d.addScaledVector(ax.dir0, 0.06);
					d.add(v3(about(r, 0, 0.05) + out.x, up - sag, about(r, 0, 0.05) + out.z));
					// a grown crown keeps to its dome: near its face a shoot turns in, past it it stops for the year
					if (late > 0) {
						const here = ax.pts[ax.pts.length - 1];
						const rad = Math.hypot(here.x, here.z);
						const ex = rad / E.R, ey = (here.y - E.c) / E.b;
						const e = Math.hypot(ex, ey) * late + (1 - late) * 0.5;
						if (e > 0.85) {
							const k2 = smooth((e - 0.85) / 0.2);
							const inX = rad > 1e-6 ? -here.x / rad : 0, inZ = rad > 1e-6 ? -here.z / rad : 0;
							d.add(v3(inX * 0.2 * k2 * ex, -0.2 * k2 * Math.max(0, ey), inZ * 0.2 * k2 * ex));
						}
						// (nor does a limb bowed under its years reach the grass: it stops a little over it)
						if (e > 1.05 || here.y < TREE.skirt * late) {
							d.normalize();
							stopped = true;
							break;
						}
					}
				}
				d.normalize();
				const last = ax.pts[ax.pts.length - 1];
				ax.pts.push(last.clone().addScaledVector(d, h));
				ax.years.push(y);
				walked += h;
				const inter = TREE.internode * (first ? 0.55 : order >= 3 ? 0.62 : order === 2 ? 0.8 : 1);
				while ((seg.nodes.length + 1) * inter <= walked + 1e-9) {
					const within = (seg.nodes.length + 1) * inter;
					const u = within / len;
					const n = { i: node, year: y, u, s: s0 + within, formed: y + (first ? 0.09 : TREE.leafOut) + (first ? 0.27 : TREE.stop - TREE.leafOut) * Math.pow(clamp(u), 1.15) * 0.92, seg };
					ax.nodes.push(n);
					seg.nodes.push(n);
					node++;
				}
			}
			s0 += stopped ? walked : grown;
			if (stopped) seg.grown = walked;
			if (f < 1) break;
		}
		ax.tipYear = ax.years[ax.years.length - 1];
		// a side shoot that has stopped growing two summers ago is shaded out inside the crown: it dies and is shed;
		// in a grown crown (past its tenth year) so does one whose tip is deep inside the dome
		const inside = (p, y) => {
			const E = grownEnvelope(y);
			return Math.hypot(Math.hypot(p.x, p.z) / E.R, (p.y - E.c) / E.b);
		};
		const shaded = order >= 2 && t > TREE.late + 1 && ax.born < Math.floor(t) - 1 && inside(ax.pts[ax.pts.length - 1], Math.floor(t)) < TREE.shadeInside;
		// (and in a grown crown a twig that has not grown this year is already shed)
		const idle = order >= 3 && t > TREE.late + 1 && ax.tipYear < Math.floor(t) && ax.born < Math.floor(t);
		if (shaded || idle || (order >= 2 && ax.tipYear < Math.floor(t) - 1 - (order === 2 ? 1 : 0))) {
			ax.dead = true;
			return ax;
		}
		const pathLen = lengths(ax.pts);
		ax.len = pathLen[pathLen.length - 1];
		ax.pathLen = pathLen;
		// leaves: on the stem in a 2/5 spiral; on side shoots in two rows, left and right, as the chestnut sets them
		const r2 = chance(seed, 'phyllo', ...key);
		const phase = r2() * Math.PI * 2;
		// where each node is: placed now for this year's (the leaves drawn), and for older ones only when a bud there is
		// looked at (a grown tree has a million nodes)
		const place = (n) => {
			if (n.at) return n;
			const p = pointAt(ax, n.s);
			n.at = p.at;
			n.dir = p.dir;
			return n;
		};
		for (const n of ax.nodes) {
			if (n.year >= Math.floor(t) - 1) place(n);
			if (order === 0) n.bearing = phase + n.i * 2.513;
			// the two rows lie level, left and right of the shoot (`across` is level), each leaf a little off it
			else n.bearing = (n.i % 2 ? Math.PI : 0) + about(r2, 0, 0.3);
		}
		// next spring the buds of each year's growth: the top few break, the rest sleep
		for (const seg of ax.segs) {
			if (seg.year + 1 > t - TREE.leafOut + 0.005) continue;
			const nodes = seg.nodes;
			if (nodes.length < 2) continue;
			const br = chance(seed, 'buds', ...key, seg.year);
			// how many side shoots: more from a long, vigorous year's growth; none from a weak one
			const many = seg.grown > 0.45 ? 4 : seg.grown > 0.25 ? 3 : seg.grown > 0.14 ? 2 : seg.grown > 0.09 ? 1 : 0;
			const lateSeg = order > 0 && seg.year + 1 > TREE.late;
			if (lateSeg && nodes.length && inside(place(nodes[nodes.length - 1]).at, seg.year + 1) < TREE.shadeInside + 0.1) continue; // shaded: its buds sleep
			let count = Math.max(0, Math.round(many * about(br, 1, 0.25)) - (order >= 4 ? 1 : 0));
			// a full crown past its tenth year: fewer buds find the light to break
			if (lateSeg && count > 0) count = Math.round(count * lerp(1, TREE.lateBranch, clamp((seg.year + 1 - TREE.late) / 4)) + br() * 0.5 - 0.25);
			for (let k = 0; k < count; k++) {
				// from the top down, skipping the very top bud (that one carries the axis on)
				const n = nodes[nodes.length - 2 - k * (1 + (br() < 0.35 ? 1 : 0))];
				if (!n) break;
				place(n);
				const above = n.at.y + TREE.depth - (base.y + TREE.depth);
				if (order === 0 && above < TREE.clear) continue; // the clear stem: shoots below 1.2 m pruned away
				const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
				const angle = (order === 0 ? 1.0 : 0.8) * about(br, 1, 0.15);
				const d0 = n.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
				const vig = vigour * (k === 0 ? 0.9 : 0.72 - 0.08 * k) * about(br, 1, 0.12) * (order === 0 ? 1 : 0.92);
				// a grown crown is full: a new shoot breaks only where there is light for it, a few to a half metre
				if (lateSeg) {
					const cell = `${seg.year + 1}|${Math.floor(n.at.x / TREE.cell)}|${Math.floor(n.at.y / TREE.cell)}|${Math.floor(n.at.z / TREE.cell)}`;
					const had = room.get(cell) ?? 0;
					const room0 = table(seg.year + 1, TREE.perCell);
					if (had >= Math.floor(room0) + (br() < room0 % 1 ? 1 : 0)) continue;
					room.set(cell, had + 1);
				}
				const kid = grow([...key, n.i], n.at, d0, seg.year + 1, order + 1, vig, ax, n.s);
				if (kid && !kid.dead) ax.kids.push(kid);
			}
		}
		return ax;
	};
	const trunk = grow(['stem'], base.clone(), v3(0, 1, 0), 0, 0, 1, null, 0);
	return { all: all.filter((a) => !a.dead), trunk };
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
 * How thick each axis is along it: the pipe model — the wood at a place carries what everything beyond it needs, so
 * a limb is as thick as the shoots it feeds taken together (r^2.5 summed), and every year the cambium lays on a ring.
 * Calibrated to grafted chestnuts grown in the open: a stem of about 3 cm at 30 cm high in its third year, 9–10 cm in
 * its sixth, 16–20 cm in its tenth.
 */
const PIPE = 2.5;
/** the trunk's diameter at 30 cm by the age of its wood, past its tenth year (fitted; 1–2 cm of girth a year) */
const trunkAt = (w) => table(w, [[9.5, 0], [19, 0.36], [34, 0.56], [49, 0.8]]);
function thicken(ax, t) {
	const n = ax.pts.length;
	const L = (ax.pathLen ??= lengths(ax.pts));
	ax.r2 = new Array(n).fill(0);
	ax.q = new Array(n).fill(0);
	for (const k of ax.kids) thicken(k, t);
	const add = new Array(n).fill(0);
	for (const k of ax.kids) {
		const { i } = pointAt(ax, k.at);
		add[Math.max(0, i - 1)] += k.q[0] * (k.born >= Math.floor(t) ? 0.5 : 1);
	}
	let acc = 0;
	const total = L[n - 1] ?? 0;
	for (let i = n - 1; i >= 0; i--) {
		acc += add[i];
		const beyond = total - (L[i] ?? 0);
		const q = Math.pow(TREE.tipRadius, PIPE) + acc + TREE.pipeLength * beyond;
		const woodAge = Math.max(0, t - ax.years[i] - 0.3);
		ax.q[i] = q;
		// (past its tenth year the old wood's rings count for less: a grown tree's crown is many times the young one's,
		// and the pipe model already carries it)
		const ringAge = t > TREE.late + 0.5 && woodAge > 9 ? 9 + TREE.lateRing * (woodAge - 9) : woodAge;
		ax.r2[i] = Math.pow(q * (1 + TREE.ring * ringAge), 2 / PIPE);
		// a grown tree's trunk keeps laying on its rings after its crown has shed what the pipe model counted: at least
		// as thick as a trunk of its wood's age (36 cm across in its twentieth year, 55 in its 35th, 80 in its 50th)
		if (ax.order === 0 && t > TREE.late + 0.5) ax.r2[i] = Math.max(ax.r2[i], Math.pow(trunkAt(woodAge) / 2, 2));
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
	const isTrunk = ax.order === 0;
	const aged = clamp((t - TREE.late - 0.5) / 10); // how far past its tenth year: a grown tree's wood drawn more sparingly
	// seen from afar (a crowd), a grown tree's short side shoots are not drawn, only the limbs that carry them
	if (aged > 0 && DETAIL.level < 1 && !isTrunk && ((total < TREE.lateShort * (1 - DETAIL.level) * aged && R0 < 0.05) || R0 < TREE.lateFine * ((1 - DETAIL.level) / 0.7) * aged)) return;
	// resample so that thick wood has rings close enough for its bark to show
	const step = (isTrunk ? 1 : lerp(1, TREE.lateRings, aged)) * (isTrunk ? clamp(R0 * 0.28, 0.004, 0.045) : R0 > 0.02 ? clamp(R0 * 0.8, 0.02, 0.06) : clamp(R0 * 3, R0 < 0.005 ? 0.08 : 0.04, 0.14));
	let pts = [];
	const count = Math.max(2, Math.ceil((total / step) * (R0 < 0.006 && DETAIL.level < 1 ? DETAIL.level : 1)));
	for (let k = 0; k <= count; k++) pts.push(pointAt({ pts: ax.pts, pathLen: L }, (k / count) * total).at);
	// its rings where it bends or changes girth, not every few centimetres: a ring kept where the wood leaves the straight
	// line between its neighbours by a share of its radius, and at least every few girths (the trunk keeps its fine rings
	// to above the eye: its flare, its graft and its plates' relief are read there)
	const from = isTrunk ? pts.findIndex((p, k) => (k / count) * total > TREE.depth + 2.6) : 0;
	if (from >= 0) pts = [...pts.slice(0, from), ...spare(pts.slice(from), clamp(R0 * 0.7, 0.004, 0.03), isTrunk ? 0.3 : clamp(R0 * 16, 0.3, 0.8))];
	// and as many sides as its girth shows: three on a shoot a pencil thick, to twenty-four on the trunk
	const sides = isTrunk ? Math.round(clamp(R0 * 110, 6, 24)) : R0 < 0.008 ? 3 : R0 < 0.03 ? 4 : R0 < 0.06 ? 5 : R0 < 0.1 ? 6 : 8;
	const nsAx = (ns + hashText(ax.key.join('.'))) % 9973;
	const twist = isTrunk ? 0.35 : 0.2; // the slow spiral of the bark's ridges, radians a metre
	const radius = (u, v, s) => {
		let r = radiusAt(s);
		if (isTrunk) {
			// the root flare: the stem spreading into its roots at and under the soil, in buttresses
			const ground = s - TREE.depth;
			const flare = Math.exp(-Math.max(0, ground + 0.03) / 0.14);
			r *= 1 + 0.6 * clamp(t / 6) * flare * (0.7 + 0.4 * Math.cos(v * Math.PI * 2 * 5 + nsAx));
			// the graft union: 'Belle Épine' on its seedling, 12 cm up; the scion grows a little thicker, a ring that stays
			if (t > 1.2) r *= 1 + 0.08 * clamp((t - 1.2) / 3) * (Math.exp(-Math.pow((ground - TREE.graft) / 0.025, 2)) + 0.5 * smooth((ground - TREE.graft) / 0.04));
		}
		if (s < r * 2.4 && ax.parent) r *= 1 + 0.3 * (1 - s / (r * 2.4)); // the branch collar
		return r * (1 + barkRelief(r, v, s, nsAx, twist));
	};
	const paint = (u, v, s, d) => {
		const r = radiusAt(s);
		const age = t - yearAt(s) - 0.2;
		const sun = clamp(d ? d.dot(sunDir) * 0.5 + 0.5 : 0.5);
		const c = barkColour(Math.max(0, age), r, v, s, sun, nsAx, twist);
		if (isTrunk && t < 1) {
			// the seedling's stem: pale under the soil, green flushed brown above
			const under = TREE.depth - 0.006; // the stem starts 4 mm above the nut
			const young = s < under ? mix('#ece2c8', '#cbbf8c', s / under) : mix('#3f4a1e', '#5a2614', sun * 0.7 + clamp(t * 3) * 0.3);
			c.lerp(young, 1 - clamp((t - 0.4) / 0.6));
		}
		if (isTrunk && s < TREE.depth) c.lerp(new THREE.Color(BE.root.old), clamp((TREE.depth - s) / 0.03) * clamp(t - 0.5));
		return c;
	};
	const kind = R0 < 0.007 && !isTrunk ? 'twig' : 'bark';
	const geo = tube(pts, radius, paint, sides, isTrunk || Math.sqrt(ax.r2[n - 1]) > 0.012);
	bag.add(kind, geo);
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

/** the roots: the radicle from the nut's tip, a strong taproot the first years, then a heart of oblique roots and wide laterals */
function roots(bag, seed, t, base) {
	if (!DETAIL.roots) return;
	root(bag, {
		seed,
		key: ['tap'],
		from: base.clone(),
		dir: v3(0.04, -1, 0.03),
		length: 1.4,
		grown: table(t, [[-0.35, 0], [-0.25, 0.015], [0, 0.08], [0.1, 0.14], [0.5, 0.35], [1, 0.5], [3, 0.8], [6, 1]]),
		radius: 0.0024 + 0.05 * span(t, 0.5, 9),
		down: 0.03,
		wander: 0.12,
		laterals: 9,
		lateral: 0.3,
		depth: 2,
		age: span(t, 0.2, 3),
		young: BE.root.young,
		old: BE.root.old,
	});
	const count = 10;
	for (let i = 0; i < count; i++) {
		const rr = chance(seed, 'lateral-root', i);
		const born = 0.1 + i * 0.3;
		const bear = i * 2.39996 + rr() * 0.5;
		const age = clamp(t / 9);
		root(bag, {
			seed,
			key: ['lateral', i],
			from: base.clone().add(v3(Math.cos(bear) * 0.01, -0.01 - rr() * 0.1, Math.sin(bear) * 0.01)),
			dir: v3(Math.cos(bear), -0.12 - rr() * (i % 3 === 0 ? 0.6 : 0.15), Math.sin(bear)),
			length: between(rr, 2.2, 3.6) * lerp(0.3, 1, age),
			grown: (t - born) / 6,
			radius: 0.0016 + 0.06 * span(t, born + 0.5, 10) * between(rr, 0.55, 1),
			down: 0.012,
			wander: 0.15,
			laterals: 6,
			lateral: 0.32,
			depth: 2,
			taper: 0.82,
			age: (t - born - 0.4) / 4,
			young: BE.root.young,
			old: BE.root.old,
			floor: -1.1,
		});
	}
}

/**
 * The whole chestnut at time t (years from germination): the nut, the roots, the wood, and what the season puts on
 * it — the buds in winter, the leaves from late April, the catkins at midsummer, the burrs from set to split.
 */
function chestnutTree(t, seed) {
	const g = t > TREE.late + 0.5 ? lite({ lean: true }, () => tree(t, seed)) : tree(t, seed);
	// (version 5: a grown tree's meshes are mended where a normal has no length, the leaf's pointed tip and base, which
	// some GPUs draw black; the stages before, as version 4 had them, are left exactly as they were)
	if (t > TREE.late + 0.5) mend(g);
	return g;
}

/** every normal of no length (a sheet's pinched point) turned to the next one along it, or up */
function mend(group) {
	group.traverse((o) => {
		const N = o.isMesh && o.geometry.attributes.normal;
		if (!N) return;
		let last = null;
		for (let i = 0; i < N.count; i++) {
			const x = N.getX(i), y = N.getY(i), z = N.getZ(i);
			const l = Math.hypot(x, y, z);
			if (Number.isFinite(l) && l > 1e-6) {
				last = [x / l, y / l, z / l];
				continue;
			}
			let k = i + 1;
			while (k < N.count && !(Math.hypot(N.getX(k), N.getY(k), N.getZ(k)) > 1e-6)) k++;
			const n = k < N.count ? [N.getX(k), N.getY(k), N.getZ(k)] : (last ?? [0, 1, 0]);
			const m = Math.hypot(...n);
			N.setXYZ(i, n[0] / m, n[1] / m, n[2] / m);
		}
		N.needsUpdate = true;
	});
	return group;
}
function tree(t, seed) {
	const bag = new Bag();
	// from its fifth year a chestnut carries thousands of leaves: each cut out of its picture (`cutLeaf`)
	CUT = t >= 4;
	const { year, s } = seasonOf(t);
	const base = v3(0, -TREE.depth, 0);
	const sunDir = v3(0.35, 0.85, 0.4).normalize();

	// the nut, sown in autumn lying on its side; its root comes out of the tip in March. Hypogeal: its seed leaves
	// stay in the shell, feeding the seedling, and rot in the soil within two years.
	if (t < 1.6) {
		const ripe = 1 - 0.5 * span(t, 0.3, 1.5);
		// lying on its side, its tip (where the root comes out) at the foot of the stem
		const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, Math.PI / 2 + 0.25));
		const tip = v3(0, BE.nut.height, 0).applyQuaternion(q);
		const m = new THREE.Matrix4().compose(base.clone().add(v3(0.006, -0.006, 0.002)).sub(tip), q, v3(1, 1, 1));
		lite(t > 0.4 ? { level: Math.min(DETAIL.level, 0.5) } : {}, () => nut(bag, m, { grown: 1, ripe, ns: hashText(seed) % 97, res: t < 0.2 && DETAIL.level >= 1 }));
	}

	// (under the soil: once the tree is up they are drawn coarsely)
	lite(t > 1.6 ? { level: Math.min(DETAIL.level, t > 8 ? 0.2 : 0.3) } : {}, () => roots(bag, seed, t, base.clone().add(v3(0.006, -0.004, 0.002))));

	const { all, trunk } = axes(seed, t, base.clone().add(v3(0.002, 0.004, 0)));
	if (!trunk) return bag.build();
	// the shoot comes up out of the soil arched; it straightens in a week or two
	const hook = 1 - span(t, 0.08, 0.12);
	if (hook > 0 && trunk.pts.length > 2) {
		const pts = trunk.pts;
		const L = lengths(pts);
		const total = L[L.length - 1];
		const Lh = Math.min(0.02, total * 0.5);
		const s0 = total - Lh;
		const piv = pointAt({ pts, pathLen: L }, s0);
		const bend = hook * Math.PI * 0.8;
		const Rc = Lh / bend;
		const side = v3(1, 0, 0.3).normalize();
		for (let i = 0; i < pts.length; i++) {
			if (L[i] <= s0) continue;
			const ang = (L[i] - s0) / Rc;
			pts[i].copy(piv.at).addScaledVector(piv.dir, Rc * Math.sin(ang)).addScaledVector(side, Rc * (1 - Math.cos(ang)));
		}
		trunk.pathLen = lengths(pts);
		for (const n of trunk.nodes) Object.assign(n, (({ at, dir }) => ({ at, dir }))(pointAt(trunk, n.s)));
	}
	thicken(trunk, t);
	// the thickest first: whatever the seed, the wood stays within its ceiling (TREE.woodMost)
	let woodTris = 0;
	for (const ax of [...all].sort((a, b) => b.r2[0] - a.r2[0])) {
		if (woodTris > TREE.woodMost && ax.order > 0) continue;
		woodTris += wood(bag, ax, t, hashText(seed) % 997, sunDir) ?? 0;
	}

	// the wood in the space, for the burrs to keep clear of
	const space = bag.space;
	for (const ax of all) {
		if (ax.pts.length < 2) continue;
		const R = (i) => Math.sqrt(ax.r2[Math.min(ax.r2.length - 1, Math.round(i * (ax.r2.length - 1)))]);
		space.rod(ax.pts, (u) => R(u) + 0.002);
	}

	const fall = span(s, TREE.fall[0], TREE.fall[1]);
	const leafy = s > TREE.leafOut - 0.01 && fall < 1;
	const bearing = year >= TREE.firstFlowers;
	const days = (s - TREE.flowering) * 365; // days from this summer's flowering
	// whatever the seed, the leaves stay within their ceiling (TREE.leavesMost, at full detail): a share kept, each grown
	let leaves = 0;
	if (leafy) for (const ax of all) leaves += ax.nodes.filter((n) => n.year === year && t >= n.formed).length * (t > TREE.late + 0.5 ? straight(t, TREE.lateLeaves) : 1);
	const share = Math.min(1, TREE.leavesMost / Math.max(1, leaves));
	let burrs = 0;
	if (share < 1) return lite({ thin: DETAIL.thin * share }, () => (foliage(), bag.build()));
	foliage();
	return bag.build();

	function foliage() {
	for (const ax of all) {
		const tipR = Math.sqrt(ax.r2[ax.r2.length - 1]);
		const nodes = ax.nodes.filter((n) => n.year === year);
		const shootLen = nodes.length ? nodes[0].seg.len : 0;
		// which of this year's shoots flower: grown well enough and out in the light (the stem and the limbs' own
		// leading shoots are too vigorous; the weakest too weak)
		const fr = chance(seed, 'flowering', ...ax.key, year);
		const flowers = bearing && ax.order >= 1 && shootLen > 0.07 && shootLen < 0.75 && fr() < lerp(0.2, 0.62, clamp((year - TREE.firstFlowers) / 5));
		const female = flowers ? (shootLen > 0.12 ? 1 + (fr() < 0.35 ? 1 : 0) + (fr() < 0.08 ? 1 : 0) : fr() < 0.4 ? 1 : 0) : 0;
		const count = nodes.length;
		for (let j = 0; j < count; j++) {
			const n = nodes[j];
			if (t < n.formed) continue;
			const nr = chance(seed, 'node', ...ax.key, n.i);
			const side = across(n.dir).applyAxisAngle(n.dir, n.bearing);
			const r0 = Math.max(tipR, 0.0016);
			const surf = n.at.clone().addScaledVector(side, r0);
			// the leaf: the first few of a shoot small, the rest full; out on its side, a little up
			const first = ax.order === 0 && year === 0;
			const rank = j / Math.max(1, count - 1);
			const size = (first ? lerp(0.32, 0.62, rank) : year === 1 ? 0.85 : 1) * lerp(0.55, 1, smooth(j / 3)) * about(nr, 1, 0.1) * (ax.order >= 4 ? 0.88 : 1) * (t > TREE.late + 0.5 ? Math.min(TREE.lateGrow, 1 / Math.sqrt(straight(t, TREE.lateLeaves))) : 1);
			// a grown tree past its tenth year bears many times the young one's leaves: fewer are drawn, each a little bigger
			const keep = t > TREE.late + 0.5 ? straight(t, TREE.lateLeaves) : 1;
			if (keep < 1 && chance(seed, 'keep', ...ax.key, n.i)() > keep) {
				// (not drawn)
			} else if (leafy) leaf(bag, surf, side.clone().addScaledVector(n.dir, 0.35).add(v3(0, 0.15, 0)).normalize(), size, clamp((t - n.formed) / 0.07), fall, nr);
			else if (s > 0.6 || s < TREE.leafOut) bud(bag, surf, side.clone().addScaledVector(n.dir, 0.9).normalize(), clamp((s - 0.9) / 0.1 + (s < 0.1 ? 1 : 0)), nr);
			if (!flowers) continue;
			// catkins from the leaf axils of the shoot's upper half: male ones below, the top one to three bisexual,
			// bearing the female flowers (and so the burrs) at their base
			const fromTop = count - 1 - j;
			const isFemale = fromTop >= 1 && fromTop <= female;
			const isMale = !isFemale && rank > 0.25 && fromTop >= 1;
			if (!isFemale && !isMale) continue;
			const kr = chance(seed, 'catkin', ...ax.key, n.i);
			const phase = (days - about(kr, 0, 4) - (isFemale ? 10 : 0)) / 40;
			const out = side.clone().multiplyScalar(0.55).addScaledVector(n.dir, 0.8).add(v3(0, 0.45, 0)).normalize();
			const axil = n.at.clone().addScaledVector(side, r0 * 0.7);
			const len = BE.catkin.length * about(kr, 1, 0.18) * (isFemale ? 0.55 : lerp(0.75, 1.1, rank));
			catkin(bag, axil, out, len, phase, kr, DETAIL.fruit === 'catkins');
			if (!isFemale || days < -2) continue;
			// the burrs: one, sometimes two, at the base of the bisexual catkin; they stand out from the shoot
			const nb = chance(seed, 'involucres', ...ax.key, n.i)() < 0.2 ? 2 : 1;
			for (let b = 0; b < nb; b++) {
				const bkey = [...ax.key, n.i, b];
				const br = chance(seed, 'set', ...bkey);
				if (br() > 0.26) continue; // not every female flower sets
				const d = days - 10 - about(br, 0, 3); // days from the female flowers' bloom
				const aim0 = out.clone().addScaledVector(across(out), (b ? 0.6 : -0.3)).add(v3(0, 0.25, 0)).normalize();
				const R = BE.burr.width * 0.5 + BE.burr.spine * 0.7;
				const place = perch(space, axil.clone().addScaledVector(aim0, 0.008), aim0, R);
				if (d < -10) continue; // before, the female flowers: a little green cup, drawn as the burr's first day
				const fkey = bkey.join('|');
				bag.fruit(bkey, axil, place.dir);
				const m = new THREE.Matrix4().compose(place.at, new THREE.Quaternion().setFromUnitVectors(UP, place.dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, br() * Math.PI * 2)), v3(1, 1, 1));
				// (a tree's hundreds of burrs drawn a little more simply on the tree, unless one is the one shown up close)
				// (and past TREE.burrsFine of a heavy crop, bristly balls: the tree's triangles hold whatever the seed)
				if (DETAIL.fruit !== fkey && ++burrs > TREE.burrsFine) lite({ level: Math.min(DETAIL.level, 0.3) }, () => burr(bag, m, Math.max(0, d), seed, fkey, false));
				else if (DETAIL.fruit !== fkey) lite({ level: Math.min(DETAIL.level, TREE.lateBurr) }, () => burr(bag, m, Math.max(0, d), seed, fkey, false));
				else burr(bag, m, Math.max(0, d), seed, fkey, DETAIL.fruit === fkey);
				bag.fruitDone();
			}
		}
		// the withered tip of a shoot that has stopped (the chestnut's shoot has no end bud)
		if (ax.tipYear === year && s > TREE.stop + 0.02 && ax.pts.length > 1 && !leafy) {
			const k = ax.pts.length;
			bud(bag, ax.pts[k - 1], ax.pts[k - 1].clone().sub(ax.pts[k - 2]).normalize(), 0, chance(seed, 'tip', ...ax.key));
		}
	}
	}
}

/**
 * Where a burr sits: out from its axil along a direction near `dir` (up and out, never hanging), turned as little as
 * it needs so its ripe size keeps clear of the burrs already there. Every burr that will set is placed, whatever the stage,
 * so each sits in the same place from the female flower to the split burr.
 */
function perch(space, at, dir, R) {
	const d0 = dir.clone().normalize();
	let best = null;
	const side = new THREE.Vector3();
	for (const swing of [0, 0.35, 0.7, 1.1]) {
		for (let k = 0; k < (swing ? 6 : 1); k++) {
			const a = (k / 6) * Math.PI * 2;
			side.copy(across(d0)).applyAxisAngle(d0, a);
			const d = d0.clone().addScaledVector(side, swing).normalize();
			if (d.y < -0.35) continue;
			const c = at.clone().addScaledVector(d, R * 0.95 + 0.006);
			const cost = space.inFruit(c, R * 0.8) * 10 + swing * 0.002;
			if (!best || cost < best.cost) best = { at: at.clone(), dir: d, c, cost };
		}
		if (best && best.cost < 0.003) break;
	}
	// (a shoot of a grown crown turned down at the crown's face: the burr stands level off it)
	if (!best) {
		const d = d0.clone().setY(Math.max(d0.y, -0.3));
		if (d.lengthSq() < 1e-6) d.set(1, 0, 0);
		d.normalize();
		best = { at: at.clone(), dir: d, c: at.clone().addScaledVector(d, R * 0.95 + 0.006), cost: 0 };
	}
	space.ball(best.c, R * 0.8);
	return best;
}

/* ================================================================================================================
 * 4. RECIPE — stages, params, the fruit view
 * ============================================================================================================== */

/**
 * Ten stages, from the nut to ripe chestnuts; `t` the years since germination each is grown at (between two stages,
 * on the way). The last five are one season of the tree's tenth year from the nut: catkins at midsummer, the burrs
 * splitting in October.
 */
const STAGES = [
	{ name: 'Nut', t: -0.46, note: "Mid October: a fresh 'Belle Épine' nut, about 35 × 32 × 19 mm and 14 g (60–80 to the kilo), dark mahogany and satiny, hardly striped, its broad pale hilum at the base and the dry styles in a tuft at the tip; sown on its side, 4 cm deep, before it can dry out." },
	{ name: 'Germination', t: 0.09, note: 'Late April: the root came out of the tip in the winter and is a white taproot 10–15 cm down; the shoot pushes up out of the nut, arched. Hypogeal: the seed leaves stay in the shell under the soil.' },
	{ name: 'Seedling', t: 0.2, note: 'Mid June: a red-brown stem 15–20 cm tall, its first leaves small, then toothed leaves like the grown ones, 8–12 cm, set in a spiral. By autumn 25–60 cm.' },
	{ name: 'Sapling', t: 1.3, note: "Its second summer: grafted in April with 'Belle Épine' 12 cm up (a seedling does not come true), the graft grown away into a straight whip of about 1 m, its bark smooth, red-brown dotted with pale lenticels." },
	{ name: 'Young tree', t: 4.3, note: 'Fifth summer, late July: about 4 m, a central stem clear to 1 m and limbs spreading from it; the first catkins are over, the first few burrs set at the shoot tips.' },
	{ name: 'Flowering', t: 9.25, note: 'Tenth summer, end of June: the tree 6 m tall and 6 m across, its stem 18 cm thick, smooth and olive-grey. Long cream catkins, 12–18 cm, stand out from the ends of every shoot in their hundreds, heavy-scented; the female flowers, small green cups with pale styles, sit at the base of the short catkins nearest the tips and open a week later.' },
	{ name: 'Burr set', t: 9.31, note: 'Late July: the male catkins brown and drop; where the female flowers were, small green burrs, 2–3 cm, bristle at the shoot tips.' },
	{ name: 'Green burrs', t: 9.39, note: 'Late August: green burrs of 4 cm, their spines in dense bundles, one or two together at the shoot ends; the nuts inside still pale and soft.' },
	{ name: 'Turning', t: 9.5, note: 'End of September: the burrs at their full 6 cm turn yellow-green and then tawny; the nuts inside harden and colour.' },
	{ name: 'Ripe', t: 9.545, note: "Mid October, about 100 days after the female flowers: the burrs split in four and gape over one or two glossy mahogany nuts (a pair flat where they touch, a single nut plump); they drop over two weeks. The leaves begin to turn gold." },
	// version 5: the tree grown on past its tenth year to a grown tree (the stages above stay as they were)
	{ name: 'Bearing tree, 20 years', t: 19.39, note: 'Its twentieth summer, late August, green burrs at the shoot ends: about 10.5 m tall and 10–11 m across, a broad rounded crown on a stem some 35 cm thick at 30 cm, its bark turning from smooth olive-grey to the first long fissures; the inner crown bare limbs, the leaves and burrs on its sunlit shell. In full bearing from its fifteenth to twentieth year.' },
	{ name: 'Grown tree, 35 years', t: 34.39, note: 'Its 35th summer: an adult chestnut (adult at about 30 years, 10–15 m), here about 15 m tall and 12.5 m across, a broad dome on a trunk some 65 cm thick, the bark in long grey-brown ridges beginning to twist in a slow spiral; green burrs all over the outer crown.' },
	{ name: 'Old tree, 50 years', t: 49.39, note: 'Its fiftieth summer: a big open-grown chestnut about 19.5 m tall and 15 m across, its heavy limbs spreading from a trunk some 85 cm thick, deeply furrowed in spiralling ridges. It goes on growing for a century or more, to 20–30 m and as wide, and bears for 80–150 years.' },
];
/** the stage of the ripe burrs: the default, and the season the fruit view picks its burr from */
const RIPE = 9;

/** the years since germination at a stage (0 … 9, between two stages on the way) */
function timeAt(stage) {
	const x = clamp(stage, 0, STAGES.length - 1);
	const i = Math.min(STAGES.length - 2, Math.floor(x));
	return lerp(STAGES[i].t, STAGES[i + 1].t, x - i);
}

const grow = (stage, seed) => chestnutTree(timeAt(stage), `${seed ?? 'maia'}`);

/* ---- the fruit view: one burr on its own ---- */

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

/** the burrs the tree bears ripe, and which of the well-grown ones the seed picks */
function ripePick(seed, stage = RIPE) {
	const { plant, fruits } = lite({ roots: false }, () => pickFruit(() => grow(stage > RIPE ? Math.round(stage) : RIPE, seed)));
	dispose(plant);
	if (!fruits.length) return undefined;
	const sized = fruits.map((f) => ({ key: f.key, size: sizeOf(f) }));
	for (const f of fruits) for (const p of f.parts) p.geometry.dispose();
	const most = Math.max(...sized.map((f) => f.size));
	const good = sized.filter((f) => f.size >= most * 0.85);
	const r = chance(seed, 'one-fruit');
	return good[Math.floor(r() * good.length)].key;
}

/** one burr at a stage, on its own: its stalk at the origin, standing up +Y as it does on the shoot, as finely as close up needs */
function fruitView(stage, seed) {
	const key = ripePick(seed, stage);
	const none = (note) => {
		const g = new THREE.Group();
		g.userData.note = note;
		return g;
	};
	if (!key) return none('This plant bears no fruit.');
	const { plant, fruits } = lite({ fruit: key, roots: false }, () => pickFruit(() => grow(stage, seed)));
	dispose(plant);
	const f = fruits.find((x) => x.key === key);
	for (const x of fruits) if (x !== f) for (const p of x.parts) p.geometry.dispose();
	if (!f) return none('This burr has not set yet.');
	const stand = new THREE.Matrix4()
		.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(f.dir, UP))
		.multiply(new THREE.Matrix4().makeTranslation(-f.at.x, -f.at.y, -f.at.z));
	const kinds = {};
	for (const p of f.parts) {
		p.geometry.applyMatrix4(stand);
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
	id: 'chestnut',
	label: "Sweet chestnut 'Belle Épine' · Castanea sativa",
	latin: "Castanea sativa Mill. 'Belle Épine' · Esskastanie, Edelkastanie, châtaignier",
	note: "Castanea sativa 'Belle Épine', a pure sweet chestnut of the Dordogne and a classic French orchard cultivar. A semi-erect tree, a stem clear to a metre and limbs spreading into a broad dome; long, glossy leaves with a bristle-tipped tooth at the end of each straight vein; at midsummer cream catkins standing out all over the crown; spiny green burrs at the shoot tips, turning tawny and splitting in October over one or two large dark-mahogany nuts.",
	from: 'Tree · 10 years from the nut',
	layer: 'canopy',
	stages: STAGES.map(({ name, t, note }) => ({ name, day: Math.round((t - STAGES[0].t) * 365), note })), // days from sowing
	// what a world needs to plant it right (spacing, light, how fast it grows and how big it gets); the sizes by age are
	// estimates fitted to the few anchors published (see the data sheet in the note)
	facts: {
		height: { at1: [0.25, 0.6], at2: [0.6, 1.2], at5: [3, 4], at10: [6, 7.5], at20: [9, 12], at30: [10, 15], at50: [17, 21], grown: [20, 30], unit: 'm' },
		trunk: { at5: [0.06, 0.08], at10: [0.16, 0.2], at20: [0.34, 0.4], at35: [0.5, 0.6], at50: [0.7, 0.9], unit: 'm diameter at 30 cm' },
		crown: { at10: [5, 6], at20: [7, 9], at30: [9, 11], at50: [12, 15], grown: [20, 25], unit: 'm across' },
		spacing: [10, 10], // about 100 trees a hectare
		shade: 'full sun; seedlings take half shade',
		climate: 'temperate: 8–15 °C mean, 600–1,500 mm rain without a long dry season, hardy to about −15 °C, late frosts hurt; acid to neutral soil, never chalky, deep and well drained',
		years: { graft: 1, firstFlowers: [3, 5], firstCrop: [5, 6], fullBearing: [15, 20], productive: [80, 150] },
		leaf: { length: [0.16, 0.22], width: [0.055, 0.075], life: [0.5, 0.58], unit: 'm, years' },
		catkin: { male: [0.12, 0.18], bisexual: [0.08, 0.12], unit: 'm' },
		burr: { width: [0.06, 0.07], nuts: [1, 2], days: [100, 115], unit: 'm across the spines, days from female bloom' },
		nut: { height: 0.035, width: 0.032, thick: 0.019, mass: [0.012, 0.017], perKg: [60, 80] },
		yield: { full: [15, 40], unit: 'kg nuts per tree a year (estimate)' },
		season: { leafOut: 'about 20 April', male: '20 June – 2 July', female: '30 June – 11 July', drop: '4–18 October', leafFall: 'November' },
	},
};

/** this version's build: a stage, a seed, a detail (1 as built), and the view (0 the plant, 1 one burr) */
function build(stage, seed, detail, fruit) {
	const make = fruit ? () => fruitView(stage ?? RIPE, `${seed ?? 'maia'}`) : () => grow(stage ?? RIPE, seed);
	return detail === undefined || detail >= 1 ? make() : lite(detailAt(detail), make);
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'chestnut' || variant) throw new Error(`no asset plants/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: {
			group: 'plants',
			id: 'chestnut',
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
module.exports.levels = [{ values: { detail: 0.25 } }, { values: { detail: 0.1 } }];

/** the organs on their own, for checking them against photographs of the real thing */
module.exports.organs = { BE, TREE, nut, nutGeometry, leaf, catkin, burr, burrSize, bud, Bag, timeAt, chestnutTree, axes, thicken, lite, detailAt };
