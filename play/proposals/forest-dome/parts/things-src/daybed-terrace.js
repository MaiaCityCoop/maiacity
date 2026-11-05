/*
 * DAYBED, TERRACE — a daybed for the indoor terraces over the forest, 2.00 × 0.90 m (a daybed takes a single mattress,
 * 0.80–0.90 × 1.90–2.00 m; its seat at 0.38–0.45 m): a low frame of oiled oak, its apron a rail of rounded section
 * (55 × 140 mm) running round a plan with rounded corners on six turned legs, and round its back and ends a low gallery
 * of oak spindles (Ø 22 mm at 85 mm) under a rounded rail at 0.64 m, ending at the front in two posts; a mattress
 * cushion of natural linen 0.15 m thick, its top crowned and rolled into its sides, piped in oat linen round its top;
 * two linen bolsters Ø 0.20 m against its ends, piped round their ends; three scatter cushions 0.45 m square leaning on
 * the back rail (rust, sage and oat linen), puffed, their seams piped; a clay linen throw folded in three at its foot.
 * Origin: the floor under its middle; its long open side (the front) toward +z.
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

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/** a rounded rectangle's section [s, t] w × h, corners r, counter-clockwise, centred */
function t_rrect(w, h, r, seg = 4) {
	return roundRect(w, h, r, seg);
}

/** a wire ring: radius r at height y, its wire's radius w */
function t_wireRing(r, y, w, n = 48) {
	return t_sweep(Array.from({ length: n }, (_, k) => [r * Math.cos((k / n) * TAU), y, -r * Math.sin((k / n) * TAU)]), t_circle(w, 6), { closed: true });
}

/** a shape's UVs turned so wood's grain (along u) runs along v, the shape's length, in metres over `tile` */
function t_grainAlong(g, tile = 1) {
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) {
		const u = uv.getX(i);
		uv.setXY(i, uv.getY(i) / tile, u / tile);
	}
	return g;
}

/* ---- the thing ---- */

const THING = {
	id: 'daybed-terrace',
	label: 'Terrace daybed',
	note: 'An oak daybed 2.00 × 0.90 m with rounded rails and a low spindle gallery round its back and ends, a piped linen mattress cushion 0.15 m thick, two bolsters, three scatter cushions in rust, sage and oat linen and a folded throw.'
};

/** the measures (m): the outline, its corners, the apron, the mattress, the gallery */
const t_D = { L: 2.0, W: 0.9, R: 0.12, rail: 0.055, apron: [0.15, 0.29], deck: 0.23, top: 0.38, gallery: 0.64 };

/** a rounded rectangle's outline [x, z], counter-clockwise, about every `step` metres round */
function t_plan(L, W, r, step = 0.03) {
	const pts = [], seg = Math.max(4, Math.ceil(((Math.PI / 2) * r) / step));
	const corner = (cx, cz, a0) => {
		for (let k = 0; k < seg; k++) {
			const a = a0 + (k / seg) * (Math.PI / 2);
			pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
		}
	};
	const line = (x0, z0, x1, z1) => {
		const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (step * 3)));
		for (let k = 0; k < n; k++) pts.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
	};
	const x = L / 2 - r, z = W / 2 - r;
	corner(x, -z, -Math.PI / 2);
	line(L / 2, -z, L / 2, z);
	corner(x, z, 0);
	line(x, W / 2, -x, W / 2);
	corner(-x, z, Math.PI / 2);
	line(-L / 2, z, -L / 2, -z);
	corner(-x, -z, Math.PI);
	line(-x, -W / 2, x, -W / 2);
	return pts;
}

/** the mattress's measures: its plan's half sizes, its top's roll and crown */
const t_M = { hx: 0.937, hz: 0.387, r: 0.06, roll: 0.02, crown: 0.014 };
/** the mattress's top at (x, z): crowned in its middle, rolling down into its sides */
function t_mattressY(x, z) {
	// how far in from the rounded outline
	const qx = Math.abs(x) - (t_M.hx - t_M.r), qz = Math.abs(z) - (t_M.hz - t_M.r);
	const d = Math.max(0, t_M.r - Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) - Math.min(Math.max(qx, qz), 0));
	const e = Math.min(d, t_M.roll);
	return t_D.top - t_M.roll + Math.sqrt(Math.max(0, t_M.roll ** 2 - (t_M.roll - e) ** 2)) + t_M.crown * smooth((d - t_M.roll) / 0.22);
}

