/* ================================================================================================================
 * 3. SHELL — the geodesic skin: glass in thick white bioceramic frames over the forest, closed panels with triangular
 *    windows over the rooms, the four round-arched stone gates, and the limestone plinth it all stands on
 * ================================================================================================================ */

/**
 * The skin's measures (m). A panel's offsets run along its outward normal from the plane through its three hubs (its
 * chord plane), + outside and − inside; its insets run in from its edges (the lines between its hubs), in that plane.
 */
const sh_M = {
	// a glazed panel's frame member: a rounded section 0.30 wide and 0.42 deep standing 0.10 proud of the chord plane,
	// its ends 0.27 short of the hubs' middles (inside the hub)
	frameW: 0.3,
	frameOut: 0.1,
	frameIn: -0.32,
	frameR: 0.08,
	trim: 0.27,
	// the hub: a rounded node 0.6 across, its profile [r, h] from its inner pole to its outer: domed outside (0.10 proud
	// of the frames), flatter in
	hub: [
		[0, -0.405],
		[0.2, -0.39],
		[0.285, -0.35],
		[0.3, -0.3],
		[0.3, 0.07],
		[0.27, 0.145],
		[0.17, 0.19],
		[0, 0.205]
	],
	// the glass of a glazed panel: 0.02 inside the chord plane, its edge 0.125 in from the hub lines (25 mm in the
	// frame's rebate), held each side by a bead of 22 mm round against the frame
	glass: -0.02,
	glassIn: 0.125,
	bead: 0.022,
	// a closed panel: its outer face, its inner skin (0.32 apart), the seam between panels (28 mm wide, 50 mm deep),
	// the round of its edge, and its corners' (rounded about a point that far in)
	skinOut: 0.05,
	skinIn: -0.27,
	seam: 0.014,
	edge: 0.014,
	corner: 0.085,
	// a window in a closed panel: the white frame round it, the round of its reveal's edges, its corners' round, its
	// glass (in the reveal, 0.15 in from the outer face)
	band: 0.21,
	reveal: 0.055,
	winCorner: 0.17,
	winGlass: -0.1,
	// the relief inside a closed panel: how far its middle folds in, and its edges' thirds
	fold: [0.12, 0.2],
	crease: [0, 0.06]
};

