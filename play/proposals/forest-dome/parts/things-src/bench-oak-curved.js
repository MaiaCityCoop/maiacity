/*
 * BENCH-OAK-CURVED — a curved bench of solid oak, for the dome's halls and the forest's clearing. Real measures: a
 * bench seat is 43–46 cm high and 35–45 cm deep (40 here); 1.8 m along its middle line, bent to a radius of 2.2 m (a
 * ring of eight of them would close round a clearing 4.4 m across); a seat of solid oak 55 mm thick, every edge eased
 * 14 mm; two panel legs 45 mm thick, waisted, flaring to their feet, an arch between the feet; their tenons come through
 * the seat and are wedged (the end grain and the wedges show on top). Made of: the seat a plate of its plan (an arc
 * band, corners rounded 7 cm) with its grain along the arc, the legs plates of their outline set across it; oiled oak.
 * Anchor: the middle of its plan on the floor (y 0); its hollow side, where one sits, toward +z.
 */

/* ---- the shapes these oak things share: wood laid with its grain, turned parts, rounded slabs, bent panels ---- */

/** box UVs in metres over the oak's tile, the grain running along `axis` ('x', 'y' or 'z') */
function t_grain(geo, axis = 'x', tile = TILE.oak) {
	const turn = axis === 'y' ? new THREE.Matrix4().makeRotationZ(-Math.PI / 2) : axis === 'z' ? new THREE.Matrix4().makeRotationY(Math.PI / 2) : null;
	if (!turn) return boxUV(geo, tile);
	geo.applyMatrix4(turn);
	const g = boxUV(geo, tile);
	g.applyMatrix4(turn.clone().invert());
	return g;
}

/** box UVs in metres, each triangle's grain along the axis `pick(x, y, z)` gives for its middle (mitred frames) */
function t_grainBy(geo, pick, tile = TILE.oak) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const pos = g.attributes.position;
	const uv = new Float32Array(pos.count * 2);
	const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3();
	// each axis turned onto x: y → (y, −x, z), z → (z, y, −x)
	const turn = { x: (p) => [p.x, p.y, p.z], y: (p) => [p.y, -p.x, p.z], z: (p) => [p.z, p.y, -p.x] };
	for (let i = 0; i < pos.count; i += 3) {
		for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(pos, i + k);
		const f = turn[pick((P[0].x + P[1].x + P[2].x) / 3, (P[0].y + P[1].y + P[2].y) / 3, (P[0].z + P[1].z + P[2].z) / 3)];
		const q = P.map((p) => new THREE.Vector3(...f(p)));
		n.subVectors(q[2], q[1]).cross(q[0].clone().sub(q[1]));
		const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
		for (let k = 0; k < 3; k++) {
			const p = q[k];
			const [u, v] = ay >= ax && ay >= az ? [p.x, p.z] : ax >= az ? [p.z, p.y] : [p.x, p.y];
			uv[(i + k) * 2] = u / tile;
			uv[(i + k) * 2 + 1] = v / tile;
		}
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	if (!g.attributes.normal) g.computeVertexNormals();
	return g;
}

/** a turned part (a leg, a column, a knob): a lathe of [r, y] points, its UVs in metres, the grain along its length */
function t_turn(points, seg = 24, tile = TILE.oak, phi = TAU) {
	const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
	const g = new THREE.LatheGeometry(pts, seg, 0, phi);
	const along = [0];
	for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + pts[i].distanceTo(pts[i - 1]));
	const widest = Math.max(...points.map((p) => p[0]));
	// round it, a whole number of tiles, so the pictures meet where the lathe closes
	const round = phi < TAU ? (phi * widest) / tile : Math.max(1, Math.round((phi * widest) / tile));
	const uv = g.attributes.uv, pos = g.attributes.position;
	// wood: turned from a board whose rings lie in flat sheets, so across the grain the picture reads by depth (z):
	// broad figure on two faces, close lines on the other two, and no seam
	const wood = tile === TILE.oak;
	for (let k = 0; k < uv.count; k++) {
		const i = Math.floor(k / pts.length), j = k % pts.length;
		uv.setXY(k, along[j] / tile, wood ? pos.getZ(k) / tile + 0.31 : (i / seg) * round);
	}
	return g;
}

