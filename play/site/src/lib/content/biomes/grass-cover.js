/*
 * HOW MUCH OF THE GROUND THE GRASS COVERS, SEEN FROM THE EYE — intent e85a5860's measure of a sward (c4): the blades the
 * graphics card keeps (./grass-gpu.js `chooseOnCpu`, the compute's own sums), each built as its vertex stage builds it
 * (../render/nodes/grass.js: its height with its clump and the mask, its lean, its turn out of its clump, its width
 * wider as fewer stand and never under `minPx` pixels, its level's shape), rasterised from the eye into a mask of the
 * picture; then of the ground the eye sees between `near` and `far` metres, the share a blade covers. No GPU: the same
 * sums on the CPU, no wind, nothing trodden.
 *
 * `coverOf({ field, eye, yaw, pitch, … })` → { cover, ground, blades, perM2: { near, mid, far } }.
 */
import * as THREE from 'three';
import { STANDS, bladeHeight, bladeLevel, bladeOf, clumpAt, growAt, keep, shapeAt } from './grass.js';
import { chooseOnCpu, clumpNear, maskAt, planesOf, texelOf } from './grass-gpu.js';

/**
 * A kept blade's triangles in the world, as its vertex stage lays them (still air, nothing trodden).
 * @param {number} cx @param {number} cz @param {number} j @param {number} level 0, 1 or 2
 * @param {Parameters<typeof chooseOnCpu>[3] & { dev: { bands: number[], near: number, minPx: number, falloff?: number } }} v
 * @param {import('./grass.js').GrassParams} P @param {number} pxAt1m a metre's pixels at a metre
 * @returns {number[][]} its triangles, each three points [x, y, z]
 */
export function bladeTriangles(cx, cz, j, level, v, P, pxAt1m) {
	const b = bladeOf(cx, cz, j, v.n), m = maskAt(v.mask, b.x, b.z);
	// the tall grass's share, of the texel it stands in (the material samples it between texels)
	const tall = texelOf(v.mask, Math.floor(b.x / v.mask.texel), Math.floor(b.z / v.mask.texel)).tall;
	const d = Math.hypot(b.x - v.eye[0], m.y - v.eye[1], b.z - v.eye[2]);
	const grow = growAt(d, b.rank, b.end, v.dev, m.grass);
	const height = bladeHeight(b, P, tall) * grow;
	if (height <= 0) return [];
	// its lean: few stand straight, most a little, some far over; the way it leans, out of its clump
	const lean = (b.lean * b.lean * 1.1 + 0.3) * P.lean;
	const c = clumpAt(b.x, b.z, P.clump), near = clumpNear(b.x, b.z, P.clump);
	const ax = b.x - near.ax + 1e-4, az = b.z - near.az + 1e-4, al = Math.hypot(ax, az);
	let lx = Math.cos(b.facing) * (1 - c.out * 0.6) + (ax / al) * c.out * 0.9, lz = Math.sin(b.facing) * (1 - c.out * 0.6) + (az / al) * c.out * 0.9;
	const ll = Math.hypot(lx, lz);
	(lx /= ll), (lz /= ll);
	// wider as fewer stand, never under minPx pixels
	const thin = 1 / Math.sqrt(Math.max(keep(d, v.dev), 0.12));
	const width = Math.max(P.width * (v.dev.stands ?? STANDS) * b.width * thin, (d * v.dev.minPx) / pxAt1m);
	const L = bladeLevel(/** @type {0 | 1 | 2} */ (level));
	const pts = L.own.map(([t, s]) => {
		const [x, y, z] = shapeAt(t, s, { height, lean, width });
		// x across (lz, −lx), z the way it leans (lx, lz)
		return [b.x + lz * x + lx * z, m.y + y, b.z - lx * x + lz * z];
	});
	/** @type {number[][]} */
	const tris = [];
	for (let k = 0; k < L.index.length; k += 3) tris.push(/** @type {number[]} */ (pts[/** @type {number} */ (L.index[k])]), /** @type {number[]} */ (pts[/** @type {number} */ (L.index[k + 1])]), /** @type {number[]} */ (pts[/** @type {number} */ (L.index[k + 2])]));
	return tris;
}

/**
 * The share of the ground between `near` and `far` metres from the eye that the kept blades cover in its picture.
 * @param {{
 *   field: { mask: import('./grass.js').GrassMask, dev: any, n: number, hmax: number, clump: number },
 *   params: import('./grass.js').GrassParams, eye: [number, number, number], yaw: number, pitch: number,
 *   width?: number, height?: number, fov?: number, near?: number, far?: number, reach?: number
 * }} o
 *   yaw 0 looks to −z; reach: how far out blades are built (beyond `far`, as tall blades stand above nearer ground)
 */
