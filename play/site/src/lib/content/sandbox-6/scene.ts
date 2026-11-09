/**
 * SANDBOX 6 · THE VILLAGE IN 3D — built from the village config alone, cheap to draw: each hex's ground one mesh with
 * its land raster as its picture; the domes' glazed geodesic caps one InstancedMesh per dome size (their frames a
 * second, sharing the shape); every home block's storeys one InstancedMesh; the tower one lathe; each hex's roads one
 * ribbon mesh. Plain three.js, no DOM: it builds in Bun as in the browser (scene.test.ts counts what it draws).
 */
import * as THREE from 'three';
import { capOf, homeBlock, towerProfile, type Road, type Village } from './geometry';
import { landOf, paths, USE_IDS, USES } from './land';

/** a glazed geodesic cap: an icosahedron of the dome's frequency, cut a third as high as wide, its floor at y 0 */
export function geodesicCap(D: number, freq: number) {
	const c = capOf(D);
	const ico = new THREE.IcosahedronGeometry(c.R, Math.max(0, freq - 1));
	const p = ico.getAttribute('position');
	const keep: number[] = [];
	const cut = c.R - c.h;
	for (let i = 0; i < p.count; i += 3) {
		const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
		if (y < cut) continue;
		// the rim's panels that dip under the floor are pulled up onto it, so the cap stands on the ground
		for (let k = 0; k < 3; k++) keep.push(p.getX(i + k), Math.max(0, p.getY(i + k) - cut), p.getZ(i + k));
	}
	ico.dispose();
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
	g.computeVertexNormals();
	return g;
}

/** a hexagon's ground, pointy north and south, its picture laid on it cell for cell (u along x, v along z) */
function hexGround(w: number, land: { x0: number; z0: number; nx: number; nz: number; cell: number }) {
	const s = w / Math.sqrt(3), shape = new THREE.Shape();
	for (let k = 0; k < 6; k++) {
		const a = (k * Math.PI) / 3, x = s * Math.sin(a), y = s * Math.cos(a);
		k ? shape.lineTo(x, y) : shape.moveTo(x, y);
	}
	const g = new THREE.ShapeGeometry(shape);
	g.rotateX(-Math.PI / 2);
	const p = g.getAttribute('position'), uv = g.getAttribute('uv');
	for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - land.x0) / (land.nx * land.cell), (p.getZ(i) - land.z0) / (land.nz * land.cell));
	uv.needsUpdate = true;
	return g;
}

/** a land raster as a picture, one pixel a cell, in the land-use colours */
function landPicture(land: ReturnType<typeof landOf>) {
	const data = new Uint8Array(land.nx * land.nz * 4);
	const rgb = USE_IDS.map((u) => new THREE.Color(USES[u].map));
	for (let k = 0; k < land.cells.length; k++) {
		const c = land.cells[k], col = c === 255 ? rgb[USE_IDS.indexOf('nature')] : rgb[c];
		data.set([col.r * 255, col.g * 255, col.b * 255, 255], k * 4);
	}
	const t = new THREE.DataTexture(data, land.nx, land.nz);
	t.colorSpace = THREE.SRGBColorSpace;
	t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;
}