/** a profile of a turned leg: [r, y] from its foot (y 0) to its top (y len), swelling a third of the way up */
function t_legProfile(len, rTop, rMid, rFoot, n = 14) {
	const pts = [[0, 0], [rFoot * 0.85, 0], [rFoot, len * 0.008]];
	for (let i = 1; i <= n; i++) {
		const t = i / n;
		const swell = Math.sin(Math.PI * Math.min(1, t / 0.66) * 0.5);
		const r = t < 0.34 ? lerp(rFoot, rMid, smooth(t / 0.34)) : lerp(rMid, rTop, smooth((t - 0.34) / 0.66));
		pts.push([r * (0.995 + 0.005 * swell), len * t]);
	}
	pts.push([0, len]);
	return pts;
}

/** a round rod from a to b (a spindle, a stretcher), turned with a swell, its grain along it */
function t_rod(a, b, r0, r1 = r0, swell = 0, seg = 12) {
	const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
	const len = A.distanceTo(B);
	const pts = [];
	const n = swell ? 8 : 1;
	pts.push([0, 0]);
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		pts.push([lerp(r0, r1, t) + swell * Math.sin(Math.PI * t), len * t]);
	}
	pts.push([0, len]);
	const g = t_turn(pts, seg);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
	g.applyMatrix4(new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)));
	return g;
}

/**
 * A rounded slab whose plan is star-shaped round [cx, cz] (a seat, a round top, a tray): `edge(a)` its outline at
 * angle a (0 … 2π) as [x, z], `top(x, z)` and `bottom(x, z)` the heights of its faces, every edge rounded by `r`
 * (`rb` underneath). Smooth normals all over; no UVs (lay them with t_grain or boxUV).
 */
function t_slab({ edge, top, bottom, r = 0.01, rb = r, n = 64, rings = 6, round = 4, cx = 0, cz = 0 }) {
	const E = [], N = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * TAU;
		const p = edge(a), p0 = edge(a - 1e-3), p1 = edge(a + 1e-3);
		let nx = p1[1] - p0[1], nz = -(p1[0] - p0[0]);
		const l = Math.hypot(nx, nz) || 1;
		nx /= l;
		nz /= l;
		if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) (nx = -nx), (nz = -nz);
		E.push(p);
		N.push([nx, nz]);
	}
	const rows = [];
	const at = (i, inset) => [E[i][0] - N[i][0] * inset, E[i][1] - N[i][1] * inset];
	const inner = (i, s, inset) => {
		const [x, z] = at(i, inset);
		return [cx + (x - cx) * s, cz + (z - cz) * s];
	};
	// the top, from near the middle out to where the rounding starts
	for (let k = 1; k <= rings; k++) rows.push((i) => { const [x, z] = inner(i, k / rings, r); return [x, top(x, z), z]; });
	// the rounded edge: a quarter down from the top, the side, a quarter into the bottom
	for (let k = 1; k <= round; k++) {
		const f = (k / round) * (Math.PI / 2);
		rows.push((i) => { const [x0, z0] = at(i, r); const ty = top(x0, z0); const [x, z] = at(i, r - r * Math.sin(f)); return [x, ty - r + r * Math.cos(f), z]; });
	}
	for (let k = 0; k <= round; k++) {
		const f = Math.PI / 2 + (k / round) * (Math.PI / 2);
		rows.push((i) => { const [x0, z0] = at(i, rb); const by = bottom(x0, z0); const [x, z] = at(i, rb - rb * Math.sin(f)); return [x, by + rb + rb * Math.cos(f), z]; });
	}
	for (let k = rings; k >= 1; k--) rows.push((i) => { const [x, z] = inner(i, k / rings, rb); return [x, bottom(x, z), z]; });
	const pos = [cx, top(cx, cz), cz];
	for (const row of rows) for (let i = 0; i < n; i++) pos.push(...row(i));
	const bot = pos.length / 3;
	pos.push(cx, bottom(cx, cz), cz);
	const idx = [];
	for (let i = 0; i < n; i++) idx.push(0, 1 + ((i + 1) % n), 1 + i);
	for (let k = 0; k < rows.length - 1; k++)
		for (let i = 0; i < n; i++) {
			const a = 1 + k * n + i, b = 1 + k * n + ((i + 1) % n), c = a + n, d = b + n;
			idx.push(a, b, c, b, d, c);
		}
	const last = 1 + (rows.length - 1) * n;
	for (let i = 0; i < n; i++) idx.push(bot, last + i, last + ((i + 1) % n));
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	// wound so the top faces up
	const nor = g.attributes.normal;
	if (nor.getY(0) < 0) {
		const ix = g.index.array;
		for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
		g.computeVertexNormals();
	}
	return g;
}

