// Box format 5 (engine 6, intent 6fd5e63f, its check c3): a material says what it is (`look`), the page checks it
// (an unknown kind or a number out of its range refused), and every older format rebuilds exactly as before.
import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import { serialize, FORMAT } from './serialize.js'
import { FORMATS, rebuild } from './rebuild.js'
import { KINDS, lookByName, lookOf, lookOfBuilt } from '../look.js'

;(globalThis as any).self ??= globalThis

/** a little plant: a bark trunk and leaves, the leaves saying what they are */
function plant(look?: unknown) {
	const root = new THREE.Group()
	const bark = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 })
	bark.name = 'bark'
	const leaf = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, side: THREE.DoubleSide, alphaTest: 0.5 })
	leaf.name = 'leaf'
	if (look !== undefined) leaf.userData.look = look
	root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2, 6), bark))
	const crown = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leaf)
	crown.position.y = 2
	root.add(crown)
	return root
}

const materialsOf = (o: THREE.Object3D) => {
	const out: THREE.Material[] = []
	o.traverse((x) => {
		const m = (x as THREE.Mesh).material
		if (m) out.push(...(Array.isArray(m) ? m : [m]))
	})
	return out
}

describe('format 5 carries a look', () => {
	test('it writes format 5 and reads it, and every older one', () => {
		expect(FORMAT).toBe(5)
		expect(FORMATS).toEqual([0, 1, 2, 3, 4, 5])
	})

	test("a leaf's look goes out and comes back checked, its numbers the kind's where it gave none", async () => {
		const { data } = await serialize(plant({ kind: 'leaf', translucency: 0.8 }))
		const leaf = data.materials.find((m: any) => m.name === 'leaf')
		expect(leaf.look).toEqual({ kind: 'leaf', translucency: 0.8 })
		expect(data.materials.find((m: any) => m.name === 'bark').look).toBeUndefined()
		const built = rebuild(data)
		const [bark, back] = materialsOf(built)
		expect(back!.userData.look).toEqual({ kind: 'leaf', translucency: 0.8, stiffness: KINDS.leaf.stiffness, flutter: KINDS.leaf.flutter })
		expect(bark!.userData.look).toBeUndefined()
	})

	test('only plain fields go out: no function, no object of its own', async () => {
		const { data } = await serialize(plant({ kind: 'grass', stiffness: 0.5, shader: () => 1, extra: { a: 1 } }))
		expect(data.materials.find((m: any) => m.name === 'leaf').look).toEqual({ kind: 'grass', stiffness: 0.5 })
	})

	test('an unknown kind is refused', async () => {
		const { data } = await serialize(plant({ kind: 'glass' }))
		expect(() => rebuild(data)).toThrow(/no look glass/)
	})

	test.each([
		['translucency', 1.5],
		['translucency', -0.1],
		['stiffness', 0.01],
		['stiffness', 11],
		['flutter', 2]
	])('%s %d is out of its range and refused', async (k, v) => {
		const { data } = await serialize(plant({ kind: 'leaf', [k]: v }))
		expect(() => rebuild(data)).toThrow(/is not within/)
	})

	test('a number that is not one is refused', () => {
		expect(() => lookOf({ kind: 'leaf', flutter: '0.5' })).toThrow(/is not within/)
		expect(() => lookOf({ kind: 'leaf', flutter: Number.NaN })).toThrow(/is not within/)
		expect(() => lookOf('leaf')).toThrow(/not a look/)
		expect(lookOf(null)).toBeNull()
	})
})

describe('older formats rebuild exactly as before', () => {
	test.each([0, 1, 2, 3, 4])('format %d: the same tree, materials and settings, and no look even if one is there', async (format) => {
		const { data } = await serialize(plant({ kind: 'leaf' }))
		const old = { ...data, format, materials: data.materials.map((m: any) => ({ ...m })) }
		if (format === 0) old.textures = []
		const built = rebuild(old)
		const now = rebuild({ ...data, materials: data.materials.map(({ look, ...m }: any) => m) })
		const a = materialsOf(built), b = materialsOf(now)
		const plain = (m: THREE.Material) => ({ ...m.toJSON(), uuid: 0 })
		expect(a.map(plain)).toEqual(b.map(plain))
		for (const m of a) expect(m.userData.look).toBeUndefined()
		let n = 0
		built.traverse(() => n++)
		let k = 0
		now.traverse(() => k++)
		expect(n).toBe(k)
	})
})

describe("looks from plant-skill's names, for builds that carry none", () => {
	test.each([
		['leaf', 'leaf'],
		['leafBack', 'leaf'],
		['bark', 'bark'],
		['twig', 'stem'],
		['pod', 'fruit'],
		['petal', 'petal'],
		['grassBlade', 'grass'],
		['stone', 'stone']
	])('%s reads as %s', (name, kind) => {
		expect(lookByName(name)?.kind).toBe(kind)
	})

	test('a name that says nothing has no look', () => {
		expect(lookByName('steel')).toBeNull()
		expect(lookByName('')).toBeNull()
		expect(lookByName(undefined)).toBeNull()
	})
})

describe('the look an accepted build is drawn with, where it carries none', () => {
	const plant = { group: 'plants', label: 'Plum' }
	test("a material's name first", () => {
		expect(lookOfBuilt({ name: 'papaya bark', side: 2 }, plant)?.kind).toBe('bark')
	})
	test("an unnamed plant's two-sided material is a leaf, a one-sided one bark", () => {
		expect(lookOfBuilt({ name: '', side: THREE.DoubleSide }, plant)?.kind).toBe('leaf')
		expect(lookOfBuilt({ name: '', side: THREE.FrontSide, alphaTest: 0.5 }, plant)?.kind).toBe('leaf')
		expect(lookOfBuilt({ name: '', side: THREE.FrontSide }, plant)?.kind).toBe('bark')
	})
	test("a grass of the biomes' cover is grass; the cover that lies still has none", () => {
		expect(lookOfBuilt({ name: '', side: THREE.DoubleSide }, { group: 'biomes', label: 'Biome cover: Tall grass' })?.kind).toBe('grass')
		expect(lookOfBuilt({ name: '', side: THREE.DoubleSide }, { group: 'biomes', label: 'Biome cover: Buttercup' })?.kind).toBe('leaf')
		for (const label of ['Biome cover: Deadwood', 'Biome cover: Stones', 'Biome cover: Moss cushions', 'Biome cover: Leaves and twigs', 'Biome cover: Mushrooms'])
			expect(lookOfBuilt({ name: '', side: THREE.DoubleSide }, { group: 'biomes', label })).toBeNull()
	})
	test("a thing's material has none", () => {
		expect(lookOfBuilt({ name: '', side: THREE.DoubleSide }, { group: 'things', label: 'Chicken coop' })).toBeNull()
	})
})
