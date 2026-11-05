/*
 * CURTAIN, LINEN — a linen curtain drawn to one side of a window, a wall piece: its back toward the wall at z = 0. Its
 * bronze rod Ø 25 mm runs 1.64 m at 2.90 m from the floor, 12.5 cm off the wall on two brackets (a round rose on the wall,
 * an arm, a cup round the rod), a ball finial at each end. From fifteen bronze rings on the rod hang clips that hold the
 * curtain's stiffened heading: 1.40 m of it, so about 2.6 m of linen gathered into deep soft folds that swing out in
 * front of the rod and back behind it in turn (a ring-top heading; folds 10 cm apart, 9–17 cm deep). It falls 2.86 m to a
 * double hem that just touches the floor, its folds a little uneven and spreading as they fall, drifting a few
 * centimetres toward the side it has been drawn to; its side hems and heading doubled (thicker). Unlined linen lets the
 * light through a little. A sheet round a folded middle surface (t_thick), the hardware lathes, tubes and tori. Linen
 * ('curtain', a little translucent), bronze ('bronze').
 */
const THING = {
	id: 'curtain-linen',
	label: 'Curtain, linen',
	note: 'A linen curtain drawn to one side: 1.40 m gathered in deep soft folds from rings on a bronze rod 2.90 m up, its hem just touching the floor. A wall piece, its back at z = 0.'
};

/* ---- shapes this thing is made with ---- */

/** smooth noise 0 … 1 at (x, y) that does not repeat over the few metres a thing spans */
const t_noise = (x, y, s = 0) => vnoise(x, y, 1024, 1024, s);

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

/* ---- the thing ---- */

/** unlined linen, a little translucent: the kit's curtain, its pictures shared */
material('tA-sheer', TILE.curtain, () => Object.assign(mat('curtain').clone(), { transparent: true, opacity: 0.86, side: THREE.FrontSide, name: 'tA-sheer' }));

const t_CU = { rodY: 2.9, rodZ: 0.125, rodR: 0.0125, rodX: 0.82, top: 2.858, hem: 0.004, half: 0.7, rings: 15, pitch: 0.1 };

