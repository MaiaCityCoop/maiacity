/*
 * SOFA, CURVED — a curved modular sofa in cream bouclé, as in the living room of reference picture 11: three modules on
 * one arc (3.1 m along its back, 2.9 m from end to end, 0.95 m deep), its front concave so those on it face each other a
 * little. Curved sofas of this kind are 2.6–3.6 m along the arc, 90–105 cm deep, seat 40–45 cm, back 70–80 cm. Made of:
 * a low oak plinth set 7 cm back (the sofa seems to float); an upholstered base whose ends are rounded broadly in plan;
 * three deep seat cushions on it (0.69 m deep, 0.17 m thick), domed by their stuffing, piped round their top seam, the
 * end ones rounded with the base; a continuous rounded back 0.27 m thick and 0.75 m high, leaning 10° and swelling toward
 * the seat, its ends domed down into the base and a crease where its modules meet; two loose cushions, rust and clay
 * linen, leaning on it. Rounded solids on plans laid round the arc (t_round, t_sectorPlan), the back a section swept
 * along the arc (t_sweep), stuffed pillows bent where they lean (t_pillow, t_bend). Bouclé ('boucle'), linen
 * ('linen-rust', 'linen-clay'), oak ('oak').
 */
const THING = {
	id: 'sofa-curved',
	label: 'Sofa, curved',
	note: 'A curved modular sofa in cream bouclé, about 3.1 m along its arc and 0.95 m deep: deep piped seat cushions, a continuous rounded back 0.75 m high, a low oak plinth and two linen cushions.'
};

/* ---- shapes this thing is made with ---- */

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

