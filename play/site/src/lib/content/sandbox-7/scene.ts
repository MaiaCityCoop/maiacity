/**
 * SANDBOX 7 · THE SCENE — the globe of hex cards in three.js, from its tiles (./globe.ts) and its two configs: the planet
 * (its radius, a card's depth, the sea floor) and the biomes (each kind's three shades, its lift and its trees).
 *
 * Every card stands at its biome's height above or below the sea, the sea floor lower the deeper it is. All the cards
 * are one mesh of flat colours: a card's face is n − 2 triangles, and an edge has a side only where the card stands
 * above its neighbour, down to the neighbour's top (the old planet drew a fan from the centre and both sides of every
 * edge, three triangles a corner). A dark core just under the lowest tops shows the deep through any seam. The trees
 * are three instanced meshes (trunk, canopy, fruit) placed on the cards by their biome's rate; the candidate sites one
 * instanced pin each, standing on the card they fall on.
 */
import * as THREE from 'three';
import { BIOMES, type Biome, type Tile } from './globe';
import { unitAt } from './maps';

export type BiomePaint = { shades: [string, string, string]; lift: number; trees: number };
export type TreeLook = { trunk: string; canopy: string[]; fruit: string; trunkHeight: number; canopyRadius: number; fruited: number };
export type Biomes = { kinds: Record<Biome, BiomePaint>; tree: TreeLook };
export type MapRef = { file: string; source: string; licence: string };
export type Planet = {
	frequency: number;
	radius: number;
	/** how far a card's sides drop where nothing stands beside it */
	depth: number;
	/** how far under the radius the dark core is */
	core: number;
	poles: boolean;
	land: number;
	seed: number;
	seaFloor: { drop: number; deepest: number };
	maps: { land: MapRef; biomes: MapRef; depth: MapRef; mountains: MapRef };
	view: { start: { lat: number; lon: number }; altitude: number; ceiling: number; eye: number; background: string; fill: number; marker: string };
};
/** where a pin stands: a site's centre */
export type Pin = { lat: number; lon: number };

/** a hash of two numbers to 0..1: the same card always gets the same jitter, trees and fruit */
export function hash(x: number, y: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

/** the top of a card: the radius, its biome's lift, a sea card lowered by its depth */
export const topOf = (t: Tile, planet: Planet, biomes: Biomes) => planet.radius + biomes.kinds[t.biome].lift - (t.biome === 'sea' ? t.value * planet.seaFloor.drop : 0);

/** a card's colour: the sea ramped through its three shades by depth, the land its shade by its height band; a jitter */
export function colourOf(t: Tile, i: number, biomes: Biomes, out = new THREE.Color()): THREE.Color {
	const paint = biomes.kinds[t.biome];
	if (t.biome === 'sea') {
		const d = Math.min(1, t.value) * 2;
		out.set(paint.shades[d < 1 ? 0 : 1]).lerp(new THREE.Color(paint.shades[d < 1 ? 1 : 2]), d < 1 ? d : d - 1);
	} else out.set(paint.shades[t.value < 0.3 ? 0 : t.value < 0.65 ? 1 : 2]);
	return out.offsetHSL(0, 0, (hash(i, t.corners.length) - 0.5) * 0.03);
}

/** how many trees a card grows: its biome's rate is the mean, the hash decides the rest */
export const treesOn = (i: number, rate: number) => (rate ? Math.floor(rate) + (hash(i, 3) < rate - Math.floor(rate) ? 1 : 0) : 0);

/** the card a point falls on: the one whose centre is nearest */
export function tileAt(tiles: Tile[], p: readonly number[]): number {
	let best = 0, most = -2;
	tiles.forEach((t, i) => {
		const d = t.centre[0] * p[0]! + t.centre[1] * p[1]! + t.centre[2] * p[2]!;
		if (d > most) (most = d), (best = i);
	});
	return best;
}

/** every card as one mesh of flat colours: faces of n − 2 triangles, a side only down to a lower neighbour */
export function cardsGeometry(tiles: Tile[], planet: Planet, biomes: Biomes): THREE.BufferGeometry {
	const tops = tiles.map((t) => topOf(t, planet, biomes));
	// count first, so the arrays are made once
	let verts = 0, tris = 0;
	tiles.forEach((t, i) => {
		verts += t.corners.length;
		tris += t.corners.length - 2;
		for (const j of t.edges)
			if (tops[i]! > tops[j]!) {
				verts += 4;
				tris += 2;
			}
	});
	const position = new Float32Array(verts * 3), normal = new Float32Array(verts * 3), color = new Float32Array(verts * 3);
	const index = new Uint32Array(tris * 3);
	let v = 0, x = 0;
	const c = new THREE.Color(), side = new THREE.Color();
	const put = (p: readonly number[], r: number, n: readonly number[], col: THREE.Color) => {
		position.set([p[0]! * r, p[1]! * r, p[2]! * r], v * 3);
		normal.set(n, v * 3);
		color.set([col.r, col.g, col.b], v * 3);
		return v++;
	};
	tiles.forEach((t, i) => {
		colourOf(t, i, biomes, c);
		side.copy(c).multiplyScalar(0.8);
		const top = tops[i]!, n = t.corners.length;
		// the face, a fan from its first corner (anticlockwise seen from outside, so it faces out)
		const first = v;
		for (const k of t.corners) put(k, top, t.centre, c);
		for (let k = 1; k < n - 1; k++) index.set([first, first + k, first + k + 1], (x++) * 3);
		// a side where the neighbour stands lower, from this top down to its top
		t.edges.forEach((j, k) => {
			const low = tops[j]!;
			if (top <= low) return;
			const a = t.corners[k]!, b = t.corners[(k + 1) % n]!;
			const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
			const along = mid[0]! * t.centre[0] + mid[1]! * t.centre[1] + mid[2]! * t.centre[2];
			const out = new THREE.Vector3(mid[0]! - t.centre[0] * along, mid[1]! - t.centre[1] * along, mid[2]! - t.centre[2] * along).normalize().toArray();
			const ab = put(a, low, out, side), bb = put(b, low, out, side), bt = put(b, top, out, side), at = put(a, top, out, side);
			index.set([ab, bb, bt], (x++) * 3);
			index.set([ab, bt, at], (x++) * 3);
		});
	});
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(position, 3));
	g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
	g.setAttribute('color', new THREE.BufferAttribute(color, 3));
	g.setIndex(new THREE.BufferAttribute(index, 1));
	g.computeBoundingSphere();
	return g;
}

