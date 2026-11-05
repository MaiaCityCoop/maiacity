/* ================================================================================================================
 * 6. BUILDING — the north quarter: its slabs and indoor terraces, the curved glass façades, the rooms' walls and
 *    doors, the two spiral stairs, the grand stair up the terraces and the sky garden on the roof
 * ================================================================================================================ */

const { toCreasedNormals: bd_creased } = require('three/addons/utils/BufferGeometryUtils.js');

/**
 * the shell's inner face (the shell is R − 0.4 … R: its closed panels' inner skin at R − 0.27, their relief folding in
 * to R − 0.47) and how far what meets it runs in: to the skin, so it butts the relief and never shows through a
 * window's reveal; the joints of a slab with the shell a little further, behind the skin (bd_DEEP)
 */
const bd_IN = R - 0.4;
const bd_SINK = 0.13;
const bd_DEEP = 0.2;
/** the plan radius of the shell's inner face at height y (sunk into by e), and its height over a plan radius r */
const bd_inR = (y, e = bd_SINK) => Math.sqrt(Math.max(0, (bd_IN + e) ** 2 - y * y));
const bd_inY = (r, e = bd_SINK) => Math.sqrt(Math.max(0, (bd_IN + e) ** 2 - r * r));
/** level k's floor and ceiling; level 4 is the roof, the sky garden's deck */
const bd_floor = (k) => (k === 0 ? 0.12 : k < 4 ? LEVELS[k].y : ROOF);
const bd_ceil = (k) => (k < 3 ? LEVELS[k + 1].y : ROOF) - SLAB;
/** the curve (its `g`) a level's floor ends on at the front: the façade of the level below, the plaza's edge on the ground */
const bd_edgeG = (k) => (k === 0 ? LEVELS[0].g - PLAZA : LEVELS[k - 1].g);
/** the terrace rail: its upstand's top, the slats' middles and the handrail's middle, over the floor */
const bd_UP = 0.23;
const bd_SLATS = [0.345, 0.49, 0.635, 0.78, 0.925];
const bd_HAND = 1.03;

/* ---- the façade's family of curves: z = g − x²/2ρ, and shapes laid along one ---- */

/** a point of the curve z = g − x²/2ρ at x, `o` metres in from it (north, away from the garden): [x, z] */
function bd_on(g, x, o = 0) {
	const l = Math.hypot(1, x / RHO);
	return [x + (x / RHO / l) * o, g - (x * x) / (2 * RHO) + o / l];
}
/** the turn round y that lays a shape's +x along the curve (east) and its +z in (north) at x */
const bd_turn = (x) => Math.atan2(x / RHO, 1);
/** the matrix of a place on the curve: x along it, `o` in from it, at height y */
const bd_at = (g, x, y, o = 0) => {
	const [px, pz] = bd_on(g, x, o);
	return at(px, y, pz, bd_turn(x));
};
/** where (x ≥ 0) the curve, `o` in, meets a circle of plan radius r round the dome's middle */
function bd_meet(g, o, r) {
	let lo = 0, hi = r;
	for (let i = 0; i < 44; i++) {
		const m = (lo + hi) / 2, [x, z] = bd_on(g, m, o);
		if (x * x + z * z < r * r) lo = m;
		else hi = m;
	}
	return lo;
}
/**
 * A shape built straight (its x along, y up, z in) bent onto the curve: each point to the curve at its x, its z in
 * from it, its normal turned with it. Long shapes must have points along x to bend.
 */
function bd_bend(geo, g) {
	const p = geo.attributes.position, n = geo.attributes.normal;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), o = p.getZ(i);
		const l = Math.hypot(1, x / RHO), ax = 1 / l, az = -x / RHO / l;
		p.setXYZ(i, x - az * o, y, g - (x * x) / (2 * RHO) + ax * o);
		if (n) {
			const a = n.getX(i), c = n.getZ(i);
			n.setXYZ(i, a * ax - c * az, n.getY(i), a * az + c * ax);
		}
	}
	p.needsUpdate = true;
	return geo;
}

/* ---- geometry from points ---- */

/** the normal of a quad a b c d (by its diagonals, so a quad with a side of no length still has one) */
function bd_qn(a, b, c, d) {
	const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
	const vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
	return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
/** triangles gathered as numbers, made a geometry with creased normals (smooth over soft turns, sharp at edges) */
class bd_Soup {
	constructor() {
		this.p = [];
	}
	tri(a, b, c) {
		this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
	}
	/** a quad, its corners in turn, facing `toward` (a direction) where given, else as wound */
	quad(a, b, c, d, toward) {
		if (toward) {
			const n = bd_qn(a, b, c, d);
			if (n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0) {
				this.tri(a, c, b);
				this.tri(a, d, c);
				return;
			}
		}
		this.tri(a, b, c);
		this.tri(a, c, d);
	}
	/** a triangle facing `toward` */
	face(a, b, c, toward) {
		const n = bd_qn(a, b, c, c);
		if (n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0) this.tri(a, c, b);
		else this.tri(a, b, c);
	}
	geometry(crease = 0.7) {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
		return bd_creased(g, crease);
	}
}

/**
 * A surface swept along a path: `rows` of points, each row the profile placed at one point of the path. Indexed,
 * smooth, its UVs u along the path and v round the profile in metres over `tile`; turned so it faces away from the
 * profile's middle (`face` 1), or toward it (−1), or as wound (0).
 */
function bd_grid(rows, tile = 1, face = 1, closed = false, caps = []) {
	const n = rows.length, m = rows[0].length + (closed ? 1 : 0);
	const extra = caps.reduce((t, c) => t + c.pts.length, 0);
	const pos = new Float32Array((n * m + extra) * 3), uv = new Float32Array((n * m + extra) * 2);
	const idx = [];
	let along = 0;
	for (let i = 0; i < n; i++) {
		const r = rows[i];
		if (i) {
			const a = rows[i - 1][0], b = r[0];
			along += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
		}
		let round = 0;
		for (let j = 0; j < m; j++) {
			const p = r[j % r.length];
			if (j) {
				const q = r[j - 1];
				round += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
			}
			pos.set(p, (i * m + j) * 3);
			uv[(i * m + j) * 2] = along / tile;
			uv[(i * m + j) * 2 + 1] = round / tile;
		}
	}
	for (let i = 0; i < n - 1; i++)
		for (let j = 0; j < m - 1; j++) {
			const a = i * m + j, b = a + 1, c = a + m, d = c + 1;
			idx.push(a, b, c, b, d, c);
		}
	if (face) {
		// which way the first row's first faces look, against the way out from the profile's middle
		const r = rows[0], k = Math.floor(r.length / 3);
		const mid = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length, s[2] + p[2] / r.length], [0, 0, 0]);
		const a = rows[0][k], b = rows[0][k + 1], c = rows[1][k];
		const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
		const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
		const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
		const out = nx * (a[0] - mid[0]) + ny * (a[1] - mid[1]) + nz * (a[2] - mid[2]);
		if (out * face < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
	}
	// flat caps (their own points, so their normals stay flat), each triangle facing its cap's way
	let at = n * m;
	for (const c of caps) {
		c.pts.forEach((p, i) => pos.set(p, (at + i) * 3));
		for (const [a, b, d] of c.tris) {
			const A = c.pts[a], B = c.pts[b], D = c.pts[d];
			const q = bd_qn(A, B, D, D);
			if (q[0] * c.dir[0] + q[1] * c.dir[1] + q[2] * c.dir[2] < 0) idx.push(at + a, at + d, at + b);
			else idx.push(at + a, at + b, at + d);
		}
		at += c.pts.length;
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

/**
 * A profile ([n, y] points round a closed or open outline) swept upright along a path ([x, y, z] points): n across
 * the path (level, to its right), y up. With `caps`, its two ends closed flat.
 */
function bd_sweep(path, prof, o = {}) {
	const rows = [];
	for (let i = 0; i < path.length; i++) {
		const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], p = path[i];
		let tx = b[0] - a[0], tz = b[2] - a[2];
		const l = Math.hypot(tx, tz) || 1;
		tx /= l;
		tz /= l;
		// to the right of the way along (seen from above, x east and z north)
		const nx = tz, nz = -tx;
		rows.push(prof.map(([u, v]) => [p[0] + nx * u, p[1] + v, p[2] + nz * u]));
	}
	const caps = [];
	if (o.caps) {
		const tris = THREE.ShapeUtils.triangulateShape(prof.map(([u, v]) => new THREE.Vector2(u, v)), []);
		for (const [r, e] of [[rows[0], -1], [rows[rows.length - 1], 1]]) {
			const i0 = e < 0 ? 0 : path.length - 2;
			caps.push({ pts: r, tris, dir: [(path[i0 + 1][0] - path[i0][0]) * e, (path[i0 + 1][1] - path[i0][1]) * e, (path[i0 + 1][2] - path[i0][2]) * e] });
		}
	}
	return bd_grid(rows, o.tile ?? 1, o.face ?? 1, o.closed ?? true, caps);
}
/** a closed profile: a rounded rectangle w (across) × h (up), its middle at [u, v] */
const bd_rr = (w, h, r, u = 0, v = 0, seg = 2) => roundRect(w, h, r, seg).map(([a, b]) => [a + u, b + v]);

/**
 * A rounded slab: a closed outline ([u, v] points, any turn) given thickness t across w (0 … t), its edges rounded by
 * r, each point mapped to the world by `place(u, v, w)` ([x, y, z]); creased normals. For treads, landings, leaves,
 * strings and planters: anything flat with soft edges.
 */
function bd_slab(outline, t, r, place, seg = 2) {
	// the outline counter-clockwise, and each point's way out (the mean of its sides' normals)
	let pts = outline.slice();
	let area = 0;
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i + 1) % pts.length];
		area += a[0] * b[1] - b[0] * a[1];
	}
	if (area < 0) pts.reverse();
	const n = pts.length;
	const out = pts.map((p, i) => {
		const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
		let dx = b[0] - a[0], dy = b[1] - a[1];
		const l = Math.hypot(dx, dy) || 1;
		return [dy / l, -dx / l];
	});
	// the edge rounded: the outline drawn in by `inset` at depth `w`, a quarter round at each face
	const rr = Math.min(r, t / 2);
	const prof = [];
	for (let s = 0; s <= seg; s++) {
		const a = (Math.PI / 2) * (s / seg);
		prof.push([rr - rr * Math.sin(a), rr - rr * Math.cos(a)]);
	}
	for (let s = 0; s <= seg; s++) {
		const a = (Math.PI / 2) * (s / seg);
		prof.push([rr - rr * Math.cos(a), t - rr + rr * Math.sin(a)]);
	}
	const soup = new bd_Soup();
	const P = (i, inset, w) => place(pts[i][0] - out[i][0] * inset, pts[i][1] - out[i][1] * inset, w);
	for (let k = 0; k < prof.length - 1; k++)
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			const [i0, w0] = prof[k], [i1, w1] = prof[k + 1];
			const q = [P(i, i0, w0), P(j, i0, w0), P(j, i1, w1), P(i, i1, w1)];
			const m = place(pts[i][0], pts[i][1], (w0 + w1) / 2), mo = place(pts[i][0] + out[i][0], pts[i][1] + out[i][1], (w0 + w1) / 2);
			soup.quad(q[0], q[1], q[2], q[3], [mo[0] - m[0], mo[1] - m[1], mo[2] - m[2]]);
		}
	// the two faces, the outline drawn in by r
	const flat = pts.map((p, i) => new THREE.Vector2(p[0] - out[i][0] * rr, p[1] - out[i][1] * rr));
	const tris = THREE.ShapeUtils.triangulateShape(flat, []);
	for (const [w, s] of [[0, -1], [t, 1]]) {
		const c0 = place(0, 0, w), c1 = place(0, 0, w + s);
		const dir = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]];
		for (const [a, b, c] of tris) {
			const A = place(flat[a].x, flat[a].y, w), B = place(flat[b].x, flat[b].y, w), C = place(flat[c].x, flat[c].y, w);
			soup.face(A, B, C, dir);
		}
	}
	return soup.geometry(0.5);
}

