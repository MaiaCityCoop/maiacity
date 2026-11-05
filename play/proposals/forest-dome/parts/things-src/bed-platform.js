/*
 * BED, PLATFORM — a low platform bed for a 160 × 200 cm mattress, as in the bedroom of reference picture 4. Overall
 * 1.92 m wide, 2.32 m long, 1.00 m high at its headboard (platform beds of this kind are 20–35 cm to the top of the
 * frame; a mattress 20–25 cm deep; headboards 90–110 cm). Made of:
 * - a solid oak frame 70 mm thick, its plan a rectangle with corners rounded 12 cm, its top edge rounded 22 mm, its top
 *   at 0.28 m, standing out 16 cm round the mattress as a ledge; under it a plinth set 12 cm back (so the bed floats);
 * - a mattress 22 cm deep with soft rounded edges, in a white linen fitted sheet;
 * - an upholstered headboard of oat linen 1.88 m wide, its face puffed, its top corners rounded 30 cm and its top a
 *   little arched, piped round its face;
 * - a white linen duvet that lies over the mattress and falls over its sides and foot in soft folds: a sheet 36 mm thick
 *   at its middle (thinner at its hem) wrapped round the mattress's edge and hanging from it, folds down its sides,
 *   gathered folds at its corners where they settle on the frame's ledge, soft lumps on top; its head turned down;
 * - two pillows propped on the headboard (bent: lying flat, then rising), two cushions of oat and clay linen before
 *   them, all stuffed and piped;
 * - a throw of rust linen folded across the foot and hanging over the sides.
 * Shapes: rounded solids on plans (t_round), sheets round middle surfaces (t_thick) laid over the mattress by t_tray,
 * stuffed pillows (t_pillow) bent by t_bend. ≤ 60k triangles.
 */
const THING = {
	id: 'bed-platform',
	label: 'Bed, platform',
	note: 'A low oak platform bed for a 160 × 200 cm mattress (1.92 × 2.32 m, frame 0.28 m high, headboard 1.0 m): upholstered linen headboard, a draped linen duvet, four stuffed pillows and a rust throw across the foot.'
};

/* ---- shapes this thing is made with ---- */

/** smooth noise 0 … 1 at (x, y) that does not repeat over the few metres a thing spans */
const t_noise = (x, y, s = 0) => vnoise(x, y, 1024, 1024, s);

/** fractal noise −0.5 … 0.5 (`oct` octaves, each twice as fine and half as strong) */
function t_fbm(x, y, s = 0, oct = 3) {
	let a = 1, f = 1, sum = 0, n = 0;
	for (let o = 0; o < oct; o++) {
		sum += a * vnoise(x * f, y * f, 1024, 1024, s + o * 17);
		n += a;
		a *= 0.5;
		f *= 2;
	}
	return sum / n - 0.5;
}

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

