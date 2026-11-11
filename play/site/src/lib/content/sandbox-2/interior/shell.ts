/*
 * A dome's shell: what a dome is (its kinds and sizes, its doors) and its geodesic shell, the glass, canvas and
 * stone panels of an icosphere above the ground with a strut on every edge (intent 92fbecea).
 */
import * as THREE from 'three'
import type { Mats } from './interior'
import { bake, box, polar } from './bake'
import { seeded } from '$lib/content/assets/seeded.js'
import { choose, sizeOn, thresholdsOf } from '$lib/content/assets/render/lod.js'

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
export function geodesic(spec: Spec, m: Mats, kind: DomeKind, level = 0): { group: THREE.Group; holes: DoorHole[] } {
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
	// the far stand-in (L3) is closed: a door there is a few pixels, and it has no doors' walls to close their holes
	for (const d of level < 3 ? doorsOf(kind) : []) {
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

	// a strut a hexagonal rod at L0; at L1, where it is a few pixels wide, a three-sided one as thick to the eye; from
	// L2 under a pixel, and none: its panels' solar pattern draws their lines
	if (level >= 2) return { group: g, holes }
	const strut = level === 0 ? new THREE.CylinderGeometry(spec.strut, spec.strut, 1, 6) : new THREE.CylinderGeometry(spec.strut * 1.2, spec.strut * 1.2, 1, 3, 1, true)
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

/**
 * A portal: the wall that closes a door hole in the shell — canvas on the
 * glamping dome, limestone on the big ones — with an opening, a timber frame,
 * and the glazed door standing open.
 */
export function portal(m: Mats, hole: DoorHole, kind: DomeKind, level = 0): THREE.Group {
	const g = new THREE.Group()
	const W = hole.halfWidth + 0.15
	const Ht = Math.max(hole.height, 3.2)
	const { dw, dh } = doorSize(kind)
	const spring = dh - dw * 0.6
	const shape = new THREE.Shape()
	shape.moveTo(-W, 0)
	shape.lineTo(W, 0)
	shape.lineTo(W, Ht)
	shape.lineTo(-W, Ht)
	shape.closePath()
	const opening = new THREE.Path()
	opening.moveTo(-dw, 0)
	opening.lineTo(dw, 0)
	// a round-headed arch over the big domes' doors
	if (kind === 'glamp') opening.lineTo(dw, dh), opening.lineTo(-dw, dh)
	else opening.lineTo(dw, spring), opening.absarc(0, spring, dw, 0, Math.PI, false)
	opening.lineTo(-dw, 0)
	shape.holes.push(opening)
	// (from L1, where a door is a few pixels, its arch in fewer segments)
	const geo = new THREE.ShapeGeometry(shape, level === 0 ? 16 : 6)
	// a shape's uvs are its own metres: one course of blocks every 40 cm, as on the knee wall
	const wall = new THREE.Mesh(geo, kind === 'glamp' ? m.canvas : m.lime(1 / 3.2, 1 / 3.2))
	;(wall.material as THREE.Material).side = THREE.DoubleSide
	wall.castShadow = wall.receiveShadow = true
	g.add(wall)
	if (kind === 'glamp') {
		g.add(box(0.18, dh, 0.3, m.timberFrame, -dw - 0.05, 0, 0))
		g.add(box(0.18, dh, 0.3, m.timberFrame, dw + 0.05, 0, 0))
		g.add(box(dw * 2 + 0.3, 0.2, 0.32, m.timberFrame, 0, dh, 0))
	} else {
		// a dressed limestone surround: jambs to the spring of the arch, and a ring of voussoirs over it
		const trim = m.lime(0.5, 1)
		for (const side of [-1, 1]) g.add(box(0.4, spring, 0.5, trim, side * (dw + 0.2), 0, 0))
		const arch = new THREE.Mesh(new THREE.TorusGeometry(dw + 0.2, 0.22, level === 0 ? 8 : 3, level === 0 ? 24 : 6, Math.PI), trim)
		arch.scale.z = 1.1
		arch.position.y = spring
		arch.castShadow = true
		g.add(arch)
	}
	const leaf = new THREE.Group()
	leaf.add(box(dw, dh - 0.15, 0.05, m.glass, dw / 2, 0, 0))
	leaf.add(box(0.07, dh - 0.15, 0.07, m.timberFrame, 0, 0, 0))
	leaf.add(box(0.07, dh - 0.15, 0.07, m.timberFrame, dw, 0, 0))
	leaf.position.set(dw, 0, 0.1)
	leaf.rotation.y = -1.9
	g.add(leaf)
	const [x, z] = polar(hole.depth - 0.08, hole.a)
	g.position.set(x, 0, z)
	g.rotation.y = hole.a
	return g
}

/**
 * A DOME IN LEVELS (intent 92fbecea): what the village draws of a dome while its full inside is not shown — its shell,
 * its doors, the terraces on their arcade and the inside through the glass — built at the levels every asset is drawn
 * by (../../assets/render/lod.js): L0 as it always was, triangle for triangle; L1 with lighter struts and rounds of half
 * the segments; L2 with the inside's small parts (beds, stairs, lamps), the terraces' posts and rails and the struts gone, under
 * a pixel there (the panels' solar pattern draws the struts' lines); L3, the far stand-in, its shell closed and its
 * terraces' outline, without doors or arcade. Every level keeps the shell's outline and its panels' pattern, the floor, rooms and crowns
 * that show through the glass. The level is chosen by the dome's size on screen (`levelOf`), as an asset's is.
 */
export const DOME_LEVELS = 4
/** the thresholds a dome changes level at: the assets' own */
const THRESHOLDS = thresholdsOf(DOME_LEVELS - 1, Infinity)

/** a dome's place in the cell: its kind, its middle, its glass's radius and its terraces' */
export type Dome = { kind: DomeKind; x: number; z: number; R: number; ext: number }

/** what a level is chosen by: the ball that holds a thing (its middle and radius, m) */
export type Ball = { x: number; y: number; z: number; r: number }
/** a dome's ball: round its terraces, its middle a little above the ground */
export const ballOf = (d: Dome): Ball => ({ x: d.x, y: d.R * 0.4, z: d.z, r: d.ext })

/** the level a thing in `ball` is drawn at seen from `eye` (tanHalf: the camera's), held at a threshold where it was */
export function levelOf(ball: Ball, eye: { x: number; y: number; z: number }, tanHalf: number, was = -1): number {
	const dist = Math.hypot(eye.x - ball.x, eye.y - ball.y, eye.z - ball.z)
	return choose(sizeOn(ball.r, dist, tanHalf), THRESHOLDS, was).level
}

/** the simple trees seen through the glass (the forest's far trees are the same) */
export const TREE = {
	trunk: new THREE.CylinderGeometry(0.18, 0.28, 1, 6).translate(0, 0.5, 0),
	crown: new THREE.IcosahedronGeometry(1, 1),
	/** from L1, where a crown is a few dozen pixels behind the glass */
	crownFar: new THREE.IcosahedronGeometry(1, 0),
	trunkFar: new THREE.CylinderGeometry(0.2, 0.3, 1, 3, 1, true).translate(0, 0.5, 0),
	trunkMat: new THREE.MeshStandardMaterial({ color: '#6d5238', roughness: 0.9 }),
	crownMat: new THREE.MeshStandardMaterial({ color: '#4f8a38', roughness: 0.8, flatShading: true })
}

export type DomeParts = {
	/** what is drawn at this level, placed in the cell */
	object: THREE.Group
	/** the arcade's pillars on the ground (L0 only): what the walker walks round */
	colliders: { x: number; z: number; r: number }[]
}

/**
 * A dome's simple self at `level`. `floor`: its inside's ground (the warm garden's, or soil); `glow`: its lamps;
 * `plant`: where its trees go when the world's forest draws them (then none of its own), called at L0 only.
 */
export function simpleDome(d: Dome, m: Mats, level: number, o: { floor: THREE.Material | null; glow: THREE.Material; plant?: (x: number, z: number, rnd: () => number) => void }): DomeParts {
	const spec = DOMES[d.kind]
	/** a round's segments at this level: all of them at L0, half at L1, a quarter further off, never under `min` */
	const seg = (n: number, min = 8) => (level === 0 ? n : Math.max(min, Math.round(n / (level === 1 ? 2 : 4))))
	const small = level < 2
	const object = new THREE.Group()
	const colliders: { x: number; z: number; r: number }[] = []
	const shell = geodesic(spec, m, d.kind, level)
	shell.group.position.set(d.x, 0, d.z)
	shell.group.name = `dome shell ${d.kind}`
	object.add(shell.group)
	// its doors, all four merged into a few meshes (a door is a dozen small parts: drawn one by one, the cell's
	// thirteen domes cost hundreds of draw calls for them); the far stand-in's shell is closed, and has none
	if (shell.holes.length) {
		const doors = new THREE.Group()
		for (const hole of shell.holes) doors.add(portal(m, hole, d.kind, level))
		const pr = bake(doors)
		pr.position.set(d.x, 0, d.z)
		pr.name = `dome doors ${d.kind}`
		object.add(pr)
	}
	const g = new THREE.Group()
	const insideTrees: THREE.Matrix4[] = []
	const insideCrowns: THREE.Matrix4[] = []
	const gal = spec.gallery!
	const R = d.R, H = gal.height
	const rWall = Math.sqrt(R * R - H * H)
	const rIn = rWall - gal.depth
	const Rt = d.ext
	const H2 = H + 3.6
	const twoFloors = gal.floors === 2
	// the knee wall round the base, open at the doors
	for (const dd of DOORS) {
		const gh = 1.6 / R
		const knee = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.9, seg(32), 1, true, dd + gh, Math.PI / 2 - 2 * gh), m.lime((Math.PI * R) / 8, 0.4))
		knee.position.y = 0.45
		;(knee.material as THREE.Material).side = THREE.DoubleSide
		g.add(knee)
	}
	// the terraces on their arcade, one to each floor of rooms
	const perQuarter = Math.max(3, Math.round(((Math.PI / 2) * Rt) / 5.2))
	const step = Math.PI / 2 / perQuarter
	const archR = (step * Rt) / 2 - 0.4
	const terrace = (y: number, base: number, rInner: number) => {
		const deck = new THREE.Mesh(new THREE.RingGeometry(rInner, Rt, seg(96)), m.stone(R / 1.5))
		deck.rotation.x = -Math.PI / 2
		deck.position.y = y + 0.02
		g.add(deck)
		const under = new THREE.Mesh(new THREE.RingGeometry(rInner, Rt, seg(96)), m.lime(R / 2))
		under.rotation.x = Math.PI / 2
		under.position.y = y - 0.35
		g.add(under)
		const edge = new THREE.Mesh(new THREE.CylinderGeometry(Rt, Rt, 0.4, seg(96), 1, true), m.lime((Math.PI * Rt) / 2, 0.2))
		edge.position.y = y - 0.15
		g.add(edge)
		// the arcade's pillars and arches, under a pixel on the far stand-in
		for (let k = 0; k < (level < 3 ? perQuarter * 4 : 0); k++) {
			const [x, z] = polar(Rt - 0.45, (k + 0.5) * step)
			g.add(box(0.8, y - base - 0.3, 0.8, m.lime(0.6, (y - base) / 2), x, base, z, (k + 0.5) * step))
			if (base === 0 && level === 0) colliders.push({ x: d.x + x, z: d.z + z, r: 0.6 })
			const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.4, level === 0 ? 6 : 3, level === 0 ? 16 : level === 1 ? 6 : 3, Math.PI), m.lime(2, 0.3))
			const [ax, az] = polar(Rt - 0.45, k * step)
			arch.position.set(ax, y - 0.35 - archR, az)
			arch.rotation.y = k * step
			g.add(arch)
		}
		// its rail and posts, under a pixel from L2
		if (!small) return
		const rail = new THREE.Mesh(new THREE.TorusGeometry(Rt - 0.2, 0.07, level === 0 ? 6 : 3, seg(160)), m.timberFrame)
		rail.rotation.x = -Math.PI / 2
		rail.position.y = y + 0.98
		g.add(rail)
		const posts = level === 0 ? Math.round((Math.PI * 2 * Rt) / 2.2) : 0
		for (let k = 0; k < posts; k++) {
			const [x, z] = polar(Rt - 0.2, (k / posts) * Math.PI * 2)
			g.add(box(0.1, 0.95, 0.1, m.timberFrame, x, y, z))
		}
	}
	terrace(H, 0, rWall - 0.4)
	if (twoFloors) terrace(H2, H, Math.sqrt(R * R - H2 * H2) - 0.4)
	// through the glass: soil, the plaza (none in the master dome), the galleries and the rooms
	const soil = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, seg(48)), o.floor ?? m.soil(R / 2))
	soil.rotation.x = -Math.PI / 2
	soil.position.y = 0.02
	g.add(soil)
	const Rc = Math.max(4.5, R * 0.22)
	// the master dome's middle is forest, with no plaza
	if (d.kind !== 'master') {
		const plaza = new THREE.Mesh(new THREE.CircleGeometry(Rc, seg(32)), m.stone(Rc / 1.5))
		plaza.rotation.x = -Math.PI / 2
		plaza.position.y = 0.04
		g.add(plaza)
	}
	// the kitchen garden along the ring path, and the four stairs up to the gallery
	const Rp = (Rc + rIn) / 2
	// the beds and stairs, under a pixel from L2
	const beds = small ? Math.min(28, Math.floor((2 * Math.PI * Rp) / 4)) : 0
	for (let k = 0; k < beds; k++) {
		const a = ((k + 0.5) / beds) * Math.PI * 2
		if ([...DOORS, ...DOORS.map((dd) => dd + Math.PI / 4)].some((dd) => Math.abs(adiff(a, dd)) * Rp < 3)) continue
		const [x, z] = polar(Rp + 2.05, a)
		g.add(box(3, 0.4, 1.1, m.oak(1.5, 0.3), x, 0, z, a + Math.PI / 2))
		g.add(box(2.9, 0.12, 1, m.grass, x, 0.4, z, a + Math.PI / 2))
	}
	for (const sa of small ? DOORS.map((dd) => dd + Math.PI / 4) : []) {
		const run = H * 1.9
		const [x, z] = polar(rIn - run / 2, sa)
		const flight = box(1.8, 0.12, Math.hypot(run, H), m.oak(1, 3), x, H / 2 - 0.06, z, sa)
		flight.rotation.set(Math.atan2(H, run), sa, 0, 'YXZ')
		g.add(flight)
	}
	for (const [y, floor] of twoFloors ? [[H, 1], [H2, 2]] : [[H, 1]]) {
		const galleryFloor = new THREE.Mesh(new THREE.RingGeometry(rIn, Math.sqrt(R * R - y! * y!) - 0.2, seg(96)), m.oak(R / 2))
		galleryFloor.rotation.x = -Math.PI / 2
		galleryFloor.position.y = y!
		;(galleryFloor.material as THREE.Material).side = THREE.DoubleSide
		g.add(galleryFloor)
		const rooms = new THREE.Mesh(new THREE.CylinderGeometry(rIn + 2.4, rIn + 2.4, 3, seg(64), 1, true), m.oak((Math.PI * rIn) / 2, 1))
		rooms.position.y = y! + 1.5
		;(rooms.material as THREE.Material).side = THREE.DoubleSide
		g.add(rooms)
		void floor
		const lamps = small ? Math.round((2 * Math.PI * rIn) / 9) : 0
		for (let k = 0; k < lamps; k++) {
			const [x, z] = polar(rIn + 1.2, (k / lamps) * Math.PI * 2)
			g.add(box(0.3, 0.3, 0.3, o.glow, x, y! + 2.4, z))
		}
	}
	// the forest inside, as simple trees: enough to see through the glass. Sandbox 5 plants its warm garden's own
	// trees there in the outside forest, drawn as it is (in full near, as pictures far off) and left out of it
	// while the dome's full inside, with its own forest, is shown (see `place`)
	const r = seeded(Math.round(d.x * 7 + d.z * 3) + 11)
	const count = Math.round(R * (o.plant ? 2 : 1.3))
	for (let i = 0; i < count; i++) {
		const a = r() * Math.PI * 2
		const rr = Rc + 3 + r() * (rIn - Rc - 5)
		const [x, z] = polar(rr, a)
		if (o.plant) {
			if (level === 0) o.plant(d.x + x, d.z + z, r)
			continue
		}
		const h = 3 + r() * (d.kind === 'home' ? 3 : 6)
		insideTrees.push(new THREE.Matrix4().compose(new THREE.Vector3(d.x + x, 0, d.z + z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)))
		const c = 1.4 + r() * 1.6
		insideCrowns.push(new THREE.Matrix4().compose(new THREE.Vector3(d.x + x, h + c * 0.6, d.z + z), new THREE.Quaternion(), new THREE.Vector3(c, c * 0.8, c)))
	}
	g.position.set(d.x, 0, d.z)
	const body = bake(g)
	body.name = `dome body ${d.kind}`
	object.add(body)
	if (insideCrowns.length) {
		// the trunks while a trunk is more than a pixel, the crowns at every level (lighter from L1)
		const trees: [THREE.BufferGeometry, THREE.Material, THREE.Matrix4[]][] = [[level === 0 ? TREE.trunk : TREE.trunkFar, TREE.trunkMat, small ? insideTrees : []], [level === 0 ? TREE.crown : TREE.crownFar, TREE.crownMat, insideCrowns]]
		for (const [geo, mat, ms] of trees) {
			if (!ms.length) continue
			const mesh = new THREE.InstancedMesh(geo, mat, ms.length)
			ms.forEach((mx, i) => mesh.setMatrixAt(i, mx))
			mesh.castShadow = true
			mesh.computeBoundingSphere()
			object.add(mesh)
		}
	}
	return { object, colliders }
}