/** a flat outline ([x, z] points, with holes) at height y facing up (or down): floors, decks and soffits */
function bd_flat(outline, holes, y, up = true) {
	const V = (p) => new THREE.Vector2(p[0], p[1]);
	const all = [outline, ...holes];
	// the outline counter-clockwise and the holes clockwise in (x, z), as triangulation wants them
	const cw = (p) => THREE.ShapeUtils.isClockWise(p.map(V));
	const loops = all.map((p, i) => ((i === 0) === cw(p) ? p.slice().reverse() : p));
	const tris = THREE.ShapeUtils.triangulateShape(loops[0].map(V), loops.slice(1).map((h) => h.map(V)));
	const pts = loops.flat();
	const pos = new Float32Array(pts.length * 3);
	pts.forEach((p, i) => pos.set([p[0], y, p[1]], i * 3));
	const idx = [];
	// each triangle turned to face up (its turn in x, z clockwise) or down
	for (const [a, b, c] of tris) {
		const A = pts[a], B = pts[b], C = pts[c];
		const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
		if (cross < 0 === up) idx.push(a, b, c);
		else idx.push(a, c, b);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
/** a profile ([r, y], absolute) turned round the dome's axis from bearing b0 to b1: what closes a slab to the shell */
function bd_revolve(prof, b0, b1, tile = 1, face = 1, closed = false) {
	const n = Math.max(2, Math.ceil(Math.abs(b1 - b0) / (Math.PI / 120)));
	const rows = [];
	for (let i = 0; i <= n; i++) {
		const b = b0 + ((b1 - b0) * i) / n;
		rows.push(prof.map(([r, y]) => [r * Math.sin(b), y, r * Math.cos(b)]));
	}
	return bd_grid(rows, tile, face, closed);
}
/** points of an arc: centre [cx, cy], radius r, from angle a0 to a1 (radians), n steps, as [x, y] (ends included) */
const bd_arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), cy + r * Math.sin(a0 + ((a1 - a0) * i) / n)]);
/** a profile without its first point (to join arcs end to end) */
const bd_tail = (p) => p.slice(1);

/* ---- 1. THE SLABS: floors, soffits, their rounded fronts, their holes for the stairs, and how they meet the shell ---- */

/**
 * A slab's front, in its own section (o in from the edge line, y up from the floor): the soffit, a bullnose of 0.18 m
 * round the front, the rail's upstand of 0.23 m rounded over, a small cove down to the floor. The floor starts at
 * o 0.02, the soffit at o 0.10. `flush`: no upstand (a landing's edge), its face on the edge line.
 */
const bd_EDGE = [[0.1, -0.35], [0.03, -0.35], ...bd_tail(bd_arc(0.03, -0.17, 0.18, -Math.PI / 2, -Math.PI, 5)), [-0.15, 0.16], ...bd_tail(bd_arc(-0.08, 0.16, 0.07, Math.PI, 0, 5)), [-0.01, 0.03], ...bd_tail(bd_arc(0.02, 0.03, 0.03, Math.PI, Math.PI * 1.5, 2))];
const bd_FLUSH = [...bd_arc(0.1, -0.25, 0.1, -Math.PI / 2, -Math.PI, 4), [0, -0.025], ...bd_tail(bd_arc(0.025, -0.025, 0.025, Math.PI, Math.PI / 2, 2))];
/** a section ([o, y]) as a sweep's profile ([n, y]: n to the right of a path that keeps the slab on its left) */
const bd_side = (prof) => prof.map(([o, y]) => [-o, y]);

/** the spiral stairs' measures: the column, the treads' outer end, the stringer's middle, the hole's edge line,
 *  each tread's turn, the landing's turn (its middle due south of the stair's middle at every level) */
const bd_SP = { col: 0.09, tread: 1.675, band: 1.69, hole: 2.0, step: (15 * Math.PI) / 180, land: (30 * Math.PI) / 180 };
/** a spiral stair's bearing at its own turn ψ (growing as it rises; the landing at −land/2 … land/2), and a point there */
const bd_spB = (s, psi) => Math.PI + (s.x > 0 ? 1 : -1) * psi;
const bd_spP = (s, psi, r) => {
	const b = bd_spB(s, psi);
	return [s.x + r * Math.sin(b), s.z + r * Math.cos(b)];
};
/** the hole a spiral stair passes through a slab: its circle less the landing (part of the slab), moved `e` into the slab */
function bd_hole(s, e) {
	const h = bd_SP.hole + e, L = bd_SP.land / 2, sg = s.x > 0 ? 1 : -1;
	const edge = (psi, toward) => {
		const b = bd_spB(s, psi), u = [Math.sin(b), Math.cos(b)], t = [Math.cos(b), -Math.sin(b)];
		const len = Math.sqrt(h * h - e * e), k = toward * sg * e;
		return [s.x + u[0] * len + t[0] * k, s.z + u[1] * len + t[1] * k];
	};
	const pts = [bd_spP(s, 0, e / Math.sin(L)), edge(L, -1)];
	const a0 = L - Math.asin(e / h), a1 = TAU - L + Math.asin(e / h), n = 60;
	for (let i = 1; i < n; i++) pts.push(bd_spP(s, a0 + ((a1 - a0) * i) / n, h));
	pts.push(edge(-L, 1));
	return pts;
}
/** the stairs' holes through slab k (the spiral stairs pass every slab above the ground) */
const bd_holes = (k, e) => (k > 0 ? STAIRS.map((s) => bd_hole(s, e)) : []);
/**
 * The grand stair's flight f (level f to f + 1): a wide curved flight on an arc of radius R round [cx, cz], from its
 * foot at φ0 (heading along the terrace's front, a little out toward the garden) to φ1, sweeping out to the terrace's
 * edge and back in to land on the next slab's front; even flights rise westward, odd ones eastward, each from the
 * middle bay. A point of it at turn φ and radius r: [cx + dir·r·sin φ, cz − r·cos φ].
 */
function bd_gsSpec(f) {
	const ya = bd_floor(f), yb = bd_floor(f + 1), n = Math.round((yb - ya) / 0.175), h = (yb - ya) / n;
	const dir = f % 2 === 0 ? -1 : 1, R = f === 0 ? 6 : 7, go = f === 0 ? 0.3 : 0.32, dphi = go / R, hw = 0.95;
	const phi0 = ((f === 0 ? -28 : -20) * Math.PI) / 180, phi1 = phi0 + (n - 1) * dphi;
	const xs = f === 0 ? 2.2 : 1.5;
	const cx = -dir * (xs + R * Math.sin(phi0));
	// the plaza's flight clear of the spring in the plaza's middle (x ±0.8, to z ≈ edgeZ + 2)
	const zmin = f === 0 ? facadeZ(0, cx) - 2.55 : edgeZ(f, cx) + hw + 0.17;
	const s = { f, ya, yb, n, h, dir, R, dphi, hw, phi0, phi1, cx, cz: zmin + R, flare: f === 0 ? 0.6 : 0.3, gEnd: bd_edgeG(f + 1) };
	s.P = (phi, r) => [s.cx + s.dir * r * Math.sin(phi), s.cz - r * Math.cos(phi)];
	/** where a line of radius r crosses the next slab's front (its turn) */
	s.cross = (r) => {
		let lo = 0, hi = Math.PI / 2;
		for (let i = 0; i < 40; i++) {
			const m = (lo + hi) / 2, [x, z] = s.P(m, r);
			if (z < bd_on(s.gEnd, x)[1]) lo = m;
			else hi = m;
		}
		return lo;
	};
	s.phiI = s.cross(R - hw - 0.06);
	s.phiL = s.cross(R + hw + 0.06);
	/** its half width at turn φ on its inner side (−1) and its outer side (1): the outer flared at its foot */
	s.half = (phi, side = 1) => hw + (side > 0 ? s.flare * clamp(1 - (phi - phi0) / (4 * dphi)) ** 2 : 0);
	/** the line of its nosings (flat over its landing) */
	s.line = (phi) => Math.max(ya, Math.min(yb, ya + h * (1 + (phi - phi0) / dphi)));
	return s;
}
const bd_GSPEC = [0, 1, 2, 3].map(bd_gsSpec);
/** where on slab k's front (x, west to east) the grand stair lands, its walls included: no rail there */
const bd_gsGap = (k) => {
	const s = bd_GSPEC[k - 1];
	const a = s.P(s.phiI, s.R - s.hw - 0.12)[0], b = s.P(s.phiL, s.R + s.hw + 0.12)[0];
	return [Math.min(a, b) - 0.03, Math.max(a, b) + 0.03];
};