/** a closed plan made sure to run counter-clockwise (as superellipse() runs: from +x toward +z) */
function t_ccw(points) {
	let a = 0;
	for (let i = 0; i < points.length; i++) {
		const [x0, z0] = points[i], [x1, z1] = points[(i + 1) % points.length];
		a += x0 * z1 - x1 * z0;
	}
	return a < 0 ? [...points].reverse() : points;
}
/** a closed smooth plan through control points [x, z], `n` points evenly spaced along it */
function t_loop(points, n) {
	const c = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
	return t_ccw(c.getSpacedPoints(n).slice(0, n).map((p) => [p.x, p.z]));
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

/** piping: a cord of radius r round a closed line of points */
const t_pipe = (points, r = 0.004, radial = 6, steps = points.length) => tube(points, r, radial, true, 1, steps);

/**
 * A stuffed pillow w × d (along x and z), `h` thick in its middle: two faces sewn round their edge, the sides drawn in
 * by the stuffing (`pinch`), the corners pointed, `lump` a soft unevenness and `crease` folds running in from the
 * corners. Lying flat, its middle at the origin. Returns { geo, seam } (the seam's points, for its piping).
 */
function t_pillow(w, d, h, o = {}) {
	const { pinch = 0.07, lump = 0.1, seed = 1, nu = 24, nv = 20, e = 0.7, crease = 0.05 } = o;
	const sp = (t) => -Math.cos(Math.PI * t);
	const pt = (u, v, side) => {
		const x = (w / 2) * u * (1 - pinch * (1 - v * v)), z = (d / 2) * v * (1 - pinch * (1 - u * u));
		// full out to its seam (the cover filled), and domed in its middle
		const g = Math.max(0, Math.cos((Math.PI / 2) * u) * Math.cos((Math.PI / 2) * v));
		let f = 0.45 * Math.pow(g, e) + 0.55 * Math.pow(g, 1.6);
		// folds that run in from the corners where the cover is gathered by the stuffing
		const cu = Math.abs(u), cv = Math.abs(v), near = Math.max(0, Math.min(cu, cv) - 0.4) / 0.6;
		const fold = crease * near * Math.sin((cu - cv) * 8 + seed + side) * (1 - near * 0.4) - crease * 0.6 * Math.pow(Math.max(0, 1 - Math.hypot(u, v) * 1.6), 2) * (0.5 + 0.5 * Math.sin(seed * 5 + side));
		f *= 1 + lump * t_fbm(u * 1.4 + seed * 3.1, v * 1.4 + side * 5.3, seed) * 2 + fold;
		return [x, side * (h / 2) * f, z];
	};
	const top = t_surf(nu, nv, (a, b) => pt(sp(b), sp(a), 1));
	const bot = t_surf(nu, nv, (a, b) => pt(sp(a), sp(b), -1));
	const seam = [];
	const k = 24;
	for (let s = 0; s < 4; s++)
		for (let i = 0; i < k; i++) {
			const t = sp(i / k);
			const [u, v] = [[t, -1], [1, t], [-t, 1], [-1, -t]][s];
			seam.push(pt(u, v, 0));
		}
	return { geo: t_join([top, bot]), seam };
}

/**
 * A sheet round the middle surface `f(u, v)` → [x, y, z] (u, v in 0 … 1 over nu × nv cells), `th` thick (a number, or
 * th(u, v)), its edge rounded all round like a hem. `uv(u, v)` → [s, t] metres over `tile` for its faces, else the bag
 * lays them. One geometry, its normals smooth, its faces outward.
 */
function t_thick(nu, nv, f, th, o = {}) {
	const W = nu + 1, H = nv + 1;
	const P = [], T = [];
	for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) P.push(new THREE.Vector3(...f(i / nu, j / nv)));
	const p = (i, j) => P[Math.min(nv, Math.max(0, j)) * W + Math.min(nu, Math.max(0, i))];
	const N = [];
	for (let j = 0; j < H; j++)
		for (let i = 0; i < W; i++) {
			const du = p(i + 1, j).clone().sub(p(i - 1, j)), dv = p(i, j + 1).clone().sub(p(i, j - 1));
			N.push(du.cross(dv).normalize());
			T.push((typeof th === 'function' ? th(i / nu, j / nv) : th) / 2);
		}
	const k = (i, j) => j * W + i;
	const off = (i, j, s) => {
		const q = P[k(i, j)], n = N[k(i, j)], t = T[k(i, j)] * s;
		return [q.x + n.x * t, q.y + n.y * t, q.z + n.z * t];
	};
	const uvf = o.uv ? (u, v) => o.uv(u, v) : null;
	const outer = t_surf(nu, nv, (u, v, i, j) => off(i, j, 1), { uv: uvf, tile: o.tile });
	const inner = t_flip(t_surf(nu, nv, (u, v, i, j) => off(i, j, -1), { uv: uvf, tile: o.tile }));
	// the hem: round the edge of the grid once, a half round from the face to the back
	const loop = [];
	for (let i = 0; i < nu; i++) loop.push([i, 0]);
	for (let j = 0; j < nv; j++) loop.push([nu, j]);
	for (let i = nu; i > 0; i--) loop.push([i, nv]);
	for (let j = nv; j > 0; j--) loop.push([0, j]);
	const L = loop.length, seg = o.hem ?? 5;
	const B = loop.map(([i, j], q) => {
		const [ia, ja] = loop[(q - 1 + L) % L], [ib, jb] = loop[(q + 1) % L];
		const t = p(ib, jb).clone().sub(p(ia, ja));
		const b = t.clone().cross(N[k(i, j)]).normalize();
		// outward: away from the middle of the sheet
		const inward = p(Math.round(nu / 2), Math.round(nv / 2)).clone().sub(p(i, j));
		if (b.dot(inward) > 0) b.negate();
		return b;
	});
	const rim = t_surf(L, seg, (u, v, q, s) => {
		const [i, j] = loop[q % L], c = P[k(i, j)], n = N[k(i, j)], b = B[q % L], t = T[k(i, j)];
		const a = Math.PI * (s / seg), cs = Math.cos(a) * t, sn = Math.sin(a) * t;
		return [c.x + n.x * cs + b.x * sn, c.y + n.y * cs + b.y * sn, c.z + n.z * cs + b.z * sn];
	}, { uv: uvf ? (u, v, q, s) => { const [i, j] = loop[q % L]; const r = uvf(i / nu, j / nv); return [r[0], r[1] + s * 0.004]; } : null, tile: o.tile });
	// which way the hem faces depends on which way the loop runs: make it face out
	{
		const nr = rim.attributes.normal, q = Math.floor(L / 2) * 1 + (seg >> 1) * (L + 1);
		const b = B[Math.floor(L / 2)];
		if (nr.getX(q) * b.x + nr.getY(q) * b.y + nr.getZ(q) * b.z < 0) t_flip(rim);
	}
	return t_join([outer, inner, rim]);
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

/**
 * A shape made lying along z (from z0 at its front to z1 at its back) bent up as a pillow propped on a headboard: flat
 * where it lies, rising toward its back by `phi(s)` (the angle from lying, s the distance from its front end along it).
 */
function t_bend(geo, z0, z1, phi) {
	const n = 200, len = z1 - z0, C = [[0, 0]];
	for (let i = 1; i <= n; i++) {
		const s = (len * (i - 0.5)) / n, a = phi(s), [z, y] = C[i - 1];
		C.push([z - (len / n) * Math.cos(a), y + (len / n) * Math.sin(a)]);
	}
	const p = geo.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const s = clamp(z1 - p.getZ(i), 0, len), k = (s / len) * n, i0 = Math.min(n - 1, Math.floor(k)), f = k - i0;
		const cz = lerp(C[i0][0], C[i0 + 1][0], f), cy = lerp(C[i0][1], C[i0 + 1][1], f), a = phi(s), y = p.getY(i);
		p.setXYZ(i, p.getX(i), cy + y * Math.cos(a), cz + y * Math.sin(a));
	}
	p.needsUpdate = true;
	geo.computeVertexNormals();
	return t_mend(geo);
}

