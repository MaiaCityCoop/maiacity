/*
 * WORKBENCH-OAK — a joiner's oak workbench against a wall, a pegboard of tools behind it, for the dome's workshop.
 * Real measures: a top 2.0 × 0.8 m, 90 cm high (joiners work at 85–95, about the wrist of a standing person), the top
 * laminated of eleven oak strips 73 × 75 mm (a heavy top that does not move under the plane), round dog holes Ø 20
 * every 12 cm; legs 85 mm square, rails 65 × 35, a slatted shelf at 22 cm; a face vice at the front left: an oak chop
 * 40 × 20 × 7 cm on a steel screw Ø 30 mm and two guide bars, a tommy bar through its hub. On it: a wooden smoothing
 * plane (24 cm), a mallet, six chisels (6–25 mm) hanging in a stand, shavings, a board held in the vice; on the shelf
 * two oak crates and offcuts. Behind it, on the wall: a pegboard of oak-faced ply 1.8 × 0.9 m, holes Ø 8 mm at 50
 * mm, oak pegs; a saw, a square, a hammer, two screwdrivers, a coping saw, a hank of twine, a small shelf of jars.
 * Made of: strips, legs and rails as rounded boxes with their grain along them, tools turned, cut and bent; oiled oak,
 * steel, cast iron (bronze) and brass.
 * Anchor: the middle of its foot on the floor (y 0); a wall piece: its back (the pegboard's) against z 0, out toward +z.
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
	id: 'workbench-oak',
	label: 'Oak workbench',
	note: "A joiner's oak workbench 2.0 × 0.8 m and 0.9 m high with a laminated top, a face vice and a shelf of crates and offcuts, tools on it, and a pegboard of tools on the wall behind it."
};

const t_TOP = 0.9, t_T = 0.075, t_Z0 = 0.05, t_DEP = 0.8, t_LEN = 2.0;
material('tb-steel', 1, () => new THREE.MeshStandardMaterial({ color: '#c4c5c2', metalness: 0.65, roughness: 0.36 }));
material('tb-iron', 1, () => new THREE.MeshStandardMaterial({ color: '#3a3b3d', metalness: 0.7, roughness: 0.5 }));
// a shaving is thin enough to see both its faces
material('tb-shaving', TILE.oak, () => {
	const m = mat('oak').clone();
	m.side = THREE.DoubleSide;
	m.color = new THREE.Color('#f3e2c6');
	return m;
});
// the pegboard: hardboard painted a soft sage, matt
material('tb-pegboard', 1, () => new THREE.MeshStandardMaterial({ color: '#c3cab6', roughness: 0.82, envMapIntensity: INDOOR }));
material('tb-twine', 1, () => new THREE.MeshStandardMaterial({ color: '#c7ae83', roughness: 0.95 }));

/** an oak part as a rounded box with its grain along `axis`, its middle at [x, y, z] */
function t_part(bag, w, h, d, r, axis, x, y, z, ry = 0, colour) {
	// each part from its own board: its grain shifted by chance
	const k = hashText(`${w}|${h}|${d}|${x}|${y}|${z}`);
	const g = t_shiftUV(t_grain(rbox(w, h, d, r, 2), axis), (k % 997) / 97, ((k >> 10) % 991) / 89);
	if (colour) t_tint(g, colour);
	bag.add('oak', g, at(x, y, z, ry), colour ? { colour: true } : {});
}

/** a chisel hanging blade down, its bolster at the origin: a turned handle with a brass ferrule, a steel blade */
function t_chisel(bag, m, width) {
	bag.add('oak', t_turn([[0, 0.012], [0.011, 0.012], [0.012, 0.02], [0.014, 0.06], [0.015, 0.095], [0.013, 0.108], [0.009, 0.113], [0, 0.114]], 16), m);
	bag.add('brass', t_turn([[0.0105, 0], [0.0115, 0.002], [0.0115, 0.014], [0.0105, 0.016]], 16, 1), m);
	bag.add('tb-steel', new THREE.CylinderGeometry(0.006, 0.0075, 0.02, 10).translate(0, -0.008, 0), m);
	const blade = t_panel([[-width / 2, -0.13], [width / 2, -0.13], [width / 2 - 0.0005, -0.02], [-width / 2 + 0.0005, -0.02]], 0.0045, 0.0006, 1, 1);
	blade.translate(0, 0, -0.00225);
	bag.add('tb-steel', blade, m);
}

