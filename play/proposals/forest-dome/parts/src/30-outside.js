/* ================================================================================================================
 * 4. OUTSIDE — a one-storey limestone arcade round the dome's foot (nobody stands on it: no terrace), the cloister
 *    walk under it, the apron of gravel beyond its step and the flagstone paths straight out from the gates
 * ================================================================================================================ */

/**
 * THE ARCADE'S MEASURES. Sixty piers whose middles stand on the circle of radius `out_RP`: a wider bay centred on each
 * gate's bearing (its path passes straight under that arch to the gate) and fourteen bays of 4.56 m in each quarter
 * between. A bay's wall runs straight from pier to pier (the ring a polygon of sixty sides, its stones cut to the
 * angle over each pier). Semicircular arches of voussoirs spring at 3.0 m from the piers' imposts; ashlar runs up
 * the spandrels in courses to the cornice, a low parapet and its coping above it; behind them the arcade's roof, a
 * sedum mat, rises to the shell, a lime soffit under it. Heights are from the ground (y 0); the walk is at `out_YW`.
 */
const out_YW = 0.15;
const out_RP = R + 4.4;
/** half a pier's side (piers 0.75 m square) and half the wall's thickness over them */
const out_HALF = 0.375;
const out_SPRING = 3.0;
/** the voussoirs' depth, intrados to extrados */
const out_RING = 0.36;
/** the spandrels' bed joints, from the springing to the cornice's bed */
const out_COURSES = [3.0, 3.95, 4.45, 4.95, 5.45, 6.0];
const out_CORNICE = 6.0;
const out_CORNICE_TOP = 6.35;
const out_PARAPET = 6.65;
/** the joints between stones, and how much each arris is eased */
const out_JOINT = 0.007;
const out_EASE = 0.006;
/** the roof's pitch, rising from the parapet to the shell (15°) */
const out_SLOPE = Math.tan((15 * Math.PI) / 180);
/** the roof's sedum at the parapet, and its soffit at the wall */
const out_ROOF_Y = 6.41;
const out_SOFFIT_Y = out_CORNICE;
/** the walk's edge: its kerb's inner face; the gravel apron beyond it; a path's half width; where the paths end */
const out_KERB = R + 5.1;
const out_KERB_W = 0.3;
const out_APRON = 2.0;
const out_EDGE_W = 0.12;
const out_PATH = 1.2;
/** a path's half width at its gate, across the walk and the apron, before it narrows to out_PATH (over 4 m) */
const out_PATH_GATE = 2.25;
const out_PATH_END = R + 18;
const out_PATH_Y = 0.03;
/** the walk's floor at a gate's threshold, ramped down to it from out_YW (just over the gate's own floor) */
const out_SILL = 0.04;
/**
 * The gate's bay (Samuel 2026-11-05: the doors are round-arched gates about 4 m high and 4 m wide): an arch of 5.1 m
 * clear centred on each gate's bearing, over the path straight to it, open to the sky behind (the arcade's roof stops
 * either side, clear of the gate's stonework); its piers stronger, 1.0 m along the ring (`out_FLANK` more on the gate's
 * side). Bays are reckoned pier middle to pier middle as if every pier were 0.75 m.
 */
const out_DOOR_BAY = 5.85;
const out_FLANK = 0.25;
const out_BAYS = 14;
const out_TILE = 1.5;

/** the roof's flashing: dull grey lead, no picture of its own */
material('out-lead', 1, () => new THREE.MeshStandardMaterial({ color: '#8d9093', metalness: 0.35, roughness: 0.62 }));

/** a bearing brought into −π … π */
const out_wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The ring: its piers (bearing `a`, quarter `q`, place `j` 0 … 14 from the gate bay's east side) and the bays between
 * them, each with its own frame: `am` its middle bearing, `d` how far its wall's middle line stands from the dome's
 * middle, `L` half its length pier to pier, `ri`/`ro` its arch's intrados and extrados radii, `key` the keystone's top,
 * `door` the gate it is centred on (or null).
 */
function out_plan() {
	const wD = out_DOOR_BAY / out_RP;
	const wS = (Math.PI / 2 - wD) / out_BAYS;
	const piers = [];
	for (let q = 0; q < 4; q++) for (let j = 0; j < out_BAYS + 1; j++) piers.push({ i: piers.length, a: (q * Math.PI) / 2 + wD / 2 + j * wS, q, j });
	const bays = piers.map((p, i) => {
		const next = piers[(i + 1) % piers.length];
		let a1 = next.a;
		if (a1 < p.a) a1 += TAU;
		const h = (a1 - p.a) / 2;
		const am = p.a + h;
		const door = p.j === out_BAYS ? DOORS.find((dd) => Math.abs(out_wrap(dd.a - am)) < 0.01) ?? null : null;
		const L = out_RP * Math.sin(h);
		const ri = L - out_HALF;
		const ro = ri + (door ? out_RING - 0.02 : out_RING);
		// voussoirs: 13 to an arch, 15 to a gate's (a little thinner, so its crown stays under the cornice)
		const n = door ? 15 : 13;
		// the keystone rises to the first bed joint at least 8 cm over the extrados' crown
		const key = out_COURSES.find((y) => y > out_SPRING + ro + 0.08) ?? out_CORNICE;
		return { i, p0: i, p1: next.i, a0: p.a, a1, am, d: out_RP * Math.cos(h), L, ri, ro, n, key, door, q: p.q, j: p.j };
	});
	const doors = DOORS.map((dd) => ({ ...dd, a: out_wrap(dd.a) }));
	return { piers, bays, doors };
}

/** a point of a frame in the world: F = { o: [x, z] its origin, a its turn, d its wall's distance (0: no fanning) }.
 *  x runs along the frame (eastward round the ring), z out from the dome, y up. Where `d` is given, x is fanned by
 *  (d + z) / d, so a bay's ends lie in the radial planes through its piers and its stones meet the next bay's there. */
function out_world(F, x, y, z) {
	const k = F.d ? (F.d + z) / F.d : 1;
	const X = x * k, c = Math.cos(F.a), s = Math.sin(F.a);
	return [F.o[0] + X * c + z * s, y, F.o[1] - X * s + z * c];
}
/** a frame's own shape moved into the world (its normals turned with it) */
function out_put(geo, F) {
	const p = geo.attributes.position, n = geo.attributes.normal;
	const c = Math.cos(F.a), s = Math.sin(F.a);
	for (let i = 0; i < p.count; i++) {
		const w = out_world(F, p.getX(i), p.getY(i), p.getZ(i));
		p.setXYZ(i, w[0], w[1], w[2]);
		if (n) {
			const nx = n.getX(i), nz = n.getZ(i);
			n.setXYZ(i, nx * c + nz * s, n.getY(i), -nx * s + nz * c);
		}
	}
	p.needsUpdate = true;
	if (n) n.needsUpdate = true;
	return geo;
}

/** a stone's own tint, from a stream of chance */
const out_tint = (r) => {
	const t = 0.86 + 0.17 * r(), w = (r() - 0.4) * 0.07;
	return [t * (1 + w), t, t * (1 - w * 1.2)];
};
/** the mortar seen deep in the joints */
const out_MORTAR = [0.6, 0.56, 0.5];

/** triangles gathered: flat ones turned to face where they should, their UVs laid by the side they face (metres over
 *  the tile, shifted by `off` so no two stones show the same part of the picture), or soft ones with their own */
class out_Mesh {
	constructor(tile = out_TILE, off = [0, 0]) {
		this.P = [];
		this.N = [];
		this.U = [];
		this.tile = tile;
		this.off = off;
	}
	flat(a, b, c, f) {
		const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
		const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
		let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
		const l = Math.hypot(nx, ny, nz);
		if (l < 1e-12) return;
		const flip = nx * f[0] + ny * f[1] + nz * f[2] < 0;
		const k = flip ? -1 / l : 1 / l;
		nx *= k;
		ny *= k;
		nz *= k;
		const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
		// which two of x, y, z the picture is laid along
		const iu = ay >= ax && ay >= az ? 0 : ax >= az ? 2 : 0, iv = ay >= ax && ay >= az ? 2 : 1;
		const t = this.tile, [ou, ov] = this.off;
		for (const p of flip ? [a, c, b] : [a, b, c]) {
			this.P.push(p[0], p[1], p[2]);
			this.N.push(nx, ny, nz);
			this.U.push(p[iu] / t + ou, p[iv] / t + ov);
		}
	}
	soft(a, b, c, na, nb, nc, ua, ub, uc) {
		const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
		const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
		const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
		if (Math.hypot(nx, ny, nz) < 1e-12) return;
		const f = [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]];
		let v = [[a, na, ua], [b, nb, ub], [c, nc, uc]];
		if (nx * f[0] + ny * f[1] + nz * f[2] < 0) v = [v[0], v[2], v[1]];
		for (const [p, n, uv] of v) {
			this.P.push(p[0], p[1], p[2]);
			this.N.push(n[0], n[1], n[2]);
			this.U.push(uv[0] / this.tile + this.off[0], uv[1] / this.tile + this.off[1]);
		}
	}
	geometry() {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
		return g;
	}
}