/** the curtain's middle surface at u (0 its left edge … 1 its right) and v (0 its hem … 1 its heading) */
function t_cuAt(u, v) {
	const { top, hem, half, pitch, rodZ } = t_CU;
	const k0 = u * (2 * half) / pitch; // half-waves from the left edge: the rings stand at whole numbers
	const fall = 1 - v; // 0 at the heading, 1 at the hem
	// below the heading the folds lose the rings' order: uneven in width, wandering a little as they fall
	const free = span(fall, 0.02, 0.35);
	const k = k0 + free * (0.32 * (t_noise(k0 * 0.55, 3.3, 17) - 0.5) + 0.22 * (t_noise(k0 * 0.3 + 7, fall * 1.6, 19) - 0.5));
	// the heading dips a little between rings
	const dip = 0.016 * Math.pow(Math.sin(Math.PI * k0), 2) * span(v, 0.96, 1);
	const y = lerp(hem, top, v) - dip;
	// each fold its own depth, deeper and less even as it falls, and wider where it reaches the floor
	const fold = Math.floor(k), irregular = t_noise(fold * 3.1 + fall * 0.9, fall * 1.3, 11) - 0.5;
	const amp = (0.044 + 0.022 * fall + 0.02 * span(fall, 0.93, 1)) * (1 + 0.75 * irregular * free);
	// a round crest and a softer trough, as cloth hangs (not a pure wave)
	const w = Math.sin(Math.PI * k);
	const shape = Math.sign(w) * Math.pow(Math.abs(w), 0.8);
	// fine gathers under the heading, fading as it falls
	const gather = 0.004 * Math.sin(Math.PI * k0 * 3.1 + 1.3) * (1 - span(fall, 0.02, 0.12));
	const z = rodZ + amp * shape + gather + 0.012 * free * (t_noise(fall * 2.5, 5.5, 23) - 0.5);
	const spread = 1 + 0.05 * fall * fall;
	const x = (u * 2 - 1) * half * spread - 0.05 * fall * fall + 0.012 * free * (t_noise(fall * 1.8, k0 * 0.2, 29) - 0.5);
	return [x, y, z];
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const { rodY, rodZ, rodR, rodX, rings, pitch, half, top } = t_CU;
	// the linen: 8 points across each half-wave, rows closer at the heading and the hem
	const NU = 14 * 9;
	const vs = [0, 0.004, 0.012, 0.024, 0.04, 0.07, 0.11, 0.17, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.79, 0.85, 0.9, 0.935, 0.96, 0.975, 0.986, 0.994, 1];
	const H = top - t_CU.hem;
	const th = (u, v) => {
		const y = v * H, x = Math.min(u, 1 - u) * 2 * half;
		// doubled hems: 8 cm at the foot, 4 cm at the sides, the stiffened heading 7 cm
		return 0.0024 + (y < 0.08 || x < 0.04 ? 0.0022 : 0) + (y > H - 0.07 ? 0.0028 : 0);
	};
	const cloth = t_thick(NU, vs.length - 1, (u, v, i, j) => t_cuAt(u, vs[Math.round(v * (vs.length - 1))]), (u, v) => th(u, vs[Math.round(v * (vs.length - 1))]), { hem: 4 });
	bag.add('tA-sheer', cloth, null, { uv: 'box', chunk: false });
	// the rod and its finials
	bag.add('bronze', bar([-rodX, rodY, rodZ], [rodX, rodY, rodZ], rodR, rodR, 20), null, o);
	const finial = lathe([[0, -0.006], [0.016, -0.006], [0.017, -0.002], [0.011, 0.004], [0.012, 0.008], [0.021, 0.022], [0.022, 0.034], [0.015, 0.048], [0, 0.052]], 24);
	finial.rotateZ(-Math.PI / 2);
	bag.add('bronze', finial.clone(), at(rodX, rodY, rodZ), o);
	bag.add('bronze', finial.clone().rotateY(Math.PI), at(-rodX, rodY, rodZ), o);
	// two brackets: a rose on the wall, an arm out under the rod, a cup round it
	for (const x of [-0.755, 0.755]) {
		const rose = lathe([[0, 0], [0.028, 0], [0.031, 0.003], [0.03, 0.008], [0.022, 0.012], [0.009, 0.014], [0, 0.014]], 28);
		rose.rotateX(Math.PI / 2);
		bag.add('bronze', rose, at(x, rodY - 0.006, 0), o);
		bag.add('bronze', bar([x, rodY - 0.006, 0.012], [x, rodY - 0.02, rodZ - 0.004], 0.0065, 0.006, 12), null, o);
		const cup = new THREE.TorusGeometry(rodR + 0.004, 0.004, 6, 20);
		cup.rotateY(Math.PI / 2);
		bag.add('bronze', cup, at(x, rodY, rodZ), o);
		bag.add('bronze', new THREE.SphereGeometry(0.008, 12, 8), at(x, rodY - 0.02, rodZ - 0.004), o);
	}
	// the rings on the rod, each with its clip on the heading
	const ringR = 0.022;
	for (let k = 0; k < rings; k++) {
		const x = -half + k * pitch;
		const ring = new THREE.TorusGeometry(ringR, 0.0034, 6, 20);
		ring.rotateY(Math.PI / 2);
		const cy = rodY + rodR + 0.0034 - ringR;
		bag.add('bronze', ring, at(x, cy, rodZ), o);
		bag.add('bronze', bar([x, cy - ringR - 0.002, rodZ], [x, top + 0.012, rodZ], 0.0016, 0.0016, 6), null, o);
		bag.add('bronze', rbox(0.014, 0.018, 0.009, 0.002, 2), at(x, top + 0.004, rodZ), o);
	}
	return bag.build();
}
