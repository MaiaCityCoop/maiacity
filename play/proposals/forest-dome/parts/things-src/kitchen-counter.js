/*
 * KITCHEN-COUNTER — a straight kitchen run against a wall: oak base cabinets under a travertine top with a sink and an
 * induction hob, a backsplash of zellige, two open oak shelves of crockery above (pictures 8, 9; Geoship's kitchen).
 * Real measures: 3.0 m long; base cabinets 65 cm deep with their top (60 cm carcasses, 2 cm fronts, the top 3 cm
 * proud), 92 cm high (a 40 mm top on 88); a plinth 10 cm, recessed 7 cm; fronts of oak 20 mm, 3 mm apart, finger pulls
 * cut in their top edges: a stack of three drawers (60), two doors under the sink (90), a door (60), two deep pan
 * drawers under the hob (90); an undermount fireclay sink 56 × 40 cm, a brass gooseneck tap; a four-zone induction hob
 * 59 × 52 cm of black glass; zellige of 10 cm tiles from the top to 1.52 m (six courses); two floating oak shelves 28
 * cm deep, 45 mm thick, their tops at 1.83 and 2.2 m, with plates, bowls, glass jars of pulses and pasta, tumblers, a
 * jug and a pothos trailing from a terracotta pot. Made of: plates of their plans for the top (with its sink hole) and
 * the shelves, rounded boxes for carcasses and the splash, fronts cut and eased, crockery turned, leaves cut and bent.
 * Anchor: a wall piece: its back against z 0 (the wall), its middle at x 0, on the floor (y 0); out toward +z.
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

/* ---- the kitchens' parts: fronts with finger pulls, an undermount basin, a brass tap, crockery, fruit, a board ---- */

material('tb-stoneware', 1, () => new THREE.MeshPhysicalMaterial({ color: '#d3c6b0', roughness: 0.58, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: INDOOR }));
material('tb-stoneware-sage', 1, () => new THREE.MeshPhysicalMaterial({ color: '#a7ae97', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: INDOOR }));
material('tb-orange', 1, () => new THREE.MeshPhysicalMaterial({ color: '#e0761c', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.6 }));
material('tb-lemon', 1, () => new THREE.MeshPhysicalMaterial({ color: '#e9c93c', roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.6 }));
material('tb-apple', 1, () => new THREE.MeshPhysicalMaterial({ color: '#9db43e', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 }));
material('tb-apple-red', 1, () => new THREE.MeshPhysicalMaterial({ color: '#a53327', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 }));
material('tb-stem', 1, () => new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.9 }));

/**
 * A cabinet front (a door or a drawer), w × h, its face at z 0 and its back at −T: corners rounded, edges eased, and a
 * finger pull — a half-round notch cut into its top edge — at `pull` (−1 left … 1 right of its middle; null: none).
 * Its grain up a door (`upright`), along a drawer. Middle of its foot at the origin.
 */
function t_front(w, h, pull = 0, upright = true, T = 0.02) {
	const b = 0.003, W = w - 2 * b, H = h - 2 * b, rc = 0.018;
	const pts = [];
	const arcTo = (cx, cy, a0, a1) => { for (let i = 0; i <= 6; i++) { const a = lerp(a0, a1, i / 6); pts.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]); } };
	arcTo(-W / 2 + rc, b + rc, Math.PI, Math.PI * 1.5);
	arcTo(W / 2 - rc, b + rc, -Math.PI / 2, 0);
	arcTo(W / 2 - rc, b + H - rc, 0, Math.PI / 2);
	if (pull !== null) {
		// the notch: 13 cm wide, 30 mm deep, its shoulders rounded
		const cx = clamp(pull * (W / 2 - 0.1), -W / 2 + 0.09, W / 2 - 0.09), nw = 0.065, nd = 0.03;
		for (let i = 0; i <= 14; i++) {
			const t = i / 14, a = t * Math.PI;
			const x = cx + nw * Math.cos(a), dip = nd * Math.pow(Math.sin(a), 0.7);
			pts.push([x, b + H - dip]);
		}
	}
	arcTo(-W / 2 + rc, b + H - rc, Math.PI / 2, Math.PI);
	const g = t_panel(pts, T, b, 2, 4);
	g.translate(0, 0, -T);
	return t_grain(g, upright ? 'y' : 'x');
}