/**
 * Triangles cut by upright planes every `max` metres along x (the same planes for all, so neighbours meet without
 * cracks): a flat panel then bends smoothly. Every attribute is carried and the normals kept unit length.
 */
function t_split(geo, max = 0.04) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const names = Object.keys(g.attributes), sizes = names.map((k) => g.attributes[k].itemSize), arrs = names.map((k) => g.attributes[k].array);
	const W = sizes.reduce((a, b) => a + b, 0);
	const px = names.slice(0, names.indexOf('position')).reduce((a, k) => a + g.attributes[k].itemSize, 0);
	const vert = (i) => {
		const v = new Float64Array(W);
		let o = 0;
		for (let a = 0; a < names.length; a++) for (let c = 0; c < sizes[a]; c++) v[o++] = arrs[a][i * sizes[a] + c];
		return v;
	};
	const mix = (a, b, t) => {
		const v = new Float64Array(W);
		for (let k = 0; k < W; k++) v[k] = a[k] + (b[k] - a[k]) * t;
		return v;
	};
	/** the part of a polygon on one side of the plane x = c (above it when `up`) */
	const clip = (poly, c, up) => {
		const out = [];
		for (let i = 0; i < poly.length; i++) {
			const a = poly[i], b = poly[(i + 1) % poly.length];
			const ina = up ? a[px] >= c : a[px] <= c, inb = up ? b[px] >= c : b[px] <= c;
			if (ina) out.push(a);
			if (ina !== inb) out.push(mix(a, b, (c - a[px]) / (b[px] - a[px])));
		}
		return out;
	};
	const tris = [];
	const n = g.attributes.position.count;
	for (let i = 0; i < n; i += 3) {
		const t = [vert(i), vert(i + 1), vert(i + 2)];
		const lo = Math.min(t[0][px], t[1][px], t[2][px]), hi = Math.max(t[0][px], t[1][px], t[2][px]);
		const k0 = Math.floor(lo / max), k1 = Math.ceil(hi / max);
		if (k1 - k0 <= 1) {
			tris.push(t[0], t[1], t[2]);
			continue;
		}
		for (let k = k0; k < k1; k++) {
			const poly = clip(clip(t, k * max, true), (k + 1) * max, false);
			for (let j = 1; j < poly.length - 1; j++) tris.push(poly[0], poly[j], poly[j + 1]);
		}
	}
	const r = new THREE.BufferGeometry();
	let o = 0;
	names.forEach((k, a) => {
		const arr = new Float32Array(tris.length * sizes[a]);
		tris.forEach((v, i) => { for (let c = 0; c < sizes[a]; c++) arr[i * sizes[a] + c] = v[o + c]; });
		if (k === 'normal') for (let i = 0; i < tris.length; i++) {
			const l = Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]) || 1;
			arr[i * 3] /= l;
			arr[i * 3 + 1] /= l;
			arr[i * 3 + 2] /= l;
		}
		r.setAttribute(k, new THREE.BufferAttribute(arr, sizes[a]));
		o += sizes[a];
	});
	return r;
}

/**
 * A flat part bent round a vertical axis: x becomes the length along an arc of radius `R` (at z 0) round a centre at
 * [0, −R] (R > 0: bulging toward +z; R < 0: hollow toward +z), z its offset out from it; normals turned with it.
 */
