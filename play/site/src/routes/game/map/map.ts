// The game's world map, grown from a seed: a river, a few lakes, five biomes, and the plots (Grundstücke) people will
// build on.
//
// The plots are the cells of a jittered hex grid cut by Voronoi (each one a soft, slightly irregular hexagon), drawn
// inset so that pale roads run between them and with rounded corners. A cell's biome comes from two noise fields
// (height and wetness) and its distance to water; the outer ring of cells and the cells under the river and the lakes
// stay wild land, and a plot by the water ends at its shore. The same seed always gives the same map. Nothing here touches the DOM: the map is data plus one SVG string,
// so the page draws it and a script can render it too.
//
// Scale: 1 unit = 1 m, so a plot is about 1.5 ha.

export type P = [number, number];
export type Biome = 'grass' | 'forest' | 'sand' | 'mountain' | 'river';

/** what each biome is and what it gives (the ten base resources of maia/content/aven-city/GAME-MECHANICS.md) */
export const BIOMES: Record<Biome, { label: string; gives: [string, string]; colour: string }> = {
	river: { label: 'Water', gives: ['Water', 'Clay'], colour: '#4f8a8b' },
	forest: { label: 'Forest', gives: ['Wood', 'Herbs'], colour: '#3f5e4a' },
	grass: { label: 'Grassland', gives: ['Grain', 'Fibre'], colour: '#a8b88a' },
	sand: { label: 'Sand', gives: ['Sand', 'Sun'], colour: '#e0c27f' },
	mountain: { label: 'Mountain', gives: ['Stone', 'Ore'], colour: '#c8744f' }
};

export interface Plot {
	id: number;
	biome: Biome;
	/** its outline, a rounded SVG path */
	d: string;
	centre: P;
	/** m² */
	area: number;
}

export interface WorldMap {
	seed: string;
	width: number;
	height: number;
	plots: Plot[];
	/** the whole map's drawing, the inside of an <svg viewBox="0 0 width height"> */
	svg: string;
}

export const WIDTH = 2400;
export const HEIGHT = 1600;
const DX = 150; // cell spacing across
const DY = 116; // and down: the ground is seen at a slant, so cells are wider than deep
const GAP = 7; // half a road
const BANK = 42; // half the river with its banks
const SHORE = 24; // a lake's shore, beyond its water
const LAND = '#f5eedf';

const FILL: Record<Biome, string> = {
	grass: '#e8e4c4',
	forest: '#dfdfc0',
	sand: '#f5e3b9',
	mountain: '#ebdfc9',
	river: '#dde6d5'
};

// ── randomness ──────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function mulberry32(a: number) {
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** smooth value noise in [0,1], summed over a few octaves */
function fbmNoise(rand: () => number) {
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

function inside(poly: P[], x: number, y: number): boolean {
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

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** a polygon as a path with its corners rounded */
function rounded(poly: P[], r: number): string {
	const n = poly.length;
	let d = '';
	for (let i = 0; i < n; i++) {
		const prev = poly[(i - 1 + n) % n], cur = poly[i], next = poly[(i + 1) % n];
		const l1 = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]) || 1;
		const l2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1;
		const rr = Math.min(r, l1 * 0.45, l2 * 0.45);
		const a: P = [cur[0] + ((prev[0] - cur[0]) / l1) * rr, cur[1] + ((prev[1] - cur[1]) / l1) * rr];
		const b: P = [cur[0] + ((next[0] - cur[0]) / l2) * rr, cur[1] + ((next[1] - cur[1]) / l2) * rr];
		d += `${i ? 'L' : 'M'}${f(a[0])} ${f(a[1])}Q${f(cur[0])} ${f(cur[1])} ${f(b[0])} ${f(b[1])}`;
	}
	return d + 'Z';
}

/** a smooth path through points (Catmull-Rom as cubic Béziers) */
function smoothPath(pts: P[]): string {
	let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
		d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
	}
	return d;
}

/** a smooth closed path through points */
function smoothLoop(pts: P[]): string {
	const n = pts.length, at = (i: number) => pts[(i + n) % n];
	let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
	for (let i = 0; i < n; i++) {
		const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
		d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
	}
	return d + 'Z';
}