/** an undermount basin of glazed fireclay under a hole w × d (corner radius rc), `depth` deep, its rim at y 0 */
function t_basin(bag, m, w, d, rc, depth) {
	const wall = 0.014;
	const inner = roundRect(w, d, rc, 6), outer = roundRect(w + 2 * wall, d + 2 * wall, rc + wall, 6);
	// a rounded rectangle in plan: points [x, z]
	const ring = t_plate(outer, depth, 0, 1, 6, [inner]);
	ring.translate(0, -depth, 0);
	bag.add('glaze', ring, m);
	// its floor, falling a little to the waste; the waste: a brass ring round a dark grating
	const floor = t_plate(roundRect(w + 0.002, d + 0.002, rc, 6), 0.015, 0, 1, 6);
	floor.translate(0, -depth - 0.006, 0);
	bag.add('glaze', floor, m);
	bag.add('brass', t_turn([[0.03, 0], [0.034, 0.002], [0.03, 0.004], [0.0, 0.0035]], 32, 1).translate(0, -depth + 0.009, 0), m);
	bag.add('shadow', new THREE.CircleGeometry(0.026, 24).rotateX(-Math.PI / 2).translate(0, -depth + 0.0135, 0), m);
}

/** a brass gooseneck tap: a round foot, a column, its spout arching over toward +z, a lever on its side */
function t_tap(bag, m, reach = 0.2, high = 0.3) {
	const parts = [];
	parts.push(t_turn([[0, 0], [0.026, 0], [0.027, 0.004], [0.024, 0.012], [0.018, 0.02], [0, 0.02]], 32, 1));
	parts.push(t_turn([[0, 0.02], [0.016, 0.02], [0.016, 0.15], [0, 0.15]], 24, 1));
	const spout = [[0, 0.14, 0], [0, high - 0.02, 0]];
	for (let i = 1; i <= 14; i++) {
		const a = (i / 14) * Math.PI;
		spout.push([0, high - 0.02 + (reach / 2) * Math.sin(a), (reach / 2) * (1 - Math.cos(a))]);
	}
	spout.push([0, high - 0.08, reach]);
	parts.push(tube(spout, 0.011, 16, false, 1, 64));
	parts.push(t_turn([[0, 0], [0.013, 0], [0.013, 0.022], [0.011, 0.024], [0, 0.024]], 20, 1).rotateX(Math.PI).translate(0, high - 0.08, reach));
	// the lever: a short arm off the column's side
	parts.push(t_turn([[0, 0], [0.013, 0], [0.013, 0.02], [0, 0.02]], 20, 1).rotateZ(-Math.PI / 2).translate(0.014, 0.1, 0));
	parts.push(tube([[0.03, 0.1, 0], [0.065, 0.112, 0], [0.09, 0.118, 0]], 0.0045, 10, false, 1, 8));
	for (const g of parts) bag.add('brass', g, m);
}

/** a stoneware bowl, Ø 2·r, `h` high: a foot ring, its wall flaring out to a rolled lip, its inside `t` within */
function t_bowlProfile(r, h, t = 0.006) {
	const X = (s) => r * (0.42 + (0.58 * Math.sin(s * 1.2)) / Math.sin(1.2)), Y = (s) => 0.008 + (h - 0.008) * Math.pow(s, 1.5);
	const pts = [[0, 0.004], [r * 0.32, 0.004], [r * 0.34, 0], [r * 0.38, 0], [r * 0.4, 0.006]];
	for (let i = 1; i <= 8; i++) pts.push([X(i / 8), Y(i / 8)]);
	pts.push([r + 0.002, h + 0.003], [r - 0.002, h + 0.006], [r - t, h]);
	for (let i = 8; i >= 1; i--) pts.push([X(i / 8) - t, Y(i / 8) + t * 0.6]);
	pts.push([0, 0.008 + t]);
	return pts;
}
/** the height of a bowl's inside at radius x (as t_bowlProfile makes it) */
function t_bowlIn(r, h, x, t = 0.006) {
	const X = (s) => r * (0.42 + (0.58 * Math.sin(s * 1.2)) / Math.sin(1.2)) - t;
	let lo = 0, hi = 1;
	for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (X(m) < x) lo = m; else hi = m; }
	return 0.008 + (h - 0.008) * Math.pow(lo, 1.5) + t * 0.6;
}

