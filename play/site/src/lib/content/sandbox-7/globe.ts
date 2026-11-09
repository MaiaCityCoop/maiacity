/**
 * SANDBOX 7 · THE GLOBE — hex cards tiling a sphere.
 *
 * A sphere cannot be tiled with hexagons alone; the closest thing is a Goldberg polyhedron: the dual of a subdivided
 * icosahedron, all hexagons but for twelve pentagons at the icosahedron's corners. Each vertex of the icosphere becomes
 * one card, its corners the centroids of the triangles round it: at frequency f, 10·f² + 2 cards.
 *
 * Each card's biome is decided as the old planet decided it (the old Sandbox 2): the maps say where the land is, what
 * kind it is (the Köppen climates folded into the planet's kinds), where the mountains stand and how deep the sea is;
 * water touching land is shallow; past the polar circles the land is snow and the sea pack ice, its edge after the real
 * year-round mean; a noise on the sphere gives the land's height band and its moisture. Pure geometry and pure noise,
 * no three.js, so it can be tested.
 */
import type { LandKind, Vec3 } from './maps';

export type V3 = [number, number, number];
export type Biome = 'sea' | 'shallow' | 'ice' | 'sand' | 'earth' | 'grass' | 'forest' | 'taiga' | 'mountain' | 'snow';
export const BIOMES: readonly Biome[] = ['sea', 'shallow', 'ice', 'sand', 'earth', 'grass', 'forest', 'taiga', 'mountain', 'snow'];
export const WATER: ReadonlySet<Biome> = new Set(['sea', 'shallow', 'ice']);

export type Tile = {
	/** unit direction of the card's centre */
	centre: V3;
	/** unit directions of its corners, anticlockwise seen from outside */
	corners: V3[];
	/** the card across each edge: edges[k] shares corners k and k+1 */
	edges: number[];
	biome: Biome;
	/** 0..1: how deep a sea, how high the land within its kind */
	value: number;
	/** 0..1: how wet the land is */
	moisture: number;
	/** the cards sharing an edge with it */
	neighbours: number[];
};

/* ── vectors ───────────────────────────────────────────────────────────── */

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const normalize = (a: V3): V3 => {
	const l = Math.hypot(a[0], a[1], a[2]) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};

