/*
 * BOOKCASE-OAK — a freestanding solid oak bookcase filled with books, for the dome's library and living rooms.
 * Real measures: 1.2 m wide, 2.2 m high, 35 cm deep (bookcases run 30–40 cm deep: a novel is 13–15 cm, an art book up
 * to 30); sides and top 40 mm of solid oak mitred at the top into one frame rounded at its corners (16 cm outside, 12
 * inside); a recessed plinth 8 cm; five openings 39 cm high (a tall hardback is 24–32 cm); shelves 28 mm, housed;
 * a back of vertical boards. On the shelves ≈ 150 books: hardbacks in cloth and leather (boards 2.5 mm, rounded spines
 * standing 3 mm proud), paperbacks, 14–33 cm tall, 1.5–5 cm thick, some leaning at the end of a row, a few lying in
 * stacks, gaps where a book is out; a stoneware vase of dried grasses and a small framed print in an oak frame.
 * Made of: the frame a plate of its outline (eased 10 mm) with its grain mitred at the corners, shelves and boards
 * rounded boxes, books of boards, spines and their block of pages, the vase turned, the print's picture cut shapes.
 * Anchor: the middle of its foot on the floor (y 0), its front toward +z, its back at z −0.175.
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
	id: 'bookcase-oak',
	label: 'Oak bookcase',
	note: 'A freestanding solid oak bookcase 1.2 × 2.2 m and 0.35 m deep, its frame rounded at the top, five shelves of books (upright, leaning and stacked), a stoneware vase and a small framed print.'
};

const t_W = 1.2, t_H = 2.2, t_D = 0.35, t_SIDE = 0.04, t_SHELF = 0.028, t_FLOOR = 0.11;
const t_IN = t_W / 2 - t_SIDE, t_INTOP = t_H - 0.04;
/** the height of each opening: five between the bottom board and the top */
const t_OPEN = (t_INTOP - t_FLOOR - 4 * t_SHELF) / 5;
/** the front of the books' spines (they stand 2–3 cm back from the shelves' edge) */
const t_SPINES = t_D / 2 - 0.035;

/** a rounded corner's points: centre [cx, cy], radius r, from angle a0 to a1 */
function t_arc(cx, cy, r, a0, a1, n = 10) {
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = lerp(a0, a1, i / n);
		pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
	}
	return pts;
}

/** the frame's outline: sides and top in one, an arch of rounded corners over the opening (shrunk by the bevel `b`) */
function t_frame(b) {
	const ro = 0.16 - b, ri = 0.12 + b, x0 = t_W / 2 - b, x1 = t_IN + b, y0 = t_H - b, y1 = t_INTOP + b;
	return [
		[-x0, b],
		[-x1, b],
		...t_arc(-x1 + ri, y1 - ri, ri, Math.PI, Math.PI / 2),
		...t_arc(x1 - ri, y1 - ri, ri, Math.PI / 2, 0),
		[x1, b],
		[x0, b],
		...t_arc(x0 - ro, y0 - ro, ro, 0, Math.PI / 2),
		...t_arc(-x0 + ro, y0 - ro, ro, Math.PI / 2, Math.PI)
	];
}

/** a stoneware vase of dried grasses, standing at the origin */
function t_vase(bag, m) {
	const prof = [[0, 0], [0.045, 0], [0.05, 0.004], [0.062, 0.03], [0.072, 0.07], [0.07, 0.11], [0.058, 0.145], [0.036, 0.17], [0.026, 0.185], [0.025, 0.2], [0.029, 0.208], [0.031, 0.212], [0.028, 0.214], [0.022, 0.21], [0.021, 0.19], [0.018, 0.17], [0, 0.17]];
	bag.add('tb-stoneware', t_turn(prof, 40, 0.5), m);
	const r = chance(THING.id, 'grass');
	for (let i = 0; i < 7; i++) {
		const a = r() * TAU, lean = between(r, 0.05, 0.3), len = between(r, 0.2, 0.32);
		const pts = [];
		for (let k = 0; k <= 6; k++) {
			const t = k / 6;
			pts.push([Math.sin(a) * (0.004 + lean * len * t * t), 0.15 + len * t, Math.cos(a) * (0.004 + lean * len * t * t)]);
		}
		bag.add('tb-straw', tube(pts, 0.0013, 5, false, 1, 8), m);
		// a seed head of oat grass: a few spikelets hanging from the top
		const top = pts[6];
		for (let k = 0; k < 6; k++) {
			const b = a + (k - 2.5) * 0.5, dy = -0.008 - k * 0.006;
			const g = new THREE.SphereGeometry(0.0035, 6, 4).scale(1, 2.6, 1);
			bag.add('tb-straw', g, new THREE.Matrix4().multiplyMatrices(m, at(top[0] + Math.sin(b) * 0.01, top[1] + dy, top[2] + Math.cos(b) * 0.01, 0, 1, Math.cos(b) * 0.5, -Math.sin(b) * 0.5)));
		}
	}
}
material('tb-stoneware', 1, () => new THREE.MeshPhysicalMaterial({ color: '#cfc2ac', roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: INDOOR }));
material('tb-straw', 1, () => new THREE.MeshStandardMaterial({ color: '#c9b384', roughness: 0.8 }));
material('tb-ink-rust', 1, () => new THREE.MeshStandardMaterial({ color: '#b26a45', roughness: 0.95 }));
material('tb-ink-ochre', 1, () => new THREE.MeshStandardMaterial({ color: '#d9a85a', roughness: 0.95 }));
material('tb-ink-sage', 1, () => new THREE.MeshStandardMaterial({ color: '#8d9a7c', roughness: 0.95 }));

