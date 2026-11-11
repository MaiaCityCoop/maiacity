/*
 * Meshes placed and baked: a box where it stands, a place round a middle, and a group of meshes merged per material
 * into a few (the village's domes, squares and banks; a dome's inside). Moved out of interior.ts (intent 92fbecea).
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { standIns } from '$lib/content/sandbox-kit/casters.js'

/** Polar placement: angle 0 faces +z, clockwise to +x — the same sense as three's cylinders. */
export const polar = (r: number, a: number): [number, number] => [r * Math.sin(a), r * Math.cos(a)]

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, rotY = 0): THREE.Mesh {
	const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
	m.position.set(x, y + h / 2, z)
	m.rotation.y = rotY
	m.castShadow = m.receiveShadow = true
	return m
}

/** what of a mesh's geometry a bake keeps, and each one's size */
const KEPT = { position: 3, normal: 3, uv: 2 } as const
type Kept = keyof typeof KEPT
const _v = new THREE.Vector3(), _nm = new THREE.Matrix3()

/**
 * A run of meshes of one material merged into one geometry, each where it stands: unindexed, its position, normal and uv
 * only, as `mergeGeometries` made it of their clones — but written straight into one array per attribute, with no clone
 * of each (a dome's garden is hundreds of thousands of leaves, and their clones held more than a gigabyte until the
 * whole garden was merged). `add` writes the next mesh; null where they do not all carry the same of those three (as
 * `mergeGeometries` answered), or one has morphs (made the old way).
 */
function merging(list: THREE.Mesh[]): { add: (o: THREE.Mesh) => void; done: () => THREE.BufferGeometry | null } {
	const names = (g: THREE.BufferGeometry) => (Object.keys(KEPT) as Kept[]).filter((k) => g.attributes[k])
	const first = names(list[0]!.geometry), same = first.join()
	if (list.some((o) => names(o.geometry).join() !== same || Object.keys(o.geometry.morphAttributes).length)) {
		const geos: THREE.BufferGeometry[] = []
		return { add: (o) => void geos.push(cloned(o)), done: () => mergeGeometries(geos) }
	}
	let n = 0
	for (const o of list) n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position!.count
	const out = Object.fromEntries(first.map((k) => [k, new Float32Array(n * KEPT[k])])) as Partial<Record<Kept, Float32Array>>
	let at = 0
	return {
		add: (o) => {
			const g = o.geometry, index = g.index, count = index ? index.count : g.attributes.position!.count
			const p = g.attributes.position!, nrm = g.attributes.normal, uv = g.attributes.uv
			const P = out.position!, N = out.normal, U = out.uv
			_nm.getNormalMatrix(o.matrixWorld)
			for (let j = 0; j < count; j++, at++) {
				const a = index ? index.getX(j) : j
				_v.fromBufferAttribute(p, a).applyMatrix4(o.matrixWorld)
				P[at * 3] = _v.x
				P[at * 3 + 1] = _v.y
				P[at * 3 + 2] = _v.z
				if (nrm && N) {
					_v.fromBufferAttribute(nrm, a).applyNormalMatrix(_nm)
					N[at * 3] = _v.x
					N[at * 3 + 1] = _v.y
					N[at * 3 + 2] = _v.z
				}
				if (uv && U) {
					U[at * 2] = uv.getX(a)
					U[at * 2 + 1] = uv.getY(a)
				}
			}
		},
		done: () => {
			const merged = new THREE.BufferGeometry()
			for (const k of first) merged.setAttribute(k, new THREE.BufferAttribute(out[k]!, KEPT[k]))
			return merged
		}
	}
}
/** a mesh's geometry where it stands, as a bake keeps it: a clone, unindexed, its position, normal and uv only */
function cloned(o: THREE.Mesh): THREE.BufferGeometry {
	const g = o.geometry.clone().applyMatrix4(o.matrixWorld)
	for (const k of Object.keys(g.attributes)) if (!(k in KEPT)) g.deleteAttribute(k)
	return g.index ? g.toNonIndexed() : g
}
/** a group's meshes by their material, in the order they come */
function byMaterial(group: THREE.Group): Map<THREE.Material, THREE.Mesh[]> {
	group.updateMatrixWorld(true)
	const byMat = new Map<THREE.Material, THREE.Mesh[]>()
	group.traverse((o) => {
		if (!(o instanceof THREE.Mesh)) return
		const list = byMat.get(o.material as THREE.Material) ?? []
		list.push(o)
		byMat.set(o.material as THREE.Material, list)
	})
	return byMat
}
/**
 * What a bake was made of, let go: the group emptied. A build's closures outlive it (its floors' and lamps' checks, its
 * animations) and hold every group it made in the same block, so a baked group kept its meshes as long as the dome stood:
 * a dome's garden is hundreds of thousands of them (half a million kept after a village's domes were built).
 */
