/*
 * DAYBED, TERRACE — a daybed for the indoor terraces over the forest, 2.00 × 0.90 m (a daybed takes a single mattress,
 * 0.80–0.90 × 1.90–2.00 m; its seat at 0.38–0.45 m): a low frame of oiled oak, its apron a rail of rounded section
 * (55 × 140 mm) running round a plan with rounded corners on six turned legs, and round its back and ends a low gallery
 * of oak spindles (Ø 22 mm at 85 mm) under a rounded rail at 0.64 m, ending at the front in two posts; a mattress
 * cushion of natural linen 0.15 m thick, its top crowned and rolled into its sides, piped in oat linen round its top;
 * two linen bolsters Ø 0.20 m against its ends, piped round their ends; three scatter cushions 0.45 m square leaning on
 * the back rail (rust, sage and oat linen), puffed, their seams piped; a clay linen throw folded in three at its foot.
 * Origin: the floor under its middle; its long open side (the front) toward +z.
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
 * Cloth: its middle surface `P(i, j)` → [x, y, z] (rows × cols), `th` thick, both faces and a rounded edge all round;
 * `uvf(i, j)` its UVs (over a tile of `tile` metres: the edge's weave runs on round it). A towel's drape, a folded throw.
 */
function t_sheet(rows, cols, P, th, uvf, tile = 0.12) {
	const pts = [];
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(new THREE.Vector3(...P(i, j)));
	const nor = t_gridNormals(pts, rows, cols, false, false);
	const h = th / 2;
	const face = (s) => t_grid(rows, cols, (i, j) => pts[i * cols + j].clone().addScaledVector(nor[i * cols + j], s * h).toArray(), { uv: uvf, flip: s < 0 });
	const loop = [];
	for (let j = 0; j < cols; j++) loop.push([0, j]);
	for (let i = 1; i < rows; i++) loop.push([i, cols - 1]);
	for (let j = cols - 2; j >= 0; j--) loop.push([rows - 1, j]);
	for (let i = rows - 2; i > 0; i--) loop.push([i, 0]);
	const out = loop.map(([i, j]) => {
		const ii = i === 0 ? 1 : i === rows - 1 ? rows - 2 : i, jj = j === 0 ? 1 : j === cols - 1 ? cols - 2 : j;
		const s = i * cols + j, v = pts[s].clone().sub(pts[ii * cols + jj]);
		return v.addScaledVector(nor[s], -v.dot(nor[s])).normalize();
	});
	const K = 5;
	const edgeAt = (k, m) => {
		const [i, j] = loop[m], s = i * cols + j, a = (k / (K - 1)) * Math.PI;
		return pts[s].clone().addScaledVector(nor[s], h * Math.cos(a)).addScaledVector(out[m], h * Math.sin(a)).toArray();
	};
	// which way the edge's faces look: out of the cloth
	const e = t_grid(K, loop.length, edgeAt, { wrapJ: true });
	const nm = new THREE.Vector3().fromBufferAttribute(e.attributes.normal, 2 * (loop.length + 1) + 1);
	const flip = nm.dot(out[1]) < 0;
	const round = (Math.PI * h) / tile / (K - 1);
	const edge = t_grid(K, loop.length, edgeAt, { wrapJ: true, flip, uv: (k, m) => uvf(...loop[m % loop.length]).map((x) => x + k * round) });
	return t_merge([face(1), face(-1), edge]);
}

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/** a rounded rectangle's section [s, t] w × h, corners r, counter-clockwise, centred */
function t_rrect(w, h, r, seg = 4) {
	return roundRect(w, h, r, seg);
}

/** a wire ring: radius r at height y, its wire's radius w */
function t_wireRing(r, y, w, n = 48) {
	return t_sweep(Array.from({ length: n }, (_, k) => [r * Math.cos((k / n) * TAU), y, -r * Math.sin((k / n) * TAU)]), t_circle(w, 6), { closed: true });
}

