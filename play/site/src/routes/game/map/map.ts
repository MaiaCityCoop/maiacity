// The game's world map, grown from a seed: a river, a few lakes, five biomes, and the plots (Grundstücke) people will
// build on, in a valley ringed by hills and mountains.
//
// The plots are the cells of a jittered hex grid cut by Voronoi (each one a soft, slightly irregular hexagon), inset so
// that roads run between them and with rounded corners. A cell's biome comes from two noise fields (height and
// wetness) and its distance to water; the outer ring of cells and the cells under the river and the lakes stay wild
// land, and a plot by the water ends at its shore. What stands on the land (trees, rocks, peaks) is a list of
// features. The same seed always gives the same map. Nothing here touches the DOM or three.js: ./scene.ts draws it.
//
// Units are metres: x runs east, y runs south across the map (6.7 × 4.5 km); a plot is about 1.5 ha. The map holds
// exactly PLOTS plots, all buildable (shore, forest, grassland, sand): mountains are no plots but wild land, raised
// into real hills (terrain); the water itself is no land at all.

export type P = [number, number];
export type Biome = 'grass' | 'forest' | 'sand' | 'mountain' | 'river';
/** the biomes nobody builds on: they stay wild land, never plots */
export const UNBUILDABLE: Biome[] = ['mountain'];

/** what each biome is and what it gives (the ten base resources of maia/content/aven-city/GAME-MECHANICS.md) */
export const BIOMES: Record<Biome, { label: string; gives: [string, string]; colour: string }> = {
	river: { label: 'Shore', gives: ['Water', 'Clay'], colour: '#4f8a8b' },
	forest: { label: 'Forest', gives: ['Wood', 'Herbs'], colour: '#3f5e4a' },
	grass: { label: 'Grassland', gives: ['Grain', 'Fibre'], colour: '#a8b88a' },
	sand: { label: 'Sand', gives: ['Sand', 'Sun'], colour: '#e0c27f' },
	mountain: { label: 'Mountain', gives: ['Stone', 'Ore'], colour: '#c8744f' }
};

/** a plot's ground colour */
export const FILL: Record<Biome, string> = {
	grass: '#e0e0bd',
	forest: '#d3d8b6',
	sand: '#f0dfb4',
	mountain: '#ded4c2',
	river: '#d3dfcf'
};

export interface Plot {
	id: number;
	biome: Biome;
	/** its outline, corners rounded */
	outline: P[];
	centre: P;
	/** m² */
	area: number;
}

export type FeatureKind = 'conifer' | 'broadleaf' | 'willow' | 'cypress' | 'stone' | 'spire' | 'peak';
/** something standing on the land: where its foot is, and its size (s scales its kind's standard size; h and w are metres) */
export interface Feature {
	kind: FeatureKind;
	x: number;
	y: number;
	s: number;
	h?: number;
	w?: number;
	turn: number;
	/** it stands on a plot (raised above the ground), not on wild land */
	plot: boolean;
}

export interface WorldMap {
	seed: string;
	width: number;
	height: number;
	plots: Plot[];
	/** the river's centre line, top edge to bottom */
	river: P[];
	/** half the river's width, with its banks */
	bank: number;
	/** each lake's shoreline, a closed ring */
	lakes: P[][];
	features: Feature[];
	/** where the mountains rise: the mountain cells' centres, and every other cell's (./terrain) */
	massif: Massif;
}

export interface Massif {
	peaks: P[];
	land: P[];
}

/** how many plots the map holds: 1,346,269 (the Fibonacci number F31, a coop's whole supply of minds at its thirtieth
 * milestone) divided by 1500 */
export const PLOTS = Math.round(1346269 / 1500); // 898
export const WIDTH = 6720;
export const HEIGHT = 4470;
const DX = 150; // cell spacing across
const DY = 116; // and down: the ground is seen at a slant, so cells are wider than deep
const GAP = 7; // half a road
const BANK = 42; // half the river with its banks
const SHORE = 24; // a lake's shore, beyond its water

// ── randomness ──────────────────────────────────────────────────────────────