function letGo(group: THREE.Group) {
	for (const o of group.children) o.parent = null
	group.children.length = 0
}
/** a merged geometry as a baked mesh */
function bakedMesh(merged: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
	merged.userData.baked = true
	const m = new THREE.Mesh(merged, mat)
	m.receiveShadow = true
	return m
}

/**
 * bake(), a slice at a time: the same meshes, but the page gets a frame back every few
 * milliseconds while it works, and big materials are merged in chunks rather than all at once.
 */
export async function bakeSliced(group: THREE.Group, shadows: boolean, slice: () => Promise<void>): Promise<THREE.Group> {
	const out = new THREE.Group(), meshes: THREE.Mesh[] = []
	for (const [mat, list] of byMaterial(group))
		for (let i = 0; i < list.length; i += 400) {
			if (i === 0) meshes.push(...list)
			const chunk = list.slice(i, i + 400), m = merging(chunk)
			for (let j = 0; j < chunk.length; j++) {
				m.add(chunk[j]!)
				if (j % 32 === 31) await slice()
			}
			const merged = m.done()
			await slice()
			if (merged) out.add(bakedMesh(merged, mat))
		}
	await slice()
	// what it casts: its pieces' stand-ins (../../sandbox-kit/casters.js), its own meshes casting nothing
	if (shadows) for (const s of standIns(meshes)) out.add(s)
	letGo(group)
	return out
}

/** a baked mesh small enough to be joined with the others of its material (`joinBaked`), and how large they may get together */
const JOIN = { each: 20_000, together: 120_000 }
/**
 * The small baked meshes of a scene joined, one mesh a material (intent 0356b0ea): each `bake` makes a mesh a material,
 * and a dome is baked in a few dozen goes, so one material is drawn many times (the big dome: 188 baked meshes of 110
 * materials). Only what a bake made and put straight into the scene, where it stands (a baked group that was moved or
 * is held elsewhere keeps its meshes); only meshes of the very same material, casting alike, carrying the same
 * attributes; the large ones stay as they are (joining them would hold the page and copy megabytes).
 * Each run joined is a step of its own (`slice` between them): a dome's runs together copy megabytes.
 * @returns how many meshes fewer the scene has
 */
