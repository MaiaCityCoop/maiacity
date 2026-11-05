/*
 * VANITY, CURVED — a wall-hung bathroom vanity (a wall piece: its back against z = 0): an oiled-oak cabinet 1.40 m wide,
 * 0.50 m deep, 0.445 m high, hung 0.38 m off the floor (a usual wall-hung vanity: 0.45–0.55 m deep, its top at 0.82–0.90
 * m; here 0.86 m), its plan a soft D (a superellipse, exponent 3.5) so its ends are rounded and its front gently bowed;
 * two curved doors of 19 mm oak with their grain running up, 3 mm gaps, brass edge pulls; a 35 mm travertine top
 * overhanging 12 mm with a rounded edge, an undermounted round glazed basin Ø 0.38 m (0.17 m deep) with a brass waste;
 * a wall-mounted brass spout and mixer above it; a stadium mirror 1.00 × 0.60 m in a slim brass edge; two pill-shaped
 * opal glass sconces (0.10 × 0.34 m) on brass back plates either side of it, a slim brass rod down the face of each.
 * Origin: the floor at the wall, under the cabinet's middle; the cabinet comes out toward +z.
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

/* ---- the shapes it is made with (builder C's helpers, the same in each of its things) ---- */

/**
 * The smooth normals of a grid of points (`pts[i * cols + j]`, rows × cols), round its seams where it wraps; a row or a
 * column whose points all meet (a pole) shares one normal.
 */
function t_gridNormals(pts, rows, cols, wrapI, wrapJ) {
	const ix = (i, j) => (wrapI ? mod(i, rows) : i) * cols + (wrapJ ? mod(j, cols) : j);
	const nor = pts.map(() => new THREE.Vector3());
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
	for (let i = 0; i < (wrapI ? rows : rows - 1); i++)
		for (let j = 0; j < (wrapJ ? cols : cols - 1); j++) {
			const a = ix(i, j), b = ix(i + 1, j), c = ix(i, j + 1), d = ix(i + 1, j + 1);
			for (const [p, q, r] of [[a, b, c], [b, d, c]]) {
				f.crossVectors(e1.subVectors(pts[q], pts[p]), e2.subVectors(pts[r], pts[p]));
				nor[p].add(f);
				nor[q].add(f);
				nor[r].add(f);
			}
		}
	const pole = (list) => {
		if (list.some((k) => pts[k].distanceToSquared(pts[list[0]]) > 1e-12)) return;
		const s = new THREE.Vector3();
		for (const k of list) s.add(nor[k]);
		for (const k of list) nor[k].copy(s);
	};
	for (let i = 0; i < rows; i++) pole(Array.from({ length: cols }, (_, j) => i * cols + j));
	for (let j = 0; j < cols; j++) pole(Array.from({ length: rows }, (_, i) => i * cols + j));
	for (const n of nor) n.normalize();
	return nor;
}

/**
 * A surface as a grid of points: `P(i, j)` → [x, y, z] for i < rows (along) and j < cols (across), its normals smooth
 * over the grid and round a seam where it wraps (`wrapI`, `wrapJ`: the seam's points are made twice so its texture can
 * close: `uv(i, j)` is asked for i = rows or j = cols there too). Its faces look along ∂P/∂i × ∂P/∂j; `flip` turns them.
 */
