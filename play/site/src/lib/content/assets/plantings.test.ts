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
	const { biomeCatalog, biomeOfCard } = await import('$lib/content/biomes/card.js')
	// @ts-ignore — plain JS
	const { groundOf } = await import('./ground.js')
	const meadow = BIOMES.find((b: any) => b.id === 'meadow')
	const MEADOW = { ...meadow, cover: meadow.cover.map((c: any, i: number) => ({ ...c, ref: 'a'.repeat(64) + `?kind=${i}` })) }
	const R = 6
	/** the meadow as the viewer's build lays it: a round patch, its ground and a group of copies a kind; no catalog on its root (its card has it) */
	const patchOf = () => {
		const root = new THREE.Group()
		root.name = 'meadow'
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
		// the recipe as the page reads it from the card
		p.show(root, { biome: biomeOfCard({ group: 'biomes', id: 'meadow', version: 2, label: 'Meadow', catalog: biomeCatalog(MEADOW, { ref: (_: string, i: number) => MEADOW.cover[i].ref, label: (k: string) => k }) }) })
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

	// what the eye sees of it (the bar: the meadow a closed cover near the eye, on a desktop and on a phone): the share of
	// the ground 1.5–10 m out its blades cover (grass-cover.js, e85a5860's c4 measure), by each device's field on the card
	it('the meadow closes into one cover near the eye, on a desktop and on a phone', async () => {
		// @ts-ignore — plain JS
		const { fieldMask, grassOfRecipe, perCell } = await import('$lib/content/biomes/grass.js')
		// @ts-ignore — plain JS
		const G = await import('$lib/content/biomes/grass-gpu.js')
		// @ts-ignore — plain JS
		const { coverOf, keptPerM2 } = await import('$lib/content/biomes/grass-cover.js')
		/** the meadow's grass as its newest version on play writes it (e36c9671 v2) */
		const P = { height: 0.3, tall: 0.6, heightSpread: 0.45, width: 0.006, clump: 1.4, lean: 0.55, base: '#3a5a20', tip: '#a7bf62', dry: '#c2b071', dryShare: 0.15 }
		const of = grassOfRecipe(meadow)
		for (const [d, W, H] of [['desktop', 1440, 900], ['small', 390, 844]] as const) {
			const dev = G.gpuDevice(d)
			const mask = fieldMask(dev, (x: number, z: number) => ({ ...of(x, z), y: 0 }))
			// 30 m from the patch, as above
			const eye: [number, number, number] = [30.3, 1.65, 0.2]
			mask.update(eye[0], eye[2], Infinity)
			const field = { mask, dev, n: perCell(dev.density), hmax: G.tallest(P), clump: P.clump }
			const c = coverOf({ field, params: P, eye, yaw: 0, pitch: -0.3, width: W, height: H })
			const per = keptPerM2(field, eye, 23)
			console.log(`the viewer's meadow, ${d} ${W} × ${H}: grass covers ${(c.cover * 100).toFixed(1)} % of the ground 1.5–10 m from the eye; kept a square metre: near ${per.near}, mid ${per.mid}, far ${per.far}`)
			expect(c.cover).toBeGreaterThanOrEqual(0.85)
		}
	}, 300_000)
})