/* ---- the thing ---- */

/** the mattress and the bedding over it (metres; z of the mattress from its head −1.02 to its foot 0.98) */
const t_BED = { yT: 0.501, rE: 0.06, A: 0.74, B0: -0.4, B1: 0.92, thD: 0.036, hang: 0.252, ledge: 0.28 };

/** folds of a sheet hanging over the mattress's edge: how far out (m), by where it is (a, b) and how it hangs */
function t_bedFolds(a, b, e, ux, uz, R) {
	const arc = (Math.PI / 2) * R, hang = span(e - arc, 0, 0.12);
	if (hang <= 0) return 0;
	const along = Math.abs(ux) >= Math.abs(uz) ? b : a;
	let out = 0.011 * hang * (Math.sin(along * 17 + 2.4 * t_noise(along * 2.5, 1, 5)) + 0.45 * Math.sin(along * 37 + 1.3));
	if (ux && uz) {
		// at a corner the cloth is gathered into folds that fan out as it falls
		const psi = Math.atan2(Math.abs(uz), Math.abs(ux)), w = Math.sin(2 * psi);
		out += hang * w * (0.014 + 0.012 * Math.sin(psi * 8 + 0.6));
	}
	return out;
}

/** the bedding's middle surface at (a, b): `lift` above the mattress where it lies flat */
function t_bedSheet(a, b, lift, o = {}) {
	const { yT, rE, A, B0, B1, thD, ledge } = t_BED;
	const R = rE + lift;
	// at a corner the cloth hangs only a little lower than along the sides: the rest of it is taken up in folds
	const ca = Math.abs(a) - A, cb = b - B1;
	const corner = ca > 0 && cb > 0 ? Math.sin(2 * Math.atan2(cb, ca)) : 0;
	const k = 1 - 0.33 * corner * span(Math.hypot(Math.max(0, ca), Math.max(0, cb)), 0.08, 0.3);
	const [x0, z0, drop, e, ux, uz] = t_tray(Math.sign(a) * (A + Math.max(0, ca) * k) * (ca > 0 ? 1 : 0) + (ca > 0 ? 0 : a), cb > 0 ? B1 + cb * k : b, -A, A, B0 - 1, B1, R, 0.05);
	let out = t_bedFolds(a, b, e, ux, uz, R) + (o.extraOut ?? 0);
	let y = yT + lift - drop;
	// soft lumps on top, fading where it falls
	const top = 1 - span(e, 0, 0.1);
	y += top * (0.014 * t_fbm(a * 1.6, b * 1.6, 3) + 0.005 * t_fbm(a * 5, b * 5, 9) + 0.003 * Math.sin(a * 9 + b * 13 + 2 * t_noise(a * 3, b * 3, 4)) + (o.lumps ? o.lumps(a, b) : 0));
	// where it reaches the frame's ledge it settles on it and runs out along it
	const floor = ledge + (o.rest ?? thD / 2 + 0.003);
	if (y < floor + 0.012) {
		const t = floor + 0.012 - y;
		y = floor + 0.012 * Math.exp(-t / 0.012);
		out += t - 0.012 * (1 - Math.exp(-t / 0.012));
	}
	return [x0 + ux * out, y, z0 + uz * out];
}