/** a shape's UVs turned so wood's grain (along u) runs along v, the shape's length, in metres over `tile` */
function t_grainAlong(g, tile = 1) {
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) {
		const u = uv.getX(i);
		uv.setXY(i, uv.getY(i) / tile, u / tile);
	}
	return g;
}

/* ---- the thing ---- */

const THING = {
	id: 'daybed-terrace',
	label: 'Terrace daybed',
	note: 'An oak daybed 2.00 × 0.90 m with rounded rails and a low spindle gallery round its back and ends, a piped linen mattress cushion 0.15 m thick, two bolsters, three scatter cushions in rust, sage and oat linen and a folded throw.'
};

/** the measures (m): the outline, its corners, the apron, the mattress, the gallery */
const t_D = { L: 2.0, W: 0.9, R: 0.12, rail: 0.055, apron: [0.15, 0.29], deck: 0.23, top: 0.38, gallery: 0.64 };

/** a rounded rectangle's outline [x, z], counter-clockwise, about every `step` metres round */
function t_plan(L, W, r, step = 0.03) {
	const pts = [], seg = Math.max(4, Math.ceil(((Math.PI / 2) * r) / step));
	const corner = (cx, cz, a0) => {
		for (let k = 0; k < seg; k++) {
			const a = a0 + (k / seg) * (Math.PI / 2);
			pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
		}
	};
	const line = (x0, z0, x1, z1) => {
		const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (step * 3)));
		for (let k = 0; k < n; k++) pts.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
	};
	const x = L / 2 - r, z = W / 2 - r;
	corner(x, -z, -Math.PI / 2);
	line(L / 2, -z, L / 2, z);
	corner(x, z, 0);
	line(x, W / 2, -x, W / 2);
	corner(-x, z, Math.PI / 2);
	line(-L / 2, z, -L / 2, -z);
	corner(-x, -z, Math.PI);
	line(-x, -W / 2, x, -W / 2);
	return pts;
}

/** the mattress's measures: its plan's half sizes, its top's roll and crown */
const t_M = { hx: 0.937, hz: 0.387, r: 0.06, roll: 0.02, crown: 0.014 };
/** the mattress's top at (x, z): crowned in its middle, rolling down into its sides */
function t_mattressY(x, z) {
	// how far in from the rounded outline
	const qx = Math.abs(x) - (t_M.hx - t_M.r), qz = Math.abs(z) - (t_M.hz - t_M.r);
	const d = Math.max(0, t_M.r - Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) - Math.min(Math.max(qx, qz), 0));
	const e = Math.min(d, t_M.roll);
	return t_D.top - t_M.roll + Math.sqrt(Math.max(0, t_M.roll ** 2 - (t_M.roll - e) ** 2)) + t_M.crown * smooth((d - t_M.roll) / 0.22);
}

/** the mattress cushion: a crowned top rolled into a slightly bulging side, piping round the top's seam */
function t_mattress(bag) {
	const { hx, hz, r, roll } = t_M;
	const plan = t_plan(hx * 2, hz * 2, r, 0.025);
	const nr = t_planNormals(plan), n = plan.length;
	const yb = t_D.deck, ys = t_D.top - roll;
	const tile = TILE.linen;
	// the top: rings set in from the outline, then drawn in to the middle
	const ins = [0, 0.0025, 0.006, 0.011, 0.017, 0.026, 0.04, 0.055];
	const scale = [0.86, 0.7, 0.54, 0.38, 0.22, 0.08, 0];
	const ringAt = (i, j) => {
		const [x, z] = plan[j], [ax, az] = nr[j];
		if (i < ins.length) return [x - ax * ins[i], z - az * ins[i]];
		const k = scale[i - ins.length], d = ins.at(-1);
		return [(x - ax * d) * k, (z - az * d) * k];
	};
	const rows = ins.length + scale.length;
	bag.add('linen', t_grid(rows, n, (i, j) => {
		const [x, z] = ringAt(i, j);
		return [x, i ? t_mattressY(x, z) : ys, z];
	}, { wrapJ: true, uv: (i, j) => {
		const [x, z] = ringAt(i, j % n);
		return [x / tile, z / tile];
	} }));
	// the side: a band from the deck up to the seam, a little full in its middle
	const len = [0];
	for (let j = 1; j <= n; j++) len.push(len[j - 1] + Math.hypot(plan[j % n][0] - plan[j - 1][0], plan[j % n][1] - plan[j - 1][1]));
	const sr = 7;
	bag.add('linen', t_grid(sr, n, (i, j) => {
		const f = i / (sr - 1), b = 0.006 * Math.sin(Math.PI * f);
		return [plan[j][0] + nr[j][0] * b, yb + (ys - yb) * f, plan[j][1] + nr[j][1] * b];
	}, { wrapJ: true, uv: (i, j) => [len[j] / tile, (yb + ((ys - yb) * i) / (sr - 1)) / tile] }));
	// the piping round the top's seam
	bag.add('linen-oat', t_sweep(plan.map(([x, z], j) => [x + nr[j][0] * 0.0015, ys, z + nr[j][1] * 0.0015]), t_circle(0.0048, 8), { closed: true, tile: TILE['linen-oat'] }));
}