/**
 * A dressed stone: the outline `pts` ([u, v], counter-clockwise) cut through from w0 to w1, every arris round both
 * faces eased by a small chamfer `o.c` (an edge whose index is in `o.sharp` keeps its full arris: a stone that runs on
 * past a corner into the next bay's half of it). `o.map(u, v, w)` → [x, y, z] lays it in its frame (by default u, v,
 * w are x, y, z). Flat faces, crisp edges.
 */
function out_stone(pts, w0, w1, o = {}) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const map = o.map ?? ((u, v, w) => [u, v, w]);
	const c = o.c ?? out_EASE;
	const n = pts.length;
	const E = [];
	for (let i = 0; i < n; i++) {
		const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
		const l = Math.hypot(bx - ax, by - ay) || 1;
		E.push([-(by - ay) / l, (bx - ax) / l]);
	}
	const ce = (i) => (o.sharp?.includes((i + n) % n) ? 0 : c);
	const inset = pts.map(([x, y], i) => {
		if (!c) return [x, y];
		const p = E[(i - 1 + n) % n], q = E[i], cp = ce(i - 1), cq = ce(i);
		const det = p[0] * q[1] - p[1] * q[0];
		let ax, ay;
		if (Math.abs(det) < 0.08) {
			const sx = p[0] + q[0], sy = p[1] + q[1], l = Math.hypot(sx, sy) || 1, k = Math.max(cp, cq);
			ax = (sx / l) * k;
			ay = (sy / l) * k;
		} else {
			ax = (cp * q[1] - p[1] * cq) / det;
			ay = (p[0] * cq - cp * q[0]) / det;
		}
		const l = Math.hypot(ax, ay);
		if (l > 3 * c) (ax *= (3 * c) / l), (ay *= (3 * c) / l);
		return [x + ax, y + ay];
	});
	const o0 = map(0, 0, 0);
	const dir = (v) => [v[0] - o0[0], v[1] - o0[1], v[2] - o0[2]];
	const FW = dir(map(0, 0, 1)), BW = dir(map(0, 0, -1));
	// the rings round the stone, laid in its frame once: the front face (inset where eased), the sides, the back
	const rings = (c ? [[inset, w1], [pts, w1 - c], [pts, w0 + c], [inset, w0]] : [[pts, w1], [pts, w0]]).map(([P, w]) => P.map((q) => map(q[0], q[1], w)));
	const front = rings[0], back = rings[rings.length - 1];
	const tri = THREE.ShapeUtils.triangulateShape(inset.map(([x, y]) => new THREE.Vector2(x, y)), []);
	for (const [a, b, cc] of tri) {
		m.flat(front[a], front[b], front[cc], FW);
		m.flat(back[a], back[b], back[cc], BW);
	}
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		const out = dir(map(-E[i][0], -E[i][1], 0));
		for (let k = 0; k < rings.length - 1; k++) {
			const A = rings[k], B = rings[k + 1];
			const lean = c && k === 0 ? FW : c && k === rings.length - 2 ? BW : null;
			const f = lean ? [out[0] + lean[0], out[1] + lean[1], out[2] + lean[2]] : out;
			m.flat(A[i], A[j], B[j], f);
			m.flat(A[i], B[j], B[i], f);
		}
	}
	return m.geometry();
}

/**
 * A moulded stone: the profile `prof` ([z, y], counter-clockwise round its section) run straight along x from x0 to
 * x1, its ends cut square and closed. Normals soft across the profile's curves (where two of its sides turn by less
 * than `o.soft`), crisp at its fillets; UVs along it and round the profile in metres.
 */