/** a fruit: an orange, a lemon or an apple, its middle at the origin */
function t_fruit(bag, m, kind, r) {
	if (kind === 'orange') {
		const g = new THREE.SphereGeometry(0.037, 20, 14).scale(1, 0.94, 1);
		bag.add('tb-orange', g, m);
		bag.add('tb-stem', new THREE.CylinderGeometry(0.003, 0.004, 0.004, 6).translate(0, 0.035, 0), m);
	} else if (kind === 'lemon') {
		const pts = [];
		for (let i = 0; i <= 14; i++) {
			const t = i / 14, y = lerp(-0.044, 0.044, t);
			const body = 0.029 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(y) / 0.04, 2.4)));
			const nub = 0.004 * Math.max(0, 1 - (Math.abs(y) - 0.036) / 0.008) * (Math.abs(y) > 0.036 ? 1 : 0);
			pts.push([Math.max(body, nub), y]);
		}
		pts[0][0] = 0;
		pts[pts.length - 1][0] = 0;
		bag.add('tb-lemon', t_turn(pts, 18, 1).rotateZ(Math.PI / 2), m);
	} else {
		const pts = [[0, 0.01]];
		for (let i = 1; i < 14; i++) {
			const a = (i / 14) * Math.PI;
			const rr = 0.038 * Math.sin(a) * (1 + 0.08 * Math.sin(a * 2 - 0.4));
			pts.push([rr, -0.034 * Math.cos(a) + (i === 1 || i === 13 ? 0.004 * Math.sign(Math.cos(a)) : 0)]);
		}
		pts.push([0, 0.026]);
		bag.add(kind === 'apple-red' ? 'tb-apple-red' : 'tb-apple', t_turn(pts, 20, 1), m);
		bag.add('tb-stem', tube([[0, 0.022, 0], [0.002, 0.04, 0.001], [0.006, 0.048, 0.002]], 0.0016, 5, false, 1, 4), m);
	}
}

/** a bowl of fruit standing at the origin: a wide stoneware bowl, five fruit in it and three on them */
function t_fruitBowl(bag, m) {
	const R = 0.15, H = 0.085;
	bag.add('tb-stoneware-sage', t_turn(t_bowlProfile(R, H), 48, 1), m);
	const kinds = ['orange', 'lemon', 'apple', 'orange', 'apple-red', 'lemon', 'orange', 'apple'];
	const put = (x, y, z, k, ry, rx = 0) => t_fruit(bag, new THREE.Matrix4().multiplyMatrices(m, at(x, y, z, ry, 1, rx)), kinds[k], 0);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * TAU + 0.3, rho = 0.075;
		put(rho * Math.sin(a), t_bowlIn(R, H, rho + 0.03) + 0.03, rho * Math.cos(a), i, a, 0.2);
	}
	put(0.0, 0.088, 0.01, 5, 0.7);
	put(0.05, 0.1, -0.04, 6, 1.2);
	put(-0.05, 0.098, -0.035, 7, 2.1, 0.3);
}

/** an oak chopping board lying flat at the origin: 36 × 27 cm and its handle (45 cm in all), 22 mm thick, edges eased */
function t_board(bag, m) {
	const inBody = (x, z) => Math.pow(Math.abs(x + 0.045) / 0.18, 6) + Math.pow(Math.abs(z) / 0.135, 6) <= 1;
	const inHandle = (x, z) => Math.pow(Math.abs(x - 0.17) / 0.06, 2.6) + Math.pow(Math.abs(z) / 0.042, 2.6) <= 1;
	const edge = (a) => {
		const dx = Math.cos(a), dz = Math.sin(a);
		const inside = (t) => inBody(t * dx, t * dz) || inHandle(t * dx, t * dz);
		let t = 0.24;
		while (t > 0 && !inside(t)) t -= 0.005;
		while (inside(t + 0.0005)) t += 0.0005;
		return [t * dx, t * dz];
	};
	const g = t_slab({ edge, top: () => 0.022, bottom: () => 0, r: 0.005, n: 96, rings: 3, round: 3 });
	bag.add('oak', t_grain(g, 'x'), m);
}