/** small sums of [x, y, z] */
const sh_v = {
	add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
	sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
	mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
	/** a + b·k */
	madd: (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
	dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
	cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
	len: (a) => Math.hypot(a[0], a[1], a[2]),
	dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
	norm: (a) => {
		const l = Math.hypot(a[0], a[1], a[2]) || 1;
		return [a[0] / l, a[1] / l, a[2] / l];
	},
	lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
	/** unit vectors a and b turned between, t of the way */
	slerp: (a, b, t) => {
		const c = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
		const th = Math.acos(c);
		if (th < 1e-5) return a.slice();
		const s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
		return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
	},
	/** a cubic Bézier through p0 … p3 at t */
	bezier: (p0, p1, p2, p3, t) => {
		const s = 1 - t, a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
		return [0, 1, 2].map((i) => p0[i] * a + p1[i] * b + p2[i] * c + p3[i] * d);
	}
};

/* ---- the shell's own mesh: plain arrays by material and square of ground, given to its bag at the end ---- */

class sh_Mesh {
	constructor() {
		this.parts = new Map();
	}
	/** the arrays of material `m` (with a shade per vertex where `colour`) for something standing over [x, z] */
	at(m, x, z, colour = false) {
		const key = `${m}|${colour ? 'c' : ''}|${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
		let p = this.parts.get(key);
		if (!p) this.parts.set(key, (p = { m, colour, pos: [], nor: [], uv: [], col: [], idx: [] }));
		return p;
	}
	/** the arrays under a key (made as `at` makes them) */
	part(key, m, colour) {
		let p = this.parts.get(key);
		if (!p) this.parts.set(key, (p = { m, colour, pos: [], nor: [], uv: [], col: [], idx: [] }));
		return p;
	}
	/** into the bag: one geometry per material and square */
	into(bag) {
		for (const p of this.parts.values()) {
			if (!p.idx.length) continue;
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
			g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
			g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
			if (p.colour) g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3));
			g.setIndex(p.idx);
			bag.add(p.m, g, null, { colour: p.colour });
		}
	}
}
/** a vertex of part p: where, its normal, its uv (in tiles), its shade; its index */
function sh_vert(p, q, n, u, v, c = 1) {
	p.pos.push(q[0], q[1], q[2]);
	p.nor.push(n[0], n[1], n[2]);
	p.uv.push(u, v);
	if (p.colour) p.col.push(c, c, c);
	return p.pos.length / 3 - 1;
}
/** whether triangle a b c of part p is wound against its vertices' normals (null when it has no area) */
function sh_against(p, a, b, c) {
	const P = p.pos, N = p.nor;
	const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
	const e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
	const g = sh_v.cross(e1, e2);
	if (sh_v.len(g) < 1e-10) return null;
	const n = [N[a * 3] + N[b * 3] + N[c * 3], N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]];
	return sh_v.dot(g, n) < 0;
}
/** a strip of quads between two rows of vertices, wound to face as their normals do */
function sh_strip(p, A, B) {
	let flip = null;
	for (let j = 0; j + 1 < A.length && flip === null; j++) flip = sh_against(p, A[j], A[j + 1], B[j + 1]) ?? sh_against(p, A[j], B[j + 1], B[j]);
	for (let j = 0; j + 1 < A.length; j++) {
		if (flip) p.idx.push(A[j], B[j + 1], A[j + 1], A[j], B[j], B[j + 1]);
		else p.idx.push(A[j], A[j + 1], B[j + 1], A[j], B[j + 1], B[j]);
	}
}
/** a fan from vertex `c` round a row of vertices, wound to face as their normals do */
function sh_fan(p, c, A) {
	let flip = null;
	for (let j = 0; j + 1 < A.length && flip === null; j++) flip = sh_against(p, c, A[j], A[j + 1]);
	for (let j = 0; j + 1 < A.length; j++) {
		if (flip) p.idx.push(c, A[j + 1], A[j]);
		else p.idx.push(c, A[j], A[j + 1]);
	}
}
/**
 * A profile swept along a path: each path point {q, a, b, u} lays the profile's x along `a` (times `k`, a mitre's
 * stretch) and its y along `b`; each profile point {x, y, nx, ny, v} its normal from nx, ny. UVs: metres along the path
 * and round the profile, over `tile`.
 */
function sh_sweep(p, path, prof, tile, shade = 1) {
	let prev = null;
	for (const s of path) {
		const k = s.k ?? 1;
		const ids = prof.map((f) =>
			sh_vert(
				p,
				[s.q[0] + s.a[0] * f.x * k + s.b[0] * f.y, s.q[1] + s.a[1] * f.x * k + s.b[1] * f.y, s.q[2] + s.a[2] * f.x * k + s.b[2] * f.y],
				sh_v.norm([s.a[0] * f.nx + s.b[0] * f.ny, s.a[1] * f.nx + s.b[1] * f.ny, s.a[2] * f.nx + s.b[2] * f.ny]),
				s.u / tile,
				f.v / tile,
				shade
			)
		);
		if (prev) sh_strip(p, prev, ids);
		prev = ids;
	}
	return prev;
}
/** a profile's points with their running length `v` (m) */
function sh_measured(pts) {
	let v = 0;
	pts.forEach((q, i) => {
		if (i) v += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y);
		q.v = v;
	});
	return pts;
}
/** a rounded rectangle as a closed profile (x from x0 to x1, y from y0 to y1, corners of radius r, n steps each) */
function sh_roundProfile(x0, x1, y0, y1, r, n = 3) {
	const pts = [];
	const corners = [
		[x1 - r, y0 + r, -90],
		[x1 - r, y1 - r, 0],
		[x0 + r, y1 - r, 90],
		[x0 + r, y0 + r, 180]
	];
	for (const [cx, cy, a0] of corners)
		for (let i = 0; i <= n; i++) {
			const a = ((a0 + (i * 90) / n) * Math.PI) / 180;
			pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
		}
	pts.push({ ...pts[0] });
	return sh_measured(pts);
}

/* ---- the geodesic ---- */

/**
 * THE GEODESIC — a class-I icosahedral sphere of frequency FREQ, a five-fold hub at its top (+y), cut to the triangles
 * whose hubs all stand on or over the ground: `hubs` (on the sphere of radius R, the base ring exactly on y 0), `tris`
 * (three hubs each, counter-clockwise seen from outside), `edges` (by 'a-b', a < b: its hubs and its one or two
 * triangles) and `panels` (each triangle's plane: its corners, middle, normal, incentre and inradius). The sphere is its
 * own mirror image across x = 0, so the dome is too.
 */
function sh_geodesic() {
	const phi = (1 + Math.sqrt(5)) / 2;
	const ico = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
	const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
	// turned round x so the corner (0, 1, φ) stands at the top
	const turn = Math.atan2(phi, 1), c = Math.cos(turn), s = Math.sin(turn);
	const V = ico.map((p) => {
		const n = sh_v.norm(p);
		return [n[0], n[1] * c + n[2] * s, -n[1] * s + n[2] * c];
	});
	const pts = [], seen = new Map(), all = [];
	const id = (p) => {
		const k = p.map((x) => Math.round(x * 1e6)).join(',');
		if (!seen.has(k)) seen.set(k, pts.push(p) - 1);
		return seen.get(k);
	};
	const F = FREQ;
	for (const [a, b, cc] of faces) {
		const g = [];
		for (let i = 0; i <= F; i++) {
			g[i] = [];
			for (let j = 0; j <= F - i; j++) {
				const k = F - i - j;
				g[i][j] = id(sh_v.norm([0, 1, 2].map((d) => (V[a][d] * k + V[b][d] * i + V[cc][d] * j) / F)));
			}
		}
		for (let i = 0; i < F; i++)
			for (let j = 0; j < F - i; j++) {
				all.push([g[i][j], g[i + 1][j], g[i][j + 1]]);
				if (j < F - i - 1) all.push([g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]]);
			}
	}
	const kept = all.filter((t) => t.every((i) => pts[i][1] > -1e-6));
	const used = new Map(), hubs = [];
	for (const t of kept)
		for (const i of t)
			if (!used.has(i)) {
				const p = sh_v.mul(pts[i], R);
				if (Math.abs(p[1]) < 1e-6) p[1] = 0;
				used.set(i, hubs.push(p) - 1);
			}
	const tris = kept.map((t) => {
		const [a, b, cc] = t.map((i) => used.get(i));
		const n = sh_v.cross(sh_v.sub(hubs[b], hubs[a]), sh_v.sub(hubs[cc], hubs[a]));
		return sh_v.dot(n, sh_v.add(hubs[a], sh_v.add(hubs[b], hubs[cc]))) < 0 ? [a, cc, b] : [a, b, cc];
	});
	const edges = new Map();
	const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
	tris.forEach((t, ti) => {
		for (let k = 0; k < 3; k++) {
			const a = t[k], b = t[(k + 1) % 3], e = key(a, b);
			if (!edges.has(e)) edges.set(e, { a: Math.min(a, b), b: Math.max(a, b), tris: [] });
			edges.get(e).tris.push(ti);
		}
	});
	const panels = tris.map((t) => sh_panel(t.map((i) => hubs[i])));
	// the triangles round each hub
	const around = hubs.map(() => []);
	tris.forEach((t, ti) => t.forEach((i) => around[i].push(ti)));
	return { hubs, tris, edges, panels, around, key };
}
/** a triangle's plane: its corners T, middle c, outward normal n, its plane's distance h0 from the dome's middle, its
 *  incentre I and inradius r, its edges' outward normals in its plane (`on[i]`: the edge from corner i to i + 1) */
function sh_panel(T) {
	const n = sh_v.norm(sh_v.cross(sh_v.sub(T[1], T[0]), sh_v.sub(T[2], T[0])));
	const c = sh_v.mul(sh_v.add(T[0], sh_v.add(T[1], T[2])), 1 / 3);
	const la = sh_v.dist(T[1], T[2]), lb = sh_v.dist(T[2], T[0]), lc = sh_v.dist(T[0], T[1]);
	const per = la + lb + lc;
	const I = sh_v.mul(sh_v.add(sh_v.mul(T[0], la), sh_v.add(sh_v.mul(T[1], lb), sh_v.mul(T[2], lc))), 1 / per);
	const area = sh_v.len(sh_v.cross(sh_v.sub(T[1], T[0]), sh_v.sub(T[2], T[0]))) / 2;
	const on = [0, 1, 2].map((i) => sh_v.norm(sh_v.cross(sh_v.sub(T[(i + 1) % 3], T[i]), n)));
	const e1 = sh_v.norm(sh_v.sub(T[1], T[0]));
	return { T, n, c, h0: sh_v.dot(c, n), I, r: (2 * area) / per, on, e1, e2: sh_v.cross(n, e1) };
}
/**
 * A ring round a panel: its outline `inset` in from its edges, in the plane `off` from its chord plane (its corners
 * scaled from the dome's middle, so every panel's ring at the same offset meets its neighbours' exactly), its corners
 * rounded about a point `centre` in from both edges (sharp where centre ≤ inset), m + 1 points a corner: [point,
 * outward direction in the plane] each.
 */
function sh_ring(P, off, inset, centre, m) {
	const k = (P.h0 + off) / P.h0;
	const I = sh_v.mul(P.I, k), r = P.r * k;
	const at = Math.max(centre, inset), rad = at - inset;
	const out = [];
	for (let i = 0; i < 3; i++) {
		const B = sh_v.mul(P.T[i], k);
		const ctr = sh_v.lerp(B, I, at / r);
		const na = P.on[(i + 2) % 3], nb = P.on[i];
		for (let j = 0; j <= m; j++) {
			const d = sh_v.slerp(na, nb, j / m);
			out.push([sh_v.madd(ctr, d, rad), d]);
		}
	}
	return out;
}
/**
 * Rings round a panel, each a row of vertices, joined in strips (a ring marked `brk` starts afresh: a crisp edge).
 * Each ring: {off, inset, centre, a, b, c}: its normal a·(outward in the plane) + b·(the panel's normal), c its shade.
 * UVs: metres round the ring and down the profile. The last ring's vertices back.
 */
function sh_rings(p, P, rings, m, tile) {
	let prev = null, pv = null, v = 0;
	for (const R0 of rings) {
		const pts = sh_ring(P, R0.off, R0.inset, R0.centre, m);
		pts.push(pts[0]);
		if (pv && !R0.brk) v += sh_v.dist(pv[0][0], pts[0][0]);
		const ids = [];
		let u = 0;
		for (let j = 0; j < pts.length; j++) {
			if (j) u += sh_v.dist(pts[j - 1][0], pts[j][0]);
			const [q, o] = pts[j];
			const n = sh_v.norm(sh_v.add(sh_v.mul(o, R0.a), sh_v.mul(P.n, R0.b)));
			ids.push(sh_vert(p, q, n, u / tile, v / tile, R0.c ?? 1));
		}
		if (prev && !R0.brk) sh_strip(p, prev, ids);
		prev = ids;
		pv = pts;
	}
	return prev;
}

/** the rings of a closed panel's outer face, from the seam's floor out at the hub lines to its face (a shade each: the
 *  seam is in shadow) */
function sh_outerRings() {
	const M = sh_M, e = M.edge, o = M.skinOut, floor = 0;
	const rings = [
		{ off: floor, inset: 0, centre: 0, a: 0, b: 1, c: 0.4 },
		{ off: floor, inset: M.seam, centre: M.corner, a: 0, b: 1, c: 0.4 },
		{ off: floor, inset: M.seam, centre: M.corner, a: 1, b: 0, c: 0.45, brk: true },
		{ off: o - e, inset: M.seam, centre: M.corner, a: 1, b: 0, c: 0.68 }
	];
	for (const f of [1, 2, 3]) {
		const a = (f * Math.PI) / 6;
		rings.push({ off: o - e + e * Math.sin(a), inset: M.seam + e * (1 - Math.cos(a)), centre: M.corner, a: Math.cos(a), b: Math.sin(a), c: 0.68 + (0.32 * f) / 3 });
	}
	return rings;
}
const sh_OUTER = sh_outerRings();
/** a window's rings after its outer face: the white band to the opening, the rounded edge, the reveal through the
 *  panel, the rounded edge inside and the white band inside out to the hub lines */
function sh_windowRings() {
	const M = sh_M, o = M.skinOut, i = M.skinIn, rv = M.reveal, b = M.band, wc = b + M.winCorner;
	const rings = [{ off: o, inset: b - rv, centre: wc, a: 0, b: 1, c: 1 }];
	for (const f of [1, 2, 3]) {
		const s = (f * Math.PI) / 6;
		rings.push({ off: o - rv + rv * Math.cos(s), inset: b - rv + rv * Math.sin(s), centre: wc, a: -Math.sin(s), b: Math.cos(s), c: 1 - 0.06 * f });
	}
	rings.push({ off: i + rv, inset: b, centre: wc, a: -1, b: 0, c: 0.86 });
	for (const f of [4, 5, 6]) {
		const s = (f * Math.PI) / 6;
		rings.push({ off: i + rv + rv * Math.cos(s), inset: b - rv + rv * Math.sin(s), centre: wc, a: -Math.sin(s), b: Math.cos(s), c: 0.86 + 0.045 * (f - 3) });
	}
	rings.push({ off: i, inset: 0, centre: 0, a: 0, b: -1, c: 1 });
	return rings;
}

/* ---- which panel is what ---- */

/** a panel over the rooms (behind the ground level's façade, up to the roof's sky garden, or behind the top level's
 *  façade): closed; else glazed */
const sh_isClosed = (c) => c[2] > facadeZ(0, c[0]) - 0.5 && (c[1] < ROOF + 1.5 || c[2] > facadeZ(3, c[0]));

/** the room of level k a point [x, z] is in (the deepest whose front is before it), or none */
function sh_roomAt(k, x, z) {
	let best = null;
	for (const r of ROOMS) {
		if (r.level !== k) continue;
		const f = facadeFrame(k, r.x);
		const dx = x - f.x, dz = z - f.z;
		const along = dx * f.along[0] + dz * f.along[1];
		const depth = -(dx * f.out[0] + dz * f.out[1]);
		if (Math.abs(along) > r.w / 2 - 0.4 || depth < r.d0 + 0.2 || depth > r.d1 + 3) continue;
		if (!best || r.d0 > best.r.d0) best = { r, along };
	}
	return best;
}

/**
 * THE WINDOWS — triangular windows in the closed panels where the rooms are, in Geoship's clusters: a hexagon of the
 * panels round a hub where one fits, else a row of three in a wide room (a lounge), a pair in a suite or a studio, a
 * single triangle in a bath. A panel is a window's when its middle stands 0.9 … 3.4 over a level's floor, it reaches
 * neither into the storey above nor more than a metre below its floor (its panels are 3.4 m high, the storeys 4), it
 * does not lie along the plinth, and the room behind it (2.2 m in from the shell) is one of those. One cluster a room;
 * most of the closed part stays closed. The rooms' floors meet the shell `GAP` short of it: under a window that crosses
 * its floor the building closes that gap with a sill (`dome.shell.windows` names the panels).
 */
function sh_windows(G, kind) {
	const shapes = { lounge: ['hexagon', 'row', 'pair', 'single'], studio: ['pair', 'single'], suite: ['pair', 'single'], bath: ['single'] };
	const cands = new Map();
	G.panels.forEach((P, t) => {
		if (kind[t] !== 'closed') return;
		const ys = P.T.map((q) => q[1]);
		const lo = Math.min(...ys), hi = Math.max(...ys);
		if (ys.filter((y) => y === 0).length > 1) return;
		for (let k = 0; k < LEVELS.length; k++) {
			const L = LEVELS[k];
			// (its top may reach a little further where it is one corner, not an edge)
			const top = L.y + L.h + (ys.filter((y) => y > L.y + L.h).length > 1 ? 0.2 : 0.6);
			if (P.c[1] < L.y || P.c[1] > L.y + 3.6 || lo < L.y - 1.45 || hi > top) continue;
			const h = Math.hypot(P.c[0], P.c[2]);
			const room = sh_roomAt(k, P.c[0] * (1 - 2.2 / h), P.c[2] * (1 - 2.2 / h));
			if (!room || !shapes[room.r.kind]) continue;
			const score = Math.abs(P.c[1] - L.y - 2.1) + Math.max(0, L.y - lo) * 0.8 + Math.abs(room.along) * 0.3;
			if (!cands.has(room.r.id)) cands.set(room.r.id, { room: room.r, level: k, panels: new Map() });
			cands.get(room.r.id).panels.set(t, score);
		}
	});
	const chosen = new Set(), rooms = [];
	for (const { room, level, panels } of cands.values()) {
		const L = LEVELS[level];
		// the clusters of each shape among the room's panels, their middles 0.9 … 3.4 over the floor on the whole
		const found = { hexagon: [], row: [], pair: [], single: [] };
		G.around.forEach((ts) => {
			if (ts.length >= 5 && ts.every((t) => panels.has(t))) found.hexagon.push(ts);
		});
		for (const t of panels.keys()) {
			found.single.push([t]);
			const beside = G.tris[t]
				.map((a, i) => G.edges.get(G.key(a, G.tris[t][(i + 1) % 3])).tris.find((o) => o !== t))
				.filter((o) => o !== undefined && panels.has(o));
			for (const o of beside) if (o > t) found.pair.push([t, o]);
			for (let i = 0; i < beside.length; i++) for (let j = i + 1; j < beside.length; j++) found.row.push([beside[i], t, beside[j]]);
		}
		const fits = (ts) => {
			const y = ts.reduce((a, t) => a + G.panels[t].c[1], 0) / ts.length;
			return y >= L.y + 0.9 && y <= L.y + 3.4;
		};
		const cost = (ts) => ts.reduce((a, t) => a + panels.get(t), 0) / ts.length;
		let pick = null;
		for (const shape of shapes[room.kind]) {
			const ok = found[shape].filter(fits).sort((a, b) => cost(a) - cost(b));
			if (ok.length) {
				pick = ok[0];
				break;
			}
		}
		if (!pick) continue;
		for (const t of pick) chosen.add(t);
		const ys = pick.flatMap((t) => G.panels[t].T.map((q) => q[1]));
		rooms.push({ room: room.id, level, panels: pick, low: +Math.min(...ys).toFixed(2), high: +Math.max(...ys).toFixed(2) });
	}
	return { chosen, rooms };
}

/* ---- the parts of the skin ---- */

/** the profile of a frame member: a rounded rectangle across the strut (x along its side, y out); its corners finer
 *  low down, where a walker sees them near */
const sh_strutProfiles = [3, 2].map((n) => sh_roundProfile(-sh_M.frameW / 2, sh_M.frameW / 2, sh_M.frameIn, sh_M.frameOut, sh_M.frameR, n));

/** a frame member between hubs a and b: the profile swept straight, its ends in the hubs (or `ta`, `tb` short of them;
 *  made with plain sums: there are 1,700 of them) */
function sh_strut(mesh, a, b, ta = sh_M.trim, tb = sh_M.trim) {
	const t = sh_v.norm(sh_v.sub(b, a));
	let n = sh_v.norm(sh_v.add(a, b));
	const s = sh_v.norm(sh_v.cross(t, n));
	n = sh_v.cross(s, t);
	const L = sh_v.dist(a, b);
	const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
	const p = mesh.at('ceramic', mx, mz);
	const prof = sh_strutProfiles[my < 8 ? 0 : 1];
	const k = prof.length, base = p.pos.length / 3;
	for (const along of [ta, L - tb]) {
		const ox = a[0] + t[0] * along, oy = a[1] + t[1] * along, oz = a[2] + t[2] * along;
		for (const f of prof) {
			p.pos.push(ox + s[0] * f.x + n[0] * f.y, oy + s[1] * f.x + n[1] * f.y, oz + s[2] * f.x + n[2] * f.y);
			p.nor.push(s[0] * f.nx + n[0] * f.ny, s[1] * f.nx + n[1] * f.ny, s[2] * f.nx + n[2] * f.ny);
			p.uv.push(along / TILE.ceramic, f.v / TILE.ceramic);
		}
	}
	// the profile runs clockwise round t (s × n = −t): wound so these face out
	for (let j = 0; j + 1 < k; j++) {
		const i0 = base + j, i1 = base + j + 1, i2 = base + k + j + 1, i3 = base + k + j;
		p.idx.push(i0, i2, i1, i0, i3, i2);
	}
}

/** the hub's profile, its normals across it */
const sh_hubProfile = sh_M.hub.map(([r, y], i, h) => {
	if (r === 0) return { r, y, nr: 0, ny: i ? 1 : -1 };
	const [r0, y0] = h[i - 1], [r1, y1] = h[i + 1];
	const l = Math.hypot(y1 - y0, r1 - r0);
	return { r, y, nr: (y1 - y0) / l, ny: -(r1 - r0) / l };
});
/** one hub made round the z axis, `seg` sides: its vertices [x, y, z, nx, ny, nz, u, v] and triangles */
function sh_hubTemplate(seg) {
	const verts = [], idx = [];
	let prev = null, v = 0;
	sh_hubProfile.forEach((f, i) => {
		if (i) v += Math.hypot(f.r - sh_hubProfile[i - 1].r, f.y - sh_hubProfile[i - 1].y);
		const ids = [];
		for (let j = 0; j <= seg; j++) {
			const a = (j / seg) * TAU, c = Math.cos(a), sn = Math.sin(a);
			ids.push(verts.push(f.r * c, f.r * sn, f.y, f.nr * c, f.nr * sn, f.ny, (a * 0.3) / TILE.ceramic, v / TILE.ceramic) / 8 - 1);
		}
		if (prev)
			for (let j = 0; j < seg; j++) {
				// round +z counter-clockwise and up the profile: these face out (none on the poles' single points)
				if (sh_hubProfile[i - 1].r > 0) idx.push(prev[j], prev[j + 1], ids[j + 1]);
				if (f.r > 0) idx.push(prev[j], ids[j + 1], ids[j]);
			}
		prev = ids;
	});
	return { verts, idx };
}
const sh_HUBS = { near: sh_hubTemplate(18), far: sh_hubTemplate(10) };
/** a hub at q: the node turned round the radius through it (more sides low down, where a walker sees it near) */
function sh_hub(mesh, q) {
	const n = sh_v.norm(q);
	const t1 = sh_v.norm(sh_v.cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
	const t2 = sh_v.cross(n, t1);
	const T = q[1] < 9 ? sh_HUBS.near : sh_HUBS.far;
	const p = mesh.at('ceramic', q[0], q[2]);
	const base = p.pos.length / 3, V = T.verts;
	for (let i = 0; i < V.length; i += 8) {
		const x = V[i], y = V[i + 1], z = V[i + 2], nx = V[i + 3], ny = V[i + 4], nz = V[i + 5];
		p.pos.push(q[0] + t1[0] * x + t2[0] * y + n[0] * z, q[1] + t1[1] * x + t2[1] * y + n[1] * z, q[2] + t1[2] * x + t2[2] * y + n[2] * z);
		p.nor.push(t1[0] * nx + t2[0] * ny + n[0] * nz, t1[1] * nx + t2[1] * ny + n[1] * nz, t1[2] * nx + t2[2] * ny + n[2] * nz);
		p.uv.push(V[i + 6], V[i + 7]);
	}
	for (const i of T.idx) p.idx.push(base + i);
}

/** a glazed panel's glass, and its beads against the frame each side (low down, where they can be seen: higher up a
 *  22 mm bead is less than a pixel from anywhere a walker stands) */
function sh_glazing(mesh, P) {
	const M = sh_M;
	const g = mesh.at('glass', P.c[0], P.c[2]);
	const corner = sh_ring(P, M.glass, M.glassIn, 0, 1);
	const ids = [0, 2, 4].map((j) => sh_vert(g, corner[j][0], P.n, 0, 0));
	g.idx.push(ids[0], ids[1], ids[2]);
	if (P.c[1] > 5.5) return;
	const p = mesh.at('ceramic', P.c[0], P.c[2]);
	for (const side of [1, -1]) {
		const rings = [];
		for (const f of [0, 1, 2, 3]) {
			const a = (f * Math.PI) / 6;
			rings.push({ off: M.glass + side * (0.004 + M.bead * Math.cos(a)), inset: M.frameW / 2 + M.bead * Math.sin(a), centre: 0, a: -Math.sin(a), b: side * Math.cos(a) });
		}
		sh_rings(p, P, rings, 1, TILE.ceramic);
	}
}

/** a closed panel's outer skin: a rounded panel a little smaller than its triangle, the seam's shadow line round it */
function sh_closedOuter(mesh, P, tint) {
	const p = mesh.at('ceramic', P.c[0], P.c[2], true);
	const last = sh_rings(p, P, sh_OUTER.map((r) => ({ ...r, c: r.c * tint })), 2, TILE.ceramic);
	const mid = sh_v.madd(P.c, P.n, sh_M.skinOut);
	const o = sh_v.mul(P.T[0], (P.h0 + sh_M.skinOut) / P.h0);
	const pos = (i) => [p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]];
	const uv = (q) => [sh_v.dot(sh_v.sub(q, o), P.e1) / TILE.ceramic, sh_v.dot(sh_v.sub(q, o), P.e2) / TILE.ceramic];
	// the face: a fan from its middle, its UVs laid flat
	const c = sh_vert(p, mid, P.n, ...uv(mid), tint);
	const rim = last.map((i) => sh_vert(p, pos(i), P.n, ...uv(pos(i)), tint));
	sh_fan(p, c, rim);
}

/** a window panel: the outer skin's edge, then its frame, reveal and glass, and the white band round it inside */
function sh_windowPanel(mesh, P) {
	const p = mesh.at('ceramic', P.c[0], P.c[2], true);
	sh_rings(p, P, [...sh_OUTER, ...sh_windowRings()], 3, TILE.ceramic);
	const g = mesh.at('glass', P.c[0], P.c[2]);
	const pane = sh_ring(P, sh_M.winGlass, sh_M.band - 0.012, sh_M.band + sh_M.winCorner, 3);
	const c = sh_vert(g, sh_v.madd(P.c, P.n, sh_M.winGlass), P.n, 0, 0);
	const ids = pane.map(([q]) => sh_vert(g, q, P.n, 0, 0));
	ids.push(ids[0]);
	sh_fan(g, c, ids);
}

/**
 * A closed panel's inner skin, the warm sand relief of the rooms' walls: its triangle in thirds (nine small ones), its
 * middle folded in, the thirds of its edges creased a little where a relief panel is beside it (the same crease both
 * sides), and each small triangle a shallow pyramid of three facets: 27 facets, crisp, that the light rakes across.
 */
function sh_relief(mesh, G, t, kind) {
	const P = G.panels[t], tri = G.tris[t], M = sh_M;
	const k = (P.h0 + M.skinIn) / P.h0;
	const T = P.T.map((q) => sh_v.mul(q, k));
	const r = chance('sh-relief', t);
	const fold = between(r, M.fold[0], M.fold[1]);
	// a crease at the third f of the edge between hubs a and b, seen from the lower hub
	const crease = (ka, kb, wa, wb) => {
		const a = tri[ka], b = tri[kb];
		const e = G.edges.get(G.key(a, b));
		if (e.tris.length < 2 || !e.tris.every((o) => kind[o] === 'closed')) return 0;
		const f = Math.round(((a < b ? wb : wa) / (wa + wb)) * 3);
		return between(chance('sh-crease', e.a, e.b, f), M.crease[0], M.crease[1]);
	};
	// the ten points of the thirds, (i, j, l) in thirds of corners 0, 1, 2
	const pt = new Map();
	for (let i = 0; i <= 3; i++)
		for (let j = 0; j <= 3 - i; j++) {
			const l = 3 - i - j;
			const w = [i, j, l];
			let q = sh_v.mul(sh_v.add(sh_v.mul(T[0], i), sh_v.add(sh_v.mul(T[1], j), sh_v.mul(T[2], l))), 1 / 3);
			const zeros = w.filter((x) => x === 0).length;
			let d = 0;
			if (zeros === 0) {
				d = fold;
				q = sh_v.add(q, sh_v.add(sh_v.mul(P.e1, between(r, -0.18, 0.18)), sh_v.mul(P.e2, between(r, -0.18, 0.18))));
			} else if (zeros === 1) {
				const nz = [0, 1, 2].filter((x) => w[x] > 0);
				d = crease(nz[0], nz[1], w[nz[0]], w[nz[1]]);
			}
			pt.set(`${i},${j}`, sh_v.madd(q, P.n, -d));
		}
	const smalls = [];
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 3 - i; j++) {
			smalls.push([`${i},${j}`, `${i + 1},${j}`, `${i},${j + 1}`]);
			if (j < 2 - i) smalls.push([`${i + 1},${j}`, `${i + 1},${j + 1}`, `${i},${j + 1}`]);
		}
	const p = mesh.at('relief', P.c[0], P.c[2]);
	const o = T[0];
	const uv = (q) => [sh_v.dot(sh_v.sub(q, o), P.e1) / TILE.relief, sh_v.dot(sh_v.sub(q, o), P.e2) / TILE.relief];
	const inward = sh_v.mul(P.n, -1);
	for (const s of smalls) {
		const [a, b, c] = s.map((key) => pt.get(key));
		const size = Math.sqrt(sh_v.len(sh_v.cross(sh_v.sub(b, a), sh_v.sub(c, a))));
		const apex = sh_v.madd(sh_v.mul(sh_v.add(a, sh_v.add(b, c)), 1 / 3), inward, between(r, 0.025, 0.075) * size);
		for (const [x, y] of [[a, b], [b, c], [c, a]]) {
			let n = sh_v.norm(sh_v.cross(sh_v.sub(y, x), sh_v.sub(apex, x)));
			let order = [x, y, apex];
			if (sh_v.dot(n, inward) < 0) (n = sh_v.mul(n, -1)), (order = [y, x, apex]);
			const ids = order.map((q) => sh_vert(p, q, n, ...uv(q)));
			p.idx.push(...ids);
		}
	}
}

/* ---- the gates ---- */

/** a door's frame: its foot on the shell's circle, `out` from the dome, `side` along the shell (to the right seen from
 *  outside), its measures from the plan (doorSize), and a point from (u, y, d) in it and back */
function sh_doorFrame(D) {
	const out = [Math.sin(D.a), 0, Math.cos(D.a)], side = [Math.cos(D.a), 0, -Math.sin(D.a)];
	const O = sh_v.mul(out, R);
	const at = (u, y, d) => [O[0] + side[0] * u + out[0] * d, y, O[2] + side[2] * u + out[2] * d];
	const local = (q) => [(q[0] - O[0]) * side[0] + (q[2] - O[2]) * side[2], q[1], (q[0] - O[0]) * out[0] + (q[2] - O[2]) * out[2]];
	const F = { D, ...doorSize(D), out, side, O, at, local };
	F.opening = sh_opening(F, sh_D.cut);
	return F;
}

/** the gates' stonework and leaves (m; depths `d` out from the shell's foot line, + out of the dome) */
const sh_D = {
	// the stonework: its face (proud of the shell), its back (inside it: 0.95 through the wall), its joints and eased
	// arrises, the keystone prouder and taller
	face: 0.15,
	back: -0.8,
	joint: 0.007,
	arris: 0.012,
	keyProud: 0.04,
	keyRise: 0.08,
	// the jambs: a moulded plinth (as high as the shell's, its face in line with it), three courses of quoins (long and
	// short past the arch's ring), the impost moulding
	plinth: 0.5,
	courses: 3,
	long: 0.2,
	short: -0.1,
	impost: 0.2,
	// the shell is cut round the opening this far into the stone (every cut edge in the masonry)
	cut: 0.2,
	// the leaves: thickness, plank width, how far open (into the dome); the fanlight's plane in the reveal
	leaf: 0.08,
	plank: 0.16,
	open: (75 * Math.PI) / 180,
	fanlight: 0.12,
	// the threshold's top and the landing inside
	floorTop: 0.03,
	landing: 2.5
};
/** how many voussoirs round a gate's arch (odd: a keystone at the top) */
const sh_voussoirs = (F) => (F.r < 1.6 ? 13 : 17);
/** how far the stone reaches out from the opening's edge at its jambs: the short quoins, and the most (the impost) */
const sh_jambReach = (F) => ({ least: F.ring + sh_D.short, most: F.ring + sh_D.long + 0.05 });

// the gates' woodwork: oiled oak gone dark and weathered (the oak's own pictures, tinted)
material('sh-gate-oak', TILE.oak, () => {
	mat('oak');
	const s = SHARED.oak;
	return new THREE.MeshPhysicalMaterial({ color: '#7a6754', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, clearcoat: 0.04, clearcoatRoughness: 0.7, normalScale: new THREE.Vector2(0.9, 0.9) });
});

/**
 * A gate's opening, grown `g` into its stone, as a convex outline in its (u, y): straight jambs, a round head, open far
 * below the ground; its edges as half planes with the opening on their inner side.
 */
function sh_opening(F, g) {
	const pts = [[F.hw + g, -5], [F.hw + g, F.spring]];
	for (let i = 1; i < 18; i++) {
		const a = (i / 18) * Math.PI;
		pts.push([(F.r + g) * Math.cos(a), F.spring + (F.r + g) * Math.sin(a)]);
	}
	pts.push([-(F.hw + g), F.spring], [-(F.hw + g), -5]);
	const H = pts.map(([ax, ay], i) => {
		const [bx, by] = pts[(i + 1) % pts.length];
		const nx = ay - by, ny = bx - ax;
		return { nx, ny, c: nx * ax + ny * ay };
	});
	return { H, u: F.hw + g, top: F.spring + F.r + g };
}
/** whether a point [u, y] of a gate's face is in its stonework (the plinths, the long and short quoins, the impost,
 *  the voussoirs) */
function sh_inStone(F, u, y) {
	const D = sh_D, a = Math.abs(u), reach = sh_jambReach(F);
	if (y > F.spring) {
		const rr = Math.hypot(u, y - F.spring);
		return rr >= F.r && rr <= F.r + F.ring;
	}
	if (a < F.hw - 0.03) return false;
	if (y < D.plinth || y > F.spring - D.impost) return a <= F.hw + reach.most;
	const c = Math.floor((y - D.plinth) / ((F.spring - D.impost - D.plinth) / D.courses));
	return a <= F.hw + F.ring + (c % 2 ? D.short : D.long);
}
/** which gate (if any) a set of points on the shell stands near: its opening (and a margin) over them */
function sh_nearGate(doors, pts, margin = 0.4) {
	for (const F of doors) {
		if (!pts.every((q) => sh_v.dot(q, F.out) > R * 0.8)) continue;
		const L = pts.map((q) => F.local(q));
		const u0 = Math.min(...L.map((q) => q[0])), u1 = Math.max(...L.map((q) => q[0])), y0 = Math.min(...L.map((q) => q[1]));
		if (u1 > -F.opening.u - margin && u0 < F.opening.u + margin && y0 < F.opening.top + margin) return F;
	}
	return null;
}

/**
 * The shell cut round a gate: every triangle of a part (frames, hubs, glass, beads, closed panels, relief) that the
 * opening (grown into the stone) takes a bite of, cut along its outline, exactly: what is left of each triangle, in
 * convex pieces (its corners' normals, UVs and shades carried along), into the part `dst`. Every cut edge lies inside
 * the stone ring, so the shell closes on the masonry with no collar.
 */
function sh_clip(src, dst, F) {
	const H = F.opening.H, P = src.pos, N = src.nor, U = src.uv, C = src.col, I = src.idx;
	const nv = P.length / 3;
	// each corner's place in the gate's face, and where it went in dst (a triangle kept whole keeps its corners shared)
	const lu = new Float64Array(nv), ly = new Float64Array(nv), to = new Int32Array(nv).fill(-1);
	for (let i = 0; i < nv; i++) {
		lu[i] = (P[i * 3] - F.O[0]) * F.side[0] + (P[i * 3 + 2] - F.O[2]) * F.side[2];
		ly[i] = P[i * 3 + 1];
	}
	const keep = (i) => {
		if (to[i] < 0) to[i] = sh_vert(dst, [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], U[i * 2], U[i * 2 + 1], src.colour ? C[i * 3] : 1);
		return to[i];
	};
	const corner = (i) => ({ q: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], uv: [U[i * 2], U[i * 2 + 1]], c: src.colour ? C[i * 3] : 1, u: lu[i], y: ly[i] });
	const mix = (a, b, t) => ({ q: sh_v.lerp(a.q, b.q, t), n: sh_v.norm(sh_v.lerp(a.n, b.n, t)), uv: [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t], c: a.c + (b.c - a.c) * t, u: a.u + (b.u - a.u) * t, y: a.y + (b.y - a.y) * t });
	// the part of a convex polygon on one side of a half plane (inside: s ≥ 0)
	const cut = (poly, s, inside) => {
		const out = [];
		for (let k = 0; k < poly.length; k++) {
			const k1 = (k + 1) % poly.length, sa = inside ? s[k] : -s[k], sb = inside ? s[k1] : -s[k1];
			if (sa >= 0) out.push(poly[k]);
			if ((sa >= 0) !== (sb >= 0)) out.push(mix(poly[k], poly[k1], sa / (sa - sb)));
		}
		return out;
	};
	const emit = (poly) => {
		if (poly.length < 3) return;
		const ids = poly.map((v) => sh_vert(dst, v.q, v.n, v.uv[0], v.uv[1], v.c));
		for (let k = 1; k + 1 < ids.length; k++) dst.idx.push(ids[0], ids[k], ids[k + 1]);
	};
	for (let t = 0; t < I.length; t += 3) {
		const a = I[t], b = I[t + 1], c = I[t + 2];
		// wholly outside one of the opening's edges: kept whole
		let whole = false;
		for (const h of H) {
			if (h.nx * lu[a] + h.ny * ly[a] < h.c && h.nx * lu[b] + h.ny * ly[b] < h.c && h.nx * lu[c] + h.ny * ly[c] < h.c) {
				whole = true;
				break;
			}
		}
		if (whole) {
			dst.idx.push(keep(a), keep(b), keep(c));
			continue;
		}
		let poly = [corner(a), corner(b), corner(c)];
		for (const h of H) {
			const s = poly.map((v) => h.nx * v.u + h.ny * v.y - h.c);
			if (s.every((x) => x >= 0)) continue;
			emit(cut(poly, s, false));
			poly = cut(poly, s, true);
			if (poly.length < 3) break;
		}
	}
}

/** the geometry of one part of a mesh (its arrays as attributes) */
function sh_geometry(p) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
	if (p.colour) g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3));
	g.setIndex(p.idx);
	return g;
}
/** a dressed stone: a shape in the gate's face (u, y) cut `depth` deep from `back`, its arrises eased, its picture laid
 *  at its own place in the stone (so no two stones show the same grain), shaded a little its own */
function sh_stone(shape, back, depth, key, shade = 1) {
	const g = extrude(shape, depth, sh_D.arris, 1, 6);
	g.translate(0, 0, back);
	const r = chance('sh-stone', key);
	const du = r() * 7, dv = r() * 7;
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TILE.limestone + du, uv.getY(i) / TILE.limestone + dv);
	const c = plain(g, true);
	c.attributes.color.array.fill(shade * between(r, 0.93, 1.04));
	return c;
}

/**
 * A GATE — Samuel's round-arched Tor, in the arcade's dressed limestone: two jambs of coursed quoins (long and short in
 * turn) on moulded plinths, an impost moulding at the spring, the voussoirs round the semicircle with a proud keystone,
 * mortar in the joints (6–8 mm, set back), all 0.95 m through the wall, a threshold and a landing inside; in the arch a
 * glazed oak fanlight (a transom at the spring, a half-round sun and radiating bars); below it two heavy oak gate leaves
 * standing open into the dome. Made once a size in the gate's own frame (x along the shell, y up, z out of the dome),
 * merged by material.
 */
function sh_gateParts(F, made) {
	const key = `${F.w}|${F.spring}|${F.ring}`;
	if (made.has(key)) return made.get(key);
	const D = sh_D;
	const parts = { stone: [], oak: [], glass: [], bronze: [] };
	const j = D.joint / 2 + D.arris;
	const depth = D.face - D.back;
	const hw = F.hw, sp = F.spring, r = F.r, re = F.r + F.ring;
	// the plinths and the impost mouldings: a section (y, d) run along u, their arrises eased
	const run = (section, u0, u1, k) => {
		const g = sh_stone(shapeOf(section), 0, Math.abs(u1 - u0) - 2 * j, k);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)).setPosition(Math.min(u0, u1) + j, 0, 0);
		parts.stone.push(g.applyMatrix4(m));
	};
	const fd = D.face, bd = D.back;
	const reach = sh_jambReach(F);
	for (const s of [1, -1]) {
		const u0 = s * (hw - 0.03), u1 = s * (hw + reach.most + 0.03);
		// the plinth: its face in line with the shell's plinth, a splayed top
		run([[-0.15, bd - 0.05], [-0.15, fd + 0.11], [D.plinth - 0.09, fd + 0.11], [D.plinth - j, fd + 0.04], [D.plinth - j, bd - 0.05]], u0 - s * 0.02, u1 + s * 0.02, `plinth${s}`);
		// the impost: a band under the arch, its underside splayed back to the jamb
		run([[sp - D.impost + j, fd - 0.01], [sp - 0.07, fd + 0.055], [sp - j, fd + 0.055], [sp - j, bd - 0.03], [sp - D.impost + j, bd - 0.03]], u0, s * (hw + reach.most), `impost${s}`);
		// the quoins between: long and short in turn
		const y0 = D.plinth, y1 = sp - D.impost, h = (y1 - y0) / D.courses;
		for (let c = 0; c < D.courses; c++) {
			const wq = F.ring + (c % 2 ? D.short : D.long);
			const a = s * (hw + j), b = s * (hw + wq - j);
			const lo = y0 + c * h + j, hi = y0 + (c + 1) * h - j;
			parts.stone.push(sh_stone(shapeOf([[a, lo], [b, lo], [b, hi], [a, hi]]), bd, depth, `quoin${s}${c}`));
		}
	}
	// the voussoirs: wedges round the semicircle, their joints pointing to its middle; the middle one the keystone
	const n = sh_voussoirs(F);
	for (let k = 0; k < n; k++) {
		const a0 = (k / n) * Math.PI, a1 = ((k + 1) / n) * Math.PI;
		const isKey = k === (n - 1) / 2;
		const ro = re + (isKey ? D.keyRise : 0) - D.arris, ri = r + D.arris;
		const pts = [];
		for (let i = 0; i <= 4; i++) {
			const a = a0 + j / ri + ((a1 - a0 - (2 * j) / ri) * i) / 4;
			pts.push([ri * Math.cos(a), sp + ri * Math.sin(a)]);
		}
		for (let i = 0; i <= 4; i++) {
			const a = a1 - j / ro - ((a1 - a0 - (2 * j) / ro) * i) / 4;
			pts.push([ro * Math.cos(a), sp + ro * Math.sin(a)]);
		}
		parts.stone.push(sh_stone(shapeOf(pts), bd, depth + (isKey ? D.keyProud : 0), `voussoir${k}`));
	}
	// the mortar in the joints, set back from the faces: behind the jambs and round the arch
	const mortar = (shape, k) => parts.stone.push(sh_stone(shape, bd + 0.015, depth - 0.03, k, 0.72));
	for (const s of [1, -1]) mortar(shapeOf([[s * (hw + 0.02), D.plinth - 0.03], [s * (hw + reach.least - 0.02), D.plinth - 0.03], [s * (hw + reach.least - 0.02), sp - D.impost + 0.03], [s * (hw + 0.02), sp - D.impost + 0.03]]), `mortar${s}`);
	const ring = [];
	for (let i = 0; i <= 24; i++) ring.push([(r + 0.02) * Math.cos((i / 24) * Math.PI), sp + (r + 0.02) * Math.sin((i / 24) * Math.PI)]);
	for (let i = 24; i >= 0; i--) ring.push([(re - 0.02) * Math.cos((i / 24) * Math.PI), sp - 0.02 + (re - 0.02) * Math.sin((i / 24) * Math.PI)]);
	mortar(shapeOf(ring), 'mortar-arch');
	// the threshold, a sill through the wall with an eased nosing, and the landing inside under the open leaves
	const slab = (d0, d1, half, k) => {
		const g = sh_stone(shapeOf(roundRect(d1 - d0, half * 2, 0.06, 3)), 0, 0.16, k);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)).setPosition(0, D.floorTop - 0.16, (d0 + d1) / 2);
		parts.stone.push(g.applyMatrix4(m));
	};
	slab(bd - 0.02, fd + 0.38, hw + 0.06, 'threshold');
	slab(bd - 0.02 - D.landing, bd - 0.02 - j, hw + 0.25, 'landing');
	sh_fanlight(F, parts);
	sh_gateLeaves(F, parts);
	const merged = {};
	for (const [m, list] of Object.entries(parts)) merged[m] = mergeGeometries(list);
	made.set(key, merged);
	return merged;
}

/** the fanlight in the arch: an oak transom at the spring, a rim against the soffit, a half-round sun at the middle and
 *  five bars radiating from it, glass behind them; in the reveal near its inner face, over the leaves */
function sh_fanlight(F, parts) {
	const D = sh_D, sp = F.spring, z = D.back + D.fanlight;
	const mesh = new sh_Mesh();
	const p = mesh.at('oak', 0, 0, true);
	const bar = (w, d) => sh_roundProfile(-w / 2, w / 2, -d / 2, d / 2, 0.018, 2);
	const along = (pts, prof) => {
		let u = 0;
		const path = pts.map((q, i) => {
			const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
			const t = sh_v.norm([b[0] - a[0], b[1] - a[1], 0]);
			if (i) u += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
			return { q: [q[0], q[1], z], a: [-t[1], t[0], 0], b: [0, 0, 1], u };
		});
		sh_sweep(p, path, prof, TILE.oak, between(chance('sh-fan', pts.length, pts[0][0]), 0.88, 1));
	};
	// the transom, the rim, the bars
	along([[-F.hw - 0.03, sp], [F.hw + 0.03, sp]], bar(0.15, 0.16));
	const rim = [];
	for (let i = 0; i <= 24; i++) rim.push([(F.r - 0.04) * Math.cos((i / 24) * Math.PI), sp + (F.r - 0.04) * Math.sin((i / 24) * Math.PI)]);
	along(rim, bar(0.12, 0.13));
	const sun = 0.24;
	for (let k = 1; k <= 5; k++) {
		const a = (k / 6) * Math.PI;
		along([[sun * Math.cos(a), sp + sun * Math.sin(a)], [(F.r - 0.08) * Math.cos(a), sp + (F.r - 0.08) * Math.sin(a)]], bar(0.06, 0.09));
	}
	const g = sh_geometry(p);
	parts.oak.push(g);
	// the sun: a half round of oak on the transom
	const half = [];
	for (let i = 0; i <= 12; i++) half.push([sun * Math.cos((i / 12) * Math.PI), sp + sun * Math.sin((i / 12) * Math.PI)]);
	const sunG = plain(extrude(shapeOf(half), 0.12, 0.012, 2, 4).translate(0, 0, z - 0.06), true);
	scaleUV(sunG, 1 / TILE.oak);
	parts.oak.push(sunG);
	// the glass, behind the bars
	const pane = [];
	for (let i = 0; i <= 24; i++) pane.push([(F.r - 0.02) * Math.cos((i / 24) * Math.PI), sp + (F.r - 0.02) * Math.sin((i / 24) * Math.PI)]);
	parts.glass.push(plain(new THREE.ShapeGeometry(shapeOf(pane), 1).translate(0, 0, z - 0.02)));
}

/**
 * The gate's two leaves, up to the transom: each from its hinge (on the stone's back face, the leaf lapping the opening
 * by 5 cm) to the middle; vertical oak planks with V-grooves between (each its own shade), three ledges and two braces
 * inside, bronze strap hinges with studs outside and the ledges' bolts as studs, a ring pull each face, the pintles on
 * the stone. Turned open about the hinges, into the dome.
 */
function sh_gateLeaves(F, parts) {
	const D = sh_D, t = D.leaf, lap = 0.05;
	const W = F.hw + lap - 0.004, foot = 0.035, top = F.spring - 0.075 - 0.006;
	const leaf = { oak: [], bronze: [] };
	const shade = (g, c) => {
		const out = plain(g, true);
		out.attributes.color.array.fill(c);
		return out;
	};
	// the planks, a groove between each
	const np = Math.max(5, Math.round(W / D.plank)), pw = W / np;
	for (let i = 0; i < np; i++) {
		const x0 = i * pw + 0.006, x1 = (i + 1) * pw - 0.006;
		const g = extrude(shapeOf([[x0, foot], [x1, foot], [x1, top], [x0, top]]), t, 0.008, 1, 4);
		g.translate(0, 0, -t / 2);
		const r = chance('sh-plank', F.w, i), du = r() * 3;
		const uv = g.attributes.uv;
		// the grain up the planks
		for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getY(q) / TILE.oak + du, uv.getX(q) / TILE.oak);
		leaf.oak.push(shade(g, between(r, 0.8, 1.06)));
	}
	// the ledges and braces inside (−z), the straps and studs outside (+z)
	const ledges = [0.3, (0.3 + top - 0.3) / 2, top - 0.3];
	for (const y of ledges) leaf.oak.push(shade(boxUV(rbox(W - 0.12, 0.17, 0.045, 0.012, 1), TILE.oak).translate(W / 2, y, -t / 2 - 0.022), 0.9));
	for (let k = 0; k < 2; k++) {
		const ya = ledges[k] + 0.09, yb = ledges[k + 1] - 0.09;
		const dx = W - 0.3, dy = yb - ya, len = Math.hypot(dx, dy);
		const b = boxUV(rbox(len, 0.14, 0.04, 0.012, 1), TILE.oak);
		b.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.atan2(dy, dx)).setPosition(W / 2, (ya + yb) / 2, -t / 2 - 0.02));
		leaf.oak.push(shade(b, 0.92));
	}
	const strapLen = Math.min(1.5, W * 0.78);
	const studs = [];
	for (const y of ledges) {
		leaf.bronze.push(plain(rbox(strapLen, 0.065, 0.012, 0.004, 1).translate(strapLen / 2 - 0.04, y, t / 2 + 0.006)));
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14).rotateX(Math.PI / 2).translate(strapLen - 0.04, y, t / 2 + 0.006)));
		for (let k = 0; k < 5; k++) studs.push([0.12 + (k * (strapLen - 0.16)) / 4, y, t / 2 + 0.012]);
		for (let i = 0; i < np; i++) if ((i + 0.5) * pw > strapLen + 0.05) studs.push([(i + 0.5) * pw, y, t / 2]);
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12).translate(-0.02, y, 0)));
	}
	// the studs: one domed head, laid at each
	const stud = plain(lathe([[0, 0.016], [0.011, 0.012], [0.017, 0.004], [0.018, 0]], 6).rotateX(Math.PI / 2));
	leaf.bronze.push(sh_copies(stud, studs));
	for (const z of [1, -1]) {
		leaf.bronze.push(plain(new THREE.TorusGeometry(0.085, 0.012, 6, 18).translate(W - 0.2, 1.0, z * (t / 2 + 0.03))));
		leaf.bronze.push(plain(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 12).rotateX(Math.PI / 2).translate(W - 0.2, 1.09, z * (t / 2 + 0.015))));
	}
	const oak = mergeGeometries(leaf.oak), bronze = mergeGeometries(leaf.bronze);
	for (const s of [1, -1]) {
		// the hinge, on the stone's back face; its outside (+z, the straps) out of the dome: the right leaf is the left
		// one mirrored
		const hinge = [s * (F.hw + lap), 0, D.back - t / 2 - 0.01];
		const dir = [-s * Math.cos(D.open), 0, -Math.sin(D.open)];
		const zdir = s > 0 ? sh_v.cross([0, 1, 0], dir) : sh_v.cross(dir, [0, 1, 0]);
		const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...dir), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...zdir)).setPosition(...hinge);
		const mo = oak.clone().applyMatrix4(m), mb = bronze.clone().applyMatrix4(m);
		if (s > 0) for (const g of [mo, mb]) sh_rewind(g);
		parts.oak.push(mo);
		parts.bronze.push(mb);
		for (const y of ledges) parts.bronze.push(plain(rbox(0.07, 0.09, 0.06, 0.01, 1).translate(s * (F.hw + lap + 0.03), y, D.back - 0.02)));
	}
}
/** copies of a small indexed geometry, one at each of `at`, as one geometry */
function sh_copies(g, at) {
	const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv.array, I = g.index.array;
	const nv = P.length / 3;
	const pos = new Float32Array(nv * 3 * at.length), nor = new Float32Array(nv * 3 * at.length), uv = new Float32Array(nv * 2 * at.length);
	const idx = new Uint32Array(I.length * at.length);
	at.forEach(([x, y, z], k) => {
		for (let i = 0; i < nv; i++) {
			const o = (k * nv + i) * 3;
			pos[o] = P[i * 3] + x;
			pos[o + 1] = P[i * 3 + 1] + y;
			pos[o + 2] = P[i * 3 + 2] + z;
		}
		nor.set(N, k * nv * 3);
		uv.set(U, k * nv * 2);
		for (let i = 0; i < I.length; i++) idx[k * I.length + i] = I[i] + k * nv;
	});
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
	out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	out.setIndex(new THREE.BufferAttribute(idx, 1));
	return out;
}
/** a geometry mirrored: its triangles wound back the right way */
function sh_rewind(g) {
	const idx = g.index.array;
	for (let i = 0; i < idx.length; i += 3) {
		const t = idx[i + 1];
		idx[i + 1] = idx[i + 2];
		idx[i + 2] = t;
	}
	g.index.needsUpdate = true;
	return g;
}
/** a gate placed in its frame; its landing inside kept clear of plants */
function sh_gate(dome, F, made) {
	const parts = sh_gateParts(F, made);
	const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(...F.side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...F.out)).setPosition(...F.O);
	const bag = dome.bag('shell');
	bag.add('limestone', parts.stone.clone(), M, { colour: true });
	bag.add('sh-gate-oak', parts.oak.clone(), M, { colour: true });
	bag.add('glass', parts.glass.clone(), M);
	bag.add('bronze', parts.bronze.clone(), M);
	const [lx, , lz] = F.at(0, 0, sh_D.back - sh_D.landing / 2);
	dome.keep.push({ x: lx, z: lz, r: F.hw + 1.2, why: `gate ${F.D.id}` });
}

/* ---- the plinth ---- */

/** the plinth's section: [out from the shell's foot line, up], rounded on top, 0.68 wide, 0.5 high */
const sh_plinthProfile = (() => {
	const pts = [{ x: -0.42, y: -0.15, nx: -1, ny: 0 }, { x: -0.42, y: 0.38, nx: -1, ny: 0 }];
	for (const a of [150, 120, 90]) {
		const r = (a * Math.PI) / 180;
		pts.push({ x: -0.3 + 0.12 * Math.cos(r), y: 0.38 + 0.12 * Math.sin(r), nx: Math.cos(r), ny: Math.sin(r) });
	}
	for (const a of [90, 60, 30, 0]) {
		const r = (a * Math.PI) / 180;
		pts.push({ x: 0.14 + 0.12 * Math.cos(r), y: 0.38 + 0.12 * Math.sin(r), nx: Math.cos(r), ny: Math.sin(r) });
	}
	pts.push({ x: 0.26, y: -0.15, nx: 1, ny: 0 });
	return sh_measured(pts);
})();

/** THE PLINTH — limestone along the whole foot of the shell, the panels standing on it; it stops against each gate's
 *  own moulded plinth */
function sh_plinth(mesh, G, doors) {
	const base = G.hubs.filter((q) => q[1] === 0).sort((a, b) => Math.atan2(a[0], a[2]) - Math.atan2(b[0], b[2]));
	const n = base.length;
	const cutAt = (F) => F.hw + sh_jambReach(F).most + 0.035;
	const cut = (q) => doors.some((F) => sh_v.dot(q, F.out) > 0 && Math.abs(F.local(q)[0]) < cutAt(F));
	let k0 = 0;
	while (k0 < n && cut(base[k0])) k0++;
	const runs = [];
	let run = null;
	for (let i = 0; i < n; i++) {
		const a = base[(k0 + i) % n], b = base[(k0 + i + 1) % n];
		const ts = [0, 1];
		for (const F of doors) {
			if (sh_v.dot(a, F.out) <= 0 && sh_v.dot(b, F.out) <= 0) continue;
			const ua = F.local(a)[0], ub = F.local(b)[0];
			for (const c of [cutAt(F), -cutAt(F)]) {
				const t = (c - ua) / (ub - ua);
				if (t > 0 && t < 1) ts.push(t);
			}
		}
		ts.sort((x, y) => x - y);
		for (let k = 0; k + 1 < ts.length; k++) {
			if (cut(sh_v.lerp(a, b, (ts[k] + ts[k + 1]) / 2))) {
				if (run) runs.push(run), (run = null);
				continue;
			}
			if (!run) run = [sh_v.lerp(a, b, ts[k])];
			run.push(sh_v.lerp(a, b, ts[k + 1]));
		}
	}
	if (run) {
		// the last run comes round to the first
		if (runs.length && sh_v.dist(run.at(-1), runs[0][0]) < 1e-6) runs[0] = run.concat(runs[0].slice(1));
		else runs.push(run);
	}
	const up = [0, 1, 0];
	const outOf = (a, b) => {
		const e = sh_v.norm(sh_v.sub(b, a));
		let o = [e[2], 0, -e[0]];
		if (sh_v.dot(o, sh_v.add(a, b)) < 0) o = sh_v.mul(o, -1);
		return o;
	};
	for (const Q of runs) {
		const mid = Q[Math.floor(Q.length / 2)];
		const p = mesh.at('limestone', mid[0], mid[2]);
		const path = [];
		let u = 0;
		for (let i = 0; i < Q.length; i++) {
			if (i) u += sh_v.dist(Q[i], Q[i - 1]);
			const o1 = i > 0 ? outOf(Q[i - 1], Q[i]) : null, o2 = i < Q.length - 1 ? outOf(Q[i], Q[i + 1]) : null;
			const a = sh_v.norm(sh_v.add(o1 ?? o2, o2 ?? o1));
			path.push({ q: Q[i], a, b: up, k: 1 / sh_v.dot(a, o1 ?? o2), u });
		}
		sh_sweep(p, path, sh_plinthProfile, TILE.limestone);
		// its ends (against the gates' plinths): the section, closed
		for (const [i, j] of [[0, 1], [Q.length - 1, Q.length - 2]]) {
			const d = sh_v.norm(sh_v.sub(Q[i], Q[j]));
			const o = outOf(Q[Math.min(i, j)], Q[Math.max(i, j)]);
			const ring = sh_plinthProfile.map((f) => sh_vert(p, sh_v.add(sh_v.mul(o, f.x), sh_v.madd(Q[i], up, f.y)), d, (f.x + sh_v.dot(Q[i], sh_v.cross(up, d))) / TILE.limestone, f.y / TILE.limestone));
			const c = sh_vert(p, sh_v.madd(sh_v.madd(Q[i], o, -0.08), up, 0.15), d, 0, 0);
			sh_fan(p, c, [...ring, ring[0]]);
		}
	}
	return runs.length;
}

/* ---- the shell ---- */

/**
 * THE SHELL — the geodesic skin of the dome. The panels over the rooms are closed (white bioceramic outside, its seams
 * shadow lines; the warm sand relief inside, two skins 0.32 apart), some of them triangular windows in deep white
 * reveals where the rooms look out; every other panel is glass in a thick white frame, the hubs white rounded nodes.
 * Four round-arched stone gates go through it: the panels, frames and hubs round each are cut along the opening inside
 * the stone ring (a hub the stone covers is left out, its frames run into the stone). The plinth runs round the foot.
 * Everything into the bag 'shell'; what the other parts may want to know as `dome.shell`.
 */
function shellPart(dome) {
	const G = sh_geodesic();
	const kind = G.panels.map((P) => (sh_isClosed(P.c) ? 'closed' : 'glazed'));
	const doors = DOORS.map((D) => sh_doorFrame(D));
	// the windows, where the rooms are
	const win = sh_windows(G, kind);
	for (const t of win.chosen) kind[t] = 'window';
	// what stands near a gate is made apart and cut round its opening
	const mesh = new sh_Mesh();
	const near = new Map(doors.map((F) => [F, new sh_Mesh()]));
	const into = (pts) => {
		const F = sh_nearGate(doors, pts);
		return F ? near.get(F) : mesh;
	};
	// the hubs: every hub beside glass (but in the plinth, or in a gate's stone)
	const inStone = G.hubs.map((q) => doors.some((F) => sh_v.dot(q, F.out) > R * 0.8 && sh_inStone(F, F.local(q)[0], q[1])));
	G.hubs.forEach((q, h) => {
		if (q[1] < 0.2 || inStone[h] || !G.around[h].some((t) => kind[t] === 'glazed')) return;
		sh_hub(into([q]), q);
	});
	// the frames: every edge beside glass (running into the stone where its hub is left out)
	for (const e of G.edges.values()) {
		if (!e.tris.some((t) => kind[t] === 'glazed')) continue;
		const a = G.hubs[e.a], b = G.hubs[e.b];
		if (a[1] === 0 && b[1] === 0) continue;
		sh_strut(into([a, b]), a, b, inStone[e.a] ? 0 : sh_M.trim, inStone[e.b] ? 0 : sh_M.trim);
	}
	// the panels
	let cutPanels = 0;
	G.panels.forEach((P, t) => {
		const m = into(P.T);
		if (m !== mesh) cutPanels++;
		if (kind[t] === 'glazed') sh_glazing(m, P);
		else if (kind[t] === 'closed') {
			sh_closedOuter(m, P, between(chance('sh-tint', t), 0.975, 1));
			sh_relief(m, G, t, kind);
		} else if (kind[t] === 'window') sh_windowPanel(m, P);
	});
	for (const [F, m] of near) for (const [k, p] of m.parts) sh_clip(p, mesh.part(k, p.m, p.colour), F);
	const runs = sh_plinth(mesh, G, doors);
	mesh.into(dome.bag('shell'));
	// the gates' stone, fanlights and leaves
	const made = new Map();
	for (const F of doors) sh_gate(dome, F, made);
	const count = (k) => kind.filter((x) => x === k).length;
	dome.shell = {
		panels: { glazed: count('glazed'), closed: count('closed'), window: count('window'), cutRoundGates: cutPanels },
		windows: win.rooms,
		gates: doors.map((F) => ({ id: F.D.id, a: F.D.a, w: F.w, spring: F.spring, top: F.top, ring: F.ring, face: sh_D.face, back: sh_D.back, landing: [sh_D.back - sh_D.landing, sh_D.back] })),
		plinthRuns: runs,
		hubs: G.hubs.length,
		struts: G.edges.size
	};
}
