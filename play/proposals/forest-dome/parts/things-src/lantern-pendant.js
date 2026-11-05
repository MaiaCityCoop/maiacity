/*
 * LANTERN, PENDANT — a round paper pendant lantern Ø 0.55 m (a usual ribbed paper lantern: Ø 0.40–0.60 m, its wire
 * spiral at 1.5–2.5 cm): washi paper on a spiral of thin wire (40 turns, 1.8 cm apart), the paper falling in 4 mm
 * between the wire's turns so the wire shows as fine ridges and, lit from inside, as fine dark lines (more paper over
 * the wire, less light), its glued strips as faint darker bands, its glow brightest round its middle;
 * a wire ring round each opening (Ø 0.13 m below, 0.15 m above), a brass cap on three wire spokes over the top, the
 * socket and a warm bulb inside; a white textile cord 1.0 m up to a brass grip and a white porcelain ceiling rose Ø 0.10 m.
 * Origin: where the rose meets the ceiling (it hangs down −y); the lantern's middle 1.30 m below.
 */

/* ---- the shapes it is made with (builder C's helpers, the same in each of its things) ---- */

/**
 * The smooth normals of a grid of points (`pts[i * cols + j]`, rows × cols), round its seams where it wraps; a row or a
 * column whose points all meet (a pole) shares one normal.
 */
function t_gridNormals(pts, rows, cols, wrapI, wrapJ) {
	const ix = (i, j) => (wrapI ? mod(i, rows) : i) * cols + (wrapJ ? mod(j, cols) : j);
	const nor = pts.map(() => new THREE.Vector3());
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
	for (let i = 0; i < (wrapI ? rows : rows - 1); i++)
		for (let j = 0; j < (wrapJ ? cols : cols - 1); j++) {
			const a = ix(i, j), b = ix(i + 1, j), c = ix(i, j + 1), d = ix(i + 1, j + 1);
			for (const [p, q, r] of [[a, b, c], [b, d, c]]) {
				f.crossVectors(e1.subVectors(pts[q], pts[p]), e2.subVectors(pts[r], pts[p]));
				nor[p].add(f);
				nor[q].add(f);
				nor[r].add(f);
			}
		}
	const pole = (list) => {
		if (list.some((k) => pts[k].distanceToSquared(pts[list[0]]) > 1e-12)) return;
		const s = new THREE.Vector3();
		for (const k of list) s.add(nor[k]);
		for (const k of list) nor[k].copy(s);
	};
	for (let i = 0; i < rows; i++) pole(Array.from({ length: cols }, (_, j) => i * cols + j));
	for (let j = 0; j < cols; j++) pole(Array.from({ length: rows }, (_, i) => i * cols + j));
	for (const n of nor) n.normalize();
	return nor;
}

/**
 * A surface as a grid of points: `P(i, j)` → [x, y, z] for i < rows (along) and j < cols (across), its normals smooth
 * over the grid and round a seam where it wraps (`wrapI`, `wrapJ`: the seam's points are made twice so its texture can
 * close: `uv(i, j)` is asked for i = rows or j = cols there too). Its faces look along ∂P/∂i × ∂P/∂j; `flip` turns them.
 */