/** a stack of `n` plates Ø 2·r standing at the origin, each sitting in the one below */
function t_plates(bag, m, n, r, name = 'glaze') {
	const prof = [[0, 0.002], [r * 0.48, 0.002], [r * 0.5, 0], [r * 0.54, 0], [r * 0.56, 0.006], [r * 0.7, 0.008], [r * 0.82, 0.012], [r * 0.95, 0.019], [r, 0.022], [r - 0.002, 0.0245], [r * 0.95 - 0.002, 0.0215], [r * 0.82 - 0.002, 0.0145], [r * 0.7, 0.0115], [0, 0.0105]];
	const one = t_turn(prof, 32, 1);
	for (let i = 0; i < n; i++) bag.add(name, one.clone().translate(0, i * 0.0125, 0), m);
}

const THING = {
	id: 'kitchen-counter',
	label: 'Oak kitchen counter',
	note: 'A 3.0 m kitchen run against a wall: oak base cabinets 0.65 m deep and 0.92 m high with finger-pull fronts, a travertine top with a fireclay sink, brass tap and induction hob, a zellige backsplash to 1.5 m, and two open oak shelves of plates, bowls, jars, glasses and a trailing plant up to 2.2 m.'
};

const t_L = 3.0, t_D = 0.65, t_TOP = 0.92, t_TT = 0.04, t_BASE = 0.1, t_FACE = 0.62;
material('tb-ceran', 1, () => new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0 }));
material('tb-print', 1, () => new THREE.MeshStandardMaterial({ color: '#7d7d7a', roughness: 0.4 }));
material('tb-leaf', 1, () => new THREE.MeshStandardMaterial({ color: '#36632a', roughness: 0.42, side: THREE.DoubleSide }));
material('tb-leaf-light', 1, () => new THREE.MeshStandardMaterial({ color: '#6a9440', roughness: 0.42, side: THREE.DoubleSide }));
material('tb-pulse', 1, () => new THREE.MeshStandardMaterial({ color: '#b5703c', roughness: 0.9 }));
material('tb-pasta', 1, () => new THREE.MeshStandardMaterial({ color: '#e3c27a', roughness: 0.8 }));
material('tb-rice', 1, () => new THREE.MeshStandardMaterial({ color: '#efe9da', roughness: 0.85 }));
material('tb-iron', 1, () => new THREE.MeshStandardMaterial({ color: '#2f3032', metalness: 0.6, roughness: 0.55 }));
material('tb-clay', 1, () => new THREE.MeshStandardMaterial({ color: '#b5714b', roughness: 0.9 }));
material('tb-earth', 1, () => new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 }));
material('tb-cork', 1, () => new THREE.MeshStandardMaterial({ color: '#b8925f', roughness: 0.9 }));

/** a glass storage jar of `fill` (a material) standing at the origin, Ø 2·r, h high, a cork lid */
function t_jar(bag, m, r, h, fill, level) {
	bag.add('glass', t_turn([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.02], [r - 0.006, h - 0.012], [r - 0.006, h], [0, h]], 32, 1), m);
	bag.add(fill, t_turn([[0, 0.004], [r - 0.004, 0.004], [r - 0.004, level * h], [r * 0.5, level * h + 0.006], [0, level * h + 0.008]], 24, 1), m);
	bag.add('tb-cork', t_turn([[0, h - 0.016], [r - 0.008, h - 0.016], [r - 0.007, h], [r - 0.004, h + 0.002], [r - 0.004, h + 0.014], [r - 0.006, h + 0.016], [0, h + 0.016]], 28, 1), m);
}

/** a tumbler upside down, Ø 75 mm, 10 cm */
function t_glass(bag, m) {
	bag.add('glass', t_turn([[0, 0.1], [0.032, 0.1], [0.033, 0.096], [0.0375, 0.002], [0.036, 0], [0.034, 0], [0.0345, 0.004], [0.03, 0.094], [0, 0.094]], 28, 1), m);
}

