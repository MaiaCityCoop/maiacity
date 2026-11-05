/*
 * TOILET, WALL-HUNG — a rimless wall-hung toilet (a wall piece: its back against z = 0) on the box that hides its
 * cistern: a glazed bowl 0.36 m wide reaching 0.55 m out from the box (a usual wall-hung pan: 0.35–0.38 m wide, 0.48–0.57
 * m projection, its seat at 0.40–0.43 m), its sides falling smooth and its underside curving back to the box; inside a
 * steep bowl to a small water surface and the trap; a slim seat and a lid of white thermoset on brass hinges, 17 mm
 * each, the seat at 0.42 m; the cistern box 0.80 m wide, 0.20 m deep and 1.08 m high (a concealed cistern frame wants
 * 1.0–1.12 m) clad in lime-plaster panels with shadow joints, capped with a 30 mm travertine shelf at 1.11 m, and a
 * brushed brass dual flush plate 0.22 × 0.145 m on it.
 * Origin: the floor at the wall, under the bowl's middle; the bowl comes out toward +z.
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
	id: 'toilet-wall',
	label: 'Wall-hung toilet',
	note: 'A rimless wall-hung toilet, its glazed bowl 0.36 × 0.55 m with a slim seat and lid at 0.42 m, on a 0.80 m wide, 1.11 m high cistern box clad in lime-plaster panels under a travertine shelf, with a brass dual flush plate.'
};

/** the box's front (m from the wall) and the bowl's rings' exponent */
const t_T = { box: 0.2, n: 2.3 };

/**
 * The bowl's profile, from under it (a pole inside the box) out along the underside, up the side, over the rim and
 * down inside to the trap: [half width, y, front z, back z] of each superellipse ring.
 */
const t_BOWL = [
	[0, 0.152, 0.14, 0.14], [0.09, 0.15, 0.2, 0.12], [0.125, 0.156, 0.3, 0.12], [0.15, 0.174, 0.45, 0.12], [0.166, 0.205, 0.57, 0.12], [0.176, 0.246, 0.662, 0.12],
	[0.181, 0.292, 0.722, 0.12], [0.182, 0.34, 0.75, 0.12], [0.182, 0.384, 0.756, 0.12], [0.18, 0.397, 0.754, 0.12], [0.175, 0.4025, 0.749, 0.13], [0.165, 0.404, 0.74, 0.16],
	[0.15, 0.404, 0.727, 0.22], [0.138, 0.402, 0.714, 0.265], [0.131, 0.395, 0.707, 0.274], [0.123, 0.37, 0.692, 0.28], [0.108, 0.33, 0.658, 0.285], [0.088, 0.29, 0.602, 0.29],
	[0.067, 0.26, 0.532, 0.295], [0.052, 0.24, 0.472, 0.298], [0.041, 0.225, 0.422, 0.3], [0.031, 0.21, 0.375, 0.302], [0.02, 0.2, 0.35, 0.306], [0, 0.196, 0.326, 0.326]
];

/** a ring's point at angle t: half width a, its front and back; a little wider toward the back, as a pan is */
function t_ring(a, zF, zB, t) {
	const b = Math.max(1e-5, (zF - zB) / 2), zc = (zF + zB) / 2;
	const [x, z] = t_super(t, a, b, t_T.n);
	return [x * (1 - 0.07 * (z / b)), z + zc];
}

/** a closed outline [x, z] cut to z ≥ zMin (where the seat meets the box) */
function t_clipZ(pts, zMin) {
	const out = [];
	for (let i = 0; i < pts.length; i++) {
		const p = pts[i], q = pts[(i + 1) % pts.length];
		const pin = p[1] >= zMin, qin = q[1] >= zMin;
		if (pin) out.push(p);
		if (pin !== qin) {
			const k = (zMin - p[1]) / (q[1] - p[1]);
			out.push([p[0] + (q[0] - p[0]) * k, zMin], [p[0] + (q[0] - p[0]) * k, zMin]);
		}
	}
	return out;
}

/** the bowl: one glazed skin from under it round the rim into the trap, and the water standing in it */
function t_bowl(bag) {
	const A = t_curve(t_BOWL.map(([a, y, zF]) => [a, y, zF]), 4);
	const B = t_curve(t_BOWL.map(([, y, , zB]) => [zB, y, 0]), 4);
	const prof = A.map((p, i) => [p[0], p[1], p[2], B[i][0]]);
	prof[0][0] = 0;
	prof[prof.length - 1][0] = 0;
	const cols = 72;
	bag.add('glaze', t_grid(prof.length, cols, (i, j) => {
		const [a, y, zF, zB] = prof[i];
		const [x, z] = t_ring(a, zF, zB, (j / cols) * TAU);
		return [x, y, z];
	}, { wrapJ: true }));
	// the water's surface where it stands in the bowl, and the dark of the trap under it
	const w = t_BOWL.find((r) => r[1] === 0.225);
	const water = Array.from({ length: 40 }, (_, k) => t_ring(w[0] * 1.06, w[2] + 0.004, w[3] - 0.002, (k / 40) * TAU)).map(([x, z]) => [x, 0.2265, z]);
	bag.add('water', t_cap(water, [], [0, 1, 0], (p) => [p.x, p.z]));
	bag.add('shadow', t_lathe([[0, 0.1975], [0.017, 0.1975], [0.018, 0.197]], 24, { flip: true }), at(0, 0, 0.327));
}

