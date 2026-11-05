/*
 * LANTERN, FLOOR — a paper floor lantern 1.20 m high: a tall ribbed shade Ø 0.40 m and 0.90 m tall, a cylinder with
 * rounded shoulders (a superellipse in section; the tall paper floor lanterns run 1.0–1.5 m high, Ø 0.35–0.50 m), washi
 * paper on a spiral of thin wire (40 turns, 2.9 cm apart) that shows as fine ridges and, lit from inside, as fine dark
 * lines, its glow brightest round its middle; wire rings
 * round its openings; standing on a slim tripod of three oiled-oak legs (Ø 21 mm tapering to 15 mm, feet in brass)
 * that meet in a brass hub inside it, a brass stem up to the socket and a warm bulb at the shade's middle.
 * Origin: the floor under its middle.
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

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/**
 * A paper lantern's skin: the paper on a spiral of wire. `mer` its meridian [r, y] from the bottom opening to the top
 * one; the wire a helix making `o.ribs` turns from opening to opening, the paper between its turns falling in by `dip`
 * (flat between them, sharp over the wire); built along the helix itself (each row a helix parallel to the wire, `per`
 * rows to a turn), so the ridges never alias and the seam closes on itself. UVs: u once round, v once up the meridian
 * (the paper's picture draws the wire's helix and the glow to match).
 */