function out_moulding(prof, x0, x1, o = {}) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const n = prof.length, soft = o.soft ?? 0.5;
	const S = [], len = [0];
	for (let i = 0; i < n; i++) {
		const [az, ay] = prof[i], [bz, by] = prof[(i + 1) % n];
		const l = Math.hypot(bz - az, by - ay) || 1;
		S.push([0, -(bz - az) / l, (by - ay) / l]);
		len.push(len[i] + l);
	}
	const blend = (s, t) => {
		if (s[0] * t[0] + s[1] * t[1] + s[2] * t[2] < Math.cos(soft)) return s;
		const v = [s[0] + t[0], s[1] + t[1], s[2] + t[2]], l = Math.hypot(...v);
		return [v[0] / l, v[1] / l, v[2] / l];
	};
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		const na = blend(S[i], S[(i - 1 + n) % n]), nb = blend(S[i], S[j]);
		const a0 = [x0, prof[i][1], prof[i][0]], b0 = [x0, prof[j][1], prof[j][0]];
		const a1 = [x1, prof[i][1], prof[i][0]], b1 = [x1, prof[j][1], prof[j][0]];
		m.soft(a0, b0, b1, na, nb, nb, [x0, len[i]], [x0, len[i + 1]], [x1, len[i + 1]]);
		m.soft(a0, b1, a1, na, nb, na, [x0, len[i]], [x1, len[i + 1]], [x1, len[i]]);
	}
	if (o.caps !== false) {
		const tri = THREE.ShapeUtils.triangulateShape(prof.map(([z, y]) => new THREE.Vector2(z, y)), []);
		for (const [a, b, c] of tri) {
			const P = (k, x) => [x, prof[k][1], prof[k][0]];
			m.flat(P(a, x0), P(b, x0), P(c, x0), [-1, 0, 0]);
			m.flat(P(a, x1), P(b, x1), P(c, x1), [1, 0, 0]);
		}
	}
	return m.geometry();
}

/**
 * A moulding run round a square pier (a base, a capital): the profile `prof` ([d, y], from its foot up, d how far out
 * of the pier's face of half side `half`), four sides mitred at the corners, soft across the profile's curves.
 */
function out_squareMoulding(prof, half, o = {}, hz = half) {
	const m = new out_Mesh(o.tile ?? out_TILE, o.uv ?? [0, 0]);
	const n = prof.length, soft = o.soft ?? 0.5;
	const S = [], len = [0];
	for (let i = 0; i < n - 1; i++) {
		const [ad, ay] = prof[i], [bd, by] = prof[i + 1];
		const l = Math.hypot(bd - ad, by - ay) || 1;
		S.push([(by - ay) / l, -(bd - ad) / l]);
		len.push(len[i] + l);
	}
	const blend = (s, t) => {
		if (!t || s[0] * t[0] + s[1] * t[1] < Math.cos(soft)) return s;
		const l = Math.hypot(s[0] + t[0], s[1] + t[1]);
		return [(s[0] + t[0]) / l, (s[1] + t[1]) / l];
	};
	// the sides: outward along +z, −x, −z, +x, each from one corner to the next
	const sides = [
		[[0, 1], [1, 1], [-1, 1]],
		[[-1, 0], [-1, 1], [-1, -1]],
		[[0, -1], [-1, -1], [1, -1]],
		[[1, 0], [1, -1], [1, 1]]
	];
	for (const [out, c0, c1] of sides) {
		for (let i = 0; i < n - 1; i++) {
			const da = prof[i][0], db = prof[i + 1][0];
			const P = (cn, dd, y) => [cn[0] * (half + dd), y, cn[1] * (hz + dd)];
			const a0 = P(c0, da, prof[i][1]), b0 = P(c0, db, prof[i + 1][1]), a1 = P(c1, da, prof[i][1]), b1 = P(c1, db, prof[i + 1][1]);
			const sa = blend(S[i], S[i - 1]), sb = blend(S[i], S[i + 1]);
			const N = (s) => [out[0] * s[0], s[1], out[1] * s[0]];
			const w = 2 * (out[0] ? hz : half);
			m.soft(a0, b0, b1, N(sa), N(sb), N(sb), [0, len[i]], [0, len[i + 1]], [w, len[i + 1]]);
			m.soft(a0, b1, a1, N(sa), N(sb), N(sa), [0, len[i]], [w, len[i + 1]], [w, len[i]]);
		}
	}
	return m.geometry();
}

/**
 * THE KIT OF A QUARTER. The outside is four alike quarters, door to door: one is built (each stone cut once, the
 * weather on it worked out once) and laid round four times, turned, each time with every stone's tint drawn afresh
 * and its pictures shifted, so no two quarters show the same stones. What a quarter holds, by material: positions,
 * normals, UVs; and for the limestone each vertex's stone (−1 the mortar) and its weather.
 */
class out_Kit {
	constructor() {
		this.parts = new Map();
		this.stones = 0;
	}
	part(m) {
		if (!this.parts.has(m)) this.parts.set(m, { P: [], N: [], U: [], S: m === 'limestone' ? [] : null, W: m === 'limestone' ? [] : null });
		return this.parts.get(m);
	}
	/** a shape of material `m`, its UVs laid by the side it faces in metres where `box` */
	add(m, geo, box = false) {
		const g = box ? boxUV(geo, TILE[m] ?? 1) : geo.index ? geo.toNonIndexed() : geo;
		const p = this.part(m);
		const P = g.attributes.position.array;
		p.P.push(P);
		p.N.push(g.attributes.normal.array);
		p.U.push(g.attributes.uv?.array ?? new Float32Array((P.length / 3) * 2));
		return g;
	}
	/**
	 * A stone (with `id`, one cut with another and sharing its tint; −1 the mortar seen in the joints). The weather on
	 * it: darker and greyer-green at the foot where rain splashes up, its upward faces high up a little dulled.
	 */
	stone(geo, id = this.stones++, weather = true) {
		const g = this.add('limestone', geo);
		const p = this.part('limestone');
		const P = g.attributes.position.array, N = g.attributes.normal.array;
		const W = new Float32Array(P.length);
		for (let i = 0; i < P.length; i += 3) {
			const y = P[i + 1];
			const foot = weather ? 1 - span(y, 0.05, 1.15) : 0;
			const dark = (1 - 0.2 * foot) * (N[i + 1] > 0.6 && y > 5 ? 0.9 : 1);
			W[i] = dark * (1 - 0.07 * foot);
			W[i + 1] = dark * (1 - 0.02 * foot);
			W[i + 2] = dark * (1 - 0.1 * foot);
		}
		p.W.push(W);
		p.S.push(new Int32Array(P.length / 3).fill(id));
		return id;
	}
	/** each material's pieces joined into one run of numbers, once */
	seal() {
		const join = (list, T = Float32Array) => {
			const out = new T(list.reduce((n, a) => n + a.length, 0));
			let k = 0;
			for (const a of list) out.set(a, k), (k += a.length);
			return out;
		};
		for (const p of this.parts.values()) {
			if (!Array.isArray(p.P)) continue;
			p.P = join(p.P);
			p.N = join(p.N);
			p.U = join(p.U);
			if (p.S) (p.S = join(p.S, Int32Array)), (p.W = join(p.W));
		}
	}
	/** the quarter laid into the bag, turned by `a` round the dome's middle */
	/** another kit's shapes laid into this one, turned by `a` round the dome's middle, its stones their own tints */
	copy(src, a, r) {
		src.seal();
		const base = this.stones;
		for (const [m, p] of src.parts) {
			const q = this.part(m);
			const { P, N, U } = out_turn(p, a, r);
			q.P.push(P);
			q.N.push(N);
			q.U.push(U);
			if (p.S) {
				q.S.push(p.S.map((k) => (k < 0 ? k : k + base)));
				q.W.push(p.W);
			}
		}
		this.stones += src.stones;
	}
	/** the quarter laid into the bag, turned by `a` round the dome's middle */
	place(bag, a, r) {
		this.seal();
		for (const [m, p] of this.parts) {
			const n = p.P.length / 3;
			const { P, N, U } = out_turn(p, a, r);
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(P, 3));
			g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
			g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
			if (p.S) {
				// each stone's tint (the mortar's first), then each vertex's colour its stone's under its weather
				const T = new Float32Array(this.stones * 3 + 3);
				T.set(out_MORTAR, 0);
				for (let k = 0; k < this.stones; k++) T.set(out_tint(r), k * 3 + 3);
				const C = new Float32Array(n * 3), S = p.S, W = p.W;
				for (let i = 0, j = 0; i < n; i++, j += 3) {
					const k = S[i] * 3 + 3;
					C[j] = T[k] * W[j];
					C[j + 1] = T[k + 1] * W[j + 1];
					C[j + 2] = T[k + 2] * W[j + 2];
				}
				g.setAttribute('color', new THREE.BufferAttribute(C, 3));
			}
			bag.add(m, g, null, { colour: !!p.S });
		}
	}
}

