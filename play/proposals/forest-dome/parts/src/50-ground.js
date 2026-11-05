/* ================================================================================================================
 * 5. GROUND — the garden under the glass: its floor (the ground the biome is laid on), the plaza before the rooms, the
 *    meandering paths from the three gates, the brook from its spring to the pond, the bridges and the ford, the
 *    clearing with its pergola and its circle of benches, the logs and the trellises, and where each plant stands
 * ================================================================================================================ */

/*
 * How it is laid out, first to last: the brook (a spring's bowl in the plaza, a rill over the kerb into a basin, round
 * the clearing's east and under the south path to the pond), the gravel paths (each gate's, the loop round the
 * clearing, the spine up to the plaza) with their heights smoothed along them, a bridge wherever a path crosses the
 * water, the stepping-stone paths (one fords the brook), the things that stand (the pergola, the steps down from the
 * plaza, the flagstone aprons inside the gates, the paved circle, the bigger stones); then the forest, layer by layer
 * in guilds round its trees, each plant on the floor's height where it stands, the logs and the trellises among them;
 * then everything is built.
 *
 * THE FLOOR is one mesh in 'soil' (the page paints it with the biome and grows the biome's cover on it): a grid of
 * 0.75 m, refined near anything the cover must not grow under and cut cleanly along a field that is negative under
 * the paths, the plaza, the steps and aprons, the brook's bed and banks, the pond, the logs, the footings, the bigger
 * stones and the paved circle. What is cut is drawn by what lies over it (gravel, flags, limestone, the bed of the
 * brook and the pond in 'gr-bed', stones, logs); the ground under the bridges and along the stepping stones is kept,
 * as bare trodden earth ('gr-bed'). The benches and the plants are play's own assets, marked where they stand.
 */

const gr_mergeVertices = require('three/addons/utils/BufferGeometryUtils.js').mergeVertices;

/** the floor's edge (inside the knee wall) and its grid */
const gr_TR = R - 0.35;
const gr_STEP = 0.75;
/** the plaza: its flags, its kerb's top, the risers of the steps down from it and where the paths arrive below them */
const gr_PLAZA_Y = 0.12;
const gr_KERB_Y = 0.135;
const gr_RISE = 0.142;
const gr_ARRIVE_Y = gr_KERB_Y - 3 * gr_RISE;
/** the floor's level along the plaza's front (the kerb shows a hand's height of its face) */
const gr_FRONT_Y = -0.14;
/** the sun's bearing in the viewer (south-west): the sunny side of a tree; the shady side is opposite */
const gr_SUN = (218 * Math.PI) / 180;
const gr_SHADY = gr_SUN - Math.PI;
/** the clearing: the loop's middle and radius, and the paved circle in it (its height set when the build starts) */
const gr_LOOP = { x: 0, z: -8, r: 8.5 };
const gr_PAD = { x: 0.3, z: -8.3, r: 3.1, y: 0 };
/** the pond near the south door: its middle, half length and half width, its long axis' turn, its water, its depth */
const gr_POND = { x: -11.2, z: -29.8, a: 5.0, b: 3.0, th: 0.35, w: -0.42, depth: 0.6 };
/** the brook's water in the spring's basin */
const gr_SPRING_W = -0.32;
/** the brook's course: from under the kerb through its basin, round the clearing's east, under the south path, to the pond */
const gr_BROOK = [[0, 12.62], [0, 11.5], [0.5, 9.5], [2.0, 7.5], [4.0, 5.8], [5.2, 3.4], [7.6, 1.3], [11.2, 0.2], [14.2, -1.6], [15.6, -4.6], [15.2, -8.2], [16.0, -11.6], [14.6, -15.4], [11.4, -17.6], [8.0, -19.8], [4.6, -22.2], [0.8, -23.6], [-2.8, -24.8], [-5.4, -26.4]];
/**
 * The gravel paths, in the order they are laid (a path joins only one laid before it): `w` its width, its edging
 * (oak boards, or river cobbles on the loop and the spine), where it starts (a door, or on another path near a point),
 * the points it bends through, and where it ends (on another path, or the plaza's front at x, down its steps).
 */
const gr_PATHS = [
	{ id: 'loop', w: 2.2, edge: 'cobble', closed: true },
	{ id: 'south', w: 2.3, edge: 'board', from: { door: 'south' }, pts: [[-1.0, -33.5], [-1.4, -30.8], [-0.4, -27.8], [0.9, -25.2], [0.8, -22.4], [-0.3, -19.6]], to: { on: 'loop', near: [0, -16.6] } },
	{ id: 'spine', w: 2.2, edge: 'cobble', from: { on: 'loop', near: [-1.8, 0.4] }, pts: [[-3.1, 3.5]], to: { plaza: -7.6 } },
	{ id: 'west', w: 2.2, edge: 'board', from: { door: 'west' }, pts: [[-33.2, 1.5], [-29.0, 3.4]], to: { plaza: -25 } },
	{ id: 'westLoop', w: 2.0, edge: 'board', from: { on: 'west', near: [-34.8, 1.0] }, pts: [[-30.5, -1.4], [-25.2, -3.5], [-19.6, -4.4], [-14.4, -6.3]], to: { on: 'loop', near: [-8.6, -8.4] } },
	{ id: 'east', w: 2.3, edge: 'board', from: { door: 'east' }, pts: [[33.6, -2.0], [28.6, -1.5], [23.6, -3.3], [19.2, -5.1], [16.0, -5.6], [12.4, -6.6]], to: { on: 'loop', near: [8.7, -7.2] } },
	{ id: 'eastPlaza', w: 2.0, edge: 'board', from: { on: 'east', near: [34.8, -1.9] }, pts: [[31.6, 1.4], [28.2, 4.2]], to: { plaza: 23.5 } }
];
/** the stepping-stone paths: into the forest (one across the brook by a ford), to the pond's shore, and into the circle */
const gr_SIDE = [
	{ id: 'ford', from: { on: 'loop', near: [5.6, -14.6] }, pts: [[8.6, -14.8], [11.2, -15.7], [13.8, -17.3], [16.6, -19.1], [19.0, -21.6]] },
	{ id: 'pond', from: { on: 'south', near: [-1.2, -31.6] }, pts: [[-3.6, -32.6], [-5.6, -32.4]], to: 'pond' },
	{ id: 'southwest', from: { on: 'westLoop', near: [-22.4, -4.0] }, pts: [[-23.6, -7.8], [-25.2, -11.6], [-24.4, -15.6], [-21.8, -18.8]] },
	{ id: 'southeast', from: { on: 'east', near: [25.6, -2.6] }, pts: [[26.4, -6.6], [28.2, -10.4], [27.4, -14.4], [24.8, -16.8]] },
	{ id: 'padNorth', from: { on: 'loop', bearing: -0.5 }, to: 'pad' },
	{ id: 'padSouth', from: { on: 'loop', bearing: 3.5 }, to: 'pad' }
];
/** the top of the flagstone aprons inside the portals: the doorways' floor */
const gr_APRON_Y = 0;
/** half the width of the trodden strip a stepping-stone path's stones lie in */
const gr_SIDE_W = 0.42;
/** the pergola over the loop's north-east, its posts at these bearings from the loop's middle (degrees) */
const gr_PERGOLA = [15, 29, 43, 57, 71];
/** the benches round the paved circle (play's curved oak bench, a thing): the bearing of each one's middle (degrees) */
const gr_BENCHES = [30, 100, 160, 260];

/** the build's own state (set by groundPart): what is laid out, planted and to be built */
let gr_G = null;

/* ---- materials of the ground's own: the bed of the brook and the pond (the soil's pictures, darker and wet), the lilies ---- */