export async function joinBaked(scene: THREE.Object3D, slice: () => Promise<void> = async () => {}): Promise<number> {
	const still = (o: THREE.Object3D) => o.position.lengthSq() === 0 && o.quaternion.x === 0 && o.quaternion.y === 0 && o.quaternion.z === 0 && o.scale.x === 1 && o.scale.y === 1 && o.scale.z === 1
	const runs = new Map<string, THREE.Mesh[]>()
	for (const group of scene.children) {
		if (group.type !== 'Group' || !still(group) || !group.visible || !group.children.length) continue
		for (const o of group.children) {
			const mesh = o as THREE.Mesh, g = mesh.geometry
			if (!mesh.isMesh || mesh.type !== 'Mesh' || !g?.userData.baked || g.index || Array.isArray(mesh.material) || mesh.children.length || !still(mesh) || !mesh.visible || mesh.renderOrder !== 0) continue
			if (g.attributes.position!.count > JOIN.each || Object.keys(g.morphAttributes).length) continue
			const key = `${mesh.material.uuid} ${mesh.castShadow} ${mesh.receiveShadow} ${Object.keys(g.attributes).sort().join()}`
			runs.set(key, [...(runs.get(key) ?? []), mesh])
		}
	}
	let fewer = 0
	for (const list of runs.values()) {
		// in runs of at most `together` vertices
		for (let from = 0; from < list.length; ) {
			let to = from, n = 0
			while (to < list.length && (to === from || n + list[to]!.geometry.attributes.position!.count <= JOIN.together)) n += list[to++]!.geometry.attributes.position!.count
			const run = list.slice(from, to)
			from = to
			if (run.length < 2) continue
			await slice()
			const first = run[0]!, joined = new THREE.BufferGeometry()
			for (const [name, a] of Object.entries(first.geometry.attributes)) {
				const size = (a as THREE.BufferAttribute).itemSize, out = new Float32Array(n * size)
				let at = 0
				for (const m of run) {
					const src = (m.geometry.attributes[name] as THREE.BufferAttribute).array
					out.set(src, at)
					at += src.length
				}
				joined.setAttribute(name, new THREE.BufferAttribute(out, size))
			}
			joined.userData.baked = true
			for (const m of run.slice(1)) {
				m.geometry.dispose()
				m.removeFromParent()
				fewer++
			}
			first.geometry.dispose()
			first.geometry = joined
		}
	}
	return fewer
}

/** Bakes a group into one mesh per material, so a forest costs a handful of draw calls; the group is left empty. */
export function bake(group: THREE.Group, shadows = true): THREE.Group {
	const out = new THREE.Group(), meshes: THREE.Mesh[] = []
	for (const [mat, list] of byMaterial(group)) {
		const m = merging(list)
		for (const o of list) m.add(o)
		const merged = m.done()
		if (merged) out.add(bakedMesh(merged, mat))
		meshes.push(...list)
	}
	if (shadows) for (const s of standIns(meshes)) out.add(s)
	letGo(group)
	return out
}

/**
 * A group's meshes sorted into square cells of `size` m by where they stand (each mesh's middle), each cell with all of
 * them and with those not marked `userData.fine` (`light`), and the ball that holds the cell. The meshes are moved
 * into `all`; `light` holds copies.
 */
export function cellsOf(group: THREE.Object3D, size: number): { all: THREE.Group; light: THREE.Group; ball: { x: number; y: number; z: number; r: number } }[] {
	group.updateMatrixWorld(true)
	const meshes: THREE.Mesh[] = []
	group.traverse((o) => void ((o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh)))
	const cells = new Map<string, { all: THREE.Group; light: THREE.Group; box: THREE.Box3 }>()
	const at = new THREE.Vector3()
	for (const mesh of meshes) {
		at.setFromMatrixPosition(mesh.matrixWorld)
		const key = `${Math.floor(at.x / size)},${Math.floor(at.z / size)}`
		let cell = cells.get(key)
		if (!cell) cells.set(key, (cell = { all: new THREE.Group(), light: new THREE.Group(), box: new THREE.Box3() }))
		const world = mesh.matrixWorld.clone()
		if (!mesh.userData.fine) {
			const copy = mesh.clone()
			world.decompose(copy.position, copy.quaternion, copy.scale)
			cell.light.add(copy)
		}
		world.decompose(mesh.position, mesh.quaternion, mesh.scale)
		cell.all.add(mesh)
		cell.box.expandByObject(mesh)
	}
	return [...cells.values()].map(({ all, light, box }) => {
		const ball = box.getBoundingSphere(new THREE.Sphere())
		return { all, light, ball: { x: ball.center.x, y: ball.center.y, z: ball.center.z, r: ball.radius } }
	})
}