/** a rounded headboard face: w wide from y0 to y1, top corners rounded rT, bottom rB, its top arched by `arch` */
function t_hbPlan(w, y0, y1, rT, rB, arch) {
	const pts = [];
	const corner = (cx, cy, r, a0, n) => {
		for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(a0 + (i / n) * (Math.PI / 2)), cy + r * Math.sin(a0 + (i / n) * (Math.PI / 2))]);
	};
	const h = w / 2;
	corner(h - rB, y0 + rB, rB, -Math.PI / 2, 4);
	for (let i = 1; i < 6; i++) pts.push([h, lerp(y0 + rB, y1 - rT, i / 6)]);
	corner(h - rT, y1 - rT, rT, 0, 12);
	for (let i = 1; i < 24; i++) {
		const x = lerp(h - rT, -h + rT, i / 24);
		pts.push([x, y1 + arch * (1 - (x / (h - rT)) ** 2)]);
	}
	corner(-h + rT, y1 - rT, rT, Math.PI / 2, 12);
	for (let i = 1; i < 6; i++) pts.push([-h, lerp(y1 - rT, y0 + rB, i / 6)]);
	corner(-h + rB, y0 + rB, rB, Math.PI, 4);
	for (let i = 1; i < 12; i++) pts.push([lerp(-h + rB, h - rB, i / 12), y0]);
	return pts;
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const box = { uv: 'box', chunk: false };
	const { yT, rE, A, B0, B1, thD, hang } = t_BED;
	// the frame and the plinth: oak, the grain along the bed
	bag.add('oak', t_round(roundRect(1.92, 2.32, 0.12, 8), 0.21, t_BED.ledge, { rT: 0.022, rB: 0.008, nT: 6, nB: 3, nS: 2, tile: TILE.oak, grainZ: true }).geo, null, o);
	bag.add('oak', t_round(roundRect(1.68, 2.08, 0.06, 6), 0, 0.21, { rT: 0.002, rB: 0.002, nT: 2, nB: 2, nS: 1, bottom: false, tile: TILE.oak, grainZ: true, caps: [0, 0.9, 1] }).geo, null, o);
	// the mattress in its fitted sheet
	bag.add('linen', rbox(1.6, 0.22, 2.0, rE, 5), at(0, t_BED.ledge + 0.111, -0.02), box);
	// the headboard: a puffed panel of oat linen, its back on the frame's back edge
	const hb = t_round(t_ccw(t_hbPlan(1.88, 0.282, 0.985, 0.3, 0.03, 0.015).map(([x, y]) => [x, -y])), 0, 0.1, { rT: 0.042, rB: 0.016, puff: 0.022, pow: 2.6, bulge: 0.003, nT: 7, nB: 3, nS: 2, caps: [0, 0.3, 0.55, 0.72, 0.84, 0.92, 0.97, 0.99, 1] });
	const hbM = new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, 0, -1.16));
	bag.add('linen-oat', hb.geo, hbM, box);
	bag.add('linen-oat', t_pipe(hb.ring(Math.PI * 0.28, 0.003), 0.0045, 6), hbM, box);
	// the duvet: thinner at its hem than in its middle
	const liftD = thD / 2 + 0.004;
	const as = t_steps(-A - hang, A + hang, 0.042, [[-A - hang, -A + 0.03], [A - 0.03, A + hang]], 0.021);
	const bs = t_steps(B0, B1 + hang, 0.042, [[B1 - 0.03, B1 + hang]], 0.021);
	const edgeTh = (u, v, w = 0.08) => {
		const a = lerp(as[0], as[as.length - 1], u), d = Math.min(a - as[0], as[as.length - 1] - a, (bs[bs.length - 1] - bs[0]) * (1 - v), (bs[bs.length - 1] - bs[0]) * v);
		return 0.45 + 0.55 * span(d, 0, w);
	};
	const duvet = t_thick(as.length - 1, bs.length - 1, (u, v) => t_bedSheet(as[Math.round(u * (as.length - 1))], bs[Math.round(v * (bs.length - 1))], liftD), (u, v) => thD * edgeTh(u, v), { hem: 5 });
	bag.add('linen', duvet, null, box);
	// its head turned down over itself
	const liftC = thD + 0.012 + 0.006, cs = t_steps(B0 - 0.004, B0 + 0.3, 0.03);
	const cuff = t_thick(as.length - 1, cs.length - 1, (u, v) => t_bedSheet(as[Math.round(u * (as.length - 1))] * (1 + 0.012), cs[Math.round(v * (cs.length - 1))], liftC, { rest: 0.05 }), 0.024, { hem: 4 });
	bag.add('linen', cuff, null, box);
	// the throw: rust linen folded in three across the foot, hanging over the sides
	const liftT = thD + 0.013 + 0.004, ts = t_steps(-A - 0.2, A + 0.2, 0.036, [[-A - 0.2, -A + 0.03], [A - 0.03, A + 0.2]], 0.02), tz = t_steps(0.3, 0.82, 0.035);
	const throwAt = (u, v) => {
		const a = ts[Math.round(u * (ts.length - 1))], b0 = tz[Math.round(v * (tz.length - 1))];
		// its folded edges not quite straight, the cloth lying softly in low ridges
		const b = b0 + 0.05 * (t_noise(a * 1.3, v * 2, 31) - 0.5) + 0.016 * Math.sin(a * 2.2 + v * 3);
		return t_bedSheet(a, b, liftT, { rest: 0.06, extraOut: 0.01 * (t_noise(b * 6, 2, 33) - 0.5), lumps: (aa, bb) => 0.012 * t_fbm(aa * 3 + 9, bb * 3, 21) + 0.006 * Math.pow(Math.max(0, Math.sin(aa * 6 + bb * 2.5 + 3 * t_noise(aa * 1.5, bb * 4, 35))), 3) });
	};
	const throwG = t_thick(ts.length - 1, tz.length - 1, throwAt, (u, v) => 0.024 * (0.8 + 0.2 * Math.sin(Math.PI * v)), { hem: 5 });
	bag.add('linen-rust', throwG, null, box);
	// the pillows: two to sleep on, propped on the headboard (lying, then rising), two cushions before them
	const pillow = (w, d, h, seed, x, zFront, yBase, lie, rise, mat, piping) => {
		const p = t_pillow(w, d, h, { seed, lump: 0.12, pinch: 0.07, e: 0.42, crease: 0.12, nu: 20, nv: 16 });
		const phi = (s) => rise * span(s, lie, lie + 0.24);
		const g = t_bend(p.geo, -d / 2, d / 2, phi);
		bag.add(mat, g, at(x, yBase, zFront), box);
		if (piping) {
			const seam = new THREE.BufferGeometry().setFromPoints(p.seam.map((q) => new THREE.Vector3(...q)));
			t_bend(seam.setIndex([0, 1, 2]), -d / 2, d / 2, phi);
			const pts = [];
			const sp = seam.attributes.position;
			for (let i = 0; i < sp.count; i++) pts.push([sp.getX(i), sp.getY(i), sp.getZ(i)]);
			bag.add(mat, t_pipe(pts, 0.004, 5), at(x, yBase, zFront), box);
		}
	};
	pillow(0.72, 0.5, 0.2, 1, -0.385, -0.67, yT + 0.065, 0.18, 1.25, 'linen', true);
	pillow(0.72, 0.5, 0.2, 2, 0.385, -0.675, yT + 0.065, 0.17, 1.27, 'linen', true);
	pillow(0.5, 0.5, 0.19, 3, -0.3, -0.56, yT + 0.065, 0.06, 0.95, 'linen-oat', true);
	pillow(0.48, 0.48, 0.19, 4, 0.32, -0.55, yT + 0.065, 0.06, 1.0, 'linen-clay', true);
	return bag.build();
}
