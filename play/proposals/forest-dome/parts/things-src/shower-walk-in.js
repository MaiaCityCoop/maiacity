/*
 * SHOWER, WALK-IN — a walk-in shower against a wall (a wall piece: its back against z = 0): a panel of zellige (glazed
 * hand-made tiles of 10 cm, each a little uneven) 1.20 m wide and 2.20 m high, 25 mm proud of the wall, edged in slim
 * brass angle; a travertine floor tray 1.20 × 0.90 m and 35 mm thick (a usual low tray: 25–40 mm) with a linear brass
 * drain 0.90 m long by the wall; one fixed screen of 8 mm clear glass 2.00 m high standing on the tray at its open side,
 * square to the wall, as deep as the tray (0.90 m: a walk-in screen is 0.8–1.0 m), its free top corner rounded, held in
 * a brass wall channel and a brass floor channel, a slim brass edge round its free sides and a brass stay from its top
 * to the wall at 45°; a round brass rain head Ø 0.25 m on a 0.40 m arm at 2.15 m, a round brass mixer at 1.10 m and a
 * brass hand shower on its holder with its hose.
 * Origin: the floor at the wall, under the tray's middle; the shower comes out toward +z; the screen on the +x side.
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

/* ---- the thing ---- */

const THING = {
	id: 'shower-walk-in',
	label: 'Walk-in shower',
	note: 'A walk-in shower: a 1.20 × 2.20 m zellige wall panel, a 1.20 × 0.90 m travertine tray with a linear brass drain, an 8 mm glass screen 2.00 m high in slim brass edges with a stay to the wall, a round brass rain head, a mixer and a hand shower.'
};

/** the measures (m): the panel, the tray, the screen */
const t_S = { W: 1.2, H: 2.2, tile: 0.025, D: 0.9, tray: 0.035, gx: 0.565, gH: 2.0, glass: 0.008 };

/** a wall boss: a round plate on the wall, its axis along +z */
function t_wallDisc(r, th) {
	return t_lathe([[r - 0.002, 0], [r, 0.0005], [r, th - 0.004], [r - 0.0012, th - 0.0012], [r - 0.004, th], [0, th]], 40).applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2));
}

/** the tiled panel and its brass edge */
function t_panel(bag) {
	const { W, H, tile } = t_S;
	bag.add('zellige', rbox(W, H, tile, 0.003, 2), at(0, H / 2, tile / 2), { uv: 'box' });
	// a slim brass trim round the panel's three free edges, 3 mm proud of the tiles
	const sec = t_rrect(0.004, tile + 0.004, 0.0015, 2).map(([a, b]) => [a, b + tile / 2 + 0.001]);
	for (const x of [-W / 2 - 0.002, W / 2 + 0.002]) bag.add('brass', t_sweep([[x, t_S.tray, 0], [x, H + 0.004, 0]], sec, { up: [0, 0, 1] }));
	bag.add('brass', t_sweep([[-W / 2 - 0.004, H + 0.002, 0], [W / 2 + 0.004, H + 0.002, 0]], sec, { up: [0, 0, 1] }));
}

/** the tray: travertine with eased edges, the drain's slot by the wall, its channel and brass grate */
function t_tray(bag) {
	const { W, D, tile, tray } = t_S;
	const z0 = tile, z1 = tile + D;
	const plan = roundRect(W, D, 0.006, 2).map(([x, y]) => [x, y + (z0 + z1) / 2]);
	const slot = roundRect(0.904, 0.044, 0.004, 2).map(([x, y]) => [x, y + z0 + 0.07]);
	bag.add('c-travertine', t_prism(plan, t_edge(0, tray, 0.002, 2, 0.006), { tile: TILE.travertine, holes: [slot], holeProf: t_edge(0.012, tray, 0, 2, 0.002) }));
	// the channel under the grate: dark
	bag.add('shadow', box(0.9, 0.004, 0.04), at(0, 0.014, z0 + 0.07));
	// the grate: a brass frame and bars across, flush with the stone
	const zc = z0 + 0.07, y = tray - 0.0035;
	bag.add('brass', t_prism(roundRect(0.9, 0.04, 0.003, 2).map(([x, z]) => [x, z + zc]), t_edge(y - 0.004, y, 0, 1, 0.0008), { holes: [roundRect(0.884, 0.026, 0.001, 1).map(([x, z]) => [x, z + zc])] }));
	for (let k = 0; k < 44; k++) bag.add('brass', box(0.012, 0.003, 0.027), at(-0.4365 + k * 0.0203, y - 0.0015, zc));
}

