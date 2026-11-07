// The piece "Vehicle base (vehicle.js)", version 1: below its requires, the text of the copy in truck v2 (src/lib/machines/vehicle.js, legacy 86b44da17e4d), as it was.
const three = require("three");
const { GEO, MAT, LAB_PLANES, clamp, table, approach } = require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70");
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
* @property {(s: any, inp: { vSet: number, grade: number, load: number }) => number} [grip] the most the driven wheels
*   can push (N) before they spin, from their load and the road (without it they never spin)
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
		spin: false,
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
				s.rpm = approach(s.rpm, s.running ? E.idle : 0, .12, h);
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
			const Fe = Te >= 0 ? Te * i * V.eta / V.r : Te * i / (V.eta * V.r);
			const Fg = V.grip ? V.grip(s, inp) : Infinity;
			const spin = Fe > Fg;
			const Fd = Math.min(Fe, Fg);
			const Fb = aWant < 0 ? Math.max(0, Fd - Fwant) : 0;
			const net = Fd - Fb - rl.F;
			s.a = net / mE;
			s.v = Math.max(0, s.v + s.a * h);
			s.theta = th;
			s.Te = Te;
			s.Fd = Fd;
			s.Fb = Fb;
			s.spin = spin;
			s.rpm = s.launch ? E.launch : rpmOf(s.v, s.gear);
			const lugged = !s.launch && s.gear === 1 && s.rpm < E.stall && th > .9;
			const noPull = s.launch && s.v <= 0 && net <= 0 && th > .99;
			if (lugged || noPull) {
				s.stalled = true;
				s.running = spin;
				s.why = spin ? "grip" : lugged ? "lugged" : "pull";
				s.need = rl.F;
				s.can = spin ? Fg : fMax(1, s.v);
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
		const indicated = s.stalled && !s.running || overrun ? 0 : Math.max(0, s.Te + tfric(s.rpm)) * w;
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
/** about +y, from [r, y] points (the plain lathe, for a symmetry about the vertical) @param {V2[]} pts @param {number} [seg] */
const latheY = (pts, seg = 48) => GEO.lathe(pts, seg);
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

module.exports = { G, RHO_AIR, FUELS, rrect, tracePoly, roundPoly, roundHole, circle, plate, ext, slab, box, at, latheX, latheZ, cyl, bar, coil, hose, hex, zy, onX, xz, onY, revolveX, vehicleMaterials, halfCut, tyreSize, tyreGeometry, barrelGeometry, discGeometry, calliperGeometry, hinge, leafPack, roadLoad, ordinal, vehicleSolver, _pa, _pb, _up, aim, inFrame, unitBar, spurGeometry, beltShape, beltHole, traceBelt, beltGeometry, latheY, propshaft, seatGeometry, steeringWheelGeometry, cluster, insetEdges, edgePanel, zyShape, zyHole, onEdge, clipY, doorPanels };
