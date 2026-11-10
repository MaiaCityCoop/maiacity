import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createPlantings } from './plantings.js'

// The asset viewer disposes its plantings each time it shows another asset (VaultAsset.svelte): a throw there broke
// every other asset picked in one page, "No recipe of this version is in the catalog." or a blank stage (intent e5ddf0b2).
describe('plantings', () => {
	it('dispose, and dispose again, throws nothing, whether anything was planted or not', () => {
		const scene = new THREE.Scene()
		const p = createPlantings({ renderer: {} as import('three/webgpu').WebGPURenderer, camera: new THREE.PerspectiveCamera(), scene })
		p.clear()
		expect(() => p.dispose()).not.toThrow()
		expect(() => p.dispose()).not.toThrow()
		expect(p.guests()).toEqual([])
	})
})

// A biome shown on its own in the viewer grows over the whole ground it stands on, out to the horizon, not on its patch
// (intent 5fe91a2f; Samuel 2026-11-10: "The biomes are just the circle patch still. They should cover the whole area"):
// its grass by the worlds' own field round the eye (grassFieldOn; here the WebGL 2 fallback's tiles, no graphics card)
// and its cover by the earth's stream round the eye (./ground.js), the patch's own copies put away.
describe('biome over the whole ground', async () => {
	// @ts-ignore — plain JS
	const { BIOMES } = await import('$lib/content/biomes/index.js')
	// @ts-ignore — plain JS
	const { biomeCatalog } = await import('$lib/content/biomes/card.js')
	// @ts-ignore — plain JS
	const { groundOf } = await import('./ground.js')
	const meadow = BIOMES.find((b: any) => b.id === 'meadow')
	const MEADOW = { ...meadow, cover: meadow.cover.map((c: any, i: number) => ({ ...c, ref: 'a'.repeat(64) + `?kind=${i}` })) }
	const R = 6
	/** the meadow as its build lays it: a round patch, its ground and a group of copies a kind, its card's catalog on the root */
	const patchOf = () => {
		const root = new THREE.Group()
		root.name = 'meadow'
		root.userData.catalog = biomeCatalog(MEADOW, { ref: (_: string, i: number) => MEADOW.cover[i].ref, label: (k: string) => k })
		const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 32).rotateX(-Math.PI / 2))
		ground.name = 'ground'
		root.add(ground)
		for (const c of MEADOW.cover) {
			const g = new THREE.Group()
			g.name = `cover-${c.kind}`
			root.add(g)
		}
		return root
	}
	/** the eye 30 m out from the patch's middle, looking on along the ground */
	const eyeAway = () => {
		const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.05, 400)
		camera.position.set(30, 1.65, 0)
		camera.lookAt(40, 0, 0)
		camera.updateMatrixWorld()
		return camera
	}

	it('grows its grass round the eye 30 m from the patch, and puts its own copies away', () => {
		const scene = new THREE.Scene(), camera = eyeAway()
		const p = createPlantings({ renderer: {} as import('three/webgpu').WebGPURenderer, camera, scene })
		const root = patchOf()
		scene.add(root)
		p.show(root)
		for (let i = 0; i < 40; i++) p.update()
		for (const c of MEADOW.cover) expect(root.getObjectByName(`cover-${c.kind}`)!.visible).toBe(false)
		const grass = scene.getObjectByName('grass')!
		expect(grass).toBeTruthy()
		// blades drawn in tiles within 5 m of the eye, every one of them far beyond the patch
		let near = 0
		grass.traverse((m: any) => {
			if (!m.isMesh || !m.parent) return
			const d = Math.hypot(m.position.x - camera.position.x, m.position.z - camera.position.z)
			if (d < 5 + 4 && m.geometry.instanceCount > 0) near += m.geometry.instanceCount
		})
		expect(near).toBeGreaterThan(1000)
		p.dispose()
	})

	it('streams its cover round the eye 30 m from the patch, its grass kinds left to the blades', () => {
		const camera = eyeAway()
		/** the renderer as the stream asks for it: each copy where it is put down, its kind */
		const copies: { kind: string, x: number, z: number }[] = []
		const drawn = {
			use: (ref: string) => ref,
			take: (kind: string, m: THREE.Matrix4) => {
				const c = { kind, x: m.elements[12]!, z: m.elements[14]! }
				copies.push(c)
				return c
			},
			give: (c: any) => copies.splice(copies.indexOf(c), 1),
			round: () => {}
		}
		const stage = { scene: new THREE.Scene(), bg: new THREE.Color(), sky: null, low: false }
		const earth = groundOf(stage, { drawn })
		earth.biome(MEADOW, 'meadow')
		earth.fit(patchOf(), { open: R })
		earth.show(true)
		for (let i = 0; i < 60; i++) earth.update(camera, 0.016)
		const near = copies.filter((c) => Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 8)
		expect(near.length).toBeGreaterThan(50)
		// beyond the patch every copy of it: the patch is 30 m behind
		expect(near.every((c) => Math.hypot(c.x, c.z) > R)).toBe(true)
		// no copy of a grass kind: those are the blades'
		const grassy = MEADOW.cover.map((c: any, i: number) => (['grass', 'tallgrass', 'drygrass'].includes(c.kind) ? c.ref : null)).filter(Boolean)
		expect(copies.some((c) => grassy.includes(c.kind))).toBe(false)
		earth.dispose()
	})
})