/** the mattress cushion: a crowned top rolled into a slightly bulging side, piping round the top's seam */
function t_mattress(bag) {
	const { hx, hz, r, roll } = t_M;
	const plan = t_plan(hx * 2, hz * 2, r, 0.025);
	const nr = t_planNormals(plan), n = plan.length;
	const yb = t_D.deck, ys = t_D.top - roll;
	const tile = TILE.linen;
	// the top: rings set in from the outline, then drawn in to the middle
	const ins = [0, 0.0025, 0.006, 0.011, 0.017, 0.026, 0.04, 0.055];
	const scale = [0.86, 0.7, 0.54, 0.38, 0.22, 0.08, 0];
	const ringAt = (i, j) => {
		const [x, z] = plan[j], [ax, az] = nr[j];
		if (i < ins.length) return [x - ax * ins[i], z - az * ins[i]];
		const k = scale[i - ins.length], d = ins.at(-1);
		return [(x - ax * d) * k, (z - az * d) * k];
	};
	const rows = ins.length + scale.length;
	bag.add('linen', t_grid(rows, n, (i, j) => {
		const [x, z] = ringAt(i, j);
		return [x, i ? t_mattressY(x, z) : ys, z];
	}, { wrapJ: true, uv: (i, j) => {
		const [x, z] = ringAt(i, j % n);
		return [x / tile, z / tile];
	} }));
	// the side: a band from the deck up to the seam, a little full in its middle
	const len = [0];
	for (let j = 1; j <= n; j++) len.push(len[j - 1] + Math.hypot(plan[j % n][0] - plan[j - 1][0], plan[j % n][1] - plan[j - 1][1]));
	const sr = 7;
	bag.add('linen', t_grid(sr, n, (i, j) => {
		const f = i / (sr - 1), b = 0.006 * Math.sin(Math.PI * f);
		return [plan[j][0] + nr[j][0] * b, yb + (ys - yb) * f, plan[j][1] + nr[j][1] * b];
	}, { wrapJ: true, uv: (i, j) => [len[j] / tile, (yb + ((ys - yb) * i) / (sr - 1)) / tile] }));
	// the piping round the top's seam
	bag.add('linen-oat', t_sweep(plan.map(([x, z], j) => [x + nr[j][0] * 0.0015, ys, z + nr[j][1] * 0.0015]), t_circle(0.0048, 8), { closed: true, tile: TILE['linen-oat'] }));
}

/**
 * A scatter cushion, lying flat at the origin (its faces up and down, its top edge toward −z): two panels sewn at a
 * piped seam, filled so the middle is full and the corners flatten, its sides drawn in a little between them; as it
 * leans, its upper half slouches forward (+y) and its top corners flop, its foot squashed flatter where it sits.
 */
function t_pillow(W, T, seed) {
	const N = 23;
	const r = chance('pillow', seed);
	const ph = [r() * TAU, r() * TAU, r() * TAU];
	const g = (k) => Math.sin((k / (N - 1) - 0.5) * Math.PI);
	const P = (s) => (i, j) => {
		const u = g(i), v = g(j);
		const top = ((1 - v) / 2) ** 2, foot = ((1 + v) / 2) ** 3;
		const x = (u * W) / 2 * (1 - 0.1 * (1 - v * v)) * (1 + 0.04 * foot), z = (v * W) / 2 * (1 - 0.1 * (1 - u * u)) + 0.022 * u * u * top;
		const full = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), 0.62) * (1 - 0.3 * foot);
		// soft creases running in from the corners, where the cover gathers
		const corner = Math.pow(Math.abs(u * v), 3);
		const crease = 0.05 * corner * Math.sin(26 * (Math.abs(u) - Math.abs(v)) + ph[2]);
		const dent = 1 + 0.06 * Math.sin(2.1 * u + 1.6 * v + ph[0]) + 0.035 * Math.sin(5.3 * u - 3.1 * v + ph[1]) + crease;
		const slouch = 0.055 * top + 0.03 * u * u * top + 0.006 * Math.sin(3 * u + ph[2]);
		return [x, s * (T / 2) * full * dent + slouch, z];
	};
	const tile = 0.12;
	const uv = (i, j) => [(g(i) * W) / 2 / tile, (g(j) * W) / 2 / tile];
	const seam = [];
	for (let k = 0; k < N - 1; k++) seam.push(P(1)(N - 1, k));
	for (let k = N - 1; k > 0; k--) seam.push(P(1)(k, N - 1));
	for (let k = N - 1; k > 0; k--) seam.push(P(1)(0, k));
	for (let k = 0; k < N - 1; k++) seam.push(P(1)(k, 0));
	return {
		body: t_merge([t_grid(N, N, P(1), { uv, flip: true }), t_grid(N, N, P(-1), { uv })]),
		piping: t_sweep(seam, t_circle(0.0042, 7), { closed: true, tile })
	};
}

