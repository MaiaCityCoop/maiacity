/* ================================================================================================================
 * 4. OUTSIDE — a one-storey limestone arcade round the dome's foot and, on it, a terrace all the way round (Samuel
 *    2026-11-05: the arcade's roof walkable, a proper terrace like Sandbox 1's, a community space outside furnished
 *    with the library's things and plants): its balustrade, the four stairs up to it in the cloister walk under it,
 *    the walk, the apron of gravel beyond its step and the flagstone paths straight out from the gates
 * ================================================================================================================ */

/**
 * THE ARCADE'S MEASURES. Sixty piers whose middles stand on the circle of radius `out_RP`: a wider bay centred on each
 * gate's bearing (its path passes straight under that arch to the gate) and fourteen bays of 4.56 m in each quarter
 * between. A bay's wall runs straight from pier to pier (the ring a polygon of sixty sides, its stones cut to the
 * angle over each pier). Semicircular arches of voussoirs spring at 3.0 m from the piers' imposts; ashlar runs up
 * the spandrels in courses to the cornice, and on the cornice a balustrade: a die over each pier, turned balusters
 * between, a moulded rail along the top. Behind it the terrace, flat, paved with limestone flags from the balustrade
 * to the glass, over the cloister walk and over the gates alike; its soffit lime plaster on oak beams. Heights are
 * from the ground (y 0); the walk is at `out_YW`, the terrace at `out_FLOOR`.
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
/** the joints between stones, and how much each arris is eased */
const out_JOINT = 0.007;
const out_EASE = 0.006;
/**
 * THE TERRACE: its flags' top (`out_FLOOR`, 10 cm over the cornice's, the slab 0.45 deep), its soffit at the wall's
 * head (`out_SOFFIT_Y`), the oak beams under it (`out_BEAM` deep). The flags run from a strip of pebbles along the glass
 * (`out_GRAVEL` wide, behind a lead flashing) to a border course along the balustrade.
 */
const out_FLOOR = 6.45;
const out_SOFFIT_Y = out_CORNICE;
const out_BEAM = 0.24;
const out_GRAVEL = 0.33;
/** the flags' thickness, the border course's width along the balustrade (from the plinth's face in) */
const out_FLAG = 0.07;
const out_BORDER = 0.41;
/**
 * THE BALUSTRADE on the cornice: its plinth from the cornice's top to `out_PLINTH_TOP`, the balusters on it up to
 * `out_RAIL`, the rail over them to `out_TOP` (1.25 m over the flags: a terrace 6.5 m over the ground). Across the wall
 * (z out from its middle line) the plinth runs from −0.30 to 0.23, the balusters stand on `out_BAL_Z`, the rail from
 * −0.33 to 0.26: its inner face stands from 1.04 to 1.22 m over the flags, so a walker (stopped where anything stands
 * across their way at 1.2 m, and the rail the first thing there) never reaches the gaps between the balusters. A die
 * over each pier (`out_DIE` either side of it along the ring), the balusters `out_BAL_PITCH` apart between the dies.
 */