/** the trees: one instanced trunk, one canopy, one fruit, on the land cards by their biome's rate, along the card's up */
function forests(tiles: Tile[], planet: Planet, biomes: Biomes): THREE.InstancedMesh[] {
	const T = biomes.tree;
	type Spot = { p: THREE.Vector3; up: THREE.Vector3; size: number; shade: number; fruit: boolean };
	const spots: Spot[] = [];
	tiles.forEach((t, i) => {
		const count = treesOn(i, biomes.kinds[t.biome].trees);
		if (!count) return;
		const up = new THREE.Vector3(...t.centre);
		const ref = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
		const ex = new THREE.Vector3().crossVectors(up, ref).normalize();
		const ez = new THREE.Vector3().crossVectors(up, ex).normalize();
		const top = topOf(t, planet, biomes);
		for (let k = 0; k < count; k++) {
			// inside the card: within 0.55 of a card's reach, off its edge
			const ang = hash(i, 10 + k) * Math.PI * 2, rad = Math.sqrt(hash(i, 20 + k)) * 0.55;
			const p = up.clone().multiplyScalar(top).addScaledVector(ex, Math.cos(ang) * rad).addScaledVector(ez, Math.sin(ang) * rad);
			spots.push({ p, up, size: 0.75 + hash(i, 30 + k) * 0.5, shade: Math.floor(hash(i, 40 + k) * T.canopy.length), fruit: hash(i, 50 + k) < T.fruited });
		}
	});
	const trunkGeo = new THREE.CylinderGeometry(0.07, 0.1, T.trunkHeight, 5).translate(0, T.trunkHeight / 2, 0);
	const canopyGeo = new THREE.IcosahedronGeometry(T.canopyRadius, 1).translate(0, T.trunkHeight + T.canopyRadius * 0.7, 0);
	const fruitGeo = new THREE.IcosahedronGeometry(0.09, 0).translate(T.canopyRadius * 0.6, T.trunkHeight + T.canopyRadius * 0.9, T.canopyRadius * 0.5);
	const flat = (color: string | number) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true });
	const trunks = new THREE.InstancedMesh(trunkGeo, flat(T.trunk), spots.length);
	const canopies = new THREE.InstancedMesh(canopyGeo, flat(0xffffff), spots.length);
	const fruits = new THREE.InstancedMesh(fruitGeo, flat(T.fruit), spots.filter((s) => s.fruit).length);
	trunks.name = 'trunks';
	canopies.name = 'canopies';
	fruits.name = 'fruit';
	const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), s3 = new THREE.Vector3(), col = new THREE.Color();
	let f = 0;
	spots.forEach((s, i) => {
		q.setFromUnitVectors(Y, s.up);
		m.compose(s.p, q, s3.setScalar(s.size));
		trunks.setMatrixAt(i, m);
		canopies.setMatrixAt(i, m);
		canopies.setColorAt(i, col.set(T.canopy[s.shade]!));
		if (s.fruit) fruits.setMatrixAt(f++, m);
	});
	for (const mesh of [trunks, canopies, fruits]) {
		mesh.instanceMatrix.needsUpdate = true;
		// they never move: three needn't recompute their matrices
		mesh.matrixAutoUpdate = false;
	}
	if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
	return [trunks, canopies, fruits];
}