export function hashSeed(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function mulberry32(a: number) {
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** smooth value noise in [0,1], summed over a few octaves */
export function fbmNoise(rand: () => number) {
	const perm = new Uint8Array(512);
	const vals = new Float32Array(256);
	const p = Array.from({ length: 256 }, (_, i) => i);
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[p[i], p[j]] = [p[j], p[i]];
	}
	for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
	for (let i = 0; i < 256; i++) vals[i] = rand();
	const at = (x: number, y: number) => vals[perm[perm[x & 255] + (y & 255)]];
	const smooth = (t: number) => t * t * (3 - 2 * t);
	const noise = (x: number, y: number) => {
		const xi = Math.floor(x), yi = Math.floor(y);
		const u = smooth(x - xi), v = smooth(y - yi);
		const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	};
	return (x: number, y: number) => {
		let sum = 0, amp = 1, norm = 0, f = 1;
		for (let o = 0; o < 4; o++) {
			sum += noise(x * f, y * f) * amp;
			norm += amp;
			amp *= 0.5;
			f *= 2;
		}
		return sum / norm;
	};
}

// ── geometry ────────────────────────────────────────────────────────────────

/** keep the part of a convex polygon where nx·x + ny·y ≤ c */
function clip(poly: P[], nx: number, ny: number, c: number): P[] {
	const out: P[] = [];
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length];
		const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
		if (da <= 0) out.push(a);
		if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
			const t = da / (da - db);
			out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		}
	}
	return out;
}

function area(poly: P[]): number {
	let s = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length];
		s += a[0] * b[1] - b[0] * a[1];
	}
	return Math.abs(s) / 2;
}

function centroid(poly: P[]): P {
	let x = 0, y = 0;
	for (const p of poly) {
		x += p[0];
		y += p[1];
	}
	return [x / poly.length, y / poly.length];
}

export function inside(poly: P[], x: number, y: number): boolean {
	let hit = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i], [xj, yj] = poly[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
	}
	return hit;
}

/** the closest point to p on a polyline, and how far it is */
function nearest(line: P[], p: P): { q: P; d: number } {
	let best: P = line[0], bd = Infinity;
	for (let i = 0; i < line.length - 1; i++) {
		const a = line[i], b = line[i + 1];
		const vx = b[0] - a[0], vy = b[1] - a[1];
		const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)));
		const q: P = [a[0] + vx * t, a[1] + vy * t];
		const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
		if (d < bd) {
			bd = d;
			best = q;
		}
	}
	return { q: best, d: bd };
}

/** a polygon with its corners rounded, as points (each corner a sampled quadratic curve) */
function rounded(poly: P[], r: number, steps = 4): P[] {
	const n = poly.length;
	const out: P[] = [];
	for (let i = 0; i < n; i++) {
		const prev = poly[(i - 1 + n) % n], cur = poly[i], next = poly[(i + 1) % n];
		const l1 = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]) || 1;
		const l2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1;
		const rr = Math.min(r, l1 * 0.45, l2 * 0.45);
		const a: P = [cur[0] + ((prev[0] - cur[0]) / l1) * rr, cur[1] + ((prev[1] - cur[1]) / l1) * rr];
		const b: P = [cur[0] + ((next[0] - cur[0]) / l2) * rr, cur[1] + ((next[1] - cur[1]) / l2) * rr];
		for (let k = 0; k <= steps; k++) {
			const t = k / steps, u = 1 - t;
			out.push([u * u * a[0] + 2 * u * t * cur[0] + t * t * b[0], u * u * a[1] + 2 * u * t * cur[1] + t * t * b[1]]);
		}
	}
	return out;
}
/** points scattered in a polygon, no two closer than `gap` */
function scatter(poly: P[], count: number, gap: number, rand: () => number): P[] {
	if (poly.length < 3) return [];
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const [x, y] of poly) {
		x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
	}
	const out: P[] = [];
	for (let t = 0; t < count * 12 && out.length < count; t++) {
		const x = x0 + rand() * (x1 - x0), y = y0 + rand() * (y1 - y0);
		if (!inside(poly, x, y)) continue;
		if (out.some((p) => Math.hypot(p[0] - x, (p[1] - y) * 1.4) < gap)) continue;
		out.push([x, y]);
	}
	return out;
}

// ── the map ─────────────────────────────────────────────────────────────────