/** the seat and the lid: thermoset, 17 mm each, their backs cut square where they meet the box; brass hinges */
function t_seat(bag) {
	const outer = Array.from({ length: 96 }, (_, k) => t_ring(0.179, 0.757, 0.12, (k / 96) * TAU));
	const seat = t_clipZ(outer, 0.214);
	const hole = Array.from({ length: 64 }, (_, k) => t_ring(0.125, 0.702, 0.282, (k / 64) * TAU));
	bag.add('glaze', t_prism(seat, t_edge(0.4065, 0.4225, 0.004, 3, 0.006), { holes: [hole], holeProf: t_edge(0.4065, 0.4225, 0.003, 3, 0.005) }));
	const lid = t_clipZ(Array.from({ length: 96 }, (_, k) => t_ring(0.181, 0.761, 0.12, (k / 96) * TAU)), 0.216);
	bag.add('glaze', t_prism(lid, t_edge(0.4245, 0.4415, 0.003, 3, 0.0075)));
	// soft buffers under the seat and the lid
	for (const [x, z] of [[-0.15, 0.42], [0.15, 0.42], [-0.12, 0.64], [0.12, 0.64]]) {
		bag.add('shadow', bar([x, 0.4038, z], [x, 0.4068, z], 0.008, 0.008, 12));
		bag.add('shadow', bar([x, 0.422, z], [x, 0.4248, z], 0.007, 0.007, 12));
	}
	for (const s of [-1, 1]) {
		bag.add('brass', rbox(0.034, 0.02, 0.02, 0.008, 3), at(s * 0.085, 0.423, 0.236));
		bag.add('brass', rbox(0.026, 0.008, 0.03, 0.003, 2), at(s * 0.085, 0.4035, 0.223));
	}
}

/** the cistern box: plaster panels with shadow joints round a dark core, a travertine shelf, the flush plate */
function t_box(bag) {
	const W = 0.8, D = t_T.box, H = 1.08;
	bag.add('shadow', box(W - 0.04, H - 0.004, D - 0.02), at(0, (H - 0.004) / 2, (D - 0.02) / 2));
	const panel = (w, h, d, x, y, z) => bag.add('c-plaster', rbox(w, h, d, 0.0035, 2), at(x, y, z), { uv: 'box' });
	panel(W - 0.004, 0.546, 0.018, 0, 0.275, D - 0.009);
	panel(W - 0.004, 0.524, 0.018, 0, 0.554 + 0.262, D - 0.009);
	for (const s of [-1, 1]) panel(0.018, H - 0.004, D - 0.022, s * (W / 2 - 0.009), (H - 0.004) / 2, (D - 0.022) / 2);
	// the shelf: travertine, 30 mm, overhanging 15 mm, its front corners and edge rounded
	const shelf = roundRect(W + 0.03, D + 0.03, 0.012, 4).map(([x, z]) => [x, z + (D + 0.03) / 2 - 0.015]);
	bag.add('c-travertine', t_prism(shelf, t_edge(H, H + 0.03, 0.004, 3, 0.012), { tile: TILE.travertine }));
	// the flush plate: brushed brass, two buttons parted by fine dark joints
	const y = 0.94, z = D;
	bag.add('c-brushed', rbox(0.222, 0.147, 0.006, 0.0028, 3), at(0, y, z + 0.003));
	bag.add('shadow', box(0.21, 0.135, 0.002), at(0, y, z + 0.0055));
	bag.add('c-brushed', rbox(0.1225, 0.1335, 0.006, 0.0028, 3), at(-0.0435, y, z + 0.006));
	bag.add('c-brushed', rbox(0.0825, 0.1335, 0.006, 0.0028, 3), at(0.0635, y, z + 0.006));
}

t_honed();

t_brushed();
// the panels' lime plaster: the kit's, its trowel marks eased (a board's plaster is finer than a wall's)
material('c-plaster', TILE.plaster, () => Object.assign(mat('plaster').clone(), { normalScale: new THREE.Vector2(0.35, 0.35) }));

function thingBuild() {
	const bag = new Bag(THING.id);
	t_box(bag);
	t_bowl(bag);
	t_seat(bag);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor at the wall under the bowl’s middle', back: 'z = 0 (the wall)', seat: 0.4415, shelf: 1.11 };
	return g;
}
