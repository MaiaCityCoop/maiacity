/*
 * NIGHTSTAND, ROUND — an oak drum bedside table, Ø 0.45 m and 0.50 m high (drum nightstands are sold Ø 40–50 cm and
 * 45–55 cm high, at the height of a low platform bed's mattress). A solid top 24 mm thick with a soft rounded edge,
 * standing 2 mm clear of the drum below it (a shadow line); the drum veneered in oak with its grain running up; one
 * drawer in its front, the drawer front cut from the same curve and flush with it behind 2.5 mm reveals, a finger pull
 * routed as a hollow in it; the drum set on a recessed plinth Ø 0.37 m, 50 mm high, so it seems to float. Made of
 * patches of the drum's wall (the window the drawer sits in, its jambs and sill), the drawer front as a sheet folded
 * round its eased edges and bent to the drum, a lathe for the bottom, the top a rounded solid. Oak ('oak'), the dark
 * of the gaps ('shadow').
 */
const THING = {
	id: 'nightstand-round',
	label: 'Nightstand, round',
	note: 'An oak drum nightstand, Ø 0.45 m and 0.50 m high: a solid top with a rounded edge over a drum with one flush drawer and a routed finger pull, on a recessed plinth.'
};

/* ---- shapes this thing is made with ---- */

/** points that lie on each other share one normal: a closed seam, a pole, a row laid twice for its UVs */
function t_mend(g, eps = 1e-5) {
	const p = g.attributes.position.array, nr = g.attributes.normal, n = nr.array, count = p.length / 3;
	const q = new Int32Array(count * 3);
	for (let i = 0; i < count * 3; i++) q[i] = Math.round(p[i] / eps);
	const order = new Uint32Array(count);
	for (let i = 0; i < count; i++) order[i] = i;
	order.sort((a, b) => q[a * 3] - q[b * 3] || q[a * 3 + 1] - q[b * 3 + 1] || q[a * 3 + 2] - q[b * 3 + 2]);
	for (let s = 0; s < count; ) {
		let e = s + 1;
		const a = order[s];
		while (e < count && q[order[e] * 3] === q[a * 3] && q[order[e] * 3 + 1] === q[a * 3 + 1] && q[order[e] * 3 + 2] === q[a * 3 + 2]) e++;
		if (e - s > 1) {
			let x = 0, y = 0, z = 0;
			for (let k = s; k < e; k++) (x += n[order[k] * 3]), (y += n[order[k] * 3 + 1]), (z += n[order[k] * 3 + 2]);
			const l = Math.hypot(x, y, z) || 1;
			for (let k = s; k < e; k++) (n[order[k] * 3] = x / l), (n[order[k] * 3 + 1] = y / l), (n[order[k] * 3 + 2] = z / l);
		}
		s = e;
	}
	nr.needsUpdate = true;
	return g;
}

/**
 * A surface of (nu + 1) × (nv + 1) points: `f(u, v, i, j)` → [x, y, z] for u, v in 0 … 1, laid so that the way u runs
 * crossed with the way v runs points out of its face. `uv(u, v, i, j)` → [s, t] in metres (over `tile`); `col(u, v)` → a
 * shade 0 … 1 (a vertex colour: where the light reaches less). Smooth normals; points that meet share theirs.
 */
