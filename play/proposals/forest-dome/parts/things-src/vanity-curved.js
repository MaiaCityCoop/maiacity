/*
 * VANITY, CURVED — a wall-hung bathroom vanity (a wall piece: its back against z = 0): an oiled-oak cabinet 1.40 m wide,
 * 0.50 m deep, 0.445 m high, hung 0.38 m off the floor (a usual wall-hung vanity: 0.45–0.55 m deep, its top at 0.82–0.90
 * m; here 0.86 m), its plan a soft D (a superellipse, exponent 3.5) so its ends are rounded and its front gently bowed;
 * two curved doors of 19 mm oak with their grain running up, 3 mm gaps, brass edge pulls; a 35 mm travertine top
 * overhanging 12 mm with a rounded edge, an undermounted round glazed basin Ø 0.38 m (0.17 m deep) with a brass waste;
 * a wall-mounted brass spout and mixer above it; a stadium mirror 1.00 × 0.60 m in a slim brass edge; two pill-shaped
 * opal glass sconces (0.10 × 0.34 m) on brass back plates either side of it, a slim brass rod down the face of each.
 * Origin: the floor at the wall, under the cabinet's middle; the cabinet comes out toward +z.
 */

/* ---- the shapes it is made with (builder C's helpers, the same in each of its things) ---- */

/**
 * The smooth normals of a grid of points (`pts[i * cols + j]`, rows × cols), round its seams where it wraps; a row or a
 * column whose points all meet (a pole) shares one normal.
 */
function t_gridNormals(pts, rows, cols, wrapI, wrapJ) {
	const ix = (i, j) => (wrapI ? mod(i, rows) : i) * cols + (wrapJ ? mod(j, cols) : j);
	const nor = pts.map(() => new THREE.Vector3());
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
	for (let i = 0; i < (wrapI ? rows : rows - 1); i++)
		for (let j = 0; j < (wrapJ ? cols : cols - 1); j++) {
			const a = ix(i, j), b = ix(i + 1, j), c = ix(i, j + 1), d = ix(i + 1, j + 1);
			for (const [p, q, r] of [[a, b, c], [b, d, c]]) {
				f.crossVectors(e1.subVectors(pts[q], pts[p]), e2.subVectors(pts[r], pts[p]));
				nor[p].add(f);
				nor[q].add(f);
				nor[r].add(f);
			}
		}
	const pole = (list) => {
		if (list.some((k) => pts[k].distanceToSquared(pts[list[0]]) > 1e-12)) return;
		const s = new THREE.Vector3();
		for (const k of list) s.add(nor[k]);
		for (const k of list) nor[k].copy(s);
	};
	for (let i = 0; i < rows; i++) pole(Array.from({ length: cols }, (_, j) => i * cols + j));
	for (let j = 0; j < cols; j++) pole(Array.from({ length: rows }, (_, i) => i * cols + j));
	for (const n of nor) n.normalize();
	return nor;
}

/**
 * A surface as a grid of points: `P(i, j)` → [x, y, z] for i < rows (along) and j < cols (across), its normals smooth
 * over the grid and round a seam where it wraps (`wrapI`, `wrapJ`: the seam's points are made twice so its texture can
 * close: `uv(i, j)` is asked for i = rows or j = cols there too). Its faces look along ∂P/∂i × ∂P/∂j; `flip` turns them.
 */
