/*
 * COFFEE TABLE, TRAVERTINE — a low table of honed travertine with an organic pebble top, 1.10 × 0.70 m and 0.35 m high,
 * as in the living room of reference picture 11. (Coffee tables stand 30–45 cm, a little under a sofa's seat; pebble
 * tops of this size are 1.0–1.3 m long.) The top a slab 50 mm thick whose plan is a soft superellipse pushed out of true
 * (one end fuller than the other, its long sides gently swelling), its edge rounded to a thick bullnose, more above than
 * below; under it a drum Ø 0.42 m set off the middle toward the fuller end, its edges eased, standing a few millimetres
 * shy of the top's underside so a shadow line runs between them. Rounded solids on their plans. Travertine
 * ('travertine'), its bedding running level.
 */
const THING = {
	id: 'table-coffee-travertine',
	label: 'Coffee table, travertine',
	note: 'A travertine coffee table with an organic pebble top, 1.10 × 0.70 m and 0.35 m high, on a drum Ø 0.42 m set off its middle.'
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

/** the pebble: a superellipse 1.10 × 0.70 m, one end fuller, its sides swelling a little, as a stone worn round */
function t_pebble(n = 180) {
	const pts = [];
	for (let i = 0; i < n; i++) {
		const t = (i / n) * TAU, c = Math.cos(t), s = Math.sin(t);
		const e = 2.35;
		let x = 0.55 * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), z = 0.35 * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
		// the fuller end at +x, the leaner at −x; a slight swell and drift so it is not a figure from a book
		z *= 1 + 0.07 * (x / 0.55) + 0.025 * Math.sin(t * 2 + 0.6);
		x += 0.012 * Math.sin(t * 3 + 1.1);
		z += 0.02 * (x / 0.55) ** 2 - 0.012;
		pts.push([x, z]);
	}
	return t_ccw(pts);
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const tile = TILE.travertine;
	const top = t_round(t_pebble(), 0.3, 0.35, { rT: 0.022, rB: 0.016, nT: 8, nB: 6, nS: 2, tile });
	bag.add('travertine', top.geo, null, o);
	const circle = (r, n, cx, cz) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * TAU), cz + r * Math.sin((i / n) * TAU)]);
	const drum = t_round(circle(0.21, 144, 0.07, 0.0), 0, 0.296, { rT: 0.006, rB: 0.004, nT: 4, nB: 3, nS: 3, bottom: false, tile, caps: [0, 0.7, 0.95, 1] });
	bag.add('travertine', drum.geo, null, o);
	return t_centre(bag.build());
}