material('gr-bed', 2.5, () => {
	mat('soil');
	const s = SHARED.soil;
	return new THREE.MeshStandardMaterial({ color: '#c2b4a0', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 0.78 });
});
// the paths' edging: oak boards weathered dark in the damp of the forest floor (the timber's pictures), so the light
// gravel paths read crisply against the ground
material('gr-board', 1.2, () => {
	mat('timber');
	const s = SHARED.oak;
	return new THREE.MeshStandardMaterial({ color: '#6f675d', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});
// the flagstones of the plaza and the paved circle: the flags' pictures, a warmer honey limestone, weathered
material('gr-flag', 3, () => {
	mat('flag');
	const s = SHARED.flag;
	return new THREE.MeshStandardMaterial({ color: '#c9b79a', map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(1.25, 1.25), roughnessMap: s.roughnessMap, roughness: 1 });
});
// river stones of a darker, greyer kind among the kit's sandy ones (the stone's pictures, tinted)
material('gr-rock', 0.6, () => {
	mat('stone');
	const s = SHARED.stone;
	return new THREE.MeshStandardMaterial({ color: '#8f8a83', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});
material('gr-lily', 1, () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42, side: THREE.DoubleSide }));
material('gr-bloom', 1, () => new THREE.MeshStandardMaterial({ color: '#f6eef0', roughness: 0.6, emissive: '#3a3034', side: THREE.DoubleSide }));

/* ================================================================================================================
 * 5.1 FIELDS — the ground's relief, the lines things follow, and how high the floor is anywhere
 * ================================================================================================================ */

/** smooth noise along a line, 0 … 1 */
const gr_n1 = (s, seed) => vnoise(s + 50, 0.5, 65536, 1, seed);
/** the arc length at each point of a line */
function gr_arc(P) {
	const S = [0];
	for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
	return S;
}
/** the unit normal of a line at point i, to the right of the way it runs: [x, z] */
function gr_normal(P, i, closed = false) {
	const n = P.length;
	const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
	const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
	return [tz / l, -tx / l];
}
/** the index of a line's point at arc length s */
function gr_index(S, s) {
	let lo = 0, hi = S.length - 1;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (S[m] < s) lo = m;
		else hi = m;
	}
	return s - S[lo] < S[hi] - s ? lo : hi;
}
/** a list of numbers smoothed along a line: a box of ±k points, `passes` times (round, where the line is closed) */
function gr_smoothAlong(Y, closed, k = 9, passes = 3) {
	const n = Y.length;
	let A = Y.slice();
	for (let p = 0; p < passes; p++) {
		const B = new Array(n);
		for (let i = 0; i < n; i++) {
			let s = 0, c = 0;
			for (let j = -k; j <= k; j++) {
				let q = i + j;
				if (closed) q = (q + n) % n;
				else if (q < 0 || q >= n) continue;
				s += A[q];
				c++;
			}
			B[i] = s / c;
		}
		A = B;
	}
	return A;
}
/** how far a capsule (a segment with a radius: a log, a footing, a bridge) is from [x, z], to its axis */
function gr_capsule(c, x, z) {
	const dx = c.bx - c.ax, dz = c.bz - c.az, l2 = dx * dx + dz * dz;
	const t = l2 ? clamp(((x - c.ax) * dx + (z - c.az) * dz) / l2) : 0;
	return Math.hypot(x - c.ax - dx * t, z - c.az - dz * t);
}

/**
 * LINES — polylines (the brook, the paths, the stepping-stone paths) found near a point fast: each segment kept in the
 * squares of `cell` metres it crosses; a point asks its square and the eight round it, so a line within a cell is found.
 */
class gr_Lines {
	constructor(cell = 4) {
		this.cell = cell;
		this.grid = new Map();
		this.lines = [];
	}
	key(cx, cz) {
		return (cx + 4096) * 8192 + cz + 4096;
	}
	add(line) {
		const id = this.lines.push(line) - 1;
		const P = line.P, n = P.length, m = line.closed ? n : n - 1;
		// a coarse map of where any line is within 4 m: most of the garden asks no further
		this.coarse ??= new Set();
		for (let i = 0; i < m; i++) {
			const a = P[i], b = P[(i + 1) % n];
			for (let cx = Math.floor((Math.min(a[0], b[0]) - 4) / 4); cx <= Math.floor((Math.max(a[0], b[0]) + 4) / 4); cx++)
				for (let cz = Math.floor((Math.min(a[1], b[1]) - 4) / 4); cz <= Math.floor((Math.max(a[1], b[1]) + 4) / 4); cz++) this.coarse.add(this.key(cx, cz));
			const x0 = Math.floor(Math.min(a[0], b[0]) / this.cell), x1 = Math.floor(Math.max(a[0], b[0]) / this.cell);
			const z0 = Math.floor(Math.min(a[1], b[1]) / this.cell), z1 = Math.floor(Math.max(a[1], b[1]) / this.cell);
			for (let cx = x0; cx <= x1; cx++)
				for (let cz = z0; cz <= z1; cz++) {
					const k = this.key(cx, cz);
					let list = this.grid.get(k);
					if (!list) this.grid.set(k, (list = []));
					list.push(id, i);
				}
		}
		return line;
	}
	/**
	 * The nearest point of each line within `reach` of [x, z] (at least): { line, i (its segment), t (along it), d },
	 * the first `this.n` of the list returned (the list and its entries are reused by the next call: read them at once).
	 */
	near(x, z, reach = 2) {
		const c = this.cell, k = Math.ceil(reach / c);
		const cx = Math.floor(x / c), cz = Math.floor(z / c);
		const out = this.out ?? (this.out = []);
		let n = 0;
		if (!this.coarse.has(this.key(Math.floor(x / 4), Math.floor(z / 4)))) {
			this.n = 0;
			return out;
		}
		for (let a = -k; a <= k; a++)
			for (let b = -k; b <= k; b++) {
				const list = this.grid.get(this.key(cx + a, cz + b));
				if (!list) continue;
				for (let q = 0; q < list.length; q += 2) {
					const line = this.lines[list[q]], i = list[q + 1];
					const P = line.P, p = P[i], r = P[(i + 1) % P.length];
					const dx = r[0] - p[0], dz = r[1] - p[1];
					const t = clamp(((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz || 1e-9));
					const ex = x - p[0] - dx * t, ez = z - p[1] - dz * t;
					const d = Math.sqrt(ex * ex + ez * ez);
					let e = null;
					for (let m = 0; m < n; m++) if (out[m].line === line) e = out[m];
					if (!e) {
						e = out[n] ?? (out[n] = {});
						n++;
						(e.line = line), (e.i = i), (e.t = t), (e.d = d);
					} else if (d < e.d) (e.i = i), (e.t = t), (e.d = d);
				}
			}
		this.n = n;
		return out;
	}
}
/**
 * DISCS — capsules (a log, a footing, a stone, a bridge: a segment and a radius) found near a point fast: each kept in
 * every square of `cell` metres within `margin` of it, so a point asks only its own square.
 */
class gr_Discs {
	constructor(margin, cell = 2) {
		this.cell = cell;
		this.margin = margin;
		this.grid = new Map();
		this.all = [];
	}
	add(c) {
		this.all.push(c);
		const m = c.r + this.margin, s = this.cell;
		for (let cx = Math.floor((Math.min(c.ax, c.bx) - m) / s); cx <= Math.floor((Math.max(c.ax, c.bx) + m) / s); cx++)
			for (let cz = Math.floor((Math.min(c.az, c.bz) - m) / s); cz <= Math.floor((Math.max(c.az, c.bz) + m) / s); cz++) {
				const k = (cx + 4096) * 8192 + cz + 4096;
				if (!this.grid.has(k)) this.grid.set(k, []);
				this.grid.get(k).push(c);
			}
		return c;
	}
	/** those within the margin of [x, z] (and maybe a few more) */
	at(x, z) {
		return this.grid.get((Math.floor(x / this.cell) + 4096) * 8192 + Math.floor(z / this.cell) + 4096) ?? gr_NONE;
	}
	/** how far [x, z] is out of the nearest (99 when none is within the margin) */
	dist(x, z) {
		let d = 99;
		for (const c of this.at(x, z)) d = Math.min(d, gr_capsule(c, x, z) - c.r);
		return d;
	}
}
const gr_NONE = [];
/** a line's per-point value (A) where a near point found it */
const gr_val = (e, A) => {
	const n = A.length, j = (e.i + 1) % n;
	return A[e.i] + (A[j] - A[e.i]) * e.t;
};

/** the ground's own relief before anything is laid in it: soft mounds and swales (± 0.25 m) */
function gr_relief(x, z) {
	const a = vnoise(x / 12.5 + 300, z / 12.5 + 300, 8192, 8192, 501) - 0.5;
	const b = vnoise(x / 5.2 + 300, z / 5.2 + 300, 8192, 8192, 503) - 0.5;
	const c = vnoise(x / 26 + 300, z / 26 + 300, 8192, 8192, 507) - 0.5;
	return 0.5 * a + 0.14 * b + 0.42 * c;
}
/** how far [x, z] is in front of the plaza's edge (its kerb's face), in metres */
const gr_dPlaza = (x, z) => (edgeZ(0, x) - z) / Math.hypot(1, x / RHO);
/** the plaza's edge at x: where it is, along it (eastward) and out into the garden */
function gr_edgeFrame(x0) {
	const z = edgeZ(0, x0), l = Math.hypot(1, x0 / RHO);
	const t = [1 / l, -x0 / RHO / l];
	return { x: x0, z, t, n: [t[1], -t[0]] };
}
/** the relief, level at the shell's foot and stepping down to the plaza's front */
function gr_nat0(x, z) {
	let h = 0.25 * Math.tanh((gr_relief(x, z) - 0.02) / 0.25);
	h *= span(gr_TR - Math.hypot(x, z), 0.4, 5);
	return lerp(gr_FRONT_Y, h, span(gr_dPlaza(x, z), 0.6, 5));
}
/** … and level in the clearing */
function gr_nat(x, z) {
	const h = gr_nat0(x, z);
	const dc = Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z);
	return dc > 10.5 ? h : lerp(gr_PAD.y, h, span(dc, 4.5, 10.5));
}

/** the pond's outline: its radius at angle phi in its own frame (an ellipse, wavering) */
function gr_pondR(phi) {
	const { a, b } = gr_POND;
	const e = (a * b) / Math.hypot(b * Math.cos(phi), a * Math.sin(phi));
	return e * (1 + 0.1 * Math.sin(2 * phi + 1.1) + 0.06 * Math.sin(3 * phi + 0.3) + 0.035 * Math.sin(5 * phi + 2.2));
}
/** how far [x, z] is outside the pond's outline (negative inside), along its radius */
function gr_pondSD(x, z) {
	const dx = x - gr_POND.x, dz = z - gr_POND.z;
	const far = Math.sqrt(dx * dx + dz * dz) - 6.5;
	if (far > 3.5) return far;
	const c = Math.cos(gr_POND.th), s = Math.sin(gr_POND.th);
	const u = dx * c + dz * s, v = -dx * s + dz * c;
	return Math.hypot(u, v) - gr_pondR(Math.atan2(v, u));
}
/** the point of the pond's outline at angle phi, `out` metres outside it */
function gr_pondAt(phi, out = 0) {
	const r = gr_pondR(phi) + out, c = Math.cos(gr_POND.th), s = Math.sin(gr_POND.th);
	const u = r * Math.cos(phi), v = r * Math.sin(phi);
	return [gr_POND.x + u * c - v * s, gr_POND.z + u * s + v * c];
}

/** the brook near [x, z]: how far from its middle, its half width, water and depth there (or null) */
function gr_brookQ(x, z) {
	const e = gr_G.brookIdx.near(x, z, 4)[0];
	if (!gr_G.brookIdx.n) return null;
	const hw = gr_val(e, e.line.HW);
	if (e.d > hw + 3.4) return null;
	return { d: e.d, hw, w: gr_val(e, e.line.W), D: gr_val(e, e.line.D), s: gr_val(e, e.line.S) };
}
/** the gravel path near [x, z]: how far out of its edge (`e`) and its height (the lowest where several meet) */
function gr_pathQ(x, z) {
	let best = null, under = null;
	const idx = gr_G.pathIdx, list = idx.near(x, z, 3);
	for (let q = 0; q < idx.n; q++) {
		const o = list[q];
		const e = o.d - o.line.hw, y = gr_val(o, o.line.Y);
		if (e < 0.1 && (!under || y < under.y)) under = { e, y, line: o.line };
		if (!best || e < best.e) best = { e, y, line: o.line };
	}
	if (under) return under;
	return best && best.e < 1.6 ? best : null;
}

/**
 * THE FLOOR'S HEIGHT at [x, z]: the relief, sunk into a soft valley along the brook and round the pond (to their
 * banks' height), laid level to each path's height under and beside it (but for the bridges' banks), level round the
 * paved circle. (Asked tens of thousands of times: it makes nothing it need not.)
 */
function gr_hs(x, z) {
	const G = gr_G;
	let h = gr_nat(x, z);
	const bi = G.brookIdx, bl = bi.near(x, z, 4);
	let bd = 99;
	if (bi.n) {
		const e = bl[0];
		bd = e.d - gr_val(e, e.line.HW);
		if (bd < 3.2) h = lerp(gr_val(e, e.line.W) + 0.08, h, span(bd, 0.55, 3.2));
	}
	const sd = gr_pondSD(x, z);
	if (sd < 3.2) h = lerp(gr_POND.w + 0.08, h, span(sd, 0.4, 3.2));
	// the path: the one under it (the lowest, where two meet), else the nearest
	const pi = G.pathIdx, pl = pi.near(x, z, 3);
	let be = 99, by = 0, ue = 99, uy = Infinity;
	for (let q = 0; q < pi.n; q++) {
		const o = pl[q], e = o.d - o.line.hw, y = gr_val(o, o.line.Y);
		if (e < 0.1 && y < uy) (ue = e), (uy = y);
		if (e < be) (be = e), (by = y);
	}
	if (ue < 99) (be = ue), (by = uy);
	if (be < 1.6) h = lerp(h, by - 0.02, (1 - span(be, 0.1, 1.5)) * span(bd, 0.9, 2.1));
	const dp = Math.hypot(x - gr_PAD.x, z - gr_PAD.z) - gr_PAD.r;
	if (dp < 1.4) h = lerp(gr_PAD.y - 0.01, h, span(dp, 0.05, 1.4));
	return h;
}

/** the brook's bed and banks at [x, z] (Infinity outside them): carved below its water, rising to its bank; `q` the brook there */
function gr_brookSurf(q, x, z) {
	if (!q || q.d > q.hw + 0.7) return Infinity;
	const a = q.hw * 1.05;
	if (q.d < a) return q.w - q.D * (1 - (q.d / a) ** 2);
	if (q.d < q.hw + 0.4) return q.w + 0.08 * smooth((q.d - a) / (q.hw + 0.4 - a));
	return gr_hs(x, z);
}
/** the pond's bed and banks at [x, z] (Infinity outside them): a shelf, then deeper to its middle; `sd` how far out of it */
function gr_pondSurf(sd, x, z) {
	if (sd > 0.6) return Infinity;
	if (sd < 0) return gr_POND.w - gr_POND.depth * Math.pow(smooth(-sd / 1.7), 0.85);
	if (sd < 0.35) return gr_POND.w + 0.08 * smooth(sd / 0.35);
	return gr_hs(x, z);
}
/** the bed of the brook (or the pond, `mine`) at [x, z]: where the two meet the lower shows, the other just under it */
function gr_bedY(x, z, mine, q = gr_brookQ(x, z)) {
	const b = gr_brookSurf(q, x, z), p = gr_pondSurf(gr_pondSD(x, z), x, z);
	let y = mine === 'brook' ? (b <= p ? b : p - 0.015) : p < b ? p : b - 0.015;
	return Number.isFinite(y) ? y : gr_hs(x, z);
}

/**
 * THE CUT — a field over the garden, negative wherever the biome's cover must not grow (and which thing is there):
 * the paths (to inside their edging), the plaza (to inside its kerb), the steps, the brook's bed and banks, the pond,
 * the stepping stones, the logs, footings, bigger stones and the paved circle, the ground under the bridges. Every part
 * of it is a distance in metres (or less steep), so a cell far from zero is wholly one or the other. In two parts: the
 * long smooth lines (the paths, the brook), asked of their lines on the floor's grid and smooth enough between to be
 * read off it; the rest (small or sharp: the plaza's edge, the pond, the stones, the steps, the holes) asked exactly
 * wherever the floor is cut. Also kept: how far the nearest path's edge and the water's edge are (for the colour).
 */
function gr_fieldLines(x, z, o, reach = 2) {
	const G = gr_G;
	let f = 2.5, k = 2.5, path = 3, water = 3;
	const pi = G.pathIdx, pl = pi.near(x, z, reach);
	for (let q = 0; q < pi.n; q++) {
		const e = pl[q], L = e.line, d = e.d - L.hw;
		if (d < path) path = d;
		// over a bridge's banks the gravel stops: the cut ends there too, square (and continuous, for the grid)
		let g = d - L.cut;
		if (L.bridges) {
			const s = gr_val(e, L.S);
			for (const b of L.bridges) {
				const along = Math.min(s - L.S[b.i0], L.S[b.i1] - s);
				if (along > -2) g = Math.max(g, along);
			}
		}
		if (g < f) f = g;
	}
	const b = G.brookIdx.near(x, z, reach)[0];
	if (G.brookIdx.n) {
		water = Math.min(water, b.d - gr_val(b, b.line.HW));
		if (water - 0.55 < f) f = water - 0.55;
	}
	// the stepping-stone paths: a strip of trodden earth the stones lie in (kept, as bare earth)
	const si = G.sideIdx, sl = si.near(x, z, reach);
	for (let q = 0; q < si.n; q++) k = Math.min(k, sl[q].d - gr_SIDE_W);
	(o.fo = f), (o.fk = k), (o.path = path), (o.water = water);
	return o;
}
/**
 * The rest of the cut at [x, z], on top of the lines' part already in `o`: `fo` the part something else lies over
 * (gravel, flags, steps, the bed, a stone, a log), `fk` the part kept as bare earth (under the bridges, the stepping
 * stones' strips), `f` the two together; `small` how near the small things are (a finer grid there).
 */
function gr_fieldRest(x, z, o) {
	const G = gr_G;
	let f = Math.min(o.fo, gr_dPlaza(x, z) + 0.03), k = o.fk;
	const sd = gr_pondSD(x, z);
	if (sd < o.water) o.water = sd;
	f = Math.min(f, sd - 0.45);
	const big = Math.min(f, k);
	for (const A of G.lobes) {
		const dx = x - A.x, dz = z - A.z;
		const t = dx * A.t[0] + dz * A.t[1], on = dx * A.n[0] + dz * A.n[1];
		if (on < -0.3 || on > A.lobe[1] + 1 || Math.abs(t) > A.lobe[0] + 1) continue;
		const q = Math.pow(Math.abs(t) / A.lobe[0], 3) + Math.pow(Math.max(0, on) / A.lobe[1], 3);
		f = Math.min(f, (Math.cbrt(q) - 1) * A.lobe[1] + 0.03);
	}
	for (const h of G.holes.at(x, z)) {
		const g = gr_capsule(h, x, z) - h.r;
		if (h.cls === 'bridge') k = Math.min(k, g);
		else f = Math.min(f, g);
	}
	o.small = Math.min(f, k) < big ? Math.min(f, k) : 9;
	(o.fo = f), (o.fk = k), (o.f = Math.min(f, k));
	return o;
}
/** the whole cut at [x, z]: { f, fo, fk, path, water } */
const gr_field = (x, z) => gr_fieldRest(x, z, gr_fieldLines(x, z, {}));

/* ================================================================================================================
 * 5.2 LAYING OUT — the brook, the paths and their bridges, the stepping stones, what stands in the garden
 * ================================================================================================================ */

function gr_layBrook(G) {
	let P = smoothLine(gr_BROOK, 0.5);
	// on into the pond, well past its edge, so the brook's bed ends under the pond's
	const [lx, lz] = P[P.length - 1];
	const dx = gr_POND.x - lx, dz = gr_POND.z - lz, l = Math.hypot(dx, dz);
	for (let k = 1; k < 60; k++) {
		const q = [lx + (dx / l) * 0.5 * k, lz + (dz / l) * 0.5 * k];
		P.push(q);
		if (gr_pondSD(q[0], q[1]) < -2.4) break;
	}
	// a natural sway: a small sideways wander whose wavelength drifts (4 … 8 m), none at the spring or in the pond
	let S = gr_arc(P);
	let ph = 0.6;
	const N = P.map((p, i) => gr_normal(P, i));
	P = P.map((p, i) => {
		if (i) ph += (TAU * (S[i] - S[i - 1])) / (5 + 3.5 * gr_n1(S[i] / 9, 611));
		const amp = 0.2 * span(S[i], 3, 6) * span(gr_pondSD(p[0], p[1]), 1, 4) * (0.5 + gr_n1(S[i] / 6, 613));
		return [p[0] + N[i][0] * amp * Math.sin(ph), p[1] + N[i][1] * amp * Math.sin(ph)];
	});
	P = smoothLine(P, 0.25);
	S = gr_arc(P);
	const L = S[S.length - 1];
	let sPond = L;
	for (let i = 0; i < P.length; i++)
		if (gr_pondSD(P[i][0], P[i][1]) < 0) {
			sPond = S[i];
			break;
		}
	// 0.6 … 1.15 m of water, a wide basin at the spring, wider again where it runs into the pond
	const HW = S.map((s) => {
		let hw = 0.3 + 0.27 * gr_n1(s / 5.5, 617);
		hw = lerp(0.9, hw, span(s, 1.1, 3.4));
		return lerp(hw, 0.66, span(s, sPond - 4, sPond - 0.5));
	});
	const W = S.map((s) => lerp(gr_SPRING_W, gr_POND.w, clamp(s / sPond)));
	const D = HW.map((hw) => 0.17 + 0.28 * (hw - 0.3));
	G.brook = { id: 'brook', P, S, HW, W, D, L, sPond, closed: false };
	// found by every second point (half a metre apart: the curve between is off by millimetres)
	const half = (A) => A.filter((_, i) => i % 2 === 0 || i === A.length - 1);
	G.brookIdx = new gr_Lines(2);
	G.brookIdx.add({ id: 'brook', P: half(P), S: half(S), HW: half(HW), W: half(W), D: half(D), closed: false });
}

/** a point of a laid path: the nearest to `near`, or the loop's at a bearing from its middle */
function gr_onPath(G, o) {
	const L = G.paths[o.on];
	let best = 0, bd = Infinity;
	L.P.forEach(([x, z], i) => {
		const d = o.bearing !== undefined ? Math.abs(Math.atan2(Math.sin(Math.atan2(x - gr_LOOP.x, z - gr_LOOP.z) - o.bearing), Math.cos(Math.atan2(x - gr_LOOP.x, z - gr_LOOP.z) - o.bearing))) : Math.hypot(x - o.near[0], z - o.near[1]);
		if (d < bd) (bd = d), (best = i);
	});
	return { p: L.P[best].slice(), y: L.Y[best], i: best, line: L };
}

function gr_layPaths(G) {
	G.paths = {};
	G.pathList = [];
	G.pathIdx = new gr_Lines(2);
	G.arrivals = [];
	G.aprons = [];
	G.fillets = [];
	for (const spec of gr_PATHS) {
		const hw = spec.w / 2;
		const ctrl = [];
		let from = null, to = null;
		if (spec.closed)
			for (let k = 0; k < 12; k++) {
				const a = (k / 12) * TAU;
				const [x, z] = polar(gr_LOOP.r + 0.45 * Math.sin(2 * a + 0.7) + 0.3 * Math.sin(3 * a + 2.1), a);
				ctrl.push([gr_LOOP.x + x, gr_LOOP.z + z]);
			}
		if (spec.from?.door) {
			const d = DOORS.find((q) => q.id === spec.from.door);
			ctrl.push(polar(R - 0.2, d.a), polar(R - 2.6, d.a), polar(R - 4.4, d.a));
			// a flagstone apron inside the gate, a little wider than its threshold, rounding in to the path 2.5 m on
			const [x, z] = polar(R, d.a);
			const n = [-Math.sin(d.a), -Math.cos(d.a)];
			G.aprons.push({ x, z, n, t: [n[1], -n[0]], lobe: [Math.max(2.25, doorSize(d).foot / 2 + 0.25), 2.5], door: d.id });
		}
		if (spec.from?.on) ctrl.push((from = gr_onPath(G, spec.from)).p);
		ctrl.push(...(spec.pts ?? []));
		if (spec.to?.plaza !== undefined) {
			const f = gr_edgeFrame(spec.to.plaza);
			for (const o of [4.4, 1.7, 0.72]) ctrl.push([f.x + f.n[0] * o, f.z + f.n[1] * o]);
			// two step slabs below the kerb, each a rounded lobe, the lower one the wider and deeper
			G.arrivals.push({ ...f, hw, path: spec.id, lobe: [hw + 1.15, 0.98] });
		}
		if (spec.to?.on) ctrl.push((to = gr_onPath(G, spec.to)).p);
		const P = smoothLine(ctrl, 0.35, !!spec.closed);
		if (spec.closed) P.pop();
		const S = gr_arc(P), L = S[S.length - 1];
		// level along it: the relief smoothed over ±3 m, down to each door's sill, the steps' foot, a joined path
		const C = P.map(() => 1);
		const Y = gr_smoothAlong(P.map(([x, z]) => gr_nat(x, z)), !!spec.closed).map((y, i) => {
			const s = S[i], e = L - s;
			if (spec.from?.door) y = lerp(gr_APRON_Y - 0.045, y, span(s, 2.6, 7));
			if (from) {
				y = lerp(from.y - 0.022, y, span(s, 0.4, 3.6));
				C[i] *= span(s, 1.4, 3.2);
			}
			if (spec.to?.plaza !== undefined) y = lerp(gr_ARRIVE_Y, y, span(e, 0.6, 5));
			if (to) {
				y = lerp(to.y - 0.022, y, span(e, 0.4, 3.6));
				C[i] *= span(e, 1.4, 3.2);
			}
			return y;
		});
		const line = { id: spec.id, P, S, Y, C, hw, edge: spec.edge, closed: !!spec.closed, cut: spec.edge === 'cobble' ? 0.11 : 0.022, skip: new Uint8Array(P.length) };
		// where it joins another, a rounded fillet of gravel fills the corners between them; and where it bends
		// tighter than its width allows, one fills the inside of the bend
		for (const j of [from, to]) if (j) G.fillets.push({ x: j.p[0], z: j.p[1], y: j.y - 0.004, r: j.line.hw + 0.6 });
		for (let i = 2; i < P.length - 2; i++) {
			const a = Math.atan2(P[i][0] - P[i - 2][0], P[i][1] - P[i - 2][1]), b = Math.atan2(P[i + 2][0] - P[i][0], P[i + 2][1] - P[i][1]);
			const turn = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
			const radius = (S[i + 2] - S[i - 2]) / 2 / Math.max(1e-6, turn);
			if (radius < hw + 0.9 && !G.fillets.some((f) => Math.hypot(f.x - P[i][0], f.z - P[i][1]) < 0.7)) G.fillets.push({ x: P[i][0], z: P[i][1], y: Y[i] - 0.004, r: hw + 0.35 });
		}
		G.paths[spec.id] = line;
		G.pathList.push(line);
		G.pathIdx.add(line);
	}
	// a bridge wherever a path crosses the brook: the gravel stops at its banks, the bridge spans between
	G.bridges = [];
	for (const line of G.pathList) {
		const n = line.P.length;
		const zone = line.P.map(([x, z]) => {
			const q = gr_brookQ(x, z);
			return !!q && q.d - q.hw < 1.45;
		});
		for (let i = 0; i < n; i++) {
			if (!zone[i]) continue;
			let j = i;
			while (j + 1 < n && zone[j + 1]) j++;
			let wet = false;
			for (let k = i; k <= j; k++) {
				const q = gr_brookQ(line.P[k][0], line.P[k][1]);
				if (q && q.d < q.hw) wet = true;
			}
			if (wet && i > 0 && j < n - 1) {
				const b = { line, i0: i, i1: j };
				G.bridges.push(b);
				(line.bridges ??= []).push(b);
				for (let k = i; k < j; k++) line.skip[k] = 1;
			}
			i = j;
		}
	}
}

function gr_laySide(G) {
	G.sideIdx = new gr_Lines(2);
	G.stones = [];
	for (const spec of gr_SIDE) {
		const start = gr_onPath(G, spec.from);
		const ctrl = [start.p, ...(spec.pts ?? [])];
		if (spec.to === 'pad') {
			const a = Math.atan2(start.p[0] - gr_PAD.x, start.p[1] - gr_PAD.z);
			for (const [r, da] of [[5.8, 0.08], [gr_PAD.r + 0.35, 0.02]]) {
				const [x, z] = polar(r, a + da);
				ctrl.push([gr_PAD.x + x, gr_PAD.z + z]);
			}
		}
		if (spec.to === 'pond') {
			const [lx, lz] = ctrl[ctrl.length - 1];
			let bp = 0, bd = Infinity;
			for (let k = 0; k < 180; k++) {
				const q = gr_pondAt((k / 180) * TAU);
				const d = Math.hypot(q[0] - lx, q[1] - lz);
				if (d < bd) (bd = d), (bp = (k / 180) * TAU);
			}
			ctrl.push(gr_pondAt(bp, 0.25));
		}
		const P = smoothLine(ctrl, 0.2);
		const S = gr_arc(P), L = S[S.length - 1];
		G.sideIdx.add({ id: spec.id, P, S, closed: false });
		// a stone every 0.6 m or so, a little left and right of the line, its long side across the way
		const r = chance('gr-side', spec.id);
		let s = 0.3, k = 0;
		while (s < L - 0.05) {
			const i = gr_index(S, s);
			const [nx, nz] = gr_normal(P, i);
			const off = (k % 2 ? 1 : -1) * between(r, 0.03, 0.1);
			const x = P[i][0] + nx * off, z = P[i][1] + nz * off;
			const q = gr_brookQ(x, z);
			const ford = !!q && q.d < q.hw + 0.15;
			const pq = gr_pathQ(x, z);
			const last = spec.to === 'pond' && s > L - 0.6;
			if ((pq && pq.e < 0.42) || (gr_pondSD(x, z) < 0.3 && !last) || Math.hypot(x - gr_PAD.x, z - gr_PAD.z) < gr_PAD.r + 0.3) {
				s += 0.15;
				continue;
			}
			const a = last ? 0.44 : ford ? between(r, 0.27, 0.32) : between(r, 0.22, 0.29);
			const b = last ? 0.34 : ford ? between(r, 0.22, 0.26) : between(r, 0.17, 0.22);
			const st = { x, z, a, b, ry: Math.atan2(-nz, nx) + between(r, -0.25, 0.25), ford, w: ford ? q.w : 0, k: Math.floor(r() * 6), ax: x, az: z, bx: x, bz: z, r: a };
			G.stones.push(st);
			s += ford ? 0.56 : between(r, 0.58, 0.68);
			k++;
		}
	}
}

/** the things that stand: the pergola's posts, the steps, the paved circle, the bridges; their keep-clear and cut-out shapes */
function gr_planStructures(G) {
	G.struct = new gr_Discs(3);
	G.holes = new gr_Discs(0.6);
	const disc = (list, x, z, r, cls) => list.add({ ax: x, az: z, bx: x, bz: z, r, cls });
	// the pergola: a post each side of the loop at each bearing, the outer ones with a passion fruit each
	const loop = G.paths.loop;
	G.pergola = gr_PERGOLA.map((deg) => {
		const i = gr_onPath(G, { on: 'loop', bearing: (deg * Math.PI) / 180 }).i;
		const [x, z] = loop.P[i];
		let [nx, nz] = gr_normal(loop.P, i, true);
		if (nx * (x - gr_LOOP.x) + nz * (z - gr_LOOP.z) < 0) (nx = -nx), (nz = -nz);
		const o = loop.hw + 0.32;
		const post = (s) => ({ x: x + nx * o * s, z: z + nz * o * s });
		const p = { i, out: [nx, nz], inner: post(-1), outer: post(1), y: loop.Y[i] };
		for (const q of [p.inner, p.outer]) {
			disc(G.struct, q.x, q.z, 0.25);
			disc(G.holes, q.x, q.z, 0.11, 'footing');
		}
		return p;
	});
	// the steps down from the plaza
	for (const A of G.arrivals) disc(G.struct, A.x + A.n[0] * 0.5, A.z + A.n[1] * 0.5, A.hw + 1.3);
	// each gate seen from inside: its apron, and nothing planted in a view 5 m wide and 7 m deep (cleared after planting)
	G.views = G.aprons.map((A) => ({ ax: A.x + A.n[0] * 1, az: A.z + A.n[1] * 1, bx: A.x + A.n[0] * 7, bz: A.z + A.n[1] * 7, r: 2.5 }));
	G.lobes = [...G.arrivals, ...G.aprons];
	// the fillets where paths join
	for (const f of G.fillets) disc(G.holes, f.x, f.z, f.r - 0.03, 'fillet');
	// the paved circle
	disc(G.struct, gr_PAD.x, gr_PAD.z, gr_PAD.r + 0.15);
	disc(G.holes, gr_PAD.x, gr_PAD.z, gr_PAD.r - 0.04, 'pad');
	// the bridges: from where the gravel stops to where it starts again, the ground under them bare
	for (const b of G.bridges) {
		const A = b.line.P[b.i0], B = b.line.P[b.i1];
		const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L;
		Object.assign(b, { A, B, L, u: [ux, uz], v: [uz, -ux], yA: b.line.Y[b.i0], yB: b.line.Y[b.i1] });
		G.struct.add({ ax: A[0] - ux * 0.4, az: A[1] - uz * 0.4, bx: B[0] + ux * 0.4, bz: B[1] + uz * 0.4, r: 1.3 });
		b.hole = G.holes.add({ ax: A[0] - ux * 0.12, az: A[1] - uz * 0.12, bx: B[0] + ux * 0.12, bz: B[1] + uz * 0.12, r: 0.95, cls: 'bridge' });
	}
	// the stepping stones keep the small plants a hand's breadth off
	for (const s of G.stones) disc(G.struct, s.x, s.z, s.a + 0.05);
}

/* ================================================================================================================
 * 5.3 THE FOREST — play's plants marked where they stand, layer by layer, in guilds round the trees
 * ================================================================================================================ */

const gr_RANK = { canopy: 0, low: 1, shrub: 2, climber: 2, herb: 3, ground: 4, fungi: 4 };
/** how much of its grown size a plant has at a stage */
const gr_grown = (stage) => (stage >= 9 ? 1 : stage >= 8 ? 0.92 : stage >= 7 ? 0.85 : stage >= 6 ? 0.72 : stage >= 4 ? 0.45 : 0.3);
/** how close two plants may stand (their crowns' widths `w` as grown): trees apart, the small ones in the gaps */
function gr_need(a, b) {
	if (a.layer === b.layer) {
		if (a.clump && a.clump === b.clump) return 1.25;
		switch (a.layer) {
			case 'canopy':
				// a palm's crown is high over the others': it may stand nearer them
				if (a.stage <= 4 || b.stage <= 4) return 0.42 * (a.w + b.w);
				return clamp((a.kind === 'king-coconut' || b.kind === 'king-coconut' ? 0.36 : 0.45) * (a.w + b.w), 5.5, 8);
			case 'low':
				return 0.3 * (a.w + b.w);
			case 'climber':
				return 2.4;
			case 'fungi':
				return 0.3;
			default:
				return 0.33 * (a.w + b.w);
		}
	}
	const [big, small] = gr_RANK[a.layer] <= gr_RANK[b.layer] ? [a, b] : [b, a];
	switch (big.layer) {
		case 'canopy':
			return small.layer === 'low' ? Math.max(1.5, 0.15 * big.w + 0.2 * small.w) : 0.55 + 0.15 * small.w;
		case 'low':
			return small.layer === 'shrub' || small.layer === 'climber' ? Math.max(0.8, 0.16 * big.w + 0.28 * small.w) : 0.35 + 0.2 * small.w;
		case 'shrub':
		case 'climber':
			return 0.24 * big.w + 0.24 * small.w;
		case 'herb':
			return 0.32 * (big.w + small.w);
		default:
			return 0.25;
	}
}
/** whether a plant of `h` and crown `w` fits under the shell at radius r: its top 1.5 m under it, its crown clear */
function gr_underShell(r, h, w) {
	if (r >= R - 1) return false;
	if (Math.sqrt(R * R - r * r) <= h + 1.5) return false;
	for (const y of [h - 0.55 * w, h - 0.25 * w, h]) if (y > 0 && r + w / 2 > shellR(y) - 0.6) return false;
	return true;
}
/** how far [x, z] is from what a plant keeps clear of: the paths' edges, the water's, the plaza, the stones, the things */
function gr_clear(G, x, z) {
	let path = 99, water = 99, stone = 99;
	const pl = G.pathIdx.near(x, z, 4);
	for (let q = 0; q < G.pathIdx.n; q++) path = Math.min(path, pl[q].d - pl[q].line.hw);
	const b = G.brookIdx.near(x, z, 4)[0];
	if (G.brookIdx.n) water = b.d - gr_val(b, b.line.HW);
	water = Math.min(water, gr_pondSD(x, z));
	const sl = G.sideIdx.near(x, z, 2);
	for (let q = 0; q < G.sideIdx.n; q++) stone = Math.min(stone, sl[q].d - gr_SIDE_W);
	return { path, water, stone, struct: G.struct.dist(x, z), plaza: gr_dPlaza(x, z) };
}
/** the plants already placed near [x, z] (within ~9 m) */
function gr_nearPlants(G, x, z) {
	const out = [];
	const cx = Math.floor(x / 3), cz = Math.floor(z / 3);
	for (let a = -3; a <= 3; a++)
		for (let b = -3; b <= 3; b++) {
			const l = G.ph.get(`${cx + a},${cz + b}`);
			if (l) out.push(...l);
		}
	return out;
}
/** whether a plant of `kind` may stand at [x, z] at this stage and scale */
function gr_ok(G, kind, x, z, stage, scale, o = {}) {
	const p = PLANTS[kind], layer = p.layer;
	if (G.plants.length >= 3400) return false;
	if (!inGarden(x, z)) return false;
	if (!gr_underShell(Math.hypot(x, z), p.h * scale, p.w * scale)) return false;
	const w = p.w * gr_grown(stage) * scale, cr = w / 2;
	const tree = layer === 'canopy' || layer === 'low';
	const D = gr_clear(G, x, z);
	if (D.path < (tree ? Math.max(0.9, 0.6 * cr) : layer === 'shrub' ? 0.3 + 0.3 * cr : 0.3)) return false;
	if (D.water < (tree ? Math.max(0.6, 0.6 * cr) : o.wet ?? 0.3)) return false;
	if (D.plaza < (tree ? Math.max(3, 0.6 * cr) : 0.3)) return false;
	if (D.stone < (tree ? Math.max(1, 0.4 * cr) : 0.12)) return false;
	if (D.struct < (tree ? Math.max(0.8, 0.45 * cr) : layer === 'shrub' ? 0.3 : layer === 'fungi' ? -0.14 : 0.08)) return false;
	// inside the loop only the clearing's low plants
	if ((tree || layer === 'shrub') && Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z) < 8.2) return false;
	const me = { layer, w, stage, clump: o.clump, kind };
	if (layer === 'canopy') for (const t of G.canopy) if (Math.hypot(t.x - x, t.z - z) < gr_need(me, t)) return false;
	for (const q of gr_nearPlants(G, x, z)) {
		if (layer === 'canopy' && q.layer === 'canopy') continue;
		if (Math.hypot(q.x - x, q.z - z) < gr_need(me, q)) return false;
	}
	return true;
}
/** a plant marked: the dome's node on the floor's height, and kept here for what comes after */
function gr_put(G, kind, x, z, o = {}) {
	const p = PLANTS[kind];
	const r = G.r;
	const tree = p.layer === 'canopy' || p.layer === 'low';
	const stage = o.stage ?? 9;
	const scale = o.scale ?? between(r, 0.9, 1.1);
	const seed = o.seed ?? (tree ? 'abc' : 'ab')[Math.floor(r() * (tree ? 3 : 2))];
	const y = (o.y ?? gr_hs(x, z)) - (tree ? 0.02 : 0.01);
	G.dome.plant(kind, x, y, z, { stage, seed, turn: o.turn ?? r() * TAU, scale });
	const q = { kind, layer: p.layer, x, z, stage, w: p.w * gr_grown(stage) * scale, clump: o.clump };
	G.plants.push(q);
	if (p.layer === 'canopy') G.canopy.push(q);
	const key = `${Math.floor(x / 3)},${Math.floor(z / 3)}`;
	if (!G.ph.has(key)) G.ph.set(key, []);
	G.ph.get(key).push(q);
	G.count[kind] = (G.count[kind] ?? 0) + 1;
	G.layers[p.layer] = (G.layers[p.layer] ?? 0) + 1;
	return q;
}
/** a plant tried round [cx, cz]: `d0` … `d1` away, toward `bearing` ± `spread`; placed at the first place that fits */
function gr_around(G, kind, cx, cz, d0, d1, bearing, spread, o = {}, tries = 14) {
	const r = G.r;
	for (let k = 0; k < tries; k++) {
		const [dx, dz] = polar(between(r, d0, d1), bearing + (r() - 0.5) * 2 * spread);
		const stage = o.stage ?? 9, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, cx + dx, cz + dz, stage, scale, o)) return gr_put(G, kind, cx + dx, cz + dz, { ...o, stage, scale });
	}
	return null;
}
const gr_pick = (r, weights) => {
	const keys = Object.keys(weights);
	let sum = 0;
	for (const k of keys) sum += weights[k];
	let u = r() * sum;
	for (const k of keys) if ((u -= weights[k]) <= 0) return k;
	return keys[keys.length - 1];
};
/** the shade over [x, z]: 0 in the open, 1 deep under the crowns (looked up on a grid of a metre) */
function gr_shadeAt(G, x, z) {
	const S = G.shade;
	if (!S) return 0;
	const i = clamp(Math.round(x + 41), 0, 82), j = clamp(Math.round(z + 41), 0, 82);
	return S[j * 83 + i];
}
function gr_shadeGrid(G) {
	const S = new Float32Array(83 * 83);
	for (const t of G.plants) {
		if (t.layer !== 'canopy' && t.layer !== 'low') continue;
		const cr = t.w / 2 + 0.6, k = t.layer === 'canopy' ? (t.kind === 'king-coconut' ? 0.55 : 0.9) : 0.45;
		for (let j = Math.floor(t.z - cr); j <= Math.ceil(t.z + cr); j++)
			for (let i = Math.floor(t.x - cr); i <= Math.ceil(t.x + cr); i++) {
				const ii = i + 41, jj = j + 41;
				if (ii < 0 || jj < 0 || ii > 82 || jj > 82) continue;
				const v = k * smooth(1 - Math.hypot(i - t.x, j - t.z) / cr);
				S[jj * 83 + ii] = 1 - (1 - S[jj * 83 + ii]) * (1 - v);
			}
	}
	G.shade = S;
}