/**
 * A scatter cushion, lying flat at the origin (its faces up and down, its top edge toward −z): two panels sewn at a
 * piped seam, filled so the middle is full and the corners flatten, its sides drawn in a little between them; as it
 * leans, its upper half slouches forward (+y) and its top corners flop, its foot squashed flatter where it sits.
 */
function t_pillow(W, T, seed) {
	const N = 23;
	const r = chance('pillow', seed);
	const ph = [r() * TAU, r() * TAU, r() * TAU];
	const g = (k) => Math.sin((k / (N - 1) - 0.5) * Math.PI);
	const P = (s) => (i, j) => {
		const u = g(i), v = g(j);
		const top = ((1 - v) / 2) ** 2, foot = ((1 + v) / 2) ** 3;
		const x = (u * W) / 2 * (1 - 0.1 * (1 - v * v)) * (1 + 0.04 * foot), z = (v * W) / 2 * (1 - 0.1 * (1 - u * u)) + 0.022 * u * u * top;
		const full = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), 0.62) * (1 - 0.3 * foot);
		// soft creases running in from the corners, where the cover gathers
		const corner = Math.pow(Math.abs(u * v), 3);
		const crease = 0.05 * corner * Math.sin(26 * (Math.abs(u) - Math.abs(v)) + ph[2]);
		const dent = 1 + 0.06 * Math.sin(2.1 * u + 1.6 * v + ph[0]) + 0.035 * Math.sin(5.3 * u - 3.1 * v + ph[1]) + crease;
		const slouch = 0.055 * top + 0.03 * u * u * top + 0.006 * Math.sin(3 * u + ph[2]);
		return [x, s * (T / 2) * full * dent + slouch, z];
	};
	const tile = 0.12;
	const uv = (i, j) => [(g(i) * W) / 2 / tile, (g(j) * W) / 2 / tile];
	const seam = [];
	for (let k = 0; k < N - 1; k++) seam.push(P(1)(N - 1, k));
	for (let k = N - 1; k > 0; k--) seam.push(P(1)(k, N - 1));
	for (let k = N - 1; k > 0; k--) seam.push(P(1)(0, k));
	for (let k = 0; k < N - 1; k++) seam.push(P(1)(k, 0));
	return {
		body: t_merge([t_grid(N, N, P(1), { uv, flip: true }), t_grid(N, N, P(-1), { uv })]),
		piping: t_sweep(seam, t_circle(0.0042, 7), { closed: true, tile })
	};
}

