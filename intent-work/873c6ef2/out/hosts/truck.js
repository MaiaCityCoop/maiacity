Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");
three_addons_utils_BufferGeometryUtils_js = __toESM(three_addons_utils_BufferGeometryUtils_js, 1);

//#region src/lib/models/parts.ts
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const std = (color, roughness = .8, more = {}) => shared(() => new three.MeshStandardMaterial({
	color,
	roughness,
	...more
}));
/** A part: a box at its place, casting shadows (and catching them, unless `catches` is false). */
function part(g, w, h, d, m, x, y, z, catches = true) {
	const p = new three.Mesh(new three.BoxGeometry(w, h, d), m);
	p.position.set(x, y, z);
	p.castShadow = true;
	p.receiveShadow = catches;
	g.add(p);
	return p;
}

//#endregion
//#region src/lib/models/furniture.ts
const tyreMat = /* @__PURE__ */ (() => std("#1a1a1a", .9))();
const truckGlass = /* @__PURE__ */ (() => std("#223038", .15, { metalness: .4 }))();
/**
* A truck: a cab and a box trailer on a long chassis, eight wheels — about 16 m long, 2.55 m wide, 4 m high. It drives
* towards +z. `cab` and `box` are their paint.
*/
function truck$1({ cab = "#c8c4bc", box = "#dcdad4" } = {}) {
	const g = new three.Group();
	g.name = "truck";
	const paint = (color) => new three.MeshStandardMaterial({
		color,
		roughness: .55,
		metalness: .1
	});
	const tyre = tyreMat();
	part(g, 2.55, 3.1, 12, paint(box), 0, 2.45, -1.2, false);
	part(g, 2.5, 2.6, 2.4, paint(cab), 0, 2.1, 6.2, false);
	part(g, 2.3, 1, .05, truckGlass(), 0, 2.7, 7.42, false);
	part(g, 2.3, .5, 15, tyre, 0, .7, 0, false);
	for (const z of [
		-5.8,
		-4.6,
		3.4,
		6.4
	]) for (const x of [-1.15, 1.15]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.5, .5, .4, 12), tyre);
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(x, .5, z);
		wheel.castShadow = true;
		g.add(wheel);
	}
	return g;
}