/** a wooden smoothing plane standing on its sole, its toe toward +x: a coffin-shaped body, its throat, wedge, iron and horn */
function t_plane(bag, m) {
	// the body in plan: coffin-shaped (widest at the throat), 24 cm long, 6.5 cm wide, 6 cm high, every edge eased
	const plan = (a) => {
		const c = Math.cos(a), sn = Math.sin(a);
		const x = 0.12 * Math.sign(c) * Math.pow(Math.abs(c), 0.35);
		const w = 0.0325 * (1 - 0.32 * Math.pow(Math.abs(x + 0.01) / 0.13, 2));
		return [x, w * Math.sign(sn) * Math.pow(Math.abs(sn), 0.35)];
	};
	const body = t_slab({ edge: plan, top: (x) => 0.052 + 0.008 * Math.cos((x / 0.12) * (Math.PI / 2)), bottom: () => 0, r: 0.008, rb: 0.003, n: 64, rings: 3, round: 3 });
	bag.add('oak', t_grain(body, 'x'), m);
	// the throat: a dark slot across the top where the shavings come out
	bag.add('shadow', new THREE.BoxGeometry(0.03, 0.002, 0.038).translate(0.012, 0.06, 0), m);
	// the iron and the wedge holding it, bedded at 45° and standing out of the throat
	const tilt = new THREE.Matrix4().multiplyMatrices(m, at(0.0, 0.04, 0, 0, 1, 0, Math.PI / 4));
	bag.add('tb-steel', rbox(0.004, 0.09, 0.044, 0.0015, 1).translate(0.002, 0.04, 0), tilt);
	bag.add('oak', t_grain(rbox(0.014, 0.085, 0.036, 0.004, 2), 'y').translate(-0.007, 0.042, 0), tilt);
	// the horn at the toe
	bag.add('oak', t_turn([[0, 0], [0.014, 0], [0.016, 0.012], [0.018, 0.026], [0.015, 0.036], [0, 0.04]], 16), new THREE.Matrix4().multiplyMatrices(m, at(0.075, 0.056, 0)));
}

/** a carpenter's mallet lying on its cheek: a beech-like oak head, a handle through it */
function t_mallet(bag, m) {
	const head = t_panel([[-0.065, -0.03], [0.065, -0.034], [0.063, 0.034], [-0.063, 0.03]], 0.06, 0.006, 2, 2);
	head.translate(0, 0, -0.03);
	bag.add('oak', t_grain(head, 'x'), new THREE.Matrix4().multiplyMatrices(m, at(0, 0.03, 0, 0, 1, Math.PI / 2)));
	const handle = t_turn([[0, 0], [0.014, 0], [0.016, 0.01], [0.015, 0.12], [0.012, 0.2], [0.013, 0.28], [0, 0.285]], 14);
	bag.add('oak', handle, new THREE.Matrix4().multiplyMatrices(m, at(0, 0.03, -0.04, 0, 1, Math.PI / 2 + 0.03)));
}

