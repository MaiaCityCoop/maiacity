/*
 * A DOME IN LEVELS (intent 92fbecea): each of the village's domes is drawn at the assets' levels, by its size on screen.
 * Built here without a page: its surfaces stood in for by plain materials (the shapes are what is counted).
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ballOf, DOME_LEVELS, DOMES, geodesic, levelOf, simpleDome, type Dome, type DomeKind } from './shell'
import type { Mats } from './interior'
import { HOLD, LEVELS } from '$lib/content/assets/render/lod.js'

/** the village's surfaces as plain materials, one a name: its painted ones need a page */
const CALLED = new Set(['stone', 'lime', 'oak', 'soil', 'water', 'pebble'])
const made = new Map<string, THREE.Material>()
const mat = (k: string) => made.get(k) ?? made.set(k, Object.assign(new THREE.MeshStandardMaterial(), { name: k })).get(k)!
const m = new Proxy({}, { get: (_, k: string) => (CALLED.has(k) ? () => mat(k) : mat(k)) }) as unknown as Mats

/** the village's domes as its layout places them (village.ts layout: the terraces 6 m beyond the glass) */
const KINDS: DomeKind[] = ['master', 'large', 'home']
const dome = (kind: DomeKind): Dome => ({ kind, x: 0, z: 0, R: DOMES[kind].diameter / 2, ext: DOMES[kind].diameter / 2 + 6 })

/** the triangles the picture draws: a shadow's stand-ins (../../sandbox-kit/casters.js, intent 7313fb26) are the sun's alone */
const trianglesOf = (o: THREE.Object3D) => {
	let n = 0
	o.traverse((x) => {
		const mesh = x as THREE.Mesh
		if (!mesh.isMesh || mesh.userData.standIn) return
		const g = mesh.geometry
		const t = (g.index ? g.index.count : g.attributes.position!.count) / 3
		n += t * ((mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1)
	})
	return n
}
const named = (o: THREE.Object3D, part: string) => o.children.find((c) => c.name.startsWith(part))
const levels = new Map(KINDS.map((k) => [k, Array.from({ length: DOME_LEVELS }, (_, L) => simpleDome(dome(k), m, L, { floor: null, glow: mat('glow') }))]))

describe('a dome in levels', () => {
	it('is drawn at L0 as it always was: its shell the geodesic shell at its kind\'s detail', () => {
		for (const k of KINDS) {
			const shell = named(levels.get(k)![0]!.object, 'dome shell')!
			const before = geodesic(DOMES[k], m, k).group
			const positions = (o: THREE.Object3D) => o.children.map((c) => Array.from(((c as THREE.Mesh).geometry.attributes.position!.array as Float32Array)))
			expect(positions(shell)).toEqual(positions(before))
			expect(trianglesOf(shell)).toBe(trianglesOf(before))
		}
	})

	it('is much lighter at each level further off: L1 at most 0.3, L2 0.12, L3 0.06 of L0', () => {
		for (const [k, ls] of levels) {
			const [t0, t1, t2, t3] = ls.map((l) => trianglesOf(l.object))
			expect(t1! / t0!, `${k} L1`).toBeLessThanOrEqual(0.3)
			expect(t2! / t0!, `${k} L2`).toBeLessThanOrEqual(0.12)
			expect(t3! / t0!, `${k} L3`).toBeLessThanOrEqual(0.06)
		}
	})

	it('keeps its outline at every level: the shell as high and as wide', () => {
		for (const [k, ls] of levels) {
			const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(named(o, 'dome shell')!)
			const b0 = box(ls[0]!.object)
			for (const l of ls.slice(1)) {
				const b = box(l.object)
				expect(Math.abs(b.max.y - b0.max.y) / b0.max.y, k).toBeLessThanOrEqual(0.02)
				expect(Math.abs(b.max.x - b0.max.x) / b0.max.x, k).toBeLessThanOrEqual(0.02)
			}
		}
	})

	it('leaves out beds, stairs and lamps from L2 on, and keeps its floor, rooms and crowns', () => {
		for (const [, ls] of levels)
			ls.forEach((l, L) => {
				const body = named(l.object, 'dome body')!
				const used = new Set(body.children.map((c) => ((c as THREE.Mesh).material as THREE.Material).name))
				const first = new Set((named(ls[0]!.object, 'dome body')!.children as THREE.Mesh[]).map((c) => (c.material as THREE.Material).name))
				for (const small of ['glow', 'grass']) expect(used.has(small), `${small} at L${L}`).toBe(L < 2 && first.has(small))
				expect(used.has('soil'), `floor at L${L}`).toBe(true)
				expect(used.has('oak'), `rooms at L${L}`).toBe(true)
			})
	})

	it('changes level by its size on screen, as an asset does, and holds its level at a threshold', () => {
		const d = dome('large')
		const tanHalf = Math.tan(THREE.MathUtils.degToRad(34))
		/** the distance at which the dome looks `size` of the view */
		const at = (size: number) => ({ x: 0, y: d.R * 0.4, z: d.ext / (size * tanHalf) })
		expect(levelOf(ballOf(d), at(LEVELS[0]! * 1.5), tanHalf)).toBe(0)
		expect(levelOf(ballOf(d), at((LEVELS[0]! + LEVELS[1]!) / 2), tanHalf)).toBe(1)
		expect(levelOf(ballOf(d), at((LEVELS[1]! + LEVELS[2]!) / 2), tanHalf)).toBe(2)
		expect(levelOf(ballOf(d), at(LEVELS[2]! / 2), tanHalf)).toBe(3)
		// just past a threshold, it stays where it was
		const past = at(LEVELS[1]! * (1 - HOLD / 2))
		expect(levelOf(ballOf(d), past, tanHalf, 1)).toBe(1)
		expect(levelOf(ballOf(d), past, tanHalf)).toBe(2)
	})
})