function t_grid(rows, cols, P, o = {}) {
	const { wrapI = false, wrapJ = false, flip = false } = o;
	const uvf = o.uv ?? ((i, j) => [j / cols, i / rows]);
	const pts = [];
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(new THREE.Vector3(...P(i, j)));
	const nor = t_gridNormals(pts, rows, cols, wrapI, wrapJ);
	const R = wrapI ? rows + 1 : rows, W = wrapJ ? cols + 1 : cols;
	const pos = new Float32Array(R * W * 3), nrm = new Float32Array(R * W * 3), uv = new Float32Array(R * W * 2);
	const sg = flip ? -1 : 1;
	for (let i = 0, k = 0; i < R; i++)
		for (let j = 0; j < W; j++, k++) {
			const s = (i % rows) * cols + (j % cols);
			pos[k * 3] = pts[s].x;
			pos[k * 3 + 1] = pts[s].y;
			pos[k * 3 + 2] = pts[s].z;
			nrm[k * 3] = nor[s].x * sg;
			nrm[k * 3 + 1] = nor[s].y * sg;
			nrm[k * 3 + 2] = nor[s].z * sg;
			const [u, v] = uvf(i, j);
			uv[k * 2] = u;
			uv[k * 2 + 1] = v;
		}
	const idx = [];
	for (let i = 0; i < R - 1; i++)
		for (let j = 0; j < W - 1; j++) {
			const a = i * W + j, b = a + W, c = a + 1, d = b + 1;
			if (flip) idx.push(a, c, b, b, c, d);
			else idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/**
 * A flat face over a closed ring of points (and its holes), facing `normal`: the ring triangulated, each triangle turned
 * to face that way; `uvf(p)` its UVs.
 */
function t_cap(ring, holes, normal, uvf) {
	const N = new THREE.Vector3(...normal).normalize();
	const e1 = new THREE.Vector3(...(Math.abs(N.y) < 0.9 ? [0, 1, 0] : [1, 0, 0])).cross(N).normalize();
	const e2 = N.clone().cross(e1);
	const V = (p) => (p.isVector3 ? p : new THREE.Vector3(...p));
	const R = ring.map(V), H = holes.map((h) => h.map(V));
	const all = [R, ...H].flat();
	const flat = (list) => list.map((p) => new THREE.Vector2(p.dot(e1), p.dot(e2)));
	const tri = THREE.ShapeUtils.triangulateShape(flat(R), H.map(flat));
	const pos = [], nrm = [], uv = [], idx = [];
	for (const p of all) {
		pos.push(p.x, p.y, p.z);
		nrm.push(N.x, N.y, N.z);
		uv.push(...uvf(p));
	}
	const a = new THREE.Vector3(), b = new THREE.Vector3();
	for (const [i, j, k] of tri) {
		a.subVectors(all[j], all[i]);
		b.subVectors(all[k], all[i]);
		if (a.cross(b).dot(N) >= 0) idx.push(i, j, k);
		else idx.push(i, k, j);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/** shapes merged into one (each given its index first, so they can merge) */
function t_merge(list) {
	return mergeGeometries(list.filter(Boolean).map((g) => plain(g)));
}

/** the signed area of a plan [x, z] (positive: counter-clockwise with x right and z up) */
function t_area(plan) {
	let s = 0;
	for (let i = 0; i < plan.length; i++) {
		const [x0, z0] = plan[i], [x1, z1] = plan[(i + 1) % plan.length];
		s += x0 * z1 - x1 * z0;
	}
	return s / 2;
}

/** the outward normal at each point of a plan [x, z] (counter-clockwise), lengthened at a corner so an inset stays parallel */
function t_planNormals(plan) {
	const n = plan.length, out = [];
	const edge = (p, q) => {
		const x = q[1] - p[1], z = -(q[0] - p[0]), l = Math.hypot(x, z);
		return l > 1e-9 ? [x / l, z / l] : [0, 0];
	};
	for (let i = 0; i < n; i++) {
		const a = edge(plan[mod(i - 1, n)], plan[i]), b = edge(plan[i], plan[(i + 1) % n]);
		let x = a[0] + b[0], z = a[1] + b[1];
		const l = Math.hypot(x, z) || 1;
		x /= l;
		z /= l;
		const c = Math.max(a[0] * x + a[1] * z, b[0] * x + b[1] * z);
		const k = 1 / Math.max(0.35, c);
		out.push([x * k, z * k]);
	}
	return out;
}

/** a worked edge's profile: [inset, y] from the bottom face round a radius `r` up the side and round onto the top face */
function t_edge(y0, y1, r, seg = 4, r1 = r) {
	const p = [];
	if (r > 0) for (let k = 0; k <= seg; k++) {
		const a = (k / seg) * (Math.PI / 2);
		p.push([r - r * Math.sin(a), y0 + r - r * Math.cos(a)]);
	}
	else p.push([0, y0]);
	if (r1 > 0) for (let k = 0; k <= seg; k++) {
		const a = (k / seg) * (Math.PI / 2);
		p.push([r1 - r1 * Math.cos(a), y1 - r1 + r1 * Math.sin(a)]);
	}
	else p.push([0, y1]);
	return p;
}

/**
 * A plan raised: `plan` the outline's points [x, z] (closed, either way round; a point given twice makes a crisp
 * corner), `prof` its profile from the bottom face round to the top face as [inset, y] (t_edge: a worked edge), flat
 * faces closing the first and last rings; `o.holes` outlines cut through it (with `o.holeProf`). UVs in metres over
 * `o.tile`: the sides along the outline and up (`o.grain: 'up'` turns them, for wood whose grain runs up), the faces by
 * x and z (`o.faceGrain: 'z'` turns them).
 */
function t_prism(plan, prof, o = {}) {
	const tile = o.tile ?? 1;
	const outline = (pl, sign) => (Math.sign(t_area(pl)) === sign ? pl : pl.slice().reverse());
	const outer = outline(plan, 1);
	const holes = (o.holes ?? []).map((h) => outline(h, -1));
	const geos = [];
	const ring = (pl, nr, d, y) => pl.map(([x, z], j) => new THREE.Vector3(x - nr[j][0] * d, y, z - nr[j][1] * d));
	const side = (pl, pf) => {
		const nr = t_planNormals(pl);
		const len = [0];
		for (let j = 1; j <= pl.length; j++) len.push(len[j - 1] + Math.hypot(pl[j % pl.length][0] - pl[j - 1][0], pl[j % pl.length][1] - pl[j - 1][1]));
		const rings = pf.map(([d, y]) => ring(pl, nr, d, y));
		geos.push(t_grid(pf.length, pl.length, (i, j) => rings[i][j].toArray(), { wrapJ: true, uv: (i, j) => (o.grain === 'up' ? [pf[i][1] / tile, len[j] / tile] : [len[j] / tile, pf[i][1] / tile]) }));
		return [rings[0], rings[pf.length - 1]];
	};
	const [ob, ot] = side(outer, prof);
	const hp = o.holeProf ?? prof;
	const hr = holes.map((h) => side(h, hp));
	const fuv = (p) => (o.faceGrain === 'z' ? [p.z / tile, p.x / tile] : [p.x / tile, p.z / tile]);
	if (o.top !== false) geos.push(t_cap(ot, hr.map((h) => h[1]), [0, 1, 0], fuv));
	if (o.bottom !== false) geos.push(t_cap(ob, hr.map((h) => h[0]), [0, -1, 0], fuv));
	return t_merge(geos);
}

/**
 * A cross-section swept along a path: `path` points [x, y, z]; `shape` the section's points [s, t] counter-clockwise (s
 * to the path's side, t towards `o.up`), closed round; its ends capped unless the path is closed. UVs: u along the path
 * and v round the section, in metres over `o.tile`.
 */
function t_sweep(path, shape, o = {}) {
	const { closed = false, tile = 1, caps = true } = o;
	const n = path.length, m = shape.length;
	const P = path.map((p) => new THREE.Vector3(...p));
	const U = new THREE.Vector3(...(o.up ?? [0, 1, 0]));
	const fr = P.map((p, i) => {
		const a = closed ? P[mod(i - 1, n)] : P[Math.max(0, i - 1)], b = closed ? P[mod(i + 1, n)] : P[Math.min(n - 1, i + 1)];
		const t = b.clone().sub(a).normalize();
		const side = t.clone().cross(U).normalize();
		return { t, side, up: side.clone().cross(t).normalize() };
	});
	const along = [0];
	for (let i = 1; i <= n; i++) along.push(along[i - 1] + P[i % n].distanceTo(P[i - 1]));
	const round = [0];
	for (let j = 1; j <= m; j++) round.push(round[j - 1] + Math.hypot(shape[j % m][0] - shape[j - 1][0], shape[j % m][1] - shape[j - 1][1]));
	const pt = (i, s, t) => P[i].clone().addScaledVector(fr[i].side, s).addScaledVector(fr[i].up, t);
	const g = t_grid(n, m, (i, j) => pt(i, ...shape[j]).toArray(), { wrapI: closed, wrapJ: true, uv: (i, j) => [along[i] / tile, round[j] / tile] });
	if (closed || !caps) return g;
	const end = (i, s) => t_cap(shape.map(([a, b]) => pt(i, a, b)), [], fr[i].t.clone().multiplyScalar(s).toArray(), (p) => [p.x / tile, p.y / tile]);
	return t_merge([g, end(0, -1), end(n - 1, 1)]);
}

/**
 * A lathe round y of a profile [r, y] (`seg` sides), its faces outward where the profile runs out and up (`flip` turns
 * them), smooth round; UVs u round (metres at the widest) and v along the profile, over `tile`.
 */
function t_lathe(prof, seg = 32, o = {}) {
	const tile = o.tile ?? 1;
	const len = [0];
	for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
	const wide = Math.max(...prof.map((p) => p[0]));
	return t_grid(prof.length, seg, (i, j) => {
		const a = (j / seg) * TAU, [r, y] = prof[i];
		return [r * Math.cos(a), y, r * Math.sin(a)];
	}, { wrapJ: true, flip: o.flip, uv: (i, j) => [((j / seg) * TAU * wide) / tile, len[i] / tile] });
}

/**
 * A stadium's outline (two half circles joined by straight sides), `len` along x and `wid` along z, centred: points
 * [x, z] counter-clockwise, `seg` round each end and `ns` along each side, so outlines of one stadium inset (len − 2d,
 * wid − 2d) match point for point.
 */
function t_stadium(len, wid, seg = 24, ns = 8) {
	const r = wid / 2, s = len / 2 - r, pts = [];
	for (let k = 0; k < seg; k++) {
		const a = -Math.PI / 2 + (k / seg) * Math.PI;
		pts.push([s + r * Math.cos(a), r * Math.sin(a)]);
	}
	for (let k = 0; k < ns; k++) pts.push([s - (k / ns) * 2 * s, r]);
	for (let k = 0; k < seg; k++) {
		const a = Math.PI / 2 + (k / seg) * Math.PI;
		pts.push([-s + r * Math.cos(a), r * Math.sin(a)]);
	}
	for (let k = 0; k < ns; k++) pts.push([-s + (k / ns) * 2 * s, -r]);
	return pts;
}

/** a superellipse's point at angle `t`: semi-axes a (x) and b (z), exponent n */
function t_super(t, a, b, n) {
	const c = Math.cos(t), s = Math.sin(t);
	return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
}

/** points along a smooth curve through control points [x, y, z]: `per` points to each span between two of them */
function t_curve(points, per = 6, closed = false) {
	const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
	return c.getPoints((points.length - (closed ? 0 : 1)) * per).map((p) => p.toArray()).slice(0, closed ? -1 : undefined);
}

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/** a rounded rectangle's section [s, t] w × h, corners r, counter-clockwise, centred */
function t_rrect(w, h, r, seg = 4) {
	return roundRect(w, h, r, seg);
}

/**
 * Travertine as a top is made: honed and its pores filled, so they read as soft darker flecks rather than holes (the
 * kit's travertine, its pictures shared, its relief eased).
 */
function t_honed() {
	material('c-travertine', TILE.travertine, () => {
		const m = mat('travertine').clone();
		m.normalScale = new THREE.Vector2(0.3, 0.3);
		m.roughness = 1.6;
		return m;
	});
}

/** brushed brass (wastes, a flush plate): the kit's brass, its finish satin, so a flat face reads as brass, not a mirror */
function t_brushed() {
	material('c-brushed', 1, () => Object.assign(mat('brass').clone(), { roughness: 0.42 }));
}

/* ---- the thing ---- */

const THING = {
	id: 'vanity-curved',
	label: 'Curved oak vanity',
	note: 'A wall-hung oak vanity 1.40 × 0.50 m with rounded ends and two curved doors, a travertine top at 0.86 m with an undermounted round basin and a wall-mounted brass tap; above it a 1.00 × 0.60 m stadium mirror in a slim brass edge between two opal pill sconces.'
};

/** the vanity's measures (m) */
const t_V = { a: 0.7, b: 0.5, n: 3.5, y0: 0.38, y1: 0.825, top: 0.86, door: 0.019, doorX: 0.452, basin: [0, 0.27], basinR: 0.19 };

/** the cabinet's front at angle t (0 the right end at the wall, π/2 the middle of the front, π the left end) */
const t_front = (t, grow = 0) => t_super(t, t_V.a + grow, t_V.b + grow, t_V.n);
/** its outward normal there */
function t_frontNormal(t) {
	const p = t_front(t - 1e-4), q = t_front(t + 1e-4);
	const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
	return [dz / l, -dx / l];
}
/** the angle at which the front is at x */
function t_frontAt(x) {
	let lo = 0, hi = Math.PI;
	for (let k = 0; k < 40; k++) {
		const m = (lo + hi) / 2;
		if (t_front(m)[0] > x) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
}
/** angles from t0 to t1 about every `step` metres along the front */
function t_frontSteps(t0, t1, step, grow = 0) {
	const fine = 200, out = [t0];
	let run = 0;
	for (let k = 1; k <= fine; k++) {
		const ta = t0 + ((k - 1) / fine) * (t1 - t0), tb = t0 + (k / fine) * (t1 - t0);
		const [ax, az] = t_front(ta, grow), [bx, bz] = t_front(tb, grow);
		run += Math.hypot(bx - ax, bz - az);
		if (run >= step || k === fine) {
			out.push(tb);
			run = 0;
		}
	}
	if (out.length > 2 && Math.abs(out.at(-1) - out.at(-2)) < 1e-9) out.pop();
	return out;
}
/** a point of the front, set in by d */
const t_frontIn = (t, d) => {
	const [x, z] = t_front(t), [nx, nz] = t_frontNormal(t);
	return [x - nx * d, z - nz * d];
};

/** the cabinet's carcass plan: the D, set back by the doors' thickness where the doors hang (corners crisp) */
function t_carcassPlan() {
	const { doorX, door } = t_V;
	const tR = t_frontAt(doorX + 0.003), tL = t_frontAt(-doorX - 0.003);
	const set = door + 0.002;
	const pl = [[t_V.a, 0], [t_V.a, 0]];
	for (const t of t_frontSteps(0, tR, 0.02).slice(1)) pl.push(t_front(t));
	pl.push(t_front(tR), t_frontIn(tR, set), t_frontIn(tR, set));
	for (const t of t_frontSteps(tR, tL, 0.03).slice(1, -1)) pl.push(t_frontIn(t, set));
	pl.push(t_frontIn(tL, set), t_frontIn(tL, set), t_front(tL), t_front(tL));
	for (const t of t_frontSteps(tL, Math.PI, 0.02).slice(1, -1)) pl.push(t_front(t));
	pl.push([-t_V.a, 0], [-t_V.a, 0]);
	return pl;
}

/** a door's plan: a band of the front from x0 to x1, 19 mm thick, its corners crisp */
function t_doorPlan(x0, x1) {
	const ts = t_frontSteps(t_frontAt(x1), t_frontAt(x0), 0.025);
	const outer = ts.map((t) => t_front(t));
	const inner = ts.map((t) => t_frontIn(t, t_V.door)).reverse();
	return [outer[0], ...outer, outer.at(-1), inner[0], ...inner, inner.at(-1)];
}

/** a wall boss with something coming out of it: a round plate on the wall, its axis along +z */
function t_wallDisc(r, th) {
	const g = t_lathe([[r - 0.002, 0], [r, 0.0005], [r, th - 0.004], [r - 0.0012, th - 0.0012], [r - 0.004, th], [0, th]], 40);
	return g.applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2));
}

/** the wall tap: a spout over the basin and a mixer beside it, each from its own round plate */
function t_tap(bag) {
	const y = 0.995;
	bag.add('brass', t_wallDisc(0.031, 0.009), at(0, y, 0));
	const spout = [[0, y, 0.006], [0, y, 0.12], [0, y - 0.001, 0.178], [0, y - 0.006, 0.199], [0, y - 0.016, 0.211]];
	const path = t_curve(spout, 5);
	bag.add('brass', t_sweep(path, t_circle(0.0095, 18), { up: [1, 0, 0] }));
	const end = new THREE.Vector3(...path.at(-1)), dir = end.clone().sub(new THREE.Vector3(...path.at(-2))).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
	bag.add('shadow', t_lathe([[0, 0], [0.007, 0], [0.007, 0.001], [0, 0.001]], 16), new THREE.Matrix4().compose(end.addScaledVector(dir, 0.0004), q, new THREE.Vector3(1, 1, 1)));
	// the mixer: a plate, a round body, a slim lever
	const mx = 0.17;
	bag.add('brass', t_wallDisc(0.029, 0.009), at(mx, y, 0));
	bag.add('brass', t_lathe([[0.0135, 0], [0.0135, 0.03], [0.012, 0.036], [0.007, 0.039], [0, 0.04]], 28).applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2)), at(mx, y, 0.008));
	bag.add('brass', t_sweep([[0, 0, 0.04], [0.0, 0.018, 0.052], [0, 0.05, 0.06]], t_rrect(0.007, 0.011, 0.003, 3), { up: [1, 0, 0] }), at(mx, y, 0));
}

/** the mirror: a stadium of glass in a slim brass edge, standing 26 mm off the wall */
function t_mirror(bag, cy) {
	const st = t_stadium(1.0, 0.6, 32, 10);
	const ring = st.map(([x, z]) => [x, cy + z, 0.026]);
	bag.add('c-mirror', t_cap(ring, [], [0, 0, 1], (p) => [p.x, p.y]));
	const frame = t_rrect(0.0068, 0.028, 0.0026, 3).map(([s, t]) => [s + 0.0022, t + 0.0175]);
	bag.add('brass', t_sweep(st.map(([x, z]) => [x, cy + z, 0]), frame, { closed: true, up: [0, 0, 1] }));
}

/** a sconce: a pill of opal glass on a brass back plate, its middle at (x, y) */
function t_sconce(bag, x, y) {
	const H = 0.34, Wd = 0.1, dep = 0.045;
	// the brass plate: the pill's outline grown 7 mm, 10 mm thick, its edges eased
	const plate = t_stadium(H + 0.014, Wd + 0.014, 20, 4).map(([a, b]) => [b, a]);
	bag.add('brass', extrude(shapeOf(plate), 0.01, 0.0025, 2, 20), at(x, y, 0));
	// the opal pill: a half capsule standing on the plate
	const out = t_stadium(H, Wd, 24, 6).map(([a, b]) => [b, a]);
	const spine = (p) => [0, clamp(p[1], -(H / 2 - Wd / 2), H / 2 - Wd / 2)];
	const rows = 9;
	const g = t_grid(rows, out.length, (i, j) => {
		const p = out[j], c = spine(p), f = (i / (rows - 1)) * (Math.PI / 2);
		return [x + c[0] + (p[0] - c[0]) * Math.cos(f), y + c[1] + (p[1] - c[1]) * Math.cos(f), 0.0095 + dep * Math.sin(f)];
	}, { wrapJ: true });
	bag.add('c-opal', g);
	// a slim brass rod down its face, held at its ends
	const yr = H / 2 - Wd / 2 + 0.02;
	bag.add('brass', bar([x, y - yr, 0.0095 + dep + 0.006], [x, y + yr, 0.0095 + dep + 0.006], 0.0028, 0.0028, 10));
	for (const s of [-1, 1]) bag.add('brass', bar([x, y + s * yr, 0.0095 + dep + 0.006], [x, y + s * yr, 0.0095 + dep * 0.5], 0.0028, 0.0028, 10));
}

t_honed();
t_brushed();

function thingBuild() {
	const bag = new Bag(THING.id);
	const { y0, y1, top, doorX, basin, basinR } = t_V;
	// the carcass: oak, its ends round, set back where the doors hang
	const plan = t_carcassPlan();
	bag.add('oak', t_prism(plan, t_edge(y0, y1, 0.006, 3, 0), { tile: TILE.oak, grain: 'up', top: false }));
	// its top board, open where the basin drops through
	const under = Array.from({ length: 48 }, (_, k) => [basin[0] + (basinR + 0.01) * Math.cos((k / 48) * TAU), y1, basin[1] + (basinR + 0.01) * Math.sin((k / 48) * TAU)]);
	bag.add('oak', t_cap(plan.map(([x, z]) => [x, y1, z]), [under], [0, 1, 0], (p) => [p.x / TILE.oak, p.z / TILE.oak]));
	// the two doors, bowed with the front, their grain running up
	for (const [x0, x1] of [[-doorX, -0.0015], [0.0015, doorX]]) bag.add('oak', t_prism(t_doorPlan(x0, x1), t_edge(y0 + 0.005, y1 - 0.007, 0.0025, 2), { tile: TILE.oak, grain: 'up' }));
	// brass edge pulls at the doors' inner top corners
	for (const s of [-1, 1]) {
		const t = t_frontAt(s * 0.05), [px, pz] = t_front(t), [nx, nz] = t_frontNormal(t);
		const ry = Math.atan2(nx, nz);
		bag.add('brass', rbox(0.07, 0.03, 0.003, 0.0012, 2), at(px + nx * 0.0016, y1 - 0.022, pz + nz * 0.0016, ry));
		bag.add('brass', rbox(0.07, 0.003, 0.022, 0.0012, 2), at(px - nx * 0.008, y1 - 0.0055, pz - nz * 0.008, ry));
	}
	// the travertine top: the D grown 12 mm, run 14 mm into the wall, its edge rounded; the basin's hole
	const tt = t_frontSteps(0, Math.PI, 0.02, 0.012).map((t) => t_front(t, 0.012));
	const topPlan = [[t_V.a + 0.012, -0.014], [t_V.a + 0.012, -0.014], ...tt, [-t_V.a - 0.012, -0.014], [-t_V.a - 0.012, -0.014]];
	const hole = Array.from({ length: 72 }, (_, k) => [basin[0] + basinR * Math.cos((k / 72) * TAU), basin[1] + basinR * Math.sin((k / 72) * TAU)]);
	bag.add('c-travertine', t_prism(topPlan, t_edge(y1, top, 0.004, 3, 0.013), { tile: TILE.travertine, holes: [hole], holeProf: t_edge(y1, top, 0, 3, 0.008) }));
	// the basin under it: glazed, its bowl falling to a flat floor and a brass waste
	const bowl = [[0, y1 - 0.137], [0.045, y1 - 0.137], [0.09, y1 - 0.134], [0.13, y1 - 0.124], [0.16, y1 - 0.106], [0.178, y1 - 0.08], [0.187, y1 - 0.05], [basinR, y1 - 0.02], [basinR, y1 - 0.0002], [basinR + 0.012, y1 - 0.0002]];
	bag.add('glaze', t_lathe(bowl, 64, { flip: true }), at(basin[0], 0, basin[1]));
	bag.add('c-brushed', t_lathe([[0, y1 - 0.1345], [0.024, y1 - 0.1348], [0.029, y1 - 0.1356], [0.0305, y1 - 0.1366]], 32, { flip: true }), at(basin[0], 0, basin[1]));
	t_tap(bag);
	t_mirror(bag, 1.38);
	for (const s of [-1, 1]) t_sconce(bag, s * 0.665, 1.38);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor at the wall under the middle', back: 'z = 0 (the wall)', top: top, basin: [basin[0], y1 - 0.137, basin[1]] };
	return g;
}

// the sconces' opal glass: the kit's opal, its glow held back so the pill's roundness still reads
material('c-opal', 1, () => Object.assign(mat('opal').clone(), { emissiveIntensity: 1.25 }));
// the mirror's silvered glass: it reflects whatever is round it
material('c-mirror', 1, () => new THREE.MeshStandardMaterial({ color: '#e6e9e5', metalness: 1, roughness: 0.03 }));