//#endregion
//#region src/lib/assets/kit.js
const { GEO, clamp, MAT, fmt, ease } = require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70");
//#endregion
//#region src/lib/assets/parts.js
const { assetKit, castOf } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
//#endregion
//#region src/lib/machines/vehicle.js
const { at, box, slab, rrect, circle, onY, plate, latheY, cyl, ext, latheZ, hex, coil, spurGeometry, beltShape, beltHole, hose, beltGeometry, tyreSize, G, barrelGeometry, onX, latheX, tyreGeometry, discGeometry, calliperGeometry, vehicleMaterials, vehicleSolver, roundPoly, leafPack, ordinal, propshaft, unitBar, halfCut, zyShape, insetEdges, zyHole, roundHole, onEdge, edgePanel, xz, hinge, doorPanels, cluster, seatGeometry, steeringWheelGeometry, inFrame, aim } = require("ae16075b4e9197b3028c7862c399bbf18e7b04dcdc14d20113bd9186bbe366eb");
//#endregion
//#region src/lib/machines/diesel6.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** @typedef {ReturnType<typeof import('$lib/assets/parts.js').assetKit>} Kit */
/** the engine's measures (m) and its timing (crank degrees after its cylinder's firing top dead centre) */
const SIX = {
	bore: .131,
	stroke: .158,
	rod: .255,
	pitch: .163,
	/** the piston's pin to its crown */
	ch: .08,
	cr: 18,
	order: [
		1,
		5,
		3,
		6,
		2,
		4
	],
	/** the exhaust valves open and close, the intake valves open and close [inferred] */
	exhaust: [135, 370],
	intake: [350, 570],
	/** the cam's lift at the tappet, the rocker's ratio (valve over pushrod arm) */
	lift: .0105,
	arms: [.06, .07],
	/** the camshaft's axis (x, y) */
	cam: [.13, .22]
};
/** its displacement (m³) */
const VD = /* @__PURE__ */ (() => 6 * Math.PI * (SIX.bore / 2) ** 2 * SIX.stroke)();
/** each cylinder's firing angle in the cycle (deg, 0 … 720): 1-5-3-6-2-4, a firing every 120° */
const FIRE = /* @__PURE__ */ (() => [
	1,
	2,
	3,
	4,
	5,
	6
].map((c) => 120 * SIX.order.indexOf(c)))();
/** a valve's lift (0 … 1) at a cylinder's angle in its cycle (deg after its firing) @param {number} phi @param {V2} w */
const liftAt = (phi, [o, c]) => phi > o && phi < c ? Math.sin(Math.PI * (phi - o) / (c - o)) ** 2 : 0;
/** an angle into 0 … 720 @param {number} d */
const cyc = (d) => (d % 720 + 720) % 720;
/**
* A casing's walls, `t` thick, round a space w × h × d centred on `c`, so what it holds shows when it is cut;
* `open` leaves out its bottom (a cover on its gasket).
* @param {number} w @param {number} h @param {number} d @param {number} t @param {V3} c @param {boolean} [open]
*/
function walls(w, h, d, t, [x, y, z], open = false) {
	const g = [at(box(w, t, d, t * .45), x, y + h / 2 - t / 2, z)];
	if (!open) g.push(at(slab(w, t, d), x, y - h / 2 + t / 2, z));
	for (const sx of [-1, 1]) g.push(at(slab(t, h - t, d), x + sx * (w / 2 - t / 2), y - t / 2, z), at(slab(w - 2 * t, h - t, t), x, y - t / 2, z + sx * (d / 2 - t / 2)));
	return GEO.merge(g);
}
/** the turbocharger, the charge air cooler and the cylinders' gas as `airOf` runs them [inferred where not stated] */
const AIR = {
	/** the compressor wheel's tip radius (m), its work factor and efficiency; the turbine's and the bearings' */
	r2: .048,
	mu: .7,
	etaC: .78,
	etaT: .74,
	etaM: .97,
	/** the rotor's inertia (kg·m²): both wheels and the shaft */
	J: .001,
	/** the turbine's flow capacity, and the wastegate's when wide open (m² √K) */
	phiT: 52e-6,
	phiG: 6e-5,
	/** the wastegate opens from this boost (Pa, absolute) and is wide open this much above it */
	set: 32e4,
	band: 2e4,
	cp: 1005,
	cpg: 1150,
	R: 287,
	T0: 298,
	p0: 101325,
	/** the air filter's and the charge air cooler's pressure drops (Pa), the cooler's effectiveness */
	filter: 2500,
	cac: 1e4,
	eps: .82,
	/** the cylinders' volumetric efficiency, the fuel's heating value (J/kg), the share of it the gas carries out */
	etaV: .92,
	LHV: 426e5,
	x: .36,
	/** the pressure after the turbine, through the aftertreatment (Pa) */
	p4: 107e3
};
/**
* The air through the engine, stepped in time from its speed and its fuel: the turbo's speed and so the boost, the
* wastegate, the air's mass and the gas's heat before the turbine, the excess air, the fuel per stroke, the charge
* at the end of compression.
*/
function airOf() {
	const A = AIR;
	const s = {
		w: 3e3,
		boost: 0,
		pMan: A.p0,
		tMan: A.T0,
		t2: A.T0,
		ma: 0,
		mf: 0,
		t3: A.T0,
		p3: A.p4,
		gate: 0,
		Pt: 0,
		Pc: 0,
		lambda: 0,
		q: 0,
		rail: 0,
		pComp: 0,
		tComp: 0,
		n: 0
	};
	/** @param {number} dt @param {{ n: number, mf: number }} inp the engine's speed (rpm), its fuel (kg/s) */
	function step(dt, { n, mf }) {
		const sub = 20, h = dt / sub;
		for (let k = 0; k < sub; k++) {
			const U = s.w * A.r2, dh = A.mu * U * U;
			const PR = (1 + A.etaC * dh / (A.cp * A.T0)) ** 3.5;
			const t2 = A.T0 + dh / A.cp;
			const tMan = t2 - A.eps * (t2 - A.T0);
			const pMan = Math.max(A.p0 * .9, PR * (A.p0 - A.filter) - A.cac * clamp(s.ma / .4) ** 2);
			const ma = A.etaV * pMan / (A.R * tMan) * VD * n / 120;
			const mex = ma + mf;
			const t3 = tMan + (mex > 1e-6 ? A.x * A.LHV * mf / (mex * A.cpg) : 0);
			const gate = clamp((pMan - A.set) / A.band);
			const phi = A.phiT + A.phiG * gate;
			const p3 = Math.sqrt(A.p4 ** 2 + (mex * Math.sqrt(t3) / phi) ** 2);
			const Pt = A.etaT * mex * (A.phiT / phi) * A.cpg * t3 * (1 - (A.p4 / p3) ** .248);
			const Pc = ma * dh;
			s.w = Math.max(800, s.w + (A.etaM * Pt - Pc) / (A.J * s.w) * h);
			Object.assign(s, {
				t2,
				tMan,
				pMan,
				ma,
				mf,
				t3,
				p3,
				gate,
				Pt,
				Pc
			});
		}
		s.n = n;
		s.boost = s.pMan - A.p0;
		s.lambda = mf > 1e-6 ? s.ma / (14.5 * mf) : 0;
		s.q = n > 1 ? mf / (n / 120 * 6) / 835 * 1e9 : 0;
		s.rail = n > 1 ? 500 + 1900 * clamp(s.q / 300) : 0;
		s.pComp = s.pMan * SIX.cr ** 1.32;
		s.tComp = s.tMan * SIX.cr ** .32;
	}
	return {
		s,
		step
	};
}
/** the heavy engine's palette: the engine room's (./vehicle.js) and its own */
function dieselMaterials() {
	return {
		block: MAT.paint({
			color: [
				.08,
				.09,
				.1
			],
			roughness: .55,
			clearcoat: .15,
			cap: [
				.42,
				.42,
				.42
			],
			capRough: .6
		}),
		iron: MAT.castIron({ color: [
			.28,
			.28,
			.29
		] }),
		liner: MAT.castIron({
			color: [
				.36,
				.36,
				.37
			],
			roughness: .4,
			finish: "turned"
		}),
		piston: MAT.steel({
			color: [
				.5,
				.5,
				.5
			],
			roughness: .36,
			finish: "turned"
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
		valve: MAT.steel({
			color: [
				.62,
				.6,
				.57
			],
			roughness: .28
		}),
		spring: MAT.paint({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .4,
			metalness: .4
		}),
		alloy: MAT.aluminium({
			color: [
				.74,
				.75,
				.76
			],
			roughness: .42
		}),
		cover: MAT.plastic({
			color: [
				.04,
				.04,
				.045
			],
			roughness: .5
		}),
		pan: MAT.paint({
			color: [
				.06,
				.065,
				.07
			],
			roughness: .55,
			clearcoat: .1
		}),
		rail: MAT.steel({
			color: [
				.6,
				.6,
				.6
			],
			roughness: .22
		}),
		line: MAT.steel({
			color: [
				.62,
				.62,
				.63
			],
			roughness: .3
		}),
		hot: MAT.inconel({
			color: [
				.45,
				.4,
				.36
			],
			roughness: .55
		}),
		turbine: MAT.inconel({ roughness: .4 }),
		wheel: MAT.aluminiumMachined({ roughness: .2 }),
		manifold: MAT.castIron({
			color: [
				.26,
				.17,
				.12
			],
			roughness: .78
		}),
		shield: MAT.stainless({
			roughness: .3,
			finish: "brushed"
		}),
		hose: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		}),
		belt: MAT.rubber({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .7
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
		filter: MAT.paint({
			color: [
				.75,
				.75,
				.72
			],
			roughness: .4
		}),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		copper: MAT.copper({ roughness: .35 }),
		friction: MAT.ceramic({
			color: [
				.22,
				.2,
				.17
			],
			roughness: .92
		}),
		oil: MAT.fluid({
			color: [
				.36,
				.2,
				.04
			],
			roughness: .06
		}),
		ecu: MAT.aluminium({
			color: [
				.5,
				.52,
				.54
			],
			roughness: .5
		}),
		harness: MAT.plastic({
			color: [
				.02,
				.02,
				.025
			],
			roughness: .75
		}),
		blue: MAT.anodised({ color: [
			.05,
			.12,
			.35
		] }),
		flame: MAT.glow({
			emissive: [
				1,
				.42,
				.08
			],
			emissiveIntensity: 5
		})
	};
}
/** @typedef {ReturnType<typeof dieselMaterials>} DieselMats */
/**
* @typedef {object} SixOptions
* @property {THREE.Object3D} parent @property {V3} at the crank's middle, in `parent`
* @property {number[]} gears the gearbox's ratios, first to top (12: six low range, six high)
* @property {number} range the planetary range's ratio
* @property {string} assembly @property {string} gearAssembly @property {string} [source] @property {string} [airSource]
* @property {DieselMats} M
* @property {Record<string, (() => string) | undefined>} [tags] live values for the labels: `engine`, `turbo`,
*   `exhaust`, `rail`, `injector`, `cylinder`, `gearbox`
*/
/**
* The 13 L six and its gearbox in their parts, each with its card. In the engine's frame (above); `update` turns it.
* @param {Kit} kit @param {SixOptions} o
*/
function dieselSix(kit, o) {
	const { M } = o, T = o.tags ?? {};
	const R = SIX.bore / 2, r = SIX.stroke / 2, L = SIX.rod, p = SIX.pitch, ch = SIX.ch, n = 6;
	const deck = r + L + ch;
	const lb = n * p / 2 + .03;
	const hw = .15;
	const yb = .262, pan = -.135;
	const [xc, yc] = SIX.cam;
	const zc = (i) => (5 / 2 - i) * p;
	const pin = (i) => -FIRE[i] * Math.PI / 180;
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
	const tag = (key, text, where, side = "right") => T[key] ? {
		text,
		at: where,
		value: T[key],
		side
	} : void 0;
	const spin = () => new three.Group();
	const mains = Array.from({ length: 7 }, (_, k) => clamp((n / 2 - k) * p, -lb + .015, lb - .015));
	{
		const top = rrect(2 * hw, 2 * lb, .014);
		for (let i = 0; i < n; i++) {
			top.holes.push(circle(0, -zc(i), R + .0115));
			for (const dz of [.032, -.032]) top.holes.push(circle(xc, -(zc(i) + dz), .0135));
		}
		/** @type {THREE.BufferGeometry[]} */
		const g = [onY(plate(top, deck - yb, 32), (deck + yb) / 2)];
		for (const sx of [-1, 1]) {
			const s = new three.Shape();
			s.moveTo(sx * .13599999999999998, .266);
			s.lineTo(sx * hw, .266);
			s.lineTo(sx * .18, pan);
			s.lineTo(sx * .16599999999999998, pan);
			s.closePath();
			g.push(plate(s, 2 * lb, 2));
			g.push(at(box(.04, .09, .12, .008), sx * .185, .02, lb - .16));
			for (const z of [
				-.3,
				-.05,
				.2
			]) g.push(at(box(.012, .377, .02, .004), sx * .162, .127 / 2 - .004, z));
		}
		for (const z of mains) {
			const s = new three.Shape();
			s.moveTo(-.162, 0);
			s.lineTo(-.06, 0);
			s.absarc(0, 0, .06, Math.PI, 0, true);
			s.lineTo(.162, 0);
			s.lineTo(.162, yb);
			s.lineTo(-.162, yb);
			s.closePath();
			s.holes.push(circle(xc, yc, .026));
			g.push(plate(s, .026, 24).translate(0, 0, z));
		}
		const gal = rrect(.11, .11200000000000002, .012, xc, .41200000000000003 / 2);
		gal.holes.push(circle(xc, yc, .04));
		g.push(plate(gal, 2 * lb, 20));
		const rail = rrect(.37, 2 * lb, .012);
		rail.holes.push(rrect(.31, 2 * lb - .04, .008));
		g.push(onY(plate(rail, .014, 6), -.128));
		part({
			id: "block",
			label: "Cylinder block",
			what: "The cast-iron block: six bores in its deck where the wet liners stand in their coolant, the crankcase under them with seven bulkheads for the crankshaft’s main bearings, and the camshaft’s gallery along its left with the tappets’ bores up into the deck. Every other part of the engine bolts to it.",
			specs: [
				["Displacement", `${(VD * 1e3).toFixed(1)} L (${Math.round(SIX.bore * 1e3)} × ${Math.round(SIX.stroke * 1e3)} mm, six in line)`],
				["Power", "338 kW (460 hp) at 1,900 rpm [inferred]"],
				["Torque", "2,300 N·m from 1,000 to 1,400 rpm [inferred]"],
				["Mass", "1,050 kg dry [inferred]"]
			]
		}, [m(GEO.merge(g), M.block)], {
			explode: [
				0,
				0,
				0
			],
			xray: "shell",
			tag: tag("engine", "13 L six", [
				-.18,
				deck - .12,
				.25
			], "right")
		});
		const liners = [];
		for (let i = 0; i < n; i++) liners.push(latheY([
			[R, deck - .21],
			[R + .011, deck - .21],
			[R + .011, deck],
			[R, deck]
		], 40).translate(0, 0, zc(i)));
		part({
			id: "liners",
			label: "Cylinder liners",
			count: 6,
			what: "Six wet liners of centrifugally cast iron, each a sleeve the piston runs in, its outside washed by the coolant; worn out, a liner is pulled and a new one pressed in, and the block lives on.",
			specs: [["Bore", `${Math.round(SIX.bore * 1e3)} mm, plateau honed`], ["Wall", "11 mm [inferred]"]]
		}, [m(GEO.merge(liners), M.liner)], {
			explode: [
				0,
				.5,
				0
			],
			xray: "shell"
		});
		const bp = rrect(.37, 2 * lb, .012);
		bp.holes.push(rrect(2 * hw - .05, 2 * lb - .06, .02));
		/** @type {THREE.BufferGeometry[]} */
		const bg = [onY(plate(bp, .05499999999999999, 8), -.325 / 2)];
		for (const z of mains) {
			const s = new three.Shape();
			s.moveTo(-.1, 0);
			s.lineTo(-.06, 0);
			s.absarc(0, 0, .06, Math.PI, Math.PI * 2, false);
			s.lineTo(.1, 0);
			s.lineTo(.1, pan);
			s.lineTo(-.1, pan);
			s.closePath();
			bg.push(plate(s, .026, 24).translate(0, 0, z), at(box(.36, .05499999999999999, .03, .004), 0, -.325 / 2, z), cyl([
				-.08,
				pan,
				z
			], [
				-.08,
				-.115,
				z
			], .012, 8), cyl([
				.08,
				pan,
				z
			], [
				.08,
				-.115,
				z
			], .012, 8));
		}
		part({
			id: "bedplate",
			label: "Bedplate and main bearing caps",
			what: "A ladder of cast iron bolted under the crankcase: seven caps that close the main bearings round the crankshaft, tied in one frame so the block does not flex at its skirts.",
			specs: [["Bolts", "14 main bearing bolts, M18 [inferred]"]]
		}, [m(GEO.merge(bg), M.iron)], { explode: [
			0,
			-.32,
			0
		] });
	}
	const crank = spin();
	{
		const web = new three.Shape();
		web.moveTo(.098, -.035);
		web.lineTo(.048, r);
		web.absarc(0, r, .048, 0, Math.PI, false);
		web.lineTo(-.098, -.035);
		web.absarc(0, 0, .105, 200 * Math.PI / 180, 340 * Math.PI / 180, false);
		const g = [];
		for (const z of mains) g.push(cyl([
			0,
			0,
			z - .018
		], [
			0,
			0,
			z + .018
		], .055, 20));
		for (let i = 0; i < n; i++) {
			const ph = pin(i), px = r * Math.sin(ph), py = r * Math.cos(ph);
			g.push(cyl([
				px,
				py,
				zc(i) - .023
			], [
				px,
				py,
				zc(i) + .023
			], .045, 20));
			for (const sd of [-1, 1]) g.push(ext(web, .024, .002, 6).rotateZ(-ph).translate(0, 0, zc(i) + sd * .0355));
		}
		g.push(cyl([
			0,
			0,
			lb - .015
		], [
			0,
			0,
			lb + .12
		], .04, 24), cyl([
			0,
			0,
			-lb + .015
		], [
			0,
			0,
			-lb - .07
		], .07, 28));
		const damper = latheZ([
			[.04, lb + .035],
			[.15, lb + .035],
			[.15, lb + .075],
			[.04, lb + .075]
		], 48);
		crank.add(m(GEO.merge(g), M.crank), m(damper, M.black));
		part({
			id: "crankshaft",
			label: "Crankshaft and damper",
			what: "The forged steel crankshaft on seven main journals: six throws at 120°, cylinders 1 and 6, 2 and 5, 3 and 4 in pairs, turn the pistons’ push into torque, and its twelve counterweights balance them; a six in line is in balance by itself. The viscous damper on its nose calms its twisting.",
			moves: "Turns at the engine’s speed (shown 40 times slower).",
			drive: "The pistons, through the rods",
			specs: [
				["Stroke", `${Math.round(SIX.stroke * 1e3)} mm`],
				["Main journals", "7, Ø 110 mm [inferred]"],
				["Firing order", SIX.order.join("-")]
			]
		}, [crank], { explode: [
			0,
			-.6,
			0
		] });
	}
	/** @type {THREE.Group[]} */
	const pistons = [];
	/** @type {THREE.Group[]} */
	const rods = [];
	/** @type {THREE.Mesh[]} */
	const flames = [];
	{
		const Rp = R - 5e-4;
		/** @type {V2[]} */
		const prof = [
			[0, ch - .01],
			[.012, ch - .017],
			[.028, ch - .025],
			[.045, ch - .017],
			[.041, ch - .005],
			[.043, ch],
			[Rp, ch]
		];
		for (const y of [
			ch - .012,
			ch - .024,
			ch - .036
		]) prof.push([Rp, y], [Rp - .004, y], [Rp - .004, y - .003], [Rp, y - .003]);
		prof.push([Rp, -.06], [R - .008, -.06], [R - .008, ch - .04], [0, ch - .04]);
		const pg = latheY(prof, 32);
		const pinG = cyl([
			-(R - .006),
			0,
			0
		], [
			R - .006,
			0,
			0
		], .024, 18);
		const flameG = GEO.lathe([
			[0, -.012],
			[.03, -.008],
			[.044, .002],
			[.03, .009],
			[0, .012]
		], 24);
		const rod = new three.Shape();
		const R1 = .062, R2 = .032, wb = .024, wt = .015;
		const y1 = Math.sqrt(R1 * R1 - wb * wb), y2 = L - Math.sqrt(R2 * R2 - wt * wt);
		rod.moveTo(wb, y1);
		rod.absarc(0, 0, R1, Math.atan2(y1, wb), Math.atan2(y1, -.024), true);
		rod.lineTo(-.015, y2);
		rod.absarc(0, L, R2, Math.atan2(y2 - L, -.015), Math.atan2(y2 - L, wt), true);
		rod.closePath();
		rod.holes.push(circle(0, 0, .046), circle(0, L, .0245));
		const rodG = GEO.merge([
			ext(rod, .034, .002, 7),
			cyl([
				.054,
				-.045,
				0
			], [
				.054,
				.016,
				0
			], .007, 8),
			cyl([
				-.054,
				-.045,
				0
			], [
				-.054,
				.016,
				0
			], .007, 8)
		]);
		for (let i = 0; i < n; i++) {
			const pis = new three.Group();
			const fl = m(flameG, M.flame);
			fl.visible = false;
			fl.position.y = ch - .012;
			flames.push(fl);
			pis.add(m(pg, M.piston), m(pinG, M.crank), fl);
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
			count: 6,
			what: "Six forged steel pistons, a re-entrant bowl in each crown where the injector sprays its fuel into the swirling air and it burns, three rings sealing each in its liner. The fire is drawn in a bowl as its cylinder fires, from the start of injection until the fuel has burnt.",
			moves: "Up and down their liners (shown 40 times slower); the fire in each bowl at its firing, in the order 1-5-3-6-2-4.",
			drive: "The burning charge; they drive the rods",
			specs: [
				["Diameter", `${Math.round(SIX.bore * 1e3)} mm`],
				["Compression", `${SIX.cr} : 1`],
				["Rings", "2 compression, 1 oil"]
			]
		}, pistons, {
			explode: [
				0,
				.75,
				0
			],
			tag: tag("cylinder", "Cylinder 1", [
				0,
				ch,
				zc(0)
			], "left")
		});
		for (const fl of flames) fl.castShadow = fl.receiveShadow = false;
		part({
			id: "rods",
			label: "Connecting rods",
			count: 6,
			what: "Forged steel I-section rods, their big ends cracked apart along a line and bolted back on their own broken faces round the crank pins, so each cap goes back exactly where it was.",
			moves: "Swing and slide with the pistons.",
			drive: "The pistons; they drive the crankshaft",
			specs: [["Length", `${Math.round(L * 1e3)} mm between centres`], ["Big end", "Fracture split, 2 bolts"]]
		}, rods, { explode: [
			0,
			.62,
			0
		] });
	}
	const hTop = deck + .11;
	const [arm1, arm2] = SIX.arms, xs = xc - arm1, ys = deck + .21;
	/** the tappet's roller on the cam's base circle */
	const y0 = yc + .028 + .009;
	/** the cam lobes, tappets and rockers, the valves: one of each per cam (cylinder × intake/exhaust) */
	/** @type {{ i: number, intake: boolean, lifter: THREE.Group, rocker: THREE.Group, valves: THREE.Group }[]} */
	const trains = [];
	{
		/** @type {THREE.BufferGeometry[]} */
		const heads = [], bolts = [];
		for (let i = 0; i < n; i++) {
			const s = rrect(.318, p - .004, .012, .018000000000000016 / 2, 0);
			for (const dz of [.032, -.032]) {
				for (const dx of [.027, -.027]) s.holes.push(circle(dx, -dz, .0075));
				s.holes.push(circle(xc, -dz, .011));
			}
			s.holes.push(circle(0, 0, .0125));
			heads.push(onY(plate(s, hTop - deck - .002, 24), (deck + hTop) / 2 + .001).translate(0, 0, zc(i)));
			for (const [bx, bz] of [
				[-.105, .06],
				[-.105, -.06],
				[.092, .06],
				[.092, -.06]
			]) bolts.push(hex([
				bx,
				hTop,
				zc(i) + bz
			], [
				0,
				1,
				0
			], .013, .018), cyl([
				bx,
				hTop,
				zc(i) + bz
			], [
				bx,
				hTop + .003,
				zc(i) + bz
			], .018, 16));
		}
		const gasket = [];
		for (let i = 0; i < n; i++) {
			const s = rrect(.318, p - .004, .012, .018000000000000016 / 2, 0);
			s.holes.push(circle(0, 0, R + .002));
			gasket.push(onY(plate(s, .0018, 24), deck + 9e-4).translate(0, 0, zc(i)));
		}
		part({
			id: "heads",
			label: "Cylinder heads",
			count: 6,
			what: "One cast-iron head for each cylinder, held down on its gasket by four long bolts: its ports, four valves’ seats and guides round the injector’s well in its middle, and the pushrods’ passages; a head comes off alone to work on one cylinder.",
			specs: [["Valves", "4 a cylinder, 24 in all"], ["Bolts", "24, M16 [inferred]"]]
		}, [
			m(GEO.merge(heads), M.iron),
			m(GEO.merge(bolts), M.gear),
			m(GEO.merge(gasket), M.copper)
		], {
			explode: [
				0,
				.42,
				0
			],
			xray: "shell"
		});
		/** @type {THREE.BufferGeometry[]} */
		const cg = [cyl([
			0,
			0,
			-lb - .02
		], [
			0,
			0,
			lb - .01
		], .022, 16)];
		for (const z of mains) cg.push(cyl([
			0,
			0,
			z - .012
		], [
			0,
			0,
			z + .012
		], .026, 20));
		const lobeOf = (w) => {
			const half = (w[1] - w[0]) / 4 * (Math.PI / 180), rb = .028, s = new three.Shape();
			for (let k = 0; k <= 72; k++) {
				const a = k / 72 * Math.PI * 2 - Math.PI, u = Math.abs(a) < half ? Math.cos(Math.PI / 2 * (a / half)) ** 2 : 0;
				const rr = rb + SIX.lift * u;
				if (k === 0) s.moveTo(rr * Math.cos(a), rr * Math.sin(a));
				else s.lineTo(rr * Math.cos(a), rr * Math.sin(a));
			}
			return s;
		};
		for (let i = 0; i < n; i++) for (const intake of [true, false]) {
			const w = intake ? SIX.intake : SIX.exhaust;
			const beta = Math.PI / 2 + (FIRE[i] + (w[0] + w[1]) / 2) * Math.PI / 360;
			cg.push(ext(lobeOf(w), .02, .0015, 4).rotateZ(beta).translate(0, 0, zc(i) + (intake ? .032 : -.032)));
		}
		const cam = spin();
		cam.add(m(GEO.merge(cg), M.crank));
		cam.position.set(xc, yc, 0);
		part({
			id: "camshaft",
			label: "Camshaft",
			what: "One camshaft low in the block, on seven bearings, turned by the gear train at half the crank’s speed: twelve lobes, an intake and an exhaust for each cylinder, each lifting its tappet at its moment of the cycle.",
			moves: "Turns at half the crank’s speed (shown slowed).",
			drive: "The gear train",
			specs: [
				["Lift", `${(SIX.lift * 1e3).toFixed(1)} mm at the tappet`],
				["Exhaust", `opens ${180 - SIX.exhaust[0]}° before bottom centre, closes ${SIX.exhaust[1] - 360}° after top`],
				["Intake", `opens ${360 - SIX.intake[0]}° before top centre, closes ${SIX.intake[1] - 540}° after bottom`]
			]
		}, [cam], { explode: [
			.45,
			-.1,
			0
		] });
		E.userData.cam = cam;
		const tappet = cyl([
			0,
			.003,
			0
		], [
			0,
			.07,
			0
		], .012, 14);
		const roller = cyl([
			0,
			0,
			-.007
		], [
			0,
			0,
			.007
		], .009, 14);
		const top = ys - .024 - y0;
		const pushrod = GEO.merge([cyl([
			0,
			.07,
			0
		], [
			0,
			top,
			0
		], .0055, 8), new three.SphereGeometry(.008, 10, 8).translate(0, top, 0)]);
		const rockerS = new three.Shape();
		rockerS.moveTo(-arm2 - .008, -.012);
		rockerS.lineTo(arm1 + .012, -.004);
		rockerS.lineTo(arm1 + .012, .012);
		rockerS.absarc(0, 0, .022, .4, Math.PI - .3, false);
		rockerS.lineTo(-arm2 - .008, .004);
		rockerS.closePath();
		rockerS.holes.push(circle(0, 0, .0125));
		const rockerG = GEO.merge([
			ext(rockerS, .018, .0015, 6),
			cyl([
				-arm2,
				-.012,
				0
			], [
				-arm2,
				-.022,
				0
			], .008, 10),
			cyl([
				arm1,
				-.004,
				0
			], [
				arm1,
				-.016,
				0
			], .007, 10)
		]);
		const valveG = (dx) => GEO.merge([latheY([
			[0, deck + .001],
			[.021, deck + .001],
			[.021, deck + .004],
			[.006, deck + .016],
			[.0045, deck + .03],
			[.0045, deck + .17],
			[0, deck + .17]
		], 20).translate(dx, 0, 0), cyl([
			dx,
			deck + .152,
			0
		], [
			dx,
			deck + .158,
			0
		], .016, 14)]);
		const springG = (dx) => coil(.0135, .0022, 7, .042, 50, 5).translate(dx, hTop, 0);
		const bridgeG = GEO.merge([at(box(.072, .012, .016, .003), 0, deck + .177, 0), cyl([
			0,
			deck + .183,
			0
		], [
			0,
			deck + .188,
			0
		], .008, 10)]);
		const lifters = new three.Group(), rocks = new three.Group(), vs = new three.Group();
		for (let i = 0; i < n; i++) for (const intake of [true, false]) {
			const z = zc(i) + (intake ? .032 : -.032);
			const lifter = spin();
			lifter.position.set(xc, y0, z);
			lifter.add(m(tappet, M.gear), m(roller, M.crank), m(pushrod, M.valve));
			lifters.add(lifter);
			const rk = spin();
			rk.position.set(xs, ys, z);
			rk.add(m(rockerG, M.rod));
			rocks.add(rk);
			const vg = spin();
			vg.position.z = z;
			vg.add(m(GEO.merge([valveG(.027), valveG(-.027)]), M.valve), m(bridgeG, M.gear));
			vs.add(vg);
			trains.push({
				i,
				intake,
				lifter,
				rocker: rk,
				valves: vg
			});
		}
		const springs = [];
		for (let i = 0; i < n; i++) for (const dz of [.032, -.032]) for (const dx of [.027, -.027]) springs.push(springG(dx).translate(0, 0, zc(i) + dz));
		const shaft = GEO.merge([cyl([
			xs,
			ys,
			-lb + .02
		], [
			xs,
			ys,
			lb - .02
		], .0115, 16), ...Array.from({ length: n }, (_, i) => at(box(.03, ys - hTop + .012, .03, .004), xs, (ys + hTop) / 2 - .006, zc(i)))]);
		part({
			id: "tappets-pushrods",
			label: "Tappets and pushrods",
			count: 12,
			what: "A roller tappet riding on each cam lobe, sliding up its bore in the block, and a steel pushrod from it up through the head to its rocker: twelve, one for each pair of valves.",
			moves: "Rise and fall on their lobes, at the cam’s timing.",
			drive: "The camshaft",
			specs: [["Rollers", "Needle bearings [inferred]"]]
		}, [lifters], { explode: [
			.32,
			.2,
			0
		] });
		part({
			id: "rockers",
			label: "Rockers and rocker shaft",
			count: 12,
			what: "Twelve forged rockers on one hollow shaft over the heads, oiled through it: each one’s short arm is lifted by its pushrod, its long arm presses down on a bridge, opening two valves at once by 1.17 times the cam’s lift.",
			moves: "Rock on their shaft as their pushrods rise.",
			drive: "The pushrods",
			specs: [["Ratio", `${(arm2 / arm1).toFixed(2)} : 1`], ["Valve lift", `${(SIX.lift * arm2 / arm1 * 1e3).toFixed(1)} mm`]]
		}, [rocks, m(shaft, M.gear)], { explode: [
			0,
			.62,
			0
		] });
		part({
			id: "valves",
			label: "Valves, springs and bridges",
			count: 24,
			what: "Twenty-four poppet valves, two intake and two exhaust round each injector, each pair pushed open together through a bridge and shut again by its spring; the exhaust valves of heat-resistant steel.",
			moves: "Open and shut at their cam’s timing: the exhaust pair before the piston’s bottom, the intake pair before its top.",
			drive: "The rockers",
			specs: [["Head", "Ø 42 mm [inferred]"], ["Springs", "24"]]
		}, [vs, m(GEO.merge(springs), M.spring)], { explode: [
			0,
			.52,
			0
		] });
		const inj = [], nozzles = [], plugs = [];
		for (let i = 0; i < n; i++) {
			const z = zc(i);
			inj.push(latheY([
				[0, deck - .004],
				[.004, deck - .004],
				[.0085, deck + .012],
				[.0085, deck + .09],
				[.011, deck + .095],
				[.011, deck + .15],
				[0, deck + .15]
			], 20).translate(0, 0, z));
			nozzles.push(at(box(.05, .008, .016, .003), -.022, hTop + .03, z), cyl([
				-.045,
				hTop,
				z
			], [
				-.045,
				hTop + .035,
				z
			], .006, 8));
			plugs.push(at(box(.024, .018, .02, .004), 0, deck + .158, z));
		}
		part({
			id: "injectors",
			label: "Injectors",
			count: 6,
			what: "Six common-rail injectors stood upright in the middle of each cylinder’s four valves, their nozzles just into the bowl: the control unit opens each with a solenoid for a few thousandths of a second, and the rail’s pressure sprays its fuel through eight holes as a fine mist into the hot, squeezed air, where it lights by itself.",
			moves: "Fire in turn, at their cylinders’ top centres.",
			drive: "The control unit’s signal and the rail’s pressure",
			specs: [["Nozzle", "8 holes [inferred]"], ["Pressure", "Up to 2,400 bar"]]
		}, [
			m(GEO.merge(inj), M.valve),
			m(GEO.merge(nozzles), M.gear),
			m(GEO.merge(plugs), M.black)
		], {
			explode: [
				0,
				.9,
				0
			],
			tag: tag("injector", "Injector", [
				0,
				deck + .16,
				zc(0)
			], "left")
		});
	}
	{
		const g = [walls(.32, .15, 2 * lb - .04, .006, [
			.020000000000000018 / 2,
			hTop + .087,
			0
		], true), at(box(.33999999999999997, .012, 2 * lb - .02, .004), .020000000000000018 / 2, hTop + .006, 0)];
		part({
			id: "rocker-cover",
			label: "Rocker cover",
			what: "One long moulded cover over the six heads, the rockers and the injectors, sealed on its gasket; the oil filler and the crankcase breather in it.",
			specs: [["Material", "Glass-filled polyamide [inferred]"]]
		}, [m(GEO.merge(g), M.cover), m(cyl([
			.06,
			hTop + .15,
			lb - .12
		], [
			.06,
			hTop + .17,
			lb - .12
		], .032, 24), M.yellow)], {
			explode: [
				0,
				1.05,
				0
			],
			xray: "shell"
		});
	}
	const gz = -lb - .022;
	const rk = .065, rc = .13, ri = .05, rp = .065, rac = .065;
	/** the idler where it meets both the crank's gear and the cam's */
	const idler = (() => {
		const d = Math.hypot(xc, yc), a = .115, b = .18, x0 = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x0 * x0));
		const ux = xc / d, uy = yc / d;
		return [x0 * ux + h * uy, x0 * uy - h * ux];
	})();
	const pumpXY = [xc + .195 * Math.cos(.26), yc + .195 * Math.sin(.26)];
	const compXY = [xc + .195 * Math.cos(-.96), yc + .195 * Math.sin(-.96)];
	const gCrank = spin(), gIdler = spin(), gCam = spin(), gPump = spin(), gComp = spin();
	{
		gCrank.add(m(spurGeometry({
			r: rk,
			width: .028,
			module: .005,
			bore: .03
		}), M.gear));
		gIdler.add(m(spurGeometry({
			r: ri,
			width: .028,
			module: .005,
			bore: .015
		}), M.gear));
		gCam.add(m(spurGeometry({
			r: rc,
			width: .028,
			module: .005,
			bore: .02
		}), M.gear), m(GEO.merge([
			0,
			1,
			2,
			3,
			4
		].map((k) => cyl([
			.08 * Math.cos(k * 1.2566),
			.08 * Math.sin(k * 1.2566),
			-.016
		], [
			.08 * Math.cos(k * 1.2566),
			.08 * Math.sin(k * 1.2566),
			.016
		], .018, 12))), M.gear));
		gPump.add(m(spurGeometry({
			r: rp,
			width: .028,
			module: .005,
			bore: .015
		}), M.gear));
		gComp.add(m(spurGeometry({
			r: rac,
			width: .028,
			module: .005,
			bore: .015
		}), M.gear));
		gCrank.position.set(0, 0, gz);
		gIdler.position.set(idler[0], idler[1], gz);
		gCam.position.set(xc, yc, gz);
		gPump.position.set(pumpXY[0], pumpXY[1], gz);
		gComp.position.set(compXY[0], compXY[1], gz);
		part({
			id: "gear-train",
			label: "Gear train",
			count: 5,
			what: "Hardened spur gears in constant mesh at the flywheel end, where the crankshaft twists least: the crank’s gear turns an idler, the idler the camshaft’s gear of twice its teeth (half the speed), and the camshaft’s gear the high-pressure pump’s and the air compressor’s.",
			moves: "Turn together with the crank (shown slowed).",
			drive: "The crankshaft",
			specs: [
				["Cam", "2 : 1"],
				["Pump", "1 : 1"],
				["Air compressor", `${(rk / rac).toFixed(2)} : 1 … 1 : 1 [inferred]`]
			]
		}, [
			gCrank,
			gIdler,
			gCam,
			gPump,
			gComp
		], { explode: [
			0,
			0,
			-.45
		] });
		const cs = [
			[
				0,
				0,
				.095
			],
			[
				idler[0],
				idler[1],
				ri
			],
			[
				xc,
				yc,
				rc
			],
			[
				pumpXY[0],
				pumpXY[1],
				rp
			],
			[
				compXY[0],
				compXY[1],
				rac
			]
		];
		const wall = beltShape(cs, .022);
		wall.holes.push(beltHole(cs, .01));
		const cover = beltShape(cs, .022);
		cover.holes.push(circle(0, 0, .072));
		part({
			id: "gear-housing",
			label: "Timing gear housing",
			what: "The cast housing across the block’s back face round the gear train, its cover behind; the flywheel housing bolts to it, the pump and the compressor stand on its front face.",
			specs: [["Material", "Cast aluminium [inferred]"]]
		}, [m(GEO.merge([plate(wall, .044, 12).translate(0, 0, -lb - .022), plate(cover, .008, 12).translate(0, 0, -lb - .048)]), M.alloy)], {
			explode: [
				0,
				0,
				-.62
			],
			xray: "shell"
		});
	}
	const railX = .215, railY = deck - .05;
	{
		const [px, py] = pumpXY;
		const pumpG = GEO.merge([
			latheZ([
				[0, -lb],
				[.05, -lb],
				[.05, -lb + .16],
				[.042, -lb + .17],
				[.042, -lb + .23],
				[0, -lb + .23]
			], 32).translate(px, py, 0),
			at(box(.06, .05, .08, .008), px, py + .055, -lb + .12),
			cyl([
				px - .03,
				py + .02,
				-lb + .19
			], [
				px - .03,
				py + .07,
				-lb + .19
			], .014, 12)
		]);
		const railG = GEO.merge([
			cyl([
				railX,
				railY,
				zc(5) - .07
			], [
				railX,
				railY,
				zc(0) + .07
			], .017, 20),
			cyl([
				railX,
				railY,
				zc(0) + .07
			], [
				railX,
				railY,
				zc(0) + .11
			], .012, 12),
			cyl([
				railX,
				railY,
				zc(5) - .07
			], [
				railX,
				railY,
				zc(5) - .1
			], .013, 12),
			...Array.from({ length: n }, (_, i) => cyl([
				railX,
				railY - .03,
				zc(i)
			], [
				railX,
				railY + .026,
				zc(i)
			], .012, 12))
		]);
		const lines = [hose([
			[
				px - .03,
				py + .07,
				-lb + .19
			],
			[
				px - .04,
				railY - .02,
				-lb + .12
			],
			[
				railX,
				railY,
				zc(5) - .1
			]
		], .0045, 6)];
		for (let i = 0; i < n; i++) lines.push(hose([
			[
				railX,
				railY + .026,
				zc(i)
			],
			[
				.205,
				deck + .02,
				zc(i)
			],
			[
				.18,
				deck + .045,
				zc(i)
			],
			[
				.17,
				deck + .045,
				zc(i)
			]
		], .0035, 6));
		const nuts = Array.from({ length: n }, (_, i) => hex([
			.168,
			deck + .045,
			zc(i)
		], [
			1,
			0,
			0
		], .011, .012));
		part({
			id: "hp-pump",
			label: "High-pressure fuel pump",
			what: "A two-piston pump on the gear housing, turned by the camshaft’s gear at the crank’s speed: it squeezes the diesel the feed pump brings it to the rail’s pressure, metered by its inlet valve so it gives only what the rail needs.",
			moves: "Its shaft turns with its gear.",
			drive: "The gear train",
			specs: [["Pistons", "2 [inferred]"], ["Up to", "2,400 bar"]]
		}, [m(pumpG, M.alloy)], { explode: [
			.42,
			.05,
			-.2
		] });
		part({
			id: "common-rail",
			label: "Common rail and fuel lines",
			what: "A forged steel tube along the engine’s left, holding the fuel at the injection pressure for all six injectors at once, its sensor at the front end and its relief valve at the back; a steel line from the pump, and six quills from the rail through the heads’ sides to the injectors.",
			specs: [["Pressure", "500 to 2,400 bar, as the control unit’s map asks [inferred]"], ["Lines", "Ø 9 × 2 mm steel [inferred]"]]
		}, [
			m(railG, M.rail),
			m(GEO.merge(lines), M.line),
			m(GEO.merge(nuts), M.gear)
		], {
			explode: [
				.5,
				.15,
				0
			],
			tag: tag("rail", "Common rail", [
				.235,
				railY,
				zc(1)
			], "left")
		});
	}
	const imX = .238, imY = deck + .07;
	{
		const g = [cyl([
			imX,
			imY,
			zc(5) - .07
		], [
			imX,
			imY,
			zc(0) + .05
		], .04, 24), latheZ([
			[0, zc(0) + .04],
			[.045, zc(0) + .04],
			[.045, lb + .02],
			[.052, lb + .02],
			[.052, lb + .035],
			[0, lb + .035]
		], 24).translate(imX, imY, 0)];
		for (let i = 0; i < n; i++) g.push(hose([
			[
				.168,
				deck + .075,
				zc(i) + .032
			],
			[
				.19,
				deck + .075,
				zc(i) + .03
			],
			[
				.218,
				imY,
				zc(i) + .02
			]
		], .02, 12));
		part({
			id: "intake-manifold",
			label: "Intake manifold",
			what: "The cast-aluminium manifold along the heads’ left side: the cooled, pressed air from the charge air cooler comes in at its front and it shares it among the six heads’ intake ports.",
			specs: [["Material", "Cast aluminium"], ["Grid heater", "In its inlet, for cold starts [inferred]"]]
		}, [m(GEO.merge(g), M.alloy)], { explode: [
			.55,
			.3,
			0
		] });
	}
	const emX = -.19, emY = deck + .06;
	const tx = -.345, ty = deck + .04, tzT = -.2, tzC = -.03;
	const turbo = spin(), gateArm = spin();
	{
		const e = [];
		for (const half of [0, 1]) {
			const z0 = half ? zc(5) - .04 : zc(2) - .02, z1 = half ? zc(3) + .02 : zc(0) + .04;
			e.push(cyl([
				emX,
				emY,
				z0
			], [
				emX,
				emY,
				z1
			], .034, 20));
			e.push(hose([
				[
					emX,
					emY,
					half ? zc(4) : zc(1)
				],
				[
					-.25,
					emY - .02,
					tzT + (half ? -.02 : .03)
				],
				[
					-.24499999999999997,
					ty,
					tzT
				]
			], .03, 14));
		}
		for (let i = 0; i < n; i++) e.push(hose([
			[
				-.15,
				deck + .06,
				zc(i) - .032
			],
			[
				-.15 - .02,
				deck + .06,
				zc(i) - .028
			],
			[
				-.18,
				emY,
				zc(i) - .02
			]
		], .021, 12));
		const rings = [zc(2) - .02, zc(3) + .02].map((z) => cyl([
			emX,
			emY,
			z - .012
		], [
			emX,
			emY,
			z + .012
		], .039, 20));
		const shield = at(box(.09, .006, 2 * lb - .1, .003), emX, emY + .05, 0);
		part({
			id: "exhaust-manifold",
			label: "Exhaust manifold",
			what: "Two cast halves, their runners on slip joints so they can grow with the heat: the front three cylinders’ gas and the back three’s kept apart into the turbine’s two inlets, so each cylinder’s pulse drives the wheel without spoiling the next. A stainless shield over it.",
			specs: [["Material", "Ductile iron with silicon and molybdenum [inferred]"], ["Gas", "Up to ~650 °C before the turbine"]]
		}, [m(GEO.merge([...e, ...rings]), M.manifold), m(shield, M.shield)], {
			explode: [
				-.55,
				.15,
				0
			],
			tag: tag("exhaust", "Exhaust manifold", [
				emX,
				emY + .04,
				zc(1)
			], "right")
		});
		const vol = (R0, z0, z1, rIn) => latheZ([
			[rIn, z0],
			[R0 * .8, z0],
			[R0, (z0 + z1) / 2],
			[R0 * .8, z1],
			[rIn, z1]
		], 40);
		const housings = GEO.merge([vol(.115, -.255, -.15000000000000002, .047).translate(tx, ty, 0), latheZ([
			[.04, -.255],
			[.055, -.255],
			[.055, -.31],
			[.06, -.31],
			[.06, -.325],
			[.04, -.325]
		], 32).translate(tx, ty, 0)]);
		const bearing = latheZ([
			[.012, -.15000000000000002],
			[.055, -.15000000000000002],
			[.05, -.11000000000000001],
			[.058, -.09],
			[.058, -.078],
			[.012, -.078]
		], 32).translate(tx, ty, 0);
		const comp = GEO.merge([
			vol(.12, -.078, .010000000000000002, .049).translate(tx, ty, 0),
			latheZ([
				[.036, .010000000000000002],
				[.05, .010000000000000002],
				[.05, .08],
				[.056, .08],
				[.056, .09],
				[.036, .09]
			], 32).translate(tx, ty, 0),
			cyl([
				-.365,
				ty + .1,
				tzC
			], [
				-.365,
				ty + .17,
				tzC
			], .034, 18)
		]);
		const oil = [hose([
			[
				tx,
				ty + .055,
				-.125
			],
			[
				-.305,
				ty + .12,
				-.12000000000000001
			],
			[
				-.16,
				deck - .06,
				-.1
			]
		], .005, 6), hose([
			[
				tx,
				ty - .055,
				-.125
			],
			[
				-.32499999999999996,
				ty - .15,
				-.13
			],
			[
				-.15 - .02,
				.05,
				-.14
			]
		], .011, 8)];
		/** a radial wheel's blades: from its eye (r0 … r1 at z0) out to its tip (r2 at z1), `k` of them */
		const blades = (k, r0, r1, r2, z0, z1, t) => {
			const s = new three.Shape();
			s.moveTo(r0, z0);
			s.lineTo(r1, z0);
			s.quadraticCurveTo(r2 * .95, z0 + (z1 - z0) * .2, r2, z1);
			s.lineTo(r0 + .004, z1);
			s.closePath();
			const one = plate(s, t, 6).rotateX(Math.PI / 2);
			return GEO.ring(one, k, "z");
		};
		const cw = GEO.merge([blades(12, .012, .034, .046, .0050000000000000044, -.05, .0016), latheZ([
			[0, .0050000000000000044],
			[.012, .0050000000000000044],
			[.044, -.05],
			[.046, -.055999999999999994],
			[0, -.055999999999999994]
		], 32)]);
		const tw = GEO.merge([blades(11, .012, .03, .044, -.25, -.19, .002), latheZ([
			[0, -.25],
			[.012, -.25],
			[.04, -.192],
			[.044, -.184],
			[0, -.184]
		], 32)]);
		turbo.add(m(cw, M.wheel), m(tw, M.turbine), m(cyl([
			0,
			0,
			-.19
		], [
			0,
			0,
			-.05
		], .007, 10), M.crank));
		turbo.position.set(tx, ty, 0);
		const act = GEO.merge([latheZ([
			[0, 0],
			[.042, 0],
			[.042, .035],
			[.03, .05],
			[0, .05]
		], 28).rotateX(-Math.PI / 2).translate(-.485, ty + .03, -.05), at(box(.03, .01, .12, .003), -.46499999999999997, ty + 0, -.09)]);
		gateArm.position.set(-.48, ty + 0, -.2);
		gateArm.add(m(GEO.merge([at(box(.012, .045, .01, .002), 0, .02, 0), cyl([
			0,
			.04,
			0
		], [
			0,
			.04,
			.13
		], .0035, 6)]), M.gear));
		part({
			id: "turbocharger",
			label: "Turbocharger",
			what: "On one shaft in its oiled bearing housing: a turbine wheel of nickel alloy in the twin-entry volute, spun by the exhaust gas, and an aluminium compressor wheel in its own volute, which pulls the air in at the front and throws it out pressed. Above its boost the wastegate lets part of the gas round the turbine.",
			moves: "Its wheels spin at the speed the air model gives (shown 2,000 times slower).",
			drive: "The exhaust gas",
			specs: [
				["Compressor wheel", "Ø 96 mm [inferred]"],
				["Speed", "Up to ~100,000 rpm"],
				["Wastegate", `opens from ${((AIR.set - AIR.p0) / 1e5).toFixed(1)} bar boost`]
			]
		}, [
			turbo,
			m(housings, M.hot),
			m(bearing, M.iron),
			m(comp, M.alloy),
			m(GEO.merge(oil), M.line),
			m(act, M.black),
			gateArm
		], {
			explode: [
				-.75,
				.35,
				0
			],
			tag: tag("turbo", "Turbocharger", [
				-.46499999999999997,
				ty + .06,
				tzC
			], "right")
		});
	}
	const za = lb + .1;
	const wpXY = [-.15, .06], altXY = [-.23, .25], fanXY = [0, .33], tenXY = [.14, .12];
	const aCrank = spin(), aPump = spin(), aAlt = spin(), aFan = spin(), aTen = spin(), fan = spin();
	{
		const fc = beltShape([[
			0,
			0,
			.16
		], [
			wpXY[0],
			wpXY[1],
			.08
		]], 0);
		const front = GEO.merge([
			plate(fc, .03, 16).translate(0, 0, lb + .015),
			latheZ([
				[.03, lb + .03],
				[.07, lb + .03],
				[.07, za - .02],
				[.03, za - .02]
			], 24).translate(wpXY[0], wpXY[1], 0),
			at(box(.06, .12, .05, .01), fanXY[0], fanXY[1] - .04, lb + .025),
			cyl([
				fanXY[0],
				fanXY[1],
				lb + .04
			], [
				fanXY[0],
				fanXY[1],
				za - .02
			], .03, 18),
			cyl([
				0,
				deck - .01,
				lb
			], [
				0,
				deck + .06,
				lb + .05
			], .035, 18)
		]);
		const groove = (rr, w) => latheZ([
			[.02, -w / 2],
			[rr, -w / 2],
			[rr - .004, -w / 4],
			[rr, 0],
			[rr - .004, w / 4],
			[rr, w / 2],
			[.02, w / 2]
		], 40);
		aCrank.add(m(groove(.11, .036), M.black));
		aPump.add(m(groove(.06, .036), M.black));
		aAlt.add(m(groove(.035, .034), M.gear));
		aFan.add(m(groove(.09, .036), M.black));
		aTen.add(m(latheZ([
			[.01, -.019],
			[.04, -.019],
			[.04, .019],
			[.01, .019]
		], 24), M.gear));
		for (const [g, xy] of [
			[aCrank, [0, 0]],
			[aPump, wpXY],
			[aAlt, altXY],
			[aFan, fanXY],
			[aTen, tenXY]
		]) g.position.set(xy[0], xy[1], za);
		const cs = [
			[
				0,
				0,
				.11
			],
			[
				tenXY[0],
				tenXY[1],
				.04
			],
			[
				fanXY[0],
				fanXY[1],
				.09
			],
			[
				altXY[0],
				altXY[1],
				.035
			],
			[
				wpXY[0],
				wpXY[1],
				.06
			]
		];
		part({
			id: "front-cover",
			label: "Front cover, water pump and thermostat",
			what: "The cast cover over the block’s front end round the crank’s seal and the oil pump; the water pump in it drives the coolant through the block, the liners’ jackets and the heads, and the thermostat housing on top sends it to the radiator once it is warm.",
			specs: [["Water pump", "Centrifugal, ~450 L/min at rated speed [inferred]"], ["Thermostat", "Opens at 83 °C [inferred]"]]
		}, [m(front, M.alloy)], { explode: [
			0,
			.05,
			.45
		] });
		const tenArm = GEO.merge([at(box(.03, .12, .025, .006), tenXY[0] + .02, tenXY[1] - .05, za - .03), cyl([
			tenXY[0] + .03,
			tenXY[1] - .1,
			lb + .03
		], [
			tenXY[0] + .03,
			tenXY[1] - .1,
			za - .02
		], .025, 16)]);
		part({
			id: "accessory-drive",
			label: "Belt drive",
			what: "One poly-V belt from the crank’s pulley round the fan’s hub, the alternator’s and the water pump’s pulleys, held tight by a spring tensioner.",
			moves: "The belt and its pulleys turn with the engine.",
			drive: "The crankshaft",
			specs: [["Belt", "8-rib poly-V [inferred]"]]
		}, [
			aCrank,
			aPump,
			aAlt,
			aFan,
			aTen,
			m(beltGeometry(cs, .006, .034).translate(0, 0, za), M.belt),
			m(tenArm, M.black)
		], { explode: [
			0,
			.05,
			.75
		] });
		part({
			id: "alternator",
			label: "Alternator",
			what: "Turned by the belt at about three times the crank’s speed, it charges the 24 V batteries and runs everything electric on the truck.",
			moves: "Its rotor turns with its pulley.",
			drive: "The belt",
			specs: [["Output", "28 V, 150 A [inferred]"]]
		}, [m(GEO.merge([latheZ([
			[0, -.16],
			[.075, -.16],
			[.08, -.13],
			[.08, -.03],
			[.06, -.012],
			[0, -.012]
		], 32).translate(altXY[0], altXY[1], za), at(box(.05, .03, .12, .006), altXY[0] + .05, altXY[1] - .07, za - .1)]), M.alloy), aAlt], { explode: [
			-.45,
			.2,
			.4
		] });
		fan.add(m(GEO.rotor({
			count: 9,
			axis: "z",
			r0: .09,
			r1: .37,
			chord: [.09, .12],
			thick: .06,
			camber: .08,
			twist: .4,
			pitch: .42,
			nS: 5,
			nC: 7
		}), M.cover), m(latheZ([
			[0, 0],
			[.11, 0],
			[.12, .03],
			[.11, .075],
			[0, .075]
		], 36).translate(0, 0, -.075), M.alloy));
		fan.position.set(fanXY[0], fanXY[1], za + .1);
		part({
			id: "fan",
			label: "Fan and viscous coupling",
			what: "Nine moulded blades, 750 mm across, on the fan hub through a viscous coupling: the silicone fluid in it locks the fan to the hub when the air through the radiator is hot and lets it slip when it is not.",
			moves: "Turns with its hub.",
			drive: "The belt, through the coupling",
			specs: [["Diameter", "750 mm [inferred]"]]
		}, [fan], { explode: [
			0,
			.1,
			1
		] });
	}
	{
		const sw = .36, half = lb - .01;
		const ring = (w, l, t) => {
			const s = rrect(w, l, .03);
			s.holes.push(rrect(w - 2 * t, l - 2 * t, .025));
			return s;
		};
		const z0 = -half / 2;
		const g = [
			onY(plate(ring(sw, 2 * half, .004), .05, 8), -.215),
			onY(plate(rrect(sw, half, .03), .004, 8), -.24).translate(0, 0, half / 2),
			onY(plate(ring(sw, half, .004), .17, 8), -.325).translate(0, 0, z0),
			onY(plate(rrect(sw, half, .03), .004, 8), -.41000000000000003).translate(0, 0, z0),
			cyl([
				0,
				-.41000000000000003,
				z0
			], [
				0,
				-.425,
				z0
			], .014, 6)
		];
		part({
			id: "sump",
			label: "Sump",
			what: "The oil pan under the bedplate, deep at its back end where the oil pump’s pickup draws, shallow over the front axle; its drain plug at the bottom.",
			specs: [["Oil", "36 L, 10W-40 [inferred]"]]
		}, [m(GEO.merge(g), M.pan), m(at(box(.348, .12, half - .012, .012), 0, -.35, z0), M.oil)], {
			explode: [
				0,
				-.5,
				0
			],
			xray: "shell"
		});
		const oc = GEO.merge([at(box(.045, .13, .46, .012), -.19, .12, -.06), cyl([
			-.21,
			.05,
			.3
		], [
			-.21,
			.19,
			.3
		], .03, 16)]);
		const filters = GEO.merge([cyl([
			-.235,
			.04,
			.24
		], [
			-.235,
			-.16,
			.24
		], .05, 28), cyl([
			-.235,
			.04,
			.36
		], [
			-.235,
			-.16,
			.36
		], .05, 28)]);
		part({
			id: "oil-cooler-filters",
			label: "Oil cooler and filters",
			count: 2,
			what: "A stack of plates in the coolant on the block’s right side that takes the oil’s heat into the water, and two full-flow filters hanging under its housing; the oil pump pushes all the oil through them before the bearings.",
			specs: [["Filters", "2 spin-on, Ø 100 mm [inferred]"]]
		}, [
			m(oc, M.alloy),
			m(filters, M.filter),
			m(GEO.merge([hose([
				[
					-.15 - .02,
					0,
					.5
				],
				[
					-.19,
					deck - .05,
					.47
				],
				[
					-.2,
					deck + .17,
					.46
				]
			], .005, 8)]), M.line),
			m(cyl([
				-.2,
				deck + .17,
				.46
			], [
				-.2,
				deck + .19,
				.46
			], .012, 12), M.yellow)
		], { explode: [
			-.42,
			-.1,
			.1
		] });
		const [cx, cy] = compXY;
		const comp = GEO.merge([latheZ([
			[0, -lb],
			[.062, -lb],
			[.062, -lb + .15],
			[.05, -lb + .165],
			[0, -lb + .165]
		], 32).translate(cx, cy, 0), cyl([
			cx + .04,
			cy,
			-lb + .08
		], [
			cx + .15,
			cy,
			-lb + .08
		], .05, 24)]);
		const head = GEO.merge([at(box(.03, .11, .11, .008), cx + .165, cy, -lb + .08)]);
		part({
			id: "air-compressor",
			label: "Air compressor",
			what: "A piston compressor on the gear housing, turned by the camshaft’s gear: it fills the truck’s air tanks for the brakes, the suspension, the gearbox’s shift unit and the clutch, its head cooled by the engine’s water.",
			moves: "Its crank turns with its gear.",
			drive: "The gear train",
			specs: [["Displacement", "~700 cm³, 1 cylinder [inferred]"], ["Pressure", "Up to 12.5 bar"]]
		}, [m(comp, M.alloy), m(head, M.black)], { explode: [
			.5,
			-.2,
			-.3
		] });
		const st = [-.25, -.1];
		part({
			id: "starter",
			label: "Starter motor",
			what: "A 24 V motor on the flywheel housing: its solenoid throws its pinion into the flywheel’s ring gear and it spins the engine to start it.",
			specs: [["Power", "5.5 kW, 24 V [inferred]"]]
		}, [m(GEO.merge([cyl([
			st[0],
			st[1],
			-lb - .07
		], [
			st[0],
			st[1],
			-lb + .2
		], .06, 24), cyl([
			st[0] + .03,
			st[1] + .075,
			-lb - .05
		], [
			st[0] + .03,
			st[1] + .075,
			-lb + .1
		], .03, 16)]), M.black)], { explode: [
			-.45,
			-.2,
			-.2
		] });
		const ecu = GEO.merge([at(box(.035, .18, .28, .01), .2, .03, .2), at(box(.02, .04, .05, .006), .22499999999999998, .1, .33)]);
		/** @type {THREE.BufferGeometry[]} */
		const harness = [hose([
			[
				.22499999999999998,
				.12,
				.34
			],
			[
				.22999999999999998,
				deck - .03,
				.42
			],
			[
				.12,
				hTop + .05,
				zc(0) + .08
			],
			[
				.1,
				hTop + .05,
				zc(5) - .05
			]
		], .008, 8)];
		part({
			id: "ecu",
			label: "Engine control unit",
			what: "The engine’s computer on rubber mounts on the block’s left: from the pedal, the boost, the temperatures and the crank’s and cam’s positions it sets the rail’s pressure and when and how long each injector opens; its harness runs to all six under the cover.",
			specs: [["Sensors", "Crank, cam, boost, rail, air and coolant temperatures [inferred]"]]
		}, [m(ecu, M.ecu), m(GEO.merge(harness), M.harness)], { explode: [
			.42,
			-.05,
			.2
		] });
		const mg = [], rub = [];
		for (const sx of [-1, 1]) {
			mg.push(at(box(.1, .03, .14, .006), sx * .24, -.03, lb - .16), at(box(.03, .09, .12, .006), sx * .21, .02, lb - .16));
			rub.push(cyl([
				sx * .26,
				-.105,
				lb - .16
			], [
				sx * .26,
				-.045,
				lb - .16
			], .04, 20));
			mg.push(at(box(.09, .03, .12, .006), sx * .32, -.04, -lb - .12));
			rub.push(cyl([
				sx * .36,
				-.115,
				-lb - .12
			], [
				sx * .36,
				-.055,
				-lb - .12
			], .04, 20));
		}
		part({
			id: "engine-mounts",
			label: "Engine mounts",
			count: 4,
			what: "Four rubber blocks on the frame’s brackets, two at the front of the block, two at the flywheel housing: they carry 1,500 kg of engine and gearbox, take its torque and keep its shake out of the frame.",
			specs: [["Rubber", "Bonded, ~60 Shore A [inferred]"]]
		}, [m(GEO.merge(mg), M.black), m(GEO.merge(rub), M.hose)], { explode: [
			0,
			-.3,
			0
		] });
	}
	const fly = spin(), clutchSpin = spin();
	fly.add(m(GEO.merge([latheZ([
		[.07, 0],
		[.235, 0],
		[.235, -.06],
		[.2, -.06],
		[.2, -.035],
		[.07, -.035]
	], 56), spurGeometry({
		r: .245,
		width: .025,
		module: .007,
		bore: .228
	}).translate(0, 0, -.02)]), M.gear));
	fly.position.z = -lb - .065;
	part({
		id: "flywheel",
		label: "Flywheel",
		what: "A heavy steel disc on the crank’s back flange: it carries the engine through the strokes between firings and is the clutch’s friction face; the starter turns its ring gear.",
		moves: "Turns with the crankshaft.",
		specs: [["Mass", "~60 kg [inferred]"], ["Ring gear", "~140 teeth"]]
	}, [fly], { explode: [
		0,
		0,
		-.75
	] });
	clutchSpin.add(m(GEO.shell([
		[.225, 0],
		[.225, -.03],
		[.09, -.05]
	], .006, 48).rotateX(Math.PI / 2), M.gear), m(latheZ([
		[.12, .002],
		[.215, .002],
		[.215, -.008],
		[.12, -.008]
	], 48), M.friction));
	clutchSpin.position.z = -lb - .13;
	part({
		id: "clutch",
		label: "Clutch",
		assembly: o.gearAssembly,
		what: "One 430 mm friction disc pressed on the flywheel by its cover’s diaphragm spring; an air cylinder on the clutch housing pulls it apart to pull away and to change gear, so the truck has no clutch pedal.",
		moves: "Turns with the flywheel; slips while it pulls away.",
		drive: "Its air actuator, from the gearbox’s control unit",
		specs: [["Disc", "Ø 430 mm, single dry plate [inferred]"]]
	}, [clutchSpin], { explode: [
		0,
		0,
		-.95
	] });
	part({
		id: "flywheel-housing",
		label: "Flywheel housing",
		what: "The cast-iron housing round the flywheel, bolted to the gear housing; the starter on it, the gearbox’s clutch housing bolted behind.",
		specs: [["Size", "SAE 1 [inferred]"]]
	}, [m(GEO.merge([GEO.shell([
		[.3, -lb - .064],
		[.3, -lb - .1],
		[.27, -lb - .16]
	], .008, 56).rotateX(Math.PI / 2), latheZ([
		[.255, -lb - .052],
		[.32, -lb - .052],
		[.32, -lb - .066],
		[.255, -lb - .066]
	], 56)]), M.iron)], {
		explode: [
			0,
			0,
			-.85
		],
		xray: "shell"
	});
	const zg = -lb - .16, zm = zg - .62, zr = zm - .2, zo = zr - .02;
	const gin = spin(), glay = spin(), gmain = spin(), sun = spin(), ringG = spin(), carrier = spin(), outF = spin();
	/** @type {{ g: THREE.Group, k: number }[]} */
	const freeGears = [];
	/** @type {THREE.Group[]} */
	const planets = [];
	const Zs = 24, Zr = 86, Zp = 31;
	const range = o.range;
	{
		const clutchH = GEO.shell([
			[.27, zg + .002],
			[.24, zg - .08],
			[.22, zg - .12]
		], .008, 48).rotateX(Math.PI / 2);
		const caseG = GEO.merge([walls(.4, .42, zg - .12 - zm, .012, [
			0,
			-.04,
			(zg - .12 + zm) / 2
		]), GEO.shell([
			[.17, zm],
			[.17, zm - .03],
			[.165, zr + .03],
			[.12, zr],
			[.05, zr]
		], .01, 48).rotateX(Math.PI / 2)]);
		const d = .13;
		glay.position.set(0, -.13, 0);
		gin.add(m(GEO.merge([cyl([
			0,
			0,
			zg + .04
		], [
			0,
			0,
			zg - .16
		], .022, 14), spurGeometry({
			r: .045,
			width: .03,
			module: .005
		}).translate(0, 0, zg - .14)]), M.gear));
		glay.add(m(GEO.merge([cyl([
			0,
			0,
			zg - .13
		], [
			0,
			0,
			zm + .04
		], .022, 14), spurGeometry({
			r: .085,
			width: .03,
			module: .005
		}).translate(0, 0, zg - .14)]), M.gear));
		[
			1.28,
			2.55,
			1.6,
			1,
			3.2
		].forEach((k, j) => {
			const rm = d * k / (1 + k), rl = d - rm, z = zg - .22 - j * .085;
			glay.add(m(spurGeometry({
				r: rl,
				width: .026,
				module: .005
			}).translate(0, 0, z), M.gear));
			const fg = spin();
			fg.add(m(spurGeometry({
				r: rm,
				width: .026,
				module: .005,
				bore: .025
			}), M.gear));
			fg.position.z = z;
			freeGears.push({
				g: fg,
				k: 1 / k
			});
		});
		gmain.add(m(GEO.merge([cyl([
			0,
			0,
			zg - .17
		], [
			0,
			0,
			zr + .06
		], .025, 14), ...[
			0,
			1,
			2
		].map((j) => cyl([
			0,
			0,
			zg - .26 - j * .17
		], [
			0,
			0,
			zg - .215 - j * .17
		], .04, 18))]), M.crank));
		sun.add(m(spurGeometry({
			r: Zs * .003 / 2,
			width: .05,
			module: .003
		}), M.gear));
		sun.position.z = zm - .09;
		const ringS = new three.Shape();
		ringS.absarc(0, 0, .14100000000000001, 0, Math.PI * 2, false);
		const teeth = [];
		for (let k = 0; k < Zr; k++) teeth.push(at(slab(.0035, .006, .05), 0, .131, 0).rotateZ(k / Zr * Math.PI * 2));
		ringS.holes.push(circle(0, 0, .132));
		ringG.add(m(GEO.merge([plate(ringS, .05, 48), ...teeth]), M.gear));
		ringG.position.z = zm - .09;
		const rpl = Zp * .003 / 2, rarm = .165 / 2;
		carrier.add(m(GEO.merge([latheZ([
			[.03, -.04],
			[.10250000000000001, -.04],
			[.10250000000000001, -.03],
			[.03, -.03]
		], 40), cyl([
			0,
			0,
			-.04
		], [
			0,
			0,
			zo - (zm - .09)
		], .035, 18)]), M.crank));
		carrier.position.z = zm - .09;
		for (let k = 0; k < 4; k++) {
			const pl = spin();
			pl.add(m(spurGeometry({
				r: rpl,
				width: .048,
				module: .003,
				bore: .012
			}), M.gear));
			const a = k * Math.PI / 2;
			pl.position.set(rarm * Math.cos(a), rarm * Math.sin(a), 0);
			carrier.add(pl);
			planets.push(pl);
		}
		outF.add(m(GEO.merge([latheZ([
			[.03, 0],
			[.09, 0],
			[.09, -.02],
			[.03, -.02]
		], 32), ...Array.from({ length: 8 }, (_, k) => cyl([
			.072 * Math.cos(k * .785),
			.072 * Math.sin(k * .785),
			.002
		], [
			.072 * Math.cos(k * .785),
			.072 * Math.sin(k * .785),
			-.03
		], .006, 8))]), M.rod));
		outF.position.z = zo;
		part({
			id: "clutch-housing",
			label: "Clutch housing",
			assembly: o.gearAssembly,
			what: "The gearbox’s cast bell bolted to the flywheel housing round the clutch, its air actuator on its side.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(clutchH, M.alloy), m(cyl([
			.27,
			.12,
			zg - .04
		], [
			.27,
			.12,
			zg - .2
		], .04, 18), M.black)], {
			explode: [
				0,
				0,
				-1.1
			],
			xray: "shell"
		});
		part({
			id: "gearbox",
			label: "Gearbox, 12 speeds",
			assembly: o.gearAssembly,
			what: "An automated 12-speed gearbox: a splitter at its front halves every step, a three-speed main box multiplies them, and a planetary range at its back multiplies them again, low or high; its control unit picks the gear and its air cylinders shift it, no lever and no pedal.",
			specs: [
				["Ratios", o.gears.map((g) => g.toFixed(2)).join(" · ")],
				["Oil", "13 L, 75W-80 [inferred]"],
				["Mass", "~270 kg [inferred]"]
			]
		}, [m(caseG, M.alloy)], {
			explode: [
				0,
				0,
				-1.3
			],
			xray: "shell",
			tag: tag("gearbox", "Gearbox", [
				.2,
				.1,
				(zg + zm) / 2
			], "right")
		});
		part({
			id: "gear-sets",
			label: "Shafts and gears",
			assembly: o.gearAssembly,
			what: "Inside the case: the input shaft and the splitter’s two gears, the countershaft and its cluster below, the main shaft with the gears that ride free on it until a collar locks one, all in constant mesh.",
			moves: "The shafts and gears turn (shown slowed).",
			drive: "The clutch",
			specs: [["Splitter", "1.28 : 1"], ["Main box", "2.55 · 1.60 · 1.00"]]
		}, [
			gin,
			glay,
			gmain,
			...freeGears.map((f) => f.g)
		], { explode: [
			0,
			-.45,
			-1.3
		] });
		part({
			id: "range",
			label: "Planetary range",
			assembly: o.gearAssembly,
			what: `A sun gear on the main shaft, four planets on their carrier round it and a ring gear round them: in the low range the ring is held, and the carrier turns ${range.toFixed(2)} times slower than the sun; in the high range the ring is locked to the carrier and all of it turns as one.`,
			moves: "The sun, the planets and the carrier turn; the ring is held in the low range.",
			drive: "The main shaft",
			specs: [["Teeth", `sun ${Zs}, planets ${Zp}, ring ${Zr}`], ["Ratio", `${range.toFixed(2)} : 1 low, 1 : 1 high`]]
		}, [
			sun,
			ringG,
			carrier,
			outF
		], { explode: [
			0,
			-.3,
			-1.6
		] });
		const shift = GEO.merge([at(box(.22, .09, .3, .02), .04, .215, (zg + zm) / 2 - .05), at(box(.12, .05, .08, .012), -.07, .205, (zg + zm) / 2 + .12)]);
		part({
			id: "shift-unit",
			label: "Shift unit and control",
			assembly: o.gearAssembly,
			what: "On the gearbox’s top: the air cylinders and valves that move its forks, and its own control unit, which picks each gear from the speed, the load and the slope and shifts it in a fraction of a second.",
			specs: [["Air", "8.5 bar from the compressor [inferred]"]]
		}, [m(shift, M.black), m(hose([
			[
				.1,
				.26,
				(zg + zm) / 2
			],
			[
				.2,
				.3,
				(zg + zm) / 2 + .1
			],
			[
				.25,
				.12,
				zg - .1
			]
		], .005, 6), M.hose)], { explode: [
			0,
			.4,
			-1.2
		] });
	}
	return {
		group: E,
		/** points of the engine in its parent's frame */
		points: {
			out: [
				o.at[0],
				o.at[1],
				o.at[2] + zo - .03
			],
			airIn: [
				o.at[0] + tx,
				o.at[1] + ty,
				o.at[2] + tzC + .12
			],
			boostOut: [
				o.at[0] + tx - .02,
				o.at[1] + ty + .17,
				o.at[2] + tzC
			],
			intake: [
				o.at[0] + imX,
				o.at[1] + imY,
				o.at[2] + lb + .035
			],
			exhaust: [
				o.at[0] + tx,
				o.at[1] + ty,
				o.at[2] + tzT - .125
			],
			waterOut: [
				o.at[0],
				o.at[1] + deck + .06,
				o.at[2] + lb + .05
			],
			waterIn: [
				o.at[0] + wpXY[0],
				o.at[1] + wpXY[1] - .07,
				o.at[2] + za - .02
			],
			fan: [
				o.at[0] + fanXY[0],
				o.at[1] + fanXY[1],
				o.at[2] + za + .1
			]
		},
		size: {
			lb,
			deck,
			hw,
			za
		},
		/**
		* Turn it: the crank to `a` (rad, as shown), the gearbox's output to `ap`, with the clutch slipping or not, in
		* `gear` (1 … 12); the turbo to `turboAng`, the wastegate `gate` open (0 … 1), the fire as big as `fire` (0 … 1).
		* @param {{ a: number, ap: number, slipping?: boolean, gear: number, turboAng: number, gate: number, fire: number, running: boolean }} st
		*/
		update({ a, ap, slipping = false, gear, turboAng, gate, fire, running }) {
			crank.rotation.z = fly.rotation.z = clutchSpin.rotation.z = gCrank.rotation.z = aCrank.rotation.z = -a;
			gIdler.rotation.z = a * rk / ri;
			gCam.rotation.z = E.userData.cam.rotation.z = -a / 2;
			gPump.rotation.z = gComp.rotation.z = a;
			aPump.rotation.z = -a * .11 / .06;
			aAlt.rotation.z = -a * .11 / .035;
			aFan.rotation.z = fan.rotation.z = -a * .11 / .09;
			aTen.rotation.z = -a * .11 / .04;
			turbo.rotation.z = turboAng;
			gateArm.rotation.x = -.5 * gate;
			const ain = slipping ? -a * .6 : -a;
			gin.rotation.z = ain;
			glay.rotation.z = -ain * .045 / .085;
			for (const f of freeGears) f.g.rotation.z = ain * f.k;
			const low = gear <= 6;
			const wc = -ap, ws = low ? wc * range : wc;
			gmain.rotation.z = sun.rotation.z = ws;
			carrier.rotation.z = outF.rotation.z = wc;
			ringG.rotation.z = low ? 0 : wc;
			for (const pl of planets) pl.rotation.z = -((ws - wc) * Zs) / Zp;
			const deg = a * 180 / Math.PI;
			for (let i = 0; i < n; i++) {
				const t = a + pin(i), px = r * Math.sin(t), py = r * Math.cos(t);
				const yp = py + Math.sqrt(L * L - px * px);
				pistons[i].position.y = yp;
				rods[i].position.set(px, py, zc(i));
				rods[i].rotation.z = Math.atan2(px, yp - py);
				const phi = cyc(deg - FIRE[i] + 4), dur = 12 + 40 * fire;
				const f = running && fire > .02 && phi < dur ? Math.sin(Math.PI * phi / dur) : 0;
				flames[i].visible = f > .05;
				flames[i].scale.set(.4 + .6 * f, .5 + .9 * f, .4 + .6 * f);
			}
			for (const tr of trains) {
				const phi = cyc(deg - FIRE[tr.i]);
				const u = SIX.lift * liftAt(phi, tr.intake ? SIX.intake : SIX.exhaust);
				tr.lifter.position.y = y0 + u;
				tr.rocker.rotation.z = u / arm1;
				tr.valves.position.y = -(u * arm2) / arm1;
			}
		},
		/** the stroke cylinder 1 is in, and how far through it (0 … 1) @param {number} a */
		strokeOf(a) {
			const phi = cyc(a * 180 / Math.PI - FIRE[0]);
			return {
				name: [
					"power",
					"exhaust",
					"intake",
					"compression"
				][Math.floor(phi / 180)],
				k: phi % 180 / 180,
				phi
			};
		}
	};
}