/** the canopy (Samuel 2026-11-05: way denser): trees 5.5–8 m apart, king coconuts where the dome is tallest, no two alike side by side */
function gr_plantCanopy(G) {
	const r = chance('forest-dome', 'canopy');
	const base = { mango: 1.25, jackfruit: 1, durian: 0.9, avocado: 1.1, sapodilla: 0.9 };
	const want = { 'king-coconut': 9, mango: 14, jackfruit: 10, durian: 8, avocado: 12, sapodilla: 8 };
	// candidates on a loose hexagonal lattice (a forest planted, then grown wild), then thrown into the gaps
	const cand = [];
	const sp = 6.8, rot = r() * Math.PI, ox = r() * sp, oz = r() * sp;
	for (let j = -8; j <= 8; j++)
		for (let i = -8; i <= 8; i++) {
			const u = (i + (j % 2) * 0.5) * sp + ox, v = j * sp * 0.866 + oz;
			const x = u * Math.cos(rot) - v * Math.sin(rot), z = u * Math.sin(rot) + v * Math.cos(rot);
			for (let t = 0; t < 4; t++) cand.push([x + (r() - 0.5) * 3.2, z + (r() - 0.5) * 3.2]);
		}
	for (let k = 0; k < 1600; k++) cand.push([between(r, -38.5, 38.5), between(r, -38.5, 11)]);
	// the king coconuts first, where the dome is tallest, in a loose group or two
	for (let k = 0; k < 600 && (G.count['king-coconut'] ?? 0) < want['king-coconut']; k++) {
		const [x, z] = polar(Math.sqrt(r()) * 24, r() * TAU);
		const stage = r() < 0.7 ? 9 : 8, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, 'king-coconut', x, z, stage, scale)) gr_put(G, 'king-coconut', x, z, { stage, scale });
	}
	for (const [x, z] of cand) {
		if (G.canopy.length >= 75) break;
		if (!inGarden(x, z)) continue;
		let nb = null, nd = 9;
		for (const t of G.canopy) {
			const d = Math.hypot(t.x - x, t.z - z);
			if (d < nd) (nd = d), (nb = t);
		}
		const weights = { ...base };
		for (const kind of Object.keys(weights)) {
			if ((G.count[kind] ?? 0) >= want[kind]) weights[kind] *= 0.12;
			if (nb && nb.kind === kind) weights[kind] *= 0.2;
		}
		const u = r();
		const stage = u < 0.55 ? 9 : u < 0.82 ? 8 : 6;
		const scale = between(r, 0.9, 1.1);
		// the kinds in the order chance picks them, the first that fits
		for (let t = 0; t < 3; t++) {
			const kind = gr_pick(r, weights);
			if (gr_ok(G, kind, x, z, stage, scale)) {
				gr_put(G, kind, x, z, { stage, scale, seed: 'abc'[Math.floor(r() * 3)] });
				break;
			}
			weights[kind] = 0;
		}
	}
	// a few young ones coming up in the gaps (succession)
	for (let k = 0, n = 0; k < 6000 && n < 10; k++) {
		const x = between(r, -36, 36), z = between(r, -36, 9);
		const kind = gr_pick(r, base);
		if (gr_ok(G, kind, x, z, 4, 1)) gr_put(G, kind, x, z, { stage: 4, scale: between(r, 0.92, 1.08) }), n++;
	}
}

/** each canopy tree's guild: cacao in its shade, a citrus or another low tree on its sunny side, coffee at its crown's
 *  edge, pepper up its trunk, comfrey round it and ginger in its shade */
