/*
 * THE CELL'S RELIEF AND GROUND MAP (intent db87a28f) — the hexagon's ground is not flat: 5–30 cm of hummocks and
 * hollows (the biomes' noise, ../../biomes/noise.js), on a grid of 2.5 m, laid flat where anything is built on it (the
 * domes, the squares, the paths, the water), every plant and the cover standing on it (`at`, exactly the grid's
 * triangles). Its ground map (R: shade under the real crowns, G: wet, beside the paths and the water and in the hollows)
 * is baked once the garden is planted and handed to the ground's material (`material.userData.map`).
 */
import * as THREE from 'three'
import { fbm2, vn } from '$lib/content/biomes/noise.js'

/** the relief's own height at x, z (m), before it is laid flat anywhere: 5 cm of it in some places, 30 in others */
export const reliefOf = (x: number, z: number) => {
	const amp = 0.025 + 0.125 * vn(x / 45 + 3.7, z / 45 + 1.3)
	return amp * (fbm2(x / 6.5 + 11.1, z / 6.5 + 4.2) * 2 - 1.1 + (vn(x / 2.4 + 5, z / 2.4 + 9) - 0.5) * 0.5)
}

/**
 * The ground over the square of `half` metres either side of 0, 0 where `inside` says, every `step` metres a vertex.
 * `shape(free)`: its heights, the relief where `free` says the ground is open (softened over a few metres at its edges).
 */
export function reliefGround(half: number, step: number, inside: (x: number, z: number) => boolean) {
	const n = Math.ceil((2 * half) / step) + 1
	const X = (i: number) => -half + i * step
	const h = new Float32Array(n * n)
	const pos = new Float32Array(n * n * 3)
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pos.set([X(i), 0, X(j)], (j * n + i) * 3)
	const idx: number[] = []
	for (let j = 0; j < n - 1; j++)
		for (let i = 0; i < n - 1; i++) {
			const x = X(i), z = X(j), s = step
			if (!(inside(x, z) || inside(x + s, z) || inside(x, z + s) || inside(x + s, z + s))) continue
			const a = j * n + i, b = a + 1, c = a + n, d = c + 1
			// split along a → d (up-facing: counter-clockwise seen from above)
			idx.push(a, c, d, a, d, b)
		}
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
	geometry.setIndex(idx)
	geometry.computeVertexNormals()
	return {
		geometry,
		/** the ground's height at x, z: the grid's own triangles, as drawn */
		at(x: number, z: number) {
			const fx = (x + half) / step, fz = (z + half) / step
			const i = Math.floor(fx), j = Math.floor(fz)
			if (i < 0 || j < 0 || i >= n - 1 || j >= n - 1) return 0
			const u = fx - i, v = fz - j, a = h[j * n + i]!, b = h[j * n + i + 1]!, c = h[(j + 1) * n + i]!, d = h[(j + 1) * n + i + 1]!
			// the triangle a, c, d (v over u) or a, d, b
			return v > u ? a + (d - c) * u + (c - a) * v : a + (b - a) * u + (d - b) * v
		},
		shape(free: (x: number, z: number) => boolean) {
			let m = new Float32Array(n * n)
			for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) m[j * n + i] = free(X(i), X(j)) ? 1 : 0
			// softened: three passes of a 3 × 3 mean, the relief running out over some 4 m to what is built
			for (let pass = 0; pass < 3; pass++) {
				const o = new Float32Array(n * n)
				for (let j = 0; j < n; j++)
					for (let i = 0; i < n; i++) {
						let s = 0
						for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += m[Math.min(n - 1, Math.max(0, j + dj)) * n + Math.min(n - 1, Math.max(0, i + di))]!
						o[j * n + i] = Math.min(m[j * n + i]!, s / 9)
					}
				m = o
			}
			for (let k = 0; k < n * n; k++) h[k] = m[k]! * reliefOf(X(k % n), X(Math.floor(k / n)))
			for (let k = 0; k < n * n; k++) pos[k * 3 + 1] = h[k]!
			geometry.attributes.position!.needsUpdate = true
			geometry.computeVertexNormals()
			geometry.computeBoundingSphere()
		}
	}
}

/**
 * A world's ground map over the square of `half` metres either side of 0, 0, a texel every `px` metres: R the shade
 * under its crowns (each x, z, r), G how wet the ground is (`wet(x, z)`, 0…1), each softened a little. For the
 * ground's material: `material.userData.map(texture, rect)`.
 */
export function groundMap(half: number, px: number, crowns: { x: number; z: number; r: number }[], wet: (x: number, z: number) => number) {
	const n = Math.ceil((2 * half) / px)
	const R = new Float32Array(n * n), G = new Float32Array(n * n)
	for (const c of crowns) {
		const i0 = Math.max(0, Math.floor((c.x - c.r + half) / px)), i1 = Math.min(n - 1, Math.ceil((c.x + c.r + half) / px))
		const j0 = Math.max(0, Math.floor((c.z - c.r + half) / px)), j1 = Math.min(n - 1, Math.ceil((c.z + c.r + half) / px))
		for (let j = j0; j <= j1; j++)
			for (let i = i0; i <= i1; i++) {
				const d = Math.hypot(-half + (i + 0.5) * px - c.x, -half + (j + 0.5) * px - c.z) / c.r
				// denser to the middle of a crown, open at its edge; crowns that overlap shade more
				if (d < 1) R[j * n + i] = Math.min(1, R[j * n + i]! + (1 - d * d) * 0.7)
			}
	}
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) G[j * n + i] = wet(-half + (i + 0.5) * px, -half + (j + 0.5) * px)
	const data = new Uint8Array(n * n * 4)
	const soft = (a: Float32Array, k: number) => {
		const i = k % n, j = Math.floor(k / n)
		let s = 0, w = 0
		for (let dj = -1; dj <= 1; dj++)
			for (let di = -1; di <= 1; di++) {
				const ii = i + di, jj = j + dj
				if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue
				s += a[jj * n + ii]!
				w++
			}
		return s / w
	}
	for (let k = 0; k < n * n; k++) {
		data[k * 4] = Math.round(soft(R, k) * 255)
		data[k * 4 + 1] = Math.round(soft(G, k) * 255)
		data[k * 4 + 3] = 255
	}
	const texture = new THREE.DataTexture(data, n, n)
	texture.magFilter = texture.minFilter = THREE.LinearFilter
	texture.needsUpdate = true
	return { texture, rect: [-half, -half, 2 * half, 2 * half] }
}