/** a slab's outline: its front (curve g, `o` in from it) and the circle of radius `rr` behind, the north door's notch */
function bd_outline(g, o, rr, step = 0.5, notch = null) {
	const xe = bd_meet(g, o, rr);
	const pts = [];
	const n = Math.ceil((2 * xe) / step);
	for (let i = 0; i <= n; i++) pts.push(bd_on(g, -xe + (2 * xe * i) / n, o));
	const [ex, ez] = pts[n];
	const be = Math.atan2(ex, ez), m = Math.ceil((2 * be) / (Math.PI / 180));
	const bn = notch ? Math.asin(notch.hw / rr) : -1;
	for (let i = 1; i < m; i++) {
		const b0 = be - (2 * be * (i - 1)) / m, b = be - (2 * be * i) / m;
		if (notch && b0 > bn && b <= bn) pts.push([rr * Math.sin(bn), rr * Math.cos(bn)], [notch.r * Math.sin(bn), notch.r * Math.cos(bn)]);
		if (notch && b0 > -bn && b <= -bn) pts.push([notch.r * Math.sin(-bn), notch.r * Math.cos(-bn)], [rr * Math.sin(-bn), rr * Math.cos(-bn)]);
		const r = notch && Math.abs(b) < bn ? notch.r : rr;
		pts.push([r * Math.sin(b), r * Math.cos(b)]);
	}
	return { pts, xe, be };
}

/** slab k (1 … 3, and 4 the roof): its oak floor, plaster soffit, rounded front, holes and its joints with the shell */
function bd_slab_k(bag, k) {
	const y = bd_floor(k), g = bd_edgeG(k), ys = y - SLAB;
	const rE = shellR(y) - GAP;
	// the floor, from just behind the upstand to the circle GAP inside the shell
	const top = bd_outline(g, 0.02, rE);
	bag.add('floor', bd_flat(top.pts, bd_holes(k, 0.02), y), null, { uv: 'box', chunk: false });
	// the soffit, from behind the bullnose to where the cove to the shell begins
	const rc = bd_inR(ys, 0) - 0.15;
	const bot = bd_outline(g, 0.1, rc);
	bag.add('plaster', bd_flat(bot.pts, bd_holes(k, 0.1), ys, false), null, { uv: 'box', chunk: false });
	// the cove where the soffit meets the shell: a quarter round down into it
	const cove = [[rc - 0.02, ys], [rc + 0.09, ys - 0.01], [rc + 0.15, ys - 0.06], [bd_inR(ys - 0.16, bd_DEEP), ys - 0.16]];
	bag.add('plaster', bd_revolve(cove, -bot.be - 0.01, bot.be + 0.01, TILE.plaster, -1), null, { chunk: false });
	// the upstand where the floor meets the shell: a rounded kerb of 0.38 m, its top sloping up into the shell
	const kerb = [[rE - 0.02, y - 0.02], [rE, y + 0.3], ...bd_tail(bd_arc(rE + 0.08, y + 0.3, 0.08, Math.PI, Math.PI / 2, 4)), [(rE + 0.08 + bd_inR(y + 0.44)) / 2, y + 0.4], [bd_inR(y + 0.44, bd_DEEP), y + 0.44]];
	bag.add('plaster', bd_revolve(kerb, -top.be - 0.006, top.be + 0.006, TILE.plaster), null, { chunk: false });
	// and between the two, behind the shell's skin, a white band: where a window of the shell crosses the slab, it
	// shows the slab closed against its reveal, not the slab's inside
	const band = [];
	for (let i = 0; i <= 4; i++) {
		const yy = lerp(ys - 0.16, y + 0.44, i / 4);
		band.push([bd_inR(yy, bd_DEEP), yy]);
	}
	bag.add('plaster', bd_revolve(band, -top.be - 0.006, top.be + 0.006, TILE.plaster, 1), null, { chunk: false });
	// the front: on into the shell until its first point is behind the skin (none through it), broken where the grand stair lands
	const xEnd = Math.min(...bd_EDGE.map(([o, dy]) => bd_meet(g, o, bd_inR(y + dy, bd_DEEP))));
	const [ga, gb] = bd_gsGap(k);
	for (const [x0, x1] of [[-xEnd, ga], [gb, xEnd]]) {
		const n = Math.ceil((x1 - x0) / 1.0), path = [];
		for (let i = 0; i <= n; i++) {
			const [px, pz] = bd_on(g, x0 + ((x1 - x0) * i) / n, 0);
			path.push([px, y, pz]);
		}
		bag.add('plaster', bd_sweep(path, bd_side(bd_EDGE), { closed: false, caps: true, tile: TILE.plaster }), null, { chunk: false });
	}
	// round each stair's hole: the edge with its upstand round the open part, flush along the landing's two sides
	for (const s of STAIRS) {
		const L = bd_SP.land / 2, sg = s.x > 0 ? 1 : -1, n = 60, path = [];
		for (let i = 0; i <= n; i++) {
			const [px, pz] = bd_spP(s, L + ((TAU - 2 * L) * i) / n, bd_SP.hole);
			path.push([px, y, pz]);
		}
		// the path's bearing grows when sg > 0: the slab (outside the hole) is then on its left
		const p = sg > 0 ? path : path.reverse();
		bag.add('plaster', bd_sweep(p, bd_side(bd_EDGE), { closed: false, caps: true, tile: TILE.plaster }));
		for (const [psi, toward] of [[L, -1], [-L, 1]]) {
			const a = bd_spP(s, psi, bd_SP.col), b = bd_spP(s, psi, bd_SP.hole + 0.12);
			// along the edge so that the landing (toward ψ − L … ) lies on the path's left
			let line = [[a[0], y, a[1]], [b[0], y, b[1]]];
			if (toward * sg > 0) line = [line[1], line[0]];
			const pts = [];
			for (let i = 0; i <= 4; i++) pts.push([lerp(line[0][0], line[1][0], i / 4), y, lerp(line[0][2], line[1][2], i / 4)]);
			bag.add('plaster', bd_sweep(pts, bd_side(bd_FLUSH), { closed: false, caps: true, tile: TILE.plaster }));
		}
	}
	return { xEnd };
}

/** the ground level's floor: oak at the plaza's level from the façade to the shell, open at the north door */
function bd_ground(bag) {
	const y = bd_floor(0), g = LEVELS[0].g, rE = shellR(y) - GAP;
	// (the north gate's landing is ±1.55 m wide: the floor runs out to it and the kerb stops either side)
	const gate = 1.65;
	const top = bd_outline(g, -0.06, rE, 0.5, { hw: gate, r: bd_IN + 0.08 });
	bag.add('floor', bd_flat(top.pts, [], y), null, { uv: 'box', chunk: false });
	// its edge under the façade's sill, down to the ground
	const n = Math.ceil(top.xe / 0.5) * 2, rows = [];
	for (let i = 0; i <= n; i++) {
		const x = -top.xe + (2 * top.xe * i) / n;
		const [px, pz] = bd_on(g, x, -0.06);
		rows.push([[px, -0.05, pz], [px, y, pz]]);
	}
	bag.add('floor', bd_grid(rows, TILE.floor, 0, false), null, { chunk: false });
	// the kerb along the shell, broken for the north door
	const kerb = [[rE - 0.02, y - 0.02], [rE, y + 0.3], ...bd_tail(bd_arc(rE + 0.08, y + 0.3, 0.08, Math.PI, Math.PI / 2, 4)), [(rE + 0.08 + bd_inR(y + 0.44)) / 2, y + 0.4], [bd_inR(y + 0.44, bd_DEEP), y + 0.44]];
	const bn = Math.asin(gate / rE);
	for (const [b0, b1] of [[-top.be - 0.006, -bn], [bn, top.be + 0.006]]) {
		const geo = bd_revolve(kerb, b0, b1, TILE.plaster);
		bag.add('plaster', geo, null, { chunk: false });
	}
	// the kerb's ends at the door: closed
	const ends = new bd_Soup();
	for (const b of [-bn, bn]) {
		const row = kerb.map(([r, yy]) => [r * Math.sin(b), yy, r * Math.cos(b)]);
		const mid = row.reduce((q, p) => [q[0] + p[0] / row.length, q[1] + p[1] / row.length, q[2] + p[2] / row.length], [0, 0, 0]);
		const dir = [Math.sign(-b) * Math.cos(b), 0, -Math.sign(-b) * Math.sin(b)];
		for (let j = 0; j < row.length; j++) ends.face(mid, row[j], row[(j + 1) % row.length], dir);
	}
	bag.add('plaster', ends.geometry(0.1), null, { uv: 'box' });
}

/* ---- 2. WALLS: plaster between two faces, cut off by the shell, with arched openings ---- */

/**
 * A wall between its two faces A(s) and B(s) ([x, z] at s, s0 … s1), from y0 up to `top`, cut off where the shell
 * comes down (its top sunk into it), with arched openings `[s0, s1, springing, apex]` (heights over y0), its ends
 * closed where `ends`, a plaster skirting along its feet where `skirt`. Into `bag` as plaster.
 */