//#endregion
//#region src/lib/machines/truck.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** @typedef {ReturnType<typeof assetKit>} Kit */
const TYRE = /* @__PURE__ */ (() => tyreSize(315, 70, 22.5))();
const TTYRE = /* @__PURE__ */ (() => tyreSize(385, 65, 22.5))();
/** the wheels' middles off the road: each tyre sunk 15 mm under its load */
const YW = /* @__PURE__ */ (() => TYRE.r - .015)();
const YT = /* @__PURE__ */ (() => TTYRE.r - .015)();
/** the wheels' studs and their circle (m) */
const STUDS = 10;
const PCD = .335;
/** the truck's measures (m) */
const TR = {
	W: 2.55,
	front: 8.24,
	/** the steer and the drive axle (z), the front wheels' and the twins' middles (x) */
	axle: {
		steer: 7.05,
		drive: 3.25,
		front: 1.04,
		twins: [.745, 1.085]
	},
	/** the kingpin in the fifth wheel: where the trailer rests and pulls */
	king: {
		z: 3.9,
		y: 1.15
	},
	/** the frame's C rails: their outer faces at ±x, their top and depth, their ends */
	frame: {
		x: .43,
		top: 1,
		h: .27,
		front: 7.95,
		rear: 2.45
	},
	/** the crank's middle */
	engine: [
		0,
		.95,
		6.68
	],
	/** the cab: its back, its face, its bottom over the wheels and its apron in front, its floor and roof, its half width; the hinge it tilts on (z, y) */
	cab: {
		back: 6,
		face: 8.2,
		bottom: 1.2,
		apron: .95,
		floor: 1.75,
		roof: 3.8,
		X: 1.25,
		hinge: [7.98, 1.05]
	},
	door: {
		z: [6.25, 7.5],
		y: [1.25, 3.1],
		split: 2.32
	},
	driver: {
		x: .6,
		z: 6.95
	},
	/** the trailer: its front wall and its back, its floor's top and its roof, its axles and their wheels' middles (x), its main rails (x) */
	trailer: {
		front: 5.5,
		rear: -8.1,
		floor: 1.3,
		roof: 4,
		axles: [
			-2.49,
			-3.8,
			-5.11
		],
		x: 1.02,
		beam: .55,
		legs: 1.45
	}
};
/** how far the cab tilts, wide open (rad) */
const TILT = /* @__PURE__ */ (() => 60 * Math.PI / 180)();
const SOURCES = [
	{
		label: "Road load, grip and axle loads (Wong, Theory of Ground Vehicles)",
		url: "https://en.wikipedia.org/wiki/Rolling_resistance"
	},
	{
		label: "Drag of tractor-trailers (Hucho, Aerodynamics of Road Vehicles)",
		url: "https://en.wikipedia.org/wiki/Automobile_drag_coefficient"
	},
	{
		label: "Weights and dimensions of road vehicles (EU Directive 96/53/EC)",
		url: "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:31996L0053"
	},
	{
		label: "Tyre markings (ETRTO)",
		url: "https://en.wikipedia.org/wiki/Tire_code"
	},
	{
		label: "Fifth wheel and kingpin (ISO 337)",
		url: "https://en.wikipedia.org/wiki/Fifth-wheel_coupling"
	},
	{
		label: "Air springs and air suspension",
		url: "https://en.wikipedia.org/wiki/Air_suspension"
	},
	{
		label: "The engine and its turbocharger (Heywood; Watson & Janota)",
		url: "https://en.wikipedia.org/wiki/Turbocharger"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
const SRC = /* @__PURE__ */ (() => ({
	road: SOURCES[0].label,
	air: SOURCES[1].label,
	eu: SOURCES[2].label,
	tyre: SOURCES[3].label,
	king: SOURCES[4].label,
	bags: SOURCES[5].label,
	eng: SOURCES[6].label
}))();
const ASSEMBLIES = [
	{
		id: "chassis",
		label: "Frame and suspension",
		note: "The ladder frame of two C rails; the forged front axle on its leaf springs and the steering; the drive axle on its four air bellows.",
		out: [
			0,
			-.9,
			0
		]
	},
	{
		id: "wheels",
		label: "Wheels and brakes",
		note: "Six 315/70 R22.5 tyres on ten-stud steel wheels, twins on the drive axle; a disc brake worked by air at every wheel.",
		out: [
			.7,
			-.2,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "The 12.8 L six under the cab, 338 kW and 2,300 N·m, its turbocharger and its common rail.",
		out: [
			0,
			.7,
			.5
		]
	},
	{
		id: "drivetrain",
		label: "Gearbox and drive",
		note: "The clutch, the 12-speed automated gearbox, the propshaft and the drive axle’s gears.",
		out: [
			0,
			-.6,
			-.5
		]
	},
	{
		id: "services",
		label: "Cooling, fuel, air and exhaust",
		note: "The radiator and the charge air cooler in front of the engine, the fuel and AdBlue tanks, the batteries, the air tanks and filter, the exhaust’s aftertreatment.",
		out: [
			0,
			-.4,
			.3
		]
	},
	{
		id: "cab",
		label: "Cab",
		note: "The steel cab over the engine on two hinges and two rear mounts: its sides, face, roof and deflector, the glass, the lights, the mirrors, the bumper and the steps.",
		out: [
			0,
			1.3,
			.5
		]
	},
	{
		id: "doors",
		label: "Cab doors",
		note: "Two doors, each on two hinges at its front edge.",
		out: [
			.9,
			.3,
			0
		]
	},
	{
		id: "interior",
		label: "Inside the cab",
		note: "The dashboard and its gauges, the steering wheel, the pedals, two seats on air, the bunk behind them.",
		out: [
			0,
			.9,
			0
		]
	},
	{
		id: "coupling",
		label: "Fifth wheel and lines",
		note: "The fifth wheel on its mounting plate, the trailer’s kingpin locked in it, the air and electric lines between the two.",
		out: [
			0,
			.9,
			0
		]
	},
	{
		id: "trailer",
		label: "Trailer chassis",
		note: "The trailer’s kingpin plate, its two main rails and cross members, its floor, its landing legs and its guards.",
		out: [
			0,
			-.7,
			-.6
		]
	},
	{
		id: "running",
		label: "Trailer axles",
		note: "Three axles on air bellows and trailing arms, six 385/65 R22.5 tyres, a disc brake at each.",
		out: [
			.6,
			-.5,
			-.6
		]
	},
	{
		id: "box",
		label: "Trailer box",
		note: "The box on the floor: its sandwich walls and roof, its front wall, its rear frame and two doors.",
		out: [
			0,
			1.3,
			-.6
		]
	}
];
const STEPS = [
	"Rivet the frame; hang the front axle on its springs and the drive axle on its air",
	"Bolt on the wheels and brakes",
	"Drop in the engine on its mounts",
	"Bolt on the gearbox and the propshaft",
	"Fit the radiator, the tanks, the batteries, the air filter and the exhaust",
	"Lower the cab onto its hinges and mounts; fit its glass, lights, mirrors, bumper and steps",
	"Hang the cab’s doors",
	"Fit the dashboard, the seats and the bunk",
	"Bolt on the fifth wheel and couple the lines",
	"Build the trailer’s chassis and floor",
	"Hang the trailer’s axles and wheels",
	"Build the box on the floor and hang its doors"
];
/** the gearbox (./diesel6.js): the splitter, the three-speed main box, the planetary range */
const RANGE = 4.583;
const HIGH = [
	3.264,
	2.55,
	2.048,
	1.6,
	1.28,
	1
];
const GEARS = /* @__PURE__ */ (() => [...HIGH.map((g) => +(g * RANGE).toFixed(2)), ...HIGH.map((g) => +g.toFixed(2))])();
/** where the masses are (kg; z, y in m) [inferred] */
const MASS = {
	tractor: {
		m: 7400,
		z: 5.85,
		y: 1.05
	},
	trailer: {
		m: 7e3,
		z: -1.1,
		y: 1.25
	},
	/** the payload's middle: spread on the floor along the box */
	load: {
		z: -1.3,
		y: 2.1
	},
	/** what does not ride on the springs, by axle */
	unsprung: {
		steer: 900,
		drive: 1400,
		trailer: 750
	}
};
/** the air bellows: their effective area (m², Ø 300 mm) and the supply's pressure (Pa) [inferred] */
const BAG = /* @__PURE__ */ (() => ({
	A: Math.PI * .15 ** 2,
	supply: 85e4
}))();
/** the front springs' rate, each side (N/m), and their bump stops' travel from the kerb's ride height (m) [inferred] */
const KF = 3e5;
const TRAVEL_F = .07;
/** the drive tyres' grip on dry asphalt [inferred] */
const MU = .75;
/**
* The loads on the axles (N): the trailer on its kingpin and its bogie, the tractor on its two axles with the
* kingpin's load and its pull; climbing and pulling move load back off the kingpin and off the steer axle.
* @param {number} load the payload (kg) @param {number} a the acceleration (m/s²) @param {number} th the grade's angle (rad)
*/
function axleLoads(load, a, th) {
	const { king, axle, trailer: T } = TR;
	const zb = T.axles[1];
	const mt = MASS.trailer.m + load;
	const zt = (MASS.trailer.m * MASS.trailer.z + load * MASS.load.z) / mt;
	const ht = (MASS.trailer.m * MASS.trailer.y + load * MASS.load.y) / mt;
	const c = Math.cos(th), push = a + G * Math.sin(th);
	const pull = mt * push;
	const kingN = (mt * G * c * (zt - zb) - pull * (ht - king.y)) / (king.z - zb);
	const bogie = mt * G * c - kingN;
	const { m: mc, z: zc, y: hc } = MASS.tractor;
	const steer = (mc * G * c * (zc - axle.drive) + kingN * (king.z - axle.drive) - pull * king.y - mc * push * hc) / (axle.steer - axle.drive);
	return {
		steer,
		drive: mc * G * c + kingN - steer,
		bogie,
		king: kingN,
		pull
	};
}
/** the loads with the trailer empty, standing: the ride height the springs are set at */
const KERB = /* @__PURE__ */ (() => axleLoads(0, 0, 0))();
/** the bellows' pressure (Pa, over the air's) under an axle load @param {number} N @param {number} unsprung @param {number} n */
const bagP = (N, unsprung, n) => Math.max(0, (N - unsprung * G) / (n * BAG.A));
/** the tractor and its trailer as the solver runs them [inferred where marked in the research] */
const VEHICLE = /* @__PURE__ */ (() => ({
	kerb: MASS.tractor.m + MASS.trailer.m,
	payload: 25600,
	Crr: .0055,
	CdA: 5.6,
	r: TYRE.r * .965,
	eta: .92,
	gears: GEARS,
	final: 2.53,
	engine: {
		rpm: [
			500,
			600,
			800,
			1e3,
			1400,
			1600,
			1800,
			1900,
			2e3,
			2100,
			2200
		],
		nm: [
			900,
			1150,
			1700,
			2300,
			2300,
			2015,
			1790,
			1700,
			1560,
			1e3,
			0
		],
		idle: 600,
		stall: 450,
		max: 2100,
		up: 1800,
		down: 1e3,
		launch: 900,
		Vd: VD,
		fmep: 13e4,
		bsfc: 172,
		fuel: "diesel",
		J: 3.5
	},
	Jw: 16,
	wheels: 12,
	axles: {
		wb: TR.axle.steer - TR.axle.drive,
		h: 1.6,
		front: .37,
		loadFront: .07,
		k: [KF, 1e9],
		travel: [TRAVEL_F, .1]
	},
	grip: (s, inp) => MU * axleLoads(inp.load, s.a, Math.atan(inp.grade)).drive
}))();
const KMH = 1 / 3.6;
/** tonnes, to one place @param {number} N */
const tonnes = (N) => fmt(N / G / 1e3, 1);
/** the truck's paint and trim, the cab's and the box's colours as a world gives them */
function materials(cab, boxColour) {
	return {
		paint: MAT.paint({
			color: cab,
			roughness: .36,
			clearcoat: .5,
			clearcoatRoughness: .3
		}),
		box: MAT.paint({
			color: boxColour,
			roughness: .48,
			clearcoat: .2,
			clearcoatRoughness: .5
		}),
		trim: MAT.satin({
			color: [
				.035,
				.035,
				.038
			],
			roughness: .6
		}),
		grey: MAT.plastic({
			color: [
				.12,
				.125,
				.13
			],
			roughness: .55
		}),
		rubber: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .7
		}),
		chrome: MAT.chrome({ roughness: .12 }),
		glass: MAT.glass({
			color: [
				.84,
				.92,
				.94
			],
			roughness: .04
		}),
		mirror: MAT.chrome({ roughness: .02 }),
		lens: MAT.glass({
			color: [
				.95,
				.95,
				.92
			],
			roughness: .08,
			thickness: .01
		}),
		red: MAT.plastic({
			color: [
				.45,
				.02,
				.015
			],
			roughness: .25,
			transmission: .4,
			thickness: .01
		}),
		amber: MAT.plastic({
			color: [
				.8,
				.32,
				.02
			],
			roughness: .25,
			transmission: .4,
			thickness: .01
		}),
		reflector: MAT.chrome({ roughness: .2 }),
		plate: MAT.paint({
			color: [
				.85,
				.85,
				.82
			],
			roughness: .4
		}),
		floor: MAT.rubber({
			color: [
				.04,
				.04,
				.043
			],
			roughness: .85
		}),
		fabric: MAT.satin({
			color: [
				.16,
				.17,
				.19
			],
			roughness: .95,
			finish: "cast"
		}),
		vinyl: MAT.plastic({
			color: [
				.035,
				.035,
				.038
			],
			roughness: .62
		}),
		dash: MAT.plastic({
			color: [
				.06,
				.06,
				.065
			],
			roughness: .7
		}),
		card: MAT.plastic({
			color: [
				.22,
				.22,
				.23
			],
			roughness: .85
		}),
		lining: MAT.satin({
			color: [
				.5,
				.49,
				.46
			],
			roughness: .95,
			finish: "cast"
		}),
		dial: MAT.satin({
			color: [
				.015,
				.015,
				.018
			],
			roughness: .4
		}),
		white: MAT.plastic({
			color: [
				.85,
				.85,
				.82
			],
			roughness: .4
		}),
		needle: MAT.plastic({
			color: [
				.85,
				.22,
				.02
			],
			roughness: .3
		}),
		mattress: MAT.satin({
			color: [
				.24,
				.27,
				.32
			],
			roughness: .95,
			finish: "cast"
		}),
		tank: MAT.aluminium({
			color: [
				.82,
				.83,
				.84
			],
			roughness: .2,
			finish: "brushed"
		}),
		tread: MAT.aluminium({
			color: [
				.7,
				.71,
				.72
			],
			roughness: .45
		}),
		adblue: MAT.plastic({
			color: [
				.06,
				.06,
				.065
			],
			roughness: .5
		}),
		blueCap: MAT.plastic({
			color: [
				.04,
				.2,
				.7
			],
			roughness: .35
		}),
		battery: MAT.plastic({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .5
		}),
		lead: MAT.steel({
			color: [
				.42,
				.42,
				.44
			],
			roughness: .5,
			finish: "cast"
		}),
		core: MAT.aluminium({
			color: [
				.55,
				.56,
				.57
			],
			roughness: .6
		}),
		stainless: MAT.stainless({
			roughness: .3,
			finish: "brushed"
		}),
		filterBox: MAT.plastic({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .55
		}),
		airTank: MAT.paint({
			color: [
				.05,
				.05,
				.055
			],
			roughness: .5
		}),
		wood: MAT.satin({
			color: [
				.28,
				.17,
				.09
			],
			roughness: .8,
			finish: "cast"
		}),
		alu: MAT.aluminium({
			color: [
				.74,
				.75,
				.76
			],
			roughness: .35
		}),
		lineRed: MAT.plastic({
			color: [
				.6,
				.04,
				.02
			],
			roughness: .4
		}),
		lineYellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .4
		}),
		lineBlack: MAT.plastic({
			color: [
				.03,
				.03,
				.033
			],
			roughness: .4
		}),
		hydraulic: MAT.chrome({ roughness: .08 })
	};
}
/** a box from one point to another, w × d across it @param {V3} a @param {V3} b @param {number} w @param {number} d @param {number} [r] */
function link(a, b, w, d, r = .004) {
	const A = new three.Vector3(...a), dir = new three.Vector3(...b).sub(A), L = dir.length();
	const g = box(w, L, d, r).translate(0, L / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), dir.normalize()));
	return g.translate(A.x, A.y, A.z);
}
/** a coiled line from one point to another @param {V3} a @param {V3} b @param {number} R @param {number} wire @param {number} turns */
function coilFrom(a, b, R, wire, turns) {
	const A = new three.Vector3(...a), dir = new three.Vector3(...b).sub(A), L = dir.length();
	const g = coil(R, wire, turns, L, turns * 18, 6);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), dir.normalize()));
	return g.translate(A.x, A.y, A.z);
}
/**
* A rolling-lobe air spring standing at (x, z) from its piston's foot at y0 to its top plate at y1, r round: the steel
* piston, the rubber bellows rolling over it, the bead plate bolted under the frame.
* @param {number} x @param {number} y0 @param {number} y1 @param {number} z @param {number} r
*/
function airSpring(x, y0, y1, z, r) {
	const h = y1 - y0;
	const piston = latheY([
		[0, y0],
		[r * .6, y0],
		[r * .64, y0 + h * .5],
		[0, y0 + h * .5]
	], 32);
	const bellows = latheY([
		[0, y0 + h * .36],
		[r * .64, y0 + h * .36],
		[r * .9, y0 + h * .5],
		[r, y0 + h * .68],
		[r * .97, y0 + h * .88],
		[r * .9, y1 - .014],
		[0, y1 - .014]
	], 36);
	const top = latheY([
		[0, y1 - .014],
		[r * .93, y1 - .014],
		[r * .93, y1],
		[0, y1]
	], 32);
	return {
		rubber: bellows.translate(x, 0, z),
		steel: GEO.merge([piston, top]).translate(x, 0, z)
	};
}
/**
* A 22.5" steel truck wheel in its own frame (the axle along x, the rim's middle at x 0): the barrel with its flanges
* and its well, the flat disc at x = et (its outer face) with the ten stud holes and the centre bore, the cone that
* joins the disc to the well.
* @param {{ size: ReturnType<typeof tyreSize>, rimW: number, et: number }} o
*/
function rimGeometry({ size, rimW, et }) {
	const barrel = barrelGeometry({
		rim: size.rim,
		rimW,
		t: .006,
		seg: 48
	});
	const s = new three.Shape();
	s.absarc(0, 0, .212, 0, Math.PI * 2, false);
	s.holes.push(circle(0, 0, .1405));
	for (let k = 0; k < STUDS; k++) {
		const a = k / STUDS * Math.PI * 2;
		s.holes.push(circle(PCD / 2 * Math.cos(a), PCD / 2 * Math.sin(a), .0135));
	}
	const disc = onX(plate(s, .014, 40), et - .007);
	const well = size.rim - .028;
	const cone = latheX([
		[.205, et - .012],
		[well + .005, .062],
		[well + .005, .046],
		[.205, et - .024]
	], 48);
	return GEO.merge([
		barrel,
		disc,
		cone
	]);
}
/** where stud k stands round the axle (y, z), as the disc's holes are drawn @param {number} k */
const studAt = (k) => {
	const a = k / STUDS * Math.PI * 2;
	return [PCD / 2 * Math.sin(a), -.1675 * Math.cos(a)];
};
/**
* One wheel station: in a frame at the hub's face (`at`, mirrored to look out to `side`), the wheel or the twins
* (`wheel-<id>`: tyres, rims, studs and nuts, the hub and its cap, the brake disc, all turning) and what holds still
* (`brake-<id>`: the calliper on its bracket and the air chamber that works it).
* @param {Kit} kit
* @param {{ id: string, label: string, at: V3, side: 1 | -1, size: ReturnType<typeof tyreSize>, rimW: number, et: number, twin?: boolean, spring?: boolean, angle: number, parent: THREE.Object3D, assembly: string, drive?: string, tag?: import('$lib/assets/parts.js').How['tag'], M: ReturnType<typeof materials>, R: ReturnType<typeof vehicleMaterials> }} o
*/
function station(kit, o) {
	const { M, R } = o;
	const m = (g, mat) => kit.mesh(g, mat);
	const st = new three.Group();
	st.name = `station-${o.id}`;
	st.position.set(...o.at);
	st.scale.x = o.side;
	o.parent.add(st);
	const turn = new three.Group();
	const tyre = tyreGeometry({
		size: o.size,
		rimW: o.rimW,
		pattern: "highway",
		pitches: 34
	});
	const rim = rimGeometry({
		size: o.size,
		rimW: o.rimW,
		et: o.et
	});
	turn.add(m(tyre.clone().translate(-o.et, 0, 0), R.tyre), m(rim.clone().translate(-o.et, 0, 0), R.rimSteel));
	if (o.twin) {
		const outer = new three.Group();
		outer.scale.x = -1;
		outer.position.x = o.et + .014;
		outer.add(m(tyre, R.tyre), m(rim, R.rimSteel));
		turn.add(outer);
	}
	const face = o.twin ? .028 : .014;
	const ks = Array.from({ length: STUDS }, (_, k) => k);
	const nuts = GEO.merge(ks.map((k) => hex([
		face,
		studAt(k)[0],
		studAt(k)[1]
	], [
		1,
		0,
		0
	], .0185, .026)));
	const studs = GEO.merge(ks.map((k) => cyl([
		-.04,
		studAt(k)[0],
		studAt(k)[1]
	], [
		face + .034,
		studAt(k)[0],
		studAt(k)[1]
	], .011, 8)));
	const hub = latheX([
		[.07, -.26],
		[.115, -.26],
		[.125, -.06],
		[.205, -.055],
		[.205, -.014],
		[.07, -.014]
	], 40);
	const cap = o.twin ? GEO.merge([latheX([
		[0, face],
		[.1, face],
		[.1, face + .014],
		[.06, face + .03],
		[0, face + .03]
	], 32), ...Array.from({ length: 8 }, (_, k) => hex([
		face + .014,
		.08 * Math.sin(k * Math.PI / 4),
		.08 * Math.cos(k * Math.PI / 4)
	], [
		1,
		0,
		0
	], .009, .012))]) : latheX([
		[0, face],
		[.1, face],
		[.098, face + .03],
		[.07, face + .065],
		[0, face + .072]
	], 32);
	const d = discGeometry({
		r: .215,
		rIn: .13,
		t: .045,
		hat: .15
	});
	const hat = latheX([
		[.118, -.055],
		[.136, -.055],
		[.136, -.182],
		[.118, -.182]
	], 40);
	turn.add(m(GEO.merge([nuts]), M.chrome), m(studs, R.zinc), m(hub, R.forged), m(cap, o.twin ? R.forged : M.chrome), m(d.rings.translate(-.055, 0, 0), R.disc), m(hat, R.castIron));
	const rimIn = Math.round(o.size.rim * 2 / .0254 * 10) / 10;
	kit.part(turn, {
		id: `wheel-${o.id}`,
		label: `${o.twin ? "Twin wheels" : "Wheel"}, ${o.label}`,
		assembly: o.assembly,
		source: SRC.tyre,
		count: o.twin ? 2 : 1,
		what: `${o.twin ? "Two" : "A"} ${o.size.code} tubeless tyre${o.twin ? "s" : ""} on ${o.twin ? "" : "a "}${(o.rimW / .0254).toFixed(2)} × ${rimIn}" steel wheel${o.twin ? "s, their discs back to back on the hub" : ""}, held by ten M22 nuts on studs pressed into the hub; the hub turns on two taper bearings on the ${o.drive ? "axle’s end, the half-shaft bolted to its cap" : "spindle"}, and the brake disc is bolted to its back.`,
		moves: "Rolls with the road (shown turning 10 times slower).",
		drive: o.drive ?? "The road; its brake stops it",
		specs: [
			["Tyre", o.size.code],
			["Outer diameter", `${Math.round(o.size.r * 2e3)} mm`],
			["Wheel", `${(o.rimW / .0254).toFixed(2)} × ${rimIn}", ${STUDS} studs on ${Math.round(PCD * 1e3)} mm, ${Math.round(o.et * 1e3)} mm inset`],
			["Disc", "Ø 430 × 45 mm, vented"]
		]
	}, {
		explode: [
			.55,
			0,
			0
		],
		tag: o.tag
	}, st);
	const xd = -.205, ca = o.angle, rc = .245;
	const cal = calliperGeometry({
		r: .215,
		t: .045,
		angle: ca,
		span: .5
	}).translate(xd, 0, 0);
	const cy = rc * Math.sin(ca), cz = rc * Math.cos(ca);
	const bracket = GEO.merge([link([
		-.245,
		cy * .7,
		cz * .7
	], [
		-.245,
		0,
		0
	], .03, .12), link([
		-.255,
		cy,
		cz
	], [
		-.405,
		cy,
		cz
	], .06, .05)]);
	const L = o.spring ? .3 : .18;
	const chamber = GEO.merge([cyl([
		-.405,
		cy,
		cz
	], [
		-.405 - L,
		cy,
		cz
	], .085, 24), latheX([
		[.03, -.405 - L],
		[.088, -.405 - L],
		[.088, -.419 - L],
		[.03, -.419 - L]
	], 24).translate(0, cy, cz)]);
	const airLine = hose([
		[
			-.405 - L * .6,
			cy + .085,
			cz
		],
		[
			-.505 - L * .6,
			cy + .16,
			cz - .05
		],
		[
			-.655 - L * .6,
			cy + .2,
			cz - .08
		]
	], .008, 8);
	kit.part(new three.Group().add(m(cal, R.calliper), m(bracket, R.forged), m(chamber, M.airTank), m(airLine, M.rubber)), {
		id: `brake-${o.id}`,
		label: `Disc brake, ${o.label}`,
		assembly: o.assembly,
		source: SRC.road,
		what: `A sliding calliper over the disc’s back edge, worked by air: the ${o.spring ? "spring brake chamber (a service diaphragm in front, a strong spring behind that the air holds back: let the air out and the spring brakes, so a broken line stops the truck)" : "chamber"}’s pushrod turns a lever in the calliper that presses the pads on the disc from both sides.`,
		specs: [
			["Pads", "Two, ~ 0.16 m² together [inferred]"],
			["Chamber", o.spring ? "Type 24/24, spring brake" : "Type 22"],
			["Air", "8.5 bar at most"]
		]
	}, { explode: [
		.3,
		.18,
		0
	] }, st);
	return {
		st,
		turn,
		/** roll it to `a` (rad, forward positive) @param {number} a */
		set(a) {
			turn.rotation.x = a;
		}
	};
}
/**
* The truck: a root at its real size, every part its own, its solver driving it.
* @param {{ cab?: string, box?: string, speed?: number, grade?: number, load?: number, tilt?: number, doors?: number, rear?: number }} [o]
*   the cab's and the box's colours (hex), the speed asked (km/h), the grade (%), the payload (kg), how far the cab is
*   tilted, its doors and the trailer's rear doors are open (0 … 1)
* @returns {THREE.Group}
*/
function truck({ cab: cabColour = "#a33a2a", box: boxColour = "#e0ddd6", speed = 80, grade = 0, load = 16e3, tilt = 0, doors = 0, rear = 0 } = {}) {
	const root = new three.Group();
	root.name = "Truck";
	const M = materials(cabColour, boxColour), R = vehicleMaterials(), D = dieselMaterials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps: STEPS,
		sources: SOURCES
	});
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** the tractor's sprung body: the frame and all it carries, pitching on the front springs */
	const body = new three.Group();
	body.name = "sprung";
	root.add(body);
	/** the trailer, on the fifth wheel and its bogie's bellows */
	const trailer = new three.Group();
	trailer.name = "trailer";
	root.add(trailer);
	/** a part: its meshes, its card and how it is shown (in the tractor's body unless said) */
	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	const { axle, frame: F, cab: C, door: DR, trailer: T } = TR;
	const sim = vehicleSolver(VEHICLE);
	const air = airOf();
	const kmh = () => sim.s.v * 3.6;
	/** the loads as the solver last left them */
	let L = KERB;
	{
		const g = [];
		for (const sx of [-1, 1]) {
			const x0 = sx * F.x, x1 = sx * (F.x - .007), xi = sx * (F.x - .09), b = F.top - F.h;
			const s = new three.Shape();
			s.moveTo(x0, b);
			s.lineTo(x0, F.top);
			s.lineTo(xi, F.top);
			s.lineTo(xi, F.top - .007);
			s.lineTo(x1, F.top - .007);
			s.lineTo(x1, b + .007);
			s.lineTo(xi, b + .007);
			s.lineTo(xi, b);
			s.closePath();
			g.push(plate(s, F.front - F.rear, 2).translate(0, 0, (F.front + F.rear) / 2));
			const xs = sx * .385;
			g.push(at(box(.1, .07, .09, .008), xs, b - .03, axle.steer + .8), at(box(.1, .07, .07, .008), xs, b - .03, axle.steer - .8));
			g.push(at(box(.11, .14, .14, .01), xs, b - .06, 4.15));
			g.push(at(box(.05, .1, .08, .008), sx * (F.x + .025), F.top - .07, axle.steer + .2), at(box(.05, .1, .08, .008), sx * (F.x + .025), F.top - .08, 3.5));
			g.push(at(box(.2, .016, .15, .004), sx * .325, .837, 7.039), at(box(.012, .09, .15, .004), sx * .419, .875, 7.039));
			g.push(at(box(.1, .016, .13, .004), sx * .375, .827, 6.041), at(box(.012, .09, .13, .004), sx * .419, .865, 6.041));
			for (const z of [
				6.25,
				5.05,
				4.1
			]) g.push(at(box(.16, .05, .08, .008), sx * (F.x + .08), .86, z));
			g.push(at(box(.08, .2, .1, .008), sx * .6, 1, 6.12), at(box(.2, .03, .1, .006), sx * .52, F.top + .015, 6.12));
		}
		g.push(at(box(.846, .22, .01, .004), 0, F.top - .135, F.front - .03), at(box(.846, .07, .12, .006), 0, F.top - .035, 4.6), at(box(.846, .12, .1, .006), 0, .84, 3.9), at(box(.846, .24, .01, .004), 0, F.top - .135, F.rear + .03));
		part({
			id: "frame",
			label: "Ladder frame",
			assembly: "chassis",
			source: SRC.road,
			what: "Two pressed-steel C rails the length of the tractor, 850 mm apart outside, their webs out and their flanges in, joined by cross members riveted to them: a plate at the front for the bumper, top-hat sections over the propshaft, a deep one at the back. The springs’ hangers, the engine’s brackets, the outriggers for the steps and the tanks are riveted to the webs.",
			specs: [["Rails", "270 × 90 × 7 mm, high-tensile steel [inferred]"], ["Length", `${(F.front - F.rear).toFixed(2)} m`]]
		}, [m(GEO.merge(g), R.chassis)], { explode: [
			0,
			-.8,
			0
		] });
	}
	const springs = [];
	const CAMBER = .035;
	{
		const zs = axle.steer;
		const top = [
			[-.82, .57],
			[-.56, .625],
			[-.29, .625],
			[-.19, .48],
			[.19, .48],
			[.29, .625],
			[.56, .625],
			[.82, .57]
		];
		const bot = [
			[.82, .455],
			[.55, .505],
			[.3, .505],
			[.21, .37],
			[-.21, .37],
			[-.3, .505],
			[-.55, .505],
			[-.82, .455]
		];
		const beamS = roundPoly([...top, ...bot], .02);
		const g = [plate(beamS, .09, 6).translate(0, 0, zs)];
		const bosses = [], arms = [];
		for (const sx of [-1, 1]) {
			const xk = sx * .86;
			bosses.push(cyl([
				xk,
				.4,
				zs
			], [
				xk,
				.62,
				zs
			], .055, 24), cyl([
				xk,
				.38,
				zs
			], [
				xk,
				.64,
				zs
			], .022, 12), cyl([
				xk,
				YW,
				zs
			], [
				sx * .95,
				YW,
				zs
			], .06, 24), latheX([
				[.03, 0],
				[.085, 0],
				[.085, .05],
				[.03, .05]
			], 24).translate(sx * .86 - (sx > 0 ? 0 : .05), YW, zs));
			arms.push(link([
				xk,
				.47,
				zs - .03
			], [
				sx * .74,
				.47,
				zs - .23
			], .04, .03));
		}
		arms.push(link([
			.86,
			.62,
			zs + .02
		], [
			.84,
			.66,
			zs + .2
		], .04, .035), cyl([
			-.74,
			.47,
			zs - .23
		], [
			.74,
			.47,
			zs - .23
		], .025, 14), cyl([
			.84,
			.66,
			zs + .2
		], [
			.64,
			.62,
			7.45
		], .022, 12));
		part({
			id: "front-axle",
			label: "Front axle and steering linkage",
			assembly: "chassis",
			source: SRC.road,
			what: "A forged steel I-beam across under the engine, dropped in its middle to clear the sump: a kingpin through each end carries a knuckle with its spindle, and the knuckles are tied by the tie rod behind the axle so they steer together; the drag link pulls the left one’s steering arm from the steering box.",
			moves: "Rides up and down with the road on its springs; its knuckles steer (held straight here).",
			drive: "The steering box, through the drag link",
			specs: [["Rated", "7.1 t [inferred]"], ["Track", `${Math.round(axle.front * 2e3)} mm`]]
		}, [
			m(GEO.merge(g), R.forged),
			m(GEO.merge(bosses), R.castIron),
			m(GEO.merge(arms), R.forged)
		], {
			explode: [
				0,
				-.5,
				.3
			],
			tag: {
				text: "Steer axle",
				at: [
					.6,
					.6,
					zs
				],
				side: "right",
				value: () => `${tonnes(L.steer)} t on it (7.1 t allowed) · sunk ${fmt(sag.f * 1e3)} mm`
			}
		}, root);
		const leaves = [], eyes = [], steel = [];
		for (const sx of [-1, 1]) {
			const lp = leafPack({
				L: 1.6,
				w: .09,
				t: .022,
				n: 2,
				camber: CAMBER
			});
			springs.push(lp);
			const grp = new three.Group();
			grp.position.set(sx * .385, .658, zs);
			grp.add(m(lp.geo, R.spring));
			for (const e of lp.eyes) {
				e.add(m(lp.eye.clone().scale(1.4, 1.4, 1.4), R.spring), m(cyl([
					-.06,
					0,
					0
				], [
					.06,
					0,
					0
				], .014, 10), R.zinc));
				grp.add(e);
			}
			leaves.push(grp);
			for (const dz of [-.07, .07]) for (const dx of [-.055, .055]) steel.push(cyl([
				sx * .385 + dx,
				.5,
				zs + dz
			], [
				sx * .385 + dx,
				.71,
				zs + dz
			], .011, 8));
			steel.push(at(box(.13, .025, .2, .006), sx * .385, .71, zs));
			steel.push(link([
				sx * .44,
				.69,
				zs - .8
			], [
				sx * .44,
				.735,
				zs - .82
			], .016, .04), link([
				sx * .33,
				.69,
				zs - .8
			], [
				sx * .33,
				.735,
				zs - .82
			], .016, .04));
			eyes.push(cyl([
				sx * .47,
				.56,
				zs + .12
			], [
				sx * .47,
				.76,
				zs + .17
			], .035, 16), cyl([
				sx * .47,
				.76,
				zs + .17
			], [
				sx * .46,
				.92,
				zs + .2
			], .016, 10));
		}
		part({
			id: "front-springs",
			label: "Front springs and dampers",
			count: 2,
			assembly: "chassis",
			source: SRC.road,
			what: "A parabolic spring each side: two tapered steel leaves clamped to the axle’s pad by four U-bolts, hung from the frame at their front eyes and swinging on shackles at their back ones as they flatten; a telescopic damper beside each.",
			moves: "They flatten as the load on the steer axle grows.",
			drive: "The axle’s load",
			specs: [["Leaves", "2 parabolic, 1.6 m between the eyes"], ["Rate", `${Math.round(KF / 1e3)} kN/m a side [inferred]`]]
		}, [
			...leaves,
			m(GEO.merge(steel), R.zinc),
			m(GEO.merge(eyes), R.damper)
		], { explode: [
			0,
			-.6,
			.5
		] }, root);
		const sb = GEO.merge([
			at(box(.15, .2, .2, .02), .52, .86, 7.45),
			cyl([
				.6,
				.84,
				7.45
			], [
				.64,
				.84,
				7.45
			], .035, 16),
			cyl([
				.5,
				.96,
				7.45
			], [
				.5,
				1.2,
				7.62
			], .02, 10)
		]);
		part({
			id: "steering-box",
			label: "Steering box",
			assembly: "chassis",
			source: SRC.road,
			what: "A recirculating-ball steering box with its own hydraulic power assist, bolted outside the left rail: the shaft from the steering wheel turns its worm, and its drop arm swings the drag link forward and back.",
			specs: [["Assist", "Hydraulic, from a pump on the gear train [inferred]"]]
		}, [m(sb, R.castIron), m(link([
			.64,
			.84,
			7.45
		], [
			.64,
			.6,
			7.45
		], .05, .04), R.forged)], { explode: [
			.5,
			-.3,
			.3
		] });
	}
	const crown = new three.Group(), shafts = new three.Group();
	{
		const zd = axle.drive;
		const housing = GEO.shell([
			[.08, -.19],
			[.18, -.17],
			[.245, -.09],
			[.255, 0],
			[.245, .09],
			[.18, .17],
			[.08, .19]
		], .012, 48).rotateZ(-Math.PI / 2).translate(0, YW, zd);
		const tubes = [];
		for (const sx of [-1, 1]) tubes.push(cyl([
			sx * .18,
			YW,
			zd
		], [
			sx * .66,
			YW,
			zd
		], .075, 24), cyl([
			sx * .66,
			YW,
			zd
		], [
			sx * .9,
			YW,
			zd
		], .06, 20), at(box(.16, .03, .22, .008), sx * .385, YW - .085, zd));
		const carrierShell = GEO.shell([
			[.19, .12],
			[.14, .24],
			[.085, .36],
			[.06, .4]
		], .012, 32).rotateX(Math.PI / 2).translate(0, YW + .02, zd);
		part({
			id: "drive-axle",
			label: "Drive axle",
			assembly: "drivetrain",
			source: SRC.road,
			what: "A pressed-steel banjo housing across the frame: in its bowl the crown wheel and the differential, the pinion in the carrier in front of it driven by the propshaft; the half-shafts through its tubes turn the hubs of the twin wheels. Single reduction, 2.53 : 1.",
			moves: "Its gears and shafts turn with the wheels.",
			drive: "The propshaft",
			specs: [
				["Ratio", "2.53 : 1, hypoid [inferred]"],
				["Rated", "11.5 t"],
				["Oil", "13 L, 75W-90 [inferred]"]
			]
		}, [m(GEO.merge([
			housing,
			...tubes,
			carrierShell
		]), R.chassis)], {
			explode: [
				0,
				-.5,
				-.2
			],
			xray: "shell",
			tag: {
				text: "Drive axle",
				at: [
					-.6,
					YW + .1,
					zd
				],
				side: "left",
				value: () => `${tonnes(L.drive)} t on it (11.5 t allowed) · its tyres grip ${fmt(MU * L.drive / 1e3)} kN`
			}
		}, root);
		crown.position.set(0, YW, zd);
		crown.add(m(spurGeometry({
			r: .19,
			width: .04,
			module: .006,
			bore: .07
		}).rotateY(Math.PI / 2).translate(.07, 0, 0), D.gear), m(latheX([
			[.03, -.1],
			[.12, -.1],
			[.14, .05],
			[.03, .05]
		], 32), D.iron));
		shafts.position.set(0, YW, zd);
		shafts.add(m(GEO.merge([cyl([
			-.9,
			0,
			0
		], [
			-.06,
			0,
			0
		], .028, 14), cyl([
			.06,
			0,
			0
		], [
			.9,
			0,
			0
		], .028, 14)]), D.crank));
		part({
			id: "differential",
			label: "Crown wheel and differential",
			assembly: "drivetrain",
			source: SRC.road,
			what: "Inside the bowl: the pinion turns the crown wheel 2.53 times slower; the crown wheel carries the differential’s case, whose bevel gears share its push between the two half-shafts and let them turn at different speeds round a bend.",
			moves: "Turns with the wheels.",
			drive: "The pinion",
			specs: [["Crown wheel", "Ø ~ 400 mm [inferred]"]]
		}, [crown, shafts], { explode: [
			0,
			.4,
			-.4
		] }, root);
		const arms = [], rubber = [], steel = [], damp = [];
		for (const sx of [-1, 1]) {
			const x = sx * .385;
			arms.push(link([
				x,
				.62,
				4.15
			], [
				x,
				.4,
				zd
			], .08, .06), link([
				x,
				.4,
				zd
			], [
				x,
				.4,
				2.76
			], .08, .06), cyl([
				x - .05,
				.62,
				4.15
			], [
				x + .05,
				.62,
				4.15
			], .04, 16));
			for (const [z, y0] of [[3.68, .525], [2.8, .43]]) {
				const b = airSpring(x, y0, F.top - F.h, z, .145);
				rubber.push(b.rubber);
				steel.push(b.steel);
			}
			damp.push(cyl([
				sx * .53,
				YW + .02,
				zd + .13
			], [
				sx * .52,
				.76,
				zd + .24
			], .035, 16), cyl([
				sx * .52,
				.76,
				zd + .24
			], [
				sx * .47,
				.92,
				zd + .25
			], .016, 10));
		}
		arms.push(link([
			0,
			YW + .2,
			zd + .1
		], [
			.34,
			.8,
			3.86
		], .05, .04), link([
			0,
			YW + .2,
			zd + .1
		], [
			-.34,
			.8,
			3.86
		], .05, .04));
		part({
			id: "drive-suspension",
			label: "Drive axle’s air suspension",
			assembly: "chassis",
			source: SRC.bags,
			what: "A trailing arm each side from a hanger on the frame, the axle clamped on it; two rolling-lobe air bellows on each arm, ahead of and behind the axle, carry the load; a levelling valve fills or empties them to hold the frame at its height whatever the load, so their pressure follows the load; a damper each side and a V-rod over the axle hold it straight.",
			moves: "The bellows’ pressure rises and falls with the load; the height stays.",
			drive: "The compressor’s air, through the levelling valve",
			specs: [["Bellows", `4, Ø 300 mm effective [inferred]`], ["Pressure", "Up to the supply’s 8.5 bar"]]
		}, [
			m(GEO.merge(arms), R.forged),
			m(GEO.merge(rubber), R.bush),
			m(GEO.merge(steel), R.zinc),
			m(GEO.merge(damp), R.damper)
		], {
			explode: [
				0,
				-.5,
				-.3
			],
			tag: {
				text: "Bellows",
				at: [
					-.385,
					.6,
					2.8
				],
				side: "left",
				value: () => `${fmt(bagP(L.drive, MASS.unsprung.drive, 4) / 1e5, 1)} bar, holding the height`
			}
		}, root);
	}
	const front = [], drive = [], trail = [];
	for (const sx of [1, -1]) {
		const lr = sx > 0 ? "left" : "right";
		front.push(station(kit, {
			id: `f${lr[0]}`,
			label: `front ${lr}`,
			at: [
				sx * (axle.front + .12),
				YW,
				axle.steer
			],
			side: sx,
			size: TYRE,
			rimW: .2286,
			et: .12,
			angle: Math.PI * .85,
			parent: root,
			assembly: "wheels",
			M,
			R,
			tag: sx > 0 ? {
				text: "Front wheel",
				at: [
					.05,
					.3,
					0
				],
				side: "left",
				value: () => `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm`
			} : void 0
		}));
		drive.push(station(kit, {
			id: `r${lr[0]}`,
			label: `rear ${lr}`,
			at: [
				sx * .915,
				YW,
				axle.drive
			],
			side: sx,
			size: TYRE,
			rimW: .2286,
			et: .17,
			twin: true,
			spring: true,
			angle: Math.PI * .75,
			parent: root,
			assembly: "wheels",
			drive: "The half-shaft, from the differential",
			M,
			R
		}));
		T.axles.forEach((z, i) => trail.push(station(kit, {
			id: `t${i + 1}${lr[0]}`,
			label: `trailer axle ${i + 1}, ${lr}`,
			at: [
				sx * (T.x + .12),
				YT,
				z
			],
			side: sx,
			size: TTYRE,
			rimW: .29845,
			et: .12,
			spring: true,
			angle: Math.PI * .75,
			parent: root,
			assembly: "running",
			M,
			R
		})));
	}
	const engine = dieselSix(kit, {
		parent: body,
		at: TR.engine,
		gears: GEARS,
		range: RANGE,
		assembly: "engine",
		gearAssembly: "drivetrain",
		source: SRC.eng,
		M: D,
		tags: {
			engine: () => sim.s.stalled && !sim.s.running ? "stopped" : `${fmt(sim.s.rpm)} rpm · ${fmt(Math.max(0, sim.s.Te))} N·m · ${fmt(Math.max(0, sim.s.Pe) / 1e3)} kW`,
			turbo: () => `${fmt(air.s.w * 60 / (2 * Math.PI) / 1e3)}k rpm · ${fmt(air.s.boost / 1e5, 2)} bar boost${air.s.gate > .02 ? ` · wastegate ${fmt(air.s.gate * 100)} % open` : ""}`,
			exhaust: () => `${fmt(air.s.t3 - 273)} °C before the turbine`,
			rail: () => `${fmt(air.s.rail)} bar`,
			injector: () => `${fmt(air.s.q)} mm³ a stroke · λ ${fmt(air.s.lambda, 2)}`,
			cylinder: () => `${fmt(air.s.pComp / 1e5)} bar, ${fmt(air.s.tComp - 273)} °C at the top`,
			gearbox: () => sim.s.stalled && !sim.s.running ? "stalled" : sim.s.v < .05 && sim.s.at.vSet < .05 ? "neutral" : `${ordinal(sim.s.gear)} gear · ${GEARS[sim.s.gear - 1].toFixed(2)} : 1${sim.s.launch ? " · clutch slipping" : ""}`
		}
	});
	const PINION = [
		0,
		YW + .02,
		axle.drive + .43
	];
	const shaft = propshaft(kit, {
		n: 1,
		r: .05,
		M: R,
		assembly: "drivetrain",
		source: SRC.road,
		specs: [["Tube", "Ø 100 × 3 mm steel [inferred]"], ["Joints", "2 universal joints, a sliding spline"]]
	});
	{
		const zr = 7.58, zc = 7.69, wr = 1, y0 = .78, y1 = 1.64;
		const finsOf = (z, n) => {
			const out = [at(box(wr, .8599999999999999, .05, .002), 0, 2.42 / 2, z)];
			for (let k = 0; k <= n; k++) out.push(slab(7e-4, .8599999999999999, .056).translate(-1 / 2 + k * wr / n, 2.42 / 2, z));
			return GEO.merge(out);
		};
		const tanks = GEO.merge([
			at(box(1.04, .06, .07, .012), 0, 1.67, zr),
			at(box(1.04, .05, .07, .012), 0, .755, zr),
			cyl([
				.3,
				1.7,
				zr
			], [
				.3,
				1.72,
				zr
			], .025, 18)
		]);
		const cacTanks = GEO.merge([at(box(.07, .8799999999999999, .07, .015), .535, 2.42 / 2, zc), at(box(.07, .8799999999999999, .07, .015), -1 / 2 - .035, 2.42 / 2, zc)]);
		const fp = engine.points.fan;
		const ring = new three.Shape();
		ring.absarc(0, 0, .395, 0, Math.PI * 2, false);
		ring.holes.push(circle(0, 0, .382));
		const face = roundPoly([
			[-1 / 2, y0 - fp[1]],
			[wr / 2, y0 - fp[1]],
			[wr / 2, y1 - fp[1]],
			[-1 / 2, y1 - fp[1]]
		], .03);
		face.holes.push(circle(0, 0, .385));
		const shroud = GEO.merge([plate(ring, .16, 32).translate(0, fp[1], fp[2] + .02), plate(face, .006, 8).translate(0, fp[1], 7.55)]);
		const wo = engine.points.waterOut, wi = engine.points.waterIn;
		const hoses = [hose([
			wo,
			[
				.25,
				wo[1] + .16,
				wo[2] + .04
			],
			[
				.42,
				1.58,
				7.35
			],
			[
				.42,
				1.63,
				7.54
			]
		], .024, 10), hose([
			[
				-.42,
				.74,
				7.55
			],
			[
				-.42,
				.74,
				7.3
			],
			[
				-.3,
				.76,
				7.2
			],
			wi
		], .024, 10)];
		part({
			id: "radiator",
			label: "Radiator, charge air cooler and shroud",
			assembly: "services",
			source: SRC.eng,
			what: "In the nose under the cab’s floor, behind the grille: in front the charge air cooler, where the compressed air from the turbocharger gives its heat to the road’s air; behind it the radiator, where the engine’s coolant does; the shroud round the fan makes it pull through all of both cores.",
			specs: [["Cores", `${Math.round(wr * 1e3)} × ${Math.round(859.9999999999999)} mm each, aluminium [inferred]`], ["Rejects", "About a quarter of the fuel’s heat at full load"]]
		}, [
			m(finsOf(zr, 70), M.core),
			m(finsOf(zc, 40), M.core),
			m(tanks, D.cover),
			m(cacTanks, D.alloy),
			m(shroud, D.cover),
			m(GEO.merge(hoses), D.hose)
		], {
			explode: [
				0,
				.2,
				1.1
			],
			tag: {
				text: "Radiator",
				at: [
					.45,
					y1,
					zr
				],
				side: "right",
				value: () => `${fmt(heat())} kW to the air`
			}
		});
		const bo = engine.points.boostOut, ia = engine.points.intake;
		const cac = GEO.merge([hose([
			bo,
			[
				-.5,
				1.6,
				6.8
			],
			[
				-.62,
				1.45,
				7.15
			],
			[
				-.62,
				1.15,
				7.5
			],
			[
				-.57,
				1,
				zc
			]
		], .045, 14), hose([
			[
				.57,
				1,
				zc
			],
			[
				.62,
				1.3,
				7.56
			],
			[
				.5,
				1.52,
				7.42
			],
			[
				.33,
				1.47,
				7.32
			],
			ia
		], .045, 14)]);
		part({
			id: "charge-air-pipes",
			label: "Charge air pipes",
			count: 2,
			assembly: "services",
			source: SRC.eng,
			what: "Two aluminium pipes with silicone joints: the hot, compressed air from the turbocharger round the engine’s right side to the charge air cooler, and the cooled air back round its left to the intake manifold.",
			specs: [["Pipes", "Ø 90 mm [inferred]"], ["Air", "Up to 2.2 bar over the air’s, ~200 °C before the cooler"]]
		}, [m(cac, D.alloy)], { explode: [
			0,
			.3,
			.6
		] });
		const af = {
			x: -.88,
			z: 5.8
		};
		const ai = engine.points.airIn;
		part({
			id: "air-filter",
			label: "Air filter and intake",
			assembly: "services",
			source: SRC.eng,
			what: "The engine breathes from an intake high on the cab’s back corner, down through a paper element in this canister behind the cab, and through a duct forward into the turbocharger’s compressor.",
			specs: [["Element", "Paper, dry, ~ 30 m³/min [inferred]"]]
		}, [m(GEO.merge([
			cyl([
				af.x,
				.68,
				af.z
			], [
				af.x,
				1.12,
				af.z
			], .16, 32),
			latheY([
				[0, 1.12],
				[.16, 1.12],
				[.12, 1.15],
				[0, 1.15]
			], 32).translate(af.x, 0, af.z),
			at(box(.06, .06, .2, .01), af.x + .16, .9, af.z)
		]), M.filterBox), m(hose([
			[
				af.x + .08,
				1.12,
				af.z + .06
			],
			[
				-.78,
				1.12,
				6
			],
			[
				-.72,
				1.3,
				6.3
			],
			[
				-.6,
				1.5,
				6.75
			],
			[
				-.42,
				1.48,
				6.98
			],
			[
				-.35,
				1.41,
				6.9
			],
			ai
		], .05, 14), D.hose)], { explode: [
			-.5,
			.2,
			-.2
		] });
		const ft = {
			x: .78,
			y: .67,
			z0: 4.42,
			z1: 5.72
		};
		const tankS = roundPoly([
			[-.31, -.31],
			[.31, -.31],
			[.31, .31],
			[-.31, .31]
		], [
			.04,
			.16,
			.16,
			.04
		]);
		const tankG = plate(tankS, ft.z1 - ft.z0, 8).translate(ft.x, ft.y, (ft.z0 + ft.z1) / 2);
		const straps = [];
		for (const z of [ft.z0 + .25, ft.z1 - .25]) straps.push(latheZ([
			[.317, -.02],
			[.325, -.02],
			[.325, .02],
			[.317, .02]
		], 32).translate(ft.x, ft.y, z), at(box(.08, .02, .05, .004), .47, ft.y + .33, z));
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "services",
			source: SRC.eng,
			what: "A polished aluminium tank outside the left rail, hung on two brackets and two steel straps; its cap on its top outside, its sender and its pickup inside, the lines to the engine’s filters along the rail.",
			specs: [["Volume", "~ 430 L [inferred]"], ["Fuel", "Diesel, 835 g/L"]]
		}, [
			m(tankG, M.tank),
			m(GEO.merge(straps), R.chassis),
			m(cyl([
				1,
				ft.y + .31,
				5.5
			], [
				1,
				ft.y + .34,
				5.5
			], .05, 20), M.trim)
		], {
			explode: [
				.6,
				-.2,
				0
			],
			tag: {
				text: "Fuel",
				at: [
					1.09,
					ft.y,
					5
				],
				side: "left",
				value: () => sim.s.stalled && !sim.s.running ? "stopped" : `${fmt(sim.s.fuel, 1)} L/h${sim.s.v > .5 ? ` · ${fmt(sim.s.l100, 1)} L/100 km` : ""}`
			}
		});
		const bb = {
			x: .76,
			y: .72,
			z: 4.09
		};
		part({
			id: "batteries",
			label: "Batteries",
			count: 2,
			assembly: "services",
			source: SRC.eng,
			what: "Two 12 V batteries in series for the truck’s 24 V, in a box with a lid outside the left rail behind the tank: they start the engine and carry the cab’s load when it is off; the alternator charges them.",
			specs: [["Each", "12 V, 225 Ah [inferred]"]]
		}, [m(at(box(.58, .36, .56, .02), bb.x, bb.y, bb.z), M.grey), m(GEO.merge([at(box(.6, .02, .58, .006), bb.x, bb.y + .19, bb.z)]), M.trim)], { explode: [
			.6,
			-.2,
			-.2
		] });
		const ab = {
			x: -.75,
			y: .75,
			z: 4.17
		};
		part({
			id: "adblue-tank",
			label: "AdBlue tank",
			assembly: "services",
			source: SRC.eng,
			what: "A plastic tank of urea in water outside the right rail; a pump doses it into the exhaust ahead of the SCR catalyst, where it turns the engine’s nitrogen oxides into nitrogen and water.",
			specs: [["Volume", "60 L [inferred]"], ["Use", "~ 5 % of the diesel"]]
		}, [m(at(box(.5, .44, .44, .05), ab.x, ab.y, ab.z), M.adblue), m(cyl([
			ab.x - .1,
			ab.y + .22,
			ab.z
		], [
			ab.x - .1,
			ab.y + .26,
			ab.z
		], .045, 18), M.blueCap)], { explode: [
			-.6,
			-.2,
			-.2
		] });
		const ex = engine.points.exhaust;
		const at0 = {
			x: -.8,
			y: .72,
			z0: 4.45,
			z1: 5.55
		};
		const atb = plate(roundPoly([
			[-.32, -.3],
			[.32, -.3],
			[.32, .3],
			[-.32, .3]
		], .12), at0.z1 - at0.z0, 8).translate(at0.x, at0.y, (at0.z0 + at0.z1) / 2);
		part({
			id: "aftertreatment",
			label: "Exhaust and aftertreatment",
			assembly: "services",
			source: SRC.eng,
			what: "From the turbine down past the frame into one stainless box outside the right rail: an oxidation catalyst, the particulate filter, the AdBlue’s doser and mixer, the SCR catalyst; the tail pipe out of its bottom.",
			specs: [["Pipe", "Ø 127 mm [inferred]"], ["Inside", "DOC, DPF, SCR, ammonia slip catalyst"]]
		}, [m(atb, M.stainless), m(GEO.merge([hose([
			ex,
			[
				-.4,
				1.22,
				6.15
			],
			[
				-.5,
				1.1,
				5.95
			],
			[
				-.56,
				1.06,
				5.7
			],
			[
				-.6,
				1,
				at0.z1 + .02
			]
		], .062, 14), hose([
			[
				-.95,
				at0.y - .3,
				4.6
			],
			[
				-.98,
				.32,
				4.55
			],
			[
				-1.02,
				.28,
				4.45
			]
		], .055, 12)]), D.hot)], {
			explode: [
				-.7,
				-.2,
				0
			],
			tag: {
				text: "Exhaust",
				at: [
					-1.12,
					at0.y,
					5
				],
				side: "right",
				value: () => `${fmt(air.s.t3 - 273)} °C from the turbine`
			}
		});
		const tanks2 = [];
		for (const z of [4.05, 4.32]) tanks2.push(cyl([
			-.32,
			.83,
			z
		], [
			.32,
			.83,
			z
		], .1, 24), latheX([
			[0, .32],
			[.1, .32],
			[.06, .35],
			[0, .355]
		], 24).translate(0, .83, z), latheX([
			[0, -.355],
			[.06, -.35],
			[.1, -.32],
			[0, -.32]
		], 24).translate(0, .83, z));
		part({
			id: "air-tanks",
			label: "Air tanks",
			count: 2,
			assembly: "services",
			source: SRC.bags,
			what: "Two steel reservoirs across between the rails, filled by the engine’s compressor through the air dryer: they hold the air for the brakes, the bellows, the gearbox’s shift unit and the trailer’s line.",
			specs: [["Each", "30 L at 12.5 bar [inferred]"]]
		}, [m(GEO.merge(tanks2), M.airTank)], { explode: [
			0,
			-.5,
			0
		] });
	}
	/** the coolant's heat to the air (kW): about a quarter of the fuel's heat [inferred] */
	const heat = () => sim.s.fuel * .835 * 42.6 * .25 / 3.6;
	const H = C.hinge;
	const ramA = [
		.62,
		.95,
		7.15
	], ramB = [
		.62,
		1.24,
		7.62
	];
	const ram = {
		body: new three.Group(),
		rod: new three.Group()
	};
	{
		const g = [], rub = [];
		for (const sx of [-1, 1]) {
			g.push(link([
				sx * .42,
				.9,
				F.front - .02
			], [
				sx * .62,
				H[1],
				H[0]
			], .06, .06), cyl([
				sx * .52,
				H[1],
				H[0]
			], [
				sx * .74,
				H[1],
				H[0]
			], .022, 12));
			rub.push(cyl([
				sx * .6,
				1.1,
				6.12
			], [
				sx * .6,
				C.bottom - .005,
				6.12
			], .045, 18));
			g.push(coil(.05, .008, 5, .09, 60, 6).translate(sx * .6, 1.01, 6.12));
		}
		ram.body.add(m(unitBar(.032, 16), R.damper));
		ram.rod.add(m(unitBar(.016, 10), M.hydraulic));
		part({
			id: "cab-mounts",
			label: "Cab hinges, mounts and tilt ram",
			assembly: "cab",
			source: SRC.road,
			what: "The cab rests on two hinges at the front of the frame and two sprung mounts at its back, locked down there by hooks. To reach the engine the locks open and a hand pump drives the hydraulic ram, which tilts the whole cab forward 60° on its hinges.",
			moves: "The ram stretches as the cab tilts.",
			drive: "A hand pump’s oil",
			specs: [["Tilt", "60°"], ["Mounts", "Coil springs and dampers at the back [inferred]"]]
		}, [
			m(GEO.merge(g), R.chassis),
			m(GEO.merge(rub), R.damper),
			ram.body,
			ram.rod
		], { explode: [
			0,
			-.4,
			.4
		] });
		const bump = GEO.merge([at(box(2.46, .42, .26, .06), 0, .61, 8.11), at(box(2.3, .07, .12, .02), 0, .37, 8.17)]);
		const lamps = [], lenses = [], ambers = [];
		for (const sx of [-1, 1]) {
			lamps.push(at(box(.38, .15, .06, .02), sx * .9, .73, 8.21), at(box(.15, .08, .05, .02), sx * .72, .5, 8.22));
			lenses.push(at(box(.36, .13, .01, .006), sx * .9, .73, 8.236), at(box(.13, .065, .01, .005), sx * .72, .5, 8.244));
			ambers.push(at(box(.08, .13, .04, .01), sx * 1.14, .73, 8.215));
		}
		const brackets = [link([
			.4,
			.78,
			F.front - .02
		], [
			.6,
			.66,
			7.98
		], .08, .06), link([
			-.4,
			.78,
			F.front - .02
		], [
			-.6,
			.66,
			7.98
		], .08, .06)];
		const ends = {
			paint: halfCut(M.paint),
			grey: halfCut(M.grey),
			lens: halfCut(M.lens),
			amber: halfCut(M.amber),
			reflector: halfCut(M.reflector)
		};
		part({
			id: "bumper",
			label: "Bumper and headlights",
			assembly: "cab",
			source: SRC.air,
			what: "A steel bumper with its plastic skin across the front of the frame, the front underrun guard inside it; the headlights in its top corners with the indicators outside them, the fog lights below, the air dam under it.",
			specs: [["Headlights", "LED, 24 V [inferred]"], ["Guard", "Front underrun, 160 kN [inferred]"]]
		}, [
			m(GEO.merge([bump]), ends.paint),
			m(GEO.merge(brackets), R.chassis),
			m(GEO.merge(lamps), ends.reflector),
			m(GEO.merge(lenses), ends.lens),
			m(GEO.merge(ambers), ends.amber)
		], { explode: [
			0,
			-.2,
			.7
		] });
		const stepG = [], treads = [];
		for (const sx of [-1, 1]) {
			stepG.push(onX(plate(zyShape([
				[6.08, .36],
				[6.46, .36],
				[6.46, 1.18],
				[6.08, 1.18]
			], .03), .008, 4), sx * 1.235), link([
				sx * F.x,
				.86,
				6.25
			], [
				sx * 1,
				.86,
				6.25
			], .06, .06), at(box(.25, .008, .38, .003), sx * 1.11, .36, 6.27));
			for (const y of [.45, .85]) treads.push(at(box(.25, .03, .36, .006), sx * 1.11, y, 6.27));
		}
		part({
			id: "steps",
			label: "Steps",
			count: 2,
			assembly: "cab",
			source: SRC.road,
			what: "A step box each side behind the front wheel, on the frame’s outriggers: two aluminium treads at 450 and 850 mm, the third in the door’s sill at 1.25 m, the cab’s floor at 1.75 m.",
			specs: [["Treads", "450 · 850 · 1,250 mm"]]
		}, [m(GEO.merge(stepG), M.grey), m(GEO.merge(treads), M.tread)], { explode: [
			0,
			-.3,
			0
		] });
	}
	const cabPivot = new three.Group();
	cabPivot.name = "cab-tilt";
	cabPivot.position.set(0, H[1], H[0]);
	body.add(cabPivot);
	/** the cab in the body's own coordinates, turned with the pivot */
	const cab = new three.Group();
	cab.position.set(0, -H[1], -H[0]);
	cabPivot.add(cab);
	const X = C.X, t = .008;
	const doorHole = [
		[DR.z[0], DR.y[0]],
		[DR.z[1], DR.y[0]],
		[DR.z[1], DR.y[1]],
		[DR.z[0], DR.y[1]]
	];
	const doorWin = [
		[DR.z[0] + .08, 2.4],
		[DR.z[1] - .08, 2.4],
		[DR.z[1] - .08, 3.02],
		[DR.z[0] + .08, 3.02]
	];
	{
		const Ra = .72, a1 = Math.asin((C.bottom - YW) / Ra), a2 = Math.asin((C.apron - YW) / Ra);
		/** @type {V2[]} */
		const pts = [[C.back, C.bottom]];
		for (let k = 0; k <= 10; k++) {
			const a = a1 + (a2 - a1) * k / 10;
			pts.push([axle.steer + Ra * Math.cos(a), YW + Ra * Math.sin(a)]);
		}
		const k0 = pts.length;
		pts.push([8.08, C.apron], [8.15, 1.05], [C.face, 2.35], [8.08, 3.2], [7.98, 3.72], [7.85, C.roof], [C.back + .08, C.roof], [C.back, C.roof - .08]);
		const er = [
			0,
			.05,
			.12,
			.12,
			.12,
			.1,
			.1,
			.06,
			.06
		];
		const n = pts.length;
		/** @type {number[]} */
		const r = pts.map((_, k) => k < k0 - 1 ? 0 : er[k - (k0 - 1)]);
		const kFace = k0 + 1, kWs = k0 + 2;
		const outline = insetEdges(pts, r);
		const sides = [];
		for (const sx of [-1, 1]) {
			const s = zyShape(outline, 0);
			s.holes.push(zyHole(doorHole, .04));
			sides.push(onX(plate(s, t, 6), sx * (X - t / 2)));
		}
		const houses = [];
		for (const sx of [-1, 1]) {
			const sh = new three.Shape();
			sh.absarc(0, 0, .726, a2, Math.PI - a2, false);
			sh.absarc(0, 0, Ra, Math.PI - a2, a2, true);
			sh.closePath();
			houses.push(plate(sh, .38, 24).rotateY(Math.PI / 2).translate(sx * (X - .2), YW, axle.steer));
		}
		part({
			id: "cab-sides",
			label: "Cab sides",
			assembly: "cab",
			source: SRC.air,
			what: "The cab’s two pressed-steel sides, the door openings in them, the front wheels’ arches cut under them; the plastic wheel houses inside, round the tops of the front tyres, turning with the cab when it tilts.",
			specs: [["Steel", "0.8 mm, painted [inferred]"]]
		}, [m(GEO.merge(sides), M.paint), m(GEO.merge(houses), M.trim)], {
			explode: [
				0,
				.4,
				0
			],
			xray: "shell"
		}, cab);
		/** @type {THREE.BufferGeometry[]} */
		const ps = [];
		/** @type {THREE.BufferGeometry[]} */
		const screen = [];
		/** @type {THREE.BufferGeometry[]} */
		const grille = [];
		for (let k = k0 - 1; k < n; k++) {
			if (k === k0 - 1) continue;
			const a = pts[k], b = pts[(k + 1) % n], R0 = r[k];
			const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
			/** @type {THREE.Path[]} */
			const holes = [];
			const hw = X - R0;
			if (k === kWs) {
				holes.push(roundHole([
					[-hw + .05, .05],
					[hw - .05, .05],
					[hw - .05, len - .05],
					[-hw + .05, len - .05]
				], .07));
				screen.push(onEdge(plate(roundPoly([
					[-hw + .045, .045],
					[hw - .045, .045],
					[hw - .045, len - .045],
					[-hw + .045, len - .045]
				], .07), .008, 8), a, b, -.008));
			}
			if (k === kFace) holes.push(roundHole([
				[-.82, .08],
				[.82, .08],
				[.82, 1],
				[-.82, 1]
			], .05));
			ps.push(edgePanel(a, b, R0, t, 2 * X, holes));
		}
		{
			const a = pts[kFace], b = pts[kFace + 1];
			for (let j = 0; j < 9; j++) grille.push(onEdge(box(1.62, .04, .025, .008).translate(0, .14 + j * .82 / 8, 0), a, b, -.004));
			grille.push(onEdge(GEO.merge([box(1.68, .03, .02, .006).translate(0, .085, 0), box(1.68, .03, .02, .006).translate(0, .995, 0)]), a, b, -.004));
		}
		part({
			id: "cab-shell",
			label: "Face, roof and back",
			assembly: "cab",
			source: SRC.air,
			what: "The cab’s face with the grille’s opening low in it, the windscreen’s frame, the header over it, the high roof and the back wall of the sleeper; every edge rounded onto the sides. Under the face the apron hangs low in front of the wheels, the radiator behind it.",
			specs: [["Inside", "2.0 m standing over the flat floor"]]
		}, [m(GEO.merge(ps), M.paint)], {
			explode: [
				0,
				.9,
				0
			],
			xray: "shell"
		}, cab);
		part({
			id: "grille",
			label: "Grille",
			assembly: "cab",
			source: SRC.air,
			what: "Nine bars across the opening low in the cab’s face: the road’s air through them into the charge air cooler and the radiator.",
			specs: [["Opening", "1.64 × 0.92 m"]]
		}, [m(GEO.merge(grille), M.grey)], { explode: [
			0,
			0,
			.6
		] }, cab);
		const visor = onEdge(box(2.3, .18, .012, .005).translate(0, .16, 0).rotateX(-.9), pts[kWs + 1], pts[kWs + 2], 0);
		part({
			id: "windscreen",
			label: "Windscreen and sun visor",
			assembly: "cab",
			source: SRC.air,
			what: "The laminated windscreen, nearly upright over the dashboard, and the sun visor over its top.",
			specs: [["Glass", "6 mm laminated, ~ 2.3 × 0.9 m"]]
		}, [m(GEO.merge(screen), M.glass), m(visor, M.trim)], { explode: [
			0,
			.4,
			.5
		] }, cab);
		const dz = [[7.75, C.roof], [6.35, 3.98]];
		const defl = [edgePanel(dz[0], dz[1], .08, .006, 2.36, []), edgePanel(dz[1], [C.back + .05, 3.98], .08, .006, 2.36, [])];
		for (const sx of [-1, 1]) defl.push(onX(plate(zyShape([
			[7.7, C.roof],
			[C.back + .05, C.roof],
			[C.back + .05, 3.9],
			[6.35, 3.9]
		], .02), .006, 4), sx * 1.172));
		part({
			id: "deflector",
			label: "Roof deflector",
			assembly: "cab",
			source: SRC.air,
			what: "A glass-fibre wedge on the roof that lifts the air from the cab’s top to the trailer’s, so it does not strike the trailer’s front wall: it takes about a tenth off the drag.",
			specs: [["Top", "3.98 m"], ["Saves", "~ 10 % of the drag at 80 km/h [inferred]"]]
		}, [m(GEO.merge(defl), M.paint)], {
			explode: [
				0,
				.5,
				-.2
			],
			xray: "shell"
		}, cab);
		const fx = X - t - .004;
		const floorS = roundPoly(xz([
			[-.97, C.back + .03],
			[.97, C.back + .03],
			[.97, 7.66],
			[-.97, 7.66]
		]), .004);
		const floorG = [onY(plate(floorS, .02, 4), C.floor - .01)];
		const sills = [];
		for (const sx of [-1, 1]) {
			floorG.push(onY(plate(roundPoly(xz([
				[sx * .97, C.back + .03],
				[sx * fx, C.back + .03],
				[sx * fx, DR.z[0] - .02],
				[sx * .97, DR.z[0] - .02]
			]), .003), .02, 4), C.floor - .01), onY(plate(roundPoly(xz([
				[sx * .97, DR.z[1] + .02],
				[sx * fx, DR.z[1] + .02],
				[sx * fx, 7.66],
				[sx * .97, 7.66]
			]), .003), .02, 4), C.floor - .01));
			sills.push(at(box(fx - .97, .03, DR.z[1] - DR.z[0], .005), sx * (fx + .97) / 2, DR.y[0] + .015, (DR.z[0] + DR.z[1]) / 2), onX(plate(zyShape([
				[DR.z[0], DR.y[0]],
				[DR.z[1], DR.y[0]],
				[DR.z[1], C.floor],
				[DR.z[0], C.floor]
			], .004), .008, 4), sx * .97));
		}
		const fwall = at(box(2 * fx, .3, .012, .004), 0, C.floor + .15, 7.66);
		const lining = GEO.merge([at(box(2 * fx, .012, 2, .004), 0, C.roof - .05, 7), at(slab(2 * fx, 1.9, .012), 0, C.floor + .98, C.back + .02)]);
		part({
			id: "floor",
			label: "Floor and sills",
			assembly: "cab",
			source: SRC.air,
			what: "The cab’s flat steel floor over the engine, 1.75 m off the road, a rubber mat on it; each door’s sill a step lower at 1.25 m, the third of the steps; the front wall under the dashboard; the headlining under the roof and the trim on the back wall.",
			specs: [["Floor", `${Math.round(C.floor * 1e3)} mm off the road, flat`]]
		}, [
			m(GEO.merge(floorG), M.floor),
			m(GEO.merge([...sills, fwall]), M.paint),
			m(lining, M.lining)
		], { explode: [
			0,
			.3,
			0
		] }, cab);
		const mir = [], glass = [], markers = [];
		for (const sx of [-1, 1]) {
			mir.push(link([
				sx * X,
				2.95,
				7.8
			], [
				sx * 1.43,
				2.98,
				7.84
			], .03, .03), link([
				sx * X,
				2.42,
				7.8
			], [
				sx * 1.43,
				2.46,
				7.84
			], .025, .025), at(box(.07, .4, .24, .02), sx * 1.45, 2.8, 7.84), at(box(.07, .2, .2, .02), sx * 1.45, 2.47, 7.84));
			glass.push(at(slab(.004, .37, .21), sx * 1.45, 2.8, 7.84), at(slab(.004, .17, .17), sx * 1.45, 2.47, 7.84));
			markers.push(at(box(.05, .03, .08, .01), sx * (X + .01), 1.12, 7.85));
		}
		const mg = GEO.merge(glass.map((g) => g.translate(0, 0, -.124)));
		part({
			id: "mirrors",
			label: "Mirrors",
			count: 4,
			assembly: "cab",
			source: SRC.air,
			what: "On each side a main mirror and a wide-angle one under it on arms from the cab’s front corner, so the driver sees down the whole trailer and the lane beside it.",
			specs: [["Main", "~ 0.37 × 0.21 m, heated"], ["Width over them", "2.95 m"]]
		}, [
			m(GEO.merge(mir), M.trim),
			m(mg, M.mirror),
			m(GEO.merge(markers), M.amber)
		], { explode: [
			0,
			.3,
			.3
		] }, cab);
		const wip = [];
		for (const wx of [-.5, .4]) wip.push(onEdge(GEO.merge([at(slab(.75, .012, .012), 0, .075, .014), at(slab(.72, .022, .022), -.01, .06, .026)]).rotateZ(.04).translate(wx, 0, 0), pts[kWs], pts[kWs + 1], 0));
		part({
			id: "wipers",
			label: "Wipers",
			count: 2,
			assembly: "cab",
			source: SRC.air,
			what: "Two long wipers parked at the windscreen’s foot, driven by one motor behind the face.",
			specs: [["Blades", "2 × 800 mm [inferred]"]]
		}, [m(GEO.merge(wip), M.trim)], { explode: [
			0,
			.4,
			.5
		] }, cab);
	}
	/** @type {ReturnType<typeof hinge>[]} */
	const cabDoors = [];
	for (const sx of [1, -1]) {
		const id = sx > 0 ? "door-left" : "door-right";
		const h = hinge(cab, {
			at: [
				sx * X,
				0,
				DR.z[1]
			],
			axis: "y",
			max: -sx * 1.35,
			name: id
		});
		const d = doorPanels([...doorHole], [...doorWin], {
			x: X,
			sx,
			split: DR.split,
			t: [.06, .035]
		});
		const mv = (g) => g.translate(-sx * X, 0, -DR.z[1]);
		const z0 = DR.z[0];
		const outside = GEO.merge([at(box(.025, .04, .2, .01), sx * (X + .012), 2.05, z0 + .2), at(box(.02, .6, .03, .008), sx * (X + .012), 1.75, z0 + .08)]);
		const inside = GEO.merge([at(box(.05, .05, .4, .012), sx * (X - .09), 2.12, (z0 + DR.z[1]) / 2), at(box(.03, .03, .12, .008), sx * (X - .08), 2.22, z0 + .2)]);
		kit.part(h.pivot, {
			id,
			label: sx > 0 ? "Door, left (the driver’s)" : "Door, right",
			assembly: "doors",
			source: SRC.air,
			what: "A hinged steel door the height of the cab’s side from its sill to its roof line, its window wound down into it by a motor, its card, armrest and handles; a grab handle down its back edge to climb the steps by.",
			moves: "Opens to 77° on its hinges.",
			drive: "By hand (the Cab doors slider)",
			specs: [["Opening", `${Math.round((DR.z[1] - z0) * 1e3)} × ${Math.round((DR.y[1] - DR.y[0]) * 1e3)} mm`]]
		}, { explode: [
			sx * .7,
			.05,
			.2
		] }, cab);
		h.pivot.add(m(mv(d.skin), M.paint), m(mv(d.glass), M.glass), m(mv(d.card), M.card), m(mv(inside), M.vinyl), m(mv(outside), M.trim));
		cabDoors.push(h);
	}
	const gauges = cluster(kit, {
		dials: [{
			x: -.09,
			y: 0,
			r: .065,
			max: 125,
			ticks: 6
		}, {
			x: .09,
			y: 0,
			r: .065,
			max: 3e3,
			ticks: 7
		}],
		face: M.dial,
		tick: M.white,
		needle: M.needle,
		bezel: M.chrome,
		housing: M.dash
	});
	{
		const { x: dx, z: dz } = TR.driver;
		const f = seatGeometry({
			w: .56,
			d: .55,
			h: .48,
			back: .72,
			rake: .22
		});
		const seats = [-1, 1].map((sx) => [f.fabric.clone().translate(sx * dx, C.floor, dz), f.base.clone().translate(sx * dx, C.floor, dz)]);
		part({
			id: "seats",
			label: "Seats",
			count: 2,
			assembly: "interior",
			source: SRC.air,
			what: "The driver’s seat and the passenger’s, each on its own air spring and damper so the road’s shake stops under the driver; belts built into them.",
			specs: [["Suspension", "Air, 100 mm travel [inferred]"]]
		}, [m(GEO.merge(seats.map((p) => p[0])), M.fabric), m(GEO.merge(seats.map((p) => p[1])), M.vinyl)], { explode: [
			0,
			.8,
			.1
		] }, cab);
		const bunk = [at(box(2.3, .44, .58, .02), 0, C.floor + .22, C.back + .32)];
		part({
			id: "bunk",
			label: "Bunk",
			assembly: "interior",
			source: SRC.air,
			what: "The bed across the back of the cab over its lockers, where the driver sleeps through the rest the law asks for between days.",
			specs: [["Mattress", "2.0 × 0.6 m [inferred]"]]
		}, [m(GEO.merge(bunk), M.vinyl), m(at(box(2.2, .14, .58, .05), 0, C.floor + .51, C.back + .32), M.mattress)], { explode: [
			0,
			.9,
			-.3
		] }, cab);
		const dash = GEO.merge([
			at(box(2.38, .36, .5, .05, 2), 0, 2.12, 7.9),
			at(box(.5, .2, .4, .04, 2), 0, C.floor + .1, 7.48),
			at(box(.42, .1, .18, .03), dx, 2.31, 7.66)
		]);
		gauges.group.position.set(dx, 2.32, 7.58);
		gauges.group.rotation.x = .3;
		part({
			id: "dashboard",
			label: "Dashboard and gauges",
			assembly: "interior",
			source: SRC.air,
			what: "The dashboard wrapping round the driver under the windscreen: the speedometer and the rev counter before him with a screen between them, the gearbox’s selector and the switches within his reach, the passenger’s side and the shelf over the engine.",
			moves: "Its needles show the speed and the engine’s revs.",
			specs: [["Gauges", "Speed to 125 km/h, revs to 3,000 rpm"]]
		}, [m(dash, M.dash), gauges.group], {
			explode: [
				0,
				.6,
				.5
			],
			tag: {
				text: "Gauges",
				at: [
					dx,
					2.38,
					7.6
				],
				side: "right",
				value: () => `${fmt(kmh())} km/h · ${fmt(sim.s.rpm)} rpm`
			}
		}, cab);
		const sw = steeringWheelGeometry({
			R: .24,
			column: .45
		});
		const wheel = new three.Group();
		wheel.add(m(sw.rim, M.vinyl), m(sw.hub, M.dash), m(sw.column, M.dash));
		wheel.position.set(dx, 2.22, 7.36);
		wheel.rotation.x = .95;
		const ped = [];
		for (const [ox, w] of [[.1, .07], [-.06, .09]]) ped.push(cyl([
			dx + ox,
			2,
			7.66
		], [
			dx + ox,
			C.floor + .12,
			7.6
		], .008, 8), at(box(w, .12, .012, .004), dx + ox, C.floor + .12, 7.58));
		part({
			id: "steering-wheel",
			label: "Steering wheel and pedals",
			assembly: "interior",
			source: SRC.air,
			what: "The wheel laid back at a bus’s angle on its column, which a shaft carries down through the floor to the steering box; the brake and the accelerator under it (the gearbox needs no clutch pedal).",
			moves: "Turned by the driver (held straight here).",
			specs: [["Diameter", "480 mm"]]
		}, [wheel, m(GEO.merge(ped), M.vinyl)], { explode: [
			0,
			.6,
			.2
		] }, cab);
	}
	{
		const kz = TR.king.z;
		const mount = [];
		for (const sx of [-1, 1]) mount.push(at(box(.12, .04, 1, .006), sx * .385, F.top + .02, kz), at(box(.12, .035, .18, .008), sx * .36, F.top + .057, kz));
		const fwS = roundPoly(xz([
			[-.435, kz + .45],
			[.435, kz + .45],
			[.435, kz - .48],
			[.19, kz - .48],
			[.04, kz - .02],
			[-.04, kz - .02],
			[-.19, kz - .48],
			[-.435, kz - .48]
		]), [
			.12,
			.12,
			.05,
			.03,
			.02,
			.02,
			.03,
			.05
		]);
		const plateG = onY(plate(fwS, .06, 12), TR.king.y - .03);
		const jaws = GEO.merge([
			at(box(.06, .05, .14, .01), .07, TR.king.y - .085, kz),
			at(box(.06, .05, .14, .01), -.07, TR.king.y - .085, kz),
			cyl([
				.2,
				1.07,
				kz - .1
			], [
				.55,
				1.05,
				kz - .15
			], .012, 8),
			at(box(.1, .03, .03, .01), .58, 1.05, kz - .15)
		]);
		part({
			id: "fifth-wheel",
			label: "Fifth wheel",
			assembly: "coupling",
			source: SRC.king,
			what: "A greased steel plate on two pedestals that let it rock, bolted to the frame on its mounting plate: the trailer’s kingpin slides up its throat as the tractor backs under, and its jaws close round the pin; the trailer’s front rests on the plate and is pulled by the pin. A handle on its left opens the jaws.",
			moves: "Rocks on its pedestals with the road.",
			drive: "The trailer’s pin",
			specs: [
				["Height", `${Math.round(TR.king.y * 1e3)} mm`],
				["Lead", `${Math.round((kz - axle.drive) * 1e3)} mm ahead of the drive axle`],
				["Rated", "20 t on it, 150 kN D-value [inferred]"]
			]
		}, [
			m(GEO.merge(mount), R.chassis),
			m(plateG, R.castIron),
			m(jaws, R.forged)
		], {
			explode: [
				0,
				.4,
				0
			],
			tag: {
				text: "Fifth wheel",
				at: [
					.43,
					TR.king.y,
					kz
				],
				side: "right",
				value: () => `${tonnes(L.king)} t on it · pulling ${fmt(Math.max(0, L.pull) / 1e3)} kN`
			}
		});
		const cat = GEO.merge([
			at(box(.98, .012, .44, .004), 0, 1.07, 5.77),
			at(box(.04, .6, .04, .008), .25, 1.36, 5.95),
			at(box(.3, .04, .05, .008), .3, 1.64, 5.95)
		]);
		const ends = [
			[
				.2,
				1.62,
				5.93
			],
			[
				.3,
				1.62,
				5.93
			],
			[
				.4,
				1.62,
				5.93
			]
		];
		const to = [
			[
				.25,
				1.75,
				T.front + .03
			],
			[
				.4,
				1.75,
				T.front + .03
			],
			[
				.55,
				1.75,
				T.front + .03
			]
		];
		part({
			id: "lines",
			label: "Trailer lines and catwalk",
			count: 3,
			assembly: "coupling",
			source: SRC.bags,
			what: "The catwalk behind the cab, and three coiled lines from their hanger to the trailer’s front wall: the red one supplies the trailer’s air tanks (cut it and the trailer brakes itself), the yellow one carries the brake pedal’s signal, the black one the lights and the brakes’ electronics.",
			specs: [["Air", "Red: supply, 8.5 bar · yellow: control"]]
		}, [
			m(cat, M.tread),
			m(coilFrom(ends[0], to[0], .04, .007, 7), M.lineRed),
			m(coilFrom(ends[1], to[1], .04, .007, 7), M.lineYellow),
			m(coilFrom(ends[2], to[2], .045, .008, 7), M.lineBlack)
		], { explode: [
			0,
			.6,
			0
		] });
	}
	/** the tractor's mudguards over the twins */
	{
		const g = [];
		for (const sx of [-1, 1]) g.push(at(box(.68, .012, 1.2, .006), sx * .915, 1.08, axle.drive), at(box(.66, .5, .008, .003), sx * .915, .62, axle.drive - .66), link([
			sx * F.x,
			.95,
			axle.drive - .3
		], [
			sx * .62,
			1.07,
			axle.drive - .3
		], .04, .04));
		part({
			id: "mudguards",
			label: "Mudguards",
			count: 2,
			assembly: "chassis",
			source: SRC.road,
			what: "Plastic guards over the twin wheels on stays from the frame, and the flaps behind them that keep the spray off the road behind.",
			specs: [["Flaps", "Spray-suppressing [inferred]"]]
		}, [m(GEO.merge(g), M.trim)], { explode: [
			0,
			.3,
			-.3
		] });
	}
	const zb = T.axles[1];
	{
		const g = [];
		const kp = roundPoly(xz([
			[-1.2, T.front - .05],
			[1.2, T.front - .05],
			[1.2, 2.2],
			[-1.2, 2.2]
		]), .03);
		g.push(onY(plate(kp, .02, 4), TR.king.y + .01));
		const top = 1.27, low = .82;
		for (const sx of [-1, 1]) {
			g.push(onX(plate(zyShape([
				[T.front - .05, TR.king.y + .02],
				[2.2, TR.king.y + .02],
				[1.7, low],
				[T.rear + .08, low],
				[T.rear + .08, top],
				[T.front - .05, top]
			], .01), .01, 4), sx * T.beam));
			g.push(at(box(.15, .015, T.front - T.rear - .13, .004), sx * T.beam, 1.2625, (T.front + T.rear) / 2 - .015), at(box(.15, .015, 1.7 - T.rear - .08, .004), sx * T.beam, .8274999999999999, (1.7 + T.rear + .08) / 2), link([
				sx * T.beam,
				TR.king.y + .02,
				2.2
			], [
				sx * T.beam,
				.8274999999999999,
				1.7
			], .015, .15));
			g.push(at(box(.05, .13, T.front - T.rear, .006), sx * 1.25, 1.235, (T.front + T.rear) / 2));
		}
		for (let z = 2; z > T.rear + .1; z -= .5) g.push(at(box(2.45, .1, .05, .006), 0, 1.22, z));
		for (const z of T.axles) for (const sx of [-1, 1]) g.push(at(box(.12, .2, .14, .01), sx * T.beam, .72, z + .55));
		part({
			id: "trailer-chassis",
			label: "Trailer chassis",
			assembly: "trailer",
			source: SRC.king,
			what: "Two welded steel I-beams the trailer’s length, shallow over the tractor’s gooseneck and deep behind it, cross members every half metre out to the floor’s edges; at the front the kingpin plate that rests on the fifth wheel; the axles’ hangers under the beams.",
			specs: [["Beams", "450 mm deep behind the gooseneck [inferred]"], ["Kingpin to the bogie", `${(TR.king.z - zb).toFixed(2)} m`]]
		}, [m(GEO.merge(g), R.chassis)], { explode: [
			0,
			-.7,
			0
		] }, trailer);
		const pin = GEO.merge([
			cyl([
				0,
				TR.king.y - .085,
				TR.king.z
			], [
				0,
				TR.king.y + .01,
				TR.king.z
			], .0254, 20),
			cyl([
				0,
				TR.king.y - .05,
				TR.king.z
			], [
				0,
				TR.king.y - .035,
				TR.king.z
			], .037, 20),
			cyl([
				0,
				TR.king.y - .002,
				TR.king.z
			], [
				0,
				TR.king.y + .01,
				TR.king.z
			], .09, 24)
		]);
		part({
			id: "kingpin",
			label: "Kingpin",
			assembly: "coupling",
			source: SRC.king,
			what: "A 2-inch forged steel pin under the trailer’s plate, 1.6 m behind its front: the fifth wheel’s jaws close round its neck, and through it the tractor pulls and the trailer turns.",
			specs: [["Pin", "2\" (50.8 mm), ISO 337"]]
		}, [m(pin, R.forged)], { explode: [
			0,
			-.3,
			0
		] }, trailer);
		const fl = roundPoly(xz([
			[-1.23, T.front - .06],
			[1.23, T.front - .06],
			[1.23, T.rear + .09],
			[-1.23, T.rear + .09]
		]), .004);
		part({
			id: "trailer-floor",
			label: "Floor",
			assembly: "trailer",
			source: SRC.eu,
			what: "A floor of 28 mm hardwood boards on the cross members, a fork-lift truck’s wheels’ load on any of them; lashing points along its edges.",
			specs: [["Height", `${Math.round(T.floor * 1e3)} mm off the road`], ["Inside", `${(T.front - T.rear - .2).toFixed(1)} × 2.46 m`]]
		}, [m(onY(plate(fl, .03, 4), T.floor - .015), M.wood)], { explode: [
			0,
			.3,
			0
		] }, trailer);
		const lg = [], foot = [];
		for (const sx of [-1, 1]) {
			const x = sx * .66;
			lg.push(at(box(.11, .72, .11, .008), x, (1.17 + .45) / 2, T.legs), link([
				x,
				1,
				T.legs
			], [
				sx * T.beam,
				.84,
				T.legs + .6
			], .05, .05), at(box(.12, .12, .2, .01), x, 1.15, T.legs));
			foot.push(at(box(.09, .26, .09, .006), x, .34, T.legs), at(box(.26, .035, .26, .008), x, .2, T.legs));
		}
		lg.push(cyl([
			-.66,
			.95,
			T.legs
		], [
			.66,
			.95,
			T.legs
		], .016, 10), link([
			-.72,
			.95,
			T.legs
		], [
			-.95,
			.85,
			T.legs - .05
		], .025, .025), link([
			-.95,
			.85,
			T.legs - .05
		], [
			-.95,
			.65,
			T.legs - .05
		], .02, .02));
		part({
			id: "landing-legs",
			label: "Landing legs",
			count: 2,
			assembly: "trailer",
			source: SRC.king,
			what: "Two telescopic legs under the trailer’s front, joined by a shaft: the crank on the right winds them down through their two-speed gearbox to stand the trailer when the tractor leaves it, and up again to drive.",
			moves: "Wound up to drive, down to park.",
			drive: "The crank, by hand",
			specs: [["Lift", "24 t a pair [inferred]"]]
		}, [m(GEO.merge(lg), R.chassis), m(GEO.merge(foot), R.zinc)], { explode: [
			0,
			-.4,
			.3
		] }, trailer);
		const gd = [], lt = [], rd = [], am = [];
		for (const sx of [-1, 1]) {
			for (const y of [.55, .95]) gd.push(at(box(.03, .1, 3, .005), sx * 1.22, y, -.35));
			for (const z of [
				1.1,
				-.35,
				-1.8
			]) gd.push(link([
				sx * 1.22,
				.5,
				z
			], [
				sx * 1.22,
				1.17,
				z
			], .05, .03));
			gd.push(link([
				sx * T.beam,
				low,
				T.rear + .25
			], [
				sx * .7,
				.5,
				T.rear + .15
			], .06, .06));
			lt.push(at(box(.36, .14, .05, .015), sx * .95, .66, T.rear + .1));
			rd.push(at(box(.22, .11, .01, .005), sx * 1, .66, T.rear + .07));
			am.push(at(box(.1, .11, .01, .005), sx * .8, .66, T.rear + .07));
			for (const z of [
				3,
				0,
				-3,
				-6
			]) am.push(at(box(.012, .03, .07, .004), sx * 1.276, 1.2, z));
		}
		gd.push(at(box(2.3, .12, .1, .01), 0, .5, T.rear + .15));
		gd.push(at(box(.5, .14, .02, .006), .4, 1.75, T.front + .01));
		for (const x of [
			.25,
			.4,
			.55
		]) gd.push(cyl([
			x,
			1.75,
			T.front + .02
		], [
			x,
			1.75,
			T.front + .05
		], .028, 16));
		part({
			id: "guards-lights",
			label: "Guards and lights",
			assembly: "trailer",
			source: SRC.eu,
			what: "The side guards between the landing legs and the axles that keep a cyclist from falling under the wheels; the rear underrun guard that keeps a car from running under the trailer; the tail, brake and indicator lights on it, the amber markers along the sides, and the three heads on its front wall that the tractor’s lines plug into.",
			specs: [["Rear guard", "~ 550 mm off the road"]]
		}, [
			m(GEO.merge(gd), M.trim),
			m(GEO.merge(lt), M.trim),
			m(GEO.merge(rd), M.red),
			m(GEO.merge(am), M.amber)
		], { explode: [
			0,
			-.3,
			-.4
		] }, trailer);
	}
	{
		const beams = [], arms = [], rubber = [], steel = [], damp = [], guards = [];
		for (const z of T.axles) {
			beams.push(at(box(1.76, .127, .127, .012), 0, YT, z));
			for (const sx of [-1, 1]) {
				const x = sx * T.beam;
				arms.push(link([
					x,
					.62,
					z + .55
				], [
					x,
					YT - .08,
					z
				], .09, .07), link([
					x,
					YT - .08,
					z
				], [
					x,
					.42,
					z - .44
				], .09, .07), cyl([
					x - .06,
					.62,
					z + .55
				], [
					x + .06,
					.62,
					z + .55
				], .045, 16));
				const b = airSpring(x, .44, .82, z - .44, .15);
				rubber.push(b.rubber);
				steel.push(b.steel);
				damp.push(cyl([
					sx * .66,
					YT,
					z - .08
				], [
					sx * .66,
					.66,
					z + .25
				], .035, 16), cyl([
					sx * .66,
					.66,
					z + .25
				], [
					sx * .62,
					.72,
					z + .5
				], .016, 10));
			}
		}
		for (const sx of [-1, 1]) guards.push(at(box(.42, .012, T.axles[0] - T.axles[2] + 1.2, .006), sx * T.x, 1.12, (T.axles[0] + T.axles[2]) / 2), at(box(.4, .45, .008, .003), sx * T.x, .68, T.axles[2] - .62));
		part({
			id: "trailer-axles",
			label: "Axles and air suspension",
			count: 3,
			assembly: "running",
			source: SRC.bags,
			what: "Three square steel axle beams, 1.31 m apart, each on two trailing arms from hangers under the main rails; an air bellows behind each axle on each arm carries the load, a levelling valve holding the trailer’s height; a damper beside each bellows; the guards over the wheels.",
			moves: "The bellows’ pressure follows the load; the height stays.",
			drive: "The road; the air from the tractor",
			specs: [["Rated", "9 t an axle, 24 t the three [inferred]"], ["Bellows", "6, Ø 300 mm effective [inferred]"]]
		}, [
			m(GEO.merge(beams), R.chassis),
			m(GEO.merge(arms), R.forged),
			m(GEO.merge(rubber), R.bush),
			m(GEO.merge(steel), R.zinc),
			m(GEO.merge(damp), R.damper),
			m(GEO.merge(guards), M.trim)
		], {
			explode: [
				0,
				-.5,
				0
			],
			tag: {
				text: "Trailer axles",
				at: [
					-T.beam,
					.62,
					zb - .44
				],
				side: "left",
				value: () => `${tonnes(L.bogie)} t on the three (24 t allowed) · bellows ${fmt(bagP(L.bogie, MASS.unsprung.trailer * 3, 6) / 1e5, 1)} bar`
			}
		}, root);
	}
	/** @type {ReturnType<typeof hinge>[]} */
	const rearDoors = [];
	{
		const yb = 1.17, W2 = TR.W / 2, tw = .03;
		const walls = [];
		for (const sx of [-1, 1]) walls.push(onX(plate(zyShape([
			[T.front, yb],
			[T.rear + .1, yb],
			[T.rear + .1, T.roof],
			[T.front, T.roof]
		], .01), tw, 4), sx * (W2 - tw / 2)));
		walls.push(at(slab(2 * W2, tw, T.front - T.rear - .1), 0, T.roof - tw / 2, (T.front + T.rear + .1) / 2), at(slab(2 * W2, T.roof - yb, tw), 0, (T.roof + yb) / 2, T.front - tw / 2));
		const edges = [];
		for (const sx of [-1, 1]) edges.push(at(box(.06, .06, T.front - T.rear - .1, .01), sx * (W2 - .03), T.roof - .03, (T.front + T.rear + .1) / 2), at(box(.06, T.roof - yb, .06, .01), sx * (W2 - .03), (T.roof + yb) / 2, T.front - .03), at(box(.04, .1, T.front - T.rear - .1, .006), sx * (W2 + .002), 1.22, (T.front + T.rear + .1) / 2));
		edges.push(at(box(2 * W2, .06, .06, .01), 0, T.roof - .03, T.front - .03));
		part({
			id: "box-walls",
			label: "Box walls and roof",
			assembly: "box",
			source: SRC.eu,
			what: "Sandwich panels of foam between two glass-fibre skins, 30 mm thick: the two sides, the front wall and the roof, bonded and riveted to aluminium rails along their edges and corners, standing on the floor’s outer rails; light, stiff and smooth to the air.",
			specs: [["Outside", `${(T.front - T.rear).toFixed(1)} × ${TR.W} × ${T.roof} m`], ["Inside", "13.4 × 2.48 × 2.67 m, ~ 89 m³"]]
		}, [m(GEO.merge(walls), M.box), m(GEO.merge(edges), M.alu)], {
			explode: [
				0,
				1.2,
				0
			],
			xray: "shell"
		}, trailer);
		const fr = [];
		for (const sx of [-1, 1]) fr.push(at(box(.1, T.roof - yb, .1, .01), sx * (W2 - .05), (T.roof + yb) / 2, T.rear + .05));
		fr.push(at(box(2 * W2, .14, .1, .01), 0, T.roof - .07, T.rear + .05), at(box(2 * W2, .15, .1, .01), 0, 1.2449999999999999, T.rear + .05));
		part({
			id: "rear-frame",
			label: "Rear frame",
			assembly: "box",
			source: SRC.eu,
			what: "A galvanised steel portal at the box’s back: two corner posts carrying the doors’ hinges, the header over the opening and the sill under it, which a fork-lift truck drives over.",
			specs: [["Opening", `${(2 * W2 - .2).toFixed(2)} × ${(T.roof - .14 - yb - .15).toFixed(2)} m`]]
		}, [m(GEO.merge(fr), R.zinc)], { explode: [
			0,
			.3,
			-.6
		] }, trailer);
		const dy0 = 1.3299999999999998, dy1 = T.roof - .15, zh = T.rear - .05;
		for (const sx of [1, -1]) {
			const id = sx > 0 ? "rear-door-left" : "rear-door-right";
			const h = hinge(trailer, {
				at: [
					sx * (W2 + .015),
					0,
					zh
				],
				axis: "y",
				max: -sx * (260 * Math.PI / 180),
				name: id
			});
			const leaf = at(box(W2 + .01, dy1 - dy0, .04, .008), -sx * (W2 + .01) / 2, (dy0 + dy1) / 2, .03);
			const hard = [];
			for (const y of [
				1.4799999999999998,
				2.23,
				dy1 - .9,
				dy1 - .15
			]) hard.push(at(box(.16, .06, .02, .005), -sx * .06, y, 0), cyl([
				0,
				y - .04,
				-.005
			], [
				0,
				y + .04,
				-.005
			], .012, 10));
			const bars = [];
			for (const bx of [.35, .95]) {
				bars.push(cyl([
					-sx * bx,
					1.2499999999999998,
					-.012
				], [
					-sx * bx,
					dy1 + .08,
					-.012
				], .014, 10));
				for (const y of [2.33, dy1 - 1]) bars.push(at(box(.04, .05, .02, .006), -sx * bx, y, -.006));
				bars.push(at(box(.03, .18, .02, .006), -sx * (bx + .03), (dy0 + dy1) / 2, -.03));
			}
			kit.part(h.pivot, {
				id,
				label: sx > 0 ? "Rear door, left" : "Rear door, right",
				assembly: "box",
				source: SRC.eu,
				what: "A sandwich door on four hinges at its corner post, held shut by two locking bars whose cams turn into keepers in the header and the sill; unlocked, it swings out through 260° to lie flat against the box’s side, where a hook holds it.",
				moves: "Swings 260° on its hinges.",
				drive: "By hand (the Rear doors slider)",
				specs: [["Leaf", `${Math.round((W2 + .01) * 1e3)} × ${Math.round((dy1 - dy0) * 1e3)} mm`]]
			}, { explode: [
				sx * .3,
				0,
				-.7
			] }, trailer);
			h.pivot.add(m(leaf, M.box), m(GEO.merge(hard), R.zinc), m(GEO.merge(bars), R.zinc));
			rearDoors.push(h);
		}
	}
	const ctl = {
		speed: {
			label: "Speed asked",
			min: 0,
			max: 90,
			value: speed,
			step: 1,
			unit: "km/h",
			ends: ["Standing", "90 km/h"]
		},
		grade: {
			label: "Grade",
			min: -10,
			max: 25,
			value: grade,
			step: .5,
			unit: "%",
			ends: ["Downhill", "Steep climb"]
		},
		load: {
			label: "Payload",
			min: 0,
			max: VEHICLE.payload,
			value: Math.min(load, VEHICLE.payload),
			step: 100,
			unit: "kg",
			ends: ["Empty", "40 t gross"]
		},
		tilt: {
			label: "Cab tilted",
			min: 0,
			max: 1,
			value: tilt,
			step: .01,
			digits: 2,
			ends: ["Down", "Tilted 60°"]
		},
		doors: {
			label: "Cab doors",
			min: 0,
			max: 1,
			value: doors,
			step: .01,
			digits: 2,
			ends: ["Shut", "Open"]
		},
		rear: {
			label: "Rear doors",
			min: 0,
			max: 1,
			value: rear,
			step: .01,
			digits: 2,
			ends: ["Shut", "Open to the sides"]
		}
	};
	const OVER = 6e4 - VEHICLE.kerb, RAMP = .3;
	/** what the driver is asked for: the sliders, or the break's overload up its ramp @param {{ broken: boolean }} env */
	const input = (env) => ({
		vSet: ctl.speed.value * KMH,
		grade: env.broken ? RAMP : ctl.grade.value / 100,
		load: env.broken ? OVER : ctl.load.value
	});
	sim.settle(input({ broken: false }));
	for (let k = 0; k < 200; k++) air.step(.05, {
		n: sim.s.rpm,
		mf: sim.s.fuel * .835 / 3600
	});
	const sag = { f: 0 };
	let turboAng = 0;
	const pa = new three.Vector3(), ax = new three.Vector3(1, 0, 0), q = new three.Quaternion();
	const rTrail = TTYRE.r * .965;
	kit.onTick((dt, env) => {
		const inp = input(env);
		sim.step(dt, inp);
		const s = sim.s;
		const dead = s.stalled && !s.running;
		air.step(dt, {
			n: dead ? 0 : s.rpm,
			mf: dead ? 0 : s.fuel * .835 / 3600
		});
		L = axleLoads(inp.load, s.stalled ? 0 : s.a, s.road.th);
		const x = (L.steer - KERB.steer) / 2 / KF;
		sag.f += ((x > TRAVEL_F ? TRAVEL_F + (x - TRAVEL_F) / 10 : x) - sag.f) * clamp(dt / .25);
		const wb = axle.steer - axle.drive, al = sag.f / wb;
		body.rotation.x = al;
		body.position.y = -sag.f + al * axle.steer;
		body.updateMatrix();
		for (const lp of springs) lp.set(CAMBER - sag.f);
		const kp = inFrame(body, [
			0,
			TR.king.y,
			TR.king.z
		]);
		const at2 = (TR.king.y - kp[1]) / (TR.king.z - zb);
		trailer.rotation.x = at2;
		trailer.position.y = at2 * zb;
		for (const w of [...front, ...drive]) w.set(s.wheelAng);
		for (const w of trail) w.set(s.wheelAng * VEHICLE.r / rTrail);
		crown.rotation.x = shafts.rotation.x = s.wheelAng;
		turboAng += air.s.w / 2e3 * dt;
		engine.update({
			a: s.engAng,
			ap: s.propAng,
			slipping: s.launch,
			gear: s.gear,
			turboAng,
			gate: air.s.gate,
			fire: dead ? 0 : clamp(air.s.q / 300),
			running: !dead
		});
		shaft.set([inFrame(body, engine.points.out), PINION], s.propAng);
		const th = TILT * clamp(ctl.tilt.value);
		cabPivot.rotation.x = th;
		q.setFromAxisAngle(ax, th);
		pa.set(0, ramB[1] - H[1], ramB[2] - H[0]).applyQuaternion(q);
		const B = [
			ramB[0],
			H[1] + pa.y,
			H[0] + pa.z
		];
		const len = Math.hypot(B[1] - ramA[1], B[2] - ramA[2]);
		aim(ram.body, ramA, B, false);
		ram.body.scale.set(1, Math.min(.32, len), 1);
		aim(ram.rod, B, ramA, false);
		ram.rod.scale.set(1, Math.max(.05, len - .02), 1);
		const kd = clamp(ctl.doors.value);
		for (const d of cabDoors) d.set(kd);
		const kr = clamp(ctl.rear.value);
		for (const d of rearDoors) d.set(kr);
		gauges.set([kmh(), s.rpm]);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || s.spin || lug && s.gear === 1;
		r.state = s.stalled ? s.why === "grip" ? env.broken ? `stopped, the drive wheels spinning: 60 t up a ${RAMP * 100} % ramp` : "stopped: the drive wheels spin" : env.broken ? `stalled: 60 t up a ${RAMP * 100} % ramp` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.spin ? `the drive wheels slipping in ${ordinal(s.gear)}: the climb takes all their grip` : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `full throttle in ${ordinal(s.gear)}` : s.Fb > 1 ? inp.grade < -.005 ? `braking down the hill in ${ordinal(s.gear)}` : `braking to the speed asked in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : s.v > inp.vSet + .5 ? `easing off to the speed asked in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? s.why === "grip" ? `the drive axle carries ${tonnes(L.drive)} t and its tyres grip at most ${fmt(s.can / 1e3)} kN, the ramp and the road take ${fmt(s.need / 1e3)} kN · ${env.broken ? "take the break back" : "move a slider"} to start again` : `first gear gives at most ${fmt(s.can / 1e3)} kN at the wheels, the hill and the road take ${fmt(s.need / 1e3)} kN · ${env.broken ? "take the break back" : "move a slider"} to start again` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3)} kW at the flywheel · ${fmt(air.s.boost / 1e5, 2)} bar boost · the road takes ${fmt(s.road.F / 1e3, 1)} kN (rolling ${fmt(s.road.roll / 1e3, 1)}, climbing ${fmt(s.road.climb / 1e3, 1)}, air ${fmt(s.road.air / 1e3, 1)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 1)} L/h`}`;
	});
	const phase = (t0, a, b) => ease.io(clamp((t0 - a) / (b - a)));
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power at the wheels",
			unit: "kW",
			max: 400,
			digits: 0
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		moves: {
			tilt: {
				label: "Tilt the cab",
				seconds: 12,
				note: "Stop, tilt the cab forward over the engine, lower it again",
				at: (u) => ({
					speed: 0,
					tilt: phase(u * 12, 1, 5) - phase(u * 12, 8, 11.5)
				})
			},
			rear: {
				label: "Open the doors",
				seconds: 12,
				note: "Stop, swing both rear doors round to the sides, close them",
				at: (u) => ({
					speed: 0,
					rear: phase(u * 12, 1, 5) - phase(u * 12, 8, 11.5)
				})
			}
		},
		how: {
			text: `A driver holds the speed asked: the road takes a force to roll the twelve tyres, to lift the truck up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the axle’s losses at the engine. The gearbox’s control unit picks the highest of its twelve gears that gives that push without the engine running under 1,000 rpm, and the engine’s full-load curve says how much it can give; downhill it brakes when even the shut throttle pushes too much. Only the drive axle’s twins push, and they push at most three quarters of their load: the trailer’s weight rests partly on the fifth wheel, and climbing and pulling move load back, off the kingpin and the steer axle and onto the trailer’s axles and the drive axle; past their grip they spin and the truck stops. The engine’s fuel comes from its work and its friction; its fuel and speed drive the turbocharger’s model, which gives the boost, the turbo’s speed and the gas before the turbine. The bellows hold the frame and the trailer at their height, so their pressure follows the load; the front springs sink by the load over their rate. Not modelled: the grip of the steer and trailer axles, the turbo’s lag on the engine’s torque, the tyres’ heat. The cab’s tilt and the doors are moved by their sliders alone. Shown slowed: the wheels 10 times, the engine, the gearbox and the propshaft 40 times, the turbo 2,000 times.`,
			eqs: [
				`F = m g (Crr cos θ + sin θ) + ½ ρ Cd A v²      m = ${fmt(VEHICLE.kerb)} kg + payload, Crr = 0.0055, Cd A = 5.6 m²`,
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.92",
				`n = (v / r) · i_gear · i_axle      r = ${VEHICLE.r.toFixed(3)} m, i = ${GEARS[0].toFixed(2)} … 1.00, i_axle = 2.53`,
				"T_engine ≤ T_full(n)      2,300 N·m from 1,000 to 1,400 rpm, 338 kW from 1,400 to 1,900 rpm",
				`F_drive ≤ μ N_drive      μ = ${MU} on dry asphalt`,
				"N_king = [m_t g cos θ (z_t − z_bogie) − m_t (a + g sin θ)(h_t − h_king)] / (z_king − z_bogie)",
				"N_steer = [m_c g cos θ (z_c − z_drive) + N_king (z_king − z_drive) − m_t (a + g sin θ) h_king − m_c (a + g sin θ) h_c] / wheelbase",
				"p_bellows = (N_axle − m_unsprung g) / (n A)      A = 0.071 m² (Ø 300 mm)",
				"fuel = (T + T_friction) ω · 172 g/kWh      T_friction from 1.3 bar",
				"turbo: Δh = μ U², PR = (1 + η_c Δh / c_p T₀)^3.5, J ω dω/dt = η_m P_t − ṁ_a Δh"
			]
		},
		breakIt: {
			label: `Overload it to 60 t up a ${RAMP * 100} % ramp`,
			run: () => {},
			reset: () => sim.restart()
		},
		cut: {
			a: [
				1,
				0,
				0
			],
			b: [
				0,
				1,
				0
			],
			center: [
				0,
				1,
				0
			],
			reach: .5
		}
	};
	kit.seal({ lab }).tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
}

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/machines/index.js
/** @typedef {import('$lib/actors').Actor} Actor */
/** @typedef {import('$lib/actors').Family} Family */
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: Actor[] })[]>} */
const HISTORY = /* @__PURE__ */ (() => ({ truck: [{
	...FIRST,
	date: "2026-10-16",
	build: [{
		id: "truck",
		label: "Truck",
		note: "as at v1: a cab and a box trailer as plain blocks on eight wheels, in its two colours",
		make: (cab = "#a33a2a", box = "#e0ddd6") => truck$1({
			cab,
			box
		})
	}]
}, {
	v: 2,
	date: "2026-10-19",
	note: "Built at AirSup’s realism round a heavy engine: a 13 L inline six with its crank, rods, pistons, overhead cam, four valves a cylinder, common rail, turbocharger and charge-air cooler, every part its own to cut open, and a 12-speed range-change gearbox; a 4×2 tractor (ladder frame, leaf-sprung steer axle, air-sprung drive axle with its twin wheels and differential, tilting sleeper cab, fifth wheel) pulling a three-axle box semi-trailer on air bellows; a solver drives it: the power at its wheels to hold a speed on a grade with a payload up to 40 t, its gear, revs, boost and fuel, the load on each axle; past the drive axle’s grip its wheels spin. Moves: tilt the cab, open the rear doors"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "truck",
	label: "Truck",
	note: "the trucks on the tired land’s highway, each in its own colours, built at AirSup’s realism: a 4×2 tractor and a three-axle box semi-trailer, 16.4 × 2.55 × 4 m, 40 t at most; a 13 L inline six with its turbo and every moving part to cut open, a 12-speed gearbox, leaf and air springs, a tilting sleeper cab and twelve wheels; a solver drives it on a grade with a payload, the load on every axle, and the drive wheels spin past their grip (a Thing until 2026-10-16, things/truck@1)",
	from: "The tired land: the highway",
	params: [{
		id: "cab",
		label: "Cab",
		type: "string",
		value: "#a33a2a",
		maxLength: 7
	}, {
		id: "box",
		label: "Box",
		type: "string",
		value: "#e0ddd6",
		maxLength: 7
	}],
	variants: [{
		id: "truck",
		label: "Truck",
		note: "a red cab and a white box trailer, as listed; a world gives each its colours (cab, box); 14.4 t empty, 25.6 t payload",
		make: (cab = "#a33a2a", box = "#e0ddd6") => castOf(truck({
			cab,
			box
		}))
	}]
}];
/** @type {Family[]} */
const MACHINES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("machines", MACHINES, id, v, variant);
const list = () => recipesIn(MACHINES);

//#endregion
exports.list = list;
exports.recipe = recipe;