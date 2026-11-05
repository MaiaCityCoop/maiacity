import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { walkOf } from './hero.js'

/** a little building: a floor, a raised terrace with steps up to it, walls (one seen only from inside: BackSide), a
 *  two-sided screen, a turned and scaled roof on posts, a hidden mesh, a few instances of a kerb, and mirrored parts */
function building() {
	const root = new THREE.Group()
	const std = (side: THREE.Side = THREE.FrontSide) => new THREE.MeshStandardMaterial({ side })
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 4, 4).rotateX(-Math.PI / 2), std())
	const terrace = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6).translate(4, 0.5, 4), std())
	const steps = [0, 1, 2, 3].map((k) => new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25 * (k + 1), 0.3).translate(4, 0.125 * (k + 1), 0.6 + k * 0.3), std()))
	const inner = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 8).translate(-5, 1.5, -5), std(THREE.BackSide))
	const screen = new THREE.Mesh(new THREE.PlaneGeometry(4, 2).translate(0, 1, -1), std(THREE.DoubleSide))
	const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), std())
	roof.position.set(-4, 2.4, 5)
	roof.rotation.y = 0.4
	roof.scale.set(1.5, 1, 0.8)
	const hidden = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3).translate(7, 1.5, -6), std())
	hidden.visible = false
	const kerbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.15, 0.3), std(), 3)
	for (let q = 0; q < 3; q++) kerbs.setMatrixAt(q, new THREE.Matrix4().makeTranslation(-2 + q * 1.1, 0.075, 7))
	// mirrored parts, as recipes mirror a pair (scale −1): a slab, a room seen from inside, and a wall in a mirrored group
	const slab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), std())
	slab.position.set(6, 0.15, -6)
	slab.scale.x = -1
	const room = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), std(THREE.BackSide))
	room.position.set(-7, 1.25, 6)
	room.scale.z = -1
	const pair = new THREE.Group()
	pair.scale.x = -1
	pair.position.set(8, 0, 6)
	const plank = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2).translate(0, 0.4, 0), std())
	const wall = new THREE.Mesh(new THREE.PlaneGeometry(3, 2).translate(0, 1, 1.5), std())
	pair.add(plank, wall)
	root.add(floor, terrace, ...steps, inner, screen, roof, hidden, kerbs, slab, room, pair)
	root.position.set(1, 0, -2)
	return root
}

describe('walkOf a building that stands still: the same floors and walls, by its triangles filed by squares', () => {
	const root = building()
	root.updateMatrixWorld(true)
	const slow = walkOf(root), fast = walkOf(root, { still: true })
	let seed = 11
	const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

	it('finds the same floor everywhere', () => {
		for (let k = 0; k < 600; k++) {
			const x = -12 + rnd() * 24, z = -12 + rnd() * 24, ground = [0, 0.25, 0.5, 1, 2.4][Math.floor(rnd() * 5)]!
			expect(fast.floorAt(x, z, ground)).toBeCloseTo(slow.floorAt(x, z, ground), 5)
		}
	})

	it('stops the same strides', () => {
		let stopped = 0
		for (let k = 0; k < 600; k++) {
			const x = -12 + rnd() * 24, z = -12 + rnd() * 24, a = rnd() * Math.PI * 2, d = 0.1 + rnd() * 0.4
			const here = slow.floorAt(x, z, 0)
			const a1 = slow.canStand(x + Math.sin(a) * d, z + Math.cos(a) * d, here, 0, { x, z })
			expect(fast.canStand(x + Math.sin(a) * d, z + Math.cos(a) * d, here, 0, { x, z })).toBe(a1)
			if (!a1) stopped++
		}
		// some strides were stopped, so walls were really tested
		expect(stopped).toBeGreaterThan(20)
	})

	it('files a build whose parts lie far apart by the squares they cover, not a grid between them', () => {
		const far = new THREE.Group()
		const here = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2).translate(0, 0.25, 0), new THREE.MeshStandardMaterial())
		const there = here.clone()
		there.position.set(40000, 0, -40000)
		far.add(here, there)
		far.updateMatrixWorld(true)
		const t = performance.now()
		const w = walkOf(far, { still: true }), s = walkOf(far)
		expect(performance.now() - t).toBeLessThan(500)
		for (const [x, z] of [[0.3, 0.2], [40000.3, -39999.8], [20000, -20000], [-0.9, 0.9]]) expect(w.floorAt(x!, z!, 0)).toBeCloseTo(s.floorAt(x!, z!, 0), 5)
	})
})