/** a bolster: Ø 0.20 m, 0.78 m long, along z; its ends flat with a button, piped round */
function t_bolster(bag, x, y) {
	const L = 0.39, R = 0.1;
	const end = [[0, -L - 0.002], [0.009, -L - 0.0018], [0.012, -L + 0.001], [0.016, -L + 0.0015], [0.05, -L + 0.0005], [0.082, -L + 0.002], [R - 0.006, -L + 0.006], [R - 0.0015, -L + 0.012], [R, -L + 0.03]];
	const prof = [...end, [R + 0.002, -0.2], [R + 0.003, 0], ...end.slice().reverse().map(([r, y]) => [r, -y])];
	const m = at(x, y, 0, 0, 1, Math.PI / 2);
	bag.add('linen', t_lathe(prof, 40, { tile: TILE.linen }), m);
	for (const s of [-1, 1]) bag.add('linen-oat', t_wireRing(R - 0.003, s * (L - 0.009), 0.0048, 40), m);
}

/** the throw: a clay linen throw folded in three, lying at the bed's foot on the mattress's crown */
function t_throw(bag, cx, cz, ry) {
	const Wd = 0.52, D = 0.36, th = 0.006, gap = 0.0145;
	// its section, along z: three layers joined by two soft folds
	const path = [];
	const flat = (z0, z1, lay) => {
		const n = Math.ceil(Math.abs(z1 - z0) / 0.025);
		for (let k = 0; k < n; k++) path.push([z0 + ((z1 - z0) * k) / n, lay * gap, lay]);
	};
	const fold = (zc, lay, dir) => {
		for (let k = 0; k < 7; k++) {
			const a = -Math.PI / 2 + (k / 7) * Math.PI, rr = gap / 2 + (0.004 + 0.002 * lay) * Math.sin((k / 7) * Math.PI);
			path.push([zc + dir * rr * Math.cos(a), lay * gap + gap / 2 + rr * Math.sin(a), lay + k / 7]);
		}
	};
	flat(-D / 2, D / 2, 0);
	fold(D / 2, 0, 1);
	flat(D / 2, -D / 2, 1);
	fold(-D / 2, 1, -1);
	flat(-D / 2, D / 2 - 0.025, 2);
	path.push([D / 2 - 0.025, 2 * gap, 2]);
	const cols = 21, m = at(cx, 0, cz, ry);
	const P = (i, j) => {
		const [z, y, lay] = path[i];
		const e = j / (cols - 1) - 0.5;
		// each layer laid a little askew of the one under it, its free edges rippling, its middle softly heaped
		const x = e * Wd + 0.012 * lay + 0.01 * lay * (z / D);
		const p = new THREE.Vector3(x, 0, z).applyMatrix4(m);
		const base = t_mattressY(p.x, p.z) + th / 2 + 0.0015;
		const edge = smooth((Math.abs(e) * 2 - 0.65) / 0.35);
		const ripple = (0.003 * Math.sin(x * 11 + z * 7 + lay) + 0.0018 * Math.sin(x * 29 - z * 13 - lay * 3)) * Math.min(1, lay + 0.3) + edge * 0.0045 * Math.sin(z * 31 + lay * 2 + e * 3) * Math.min(1, lay);
		const heap = 0.004 * Math.min(1, lay) * Math.cos(Math.PI * e) * Math.cos((Math.PI * z) / D);
		return [p.x, base + y + ripple + heap, p.z];
	};
	let run = 0;
	const along = path.map((p, i) => (run += i ? Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0));
	const tile = TILE['linen-clay'];
	bag.add('linen-clay', t_sheet(path.length, cols, P, th, (i, j) => [along[i] / tile, ((j / (cols - 1)) * Wd) / tile], tile));
}

