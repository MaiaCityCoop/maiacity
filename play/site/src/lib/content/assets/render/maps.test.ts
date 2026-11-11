/*
 * A piece of furniture keeps its fabric when it is drawn lighter, joined or let go of (intent e675cd87): a lighter level
 * made from a build draws the build's very materials, with their pictures and the corners' UVs, and letting go of the
 * build (./hold.js, intent 1893a631) leaves those materials and pictures to the level still drawing them. Before, the
 * build's last use disposed them under it, and they were drawn again from pictures already let go of: flat colour.
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createLowering, levelOf } from './lower.js'
import { prepare } from './prepare.js'
import { createPresets } from './presets.js'
import { budgetOf, errorOf, smallestOf } from './lod.js'
import { bake, joinBaked } from '../../sandbox-2/interior/bake'

/** a woven picture, `n` pixels a side */
const woven = (n = 8) => {
	const data = new Uint8Array(n * n * 4).map((_, i) => ((i >> 2) % 2 ? 200 : 120))
	const t = new THREE.DataTexture(data, n, n)
	t.wrapS = t.wrapT = THREE.RepeatWrapping
	t.needsUpdate = true
	return t
}
/** linen: a colour map and a normal map, as the furniture's fabrics are */
const linen = () => new THREE.MeshPhysicalMaterial({ color: '#d8cbb4', map: woven(), normalMap: woven(), roughness: 0.92, sheen: 0.6 })
/** a cushion: a dense rounded box, its UVs its own */
const cushion = (mat: THREE.Material) => new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.16, 0.45, 6, 0.06), mat)
/** whether a texture or material was disposed */
const watched = (o: THREE.EventDispatcher<any>) => {
	const seen = { gone: false }
	o.addEventListener('dispose', () => void (seen.gone = true))
	return seen
}

describe('a lighter level keeps its build’s fabric', () => {
	it('it draws the very materials of its build, their pictures, and UVs for every corner', async () => {
		const presets = createPresets()
		const base = prepare(cushion(linen()), { of: (m: THREE.Material) => presets.of(m) })
		const lowering = createLowering({ worker: false })
		const [light] = await lowering.lower(base, [{ budget: budgetOf(2, base.tris), most: budgetOf(2, Infinity), error: errorOf(2, base.radius), smallest: smallestOf(2, base.radius) }], false, true)
		const level = levelOf(base, light)
		lowering.dispose()
		expect(level.tris).toBeLessThan(base.tris)
		const [from] = base.draws, [to] = level.draws
		expect(to!.material).toBe(from!.material)
		expect((to!.material as THREE.MeshPhysicalMaterial).map).toBe((from!.material as THREE.MeshPhysicalMaterial).map)
		expect((to!.material as THREE.MeshPhysicalMaterial).normalMap).toBeTruthy()
		const uv = to!.geometry.attributes.uv as THREE.BufferAttribute
		expect(uv.count).toBe(to!.geometry.attributes.position!.count)
		// not all one place on the picture: the weave still runs over it
		expect(new Set(Array.from(uv.array, (v) => Math.round(v * 100))).size).toBeGreaterThan(4)
	})

	it('letting go of the build leaves its materials and pictures to the lighter level still drawn; they go with the last', async () => {
		const presets = createPresets()
		const mats: THREE.Material[] = []
		const base = prepare(cushion(linen()), { of: (m: THREE.Material) => (mats.push(presets.of(m)), mats[mats.length - 1]!) })
		const lowering = createLowering({ worker: false })
		const [light] = await lowering.lower(base, [{ budget: budgetOf(1, base.tris), most: budgetOf(1, Infinity), error: errorOf(1, base.radius), smallest: smallestOf(1, base.radius) }], false, true)
		lowering.dispose()
		const level = levelOf(base, light)
		// held as the renderer holds a level it made (./index.js `lower`)
		const held = presets.hold(level)
		const mat = level.draws[0]!.material as THREE.MeshPhysicalMaterial
		const [material, map, normal] = [watched(mat), watched(mat.map!), watched(mat.normalMap!)]
		// the build let go of (./index.js `evict`)
		for (const m of mats) presets.release(m)
		expect([material.gone, map.gone, normal.gone]).toEqual([false, false, false])
		expect(presets.size).toBe(1)
		// and the lighter level too: now they go
		for (const m of held) presets.release(m)
		expect([material.gone, map.gone, normal.gone]).toEqual([true, true, true])
		expect(presets.size).toBe(0)
	})
})

describe('a dome’s baked and joined meshes keep their fabric', () => {
	it('two cushions baked and joined: one mesh of the same material, its pictures, and UVs for every corner', async () => {
		const mat = linen()
		const scene = new THREE.Scene()
		for (const x of [0, 2]) {
			const g = new THREE.Group()
			const c = cushion(mat)
			c.position.x = x
			g.add(c)
			scene.add(bake(g))
		}
		// (joined a run a step: a walked world's dome joins them through the making budget, intent 095bc67c)
		expect(await joinBaked(scene)).toBe(1)
		const meshes: THREE.Mesh[] = []
		// the meshes drawn in the linen (beside them a bake's shadow stand-ins: ../../sandbox-kit/casters.js)
		scene.traverse((o) => void ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material === mat && meshes.push(o as THREE.Mesh)))
		expect(meshes.length).toBe(1)
		expect(mat.map).toBeTruthy()
		const g = meshes[0]!.geometry
		expect(g.attributes.uv!.count).toBe(g.attributes.position!.count)
	})
})