/** a hex's roads as flat ribbons, one geometry */
function ribbons(roads: Road[]) {
	const pos: number[] = [];
	for (const { pts, w } of roads)
		for (let k = 1; k < pts.length; k++) {
			const [ax, az] = pts[k - 1], [bx, bz] = pts[k];
			const l = Math.hypot(bx - ax, bz - az) || 1, nx = (-(bz - az) / l) * (w / 2), nz = ((bx - ax) / l) * (w / 2);
			const q = [ax + nx, az + nz, ax - nx, az - nz, bx - nx, bz - nz, bx + nx, bz + nz];
			for (const i of [0, 1, 2, 0, 2, 3]) pos.push(q[i * 2], 0.15, q[i * 2 + 1]);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.computeVertexNormals();
	return g;
}

/** a ring road as a flat ring */
const ringRoad = (r: number, w: number) => new THREE.RingGeometry(r - w / 2, r + w / 2, 96).rotateX(-Math.PI / 2).translate(0, 0.15, 0);

/** The whole village, one group: its parts named, and its ground's pictures to let go of with it. */
export function buildVillage(v: Village) {
	const root = new THREE.Group();
	root.name = 'sandbox-6';
	const lands = Object.fromEntries(Object.keys(v.plans).map((k) => [k, landOf(v, k)]));
	const grounds = Object.fromEntries(Object.entries(lands).map(([k, l]) => [k, landPicture(l)]));
	// every hex's raster has the same frame (it is laid round the hex's own middle), so one ground shape serves all
	const groundGeo = hexGround(v.hex.flats, Object.values(lands)[0]);
	const road = new THREE.MeshStandardMaterial({ color: 0x8f8678, roughness: 1 });
	const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfeee8, roughness: 0.08, metalness: 0, transmission: 0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
	const frame = new THREE.MeshBasicMaterial({ color: 0xd8d2c4, wireframe: true, transparent: true, opacity: 0.45 });
	const roadGeo = Object.fromEntries(Object.entries(v.plans).map(([k, p]) => {
		const g = ribbons([...p.roads, ...paths(v, p)]);
		const ring = ringRoad(p.ring.r, p.ring.w).translate(p.ring.x, 0, p.ring.z).toNonIndexed();
		const merged = new THREE.BufferGeometry();
		const a = g.getAttribute('position').array as Float32Array, b = ring.getAttribute('position').array as Float32Array;
		const all = new Float32Array(a.length + b.length);
		all.set(a);
		all.set(b, a.length);
		merged.setAttribute('position', new THREE.BufferAttribute(all, 3));
		merged.computeVertexNormals();
		g.dispose();
		ring.dispose();
		return [k, merged];
	}));

	// where every dome stands, by its size, across all seven hexes
	const byD = new Map<number, THREE.Matrix4[]>();
	const storeys: THREE.Matrix4[] = [];
	const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
	for (const hex of v.hexes) {
		const plan = v.plans[hex.plan];
		const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: grounds[hex.plan], roughness: 1 }));
		ground.position.set(hex.x, 0, hex.z);
		ground.name = `ground:${hex.key}`;
		ground.receiveShadow = true;
		root.add(ground);
		const roads = new THREE.Mesh(roadGeo[hex.plan], road);
		roads.position.set(hex.x, 0, hex.z);
		roads.name = `roads:${hex.key}`;
		root.add(roads);
		for (const site of plan.sites) {
			const K = v.kinds[site.kind];
			if (site.kind === 'tower180') continue;
			const list = byD.get(K.D) ?? [];
			list.push(new THREE.Matrix4().makeTranslation(hex.x + site.x, 0, hex.z + site.z));
			byD.set(K.D, list);
			if (site.use !== 'home' || !K.home) continue;
			// the block's storeys, each a box across the north of the dome
			const b = homeBlock(K.D, K.home);
			for (const l of b.levels) {
				t.set(hex.x + site.x, l.y + K.home.storey / 2, hex.z + site.z - (b.front + b.back) / 2);
				s.set(2 * l.half, K.home.storey * 0.92, K.home.depth);
				storeys.push(m.compose(t, q, s).clone());
			}
		}
	}
	// the glass and its frame: one InstancedMesh each a dome size
	for (const [D, list] of byD) {
		const kind = Object.values(v.kinds).find((k) => k.D === D && k.freq)!;
		const cap = geodesicCap(D, kind.freq!);
		for (const [mat, part] of [[glass, 'glass'], [frame, 'frame']] as const) {
			const im = new THREE.InstancedMesh(cap, mat, list.length);
			list.forEach((x, k) => im.setMatrixAt(k, x));
			im.name = `dome${D}:${part}`;
			im.frustumCulled = false;
			root.add(im);
		}
	}
	if (storeys.length) {
		const box = new THREE.BoxGeometry(1, 1, 1);
		const homes = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.8 }), storeys.length);
		storeys.forEach((x, k) => homes.setMatrixAt(k, x));
		homes.name = 'homes';
		homes.castShadow = homes.receiveShadow = true;
		homes.frustumCulled = false;
		root.add(homes);
	}
	// the tower: its glazed shell turned on a lathe, at each hex that has one
	for (const hex of v.hexes)
		for (const site of v.plans[hex.plan].sites.filter((x) => x.kind === 'tower180')) {
			const T = v.kinds.tower180;
			const lathe = new THREE.LatheGeometry(towerProfile(T, 48).map(([r, y]) => new THREE.Vector2(r, y)), 64);
			const tower = new THREE.Mesh(lathe, new THREE.MeshStandardMaterial({ color: 0xbfd2d6, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.75 }));
			tower.position.set(hex.x + site.x, 0, hex.z + site.z);
			tower.name = 'tower';
			tower.castShadow = true;
			root.add(tower);
		}
	return {
		root,
		dispose() {
			for (const t of Object.values(grounds)) t.dispose();
		}
	};
}

/** what the village draws: its meshes (each a draw call, an instanced one too) and its triangles, all instances */
export function census(root: THREE.Object3D) {
	let draws = 0, tris = 0;
	root.traverse((o) => {
		const mesh = o as THREE.Mesh;
		if (!mesh.isMesh) return;
		draws++;
		const g = mesh.geometry, n = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
		tris += n * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
	});
	return { draws, tris };
}
