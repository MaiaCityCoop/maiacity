/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** @typedef {ReturnType<typeof import('$lib/assets/parts.js').assetKit>} Kit */
/** gravity (m/s²) */
const G = 9.81;
/** air at 20 °C at sea level (kg/m³) */
const RHO_AIR = 1.2;
/** fuels: density (g/L) */
const FUELS = {
	diesel: {
		label: "diesel",
		rho: 835
	},
	petrol: {
		label: "petrol",
		rho: 745
	}
};
/** a rounded rectangle centred on (cx, cy) @param {number} w @param {number} h @param {number} r @param {number} [cx] @param {number} [cy] */
function rrect(w, h, r, cx = 0, cy = 0) {
	const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
	return roundPoly([
		[x0, y0],
		[x1, y0],
		[x1, y1],
		[x0, y1]
	], r);
}
/**
* Trace a polygon with its corners rounded into a shape or a path: each corner cut back by up to `r` along both its
* edges and joined by a curve.
* @param {V2[]} pts @param {number | number[]} r a radius, or one per corner @param {THREE.Path} path
*/
function tracePoly(pts, r, path) {
	const n = pts.length;
	for (let i = 0; i < n; i++) {
		const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
		const d = Math.min(Array.isArray(r) ? r[i] : r, la / 2, lb / 2);
		const p0 = [p[0] + (a[0] - p[0]) * d / la, p[1] + (a[1] - p[1]) * d / la];
		const p1 = [p[0] + (b[0] - p[0]) * d / lb, p[1] + (b[1] - p[1]) * d / lb];
		if (i === 0) path.moveTo(p0[0], p0[1]);
		else path.lineTo(p0[0], p0[1]);
		if (d > 1e-6) path.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
	}
	path.closePath();
	return path;
}
/** a polygon with its corners rounded, as a shape @param {V2[]} pts @param {number | number[]} r a radius, or one per corner */
function roundPoly(pts, r) {
	const s = new three.Shape();
	tracePoly(pts, r, s);
	return s;
}
/** the same polygon as a hole (a Path) @param {V2[]} pts @param {number | number[]} r */
function roundHole(pts, r) {
	const p = new three.Path();
	tracePoly(pts, r, p);
	return p;
}
/** a circle as a hole @param {number} x @param {number} y @param {number} r */
function circle(x, y, r) {
	const p = new three.Path();
	p.absarc(x, y, r, 0, Math.PI * 2, true);
	return p;
}
/** a thin plate from a shape along z, centred, sharp-edged and light (sheet metal, glass, trim) @param {THREE.Shape} s @param {number} d @param {number} [seg] */
const plate = (s, d, seg = 8) => new three.ExtrudeGeometry(s, {
	depth: d,
	bevelEnabled: false,
	curveSegments: seg
}).translate(0, 0, -d / 2);
/** a solid from a shape along z, centred, its edges softened by a small bevel, light (few segments on its curves) @param {THREE.Shape} s @param {number} d @param {number} [b] @param {number} [seg] */
function ext(s, d, b = .002, seg = 4) {
	const g = new three.ExtrudeGeometry(s, {
		depth: d,
		bevelEnabled: b > 0,
		bevelThickness: b,
		bevelSize: b,
		bevelSegments: 1,
		curveSegments: seg
	});
	g.translate(0, 0, -d / 2);
	g.computeVertexNormals();
	return g;
}
/** a plain box, centred (for sheets too thin to show a rounded edge) @param {number} w @param {number} h @param {number} d */
const slab = (w, h, d) => new three.BoxGeometry(w, h, d);
/** a rounded box, centred @param {number} w @param {number} h @param {number} d @param {number} [r] @param {number} [s] */
const box = (w, h, d, r = Math.min(w, h, d) * .12, s = 1) => GEO.rbox(w, h, d, Math.min(r, w / 2, h / 2, d / 2) * .999, s);
/** move a geometry @param {THREE.BufferGeometry} g @param {number} x @param {number} y @param {number} z */
const at = (g, x, y, z) => g.translate(x, y, z);
/** a solid of revolution about x from closed [r, x] points @param {V2[]} pts @param {number} [seg] */
const latheX = (pts, seg = 48) => GEO.lathe(pts, seg).rotateZ(-Math.PI / 2);
/** about z @param {V2[]} pts @param {number} [seg] */
const latheZ = (pts, seg = 48) => GEO.lathe(pts, seg).rotateX(Math.PI / 2);
/** a closed cylinder from a to b @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function cyl(a, b, r, seg = 24) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b), len = A.distanceTo(B);
	const g = GEO.disc(r, len, Math.min(r, len) * .06, seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a plain, light cylinder from a to b (a bar, a tube, a strap) @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function bar(a, b, r, seg = 12) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three.CylinderGeometry(r, r, A.distanceTo(B), seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a coil spring along +y, light: `turns` turns of wire round radius R over `len` @param {number} R @param {number} wire @param {number} turns @param {number} len @param {number} [seg] @param {number} [radial] */