function t_bend(geo, R) {
	const pos = geo.attributes.position, nor = geo.attributes.normal;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), z = pos.getZ(i), a = x / R, r = R + z;
		pos.setXYZ(i, r * Math.sin(a), pos.getY(i), r * Math.cos(a) - R);
		if (nor) {
			const nx = nor.getX(i), nz = nor.getZ(i), c = Math.cos(a), s = Math.sin(a);
			nor.setXYZ(i, nx * c + nz * s, nor.getY(i), -nx * s + nz * c);
		}
	}
	pos.needsUpdate = true;
	return geo;
}

/** a flat plate of a plan outline ([x, z] points), `thick` high from y 0, its edges rounded by `bevel` (which it grows by) */
function t_plate(points, thick, bevel = 0, segs = 3, curve = 24, holes = []) {
	const flip = (pts) => pts.map(([x, z]) => [x, -z]);
	const g = extrude(t_shape(flip(points), holes.map(flip)), thick, bevel, segs, curve);
	g.rotateX(-Math.PI / 2);
	return g;
}

/** an upright plate of an elevation outline ([x, y] points), `thick` deep from z 0 toward +z, edges rounded by `bevel` */
function t_panel(points, thick, bevel = 0, segs = 3, curve = 24, holes = []) {
	return extrude(t_shape(points, holes), thick, bevel, segs, curve);
}

/** a shape whose outline runs counter-clockwise and its holes clockwise, as extruding wants them (else holes face in) */
function t_shape(points, holes = []) {
	const cw = (pts) => THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)));
	const outer = cw(points) ? points.slice().reverse() : points;
	return shapeOf(outer, holes.map((h) => (cw(h) ? h : h.slice().reverse())));
}

/**
 * A plan outline: the band between radii r0 and r1 round [0, cz] from angle a0 to a1 (0 = toward +z, π/2 = +x), its
 * four corners rounded by `cr` (half its width: its ends half round). Points [x, z], counter-clockwise seen from above.
 */
function t_arcBand(cz, r0, r1, a0, a1, cr, n = 48, ends = 8) {
	const h = (r1 - r0) / 2;
	cr = Math.min(cr ?? h, h);
	const P = (r, a) => [r * Math.sin(a), cz + r * Math.cos(a)];
	const d1 = cr / (r1 - cr), d0 = cr / (r0 + cr);
	const pts = [];
	/** a quarter round centred at radius rc, angle ac, from direction (p, q) to (p2, q2) in (radial, tangent) */
	const corner = (rc, ac, from, to) => {
		const C = P(rc, ac), R = [Math.sin(ac), Math.cos(ac)], T = [Math.cos(ac), -Math.sin(ac)];
		for (let i = 1; i < ends; i++) {
			const t = (i / ends) * (Math.PI / 2), c = Math.cos(t), s = Math.sin(t);
			const dr = from[0] * c + to[0] * s, dt = from[1] * c + to[1] * s;
			pts.push([C[0] + cr * (dr * R[0] + dt * T[0]), C[1] + cr * (dr * R[1] + dt * T[1])]);
		}
	};
	for (let i = 0; i <= n; i++) pts.push(P(r1, lerp(a0 + d1, a1 - d1, i / n)));
	corner(r1 - cr, a1 - d1, [1, 0], [0, 1]);
	pts.push(P(r1 - cr, a1 - d1 + cr / (r1 - cr)));
	if (cr < h - 1e-4) pts.push(P(r0 + cr, a1 - d0 + cr / (r0 + cr)));
	corner(r0 + cr, a1 - d0, [0, 1], [-1, 0]);
	for (let i = n; i >= 0; i--) pts.push(P(r0, lerp(a0 + d0, a1 - d0, i / n)));
	corner(r0 + cr, a0 + d0, [-1, 0], [0, -1]);
	pts.push(P(r0 + cr, a0 + d0 - cr / (r0 + cr)));
	if (cr < h - 1e-4) pts.push(P(r1 - cr, a0 + d1 - cr / (r1 - cr)));
	corner(r1 - cr, a0 + d1, [0, -1], [1, 0]);
	// drop points that fall on one another
	return pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5; });
}