/** the glass screen: square to the wall at x = gx, its free top corner rounded, its channels, edge and stay */
function t_screen(bag) {
	const { D, tile, tray, gx, gH, glass } = t_S;
	const z0 = tile + 0.004, z1 = tile + D, y0 = tray + 0.012, y1 = tray + gH, R = 0.16;
	// the pane's outline seen from +x: [depth z, height y]
	const out = [[z0, y0], [z1, y0]];
	for (let k = 0; k <= 10; k++) {
		const a = (k / 10) * (Math.PI / 2);
		out.push([z1 - R + R * Math.cos(a), y1 - R + R * Math.sin(a)]);
	}
	out.push([z0, y1]);
	// extruded along +x: the shape's x is −z (its ry turns it) and its y is up
	const pane = extrude(shapeOf(out.map(([z, y]) => [-z, y])), glass, 0.0012, 1, 12);
	bag.add('glass', pane, at(gx - glass / 2, 0, 0, Math.PI / 2));
	// the wall channel and the floor channel: brass U's the glass sits in
	const U = (len) => rbox(0.016, len, 0.03, 0.0025, 2);
	bag.add('brass', U(gH + 0.012), at(gx, tray + (gH + 0.012) / 2, tile + 0.015, 0, 1));
	bag.add('brass', rbox(0.016, 0.03, D - 0.034, 0.0025, 2), at(gx, tray + 0.015, tile + 0.034 + (D - 0.034) / 2));
	// the slim edge on the free sides: along the top, round the corner and down the front, over the glass's edge
	const path = [[z1, y0 + 0.03], ...out.slice(2, -1), [z0 + 0.026, y1]].map(([z, y]) => [gx, y, z]);
	bag.add('brass', t_sweep(path, t_rrect(0.008, 0.0125, 0.003, 3), { up: [1, 0, 0] }));
	// the stay: from a clamp on the glass's top to a round plate on the wall, at 45°
	const zc = 0.62, yS = y1 - 0.07;
	const wallX = gx - (zc - tile);
	bag.add('brass', bar([gx - 0.012, yS, zc - 0.012], [wallX + 0.006, yS, tile + 0.006], 0.0085, 0.0085, 18));
	// the clamp: a round brass pad either side of the glass, the bar's end in a boss on the inner one
	for (const sd of [-1, 1]) bag.add('brass', t_lathe([[0, 0], [0.019, 0], [0.0215, 0.0015], [0.022, 0.004], [0.0205, 0.0065], [0.016, 0.0075], [0, 0.0076]], 32), at(gx + sd * (glass / 2 + 0.0003), yS, zc, 0, 1, 0, -sd * Math.PI / 2));
	bag.add('brass', new THREE.SphereGeometry(0.0115, 16, 12), at(gx - glass / 2 - 0.012, yS, zc - 0.006));
	bag.add('brass', t_wallDisc(0.028, 0.012), at(wallX, yS, tile));
	bag.add('brass', new THREE.SphereGeometry(0.0125, 16, 12), at(wallX + 0.009, yS, tile + 0.017));
}

