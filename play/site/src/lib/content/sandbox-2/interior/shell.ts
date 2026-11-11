/*
 * A dome's shell: what a dome is (its kinds and sizes, its doors) and its geodesic shell, the glass, canvas and
 * stone panels of an icosphere above the ground with a strut on every edge (intent 92fbecea).
 */
import * as THREE from 'three'
import type { Mats } from './interior'

export type DomeKind = 'tent' | 'glamp' | 'home' | 'large' | 'grand' | 'master' | 'factory'

export type Spec = { diameter: number; detail: number; strut: number; gallery?: { height: number; depth: number; rooms: number; floors: 1 | 2 } }
export const DOMES: Record<DomeKind, Spec & { label: string; people: string }> = {
	tent: { label: 'Bell tent', people: 'two people', diameter: 4.2, detail: 0, strut: 0 },
	glamp: { label: 'Glamping dome', people: 'four people', diameter: 16, detail: 3, strut: 0.06 },
	// the ids stay as they were (Sandbox 3 and 4 build 'home' and 'large'); only the names moved up for the new large dome
	home: { label: 'Small dome', people: 'twelve people', diameter: 40, detail: 4, strut: 0.09, gallery: { height: 4.2, depth: 8, rooms: 6, floors: 1 } },
	large: { label: 'Medium dome', people: 'twenty-four people', diameter: 70, detail: 5, strut: 0.12, gallery: { height: 5, depth: 10.5, rooms: 10, floors: 2 } },
	grand: { label: 'Large dome', people: 'forty-eight people', diameter: 100, detail: 6, strut: 0.14, gallery: { height: 5.5, depth: 11.5, rooms: 12, floors: 2 } },
	master: { label: 'Master dome', people: 'the commons', diameter: 136, detail: 7, strut: 0.16, gallery: { height: 6, depth: 12.5, rooms: 16, floors: 2 } },
	factory: { label: 'Solar factory dome', people: 'the factory coop', diameter: 136, detail: 7, strut: 0.16 }
}

/** The big domes have four doors, one to each point of the compass; the glamping dome has one; the large dome
 *  none to the north, where its pond lies against a closed wall. */
export const DOORS = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
export const doorsOf = (kind: DomeKind) => (kind === 'glamp' || kind === 'tent' ? [0] : kind === 'grand' ? DOORS.slice(1) : DOORS)
/** The large dome's closed north: its shell north of this line (z, a seventh of the dome's width in from the north
 *  wall) is massive stone, over its pond. Null in every other dome. */
export const tankLine = (kind: DomeKind, R: number) => (kind === 'grand' ? R - (2 * R) / 7 : null)
/** A door's half-width, and its height at the top of the arch (the glamping door is square-headed). */
export const doorSize = (kind: DomeKind) => (kind === 'tent' ? { dw: 0.55, dh: 1.8, top: 1.8 } : kind === 'glamp' ? { dw: 0.75, dh: 2.5, top: 2.5 } : { dw: 1.3, dh: 3, top: 3 + 1.3 * 0.4 })
/** The signed difference between two angles, in -π..π. */
export const adiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export type DoorHole = { a: number; halfWidth: number; height: number; depth: number }

/**
 * The geodesic shell: triangles of an icosphere above the ground, and a strut
 * on every edge. At each of the four doors the lowest panels are left out; the
 * hole is measured and returned, so a portal wall can close it round the door.
 */