function t_grid(rows, cols, P, o = {}) {
	const { wrapI = false, wrapJ = false, flip = false } = o;
	const uvf = o.uv ?? ((i, j) => [j / cols, i / rows]);
	const pts = [];
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(new THREE.Vector3(...P(i, j)));
	const nor = t_gridNormals(pts, rows, cols, wrapI, wrapJ);
	const R = wrapI ? rows + 1 : rows, W = wrapJ ? cols + 1 : cols;
	const pos = new Float32Array(R * W * 3), nrm = new Float32Array(R * W * 3), uv = new Float32Array(R * W * 2);
	const sg = flip ? -1 : 1;
	for (let i = 0, k = 0; i < R; i++)
		for (let j = 0; j < W; j++, k++) {
			const s = (i % rows) * cols + (j % cols);
			pos[k * 3] = pts[s].x;
			pos[k * 3 + 1] = pts[s].y;
			pos[k * 3 + 2] = pts[s].z;
			nrm[k * 3] = nor[s].x * sg;
			nrm[k * 3 + 1] = nor[s].y * sg;
			nrm[k * 3 + 2] = nor[s].z * sg;
			const [u, v] = uvf(i, j);
			uv[k * 2] = u;
			uv[k * 2 + 1] = v;
		}
	const idx = [];
	for (let i = 0; i < R - 1; i++)
		for (let j = 0; j < W - 1; j++) {
			const a = i * W + j, b = a + W, c = a + 1, d = b + 1;
			if (flip) idx.push(a, c, b, b, c, d);
			else idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/**
 * A flat face over a closed ring of points (and its holes), facing `normal`: the ring triangulated, each triangle turned
 * to face that way; `uvf(p)` its UVs.
 */
function t_cap(ring, holes, normal, uvf) {
	const N = new THREE.Vector3(...normal).normalize();
	const e1 = new THREE.Vector3(...(Math.abs(N.y) < 0.9 ? [0, 1, 0] : [1, 0, 0])).cross(N).normalize();
	const e2 = N.clone().cross(e1);
	const V = (p) => (p.isVector3 ? p : new THREE.Vector3(...p));
	const R = ring.map(V), H = holes.map((h) => h.map(V));
	const all = [R, ...H].flat();
	const flat = (list) => list.map((p) => new THREE.Vector2(p.dot(e1), p.dot(e2)));
	const tri = THREE.ShapeUtils.triangulateShape(flat(R), H.map(flat));
	const pos = [], nrm = [], uv = [], idx = [];
	for (const p of all) {
		pos.push(p.x, p.y, p.z);
		nrm.push(N.x, N.y, N.z);
		uv.push(...uvf(p));
	}
	const a = new THREE.Vector3(), b = new THREE.Vector3();
	for (const [i, j, k] of tri) {
		a.subVectors(all[j], all[i]);
		b.subVectors(all[k], all[i]);
		if (a.cross(b).dot(N) >= 0) idx.push(i, j, k);
		else idx.push(i, k, j);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/** shapes merged into one (each given its index first, so they can merge) */
function t_merge(list) {
	return mergeGeometries(list.filter(Boolean).map((g) => plain(g)));
}

/** the signed area of a plan [x, z] (positive: counter-clockwise with x right and z up) */
function t_area(plan) {
	let s = 0;
	for (let i = 0; i < plan.length; i++) {
		const [x0, z0] = plan[i], [x1, z1] = plan[(i + 1) % plan.length];
		s += x0 * z1 - x1 * z0;
	}
	return s / 2;
}

/** the outward normal at each point of a plan [x, z] (counter-clockwise), lengthened at a corner so an inset stays parallel */
function t_planNormals(plan) {
	const n = plan.length, out = [];
	const edge = (p, q) => {
		const x = q[1] - p[1], z = -(q[0] - p[0]), l = Math.hypot(x, z);
		return l > 1e-9 ? [x / l, z / l] : [0, 0];
	};
	for (let i = 0; i < n; i++) {
		const a = edge(plan[mod(i - 1, n)], plan[i]), b = edge(plan[i], plan[(i + 1) % n]);
		let x = a[0] + b[0], z = a[1] + b[1];
		const l = Math.hypot(x, z) || 1;
		x /= l;
		z /= l;
		const c = Math.max(a[0] * x + a[1] * z, b[0] * x + b[1] * z);
		const k = 1 / Math.max(0.35, c);
		out.push([x * k, z * k]);
	}
	return out;
}

/** a worked edge's profile: [inset, y] from the bottom face round a radius `r` up the side and round onto the top face */
function t_edge(y0, y1, r, seg = 4, r1 = r) {
	const p = [];
	if (r > 0) for (let k = 0; k <= seg; k++) {
		const a = (k / seg) * (Math.PI / 2);
		p.push([r - r * Math.sin(a), y0 + r - r * Math.cos(a)]);
	}
	else p.push([0, y0]);
	if (r1 > 0) for (let k = 0; k <= seg; k++) {
		const a = (k / seg) * (Math.PI / 2);
		p.push([r1 - r1 * Math.cos(a), y1 - r1 + r1 * Math.sin(a)]);
	}
	else p.push([0, y1]);
	return p;
}

/**
 * A plan raised: `plan` the outline's points [x, z] (closed, either way round; a point given twice makes a crisp
 * corner), `prof` its profile from the bottom face round to the top face as [inset, y] (t_edge: a worked edge), flat
 * faces closing the first and last rings; `o.holes` outlines cut through it (with `o.holeProf`). UVs in metres over
 * `o.tile`: the sides along the outline and up (`o.grain: 'up'` turns them, for wood whose grain runs up), the faces by
 * x and z (`o.faceGrain: 'z'` turns them).
 */
function t_prism(plan, prof, o = {}) {
	const tile = o.tile ?? 1;
	const outline = (pl, sign) => (Math.sign(t_area(pl)) === sign ? pl : pl.slice().reverse());
	const outer = outline(plan, 1);
	const holes = (o.holes ?? []).map((h) => outline(h, -1));
	const geos = [];
	const ring = (pl, nr, d, y) => pl.map(([x, z], j) => new THREE.Vector3(x - nr[j][0] * d, y, z - nr[j][1] * d));
	const side = (pl, pf) => {
		const nr = t_planNormals(pl);
		const len = [0];
		for (let j = 1; j <= pl.length; j++) len.push(len[j - 1] + Math.hypot(pl[j % pl.length][0] - pl[j - 1][0], pl[j % pl.length][1] - pl[j - 1][1]));
		const rings = pf.map(([d, y]) => ring(pl, nr, d, y));
		geos.push(t_grid(pf.length, pl.length, (i, j) => rings[i][j].toArray(), { wrapJ: true, uv: (i, j) => (o.grain === 'up' ? [pf[i][1] / tile, len[j] / tile] : [len[j] / tile, pf[i][1] / tile]) }));
		return [rings[0], rings[pf.length - 1]];
	};
	const [ob, ot] = side(outer, prof);
	const hp = o.holeProf ?? prof;
	const hr = holes.map((h) => side(h, hp));
	const fuv = (p) => (o.faceGrain === 'z' ? [p.z / tile, p.x / tile] : [p.x / tile, p.z / tile]);
	if (o.top !== false) geos.push(t_cap(ot, hr.map((h) => h[1]), [0, 1, 0], fuv));
	if (o.bottom !== false) geos.push(t_cap(ob, hr.map((h) => h[0]), [0, -1, 0], fuv));
	return t_merge(geos);
}

/**
 * A cross-section swept along a path: `path` points [x, y, z]; `shape` the section's points [s, t] counter-clockwise (s
 * to the path's side, t towards `o.up`), closed round; its ends capped unless the path is closed. UVs: u along the path
 * and v round the section, in metres over `o.tile`.
 */
function t_sweep(path, shape, o = {}) {
	const { closed = false, tile = 1, caps = true } = o;
	const n = path.length, m = shape.length;
	const P = path.map((p) => new THREE.Vector3(...p));
	const U = new THREE.Vector3(...(o.up ?? [0, 1, 0]));
	const fr = P.map((p, i) => {
		const a = closed ? P[mod(i - 1, n)] : P[Math.max(0, i - 1)], b = closed ? P[mod(i + 1, n)] : P[Math.min(n - 1, i + 1)];
		const t = b.clone().sub(a).normalize();
		const side = t.clone().cross(U).normalize();
		return { t, side, up: side.clone().cross(t).normalize() };
	});
	const along = [0];
	for (let i = 1; i <= n; i++) along.push(along[i - 1] + P[i % n].distanceTo(P[i - 1]));
	const round = [0];
	for (let j = 1; j <= m; j++) round.push(round[j - 1] + Math.hypot(shape[j % m][0] - shape[j - 1][0], shape[j % m][1] - shape[j - 1][1]));
	const pt = (i, s, t) => P[i].clone().addScaledVector(fr[i].side, s).addScaledVector(fr[i].up, t);
	const g = t_grid(n, m, (i, j) => pt(i, ...shape[j]).toArray(), { wrapI: closed, wrapJ: true, uv: (i, j) => [along[i] / tile, round[j] / tile] });
	if (closed || !caps) return g;
	const end = (i, s) => t_cap(shape.map(([a, b]) => pt(i, a, b)), [], fr[i].t.clone().multiplyScalar(s).toArray(), (p) => [p.x / tile, p.y / tile]);
	return t_merge([g, end(0, -1), end(n - 1, 1)]);
}

/**
 * A lathe round y of a profile [r, y] (`seg` sides), its faces outward where the profile runs out and up (`flip` turns
 * them), smooth round; UVs u round (metres at the widest) and v along the profile, over `tile`.
 */
function t_lathe(prof, seg = 32, o = {}) {
	const tile = o.tile ?? 1;
	const len = [0];
	for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
	const wide = Math.max(...prof.map((p) => p[0]));
	return t_grid(prof.length, seg, (i, j) => {
		const a = (j / seg) * TAU, [r, y] = prof[i];
		return [r * Math.cos(a), y, r * Math.sin(a)];
	}, { wrapJ: true, flip: o.flip, uv: (i, j) => [((j / seg) * TAU * wide) / tile, len[i] / tile] });
}

/**
 * A stadium's outline (two half circles joined by straight sides), `len` along x and `wid` along z, centred: points
 * [x, z] counter-clockwise, `seg` round each end and `ns` along each side, so outlines of one stadium inset (len − 2d,
 * wid − 2d) match point for point.
 */
function t_stadium(len, wid, seg = 24, ns = 8) {
	const r = wid / 2, s = len / 2 - r, pts = [];
	for (let k = 0; k < seg; k++) {
		const a = -Math.PI / 2 + (k / seg) * Math.PI;
		pts.push([s + r * Math.cos(a), r * Math.sin(a)]);
	}
	for (let k = 0; k < ns; k++) pts.push([s - (k / ns) * 2 * s, r]);
	for (let k = 0; k < seg; k++) {
		const a = Math.PI / 2 + (k / seg) * Math.PI;
		pts.push([-s + r * Math.cos(a), r * Math.sin(a)]);
	}
	for (let k = 0; k < ns; k++) pts.push([-s + (k / ns) * 2 * s, -r]);
	return pts;
}

/** a superellipse's point at angle `t`: semi-axes a (x) and b (z), exponent n */
function t_super(t, a, b, n) {
	const c = Math.cos(t), s = Math.sin(t);
	return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
}

/** points along a smooth curve through control points [x, y, z]: `per` points to each span between two of them */
function t_curve(points, per = 6, closed = false) {
	const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
	return c.getPoints((points.length - (closed ? 0 : 1)) * per).map((p) => p.toArray()).slice(0, closed ? -1 : undefined);
}

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/** a rounded rectangle's section [s, t] w × h, corners r, counter-clockwise, centred */
function t_rrect(w, h, r, seg = 4) {
	return roundRect(w, h, r, seg);
}

/**
 * Travertine as a top is made: honed and its pores filled, so they read as soft darker flecks rather than holes (the
 * kit's travertine, its pictures shared, its relief eased).
 */
function t_honed() {
	material('c-travertine', TILE.travertine, () => {
		const m = mat('travertine').clone();
		m.normalScale = new THREE.Vector2(0.3, 0.3);
		m.roughness = 1.6;
		return m;
	});
}

/** brushed brass (wastes, a flush plate): the kit's brass, its finish satin, so a flat face reads as brass, not a mirror */
function t_brushed() {
	material('c-brushed', 1, () => Object.assign(mat('brass').clone(), { roughness: 0.42 }));
}

/* ---- the thing ---- */

const THING = {
	id: 'vanity-curved',
	label: 'Curved oak vanity',
	note: 'A wall-hung oak vanity 1.40 × 0.50 m with rounded ends and two curved doors, a travertine top at 0.86 m with an undermounted round basin and a wall-mounted brass tap; above it a 1.00 × 0.60 m stadium mirror in a slim brass edge between two opal pill sconces.'
};

/** the vanity's measures (m) */
const t_V = { a: 0.7, b: 0.5, n: 3.5, y0: 0.38, y1: 0.825, top: 0.86, door: 0.019, doorX: 0.452, basin: [0, 0.27], basinR: 0.19 };

/** the cabinet's front at angle t (0 the right end at the wall, π/2 the middle of the front, π the left end) */
const t_front = (t, grow = 0) => t_super(t, t_V.a + grow, t_V.b + grow, t_V.n);
/** its outward normal there */
function t_frontNormal(t) {
	const p = t_front(t - 1e-4), q = t_front(t + 1e-4);
	const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
	return [dz / l, -dx / l];
}
/** the angle at which the front is at x */
function t_frontAt(x) {
	let lo = 0, hi = Math.PI;
	for (let k = 0; k < 40; k++) {
		const m = (lo + hi) / 2;
		if (t_front(m)[0] > x) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
}
/** angles from t0 to t1 about every `step` metres along the front */
function t_frontSteps(t0, t1, step, grow = 0) {
	const fine = 200, out = [t0];
	let run = 0;
	for (let k = 1; k <= fine; k++) {
		const ta = t0 + ((k - 1) / fine) * (t1 - t0), tb = t0 + (k / fine) * (t1 - t0);
		const [ax, az] = t_front(ta, grow), [bx, bz] = t_front(tb, grow);
		run += Math.hypot(bx - ax, bz - az);
		if (run >= step || k === fine) {
			out.push(tb);
			run = 0;
		}
	}
	if (out.length > 2 && Math.abs(out.at(-1) - out.at(-2)) < 1e-9) out.pop();
	return out;
}
/** a point of the front, set in by d */
const t_frontIn = (t, d) => {
	const [x, z] = t_front(t), [nx, nz] = t_frontNormal(t);
	return [x - nx * d, z - nz * d];
};

/** the cabinet's carcass plan: the D, set back by the doors' thickness where the doors hang (corners crisp) */
function t_carcassPlan() {
	const { doorX, door } = t_V;
	const tR = t_frontAt(doorX + 0.003), tL = t_frontAt(-doorX - 0.003);
	const set = door + 0.002;
	const pl = [[t_V.a, 0], [t_V.a, 0]];
	for (const t of t_frontSteps(0, tR, 0.02).slice(1)) pl.push(t_front(t));
	pl.push(t_front(tR), t_frontIn(tR, set), t_frontIn(tR, set));
	for (const t of t_frontSteps(tR, tL, 0.03).slice(1, -1)) pl.push(t_frontIn(t, set));
	pl.push(t_frontIn(tL, set), t_frontIn(tL, set), t_front(tL), t_front(tL));
	for (const t of t_frontSteps(tL, Math.PI, 0.02).slice(1, -1)) pl.push(t_front(t));
	pl.push([-t_V.a, 0], [-t_V.a, 0]);
	return pl;
}

/** a door's plan: a band of the front from x0 to x1, 19 mm thick, its corners crisp */
function t_doorPlan(x0, x1) {
	const ts = t_frontSteps(t_frontAt(x1), t_frontAt(x0), 0.025);
	const outer = ts.map((t) => t_front(t));
	const inner = ts.map((t) => t_frontIn(t, t_V.door)).reverse();
	return [outer[0], ...outer, outer.at(-1), inner[0], ...inner, inner.at(-1)];
}

/** a wall boss with something coming out of it: a round plate on the wall, its axis along +z */
function t_wallDisc(r, th) {
	const g = t_lathe([[r - 0.002, 0], [r, 0.0005], [r, th - 0.004], [r - 0.0012, th - 0.0012], [r - 0.004, th], [0, th]], 40);
	return g.applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2));
}

/** the wall tap: a spout over the basin and a mixer beside it, each from its own round plate */
function t_tap(bag) {
	const y = 0.995;
	bag.add('brass', t_wallDisc(0.031, 0.009), at(0, y, 0));
	const spout = [[0, y, 0.006], [0, y, 0.12], [0, y - 0.001, 0.178], [0, y - 0.006, 0.199], [0, y - 0.016, 0.211]];
	const path = t_curve(spout, 5);
	bag.add('brass', t_sweep(path, t_circle(0.0095, 18), { up: [1, 0, 0] }));
	const end = new THREE.Vector3(...path.at(-1)), dir = end.clone().sub(new THREE.Vector3(...path.at(-2))).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
	bag.add('shadow', t_lathe([[0, 0], [0.007, 0], [0.007, 0.001], [0, 0.001]], 16), new THREE.Matrix4().compose(end.addScaledVector(dir, 0.0004), q, new THREE.Vector3(1, 1, 1)));
	// the mixer: a plate, a round body, a slim lever
	const mx = 0.17;
	bag.add('brass', t_wallDisc(0.029, 0.009), at(mx, y, 0));
	bag.add('brass', t_lathe([[0.0135, 0], [0.0135, 0.03], [0.012, 0.036], [0.007, 0.039], [0, 0.04]], 28).applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2)), at(mx, y, 0.008));
	bag.add('brass', t_sweep([[0, 0, 0.04], [0.0, 0.018, 0.052], [0, 0.05, 0.06]], t_rrect(0.007, 0.011, 0.003, 3), { up: [1, 0, 0] }), at(mx, y, 0));
}

/** the mirror: a stadium of glass in a slim brass edge, standing 26 mm off the wall */
function t_mirror(bag, cy) {
	const st = t_stadium(1.0, 0.6, 32, 10);
	const ring = st.map(([x, z]) => [x, cy + z, 0.026]);
	bag.add('c-mirror', t_cap(ring, [], [0, 0, 1], (p) => [p.x, p.y]));
	const frame = t_rrect(0.0068, 0.028, 0.0026, 3).map(([s, t]) => [s + 0.0022, t + 0.0175]);
	bag.add('brass', t_sweep(st.map(([x, z]) => [x, cy + z, 0]), frame, { closed: true, up: [0, 0, 1] }));
}

/** a sconce: a pill of opal glass on a brass back plate, its middle at (x, y) */
function t_sconce(bag, x, y) {
	const H = 0.34, Wd = 0.1, dep = 0.045;
	// the brass plate: the pill's outline grown 7 mm, 10 mm thick, its edges eased
	const plate = t_stadium(H + 0.014, Wd + 0.014, 20, 4).map(([a, b]) => [b, a]);
	bag.add('brass', extrude(shapeOf(plate), 0.01, 0.0025, 2, 20), at(x, y, 0));
	// the opal pill: a half capsule standing on the plate
	const out = t_stadium(H, Wd, 24, 6).map(([a, b]) => [b, a]);
	const spine = (p) => [0, clamp(p[1], -(H / 2 - Wd / 2), H / 2 - Wd / 2)];
	const rows = 9;
	const g = t_grid(rows, out.length, (i, j) => {
		const p = out[j], c = spine(p), f = (i / (rows - 1)) * (Math.PI / 2);
		return [x + c[0] + (p[0] - c[0]) * Math.cos(f), y + c[1] + (p[1] - c[1]) * Math.cos(f), 0.0095 + dep * Math.sin(f)];
	}, { wrapJ: true });
	bag.add('c-opal', g);
	// a slim brass rod down its face, held at its ends
	const yr = H / 2 - Wd / 2 + 0.02;
	bag.add('brass', bar([x, y - yr, 0.0095 + dep + 0.006], [x, y + yr, 0.0095 + dep + 0.006], 0.0028, 0.0028, 10));
	for (const s of [-1, 1]) bag.add('brass', bar([x, y + s * yr, 0.0095 + dep + 0.006], [x, y + s * yr, 0.0095 + dep * 0.5], 0.0028, 0.0028, 10));
}

t_honed();
t_brushed();

function thingBuild() {
	const bag = new Bag(THING.id);
	const { y0, y1, top, doorX, basin, basinR } = t_V;
	// the carcass: oak, its ends round, set back where the doors hang
	const plan = t_carcassPlan();
	bag.add('oak', t_prism(plan, t_edge(y0, y1, 0.006, 3, 0), { tile: TILE.oak, grain: 'up', top: false }));
	// its top board, open where the basin drops through
	const under = Array.from({ length: 48 }, (_, k) => [basin[0] + (basinR + 0.01) * Math.cos((k / 48) * TAU), y1, basin[1] + (basinR + 0.01) * Math.sin((k / 48) * TAU)]);
	bag.add('oak', t_cap(plan.map(([x, z]) => [x, y1, z]), [under], [0, 1, 0], (p) => [p.x / TILE.oak, p.z / TILE.oak]));
	// the two doors, bowed with the front, their grain running up
	for (const [x0, x1] of [[-doorX, -0.0015], [0.0015, doorX]]) bag.add('oak', t_prism(t_doorPlan(x0, x1), t_edge(y0 + 0.005, y1 - 0.007, 0.0025, 2), { tile: TILE.oak, grain: 'up' }));
	// brass edge pulls at the doors' inner top corners
	for (const s of [-1, 1]) {
		const t = t_frontAt(s * 0.05), [px, pz] = t_front(t), [nx, nz] = t_frontNormal(t);
		const ry = Math.atan2(nx, nz);
		bag.add('brass', rbox(0.07, 0.03, 0.003, 0.0012, 2), at(px + nx * 0.0016, y1 - 0.022, pz + nz * 0.0016, ry));
		bag.add('brass', rbox(0.07, 0.003, 0.022, 0.0012, 2), at(px - nx * 0.008, y1 - 0.0055, pz - nz * 0.008, ry));
	}
	// the travertine top: the D grown 12 mm, run 14 mm into the wall, its edge rounded; the basin's hole
	const tt = t_frontSteps(0, Math.PI, 0.02, 0.012).map((t) => t_front(t, 0.012));
	const topPlan = [[t_V.a + 0.012, -0.014], [t_V.a + 0.012, -0.014], ...tt, [-t_V.a - 0.012, -0.014], [-t_V.a - 0.012, -0.014]];
	const hole = Array.from({ length: 72 }, (_, k) => [basin[0] + basinR * Math.cos((k / 72) * TAU), basin[1] + basinR * Math.sin((k / 72) * TAU)]);
	bag.add('c-travertine', t_prism(topPlan, t_edge(y1, top, 0.004, 3, 0.013), { tile: TILE.travertine, holes: [hole], holeProf: t_edge(y1, top, 0, 3, 0.008) }));
	// the basin under it: glazed, its bowl falling to a flat floor and a brass waste
	const bowl = [[0, y1 - 0.137], [0.045, y1 - 0.137], [0.09, y1 - 0.134], [0.13, y1 - 0.124], [0.16, y1 - 0.106], [0.178, y1 - 0.08], [0.187, y1 - 0.05], [basinR, y1 - 0.02], [basinR, y1 - 0.0002], [basinR + 0.012, y1 - 0.0002]];
	bag.add('glaze', t_lathe(bowl, 64, { flip: true }), at(basin[0], 0, basin[1]));
	bag.add('c-brushed', t_lathe([[0, y1 - 0.1345], [0.024, y1 - 0.1348], [0.029, y1 - 0.1356], [0.0305, y1 - 0.1366]], 32, { flip: true }), at(basin[0], 0, basin[1]));
	t_tap(bag);
	t_mirror(bag, 1.38);
	for (const s of [-1, 1]) t_sconce(bag, s * 0.665, 1.38);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor at the wall under the middle', back: 'z = 0 (the wall)', top: top, basin: [basin[0], y1 - 0.137, basin[1]] };
	return g;
}

// the sconces' opal glass: the kit's opal, its glow held back so the pill's roundness still reads
material('c-opal', 1, () => Object.assign(mat('opal').clone(), { emissiveIntensity: 1.25 }));
// the mirror's silvered glass: it reflects whatever is round it
material('c-mirror', 1, () => new THREE.MeshStandardMaterial({ color: '#e6e9e5', metalness: 1, roughness: 0.03 }));

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
