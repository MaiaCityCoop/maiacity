/*
 * CHAIR, DESK — an upholstered swivel desk chair as in reference picture 2: a shell of moulded oak plywood 12 mm thick
 * that is its back and its arms in one sweep (a U in plan, 0.80 m high at the back and falling to arms at 0.64 m, the
 * back leaning 12° and the top-front corner of each arm rounded off), a bouclé seat cushion (seat height 0.46 m: an
 * office chair's seat is 42–50 cm high, 45–50 cm wide and deep) on an oak seat pan, a bouclé pad sewn into the curve of
 * the back with piping round it, and a four-star swivel base of bronzed cast metal: a column into a hub, four legs
 * tapering to rounded tips on felt glides, 0.68 m across. Width 0.58 m, depth 0.64 m. The shell a thick sheet round a
 * swept surface (t_thick, its grain running round it); the seat a rounded solid; the pad a surface standing off the
 * shell; the base's legs tubes of changing oval section. Oak ('oak'), bouclé ('boucle-sand'), bronze ('bronze'), the
 * glides ('shadow').
 */
const THING = {
	id: 'chair-desk',
	label: 'Chair, desk',
	note: 'An upholstered swivel desk chair: a moulded oak shell for back and arms (0.80 m high), a bouclé seat at 0.46 m and back pad, on a bronze four-star base.'
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

/** piping: a cord of radius r round a closed line of points */
const t_pipe = (points, r = 0.004, radial = 6, steps = points.length) => tube(points, r, radial, true, 1, steps);

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

/** a built thing moved so the middle of its footprint is at x = z = 0 (its parts moved, its root left at the origin) */
function t_centre(obj) {
	const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3());
	for (const part of obj.children) {
		part.position.x -= c.x;
		part.position.z -= c.z;
	}
	return obj;
}

/* ---- the thing ---- */

const t_CH = { A: 0.268, B: 0.27, n: 2.6, psiMax: (112 * Math.PI) / 180, y0: 0.372, back: 0.8, arm: 0.64, th: 0.012 };

