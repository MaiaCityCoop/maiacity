/*
 * SANDBOX 5'S BUILDING ON ITS GROUND — where the building standing alone in the middle of the cell (the forest dome) has
 * ground of its own: its floors, the walk under its arcade, the gravel apron, the paths out of its gates, every face of
 * it that looks up and lies low. Kept as a field of distances from that ground, so the cell's forest garden can be
 * planted right up to it (./village.ts `inBand`) instead of keeping a whole circle clear as far as its longest path
 * reaches (Samuel 2026-11-05: the green space before the dome a food forest too).
 */
import * as THREE from 'three';

/**
 * The building's own ground, as distances from it.
 * @param {THREE.Object3D} obj the building as it stands in the scene, its world matrices up to date
 * @param {{ low?: number, gates?: number[], gateHalf?: number, gateTo?: number, reach?: number, cell?: number }} [o]
 *   low: how high a face that looks up may lie and still be its ground (m); gates: its gates' bearings (0 north, π/2
 *   east), each kept clear `gateHalf` either side of its line out to `gateTo` m from the middle (the way on from its own
 *   path's end to the cell's paths); reach: how far out the field is kept (beyond it everything is far from the
 *   building); cell: the field's cells (m)
 * @returns {{ distance: (x: number, z: number) => number, clear: (x: number, z: number, off: number) => boolean }}
 *   distance: how far x, z is from the building's ground or a gate's way (0 on it, Infinity beyond `reach`); clear:
 *   whether it is surely `off` metres or more from them (the field's own errors taken off: a cell counts as ground where
 *   its middle is, it is read at the nearest cell's middle, and the chamfer reads up to 8.24 % long, at 22.5° to the
 *   cells). A building in which no ground is found is clear nowhere.
 */