/** a shaving: a thin ribbon of oak curling up on itself */
function t_shaving(bag, m, len, w) {
	const pos = [], idx = [], uv = [];
	const n = 40;
	for (let i = 0; i <= n; i++) {
		const t = i / n, a = t * len * 7, rr = 0.03 * (1 - 0.55 * t);
		const y = rr * (1 - Math.cos(a)), z = rr * Math.sin(a) + t * 0.02;
		for (const s of [0, 1]) {
			pos.push(s * w + t * 0.01, y, z);
			uv.push((t * len) / TILE.oak, (s * w) / TILE.oak);
		}
		if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	bag.add('tb-shaving', g, m);
}

/** the pegboard on the wall and what hangs on it */
function t_pegboard(bag) {
	const W = 1.8, H = 0.9, y0 = 1.02, zb = 0.02, T = 0.006, zf = zb + T;
	// two battens behind it, the board (painted hardboard 6 mm), its holes Ø 6 mm every 25 mm
	for (const y of [y0 + 0.1, y0 + H - 0.1]) t_part(bag, W - 0.1, 0.06, zb, 0.004, 'x', 0, y, zb / 2);
	bag.add('tb-pegboard', rbox(W, H, T, 0.0025, 2), at(0, y0 + H / 2, zb + T / 2));
	const hole = new THREE.CircleGeometry(0.003, 6);
	const pegs = new Set();
	const peg = (i, j) => pegs.add(`${i},${j}`);
	// where the pegs stand (columns 0–35 at 50 mm from the left, rows 0–17 from the bottom)
	[[3, 15], [8, 15], [12, 13], [14, 13], [17, 15], [18, 15], [22, 14], [23, 14], [24, 14], [23, 7], [26, 7], [27, 15], [31, 12], [5, 8], [10, 7], [16, 9], [17, 9], [31, 6]].forEach(([i, j]) => peg(i, j));
	const P = (i, j) => [-W / 2 + 0.025 + i * 0.05, y0 + 0.025 + j * 0.05];
	for (let i = 0; i < 71; i++)
		for (let j = 0; j < 35; j++) {
			const x = -W / 2 + 0.025 + i * 0.025, y = y0 + 0.025 + j * 0.025;
			// a steel hook in the holes the tools hang from (the 50 mm grid's), every other hole open
			if (i % 2 === 0 && j % 2 === 0 && pegs.has(`${i / 2},${j / 2}`)) {
				bag.add('tb-steel', tube([[x, y, zf - 0.004], [x, y + 0.001, zf + 0.04], [x, y + 0.006, zf + 0.055], [x, y + 0.016, zf + 0.058]], 0.0024, 6, false, 1, 10));
				bag.add('tb-steel', new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10).rotateX(Math.PI / 2), at(x, y, zf + 0.0015));
			} else bag.add('shadow', hole.clone(), at(x, y, zf + 0.0006));
		}
	const out = (i, j, dz = 0) => { const [x, y] = P(i, j); return [x, y, zf + dz]; };
	// a panel saw hanging from two pegs by its handle: a steel blade, an oak handle with a grip cut through it
	{
		const [x, y] = P(3, 15);
		const blade = t_panel([[0, 0], [0.5, -0.02], [0.5, 0.06], [0, 0.13]], 0.0009, 0, 1, 1);
		bag.add('tb-steel', blade, at(x + 0.03, y - 0.05, zf + 0.012, 0, 1, 0, -Math.PI / 2));
		const grip = [[-0.06, -0.07], [0.06, -0.07], [0.07, 0.07], [-0.05, 0.08]];
		const hole2 = roundRect(0.03, 0.08, 0.014, 4).map(([a, b]) => [a + 0.005, b + 0.005]);
		const handle = t_panel(grip.map(([a, b]) => [a, b]), 0.022, 0.006, 2, 6, [hole2]);
		handle.translate(0, 0, -0.011);
		bag.add('oak', t_grain(handle, 'y'), at(x + 0.02, y - 0.02, zf + 0.012, 0, 1, 0, -0.05));
	}
	// a try square: a steel blade riveted into an oak stock
	{
		const [x, y] = P(12, 13);
		bag.add('oak', t_grain(rbox(0.024, 0.2, 0.014, 0.003, 1), 'y'), at(x + 0.025, y - 0.1, zf + 0.015));
		bag.add('tb-steel', new THREE.BoxGeometry(0.22, 0.03, 0.002), at(x + 0.025 + 0.12, y - 0.025, zf + 0.015));
		for (const k of [0, 1]) bag.add('brass', new THREE.CylinderGeometry(0.003, 0.003, 0.016, 10).rotateX(Math.PI / 2), at(x + 0.025, y - 0.03 - k * 0.04, zf + 0.015));
	}
	// a claw hammer hanging head up between two pegs
	{
		const [x, y] = P(17, 15);
		const hx = x + 0.025;
		bag.add('oak', t_turn([[0, 0], [0.013, 0.004], [0.016, 0.05], [0.014, 0.2], [0.012, 0.3], [0, 0.305]], 12), at(hx, y - 0.31, zf + 0.025));
		bag.add('tb-iron', t_turn([[0, 0], [0.015, 0], [0.016, 0.004], [0.014, 0.05], [0.012, 0.06], [0, 0.06]], 16, 1), at(hx, y + 0.015, zf + 0.025, 0, 1, 0, -Math.PI / 2));
		bag.add('tb-iron', tube([[hx, y + 0.015, zf + 0.025], [hx - 0.05, y + 0.012, zf + 0.025], [hx - 0.09, y - 0.005, zf + 0.025]], 0.007, 8, false, 1, 8));
	}
	// two screwdrivers hanging through a peg pair
	for (const [i, k] of [[22, 0], [23, 1]]) {
		const [x, y] = P(i, 14);
		const sx = x + 0.025, len = k ? 0.12 : 0.15;
		bag.add('tb-steel', new THREE.CylinderGeometry(0.003, 0.003, len, 8), at(sx, y - 0.02 - len / 2, zf + 0.02));
		bag.add('oak', t_turn([[0, 0], [0.008, 0.002], [0.013, 0.02], [0.014, 0.08], [0.011, 0.1], [0, 0.102]], 12), at(sx, y - 0.01, zf + 0.02));
	}
	// a coping saw: a bent steel frame, a fine blade, an oak handle
	{
		const [x, y] = P(27, 15);
		const fx = x;
		bag.add('tb-iron', tube([[fx - 0.06, y - 0.02, zf + 0.02], [fx - 0.06, y + 0.06, zf + 0.02], [fx + 0.04, y + 0.06, zf + 0.02], [fx + 0.06, y + 0.06, zf + 0.02], [fx + 0.06, y - 0.02, zf + 0.02]], 0.0035, 6, false, 1, 24));
		bag.add('tb-steel', new THREE.BoxGeometry(0.12, 0.003, 0.0006), at(fx, y - 0.02, zf + 0.02));
		bag.add('oak', t_turn([[0, 0], [0.01, 0.003], [0.013, 0.03], [0.012, 0.09], [0, 0.095]], 12), at(fx + 0.06, y - 0.02, zf + 0.02, 0, 1, 0, -Math.PI / 2));
	}
	// a hank of twine on a peg
	{
		const [x, y] = P(31, 12);
		const t = new THREE.TorusGeometry(0.05, 0.012, 10, 32);
		bag.add('tb-twine', t, at(x, y - 0.045, zf + 0.03, 0, [1, 1.15, 1]));
		bag.add('tb-twine', new THREE.TorusGeometry(0.045, 0.008, 8, 28), at(x + 0.004, y - 0.05, zf + 0.04, 0.2, [1, 1.1, 1]));
	}
	// a small shelf on two pegs: three jars of screws and nails
	{
		const [x0, y] = P(16, 9);
		const sx = x0 + 0.025;
		t_part(bag, 0.28, 0.018, 0.1, 0.004, 'x', sx, y + 0.014, zf + 0.05);
		for (let k = 0; k < 3; k++) {
			const jx = sx - 0.085 + k * 0.085;
			bag.add('glass', t_turn([[0, 0], [0.032, 0], [0.034, 0.004], [0.034, 0.085], [0.03, 0.09], [0.03, 0.095], [0, 0.095]], 24, 1), at(jx, y + 0.023, zf + 0.05));
			bag.add(k === 1 ? 'tb-iron' : 'brass', new THREE.CylinderGeometry(0.03, 0.03, 0.05 + k * 0.01, 20), at(jx, y + 0.025 + (0.05 + k * 0.01) / 2, zf + 0.05));
			bag.add('bronze', new THREE.CylinderGeometry(0.033, 0.033, 0.012, 24), at(jx, y + 0.023 + 0.1, zf + 0.05));
		}
	}
	// a spokeshave and a marking gauge on the lower pegs
	{
		const [x, y] = P(5, 8);
		bag.add('tb-iron', tube([[x - 0.1, y - 0.02, zf + 0.02], [x - 0.04, y - 0.04, zf + 0.02], [x + 0.04, y - 0.04, zf + 0.02], [x + 0.1, y - 0.02, zf + 0.02]], 0.007, 8, false, 1, 16));
		const [gx, gy] = P(10, 7);
		bag.add('oak', t_grain(rbox(0.02, 0.2, 0.02, 0.003, 1), 'y'), at(gx, gy - 0.1, zf + 0.02));
		bag.add('oak', t_grain(rbox(0.06, 0.03, 0.06, 0.006, 2), 'x'), at(gx, gy - 0.13, zf + 0.03));
	}
	// a folding rule on a peg low on the right
	{
		const [x, y] = P(23, 7);
		bag.add('tb-straw', new THREE.BoxGeometry(0.17, 0.016, 0.006), at(x + 0.075, y - 0.012, zf + 0.012));
		bag.add('tb-straw', new THREE.BoxGeometry(0.17, 0.016, 0.006), at(x + 0.075, y - 0.012, zf + 0.018));
	}
}
material('tb-straw', 1, () => new THREE.MeshStandardMaterial({ color: '#d8c08a', roughness: 0.6 }));