function gr_plantGuilds(G) {
	const r = G.r;
	const sunny = { orange: 1, lemon: 1, soursop: 0.8, fig: 0.7, pomegranate: 0.7, papaya: 0.5 };
	for (const T of G.canopy.slice()) {
		if (T.stage <= 4) continue;
		const Rc = T.w / 2;
		const palm = T.kind === 'king-coconut';
		if (!palm && r() < 0.7) gr_around(G, 'cacao', T.x, T.z, 0.55 * Rc + 1.5, 0.9 * Rc + 1.8, gr_SHADY, 1.3, { stage: r() < 0.5 ? 8 : 6 });
		gr_around(G, gr_pick(r, sunny), T.x, T.z, 0.85 * Rc + 0.4, 1.25 * Rc + 0.8, gr_SUN, 1.0, { stage: r() < 0.6 ? 9 : 8 });
		if (r() < 0.4) gr_around(G, gr_pick(r, sunny), T.x, T.z, 0.9 * Rc, 1.3 * Rc + 1, gr_SUN + 1.4 * (r() < 0.5 ? 1 : -1), 0.6, { stage: r() < 0.5 ? 8 : 6 });
		const nc = palm ? 2 : 3 + Math.floor(r() * 4);
		for (let k = 0; k < nc; k++) gr_around(G, 'coffee', T.x, T.z, 0.5 * Rc, 0.95 * Rc, gr_SHADY, 1.9, { stage: r() < 0.7 ? 9 : 7 });
		if (!palm && r() < 0.42) gr_around(G, 'pepper', T.x, T.z, 0.75, 1.0, r() * TAU, Math.PI, { stage: 9 });
		const nf = 3 + Math.floor(r() * 4);
		for (let k = 0; k < nf; k++) gr_around(G, 'comfrey', T.x, T.z, 1.3, 2.6, r() * TAU, Math.PI, { stage: r() < 0.7 ? 9 : 7 });
		if (!palm && r() < 0.6) {
			const [dx, dz] = polar(between(r, 0.45, 0.85) * Rc, gr_SHADY + (r() - 0.5) * 2.4);
			gr_cluster(G, 'ginger', T.x + dx, T.z + dz, 4 + Math.floor(r() * 4), 0.5, 1.1);
		}
	}
}
/** a group of one small plant round [cx, cz]: n of them, `gap` apart, within `rad` */
function gr_cluster(G, kind, cx, cz, n, gap, rad, o = {}) {
	const r = G.r;
	let placed = 0;
	for (let k = 0; k < n * 6 && placed < n; k++) {
		const [dx, dz] = polar(Math.sqrt(r()) * rad, r() * TAU);
		const stage = o.stage ?? (r() < 0.75 ? 9 : 7);
		const scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, cx + dx, cz + dz, stage, scale, o)) gr_put(G, kind, cx + dx, cz + dz, { ...o, stage, scale }), placed++;
	}
	return placed;
}

/** bananas in clumps by the water and in the sun; papayas in the sun; more low trees in the gaps; coffee in the shade */
function gr_plantBananas(G) {
	const r = G.r;
	const B = G.brook;
	let clump = 0;
	// clumps along the brook, alternately on either bank
	for (let s = 4 + r() * 3, side = 1; s < B.sPond - 2; s += between(r, 4.5, 7.5), side = -side) {
		for (let t = 0; t < 6; t++) {
			const i = gr_index(B.S, s + (r() - 0.5) * 2);
			const [nx, nz] = gr_normal(B.P, i);
			const o = B.HW[i] + between(r, 1.5, 2.8);
			const sd = t % 2 ? -side : side;
			const cx = B.P[i][0] + nx * o * sd, cz = B.P[i][1] + nz * o * sd;
			if (gr_shadeAt(G, cx, cz) > 0.6) continue;
			if (gr_bananaClump(G, cx, cz, clump + 1)) {
				clump++;
				break;
			}
		}
	}
	// and two by the pond
	for (const phi of [1.9, 3.6]) {
		const [cx, cz] = gr_pondAt(phi, 2.3);
		gr_bananaClump(G, cx, cz, ++clump);
	}
}
function gr_plantLow(G) {
	const r = G.r;
	// papayas: in the sun along the paths
	for (let k = 0, n = 0; k < 3000 && n < 18; k++) {
		const L = G.pathList[Math.floor(r() * G.pathList.length)];
		const i = Math.floor(r() * L.P.length);
		const [nx, nz] = gr_normal(L.P, i, L.closed);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + between(r, 1.4, 2.4);
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		if (gr_shadeAt(G, x, z) > 0.3) continue;
		const stage = r() < 0.6 ? 9 : 7, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, 'papaya', x, z, stage, scale)) gr_put(G, 'papaya', x, z, { stage, scale }), n++;
	}
	// more low trees in the gaps, the sun-loving ones where it is open, cacao where it is shaded
	for (let k = 0; k < 30000 && (G.layers.low ?? 0) < 260; k++) {
		const x = between(r, -38, 38), z = between(r, -38, 10);
		const sh = gr_shadeAt(G, x, z);
		const kind = sh > 0.5 ? 'cacao' : gr_pick(r, { orange: 1, lemon: 0.9, fig: 0.8, pomegranate: 0.8, soursop: 0.7, papaya: 0.4 });
		const u = r();
		const stage = u < 0.5 ? 9 : u < 0.8 ? 8 : u < 0.93 ? 6 : 4;
		const scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, x, z, stage, scale)) gr_put(G, kind, x, z, { stage, scale });
	}
	// coffee filling the shade
	for (let k = 0; k < 30000 && (G.layers.shrub ?? 0) < 380; k++) {
		const x = between(r, -38, 38), z = between(r, -38, 10);
		if (gr_shadeAt(G, x, z) < 0.2) continue;
		const kind = r() < 0.86 ? 'coffee' : 'pepper';
		const stage = r() < 0.7 ? 9 : 7, scale = between(r, 0.9, 1.1);
		if (gr_ok(G, kind, x, z, stage, scale)) gr_put(G, kind, x, z, { stage, scale });
	}
}
/** a banana mat: a bearing plant and its suckers round it (or the red banana's), 1.2–1.7 m apart */
function gr_bananaClump(G, cx, cz, clump) {
	const r = G.r;
	const kind = r() < 0.35 ? 'red-banana' : 'banana';
	const n = 2 + Math.floor(r() * 3);
	const stages = [9, 8, 6, 4];
	let first = null;
	for (let k = 0, placed = 0; k < 24 && placed < n; k++) {
		const [dx, dz] = placed ? polar(between(r, 1.2, 1.7), r() * TAU) : [0, 0];
		const x = (first?.x ?? cx) + dx, z = (first?.z ?? cz) + dz;
		const stage = stages[placed], scale = between(r, 0.9, 1.1);
		if (!gr_ok(G, kind, x, z, stage, scale, { clump })) {
			if (!placed) return false;
			continue;
		}
		const q = gr_put(G, kind, x, z, { stage, scale, clump });
		if (!placed) first = q;
		placed++;
	}
	return true;
}

/** the herbs and the ground along the paths: basil and pineapple at their sunny edges, drifts of strawberry and
 *  nasturtium (and a little clover) along them, the clearing's meadow, comfrey and ginger to fill the shade */
function gr_plantEdges(G) {
	const r = G.r;
	for (const L of G.pathList) {
		const n = L.P.length;
		for (let i = 2; i < n - 2; i += 3 + Math.floor(r() * 3)) {
			if (L.skip[i]) continue;
			const [nx, nz] = gr_normal(L.P, i, L.closed);
			const [x0, z0] = L.P[i];
			for (const sd of [1, -1]) {
				const ox = x0 + nx * sd * (L.hw + 0.8), oz = z0 + nz * sd * (L.hw + 0.8);
				const sh = gr_shadeAt(G, ox, oz);
				const u = r();
				const tx = -nz, tz = nx;
				if (sh < 0.3 && u < 0.32) {
					// basil in a row along the edge
					const m = 3 + Math.floor(r() * 4);
					for (let k = 0; k < m; k++) {
						const a = (k - m / 2) * 0.45, o = L.hw + 0.42 + (k % 2) * 0.12;
						gr_try(G, 'basil', x0 + tx * a + nx * sd * o, z0 + tz * a + nz * sd * o);
					}
				} else if (sh < 0.3 && u < 0.55) {
					// pineapples, zigzag
					const m = 2 + Math.floor(r() * 4);
					for (let k = 0; k < m; k++) {
						const a = (k - m / 2) * 0.9, o = L.hw + 0.7 + (k % 2) * 0.45;
						gr_try(G, 'pineapple', x0 + tx * a + nx * sd * o, z0 + tz * a + nz * sd * o);
					}
				} else if (u < 0.88) {
					const kind = sh < 0.4 ? (r() < 0.55 ? 'nasturtium' : 'strawberry') : r() < 0.85 ? 'strawberry' : 'clover';
					gr_drift(G, kind, ox + tx * between(r, -1, 1), oz + tz * between(r, -1, 1), 3 + Math.floor(r() * 5), 0.85);
				}
			}
		}
	}
	// the clearing's meadow round the paved circle
	for (let k = 0; k < 9; k++) {
		const [dx, dz] = polar(between(r, 4, 6.4), (k / 9) * TAU + r() * 0.5);
		const kind = k % 3 === 0 ? 'clover' : k % 3 === 1 ? 'strawberry' : 'nasturtium';
		gr_drift(G, kind, gr_LOOP.x + dx, gr_LOOP.z + dz, 5 + Math.floor(r() * 4), 0.9);
	}
	for (let k = 0; k < 3; k++) {
		const [dx, dz] = polar(between(r, 4.5, 6.2), r() * TAU);
		gr_cluster(G, 'pineapple', gr_LOOP.x + dx, gr_LOOP.z + dz, 3, 0.9, 1.0);
	}
	// herbs under the low trees and in the shade, until there are enough
	const lows = G.plants.filter((p) => p.layer === 'low');
	for (let k = 0; k < 4000 && (G.layers.herb ?? 0) < 900; k++) {
		const T = lows[Math.floor(r() * lows.length)];
		const sh = gr_shadeAt(G, T.x, T.z);
		const kind = sh > 0.45 ? (r() < 0.6 ? 'ginger' : 'comfrey') : r() < 0.5 ? 'comfrey' : 'ginger';
		const [dx, dz] = polar(between(r, 0.9, 1.8), r() * TAU);
		gr_cluster(G, kind, T.x + dx, T.z + dz, 2 + Math.floor(r() * 3), 0.5, 0.8);
	}
	// strawberries under the sunny low trees
	for (let k = 0; k < 4000 && (G.layers.ground ?? 0) < 900; k++) {
		const T = lows[Math.floor(r() * lows.length)];
		const [dx, dz] = polar(between(r, 1, 2.2), gr_SUN + (r() - 0.5) * 2);
		gr_drift(G, r() < 0.7 ? 'strawberry' : 'nasturtium', T.x + dx, T.z + dz, 4, 0.7);
	}
}
function gr_try(G, kind, x, z) {
	const r = G.r;
	const stage = r() < 0.75 ? 9 : 7, scale = between(r, 0.9, 1.1);
	if (gr_ok(G, kind, x, z, stage, scale)) return gr_put(G, kind, x, z, { stage, scale });
	return null;
}
function gr_drift(G, kind, cx, cz, n, rad) {
	return gr_cluster(G, kind, cx, cz, n, 0.35, rad);
}

/** passion fruit: on the pergola's outer posts and on rustic trellises (two bark posts and a pole) in the sun by the paths */
function gr_plantClimbers(G) {
	const r = G.r;
	for (const p of G.pergola) {
		const [nx, nz] = p.out;
		const x = p.outer.x + nx * 0.2, z = p.outer.z + nz * 0.2;
		const turn = Math.atan2(nx, -nz);
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.7 ? 9 : 7, turn, scale: between(r, 0.95, 1.05) });
	}
	G.frames = [];
	const doors = ['south', 'west', 'east', 'eastPlaza', 'westLoop'];
	for (let k = 0; k < 2000 && G.frames.length < 5; k++) {
		const L = G.paths[doors[Math.floor(r() * doors.length)]];
		const i = 4 + Math.floor(r() * (L.P.length - 8));
		if (L.skip[i]) continue;
		const [nx, nz] = gr_normal(L.P, i);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + 1.4;
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		const tx = -nz, tz = nx;
		const ends = [[x + tx * 1.55, z + tz * 1.55], [x - tx * 1.55, z - tz * 1.55]];
		if (gr_shadeAt(G, x, z) > 0.35) continue;
		if (G.frames.some((f) => Math.hypot(f.x - x, f.z - z) < 11)) continue;
		let ok = true;
		for (const [ex, ez] of [[x, z], ...ends]) {
			const D = gr_clear(G, ex, ez);
			if (!inGarden(ex, ez) || D.path < 0.9 || D.water < 0.8 || D.plaza < 1.5 || D.stone < 0.6 || D.struct < 0.4) ok = false;
			for (const q of gr_nearPlants(G, ex, ez)) if ((q.layer === 'canopy' || q.layer === 'low') && Math.hypot(q.x - ex, q.z - ez) < (q.layer === 'canopy' ? 2.2 : 1.3)) ok = false;
		}
		if (!ok) continue;
		const f = { x, z, t: [tx, tz] };
		G.frames.push(f);
		G.struct.add({ ax: ends[0][0], az: ends[0][1], bx: ends[1][0], bz: ends[1][1], r: 0.35 });
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.6 ? 9 : 7, turn: Math.atan2(-tz, tx), scale: between(r, 0.95, 1.05) });
	}
}

/** logs lying in the shade, the oldest fallen trunks, and the mushroom bolts beside them (shiitake laid along, oyster
 *  stood on end: each brings its own little log) */
function gr_plantLogs(G) {
	const r = G.r;
	G.logs = [];
	const yards = [G.sideIdx.lines.find((l) => l.id === 'ford'), G.sideIdx.lines.find((l) => l.id === 'southwest')].map((l) => l.P[l.P.length - 1]);
	const fits = (ax, az, bx, bz, rad) => {
		for (let k = 0; k <= 4; k++) {
			const x = lerp(ax, bx, k / 4), z = lerp(az, bz, k / 4);
			if (!inGarden(x, z, 0.3)) return false;
			const D = gr_clear(G, x, z);
			if (D.path < 0.7 || D.water < 0.6 || D.stone < 0.35 || D.struct < 0.35 || D.plaza < 1.5) return false;
			if (Math.hypot(x - gr_LOOP.x, z - gr_LOOP.z) < 8.5) return false;
			for (const q of gr_nearPlants(G, x, z)) {
				const need = q.layer === 'canopy' ? 1.3 : q.layer === 'low' ? 0.8 : q.layer === 'shrub' ? 0.5 : 0.3;
				if (Math.hypot(q.x - x, q.z - z) < need + rad) return false;
			}
		}
		for (const l of G.logs) if (Math.min(Math.hypot(l.ax - ax, l.az - az), Math.hypot(l.bx - bx, l.bz - bz), Math.hypot((l.ax + l.bx) / 2 - (ax + bx) / 2, (l.az + l.bz) / 2 - (az + bz) / 2)) < 1.4) return false;
		return true;
	};
	const tryLog = (cx, cz, spread) => {
		for (let k = 0; k < 40; k++) {
			const [dx, dz] = polar(Math.sqrt(r()) * spread, r() * TAU);
			const x = cx + dx, z = cz + dz;
			const len = between(r, 1.8, 3.1), rad = between(r, 0.14, 0.21), a = r() * Math.PI;
			const [ux, uz] = polar(len / 2, a);
			if (!fits(x - ux, z - uz, x + ux, z + uz, rad)) continue;
			const log = { ax: x - ux, az: z - uz, bx: x + ux, bz: z + uz, r: rad, len, a, x, z };
			G.logs.push(log);
			G.struct.add({ ...log, r: rad + 0.15 });
			const lx = (log.bx - log.ax) / len, lz = (log.bz - log.az) / len;
			log.hole = G.holes.add({ ax: log.ax + lx * rad, az: log.az + lz * rad, bx: log.bx - lx * rad, bz: log.bz - lz * rad, r: rad * 0.72, cls: 'log' });
			return log;
		}
		return null;
	};
	for (const [x, z] of yards) for (let k = 0; k < 3; k++) tryLog(x, z, 3.2);
	const shady = G.canopy.filter((t) => t.stage > 4 && t.kind !== 'king-coconut');
	for (let k = 0; k < 60 && G.logs.length < 10; k++) {
		const T = shady[Math.floor(r() * shady.length)];
		const [dx, dz] = polar(T.w * 0.3, gr_SHADY + (r() - 0.5) * 2);
		tryLog(T.x + dx, T.z + dz, 1.6);
	}
	// the bolts beside each log
	for (const log of G.logs) {
		const ux = (log.bx - log.ax) / log.len, uz = (log.bz - log.az) / log.len;
		const vx = uz, vz = -ux;
		const n = 2 + Math.floor(r() * 2);
		for (let k = 0; k < n; k++) {
			const kind = r() < 0.55 ? 'shiitake' : 'oyster';
			const sd = r() < 0.5 ? 1 : -1;
			const along = between(r, -0.35, 0.35) * log.len;
			const o = log.r + (kind === 'shiitake' ? 0.17 : 0.2) + r() * 0.05;
			const x = log.x + ux * along + vx * o * sd, z = log.z + uz * along + vz * o * sd;
			const stage = r() < 0.75 ? 9 : 7;
			if (gr_ok(G, kind, x, z, stage, 1, { wet: 0.4 })) gr_put(G, kind, x, z, { stage, scale: between(G.r, 0.92, 1.08), turn: Math.atan2(-uz, ux) + (kind === 'oyster' ? r() * TAU : 0) });
		}
	}
}

/** the views into the gates kept clear, and what the dome's other parts keep clear (`dome.keep`): what was planted or
 *  laid in one is taken out afterwards (so the forest stands the same whatever else the dome holds) */
function gr_clearViews(G) {
	const inView = (x, z, m = 0) => G.views.some((v) => gr_capsule(v, x, z) < v.r + m) || G.keep.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + m);
	const gone = new Set();
	// a trellis in a view goes, and its passion fruit with it
	for (const f of G.frames) if (inView(f.x, f.z, 1.6)) gone.add(`${f.x},${f.z}`);
	for (const p of G.plants)
		if (gone.has(`${p.x},${p.z}`) || inView(p.x, p.z, p.layer === 'canopy' || p.layer === 'low' ? 0.4 * p.w : 0)) {
			gone.add(`${p.x},${p.z}`);
			G.layers[p.layer] -= 1;
			G.count[p.kind] -= 1;
		}
	G.plants = G.plants.filter((p) => !gone.has(`${p.x},${p.z}`));
	G.dome.plants = G.dome.plants.filter((q) => !gone.has(`${q.x},${q.z}`));
	G.frames = G.frames.filter((f) => !inView(f.x, f.z, 1.6));
	G.logs = G.logs.filter((l) => {
		if (!inView(l.x, l.z, l.len / 2)) return true;
		l.hole.r = -99;
		return false;
	});
}