/* ── the icosphere ─────────────────────────────────────────────────────── */

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS: V3[] = (
	[
		[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
		[0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
		[PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
	] as V3[]
).map(normalize);
const ICO_FACES: [number, number, number][] = [
	[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
	[1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
	[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
	[4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

/** every icosahedron face cut into n² triangles, the vertices on shared edges made one */
function icosphere(n: number): { vertices: V3[]; faces: [number, number, number][] } {
	const vertices: V3[] = [];
	const index = new Map<string, number>();
	const vertex = (p: V3): number => {
		const u = normalize(p);
		const key = u.map((c) => c.toFixed(6)).join(',');
		let i = index.get(key);
		if (i === undefined) {
			i = vertices.length;
			vertices.push(u);
			index.set(key, i);
		}
		return i;
	};
	const faces: [number, number, number][] = [];
	for (const [a, b, c] of ICO_FACES) {
		const A = ICO_VERTS[a]!, B = ICO_VERTS[b]!, C = ICO_VERTS[c]!;
		// rows of points from A toward the BC edge
		const rows: number[][] = [];
		for (let i = 0; i <= n; i++) {
			const row: number[] = [];
			for (let j = 0; j <= i; j++) {
				const t = i / n;
				const s = i === 0 ? 0 : j / i;
				row.push(vertex(add(scale(A, 1 - t), add(scale(B, t * (1 - s)), scale(C, t * s)))));
			}
			rows.push(row);
		}
		for (let i = 0; i < n; i++)
			for (let j = 0; j <= i; j++) {
				faces.push([rows[i]![j]!, rows[i + 1]![j]!, rows[i + 1]![j + 1]!]);
				if (j < i) faces.push([rows[i]![j]!, rows[i + 1]![j + 1]!, rows[i]![j + 1]!]);
			}
	}
	return { vertices, faces };
}

/* ── 3D value noise: the land's height band and its moisture ───────────── */

function hash3(x: number, y: number, z: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
	return s - Math.floor(s);
}
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise3(x: number, y: number, z: number): number {
	const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
	const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0);
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
	const c = (dx: number, dy: number, dz: number) => hash3(x0 + dx, y0 + dy, z0 + dz);
	return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy), lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
}
/** four octaves on the unit sphere, offset by a seed */
export function continents(p: V3, seed: number): number {
	let v = 0, amp = 0.55, freq = 1.7, sum = 0;
	for (let o = 0; o < 4; o++) {
		v += amp * noise3(p[0] * freq + seed, p[1] * freq + seed * 1.3, p[2] * freq + seed * 0.7);
		sum += amp;
		amp *= 0.5;
		freq *= 2.1;
	}
	return v / sum;
}

/* ── the cards ─────────────────────────────────────────────────────────── */

export type GlobeMaps = {
	/** whether a point is land: it decides the coast */
	isLand: (p: Vec3) => boolean;
	/** what kind of land a point is: it decides the biome (the poles are still snow) */
	kindOf: (p: Vec3) => LandKind;
	/** whether a point lies in a mountain range: mountains stand over any inland kind but snow */
	isMountain: (p: Vec3) => boolean;
	/** how deep the sea is, its layer 0 (the shelf) to 11 */
	depthOf: (p: Vec3) => number;
};

export type GlobeOptions = {
	/** subdivisions: 10·f² + 2 cards */
	frequency: number;
	/** the share of the noise that is land, for the land's height band */
	land: number;
	/** the noise's seed (moisture's is 23 on) */
	seed: number;
	/** snow past the polar circles and pack ice on the polar sea */
	poles: boolean;
	/** the layer at which the sea's value is 1, the deepest it is painted */
	deepest: number;
	maps: GlobeMaps;
};

export function buildGlobe(o: GlobeOptions): Tile[] {
	const { vertices, faces } = icosphere(o.frequency);
	const around: number[][] = vertices.map(() => []);
	const centroids: V3[] = faces.map(([a, b, c]) => normalize(add(add(vertices[a]!, vertices[b]!), vertices[c]!)));
	faces.forEach((f, i) => {
		for (const v of f) around[v]!.push(i);
	});

	// the land's height band is the top `land` share of the noise: the threshold is its quantile
	const values = vertices.map((v) => continents(v, o.seed));
	const sorted = [...values].sort((a, b) => a - b);
	const threshold = sorted[Math.floor(sorted.length * (1 - o.land))] ?? 0.5;

	// who touches whom: every triangle's three corners are mutual neighbours
	const neighbourSets: Set<number>[] = vertices.map(() => new Set());
	for (const [a, b, c] of faces) {
		neighbourSets[a]!.add(b).add(c);
		neighbourSets[b]!.add(a).add(c);
		neighbourSets[c]!.add(a).add(b);
	}
	const isSea = vertices.map((v) => !o.maps.isLand(v));
	// the coast: water touching land is shallow; the land keeps its kind
	const coastal = vertices.map((_, i) => [...neighbourSets[i]!].some((n) => isSea[n] !== isSea[i]));
	const moistures = vertices.map((v) => continents(v, o.seed + 23));

	return vertices.map((centre, i): Tile => {
		// the faces round it, ordered by angle in the tangent plane
		const ref = normalize(cross(centre, Math.abs(centre[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
		const ref2 = cross(centre, ref);
		const ring = around[i]!.map((f) => ({ f, a: Math.atan2(dot(centroids[f]!, ref2), dot(centroids[f]!, ref)) })).sort((p, q) => p.a - q.a).map((p) => p.f);
		const corners = ring.map((f) => centroids[f]!);
		// across the edge from corner k to k+1: the other vertex the two faces share
		const edges = ring.map((f, k) => {
			const g = faces[ring[(k + 1) % ring.length]!]!;
			return faces[f]!.find((v) => v !== i && g.includes(v))!;
		});
		const v = values[i]!;
		const sea = isSea[i]!;
		// at sea the value is the depth, 0 on the shelf, 1 at the deepest painted; on land its height in its band
		const value = sea ? Math.max(0, o.maps.depthOf(centre)) / o.deepest : (v - threshold) / Math.max(sorted[sorted.length - 1]! - threshold, 1e-6);
		const moisture = moistures[i]!;
		// the poles: on land the climate map says where the ice caps are (its snow); on the sea, pack ice, its edge after
		// the real year-round mean: the Atlantic side open to about 80° N where the warm water goes, the Siberian and
		// Canadian sides frozen from about 71° N, the Southern Ocean from about 64° S, furthest north in the Weddell Sea;
		// the noise frays every line
		const lat = (Math.asin(Math.max(-1, Math.min(1, centre[1]))) * 180) / Math.PI;
		const lon = (Math.atan2(centre[0], centre[2]) * 180) / Math.PI;
		const fray = 6 * (moisture - 0.5);
		const atlantic = Math.max(0, Math.cos(((lon - 25) * Math.PI) / 110));
		const weddell = 3.5 * Math.cos(((lon + 40) * Math.PI) / 180);
		const ice = o.poles && (lat > 0 ? lat > 71 + 9 * atlantic + fray : lat < -64.5 + weddell + fray * 1.4);
		const mapped = sea ? undefined : o.maps.kindOf(centre);
		const flat: Biome = mapped && mapped !== 'water' ? mapped : moisture < 0.44 ? 'sand' : moisture < 0.56 ? 'grass' : 'forest';
		const inland: Biome = flat !== 'snow' && o.maps.isMountain(centre) ? 'mountain' : flat;
		const biome: Biome = sea ? (ice ? 'ice' : coastal[i] ? 'shallow' : 'sea') : inland;
		return { centre, corners, edges, biome, value: Math.min(1, Math.max(0, value)), moisture, neighbours: [...neighbourSets[i]!] };
	});
}

/** how many cards of each biome */
export function census(tiles: Tile[]): Record<Biome, number> {
	const out = Object.fromEntries(BIOMES.map((b) => [b, 0])) as Record<Biome, number>;
	for (const t of tiles) out[t.biome]++;
	return out;
}