/** a closed counter-clockwise plan moved in by `d` (out where d is negative), each point along its normal */
function t_inset(points, d) {
	const m = points.length;
	return points.map((p, i) => {
		const a = points[(i - 1 + m) % m], b = points[(i + 1) % m];
		const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
		return [p[0] - (tz / l) * d, p[1] + (tx / l) * d];
	});
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

/**
 * The plan of a piece laid round an arc: a rectangle in (s, t) (s along the arc from s0 to s1, t across it from t0 at
 * its front to t1 at its back) with its corners rounded [front-left, front-right, back-right, back-left], put on the
 * plan by `place(s, t)` → [x, z]; counter-clockwise.
 */
function t_sectorPlan(s0, s1, t0, t1, radii, place, step = 0.02) {
	const [rfl, rfr, rbr, rbl] = radii;
	const pts = [];
	const line = (a, b, c, d) => {
		const n = Math.max(1, Math.ceil(Math.hypot(c - a, d - b) / step));
		for (let i = 0; i < n; i++) pts.push([lerp(a, c, i / n), lerp(b, d, i / n)]);
	};
	const arc = (cs, ct, r, a0) => {
		const n = Math.max(2, Math.ceil(((Math.PI / 2) * r) / (step * 0.6)));
		for (let i = 0; i < n; i++) {
			const a = a0 + (i / n) * (Math.PI / 2);
			pts.push([cs + r * Math.cos(a), ct + r * Math.sin(a)]);
		}
	};
	line(s0 + rfl, t0, s1 - rfr, t0);
	arc(s1 - rfr, t0 + rfr, rfr, -Math.PI / 2);
	line(s1, t0 + rfr, s1, t1 - rbr);
	arc(s1 - rbr, t1 - rbr, rbr, 0);
	line(s1 - rbr, t1, s0 + rbl, t1);
	arc(s0 + rbl, t1 - rbl, rbl, Math.PI / 2);
	line(s0, t1 - rbl, s0, t0 + rfl);
	arc(s0 + rfl, t0 + rfl, rfl, Math.PI);
	return t_ccw(pts.map(([s, t]) => place(s, t)));
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

/** the arc: its middle line's radius, half its length along that line, the centre in front of it */
const t_SOFA = { Rm: 2.225, Sm: 1.28, t0: -0.475, t1: 0.475, tIn: 0.205, y0: 0.25, seat: 0.42 };

/** a point of the plan at s along the arc's middle line and t across it (negative toward the front) */
function t_sofaAt(s, t) {
	const { Rm } = t_SOFA, a = s / Rm, r = Rm + t;
	return [r * Math.sin(a), Rm - r * Math.cos(a)];
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const box = { uv: 'box', chunk: false };
	const { Sm, t0, t1, tIn, y0, seat } = t_SOFA;
	// the base: bouclé, its ends rounded broadly in plan, on an oak plinth set back
	const base = t_sectorPlan(-Sm, Sm, t0, t1, [0.36, 0.36, 0.16, 0.16], t_sofaAt, 0.034);
	bag.add('boucle', t_round(base, 0.06, y0, { rT: 0.05, rB: 0.03, bulge: 0.008, nT: 5, nB: 3, nS: 2, bottom: false, caps: [0, 0.6, 0.85, 0.95, 0.99, 1] }).geo, null, box);
	bag.add('oak', t_round(t_inset(base, 0.07), 0, 0.06, { rT: 0.003, rB: 0.002, nT: 2, nB: 1, nS: 1, bottom: false, tile: TILE.oak, caps: [0, 0.9, 1] }).geo, null, { chunk: false });
	// three seat cushions
	const g = 0.006, cuts = [-Sm + 0.004, -Sm / 3, Sm / 3, Sm - 0.004];
	for (let k = 0; k < 3; k++) {
		const s0 = cuts[k] + (k ? g : 0), s1 = cuts[k + 1] - (k < 2 ? g : 0);
		const radii = k === 0 ? [0.34, 0.05, 0.05, 0.14] : k === 2 ? [0.05, 0.34, 0.14, 0.05] : [0.05, 0.05, 0.05, 0.05];
		const plan = t_sectorPlan(s0, s1, t0 - 0.006, tIn - 0.004, radii, t_sofaAt, 0.03);
		let cx = 0, cz = 0;
		for (const [x, z] of plan) (cx += x), (cz += z);
		cx /= plan.length;
		cz /= plan.length;
		// crowned by its stuffing: a smooth bump over the cushion's own length and depth
		const crown = (x, z) => {
			const r = Math.hypot(x, t_SOFA.Rm - z), sa = Math.atan2(x, t_SOFA.Rm - z) * t_SOFA.Rm, ta = r - t_SOFA.Rm;
			const fs = clamp((sa - s0) / (s1 - s0)), ft = clamp((ta - t0) / (tIn - t0));
			return 0.026 * Math.pow(Math.sin(Math.PI * fs) * Math.sin(Math.PI * ft), 0.55);
		};
		const cushion = t_round(plan, y0, seat - 0.008, {
			rT: 0.055,
			rB: 0.025,
			puffAt: crown,
			bulge: 0.009,
			nT: 6,
			nB: 3,
			nS: 2,
			capsB: [0, 0.9, 1],
			// sat on: a soft hollow toward the front of each
			disp: (x, y, z, part, q) => (part === 'top' ? [0, -0.008 * Math.exp(-(((x - cx) / 0.3) ** 2) - (((z - cz) * 1 - 0.1) / 0.22) ** 2) * (1 - q * q), 0] : [0, 0, 0])
		});
		bag.add('boucle', cushion.geo, null, box);
		bag.add('boucle', t_pipe(cushion.ring(Math.PI * 0.3, 0.003), 0.0045, 5), null, box);
	}
	// the back: one rounded section along the whole arc, its ends domed down, creased where the modules meet
	const De = 0.3;
	const ss = t_steps(-Sm, Sm, 0.04, [[-Sm, -Sm + De], [-Sm / 3 - 0.06, -Sm / 3 + 0.06], [Sm / 3 - 0.06, Sm / 3 + 0.06], [Sm - De, Sm]], 0.016);
	const prof = t_backProfile(tIn, t1 + 0.004, y0, 0.75, 0.1, 0, 0.022, 16, 0.075, t1 + 0.012);
	const tc = (tIn + t1) / 2;
	const back = t_sweep(ss, prof, t_sofaAt, (s, t, y) => {
		const x = Math.max(0, (Math.abs(s) - (Sm - De)) / De), k = Math.sqrt(Math.max(0, 1 - x * x));
		let crease = 0;
		for (const j of [-Sm / 3, Sm / 3]) crease += Math.exp(-(((s - j) / 0.03) ** 2));
		const kt = Math.pow(k, 0.55) * (1 - 0.07 * crease), ky = k * (1 - 0.03 * crease);
		return [tc + (t - tc) * kt, y0 + (y - y0) * ky];
	});
	bag.add('boucle', back, null, box);
	// two loose cushions leaning on the back
	const loose = (s, turn, mat, seed, size) => {
		const p = t_pillow(size, size, 0.2, { seed, lump: 0.12, pinch: 0.09, e: 0.42, crease: 0.12 });
		const geo = t_bend(p.geo, -size / 2, size / 2, (d) => 0.98 * span(d, 0.07, 0.2));
		const tFront = tIn - 0.27;
		const [x, z] = t_sofaAt(s, tFront);
		bag.add(mat, geo, at(x, seat + 0.016 + 0.075, z, -s / t_SOFA.Rm + turn), box);
	};
	loose(-0.66, 0.1, 'linen-rust', 5, 0.46);
	loose(0.5, -0.08, 'linen-clay', 6, 0.44);
	return t_centre(bag.build());
}