/** more trellises, after all is planted (so nothing planted moves): where a frame fits in the sun by a path, clear of
 *  the plants round it and of the gates' views, till there are five */
function gr_moreFrames(G) {
	const r = chance('forest-dome', 'frames');
	const doors = ['south', 'west', 'east', 'eastPlaza', 'westLoop'];
	for (let k = 0; k < 3000 && G.frames.length < 5; k++) {
		const L = G.paths[doors[Math.floor(r() * doors.length)]];
		const i = 4 + Math.floor(r() * (L.P.length - 8));
		if (L.skip[i]) continue;
		const [nx, nz] = gr_normal(L.P, i);
		const sd = r() < 0.5 ? 1 : -1, o = L.hw + 1.4;
		const x = L.P[i][0] + nx * o * sd, z = L.P[i][1] + nz * o * sd;
		const tx = -nz, tz = nx;
		const line = { ax: x + tx * 1.6, az: z + tz * 1.6, bx: x - tx * 1.6, bz: z - tz * 1.6 };
		if (gr_shadeAt(G, x, z) > 0.4 || G.frames.some((f) => Math.hypot(f.x - x, f.z - z) < 10)) continue;
		if (G.views.some((v) => gr_capsule(v, x, z) < v.r + 2)) continue;
		let ok = true;
		for (const [ex, ez] of [[x, z], [line.ax, line.az], [line.bx, line.bz]]) {
			const D = gr_clear(G, ex, ez);
			if (!inGarden(ex, ez) || D.path < 0.9 || D.water < 0.8 || D.plaza < 1.5 || D.stone < 0.6 || D.struct < 0.4) ok = false;
		}
		for (const q of gr_nearPlants(G, x, z)) {
			const need = q.layer === 'canopy' ? 2.2 : q.layer === 'low' ? 1.3 : q.layer === 'shrub' ? 0.8 : 0.4;
			if (gr_capsule(line, q.x, q.z) < need) ok = false;
		}
		if (!ok) continue;
		const f = { x, z, t: [tx, tz] };
		G.frames.push(f);
		G.struct.add({ ...line, r: 0.35 });
		gr_put(G, 'passion-fruit', x, z, { stage: r() < 0.6 ? 9 : 7, turn: Math.atan2(-tz, tx), scale: between(r, 0.95, 1.05) });
	}
}

/** the bigger river stones of the brook's banks, its bed and the pond's rim, the basin's ring (planned before the
 *  plants, so none stands on one, and the bigger ones cut out of the floor) */
function gr_planRocks(G) {
	const r = chance('forest-dome', 'rocks');
	const B = G.brook;
	G.rocks = [];
	const ford = G.stones.filter((s) => s.ford);
	const near = (x, z, d) => ford.some((s) => Math.hypot(s.x - x, s.z - z) < d) || G.bridges.some((b) => gr_capsule({ ax: b.A[0], az: b.A[1], bx: b.B[0], bz: b.B[1] }, x, z) < d * 0.6);
	const add = (x, z, size, o = {}) => {
		const q = gr_brookQ(x, z);
		const ground = o.bed ? gr_bedY(x, z, 'brook', q) : o.pond ? gr_bedY(x, z, 'pond', q) : gr_hs(x, z);
		const flat = o.flat ?? between(r, 0.42, 0.62);
		const sx = size / 2, sy = (size / 2) * flat, sz = (size / 2) * between(r, 0.6, 0.85);
		const y = ground + sy * between(r, 0.15, 0.4);
		const w = o.w ?? (q ? q.w : gr_POND.w);
		const rock = { x, y, z, sx, sy, sz, ry: r() * TAU, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3, small: size < 0.2, k: Math.floor(r() * 8), wet: y < w + 0.03 };
		G.rocks.push(rock);
		if (size > 0.32) G.holes.add({ ax: x, az: z, bx: x, bz: z, r: Math.min(sx, sz) * 0.75, cls: 'rock' });
		if (size > 0.3) G.struct.add({ ax: x, az: z, bx: x, bz: z, r: Math.max(sx, sz) });
		return rock;
	};
	// along both banks, in loose runs, bigger at the bends' outsides; the basin's ring of them
	for (let s = 0.2; s < B.sPond; s += between(r, 0.22, 0.5)) {
		const i = gr_index(B.S, s);
		const [nx, nz] = gr_normal(B.P, i);
		const hw = B.HW[i];
		for (const sd of [-1, 1]) {
			if (r() > (s < 2.4 ? 0.95 : 0.72)) continue;
			const big = r() < 0.08;
			const size = big ? between(r, 0.42, 0.62) : s < 2.4 ? between(r, 0.24, 0.42) : between(r, 0.13, 0.32);
			const o = hw + (big ? between(r, 0.25, 0.4) : between(r, -0.06, 0.28));
			const x = B.P[i][0] + nx * o * sd, z = B.P[i][1] + nz * o * sd;
			if (near(x, z, 0.9) || gr_dPlaza(x, z) < size / 2 + 0.05) continue;
			add(x, z, size, { bed: true, w: B.W[i] });
		}
	}
	// pebbles in the bed
	for (let s = 1; s < B.sPond; s += between(r, 0.35, 0.8)) {
		const i = gr_index(B.S, s);
		const [nx, nz] = gr_normal(B.P, i);
		const o = between(r, -0.85, 0.85) * B.HW[i];
		const x = B.P[i][0] + nx * o, z = B.P[i][1] + nz * o;
		if (near(x, z, 0.55)) continue;
		add(x, z, between(r, 0.06, 0.17), { bed: true, flat: between(r, 0.4, 0.55), w: B.W[i] });
	}
	// the pond's rim, a gap where the stepping stones come down to it
	const landing = G.stones[G.stones.length - 1];
	const pondStones = G.stones.filter((s) => gr_pondSD(s.x, s.z) < 1);
	for (let a = 0; a < TAU; a += between(r, 0.06, 0.13)) {
		const big = r() < 0.1;
		const size = big ? between(r, 0.42, 0.66) : between(r, 0.14, 0.34);
		const [x, z] = gr_pondAt(a, between(r, -0.08, 0.22) + (big ? 0.12 : 0));
		if (pondStones.some((s) => Math.hypot(s.x - x, s.z - z) < 0.75)) continue;
		const q = gr_brookQ(x, z);
		if (q && q.d < q.hw + 0.25) continue;
		add(x, z, size, { pond: true, w: gr_POND.w });
	}
	void landing;
}

/* ================================================================================================================
 * 5.4 BUILDING — the floor, the water, the stones, the paths, the plaza, the spring, the bridges, the clearing
 * ================================================================================================================ */

/** the floor's colour (multiplying its pictures): mottled, darker under the crowns and damp by the water, dusty at the paths' edges */
function gr_colour(G, x, z, fp) {
	const m = vnoise(x / 3.3 + 70, z / 3.3 + 70, 8192, 8192, 521), m2 = vnoise(x / 1.1 + 70, z / 1.1 + 70, 8192, 8192, 523);
	const c = (0.86 + 0.16 * m + 0.08 * m2) * (1 - 0.24 * gr_shadeAt(G, x, z));
	let r = c, g = c * 0.985, b = c * 0.95;
	const wet = 0.7 * (1 - span(fp.water, 0.1, 1.2)), dust = 0.5 * (1 - span(fp.path, 0, 0.8));
	(r += (0.55 - r) * wet), (g += (0.56 - g) * wet), (b += (0.5 - b) * wet);
	(r += (1.12 - r) * dust), (g += (1.07 - g) * dust), (b += (0.97 - b) * dust);
	return [r, g, b];
}

/**
 * THE FLOOR: a grid of 0.75 m, its cells near anything cut refined (into four along the long lines, sixteen round the
 * small things), every triangle clipped along the cut's zero, so the soil's outline follows a path's edging or a log's
 * side to a centimetre or two; the soil kept, the bare earth under the bridges and along the stepping stones kept in
 * 'gr-bed' (clipped again, along what else lies there), the rest left to what lies over it. The grid's outer ring is
 * pulled onto the knee wall's circle. Inside a cell everything is read off its corners (the floor is smooth there),
 * but the cut's small things, asked at every vertex; normals from the floor's height on the grid, so no seam shows.
 */
function gr_buildFloor(G) {
	const S = gr_STEP, x0 = -gr_TR - S, z0 = -gr_TR - S;
	const nx = Math.ceil((2 * (gr_TR + S)) / S) + 1;
	const nz = Math.ceil((edgeZ(0, 0) + 1.2 - z0) / S) + 1;
	const N = nx * nz;
	const USE = new Uint8Array(N), IN = new Uint8Array(N);
	const H = new Float32Array(N), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
	for (let j = 0, k = 0; j < nz; j++)
		for (let i = 0; i < nx; i++, k++) {
			const x = x0 + i * S, z = z0 + j * S, r = Math.hypot(x, z);
			if (r > gr_TR + 2 * S) continue;
			USE[k] = 1;
			IN[k] = r < gr_TR ? 1 : 0;
			// under the plaza nothing is drawn: its height only steadies the normals at the kerb
			H[k] = gr_dPlaza(x, z) < -1 ? gr_FRONT_Y : gr_hs(x, z);
		}
	for (let j = 0, k = 0; j < nz; j++)
		for (let i = 0; i < nx; i++, k++) {
			if (!USE[k]) continue;
			const h = (q) => (USE[q] ? H[q] : H[k]);
			const gx = (h(i + 1 < nx ? k + 1 : k) - h(i ? k - 1 : k)) / (2 * S), gz = (h(j + 1 < nz ? k + nx : k) - h(j ? k - nx : k)) / (2 * S);
			const l = Math.hypot(gx, 1, gz);
			(NX[k] = -gx / l), (NY[k] = 1 / l), (NZ[k] = -gz / l);
		}
	// the vertices, each once: a node k; a quarter, half or three quarters along its edge east (N + 3k …) or north
	// (4N + 3k …); inside its cell (7N + 9k …); where the cut crosses an edge between two (kept on the lower one)
	const verts = new Array(16 * N);
	let ids = 16 * N;
	/** a vertex: the lines' part of the cut asked here (or `lines`: read off a cell's corners), the rest asked here */
	const make = (key, x, z, y, nxv, nyv, nzv, lines) => {
		const o = lines ?? gr_fieldLines(x, z, {}, 4);
		const lo = o.fo, lk = o.fk;
		gr_fieldRest(x, z, o);
		return (verts[key] = { id: key, x, y: y ?? gr_hs(x, z), z, nx: nxv, ny: nyv, nz: nzv, lo, lk, f: o.f, fo: o.fo, small: o.small, path: o.path, water: o.water, col: null, cuts: null, mark: -1, slot: 0 });
	};
	const corner = (i, j) => {
		const k = j * nx + i;
		const v = verts[k];
		if (v) return v;
		let x = x0 + i * S, z = z0 + j * S;
		if (!IN[k]) {
			const r = Math.hypot(x, z);
			(x *= gr_TR / r), (z *= gr_TR / r);
		}
		return make(k, x, z, IN[k] ? H[k] : null, NX[k], NY[k], NZ[k]);
	};
	const pieces = { soil: new Map(), bed: new Map() };
	const emit = (which, a, b, c) => {
		const key = Math.floor((a.x + b.x + c.x) / 3 / CHUNK) * 1000 + Math.floor((a.z + b.z + c.z) / 3 / CHUNK);
		const m = pieces[which];
		let list = m.get(key);
		if (!list) m.set(key, (list = []));
		list.push(a, b, c);
	};
	/** where the field `fk` ('f' or 'fo') crosses zero between a and b: made once */
	const cut = (a, b, fk) => {
		const [lo, hi] = a.id < b.id ? [a, b] : [b, a];
		const cache = (lo.cuts ??= new Map());
		const key = fk === 'f' ? hi.id : -1 - hi.id;
		let v = cache.get(key);
		if (v) return v;
		const t = fk === 'f' ? a.f / (a.f - b.f) : a.fo / (a.fo - b.fo), s = 1 - t;
		v = { id: ids++, x: a.x * s + b.x * t, y: a.y * s + b.y * t, z: a.z * s + b.z * t, nx: a.nx * s + b.nx * t, ny: a.ny * s + b.ny * t, nz: a.nz * s + b.nz * t, lo: 0, lk: 0, f: fk === 'f' ? 0 : a.f * s + b.f * t, fo: fk === 'fo' ? 0 : a.fo * s + b.fo * t, small: 9, path: a.path * s + b.path * t, water: a.water * s + b.water * t, col: null, cuts: null, mark: -1, slot: 0 };
		cache.set(key, v);
		return v;
	};
	/** a polygon split by field `fk` into its part ≥ 0 and its part < 0 */
	const split = (poly, fk) => {
		const inP = [], outP = [];
		for (let k = 0; k < poly.length; k++) {
			const p = poly[k], q = poly[(k + 1) % poly.length];
			const pi = p[fk] >= 0;
			(pi ? inP : outP).push(p);
			if (pi !== q[fk] >= 0) {
				const m = cut(p, q, fk);
				inP.push(m);
				outP.push(m);
			}
		}
		return [inP, outP];
	};
	const fan = (which, poly) => {
		for (let k = 1; k + 1 < poly.length; k++) emit(which, poly[0], poly[k], poly[k + 1]);
	};
	/** a triangle clipped along the cut: its soil; of the rest, what nothing else lies over (bare earth) */
	const clip = (a, b, c) => {
		const ia = a.f >= 0, ib = b.f >= 0, ic = c.f >= 0;
		if (ia && ib && ic) return emit('soil', a, b, c);
		let rest = [a, b, c];
		if (ia || ib || ic) {
			const [inP, outP] = split(rest, 'f');
			fan('soil', inP);
			rest = outP;
		}
		if (rest.length < 3 || rest.every((v) => v.fo < 0)) return;
		if (rest.every((v) => v.fo >= 0)) return fan('bed', rest);
		fan('bed', split(rest, 'fo')[0]);
	};
	const underBridge = (x, z) => {
		for (const b of G.bridges) if (Math.abs(x - b.hole.ax) < 6 && Math.abs(z - b.hole.az) < 6 && gr_capsule(b.hole, x, z) < b.hole.r + 1) return true;
		return false;
	};
	const sub = new Array(25);
	for (let j = 0; j + 1 < nz; j++)
		for (let i = 0; i + 1 < nx; i++) {
			const k00 = j * nx + i, k10 = k00 + 1, k01 = k00 + nx, k11 = k01 + 1;
			if (!(USE[k00] && USE[k10] && USE[k01] && USE[k11])) continue;
			if (!(IN[k00] || IN[k10] || IN[k01] || IN[k11])) continue;
			if (gr_dPlaza(x0 + i * S + S, z0 + j * S) < -0.9 && gr_dPlaza(x0 + i * S, z0 + j * S) < -0.9) continue;
			const c00 = corner(i, j), c10 = corner(i + 1, j), c01 = corner(i, j + 1), c11 = corner(i + 1, j + 1);
			const lo = Math.min(c00.f, c10.f, c01.f, c11.f), hi = Math.max(c00.f, c10.f, c01.f, c11.f);
			// far from any cut: two triangles of soil; deep in one: nothing (but under a bridge)
			if (lo > 0.55) {
				emit('soil', c00, c01, c10);
				emit('soil', c10, c01, c11);
				continue;
			}
			if (hi < -0.55 && Math.max(c00.fo, c10.fo, c01.fo, c11.fo) < -0.55 && !underBridge((c00.x + c11.x) / 2, (c00.z + c11.z) / 2)) continue;
			// near a cut: smaller cells on the cell's own surface (so its neighbours meet it without a crack), four of
			// 37 cm along the long smooth lines, sixteen of 19 cm round the small things (a stone, a footing, a log)
			// (by a bridge the lines' part changes too sharply to be read off the corners: asked at every vertex)
			const exact = underBridge((c00.x + c11.x) / 2, (c00.z + c11.z) / 2);
			const SUB = exact || Math.min(c00.small, c10.small, c01.small, c11.small) < 0.65 ? 4 : 2;
			// a vertex by its place in quarters of the cell: a halving's middle is a quartering's too
			const Q = 4 / SUB;
			for (let v = 0, q = 0; v <= SUB; v++)
				for (let u = 0; u <= SUB; u++, q++) {
					if ((u === 0 || u === SUB) && (v === 0 || v === SUB)) {
						sub[q] = u ? (v ? c11 : c10) : v ? c01 : c00;
						continue;
					}
					const uq = u * Q, vq = v * Q;
					let key;
					if (v === 0) key = N + 3 * k00 + uq - 1;
					else if (v === SUB) key = N + 3 * k01 + uq - 1;
					else if (u === 0) key = 4 * N + 3 * k00 + vq - 1;
					else if (u === SUB) key = 4 * N + 3 * k10 + vq - 1;
					else key = 7 * N + 9 * k00 + (uq - 1) * 3 + vq - 1;
					let vx = verts[key];
					if (!vx) {
						const fu = u / SUB, fv = v / SUB;
						const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
						vx = make(
							key,
							c00.x * w00 + c10.x * w10 + c01.x * w01 + c11.x * w11,
							c00.z * w00 + c10.z * w10 + c01.z * w01 + c11.z * w11,
							c00.y * w00 + c10.y * w10 + c01.y * w01 + c11.y * w11,
							c00.nx * w00 + c10.nx * w10 + c01.nx * w01 + c11.nx * w11,
							c00.ny * w00 + c10.ny * w10 + c01.ny * w01 + c11.ny * w11,
							c00.nz * w00 + c10.nz * w10 + c01.nz * w01 + c11.nz * w11,
							exact
								? undefined
								: {
										fo: c00.lo * w00 + c10.lo * w10 + c01.lo * w01 + c11.lo * w11,
										fk: c00.lk * w00 + c10.lk * w10 + c01.lk * w01 + c11.lk * w11,
										path: c00.path * w00 + c10.path * w10 + c01.path * w01 + c11.path * w11,
										water: c00.water * w00 + c10.water * w10 + c01.water * w01 + c11.water * w11
									}
						);
					}
					sub[q] = vx;
				}
			for (let v = 0; v < SUB; v++)
				for (let u = 0; u < SUB; u++) {
					const a = sub[v * (SUB + 1) + u], b = sub[v * (SUB + 1) + u + 1], c = sub[(v + 1) * (SUB + 1) + u], d = sub[(v + 1) * (SUB + 1) + u + 1];
					clip(a, c, b);
					clip(b, c, d);
				}
		}
	// the meshes: the soil (the biome's), and the bare earth
	let mark = 0;
	for (const [which, m] of Object.entries(pieces))
		for (const list of m.values()) {
			mark++;
			const used = [];
			for (const v of list) if (v.mark !== mark) (v.mark = mark), (v.slot = used.length), used.push(v);
			const n = used.length;
			const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
			const dim = which === 'bed' ? 0.78 : 1;
			for (let k = 0; k < n; k++) {
				const v = used[k];
				(pos[k * 3] = v.x), (pos[k * 3 + 1] = v.y), (pos[k * 3 + 2] = v.z);
				(nor[k * 3] = v.nx), (nor[k * 3 + 1] = v.ny), (nor[k * 3 + 2] = v.nz);
				(uv[k * 2] = v.x / TILE.soil), (uv[k * 2 + 1] = v.z / TILE.soil);
				const c = (v.col ??= gr_colour(G, v.x, v.z, v));
				(col[k * 3] = c[0] * dim), (col[k * 3 + 1] = c[1] * dim), (col[k * 3 + 2] = c[2] * dim);
			}
			const idx = n > 65535 ? new Uint32Array(list.length) : new Uint16Array(list.length);
			for (let q = 0; q < list.length; q++) idx[q] = list[q].slot;
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
			g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
			g.setAttribute('color', new THREE.BufferAttribute(col, 3));
			g.setIndex(new THREE.BufferAttribute(idx, 1));
			G.bag.add(which === 'soil' ? 'soil' : 'gr-bed', g, null, { colour: true });
		}
}