/** the rain head on its arm, the mixer, the hand shower and its hose */
function t_fittings(bag) {
	const { tile } = t_S;
	const x = -0.12, yA = 2.15, reach = 0.4;
	bag.add('brass', t_wallDisc(0.034, 0.012), at(x, yA, tile));
	const arm = t_curve([[x, yA, tile + 0.01], [x, yA, tile + reach - 0.06], [x, yA - 0.012, tile + reach - 0.012], [x, yA - 0.045, tile + reach]], 6);
	bag.add('brass', t_sweep(arm, t_circle(0.0105, 18), { up: [1, 0, 0] }));
	// the head: a thin disc with a softly rounded edge, its face of dark silicone nozzles
	const hy = yA - 0.055;
	bag.add('brass', t_lathe([[0.11, hy], [0.122, hy + 0.0002], [0.1245, hy + 0.003], [0.125, hy + 0.007], [0.1235, hy + 0.0102], [0.12, hy + 0.0115], [0.03, hy + 0.012], [0, hy + 0.0122]], 64), at(x, 0, tile + reach));
	bag.add('brass', t_lathe([[0.0145, hy + 0.0075], [0.0145, hy + 0.022], [0.012, hy + 0.026], [0, hy + 0.027]], 24), at(x, 0, tile + reach));
	// its face: brushed brass with a round field of dark silicone nozzles
	bag.add('brass', t_lathe([[0, hy - 0.0003], [0.1105, hy + 0.0001]], 64), at(x, 0, tile + reach));
	bag.add('bronze', t_lathe([[0, hy - 0.0008], [0.088, hy - 0.0007], [0.09, hy - 0.0004]], 64), at(x, 0, tile + reach));
	// the mixer: a round plate and a knurled knob with a lever
	const yM = 1.1;
	bag.add('brass', t_wallDisc(0.04, 0.01), at(x, yM, tile));
	bag.add('brass', t_lathe([[0.019, 0], [0.019, 0.034], [0.0175, 0.04], [0.01, 0.043], [0, 0.044]], 32).applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2)), at(x, yM, tile + 0.009));
	bag.add('brass', t_sweep([[0, 0, 0.042], [0, 0.02, 0.05], [0, 0.058, 0.055]], t_rrect(0.008, 0.012, 0.0035, 3), { up: [1, 0, 0] }), at(x, yM, tile));
	// the hand shower: an outlet elbow, a holder, the handset resting in it, the hose hanging between
	const xo = 0.22, yO = 0.98, yH = 1.32;
	bag.add('brass', t_wallDisc(0.026, 0.01), at(xo, yO, tile));
	bag.add('brass', t_lathe([[0.012, 0], [0.012, 0.03], [0, 0.031]], 20).applyMatrix4(at(0, 0, 0, 0, 1, Math.PI / 2)), at(xo, yO, tile + 0.009));
	bag.add('brass', t_wallDisc(0.026, 0.01), at(xo, yH, tile));
	bag.add('brass', t_sweep([[xo, yH, tile + 0.008], [xo, yH + 0.005, tile + 0.04], [xo, yH + 0.012, tile + 0.055]], t_rrect(0.03, 0.012, 0.005, 3), { up: [1, 0, 0] }));
	// the handset: a slim stick, wider toward its spray face at the top, tipped back toward the wall
	const hs = t_lathe([[0, -0.012], [0.008, -0.0115], [0.0105, -0.006], [0.011, 0.02], [0.0135, 0.16], [0.0158, 0.205], [0.0162, 0.214], [0.0152, 0.2195], [0.012, 0.221], [0, 0.2212]], 28);
	bag.add('brass', hs, at(xo, yH - 0.06, tile + 0.06, 0, 1, -0.22));
	bag.add('bronze', t_lathe([[0, 0.2216], [0.0105, 0.2216], [0.0112, 0.2213]], 24, { flip: true }), at(xo, yH - 0.06, tile + 0.06, 0, 1, -0.22));
	// the hose: from the outlet's elbow down in a loose loop and up into the handset's foot
	const foot = new THREE.Vector3(0, -0.012, 0).applyMatrix4(at(xo, yH - 0.06, tile + 0.06, 0, 1, -0.22));
	const hose = t_curve([[xo, yO, tile + 0.04], [xo + 0.01, yO - 0.1, tile + 0.06], [xo + 0.05, yO - 0.42, tile + 0.09], [xo + 0.1, yO - 0.55, tile + 0.1], [xo + 0.14, yO - 0.42, tile + 0.09], [xo + 0.08, yO - 0.12, tile + 0.08], [foot.x, foot.y - 0.03, foot.z], [foot.x, foot.y, foot.z]], 8);
	bag.add('brass', t_sweep(hose, t_circle(0.0062, 10), { up: [0, 0, 1] }));
}

t_honed();

function thingBuild() {
	const bag = new Bag(THING.id);
	t_panel(bag);
	t_tray(bag);
	t_screen(bag);
	t_fittings(bag);
	const g = bag.build();
	g.userData.anchor = { origin: 'floor at the wall under the tray’s middle', back: 'z = 0 (the wall)', tray: t_S.tray, screen: '+x side' };
	return g;
}