/** the shell's plan: a U round the seat, at bearing ψ from the back (0) toward the arms' fronts (±ψMax) */
function t_chPlan(psi) {
	const { A, B, n } = t_CH, s = Math.sin(psi), c = Math.cos(psi);
	return [A * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), -B * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)];
}
/** the shell's middle surface at p (−1 … 1 along it) and t (0 its bottom edge … 1 its top) */
function t_chShell(p, t) {
	const { psiMax, y0, back, arm } = t_CH;
	// the arms' top-front corners rounded off, the bottom-front corners a little
	const cut = t > 0.68 ? 0.3 * (1 - Math.sqrt(Math.max(0, 1 - ((t - 0.68) / 0.32) ** 2))) : t < 0.12 ? 0.06 * (1 - Math.sqrt(Math.max(0, 1 - ((0.12 - t) / 0.12) ** 2))) : 0;
	const psi = p * (psiMax - cut);
	const [x, z] = t_chPlan(psi);
	const e = 0.002, [x1, z1] = t_chPlan(psi + e), [x0, z0] = t_chPlan(psi - e);
	const tx = x1 - x0, tz = z1 - z0, l = Math.hypot(tx, tz);
	const nx = tz / l, nz = -tx / l; // outward of the U (away from the seat)
	// the height and the lean by where along the U it is before the corner is cut (so every row agrees)
	const a = Math.abs(p) * psiMax;
	const top = arm + (back - arm) * (1 - span(a, 0.8, 1.5));
	const y = y0 + t * (top - y0);
	// the back leans back, the arms a little outward
	const lean = (y - y0) * (Math.tan((12 * Math.PI) / 180) * (1 - span(a, 0.6, 1.4)) + 0.06);
	const s = Math.sign(nx * x + nz * z) || 1;
	return [x + nx * lean * s, y, z + nz * lean * s];
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const { th } = t_CH;
	// the shell: plywood 12 mm, its grain running round it
	const NU = 84, NV = 18;
	const shell = t_thick(NU, NV, (u, v) => t_chShell(u * 2 - 1, v), th, { uv: (u, v) => [(u * 2 - 1) * 0.62, v * 0.4], tile: TILE.oak, hem: 4 });
	bag.add('oak', shell, null, o);
	// the seat: an oak pan and the bouclé cushion on it
	const seatPlan = superellipse(0.245, 0.245, 2.6, 96);
	const panPlan = superellipse(0.262, 0.245, 2.6, 96).map(([x, z]) => [x, z - 0.017]);
	bag.add('oak', t_round(panPlan, 0.37, 0.396, { rT: 0.004, rB: 0.004, nT: 2, nB: 2, nS: 1, tile: TILE.oak, caps: [0, 0.8, 0.98, 1], capsB: [0, 0.8, 0.98, 1] }).geo, null, o);
	const seat = t_round(seatPlan, 0.396, 0.452, {
		rT: 0.03,
		rB: 0.012,
		puff: 0.014,
		bulge: 0.003,
		nT: 7,
		nB: 3,
		disp: (x, y, z, part, q) => (part === 'top' ? [0, -0.006 * Math.exp(-((x / 0.12) ** 2) - (((z - 0.0) / 0.12) ** 2)) * (1 - q), 0] : [0, 0, 0])
	});
	bag.add('boucle-sand', seat.geo, null, { uv: 'box', chunk: false });
	bag.add('boucle-sand', t_pipe(seat.ring(Math.PI * 0.32, 0.003), 0.0042, 6), null, { uv: 'box', chunk: false });
	// the back pad, sewn into the curve of the shell
	const inward = (p, t) => {
		const a = t_chShell(p, t), b = t_chShell(p + 0.003, t), c = t_chShell(p, t + 0.003);
		const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
		return [a, n];
	};
	const P0 = 0.52, T0 = 0.21, T1 = 0.93;
	const padAt = (u, v, lift = 0) => {
		const p = (u * 2 - 1) * P0, t = lerp(T0, T1, v);
		const [a, n] = inward(p, t);
		const su = Math.abs(u * 2 - 1), sv = Math.abs(v * 2 - 1);
		const s = Math.pow(Math.pow(su, 4) + Math.pow(sv, 4), 0.25);
		const d = th / 2 + 0.0015 + lift + 0.042 * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, s), 4)), 0.42) * (1 + 0.04 * Math.sin(u * 9 + v * 4));
		return [a[0] + n.x * d, a[1] + n.y * d, a[2] + n.z * d];
	};
	const sp = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
	bag.add('boucle-sand', t_surf(40, 26, (u, v) => padAt(sp(u), sp(v))), null, { uv: 'box', chunk: false });
	const edge = [];
	for (let i = 0; i < 40; i++) edge.push(padAt(i / 40, 0, 0.003));
	for (let i = 0; i < 26; i++) edge.push(padAt(1, i / 26, 0.003));
	for (let i = 40; i > 0; i--) edge.push(padAt(i / 40, 1, 0.003));
	for (let i = 26; i > 0; i--) edge.push(padAt(0, i / 26, 0.003));
	bag.add('boucle-sand', t_pipe(edge, 0.0042, 6), null, { uv: 'box', chunk: false });
	// the swivel: the mechanism under the seat, the column, the hub
	bag.add('bronze', rbox(0.2, 0.026, 0.19, 0.006, 2), at(0, 0.356, 0.02), o);
	bag.add('bronze', lathe([[0.04, 0.095], [0.031, 0.1], [0.03, 0.19], [0.025, 0.2], [0.026, 0.32], [0.032, 0.33], [0.03, 0.335], [0, 0.335]], 40), null, o);
	bag.add('bronze', lathe([[0.04, 0.095], [0.052, 0.092], [0.058, 0.08], [0.056, 0.06], [0.05, 0.052], [0, 0.052]].reverse().map((p) => p), 40), null, o);
	// four legs, out at 45° to the seat, tapering oval sections falling to rounded tips over their glides
	const legLen = 0.3;
	const leg = t_surf(30, 14, (u, v) => {
		const x = 0.04 + u * legLen;
		const tip = Math.max(0, (u - 0.955) / 0.045), k = Math.sqrt(Math.max(0, 1 - tip * tip));
		const w = lerp(0.044, 0.026, u) * k, h = lerp(0.036, 0.017, u) * k;
		const y = lerp(0.075, 0.026, u) + 0.012 * Math.sin(Math.PI * u) - 0.004 * u * u;
		const a = v * TAU;
		return [x + (tip > 0 ? 0.012 * (1 - k) : 0), y + (h / 2) * Math.sin(a), (w / 2) * Math.cos(a)];
	});
	for (let k = 0; k < 4; k++) {
		const ry = Math.PI / 4 + (k * Math.PI) / 2;
		bag.add('bronze', leg.clone(), at(0, 0, 0, ry), o);
		const [gx, gz] = [(0.04 + legLen - 0.01) * Math.cos(ry), -(0.04 + legLen - 0.01) * Math.sin(ry)];
		bag.add('shadow', lathe([[0, 0.0], [0.016, 0.0], [0.018, 0.003], [0.017, 0.016], [0, 0.017]], 24), at(gx, 0, gz), o);
	}
	return t_centre(bag.build());
}