function bd_wall(bag, A, B, s0, s1, y0, top, o = {}) {
	const ops = (o.openings ?? []).filter((p) => p[1] > s0 && p[0] < s1).sort((p, q) => p[0] - q[0]);
	const hiOf = (P) => Math.min(top, bd_inY(Math.hypot(P[0], P[1])));
	// samples every 0.6 m, finer where the shell cuts the wall's top
	let S = [];
	const n = Math.max(1, Math.ceil((s1 - s0) / 0.6));
	for (let i = 0; i <= n; i++) {
		const s = s0 + ((s1 - s0) * i) / n;
		if (i && (hiOf(A(s)) < top || hiOf(B(s)) < top)) {
			const p = S[S.length - 1].s;
			for (let k = 1; k < 4; k++) S.push({ s: p + ((s - p) * k) / 4, lo: y0 });
		}
		S.push({ s, lo: y0 });
	}
	for (const [a, b, sp, ap] of ops) {
		S = S.filter((q) => q.s < a || q.s > b);
		const c = (a + b) / 2, hw = (b - a) / 2, add = [{ s: a, lo: y0, op: 1 }, { s: a, lo: y0 + sp }];
		for (let k = 1; k < 14; k++) {
			const s = a + ((b - a) * k) / 14, t = (s - c) / hw;
			add.push({ s, lo: y0 + sp + (ap - sp) * Math.sqrt(Math.max(0, 1 - t * t)) });
		}
		add.push({ s: b, lo: y0 + sp }, { s: b, lo: y0, op: 1 });
		const at = S.findIndex((q) => q.s > b);
		S.splice(at < 0 ? S.length : at, 0, ...add);
	}
	// no point of its foot beyond the shell (where it is cut down to nothing anyway)
	const rIn = bd_inR(y0), inside = (p) => {
		const r = Math.hypot(p[0], p[1]);
		return r > rIn ? [(p[0] * rIn) / r, (p[1] * rIn) / r] : p;
	};
	const P = S.map((q) => {
		const a = inside(A(q.s)), b = inside(B(q.s));
		return { ...q, a, b, ha: Math.max(q.lo, hiOf(a)), hb: Math.max(q.lo, hiOf(b)) };
	});
	const soup = new bd_Soup();
	const V = (p, y) => [p[0], y, p[1]];
	for (let i = 0; i < P.length - 1; i++) {
		const p = P[i], q = P[i + 1];
		const outA = [p.a[0] - p.b[0], 0, p.a[1] - p.b[1]];
		soup.quad(V(p.a, p.lo), V(q.a, q.lo), V(q.a, q.ha), V(p.a, p.ha), outA);
		soup.quad(V(p.b, p.lo), V(q.b, q.lo), V(q.b, q.hb), V(p.b, p.hb), [-outA[0], 0, -outA[2]]);
		if ((p.lo > y0 + 1e-3 || q.lo > y0 + 1e-3) && (p.ha > p.lo || q.ha > q.lo)) {
			const op = ops.find(([a, b]) => (p.s + q.s) / 2 >= a - 1e-6 && (p.s + q.s) / 2 <= b + 1e-6);
			const c = op ? A((op[0] + op[1]) / 2) : p.a, cb = op ? B((op[0] + op[1]) / 2) : p.b;
			const mid = [(c[0] + cb[0]) / 2, y0 + (op ? op[2] / 2 : 0), (c[1] + cb[1]) / 2];
			const qc = [(p.a[0] + q.b[0]) / 2, (p.lo + q.lo) / 2, (p.a[1] + q.b[1]) / 2];
			soup.quad(V(p.a, p.lo), V(p.b, p.lo), V(q.b, q.lo), V(q.a, q.lo), [mid[0] - qc[0], mid[1] - qc[1], mid[2] - qc[2]]);
		}
	}
	for (const [p, q, sgn] of o.ends ? [[P[0], P[1], -1], [P[P.length - 1], P[P.length - 2], 1]] : []) {
		const d = [(p.a[0] + p.b[0] - q.a[0] - q.b[0]) / 2, 0, (p.a[1] + p.b[1] - q.a[1] - q.b[1]) / 2];
		soup.quad(V(p.a, p.lo), V(p.b, p.lo), V(p.b, p.hb), V(p.a, p.ha), sgn ? d : d);
	}
	bag.add(o.material ?? 'plaster', soup.geometry(0.7), null, { uv: 'box' });
	// the skirting: 10 cm of plaster, 1.5 cm proud, its top rounded, along each face where the wall stands on the floor
	if (o.skirt === false) return;
	const SK = [[0, -0.01], [0.015, -0.01], [0.015, 0.075], ...bd_tail(bd_arc(0.0, 0.075, 0.015, 0, Math.PI / 2, 2))];
	for (const side of ['a', 'b']) {
		let run = [];
		const flush = () => {
			if (run.length > 1) {
				const T = [run[run.length - 1][0] - run[0][0], run[run.length - 1][2] - run[0][2]];
				const p0 = P.find((q) => q[side] === run.src0) ?? P[0];
				const room = side === 'a' ? [p0.a[0] - p0.b[0], p0.a[1] - p0.b[1]] : [p0.b[0] - p0.a[0], p0.b[1] - p0.a[1]];
				const right = [T[1], -T[0]];
				const sg = right[0] * room[0] + right[1] * room[1] > 0 ? 1 : -1;
				bag.add('plaster', bd_sweep(run, SK.map(([u, v]) => [u * sg, v]), { closed: false, tile: TILE.plaster }));
			}
			run = [];
		};
		for (const p of P) {
			const ok = p.lo <= y0 + 1e-3 && (side === 'a' ? p.ha : p.hb) > y0 + 0.2;
			if (!ok || p.op) {
				if (ok && p.op && !run.length) {
					run.src0 = p[side];
					run.push([p[side][0], y0, p[side][1]]);
					continue;
				}
				if (ok && p.op) run.push([p[side][0], y0, p[side][1]]);
				flush();
				continue;
			}
			if (!run.length) run.src0 = p[side];
			run.push([p[side][0], y0, p[side][1]]);
		}
		flush();
	}
}

/* ---- 3. THE FAÇADES: curved floor-to-ceiling glass, slender oak mullions, sliding doors left open ---- */

/**
 * An oak bar len long along x, its section w (y) × d (z) rounded by r, its grain along it; open at its ends (they die
 * into what they meet). One template per size, cloned where it is placed.
 */
const bd_OAKBARS = {};
function bd_oakBar(len, w, d, r = 0.02) {
	const k = `${len.toFixed(3)}|${w}|${d}|${r}`;
	if (!bd_OAKBARS[k]) {
		const prof = bd_rr(d, w, r, 0, 0, 2);
		bd_OAKBARS[k] = bd_grid([-len / 2, len / 2].map((x) => prof.map(([z, y]) => [x, y, z])), TILE.oak, 1, true);
	}
	return bd_OAKBARS[k].clone();
}
/** a vertical oak member (mullion, stile) h tall, w along x and d along z, its foot at the origin */
const bd_post = (h, w, d, r = 0.02) => bd_oakBar(h, w, d, r).rotateZ(Math.PI / 2).translate(0, h / 2, 0);

/** what stands on level k's façade line, west to east: the rooms' bays, the stair halls, the doors */
function bd_facadePlan(k) {
	const bays = bd_bays(k);
	const solid = [], doors = [], joints = [];
	for (let i = 0; i < bays.length; i++) {
		const b = bays[i];
		joints.push(b.x0, b.x1);
		const front = b.rooms[0];
		if (front.d0 > 0) continue;
		const kind = front.kind;
		if (kind === 'stair') {
			// the stair hall: solid curved plaster with a wide arch to its terrace; a narrow gap beside it joins it
			const prev = bays[i - 1], next = bays[i + 1];
			const x0 = prev && b.x0 - prev.x1 < 1.2 ? prev.x1 : b.x0, x1 = next && next.x0 - b.x1 < 1.2 ? next.x0 : b.x1;
			solid.push([x0, x1, b.x]);
		} else if (kind === 'hall') {
			doors.push({ a: b.x - 8, b: b.x - 4, park: [[b.x - 4, b.x - 2, 0.11], [b.x - 4, b.x - 2, 0.18]] });
			doors.push({ a: b.x + 4, b: b.x + 8, park: [[b.x + 2, b.x + 4, 0.11], [b.x + 2, b.x + 4, 0.18]] });
			joints.push(b.x - 9, b.x - 2, b.x, b.x + 2, b.x + 9);
		} else if (kind === 'suite') {
			// in the room's own frame (its +x west): local x −w/2 + 0.6 … −w/2 + 2.0, the leaf behind its western neighbour
			const M = roomMatrix(k, b.x), xw = (lx) => new THREE.Vector3(lx, 0, 0).applyMatrix4(M).x;
			const a = xw(-b.w / 2 + 2.0), c = xw(-b.w / 2 + 0.6);
			doors.push({ a, b: c, park: [[a - 1.45, a, 0.11]] });
		} else {
			doors.push({ a: b.x - 0.8, b: b.x + 0.8, park: [[b.x + 0.8, b.x + 2.4, 0.11]] });
		}
	}
	return { bays, solid, doors, joints };
}

