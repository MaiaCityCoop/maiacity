/*
 * BATH TUB, FREESTANDING — an oval freestanding tub of glazed solid surface, 1.70 × 0.80 m and 0.60 m high (a usual
 * double-ended freestanding tub: 1.6–1.8 m long, 0.7–0.85 m wide, 0.55–0.62 m high, inside 0.42–0.46 m deep), its rim
 * thin (32 mm) and rounded, its basin a real hollow sloping to a flat floor 1.0 × 0.46 m with both ends raked as
 * backrests, standing on a recessed plinth that makes a shadow line at the floor; a brass floor-standing bath filler
 * (column Ø 35 mm, spout 1.03 m high reaching 0.22 m over the rim, a lever) behind its middle; a linen towel folded over
 * its front rim. The tub is one lathe-like loft: superellipse rings (exponent 2.5) from the floor up the outer wall,
 * round the rim and down the inner wall, so outside and inside are one skin joined at the rim.
 * Origin: the floor under the tub's middle; length along x, the towel's side (its front) toward +z, the filler at −z.
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
 * Cloth: its middle surface `P(i, j)` → [x, y, z] (rows × cols), `th` thick, both faces and a rounded edge all round;
 * `uvf(i, j)` its UVs (over a tile of `tile` metres: the edge's weave runs on round it). A towel's drape, a folded throw.
 */