/** a kit's part (sealed) turned by `a` round the dome's middle, its pictures shifted by chance */
function out_turn(p, a, r) {
	const c = Math.cos(a), s = Math.sin(a);
	const n = p.P.length / 3;
	const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
	const pp = p.P, pn = p.N, pu = p.U;
	for (let i = 0; i < n * 3; i += 3) {
		const x = pp[i], z = pp[i + 2], nx = pn[i], nz = pn[i + 2];
		P[i] = x * c + z * s;
		P[i + 1] = pp[i + 1];
		P[i + 2] = -x * s + z * c;
		N[i] = nx * c + nz * s;
		N[i + 1] = pn[i + 1];
		N[i + 2] = -nx * s + nz * c;
	}
	const du = r() * 7, dv = r() * 7;
	for (let i = 0; i < n * 2; i += 2) {
		U[i] = pu[i] + du;
		U[i + 1] = pu[i + 1] + dv;
	}
	return { P, N, U };
}

/** a stone into the kit, laid in its frame (where F is given); `id` where it is cut as one with another */
const out_add = (kit, geo, F, id) => kit.stone(F ? out_put(geo, F) : geo, id);

/* ---- the piers: a moulded base, four courses, a capital (an astragal, an ovolo and the abacus the arches spring from) ---- */

/** the base: a plinth, a torus, a fillet and a cavetto into the shaft (d out of the shaft's face, y up) */
const out_BASE = (() => {
	const p = [[0.11, out_YW], [0.11, out_YW + 0.2], [0.1, out_YW + 0.215], [0.075, out_YW + 0.215]];
	for (let i = 1; i <= 6; i++) {
		const t = -Math.PI / 2 + (i / 6) * Math.PI;
		p.push([0.06 + 0.045 * Math.cos(t), out_YW + 0.26 + 0.045 * Math.sin(t)]);
	}
	p.push([0.03, out_YW + 0.31]);
	for (let i = 1; i <= 3; i++) {
		const t = (i / 3) * (Math.PI / 2);
		p.push([0.03 - 0.03 * Math.sin(t), out_YW + 0.31 + 0.07 * (1 - Math.cos(t))]);
	}
	return p;
})();
/** the shaft's courses' bed joints, from the base to the capital */
const out_PIER_BEDS = [out_YW + 0.38, 1.07, 1.61, 2.16, 2.7];
/** the capital under the abacus: an astragal, a neck and an ovolo out to the abacus */
const out_CAP = (() => {
	const y = 2.7;
	const p = [[0, y]];
	for (let i = 1; i <= 4; i++) {
		const t = -Math.PI / 2 + (i / 4) * Math.PI;
		p.push([0.022 * Math.cos(t) + 0.004, y + 0.024 + 0.024 * Math.sin(t)]);
	}
	p.push([0.004, y + 0.11]);
	for (let i = 1; i <= 5; i++) {
		const t = (i / 5) * (Math.PI / 2);
		p.push([0.004 + 0.116 * (1 - Math.cos(t)), y + 0.11 + 0.1 * Math.sin(t)]);
	}
	p.push([0.12, y + 0.21]);
	return p;
})();
const out_ABACUS = 0.13;

/** a course of a pier in plan, its vertical arrises chamfered (8 points round; half sides hx along, hz across) */
const out_square = (hx, k = 0.014, hz = hx, ox = 0) => [[ox + hx, -hz + k], [ox + hx, hz - k], [ox + hx - k, hz], [ox - hx + k, hz], [ox - hx, hz - k], [ox - hx, -hz + k], [ox - hx + k, -hz], [ox + hx - k, -hz]];
/** a plan outline laid level: its u, v in x, z and its w up */
const out_PLAN = (u, v, w) => [u, w, v];