function t_surf(nu, nv, f, o = {}) {
	const n = (nu + 1) * (nv + 1);
	const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
	const col = o.col ? new Float32Array(n * 3) : null;
	for (let j = 0, k = 0; j <= nv; j++)
		for (let i = 0; i <= nu; i++, k++) {
			const p = f(i / nu, j / nv, i, j);
			pos[k * 3] = p[0];
			pos[k * 3 + 1] = p[1];
			pos[k * 3 + 2] = p[2];
			if (o.uv) {
				const t = o.uv(i / nu, j / nv, i, j);
				uv[k * 2] = t[0] / (o.tile ?? 1);
				uv[k * 2 + 1] = t[1] / (o.tile ?? 1);
			}
			if (col) col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = o.col(i / nu, j / nv, i, j);
		}
	for (let j = 0; j < nv; j++)
		for (let i = 0; i < nu; i++) {
			const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
			idx.push(a, b, d, a, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
	g.computeVertexNormals();
	return t_mend(g);
}

/** a surface turned inside out: its faces wound the other way round, its normals reversed */
function t_flip(g) {
	const idx = g.index.array;
	for (let i = 0; i < idx.length; i += 3) {
		const t = idx[i + 1];
		idx[i + 1] = idx[i + 2];
		idx[i + 2] = t;
	}
	g.index.needsUpdate = true;
	const nr = g.attributes.normal;
	for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i));
	return g;
}