/** a grid of points [rows][cols] made a mesh: normals across its own rows and columns, cut into pieces of `rows` */
function gr_sheet(G, material, grid, colours, uvTile, o = {}) {
	const nr = grid.length, nc = grid[0].length;
	const normal = (i, j) => {
		const a = grid[Math.min(nr - 1, i + 1)][j], b = grid[Math.max(0, i - 1)][j];
		const c = grid[i][Math.min(nc - 1, j + 1)], d = grid[i][Math.max(0, j - 1)];
		const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
		let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
		if (n[1] < 0) n = n.map((q) => -q);
		const l = Math.hypot(...n) || 1;
		return n.map((q) => q / l);
	};
	const piece = o.piece ?? 48;
	const closed = !!o.closed;
	for (let i0 = 0; i0 < nr - 1; i0 += piece) {
		const i1 = Math.min(nr - 1, i0 + piece);
		const pos = [], nor = [], uv = [], col = [], idx = [];
		for (let i = i0; i <= i1; i++)
			for (let j = 0; j < nc; j++) {
				const p = grid[i][j];
				pos.push(...p);
				nor.push(...(o.normals?.[i]?.[j] ?? normal(i, j)));
				uv.push(p[0] / uvTile, p[2] / uvTile);
				if (colours) col.push(...colours[i][j]);
			}
		const cols = closed ? nc : nc - 1;
		for (let i = 0; i < i1 - i0; i++)
			for (let j = 0; j < cols; j++) {
				const j2 = (j + 1) % nc;
				const a = i * nc + j, b = i * nc + j2, c = (i + 1) * nc + j, d = (i + 1) * nc + j2;
				if (o.flip) idx.push(a, b, c, b, d, c);
				else idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		if (colours) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		G.bag.add(material, g, null, { colour: !!colours });
	}
}

/** the bed's colour: the floor's, damp and dark, darker still under the water */
function gr_bedColour(G, x, z, y, w) {
	const m = vnoise(x / 1.4 + 90, z / 1.4 + 90, 8192, 8192, 531);
	const c = 0.85 + 0.25 * m;
	let col = [c, c * 1.0, c * 0.93];
	if (y < w) col = scalec(col, lerp(0.8, 0.55, clamp((w - y) / 0.35)));
	return col;
}

/** THE BROOK: its bed and banks (a ribbon of 15 across, carved below the water, the banks to the floor's height and
 *  just under the floor's cut edge), and its water a little under the banks */
function gr_buildBrook(G) {
	const B = G.brook;
	const grid = [], colours = [];
	for (let i = 0; i < B.P.length; i++) {
		const [x, z] = B.P[i];
		const [nx, nz] = gr_normal(B.P, i);
		const hw = B.HW[i], a = hw * 1.05;
		const half = [a * 0.38, a * 0.72, a, hw + 0.2, hw + 0.4, hw + 0.5, hw + 0.62, hw + 0.8];
		const offs = [...half.map((o) => -o).reverse(), 0, ...half];
		const row = [], crow = [];
		for (const o of offs) {
			const X = x + nx * o, Z = z + nz * o;
			let y = gr_bedY(X, Z, 'brook', { d: Math.min(Math.abs(o), hw + 0.62), hw, w: B.W[i], D: B.D[i] });
			if (Math.abs(o) > hw + 0.75) y -= 0.07;
			else if (Math.abs(o) > hw + 0.6) y -= 0.03;
			else if (Math.abs(o) > hw + 0.45) y -= 0.01;
			row.push([X, y, Z]);
			crow.push(gr_bedColour(G, X, Z, y, B.W[i]));
		}
		grid.push(row);
		colours.push(crow);
	}
	gr_sheet(G, 'gr-bed', grid, colours, TILE['gr-bed'], { piece: 40, flip: false });
	// the water, from under the kerb to where the pond's begins
	const wgrid = [];
	for (let i = 0; i < B.P.length; i++) {
		const [x, z] = B.P[i];
		if (gr_pondSD(x, z) < 0.18) break;
		const [nx, nz] = gr_normal(B.P, i);
		const o = B.HW[i] * 1.2, y = B.W[i] - 0.004;
		wgrid.push([[x - nx * o, y, z - nz * o], [x, y, z], [x + nx * o, y, z + nz * o]]);
	}
	gr_sheet(G, 'water', wgrid, null, TILE.water, { piece: 60, flip: false, normals: wgrid.map((r) => r.map(() => [0, 1, 0])) });
}

/** THE POND: its bed in rings from the middle out to its banks (just under the floor's cut edge), its water, lilies */
function gr_buildPond(G) {
	const NA = 80;
	const rings = [0.18, 0.4, 0.62, 0.8, 0.92, 0.98];
	const outs = [0, 0.1, 0.22, 0.35, 0.47, 0.58, 0.75];
	const grid = [], colours = [];
	const P0 = [gr_POND.x, 0, gr_POND.z];
	const y0 = gr_bedY(gr_POND.x, gr_POND.z, 'pond');
	const centre = [gr_POND.x, y0, gr_POND.z];
	for (let ri = 0; ri < rings.length + outs.length; ri++) {
		const row = [], crow = [];
		for (let k = 0; k < NA; k++) {
			const phi = (k / NA) * TAU;
			let x, z;
			if (ri < rings.length) {
				const [ox, oz] = gr_pondAt(phi);
				x = lerp(P0[0], ox, rings[ri]);
				z = lerp(P0[2], oz, rings[ri]);
			} else [x, z] = gr_pondAt(phi, outs[ri - rings.length]);
			let y = gr_bedY(x, z, 'pond');
			if (ri === rings.length + outs.length - 1) y -= 0.07;
			else if (ri === rings.length + outs.length - 2) y -= 0.03;
			else if (ri === rings.length + outs.length - 3) y -= 0.01;
			row.push([x, y, z]);
			crow.push(gr_bedColour(G, x, z, y, gr_POND.w));
		}
		grid.push(row);
		colours.push(crow);
	}
	gr_sheet(G, 'gr-bed', grid, colours, TILE['gr-bed'], { piece: 100, closed: true, flip: true });
	// the middle: a fan to the first ring
	{
		const pos = [...centre], col = [...gr_bedColour(G, centre[0], centre[2], centre[1], gr_POND.w)], uv = [centre[0] / TILE['gr-bed'], centre[2] / TILE['gr-bed']], idx = [];
		for (let k = 0; k < NA; k++) {
			pos.push(...grid[0][k]);
			col.push(...colours[0][k]);
			uv.push(grid[0][k][0] / TILE['gr-bed'], grid[0][k][2] / TILE['gr-bed']);
			idx.push(0, 1 + k, 1 + ((k + 1) % NA));
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		if (g.attributes.normal.getY(0) < 0) g.setIndex(idx.map((q, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]]));
		g.computeVertexNormals();
		G.bag.add('gr-bed', g, null, { colour: true });
	}
	// the water: the outline a little into the banks
	const pts = [];
	for (let k = 0; k < 96; k++) {
		const [x, z] = gr_pondAt((k / 96) * TAU, 0.2);
		pts.push([x, -z]);
	}
	const wg = new THREE.ShapeGeometry(shapeOf(pts), 1);
	wg.rotateX(-Math.PI / 2);
	wg.translate(0, gr_POND.w - 0.004, 0);
	G.bag.add('water', wg, null, { uv: 'box', chunk: false });
	// lily pads in two groups, a few flowers
	const r = chance('forest-dome', 'lilies');
	for (const [phi, f, n] of [[0.6, 0.45, 10], [3.9, 0.55, 8]]) {
		const [ox, oz] = gr_pondAt(phi);
		for (let k = 0; k < n; k++) {
			const t = f + (r() - 0.5) * 0.35;
			const x = lerp(gr_POND.x, ox, t) + (r() - 0.5) * 1.1, z = lerp(gr_POND.z, oz, t) + (r() - 0.5) * 1.1;
			if (gr_pondSD(x, z) > -0.45) continue;
			const rad = between(r, 0.13, 0.24);
			const g = new THREE.RingGeometry(0.004, rad, 18, 2, 0.12, TAU - 0.24);
			g.rotateX(-Math.PI / 2);
			const p = g.attributes.position;
			const tone = between(r, 0.8, 1.15);
			const col = [];
			for (let q = 0; q < p.count; q++) {
				const d = Math.hypot(p.getX(q), p.getZ(q)) / rad;
				p.setY(q, 0.01 * d * d);
				const red = d > 0.92 ? 0.25 : 0;
				col.push(...mixc(scalec([0.3, 0.42, 0.18], tone), [0.42, 0.2, 0.15], red));
			}
			g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
			g.computeVertexNormals();
			G.bag.add('gr-lily', g, at(x, gr_POND.w + 0.004, z, r() * TAU), { colour: true });
			if (k % 3 === 1) {
				const fl = lathe([[0, 0], [0.03, 0.012], [0.045, 0.035], [0.05, 0.055], [0.035, 0.06]], 10);
				G.bag.add('gr-bloom', fl, at(x + rad * 0.3, gr_POND.w + 0.01, z, 0, 1));
			}
		}
	}
}

/**
 * THE BATCH — many copies of a few shapes (stones, cobbles, planks, slats, posts) laid by their matrices straight into
 * one list per material and square of the ground: a thousand stones become a few meshes, never a thousand made and merged.
 */
class gr_Batch {
	constructor(bag) {
		this.bag = bag;
		this.groups = new Map();
	}
	/** a copy of `tpl` (position, normal, uv; indexed or not) moved by matrix `m`, in `material` (laid at the flush) */
	add(material, tpl, m) {
		const e = m.elements;
		const key = `${material}|${Math.floor(e[12] / CHUNK)},${Math.floor(e[14] / CHUNK)}`;
		let g = this.groups.get(key);
		if (!g) this.groups.set(key, (g = { material, items: [], verts: 0, tris: 0 }));
		g.items.push(tpl, m);
		g.verts += tpl.attributes.position.count;
		g.tris += tpl.index ? tpl.index.count : tpl.attributes.position.count;
	}
	flush() {
		const nm = new THREE.Matrix3();
		for (const g of this.groups.values()) {
			const pos = new Float32Array(g.verts * 3), nor = new Float32Array(g.verts * 3), uv = new Float32Array(g.verts * 2);
			const idx = g.verts > 65535 ? new Uint32Array(g.tris) : new Uint16Array(g.tris);
			let v = 0, t = 0;
			for (let k = 0; k < g.items.length; k += 2) {
				const tpl = g.items[k], e = g.items[k + 1].elements, n = nm.getNormalMatrix(g.items[k + 1]).elements;
				const P = tpl.attributes.position.array, Nn = tpl.attributes.normal.array, U = tpl.attributes.uv.array;
				const count = P.length / 3;
				for (let i = 0, j = v * 3; i < P.length; i += 3, j += 3) {
					const x = P[i], y = P[i + 1], z = P[i + 2];
					pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12];
					pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
					pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
					const a = Nn[i], b = Nn[i + 1], c = Nn[i + 2];
					const nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c;
					const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
					(nor[j] = nx / l), (nor[j + 1] = ny / l), (nor[j + 2] = nz / l);
				}
				uv.set(U, v * 2);
				if (tpl.index) {
					const I = tpl.index.array;
					for (let i = 0; i < I.length; i++) idx[t + i] = v + I[i];
					t += I.length;
				} else {
					for (let i = 0; i < count; i++) idx[t + i] = v + i;
					t += count;
				}
				v += count;
			}
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
			geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
			geo.setIndex(new THREE.BufferAttribute(idx, 1));
			this.bag.add(g.material, geo);
		}
		this.groups.clear();
	}
}
/** a shape made once and kept, its UVs laid by box in metres over its material's tile (timber: its grain along x) */
function gr_tpl(G, material, key, make) {
	const k = `${material}:${key}`;
	let g = G.tpls.get(k);
	if (!g) G.tpls.set(k, (g = gr_mergeVertices(boxUV(make(), TILE[material] ?? 1))));
	return g;
}
/** a rounded box w × h × d (its grain along x) laid by a matrix */
function gr_box(G, material, w, h, d, r, m) {
	G.batch.add(material, gr_tpl(G, material, `rb${w.toFixed(3)}x${h.toFixed(3)}x${d.toFixed(3)}r${r}`, () => rbox(w, h, d, r, 1)), m);
}