interface Cell {
	c: P;
	full: P[];
	plot: P[];
	inner: P[];
	wild: boolean;
	riverbed: boolean;
	e: number;
	m: number;
	dr: number;
	biome: Biome;
}

export function randomSeed(): string {
	const words = ['alba', 'brisa', 'cedro', 'duna', 'eira', 'flor', 'gaia', 'horta', 'ilha', 'luz', 'mar', 'norte', 'oliva', 'pinho', 'rio', 'serra', 'terra', 'vale'];
	return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function generateMap(seed: string): WorldMap {
	const rand = mulberry32(hashSeed(seed));
	const height = fbmNoise(rand), wet = fbmNoise(rand), wobble = fbmNoise(rand);

	// the river: from the top edge to the bottom, meandering
	const river: P[] = [];
	{
		const x0 = WIDTH * (0.3 + rand() * 0.4), drift = (rand() - 0.5) * 0.5;
		const a1 = 110 + rand() * 90, f1 = 0.004 + rand() * 0.003, p1 = rand() * 6.3;
		const a2 = 40 + rand() * 50, f2 = 0.011 + rand() * 0.006, p2 = rand() * 6.3;
		for (let y = -RIM - 60; y <= HEIGHT + RIM + 60; y += 28) {
			let x = x0 + drift * (y - HEIGHT / 2) + a1 * Math.sin(y * f1 + p1) + a2 * Math.sin(y * f2 + p2) + (wobble(3.7, y / 260) - 0.5) * 160;
			x = Math.max(WIDTH * 0.12, Math.min(WIDTH * 0.88, x));
			river.push([x, y]);
		}
	}

	// the lakes: six to ten soft blobs, in low land and away from the river and from each other
	const lakes: { c: P; r: number; ring: P[] }[] = [];
	const lakeCount = 6 + Math.floor(rand() * 5);
	for (let n = 0; n < lakeCount; n++) {
		let best: { c: P; r: number } | null = null, low = Infinity;
		for (let t = 0; t < 40; t++) {
			const r = 80 + rand() * 90;
			const c: P = [WIDTH * (0.12 + rand() * 0.76), HEIGHT * (0.14 + rand() * 0.72)];
			if (nearest(river, c).d < r + DX * 1.6) continue;
			if (lakes.some((l) => Math.hypot(l.c[0] - c[0], l.c[1] - c[1]) < l.r + r + DX * 2.2)) continue;
			const h = height(c[0] / 700, c[1] / 700);
			if (h < low) {
				low = h;
				best = { c, r };
			}
		}
		if (!best) continue;
		const p1 = rand() * 6.3, p2 = rand() * 6.3, p3 = rand() * 6.3;
		const ring: P[] = [];
		for (let i = 0; i < 40; i++) {
			const a = (i / 40) * Math.PI * 2;
			const rr = best.r * (1 + 0.2 * Math.sin(2 * a + p1) + 0.12 * Math.sin(3 * a + p2) + 0.06 * Math.sin(5 * a + p3));
			ring.push([best.c[0] + rr * Math.cos(a), best.c[1] + rr * Math.sin(a) * 0.72]);
		}
		lakes.push({ ...best, ring });
	}

	/** every shore a cell might meet: the river's, and each lake's (inside a lake counts as on it) */
	const shores = (c: P) => [
		{ ...nearest(river, c), margin: BANK, inside: false },
		...lakes.map((l) => {
			const n = nearest([...l.ring, l.ring[0]], c);
			return { ...n, margin: SHORE, inside: inside(l.ring, c[0], c[1]) };
		})
	];

	// the cells: a jittered hex grid
	const pts: P[] = [];
	for (let r = -1; r * DY < HEIGHT + DY; r++) {
		for (let c = -1; c * DX < WIDTH + DX; c++) {
			const x = c * DX + (r & 1 ? DX / 2 : 0) + (rand() - 0.5) * DX * 0.5, y = r * DY + (rand() - 0.5) * DY * 0.5;
			// some points left out, so their neighbours grow into larger, odder plots
			const inner = x > DX && x < WIDTH - DX && y > DY && y < HEIGHT - DY;
			if (inner && rand() < 0.2) continue;
			pts.push([x, y]);
		}
	}
	const M = 60;
	const frame: P[] = [[-M, -M], [WIDTH + M, -M], [WIDTH + M, HEIGHT + M], [-M, HEIGHT + M]];
	const voronoi = (i: number, gap: number): P[] => {
		const [px, py] = pts[i];
		let poly = frame;
		for (let j = 0; j < pts.length && poly.length >= 3; j++) {
			if (j === i) continue;
			const [qx, qy] = pts[j];
			const nx = qx - px, ny = qy - py, l = Math.hypot(nx, ny);
			if (l > DX * 2.6) continue;
			poly = clip(poly, nx / l, ny / l, ((nx / l) * (px + qx)) / 2 + ((ny / l) * (py + qy)) / 2 - gap);
		}
		return poly;
	};

	const cells: Cell[] = pts.map((c, i) => {
		const near = shores(c);
		const dr = Math.min(...near.map((s) => (s.inside ? 0 : s.d)));
		const edge = c[0] < DX * 0.55 || c[0] > WIDTH - DX * 0.55 || c[1] < DY * 0.5 || c[1] > HEIGHT - DY * 0.5;
		const riverbed = near.some((s) => s.inside || s.d < s.margin + DX * 0.3);
		let plot = edge || riverbed ? [] : voronoi(i, GAP);
		let inner = edge || riverbed ? [] : voronoi(i, GAP + 12);
		// a plot by the water ends at its shore
		if (!riverbed) {
			for (const { q, d, margin } of near) {
				if (d > DX * 1.4) continue;
				const nx = (q[0] - c[0]) / d, ny = (q[1] - c[1]) / d;
				const at = nx * q[0] + ny * q[1];
				plot = plot.length ? clip(plot, nx, ny, at - margin - GAP) : plot;
				inner = inner.length ? clip(inner, nx, ny, at - margin - GAP - 12) : inner;
			}
		}
		const wild = edge || riverbed || plot.length < 3 || area(plot) < DX * DY * 0.3;
		return {
			c,
			full: voronoi(i, 0),
			plot: wild ? [] : plot,
			inner: wild ? voronoi(i, 10) : inner,
			wild,
			riverbed,
			e: height(c[0] / 700, c[1] / 700),
			m: wet(c[0] / 650 + 9, c[1] / 650) + 0.3 * Math.exp(-dr / 240),
			dr,
			biome: 'grass'
		};
	});

	// biomes: the river's neighbours, then the highest land is mountain, the driest sand, the wettest forest
	const quant = (xs: number[], q: number) => {
		const s = [...xs].sort((a, b) => a - b);
		return s[Math.min(s.length - 1, Math.floor(q * s.length))];
	};
	const dry = cells.filter((k) => !k.riverbed && k.dr >= DX * 0.8);
	const eHigh = quant(dry.map((k) => k.e), 0.85);
	const rest = dry.filter((k) => k.e < eHigh);
	// sand is the most of it: the driest half of the lowland; forest the wettest 20 %, grassland between
	const mLow = quant(rest.map((k) => k.m), 0.5), mHigh = quant(rest.map((k) => k.m), 0.8);
	for (const k of cells) {
		if (k.riverbed || k.dr < DX * 0.8) k.biome = 'river';
		else if (k.e >= eHigh) k.biome = 'mountain';
		else if (k.m <= mLow) k.biome = 'sand';
		else if (k.m >= mHigh) k.biome = 'forest';
		else k.biome = 'grass';
	}

	// mountains are no plots: nobody builds on them, they stay wild and rise as hills (./terrain)
	for (const k of cells) {
		if (!UNBUILDABLE.includes(k.biome) || k.wild) continue;
		k.wild = true;
		k.plot = [];
		k.inner = voronoi(cells.indexOf(k), 10);
	}
	const massif: Massif = { peaks: cells.filter((k) => k.biome === 'mountain').map((k) => k.c), land: cells.filter((k) => k.biome !== 'mountain').map((k) => k.c) };

	// exactly PLOTS plots: beyond that count the outermost (by their distance from the centre, as an oval) go back to
	// the wild, so the settled land ends in a soft round edge
	const settled = cells.filter((k) => !k.wild);
	const outer = (k: Cell) => Math.hypot(k.c[0] / WIDTH - 0.5, k.c[1] / HEIGHT - 0.5);
	settled.sort((a, b) => outer(b) - outer(a));
	for (const k of settled.slice(0, Math.max(0, settled.length - PLOTS))) {
		k.wild = true;
		k.plot = [];
		k.inner = voronoi(cells.indexOf(k), 10);
	}

	// ── what stands on the land, on each cell, wild or plot ──
	const features: Feature[] = [];
	let onPlot = false;
	const put = (kind: FeatureKind, x: number, y: number, s: number, extra: Partial<Feature> = {}) =>
		features.push({ kind, x, y, s, turn: rand() * Math.PI * 2, plot: onPlot, ...extra });
	const plotList: Plot[] = [];
	for (const k of cells) {
		if (k.wild) continue;
		plotList.push({ id: plotList.length + 1, biome: k.biome, outline: rounded(k.plot, 18), centre: centroid(k.plot), area: Math.round(area(k.plot)) });
	}

	for (const k of cells) {
		if (k.riverbed || k.inner.length < 3) continue;
		const a = area(k.inner);
		const poly = k.inner;
		onPlot = !k.wild;
		switch (k.biome) {
			case 'forest':
				for (const [x, y] of scatter(poly, Math.round(a / 150), 7.5, rand)) put(rand() < 0.8 ? 'conifer' : 'broadleaf', x, y, 0.8 + rand() * 0.45);
				break;
			case 'mountain':
				if (wobble(k.c[0] / 500, k.c[1] / 500) > 0.52) {
					for (const [x, y] of scatter(poly, 3 + Math.floor(rand() * 5), 13, rand)) put('spire', x, y, 1, { h: 18 + rand() * 30, w: 7 + rand() * 6 });
					for (const [x, y] of scatter(poly, 12, 6, rand)) put(rand() < 0.5 ? 'stone' : 'conifer', x, y, rand() < 0.5 ? 0.8 : 0.55);
				} else {
					// the hill itself is the peak (terrain): stones and a few pines on its slopes
					for (const [x, y] of scatter(poly, 9, 7, rand)) put('stone', x, y, 0.7 + rand() * 0.5);
					for (const [x, y] of scatter(poly, 6, 12, rand)) put('conifer', x, y, 0.6 + rand() * 0.3);
				}
				break;
			case 'sand':
				for (const [x, y] of scatter(poly, 2 + Math.floor(rand() * 4), 10, rand)) put('stone', x, y, 0.6 + rand() * 0.6);
				break;
			case 'grass': {
				const trees = rand() < 0.55 ? 1 + Math.floor(rand() * 4) : 0;
				for (const [x, y] of scatter(poly, trees, 10, rand)) put('broadleaf', x, y, 0.8 + rand() * 0.3);
				if (rand() < 0.4) for (const [x, y] of scatter(poly, 1 + Math.floor(rand() * 3), 6, rand)) put('stone', x, y, 0.8);
				break;
			}
			case 'river':
				for (const [x, y] of scatter(poly, rand() < 0.7 ? 1 + Math.floor(rand() * 4) : 0, 10, rand)) put('willow', x, y, 0.85 + rand() * 0.3);
				break;
		}
	}

	onPlot = false;

	// cypresses along the banks and shores, where no plot is and not in the water
	const plotPolys = cells.filter((k) => !k.wild).map((k) => k.plot);
	const inWater = (x: number, y: number) =>
		nearest(river, [x, y]).d < BANK || lakes.some((l) => inside(l.ring, x, y) || nearest([...l.ring, l.ring[0]], [x, y]).d < SHORE * 0.6);
	const shoreTrees = (line: P[], loop: boolean, base: number, chance: number) => {
		for (let i = 0; i < line.length; i++) {
			if (rand() > chance || (!loop && (i === 0 || i === line.length - 1))) continue;
			const [ax, ay] = line[(i - 1 + line.length) % line.length], [bx, by] = line[(i + 1) % line.length];
			const l = Math.hypot(bx - ax, by - ay);
			const side = loop ? 1 : rand() < 0.5 ? -1 : 1, off = base + 8 + rand() * 22;
			// a lake's ring runs clockwise on the map (y points south), so its outside is to the left of the way it runs
			const x = line[i][0] + ((by - ay) / l) * off * side * (loop ? 1 : -1), y = line[i][1] - ((bx - ax) / l) * off * side * (loop ? 1 : -1);
			if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT || inWater(x, y) || plotPolys.some((p) => inside(p, x, y))) continue;
			const n = 2 + Math.floor(rand() * 4);
			for (let j = 0; j < n; j++) put('cypress', x + j * 4, y + j, 0.8 + rand() * 0.4);
		}
	};
	shoreTrees(river, false, BANK, 0.5);
	for (const l of lakes) shoreTrees(l.ring, true, SHORE, 0.45);

	// forests on the hills round the valley, up to the tree line
	const ground = terrain(seed, river, massif);
	const woods = fbmNoise(rand);
	for (let t = 0; t < 22000; t++) {
		const x = -RIM + rand() * (WIDTH + 2 * RIM), y = -RIM + rand() * (HEIGHT + 2 * RIM);
		if (x > -20 && x < WIDTH + 20 && y > -20 && y < HEIGHT + 20) continue;
		const h = ground(x, y);
		if (h > 110 || woods(x / 260, y / 260) < 0.5) continue;
		put('conifer', x, y, 0.8 + rand() * 0.6);
	}

	return { seed, width: WIDTH, height: HEIGHT, plots: plotList, river, bank: BANK, lakes: lakes.map((l) => l.ring), features, massif };
}