function coil(R, wire, turns, len, seg = 90, radial = 6) {
	const pts = [];
	for (let i = 0; i <= seg; i++) {
		const t = i / seg, a = t * turns * Math.PI * 2;
		pts.push(new three.Vector3(R * Math.cos(a), t * len, R * Math.sin(a)));
	}
	return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire, radial, false);
}
/** the coil builder, under a name a spring's options do not hide */
const coilOf = (R, w, n, len, seg, rad) => coil(R, w, n, len, seg, rad);
/** a hose, a pipe or a rope through points @param {V3[]} pts @param {number} r @param {number} [radial] */
const hose = (pts, r, radial = 12) => GEO.pipe(pts, r, {
	seg: Math.max(16, pts.length * 10),
	radial,
	tension: .5
});
/** one hex head at a point, its axis along `dir` @param {V3} p @param {V3} dir @param {number} s @param {number} h */
function hex(p, dir, s, h) {
	const g = new three.CylinderGeometry(s, s, h, 6).translate(0, h / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()));
	return g.translate(...p);
}
/** a shape drawn in a side's plane, as (z, y) points, for `onX` @param {V2[]} pts zy points @returns {V2[]} */
const zy = (pts) => pts.map(([z, y]) => [-z, y]);
/** a plate drawn in (z, y) (by `zy`) turned to stand in the plane x = x0, its thickness along x @param {THREE.BufferGeometry} g @param {number} x0 */
const onX = (g, x0) => g.rotateY(Math.PI / 2).translate(x0, 0, 0);
/** a shape drawn as (x, z) points, for `onY` @param {V2[]} pts @returns {V2[]} */
const xz = (pts) => pts.map(([x, z]) => [x, -z]);
/** a plate drawn in (x, z) (by `xz`) laid flat at height y0 @param {THREE.BufferGeometry} g @param {number} y0 */
const onY = (g, y0) => g.rotateX(-Math.PI / 2).translate(0, y0, 0);
/**
* A solid of revolution about x through a closed [r, x, tag] profile at the angles given (radians, one turn, rising),
* each vertex's radius changed by `bump(r, x, ring, tag)`: a tyre's lugs. Corners sharper than 30° along the profile
* stay crisp (GEO.lathe's way); rings close together make crisp walls round it.
* @param {[number, number, number?][]} pts @param {number[]} angles @param {(r: number, x: number, ring: number, tag: number) => number} bump
*/
function revolveX(pts, angles, bump) {
	let p = pts.map(([r, x, t]) => [
		Math.max(0, r),
		x,
		t ?? 0
	]);
	let area = 0;
	for (let i = 0; i < p.length; i++) {
		const a = p[i], b = p[(i + 1) % p.length];
		area += a[0] * b[1] - b[0] * a[1];
	}
	if (area < 0) p.reverse();
	const n0 = p.length, cosT = Math.cos(three.MathUtils.degToRad(30));
	const dir = (a, b) => {
		const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
	};
	const crease = (i) => {
		const u = dir(p[(i - 1 + n0) % n0], p[i]), v = dir(p[i], p[(i + 1) % n0]);
		return u[0] * v[0] + u[1] * v[1] < cosT;
	};
	let s0 = 0;
	for (let i = 0; i < n0; i++) if (crease(i)) {
		s0 = i;
		break;
	}
	const flags = p.map((_, i) => crease(i));
	p = [...p.slice(s0), ...p.slice(0, s0)];
	const cf = [...flags.slice(s0), ...flags.slice(0, s0)];
	const out = [p[0]];
	for (let i = 1; i < n0; i++) {
		out.push(p[i]);
		if (cf[i]) out.push(p[i]);
	}
	out.push(p[0]);
	const P = out.length, N = angles.length;
	const pos = new Float32Array(N * P * 3), uv = new Float32Array(N * P * 2);
	for (let i = 0; i < N; i++) {
		const c = Math.cos(angles[i]), s = Math.sin(angles[i]);
		for (let j = 0; j < P; j++) {
			const [r, x, t] = out[j], rr = bump(r, x, i, t), k = i * P + j;
			pos.set([
				x,
				rr * c,
				rr * s
			], k * 3);
			uv.set([i / N, j / (P - 1)], k * 2);
		}
	}
	const idx = [];
	for (let i = 0; i < N; i++) {
		const i2 = (i + 1) % N;
		for (let j = 0; j < P - 1; j++) {
			const a = i * P + j, b = i2 * P + j, c = i2 * P + j + 1, d = i * P + j + 1;
			idx.push(a, b, d, b, c, d);
		}
	}
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.BufferAttribute(pos, 3));
	g.setAttribute("uv", new three.BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
/** the running gear's palette (AirSup's measured presets), for any vehicle to take or override */
function vehicleMaterials() {
	return {
		tyre: MAT.rubber({
			color: [
				.022,
				.022,
				.024
			],
			roughness: .86
		}),
		rimSteel: MAT.paint({
			color: [
				.42,
				.43,
				.44
			],
			roughness: .38,
			clearcoat: .2,
			metalness: .55
		}),
		rimAlloy: MAT.aluminium({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .24,
			finish: "turned"
		}),
		rimDark: MAT.paint({
			color: [
				.06,
				.065,
				.07
			],
			roughness: .35,
			clearcoat: .5,
			metalness: .4
		}),
		chrome: MAT.chrome({ roughness: .1 }),
		disc: MAT.steel({
			color: [
				.46,
				.46,
				.46
			],
			roughness: .34,
			finish: "turned",
			cap: [
				.62,
				.61,
				.6
			]
		}),
		castIron: MAT.castIron(),
		calliper: MAT.paint({
			color: [
				.05,
				.05,
				.055
			],
			roughness: .5,
			clearcoat: .2
		}),
		zinc: MAT.steel({
			color: [
				.55,
				.56,
				.57
			],
			roughness: .32,
			finish: "cast"
		}),
		forged: MAT.steelDark({ roughness: .4 }),
		chassis: MAT.paint({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .55,
			clearcoat: .1
		}),
		spring: MAT.paint({
			color: [
				.025,
				.025,
				.027
			],
			roughness: .4,
			clearcoat: .5,
			metalness: .3
		}),
		damper: MAT.paint({
			color: [
				.04,
				.04,
				.045
			],
			roughness: .35,
			clearcoat: .3
		}),
		rod: MAT.chrome({ roughness: .08 }),
		bush: MAT.rubber({ color: [
			.03,
			.03,
			.032
		] }),
		boot: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		})
	};
}
/** @typedef {ReturnType<typeof vehicleMaterials>} VehicleMats */
/**
* A copy of `mat` that the section cuts with its first plane alone (the lengthwise one), not with the two together.
* The two planes take away the near corner above the cut's height, and a part that hangs just under that height across
* the vehicle's end (a bumper, its number plate) is left as a sliver a few cm thick, its cap floating in the air
* beside the cut-away body. Cut lengthwise instead, its near half goes and its far half shows a clean cap at the middle.
* It keeps the cap shading (shared with `mat`) and the live planes, not copies of them.
* @template {THREE.Material} M
* @param {M} mat
* @returns {M}
*/
function halfCut(mat) {
	const c = mat.clone();
	c.clippingPlanes = [LAB_PLANES[0]];
	c.clipIntersection = false;
	c.onBeforeCompile = mat.onBeforeCompile;
	c.customProgramCacheKey = mat.customProgramCacheKey;
	c.userData = { ...mat.userData };
	return c;
}
/**
* A tyre's measures from its marking: section width (mm), aspect ratio (%), rim diameter (inches).
* @param {number} width @param {number} aspect @param {number} rim
*/
function tyreSize(width, aspect, rim) {
	const w = width / 1e3, side = w * aspect / 100, rr = rim * .0254 / 2;
	return {
		w,
		side,
		rim: rr,
		r: rr + side,
		code: `${width}/${aspect} R${rim}`
	};
}
/** @typedef {ReturnType<typeof tyreSize>} TyreSize */
/**
* A tyre as one rubber solid round the axle: its beads on the rim's seats, its sidewalls bulging to the section width,
* rounded shoulders, a tread of ribs between circumferential grooves cut across by lugs, and the inner liner round the
* air, so a cut shows the carcass as a C round its air. `highway`: three narrow grooves, shallow lugs on the shoulders
* and staggered across the middle ribs (a light-truck tyre); `allTerrain`: three wide grooves, deep staggered blocks.
* @param {{ size: TyreSize, rimW: number, pattern?: 'highway' | 'allTerrain', pitches?: number }} o
*/
function tyreGeometry({ size, rimW, pattern = "highway", pitches = 18 }) {
	const { w, side: s, rim, r: R } = size;
	const hw = w / 2, hb = rimW / 2 + .006, tw = hw - .034;
	const hwy = pattern === "highway";
	const d = hwy ? .009 : .013, gw = hwy ? .009 : .012;
	const grooves = hwy ? [
		-.55,
		0,
		.55
	] : [
		-.5,
		0,
		.5
	];
	/** @type {[number, number, number?][]} */
	const pts = [
		[rim, -hb],
		[rim + .02, -hb - .007],
		[rim + .45 * s, -hw],
		[rim + .78 * s, -hw + .007],
		[
			R - .028,
			-hw + .02,
			1
		],
		[
			R - .008,
			-hw + .033,
			1
		],
		[
			R,
			-tw,
			1
		]
	];
	for (const g of grooves) {
		const c = g * tw;
		pts.push([
			R,
			c - gw / 2,
			1
		], [
			R - d,
			c - gw / 2 + .0015,
			2
		], [
			R - d,
			c + gw / 2 - .0015,
			2
		], [
			R,
			c + gw / 2,
			1
		]);
	}
	pts.push([
		R,
		tw,
		1
	], [
		R - .008,
		hw - .033,
		1
	], [
		R - .028,
		hw - .02,
		1
	], [rim + .78 * s, hw - .007], [rim + .45 * s, hw], [rim + .02, hb + .007], [rim, hb]);
	pts.push([rim, hb - .024], [rim + .5 * s, hw - .013], [R - .03, hw - .045], [R - .03, -hw + .045], [rim + .5 * s, -hw + .013], [rim, -hb + .024]);
	const P = Math.PI * 2 / pitches, gf = hwy ? .24 : .34, eps = P * .05;
	/** @type {number[]} */
	const angles = [];
	/** @type {number[]} */
	const inLug = [];
	for (let k = 0; k < pitches; k++) {
		const a = k * P;
		angles.push(a, a + eps, a + gf * P - eps, a + gf * P);
		inLug.push(0, 1, 1, 0);
	}
	const ribOf = (x) => grooves.filter((g) => x > g * tw).length;
	return revolveX(pts, angles, (r, x, i, tag) => {
		if (tag !== 1 || !inLug[i]) return r;
		const f = clamp((r - (R - .03)) / .03);
		const rib = ribOf(x), k = Math.floor(i / 4);
		return rib === 0 || rib === grooves.length || (k + rib) % 2 === 0 ? r - d * f : r;
	});
}
/**
* A rim's barrel: the two flanges and bead seats, the safety humps and the drop-centre well the beads go into to fit
* the tyre, as one pressed (or cast) wall of thickness t round the axle.
* @param {{ rim: number, rimW: number, t?: number, seg?: number }} o
*/
function barrelGeometry({ rim, rimW, t = .0035, seg = 30 }) {
	const a = rimW / 2, R0 = rim, hf = .0175;
	/** @type {V2[]} */
	const prof = [
		[R0 + hf + .002, -a - .008],
		[R0 + hf, -a - .003],
		[R0 + .004, -a],
		[R0, -a + .008],
		[R0, -a + .035],
		[R0 - .004, -a + .05],
		[R0 - .028, -a + .07],
		[R0 - .028, a - .042],
		[R0 - .004, a - .028],
		[R0, a - .022],
		[R0, a - .008],
		[R0 + .004, a],
		[R0 + hf, a + .003],
		[R0 + hf + .002, a + .008]
	];
	return GEO.shell(prof, t, seg).rotateZ(-Math.PI / 2);
}
/** the stud holes round a disc and its centre bore, as holes in a shape @param {THREE.Shape} s @param {number} n @param {number} pcd @param {number} hole @param {number} bore @param {number} [phase] */
function studHoles(s, n, pcd, hole, bore, phase = 0) {
	s.holes.push(circle(0, 0, bore));
	for (let k = 0; k < n; k++) {
		const a = phase + k / n * Math.PI * 2;
		s.holes.push(circle(-(pcd / 2) * Math.cos(a), pcd / 2 * Math.sin(a), hole));
	}
	return s;
}
/**
* A pressed-steel wheel: the barrel, a flat mounting face on the hub with its stud holes, a dished centre with its
* cooling vents pressed through, welded into the well. Its mounting face at x = et (outward of the rim's middle).
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, vents?: number }} o
*/
function steelRimGeometry({ rim, rimW, et, studs, pcd, vents = 8 }) {
	const R0 = rim, t = .004;
	const face = studHoles(new three.Shape().absarc(0, 0, .098, 0, Math.PI * 2, false), studs, pcd, .0075, .036);
	const ring = new three.Shape().absarc(0, 0, .16, 0, Math.PI * 2, false);
	ring.holes.push(circle(0, 0, .118));
	for (let k = 0; k < vents; k++) {
		const a = (k + .5) / vents * Math.PI * 2;
		ring.holes.push(circle(.139 * Math.cos(a), .139 * Math.sin(a), .0135));
	}
	const xr = et + .018, xw = rimW / 2 - .045;
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW
		}),
		onX(plate(face, t, 8), et + t / 2),
		GEO.shell([
			[.098, et + t],
			[.11, et + .008],
			[.118, xr]
		], t, 32).rotateZ(-Math.PI / 2),
		onX(plate(ring, t, 8), xr - t / 2),
		GEO.shell([
			[.16, xr],
			[.18, xr - .004],
			[R0 - .03, Math.min(xw, xr - .008)]
		], t, 36).rotateZ(-Math.PI / 2)
	]);
}
/**
* A cast-alloy wheel: a thick barrel, and a face of `spokes` spokes from a hub boss to the rim, its stud holes in the
* boss, its windows showing the brake behind.
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, spokes?: number }} o
*/
function alloyRimGeometry({ rim, rimW, et, studs, pcd, spokes = 6 }) {
	const Rf = rim - .004;
	const face = new three.Shape().absarc(0, 0, Rf, 0, Math.PI * 2, false);
	studHoles(face, studs, pcd, .0085, .034, Math.PI / studs);
	const spokeW = .052, rIn = .098, rOut = Rf - .022;
	for (let k = 0; k < spokes; k++) {
		const a0 = k / spokes * Math.PI * 2, a1 = (k + 1) / spokes * Math.PI * 2;
		/** @type {V2[]} */
		const win = [];
		const dIn = Math.asin(spokeW / 2 / rIn), dOut = Math.asin(spokeW * 1.25 / 2 / rOut);
		for (let j = 0; j <= 6; j++) {
			const a = a0 + dOut + (a1 - a0 - 2 * dOut) * j / 6;
			win.push([rOut * Math.cos(a), rOut * Math.sin(a)]);
		}
		for (let j = 2; j >= 0; j--) {
			const a = a0 + dIn + (a1 - a0 - 2 * dIn) * j / 2;
			win.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
		}
		face.holes.push(roundHole(win, .012));
	}
	const depth = .026;
	const faceGeo = ext(face, depth, .003, 8).rotateY(Math.PI / 2).translate(et + .012 + depth / 2, 0, 0);
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW,
			t: .0055
		}),
		faceGeo,
		latheX([
			[.036, et],
			[.09, et],
			[.09, et + .012],
			[.036, et + .012]
		], 40),
		GEO.shell([[Rf - .004, et + .014], [rim - .026, rimW / 2 - .044]], .006, 64).rotateZ(-Math.PI / 2)
	]);
}
/**
* A vented brake disc: two friction rings with radial vanes between (the air pumped out through them), on its hat.
* The hat's face (on the hub) at x = 0, the rings' middle at x = −hat.
* @param {{ r: number, rIn: number, t: number, hat: number, vanes?: number }} o
*/
function discGeometry({ r, rIn, t, hat, vanes = 28 }) {
	const f = t * .32, xm = -hat;
	/** @type {THREE.BufferGeometry[]} */
	const rings = [latheX([
		[rIn, xm + t / 2 - f],
		[r, xm + t / 2 - f],
		[r, xm + t / 2],
		[rIn, xm + t / 2]
	], 48), latheX([
		[rIn, xm - t / 2],
		[r, xm - t / 2],
		[r, xm - t / 2 + f],
		[rIn, xm - t / 2 + f]
	], 48)];
	const vane = slab(t - 2 * f + 4e-4, r - rIn - .006, .005);
	for (let k = 0; k < vanes; k++) rings.push(vane.clone().translate(xm, (r + rIn) / 2, 0).rotateX(k / vanes * Math.PI * 2));
	const hatG = latheX([
		[.036, 0],
		[rIn + .006, 0],
		[rIn + .006, xm + t / 2 - .002],
		[rIn - .002, xm + t / 2 - .002],
		[rIn - .002, -.005],
		[.036, -.005]
	], 40);
	return {
		rings: GEO.merge(rings),
		hat: hatG
	};
}
/**
* A floating calliper over a disc's back edge: the piston housing inside, the fingers outside, the bridge over the
* disc, its bracket and its bleed nipple. Centred on the disc's middle plane (x = 0), at `angle` round the axle (from +z,
* towards +y).
* @param {{ r: number, t: number, angle: number, span?: number }} o
*/
function calliperGeometry({ r, t, angle, span = .42 }) {
	/** an annular sector in the (z, y) plane as a shape for `onX` @param {number} r0 @param {number} r1 @param {number} a0 @param {number} a1 */
	const sector = (r0, r1, a0, a1) => {
		/** @type {V2[]} */
		const pts = [];
		for (let j = 0; j <= 8; j++) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]);
		}
		for (let j = 8; j >= 0; j--) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
		}
		return roundPoly(zy(pts), .008);
	};
	const a0 = angle - span / 2, a1 = angle + span / 2;
	const inner = onX(ext(sector(r - .052, r + .024, a0, a1), .034, .003), -t / 2 - .02);
	const outer = onX(ext(sector(r - .036, r + .024, a0 + .05, a1 - .05), .013, .002), t / 2 + .009);
	const bridge = onX(ext(sector(r + .006, r + .026, a0 + .03, a1 - .03), t + .03, .002), 0);
	const am = angle, rb = r + .02;
	const nipple = cyl([
		-t / 2 - .03,
		rb * Math.sin(am + .12),
		rb * Math.cos(am + .12)
	], [
		-t / 2 - .03,
		(rb + .02) * Math.sin(am + .12),
		(rb + .02) * Math.cos(am + .12)
	], .004, 8);
	return GEO.merge([
		inner,
		outer,
		bridge,
		nipple
	]);
}
/**
* A brake drum and its backing plate: the drum's face on the hub at x = 0, its finned cylinder reaching in by `depth`,
* the plate closing it with the wheel cylinder's bump and the adjuster's bung.
* @param {{ r: number, depth: number }} o
*/
function drumGeometry({ r, depth }) {
	return {
		drum: latheX([
			[.036, 0],
			[r + .004, 0],
			[r + .008, -.01],
			[r + .008, -.016],
			[r + .004, -.02],
			[r + .004, -.03],
			[r + .009, -.034],
			[r + .009, -.04],
			[r + .004, -.044],
			[r + .004, -depth],
			[r - .009, -depth],
			[r - .009, -.007],
			[.036, -.007]
		], 40),
		back: GEO.merge([
			latheX([
				[.03, -depth - .002],
				[r + .012, -depth - .002],
				[r + .012, -depth - .006],
				[r - .01, -depth - .018],
				[.03, -depth - .018]
			], 40),
			cyl([
				-depth - .012,
				r * .72,
				0
			], [
				-depth - .03,
				r * .72,
				0
			], .014, 12),
			cyl([
				-depth - .01,
				-r * .6,
				.02
			], [
				-depth - .022,
				-r * .6,
				.02
			], .009, 10)
		])
	};
}
/**
* A steering knuckle (upright) for double wishbones: the spindle into the hub, the body between the two ball joints,
* the steering arm reaching to the tie rod's end (back, or forward with `arm` 1). Its points in the wheel's frame.
* @param {{ et: number, arm?: 1 | -1 }} o
*/
function knuckleGeometry({ et, arm = -1 }) {
	const J = {
		...KNUCKLE,
		tie: [
			KNUCKLE.tie[0],
			KNUCKLE.tie[1],
			-arm * KNUCKLE.tie[2]
		]
	};
	const body = [
		cyl([
			et - .06,
			0,
			0
		], [
			J.body,
			0,
			0
		], .03, 14),
		cyl([
			J.body - .012,
			-.02,
			0
		], [
			J.body + .012,
			-.02,
			0
		], .05, 14),
		cyl([
			J.body,
			.02,
			0
		], [
			J.upper[0],
			J.upper[1] - .02,
			0
		], .017, 12),
		cyl([
			J.body,
			-.03,
			0
		], [
			J.lower[0],
			J.lower[1] + .02,
			0
		], .02, 12),
		cyl([
			J.body,
			-.02,
			0
		], [
			J.tie[0],
			J.tie[1],
			J.tie[2]
		], .012, 10)
	];
	const balls = [
		new three.SphereGeometry(.022, 14, 10).translate(...J.upper),
		new three.SphereGeometry(.026, 14, 10).translate(...J.lower),
		new three.SphereGeometry(.015, 12, 8).translate(...J.tie)
	];
	return {
		body: GEO.merge(body),
		balls: GEO.merge(balls)
	};
}
/** where a steered wheel's joints are, in its frame (+x out): the upper and lower ball joints, the tie rod's end, the knuckle's body */
const KNUCKLE = {
	upper: [
		-.112,
		.165,
		0
	],
	lower: [
		-.128,
		-.15,
		0
	],
	tie: [
		-.12,
		-.04,
		-.15
	],
	body: -.085
};
/**
* @typedef {object} CornerOptions
* @property {string} id short: fl, fr, rl, rr
* @property {string} label "front left"
* @property {V3} at the wheel's middle (in `parent`'s frame)
* @property {1 | -1} side which way its outer face looks (x)
* @property {TyreSize} size
* @property {number} rimW the rim's width between its flanges (m)
* @property {number} [et] how far out of the rim's middle its face on the hub is (m)
* @property {'steel' | 'alloy'} rim
* @property {number} studs @property {number} pcd the studs, on their circle's diameter (m)
* @property {'disc' | 'drum'} brake
* @property {{ r: number, rIn: number, t: number }} [disc]
* @property {{ r: number, depth: number }} [drum]
* @property {boolean} [steers] a knuckle and a steering axis
* @property {1 | -1} [arm] its steering arm reaches forward (1, the tie rods in front of the axle) or back (−1)
* @property {'highway' | 'allTerrain'} [pattern]
* @property {string} assembly @property {string} [source] @property {string} [drive]
* @property {[string, string][]} [specs] more of the wheel's numbers
* @property {import('$lib/assets/parts.js').How['tag']} [tag] a label on the tyre
* @property {VehicleMats} M
* @property {THREE.Material} [rimMat] @property {THREE.Material} [capMat]
* @property {THREE.Object3D} [parent]
*/
/**
* One wheel at its corner, in its parts: the tyre on its rim with its nuts and hub cap (`wheel-<id>`), the brake disc
* or drum and its hub (`brake-<id>`), the calliper or the backing plate (`calliper-<id>`), and on a steered wheel the
* knuckle (`knuckle-<id>`). A corner group at the wheel's middle (mirrored for a wheel whose outer face looks to −x),
* a steer group in it turning about the kingpin, and the wheel and brake spinning about the axle.
* @param {Kit} kit @param {CornerOptions} o
*/
function wheelCorner(kit, o) {
	const { M, size } = o, et = o.et ?? .03;
	const corner = new three.Group();
	corner.name = `corner-${o.id}`;
	corner.position.set(...o.at);
	corner.scale.x = o.side;
	(o.parent ?? kit.root).add(corner);
	const steer = new three.Group();
	steer.name = `steer-${o.id}`;
	corner.add(steer);
	const m = (g, mat) => kit.mesh(g, mat);
	const pcdR = o.pcd / 2;
	const wheel = new three.Group();
	const tyre = m(tyreGeometry({
		size,
		rimW: o.rimW,
		pattern: o.pattern ?? "highway"
	}), M.tyre);
	const rimGeo = o.rim === "alloy" ? alloyRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	}) : steelRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	});
	const faceX = o.rim === "alloy" ? et + .026 : et + .004;
	const phase = o.rim === "alloy" ? Math.PI / o.studs : 0;
	/** where stud k is round the axle (y, z) */
	const stud = (k) => {
		const a = phase + k / o.studs * Math.PI * 2;
		return [pcdR * Math.sin(a), pcdR * Math.cos(a)];
	};
	const ks = Array.from({ length: o.studs }, (_, k) => k);
	const nuts = GEO.merge(ks.map((k) => hex([
		faceX,
		stud(k)[0],
		stud(k)[1]
	], [
		1,
		0,
		0
	], .0115, .02)));
	const studs = GEO.merge(ks.map((k) => cyl([
		et - .02,
		stud(k)[0],
		stud(k)[1]
	], [
		faceX + .026,
		stud(k)[0],
		stud(k)[1]
	], .0065, 8)));
	const cap = o.rim === "alloy" ? latheX([
		[0, faceX - .004],
		[.032, faceX - .004],
		[.031, faceX + .004],
		[.022, faceX + .009],
		[0, faceX + .01]
	], 32) : latheX([
		[0, et + .004],
		[.052, et + .004],
		[.05, et + .016],
		[.038, et + .03],
		[.018, et + .037],
		[0, et + .039]
	], 40);
	wheel.add(tyre, m(rimGeo, o.rimMat ?? (o.rim === "alloy" ? M.rimAlloy : M.rimSteel)), m(nuts, M.chrome), m(studs, M.zinc), m(cap, o.capMat ?? M.chrome));
	const rimIn = Math.round(size.rim * 2 / .0254);
	kit.part(wheel, {
		id: `wheel-${o.id}`,
		label: `Wheel and tyre, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: `A ${size.code} tyre on a ${o.rim === "alloy" ? "cast-alloy" : "pressed-steel"} ${rimIn}" rim, held on the hub by ${o.studs} nuts: its beads sit on the rim's seats, its air carries the load, its tread grips the road.`,
		moves: o.steers ? "Rolls with the road and steers with the knuckle (shown turning 10 times slower)." : "Rolls with the road (shown turning 10 times slower).",
		drive: o.drive ?? "The road; its brake stops it",
		specs: [
			["Tyre", size.code],
			["Outer diameter", `${Math.round(size.r * 2e3)} mm`],
			["Rim", `${rimIn}" × ${(o.rimW / .0254).toFixed(1)}", ${o.studs} studs on ${Math.round(o.pcd * 1e3 * 10) / 10} mm`],
			...o.specs ?? []
		]
	}, {
		explode: [
			.42,
			0,
			0
		],
		tag: o.tag
	}, steer);
	const brake = new three.Group();
	const hubFlange = latheX([
		[.03, et - .006],
		[.082, et - .006],
		[.082, et - .018],
		[.05, et - .022],
		[.05, et - .06],
		[.03, et - .06]
	], 40);
	brake.add(m(hubFlange, M.forged));
	/** @type {THREE.BufferGeometry | null} */
	let back = null;
	if (o.brake === "disc" && o.disc) {
		const d = discGeometry({
			r: o.disc.r,
			rIn: o.disc.rIn,
			t: o.disc.t,
			hat: .042
		});
		brake.add(m(d.rings.translate(et - .006, 0, 0), M.disc), m(d.hat.translate(et - .006, 0, 0), M.castIron));
	} else if (o.drum) {
		const d = drumGeometry(o.drum);
		brake.add(m(d.drum.translate(et - .006, 0, 0), M.castIron));
		back = d.back.translate(et - .006, 0, 0);
	}
	kit.part(brake, o.brake === "disc" && o.disc ? {
		id: `brake-${o.id}`,
		label: `Brake disc, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A vented cast-iron disc bolted to the hub between it and the wheel: the calliper squeezes it, and its vanes pump air through it to carry the heat away.",
		moves: "Turns with the wheel.",
		drive: "The wheel; the calliper stops it",
		specs: [["Diameter", `${Math.round(o.disc.r * 2e3)} mm`], ["Thickness", `${Math.round(o.disc.t * 1e3)} mm, vented`]]
	} : {
		id: `brake-${o.id}`,
		label: `Brake drum, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A finned cast-iron drum on the hub: two shoes inside it, pushed out by the wheel cylinder, rub on its inner face. Cheap, sealed from the dust and good for a handbrake.",
		moves: "Turns with the wheel.",
		drive: "The wheel; its shoes stop it",
		specs: [["Diameter", `${Math.round((o.drum?.r ?? 0) * 2e3)} mm`], ["Width", `${Math.round((o.drum?.depth ?? 0) * 1e3 - 15)} mm shoes`]]
	}, { explode: [
		.22,
		0,
		0
	] }, steer);
	const still = new three.Group();
	if (o.brake === "disc" && o.disc) {
		const cal = calliperGeometry({
			r: o.disc.r,
			t: o.disc.t,
			angle: Math.PI * .9
		}).translate(et - .048, 0, 0);
		still.add(m(cal, M.calliper));
		still.add(m(hose([
			[
				et - .08,
				.06,
				-.12
			],
			[
				et - .13,
				.12,
				-.08
			],
			[
				et - .16,
				.2,
				-.04
			]
		], .0045, 8), M.boot));
	} else if (back) still.add(m(back, M.castIron), m(hose([
		[
			et - .1,
			o.drum ? o.drum.r * .72 : .1,
			0
		],
		[
			et - .16,
			.12,
			.03
		],
		[
			et - .2,
			.13,
			.06
		]
	], .003, 6), M.zinc));
	kit.part(still, o.brake === "disc" ? {
		id: `calliper-${o.id}`,
		label: `Brake calliper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A floating calliper over the disc’s back edge: the brake fluid pushes its piston, which presses the inner pad on the disc and pulls the outer pad on from the other side.",
		specs: [["Pistons", "2 × Ø 51 mm [inferred]"], ["Pads", "Semi-metallic"]]
	} : {
		id: `calliper-${o.id}`,
		label: `Backing plate, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The pressed-steel plate that closes the drum: it carries the two shoes, their springs, the wheel cylinder and the handbrake’s lever, bolted to the axle’s end.",
		specs: [["Wheel cylinder", "Ø 22 mm [inferred]"], ["Handbrake", "Cable, on these shoes"]]
	}, { explode: [
		.14,
		.12,
		0
	] }, steer);
	if (o.steers) {
		const k = knuckleGeometry({
			et,
			arm: o.arm ?? -1
		});
		kit.part(new three.Group().add(m(k.body, M.castIron), m(k.balls, M.forged)), {
			id: `knuckle-${o.id}`,
			label: `Steering knuckle, ${o.label}`,
			assembly: o.assembly,
			source: o.source,
			what: "The cast upright between the two wishbones’ ball joints: it carries the hub’s bearings on its spindle, the calliper on its bracket, and turns about the line through its ball joints (the kingpin axis) when the tie rod pulls its steering arm.",
			moves: "Steers about its ball joints; rides up and down with the wheel.",
			drive: "The tie rod, from the steering",
			specs: [["Material", "Nodular cast iron [inferred]"], ["Steering lock", "±38° [inferred]"]]
		}, { explode: [
			.08,
			0,
			0
		] }, steer);
	}
	/** the joints of its knuckle, in the frame `corner` hangs in */
	const joint = (p) => [
		o.at[0] + o.side * p[0],
		o.at[1] + p[1],
		o.at[2] + p[2]
	];
	return {
		corner,
		steer,
		wheel,
		brake,
		joints: {
			upper: joint(KNUCKLE.upper),
			lower: joint(KNUCKLE.lower),
			tie: joint([
				KNUCKLE.tie[0],
				KNUCKLE.tie[1],
				-(o.arm ?? -1) * KNUCKLE.tie[2]
			])
		},
		/** roll it to `turn` (rad, forward positive) and steer it `steerAngle` (rad, to the left positive) @param {number} turn @param {number} [steerAngle] */
		set(turn, steerAngle = 0) {
			wheel.rotation.x = brake.rotation.x = turn;
			steer.rotation.y = steerAngle * o.side;
		}
	};
}
/**
* A hinge: a pivot group on the hinge line at `at` in `parent`; what is built in it (in its frame, the hinge line
* through its origin along `axis`) turns by `max` × k as `set(k)` opens it, 0 shut … 1 open. Hand the pivot to
* `kit.part` as the door's own part: the exploded view moves it, the hinge turns it.
* @param {THREE.Object3D} parent @param {{ at: V3, axis?: 'x' | 'y' | 'z', max: number, name?: string }} o
*/
function hinge(parent, { at, axis = "y", max, name = "hinge" }) {
	const pivot = new three.Group();
	pivot.name = name;
	pivot.position.set(...at);
	parent.add(pivot);
	const h = {
		pivot,
		k: 0,
		max,
		/** @param {number} k */
		set(k) {
			h.k = clamp(k);
			pivot.rotation[axis] = max * h.k;
		}
	};
	return h;
}
/**
* A slide: a carriage running along a track of points (offsets from where it rests, in its parent's frame) as
* `set(k)` takes it from shut (0) to open (1), at an even speed along the track: a sliding door's arms and rails.
* @param {THREE.Object3D} parent @param {{ path: V3[], name?: string }} o
*/
function slide(parent, { path, name = "slide" }) {
	const carriage = new three.Group();
	carriage.name = name;
	parent.add(carriage);
	const pts = path.map((p) => new three.Vector3(...p));
	const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
	const total = lens.reduce((a, b) => a + b, 0);
	const s = {
		carriage,
		k: 0,
		/** @param {number} k */
		set(k) {
			s.k = clamp(k);
			let d = s.k * total, i = 0;
			while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
			carriage.position.copy(pts[i]).lerp(pts[i + 1], lens[i] > 0 ? Math.min(1, d / lens[i]) : 0);
		}
	};
	return s;
}
/**
* A telescopic damper, with a coil spring round it if `coil` is given: its body's eye at `a`, its rod's eye at `b`;
* `set(a, b)` re-aims it and slides the rod in or out (both points in its parent's frame). Built along +y.
* @param {{ body: number, rod: number, rBody: number, rRod?: number, coil?: { R: number, wire: number, turns: number, seat: number }, M: VehicleMats, mesh: Kit['mesh'] }} o
*/
function telescope({ body, rod, rBody, rRod = .009, coil, M, mesh }) {
	const coilGeo = coilOf;
	const group = new three.Group();
	const eye = (y) => new three.TorusGeometry(.016, .006, 8, 16).rotateY(Math.PI / 2).translate(0, y, 0);
	const bodyG = GEO.merge([GEO.lathe([
		[0, .014],
		[rBody, .014],
		[rBody, body],
		[rBody * .6, body + .008],
		[0, body + .008]
	], 24), eye(0)]);
	group.add(mesh(bodyG, M.damper));
	const top = new three.Group();
	top.add(mesh(GEO.merge([GEO.lathe([
		[0, -rod],
		[rRod, -rod],
		[rRod, -.012],
		[0, -.012]
	], 16), eye(0)]), M.rod));
	/** @type {THREE.Mesh | null} */
	let spring = null;
	if (coil) {
		top.add(mesh(GEO.lathe([
			[rRod, -.026],
			[coil.R + .012, -.026],
			[coil.R + .012, -.018],
			[rRod, -.018]
		], 32), M.zinc));
		group.add(mesh(GEO.lathe([
			[rBody, coil.seat - .004],
			[coil.R + .012, coil.seat - .004],
			[coil.R + .012, coil.seat + .004],
			[rBody, coil.seat + .004]
		], 32), M.zinc));
		spring = mesh(coilGeo(coil.R, coil.wire, coil.turns, 1, 110, 6), M.spring);
		spring.position.y = coil.seat + .004;
		group.add(spring);
	}
	group.add(top);
	const A = new three.Vector3(), B = new three.Vector3(), up = new three.Vector3(0, 1, 0);
	return {
		group,
		/** @param {V3} a @param {V3} b */
		set(a, b) {
			A.set(...a);
			B.set(...b);
			group.position.copy(A);
			const L = A.distanceTo(B);
			group.quaternion.setFromUnitVectors(up, B.clone().sub(A).normalize());
			top.position.y = L;
			if (spring && coil) spring.scale.y = Math.max(.05, L - .026 - (coil.seat + .004));
			return L;
		}
	};
}
/**
* A leaf spring: `n` steel leaves stacked under the main leaf (the longest, an eye rolled at each end), curved up at
* its ends by `camber` over its middle; `set(camber)` bends it (it flattens as its load grows). Along z, its middle on
* the origin at the main leaf's middle.
* @param {{ L: number, w: number, t: number, n: number, camber: number }} o
*/
function leafPack({ L, w, t, n, camber }) {
	const segs = 14, ring = 8;
	const leaves = Array.from({ length: n }, (_, i) => ({
		len: L * (1 - i * (.62 / Math.max(1, n - 1))),
		y: -i * t
	}));
	const nv = leaves.length * 128;
	const pos = new Float32Array(nv * 3);
	/** @type {number[]} */
	const idx = [];
	let v = 0;
	const base = leaves.map(() => {
		const b = v;
		v += 128;
		return b;
	});
	leaves.forEach((_, li) => {
		const b = base[li];
		for (let s = 0; s < segs; s++) for (let f = 0; f < 4; f++) {
			const a0 = b + s * ring + f * 2, a1 = a0 + 1, c0 = a0 + ring, c1 = a1 + ring;
			idx.push(a0, c0, a1, a1, c0, c1);
		}
		const e0 = b + 120, e1 = e0 + 4;
		idx.push(e0, e0 + 1, e0 + 2, e0, e0 + 2, e0 + 3, e1, e1 + 2, e1 + 1, e1, e1 + 3, e1 + 2);
	});
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.BufferAttribute(pos, 3));
	geo.setIndex(idx);
	const eyes = [new three.Group(), new three.Group()];
	const set = (c) => {
		const yAt = (z) => c * (2 * z / L) ** 2;
		leaves.forEach((lf, li) => {
			const b = base[li];
			/** the four faces' corners, each face its own pair so its edges stay crisp */
			const corners = (z) => {
				const y = yAt(z) + lf.y, x = w / 2, h = t / 2 - 4e-4;
				return [
					[-x, y + h],
					[x, y + h],
					[x, y + h],
					[x, y - h],
					[x, y - h],
					[-x, y - h],
					[-x, y - h],
					[-x, y + h]
				];
			};
			for (let s = 0; s <= segs; s++) {
				const z = -lf.len / 2 + lf.len * s / segs;
				corners(z).forEach(([x, y], k) => pos.set([
					x,
					y,
					z
				], (b + s * ring + k) * 3));
			}
			for (const [e, z] of [[0, -lf.len / 2], [4, lf.len / 2]]) {
				const y = yAt(z) + lf.y, h = t / 2 - 4e-4;
				[
					[-w / 2, y + h],
					[w / 2, y + h],
					[w / 2, y - h],
					[-w / 2, y - h]
				].forEach(([x, yy], k) => pos.set([
					x,
					yy,
					z
				], (b + 120 + e + k) * 3));
			}
		});
		geo.attributes.position.needsUpdate = true;
		geo.computeVertexNormals();
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
		eyes[0].position.set(0, yAt(-L / 2) + .012, -L / 2);
		eyes[1].position.set(0, yAt(L / 2) + .012, L / 2);
	};
	set(camber);
	return {
		geo,
		eyes,
		eye: new three.TorusGeometry(.016, t * .75, 8, 18).rotateY(Math.PI / 2),
		set
	};
}
/**
* The road's load on a vehicle (N) and the power at its wheels to hold the speed (W): rolling, climbing and the air.
* @param {{ m: number, Crr: number, CdA: number, rho?: number }} car mass (kg), rolling coefficient, drag area (m²)
* @param {number} v speed (m/s) @param {number} grade rise over run (0.1 = 10 %)
*/
function roadLoad({ m, Crr, CdA, rho = RHO_AIR }, v, grade) {
	const th = Math.atan(grade);
	const roll = m * G * Crr * Math.cos(th) * Math.min(1, v / .3);
	const climb = m * G * Math.sin(th);
	const air = .5 * rho * CdA * v * v;
	const F = roll + climb + air;
	return {
		roll,
		climb,
		air,
		F,
		P: F * v,
		th
	};
}
/**
* @typedef {object} Engine an engine as the solver runs it
* @property {number[]} rpm @property {number[]} nm its full-load (brake) torque curve
* @property {number} idle @property {number} stall @property {number} max rpm: at idle, where it stalls under load, its limit
* @property {number} up @property {number} down the driver changes up past `up`, never runs it under `down`
* @property {number} launch the speed the driver holds it at with the clutch slipping, pulling away
* @property {number} Vd displacement (m³) @property {number} fmep its friction mean effective pressure at 2,000 rpm (Pa)
* @property {number} bsfc indicated specific fuel consumption (g/kWh) @property {keyof typeof FUELS} fuel
* @property {number} J the engine's, flywheel's and clutch's inertia (kg·m²)
*/
/**
* @typedef {object} Vehicle a wheeled machine as the solver runs it
* @property {number} kerb kg, ready to drive with its driver @property {number} payload kg it may carry
* @property {number} Crr @property {number} CdA m² @property {number} r the tyres' rolling radius (m)
* @property {number} eta the gearbox's and the axle's efficiency together
* @property {number[]} gears @property {number} final the axle's ratio
* @property {Engine} engine
* @property {number} Jw one wheel's inertia with its tyre and brake (kg·m²) @property {number} wheels
* @property {{ wb: number, h: number, front: number, loadFront: number, k: [number, number], travel: [number, number] }} axles
*   the wheelbase and the centre of mass's height (m), the kerb's and the load's share on the front axle, each wheel's
*   spring rate front and rear (N/m) and how far each may rise to its bump stop from the kerb's ride height (m)
*/
/** "1st", "2nd" … @param {number} n */
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
/**
* A vehicle on the road, stepped in time: a driver holding the speed asked on the grade asked with the load asked,
* changing gear, braking downhill; the engine's speed, torque and fuel; the springs' sag. When the road takes more than
* first gear can give, the speed falls, the engine lugs and stalls, and it stays stalled until `restart`.
* @param {Vehicle} V
*/
function vehicleSolver(V) {
	const E = V.engine;
	const iTot = (g) => V.gears[g - 1] * V.final;
	const tmax = (n) => table(E.rpm, E.nm, n);
	/** the engine's own friction (N·m): its friction mean effective pressure over its displacement, rising with speed */
	const tfric = (n) => E.fmep * (.7 + .15 * n / 1e3) * E.Vd / (4 * Math.PI);
	const rpmOf = (v, g) => v / V.r * iTot(g) * 60 / (2 * Math.PI);
	/** the most the wheels can be pushed in a gear at a speed (N) */
	const fMax = (g, v) => tmax(Math.max(rpmOf(v, g), E.launch)) * iTot(g) * V.eta / V.r;
	/** the mass as the road feels it in a gear: the wheels' and the engine's turning inertia added */
	const mEff = (m, g) => m + (V.wheels * V.Jw + E.J * iTot(g) ** 2 * V.eta) / V.r ** 2;
	const s = {
		v: 0,
		gear: 1,
		rpm: E.idle,
		theta: 0,
		Te: 0,
		Fd: 0,
		Fb: 0,
		a: 0,
		m: V.kerb,
		road: roadLoad({
			m: V.kerb,
			Crr: V.Crr,
			CdA: V.CdA
		}, 0, 0),
		Pw: 0,
		Pe: 0,
		fuel: 0,
		l100: 0,
		launch: false,
		running: true,
		stalled: false,
		why: "",
		need: 0,
		can: 0,
		shiftT: 0,
		sagF: 0,
		sagR: 0,
		loadF: 0,
		loadR: 0,
		bottomed: false,
		wheelAng: 0,
		engAng: 0,
		propAng: 0,
		at: {
			vSet: 0,
			grade: 0,
			load: 0
		}
	};
	/** the gear a driver picks for a speed and a push: the highest that gives it without lugging, else the strongest */
	const pick = (v, F) => {
		let best = 1, bestF = -Infinity;
		for (let g = V.gears.length; g >= 1; g--) {
			const n = rpmOf(v, g);
			if (n > E.max * .96) continue;
			const f = fMax(g, v);
			if (f > bestF) {
				bestF = f;
				best = g;
			}
			if (n < E.down && g > 1) continue;
			if (f >= F * 1.08) return g;
		}
		return best;
	};
	/**
	* @typedef {{ vSet: number, grade: number, load: number }} Input speed asked (m/s), grade (rise over run), load (kg)
	* @param {number} dt @param {Input} inp
	*/
	function step(dt, inp) {
		if (s.stalled) {
			if (Math.abs(inp.vSet - s.at.vSet) > .1 || Math.abs(inp.grade - s.at.grade) > .002 || Math.abs(inp.load - s.at.load) > 1) restart();
		}
		const sub = 10, h = dt / sub;
		s.m = V.kerb + inp.load;
		for (let k = 0; k < sub; k++) {
			const rl = roadLoad({
				m: s.m,
				Crr: V.Crr,
				CdA: V.CdA
			}, s.v, inp.grade);
			s.road = rl;
			const vT = s.stalled ? 0 : inp.vSet;
			const aWant = clamp((vT - s.v) / 2.5, -3, 1.5);
			let mE = mEff(s.m, s.gear);
			if (s.stalled) {
				s.rpm = approach(s.rpm, 0, .12, h);
				s.theta = s.Te = s.Fd = 0;
				s.v = Math.max(0, s.v - 5 * h);
				s.Fb = s.v > 0 ? s.m * 5 : Math.max(0, rl.climb);
				s.a = s.v > 0 ? -5 : 0;
				continue;
			}
			if (vT < .05 && s.v < .05) {
				s.v = 0;
				s.a = 0;
				s.launch = false;
				s.gear = 1;
				s.rpm = approach(s.rpm, E.idle, .3, h);
				s.theta = 0;
				s.Te = 0;
				s.Fd = 0;
				s.Fb = Math.max(0, rl.climb);
				continue;
			}
			s.shiftT -= h;
			if (s.shiftT <= 0) {
				const g = pick(s.v, rl.F + mE * Math.max(0, aWant));
				if (g !== s.gear) {
					s.gear += Math.sign(g - s.gear);
					s.shiftT = .9;
					mE = mEff(s.m, s.gear);
				}
			}
			const nWheels = rpmOf(s.v, s.gear);
			if (s.gear === 1 && nWheels < E.launch && (s.launch || s.v < .3)) s.launch = true;
			if (nWheels >= E.launch || s.gear > 1) s.launch = false;
			const n = s.launch ? E.launch : nWheels;
			const Tm = tmax(n), Tf = tfric(n), i = iTot(s.gear);
			const Fwant = rl.F + mE * aWant;
			const th = clamp((Fwant * V.r / (i * V.eta) + Tf) / (Tm + Tf));
			const Te = th * (Tm + Tf) - Tf;
			const Fd = Te >= 0 ? Te * i * V.eta / V.r : Te * i / (V.eta * V.r);
			const Fb = aWant < 0 ? Math.max(0, Fd - Fwant) : 0;
			const net = Fd - Fb - rl.F;
			s.a = net / mE;
			s.v = Math.max(0, s.v + s.a * h);
			s.theta = th;
			s.Te = Te;
			s.Fd = Fd;
			s.Fb = Fb;
			s.rpm = s.launch ? E.launch : rpmOf(s.v, s.gear);
			const lugged = !s.launch && s.gear === 1 && s.rpm < E.stall && th > .9;
			const noPull = s.launch && s.v <= 0 && net <= 0 && th > .99;
			if (lugged || noPull) {
				s.stalled = true;
				s.running = false;
				s.why = lugged ? "lugged" : "pull";
				s.need = rl.F;
				s.can = fMax(1, s.v);
				s.at = {
					vSet: inp.vSet,
					grade: inp.grade,
					load: inp.load
				};
			}
		}
		const w = s.rpm * 2 * Math.PI / 60;
		s.Pw = s.Fd * s.v;
		s.Pe = s.stalled ? 0 : s.Te * w;
		const overrun = s.theta < .01 && s.rpm > E.idle * 1.3;
		const indicated = s.stalled || overrun ? 0 : Math.max(0, s.Te + tfric(s.rpm)) * w;
		s.fuel = indicated * E.bsfc / 36e5 / FUELS[E.fuel].rho * 3600;
		s.l100 = s.v > .5 ? s.fuel / (s.v * 3.6) * 100 : 0;
		const kF = V.kerb * V.axles.front * G, kR = V.kerb * G - kF;
		const lF = inp.load * V.axles.loadFront * G, lR = inp.load * G - lF;
		const transfer = s.m * (Math.max(-6, Math.min(6, s.a)) + G * Math.sin(s.road.th)) * V.axles.h / V.axles.wb;
		s.loadF = (kF + lF - transfer) / 2;
		s.loadR = (kR + lR + transfer) / 2;
		/** a spring's rise from the kerb's ride height, stiffened tenfold on its bump stop */
		const sag = (dF, k, travel) => {
			const x = dF / k;
			return x > travel ? travel + (x - travel) / 10 : x;
		};
		const sF = sag((lF - transfer) / 2, V.axles.k[0], V.axles.travel[0]), sR = sag((lR + transfer) / 2, V.axles.k[1], V.axles.travel[1]);
		s.bottomed = sF > V.axles.travel[0] || sR > V.axles.travel[1];
		s.sagF = approach(s.sagF, sF, .25, dt);
		s.sagR = approach(s.sagR, sR, .25, dt);
		s.wheelAng += s.v / V.r / 10 * dt;
		s.engAng += w / 40 * dt;
		s.propAng += s.v / V.r * V.final / 40 * dt;
	}
	/** the key turned: it starts in first, on the clutch */
	function restart() {
		s.stalled = false;
		s.running = true;
		s.gear = 1;
		s.launch = true;
		s.rpm = E.idle;
		s.why = "";
	}
	/** start it already running at the speed asked, in the gear for it, settled @param {Input} inp */
	function settle(inp) {
		s.v = inp.vSet;
		s.m = V.kerb + inp.load;
		s.gear = s.v > .5 ? pick(s.v, roadLoad({
			m: s.m,
			Crr: V.Crr,
			CdA: V.CdA
		}, s.v, inp.grade).F) : 1;
		s.rpm = s.v > .5 ? rpmOf(s.v, s.gear) : E.idle;
		for (let k = 0; k < 120; k++) step(.05, inp);
		s.wheelAng = s.engAng = s.propAng = 0;
	}
	return {
		s,
		step,
		settle,
		restart,
		rpmOf,
		fMax,
		tmax,
		tfric,
		iTot,
		pick
	};
}
const _pa = /* @__PURE__ */ (() => new three.Vector3())();
const _pb = /* @__PURE__ */ (() => new three.Vector3())();
const _up = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
/**
* Stand an object built along +y from its origin between two points (in its parent's frame): a link, a rod, an arm's
* leg, a shaft. With `stretch` it is built one metre long and stretched to reach.
* @param {THREE.Object3D} obj @param {V3} a @param {V3} b @param {boolean} [stretch]
*/
function aim(obj, a, b, stretch = false) {
	_pa.set(...a);
	_pb.set(...b).sub(_pa);
	const L = _pb.length();
	obj.position.copy(_pa);
	if (L > 1e-9) obj.quaternion.setFromUnitVectors(_up, _pb.divideScalar(L));
	if (stretch) obj.scale.set(1, Math.max(1e-4, L), 1);
	return L;
}
/** a point of a moving frame (the sprung body) where it is now in its parent's frame @param {THREE.Object3D} frame @param {V3} p @returns {V3} */
function inFrame(frame, p) {
	const v = new three.Vector3(...p).applyMatrix4(frame.matrix);
	return [
		v.x,
		v.y,
		v.z
	];
}
/** a bar one metre long along +y from its origin, for `aim(…, true)` @param {number} r @param {number} [seg] */
const unitBar = (r, seg = 10) => new three.CylinderGeometry(r, r, 1, seg, 1).translate(0, .5, 0);
/**
* A light spur gear (or sprocket, or ring gear) about z: square-cut teeth on its rim, its web between them and its
* bore. Centred on z = 0.
* @param {{ r: number, width: number, module?: number, bore?: number }} o r the pitch radius
*/
function spurGeometry({ r, width, module = .004, bore = .012 }) {
	const teeth = Math.max(8, Math.round(2 * r / module));
	const P = Math.PI * 2 / teeth;
	/** @type {number[]} */
	const angles = [];
	for (let k = 0; k < teeth; k++) angles.push(k * P, k * P + .38 * P, k * P + .5 * P, k * P + .88 * P);
	const rr = r - module, rt = r + module;
	return revolveX([
		[bore, -width / 2],
		[
			rr,
			-width / 2,
			1
		],
		[
			rr,
			width / 2,
			1
		],
		[bore, width / 2]
	], angles, (rad, _x, i, tag) => tag === 1 && i % 4 < 2 ? rt : rad).rotateY(-Math.PI / 2);
}
/**
* The outline round a set of pulleys: their convex hull, each pulley's arc joined to the next by a tangent. `grow`
* widens every pulley (a belt's outer face, or a cover over them).
* @param {[number, number, number][]} cs pulleys [x, y, r] @param {number} [grow]
*/
function beltShape(cs, grow = 0) {
	const s = new three.Shape();
	traceBelt(cs, grow, s);
	return s;
}
/** the same outline as a hole @param {[number, number, number][]} cs @param {number} [grow] */
function beltHole(cs, grow = 0) {
	const p = new three.Path();
	traceBelt(cs, grow, p);
	return p;
}
/** @param {[number, number, number][]} cs @param {number} grow @param {THREE.Path} path */
function traceBelt(cs, grow, path) {
	const cx = cs.reduce((s, c) => s + c[0], 0) / cs.length, cy = cs.reduce((s, c) => s + c[1], 0) / cs.length;
	const P = [...cs].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)).map(([x, y, r]) => [
		x,
		y,
		r + grow
	]);
	const n = P.length;
	/** the outer tangent's normal angle from pulley i to pulley j, going round anticlockwise */
	const beta = (i, j) => {
		const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], L = Math.hypot(dx, dy);
		return Math.atan2(dy, dx) - Math.acos(clamp((P[i][2] - P[j][2]) / L, -1, 1));
	};
	for (let i = 0; i < n; i++) {
		const a0 = beta((i - 1 + n) % n, i);
		let a1 = beta(i, (i + 1) % n);
		while (a1 < a0) a1 += Math.PI * 2;
		if (i === 0) path.moveTo(P[i][0] + P[i][2] * Math.cos(a0), P[i][1] + P[i][2] * Math.sin(a0));
		path.absarc(P[i][0], P[i][1], P[i][2], a0, a1, false);
	}
	path.closePath();
	return path;
}
/** a belt round pulleys: its band `t` thick and `w` wide, about z @param {[number, number, number][]} cs @param {number} t @param {number} w */
function beltGeometry(cs, t, w) {
	const s = beltShape(cs, t);
	s.holes.push(beltHole(cs, 0));
	return plate(s, w, 8);
}
/**
* A ladder frame: two box-section rails along z through their centre line's (z, y) points, kicked up where the points
* rise (over an axle), joined by tubular crossmembers.
* @param {{ x: number, w: number, h: number, t: number, path: V2[], cross: number[], rCross?: number }} o the rails'
*   middles at ±x, each w wide, h deep, its wall t; its path [z, y] front to back; the crossmembers' z
*/
function ladderFrame({ x, w, h, t, path, cross, rCross = .036 }) {
	const sec = rrect(w, h, .008);
	sec.holes.push(roundHole([
		[-w / 2 + t, -h / 2 + t],
		[w / 2 - t, -h / 2 + t],
		[w / 2 - t, h / 2 - t],
		[-w / 2 + t, h / 2 - t]
	], .004));
	/** @type {THREE.BufferGeometry[]} */
	const out = [];
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
		for (const sx of [-1, 1]) out.push(plate(sec, L + h * .25, 4).rotateX(-a).translate(sx * x, (y0 + y1) / 2, (z0 + z1) / 2));
	}
	for (const z of cross) out.push(GEO.tube(rCross, rCross - .004, 2 * x - w + .004, 20).rotateZ(Math.PI / 2).translate(0, frameY(path, z), z));
	return GEO.merge(out);
}
/** the height of a frame's rails at z, along its path @param {V2[]} path @param {number} z */
function frameY(path, z) {
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		if ((z - z0) * (z - z1) <= 0) return z0 === z1 ? y0 : y0 + (y1 - y0) * (z - z0) / (z1 - z0);
	}
	return path[z > path[0][0] ? 0 : path.length - 1][1];
}
/** the engine room's palette */
function engineMaterials() {
	return {
		block: MAT.castIron({ color: [
			.2,
			.21,
			.22
		] }),
		head: MAT.aluminium({
			color: [
				.72,
				.73,
				.74
			],
			roughness: .48
		}),
		cover: MAT.paint({
			color: [
				.035,
				.035,
				.04
			],
			roughness: .5,
			clearcoat: .2
		}),
		pan: MAT.paint({
			color: [
				.045,
				.045,
				.05
			],
			roughness: .55,
			clearcoat: .1
		}),
		piston: MAT.aluminiumMachined({
			roughness: .3,
			color: [
				.78,
				.78,
				.77
			]
		}),
		rod: MAT.steelDark({ roughness: .36 }),
		crank: MAT.steel({
			roughness: .16,
			color: [
				.6,
				.6,
				.6
			],
			cap: [
				.8,
				.79,
				.76
			],
			capRough: .3
		}),
		gear: MAT.steel({
			roughness: .2,
			finish: "turned",
			cap: [
				.82,
				.81,
				.78
			]
		}),
		belt: MAT.rubber({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .7
		}),
		plastic: MAT.plastic({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .5
		}),
		alloy: MAT.aluminium({
			color: [
				.74,
				.75,
				.76
			],
			roughness: .42
		}),
		line: MAT.steel({
			color: [
				.62,
				.62,
				.63
			],
			roughness: .3
		}),
		manifold: MAT.castIron({
			color: [
				.26,
				.17,
				.12
			],
			roughness: .78
		}),
		oil: MAT.fluid({
			color: [
				.36,
				.2,
				.04
			],
			roughness: .06
		}),
		filter: MAT.paint({
			color: [
				.04,
				.1,
				.32
			],
			roughness: .4
		}),
		black: MAT.paint({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .45,
			clearcoat: .2
		}),
		copper: MAT.copper({ roughness: .35 }),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		friction: MAT.ceramic({
			color: [
				.22,
				.2,
				.17
			],
			roughness: .92
		}),
		hot: MAT.steel({
			color: [
				.42,
				.39,
				.36
			],
			roughness: .55,
			finish: "cast"
		}),
		hose: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		})
	};
}
/** @typedef {ReturnType<typeof engineMaterials>} EngineMats */
/**
* @typedef {object} EngineOptions
* @property {THREE.Object3D} parent @property {V3} at the crank's middle, in `parent`
* @property {number} bore @property {number} stroke @property {number} rod @property {number} pitch the bores' spacing (m)
* @property {boolean} [turbo] a turbocharger on the exhaust manifold
* @property {number} [compression] its compression ratio (22 unless said), for the head's card
* @property {boolean} [fan] an engine-driven fan on the water pump (else the radiator has its own)
* @property {'front' | 'rear'} [well] which end of the sump its deep well is at
* @property {number[]} gears the gearbox's ratios, first to top
* @property {V3} lever the gear knob (in the engine's frame)
* @property {[V3, V3]} mounts where the two mounts' rubbers sit on the frame (in the engine's frame)
* @property {V3} rearMount where the gearbox's mount sits on its crossmember (in the engine's frame)
* @property {string} assembly @property {string} gearAssembly @property {string} [source]
* @property {string} name what to call it on its cards ("2.4 L diesel")
* @property {[string, string][]} specs the engine's numbers, for the block's card
* @property {EngineMats} M
* @property {() => string} [tag] the engine's label @property {() => string} [gearTag] the gearbox's
*/
/**
* A four-cylinder inline diesel and its gearbox, each part a mechanic would name as its own solid: the block with its
* bores through it, the head, the camshaft and valves under the cover, the crankshaft with its counterweights, the
* pistons on their rods, the flywheel and clutch, the sump with its oil, the timing belt under its cover, the
* accessory belt over the pulleys of the water pump and alternator, the injection pump and its four lines, the
* manifolds, the starter, the oil filter, the mounts; then the bellhousing and the gearbox with its shafts and gears
* inside, and the lever. In the engine's frame: the crank along z through the origin, the timing end at +z.
* @param {Kit} kit @param {EngineOptions} o
*/
function inlineEngine(kit, o) {
	const { M } = o;
	const r = o.stroke / 2, L = o.rod, p = o.pitch, R = o.bore / 2, n = 4;
	const ch = .05;
	const deck = r + L + ch;
	const lb = n * p / 2 + .02;
	const bw = o.bore + .09;
	const yb = deck - o.stroke - .05;
	const pan = -.075;
	const zc = (i) => (3 / 2 - i) * p;
	const phase = (i) => i === 0 || i === 3 ? 0 : Math.PI;
	const E = new three.Group();
	E.name = "engine";
	E.position.set(...o.at);
	o.parent.add(E);
	const m = (g, mat) => kit.mesh(g, mat);
	/** @param {any} info @param {THREE.Object3D[]} objs @param {import('$lib/assets/parts.js').How} [how] */
	const part = (info, objs, how = {}) => {
		const g = new three.Group();
		g.add(...objs);
		return kit.part(g, {
			assembly: o.assembly,
			source: o.source,
			...info
		}, how, E);
	};
	const spin = () => new three.Group();
	const litres = (n * Math.PI * R * R * o.stroke * 1e3).toFixed(2);
	{
		const top = rrect(bw, 2 * lb, .012);
		for (let i = 0; i < n; i++) top.holes.push(circle(0, -zc(i), R));
		/** @type {THREE.BufferGeometry[]} */
		const g = [onY(plate(top, deck - yb, 28), (deck + yb) / 2)];
		for (const sx of [-1, 1]) {
			const s = new three.Shape();
			s.moveTo(sx * (bw / 2 - .012), yb + .004);
			s.lineTo(sx * (bw / 2), yb + .004);
			s.lineTo(sx * (bw / 2 + .03), pan);
			s.lineTo(sx * (bw / 2 + .018), pan);
			s.closePath();
			g.push(plate(s, 2 * lb, 2));
			g.push(at(box(.03, .07, .09, .006), sx * (bw / 2 + .03), .06, .02));
		}
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			const s = rrect(bw + .03, yb - pan, .004, 0, (yb + pan) / 2);
			s.holes.push(circle(0, 0, .033));
			g.push(plate(s, .022, 20).translate(0, 0, z));
		}
		const rail = rrect(bw + .08, 2 * lb, .01);
		rail.holes.push(rrect(bw + .02, 2 * lb - .03, .006));
		g.push(onY(plate(rail, .012, 6), -.06899999999999999));
		part({
			id: "block",
			label: `Cylinder block, ${o.name}`,
			what: `The cast-iron block: four ${Math.round(o.bore * 1e3)} mm bores bored through its deck, water round them, the crankcase under them with five bulkheads that carry the crankshaft’s main bearings. Everything else on the engine bolts to it.`,
			specs: [["Displacement", `${litres} L (${Math.round(o.bore * 1e3)} × ${Math.round(o.stroke * 1e3)} mm)`], ...o.specs]
		}, [m(GEO.merge(g), M.block)], {
			explode: [
				0,
				0,
				0
			],
			tag: o.tag ? {
				text: o.name,
				at: [
					bw / 2 + .03,
					deck - .05,
					0
				],
				value: o.tag,
				side: "right"
			} : void 0
		});
	}
	part({
		id: "head",
		label: "Cylinder head",
		what: "The aluminium head closing the bores: its ports, the valves’ seats and guides, the camshaft’s bearings and the injectors’ wells; held down on its gasket by ten long bolts.",
		specs: [
			["Material", "Cast aluminium alloy"],
			["Valves", "2 a cylinder, 8 in all"],
			["Compression", `${o.compression ?? 22} : 1 [inferred]`]
		]
	}, [m(at(box(bw + .02, .1, 2 * lb, .008), 0, deck + .054, 0), M.head), m(at(slab(bw + .01, .004, 2 * lb - .01), 0, deck + .002, 0), M.copper)], { explode: [
		0,
		.2,
		0
	] });
	part({
		id: "cam-cover",
		label: "Cam cover",
		what: "The pressed cover over the camshaft and valves, keeping their oil in; its cap is where the oil goes in.",
		specs: [["Material", "Pressed steel, painted"]]
	}, [m(at(box(bw - .008, .07, 2 * lb - .02, .026), 0, deck + .139, 0), M.cover), m(cyl([
		0,
		deck + .172,
		lb - .08
	], [
		0,
		deck + .19,
		lb - .08
	], .024, 24), M.yellow)], {
		explode: [
			0,
			.42,
			0
		],
		xray: "shell"
	});
	const cam = spin();
	{
		const lobe = new three.Shape();
		lobe.absarc(0, 0, .019, Math.PI * .15, Math.PI * .85, true);
		lobe.lineTo(0, .03);
		lobe.closePath();
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			0,
			0,
			-lb + .01
		], [
			0,
			0,
			lb + .03
		], .012, 14)];
		for (let i = 0; i < n; i++) for (const [dz, ph] of [[.022, 0], [-.022, 1.6]]) g.push(ext(lobe, .014, .001, 6).rotateZ(-phase(i) / 2 - ph - i * .9).translate(0, 0, zc(i) + dz));
		cam.add(m(GEO.merge(g), M.crank));
		cam.position.set(0, deck + .13, 0);
		const valves = [];
		for (let i = 0; i < n; i++) for (const dz of [.022, -.022]) {
			valves.push(m(GEO.merge([
				cyl([
					0,
					deck + .004,
					zc(i) + dz
				], [
					0,
					deck + .1,
					zc(i) + dz
				], .0035, 8),
				latheZ([
					[0, 0],
					[.016, 0],
					[.016, .003],
					[.004, .012],
					[0, .012]
				], 12).rotateX(-Math.PI / 2).translate(0, deck + .001, zc(i) + dz),
				cyl([
					0,
					deck + .098,
					zc(i) + dz
				], [
					0,
					deck + .111,
					zc(i) + dz
				], .016, 10)
			]), M.gear));
			valves.push(m(coil(.012, .0022, 6, .055, 40, 5).translate(0, deck + .042, zc(i) + dz), M.black));
		}
		part({
			id: "camshaft",
			label: "Camshaft and valves",
			what: "One overhead camshaft, turned by the timing belt at half the crank’s speed: its lobes push the eight valves open through their buckets, their springs close them.",
			moves: "Turns at half the crank’s speed (shown 40 times slower).",
			drive: "The timing belt",
			specs: [["Valves", "8, 2 a cylinder"], ["Drive", "Toothed belt, 2 : 1"]]
		}, [cam, ...valves], { explode: [
			0,
			.3,
			0
		] });
	}
	const crank = spin();
	{
		const web = new three.Shape();
		web.moveTo(.0733, -.0267);
		web.lineTo(.036, r);
		web.absarc(0, r, .036, 0, Math.PI, false);
		web.lineTo(-.0733, -.0267);
		web.absarc(0, 0, .078, 200 * Math.PI / 180, 340 * Math.PI / 180, false);
		const g = [];
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			g.push(cyl([
				0,
				0,
				z - .014
			], [
				0,
				0,
				z + .014
			], .03, 16));
		}
		for (let i = 0; i < n; i++) {
			const ph = phase(i), px = r * Math.sin(ph), py = r * Math.cos(ph);
			g.push(cyl([
				px,
				py,
				zc(i) - .017
			], [
				px,
				py,
				zc(i) + .017
			], .028, 16));
			for (const s of [-1, 1]) g.push(ext(web, .018, .0015, 6).rotateZ(-ph).translate(0, 0, zc(i) + s * .026));
		}
		g.push(cyl([
			0,
			0,
			lb - .012
		], [
			0,
			0,
			lb + .1
		], .022, 20), cyl([
			0,
			0,
			-lb + .012
		], [
			0,
			0,
			-lb - .02
		], .05, 28));
		crank.add(m(GEO.merge(g), M.crank));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			what: "The forged crankshaft on its five main bearings: its four pins, two up and two down, turn the pistons’ push into torque; the counterweights opposite them balance it.",
			moves: "Turns at the engine’s speed (shown 40 times slower).",
			drive: "The pistons, through the rods",
			specs: [
				["Stroke", `${Math.round(o.stroke * 1e3)} mm`],
				["Main bearings", "5"],
				["Firing order", "1-3-4-2"]
			]
		}, [crank], { explode: [
			0,
			-.45,
			0
		] });
	}
	/** @type {THREE.Group[]} */
	const pistons = [];
	/** @type {THREE.Group[]} */
	const rods = [];
	{
		const Rp = R - 5e-4;
		/** @type {V2[]} */
		const prof = [
			[0, .042],
			[R * .3, .033],
			[R * .56, .048],
			[Rp, ch]
		];
		for (const y of [.041, .031000000000000003]) prof.push([Rp, y], [Rp - .003, y], [Rp - .003, y - .002], [Rp, y - .002]);
		prof.push([Rp, -.035], [R - .006, -.035], [R - .006, .020000000000000004], [0, .020000000000000004]);
		const pg = latheY(prof, 24);
		const pin = cyl([
			-(R - .004),
			0,
			0
		], [
			R - .004,
			0,
			0
		], .0135, 16);
		const rod = new three.Shape();
		const R1 = .045, R2 = .022, wb = .016, wt = .01;
		const y1 = Math.sqrt(R1 * R1 - wb * wb), y2 = L - Math.sqrt(R2 * R2 - wt * wt);
		rod.moveTo(wb, y1);
		rod.absarc(0, 0, R1, Math.atan2(y1, wb), Math.atan2(y1, -.016), true);
		rod.lineTo(-.01, y2);
		rod.absarc(0, L, R2, Math.atan2(y2 - L, -.01), Math.atan2(y2 - L, wt), true);
		rod.closePath();
		rod.holes.push(circle(0, 0, .0285), circle(0, L, .0137));
		const rodG = GEO.merge([
			ext(rod, .024, .0015, 7),
			cyl([
				.033,
				-.03,
				0
			], [
				.033,
				.012,
				0
			], .006, 8),
			cyl([
				-.033,
				-.03,
				0
			], [
				-.033,
				.012,
				0
			], .006, 8)
		]);
		for (let i = 0; i < n; i++) {
			const pis = new three.Group();
			pis.add(m(pg, M.piston), m(pin, M.crank));
			pis.position.z = zc(i);
			pistons.push(pis);
			const rd = new three.Group();
			rd.add(m(rodG, M.rod));
			rd.position.z = zc(i);
			rods.push(rd);
		}
		part({
			id: "pistons",
			label: "Pistons",
			count: 4,
			what: "Four cast-aluminium pistons, the combustion bowl in each crown where the fuel is sprayed, three rings sealing them in their bores; each pushed down by its burning charge.",
			moves: "Up and down their bores (shown 40 times slower).",
			drive: "The burning charge; they drive the rods",
			specs: [["Diameter", `${Math.round(o.bore * 1e3)} mm`], ["Rings", "2 compression, 1 oil"]]
		}, pistons, { explode: [
			0,
			.62,
			0
		] });
		part({
			id: "rods",
			label: "Connecting rods",
			count: 4,
			what: "Forged steel I-section rods from each piston’s pin to its crank pin, their big ends split and bolted round the pins on shell bearings.",
			moves: "Swing and slide with the pistons.",
			drive: "The pistons; they drive the crankshaft",
			specs: [["Length", `${Math.round(L * 1e3)} mm between centres`]]
		}, rods, { explode: [
			0,
			.52,
			0
		] });
	}
	const fly = spin();
	const clutchSpin = spin();
	fly.add(m(GEO.merge([latheZ([
		[.05, 0],
		[.15, 0],
		[.15, -.03],
		[.11, -.03],
		[.11, -.018],
		[.05, -.018]
	], 48), spurGeometry({
		r: .163,
		width: .018,
		module: .008,
		bore: .148
	}).translate(0, 0, -.012)]), M.gear));
	fly.position.z = -lb - .02;
	part({
		id: "flywheel",
		label: "Flywheel",
		what: "A heavy steel disc on the crank’s back end: it carries the engine through the strokes between firings and is the clutch’s friction face; the starter turns its ring gear.",
		moves: "Turns with the crankshaft.",
		specs: [["Ring gear", "60 teeth [inferred]"]]
	}, [fly], { explode: [
		0,
		0,
		-.32
	] });
	clutchSpin.add(m(GEO.merge([GEO.shell([
		[.14, 0],
		[.14, -.022],
		[.06, -.034]
	], .004, 40).rotateX(Math.PI / 2)]), M.gear), m(latheZ([
		[.075, .002],
		[.122, .002],
		[.122, -.006],
		[.075, -.006]
	], 40), M.friction));
	clutchSpin.position.z = -lb - .054;
	part({
		id: "clutch",
		label: "Clutch",
		what: "A friction disc pressed against the flywheel by the cover’s diaphragm spring: it passes the engine’s torque to the gearbox, and slips to let the vehicle pull away.",
		moves: "Turns with the flywheel; slips while it pulls away.",
		drive: "The pedal, through its cable and release bearing",
		specs: [["Disc", "Ø 240 mm, dry single plate [inferred]"]]
	}, [clutchSpin], { explode: [
		0,
		0,
		-.5
	] });
	{
		const sw = bw + .05, deep = o.well === "front" ? 1 : -1;
		const ring = (w, l, t) => {
			const s = rrect(w, l, .025);
			s.holes.push(rrect(w - 2 * t, l - 2 * t, .02));
			return s;
		};
		const half = lb - .01, z0 = deep * half / 2;
		const g = [
			onY(plate(ring(sw, 2 * half, .003), .06, 8), -.105),
			onY(plate(rrect(sw, half, .025), .003, 8), -.135).translate(0, 0, -z0),
			onY(plate(ring(sw, half, .003), .1, 8), -.185).translate(0, 0, z0),
			onY(plate(rrect(sw, half, .025), .003, 8), -.235).translate(0, 0, z0),
			cyl([
				0,
				-.235,
				z0
			], [
				0,
				-.247,
				z0
			], .01, 6)
		];
		part({
			id: "sump",
			label: "Sump",
			what: "The pressed-steel oil pan under the crankcase, deep at one end where the pump’s pickup draws the oil; its drain plug at the bottom.",
			specs: [["Oil", "6.5 L, 15W-40 [inferred]"]]
		}, [m(GEO.merge(g), M.pan), m(at(box(sw - .01, .07, half - .01, .01), 0, -.197, z0), M.oil)], {
			explode: [
				0,
				-.3,
				0
			],
			xray: "shell"
		});
	}
	const tCrank = spin(), tCam = spin(), tPump = spin();
	const pumpXY = [bw / 2 + .06, .1];
	{
		const cs = [
			[
				0,
				0,
				.03
			],
			[
				0,
				deck + .13,
				.06
			],
			[
				pumpXY[0],
				pumpXY[1],
				.06
			]
		];
		const zt = lb + .022;
		const cover = ext(beltShape(cs, .024), .032, .003, 8).translate(0, 0, zt + .006);
		tCrank.add(m(spurGeometry({
			r: .03,
			width: .024,
			module: .004,
			bore: .022
		}), M.gear));
		tCam.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tPump.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tCrank.position.set(0, 0, zt);
		tCam.position.set(0, deck + .13, zt);
		tPump.position.set(pumpXY[0], pumpXY[1], zt);
		part({
			id: "timing",
			label: "Timing belt and cover",
			what: "A toothed belt from the crank to the camshaft and the injection pump, both turning at half the crank’s speed so each valve and each squirt of fuel comes at its stroke; under its plastic cover.",
			moves: "The belt runs round its three sprockets.",
			drive: "The crankshaft",
			specs: [["Belt", "Toothed, 25 mm wide [inferred]"], ["Change", "Every 100,000 km [inferred]"]]
		}, [
			tCrank,
			tCam,
			tPump,
			m(beltGeometry(cs, .006, .025).translate(0, 0, zt), M.belt),
			m(cover, M.plastic)
		], { explode: [
			0,
			.12,
			.38
		] });
	}
	const aCrank = spin(), aPump = spin(), aAlt = spin();
	const wpXY = [-.03, .2], altXY = [-(bw / 2 + .09), .09];
	const za = lb + .08;
	{
		const groove = (rr, w) => latheZ([
			[.02, -w / 2],
			[rr, -w / 2],
			[rr - .006, 0],
			[rr, w / 2],
			[.02, w / 2]
		], 40);
		aCrank.add(m(GEO.merge([groove(.075, .022), latheZ([
			[.02, .011],
			[.06, .011],
			[.06, .03],
			[.02, .03]
		], 40)]), M.black));
		aPump.add(m(groove(.055, .022), M.black));
		aAlt.add(m(groove(.032, .02), M.gear));
		aCrank.position.set(0, 0, za);
		aPump.position.set(wpXY[0], wpXY[1], za);
		aAlt.position.set(altXY[0], altXY[1], za);
		const cs = [
			[
				0,
				0,
				.073
			],
			[
				wpXY[0],
				wpXY[1],
				.053
			],
			[
				altXY[0],
				altXY[1],
				.03
			]
		];
		const pumpBody = GEO.merge([cyl([
			wpXY[0],
			wpXY[1],
			lb + .04
		], [
			wpXY[0],
			wpXY[1],
			za - .01
		], .022, 16), at(box(.1, .1, .03, .01), wpXY[0], wpXY[1] - .02, lb + .045)]);
		part({
			id: "accessory-drive",
			label: "Accessory belt and water pump",
			what: "A V-belt from the crank’s pulley (its damper behind) round the water pump’s and the alternator’s: the pump drives the coolant through the block, the head and the radiator.",
			moves: "The belt and pulleys turn with the engine.",
			drive: "The crankshaft",
			specs: [["Belt", "V-belt, 10 mm [inferred]"], ["Water pump", "Centrifugal, ~120 L/min at 4,000 rpm [inferred]"]]
		}, [
			aCrank,
			aPump,
			m(beltGeometry(cs, .008, .012).translate(0, 0, za), M.belt),
			m(pumpBody, M.alloy)
		], { explode: [
			0,
			.06,
			.6
		] });
		part({
			id: "alternator",
			label: "Alternator",
			what: "Turned by the belt at about 2.5 times the crank’s speed, it charges the battery and runs the lights.",
			moves: "Its rotor and pulley turn with the belt.",
			drive: "The accessory belt",
			specs: [["Output", "14 V, 70 A [inferred]"]]
		}, [m(GEO.merge([latheZ([
			[0, -.11],
			[.058, -.11],
			[.062, -.09],
			[.062, -.02],
			[.05, 0],
			[0, 0]
		], 32).translate(altXY[0], altXY[1], za - .016), at(box(.03, .05, .04, .004), altXY[0] + .05, altXY[1] - .04, za - .08)]), M.alloy), aAlt], { explode: [
			-.3,
			0,
			.3
		] });
		if (o.fan) {
			const fan = spin();
			fan.add(m(GEO.rotor({
				count: 7,
				axis: "z",
				r0: .055,
				r1: .2,
				chord: [.05, .065],
				thick: .06,
				camber: .08,
				twist: .4,
				pitch: .45,
				nS: 5,
				nC: 7
			}), M.plastic), m(latheZ([
				[0, 0],
				[.06, 0],
				[.065, .02],
				[.06, .045],
				[0, .045]
			], 32).translate(0, 0, -.045), M.alloy));
			fan.position.set(wpXY[0], wpXY[1], za + .06);
			aPump.userData.fan = fan;
			part({
				id: "fan",
				label: "Fan and viscous coupling",
				what: "Seven plastic blades on the water pump’s hub through a viscous coupling: it pulls air through the radiator, slipping when the air is cool.",
				moves: "Turns with the water pump.",
				drive: "The water pump",
				specs: [["Diameter", "400 mm [inferred]"]]
			}, [fan], { explode: [
				0,
				.1,
				.8
			] });
		}
	}
	{
		const [px, py] = pumpXY, z0 = lb - 0, z1 = lb - .21;
		const body = GEO.merge([
			latheZ([
				[0, 0],
				[.05, 0],
				[.05, -.12],
				[.045, -.13],
				[.045, -.21],
				[0, -.21]
			], 32).translate(px, py, z0),
			at(box(.07, .06, .06, .008), px, py + .055, z0 - .17),
			cyl([
				px,
				py + .08,
				z0 - .06
			], [
				px + .02,
				py + .11,
				z0 - .06
			], .006, 8)
		]);
		const lines = [], inj = [];
		const ix = bw / 2 + .012, iy = deck + .03;
		for (let i = 0; i < n; i++) {
			const sx = px - .02 + i % 2 * .04, sz = z1 + .045 + Math.floor(i / 2) * .03;
			lines.push(hose([
				[
					sx,
					py + .085,
					sz
				],
				[
					sx + .01,
					py + .12,
					sz
				],
				[
					ix + .05,
					iy + 0,
					(sz + zc(i)) / 2
				],
				[
					ix + .035,
					iy,
					zc(i)
				]
			], .003, 6));
			inj.push(cyl([
				ix - .01,
				iy,
				zc(i)
			], [
				ix + .04,
				iy,
				zc(i)
			], .011, 12), hex([
				ix + .012,
				iy,
				zc(i)
			], [
				1,
				0,
				0
			], .014, .012));
		}
		const glow = [];
		for (let i = 0; i < n; i++) glow.push(cyl([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-bw / 2 + .01,
			deck + .025,
			zc(i)
		], .005, 8), hex([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-1,
			0,
			0
		], .007, .008));
		part({
			id: "injection",
			label: "Injection pump, lines and injectors",
			what: "The distributor pump, turned by the timing belt, meters the fuel and squeezes it to some 300 bar into each injector in turn through its own steel line, at the moment its piston comes up on compression; the glow plugs on the other side warm the chambers for a cold start.",
			moves: "Its shaft turns at half the crank’s speed.",
			drive: "The timing belt",
			specs: [
				["Pump", "Rotary distributor [inferred]"],
				["Injection", "Indirect, ~130 bar opening [inferred]"],
				["Glow plugs", "4, 11 V"]
			]
		}, [
			m(body, M.alloy),
			m(GEO.merge(lines), M.line),
			m(GEO.merge(inj), M.gear),
			m(GEO.merge(glow), M.gear)
		], { explode: [
			.36,
			.1,
			0
		] });
	}
	const intakeIn = [
		bw / 2 + .085,
		deck + .09,
		-lb + .02
	];
	let exhaustOut = [
		-(bw / 2 + .065),
		deck - .06,
		-lb + .07
	];
	{
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			bw / 2 + .085,
			deck + .09,
			-lb + .03
		], [
			bw / 2 + .085,
			deck + .09,
			lb - .04
		], .034, 20)];
		for (let i = 0; i < n; i++) g.push(hose([
			[
				bw / 2 + .006,
				deck + .065,
				zc(i)
			],
			[
				bw / 2 + .04,
				deck + .07,
				zc(i)
			],
			[
				bw / 2 + .07,
				deck + .085,
				zc(i)
			]
		], .019, 12));
		part({
			id: "intake",
			label: "Intake manifold",
			what: "The cast-aluminium manifold that shares the air from the filter among the four inlet ports.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge(g), M.alloy)], { explode: [
			.42,
			.2,
			0
		] });
		/** @type {THREE.BufferGeometry[]} */
		const e = [cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .04
		], [
			-(bw / 2 + .065),
			deck + .045,
			lb - .04
		], .03, 20), cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .07
		], [
			-(bw / 2 + .065),
			deck - .05,
			-lb + .07
		], .028, 16)];
		for (let i = 0; i < n; i++) e.push(hose([
			[
				-bw / 2 - .006,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .035,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .06,
				deck + .045,
				zc(i)
			]
		], .019, 12));
		/** @type {THREE.Mesh[]} */
		const parts = [m(GEO.merge(e), M.manifold)];
		if (o.turbo) {
			const tx = -(bw / 2 + .12), ty = deck - .02, tz = -lb + .09;
			parts.push(m(GEO.merge([latheX([
				[0, -.07],
				[.055, -.07],
				[.07, -.05],
				[.07, -.02],
				[.03, -.012],
				[.03, .012],
				[.065, .02],
				[.075, .045],
				[.06, .07],
				[0, .07]
			], 32).translate(tx, ty, tz)]), M.hot));
			parts.push(m(hose([
				[
					tx,
					ty + .07,
					tz
				],
				[
					tx + .02,
					deck + .2,
					tz + .1
				],
				[
					0,
					deck + .22,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .13,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .1,
					lb - .04
				]
			], .028, 14), M.alloy));
			exhaustOut = [
				tx - .02,
				ty - .07,
				tz
			];
		}
		part(o.turbo ? {
			id: "exhaust-manifold",
			label: "Exhaust manifold and turbocharger",
			what: "The cast-iron manifold gathers the four cylinders’ gas into the turbocharger’s turbine; its compressor on the same shaft pushes the air into the intake at up to 0.9 bar.",
			moves: "The turbo’s shaft spins at up to 150,000 rpm (not shown turning).",
			drive: "The exhaust gas",
			specs: [["Boost", "0.9 bar [inferred]"], ["Manifold", "Cast iron"]]
		} : {
			id: "exhaust-manifold",
			label: "Exhaust manifold",
			what: "The cast-iron manifold gathering the four cylinders’ hot gas into the downpipe.",
			specs: [["Material", "Cast iron"], ["Gas", "Up to ~650 °C at full load [inferred]"]]
		}, parts, { explode: [
			-.42,
			.18,
			0
		] });
	}
	{
		part({
			id: "oil-filter",
			label: "Oil filter and dipstick",
			what: "A spin-on full-flow filter that the oil pump pushes all the oil through before the bearings; the dipstick to check its level.",
			specs: [["Filter", "Spin-on, Ø 93 mm [inferred]"]]
		}, [
			m(cyl([
				bw / 2 + .03,
				0,
				-.08
			], [
				bw / 2 + .12,
				-.04,
				-.08
			], .046, 28), M.filter),
			m(hose([
				[
					-bw / 2 - .004,
					.04,
					.05
				],
				[
					-bw / 2 - .03,
					deck - .05,
					.07
				],
				[
					-bw / 2 - .035,
					deck + .13,
					.08
				]
			], .005, 8), M.line),
			m(cyl([
				-bw / 2 - .035,
				deck + .13,
				.08
			], [
				-bw / 2 - .035,
				deck + .15,
				.08
			], .012, 12), M.yellow)
		], { explode: [
			.3,
			-.1,
			0
		] });
		const sx = -.155, sy = -.075;
		part({
			id: "starter",
			label: "Starter motor",
			what: "A 12 V motor on the bellhousing’s flange: its solenoid throws its pinion into the flywheel’s ring gear and it spins the engine to start it.",
			specs: [["Power", "2.2 kW, 12 V [inferred]"]]
		}, [m(GEO.merge([cyl([
			sx,
			sy,
			-lb - .02
		], [
			sx,
			sy,
			-lb + .15
		], .045, 24), cyl([
			-.125,
			-.024999999999999994,
			-lb + 0
		], [
			-.125,
			-.024999999999999994,
			-lb + .11
		], .026, 16)]), M.black)], { explode: [
			-.3,
			-.12,
			0
		] });
	}
	{
		const g = [], rub = [];
		for (const [k, mp] of o.mounts.entries()) {
			const from = [
				(k === 0 ? 1 : -1) * (bw / 2 + .045),
				.06,
				.02
			];
			g.push(cyl(from, [
				mp[0],
				mp[1] + .045,
				mp[2]
			], .012, 10), at(box(.07, .008, .08, .002), mp[0], mp[1] + .05, mp[2]), at(box(.08, .008, .09, .002), mp[0], mp[1] - .004, mp[2]));
			rub.push(cyl([
				mp[0],
				mp[1],
				mp[2]
			], [
				mp[0],
				mp[1] + .046,
				mp[2]
			], .032, 20));
		}
		const rm = o.rearMount;
		g.push(at(box(.12, .008, .07, .002), rm[0], rm[1] + .045, rm[2]), at(box(.14, .008, .08, .002), rm[0], rm[1] - .004, rm[2]));
		rub.push(cyl([
			rm[0],
			rm[1],
			rm[2]
		], [
			rm[0],
			rm[1] + .042,
			rm[2]
		], .035, 20));
		part({
			id: "engine-mounts",
			label: "Engine and gearbox mounts",
			count: 3,
			what: "Rubber blocks between the engine’s brackets and the frame, and under the gearbox’s tail: they carry its weight and its torque and keep its shake out of the body.",
			specs: [["Rubber", "Bonded, ~55 Shore A [inferred]"]]
		}, [m(GEO.merge(g), M.black), m(GEO.merge(rub), M.hose)], { explode: [
			0,
			-.2,
			0
		] });
	}
	const zg = -lb - .2, zt = zg - .32, zo = zt - .16;
	const gin = spin(), glay = spin(), gout = spin(), flange = spin();
	/** @type {{ g: THREE.Group, k: number }[]} */
	const freeGears = [];
	{
		const bell = GEO.shell([
			[.205, -lb - .004],
			[.205, -lb - .03],
			[.175, -lb - .1],
			[.13, -lb - .17],
			[.11, zg]
		], .007, 48).rotateX(Math.PI / 2);
		const flangeR = latheZ([
			[.11, -lb + .002],
			[.215, -lb + .002],
			[.215, -lb - .012],
			[.11, -lb - .012]
		], 48);
		const caseG = GEO.merge([at(box(.2, .25, zg - zt, .03), 0, -.04, (zg + zt) / 2), latheZ([
			[0, zt + .01],
			[.075, zt + .01],
			[.06, zt - .07],
			[.048, zo + .012],
			[0, zo + .012]
		], 32)]);
		const d = .085, c = 1.6;
		const yl = -.085;
		const sh = [cyl([
			0,
			0,
			zg + .05
		], [
			0,
			0,
			zo + .01
		], .016, 12)];
		glay.position.set(0, yl, 0);
		gin.add(m(spurGeometry({
			r: d / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03), M.gear));
		glay.add(m(GEO.merge([cyl([
			0,
			0,
			zg - .01
		], [
			0,
			0,
			zt + .02
		], .014, 12), spurGeometry({
			r: d * c / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03)]), M.gear));
		o.gears.filter((g) => Math.abs(g - 1) > .02).forEach((ig, k) => {
			const rl = d / (1 + ig / c), rm = d - rl, z = zg - .075 - k * .05;
			glay.add(m(spurGeometry({
				r: rl,
				width: .018,
				module: .005
			}).translate(0, 0, z), M.gear));
			const fg = spin();
			fg.add(m(spurGeometry({
				r: rm,
				width: .018,
				module: .005,
				bore: .018
			}), M.gear));
			fg.position.z = z;
			freeGears.push({
				g: fg,
				k: 1 / ig
			});
		});
		gout.add(m(GEO.merge(sh), M.crank));
		flange.add(m(GEO.merge([latheZ([
			[.015, 0],
			[.05, 0],
			[.05, -.012],
			[.015, -.012]
		], 24)]), M.rod));
		flange.position.z = zo;
		part({
			id: "bellhousing",
			label: "Bellhousing",
			assembly: o.gearAssembly,
			what: "The cast-aluminium bell bolted to the block’s back face round the flywheel and clutch, carrying the gearbox and the starter.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge([bell, flangeR]), M.alloy)], {
			explode: [
				0,
				0,
				-.75
			],
			xray: "shell"
		});
		part({
			id: "gearbox",
			label: `Gearbox, ${o.gears.length} speeds`,
			assembly: o.gearAssembly,
			what: `A ${o.gears.length}-speed manual gearbox: the input shaft from the clutch drives the layshaft below it, whose gears turn the gears riding free on the output shaft; the lever slides a synchro collar to lock one of them to the shaft (top gear locks the input to the output straight).`,
			specs: [["Ratios", o.gears.map((g) => g.toFixed(2)).join(" · ")], ["Oil", "2.2 L, 75W-90 [inferred]"]]
		}, [m(caseG, M.alloy)], {
			explode: [
				0,
				0,
				-1
			],
			xray: "shell",
			tag: o.gearTag ? {
				text: "Gearbox",
				at: [
					.1,
					.06,
					(zg + zt) / 2
				],
				value: o.gearTag,
				side: "right"
			} : void 0
		});
		part({
			id: "gear-train",
			label: "Shafts and gears",
			assembly: o.gearAssembly,
			what: "Inside the case: the input shaft and its gear, the layshaft and its cluster, the output shaft with the gears that ride on it, all in constant mesh; the synchro collars between them.",
			moves: "The shafts and gears turn (shown 40 times slower).",
			drive: "The clutch",
			specs: [["Mesh", "Constant, helical in the case [simplified straight here]"]]
		}, [
			gin,
			glay,
			gout,
			...freeGears.map((f) => f.g),
			flange
		], { explode: [
			0,
			-.35,
			-1
		] });
		const lv = o.lever;
		const base = [
			0,
			.09,
			zt + .08
		];
		part({
			id: "gear-lever",
			label: "Gear lever",
			assembly: o.gearAssembly,
			what: "The lever and its rod into the gearbox’s selector: across to pick a gate, forward and back to choose a gear.",
			moves: "Moved by hand; the solver changes gear by itself.",
			specs: [["Pattern", o.gears.length === 5 ? "1-2 · 3-4 · 5-R" : "1-2 · 3-4"]]
		}, [
			m(GEO.merge([cyl(base, lv, .008, 10)]), M.crank),
			m(new three.SphereGeometry(.024, 16, 12).translate(...lv), M.black),
			m(latheY([
				[0, -.01],
				[.04, -.01],
				[.015, .07],
				[0, .07]
			], 20).translate(base[0], base[1], base[2]), M.hose)
		], { explode: [
			0,
			.3,
			-.6
		] });
	}
	return {
		group: E,
		/** points of the engine (in its parent's frame) other things hang on */
		points: {
			out: [
				o.at[0],
				o.at[1],
				o.at[2] + zo - .012
			],
			exhaust: [
				o.at[0] + exhaustOut[0],
				o.at[1] + exhaustOut[1],
				o.at[2] + exhaustOut[2]
			],
			intake: [
				o.at[0] + intakeIn[0],
				o.at[1] + intakeIn[1],
				o.at[2] + intakeIn[2]
			],
			waterOut: [
				o.at[0],
				o.at[1] + deck + .08,
				o.at[2] + lb + .01
			],
			waterIn: [
				o.at[0] + wpXY[0],
				o.at[1] + wpXY[1] - .06,
				o.at[2] + lb + .05
			],
			front: o.at[2] + za + .03
		},
		size: {
			lb,
			deck,
			bw,
			za
		},
		/**
		* Turn it: the crank to `a` (rad, the shown angle), the gearbox's output with the propshaft `ap`.
		* @param {number} a @param {number} ap @param {boolean} [slipping] the clutch slipping (pulling away)
		*/
		update(a, ap, slipping = false) {
			crank.rotation.z = fly.rotation.z = clutchSpin.rotation.z = -a;
			tCrank.rotation.z = aCrank.rotation.z = -a;
			cam.rotation.z = tCam.rotation.z = tPump.rotation.z = -a / 2;
			aPump.rotation.z = -a * 1.36;
			const fan = aPump.userData.fan;
			if (fan) fan.rotation.z = -a * 1.36;
			aAlt.rotation.z = -a * 2.3;
			const ain = slipping ? -a * .6 : -a;
			gin.rotation.z = ain;
			glay.rotation.z = -ain / 1.6;
			for (const f of freeGears) f.g.rotation.z = ain * f.k;
			gout.rotation.z = flange.rotation.z = -ap;
			for (let i = 0; i < n; i++) {
				const t = a + phase(i), px = r * Math.sin(t), py = r * Math.cos(t);
				const yp = py + Math.sqrt(L * L - px * px);
				pistons[i].position.y = yp;
				rods[i].position.set(px, py, zc(i));
				rods[i].rotation.z = Math.atan2(px, yp - py);
			}
		}
	};
}
/** about +y, from [r, y] points (the plain lathe, for a symmetry about the vertical) @param {V2[]} pts @param {number} [seg] */
const latheY = (pts, seg = 48) => GEO.lathe(pts, seg);
/**
* @typedef {object} WishboneOptions
* @property {string} id @property {string} label
* @property {ReturnType<typeof wheelCorner>} corner its wheel: its ball joints and tie rod's end (in the root's frame)
* @property {THREE.Object3D} body the sprung frame the bushes, the spring's top and the rack are on
* @property {[V3, V3]} upper @property {[V3, V3]} lower each arm's front and rear bushes (in the body's frame)
* @property {V3} top the coilover's top mount (in the body's frame) @property {number} [on] how far out along the lower arm its bottom is
* @property {V3} rack the tie rod's inner end (in the body's frame)
* @property {{ R: number, wire: number, turns: number, k: number }} coil its spring and rate (N/m at the wheel)
* @property {VehicleMats} M @property {string} assembly @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* One side of a double-wishbone front suspension: the upper and lower A-arms from their bushes on the body to the
* knuckle's ball joints, the coilover from the lower arm to its tower, the tie rod from the rack to the steering arm.
* Each leg, rod and damper is re-aimed every moment between where the body has sagged to and where the wheel is.
* @param {Kit} kit @param {WishboneOptions} o
*/
function doubleWishbone(kit, o) {
	const { M } = o;
	const m = (g, mat) => kit.mesh(g, mat);
	const bushG = new three.CylinderGeometry(.024, .024, .055, 16).rotateX(Math.PI / 2);
	const arm = (rr) => {
		const g = new three.Group();
		const a = m(unitBar(rr), M.chassis), b = m(unitBar(rr), M.chassis), s = [m(bushG, M.bush), m(bushG, M.bush)];
		g.add(a, b, ...s);
		return {
			g,
			a,
			b,
			s
		};
	};
	const up = arm(.013), lo = arm(.018);
	kit.part(up.g, {
		id: `upper-arm-${o.id}`,
		label: `Upper wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A pressed and welded A-arm from two rubber bushes on the frame to the knuckle’s upper ball joint: with the lower arm it holds the wheel upright as it rises and falls.",
		moves: "Swings about its bushes as the body rises and sinks on its springs.",
		specs: [["Bushes", "Rubber, bonded"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		.16,
		0
	] });
	kit.part(lo.g, {
		id: `lower-arm-${o.id}`,
		label: `Lower wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The longer, stronger lower A-arm: it carries the coil spring’s load from the knuckle’s lower ball joint to the frame and takes the braking forces.",
		moves: "Swings about its bushes as the body rises and sinks.",
		specs: [["Material", "Pressed steel, welded box"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		-.18,
		0
	] });
	const tele = telescope({
		body: .24,
		rod: .2,
		rBody: .025,
		coil: {
			R: o.coil.R,
			wire: o.coil.wire,
			turns: o.coil.turns,
			seat: .11
		},
		M,
		mesh: kit.mesh
	});
	kit.part(new three.Group().add(tele.group), {
		id: `coilover-${o.id}`,
		label: `Coil spring and damper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A coil spring round a telescopic damper from the lower arm up to its tower on the frame: the spring carries the body, the damper’s oil forced through its valves stops it bouncing.",
		moves: "Shortens as the load or the climb presses the front down; lengthens as it lifts.",
		drive: "The road, through the lower arm",
		specs: [["Spring rate", `${Math.round(o.coil.k / 1e3)} kN/m at the wheel [inferred]`], ["Damper", "Twin tube, gas [inferred]"]]
	}, {
		explode: [
			.1 * Math.sign(o.corner.joints.upper[0]),
			.3,
			0
		],
		tag: o.tag
	});
	const tie = m(unitBar(.011), M.forged);
	const boot = m(GEO.lathe([
		[0, 0],
		[.02, 0],
		[.024, .02],
		[.016, .04],
		[.022, .06],
		[.012, .09],
		[0, .09]
	], 16), M.boot);
	kit.part(new three.Group().add(tie, boot), {
		id: `tie-rod-${o.id}`,
		label: `Tie rod, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "From the steering rack’s end to the knuckle’s steering arm: as the rack slides, it pushes or pulls the arm and turns the wheel about its ball joints. Its threaded end sets the toe.",
		moves: "Follows the rack and the wheel.",
		drive: "The steering rack",
		specs: [["Toe-in", "2 mm [inferred]"]]
	}, { explode: [
		0,
		-.06,
		.12
	] });
	const J = o.corner.joints;
	const lerp3 = (a, b, t) => [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	];
	return { 
	/** re-aim every piece between the body (as it is now) and the wheel */
update() {
		const [uf, ur] = o.upper.map((q) => inFrame(o.body, q)), [lf, lr] = o.lower.map((q) => inFrame(o.body, q));
		aim(up.a, uf, J.upper, true);
		aim(up.b, ur, J.upper, true);
		up.s[0].position.set(...uf);
		up.s[1].position.set(...ur);
		aim(lo.a, lf, J.lower, true);
		aim(lo.b, lr, J.lower, true);
		lo.s[0].position.set(...lf);
		lo.s[1].position.set(...lr);
		tele.set(lerp3(lerp3(lf, lr, .5), J.lower, o.on ?? .62), inFrame(o.body, o.top));
		const rk = inFrame(o.body, o.rack);
		aim(tie, rk, J.tie, true);
		aim(boot, rk, J.tie);
	} };
}
/**
* The steering rack on the body: its housing across the front with its rubber boots, the pinion at the driver's end,
* and the shaft with its universal joints up to the column.
* @param {Kit} kit @param {{ parent: THREE.Object3D, y: number, z: number, half: number, pinion: number, shaft: V3[], M: VehicleMats, assembly: string, source?: string }} o
*/
function steeringRack(kit, o) {
	const { M } = o, m = (g, mat) => kit.mesh(g, mat);
	const housing = GEO.merge([
		cyl([
			-o.half + .09,
			o.y,
			o.z
		], [
			o.half - .09,
			o.y,
			o.z
		], .024, 18),
		cyl([
			o.pinion,
			o.y - .03,
			o.z
		], [
			o.pinion,
			o.y + .07,
			o.z + .03
		], .03, 16),
		at(box(.06, .05, .05, .006), -o.half * .55, o.y + .03, o.z),
		at(box(.06, .05, .05, .006), o.half * .55, o.y + .03, o.z)
	]);
	const boots = [];
	for (const s of [-1, 1]) boots.push(GEO.lathe([
		[0, 0],
		[.026, 0],
		[.032, .02],
		[.022, .035],
		[.032, .05],
		[.022, .065],
		[.03, .08],
		[.014, .1],
		[0, .1]
	], 18).rotateZ(-s * Math.PI / 2).translate(s * (o.half - .1), o.y, o.z));
	const shaft = [hose(o.shaft, .01, 8)];
	for (const q of o.shaft.slice(1, -1)) shaft.push(at(box(.03, .03, .03, .006), q[0], q[1], q[2]));
	return kit.part(new three.Group().add(m(housing, M.zinc), m(GEO.merge(boots), M.boot), m(GEO.merge(shaft), M.forged)), {
		id: "steering-rack",
		label: "Steering rack",
		assembly: o.assembly,
		source: o.source,
		what: "A rack-and-pinion box across the front: the steering wheel’s shaft turns the pinion, the pinion slides the toothed rack sideways, the rack pushes and pulls the tie rods.",
		moves: "The rack slides as the wheel is turned (held straight here).",
		drive: "The steering wheel, through its shaft and universal joints",
		specs: [["Ratio", "20 : 1 [inferred]"], ["Turns, lock to lock", "3.8 [inferred]"]]
	}, { explode: [
		0,
		-.2,
		.2
	] }, o.parent);
}
/**
* @typedef {object} AxleOptions
* @property {THREE.Object3D} body the sprung frame the springs' hangers and the dampers' tops are on
* @property {number} z @property {number} y the axle's middle (in the root's frame; it stays on the wheels)
* @property {number} hub the hubs' faces at ±hub (m) @property {number} springX the leaf springs at ±springX
* @property {boolean} over the springs over the axle (else hung under it)
* @property {{ L: number, w: number, t: number, n: number, camber: number }} leaf the main leaf's length between its eyes, width, each leaf's thickness, how many, and its camber at the kerb's ride height
* @property {number} hanger the height of the frame's rails over the springs (in the body's frame), for their hangers
* @property {[V3, V3]} dampers each damper's top (in the body's frame); its bottom on the axle below it
* @property {number} ratio the final drive @property {number} rate each spring's rate (N/m)
* @property {VehicleMats} M @property {EngineMats} E @property {string} assembly @property {string} [springs] the springs', hangers' and dampers' assembly (else `assembly`) @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* A live rear axle on leaf springs: the banjo housing, the crown wheel and pinion in its bowl, the half-shafts in its
* tubes, the two leaf packs clamped to it by their U-bolts and hung from the frame on a hanger and a shackle, the two
* dampers. The axle stays on its wheels; the springs flatten and the dampers shorten as the body sinks onto it.
* @param {Kit} kit @param {AxleOptions} o
*/
function liveAxle(kit, o) {
	const { M, E } = o, m = (g, mat) => kit.mesh(g, mat);
	const { y, z, hub } = o, rt = .04;
	const bowl = latheZ([
		[0, -.1],
		[.11, -.1],
		[.135, -.07],
		[.145, -.01],
		[.13, .05],
		[.085, .1],
		[.055, .13],
		[.05, .2],
		[0, .2]
	], 40).translate(0, y, z);
	/** @type {THREE.BufferGeometry[]} */
	const tubes = [
		cyl([
			-hub + .11,
			y,
			z
		], [
			hub - .11,
			y,
			z
		], rt, 24),
		latheX([
			[.03, -hub + .09],
			[.09, -hub + .09],
			[.09, -hub + .105],
			[.03, -hub + .105]
		], 32).translate(0, y, z),
		latheX([
			[.03, hub - .105],
			[.09, hub - .105],
			[.09, hub - .09],
			[.03, hub - .09]
		], 32).translate(0, y, z)
	];
	const perchY = o.over ? y + rt + .008 : y - rt - .008;
	for (const s of [-1, 1]) tubes.push(at(box(o.leaf.w + .02, .016, .12, .003), s * o.springX, perchY, z));
	kit.part(new three.Group().add(m(GEO.merge([bowl, ...tubes]), M.chassis)), {
		id: "axle-housing",
		label: "Rear axle housing",
		assembly: o.assembly,
		source: o.source,
		what: "The banjo housing: a pressed-steel bowl round the differential with a tube out to each wheel, its spring seats welded on. It carries the vehicle’s rear and its load straight to the wheels.",
		specs: [["Type", "Live beam, semi-floating"]]
	}, {
		explode: [
			0,
			-.25,
			0
		],
		xray: "shell"
	});
	const crown = new three.Group(), pinion = new three.Group();
	{
		/** @type {number[]} */
		const angles = [];
		const T = 35;
		for (let k = 0; k < T; k++) angles.push(k / T * Math.PI * 2, (k + .42) / T * Math.PI * 2, (k + .5) / T * Math.PI * 2, (k + .92) / T * Math.PI * 2);
		const cw = revolveX([
			[.06, -.012],
			[.104, -.012],
			[
				.104,
				.002,
				1
			],
			[
				.072,
				.02,
				1
			],
			[.06, .02]
		], angles, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr);
		crown.add(m(GEO.merge([cw.translate(-.03, 0, 0), latheX([
			[0, -.05],
			[.055, -.05],
			[.06, 0],
			[.05, .05],
			[0, .05]
		], 28)]), E.gear));
		crown.position.set(0, y, z);
		/** @type {number[]} */
		const pa = [];
		const Tp = 11;
		for (let k = 0; k < Tp; k++) pa.push(k / Tp * Math.PI * 2, (k + .42) / Tp * Math.PI * 2, (k + .5) / Tp * Math.PI * 2, (k + .92) / Tp * Math.PI * 2);
		const pg = revolveX([
			[.012, 0],
			[
				.036,
				0,
				1
			],
			[
				.022,
				.045,
				1
			],
			[.012, .045]
		], pa, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr).rotateY(-Math.PI / 2);
		pinion.add(m(GEO.merge([
			pg,
			cyl([
				0,
				0,
				.04
			], [
				0,
				0,
				.2
			], .016, 12),
			latheZ([
				[.015, .2],
				[.048, .2],
				[.048, .212],
				[.015, .212]
			], 24)
		]), E.gear));
		pinion.position.set(0, y - .01, z + .065);
		const shafts = new three.Group();
		shafts.add(m(GEO.merge([cyl([
			-hub + .06,
			0,
			0
		], [
			-.05,
			0,
			0
		], .016, 12), cyl([
			.05,
			0,
			0
		], [
			hub - .06,
			0,
			0
		], .016, 12)]), E.crank));
		crown.add(shafts);
		const oil = m(at(box(.2, .08, .16, .02), 0, y - .085, z), E.oil);
		kit.part(new three.Group().add(crown, pinion, oil), {
			id: "differential",
			label: "Crown wheel, pinion and half-shafts",
			assembly: o.assembly,
			source: o.source,
			what: `The propshaft turns the pinion, the pinion turns the crown wheel ${o.ratio} times slower and a right angle round; the differential’s gears on the crown wheel share its torque between the half-shafts, letting the outer wheel turn faster in a bend.`,
			moves: "The pinion turns with the propshaft, the crown wheel and half-shafts with the wheels (shown slowed).",
			drive: "The propshaft",
			specs: [["Final drive", `${o.ratio.toFixed(2)} : 1 (35 : ${Math.round(35 / o.ratio)})`], ["Oil", "1.6 L, 80W-90 [inferred]"]]
		}, { explode: [
			0,
			-.5,
			.2
		] });
	}
	const leaf = leafPack(o.leaf);
	const eyeY = (c) => c + .012;
	/** the main leaf's middle: on the perch over the tube, or hung under it */
	const packY = o.over ? perchY + .008 + (o.leaf.n - 1) * o.leaf.t + o.leaf.t / 2 : perchY - .008 - o.leaf.t / 2;
	const packs = new three.Group();
	for (const s of [-1, 1]) {
		const g = new three.Group();
		g.position.set(s * o.springX, packY, z);
		g.add(m(leaf.geo, M.spring));
		const eyes = leaf.eyes.map((e) => {
			const c = new three.Group();
			c.add(m(leaf.eye, M.spring));
			return c;
		});
		g.add(...eyes);
		g.userData.eyes = eyes;
		packs.add(g);
		const yTop = o.over ? packY + o.leaf.t / 2 + .006 : y + rt + .004, yBot = o.over ? y - rt - .006 : packY - (o.leaf.n - 1) * o.leaf.t - o.leaf.t / 2 - .008;
		const ub = [];
		for (const dz of [-.045, .045]) for (const dx of [-1, 1]) ub.push(cyl([
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yBot - .02,
			z + dz
		], [
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yTop + .01,
			z + dz
		], .007, 8));
		for (const dz of [-.045, .045]) ub.push(at(box(o.leaf.w + .04, .012, .016, .003), s * o.springX, o.over ? yTop + .01 : yBot - .004, z + dz));
		ub.push(at(box(o.leaf.w + .04, .012, .12, .003), s * o.springX, o.over ? yBot - .006 : yBot - .004, z));
		packs.add(m(GEO.merge(ub), M.forged));
	}
	kit.part(packs, {
		id: "leaf-springs",
		label: "Leaf springs and U-bolts",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: `Two packs of ${o.leaf.n} steel leaves, each clamped to the axle by two U-bolts, its front eye on a hanger, its back eye on a swinging shackle: they carry the load and locate the axle. They flatten as the load grows.`,
		moves: "Flatten as the body sinks onto the axle, arch again as it lifts.",
		drive: "The load on the body",
		specs: [
			["Leaves", `${o.leaf.n} × ${Math.round(o.leaf.w * 1e3)} × ${Math.round(o.leaf.t * 1e3)} mm`],
			["Length", `${Math.round(o.leaf.L * 1e3)} mm between eyes`],
			["Rate", `${Math.round(o.rate / 1e3)} kN/m a side [inferred]`]
		]
	}, {
		explode: [
			0,
			-.4,
			0
		],
		tag: o.tag
	});
	const hang = [];
	const yEye = packY + eyeY(o.leaf.camber);
	for (const s of [-1, 1]) {
		const x = s * o.springX;
		hang.push(at(box(.012, o.hanger - yEye + .03, .07, .004), x - .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), at(box(.012, o.hanger - yEye + .03, .07, .004), x + .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), cyl([
			x - .045,
			yEye,
			z + o.leaf.L / 2
		], [
			x + .045,
			yEye,
			z + o.leaf.L / 2
		], .009, 10));
		const zs = z - o.leaf.L / 2;
		hang.push(at(box(.07, .05, .07, .006), x, o.hanger - .03, zs - .05), at(box(.01, .11, .035, .003), x - .035, yEye + .035, zs - .03), at(box(.01, .11, .035, .003), x + .035, yEye + .035, zs - .03), cyl([
			x - .045,
			yEye,
			zs
		], [
			x + .045,
			yEye,
			zs
		], .009, 10), cyl([
			x - .045,
			yEye + .07,
			zs - .05
		], [
			x + .045,
			yEye + .07,
			zs - .05
		], .009, 10));
	}
	kit.part(new three.Group().add(m(GEO.merge(hang), M.chassis)), {
		id: "spring-hangers",
		label: "Spring hangers and shackles",
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Under the frame: a fixed hanger for each spring’s front eye and a swinging shackle for its back eye, so the leaves can lengthen as they flatten.",
		specs: [["Bushes", "Rubber"]]
	}, { explode: [
		0,
		.1,
		0
	] }, o.body);
	const tl = [0, 1].map(() => telescope({
		body: .26,
		rod: .22,
		rBody: .026,
		M,
		mesh: kit.mesh
	}));
	kit.part(new three.Group().add(...tl.map((t) => t.group)), {
		id: "dampers-rear",
		label: "Rear dampers",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Telescopic dampers from the axle up to the frame, leaning in: oil forced through their valves turns the body’s bounce into heat.",
		moves: "Shorten as the body sinks, lengthen as it lifts.",
		specs: [["Type", "Twin tube [inferred]"]]
	}, { explode: [
		0,
		.25,
		-.15
	] });
	const bottoms = o.dampers.map((q) => [
		Math.sign(q[0]) * (o.springX - .11),
		y - .05,
		z - .07
	]);
	return {
		packs,
		/** sink the body onto it by `sag` (m), turn the wheels' side to `aw` and the pinion to `ap` @param {number} sag @param {number} aw @param {number} ap */
		update(sag, aw, ap) {
			leaf.set(o.leaf.camber - sag);
			for (const g of packs.children) {
				const eyes = g.userData.eyes;
				if (eyes) eyes.forEach((e, k) => e.position.copy(leaf.eyes[k].position));
			}
			crown.rotation.x = aw;
			pinion.rotation.z = -ap;
			tl.forEach((t, k) => t.set(bottoms[k], inFrame(o.body, o.dampers[k])));
		}
	};
}
/**
* The propshaft: one or two steel tubes with a universal joint at each end (and a centre bearing between two), re-aimed
* every moment from the gearbox (on the sprung body) to the axle's pinion (on the wheels), turning.
* @param {Kit} kit @param {{ n: 1 | 2, r: number, M: VehicleMats, assembly: string, source?: string, specs?: [string, string][], tag?: import('$lib/assets/parts.js').How['tag'] }} o
*/
function propshaft(kit, o) {
	const { M } = o, m = (g, mat) => kit.mesh(g, mat);
	const root = new three.Group();
	const yoke = GEO.merge([
		latheY([
			[.01, 0],
			[o.r + .004, 0],
			[o.r + .004, .03],
			[.01, .03]
		], 20),
		at(slab(.012, .045, .026), o.r * .7, -.02, 0),
		at(slab(.012, .045, .026), -o.r * .7, -.02, 0),
		cyl([
			-o.r * .75,
			-.035,
			0
		], [
			o.r * .75,
			-.035,
			0
		], .008, 8),
		cyl([
			0,
			-.035,
			-o.r * .75
		], [
			0,
			-.035,
			o.r * .75
		], .008, 8)
	]);
	const segs = Array.from({ length: o.n }, () => {
		const seg = new three.Group(), sp = new three.Group();
		const tube = m(new three.CylinderGeometry(o.r, o.r, 1, 20, 1).translate(0, .5, 0), M.chassis);
		const a = m(yoke.clone().rotateZ(Math.PI).translate(0, 0, 0), M.forged), b = m(yoke, M.forged);
		sp.add(tube, a, b);
		seg.add(sp);
		root.add(seg);
		return {
			seg,
			sp,
			tube,
			b
		};
	});
	const bearing = new three.Group();
	if (o.n === 2) bearing.add(m(GEO.merge([
		latheZ([
			[.02, -.02],
			[.05, -.02],
			[.05, .02],
			[.02, .02]
		], 24),
		at(box(.2, .015, .05, .004), 0, .05, 0),
		at(box(.015, .05, .04, .003), -.06, .03, 0),
		at(box(.015, .05, .04, .003), .06, .03, 0)
	]), M.bush));
	root.add(bearing);
	kit.part(root, {
		id: "propshaft",
		label: o.n === 2 ? "Propshaft (two pieces)" : "Propshaft",
		assembly: o.assembly,
		source: o.source,
		what: o.n === 2 ? "Two thin-walled steel tubes from the gearbox to the axle, joined over a rubber-mounted centre bearing under the floor, a universal joint at each end of each to follow the axle as it rises and falls." : "A thin-walled steel tube from the gearbox to the axle’s pinion, a universal joint at each end to follow the axle as it rises and falls.",
		moves: "Turns at the gearbox’s output speed (shown 40 times slower).",
		drive: "The gearbox",
		specs: o.specs ?? []
	}, {
		explode: [
			0,
			-.55,
			0
		],
		tag: o.tag
	});
	return { 
	/** run it through `pts` (gearbox, [centre bearing], pinion), turned to `a` @param {V3[]} pts @param {number} a */
set(pts, a) {
		segs.forEach((s, k) => {
			const L = aim(s.seg, pts[k], pts[k + 1]);
			s.tube.scale.y = Math.max(.01, L - .06);
			s.tube.position.y = .03;
			s.b.position.y = L;
			s.sp.rotation.y = a;
		});
		if (o.n === 2) bearing.position.set(...pts[1]);
	} };
}
/**
* A seat in its own frame (the floor under its cushion's middle at the origin, facing +z): the cushion, the backrest
* raked back with its bolsters, the headrest on its posts (if `head`), the base under it; a bench if it is wide.
* @param {{ w: number, d?: number, h?: number, back?: number, rake?: number, head?: boolean }} o
*/
function seatGeometry({ w, d = .5, h = .32, back = .62, rake = .24, head = true }) {
	/** @type {THREE.BufferGeometry[]} */
	const fabric = [box(w, .12, d, .045, 2).rotateX(-.06).translate(0, h - .06, 0)];
	const pivot = new three.Vector3(0, h - .02, -d / 2 + .07);
	/** @type {THREE.BufferGeometry[]} */
	const backG = [box(w, back, .11, .045, 2).translate(0, back / 2, 0)];
	const bench = w > .8;
	if (!bench) for (const s of [-1, 1]) backG.push(box(.07, back * .78, .14, .03, 2).translate(s * (w - .07) / 2, back * .42, .015));
	if (head) {
		const heads = bench ? [
			-w / 3,
			0,
			w / 3
		] : [0];
		for (const hx of heads) backG.push(box(.26, .16, .09, .04, 2).translate(hx, back + .13, 0));
	}
	const b = GEO.merge(backG).rotateX(-rake).translate(pivot.x, pivot.y, pivot.z);
	fabric.push(b);
	const posts = [];
	if (head) {
		const heads = bench ? [
			-w / 3,
			0,
			w / 3
		] : [0];
		for (const hx of heads) for (const s of [-1, 1]) posts.push(bar([
			hx + s * .07,
			back - .02,
			0
		], [
			hx + s * .07,
			back + .08,
			0
		], .006, 8).rotateX(-rake).translate(pivot.x, pivot.y, pivot.z));
	}
	/** @type {THREE.BufferGeometry[]} */
	const base = [
		box(w * .82, h - .12, d * .72, .01).translate(0, (h - .12) / 2, 0),
		slab(.03, .02, d * .9).translate(-w * .3, .01, 0),
		slab(.03, .02, d * .9).translate(w * .3, .01, 0)
	];
	return {
		fabric: GEO.merge(fabric),
		base: GEO.merge([...base, ...posts])
	};
}
/**
* A steering wheel in its own frame: its rim round the z axis, three spokes to the hub, the horn pad on the side
* facing −z (the driver); its column down along +z.
* @param {{ R?: number, column?: number }} [o]
*/
function steeringWheelGeometry({ R = .2, column = .5 } = {}) {
	const rim = new three.TorusGeometry(R, .016, 10, 56);
	const spokes = [];
	for (const a of [
		0,
		Math.PI,
		-Math.PI / 2
	]) spokes.push(bar([
		Math.cos(a) * .05,
		Math.sin(a) * .05,
		.02
	], [
		Math.cos(a) * (R - .01),
		Math.sin(a) * (R - .01),
		0
	], .012, 8));
	const hub = latheZ([
		[0, -.02],
		[.065, -.02],
		[.07, .01],
		[.05, .05],
		[0, .05]
	], 28);
	const col = GEO.merge([cyl([
		0,
		0,
		.05
	], [
		0,
		0,
		column
	], .022, 14), cyl([
		0,
		0,
		.06
	], [
		0,
		0,
		.2
	], .045, 18)]);
	return {
		rim: GEO.merge([rim, ...spokes]),
		hub,
		column: col
	};
}
/**
* An instrument cluster: round dials side by side in a binnacle, their faces towards −z (the driver), each needle
* swinging clockwise as the driver sees it, from lower left to lower right, as its value goes up.
* @param {Kit} kit @param {{ dials: { x: number, y: number, r: number, max: number, ticks?: number }[], face: THREE.Material, tick: THREE.Material, needle: THREE.Material, bezel: THREE.Material, housing: THREE.Material }} o
*/
function cluster(kit, o) {
	const g = new three.Group();
	const needles = o.dials.map((d) => {
		g.add(kit.mesh(new three.CircleGeometry(d.r, 40).rotateY(Math.PI).translate(d.x, d.y, 0), o.face));
		g.add(kit.mesh(new three.TorusGeometry(d.r + .004, .005, 6, 40).translate(d.x, d.y, 0), o.bezel));
		const ticks = [];
		const T = d.ticks ?? 9;
		for (let k = 0; k < T; k++) {
			const a = (225 - 270 * k / (T - 1)) * (Math.PI / 180);
			ticks.push(slab(.003, d.r * .18, .001).translate(0, d.r * .8, 0).rotateZ(a - Math.PI / 2).translate(d.x, d.y, -.002));
		}
		g.add(kit.mesh(GEO.merge(ticks), o.tick));
		const nd = new three.Group();
		nd.position.set(d.x, d.y, -.005);
		nd.add(kit.mesh(slab(.0035, d.r * .85, .002).translate(0, d.r * .35, 0), o.needle), kit.mesh(new three.CylinderGeometry(.008, .008, .006, 12).rotateX(Math.PI / 2), o.bezel));
		g.add(nd);
		return {
			nd,
			max: d.max
		};
	});
	const xs = o.dials.map((d) => d.x), rs = o.dials.map((d) => d.r);
	const w = Math.max(...xs) - Math.min(...xs) + 2 * Math.max(...rs) + .05;
	g.add(kit.mesh(at(box(w, 2 * Math.max(...rs) + .05, .05, .015), (Math.max(...xs) + Math.min(...xs)) / 2, o.dials[0].y, .026), o.housing));
	return {
		group: g,
		/** the needles to their values, in the dials' order @param {number[]} vs */
		set(vs) {
			needles.forEach((n, k) => n.nd.rotation.z = (-135 + clamp(vs[k] / n.max) * 270) * (Math.PI / 180));
		}
	};
}
/**
* A polygon's edges moved in by their own distances, its corners where the moved edges meet (anticlockwise: in is to
* the left).
* @param {V2[]} pts @param {number[]} d one per edge (edge i from point i to point i + 1)
* @returns {V2[]}
*/
function insetEdges(pts, d) {
	const n = pts.length;
	const lines = pts.map((p, i) => {
		const q = pts[(i + 1) % n];
		const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
		return {
			p: [p[0] - dy / L * d[i], p[1] + dx / L * d[i]],
			dir: [dx / L, dy / L]
		};
	});
	return pts.map((_, i) => {
		const a = lines[(i - 1 + n) % n], b = lines[i];
		const den = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0];
		if (Math.abs(den) < 1e-6) return [b.p[0], b.p[1]];
		const s = ((b.p[0] - a.p[0]) * b.dir[1] - (b.p[1] - a.p[1]) * b.dir[0]) / den;
		return [a.p[0] + a.dir[0] * s, a.p[1] + a.dir[1] * s];
	});
}
/**
* One edge of a body's side profile as a panel across it, `W` wide: a sheet `t` thick whose outer face is on the profile, from
* x −hw to hw, with holes (in its own (x, s) plane, s along the edge from a), and its two rounded edges round onto
* the sides (quarter tubes of radius R).
* @param {V2} a @param {V2} b (z, y) @param {number} R @param {number} t @param {number} W @param {THREE.Path[]} [holes]
*/
function edgePanel(a, b, R, t, W, holes = []) {
	const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
	const S = new three.Vector3(0, dy / len, dz / len), N = new three.Vector3(0, -dz / len, dy / len), X = new three.Vector3(1, 0, 0);
	const hw = W / 2 - R;
	const s = new three.Shape();
	s.moveTo(-hw, 0);
	s.lineTo(hw, 0);
	s.lineTo(hw, len);
	s.lineTo(-hw, len);
	s.closePath();
	s.holes.push(...holes);
	const out = [plate(s, t, 8).translate(0, 0, -t / 2).applyMatrix4(new three.Matrix4().makeBasis(X, S, N)).translate(0, a[1], a[0])];
	const q = new three.Shape();
	q.absarc(0, 0, R, 0, Math.PI / 2, false);
	q.absarc(0, 0, R - t, Math.PI / 2, 0, true);
	q.closePath();
	for (const sx of [-1, 1]) {
		const P = new three.Vector3(sx, 0, 0), W = new three.Vector3().crossVectors(P, N);
		const strip = plate(q, len + R * .6, 6).applyMatrix4(new three.Matrix4().makeBasis(P, N, W));
		const mid = new three.Vector3(sx * hw, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2).addScaledVector(N, -R);
		out.push(strip.translate(mid.x, mid.y, mid.z));
	}
	return GEO.merge(out);
}
/** a shape for a side panel from (z, y) points, its corners rounded @param {V2[]} pts @param {number | number[]} r */
const zyShape = (pts, r) => roundPoly(zy(pts), r);
/** a hole in a side panel from (z, y) points @param {V2[]} pts @param {number | number[]} r */
const zyHole = (pts, r) => roundHole(zy(pts), r);
/** a (z, y) rectangle @param {number} z0 @param {number} z1 @param {number} y0 @param {number} y1 @returns {V2[]} */
const zyRect = (z0, z1, y0, y1) => [
	[z0, y0],
	[z1, y0],
	[z1, y1],
	[z0, y1]
];
/** a (z, y) rectangle grown by `d` all round @param {V2[]} r @param {number} d @returns {V2[]} */
function outsetRect(r, d) {
	const zs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
	return zyRect(Math.min(...zs) - d, Math.max(...zs) + d, Math.min(...ys) - d, Math.max(...ys) + d);
}
/**
* A geometry drawn in an edge panel's own frame (x across, y along the edge from `a`, z out of its face) put on that
* edge of the profile, moved `out` out of its face.
* @param {THREE.BufferGeometry} g @param {V2} a @param {V2} b @param {number} out
*/
function onEdge(g, a, b, out) {
	const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
	const S = new three.Vector3(0, dy / len, dz / len), N = new three.Vector3(0, -dz / len, dy / len);
	return g.translate(0, 0, out).applyMatrix4(new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), S, N)).translate(0, a[1], a[0]);
}
/** the part of a polygon below (or above) a height, (z, y) @param {V2[]} pts @param {number} y0 @param {boolean} below @returns {V2[]} */
function clipY(pts, y0, below) {
	const inside = (p) => below ? p[1] <= y0 : p[1] >= y0;
	/** @type {V2[]} */
	const out = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i + 1) % pts.length];
		if (inside(a)) out.push(a);
		if (inside(a) !== inside(b)) {
			const k = (y0 - a[1]) / (b[1] - a[1]);
			out.push([a[0] + (b[0] - a[0]) * k, y0]);
		}
	}
	return out;
}
/**
* A hinged or sliding door's panels from its opening in the side and its window, (z, y): its lower half a solid skin
* (`t[0]` thick, the window wound down into it), its frame round the glass above `split` (`t[1]` thick), the glass in
* the frame, the trim card inside the lower half; the outer face on the side at x = sx · x.
* @param {V2[]} hole @param {V2[]} win @param {{ x: number, sx: number, split: number, t?: [number, number], gap?: number }} o
*/
function doorPanels(hole, win, { x, sx, split, t = [.055, .03], gap = .004 }) {
	const O = insetEdges(hole, hole.map(() => gap));
	const low = zyShape(clipY(O, split, true), .02);
	const up = zyShape(clipY(O, split, false), .02);
	up.holes.push(zyHole(win, .04));
	const lowIn = clipY(O, split - .04, true);
	return {
		skin: GEO.merge([onX(plate(low, t[0], 6), sx * (x - t[0] / 2)), onX(plate(up, t[1], 6), sx * (x - t[1] / 2))]),
		glass: onX(plate(zyShape(win, .04), .005, 6), sx * (x - t[1] / 2)),
		card: onX(plate(zyShape(insetEdges(lowIn, lowIn.map(() => .03)), .03), .008, 4), sx * (x - t[0] - .004))
	};
}