export function groundOf(obj, o = {}) {
	const low = o.low ?? 0.5, cell = o.cell ?? 0.25, reach = o.reach ?? 70;
	const n = Math.ceil((2 * reach) / cell) + 1;
	const x0 = -reach, z0 = -reach;
	/** 0 where the building's ground is, Infinity elsewhere (then the distance, in cells) */
	const D = new Float32Array(n * n).fill(Infinity);
	let found = 0;
	const mark = (i, j) => {
		if (i >= 0 && j >= 0 && i < n && j < n) (D[j * n + i] = 0), found++;
	};
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), box = new THREE.Box3();
	const M = new THREE.Matrix4(), I = new THREE.Matrix4();
	/** a vertex of the geometry where the matrix puts it, its height first (most faces are too high, and go no further) */
	const heightOf = (/** @type {number[]} */ e, /** @type {THREE.BufferAttribute} */ pos, /** @type {number} */ k) => e[1] * pos.getX(k) + e[5] * pos.getY(k) + e[9] * pos.getZ(k) + e[13];
	/** the faces of a geometry laid by matrix `m` (the mesh's, or an instance's in it) */
	const lay = (/** @type {THREE.BufferGeometry} */ g, /** @type {THREE.Matrix4} */ m) => {
		const pos = /** @type {THREE.BufferAttribute} */ (g.attributes.position), idx = g.index;
		const e = m.elements;
		const count = idx ? idx.count : pos.count;
		for (let t = 0; t + 2 < count; t += 3) {
			const ka = idx ? idx.getX(t) : t, kb = idx ? idx.getX(t + 1) : t + 1, kc = idx ? idx.getX(t + 2) : t + 2;
			if (heightOf(e, pos, ka) > low || heightOf(e, pos, kb) > low || heightOf(e, pos, kc) > low) continue;
			a.fromBufferAttribute(pos, ka).applyMatrix4(m);
			b.fromBufferAttribute(pos, kb).applyMatrix4(m);
			c.fromBufferAttribute(pos, kc).applyMatrix4(m);
			// only what faces up (either way round) is ground: not a kerb's side
			const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
			const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
			const len = Math.hypot(cx, cy, cz);
			if (!(len > 1e-12) || Math.abs(cy) / len < 0.4) continue;
			// its corners, so a triangle smaller than a cell is not lost; then every cell whose middle it covers
			for (const p of [a, b, c]) mark(Math.round((p.x - x0) / cell), Math.round((p.z - z0) / cell));
			const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
			if (Math.abs(d) < 1e-12) continue;
			const i0 = Math.max(0, Math.ceil((Math.min(a.x, b.x, c.x) - x0) / cell)), i1 = Math.min(n - 1, Math.floor((Math.max(a.x, b.x, c.x) - x0) / cell));
			const j0 = Math.max(0, Math.ceil((Math.min(a.z, b.z, c.z) - z0) / cell)), j1 = Math.min(n - 1, Math.floor((Math.max(a.z, b.z, c.z) - z0) / cell));
			for (let j = j0; j <= j1; j++)
				for (let i = i0; i <= i1; i++) {
					const x = x0 + i * cell, z = z0 + j * cell;
					const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
					const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
					if (l1 >= -1e-6 && l2 >= -1e-6 && 1 - l1 - l2 >= -1e-6) mark(i, j);
				}
		}
	};
	obj.updateMatrixWorld(true);
	obj.traverse((node) => {
		const mesh = /** @type {THREE.Mesh | THREE.InstancedMesh} */ (node);
		if (!mesh.isMesh || !mesh.visible) return;
		const g = mesh.geometry;
		if (!g.attributes.position) return;
		if (!g.boundingBox) g.computeBoundingBox();
		// each of its instances where it stands (an instanced mesh), or the mesh itself; one wholly above the ground is none of it
		const inst = /** @type {THREE.InstancedMesh} */ (mesh);
		const k = inst.isInstancedMesh ? inst.count : 1;
		for (let q = 0; q < k; q++) {
			if (inst.isInstancedMesh) M.multiplyMatrices(mesh.matrixWorld, (inst.getMatrixAt(q, I), I));
			else M.copy(mesh.matrixWorld);
			if (box.copy(/** @type {THREE.Box3} */ (g.boundingBox)).applyMatrix4(M).min.y > low) continue;
			lay(g, M);
		}
	});
	// each gate's way out: along its bearing, gateHalf either side, to gateTo
	const half = o.gateHalf ?? 1.4, to = o.gateTo ?? 0;
	for (const g of o.gates ?? []) {
		const sx = Math.sin(g), sz = Math.cos(g);
		for (let j = 0; j < n; j++)
			for (let i = 0; i < n; i++) {
				const x = x0 + i * cell, z = z0 + j * cell;
				const along = x * sx + z * sz, across = Math.abs(x * sz - z * sx);
				if (along >= 0 && along <= to && across <= half) D[j * n + i] = 0;
			}
	}
	// the distance from them, cell to cell (a chamfer of 1 across and √2 diagonally, two sweeps)
	const R2 = Math.SQRT2;
	for (let j = 0; j < n; j++)
		for (let i = 0; i < n; i++) {
			const k = j * n + i;
			let v = D[k];
			if (i > 0) v = Math.min(v, D[k - 1] + 1);
			if (j > 0) {
				v = Math.min(v, D[k - n] + 1);
				if (i > 0) v = Math.min(v, D[k - n - 1] + R2);
				if (i < n - 1) v = Math.min(v, D[k - n + 1] + R2);
			}
			D[k] = v;
		}
	for (let j = n - 1; j >= 0; j--)
		for (let i = n - 1; i >= 0; i--) {
			const k = j * n + i;
			let v = D[k];
			if (i < n - 1) v = Math.min(v, D[k + 1] + 1);
			if (j < n - 1) {
				v = Math.min(v, D[k + n] + 1);
				if (i < n - 1) v = Math.min(v, D[k + n + 1] + R2);
				if (i > 0) v = Math.min(v, D[k + n - 1] + R2);
			}
			D[k] = v;
		}
	const distance = (/** @type {number} */ x, /** @type {number} */ z) => {
		const i = Math.round((x - x0) / cell), j = Math.round((z - z0) / cell);
		return i < 0 || j < 0 || i >= n || j >= n ? Infinity : D[j * n + i] * cell;
	};
	/** what the field may be out by: half a cell's diagonal where the ground is marked and as much where it is read,
	 *  and the chamfer's 8.24 % at worst (√(4 − 2√2)) */
	const slack = cell * Math.SQRT2, long = Math.sqrt(4 - 2 * Math.SQRT2);
	return { distance, clear: (x, z, off) => found > 0 && distance(x, z) / long - slack >= off };
}
