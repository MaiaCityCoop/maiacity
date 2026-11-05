/*
 * DESK, CURVED — an organic oak desk as in reference picture 2: a serpentine top 1.62 × 0.68 m, 0.75 m high (a desk
 * stands 72–76 cm; a writing desk's top is 60–75 cm deep), its front sweeping in where one sits and out again over a
 * curved cabinet of three drawers at the left end; at the right end a single rounded panel leg. The top is solid oak
 * 45 mm thick, its edge rounded to a full soft bullnose (20 mm above, 13 mm below), its grain running along it and round
 * its edge. The cabinet's plan follows the top's left lobe 3 cm in from it; its three drawers are stacked curved blocks
 * with 4 mm reveals between them (dark behind), on a plinth set 35 mm back; the leg a stadium-plan panel 70 mm thick, its grain running up,
 * every edge rounded. Push-to-open drawers (no handles), as on Geoship's furniture. Rounded solids on their plans
 * (t_round). Oak ('oak'), the dark of the reveals ('shadow').
 */
const THING = {
	id: 'desk-curved',
	label: 'Desk, curved',
	note: 'An organic oak desk: a serpentine top 1.62 × 0.68 m, 0.75 m high, with a thick rounded edge, on a curved cabinet of three drawers at one end and a rounded panel leg at the other.'
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

/** a closed counter-clockwise plan moved in by `d` (out where d is negative), each point along its normal */
function t_inset(points, d) {
	const m = points.length;
	return points.map((p, i) => {
		const a = points[(i - 1 + m) % m], b = points[(i + 1) % m];
		const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
		return [p[0] - (tz / l) * d, p[1] + (tx / l) * d];
	});
}

/** a stadium (a slot with round ends) `len` long along x and `w` wide, centred, counter-clockwise */
function t_stadium(len, w, n = 20) {
	const r = w / 2, c = len / 2 - r, pts = [];
	for (let i = 0; i <= n; i++) {
		const a = -Math.PI / 2 + (Math.PI * i) / n;
		pts.push([c + r * Math.cos(a), r * Math.sin(a)]);
	}
	for (let i = 0; i <= n; i++) {
		const a = Math.PI / 2 + (Math.PI * i) / n;
		pts.push([-c + r * Math.cos(a), r * Math.sin(a)]);
	}
	return pts;
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

/** the top's plan: back straight against the wall, the right end round, the front sweeping in and out again */
const t_DESK_TOP = [
	[0.8, -0.06], [0.76, 0.13], [0.62, 0.235], [0.4, 0.225], [0.14, 0.135], [-0.12, 0.16], [-0.38, 0.29], [-0.6, 0.34],
	[-0.76, 0.24], [-0.815, 0.03], [-0.77, -0.2], [-0.62, -0.315], [-0.32, -0.34], [0.1, -0.34], [0.5, -0.325], [0.72, -0.25]
];
/** the cabinet's plan, under the left lobe */
const t_DESK_CAB = [
	[-0.27, 0.2], [-0.42, 0.255], [-0.6, 0.29], [-0.725, 0.2], [-0.77, 0.02], [-0.735, -0.18], [-0.61, -0.285], [-0.43, -0.305], [-0.3, -0.27], [-0.25, -0.05]
];

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const tile = TILE.oak;
	const top = t_loop(t_DESK_TOP, 220);
	bag.add('oak', t_round(top, 0.705, 0.75, { rT: 0.02, rB: 0.013, nT: 8, nB: 6, nS: 1, tile }).geo, null, o);
	// the cabinet: a plinth set back, three drawers with reveals, the dark core the reveals show
	const cab = t_loop(t_DESK_CAB, 150);
	const few = { caps: [0, 0.6, 0.93, 0.99, 1], capsB: [0, 0.6, 0.93, 0.99, 1] };
	bag.add('oak', t_round(t_inset(cab, 0.035), 0, 0.06, { rT: 0.003, rB: 0.002, nT: 2, nB: 2, nS: 1, bottom: false, tile, ...few }).geo, null, o);
	const drawers = [[0.06, 0.32], [0.324, 0.548], [0.552, 0.7]];
	for (const [y0, y1] of drawers) bag.add('oak', t_round(cab, y0, y1, { rT: 0.003, rB: 0.003, nT: 3, nB: 3, nS: 1, tile, ...few }).geo, null, o);
	bag.add('shadow', t_round(t_inset(cab, 0.012), 0.058, 0.712, { rT: 0.001, nT: 1, nB: 1, nS: 1, ...few }).geo, null, o);
	// the leg: a panel 50 mm thick on a stadium plan, under the right end, turned with it
	const leg = t_round(t_stadium(0.42, 0.07, 18), 0, 0.71, { rT: 0.004, rB: 0.004, nT: 3, nB: 3, nS: 1, tile, grainUp: true, ...few });
	bag.add('oak', leg.geo, at(0.64, 0, -0.03, Math.PI / 2), o);
	return t_centre(bag.build());
}