/** UVs in metres laid round [0, cz]: tops by (along the arc, across), faces by (along, up) or (up, along) for `upright` grain */
function t_arcUV(geo, cz, tile = TILE.oak, upright = false) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const pos = g.attributes.position;
	const uv = new Float32Array(pos.count * 2);
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
	const sg = cz < 0 ? 1 : -1;
	for (let i = 0; i < pos.count; i += 3) {
		a.fromBufferAttribute(pos, i);
		b.fromBufferAttribute(pos, i + 1);
		c.fromBufferAttribute(pos, i + 2);
		n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
		const m = a.clone().add(b).add(c).divideScalar(3);
		const rad = new THREE.Vector3(m.x, 0, m.z - cz).normalize();
		const flat = Math.abs(n.y) > 0.7;
		const side = Math.abs(n.dot(rad)) >= Math.abs(n.x * rad.z - n.z * rad.x);
		for (let k = 0; k < 3; k++) {
			const p = [a, b, c][k];
			const r = Math.hypot(p.x, p.z - cz), s = Math.atan2(p.x * sg, (p.z - cz) * sg) * Math.abs(cz);
			let u, v;
			if (flat) (u = s), (v = r);
			else if (side) (u = upright ? p.y : s), (v = upright ? s : p.y);
			else (u = upright ? p.y : r), (v = upright ? r : p.y);
			uv[(i + k) * 2] = u / tile;
			uv[(i + k) * 2 + 1] = v / tile;
		}
	}
	g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	return g;
}

/** a bag that keeps each material in one mesh (a thing is small: no chunks) */
function t_bag(name) {
	const b = new Bag(name);
	const add = b.add.bind(b);
	b.add = (m, g, mx, o = {}) => add(m, g, mx, { chunk: false, ...o });
	return b;
}

/** a geometry's UVs moved by (du, dv): each board of a glued-up top cut from another part of the tree */
function t_shiftUV(geo, du, dv) {
	const uv = geo.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
	return geo;
}

/**
 * A through-tenon's end showing on a top `top(x, z)` at [x, z]: a disc of end grain (darker), Ø 2·r, laid on the
 * surface's slope a hair above it, and the wedge driven across it (turned `ry`).
 */
function t_tenonEnd(bag, x, z, top, r, ry = 0) {
	const e = 0.002, y = top(x, z);
	const n = new THREE.Vector3(-(top(x + e, z) - top(x - e, z)) / (2 * e), 1, -(top(x, z + e) - top(x, z - e)) / (2 * e)).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry));
	const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.0005, z), q, new THREE.Vector3(1, 1, 1));
	const disc = t_tint(scaleUV(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), 0.1, 0.1), [0.74, 0.64, 0.54]);
	bag.add('oak', disc, m, { colour: true });
	bag.add('shadow', new THREE.BoxGeometry(2 * r * 0.92, 0.0008, 0.0011), m);
}

/**
 * A glued-up top: a geometry (UVs laid, grain along x) cut into boards `w` wide side by side across z, each board a
 * shade of its own and its grain from another part of the tree (vertex colours: add it with { colour: true }).
 */
function t_boards(geo, w, seed) {
	const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2);
	geo.applyMatrix4(turn);
	const g = t_split(geo, w);
	g.applyMatrix4(turn.clone().invert());
	const pos = g.attributes.position, uv = g.attributes.uv;
	const col = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i += 3) {
		const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
		const k = Math.floor(-z / w);
		const tone = 0.9 + 0.14 * hash2(k, 1, seed), warm = 0.97 + 0.05 * hash2(k, 2, seed);
		const du = hash2(k, 3, seed) * 7, dv = hash2(k, 4, seed) * 5;
		for (let j = i; j < i + 3; j++) {
			col.set([tone * warm, tone, tone * (2 - warm)], j * 3);
			uv.setXY(j, uv.getX(j) + du, uv.getY(j) + dv);
		}
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	return g;
}

/** a geometry given one colour (linear [r, g, b]) in every vertex, for a material drawn with vertex colours */
function t_tint(geo, c) {
	const n = geo.attributes.position.count;
	const a = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) a.set(c, i * 3);
	geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
	return geo;
}

