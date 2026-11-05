/*
 * PLANTER TROUGH — a long white planter for the terraces and the stair halls, 1.60 × 0.45 m and 0.55 m high (the long
 * troughs run 1.2–2.0 × 0.4–0.5 m, 0.4–0.6 m high): its plan a stadium (its ends half circles), its walls of white
 * bioceramic 35 mm thick tapering 30 mm toward the foot, a rolled lip round its top, standing on a recessed plinth that
 * makes a shadow line at the floor; filled with dark soil under a little leaf litter, its surface 0.50 m above the floor
 * (0.49 m at the walls, a little mounded toward the middle). The dome stands plants in it.
 * Origin: the floor under its middle; its length along x.
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

/** points along a smooth curve through control points [x, y, z]: `per` points to each span between two of them */
function t_curve(points, per = 6, closed = false) {
	const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
	return c.getPoints((points.length - (closed ? 0 : 1)) * per).map((p) => p.toArray()).slice(0, closed ? -1 : undefined);
}

/* ---- the thing ---- */

const THING = {
	id: 'planter-trough',
	label: 'Long planter trough',
	note: 'A long white bioceramic planter trough 1.60 × 0.45 m and 0.55 m high with rounded ends and a rolled lip, on a recessed plinth, filled with soil to 0.50 m for the plants the dome stands in it.'
};

/** the measures (m): the outline at its lip, the walls, the soil's surface */
const t_P = { L: 1.6, W: 0.45, H: 0.55, soil: 0.49, seg: 28, ns: 10 };

/** the trough's profile: [inset from the lip's outline, y] from its foot up the outside, over the lip, down the inside */
function t_troughProfile() {
	const foot = [];
	for (let k = 0; k <= 4; k++) {
		const a = (k / 4) * (Math.PI / 2);
		foot.push([0.03 + 0.02 - 0.02 * Math.sin(a), 0.025 + 0.02 - 0.02 * Math.cos(a), 0]);
	}
	const wall = [[0.02, 0.15, 0], [0.011, 0.3, 0], [0.004, 0.43, 0], [0.0, 0.49, 0], [-0.006, 0.508, 0], [-0.009, 0.522, 0]];
	const lipPts = [[-0.009, 0.536, 0], [-0.0055, 0.5465, 0], [0.003, 0.55, 0], [0.016, 0.55, 0], [0.026, 0.548, 0], [0.032, 0.542, 0], [0.034, 0.532, 0]];
	const inside = [[0.035, 0.515, 0], [0.037, 0.48, 0], [0.039, 0.44, 0]];
	return t_curve([...foot, ...wall, ...lipPts, ...inside], 3).map(([d, y]) => [d, y]);
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const { L, W, seg, ns, soil } = t_P;
	const ring = (d) => t_stadium(L - 2 * d, W - 2 * d, seg, ns);
	const prof = t_troughProfile();
	const n = ring(0).length;
	const len = [0];
	const r0 = ring(0);
	for (let j = 1; j <= n; j++) len.push(len[j - 1] + Math.hypot(r0[j % n][0] - r0[j - 1][0], r0[j % n][1] - r0[j - 1][1]));
	const rings = prof.map(([d]) => ring(d));
	const tile = TILE.ceramic;
	// the trough: one skin from its foot up, over the lip and down inside to under the soil; its bottom face
	bag.add('ceramic', t_grid(prof.length, n, (i, j) => [rings[i][j][0], prof[i][1], rings[i][j][1]], { wrapJ: true, uv: (i, j) => [len[j] / tile, prof[i][1] / tile] }));
	bag.add('ceramic', t_cap(rings[0].map(([x, z]) => [x, prof[0][1], z]), [], [0, -1, 0], (p) => [p.x / tile, p.z / tile]));
	// the recessed plinth: its shadow line at the floor
	bag.add('shadow', t_prism(ring(0.065), t_edge(0, 0.026, 0)));
	// the soil: from the inner wall (set into it, so no gap shows) mounding a little toward the middle, crumbly
	const ins = [0.036, 0.042, 0.052, 0.07, 0.095, 0.13, 0.17, 0.2, 0.218, 0.225];
	// a planter's top dressing: the kit's soil, its litter finer than a forest floor's (laid at 0.6 of its tile)
	const st = TILE.soil * 0.6;
	bag.add('soil', t_grid(ins.length, n, (i, j) => {
		const [x, z] = ring(ins[i])[j];
		const crumb = 0.004 * (vnoise(x * 14 + 40, z * 14 + 40, 1000, 1000, 7) - 0.5) + 0.002 * (vnoise(x * 40 + 9, z * 40 + 9, 1000, 1000, 9) - 0.5);
		return [x, soil + 0.014 * smooth((ins[i] - 0.036) / 0.14) + (i ? crumb : 0), z];
	}, { wrapJ: true, uv: (i, j) => {
		const [x, z] = ring(ins[i])[j % n];
		return [x / st, z / st];
	} }));
	const g = bag.build();
	g.userData.anchor = { origin: 'floor under its middle', soil: { y: 0.5, edge: soil, area: [L - 0.08, W - 0.08] } };
	return g;
}
