/*
 * TABLE-DINING-ROUND — a round solid oak dining table on one turned pedestal, as in Geoship's kitchen (pictures 8, 9).
 * Real measures: Ø 120 cm seats four to six (a round table wants ≈ 60 cm of rim a person; Ø 120 is the common size),
 * 75 cm high (the standard dining height, 72–76), a top of 4–4.5 cm solid oak; a pedestal table's foot ≈ half the top's
 * width so it cannot tip (Ø 62 here), its column ≈ 15 cm. Made of: the top a rounded slab (its edge eased 16 mm above,
 * 22 mm below), a spider plate under it, a turned column flaring into its foot, the foot a rounded disc on four felt
 * glides; oiled oak, the grain straight across the top and along the column.
 * Anchor: the middle of the foot on the floor (y 0); the top's surface at y 0.75.
 */

/*
 * THE KIT — the shared core of maiaCITY's natural-material builds (the forest dome and the things that furnish it), the
 * same in each of their sources: chance and noise that tiles, surfaces painted on canvases (colour, relief and
 * roughness, a tile in metres, so the page gets them filtered and mipmapped), the materials as they are in daylight,
 * shapes in metres with their UVs in metres, and the Bag that merges what is built by material (and, for a building, by
 * squares of the ground). 1 unit is 1 m; y up.
 */
const THREE = require('three');
const { mergeGeometries } = require('three/addons/utils/BufferGeometryUtils.js');
const { RoundedBoxGeometry } = require('three/addons/geometries/RoundedBoxGeometry.js');

/* ================================================================================================================
 * 1. CORE
 * ================================================================================================================ */