/** the river stones: a few shapes (round-ish, noisy, squashed; never facetted), each laid many times */
function gr_stoneProto(seed, ws, hs, flat) {
	const r = chance('gr-stone', seed);
	const waves = Array.from({ length: 5 }, () => {
		const a = r() * TAU, b = Math.acos(2 * r() - 1);
		return { d: [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)], f: between(r, 0.8, 2.6), p: r() * TAU, a: between(r, 0.04, 0.1) };
	});
	// a sphere of rings, each vertex once (no seam), pushed out and in by a few long waves, squashed flatter below (or,
	// for a slab, flattened top and bottom with rounded edges)
	const pos = [], idx = [];
	const vert = (x, y, z) => {
		let k = 1;
		for (const w of waves) k += w.a * Math.sin(w.f * (x * w.d[0] + y * w.d[1] + z * w.d[2]) * 2 + w.p);
		(x *= k), (y *= k), (z *= k);
		if (flat) y = Math.sign(y) * Math.pow(Math.abs(y), 0.42);
		else if (y < -0.4) y = -0.4 + (y + 0.4) * 0.35;
		pos.push(x, y, z);
	};
	vert(0, 1, 0);
	for (let j = 1; j < hs; j++) {
		const th = (j / hs) * Math.PI;
		for (let i = 0; i < ws; i++) {
			const ph = (i / ws) * TAU;
			vert(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
		}
	}
	vert(0, -1, 0);
	const bottom = 1 + (hs - 1) * ws;
	for (let i = 0; i < ws; i++) idx.push(0, 1 + ((i + 1) % ws), 1 + i);
	for (let j = 0; j < hs - 2; j++)
		for (let i = 0; i < ws; i++) {
			const a = 1 + j * ws + i, b = 1 + j * ws + ((i + 1) % ws), c = a + ws, d = b + ws;
			idx.push(a, b, c, b, d, c);
		}
	for (let i = 0; i < ws; i++) idx.push(bottom, 1 + (hs - 2) * ws + i, 1 + (hs - 2) * ws + ((i + 1) % ws));
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// UVs by the side each vertex looks to, as if the stone were some 15 cm across (its mottle grows with it)
	const P = g.attributes.position.array, Nn = g.attributes.normal.array, uv = new Float32Array((P.length / 3) * 2);
	const k = 0.15 / TILE.stone;
	for (let i = 0, q = 0; i < P.length; i += 3, q += 2) {
		const ax = Math.abs(Nn[i]), ay = Math.abs(Nn[i + 1]), az = Math.abs(Nn[i + 2]);
		const [u, v] = ay >= ax && ay >= az ? [P[i], P[i + 2]] : ax >= az ? [P[i + 2], P[i + 1]] : [P[i], P[i + 1]];
		(uv[q] = u * k), (uv[q + 1] = v * k);
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	return g;
}
function gr_protos(G) {
	G.protos = {
		round: Array.from({ length: 5 }, (_, k) => gr_stoneProto(`round${k}`, 11, 7, false)),
		small: Array.from({ length: 2 }, (_, k) => gr_stoneProto(`small${k}`, 8, 5, false)),
		cobble: Array.from({ length: 2 }, (_, k) => gr_stoneProto(`cobble${k}`, 7, 5, false)),
		slab: Array.from({ length: 3 }, (_, k) => gr_stoneProto(`slab${k}`, 12, 6, true))
	};
}
/** a stone laid: a shape of its kind, at [x, y, z], half-sizes sx, sy, sz, turned */
function gr_rock(G, kind, k, x, y, z, s, ry, rx = 0, rz = 0, material = 'stone') {
	const list = G.protos[kind];
	G.batch.add(material, list[k % list.length], at(x, y, z, ry, s, rx, rz));
}
function gr_buildRocks(G) {
	for (const k of G.rocks) gr_rock(G, k.small ? 'small' : 'round', k.k, k.x, k.y, k.z, [k.sx, k.sy, k.sz], k.ry, k.rx, k.rz, k.wet ? 'stone-wet' : k.k % 5 < 3 ? 'gr-rock' : 'stone');
	// the stepping stones and the ford's, flat-topped, their tops a little above the ground (or the water)
	for (const s of G.stones) {
		if (s.ford) {
			gr_rock(G, 'slab', s.k, s.x, s.w + 0.06 - 0.13, s.z, [s.a, 0.13, s.b], s.ry, 0, 0, 'stone');
			continue;
		}
		const q = gr_brookQ(s.x, s.z);
		const g = q && q.d < q.hw + 0.62 ? gr_bedY(s.x, s.z, 'brook', q) : gr_pondSD(s.x, s.z) < 0.6 ? gr_bedY(s.x, s.z, 'pond', q) : gr_hs(s.x, s.z);
		gr_rock(G, 'slab', s.k, s.x, g - 0.04, s.z, [s.a, 0.075, s.b], s.ry, 0, 0, 'stone');
	}
}

/**
 * A SWEEP: a profile ([a, b]: a across, to the right of the way; b up; counter-clockwise) carried along points
 * [x, y, z], its UVs in metres along and round it over `tile`; closed round, or with its ends capped.
 */
function gr_sweep(pts, profile, o = {}) {
	const n = pts.length, m = profile.length;
	const tile = o.tile ?? 1;
	const closed = !!o.closed;
	const pos = [], uv = [], idx = [];
	const per = [0];
	for (let j = 1; j <= m; j++) per.push(per[j - 1] + Math.hypot(profile[j % m][0] - profile[j - 1][0], profile[j % m][1] - profile[j - 1][1]));
	const frame = [];
	let along = 0;
	for (let i = 0; i < n; i++) {
		const p = pts[i];
		const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
		let tx = b[0] - a[0], tz = b[2] - a[2];
		const l = Math.hypot(tx, tz) || 1;
		(tx /= l), (tz /= l);
		frame.push([tx, tz]);
		if (i) along += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
		for (let j = 0; j <= m; j++) {
			const [pa, pb] = profile[j % m];
			pos.push(p[0] + tz * pa, p[1] + pb, p[2] - tx * pa);
			uv.push(along / tile, per[j] / tile);
		}
	}
	const rows = closed ? n : n - 1;
	for (let i = 0; i < rows; i++) {
		const i2 = (i + 1) % n;
		for (let j = 0; j < m; j++) {
			const a = i * (m + 1) + j, b = i2 * (m + 1) + j, c = a + 1, d = b + 1;
			idx.push(a, c, b, b, c, d);
		}
	}
	let g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	if (o.caps && !closed) {
		const caps = [];
		for (const [i, sgn] of [[0, -1], [n - 1, 1]]) {
			const p = pts[i], [tx, tz] = frame[i];
			let ca = 0, cb = 0;
			for (const [pa, pb] of profile) (ca += pa / m), (cb += pb / m);
			const cp = [], cu = [], ci = [];
			cp.push(p[0] + tz * ca, p[1] + cb, p[2] - tx * ca);
			cu.push(ca / tile, cb / tile);
			for (const [pa, pb] of profile) {
				cp.push(p[0] + tz * pa, p[1] + pb, p[2] - tx * pa);
				cu.push(pa / tile, pb / tile);
			}
			for (let j = 0; j < m; j++) sgn > 0 ? ci.push(0, 1 + j, 1 + ((j + 1) % m)) : ci.push(0, 1 + ((j + 1) % m), 1 + j);
			const cg = new THREE.BufferGeometry();
			cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
			cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
			cg.setIndex(ci);
			cg.computeVertexNormals();
			caps.push(cg);
		}
		g = mergeGeometries([g, ...caps]);
	}
	return g;
}
/** an edging board's section: 26 mm × 185 mm, 35 mm proud of the gravel, its top edges eased */
const gr_BOARD = [[-0.013, -0.15], [0.013, -0.15], [0.013, 0.027], [0.005, 0.035], [-0.005, 0.035], [-0.013, 0.027]];
/** a rounded rectangle profile w × h, its middle at [a, b] */
const gr_rr = (w, h, r, a = 0, b = 0, seg = 2) => roundRect(w, h, r, seg).map(([x, y]) => [x + a, y + b]);

/** a rounded bar of timber (or stone) between two points, w × d in section */
function gr_beam(G, material, a, b, w, d, r = 0.015) {
	const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
	const len = Math.round(A.distanceTo(B) * 50) / 50;
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
	gr_box(G, material, len, w, d, r, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

/** THE PATHS: gravel, crowned a little, its UVs in metres over the ground; edged with oak boards or river cobbles */
function gr_buildPaths(G) {
	for (const L of G.pathList) {
		const n = L.P.length;
		// the runs of gravel (a bridge breaks one)
		const runs = [];
		let cur = [];
		for (let i = 0; i < n; i++) {
			const inner = G.bridges.some((b) => b.line === L && i > b.i0 && i < b.i1);
			if (inner) {
				if (cur.length > 1) runs.push(cur);
				cur = [];
			} else cur.push(i);
		}
		if (cur.length > 1) runs.push(cur);
		if (L.closed && runs.length === 1) runs[0].push(0);
		for (const run of runs) {
			// light grey-white pea gravel, crowned 3 cm (finer toward its edges, where the crown rounds down), and past its
			// edging a skirt sloping down under the floor's cut edge, so no slit opens between them
			const ACROSS = [-0.5, -0.42, -0.3, -0.15, 0, 0.15, 0.3, 0.42, 0.5];
			const half = L.hw + (L.edge === 'cobble' ? 0.13 : 0.03);
			const grid = [];
			for (const i of run) {
				const [x, z] = L.P[i];
				const [nx, nz] = gr_normal(L.P, i, L.closed);
				const row = [];
				// (the skirt drops steeply under the edging first, so it never runs level with the floor beside it)
				row.push([x - nx * (half + 0.3), L.Y[i] - 0.13, z - nz * (half + 0.3)], [x - nx * (half + 0.04), L.Y[i] - 0.07, z - nz * (half + 0.04)]);
				for (const s of ACROSS) row.push([x + nx * s * 2 * half, L.Y[i] + 0.005 + 0.03 * L.C[i] * (1 - 4 * s * s), z + nz * s * 2 * half]);
				row.push([x + nx * (half + 0.04), L.Y[i] - 0.07, z + nz * (half + 0.04)], [x + nx * (half + 0.3), L.Y[i] - 0.13, z + nz * (half + 0.3)]);
				grid.push(row);
			}
			gr_sheet(G, 'gravel', grid, null, TILE.gravel, { piece: 60, flip: false });
		}
		gr_edging(G, L);
	}
	for (const f of G.fillets) {
		const g = new THREE.CircleGeometry(f.r, 40);
		g.rotateX(-Math.PI / 2);
		G.bag.add('gravel', g, at(f.x, f.y, f.z), { uv: 'box' });
	}
}
/** whether a point by a path's edge is free for its edging: not on another path, a bridge, the steps or the plaza */
function gr_edgeFree(G, L, x, z) {
	if (gr_dPlaza(x, z) < 0.02) return false;
	for (const f of G.fillets) if (Math.hypot(x - f.x, z - f.z) < f.r + 0.03) return false;
	const pl = G.pathIdx.near(x, z, 2);
	for (let q = 0; q < G.pathIdx.n; q++) if (pl[q].line !== L && pl[q].d < pl[q].line.hw + 0.06) return false;
	for (const A of G.lobes) {
		const dx = x - A.x, dz = z - A.z;
		const t = dx * A.t[0] + dz * A.t[1], o = dx * A.n[0] + dz * A.n[1];
		if (o < -0.5 || Math.abs(t) > A.lobe[0] + 0.05) continue;
		if (Math.pow(Math.abs(t) / (A.lobe[0] + 0.05), 3) + Math.pow(Math.max(0, o) / (A.lobe[1] + 0.05), 3) < 1) return false;
	}
	return true;
}
function gr_edging(G, L) {
	const n = L.P.length;
	const r = chance('gr-edging', L.id);
	for (const sd of [1, -1]) {
		const off = L.edge === 'cobble' ? L.hw + 0.075 : L.hw + 0.016;
		// the edge's points and whether each is free
		const E = [];
		for (let i = 0; i < n; i++) {
			const [x, z] = L.P[i];
			const [nx, nz] = gr_normal(L.P, i, L.closed);
			const ex = x + nx * off * sd, ez = z + nz * off * sd;
			const inBridge = G.bridges.some((b) => b.line === L && i >= b.i0 && i <= b.i1);
			E.push({ x: ex, z: ez, y: L.Y[i], ok: !inBridge && gr_edgeFree(G, L, ex, ez), t: [-nz * sd, nx * sd] });
		}
		const order = [...Array(n).keys()];
		if (L.closed) order.push(0);
		// runs of free points
		const runs = [];
		let cur = [];
		for (const i of order) {
			if (E[i].ok) cur.push(E[i]);
			else {
				if (cur.length > 1) runs.push(cur);
				cur = [];
			}
		}
		if (cur.length > 1) runs.push(cur);
		for (const run of runs) {
			if (L.edge === 'cobble') {
				// river cobbles set close along the edge, half sunk
				const S = gr_arc(run.map((p) => [p.x, p.z]));
				for (let s = 0.1; s < S[S.length - 1] - 0.08; ) {
					const len = between(r, 0.17, 0.23);
					const i = gr_index(S, s + len / 2);
					const p = run[i];
					const tx = p.t[0], tz = p.t[1];
					const ry = Math.atan2(-tz, tx) + (r() - 0.5) * 0.3;
					const h = between(r, 0.1, 0.13);
					gr_rock(G, 'cobble', Math.floor(r() * 4), p.x, p.y + 0.055 - h / 2, p.z, [len / 2, h / 2, between(r, 0.055, 0.068)], ry, (r() - 0.5) * 0.15, (r() - 0.5) * 0.15);
					s += len + 0.025;
				}
				continue;
			}
			// oak boards, 2.4 m each, a hair's gap between
			const S = gr_arc(run.map((p) => [p.x, p.z]));
			const total = S[S.length - 1];
			const pieces = Math.max(1, Math.round(total / 2.4));
			for (let k = 0; k < pieces; k++) {
				const s0 = (k / pieces) * total + 0.004, s1 = ((k + 1) / pieces) * total - 0.004;
				const pts = [];
				const at3 = (s) => {
					const i = Math.min(run.length - 2, Math.max(0, gr_index(S, s) - (S[gr_index(S, s)] > s ? 1 : 0)));
					const t = clamp((s - S[i]) / (S[i + 1] - S[i] || 1));
					return [lerp(run[i].x, run[i + 1].x, t), lerp(run[i].y, run[i + 1].y, t), lerp(run[i].z, run[i + 1].z, t)];
				};
				pts.push(at3(s0));
				for (let i = 0; i < run.length; i++) if (S[i] > s0 + 0.05 && S[i] < s1 - 0.05) pts.push([run[i].x, run[i].y, run[i].z]);
				pts.push(at3(s1));
				G.bag.add('gr-board', gr_sweep(pts, gr_BOARD, { tile: TILE['gr-board'], caps: true }));
			}
		}
	}
}

/** THE PLAZA: flags from the kerb to the façade, a hole for the spring's bowl and its rill; the kerb; the steps */
function gr_buildPlaza(G) {
	const xa = meets((x) => edgeZ(0, x) + 0.25, gr_TR), xf = meets((x) => facadeZ(0, x) + 0.1, gr_TR);
	const pts = [];
	for (let x = -xa; x <= xa + 1e-6; x += (2 * xa) / Math.ceil((2 * xa) / 0.5)) {
		const f = gr_edgeFrame(x);
		pts.push([f.x - f.n[0] * 0.25, f.z - f.n[1] * 0.25]);
	}
	const arc = (a0, a1) => {
		const k = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.02));
		for (let q = 1; q < k; q++) pts.push(polar(gr_TR, lerp(a0, a1, q / k)));
	};
	const za = edgeZ(0, xa) + 0.25, zf = facadeZ(0, xf) + 0.1;
	arc(Math.atan2(xa, za), Math.atan2(xf, zf));
	for (let x = xf; x >= -xf - 1e-6; x -= (2 * xf) / Math.ceil((2 * xf) / 0.5)) pts.push([x, facadeZ(0, x) + 0.1]);
	arc(Math.atan2(-xf, zf), Math.atan2(-xa, za));
	// the spring: its bowl and its rill, cut out of the flags
	const sp = gr_spring();
	const hole = [[0.205, sp.zLip + 0.42]];
	const zc = sp.z - Math.sqrt(0.6 * 0.6 - 0.205 * 0.205);
	hole.push([0.205, zc]);
	const a0 = Math.atan2(0.205, zc - sp.z);
	for (let k = 1; k < 24; k++) {
		const a = lerp(a0, -a0, k / 24);
		hole.push([Math.sin(a) * 0.6, sp.z + Math.cos(a) * 0.6]);
	}
	hole.push([-0.205, zc], [-0.205, sp.zLip + 0.42]);
	const shape = shapeOf(pts.map(([x, z]) => [x, -z]), [hole.map(([x, z]) => [x, -z])]);
	const g = new THREE.ShapeGeometry(shape, 1);
	g.rotateX(-Math.PI / 2);
	g.translate(0, gr_PLAZA_Y, 0);
	G.bag.add('gr-flag', g, null, { uv: 'box', chunk: false });
	// the kerb: limestone blocks of about 1.1 m along the curved front, a bullnose on the garden side
	const prof = [[-0.3, -0.55], [0, -0.55]];
	for (let k = 0; k <= 4; k++) {
		const a = (k / 4) * (Math.PI / 2);
		prof.push([-0.045 + 0.045 * Math.cos(a), gr_KERB_Y - 0.045 + 0.045 * Math.sin(a)]);
	}
	for (let k = 0; k <= 2; k++) {
		const a = Math.PI / 2 + (k / 2) * (Math.PI / 2);
		prof.push([-0.288 + 0.012 * Math.cos(a), gr_KERB_Y - 0.012 + 0.012 * Math.sin(a)]);
	}
	const xk = meets((x) => edgeZ(0, x), R - 0.15);
	const line = [];
	for (let x = -xk; x <= xk + 1e-6; x += 0.1) line.push([x, edgeZ(0, x)]);
	const S = gr_arc(line);
	const total = S[S.length - 1];
	const blocks = [];
	let s = 0;
	const r = chance('gr-kerb');
	while (s < total - 0.05) {
		const len = Math.min(total - s, between(r, 0.95, 1.25));
		blocks.push([s, s + len]);
		s += len;
	}
	const sMid = S[gr_index(line.map((p) => p[0]), 0)];
	for (let [s0, s1] of blocks) {
		// the rill's spout stone takes the middle
		const xs0 = line[gr_index(S, s0)][0], xs1 = line[gr_index(S, s1)][0];
		if (xs1 > -0.225 && xs0 < 0.225) {
			if (xs0 < -0.225) s1 = sMid - 0.226;
			else if (xs1 > 0.225) s0 = sMid + 0.226;
			else continue;
		}
		const point = (s) => {
			const i = Math.min(line.length - 2, Math.max(0, gr_index(S, s) - (S[gr_index(S, s)] > s ? 1 : 0)));
			const t = clamp((s - S[i]) / (S[i + 1] - S[i]));
			return [lerp(line[i][0], line[i + 1][0], t), lerp(line[i][1], line[i + 1][1], t)];
		};
		// a block is straight (the curve bows 1.5 mm over its length): one shape for each length, laid along its chord
		const p0 = point(s0 + 0.003), p1 = point(s1 - 0.003);
		const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
		const tpl = gr_tpl(G, 'limestone', 'kerb', () => gr_sweep([[-0.55, 0, 0], [0.55, 0, 0]], prof, { caps: true }));
		G.batch.add('limestone', tpl, at((p0[0] + p1[0]) / 2, 0, (p0[1] + p1[1]) / 2, Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), [len / 1.1, 1, 1]));
	}
	// the mortar in the kerb's joints: a core a little inside its blocks, the length of the kerb (but the spout)
	for (const [xa0, xa1] of [[-xk, -0.23], [0.23, xk]]) {
		const pts = [];
		const k = Math.ceil((xa1 - xa0) / 0.5);
		for (let q = 0; q <= k; q++) {
			const x = lerp(xa0, xa1, q / k);
			pts.push([x, 0, edgeZ(0, x)]);
		}
		G.bag.add('limestone', gr_sweep(pts, [[-0.29, -0.5], [-0.007, -0.5], [-0.007, gr_KERB_Y - 0.01], [-0.29, gr_KERB_Y - 0.01]], { tile: TILE.limestone }), null, { chunk: false });
	}
	// the steps: two rounded limestone slabs below the kerb where each path arrives
	for (const A of G.arrivals) {
		const ry = Math.atan2(-A.n[0], -A.n[1]);
		for (const [j, a, b] of [[1, A.hw + 0.75, 0.5], [2, A.lobe[0], A.lobe[1]]]) {
			const top = gr_KERB_Y - j * gr_RISE, bottom = gr_ARRIVE_Y - 0.22;
			const P = [];
			for (let k = 0; k <= 28; k++) {
				const ph = (k / 28) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph);
				P.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3), b * Math.pow(sn, 2 / 3)]);
			}
			P.push([-a, -0.06], [a, -0.06]);
			const geo = extrude(shapeOf(P), top - bottom - 0.002, 0.018, 3, 28);
			geo.rotateX(-Math.PI / 2);
			geo.translate(0, bottom, 0);
			G.bag.add('limestone', geo, at(A.x, 0, A.z, ry), { uv: 'box' });
		}
	}
	// the aprons inside the gates: a slab of flags, its top the doorway's floor, its edges eased, rounding into the path
	for (const A of G.aprons) {
		const [a, b] = A.lobe;
		const P = [];
		for (let k = 0; k <= 36; k++) {
			const ph = (k / 36) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph);
			P.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3), b * Math.pow(sn, 2 / 3)]);
		}
		P.push([-a, 0.05], [a, 0.05]);
		const geo = extrude(shapeOf(P), 0.12, 0.012, 2, 36);
		geo.rotateX(-Math.PI / 2);
		geo.translate(0, gr_APRON_Y - 0.12, 0);
		G.bag.add('gr-flag', geo, at(A.x, 0, A.z, Math.atan2(-A.n[0], -A.n[1])), { uv: 'box' });
	}
}

/** the spring's measures: its bowl in the plaza, the rill to the kerb, its lip */
function gr_spring() {
	const zEdge = edgeZ(0, 0);
	return { z: zEdge + 1.35, zLip: zEdge - 0.07, zEdge };
}
/** THE SPRING: a round limestone bowl brimming in the plaza, a rill in a stone channel to the kerb, where the water
 *  pours over a lip into the basin below, the brook's head */