/** level k's façade: glass, mullions, head and sill, the open sliding doors, the stair halls' plaster, its ends in the shell */
function bd_facade(bag, k) {
	const g = LEVELS[k].g, y0 = bd_floor(k), y1 = bd_ceil(k), H = y1 - y0;
	const { solid, doors, joints } = bd_facadePlan(k);
	// where the glass ends at height y: GAP inside the shell
	const xg = (y) => bd_meet(g, 0, shellR(y) - GAP) - 0.04;
	const xTop = xg(y1), xBot = xg(y0);
	const inSolid = (x) => solid.some(([a, b]) => x > a - 0.05 && x < b + 0.05);
	const inDoor = (x) => doors.some((d) => x > d.a + 0.05 && x < d.b - 0.05);
	// the mullions: at every wall, every door's jambs, the plaster's ends; then every ≤ 1.55 m between
	let fixed = [...joints, ...doors.flatMap((d) => [d.a, d.b]), ...solid.flatMap(([a, b]) => [a, b]), -xTop + 0.25, xTop - 0.25];
	fixed = fixed.filter((x) => Math.abs(x) <= xTop - 0.25 && !inDoor(x)).sort((a, b) => a - b);
	fixed = fixed.filter((x, i) => !i || x - fixed[i - 1] > 0.12);
	const mull = [];
	for (let i = 0; i < fixed.length; i++) {
		const x = fixed[i];
		if (!inSolid(x) || solid.some(([a, b]) => Math.abs(x - a) < 0.06 || Math.abs(x - b) < 0.06)) mull.push(x);
		const nx = fixed[i + 1];
		if (nx === undefined) break;
		const m = (x + nx) / 2;
		if (inSolid(m) || inDoor(m)) continue;
		const n = Math.ceil((nx - x) / 1.55);
		for (let j = 1; j < n; j++) mull.push(x + ((nx - x) * j) / n);
	}
	const tpl = bd_post(H + 0.02, 0.07, 0.14, 0.03);
	for (const x of mull) bag.add('oak', tpl.clone(), bd_at(g, x, y0 - 0.01, 0));
	// the panes: flat between mullions, below the head and above the sill
	const glass = new bd_Soup();
	const gy0 = y0 + 0.05, gy1 = y1 - 0.09;
	const ms = mull.slice().sort((a, b) => a - b);
	for (let i = 0; i < ms.length - 1; i++) {
		const a = ms[i], b = ms[i + 1], m = (a + b) / 2;
		if (inSolid(m) || inDoor(m)) continue;
		const pa = bd_on(g, a), pb = bd_on(g, b);
		glass.quad([pa[0], gy0, pa[1]], [pb[0], gy0, pb[1]], [pb[0], gy1, pb[1]], [pa[0], gy1, pa[1]], [0, 0, -1]);
	}
	// the last panes at each end: their outer edge slopes with the shell, an oak jamb along it
	for (const s of [-1, 1]) {
		const xm = s > 0 ? ms[ms.length - 1] : ms[0];
		const edge = [];
		for (let i = 0; i <= 8; i++) {
			const y = lerp(gy0, gy1, i / 8);
			edge.push([s * xg(y), y]);
		}
		const pts = [[xm, gy0], ...edge, [xm, gy1]].map(([x, y]) => {
			const p = bd_on(g, x);
			return [p[0], y, p[1]];
		});
		for (let i = 1; i < pts.length - 2; i++) glass.face(pts[0], pts[i], pts[i + 1], [0, 0, -1]);
		glass.face(pts[0], pts[pts.length - 2], pts[pts.length - 1], [0, 0, -1]);
		const jamb = [];
		for (let i = 0; i <= 8; i++) {
			const y = lerp(y0, y1 + 0.02, i / 8);
			const p = bd_on(g, s * (xg(y) + 0.02));
			jamb.push([p[0], y, p[1]]);
		}
		bag.add('oak', tube(jamb, 0.045, 8, false, TILE.oak), null);
		// beyond the glass, plaster to the shell: its foot follows the glass's sloping edge
		const yg = (x) => {
			const r = Math.hypot(...bd_on(g, x));
			return Math.sqrt(Math.max(0, R * R - (r + GAP + 0.04 / 1.5) ** 2));
		};
		const x0 = xTop + 0.02, x1 = bd_meet(g, 0.14, bd_inR(y0, 0.1));
		const lo = (x) => clamp(yg(Math.abs(x)) - y0, 0, H);
		const segs = 18, S = [];
		for (let i = 0; i <= segs; i++) S.push(lerp(x0, x1, i / segs));
		const soup = new bd_Soup();
		for (let i = 0; i < segs; i++) {
			const q = [S[i], S[i + 1]].map((x) => {
				const a = bd_on(g, s * x, -0.14), b = bd_on(g, s * x, 0.14);
				const l = y0 + lo(x) - 0.03;
				return { a, b, l, ha: Math.max(l, Math.min(y1 + 0.02, bd_inY(Math.hypot(...a)))), hb: Math.max(l, Math.min(y1 + 0.02, bd_inY(Math.hypot(...b)))) };
			});
			const [p, r] = q, V = (pt, y) => [pt[0], y, pt[1]];
			soup.quad(V(p.a, p.l), V(r.a, r.l), V(r.a, r.ha), V(p.a, p.ha), [0, 0, -1]);
			soup.quad(V(p.b, p.l), V(r.b, r.l), V(r.b, r.hb), V(p.b, p.hb), [0, 0, 1]);
			soup.quad(V(p.a, p.l), V(p.b, p.l), V(r.b, r.l), V(r.a, r.l), [0, -1, 0]);
		}
		bag.add('plaster', soup.geometry(0.7), null, { uv: 'box' });
	}
	bag.add('glass', glass.geometry(0.1), null, { chunk: false });
	// head and sill: rounded oak along the curve (no sill across an open door or under the stair halls' arches)
	const along = (x0, x1, y, prof) => {
		const n = Math.max(1, Math.ceil((x1 - x0) / 0.6)), path = [];
		for (let i = 0; i <= n; i++) {
			const p = bd_on(g, lerp(x0, x1, i / n));
			path.push([p[0], y, p[1]]);
		}
		bag.add('oak', bd_sweep(path, prof, { caps: true, tile: TILE.oak }), null, { chunk: false });
	};
	along(-xTop - 0.02, xTop + 0.02, y1 - 0.04, bd_rr(0.16, 0.12, 0.035));
	const cuts = [...doors.map((d) => [d.a, d.b]), ...solid.map(([a, b, c]) => [c - 1.35, c + 1.35])].sort((p, q) => p[0] - q[0]);
	let from = -xBot;
	for (const [a, b] of cuts) {
		if (a > from) along(from, a, y0 + 0.025, bd_rr(0.16, 0.07, 0.025));
		from = Math.max(from, b);
	}
	along(from, xBot, y0 + 0.025, bd_rr(0.16, 0.07, 0.025));
	// a flush bronze track across each open door
	for (const d of doors) along(d.a, d.b, y0 + 0.004, bd_rr(0.1, 0.012, 0.004)) || null;
	// the sliding leaves, slid aside behind the glass next to their opening
	for (const d of doors)
		for (const [a, b, o] of d.park) bd_leaf(bag, g, a, b, o, y0, y1);
	// the stair halls: plaster on the façade line, a wide elliptical arch open to the terrace
	for (const [a, b, c] of solid) {
		const spring = k === 0 ? 2.5 : 2.2, apex = k === 0 ? 3.55 : 3.2;
		bd_wall(bag, (x) => bd_on(g, x, -0.13), (x) => bd_on(g, x, 0.15), a, b, y0 - 0.02, y1 + 0.02, { openings: [[c - 1.3, c + 1.3, spring, apex]], ends: true, skirt: false });
		// the arch's edges rounded: a soft bead along them on both faces
		for (const o of [-0.13, 0.15]) {
			const pts = [];
			for (let i = 0; i <= 24; i++) {
				const t = Math.PI * (1 - i / 24), x = c + 1.3 * Math.cos(t), yy = y0 + spring + (apex - spring) * Math.sin(t);
				const [px, pz] = bd_on(g, x, o);
				pts.push([px, yy, pz]);
			}
			const [lx, lz] = bd_on(g, c - 1.3, o), [rx, rz] = bd_on(g, c + 1.3, o);
			const line = [[lx, y0 - 0.02, lz], [lx, y0 + spring * 0.5, lz], ...pts, [rx, y0 + spring * 0.5, rz], [rx, y0 - 0.02, rz]];
			bag.add('plaster', tube(line, 0.035, 8, false, TILE.plaster, 60), null, { uv: 'box' });
		}
	}
}

/** a sliding glass leaf, oak framed, standing `o` in from the façade line between a and b */
function bd_leaf(bag, g, a, b, o, y0, y1) {
	const w = b - a + 0.04, h = y1 - 0.1 - (y0 + 0.012), xc = (a + b) / 2;
	const M = bd_at(g, xc, y0 + 0.012, o);
	const add = (geo, x, y) => bag.add('oak', geo, M.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, 0)));
	add(bd_post(h, 0.075, 0.05, 0.015), -w / 2 + 0.0375, 0);
	add(bd_post(h, 0.075, 0.05, 0.015), w / 2 - 0.0375, 0);
	add(bd_oakBar(w - 0.15, 0.075, 0.05, 0.015), 0, h - 0.0375);
	add(bd_oakBar(w - 0.15, 0.11, 0.05, 0.015), 0, 0.055);
	const pane = new THREE.PlaneGeometry(w - 0.15, h - 0.185).translate(0, 0.11 + (h - 0.185) / 2, 0);
	bag.add('glass', pane, M);
	bag.add('bronze', bd_post(0.45, 0.022, 0.03, 0.01), M.clone().multiply(new THREE.Matrix4().makeTranslation(-w / 2 + 0.04, 0.83, 0.045)));
}

/* ---- 4. THE ROOMS: their walls (side walls from the glass to the shell, cross walls between a bay's rooms), doors ---- */

/** level k's bays west to east: each a column of rooms in one frame (a suite, its bath, its studio), x0 … x1 along the façade */
function bd_bays(k) {
	const by = new Map();
	for (const r of ROOMS) {
		if (r.level !== k) continue;
		const key = r.x.toFixed(3);
		if (!by.has(key)) by.set(key, { x: r.x, w: r.w, x0: r.x - r.w / 2, x1: r.x + r.w / 2, rooms: [], M: roomMatrix(k, r.x) });
		by.get(key).rooms.push(r);
	}
	const bays = [...by.values()].sort((a, b) => a.x - b.x).map((b) => (b.rooms.sort((p, q) => p.d0 - q.d0), b));
	// a stair hall's walls run due north, parallel to its stair's own square (the stairs stand at fixed x, z): its
	// frame turned square to the plan, not to the curve, so its walls clear the stair's hole on every level
	for (const b of bays) if (b.rooms[0].kind === 'stair') b.M = at(b.x, LEVELS[k].y, facadeZ(k, b.x), Math.PI);
	return bays;
}
/** a point of a bay's own frame (local x, depth d) as [x, z] */
const bd_in = (b, lx, d) => {
	const v = new THREE.Vector3(lx, 0, -d).applyMatrix4(b.M);
	return [v.x, v.z];
};
/** the room of a bay at depth d */
const bd_roomAt = (b, d) => b.rooms.find((r) => d >= r.d0 && d <= r.d1);
/** how deep a spiral stair's hole begins in a stair bay (its front, from the glass) */
const bd_holeFront = (b, k) => {
	const s = STAIRS.find((q) => Math.abs(q.x - b.x) < 0.5);
	return s.z - facadeZ(k, s.x) - (bd_SP.hole - 0.15);
};

/**
 * A door leaf of oak standing open: hinged at H ([x, z], on the jamb's face toward the room it opens into), its
 * closed line along `u` (unit, toward the other jamb), opened 90° along `n` (unit, into that room); its top the
 * opening's arch (springing sp, apex ap over y0, the whole opening's width W, this leaf the part from `from`).
 */
function bd_door(bag, H, u, n, y0, wl, W, sp, ap) {
	// its outline in its own plane: across from the hinge (0 … wl), up from the floor, its head the opening's arch
	const hw = W / 2, pts = [[0.003, 0.008], [wl - 0.003, 0.008]];
	for (let i = 12; i >= 0; i--) {
		const t = 0.003 + ((wl - 0.006) * i) / 12, q = (t - hw) / hw;
		pts.push([t, sp - 0.006 + (ap - sp) * Math.sqrt(Math.max(0, 1 - q * q))]);
	}
	const place = (a, v, w) => [H[0] + n[0] * a + u[0] * (w + 0.004), y0 + v, H[1] + n[1] * a + u[1] * (w + 0.004)];
	// its grain up the leaf: its UVs laid by box, then turned a quarter
	const leaf = boxUV(bd_slab(pts, 0.044, 0.01, place, 2), TILE.oak), uv = leaf.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
	bag.add('oak', leaf, null);
	// a brass knob each side, near its free edge at 1 m
	for (const side of [-1, 1]) {
		const c = place(wl - 0.07, 1.0, side > 0 ? 0.044 : 0);
		const geo = lathe([[0, 0], [0.012, 0.002], [0.009, 0.02], [0.02, 0.035], [0.022, 0.05], [0, 0.058]], 14, 1);
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(u[0] * side, 0, u[1] * side));
		bag.add('brass', geo, new THREE.Matrix4().compose(new THREE.Vector3(...c), q, new THREE.Vector3(1, 1, 1)));
	}
}