/** a pothos leaf: ovate, its base heart-shaped, its tip drawn out; its stalk at the origin, pointing along +z, cupped */
function t_leafGeo(size) {
	const half = [[0, 0.07], [0.15, -0.035], [0.3, 0.0], [0.4, 0.1], [0.43, 0.24], [0.4, 0.42], [0.31, 0.62], [0.18, 0.8], [0.06, 0.93], [0, 1]];
	const curve = new THREE.CatmullRomCurve3(half.map(([x, y]) => new THREE.Vector3(x, y, 0)));
	const right = curve.getPoints(14).map((p) => [p.x * 0.75 * size, p.y * size]);
	const pts = [...right, ...right.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
	const g = new THREE.ShapeGeometry(t_shape(pts), 2);
	const pos = g.attributes.position;
	// laid along +z, cupped across its midrib and arched along it
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i);
		pos.setXYZ(i, x, -0.35 * (x * x) / size + 0.12 * y * (1 - y / size), y);
	}
	g.computeVertexNormals();
	return g;
}

/** a golden pothos in a small terracotta pot standing at the origin, trailing toward +z and down past the shelf */
function t_pothos(bag, m, r) {
	bag.add('tb-clay', t_turn([[0, 0], [0.05, 0], [0.056, 0.01], [0.064, 0.1], [0.07, 0.105], [0.07, 0.118], [0.064, 0.12], [0.06, 0.112], [0.053, 0.03], [0, 0.03]], 32, 1), m);
	bag.add('tb-earth', new THREE.CircleGeometry(0.059, 24).rotateX(-Math.PI / 2).translate(0, 0.104, 0), m);
	const leaf = (p, yaw, size, tilt, roll = 0) => {
		const g = t_leafGeo(size);
		g.applyMatrix4(at(p[0], p[1], p[2], yaw, 1, tilt, roll));
		bag.add(r() < 0.3 ? 'tb-leaf-light' : 'tb-leaf', g, m);
	};
	// a crown of leaves on short stalks, held up and out round the pot
	for (let i = 0; i < 18; i++) {
		const a = (i / 18) * TAU + r() * 0.5;
		const out = between(r, 0.01, 0.05);
		leaf([Math.sin(a) * out, 0.11 + r() * 0.06, Math.cos(a) * out], a + (r() - 0.5) * 0.6, between(r, 0.07, 0.1), between(r, -0.35, 0.55), (r() - 0.5) * 0.4);
	}
	// six vines: over the shelf's edge and down in loose curves, one along the shelf first; a leaf every few centimetres
	for (let v = 0; v < 6; v++) {
		const side = (v - 2.5) * 0.04 + (r() - 0.5) * 0.02, drop = between(r, 0.15, 0.7), sway = between(r, 0.02, 0.06), ph = r() * TAU;
		const along = v === 5 ? -0.25 : 0;
		const pts = [[side * 0.3, 0.115, 0.03], [side + along * 0.5, 0.1, 0.1], [side * 1.3 + along, 0.06, 0.15], [side * 1.5 + along + 0.01, -0.03, 0.168]];
		for (let k = 1; k <= 4; k++) {
			const t = k / 4;
			pts.push([side * 1.6 + along + sway * Math.sin(ph + t * 4), -0.03 - drop * t, 0.17 + 0.03 * Math.sin(ph * 2 + t * 3) * t]);
		}
		bag.add('tb-leaf', tube(pts, 0.0017, 4, false, 1, 30), m);
		const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
		const n = Math.floor(5 + (drop + Math.abs(along)) * 20);
		for (let k = 1; k <= n; k++) {
			const p = curve.getPoint(k / (n + 0.3));
			const s = k % 2 ? 1 : -1;
			const hanging = p.y < 0.0;
			const size = between(r, 0.05, 0.08) * (1 - 0.35 * (k / n));
			if (hanging) leaf([p.x + s * 0.004, p.y, p.z + 0.004], s * between(r, 0.2, 0.8), size, between(r, 1.0, 1.6), s * between(r, 0.1, 0.5));
			else leaf([p.x + s * 0.004, p.y + 0.004, p.z], s * between(r, 0.8, 1.6), size, between(r, -0.3, 0.3), (r() - 0.5) * 0.6);
		}
	}
}

