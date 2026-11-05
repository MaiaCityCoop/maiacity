/*
 * THE FOREST DOME, 80 m — a geodesic dome of 80 m across whose south three quarters are a food forest under glass and
 * whose north quarter holds the rooms, four storeys stepping back from the shell as indoor terraces over the forest.
 *
 *   1. KIT        chance and noise, the painted surfaces (canvas pictures: colour, relief and roughness, a tile in
 *                 metres), the materials, the geometry helpers and the Bag that merges by material, in squares
 *   2. PLAN       the measures every part shares: the shell, the north quarter's levels, façades and rooms, the doors,
 *                 the plants and the things it names
 *   3. SHELL      the geodesic skin: glass in white bioceramic frames to the south, closed panels with triangular
 *                 windows to the north, the doors, the plinth
 *   4. OUTSIDE    a one-storey limestone arcade round the dome's foot and on it a terrace all round (its balustrade,
 *                 four stairs up, pergolas over the gates, furnished), its walk, the paths out
 *   5. GROUND     inside: the forest floor, the meandering paths, the brook and its pond, the bridges, and where each
 *                 plant of the library stands
 *   6. BUILDING   the north quarter: slabs, curved glass façades, indoor terraces with slatted oak rails, stairs, walls
 *   7. FURNISHING where each thing of the library stands, room by room and on the terraces
 *   8. RECIPE     the build and `module.exports.recipe`
 *
 * North is +z, east +x; 1 unit is 1 m; y 0 is the ground; the middle of the floor at the origin. The plants and the
 * furniture are play's own assets, each named by the hash of its recipe file: the build marks where each stands (a node
 * named `use:<hash>?values`) and the page draws it there; none of them is copied in.
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

/* ================================================================================================================
 * 2. PLAN — the measures every part shares
 * ================================================================================================================ */

/** the dome: 80 m across, a hemisphere, a class-I icosahedral geodesic of frequency 12 (1,440 triangles, struts of
 *  3.1–4.4 m, 751 hubs), a five-fold hub at its top and its base ring exactly on the ground */
const R = 40;
const FREQ = 12;
/** the radius of the shell at height y */
const shellR = (y) => Math.sqrt(Math.max(0, R * R - y * y));

/**
 * The north quarter: four levels of rooms. Each level's glass façade is a curve concave to the garden (an arc of
 * radius RHO, its middle at `g` north of the dome's middle), stepping back TERRACE metres a level, so each level's floor
 * runs out in front of its façade as its terrace, over the façade of the level below. The ground level's footprint,
 * from its façade to the shell, is a quarter of the dome's floor (1,257 m²).
 */
const RHO = 100;
const TERRACE = 3.5;
/** a slab's depth under its floor; the rooms keep `GAP` inside the shell (its structure and insulation) */
const SLAB = 0.35;
const GAP = 0.9;
const LEVELS = [
	{ y: 0, h: 4.5, g: 18.5, name: 'ground' },
	{ y: 4.5, h: 4, g: 22, name: 'first' },
	{ y: 8.5, h: 4, g: 25.5, name: 'second' },
	{ y: 12.5, h: 4, g: 29, name: 'third' }
];
/** the top of the third level: the sky garden on its roof */
const ROOF = 16.5;
/** the plaza in front of the ground level, paved, the forest beyond it */
const PLAZA = 6;
/** z of level k's façade at x */
const facadeZ = (k, x) => LEVELS[k].g - (x * x) / (2 * RHO);
/** z of the front edge of level k's floor at x: the façade of the level below (the ground's: the plaza's edge) */
const edgeZ = (k, x) => (k === 0 ? facadeZ(0, x) - PLAZA : facadeZ(k - 1, x));
/** x (≥ 0) where a line z(x) meets the circle of radius `r`: found by halving */
function meets(z, r) {
	let lo = 0, hi = r;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (m * m + z(m) * z(m) < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/** how far east and west level k's façade runs, at height y (its floor by default), inside the shell by GAP */
const facadeEnd = (k, y = LEVELS[k].y) => meets((x) => facadeZ(k, x), shellR(y) - GAP);
/** whether [x, z] is in the north quarter's footprint (behind the ground level's façade) */
const inBuilding = (x, z) => z >= facadeZ(0, x) && x * x + z * z < R * R;
/** whether [x, z] is in the garden: inside the shell's foot by `margin` and in front of the plaza */
const inGarden = (x, z, margin = 0) => Math.hypot(x, z) < R - 1.4 - margin && z < edgeZ(0, x) - margin;

/**
 * A point on level k's façade at x, as a frame: where it is (on the level's floor), `along` the façade eastward and
 * `out` to the garden (unit [x, z] each), and `ry`, the turn that lays a room's own axes on it (its +x along, its +z
 * out to the garden; so a room's depth into the building is −z).
 */
function facadeFrame(k, x) {
	const z = facadeZ(k, x);
	const tx = 1, tz = -x / RHO;
	const l = Math.hypot(tx, tz);
	const along = [tx / l, tz / l];
	const out = [along[1], -along[0]];
	return { x, y: LEVELS[k].y, z, along, out, ry: Math.atan2(out[0], out[1]) };
}
/** the matrix of a room's own frame (+x along the façade, −z into the building, y up from its floor) at façade x */
const roomMatrix = (k, x) => {
	const f = facadeFrame(k, x);
	return at(f.x, f.y, f.z, f.ry);
};
/** how deep (m, from level k's façade at x, straight in) a room has at least `head` of headroom under the shell */
function deepAt(k, x, head = 2.5) {
	const r = shellR(LEVELS[k].y + head) - GAP;
	const f = facadeFrame(k, x);
	// along −out from the façade until the circle of radius r
	let lo = 0, hi = 60;
	for (let i = 0; i < 40; i++) {
		const m = (lo + hi) / 2;
		const px = f.x - f.out[0] * m, pz = f.z - f.out[1] * m;
		if (px * px + pz * pz < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/** the spiral stairs: one each side of the middle, from the ground to the sky garden (their middles, radius) */
const STAIRS = [-1, 1].map((s) => ({ x: s * 12, z: 31.3, r: 1.7 }));
/** the front rooms' depth, the bath behind a suite */
const FRONT = 7.2;
const BATH = 3.2;
/**
 * THE ROOMS — every room of the north quarter as a rectangle in its own frame (`roomMatrix(level, x)`): `x` its middle
 * along the façade, `w` its width, `d0` … `d1` its depth from the glass in; `kind` what it is for (hall, library,
 * workshop, suite, bath, studio, lounge, stair, service) and `h` its clear height. Rooms side by side share a wall at
 * their edge; a suite's bath (and its studio, where the level is deep) stands behind it in the same bay.
 */
function planRooms() {
	const rooms = [];
	const add = (k, kind, x0, x1, d0, d1, extra = {}) => {
		const x = (x0 + x1) / 2, w = Math.abs(x1 - x0);
		// as deep as its middle has headroom; its outer corner may be cut by the shell (`outer`: the depth there)
		const end = Math.min(d1, deepAt(k, x));
		const outer = Math.min(d1, deepAt(k, Math.abs(x0) > Math.abs(x1) ? x0 : x1));
		if (w < 2.5 || end - d0 < 3) return;
		rooms.push({ id: `${LEVELS[k].name}-${kind}-${rooms.length}`, level: k, kind, x, w, d0, d1: end, outer, h: LEVELS[k].h - SLAB, ...extra });
	};
	for (let k = 0; k < LEVELS.length; k++) {
		const E = facadeEnd(k) - 0.6;
		for (const s of [-1, 1]) {
			const X = (a, b) => (s < 0 ? [-b, -a] : [a, b]);
			const bays = [];
			if (k === 0) {
				bays.push([9, 9.75, 'service'], [9.75, 14.25, 'stair'], [14.25, 24, s > 0 ? 'library' : 'workshop']);
				for (let a = 24; a + 6 <= E; a += 6.5) bays.push([a, Math.min(a + 6.5, E), 'suite']);
			} else {
				bays.push([4, 9.75, 'suite'], [9.75, 14.25, 'stair']);
				for (let a = 14.25; a + 5 <= E; a += 6.5) bays.push([a, Math.min(a + 6.5, E), 'suite']);
			}
			for (const [a, b, kind] of bays) {
				const [x0, x1] = X(a, b);
				if (kind === 'stair') add(k, 'stair', x0, x1, 0, 40);
				else if (kind === 'suite') {
					add(k, 'suite', x0, x1, 0, FRONT);
					add(k, 'bath', x0, x1, FRONT, FRONT + BATH);
					add(k, 'studio', x0, x1, FRONT + BATH, 40);
				} else if (kind === 'service') add(k, 'service', x0, x1, 0, 40);
				else {
					add(k, kind, x0, x1, 0, 12);
					add(k, 'service', x0, x1, 12, 40);
				}
			}
		}
		// the middle: the dining hall and its kitchen on the ground, a lounge over it on each level above
		if (k === 0) {
			add(0, 'hall', -9, 9, 0, 12);
			add(0, 'service', -9, 9, 12, 40);
		} else add(k, 'lounge', -4, 4, 0, k === 3 ? 40 : 9);
	}
	return rooms;
}
const ROOMS = planRooms();

/** the doors, by bearing (0 north, east π/2): three into the forest, one to the north for the house's own use */
const DOORS = [
	{ id: 'east', a: Math.PI / 2 },
	{ id: 'south', a: Math.PI },
	{ id: 'west', a: -Math.PI / 2 },
	{ id: 'north', a: 0, service: true }
];
/**
 * A door (Samuel 2026-11-05: larger than it was, a gate, a Tor, its arch round, about 4 m high, in mason's stone like
 * the arcade's): a round-arched gateway, straight limestone jambs `w` apart rising to `spring`, then a semicircular arch of
 * voussoirs with a keystone (`ring` deep), its top at `top`; two heavy oak gate leaves (`leaf` wide each, arched heads)
 * standing open, glazed in the arch above them. `hw` its half width, `foot` the threshold's width; the north one,
 * for the house's own use, smaller.
 */
const doorSize = (d) => {
	// about 4 m high (Samuel: "not 8 m … like 3 m or 4 m"): a wide, round, squat Tor, the semicircle on short jambs
	const o = d.service ? { w: 2.6, spring: 1.9, ring: 0.45 } : { w: 4, spring: 2, ring: 0.55 };
	return { ...o, r: o.w / 2, hw: o.w / 2, top: o.spring + o.w / 2, foot: o.w, leaf: o.w / 2 };
};

/**
 * THE PLANTS — play's own plants the forest is grown from, each named by the hash of its recipe file (an accepted
 * version in play's catalog: plants/<id>@<v>, always its newest, and for a plant of kinds its default kind), never
 * copied in (Samuel 2026-11-05: always the latest plants; a plant's newer version moves the dome by its own proposal). The page builds each where the dome marks it
 * (a node named `use:<hash>?seed=…&stage=…`) and draws it with its levels of detail. Stages 0 … 9 for each.
 * `h` its height grown (m, its build at its last stage), `w` its crown's width, the layer it stands in, `stages` its
 * last stage where it is not 9 (a stage asked for 0 … 9 is laid on its own, the last on its last).
 */
const PLANTS = {
	// canopy
	'king-coconut': { v: 1, hash: '36c753b13daf0bcde55996355c7096117cf3a0c862683726e9491db18dd22cee', layer: 'canopy', h: 15.6, w: 9.7 },
	mango: { v: 2, hash: 'f6facbf6d1f408d8d0ae04d201ab1f2951844143a6bb36d79c6c9726ec75167c', layer: 'canopy', h: 7.5, w: 7.6, stages: 10 },
	jackfruit: { v: 3, hash: '4eaeacc79ff3804890891417ee7ac86ad9398761881c78412ab7ac5c07fadd38', layer: 'canopy', h: 9, w: 8.5 },
	durian: { v: 3, hash: '7a080288fc115fe82ae9dbe7155bce55202f242667fad1de370dca8670c0d78e', layer: 'canopy', h: 10, w: 8, stages: 11 },
	// 'Fuerte', grown from its reference sheet
	avocado: { v: 4, hash: '03ac067b6ed739e33f51870077e750fc266673bd1f4cdf70fe2d3014f6f153a9', layer: 'canopy', h: 6.4, w: 7.2 },
	sapodilla: { v: 3, hash: '13238fa27a29a14f2a441dd4fd2a9c9dd98552a902608c05a44da6b944065810', layer: 'canopy', h: 8, w: 6.5, stages: 10 },
	// below the canopy
	// 'Tarocco' and 'Femminello Santa Teresa', grown flush by flush
	orange: { v: 3, hash: '43292fc2e2e6926b49c0f605ec726e737695e42ddb8eb228ffada339b61e040b', layer: 'low', h: 5, w: 3.4, stages: 10 },
	lemon: { v: 3, hash: '9159e9965f12b0b9697dea6af42161c28034b2aa39c4d15470fa274035e3e761', layer: 'low', h: 4.1, w: 3.7 },
	cacao: { v: 4, hash: '7f7accd6a5f02cfa427cb33f8cc287dd087ca9112bf6bd0fedf493d472069ad2', layer: 'low', h: 6.4, w: 7.4, stages: 10 },
	soursop: { v: 4, hash: '811c83a519169772c4f39a6b02d5f3075621dea2c96f437deceee91980a74c45', layer: 'low', h: 6, w: 5 },
	// papaya (Maia's, from 26 photographs; its hermaphrodite kind, 'both') and the 'Dwarf Cavendish' banana
	papaya: { v: 4, hash: '715ba989382708bdf946298ecdac92031b59cb09970234102a59127f2f4ab2f2', variant: 'both', layer: 'low', h: 3.2, w: 2.3 },
	banana: { v: 4, hash: '971f2c616e1ee35daaa2f0e12d760937860784689276ebffe98f8949823aeed6', layer: 'low', h: 3.4, w: 4 },
	'red-banana': { v: 3, hash: '24a2ac91da2479a9c32938c794fa9a57127f0a679911deea465657fddbe29c5a', layer: 'low', h: 6, w: 4.7 },
	fig: { v: 2, hash: 'd33ed2f1de12e8d282861ef6b8bebdcb535f7f60526eb449a1aa42b0032d1fd7', layer: 'low', h: 4.5, w: 5, stages: 11 },
	pomegranate: { v: 3, hash: '067a7a817edcc672264bee5853bcc7be133725dd0af4af76841cc197801a8eeb', layer: 'low', h: 4, w: 3.5 },
	// shrubs
	coffee: { v: 3, hash: 'a1c18ba1c4c7568bc0b2908a1370ed9773b7b5293077ea0b008a3718b3ad94f9', layer: 'shrub', h: 2.5, w: 2, stages: 11 },
	pepper: { v: 1, hash: '7c48d80dd697801f49011598a7d52ed1694155c5dc036240e5ac57599732318c', layer: 'shrub', h: 1, w: 0.8 },
	// herbs and the ground
	ginger: { v: 1, hash: 'dc8bef9174dce599b1dd04b61e9c69386c4ea668e853fb19fb2eec185f96cde5', layer: 'herb', h: 1.2, w: 0.8 },
	comfrey: { v: 1, hash: 'c3c19e96d453f788d9dbe0304745e018c9cbeb5f22a2af5ede69e740504aac82', layer: 'herb', h: 0.9, w: 0.8 },
	basil: { v: 1, hash: '76947a593571ab762030bf3055654cd1d7390404083e460a65434c4e05d50785', layer: 'herb', h: 0.5, w: 0.4 },
	// the terrace's troughs: Mediterranean herbs, their roots shallow enough for a trough
	lavender: { v: 1, hash: 'c5e7c0171f81d5d1b3c68d44814fe51bb3714f68a4ef2185cf91f230461c832a', layer: 'herb', h: 0.6, w: 0.6 },
	rosemary: { v: 1, hash: '69b5c11335d922f06e9f7a89b963edf666f406a9189d70a93d933d1a6116748a', layer: 'herb', h: 0.9, w: 0.7 },
	pineapple: { v: 3, hash: '6d8dd54db02745284d29277dea4b51ecd7cd19b3563a211e78d2d30d869b4efa', layer: 'herb', h: 1, w: 1.2, stages: 10 },
	strawberry: { v: 1, hash: '05794d83dbe6711c0455740bbb7d0a37e273abd865d4b6f6b27ee47c6230a65b', layer: 'ground', h: 0.25, w: 0.4 },
	nasturtium: { v: 1, hash: '9b0a505c9cc5770ce98345159bef475a742d8a6817b05a26dbdd2bfb3c3f9705', layer: 'ground', h: 0.3, w: 0.6 },
	clover: { v: 1, hash: '7784d276d5bce4f40938e19a48fdefd392806c689fe51139d36d9bd36c132cb0', layer: 'ground', h: 0.2, w: 0.4 },
	// climbers and fungi
	'passion-fruit': { v: 1, hash: '32d1e8009d4d0932f810a7c1ba860d4e0f0be10503a8b4f72f8587c6ddda214c', layer: 'climber', h: 3, w: 2 },
	oyster: { v: 1, hash: '233303f8360c6252385499060504f21488fd52ef517f5ed863ff92ae51278645', layer: 'fungi', h: 0.2, w: 0.3 },
	shiitake: { v: 1, hash: '45c277b9024eb73ed26abf5503835c82163461ff4ac770cb9445a4fce335a2a1', layer: 'fungi', h: 0.2, w: 0.3 }
};

/**
 * THE FLOOR — the forest's floor is play's own biome, named by its recipe's hash: 'Food forest under glass'
 * (biomes/warm-food-forest@1, Sandbox 1's floor under its domes: green, litter, humus and moss, and a cover of grass,
 * clover, wild strawberry, wood sorrel, ferns, moss and fallen leaves). The ground part builds the terrain in 'soil'
 * (its look where the page can't lay the biome), cut away under the paths, the plaza and the water; the recipe names
 * those meshes `biome:<hash>`, and the page paints them with the biome's surfaces and streams its cover over them.
 */
const BIOME = { hash: '7be775be02b915dbda75d99cfec0b3edbb79c0a4950c0cd6258fd1406069b35f', label: 'Food forest under glass' };

/**
 * What the parts make the dome into: their bags by name (merged by material at the end), the plants marked, the lamps
 * lit (a point light each, at most LAMPS, and the walker's lamps), the places that must stay clear (`keep`: circles
 * a plant must not stand in), and the floors a walker starts on.
 */
const LAMPS = 4;
function newDome() {
	const dome = {
		root: new THREE.Group(),
		bags: {},
		/** the bag named `name`, made the first time */
		bag(name) {
			return (this.bags[name] ??= new Bag(name));
		},
		plants: [],
		lamps: [],
		walkLamps: [],
		keep: [],
		/**
		 * A plant of the library at [x, y, z]: its kind (a key of PLANTS), its stage (0 … 9), its seed (a sister plant), its
		 * turn round y and its scale. Marked by a node the page finds by its name.
		 */
		plant(kind, x, y, z, o = {}) {
			const p = PLANTS[kind];
			if (!p) throw new Error(`no plant ${kind}`);
			// asked 0 … 9 (9 ripe), laid on the plant's own stages: only two of them, grown (7 and on) or young, and one
			// seed for every plant of a kind, so the page builds each kind twice at most however many stand (each stage
			// and seed is a build of its own, made in the box: 289 of them made v2 slow to come in); the forest's variety
			// is in each one's turn and size
			// (a tree in a pot on the terrace asks for its own young stage exactly, `o.exact`: one whose roots stay in the pot)
			const stage = o.exact ?? Math.round(((clamp(o.stage ?? 9, 0, 9) >= 7 ? 9 : 6) / 9) * (p.stages ?? 9));
			const seed = 'a';
			const node = new THREE.Group();
			node.name = `use:${p.hash}?seed=${seed}&stage=${stage}`;
			node.position.set(x, y, z);
			node.rotation.y = o.turn ?? 0;
			node.scale.setScalar(o.scale ?? 1);
			this.plants.push({ kind, x, y, z, stage, seed, node });
			return node;
		},
		things: [],
		/**
		 * A thing of the library (a key of THINGS: a bed, a lamp, a table) standing where `x` says: at [x, y, z] turned
		 * `turn` round y, or by a whole matrix (a room's frame times the thing's place in it). Marked by a node the page
		 * finds by its name and draws the thing at; the thing itself is play's own asset, never built here.
		 */
		place(thing, x, y, z, o = {}) {
			const t = typeof THINGS === 'undefined' ? undefined : THINGS[thing];
			if (!t) throw new Error(`no thing ${thing}`);
			const node = new THREE.Group();
			node.name = `use:${t.hash}`;
			if (x?.isMatrix4) node.applyMatrix4(x);
			else {
				node.position.set(x, y, z);
				node.rotation.y = o.turn ?? 0;
			}
			this.things.push({ thing, node });
			return node;
		},
		/** a light where a lamp is: a warm point light (while there are lights to give), and the walker's lamp */
		lamp(x, y, z, o = {}) {
			this.walkLamps.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]);
			if (this.lamps.length >= LAMPS) return null;
			const l = new THREE.PointLight(o.color ?? '#ffd9a8', o.intensity ?? 6, o.distance ?? 7, 2);
			l.position.set(x, y, z);
			this.lamps.push(l);
			return l;
		}
	};
	return dome;
}

/**
 * THE THINGS — play's own furniture the rooms are furnished with, each its own asset of the Things group, named by the
 * hash of its recipe file (things/<slug>@1): the page draws each where the dome places it (dome.place), never copied in.
 */
const THINGS = {
	'armchair-round': { hash: '343f073aed71f011975771bd4f6c1a950c0e453366764cf185546bd804c388ef', label: "Armchair, round" },
	'bath-tub-freestanding': { hash: '1ea81f24767d86443c13ea8a197720f068359efff72fbc3248720da71d2b5166', label: "Freestanding bath tub" },
	'bed-platform': { hash: 'e221daa585b9548b768db715bcdcd084dbbd9414125d4ec838b542a1207e5167', label: "Bed, platform" },
	'bench-oak-curved': { hash: 'd28efccc1c2076469b652d8890b9c86c7e2bde9d65820e0a1373e134188e0472', label: "Curved oak bench" },
	'bookcase-oak': { hash: '5c4b003c21f1cb93ef48257c00f14a0a5095a24c3ae17f4d1842fe48838b628a', label: "Oak bookcase" },
	'chair-desk': { hash: 'bf17d5b79d4c4e5d176086bc9ab2cbab435592fb7a49c12e9414dc1813a3cb2e', label: "Chair, desk" },
	'chair-spindle': { hash: 'c1a130c7f83c479e68ee43724e29381d31f1b6c359bc1ae4c412b978e7143402', label: "Oak spindle chair" },
	'curtain-linen': { hash: '1f49cb03e15e8b0bce5e588a8261c2e3a2eeac490a7d2e44ea1cec5f918ed13e', label: "Curtain, linen" },
	'daybed-terrace': { hash: 'e8f28e0767bf3f4636b58c23909aa3fa9a09b7a46eaff9e8d1565232b5a89976', label: "Terrace daybed" },
	'desk-curved': { hash: 'fe0550236824a963e4d699ea77afcb5048a85675b3f59d15f39344a3235922cc', label: "Desk, curved" },
	'kitchen-counter': { hash: '8a36fd608ff607ab86983ed445cc86d8f732cf4a0bf675b0341307fafdd12e0b', label: "Oak kitchen counter" },
	'kitchen-island-curved': { hash: '25c3798ad10bc0382037ae010a6e8c385c584c9303ef5cb12ead9bd03e44acf1', label: "Curved kitchen island" },
	'lamp-mushroom': { hash: '795e81f88390b90873e6d556e4631ad6b8cb0109e3b49cb0a6b9baa59091572a', label: "Lamp, mushroom" },
	'lantern-floor': { hash: 'a1e2f254548d65c8e5d52f2f32a2078c2b34474d596efac34f790d01dd3f533a', label: "Paper floor lantern" },
	'lantern-pendant-large': { hash: '296bf169c7fdaf386d10094159ce02134d3d7dc1d0c4980806cf5028494aace1', label: "Large paper lantern" },
	'lantern-pendant': { hash: 'be3c94e6040b070f27e5583b48651616f18858b47b4b969d4ab6235df2e2c597', label: "Paper pendant lantern" },
	'nightstand-round': { hash: '2f724ed75dc558660bbf26874d86687ac3d36679cd3c73edd9ec34162c254d28', label: "Nightstand, round" },
	'planter-trough': { hash: '14a0055018b0fbecf83b17075342d1dac94e9c2da9580cf605193ed7db1ac230', label: "Long planter trough" },
	'pot-terracotta': { hash: '4b51c90df21283350778a7be2bab8a85166d16d739771a14bec9326cf518d479', label: "Terracotta pot" },
	'pouf-linen': { hash: 'c3842dd8afba5bdc0bd49e891fc45321612382752b227b3a0dc5b22327cdfaba', label: "Pouf, linen" },
	'rug-jute-round': { hash: 'fce8bafdbfb03dd386f3d8728e653c9a711c068294aaf1f7605fb9d855202ad8', label: "Rug, jute, round" },
	'shower-walk-in': { hash: '8042e8fa9c4b20220b8088793cf9e2df701f91da3e94522e1a03a1058476af3d', label: "Walk-in shower" },
	'sofa-curved': { hash: '28b74c206e804c1b614609f091409bce3d833c7cc0e3c5508ec01da89cb48e1d', label: "Sofa, curved" },
	'stool-oak': { hash: 'd04107cf89209820bf69635a6b26d7663638afbb725b12c1f601811585fcc49c', label: "Oak counter stool" },
	'table-coffee-travertine': { hash: '90bb6c1497b331726e925c26c359b7f50c8bea41388f07fcabe46a20c3aa38ba', label: "Coffee table, travertine" },
	'table-dining-round': { hash: 'fe5bcb710b9b0ac3d71d8d59f53e49061350504fb6e62c9777bca1f512d0fb3c', label: "Round oak dining table" },
	'table-library-long': { hash: '7826dd82151977fd5123d737dbca2ae8632367311b6486fd52cdc0e9069ab6fa', label: "Oak library table" },
	'table-side-travertine': { hash: '9cd27ea1cc828c3fa9bc1ebfdd25ff8cc5a6182f58c4d3a579237a8c2dd7d6d8', label: "Side table, travertine" },
	'toilet-wall': { hash: 'de6665311200af1e3d83584d8d2a17d23fcb99b9c6b19da65179365bc30abaad', label: "Wall-hung toilet" },
	'vanity-curved': { hash: '47d2feb9dd1e02b9da24e7c88ee8c954cb24c806ea8469fff531d49eb45167d9', label: "Curved oak vanity" },
	'workbench-oak': { hash: '603e4fb35b38312c72c513e1afbf1e70af176fcd092c76a8fb8d7a17e2efa17c', label: "Oak workbench" }
};

/* ================================================================================================================
 * 3. SHELL — the geodesic skin: glass in thick white bioceramic frames over the forest, closed panels with triangular
 *    windows over the rooms, the four round-arched stone gates, and the limestone plinth it all stands on
 * ================================================================================================================ */

/**
 * The skin's measures (m). A panel's offsets run along its outward normal from the plane through its three hubs (its
 * chord plane), + outside and − inside; its insets run in from its edges (the lines between its hubs), in that plane.
 */
const sh_M = {
	// a glazed panel's frame member: a rounded section 0.30 wide and 0.42 deep standing 0.10 proud of the chord plane,
	// its ends 0.27 short of the hubs' middles (inside the hub)
	frameW: 0.3,
	frameOut: 0.1,
	frameIn: -0.32,
	frameR: 0.08,
	trim: 0.27,
	// the hub: a rounded node 0.6 across, its profile [r, h] from its inner pole to its outer: domed outside (0.10 proud
	// of the frames), flatter in
	hub: [
		[0, -0.405],
		[0.2, -0.39],
		[0.285, -0.35],
		[0.3, -0.3],
		[0.3, 0.07],
		[0.27, 0.145],
		[0.17, 0.19],
		[0, 0.205]
	],
	// the glass of a glazed panel: 0.02 inside the chord plane, its edge 0.125 in from the hub lines (25 mm in the
	// frame's rebate), held each side by a bead of 22 mm round against the frame
	glass: -0.02,
	glassIn: 0.125,
	bead: 0.022,
	// a closed panel: its outer face, its inner skin (0.32 apart), the seam between panels (28 mm wide, 50 mm deep),
	// the round of its edge, and its corners' (rounded about a point that far in)
	skinOut: 0.05,
	skinIn: -0.27,
	seam: 0.014,
	edge: 0.014,
	corner: 0.085,
	// a window in a closed panel: the white frame round it, the round of its reveal's edges, its corners' round, its
	// glass (in the reveal, 0.15 in from the outer face)
	band: 0.21,
	reveal: 0.055,
	winCorner: 0.17,
	winGlass: -0.1,
	// the relief inside a closed panel: how far its middle folds in, and its edges' thirds
	fold: [0.12, 0.2],
	crease: [0, 0.06]
};

/** small sums of [x, y, z] */
const sh_v = {
	add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
	sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
	mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
	/** a + b·k */
	madd: (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
	dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
	cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
	len: (a) => Math.hypot(a[0], a[1], a[2]),
	dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
	norm: (a) => {
		const l = Math.hypot(a[0], a[1], a[2]) || 1;
		return [a[0] / l, a[1] / l, a[2] / l];
	},
	lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
	/** unit vectors a and b turned between, t of the way */
	slerp: (a, b, t) => {
		const c = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
		const th = Math.acos(c);
		if (th < 1e-5) return a.slice();
		const s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
		return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
	},
	/** a cubic Bézier through p0 … p3 at t */
	bezier: (p0, p1, p2, p3, t) => {
		const s = 1 - t, a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
		return [0, 1, 2].map((i) => p0[i] * a + p1[i] * b + p2[i] * c + p3[i] * d);
	}
};

/* ---- the shell's own mesh: plain arrays by material and square of ground, given to its bag at the end ---- */

class sh_Mesh {
	constructor() {
		this.parts = new Map();
	}
	/** the arrays of material `m` (with a shade per vertex where `colour`) for something standing over [x, z] */
	at(m, x, z, colour = false) {
		const key = `${m}|${colour ? 'c' : ''}|${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
		let p = this.parts.get(key);
		if (!p) this.parts.set(key, (p = { m, colour, pos: [], nor: [], uv: [], col: [], idx: [] }));
		return p;
	}
	/** the arrays under a key (made as `at` makes them) */
	part(key, m, colour) {
		let p = this.parts.get(key);
		if (!p) this.parts.set(key, (p = { m, colour, pos: [], nor: [], uv: [], col: [], idx: [] }));
		return p;
	}
	/** into the bag: one geometry per material and square */
	into(bag) {
		for (const p of this.parts.values()) {
			if (!p.idx.length) continue;
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
			g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
			g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
			if (p.colour) g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3));
			g.setIndex(p.idx);
			bag.add(p.m, g, null, { colour: p.colour });
		}
	}
}
/** a vertex of part p: where, its normal, its uv (in tiles), its shade; its index */
function sh_vert(p, q, n, u, v, c = 1) {
	p.pos.push(q[0], q[1], q[2]);
	p.nor.push(n[0], n[1], n[2]);
	p.uv.push(u, v);
	if (p.colour) p.col.push(c, c, c);
	return p.pos.length / 3 - 1;
}
/** whether triangle a b c of part p is wound against its vertices' normals (null when it has no area) */
function sh_against(p, a, b, c) {
	const P = p.pos, N = p.nor;
	const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
	const e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
	const g = sh_v.cross(e1, e2);
	if (sh_v.len(g) < 1e-10) return null;
	const n = [N[a * 3] + N[b * 3] + N[c * 3], N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]];
	return sh_v.dot(g, n) < 0;
}
/** a strip of quads between two rows of vertices, wound to face as their normals do */
function sh_strip(p, A, B) {
	let flip = null;
	for (let j = 0; j + 1 < A.length && flip === null; j++) flip = sh_against(p, A[j], A[j + 1], B[j + 1]) ?? sh_against(p, A[j], B[j + 1], B[j]);
	for (let j = 0; j + 1 < A.length; j++) {
		if (flip) p.idx.push(A[j], B[j + 1], A[j + 1], A[j], B[j], B[j + 1]);
		else p.idx.push(A[j], A[j + 1], B[j + 1], A[j], B[j + 1], B[j]);
	}
}
/** a fan from vertex `c` round a row of vertices, wound to face as their normals do */
function sh_fan(p, c, A) {
	let flip = null;
	for (let j = 0; j + 1 < A.length && flip === null; j++) flip = sh_against(p, c, A[j], A[j + 1]);
	for (let j = 0; j + 1 < A.length; j++) {
		if (flip) p.idx.push(c, A[j + 1], A[j]);
		else p.idx.push(c, A[j], A[j + 1]);
	}
}
/**
 * A profile swept along a path: each path point {q, a, b, u} lays the profile's x along `a` (times `k`, a mitre's
 * stretch) and its y along `b`; each profile point {x, y, nx, ny, v} its normal from nx, ny. UVs: metres along the path
 * and round the profile, over `tile`.
 */
function sh_sweep(p, path, prof, tile, shade = 1) {
	let prev = null;
	for (const s of path) {
		const k = s.k ?? 1;
		const ids = prof.map((f) =>
			sh_vert(
				p,
				[s.q[0] + s.a[0] * f.x * k + s.b[0] * f.y, s.q[1] + s.a[1] * f.x * k + s.b[1] * f.y, s.q[2] + s.a[2] * f.x * k + s.b[2] * f.y],
				sh_v.norm([s.a[0] * f.nx + s.b[0] * f.ny, s.a[1] * f.nx + s.b[1] * f.ny, s.a[2] * f.nx + s.b[2] * f.ny]),
				s.u / tile,
				f.v / tile,
				shade
			)
		);
		if (prev) sh_strip(p, prev, ids);
		prev = ids;
	}
	return prev;
}
/** a profile's points with their running length `v` (m) */
function sh_measured(pts) {
	let v = 0;
	pts.forEach((q, i) => {
		if (i) v += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y);
		q.v = v;
	});
	return pts;
}
/** a rounded rectangle as a closed profile (x from x0 to x1, y from y0 to y1, corners of radius r, n steps each) */
function sh_roundProfile(x0, x1, y0, y1, r, n = 3) {
	const pts = [];
	const corners = [
		[x1 - r, y0 + r, -90],
		[x1 - r, y1 - r, 0],
		[x0 + r, y1 - r, 90],
		[x0 + r, y0 + r, 180]
	];
	for (const [cx, cy, a0] of corners)
		for (let i = 0; i <= n; i++) {
			const a = ((a0 + (i * 90) / n) * Math.PI) / 180;
			pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
		}
	pts.push({ ...pts[0] });
	return sh_measured(pts);
}

/* ---- the geodesic ---- */

/**
 * THE GEODESIC — a class-I icosahedral sphere of frequency FREQ, a five-fold hub at its top (+y), cut to the triangles
 * whose hubs all stand on or over the ground: `hubs` (on the sphere of radius R, the base ring exactly on y 0), `tris`
 * (three hubs each, counter-clockwise seen from outside), `edges` (by 'a-b', a < b: its hubs and its one or two
 * triangles) and `panels` (each triangle's plane: its corners, middle, normal, incentre and inradius). The sphere is its
 * own mirror image across x = 0, so the dome is too.
 */
function sh_geodesic() {
	const phi = (1 + Math.sqrt(5)) / 2;
	const ico = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
	const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
	// turned round x so the corner (0, 1, φ) stands at the top
	const turn = Math.atan2(phi, 1), c = Math.cos(turn), s = Math.sin(turn);
	const V = ico.map((p) => {
		const n = sh_v.norm(p);
		return [n[0], n[1] * c + n[2] * s, -n[1] * s + n[2] * c];
	});
	const pts = [], seen = new Map(), all = [];
	const id = (p) => {
		const k = p.map((x) => Math.round(x * 1e6)).join(',');
		if (!seen.has(k)) seen.set(k, pts.push(p) - 1);
		return seen.get(k);
	};
	const F = FREQ;
	for (const [a, b, cc] of faces) {
		const g = [];
		for (let i = 0; i <= F; i++) {
			g[i] = [];
			for (let j = 0; j <= F - i; j++) {
				const k = F - i - j;
				g[i][j] = id(sh_v.norm([0, 1, 2].map((d) => (V[a][d] * k + V[b][d] * i + V[cc][d] * j) / F)));
			}
		}
		for (let i = 0; i < F; i++)
			for (let j = 0; j < F - i; j++) {
				all.push([g[i][j], g[i + 1][j], g[i][j + 1]]);
				if (j < F - i - 1) all.push([g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]]);
			}
	}
	const kept = all.filter((t) => t.every((i) => pts[i][1] > -1e-6));
	const used = new Map(), hubs = [];
	for (const t of kept)
		for (const i of t)
			if (!used.has(i)) {
				const p = sh_v.mul(pts[i], R);
				if (Math.abs(p[1]) < 1e-6) p[1] = 0;
				used.set(i, hubs.push(p) - 1);
			}
	const tris = kept.map((t) => {
		const [a, b, cc] = t.map((i) => used.get(i));
		const n = sh_v.cross(sh_v.sub(hubs[b], hubs[a]), sh_v.sub(hubs[cc], hubs[a]));
		return sh_v.dot(n, sh_v.add(hubs[a], sh_v.add(hubs[b], hubs[cc]))) < 0 ? [a, cc, b] : [a, b, cc];
	});
	const edges = new Map();
	const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
	tris.forEach((t, ti) => {
		for (let k = 0; k < 3; k++) {
			const a = t[k], b = t[(k + 1) % 3], e = key(a, b);
			if (!edges.has(e)) edges.set(e, { a: Math.min(a, b), b: Math.max(a, b), tris: [] });
			edges.get(e).tris.push(ti);
		}
	});
	const panels = tris.map((t) => sh_panel(t.map((i) => hubs[i])));
	// the triangles round each hub
	const around = hubs.map(() => []);
	tris.forEach((t, ti) => t.forEach((i) => around[i].push(ti)));
	return { hubs, tris, edges, panels, around, key };
}
/** a triangle's plane: its corners T, middle c, outward normal n, its plane's distance h0 from the dome's middle, its
 *  incentre I and inradius r, its edges' outward normals in its plane (`on[i]`: the edge from corner i to i + 1) */
function sh_panel(T) {
	const n = sh_v.norm(sh_v.cross(sh_v.sub(T[1], T[0]), sh_v.sub(T[2], T[0])));
	const c = sh_v.mul(sh_v.add(T[0], sh_v.add(T[1], T[2])), 1 / 3);
	const la = sh_v.dist(T[1], T[2]), lb = sh_v.dist(T[2], T[0]), lc = sh_v.dist(T[0], T[1]);
	const per = la + lb + lc;
	const I = sh_v.mul(sh_v.add(sh_v.mul(T[0], la), sh_v.add(sh_v.mul(T[1], lb), sh_v.mul(T[2], lc))), 1 / per);
	const area = sh_v.len(sh_v.cross(sh_v.sub(T[1], T[0]), sh_v.sub(T[2], T[0]))) / 2;
	const on = [0, 1, 2].map((i) => sh_v.norm(sh_v.cross(sh_v.sub(T[(i + 1) % 3], T[i]), n)));
	const e1 = sh_v.norm(sh_v.sub(T[1], T[0]));
	return { T, n, c, h0: sh_v.dot(c, n), I, r: (2 * area) / per, on, e1, e2: sh_v.cross(n, e1) };
}
/**
 * A ring round a panel: its outline `inset` in from its edges, in the plane `off` from its chord plane (its corners
 * scaled from the dome's middle, so every panel's ring at the same offset meets its neighbours' exactly), its corners
 * rounded about a point `centre` in from both edges (sharp where centre ≤ inset), m + 1 points a corner: [point,
 * outward direction in the plane] each.
 */
function sh_ring(P, off, inset, centre, m) {
	const k = (P.h0 + off) / P.h0;
	const I = sh_v.mul(P.I, k), r = P.r * k;
	const at = Math.max(centre, inset), rad = at - inset;
	const out = [];
	for (let i = 0; i < 3; i++) {
		const B = sh_v.mul(P.T[i], k);
		const ctr = sh_v.lerp(B, I, at / r);
		const na = P.on[(i + 2) % 3], nb = P.on[i];
		for (let j = 0; j <= m; j++) {
			const d = sh_v.slerp(na, nb, j / m);
			out.push([sh_v.madd(ctr, d, rad), d]);
		}
	}
	return out;
}
/**
 * Rings round a panel, each a row of vertices, joined in strips (a ring marked `brk` starts afresh: a crisp edge).
 * Each ring: {off, inset, centre, a, b, c}: its normal a·(outward in the plane) + b·(the panel's normal), c its shade.
 * UVs: metres round the ring and down the profile. The last ring's vertices back.
 */
function sh_rings(p, P, rings, m, tile) {
	let prev = null, pv = null, v = 0;
	for (const R0 of rings) {
		const pts = sh_ring(P, R0.off, R0.inset, R0.centre, m);
		pts.push(pts[0]);
		if (pv && !R0.brk) v += sh_v.dist(pv[0][0], pts[0][0]);
		const ids = [];
		let u = 0;
		for (let j = 0; j < pts.length; j++) {
			if (j) u += sh_v.dist(pts[j - 1][0], pts[j][0]);
			const [q, o] = pts[j];
			const n = sh_v.norm(sh_v.add(sh_v.mul(o, R0.a), sh_v.mul(P.n, R0.b)));
			ids.push(sh_vert(p, q, n, u / tile, v / tile, R0.c ?? 1));
		}
		if (prev && !R0.brk) sh_strip(p, prev, ids);
		prev = ids;
		pv = pts;
	}
	return prev;
}

/** the rings of a closed panel's outer face, from the seam's floor out at the hub lines to its face (a shade each: the
 *  seam is in shadow) */
function sh_outerRings() {
	const M = sh_M, e = M.edge, o = M.skinOut, floor = 0;
	const rings = [
		{ off: floor, inset: 0, centre: 0, a: 0, b: 1, c: 0.4 },
		{ off: floor, inset: M.seam, centre: M.corner, a: 0, b: 1, c: 0.4 },
		{ off: floor, inset: M.seam, centre: M.corner, a: 1, b: 0, c: 0.45, brk: true },
		{ off: o - e, inset: M.seam, centre: M.corner, a: 1, b: 0, c: 0.68 }
	];
	for (const f of [1, 2, 3]) {
		const a = (f * Math.PI) / 6;
		rings.push({ off: o - e + e * Math.sin(a), inset: M.seam + e * (1 - Math.cos(a)), centre: M.corner, a: Math.cos(a), b: Math.sin(a), c: 0.68 + (0.32 * f) / 3 });
	}
	return rings;
}
const sh_OUTER = sh_outerRings();
/** a window's rings after its outer face: the white band to the opening, the rounded edge, the reveal through the
 *  panel, the rounded edge inside and the white band inside out to the hub lines */
function sh_windowRings() {
	const M = sh_M, o = M.skinOut, i = M.skinIn, rv = M.reveal, b = M.band, wc = b + M.winCorner;
	const rings = [{ off: o, inset: b - rv, centre: wc, a: 0, b: 1, c: 1 }];
	for (const f of [1, 2, 3]) {
		const s = (f * Math.PI) / 6;
		rings.push({ off: o - rv + rv * Math.cos(s), inset: b - rv + rv * Math.sin(s), centre: wc, a: -Math.sin(s), b: Math.cos(s), c: 1 - 0.06 * f });
	}
	rings.push({ off: i + rv, inset: b, centre: wc, a: -1, b: 0, c: 0.86 });
	for (const f of [4, 5, 6]) {
		const s = (f * Math.PI) / 6;
		rings.push({ off: i + rv + rv * Math.cos(s), inset: b - rv + rv * Math.sin(s), centre: wc, a: -Math.sin(s), b: Math.cos(s), c: 0.86 + 0.045 * (f - 3) });
	}
	rings.push({ off: i, inset: 0, centre: 0, a: 0, b: -1, c: 1 });
	return rings;
}

/* ---- which panel is what ---- */

/** a panel over the rooms (behind the ground level's façade, up to the roof's sky garden, or behind the top level's
 *  façade): closed; else glazed */
const sh_isClosed = (c) => c[2] > facadeZ(0, c[0]) - 0.5 && (c[1] < ROOF + 1.5 || c[2] > facadeZ(3, c[0]));

/** the room of level k a point [x, z] is in (the deepest whose front is before it), or none */
function sh_roomAt(k, x, z) {
	let best = null;
	for (const r of ROOMS) {
		if (r.level !== k) continue;
		const f = facadeFrame(k, r.x);
		const dx = x - f.x, dz = z - f.z;
		const along = dx * f.along[0] + dz * f.along[1];
		const depth = -(dx * f.out[0] + dz * f.out[1]);
		if (Math.abs(along) > r.w / 2 - 0.4 || depth < r.d0 + 0.2 || depth > r.d1 + 3) continue;
		if (!best || r.d0 > best.r.d0) best = { r, along };
	}
	return best;
}

/**
 * THE WINDOWS — triangular windows in the closed panels where the rooms are, in Geoship's clusters: a hexagon of the
 * panels round a hub where one fits, else a row of three in a wide room (a lounge), a pair in a suite or a studio, a
 * single triangle in a bath. A panel is a window's when its middle stands 0.9 … 3.4 over a level's floor, it reaches
 * neither into the storey above nor more than a metre below its floor (its panels are 3.4 m high, the storeys 4), it
 * does not lie along the plinth, and the room behind it (2.2 m in from the shell) is one of those. One cluster a room;
 * most of the closed part stays closed. The rooms' floors meet the shell `GAP` short of it: under a window that crosses
 * its floor the building closes that gap with a sill (`dome.shell.windows` names the panels).
 */
function sh_windows(G, kind) {
	const shapes = { lounge: ['hexagon', 'row', 'pair', 'single'], studio: ['pair', 'single'], suite: ['pair', 'single'], bath: ['single'] };
	const cands = new Map();
	G.panels.forEach((P, t) => {
		if (kind[t] !== 'closed') return;
		const ys = P.T.map((q) => q[1]);
		const lo = Math.min(...ys), hi = Math.max(...ys);
		if (ys.filter((y) => y === 0).length > 1) return;
		for (let k = 0; k < LEVELS.length; k++) {
			const L = LEVELS[k];
			// (its top may reach a little further where it is one corner, not an edge)
			const top = L.y + L.h + (ys.filter((y) => y > L.y + L.h).length > 1 ? 0.2 : 0.6);
			if (P.c[1] < L.y || P.c[1] > L.y + 3.6 || lo < L.y - 1.45 || hi > top) continue;
			const h = Math.hypot(P.c[0], P.c[2]);
			const room = sh_roomAt(k, P.c[0] * (1 - 2.2 / h), P.c[2] * (1 - 2.2 / h));
			if (!room || !shapes[room.r.kind]) continue;
			const score = Math.abs(P.c[1] - L.y - 2.1) + Math.max(0, L.y - lo) * 0.8 + Math.abs(room.along) * 0.3;
			if (!cands.has(room.r.id)) cands.set(room.r.id, { room: room.r, level: k, panels: new Map() });
			cands.get(room.r.id).panels.set(t, score);
		}
	});
	const chosen = new Set(), rooms = [];
	for (const { room, level, panels } of cands.values()) {
		const L = LEVELS[level];
		// the clusters of each shape among the room's panels, their middles 0.9 … 3.4 over the floor on the whole
		const found = { hexagon: [], row: [], pair: [], single: [] };
		G.around.forEach((ts) => {
			if (ts.length >= 5 && ts.every((t) => panels.has(t))) found.hexagon.push(ts);
		});
		for (const t of panels.keys()) {
			found.single.push([t]);
			const beside = G.tris[t]
				.map((a, i) => G.edges.get(G.key(a, G.tris[t][(i + 1) % 3])).tris.find((o) => o !== t))
				.filter((o) => o !== undefined && panels.has(o));
			for (const o of beside) if (o > t) found.pair.push([t, o]);
			for (let i = 0; i < beside.length; i++) for (let j = i + 1; j < beside.length; j++) found.row.push([beside[i], t, beside[j]]);
		}
		const fits = (ts) => {
			const y = ts.reduce((a, t) => a + G.panels[t].c[1], 0) / ts.length;
			return y >= L.y + 0.9 && y <= L.y + 3.4;
		};
		const cost = (ts) => ts.reduce((a, t) => a + panels.get(t), 0) / ts.length;
		let pick = null;
		for (const shape of shapes[room.kind]) {
			const ok = found[shape].filter(fits).sort((a, b) => cost(a) - cost(b));
			if (ok.length) {
				pick = ok[0];
				break;
			}
		}
		if (!pick) continue;
		for (const t of pick) chosen.add(t);
		const ys = pick.flatMap((t) => G.panels[t].T.map((q) => q[1]));
		rooms.push({ room: room.id, level, panels: pick, low: +Math.min(...ys).toFixed(2), high: +Math.max(...ys).toFixed(2) });
	}
	return { chosen, rooms };
}

/* ---- the parts of the skin ---- */

/** the profile of a frame member: a rounded rectangle across the strut (x along its side, y out); its corners finer
 *  low down, where a walker sees them near */
const sh_strutProfiles = [3, 2].map((n) => sh_roundProfile(-sh_M.frameW / 2, sh_M.frameW / 2, sh_M.frameIn, sh_M.frameOut, sh_M.frameR, n));

/** a frame member between hubs a and b: the profile swept straight, its ends in the hubs (or `ta`, `tb` short of them;
 *  made with plain sums: there are 1,700 of them) */
function sh_strut(mesh, a, b, ta = sh_M.trim, tb = sh_M.trim) {
	const t = sh_v.norm(sh_v.sub(b, a));
	let n = sh_v.norm(sh_v.add(a, b));
	const s = sh_v.norm(sh_v.cross(t, n));
	n = sh_v.cross(s, t);
	const L = sh_v.dist(a, b);
	const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
	const p = mesh.at('ceramic', mx, mz);
	const prof = sh_strutProfiles[my < 8 ? 0 : 1];
	const k = prof.length, base = p.pos.length / 3;
	for (const along of [ta, L - tb]) {
		const ox = a[0] + t[0] * along, oy = a[1] + t[1] * along, oz = a[2] + t[2] * along;
		for (const f of prof) {
			p.pos.push(ox + s[0] * f.x + n[0] * f.y, oy + s[1] * f.x + n[1] * f.y, oz + s[2] * f.x + n[2] * f.y);
			p.nor.push(s[0] * f.nx + n[0] * f.ny, s[1] * f.nx + n[1] * f.ny, s[2] * f.nx + n[2] * f.ny);
			p.uv.push(along / TILE.ceramic, f.v / TILE.ceramic);
		}
	}
	// the profile runs clockwise round t (s × n = −t): wound so these face out
	for (let j = 0; j + 1 < k; j++) {
		const i0 = base + j, i1 = base + j + 1, i2 = base + k + j + 1, i3 = base + k + j;
		p.idx.push(i0, i2, i1, i0, i3, i2);
	}
}

/** the hub's profile, its normals across it */
const sh_hubProfile = sh_M.hub.map(([r, y], i, h) => {
	if (r === 0) return { r, y, nr: 0, ny: i ? 1 : -1 };
	const [r0, y0] = h[i - 1], [r1, y1] = h[i + 1];
	const l = Math.hypot(y1 - y0, r1 - r0);
	return { r, y, nr: (y1 - y0) / l, ny: -(r1 - r0) / l };
});
/** one hub made round the z axis, `seg` sides: its vertices [x, y, z, nx, ny, nz, u, v] and triangles */
function sh_hubTemplate(seg) {
	const verts = [], idx = [];
	let prev = null, v = 0;
	sh_hubProfile.forEach((f, i) => {
		if (i) v += Math.hypot(f.r - sh_hubProfile[i - 1].r, f.y - sh_hubProfile[i - 1].y);
		const ids = [];
		for (let j = 0; j <= seg; j++) {
			const a = (j / seg) * TAU, c = Math.cos(a), sn = Math.sin(a);
			ids.push(verts.push(f.r * c, f.r * sn, f.y, f.nr * c, f.nr * sn, f.ny, (a * 0.3) / TILE.ceramic, v / TILE.ceramic) / 8 - 1);
		}
		if (prev)
			for (let j = 0; j < seg; j++) {
				// round +z counter-clockwise and up the profile: these face out (none on the poles' single points)
				if (sh_hubProfile[i - 1].r > 0) idx.push(prev[j], prev[j + 1], ids[j + 1]);
				if (f.r > 0) idx.push(prev[j], ids[j + 1], ids[j]);
			}
		prev = ids;
	});
	return { verts, idx };
}
const sh_HUBS = { near: sh_hubTemplate(18), far: sh_hubTemplate(10) };
/** a hub at q: the node turned round the radius through it (more sides low down, where a walker sees it near) */
function sh_hub(mesh, q) {
	const n = sh_v.norm(q);
	const t1 = sh_v.norm(sh_v.cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
	const t2 = sh_v.cross(n, t1);
	const T = q[1] < 9 ? sh_HUBS.near : sh_HUBS.far;
	const p = mesh.at('ceramic', q[0], q[2]);
	const base = p.pos.length / 3, V = T.verts;
	for (let i = 0; i < V.length; i += 8) {
		const x = V[i], y = V[i + 1], z = V[i + 2], nx = V[i + 3], ny = V[i + 4], nz = V[i + 5];
		p.pos.push(q[0] + t1[0] * x + t2[0] * y + n[0] * z, q[1] + t1[1] * x + t2[1] * y + n[1] * z, q[2] + t1[2] * x + t2[2] * y + n[2] * z);
		p.nor.push(t1[0] * nx + t2[0] * ny + n[0] * nz, t1[1] * nx + t2[1] * ny + n[1] * nz, t1[2] * nx + t2[2] * ny + n[2] * nz);
		p.uv.push(V[i + 6], V[i + 7]);
	}
	for (const i of T.idx) p.idx.push(base + i);
}

/** a glazed panel's glass, and its beads against the frame each side (low down, where they can be seen: higher up a
 *  22 mm bead is less than a pixel from anywhere a walker stands) */
function sh_glazing(mesh, P) {
	const M = sh_M;
	const g = mesh.at('glass', P.c[0], P.c[2]);
	const corner = sh_ring(P, M.glass, M.glassIn, 0, 1);
	const ids = [0, 2, 4].map((j) => sh_vert(g, corner[j][0], P.n, 0, 0));
	g.idx.push(ids[0], ids[1], ids[2]);
	if (P.c[1] > 5.5) return;
	const p = mesh.at('ceramic', P.c[0], P.c[2]);
	for (const side of [1, -1]) {
		const rings = [];
		for (const f of [0, 1, 2, 3]) {
			const a = (f * Math.PI) / 6;
			rings.push({ off: M.glass + side * (0.004 + M.bead * Math.cos(a)), inset: M.frameW / 2 + M.bead * Math.sin(a), centre: 0, a: -Math.sin(a), b: side * Math.cos(a) });
		}
		sh_rings(p, P, rings, 1, TILE.ceramic);
	}
}

/** a closed panel's outer skin: a rounded panel a little smaller than its triangle, the seam's shadow line round it */
function sh_closedOuter(mesh, P, tint) {
	const p = mesh.at('ceramic', P.c[0], P.c[2], true);
	const last = sh_rings(p, P, sh_OUTER.map((r) => ({ ...r, c: r.c * tint })), 2, TILE.ceramic);
	const mid = sh_v.madd(P.c, P.n, sh_M.skinOut);
	const o = sh_v.mul(P.T[0], (P.h0 + sh_M.skinOut) / P.h0);
	const pos = (i) => [p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]];
	const uv = (q) => [sh_v.dot(sh_v.sub(q, o), P.e1) / TILE.ceramic, sh_v.dot(sh_v.sub(q, o), P.e2) / TILE.ceramic];
	// the face: a fan from its middle, its UVs laid flat
	const c = sh_vert(p, mid, P.n, ...uv(mid), tint);
	const rim = last.map((i) => sh_vert(p, pos(i), P.n, ...uv(pos(i)), tint));
	sh_fan(p, c, rim);
}

/** a window panel: the outer skin's edge, then its frame, reveal and glass, and the white band round it inside */
function sh_windowPanel(mesh, P) {
	const p = mesh.at('ceramic', P.c[0], P.c[2], true);
	sh_rings(p, P, [...sh_OUTER, ...sh_windowRings()], 3, TILE.ceramic);
	const g = mesh.at('glass', P.c[0], P.c[2]);
	const pane = sh_ring(P, sh_M.winGlass, sh_M.band - 0.012, sh_M.band + sh_M.winCorner, 3);
	const c = sh_vert(g, sh_v.madd(P.c, P.n, sh_M.winGlass), P.n, 0, 0);
	const ids = pane.map(([q]) => sh_vert(g, q, P.n, 0, 0));
	ids.push(ids[0]);
	sh_fan(g, c, ids);
}

/**
 * A closed panel's inner skin, the warm sand relief of the rooms' walls: its triangle in thirds (nine small ones), its
 * middle folded in, the thirds of its edges creased a little where a relief panel is beside it (the same crease both
 * sides), and each small triangle a shallow pyramid of three facets: 27 facets, crisp, that the light rakes across.
 */
function sh_relief(mesh, G, t, kind) {
	const P = G.panels[t], tri = G.tris[t], M = sh_M;
	const k = (P.h0 + M.skinIn) / P.h0;
	const T = P.T.map((q) => sh_v.mul(q, k));
	const r = chance('sh-relief', t);
	const fold = between(r, M.fold[0], M.fold[1]);
	// a crease at the third f of the edge between hubs a and b, seen from the lower hub
	const crease = (ka, kb, wa, wb) => {
		const a = tri[ka], b = tri[kb];
		const e = G.edges.get(G.key(a, b));
		if (e.tris.length < 2 || !e.tris.every((o) => kind[o] === 'closed')) return 0;
		const f = Math.round(((a < b ? wb : wa) / (wa + wb)) * 3);
		return between(chance('sh-crease', e.a, e.b, f), M.crease[0], M.crease[1]);
	};
	// the ten points of the thirds, (i, j, l) in thirds of corners 0, 1, 2
	const pt = new Map();
	for (let i = 0; i <= 3; i++)
		for (let j = 0; j <= 3 - i; j++) {
			const l = 3 - i - j;
			const w = [i, j, l];
			let q = sh_v.mul(sh_v.add(sh_v.mul(T[0], i), sh_v.add(sh_v.mul(T[1], j), sh_v.mul(T[2], l))), 1 / 3);
			const zeros = w.filter((x) => x === 0).length;
			let d = 0;
			if (zeros === 0) {
				d = fold;
				q = sh_v.add(q, sh_v.add(sh_v.mul(P.e1, between(r, -0.18, 0.18)), sh_v.mul(P.e2, between(r, -0.18, 0.18))));
			} else if (zeros === 1) {
				const nz = [0, 1, 2].filter((x) => w[x] > 0);
				d = crease(nz[0], nz[1], w[nz[0]], w[nz[1]]);
			}
			pt.set(`${i},${j}`, sh_v.madd(q, P.n, -d));
		}
	const smalls = [];
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 3 - i; j++) {
			smalls.push([`${i},${j}`, `${i + 1},${j}`, `${i},${j + 1}`]);
			if (j < 2 - i) smalls.push([`${i + 1},${j}`, `${i + 1},${j + 1}`, `${i},${j + 1}`]);
		}
	const p = mesh.at('relief', P.c[0], P.c[2]);
	const o = T[0];
	const uv = (q) => [sh_v.dot(sh_v.sub(q, o), P.e1) / TILE.relief, sh_v.dot(sh_v.sub(q, o), P.e2) / TILE.relief];
	const inward = sh_v.mul(P.n, -1);
	for (const s of smalls) {
		const [a, b, c] = s.map((key) => pt.get(key));
		const size = Math.sqrt(sh_v.len(sh_v.cross(sh_v.sub(b, a), sh_v.sub(c, a))));
		const apex = sh_v.madd(sh_v.mul(sh_v.add(a, sh_v.add(b, c)), 1 / 3), inward, between(r, 0.025, 0.075) * size);
		for (const [x, y] of [[a, b], [b, c], [c, a]]) {
			let n = sh_v.norm(sh_v.cross(sh_v.sub(y, x), sh_v.sub(apex, x)));
			let order = [x, y, apex];
			if (sh_v.dot(n, inward) < 0) (n = sh_v.mul(n, -1)), (order = [y, x, apex]);
			const ids = order.map((q) => sh_vert(p, q, n, ...uv(q)));
			p.idx.push(...ids);
		}
	}
}

/* ---- the gates ---- */

/** a door's frame: its foot on the shell's circle, `out` from the dome, `side` along the shell (to the right seen from
 *  outside), its measures from the plan (doorSize), and a point from (u, y, d) in it and back */
function sh_doorFrame(D) {
	const out = [Math.sin(D.a), 0, Math.cos(D.a)], side = [Math.cos(D.a), 0, -Math.sin(D.a)];
	const O = sh_v.mul(out, R);
	const at = (u, y, d) => [O[0] + side[0] * u + out[0] * d, y, O[2] + side[2] * u + out[2] * d];
	const local = (q) => [(q[0] - O[0]) * side[0] + (q[2] - O[2]) * side[2], q[1], (q[0] - O[0]) * out[0] + (q[2] - O[2]) * out[2]];
	const F = { D, ...doorSize(D), out, side, O, at, local };
	F.opening = sh_opening(F, sh_D.cut);
	return F;
}

/** the gates' stonework and leaves (m; depths `d` out from the shell's foot line, + out of the dome) */
const sh_D = {
	// the stonework: its face (proud of the shell), its back (inside it: 0.95 through the wall), its joints and eased
	// arrises, the keystone prouder and taller
	face: 0.15,
	back: -0.8,
	joint: 0.007,
	arris: 0.012,
	keyProud: 0.04,
	keyRise: 0.08,
	// the jambs: a moulded plinth (as high as the shell's, its face in line with it), three courses of quoins (long and
	// short past the arch's ring), the impost moulding
	plinth: 0.5,
	courses: 3,
	long: 0.2,
	short: -0.1,
	impost: 0.2,
	// the shell is cut round the opening this far into the stone (every cut edge in the masonry)
	cut: 0.2,
	// the leaves: thickness, plank width, how far open (into the dome); the fanlight's plane in the reveal
	leaf: 0.08,
	plank: 0.16,
	open: (75 * Math.PI) / 180,
	fanlight: 0.12,
	// the threshold's top and the landing inside
	floorTop: 0.03,
	landing: 2.5
};
/** how many voussoirs round a gate's arch (odd: a keystone at the top) */
const sh_voussoirs = (F) => (F.r < 1.6 ? 13 : 17);
/** how far the stone reaches out from the opening's edge at its jambs: the short quoins, and the most (the impost) */
const sh_jambReach = (F) => ({ least: F.ring + sh_D.short, most: F.ring + sh_D.long + 0.05 });

// the gates' woodwork: oiled oak gone dark and weathered (the oak's own pictures, tinted)
material('sh-gate-oak', TILE.oak, () => {
	mat('oak');
	const s = SHARED.oak;
	return new THREE.MeshPhysicalMaterial({ color: '#7a6754', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, clearcoat: 0.04, clearcoatRoughness: 0.7, normalScale: new THREE.Vector2(0.9, 0.9) });
});

/**
 * A gate's opening, grown `g` into its stone, as a convex outline in its (u, y): straight jambs, a round head, open far
 * below the ground; its edges as half planes with the opening on their inner side.
 */
function sh_opening(F, g) {
	const pts = [[F.hw + g, -5], [F.hw + g, F.spring]];
	for (let i = 1; i < 18; i++) {
		const a = (i / 18) * Math.PI;
		pts.push([(F.r + g) * Math.cos(a), F.spring + (F.r + g) * Math.sin(a)]);
	}
	pts.push([-(F.hw + g), F.spring], [-(F.hw + g), -5]);
	const H = pts.map(([ax, ay], i) => {
		const [bx, by] = pts[(i + 1) % pts.length];
		const nx = ay - by, ny = bx - ax;
		return { nx, ny, c: nx * ax + ny * ay };
	});
	return { H, u: F.hw + g, top: F.spring + F.r + g };
}
/** whether a point [u, y] of a gate's face is in its stonework (the plinths, the long and short quoins, the impost,
 *  the voussoirs) */
function sh_inStone(F, u, y) {
	const D = sh_D, a = Math.abs(u), reach = sh_jambReach(F);
	if (y > F.spring) {
		const rr = Math.hypot(u, y - F.spring);
		return rr >= F.r && rr <= F.r + F.ring;
	}
	if (a < F.hw - 0.03) return false;
	if (y < D.plinth || y > F.spring - D.impost) return a <= F.hw + reach.most;
	const c = Math.floor((y - D.plinth) / ((F.spring - D.impost - D.plinth) / D.courses));
	return a <= F.hw + F.ring + (c % 2 ? D.short : D.long);
}
/** which gate (if any) a set of points on the shell stands near: its opening (and a margin) over them */
function sh_nearGate(doors, pts, margin = 0.4) {
	for (const F of doors) {
		if (!pts.every((q) => sh_v.dot(q, F.out) > R * 0.8)) continue;
		const L = pts.map((q) => F.local(q));
		const u0 = Math.min(...L.map((q) => q[0])), u1 = Math.max(...L.map((q) => q[0])), y0 = Math.min(...L.map((q) => q[1]));
		if (u1 > -F.opening.u - margin && u0 < F.opening.u + margin && y0 < F.opening.top + margin) return F;
	}
	return null;
}

/**
 * The shell cut round a gate: every triangle of a part (frames, hubs, glass, beads, closed panels, relief) that the
 * opening (grown into the stone) takes a bite of, cut along its outline, exactly: what is left of each triangle, in
 * convex pieces (its corners' normals, UVs and shades carried along), into the part `dst`. Every cut edge lies inside
 * the stone ring, so the shell closes on the masonry with no collar.
 */
function sh_clip(src, dst, F) {
	const H = F.opening.H, P = src.pos, N = src.nor, U = src.uv, C = src.col, I = src.idx;
	const nv = P.length / 3;
	// each corner's place in the gate's face, and where it went in dst (a triangle kept whole keeps its corners shared)
	const lu = new Float64Array(nv), ly = new Float64Array(nv), to = new Int32Array(nv).fill(-1);
	for (let i = 0; i < nv; i++) {
		lu[i] = (P[i * 3] - F.O[0]) * F.side[0] + (P[i * 3 + 2] - F.O[2]) * F.side[2];
		ly[i] = P[i * 3 + 1];
	}
	const keep = (i) => {
		if (to[i] < 0) to[i] = sh_vert(dst, [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], U[i * 2], U[i * 2 + 1], src.colour ? C[i * 3] : 1);
		return to[i];
	};
	const corner = (i) => ({ q: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], uv: [U[i * 2], U[i * 2 + 1]], c: src.colour ? C[i * 3] : 1, u: lu[i], y: ly[i] });
	const mix = (a, b, t) => ({ q: sh_v.lerp(a.q, b.q, t), n: sh_v.norm(sh_v.lerp(a.n, b.n, t)), uv: [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t], c: a.c + (b.c - a.c) * t, u: a.u + (b.u - a.u) * t, y: a.y + (b.y - a.y) * t });
	// the part of a convex polygon on one side of a half plane (inside: s ≥ 0)
	const cut = (poly, s, inside) => {
		const out = [];
		for (let k = 0; k < poly.length; k++) {
			const k1 = (k + 1) % poly.length, sa = inside ? s[k] : -s[k], sb = inside ? s[k1] : -s[k1];
			if (sa >= 0) out.push(poly[k]);
			if ((sa >= 0) !== (sb >= 0)) out.push(mix(poly[k], poly[k1], sa / (sa - sb)));
		}
		return out;
	};
	const emit = (poly) => {
		if (poly.length < 3) return;
		const ids = poly.map((v) => sh_vert(dst, v.q, v.n, v.uv[0], v.uv[1], v.c));
		for (let k = 1; k + 1 < ids.length; k++) dst.idx.push(ids[0], ids[k], ids[k + 1]);
	};
	for (let t = 0; t < I.length; t += 3) {
		const a = I[t], b = I[t + 1], c = I[t + 2];
		// wholly outside one of the opening's edges: kept whole
		let whole = false;
		for (const h of H) {
			if (h.nx * lu[a] + h.ny * ly[a] < h.c && h.nx * lu[b] + h.ny * ly[b] < h.c && h.nx * lu[c] + h.ny * ly[c] < h.c) {
				whole = true;
				break;
			}
		}
		if (whole) {
			dst.idx.push(keep(a), keep(b), keep(c));
			continue;
		}
		let poly = [corner(a), corner(b), corner(c)];
		for (const h of H) {
			const s = poly.map((v) => h.nx * v.u + h.ny * v.y - h.c);
			if (s.every((x) => x >= 0)) continue;
			emit(cut(poly, s, false));
			poly = cut(poly, s, true);
			if (poly.length < 3) break;
		}
	}
}

/** the geometry of one part of a mesh (its arrays as attributes) */
function sh_geometry(p) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
	if (p.colour) g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3));
	g.setIndex(p.idx);
	return g;
}
/** a dressed stone: a shape in the gate's face (u, y) cut `depth` deep from `back`, its arrises eased, its picture laid
 *  at its own place in the stone (so no two stones show the same grain), shaded a little its own */
function sh_stone(shape, back, depth, key, shade = 1) {
	const g = extrude(shape, depth, sh_D.arris, 1, 6);
	g.translate(0, 0, back);
	const r = chance('sh-stone', key);
	const du = r() * 7, dv = r() * 7;
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TILE.limestone + du, uv.getY(i) / TILE.limestone + dv);
	const c = plain(g, true);
	c.attributes.color.array.fill(shade * between(r, 0.93, 1.04));
	return c;
}

/**
 * A GATE — Samuel's round-arched Tor, in the arcade's dressed limestone: two jambs of coursed quoins (long and short in
 * turn) on moulded plinths, an impost moulding at the spring, the voussoirs round the semicircle with a proud keystone,
 * mortar in the joints (6–8 mm, set back), all 0.95 m through the wall, a threshold and a landing inside; in the arch a
 * glazed oak fanlight (a transom at the spring, a half-round sun and radiating bars); below it two heavy oak gate leaves
 * standing open into the dome. Made once a size in the gate's own frame (x along the shell, y up, z out of the dome),
 * merged by material.
 */
function sh_gateParts(F, made) {
	const key = `${F.w}|${F.spring}|${F.ring}`;
	if (made.has(key)) return made.get(key);
	const D = sh_D;
	const parts = { stone: [], oak: [], glass: [], bronze: [] };
	const j = D.joint / 2 + D.arris;
	const depth = D.face - D.back;
	const hw = F.hw, sp = F.spring, r = F.r, re = F.r + F.ring;
	// the plinths and the impost mouldings: a section (y, d) run along u, their arrises eased
	const run = (section, u0, u1, k) => {
		const g = sh_stone(shapeOf(section), 0, Math.abs(u1 - u0) - 2 * j, k);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)).setPosition(Math.min(u0, u1) + j, 0, 0);
		parts.stone.push(g.applyMatrix4(m));
	};
	const fd = D.face, bd = D.back;
	const reach = sh_jambReach(F);
	for (const s of [1, -1]) {
		const u0 = s * (hw - 0.03), u1 = s * (hw + reach.most + 0.03);
		// the plinth: its face in line with the shell's plinth, a splayed top
		run([[-0.15, bd - 0.05], [-0.15, fd + 0.11], [D.plinth - 0.09, fd + 0.11], [D.plinth - j, fd + 0.04], [D.plinth - j, bd - 0.05]], u0 - s * 0.02, u1 + s * 0.02, `plinth${s}`);
		// the impost: a band under the arch, its underside splayed back to the jamb
		run([[sp - D.impost + j, fd - 0.01], [sp - 0.07, fd + 0.055], [sp - j, fd + 0.055], [sp - j, bd - 0.03], [sp - D.impost + j, bd - 0.03]], u0, s * (hw + reach.most), `impost${s}`);
		// the quoins between: long and short in turn
		const y0 = D.plinth, y1 = sp - D.impost, h = (y1 - y0) / D.courses;
		for (let c = 0; c < D.courses; c++) {
			const wq = F.ring + (c % 2 ? D.short : D.long);
			const a = s * (hw + j), b = s * (hw + wq - j);
			const lo = y0 + c * h + j, hi = y0 + (c + 1) * h - j;
			parts.stone.push(sh_stone(shapeOf([[a, lo], [b, lo], [b, hi], [a, hi]]), bd, depth, `quoin${s}${c}`));
		}
	}
	// the voussoirs: wedges round the semicircle, their joints pointing to its middle; the middle one the keystone
	const n = sh_voussoirs(F);
	for (let k = 0; k < n; k++) {
		const a0 = (k / n) * Math.PI, a1 = ((k + 1) / n) * Math.PI;
		const isKey = k === (n - 1) / 2;
		const ro = re + (isKey ? D.keyRise : 0) - D.arris, ri = r + D.arris;
		const pts = [];
		for (let i = 0; i <= 4; i++) {
			const a = a0 + j / ri + ((a1 - a0 - (2 * j) / ri) * i) / 4;
			pts.push([ri * Math.cos(a), sp + ri * Math.sin(a)]);
		}
		for (let i = 0; i <= 4; i++) {
			const a = a1 - j / ro - ((a1 - a0 - (2 * j) / ro) * i) / 4;
			pts.push([ro * Math.cos(a), sp + ro * Math.sin(a)]);
		}
		parts.stone.push(sh_stone(shapeOf(pts), bd, depth + (isKey ? D.keyProud : 0), `voussoir${k}`));
	}
	// the mortar in the joints, set back from the faces: behind the jambs and round the arch
	const mortar = (shape, k) => parts.stone.push(sh_stone(shape, bd + 0.015, depth - 0.03, k, 0.72));
	for (const s of [1, -1]) mortar(shapeOf([[s * (hw + 0.02), D.plinth - 0.03], [s * (hw + reach.least - 0.02), D.plinth - 0.03], [s * (hw + reach.least - 0.02), sp - D.impost + 0.03], [s * (hw + 0.02), sp - D.impost + 0.03]]), `mortar${s}`);
	const ring = [];
	for (let i = 0; i <= 24; i++) ring.push([(r + 0.02) * Math.cos((i / 24) * Math.PI), sp + (r + 0.02) * Math.sin((i / 24) * Math.PI)]);
	for (let i = 24; i >= 0; i--) ring.push([(re - 0.02) * Math.cos((i / 24) * Math.PI), sp - 0.02 + (re - 0.02) * Math.sin((i / 24) * Math.PI)]);
	mortar(shapeOf(ring), 'mortar-arch');
	// the threshold, a sill through the wall with an eased nosing, and the landing inside under the open leaves
	const slab = (d0, d1, half, k) => {
		const g = sh_stone(shapeOf(roundRect(d1 - d0, half * 2, 0.06, 3)), 0, 0.16, k);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)).setPosition(0, D.floorTop - 0.16, (d0 + d1) / 2);
		parts.stone.push(g.applyMatrix4(m));
	};
	slab(bd - 0.02, fd + 0.38, hw + 0.06, 'threshold');
	slab(bd - 0.02 - D.landing, bd - 0.02 - j, hw + 0.25, 'landing');
	sh_fanlight(F, parts);
	sh_gateLeaves(F, parts);
	const merged = {};
	for (const [m, list] of Object.entries(parts)) merged[m] = mergeGeometries(list);
	made.set(key, merged);
	return merged;
}

/** the fanlight in the arch: an oak transom at the spring, a rim against the soffit, a half-round sun at the middle and
 *  five bars radiating from it, glass behind them; in the reveal near its inner face, over the leaves */
function sh_fanlight(F, parts) {
	const D = sh_D, sp = F.spring, z = D.back + D.fanlight;
	const mesh = new sh_Mesh();
	const p = mesh.at('oak', 0, 0, true);
	const bar = (w, d) => sh_roundProfile(-w / 2, w / 2, -d / 2, d / 2, 0.018, 2);
	const along = (pts, prof) => {
		let u = 0;
		const path = pts.map((q, i) => {
			const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
			const t = sh_v.norm([b[0] - a[0], b[1] - a[1], 0]);
			if (i) u += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
			return { q: [q[0], q[1], z], a: [-t[1], t[0], 0], b: [0, 0, 1], u };
		});
		sh_sweep(p, path, prof, TILE.oak, between(chance('sh-fan', pts.length, pts[0][0]), 0.88, 1));
	};
	// the transom, the rim, the bars
	along([[-F.hw - 0.03, sp], [F.hw + 0.03, sp]], bar(0.15, 0.16));
	const rim = [];
	for (let i = 0; i <= 24; i++) rim.push([(F.r - 0.04) * Math.cos((i / 24) * Math.PI), sp + (F.r - 0.04) * Math.sin((i / 24) * Math.PI)]);
	along(rim, bar(0.12, 0.13));
	const sun = 0.24;
	for (let k = 1; k <= 5; k++) {
		const a = (k / 6) * Math.PI;
		along([[sun * Math.cos(a), sp + sun * Math.sin(a)], [(F.r - 0.08) * Math.cos(a), sp + (F.r - 0.08) * Math.sin(a)]], bar(0.06, 0.09));
	}
	const g = sh_geometry(p);
	parts.oak.push(g);
	// the sun: a half round of oak on the transom
	const half = [];
	for (let i = 0; i <= 12; i++) half.push([sun * Math.cos((i / 12) * Math.PI), sp + sun * Math.sin((i / 12) * Math.PI)]);
	const sunG = plain(extrude(shapeOf(half), 0.12, 0.012, 2, 4).translate(0, 0, z - 0.06), true);
	scaleUV(sunG, 1 / TILE.oak);
	parts.oak.push(sunG);
	// the glass, behind the bars
	const pane = [];
	for (let i = 0; i <= 24; i++) pane.push([(F.r - 0.02) * Math.cos((i / 24) * Math.PI), sp + (F.r - 0.02) * Math.sin((i / 24) * Math.PI)]);
	parts.glass.push(plain(new THREE.ShapeGeometry(shapeOf(pane), 1).translate(0, 0, z - 0.02)));
}

/**
 * The gate's two leaves, up to the transom: each from its hinge (on the stone's back face, the leaf lapping the opening
 * by 5 cm) to the middle; vertical oak planks with V-grooves between (each its own shade), three ledges and two braces
 * inside, bronze strap hinges with studs outside and the ledges' bolts as studs, a ring pull each face, the pintles on
 * the stone. Turned open about the hinges, into the dome.
 */
function sh_gateLeaves(F, parts) {
	const D = sh_D, t = D.leaf, lap = 0.05;
	const W = F.hw + lap - 0.004, foot = 0.035, top = F.spring - 0.075 - 0.006;
	const leaf = { oak: [], bronze: [] };
	const shade = (g, c) => {
		const out = plain(g, true);
		out.attributes.color.array.fill(c);
		return out;
	};
	// the planks, a groove between each
	const np = Math.max(5, Math.round(W / D.plank)), pw = W / np;
	for (let i = 0; i < np; i++) {
		const x0 = i * pw + 0.006, x1 = (i + 1) * pw - 0.006;
		const g = extrude(shapeOf([[x0, foot], [x1, foot], [x1, top], [x0, top]]), t, 0.008, 1, 4);
		g.translate(0, 0, -t / 2);
		const r = chance('sh-plank', F.w, i), du = r() * 3;
		const uv = g.attributes.uv;
		// the grain up the planks
		for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getY(q) / TILE.oak + du, uv.getX(q) / TILE.oak);
		leaf.oak.push(shade(g, between(r, 0.8, 1.06)));
	}
	// the ledges and braces inside (−z), the straps and studs outside (+z)
	const ledges = [0.3, (0.3 + top - 0.3) / 2, top - 0.3];
	for (const y of ledges) leaf.oak.push(shade(boxUV(rbox(W - 0.12, 0.17, 0.045, 0.012, 1), TILE.oak).translate(W / 2, y, -t / 2 - 0.022), 0.9));
	for (let k = 0; k < 2; k++) {
		const ya = ledges[k] + 0.09, yb = ledges[k + 1] - 0.09;
		const dx = W - 0.3, dy = yb - ya, len = Math.hypot(dx, dy);
		const b = boxUV(rbox(len, 0.14, 0.04, 0.012, 1), TILE.oak);
		b.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.atan2(dy, dx)).setPosition(W / 2, (ya + yb) / 2, -t / 2 - 0.02));
		leaf.oak.push(shade(b, 0.92));
	}
	const strapLen = Math.min(1.5, W * 0.78);
	const studs = [];
	for (const y of ledges) {
		leaf.bronze.push(plain(rbox(strapLen, 0.065, 0.012, 0.004, 1).translate(strapLen / 2 - 0.04, y, t / 2 + 0.006)));
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14).rotateX(Math.PI / 2).translate(strapLen - 0.04, y, t / 2 + 0.006)));
		for (let k = 0; k < 5; k++) studs.push([0.12 + (k * (strapLen - 0.16)) / 4, y, t / 2 + 0.012]);
		for (let i = 0; i < np; i++) if ((i + 0.5) * pw > strapLen + 0.05) studs.push([(i + 0.5) * pw, y, t / 2]);
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12).translate(-0.02, y, 0)));
	}
	// the studs: one domed head, laid at each
	const stud = plain(lathe([[0, 0.016], [0.011, 0.012], [0.017, 0.004], [0.018, 0]], 6).rotateX(Math.PI / 2));
	leaf.bronze.push(sh_copies(stud, studs));
	for (const z of [1, -1]) {
		leaf.bronze.push(plain(new THREE.TorusGeometry(0.085, 0.012, 6, 18).translate(W - 0.2, 1.0, z * (t / 2 + 0.03))));
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 12).rotateX(Math.PI / 2).translate(W - 0.2, 1.09, z * (t / 2 + 0.015))));
	}
	const oak = mergeGeometries(leaf.oak), bronze = mergeGeometries(leaf.bronze);
	for (const s of [1, -1]) {
		// the hinge, on the stone's back face; its outside (+z, the straps) out of the dome: the right leaf is the left
		// one mirrored
		const hinge = [s * (F.hw + lap), 0, D.back - t / 2 - 0.01];
		const dir = [-s * Math.cos(D.open), 0, -Math.sin(D.open)];
		const zdir = s > 0 ? sh_v.cross([0, 1, 0], dir) : sh_v.cross(dir, [0, 1, 0]);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...dir), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...zdir)).setPosition(...hinge);
		const mo = oak.clone().applyMatrix4(m), mb = bronze.clone().applyMatrix4(m);
		if (s > 0) for (const g of [mo, mb]) sh_rewind(g);
		parts.oak.push(mo);
		parts.bronze.push(mb);
		for (const y of ledges) parts.bronze.push(plain(rbox(0.07, 0.09, 0.06, 0.01, 1).translate(s * (F.hw + lap + 0.03), y, D.back - 0.02)));
	}
}
/** copies of a small indexed geometry, one at each of `at`, as one geometry */
function sh_copies(g, at) {
	const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv.array, I = g.index.array;
	const nv = P.length / 3;
	const pos = new Float32Array(nv * 3 * at.length), nor = new Float32Array(nv * 3 * at.length), uv = new Float32Array(nv * 2 * at.length);
	const idx = new Uint32Array(I.length * at.length);
	at.forEach(([x, y, z], k) => {
		for (let i = 0; i < nv; i++) {
			const o = (k * nv + i) * 3;
			pos[o] = P[i * 3] + x;
			pos[o + 1] = P[i * 3 + 1] + y;
			pos[o + 2] = P[i * 3 + 2] + z;
		}
		nor.set(N, k * nv * 3);
		uv.set(U, k * nv * 2);
		for (let i = 0; i < I.length; i++) idx[k * I.length + i] = I[i] + k * nv;
	});
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
	out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	out.setIndex(new THREE.BufferAttribute(idx, 1));
	return out;
}
/** a geometry mirrored: its triangles wound back the right way */
function sh_rewind(g) {
	const idx = g.index.array;
	for (let i = 0; i < idx.length; i += 3) {
		const t = idx[i + 1];
		idx[i + 1] = idx[i + 2];
		idx[i + 2] = t;
	}
	g.index.needsUpdate = true;
	return g;
}
/** a gate placed in its frame; its landing inside kept clear of plants */
function sh_gate(dome, F, made) {
	const parts = sh_gateParts(F, made);
	const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(...F.side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...F.out)).setPosition(...F.O);
	const bag = dome.bag('shell');
	bag.add('limestone', parts.stone.clone(), M, { colour: true });
	bag.add('sh-gate-oak', parts.oak.clone(), M, { colour: true });
	bag.add('glass', parts.glass.clone(), M);
	bag.add('bronze', parts.bronze.clone(), M);
	const [lx, , lz] = F.at(0, 0, sh_D.back - sh_D.landing / 2);
	dome.keep.push({ x: lx, z: lz, r: F.hw + 1.2, why: `gate ${F.D.id}` });
}

/* ---- the plinth ---- */

/** the plinth's section: [out from the shell's foot line, up], rounded on top, 0.68 wide, 0.5 high */
const sh_plinthProfile = (() => {
	const pts = [{ x: -0.42, y: -0.15, nx: -1, ny: 0 }, { x: -0.42, y: 0.38, nx: -1, ny: 0 }];
	for (const a of [150, 120, 90]) {
		const r = (a * Math.PI) / 180;
		pts.push({ x: -0.3 + 0.12 * Math.cos(r), y: 0.38 + 0.12 * Math.sin(r), nx: Math.cos(r), ny: Math.sin(r) });
	}
	for (const a of [90, 60, 30, 0]) {
		const r = (a * Math.PI) / 180;
		pts.push({ x: 0.14 + 0.12 * Math.cos(r), y: 0.38 + 0.12 * Math.sin(r), nx: Math.cos(r), ny: Math.sin(r) });
	}
	pts.push({ x: 0.26, y: -0.15, nx: 1, ny: 0 });
	return sh_measured(pts);
})();

/** THE PLINTH — limestone along the whole foot of the shell, the panels standing on it; it stops against each gate's
 *  own moulded plinth */
function sh_plinth(mesh, G, doors) {
	const base = G.hubs.filter((q) => q[1] === 0).sort((a, b) => Math.atan2(a[0], a[2]) - Math.atan2(b[0], b[2]));
	const n = base.length;
	const cutAt = (F) => F.hw + sh_jambReach(F).most + 0.035;
	const cut = (q) => doors.some((F) => sh_v.dot(q, F.out) > 0 && Math.abs(F.local(q)[0]) < cutAt(F));
	let k0 = 0;
	while (k0 < n && cut(base[k0])) k0++;
	const runs = [];
	let run = null;
	for (let i = 0; i < n; i++) {
		const a = base[(k0 + i) % n], b = base[(k0 + i + 1) % n];
		const ts = [0, 1];
		for (const F of doors) {
			if (sh_v.dot(a, F.out) <= 0 && sh_v.dot(b, F.out) <= 0) continue;
			const ua = F.local(a)[0], ub = F.local(b)[0];
			for (const c of [cutAt(F), -cutAt(F)]) {
				const t = (c - ua) / (ub - ua);
				if (t > 0 && t < 1) ts.push(t);
			}
		}
		ts.sort((x, y) => x - y);
		for (let k = 0; k + 1 < ts.length; k++) {
			if (cut(sh_v.lerp(a, b, (ts[k] + ts[k + 1]) / 2))) {
				if (run) runs.push(run), (run = null);
				continue;
			}
			if (!run) run = [sh_v.lerp(a, b, ts[k])];
			run.push(sh_v.lerp(a, b, ts[k + 1]));
		}
	}
	if (run) {
		// the last run comes round to the first
		if (runs.length && sh_v.dist(run.at(-1), runs[0][0]) < 1e-6) runs[0] = run.concat(runs[0].slice(1));
		else runs.push(run);
	}
	const up = [0, 1, 0];
	const outOf = (a, b) => {
		const e = sh_v.norm(sh_v.sub(b, a));
		let o = [e[2], 0, -e[0]];
		if (sh_v.dot(o, sh_v.add(a, b)) < 0) o = sh_v.mul(o, -1);
		return o;
	};
	for (const Q of runs) {
		const mid = Q[Math.floor(Q.length / 2)];
		const p = mesh.at('limestone', mid[0], mid[2]);
		const path = [];
		let u = 0;
		for (let i = 0; i < Q.length; i++) {
			if (i) u += sh_v.dist(Q[i], Q[i - 1]);
			const o1 = i > 0 ? outOf(Q[i - 1], Q[i]) : null, o2 = i < Q.length - 1 ? outOf(Q[i], Q[i + 1]) : null;
			const a = sh_v.norm(sh_v.add(o1 ?? o2, o2 ?? o1));
			path.push({ q: Q[i], a, b: up, k: 1 / sh_v.dot(a, o1 ?? o2), u });
		}
		sh_sweep(p, path, sh_plinthProfile, TILE.limestone);
		// its ends (against the gates' plinths): the section, closed
		for (const [i, j] of [[0, 1], [Q.length - 1, Q.length - 2]]) {
			const d = sh_v.norm(sh_v.sub(Q[i], Q[j]));
			const o = outOf(Q[Math.min(i, j)], Q[Math.max(i, j)]);
			const ring = sh_plinthProfile.map((f) => sh_vert(p, sh_v.add(sh_v.mul(o, f.x), sh_v.madd(Q[i], up, f.y)), d, (f.x + sh_v.dot(Q[i], sh_v.cross(up, d))) / TILE.limestone, f.y / TILE.limestone));
			const c = sh_vert(p, sh_v.madd(sh_v.madd(Q[i], o, -0.08), up, 0.15), d, 0, 0);
			sh_fan(p, c, [...ring, ring[0]]);
		}
	}
	return runs.length;
}

/* ---- the shell ---- */

/**
 * THE SHELL — the geodesic skin of the dome. The panels over the rooms are closed (white bioceramic outside, its seams
 * shadow lines; the warm sand relief inside, two skins 0.32 apart), some of them triangular windows in deep white
 * reveals where the rooms look out; every other panel is glass in a thick white frame, the hubs white rounded nodes.
 * Four round-arched stone gates go through it: the panels, frames and hubs round each are cut along the opening inside
 * the stone ring (a hub the stone covers is left out, its frames run into the stone). The plinth runs round the foot.
 * Everything into the bag 'shell'; what the other parts may want to know as `dome.shell`.
 */
function shellPart(dome) {
	const G = sh_geodesic();
	const kind = G.panels.map((P) => (sh_isClosed(P.c) ? 'closed' : 'glazed'));
	const doors = DOORS.map((D) => sh_doorFrame(D));
	// the windows, where the rooms are
	const win = sh_windows(G, kind);
	for (const t of win.chosen) kind[t] = 'window';
	// what stands near a gate is made apart and cut round its opening
	const mesh = new sh_Mesh();
	const near = new Map(doors.map((F) => [F, new sh_Mesh()]));
	const into = (pts) => {
		const F = sh_nearGate(doors, pts);
		return F ? near.get(F) : mesh;
	};
	// the hubs: every hub beside glass (but in the plinth, or in a gate's stone)
	const inStone = G.hubs.map((q) => doors.some((F) => sh_v.dot(q, F.out) > R * 0.8 && sh_inStone(F, F.local(q)[0], q[1])));
	G.hubs.forEach((q, h) => {
		if (q[1] < 0.2 || inStone[h] || !G.around[h].some((t) => kind[t] === 'glazed')) return;
		sh_hub(into([q]), q);
	});
	// the frames: every edge beside glass (running into the stone where its hub is left out)
	for (const e of G.edges.values()) {
		if (!e.tris.some((t) => kind[t] === 'glazed')) continue;
		const a = G.hubs[e.a], b = G.hubs[e.b];
		if (a[1] === 0 && b[1] === 0) continue;
		sh_strut(into([a, b]), a, b, inStone[e.a] ? 0 : sh_M.trim, inStone[e.b] ? 0 : sh_M.trim);
	}
	// the panels
	let cutPanels = 0;
	G.panels.forEach((P, t) => {
		const m = into(P.T);
		if (m !== mesh) cutPanels++;
		if (kind[t] === 'glazed') sh_glazing(m, P);
		else if (kind[t] === 'closed') {
			sh_closedOuter(m, P, between(chance('sh-tint', t), 0.975, 1));
			sh_relief(m, G, t, kind);
		} else if (kind[t] === 'window') sh_windowPanel(m, P);
	});
	for (const [F, m] of near) for (const [k, p] of m.parts) sh_clip(p, mesh.part(k, p.m, p.colour), F);
	const runs = sh_plinth(mesh, G, doors);
	mesh.into(dome.bag('shell'));
	// the gates' stone, fanlights and leaves
	const made = new Map();
	for (const F of doors) sh_gate(dome, F, made);
	const count = (k) => kind.filter((x) => x === k).length;
	dome.shell = {
		panels: { glazed: count('glazed'), closed: count('closed'), window: count('window'), cutRoundGates: cutPanels },
		windows: win.rooms,
		gates: doors.map((F) => ({ id: F.D.id, a: F.D.a, w: F.w, spring: F.spring, top: F.top, ring: F.ring, face: sh_D.face, back: sh_D.back, landing: [sh_D.back - sh_D.landing, sh_D.back] })),
		plinthRuns: runs,
		hubs: G.hubs.length,
		struts: G.edges.size
	};
}

/* ================================================================================================================
 * 4. OUTSIDE — a one-storey limestone arcade round the dome's foot and, on it, a terrace all the way round (Samuel
 *    2026-11-05: the arcade's roof walkable, a proper terrace like Sandbox 1's, a community space outside furnished
 *    with the library's things and plants): its balustrade, the four stairs up to it in the cloister walk under it,
 *    the walk, the apron of gravel beyond its step and the flagstone paths straight out from the gates
 * ================================================================================================================ */

/**
 * THE ARCADE'S MEASURES. Sixty piers whose middles stand on the circle of radius `out_RP`: a wider bay centred on each
 * gate's bearing (its path passes straight under that arch to the gate) and fourteen bays of 4.56 m in each quarter
 * between. A bay's wall runs straight from pier to pier (the ring a polygon of sixty sides, its stones cut to the
 * angle over each pier). Semicircular arches of voussoirs spring at 3.0 m from the piers' imposts; ashlar runs up
 * the spandrels in courses to the cornice, and on the cornice a balustrade: a die over each pier, turned balusters
 * between, a moulded rail along the top. Behind it the terrace, flat, paved with limestone flags from the balustrade
 * to the glass, over the cloister walk and over the gates alike; its soffit lime plaster on oak beams. Heights are
 * from the ground (y 0); the walk is at `out_YW`, the terrace at `out_FLOOR`.
 */
const out_YW = 0.15;
const out_RP = R + 4.4;
/** half a pier's side (piers 0.75 m square) and half the wall's thickness over them */
const out_HALF = 0.375;
const out_SPRING = 3.0;
/** the voussoirs' depth, intrados to extrados */
const out_RING = 0.36;
/** the spandrels' bed joints, from the springing to the cornice's bed */
const out_COURSES = [3.0, 3.95, 4.45, 4.95, 5.45, 6.0];
const out_CORNICE = 6.0;
const out_CORNICE_TOP = 6.35;
/** the joints between stones, and how much each arris is eased */
const out_JOINT = 0.007;
const out_EASE = 0.006;
/**
 * THE TERRACE: its flags' top (`out_FLOOR`, 10 cm over the cornice's, the slab 0.45 deep), its soffit at the wall's
 * head (`out_SOFFIT_Y`), the oak beams under it (`out_BEAM` deep). The flags run from a strip of pebbles along the glass
 * (`out_GRAVEL` wide, behind a lead flashing) to a border course along the balustrade.
 */
const out_FLOOR = 6.45;
const out_SOFFIT_Y = out_CORNICE;
const out_BEAM = 0.24;
const out_GRAVEL = 0.33;
/** the flags' thickness, the border course's width along the balustrade (from the plinth's face in) */
const out_FLAG = 0.07;
const out_BORDER = 0.41;
/**
 * THE BALUSTRADE on the cornice: its plinth from the cornice's top to `out_PLINTH_TOP`, the balusters on it up to
 * `out_RAIL`, the rail over them to `out_TOP` (1.25 m over the flags: a terrace 6.5 m over the ground). Across the wall
 * (z out from its middle line) the plinth runs from −0.30 to 0.23, the balusters stand on `out_BAL_Z`, the rail from
 * −0.33 to 0.26: its inner face stands from 1.04 to 1.22 m over the flags, so a walker (stopped where anything stands
 * across their way at 1.2 m, and the rail the first thing there) never reaches the gaps between the balusters. A die
 * over each pier (`out_DIE` either side of it along the ring), the balusters `out_BAL_PITCH` apart between the dies.
 */
const out_PLINTH_TOP = 6.56;
const out_RAIL = 7.43;
const out_TOP = 7.7;
const out_BAL_Z = -0.035;
const out_BAL_PITCH = 0.267;
const out_DIE = 0.28;
/** the walk's edge: its kerb's inner face; the gravel apron beyond it; a path's half width; where the paths end */
const out_KERB = R + 5.1;
const out_KERB_W = 0.3;
const out_APRON = 2.0;
const out_EDGE_W = 0.12;
const out_PATH = 1.2;
/** a path's half width at its gate, across the walk and the apron, before it narrows to out_PATH (over 4 m) */
const out_PATH_GATE = 2.25;
const out_PATH_END = R + 18;
const out_PATH_Y = 0.03;
/** the walk's floor at a gate's threshold, ramped down to it from out_YW (just over the gate's own floor) */
const out_SILL = 0.04;
/**
 * The gate's bay (Samuel 2026-11-05: the doors are round-arched gates about 4 m high and 4 m wide): an arch of 5.1 m
 * clear centred on each gate's bearing, over the path straight to it, the terrace going on over it (its soffit 1.4 m
 * over the gate's stonework); its piers stronger, 1.0 m along the ring (`out_FLANK` more on the gate's side). Bays are
 * reckoned pier middle to pier middle as if every pier were 0.75 m.
 */
const out_DOOR_BAY = 5.85;
const out_FLANK = 0.25;
const out_BAYS = 14;
const out_TILE = 1.5;

/** the roof's flashing: dull grey lead, no picture of its own */
material('out-lead', 1, () => new THREE.MeshStandardMaterial({ color: '#8d9093', metalness: 0.35, roughness: 0.62 }));

/** a bearing brought into −π … π */
const out_wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The ring: its piers (bearing `a`, quarter `q`, place `j` 0 … 14 from the gate bay's east side) and the bays between
 * them, each with its own frame: `am` its middle bearing, `d` how far its wall's middle line stands from the dome's
 * middle, `L` half its length pier to pier, `ri`/`ro` its arch's intrados and extrados radii, `key` the keystone's top,
 * `door` the gate it is centred on (or null).
 */
function out_plan() {
	const wD = out_DOOR_BAY / out_RP;
	const wS = (Math.PI / 2 - wD) / out_BAYS;
	const piers = [];
	for (let q = 0; q < 4; q++) for (let j = 0; j < out_BAYS + 1; j++) piers.push({ i: piers.length, a: (q * Math.PI) / 2 + wD / 2 + j * wS, q, j });
	const bays = piers.map((p, i) => {
		const next = piers[(i + 1) % piers.length];
		let a1 = next.a;
		if (a1 < p.a) a1 += TAU;
		const h = (a1 - p.a) / 2;
		const am = p.a + h;
		const door = p.j === out_BAYS ? DOORS.find((dd) => Math.abs(out_wrap(dd.a - am)) < 0.01) ?? null : null;
		const L = out_RP * Math.sin(h);
		const ri = L - out_HALF;
		const ro = ri + (door ? out_RING - 0.02 : out_RING);
		// voussoirs: 13 to an arch, 15 to a gate's (a little thinner, so its crown stays under the cornice)
		const n = door ? 15 : 13;
		// the keystone rises to the first bed joint at least 8 cm over the extrados' crown
		const key = out_COURSES.find((y) => y > out_SPRING + ro + 0.08) ?? out_CORNICE;
		return { i, p0: i, p1: next.i, a0: p.a, a1, am, d: out_RP * Math.cos(h), L, ri, ro, n, key, door, q: p.q, j: p.j };
	});
	const doors = DOORS.map((dd) => ({ ...dd, a: out_wrap(dd.a) }));
	return { piers, bays, doors };
}

/** a point of a frame in the world: F = { o: [x, z] its origin, a its turn, d its wall's distance (0: no fanning) }.
 *  x runs along the frame (eastward round the ring), z out from the dome, y up. Where `d` is given, x is fanned by
 *  (d + z) / d, so a bay's ends lie in the radial planes through its piers and its stones meet the next bay's there. */
function out_world(F, x, y, z) {
	const k = F.d ? (F.d + z) / F.d : 1;
	const X = x * k, c = Math.cos(F.a), s = Math.sin(F.a);
	return [F.o[0] + X * c + z * s, y, F.o[1] - X * s + z * c];
}
/** a frame's own shape moved into the world (its normals turned with it) */
function out_put(geo, F) {
	const p = geo.attributes.position, n = geo.attributes.normal;
	const c = Math.cos(F.a), s = Math.sin(F.a);
	for (let i = 0; i < p.count; i++) {
		const w = out_world(F, p.getX(i), p.getY(i), p.getZ(i));
		p.setXYZ(i, w[0], w[1], w[2]);
		if (n) {
			const nx = n.getX(i), nz = n.getZ(i);
			n.setXYZ(i, nx * c + nz * s, n.getY(i), -nx * s + nz * c);
		}
	}
	p.needsUpdate = true;
	if (n) n.needsUpdate = true;
	return geo;
}

/** a stone's own tint, from a stream of chance */
const out_tint = (r) => {
	const t = 0.86 + 0.17 * r(), w = (r() - 0.4) * 0.07;
	return [t * (1 + w), t, t * (1 - w * 1.2)];
};
/** the mortar seen deep in the joints */
const out_MORTAR = [0.6, 0.56, 0.5];

/** triangles gathered: flat ones turned to face where they should, their UVs laid by the side they face (metres over
 *  the tile, shifted by `off` so no two stones show the same part of the picture), or soft ones with their own */
class out_Mesh {
	constructor(tile = out_TILE, off = [0, 0]) {
		this.P = [];
		this.N = [];
		this.U = [];
		this.tile = tile;
		this.off = off;
	}
	flat(a, b, c, f) {
		const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
		const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
		let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
		const l = Math.hypot(nx, ny, nz);
		if (l < 1e-12) return;
		const flip = nx * f[0] + ny * f[1] + nz * f[2] < 0;
		const k = flip ? -1 / l : 1 / l;
		nx *= k;
		ny *= k;
		nz *= k;
		const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
		// which two of x, y, z the picture is laid along
		const iu = ay >= ax && ay >= az ? 0 : ax >= az ? 2 : 0, iv = ay >= ax && ay >= az ? 2 : 1;
		const t = this.tile, [ou, ov] = this.off;
		for (const p of flip ? [a, c, b] : [a, b, c]) {
			this.P.push(p[0], p[1], p[2]);
			this.N.push(nx, ny, nz);
			this.U.push(p[iu] / t + ou, p[iv] / t + ov);
		}
	}
	soft(a, b, c, na, nb, nc, ua, ub, uc) {
		const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
		const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
		const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
		if (Math.hypot(nx, ny, nz) < 1e-12) return;
		const f = [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]];
		let v = [[a, na, ua], [b, nb, ub], [c, nc, uc]];
		if (nx * f[0] + ny * f[1] + nz * f[2] < 0) v = [v[0], v[2], v[1]];
		for (const [p, n, uv] of v) {
			this.P.push(p[0], p[1], p[2]);
			this.N.push(n[0], n[1], n[2]);
			this.U.push(uv[0] / this.tile + this.off[0], uv[1] / this.tile + this.off[1]);
		}
	}
	geometry() {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
		return g;
	}
}

/**
 * A dressed stone: the outline `pts` ([u, v], counter-clockwise) cut through from w0 to w1, every arris round both
 * faces eased by a small chamfer `o.c` (an edge whose index is in `o.sharp` keeps its full arris: a stone that runs on
 * past a corner into the next bay's half of it). `o.map(u, v, w)` → [x, y, z] lays it in its frame (by default u, v,
 * w are x, y, z). Flat faces, crisp edges.
 */
function out_stone(pts, w0, w1, o = {}) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const map = o.map ?? ((u, v, w) => [u, v, w]);
	const c = o.c ?? out_EASE;
	const n = pts.length;
	const E = [];
	for (let i = 0; i < n; i++) {
		const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
		const l = Math.hypot(bx - ax, by - ay) || 1;
		E.push([-(by - ay) / l, (bx - ax) / l]);
	}
	const ce = (i) => (o.sharp?.includes((i + n) % n) ? 0 : c);
	const inset = pts.map(([x, y], i) => {
		if (!c) return [x, y];
		const p = E[(i - 1 + n) % n], q = E[i], cp = ce(i - 1), cq = ce(i);
		const det = p[0] * q[1] - p[1] * q[0];
		let ax, ay;
		if (Math.abs(det) < 0.08) {
			const sx = p[0] + q[0], sy = p[1] + q[1], l = Math.hypot(sx, sy) || 1, k = Math.max(cp, cq);
			ax = (sx / l) * k;
			ay = (sy / l) * k;
		} else {
			ax = (cp * q[1] - p[1] * cq) / det;
			ay = (p[0] * cq - cp * q[0]) / det;
		}
		const l = Math.hypot(ax, ay);
		if (l > 3 * c) (ax *= (3 * c) / l), (ay *= (3 * c) / l);
		return [x + ax, y + ay];
	});
	const o0 = map(0, 0, 0);
	const dir = (v) => [v[0] - o0[0], v[1] - o0[1], v[2] - o0[2]];
	const FW = dir(map(0, 0, 1)), BW = dir(map(0, 0, -1));
	// the rings round the stone, laid in its frame once: the front face (inset where eased), the sides, the back
	const rings = (c ? [[inset, w1], [pts, w1 - c], [pts, w0 + c], [inset, w0]] : [[pts, w1], [pts, w0]]).map(([P, w]) => P.map((q) => map(q[0], q[1], w)));
	const front = rings[0], back = rings[rings.length - 1];
	const tri = THREE.ShapeUtils.triangulateShape(inset.map(([x, y]) => new THREE.Vector2(x, y)), []);
	for (const [a, b, cc] of tri) {
		m.flat(front[a], front[b], front[cc], FW);
		m.flat(back[a], back[b], back[cc], BW);
	}
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		const out = dir(map(-E[i][0], -E[i][1], 0));
		for (let k = 0; k < rings.length - 1; k++) {
			const A = rings[k], B = rings[k + 1];
			const lean = c && k === 0 ? FW : c && k === rings.length - 2 ? BW : null;
			const f = lean ? [out[0] + lean[0], out[1] + lean[1], out[2] + lean[2]] : out;
			m.flat(A[i], A[j], B[j], f);
			m.flat(A[i], B[j], B[i], f);
		}
	}
	return m.geometry();
}

/**
 * A moulded stone: the profile `prof` ([z, y], counter-clockwise round its section) run straight along x from x0 to
 * x1, its ends cut square and closed. Normals soft across the profile's curves (where two of its sides turn by less
 * than `o.soft`), crisp at its fillets; UVs along it and round the profile in metres.
 */
function out_moulding(prof, x0, x1, o = {}) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const n = prof.length, soft = o.soft ?? 0.5;
	const S = [], len = [0];
	for (let i = 0; i < n; i++) {
		const [az, ay] = prof[i], [bz, by] = prof[(i + 1) % n];
		const l = Math.hypot(bz - az, by - ay) || 1;
		S.push([0, -(bz - az) / l, (by - ay) / l]);
		len.push(len[i] + l);
	}
	const blend = (s, t) => {
		if (s[0] * t[0] + s[1] * t[1] + s[2] * t[2] < Math.cos(soft)) return s;
		const v = [s[0] + t[0], s[1] + t[1], s[2] + t[2]], l = Math.hypot(...v);
		return [v[0] / l, v[1] / l, v[2] / l];
	};
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		const na = blend(S[i], S[(i - 1 + n) % n]), nb = blend(S[i], S[j]);
		const a0 = [x0, prof[i][1], prof[i][0]], b0 = [x0, prof[j][1], prof[j][0]];
		const a1 = [x1, prof[i][1], prof[i][0]], b1 = [x1, prof[j][1], prof[j][0]];
		m.soft(a0, b0, b1, na, nb, nb, [x0, len[i]], [x0, len[i + 1]], [x1, len[i + 1]]);
		m.soft(a0, b1, a1, na, nb, na, [x0, len[i]], [x1, len[i + 1]], [x1, len[i]]);
	}
	if (o.caps !== false) {
		const tri = THREE.ShapeUtils.triangulateShape(prof.map(([z, y]) => new THREE.Vector2(z, y)), []);
		for (const [a, b, c] of tri) {
			const P = (k, x) => [x, prof[k][1], prof[k][0]];
			m.flat(P(a, x0), P(b, x0), P(c, x0), [-1, 0, 0]);
			m.flat(P(a, x1), P(b, x1), P(c, x1), [1, 0, 0]);
		}
	}
	return m.geometry();
}

/**
 * A moulding run round a square pier (a base, a capital): the profile `prof` ([d, y], from its foot up, d how far out
 * of the pier's face of half side `half`), four sides mitred at the corners, soft across the profile's curves.
 */
function out_squareMoulding(prof, half, o = {}, hz = half) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const n = prof.length, soft = o.soft ?? 0.5;
	const S = [], len = [0];
	for (let i = 0; i < n - 1; i++) {
		const [ad, ay] = prof[i], [bd, by] = prof[i + 1];
		const l = Math.hypot(bd - ad, by - ay) || 1;
		S.push([(by - ay) / l, -(bd - ad) / l]);
		len.push(len[i] + l);
	}
	const blend = (s, t) => {
		if (!t || s[0] * t[0] + s[1] * t[1] < Math.cos(soft)) return s;
		const l = Math.hypot(s[0] + t[0], s[1] + t[1]);
		return [(s[0] + t[0]) / l, (s[1] + t[1]) / l];
	};
	// the sides: outward along +z, −x, −z, +x, each from one corner to the next
	const sides = [
		[[0, 1], [1, 1], [-1, 1]],
		[[-1, 0], [-1, 1], [-1, -1]],
		[[0, -1], [-1, -1], [1, -1]],
		[[1, 0], [1, -1], [1, 1]]
	];
	for (const [out, c0, c1] of sides) {
		for (let i = 0; i < n - 1; i++) {
			const da = prof[i][0], db = prof[i + 1][0];
			const P = (cn, dd, y) => [cn[0] * (half + dd), y, cn[1] * (hz + dd)];
			const a0 = P(c0, da, prof[i][1]), b0 = P(c0, db, prof[i + 1][1]), a1 = P(c1, da, prof[i][1]), b1 = P(c1, db, prof[i + 1][1]);
			const sa = blend(S[i], S[i - 1]), sb = blend(S[i], S[i + 1]);
			const N = (s) => [out[0] * s[0], s[1], out[1] * s[0]];
			const w = 2 * (out[0] ? hz : half);
			m.soft(a0, b0, b1, N(sa), N(sb), N(sb), [0, len[i]], [0, len[i + 1]], [w, len[i + 1]]);
			m.soft(a0, b1, a1, N(sa), N(sb), N(sa), [0, len[i]], [w, len[i + 1]], [w, len[i]]);
		}
	}
	return m.geometry();
}

/**
 * THE KIT OF A QUARTER. The outside is four alike quarters, door to door: one is built (each stone cut once, the
 * weather on it worked out once) and laid round four times, turned, each time with every stone's tint drawn afresh
 * and its pictures shifted, so no two quarters show the same stones. What a quarter holds, by material: positions,
 * normals, UVs; and for the limestone each vertex's stone (−1 the mortar) and its weather.
 */
class out_Kit {
	constructor() {
		this.parts = new Map();
		this.stones = 0;
	}
	part(m) {
		if (!this.parts.has(m)) this.parts.set(m, { P: [], N: [], U: [], S: m === 'limestone' ? [] : null, W: m === 'limestone' ? [] : null });
		return this.parts.get(m);
	}
	/** a shape of material `m`, its UVs laid by the side it faces in metres where `box` */
	add(m, geo, box = false) {
		const g = box ? boxUV(geo, TILE[m] ?? 1) : geo.index ? geo.toNonIndexed() : geo;
		const p = this.part(m);
		const P = g.attributes.position.array;
		p.P.push(P);
		p.N.push(g.attributes.normal.array);
		p.U.push(g.attributes.uv?.array ?? new Float32Array((P.length / 3) * 2));
		return g;
	}
	/**
	 * A stone (with `id`, one cut with another and sharing its tint; −1 the mortar seen in the joints). The weather on
	 * it: darker and greyer-green at the foot where rain splashes up, its upward faces high up a little dulled.
	 */
	stone(geo, id = this.stones++, weather = true) {
		const g = this.add('limestone', geo);
		const p = this.part('limestone');
		const P = g.attributes.position.array, N = g.attributes.normal.array;
		const W = new Float32Array(P.length);
		for (let i = 0; i < P.length; i += 3) {
			const y = P[i + 1];
			const foot = weather ? 1 - span(y, 0.05, 1.15) : 0;
			const dark = (1 - 0.2 * foot) * (N[i + 1] > 0.6 && y > 5 ? 0.9 : 1);
			W[i] = dark * (1 - 0.07 * foot);
			W[i + 1] = dark * (1 - 0.02 * foot);
			W[i + 2] = dark * (1 - 0.1 * foot);
		}
		p.W.push(W);
		p.S.push(new Int32Array(P.length / 3).fill(id));
		return id;
	}
	/** each material's pieces joined into one run of numbers, once */
	seal() {
		const join = (list, T = Float32Array) => {
			const out = new T(list.reduce((n, a) => n + a.length, 0));
			let k = 0;
			for (const a of list) out.set(a, k), (k += a.length);
			return out;
		};
		for (const p of this.parts.values()) {
			if (!Array.isArray(p.P)) continue;
			p.P = join(p.P);
			p.N = join(p.N);
			p.U = join(p.U);
			if (p.S) (p.S = join(p.S, Int32Array)), (p.W = join(p.W));
		}
	}
	/** the quarter laid into the bag, turned by `a` round the dome's middle */
	/** another kit's shapes laid into this one, turned by `a` round the dome's middle, its stones their own tints */
	copy(src, a, r) {
		src.seal();
		const base = this.stones;
		for (const [m, p] of src.parts) {
			const q = this.part(m);
			const { P, N, U } = out_turn(p, a, r);
			q.P.push(P);
			q.N.push(N);
			q.U.push(U);
			if (p.S) {
				q.S.push(p.S.map((k) => (k < 0 ? k : k + base)));
				q.W.push(p.W);
			}
		}
		this.stones += src.stones;
	}
	/** the quarter laid into the bag, turned by `a` round the dome's middle */
	place(bag, a, r) {
		this.seal();
		for (const [m, p] of this.parts) {
			const n = p.P.length / 3;
			const { P, N, U } = out_turn(p, a, r);
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(P, 3));
			g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
			g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
			if (p.S) {
				// each stone's tint (the mortar's first), then each vertex's colour its stone's under its weather
				const T = new Float32Array(this.stones * 3 + 3);
				T.set(out_MORTAR, 0);
				for (let k = 0; k < this.stones; k++) T.set(out_tint(r), k * 3 + 3);
				const C = new Float32Array(n * 3), S = p.S, W = p.W;
				for (let i = 0, j = 0; i < n; i++, j += 3) {
					const k = S[i] * 3 + 3;
					C[j] = T[k] * W[j];
					C[j + 1] = T[k + 1] * W[j + 1];
					C[j + 2] = T[k + 2] * W[j + 2];
				}
				g.setAttribute('color', new THREE.BufferAttribute(C, 3));
			}
			bag.add(m, g, null, { colour: !!p.S });
		}
	}
}

/** a kit's part (sealed) turned by `a` round the dome's middle, its pictures shifted by chance */
function out_turn(p, a, r) {
	const c = Math.cos(a), s = Math.sin(a);
	const n = p.P.length / 3;
	const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
	const pp = p.P, pn = p.N, pu = p.U;
	for (let i = 0; i < n * 3; i += 3) {
		const x = pp[i], z = pp[i + 2], nx = pn[i], nz = pn[i + 2];
		P[i] = x * c + z * s;
		P[i + 1] = pp[i + 1];
		P[i + 2] = -x * s + z * c;
		N[i] = nx * c + nz * s;
		N[i + 1] = pn[i + 1];
		N[i + 2] = -nx * s + nz * c;
	}
	const du = r() * 7, dv = r() * 7;
	for (let i = 0; i < n * 2; i += 2) {
		U[i] = pu[i] + du;
		U[i + 1] = pu[i + 1] + dv;
	}
	return { P, N, U };
}

/** a stone into the kit, laid in its frame (where F is given); `id` where it is cut as one with another */
const out_add = (kit, geo, F, id) => kit.stone(F ? out_put(geo, F) : geo, id);

/* ---- the piers: a moulded base, four courses, a capital (an astragal, an ovolo and the abacus the arches spring from) ---- */

/** the base: a plinth, a torus, a fillet and a cavetto into the shaft (d out of the shaft's face, y up) */
const out_BASE = (() => {
	const p = [[0.11, out_YW], [0.11, out_YW + 0.2], [0.1, out_YW + 0.215], [0.075, out_YW + 0.215]];
	for (let i = 1; i <= 6; i++) {
		const t = -Math.PI / 2 + (i / 6) * Math.PI;
		p.push([0.06 + 0.045 * Math.cos(t), out_YW + 0.26 + 0.045 * Math.sin(t)]);
	}
	p.push([0.03, out_YW + 0.31]);
	for (let i = 1; i <= 3; i++) {
		const t = (i / 3) * (Math.PI / 2);
		p.push([0.03 - 0.03 * Math.sin(t), out_YW + 0.31 + 0.07 * (1 - Math.cos(t))]);
	}
	return p;
})();
/** the shaft's courses' bed joints, from the base to the capital */
const out_PIER_BEDS = [out_YW + 0.38, 1.07, 1.61, 2.16, 2.7];
/** the capital under the abacus: an astragal, a neck and an ovolo out to the abacus */
const out_CAP = (() => {
	const y = 2.7;
	const p = [[0, y]];
	for (let i = 1; i <= 4; i++) {
		const t = -Math.PI / 2 + (i / 4) * Math.PI;
		p.push([0.022 * Math.cos(t) + 0.004, y + 0.024 + 0.024 * Math.sin(t)]);
	}
	p.push([0.004, y + 0.11]);
	for (let i = 1; i <= 5; i++) {
		const t = (i / 5) * (Math.PI / 2);
		p.push([0.004 + 0.116 * (1 - Math.cos(t)), y + 0.11 + 0.1 * Math.sin(t)]);
	}
	p.push([0.12, y + 0.21]);
	return p;
})();
const out_ABACUS = 0.13;

/** a course of a pier in plan, its vertical arrises chamfered (8 points round; half sides hx along, hz across) */
const out_square = (hx, k = 0.014, hz = hx, ox = 0) => [[ox + hx, -hz + k], [ox + hx, hz - k], [ox + hx - k, hz], [ox - hx + k, hz], [ox - hx, hz - k], [ox - hx, -hz + k], [ox - hx + k, -hz], [ox + hx - k, -hz]];
/** a plan outline laid level: its u, v in x, z and its w up */
const out_PLAN = (u, v, w) => [u, w, v];

function out_pier(kit, p, r) {
	const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
	const g = out_JOINT / 2;
	// a gate's piers reach out_FLANK further toward it (the first of a quarter westward, the last eastward)
	const flank = p.j === 0 ? -1 : p.j === out_BAYS ? 1 : 0;
	const hx = out_HALF + (flank ? out_FLANK / 2 : 0), ox = (flank * out_FLANK) / 2, h = out_HALF;
	const moved = (geo) => (ox ? geo.translate(ox, 0, 0) : geo);
	out_add(kit, moved(out_squareMoulding(out_BASE, hx, { uv: [r(), r()] }, h)), F);
	for (let k = 0; k < out_PIER_BEDS.length - 1; k++) {
		const y0 = out_PIER_BEDS[k] + g, y1 = out_PIER_BEDS[k + 1] - g;
		// a gate's pier in alternate courses of one stone and of two
		if (flank && k % 2) for (const s of [-1, 1]) out_add(kit, out_stone(out_square(hx / 2 - g / 2, 0.014, h, ox + (s * hx) / 2), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
		else out_add(kit, out_stone(out_square(hx, 0.014, h, ox), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	}
	const t = out_add(kit, moved(out_squareMoulding(out_CAP, hx, { uv: [r(), r()] }, h)), F);
	out_add(kit, out_stone(out_square(hx + out_ABACUS, 0.01, h + out_ABACUS, ox), out_CAP.at(-1)[1], out_SPRING, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F, t);
	// the mortar behind the joints
	out_add(kit, out_stone(out_square(hx - 0.016, 0.004, h - 0.016, ox), out_YW + 0.2, 2.8, { map: out_PLAN, c: 0 }), F, -1);
	// over the cornice, the balustrade's die (the plinths of the bays either side run into it) and its cap under the rail
	const dx = out_DIE + (flank ? out_FLANK / 2 : 0);
	const onLine = (pts) => pts.map(([u, v]) => [u, v + out_BAL_Z]);
	out_add(kit, out_stone(onLine(out_square(dx, 0.012, 0.275, ox)), out_CORNICE_TOP + g, out_RAIL - 0.045 - g, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	out_add(kit, out_stone(onLine(out_square(dx + 0.02, 0.01, 0.295, ox)), out_RAIL - 0.045, out_RAIL - g, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
}

/* ---- a bay: its arch of voussoirs and keystone, the ashlar of its spandrels, its cornice, parapet and coping ---- */

/** where a bay's ashlar may be seamless over a pier (a stone running round the corner into the next bay's half) */
const out_seamless = (pier, course) => course === 0 || (pier + course) % 2 === 0;

function out_bay(kit, b, r) {
	const F = { o: polar(b.d, b.am), a: b.am, d: b.d };
	const g = out_JOINT / 2;
	const { ri, ro, L, n } = b;
	const D = Math.PI / n;
	const A = (rad, a) => [rad * Math.cos(a), out_SPRING + rad * Math.sin(a)];
	const ga = g / ri;
	// the voussoirs, from the west springing over to the east; the middle one the keystone, standing a little proud
	const mid = (n - 1) / 2;
	const xk = ro * Math.sin(D / 2);
	for (let i = 0; i < n; i++) {
		const a0 = Math.PI - i * D - ga, a1 = Math.PI - (i + 1) * D + ga;
		let pts;
		if (i === mid) pts = [A(ri, a1), [xk - g, A(ro - g, a1)[1]], [xk - g, b.key - g], [-xk + g, b.key - g], [-xk + g, A(ro - g, a0)[1]], A(ri, a0)];
		else pts = [A(ri, a1), A(ro - g, a1), A(ro - g, (a0 + a1) / 2), A(ro - g, a0), A(ri, a0)];
		const w = i === mid ? out_HALF + 0.025 : out_HALF;
		out_add(kit, out_stone(pts, -w, w, { uv: [r() * 4, r() * 4] }), F);
	}
	// the spandrels: course by course, each stone's foot cut round the extrados where the arch rises into it
	const rx = ro + g;
	const foot = (x, y0) => Math.max(y0, Math.abs(x) < rx ? out_SPRING + Math.sqrt(rx * rx - x * x) : -1);
	for (let c = 0; c < out_COURSES.length - 1; c++) {
		const y0 = out_COURSES[c] + g, y1 = out_COURSES[c + 1] - g;
		// clear of the arch where its extrados is 3 cm under the course's top; and of the keystone where it rises through
		const h = y1 - 0.03 - out_SPRING;
		const xa = h < rx ? Math.sqrt(rx * rx - h * h) : 0;
		const lo = Math.max(xa, y0 < b.key ? xk : 0);
		const ranges = lo > 0 ? [[-L, -lo], [lo, L]] : [[-L, L]];
		for (const [ra, rb] of ranges) {
			const len = rb - ra;
			if (len < 0.04) continue;
			const k = Math.max(1, Math.round(len / between(r, 0.62, 0.95)));
			const cuts = [ra];
			for (let i = 1; i < k; i++) cuts.push(ra + (len * (i + (r() - 0.5) * 0.5)) / k);
			cuts.push(rb);
			for (let i = 0; i < k; i++) {
				const atW = cuts[i] === -L, atE = cuts[i + 1] === L;
				const sw = atW && out_seamless(b.j, c), se = atE && out_seamless((b.j + 1) % (out_BAYS + 1), c);
				const xa0 = cuts[i] + (sw ? 0 : g), xb0 = cuts[i + 1] - (se ? 0 : g);
				// the foot along the stone: its corners, and every 0.38 m where it follows the arch (|x| < xb)
				const xs = [xa0, xb0];
				const yb = y0 - out_SPRING;
				const xb = yb < rx ? Math.sqrt(rx * rx - yb * yb) : 0;
				for (const x of [-xb, xb]) if (x > xa0 + 0.01 && x < xb0 - 0.01) xs.push(x);
				const c0 = Math.max(xa0, -xb), c1 = Math.min(xb0, xb);
				const steps = Math.ceil((c1 - c0) / 0.38);
				for (let s = 1; s < steps; s++) xs.push(c0 + ((c1 - c0) * s) / steps);
				xs.sort((p, q) => p - q);
				const bottom = xs.map((x) => [x, foot(x, y0)]);
				if (Math.max(...bottom.map((p) => p[1])) > y1 - 0.025) continue;
				const pts = [[xb0, y1], [xa0, y1], ...bottom];
				const sharp = [];
				if (sw) sharp.push(1);
				if (se) sharp.push(pts.length - 1);
				out_add(kit, out_stone(pts, -out_HALF, out_HALF, { sharp, uv: [r() * 4, r() * 4] }), F);
			}
		}
	}
	// the mortar behind it all: the spandrels' and the arch's core, 1.5 cm back from the faces
	const core = [[L, out_SPRING], [L, out_CORNICE], [-L, out_CORNICE], [-L, out_SPRING]];
	const rc = ri + 0.016, seg = n + 3;
	for (let i = 0; i <= seg; i++) core.push(A(rc, Math.PI - (i / seg) * Math.PI));
	out_add(kit, out_stone(core, -out_HALF + 0.015, out_HALF - 0.015, { c: 0 }), F, -1);
	// the cornice: an ovolo under a corona, its top weathered back to the parapet; long stones, two or three a bay
	const cornice = [[-out_HALF, out_CORNICE], [out_HALF, out_CORNICE], [out_HALF, out_CORNICE + 0.035], [out_HALF + 0.02, out_CORNICE + 0.035]];
	for (let i = 1; i <= 4; i++) {
		const t = -Math.PI / 2 + (i / 4) * (Math.PI / 2);
		cornice.push([out_HALF + 0.02 + 0.1 * Math.cos(t), out_CORNICE + 0.135 + 0.1 * Math.sin(t)]);
	}
	const cz = out_HALF + 0.29;
	cornice.push([out_HALF + 0.135, out_CORNICE + 0.135], [out_HALF + 0.135, out_CORNICE + 0.15], [cz - 0.012, out_CORNICE + 0.15], [cz, out_CORNICE + 0.162]);
	cornice.push([cz, out_CORNICE_TOP - 0.06], [cz - 0.012, out_CORNICE_TOP - 0.048], [0.27, out_CORNICE_TOP], [-out_HALF, out_CORNICE_TOP]);
	const run = (x0, x1, size, make) => {
		const k = Math.max(1, Math.round((x1 - x0) / size));
		let a = x0;
		for (let i = 0; i < k; i++) {
			const e = i === k - 1 ? x1 : x0 + ((x1 - x0) * (i + 1 + (r() - 0.5) * 0.4)) / k;
			make(a + g, e - g);
			a = e;
		}
	};
	run(-L, L, 2.3, (x0, x1) => out_add(kit, out_moulding(cornice, x0, x1, { uv: [r() * 4, r() * 4] }), F));
	// on the cornice the balustrade: its plinth (its top weathered a little each way), the balusters evenly between the
	// dies (a gate's piers' dies the longer toward its bay), the rail over them (an ovolo under each edge, its top
	// rounded, its inner face upright where a walker's chest meets it)
	const P = out_PLINTH_TOP;
	const plinth = [[-0.3, out_CORNICE_TOP], [0.23, out_CORNICE_TOP], [0.23, P - 0.035], [0.205, P - 0.01], [0.12, P], [-0.19, P], [-0.275, P - 0.01], [-0.3, P - 0.035]];
	run(-L, L, 1.6, (x0, x1) => out_add(kit, out_moulding(plinth, x0, x1, { uv: [r() * 4, r() * 4], soft: 0.2 }), F));
	const xa = -L + out_DIE + (b.door ? out_FLANK : 0) + 0.02;
	const nb = Math.max(1, Math.round((-2 * xa) / out_BAL_PITCH));
	for (let i = 0; i < nb; i++) {
		const geo = out_baluster(r);
		geo.translate(xa + ((i + 0.5) * -2 * xa) / nb, 0, out_BAL_Z);
		out_add(kit, geo, F);
	}
	const y = out_RAIL, t = out_TOP;
	const rail = [[-0.245, y], [0.165, y], [0.2, y + 0.012], [0.235, y + 0.03], [0.26, y + 0.06], [0.26, t - 0.035], [0.235, t - 0.012], [0.15, t - 0.002], [out_BAL_Z, t], [-0.22, t - 0.002], [-0.305, t - 0.012], [-0.33, t - 0.035], [-0.33, y + 0.06], [-0.305, y + 0.03], [-0.27, y + 0.012]];
	run(-L, L, 1.6, (x0, x1) => out_add(kit, out_moulding(rail, x0, x1, { uv: [r() * 4, r() * 4], soft: 0.6 }), F));
	// the terrace's border course along the plinth: long flags, their outer edge just under it
	run(-L, L, 1.55, (x0, x1) => {
		const pts = [[x0, -0.29 - out_BORDER], [x1, -0.29 - out_BORDER], [x1, -0.29], [x0, -0.29]];
		out_add(kit, out_stone(pts, out_FLOOR - out_FLAG, out_FLOOR, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	});
}

/**
 * A baluster (0.87 m, standing on the plinth's top, its axis at x 0, z 0): a square foot, a torus and a scotia, the
 * belly low (the vase of the Renaissance), the neck, a ring, the flare up to a square abacus under the rail. Turned in
 * eight facets, smooth; one stone, its picture shifted by chance.
 */
const out_BALUSTER = (() => {
	let made = null;
	return () => {
		if (made) return made;
		const H = out_RAIL - out_PLINTH_TOP;
		const k = H / 0.87;
		const prof = [[0.08, 0.05], [0.09, 0.068], [0.084, 0.085], [0.068, 0.1], [0.078, 0.15], [0.092, 0.23], [0.09, 0.31], [0.076, 0.39], [0.056, 0.48], [0.042, 0.57], [0.046, 0.612], [0.052, 0.628], [0.043, 0.648], [0.058, 0.72], [0.078, 0.79], [0.08, 0.825]];
		const lathe = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b * k)), 8).toNonIndexed();
		scaleUV(lathe, (TAU * 0.085) / out_TILE, (0.85 * k) / out_TILE);
		const foot = boxUV(new THREE.BoxGeometry(0.19, 0.05, 0.19).translate(0, 0.025, 0), out_TILE);
		const abacus = boxUV(new THREE.BoxGeometry(0.17, 0.045, 0.17).translate(0, H - 0.0225, 0), out_TILE);
		made = mergeGeometries([lathe, foot, abacus]);
		made.translate(0, out_PLINTH_TOP, 0);
		return made;
	};
})();
function out_baluster(r) {
	const g = out_BALUSTER().clone();
	const uv = g.attributes.uv, du = r() * 4, dv = r() * 4;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return g;
}

/* ---- the terrace on the arcade: its flags in courses round the ring, a strip of sedum and the lead along the glass,
 *      its soffit and beams; the stairs up to it; the pergolas over the gates ---- */

/** a grid of points (rows of [x, y, z], each row as long), smooth, facing up (or down where `down`) */
function out_grid(rows, down = false) {
	const pos = [], idx = [];
	const w = rows[0].length;
	for (const row of rows) for (const p of row) pos.push(p[0], p[1], p[2]);
	for (let i = 0; i < rows.length - 1; i++)
		for (let j = 0; j < w - 1; j++) {
			const a = i * w + j, b = a + 1, c = a + w, d = c + 1;
			idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// turned to face the right way
	let ny = 0;
	const n = g.attributes.normal;
	for (let i = 0; i < n.count; i++) ny += n.getY(i);
	if (ny > 0 === down) {
		for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
		g.setIndex(idx);
		g.computeVertexNormals();
	}
	return g;
}


/** a plan outline ([u, v] points) turned counter-clockwise, as out_stone wants it */
function out_ccw(pts) {
	let s = 0;
	for (let i = 0; i < pts.length; i++) {
		const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
		s += x0 * z1 - x1 * z0;
	}
	return s < 0 ? pts.slice().reverse() : pts;
}

/** how far from the dome's middle, along bearing `a`, the arcade's wall stands at `z` across it (out from its middle
 *  line: the balustrade's rail's inner face at −0.33, the plinth's at −0.30, the wall's inner face at −out_HALF) */
function out_lineAt(plan, a, z) {
	for (const b of plan.bays) {
		const da = out_wrap(a - b.am);
		if (Math.abs(da) <= (b.a1 - b.a0) / 2 + 1e-7) return (b.d + z) / Math.cos(da);
	}
	return out_RP + z;
}

/** where a sphere of radius rr round the dome's middle stands at height y */
const out_sphere = (rr, y) => Math.sqrt(rr * rr - y * y);
/** the flags' inner edge, past the strip of sedum along the glass; the wall plate's face under the soffit */
const out_FLAGS_IN = 39.86;

/**
 * THE STAIRS up to the terrace: one in each quarter on its diagonal (`a`), in the cloister walk against the dome's
 * plinth, curving round with it. 36 risers of 0.175 m from the walk to the terrace on treads of 0.30 m along its
 * middle line (`r`), 1.5 m between its walls (`r0` … `r1`): two flights of 18 and a landing of 1.5 m between them,
 * climbing eastward (by bearing). The first flight and the landing stand on solid masonry, the second on a sloping
 * slab (`waist` deep), the walk going on under it. Its walls of ashlar each side (`wall` thick) rise `guard` over the
 * nosings under a coping. Where a tread of the second flight would have less than 2.25 m under the terrace's soffit it
 * comes up through a well in the terrace, a balustrade round it like the terrace's edge (its walls rise to the
 * balustrade's plinth, dies at its corners and at the stair's head); at its head a threshold flush with the flags.
 * Along it `s` runs from the first riser (0) to the last (`len`).
 */
const out_ST = { a: Math.PI / 4, r: 41.35, r0: 40.6, r1: 42.1, wall: 0.22, tread: 0.3, n: 18, landing: 1.5, waist: 0.3, guard: 0.95, cope: 0.08 };
function out_stairPlan() {
	const S = out_ST;
	const rise = (out_FLOOR - out_YW) / (2 * S.n);
	const pitch = rise / S.tread;
	const f = (S.n - 1) * S.tread;
	const s2 = f + S.landing;
	const len = s2 + f;
	const land = out_YW + S.n * rise;
	const a0 = S.a - len / (2 * S.r);
	let j = 0;
	while (land + (j + 1) * rise <= out_SOFFIT_Y - 2.25) j++;
	// the well's back: just behind the first riser that rises too near the soffit
	const sw = s2 + j * S.tread - 0.05;
	// the walls' tops along the stair, `guard` over the nosings (the first flight's, level over the landing, the second's)
	const top = (s) => (s <= f ? out_YW + rise + pitch * s : s <= s2 - S.tread ? land : land + pitch * (s - s2 + S.tread)) + S.guard;
	// the second flight's slab's soffit
	const under = (s) => land - S.waist * Math.hypot(1, pitch) + pitch * (s - s2);
	const bear = (s) => a0 + s / S.r;
	return { ...S, rise, pitch, f, s2, len, land, a0, sw, top, under, bear, ri: S.r0 - S.wall, ro: S.r1 + S.wall, head: len + 0.3, wellTop: out_PLINTH_TOP };
}

/** an outline in a side view ([s, y] points) from its foot (along s) and its top (along s), counter-clockwise */
const out_side = (foot, top) => foot.concat(top.slice().reverse());

/** the root of an increasing fn between a and b (fn(a) < 0 < fn(b)) */
function out_solve(fn, a, b) {
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		if (fn(m) < 0) a = m;
		else b = m;
	}
	return (a + b) / 2;
}

function out_stair(kit, r) {
	const P = out_stairPlan();
	const g = out_JOINT / 2;
	const T = P.tread;
	// a shape drawn in the stair's side (u along its middle line, v up) laid round the dome's middle, w out across it
	const side = (u, v, w) => {
		const [x, z] = polar(P.r + w, P.bear(u));
		return [x, v, z];
	};
	const sector = (s0, s1, r0, r1) => out_ccw([polar(r0, P.bear(s0)), polar(r0, P.bear(s1)), polar(r1, P.bear(s1)), polar(r1, P.bear(s0))]);
	const block = (s0, s1, r0, r1, y0, y1, id) => out_add(kit, out_stone(sector(s0, s1, r0, r1), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), null, id);
	const ra = P.r0 - 0.01, rb = P.r1 + 0.01;
	// the first flight, each step a stone down to the walk, and the landing in two
	for (let i = 1; i < P.n; i++) block((i - 1) * T, i * T, ra, rb, out_YW, out_YW + i * P.rise);
	block(P.f, P.f + P.landing / 2, ra, rb, out_YW, P.land);
	block(P.f + P.landing / 2, P.s2, ra, rb, out_YW, P.land);
	// the second flight's steps on its slab, and the slab
	for (let j = 0; j < P.n - 1; j++) {
		const yt = P.land + (j + 1) * P.rise;
		block(P.s2 + j * T, P.s2 + (j + 1) * T, ra, rb, yt - P.rise - 0.04, yt);
	}
	const ss = [];
	for (let s = P.s2; s < P.len - 1e-6; s += T) ss.push(s);
	ss.push(P.len);
	const slab = out_side(ss.map((s) => [s, P.under(s)]), ss.map((s) => [s, P.land + P.pitch * (s - P.s2)]));
	out_add(kit, out_stone(slab, ra - P.r, rb - P.r, { map: side, uv: [r() * 4, r() * 4] }), null);
	// the threshold at its head, flush with the flags, the width of the well
	const rm = between(r, 41.1, 41.6);
	block(P.len, P.head, P.ri, rm - g, 5.95, out_FLOOR);
	block(P.len, P.head, rm + g, P.ro, 5.95, out_FLOOR);

	// the walls: ashlar in courses, each stone cut to the wall's top (over the nosings; round the well the balustrade's
	// plinth) and, under the second flight, to its slab's soffit; a mortar core behind the joints
	const wallTop = (s) => (s < P.sw ? P.top(s) : P.wellTop);
	const wallFoot = (s) => (s <= P.s2 ? out_YW : P.under(s));
	const K = 18, ch = (P.wellTop - out_YW) / K;
	const pieces = [[0, P.s2], [P.s2, P.sw], [P.sw, P.len]];
	const kinks = [P.f, P.s2 - T];
	for (const [w0, w1] of [[P.ri, P.r0], [P.r1, P.ro]]) {
		for (const [pa, pb] of pieces) {
			const e = 1e-4;
			const topF = (s) => wallTop(Math.min(Math.max(s, pa + e), pb - e));
			const footF = (s) => wallFoot(Math.min(Math.max(s, pa + e), pb - e));
			// the breaks of the lines between pa and pb: where they bend
			const breaks = (c0, c1) => [c0, ...kinks.filter((k) => k > c0 + 1e-6 && k < c1 - 1e-6), c1];
			// the outline of [c0, c1] between the heights y0 and y1, cut to the wall's top and foot
			const outline = (c0, c1, y0, y1) => {
				let s = breaks(c0, c1);
				const add = [];
				for (let i = 0; i + 1 < s.length; i++)
					for (const [fn, yv] of [[topF, y1], [footF, y0]]) {
						const da = fn(s[i]) - yv, db = fn(s[i + 1]) - yv;
						if (da * db < 0) add.push(s[i] + ((s[i + 1] - s[i]) * da) / (da - db));
					}
				s = [...s, ...add].sort((x, y) => x - y);
				return out_side(s.map((x) => [x, Math.max(y0, footF(x))]), s.map((x) => [x, Math.min(y1, topF(x))]));
			};
			// the mortar core
			out_add(kit, out_stone(outline(pa, pb, -99, 99).map(([s, yy]) => [s, yy - 0.012]), w0 + 0.015 - P.r, w1 - 0.015 - P.r, { map: side, c: 0 }), null, -1);
			for (let k = 0; k < K; k++) {
				const y0 = out_YW + k * ch, y1 = y0 + ch;
				let lo = pa, hi = pb;
				if (topF(pa) < y0 + 0.03) {
					if (topF(pb) < y0 + 0.03) continue;
					lo = out_solve((s) => topF(s) - (y0 + 0.03), pa, pb);
				}
				if (footF(pb) > y1 - 0.03) {
					if (footF(pa) > y1 - 0.03) continue;
					hi = out_solve((s) => footF(s) - (y1 - 0.03), pa, pb);
				}
				if (hi - lo < 0.06) continue;
				// stones about 0.9 m long, each course's joints over the middles of the one below
				const cuts = [lo];
				let s = lo + (k % 2 ? 0.45 : 0.9) * between(r, 0.8, 1.2);
				while (s < hi - 0.3) cuts.push(s), (s += between(r, 0.75, 1.05));
				cuts.push(hi);
				for (let i = 0; i + 1 < cuts.length; i++) {
					const pts = outline(cuts[i] + g, cuts[i + 1] - g, y0 + g, y1 - g);
					out_add(kit, out_stone(pts, w0 - P.r, w1 - P.r, { map: side, uv: [r() * 4, r() * 4] }), null);
				}
			}
		}
		// the coping, raking over the flights
		const cw0 = w0 - 0.025 - P.r, cw1 = w1 + 0.025 - P.r;
		const cuts = [0];
		for (let s = 1.1; s < P.sw - 0.4; s += between(r, 0.95, 1.25)) cuts.push(s);
		cuts.push(P.sw);
		for (let i = 0; i + 1 < cuts.length; i++) {
			const c0 = cuts[i] + g, c1 = cuts[i + 1] - g;
			const s = [c0, ...kinks.filter((k) => k > c0 && k < c1), c1];
			const pts = out_side(s.map((x) => [x, P.top(x)]), s.map((x) => [x, P.top(x) + P.cope]));
			out_add(kit, out_stone(pts, cw0, cw1, { map: side, uv: [r() * 4, r() * 4] }), null);
		}
	}
	// the cross wall at the well's back, on the terrace's slab, two courses of two stones up to the plinth's top
	const s0 = P.sw - P.wall, s1 = P.sw;
	block(s0 + 0.012, s1 - 0.012, P.ri + 0.015, P.ro - 0.015, 5.96, P.wellTop - 0.01, -1);
	for (const [y0, y1] of [[5.95, out_FLOOR], [out_FLOOR, P.wellTop]]) {
		const m = between(r, 40.9, 41.8);
		block(s0, s1, P.ri, m - g, y0 + g, y1 - g);
		block(s0, s1, m + g, P.ro, y0 + g, y1 - g);
	}
	// round the well, a balustrade like the terrace's edge: on the walls' middle lines a die at each corner and each
	// side of the stair's head (standing a little over the rail), balusters between, a rail from die to die
	const mid = [(P.ri + P.r0) / 2, (P.r1 + P.ro) / 2];
	const sb = P.sw - P.wall / 2, sh = P.len - 0.17, D = 0.16;
	for (const rr of mid)
		for (const s of [sb, sh]) {
			const F = { o: polar(rr, P.bear(s)), a: P.bear(s), d: 0 };
			out_add(kit, out_stone(out_square(D, 0.012), out_FLOOR - 0.02, out_TOP - 0.03, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
			out_add(kit, out_stone(out_square(D + 0.03, 0.012), out_TOP - 0.03, out_TOP + 0.05, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
		}
	const baluster = (rr, a) => out_add(kit, out_baluster(r), { o: polar(rr, a), a, d: 0 });
	const rail = [[-0.13, 0], [0.13, 0], [0.155, 0.04], [0.155, 0.235], [0.12, 0.265], [0, 0.275], [-0.12, 0.265], [-0.155, 0.235], [-0.155, 0.04]].map(([u, v]) => [u, out_RAIL + v]);
	for (const rr of mid) {
		const a0 = sb + D + 0.02, a1 = sh - D - 0.02, n = Math.max(1, Math.round((a1 - a0) / out_BAL_PITCH));
		for (let i = 0; i < n; i++) baluster(rr, P.bear(a0 + ((i + 0.5) * (a1 - a0)) / n));
		const k = Math.ceil((sh - sb - 2 * D) / 1.25);
		for (let i = 0; i < k; i++) {
			const c0 = sb + D + ((sh - sb - 2 * D) * i) / k, c1 = sb + D + ((sh - sb - 2 * D) * (i + 1)) / k;
			out_add(kit, out_stone(rail, c0 + (i ? g : 0), c1 - (i + 1 < k ? g : 0), { map: (u, v, w) => side(w, v, rr - P.r + u), uv: [r() * 4, r() * 4] }), null);
		}
	}
	{
		const a = P.bear(sb), F = { o: [0, 0], a, d: 0 };
		const z0 = mid[0] + D, z1 = mid[1] - D, n = Math.max(1, Math.round((z1 - z0 - 0.04) / out_BAL_PITCH));
		for (let i = 0; i < n; i++) baluster(z0 + 0.02 + ((i + 0.5) * (z1 - z0 - 0.04)) / n, a);
		out_add(kit, out_stone(rail, z0, z1, { map: (u, v, w) => [u, v, w], uv: [r() * 4, r() * 4] }), F);
	}
}

/**
 * The terrace's own parts in a quarter (bearings 0 … π/2): its flags in six courses round the ring (the seventh, the
 * border along the balustrade, is each bay's), the mortar under them, the strip of sedum along the glass and the lead
 * flashing against it; under it the lime soffit, the wall plate along the shell and the oak beams on the pier lines.
 * The stair's well is left open.
 */
function out_terrace(kit, plan, r) {
	const P = out_stairPlan();
	const g = out_JOINT / 2;
	const piers = plan.piers.filter((p) => p.q === 0);
	const well = [P.bear(P.sw - P.wall), P.bear(P.head)];
	const soffitHole = [P.bear(P.sw - P.wall), P.bear(P.len)];
	// the bearings the strips are sampled at: every 0.6 m or so, the piers' (where the wall bends) and the well's among them
	const marks = [0, Math.PI / 2, ...piers.map((p) => p.a), ...well, ...soffitHole].filter((a) => a >= 0 && a <= Math.PI / 2).sort((x, y) => x - y);
	const A = [];
	for (let i = 0; i + 1 < marks.length; i++) {
		const a = marks[i], b = marks[i + 1];
		if (b - a < 1e-7) continue;
		const n = Math.max(1, Math.ceil(((b - a) * 44) / 0.6));
		for (let k = 0; k < n; k++) A.push(a + ((b - a) * k) / n);
	}
	A.push(Math.PI / 2);
	// a strip of the ring between rA(a) and rB(a), bearings a0 … a1, level at y
	const strip = (a0, a1, rA, rB, y, down) => {
		const as = A.filter((a) => a >= a0 - 1e-9 && a <= a1 + 1e-9);
		const row = (f) => as.map((a) => {
			const [x, z] = polar(f(a), a);
			return [x, y, z];
		});
		return as.length < 2 ? null : out_grid([row(rA), row(rB)], down);
	};
	const at = (v) => () => v;
	// the same strip with the well cut out of it between the radii ri and ro
	const holed = (hole, rA, rB, y, down, make) => {
		for (const [a0, a1] of [[0, hole[0]], [hole[1], Math.PI / 2]]) make(strip(a0, a1, rA, rB, y, down));
		make(strip(hole[0], hole[1], rA, at(P.ri), y, down));
		make(strip(hole[0], hole[1], at(P.ro), rB, y, down));
	};
	const plinth = (a) => out_lineAt(plan, a, -0.29);
	const border = (a) => out_lineAt(plan, a, -0.29 - out_BORDER);
	// the mortar the flags are bedded in, showing in their joints
	holed(well, at(out_FLAGS_IN), plinth, out_FLOOR - 0.02, false, (geo) => geo && kit.stone(geo, -1, false));
	// the strip of sedum along the glass (reaching in under its frames, so nowhere a foot can stand is there a gap
	// between the terrace and the glass), and the lead flashing dressed up against the shell
	const sedum = strip(0, Math.PI / 2, at(out_sphere(R - 0.15, out_FLOOR - 0.02)), at(out_FLAGS_IN + 0.01), out_FLOOR - 0.02, false);
	kit.add('sedum', sedum, true);
	const lead = A.map((a) => [0, 1].map((t) => {
		const y = out_FLOOR - 0.03 + t * 0.2, [x, z] = polar(out_sphere(R + 0.07 - t * 0.015, y), a);
		return [x, y, z];
	}));
	kit.add('out-lead', out_grid([lead.map((p) => p[0]), lead.map((p) => p[1])]), true);
	// the flags: six courses round the ring, each flag 0.55–1.0 m long, the joints of one course off the next's; the
	// last course meets the border along the balustrade (straight from pier to pier)
	const rows = [[out_FLAGS_IN, at(P.ri)], [P.ri, at(40.98)], [40.98, at(41.62)], [41.62, at(P.ro)], [P.ro, at(42.98)], [42.98, border]];
	const pierA = piers.map((p) => p.a);
	rows.forEach(([ra, rB], k) => {
		const cut = k >= 1 && k <= 3;
		const spans = cut ? [[0, well[0]], [well[1], Math.PI / 2]] : [[0, Math.PI / 2]];
		const rm = ra + 0.32;
		for (const [b0, b1] of spans) {
			const cuts = [b0];
			let a = b0 + (between(r, 0.2, 0.95) + (k % 2) * 0.2) / rm;
			while (a < b1 - 0.35 / rm) cuts.push(a), (a += between(r, 0.55, 1.0) / rm);
			cuts.push(b1);
			for (let i = 0; i + 1 < cuts.length; i++) {
				const c0 = cuts[i], c1 = cuts[i + 1];
				const ri = ra + g, gi = g / ri;
				const out = [c1, ...pierA.filter((p) => p > c0 && p < c1).reverse(), c0].map((a, n, all) => {
					const ro = rB(a) - g;
					const aa = n === 0 ? a - g / ro : n === all.length - 1 ? a + g / ro : a;
					return polar(ro, aa);
				});
				const pts = out_ccw([polar(ri, c0 + gi), polar(ri, c1 - gi), ...out]);
				out_add(kit, out_stone(pts, out_FLOOR - out_FLAG, out_FLOOR, { map: out_PLAN, uv: [r() * 4, r() * 4] }), null);
			}
		}
	});
	// the soffit: lime plaster from the wall plate to the wall's head, open over the stair's well
	const wall = (a) => out_lineAt(plan, a, -out_HALF);
	holed(soffitHole, at(out_FLAGS_IN), wall, out_SOFFIT_Y, true, (geo) => geo && kit.add('plaster', geo, true));
	// the wall plate along the shell under it, moulded on its face
	const plate = [[0, out_SOFFIT_Y - 0.3], [0.2, out_SOFFIT_Y - 0.3], [0.215, out_SOFFIT_Y - 0.295], [0.232, out_SOFFIT_Y - 0.28], [0.24, out_SOFFIT_Y - 0.26], [0.24, out_SOFFIT_Y + 0.02], [0, out_SOFFIT_Y + 0.02]];
	out_ringRun(kit, plate, out_FLAGS_IN - 0.24, 0, Math.PI / 2, 1.3, r);
	// the oak beams on the pier lines, from the wall's head to the plate (where one would cross the well, to its wall)
	for (const p of piers) {
		const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
		const inWell = p.a > soffitHole[0] - 0.004 && p.a < soffitHole[1] + 0.004;
		const zB = -(out_RP - (inWell ? P.ro : out_FLAGS_IN));
		const y0 = out_SOFFIT_Y - out_BEAM, y1 = out_SOFFIT_Y + 0.03;
		const pts = out_ccw([[-out_HALF, y0], [-out_HALF, y1], [zB, y1], [zB, y0]]);
		const geo = out_stone(pts, -0.085, 0.085, { map: (u, v, w) => [w, v, u], c: 0.012, tile: TILE.timber, uv: [r() * 3, r() * 3] });
		kit.add('timber', out_put(geo, F));
	}
}

/**
 * A pergola over the gate on bearing `a`: four oak posts (two by the glass, two at the lane's edge), a beam along the
 * ring on each pair, rafters across them overhanging both, 2.55 m clear over the flags; passion fruit climbs it from
 * pots (out_furnish).
 */
const out_PERGOLA = { rIn: 40.0, rOut: 42.6, half: 2.75, h: 2.55 };
function out_pergola(kit, a, r) {
	const { rIn, rOut, half, h } = out_PERGOLA;
	const F = { o: [0, 0], a, d: 0 };
	const y0 = out_FLOOR;
	const oak = (w, hh, d, x, y, z) => kit.add('timber', out_put(out_block(w, hh, d, 0.012, 1, x, y, z, r), F));
	const xs = [rIn, rOut].map((rr) => rr * Math.sin(half / rr));
	const zs = [rIn, rOut].map((rr) => rr * Math.cos(half / rr));
	for (let i = 0; i < 2; i++)
		for (const s of [-1, 1]) {
			oak(0.14, h, 0.14, s * xs[i], y0 + h / 2, zs[i]);
			// a brace from each post into its beam
			const br = bar([s * (xs[i] - 0.07), y0 + h - 0.55, zs[i]], [s * (xs[i] - 0.5), y0 + h + 0.01, zs[i]], 0.035, 0.035, 4);
			kit.add('timber', out_put(boxUV(br, TILE.timber), F));
		}
	for (let i = 0; i < 2; i++) oak(2 * xs[i] + 0.7, 0.22, 0.1, 0, y0 + h + 0.11, zs[i]);
	const zA = zs[0] - 0.35, zB = zs[1] + 0.3;
	for (let x = -Math.max(...xs) - 0.2; x <= Math.max(...xs) + 0.2001; x += 0.48) oak(0.06, 0.16, zB - zA, x, y0 + h + 0.3, (zA + zB) / 2);
}

/* ---- the ground: the walk's flagstones, its kerb (one step down), the gravel apron, the paths out from the gates ---- */

/** stones laid round a circle of radius `rr` from bearing a0 to a1, each about `size` long: a profile `prof` ([z, y], z
 *  out from the circle) run along each, its ends in the radial planes */
function out_ringRun(kit, prof, rr, a0, a1, size, r) {
	const k = Math.max(1, Math.round(((a1 - a0) * rr) / size));
	const g = out_JOINT / 2;
	for (let i = 0; i < k; i++) {
		const b0 = a0 + ((a1 - a0) * i) / k, b1 = a0 + ((a1 - a0) * (i + 1)) / k;
		const h = (b1 - b0) / 2;
		const F = { o: polar(rr, b0 + h), a: b0 + h, d: rr };
		const L = rr * Math.sin(h);
		out_add(kit, out_moulding(prof, -L + g, L - g, { uv: [r() * 4, r() * 4] }), F);
	}
}

function out_ground(kit, plan, r) {
	const doorA = plan.doors.map((dd) => dd.a);
	/** how far [r, a] is across from the nearest door's axis */
	const across = (rr, a) => Math.min(...doorA.map((d) => {
		const da = Math.abs(out_wrap(a - d));
		return da < 1 ? rr * Math.sin(da) : 99;
	}));
	// the walk: level at out_YW, ramped gently down to the door's sill in front of each door (flared at its sides)
	const A = [];
	for (let a = 0; a < Math.PI / 2 - 1e-6; ) {
		A.push(a);
		a += (across(out_KERB, a) < 3.6 ? 0.2 : 0.9) / out_KERB;
	}
	A.push(Math.PI / 2);
	const walkY = (rr, a) => {
		const t = across(rr, a);
		const k = (1 - smooth((rr - R - 0.1) / 1.8)) * (1 - smooth((t - out_PATH_GATE) / 0.7));
		return out_YW - (out_YW - out_SILL) * k;
	};
	const radii = [R - 0.2, R + 0.1, R + 0.7, R + 1.3, R + 1.9, out_KERB + 0.02];
	const rows = radii.map((rr) => A.map((a) => {
		const [x, z] = polar(rr, a);
		return [x, walkY(rr, a), z];
	}));
	kit.add('flag', out_grid(rows), true);
	// the kerb: one step of 0.15 m down to the apron, its nose rounded; broken where the paths run out
	const kerb = [[0, 0], [out_KERB_W, 0], [out_KERB_W, 0.112], [out_KERB_W - 0.006, 0.136], [out_KERB_W - 0.022, out_YW + 0.004], [0, out_YW + 0.004]];
	const edge = [[0, 0], [out_EDGE_W, 0], [out_EDGE_W, 0.032], [out_EDGE_W - 0.01, 0.042], [0.01, 0.042], [0, 0.032]];
	const wP = out_PATH_GATE + out_EDGE_W;
	const rA0 = out_KERB + out_KERB_W, rA1 = rA0 + out_APRON;
	const d0 = 0, d1 = Math.PI / 2;
	out_ringRun(kit, kerb, out_KERB, d0 + Math.asin((wP + 0.004) / out_KERB), d1 - Math.asin((wP + 0.004) / out_KERB), 1.4, r);
	// the apron: gravel from the kerb to an edging of limestone, its ends straight along the paths' edges
	const n = 90;
	const rowAt = (rr, y) => Array.from({ length: n + 1 }, (_, i) => {
		const a = lerp(d0 + Math.asin(wP / rr), d1 - Math.asin(wP / rr), i / n);
		const [x, z] = polar(rr, a);
		return [x, y, z];
	});
	kit.add('gravel', out_grid([rowAt(rA0 - 0.02, 0.025), rowAt((rA0 + rA1) / 2, 0.028), rowAt(rA1 + 0.02, 0.025)]), true);
	out_ringRun(kit, edge, rA1, d0 + Math.asin((wP + 0.004) / rA1), d1 - Math.asin((wP + 0.004) / rA1), 1.6, r);
	// the paths: flagstones from the walk's edge straight out, 4.5 m wide across the apron (ramped down over it), then
	// narrowing to 2.4 m, level
	const s0 = out_KERB + 0.02, s1 = rA1 + out_EDGE_W;
	const pathY = (s) => out_PATH_Y + (out_YW - out_PATH_Y) * (1 - smooth((s - out_KERB) / (s1 - out_KERB)));
	// (the north door's: s out along +z, t across along +x)
	{
		const P = (s, t, y) => [t, y, s];
		const half = (s) => lerp(out_PATH_GATE, out_PATH, smooth((s - s1) / 4));
		const ss = [];
		for (let s = s0; s < s1; s += 0.3) ss.push(s);
		for (let s = s1; s < s1 + 4; s += 0.5) ss.push(s);
		for (let s = s1 + 4; s < out_PATH_END; s += 1.5) ss.push(s);
		ss.push(out_PATH_END);
		const prow = ss.map((s, i) => [-1, -0.5, 0, 0.5, 1].map((f) => {
			const t = f * half(s);
			const sv = i === 0 ? Math.sqrt(s0 * s0 - t * t) : s;
			return P(sv, t, pathY(sv));
		}));
		kit.add('flag', out_grid(prow), true);
		// its edging, each stone's top following the ramp, and a stone across its end
		for (const side of [-1, 1]) {
			const tc = (u) => side * (half(u) + out_EDGE_W / 2);
			let s = Math.sqrt(out_KERB * out_KERB - wP * wP);
			while (s < out_PATH_END - 0.01) {
				const e = Math.min(out_PATH_END, s + (s < s1 + 4 ? 0.62 : between(r, 0.8, 1.0)));
				const a = s + out_JOINT / 2, b = e - out_JOINT / 2;
				const pts = [[a, 0], [b, 0], [b, pathY(b) + 0.015], [a, pathY(a) + 0.015]];
				const geo = out_stone(pts, -out_EDGE_W / 2, out_EDGE_W / 2, { map: (uu, vv, ww) => P(uu, tc(uu) + ww, vv), uv: [r() * 4, r() * 4] });
				out_add(kit, geo, null);
				s = e;
			}
		}
		const wE = out_PATH + out_EDGE_W;
		const endPts = [[-wE, 0], [wE, 0], [wE, out_PATH_Y + 0.015], [-wE, out_PATH_Y + 0.015]];
		out_add(kit, out_stone(endPts, out_PATH_END + 0.004, out_PATH_END + out_EDGE_W, { map: (uu, vv, ww) => P(ww, uu, vv), uv: [r(), r()] }), null);
	}
}

/* ---- along the walk: stone benches against the dome's plinth, bronze lanterns on the piers ---- */

/** a rounded box laid in a frame at [x, y, z], its UVs in metres (shifted by chance) */
function out_block(w, h, d, rad, seg, x, y, z, r) {
	const g = boxUV(new RoundedBoxGeometry(w, h, d, seg, rad), out_TILE);
	g.translate(x, y, z);
	const uv = g.attributes.uv, du = r() * 4, dv = r() * 4;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return g;
}

function out_benches(kit, plan, r) {
	for (const b of plan.bays) {
		if (b.q || (b.j !== 3 && b.j !== 10)) continue;
		const F = { o: polar(R + 1.25, b.am), a: b.am, d: 0 };
		// under the roof, out of the rain: no weather at their feet
		kit.stone(out_put(out_block(1.8, 0.085, 0.43, 0.028, 2, 0, out_YW + 0.4125, 0.02, r), F), undefined, false);
		for (const s of [-1, 1]) kit.stone(out_put(out_block(0.16, 0.37, 0.36, 0.022, 1, s * 0.6, out_YW + 0.185, 0, r), F), undefined, false);
	}
}

/** a lathe of [r, y] with flat faces (a square one where `seg` is 4, turned square to the pier) */
function out_lathe(points, seg = 4) {
	const g = new THREE.LatheGeometry(points.map(([a, b]) => new THREE.Vector2(a, b)), seg, Math.PI / 4).toNonIndexed();
	g.computeVertexNormals();
	return g;
}

/**
 * A lantern of bronze and opal glass in a frame, its axis at x 0, z `zc`, its foot at y0: a finial under a tray, four
 * corner posts round the glass, a pyramid roof (0.43 m from the finial's foot to the roof's top).
 */
function out_lantern(put, zc, y0) {
	const L = (pts, seg) => {
		const g = out_lathe(pts.map(([a, b]) => [a, b + y0]), seg);
		g.translate(0, 0, zc);
		return g;
	};
	put('bronze', L([[0, 0.427], [0.018, 0.421], [0.132, 0.351], [0.132, 0.339], [0.11, 0.337], [0, 0.337]], 4));
	put('opal', L([[0.104, 0.337], [0.09, 0.075]], 4));
	for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
		const k = 1 / Math.SQRT2;
		put('bronze', bar([sx * 0.104 * k, y0 + 0.339, zc + sz * 0.104 * k], [sx * 0.09 * k, y0 + 0.073, zc + sz * 0.09 * k], 0.006, 0.006, 4));
	}
	put('bronze', L([[0, 0.059], [0.104, 0.065], [0.106, 0.077], [0, 0.077]], 4));
	put('bronze', L([[0, 0], [0.012, 0.015], [0.026, 0.045], [0.03, 0.059], [0, 0.059]], 6));
}

/** the lanterns on every third pier: under the arcade on its inner face, on a bracket; on the terrace, on a post on the
 *  balustrade's rail over the die */
function out_lanterns(kit, plan) {
	const h = out_HALF;
	for (const p of plan.piers) {
		if (p.q || p.j % 3 !== 1) continue;
		const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
		const zc = -h - 0.3;
		const put = (m, g) => kit.add(m, out_put(g, F));
		const plate = box(0.11, 0.2, 0.024);
		plate.translate(0, 2.32, -h - 0.012);
		put('bronze', plate);
		put('bronze', bar([0, 2.37, -h - 0.02], [0, 2.37, zc - 0.012], 0.011, 0.011, 8));
		put('bronze', bar([0, 2.25, -h - 0.02], [0, 2.365, zc + 0.1], 0.007, 0.007, 6));
		put('bronze', bar([0, 2.37, zc], [0, 2.3, zc], 0.006, 0.006, 6));
		out_lantern(put, zc, 1.885);
		// on the rail: a base, a post, the lantern on it
		const base = box(0.12, 0.025, 0.12);
		base.translate(0, out_TOP + 0.0075, out_BAL_Z);
		put('bronze', base);
		put('bronze', bar([0, out_TOP, out_BAL_Z], [0, out_TOP + 0.3, out_BAL_Z], 0.026, 0.02, 8));
		out_lantern(put, out_BAL_Z, out_TOP + 0.27);
	}
}

/**
 * THE OUTSIDE, built into the bag 'outside': the arcade (piers, arches, spandrels, cornice, balustrade), the terrace on
 * it (its flags, soffit and beams, the stairs up to it, the pergolas over the gates), the walk and its kerb, the apron,
 * the paths, the benches and the lanterns; then the terrace furnished. The four quarters (gate
 * to gate) are alike: one is built and laid round four times, its stones tinted afresh each time. `dome.outside` keeps
 * the measures another part may need (the pier line, the walk's level and edge, the paths' half widths and end).
 */
function outsidePart(dome) {
	const plan = out_plan();
	const r = chance('forest-dome', 'outside');
	// one quarter, from the north gate's axis to the east gate's, built once: its piers and bays each made once by kind
	// (a pier, a bay of each parity, the gate's bay, the gate's two piers) and copied round to their places
	const kit = new out_Kit();
	const made = new Map();
	const like = (key, at, make) => {
		if (!made.has(key)) {
			const k = new out_Kit();
			make(k);
			made.set(key, { k, at });
		}
		const m = made.get(key);
		kit.copy(m.k, at - m.at, r);
	};
	for (const p of plan.piers) {
		if (p.q) continue;
		if (p.j === 0 || p.j === out_BAYS) out_pier(kit, p, r);
		else like('pier', p.a, (k) => out_pier(k, p, r));
	}
	for (const b of plan.bays) {
		if (b.q) continue;
		like(b.door ? 'gate' : `bay${b.j % 2}`, b.am, (k) => out_bay(k, b, r));
		if (b.door) out_pergola(kit, b.am, r);
	}
	out_terrace(kit, plan, r);
	out_stair(kit, r);
	out_ground(kit, plan, r);
	out_benches(kit, plan, r);
	out_lanterns(kit, plan);
	// and laid round four times
	const bag = dome.bag('outside');
	for (let q = 0; q < 4; q++) kit.place(bag, (q * Math.PI) / 2, r);
	dome.outside = { pierR: out_RP, walkY: out_YW, walkEdge: out_KERB, apron: out_KERB + out_KERB_W + out_APRON, pathHalf: out_PATH, pathGateHalf: out_PATH_GATE, pathEnd: out_PATH_END, cornice: out_CORNICE_TOP, top: out_TOP, terrace: out_FLOOR, stairs: [0, 1, 2, 3].map((q) => out_ST.a + (q * Math.PI) / 2) };
	out_furnish(dome, plan);
}

/**
 * THE TERRACE FURNISHED (Samuel 2026-11-05: "a really beautiful place as a community space outside"), with play's own
 * things and plants (by hash, drawn by the page), the same in each quarter and a lane of 1.3–1.7 m kept clear all
 * the way round. Over each gate the pergola, two round tables under it and passion fruit climbing it from pots; along
 * the balustrade daybeds, armchairs round a travertine table, a curved oak bench, young lemon trees in big terracotta
 * pots by the dies; by the glass round tables to eat at looking into the forest, a bench, troughs of lavender,
 * rosemary, basil and nasturtiums. A plant's roots are part of its build: in a pot or a trough only what roots shallow
 * enough to stay in it (a lemon in its second year after planting, 1.9 m, roots 0.58 m deep and 0.46 m out, in a pot
 * 1.1 m across; the herbs' 0.25 m), never a grown tree, whose roots would show on the flags and through the soffit.
 * Bearings are reckoned in the quarter from the north gate to the east; `face` 0 turns a thing's front (its +z) to the
 * dome's middle, π out to the land, −π/2 on round the ring.
 */
function out_furnish(dome, plan) {
	const P = out_stairPlan();
	const has = (t) => typeof THINGS !== 'undefined' && !!THINGS[t];
	const bay = (j) => plan.bays.find((b) => b.q === 0 && b.j === j);
	const pier = (j) => plan.piers.find((p) => p.q === 0 && p.j === j);
	const rail = (a) => out_lineAt(plan, a, -0.33);
	const M = 42;
	const faceTo = (along, out) => Math.atan2(-along, -out);
	const items = [];
	const thing = (name, rr, a, face = 0, o = {}) => items.push({ name, rr, a, h: o.y ?? 0, turn: a + Math.PI + face, scale: o.scale });
	const plant = (kind, rr, a, h, o = {}) => items.push({ kind, rr, a, h, o });
	// a great terracotta pot, a conca as a villa's lemons stand in (the library's made 2.2 times: 1.1 m across, its soil
	// 0.88 m up), with a lemon tree in its second year after planting (its stage 3 'Two years': 1.9 m high, 2 m across,
	// its roots 0.58 m deep and 0.46 m out, inside the pot)
	const pot = (rr, a, k = 2.2) => {
		thing('pot-terracotta', rr, a, 0, { scale: k });
		plant('lemon', rr, a, 0.4 * k, { exact: 3, turn: a * 7 });
	};
	const trough = (rr, a, kinds) => {
		thing('planter-trough', rr, a, 0);
		kinds.forEach((kind, i) => plant(kind, rr, a + ((i - (kinds.length - 1) / 2) * 0.52) / rr, 0.5, { stage: 9, turn: i * 2.1 + a * 5 }));
	};
	const dining = (rr, a) => {
		thing('table-dining-round', rr, a, 0);
		for (let k = 0; k < 4; k++) {
			const t = (k + 0.5) * (Math.PI / 2);
			const u = Math.sin(t) * 0.92, v = Math.cos(t) * 0.92;
			thing('chair-spindle', rr + v, a + u / (rr + v), faceTo(-u, -v));
		}
	};
	const daybeds = (b) => {
		for (const s of [-1, 1]) {
			const a = b.am + (s * 1.3) / M;
			thing('daybed-terrace', rail(a) - 0.51, a, 0);
		}
		thing('table-side-travertine', rail(b.am) - 0.32, b.am, 0);
	};
	const lounge = (b) => {
		const rr = rail(b.am) - 0.78;
		thing('table-coffee-travertine', rr, b.am, 0);
		for (const s of [-1, 1]) thing('armchair-round', rr, b.am + (s * 1.15) / M, faceTo(-s, 0.35));
	};
	// a pair of armchairs side by side at the balustrade, looking out, a side table between
	const view = (b) => {
		const rr = rail(b.am) - 0.62;
		for (const s of [-1, 1]) thing('armchair-round', rr, b.am + (s * 0.62) / M, Math.PI - s * 0.25);
		thing('table-side-travertine', rr + 0.05, b.am, 0);
	};
	// over the gate: the pergola's two tables by the glass, passion fruit from pots past its ends
	const gate = bay(out_BAYS);
	for (const s of [-1, 1]) dining(41.25, gate.am + (s * 1.45) / 41.25);
	for (const s of [-1, 1]) {
		const rr = out_PERGOLA.rIn + 0.22, a = gate.am + (s * (out_PERGOLA.half + 0.42)) / rr;
		thing('pot-terracotta', rr, a, 0, { scale: 1.25 });
		plant('passion-fruit', rr, a, 0.5, { stage: 9, turn: Math.atan2(-Math.sin(a), Math.cos(a)) });
	}
	// round the ring, bay by bay
	view(bay(0));
	daybeds(bay(1));
	dining(41.25, bay(2).am);
	lounge(bay(3));
	for (const s of [-1, 1]) trough(40.15, bay(4).am + (s * 0.9) / 40.15, s < 0 ? ['lavender', 'rosemary', 'lavender'] : ['basil', 'nasturtium', 'basil']);
	thing('bench-oak-curved', 40.3, bay(5).am, Math.PI);
	thing('bench-oak-curved', rail(bay(6).am) - 0.33, bay(6).am, 0);
	// in the strip by the glass beside the stair's well: two troughs
	for (const s of [P.sw + 1.1, P.sw + 3.4]) trough(40.12, P.bear(s), ['lavender', 'nasturtium', 'lavender']);
	for (const s of [-1, 1]) trough(40.15, bay(9).am + (s * 0.9) / 40.15, s < 0 ? ['rosemary', 'lavender', 'rosemary'] : ['nasturtium', 'basil', 'nasturtium']);
	lounge(bay(10));
	dining(41.25, bay(11).am);
	daybeds(bay(12));
	view(bay(13));
	// the lemons in pots against the dies, either side of each pergola and along the ring
	for (const j of [0, 4, 6, 9, 10, 14]) {
		const a = pier(j).a;
		pot(rail(a) - 0.06 - 0.55, a);
	}
	// laid round four times, as the arcade is
	for (let q = 0; q < 4; q++) {
		const Q = (q * Math.PI) / 2;
		for (const it of items) {
			const [x, z] = polar(it.rr, it.a + Q);
			const y = out_FLOOR + it.h;
			if (it.kind) {
				dome.plant(it.kind, x, y, z, { ...it.o, turn: (it.o.turn ?? 0) + Q });
				continue;
			}
			if (!has(it.name)) continue;
			if (it.scale) {
				const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.turn + Q), new THREE.Vector3(it.scale, it.scale, it.scale));
				dome.place(it.name, m);
			} else dome.place(it.name, x, y, z, { turn: it.turn + Q });
		}
	}
}

/* ================================================================================================================
 * 5. GROUND — the garden under the glass: its floor (the ground the biome is laid on), the plaza before the rooms, the
 *    meandering paths from the three gates, the brook from its spring to the pond, the bridges and the ford, the
 *    clearing with its pergola and its circle of benches, the logs and the trellises, and where each plant stands
 * ================================================================================================================ */

/*
 * How it is laid out, first to last: the brook (a spring's bowl in the plaza, a rill over the kerb into a basin, round
 * the clearing's east and under the south path to the pond), the gravel paths (each gate's, the loop round the
 * clearing, the spine up to the plaza) with their heights smoothed along them, a bridge wherever a path crosses the
 * water, the stepping-stone paths (one fords the brook), the things that stand (the pergola, the steps down from the
 * plaza, the flagstone aprons inside the gates, the paved circle, the bigger stones); then the forest, layer by layer
 * in guilds round its trees, each plant on the floor's height where it stands, the logs and the trellises among them;
 * then everything is built.
 *
 * THE FLOOR is one mesh in 'soil' (the page paints it with the biome and grows the biome's cover on it): a grid of
 * 0.75 m, refined near anything the cover must not grow under and cut cleanly along a field that is negative under
 * the paths, the plaza, the steps and aprons, the brook's bed and banks, the pond, the logs, the footings, the bigger
 * stones and the paved circle. What is cut is drawn by what lies over it (gravel, flags, limestone, the bed of the
 * brook and the pond in 'gr-bed', stones, logs); the ground under the bridges and along the stepping stones is kept,
 * as bare trodden earth ('gr-bed'). The benches and the plants are play's own assets, marked where they stand.
 */

const gr_mergeVertices = require('three/addons/utils/BufferGeometryUtils.js').mergeVertices;

/** the floor's edge (inside the knee wall) and its grid */
const gr_TR = R - 0.35;
const gr_STEP = 0.75;
/** the plaza: its flags, its kerb's top, the risers of the steps down from it and where the paths arrive below them */
const gr_PLAZA_Y = 0.12;
const gr_KERB_Y = 0.135;
const gr_RISE = 0.142;
const gr_ARRIVE_Y = gr_KERB_Y - 3 * gr_RISE;
/** the floor's level along the plaza's front (the kerb shows a hand's height of its face) */
const gr_FRONT_Y = -0.14;
/** the sun's bearing in the viewer (south-west): the sunny side of a tree; the shady side is opposite */
const gr_SUN = (218 * Math.PI) / 180;
const gr_SHADY = gr_SUN - Math.PI;
/** the clearing: the loop's middle and radius, and the paved circle in it (its height set when the build starts) */
const gr_LOOP = { x: 0, z: -8, r: 8.5 };
const gr_PAD = { x: 0.3, z: -8.3, r: 3.1, y: 0 };
/** the pond near the south door: its middle, half length and half width, its long axis' turn, its water, its depth */
const gr_POND = { x: -11.2, z: -29.8, a: 5.0, b: 3.0, th: 0.35, w: -0.42, depth: 0.6 };
/** the brook's water in the spring's basin */
const gr_SPRING_W = -0.32;
/** the brook's course: from under the kerb through its basin, round the clearing's east, under the south path, to the pond */
const gr_BROOK = [[0, 12.62], [0, 11.5], [0.5, 9.5], [2.0, 7.5], [4.0, 5.8], [5.2, 3.4], [7.6, 1.3], [11.2, 0.2], [14.2, -1.6], [15.6, -4.6], [15.2, -8.2], [16.0, -11.6], [14.6, -15.4], [11.4, -17.6], [8.0, -19.8], [4.6, -22.2], [0.8, -23.6], [-2.8, -24.8], [-5.4, -26.4]];
/**
 * The gravel paths (Samuel 2026-11-05: fewer and narrower), in the order they are laid (a path joins only one laid before it): `w` its width, its edging
 * (oak boards, or river cobbles on the loop and the spine), where it starts (a door, or on another path near a point),
 * the points it bends through, and where it ends (on another path, or the plaza's front at x, down its steps).
 */
const gr_PATHS = [
	{ id: 'loop', w: 1.5, edge: 'cobble', closed: true },
	{ id: 'south', w: 1.6, edge: 'board', from: { door: 'south' }, pts: [[-1.0, -33.5], [-1.4, -30.8], [-0.4, -27.8], [0.9, -25.2], [0.8, -22.4], [-0.3, -19.6]], to: { on: 'loop', near: [0, -16.6] } },
	{ id: 'spine', w: 1.5, edge: 'cobble', from: { on: 'loop', near: [-1.8, 0.4] }, pts: [[-3.1, 3.5]], to: { plaza: -7.6 } },
	{ id: 'west', w: 1.4, edge: 'board', from: { door: 'west' }, pts: [[-33.2, 1.5], [-29.0, 3.4]], to: { plaza: -25 } },
	{ id: 'east', w: 1.4, edge: 'board', from: { door: 'east' }, pts: [[33.6, -2.0], [28.6, -1.5], [23.6, -3.3], [19.2, -5.1], [16.0, -5.6], [12.4, -6.6]], to: { on: 'loop', near: [8.7, -7.2] } }
];
/** the stepping-stone paths: into the forest (one across the brook by a ford), to the pond's shore, and into the circle */
const gr_SIDE = [
	{ id: 'ford', from: { on: 'loop', near: [5.6, -14.6] }, pts: [[8.6, -14.8], [11.2, -15.7], [13.8, -17.3], [16.6, -19.1], [19.0, -21.6]] },
	{ id: 'pond', from: { on: 'south', near: [-1.2, -31.6] }, pts: [[-3.6, -32.6], [-5.6, -32.4]], to: 'pond' },
	{ id: 'padNorth', from: { on: 'loop', bearing: -0.5 }, to: 'pad' },
	{ id: 'padSouth', from: { on: 'loop', bearing: 3.5 }, to: 'pad' }
];
/** the top of the flagstone aprons inside the portals: the doorways' floor */
const gr_APRON_Y = 0;
/** half the width of the trodden strip a stepping-stone path's stones lie in */
const gr_SIDE_W = 0.34;
/** the pergola over the loop's north-east, its posts at these bearings from the loop's middle (degrees) */
const gr_PERGOLA = [15, 29, 43, 57, 71];
/** the benches round the paved circle (play's curved oak bench, a thing): the bearing of each one's middle (degrees) */
const gr_BENCHES = [30, 100, 160, 260];

/** the build's own state (set by groundPart): what is laid out, planted and to be built */
let gr_G = null;

/* ---- materials of the ground's own: the bed of the brook and the pond (the soil's pictures, darker and wet), the lilies ---- */

material('gr-bed', 2.5, () => {
	mat('soil');
	const s = SHARED.soil;
	return new THREE.MeshStandardMaterial({ color: '#c2b4a0', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 0.78 });
});
// the paths' edging: oak boards weathered dark in the damp of the forest floor (the timber's pictures), so the light
// gravel paths read crisply against the ground
material('gr-board', 1.2, () => {
	mat('timber');
	const s = SHARED.oak;
	return new THREE.MeshStandardMaterial({ color: '#6f675d', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});
// the flagstones of the plaza and the paved circle: the flags' pictures, a warmer honey limestone, weathered
material('gr-flag', 3, () => {
	mat('flag');
	const s = SHARED.flag;
	return new THREE.MeshStandardMaterial({ color: '#c9b79a', map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(1.25, 1.25), roughnessMap: s.roughnessMap, roughness: 1 });
});
// river stones of a darker, greyer kind among the kit's sandy ones (the stone's pictures, tinted)
material('gr-rock', 0.6, () => {
	mat('stone');
	const s = SHARED.stone;
	return new THREE.MeshStandardMaterial({ color: '#8f8a83', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});
material('gr-lily', 1, () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42, side: THREE.DoubleSide }));
material('gr-bloom', 1, () => new THREE.MeshStandardMaterial({ color: '#f6eef0', roughness: 0.6, emissive: '#3a3034', side: THREE.DoubleSide }));

/* ================================================================================================================
 * 5.1 FIELDS — the ground's relief, the lines things follow, and how high the floor is anywhere
 * ================================================================================================================ */

/** smooth noise along a line, 0 … 1 */
const gr_n1 = (s, seed) => vnoise(s + 50, 0.5, 65536, 1, seed);
/** the arc length at each point of a line */
function gr_arc(P) {
	const S = [0];
	for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
	return S;
}
/** the unit normal of a line at point i, to the right of the way it runs: [x, z] */
function gr_normal(P, i, closed = false) {
	const n = P.length;
	const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
	const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
	return [tz / l, -tx / l];
}
/** the index of a line's point at arc length s */
function gr_index(S, s) {
	let lo = 0, hi = S.length - 1;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (S[m] < s) lo = m;
		else hi = m;
	}
	return s - S[lo] < S[hi] - s ? lo : hi;
}
/** a list of numbers smoothed along a line: a box of ±k points, `passes` times (round, where the line is closed) */
function gr_smoothAlong(Y, closed, k = 9, passes = 3) {
	const n = Y.length;
	let A = Y.slice();
	for (let p = 0; p < passes; p++) {
		const B = new Array(n);
		for (let i = 0; i < n; i++) {
			let s = 0, c = 0;
			for (let j = -k; j <= k; j++) {
				let q = i + j;
				if (closed) q = (q + n) % n;
				else if (q < 0 || q >= n) continue;
				s += A[q];
				c++;
			}
			B[i] = s / c;
		}
		A = B;
	}
	return A;
}
/** how far a capsule (a segment with a radius: a log, a footing, a bridge) is from [x, z], to its axis */
function gr_capsule(c, x, z) {
	const dx = c.bx - c.ax, dz = c.bz - c.az, l2 = dx * dx + dz * dz;
	const t = l2 ? clamp(((x - c.ax) * dx + (z - c.az) * dz) / l2) : 0;
	return Math.hypot(x - c.ax - dx * t, z - c.az - dz * t);
}

/**
 * LINES — polylines (the brook, the paths, the stepping-stone paths) found near a point fast: each segment kept in the
 * squares of `cell` metres it crosses; a point asks its square and the eight round it, so a line within a cell is found.
 */
class gr_Lines {
	constructor(cell = 4) {
		this.cell = cell;
		this.grid = new Map();
		this.lines = [];
	}
	key(cx, cz) {
		return (cx + 4096) * 8192 + cz + 4096;
	}
	add(line) {
		const id = this.lines.push(line) - 1;
		const P = line.P, n = P.length, m = line.closed ? n : n - 1;
		// a coarse map of where any line is within 4 m: most of the garden asks no further
		this.coarse ??= new Set();
		for (let i = 0; i < m; i++) {
			const a = P[i], b = P[(i + 1) % n];
			for (let cx = Math.floor((Math.min(a[0], b[0]) - 4) / 4); cx <= Math.floor((Math.max(a[0], b[0]) + 4) / 4); cx++)
				for (let cz = Math.floor((Math.min(a[1], b[1]) - 4) / 4); cz <= Math.floor((Math.max(a[1], b[1]) + 4) / 4); cz++) this.coarse.add(this.key(cx, cz));
			const x0 = Math.floor(Math.min(a[0], b[0]) / this.cell), x1 = Math.floor(Math.max(a[0], b[0]) / this.cell);
			const z0 = Math.floor(Math.min(a[1], b[1]) / this.cell), z1 = Math.floor(Math.max(a[1], b[1]) / this.cell);
			for (let cx = x0; cx <= x1; cx++)
				for (let cz = z0; cz <= z1; cz++) {
					const k = this.key(cx, cz);
					let list = this.grid.get(k);
					if (!list) this.grid.set(k, (list = []));
					list.push(id, i);
				}
		}
		return line;
	}
	/**
	 * The nearest point of each line within `reach` of [x, z] (at least): { line, i (its segment), t (along it), d },
	 * the first `this.n` of the list returned (the list and its entries are reused by the next call: read them at once).
	 */
	near(x, z, reach = 2) {
		const c = this.cell, k = Math.ceil(reach / c);
		const cx = Math.floor(x / c), cz = Math.floor(z / c);
		const out = this.out ?? (this.out = []);
		let n = 0;
		if (!this.coarse.has(this.key(Math.floor(x / 4), Math.floor(z / 4)))) {
			this.n = 0;
			return out;
		}
		for (let a = -k; a <= k; a++)
			for (let b = -k; b <= k; b++) {
				const list = this.grid.get(this.key(cx + a, cz + b));
				if (!list) continue;
				for (let q = 0; q < list.length; q += 2) {
					const line = this.lines[list[q]], i = list[q + 1];
					const P = line.P, p = P[i], r = P[(i + 1) % P.length];
					const dx = r[0] - p[0], dz = r[1] - p[1];
					const t = clamp(((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz || 1e-9));
					const ex = x - p[0] - dx * t, ez = z - p[1] - dz * t;
					const d = Math.sqrt(ex * ex + ez * ez);
					let e = null;
					for (let m = 0; m < n; m++) if (out[m].line === line) e = out[m];
					if (!e) {
						e = out[n] ?? (out[n] = {});
						n++;
						(e.line = line), (e.i = i), (e.t = t), (e.d = d);
					} else if (d < e.d) (e.i = i), (e.t = t), (e.d = d);
				}
			}
		this.n = n;
		return out;
	}
}
/**
 * DISCS — capsules (a log, a footing, a stone, a bridge: a segment and a radius) found near a point fast: each kept in
 * every square of `cell` metres within `margin` of it, so a point asks only its own square.
 */
class gr_Discs {
	constructor(margin, cell = 2) {
		this.cell = cell;
		this.margin = margin;
		this.grid = new Map();
		this.all = [];
	}
	add(c) {
		this.all.push(c);
		const m = c.r + this.margin, s = this.cell;
		for (let cx = Math.floor((Math.min(c.ax, c.bx) - m) / s); cx <= Math.floor((Math.max(c.ax, c.bx) + m) / s); cx++)
			for (let cz = Math.floor((Math.min(c.az, c.bz) - m) / s); cz <= Math.floor((Math.max(c.az, c.bz) + m) / s); cz++) {
				const k = (cx + 4096) * 8192 + cz + 4096;
				if (!this.grid.has(k)) this.grid.set(k, []);
				this.grid.get(k).push(c);
			}
		return c;
	}
	/** those within the margin of [x, z] (and maybe a few more) */
	at(x, z) {
		return this.grid.get((Math.floor(x / this.cell) + 4096) * 8192 + Math.floor(z / this.cell) + 4096) ?? gr_NONE;
	}
	/** how far [x, z] is out of the nearest (99 when none is within the margin) */
	dist(x, z) {
		let d = 99;
		for (const c of this.at(x, z)) d = Math.min(d, gr_capsule(c, x, z) - c.r);
		return d;
	}
}
const gr_NONE = [];
/** a line's per-point value (A) where a near point found it */
const gr_val = (e, A) => {
	const n = A.length, j = (e.i + 1) % n;
	return A[e.i] + (A[j] - A[e.i]) * e.t;
};

/** the ground's own relief before anything is laid in it: soft mounds and swales (± 0.25 m) */
function gr_relief(x, z) {
	const a = vnoise(x / 12.5 + 300, z / 12.5 + 300, 8192, 8192, 501) - 0.5;
	const b = vnoise(x / 5.2 + 300, z / 5.2 + 300, 8192, 8192, 503) - 0.5;
	const c = vnoise(x / 26 + 300, z / 26 + 300, 8192, 8192, 507) - 0.5;
	return 0.5 * a + 0.14 * b + 0.42 * c;
}
/** how far [x, z] is in front of the plaza's edge (its kerb's face), in metres */
const gr_dPlaza = (x, z) => (edgeZ(0, x) - z) / Math.hypot(1, x / RHO);
/** the plaza's edge at x: where it is, along it (eastward) and out into the garden */
function gr_edgeFrame(x0) {
	const z = edgeZ(0, x0), l = Math.hypot(1, x0 / RHO);
	const t = [1 / l, -x0 / RHO / l];
	return { x: x0, z, t, n: [t[1], -t[0]] };
}
/** the relief, level at the shell's foot and stepping down to the plaza's front */
function gr_nat0(x, z) {
	let h = 0.25 * Math.tanh((gr_relief(x, z) - 0.02) / 0.25);
	h *= span(gr_TR - Math.hypot(x, z), 0.4, 5);
	return lerp(gr_FRONT_Y, h, span(gr_dPlaza(x, z), 0.6, 5));
}
/** … and level in the clearing */
function gr_nat(x, z) {
	const h = gr_nat0(x, z);
	const dc = Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z);
	return dc > 10.5 ? h : lerp(gr_PAD.y, h, span(dc, 4.5, 10.5));
}

/** the pond's outline: its radius at angle phi in its own frame (an ellipse, wavering) */
function gr_pondR(phi) {
	const { a, b } = gr_POND;
	const e = (a * b) / Math.hypot(b * Math.cos(phi), a * Math.sin(phi));
	return e * (1 + 0.1 * Math.sin(2 * phi + 1.1) + 0.06 * Math.sin(3 * phi + 0.3) + 0.035 * Math.sin(5 * phi + 2.2));
}
/** how far [x, z] is outside the pond's outline (negative inside), along its radius */
function gr_pondSD(x, z) {
	const dx = x - gr_POND.x, dz = z - gr_POND.z;
	const far = Math.sqrt(dx * dx + dz * dz) - 6.5;
	if (far > 3.5) return far;
	const c = Math.cos(gr_POND.th), s = Math.sin(gr_POND.th);
	const u = dx * c + dz * s, v = -dx * s + dz * c;
	return Math.hypot(u, v) - gr_pondR(Math.atan2(v, u));
}
/** the point of the pond's outline at angle phi, `out` metres outside it */
function gr_pondAt(phi, out = 0) {
	const r = gr_pondR(phi) + out, c = Math.cos(gr_POND.th), s = Math.sin(gr_POND.th);
	const u = r * Math.cos(phi), v = r * Math.sin(phi);
	return [gr_POND.x + u * c - v * s, gr_POND.z + u * s + v * c];
}

/** the brook near [x, z]: how far from its middle, its half width, water and depth there (or null) */
function gr_brookQ(x, z) {
	const e = gr_G.brookIdx.near(x, z, 4)[0];
	if (!gr_G.brookIdx.n) return null;
	const hw = gr_val(e, e.line.HW);
	if (e.d > hw + 3.4) return null;
	return { d: e.d, hw, w: gr_val(e, e.line.W), D: gr_val(e, e.line.D), s: gr_val(e, e.line.S) };
}
/** the gravel path near [x, z]: how far out of its edge (`e`) and its height (the lowest where several meet) */
function gr_pathQ(x, z) {
	let best = null, under = null;
	const idx = gr_G.pathIdx, list = idx.near(x, z, 3);
	for (let q = 0; q < idx.n; q++) {
		const o = list[q];
		const e = o.d - o.line.hw, y = gr_val(o, o.line.Y);
		if (e < 0.1 && (!under || y < under.y)) under = { e, y, line: o.line };
		if (!best || e < best.e) best = { e, y, line: o.line };
	}
	if (under) return under;
	return best && best.e < 1.6 ? best : null;
}

/**
 * THE FLOOR'S HEIGHT at [x, z]: the relief, sunk into a soft valley along the brook and round the pond (to their
 * banks' height), laid level to each path's height under and beside it (but for the bridges' banks), level round the
 * paved circle. (Asked tens of thousands of times: it makes nothing it need not.)
 */
function gr_hs(x, z) {
	const G = gr_G;
	let h = gr_nat(x, z);
	const bi = G.brookIdx, bl = bi.near(x, z, 4);
	let bd = 99;
	if (bi.n) {
		const e = bl[0];
		bd = e.d - gr_val(e, e.line.HW);
		if (bd < 3.2) h = lerp(gr_val(e, e.line.W) + 0.08, h, span(bd, 0.55, 3.2));
	}
	const sd = gr_pondSD(x, z);
	if (sd < 3.2) h = lerp(gr_POND.w + 0.08, h, span(sd, 0.4, 3.2));
	// the path: the one under it (the lowest, where two meet), else the nearest
	const pi = G.pathIdx, pl = pi.near(x, z, 3);
	let be = 99, by = 0, ue = 99, uy = Infinity;
	for (let q = 0; q < pi.n; q++) {
		const o = pl[q], e = o.d - o.line.hw, y = gr_val(o, o.line.Y);
		if (e < 0.1 && y < uy) (ue = e), (uy = y);
		if (e < be) (be = e), (by = y);
	}
	if (ue < 99) (be = ue), (by = uy);
	if (be < 1.6) h = lerp(h, by - 0.02, (1 - span(be, 0.1, 1.5)) * span(bd, 0.9, 2.1));
	const dp = Math.hypot(x - gr_PAD.x, z - gr_PAD.z) - gr_PAD.r;
	if (dp < 1.4) h = lerp(gr_PAD.y - 0.01, h, span(dp, 0.05, 1.4));
	return h;
}

/** the brook's bed and banks at [x, z] (Infinity outside them): carved below its water, rising to its bank; `q` the brook there */
function gr_brookSurf(q, x, z) {
	if (!q || q.d > q.hw + 0.7) return Infinity;
	const a = q.hw * 1.05;
	if (q.d < a) return q.w - q.D * (1 - (q.d / a) ** 2);
	if (q.d < q.hw + 0.4) return q.w + 0.08 * smooth((q.d - a) / (q.hw + 0.4 - a));
	return gr_hs(x, z);
}
/** the pond's bed and banks at [x, z] (Infinity outside them): a shelf, then deeper to its middle; `sd` how far out of it */
function gr_pondSurf(sd, x, z) {
	if (sd > 0.6) return Infinity;
	if (sd < 0) return gr_POND.w - gr_POND.depth * Math.pow(smooth(-sd / 1.7), 0.85);
	if (sd < 0.35) return gr_POND.w + 0.08 * smooth(sd / 0.35);
	return gr_hs(x, z);
}
/** the bed of the brook (or the pond, `mine`) at [x, z]: where the two meet the lower shows, the other just under it */
function gr_bedY(x, z, mine, q = gr_brookQ(x, z)) {
	const b = gr_brookSurf(q, x, z), p = gr_pondSurf(gr_pondSD(x, z), x, z);
	let y = mine === 'brook' ? (b <= p ? b : p - 0.015) : p < b ? p : b - 0.015;
	return Number.isFinite(y) ? y : gr_hs(x, z);
}

/**
 * THE CUT — a field over the garden, negative wherever the biome's cover must not grow (and which thing is there):
 * the paths (to inside their edging), the plaza (to inside its kerb), the steps, the brook's bed and banks, the pond,
 * the stepping stones, the logs, footings, bigger stones and the paved circle, the ground under the bridges. Every part
 * of it is a distance in metres (or less steep), so a cell far from zero is wholly one or the other. In two parts: the
 * long smooth lines (the paths, the brook), asked of their lines on the floor's grid and smooth enough between to be
 * read off it; the rest (small or sharp: the plaza's edge, the pond, the stones, the steps, the holes) asked exactly
 * wherever the floor is cut. Also kept: how far the nearest path's edge and the water's edge are (for the colour).
 */
function gr_fieldLines(x, z, o, reach = 2) {
	const G = gr_G;
	let f = 2.5, k = 2.5, path = 3, water = 3;
	const pi = G.pathIdx, pl = pi.near(x, z, reach);
	for (let q = 0; q < pi.n; q++) {
		const e = pl[q], L = e.line, d = e.d - L.hw;
		if (d < path) path = d;
		// over a bridge's banks the gravel stops: the cut ends there too, square (and continuous, for the grid)
		let g = d - L.cut;
		if (L.bridges) {
			const s = gr_val(e, L.S);
			for (const b of L.bridges) {
				const along = Math.min(s - L.S[b.i0], L.S[b.i1] - s);
				if (along > -2) g = Math.max(g, along);
			}
		}
		if (g < f) f = g;
	}
	const b = G.brookIdx.near(x, z, reach)[0];
	if (G.brookIdx.n) {
		water = Math.min(water, b.d - gr_val(b, b.line.HW));
		if (water - 0.55 < f) f = water - 0.55;
	}
	// the stepping-stone paths: a strip of trodden earth the stones lie in (kept, as bare earth)
	const si = G.sideIdx, sl = si.near(x, z, reach);
	for (let q = 0; q < si.n; q++) k = Math.min(k, sl[q].d - gr_SIDE_W);
	(o.fo = f), (o.fk = k), (o.path = path), (o.water = water);
	return o;
}
/**
 * The rest of the cut at [x, z], on top of the lines' part already in `o`: `fo` the part something else lies over
 * (gravel, flags, steps, the bed, a stone, a log), `fk` the part kept as bare earth (under the bridges, the stepping
 * stones' strips), `f` the two together; `small` how near the small things are (a finer grid there).
 */
function gr_fieldRest(x, z, o) {
	const G = gr_G;
	let f = Math.min(o.fo, gr_dPlaza(x, z) + 0.03), k = o.fk;
	const sd = gr_pondSD(x, z);
	if (sd < o.water) o.water = sd;
	f = Math.min(f, sd - 0.45);
	const big = Math.min(f, k);
	for (const A of G.lobes) {
		const dx = x - A.x, dz = z - A.z;
		const t = dx * A.t[0] + dz * A.t[1], on = dx * A.n[0] + dz * A.n[1];
		if (on < -0.3 || on > A.lobe[1] + 1 || Math.abs(t) > A.lobe[0] + 1) continue;
		const q = Math.pow(Math.abs(t) / A.lobe[0], 3) + Math.pow(Math.max(0, on) / A.lobe[1], 3);
		f = Math.min(f, (Math.cbrt(q) - 1) * A.lobe[1] + 0.03);
	}
	for (const h of G.holes.at(x, z)) {
		const g = gr_capsule(h, x, z) - h.r;
		if (h.cls === 'bridge') k = Math.min(k, g);
		else f = Math.min(f, g);
	}
	o.small = Math.min(f, k) < big ? Math.min(f, k) : 9;
	(o.fo = f), (o.fk = k), (o.f = Math.min(f, k));
	return o;
}
/** the whole cut at [x, z]: { f, fo, fk, path, water } */
const gr_field = (x, z) => gr_fieldRest(x, z, gr_fieldLines(x, z, {}));

/* ================================================================================================================
 * 5.2 LAYING OUT — the brook, the paths and their bridges, the stepping stones, what stands in the garden
 * ================================================================================================================ */

function gr_layBrook(G) {
	let P = smoothLine(gr_BROOK, 0.5);
	// on into the pond, well past its edge, so the brook's bed ends under the pond's
	const [lx, lz] = P[P.length - 1];
	const dx = gr_POND.x - lx, dz = gr_POND.z - lz, l = Math.hypot(dx, dz);
	for (let k = 1; k < 60; k++) {
		const q = [lx + (dx / l) * 0.5 * k, lz + (dz / l) * 0.5 * k];
		P.push(q);
		if (gr_pondSD(q[0], q[1]) < -2.4) break;
	}
	// a natural sway: a small sideways wander whose wavelength drifts (4 … 8 m), none at the spring or in the pond
	let S = gr_arc(P);
	let ph = 0.6;
	const N = P.map((p, i) => gr_normal(P, i));
	P = P.map((p, i) => {
		if (i) ph += (TAU * (S[i] - S[i - 1])) / (5 + 3.5 * gr_n1(S[i] / 9, 611));
		const amp = 0.2 * span(S[i], 3, 6) * span(gr_pondSD(p[0], p[1]), 1, 4) * (0.5 + gr_n1(S[i] / 6, 613));
		return [p[0] + N[i][0] * amp * Math.sin(ph), p[1] + N[i][1] * amp * Math.sin(ph)];
	});
	P = smoothLine(P, 0.25);
	S = gr_arc(P);
	const L = S[S.length - 1];
	let sPond = L;
	for (let i = 0; i < P.length; i++)
		if (gr_pondSD(P[i][0], P[i][1]) < 0) {
			sPond = S[i];
			break;
		}
	// 0.6 … 1.15 m of water, a wide basin at the spring, wider again where it runs into the pond
	const HW = S.map((s) => {
		let hw = 0.3 + 0.27 * gr_n1(s / 5.5, 617);
		hw = lerp(0.9, hw, span(s, 1.1, 3.4));
		return lerp(hw, 0.66, span(s, sPond - 4, sPond - 0.5));
	});
	const W = S.map((s) => lerp(gr_SPRING_W, gr_POND.w, clamp(s / sPond)));
	const D = HW.map((hw) => 0.17 + 0.28 * (hw - 0.3));
	G.brook = { id: 'brook', P, S, HW, W, D, L, sPond, closed: false };
	// found by every second point (half a metre apart: the curve between is off by millimetres)
	const half = (A) => A.filter((_, i) => i % 2 === 0 || i === A.length - 1);
	G.brookIdx = new gr_Lines(2);
	G.brookIdx.add({ id: 'brook', P: half(P), S: half(S), HW: half(HW), W: half(W), D: half(D), closed: false });
}

/** a point of a laid path: the nearest to `near`, or the loop's at a bearing from its middle */
function gr_onPath(G, o) {
	const L = G.paths[o.on];
	let best = 0, bd = Infinity;
	L.P.forEach(([x, z], i) => {
		const d = o.bearing !== undefined ? Math.abs(Math.atan2(Math.sin(Math.atan2(x - gr_LOOP.x, z - gr_LOOP.z) - o.bearing), Math.cos(Math.atan2(x - gr_LOOP.x, z - gr_LOOP.z) - o.bearing))) : Math.hypot(x - o.near[0], z - o.near[1]);
		if (d < bd) (bd = d), (best = i);
	});
	return { p: L.P[best].slice(), y: L.Y[best], i: best, line: L };
}

function gr_layPaths(G) {
	G.paths = {};
	G.pathList = [];
	G.pathIdx = new gr_Lines(2);
	G.arrivals = [];
	G.aprons = [];
	G.fillets = [];
	for (const spec of gr_PATHS) {
		const hw = spec.w / 2;
		const ctrl = [];
		let from = null, to = null;
		if (spec.closed)
			for (let k = 0; k < 12; k++) {
				const a = (k / 12) * TAU;
				const [x, z] = polar(gr_LOOP.r + 0.45 * Math.sin(2 * a + 0.7) + 0.3 * Math.sin(3 * a + 2.1), a);
				ctrl.push([gr_LOOP.x + x, gr_LOOP.z + z]);
			}
		if (spec.from?.door) {
			const d = DOORS.find((q) => q.id === spec.from.door);
			ctrl.push(polar(R - 0.2, d.a), polar(R - 2.6, d.a), polar(R - 4.4, d.a));
			// a flagstone apron inside the gate, a little wider than its threshold, rounding in to the path 2.5 m on
			const [x, z] = polar(R, d.a);
			const n = [-Math.sin(d.a), -Math.cos(d.a)];
			G.aprons.push({ x, z, n, t: [n[1], -n[0]], lobe: [Math.max(2.25, doorSize(d).foot / 2 + 0.25), 2.5], door: d.id });
		}
		if (spec.from?.on) ctrl.push((from = gr_onPath(G, spec.from)).p);
		ctrl.push(...(spec.pts ?? []));
		if (spec.to?.plaza !== undefined) {
			const f = gr_edgeFrame(spec.to.plaza);
			for (const o of [4.4, 1.7, 0.72]) ctrl.push([f.x + f.n[0] * o, f.z + f.n[1] * o]);
			// two step slabs below the kerb, each a rounded lobe, the lower one the wider and deeper
			G.arrivals.push({ ...f, hw, path: spec.id, lobe: [hw + 1.15, 0.98] });
		}
		if (spec.to?.on) ctrl.push((to = gr_onPath(G, spec.to)).p);
		const P = smoothLine(ctrl, 0.35, !!spec.closed);
		if (spec.closed) P.pop();
		const S = gr_arc(P), L = S[S.length - 1];
		// level along it: the relief smoothed over ±3 m, down to each door's sill, the steps' foot, a joined path
		const C = P.map(() => 1);
		const Y = gr_smoothAlong(P.map(([x, z]) => gr_nat(x, z)), !!spec.closed).map((y, i) => {
			const s = S[i], e = L - s;
			if (spec.from?.door) y = lerp(gr_APRON_Y - 0.045, y, span(s, 2.6, 7));
			if (from) {
				y = lerp(from.y - 0.022, y, span(s, 0.4, 3.6));
				C[i] *= span(s, 1.4, 3.2);
			}
			if (spec.to?.plaza !== undefined) y = lerp(gr_ARRIVE_Y, y, span(e, 0.6, 5));
			if (to) {
				y = lerp(to.y - 0.022, y, span(e, 0.4, 3.6));
				C[i] *= span(e, 1.4, 3.2);
			}
			return y;
		});
		const line = { id: spec.id, P, S, Y, C, hw, edge: spec.edge, closed: !!spec.closed, cut: spec.edge === 'cobble' ? 0.11 : 0.022, skip: new Uint8Array(P.length) };
		// where it joins another, a rounded fillet of gravel fills the corners between them; and where it bends
		// tighter than its width allows, one fills the inside of the bend
		for (const j of [from, to]) if (j) G.fillets.push({ x: j.p[0], z: j.p[1], y: j.y - 0.004, r: j.line.hw + 0.6 });
		for (let i = 2; i < P.length - 2; i++) {
			const a = Math.atan2(P[i][0] - P[i - 2][0], P[i][1] - P[i - 2][1]), b = Math.atan2(P[i + 2][0] - P[i][0], P[i + 2][1] - P[i][1]);
			const turn = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
			const radius = (S[i + 2] - S[i - 2]) / 2 / Math.max(1e-6, turn);
			if (radius < hw + 0.9 && !G.fillets.some((f) => Math.hypot(f.x - P[i][0], f.z - P[i][1]) < 0.7)) G.fillets.push({ x: P[i][0], z: P[i][1], y: Y[i] - 0.004, r: hw + 0.35 });
		}
		G.paths[spec.id] = line;
		G.pathList.push(line);
		G.pathIdx.add(line);
	}
	// a bridge wherever a path crosses the brook: the gravel stops at its banks, the bridge spans between
	G.bridges = [];
	for (const line of G.pathList) {
		const n = line.P.length;
		const zone = line.P.map(([x, z]) => {
			const q = gr_brookQ(x, z);
			return !!q && q.d - q.hw < 1.45;
		});
		for (let i = 0; i < n; i++) {
			if (!zone[i]) continue;
			let j = i;
			while (j + 1 < n && zone[j + 1]) j++;
			let wet = false;
			for (let k = i; k <= j; k++) {
				const q = gr_brookQ(line.P[k][0], line.P[k][1]);
				if (q && q.d < q.hw) wet = true;
			}
			if (wet && i > 0 && j < n - 1) {
				const b = { line, i0: i, i1: j };
				G.bridges.push(b);
				(line.bridges ??= []).push(b);
				for (let k = i; k < j; k++) line.skip[k] = 1;
			}
			i = j;
		}
	}
}

function gr_laySide(G) {
	G.sideIdx = new gr_Lines(2);
	G.stones = [];
	for (const spec of gr_SIDE) {
		const start = gr_onPath(G, spec.from);
		const ctrl = [start.p, ...(spec.pts ?? [])];
		if (spec.to === 'pad') {
			const a = Math.atan2(start.p[0] - gr_PAD.x, start.p[1] - gr_PAD.z);
			for (const [r, da] of [[5.8, 0.08], [gr_PAD.r + 0.35, 0.02]]) {
				const [x, z] = polar(r, a + da);
				ctrl.push([gr_PAD.x + x, gr_PAD.z + z]);
			}
		}
		if (spec.to === 'pond') {
			const [lx, lz] = ctrl[ctrl.length - 1];
			let bp = 0, bd = Infinity;
			for (let k = 0; k < 180; k++) {
				const q = gr_pondAt((k / 180) * TAU);
				const d = Math.hypot(q[0] - lx, q[1] - lz);
				if (d < bd) (bd = d), (bp = (k / 180) * TAU);
			}
			ctrl.push(gr_pondAt(bp, 0.25));
		}
		const P = smoothLine(ctrl, 0.2);
		const S = gr_arc(P), L = S[S.length - 1];
		G.sideIdx.add({ id: spec.id, P, S, closed: false });
		// a stone every 0.6 m or so, a little left and right of the line, its long side across the way
		const r = chance('gr-side', spec.id);
		let s = 0.3, k = 0;
		while (s < L - 0.05) {
			const i = gr_index(S, s);
			const [nx, nz] = gr_normal(P, i);
			const off = (k % 2 ? 1 : -1) * between(r, 0.03, 0.1);
			const x = P[i][0] + nx * off, z = P[i][1] + nz * off;
			const q = gr_brookQ(x, z);
			const ford = !!q && q.d < q.hw + 0.15;
			const pq = gr_pathQ(x, z);
			const last = spec.to === 'pond' && s > L - 0.6;
			if ((pq && pq.e < 0.42) || (gr_pondSD(x, z) < 0.3 && !last) || Math.hypot(x - gr_PAD.x, z - gr_PAD.z) < gr_PAD.r + 0.3) {
				s += 0.15;
				continue;
			}
			const a = last ? 0.44 : ford ? between(r, 0.27, 0.32) : between(r, 0.22, 0.29);
			const b = last ? 0.34 : ford ? between(r, 0.22, 0.26) : between(r, 0.17, 0.22);
			const st = { x, z, a, b, ry: Math.atan2(-nz, nx) + between(r, -0.25, 0.25), ford, w: ford ? q.w : 0, k: Math.floor(r() * 6), ax: x, az: z, bx: x, bz: z, r: a };
			G.stones.push(st);
			s += ford ? 0.56 : between(r, 0.58, 0.68);
			k++;
		}
	}
}

/** the things that stand: the pergola's posts, the steps, the paved circle, the bridges; their keep-clear and cut-out shapes */
function gr_planStructures(G) {
	G.struct = new gr_Discs(3);
	G.holes = new gr_Discs(0.6);
	const disc = (list, x, z, r, cls) => list.add({ ax: x, az: z, bx: x, bz: z, r, cls });
	// the pergola: a post each side of the loop at each bearing, the outer ones with a passion fruit each
	const loop = G.paths.loop;
	G.pergola = gr_PERGOLA.map((deg) => {
		const i = gr_onPath(G, { on: 'loop', bearing: (deg * Math.PI) / 180 }).i;
		const [x, z] = loop.P[i];
		let [nx, nz] = gr_normal(loop.P, i, true);
		if (nx * (x - gr_LOOP.x) + nz * (z - gr_LOOP.z) < 0) (nx = -nx), (nz = -nz);
		const o = loop.hw + 0.32;
		const post = (s) => ({ x: x + nx * o * s, z: z + nz * o * s });
		const p = { i, out: [nx, nz], inner: post(-1), outer: post(1), y: loop.Y[i] };
		for (const q of [p.inner, p.outer]) {
			disc(G.struct, q.x, q.z, 0.25);
			disc(G.holes, q.x, q.z, 0.11, 'footing');
		}
		return p;
	});
	// the steps down from the plaza
	for (const A of G.arrivals) disc(G.struct, A.x + A.n[0] * 0.5, A.z + A.n[1] * 0.5, A.hw + 1.3);
	// each gate seen from inside: its apron, and nothing planted in a view 5 m wide and 7 m deep (cleared after planting)
	G.views = G.aprons.map((A) => ({ ax: A.x + A.n[0] * 1, az: A.z + A.n[1] * 1, bx: A.x + A.n[0] * 7, bz: A.z + A.n[1] * 7, r: 2.5 }));
	G.lobes = [...G.arrivals, ...G.aprons];
	// the fillets where paths join
	for (const f of G.fillets) disc(G.holes, f.x, f.z, f.r - 0.03, 'fillet');
	// the paved circle
	disc(G.struct, gr_PAD.x, gr_PAD.z, gr_PAD.r + 0.15);
	disc(G.holes, gr_PAD.x, gr_PAD.z, gr_PAD.r - 0.04, 'pad');
	// the bridges: from where the gravel stops to where it starts again, the ground under them bare
	for (const b of G.bridges) {
		const A = b.line.P[b.i0], B = b.line.P[b.i1];
		const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L;
		Object.assign(b, { A, B, L, u: [ux, uz], v: [uz, -ux], yA: b.line.Y[b.i0], yB: b.line.Y[b.i1] });
		G.struct.add({ ax: A[0] - ux * 0.4, az: A[1] - uz * 0.4, bx: B[0] + ux * 0.4, bz: B[1] + uz * 0.4, r: 1.3 });
		b.hole = G.holes.add({ ax: A[0] - ux * 0.12, az: A[1] - uz * 0.12, bx: B[0] + ux * 0.12, bz: B[1] + uz * 0.12, r: 0.95, cls: 'bridge' });
	}
	// the stepping stones keep the small plants a hand's breadth off
	for (const s of G.stones) disc(G.struct, s.x, s.z, s.a + 0.05);
}

/* ================================================================================================================
 * 5.3 THE FOREST — play's plants marked where they stand, layer by layer, in guilds round the trees
 * ================================================================================================================ */

const gr_RANK = { canopy: 0, low: 1, shrub: 2, climber: 2, herb: 3, ground: 4, fungi: 4 };
/** how much of its grown size a plant has at a stage */
const gr_grown = (stage) => (stage >= 9 ? 1 : stage >= 8 ? 0.92 : stage >= 7 ? 0.85 : stage >= 6 ? 0.72 : stage >= 4 ? 0.45 : 0.3);
/** how close two plants may stand (their crowns' widths `w` as grown): trees apart, the small ones in the gaps */
function gr_need(a, b) {
	if (a.layer === b.layer) {
		if (a.clump && a.clump === b.clump) return 1.25;
		switch (a.layer) {
			case 'canopy':
				// a palm's crown is high over the others': it may stand nearer them
				if (a.stage <= 4 || b.stage <= 4) return 0.42 * (a.w + b.w);
				return clamp((a.kind === 'king-coconut' || b.kind === 'king-coconut' ? 0.36 : 0.45) * (a.w + b.w), 5.5, 8);
			case 'low':
				return 0.3 * (a.w + b.w);
			case 'climber':
				return 2.4;
			case 'fungi':
				return 0.3;
			default:
				return 0.33 * (a.w + b.w);
		}
	}
	const [big, small] = gr_RANK[a.layer] <= gr_RANK[b.layer] ? [a, b] : [b, a];
	switch (big.layer) {
		case 'canopy':
			return small.layer === 'low' ? Math.max(1.5, 0.15 * big.w + 0.2 * small.w) : 0.55 + 0.15 * small.w;
		case 'low':
			return small.layer === 'shrub' || small.layer === 'climber' ? Math.max(0.8, 0.16 * big.w + 0.28 * small.w) : 0.35 + 0.2 * small.w;
		case 'shrub':
		case 'climber':
			return 0.24 * big.w + 0.24 * small.w;
		case 'herb':
			return 0.32 * (big.w + small.w);
		default:
			return 0.25;
	}
}
/** whether a plant of `h` and crown `w` fits under the shell at radius r: its top 1.5 m under it, its crown clear */
function gr_underShell(r, h, w) {
	if (r >= R - 1) return false;
	if (Math.sqrt(R * R - r * r) <= h + 1.5) return false;
	for (const y of [h - 0.55 * w, h - 0.25 * w, h]) if (y > 0 && r + w / 2 > shellR(y) - 0.6) return false;
	return true;
}
/** how far [x, z] is from what a plant keeps clear of: the paths' edges, the water's, the plaza, the stones, the things */
function gr_clear(G, x, z) {
	let path = 99, water = 99, stone = 99;
	const pl = G.pathIdx.near(x, z, 4);
	for (let q = 0; q < G.pathIdx.n; q++) path = Math.min(path, pl[q].d - pl[q].line.hw);
	const b = G.brookIdx.near(x, z, 4)[0];
	if (G.brookIdx.n) water = b.d - gr_val(b, b.line.HW);
	water = Math.min(water, gr_pondSD(x, z));
	const sl = G.sideIdx.near(x, z, 2);
	for (let q = 0; q < G.sideIdx.n; q++) stone = Math.min(stone, sl[q].d - gr_SIDE_W);
	return { path, water, stone, struct: G.struct.dist(x, z), plaza: gr_dPlaza(x, z) };
}
/** the plants already placed near [x, z] (within ~9 m) */
function gr_nearPlants(G, x, z) {
	const out = [];
	const cx = Math.floor(x / 3), cz = Math.floor(z / 3);
	for (let a = -3; a <= 3; a++)
		for (let b = -3; b <= 3; b++) {
			const l = G.ph.get(`${cx + a},${cz + b}`);
			if (l) out.push(...l);
		}
	return out;
}
/** whether a plant of `kind` may stand at [x, z] at this stage and scale */
function gr_ok(G, kind, x, z, stage, scale, o = {}) {
	const p = PLANTS[kind], layer = p.layer;
	if (G.plants.length >= 3400) return false;
	if (!inGarden(x, z)) return false;
	if (!gr_underShell(Math.hypot(x, z), p.h * scale, p.w * scale)) return false;
	const w = p.w * gr_grown(stage) * scale, cr = w / 2;
	const tree = layer === 'canopy' || layer === 'low';
	const D = gr_clear(G, x, z);
	if (D.path < (tree ? Math.max(0.9, 0.6 * cr) : layer === 'shrub' ? 0.3 + 0.3 * cr : 0.3)) return false;
	if (D.water < (tree ? Math.max(0.6, 0.6 * cr) : o.wet ?? 0.3)) return false;
	if (D.plaza < (tree ? Math.max(3, 0.6 * cr) : 0.3)) return false;
	if (D.stone < (tree ? Math.max(1, 0.4 * cr) : 0.12)) return false;
	if (D.struct < (tree ? Math.max(0.8, 0.45 * cr) : layer === 'shrub' ? 0.3 : layer === 'fungi' ? -0.14 : 0.08)) return false;
	// inside the loop only the clearing's low plants
	if ((tree || layer === 'shrub') && Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z) < 8.2) return false;
	const me = { layer, w, stage, clump: o.clump, kind };
	if (layer === 'canopy') for (const t of G.canopy) if (Math.hypot(t.x - x, t.z - z) < gr_need(me, t)) return false;
	for (const q of gr_nearPlants(G, x, z)) {
		if (layer === 'canopy' && q.layer === 'canopy') continue;
		if (Math.hypot(q.x - x, q.z - z) < gr_need(me, q)) return false;
	}
	return true;
}
/** a plant marked: the dome's node on the floor's height, and kept here for what comes after */
function gr_put(G, kind, x, z, o = {}) {
	const p = PLANTS[kind];
	const r = G.r;
	const tree = p.layer === 'canopy' || p.layer === 'low';
	const stage = o.stage ?? 9;
	const scale = o.scale ?? between(r, 0.9, 1.1);
	const seed = o.seed ?? (tree ? 'abc' : 'ab')[Math.floor(r() * (tree ? 3 : 2))];
	const y = (o.y ?? gr_hs(x, z)) - (tree ? 0.02 : 0.01);
	G.dome.plant(kind, x, y, z, { stage, seed, turn: o.turn ?? r() * TAU, scale });
	const q = { kind, layer: p.layer, x, z, stage, w: p.w * gr_grown(stage) * scale, clump: o.clump };
	G.plants.push(q);
	if (p.layer === 'canopy') G.canopy.push(q);
	const key = `${Math.floor(x / 3)},${Math.floor(z / 3)}`;
	if (!G.ph.has(key)) G.ph.set(key, []);
	G.ph.get(key).push(q);
	G.count[kind] = (G.count[kind] ?? 0) + 1;
	G.layers[p.layer] = (G.layers[p.layer] ?? 0) + 1;
	return q;
}
/** a plant tried round [cx, cz]: `d0` … `d1` away, toward `bearing` ± `spread`; placed at the first place that fits */
function gr_around(G, kind, cx, cz, d0, d1, bearing, spread, o = {}, tries = 14) {
	const r = G.r;
	for (let k = 0; k < tries; k++) {
		const [dx, dz] = polar(between(r, d0, d1), bearing + (r() - 0.5) * 2 * spread);
		const stage = o.stage ?? 9, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, cx + dx, cz + dz, stage, scale, o)) return gr_put(G, kind, cx + dx, cz + dz, { ...o, stage, scale });
	}
	return null;
}
const gr_pick = (r, weights) => {
	const keys = Object.keys(weights);
	let sum = 0;
	for (const k of keys) sum += weights[k];
	let u = r() * sum;
	for (const k of keys) if ((u -= weights[k]) <= 0) return k;
	return keys[keys.length - 1];
};
/** the shade over [x, z]: 0 in the open, 1 deep under the crowns (looked up on a grid of a metre) */
function gr_shadeAt(G, x, z) {
	const S = G.shade;
	if (!S) return 0;
	const i = clamp(Math.round(x + 41), 0, 82), j = clamp(Math.round(z + 41), 0, 82);
	return S[j * 83 + i];
}
function gr_shadeGrid(G) {
	const S = new Float32Array(83 * 83);
	for (const t of G.plants) {
		if (t.layer !== 'canopy' && t.layer !== 'low') continue;
		const cr = t.w / 2 + 0.6, k = t.layer === 'canopy' ? (t.kind === 'king-coconut' ? 0.55 : 0.9) : 0.45;
		for (let j = Math.floor(t.z - cr); j <= Math.ceil(t.z + cr); j++)
			for (let i = Math.floor(t.x - cr); i <= Math.ceil(t.x + cr); i++) {
				const ii = i + 41, jj = j + 41;
				if (ii < 0 || jj < 0 || ii > 82 || jj > 82) continue;
				const v = k * smooth(1 - Math.hypot(i - t.x, j - t.z) / cr);
				S[jj * 83 + ii] = 1 - (1 - S[jj * 83 + ii]) * (1 - v);
			}
	}
	G.shade = S;
}

/** the canopy (Samuel 2026-11-05: way denser): trees 5.5–8 m apart, king coconuts where the dome is tallest, no two alike side by side */
function gr_plantCanopy(G) {
	const r = chance('forest-dome', 'canopy');
	const base = { mango: 1.25, jackfruit: 1, durian: 0.9, avocado: 1.1, sapodilla: 0.9 };
	const want = { 'king-coconut': 9, mango: 14, jackfruit: 10, durian: 8, avocado: 12, sapodilla: 8 };
	// candidates on a loose hexagonal lattice (a forest planted, then grown wild), then thrown into the gaps
	const cand = [];
	const sp = 6.8, rot = r() * Math.PI, ox = r() * sp, oz = r() * sp;
	for (let j = -8; j <= 8; j++)
		for (let i = -8; i <= 8; i++) {
			const u = (i + (j % 2) * 0.5) * sp + ox, v = j * sp * 0.866 + oz;
			const x = u * Math.cos(rot) - v * Math.sin(rot), z = u * Math.sin(rot) + v * Math.cos(rot);
			for (let t = 0; t < 4; t++) cand.push([x + (r() - 0.5) * 3.2, z + (r() - 0.5) * 3.2]);
		}
	for (let k = 0; k < 1600; k++) cand.push([between(r, -38.5, 38.5), between(r, -38.5, 11)]);
	// the king coconuts first, where the dome is tallest, in a loose group or two
	for (let k = 0; k < 600 && (G.count['king-coconut'] ?? 0) < want['king-coconut']; k++) {
		const [x, z] = polar(Math.sqrt(r()) * 24, r() * TAU);
		const stage = r() < 0.7 ? 9 : 8, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, 'king-coconut', x, z, stage, scale)) gr_put(G, 'king-coconut', x, z, { stage, scale });
	}
	for (const [x, z] of cand) {
		if (G.canopy.length >= 75) break;
		if (!inGarden(x, z)) continue;
		let nb = null, nd = 9;
		for (const t of G.canopy) {
			const d = Math.hypot(t.x - x, t.z - z);
			if (d < nd) (nd = d), (nb = t);
		}
		const weights = { ...base };
		for (const kind of Object.keys(weights)) {
			if ((G.count[kind] ?? 0) >= want[kind]) weights[kind] *= 0.12;
			if (nb && nb.kind === kind) weights[kind] *= 0.2;
		}
		const u = r();
		const stage = u < 0.55 ? 9 : u < 0.82 ? 8 : 6;
		const scale = between(r, 0.9, 1.1);
		// the kinds in the order chance picks them, the first that fits
		for (let t = 0; t < 3; t++) {
			const kind = gr_pick(r, weights);
			if (gr_ok(G, kind, x, z, stage, scale)) {
				gr_put(G, kind, x, z, { stage, scale, seed: 'abc'[Math.floor(r() * 3)] });
				break;
			}
			weights[kind] = 0;
		}
	}
	// a few young ones coming up in the gaps (succession)
	for (let k = 0, n = 0; k < 6000 && n < 10; k++) {
		const x = between(r, -36, 36), z = between(r, -36, 9);
		const kind = gr_pick(r, base);
		if (gr_ok(G, kind, x, z, 4, 1)) gr_put(G, kind, x, z, { stage: 4, scale: between(r, 0.92, 1.08) }), n++;
	}
}

/** each canopy tree's guild: cacao in its shade, a citrus or another low tree on its sunny side, coffee at its crown's
 *  edge, pepper up its trunk, comfrey round it and ginger in its shade */
function gr_plantGuilds(G) {
	const r = G.r;
	const sunny = { orange: 1, lemon: 1, soursop: 0.8, fig: 0.7, pomegranate: 0.7, papaya: 0.5 };
	for (const T of G.canopy.slice()) {
		if (T.stage <= 4) continue;
		const Rc = T.w / 2;
		const palm = T.kind === 'king-coconut';
		if (!palm && r() < 0.7) gr_around(G, 'cacao', T.x, T.z, 0.55 * Rc + 1.5, 0.9 * Rc + 1.8, gr_SHADY, 1.3, { stage: r() < 0.5 ? 8 : 6 });
		gr_around(G, gr_pick(r, sunny), T.x, T.z, 0.85 * Rc + 0.4, 1.25 * Rc + 0.8, gr_SUN, 1.0, { stage: r() < 0.6 ? 9 : 8 });
		if (r() < 0.4) gr_around(G, gr_pick(r, sunny), T.x, T.z, 0.9 * Rc, 1.3 * Rc + 1, gr_SUN + 1.4 * (r() < 0.5 ? 1 : -1), 0.6, { stage: r() < 0.5 ? 8 : 6 });
		const nc = palm ? 2 : 3 + Math.floor(r() * 4);
		for (let k = 0; k < nc; k++) gr_around(G, 'coffee', T.x, T.z, 0.5 * Rc, 0.95 * Rc, gr_SHADY, 1.9, { stage: r() < 0.7 ? 9 : 7 });
		if (!palm && r() < 0.42) gr_around(G, 'pepper', T.x, T.z, 0.75, 1.0, r() * TAU, Math.PI, { stage: 9 });
		const nf = 3 + Math.floor(r() * 4);
		for (let k = 0; k < nf; k++) gr_around(G, 'comfrey', T.x, T.z, 1.3, 2.6, r() * TAU, Math.PI, { stage: r() < 0.7 ? 9 : 7 });
		if (!palm && r() < 0.6) {
			const [dx, dz] = polar(between(r, 0.45, 0.85) * Rc, gr_SHADY + (r() - 0.5) * 2.4);
			gr_cluster(G, 'ginger', T.x + dx, T.z + dz, 4 + Math.floor(r() * 4), 0.5, 1.1);
		}
	}
}
/** a group of one small plant round [cx, cz]: n of them, `gap` apart, within `rad` */
function gr_cluster(G, kind, cx, cz, n, gap, rad, o = {}) {
	const r = G.r;
	let placed = 0;
	for (let k = 0; k < n * 6 && placed < n; k++) {
		const [dx, dz] = polar(Math.sqrt(r()) * rad, r() * TAU);
		const stage = o.stage ?? (r() < 0.75 ? 9 : 7);
		const scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, cx + dx, cz + dz, stage, scale, o)) gr_put(G, kind, cx + dx, cz + dz, { ...o, stage, scale }), placed++;
	}
	return placed;
}

/** bananas in clumps by the water and in the sun; papayas in the sun; more low trees in the gaps; coffee in the shade */
function gr_plantBananas(G) {
	const r = G.r;
	const B = G.brook;
	let clump = 0;
	// clumps along the brook, alternately on either bank
	for (let s = 4 + r() * 3, side = 1; s < B.sPond - 2; s += between(r, 4.5, 7.5), side = -side) {
		for (let t = 0; t < 6; t++) {
			const i = gr_index(B.S, s + (r() - 0.5) * 2);
			const [nx, nz] = gr_normal(B.P, i);
			const o = B.HW[i] + between(r, 1.5, 2.8);
			const sd = t % 2 ? -side : side;
			const cx = B.P[i][0] + nx * o * sd, cz = B.P[i][1] + nz * o * sd;
			if (gr_shadeAt(G, cx, cz) > 0.6) continue;
			if (gr_bananaClump(G, cx, cz, clump + 1)) {
				clump++;
				break;
			}
		}
	}
	// and two by the pond
	for (const phi of [1.9, 3.6]) {
		const [cx, cz] = gr_pondAt(phi, 2.3);
		gr_bananaClump(G, cx, cz, ++clump);
	}
}
function gr_plantLow(G) {
	const r = G.r;
	// papayas: in the sun along the paths
	for (let k = 0, n = 0; k < 3000 && n < 18; k++) {
		const L = G.pathList[Math.floor(r() * G.pathList.length)];
		const i = Math.floor(r() * L.P.length);
		const [nx, nz] = gr_normal(L.P, i, L.closed);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + between(r, 1.4, 2.4);
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		if (gr_shadeAt(G, x, z) > 0.3) continue;
		const stage = r() < 0.6 ? 9 : 7, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, 'papaya', x, z, stage, scale)) gr_put(G, 'papaya', x, z, { stage, scale }), n++;
	}
	// more low trees in the gaps, the sun-loving ones where it is open, cacao where it is shaded
	for (let k = 0; k < 30000 && (G.layers.low ?? 0) < 260; k++) {
		const x = between(r, -38, 38), z = between(r, -38, 10);
		const sh = gr_shadeAt(G, x, z);
		const kind = sh > 0.5 ? 'cacao' : gr_pick(r, { orange: 1, lemon: 0.9, fig: 0.8, pomegranate: 0.8, soursop: 0.7, papaya: 0.4 });
		const u = r();
		const stage = u < 0.5 ? 9 : u < 0.8 ? 8 : u < 0.93 ? 6 : 4;
		const scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, x, z, stage, scale)) gr_put(G, kind, x, z, { stage, scale });
	}
	// coffee filling the shade
	for (let k = 0; k < 30000 && (G.layers.shrub ?? 0) < 380; k++) {
		const x = between(r, -38, 38), z = between(r, -38, 10);
		if (gr_shadeAt(G, x, z) < 0.2) continue;
		const kind = r() < 0.86 ? 'coffee' : 'pepper';
		const stage = r() < 0.7 ? 9 : 7, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, x, z, stage, scale)) gr_put(G, kind, x, z, { stage, scale });
	}
}
/** a banana mat: a bearing plant and its suckers round it (or the red banana's), 1.2–1.7 m apart */
function gr_bananaClump(G, cx, cz, clump) {
	const r = G.r;
	const kind = r() < 0.35 ? 'red-banana' : 'banana';
	const n = 2 + Math.floor(r() * 3);
	const stages = [9, 8, 6, 4];
	let first = null;
	for (let k = 0, placed = 0; k < 24 && placed < n; k++) {
		const [dx, dz] = placed ? polar(between(r, 1.2, 1.7), r() * TAU) : [0, 0];
		const x = (first?.x ?? cx) + dx, z = (first?.z ?? cz) + dz;
		const stage = stages[placed], scale = between(r, 0.9, 1.1);
		if (!gr_ok(G, kind, x, z, stage, scale, { clump })) {
			if (!placed) return false;
			continue;
		}
		const q = gr_put(G, kind, x, z, { stage, scale, clump });
		if (!placed) first = q;
		placed++;
	}
	return true;
}

/** the herbs and the ground along the paths: basil and pineapple at their sunny edges, drifts of strawberry and
 *  nasturtium (and a little clover) along them, the clearing's meadow, comfrey and ginger to fill the shade */
function gr_plantEdges(G) {
	const r = G.r;
	for (const L of G.pathList) {
		const n = L.P.length;
		for (let i = 2; i < n - 2; i += 3 + Math.floor(r() * 3)) {
			if (L.skip[i]) continue;
			const [nx, nz] = gr_normal(L.P, i, L.closed);
			const [x0, z0] = L.P[i];
			for (const sd of [1, -1]) {
				const ox = x0 + nx * sd * (L.hw + 0.8), oz = z0 + nz * sd * (L.hw + 0.8);
				const sh = gr_shadeAt(G, ox, oz);
				const u = r();
				const tx = -nz, tz = nx;
				if (sh < 0.3 && u < 0.32) {
					// basil in a row along the edge
					const m = 3 + Math.floor(r() * 4);
					for (let k = 0; k < m; k++) {
						const a = (k - m / 2) * 0.45, o = L.hw + 0.42 + (k % 2) * 0.12;
						gr_try(G, 'basil', x0 + tx * a + nx * sd * o, z0 + tz * a + nz * sd * o);
					}
				} else if (sh < 0.3 && u < 0.55) {
					// pineapples, zigzag
					const m = 2 + Math.floor(r() * 4);
					for (let k = 0; k < m; k++) {
						const a = (k - m / 2) * 0.9, o = L.hw + 0.7 + (k % 2) * 0.45;
						gr_try(G, 'pineapple', x0 + tx * a + nx * sd * o, z0 + tz * a + nz * sd * o);
					}
				} else if (u < 0.88) {
					const kind = sh < 0.4 ? (r() < 0.55 ? 'nasturtium' : 'strawberry') : r() < 0.85 ? 'strawberry' : 'clover';
					gr_drift(G, kind, ox + tx * between(r, -1, 1), oz + tz * between(r, -1, 1), 3 + Math.floor(r() * 5), 0.85);
				}
			}
		}
	}
	// the clearing's meadow round the paved circle
	for (let k = 0; k < 9; k++) {
		const [dx, dz] = polar(between(r, 4, 6.4), (k / 9) * TAU + r() * 0.5);
		const kind = k % 3 === 0 ? 'clover' : k % 3 === 1 ? 'strawberry' : 'nasturtium';
		gr_drift(G, kind, gr_LOOP.x + dx, gr_LOOP.z + dz, 5 + Math.floor(r() * 4), 0.9);
	}
	for (let k = 0; k < 3; k++) {
		const [dx, dz] = polar(between(r, 4.5, 6.2), r() * TAU);
		gr_cluster(G, 'pineapple', gr_LOOP.x + dx, gr_LOOP.z + dz, 3, 0.9, 1.0);
	}
	// herbs under the low trees and in the shade, until there are enough
	const lows = G.plants.filter((p) => p.layer === 'low');
	for (let k = 0; k < 4000 && (G.layers.herb ?? 0) < 900; k++) {
		const T = lows[Math.floor(r() * lows.length)];
		const sh = gr_shadeAt(G, T.x, T.z);
		const kind = sh > 0.45 ? (r() < 0.6 ? 'ginger' : 'comfrey') : r() < 0.5 ? 'comfrey' : 'ginger';
		const [dx, dz] = polar(between(r, 0.9, 1.8), r() * TAU);
		gr_cluster(G, kind, T.x + dx, T.z + dz, 2 + Math.floor(r() * 3), 0.5, 0.8);
	}
	// strawberries under the sunny low trees
	for (let k = 0; k < 4000 && (G.layers.ground ?? 0) < 900; k++) {
		const T = lows[Math.floor(r() * lows.length)];
		const [dx, dz] = polar(between(r, 1, 2.2), gr_SUN + (r() - 0.5) * 2);
		gr_drift(G, r() < 0.7 ? 'strawberry' : 'nasturtium', T.x + dx, T.z + dz, 4, 0.7);
	}
}
function gr_try(G, kind, x, z) {
	const r = G.r;
	const stage = r() < 0.75 ? 9 : 7, scale = between(r, 0.9, 1.1);
	if (gr_ok(G, kind, x, z, stage, scale)) return gr_put(G, kind, x, z, { stage, scale });
	return null;
}
function gr_drift(G, kind, cx, cz, n, rad) {
	return gr_cluster(G, kind, cx, cz, n, 0.35, rad);
}

/** passion fruit: on the pergola's outer posts and on rustic trellises (two bark posts and a pole) in the sun by the paths */
function gr_plantClimbers(G) {
	const r = G.r;
	for (const p of G.pergola) {
		const [nx, nz] = p.out;
		const x = p.outer.x + nx * 0.2, z = p.outer.z + nz * 0.2;
		const turn = Math.atan2(nx, -nz);
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.7 ? 9 : 7, turn, scale: between(r, 0.95, 1.05) });
	}
	G.frames = [];
	const doors = ['south', 'west', 'east'];
	for (let k = 0; k < 2000 && G.frames.length < 5; k++) {
		const L = G.paths[doors[Math.floor(r() * doors.length)]];
		const i = 4 + Math.floor(r() * (L.P.length - 8));
		if (L.skip[i]) continue;
		const [nx, nz] = gr_normal(L.P, i);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + 1.4;
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		const tx = -nz, tz = nx;
		const ends = [[x + tx * 1.55, z + tz * 1.55], [x - tx * 1.55, z - tz * 1.55]];
		if (gr_shadeAt(G, x, z) > 0.35) continue;
		if (G.frames.some((f) => Math.hypot(f.x - x, f.z - z) < 11)) continue;
		let ok = true;
		for (const [ex, ez] of [[x, z], ...ends]) {
			const D = gr_clear(G, ex, ez);
			if (!inGarden(ex, ez) || D.path < 0.9 || D.water < 0.8 || D.plaza < 1.5 || D.stone < 0.6 || D.struct < 0.4) ok = false;
			for (const q of gr_nearPlants(G, ex, ez)) if ((q.layer === 'canopy' || q.layer === 'low') && Math.hypot(q.x - ex, q.z - ez) < (q.layer === 'canopy' ? 2.2 : 1.3)) ok = false;
		}
		if (!ok) continue;
		const f = { x, z, t: [tx, tz] };
		G.frames.push(f);
		G.struct.add({ ax: ends[0][0], az: ends[0][1], bx: ends[1][0], bz: ends[1][1], r: 0.35 });
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.6 ? 9 : 7, turn: Math.atan2(-tz, tx), scale: between(r, 0.95, 1.05) });
	}
}

/** logs lying in the shade, the oldest fallen trunks, and the mushroom bolts beside them (shiitake laid along, oyster
 *  stood on end: each brings its own little log) */
function gr_plantLogs(G) {
	const r = G.r;
	G.logs = [];
	const yards = ['ford', 'pond'].map((id) => G.sideIdx.lines.find((l) => l.id === id)).filter(Boolean).map((l) => l.P[l.P.length - 1]);
	const fits = (ax, az, bx, bz, rad) => {
		for (let k = 0; k <= 4; k++) {
			const x = lerp(ax, bx, k / 4), z = lerp(az, bz, k / 4);
			if (!inGarden(x, z, 0.3)) return false;
			const D = gr_clear(G, x, z);
			if (D.path < 0.7 || D.water < 0.6 || D.stone < 0.35 || D.struct < 0.35 || D.plaza < 1.5) return false;
			if (Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z) < 8.5) return false;
			for (const q of gr_nearPlants(G, x, z)) {
				const need = q.layer === 'canopy' ? 1.3 : q.layer === 'low' ? 0.8 : q.layer === 'shrub' ? 0.5 : 0.3;
				if (Math.hypot(q.x - x, q.z - z) < need + rad) return false;
			}
		}
		for (const l of G.logs) if (Math.min(Math.hypot(l.ax - ax, l.az - az), Math.hypot(l.bx - bx, l.bz - bz), Math.hypot((l.ax + l.bx) / 2 - (ax + bx) / 2, (l.az + l.bz) / 2 - (az + bz) / 2)) < 1.4) return false;
		return true;
	};
	const tryLog = (cx, cz, spread) => {
		for (let k = 0; k < 40; k++) {
			const [dx, dz] = polar(Math.sqrt(r()) * spread, r() * TAU);
			const x = cx + dx, z = cz + dz;
			const len = between(r, 1.8, 3.1), rad = between(r, 0.14, 0.21), a = r() * Math.PI;
			const [ux, uz] = polar(len / 2, a);
			if (!fits(x - ux, z - uz, x + ux, z + uz, rad)) continue;
			const log = { ax: x - ux, az: z - uz, bx: x + ux, bz: z + uz, r: rad, len, a, x, z };
			G.logs.push(log);
			G.struct.add({ ...log, r: rad + 0.15 });
			const lx = (log.bx - log.ax) / len, lz = (log.bz - log.az) / len;
			log.hole = G.holes.add({ ax: log.ax + lx * rad, az: log.az + lz * rad, bx: log.bx - lx * rad, bz: log.bz - lz * rad, r: rad * 0.72, cls: 'log' });
			return log;
		}
		return null;
	};
	for (const [x, z] of yards) for (let k = 0; k < 3; k++) tryLog(x, z, 3.2);
	const shady = G.canopy.filter((t) => t.stage > 4 && t.kind !== 'king-coconut');
	for (let k = 0; k < 60 && G.logs.length < 10; k++) {
		const T = shady[Math.floor(r() * shady.length)];
		const [dx, dz] = polar(T.w * 0.3, gr_SHADY + (r() - 0.5) * 2);
		tryLog(T.x + dx, T.z + dz, 1.6);
	}
	// the bolts beside each log
	for (const log of G.logs) {
		const ux = (log.bx - log.ax) / log.len, uz = (log.bz - log.az) / log.len;
		const vx = uz, vz = -ux;
		const n = 2 + Math.floor(r() * 2);
		for (let k = 0; k < n; k++) {
			const kind = r() < 0.55 ? 'shiitake' : 'oyster';
			const sd = r() < 0.5 ? 1 : -1;
			const along = between(r, -0.35, 0.35) * log.len;
			const o = log.r + (kind === 'shiitake' ? 0.17 : 0.2) + r() * 0.05;
			const x = log.x + ux * along + vx * o * sd, z = log.z + uz * along + vz * o * sd;
			const stage = r() < 0.75 ? 9 : 7;
			if (gr_ok(G, kind, x, z, stage, 1, { wet: 0.4 })) gr_put(G, kind, x, z, { stage, scale: between(G.r, 0.92, 1.08), turn: Math.atan2(-uz, ux) + (kind === 'oyster' ? r() * TAU : 0) });
		}
	}
}

/** the views into the gates kept clear, and what the dome's other parts keep clear (`dome.keep`): what was planted or
 *  laid in one is taken out afterwards (so the forest stands the same whatever else the dome holds) */
function gr_clearViews(G) {
	const inView = (x, z, m = 0) => G.views.some((v) => gr_capsule(v, x, z) < v.r + m) || G.keep.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + m);
	const gone = new Set();
	// a trellis in a view goes, and its passion fruit with it
	for (const f of G.frames) if (inView(f.x, f.z, 1.6)) gone.add(`${f.x},${f.z}`);
	for (const p of G.plants)
		if (gone.has(`${p.x},${p.z}`) || inView(p.x, p.z, p.layer === 'canopy' || p.layer === 'low' ? 0.4 * p.w : 0)) {
			gone.add(`${p.x},${p.z}`);
			G.layers[p.layer] -= 1;
			G.count[p.kind] -= 1;
		}
	G.plants = G.plants.filter((p) => !gone.has(`${p.x},${p.z}`));
	G.dome.plants = G.dome.plants.filter((q) => !gone.has(`${q.x},${q.z}`));
	G.frames = G.frames.filter((f) => !inView(f.x, f.z, 1.6));
	G.logs = G.logs.filter((l) => {
		if (!inView(l.x, l.z, l.len / 2)) return true;
		l.hole.r = -99;
		return false;
	});
}

/** more trellises, after all is planted (so nothing planted moves): where a frame fits in the sun by a path, clear of
 *  the plants round it and of the gates' views, till there are five */
function gr_moreFrames(G) {
	const r = chance('forest-dome', 'frames');
	const doors = ['south', 'west', 'east'];
	for (let k = 0; k < 3000 && G.frames.length < 5; k++) {
		const L = G.paths[doors[Math.floor(r() * doors.length)]];
		const i = 4 + Math.floor(r() * (L.P.length - 8));
		if (L.skip[i]) continue;
		const [nx, nz] = gr_normal(L.P, i);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + 1.4;
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		const tx = -nz, tz = nx;
		const line = { ax: x + tx * 1.6, az: z + tz * 1.6, bx: x - tx * 1.6, bz: z - tz * 1.6 };
		if (gr_shadeAt(G, x, z) > 0.4 || G.frames.some((f) => Math.hypot(f.x - x, f.z - z) < 10)) continue;
		if (G.views.some((v) => gr_capsule(v, x, z) < v.r + 2)) continue;
		let ok = true;
		for (const [ex, ez] of [[x, z], [line.ax, line.az], [line.bx, line.bz]]) {
			const D = gr_clear(G, ex, ez);
			if (!inGarden(ex, ez) || D.path < 0.9 || D.water < 0.8 || D.plaza < 1.5 || D.stone < 0.6 || D.struct < 0.4) ok = false;
		}
		for (const q of gr_nearPlants(G, x, z)) {
			const need = q.layer === 'canopy' ? 2.2 : q.layer === 'low' ? 1.3 : q.layer === 'shrub' ? 0.8 : 0.4;
			if (gr_capsule(line, q.x, q.z) < need) ok = false;
		}
		if (!ok) continue;
		const f = { x, z, t: [tx, tz] };
		G.frames.push(f);
		G.struct.add({ ...line, r: 0.35 });
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.6 ? 9 : 7, turn: Math.atan2(-tz, tx), scale: between(r, 0.95, 1.05) });
	}
}

/** the bigger river stones of the brook's banks, its bed and the pond's rim, the basin's ring (planned before the
 *  plants, so none stands on one, and the bigger ones cut out of the floor) */
function gr_planRocks(G) {
	const r = chance('forest-dome', 'rocks');
	const B = G.brook;
	G.rocks = [];
	const ford = G.stones.filter((s) => s.ford);
	const near = (x, z, d) => ford.some((s) => Math.hypot(s.x - x, s.z - z) < d) || G.bridges.some((b) => gr_capsule({ ax: b.A[0], az: b.A[1], bx: b.B[0], bz: b.B[1] }, x, z) < d * 0.6);
	const add = (x, z, size, o = {}) => {
		const q = gr_brookQ(x, z);
		const ground = o.bed ? gr_bedY(x, z, 'brook', q) : o.pond ? gr_bedY(x, z, 'pond', q) : gr_hs(x, z);
		const flat = o.flat ?? between(r, 0.42, 0.62);
		const sx = size / 2, sy = (size / 2) * flat, sz = (size / 2) * between(r, 0.6, 0.85);
		const y = ground + sy * between(r, 0.15, 0.4);
		const w = o.w ?? (q ? q.w : gr_POND.w);
		const rock = { x, y, z, sx, sy, sz, ry: r() * TAU, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3, small: size < 0.2, k: Math.floor(r() * 8), wet: y < w + 0.03 };
		G.rocks.push(rock);
		if (size > 0.32) G.holes.add({ ax: x, az: z, bx: x, bz: z, r: Math.min(sx, sz) * 0.75, cls: 'rock' });
		if (size > 0.3) G.struct.add({ ax: x, az: z, bx: x, bz: z, r: Math.max(sx, sz) });
		return rock;
	};
	// along both banks, in loose runs, bigger at the bends' outsides; the basin's ring of them
	for (let s = 0.2; s < B.sPond; s += between(r, 0.22, 0.5)) {
		const i = gr_index(B.S, s);
		const [nx, nz] = gr_normal(B.P, i);
		const hw = B.HW[i];
		for (const sd of [-1, 1]) {
			if (r() > (s < 2.4 ? 0.95 : 0.72)) continue;
			const big = r() < 0.08;
			const size = big ? between(r, 0.42, 0.62) : s < 2.4 ? between(r, 0.24, 0.42) : between(r, 0.13, 0.32);
			const o = hw + (big ? between(r, 0.25, 0.4) : between(r, -0.06, 0.28));
			const x = B.P[i][0] + nx * o * sd, z = B.P[i][1] + nz * o * sd;
			if (near(x, z, 0.9) || gr_dPlaza(x, z) < size / 2 + 0.05) continue;
			add(x, z, size, { bed: true, w: B.W[i] });
		}
	}
	// pebbles in the bed
	for (let s = 1; s < B.sPond; s += between(r, 0.35, 0.8)) {
		const i = gr_index(B.S, s);
		const [nx, nz] = gr_normal(B.P, i);
		const o = between(r, -0.85, 0.85) * B.HW[i];
		const x = B.P[i][0] + nx * o, z = B.P[i][1] + nz * o;
		if (near(x, z, 0.55)) continue;
		add(x, z, between(r, 0.06, 0.17), { bed: true, flat: between(r, 0.4, 0.55), w: B.W[i] });
	}
	// the pond's rim, a gap where the stepping stones come down to it
	const landing = G.stones[G.stones.length - 1];
	const pondStones = G.stones.filter((s) => gr_pondSD(s.x, s.z) < 1);
	for (let a = 0; a < TAU; a += between(r, 0.06, 0.13)) {
		const big = r() < 0.1;
		const size = big ? between(r, 0.42, 0.66) : between(r, 0.14, 0.34);
		const [x, z] = gr_pondAt(a, between(r, -0.08, 0.22) + (big ? 0.12 : 0));
		if (pondStones.some((s) => Math.hypot(s.x - x, s.z - z) < 0.75)) continue;
		const q = gr_brookQ(x, z);
		if (q && q.d < q.hw + 0.25) continue;
		add(x, z, size, { pond: true, w: gr_POND.w });
	}
	void landing;
}

/* ================================================================================================================
 * 5.4 BUILDING — the floor, the water, the stones, the paths, the plaza, the spring, the bridges, the clearing
 * ================================================================================================================ */

/** the floor's colour (multiplying its pictures): mottled, darker under the crowns and damp by the water, dusty at the paths' edges */
function gr_colour(G, x, z, fp) {
	const m = vnoise(x / 3.3 + 70, z / 3.3 + 70, 8192, 8192, 521), m2 = vnoise(x / 1.1 + 70, z / 1.1 + 70, 8192, 8192, 523);
	const c = (0.86 + 0.16 * m + 0.08 * m2) * (1 - 0.24 * gr_shadeAt(G, x, z));
	let r = c, g = c * 0.985, b = c * 0.95;
	const wet = 0.7 * (1 - span(fp.water, 0.1, 1.2)), dust = 0.5 * (1 - span(fp.path, 0, 0.8));
	(r += (0.55 - r) * wet), (g += (0.56 - g) * wet), (b += (0.5 - b) * wet);
	(r += (1.12 - r) * dust), (g += (1.07 - g) * dust), (b += (0.97 - b) * dust);
	return [r, g, b];
}

/**
 * THE FLOOR: a grid of 0.75 m, its cells near anything cut refined (into four along the long lines, sixteen round the
 * small things), every triangle clipped along the cut's zero, so the soil's outline follows a path's edging or a log's
 * side to a centimetre or two; the soil kept, the bare earth under the bridges and along the stepping stones kept in
 * 'gr-bed' (clipped again, along what else lies there), the rest left to what lies over it. The grid's outer ring is
 * pulled onto the knee wall's circle. Inside a cell everything is read off its corners (the floor is smooth there),
 * but the cut's small things, asked at every vertex; normals from the floor's height on the grid, so no seam shows.
 */
function gr_buildFloor(G) {
	const S = gr_STEP, x0 = -gr_TR - S, z0 = -gr_TR - S;
	const nx = Math.ceil((2 * (gr_TR + S)) / S) + 1;
	const nz = Math.ceil((edgeZ(0, 0) + 1.2 - z0) / S) + 1;
	const N = nx * nz;
	const USE = new Uint8Array(N), IN = new Uint8Array(N);
	const H = new Float32Array(N), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
	for (let j = 0, k = 0; j < nz; j++)
		for (let i = 0; i < nx; i++, k++) {
			const x = x0 + i * S, z = z0 + j * S, r = Math.hypot(x, z);
			if (r > gr_TR + 2 * S) continue;
			USE[k] = 1;
			IN[k] = r < gr_TR ? 1 : 0;
			// under the plaza nothing is drawn: its height only steadies the normals at the kerb
			H[k] = gr_dPlaza(x, z) < -1 ? gr_FRONT_Y : gr_hs(x, z);
		}
	for (let j = 0, k = 0; j < nz; j++)
		for (let i = 0; i < nx; i++, k++) {
			if (!USE[k]) continue;
			const h = (q) => (USE[q] ? H[q] : H[k]);
			const gx = (h(i + 1 < nx ? k + 1 : k) - h(i ? k - 1 : k)) / (2 * S), gz = (h(j + 1 < nz ? k + nx : k) - h(j ? k - nx : k)) / (2 * S);
			const l = Math.hypot(gx, 1, gz);
			(NX[k] = -gx / l), (NY[k] = 1 / l), (NZ[k] = -gz / l);
		}
	// the vertices, each once: a node k; a quarter, half or three quarters along its edge east (N + 3k …) or north
	// (4N + 3k …); inside its cell (7N + 9k …); where the cut crosses an edge between two (kept on the lower one)
	const verts = new Array(16 * N);
	let ids = 16 * N;
	/** a vertex: the lines' part of the cut asked here (or `lines`: read off a cell's corners), the rest asked here */
	const make = (key, x, z, y, nxv, nyv, nzv, lines) => {
		const o = lines ?? gr_fieldLines(x, z, {}, 4);
		const lo = o.fo, lk = o.fk;
		gr_fieldRest(x, z, o);
		return (verts[key] = { id: key, x, y: y ?? gr_hs(x, z), z, nx: nxv, ny: nyv, nz: nzv, lo, lk, f: o.f, fo: o.fo, small: o.small, path: o.path, water: o.water, col: null, cuts: null, mark: -1, slot: 0 });
	};
	const corner = (i, j) => {
		const k = j * nx + i;
		const v = verts[k];
		if (v) return v;
		let x = x0 + i * S, z = z0 + j * S;
		if (!IN[k]) {
			const r = Math.hypot(x, z);
			(x *= gr_TR / r), (z *= gr_TR / r);
		}
		return make(k, x, z, IN[k] ? H[k] : null, NX[k], NY[k], NZ[k]);
	};
	const pieces = { soil: new Map(), bed: new Map() };
	const emit = (which, a, b, c) => {
		const key = Math.floor((a.x + b.x + c.x) / 3 / CHUNK) * 1000 + Math.floor((a.z + b.z + c.z) / 3 / CHUNK);
		const m = pieces[which];
		let list = m.get(key);
		if (!list) m.set(key, (list = []));
		list.push(a, b, c);
	};
	/** where the field `fk` ('f' or 'fo') crosses zero between a and b: made once */
	const cut = (a, b, fk) => {
		const [lo, hi] = a.id < b.id ? [a, b] : [b, a];
		const cache = (lo.cuts ??= new Map());
		const key = fk === 'f' ? hi.id : -1 - hi.id;
		let v = cache.get(key);
		if (v) return v;
		const t = fk === 'f' ? a.f / (a.f - b.f) : a.fo / (a.fo - b.fo), s = 1 - t;
		v = { id: ids++, x: a.x * s + b.x * t, y: a.y * s + b.y * t, z: a.z * s + b.z * t, nx: a.nx * s + b.nx * t, ny: a.ny * s + b.ny * t, nz: a.nz * s + b.nz * t, lo: 0, lk: 0, f: fk === 'f' ? 0 : a.f * s + b.f * t, fo: fk === 'fo' ? 0 : a.fo * s + b.fo * t, small: 9, path: a.path * s + b.path * t, water: a.water * s + b.water * t, col: null, cuts: null, mark: -1, slot: 0 };
		cache.set(key, v);
		return v;
	};
	/** a polygon split by field `fk` into its part ≥ 0 and its part < 0 */
	const split = (poly, fk) => {
		const inP = [], outP = [];
		for (let k = 0; k < poly.length; k++) {
			const p = poly[k], q = poly[(k + 1) % poly.length];
			const pi = p[fk] >= 0;
			(pi ? inP : outP).push(p);
			if (pi !== q[fk] >= 0) {
				const m = cut(p, q, fk);
				inP.push(m);
				outP.push(m);
			}
		}
		return [inP, outP];
	};
	const fan = (which, poly) => {
		for (let k = 1; k + 1 < poly.length; k++) emit(which, poly[0], poly[k], poly[k + 1]);
	};
	/** a triangle clipped along the cut: its soil; of the rest, what nothing else lies over (bare earth) */
	const clip = (a, b, c) => {
		const ia = a.f >= 0, ib = b.f >= 0, ic = c.f >= 0;
		if (ia && ib && ic) return emit('soil', a, b, c);
		let rest = [a, b, c];
		if (ia || ib || ic) {
			const [inP, outP] = split(rest, 'f');
			fan('soil', inP);
			rest = outP;
		}
		if (rest.length < 3 || rest.every((v) => v.fo < 0)) return;
		if (rest.every((v) => v.fo >= 0)) return fan('bed', rest);
		fan('bed', split(rest, 'fo')[0]);
	};
	const underBridge = (x, z) => {
		for (const b of G.bridges) if (Math.abs(x - b.hole.ax) < 6 && Math.abs(z - b.hole.az) < 6 && gr_capsule(b.hole, x, z) < b.hole.r + 1) return true;
		return false;
	};
	const sub = new Array(25);
	for (let j = 0; j + 1 < nz; j++)
		for (let i = 0; i + 1 < nx; i++) {
			const k00 = j * nx + i, k10 = k00 + 1, k01 = k00 + nx, k11 = k01 + 1;
			if (!(USE[k00] && USE[k10] && USE[k01] && USE[k11])) continue;
			if (!(IN[k00] || IN[k10] || IN[k01] || IN[k11])) continue;
			if (gr_dPlaza(x0 + i * S + S, z0 + j * S) < -0.9 && gr_dPlaza(x0 + i * S, z0 + j * S) < -0.9) continue;
			const c00 = corner(i, j), c10 = corner(i + 1, j), c01 = corner(i, j + 1), c11 = corner(i + 1, j + 1);
			const lo = Math.min(c00.f, c10.f, c01.f, c11.f), hi = Math.max(c00.f, c10.f, c01.f, c11.f);
			// far from any cut: two triangles of soil; deep in one: nothing (but under a bridge)
			if (lo > 0.55) {
				emit('soil', c00, c01, c10);
				emit('soil', c10, c01, c11);
				continue;
			}
			if (hi < -0.55 && Math.max(c00.fo, c10.fo, c01.fo, c11.fo) < -0.55 && !underBridge((c00.x + c11.x) / 2, (c00.z + c11.z) / 2)) continue;
			// near a cut: smaller cells on the cell's own surface (so its neighbours meet it without a crack), four of
			// 37 cm along the long smooth lines, sixteen of 19 cm round the small things (a stone, a footing, a log)
			// (by a bridge the lines' part changes too sharply to be read off the corners: asked at every vertex)
			const exact = underBridge((c00.x + c11.x) / 2, (c00.z + c11.z) / 2);
			const SUB = exact || Math.min(c00.small, c10.small, c01.small, c11.small) < 0.65 ? 4 : 2;
			// a vertex by its place in quarters of the cell: a halving's middle is a quartering's too
			const Q = 4 / SUB;
			for (let v = 0, q = 0; v <= SUB; v++)
				for (let u = 0; u <= SUB; u++, q++) {
					if ((u === 0 || u === SUB) && (v === 0 || v === SUB)) {
						sub[q] = u ? (v ? c11 : c10) : v ? c01 : c00;
						continue;
					}
					const uq = u * Q, vq = v * Q;
					let key;
					if (v === 0) key = N + 3 * k00 + uq - 1;
					else if (v === SUB) key = N + 3 * k01 + uq - 1;
					else if (u === 0) key = 4 * N + 3 * k00 + vq - 1;
					else if (u === SUB) key = 4 * N + 3 * k10 + vq - 1;
					else key = 7 * N + 9 * k00 + (uq - 1) * 3 + vq - 1;
					let vx = verts[key];
					if (!vx) {
						const fu = u / SUB, fv = v / SUB;
						const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
						vx = make(
							key,
							c00.x * w00 + c10.x * w10 + c01.x * w01 + c11.x * w11,
							c00.z * w00 + c10.z * w10 + c01.z * w01 + c11.z * w11,
							c00.y * w00 + c10.y * w10 + c01.y * w01 + c11.y * w11,
							c00.nx * w00 + c10.nx * w10 + c01.nx * w01 + c11.nx * w11,
							c00.ny * w00 + c10.ny * w10 + c01.ny * w01 + c11.ny * w11,
							c00.nz * w00 + c10.nz * w10 + c01.nz * w01 + c11.nz * w11,
							exact
								? undefined
								: {
										fo: c00.lo * w00 + c10.lo * w10 + c01.lo * w01 + c11.lo * w11,
										fk: c00.lk * w00 + c10.lk * w10 + c01.lk * w01 + c11.lk * w11,
										path: c00.path * w00 + c10.path * w10 + c01.path * w01 + c11.path * w11,
										water: c00.water * w00 + c10.water * w10 + c01.water * w01 + c11.water * w11
									}
						);
					}
					sub[q] = vx;
				}
			for (let v = 0; v < SUB; v++)
				for (let u = 0; u < SUB; u++) {
					const a = sub[v * (SUB + 1) + u], b = sub[v * (SUB + 1) + u + 1], c = sub[(v + 1) * (SUB + 1) + u], d = sub[(v + 1) * (SUB + 1) + u + 1];
					clip(a, c, b);
					clip(b, c, d);
				}
		}
	// the meshes: the soil (the biome's), and the bare earth
	let mark = 0;
	for (const [which, m] of Object.entries(pieces))
		for (const list of m.values()) {
			mark++;
			const used = [];
			for (const v of list) if (v.mark !== mark) (v.mark = mark), (v.slot = used.length), used.push(v);
			const n = used.length;
			const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
			const dim = which === 'bed' ? 0.78 : 1;
			for (let k = 0; k < n; k++) {
				const v = used[k];
				(pos[k * 3] = v.x), (pos[k * 3 + 1] = v.y), (pos[k * 3 + 2] = v.z);
				(nor[k * 3] = v.nx), (nor[k * 3 + 1] = v.ny), (nor[k * 3 + 2] = v.nz);
				(uv[k * 2] = v.x / TILE.soil), (uv[k * 2 + 1] = v.z / TILE.soil);
				const c = (v.col ??= gr_colour(G, v.x, v.z, v));
				(col[k * 3] = c[0] * dim), (col[k * 3 + 1] = c[1] * dim), (col[k * 3 + 2] = c[2] * dim);
			}
			const idx = n > 65535 ? new Uint32Array(list.length) : new Uint16Array(list.length);
			for (let q = 0; q < list.length; q++) idx[q] = list[q].slot;
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
			g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
			g.setAttribute('color', new THREE.BufferAttribute(col, 3));
			g.setIndex(new THREE.BufferAttribute(idx, 1));
			G.bag.add(which === 'soil' ? 'soil' : 'gr-bed', g, null, { colour: true });
		}
}

/** a grid of points [rows][cols] made a mesh: normals across its own rows and columns, cut into pieces of `rows` */
function gr_sheet(G, material, grid, colours, uvTile, o = {}) {
	const nr = grid.length, nc = grid[0].length;
	const normal = (i, j) => {
		const a = grid[Math.min(nr - 1, i + 1)][j], b = grid[Math.max(0, i - 1)][j];
		const c = grid[i][Math.min(nc - 1, j + 1)], d = grid[i][Math.max(0, j - 1)];
		const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
		let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
		if (n[1] < 0) n = n.map((q) => -q);
		const l = Math.hypot(...n) || 1;
		return n.map((q) => q / l);
	};
	const piece = o.piece ?? 48;
	const closed = !!o.closed;
	for (let i0 = 0; i0 < nr - 1; i0 += piece) {
		const i1 = Math.min(nr - 1, i0 + piece);
		const pos = [], nor = [], uv = [], col = [], idx = [];
		for (let i = i0; i <= i1; i++)
			for (let j = 0; j < nc; j++) {
				const p = grid[i][j];
				pos.push(...p);
				nor.push(...(o.normals?.[i]?.[j] ?? normal(i, j)));
				uv.push(p[0] / uvTile, p[2] / uvTile);
				if (colours) col.push(...colours[i][j]);
			}
		const cols = closed ? nc : nc - 1;
		for (let i = 0; i < i1 - i0; i++)
			for (let j = 0; j < cols; j++) {
				const j2 = (j + 1) % nc;
				const a = i * nc + j, b = i * nc + j2, c = (i + 1) * nc + j, d = (i + 1) * nc + j2;
				if (o.flip) idx.push(a, b, c, b, d, c);
				else idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		if (colours) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		G.bag.add(material, g, null, { colour: !!colours });
	}
}

/** the bed's colour: the floor's, damp and dark, darker still under the water */
function gr_bedColour(G, x, z, y, w) {
	const m = vnoise(x / 1.4 + 90, z / 1.4 + 90, 8192, 8192, 531);
	const c = 0.85 + 0.25 * m;
	let col = [c, c * 1.0, c * 0.93];
	if (y < w) col = scalec(col, lerp(0.8, 0.55, clamp((w - y) / 0.35)));
	return col;
}

/** THE BROOK: its bed and banks (a ribbon of 15 across, carved below the water, the banks to the floor's height and
 *  just under the floor's cut edge), and its water a little under the banks */
function gr_buildBrook(G) {
	const B = G.brook;
	const grid = [], colours = [];
	for (let i = 0; i < B.P.length; i++) {
		const [x, z] = B.P[i];
		const [nx, nz] = gr_normal(B.P, i);
		const hw = B.HW[i], a = hw * 1.05;
		const half = [a * 0.38, a * 0.72, a, hw + 0.2, hw + 0.4, hw + 0.5, hw + 0.62, hw + 0.8];
		const offs = [...half.map((o) => -o).reverse(), 0, ...half];
		const row = [], crow = [];
		for (const o of offs) {
			const X = x + nx * o, Z = z + nz * o;
			let y = gr_bedY(X, Z, 'brook', { d: Math.min(Math.abs(o), hw + 0.62), hw, w: B.W[i], D: B.D[i] });
			if (Math.abs(o) > hw + 0.75) y -= 0.07;
			else if (Math.abs(o) > hw + 0.6) y -= 0.03;
			else if (Math.abs(o) > hw + 0.45) y -= 0.01;
			row.push([X, y, Z]);
			crow.push(gr_bedColour(G, X, Z, y, B.W[i]));
		}
		grid.push(row);
		colours.push(crow);
	}
	gr_sheet(G, 'gr-bed', grid, colours, TILE['gr-bed'], { piece: 40, flip: false });
	// the water, from under the kerb to where the pond's begins
	const wgrid = [];
	for (let i = 0; i < B.P.length; i++) {
		const [x, z] = B.P[i];
		if (gr_pondSD(x, z) < 0.18) break;
		const [nx, nz] = gr_normal(B.P, i);
		const o = B.HW[i] * 1.2, y = B.W[i] - 0.004;
		wgrid.push([[x - nx * o, y, z - nz * o], [x, y, z], [x + nx * o, y, z + nz * o]]);
	}
	gr_sheet(G, 'water', wgrid, null, TILE.water, { piece: 60, flip: false, normals: wgrid.map((r) => r.map(() => [0, 1, 0])) });
}

/** THE POND: its bed in rings from the middle out to its banks (just under the floor's cut edge), its water, lilies */
function gr_buildPond(G) {
	const NA = 80;
	const rings = [0.18, 0.4, 0.62, 0.8, 0.92, 0.98];
	const outs = [0, 0.1, 0.22, 0.35, 0.47, 0.58, 0.75];
	const grid = [], colours = [];
	const P0 = [gr_POND.x, 0, gr_POND.z];
	const y0 = gr_bedY(gr_POND.x, gr_POND.z, 'pond');
	const centre = [gr_POND.x, y0, gr_POND.z];
	for (let ri = 0; ri < rings.length + outs.length; ri++) {
		const row = [], crow = [];
		for (let k = 0; k < NA; k++) {
			const phi = (k / NA) * TAU;
			let x, z;
			if (ri < rings.length) {
				const [ox, oz] = gr_pondAt(phi);
				x = lerp(P0[0], ox, rings[ri]);
				z = lerp(P0[2], oz, rings[ri]);
			} else [x, z] = gr_pondAt(phi, outs[ri - rings.length]);
			let y = gr_bedY(x, z, 'pond');
			if (ri === rings.length + outs.length - 1) y -= 0.07;
			else if (ri === rings.length + outs.length - 2) y -= 0.03;
			else if (ri === rings.length + outs.length - 3) y -= 0.01;
			row.push([x, y, z]);
			crow.push(gr_bedColour(G, x, z, y, gr_POND.w));
		}
		grid.push(row);
		colours.push(crow);
	}
	gr_sheet(G, 'gr-bed', grid, colours, TILE['gr-bed'], { piece: 100, closed: true, flip: true });
	// the middle: a fan to the first ring
	{
		const pos = [...centre], col = [...gr_bedColour(G, centre[0], centre[2], centre[1], gr_POND.w)], uv = [centre[0] / TILE['gr-bed'], centre[2] / TILE['gr-bed']], idx = [];
		for (let k = 0; k < NA; k++) {
			pos.push(...grid[0][k]);
			col.push(...colours[0][k]);
			uv.push(grid[0][k][0] / TILE['gr-bed'], grid[0][k][2] / TILE['gr-bed']);
			idx.push(0, 1 + k, 1 + ((k + 1) % NA));
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		if (g.attributes.normal.getY(0) < 0) g.setIndex(idx.map((q, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]]));
		g.computeVertexNormals();
		G.bag.add('gr-bed', g, null, { colour: true });
	}
	// the water: the outline a little into the banks
	const pts = [];
	for (let k = 0; k < 96; k++) {
		const [x, z] = gr_pondAt((k / 96) * TAU, 0.2);
		pts.push([x, -z]);
	}
	const wg = new THREE.ShapeGeometry(shapeOf(pts), 1);
	wg.rotateX(-Math.PI / 2);
	wg.translate(0, gr_POND.w - 0.004, 0);
	G.bag.add('water', wg, null, { uv: 'box', chunk: false });
	// lily pads in two groups, a few flowers
	const r = chance('forest-dome', 'lilies');
	for (const [phi, f, n] of [[0.6, 0.45, 10], [3.9, 0.55, 8]]) {
		const [ox, oz] = gr_pondAt(phi);
		for (let k = 0; k < n; k++) {
			const t = f + (r() - 0.5) * 0.35;
			const x = lerp(gr_POND.x, ox, t) + (r() - 0.5) * 1.1, z = lerp(gr_POND.z, oz, t) + (r() - 0.5) * 1.1;
			if (gr_pondSD(x, z) > -0.45) continue;
			const rad = between(r, 0.13, 0.24);
			const g = new THREE.RingGeometry(0.004, rad, 18, 2, 0.12, TAU - 0.24);
			g.rotateX(-Math.PI / 2);
			const p = g.attributes.position;
			const tone = between(r, 0.8, 1.15);
			const col = [];
			for (let q = 0; q < p.count; q++) {
				const d = Math.hypot(p.getX(q), p.getZ(q)) / rad;
				p.setY(q, 0.01 * d * d);
				const red = d > 0.92 ? 0.25 : 0;
				col.push(...mixc(scalec([0.3, 0.42, 0.18], tone), [0.42, 0.2, 0.15], red));
			}
			g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
			g.computeVertexNormals();
			G.bag.add('gr-lily', g, at(x, gr_POND.w + 0.004, z, r() * TAU), { colour: true });
			if (k % 3 === 1) {
				const fl = lathe([[0, 0], [0.03, 0.012], [0.045, 0.035], [0.05, 0.055], [0.035, 0.06]], 10);
				G.bag.add('gr-bloom', fl, at(x + rad * 0.3, gr_POND.w + 0.01, z, 0, 1));
			}
		}
	}
}

/**
 * THE BATCH — many copies of a few shapes (stones, cobbles, planks, slats, posts) laid by their matrices straight into
 * one list per material and square of the ground: a thousand stones become a few meshes, never a thousand made and merged.
 */
class gr_Batch {
	constructor(bag) {
		this.bag = bag;
		this.groups = new Map();
	}
	/** a copy of `tpl` (position, normal, uv; indexed or not) moved by matrix `m`, in `material` (laid at the flush) */
	add(material, tpl, m) {
		const e = m.elements;
		const key = `${material}|${Math.floor(e[12] / CHUNK)},${Math.floor(e[14] / CHUNK)}`;
		let g = this.groups.get(key);
		if (!g) this.groups.set(key, (g = { material, items: [], verts: 0, tris: 0 }));
		g.items.push(tpl, m);
		g.verts += tpl.attributes.position.count;
		g.tris += tpl.index ? tpl.index.count : tpl.attributes.position.count;
	}
	flush() {
		const nm = new THREE.Matrix3();
		for (const g of this.groups.values()) {
			const pos = new Float32Array(g.verts * 3), nor = new Float32Array(g.verts * 3), uv = new Float32Array(g.verts * 2);
			const idx = g.verts > 65535 ? new Uint32Array(g.tris) : new Uint16Array(g.tris);
			let v = 0, t = 0;
			for (let k = 0; k < g.items.length; k += 2) {
				const tpl = g.items[k], e = g.items[k + 1].elements, n = nm.getNormalMatrix(g.items[k + 1]).elements;
				const P = tpl.attributes.position.array, Nn = tpl.attributes.normal.array, U = tpl.attributes.uv.array;
				const count = P.length / 3;
				for (let i = 0, j = v * 3; i < P.length; i += 3, j += 3) {
					const x = P[i], y = P[i + 1], z = P[i + 2];
					pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12];
					pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
					pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
					const a = Nn[i], b = Nn[i + 1], c = Nn[i + 2];
					const nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c;
					const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
					(nor[j] = nx / l), (nor[j + 1] = ny / l), (nor[j + 2] = nz / l);
				}
				uv.set(U, v * 2);
				if (tpl.index) {
					const I = tpl.index.array;
					for (let i = 0; i < I.length; i++) idx[t + i] = v + I[i];
					t += I.length;
				} else {
					for (let i = 0; i < count; i++) idx[t + i] = v + i;
					t += count;
				}
				v += count;
			}
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
			geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
			geo.setIndex(new THREE.BufferAttribute(idx, 1));
			this.bag.add(g.material, geo);
		}
		this.groups.clear();
	}
}
/** a shape made once and kept, its UVs laid by box in metres over its material's tile (timber: its grain along x) */
function gr_tpl(G, material, key, make) {
	const k = `${material}:${key}`;
	let g = G.tpls.get(k);
	if (!g) G.tpls.set(k, (g = gr_mergeVertices(boxUV(make(), TILE[material] ?? 1))));
	return g;
}
/** a rounded box w × h × d (its grain along x) laid by a matrix */
function gr_box(G, material, w, h, d, r, m) {
	G.batch.add(material, gr_tpl(G, material, `rb${w.toFixed(3)}x${h.toFixed(3)}x${d.toFixed(3)}r${r}`, () => rbox(w, h, d, r, 1)), m);
}

/** the river stones: a few shapes (round-ish, noisy, squashed; never facetted), each laid many times */
function gr_stoneProto(seed, ws, hs, flat) {
	const r = chance('gr-stone', seed);
	const waves = Array.from({ length: 5 }, () => {
		const a = r() * TAU, b = Math.acos(2 * r() - 1);
		return { d: [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)], f: between(r, 0.8, 2.6), p: r() * TAU, a: between(r, 0.04, 0.1) };
	});
	// a sphere of rings, each vertex once (no seam), pushed out and in by a few long waves, squashed flatter below (or,
	// for a slab, flattened top and bottom with rounded edges)
	const pos = [], idx = [];
	const vert = (x, y, z) => {
		let k = 1;
		for (const w of waves) k += w.a * Math.sin(w.f * (x * w.d[0] + y * w.d[1] + z * w.d[2]) * 2 + w.p);
		(x *= k), (y *= k), (z *= k);
		if (flat) y = Math.sign(y) * Math.pow(Math.abs(y), 0.42);
		else if (y < -0.4) y = -0.4 + (y + 0.4) * 0.35;
		pos.push(x, y, z);
	};
	vert(0, 1, 0);
	for (let j = 1; j < hs; j++) {
		const th = (j / hs) * Math.PI;
		for (let i = 0; i < ws; i++) {
			const ph = (i / ws) * TAU;
			vert(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
		}
	}
	vert(0, -1, 0);
	const bottom = 1 + (hs - 1) * ws;
	for (let i = 0; i < ws; i++) idx.push(0, 1 + ((i + 1) % ws), 1 + i);
	for (let j = 0; j < hs - 2; j++)
		for (let i = 0; i < ws; i++) {
			const a = 1 + j * ws + i, b = 1 + j * ws + ((i + 1) % ws), c = a + ws, d = b + ws;
			idx.push(a, b, c, b, d, c);
		}
	for (let i = 0; i < ws; i++) idx.push(bottom, 1 + (hs - 2) * ws + i, 1 + (hs - 2) * ws + ((i + 1) % ws));
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// UVs by the side each vertex looks to, as if the stone were some 15 cm across (its mottle grows with it)
	const P = g.attributes.position.array, Nn = g.attributes.normal.array, uv = new Float32Array((P.length / 3) * 2);
	const k = 0.15 / TILE.stone;
	for (let i = 0, q = 0; i < P.length; i += 3, q += 2) {
		const ax = Math.abs(Nn[i]), ay = Math.abs(Nn[i + 1]), az = Math.abs(Nn[i + 2]);
		const [u, v] = ay >= ax && ay >= az ? [P[i], P[i + 2]] : ax >= az ? [P[i + 2], P[i + 1]] : [P[i], P[i + 1]];
		(uv[q] = u * k), (uv[q + 1] = v * k);
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	return g;
}
function gr_protos(G) {
	G.protos = {
		round: Array.from({ length: 5 }, (_, k) => gr_stoneProto(`round${k}`, 11, 7, false)),
		small: Array.from({ length: 2 }, (_, k) => gr_stoneProto(`small${k}`, 8, 5, false)),
		cobble: Array.from({ length: 2 }, (_, k) => gr_stoneProto(`cobble${k}`, 7, 5, false)),
		slab: Array.from({ length: 3 }, (_, k) => gr_stoneProto(`slab${k}`, 12, 6, true))
	};
}
/** a stone laid: a shape of its kind, at [x, y, z], half-sizes sx, sy, sz, turned */
function gr_rock(G, kind, k, x, y, z, s, ry, rx = 0, rz = 0, material = 'stone') {
	const list = G.protos[kind];
	G.batch.add(material, list[k % list.length], at(x, y, z, ry, s, rx, rz));
}
function gr_buildRocks(G) {
	for (const k of G.rocks) gr_rock(G, k.small ? 'small' : 'round', k.k, k.x, k.y, k.z, [k.sx, k.sy, k.sz], k.ry, k.rx, k.rz, k.wet ? 'stone-wet' : k.k % 5 < 3 ? 'gr-rock' : 'stone');
	// the stepping stones and the ford's, flat-topped, their tops a little above the ground (or the water)
	for (const s of G.stones) {
		if (s.ford) {
			gr_rock(G, 'slab', s.k, s.x, s.w + 0.06 - 0.13, s.z, [s.a, 0.13, s.b], s.ry, 0, 0, 'stone');
			continue;
		}
		const q = gr_brookQ(s.x, s.z);
		const g = q && q.d < q.hw + 0.62 ? gr_bedY(s.x, s.z, 'brook', q) : gr_pondSD(s.x, s.z) < 0.6 ? gr_bedY(s.x, s.z, 'pond', q) : gr_hs(s.x, s.z);
		gr_rock(G, 'slab', s.k, s.x, g - 0.04, s.z, [s.a, 0.075, s.b], s.ry, 0, 0, 'stone');
	}
}

/**
 * A SWEEP: a profile ([a, b]: a across, to the right of the way; b up; counter-clockwise) carried along points
 * [x, y, z], its UVs in metres along and round it over `tile`; closed round, or with its ends capped.
 */
function gr_sweep(pts, profile, o = {}) {
	const n = pts.length, m = profile.length;
	const tile = o.tile ?? 1;
	const closed = !!o.closed;
	const pos = [], uv = [], idx = [];
	const per = [0];
	for (let j = 1; j <= m; j++) per.push(per[j - 1] + Math.hypot(profile[j % m][0] - profile[j - 1][0], profile[j % m][1] - profile[j - 1][1]));
	const frame = [];
	let along = 0;
	for (let i = 0; i < n; i++) {
		const p = pts[i];
		const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
		let tx = b[0] - a[0], tz = b[2] - a[2];
		const l = Math.hypot(tx, tz) || 1;
		(tx /= l), (tz /= l);
		frame.push([tx, tz]);
		if (i) along += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
		for (let j = 0; j <= m; j++) {
			const [pa, pb] = profile[j % m];
			pos.push(p[0] + tz * pa, p[1] + pb, p[2] - tx * pa);
			uv.push(along / tile, per[j] / tile);
		}
	}
	const rows = closed ? n : n - 1;
	for (let i = 0; i < rows; i++) {
		const i2 = (i + 1) % n;
		for (let j = 0; j < m; j++) {
			const a = i * (m + 1) + j, b = i2 * (m + 1) + j, c = a + 1, d = b + 1;
			idx.push(a, c, b, b, c, d);
		}
	}
	let g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	if (o.caps && !closed) {
		const caps = [];
		for (const [i, sgn] of [[0, -1], [n - 1, 1]]) {
			const p = pts[i], [tx, tz] = frame[i];
			let ca = 0, cb = 0;
			for (const [pa, pb] of profile) (ca += pa / m), (cb += pb / m);
			const cp = [], cu = [], ci = [];
			cp.push(p[0] + tz * ca, p[1] + cb, p[2] - tx * ca);
			cu.push(ca / tile, cb / tile);
			for (const [pa, pb] of profile) {
				cp.push(p[0] + tz * pa, p[1] + pb, p[2] - tx * pa);
				cu.push(pa / tile, pb / tile);
			}
			for (let j = 0; j < m; j++) sgn > 0 ? ci.push(0, 1 + j, 1 + ((j + 1) % m)) : ci.push(0, 1 + ((j + 1) % m), 1 + j);
			const cg = new THREE.BufferGeometry();
			cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
			cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
			cg.setIndex(ci);
			cg.computeVertexNormals();
			caps.push(cg);
		}
		g = mergeGeometries([g, ...caps]);
	}
	return g;
}
/** an edging board's section: 26 mm × 185 mm, 35 mm proud of the gravel, its top edges eased */
const gr_BOARD = [[-0.013, -0.15], [0.013, -0.15], [0.013, 0.027], [0.005, 0.035], [-0.005, 0.035], [-0.013, 0.027]];
/** a rounded rectangle profile w × h, its middle at [a, b] */
const gr_rr = (w, h, r, a = 0, b = 0, seg = 2) => roundRect(w, h, r, seg).map(([x, y]) => [x + a, y + b]);

/** a rounded bar of timber (or stone) between two points, w × d in section */
function gr_beam(G, material, a, b, w, d, r = 0.015) {
	const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
	const len = Math.round(A.distanceTo(B) * 50) / 50;
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
	gr_box(G, material, len, w, d, r, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

/** THE PATHS: gravel, crowned a little, its UVs in metres over the ground; edged with oak boards or river cobbles */
function gr_buildPaths(G) {
	for (const L of G.pathList) {
		const n = L.P.length;
		// the runs of gravel (a bridge breaks one)
		const runs = [];
		let cur = [];
		for (let i = 0; i < n; i++) {
			const inner = G.bridges.some((b) => b.line === L && i > b.i0 && i < b.i1);
			if (inner) {
				if (cur.length > 1) runs.push(cur);
				cur = [];
			} else cur.push(i);
		}
		if (cur.length > 1) runs.push(cur);
		if (L.closed && runs.length === 1) runs[0].push(0);
		for (const run of runs) {
			// light grey-white pea gravel, crowned 3 cm (finer toward its edges, where the crown rounds down), and past its
			// edging a skirt sloping down under the floor's cut edge, so no slit opens between them
			const ACROSS = [-0.5, -0.42, -0.3, -0.15, 0, 0.15, 0.3, 0.42, 0.5];
			const half = L.hw + (L.edge === 'cobble' ? 0.13 : 0.03);
			const grid = [];
			for (const i of run) {
				const [x, z] = L.P[i];
				const [nx, nz] = gr_normal(L.P, i, L.closed);
				const row = [];
				// (the skirt drops steeply under the edging first, so it never runs level with the floor beside it)
				row.push([x - nx * (half + 0.3), L.Y[i] - 0.13, z - nz * (half + 0.3)], [x - nx * (half + 0.04), L.Y[i] - 0.07, z - nz * (half + 0.04)]);
				for (const s of ACROSS) row.push([x + nx * s * 2 * half, L.Y[i] + 0.005 + 0.03 * L.C[i] * (1 - 4 * s * s), z + nz * s * 2 * half]);
				row.push([x + nx * (half + 0.04), L.Y[i] - 0.07, z + nz * (half + 0.04)], [x + nx * (half + 0.3), L.Y[i] - 0.13, z + nz * (half + 0.3)]);
				grid.push(row);
			}
			gr_sheet(G, 'gravel', grid, null, TILE.gravel, { piece: 60, flip: false });
		}
		gr_edging(G, L);
	}
	for (const f of G.fillets) {
		const g = new THREE.CircleGeometry(f.r, 40);
		g.rotateX(-Math.PI / 2);
		G.bag.add('gravel', g, at(f.x, f.y, f.z), { uv: 'box' });
	}
}
/** whether a point by a path's edge is free for its edging: not on another path, a bridge, the steps or the plaza */
function gr_edgeFree(G, L, x, z) {
	if (gr_dPlaza(x, z) < 0.02) return false;
	for (const f of G.fillets) if (Math.hypot(x - f.x, z - f.z) < f.r + 0.03) return false;
	const pl = G.pathIdx.near(x, z, 2);
	for (let q = 0; q < G.pathIdx.n; q++) if (pl[q].line !== L && pl[q].d < pl[q].line.hw + 0.06) return false;
	for (const A of G.lobes) {
		const dx = x - A.x, dz = z - A.z;
		const t = dx * A.t[0] + dz * A.t[1], o = dx * A.n[0] + dz * A.n[1];
		if (o < -0.5 || Math.abs(t) > A.lobe[0] + 0.05) continue;
		if (Math.pow(Math.abs(t) / (A.lobe[0] + 0.05), 3) + Math.pow(Math.max(0, o) / (A.lobe[1] + 0.05), 3) < 1) return false;
	}
	return true;
}
function gr_edging(G, L) {
	const n = L.P.length;
	const r = chance('gr-edging', L.id);
	for (const sd of [1, -1]) {
		const off = L.edge === 'cobble' ? L.hw + 0.075 : L.hw + 0.016;
		// the edge's points and whether each is free
		const E = [];
		for (let i = 0; i < n; i++) {
			const [x, z] = L.P[i];
			const [nx, nz] = gr_normal(L.P, i, L.closed);
			const ex = x + nx * off * sd, ez = z + nz * off * sd;
			const inBridge = G.bridges.some((b) => b.line === L && i >= b.i0 && i <= b.i1);
			E.push({ x: ex, z: ez, y: L.Y[i], ok: !inBridge && gr_edgeFree(G, L, ex, ez), t: [-nz * sd, nx * sd] });
		}
		const order = [...Array(n).keys()];
		if (L.closed) order.push(0);
		// runs of free points
		const runs = [];
		let cur = [];
		for (const i of order) {
			if (E[i].ok) cur.push(E[i]);
			else {
				if (cur.length > 1) runs.push(cur);
				cur = [];
			}
		}
		if (cur.length > 1) runs.push(cur);
		for (const run of runs) {
			if (L.edge === 'cobble') {
				// river cobbles set close along the edge, half sunk
				const S = gr_arc(run.map((p) => [p.x, p.z]));
				for (let s = 0.1; s < S[S.length - 1] - 0.08; ) {
					const len = between(r, 0.17, 0.23);
					const i = gr_index(S, s + len / 2);
					const p = run[i];
					const tx = p.t[0], tz = p.t[1];
					const ry = Math.atan2(-tz, tx) + (r() - 0.5) * 0.3;
					const h = between(r, 0.1, 0.13);
					gr_rock(G, 'cobble', Math.floor(r() * 4), p.x, p.y + 0.055 - h / 2, p.z, [len / 2, h / 2, between(r, 0.055, 0.068)], ry, (r() - 0.5) * 0.15, (r() - 0.5) * 0.15);
					s += len + 0.025;
				}
				continue;
			}
			// oak boards, 2.4 m each, a hair's gap between
			const S = gr_arc(run.map((p) => [p.x, p.z]));
			const total = S[S.length - 1];
			const pieces = Math.max(1, Math.round(total / 2.4));
			for (let k = 0; k < pieces; k++) {
				const s0 = (k / pieces) * total + 0.004, s1 = ((k + 1) / pieces) * total - 0.004;
				const pts = [];
				const at3 = (s) => {
					const i = Math.min(run.length - 2, Math.max(0, gr_index(S, s) - (S[gr_index(S, s)] > s ? 1 : 0)));
					const t = clamp((s - S[i]) / (S[i + 1] - S[i] || 1));
					return [lerp(run[i].x, run[i + 1].x, t), lerp(run[i].y, run[i + 1].y, t), lerp(run[i].z, run[i + 1].z, t)];
				};
				pts.push(at3(s0));
				for (let i = 0; i < run.length; i++) if (S[i] > s0 + 0.05 && S[i] < s1 - 0.05) pts.push([run[i].x, run[i].y, run[i].z]);
				pts.push(at3(s1));
				G.bag.add('gr-board', gr_sweep(pts, gr_BOARD, { tile: TILE['gr-board'], caps: true }));
			}
		}
	}
}

/** THE PLAZA: flags from the kerb to the façade, a hole for the spring's bowl and its rill; the kerb; the steps */
function gr_buildPlaza(G) {
	const xa = meets((x) => edgeZ(0, x) + 0.25, gr_TR), xf = meets((x) => facadeZ(0, x) + 0.1, gr_TR);
	const pts = [];
	for (let x = -xa; x <= xa + 1e-6; x += (2 * xa) / Math.ceil((2 * xa) / 0.5)) {
		const f = gr_edgeFrame(x);
		pts.push([f.x - f.n[0] * 0.25, f.z - f.n[1] * 0.25]);
	}
	const arc = (a0, a1) => {
		const k = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.02));
		for (let q = 1; q < k; q++) pts.push(polar(gr_TR, lerp(a0, a1, q / k)));
	};
	const za = edgeZ(0, xa) + 0.25, zf = facadeZ(0, xf) + 0.1;
	arc(Math.atan2(xa, za), Math.atan2(xf, zf));
	for (let x = xf; x >= -xf - 1e-6; x -= (2 * xf) / Math.ceil((2 * xf) / 0.5)) pts.push([x, facadeZ(0, x) + 0.1]);
	arc(Math.atan2(-xf, zf), Math.atan2(-xa, za));
	// the spring: its bowl and its rill, cut out of the flags
	const sp = gr_spring();
	const hole = [[0.205, sp.zLip + 0.42]];
	const zc = sp.z - Math.sqrt(0.6 * 0.6 - 0.205 * 0.205);
	hole.push([0.205, zc]);
	const a0 = Math.atan2(0.205, zc - sp.z);
	for (let k = 1; k < 24; k++) {
		const a = lerp(a0, -a0, k / 24);
		hole.push([Math.sin(a) * 0.6, sp.z + Math.cos(a) * 0.6]);
	}
	hole.push([-0.205, zc], [-0.205, sp.zLip + 0.42]);
	const shape = shapeOf(pts.map(([x, z]) => [x, -z]), [hole.map(([x, z]) => [x, -z])]);
	const g = new THREE.ShapeGeometry(shape, 1);
	g.rotateX(-Math.PI / 2);
	g.translate(0, gr_PLAZA_Y, 0);
	G.bag.add('gr-flag', g, null, { uv: 'box', chunk: false });
	// the kerb: limestone blocks of about 1.1 m along the curved front, a bullnose on the garden side
	const prof = [[-0.3, -0.55], [0, -0.55]];
	for (let k = 0; k <= 4; k++) {
		const a = (k / 4) * (Math.PI / 2);
		prof.push([-0.045 + 0.045 * Math.cos(a), gr_KERB_Y - 0.045 + 0.045 * Math.sin(a)]);
	}
	for (let k = 0; k <= 2; k++) {
		const a = Math.PI / 2 + (k / 2) * (Math.PI / 2);
		prof.push([-0.288 + 0.012 * Math.cos(a), gr_KERB_Y - 0.012 + 0.012 * Math.sin(a)]);
	}
	const xk = meets((x) => edgeZ(0, x), R - 0.15);
	const line = [];
	for (let x = -xk; x <= xk + 1e-6; x += 0.1) line.push([x, edgeZ(0, x)]);
	const S = gr_arc(line);
	const total = S[S.length - 1];
	const blocks = [];
	let s = 0;
	const r = chance('gr-kerb');
	while (s < total - 0.05) {
		const len = Math.min(total - s, between(r, 0.95, 1.25));
		blocks.push([s, s + len]);
		s += len;
	}
	const sMid = S[gr_index(line.map((p) => p[0]), 0)];
	for (let [s0, s1] of blocks) {
		// the rill's spout stone takes the middle
		const xs0 = line[gr_index(S, s0)][0], xs1 = line[gr_index(S, s1)][0];
		if (xs1 > -0.225 && xs0 < 0.225) {
			if (xs0 < -0.225) s1 = sMid - 0.226;
			else if (xs1 > 0.225) s0 = sMid + 0.226;
			else continue;
		}
		const point = (s) => {
			const i = Math.min(line.length - 2, Math.max(0, gr_index(S, s) - (S[gr_index(S, s)] > s ? 1 : 0)));
			const t = clamp((s - S[i]) / (S[i + 1] - S[i]));
			return [lerp(line[i][0], line[i + 1][0], t), lerp(line[i][1], line[i + 1][1], t)];
		};
		// a block is straight (the curve bows 1.5 mm over its length): one shape for each length, laid along its chord
		const p0 = point(s0 + 0.003), p1 = point(s1 - 0.003);
		const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
		const tpl = gr_tpl(G, 'limestone', 'kerb', () => gr_sweep([[-0.55, 0, 0], [0.55, 0, 0]], prof, { caps: true }));
		G.batch.add('limestone', tpl, at((p0[0] + p1[0]) / 2, 0, (p0[1] + p1[1]) / 2, Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), [len / 1.1, 1, 1]));
	}
	// the mortar in the kerb's joints: a core a little inside its blocks, the length of the kerb (but the spout)
	for (const [xa0, xa1] of [[-xk, -0.23], [0.23, xk]]) {
		const pts = [];
		const k = Math.ceil((xa1 - xa0) / 0.5);
		for (let q = 0; q <= k; q++) {
			const x = lerp(xa0, xa1, q / k);
			pts.push([x, 0, edgeZ(0, x)]);
		}
		G.bag.add('limestone', gr_sweep(pts, [[-0.29, -0.5], [-0.007, -0.5], [-0.007, gr_KERB_Y - 0.01], [-0.29, gr_KERB_Y - 0.01]], { tile: TILE.limestone }), null, { chunk: false });
	}
	// the steps: two rounded limestone slabs below the kerb where each path arrives
	for (const A of G.arrivals) {
		const ry = Math.atan2(-A.n[0], -A.n[1]);
		for (const [j, a, b] of [[1, A.hw + 0.75, 0.5], [2, A.lobe[0], A.lobe[1]]]) {
			const top = gr_KERB_Y - j * gr_RISE, bottom = gr_ARRIVE_Y - 0.22;
			const P = [];
			for (let k = 0; k <= 28; k++) {
				const ph = (k / 28) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph);
				P.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3), b * Math.pow(sn, 2 / 3)]);
			}
			P.push([-a, -0.06], [a, -0.06]);
			const geo = extrude(shapeOf(P), top - bottom - 0.002, 0.018, 3, 28);
			geo.rotateX(-Math.PI / 2);
			geo.translate(0, bottom, 0);
			G.bag.add('limestone', geo, at(A.x, 0, A.z, ry), { uv: 'box' });
		}
	}
	// the aprons inside the gates: a slab of flags, its top the doorway's floor, its edges eased, rounding into the path
	for (const A of G.aprons) {
		const [a, b] = A.lobe;
		const P = [];
		for (let k = 0; k <= 36; k++) {
			const ph = (k / 36) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph);
			P.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3), b * Math.pow(sn, 2 / 3)]);
		}
		P.push([-a, 0.05], [a, 0.05]);
		const geo = extrude(shapeOf(P), 0.12, 0.012, 2, 36);
		geo.rotateX(-Math.PI / 2);
		geo.translate(0, gr_APRON_Y - 0.12, 0);
		G.bag.add('gr-flag', geo, at(A.x, 0, A.z, Math.atan2(-A.n[0], -A.n[1])), { uv: 'box' });
	}
}

/** the spring's measures: its bowl in the plaza, the rill to the kerb, its lip */
function gr_spring() {
	const zEdge = edgeZ(0, 0);
	return { z: zEdge + 1.35, zLip: zEdge - 0.07, zEdge };
}
/** THE SPRING: a round limestone bowl brimming in the plaza, a rill in a stone channel to the kerb, where the water
 *  pours over a lip into the basin below, the brook's head */
function gr_buildSpring(G) {
	const sp = gr_spring();
	// the channel: a U of limestone from the lip into the bowl's notch, its top 2 cm proud of the flags
	const U = [[-0.22, -0.5], [0.22, -0.5], [0.22, 0.14], [0.11, 0.14], [0.11, 0.06], [-0.11, 0.06], [-0.11, 0.14], [-0.22, 0.14]];
	const len = sp.z - 0.5 - sp.zLip;
	const ch = extrude(shapeOf(U), len, 0.008, 2, 4);
	ch.translate(0, 0, sp.zLip);
	G.bag.add('limestone', ch, null, { uv: 'box', chunk: false });
	// the bowl: a lathe with a gap for the channel, a bullnosed rim
	// (its hollow whole, its lip a weir where the rill leaves; its rim broken there for the channel's walls)
	const hollow = [[0.0, -0.06], [0.2, -0.055], [0.36, -0.025], [0.46, 0.05], [0.5, 0.115], [0.52, 0.12]];
	const rim = [[0.5, 0.115], [0.512, 0.134], [0.535, 0.145], [0.585, 0.143], [0.612, 0.13], [0.622, 0.1], [0.622, -0.2]];
	for (const [prof, a0, len] of [[hollow, 0, TAU], [rim, Math.PI + 0.3, TAU - 0.6]]) {
		const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40, a0, len);
		scaleUV(g, (TAU * 0.6) / TILE.limestone, 0.5 / TILE.limestone);
		G.bag.add('limestone', g, at(0, 0, sp.z), { chunk: false });
	}
	// its water, welling up, and the rill's
	const wb = new THREE.CircleGeometry(0.5, 32);
	wb.rotateX(-Math.PI / 2);
	G.bag.add('water', wb, at(0, 0.118, sp.z), { uv: 'box', chunk: false });
	const wr = new THREE.PlaneGeometry(0.22, sp.z - 0.42 - sp.zLip);
	wr.rotateX(-Math.PI / 2);
	G.bag.add('water', wr, at(0, 0.09, (sp.z - 0.42 + sp.zLip) / 2), { uv: 'box', chunk: false });
	// the fall: a sheet curving off the lip down to the basin, seen from both sides
	const yTop = 0.09, yEnd = gr_SPRING_W - 0.01;
	const pos = [], idx = [];
	const K = 10;
	for (let k = 0; k <= K; k++) {
		const t = k / K;
		const z = sp.zLip - 0.01 - 0.26 * t, y = yTop - (yTop - yEnd) * t * t;
		const w = 0.1 + 0.03 * t;
		pos.push(-w, y, z, w, y, z);
	}
	for (let k = 0; k < K; k++) {
		const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
		idx.push(a, c, b, b, c, d, a, b, c, b, d, c);
	}
	const fall = new THREE.BufferGeometry();
	fall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	fall.setIndex(idx);
	fall.computeVertexNormals();
	G.bag.add('water', fall, null, { uv: 'box', chunk: false });
}

/** THE BRIDGES: small arched oak bridges — two curved stringers, planks across, posts, a curved handrail and slats,
 *  limestone sills under their ends, boulders at their corners */
function gr_buildBridges(G) {
	const r = chance('forest-dome', 'bridges');
	for (const b of G.bridges) {
		const { A, L, u, v, yA, yB } = b;
		// the deck's top: level with the gravel's crown at each end, arched up to 20 cm (no steeper than 1 in 6.5)
		const rise = Math.min(0.2, (L * 0.155) / Math.PI);
		const deck = (s) => lerp(yA, yB, clamp(s / L)) + 0.035 + rise * Math.sin(Math.PI * clamp(s / L));
		const P = (s, o, y) => [A[0] + u[0] * s + v[0] * o, y, A[1] + u[1] * s + v[1] * o];
		const ry = Math.atan2(-u[1], u[0]);
		// planks
		// (lying 30 cm onto the gravel at each end, level with it, so the way runs on without a gap or a step)
		const n = Math.round((L + 0.6) / 0.162);
		for (let k = 0; k < n; k++) {
			const s = -0.3 + ((k + 0.5) * (L + 0.6)) / n;
			const slope = (deck(s + 0.05) - deck(s - 0.05)) / 0.1;
			const [x, , z] = P(s, (r() - 0.5) * 0.01, 0);
			// across the deck, its grain along its length, tipped to the arch
			gr_box(G, 'timber', 1.56, 0.045, 0.148, 0.01, at(x, deck(s) - 0.0225, z, ry + Math.PI / 2, 1, -Math.atan(slope)));
		}
		// stringers and rails
		const along = (s0, s1, o, dy, k = 24) => Array.from({ length: k + 1 }, (_, q) => {
			const s = lerp(s0, s1, q / k);
			return P(s, o, deck(s) + dy);
		});
		// under the boards, a sub-deck of planks laid along, a centimetre under their tops: the joints between the
		// boards read as dark grooves and the deck is whole underfoot from end to end
		G.bag.add('timber', gr_sweep(along(-0.3, L + 0.3, 0, 0, 32), [[-0.76, -0.034], [0.76, -0.034], [0.76, -0.012], [-0.76, -0.012]], { tile: TILE.timber, caps: true }));
		for (const sd of [-1, 1]) {
			G.bag.add('timber', gr_sweep(along(-0.3, L + 0.3, sd * 0.68, -0.045), gr_rr(0.09, 0.2, 0.015, 0, -0.1, 1), { tile: TILE.timber, caps: true }));
			G.bag.add('timber', gr_sweep(along(-0.02, L + 0.02, sd * 0.835, 0.98), gr_rr(0.075, 0.05, 0.02, 0, -0.025, 1), { tile: TILE.timber, caps: true }));
			G.bag.add('timber', gr_sweep(along(0.05, L - 0.05, sd * 0.835, 0.1), gr_rr(0.045, 0.05, 0.012, 0, 0, 1), { tile: TILE.timber, caps: true }));
			const posts = [0.06, L / 2, L - 0.06];
			for (const s of posts) {
				const [x, , z] = P(s, sd * 0.835, 0);
				const y0 = deck(s) - 0.22, y1 = deck(s) + 0.975;
				gr_box(G, 'timber', y1 - y0, 0.085, 0.085, 0.015, at(x, (y0 + y1) / 2, z, ry, 1, 0, Math.PI / 2));
			}
			for (let s = 0.16; s < L - 0.1; s += 0.105) {
				if (posts.some((q) => Math.abs(q - s) < 0.08)) continue;
				const [x, , z] = P(s, sd * 0.835, 0);
				const y0 = deck(s) + 0.125, y1 = deck(s) + 0.955;
				const h = Math.round((y1 - y0) * 100) / 100;
				G.batch.add('timber', gr_tpl(G, 'timber', `slat${h}`, () => box(h, 0.04, 0.02)), at(x, (y0 + y1) / 2, z, ry, 1, 0, Math.PI / 2));
			}
		}
		// sills under the ends, boulders at the corners
		for (const [s, y] of [[0, yA], [L, yB]]) {
			const [x, , z] = P(s, 0, 0);
			gr_box(G, 'limestone', 1.9, 0.38, 0.46, 0.04, at(x, y - 0.2 - 0.19, z, ry + Math.PI / 2));
			for (const sd of [-1, 1]) {
				const [bx, , bz] = P(s + (s ? 0.25 : -0.25), sd * 1.18, 0);
				const size = between(r, 0.5, 0.7);
				gr_rock(G, 'round', Math.floor(r() * 8), bx, gr_hs(bx, bz) + size * 0.12, bz, [size / 2, size * 0.28, size * 0.38], r() * TAU, 0, 0);
			}
		}
	}
}

/** THE CLEARING: the pergola over the loop's north-east (posts on stone footings, curved beams, rafters, knee braces),
 *  the paved circle with its rim, its four curved benches */
function gr_buildClearing(G) {
	const loop = G.paths.loop;
	const n = loop.P.length;
	const H = 2.7;
	// posts, footings, braces
	const ring = (sd, i) => {
		const [x, z] = loop.P[(i + n) % n];
		let [nx, nz] = gr_normal(loop.P, (i + n) % n, true);
		if (nx * (x - gr_LOOP.x) + nz * (z - gr_LOOP.z) < 0) (nx = -nx), (nz = -nz);
		const o = (loop.hw + 0.32) * sd;
		return [x + nx * o, loop.Y[(i + n) % n] + H, z + nz * o, nx, nz];
	};
	const i0 = G.pergola[0].i - 6, i1 = G.pergola[G.pergola.length - 1].i + 6;
	for (const sd of [-1, 1]) {
		const line = [];
		for (let i = i0; i <= i1; i++) line.push(ring(sd, i).slice(0, 3));
		G.bag.add('timber', gr_sweep(line.map(([x, y, z]) => [x, y + 0.12, z]), gr_rr(0.11, 0.24, 0.02), { tile: TILE.timber, caps: true }));
	}
	for (const p of G.pergola) {
		for (const [q, sd] of [[p.inner, -1], [p.outer, 1]]) {
			const base = gr_hs(q.x, q.z);
			const top = ring(sd, p.i)[1];
			const [tx, tz] = gr_normal(loop.P, p.i, true);
			const ry = Math.atan2(tx, tz);
			gr_box(G, 'limestone', 0.28, 0.22, 0.28, 0.03, at(q.x, base, q.z, ry));
			const len = top - base - 0.1;
			gr_box(G, 'timber', 2.6, 0.14, 0.14, 0.02, at(q.x, (top + base + 0.1) / 2, q.z, ry, [len / 2.6, 1, 1], 0, Math.PI / 2));
			// knee braces along the beam, both ways: 45 cm out, 52 cm down
			for (const dir of [-1, 1]) {
				const e = ring(sd, p.i + dir * 2);
				const ex = e[0] - q.x, ez = e[2] - q.z, el = Math.hypot(ex, ez);
				gr_beam(G, 'timber', [q.x, top - 0.53, q.z], [q.x + (ex / el) * 0.45, top - 0.01, q.z + (ez / el) * 0.45], 0.07, 0.07, 0.012);
			}
		}
	}
	// rafters across, every other point of the loop
	for (let i = i0 + 1; i < i1; i += 2) {
		const a = ring(-1, i), b = ring(1, i);
		const ux = b[0] - a[0], uz = b[2] - a[2], l = Math.hypot(ux, uz);
		const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2, y = (a[1] + b[1]) / 2 + 0.24 + 0.075;
		gr_box(G, 'timber', l + 0.8, 0.15, 0.065, 0.02, at(cx, y, cz, Math.atan2(-uz / l, ux / l)));
	}
	// the paved circle and its rim
	{
		const rings = [0, 0.5, 1.1, 1.7, 2.1, 2.5, 2.8, gr_PAD.r - 0.1], NA = 72;
		const pos = [], col = [], uv = [], idx = [];
		for (let q = 0; q < rings.length; q++)
			for (let k = 0; k < (q ? NA : 1); k++) {
				const [dx, dz] = polar(rings[q], (k / NA) * TAU);
				const x = gr_PAD.x + dx, z = gr_PAD.z + dz;
				pos.push(x, gr_PAD.y + 0.05, z);
				uv.push(x / TILE['gr-flag'], z / TILE['gr-flag']);
				const m = vnoise(x / 1.3 + 9, z / 1.3 + 9, 8192, 8192, 551);
				// worn paler where feet go round the middle, darker and mossier toward the rim and under the benches
				const rim = smooth((rings[q] - 1.8) / 1.2);
				const c = (0.84 + 0.2 * m) * (1 - 0.22 * rim);
				col.push(c * (1 - 0.06 * rim), c, c * (1 - 0.12 * rim));
			}
		for (let k = 0; k < NA; k++) idx.push(0, 1 + k, 1 + ((k + 1) % NA));
		for (let q = 1; q + 1 < rings.length; q++)
			for (let k = 0; k < NA; k++) {
				const a = 1 + (q - 1) * NA + k, b = 1 + (q - 1) * NA + ((k + 1) % NA), c = a + NA, d = b + NA;
				idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		G.bag.add('gr-flag', g, null, { colour: true });
	}
	const rim = [];
	for (let k = 0; k < 72; k++) {
		const [x, z] = polar(gr_PAD.r - 0.065, (-k / 72) * TAU);
		rim.push([gr_PAD.x + x, gr_PAD.y - 0.032, gr_PAD.z + z]);
	}
	G.bag.add('limestone', gr_sweep(rim, gr_rr(0.13, 0.2, 0.025, 0, 0, 2), { tile: TILE.limestone, closed: true }));
	// the benches: play's own curved oak bench (bent to 2.2 m, its hollow toward its +z), four round the circle, facing in
	if (typeof THINGS !== 'undefined' && THINGS['bench-oak-curved'])
		for (const deg of gr_BENCHES) {
			const a = (deg * Math.PI) / 180;
			const [x, z] = polar(2.2, a);
			G.dome.place('bench-oak-curved', gr_PAD.x + x, gr_PAD.y + 0.05, gr_PAD.z + z, { turn: a + Math.PI });
		}
}

/** THE LOGS: old trunks lying half sunk, bark round them, their cut ends showing the wood, a broken branch or two */
function gr_buildLogs(G) {
	const r = chance('forest-dome', 'logs');
	for (const log of G.logs) {
		const seg = 12, rings = Math.max(4, Math.ceil(log.len / 0.25));
		const p1 = r() * TAU, p2 = r() * TAU;
		const pos = [], uv = [], idx = [];
		const rad = (u, a) => log.r * (1 - 0.16 * u) * (1 + 0.05 * Math.sin(a * 3 + p1 + u * 5) + 0.035 * Math.sin(a * 5 + p2 - u * 8));
		for (let i = 0; i <= rings; i++) {
			const u = i / rings, x = (u - 0.5) * log.len;
			const sag = 0.03 * Math.sin(u * Math.PI);
			for (let j = 0; j <= seg; j++) {
				const a = Math.PI + (j / seg) * TAU;
				const rr = rad(u, a);
				pos.push(x, Math.cos(a) * rr + sag, Math.sin(a) * rr);
				uv.push((u * log.len) / TILE.bark, ((j / seg) * TAU * log.r) / TILE.bark);
			}
		}
		for (let i = 0; i < rings; i++)
			for (let j = 0; j < seg; j++) {
				const a = i * (seg + 1) + j, b = a + seg + 1, c = a + 1, d = b + 1;
				idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setIndex(idx);
		g.computeVertexNormals();
		const y = Math.min(gr_hs(log.ax, log.az), gr_hs(log.bx, log.bz), gr_hs(log.x, log.z)) + log.r * 0.5;
		const m = at(log.x, y, log.z, Math.atan2(-(log.bz - log.az), log.bx - log.ax), 1, 0, Math.atan2(gr_hs(log.bx, log.bz) - gr_hs(log.ax, log.az), log.len) * 0.6);
		G.bag.add('bark', g, m);
		// the cut ends, a little domed, the wood's rings
		for (const [u, sgn] of [[0, -1], [1, 1]]) {
			const rr = log.r * (1 - 0.16 * u) * 0.97;
			const cap = lathe([[0, 0.012], [rr * 0.6, 0.008], [rr, 0]], seg, TILE.timber);
			cap.rotateZ(-sgn * Math.PI / 2);
			cap.translate((u - 0.5) * log.len, 0, 0);
			G.bag.add('timber', cap, m);
		}
		// a broken branch stub
		if (r() < 0.7) {
			const u = between(r, 0.25, 0.75), a = between(r, 0.4, 1.4) * (r() < 0.5 ? 1 : -1);
			const x = (u - 0.5) * log.len, rr = rad(u, a);
			const st = bar([x, Math.cos(a) * rr * 0.8, Math.sin(a) * rr * 0.8], [x + 0.06, Math.cos(a) * (rr + 0.16), Math.sin(a) * (rr + 0.16)], 0.045, 0.028, 8);
			scaleUV(st, 1 / TILE.bark);
			G.bag.add('bark', st, m);
		}
	}
	// the trellises: two bark posts and a pole across, for the passion fruit's wire
	for (const f of G.frames) {
		const y = gr_hs(f.x, f.z);
		const [tx, tz] = f.t;
		const post = (s) => {
			const x = f.x + tx * s, z = f.z + tz * s;
			const g = bar([x, gr_hs(x, z) - 0.3, z], [x + (r() - 0.5) * 0.04, y + 2.12, z + (r() - 0.5) * 0.04], 0.065, 0.052, 10);
			scaleUV(g, 1 / TILE.bark);
			G.bag.add('bark', g);
		};
		post(-1.55);
		post(1.55);
		const pole = bar([f.x - tx * 1.75, y + 1.98, f.z - tz * 1.75], [f.x + tx * 1.75, y + 2.0, f.z + tz * 1.75], 0.048, 0.042, 10);
		scaleUV(pole, 1 / TILE.bark);
		G.bag.add('bark', pole);
	}
}

/* ================================================================================================================
 * 5.5 THE PART — laid out, planted, built
 * ================================================================================================================ */

function groundPart(dome) {
	const bag = dome.bag('ground');
	const G = (gr_G = { dome, bag, batch: new gr_Batch(bag), tpls: new Map(), r: chance('forest-dome', 'forest'), plants: [], canopy: [], ph: new Map(), count: {}, layers: {} });
	G.keep = (dome.keep ?? []).map((k) => (Array.isArray(k) ? { x: k[0], z: k[1], r: k[2] } : k));
	gr_PAD.y = gr_nat0(gr_PAD.x, gr_PAD.z);
	const steps = [
		// laid out: the brook, the paths and their bridges, the stepping stones, what stands, the bigger stones
		[gr_layBrook, gr_layPaths, gr_laySide, gr_planStructures, gr_planRocks],
		// planted: the canopy, bananas by the water, each tree's guild, the climbers, the logs and their mushrooms, the low
		// trees and the shrubs in the gaps, the herbs and the ground along the paths; the gates' views cleared; trellises
		[gr_plantCanopy, gr_shadeGrid, gr_plantBananas, gr_plantGuilds, gr_plantClimbers, gr_plantLogs, gr_plantLow, gr_shadeGrid, gr_plantEdges, gr_clearViews, gr_moreFrames, gr_shadeGrid],
		// built
		[gr_protos, gr_buildFloor, gr_buildBrook, gr_buildPond, gr_buildRocks, gr_buildPaths, gr_buildPlaza, gr_buildSpring, gr_buildBridges, gr_buildClearing, gr_buildLogs]
	];
	for (const step of steps.flat()) step(G);
	G.batch.flush();
	// what the others must keep clear of in the garden: the structures, the logs, the pergola
	for (const c of G.struct.all) if (c.r >= 0.5) dome.keep.push({ x: (c.ax + c.bx) / 2, z: (c.az + c.bz) / 2, r: c.r + Math.hypot(c.bx - c.ax, c.bz - c.az) / 2 });
	gr_G = null;
}

/* ================================================================================================================
 * 6. BUILDING — the north quarter: its slabs and indoor terraces, the curved glass façades, the rooms' walls and
 *    doors, the two spiral stairs, the grand stair up the terraces and the sky garden on the roof
 * ================================================================================================================ */

const { toCreasedNormals: bd_creased } = require('three/addons/utils/BufferGeometryUtils.js');

/**
 * the shell's inner face (the shell is R − 0.4 … R: its closed panels' inner skin at R − 0.27, their relief folding in
 * to R − 0.47) and how far what meets it runs in: to the skin, so it butts the relief and never shows through a
 * window's reveal; the joints of a slab with the shell a little further, behind the skin (bd_DEEP)
 */
const bd_IN = R - 0.4;
const bd_SINK = 0.13;
const bd_DEEP = 0.2;
/** the plan radius of the shell's inner face at height y (sunk into by e), and its height over a plan radius r */
const bd_inR = (y, e = bd_SINK) => Math.sqrt(Math.max(0, (bd_IN + e) ** 2 - y * y));
const bd_inY = (r, e = bd_SINK) => Math.sqrt(Math.max(0, (bd_IN + e) ** 2 - r * r));
/** level k's floor and ceiling; level 4 is the roof, the sky garden's deck */
const bd_floor = (k) => (k === 0 ? 0.12 : k < 4 ? LEVELS[k].y : ROOF);
const bd_ceil = (k) => (k < 3 ? LEVELS[k + 1].y : ROOF) - SLAB;
/** the curve (its `g`) a level's floor ends on at the front: the façade of the level below, the plaza's edge on the ground */
const bd_edgeG = (k) => (k === 0 ? LEVELS[0].g - PLAZA : LEVELS[k - 1].g);
/** the terrace rail: its upstand's top, the slats' middles and the handrail's middle, over the floor */
const bd_UP = 0.23;
const bd_SLATS = [0.345, 0.49, 0.635, 0.78, 0.925];
const bd_HAND = 1.03;

/* ---- the façade's family of curves: z = g − x²/2ρ, and shapes laid along one ---- */

/** a point of the curve z = g − x²/2ρ at x, `o` metres in from it (north, away from the garden): [x, z] */
function bd_on(g, x, o = 0) {
	const l = Math.hypot(1, x / RHO);
	return [x + (x / RHO / l) * o, g - (x * x) / (2 * RHO) + o / l];
}
/** the turn round y that lays a shape's +x along the curve (east) and its +z in (north) at x */
const bd_turn = (x) => Math.atan2(x / RHO, 1);
/** the matrix of a place on the curve: x along it, `o` in from it, at height y */
const bd_at = (g, x, y, o = 0) => {
	const [px, pz] = bd_on(g, x, o);
	return at(px, y, pz, bd_turn(x));
};
/** where (x ≥ 0) the curve, `o` in, meets a circle of plan radius r round the dome's middle */
function bd_meet(g, o, r) {
	let lo = 0, hi = r;
	for (let i = 0; i < 44; i++) {
		const m = (lo + hi) / 2, [x, z] = bd_on(g, m, o);
		if (x * x + z * z < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/**
 * A shape built straight (its x along, y up, z in) bent onto the curve: each point to the curve at its x, its z in
 * from it, its normal turned with it. Long shapes must have points along x to bend.
 */
function bd_bend(geo, g) {
	const p = geo.attributes.position, n = geo.attributes.normal;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), o = p.getZ(i);
		const l = Math.hypot(1, x / RHO), ax = 1 / l, az = -x / RHO / l;
		p.setXYZ(i, x - az * o, y, g - (x * x) / (2 * RHO) + ax * o);
		if (n) {
			const a = n.getX(i), c = n.getZ(i);
			n.setXYZ(i, a * ax - c * az, n.getY(i), a * az + c * ax);
		}
	}
	p.needsUpdate = true;
	return geo;
}

/* ---- geometry from points ---- */

/** the normal of a quad a b c d (by its diagonals, so a quad with a side of no length still has one) */
function bd_qn(a, b, c, d) {
	const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
	const vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
	return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
/** triangles gathered as numbers, made a geometry with creased normals (smooth over soft turns, sharp at edges) */
class bd_Soup {
	constructor() {
		this.p = [];
	}
	tri(a, b, c) {
		this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
	}
	/** a quad, its corners in turn, facing `toward` (a direction) where given, else as wound */
	quad(a, b, c, d, toward) {
		if (toward) {
			const n = bd_qn(a, b, c, d);
			if (n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0) {
				this.tri(a, c, b);
				this.tri(a, d, c);
				return;
			}
		}
		this.tri(a, b, c);
		this.tri(a, c, d);
	}
	/** a triangle facing `toward` */
	face(a, b, c, toward) {
		const n = bd_qn(a, b, c, c);
		if (n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0) this.tri(a, c, b);
		else this.tri(a, b, c);
	}
	geometry(crease = 0.7) {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
		return bd_creased(g, crease);
	}
}

/**
 * A surface swept along a path: `rows` of points, each row the profile placed at one point of the path. Indexed,
 * smooth, its UVs u along the path and v round the profile in metres over `tile`; turned so it faces away from the
 * profile's middle (`face` 1), or toward it (−1), or as wound (0).
 */
function bd_grid(rows, tile = 1, face = 1, closed = false, caps = []) {
	const n = rows.length, m = rows[0].length + (closed ? 1 : 0);
	const extra = caps.reduce((t, c) => t + c.pts.length, 0);
	const pos = new Float32Array((n * m + extra) * 3), uv = new Float32Array((n * m + extra) * 2);
	const idx = [];
	let along = 0;
	for (let i = 0; i < n; i++) {
		const r = rows[i];
		if (i) {
			const a = rows[i - 1][0], b = r[0];
			along += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
		}
		let round = 0;
		for (let j = 0; j < m; j++) {
			const p = r[j % r.length];
			if (j) {
				const q = r[j - 1];
				round += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
			}
			pos.set(p, (i * m + j) * 3);
			uv[(i * m + j) * 2] = along / tile;
			uv[(i * m + j) * 2 + 1] = round / tile;
		}
	}
	for (let i = 0; i < n - 1; i++)
		for (let j = 0; j < m - 1; j++) {
			const a = i * m + j, b = a + 1, c = a + m, d = c + 1;
			idx.push(a, b, c, b, d, c);
		}
	if (face) {
		// which way the first row's first faces look, against the way out from the profile's middle
		const r = rows[0], k = Math.floor(r.length / 3);
		const mid = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length, s[2] + p[2] / r.length], [0, 0, 0]);
		const a = rows[0][k], b = rows[0][k + 1], c = rows[1][k];
		const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
		const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
		const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
		const out = nx * (a[0] - mid[0]) + ny * (a[1] - mid[1]) + nz * (a[2] - mid[2]);
		if (out * face < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
	}
	// flat caps (their own points, so their normals stay flat), each triangle facing its cap's way
	let at = n * m;
	for (const c of caps) {
		c.pts.forEach((p, i) => pos.set(p, (at + i) * 3));
		for (const [a, b, d] of c.tris) {
			const A = c.pts[a], B = c.pts[b], D = c.pts[d];
			const q = bd_qn(A, B, D, D);
			if (q[0] * c.dir[0] + q[1] * c.dir[1] + q[2] * c.dir[2] < 0) idx.push(at + a, at + d, at + b);
			else idx.push(at + a, at + b, at + d);
		}
		at += c.pts.length;
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

/**
 * A profile ([n, y] points round a closed or open outline) swept upright along a path ([x, y, z] points): n across
 * the path (level, to its right), y up. With `caps`, its two ends closed flat.
 */
function bd_sweep(path, prof, o = {}) {
	const rows = [];
	for (let i = 0; i < path.length; i++) {
		const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], p = path[i];
		let tx = b[0] - a[0], tz = b[2] - a[2];
		const l = Math.hypot(tx, tz) || 1;
		tx /= l;
		tz /= l;
		// to the right of the way along (seen from above, x east and z north)
		const nx = tz, nz = -tx;
		rows.push(prof.map(([u, v]) => [p[0] + nx * u, p[1] + v, p[2] + nz * u]));
	}
	const caps = [];
	if (o.caps) {
		const tris = THREE.ShapeUtils.triangulateShape(prof.map(([u, v]) => new THREE.Vector2(u, v)), []);
		for (const [r, e] of [[rows[0], -1], [rows[rows.length - 1], 1]]) {
			const i0 = e < 0 ? 0 : path.length - 2;
			caps.push({ pts: r, tris, dir: [(path[i0 + 1][0] - path[i0][0]) * e, (path[i0 + 1][1] - path[i0][1]) * e, (path[i0 + 1][2] - path[i0][2]) * e] });
		}
	}
	return bd_grid(rows, o.tile ?? 1, o.face ?? 1, o.closed ?? true, caps);
}
/** a closed profile: a rounded rectangle w (across) × h (up), its middle at [u, v] */
const bd_rr = (w, h, r, u = 0, v = 0, seg = 2) => roundRect(w, h, r, seg).map(([a, b]) => [a + u, b + v]);

/**
 * A rounded slab: a closed outline ([u, v] points, any turn) given thickness t across w (0 … t), its edges rounded by
 * r, each point mapped to the world by `place(u, v, w)` ([x, y, z]); creased normals. For treads, landings, leaves,
 * strings and planters: anything flat with soft edges.
 */
function bd_slab(outline, t, r, place, seg = 2) {
	// the outline counter-clockwise, and each point's way out (the mean of its sides' normals)
	let pts = outline.slice();
	let area = 0;
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i + 1) % pts.length];
		area += a[0] * b[1] - b[0] * a[1];
	}
	if (area < 0) pts.reverse();
	const n = pts.length;
	const out = pts.map((p, i) => {
		const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
		let dx = b[0] - a[0], dy = b[1] - a[1];
		const l = Math.hypot(dx, dy) || 1;
		return [dy / l, -dx / l];
	});
	// the edge rounded: the outline drawn in by `inset` at depth `w`, a quarter round at each face
	const rr = Math.min(r, t / 2);
	const prof = [];
	for (let s = 0; s <= seg; s++) {
		const a = (Math.PI / 2) * (s / seg);
		prof.push([rr - rr * Math.sin(a), rr - rr * Math.cos(a)]);
	}
	for (let s = 0; s <= seg; s++) {
		const a = (Math.PI / 2) * (s / seg);
		prof.push([rr - rr * Math.cos(a), t - rr + rr * Math.sin(a)]);
	}
	const soup = new bd_Soup();
	const P = (i, inset, w) => place(pts[i][0] - out[i][0] * inset, pts[i][1] - out[i][1] * inset, w);
	for (let k = 0; k < prof.length - 1; k++)
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			const [i0, w0] = prof[k], [i1, w1] = prof[k + 1];
			const q = [P(i, i0, w0), P(j, i0, w0), P(j, i1, w1), P(i, i1, w1)];
			const m = place(pts[i][0], pts[i][1], (w0 + w1) / 2), mo = place(pts[i][0] + out[i][0], pts[i][1] + out[i][1], (w0 + w1) / 2);
			soup.quad(q[0], q[1], q[2], q[3], [mo[0] - m[0], mo[1] - m[1], mo[2] - m[2]]);
		}
	// the two faces, the outline drawn in by r
	const flat = pts.map((p, i) => new THREE.Vector2(p[0] - out[i][0] * rr, p[1] - out[i][1] * rr));
	const tris = THREE.ShapeUtils.triangulateShape(flat, []);
	for (const [w, s] of [[0, -1], [t, 1]]) {
		const c0 = place(0, 0, w), c1 = place(0, 0, w + s);
		const dir = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]];
		for (const [a, b, c] of tris) {
			const A = place(flat[a].x, flat[a].y, w), B = place(flat[b].x, flat[b].y, w), C = place(flat[c].x, flat[c].y, w);
			soup.face(A, B, C, dir);
		}
	}
	return soup.geometry(0.5);
}

/** a flat outline ([x, z] points, with holes) at height y facing up (or down): floors, decks and soffits */
function bd_flat(outline, holes, y, up = true) {
	const V = (p) => new THREE.Vector2(p[0], p[1]);
	const all = [outline, ...holes];
	// the outline counter-clockwise and the holes clockwise in (x, z), as triangulation wants them
	const cw = (p) => THREE.ShapeUtils.isClockWise(p.map(V));
	const loops = all.map((p, i) => ((i === 0) === cw(p) ? p.slice().reverse() : p));
	const tris = THREE.ShapeUtils.triangulateShape(loops[0].map(V), loops.slice(1).map((h) => h.map(V)));
	const pts = loops.flat();
	const pos = new Float32Array(pts.length * 3);
	pts.forEach((p, i) => pos.set([p[0], y, p[1]], i * 3));
	const idx = [];
	// each triangle turned to face up (its turn in x, z clockwise) or down
	for (const [a, b, c] of tris) {
		const A = pts[a], B = pts[b], C = pts[c];
		const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
		if (cross < 0 === up) idx.push(a, b, c);
		else idx.push(a, c, b);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
/** a profile ([r, y], absolute) turned round the dome's axis from bearing b0 to b1: what closes a slab to the shell */
function bd_revolve(prof, b0, b1, tile = 1, face = 1, closed = false) {
	const n = Math.max(2, Math.ceil(Math.abs(b1 - b0) / (Math.PI / 120)));
	const rows = [];
	for (let i = 0; i <= n; i++) {
		const b = b0 + ((b1 - b0) * i) / n;
		rows.push(prof.map(([r, y]) => [r * Math.sin(b), y, r * Math.cos(b)]));
	}
	return bd_grid(rows, tile, face, closed);
}
/** points of an arc: centre [cx, cy], radius r, from angle a0 to a1 (radians), n steps, as [x, y] (ends included) */
const bd_arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), cy + r * Math.sin(a0 + ((a1 - a0) * i) / n)]);
/** a profile without its first point (to join arcs end to end) */
const bd_tail = (p) => p.slice(1);

/* ---- 1. THE SLABS: floors, soffits, their rounded fronts, their holes for the stairs, and how they meet the shell ---- */

/**
 * A slab's front, in its own section (o in from the edge line, y up from the floor): the soffit, a bullnose of 0.18 m
 * round the front, the rail's upstand of 0.23 m rounded over, a small cove down to the floor. The floor starts at
 * o 0.02, the soffit at o 0.10. `flush`: no upstand (a landing's edge), its face on the edge line.
 */
const bd_EDGE = [[0.1, -0.35], [0.03, -0.35], ...bd_tail(bd_arc(0.03, -0.17, 0.18, -Math.PI / 2, -Math.PI, 5)), [-0.15, 0.16], ...bd_tail(bd_arc(-0.08, 0.16, 0.07, Math.PI, 0, 5)), [-0.01, 0.03], ...bd_tail(bd_arc(0.02, 0.03, 0.03, Math.PI, Math.PI * 1.5, 2))];
const bd_FLUSH = [...bd_arc(0.1, -0.25, 0.1, -Math.PI / 2, -Math.PI, 4), [0, -0.025], ...bd_tail(bd_arc(0.025, -0.025, 0.025, Math.PI, Math.PI / 2, 2))];
/** a section ([o, y]) as a sweep's profile ([n, y]: n to the right of a path that keeps the slab on its left) */
const bd_side = (prof) => prof.map(([o, y]) => [-o, y]);

/** the spiral stairs' measures: the column, the treads' outer end, the stringer's middle, the hole's edge line,
 *  each tread's turn, the landing's turn (its middle due south of the stair's middle at every level) */
const bd_SP = { col: 0.09, tread: 1.675, band: 1.69, hole: 2.0, step: (15 * Math.PI) / 180, land: (30 * Math.PI) / 180 };
/** a spiral stair's bearing at its own turn ψ (growing as it rises; the landing at −land/2 … land/2), and a point there */
const bd_spB = (s, psi) => Math.PI + (s.x > 0 ? 1 : -1) * psi;
const bd_spP = (s, psi, r) => {
	const b = bd_spB(s, psi);
	return [s.x + r * Math.sin(b), s.z + r * Math.cos(b)];
};
/** the hole a spiral stair passes through a slab: its circle less the landing (part of the slab), moved `e` into the slab */
function bd_hole(s, e) {
	const h = bd_SP.hole + e, L = bd_SP.land / 2, sg = s.x > 0 ? 1 : -1;
	const edge = (psi, toward) => {
		const b = bd_spB(s, psi), u = [Math.sin(b), Math.cos(b)], t = [Math.cos(b), -Math.sin(b)];
		const len = Math.sqrt(h * h - e * e), k = toward * sg * e;
		return [s.x + u[0] * len + t[0] * k, s.z + u[1] * len + t[1] * k];
	};
	const pts = [bd_spP(s, 0, e / Math.sin(L)), edge(L, -1)];
	const a0 = L - Math.asin(e / h), a1 = TAU - L + Math.asin(e / h), n = 60;
	for (let i = 1; i < n; i++) pts.push(bd_spP(s, a0 + ((a1 - a0) * i) / n, h));
	pts.push(edge(-L, 1));
	return pts;
}
/** the stairs' holes through slab k (the spiral stairs pass every slab above the ground) */
const bd_holes = (k, e) => (k > 0 ? STAIRS.map((s) => bd_hole(s, e)) : []);
/**
 * The grand stair's flight f (level f to f + 1): a wide curved flight on an arc of radius R round [cx, cz], from its
 * foot at φ0 (heading along the terrace's front, a little out toward the garden) to φ1, sweeping out to the terrace's
 * edge and back in to land on the next slab's front; even flights rise westward, odd ones eastward, each from the
 * middle bay. A point of it at turn φ and radius r: [cx + dir·r·sin φ, cz − r·cos φ].
 */
function bd_gsSpec(f) {
	const ya = bd_floor(f), yb = bd_floor(f + 1), n = Math.round((yb - ya) / 0.175), h = (yb - ya) / n;
	const dir = f % 2 === 0 ? -1 : 1, R = f === 0 ? 6 : 7, go = f === 0 ? 0.3 : 0.32, dphi = go / R, hw = 0.95;
	const phi0 = ((f === 0 ? -28 : -20) * Math.PI) / 180, phi1 = phi0 + (n - 1) * dphi;
	const xs = f === 0 ? 2.2 : 1.5;
	const cx = -dir * (xs + R * Math.sin(phi0));
	// the plaza's flight clear of the spring in the plaza's middle (x ±0.8, to z ≈ edgeZ + 2)
	const zmin = f === 0 ? facadeZ(0, cx) - 2.55 : edgeZ(f, cx) + hw + 0.17;
	const s = { f, ya, yb, n, h, dir, R, dphi, hw, phi0, phi1, cx, cz: zmin + R, flare: f === 0 ? 0.6 : 0.3, gEnd: bd_edgeG(f + 1) };
	s.P = (phi, r) => [s.cx + s.dir * r * Math.sin(phi), s.cz - r * Math.cos(phi)];
	/** where a line of radius r crosses the next slab's front (its turn) */
	s.cross = (r) => {
		let lo = 0, hi = Math.PI / 2;
		for (let i = 0; i < 40; i++) {
			const m = (lo + hi) / 2, [x, z] = s.P(m, r);
			if (z < bd_on(s.gEnd, x)[1]) lo = m;
			else hi = m;
		}
		return lo;
	};
	s.phiI = s.cross(R - hw - 0.06);
	s.phiL = s.cross(R + hw + 0.06);
	/** its half width at turn φ on its inner side (−1) and its outer side (1): the outer flared at its foot */
	s.half = (phi, side = 1) => hw + (side > 0 ? s.flare * clamp(1 - (phi - phi0) / (4 * dphi)) ** 2 : 0);
	/** the line of its nosings (flat over its landing) */
	s.line = (phi) => Math.max(ya, Math.min(yb, ya + h * (1 + (phi - phi0) / dphi)));
	return s;
}
const bd_GSPEC = [0, 1, 2, 3].map(bd_gsSpec);
/** where on slab k's front (x, west to east) the grand stair lands, its walls included: no rail there */
const bd_gsGap = (k) => {
	const s = bd_GSPEC[k - 1];
	const a = s.P(s.phiI, s.R - s.hw - 0.12)[0], b = s.P(s.phiL, s.R + s.hw + 0.12)[0];
	return [Math.min(a, b) - 0.03, Math.max(a, b) + 0.03];
};

/** a slab's outline: its front (curve g, `o` in from it) and the circle of radius `rr` behind, the north door's notch */
function bd_outline(g, o, rr, step = 0.5, notch = null) {
	const xe = bd_meet(g, o, rr);
	const pts = [];
	const n = Math.ceil((2 * xe) / step);
	for (let i = 0; i <= n; i++) pts.push(bd_on(g, -xe + (2 * xe * i) / n, o));
	const [ex, ez] = pts[n];
	const be = Math.atan2(ex, ez), m = Math.ceil((2 * be) / (Math.PI / 180));
	const bn = notch ? Math.asin(notch.hw / rr) : -1;
	for (let i = 1; i < m; i++) {
		const b0 = be - (2 * be * (i - 1)) / m, b = be - (2 * be * i) / m;
		if (notch && b0 > bn && b <= bn) pts.push([rr * Math.sin(bn), rr * Math.cos(bn)], [notch.r * Math.sin(bn), notch.r * Math.cos(bn)]);
		if (notch && b0 > -bn && b <= -bn) pts.push([notch.r * Math.sin(-bn), notch.r * Math.cos(-bn)], [rr * Math.sin(-bn), rr * Math.cos(-bn)]);
		const r = notch && Math.abs(b) < bn ? notch.r : rr;
		pts.push([r * Math.sin(b), r * Math.cos(b)]);
	}
	return { pts, xe, be };
}

/** slab k (1 … 3, and 4 the roof): its oak floor, plaster soffit, rounded front, holes and its joints with the shell */
function bd_slab_k(bag, k) {
	const y = bd_floor(k), g = bd_edgeG(k), ys = y - SLAB;
	const rE = shellR(y) - GAP;
	// the floor, from just behind the upstand to the circle GAP inside the shell
	const top = bd_outline(g, 0.02, rE);
	bag.add('floor', bd_flat(top.pts, bd_holes(k, 0.02), y), null, { uv: 'box', chunk: false });
	// the soffit, from behind the bullnose to where the cove to the shell begins
	const rc = bd_inR(ys, 0) - 0.15;
	const bot = bd_outline(g, 0.1, rc);
	bag.add('plaster', bd_flat(bot.pts, bd_holes(k, 0.1), ys, false), null, { uv: 'box', chunk: false });
	// the cove where the soffit meets the shell: a quarter round down into it
	const cove = [[rc - 0.02, ys], [rc + 0.09, ys - 0.01], [rc + 0.15, ys - 0.06], [bd_inR(ys - 0.16, bd_DEEP), ys - 0.16]];
	bag.add('plaster', bd_revolve(cove, -bot.be - 0.01, bot.be + 0.01, TILE.plaster, -1), null, { chunk: false });
	// the upstand where the floor meets the shell: a rounded kerb of 0.38 m, its top sloping up into the shell
	const kerb = [[rE - 0.02, y - 0.02], [rE, y + 0.3], ...bd_tail(bd_arc(rE + 0.08, y + 0.3, 0.08, Math.PI, Math.PI / 2, 4)), [(rE + 0.08 + bd_inR(y + 0.44)) / 2, y + 0.4], [bd_inR(y + 0.44, bd_DEEP), y + 0.44]];
	bag.add('plaster', bd_revolve(kerb, -top.be - 0.006, top.be + 0.006, TILE.plaster), null, { chunk: false });
	// and between the two, behind the shell's skin, a white band: where a window of the shell crosses the slab, it
	// shows the slab closed against its reveal, not the slab's inside
	const band = [];
	for (let i = 0; i <= 4; i++) {
		const yy = lerp(ys - 0.16, y + 0.44, i / 4);
		band.push([bd_inR(yy, bd_DEEP), yy]);
	}
	bag.add('plaster', bd_revolve(band, -top.be - 0.006, top.be + 0.006, TILE.plaster, 1), null, { chunk: false });
	// the front: on into the shell until its first point is behind the skin (none through it), broken where the grand stair lands
	const xEnd = Math.min(...bd_EDGE.map(([o, dy]) => bd_meet(g, o, bd_inR(y + dy, bd_DEEP))));
	const [ga, gb] = bd_gsGap(k);
	for (const [x0, x1] of [[-xEnd, ga], [gb, xEnd]]) {
		const n = Math.ceil((x1 - x0) / 1.0), path = [];
		for (let i = 0; i <= n; i++) {
			const [px, pz] = bd_on(g, x0 + ((x1 - x0) * i) / n, 0);
			path.push([px, y, pz]);
		}
		bag.add('plaster', bd_sweep(path, bd_side(bd_EDGE), { closed: false, caps: true, tile: TILE.plaster }), null, { chunk: false });
	}
	// round each stair's hole: the edge with its upstand round the open part, flush along the landing's two sides
	for (const s of STAIRS) {
		const L = bd_SP.land / 2, sg = s.x > 0 ? 1 : -1, n = 60, path = [];
		for (let i = 0; i <= n; i++) {
			const [px, pz] = bd_spP(s, L + ((TAU - 2 * L) * i) / n, bd_SP.hole);
			path.push([px, y, pz]);
		}
		// the path's bearing grows when sg > 0: the slab (outside the hole) is then on its left
		const p = sg > 0 ? path : path.reverse();
		bag.add('plaster', bd_sweep(p, bd_side(bd_EDGE), { closed: false, caps: true, tile: TILE.plaster }));
		for (const [psi, toward] of [[L, -1], [-L, 1]]) {
			const a = bd_spP(s, psi, bd_SP.col), b = bd_spP(s, psi, bd_SP.hole + 0.12);
			// along the edge so that the landing (toward ψ − L … ) lies on the path's left
			let line = [[a[0], y, a[1]], [b[0], y, b[1]]];
			if (toward * sg > 0) line = [line[1], line[0]];
			const pts = [];
			for (let i = 0; i <= 4; i++) pts.push([lerp(line[0][0], line[1][0], i / 4), y, lerp(line[0][2], line[1][2], i / 4)]);
			bag.add('plaster', bd_sweep(pts, bd_side(bd_FLUSH), { closed: false, caps: true, tile: TILE.plaster }));
		}
	}
	return { xEnd };
}

/** the ground level's floor: oak at the plaza's level from the façade to the shell, open at the north door */
function bd_ground(bag) {
	const y = bd_floor(0), g = LEVELS[0].g, rE = shellR(y) - GAP;
	// (the north gate's landing is ±1.55 m wide: the floor runs out to it and the kerb stops either side)
	const gate = 1.65;
	const top = bd_outline(g, -0.06, rE, 0.5, { hw: gate, r: bd_IN + 0.08 });
	bag.add('floor', bd_flat(top.pts, [], y), null, { uv: 'box', chunk: false });
	// its edge under the façade's sill, down to the ground
	const n = Math.ceil(top.xe / 0.5) * 2, rows = [];
	for (let i = 0; i <= n; i++) {
		const x = -top.xe + (2 * top.xe * i) / n;
		const [px, pz] = bd_on(g, x, -0.06);
		rows.push([[px, -0.05, pz], [px, y, pz]]);
	}
	bag.add('floor', bd_grid(rows, TILE.floor, 0, false), null, { chunk: false });
	// the kerb along the shell, broken for the north door
	const kerb = [[rE - 0.02, y - 0.02], [rE, y + 0.3], ...bd_tail(bd_arc(rE + 0.08, y + 0.3, 0.08, Math.PI, Math.PI / 2, 4)), [(rE + 0.08 + bd_inR(y + 0.44)) / 2, y + 0.4], [bd_inR(y + 0.44, bd_DEEP), y + 0.44]];
	const bn = Math.asin(gate / rE);
	for (const [b0, b1] of [[-top.be - 0.006, -bn], [bn, top.be + 0.006]]) {
		const geo = bd_revolve(kerb, b0, b1, TILE.plaster);
		bag.add('plaster', geo, null, { chunk: false });
	}
	// the kerb's ends at the door: closed
	const ends = new bd_Soup();
	for (const b of [-bn, bn]) {
		const row = kerb.map(([r, yy]) => [r * Math.sin(b), yy, r * Math.cos(b)]);
		const mid = row.reduce((q, p) => [q[0] + p[0] / row.length, q[1] + p[1] / row.length, q[2] + p[2] / row.length], [0, 0, 0]);
		const dir = [Math.sign(-b) * Math.cos(b), 0, -Math.sign(-b) * Math.sin(b)];
		for (let j = 0; j < row.length; j++) ends.face(mid, row[j], row[(j + 1) % row.length], dir);
	}
	bag.add('plaster', ends.geometry(0.1), null, { uv: 'box' });
}

/* ---- 2. WALLS: plaster between two faces, cut off by the shell, with arched openings ---- */

/**
 * A wall between its two faces A(s) and B(s) ([x, z] at s, s0 … s1), from y0 up to `top`, cut off where the shell
 * comes down (its top sunk into it), with arched openings `[s0, s1, springing, apex]` (heights over y0), its ends
 * closed where `ends`, a plaster skirting along its feet where `skirt`. Into `bag` as plaster.
 */
function bd_wall(bag, A, B, s0, s1, y0, top, o = {}) {
	const ops = (o.openings ?? []).filter((p) => p[1] > s0 && p[0] < s1).sort((p, q) => p[0] - q[0]);
	const hiOf = (P) => Math.min(top, bd_inY(Math.hypot(P[0], P[1])));
	// samples every 0.6 m, finer where the shell cuts the wall's top
	let S = [];
	const n = Math.max(1, Math.ceil((s1 - s0) / 0.6));
	for (let i = 0; i <= n; i++) {
		const s = s0 + ((s1 - s0) * i) / n;
		if (i && (hiOf(A(s)) < top || hiOf(B(s)) < top)) {
			const p = S[S.length - 1].s;
			for (let k = 1; k < 4; k++) S.push({ s: p + ((s - p) * k) / 4, lo: y0 });
		}
		S.push({ s, lo: y0 });
	}
	for (const [a, b, sp, ap] of ops) {
		S = S.filter((q) => q.s < a || q.s > b);
		const c = (a + b) / 2, hw = (b - a) / 2, add = [{ s: a, lo: y0, op: 1 }, { s: a, lo: y0 + sp }];
		for (let k = 1; k < 14; k++) {
			const s = a + ((b - a) * k) / 14, t = (s - c) / hw;
			add.push({ s, lo: y0 + sp + (ap - sp) * Math.sqrt(Math.max(0, 1 - t * t)) });
		}
		add.push({ s: b, lo: y0 + sp }, { s: b, lo: y0, op: 1 });
		const at = S.findIndex((q) => q.s > b);
		S.splice(at < 0 ? S.length : at, 0, ...add);
	}
	// no point of its foot beyond the shell (where it is cut down to nothing anyway)
	const rIn = bd_inR(y0), inside = (p) => {
		const r = Math.hypot(p[0], p[1]);
		return r > rIn ? [(p[0] * rIn) / r, (p[1] * rIn) / r] : p;
	};
	const P = S.map((q) => {
		const a = inside(A(q.s)), b = inside(B(q.s));
		return { ...q, a, b, ha: Math.max(q.lo, hiOf(a)), hb: Math.max(q.lo, hiOf(b)) };
	});
	const soup = new bd_Soup();
	const V = (p, y) => [p[0], y, p[1]];
	for (let i = 0; i < P.length - 1; i++) {
		const p = P[i], q = P[i + 1];
		const outA = [p.a[0] - p.b[0], 0, p.a[1] - p.b[1]];
		soup.quad(V(p.a, p.lo), V(q.a, q.lo), V(q.a, q.ha), V(p.a, p.ha), outA);
		soup.quad(V(p.b, p.lo), V(q.b, q.lo), V(q.b, q.hb), V(p.b, p.hb), [-outA[0], 0, -outA[2]]);
		if ((p.lo > y0 + 1e-3 || q.lo > y0 + 1e-3) && (p.ha > p.lo || q.ha > q.lo)) {
			const op = ops.find(([a, b]) => (p.s + q.s) / 2 >= a - 1e-6 && (p.s + q.s) / 2 <= b + 1e-6);
			const c = op ? A((op[0] + op[1]) / 2) : p.a, cb = op ? B((op[0] + op[1]) / 2) : p.b;
			const mid = [(c[0] + cb[0]) / 2, y0 + (op ? op[2] / 2 : 0), (c[1] + cb[1]) / 2];
			const qc = [(p.a[0] + q.b[0]) / 2, (p.lo + q.lo) / 2, (p.a[1] + q.b[1]) / 2];
			soup.quad(V(p.a, p.lo), V(p.b, p.lo), V(q.b, q.lo), V(q.a, q.lo), [mid[0] - qc[0], mid[1] - qc[1], mid[2] - qc[2]]);
		}
	}
	for (const [p, q, sgn] of o.ends ? [[P[0], P[1], -1], [P[P.length - 1], P[P.length - 2], 1]] : []) {
		const d = [(p.a[0] + p.b[0] - q.a[0] - q.b[0]) / 2, 0, (p.a[1] + p.b[1] - q.a[1] - q.b[1]) / 2];
		soup.quad(V(p.a, p.lo), V(p.b, p.lo), V(p.b, p.hb), V(p.a, p.ha), sgn ? d : d);
	}
	bag.add(o.material ?? 'plaster', soup.geometry(0.7), null, { uv: 'box' });
	// the skirting: 10 cm of plaster, 1.5 cm proud, its top rounded, along each face where the wall stands on the floor
	if (o.skirt === false) return;
	const SK = [[0, -0.01], [0.015, -0.01], [0.015, 0.075], ...bd_tail(bd_arc(0.0, 0.075, 0.015, 0, Math.PI / 2, 2))];
	for (const side of ['a', 'b']) {
		let run = [];
		const flush = () => {
			if (run.length > 1) {
				const T = [run[run.length - 1][0] - run[0][0], run[run.length - 1][2] - run[0][2]];
				const p0 = P.find((q) => q[side] === run.src0) ?? P[0];
				const room = side === 'a' ? [p0.a[0] - p0.b[0], p0.a[1] - p0.b[1]] : [p0.b[0] - p0.a[0], p0.b[1] - p0.a[1]];
				const right = [T[1], -T[0]];
				const sg = right[0] * room[0] + right[1] * room[1] > 0 ? 1 : -1;
				bag.add('plaster', bd_sweep(run, SK.map(([u, v]) => [u * sg, v]), { closed: false, tile: TILE.plaster }));
			}
			run = [];
		};
		for (const p of P) {
			const ok = p.lo <= y0 + 1e-3 && (side === 'a' ? p.ha : p.hb) > y0 + 0.2;
			if (!ok || p.op) {
				if (ok && p.op && !run.length) {
					run.src0 = p[side];
					run.push([p[side][0], y0, p[side][1]]);
					continue;
				}
				if (ok && p.op) run.push([p[side][0], y0, p[side][1]]);
				flush();
				continue;
			}
			if (!run.length) run.src0 = p[side];
			run.push([p[side][0], y0, p[side][1]]);
		}
		flush();
	}
}

/* ---- 3. THE FAÇADES: curved floor-to-ceiling glass, slender oak mullions, sliding doors left open ---- */

/**
 * An oak bar len long along x, its section w (y) × d (z) rounded by r, its grain along it; open at its ends (they die
 * into what they meet). One template per size, cloned where it is placed.
 */
const bd_OAKBARS = {};
function bd_oakBar(len, w, d, r = 0.02) {
	const k = `${len.toFixed(3)}|${w}|${d}|${r}`;
	if (!bd_OAKBARS[k]) {
		const prof = bd_rr(d, w, r, 0, 0, 2);
		bd_OAKBARS[k] = bd_grid([-len / 2, len / 2].map((x) => prof.map(([z, y]) => [x, y, z])), TILE.oak, 1, true);
	}
	return bd_OAKBARS[k].clone();
}
/** a vertical oak member (mullion, stile) h tall, w along x and d along z, its foot at the origin */
const bd_post = (h, w, d, r = 0.02) => bd_oakBar(h, w, d, r).rotateZ(Math.PI / 2).translate(0, h / 2, 0);

/** what stands on level k's façade line, west to east: the rooms' bays, the stair halls, the doors */
function bd_facadePlan(k) {
	const bays = bd_bays(k);
	const solid = [], doors = [], joints = [];
	for (let i = 0; i < bays.length; i++) {
		const b = bays[i];
		joints.push(b.x0, b.x1);
		const front = b.rooms[0];
		if (front.d0 > 0) continue;
		const kind = front.kind;
		if (kind === 'stair') {
			// the stair hall: solid curved plaster with a wide arch to its terrace; a narrow gap beside it joins it
			const prev = bays[i - 1], next = bays[i + 1];
			const x0 = prev && b.x0 - prev.x1 < 1.2 ? prev.x1 : b.x0, x1 = next && next.x0 - b.x1 < 1.2 ? next.x0 : b.x1;
			solid.push([x0, x1, b.x]);
		} else if (kind === 'hall') {
			doors.push({ a: b.x - 8, b: b.x - 4, park: [[b.x - 4, b.x - 2, 0.11], [b.x - 4, b.x - 2, 0.18]] });
			doors.push({ a: b.x + 4, b: b.x + 8, park: [[b.x + 2, b.x + 4, 0.11], [b.x + 2, b.x + 4, 0.18]] });
			joints.push(b.x - 9, b.x - 2, b.x, b.x + 2, b.x + 9);
		} else if (kind === 'suite') {
			// in the room's own frame (its +x west): local x −w/2 + 0.6 … −w/2 + 2.0, the leaf behind its western neighbour
			const M = roomMatrix(k, b.x), xw = (lx) => new THREE.Vector3(lx, 0, 0).applyMatrix4(M).x;
			const a = xw(-b.w / 2 + 2.0), c = xw(-b.w / 2 + 0.6);
			doors.push({ a, b: c, park: [[a - 1.45, a, 0.11]] });
		} else {
			doors.push({ a: b.x - 0.8, b: b.x + 0.8, park: [[b.x + 0.8, b.x + 2.4, 0.11]] });
		}
	}
	return { bays, solid, doors, joints };
}

/** level k's façade: glass, mullions, head and sill, the open sliding doors, the stair halls' plaster, its ends in the shell */
function bd_facade(bag, k) {
	const g = LEVELS[k].g, y0 = bd_floor(k), y1 = bd_ceil(k), H = y1 - y0;
	const { solid, doors, joints } = bd_facadePlan(k);
	// where the glass ends at height y: GAP inside the shell
	const xg = (y) => bd_meet(g, 0, shellR(y) - GAP) - 0.04;
	const xTop = xg(y1), xBot = xg(y0);
	const inSolid = (x) => solid.some(([a, b]) => x > a - 0.05 && x < b + 0.05);
	const inDoor = (x) => doors.some((d) => x > d.a + 0.05 && x < d.b - 0.05);
	// the mullions: at every wall, every door's jambs, the plaster's ends; then every ≤ 1.55 m between
	let fixed = [...joints, ...doors.flatMap((d) => [d.a, d.b]), ...solid.flatMap(([a, b]) => [a, b]), -xTop + 0.25, xTop - 0.25];
	fixed = fixed.filter((x) => Math.abs(x) <= xTop - 0.25 && !inDoor(x)).sort((a, b) => a - b);
	fixed = fixed.filter((x, i) => !i || x - fixed[i - 1] > 0.12);
	const mull = [];
	for (let i = 0; i < fixed.length; i++) {
		const x = fixed[i];
		if (!inSolid(x) || solid.some(([a, b]) => Math.abs(x - a) < 0.06 || Math.abs(x - b) < 0.06)) mull.push(x);
		const nx = fixed[i + 1];
		if (nx === undefined) break;
		const m = (x + nx) / 2;
		if (inSolid(m) || inDoor(m)) continue;
		const n = Math.ceil((nx - x) / 1.55);
		for (let j = 1; j < n; j++) mull.push(x + ((nx - x) * j) / n);
	}
	const tpl = bd_post(H + 0.02, 0.07, 0.14, 0.03);
	for (const x of mull) bag.add('oak', tpl.clone(), bd_at(g, x, y0 - 0.01, 0));
	// the panes: flat between mullions, below the head and above the sill
	const glass = new bd_Soup();
	const gy0 = y0 + 0.05, gy1 = y1 - 0.09;
	const ms = mull.slice().sort((a, b) => a - b);
	for (let i = 0; i < ms.length - 1; i++) {
		const a = ms[i], b = ms[i + 1], m = (a + b) / 2;
		if (inSolid(m) || inDoor(m)) continue;
		const pa = bd_on(g, a), pb = bd_on(g, b);
		glass.quad([pa[0], gy0, pa[1]], [pb[0], gy0, pb[1]], [pb[0], gy1, pb[1]], [pa[0], gy1, pa[1]], [0, 0, -1]);
	}
	// the last panes at each end: their outer edge slopes with the shell, an oak jamb along it
	for (const s of [-1, 1]) {
		const xm = s > 0 ? ms[ms.length - 1] : ms[0];
		const edge = [];
		for (let i = 0; i <= 8; i++) {
			const y = lerp(gy0, gy1, i / 8);
			edge.push([s * xg(y), y]);
		}
		const pts = [[xm, gy0], ...edge, [xm, gy1]].map(([x, y]) => {
			const p = bd_on(g, x);
			return [p[0], y, p[1]];
		});
		for (let i = 1; i < pts.length - 2; i++) glass.face(pts[0], pts[i], pts[i + 1], [0, 0, -1]);
		glass.face(pts[0], pts[pts.length - 2], pts[pts.length - 1], [0, 0, -1]);
		const jamb = [];
		for (let i = 0; i <= 8; i++) {
			const y = lerp(y0, y1 + 0.02, i / 8);
			const p = bd_on(g, s * (xg(y) + 0.02));
			jamb.push([p[0], y, p[1]]);
		}
		bag.add('oak', tube(jamb, 0.045, 8, false, TILE.oak), null);
		// beyond the glass, plaster to the shell: its foot follows the glass's sloping edge
		const yg = (x) => {
			const r = Math.hypot(...bd_on(g, x));
			return Math.sqrt(Math.max(0, R * R - (r + GAP + 0.04 / 1.5) ** 2));
		};
		const x0 = xTop + 0.02, x1 = bd_meet(g, 0.14, bd_inR(y0, 0.1));
		const lo = (x) => clamp(yg(Math.abs(x)) - y0, 0, H);
		const segs = 18, S = [];
		for (let i = 0; i <= segs; i++) S.push(lerp(x0, x1, i / segs));
		const soup = new bd_Soup();
		for (let i = 0; i < segs; i++) {
			const q = [S[i], S[i + 1]].map((x) => {
				const a = bd_on(g, s * x, -0.14), b = bd_on(g, s * x, 0.14);
				const l = y0 + lo(x) - 0.03;
				return { a, b, l, ha: Math.max(l, Math.min(y1 + 0.02, bd_inY(Math.hypot(...a)))), hb: Math.max(l, Math.min(y1 + 0.02, bd_inY(Math.hypot(...b)))) };
			});
			const [p, r] = q, V = (pt, y) => [pt[0], y, pt[1]];
			soup.quad(V(p.a, p.l), V(r.a, r.l), V(r.a, r.ha), V(p.a, p.ha), [0, 0, -1]);
			soup.quad(V(p.b, p.l), V(r.b, r.l), V(r.b, r.hb), V(p.b, p.hb), [0, 0, 1]);
			soup.quad(V(p.a, p.l), V(p.b, p.l), V(r.b, r.l), V(r.a, r.l), [0, -1, 0]);
		}
		bag.add('plaster', soup.geometry(0.7), null, { uv: 'box' });
	}
	bag.add('glass', glass.geometry(0.1), null, { chunk: false });
	// head and sill: rounded oak along the curve (no sill across an open door or under the stair halls' arches)
	const along = (x0, x1, y, prof) => {
		const n = Math.max(1, Math.ceil((x1 - x0) / 0.6)), path = [];
		for (let i = 0; i <= n; i++) {
			const p = bd_on(g, lerp(x0, x1, i / n));
			path.push([p[0], y, p[1]]);
		}
		bag.add('oak', bd_sweep(path, prof, { caps: true, tile: TILE.oak }), null, { chunk: false });
	};
	along(-xTop - 0.02, xTop + 0.02, y1 - 0.04, bd_rr(0.16, 0.12, 0.035));
	const cuts = [...doors.map((d) => [d.a, d.b]), ...solid.map(([a, b, c]) => [c - 1.35, c + 1.35])].sort((p, q) => p[0] - q[0]);
	let from = -xBot;
	for (const [a, b] of cuts) {
		if (a > from) along(from, a, y0 + 0.025, bd_rr(0.16, 0.07, 0.025));
		from = Math.max(from, b);
	}
	along(from, xBot, y0 + 0.025, bd_rr(0.16, 0.07, 0.025));
	// a flush bronze track across each open door
	for (const d of doors) along(d.a, d.b, y0 + 0.004, bd_rr(0.1, 0.012, 0.004)) || null;
	// the sliding leaves, slid aside behind the glass next to their opening
	for (const d of doors)
		for (const [a, b, o] of d.park) bd_leaf(bag, g, a, b, o, y0, y1);
	// the stair halls: plaster on the façade line, a wide elliptical arch open to the terrace
	for (const [a, b, c] of solid) {
		const spring = k === 0 ? 2.5 : 2.2, apex = k === 0 ? 3.55 : 3.2;
		bd_wall(bag, (x) => bd_on(g, x, -0.13), (x) => bd_on(g, x, 0.15), a, b, y0 - 0.02, y1 + 0.02, { openings: [[c - 1.3, c + 1.3, spring, apex]], ends: true, skirt: false });
		// the arch's edges rounded: a soft bead along them on both faces
		for (const o of [-0.13, 0.15]) {
			const pts = [];
			for (let i = 0; i <= 24; i++) {
				const t = Math.PI * (1 - i / 24), x = c + 1.3 * Math.cos(t), yy = y0 + spring + (apex - spring) * Math.sin(t);
				const [px, pz] = bd_on(g, x, o);
				pts.push([px, yy, pz]);
			}
			const [lx, lz] = bd_on(g, c - 1.3, o), [rx, rz] = bd_on(g, c + 1.3, o);
			const line = [[lx, y0 - 0.02, lz], [lx, y0 + spring * 0.5, lz], ...pts, [rx, y0 + spring * 0.5, rz], [rx, y0 - 0.02, rz]];
			bag.add('plaster', tube(line, 0.035, 8, false, TILE.plaster, 60), null, { uv: 'box' });
		}
	}
}

/** a sliding glass leaf, oak framed, standing `o` in from the façade line between a and b */
function bd_leaf(bag, g, a, b, o, y0, y1) {
	const w = b - a + 0.04, h = y1 - 0.1 - (y0 + 0.012), xc = (a + b) / 2;
	const M = bd_at(g, xc, y0 + 0.012, o);
	const add = (geo, x, y) => bag.add('oak', geo, M.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, 0)));
	add(bd_post(h, 0.075, 0.05, 0.015), -w / 2 + 0.0375, 0);
	add(bd_post(h, 0.075, 0.05, 0.015), w / 2 - 0.0375, 0);
	add(bd_oakBar(w - 0.15, 0.075, 0.05, 0.015), 0, h - 0.0375);
	add(bd_oakBar(w - 0.15, 0.11, 0.05, 0.015), 0, 0.055);
	const pane = new THREE.PlaneGeometry(w - 0.15, h - 0.185).translate(0, 0.11 + (h - 0.185) / 2, 0);
	bag.add('glass', pane, M);
	bag.add('bronze', bd_post(0.45, 0.022, 0.03, 0.01), M.clone().multiply(new THREE.Matrix4().makeTranslation(-w / 2 + 0.04, 0.83, 0.045)));
}

/* ---- 4. THE ROOMS: their walls (side walls from the glass to the shell, cross walls between a bay's rooms), doors ---- */

/** level k's bays west to east: each a column of rooms in one frame (a suite, its bath, its studio), x0 … x1 along the façade */
function bd_bays(k) {
	const by = new Map();
	for (const r of ROOMS) {
		if (r.level !== k) continue;
		const key = r.x.toFixed(3);
		if (!by.has(key)) by.set(key, { x: r.x, w: r.w, x0: r.x - r.w / 2, x1: r.x + r.w / 2, rooms: [], M: roomMatrix(k, r.x) });
		by.get(key).rooms.push(r);
	}
	const bays = [...by.values()].sort((a, b) => a.x - b.x).map((b) => (b.rooms.sort((p, q) => p.d0 - q.d0), b));
	// a stair hall's walls run due north, parallel to its stair's own square (the stairs stand at fixed x, z): its
	// frame turned square to the plan, not to the curve, so its walls clear the stair's hole on every level
	for (const b of bays) if (b.rooms[0].kind === 'stair') b.M = at(b.x, LEVELS[k].y, facadeZ(k, b.x), Math.PI);
	return bays;
}
/** a point of a bay's own frame (local x, depth d) as [x, z] */
const bd_in = (b, lx, d) => {
	const v = new THREE.Vector3(lx, 0, -d).applyMatrix4(b.M);
	return [v.x, v.z];
};
/** the room of a bay at depth d */
const bd_roomAt = (b, d) => b.rooms.find((r) => d >= r.d0 && d <= r.d1);
/** how deep a spiral stair's hole begins in a stair bay (its front, from the glass) */
const bd_holeFront = (b, k) => {
	const s = STAIRS.find((q) => Math.abs(q.x - b.x) < 0.5);
	return s.z - facadeZ(k, s.x) - (bd_SP.hole - 0.15);
};

/**
 * A door leaf of oak standing open: hinged at H ([x, z], on the jamb's face toward the room it opens into), its
 * closed line along `u` (unit, toward the other jamb), opened 90° along `n` (unit, into that room); its top the
 * opening's arch (springing sp, apex ap over y0, the whole opening's width W, this leaf the part from `from`).
 */
function bd_door(bag, H, u, n, y0, wl, W, sp, ap) {
	// its outline in its own plane: across from the hinge (0 … wl), up from the floor, its head the opening's arch
	const hw = W / 2, pts = [[0.003, 0.008], [wl - 0.003, 0.008]];
	for (let i = 12; i >= 0; i--) {
		const t = 0.003 + ((wl - 0.006) * i) / 12, q = (t - hw) / hw;
		pts.push([t, sp - 0.006 + (ap - sp) * Math.sqrt(Math.max(0, 1 - q * q))]);
	}
	const place = (a, v, w) => [H[0] + n[0] * a + u[0] * (w + 0.004), y0 + v, H[1] + n[1] * a + u[1] * (w + 0.004)];
	// its grain up the leaf: its UVs laid by box, then turned a quarter
	const leaf = boxUV(bd_slab(pts, 0.044, 0.01, place, 2), TILE.oak), uv = leaf.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
	bag.add('oak', leaf, null);
	// a brass knob each side, near its free edge at 1 m
	for (const side of [-1, 1]) {
		const c = place(wl - 0.07, 1.0, side > 0 ? 0.044 : 0);
		const geo = lathe([[0, 0], [0.012, 0.002], [0.009, 0.02], [0.02, 0.035], [0.022, 0.05], [0, 0.058]], 14, 1);
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(u[0] * side, 0, u[1] * side));
		bag.add('brass', geo, new THREE.Matrix4().compose(new THREE.Vector3(...c), q, new THREE.Vector3(1, 1, 1)));
	}
}

/** level k's walls and doors */
function bd_rooms(bag, k) {
	const bays = bd_bays(k), g = LEVELS[k].g;
	const y0 = bd_floor(k) - 0.02, top = bd_ceil(k) + 0.02, fy = bd_floor(k);
	const T = 0.075;
	const DOOR = { sp: 1.85, ap: 2.3 };
	// how deep a face (d ↦ [x, z]) runs before the shell meets the floor
	const deepest = (F) => {
		let lo = 0, hi = 40;
		const r = bd_inR(fy);
		for (let i = 0; i < 36; i++) {
			const m = (lo + hi) / 2, [x, z] = F(m);
			if (x * x + z * z < r * r) lo = m;
			else hi = m;
		}
		return lo;
	};
	const sides = [];
	for (let i = 0; i <= bays.length; i++) {
		const W = bays[i - 1], E = bays[i];
		// face A toward the west bay, face B toward the east one (or the wall's other face at the ends)
		const A = W ? (d) => bd_in(W, -W.w / 2 + T, d) : (d) => bd_in(E, E.w / 2 + T, d);
		const B = E ? (d) => bd_in(E, E.w / 2 - T, d) : (d) => bd_in(W, -W.w / 2 - T, d);
		const xb = W && E ? (W.x1 + E.x0) / 2 : W ? W.x1 : E.x0;
		const gap = W && E ? E.x0 - W.x1 : 0;
		sides.push({ W, E, A, B, xb, rn: Math.max(0.2, gap / 2 + 0.125) });
	}
	for (const w of sides) {
		// each face stops where it meets the shell at the floor
		const dA = deepest(w.A) + 0.03, dB = deepest(w.B) + 0.03, fA = w.A, fB = w.B;
		w.A = (d) => fA(Math.min(d, dA));
		w.B = (d) => fB(Math.min(d, dB));
		const s1 = Math.max(dA, dB), s0 = Math.min(1.3, Math.max(0.4, s1 - 0.3));
		// a door from a stair hall to the room beside it, in front of the stair's hole
		const ops = [], leaves = [];
		for (const [hall, other, sgn] of [[w.W, w.E, 1], [w.E, w.W, -1]]) {
			if (!hall || !other || hall.rooms[0].kind !== 'stair') continue;
			const front = bd_holeFront(hall, k) - 0.1;
			if (front - 1.5 < 1.0) continue;
			const dc = Math.min(3.0, (1.5 + front) / 2), wide = other.rooms[0].kind === 'hall' ? 1.4 : 0.9;
			const r = bd_roomAt(other, dc);
			if (!r || r.kind === 'stair') continue;
			ops.push([dc - wide / 2, dc + wide / 2, wide > 1 ? 1.6 : DOOR.sp, DOOR.ap]);
			leaves.push({ other, sgn, dc, wide });
		}
		bd_wall(bag, w.A, w.B, s0, s1, y0, top, { openings: ops });
		// the leaves open into the room beside the hall, hinged on the jamb nearer the glass
		for (const { other, sgn, dc, wide } of leaves) {
			const face = sgn > 0 ? w.B : w.A;
			const a = face(dc - wide / 2), b = face(dc + wide / 2);
			const into = sgn > 0 ? bd_in(other, other.w / 2 - 1, dc) : bd_in(other, -other.w / 2 + 1, dc);
			let u = [b[0] - a[0], b[1] - a[1]];
			const lu = Math.hypot(...u);
			u = [u[0] / lu, u[1] / lu];
			let n = [into[0] - a[0], into[1] - a[1]];
			const dn = n[0] * u[0] + n[1] * u[1];
			n = [n[0] - dn * u[0], n[1] - dn * u[1]];
			const ln = Math.hypot(...n);
			n = [n[0] / ln, n[1] / ln];
			if (wide > 1) {
				bd_door(bag, a, u, n, fy, wide / 2, wide, 1.6, DOOR.ap);
				const u2 = [-u[0], -u[1]];
				bd_door(bag, b, u2, n, fy, wide / 2, wide, 1.6, DOOR.ap);
			} else bd_door(bag, a, u, n, fy, wide, wide, DOOR.sp, DOOR.ap);
		}
		// its nose at the glass: a round pier of radius rn flaring into the wall
		const C = bd_on(g, w.xb, 0.07 + w.rn);
		const l = Math.hypot(1, w.xb / RHO), al = [1 / l, -w.xb / RHO / l], inn = [w.xb / RHO / l, 1 / l];
		const ctrl = [w.A(s0 + 0.35), w.A(s0)];
		for (let i = 0; i <= 6; i++) {
			const f = Math.PI + (Math.PI * i) / 6;
			ctrl.push([C[0] + al[0] * w.rn * Math.cos(f) + inn[0] * w.rn * Math.sin(f), C[1] + al[1] * w.rn * Math.cos(f) + inn[1] * w.rn * Math.sin(f)]);
		}
		ctrl.push(w.B(s0), w.B(s0 + 0.35));
		const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
		const pts = curve.getPoints(40).map((p) => [p.x, p.z]);
		// keep what lies between A(s0) and B(s0)
		const ia = pts.findIndex((p) => Math.hypot(p[0] - ctrl[1][0], p[1] - ctrl[1][1]) < 0.02);
		const ib = pts.length - 1 - pts.slice().reverse().findIndex((p) => Math.hypot(p[0] - ctrl[ctrl.length - 2][0], p[1] - ctrl[ctrl.length - 2][1]) < 0.02);
		const nose = pts.slice(Math.max(0, ia), ib + 1);
		const soup = new bd_Soup();
		const ctr = [(w.A(s0)[0] + w.B(s0)[0]) / 2, (w.A(s0)[1] + w.B(s0)[1]) / 2];
		for (let i = 0; i < nose.length - 1; i++) {
			const p = nose[i], q = nose[i + 1];
			const m = [(p[0] + q[0]) / 2 - ctr[0], 0, (p[1] + q[1]) / 2 - ctr[1]];
			soup.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], top, q[1]], [p[0], top, p[1]], m);
		}
		bag.add('plaster', soup.geometry(0.9), null, { uv: 'box' });
	}
	// the cross walls of each bay: between its rooms, and behind its last room where that stops short of the shell
	for (const b of bays) {
		for (let i = 0; i < b.rooms.length; i++) {
			const r = b.rooms[i], prev = b.rooms[i - 1];
			const walls = [];
			if (prev) walls.push({ d: r.d0, from: prev, to: r });
			if (i === b.rooms.length - 1 && r.d1 < deepAt(k, b.x) - 0.05) walls.push({ d: r.d1, from: r, to: null });
			for (const { d, from, to } of walls) {
				const A = (s) => bd_in(b, s, d - T), B = (s) => bd_in(b, s, d + T);
				let o0, o1;
				if (from.kind === 'suite' || from.kind === 'bath') (o0 = b.w / 2 - 1.4), (o1 = b.w / 2 - 0.5);
				else if (from.kind === 'hall') (o0 = -1.1), (o1 = 1.1);
				else (o0 = -0.45), (o1 = 0.45);
				// (the hall's: the way in from the north gate, 2.2 m wide and 2.75 m high)
				const wide = o1 - o0, sp = wide > 2 ? 1.95 : wide > 1 ? 1.6 : DOOR.sp, ap = wide > 2 ? 2.75 : DOOR.ap;
				// a back wall has a door only where there is a room's worth behind it (a store behind a lounge)
				if (!to && deepAt(k, b.x) - d < 2.5) {
					bd_wall(bag, A, B, -b.w / 2, b.w / 2, y0, top, {});
					continue;
				}
				bd_wall(bag, A, B, -b.w / 2, b.w / 2, y0, top, { openings: [[o0, o1, sp, ap]] });
				// the leaf: hinged on the jamb at local x o1, opened into the room behind (deeper)
				const H = bd_in(b, o1, d + T), Hn = bd_in(b, o1, d + T + 1), Hu = bd_in(b, o0, d + T);
				const u = [(Hu[0] - H[0]) / wide, (Hu[1] - H[1]) / wide], n = [Hn[0] - H[0], Hn[1] - H[1]];
				if (wide > 1) {
					bd_door(bag, H, u, n, fy, wide / 2, wide, sp, ap);
					bd_door(bag, Hu, [-u[0], -u[1]], n, fy, wide / 2, wide, sp, ap);
				} else bd_door(bag, H, u, n, fy, wide, wide, sp, ap);
			}
		}
	}
}

/* ---- 5. THE TERRACES: Geoship rails of oak slats on slim white posts, built-in curved planters with plants ---- */

/** one slim white post, 1 m tall, its foot at the origin: placed (and stretched) wherever a rail needs one */
let bd_POST = null;
const bd_postTpl = () => (bd_POST ??= boxUV(new THREE.CylinderGeometry(0.019, 0.021, 1, 8, 1).translate(0, 0.5, 0), TILE.ceramic));

/**
 * A rail along a path ([x, y, z]: y the floor under it, or a stair's line of nosings): slim white posts every ~1.2 m
 * and at its ends, standing from `foot` (the upstand's top) to the handrail, oak slats at `slats` and a rounded oak
 * handrail at `hand` over the path, all following it.
 */
function bd_rail(bag, path, o = {}) {
	const foot = o.foot ?? bd_UP, hand = o.hand ?? bd_HAND, slats = o.slats ?? bd_SLATS;
	const L = [0];
	for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]));
	const total = L[L.length - 1];
	if (total < 0.1) return;
	const along = (s) => {
		let i = 1;
		while (i < L.length - 1 && L[i] < s) i++;
		const t = clamp((s - L[i - 1]) / (L[i] - L[i - 1] || 1));
		return [0, 1, 2].map((j) => lerp(path[i - 1][j], path[i][j], t));
	};
	const n = Math.max(1, Math.round(total / 1.2)), tpl = bd_postTpl();
	for (let i = 0; i <= n; i++) {
		const p = along((total * i) / n);
		bag.add('ceramic', tpl.clone(), new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1] + foot - 0.02, p[2]), new THREE.Quaternion(), new THREE.Vector3(1, hand - foot + 0.02, 1)));
	}
	for (const s of slats) bag.add('oak', bd_sweep(path.map(([x, y, z]) => [x, y + s, z]), bd_rr(0.03, 0.05, 0.012, 0, 0, 1), { tile: TILE.oak }));
	bag.add('oak', bd_sweep(path.map(([x, y, z]) => [x, y + hand, z]), bd_rr(0.068, 0.046, 0.021, 0, 0, 2), { tile: TILE.oak, caps: true }));
}
/** points along the curve g, `o` in, from x0 to x1 at height y, every ~step metres */
function bd_line(g, o, x0, x1, y, step = 0.6) {
	const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step)), pts = [];
	for (let i = 0; i <= n; i++) {
		const [x, z] = bd_on(g, lerp(x0, x1, i / n), o);
		pts.push([x, y, z]);
	}
	return pts;
}

/**
 * A built-in planter's section ([o, y] round it): 0.6 m deep, 0.5 m high, its rim rounded, a dip for the soil 7 cm
 * below the rim (the soil itself laid separately).
 */
const bd_PLANTER = [[-0.3, 0], [0.3, 0], [0.3, 0.44], ...bd_tail(bd_arc(0.24, 0.44, 0.06, 0, Math.PI / 2, 3)), [0.2, 0.5], ...bd_tail(bd_arc(0.2, 0.47, 0.03, Math.PI / 2, Math.PI, 2)), [0.17, 0.42], [-0.17, 0.42], [-0.17, 0.47], ...bd_tail(bd_arc(-0.2, 0.47, 0.03, 0, Math.PI / 2, 2)), [-0.24, 0.5], ...bd_tail(bd_arc(-0.24, 0.44, 0.06, Math.PI / 2, Math.PI, 3))];
/** a planter along a path ([x, y, z], its middle line on the floor), its soil, and the plants of `kinds` along it */
function bd_planter(bag, dome, path, kinds, seed) {
	bag.add('plaster', bd_sweep(path, bd_PLANTER.map(([o, y]) => [o, y]), { caps: true, tile: TILE.plaster }));
	bag.add('soil', bd_sweep(path, [[0.175, 0.435], [-0.175, 0.435]], { closed: false, face: 0, tile: TILE.soil }), null);
	// the plants, spaced along it
	const r = chance('bd-planter', seed);
	for (let i = 0; i < kinds.length; i++) {
		const [kind, s0, s1] = kinds[i];
		const t = (i + 0.5) / kinds.length, f = t * (path.length - 1), j = Math.min(path.length - 2, Math.floor(f));
		const p = [0, 1, 2].map((c) => lerp(path[j][c], path[j + 1][c], f - j));
		dome.plant(kind, +p[0].toFixed(3), +(p[1] + 0.435).toFixed(3), +p[2].toFixed(3), { stage: Math.round(between(r, s0, s1)), seed: `${seed}-${i}`, turn: +(r() * TAU).toFixed(2) });
	}
}
/** the plants of the terraces' planters, by turns: a shrub in the middle of herbs and creepers */
const bd_BEDS = [
	[['nasturtium', 4, 5], ['coffee', 4, 5], ['strawberry', 4, 5]],
	[['basil', 4, 5], ['banana', 3, 4], ['nasturtium', 4, 5]],
	[['strawberry', 4, 5], ['pepper', 4, 5], ['basil', 4, 5]],
	[['nasturtium', 4, 5], ['banana', 3, 4], ['pepper', 4, 5]],
	[['basil', 4, 5], ['coffee', 4, 5], ['strawberry', 4, 5]]
];

/** slab k's terrace: its rail (broken where the grand stair lands) and its planters along the edge */
function bd_terrace(bag, dome, k) {
	const y = bd_floor(k), g = bd_edgeG(k);
	const xr = bd_meet(g, -0.08, bd_inR(y + bd_HAND, 0.12));
	const [ga, gb] = bd_gsGap(k);
	for (const [x0, x1] of [[-xr, ga], [gb, xr]]) bd_rail(bag, bd_line(g, -0.08, x0, x1, y, 1.0));
	if (k === 4) return;
	// planters every ~9 m along the edge, clear of the grand stair and of the ends under the shell
	const xs = [];
	for (let x = 9; x < xr - 3.5; x += 9) xs.push(-x, x);
	xs.sort((a, b) => a - b).forEach((x, i) => {
		const path = bd_line(g, 0.33, x - 1.3, x + 1.3, y, 0.45);
		bd_planter(bag, dome, path, bd_BEDS[(i + k * 2) % bd_BEDS.length], `t${k}-${i}`);
	});
}

/* ---- 6. THE SPIRAL STAIRS: open oak treads round a slim oak column, a white helical stringer, a slatted rail ---- */

/** a spiral stair's flights: for each, its first tread's turn ψ, its floor, its risers and their height */
function bd_spFlights() {
	const L = bd_SP.land / 2, out = [];
	for (let k = 0; k < 4; k++) {
		const ya = bd_floor(k), yb = bd_floor(k + 1), n = Math.round((yb - ya) / 0.175);
		// it ends where the landing of level k + 1 begins (−L, a turn up each level)
		const end = -L + k * TAU;
		out.push({ k, ya, yb, n, h: (yb - ya) / n, psi0: end - (n - 1) * bd_SP.step, end });
	}
	return out;
}
/** the line of a spiral stair's nosings at its turn ψ (flat over each landing) */
function bd_spLine(F, psi) {
	for (const f of F) {
		if (psi < f.psi0) return f.ya;
		if (psi <= f.end) return f.ya + f.h * (1 + (psi - f.psi0) / bd_SP.step);
		if (psi <= f.end + bd_SP.land) return f.yb;
	}
	return F[F.length - 1].yb;
}

/** one spiral stair: from the ground (0.12) to the sky garden, landing on every level's floor */
function bd_spiral(bag, s) {
	const sg = s.x > 0 ? 1 : -1, SP = bd_SP, F = bd_spFlights();
	const P3 = (psi, r, y) => {
		const [x, z] = bd_spP(s, psi, r);
		return [x, y, z];
	};
	// the tread: a sector of oak 45 mm thick from the column to the stringer, its nosing over the tread below
	// (and its back a degree under the next, so no slit opens between a flight's last tread and its landing)
	const ov = (1.6 * Math.PI) / 180, back = Math.PI / 180, half = SP.step / 2, out = [];
	for (let i = 0; i <= 2; i++) out.push([SP.col + 0.004, -half - ov + ((SP.step + ov + back) * i) / 2]);
	for (let i = 6; i >= 0; i--) out.push([SP.tread, -half - ov + ((SP.step + ov + back) * i) / 6]);
	const outline = out.map(([r, f]) => [r * Math.cos(sg * f), -r * Math.sin(sg * f)]);
	const tread = boxUV(bd_slab(outline, 0.045, 0.012, (u, v, w) => [u, w - 0.045, v], 2), TILE.oak);
	for (const f of F)
		for (let i = 1; i < f.n; i++) {
			const mid = f.psi0 + (i - 0.5) * SP.step, b = bd_spB(s, mid);
			bag.add('oak', tread.clone(), at(s.x, f.ya + i * f.h, s.z, b - Math.PI / 2));
		}
	// the column: slim oak, a collar at its foot, a rounded cap over the top landing
	const top = ROOF + 1.02;
	bag.add('oak', lathe([[0, 0.1], [0.14, 0.1], [0.14, 0.15], [0.12, 0.18], [0.1, 0.22], [SP.col, 0.27], [SP.col, top - 0.06], [0.1, top - 0.03], [0.085, top + 0.01], [0, top + 0.03]], 20, TILE.oak), at(s.x, 0.02, s.z));
	// the stringer: a smooth white band at the treads' outer ends, 0.28 m over the nosings and 0.42 m under them, rising
	// with them; over each landing it narrows into the slab's own thickness (its top under the floor), so one steps
	// off the landing over it
	const psiA = F[0].psi0 - 0.25, psiB = F[3].end + SP.land - 0.05;
	const onLanding = (psi) => (F.some((f) => psi > f.end && psi < f.end + SP.land) ? 1 : 0);
	const ease = (fn, psi) => {
		let v = 0;
		for (let j = -4; j <= 4; j++) v += fn(psi + (j * 1.5 * Math.PI) / 180) / 9;
		return v;
	};
	const rows = [];
	const n = Math.ceil((psiB - psiA) / ((4 * Math.PI) / 180));
	const corner = bd_rr(0.06, 0.06, 0.03, 0, 0, 3);
	for (let i = 0; i <= n; i++) {
		const psi = lerp(psiA, psiB, i / n);
		const y = Math.max(bd_floor(0) - 0.1, ease((p) => bd_spLine(F, p), psi)), t = ease(onLanding, psi);
		const top = y + lerp(0.28, -0.04, t), bot = y + lerp(-0.42, -0.34, t);
		const b = bd_spB(s, psi), ux = Math.sin(b), uz = Math.cos(b);
		// the section: a rounded rectangle 0.06 thick from bot to top (its corners those of a 6 cm square)
		const sec = corner.map(([u, v]) => [SP.band + u, v > 0 ? top - 0.03 + v : bot + 0.03 + v]);
		rows.push(sec.map(([r, yy]) => [s.x + r * ux, yy, s.z + r * uz]));
	}
	bag.add('plaster', bd_grid(sg > 0 ? rows : rows.reverse(), TILE.plaster, 1, true), null);
	// the rail over each flight: posts on the band, slats and a handrail following the nosings
	for (const f of F) {
		const pts = [];
		const m = Math.ceil((f.end - f.psi0) / ((7.5 * Math.PI) / 180));
		for (let i = 0; i <= m; i++) {
			const psi = lerp(f.psi0, f.end, i / m);
			pts.push(P3(psi, SP.band, bd_spLine(F, psi)));
		}
		bd_rail(bag, pts, { foot: 0.26, slats: [0.42, 0.57, 0.72], hand: 0.92 });
	}
	// round each hole at every level above: a guard of the same rail on the slab's upstand, open over the landing
	for (let k = 1; k <= 4; k++) {
		const y = bd_floor(k), L = SP.land / 2, pts = [];
		for (let i = 0; i <= 36; i++) pts.push(P3(L + 0.02 + ((TAU - 2 * L - 0.04) * i) / 36, SP.hole - 0.08, y));
		bd_rail(bag, pts);
	}
}

/* ---- 7. THE GRAND STAIR: wide curved flights up the terraces from the plaza to the sky garden ---- */

/**
 * Each flight a crescent convex to the garden: oak treads with rounded nosings on white risers, solid curved white
 * balustrade walls 0.9 m over the nosings capped by a rounded oak handrail, a smooth white soffit under it, and a
 * curved landing at its head onto the next slab. The plaza's flight flares at its foot.
 */
function bd_grand(bag) {
	for (const s of bd_GSPEC) {
		const { R, dphi, phi0, phi1, n, h, ya, yb, cx, cz, dir } = s;
		const beta = (phi) => Math.atan2(dir * Math.sin(phi), -Math.cos(phi));
		// the treads: a template for the plain ones (its grain along it, across the flight), the flared ones each
		const ov = 0.03 / R;
		const treadAt = (hwi) => {
			const out = [];
			for (let i = 0; i <= 3; i++) out.push([R - s.hw - 0.02, -dir * (-dphi / 2 - ov + ((dphi + ov) * i) / 3)]);
			for (let i = 3; i >= 0; i--) out.push([R + hwi + 0.02, -dir * (-dphi / 2 - ov + ((dphi + ov) * i) / 3)]);
			const outline = out.map(([r, d]) => [r * Math.cos(d), -r * Math.sin(d)]);
			return boxUV(bd_slab(outline, 0.045, 0.014, (u, v, w) => [u, w - 0.045, v], 2), TILE.oak);
		};
		const plain = treadAt(s.hw);
		for (let i = 1; i < n; i++) {
			const pm = phi0 + (i - 0.5) * dphi, hwi = s.half(pm);
			const geo = hwi > s.hw + 0.01 ? treadAt(hwi) : plain.clone();
			bag.add('oak', geo, at(cx, ya + i * h, cz, beta(pm) - Math.PI / 2));
		}
		// the risers: white, under each nosing, set back 3 cm
		const ris = new bd_Soup();
		for (let i = 1; i < n; i++) {
			const p = phi0 + (i - 1) * dphi + 0.03 / R;
			const a = s.P(p, R - s.hw - 0.02), b = s.P(p, R + s.half(p) + 0.02);
			const y0 = i === 1 ? ya - 0.01 : ya + (i - 1) * h, y1 = ya + i * h - 0.045;
			const back = s.P(p + 0.1, R);
			ris.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [s.P(p, R)[0] - back[0], 0, s.P(p, R)[1] - back[1]]);
		}
		bag.add('plaster', ris.geometry(0.3), null, { uv: 'box' });
		// the line it follows, smoothed so its walls and soffit ease into the landing
		const sm = (phi) => {
			let y = 0;
			for (let j = -3; j <= 3; j++) y += s.line(phi + j * dphi * 0.5) / 7;
			return y;
		};
		const steps = (p0, p1) => {
			const m = Math.max(2, Math.ceil((p1 - p0) / (dphi / 2))), out = [];
			for (let i = 0; i <= m; i++) out.push(lerp(p0, p1, i / m));
			return out;
		};
		// the walls: 0.12 thick, from under the soffit to 0.9 m over the nosings, their tops rounded, oak caps on them
		for (const [side, p1] of [[-1, s.phiI], [1, s.phiL]]) {
			const path = steps(phi0 - dphi, p1).map((p) => {
				const [x, z] = s.P(p, R + side * (s.half(p, side) + 0.06));
				return [x, sm(p), z];
			});
			const pth = dir < 0 ? path : path.slice().reverse();
			bag.add('plaster', bd_sweep(pth, bd_rr(0.12, 1.36, 0.05, 0, 0.9 - 0.68 - 0.02, 2), { caps: true, tile: TILE.plaster }));
			bag.add('oak', bd_sweep(pth.map(([x, y, z]) => [x, y + 0.9, z]), bd_rr(0.15, 0.06, 0.026, 0, 0, 2), { caps: true, tile: TILE.oak }));
			// a round newel where the wall starts: a white drum flared at its foot, an oak cap the handrail ends on
			const [nx, ny, nz] = path[0], top = ny + 0.9;
			bag.add('plaster', lathe([[0, ya - 0.02], [0.17, ya - 0.02], [0.17, ya + 0.03], [0.14, ya + 0.06], [0.122, ya + 0.11], [0.113, ya + 0.18], [0.11, ya + 0.26], [0.11, top - 0.03], [0, top - 0.03]], 24, TILE.plaster), at(nx, 0, nz), { uv: 'box' });
			bag.add('oak', lathe([[0, top - 0.04], [0.12, top - 0.04], ...bd_tail(bd_arc(0.1, top + 0.0, 0.035, -Math.PI / 2, Math.PI / 2, 4)), [0.06, top + 0.05], [0, top + 0.055]], 24, TILE.oak), at(nx, 0, nz));
		}
		// the soffit: a smooth white surface under the flight and its landing, between the walls
		const rows = steps(phi0 - dphi * 0.5, s.phiL).map((p) => {
			const y = sm(p) - 0.4;
			return (dir > 0 ? [-1, 1] : [1, -1]).map((sd) => {
				const [x, z] = s.P(p, R + sd * (s.half(p, sd) + 0.06));
				return [x, Math.max(ya - 0.02, y), z];
			});
		});
		bag.add('plaster', bd_grid(rows, TILE.plaster, 0, false), null, { uv: 'box' });
		// the landing: from the flight's head to the next slab's front, an oak deck on a white body
		const clampTo = (pt, o) => {
			const e = bd_on(s.gEnd, pt[0], o)[1];
			return [pt[0], Math.min(pt[1], e)];
		};
		const ring = (o) => {
			const pts = [];
			for (const p of steps(phi1, s.phiL)) pts.push(clampTo(s.P(p, R - s.hw - 0.02), o));
			for (const p of steps(phi1, s.phiL).reverse()) pts.push(clampTo(s.P(p, R + s.hw + 0.02), o));
			return pts;
		};
		bag.add('floor', bd_flat(ring(0.02), [], yb), null, { uv: 'box' });
		bag.add('plaster', bd_slab(ring(0.1), 0.4, 0.04, (u, v, w) => [u, yb - 0.41 + w, v], 2), null, { uv: 'box' });
	}
}

/* ---- 8. THE SKY GARDEN on the roof: an oak deck, rails, curved planters with fruit, a curved bench ---- */

/** a profile ([r, y]) turned round the dome's axis from bearing b0 to b1, its two ends closed */
function bd_ring(prof, b0, b1, tile) {
	const geo = bd_revolve(prof, b0, b1, tile, 1, true).toNonIndexed();
	const caps = new bd_Soup();
	const tris = THREE.ShapeUtils.triangulateShape(prof.map(([r, y]) => new THREE.Vector2(r, y)), []);
	for (const [b, e] of [[b0, -1], [b1, 1]]) {
		const row = prof.map(([r, y]) => [r * Math.sin(b), y, r * Math.cos(b)]);
		const dir = [Math.cos(b) * e * Math.sign(b1 - b0), 0, -Math.sin(b) * e * Math.sign(b1 - b0)];
		for (const [a, c, d] of tris) caps.face(row[a], row[c], row[d], dir);
	}
	const cg = caps.geometry(0.1);
	cg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cg.attributes.position.count * 2), 2));
	return mergeGeometries([geo, cg]);
}

function bd_sky(bag, dome) {
	const y = ROOF;
	// three planters along an arc round the dome's middle, behind the deck's open middle, with fruit trees and herbs
	const beds = [
		{ r: 33.0, a: -0.105, b: 0.105, kinds: [['basil', 4, 5], ['papaya', 8, 9], ['coffee', 5, 6], ['papaya', 6, 7], ['basil', 4, 5]] },
		{ r: 32.6, a: -0.33, b: -0.2, kinds: [['coffee', 5, 6], ['fig', 6, 7], ['basil', 4, 5]] },
		{ r: 32.6, a: 0.2, b: 0.33, kinds: [['basil', 4, 5], ['fig', 5, 6], ['coffee', 5, 6]] }
	];
	beds.forEach((bed, i) => {
		const prof = bd_PLANTER.map(([o, yy]) => [bed.r + o * 1.5, y + yy]);
		bag.add('plaster', bd_ring(prof, bed.a, bed.b, TILE.plaster), null, { uv: 'box' });
		bag.add('soil', bd_revolve([[bed.r - 0.26, y + 0.435], [bed.r + 0.26, y + 0.435]], bed.a + 0.004, bed.b - 0.004, TILE.soil, 0), null);
		const r = chance('bd-sky', i);
		bed.kinds.forEach(([kind, s0, s1], j) => {
			const b = lerp(bed.a, bed.b, (j + 0.5) / bed.kinds.length);
			const rr = bed.r - (kind === 'papaya' ? 0.1 : 0);
			dome.plant(kind, +(rr * Math.sin(b)).toFixed(3), +(y + 0.435).toFixed(3), +(rr * Math.cos(b)).toFixed(3), { stage: Math.round(between(r, s0, s1)), seed: `sky-${i}-${j}`, turn: +(r() * TAU).toFixed(2) });
		});
	});
	// the bench along the middle planter's south face: a white plinth, an oak seat, a white back, all curved
	const r0 = 33.0 - 0.45 - 0.56, a = -0.095, b = 0.095;
	const plinth = [[r0 + 0.05, y - 0.01], [r0 + 0.56, y - 0.01], [r0 + 0.56, y + 0.4], [r0 + 0.05, y + 0.4]];
	bag.add('plaster', bd_ring(plinth, a + 0.004, b - 0.004, TILE.plaster), null, { uv: 'box' });
	const seat = bd_rr(0.56, 0.055, 0.02, r0 + 0.28, y + 0.4 + 0.0275, 2);
	bag.add('oak', bd_ring(seat.slice().reverse(), a, b, TILE.oak), null);
	const back = [[r0 + 0.43, y + 0.43], [r0 + 0.56, y + 0.43], [r0 + 0.56, y + 0.78], ...bd_tail(bd_arc(r0 + 0.5, y + 0.78, 0.06, 0, Math.PI, 4)).map(([rr, yy]) => [rr - 0.01, yy]), [r0 + 0.43, y + 0.74]];
	bag.add('plaster', bd_ring(back, a + 0.002, b - 0.002, TILE.plaster), null, { uv: 'box' });
}

/* ---- the part ---- */

/** THE BUILDING: everything of the north quarter but its furniture, into the bag 'building'; six lamps */
function buildingPart(dome) {
	const bag = dome.bag('building');
	bd_ground(bag);
	for (let k = 1; k <= 4; k++) bd_slab_k(bag, k);
	for (let k = 0; k < 4; k++) {
		bd_facade(bag, k);
		bd_rooms(bag, k);
	}
	for (let k = 1; k <= 4; k++) bd_terrace(bag, dome, k);
	for (const s of STAIRS) bd_spiral(bag, s);
	bd_grand(bag);
	bd_sky(bag, dome);
	// the lamps: the stair halls (their first floors), the three lounges, the dining hall
	// (short reaches: a lamp's light passes walls, so it must not reach the rooms beside)
	for (const s of STAIRS) dome.lamp(s.x, LEVELS[1].y + 3.1, facadeZ(1, s.x) + 2.2, { distance: 3.2, intensity: 4 });
	for (let k = 1; k < 4; k++) dome.lamp(0, LEVELS[k].y + 3.0, facadeZ(k, 0) + 3.2, { distance: 4.5 });
	dome.lamp(0, 3.5, facadeZ(0, 0) + 5, { distance: 6.5 });
}

/* ================================================================================================================
 * 7. FURNISHING — where each thing of the library stands, room by room and on the terraces
 * ================================================================================================================ */

/**
 * Every room of ROOMS furnished by its kind, in its own frame (roomMatrix: +x along the façade, +z out to the garden,
 * the room from z = −d0 to z = −d1, y from its floor), with the things of THINGS (play's own furniture, by hash) and,
 * in pots and troughs, the library's plants. A thing's front is its +z (a bed's foot, a chair's seat), a wall piece's
 * back is its z = 0, a pendant hangs from its origin. The doors are kept clear: to the terrace at the façade's west end
 * of each suite (x from −w/2 + 0.6 to −w/2 + 2), to the bath and the studio at the east end of the walls behind.
 */
/** the floor a level's rooms stand on, over its slab's top (the ground level's is raised to the plaza's) */
const fu_floorAt = (k) => (k === 0 ? 0.12 : 0);
/** the soil's height in a pot and in a trough (their things' own measures) */
const FU_POT_SOIL = 0.4;
const FU_TROUGH_SOIL = 0.5;
/** what was left out because the library lacks it (a thing not made): counted, the rest furnished */
const fu_missing = new Set();

function furnishPart(dome) {
	const has = (t) => typeof THINGS !== 'undefined' && !!THINGS[t];
	/** a thing in room `rm` at its local [x, z] (y over its floor), turned `turn` (0: its front out to the garden) */
	const put = (rm, thing, x, z, turn = 0, y = 0) => {
		if (!has(thing)) return void fu_missing.add(thing);
		const m = roomMatrix(rm.level, rm.x).multiply(at(x, fu_floorAt(rm.level) + y, z, turn));
		dome.place(thing, m);
	};
	/** a library plant in room `rm` at local [x, y, z] (y over its floor): its world place */
	const plantIn = (rm, kind, x, y, z, o) => {
		const p = new THREE.Vector3(x, fu_floorAt(rm.level) + y, z).applyMatrix4(roomMatrix(rm.level, rm.x));
		dome.plant(kind, p.x, p.y, p.z, o);
	};
	/** a pot with a plant in it */
	/**
	 * A pot with a plant in it. A plant's roots are part of its build, so only one whose roots stay in the pot: a pepper
	 * as it is; for the tropical bushes asked for (a young banana's cord roots run 2.3 m out over the floor, a coffee's
	 * 1 m) a lemon in its first year after planting (its stage 2: 1.3 m, roots 0.52 m deep and 0.23 m out) in a pot 1.6
	 * times the library's (0.8 m across, its soil 0.64 m up).
	 */
	const potted = (rm, x, z, kind, stage, seed) => {
		if (!has('pot-terracotta')) return void fu_missing.add('pot-terracotta');
		const tree = kind === 'banana' || kind === 'coffee', k = tree ? 1.6 : 1;
		dome.place('pot-terracotta', roomMatrix(rm.level, rm.x).multiply(at(x, fu_floorAt(rm.level), z, 0, k)));
		plantIn(rm, tree ? 'lemon' : kind, x, FU_POT_SOIL * k, z, tree ? { exact: 2, turn: x * 3 + z } : { stage, seed, turn: x * 3 + z });
	};
	/** a lamp's light in room `rm` at local [x, y, z] */
	const light = (rm, x, y, z, o) => {
		const p = new THREE.Vector3(x, fu_floorAt(rm.level) + y, z).applyMatrix4(roomMatrix(rm.level, rm.x));
		dome.lamp(p.x, p.y, p.z, o);
	};

	for (const rm of ROOMS) {
		const r = chance('furnish', rm.id);
		const W = rm.w / 2, d0 = rm.d0, d1 = rm.d1, h = rm.h - (rm.level === 0 ? 0.12 : 0);
		// a room mirrored (its own things swapped east and west) where its doors allow: none here, the doors fix the sides
		if (rm.kind === 'suite') {
			// the bed against the wall behind, its foot to the garden, clear of the bath's door at the east end
			const bx = -0.35, bz = -d1 + 0.15 + 1.1;
			// the rug at the bed's foot, not under it (a jute rug is 12 mm thick: what stands on it is lifted by that)
			put(rm, 'rug-jute-round', bx, bz + 1.95, 0);
			put(rm, 'bed-platform', bx, bz, 0);
			for (const s of [-1, 1]) {
				put(rm, 'nightstand-round', bx + s * 1.27, -d1 + 0.4, 0);
				put(rm, 'lamp-mushroom', bx + s * 1.27, -d1 + 0.4, r() * TAU, 0.5);
			}
			// by the glass: a desk to work at, or a chair to read in
			if (r() < 0.5) {
				put(rm, 'desk-curved', W - 1.25, -1.35, Math.PI);
				put(rm, 'chair-desk', W - 1.25, -2.05, Math.PI + (r() - 0.5) * 0.3);
			} else {
				put(rm, 'armchair-round', W - 1.0, -1.4, -0.5);
				put(rm, 'table-side-travertine', W - 1.95, -1.1, 0);
				put(rm, 'lantern-floor', W - 0.45, -2.3, r() * TAU);
			}
			put(rm, 'curtain-linen', W - 0.85, -0.12, Math.PI);
			put(rm, 'lantern-pendant', 0.4, -2.6, r() * TAU, h);
			// the pot by the wall, clear of the stair hall's side door where there is one (d 2.55–3.45, its leaf into here)
			if (r() < 0.7) potted(rm, -W + 0.5, -5.0, r() < 0.5 ? 'banana' : 'coffee', r() < 0.5 ? 3 : 4, 'p' + Math.floor(r() * 3));
			// on its terrace, past a lane along the glass: a daybed by the rail, or two chairs and a table
			if (rm.level > 0) {
				if (r() < 0.5) {
					put(rm, 'daybed-terrace', 0.3, 2.55, Math.PI / 2);
					put(rm, 'table-side-travertine', 1.75, 2.4, 0);
				} else {
					put(rm, 'armchair-round', -0.6, 2.4, 0.25);
					put(rm, 'armchair-round', 0.9, 2.4, -0.25);
					put(rm, 'table-side-travertine', 0.15, 2.85, 0);
				}
				put(rm, 'lantern-floor', W - 0.5, 2.9, 0);
			}
		} else if (rm.kind === 'bath') {
			// along the wall to the suite (z = −d0): the vanity; on the wall behind: the shower and the toilet; the tub free
			// between; the doors at the east end kept clear
			put(rm, 'vanity-curved', -W + 1.55, -d0 - 0.075, Math.PI);
			put(rm, 'shower-walk-in', -W + 0.75, -d1 + 0.075, 0);
			put(rm, 'toilet-wall', -W + 2.35, -d1 + 0.075, 0);
			put(rm, 'bath-tub-freestanding', -0.2, -(d0 + d1) / 2 + 0.05, 0);
		} else if (rm.kind === 'studio') {
			// under the sloping shell: a desk facing the shell's windows, a bookcase on the wall to the bath, a reading chair
			const mid = -(d0 + d1) / 2;
			put(rm, 'bookcase-oak', -W + 0.85, -d0 - 0.25, Math.PI);
			put(rm, 'desk-curved', -0.2, mid - 0.2, 0);
			put(rm, 'chair-desk', -0.2, mid + 0.55, Math.PI);
			put(rm, 'armchair-round', W - 1.1, -d0 - 1.3, Math.PI - 0.5);
			put(rm, 'pouf-linen', W - 1.5, -d0 - 2.5, 0);
		} else if (rm.kind === 'lounge') {
			const back = -Math.min(d1, 8.5);
			put(rm, 'rug-jute-round', 0, -3.4, 0);
			put(rm, 'sofa-curved', 0, -4.6, 0);
			put(rm, 'table-coffee-travertine', 0, -3.0, 0.2, 0.012);
			for (const s of [-1, 1]) {
				put(rm, 'armchair-round', s * 2.5, -2.3, -s * 0.9);
				put(rm, 'lantern-floor', s * 3.3, -5.6, 0);
			}
			if (d1 > 7.5) put(rm, 'bookcase-oak', -1.4, back + 0.2, 0), put(rm, 'bookcase-oak', 1.4, back + 0.2, 0);
			put(rm, 'lantern-pendant-large', 0, -3.4, 0, h);
			potted(rm, 3.3, -0.8, 'banana', 4, 'l' + rm.level);
			potted(rm, -3.3, -0.8, 'coffee', 5, 'l' + rm.level);
			if (rm.level === 1) light(rm, 0, h - 1.2, -3.4);
		} else if (rm.kind === 'hall') {
			// the dining hall: round tables by the glass, the kitchen behind (a counter along the back wall, the island)
			for (const tx of [-5.6, 0, 5.6])
				for (const tz of [-2.6, -5.7]) {
					put(rm, 'table-dining-round', tx, tz, r() * TAU);
					for (let c = 0; c < 4; c++) {
						const a = (c / 4) * TAU + 0.4 + r() * 0.2;
						put(rm, 'chair-spindle', tx + Math.sin(a) * 0.92, tz + Math.cos(a) * 0.92, a + Math.PI);
					}
				}
			for (const tx of [-5.6, 0, 5.6]) put(rm, 'lantern-pendant-large', tx, -4.15, 0, h);
			put(rm, 'kitchen-counter', -2.6, -d1 + 0.08, 0);
			put(rm, 'kitchen-counter', 2.6, -d1 + 0.08, 0);
			// its fronts to the cook between it and the back counter, its seating overhang to the dining room
			put(rm, 'kitchen-island-curved', 0, -9.0, Math.PI);
			for (const sx of [-0.9, 0, 0.9]) put(rm, 'stool-oak', sx, -8.05, Math.PI);
			potted(rm, -8.3, -0.9, 'banana', 4, 'h1');
			potted(rm, 8.3, -0.9, 'banana', 4, 'h2');
			light(rm, 0, h - 0.8, -4.2);
			light(rm, 0, h - 0.8, -9.0);
		} else if (rm.kind === 'library') {
			// along the back wall, leaving the door to the service room behind clear (local x −0.45 … 0.45 at d 12)
			for (let i = 0; i < 7; i++) {
				const bx = -W + 0.75 + i * 1.25;
				if (Math.abs(bx) < 1.15 || bx > W - 0.6) continue;
				put(rm, 'bookcase-oak', bx, -d1 + 0.2, 0);
			}
			put(rm, 'rug-jute-round', 0.6, -5.4, 0);
			put(rm, 'table-library-long', 0.6, -5.4, 0, 0.012);
			for (const s of [-1, 1]) for (const cx of [-0.7, 0.5, 1.7]) put(rm, 'chair-spindle', cx, -5.4 + s * 0.85, s < 0 ? 0 : Math.PI);
			put(rm, 'armchair-round', -W + 1.4, -1.5, 0.6);
			put(rm, 'armchair-round', W - 1.4, -1.5, -0.6);
			put(rm, 'table-side-travertine', -W + 2.5, -1.2, 0);
			put(rm, 'lantern-floor', W - 0.6, -2.6, 0);
			for (const tx of [-1.6, 2.8]) put(rm, 'lantern-pendant', tx, -5.4, 0, h);
			light(rm, 0.6, h - 1.2, -5.4);
		} else if (rm.kind === 'workshop') {
			put(rm, 'workbench-oak', -W + 1.3, -d1 + 0.08, 0);
			put(rm, 'workbench-oak', -W + 3.4, -d1 + 0.08, 0);
			put(rm, 'table-library-long', 0.8, -5.2, Math.PI / 2);
			for (const sz of [-6.2, -4.2]) put(rm, 'stool-oak', -0.3, sz, Math.PI / 2), put(rm, 'stool-oak', 1.9, sz, -Math.PI / 2);
			potted(rm, W - 0.6, -1.0, 'pepper', 9, 'w');
			light(rm, 0, h - 1.2, -6);
		} else if (rm.kind === 'stair') {
			// keep the spiral's circle clear; a bench and a trough of plants by the terrace's opening where there is room
			const sx = STAIRS[rm.x < 0 ? 0 : 1];
			const sd = sx.z - facadeZ(rm.level, rm.x);
			if (sd > sx.r + 2.4) {
				put(rm, 'bench-oak-curved', 0, -1.0, 0);
				if (rm.level > 0) put(rm, 'planter-trough', 0, 1.8, 0);
			}
			if (rm.level > 0 && has('planter-trough') && sd > sx.r + 2.4)
				for (const px of [-0.5, 0.5]) plantIn(rm, px < 0 ? 'nasturtium' : 'basil', px, FU_TROUGH_SOIL, 1.8, { stage: 9, seed: 's' + rm.level });
		}
	}
	return { missing: [...fu_missing] };
}

/* ================================================================================================================
 * 8. RECIPE
 * ================================================================================================================ */

const DOME = {
	id: 'forest-dome',
	label: 'Forest dome · 80 m',
	note:
		'An 80 m geodesic dome whose south three quarters are a food forest under glass and whose north quarter holds the rooms: four storeys stepping back from the shell as indoor terraces over the forest, under a closed bioceramic shell with triangular windows. Meandering gravel paths, a brook from a spring at the terraces’ foot to a pond by the south door, the plants of the library in seven layers; outside, a one-storey limestone arcade round the glass carrying a terrace all the way round, a balustrade on it and four stairs up from the cloister walk, furnished as a place to meet: pergolas with passion fruit over the gates, tables, daybeds, armchairs, benches, young lemons in pots, troughs of herbs. Walk in by the south door.'
};

/** the whole dome, built: each part into its bags, merged by material and chunk, the plants marked, the lamps lit */
function buildDome() {
	const dome = newDome();
	const t = {};
	const step = (name, fn) => {
		if (typeof fn !== 'function') return;
		const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
		fn(dome);
		if (t0) t[name] = Math.round(performance.now() - t0);
	};
	step('shell', typeof shellPart === 'undefined' ? null : shellPart);
	step('outside', typeof outsidePart === 'undefined' ? null : outsidePart);
	step('building', typeof buildingPart === 'undefined' ? null : buildingPart);
	step('furnishing', typeof furnishPart === 'undefined' ? null : furnishPart);
	step('ground', typeof groundPart === 'undefined' ? null : groundPart);
	const root = dome.root;
	root.name = DOME.id;
	// glass and water cast no shadow: the sun comes through them
	const noShadow = (m) => !['glass', 'water'].includes(m);
	for (const bag of Object.values(dome.bags)) root.add(bag.build({ castShadow: noShadow }));
	// the forest's floor named for its biome: the page lays the biome's surfaces and cover on these meshes
	root.traverse((o) => {
		if (o.isMesh && /^ground:soil(#c)?:/.test(o.name)) o.name = `biome:${BIOME.hash}`;
	});
	const plants = new THREE.Group();
	plants.name = 'plants';
	for (const p of dome.plants) plants.add(p.node);
	root.add(plants);
	const things = new THREE.Group();
	things.name = 'things';
	for (const t of dome.things) things.add(t.node);
	root.add(things);
	const lamps = new THREE.Group();
	lamps.name = 'lamps';
	for (const l of dome.lamps) lamps.add(l);
	root.add(lamps);
	// walked in from the south door, looking north up the path to the terraces
	const [sx, sz] = polar(R + 9, Math.PI);
	// (the walker's yaw 0 looks along −z: π looks north)
	root.userData.walk = { x: sx, z: sz, yaw: Math.PI, lamps: dome.walkLamps.slice(0, 8) };
	root.userData.note = DOME.note;
	root.userData.timings = t;
	return root;
}

module.exports.recipe = function (id, v, variant) {
	if (id !== DOME.id || variant) throw new Error(`no asset buildings/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'buildings', id: DOME.id, version: v, label: DOME.label, note: DOME.note },
		build: () => buildDome()
	};
};