function thingBuild() {
	const bag = t_bag(THING.id);
	const zc = t_Z0 + t_DEP / 2;
	// the top: eleven strips glued up, each a shade of its own, the joints just showing
	const r = chance(THING.id, 'strips');
	const n = 11, sw = t_DEP / n;
	for (let i = 0; i < n; i++) {
		const tone = 0.9 + r() * 0.16;
		const edge = i === n - 1 ? 0.008 : 0.0025;
		t_part(bag, t_LEN, t_T, sw - 0.0003, edge, 'x', 0, t_TOP - t_T / 2, t_Z0 + (i + 0.5) * sw, 0, [tone, tone * (0.97 + r() * 0.04), tone * (0.94 + r() * 0.06)]);
	}
	// dog holes along the front
	for (let k = 0; k < 13; k++) {
		const x = -0.72 + k * 0.12;
		bag.add('shadow', new THREE.CircleGeometry(0.0095, 16).rotateX(-Math.PI / 2), at(x, t_TOP + 0.0006, t_Z0 + t_DEP - 0.07));
	}
	// legs, rails, the lower frame and its shelf of slats
	const lx = 0.82, lz = [t_Z0 + 0.08, t_Z0 + t_DEP - 0.08], ly = t_TOP - t_T;
	for (const x of [-lx, lx]) for (const z of lz) t_part(bag, 0.085, ly + 0.001, 0.085, 0.007, 'y', x, (ly + 0.001) / 2, z);
	for (const z of lz) {
		t_part(bag, 2 * lx, 0.07, 0.035, 0.005, 'x', 0, ly - 0.035, z + (z > zc ? 0.022 : -0.022));
		t_part(bag, 2 * lx, 0.06, 0.035, 0.005, 'x', 0, 0.17, z + (z > zc ? 0.022 : -0.022));
	}
	for (const x of [-lx, lx]) {
		t_part(bag, 0.035, 0.07, lz[1] - lz[0], 0.005, 'z', x, ly - 0.035, zc);
		t_part(bag, 0.035, 0.06, lz[1] - lz[0], 0.005, 'z', x, 0.17, zc);
	}
	for (let k = 0; k < 5; k++) t_part(bag, 2 * lx - 0.09, 0.02, 0.118, 0.003, 'x', 0, 0.21, lz[0] + 0.07 + k * 0.127);
	// the face vice: its chop, opened on a board, the screw, guide bars and tommy bar
	const vx = -0.62, vz = t_Z0 + t_DEP, gap = 0.022;
	t_part(bag, 0.4, 0.2, 0.07, 0.008, 'x', vx, t_TOP - 0.1, vz + gap + 0.035);
	bag.add('tb-steel', new THREE.CylinderGeometry(0.015, 0.015, 0.2, 16).rotateX(Math.PI / 2), at(vx, t_TOP - 0.12, vz + 0.02));
	for (const s of [-1, 1]) bag.add('tb-steel', new THREE.CylinderGeometry(0.0125, 0.0125, 0.06, 14).rotateX(Math.PI / 2), at(vx + s * 0.15, t_TOP - 0.15, vz + 0.02));
	bag.add('bronze', t_turn([[0, 0], [0.032, 0], [0.034, 0.005], [0.026, 0.016], [0.022, 0.05], [0.019, 0.055], [0, 0.055]], 24, 1), at(vx, t_TOP - 0.12, vz + gap + 0.07, 0, 1, Math.PI / 2));
	bag.add('oak', t_turn([[0, 0], [0.016, 0], [0.019, 0.015], [0.012, 0.03], [0.011, 0.31], [0.017, 0.325], [0.016, 0.34], [0, 0.345]], 14), at(vx, t_TOP - 0.12 - 0.3, vz + gap + 0.115, 0, 1, 0, 0.08));
	// a board held in the vice, being planed: its edge above the top, shavings round it
	t_part(bag, 0.62, 0.13, gap - 0.001, 0.002, 'x', vx - 0.05, t_TOP + 0.065 - 0.06, vz + gap / 2);
	t_shaving(bag, at(-0.32, t_TOP, 0.62, 0.6), 0.25, 0.034);
	t_shaving(bag, at(-0.2, t_TOP, 0.7, -0.4), 0.18, 0.03);
	t_shaving(bag, at(-0.4, t_TOP, 0.52, 2.2), 0.22, 0.036);
	// the tools on the top: plane, mallet, the chisels' stand at the back
	t_plane(bag, at(0.05, t_TOP, 0.55, 0.35));
	t_mallet(bag, at(0.55, t_TOP, 0.62, -0.5));
	const cs = at(0.45, t_TOP, t_Z0 + 0.12);
	const stand = (geo, m) => bag.add('oak', geo, new THREE.Matrix4().multiplyMatrices(cs, m));
	for (const s of [-1, 1]) stand(t_grain(rbox(0.03, 0.16, 0.08, 0.005, 2), 'y'), at(s * 0.205, 0.018 + 0.08, 0));
	stand(t_grain(rbox(0.44, 0.03, 0.06, 0.006, 2), 'x'), at(0, 0.18, 0));
	t_part(bag, 0.44, 0.018, 0.1, 0.004, 'x', 0.45, t_TOP + 0.009, t_Z0 + 0.12);
	[0.006, 0.01, 0.012, 0.016, 0.019, 0.025].forEach((w, k) => t_chisel(bag, new THREE.Matrix4().multiplyMatrices(cs, at(-0.15 + k * 0.06, 0.2, 0.0)), w));
	// on the shelf: two crates and offcuts
	t_crate(bag, at(-0.45, 0.22, zc, 0.04), 0.46, 0.2, 0.34, r);
	t_crate(bag, at(0.02, 0.22, zc + 0.03, -0.05), 0.36, 0.17, 0.3, r);
	let y = 0.22;
	[[0.9, 0.16, 0.03], [0.8, 0.12, 0.045], [0.62, 0.18, 0.022], [0.55, 0.1, 0.04], [0.7, 0.14, 0.028]].forEach(([l, w, t], k) => {
		const tone = 0.85 + r() * 0.2;
		t_part(bag, l, t, w, 0.002, 'x', 0.42 + (r() - 0.5) * 0.08, y + t / 2, zc + (r() - 0.5) * 0.2, (r() - 0.5) * 0.2, [tone, tone * 0.96, tone * 0.9]);
		y += t;
	});
	t_pegboard(bag);
	return bag.build();
}