export function coverOf(o) {
	const W = o.width ?? 320, H = o.height ?? 180, fov = o.fov ?? 55, near = o.near ?? 1.5, far = o.far ?? 10, reach = o.reach ?? far + 2;
	const camera = new THREE.PerspectiveCamera(fov, W / H, 0.05, 400);
	camera.position.set(...o.eye);
	camera.rotation.set(o.pitch, o.yaw, 0, 'YXZ');
	camera.updateMatrixWorld();
	camera.updateProjectionMatrix();
	const view = { ...o.field, eye: o.eye, planes: planesOf(camera) };
	const pxAt1m = H / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
	const covered = new Uint8Array(W * H);
	const p = new THREE.Vector3();
	const project = (/** @type {number[]} */ q) => {
		p.set(/** @type {number} */ (q[0]), /** @type {number} */ (q[1]), /** @type {number} */ (q[2])).project(camera);
		return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H, p.z];
	};
	/** a triangle filled into the mask (its pixel centres inside its edges) */
	const fill = (/** @type {number[]} */ a, /** @type {number[]} */ b, /** @type {number[]} */ c) => {
		if (a[2] > 1 || b[2] > 1 || c[2] > 1) return;
		const [ax, ay] = /** @type {[number, number]} */ (a), [bx, by] = /** @type {[number, number]} */ (b), [cx, cy] = /** @type {[number, number]} */ (c);
		const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
		if (Math.abs(area) < 1e-9) return;
		const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
		const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const px = x + 0.5, py = y + 0.5;
				const w0 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), w1 = (cx - bx) * (py - by) - (cy - by) * (px - bx), w2 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
				if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) covered[y * W + x] = 1;
			}
	};
	/* the blades kept round the eye, out to `reach`, by cell; and how many stand a square metre by distance */
	const R = Math.ceil(reach / 2) + 1, ex = o.eye[0], ez = o.eye[2];
	let blades = 0;
	const CELLM = Math.sqrt(view.n / view.dev.density);
	for (let a = Math.floor(ex / CELLM) - R; a <= Math.floor(ex / CELLM) + R; a++)
		for (let b = Math.floor(ez / CELLM) - R; b <= Math.floor(ez / CELLM) + R; b++)
			for (let j = 0; j < view.n; j++) {
				const level = chooseOnCpu(a, b, j, view);
				if (level < 0) continue;
				const bl = bladeOf(a, b, j, view.n), d = Math.hypot(bl.x - ex, bl.z - ez);
				if (d > reach) continue;
				const tris = bladeTriangles(a, b, j, level, view, o.params, pxAt1m);
				if (!tris.length) continue;
				blades++;
				for (let k = 0; k < tris.length; k += 3) fill(project(/** @type {number[]} */ (tris[k])), project(/** @type {number[]} */ (tris[k + 1])), project(/** @type {number[]} */ (tris[k + 2])));
			}
	/* the ground the eye sees between near and far: the pixels whose ray meets the ground there (flat, at the eye's foot) */
	const ray = new THREE.Vector3();
	let ground = 0, cover = 0;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			ray.set(((x + 0.5) / W) * 2 - 1, 1 - ((y + 0.5) / H) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
			if (ray.y >= -1e-6) continue;
			const t = -o.eye[1] / ray.y, gx = ray.x * t, gz = ray.z * t, d = Math.hypot(gx, gz);
			if (d < near || d > far) continue;
			ground++;
			cover += /** @type {number} */ (covered[y * W + x]);
		}
	return { cover: ground ? cover / ground : 0, ground, blades };
}

/**
 * How many blades the graphics card keeps a square metre round the eye, wherever it looks: in rings within 5 m, 5–20 m
 * and 20 m out to the field's end (each ring sampled, every `step`-th candidate of its cells).
 * @param {{ mask: import('./grass.js').GrassMask, dev: any, n: number, hmax: number, clump: number }} field
 * @param {[number, number, number]} eye @param {number} [step]
 */
export function keptPerM2(field, eye, step = 7) {
	const view = { ...field, eye, planes: [] };
	const end = /** @type {number} */ (field.dev.bands[2]), CELLM = Math.sqrt(field.n / field.dev.density), R = Math.ceil(end / CELLM) + 1;
	const rings = [[0, 5], [5, 20], [20, end]], kept = [0, 0, 0];
	for (let a = Math.floor(eye[0] / CELLM) - R; a <= Math.floor(eye[0] / CELLM) + R; a++)
		for (let b = Math.floor(eye[2] / CELLM) - R; b <= Math.floor(eye[2] / CELLM) + R; b++) {
			// a cell wholly beyond the field's end keeps nothing
			if (Math.hypot((a + 0.5) * CELLM - eye[0], (b + 0.5) * CELLM - eye[2]) > end + CELLM) continue;
			for (let j = 0; j < field.n; j += step) {
				if (chooseOnCpu(a, b, j, view) < 0) continue;
				const bl = bladeOf(a, b, j, field.n), d = Math.hypot(bl.x - eye[0], bl.z - eye[2]);
				const r = rings.findIndex(([lo, hi]) => d >= /** @type {number} */ (lo) && d < /** @type {number} */ (hi));
				if (r >= 0) kept[r] = /** @type {number} */ (kept[r]) + step;
			}
		}
	const area = rings.map(([lo, hi]) => Math.PI * (/** @type {number} */ (hi) ** 2 - /** @type {number} */ (lo) ** 2));
	const per = kept.map((k, i) => +(k / /** @type {number} */ (area[i])).toFixed(1));
	return { near: per[0], mid: per[1], far: per[2] };
}
