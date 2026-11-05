/*
 * RUG, JUTE, ROUND — a braided jute rug Ø 2.40 m, 12 mm thick: a braid of natural jute coiled out from the middle in rings
 * and stitched, the last ring a rolled cord that stands a little proud round its edge. Real braided jute rugs are sold
 * Ø 1.2–3.0 m and 10–15 mm thick, their braids 3–4 cm wide (here 3.1 cm: eight rows to a 25 cm repeat, as the kit's
 * jute has them). Made as rings of a flat disc whose UVs run u round and v out from the middle, in bands a quarter metre wide
 * that each take a whole number of repeats round (so no seam shows, and the braid keeps its length from the middle to
 * the edge), and the rolled edge as a cord round it. Its own braided jute ('tA-jute', two pictures: the kit's 'jute' has
 * the rows but not the braid), laid as the kit's is: u round, v out from the middle over its 25 cm repeat.
 */
const THING = {
	id: 'rug-jute-round',
	label: 'Rug, jute, round',
	note: 'A round braided jute rug, Ø 2.40 m and 12 mm thick: its braid coiled in rings from the middle, its edge a rolled cord a little proud.'
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

/* ---- the thing ---- */

/**
 * Braided jute, the rug's own (two pictures): rows of braid 3.1 cm wide, eight to the 25 cm repeat, each row two lanes
 * of strands slanting opposite ways (a braid seen from above is a chevron), every strand a little rounded, each row its
 * own shade of the fibre; u runs along the braid, v across the rows.
 */
material('tA-jute', 0.25, () =>
	(() => {
		const s = surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 3.5,
			paint: (u, v, o) => {
				const r = v * 8, row = Math.floor(r), f = r - row;
				const lane = f < 0.5 ? 0 : 1, g = lane ? (f - 0.5) * 2 : f * 2;
				const t = u * 52 + (lane ? 0.85 : -0.85) * g + (row % 2) * 0.5;
				const strand = 0.5 - 0.5 * Math.cos(TAU * t);
				const lift = Math.sin(Math.PI * g), roll = Math.sin(Math.PI * f);
				const fibre = hash2((u * 512) | 0, (v * 512) | 0, 301);
				o.h = 0.2 + 0.38 * roll + 0.26 * strand * lift + 0.08 * fibre;
				const tone = 0.86 + 0.24 * hash2(row, 7, 303);
				o.c = scalec(mixc(col('#b8996a'), col('#7e6340'), 0.45 * (1 - strand * lift) + 0.35 * (1 - roll)), tone * (0.86 + 0.2 * fibre));
			}
		});
		return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.95, envMapIntensity: INDOOR });
	})()
);

const t_RUG = { R: 1.2, top: 0.012, tile: 0.25 };

/** the rug's top: how high it lies at a point (a woven thing never lies quite flat) */
const t_rugY = (x, z) => t_RUG.top + 0.0012 * (t_noise(x * 1.7, z * 1.7, 7) - 0.5);

function thingBuild() {
	const bag = new Bag(THING.id);
	const { R, tile } = t_RUG;
	const seg = 192;
	// the cord round the edge: centre at rc, radius rr; the flat stops where the cord begins
	const rr = 0.0095, rc = R - rr, lift = 0.0035;
	const a0 = Math.PI - Math.asin(lift / rr), a1 = -Math.PI * 0.42, edge = rc + rr * Math.cos(a0);
	// the flat, in bands a tile wide: each its own whole number of repeats round
	const bands = [];
	for (let r = 0; r < edge - 1e-6; r += tile) bands.push([r, Math.min(edge, r + tile)]);
	for (const [r0, r1] of bands) {
		const mid = (r0 + r1) / 2, k = Math.max(3, Math.round((TAU * mid) / tile));
		const rows = Math.max(2, Math.ceil((r1 - r0) / 0.06));
		const g = t_surf(rows, seg, (u, v) => {
			const r = lerp(r0, r1, u), a = v * TAU;
			const x = r * Math.sin(a), z = r * Math.cos(a);
			return [x, t_rugY(x, z), z];
		}, { uv: (u, v) => [v * k * tile, lerp(r0, r1, u)], tile });
		bag.add('tA-jute', g, null, { chunk: false });
	}
	// the rolled edge: the last braid as a cord, from where the flat ends, over its top and down to the floor
	const k = Math.round((TAU * rc) / tile);
	const cord = t_surf(10, seg, (u, v) => {
		const t = lerp(a0, a1, u), a = v * TAU;
		const r = rc + rr * Math.cos(t), y = t_RUG.top - lift + rr * Math.sin(t);
		const x = r * Math.sin(a), z = r * Math.cos(a);
		return [x, Math.max(0, y + (t_rugY(x, z) - t_RUG.top)), z];
	}, { uv: (u, v) => [v * k * tile, R + rr * (a0 - lerp(a0, a1, u)) * 1.6], tile });
	bag.add('tA-jute', cord, null, { chunk: false });
	return bag.build();
}