export function geodesic(spec: Spec, m: Mats, kind: DomeKind): { group: THREE.Group; holes: DoorHole[] } {
	const R = spec.diameter / 2
	const ico = new THREE.IcosahedronGeometry(R, spec.detail)
	const p = ico.attributes.position!
	const glass: number[] = []
	const clear: number[] = []
	const cloth: number[] = []
	// the large dome's north wall, behind its pond: closed, massive stone
	const wall: number[] = []
	const tankZ = tankLine(kind, R)
	const edges = new Map<string, [THREE.Vector3, THREE.Vector3]>()
	const key = (v: THREE.Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`
	const tris: { tri: THREE.Vector3[]; c: THREE.Vector3; ca: number }[] = []
	for (let i = 0; i < p.count; i += 3) {
		const tri = [0, 1, 2].map((k) => new THREE.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)))
		if ((tri[0]!.y + tri[1]!.y + tri[2]!.y) / 3 < -R * 0.02) continue
		for (const v of tri) v.y = Math.max(0, v.y)
		const c = tri.reduce((s, v) => s.clone().add(v), new THREE.Vector3()).divideScalar(3)
		tris.push({ tri, c, ca: Math.atan2(c.x, c.z) })
	}
	// the door panels: every triangle any part of which, seen head-on, falls in the doorway —
	// so no panel and no strut is left crossing it
	const { dw, top } = doorSize(kind)
	const skip = new Set<number>()
	const holes: DoorHole[] = []
	for (const d of doorsOf(kind)) {
		const tang = (v: THREE.Vector3) => v.x * Math.cos(d) - v.z * Math.sin(d)
		const inDoorway = (v: THREE.Vector3) => Math.abs(tang(v)) < dw + 0.35 && v.y < top + 0.35
		const cand = tris.map((t, i) => ({ i, t })).filter(({ t }) => Math.abs(adiff(t.ca, d)) < Math.PI / 4)
		// the glamping dome's panels are small: its door takes the lowest ones nearest the door's line
		const nearest = Math.min(...cand.filter(({ t }) => t.c.y < R * 0.3).map(({ t }) => Math.abs(tang(t.c))))
		let halfWidth = 0, height = 0, depth = Infinity
		for (const { i, t } of cand) {
			const [a, b, c] = t.tri as [THREE.Vector3, THREE.Vector3, THREE.Vector3]
			let hit = kind === 'glamp' && t.c.y < R * 0.3 && Math.abs(tang(t.c)) <= nearest + 0.6
			if (kind === 'glamp' && !hit) continue
			for (let u = 0; u <= 6 && !hit; u++)
				for (let w = 0; w <= 6 - u && !hit; w++) hit = inDoorway(a.clone().multiplyScalar(u / 6).addScaledVector(b, w / 6).addScaledVector(c, (6 - u - w) / 6))
			if (!hit) continue
			skip.add(i)
			for (const v of t.tri) {
				halfWidth = Math.max(halfWidth, Math.abs(tang(v)))
				height = Math.max(height, v.y)
				depth = Math.min(depth, v.x * Math.sin(d) + v.z * Math.cos(d))
			}
		}
		holes.push({ a: d, halfWidth, height, depth })
	}
	tris.forEach(({ tri, c, ca }, i) => {
		if (skip.has(i)) return
		// the glamping dome is canvas behind the sleeping nooks, glass toward the living spaces and the sky
		const isWindow = kind !== 'glamp' || c.y > R * 0.78 || (Math.abs(ca) < 1.8 && c.y > R * 0.08 && c.y < R * 0.62)
		// in front of the rooms the glass is clear, no cells in it: a window onto the terrace and the land
		const gal = spec.gallery
		const byRooms = gal && [gal.height, ...(gal.floors === 2 ? [gal.height + 3.6] : [])].some((f) => c.y > f - 0.4 && c.y < f + 3.4)
		;(tankZ !== null && c.z > tankZ ? wall : !isWindow ? cloth : byRooms ? clear : glass).push(...tri.flatMap((v) => [v.x, v.y, v.z]))
		for (let k = 0; k < 3; k++) {
			const a = tri[k]!, b = tri[(k + 1) % 3]!
			const id = [key(a), key(b)].sort().join('|')
			if (!edges.has(id)) edges.set(id, [a.clone(), b.clone()])
		}
	})
	const g = new THREE.Group()
	const shell = (arr: number[], mat: THREE.Material, shadow: boolean) => {
		if (!arr.length) return
		const geo = new THREE.BufferGeometry()
		geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
		// every panel a whole triangle of the solar pattern
		geo.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from({ length: arr.length / 9 }, () => [0.5, 0.9, 0.92, 0.1, 0.08, 0.1]).flat(), 2))
		geo.computeVertexNormals()
		const mesh = new THREE.Mesh(geo, mat)
		mesh.castShadow = shadow
		mesh.renderOrder = 2
		g.add(mesh)
	}
	shell(glass, m.solar, false)
	shell(clear, m.glass, false)
	shell(cloth, m.canvas, true)
	if (wall.length) {
		const stone = m.lime(1).clone()
		stone.side = THREE.DoubleSide
		stone.color.set('#cfc3ad')
		shell(wall, stone, true)
	}

	const strut = new THREE.CylinderGeometry(spec.strut, spec.strut, 1, 6)
	const inst = new THREE.InstancedMesh(strut, kind === 'glamp' ? m.timberFrame : m.steel, edges.size)
	const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
	let i = 0
	for (const [a, b] of edges.values()) {
		const d = b.clone().sub(a)
		q.setFromUnitVectors(up, d.clone().normalize())
		mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, d.length(), 1))
		inst.setMatrixAt(i++, mtx)
	}
	inst.castShadow = true
	g.add(inst)
	return { group: g, holes }
}