/** a small framed print standing at the origin, its back leaning on what is behind */
function t_print(bag, m) {
	const w = 0.25, h = 0.32, f = 0.022, depth = 0.02;
	const frame = t_panel(roundRect(w, h, 0.003, 1), depth, 0.003, 2, 2, [roundRect(w - 2 * f, h - 2 * f, 0.001, 1).reverse()]);
	frame.translate(0, h / 2, -depth / 2);
	bag.add('oak', t_grain(frame, 'x'), m);
	// the mount, its window, and the picture: an arch and a sun over hills
	const mw = w - 2 * f + 0.004, mh = h - 2 * f + 0.004;
	bag.add('linen', boxUV(new THREE.BoxGeometry(mw, mh, 0.002), TILE.linen).translate(0, h / 2, 0.001), m);
	const pw = 0.13, ph = 0.17, py = h / 2 + 0.006;
	bag.add('tb-paper', new THREE.BoxGeometry(pw, ph, 0.001).translate(0, py, 0.0024), m);
	const hill = [[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, -ph / 2 + 0.05]];
	for (let i = 0; i <= 16; i++) { const t = 1 - i / 16; hill.push([lerp(-pw / 2, pw / 2, t), -ph / 2 + 0.03 + 0.03 * Math.sin(t * Math.PI * 1.3 + 0.4)]); }
	bag.add('tb-ink-sage', new THREE.ShapeGeometry(shapeOf(hill), 4).translate(0, py, 0.0032), m);
	const arch = [[-0.035, -0.04], [0.035, -0.04], ...t_arc(0, 0.005, 0.035, 0, Math.PI, 14)];
	bag.add('tb-ink-rust', new THREE.ShapeGeometry(shapeOf(arch), 4).translate(0, py, 0.0029), m);
	bag.add('tb-ink-ochre', new THREE.CircleGeometry(0.016, 24).translate(0.03, py + 0.05, 0.0029), m);
}
/** the print's paper */
material('tb-paper', 1, () => new THREE.MeshStandardMaterial({ color: '#f1eadb', roughness: 0.92 }));

/** a book's measures by chance: its height from the shelf's range, its depth and thickness to match, cloth, leather or paper */
function t_pickBook(r, lo, hi) {
	const h = between(r, lo, hi);
	const kind = r() < 0.16 ? 'leather' : r() < 0.3 ? 'paper' : 'cloth';
	const t = kind === 'paper' ? between(r, 0.014, 0.032) : between(r, 0.018, 0.05) * (r() < 0.15 ? 1.3 : 1);
	const d = clamp(h * between(r, 0.62, 0.78), 0.11, 0.27);
	const c = kind === 'leather' ? t_LEATHER[Math.floor(r() * t_LEATHER.length)] : t_CLOTH[Math.floor(r() * t_CLOTH.length)];
	const label = kind === 'cloth' && r() < 0.22 ? (r() < 0.5 ? '#d9cfbb' : '#2a2a2a') : false;
	return { t, h, d, kind, c, label, bands: kind === 'leather' && r() < 0.8 };
}

/** books standing in a row from x0 to x1 on the floor at y; the last one leaning on the others when `lean` */
function t_row(bag, r, x0, x1, y, lo, hi, lean) {
	let x = x0, last = null;
	for (;;) {
		const b = t_pickBook(r, lo, hi);
		if (x + b.t > x1) break;
		const z = t_SPINES - b.d / 2 - r() * 0.012;
		t_book(bag, b, at(x + b.t / 2, y, z));
		last = { x: x + b.t, h: b.h };
		x += b.t + 0.0006 + r() * 0.001;
	}
	if (lean && last) {
		const b = t_pickBook(r, lo, hi);
		const a = between(r, 0.14, 0.32);
		const px = last.x + 0.001 + (last.h < b.h * Math.cos(a) ? last.h * Math.tan(a) : b.h * Math.sin(a));
		const z = t_SPINES - b.d / 2 - r() * 0.01;
		t_book(bag, b, at(px, y, z).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(b.t / 2, 0, 0)));
		x = px + b.t * Math.cos(a);
	}
	return x;
}

