/*
 * ARMCHAIR, ROUND — a round tub armchair in cream bouclé, Ø 0.85 m, its back wrapping round the seat (round lounge
 * chairs of this kind are Ø 80–95 cm, seat 42–45 cm, back 68–78 cm). Made of: a low oak plinth set 9 cm in; a round
 * upholstered base to 0.33 m; a back 0.16 m thick swept round 260° of it, highest behind (0.72 m) and falling to arms of
 * 0.58 m at the front, its inner face leaning back and swelling toward the sitter, its top fully rounded, its two ends
 * domed down into the base; a deep seat cushion that fills the back's embrace and comes to the base's front edge,
 * domed by its stuffing (seat 0.45 m) and piped round its top seam. Rounded solids on round plans (t_round), the back a
 * section swept round the circle (t_sweep). Bouclé ('boucle'), oak ('oak').
 */
const THING = {
	id: 'armchair-round',
	label: 'Armchair, round',
	note: 'A round bouclé tub armchair, Ø 0.85 m: its back wrapping 260° round a puffed, piped seat cushion (seat 0.45 m, back 0.72 m), on a recessed oak plinth.'
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
 * An upholstered band swept along a line: at each s of `ss`, a cross-section `prof` of [t, y] points (t across the
 * line, y up) from its inner foot up, over its top and down to its outer foot; `shape(s, t, y)` → [t, y] changes the
 * section along the way (domed ends, creases), `place(s, t)` → [x, z] puts it on the plan. Laid so that s running to
 * +x and the section rising first makes its inner face look toward +z.
 */
function t_sweep(ss, prof, place, shape) {
	return t_surf(ss.length - 1, prof.length - 1, (u, v, i, j) => {
		let [t, y] = prof[j];
		if (shape) [t, y] = shape(ss[i], t, y, j);
		const [x, z] = place(ss[i], t);
		return [x, y, z];
	});
}

/**
 * The cross-section of an upholstered back: its inner face from (tIn, y0) leaning back by `lean` (m per m) and swelling
 * toward the seat by `swell`, rounded over its top (radius r, highest at yTop) and down its outer face at tOut to its
 * outer foot (tFoot, yFoot): lower than y0 where the back wraps down over the side of what it stands on.
 */
function t_backProfile(tIn, tOut, y0, yTop, r, lean, swell, n = 14, yFoot = y0, tFoot = tOut) {
	const cy = yTop - r, tc = tOut - r;
	const tInTop = tc - r;
	const pts = [];
	const k = 7;
	for (let i = 0; i < k; i++) {
		const f = i / k, y = lerp(y0, cy, f);
		pts.push([lerp(tIn, tInTop, f) - swell * Math.sin(Math.PI * f), y]);
	}
	for (let i = 0; i <= n; i++) {
		const a = Math.PI - (Math.PI * i) / n;
		pts.push([tc + r * Math.cos(a), cy + r * Math.sin(a)]);
	}
	const m = yFoot < y0 - 0.05 ? 7 : 5;
	for (let i = 1; i <= m; i++) {
		const f = i / m;
		pts.push([lerp(tOut, tFoot, f * f) + 0.006 * Math.sin(Math.PI * f), lerp(cy, yFoot, f)]);
	}
	return pts;
}

/* ---- the thing ---- */

const t_AC = { R: 0.425, y0: 0.33, wrap: (260 * Math.PI) / 180, tIn: -0.16 };

/** a point of the plan at s along the chair's rim (0 behind it, +x to its right) and t in from it (negative inward) */
function t_acAt(s, t) {
	const a = s / t_AC.R, r = t_AC.R + t;
	return [r * Math.sin(a), -r * Math.cos(a)];
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const box = { uv: 'box', chunk: false };
	const { R, y0, wrap, tIn } = t_AC;
	const circle = (r, n, cz = 0) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * TAU), cz + r * Math.sin((i / n) * TAU)]);
	// the plinth and the base
	bag.add('oak', t_round(circle(R - 0.09, 96), 0, 0.05, { rT: 0.003, rB: 0.002, nT: 2, nB: 1, nS: 1, bottom: false, tile: TILE.oak, caps: [0, 0.9, 1] }).geo, null, { chunk: false });
	bag.add('boucle', t_round(circle(R, 128), 0.05, y0, { rT: 0.05, rB: 0.035, bulge: 0.007, nT: 5, nB: 3, nS: 2, bottom: false, caps: [0, 0.6, 0.85, 0.95, 0.99, 1] }).geo, null, box);
	// the back, round 260° of the rim: highest behind, falling to the arms, its ends domed
	const S = (wrap / 2) * R, De = 0.13;
	const ss = t_steps(-S, S, 0.03, [[-S, -S + De], [S - De, S]], 0.012);
	const prof = t_backProfile(tIn, 0.003, y0, 0.72, 0.075, 0, 0.018, 14, 0.065, 0.011);
	const tc = tIn / 2;
	const back = t_sweep(ss, prof, t_acAt, (s, t, y) => {
		const f = Math.abs(s) / S;
		// the arms lower than the back, the fall smooth
		const h = 1 - 0.36 * span(f, 0.3, 0.85);
		const x = Math.max(0, (Math.abs(s) - (S - De)) / De), k = Math.sqrt(Math.max(0, 1 - x * x));
		return [tc + (t - tc) * Math.pow(k, 0.5), y0 + (y - y0) * (y > y0 ? h : 1) * k];
	});
	bag.add('boucle', back, null, box);
	// the seat cushion: round behind, filling the back's embrace, to the base's front edge
	const plan = superellipse(0.27, 0.34, 2.15, 120).map(([x, z]) => [x, z + 0.07]);
	const cushion = t_round(plan, y0, 0.43, {
		rT: 0.055,
		rB: 0.02,
		puff: 0.038,
		pow: 2.4,
		bulge: 0.008,
		nT: 6,
		nB: 3,
		nS: 2,
		capsB: [0, 0.9, 1],
		disp: (x, y, z, part, q) => (part === 'top' ? [0, -0.007 * Math.exp(-((x / 0.15) ** 2) - (((z - 0.12) / 0.15) ** 2)) * (1 - q * q), 0] : [0, 0, 0])
	});
	bag.add('boucle', cushion.geo, null, box);
	bag.add('boucle', t_pipe(cushion.ring(Math.PI * 0.3, 0.003), 0.0045, 5), null, box);
	return bag.build();
}