/** the frame: the apron rail round the plan, six legs, the deck, the gallery of spindles and its rail and posts */
function t_frame(bag) {
	const { L, W, R, rail, apron, gallery } = t_D;
	const c = rail / 2, X = L / 2 - c, Z = W / 2 - c, r = R - c;
	const tile = TILE.oak;
	// the apron: a rail of rounded section swept round the plan
	const sec = t_rrect(rail, apron[1] - apron[0], 0.022, 4);
	bag.add('oak', t_sweep(t_plan(L - rail, W - rail, r, 0.02).map(([x, z]) => [x, (apron[0] + apron[1]) / 2, z]), sec, { closed: true, tile }));
	// the deck the mattress lies on, inside the apron
	bag.add('oak', rbox(L - 2 * rail - 0.004, 0.02, W - 2 * rail - 0.004, 0.004, 1), at(0, t_D.deck - 0.01, 0), { uv: 'box' });
	// six turned legs, tapering to the floor
	for (const [x, z] of [[X - 0.16, Z], [X - 0.16, -Z], [-X + 0.16, Z], [-X + 0.16, -Z], [0, Z], [0, -Z]]) {
		bag.add('oak', t_grainAlong(t_lathe([[0, 0], [0.016, 0], [0.019, 0.004], [0.021, 0.02], [0.025, apron[0] - 0.01], [0.025, apron[0] + 0.02]], 18), tile), at(x, 0, z));
	}
	// the gallery: from the front of the left end round the back to the front of the right end
	const zEnd = Z - 0.11, u = [];
	const seg = 10;
	u.push([-X, zEnd], [-X, -Z + r]);
	for (let k = 1; k < seg; k++) {
		const a = Math.PI + (k / seg) * (Math.PI / 2);
		u.push([-X + r + r * Math.cos(a), -Z + r + r * Math.sin(a)]);
	}
	u.push([-X + r, -Z], [X - r, -Z]);
	for (let k = 1; k < seg; k++) {
		const a = -Math.PI / 2 + (k / seg) * (Math.PI / 2);
		u.push([X - r + r * Math.cos(a), -Z + r + r * Math.sin(a)]);
	}
	u.push([X, -Z + r], [X, zEnd]);
	const yr = gallery - 0.022;
	bag.add('oak', t_sweep(u.map(([x, z]) => [x, yr, z]), t_rrect(0.05, 0.044, 0.02, 4), { tile, caps: true }));
	// the posts at its two front ends, a round top on each
	for (const s of [-1, 1]) {
		bag.add('oak', t_grainAlong(bar([s * X, apron[1] - 0.01, zEnd], [s * X, gallery - 0.01, zEnd], 0.024, 0.024, 20), tile));
		bag.add('oak', new THREE.SphereGeometry(0.0262, 20, 12), at(s * X, gallery - 0.008, zEnd, 0, [1, 0.75, 1]));
	}
	// spindles along it at even steps, between the posts
	const lens = [0];
	for (let k = 1; k < u.length; k++) lens.push(lens[k - 1] + Math.hypot(u[k][0] - u[k - 1][0], u[k][1] - u[k - 1][1]));
	const total = lens.at(-1), count = Math.round(total / 0.085);
	for (let k = 1; k < count; k++) {
		const d = (k / count) * total;
		let i = 1;
		while (lens[i] < d) i++;
		const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
		const x = u[i - 1][0] + (u[i][0] - u[i - 1][0]) * f, z = u[i - 1][1] + (u[i][1] - u[i - 1][1]) * f;
		bag.add('oak', t_grainAlong(bar([x, apron[1] - 0.01, z], [x, yr, z], 0.011, 0.0105, 10), tile));
	}
}

function thingBuild() {
	const bag = new Bag(THING.id);
	t_frame(bag);
	t_mattress(bag);
	for (const s of [-1, 1]) t_bolster(bag, s * (t_M.hx - 0.1), t_D.top + 0.086);
	// three scatter cushions leaning on the back rail
	const lean = [[-0.5, 'linen-rust', 0.08, 1.0, -0.05], [0.02, 'linen-sage', -0.04, 1.06, 0.02], [0.53, 'linen-oat', -0.1, 0.97, 0.06]];
	lean.forEach(([x, m, turn, tilt, roll], k) => {
		const p = t_pillow(0.45, 0.25, k);
		const mtx = at(x, t_D.top + 0.165, -0.252 + 0.008 * k, turn, 1, tilt, roll);
		bag.add(m, p.body, mtx);
		bag.add(m, p.piping, mtx);
	});
	t_throw(bag, 0.47, 0.1, 0.13);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor under its middle', front: '+z (its open long side)', seat: t_D.top };
	return g;
}