const out_PLINTH_TOP = 6.56;
const out_RAIL = 7.43;
const out_TOP = 7.7;
const out_BAL_Z = -0.035;
const out_BAL_PITCH = 0.267;
const out_DIE = 0.28;
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
 * clear centred on each gate's bearing, over the path straight to it, the terrace going on over it (its soffit 1.4 m
 * over the gate's stonework); its piers stronger, 1.0 m along the ring (`out_FLANK` more on the gate's side). Bays are
 * reckoned pier middle to pier middle as if every pier were 0.75 m.
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
	// over the cornice, the balustrade's die (the plinths of the bays either side run into it) and its cap under the rail
	const dx = out_DIE + (flank ? out_FLANK / 2 : 0);
	const onLine = (pts) => pts.map(([u, v]) => [u, v + out_BAL_Z]);
	out_add(kit, out_stone(onLine(out_square(dx, 0.012, 0.275, ox)), out_CORNICE_TOP + g, out_RAIL - 0.045 - g, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	out_add(kit, out_stone(onLine(out_square(dx + 0.02, 0.01, 0.295, ox)), out_RAIL - 0.045, out_RAIL - g, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
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
	// on the cornice the balustrade: its plinth (its top weathered a little each way), the balusters evenly between the
	// dies (a gate's piers' dies the longer toward its bay), the rail over them (an ovolo under each edge, its top
	// rounded, its inner face upright where a walker's chest meets it)
	const P = out_PLINTH_TOP;
	const plinth = [[-0.3, out_CORNICE_TOP], [0.23, out_CORNICE_TOP], [0.23, P - 0.035], [0.205, P - 0.01], [0.12, P], [-0.19, P], [-0.275, P - 0.01], [-0.3, P - 0.035]];
	run(-L, L, 1.6, (x0, x1) => out_add(kit, out_moulding(plinth, x0, x1, { uv: [r() * 4, r() * 4], soft: 0.2 }), F));
	const xa = -L + out_DIE + (b.door ? out_FLANK : 0) + 0.02;
	const nb = Math.max(1, Math.round((-2 * xa) / out_BAL_PITCH));
	for (let i = 0; i < nb; i++) {
		const geo = out_baluster(r);
		geo.translate(xa + ((i + 0.5) * -2 * xa) / nb, 0, out_BAL_Z);
		out_add(kit, geo, F);
	}
	const y = out_RAIL, t = out_TOP;
	const rail = [[-0.245, y], [0.165, y], [0.2, y + 0.012], [0.235, y + 0.03], [0.26, y + 0.06], [0.26, t - 0.035], [0.235, t - 0.012], [0.15, t - 0.002], [out_BAL_Z, t], [-0.22, t - 0.002], [-0.305, t - 0.012], [-0.33, t - 0.035], [-0.33, y + 0.06], [-0.305, y + 0.03], [-0.27, y + 0.012]];
	run(-L, L, 1.6, (x0, x1) => out_add(kit, out_moulding(rail, x0, x1, { uv: [r() * 4, r() * 4], soft: 0.6 }), F));
	// the terrace's border course along the plinth: long flags, their outer edge just under it
	run(-L, L, 1.55, (x0, x1) => {
		const pts = [[x0, -0.29 - out_BORDER], [x1, -0.29 - out_BORDER], [x1, -0.29], [x0, -0.29]];
		out_add(kit, out_stone(pts, out_FLOOR - out_FLAG, out_FLOOR, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
	});
}

/**
 * A baluster (0.87 m, standing on the plinth's top, its axis at x 0, z 0): a square foot, a torus and a scotia, the
 * belly low (the vase of the Renaissance), the neck, a ring, the flare up to a square abacus under the rail. Turned in
 * eight facets, smooth; one stone, its picture shifted by chance.
 */
const out_BALUSTER = (() => {
	let made = null;
	return () => {
		if (made) return made;
		const H = out_RAIL - out_PLINTH_TOP;
		const k = H / 0.87;
		const prof = [[0.08, 0.05], [0.09, 0.068], [0.084, 0.085], [0.068, 0.1], [0.078, 0.15], [0.092, 0.23], [0.09, 0.31], [0.076, 0.39], [0.056, 0.48], [0.042, 0.57], [0.046, 0.612], [0.052, 0.628], [0.043, 0.648], [0.058, 0.72], [0.078, 0.79], [0.08, 0.825]];
		const lathe = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b * k)), 8).toNonIndexed();
		scaleUV(lathe, (TAU * 0.085) / out_TILE, (0.85 * k) / out_TILE);
		const foot = boxUV(new THREE.BoxGeometry(0.19, 0.05, 0.19).translate(0, 0.025, 0), out_TILE);
		const abacus = boxUV(new THREE.BoxGeometry(0.17, 0.045, 0.17).translate(0, H - 0.0225, 0), out_TILE);
		made = mergeGeometries([lathe, foot, abacus]);
		made.translate(0, out_PLINTH_TOP, 0);
		return made;
	};
})();
function out_baluster(r) {
	const g = out_BALUSTER().clone();
	const uv = g.attributes.uv, du = r() * 4, dv = r() * 4;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return g;
}

/* ---- the terrace on the arcade: its flags in courses round the ring, a strip of sedum and the lead along the glass,
 *      its soffit and beams; the stairs up to it; the pergolas over the gates ---- */

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


/** a plan outline ([u, v] points) turned counter-clockwise, as out_stone wants it */
function out_ccw(pts) {
	let s = 0;
	for (let i = 0; i < pts.length; i++) {
		const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
		s += x0 * z1 - x1 * z0;
	}
	return s < 0 ? pts.slice().reverse() : pts;
}

/** how far from the dome's middle, along bearing `a`, the arcade's wall stands at `z` across it (out from its middle
 *  line: the balustrade's rail's inner face at −0.33, the plinth's at −0.30, the wall's inner face at −out_HALF) */
function out_lineAt(plan, a, z) {
	for (const b of plan.bays) {
		const da = out_wrap(a - b.am);
		if (Math.abs(da) <= (b.a1 - b.a0) / 2 + 1e-7) return (b.d + z) / Math.cos(da);
	}
	return out_RP + z;
}

/** where a sphere of radius rr round the dome's middle stands at height y */
const out_sphere = (rr, y) => Math.sqrt(rr * rr - y * y);
/** the flags' inner edge, past the strip of sedum along the glass; the wall plate's face under the soffit */
const out_FLAGS_IN = 39.86;

/**
 * THE STAIRS up to the terrace: one in each quarter on its diagonal (`a`), in the cloister walk against the dome's
 * plinth, curving round with it. 36 risers of 0.175 m from the walk to the terrace on treads of 0.30 m along its
 * middle line (`r`), 1.5 m between its walls (`r0` … `r1`): two flights of 18 and a landing of 1.5 m between them,
 * climbing eastward (by bearing). The first flight and the landing stand on solid masonry, the second on a sloping
 * slab (`waist` deep), the walk going on under it. Its walls of ashlar each side (`wall` thick) rise `guard` over the
 * nosings under a coping. Where a tread of the second flight would have less than 2.25 m under the terrace's soffit it
 * comes up through a well in the terrace, a balustrade round it like the terrace's edge (its walls rise to the
 * balustrade's plinth, dies at its corners and at the stair's head); at its head a threshold flush with the flags.
 * Along it `s` runs from the first riser (0) to the last (`len`).
 */
const out_ST = { a: Math.PI / 4, r: 41.35, r0: 40.6, r1: 42.1, wall: 0.22, tread: 0.3, n: 18, landing: 1.5, waist: 0.3, guard: 0.95, cope: 0.08 };
function out_stairPlan() {
	const S = out_ST;
	const rise = (out_FLOOR - out_YW) / (2 * S.n);
	const pitch = rise / S.tread;
	const f = (S.n - 1) * S.tread;
	const s2 = f + S.landing;
	const len = s2 + f;
	const land = out_YW + S.n * rise;
	const a0 = S.a - len / (2 * S.r);
	let j = 0;
	while (land + (j + 1) * rise <= out_SOFFIT_Y - 2.25) j++;
	// the well's back: just behind the first riser that rises too near the soffit
	const sw = s2 + j * S.tread - 0.05;
	// the walls' tops along the stair, `guard` over the nosings (the first flight's, level over the landing, the second's)
	const top = (s) => (s <= f ? out_YW + rise + pitch * s : s <= s2 - S.tread ? land : land + pitch * (s - s2 + S.tread)) + S.guard;
	// the second flight's slab's soffit
	const under = (s) => land - S.waist * Math.hypot(1, pitch) + pitch * (s - s2);
	const bear = (s) => a0 + s / S.r;
	return { ...S, rise, pitch, f, s2, len, land, a0, sw, top, under, bear, ri: S.r0 - S.wall, ro: S.r1 + S.wall, head: len + 0.3, wellTop: out_PLINTH_TOP };
}

/** an outline in a side view ([s, y] points) from its foot (along s) and its top (along s), counter-clockwise */
const out_side = (foot, top) => foot.concat(top.slice().reverse());

/** the root of an increasing fn between a and b (fn(a) < 0 < fn(b)) */
function out_solve(fn, a, b) {
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		if (fn(m) < 0) a = m;
		else b = m;
	}
	return (a + b) / 2;
}

function out_stair(kit, r) {
	const P = out_stairPlan();
	const g = out_JOINT / 2;
	const T = P.tread;
	// a shape drawn in the stair's side (u along its middle line, v up) laid round the dome's middle, w out across it
	const side = (u, v, w) => {
		const [x, z] = polar(P.r + w, P.bear(u));
		return [x, v, z];
	};
	const sector = (s0, s1, r0, r1) => out_ccw([polar(r0, P.bear(s0)), polar(r0, P.bear(s1)), polar(r1, P.bear(s1)), polar(r1, P.bear(s0))]);
	const block = (s0, s1, r0, r1, y0, y1, id) => out_add(kit, out_stone(sector(s0, s1, r0, r1), y0, y1, { map: out_PLAN, uv: [r() * 4, r() * 4] }), null, id);
	const ra = P.r0 - 0.01, rb = P.r1 + 0.01;
	// the first flight, each step a stone down to the walk, and the landing in two
	for (let i = 1; i < P.n; i++) block((i - 1) * T, i * T, ra, rb, out_YW, out_YW + i * P.rise);
	block(P.f, P.f + P.landing / 2, ra, rb, out_YW, P.land);
	block(P.f + P.landing / 2, P.s2, ra, rb, out_YW, P.land);
	// the second flight's steps on its slab, and the slab
	for (let j = 0; j < P.n - 1; j++) {
		const yt = P.land + (j + 1) * P.rise;
		block(P.s2 + j * T, P.s2 + (j + 1) * T, ra, rb, yt - P.rise - 0.04, yt);
	}
	const ss = [];
	for (let s = P.s2; s < P.len - 1e-6; s += T) ss.push(s);
	ss.push(P.len);
	const slab = out_side(ss.map((s) => [s, P.under(s)]), ss.map((s) => [s, P.land + P.pitch * (s - P.s2)]));
	out_add(kit, out_stone(slab, ra - P.r, rb - P.r, { map: side, uv: [r() * 4, r() * 4] }), null);
	// the threshold at its head, flush with the flags, the width of the well
	const rm = between(r, 41.1, 41.6);
	block(P.len, P.head, P.ri, rm - g, 5.95, out_FLOOR);
	block(P.len, P.head, rm + g, P.ro, 5.95, out_FLOOR);

	// the walls: ashlar in courses, each stone cut to the wall's top (over the nosings; round the well the balustrade's
	// plinth) and, under the second flight, to its slab's soffit; a mortar core behind the joints
	const wallTop = (s) => (s < P.sw ? P.top(s) : P.wellTop);
	const wallFoot = (s) => (s <= P.s2 ? out_YW : P.under(s));
	const K = 18, ch = (P.wellTop - out_YW) / K;
	const pieces = [[0, P.s2], [P.s2, P.sw], [P.sw, P.len]];
	const kinks = [P.f, P.s2 - T];
	for (const [w0, w1] of [[P.ri, P.r0], [P.r1, P.ro]]) {
		for (const [pa, pb] of pieces) {
			const e = 1e-4;
			const topF = (s) => wallTop(Math.min(Math.max(s, pa + e), pb - e));
			const footF = (s) => wallFoot(Math.min(Math.max(s, pa + e), pb - e));
			// the breaks of the lines between pa and pb: where they bend
			const breaks = (c0, c1) => [c0, ...kinks.filter((k) => k > c0 + 1e-6 && k < c1 - 1e-6), c1];
			// the outline of [c0, c1] between the heights y0 and y1, cut to the wall's top and foot
			const outline = (c0, c1, y0, y1) => {
				let s = breaks(c0, c1);
				const add = [];
				for (let i = 0; i + 1 < s.length; i++)
					for (const [fn, yv] of [[topF, y1], [footF, y0]]) {
						const da = fn(s[i]) - yv, db = fn(s[i + 1]) - yv;
						if (da * db < 0) add.push(s[i] + ((s[i + 1] - s[i]) * da) / (da - db));
					}
				s = [...s, ...add].sort((x, y) => x - y);
				return out_side(s.map((x) => [x, Math.max(y0, footF(x))]), s.map((x) => [x, Math.min(y1, topF(x))]));
			};
			// the mortar core
			out_add(kit, out_stone(outline(pa, pb, -99, 99).map(([s, yy]) => [s, yy - 0.012]), w0 + 0.015 - P.r, w1 - 0.015 - P.r, { map: side, c: 0 }), null, -1);
			for (let k = 0; k < K; k++) {
				const y0 = out_YW + k * ch, y1 = y0 + ch;
				let lo = pa, hi = pb;
				if (topF(pa) < y0 + 0.03) {
					if (topF(pb) < y0 + 0.03) continue;
					lo = out_solve((s) => topF(s) - (y0 + 0.03), pa, pb);
				}
				if (footF(pb) > y1 - 0.03) {
					if (footF(pa) > y1 - 0.03) continue;
					hi = out_solve((s) => footF(s) - (y1 - 0.03), pa, pb);
				}
				if (hi - lo < 0.06) continue;
				// stones about 0.9 m long, each course's joints over the middles of the one below
				const cuts = [lo];
				let s = lo + (k % 2 ? 0.45 : 0.9) * between(r, 0.8, 1.2);
				while (s < hi - 0.3) cuts.push(s), (s += between(r, 0.75, 1.05));
				cuts.push(hi);
				for (let i = 0; i + 1 < cuts.length; i++) {
					const pts = outline(cuts[i] + g, cuts[i + 1] - g, y0 + g, y1 - g);
					out_add(kit, out_stone(pts, w0 - P.r, w1 - P.r, { map: side, uv: [r() * 4, r() * 4] }), null);
				}
			}
		}
		// the coping, raking over the flights
		const cw0 = w0 - 0.025 - P.r, cw1 = w1 + 0.025 - P.r;
		const cuts = [0];
		for (let s = 1.1; s < P.sw - 0.4; s += between(r, 0.95, 1.25)) cuts.push(s);
		cuts.push(P.sw);
		for (let i = 0; i + 1 < cuts.length; i++) {
			const c0 = cuts[i] + g, c1 = cuts[i + 1] - g;
			const s = [c0, ...kinks.filter((k) => k > c0 && k < c1), c1];
			const pts = out_side(s.map((x) => [x, P.top(x)]), s.map((x) => [x, P.top(x) + P.cope]));
			out_add(kit, out_stone(pts, cw0, cw1, { map: side, uv: [r() * 4, r() * 4] }), null);
		}
	}
	// the cross wall at the well's back, on the terrace's slab, two courses of two stones up to the plinth's top
	const s0 = P.sw - P.wall, s1 = P.sw;
	block(s0 + 0.012, s1 - 0.012, P.ri + 0.015, P.ro - 0.015, 5.96, P.wellTop - 0.01, -1);
	for (const [y0, y1] of [[5.95, out_FLOOR], [out_FLOOR, P.wellTop]]) {
		const m = between(r, 40.9, 41.8);
		block(s0, s1, P.ri, m - g, y0 + g, y1 - g);
		block(s0, s1, m + g, P.ro, y0 + g, y1 - g);
	}
	// round the well, a balustrade like the terrace's edge: on the walls' middle lines a die at each corner and each
	// side of the stair's head (standing a little over the rail), balusters between, a rail from die to die
	const mid = [(P.ri + P.r0) / 2, (P.r1 + P.ro) / 2];
	const sb = P.sw - P.wall / 2, sh = P.len - 0.17, D = 0.16;
	for (const rr of mid)
		for (const s of [sb, sh]) {
			const F = { o: polar(rr, P.bear(s)), a: P.bear(s), d: 0 };
			out_add(kit, out_stone(out_square(D, 0.012), out_FLOOR - 0.02, out_TOP - 0.03, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
			out_add(kit, out_stone(out_square(D + 0.03, 0.012), out_TOP - 0.03, out_TOP + 0.05, { map: out_PLAN, uv: [r() * 4, r() * 4] }), F);
		}
	const baluster = (rr, a) => out_add(kit, out_baluster(r), { o: polar(rr, a), a, d: 0 });
	const rail = [[-0.13, 0], [0.13, 0], [0.155, 0.04], [0.155, 0.235], [0.12, 0.265], [0, 0.275], [-0.12, 0.265], [-0.155, 0.235], [-0.155, 0.04]].map(([u, v]) => [u, out_RAIL + v]);
	for (const rr of mid) {
		const a0 = sb + D + 0.02, a1 = sh - D - 0.02, n = Math.max(1, Math.round((a1 - a0) / out_BAL_PITCH));
		for (let i = 0; i < n; i++) baluster(rr, P.bear(a0 + ((i + 0.5) * (a1 - a0)) / n));
		const k = Math.ceil((sh - sb - 2 * D) / 1.25);
		for (let i = 0; i < k; i++) {
			const c0 = sb + D + ((sh - sb - 2 * D) * i) / k, c1 = sb + D + ((sh - sb - 2 * D) * (i + 1)) / k;
			out_add(kit, out_stone(rail, c0 + (i ? g : 0), c1 - (i + 1 < k ? g : 0), { map: (u, v, w) => side(w, v, rr - P.r + u), uv: [r() * 4, r() * 4] }), null);
		}
	}
	{
		const a = P.bear(sb), F = { o: [0, 0], a, d: 0 };
		const z0 = mid[0] + D, z1 = mid[1] - D, n = Math.max(1, Math.round((z1 - z0 - 0.04) / out_BAL_PITCH));
		for (let i = 0; i < n; i++) baluster(z0 + 0.02 + ((i + 0.5) * (z1 - z0 - 0.04)) / n, a);
		out_add(kit, out_stone(rail, z0, z1, { map: (u, v, w) => [u, v, w], uv: [r() * 4, r() * 4] }), F);
	}
}

/**
 * The terrace's own parts in a quarter (bearings 0 … π/2): its flags in six courses round the ring (the seventh, the
 * border along the balustrade, is each bay's), the mortar under them, the strip of sedum along the glass and the lead
 * flashing against it; under it the lime soffit, the wall plate along the shell and the oak beams on the pier lines.
 * The stair's well is left open.
 */
function out_terrace(kit, plan, r) {
	const P = out_stairPlan();
	const g = out_JOINT / 2;
	const piers = plan.piers.filter((p) => p.q === 0);
	const well = [P.bear(P.sw - P.wall), P.bear(P.head)];
	const soffitHole = [P.bear(P.sw - P.wall), P.bear(P.len)];
	// the bearings the strips are sampled at: every 0.6 m or so, the piers' (where the wall bends) and the well's among them
	const marks = [0, Math.PI / 2, ...piers.map((p) => p.a), ...well, ...soffitHole].filter((a) => a >= 0 && a <= Math.PI / 2).sort((x, y) => x - y);
	const A = [];
	for (let i = 0; i + 1 < marks.length; i++) {
		const a = marks[i], b = marks[i + 1];
		if (b - a < 1e-7) continue;
		const n = Math.max(1, Math.ceil(((b - a) * 44) / 0.6));
		for (let k = 0; k < n; k++) A.push(a + ((b - a) * k) / n);
	}
	A.push(Math.PI / 2);
	// a strip of the ring between rA(a) and rB(a), bearings a0 … a1, level at y
	const strip = (a0, a1, rA, rB, y, down) => {
		const as = A.filter((a) => a >= a0 - 1e-9 && a <= a1 + 1e-9);
		const row = (f) => as.map((a) => {
			const [x, z] = polar(f(a), a);
			return [x, y, z];
		});
		return as.length < 2 ? null : out_grid([row(rA), row(rB)], down);
	};
	const at = (v) => () => v;
	// the same strip with the well cut out of it between the radii ri and ro
	const holed = (hole, rA, rB, y, down, make) => {
		for (const [a0, a1] of [[0, hole[0]], [hole[1], Math.PI / 2]]) make(strip(a0, a1, rA, rB, y, down));
		make(strip(hole[0], hole[1], rA, at(P.ri), y, down));
		make(strip(hole[0], hole[1], at(P.ro), rB, y, down));
	};
	const plinth = (a) => out_lineAt(plan, a, -0.29);
	const border = (a) => out_lineAt(plan, a, -0.29 - out_BORDER);
	// the mortar the flags are bedded in, showing in their joints
	holed(well, at(out_FLAGS_IN), plinth, out_FLOOR - 0.02, false, (geo) => geo && kit.stone(geo, -1, false));
	// the strip of sedum along the glass (reaching in under its frames, so nowhere a foot can stand is there a gap
	// between the terrace and the glass), and the lead flashing dressed up against the shell
	const sedum = strip(0, Math.PI / 2, at(out_sphere(R - 0.15, out_FLOOR - 0.02)), at(out_FLAGS_IN + 0.01), out_FLOOR - 0.02, false);
	kit.add('sedum', sedum, true);
	const lead = A.map((a) => [0, 1].map((t) => {
		const y = out_FLOOR - 0.03 + t * 0.2, [x, z] = polar(out_sphere(R + 0.07 - t * 0.015, y), a);
		return [x, y, z];
	}));
	kit.add('out-lead', out_grid([lead.map((p) => p[0]), lead.map((p) => p[1])]), true);
	// the flags: six courses round the ring, each flag 0.55–1.0 m long, the joints of one course off the next's; the
	// last course meets the border along the balustrade (straight from pier to pier)
	const rows = [[out_FLAGS_IN, at(P.ri)], [P.ri, at(40.98)], [40.98, at(41.62)], [41.62, at(P.ro)], [P.ro, at(42.98)], [42.98, border]];
	const pierA = piers.map((p) => p.a);
	rows.forEach(([ra, rB], k) => {
		const cut = k >= 1 && k <= 3;
		const spans = cut ? [[0, well[0]], [well[1], Math.PI / 2]] : [[0, Math.PI / 2]];
		const rm = ra + 0.32;
		for (const [b0, b1] of spans) {
			const cuts = [b0];
			let a = b0 + (between(r, 0.2, 0.95) + (k % 2) * 0.2) / rm;
			while (a < b1 - 0.35 / rm) cuts.push(a), (a += between(r, 0.55, 1.0) / rm);
			cuts.push(b1);
			for (let i = 0; i + 1 < cuts.length; i++) {
				const c0 = cuts[i], c1 = cuts[i + 1];
				const ri = ra + g, gi = g / ri;
				const out = [c1, ...pierA.filter((p) => p > c0 && p < c1).reverse(), c0].map((a, n, all) => {
					const ro = rB(a) - g;
					const aa = n === 0 ? a - g / ro : n === all.length - 1 ? a + g / ro : a;
					return polar(ro, aa);
				});
				const pts = out_ccw([polar(ri, c0 + gi), polar(ri, c1 - gi), ...out]);
				out_add(kit, out_stone(pts, out_FLOOR - out_FLAG, out_FLOOR, { map: out_PLAN, uv: [r() * 4, r() * 4] }), null);
			}
		}
	});
	// the soffit: lime plaster from the wall plate to the wall's head, open over the stair's well
	const wall = (a) => out_lineAt(plan, a, -out_HALF);
	holed(soffitHole, at(out_FLAGS_IN), wall, out_SOFFIT_Y, true, (geo) => geo && kit.add('plaster', geo, true));
	// the wall plate along the shell under it, moulded on its face
	const plate = [[0, out_SOFFIT_Y - 0.3], [0.2, out_SOFFIT_Y - 0.3], [0.215, out_SOFFIT_Y - 0.295], [0.232, out_SOFFIT_Y - 0.28], [0.24, out_SOFFIT_Y - 0.26], [0.24, out_SOFFIT_Y + 0.02], [0, out_SOFFIT_Y + 0.02]];
	out_ringRun(kit, plate, out_FLAGS_IN - 0.24, 0, Math.PI / 2, 1.3, r);
	// the oak beams on the pier lines, from the wall's head to the plate (where one would cross the well, to its wall)
	for (const p of piers) {
		const F = { o: polar(out_RP, p.a), a: p.a, d: 0 };
		const inWell = p.a > soffitHole[0] - 0.004 && p.a < soffitHole[1] + 0.004;
		const zB = -(out_RP - (inWell ? P.ro : out_FLAGS_IN));
		const y0 = out_SOFFIT_Y - out_BEAM, y1 = out_SOFFIT_Y + 0.03;
		const pts = out_ccw([[-out_HALF, y0], [-out_HALF, y1], [zB, y1], [zB, y0]]);
		const geo = out_stone(pts, -0.085, 0.085, { map: (u, v, w) => [w, v, u], c: 0.012, tile: TILE.timber, uv: [r() * 3, r() * 3] });
		kit.add('timber', out_put(geo, F));
	}
}

/**
 * A pergola over the gate on bearing `a`: four oak posts (two by the glass, two at the lane's edge), a beam along the
 * ring on each pair, rafters across them overhanging both, 2.55 m clear over the flags; passion fruit climbs it from
 * pots (out_furnish).
 */
const out_PERGOLA = { rIn: 40.0, rOut: 42.6, half: 2.75, h: 2.55 };
function out_pergola(kit, a, r) {
	const { rIn, rOut, half, h } = out_PERGOLA;
	const F = { o: [0, 0], a, d: 0 };
	const y0 = out_FLOOR;
	const oak = (w, hh, d, x, y, z) => kit.add('timber', out_put(out_block(w, hh, d, 0.012, 1, x, y, z, r), F));
	const xs = [rIn, rOut].map((rr) => rr * Math.sin(half / rr));
	const zs = [rIn, rOut].map((rr) => rr * Math.cos(half / rr));
	for (let i = 0; i < 2; i++)
		for (const s of [-1, 1]) {
			oak(0.14, h, 0.14, s * xs[i], y0 + h / 2, zs[i]);
			// a brace from each post into its beam
			const br = bar([s * (xs[i] - 0.07), y0 + h - 0.55, zs[i]], [s * (xs[i] - 0.5), y0 + h + 0.01, zs[i]], 0.035, 0.035, 4);
			kit.add('timber', out_put(boxUV(br, TILE.timber), F));
		}
	for (let i = 0; i < 2; i++) oak(2 * xs[i] + 0.7, 0.22, 0.1, 0, y0 + h + 0.11, zs[i]);
	const zA = zs[0] - 0.35, zB = zs[1] + 0.3;
	for (let x = -Math.max(...xs) - 0.2; x <= Math.max(...xs) + 0.2001; x += 0.48) oak(0.06, 0.16, zB - zA, x, y0 + h + 0.3, (zA + zB) / 2);
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

/**
 * A lantern of bronze and opal glass in a frame, its axis at x 0, z `zc`, its foot at y0: a finial under a tray, four
 * corner posts round the glass, a pyramid roof (0.43 m from the finial's foot to the roof's top).
 */
function out_lantern(put, zc, y0) {
	const L = (pts, seg) => {
		const g = out_lathe(pts.map(([a, b]) => [a, b + y0]), seg);
		g.translate(0, 0, zc);
		return g;
	};
	put('bronze', L([[0, 0.427], [0.018, 0.421], [0.132, 0.351], [0.132, 0.339], [0.11, 0.337], [0, 0.337]], 4));
	put('opal', L([[0.104, 0.337], [0.09, 0.075]], 4));
	for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
		const k = 1 / Math.SQRT2;
		put('bronze', bar([sx * 0.104 * k, y0 + 0.339, zc + sz * 0.104 * k], [sx * 0.09 * k, y0 + 0.073, zc + sz * 0.09 * k], 0.006, 0.006, 4));
	}
	put('bronze', L([[0, 0.059], [0.104, 0.065], [0.106, 0.077], [0, 0.077]], 4));
	put('bronze', L([[0, 0], [0.012, 0.015], [0.026, 0.045], [0.03, 0.059], [0, 0.059]], 6));
}

/** the lanterns on every third pier: under the arcade on its inner face, on a bracket; on the terrace, on a post on the
 *  balustrade's rail over the die */
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
		out_lantern(put, zc, 1.885);
		// on the rail: a base, a post, the lantern on it
		const base = box(0.12, 0.025, 0.12);
		base.translate(0, out_TOP + 0.0075, out_BAL_Z);
		put('bronze', base);
		put('bronze', bar([0, out_TOP, out_BAL_Z], [0, out_TOP + 0.3, out_BAL_Z], 0.026, 0.02, 8));
		out_lantern(put, out_BAL_Z, out_TOP + 0.27);
	}
}

/**
 * THE OUTSIDE, built into the bag 'outside': the arcade (piers, arches, spandrels, cornice, balustrade), the terrace on
 * it (its flags, soffit and beams, the stairs up to it, the pergolas over the gates), the walk and its kerb, the apron,
 * the paths, the benches and the lanterns; then the terrace furnished. The four quarters (gate
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
		like(b.door ? 'gate' : `bay${b.j % 2}`, b.am, (k) => out_bay(k, b, r));
		if (b.door) out_pergola(kit, b.am, r);
	}
	out_terrace(kit, plan, r);
	out_stair(kit, r);
	out_ground(kit, plan, r);
	out_benches(kit, plan, r);
	out_lanterns(kit, plan);
	// and laid round four times
	const bag = dome.bag('outside');
	for (let q = 0; q < 4; q++) kit.place(bag, (q * Math.PI) / 2, r);
	dome.outside = { pierR: out_RP, walkY: out_YW, walkEdge: out_KERB, apron: out_KERB + out_KERB_W + out_APRON, pathHalf: out_PATH, pathGateHalf: out_PATH_GATE, pathEnd: out_PATH_END, cornice: out_CORNICE_TOP, top: out_TOP, terrace: out_FLOOR, stairs: [0, 1, 2, 3].map((q) => out_ST.a + (q * Math.PI) / 2) };
	out_furnish(dome, plan);
}

/**
 * THE TERRACE FURNISHED (Samuel 2026-11-05: "a really beautiful place as a community space outside"), with play's own
 * things and plants (by hash, drawn by the page), the same in each quarter and a lane of 1.3–1.7 m kept clear all
 * the way round. Over each gate the pergola, two round tables under it and passion fruit climbing it from pots; along
 * the balustrade daybeds, armchairs round a travertine table, a curved oak bench, lemons, oranges, a fig and a
 * pomegranate in big terracotta pots by the dies; by the glass round tables to eat at looking into the forest, a
 * bench, troughs of basil, strawberries and nasturtiums. Bearings are reckoned in the quarter from the north gate to
 * the east; `face` 0 turns a thing's front (its +z) to the dome's middle, π out to the land, −π/2 on round the ring.
 */
function out_furnish(dome, plan) {
	const P = out_stairPlan();
	const has = (t) => typeof THINGS !== 'undefined' && !!THINGS[t];
	const bay = (j) => plan.bays.find((b) => b.q === 0 && b.j === j);
	const pier = (j) => plan.piers.find((p) => p.q === 0 && p.j === j);
	const rail = (a) => out_lineAt(plan, a, -0.33);
	const M = 42;
	const faceTo = (along, out) => Math.atan2(-along, -out);
	const items = [];
	const thing = (name, rr, a, face = 0, o = {}) => items.push({ name, rr, a, h: o.y ?? 0, turn: a + Math.PI + face, scale: o.scale });
	const plant = (kind, rr, a, h, o = {}) => items.push({ kind, rr, a, h, o });
	// a big terracotta pot (half again the library's: 0.75 m across, its soil 0.6 m up) with a young tree in it
	const pot = (kind, rr, a, k = 1.5) => {
		thing('pot-terracotta', rr, a, 0, { scale: k });
		plant(kind, rr, a, 0.4 * k, { stage: 6, turn: a * 7 });
	};
	const trough = (rr, a, kinds) => {
		thing('planter-trough', rr, a, 0);
		kinds.forEach((kind, i) => plant(kind, rr, a + ((i - (kinds.length - 1) / 2) * 0.52) / rr, 0.5, { stage: 9, turn: i * 2.1 + a * 5 }));
	};
	const dining = (rr, a) => {
		thing('table-dining-round', rr, a, 0);
		for (let k = 0; k < 4; k++) {
			const t = (k + 0.5) * (Math.PI / 2);
			const u = Math.sin(t) * 0.92, v = Math.cos(t) * 0.92;
			thing('chair-spindle', rr + v, a + u / (rr + v), faceTo(-u, -v));
		}
	};
	const daybeds = (b) => {
		for (const s of [-1, 1]) {
			const a = b.am + (s * 1.3) / M;
			thing('daybed-terrace', rail(a) - 0.51, a, 0);
		}
		thing('table-side-travertine', rail(b.am) - 0.32, b.am, 0);
	};
	const lounge = (b) => {
		const rr = rail(b.am) - 0.78;
		thing('table-coffee-travertine', rr, b.am, 0);
		for (const s of [-1, 1]) thing('armchair-round', rr, b.am + (s * 1.15) / M, faceTo(-s, 0.35));
	};
	// a pair of armchairs side by side at the balustrade, looking out, a side table between
	const view = (b) => {
		const rr = rail(b.am) - 0.62;
		for (const s of [-1, 1]) thing('armchair-round', rr, b.am + (s * 0.62) / M, Math.PI - s * 0.25);
		thing('table-side-travertine', rr + 0.05, b.am, 0);
	};
	// over the gate: the pergola's two tables by the glass, passion fruit from pots past its ends
	const gate = bay(out_BAYS);
	for (const s of [-1, 1]) dining(41.25, gate.am + (s * 1.45) / 41.25);
	for (const s of [-1, 1]) {
		const rr = out_PERGOLA.rIn + 0.22, a = gate.am + (s * (out_PERGOLA.half + 0.42)) / rr;
		thing('pot-terracotta', rr, a, 0, { scale: 1.25 });
		plant('passion-fruit', rr, a, 0.5, { stage: 9, turn: Math.atan2(-Math.sin(a), Math.cos(a)) });
	}
	// round the ring, bay by bay
	view(bay(0));
	daybeds(bay(1));
	dining(41.25, bay(2).am);
	lounge(bay(3));
	for (const s of [-1, 1]) trough(40.15, bay(4).am + (s * 0.9) / 40.15, s < 0 ? ['basil', 'strawberry', 'basil'] : ['nasturtium', 'strawberry', 'nasturtium']);
	thing('bench-oak-curved', 40.3, bay(5).am, Math.PI);
	thing('bench-oak-curved', rail(bay(6).am) - 0.33, bay(6).am, 0);
	// in the strip by the glass beside the stair's well: two troughs
	for (const s of [P.sw + 1.1, P.sw + 3.4]) trough(40.12, P.bear(s), ['strawberry', 'nasturtium', 'strawberry']);
	for (const s of [-1, 1]) trough(40.15, bay(9).am + (s * 0.9) / 40.15, s < 0 ? ['nasturtium', 'basil', 'nasturtium'] : ['strawberry', 'basil', 'strawberry']);
	lounge(bay(10));
	dining(41.25, bay(11).am);
	daybeds(bay(12));
	view(bay(13));
	// the trees in pots against the dies: lemons by the pergolas, oranges, a fig and a pomegranate
	for (const [j, kind] of [[0, 'lemon'], [4, 'orange'], [6, 'fig'], [9, 'pomegranate'], [10, 'orange'], [14, 'lemon']]) {
		const a = pier(j).a;
		pot(kind, rail(a) - 0.06 - 0.375, a);
	}
	// laid round four times, as the arcade is
	for (let q = 0; q < 4; q++) {
		const Q = (q * Math.PI) / 2;
		for (const it of items) {
			const [x, z] = polar(it.rr, it.a + Q);
			const y = out_FLOOR + it.h;
			if (it.kind) {
				dome.plant(it.kind, x, y, z, { ...it.o, turn: (it.o.turn ?? 0) + Q });
				continue;
			}
			if (!has(it.name)) continue;
			if (it.scale) {
				const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.turn + Q), new THREE.Vector3(it.scale, it.scale, it.scale));
				dome.place(it.name, m);
			} else dome.place(it.name, x, y, z, { turn: it.turn + Q });
		}
	}
}