/** level k's walls and doors */
function bd_rooms(bag, k) {
	const bays = bd_bays(k), g = LEVELS[k].g;
	const y0 = bd_floor(k) - 0.02, top = bd_ceil(k) + 0.02, fy = bd_floor(k);
	const T = 0.075;
	const DOOR = { sp: 1.85, ap: 2.3 };
	// how deep a face (d ↦ [x, z]) runs before the shell meets the floor
	const deepest = (F) => {
		let lo = 0, hi = 40;
		const r = bd_inR(fy);
		for (let i = 0; i < 36; i++) {
			const m = (lo + hi) / 2, [x, z] = F(m);
			if (x * x + z * z < r * r) lo = m;
			else hi = m;
		}
		return lo;
	};
	const sides = [];
	for (let i = 0; i <= bays.length; i++) {
		const W = bays[i - 1], E = bays[i];
		// face A toward the west bay, face B toward the east one (or the wall's other face at the ends)
		const A = W ? (d) => bd_in(W, -W.w / 2 + T, d) : (d) => bd_in(E, E.w / 2 + T, d);
		const B = E ? (d) => bd_in(E, E.w / 2 - T, d) : (d) => bd_in(W, -W.w / 2 - T, d);
		const xb = W && E ? (W.x1 + E.x0) / 2 : W ? W.x1 : E.x0;
		const gap = W && E ? E.x0 - W.x1 : 0;
		sides.push({ W, E, A, B, xb, rn: Math.max(0.2, gap / 2 + 0.125) });
	}
	for (const w of sides) {
		// each face stops where it meets the shell at the floor
		const dA = deepest(w.A) + 0.03, dB = deepest(w.B) + 0.03, fA = w.A, fB = w.B;
		w.A = (d) => fA(Math.min(d, dA));
		w.B = (d) => fB(Math.min(d, dB));
		const s1 = Math.max(dA, dB), s0 = Math.min(1.3, Math.max(0.4, s1 - 0.3));
		// a door from a stair hall to the room beside it, in front of the stair's hole
		const ops = [], leaves = [];
		for (const [hall, other, sgn] of [[w.W, w.E, 1], [w.E, w.W, -1]]) {
			if (!hall || !other || hall.rooms[0].kind !== 'stair') continue;
			const front = bd_holeFront(hall, k) - 0.1;
			if (front - 1.5 < 1.0) continue;
			const dc = Math.min(3.0, (1.5 + front) / 2), wide = other.rooms[0].kind === 'hall' ? 1.4 : 0.9;
			const r = bd_roomAt(other, dc);
			if (!r || r.kind === 'stair') continue;
			ops.push([dc - wide / 2, dc + wide / 2, wide > 1 ? 1.6 : DOOR.sp, DOOR.ap]);
			leaves.push({ other, sgn, dc, wide });
		}
		bd_wall(bag, w.A, w.B, s0, s1, y0, top, { openings: ops });
		// the leaves open into the room beside the hall, hinged on the jamb nearer the glass
		for (const { other, sgn, dc, wide } of leaves) {
			const face = sgn > 0 ? w.B : w.A;
			const a = face(dc - wide / 2), b = face(dc + wide / 2);
			const into = sgn > 0 ? bd_in(other, other.w / 2 - 1, dc) : bd_in(other, -other.w / 2 + 1, dc);
			let u = [b[0] - a[0], b[1] - a[1]];
			const lu = Math.hypot(...u);
			u = [u[0] / lu, u[1] / lu];
			let n = [into[0] - a[0], into[1] - a[1]];
			const dn = n[0] * u[0] + n[1] * u[1];
			n = [n[0] - dn * u[0], n[1] - dn * u[1]];
			const ln = Math.hypot(...n);
			n = [n[0] / ln, n[1] / ln];
			if (wide > 1) {
				bd_door(bag, a, u, n, fy, wide / 2, wide, 1.6, DOOR.ap);
				const u2 = [-u[0], -u[1]];
				bd_door(bag, b, u2, n, fy, wide / 2, wide, 1.6, DOOR.ap);
			} else bd_door(bag, a, u, n, fy, wide, wide, DOOR.sp, DOOR.ap);
		}
		// its nose at the glass: a round pier of radius rn flaring into the wall
		const C = bd_on(g, w.xb, 0.07 + w.rn);
		const l = Math.hypot(1, w.xb / RHO), al = [1 / l, -w.xb / RHO / l], inn = [w.xb / RHO / l, 1 / l];
		const ctrl = [w.A(s0 + 0.35), w.A(s0)];
		for (let i = 0; i <= 6; i++) {
			const f = Math.PI + (Math.PI * i) / 6;
			ctrl.push([C[0] + al[0] * w.rn * Math.cos(f) + inn[0] * w.rn * Math.sin(f), C[1] + al[1] * w.rn * Math.cos(f) + inn[1] * w.rn * Math.sin(f)]);
		}
		ctrl.push(w.B(s0), w.B(s0 + 0.35));
		const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
		const pts = curve.getPoints(40).map((p) => [p.x, p.z]);
		// keep what lies between A(s0) and B(s0)
		const ia = pts.findIndex((p) => Math.hypot(p[0] - ctrl[1][0], p[1] - ctrl[1][1]) < 0.02);
		const ib = pts.length - 1 - pts.slice().reverse().findIndex((p) => Math.hypot(p[0] - ctrl[ctrl.length - 2][0], p[1] - ctrl[ctrl.length - 2][1]) < 0.02);
		const nose = pts.slice(Math.max(0, ia), ib + 1);
		const soup = new bd_Soup();
		const ctr = [(w.A(s0)[0] + w.B(s0)[0]) / 2, (w.A(s0)[1] + w.B(s0)[1]) / 2];
		for (let i = 0; i < nose.length - 1; i++) {
			const p = nose[i], q = nose[i + 1];
			const m = [(p[0] + q[0]) / 2 - ctr[0], 0, (p[1] + q[1]) / 2 - ctr[1]];
			soup.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], top, q[1]], [p[0], top, p[1]], m);
		}
		bag.add('plaster', soup.geometry(0.9), null, { uv: 'box' });
	}
	// the cross walls of each bay: between its rooms, and behind its last room where that stops short of the shell
	for (const b of bays) {
		for (let i = 0; i < b.rooms.length; i++) {
			const r = b.rooms[i], prev = b.rooms[i - 1];
			const walls = [];
			if (prev) walls.push({ d: r.d0, from: prev, to: r });
			if (i === b.rooms.length - 1 && r.d1 < deepAt(k, b.x) - 0.05) walls.push({ d: r.d1, from: r, to: null });
			for (const { d, from, to } of walls) {
				const A = (s) => bd_in(b, s, d - T), B = (s) => bd_in(b, s, d + T);
				let o0, o1;
				if (from.kind === 'suite' || from.kind === 'bath') (o0 = b.w / 2 - 1.4), (o1 = b.w / 2 - 0.5);
				else if (from.kind === 'hall') (o0 = -1.1), (o1 = 1.1);
				else (o0 = -0.45), (o1 = 0.45);
				// (the hall's: the way in from the north gate, 2.2 m wide and 2.75 m high)
				const wide = o1 - o0, sp = wide > 2 ? 1.95 : wide > 1 ? 1.6 : DOOR.sp, ap = wide > 2 ? 2.75 : DOOR.ap;
				// a back wall has a door only where there is a room's worth behind it (a store behind a lounge)
				if (!to && deepAt(k, b.x) - d < 2.5) {
					bd_wall(bag, A, B, -b.w / 2, b.w / 2, y0, top, {});
					continue;
				}
				bd_wall(bag, A, B, -b.w / 2, b.w / 2, y0, top, { openings: [[o0, o1, sp, ap]] });
				// the leaf: hinged on the jamb at local x o1, opened into the room behind (deeper)
				const H = bd_in(b, o1, d + T), Hn = bd_in(b, o1, d + T + 1), Hu = bd_in(b, o0, d + T);
				const u = [(Hu[0] - H[0]) / wide, (Hu[1] - H[1]) / wide], n = [Hn[0] - H[0], Hn[1] - H[1]];
				if (wide > 1) {
					bd_door(bag, H, u, n, fy, wide / 2, wide, sp, ap);
					bd_door(bag, Hu, [-u[0], -u[1]], n, fy, wide / 2, wide, sp, ap);
				} else bd_door(bag, H, u, n, fy, wide, wide, sp, ap);
			}
		}
	}
}

/* ---- 5. THE TERRACES: Geoship rails of oak slats on slim white posts, built-in curved planters with plants ---- */

/** one slim white post, 1 m tall, its foot at the origin: placed (and stretched) wherever a rail needs one */
let bd_POST = null;
const bd_postTpl = () => (bd_POST ??= boxUV(new THREE.CylinderGeometry(0.019, 0.021, 1, 8, 1).translate(0, 0.5, 0), TILE.ceramic));

/**
 * A rail along a path ([x, y, z]: y the floor under it, or a stair's line of nosings): slim white posts every ~1.2 m
 * and at its ends, standing from `foot` (the upstand's top) to the handrail, oak slats at `slats` and a rounded oak
 * handrail at `hand` over the path, all following it.
 */
function bd_rail(bag, path, o = {}) {
	const foot = o.foot ?? bd_UP, hand = o.hand ?? bd_HAND, slats = o.slats ?? bd_SLATS;
	const L = [0];
	for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]));
	const total = L[L.length - 1];
	if (total < 0.1) return;
	const along = (s) => {
		let i = 1;
		while (i < L.length - 1 && L[i] < s) i++;
		const t = clamp((s - L[i - 1]) / (L[i] - L[i - 1] || 1));
		return [0, 1, 2].map((j) => lerp(path[i - 1][j], path[i][j], t));
	};
	const n = Math.max(1, Math.round(total / 1.2)), tpl = bd_postTpl();
	for (let i = 0; i <= n; i++) {
		const p = along((total * i) / n);
		bag.add('ceramic', tpl.clone(), new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1] + foot - 0.02, p[2]), new THREE.Quaternion(), new THREE.Vector3(1, hand - foot + 0.02, 1)));
	}
	for (const s of slats) bag.add('oak', bd_sweep(path.map(([x, y, z]) => [x, y + s, z]), bd_rr(0.03, 0.05, 0.012, 0, 0, 1), { tile: TILE.oak }));
	bag.add('oak', bd_sweep(path.map(([x, y, z]) => [x, y + hand, z]), bd_rr(0.068, 0.046, 0.021, 0, 0, 2), { tile: TILE.oak, caps: true }));
}
/** points along the curve g, `o` in, from x0 to x1 at height y, every ~step metres */
function bd_line(g, o, x0, x1, y, step = 0.6) {
	const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step)), pts = [];
	for (let i = 0; i <= n; i++) {
		const [x, z] = bd_on(g, lerp(x0, x1, i / n), o);
		pts.push([x, y, z]);
	}
	return pts;
}