/* ---- books: cloth and leather bound, paperbacks, their pages ---- */

/** book cloth (a fine weave) and leather, each coloured book by book; the pages' block, its leaves in fine lines */
material('tb-cloth', 0.06, () => {
	const s = shared('linen', () => weave(81, 40));
	return new THREE.MeshStandardMaterial({ color: '#ffffff', normalMap: s.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.86 });
});
material('tb-leather', 1, () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: false, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 }));
material('tb-card', 1, () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
material('tb-pages', 0.05, () => {
	const s = surface({
		px: 256,
		py: 8,
		maps: ['map'],
		paint: (u, v, o) => {
			const i = Math.floor(u * 256);
			const leaf = hash2(i, 0, 401), sig = hash2(Math.floor(u * 17), 0, 403);
			const fold = Math.abs(((u * 17) % 1) - 0.5) > 0.47 ? 0.86 : 1;
			o.c = scalec(lin('#efe6d2'), (0.93 + 0.07 * leaf) * (0.97 + 0.05 * sig) * fold);
		}
	});
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, roughness: 0.92 });
});
const t_CLOTH = ['#b8a888', '#a39478', '#8f9a7f', '#6f7d6a', '#9c5a3c', '#7b3f2e', '#b98a4e', '#3d4a5c', '#566577', '#34363a', '#d8cfbd', '#a87f6c', '#4d5a43', '#857560', '#6d4c3d', '#c4b59a', '#2e3b4a', '#8c3b2f'];
const t_LEATHER = ['#7a4a2a', '#5a3420', '#6b2a22', '#9a6a3f', '#3e2a1e'];

/**
 * A book standing on its foot, its spine toward +z, its thickness `t` along x, height `h`, depth `d` (m), its origin
 * the middle of its foot: hardbound (boards, a rounded spine, the pages' block set in) in cloth or leather, or a
 * paperback (one block, its cover wrapped round). `kind` 'cloth' | 'leather' | 'paper'; `c` its colour (#hex).
 */
function t_book(bag, { t, h, d, kind = 'cloth', c = '#c2b49a', label = false, bands = false }, m) {
	const colour = lin(c);
	const put = (name, g, tint) => {
		if (tint) t_tint(g, tint);
		g.applyMatrix4(m);
		bag.add(name, g, null, tint ? { colour: true } : {});
	};
	if (kind === 'paper') {
		const g = boxUV(new THREE.BoxGeometry(t, h, d), TILE['tb-pages']);
		g.translate(0, h / 2, 0);
		// the cover on the spine and both sides; the pages at the head, the foot and the fore-edge
		const cols = new Float32Array(g.attributes.position.count * 3), nor = g.attributes.normal;
		const paper = lin('#efe6d2');
		for (let i = 0; i < nor.count; i++) cols.set(Math.abs(nor.getY(i)) > 0.5 || nor.getZ(i) < -0.5 ? paper : colour, i * 3);
		g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
		g.applyMatrix4(m);
		bag.add('tb-card', g, null, { colour: true });
		return;
	}
	const cover = kind === 'leather' ? 'tb-leather' : 'tb-cloth';
	const b = 0.0025, back = 0.004;
	for (const s of [-1, 1]) put(cover, boxUV(new THREE.BoxGeometry(b, h, d - back), TILE[cover]).translate(s * (t / 2 - b / 2), h / 2, -back / 2), colour);
	const bulge = Math.min(0.007, t * 0.3);
	const spine = new THREE.CylinderGeometry(t / 2, t / 2, h, 10, 1, false, -Math.PI / 2, Math.PI);
	spine.scale(1, 1, bulge / (t / 2));
	scaleUV(spine, (Math.PI * t) / 2 / TILE[cover], h / TILE[cover]);
	put(cover, spine.translate(0, h / 2, d / 2 - back), colour);
	put('tb-pages', boxUV(new THREE.BoxGeometry(t - 2 * b + 0.0004, h - 0.006, d - back - 0.003), TILE['tb-pages']).translate(0, h / 2, -back / 2 + 0.0015));
	const front = d / 2 - back + bulge;
	if (label) put(cover, new THREE.BoxGeometry(t * 0.55, Math.min(0.05, h * 0.16), 0.0012).translate(0, h * 0.72, front), lin(label));
	if (bands) for (const y of [0.09, 0.13, 0.87, 0.91]) put('brass', new THREE.BoxGeometry(t * 0.8, 0.0025, 0.001).translate(0, h * y, front - 0.0002));
}

