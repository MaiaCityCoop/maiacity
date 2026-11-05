import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { groundOf } from './solo.js'

/** a building like the forest dome on the ground: a round floor and apron to 47.5 m, a path out of its south gate to
 *  58 m, and a terrace high up reaching further out than the apron (which is not ground), merged into one mesh with the
 *  floor as a building's meshes are merged by material (so only each face's own height tells them apart) */
function building() {
	const root = new THREE.Group()
	const ground = new THREE.CircleGeometry(47.5, 96).rotateX(-Math.PI / 2).translate(0, 0.03, 0)
	const high = new THREE.RingGeometry(40, 52, 64).rotateX(-Math.PI / 2).translate(0, 6.45, 0)
	const floor = new THREE.Mesh(mergeGeometries([ground, high]), new THREE.MeshBasicMaterial())
	const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial())
	path.position.set(0, 0.03, -52)
	// and a terrace of its own, wholly high
	const terrace = new THREE.Mesh(new THREE.RingGeometry(50, 54, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial())
	terrace.position.y = 6.45
	// a wall facing out at the apron's edge: it does not face up, so it is no ground either
	const wall = new THREE.Mesh(new THREE.CylinderGeometry(49, 49, 0.3, 64, 1, true), new THREE.MeshBasicMaterial())
	wall.position.y = 0.15
	root.add(floor, path, terrace, wall)
	return root
}

describe('groundOf: where a building alone in the cell has ground of its own', () => {
	const g = groundOf(building(), { gates: [Math.PI], gateHalf: 1.4, gateTo: 61, reach: 66 })

	it('is on its floor and apron, and on the path out of its gate', () => {
		expect(g.distance(0, 0)).toBe(0)
		expect(g.distance(30, 30)).toBe(0)
		// the path itself, measured with no gate's way kept: its own mesh is ground, beside it is not
		const bare = groundOf(building(), { reach: 66 })
		expect(bare.distance(0, -55)).toBe(0)
		expect(bare.distance(0.9, -56)).toBe(0)
		expect(bare.distance(4, -56)).toBeGreaterThan(2)
	})

	it('measures the distance out from the apron, round the dome', () => {
		expect(g.distance(51.5, 0)).toBeGreaterThan(3.4)
		expect(g.distance(51.5, 0)).toBeLessThan(4.6)
		// surely 4 m off: a little further out than 4 m, by the field's own error
		expect(g.clear(52.6, 0, 4)).toBe(true)
		expect(g.clear(51.5, 0, 4)).toBe(false)
	})

	it('keeps the gate its way on to the ring path, but not the other bearings', () => {
		// past the path's end, on the gate's line: the way on to the cell's ring path
		expect(g.distance(0, -60)).toBe(0)
		// beside it, more than its half width off
		expect(g.distance(5, -58)).toBeGreaterThan(3)
		// no gate to the north: open ground there
		expect(g.distance(0, 58)).toBeGreaterThan(9)
	})

	it('takes no high terrace or upright wall for ground, and is far beyond its reach', () => {
		// under the terrace (40–52 m, 6.45 m up) and beyond the apron, and on the wall's ring at 49 m: open ground
		expect(g.distance(0, 51)).toBeGreaterThan(3)
		expect(g.distance(0, 49)).toBeGreaterThan(1.2)
		expect(g.distance(200, 0)).toBe(Infinity)
	})

	it('is clear only surely: right at the apron\'s edge nothing is clear of it by its own error', () => {
		expect(g.clear(47.8, 0, 0.1)).toBe(false)
		expect(g.clear(48.7, 0, 0.1)).toBe(true)
	})

	it('counts an instanced paving where each instance lies', () => {
		const root = new THREE.Group()
		const slabs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial(), 2)
		slabs.setMatrixAt(0, new THREE.Matrix4().makeTranslation(10, 0.02, 0))
		slabs.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-10, 0.02, 0))
		root.add(slabs)
		const s = groundOf(root, { reach: 20 })
		expect(s.distance(10, 0)).toBe(0)
		expect(s.distance(-10, 0)).toBe(0)
		expect(s.distance(0, 0)).toBeGreaterThan(8)
	})

	it('finds a building without ground clear nowhere', () => {
		const root = new THREE.Group()
		root.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4).translate(0, 10, 0), new THREE.MeshBasicMaterial()))
		const s = groundOf(root, { reach: 20 })
		expect(s.clear(15, 15, 0.5)).toBe(false)
	})
})