/**
 * A built-in planter's section ([o, y] round it): 0.6 m deep, 0.5 m high, its rim rounded, a dip for the soil 7 cm
 * below the rim (the soil itself laid separately).
 */
const bd_PLANTER = [[-0.3, 0], [0.3, 0], [0.3, 0.44], ...bd_tail(bd_arc(0.24, 0.44, 0.06, 0, Math.PI / 2, 3)), [0.2, 0.5], ...bd_tail(bd_arc(0.2, 0.47, 0.03, Math.PI / 2, Math.PI, 2)), [0.17, 0.42], [-0.17, 0.42], [-0.17, 0.47], ...bd_tail(bd_arc(-0.2, 0.47, 0.03, 0, Math.PI / 2, 2)), [-0.24, 0.5], ...bd_tail(bd_arc(-0.24, 0.44, 0.06, Math.PI / 2, Math.PI, 3))];
/** a planter along a path ([x, y, z], its middle line on the floor), its soil, and the plants of `kinds` along it */
function bd_planter(bag, dome, path, kinds, seed) {
	bag.add('plaster', bd_sweep(path, bd_PLANTER.map(([o, y]) => [o, y]), { caps: true, tile: TILE.plaster }));
	bag.add('soil', bd_sweep(path, [[0.175, 0.435], [-0.175, 0.435]], { closed: false, face: 0, tile: TILE.soil }), null);
	// the plants, spaced along it
	const r = chance('bd-planter', seed);
	for (let i = 0; i < kinds.length; i++) {
		const [kind, s0, s1] = kinds[i];
		const t = (i + 0.5) / kinds.length, f = t * (path.length - 1), j = Math.min(path.length - 2, Math.floor(f));
		const p = [0, 1, 2].map((c) => lerp(path[j][c], path[j + 1][c], f - j));
		dome.plant(kind, +p[0].toFixed(3), +(p[1] + 0.435).toFixed(3), +p[2].toFixed(3), { stage: Math.round(between(r, s0, s1)), seed: `${seed}-${i}`, turn: +(r() * TAU).toFixed(2) });
	}
}
/** the plants of the terraces' planters, by turns: a shrub in the middle of herbs and creepers */
const bd_BEDS = [
	[['nasturtium', 4, 5], ['coffee', 4, 5], ['strawberry', 4, 5]],
	[['basil', 4, 5], ['banana', 3, 4], ['nasturtium', 4, 5]],
	[['strawberry', 4, 5], ['pepper', 4, 5], ['basil', 4, 5]],
	[['nasturtium', 4, 5], ['banana', 3, 4], ['pepper', 4, 5]],
	[['basil', 4, 5], ['coffee', 4, 5], ['strawberry', 4, 5]]
];

/** slab k's terrace: its rail (broken where the grand stair lands) and its planters along the edge */
function bd_terrace(bag, dome, k) {
	const y = bd_floor(k), g = bd_edgeG(k);
	const xr = bd_meet(g, -0.08, bd_inR(y + bd_HAND, 0.12));
	const [ga, gb] = bd_gsGap(k);
	for (const [x0, x1] of [[-xr, ga], [gb, xr]]) bd_rail(bag, bd_line(g, -0.08, x0, x1, y, 1.0));
	if (k === 4) return;
	// planters every ~9 m along the edge, clear of the grand stair and of the ends under the shell
	const xs = [];
	for (let x = 9; x < xr - 3.5; x += 9) xs.push(-x, x);
	xs.sort((a, b) => a - b).forEach((x, i) => {
		const path = bd_line(g, 0.33, x - 1.3, x + 1.3, y, 0.45);
		bd_planter(bag, dome, path, bd_BEDS[(i + k * 2) % bd_BEDS.length], `t${k}-${i}`);
	});
}

/* ---- 6. THE SPIRAL STAIRS: open oak treads round a slim oak column, a white helical stringer, a slatted rail ---- */

/** a spiral stair's flights: for each, its first tread's turn ψ, its floor, its risers and their height */
function bd_spFlights() {
	const L = bd_SP.land / 2, out = [];
	for (let k = 0; k < 4; k++) {
		const ya = bd_floor(k), yb = bd_floor(k + 1), n = Math.round((yb - ya) / 0.175);
		// it ends where the landing of level k + 1 begins (−L, a turn up each level)
		const end = -L + k * TAU;
		out.push({ k, ya, yb, n, h: (yb - ya) / n, psi0: end - (n - 1) * bd_SP.step, end });
	}
	return out;
}
/** the line of a spiral stair's nosings at its turn ψ (flat over each landing) */
function bd_spLine(F, psi) {
	for (const f of F) {
		if (psi < f.psi0) return f.ya;
		if (psi <= f.end) return f.ya + f.h * (1 + (psi - f.psi0) / bd_SP.step);
		if (psi <= f.end + bd_SP.land) return f.yb;
	}
	return F[F.length - 1].yb;
}

/** one spiral stair: from the ground (0.12) to the sky garden, landing on every level's floor */
function bd_spiral(bag, s) {
	const sg = s.x > 0 ? 1 : -1, SP = bd_SP, F = bd_spFlights();
	const P3 = (psi, r, y) => {
		const [x, z] = bd_spP(s, psi, r);
		return [x, y, z];
	};
	// the tread: a sector of oak 45 mm thick from the column to the stringer, its nosing over the tread below
	// (and its back a degree under the next, so no slit opens between a flight's last tread and its landing)
	const ov = (1.6 * Math.PI) / 180, back = Math.PI / 180, half = SP.step / 2, out = [];
	for (let i = 0; i <= 2; i++) out.push([SP.col + 0.004, -half - ov + ((SP.step + ov + back) * i) / 2]);
	for (let i = 6; i >= 0; i--) out.push([SP.tread, -half - ov + ((SP.step + ov + back) * i) / 6]);
	const outline = out.map(([r, f]) => [r * Math.cos(sg * f), -r * Math.sin(sg * f)]);
	const tread = boxUV(bd_slab(outline, 0.045, 0.012, (u, v, w) => [u, w - 0.045, v], 2), TILE.oak);
	for (const f of F)
		for (let i = 1; i < f.n; i++) {
			const mid = f.psi0 + (i - 0.5) * SP.step, b = bd_spB(s, mid);
			bag.add('oak', tread.clone(), at(s.x, f.ya + i * f.h, s.z, b - Math.PI / 2));
		}
	// the column: slim oak, a collar at its foot, a rounded cap over the top landing
	const top = ROOF + 1.02;
	bag.add('oak', lathe([[0, 0.1], [0.14, 0.1], [0.14, 0.15], [0.12, 0.18], [0.1, 0.22], [SP.col, 0.27], [SP.col, top - 0.06], [0.1, top - 0.03], [0.085, top + 0.01], [0, top + 0.03]], 20, TILE.oak), at(s.x, 0.02, s.z));
	// the stringer: a smooth white band at the treads' outer ends, 0.28 m over the nosings and 0.42 m under them, rising
	// with them; over each landing it narrows into the slab's own thickness (its top under the floor), so one steps
	// off the landing over it
	const psiA = F[0].psi0 - 0.25, psiB = F[3].end + SP.land - 0.05;
	const onLanding = (psi) => (F.some((f) => psi > f.end && psi < f.end + SP.land) ? 1 : 0);
	const ease = (fn, psi) => {
		let v = 0;
		for (let j = -4; j <= 4; j++) v += fn(psi + (j * 1.5 * Math.PI) / 180) / 9;
		return v;
	};
	const rows = [];
	const n = Math.ceil((psiB - psiA) / ((4 * Math.PI) / 180));
	const corner = bd_rr(0.06, 0.06, 0.03, 0, 0, 3);
	for (let i = 0; i <= n; i++) {
		const psi = lerp(psiA, psiB, i / n);
		const y = Math.max(bd_floor(0) - 0.1, ease((p) => bd_spLine(F, p), psi)), t = ease(onLanding, psi);
		const top = y + lerp(0.28, -0.04, t), bot = y + lerp(-0.42, -0.34, t);
		const b = bd_spB(s, psi), ux = Math.sin(b), uz = Math.cos(b);
		// the section: a rounded rectangle 0.06 thick from bot to top (its corners those of a 6 cm square)
		const sec = corner.map(([u, v]) => [SP.band + u, v > 0 ? top - 0.03 + v : bot + 0.03 + v]);
		rows.push(sec.map(([r, yy]) => [s.x + r * ux, yy, s.z + r * uz]));
	}
	bag.add('plaster', bd_grid(sg > 0 ? rows : rows.reverse(), TILE.plaster, 1, true), null);
	// the rail over each flight: posts on the band, slats and a handrail following the nosings
	for (const f of F) {
		const pts = [];
		const m = Math.ceil((f.end - f.psi0) / ((7.5 * Math.PI) / 180));
		for (let i = 0; i <= m; i++) {
			const psi = lerp(f.psi0, f.end, i / m);
			pts.push(P3(psi, SP.band, bd_spLine(F, psi)));
		}
		bd_rail(bag, pts, { foot: 0.26, slats: [0.42, 0.57, 0.72], hand: 0.92 });
	}
	// round each hole at every level above: a guard of the same rail on the slab's upstand, open over the landing
	for (let k = 1; k <= 4; k++) {
		const y = bd_floor(k), L = SP.land / 2, pts = [];
		for (let i = 0; i <= 36; i++) pts.push(P3(L + 0.02 + ((TAU - 2 * L - 0.04) * i) / 36, SP.hole - 0.08, y));
		bd_rail(bag, pts);
	}
}

/* ---- 7. THE GRAND STAIR: wide curved flights up the terraces from the plaza to the sky garden ---- */

/**
 * Each flight a crescent convex to the garden: oak treads with rounded nosings on white risers, solid curved white
 * balustrade walls 0.9 m over the nosings capped by a rounded oak handrail, a smooth white soffit under it, and a
 * curved landing at its head onto the next slab. The plaza's flight flares at its foot.
 */