/** a bolster: Ø 0.20 m, 0.78 m long, along z; its ends flat with a button, piped round */
function t_bolster(bag, x, y) {
	const L = 0.39, R = 0.1;
	const end = [[0, -L - 0.002], [0.009, -L - 0.0018], [0.012, -L + 0.001], [0.016, -L + 0.0015], [0.05, -L + 0.0005], [0.082, -L + 0.002], [R - 0.006, -L + 0.006], [R - 0.0015, -L + 0.012], [R, -L + 0.03]];
	const prof = [...end, [R + 0.002, -0.2], [R + 0.003, 0], ...end.slice().reverse().map(([r, y]) => [r, -y])];
	const m = at(x, y, 0, 0, 1, Math.PI / 2);
	bag.add('linen', t_lathe(prof, 40, { tile: TILE.linen }), m);
	for (const s of [-1, 1]) bag.add('linen-oat', t_wireRing(R - 0.003, s * (L - 0.009), 0.0048, 40), m);
}

/** the throw: a clay linen throw folded in three, lying at the bed's foot on the mattress's crown */
function t_throw(bag, cx, cz, ry) {
	const Wd = 0.52, D = 0.36, th = 0.006, gap = 0.0145;
	// its section, along z: three layers joined by two soft folds
	const path = [];
	const flat = (z0, z1, lay) => {
		const n = Math.ceil(Math.abs(z1 - z0) / 0.025);
		for (let k = 0; k < n; k++) path.push([z0 + ((z1 - z0) * k) / n, lay * gap, lay]);
	};
	const fold = (zc, lay, dir) => {
		for (let k = 0; k < 7; k++) {
			const a = -Math.PI / 2 + (k / 7) * Math.PI, rr = gap / 2 + (0.004 + 0.002 * lay) * Math.sin((k / 7) * Math.PI);
			path.push([zc + dir * rr * Math.cos(a), lay * gap + gap / 2 + rr * Math.sin(a), lay + k / 7]);
		}
	};
	flat(-D / 2, D / 2, 0);
	fold(D / 2, 0, 1);
	flat(D / 2, -D / 2, 1);
	fold(-D / 2, 1, -1);
	flat(-D / 2, D / 2 - 0.025, 2);
	path.push([D / 2 - 0.025, 2 * gap, 2]);
	const cols = 21, m = at(cx, 0, cz, ry);
	const P = (i, j) => {
		const [z, y, lay] = path[i];
		const e = j / (cols - 1) - 0.5;
		// each layer laid a little askew of the one under it, its free edges rippling, its middle softly heaped
		const x = e * Wd + 0.012 * lay + 0.01 * lay * (z / D);
		const p = new THREE.Vector3(x, 0, z).applyMatrix4(m);
		const base = t_mattressY(p.x, p.z) + th / 2 + 0.0015;
		const edge = smooth((Math.abs(e) * 2 - 0.65) / 0.35);
		const ripple = (0.003 * Math.sin(x * 11 + z * 7 + lay) + 0.0018 * Math.sin(x * 29 - z * 13 - lay * 3)) * Math.min(1, lay + 0.3) + edge * 0.0045 * Math.sin(z * 31 + lay * 2 + e * 3) * Math.min(1, lay);
		const heap = 0.004 * Math.min(1, lay) * Math.cos(Math.PI * e) * Math.cos((Math.PI * z) / D);
		return [p.x, base + y + ripple + heap, p.z];
	};
	let run = 0;
	const along = path.map((p, i) => (run += i ? Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0));
	const tile = TILE['linen-clay'];
	bag.add('linen-clay', t_sheet(path.length, cols, P, th, (i, j) => [along[i] / tile, ((j / (cols - 1)) * Wd) / tile], tile));
}