function out_pier(kit, p, r) {
	const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
	const g = out_JOINT / 2;
	// a gate's piers reach out_FLANK further toward it (the first of a quarter westward, the last eastward)
	const flank = p.j === 0 ? -1 : p.j === out_BAYS ? 1 : 0;
	const hx = out_HALF + (flank ? out_FLANK / 2 : 0), ox = (flank * out_FLANK) / 2, h = out_HALF;
	const moved = (geo) => (ox ? geo.translate(ox, 0, 0) : geo);
	out_add(kit, moved(out_squareMoulding(out_BASE, hx, { uv: [r(), r()] }, h)), F);
	for (let k = 0; k < out_PIER_BEDS.length - 1; k++) {
		const y0 = out_PIER_BEDS[k] + g, y1 = out_PIER_BEDS[k + 1] - g;
		// a gate's pier in alternate courses of one stone and of two
		if (flank && k % 2) for (const s of [-1, 1]) out_add(kit, out_stone(out_square(hx / 2 - g / 2, 0.014, h, ox + (s * hx) / 2), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
		else out_add(kit, out_stone(out_square(hx, 0.014, h, ox), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	}
	const t = out_add(kit, moved(out_squareMoulding(out_CAP, hx, { uv: [r(), r()] }, h)), F);
	out_add(kit, out_stone(out_square(hx + out_ABACUS, 0.01, h + out_ABACUS, ox), out_CAP.at(-1)[1], out_SPRING, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F, t);
	// the mortar behind the joints
	out_add(kit, out_stone(out_square(hx - 0.016, 0.004, h - 0.016, ox), out_YW + 0.2, 2.8, { map: out_PLAN, c: 0 }), F, -1);
}

/* ---- a bay: its arch of voussoirs and keystone, the ashlar of its spandrels, its cornice, parapet and coping ---- */

/** where a bay's ashlar may be seamless over a pier (a stone running round the corner into the next bay's half) */
const out_seamless = (pier, course) => course === 0 || (pier + course) % 2 === 0;

function out_bay(kit, b, r) {
	const F = { o: polar(b.d, b.am), a: b.am, d: b.d };
	const g = out_JOINT / 2;
	const { ri, ro, L, n } = b;
	const D = Math.PI / n;
	const A = (rad, a) => [rad * Math.cos(a), out_SPRING + rad * Math.sin(a)];
	const ga = g / ri;
	// the voussoirs, from the west springing over to the east; the middle one the keystone, standing a little proud
	const mid = (n - 1) / 2;
	const xk = ro * Math.sin(D / 2);
	for (let i = 0; i < n; i++) {
		const a0 = Math.PI - i * D - ga, a1 = Math.PI - (i + 1) * D + ga;
		let pts;
		if (i === mid) pts = [A(ri, a1), [xk - g, A(ro - g, a1)[1]], [xk - g, b.key - g], [-xk + g, b.key - g], [-xk + g, A(ro - g, a0)[1]], A(ri, a0)];
		else pts = [A(ri, a1), A(ro - g, a1), A(ro - g, (a0 + a1) / 2), A(ro - g, a0), A(ri, a0)];
		const w = i === mid ? out_HALF + 0.025 : out_HALF;
		out_add(kit, out_stone(pts, -w, w, { uv: [r() * 4, r() * 4] }), F);
	}
	// the spandrels: course by course, each stone's foot cut round the extrados where the arch rises into it
	const rx = ro + g;
	const foot = (x, y0) => Math.max(y0, Math.abs(x) < rx ? out_SPRING + Math.sqrt(rx * rx - x * x) : -1);
	for (let c = 0; c < out_COURSES.length - 1; c++) {
		const y0 = out_COURSES[c] + g, y1 = out_COURSES[c + 1] - g;
		// clear of the arch where its extrados is 3 cm under the course's top; and of the keystone where it rises through
		const h = y1 - 0.03 - out_SPRING;
		const xa = h < rx ? Math.sqrt(rx * rx - h * h) : 0;
		const lo = Math.max(xa, y0 < b.key ? xk : 0);
		const ranges = lo > 0 ? [[-L, -lo], [lo, L]] : [[-L, L]];
		for (const [ra, rb] of ranges) {
			const len = rb - ra;
			if (len < 0.04) continue;
			const k = Math.max(1, Math.round(len / between(r, 0.62, 0.95)));
			const cuts = [ra];
			for (let i = 1; i < k; i++) cuts.push(ra + (len * (i + (r() - 0.5) * 0.5)) / k);
			cuts.push(rb);
			for (let i = 0; i < k; i++) {
				const atW = cuts[i] === -L, atE = cuts[i + 1] === L;
				const sw = atW && out_seamless(b.j, c), se = atE && out_seamless((b.j + 1) % (out_BAYS + 1), c);
				const xa0 = cuts[i] + (sw ? 0 : g), xb0 = cuts[i + 1] - (se ? 0 : g);
				// the foot along the stone: its corners, and every 0.38 m where it follows the arch (|x| < xb)
				const xs = [xa0, xb0];
				const yb = y0 - out_SPRING;
				const xb = yb < rx ? Math.sqrt(rx * rx - yb * yb) : 0;
				for (const x of [-xb, xb]) if (x > xa0 + 0.01 && x < xb0 - 0.01) xs.push(x);
				const c0 = Math.max(xa0, -xb), c1 = Math.min(xb0, xb);
				const steps = Math.ceil((c1 - c0) / 0.38);
				for (let s = 1; s < steps; s++) xs.push(c0 + ((c1 - c0) * s) / steps);
				xs.sort((p, q) => p - q);
				const bottom = xs.map((x) => [x, foot(x, y0)]);
				if (Math.max(...bottom.map((p) => p[1])) > y1 - 0.025) continue;
				const pts = [[xb0, y1], [xa0, y1], ...bottom];
				const sharp = [];
				if (sw) sharp.push(1);
				if (se) sharp.push(pts.length - 1);
				out_add(kit, out_stone(pts, -out_HALF, out_HALF, { sharp, uv: [r() * 4, r() * 4] }), F);
			}
		}
	}
	// the mortar behind it all: the spandrels' and the arch's core, 1.5 cm back from the faces
	const core = [[L, out_SPRING], [L, out_CORNICE], [-L, out_CORNICE], [-L, out_SPRING]];
	const rc = ri + 0.016, seg = n + 3;
	for (let i = 0; i <= seg; i++) core.push(A(rc, Math.PI - (i / seg) * Math.PI));
	out_add(kit, out_stone(core, -out_HALF + 0.015, out_HALF - 0.015, { c: 0 }), F, -1);
	// the cornice: an ovolo under a corona, its top weathered back to the parapet; long stones, two or three a bay
	const cornice = [[-out_HALF, out_CORNICE], [out_HALF, out_CORNICE], [out_HALF, out_CORNICE + 0.035], [out_HALF + 0.02, out_CORNICE + 0.035]];
	for (let i = 1; i <= 4; i++) {
		const t = -Math.PI / 2 + (i / 4) * (Math.PI / 2);
		cornice.push([out_HALF + 0.02 + 0.1 * Math.cos(t), out_CORNICE + 0.135 + 0.1 * Math.sin(t)]);
	}
	const cz = out_HALF + 0.29;
	cornice.push([out_HALF + 0.135, out_CORNICE + 0.135], [out_HALF + 0.135, out_CORNICE + 0.15], [cz - 0.012, out_CORNICE + 0.15], [cz, out_CORNICE + 0.162]);
	cornice.push([cz, out_CORNICE_TOP - 0.06], [cz - 0.012, out_CORNICE_TOP - 0.048], [0.27, out_CORNICE_TOP], [-out_HALF, out_CORNICE_TOP]);
	const run = (x0, x1, size, make) => {
		const k = Math.max(1, Math.round((x1 - x0) / size));
		let a = x0;
		for (let i = 0; i < k; i++) {
			const e = i === k - 1 ? x1 : x0 + ((x1 - x0) * (i + 1 + (r() - 0.5) * 0.4)) / k;
			make(a + g, e - g);
			a = e;
		}
	};
	run(-L, L, 2.3, (x0, x1) => out_add(kit, out_moulding(cornice, x0, x1, { uv: [r() * 4, r() * 4] }), F));
	// the parapet over it, set back, and its coping: twice weathered, throated, a little proud each side
	run(-L, L, 1.15, (x0, x1) => {
		const pts = [[x1, out_PARAPET - g], [x0, out_PARAPET - g], [x0, out_CORNICE_TOP + g], [x1, out_CORNICE_TOP + g]];
		out_add(kit, out_stone(pts, -out_HALF, 0.25, { uv: [r() * 4, r() * 4] }), F);
	});
	const cope = [[-out_HALF - 0.045, out_PARAPET], [0.295, out_PARAPET], [0.295, out_PARAPET + 0.06], [0.282, out_PARAPET + 0.072], [-0.04, out_PARAPET + 0.135], [-out_HALF - 0.032, out_PARAPET + 0.072], [-out_HALF - 0.045, out_PARAPET + 0.06]];
	run(-L, L, 1.15, (x0, x1) => out_add(kit, out_moulding(cope, x0, x1, { uv: [r() * 4, r() * 4], soft: 0.2 }), F));
}

/* ---- the arcade's roof: a sedum mat behind the parapet rising to the shell, a lime soffit under it ---- */

/** a grid of points (rows of [x, y, z], each row as long), smooth, facing up (or down where `down`) */
function out_grid(rows, down = false) {
	const pos = [], idx = [];
	const w = rows[0].length;
	for (const row of rows) for (const p of row) pos.push(p[0], p[1], p[2]);
	for (let i = 0; i < rows.length - 1; i++)
		for (let j = 0; j < w - 1; j++) {
			const a = i * w + j, b = a + 1, c = a + w, d = c + 1;
			idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// turned to face the right way
	let ny = 0;
	const n = g.attributes.normal;
	for (let i = 0; i < n.count; i++) ny += n.getY(i);
	if (ny > 0 === down) {
		for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
		g.setIndex(idx);
		g.computeVertexNormals();
	}
	return g;
}

/**
 * A bay's roof lines in its frame: z0 the wall's inner face, `top` the sedum's height and `sof` the soffit's at z,
 * `meet(x, y, rr)` where the frame's line at x (at the height y(z)) meets a sphere of radius rr round the dome's middle
 * (the shell, and a little off it), and the wall plate along the shell: its back `zBack`, its face `zl`, `ys` the
 * soffit's height there.
 */
function out_roofFrame(b) {
	const F = { o: polar(b.d, b.am), a: b.am, d: b.d };
	const z0 = -out_HALF;
	const top = (z) => out_ROOF_Y + (z0 - z) * out_SLOPE;
	const sof = (z) => out_SOFFIT_Y + (z0 - z) * out_SLOPE;
	const meet = (x, y, rr) => {
		let lo = -9, hi = z0;
		for (let i = 0; i < 40; i++) {
			const m = (lo + hi) / 2;
			const w = out_world(F, x, y(m), m);
			if (w[0] * w[0] + w[2] * w[2] + w[1] * w[1] > rr * rr) hi = m;
			else lo = m;
		}
		return (lo + hi) / 2;
	};
	const zBack = Math.max(...[-b.L, 0, b.L].map((x) => meet(x, (z) => sof(z) - 0.34, R + 0.05)));
	const zl = zBack + 0.26;
	return { F, z0, top, sof, meet, zBack, zl, ys: sof(zl) };
}

function out_roof(kit, b, r) {
	const { F, z0, top, sof, meet, zBack, zl, ys } = out_roofFrame(b);
	const W = (x, y, z) => out_world(F, x, y, z);
	const xs = [-b.L, -b.L / 2, 0, b.L / 2, b.L];
	const zm = xs.map((x) => meet(x, top, R + 0.03));
	// the mat lumps a little, by the world's own noise (so the bays run on into each other)
	const lump = (p) => 0.012 + 0.02 * hash2(Math.round(p[0] * 3), Math.round(p[2] * 3), 7) + 0.012 * Math.sin(p[0] * 1.7 + p[2] * 2.3);
	const at = (x, z, dy = 0) => W(x, top(z) + dy, z);
	// pebbles along the parapet and along the shell, the sedum between
	kit.add('gravel', out_grid([xs.map((x) => at(x, z0, -0.03)), xs.map((x) => at(x, z0 - 0.4, -0.03))]), true);
	kit.add('gravel', out_grid([xs.map((x, i) => at(x, zm[i] + 0.3, -0.03)), xs.map((x, i) => at(x, zm[i], -0.03))]), true);
	const rows = [];
	for (let k = 0; k <= 5; k++)
		rows.push(
			xs.map((x, i) => {
				const z = lerp(z0 - 0.4, zm[i] + 0.3, k / 5);
				const p = at(x, z);
				// (not along the bay's ends, so the next bay's mat meets it edge to edge)
				if (k > 0 && k < 5 && i > 0 && i < xs.length - 1) p[1] += lump(p);
				return p;
			})
		);
	kit.add('sedum', out_grid(rows), true);
	// the mat's edges, down to the pebbles
	for (const za of [() => z0 - 0.4, (i) => zm[i] + 0.3])
		kit.add('sedum', out_grid([xs.map((x, i) => at(x, za(i))), xs.map((x, i) => at(x, za(i), -0.035))]), true);
	// the flashing against the shell: a lead upstand following the sphere, lapped onto the pebbles
	const fl = (dy, off) => xs.map((x, i) => {
		const y = top(zm[i]) - 0.03 + dy;
		return W(x, y, meet(x, () => y, R + off));
	});
	kit.add('out-lead', out_grid([fl(0, 0.05), fl(0.2, 0.035)]), true);
	kit.add('out-lead', out_grid([xs.map((x, i) => at(x, zm[i] + 0.1, -0.026)), fl(0.004, 0.05)]), true);
	// the soffit: lime plaster from the wall's head up to a limestone wall plate along the shell
	const soffit = out_grid([xs.map((x) => W(x, sof(z0), z0)), xs.map((x) => W(x, sof(zl) + 0.02, zl - 0.02))], true);
	kit.add('plaster', soffit, true);
	const plate = [[zBack, ys - 0.3], [zl - 0.03, ys - 0.3], [zl - 0.009, ys - 0.291], [zl, ys - 0.27], [zl, ys + 0.06], [zBack, ys + 0.06]];
	out_add(kit, out_moulding(plate, -b.L, b.L, { uv: [r() * 4, r() * 4] }), F);
}

/** where the roof stops at a gate's bay (`side` −1 its west end, +1 its east): a raking verge from the parapet to the
 *  shell, its underside carried over the walk like a beam, clear of the gate's stonework below */
function out_verge(kit, b, side, r) {
	const { F, z0, top, sof, meet: at } = out_roofFrame(b);
	const x = side * b.L;
	const meet = (y) => at(x, y, R + 0.05);
	const zE = Math.max(meet((z) => sof(z) - 0.15), meet((z) => top(z) + 0.15));
	const pts = [[z0, sof(z0) - 0.15], [z0, top(z0) + 0.15], [zE, top(zE) + 0.15], [zE, sof(zE) - 0.15]];
	const w0 = side > 0 ? b.L - 0.32 : -b.L, w1 = side > 0 ? b.L : -b.L + 0.32;
	out_add(kit, out_stone(pts, w0, w1, { map: (u, v, w) => [w, v, u], uv: [r() * 4, r() * 4] }), F);
}

/** an oak beam under the soffit along the pier line at a bay's west end, from the wall's head to the wall plate on
 *  the shell, its top let into the soffit */
function out_beam(kit, b, r) {
	const { F, z0, sof, zl } = out_roofFrame(b);
	const pts = [[z0, sof(z0) - 0.24], [z0, sof(z0) + 0.03], [zl, sof(zl) + 0.03], [zl, sof(zl) - 0.24]];
	const geo = out_stone(pts, -b.L - 0.085, -b.L + 0.085, { map: (u, v, w) => [w, v, u], c: 0.012, tile: TILE.timber, uv: [r() * 3, r() * 3] });
	kit.add('timber', out_put(geo, F));
}

/* ---- the ground: the walk's flagstones, its kerb (one step down), the gravel apron, the paths out from the gates ---- */

/** stones laid round a circle of radius `rr` from bearing a0 to a1, each about `size` long: a profile `prof` ([z, y], z
 *  out from the circle) run along each, its ends in the radial planes */
function out_ringRun(kit, prof, rr, a0, a1, size, r) {
	const k = Math.max(1, Math.round(((a1 - a0) * rr) / size));
	const g = out_JOINT / 2;
	for (let i = 0; i < k; i++) {
		const b0 = a0 + ((a1 - a0) * i) / k, b1 = a0 + ((a1 - a0) * (i + 1)) / k;
		const h = (b1 - b0) / 2;
		const F = { o: polar(rr, b0 + h), a: b0 + h, d: rr };
		const L = rr * Math.sin(h);
		out_add(kit, out_moulding(prof, -L + g, L - g, { uv: [r() * 4, r() * 4] }), F);
	}
}

function out_ground(kit, plan, r) {
	const doorA = plan.doors.map((dd) => dd.a);
	/** how far [r, a] is across from the nearest door's axis */
	const across = (rr, a) => Math.min(...doorA.map((d) => {
		const da = Math.abs(out_wrap(a - d));
		return da < 1 ? rr * Math.sin(da) : 99;
	}));
	// the walk: level at out_YW, ramped gently down to the door's sill in front of each door (flared at its sides)
	const A = [];
	for (let a = 0; a < Math.PI / 2 - 1e-6; ) {
		A.push(a);
		a += (across(out_KERB, a) < 3.6 ? 0.2 : 0.9) / out_KERB;
	}
	A.push(Math.PI / 2);
	const walkY = (rr, a) => {
		const t = across(rr, a);
		const k = (1 - smooth((rr - R - 0.1) / 1.8)) * (1 - smooth((t - out_PATH_GATE) / 0.7));
		return out_YW - (out_YW - out_SILL) * k;
	};
	const radii = [R - 0.2, R + 0.1, R + 0.7, R + 1.3, R + 1.9, out_KERB + 0.02];
	const rows = radii.map((rr) => A.map((a) => {
		const [x, z] = polar(rr, a);
		return [x, walkY(rr, a), z];
	}));
	kit.add('flag', out_grid(rows), true);
	// the kerb: one step of 0.15 m down to the apron, its nose rounded; broken where the paths run out
	const kerb = [[0, 0], [out_KERB_W, 0], [out_KERB_W, 0.112], [out_KERB_W - 0.006, 0.136], [out_KERB_W - 0.022, out_YW + 0.004], [0, out_YW + 0.004]];
	const edge = [[0, 0], [out_EDGE_W, 0], [out_EDGE_W, 0.032], [out_EDGE_W - 0.01, 0.042], [0.01, 0.042], [0, 0.032]];
	const wP = out_PATH_GATE + out_EDGE_W;
	const rA0 = out_KERB + out_KERB_W, rA1 = rA0 + out_APRON;
	const d0 = 0, d1 = Math.PI / 2;
	out_ringRun(kit, kerb, out_KERB, d0 + Math.asin((wP + 0.004) / out_KERB), d1 - Math.asin((wP + 0.004) / out_KERB), 1.4, r);
	// the apron: gravel from the kerb to an edging of limestone, its ends straight along the paths' edges
	const n = 90;
	const rowAt = (rr, y) => Array.from({ length: n + 1 }, (_, i) => {
		const a = lerp(d0 + Math.asin(wP / rr), d1 - Math.asin(wP / rr), i / n);
		const [x, z] = polar(rr, a);
		return [x, y, z];
	});
	kit.add('gravel', out_grid([rowAt(rA0 - 0.02, 0.025), rowAt((rA0 + rA1) / 2, 0.028), rowAt(rA1 + 0.02, 0.025)]), true);
	out_ringRun(kit, edge, rA1, d0 + Math.asin((wP + 0.004) / rA1), d1 - Math.asin((wP + 0.004) / rA1), 1.6, r);
	// the paths: flagstones from the walk's edge straight out, 4.5 m wide across the apron (ramped down over it), then
	// narrowing to 2.4 m, level
	const s0 = out_KERB + 0.02, s1 = rA1 + out_EDGE_W;
	const pathY = (s) => out_PATH_Y + (out_YW - out_PATH_Y) * (1 - smooth((s - out_KERB) / (s1 - out_KERB)));
	// (the north door's: s out along +z, t across along +x)
	{
		const P = (s, t, y) => [t, y, s];
		const half = (s) => lerp(out_PATH_GATE, out_PATH, smooth((s - s1) / 4));
		const ss = [];
		for (let s = s0; s < s1; s += 0.3) ss.push(s);
		for (let s = s1; s < s1 + 4; s += 0.5) ss.push(s);
		for (let s = s1 + 4; s < out_PATH_END; s += 1.5) ss.push(s);
		ss.push(out_PATH_END);
		const prow = ss.map((s, i) => [-1, -0.5, 0, 0.5, 1].map((f) => {
			const t = f * half(s);
			const sv = i === 0 ? Math.sqrt(s0 * s0 - t * t) : s;
			return P(sv, t, pathY(sv));
		}));
		kit.add('flag', out_grid(prow), true);
		// its edging, each stone's top following the ramp, and a stone across its end
		for (const side of [-1, 1]) {
			const tc = (u) => side * (half(u) + out_EDGE_W / 2);
			let s = Math.sqrt(out_KERB * out_KERB - wP * wP);
			while (s < out_PATH_END - 0.01) {
				const e = Math.min(out_PATH_END, s + (s < s1 + 4 ? 0.62 : between(r, 0.8, 1.0)));
				const a = s + out_JOINT / 2, b = e - out_JOINT / 2;
				const pts = [[a, 0], [b, 0], [b, pathY(b) + 0.015], [a, pathY(a) + 0.015]];
				const geo = out_stone(pts, -out_EDGE_W / 2, out_EDGE_W / 2, { map: (uu, vv, ww) => P(uu, tc(uu) + ww, vv), uv: [r() * 4, r() * 4] });
				out_add(kit, geo, null);
				s = e;
			}
		}
		const wE = out_PATH + out_EDGE_W;
		const endPts = [[-wE, 0], [wE, 0], [wE, out_PATH_Y + 0.015], [-wE, out_PATH_Y + 0.015]];
		out_add(kit, out_stone(endPts, out_PATH_END + 0.004, out_PATH_END + out_EDGE_W, { map: (uu, vv, ww) => P(ww, uu, vv), uv: [r(), r()] }), null);
	}
}

/* ---- along the walk: stone benches against the dome's plinth, bronze lanterns on the piers ---- */

/** a rounded box laid in a frame at [x, y, z], its UVs in metres (shifted by chance) */
function out_block(w, h, d, rad, seg, x, y, z, r) {
	const g = boxUV(new RoundedBoxGeometry(w, h, d, seg, rad), out_TILE);
	g.translate(x, y, z);
	const uv = g.attributes.uv, du = r() * 4, dv = r() * 4;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return g;
}

function out_benches(kit, plan, r) {
	for (const b of plan.bays) {
		if (b.q || (b.j !== 3 && b.j !== 10)) continue;
		const F = { o: polar(R + 1.25, b.am), a: b.am, d: 0 };
		// under the roof, out of the rain: no weather at their feet
		kit.stone(out_put(out_block(1.8, 0.085, 0.43, 0.028, 2, 0, out_YW + 0.4125, 0.02, r), F), undefined, false);
		for (const s of [-1, 1]) kit.stone(out_put(out_block(0.16, 0.37, 0.36, 0.022, 1, s * 0.6, out_YW + 0.185, 0, r), F), undefined, false);
	}
}

/** a lathe of [r, y] with flat faces (a square one where `seg` is 4, turned square to the pier) */
function out_lathe(points, seg = 4) {
	const g = new THREE.LatheGeometry(points.map(([a, b]) => new THREE.Vector2(a, b)), seg, Math.PI / 4).toNonIndexed();
	g.computeVertexNormals();
	return g;
}

function out_lanterns(kit, plan) {
	const h = out_HALF;
	for (const p of plan.piers) {
		if (p.q || p.j % 3 !== 1) continue;
		const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
		const zc = -h - 0.3;
		const put = (m, g) => kit.add(m, out_put(g, F));
		const plate = box(0.11, 0.2, 0.024);
		plate.translate(0, 2.32, -h - 0.012);
		put('bronze', plate);
		put('bronze', bar([0, 2.37, -h - 0.02], [0, 2.37, zc - 0.012], 0.011, 0.011, 8));
		put('bronze', bar([0, 2.25, -h - 0.02], [0, 2.365, zc + 0.1], 0.007, 0.007, 6));
		put('bronze', bar([0, 2.37, zc], [0, 2.3, zc], 0.006, 0.006, 6));
		const L = (pts, seg) => {
			const g = out_lathe(pts, seg);
			g.translate(0, 0, zc);
			return g;
		};
		// the roof of the lantern, its opal glass, the corner posts, the tray and a finial under it
		put('bronze', L([[0, 2.312], [0.018, 2.306], [0.132, 2.236], [0.132, 2.224], [0.11, 2.222], [0, 2.222]], 4));
		put('opal', L([[0.104, 2.222], [0.09, 1.96]], 4));
		for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
			const k = 1 / Math.SQRT2;
			put('bronze', bar([sx * 0.104 * k, 2.224, zc + sz * 0.104 * k], [sx * 0.09 * k, 1.958, zc + sz * 0.09 * k], 0.006, 0.006, 4));
		}
		put('bronze', L([[0, 1.944], [0.104, 1.95], [0.106, 1.962], [0, 1.962]], 4));
		put('bronze', L([[0, 1.885], [0.012, 1.9], [0.026, 1.93], [0.03, 1.944], [0, 1.944]], 6));
	}
}

/**
 * THE OUTSIDE, built into the bag 'outside': the arcade (piers, arches, spandrels, cornice, parapet, coping), its roof,
 * soffit and beams, the walk and its kerb, the apron, the paths, the benches and the lanterns. The four quarters (gate
 * to gate) are alike: one is built and laid round four times, its stones tinted afresh each time. `dome.outside` keeps
 * the measures another part may need (the pier line, the walk's level and edge, the paths' half widths and end).
 */
function outsidePart(dome) {
	const plan = out_plan();
	const r = chance('forest-dome', 'outside');
	// one quarter, from the north gate's axis to the east gate's, built once: its piers and bays each made once by kind
	// (a pier, a bay of each parity, the gate's bay, the gate's two piers) and copied round to their places
	const kit = new out_Kit();
	const made = new Map();
	const like = (key, at, make) => {
		if (!made.has(key)) {
			const k = new out_Kit();
			make(k);
			made.set(key, { k, at });
		}
		const m = made.get(key);
		kit.copy(m.k, at - m.at, r);
	};
	for (const p of plan.piers) {
		if (p.q) continue;
		if (p.j === 0 || p.j === out_BAYS) out_pier(kit, p, r);
		else like('pier', p.a, (k) => out_pier(k, p, r));
	}
	for (const b of plan.bays) {
		if (b.q) continue;
		like(b.door ? 'gate' : `bay${b.j % 2}`, b.am, (k) => {
			out_bay(k, b, r);
			if (!b.door) out_roof(k, b, r);
		});
		if (b.j === 0) out_verge(kit, b, -1, r);
		else if (!b.door) out_beam(kit, b, r);
		if (b.j === out_BAYS - 1) out_verge(kit, b, 1, r);
	}
	out_ground(kit, plan, r);
	out_benches(kit, plan, r);
	out_lanterns(kit, plan);
	// and laid round four times
	const bag = dome.bag('outside');
	for (let q = 0; q < 4; q++) kit.place(bag, (q * Math.PI) / 2, r);
	dome.outside = { pierR: out_RP, walkY: out_YW, walkEdge: out_KERB, apron: out_KERB + out_KERB_W + out_APRON, pathHalf: out_PATH, pathGateHalf: out_PATH_GATE, pathEnd: out_PATH_END, cornice: out_CORNICE_TOP, top: out_PARAPET + 0.135 };
}