function t_grid(rows, cols, P, o = {}) {
	const { wrapI = false, wrapJ = false, flip = false } = o;
	const uvf = o.uv ?? ((i, j) => [j / cols, i / rows]);
	const pts = [];
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(new THREE.Vector3(...P(i, j)));
	const nor = t_gridNormals(pts, rows, cols, wrapI, wrapJ);
	const R = wrapI ? rows + 1 : rows, W = wrapJ ? cols + 1 : cols;
	const pos = new Float32Array(R * W * 3), nrm = new Float32Array(R * W * 3), uv = new Float32Array(R * W * 2);
	const sg = flip ? -1 : 1;
	for (let i = 0, k = 0; i < R; i++)
		for (let j = 0; j < W; j++, k++) {
			const s = (i % rows) * cols + (j % cols);
			pos[k * 3] = pts[s].x;
			pos[k * 3 + 1] = pts[s].y;
			pos[k * 3 + 2] = pts[s].z;
			nrm[k * 3] = nor[s].x * sg;
			nrm[k * 3 + 1] = nor[s].y * sg;
			nrm[k * 3 + 2] = nor[s].z * sg;
			const [u, v] = uvf(i, j);
			uv[k * 2] = u;
			uv[k * 2 + 1] = v;
		}
	const idx = [];
	for (let i = 0; i < R - 1; i++)
		for (let j = 0; j < W - 1; j++) {
			const a = i * W + j, b = a + W, c = a + 1, d = b + 1;
			if (flip) idx.push(a, c, b, b, c, d);
			else idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/**
 * A flat face over a closed ring of points (and its holes), facing `normal`: the ring triangulated, each triangle turned
 * to face that way; `uvf(p)` its UVs.
 */
function t_cap(ring, holes, normal, uvf) {
	const N = new THREE.Vector3(...normal).normalize();
	const e1 = new THREE.Vector3(...(Math.abs(N.y) < 0.9 ? [0, 1, 0] : [1, 0, 0])).cross(N).normalize();
	const e2 = N.clone().cross(e1);
	const V = (p) => (p.isVector3 ? p : new THREE.Vector3(...p));
	const R = ring.map(V), H = holes.map((h) => h.map(V));
	const all = [R, ...H].flat();
	const flat = (list) => list.map((p) => new THREE.Vector2(p.dot(e1), p.dot(e2)));
	const tri = THREE.ShapeUtils.triangulateShape(flat(R), H.map(flat));
	const pos = [], nrm = [], uv = [], idx = [];
	for (const p of all) {
		pos.push(p.x, p.y, p.z);
		nrm.push(N.x, N.y, N.z);
		uv.push(...uvf(p));
	}
	const a = new THREE.Vector3(), b = new THREE.Vector3();
	for (const [i, j, k] of tri) {
		a.subVectors(all[j], all[i]);
		b.subVectors(all[k], all[i]);
		if (a.cross(b).dot(N) >= 0) idx.push(i, j, k);
		else idx.push(i, k, j);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/** shapes merged into one (each given its index first, so they can merge) */
function t_merge(list) {
	return mergeGeometries(list.filter(Boolean).map((g) => plain(g)));
}

/**
 * A cross-section swept along a path: `path` points [x, y, z]; `shape` the section's points [s, t] counter-clockwise (s
 * to the path's side, t towards `o.up`), closed round; its ends capped unless the path is closed. UVs: u along the path
 * and v round the section, in metres over `o.tile`.
 */
function t_sweep(path, shape, o = {}) {
	const { closed = false, tile = 1, caps = true } = o;
	const n = path.length, m = shape.length;
	const P = path.map((p) => new THREE.Vector3(...p));
	const U = new THREE.Vector3(...(o.up ?? [0, 1, 0]));
	const fr = P.map((p, i) => {
		const a = closed ? P[mod(i - 1, n)] : P[Math.max(0, i - 1)], b = closed ? P[mod(i + 1, n)] : P[Math.min(n - 1, i + 1)];
		const t = b.clone().sub(a).normalize();
		const side = t.clone().cross(U).normalize();
		return { t, side, up: side.clone().cross(t).normalize() };
	});
	const along = [0];
	for (let i = 1; i <= n; i++) along.push(along[i - 1] + P[i % n].distanceTo(P[i - 1]));
	const round = [0];
	for (let j = 1; j <= m; j++) round.push(round[j - 1] + Math.hypot(shape[j % m][0] - shape[j - 1][0], shape[j % m][1] - shape[j - 1][1]));
	const pt = (i, s, t) => P[i].clone().addScaledVector(fr[i].side, s).addScaledVector(fr[i].up, t);
	const g = t_grid(n, m, (i, j) => pt(i, ...shape[j]).toArray(), { wrapI: closed, wrapJ: true, uv: (i, j) => [along[i] / tile, round[j] / tile] });
	if (closed || !caps) return g;
	const end = (i, s) => t_cap(shape.map(([a, b]) => pt(i, a, b)), [], fr[i].t.clone().multiplyScalar(s).toArray(), (p) => [p.x / tile, p.y / tile]);
	return t_merge([g, end(0, -1), end(n - 1, 1)]);
}

/**
 * A lathe round y of a profile [r, y] (`seg` sides), its faces outward where the profile runs out and up (`flip` turns
 * them), smooth round; UVs u round (metres at the widest) and v along the profile, over `tile`.
 */
function t_lathe(prof, seg = 32, o = {}) {
	const tile = o.tile ?? 1;
	const len = [0];
	for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
	const wide = Math.max(...prof.map((p) => p[0]));
	return t_grid(prof.length, seg, (i, j) => {
		const a = (j / seg) * TAU, [r, y] = prof[i];
		return [r * Math.cos(a), y, r * Math.sin(a)];
	}, { wrapJ: true, flip: o.flip, uv: (i, j) => [((j / seg) * TAU * wide) / tile, len[i] / tile] });
}

/** a circle's section [s, t] (radius r, n points), counter-clockwise */
function t_circle(r, n = 8, cx = 0, cy = 0) {
	return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU)]);
}

/**
 * A paper lantern's skin: the paper on a spiral of wire. `mer` its meridian [r, y] from the bottom opening to the top
 * one; the wire a helix making `o.ribs` turns from opening to opening, the paper between its turns falling in by `dip`
 * (flat between them, sharp over the wire); built along the helix itself (each row a helix parallel to the wire, `per`
 * rows to a turn), so the ridges never alias and the seam closes on itself. UVs: u once round, v once up the meridian
 * (the paper's picture draws the wire's helix and the glow to match).
 */
function t_ribbed(mer, dip, o = {}) {
	const per = o.per ?? 3, C = o.cols ?? 64, ribs = o.ribs ?? t_RIBS;
	const s = [0];
	for (let k = 1; k < mer.length; k++) s.push(s[k - 1] + Math.hypot(mer[k][0] - mer[k - 1][0], mer[k][1] - mer[k - 1][1]));
	const L = s.at(-1), pitch = L / ribs;
	// the meridian at arc length x: its point and its outward normal
	const merAt = (x) => {
		let k = 1;
		while (k < s.length - 1 && s[k] < x) k++;
		const f = (x - s[k - 1]) / (s[k] - s[k - 1] || 1);
		const [r0, y0] = mer[k - 1], [r1, y1] = mer[k];
		const l = Math.hypot(r1 - r0, y1 - y0) || 1;
		return [r0 + (r1 - r0) * f, y0 + (y1 - y0) * f, (y1 - y0) / l, -(r1 - r0) / l];
	};
	const rows = (ribs + 1) * per + 1, W = C + 1;
	const pos = [], uv = [];
	for (let r = 0; r < rows; r++)
		for (let m = 0; m <= C; m++) {
			const x = clamp(pitch * (r / per + m / C) - pitch, 0, L);
			const [rr, y, nr, ny] = merAt(x);
			const w = mod(r, per) / per;
			const off = -dip * Math.pow(Math.sin(Math.PI * w), 0.5) * span(x, 0, 0.015) * span(L - x, 0, 0.015);
			const a = (m / C) * TAU, R = rr + nr * off;
			pos.push(new THREE.Vector3(R * Math.cos(a), y + ny * off, R * Math.sin(a)));
			uv.push(m / C, x / L);
		}
	const idx = [];
	for (let r = 0; r < rows - 1; r++)
		for (let m = 0; m < C; m++) {
			const a = r * W + m, b = a + W, c = a + 1, d = b + 1;
			idx.push(a, b, c, b, d, c);
		}
	const nor = pos.map(() => new THREE.Vector3());
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
	for (let k = 0; k < idx.length; k += 3) {
		const [p, q, t] = [idx[k], idx[k + 1], idx[k + 2]];
		f.crossVectors(e1.subVectors(pos[q], pos[p]), e2.subVectors(pos[t], pos[p]));
		nor[p].add(f);
		nor[q].add(f);
		nor[t].add(f);
	}
	// the seam: the last column of a row is the first of the row a turn on
	for (let r = 0; r + per < rows; r++) {
		const a = r * W + C, b = (r + per) * W;
		const sum = nor[a].clone().add(nor[b]);
		nor[a].copy(sum);
		nor[b].copy(sum);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap((p) => [p.x, p.y, p.z]), 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor.flatMap((n) => n.normalize().toArray()), 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	return g;
}

/** how many turns the wire makes from opening to opening, and the paper's glued strips round: every lantern alike */
const t_RIBS = 40, t_GORES = 16;
/**
 * The lantern's paper (its pictures its own, two, the same for every lantern): in daylight warm white with its fibres,
 * the wire's helix showing faintly through it and the overlaps where its strips are glued; lit from inside, the wire
 * and the overlaps darker lines (more paper, less light) and the glow brightest round its middle, dimmer toward the
 * openings. u once round, v once up the meridian.
 */
function t_paper() {
	material('c-paper', 1, () => {
		// one pass paints both: the daylight colour, and the glow as a grey picture (its warmth the emissive colour's)
		const s = surface({
			px: 256,
			py: 640,
			maps: ['map', 'roughnessMap'],
			paint: (u, v, o) => {
				const ph = mod(v * t_RIBS - u, 1), d = Math.min(ph, 1 - ph);
				const wire = Math.exp(-Math.pow(d / 0.065, 2));
				const g = mod(u * t_GORES, 1), seam = span(0.03 - Math.min(g, 1 - g), -0.006, 0.006);
				const fib = fbm(u, v, 48, 2, 301, 24) - 0.5;
				const glow = 0.32 + 0.68 * Math.pow(Math.sin(Math.PI * clamp(v)), 1.1);
				o.c = scalec([1, 0.965, 0.915], 0.97 - 0.22 * wire - 0.05 * seam + fib * 0.06);
				o.k = (1 - 0.72 * wire - 0.22 * seam + fib * 0.1) * glow;
			}
		});
		return new THREE.MeshStandardMaterial({ color: '#fff8ef', map: s.map, emissive: '#ffcf96', emissiveMap: s.roughnessMap, emissiveIntensity: 1.0, roughness: 0.92, side: THREE.DoubleSide });
	});
}

/** a wire ring: radius r at height y, its wire's radius w */
function t_wireRing(r, y, w, n = 48) {
	return t_sweep(Array.from({ length: n }, (_, k) => [r * Math.cos((k / n) * TAU), y, -r * Math.sin((k / n) * TAU)]), t_circle(w, 6), { closed: true });
}

/**
 * What a pendant hangs by, from the ceiling down: a round porcelain ceiling rose (Ø 0.10 m) at the origin, a brass cord grip, the
 * cord (`len` metres), a brass cap on the lantern's top ring with three wire spokes to it, the socket and a warm bulb
 * inside. `yTop` the lantern's top opening (its radius `rTop`), `yBulb` the bulb's middle.
 */
function t_pendantTop(bag, yTop, rTop, yBulb) {
	bag.add('glaze', t_lathe([[0, -0.026], [0.012, -0.026], [0.043, -0.0245], [0.048, -0.021], [0.05, -0.016], [0.05, 0]], 48));
	bag.add('brass', t_lathe([[0, -0.046], [0.004, -0.046], [0.0055, -0.044], [0.007, -0.03], [0.008, -0.026]], 20));
	const cap = yTop + 0.03;
	bag.add('linen', t_sweep([[0, -0.045, 0], [0, cap + 0.02, 0]], t_circle(0.0028, 8), { up: [1, 0, 0], tile: TILE.linen }));
	bag.add('brass', t_lathe([[0, cap - 0.012], [0.012, cap - 0.012], [0.016, cap - 0.006], [0.016, cap + 0.008], [0.011, cap + 0.02], [0.004, cap + 0.024], [0, cap + 0.024]], 28));
	bag.add('bronze', t_wireRing(rTop, yTop, 0.0016));
	for (let k = 0; k < 3; k++) {
		const a = (k / 3) * TAU + 0.5;
		bag.add('bronze', bar([rTop * Math.cos(a), yTop, rTop * Math.sin(a)], [0.012 * Math.cos(a), cap - 0.006, 0.012 * Math.sin(a)], 0.0013, 0.0013, 6));
	}
	// the socket and the bulb, hanging inside
	bag.add('shadow', t_lathe([[0, yBulb + 0.028], [0.0135, yBulb + 0.028], [0.0145, yBulb + 0.075], [0.008, yBulb + 0.082], [0, yBulb + 0.083]], 20));
	bag.add('linen', t_sweep([[0, cap - 0.01, 0], [0, yBulb + 0.08, 0]], t_circle(0.0028, 8), { up: [1, 0, 0], tile: TILE.linen }));
	bag.add('opal', new THREE.SphereGeometry(0.032, 24, 16), at(0, yBulb, 0, 0, [1, 1.12, 1]));
}

/* ---- the thing ---- */

const THING = {
	id: 'lantern-pendant',
	label: 'Paper pendant lantern',
	note: 'A round ribbed paper pendant lantern Ø 0.55 m, its paper on a fine wire spiral and lit from inside, hung on a white cord from a porcelain ceiling rose so its middle is 1.30 m below the ceiling.'
};

t_paper();

function thingBuild() {
	const bag = new Bag(THING.id);
	const R = 0.275, V = 0.262, yc = -1.3, rB = 0.065, rT = 0.075;
	// the meridian: a sphere a little flattened, from the bottom opening to the top one
	const p0 = Math.asin(rB / R), p1 = Math.PI - Math.asin(rT / R);
	const mer = Array.from({ length: 200 }, (_, k) => {
		const p = p0 + (k / 199) * (p1 - p0);
		return [R * Math.sin(p), yc - V * Math.cos(p)];
	});
	bag.add('c-paper', t_ribbed(mer, 0.004, { cols: 64 }));
	bag.add('bronze', t_wireRing(rB, mer[0][1], 0.0016));
	const yBulb = yc + 0.1;
	t_pendantTop(bag, mer.at(-1)[1], rT, yBulb);
	const g = bag.build();
	g.userData.anchor = { origin: 'the ceiling rose (hangs down −y)', middle: [0, yc, 0] };
	g.userData.lamp = { at: [0, yBulb, 0], lumens: 800, colour: '#ffcf96' };
	return g;
}