function bd_grand(bag) {
	for (const s of bd_GSPEC) {
		const { R, dphi, phi0, phi1, n, h, ya, yb, cx, cz, dir } = s;
		const beta = (phi) => Math.atan2(dir * Math.sin(phi), -Math.cos(phi));
		// the treads: a template for the plain ones (its grain along it, across the flight), the flared ones each
		const ov = 0.03 / R;
		const treadAt = (hwi) => {
			const out = [];
			for (let i = 0; i <= 3; i++) out.push([R - s.hw - 0.02, -dir * (-dphi / 2 - ov + ((dphi + ov) * i) / 3)]);
			for (let i = 3; i >= 0; i--) out.push([R + hwi + 0.02, -dir * (-dphi / 2 - ov + ((dphi + ov) * i) / 3)]);
			const outline = out.map(([r, d]) => [r * Math.cos(d), -r * Math.sin(d)]);
			return boxUV(bd_slab(outline, 0.045, 0.014, (u, v, w) => [u, w - 0.045, v], 2), TILE.oak);
		};
		const plain = treadAt(s.hw);
		for (let i = 1; i < n; i++) {
			const pm = phi0 + (i - 0.5) * dphi, hwi = s.half(pm);
			const geo = hwi > s.hw + 0.01 ? treadAt(hwi) : plain.clone();
			bag.add('oak', geo, at(cx, ya + i * h, cz, beta(pm) - Math.PI / 2));
		}
		// the risers: white, under each nosing, set back 3 cm
		const ris = new bd_Soup();
		for (let i = 1; i < n; i++) {
			const p = phi0 + (i - 1) * dphi + 0.03 / R;
			const a = s.P(p, R - s.hw - 0.02), b = s.P(p, R + s.half(p) + 0.02);
			const y0 = i === 1 ? ya - 0.01 : ya + (i - 1) * h, y1 = ya + i * h - 0.045;
			const back = s.P(p + 0.1, R);
			ris.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [s.P(p, R)[0] - back[0], 0, s.P(p, R)[1] - back[1]]);
		}
		bag.add('plaster', ris.geometry(0.3), null, { uv: 'box' });
		// the line it follows, smoothed so its walls and soffit ease into the landing
		const sm = (phi) => {
			let y = 0;
			for (let j = -3; j <= 3; j++) y += s.line(phi + j * dphi * 0.5) / 7;
			return y;
		};
		const steps = (p0, p1) => {
			const m = Math.max(2, Math.ceil((p1 - p0) / (dphi / 2))), out = [];
			for (let i = 0; i <= m; i++) out.push(lerp(p0, p1, i / m));
			return out;
		};
		// the walls: 0.12 thick, from under the soffit to 0.9 m over the nosings, their tops rounded, oak caps on them
		for (const [side, p1] of [[-1, s.phiI], [1, s.phiL]]) {
			const path = steps(phi0 - dphi, p1).map((p) => {
				const [x, z] = s.P(p, R + side * (s.half(p, side) + 0.06));
				return [x, sm(p), z];
			});
			const pth = dir < 0 ? path : path.slice().reverse();
			bag.add('plaster', bd_sweep(pth, bd_rr(0.12, 1.36, 0.05, 0, 0.9 - 0.68 - 0.02, 2), { caps: true, tile: TILE.plaster }));
			bag.add('oak', bd_sweep(pth.map(([x, y, z]) => [x, y + 0.9, z]), bd_rr(0.15, 0.06, 0.026, 0, 0, 2), { caps: true, tile: TILE.oak }));
			// a round newel where the wall starts: a white drum flared at its foot, an oak cap the handrail ends on
			const [nx, ny, nz] = path[0], top = ny + 0.9;
			bag.add('plaster', lathe([[0, ya - 0.02], [0.17, ya - 0.02], [0.17, ya + 0.03], [0.14, ya + 0.06], [0.122, ya + 0.11], [0.113, ya + 0.18], [0.11, ya + 0.26], [0.11, top - 0.03], [0, top - 0.03]], 24, TILE.plaster), at(nx, 0, nz), { uv: 'box' });
			bag.add('oak', lathe([[0, top - 0.04], [0.12, top - 0.04], ...bd_tail(bd_arc(0.1, top + 0.0, 0.035, -Math.PI / 2, Math.PI / 2, 4)), [0.06, top + 0.05], [0, top + 0.055]], 24, TILE.oak), at(nx, 0, nz));
		}
		// the soffit: a smooth white surface under the flight and its landing, between the walls
		const rows = steps(phi0 - dphi * 0.5, s.phiL).map((p) => {
			const y = sm(p) - 0.4;
			return (dir > 0 ? [-1, 1] : [1, -1]).map((sd) => {
				const [x, z] = s.P(p, R + sd * (s.half(p, sd) + 0.06));
				return [x, Math.max(ya - 0.02, y), z];
			});
		});
		bag.add('plaster', bd_grid(rows, TILE.plaster, 0, false), null, { uv: 'box' });
		// the landing: from the flight's head to the next slab's front, an oak deck on a white body
		const clampTo = (pt, o) => {
			const e = bd_on(s.gEnd, pt[0], o)[1];
			return [pt[0], Math.min(pt[1], e)];
		};
		const ring = (o) => {
			const pts = [];
			for (const p of steps(phi1, s.phiL)) pts.push(clampTo(s.P(p, R - s.hw - 0.02), o));
			for (const p of steps(phi1, s.phiL).reverse()) pts.push(clampTo(s.P(p, R + s.hw + 0.02), o));
			return pts;
		};
		bag.add('floor', bd_flat(ring(0.02), [], yb), null, { uv: 'box' });
		bag.add('plaster', bd_slab(ring(0.1), 0.4, 0.04, (u, v, w) => [u, yb - 0.41 + w, v], 2), null, { uv: 'box' });
	}
}

/* ---- 8. THE SKY GARDEN on the roof: an oak deck, rails, curved planters with fruit, a curved bench ---- */

/** a profile ([r, y]) turned round the dome's axis from bearing b0 to b1, its two ends closed */
function bd_ring(prof, b0, b1, tile) {
	const geo = bd_revolve(prof, b0, b1, tile, 1, true).toNonIndexed();
	const caps = new bd_Soup();
	const tris = THREE.ShapeUtils.triangulateShape(prof.map(([r, y]) => new THREE.Vector2(r, y)), []);
	for (const [b, e] of [[b0, -1], [b1, 1]]) {
		const row = prof.map(([r, y]) => [r * Math.sin(b), y, r * Math.cos(b)]);
		const dir = [Math.cos(b) * e * Math.sign(b1 - b0), 0, -Math.sin(b) * e * Math.sign(b1 - b0)];
		for (const [a, c, d] of tris) caps.face(row[a], row[c], row[d], dir);
	}
	const cg = caps.geometry(0.1);
	cg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cg.attributes.position.count * 2), 2));
	return mergeGeometries([geo, cg]);
}

function bd_sky(bag, dome) {
	const y = ROOF;
	// three planters along an arc round the dome's middle, behind the deck's open middle, with fruit trees and herbs
	const beds = [
		{ r: 33.0, a: -0.105, b: 0.105, kinds: [['basil', 4, 5], ['papaya', 8, 9], ['coffee', 5, 6], ['papaya', 6, 7], ['basil', 4, 5]] },
		{ r: 32.6, a: -0.33, b: -0.2, kinds: [['coffee', 5, 6], ['fig', 6, 7], ['basil', 4, 5]] },
		{ r: 32.6, a: 0.2, b: 0.33, kinds: [['basil', 4, 5], ['fig', 5, 6], ['coffee', 5, 6]] }
	];
	beds.forEach((bed, i) => {
		const prof = bd_PLANTER.map(([o, yy]) => [bed.r + o * 1.5, y + yy]);
		bag.add('plaster', bd_ring(prof, bed.a, bed.b, TILE.plaster), null, { uv: 'box' });
		bag.add('soil', bd_revolve([[bed.r - 0.26, y + 0.435], [bed.r + 0.26, y + 0.435]], bed.a + 0.004, bed.b - 0.004, TILE.soil, 0), null);
		const r = chance('bd-sky', i);
		bed.kinds.forEach(([kind, s0, s1], j) => {
			const b = lerp(bed.a, bed.b, (j + 0.5) / bed.kinds.length);
			const rr = bed.r - (kind === 'papaya' ? 0.1 : 0);
			dome.plant(kind, +(rr * Math.sin(b)).toFixed(3), +(y + 0.435).toFixed(3), +(rr * Math.cos(b)).toFixed(3), { stage: Math.round(between(r, s0, s1)), seed: `sky-${i}-${j}`, turn: +(r() * TAU).toFixed(2) });
		});
	});
	// the bench along the middle planter's south face: a white plinth, an oak seat, a white back, all curved
	const r0 = 33.0 - 0.45 - 0.56, a = -0.095, b = 0.095;
	const plinth = [[r0 + 0.05, y - 0.01], [r0 + 0.56, y - 0.01], [r0 + 0.56, y + 0.4], [r0 + 0.05, y + 0.4]];
	bag.add('plaster', bd_ring(plinth, a + 0.004, b - 0.004, TILE.plaster), null, { uv: 'box' });
	const seat = bd_rr(0.56, 0.055, 0.02, r0 + 0.28, y + 0.4 + 0.0275, 2);
	bag.add('oak', bd_ring(seat.slice().reverse(), a, b, TILE.oak), null);
	const back = [[r0 + 0.43, y + 0.43], [r0 + 0.56, y + 0.43], [r0 + 0.56, y + 0.78], ...bd_tail(bd_arc(r0 + 0.5, y + 0.78, 0.06, 0, Math.PI, 4)).map(([rr, yy]) => [rr - 0.01, yy]), [r0 + 0.43, y + 0.74]];
	bag.add('plaster', bd_ring(back, a + 0.002, b - 0.002, TILE.plaster), null, { uv: 'box' });
}

/* ---- the part ---- */

/** THE BUILDING: everything of the north quarter but its furniture, into the bag 'building'; six lamps */
function buildingPart(dome) {
	const bag = dome.bag('building');
	bd_ground(bag);
	for (let k = 1; k <= 4; k++) bd_slab_k(bag, k);
	for (let k = 0; k < 4; k++) {
		bd_facade(bag, k);
		bd_rooms(bag, k);
	}
	for (let k = 1; k <= 4; k++) bd_terrace(bag, dome, k);
	for (const s of STAIRS) bd_spiral(bag, s);
	bd_grand(bag);
	bd_sky(bag, dome);
	// the lamps: the stair halls (their first floors), the three lounges, the dining hall
	// (short reaches: a lamp's light passes walls, so it must not reach the rooms beside)
	for (const s of STAIRS) dome.lamp(s.x, LEVELS[1].y + 3.1, facadeZ(1, s.x) + 2.2, { distance: 3.2, intensity: 4 });
	for (let k = 1; k < 4; k++) dome.lamp(0, LEVELS[k].y + 3.0, facadeZ(k, 0) + 3.2, { distance: 4.5 });
	dome.lamp(0, 3.5, facadeZ(0, 0) + 5, { distance: 6.5 });
}