/** a stack of books lying on their backs, the biggest below, centred at x on the floor at y; its top's height */
function t_stack(bag, r, x, y, n, lo, hi) {
	const books = Array.from({ length: n }, () => t_pickBook(r, lo, hi)).sort((a, b) => b.h - a.h);
	for (const b of books) {
		if (b.kind === 'paper') b.kind = 'cloth';
		const m = at(x + (r() - 0.5) * 0.015, y + b.t / 2, t_SPINES - b.d / 2 - r() * 0.01, (r() - 0.5) * 0.12).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -b.h / 2, 0));
		t_book(bag, b, m);
		y += b.t;
	}
	return y;
}

function thingBuild() {
	const bag = t_bag(THING.id);
	const b = 0.016;
	// the frame: sides and top, mitred at the top corners (the grain turns along the mitre), their edges bullnosed
	const frame = t_panel(t_frame(b), t_D, b, 4, 12);
	frame.translate(0, 0, -t_D / 2);
	const mitre = (x, y) => (y - (t_H - 0.2) > Math.abs(x) - (t_W / 2 - 0.2) ? 'x' : 'y');
	bag.add('oak', t_grainBy(frame, (x, y) => mitre(x, y)));
	// the back: vertical boards, tongued and grooved, set in a rebate
	const backZ = -t_D / 2 + 0.012;
	const back = t_panel([[-t_IN - 0.006, t_FLOOR - 0.03], [t_IN + 0.006, t_FLOOR - 0.03], ...t_arc(t_IN - 0.12, t_INTOP - 0.12, 0.126, 0, Math.PI / 2), ...t_arc(-t_IN + 0.12, t_INTOP - 0.12, 0.126, Math.PI / 2, Math.PI)], 0.012, 0, 1, 10);
	back.translate(0, 0, backZ - 0.012);
	bag.add('oak', t_grain(back, 'y'));
	for (let i = 1; i < 8; i++) {
		const x = -t_IN + (i * 2 * t_IN) / 8;
		const top = Math.abs(x) > t_IN - 0.12 ? t_INTOP - 0.12 + Math.sqrt(Math.max(0, 0.12 ** 2 - (Math.abs(x) - (t_IN - 0.12)) ** 2)) : t_INTOP;
		bag.add('shadow', new THREE.BoxGeometry(0.0025, top - t_FLOOR + 0.02, 0.001).translate(x, (top + t_FLOOR - 0.02) / 2, backZ + 0.0005));
	}
	// the bottom board, the recessed plinth below it, and four shelves
	const shelfD = backZ - (t_D / 2 - 0.008);
	const shelf = (y0) => bag.add('oak', t_grain(rbox(2 * t_IN + 0.006, t_SHELF, -shelfD, 0.01, 2), 'x'), at(0, y0 + t_SHELF / 2, (backZ + t_D / 2 - 0.008) / 2));
	shelf(t_FLOOR - t_SHELF);
	bag.add('oak', t_grain(rbox(2 * t_IN + 0.006, t_FLOOR - t_SHELF + 0.001, 0.02, 0.004, 2), 'x'), at(0, (t_FLOOR - t_SHELF + 0.001) / 2, t_D / 2 - 0.045));
	const floors = [];
	for (let k = 0; k < 5; k++) floors.push(t_FLOOR + k * (t_OPEN + t_SHELF));
	for (let k = 1; k < 5; k++) shelf(floors[k] - t_SHELF);
	// the books, opening by opening, from the bottom: what stands where
	const r = chance(THING.id, 'shelves');
	const L = -t_IN + 0.004, R = t_IN - 0.004;
	let x;
	// 0: tall art books, a stack of folios
	x = t_row(bag, r, L, -0.08, floors[0], 0.27, 0.335, true);
	t_stack(bag, r, x + 0.17, floors[0], 3, 0.29, 0.34);
	t_row(bag, r, x + 0.34, R, floors[0], 0.25, 0.32, false);
	// 1: a long run of hardbacks, a gap where two are out, more
	x = t_row(bag, r, L, 0.18, floors[1], 0.2, 0.26, false);
	t_row(bag, r, x + 0.055, R, floors[1], 0.19, 0.25, false);
	// 2: novels, the vase in a gap, a few leaning
	x = t_row(bag, r, L, -0.02, floors[2], 0.18, 0.24, true);
	t_vase(bag, at(x + 0.12, floors[2], 0.0, 0.4));
	x = t_row(bag, r, x + 0.22, R, floors[2], 0.19, 0.25, false);
	// 3: the print leaning on the back, a little stack, books
	t_print(bag, at(L + 0.15, floors[3], backZ + 0.05, 0, 1, -0.12));
	t_stack(bag, r, L + 0.15, floors[3], 2, 0.2, 0.24);
	x = t_row(bag, r, L + 0.33, R - 0.42, floors[3], 0.18, 0.25, true);
	t_stack(bag, r, R - 0.13, floors[3], 4, 0.19, 0.25);
	// 4: under the top's arch: shorter books, a stack, a gap
	x = t_row(bag, r, L + 0.03, 0.06, floors[4], 0.17, 0.27, true);
	t_stack(bag, r, x + 0.14, floors[4], 3, 0.2, 0.25);
	t_row(bag, r, x + 0.3, R - 0.04, floors[4], 0.17, 0.25, false);
	return bag.build();
}