/** how far the hills reach beyond the map */
export const RIM = 700;

/** the ground's height (m) at a point: flat in the valley, rising into hills and mountains beyond its edges */
export function terrain(seed: string, river: P[], massif: Massif): (x: number, y: number) => number {
	const rand = mulberry32(hashSeed(`${seed}/terrain`));
	const hills = fbmNoise(rand), ridges = fbmNoise(rand);
	const smooth = (a: number, b: number, v: number) => {
		const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	const peaks = buckets(massif.peaks), land = buckets(massif.land);
	return (x, y) => {
		// the valley's mountains: zero where a mountain cell meets any other cell, higher the deeper inside a range
		let inner = 0;
		const dm = peaks(x, y);
		if (dm < REACH) {
			const depth = land(x, y) - dm;
			if (depth > 0) inner = smooth(0, 380, depth) * 230 * (0.75 + 0.5 * hills(x / 250 + 7, y / 250));
		}
		// the hills and mountains round the valley
		const dx = Math.max(20 - x, 0, x - (WIDTH - 20)), dy = Math.max(20 - y, 0, y - (HEIGHT - 20));
		const d = Math.hypot(dx, dy);
		let outer = 0;
		if (d > 0) {
			const ridge = 1 - Math.abs(2 * ridges(x / 520, y / 520) - 1);
			outer = smooth(0, 420, d) * (18 + 60 * hills(x / 300, y / 300) + 190 * ridge * ridge * Math.min(1, d / 300));
		}
		const h = Math.max(inner, outer);
		// the river runs out of the valley through a cut in the hills
		return h > 0 ? h * smooth(BANK + 6, BANK + 240, nearest(river, [x, y]).d) : 0;
	};
}

const REACH = 450;
/** the distance from a point to the nearest of a set of points (up to REACH), through a grid of buckets */
function buckets(points: P[]): (x: number, y: number) => number {
	const S = 150, key = (gx: number, gy: number) => (gx + 1000) * 4096 + gy + 1000, grid = new Map<number, P[]>();
	for (const p of points) {
		const k = key(Math.floor(p[0] / S), Math.floor(p[1] / S));
		(grid.get(k) ?? grid.set(k, []).get(k)!).push(p);
	}
	const span = Math.ceil(REACH / S);
	return (x, y) => {
		const gx = Math.floor(x / S), gy = Math.floor(y / S);
		let best = REACH * REACH;
		for (let i = -span; i <= span; i++)
			for (let j = -span; j <= span; j++) {
				const list = grid.get(key(gx + i, gy + j));
				if (list) for (const p of list) best = Math.min(best, (p[0] - x) ** 2 + (p[1] - y) ** 2);
			}
		return Math.sqrt(best);
	};
}