/** an open crate of oak boards 12 mm, a hand hole in each end, standing at its foot's middle; a few offcut blocks in it */
function t_crate(bag, m, w, h, d, r) {
	const T = 0.012;
	const put = (geo, mm) => bag.add('oak', geo, new THREE.Matrix4().multiplyMatrices(m, mm));
	put(t_grain(rbox(w, T, d, 0.002, 1), 'x'), at(0, T / 2 + 0.001, 0));
	for (const s of [-1, 1]) put(t_grain(rbox(w, h, T, 0.003, 2), 'x'), at(0, h / 2, s * (d / 2 - T / 2)));
	for (const s of [-1, 1]) {
		const end = t_panel([[-d / 2 + T, 0], [d / 2 - T, 0], [d / 2 - T, h], [-d / 2 + T, h]], T, 0.002, 1, 1, [roundRect(0.1, 0.03, 0.015, 6).map(([a, b]) => [a, b + h - 0.045]).reverse()]);
		end.translate(0, 0, -T / 2);
		put(t_grain(end, 'x'), at(s * (w / 2 - T / 2), 0, 0, Math.PI / 2));
	}
	for (let k = 0; k < 4; k++) {
		const g = t_grain(rbox(between(r, 0.06, 0.16), between(r, 0.03, 0.06), between(r, 0.04, 0.09), 0.002, 1), 'x');
		put(g, at((r() - 0.5) * (w - 0.18), T + 0.03 + k * 0.012, (r() - 0.5) * (d - 0.12), r() * 0.6));
	}
}