function mix(a: string, b: string, t: number): string {
	const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
	const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
	return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
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

// ── what stands on the land (each drawn from the point where it meets the ground) ──

type Sprite = { y: number; svg: string };

/** how big what stands on the land is drawn against the land: small, so the plots read large */
const K = 0.5;

const shadow = (x: number, y: number, rx: number) =>
	`<ellipse cx="${f(x + rx * 0.45)}" cy="${f(y + 0.5)}" rx="${f(rx)}" ry="${f(rx * 0.36)}" fill="#6b5530" opacity=".16"/>`;

function conifer(x: number, y: number, s: number): Sprite {
	s *= K;
	const h = 34 * s, w = 11 * s, b = 4 * s;
	return {
		y,
		svg:
			shadow(x, y, 7 * s) +
			`<path d="M${f(x)} ${f(y)}v${f(-b)}" stroke="#5b4632" stroke-width="${f(1.6 * s)}"/>` +
			`<path d="M${f(x)} ${f(y - h)}L${f(x - w / 2)} ${f(y - b)}Q${f(x)} ${f(y - b + 1.5 * s)} ${f(x)} ${f(y - b + 1.2 * s)}Z" fill="#45654f"/>` +
			`<path d="M${f(x)} ${f(y - h)}L${f(x + w / 2)} ${f(y - b)}Q${f(x)} ${f(y - b + 1.5 * s)} ${f(x)} ${f(y - b + 1.2 * s)}Z" fill="#2c4638"/>`
	};
}

function broadleaf(x: number, y: number, s: number, green = '#6f8b5c'): Sprite {
	s *= K;
	const r = 9 * s, cy = y - 11 * s;
	return {
		y,
		svg:
			shadow(x, y, 8 * s) +
			`<path d="M${f(x)} ${f(y)}V${f(cy)}" stroke="#5b4632" stroke-width="${f(1.8 * s)}"/>` +
			`<circle cx="${f(x)}" cy="${f(cy)}" r="${f(r)}" fill="${green}" stroke="#4a6142" stroke-width=".8"/>` +
			`<circle cx="${f(x - r * 0.3)}" cy="${f(cy - r * 0.3)}" r="${f(r * 0.55)}" fill="#fff" opacity=".14"/>`
	};
}

function cypress(x: number, y: number, s: number): Sprite {
	s *= K;
	return {
		y,
		svg:
			shadow(x, y, 4 * s) +
			`<path d="M${f(x)} ${f(y - 30 * s)}Q${f(x - 5 * s)} ${f(y - 14 * s)} ${f(x - 3 * s)} ${f(y - 2 * s)}H${f(x)}Z" fill="#33473d"/>` +
			`<path d="M${f(x)} ${f(y - 30 * s)}Q${f(x + 5 * s)} ${f(y - 14 * s)} ${f(x + 3 * s)} ${f(y - 2 * s)}H${f(x)}Z" fill="#1f3029"/>`
	};
}

function tuft(x: number, y: number, colour = '#6e6a4c'): Sprite {
	return {
		y,
		svg: `<path d="M${f(x - 1.6)} ${f(y)}l-.8 -2.6M${f(x)} ${f(y)}v-3.4M${f(x + 1.6)} ${f(y)}l.8 -2.6" stroke="${colour}" stroke-width=".7" stroke-linecap="round" fill="none"/>`
	};
}

function stone(x: number, y: number, s: number): Sprite {
	s *= K;
	return {
		y,
		svg:
			shadow(x, y, 5 * s) +
			`<path d="M${f(x - 5 * s)} ${f(y)}L${f(x - 3 * s)} ${f(y - 4 * s)}L${f(x + 2 * s)} ${f(y - 5 * s)}L${f(x + 5 * s)} ${f(y)}Z" fill="#c9c1b2" stroke="#9a9184" stroke-width=".7"/>`
	};
}

/** a red rock spire, lit from the upper left */
function spire(x: number, y: number, s: number, rand: () => number): Sprite {
	s *= K;
	const h = (38 + rand() * 46) * s, w = (18 + rand() * 14) * s;
	const tl = x - w / 2 + rand() * 4 * s, tr = x + w / 2 - rand() * 5 * s, top = y - h, peak = x + (rand() - 0.3) * w * 0.4;
	return {
		y,
		svg:
			shadow(x, y, w * 0.8) +
			`<path d="M${f(x - w / 2)} ${f(y)}L${f(tl)} ${f(top + 6 * s)}L${f(peak)} ${f(top)}L${f(peak + 1)} ${f(y + 1)}Z" fill="#d38459"/>` +
			`<path d="M${f(peak)} ${f(top)}L${f(tr)} ${f(top + 9 * s)}L${f(x + w / 2)} ${f(y)}L${f(peak + 1)} ${f(y + 1)}Z" fill="#a95b3c"/>` +
			`<path d="M${f(x - w / 2)} ${f(y)}L${f(tl)} ${f(top + 6 * s)}L${f(peak)} ${f(top)}L${f(tr)} ${f(top + 9 * s)}L${f(x + w / 2)} ${f(y)}" fill="none" stroke="#7a3f2b" stroke-width=".8" stroke-linejoin="round"/>`
	};
}

/** a grey low-poly peak */
function peak(x: number, y: number, s: number, rand: () => number): Sprite {
	s *= K;
	const w = (60 + rand() * 50) * s, h = (40 + rand() * 40) * s, px = x + (rand() - 0.5) * w * 0.3;
	const mid: P = [x + w * 0.1, y - h * 0.35];
	return {
		y,
		svg:
			`<ellipse cx="${f(x + w * 0.2)}" cy="${f(y)}" rx="${f(w * 0.55)}" ry="${f(w * 0.12)}" fill="#6b5530" opacity=".12"/>` +
			`<path d="M${f(x - w / 2)} ${f(y)}L${f(px)} ${f(y - h)}L${f(mid[0])} ${f(mid[1])}L${f(x)} ${f(y)}Z" fill="#ded7ca"/>` +
			`<path d="M${f(px)} ${f(y - h)}L${f(x + w / 2)} ${f(y)}L${f(x)} ${f(y)}L${f(mid[0])} ${f(mid[1])}Z" fill="#b5ac9d"/>` +
			`<path d="M${f(x - w / 2)} ${f(y)}L${f(px)} ${f(y - h)}L${f(x + w / 2)} ${f(y)}" fill="none" stroke="#8d8476" stroke-width=".8" stroke-linejoin="round"/>`
	};
}

/** low-poly facets: a fan from a peak in the cell, each face shaded by where it looks (the light from the upper left) */
function facets(poly: P[], dark: string, light: string): string {
	const c = centroid(poly);
	const top: P = [c[0] - 8, c[1] - 14];
	let s = '';
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length];
		const mx = (a[0] + b[0]) / 2 - top[0], my = (a[1] + b[1]) / 2 - top[1];
		const l = Math.hypot(mx, my) || 1;
		const lit = ((-0.6 * mx - 0.8 * my) / l + 1) / 2;
		const col = mix(dark, light, lit);
		s += `<path d="M${f(top[0])} ${f(top[1])}L${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}Z" fill="${col}" stroke="${col}" stroke-width=".6"/>`;
	}
	return s;
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
		for (let y = -80; y <= HEIGHT + 80; y += 28) {
			let x = x0 + drift * (y - HEIGHT / 2) + a1 * Math.sin(y * f1 + p1) + a2 * Math.sin(y * f2 + p2) + (wobble(3.7, y / 260) - 0.5) * 160;
			x = Math.max(WIDTH * 0.12, Math.min(WIDTH * 0.88, x));
			river.push([x, y]);
		}
	}

	// the lakes: two to four soft blobs, in low land and away from the river and from each other
	const lakes: { c: P; r: number; ring: P[] }[] = [];
	const lakeCount = 2 + Math.floor(rand() * 3);
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
	const mLow = quant(rest.map((k) => k.m), 0.2), mHigh = quant(rest.map((k) => k.m), 0.7);
	for (const k of cells) {
		if (k.riverbed || k.dr < DX * 0.8) k.biome = 'river';
		else if (k.e >= eHigh) k.biome = 'mountain';
		else if (k.m <= mLow) k.biome = 'sand';
		else if (k.m >= mHigh) k.biome = 'forest';
		else k.biome = 'grass';
	}

	// ── drawing ──
	const ground: string[] = [], plots: string[] = [], sprites: Sprite[] = [];
	const plotList: Plot[] = [];

	for (const k of cells) {
		if (!k.wild) continue;
		const strong = k.biome === 'mountain';
		ground.push(facets(k.full, strong ? '#dcd0b8' : '#efe6d2', strong ? '#f6efe2' : '#f8f2e6'));
	}

	cells.forEach((k, i) => {
		if (k.wild) return;
		const id = plotList.length + 1;
		const d = rounded(k.plot, 18);
		plotList.push({ id, biome: k.biome, d, centre: centroid(k.plot), area: Math.round(area(k.plot)) });
		plots.push(`<path d="${d}" transform="translate(0 2.5)" fill="#d6c4a0" opacity=".45"/>`);
		plots.push(`<path class="plot" data-plot="${id}" d="${d}" fill="${FILL[k.biome]}"/>`);
		if (k.biome === 'mountain') {
			plots.push(`<clipPath id="pc${i}"><path d="${d}"/></clipPath><g clip-path="url(#pc${i})" pointer-events="none">${facets(k.plot, '#ddd0b7', '#f4ecdd')}</g>`);
		}
		plots.push(`<path d="${d}" fill="none" stroke="#d3c099" stroke-width="1.4" pointer-events="none"/>`);
	});

	// what grows and stands on each cell, wild or plot
	for (const k of cells) {
		if (k.riverbed || k.inner.length < 3) continue;
		const a = area(k.inner);
		const poly = k.inner;
		switch (k.biome) {
			case 'forest': {
				for (const [x, y] of scatter(poly, Math.round(a / 115), 6.5, rand)) {
					const s = 0.8 + rand() * 0.45;
					sprites.push(rand() < 0.82 ? conifer(x, y, s) : broadleaf(x, y, s * 0.9));
				}
				break;
			}
			case 'mountain': {
				const rocks = wobble(k.c[0] / 500, k.c[1] / 500) > 0.52;
				if (rocks) {
					const n = 3 + Math.floor(rand() * 5);
					const at = scatter(poly, n, 13, rand);
					for (const [x, y] of at) sprites.push(spire(x, y, 0.8 + rand() * 0.4, rand));
					for (const [x, y] of scatter(poly, 12, 6, rand)) sprites.push(rand() < 0.5 ? stone(x, y, 0.8) : conifer(x, y, 0.55));
				} else {
					for (const [x, y] of scatter(poly, 3 + Math.floor(rand() * 3), 26, rand)) sprites.push(peak(x, y, 0.75 + rand() * 0.4, rand));
					for (const [x, y] of scatter(poly, 9, 7, rand)) sprites.push(stone(x, y, 0.7 + rand() * 0.4));
				}
				break;
			}
			case 'sand': {
				for (const [x, y] of scatter(poly, 8 + Math.floor(rand() * 6), 12, rand)) {
					sprites.push({ y: y - 50, svg: `<path d="M${f(x - 8)} ${f(y)}q8 -3.5 16 0M${f(x - 5)} ${f(y + 3)}q5 -2 10 0" stroke="#dcc79c" stroke-width=".9" fill="none" stroke-linecap="round"/>` });
				}
				for (const [x, y] of scatter(poly, 6, 10, rand)) sprites.push(tuft(x, y, '#8c7f55'));
				break;
			}
			case 'grass': {
				for (const [x, y] of scatter(poly, 12 + Math.floor(rand() * 10), 9, rand)) sprites.push(tuft(x, y));
				const trees = rand() < 0.55 ? 1 + Math.floor(rand() * 4) : 0;
				for (const [x, y] of scatter(poly, trees, 10, rand)) sprites.push(broadleaf(x, y, 0.8 + rand() * 0.3));
				if (rand() < 0.4) for (const [x, y] of scatter(poly, 1 + Math.floor(rand() * 3), 6, rand)) sprites.push(stone(x, y, 0.8));
				break;
			}
			case 'river': {
				for (const [x, y] of scatter(poly, 10 + Math.floor(rand() * 8), 7, rand)) sprites.push(tuft(x, y, '#5e7a55'));
				for (const [x, y] of scatter(poly, rand() < 0.7 ? 1 + Math.floor(rand() * 4) : 0, 10, rand)) sprites.push(broadleaf(x, y, 0.85 + rand() * 0.3, '#7f9b65'));
				break;
			}
		}
	}

	// cypresses and reeds along the banks and shores, where no plot is and not in the water
	const plotPolys = cells.filter((k) => !k.wild).map((k) => k.plot);
	const inWater = (x: number, y: number) =>
		nearest(river, [x, y]).d < BANK || lakes.some((l) => inside(l.ring, x, y) || nearest([...l.ring, l.ring[0]], [x, y]).d < SHORE * 0.6);
	const shoreTrees = (line: P[], loop: boolean, base: number, chance: number) => {
		for (let i = 0; i < line.length; i++) {
			if (rand() > chance || (!loop && (i === 0 || i === line.length - 1))) continue;
			const [ax, ay] = line[(i - 1 + line.length) % line.length], [bx, by] = line[(i + 1) % line.length];
			const l = Math.hypot(bx - ax, by - ay);
			const side = loop ? 1 : rand() < 0.5 ? -1 : 1, off = base + 8 + rand() * 22;
			// a lake's ring runs clockwise on screen (y points down), so its outside is to the left of the way it runs
			const x = line[i][0] + ((by - ay) / l) * off * side * (loop ? 1 : -1), y = line[i][1] - ((bx - ax) / l) * off * side * (loop ? 1 : -1);
			if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT || inWater(x, y) || plotPolys.some((p) => inside(p, x, y))) continue;
			const n = 2 + Math.floor(rand() * 4);
			for (let j = 0; j < n; j++) sprites.push(rand() < 0.7 ? cypress(x + j * 4, y + j, 0.8 + rand() * 0.4) : tuft(x + j * 3, y, '#5e7a55'));
		}
	};
	shoreTrees(river, false, BANK, 0.5);
	for (const l of lakes) shoreTrees(l.ring, true, SHORE, 0.45);

	const rp = smoothPath(river);
	const water =
		`<path d="${rp}" fill="none" stroke="${LAND}" stroke-width="${2 * BANK + 4}" stroke-linecap="round"/>` +
		`<path d="${rp}" fill="none" stroke="#e8dcbf" stroke-width="${2 * BANK - 8}" stroke-linecap="round"/>` +
		`<path d="${rp}" fill="none" stroke="#2f5254" stroke-width="50" stroke-linecap="round"/>` +
		`<path d="${rp}" fill="none" stroke="#4f8a8b" stroke-width="41" stroke-linecap="round" transform="translate(2.5 1.5)"/>` +
		`<path d="${rp}" fill="none" stroke="#8cbcb6" stroke-width="2.5" stroke-dasharray="30 46" stroke-linecap="round" opacity=".6" transform="translate(-6 -2)"/>`;

	const lakeSvg = lakes
		.map((l) => {
			const d = smoothLoop(l.ring);
			let waves = '';
			for (let i = 0; i < 3; i++) {
				const x = l.c[0] + (rand() - 0.5) * l.r * 0.9, y = l.c[1] + (rand() - 0.5) * l.r * 0.5;
				waves += `<path d="M${f(x - 14)} ${f(y)}q7 -4 14 0t14 0" stroke="#8cbcb6" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>`;
			}
			return (
				`<path d="${d}" fill="${LAND}" stroke="${LAND}" stroke-width="${2 * SHORE + 6}" stroke-linejoin="round"/>` +
				`<path d="${d}" fill="#e8dcbf" stroke="#e8dcbf" stroke-width="${SHORE + 4}" stroke-linejoin="round"/>` +
				`<path d="${d}" fill="#4f8a8b" stroke="#2f5254" stroke-width="5"/>` +
				waves
			);
		})
		.join('');

	sprites.sort((a, b) => a.y - b.y);
	const svg =
		`<rect x="${-M}" y="${-M}" width="${WIDTH + 2 * M}" height="${HEIGHT + 2 * M}" fill="${LAND}"/>` +
		`<g pointer-events="none">${ground.join('')}</g>` +
		`<g>${plots.join('')}</g>` +
		`<g pointer-events="none">${water}${lakeSvg}</g>` +
		`<g pointer-events="none">${sprites.map((s) => s.svg).join('')}</g>`;

	return { seed, width: WIDTH, height: HEIGHT, plots: plotList, svg };
}