function t_sheet(rows, cols, P, th, uvf, tile = 0.12) {
	const pts = [];
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(new THREE.Vector3(...P(i, j)));
	const nor = t_gridNormals(pts, rows, cols, false, false);
	const h = th / 2;
	const face = (s) => t_grid(rows, cols, (i, j) => pts[i * cols + j].clone().addScaledVector(nor[i * cols + j], s * h).toArray(), { uv: uvf, flip: s < 0 });
	const loop = [];
	for (let j = 0; j < cols; j++) loop.push([0, j]);
	for (let i = 1; i < rows; i++) loop.push([i, cols - 1]);
	for (let j = cols - 2; j >= 0; j--) loop.push([rows - 1, j]);
	for (let i = rows - 2; i > 0; i--) loop.push([i, 0]);
	const out = loop.map(([i, j]) => {
		const ii = i === 0 ? 1 : i === rows - 1 ? rows - 2 : i, jj = j === 0 ? 1 : j === cols - 1 ? cols - 2 : j;
		const s = i * cols + j, v = pts[s].clone().sub(pts[ii * cols + jj]);
		return v.addScaledVector(nor[s], -v.dot(nor[s])).normalize();
	});
	const K = 5;
	const edgeAt = (k, m) => {
		const [i, j] = loop[m], s = i * cols + j, a = (k / (K - 1)) * Math.PI;
		return pts[s].clone().addScaledVector(nor[s], h * Math.cos(a)).addScaledVector(out[m], h * Math.sin(a)).toArray();
	};
	// which way the edge's faces look: out of the cloth
	const e = t_grid(K, loop.length, edgeAt, { wrapJ: true });
	const nm = new THREE.Vector3().fromBufferAttribute(e.attributes.normal, 2 * (loop.length + 1) + 1);
	const flip = nm.dot(out[1]) < 0;
	const round = (Math.PI * h) / tile / (K - 1);
	const edge = t_grid(K, loop.length, edgeAt, { wrapJ: true, flip, uv: (k, m) => uvf(...loop[m % loop.length]).map((x) => x + k * round) });
	return t_merge([face(1), face(-1), edge]);
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

/** brushed brass (wastes, a flush plate): the kit's brass, its finish satin, so a flat face reads as brass, not a mirror */
function t_brushed() {
	material('c-brushed', 1, () => Object.assign(mat('brass').clone(), { roughness: 0.42 }));
}

/* ---- the thing ---- */

const THING = {
	id: 'bath-tub-freestanding',
	label: 'Freestanding bath tub',
	note: 'An oval freestanding bath tub of glazed solid surface, 1.70 × 0.80 m and 0.60 m high, with a thin rounded rim, a sculpted hollow basin 0.44 m deep, a brass floor-standing filler behind it and a linen towel over its rim.'
};

/** the tub's measures: half length and half width at the rim (m), the rings' exponent, the height */
const t_TUB = { A: 0.85, B: 0.4, n: 2.7, H: 0.6 };

/**
 * The tub's profile from the floor's middle round to the basin's: [inset along x, y, inset along z] from the rim's
 * outline (each ring a superellipse of half axes A − inset, B − inset); the outer wall, the rim, the inner wall.
 */
function t_tubProfile() {
	const { A, B } = t_TUB;
	const rim = [];
	for (let k = 0; k <= 8; k++) {
		const a = (k / 8) * Math.PI;
		rim.push([0.016 - 0.016 * Math.cos(a), 0.584 + 0.016 * Math.sin(a), 0.016 - 0.016 * Math.cos(a)]);
	}
	const bottom = [];
	for (let k = 0; k <= 4; k++) {
		const a = (k / 4) * (Math.PI / 2);
		bottom.push([0.04 + 0.045 - 0.045 * Math.sin(a), 0.016 + 0.045 - 0.045 * Math.cos(a), 0.04 + 0.045 - 0.045 * Math.sin(a)]);
	}
	const outer = [...bottom, [0.029, 0.15, 0.029], [0.017, 0.3, 0.017], [0.007, 0.45, 0.007], [0.002, 0.54, 0.002]];
	const inner = [[0.036, 0.56, 0.034], [0.052, 0.5, 0.043], [0.085, 0.42, 0.055], [0.13, 0.34, 0.07], [0.19, 0.265, 0.088], [0.245, 0.21, 0.11], [0.285, 0.18, 0.132], [0.312, 0.167, 0.148], [0.332, 0.1615, 0.16], [0.35, 0.16, 0.17]];
	const mid = t_curve([...outer, ...rim, ...inner].map(([a, y, b]) => [a, y, b]), 3);
	const flat = (y, from) => [0.75, 0.5, 0.25].map((k) => [A - (A - from[0]) * k, y, B - (B - from[2]) * k]);
	return [[A, 0.016, B], ...flat(0.016, outer[0]).reverse(), ...mid, ...flat(0.16, inner.at(-1)), [A, 0.16, B]];
}

/** a point of the tub's skin: profile row `p` ([inset x, y, inset z]) at angle t round */
function t_tubAt(p, t) {
	const [x, z] = t_super(t, t_TUB.A - p[0], t_TUB.B - p[2], t_TUB.n);
	return new THREE.Vector3(x, p[1], z);
}

/** the towel: folded once along its length, 0.45 m wide, over the front rim — in on the basin's wall, out down the side */
function t_towel(prof, centre) {
	const { A, B, n } = t_TUB;
	// the angle round at which the rim is at x: the outline's x falls as t runs from 0 to π
	const angleAt = (x) => {
		let lo = 0, hi = Math.PI;
		for (let k = 0; k < 40; k++) {
			const m = (lo + hi) / 2;
			if (t_super(m, A, B, n)[0] > x) lo = m;
			else hi = m;
		}
		return (lo + hi) / 2;
	};
	const W = 0.45, cols = 25, th = 0.012, gap = 0.003 + th / 2;
	const top = prof.reduce((k, p, i) => (p[1] > prof[k][1] ? i : k), 0);
	// from the towel's inner end (on the basin's wall, 0.4 m up) back over the rim to the outer wall's widest ring
	let kin = top, kout = top;
	while (prof[kin + 1][1] > 0.4) kin++;
	while (kout > 0 && prof[kout - 1][0] <= prof[kout][0] + 1e-6 && prof[kout - 1][1] > 0.5) kout--;
	const over = [];
	for (let k = kin; k >= kout; k--) over.push(k);
	const drop = 18, yEnd = 0.2;
	const rows = over.length + drop;
	const normalAt = (k, t) => {
		const a = t_tubAt(prof[Math.min(prof.length - 1, k + 1)], t).sub(t_tubAt(prof[Math.max(0, k - 1)], t));
		const b = t_tubAt(prof[k], t + 1e-3).sub(t_tubAt(prof[k], t - 1e-3));
		return a.cross(b).normalize();
	};
	const pt = (i, j) => {
		const s = (j / (cols - 1) - 0.5) * W;
		const t = angleAt(centre + s);
		// over the rim the folded towel does not hug its tight radius: it rounds over it, a little puffed
		const puff = (y) => 0.005 * span(y, 0.55, 0.598);
		if (i < over.length) {
			const k = over[i];
			const wob = 0.0018 * Math.sin(s * 37 + i * 0.9) * (1 - span(prof[k][1], 0.5, 0.58));
			return t_tubAt(prof[k], t).addScaledVector(normalAt(k, t), gap + puff(prof[k][1]) + wob).toArray();
		}
		// hanging free down the outside: soft creases that grow and lean as it falls, a hem not quite level
		const p0 = t_tubAt(prof[kout], t).addScaledVector(normalAt(kout, t), gap + puff(prof[kout][1]));
		const nh = normalAt(kout, t).setY(0).normalize();
		const f = (i - over.length + 1) / drop;
		const end = yEnd + 0.012 * Math.sin(s * 9 + 0.7) + 0.006 * Math.sin(s * 23);
		const y = p0.y + (end - p0.y) * f;
		const amp = 0.003 + 0.017 * smooth(f * 1.25);
		const crease = 0.9 * Math.sin((s / 0.17) * TAU + 1.3 + 0.9 * f) + 0.5 * Math.sin((s / 0.083) * TAU + 0.4 - 1.2 * f) + 0.25 * Math.sin((s / 0.043) * TAU + 2);
		const fold = amp * crease + 0.007 * Math.sin(Math.PI * Math.min(1, f * 1.6)) + 0.004 * f;
		return [p0.x + nh.x * fold, y, p0.z + nh.z * fold];
	};
	const along = [0];
	for (let i = 1; i < rows; i++) along.push(along[i - 1] + new THREE.Vector3(...pt(i, (cols - 1) / 2 | 0)).distanceTo(new THREE.Vector3(...pt(i - 1, (cols - 1) / 2 | 0))));
	const tile = TILE['linen-oat'];
	return t_sheet(rows, cols, pt, th, (i, j) => [((j / (cols - 1)) * W) / tile, along[i] / tile], tile);
}

/** the floor-standing bath filler: a round foot, a slim column, the mixer's body and lever, a spout arching over the rim */
function t_filler(bag, x, z) {
	const m = at(x, 0, z);
	bag.add('brass', t_lathe([[0, 0], [0.05, 0], [0.054, 0.002], [0.056, 0.007], [0.053, 0.012], [0.044, 0.0155], [0.02, 0.0165], [0, 0.0165]], 40), m);
	bag.add('brass', t_lathe([[0.0172, 0.014], [0.0172, 0.78], [0.0185, 0.792], [0.0225, 0.8], [0.0225, 0.906], [0.021, 0.916], [0.016, 0.923], [0.009, 0.926], [0, 0.927]], 28), m);
	// a fine ring where the column meets the mixer's body
	bag.add('shadow', t_lathe([[0.0176, 0.7905], [0.0195, 0.7905], [0.0195, 0.7915], [0.0176, 0.7915]], 28), m);
	const spout = t_curve([[0, 0.9, 0], [0, 0.965, 0.004], [0, 1.012, 0.04], [0, 1.032, 0.1], [0, 1.018, 0.16], [0, 0.988, 0.2], [0, 0.948, 0.218], [0, 0.904, 0.222]], 6);
	bag.add('brass', t_sweep(spout, t_circle(0.0105, 16), { up: [1, 0, 0] }), m);
	// the aerator's dark mesh at the outlet
	const end = spout.at(-1), before = spout.at(-2);
	const dir = new THREE.Vector3(...end).sub(new THREE.Vector3(...before)).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
	const ae = new THREE.Matrix4().compose(new THREE.Vector3(...end).addScaledVector(dir, 0.0004), q, new THREE.Vector3(1, 1, 1));
	bag.add('shadow', t_lathe([[0, 0], [0.0078, 0], [0.0078, 0.001], [0, 0.001]], 16), m.clone().multiply(ae));
	// the lever: a round boss on the body's side, a tapered handle
	bag.add('brass', bar([0.02, 0.868, 0], [0.034, 0.868, 0], 0.0095, 0.0095, 20), m);
	bag.add('brass', t_sweep([[0.033, 0.868, 0], [0.065, 0.876, 0], [0.098, 0.886, 0]], t_rrect(0.009, 0.014, 0.004, 3), { up: [0, 1, 0] }), m);
	bag.add('brass', new THREE.SphereGeometry(0.0062, 14, 10), m.clone().multiply(at(0.098, 0.886, 0, 0, [0.9, 0.95, 0.66])));
}

t_brushed();

function thingBuild() {
	const bag = new Bag(THING.id);
	const { A, B, n } = t_TUB;
	const prof = t_tubProfile();
	const cols = 80;
	// the tub: one skin from the floor up the outside, round the rim and down into the basin
	bag.add('glaze', t_grid(prof.length, cols, (i, j) => t_tubAt(prof[i], (j / cols) * TAU).toArray(), { wrapJ: true }));
	// the recessed plinth it stands on: a dark shadow line at the floor
	const plinth = Array.from({ length: 64 }, (_, k) => t_super((k / 64) * TAU, A - 0.13, B - 0.13, n));
	bag.add('shadow', t_prism(plinth, t_edge(0, 0.018, 0)));
	// the waste in the basin's floor, toward one end
	bag.add('c-brushed', t_lathe([[0, 0.1638], [0.024, 0.1634], [0.031, 0.1624], [0.0345, 0.161], [0.0355, 0.1598]], 32, { flip: true }), at(0.42, 0, 0));
	bag.add('shadow', t_lathe([[0.0356, 0.1599], [0.039, 0.1601]], 32, { flip: true }), at(0.42, 0, 0));
	t_filler(bag, 0, -(B + 0.105));
	bag.add('linen-oat', t_towel(prof, -0.3));
	const g = bag.build();
	g.userData.anchor = { origin: 'floor under the tub’s middle', front: '+z (the towel)', filler: [0, 0, -(B + 0.105)] };
	return g;
}