/** several surfaces as one, the normals of their meeting edges shared */
function t_join(list) {
	const colour = list.some((g) => g.attributes.color);
	for (const g of list) {
		if (colour && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
		if (g.index && g.index.array instanceof Uint16Array) g.setIndex(new THREE.Uint32BufferAttribute(Array.from(g.index.array), 1));
	}
	return t_mend(mergeGeometries(list));
}

/**
 * A rounded solid on a closed plan `outline` ([x, z] going counter-clockwise) from y0 to y1: its top rounded into its
 * side by `rT`, the side bulging out by `bulge`, rounded into its bottom by `rB`. `puff` domes the top (negative sags
 * it; `puffAt(x, z)` a dome of any shape instead), `puffB` the bottom; `bottom: false` leaves the bottom open (where it stands on something). `disp(x, y, z, part, q)`
 * → [dx, dy, dz] moves any point. With `tile`, UVs in metres: the top and bottom laid flat (x, z; `grainZ` turns them),
 * the edge and side along the plan (`grainUp`: up it); else the bag lays them. Returns { geo, ring(a, out) }: points round the top's
 * rounding at angle a (π/2 the top, 0 the side), `out` beyond the surface (a seam's piping).
 */
function t_round(outline, y0, y1, o = {}) {
	const { rT = 0.02, rB = rT, puff = 0, puffB = 0, bulge = 0, bottom = true, nT = 5, nB = nT, nS = 3, disp, pow = 2, tile, grainZ = false, grainUp = false, puffAt } = o;
	const caps = o.caps ?? [0, 0.3, 0.55, 0.75, 0.88, 0.95, 0.985, 0.997, 1];
	const capsB = o.capsB ?? [0, 0.5, 0.85, 0.97, 0.995, 1];
	const P = outline, m = P.length;
	const N = P.map((p, i) => {
		const a = P[(i - 1 + m) % m], b = P[(i + 1) % m];
		const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
		return [tz / l, -tx / l];
	});
	let cx = 0, cz = 0;
	if (o.centre) [cx, cz] = o.centre;
	else {
		for (const p of P) (cx += p[0]), (cz += p[1]);
		cx /= m;
		cz /= m;
	}
	// along the plan, for the UVs of the edge: whole repeats round it, so it has no seam
	const cum = [0];
	for (let i = 1; i <= m; i++) cum.push(cum[i - 1] + Math.hypot(P[i % m][0] - P[i - 1][0], P[i % m][1] - P[i - 1][1]));
	const L = cum[m], rep = tile ? Math.max(1, Math.round(L / tile)) * tile : L;
	const rows = [];
	for (const s of caps) rows.push(['top', s]);
	for (let k = 0; k <= nT; k++) rows.push(['ft', (Math.PI / 2) * (1 - k / nT)]);
	for (let k = 1; k < nS; k++) rows.push(['side', k / nS]);
	for (let k = 0; k <= nB; k++) rows.push(['fb', (-Math.PI / 2) * (k / nB)]);
	if (bottom) for (const s of [...capsB].reverse()) rows.push(['bot', s]);
	const at = (i, kind, q) => {
		const [px, pz] = P[i % m], [nx, nz] = N[i % m];
		let x, y, z;
		if (kind === 'top') {
			x = cx + (px - nx * rT - cx) * q;
			z = cz + (pz - nz * rT - cz) * q;
			y = y1 + (puffAt ? puffAt(x, z) * (1 - Math.pow(q, 8)) : puff * (1 - Math.pow(q, pow)));
		} else if (kind === 'ft') {
			x = px - nx * rT * (1 - Math.cos(q));
			z = pz - nz * rT * (1 - Math.cos(q));
			y = y1 - rT + rT * Math.sin(q);
		} else if (kind === 'side') {
			const b = bulge * Math.sin(Math.PI * q);
			x = px + nx * b;
			z = pz + nz * b;
			y = lerp(y1 - rT, y0 + rB, q);
		} else if (kind === 'fb') {
			x = px - nx * rB * (1 - Math.cos(q));
			z = pz - nz * rB * (1 - Math.cos(q));
			y = y0 + rB + rB * Math.sin(q);
		} else {
			x = cx + (px - nx * rB - cx) * q;
			z = cz + (pz - nz * rB - cz) * q;
			y = y0 - puffB * (1 - Math.pow(q, pow));
		}
		if (disp) {
			const d = disp(x, y, z, kind, q);
			x += d[0];
			y += d[1];
			z += d[2];
		}
		return [x, y, z];
	};
	const edgeV = (kind, q) => (kind === 'ft' ? rT * (Math.PI / 2 - q) : kind === 'side' ? rT * (Math.PI / 2) + (y1 - y0 - rT - rB) * q : rT * (Math.PI / 2) + (y1 - y0 - rT - rB) - rB * q);
	const uv = tile
		? (u, v, i, j) => {
				const [kind, q] = rows[j];
				if (kind === 'top' || kind === 'bot') {
					const p = at(i, kind, q);
					return grainZ ? [p[2], p[0]] : [p[0], p[2]];
				}
				return grainUp ? [edgeV(kind, q), (cum[i] / L) * rep] : [(cum[i] / L) * rep, edgeV(kind, q)];
		  }
		: null;
	const geo = t_surf(m, rows.length - 1, (u, v, i, j) => at(i, rows[j][0], rows[j][1]), { uv, tile });
	const ring = (a, out = 0) =>
		P.map((p, i) => {
			const q = at(i, 'ft', a), [nx, nz] = N[i];
			return [q[0] + nx * Math.cos(a) * out, q[1] + Math.sin(a) * out, q[2] + nz * Math.cos(a) * out];
		});
	const ringB = (a, out = 0) =>
		P.map((p, i) => {
			const q = at(i, 'fb', a), [nx, nz] = N[i];
			return [q[0] + nx * Math.cos(a) * out, q[1] + Math.sin(a) * out, q[2] + nz * Math.cos(a) * out];
		});
	return { geo, ring, ringB, at, N, P };
}

/** a surface of revolution of [r, y] points round y with UVs in metres (u round, whole repeats so no seam; v along) */
function t_lathe(profile, seg = 48, o = {}) {
	const tile = o.tile ?? 1;
	const len = [0];
	for (let i = 1; i < profile.length; i++) len.push(len[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
	const widest = Math.max(...profile.map((p) => p[0]));
	const rep = Math.max(1, Math.round((TAU * widest) / tile));
	return t_surf(seg, profile.length - 1, (u, v, i, j) => {
		const [r, y] = profile[j], a = (i / seg) * TAU;
		return [r * Math.sin(a), y, r * Math.cos(a)];
	}, { uv: (u, v, i, j) => [u * rep * tile, len[j]], tile });
}

/**
 * A sheet laid over a rounded edge: the point (a, b) of the sheet lies flat over [A0, A1] × [B0, B1]; beyond that it is
 * wrapped down round an edge of radius r and then falls straight (going out by `flare` for each metre it falls).
 * Returns [x, z, drop, e, ux, uz]: where it lies, how far below the flat, how far beyond the flat it is along the sheet
 * (e) and which way it went (ux, uz).
 */
function t_tray(a, b, A0, A1, B0, B1, r, flare = 0) {
	const dx = a < A0 ? a - A0 : a > A1 ? a - A1 : 0, dz = b < B0 ? b - B0 : b > B1 ? b - B1 : 0;
	const e = Math.hypot(dx, dz);
	const ux = e ? dx / e : 0, uz = e ? dz / e : 0;
	const arc = (Math.PI / 2) * r;
	let out, drop;
	if (e <= arc) {
		const f = e / r;
		out = r * Math.sin(f);
		drop = r * (1 - Math.cos(f));
	} else {
		out = r + (e - arc) * flare;
		drop = r + (e - arc);
	}
	return [clamp(a, A0, A1) + ux * out, clamp(b, B0, B1) + uz * out, drop, e, ux, uz];
}

/** sample positions from a to b: about every `step`, closer (every `fine`) inside each [c0, c1] of `dense` */
function t_steps(a, b, step, dense = [], fine = step / 3) {
	const out = [a];
	let x = a;
	while (x < b - 1e-9) {
		const inDense = dense.some(([c0, c1]) => x >= c0 - 1e-9 && x < c1 - 1e-9);
		let s = inDense ? fine : step;
		// do not step over the start of a dense stretch
		for (const [c0] of dense) if (x < c0 - 1e-9 && x + s > c0) s = c0 - x;
		x = Math.min(b, x + s);
		out.push(x);
	}
	return out;
}

/* ---- the thing ---- */

const t_NS = { R: 0.225, plinthR: 0.185, plinth: 0.05, carcass: 0.474, slab: 0.476, top: 0.5, W: (52 * Math.PI) / 180, sill: 0.318, wall: 0.016 };

/** a point on a drum of radius r at bearing a (0 = front, +z) and height y */
const t_onDrum = (r, a, y) => [r * Math.sin(a), y, r * Math.cos(a)];

function thingBuild() {
	const bag = new Bag(THING.id);
	const { R, W, sill, wall } = t_NS;
	const oak = TILE.oak;
	const o = { chunk: false };
	// the grain of the drum runs up: u along y, v round, a whole number of repeats round it (no seam where it closes)
	const rep = Math.max(1, Math.round((TAU * R) / oak));
	const drumUV = (a, y) => [y, (a / TAU) * rep * oak];
	// the wall round the back, all the way up
	const y0 = t_NS.plinth + 0.006, ys = [y0, sill, t_NS.carcass];
	const wall0 = t_surf(120, 2, (u, v, i, j) => t_onDrum(R, lerp(W, TAU - W, u), ys[j]), { uv: (u, v, i, j) => drumUV(lerp(W, TAU - W, u), ys[j]), tile: oak });
	// the wall under the drawer, one surface with the rest (their normals shared where they meet)
	const under = t_surf(60, 1, (u, v, i, j) => t_onDrum(R, lerp(-W, W, u), ys[j]), { uv: (u, v, i, j) => drumUV(lerp(-W, W, u), ys[j]), tile: oak });
	bag.add('oak', t_join([wall0, under]), null, o);
	// the drawer's window: its sill and jambs, the wall's thickness
	bag.add('oak', t_surf(1, 60, (u, v) => t_onDrum(lerp(R - wall, R, u), lerp(-W, W, v), sill), { uv: (u, v) => [lerp(-W, W, v) * R, u * wall], tile: oak }), null, o);
	bag.add('oak', t_flip(t_surf(1, 1, (u, v) => t_onDrum(lerp(R - wall, R, u), -W, lerp(sill, t_NS.carcass, v)), { uv: (u, v) => [v * 0.15, u * wall], tile: oak })), null, o);
	bag.add('oak', t_surf(1, 1, (u, v) => t_onDrum(lerp(R - wall, R, u), W, lerp(sill, t_NS.carcass, v)), { uv: (u, v) => [v * 0.15, u * wall], tile: oak }), null, o);
	// inside, dark: what the reveals show
	bag.add('shadow', t_surf(40, 1, (u, v) => t_onDrum(R - 0.024, lerp(-W - 0.08, W + 0.08, u), lerp(sill - 0.01, t_NS.slab, v))), null, o);
	bag.add('shadow', t_surf(1, 48, (u, v) => t_onDrum(lerp(0.001, R - 0.002, u), v * TAU, t_NS.carcass)), null, o);
	// the bottom of the drum, rounded into its wall, and the plinth under it
	const bottom = [[t_NS.plinthR - 0.004, t_NS.plinth], [R - 0.006, t_NS.plinth], [R - 0.0018, t_NS.plinth + 0.0008], [R, t_NS.plinth + 0.006]];
	bag.add('oak', t_lathe(bottom, 120, { tile: oak }), null, o);
	const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * TAU), r * Math.sin((i / n) * TAU)]);
	bag.add('oak', t_round(circle(t_NS.plinthR, 96), 0, t_NS.plinth, { rT: 0.003, rB: 0.002, nT: 3, nB: 2, bottom: false, tile: oak, caps: [0, 0.6, 0.9, 1] }).geo, null, o);
	// the top: solid oak, its edge rounded more above than below
	bag.add('oak', t_round(circle(R + 0.001, 144), t_NS.slab, t_NS.top, { rT: 0.011, rB: 0.004, nT: 7, nB: 3, tile: oak }).geo, null, o);
	// the drawer front: a sheet 18 mm thick folded round its 1.5 mm eased edges, bent to the drum, with its finger pull
	const gap = 0.0025, r = 0.0015, back = 0.018, Lr = (Math.PI / 2) * r + (back - r);
	const S = R * W - gap - r, h0 = sill + gap + r, h1 = t_NS.slab - 0.0045 - r, Hm = (h1 - h0) / 2, hc = (h0 + h1) / 2;
	const pull = { s: 0, h: h1 - 0.03, ws: 0.05, wh: 0.014, d: 0.008 };
	const ss = [-S - Lr, -S - r * 1.2, -S - r * 0.6, ...t_steps(-S, S, 0.007, [[-0.065, 0.065]], 0.003), S + r * 0.6, S + r * 1.2, S + Lr];
	const hs = [-Hm - Lr, -Hm - r * 1.2, -Hm - r * 0.6, ...t_steps(-Hm, Hm, 0.008, [[pull.h - hc - 0.024, pull.h - hc + 0.024]], 0.0028), Hm + r * 0.6, Hm + r * 1.2, Hm + Lr];
	const hollow = (s, h) => {
		const q = Math.hypot((s - pull.s) / pull.ws, (h - pull.h) / pull.wh);
		return q < 1 ? Math.pow(1 - q * q, 0.75) : 0;
	};
	const front = (i, j) => {
		const [s, hh, drop] = t_tray(ss[i], hs[j], -S, S, -Hm, Hm, r);
		const h = hc + hh, depth = drop + pull.d * hollow(s, h);
		return t_onDrum(R - depth, s / R, h);
	};
	const drawer = t_surf(ss.length - 1, hs.length - 1, (u, v, i, j) => front(i, j), {
		uv: (u, v, i, j) => {
			const [s, hh] = t_tray(ss[i], hs[j], -S, S, -Hm, Hm, r);
			return drumUV(s / R, hc + hh);
		},
		tile: oak,
		col: (u, v, i, j) => {
			const [s, hh] = t_tray(ss[i], hs[j], -S, S, -Hm, Hm, r);
			return 1 - 0.38 * hollow(s, hc + hh);
		}
	});
	bag.add('oak', drawer, null, { chunk: false, colour: true });
	return bag.build();
}