export type PlanetScene = {
	root: THREE.Group;
	cards: THREE.Mesh;
	markers: THREE.InstancedMesh;
	/** where each pin stands (its foot on its card's top) and which way is up there */
	pins: { at: THREE.Vector3; up: THREE.Vector3 }[];
	/** size the pins for how far off the camera is: big enough to see from orbit, a tree's height on the ground */
	sizePins: (scale: number) => void;
	dispose: () => void;
};

export function buildPlanet(tiles: Tile[], planet: Planet, biomes: Biomes, pins: Pin[] = []): PlanetScene {
	const root = new THREE.Group();
	root.name = 'planet';
	const cards = new THREE.Mesh(cardsGeometry(tiles, planet, biomes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
	cards.name = 'cards';
	const core = new THREE.Mesh(new THREE.SphereGeometry(planet.radius - planet.core, 48, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color(biomes.kinds.sea.shades[2]).multiplyScalar(0.6), roughness: 1 }));
	core.name = 'core';
	root.add(cards, core, ...forests(tiles, planet, biomes));

	// the pins: a cone, its tip on the ground, standing up from the card the site falls on
	const pinGeo = new THREE.ConeGeometry(0.35, 1.6, 12).rotateX(Math.PI).translate(0, 0.8, 0);
	const markers = new THREE.InstancedMesh(pinGeo, new THREE.MeshStandardMaterial({ color: planet.view.marker, roughness: 0.6 }), Math.max(1, pins.length));
	markers.name = 'sites';
	markers.count = pins.length;
	const placed = pins.map((p) => {
		const up = new THREE.Vector3(...unitAt(p.lat, p.lon));
		const t = tiles[tileAt(tiles, up.toArray())]!;
		return { at: up.clone().multiplyScalar(topOf(t, planet, biomes)), up };
	});
	const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), s3 = new THREE.Vector3();
	const sizePins = (scale: number) => {
		placed.forEach((p, i) => markers.setMatrixAt(i, m.compose(p.at, q.setFromUnitVectors(Y, p.up), s3.setScalar(scale))));
		markers.instanceMatrix.needsUpdate = true;
		markers.computeBoundingSphere();
	};
	sizePins(1);
	root.add(markers);
	return {
		root,
		cards,
		markers,
		pins: placed,
		sizePins,
		dispose() {
			root.traverse((o) => {
				const mesh = o as THREE.Mesh;
				if (!mesh.isMesh) return;
				mesh.geometry.dispose();
				(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((x) => x.dispose());
			});
		}
	};
}

/** how many draw objects a built scene asks for, and its triangles (an instanced mesh: one draw, its count of copies) */
export function census(root: THREE.Object3D): { draws: number; tris: number; cardTris: number } {
	let draws = 0, tris = 0, cardTris = 0;
	root.traverse((o) => {
		const mesh = o as THREE.Mesh & { isInstancedMesh?: boolean; count?: number };
		if (!mesh.isMesh) return;
		const g = mesh.geometry;
		const n = (g.index ? g.index.count : g.attributes.position!.count) / 3;
		const copies = mesh.isInstancedMesh ? mesh.count! : 1;
		if (!copies) return;
		draws++;
		tris += n * copies;
		if (mesh.name === 'cards') cardTris = n;
	});
	return { draws, tris, cardTris };
}

/** the old planet's card triangles: a fan from the centre and the two of a side, three a corner */
export const oldCardTris = (tiles: Tile[]) => tiles.reduce((a, t) => a + 3 * t.corners.length, 0);

export { BIOMES };
