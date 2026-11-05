// The world map built up as a city (the map's City view, Samuel 2026-11-05): on every plot its village, its tower at the
// centre with the master dome beside it, larger domes round them and smaller ones further out, fruit trees between the
// domes; and between the plots, deep jungle, on all the valley floor that is no plot, no water and no hill. It is only
// a picture of what the map could hold (nothing is built in the game yet), grown from the map's own seed, so the same
// map always gets the same city. Sizes are in map units and stylised like the map's trees: a tower is 2 × 15.3 high
// (its 180 m foot and height), the master dome 12 across, the others 10, 7.5, 5.5 and 4.5 (`DOMES`). Nothing here
// touches the DOM or three.js: ./scene.ts draws it.

import { hashSeed, inside, mulberry32, terrain, type Feature, type P, type WorldMap } from './map';

export type DomeKind = 'tower' | 'master' | 'dome';
/** a dome or a tower on a plot: where its centre stands and its radius at the foot (map units) */
export interface Dome {
	kind: DomeKind;
	x: number;
	y: number;
	r: number;
	plot: number;
}

export interface City {
	domes: Dome[];
	/** the fruit trees on the plots, between the domes */
	trees: Feature[];
	/** the jungle between the plots */
	jungle: Feature[];
}

/** a tower's radius at its foot: its 180 m foot, stylised like the map's trees */
export const TOWER = 15.3;
/** the master dome's radius, and the rings of domes round the centre: [distance from it, how many, radius] */
export const MASTER = 12;
export const DOMES: [number, number, number][] = [
	[44, 7, 10],
	[64, 11, 7.5],
	[84, 15, 5.5],
	[100, 18, 4.5]
];
/** fruit trees tried per plot, and the jungle's spacing between the plots */
const TREES = 70;
const JUNGLE = 11;
/** room between two domes, and between a dome and a tree */
const GAP = 3;
const TREE_GAP = 4;

export function buildCity(map: WorldMap): City {
	const rand = mulberry32(hashSeed(`${map.seed}:city`));
	const domes: Dome[] = [], trees: Feature[] = [], jungle: Feature[] = [];

	for (const p of map.plots) {
		const [cx, cy] = p.centre, here: Dome[] = [];
		// a dome stands only where all of it is on its plot, clear of the others
		const put = (kind: DomeKind, x: number, y: number, r: number) => {
			const edge: P[] = [[x, y], [x + r, y], [x - r, y], [x, y + r * 0.8], [x, y - r * 0.8]];
			if (!edge.every(([ex, ey]) => inside(p.outline, ex, ey))) return false;
			if (here.some((d) => Math.hypot(d.x - x, d.y - y) < d.r + r + GAP)) return false;
			const d = { kind, x, y, r, plot: p.id };
			here.push(d);
			domes.push(d);
			return true;
		};
		put('tower', cx, cy, TOWER);
		// the master dome right beside the tower, on whichever side has room
		const a = rand() * Math.PI * 2, at = TOWER + MASTER + GAP + 1;
		for (let k = 0; k < 12 && !put('master', cx + at * Math.cos(a + (k * Math.PI) / 6), cy + at * Math.sin(a + (k * Math.PI) / 6), MASTER); k++);
		for (const [ring, n, r] of DOMES)
			for (let i = 0; i < n; i++) {
				const b = (i / n) * Math.PI * 2 + rand() * 0.4, d = ring + (rand() - 0.5) * 10;
				put('dome', cx + d * Math.cos(b), cy + d * Math.sin(b) * 0.8, r * (0.85 + rand() * 0.3));
			}
		// the food forest between the domes
		for (let k = 0, n = 0; k < TREES * 6 && n < TREES; k++) {
			const x = cx + (rand() - 0.5) * 170, y = cy + (rand() - 0.5) * 140;
			if (!inside(p.outline, x, y) || here.some((d) => Math.hypot(d.x - x, d.y - y) < d.r + TREE_GAP)) continue;
			const kind: Feature['kind'] = rand() < 0.78 ? 'broadleaf' : rand() < 0.5 ? 'willow' : 'cypress';
			trees.push({ kind, x, y, s: 0.45 + rand() * 0.35, turn: rand() * 6.28, plot: true });
			n++;
		}
	}

	// the jungle: every free spot of the valley floor between the plots (no plot, no water, no hill)
	const ground = terrain(map.seed, map.river, map.massif), CELL = 200, grid = new Map<string, P[][]>();
	for (const p of map.plots) {
		const xs = p.outline.map(([x]) => x), ys = p.outline.map(([, y]) => y);
		for (let gx = Math.floor(Math.min(...xs) / CELL); gx <= Math.floor(Math.max(...xs) / CELL); gx++)
			for (let gy = Math.floor(Math.min(...ys) / CELL); gy <= Math.floor(Math.max(...ys) / CELL); gy++) {
				const k = `${gx},${gy}`;
				(grid.get(k) ?? grid.set(k, []).get(k)!).push(p.outline);
			}
	}
	const onPlot = (x: number, y: number) => (grid.get(`${Math.floor(x / CELL)},${Math.floor(y / CELL)}`) ?? []).some((o) => inside(o, x, y));
	const wet = (x: number, y: number) => byRiver(map, x, y) || map.lakes.some((ring) => inside(ring, x, y));
	for (let y = 0; y < map.height; y += JUNGLE)
		for (let x = 0; x < map.width; x += JUNGLE) {
			const jx = x + (rand() - 0.5) * JUNGLE, jy = y + (rand() - 0.5) * JUNGLE;
			if (ground(jx, jy) > 6 || onPlot(jx, jy) || wet(jx, jy)) continue;
			jungle.push({ kind: rand() < 0.85 ? 'broadleaf' : 'willow', x: jx, y: jy, s: 1.1 + rand() * 0.6, turn: rand() * 6.28, plot: false });
		}

	return { domes, trees, jungle };
}

/** whether a point is in the river or on its banks */
export function byRiver(map: WorldMap, x: number, y: number): boolean {
	const r = map.river;
	for (let i = 1; i < r.length; i++) {
		const [ax, ay] = r[i - 1], [bx, by] = r[i], dx = bx - ax, dy = by - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
		if (Math.hypot(ax + t * dx - x, ay + t * dy - y) < map.bank + 4) return true;
	}
	return false;
}