const THING = {
	id: 'bench-oak-curved',
	label: 'Curved oak bench',
	note: 'A curved bench of solid oak, 1.8 m along its arc (radius 2.2 m), seat 0.45 m high and 0.4 m deep with eased edges, on two waisted panel legs with wedged through-tenons.'
};

const t_R = 2.2, t_HALF = 0.9 / 2.2, t_TOP = 0.45, t_SEAT_T = 0.055, t_DEPTH = 0.4;

/** a leg's outline across the seat (u along the radius, y up): waisted, flaring to two feet with an arch between */
function t_legOutline(top) {
	const hw = (y) => {
		const t = y / top;
		return 0.15 - 0.03 * Math.sin(Math.PI * Math.pow(t, 0.8)) + 0.012 * span(0.18 - y, 0, 0.18);
	};
	const pts = [[-hw(0), 0], [-0.085, 0]];
	for (let i = 1; i < 12; i++) {
		const a = Math.PI - (i / 12) * Math.PI;
		pts.push([0.085 * Math.cos(a), 0.075 * Math.sin(a)]);
	}
	pts.push([0.085, 0], [hw(0), 0]);
	for (let i = 1; i <= 14; i++) pts.push([hw((i / 14) * top), (i / 14) * top]);
	for (let i = 14; i >= 1; i--) pts.push([-hw((i / 14) * top), (i / 14) * top]);
	return pts;
}

function thingBuild() {
	const bag = t_bag(THING.id);
	const cz = t_R, bev = 0.014;
	// the seat: a plate of the arc band, its edges eased, its grain along the arc
	const r0 = t_R - t_DEPTH / 2 + bev, r1 = t_R + t_DEPTH / 2 - bev, d = bev / t_R;
	const plan = t_arcBand(cz, r0, r1, Math.PI - t_HALF + d, Math.PI + t_HALF - d, 0.07, 64, 8);
	const seat = t_plate(plan, t_SEAT_T, bev, 4, 24);
	seat.translate(0, t_TOP - t_SEAT_T, 0);
	bag.add('oak', t_arcUV(seat, cz));
	// the two legs, set across the seat 0.6 m out from its middle, their tops into it
	const legTop = t_TOP - t_SEAT_T + 0.01;
	for (const s of [-1, 1]) {
		const a = Math.PI + s * (0.6 / t_R);
		const leg = t_panel(t_legOutline(legTop - 0.016), 0.045, 0.008, 3, 12);
		leg.translate(0, 0.008, -0.0225);
		const g = t_grain(leg, 'y');
		const [x, z] = [t_R * Math.sin(a), cz + t_R * Math.cos(a)];
		bag.add('oak', g, at(x, 0, z, a - Math.PI / 2));
		// the through-tenons' end grain on top of the seat and the wedges driven into them
		for (const u of [-0.09, 0.09]) {
			const p = [x + u * Math.sin(a), z + u * Math.cos(a)];
			const end = t_tint(boxUV(new THREE.BoxGeometry(0.07, 0.0016, 0.03), TILE.oak), [0.72, 0.62, 0.52]);
			bag.add('oak', end, at(p[0], t_TOP - 0.0006, p[1], a - Math.PI / 2), { colour: true });
			bag.add('shadow', new THREE.BoxGeometry(0.06, 0.0018, 0.003), at(p[0], t_TOP - 0.0004, p[1], a - Math.PI / 2));
		}
	}
	const group = bag.build();
	// its plan's middle at the origin
	const box = new THREE.Box3().setFromObject(group);
	const mz = (box.min.z + box.max.z) / 2;
	for (const m of group.children) m.geometry.translate(0, 0, -mz);
	return group;
}