/** the frame: the apron rail round the plan, six legs, the deck, the gallery of spindles and its rail and posts */
function t_frame(bag) {
	const { L, W, R, rail, apron, gallery } = t_D;
	const c = rail / 2, X = L / 2 - c, Z = W / 2 - c, r = R - c;
	const tile = TILE.oak;
	// the apron: a rail of rounded section swept round the plan
	const sec = t_rrect(rail, apron[1] - apron[0], 0.022, 4);
	bag.add('oak', t_sweep(t_plan(L - rail, W - rail, r, 0.02).map(([x, z]) => [x, (apron[0] + apron[1]) / 2, z]), sec, { closed: true, tile }));
	// the deck the mattress lies on, inside the apron
	bag.add('oak', rbox(L - 2 * rail - 0.004, 0.02, W - 2 * rail - 0.004, 0.004, 1), at(0, t_D.deck - 0.01, 0), { uv: 'box' });
	// six turned legs, tapering to the floor
	for (const [x, z] of [[X - 0.16, Z], [X - 0.16, -Z], [-X + 0.16, Z], [-X + 0.16, -Z], [0, Z], [0, -Z]]) {
		bag.add('oak', t_grainAlong(t_lathe([[0, 0], [0.016, 0], [0.019, 0.004], [0.021, 0.02], [0.025, apron[0] - 0.01], [0.025, apron[0] + 0.02]], 18), tile), at(x, 0, z));
	}
	// the gallery: from the front of the left end round the back to the front of the right end
	const zEnd = Z - 0.11, u = [];
	const seg = 10;
	u.push([-X, zEnd], [-X, -Z + r]);
	for (let k = 1; k < seg; k++) {
		const a = Math.PI + (k / seg) * (Math.PI / 2);
		u.push([-X + r + r * Math.cos(a), -Z + r + r * Math.sin(a)]);
	}
	u.push([-X + r, -Z], [X - r, -Z]);
	for (let k = 1; k < seg; k++) {
		const a = -Math.PI / 2 + (k / seg) * (Math.PI / 2);
		u.push([X - r + r * Math.cos(a), -Z + r + r * Math.sin(a)]);
	}
	u.push([X, -Z + r], [X, zEnd]);
	const yr = gallery - 0.022;
	bag.add('oak', t_sweep(u.map(([x, z]) => [x, yr, z]), t_rrect(0.05, 0.044, 0.02, 4), { tile, caps: true }));
	// the posts at its two front ends, a round top on each
	for (const s of [-1, 1]) {
		bag.add('oak', t_grainAlong(bar([s * X, apron[1] - 0.01, zEnd], [s * X, gallery - 0.01, zEnd], 0.024, 0.024, 20), tile));
		bag.add('oak', new THREE.SphereGeometry(0.0262, 20, 12), at(s * X, gallery - 0.008, zEnd, 0, [1, 0.75, 1]));
	}
	// spindles along it at even steps, between the posts
	const lens = [0];
	for (let k = 1; k < u.length; k++) lens.push(lens[k - 1] + Math.hypot(u[k][0] - u[k - 1][0], u[k][1] - u[k - 1][1]));
	const total = lens.at(-1), count = Math.round(total / 0.085);
	for (let k = 1; k < count; k++) {
		const d = (k / count) * total;
		let i = 1;
		while (lens[i] < d) i++;
		const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
		const x = u[i - 1][0] + (u[i][0] - u[i - 1][0]) * f, z = u[i - 1][1] + (u[i][1] - u[i - 1][1]) * f;
		bag.add('oak', t_grainAlong(bar([x, apron[1] - 0.01, z], [x, yr, z], 0.011, 0.0105, 10), tile));
	}
}

function thingBuild() {
	const bag = new Bag(THING.id);
	t_frame(bag);
	t_mattress(bag);
	for (const s of [-1, 1]) t_bolster(bag, s * (t_M.hx - 0.1), t_D.top + 0.086);
	// three scatter cushions leaning on the back rail
	const lean = [[-0.5, 'linen-rust', 0.08, 1.0, -0.05], [0.02, 'linen-sage', -0.04, 1.06, 0.02], [0.53, 'linen-oat', -0.1, 0.97, 0.06]];
	lean.forEach(([x, m, turn, tilt, roll], k) => {
		const p = t_pillow(0.45, 0.25, k);
		const mtx = at(x, t_D.top + 0.165, -0.252 + 0.008 * k, turn, 1, tilt, roll);
		bag.add(m, p.body, mtx);
		bag.add(m, p.piping, mtx);
	});
	t_throw(bag, 0.47, 0.1, 0.13);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor under its middle', front: '+z (its open long side)', seat: t_D.top };
	return g;
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