function gr_buildSpring(G) {
	const sp = gr_spring();
	// the channel: a U of limestone from the lip into the bowl's notch, its top 2 cm proud of the flags
	const U = [[-0.22, -0.5], [0.22, -0.5], [0.22, 0.14], [0.11, 0.14], [0.11, 0.06], [-0.11, 0.06], [-0.11, 0.14], [-0.22, 0.14]];
	const len = sp.z - 0.5 - sp.zLip;
	const ch = extrude(shapeOf(U), len, 0.008, 2, 4);
	ch.translate(0, 0, sp.zLip);
	G.bag.add('limestone', ch, null, { uv: 'box', chunk: false });
	// the bowl: a lathe with a gap for the channel, a bullnosed rim
	// (its hollow whole, its lip a weir where the rill leaves; its rim broken there for the channel's walls)
	const hollow = [[0.0, -0.06], [0.2, -0.055], [0.36, -0.025], [0.46, 0.05], [0.5, 0.115], [0.52, 0.12]];
	const rim = [[0.5, 0.115], [0.512, 0.134], [0.535, 0.145], [0.585, 0.143], [0.612, 0.13], [0.622, 0.1], [0.622, -0.2]];
	for (const [prof, a0, len] of [[hollow, 0, TAU], [rim, Math.PI + 0.3, TAU - 0.6]]) {
		const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40, a0, len);
		scaleUV(g, (TAU * 0.6) / TILE.limestone, 0.5 / TILE.limestone);
		G.bag.add('limestone', g, at(0, 0, sp.z), { chunk: false });
	}
	// its water, welling up, and the rill's
	const wb = new THREE.CircleGeometry(0.5, 32);
	wb.rotateX(-Math.PI / 2);
	G.bag.add('water', wb, at(0, 0.118, sp.z), { uv: 'box', chunk: false });
	const wr = new THREE.PlaneGeometry(0.22, sp.z - 0.42 - sp.zLip);
	wr.rotateX(-Math.PI / 2);
	G.bag.add('water', wr, at(0, 0.09, (sp.z - 0.42 + sp.zLip) / 2), { uv: 'box', chunk: false });
	// the fall: a sheet curving off the lip down to the basin, seen from both sides
	const yTop = 0.09, yEnd = gr_SPRING_W - 0.01;
	const pos = [], idx = [];
	const K = 10;
	for (let k = 0; k <= K; k++) {
		const t = k / K;
		const z = sp.zLip - 0.01 - 0.26 * t, y = yTop - (yTop - yEnd) * t * t;
		const w = 0.1 + 0.03 * t;
		pos.push(-w, y, z, w, y, z);
	}
	for (let k = 0; k < K; k++) {
		const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
		idx.push(a, c, b, b, c, d, a, b, c, b, d, c);
	}
	const fall = new THREE.BufferGeometry();
	fall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	fall.setIndex(idx);
	fall.computeVertexNormals();
	G.bag.add('water', fall, null, { uv: 'box', chunk: false });
}

/** THE BRIDGES: small arched oak bridges — two curved stringers, planks across, posts, a curved handrail and slats,
 *  limestone sills under their ends, boulders at their corners */
function gr_buildBridges(G) {
	const r = chance('forest-dome', 'bridges');
	for (const b of G.bridges) {
		const { A, L, u, v, yA, yB } = b;
		// the deck's top: level with the gravel's crown at each end, arched up to 20 cm (no steeper than 1 in 6.5)
		const rise = Math.min(0.2, (L * 0.155) / Math.PI);
		const deck = (s) => lerp(yA, yB, clamp(s / L)) + 0.035 + rise * Math.sin(Math.PI * clamp(s / L));
		const P = (s, o, y) => [A[0] + u[0] * s + v[0] * o, y, A[1] + u[1] * s + v[1] * o];
		const ry = Math.atan2(-u[1], u[0]);
		// planks
		// (lying 30 cm onto the gravel at each end, level with it, so the way runs on without a gap or a step)
		const n = Math.round((L + 0.6) / 0.162);
		for (let k = 0; k < n; k++) {
			const s = -0.3 + ((k + 0.5) * (L + 0.6)) / n;
			const slope = (deck(s + 0.05) - deck(s - 0.05)) / 0.1;
			const [x, , z] = P(s, (r() - 0.5) * 0.01, 0);
			// across the deck, its grain along its length, tipped to the arch
			gr_box(G, 'timber', 1.56, 0.045, 0.148, 0.01, at(x, deck(s) - 0.0225, z, ry + Math.PI / 2, 1, -Math.atan(slope)));
		}
		// stringers and rails
		const along = (s0, s1, o, dy, k = 24) => Array.from({ length: k + 1 }, (_, q) => {
			const s = lerp(s0, s1, q / k);
			return P(s, o, deck(s) + dy);
		});
		// under the boards, a sub-deck of planks laid along, a centimetre under their tops: the joints between the
		// boards read as dark grooves and the deck is whole underfoot from end to end
		G.bag.add('timber', gr_sweep(along(-0.3, L + 0.3, 0, 0, 32), [[-0.76, -0.034], [0.76, -0.034], [0.76, -0.012], [-0.76, -0.012]], { tile: TILE.timber, caps: true }));
		for (const sd of [-1, 1]) {
			G.bag.add('timber', gr_sweep(along(-0.3, L + 0.3, sd * 0.68, -0.045), gr_rr(0.09, 0.2, 0.015, 0, -0.1, 1), { tile: TILE.timber, caps: true }));
			G.bag.add('timber', gr_sweep(along(-0.02, L + 0.02, sd * 0.835, 0.98), gr_rr(0.075, 0.05, 0.02, 0, -0.025, 1), { tile: TILE.timber, caps: true }));
			G.bag.add('timber', gr_sweep(along(0.05, L - 0.05, sd * 0.835, 0.1), gr_rr(0.045, 0.05, 0.012, 0, 0, 1), { tile: TILE.timber, caps: true }));
			const posts = [0.06, L / 2, L - 0.06];
			for (const s of posts) {
				const [x, , z] = P(s, sd * 0.835, 0);
				const y0 = deck(s) - 0.22, y1 = deck(s) + 0.975;
				gr_box(G, 'timber', y1 - y0, 0.085, 0.085, 0.015, at(x, (y0 + y1) / 2, z, ry, 1, 0, Math.PI / 2));
			}
			for (let s = 0.16; s < L - 0.1; s += 0.105) {
				if (posts.some((q) => Math.abs(q - s) < 0.08)) continue;
				const [x, , z] = P(s, sd * 0.835, 0);
				const y0 = deck(s) + 0.125, y1 = deck(s) + 0.955;
				const h = Math.round((y1 - y0) * 100) / 100;
				G.batch.add('timber', gr_tpl(G, 'timber', `slat${h}`, () => box(h, 0.04, 0.02)), at(x, (y0 + y1) / 2, z, ry, 1, 0, Math.PI / 2));
			}
		}
		// sills under the ends, boulders at the corners
		for (const [s, y] of [[0, yA], [L, yB]]) {
			const [x, , z] = P(s, 0, 0);
			gr_box(G, 'limestone', 1.9, 0.38, 0.46, 0.04, at(x, y - 0.2 - 0.19, z, ry + Math.PI / 2));
			for (const sd of [-1, 1]) {
				const [bx, , bz] = P(s + (s ? 0.25 : -0.25), sd * 1.18, 0);
				const size = between(r, 0.5, 0.7);
				gr_rock(G, 'round', Math.floor(r() * 8), bx, gr_hs(bx, bz) + size * 0.12, bz, [size / 2, size * 0.28, size * 0.38], r() * TAU, 0, 0);
			}
		}
	}
}

/** THE CLEARING: the pergola over the loop's north-east (posts on stone footings, curved beams, rafters, knee braces),
 *  the paved circle with its rim, its four curved benches */
function gr_buildClearing(G) {
	const loop = G.paths.loop;
	const n = loop.P.length;
	const H = 2.7;
	// posts, footings, braces
	const ring = (sd, i) => {
		const [x, z] = loop.P[(i + n) % n];
		let [nx, nz] = gr_normal(loop.P, (i + n) % n, true);
		if (nx * (x - gr_LOOP.x) + nz * (z - gr_LOOP.z) < 0) (nx = -nx), (nz = -nz);
		const o = (loop.hw + 0.32) * sd;
		return [x + nx * o, loop.Y[(i + n) % n] + H, z + nz * o, nx, nz];
	};
	const i0 = G.pergola[0].i - 6, i1 = G.pergola[G.pergola.length - 1].i + 6;
	for (const sd of [-1, 1]) {
		const line = [];
		for (let i = i0; i <= i1; i++) line.push(ring(sd, i).slice(0, 3));
		G.bag.add('timber', gr_sweep(line.map(([x, y, z]) => [x, y + 0.12, z]), gr_rr(0.11, 0.24, 0.02), { tile: TILE.timber, caps: true }));
	}
	for (const p of G.pergola) {
		for (const [q, sd] of [[p.inner, -1], [p.outer, 1]]) {
			const base = gr_hs(q.x, q.z);
			const top = ring(sd, p.i)[1];
			const [tx, tz] = gr_normal(loop.P, p.i, true);
			const ry = Math.atan2(tx, tz);
			gr_box(G, 'limestone', 0.28, 0.22, 0.28, 0.03, at(q.x, base, q.z, ry));
			const len = top - base - 0.1;
			gr_box(G, 'timber', 2.6, 0.14, 0.14, 0.02, at(q.x, (top + base + 0.1) / 2, q.z, ry, [len / 2.6, 1, 1], 0, Math.PI / 2));
			// knee braces along the beam, both ways: 45 cm out, 52 cm down
			for (const dir of [-1, 1]) {
				const e = ring(sd, p.i + dir * 2);
				const ex = e[0] - q.x, ez = e[2] - q.z, el = Math.hypot(ex, ez);
				gr_beam(G, 'timber', [q.x, top - 0.53, q.z], [q.x + (ex / el) * 0.45, top - 0.01, q.z + (ez / el) * 0.45], 0.07, 0.07, 0.012);
			}
		}
	}
	// rafters across, every other point of the loop
	for (let i = i0 + 1; i < i1; i += 2) {
		const a = ring(-1, i), b = ring(1, i);
		const ux = b[0] - a[0], uz = b[2] - a[2], l = Math.hypot(ux, uz);
		const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2, y = (a[1] + b[1]) / 2 + 0.24 + 0.075;
		gr_box(G, 'timber', l + 0.8, 0.15, 0.065, 0.02, at(cx, y, cz, Math.atan2(-uz / l, ux / l)));
	}
	// the paved circle and its rim
	{
		const rings = [0, 0.5, 1.1, 1.7, 2.1, 2.5, 2.8, gr_PAD.r - 0.1], NA = 72;
		const pos = [], col = [], uv = [], idx = [];
		for (let q = 0; q < rings.length; q++)
			for (let k = 0; k < (q ? NA : 1); k++) {
				const [dx, dz] = polar(rings[q], (k / NA) * TAU);
				const x = gr_PAD.x + dx, z = gr_PAD.z + dz;
				pos.push(x, gr_PAD.y + 0.05, z);
				uv.push(x / TILE['gr-flag'], z / TILE['gr-flag']);
				const m = vnoise(x / 1.3 + 9, z / 1.3 + 9, 8192, 8192, 551);
				// worn paler where feet go round the middle, darker and mossier toward the rim and under the benches
				const rim = smooth((rings[q] - 1.8) / 1.2);
				const c = (0.84 + 0.2 * m) * (1 - 0.22 * rim);
				col.push(c * (1 - 0.06 * rim), c, c * (1 - 0.12 * rim));
			}
		for (let k = 0; k < NA; k++) idx.push(0, 1 + k, 1 + ((k + 1) % NA));
		for (let q = 1; q + 1 < rings.length; q++)
			for (let k = 0; k < NA; k++) {
				const a = 1 + (q - 1) * NA + k, b = 1 + (q - 1) * NA + ((k + 1) % NA), c = a + NA, d = b + NA;
				idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setIndex(idx);
		G.bag.add('gr-flag', g, null, { colour: true });
	}
	const rim = [];
	for (let k = 0; k < 72; k++) {
		const [x, z] = polar(gr_PAD.r - 0.065, (-k / 72) * TAU);
		rim.push([gr_PAD.x + x, gr_PAD.y - 0.032, gr_PAD.z + z]);
	}
	G.bag.add('limestone', gr_sweep(rim, gr_rr(0.13, 0.2, 0.025, 0, 0, 2), { tile: TILE.limestone, closed: true }));
	// the benches: play's own curved oak bench (bent to 2.2 m, its hollow toward its +z), four round the circle, facing in
	if (typeof THINGS !== 'undefined' && THINGS['bench-oak-curved'])
		for (const deg of gr_BENCHES) {
			const a = (deg * Math.PI) / 180;
			const [x, z] = polar(2.2, a);
			G.dome.place('bench-oak-curved', gr_PAD.x + x, gr_PAD.y + 0.05, gr_PAD.z + z, { turn: a + Math.PI });
		}
}

/** THE LOGS: old trunks lying half sunk, bark round them, their cut ends showing the wood, a broken branch or two */
function gr_buildLogs(G) {
	const r = chance('forest-dome', 'logs');
	for (const log of G.logs) {
		const seg = 12, rings = Math.max(4, Math.ceil(log.len / 0.25));
		const p1 = r() * TAU, p2 = r() * TAU;
		const pos = [], uv = [], idx = [];
		const rad = (u, a) => log.r * (1 - 0.16 * u) * (1 + 0.05 * Math.sin(a * 3 + p1 + u * 5) + 0.035 * Math.sin(a * 5 + p2 - u * 8));
		for (let i = 0; i <= rings; i++) {
			const u = i / rings, x = (u - 0.5) * log.len;
			const sag = 0.03 * Math.sin(u * Math.PI);
			for (let j = 0; j <= seg; j++) {
				const a = Math.PI + (j / seg) * TAU;
				const rr = rad(u, a);
				pos.push(x, Math.cos(a) * rr + sag, Math.sin(a) * rr);
				uv.push((u * log.len) / TILE.bark, ((j / seg) * TAU * log.r) / TILE.bark);
			}
		}
		for (let i = 0; i < rings; i++)
			for (let j = 0; j < seg; j++) {
				const a = i * (seg + 1) + j, b = a + seg + 1, c = a + 1, d = b + 1;
				idx.push(a, c, b, b, c, d);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
		g.setIndex(idx);
		g.computeVertexNormals();
		const y = Math.min(gr_hs(log.ax, log.az), gr_hs(log.bx, log.bz), gr_hs(log.x, log.z)) + log.r * 0.5;
		const m = at(log.x, y, log.z, Math.atan2(-(log.bz - log.az), log.bx - log.ax), 1, 0, Math.atan2(gr_hs(log.bx, log.bz) - gr_hs(log.ax, log.az), log.len) * 0.6);
		G.bag.add('bark', g, m);
		// the cut ends, a little domed, the wood's rings
		for (const [u, sgn] of [[0, -1], [1, 1]]) {
			const rr = log.r * (1 - 0.16 * u) * 0.97;
			const cap = lathe([[0, 0.012], [rr * 0.6, 0.008], [rr, 0]], seg, TILE.timber);
			cap.rotateZ(-sgn * Math.PI / 2);
			cap.translate((u - 0.5) * log.len, 0, 0);
			G.bag.add('timber', cap, m);
		}
		// a broken branch stub
		if (r() < 0.7) {
			const u = between(r, 0.25, 0.75), a = between(r, 0.4, 1.4) * (r() < 0.5 ? 1 : -1);
			const x = (u - 0.5) * log.len, rr = rad(u, a);
			const st = bar([x, Math.cos(a) * rr * 0.8, Math.sin(a) * rr * 0.8], [x + 0.06, Math.cos(a) * (rr + 0.16), Math.sin(a) * (rr + 0.16)], 0.045, 0.028, 8);
			scaleUV(st, 1 / TILE.bark);
			G.bag.add('bark', st, m);
		}
	}
	// the trellises: two bark posts and a pole across, for the passion fruit's wire
	for (const f of G.frames) {
		const y = gr_hs(f.x, f.z);
		const [tx, tz] = f.t;
		const post = (s) => {
			const x = f.x + tx * s, z = f.z + tz * s;
			const g = bar([x, gr_hs(x, z) - 0.3, z], [x + (r() - 0.5) * 0.04, y + 2.12, z + (r() - 0.5) * 0.04], 0.065, 0.052, 10);
			scaleUV(g, 1 / TILE.bark);
			G.bag.add('bark', g);
		};
		post(-1.55);
		post(1.55);
		const pole = bar([f.x - tx * 1.75, y + 1.98, f.z - tz * 1.75], [f.x + tx * 1.75, y + 2.0, f.z + tz * 1.75], 0.048, 0.042, 10);
		scaleUV(pole, 1 / TILE.bark);
		G.bag.add('bark', pole);
	}
}

/* ================================================================================================================
 * 5.5 THE PART — laid out, planted, built
 * ================================================================================================================ */

function groundPart(dome) {
	const bag = dome.bag('ground');
	const G = (gr_G = { dome, bag, batch: new gr_Batch(bag), tpls: new Map(), r: chance('forest-dome', 'forest'), plants: [], canopy: [], ph: new Map(), count: {}, layers: {} });
	G.keep = (dome.keep ?? []).map((k) => (Array.isArray(k) ? { x: k[0], z: k[1], r: k[2] } : k));
	gr_PAD.y = gr_nat0(gr_PAD.x, gr_PAD.z);
	const steps = [
		// laid out: the brook, the paths and their bridges, the stepping stones, what stands, the bigger stones
		[gr_layBrook, gr_layPaths, gr_laySide, gr_planStructures, gr_planRocks],
		// planted: the canopy, bananas by the water, each tree's guild, the climbers, the logs and their mushrooms, the low
		// trees and the shrubs in the gaps, the herbs and the ground along the paths; the gates' views cleared; trellises
		[gr_plantCanopy, gr_shadeGrid, gr_plantBananas, gr_plantGuilds, gr_plantClimbers, gr_plantLogs, gr_plantLow, gr_shadeGrid, gr_plantEdges, gr_clearViews, gr_moreFrames, gr_shadeGrid],
		// built
		[gr_protos, gr_buildFloor, gr_buildBrook, gr_buildPond, gr_buildRocks, gr_buildPaths, gr_buildPlaza, gr_buildSpring, gr_buildBridges, gr_buildClearing, gr_buildLogs]
	];
	for (const step of steps.flat()) step(G);
	G.batch.flush();
	// what the others must keep clear of in the garden: the structures, the logs, the pergola
	for (const c of G.struct.all) if (c.r >= 0.5) dome.keep.push({ x: (c.ax + c.bx) / 2, z: (c.az + c.bz) / 2, r: c.r + Math.hypot(c.bx - c.ax, c.bz - c.az) / 2 });
	gr_G = null;
}