/** a stoneware jug standing at the origin */
function t_jug(bag, m) {
	const prof = [[0, 0], [0.05, 0], [0.054, 0.004], [0.06, 0.04], [0.06, 0.1], [0.052, 0.15], [0.045, 0.18], [0.047, 0.2], [0.05, 0.205], [0.047, 0.207], [0.04, 0.2], [0.04, 0.18], [0.047, 0.15], [0.054, 0.1], [0.054, 0.04], [0, 0.03]];
	bag.add('tb-stoneware', t_turn(prof, 36, 1), m);
	bag.add('tb-stoneware', tube([[0, 0.17, -0.045], [0, 0.18, -0.085], [0, 0.12, -0.095], [0, 0.07, -0.06]], 0.008, 8, false, 1, 16), m);
}

function thingBuild() {
	const bag = t_bag(THING.id);
	const tb = 0.008, sinkX = -0.43, sinkZ = 0.33, sw = 0.56, sd = 0.4, src = 0.035;
	// the carcasses: one long body behind the fronts (a well in it for the basin), the plinth set back under it, end panels
	const well = roundRect(sw + 0.032, sd + 0.032, src + 0.016, 6).map(([a, b]) => [a + sinkX, b + sinkZ]);
	const W = t_L / 2 - 0.02, F = t_FACE - 0.02;
	const body = t_plate([[-W, 0], [W, 0], [W, F], [-W, F]], t_TOP - t_TT - t_BASE, 0, 1, 6, [well]);
	body.translate(0, t_BASE, 0);
	bag.add('oak', t_grain(body, 'y'));
	t_partBox(bag, t_L - 0.04, t_BASE + 0.001, 0.02, 0, (t_BASE + 0.001) / 2, t_FACE - 0.08, 'x', [0.62, 0.58, 0.54]);
	for (const s of [-1, 1]) t_partBox(bag, 0.02, t_TOP - t_TT, t_FACE, s * (t_L / 2 - 0.01), (t_TOP - t_TT) / 2, t_FACE / 2, 'y');
	// the fronts: drawers (60) | two doors (90) | a door (60) | two pan drawers (90)
	const gap = 0.003, y0 = t_BASE + 0.002, H = t_TOP - t_TT - 0.004 - y0, x0 = -t_L / 2 + 0.02;
	const cols = [[0.6, 'drawers3'], [0.45, 'door', 0.75], [0.45, 'door', -0.75], [0.6, 'door', -0.7], [0.86, 'drawers2']];
	let x = x0;
	for (const [w, kind, pull] of cols) {
		const fronts = [];
		const cx = x + w / 2;
		if (kind === 'door') fronts.push([cx, y0, w - gap, H, pull, true]);
		else {
			const hs = kind === 'drawers3' ? [0.31, 0.26] : [0.4];
			hs.push(H - hs.reduce((a, b) => a + b, 0) - hs.length * gap);
			let y = y0;
			for (const h of hs) (fronts.push([cx, y, w - gap, h, 0, false]), (y += h + gap));
		}
		for (const [fx, fy, fw, fh, p, upright] of fronts) bag.add('oak', t_front(fw, fh, p, upright).translate(fx, fy, t_FACE));
		x += w;
	}
	// the top: travertine 40 mm, its front corners rounded, a hole for the sink
	const plan = [[-t_L / 2 + tb, tb], [t_L / 2 - tb, tb], [t_L / 2 - tb, t_D - 0.05], ...t_curve(t_L / 2 - 0.05, t_D - 0.05, 0.05 - tb, 0, Math.PI / 2), [t_L / 2 - 0.05, t_D - tb], [-t_L / 2 + 0.05, t_D - tb], ...t_curve(-t_L / 2 + 0.05, t_D - 0.05, 0.05 - tb, Math.PI / 2, Math.PI), [-t_L / 2 + tb, t_D - 0.05]];
	const hole = roundRect(sw + 2 * tb, sd + 2 * tb, src + tb, 6).map(([a, b]) => [a + sinkX, b + sinkZ]);
	const top = t_plate(plan, t_TT, tb, 3, 12, [hole]);
	top.translate(0, t_TOP - t_TT, 0);
	bag.add('travertine', boxUV(top, TILE.travertine));
	// the sink, its tap at the back, the hob on the right
	t_basin(bag, at(sinkX, t_TOP - t_TT - 0.001, sinkZ), sw, sd, src, 0.2);
	t_tap(bag, at(sinkX, t_TOP, sinkZ - sd / 2 - 0.07), 0.22, 0.34);
	const hx = 1.05, hz = 0.33;
	const hob = t_plate(roundRect(0.59 - 0.004, 0.52 - 0.004, 0.006, 3), 0.006, 0.002, 2, 2);
	bag.add('tb-ceran', hob, at(hx, t_TOP, hz));
	for (const [dx, dz, rr] of [[-0.15, -0.11, 0.1], [0.15, -0.11, 0.08], [-0.15, 0.1, 0.08], [0.15, 0.1, 0.1]]) {
		bag.add('tb-print', new THREE.RingGeometry(rr - 0.0015, rr, 48).rotateX(-Math.PI / 2), at(hx + dx, t_TOP + 0.0064, hz + dz));
		bag.add('tb-print', new THREE.RingGeometry(rr * 0.35 - 0.001, rr * 0.35, 4).rotateX(-Math.PI / 2), at(hx + dx, t_TOP + 0.0064, hz + dz, Math.PI / 4));
	}
	for (let i = 0; i < 6; i++) bag.add('tb-print', new THREE.CircleGeometry(0.004, 10).rotateX(-Math.PI / 2), at(hx - 0.1 + i * 0.04, t_TOP + 0.0064, hz + 0.235));
	// a cast iron casserole on the back left zone
	bag.add('tb-iron', t_turn([[0, 0], [0.1, 0], [0.105, 0.006], [0.106, 0.1], [0.112, 0.104], [0.112, 0.11], [0.1, 0.11], [0.1, 0.012], [0, 0.012]], 40, 1), at(hx - 0.15, t_TOP + 0.006, hz - 0.11));
	bag.add('tb-iron', t_turn([[0, 0.14], [0.03, 0.138], [0.08, 0.126], [0.108, 0.112], [0.112, 0.106], [0.1, 0.108], [0, 0.11]], 40, 1), at(hx - 0.15, t_TOP + 0.006, hz - 0.11));
	bag.add('brass', t_turn([[0, 0], [0.016, 0], [0.018, 0.006], [0.012, 0.012], [0.014, 0.022], [0, 0.024]], 20, 1), at(hx - 0.15, t_TOP + 0.006 + 0.138, hz - 0.11));
	for (const s of [-1, 1]) bag.add('tb-iron', tube([[0.1, 0.085, -0.02], [0.13, 0.087, -0.018], [0.13, 0.087, 0.018], [0.1, 0.085, 0.02]], 0.007, 8, false, 1, 10), at(hx - 0.15, t_TOP + 0.006, hz - 0.11, s > 0 ? 0 : Math.PI));
	// the backsplash: zellige, 10 cm tiles from the top in six courses
	const splash = boxUV(rbox(t_L, 0.6, 0.012, 0.004, 2).translate(0, t_TOP + 0.3, 0.006), TILE.zellige);
	const suv = splash.attributes.uv;
	for (let i = 0; i < suv.count; i++) suv.setY(i, suv.getY(i) - t_TOP / TILE.zellige);
	bag.add('zellige', splash);
	// the two shelves, floating on hidden rods, their front corners rounded
	const shelfPlan = (w, d) => [[-w / 2, 0.008], [w / 2, 0.008], [w / 2, d - 0.04], ...t_curve(w / 2 - 0.04, d - 0.04, 0.04, 0, Math.PI / 2), ...t_curve(-w / 2 + 0.04, d - 0.04, 0.04, Math.PI / 2, Math.PI), [-w / 2, d - 0.04]];
	const r = chance(THING.id, 'shelves');
	for (const yTop of [1.83, 2.2]) {
		const g = t_plate(shelfPlan(2.8 - 0.016, 0.28 - 0.008), 0.045, 0.008, 3, 8);
		g.translate(0, yTop - 0.045, 0);
		bag.add('oak', t_grain(g, 'x'));
	}
	// the lower shelf: plates, side plates, bowls, jars, glasses, the pothos
	const y1 = 1.83, y2 = 2.2, zs = 0.15;
	t_plates(bag, at(-1.18, y1, zs), 6, 0.135);
	t_plates(bag, at(-0.88, y1, zs), 5, 0.105, 'tb-stoneware');
	for (let i = 0; i < 3; i++) bag.add('tb-stoneware-sage', t_turn(t_bowlProfile(0.08 - i * 0.012, 0.06 - i * 0.008), 28, 1), at(-0.63, y1 + i * 0.017, zs));
	t_jar(bag, at(-0.35, y1, zs - 0.02), 0.055, 0.2, 'tb-pulse', 0.7);
	t_jar(bag, at(-0.21, y1, zs - 0.02), 0.055, 0.24, 'tb-pasta', 0.62);
	t_jar(bag, at(-0.07, y1, zs - 0.02), 0.05, 0.17, 'tb-rice', 0.8);
	for (let i = 0; i < 4; i++) t_glass(bag, at(0.14 + i * 0.085, y1, zs + (i % 2) * 0.03));
	t_pothos(bag, at(1.05, y1, 0.12), r);
	// the upper shelf: big jars, a jug, plates standing on edge, a stack of small bowls
	t_jar(bag, at(-1.2, y2, zs - 0.02), 0.065, 0.26, 'tb-pasta', 0.5);
	t_jar(bag, at(-1.04, y2, zs - 0.02), 0.06, 0.22, 'tb-pulse', 0.45);
	t_jug(bag, at(-0.7, y2, zs, 0.3));
	for (let i = 0; i < 3; i++) t_plates(bag, at(-0.27, y2 + 0.136, 0.05 + i * 0.026, 0, 1, Math.PI / 2 - 0.15, 0), 1, 0.135);
	for (let i = 0; i < 4; i++) bag.add('tb-stoneware', t_turn(t_bowlProfile(0.065, 0.045), 28, 1), at(0.2, y2 + i * 0.024, zs));
	for (let i = 0; i < 3; i++) bag.add('tb-stoneware-sage', t_turn(t_bowlProfile(0.065, 0.045), 28, 1), at(0.4, y2 + i * 0.024, zs));
	t_jar(bag, at(0.75, y2, zs - 0.02), 0.045, 0.15, 'tb-rice', 0.6);
	t_jar(bag, at(0.86, y2, zs - 0.02), 0.045, 0.15, 'tb-pulse', 0.75);
	// on the counter: a crock of wooden spoons, a board leaning on the splash
	bag.add('tb-stoneware', t_turn([[0, 0], [0.055, 0], [0.058, 0.004], [0.06, 0.16], [0.063, 0.165], [0.058, 0.168], [0.054, 0.16], [0.052, 0.012], [0, 0.012]], 32, 1), at(0.25, t_TOP, 0.12));
	for (let i = 0; i < 4; i++) {
		const a = (i / 4) * TAU, lean = 0.12 + 0.05 * i;
		const tip = [Math.sin(a) * lean * 0.3, 0.33 + i * 0.015, Math.cos(a) * lean * 0.3];
		bag.add('oak', tube([[0, 0.02, 0], tip], 0.006, 8, false, 1, 2), at(0.25, t_TOP, 0.12));
		bag.add('oak', new THREE.SphereGeometry(0.024, 14, 10).scale(1, 1.7, 0.3), at(0.25 + tip[0] * 1.08, t_TOP + tip[1] + 0.035, 0.12 + tip[2] * 1.08, a, 1, Math.cos(a) * 0.3, -Math.sin(a) * 0.3));
	}
	// the board on its end, handle up, leaning back on the splash
	const stand = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
	t_board(bag, at(-1.2, t_TOP + 0.226 * Math.cos(0.12), 0.07, 0, 1, -0.12).multiply(stand));
	return bag.build();
}

/** a box of oak, eased, its grain along `axis`, its middle at [x, y, z] (vertex colour `tint` where given) */
function t_partBox(bag, w, h, d, x, y, z, axis, tint) {
	const g = t_grain(rbox(w, h, d, 0.003, 1), axis);
	if (tint) t_tint(g, tint);
	bag.add('oak', g, at(x, y, z), tint ? { colour: true } : {});
}

/** points round an arc: centre [cx, cy], radius r, from a0 to a1 */
function t_curve(cx, cy, r, a0, a1, n = 8) {
	const pts = [];
	for (let i = 1; i < n; i++) {
		const a = lerp(a0, a1, i / n);
		pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
	}
	return pts;
}