function t_ribbed(mer, dip, o = {}) {
	const per = o.per ?? 3, C = o.cols ?? 64, ribs = o.ribs ?? t_RIBS;
	const s = [0];
	for (let k = 1; k < mer.length; k++) s.push(s[k - 1] + Math.hypot(mer[k][0] - mer[k - 1][0], mer[k][1] - mer[k - 1][1]));
	const L = s.at(-1), pitch = L / ribs;
	// the meridian at arc length x: its point and its outward normal
	const merAt = (x) => {
		let k = 1;
		while (k < s.length - 1 && s[k] < x) k++;
		const f = (x - s[k - 1]) / (s[k] - s[k - 1] || 1);
		const [r0, y0] = mer[k - 1], [r1, y1] = mer[k];
		const l = Math.hypot(r1 - r0, y1 - y0) || 1;
		return [r0 + (r1 - r0) * f, y0 + (y1 - y0) * f, (y1 - y0) / l, -(r1 - r0) / l];
	};
	const rows = (ribs + 1) * per + 1, W = C + 1;
	const pos = [], uv = [];
	for (let r = 0; r < rows; r++)
		for (let m = 0; m <= C; m++) {
			const x = clamp(pitch * (r / per + m / C) - pitch, 0, L);
			const [rr, y, nr, ny] = merAt(x);
			const w = mod(r, per) / per;
			const off = -dip * Math.pow(Math.sin(Math.PI * w), 0.5) * span(x, 0, 0.015) * span(L - x, 0, 0.015);
			const a = (m / C) * TAU, R = rr + nr * off;
			pos.push(new THREE.Vector3(R * Math.cos(a), y + ny * off, R * Math.sin(a)));
			uv.push(m / C, x / L);
		}
	const idx = [];
	for (let r = 0; r < rows - 1; r++)
		for (let m = 0; m < C; m++) {
			const a = r * W + m, b = a + W, c = a + 1, d = b + 1;
			idx.push(a, b, c, b, d, c);
		}
	const nor = pos.map(() => new THREE.Vector3());
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
	for (let k = 0; k < idx.length; k += 3) {
		const [p, q, t] = [idx[k], idx[k + 1], idx[k + 2]];
		f.crossVectors(e1.subVectors(pos[q], pos[p]), e2.subVectors(pos[t], pos[p]));
		nor[p].add(f);
		nor[q].add(f);
		nor[t].add(f);
	}
	// the seam: the last column of a row is the first of the row a turn on
	for (let r = 0; r + per < rows; r++) {
		const a = r * W + C, b = (r + per) * W;
		const sum = nor[a].clone().add(nor[b]);
		nor[a].copy(sum);
		nor[b].copy(sum);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap((p) => [p.x, p.y, p.z]), 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor.flatMap((n) => n.normalize().toArray()), 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/** how many turns the wire makes from opening to opening, and the paper's glued strips round: every lantern alike */
const t_RIBS = 40, t_GORES = 16;
/**
 * The lantern's paper (its pictures its own, two, the same for every lantern): in daylight warm white with its fibres,
 * the wire's helix showing faintly through it and the overlaps where its strips are glued; lit from inside, the wire
 * and the overlaps darker lines (more paper, less light) and the glow brightest round its middle, dimmer toward the
 * openings. u once round, v once up the meridian.
 */
function t_paper() {
	material('c-paper', 1, () => {
		// one pass paints both: the daylight colour, and the glow as a grey picture (its warmth the emissive colour's)
		const s = surface({
			px: 256,
			py: 640,
			maps: ['map', 'roughnessMap'],
			paint: (u, v, o) => {
				const ph = mod(v * t_RIBS - u, 1), d = Math.min(ph, 1 - ph);
				const wire = Math.exp(-Math.pow(d / 0.065, 2));
				const g = mod(u * t_GORES, 1), seam = span(0.03 - Math.min(g, 1 - g), -0.006, 0.006);
				const fib = fbm(u, v, 48, 2, 301, 24) - 0.5;
				const glow = 0.32 + 0.68 * Math.pow(Math.sin(Math.PI * clamp(v)), 1.1);
				o.c = scalec([1, 0.965, 0.915], 0.97 - 0.22 * wire - 0.05 * seam + fib * 0.06);
				o.k = (1 - 0.72 * wire - 0.22 * seam + fib * 0.1) * glow;
			}
		});
		return new THREE.MeshStandardMaterial({ color: '#fff8ef', map: s.map, emissive: '#ffcf96', emissiveMap: s.roughnessMap, emissiveIntensity: 1.0, roughness: 0.92, side: THREE.DoubleSide });
	});
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
	id: 'lantern-floor',
	label: 'Paper floor lantern',
	note: 'A paper floor lantern 1.20 m high: a tall ribbed paper shade Ø 0.40 m on a fine wire spiral, lit from inside, standing on a slim tripod of oak legs with brass feet.'
};

t_paper();

function thingBuild() {
	const bag = new Bag(THING.id);
	const R = 0.2, yc = 0.75, V = 0.45, n = 3, rB = 0.085, rT = 0.07;
	// the meridian: a superellipse, a cylinder with soft shoulders, from the bottom opening to the top one
	const pt = (p) => [R * Math.pow(Math.abs(Math.sin(p)), 2 / n), yc - V * Math.sign(Math.cos(p)) * Math.pow(Math.abs(Math.cos(p)), 2 / n)];
	const p0 = Math.asin(Math.pow(rB / R, n / 2)), p1 = Math.PI - Math.asin(Math.pow(rT / R, n / 2));
	const mer = Array.from({ length: 300 }, (_, k) => pt(p0 + (k / 299) * (p1 - p0)));
	bag.add('c-paper', t_ribbed(mer, 0.005, { cols: 64 }));
	bag.add('bronze', t_wireRing(rB, mer[0][1], 0.0016));
	bag.add('bronze', t_wireRing(rT, mer.at(-1)[1], 0.0016));
	// the tripod: three oak legs from the floor into the shade, a brass hub where they meet, brass feet
	const hub = 0.44;
	for (let k = 0; k < 3; k++) {
		const a = (k / 3) * TAU + Math.PI / 6;
		const foot = [0.21 * Math.cos(a), 0.008, 0.21 * Math.sin(a)], top = [0.017 * Math.cos(a), hub, 0.017 * Math.sin(a)];
		bag.add('oak', t_grainAlong(bar(foot, top, 0.0105, 0.0075, 14), TILE.oak));
		bag.add('brass', new THREE.SphereGeometry(0.0108, 14, 10), at(foot[0], 0.0085, foot[2], 0, [1, 0.8, 1]));
	}
	bag.add('brass', t_lathe([[0, hub - 0.025], [0.014, hub - 0.022], [0.02, hub - 0.012], [0.021, hub + 0.012], [0.012, hub + 0.022], [0, hub + 0.024]], 24));
	// the stem, the socket and the bulb
	const yBulb = yc + 0.02;
	bag.add('brass', bar([0, hub + 0.02, 0], [0, yBulb - 0.06, 0], 0.0045, 0.0045, 12));
	bag.add('shadow', t_lathe([[0, yBulb - 0.075], [0.0135, yBulb - 0.073], [0.0145, yBulb - 0.03], [0.0135, yBulb - 0.026], [0, yBulb - 0.026]], 20));
	bag.add('opal', new THREE.SphereGeometry(0.032, 24, 16), at(0, yBulb, 0, 0, [1, 1.12, 1]));
	const g = bag.build();
	g.userData.anchor = { origin: 'floor under its middle' };
	g.userData.lamp = { at: [0, yBulb, 0], lumens: 800, colour: '#ffcf96' };
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