/** FNV-1a of a text, 32 bits */
function hashText(text) {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** a stream of numbers in 0 … 1, the same for the same keys every time (mulberry32) */
function chance(...keys) {
	let a = hashText(keys.join('|')) || 1;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => {
	const t = clamp(x);
	return t * t * (3 - 2 * t);
};
/** 0 below `a`, 1 above `b`, smooth between */
const span = (x, a, b) => smooth((x - a) / (b - a));
const between = (r, a, b) => a + (b - a) * r();
const TAU = Math.PI * 2;
/** a point on the ground at radius `r` and bearing `a` (0 north, +x east): [x, z] */
const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];

/* ---- noise that tiles: periodic value noise and cells on an integer lattice ---- */

/** a number in 0 … 1 for a lattice point */
function hash2(x, y, s) {
	let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mod = (a, n) => ((a % n) + n) % n;
/** value noise at (x, y) on a lattice of period (px, py) */
function vnoise(x, y, px, py, s) {
	const xi = Math.floor(x), yi = Math.floor(y);
	const fx = x - xi, fy = y - yi;
	const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
	const x0 = mod(xi, px), x1 = mod(xi + 1, px), y0 = mod(yi, py), y1 = mod(yi + 1, py);
	const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** fractal noise that tiles over the unit square: `f` lattice cells across (and `fy` down), 0 … 1 */
function fbm(u, v, f, octaves = 4, s = 0, fy = f) {
	let sum = 0, amp = 1, norm = 0, k = 1;
	for (let o = 0; o < octaves; o++) {
		const nx = Math.max(1, Math.round(f * k)), ny = Math.max(1, Math.round(fy * k));
		sum += amp * vnoise(u * nx, v * ny, nx, ny, s + o * 131);
		norm += amp;
		amp *= 0.5;
		k *= 2;
	}
	return sum / norm;
}
/** cells that tile over the unit square (`nx` × `ny`): F1, F2, the nearest cell's id and its centre */
function cells(u, v, nx, ny, s = 0, jitter = 1) {
	const cx = u * nx, cy = v * ny;
	const xi = Math.floor(cx), yi = Math.floor(cy);
	let f1 = 9, f2 = 9, id = 0, px = 0, py = 0;
	for (let i = -1; i <= 1; i++)
		for (let j = -1; j <= 1; j++) {
			const gx = xi + i, gy = yi + j;
			const wx = mod(gx, nx), wy = mod(gy, ny);
			const qx = gx + 0.5 + (hash2(wx, wy, s) - 0.5) * jitter, qy = gy + 0.5 + (hash2(wx, wy, s + 1) - 0.5) * jitter;
			const d = Math.hypot(qx - cx, qy - cy);
			if (d < f1) {
				f2 = f1;
				f1 = d;
				id = hash2(wx, wy, s + 2);
				px = qx / nx;
				py = qy / ny;
			} else if (d < f2) f2 = d;
		}
	return { f1, f2, id, px, py };
}

/* ---- pictures: painted on a canvas, so the page gets them filtered and mipmapped ---- */

const srgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
/** a canvas: the box's (an OffscreenCanvas), a page's, or a stand-in where there is neither (checking in node) */
function canvasOf(w, h) {
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	if (typeof document !== 'undefined') return Object.assign(document.createElement('canvas'), { width: w, height: h });
	return { width: w, height: h, getContext: () => ({ createImageData: (a, b) => ({ data: new Uint8ClampedArray(a * b * 4), width: a, height: b }), putImageData() {} }) };
}
/** a texture of `w` × `h` RGBA bytes, repeating, its colour space sRGB for a colour picture */
function picture(w, h, rgba, colour) {
	const c = canvasOf(w, h);
	const ctx = c.getContext('2d');
	const img = ctx.createImageData(w, h);
	img.data.set(rgba);
	ctx.putImageData(img, 0, 0);
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	t.anisotropy = 8;
	t.needsUpdate = true;
	return t;
}
/** pictures made so far (the box takes 64 at most) */
let PICTURES = 0;

/**
 * A surface: one tile painted at `px` × `py` pixels in one pass. `paint(u, v, o)` sets, for the pixel at u, v (0 … 1
 * across the tile): `o.h` its height 0 … 1 (for the relief), `o.c` its colour as linear [r, g, b], `o.k` its roughness
 * 0 … 1. Which pictures are made: `maps`, of 'map', 'normalMap' and 'roughnessMap'. The normal comes from the height's
 * slopes, `relief` how steep (the height's range over one pixel, in pixels).
 */
function surface({ px, py = px, paint, maps = ['map', 'normalMap', 'roughnessMap'], relief = 2 }) {
	PICTURES += maps.length;
	const n = px * py;
	const H = new Float32Array(n);
	const C = maps.includes('map') ? new Uint8ClampedArray(n * 4) : null;
	const K = maps.includes('roughnessMap') ? new Uint8ClampedArray(n * 4) : null;
	const o = { h: 0.5, c: [0.8, 0.8, 0.8], k: 0.8 };
	for (let y = 0, i = 0; y < py; y++)
		for (let x = 0; x < px; x++, i++) {
			paint(x / px, y / py, o);
			H[i] = o.h;
			if (C) {
				C[i * 4] = srgb(clamp(o.c[0])) * 255 + 0.5;
				C[i * 4 + 1] = srgb(clamp(o.c[1])) * 255 + 0.5;
				C[i * 4 + 2] = srgb(clamp(o.c[2])) * 255 + 0.5;
				C[i * 4 + 3] = 255;
			}
			if (K) {
				const g = clamp(o.k) * 255 + 0.5;
				K[i * 4] = K[i * 4 + 1] = K[i * 4 + 2] = g;
				K[i * 4 + 3] = 255;
			}
		}
	const out = {};
	if (C) out.map = picture(px, py, C, true);
	if (maps.includes('normalMap')) {
		const rgba = new Uint8ClampedArray(n * 4);
		for (let y = 0, i = 0; y < py; y++)
			for (let x = 0; x < px; x++, i++) {
				const l = H[y * px + mod(x - 1, px)], r = H[y * px + mod(x + 1, px)];
				const u = H[mod(y - 1, py) * px + x], d = H[mod(y + 1, py) * px + x];
				// the image's top row is v = 1 (flipY): down the rows is down v
				const nx = -(r - l) * 0.5 * relief, ny = (d - u) * 0.5 * relief;
				const k = 1 / Math.sqrt(nx * nx + ny * ny + 1);
				rgba[i * 4] = (nx * k * 0.5 + 0.5) * 255 + 0.5;
				rgba[i * 4 + 1] = (ny * k * 0.5 + 0.5) * 255 + 0.5;
				rgba[i * 4 + 2] = (k * 0.5 + 0.5) * 255 + 0.5;
				rgba[i * 4 + 3] = 255;
			}
		out.normalMap = picture(px, py, rgba, false);
	}
	if (K) out.roughnessMap = picture(px, py, K, false);
	return out;
}

/** a colour as linear [r, g, b] from '#rrggbb' */
const lin = (hex) => {
	const c = new THREE.Color(hex);
	return [c.r, c.g, c.b];
};
/** linear colours mixed, t clamped */
const mixc = (a, b, t) => {
	const k = clamp(t);
	return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const scalec = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/* ---- the materials: each a real surface, painted once, its tile in metres (TILE) for the shapes' UVs ---- */

/** how many metres one repeat of each material's pictures covers (a shape's UVs are laid in metres over it) */
const TILE = {};
const MAKERS = {};
const MADE = {};
/** a material by its name, made the first time it is asked for */
function mat(name) {
	if (MADE[name]) return MADE[name];
	const make = MAKERS[name];
	if (!make) throw new Error(`no material ${name}`);
	const m = make();
	m.name = name;
	return (MADE[name] = m);
}
/** declare a material: its tile in metres and how it is made */
function material(name, tile, make) {
	TILE[name] = tile;
	MAKERS[name] = make;
}

/* ---- geometry: shapes in metres, their UVs in metres over their material's tile ---- */

/**
 * UVs laid by the side each triangle faces (a box projection), in metres over `tile`: walls, slabs, stones and any
 * shape without UVs of its own read at their true scale. Made non-indexed where it must cut seams, then indexed again.
 */
function boxUV(geo, tile = 1) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const pos = g.attributes.position;
	const uv = new Float32Array(pos.count * 2);
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
	for (let i = 0; i < pos.count; i += 3) {
		a.fromBufferAttribute(pos, i);
		b.fromBufferAttribute(pos, i + 1);
		c.fromBufferAttribute(pos, i + 2);
		n.subVectors(c, b).cross(a.clone().sub(b));
		const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
		for (let k = 0; k < 3; k++) {
			const p = [a, b, c][k];
			let u, v;
			if (ay >= ax && ay >= az) (u = p.x), (v = p.z);
			else if (ax >= az) (u = p.z), (v = p.y);
			else (u = p.x), (v = p.y);
			uv[(i + k) * 2] = u / tile;
			uv[(i + k) * 2 + 1] = v / tile;
		}
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	if (!g.attributes.normal) g.computeVertexNormals();
	return g;
}
/** a shape's own UVs scaled so one unit is `su` (and `sv`) metres of its material's tile */
function scaleUV(geo, su, sv = su) {
	const uv = geo.attributes.uv;
	if (!uv) return geo;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
	uv.needsUpdate = true;
	return geo;
}

/**
 * A mesh made safe to draw on every GPU: triangles of no area out, every normal of no length given its faces' or up.
 * A zero normal is NaN on some GPUs, and one such pixel turns a metered frame black.
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
		if (!(n.lengthSq() > 1e-14)) continue;
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
	geo.setIndex(kept.length > 65535 * 3 || pos.count > 65535 ? new THREE.Uint32BufferAttribute(kept, 1) : new THREE.Uint16BufferAttribute(kept, 1));
	nor.needsUpdate = true;
	return geo;
}

/** a geometry with just position, normal and uv (and colour, where `colour`), indexed: ready to merge */
function plain(geo, colour) {
	let g = geo;
	if (!g.attributes.normal) g.computeVertexNormals();
	if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
	for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
	if (colour && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
	if (!colour && g.attributes.color) g.deleteAttribute('color');
	g.morphAttributes = {};
	if (!g.index) {
		const n = g.attributes.position.count;
		const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
		for (let i = 0; i < n; i++) idx[i] = i;
		g.setIndex(new THREE.BufferAttribute(idx, 1));
	}
	g.clearGroups();
	return g;
}

/**
 * THE BAG — everything a part of the dome is, gathered by material and by chunk (a square of `CHUNK` metres, so a walker's
 * rays and the camera's culling only meet what is near), merged at the end into one mesh per material and chunk.
 */
const CHUNK = 20;
class Bag {
	constructor(name) {
		this.name = name;
		/** material → chunk key → geometries */
		this.parts = new Map();
		this.tris = 0;
	}
	/**
	 * Add a shape of material `m` (its name), moved by `matrix` where given, UVs laid in metres where `uv` is 'box'.
	 * `chunk: false` keeps it out of the chunks (one big shape, a slab, the shell).
	 */
	add(m, geo, matrix, o = {}) {
		if (!geo?.attributes?.position?.count) return this;
		let g = o.uv === 'box' ? boxUV(geo, TILE[m] ?? 1) : geo;
		if (matrix) g.applyMatrix4(matrix);
		g = plain(g, !!o.colour);
		let key = 'all';
		if (o.chunk !== false) {
			g.computeBoundingBox();
			const c = g.boundingBox.getCenter(new THREE.Vector3());
			key = `${Math.floor(c.x / CHUNK)},${Math.floor(c.z / CHUNK)}`;
		}
		const k = `${m}${o.colour ? '#c' : ''}`;
		if (!this.parts.has(k)) this.parts.set(k, new Map());
		const by = this.parts.get(k);
		if (!by.has(key)) by.set(key, []);
		by.get(key).push(g);
		this.tris += g.index.count / 3;
		return this;
	}
	/** the bag as meshes: one per material and chunk, casting and catching shadows unless told otherwise */
	build(o = {}) {
		const group = new THREE.Group();
		group.name = this.name;
		for (const [k, by] of this.parts) {
			const [m, c] = k.split('#');
			for (const [key, list] of by) {
				const merged = sound(list.length === 1 ? list[0] : mergeGeometries(list));
				for (const g of list) if (g !== merged) g.dispose();
				if (!merged) continue;
				let material = mat(m);
				if (c) {
					material = MADE[`${m}#c`] ??= Object.assign(material.clone(), { vertexColors: true, name: `${m}#c` });
				}
				const mesh = new THREE.Mesh(merged, material);
				mesh.name = `${this.name}:${m}:${key}`;
				mesh.castShadow = o.castShadow?.(m) ?? true;
				mesh.receiveShadow = true;
				group.add(mesh);
			}
		}
		return group;
	}
}

/* ---- shape makers (centred where it says, real size, UVs in metres) ---- */

/** a box with rounded edges, w × h × d, its middle at the origin */
const rbox = (w, h, d, r = 0.02, seg = 3) => scaleUV(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), 1);
/** a plain box, its middle at the origin */
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
/** a lathe of [r, y] points round y, `seg` sides, its UVs u round (in metres of girth at the widest) and v along it */
function lathe(points, seg = 32, tile = 1) {
	const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
	const g = new THREE.LatheGeometry(pts, seg);
	let len = 0;
	for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
	const widest = Math.max(...points.map((p) => p[0]));
	return scaleUV(g, (TAU * widest) / tile, len / tile);
}
/** a round tube along `points` ([x, y, z]), radius `r`, its UVs along it in metres */
function tube(points, r, radial = 8, closed = false, tile = 1, steps) {
	const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
	const len = curve.getLength();
	const g = new THREE.TubeGeometry(curve, steps ?? Math.max(2, Math.ceil(len / 0.15)), r, radial, closed);
	return scaleUV(g, len / tile, (TAU * r) / tile);
}
/** a straight round bar from a to b */
function bar(a, b, r0, r1 = r0, radial = 12) {
	const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
	const len = A.distanceTo(B);
	const g = new THREE.CylinderGeometry(r1, r0, len, radial, 1);
	scaleUV(g, TAU * Math.max(r0, r1), len);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
	g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
	return g;
}
/** a flat shape from [x, y] points (counter-clockwise), with holes */
function shapeOf(points, holes = []) {
	const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
	for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
	return s;
}
/** a shape pushed `depth` along z, its edges rounded by `bevel`, UVs in metres */
function extrude(shape, depth, bevel = 0, segs = 3, curveSegments = 24) {
	const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments });
	g.translate(0, 0, bevel);
	return g;
}
/** a rounded rectangle w × h (corner radius r), centred, as points */
function roundRect(w, h, r, seg = 6) {
	const pts = [];
	const rr = Math.min(r, w / 2, h / 2);
	const corners = [
		[w / 2 - rr, -h / 2 + rr, -Math.PI / 2],
		[w / 2 - rr, h / 2 - rr, 0],
		[-w / 2 + rr, h / 2 - rr, Math.PI / 2],
		[-w / 2 + rr, -h / 2 + rr, Math.PI]
	];
	for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) {
		const a = a0 + (i / seg) * (Math.PI / 2);
		pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
	}
	return pts;
}
/** a superellipse (a soft rounded square or a pebble's plan) a × b, exponent n, as points */
function superellipse(a, b, n = 4, seg = 48) {
	const pts = [];
	for (let i = 0; i < seg; i++) {
		const t = (i / seg) * TAU, c = Math.cos(t), s = Math.sin(t);
		pts.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
	}
	return pts;
}
/**
 * A ribbon along a line on the ground (paths, the brook's water and bed): `width(t)` across at each point, laid at
 * `y(x, z)`, its UVs in metres along and across. Points [x, z].
 */
function ribbon(points, width, y = () => 0, across = 4) {
	const n = points.length;
	const pos = [], uv = [], idx = [];
	let along = 0;
	for (let i = 0; i < n; i++) {
		const [x, z] = points[i];
		const [px, pz] = points[Math.max(0, i - 1)], [nx, nz] = points[Math.min(n - 1, i + 1)];
		let dx = nx - px, dz = nz - pz;
		const l = Math.hypot(dx, dz) || 1;
		dx /= l;
		dz /= l;
		if (i) along += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
		const w = typeof width === 'function' ? width(i / (n - 1), i) : width;
		for (let j = 0; j <= across; j++) {
			const s = j / across - 0.5;
			const X = x - dz * s * w, Z = z + dx * s * w;
			pos.push(X, y(X, Z, s, i / (n - 1)), Z);
			uv.push(along, s * w);
		}
	}
	for (let i = 0; i < n - 1; i++)
		for (let j = 0; j < across; j++) {
			const a = i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1;
			idx.push(a, c, b, b, c, d);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
/** a matrix: at [x, y, z], turned `ry` round y (and `rx`, `rz`), scaled `s` */
function at(x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
	const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
	const sc = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
	return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, sc);
}
/** points of a smooth closed or open curve through [x, z] control points, every `step` metres */
function smoothLine(points, step = 0.5, closed = false) {
	const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
	const n = Math.max(2, Math.ceil(curve.getLength() / step));
	return curve.getSpacedPoints(n).map((p) => [p.x, p.z]);
}

/* ---- the materials, as they are in daylight (colours linear, roughness as the real surface reads) ---- */

/**
 * How much of the sky an indoor surface sees: the page lights everything by the open sky's light as well as the sun's,
 * and a room under the closed shell sees little of that sky; so the materials that are mostly indoors take a part of
 * it (their reflections and their shade), the rest of their light the sun's through the glass and the lamps'.
 */
const INDOOR = 0.32;

/** surfaces shared by several materials (a colour tints them): painted once */
const SHARED = {};
const shared = (name, make) => (SHARED[name] ??= make());
const C = {};
/** a named colour, parsed once, linear */
const col = (hex) => (C[hex] ??= lin(hex));

// the bioceramic panels outside and the frames round the glass: a matt warm white, finely porous, faintly clouded
material('ceramic', 1.6, () => {
	const s = shared('ceramic', () =>
		surface({
			px: 512,
			relief: 1.2,
			paint: (u, v, o) => {
				const c = cells(u, v, 90, 90, 11, 0.9);
				const pit = 1 - smooth((0.16 - c.f1) * 9);
				const cloud = fbm(u, v, 3, 3, 13) - 0.5;
				o.h = 0.7 + 0.3 * pit;
				o.c = scalec(col('#efe9de'), 1 + cloud * 0.07 - (1 - pit) * 0.05);
				o.k = 0.62 + cloud * 0.12 - (1 - pit) * 0.1;
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, specularIntensity: 0.45, normalScale: new THREE.Vector2(0.6, 0.6) });
});

// the inside of the closed panels: a warm sand lime render, trowelled (the faceted walls of the rooms)
material('relief', 2.2, () => {
	const s = shared('relief', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 1.6,
			paint: (u, v, o) => {
				const sweep = fbm(u, v, 5, 3, 23, 9);
				const sand = hash2((u * 512) | 0, (v * 512) | 0, 29);
				const cloud = fbm(u, v, 2, 2, 37) - 0.5;
				o.h = 0.7 * sweep + 0.12 * sand;
				o.c = scalec(mixc(col('#d8c2a3'), col('#cdb08c'), 0.5 + cloud * 1.6), 0.97 + o.h * 0.06);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: INDOOR });
});

/**
 * Oak as it is sawn (Samuel 2026-11-05: the first draft's bold figure read most like wood): its growth rings as long
 * wavy lines along u, warped into the arches of flat-sawn boards, early and late wood in two browns, a few open pores;
 * finished satin (oiled), never glossy. `planks`: a floor of staggered boards 0.2 × 2 m over 2 m.
 */
const woodSurface = (seed, planks) =>
	surface({
		px: planks ? 768 : 512,
		py: planks ? 768 : 256,
		relief: 1.1,
		paint: (u, v, o) => {
			let pu = u, pv = v, gap = 0, tone = 0;
			if (planks) {
				const row = Math.floor(v * 10);
				pu = mod(u + hash2(row, 0, seed), 1);
				const f = v * 10 - row;
				gap = Math.min(f, 1 - f) < 0.012 || Math.min(pu, 1 - pu) < 0.003 ? 1 : 0;
				pv = f + row * 0.37;
				tone = (hash2(row, 7, seed) - 0.5) * 0.18;
			}
			const warp = fbm(pu, pv, 2, 3, seed + 3, 6) * 2.4;
			const ring = Math.pow(Math.abs(Math.sin((pv * 18 + warp) * Math.PI)), 6);
			const pore = hash2((pu * 900) | 0, (pv * 260) | 0, seed + 5) > 0.93 ? 1 : 0;
			o.h = 0.75 - 0.22 * ring - 0.12 * pore - 0.6 * gap;
			o.c = scalec(mixc(col('#c79a68'), col('#a8774a'), ring * 0.8 + (warp / 2.4 - 0.5) * 0.6), 1 + tone - (1 - o.h) * 0.6);
			// oiled oak is satin, not glossy: a soft sheen, never a glare
			o.k = 0.62 + (1 - o.h) * 0.25;
		}
	});
// oiled oak for furniture, rails and doors (its grain along u)
material('oak', 1.2, () => {
	const s = shared('oak', () => woodSurface(41, false));
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, clearcoat: 0.05, clearcoatRoughness: 0.65, specularIntensity: 0.6, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: INDOOR * 1.1 });
});
// a lighter limed oak for the floors: boards 20 cm by 2 m
material('floor', 2, () => {
	const s = shared('floor', () => woodSurface(43, true));
	return new THREE.MeshPhysicalMaterial({ color: '#efe4d6', ...s, roughness: 1, clearcoat: 0.05, clearcoatRoughness: 0.6, specularIntensity: 0.7, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: INDOOR });
});
// weathered oak outside the rooms (the bridges, the forest's benches): silvered
material('timber', 1.2, () => {
	const s = shared('oak', () => woodSurface(41, false));
	return new THREE.MeshStandardMaterial({ color: '#b3aa9c', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});

// travertine: cream, with the long pores of its bedding (tables, the bathrooms, sills)
material('travertine', 1, () => {
	const s = shared('travertine', () =>
		surface({
			px: 512,
			relief: 2,
			paint: (u, v, o) => {
				// honed and filled, as a vanity's or a table's top is: its pores small (a few millimetres, longer along the
				// bedding), most of them filled flush in a paler tone, a few left open; the bedding in soft bands
				const bed = fbm(u, v, 2, 3, 51, 14);
				const pore = bed > 0.5 ? cells(u, v, 34, 140, 53, 1) : null;
				const hole = pore ? smooth((0.2 - pore.f1) * 9) : 0;
				const open = hole > 0 && pore.id > 0.8;
				o.h = 0.85 - (open ? 0.3 : 0.04) * hole;
				const stone = mixc(col('#e7dcc8'), col('#cdb895'), bed * 1.1 - 0.15);
				o.c = scalec(mixc(stone, open ? col('#a8956f') : col('#efe6d4'), hole * (open ? 0.7 : 0.45)), 0.94 + o.h * 0.06);
				o.k = 0.3 + (open ? hole * 0.4 : 0);
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, specularIntensity: 0.6, envMapIntensity: INDOOR * 1.2 });
});

// limestone for the arcade: honed blocks, warm grey-cream, with fossil grain and a little weathering
material('limestone', 1.5, () => {
	const s = shared('limestone', () =>
		surface({
			px: 512,
			relief: 2.2,
			paint: (u, v, o) => {
				const w = fbm(u, v, 3, 4, 65);
				const grain = hash2((u * 512) | 0, (v * 512) | 0, 63);
				const stain = span(fbm(u, v, 2, 2, 67), 0.6, 0.85);
				o.h = 0.6 + 0.3 * w + 0.1 * grain;
				o.c = scalec(mixc(mixc(col('#ddd2bd'), col('#c9bb9f'), w), col('#a99f8c'), stain * 0.5), 0.92 + o.h * 0.1 - grain * 0.04);
				o.k = 0.85;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// lime plaster for the rooms' walls: warm white, soft and uneven
material('plaster', 2, () => {
	const p = shared('plaster', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 1,
			paint: (u, v, o) => {
				// a trowelled lime finish: soft undulation only (a per-pixel grain in its relief shimmered as a screen-door
				// pattern across a wall); its sand a faint speckle in the colour alone
				o.h = 0.75 * fbm(u, v, 4, 3, 71) + 0.25 * fbm(u, v, 24, 2, 73);
				const sand = hash2((u * 512) | 0, (v * 512) | 0, 73);
				o.c = scalec(col('#eee5d6'), 0.97 + (o.h - 0.5) * 0.07 + (sand - 0.5) * 0.02);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: p.map, normalMap: p.normalMap, roughness: 0.92, envMapIntensity: INDOOR });
});

/** a plain weave: threads over and under, `n` threads to the tile, slubs in them */
const weave = (seed, n) =>
	surface({
		px: 256,
		maps: ['map', 'normalMap'],
		relief: 3,
		paint: (u, v, o) => {
			const a = Math.sin(u * n * TAU), b = Math.sin(v * n * TAU);
			const over = (Math.floor(u * n * 2) + Math.floor(v * n * 2)) % 2 ? a : b;
			const slub = fbm(u, v, n / 4, 2, seed, 2) - 0.5;
			o.h = 0.5 + 0.35 * Math.abs(over) + 0.3 * slub;
			o.c = scalec([0.85, 0.85, 0.85], 0.85 + o.h * 0.2);
		}
	});
// linen: bedding, curtains, cushions (tinted by its colour)
const fabric = (name, colour, o = {}) =>
	material(name, 0.12, () => {
		const s = shared('linen', () => weave(81, 40));
		return new THREE.MeshPhysicalMaterial({ color: colour, map: s.map, normalMap: s.normalMap, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(colour).lerp(new THREE.Color('#ffffff'), 0.4), side: o.side ?? THREE.FrontSide, envMapIntensity: INDOOR });
	});
fabric('linen', '#f2ede4');
fabric('linen-oat', '#d8cbb4');
fabric('linen-rust', '#b5643f');
fabric('linen-sage', '#9aa58a');
fabric('linen-clay', '#c9a38a');
fabric('curtain', '#f3eee6', { side: THREE.DoubleSide });
// bouclé: loops of wool, for the sofas and chairs
const loops = (name, colour) =>
	material(name, 0.1, () => {
		const s = shared('boucle', () =>
			surface({
				px: 256,
				maps: ['map', 'normalMap'],
				relief: 4,
				paint: (u, v, o) => {
					const c = cells(u, v, 22, 22, 91, 1);
					o.h = smooth(1 - c.f1 * 1.6) * 0.85 + 0.15 * c.id;
					o.c = scalec([0.9, 0.9, 0.9], 0.78 + o.h * 0.3);
				}
			})
		);
		return new THREE.MeshPhysicalMaterial({ color: colour, map: s.map, normalMap: s.normalMap, roughness: 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(colour), envMapIntensity: INDOOR });
	});
loops('boucle', '#ece4d6');
loops('boucle-sand', '#d6c2a2');

// jute: a round braided rug, its UVs u round and v out from the middle (rings of braid)
material('jute', 0.25, () => {
	const s = shared('jute', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 4,
			paint: (u, v, o) => {
				const braid = Math.abs(Math.sin(v * 8 * Math.PI)) * 0.6 + 0.4 * Math.abs(Math.sin((u * 40 + (Math.floor(v * 8) % 2) * 0.5) * Math.PI));
				o.h = braid * 0.85 + 0.15 * hash2((u * 256) | 0, (v * 256) | 0, 101);
				o.c = scalec(col('#b49867'), 0.7 + o.h * 0.45);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.95, envMapIntensity: INDOOR });
});

// terracotta: pots and the kitchens' floor tiles, unglazed, a little blotched
material('terracotta', 0.6, () => {
	const s = shared('terracotta', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 1.5,
			paint: (u, v, o) => {
				const b = fbm(u, v, 3, 3, 113);
				o.h = 0.6 + 0.4 * hash2((u * 256) | 0, (v * 256) | 0, 111) * 0.5 + 0.2 * b;
				o.c = scalec(mixc(col('#b0603c'), col('#c7835a'), b), 0.9 + o.h * 0.15);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.88 });
});

// the paths (Samuel 2026-11-05): light grey-whitish rounded-stone gravel, pea gravel of river pebbles 6–14 mm packed
// together, white to pale grey with a few warmer and bluer stones, each a little dome with soft shade in the gaps
material('gravel', 0.6, () => {
	const s = shared('gravel', () =>
		surface({
			px: 512,
			relief: 3.5,
			paint: (u, v, o) => {
				const p = cells(u, v, 58, 58, 121, 1);
				// each pebble a rounded dome over its cell (a little elongated by its own turn), the gaps between in shade
				const dome = smooth(1 - p.f1 * 1.7);
				const gap = 1 - smooth((p.f2 - p.f1) * 7);
				const tone = p.id;
				const stone = tone < 0.12 ? col('#cfc6b8') : tone < 0.2 ? col('#b9bcc0') : mixc(col('#e9e7e2'), col('#c9c8c4'), (tone - 0.2) / 0.8);
				o.h = 0.25 + 0.7 * dome - 0.25 * gap;
				o.c = mixc(scalec(stone, 0.88 + 0.14 * dome), col('#8e8a84'), gap * 0.75);
				o.k = 0.62 - dome * 0.12 + gap * 0.3;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// the forest floor: dark humus under a litter of fallen leaves, each an elongated leaf lying its own way, overlapping
// (the vertex colour darkens it near water)
/** the nearest leaf of a layer at u, v: its cell's leaf laid at its own angle, its distance in leaf lengths (< 1 on it) */
function leafAt(u, v, n, s, len, wid) {
	const c = cells(u, v, n, n, s, 1);
	let dx = (u - c.px) * n, dy = (v - c.py) * n;
	dx -= Math.round(dx / n) * n;
	dy -= Math.round(dy / n) * n;
	const a = c.id * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
	const x = dx * ca + dy * sa, y = -dx * sa + dy * ca;
	// a leaf: pointed at both ends (its width falls toward its tips), with a midrib
	const t = x / len;
	const half = wid * Math.max(0, 1 - t * t) * (1 - 0.25 * t);
	const across = half > 1e-4 ? Math.abs(y) / half : 9;
	return { on: Math.abs(t) < 1 && across < 1, rib: Math.abs(y) < 0.012 && Math.abs(t) < 0.95, edge: across, id: c.id };
}
material('soil', 2.5, () => {
	const s = shared('soil', () =>
		surface({
			// only where the page cannot lay the floor's biome (the viewer paints the biome over it): small
			px: 256,
			relief: 2.5,
			paint: (u, v, o) => {
				const grain = hash2((u * 256) | 0, (v * 256) | 0, 149);
				const top = leafAt(u, v, 30, 141, 0.46, 0.19);
				const low = top.on ? null : leafAt(u, v, 22, 143, 0.5, 0.22);
				const leaf = top.on ? top : low?.on ? low : null;
				const humus = mixc(col('#30241a'), col('#4a3826'), grain * 0.6 + fbm(u, v, 6, 2, 147) * 0.4);
				if (leaf) {
					const brown = mixc(mixc(col('#7d6340'), col('#4f3a25'), leaf.id), col('#a88a5a'), (leaf.id * 7) % 1 < 0.12 ? 0.55 : 0);
					const shade = leaf === top ? 1 : 0.72;
					o.h = (leaf === top ? 0.75 : 0.55) - 0.15 * leaf.edge * leaf.edge + (leaf.rib ? 0.06 : 0);
					o.c = scalec(brown, shade * (0.85 + grain * 0.2) * (leaf.rib ? 1.12 : 1) * (1 - 0.25 * leaf.edge * leaf.edge));
					o.k = 0.82;
				} else {
					o.h = 0.25 + 0.2 * grain;
					o.c = scalec(humus, 0.8 + grain * 0.4);
					o.k = 0.95;
				}
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// river stones: smooth, grey to sandy, mottled (the brook's banks and bed, stepping stones)
material('stone', 0.6, () => {
	const s = shared('stone', () =>
		surface({
			px: 256,
			relief: 1,
			paint: (u, v, o) => {
				const f = fbm(u, v, 4, 4, 161);
				o.h = 0.6 + 0.3 * f;
				o.c = scalec(mixc(col('#8e8a82'), col('#b7aa94'), fbm(u, v, 2, 2, 163)), 0.85 + f * 0.2);
				o.k = 0.55 + (1 - f) * 0.3;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});
// wet stone under the water: darker, smoother
material('stone-wet', 0.6, () => {
	mat('stone');
	const s = SHARED.stone;
	return new THREE.MeshStandardMaterial({ color: '#8a8478', map: s.map, normalMap: s.normalMap, roughness: 0.3 });
});

// flagstones: irregular limestone slabs in a crazy paving, mortar between (the arcade, the plaza before the rooms)
material('flag', 3, () => {
	const s = shared('flag', () =>
		surface({
			px: 512,
			relief: 2.5,
			paint: (u, v, o) => {
				const c = cells(u, v, 7, 7, 171, 0.8);
				const joint = 1 - smooth((c.f2 - c.f1) * 18);
				const grain = hash2((u * 512) | 0, (v * 512) | 0, 173);
				const slab = mixc(col('#cdbfa6'), col('#a99a82'), c.id * 0.8 + grain * 0.2);
				o.h = 0.8 - 0.6 * joint + 0.08 * grain;
				o.c = mixc(scalec(slab, 0.92 + grain * 0.1), col('#7a7064'), joint);
				o.k = 0.7 + joint * 0.25;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// the brook's and the pond's water: clear, a little tea-brown in its depth, its surface rippled
material('water', 2, () => {
	const s = shared('water', () =>
		surface({
			px: 256,
			maps: ['normalMap'],
			relief: 1.5,
			paint: (u, v, o) => {
				o.h = 0.5 * fbm(u, v, 6, 3, 181) + 0.5 * fbm(u, v, 3, 2, 183, 9);
			}
		})
	);
	// shallow forest water is dark and clear: its bed seen through it near, the light of the trees and the glass in it
	// softly; not a mirror of the open sky (which turned a brook white seen at a low angle)
	return new THREE.MeshPhysicalMaterial({ color: '#2c3a30', normalMap: s.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.2, metalness: 0, ior: 1.33, specularIntensity: 0.45, envMapIntensity: 0.35, transparent: true, opacity: 0.72, depthWrite: false });
});

// the glass of the shell and the façades: clear, faintly green at its edges
material('glass', 1, () => new THREE.MeshPhysicalMaterial({ color: '#eef4f1', roughness: 0.03, metalness: 0, ior: 1.52, specularIntensity: 1, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
// the doors' and windows' frames: dark bronzed steel, and brass for taps and handles
material('bronze', 1, () => new THREE.MeshStandardMaterial({ color: '#3f362c', metalness: 0.85, roughness: 0.42 }));
material('brass', 1, () => new THREE.MeshStandardMaterial({ color: '#c9a565', metalness: 1, roughness: 0.28 }));
// glazed ceramic (the tubs, basins, the white of a mushroom lamp's foot)
material('glaze', 1, () => new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: INDOOR * 1.2 }));
// a paper lantern's shade, lit from inside
material('paper', 0.5, () => {
	const s = shared('paper', () =>
		surface({
			px: 256,
			maps: ['map'],
			paint: (u, v, o) => {
				o.c = scalec([1, 0.97, 0.92], 0.9 + 0.1 * fbm(u, v, 40, 2, 191, 8));
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#fff8ee', map: s.map, emissive: '#ffcf96', emissiveMap: s.map, emissiveIntensity: 1.6, roughness: 0.9, side: THREE.DoubleSide });
});
// a lamp's opal glass, lit
material('opal', 1, () => new THREE.MeshStandardMaterial({ color: '#fffaf2', emissive: '#ffd6a0', emissiveIntensity: 2.2, roughness: 0.4 }));
// a green roof of sedum on the arcade: low mats of green, bronze and red
material('sedum', 1, () => {
	const s = shared('sedum', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 3,
			paint: (u, v, o) => {
				const c = cells(u, v, 70, 70, 201, 1);
				const patch = fbm(u, v, 9, 3, 205);
				o.h = smooth(1 - c.f1 * 1.8) * 0.8 + 0.2 * c.id;
				const green = mixc(col('#6c7d38'), col('#8f9446'), c.id);
				o.c = scalec(mixc(green, col('#8e5638'), span(patch, 0.55, 0.75) * 0.8), 0.55 + o.h * 0.6);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.9 });
});
// zellige: hand-made glazed tiles of 10 cm, each a little uneven, for the bathrooms
material('zellige', 0.5, () => {
	const s = shared('zellige', () =>
		surface({
			px: 512,
			relief: 1.5,
			paint: (u, v, o) => {
				const x = (u * 5) % 1, y = (v * 5) % 1;
				const joint = Math.min(x, 1 - x, y, 1 - y) < 0.025;
				const t = hash2(Math.floor(u * 5), Math.floor(v * 5), 213);
				const wob = fbm(u, v, 20, 2, 211);
				o.h = joint ? 0.2 : 0.7 + 0.15 * wob;
				o.c = joint ? col('#d9d3c7') : scalec(mixc(col('#dfe6dc'), col('#b9cbbf'), t), 0.95 + (wob - 0.5) * 0.15);
				o.k = joint ? 0.9 : 0.12 + (wob - 0.5) * 0.1;
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.15, envMapIntensity: INDOOR * 1.2 });
});
// bark for the logs the mushrooms grow on and the posts the climbers climb
material('bark', 0.8, () => {
	const s = shared('bark', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 3,
			paint: (u, v, o) => {
				const c = cells(u, v, 3, 12, 223);
				const fissure = 1 - smooth((c.f2 - c.f1) * 9);
				o.h = 0.65 - 0.45 * fissure + 0.1 * c.id;
				o.c = scalec(mixc(col('#4a3d31'), col('#6e6152'), c.id), 0.6 + o.h * 0.6);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.95 });
});
// a plain dark for the shadow gaps and the feet of furniture
material('shadow', 1, () => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));

/* ---- the shapes these oak things share: wood laid with its grain, turned parts, rounded slabs, bent panels ---- */

/** box UVs in metres over the oak's tile, the grain running along `axis` ('x', 'y' or 'z') */
function t_grain(geo, axis = 'x', tile = TILE.oak) {
	const turn = axis === 'y' ? new THREE.Matrix4().makeRotationZ(-Math.PI / 2) : axis === 'z' ? new THREE.Matrix4().makeRotationY(Math.PI / 2) : null;
	if (!turn) return boxUV(geo, tile);
	geo.applyMatrix4(turn);
	const g = boxUV(geo, tile);
	g.applyMatrix4(turn.clone().invert());
	return g;
}

/** box UVs in metres, each triangle's grain along the axis `pick(x, y, z)` gives for its middle (mitred frames) */
function t_grainBy(geo, pick, tile = TILE.oak) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const pos = g.attributes.position;
	const uv = new Float32Array(pos.count * 2);
	const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3();
	// each axis turned onto x: y → (y, −x, z), z → (z, y, −x)
	const turn = { x: (p) => [p.x, p.y, p.z], y: (p) => [p.y, -p.x, p.z], z: (p) => [p.z, p.y, -p.x] };
	for (let i = 0; i < pos.count; i += 3) {
		for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(pos, i + k);
		const f = turn[pick((P[0].x + P[1].x + P[2].x) / 3, (P[0].y + P[1].y + P[2].y) / 3, (P[0].z + P[1].z + P[2].z) / 3)];
		const q = P.map((p) => new THREE.Vector3(...f(p)));
		n.subVectors(q[2], q[1]).cross(q[0].clone().sub(q[1]));
		const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
		for (let k = 0; k < 3; k++) {
			const p = q[k];
			const [u, v] = ay >= ax && ay >= az ? [p.x, p.z] : ax >= az ? [p.z, p.y] : [p.x, p.y];
			uv[(i + k) * 2] = u / tile;
			uv[(i + k) * 2 + 1] = v / tile;
		}
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	if (!g.attributes.normal) g.computeVertexNormals();
	return g;
}

/** a turned part (a leg, a column, a knob): a lathe of [r, y] points, its UVs in metres, the grain along its length */
function t_turn(points, seg = 24, tile = TILE.oak, phi = TAU) {
	const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
	const g = new THREE.LatheGeometry(pts, seg, 0, phi);
	const along = [0];
	for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + pts[i].distanceTo(pts[i - 1]));
	const widest = Math.max(...points.map((p) => p[0]));
	// round it, a whole number of tiles, so the pictures meet where the lathe closes
	const round = phi < TAU ? (phi * widest) / tile : Math.max(1, Math.round((phi * widest) / tile));
	const uv = g.attributes.uv, pos = g.attributes.position;
	// wood: turned from a board whose rings lie in flat sheets, so across the grain the picture reads by depth (z):
	// broad figure on two faces, close lines on the other two, and no seam
	const wood = tile === TILE.oak;
	for (let k = 0; k < uv.count; k++) {
		const i = Math.floor(k / pts.length), j = k % pts.length;
		uv.setXY(k, along[j] / tile, wood ? pos.getZ(k) / tile + 0.31 : (i / seg) * round);
	}
	return g;
}

/** a profile of a turned leg: [r, y] from its foot (y 0) to its top (y len), swelling a third of the way up */
function t_legProfile(len, rTop, rMid, rFoot, n = 14) {
	const pts = [[0, 0], [rFoot * 0.85, 0], [rFoot, len * 0.008]];
	for (let i = 1; i <= n; i++) {
		const t = i / n;
		const swell = Math.sin(Math.PI * Math.min(1, t / 0.66) * 0.5);
		const r = t < 0.34 ? lerp(rFoot, rMid, smooth(t / 0.34)) : lerp(rMid, rTop, smooth((t - 0.34) / 0.66));
		pts.push([r * (0.995 + 0.005 * swell), len * t]);
	}
	pts.push([0, len]);
	return pts;
}

/** a round rod from a to b (a spindle, a stretcher), turned with a swell, its grain along it */
function t_rod(a, b, r0, r1 = r0, swell = 0, seg = 12) {
	const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
	const len = A.distanceTo(B);
	const pts = [];
	const n = swell ? 8 : 1;
	pts.push([0, 0]);
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		pts.push([lerp(r0, r1, t) + swell * Math.sin(Math.PI * t), len * t]);
	}
	pts.push([0, len]);
	const g = t_turn(pts, seg);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
	g.applyMatrix4(new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)));
	return g;
}

/**
 * A rounded slab whose plan is star-shaped round [cx, cz] (a seat, a round top, a tray): `edge(a)` its outline at
 * angle a (0 … 2π) as [x, z], `top(x, z)` and `bottom(x, z)` the heights of its faces, every edge rounded by `r`
 * (`rb` underneath). Smooth normals all over; no UVs (lay them with t_grain or boxUV).
 */
function t_slab({ edge, top, bottom, r = 0.01, rb = r, n = 64, rings = 6, round = 4, cx = 0, cz = 0 }) {
	const E = [], N = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * TAU;
		const p = edge(a), p0 = edge(a - 1e-3), p1 = edge(a + 1e-3);
		let nx = p1[1] - p0[1], nz = -(p1[0] - p0[0]);
		const l = Math.hypot(nx, nz) || 1;
		nx /= l;
		nz /= l;
		if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) (nx = -nx), (nz = -nz);
		E.push(p);
		N.push([nx, nz]);
	}
	const rows = [];
	const at = (i, inset) => [E[i][0] - N[i][0] * inset, E[i][1] - N[i][1] * inset];
	const inner = (i, s, inset) => {
		const [x, z] = at(i, inset);
		return [cx + (x - cx) * s, cz + (z - cz) * s];
	};
	// the top, from near the middle out to where the rounding starts
	for (let k = 1; k <= rings; k++) rows.push((i) => { const [x, z] = inner(i, k / rings, r); return [x, top(x, z), z]; });
	// the rounded edge: a quarter down from the top, the side, a quarter into the bottom
	for (let k = 1; k <= round; k++) {
		const f = (k / round) * (Math.PI / 2);
		rows.push((i) => { const [x0, z0] = at(i, r); const ty = top(x0, z0); const [x, z] = at(i, r - r * Math.sin(f)); return [x, ty - r + r * Math.cos(f), z]; });
	}
	for (let k = 0; k <= round; k++) {
		const f = Math.PI / 2 + (k / round) * (Math.PI / 2);
		rows.push((i) => { const [x0, z0] = at(i, rb); const by = bottom(x0, z0); const [x, z] = at(i, rb - rb * Math.sin(f)); return [x, by + rb + rb * Math.cos(f), z]; });
	}
	for (let k = rings; k >= 1; k--) rows.push((i) => { const [x, z] = inner(i, k / rings, rb); return [x, bottom(x, z), z]; });
	const pos = [cx, top(cx, cz), cz];
	for (const row of rows) for (let i = 0; i < n; i++) pos.push(...row(i));
	const bot = pos.length / 3;
	pos.push(cx, bottom(cx, cz), cz);
	const idx = [];
	for (let i = 0; i < n; i++) idx.push(0, 1 + ((i + 1) % n), 1 + i);
	for (let k = 0; k < rows.length - 1; k++)
		for (let i = 0; i < n; i++) {
			const a = 1 + k * n + i, b = 1 + k * n + ((i + 1) % n), c = a + n, d = b + n;
			idx.push(a, b, c, b, d, c);
		}
	const last = 1 + (rows.length - 1) * n;
	for (let i = 0; i < n; i++) idx.push(bot, last + i, last + ((i + 1) % n));
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// wound so the top faces up
	const nor = g.attributes.normal;
	if (nor.getY(0) < 0) {
		const ix = g.index.array;
		for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
		g.computeVertexNormals();
	}
	return g;
}

/**
 * Triangles cut by upright planes every `max` metres along x (the same planes for all, so neighbours meet without
 * cracks): a flat panel then bends smoothly. Every attribute is carried and the normals kept unit length.
 */
function t_split(geo, max = 0.04) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const names = Object.keys(g.attributes), sizes = names.map((k) => g.attributes[k].itemSize), arrs = names.map((k) => g.attributes[k].array);
	const W = sizes.reduce((a, b) => a + b, 0);
	const px = names.slice(0, names.indexOf('position')).reduce((a, k) => a + g.attributes[k].itemSize, 0);
	const vert = (i) => {
		const v = new Float64Array(W);
		let o = 0;
		for (let a = 0; a < names.length; a++) for (let c = 0; c < sizes[a]; c++) v[o++] = arrs[a][i * sizes[a] + c];
		return v;
	};
	const mix = (a, b, t) => {
		const v = new Float64Array(W);
		for (let k = 0; k < W; k++) v[k] = a[k] + (b[k] - a[k]) * t;
		return v;
	};
	/** the part of a polygon on one side of the plane x = c (above it when `up`) */
	const clip = (poly, c, up) => {
		const out = [];
		for (let i = 0; i < poly.length; i++) {
			const a = poly[i], b = poly[(i + 1) % poly.length];
			const ina = up ? a[px] >= c : a[px] <= c, inb = up ? b[px] >= c : b[px] <= c;
			if (ina) out.push(a);
			if (ina !== inb) out.push(mix(a, b, (c - a[px]) / (b[px] - a[px])));
		}
		return out;
	};
	const tris = [];
	const n = g.attributes.position.count;
	for (let i = 0; i < n; i += 3) {
		const t = [vert(i), vert(i + 1), vert(i + 2)];
		const lo = Math.min(t[0][px], t[1][px], t[2][px]), hi = Math.max(t[0][px], t[1][px], t[2][px]);
		const k0 = Math.floor(lo / max), k1 = Math.ceil(hi / max);
		if (k1 - k0 <= 1) {
			tris.push(t[0], t[1], t[2]);
			continue;
		}
		for (let k = k0; k < k1; k++) {
			const poly = clip(clip(t, k * max, true), (k + 1) * max, false);
			for (let j = 1; j < poly.length - 1; j++) tris.push(poly[0], poly[j], poly[j + 1]);
		}
	}
	const r = new THREE.BufferGeometry();
	let o = 0;
	names.forEach((k, a) => {
		const arr = new Float32Array(tris.length * sizes[a]);
		tris.forEach((v, i) => { for (let c = 0; c < sizes[a]; c++) arr[i * sizes[a] + c] = v[o + c]; });
		if (k === 'normal') for (let i = 0; i < tris.length; i++) {
			const l = Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]) || 1;
			arr[i * 3] /= l;
			arr[i * 3 + 1] /= l;
			arr[i * 3 + 2] /= l;
		}
		r.setAttribute(k, new THREE.BufferAttribute(arr, sizes[a]));
		o += sizes[a];
	});
	return r;
}

/**
 * A flat part bent round a vertical axis: x becomes the length along an arc of radius `R` (at z 0) round a centre at
 * [0, −R] (R > 0: bulging toward +z; R < 0: hollow toward +z), z its offset out from it; normals turned with it.
 */
function t_bend(geo, R) {
	const pos = geo.attributes.position, nor = geo.attributes.normal;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), z = pos.getZ(i), a = x / R, r = R + z;
		pos.setXYZ(i, r * Math.sin(a), pos.getY(i), r * Math.cos(a) - R);
		if (nor) {
			const nx = nor.getX(i), nz = nor.getZ(i), c = Math.cos(a), s = Math.sin(a);
			nor.setXYZ(i, nx * c + nz * s, nor.getY(i), -nx * s + nz * c);
		}
	}
	pos.needsUpdate = true;
	return geo;
}

/** a flat plate of a plan outline ([x, z] points), `thick` high from y 0, its edges rounded by `bevel` (which it grows by) */
function t_plate(points, thick, bevel = 0, segs = 3, curve = 24, holes = []) {
	const flip = (pts) => pts.map(([x, z]) => [x, -z]);
	const g = extrude(t_shape(flip(points), holes.map(flip)), thick, bevel, segs, curve);
	g.rotateX(-Math.PI / 2);
	return g;
}

/** an upright plate of an elevation outline ([x, y] points), `thick` deep from z 0 toward +z, edges rounded by `bevel` */
function t_panel(points, thick, bevel = 0, segs = 3, curve = 24, holes = []) {
	return extrude(t_shape(points, holes), thick, bevel, segs, curve);
}

/** a shape whose outline runs counter-clockwise and its holes clockwise, as extruding wants them (else holes face in) */
function t_shape(points, holes = []) {
	const cw = (pts) => THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)));
	const outer = cw(points) ? points.slice().reverse() : points;
	return shapeOf(outer, holes.map((h) => (cw(h) ? h : h.slice().reverse())));
}

/**
 * A plan outline: the band between radii r0 and r1 round [0, cz] from angle a0 to a1 (0 = toward +z, π/2 = +x), its
 * four corners rounded by `cr` (half its width: its ends half round). Points [x, z], counter-clockwise seen from above.
 */
function t_arcBand(cz, r0, r1, a0, a1, cr, n = 48, ends = 8) {
	const h = (r1 - r0) / 2;
	cr = Math.min(cr ?? h, h);
	const P = (r, a) => [r * Math.sin(a), cz + r * Math.cos(a)];
	const d1 = cr / (r1 - cr), d0 = cr / (r0 + cr);
	const pts = [];
	/** a quarter round centred at radius rc, angle ac, from direction (p, q) to (p2, q2) in (radial, tangent) */
	const corner = (rc, ac, from, to) => {
		const C = P(rc, ac), R = [Math.sin(ac), Math.cos(ac)], T = [Math.cos(ac), -Math.sin(ac)];
		for (let i = 1; i < ends; i++) {
			const t = (i / ends) * (Math.PI / 2), c = Math.cos(t), s = Math.sin(t);
			const dr = from[0] * c + to[0] * s, dt = from[1] * c + to[1] * s;
			pts.push([C[0] + cr * (dr * R[0] + dt * T[0]), C[1] + cr * (dr * R[1] + dt * T[1])]);
		}
	};
	for (let i = 0; i <= n; i++) pts.push(P(r1, lerp(a0 + d1, a1 - d1, i / n)));
	corner(r1 - cr, a1 - d1, [1, 0], [0, 1]);
	pts.push(P(r1 - cr, a1 - d1 + cr / (r1 - cr)));
	if (cr < h - 1e-4) pts.push(P(r0 + cr, a1 - d0 + cr / (r0 + cr)));
	corner(r0 + cr, a1 - d0, [0, 1], [-1, 0]);
	for (let i = n; i >= 0; i--) pts.push(P(r0, lerp(a0 + d0, a1 - d0, i / n)));
	corner(r0 + cr, a0 + d0, [-1, 0], [0, -1]);
	pts.push(P(r0 + cr, a0 + d0 - cr / (r0 + cr)));
	if (cr < h - 1e-4) pts.push(P(r1 - cr, a0 + d1 - cr / (r1 - cr)));
	corner(r1 - cr, a0 + d1, [0, -1], [1, 0]);
	// drop points that fall on one another
	return pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5; });
}

/** UVs in metres laid round [0, cz]: tops by (along the arc, across), faces by (along, up) or (up, along) for `upright` grain */
function t_arcUV(geo, cz, tile = TILE.oak, upright = false) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const pos = g.attributes.position;
	const uv = new Float32Array(pos.count * 2);
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
	const sg = cz < 0 ? 1 : -1;
	for (let i = 0; i < pos.count; i += 3) {
		a.fromBufferAttribute(pos, i);
		b.fromBufferAttribute(pos, i + 1);
		c.fromBufferAttribute(pos, i + 2);
		n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
		const m = a.clone().add(b).add(c).divideScalar(3);
		const rad = new THREE.Vector3(m.x, 0, m.z - cz).normalize();
		const flat = Math.abs(n.y) > 0.7;
		const side = Math.abs(n.dot(rad)) >= Math.abs(n.x * rad.z - n.z * rad.x);
		for (let k = 0; k < 3; k++) {
			const p = [a, b, c][k];
			const r = Math.hypot(p.x, p.z - cz), s = Math.atan2(p.x * sg, (p.z - cz) * sg) * Math.abs(cz);
			let u, v;
			if (flat) (u = s), (v = r);
			else if (side) (u = upright ? p.y : s), (v = upright ? s : p.y);
			else (u = upright ? p.y : r), (v = upright ? r : p.y);
			uv[(i + k) * 2] = u / tile;
			uv[(i + k) * 2 + 1] = v / tile;
		}
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	return g;
}

/** a bag that keeps each material in one mesh (a thing is small: no chunks) */
function t_bag(name) {
	const b = new Bag(name);
	const add = b.add.bind(b);
	b.add = (m, g, mx, o = {}) => add(m, g, mx, { chunk: false, ...o });
	return b;
}

/** a geometry's UVs moved by (du, dv): each board of a glued-up top cut from another part of the tree */
function t_shiftUV(geo, du, dv) {
	const uv = geo.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return geo;
}

/**
 * A through-tenon's end showing on a top `top(x, z)` at [x, z]: a disc of end grain (darker), Ø 2·r, laid on the
 * surface's slope a hair above it, and the wedge driven across it (turned `ry`).
 */
function t_tenonEnd(bag, x, z, top, r, ry = 0) {
	const e = 0.002, y = top(x, z);
	const n = new THREE.Vector3(-(top(x + e, z) - top(x - e, z)) / (2 * e), 1, -(top(x, z + e) - top(x, z - e)) / (2 * e)).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry));
	const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.0005, z), q, new THREE.Vector3(1, 1, 1));
	const disc = t_tint(scaleUV(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), 0.1, 0.1), [0.74, 0.64, 0.54]);
	bag.add('oak', disc, m, { colour: true });
	bag.add('shadow', new THREE.BoxGeometry(2 * r * 0.92, 0.0008, 0.0011), m);
}

/**
 * A glued-up top: a geometry (UVs laid, grain along x) cut into boards `w` wide side by side across z, each board a
 * shade of its own and its grain from another part of the tree (vertex colours: add it with { colour: true }).
 */
function t_boards(geo, w, seed) {
	const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2);
	geo.applyMatrix4(turn);
	const g = t_split(geo, w);
	g.applyMatrix4(turn.clone().invert());
	const pos = g.attributes.position, uv = g.attributes.uv;
	const col = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i += 3) {
		const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
		const k = Math.floor(-z / w);
		const tone = 0.9 + 0.14 * hash2(k, 1, seed), warm = 0.97 + 0.05 * hash2(k, 2, seed);
		const du = hash2(k, 3, seed) * 7, dv = hash2(k, 4, seed) * 5;
		for (let j = i; j < i + 3; j++) {
			col.set([tone * warm, tone, tone * (2 - warm)], j * 3);
			uv.setXY(j, uv.getX(j) + du, uv.getY(j) + dv);
		}
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	return g;
}

/** a geometry given one colour (linear [r, g, b]) in every vertex, for a material drawn with vertex colours */
function t_tint(geo, c) {
	const n = geo.attributes.position.count;
	const a = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) a.set(c, i * 3);
	geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
	return geo;
}

/* ---- books: cloth and leather bound, paperbacks, their pages ---- */

/** book cloth (a fine weave) and leather, each coloured book by book; the pages' block, its leaves in fine lines */
material('tb-cloth', 0.06, () => {
	const s = shared('linen', () => weave(81, 40));
	return new THREE.MeshStandardMaterial({ color: '#ffffff', normalMap: s.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.86 });
});
material('tb-leather', 1, () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: false, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 }));
material('tb-card', 1, () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
material('tb-pages', 0.05, () => {
	const s = surface({
		px: 256,
		py: 8,
		maps: ['map'],
		paint: (u, v, o) => {
			const i = Math.floor(u * 256);
			const leaf = hash2(i, 0, 401), sig = hash2(Math.floor(u * 17), 0, 403);
			const fold = Math.abs(((u * 17) % 1) - 0.5) > 0.47 ? 0.86 : 1;
			o.c = scalec(lin('#efe6d2'), (0.93 + 0.07 * leaf) * (0.97 + 0.05 * sig) * fold);
		}
	});
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, roughness: 0.92 });
});
const t_CLOTH = ['#b8a888', '#a39478', '#8f9a7f', '#6f7d6a', '#9c5a3c', '#7b3f2e', '#b98a4e', '#3d4a5c', '#566577', '#34363a', '#d8cfbd', '#a87f6c', '#4d5a43', '#857560', '#6d4c3d', '#c4b59a', '#2e3b4a', '#8c3b2f'];
const t_LEATHER = ['#7a4a2a', '#5a3420', '#6b2a22', '#9a6a3f', '#3e2a1e'];

/**
 * A book standing on its foot, its spine toward +z, its thickness `t` along x, height `h`, depth `d` (m), its origin
 * the middle of its foot: hardbound (boards, a rounded spine, the pages' block set in) in cloth or leather, or a
 * paperback (one block, its cover wrapped round). `kind` 'cloth' | 'leather' | 'paper'; `c` its colour (#hex).
 */
function t_book(bag, { t, h, d, kind = 'cloth', c = '#c2b49a', label = false, bands = false }, m) {
	const colour = lin(c);
	const put = (name, g, tint) => {
		if (tint) t_tint(g, tint);
		g.applyMatrix4(m);
		bag.add(name, g, null, tint ? { colour: true } : {});
	};
	if (kind === 'paper') {
		const g = boxUV(new THREE.BoxGeometry(t, h, d), TILE['tb-pages']);
		g.translate(0, h / 2, 0);
		// the cover on the spine and both sides; the pages at the head, the foot and the fore-edge
		const cols = new Float32Array(g.attributes.position.count * 3), nor = g.attributes.normal;
		const paper = lin('#efe6d2');
		for (let i = 0; i < nor.count; i++) cols.set(Math.abs(nor.getY(i)) > 0.5 || nor.getZ(i) < -0.5 ? paper : colour, i * 3);
		g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
		g.applyMatrix4(m);
		bag.add('tb-card', g, null, { colour: true });
		return;
	}
	const cover = kind === 'leather' ? 'tb-leather' : 'tb-cloth';
	const b = 0.0025, back = 0.004;
	for (const s of [-1, 1]) put(cover, boxUV(new THREE.BoxGeometry(b, h, d - back), TILE[cover]).translate(s * (t / 2 - b / 2), h / 2, -back / 2), colour);
	const bulge = Math.min(0.007, t * 0.3);
	const spine = new THREE.CylinderGeometry(t / 2, t / 2, h, 10, 1, false, -Math.PI / 2, Math.PI);
	spine.scale(1, 1, bulge / (t / 2));
	scaleUV(spine, (Math.PI * t) / 2 / TILE[cover], h / TILE[cover]);
	put(cover, spine.translate(0, h / 2, d / 2 - back), colour);
	put('tb-pages', boxUV(new THREE.BoxGeometry(t - 2 * b + 0.0004, h - 0.006, d - back - 0.003), TILE['tb-pages']).translate(0, h / 2, -back / 2 + 0.0015));
	const front = d / 2 - back + bulge;
	if (label) put(cover, new THREE.BoxGeometry(t * 0.55, Math.min(0.05, h * 0.16), 0.0012).translate(0, h * 0.72, front), lin(label));
	if (bands) for (const y of [0.09, 0.13, 0.87, 0.91]) put('brass', new THREE.BoxGeometry(t * 0.8, 0.0025, 0.001).translate(0, h * y, front - 0.0002));
}

const THING = {
	id: 'table-dining-round',
	label: 'Round oak dining table',
	note: 'A round solid oak dining table, Ø 1.2 m and 0.75 m high: a thick top with eased edges on a turned pedestal with a round foot.'
};

const t_TOP = 0.75, t_THICK = 0.045, t_R = 0.6;

/** the column's profile, foot to spider: a flared base, a long gently swelling shaft, a collar, a capital */
function t_columnProfile() {
	const y0 = 0.048, y1 = t_TOP - t_THICK - 0.024;
	const pts = [[0, y0], [0.135, y0], [0.132, y0 + 0.006], [0.118, y0 + 0.016], [0.1, y0 + 0.032], [0.088, y0 + 0.055], [0.08, y0 + 0.085], [0.076, y0 + 0.12]];
	for (let i = 1; i <= 8; i++) {
		const t = i / 9;
		pts.push([0.074 - 0.006 * Math.sin(Math.PI * t), lerp(y0 + 0.12, y1 - 0.12, t)]);
	}
	pts.push([0.075, y1 - 0.11], [0.082, y1 - 0.098], [0.088, y1 - 0.09], [0.087, y1 - 0.08], [0.08, y1 - 0.072], [0.079, y1 - 0.06], [0.086, y1 - 0.04], [0.1, y1 - 0.022], [0.12, y1 - 0.008], [0.13, y1], [0, y1]);
	return pts;
}

function thingBuild() {
	const bag = t_bag(THING.id);
	// the top: a slab of oak, its edge eased all round
	const top = t_slab({ edge: (a) => polar(t_R, a), top: () => t_TOP, bottom: () => t_TOP - t_THICK, r: 0.016, rb: 0.022, n: 112, rings: 4, round: 5 });
	bag.add('oak', t_boards(t_grain(top, 'x'), 0.12, 7), null, { colour: true });
	// the spider plate it is screwed to (a disc 24 mm thick, its grain across the top's)
	const plate = t_slab({ edge: (a) => polar(0.24, a), top: () => t_TOP - t_THICK + 0.001, bottom: () => t_TOP - t_THICK - 0.024, r: 0.006, n: 64, rings: 2, round: 2 });
	bag.add('oak', t_grain(plate, 'z'));
	// the column, turned
	bag.add('oak', t_turn(t_columnProfile(), 40));
	// the foot: a domed disc, its edge rounded, standing on felt glides
	const foot = t_slab({ edge: (a) => polar(0.31, a), top: (x, z) => 0.044 + 0.006 * (1 - (x * x + z * z) / 0.096), bottom: () => 0.006, r: 0.014, rb: 0.008, n: 96, rings: 4, round: 4 });
	bag.add('oak', t_grain(foot, 'z'));
	for (let i = 0; i < 4; i++) {
		const [x, z] = polar(0.25, (i + 0.5) * (TAU / 4));
		bag.add('shadow', new THREE.CylinderGeometry(0.022, 0.022, 0.007, 16), at(x, 0.0035, z));
	}
	return bag.build();
}

/* ================================================================================================================
 * RECIPE
 * ================================================================================================================ */

module.exports.recipe = function (id, v, variant) {
	if (id !== THING.id || variant) throw new Error(`no asset things/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'things', id: THING.id, version: v, label: THING.label, note: THING.note },
		build: () => {
			const o = thingBuild();
			o.name = THING.id;
			return o;
		}
	};
};
