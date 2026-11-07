// The piece "Power Cube (machines/powercube.js)", version 2: below its requires, the text of the copy in Pickup v1 (src/lib/machines/powercube.js), as it was.
const three = require("three");
const { GEO, MAT, table, clamp, approach, lerp, fmt, Flow } = require("f17f8358fd4bca21830facf59f17092bc9250f126123f848212da085a3789833");
const { assetKit } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
/** @typedef {[number, number, number]} V3 */
/** the cube: 27" each way, its 4×4 skids' height */
const CUBE = {
	W: .686,
	L: .66,
	H: .686,
	B: .1016
};
/** the crank's line (x 0, y, along z) and the plane the two cylinders stand in */
const CRANK = {
	y: .235,
	z: .03
};
/** the engine: bore, stroke, rod (m), displacement (m³), its cylinders' angle from upright (rad) */
const ENGINE = /* @__PURE__ */ (() => ({
	bore: .0838,
	stroke: .0734,
	rod: .116,
	Vd: 81e-5,
	bank: Math.PI / 4,
	deck: .186
}))();
/** the pump: displacement (m³ a turn), its gears (teeth, module, width), the idler above the drive */
const PUMP = {
	D: 16e-6,
	teeth: 12,
	module: .0025,
	width: .034,
	z0: -.232
};
const SOURCES$1 = [
	{
		label: "Power Cube VII (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_VII"
	},
	{
		label: "Power Cube 7s (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_7s"
	},
	{
		label: "Power Cube v15.6 (OSE wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube_v15.6"
	},
	{
		label: "Power Cube (OSE portfolio)",
		url: "https://www.opensourceecology.org/portfolio/power-cube/"
	},
	{
		label: "Power Cube fabrication manual (v4)",
		url: "https://commons.wikimedia.org/wiki/File:Open_Source_Ecology_-_Powercube_-_Fabricaion_Manual.pdf"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
/** the engine's own numbers (bore, stroke, compression) are from its maker's data sheet, which we do not name */
const SRC$1 = /* @__PURE__ */ (() => ({
	vii: SOURCES$1[0].label,
	s7: SOURCES$1[1].label,
	v156: SOURCES$1[2].label,
	port: SOURCES$1[3].label,
	man: SOURCES$1[4].label,
	eng: SOURCES$1[0].label
}))();
const ASSEMBLIES$1 = [
	{
		id: "frame",
		label: "Frame",
		note: "A 27\" cube: two 4×4 tube skids carry everything and take the forks; 2×2 angle posts and rails close it; the quick-attach plates on its back couple it to a machine.",
		out: [
			0,
			-.12,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "An 810 cc air-cooled 90° V-twin, 28 hp at 3,600 rpm, electric start: its crank turns the pump through the coupling behind it.",
		out: [
			0,
			.32,
			.3
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulics",
		note: "The gear pump on the engine’s shaft, the 7-gallon reservoir over it, the relief valve and gauge, the six-tube cooler, the return filter and the two quick couplers on the back.",
		out: [
			0,
			.18,
			-.42
		]
	},
	{
		id: "controls",
		label: "Fuel and controls",
		note: "The 7-gallon fuel tank on top, the 12 V battery, and the panel on the front corner with the key, choke and throttle.",
		out: [
			.36,
			.3,
			.2
		]
	}
];
const STEPS$1 = [
	"Cut, drill and bolt the frame: skids, posts, rails, the engine plate and the quick-attach plates",
	"Bolt in the engine and fit its flywheel, shroud, air cleaner and muffler",
	"Mount the coupling and the pump; fit the reservoir, hoses, relief, gauge, cooler, filter and couplers",
	"Fit the fuel tank, the battery and the control panel"
];
/** a rounded rectangle, centred @param {number} w @param {number} h @param {number} r */
function rrect$1(w, h, r) {
	const s = new three.Shape(), x = w / 2, y = h / 2;
	s.moveTo(-x + r, -y);
	s.lineTo(x - r, -y);
	s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
	s.lineTo(x, y - r);
	s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
	s.lineTo(-x + r, y);
	s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
	s.lineTo(-x, -y + r);
	s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
	return s;
}
/** a hole in a shape: a circle @param {number} x @param {number} y @param {number} r */
const ring = (x, y, r) => {
	const p = new three.Path();
	p.absarc(x, y, r, 0, Math.PI * 2, true);
	return p;
};
/** a solid extruded along z by `d`, centred, with a small bevel @param {THREE.Shape} s @param {number} d @param {number} [b] */
const ext$1 = (s, d, b = 8e-4) => GEO.extrude(s, d, b);
/** a thin plate from a shape along z, centred, sharp-edged and light (fins, screens, tube walls) @param {THREE.Shape} s @param {number} d @param {number} [seg] */
const plate$1 = (s, d, seg = 8) => new three.ExtrudeGeometry(s, {
	depth: d,
	bevelEnabled: false,
	curveSegments: seg
}).translate(0, 0, -d / 2);
/** a plain box, centred (for sheets too thin to show a rounded edge) @param {number} w @param {number} h @param {number} d */
const slab$1 = (w, h, d) => new three.BoxGeometry(w, h, d);
/** a ring gear's teeth round a rim @param {number} n @param {number} mod @param {number} w */
function ringGear(n, mod, w) {
	const s = new three.Shape(), ra = n * mod / 2 + mod, rf = n * mod / 2 - 1.25 * mod, da = Math.PI * 2 / n;
	const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
	s.moveTo(...pt(rf, 0));
	for (let k = 0; k < n; k++) {
		const a = k * da;
		s.lineTo(...pt(ra, a + .27 * da));
		s.lineTo(...pt(ra, a + .48 * da));
		s.lineTo(...pt(rf, a + .75 * da));
		s.lineTo(...pt(rf, a + da));
	}
	s.holes.push(ring(0, 0, rf - .006));
	return plate$1(s, w, 4);
}
/** a rounded box, centred @param {number} w @param {number} h @param {number} d @param {number} [r] */
const box$1 = (w, h, d, r = Math.min(w, h, d) * .12) => GEO.rbox(w, h, d, r, 3);
/** a solid of revolution about z from [r, z] points @param {[number, number][]} pts @param {number} [seg] */
const latheZ$1 = (pts, seg = 48) => GEO.lathe(pts, seg).rotateX(Math.PI / 2);
/** about x @param {[number, number][]} pts @param {number} [seg] */
const latheX$1 = (pts, seg = 48) => GEO.lathe(pts, seg).rotateZ(-Math.PI / 2);
/** a round bar (closed) along z, from z0 to z1 @param {number} r @param {number} z0 @param {number} z1 @param {number} [seg] */
const rodZ = (r, z0, z1, seg = 32) => latheZ$1([
	[0, z0],
	[r, z0],
	[r, z1],
	[0, z1]
], seg);
/** a closed cylinder from a to b @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function cyl$1(a, b, r, seg = 32) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b), len = A.distanceTo(B);
	const g = GEO.disc(r, len, Math.min(r, len) * .06, seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a hose or pipe through points @param {V3[]} pts @param {number} r */
const hose$1 = (pts, r) => GEO.pipe(pts, r, {
	seg: Math.max(24, pts.length * 14),
	radial: 14,
	tension: .5
});
/** one hex head at a point, its axis along `dir` @param {V3} at @param {V3} dir @param {number} s @param {number} h */
function hex$1(at, dir, s, h) {
	const g = new three.CylinderGeometry(s, s, h, 6).translate(0, h / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()));
	return g.translate(...at);
}
/** move a geometry @param {THREE.BufferGeometry} g @param {number} x @param {number} y @param {number} z */
const at$1 = (g, x, y, z) => g.translate(x, y, z);
function materials$1() {
	return {
		red: MAT.paint({
			color: [
				.5,
				.055,
				.035
			],
			roughness: .4,
			clearcoat: .35
		}),
		zinc: MAT.steel({
			color: [
				.52,
				.53,
				.54
			],
			roughness: .34,
			finish: "cast"
		}),
		steel: MAT.steel({ roughness: .22 }),
		shaft: MAT.steel({
			roughness: .14,
			color: [
				.63,
				.63,
				.63
			],
			cap: [
				.8,
				.79,
				.76
			],
			capRough: .3
		}),
		black: MAT.paint({
			color: [
				.028,
				.028,
				.03
			],
			roughness: .46,
			clearcoat: .25
		}),
		satin: MAT.satin({ color: [
			.035,
			.035,
			.038
		] }),
		castAl: MAT.aluminium({ roughness: .42 }),
		machinedAl: MAT.aluminiumMachined(),
		castIron: MAT.castIron(),
		piston: MAT.aluminiumMachined({
			roughness: .3,
			color: [
				.78,
				.78,
				.77
			]
		}),
		forged: MAT.steelDark({ roughness: .36 }),
		pumpAl: MAT.aluminium({
			color: [
				.86,
				.87,
				.88
			],
			roughness: .32
		}),
		gear: MAT.steel({
			roughness: .18,
			finish: "turned",
			cap: [
				.82,
				.81,
				.78
			],
			capRough: .28
		}),
		tank: MAT.paint({
			color: [
				.075,
				.08,
				.085
			],
			roughness: .44,
			clearcoat: .3
		}),
		oil: MAT.fluid({
			color: [
				.55,
				.32,
				.06
			],
			roughness: .06
		}),
		fuel: MAT.glass({
			color: [
				.98,
				.9,
				.55
			],
			transmission: .85,
			thickness: .05,
			roughness: .05
		}),
		hose: MAT.rubber(),
		brass: MAT.brass({ roughness: .28 }),
		capRed: MAT.plastic({
			color: [
				.55,
				.05,
				.03
			],
			roughness: .38
		}),
		capBlue: MAT.plastic({
			color: [
				.03,
				.12,
				.45
			],
			roughness: .38
		}),
		plastic: MAT.plastic(),
		paper: MAT.ceramic({
			color: [
				.82,
				.74,
				.55
			],
			roughness: .8
		}),
		ceramic: MAT.ceramic({
			color: [
				.9,
				.89,
				.86
			],
			roughness: .25
		}),
		copper: MAT.copper(),
		muffler: MAT.steelDark({
			color: [
				.2,
				.19,
				.18
			],
			roughness: .55
		}),
		glass: MAT.glass(),
		dial: MAT.enamel(),
		needle: MAT.paint({
			color: [
				.7,
				.05,
				.03
			],
			roughness: .3
		}),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		green: MAT.plastic({
			color: [
				.04,
				.3,
				.12
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
		finAl: MAT.aluminium({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .35
		}),
		vane: MAT.aluminium({
			color: [
				.52,
				.53,
				.54
			],
			roughness: .62
		}),
		hdpe: MAT.plastic({
			color: [
				.86,
				.83,
				.74
			],
			roughness: .55,
			transmission: .45,
			thickness: .02,
			ior: 1.54
		})
	};
}
/** the engine's full-throttle torque (N·m, gross) by speed (rpm) [inferred: peak 63 N·m at 2,600 from a 9.8 bar BMEP, 55.4 at 3,600 from the rated 20.9 kW] */
const TORQUE = {
	rpm: [
		0,
		600,
		1200,
		1800,
		2200,
		2600,
		3e3,
		3600,
		4e3
	],
	nm: [
		0,
		22,
		44,
		56,
		60.5,
		63,
		61.5,
		55.4,
		49
	]
};
/** gross to installed (air cleaner, muffler, the shroud's fan) [inferred: 93 %] */
const INSTALLED = .93;
const PSI = 6894.76;
/** ISO VG 46 oil's kinematic viscosity (cSt) at a temperature (°C) [from its 46 cSt at 40 °C, 6.8 at 100 °C] */
const viscosity = (T) => 46 * Math.exp(-.0335 * (T - 40));
/** the most torque the engine gives at any speed its governor lets it run at (N·m, installed) @param {number} set */
const best = (set) => {
	let t = 0;
	for (let n = 600; n <= set * 1.03; n += 25) t = Math.max(t, table(TORQUE.rpm, TORQUE.nm, n) * INSTALLED);
	return t;
};
/**
* The cube's physics, stepped in time. Everything the page shows comes from here.
* @param {{ speed: { value: number }, load: { value: number } }} ctl
*/
function solver(ctl) {
	const J = .075;
	const etaHM = .92;
	const kLeak0 = .06 * PUMP.D * 60 / (3e3 * PSI);
	const crack = 3e3 * PSI, override = 160 * PSI;
	const kLine = 60 * PSI / Math.pow(57.5 / 6e4, 2);
	const C = 57516;
	const UAcool = 150, UAtank = 12, Tair = 20;
	const HEAT = 20;
	const s = {
		w: 120 * Math.PI,
		theta: .4,
		set: ctl.speed.value,
		valves: 1,
		p: 0,
		q: 0,
		qLoad: 0,
		qRelief: 0,
		T: 45,
		Te: 0,
		Tp: 0,
		hyd: 0,
		shaft: 0,
		fuel: 0,
		stalled: false,
		dead: false,
		stuck: false,
		start: 0,
		ang: 0,
		at: {
			speed: ctl.speed.value,
			load: ctl.load.value
		}
	};
	const rpm = () => s.w * 60 / (2 * Math.PI);
	/** the engine's torque at a speed and throttle (N·m): its installed curve, less friction closed */
	const engine = (n, th) => {
		const f = 2.5 + .0012 * n;
		return th * (table(TORQUE.rpm, TORQUE.nm, n) * INSTALLED + f) - f;
	};
	/** @param {number} dt @param {{ broken: boolean }} env */
	function step(dt, env) {
		s.dead = s.stuck = env.broken;
		if (s.stalled) {
			if ((Math.abs(ctl.speed.value - s.at.speed) > 1 || Math.abs(ctl.load.value - s.at.load) > 1) && !env.broken) restart();
		}
		const sub = 8, h = dt / sub;
		for (let i = 0; i < sub && !s.stalled; i++) {
			const nNow = rpm();
			s.set += clamp(ctl.speed.value - s.set, -1500 * h, 1500 * h);
			const set = s.set;
			const want = clamp((set * 1.03 - nNow) / (set * .08));
			s.theta = approach(s.theta, want, .08, h);
			if (nNow > set * .85) s.valves = Math.min(1, s.valves + h / 1.5);
			const kLeak = kLeak0 * (viscosity(50) / viscosity(s.T));
			const qGeo = PUMP.D * (nNow / 60);
			const pLoad = ctl.load.value * PSI * s.valves;
			if (s.dead) {
				s.qLoad = 0;
				const qOut = Math.max(0, qGeo - kLeak * s.p);
				const relief = s.stuck ? 0 : Math.max(0, (s.p - crack) / override) * (57.5 / 6e4);
				s.p = Math.max(0, s.p + 35e10 * (qOut - relief) * h);
				s.qRelief = relief;
				s.q = qOut;
			} else {
				let p = pLoad + kLine * qGeo * qGeo;
				let qLoad = Math.max(0, qGeo - kLeak * p), qRelief = 0;
				if (p > crack) for (let k = 0; k < 12; k++) {
					const qOut = Math.max(0, qGeo - kLeak * p);
					qLoad = p > pLoad ? Math.min(qOut, Math.sqrt((p - pLoad) / kLine)) : 0;
					qRelief = Math.max(0, qOut - qLoad);
					p = lerp(p, crack + override * (qRelief / (57.5 / 6e4)), .5);
				}
				s.p = approach(s.p, p, .02, h);
				s.q = Math.max(0, qGeo - kLeak * s.p);
				s.qLoad = qLoad;
				s.qRelief = qRelief;
			}
			s.Tp = qGeo > 0 ? PUMP.D * s.p / (2 * Math.PI * etaHM) + .4 : 0;
			s.Te = engine(nNow, s.theta) + (s.start > 0 ? 12 : 0);
			s.start = Math.max(0, s.start - h);
			s.w = Math.max(0, s.w + (s.Te - s.Tp) / J * h);
			if (rpm() < 500 && s.start <= 0) {
				s.stalled = true;
				s.w = 0;
				s.p = 0;
				s.q = s.qLoad = s.qRelief = 0;
				s.at = {
					speed: ctl.speed.value,
					load: ctl.load.value
				};
			}
		}
		const nNow = rpm();
		s.hyd = s.p * s.qLoad;
		s.shaft = s.Tp * s.w;
		const losses = s.shaft - s.p * s.q + s.p * s.qRelief + kLine * s.qLoad ** 3 + .25 * s.hyd;
		const out = (UAcool * (s.stalled ? .15 : 1) + UAtank) * (s.T - Tair);
		s.T += (losses - out) / C * dt * HEAT;
		const P = Math.max(0, s.Te * s.w) / 1e3, frac = P / 19.4;
		s.fuel = s.stalled ? 0 : P * .37 * (1 + .6 * (1 - frac) ** 2) / .745 + .5;
		s.ang += s.w / 40 * dt;
		return { rpm: nNow };
	}
	/** the key turned: it cranks, with the valves in neutral */
	function restart() {
		s.stalled = false;
		s.start = .8;
		s.p = 0;
		s.valves = 0;
	}
	return {
		s,
		step,
		rpm,
		restart
	};
}
/**
* The Power Cube v3: a root at its real size, every part its own, its solver running it.
* @param {{ speed?: number, load?: number }} [o] the engine's set speed (rpm) and the pressure the work needs (psi)
* @returns {THREE.Group}
*/
function powerCube({ speed = 3600, load = 1500 } = {}) {
	const root = new three.Group();
	root.name = "Power Cube";
	const M = materials$1();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES$1,
		steps: STEPS$1,
		sources: SOURCES$1
	});
	const { W, L, H, B } = CUBE;
	const X = W / 2, Z = L / 2;
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** a part: its meshes, its card and how it is shown */
	const part = (info, objs, how = {}, parent = root) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	{
		const sq = rrect$1(.1016, .1016, .006);
		sq.holes.push(rrect$1(.092, .092, .003));
		const skid = plate$1(sq, L, 4);
		part({
			id: "skids",
			label: "Base skids (4×4 tube)",
			assembly: "frame",
			count: 2,
			source: SRC$1.s7,
			what: "Two 4×4 steel tubes front to back under the cube: the strong frame of 7s that the engine, pump and tanks bolt to, and that takes a forklift’s forks, the lifting pins or another cube stacked on it.",
			specs: [["Stock", "4\" × 4\" × 3/16\" tube (101.6 × 4.8 mm)"], ["Length", "660 mm [inferred: the 27\" cube]"]]
		}, [-1, 1].map((sx) => m(at$1(skid.clone(), sx * (X - .0508), .0508, 0), M.red)), { explode: [
			0,
			-.1,
			0
		] });
		const sq2 = rrect$1(.0508, .0508, .004);
		sq2.holes.push(rrect$1(.0508 - .0064, .0508 - .0064, .002));
		const cross = plate$1(sq2, (X - .1016) * 2, 4).rotateY(Math.PI / 2);
		part({
			id: "cross-tubes",
			label: "Cross tubes (2×2)",
			assembly: "frame",
			count: 2,
			source: SRC$1.s7,
			what: "Two 2×2 tubes welded between the skids at front and back, squaring the base.",
			specs: [["Stock", "2\" × 2\" × 1/8\" tube"]]
		}, [-1, 1].map((sz) => m(at$1(cross.clone(), 0, .0762, sz * (Z - .04)), M.red)), { explode: [
			0,
			-.1,
			0
		] });
		const leg = .0508, t = .00635;
		/** an upright angle at a corner, its outside corner outwards */
		const post = (sx, sz) => {
			const h = H - B, cx = sx * (X - t / 2), cz = sz * (Z - t / 2);
			return GEO.merge([at$1(box$1(t, h, leg, .0012), cx, B + h / 2, cz - sz * .044449999999999996 / 2), at$1(box$1(leg, h, t, .0012), cx - sx * .044449999999999996 / 2, B + h / 2, cz)]);
		};
		part({
			id: "posts",
			label: "Corner posts (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC$1.vii,
			what: "Four corner posts of 1/4\" × 2\" × 2\" angle make the cage: they guard the engine, carry the rails and give hand-holds to lift it by.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle (6.35 × 50.8 × 50.8 mm)"], ["Envelope", "27\" (686 mm) cube"]]
		}, [m(GEO.merge([
			post(-1, -1),
			post(-1, 1),
			post(1, -1),
			post(1, 1)
		]), M.red)], { explode: [
			0,
			0,
			0
		] });
		/** a top rail along x or z, its outside corner up and out */
		const rail = (ax, s) => {
			const y = H - t / 2;
			if (ax === "x") return GEO.merge([at$1(box$1(W - .002, t, leg, .0012), 0, y, s * (Z - leg / 2)), at$1(box$1(W - .002, leg, t, .0012), 0, H - leg / 2, s * (Z - t / 2))]);
			return GEO.merge([at$1(box$1(leg, t, L - .002, .0012), s * (X - leg / 2), y, 0), at$1(box$1(t, leg, L - .002, .0012), s * (X - t / 2), H - leg / 2, 0)]);
		};
		part({
			id: "top-rails",
			label: "Top rails (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC$1.vii,
			what: "Four rails round the top of the cage: OSE’s frame cuts its members 29\", 27\" and 24\" long. The lifting eyes and the fuel tank’s rails hang on them.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle"]]
		}, [m(GEO.merge([
			rail("x", -1),
			rail("x", 1),
			rail("z", -1),
			rail("z", 1)
		]), M.red)], { explode: [
			0,
			.16,
			0
		] });
		part({
			id: "tank-rails",
			label: "Fuel tank rails",
			assembly: "frame",
			count: 2,
			source: SRC$1.vii,
			what: "Two angles across the cage under the top, the fuel tank resting on them, clear of the engine’s air cleaner.",
			specs: [["Stock", "1/8\" × 1-1/2\" angle"], ["Height", "565 mm [inferred]"]]
		}, [-.115, .27].map((z) => m(GEO.merge([at$1(box$1(W - .1, .0032, .038, .001), 0, .5634, z), at$1(box$1(W - .1, .038, .0032, .001), 0, .5444, z + .0174)]), M.red)), { explode: [
			0,
			.1,
			0
		] });
		part({
			id: "engine-plate",
			label: "Engine mount plate",
			assembly: "frame",
			source: SRC$1.vii,
			what: "A 1/2\" plate across the skids: the engine’s base bolts to it, and the pump’s bracket behind, so their shafts stay on one line.",
			specs: [["VII engine module plate", "8\" × 15½\" (203 × 394 mm), here one piece with the pump’s [inferred]"], ["Thickness", "1/2\" (12.7 mm)"]]
		}, [m(at$1(box$1(W - .06, .0127, .49, .002), 0, B + .00635, -.015), M.zinc), m(GEO.merge([-.31, .31].flatMap((x) => [-.23, .2].map((z) => hex$1([
			x,
			B + .0127,
			z
		], [
			0,
			1,
			0
		], .011, .009)))), M.zinc)], { explode: [
			0,
			-.06,
			0
		] });
		const qa = [];
		for (const y of [.162, .322]) qa.push(m(at$1(box$1(W - .04, .1016, .0095, .002), 0, y, -Z - .0048), M.red));
		const recv = rrect$1(.2032, .1016, .006);
		recv.holes.push(rrect$1(.1905, .1016 - .0127, .003));
		qa.push(m(at$1(plate$1(recv, .07, 4), 0, .2416, -Z - .044), M.red));
		for (const sx of [-1, 1]) qa.push(m(cyl$1([
			sx * .12,
			.372,
			-Z - .03
		], [
			sx * .12,
			.43,
			-Z - .03
		], .012, 20), M.zinc));
		part({
			id: "quick-attach",
			label: "Quick-attach plates and receiver",
			assembly: "frame",
			source: SRC$1.man,
			what: "How the cube is coupled to a machine: plates across its back with a 4×8 receiver tube between them, so it slides onto the machine’s mount and is pinned, and comes off again in minutes for the next machine.",
			specs: [
				["Plates", "2 × 3/8\" × 4\" × 27\""],
				["Receiver tube", "4\" × 8\" × 1/4\""],
				["Pins", "2 × 1\" [inferred]"]
			]
		}, qa, { explode: [
			0,
			0,
			-.16
		] });
		const eye = new three.TorusGeometry(.026, .0075, 12, 28);
		part({
			id: "lift-eyes",
			label: "Lifting eyes",
			assembly: "frame",
			count: 2,
			source: SRC$1.vii,
			what: "Two eyes welded on the top rails: at about 181 kg the cube is lifted on and off a machine by the loader, a hoist or two people with a bar.",
			specs: [["Cube mass", "~400 lb (181 kg)"]]
		}, [-1, 1].map((sx) => m(at$1(eye.clone(), sx * (X - .028), H + .02, 0), M.zinc)), { explode: [
			0,
			.2,
			0
		] });
	}
	const C = new three.Vector3(0, CRANK.y, CRANK.z);
	const r = ENGINE.stroke / 2;
	/** a bank's axis: its angle from upright, towards +x for the right bank */
	const banks = [["left", -1], ["right", 1]];
	/** the banks sit a rod's width apart along the crank, their two rods side by side on one pin */
	const off = (sx) => sx * .0125;
	const axis = (sx) => new three.Vector3(sx * Math.sin(ENGINE.bank), Math.cos(ENGINE.bank), 0);
	/** a geometry made upright on its own +y, turned onto a bank's axis and set on the crank */
	const onBank = (geo, sx) => geo.rotateZ(-sx * ENGINE.bank).translate(C.x, C.y, C.z + off(sx));
	/** @type {Record<string, THREE.Group>} */
	const moving = {};
	{
		const cc = [m(at$1(box$1(.25, .2, .29, .035), 0, .226, .03), M.black), m(at$1(box$1(.3, .018, .3, .004), 0, B + .0127 + .009, .03), M.black)];
		for (const [, sx] of banks) cc.push(m(onBank(latheZ$1([
			[0, 0],
			[.068, 0],
			[.068, .012],
			[0, .012]
		], 40).rotateX(-Math.PI / 2).translate(0, .088, 0), sx), M.black));
		cc.push(m(GEO.merge([-.135, .135].flatMap((x) => [-.08, .14].map((z) => hex$1([
			x,
			B + .0217,
			z
		], [
			0,
			1,
			0
		], .008, .008)))), M.zinc));
		cc.push(m(at$1(latheZ$1([
			[0, -.115],
			[.06, -.115],
			[.06, -.125],
			[0, -.125]
		], 40), 0, CRANK.y, 0), M.black));
		part({
			id: "crankcase",
			label: "Crankcase",
			assembly: "engine",
			source: SRC$1.eng,
			what: "The engine’s cast block: it carries the crankshaft in its two main bearings, the camshaft and the governor, holds the oil in its sump, and bolts to the plate by its flange.",
			specs: [
				["Engine", "810 cc 90° V-twin, OHV, air-cooled"],
				["Rated", "28 hp (20.9 kW) gross at 3,600 rpm"],
				["Oil", "~1.9 L SAE 30 [inferred]"],
				["Dry mass", "~42 kg (92 lb)"]
			]
		}, cc, {
			explode: [
				0,
				.02,
				.02
			],
			xray: "shell",
			tag: {
				at: [
					-.12,
					.25,
					.1
				],
				value: () => `${fmt(sim.rpm())} rpm · ${fmt(Math.max(0, sim.s.Te) * sim.s.w / 1e3, 1)} kW`,
				text: "Engine",
				side: "left"
			}
		});
		const crank = new three.Group();
		crank.position.copy(C);
		const web = new three.Shape();
		web.moveTo(-.022, r);
		web.absarc(0, r, .022, Math.PI, 0, true);
		web.lineTo(.034, 0);
		web.absarc(0, 0, .062, 0, -Math.PI, true);
		web.lineTo(-.034, 0);
		web.lineTo(-.022, r);
		crank.add(m(rodZ(.0175, -.165, -.052), M.shaft), m(rodZ(.0175, .052, .205), M.shaft), m(at$1(ext$1(web, .016, .001), 0, 0, -.044), M.forged), m(at$1(ext$1(web, .016, .001), 0, 0, .044), M.forged), m(at$1(rodZ(.019, -.036, .036), 0, r, 0), M.shaft));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			assembly: "engine",
			source: SRC$1.eng,
			what: "One forged crank for both cylinders: their two rods share one pin, the counterweights balance them, its front end carries the flywheel and its back end drives the pump.",
			moves: "Turns at engine speed (shown slowed 40 times).",
			drive: "The pistons, through the rods; it drives the pump",
			specs: [
				["Throw", `${fmt(r * 1e3, 1)} mm (stroke 73.4 mm)`],
				["Main journals", "Ø 35 mm [inferred]"],
				["Speed", "3,600 rpm governed"]
			]
		}, [crank], { explode: [
			0,
			-.02,
			0
		] });
		moving.crank = crank;
		for (const [side, sx] of banks) {
			const d = axis(sx);
			const fin = rrect$1(.128, .128, .012);
			fin.holes.push(ring(0, 0, ENGINE.bore / 2 + .006));
			const fins = [];
			for (let k = 0; k < 12; k++) fins.push(at$1(plate$1(fin, .0026, 6), 0, 0, .1 + k * .0072).rotateX(-Math.PI / 2));
			const finGeo = GEO.merge(fins);
			const liner = GEO.lathe([
				[ENGINE.bore / 2, .095],
				[ENGINE.bore / 2 + .0065, .095],
				[ENGINE.bore / 2 + .0065, ENGINE.deck],
				[ENGINE.bore / 2, ENGINE.deck]
			], 48);
			const barrel = new three.Group();
			barrel.add(m(onBank(finGeo, sx), M.castAl), m(onBank(liner, sx), M.castIron));
			part({
				id: `cylinder-${side}`,
				label: `Cylinder, ${side}`,
				assembly: "engine",
				source: SRC$1.eng,
				what: "One bank of the 90° V: a cast-iron liner the piston runs in, cast into square aluminium fins that the flywheel’s fan blows air over.",
				specs: [
					["Bore", "83.8 mm (3.30\")"],
					["Swept", "405 cm³"],
					["Cooling", "Air, by the flywheel fan"]
				]
			}, [barrel], {
				explode: d.clone().multiplyScalar(.1).toArray(),
				xray: "shell"
			});
			const head = new three.Group();
			const hb = at$1(box$1(.13, .05, .13, .01), 0, ENGINE.deck + .025, 0);
			const hfins = [];
			for (let k = 0; k < 4; k++) hfins.push(at$1(slab$1(.146, .0028, .146), 0, ENGINE.deck + .008 + k * .011, 0));
			head.add(m(onBank(GEO.merge([hb, ...hfins]), sx), M.castAl));
			head.add(m(onBank(at$1(box$1(.11, .032, .1, .012), 0, ENGINE.deck + .066, 0), sx), M.black));
			head.add(m(onBank(GEO.merge([-1, 1].flatMap((a) => [-1, 1].map((b) => at$1(new three.CylinderGeometry(.0055, .0055, .006, 6), a * .042, ENGINE.deck + .084, b * .036)))), sx), M.zinc));
			const plugAt = C.clone().addScaledVector(d, ENGINE.deck + .03).add(new three.Vector3(0, 0, .065 + off(sx)));
			const plug = [
				m(cyl$1(plugAt.toArray(), plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), .0095, 6), M.zinc),
				m(cyl$1(plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), plugAt.clone().add(new three.Vector3(0, 0, .036)).toArray(), .0055, 20), M.ceramic),
				m(cyl$1(plugAt.clone().add(new three.Vector3(0, 0, .03)).toArray(), plugAt.clone().add(new three.Vector3(sx * .01, 0, .065)).toArray(), .009, 20), M.satin)
			];
			plug.push(m(hose$1([
				plugAt.clone().add(new three.Vector3(sx * .01, 0, .065)).toArray(),
				[
					sx * .15,
					.36,
					.2
				],
				[
					sx * .13,
					.33,
					.215
				]
			], .0035), M.satin));
			part({
				id: `head-${side}`,
				label: `Cylinder head, ${side}`,
				assembly: "engine",
				source: SRC$1.eng,
				what: "The overhead-valve head: its inlet and exhaust valves under the rocker cover, the combustion chamber over the piston, and the spark plug in its front.",
				specs: [["Valves", "OHV, 2 per cylinder"], ["Compression", "8.4 : 1"]]
			}, [head], { explode: d.clone().multiplyScalar(.2).toArray() });
			part({
				id: `plug-${side}`,
				label: `Spark plug and lead, ${side}`,
				assembly: "engine",
				source: SRC$1.eng,
				what: "The plug in the head, its boot and the lead to its ignition coil at the flywheel: a spark each turn, fired by the flywheel’s magnet.",
				specs: [["Gap", "0.76 mm [inferred]"]]
			}, plug, { explode: [
				sx * .08,
				.1,
				.14
			] });
			const piston = new three.Group();
			const pr = ENGINE.bore / 2 - 2e-4;
			piston.add(m(GEO.lathe([
				[0, .03],
				[pr - .002, .03],
				[pr, .028],
				[pr, .022],
				[pr - .0015, .022],
				[pr - .0015, .0195],
				[pr, .0195],
				[pr, .016],
				[pr - .0015, .016],
				[pr - .0015, .0135],
				[pr, .0135],
				[pr, -.026],
				[pr - .004, -.026],
				[pr - .004, .022],
				[0, .022]
			], 48), M.piston), m(cyl$1([
				-.026,
				0,
				0
			], [
				.026,
				0,
				0
			], .0095, 20).rotateY(Math.PI / 2), M.shaft));
			const rod = new three.Group();
			const beam = new three.Shape();
			beam.moveTo(-.011, .02);
			beam.lineTo(-.007, ENGINE.rod - .012);
			beam.lineTo(.007, ENGINE.rod - .012);
			beam.lineTo(.011, .02);
			beam.lineTo(-.011, .02);
			const big = rrect$1(.05, .05, .024);
			big.holes.push(ring(0, 0, .0195));
			const small = rrect$1(.026, .026, .0125);
			small.holes.push(ring(0, 0, .0096));
			rod.add(m(GEO.merge([
				ext$1(beam, .011, 6e-4),
				ext$1(big, .014, 8e-4),
				at$1(ext$1(small, .012, 6e-4), 0, ENGINE.rod, 0)
			]), M.forged));
			const pz = new three.Group(), rz = new three.Group();
			pz.position.z = rz.position.z = CRANK.z + off(sx);
			part({
				id: `piston-${side}`,
				label: `Piston, ${side}`,
				assembly: "engine",
				source: SRC$1.eng,
				what: "An aluminium piston with two compression rings and an oil ring, on a hardened pin: the burning charge pushes it down 405 cm³ a stroke.",
				moves: "Up and down its cylinder, twice a turn of the crank for its four strokes.",
				drive: "The burning charge; it turns the crank through its rod",
				specs: [["Diameter", "83.8 mm"], ["Stroke", "73.4 mm"]]
			}, [piston], { explode: d.clone().multiplyScalar(.3).toArray() }, pz);
			part({
				id: `rod-${side}`,
				label: `Connecting rod, ${side}`,
				assembly: "engine",
				source: SRC$1.eng,
				what: "The forged rod from the piston’s pin to the crank’s pin, beside its twin on the same pin.",
				moves: "Swings and slides with the crank.",
				drive: "The piston",
				specs: [["Centres", "116 mm [inferred]"]]
			}, [rod], { explode: d.clone().multiplyScalar(.18).toArray() }, rz);
			root.add(pz, rz);
			moving[`piston-${side}`] = piston;
			moving[`rod-${side}`] = rod;
		}
		const fly = new three.Group();
		fly.position.copy(C);
		fly.add(m(latheZ$1([
			[.015, .185],
			[.1, .185],
			[.11, .19],
			[.11, .215],
			[.06, .218],
			[.03, .225],
			[.015, .225]
		], 72), M.castIron));
		const vane = slab$1(.07, .003, .03);
		const vanes = [];
		for (let k = 0; k < 18; k++) vanes.push(at$1(vane.clone(), .07, 0, 0).rotateZ(k / 18 * Math.PI * 2 + .3).translate(0, 0, .232));
		fly.add(m(GEO.merge(vanes), M.vane));
		fly.add(m(at$1(ringGear(112, .002, .011), 0, 0, .192), M.steel));
		fly.add(m(at$1(rodZ(.024, .205, .245), 0, 0, 0), M.zinc));
		const screen = new three.Shape();
		screen.absarc(0, 0, .1, 0, Math.PI * 2, false);
		for (let k = 0; k < 24; k++) {
			const a = k / 24 * Math.PI * 2;
			screen.holes.push(ring(.065 * Math.cos(a), .065 * Math.sin(a), .012));
			if (k % 2 === 0) screen.holes.push(ring(.035 * Math.cos(a + .13), .035 * Math.sin(a + .13), .009));
		}
		const scr = m(at$1(plate$1(screen, .0025, 10), 0, 0, .25), M.satin);
		part({
			id: "flywheel",
			label: "Flywheel, fan and ring gear",
			assembly: "engine",
			source: SRC$1.eng,
			what: "Cast iron at the crank’s front: its weight smooths the twin’s firing, its magnets fire the plugs and charge the battery, its vanes are the cooling fan, and its ring gear takes the starter.",
			moves: "Turns with the crankshaft (shown slowed 40 times).",
			drive: "The crankshaft",
			specs: [
				["Diameter", "230 mm"],
				["Ring gear", "112 teeth [inferred]"],
				["Inertia", "~0.05 kg·m² [inferred]"]
			]
		}, [fly], { explode: [
			0,
			0,
			.24
		] });
		part({
			id: "screen",
			label: "Rotating screen",
			assembly: "engine",
			source: SRC$1.eng,
			what: "The perforated disc on the flywheel’s face: it turns with it and flings off grass and chaff before the fan draws its air in.",
			moves: "Turns with the flywheel.",
			drive: "The crankshaft"
		}, [scr], { explode: [
			0,
			0,
			.36
		] }, fly);
		moving.fly = fly;
		const face = rrect$1(.47, .4, .07);
		face.holes.push(ring(0, -.06, .112));
		const shroud = [m(at$1(ext$1(face, .003, .001), 0, CRANK.y + .06, .262), M.black)];
		shroud.push(m(at$1(new three.TorusGeometry(.115, .005, 10, 72), 0, CRANK.y, .264), M.black));
		for (const y of [.17, .2]) shroud.push(m(cyl$1([
			-.17,
			CRANK.y + y,
			.2635
		], [
			.17,
			CRANK.y + y,
			.2635
		], .004, 12), M.black));
		shroud.push(m(GEO.merge([-1, 1].flatMap((sx) => [-.11, .21].map((y) => hex$1([
			sx * .2,
			CRANK.y + y,
			.2635
		], [
			0,
			0,
			1
		], .005, .004)))), M.zinc));
		shroud.push(m(at$1(box$1(.47, .003, .11, .001), 0, CRANK.y + .26, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at$1(box$1(.003, .36, .11, .001), sx * .235, CRANK.y + .08, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at$1(box$1(.16, .003, .15, .001), sx * .15, CRANK.y + .22, .09), M.black));
		part({
			id: "blower",
			label: "Blower housing",
			assembly: "engine",
			source: SRC$1.eng,
			what: "The pressed-steel shroud over the flywheel, ducting its fan’s air back over both cylinders’ fins.",
			specs: [["Material", "Pressed steel, painted"]]
		}, shroud, {
			explode: [
				0,
				.05,
				.34
			],
			xray: "shell"
		});
		const carb = [m(at$1(box$1(.055, .05, .06, .008), 0, .42, CRANK.z), M.castAl), m(cyl$1([
			0,
			.445,
			CRANK.z
		], [
			0,
			.47,
			CRANK.z
		], .022, 28), M.castAl)];
		for (const sx of [-1, 1]) {
			const port = C.clone().addScaledVector(axis(sx), ENGINE.deck + .02).add(new three.Vector3(-sx * .05, 0, -.03));
			carb.push(m(hose$1([
				[
					sx * .02,
					.42,
					CRANK.z - .015
				],
				[
					sx * .05,
					.42,
					CRANK.z - .03
				],
				port.toArray()
			], .012), M.castAl));
		}
		const lever = m(at$1(box$1(.004, .035, .012, .001), 0, .0175, 0), M.zinc);
		const throttle = new three.Group();
		throttle.position.set(.032, .42, CRANK.z + .02);
		throttle.add(lever);
		carb.push(throttle);
		part({
			id: "carburettor",
			label: "Carburettor and intake",
			assembly: "engine",
			source: SRC$1.eng,
			what: "In the V: the carburettor mixes petrol into the air the cleaner gives it, its throttle opened by the governor, and the manifold carries the charge to both heads.",
			moves: "Its throttle plate opens and closes with the governor.",
			drive: "The governor",
			specs: [["Throttle", "Butterfly, governed"], ["Choke", "Cable, from the panel"]]
		}, carb, { explode: [
			0,
			.16,
			.1
		] });
		moving.throttle = throttle;
		const element = GEO.lathe([
			[.05, .482],
			[.08, .482],
			[.08, .525],
			[.05, .525]
		], 72);
		const pos = element.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x);
			if (Math.hypot(x, z) > .075) {
				const k = 1 + .06 * Math.cos(a * 36);
				pos.setX(i, x * k);
				pos.setZ(i, z * k);
			}
		}
		element.computeVertexNormals();
		const cleaner = [
			m(at$1(box$1(.22, .012, .17, .004), 0, .476, CRANK.z), M.black),
			m(at$1(element, 0, 0, CRANK.z), M.paper),
			m(at$1(box$1(.23, .03, .18, .012), 0, .538, CRANK.z), M.plastic),
			m(cyl$1([
				0,
				.553,
				CRANK.z
			], [
				0,
				.562,
				CRANK.z
			], .015, 6), M.yellow)
		];
		part({
			id: "air-cleaner",
			label: "Air cleaner",
			assembly: "engine",
			source: SRC$1.eng,
			what: "Over the V: a pleated paper element in a plastic cover. Every litre of air the engine breathes, about 45 litres a second at full speed, is cleaned here first.",
			specs: [["Element", "Pleated paper, foam pre-cleaner"], ["Air", `~${fmt(ENGINE.Vd * 3600 / 120 * 1e3 * .85)} L/s at 3,600 rpm [computed: 85 % filling]`]]
		}, cleaner, {
			explode: [
				0,
				.28,
				0
			],
			xray: "shell"
		});
		const muff = [m(cyl$1([
			-.255,
			.3,
			-.095
		], [
			-.255,
			.3,
			.085
		], .05, 40), M.muffler)];
		for (const z of [-.095, .085]) muff.push(m(cyl$1([
			-.255,
			.3,
			z
		], [
			-.255,
			.3,
			z + (z < 0 ? -.004 : .004)
		], .052, 40), M.muffler));
		muff.push(m(cyl$1([
			-.255,
			.3,
			.089
		], [
			-.255,
			.3,
			.12
		], .012, 20), M.muffler));
		const exL = C.clone().addScaledVector(axis(-1), ENGINE.deck + .02).add(new three.Vector3(-.02, 0, -.06));
		const exR = C.clone().addScaledVector(axis(1), ENGINE.deck + .02).add(new three.Vector3(.02, 0, -.06));
		muff.push(m(hose$1([
			exL.toArray(),
			[
				-.23,
				.36,
				-.05
			],
			[
				-.255,
				.33,
				-.06
			]
		], .0115), M.muffler));
		muff.push(m(hose$1([
			exR.toArray(),
			[
				.1,
				.4,
				-.075
			],
			[
				-.1,
				.4,
				-.085
			],
			[
				-.22,
				.34,
				-.08
			],
			[
				-.255,
				.32,
				-.07
			]
		], .0115), M.muffler));
		part({
			id: "muffler",
			label: "Muffler and exhaust",
			assembly: "engine",
			source: SRC$1.vii,
			what: "Both exhausts into one can on the cube’s left side, the right one crossing behind the cylinders; it blows out forward, away from the couplers.",
			specs: [["Pipes", "Ø 23 mm [inferred]"], ["Can", "Ø 100 × 180 mm [inferred]"]]
		}, muff, {
			explode: [
				-.18,
				.04,
				0
			],
			xray: "shell"
		});
		part({
			id: "starter",
			label: "Electric starter",
			assembly: "engine",
			source: SRC$1.vii,
			what: "The 12 V starter whose pinion meshes with the flywheel’s ring gear while the key is held to START.",
			moves: "Spins only while starting.",
			drive: "The battery, through its solenoid",
			specs: [["Voltage", "12 V"], ["Power", "~0.9 kW [inferred]"]]
		}, [
			m(cyl$1([
				-.155,
				.17,
				.06
			], [
				-.155,
				.17,
				.17
			], .036, 32), M.black),
			m(cyl$1([
				-.155,
				.17,
				.17
			], [
				-.155,
				.17,
				.19
			], .024, 28), M.castAl),
			m(cyl$1([
				-.108,
				.186,
				.2
			], [
				-.108,
				.186,
				.226
			], .013, 10), M.steel),
			m(cyl$1([
				-.155,
				.218,
				.08
			], [
				-.155,
				.218,
				.15
			], .018, 24), M.zinc)
		], { explode: [
			-.16,
			0,
			.06
		] });
		part({
			id: "oil-filter",
			label: "Oil filter and dipstick",
			assembly: "engine",
			source: SRC$1.eng,
			what: "The engine’s full-pressure lubrication: a spin-on filter low on its right side, and the dipstick tube to fill and check the oil.",
			specs: [["Filter", "Spin-on, Ø 76 mm [inferred]"]]
		}, [
			m(cyl$1([
				.125,
				.165,
				-.05
			], [
				.205,
				.165,
				-.05
			], .038, 32), M.capBlue),
			m(hose$1([
				[
					.1,
					.25,
					.12
				],
				[
					.13,
					.33,
					.13
				],
				[
					.13,
					.4,
					.13
				]
			], .007), M.black),
			m(cyl$1([
				.13,
				.4,
				.13
			], [
				.13,
				.425,
				.13
			], .012, 16), M.yellow)
		], { explode: [
			.16,
			0,
			0
		] });
		const ign = [];
		for (const sx of [-1, 1]) ign.push(m(at$1(box$1(.04, .05, .03, .005), sx * .13, CRANK.y + .12, .2), M.satin));
		part({
			id: "ignition",
			label: "Ignition coils",
			assembly: "engine",
			count: 2,
			source: SRC$1.eng,
			what: "One coil beside the flywheel’s rim for each plug: its magnet sweeping past them makes the spark, no battery needed.",
			specs: [["Type", "Magneto armature"]]
		}, ign, { explode: [
			0,
			.12,
			.12
		] });
		const gov = [m(cyl$1([
			.03,
			.36,
			-.02
		], [
			.03,
			.42,
			.04
		], .0025, 8), M.zinc), m(at$1(box$1(.012, .05, .006, .001), .03, .34, -.03), M.zinc)];
		part({
			id: "governor",
			label: "Governor and linkage",
			assembly: "engine",
			source: SRC$1.eng,
			what: "Flyweights inside the crankcase push a lever out as the speed rises; its rod closes the throttle, so the engine holds its set speed whatever the pump asks, drooping a little under load.",
			moves: "Opens and closes the throttle.",
			drive: "Flyweights on the camshaft gear",
			specs: [["Droop", "~5 % [inferred]"], ["Set speed", "From the panel’s throttle"]]
		}, gov, { explode: [
			.06,
			.14,
			0
		] });
	}
	{
		const cpl = new three.Group();
		cpl.position.copy(C);
		cpl.add(m(latheZ$1([
			[0, -.245],
			[.034, -.245],
			[.034, -.206],
			[.036, -.204],
			[.036, -.2],
			[.034, -.198],
			[.034, -.158],
			[0, -.158]
		], 48), M.steel));
		cpl.add(m(GEO.merge([-.228, -.175].map((z) => at$1(cyl$1([
			0,
			.032,
			0
		], [
			0,
			.04,
			0
		], .005, 6), 0, 0, z))), M.satin));
		part({
			id: "coupling",
			label: "Shaft coupling",
			assembly: "hydraulics",
			source: SRC$1.port,
			what: "Not a bought jaw coupling: OSE cut two coupling halves and welded them into one sleeve, keyed and set-screwed onto the engine’s shaft, splined onto the pump’s.",
			moves: "Turns with the engine (shown slowed).",
			drive: "The crankshaft; it drives the pump",
			specs: [
				["Engine side", "1\" keyed, set screws"],
				["Pump side", "3/4\" spline, 11 teeth [inferred]"],
				["Made", "Two halves cut and welded"]
			]
		}, [cpl], { explode: [
			0,
			0,
			-.1
		] });
		moving.cpl = cpl;
		const brk = rrect$1(.2, .2, .01);
		brk.holes.push(ring(0, 0, .042));
		part({
			id: "pump-bracket",
			label: "Pump bracket",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "An upright plate on the engine plate holding the pump’s SAE-A flange square to the engine, so the two shafts stay on one line.",
			specs: [["Plate", "1/2\" (12.7 mm)"], ["Flange", "SAE A: Ø 82.55 mm pilot, 2 bolts on 106.4 mm"]]
		}, [
			m(at$1(ext$1(brk, .0127, .001), 0, CRANK.y, -.2235), M.zinc),
			m(at$1(box$1(.2, .0127, .06, .002), 0, B + .0127 + .0064, -.2), M.zinc),
			m(GEO.merge([-1, 1].map((sx) => at$1(box$1(.0095, .09, .05, .001), sx * .08, B + .0127 + .045, -.2))), M.zinc)
		], { explode: [
			0,
			0,
			-.18
		] });
		const pump = new three.Group();
		pump.position.set(0, CRANK.y, 0);
		const flange = new three.Shape();
		flange.moveTo(-.0532, .012);
		flange.absarc(-.0532, 0, .012, Math.PI / 2, Math.PI * 1.5, false);
		flange.lineTo(-.02, -.04);
		flange.lineTo(.02, -.04);
		flange.lineTo(.0532, -.012);
		flange.absarc(.0532, 0, .012, -Math.PI / 2, Math.PI / 2, false);
		flange.lineTo(.02, .07);
		flange.lineTo(-.02, .07);
		flange.lineTo(-.0532, .012);
		flange.holes.push(ring(-.0532, 0, .0055), ring(.0532, 0, .0055), ring(0, 0, .012));
		const z0 = PUMP.z0, bw = PUMP.width;
		const tip = PUMP.teeth * PUMP.module / 2 + PUMP.module + 2e-4, cd = PUMP.teeth * PUMP.module;
		const eight = new three.Path();
		const yi = cd / 2, xi = Math.sqrt(tip * tip - yi * yi);
		eight.moveTo(xi, yi);
		eight.absarc(0, cd, tip, Math.atan2(yi - cd, xi), Math.atan2(yi - cd, -xi) + Math.PI * 2, false);
		eight.absarc(0, 0, tip, Math.atan2(yi, -xi), Math.atan2(yi, xi) + Math.PI * 2, false);
		const bodyShift = new three.Shape(rrect$1(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2)));
		bodyShift.holes.push(eight);
		pump.add(m(at$1(ext$1(flange, .01, 8e-4), 0, 0, z0 - .003), M.pumpAl));
		const bodyM = m(at$1(ext$1(bodyShift, bw, 6e-4), 0, 0, z0 - .01 - bw / 2), M.pumpAl);
		const cover = m(at$1(ext$1(new three.Shape(rrect$1(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2))), .016, .0015), 0, 0, z0 - .01 - bw - .008), M.pumpAl);
		const tb = GEO.merge([-1, 1].flatMap((sx) => [-1, 1].map((sy) => hex$1([
			sx * .034,
			cd / 2 + sy * .045,
			z0 - .01 - bw - .016
		], [
			0,
			0,
			-1
		], .0065, .008))));
		const ports = [m(cyl$1([
			-.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			-.066,
			cd / 2,
			z0 - .01 - bw / 2
		], .019, 6), M.zinc), m(cyl$1([
			.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			.06,
			cd / 2,
			z0 - .01 - bw / 2
		], .0135, 6), M.zinc)];
		pump.add(bodyM, cover, m(tb, M.zinc), ...ports);
		part({
			id: "pump",
			label: "Hydraulic gear pump",
			assembly: "hydraulics",
			source: SRC$1.port,
			what: "A fixed-displacement external gear pump: two gears mesh and carry oil round the outside of their teeth from the suction port to the pressure port, about a cubic inch every turn. This flow is everything the machine it is coupled to can do.",
			moves: "Its gears turn with the engine.",
			drive: "The engine, through the coupling",
			specs: [
				["Displacement", "0.976 in³ (16.0 cm³) a turn"],
				["Flow", "15.2 gpm (57.5 L/min) at 3,600 rpm, less its slip"],
				["Pressure", "3,000 psi (207 bar) max"],
				["Gears", "12 teeth, module 2.5, 34 mm wide [inferred]"]
			]
		}, [pump], {
			explode: [
				0,
				0,
				-.28
			],
			xray: "shell",
			tag: {
				text: "Gear pump",
				at: [
					.05,
					CRANK.y + .04,
					z0 - .03
				],
				value: () => `${fmt(sim.s.q * 6e4, 1)} L/min · ${fmt(sim.s.p / PSI)} psi`,
				side: "right"
			}
		});
		const gears = new three.Group();
		gears.position.set(0, CRANK.y, 0);
		const gearGeo = GEO.gear({
			teeth: PUMP.teeth,
			module: PUMP.module,
			width: bw - 4e-4,
			bore: .009
		});
		const drive = m(at$1(gearGeo.clone(), 0, 0, 0), M.gear);
		const idler = m(at$1(gearGeo.clone(), 0, 0, 0), M.gear);
		const driveG = new three.Group(), idlerG = new three.Group();
		driveG.position.set(0, 0, z0 - .01 - bw / 2);
		idlerG.position.set(0, cd, z0 - .01 - bw / 2);
		driveG.add(drive, m(rodZ(.0095, -.04, .05), M.shaft));
		idlerG.add(idler, m(rodZ(.0095, -.022, .022), M.shaft));
		gears.add(driveG, idlerG);
		part({
			id: "pump-gears",
			label: "Pump gears",
			assembly: "hydraulics",
			source: SRC$1.port,
			what: "The drive gear on the pump’s shaft and the idler it turns: oil trapped between their teeth and the housing is carried round the outside from suction to pressure, and the meshing teeth push it out.",
			moves: "Turn against each other at engine speed.",
			drive: "The pump’s shaft",
			specs: [["Teeth", "12 each [inferred]"], ["Displacement", "2π m² z b ≈ 16 cm³ a turn"]]
		}, [gears], { explode: [
			0,
			.03,
			-.42
		] });
		moving.drive = driveG;
		moving.idler = idlerG;
		const rv = {
			x0: -.297,
			x1: .297,
			y0: .335,
			y1: .555,
			z0: -.32,
			z1: -.115,
			t: .003
		};
		const rw = rv.x1 - rv.x0, rh = rv.y1 - rv.y0, rd = rv.z1 - rv.z0, rc = [
			(rv.x0 + rv.x1) / 2,
			(rv.y0 + rv.y1) / 2,
			(rv.z0 + rv.z1) / 2
		];
		const walls = [
			at$1(box$1(rw, rv.t, rd, .001), rc[0], rv.y0 + rv.t / 2, rc[2]),
			at$1(box$1(rw, rv.t, rd, .001), rc[0], rv.y1 - rv.t / 2, rc[2]),
			at$1(box$1(rv.t, rh - 2 * rv.t, rd, .001), rv.x0 + rv.t / 2, rc[1], rc[2]),
			at$1(box$1(rv.t, rh - 2 * rv.t, rd, .001), rv.x1 - rv.t / 2, rc[1], rc[2]),
			at$1(box$1(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z0 + rv.t / 2),
			at$1(box$1(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z1 - rv.t / 2)
		];
		const inner = {
			w: rw - 2 * rv.t,
			h: rh - 2 * rv.t,
			d: rd - 2 * rv.t
		};
		const litres = inner.w * inner.h * inner.d * 1e3;
		part({
			id: "reservoir",
			label: "Hydraulic reservoir",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "The oil tank over the pump, removable for cleaning: the pump draws through a strainer at its bottom, the returns come in at its top through the filter, and a baffle between them makes the oil settle and let go of its air before it is drawn again.",
			specs: [
				["Volume", `${fmt(litres, 1)} L inside (7 gal nominal)`],
				["Walls", "3 mm steel"],
				["Oil", "ISO VG 46 anti-wear"]
			]
		}, [m(GEO.merge(walls), M.tank)], {
			explode: [
				0,
				.2,
				-.22
			],
			xray: "shell",
			tag: {
				text: "Reservoir",
				at: [
					rv.x0 + .04,
					rv.y1,
					rc[2]
				],
				value: () => `oil ${fmt(sim.s.T)} °C`,
				side: "left"
			}
		});
		const level = .82;
		const oil = m(at$1(box$1(inner.w - .001, inner.h * level, inner.d - .001, .002), rc[0], rv.y0 + rv.t + inner.h * level / 2, rc[2]), M.oil);
		const baffle = m(at$1(box$1(.003, inner.h * .7, inner.d - .002, 8e-4), .02, rv.y0 + rv.t + inner.h * .35, rc[2]), M.tank);
		const strainer = [m(cyl$1([
			-.2,
			rv.y0 + .004,
			-.25
		], [
			-.2,
			rv.y0 + .05,
			-.25
		], .026, 32), M.brass), m(cyl$1([
			-.2,
			rv.y0 + .05,
			-.25
		], [
			-.2,
			rv.y0 + .056,
			-.25
		], .028, 32), M.zinc)];
		part({
			id: "oil",
			label: "Hydraulic oil",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "About 21 L of ISO VG 46 anti-wear oil at its working level: it carries the power out to the machine and back, lubricates the pump and takes away the heat of every loss.",
			specs: [
				["Grade", "ISO VG 46: 46 cSt at 40 °C"],
				["Level", "82 % of the tank"],
				["Limit", "82 °C (180 °F) [inferred]"]
			]
		}, [oil], { explode: [
			0,
			.32,
			-.22
		] });
		part({
			id: "baffle",
			label: "Baffle and suction strainer",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "A plate across the tank between the return and the suction, and a brass mesh strainer on the suction outlet at its bottom: the pump never draws air or grit.",
			specs: [["Strainer", "100 mesh (149 µm) [inferred]"]]
		}, [baffle, ...strainer], { explode: [
			0,
			.25,
			-.12
		] });
		const suctionPts = [
			[
				-.2,
				rv.y0 - .002,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.066,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			]
		];
		part({
			id: "suction-hose",
			label: "Suction hose",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "The wide soft line from the tank’s strainer down to the pump’s inlet: wide, so the pump never starves and cavitates.",
			specs: [["Hose", "1\" suction (SAE 100R4)"], ["Speed", "< 1.2 m/s in it [computed]"]]
		}, [m(hose$1(suctionPts, .0175), M.hose)], { explode: [
			-.12,
			.05,
			-.2
		] });
		const relief = new three.Group();
		relief.add(m(at$1(box$1(.05, .05, .05, .004), .13, .3, -.255), M.machinedAl), m(cyl$1([
			.155,
			.3,
			-.255
		], [
			.2,
			.3,
			-.255
		], .012, 24), M.steel), m(cyl$1([
			.2,
			.3,
			-.255
		], [
			.215,
			.3,
			-.255
		], .009, 6), M.brass), m(cyl$1([
			.18,
			.3,
			-.255
		], [
			.188,
			.3,
			-.255
		], .016, 6), M.zinc));
		relief.add(m(hose$1([[
			.13,
			.325,
			-.255
		], [
			.13,
			rv.y0 - .002,
			-.255
		]], .008), M.hose));
		part({
			id: "relief",
			label: "Relief valve",
			assembly: "hydraulics",
			source: SRC$1.v156,
			what: "Added in October 2014: a spring-loaded poppet that opens back to the tank when the pressure reaches its setting, so nothing bursts when a cylinder bottoms out or a wheel stalls. All the power it dumps becomes heat in the oil.",
			moves: "Its poppet lifts only at its setting.",
			specs: [
				["Setting", "3,000 psi (207 bar)"],
				["Override", "+160 psi at full flow [inferred]"],
				["Added", "October 2014 (v15.6)"]
			]
		}, [relief], {
			explode: [
				.16,
				-.02,
				-.12
			],
			tag: {
				text: "Relief valve",
				at: [
					.2,
					.3,
					-.255
				],
				value: () => sim.s.qRelief > 1e-6 ? `dumping ${fmt(sim.s.qRelief * 6e4, 1)} L/min` : sim.s.stuck ? "stuck shut" : "closed",
				side: "right"
			}
		});
		const pressPts = [
			[
				.06,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.105,
				.3,
				-.255
			]
		];
		part({
			id: "pressure-hose",
			label: "Pressure hoses",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "Two-wire braided hoses from the pump to the relief valve and on to the pressure coupler, every power stroke of the machine’s cylinders coming through them.",
			specs: [
				["Hose", "1/2\" SAE 100R2"],
				["Working pressure", "4,000 psi"],
				["Burst", "16,000 psi"]
			]
		}, [m(hose$1(pressPts, .0125), M.hose), m(hose$1([
			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.322
			]
		], .0125), M.hose)], { explode: [
			.14,
			-.04,
			-.2
		] });
		const gauge = new three.Group();
		const ga = [
			.17,
			.48,
			-.336
		];
		gauge.position.set(...ga);
		gauge.rotation.y = Math.PI;
		gauge.add(m(latheZ$1([
			[0, 0],
			[.05, 0],
			[.05, .028],
			[.046, .032],
			[0, .032]
		], 48), M.steel), m(latheZ$1([
			[0, .0275],
			[.045, .0275],
			[.045, .029],
			[0, .029]
		], 48), M.dial), m(latheZ$1([
			[0, .031],
			[.046, .031],
			[.046, .033],
			[0, .033]
		], 48), M.glass));
		const ticks = [];
		for (let k = 0; k <= 10; k++) {
			const a = three.MathUtils.degToRad(225 - k * 27);
			ticks.push(at$1(box$1(.0012, k % 5 === 0 ? .009 : .005, 4e-4, 2e-4), 0, .037, 0).rotateZ(a - Math.PI / 2).translate(0, 0, .0296));
		}
		gauge.add(m(GEO.merge(ticks), M.satin));
		const needle = new three.Group();
		needle.position.z = .0302;
		needle.add(m(at$1(box$1(.002, .036, 8e-4, 3e-4), 0, .014, 0), M.needle), m(rodZ(.003, -6e-4, 6e-4), M.satin));
		gauge.add(needle);
		gauge.add(m(hose$1([
			[
				0,
				0,
				-.002
			],
			[
				0,
				-.06,
				-.06
			],
			[
				.02,
				-.16,
				-.08
			],
			[
				.045,
				-.19,
				-.08
			]
		], .004), M.hose));
		part({
			id: "gauge",
			label: "Pressure gauge",
			assembly: "hydraulics",
			source: SRC$1.v156,
			what: "A liquid-filled gauge on the pressure line, added in April 2015: the operator sees at a glance how hard the cube is working.",
			moves: "Its needle swings with the pressure.",
			specs: [["Range", "0–5,000 psi"], ["Added", "April 2015 (v15.6)"]]
		}, [gauge], {
			explode: [
				0,
				.06,
				-.14
			],
			tag: {
				text: "Pressure gauge",
				at: [
					ga[0],
					ga[1] + .05,
					ga[2] - .03
				],
				value: () => `${fmt(sim.s.p / PSI)} psi · ${fmt(sim.s.p / 1e5)} bar`,
				side: "left"
			}
		});
		moving.needle = needle;
		const cp = [];
		for (const [x, capM] of [[.23, M.capRed], [.29, M.capBlue]]) {
			cp.push(m(latheZ$1([
				[0, -.3],
				[.014, -.3],
				[.014, -.322],
				[.018, -.326],
				[.018, -.36],
				[.016, -.364],
				[0, -.364]
			], 40).translate(x, .2516, 0), M.brass));
			cp.push(m(cyl$1([
				x,
				.2516,
				-.364
			], [
				x,
				.2516,
				-.384
			], .019, 32), capM));
		}
		cp.push(m(at$1(box$1(.15, .045, .006, .002), .26, .2516, -.326), M.zinc));
		part({
			id: "couplers",
			label: "Quick couplers",
			assembly: "hydraulics",
			count: 2,
			source: SRC$1.man,
			what: "The cube’s whole connection to a machine: the pressure coupler (red cap) and the return coupler (blue) on its back. Push the machine’s hoses on and the cube drives it; pull them off and it is free for the next one.",
			specs: [["Size", "1/2\" ISO 7241-A [inferred]"], ["Rated", "3,000 psi"]]
		}, cp, {
			explode: [
				.06,
				0,
				-.22
			],
			tag: {
				text: "Couplers P · T",
				at: [
					.26,
					.2516,
					-.38
				],
				value: () => `${fmt(sim.s.qLoad * 6e4, 1)} L/min to the work`,
				side: "right"
			}
		});
		part({
			id: "return-hose",
			label: "Return hoses",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "From the return coupler through the cooler and the filter back into the tank: everything the machine sends back.",
			specs: [["Hose", "3/4\" SAE 100R1 [inferred]"]]
		}, [m(hose$1([
			[
				.29,
				.2516,
				-.3
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			]
		], .013), M.hose), m(hose$1([
			[
				.318,
				.312,
				.032
			],
			[
				.318,
				.42,
				0
			],
			[
				.318,
				.53,
				-.08
			],
			[
				.31,
				.585,
				-.16
			],
			[
				.22,
				.585,
				-.21
			],
			[
				.185,
				.572,
				-.22
			]
		], .013), M.hose)], { explode: [
			.16,
			.06,
			-.06
		] });
		const co = [];
		const tubes = [];
		for (let k = 0; k < 6; k++) tubes.push(cyl$1([
			.318,
			.152 + k * .032,
			-.272
		], [
			.318,
			.152 + k * .032,
			.032
		], .0065, 16));
		co.push(m(GEO.merge(tubes), M.copper));
		const fins = [];
		for (let z = -.262; z < .026; z += .006) fins.push(at$1(slab$1(.026, .188, 5e-4), .318, .232, z));
		co.push(m(GEO.merge(fins), M.finAl));
		for (const z of [-.272, .032]) co.push(m(cyl$1([
			.318,
			.14,
			z
		], [
			.318,
			.324,
			z
		], .013, 24), M.machinedAl));
		const guard = rrect$1(.31, .2, .012);
		guard.holes.push(rrect$1(.29, .18, .006));
		const bars = [plate$1(guard, .004, 4)];
		for (let k = 1; k < 6; k++) bars.push(at$1(slab$1(.004, .18, .004), -.145 + k * .0483, 0, 0));
		co.push(m(GEO.merge(bars).rotateY(Math.PI / 2).translate(.334, .232, -.12), M.satin));
		part({
			id: "cooler",
			label: "Oil cooler (six tubes)",
			assembly: "hydraulics",
			source: SRC$1.v156,
			what: "The 7s cooler on the cube’s right side: the returning oil runs through six finned tubes before the filter, giving the heat of every loss to the air its fan pulls through.",
			specs: [
				["Type", "6-tube, finned, fan-cooled"],
				["Rejects", "~150 W per °C over the air [inferred]"],
				["Added", "7s"]
			]
		}, co, {
			explode: [
				.2,
				0,
				0
			],
			tag: {
				text: "Oil cooler",
				at: [
					.33,
					.33,
					-.12
				],
				value: () => `${fmt(150 * (sim.s.T - 20) / 1e3, 1)} kW to the air`,
				side: "right"
			}
		});
		const fan = new three.Group();
		fan.position.set(.29, .232, -.12);
		const blade = new three.Group();
		blade.add(m(GEO.rotor({
			count: 5,
			axis: "x",
			r0: .018,
			r1: .075,
			chord: [.04, .05],
			thick: .06,
			camber: .05,
			twist: .4,
			pitch: .5,
			nS: 6,
			nC: 8
		}), M.satin), m(latheX$1([
			[0, 0],
			[.02, 0],
			[.02, .018],
			[0, .022]
		], 24), M.satin));
		fan.add(blade);
		fan.add(m(cyl$1([
			-.035,
			0,
			0
		], [
			-.005,
			0,
			0
		], .025, 28), M.black));
		const shroudRing = new three.Shape();
		shroudRing.absarc(0, 0, .088, 0, Math.PI * 2, false);
		shroudRing.holes.push(ring(0, 0, .081));
		fan.add(m(ext$1(shroudRing, .03, 8e-4).rotateY(Math.PI / 2).translate(.012, 0, 0), M.satin));
		part({
			id: "cooler-fan",
			label: "Cooler fan",
			assembly: "hydraulics",
			source: SRC$1.v156,
			what: "The 12 V fan pulling air through the cooler’s fins into the cube.",
			moves: "Turns while the engine runs.",
			drive: "12 V from the battery",
			specs: [["Voltage", "12 V"], ["Diameter", "160 mm [inferred]"]]
		}, [fan], { explode: [
			.06,
			0,
			.04
		] });
		moving.fan = blade;
		part({
			id: "filter",
			label: "Return filter",
			assembly: "hydraulics",
			source: SRC$1.man,
			what: "A spin-on filter on the tank’s top where the return enters it: everything that comes back from the machine passes through it.",
			specs: [["Flow", "20 gpm (v4 BOM)"], ["Element", "10 µm [inferred]"]]
		}, [
			m(at$1(box$1(.07, .022, .07, .006), .15, rv.y1 + .011, -.22), M.machinedAl),
			m(cyl$1([
				.15,
				rv.y1 + .022,
				-.22
			], [
				.15,
				rv.y1 + .094,
				-.22
			], .046, 40), M.capRed),
			m(cyl$1([
				.15,
				rv.y1 + .094,
				-.22
			], [
				.15,
				rv.y1 + .098,
				-.22
			], .042, 40), M.capRed)
		], { explode: [
			0,
			.22,
			-.1
		] });
		part({
			id: "breather",
			label: "Filler and breather cap",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "Where the tank is filled, and how it breathes as the machine’s cylinders draw oil out and give it back.",
			specs: [["Filter", "10 µm air breather [inferred]"]]
		}, [m(cyl$1([
			-.06,
			rv.y1,
			-.22
		], [
			-.06,
			rv.y1 + .02,
			-.22
		], .02, 24), M.zinc), m(cyl$1([
			-.06,
			rv.y1 + .02,
			-.22
		], [
			-.06,
			rv.y1 + .05,
			-.22
		], .035, 36), M.plastic)], { explode: [
			0,
			.2,
			-.06
		] });
		part({
			id: "sight-gauge",
			label: "Sight gauge",
			assembly: "hydraulics",
			source: SRC$1.vii,
			what: "A window on the tank’s back above the strainer: the oil’s level and colour at a glance.",
			specs: [["Length", "127 mm [inferred]"]]
		}, [
			m(at$1(box$1(.026, .13, .008, .003), -.2, .445, rv.z0 - .004), M.zinc),
			m(at$1(box$1(.012, .11, .006, .002), -.2, .445, rv.z0 - .008), M.glass),
			m(at$1(box$1(.01, .11 * level, .004, .001), -.2, .4351, rv.z0 - .008), M.oil)
		], { explode: [
			0,
			.04,
			-.16
		] });
	}
	{
		const ft = {
			w: .56,
			h: .1,
			d: .44,
			y: .567,
			z: .08
		};
		const shell = box$1(ft.w, ft.h, ft.d, .02);
		const fuel = m(at$1(box$1(ft.w - .01, ft.h * .7, ft.d - .01, .012), 0, ft.y + .005 + ft.h * .35, ft.z), M.fuel);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "controls",
			source: SRC$1.vii,
			what: "The removable petrol tank on top of the cube, over the engine: lift it off to fill it away from the machine. Moulded of natural polyethylene, so the petrol’s level shows through its wall.",
			specs: [
				["Material", "HDPE, natural [inferred]"],
				["Volume", `${fmt(ft.w * ft.h * ft.d * 1e3 * .95, 1)} L (7 gal nominal)`],
				["Fuel", "Petrol (gasoline)"],
				["Removable", "Yes"]
			]
		}, [
			m(at$1(shell, 0, ft.y + ft.h / 2, ft.z), M.hdpe),
			m(GEO.merge([
				-.12,
				0,
				.12
			].map((x) => at$1(box$1(.012, .006, ft.d - .06, .003), x, ft.y + ft.h + .002, ft.z))), M.hdpe),
			m(cyl$1([
				.18,
				ft.y + ft.h,
				.24
			], [
				.18,
				ft.y + ft.h + .016,
				.24
			], .024, 28), M.capRed)
		], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell",
			tag: {
				text: "Fuel tank",
				at: [
					-.2,
					ft.y + ft.h,
					.2
				],
				value: () => sim.s.fuel > 0 ? `${fmt(sim.s.fuel, 1)} L/h · ${fmt(ft.w * ft.h * ft.d * 1e3 * .7 / sim.s.fuel, 1)} h left` : "stopped",
				side: "left"
			}
		});
		part({
			id: "fuel",
			label: "Petrol",
			assembly: "controls",
			source: SRC$1.vii,
			what: "The fuel at 70 % of the tank: what the engine burns, about 0.37 kg for every kWh it makes at full load.",
			specs: [["Burns", "0.37 kg/kWh at full load [inferred]"]]
		}, [fuel], { explode: [
			0,
			.4,
			0
		] });
		part({
			id: "fuel-line",
			label: "Fuel line and shut-off",
			assembly: "controls",
			source: SRC$1.vii,
			what: "From the tank’s outlet down the front through a shut-off valve and an inline filter to the carburettor.",
			specs: [["Line", "1/4\" fuel hose"]]
		}, [
			m(hose$1([
				[
					-.22,
					ft.y,
					.27
				],
				[
					-.22,
					.5,
					.27
				],
				[
					-.17,
					.45,
					.2
				],
				[
					-.06,
					.43,
					.08
				],
				[
					-.028,
					.42,
					CRANK.z + .02
				]
			], .004), M.black),
			m(at$1(box$1(.016, .02, .02, .003), -.22, .54, .27), M.brass),
			m(cyl$1([
				-.19,
				.468,
				.235
			], [
				-.17,
				.452,
				.21
			], .009, 16), M.glass)
		], { explode: [
			-.1,
			.12,
			.12
		] });
		const bt = {
			x: .231,
			y: B + .0127,
			z: .19,
			w: .132,
			h: .186,
			d: .197
		};
		part({
			id: "battery",
			label: "12 V battery",
			assembly: "controls",
			source: SRC$1.vii,
			what: "The cube’s own 12 V battery in the front corner: it cranks the starter, runs the cooler fan and the machine’s valves; the flywheel alternator charges it.",
			specs: [["Size", "Group U1, 197 × 132 × 186 mm"], ["Capacity", "~32 Ah, 300 CCA [inferred]"]]
		}, [
			m(at$1(box$1(bt.w, bt.h, bt.d, .006), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(cyl$1([
				bt.x - .035,
				bt.y + bt.h,
				bt.z + .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z + .07
			], .008, 16), M.lead),
			m(cyl$1([
				bt.x - .035,
				bt.y + bt.h,
				bt.z - .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z - .07
			], .008, 16), M.lead),
			m(at$1(box$1(.15, .004, .025, .001), bt.x, bt.y + bt.h + .002, bt.z), M.zinc)
		], { explode: [
			.2,
			0,
			.16
		] });
		part({
			id: "cables",
			label: "Battery cables",
			assembly: "controls",
			source: SRC$1.vii,
			what: "The red cable from the battery across the front to the starter’s solenoid, the black to the frame.",
			specs: [["Gauge", "6 AWG [inferred]"]]
		}, [m(hose$1([
			[
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z + .07
			],
			[
				.15,
				.33,
				.3
			],
			[
				-.05,
				.13,
				.3
			],
			[
				-.105,
				.2,
				.15
			]
		], .0055), M.capRed), m(hose$1([
			[
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z - .07
			],
			[
				.29,
				.33,
				.1
			],
			[
				.3,
				B + .02,
				.1
			]
		], .0055), M.satin)], { explode: [
			.14,
			.06,
			.18
		] });
		const panel = new three.Group();
		panel.add(m(at$1(box$1(.11, .17, .004, .003), .275, .5, Z + .003), M.satin));
		panel.add(m(cyl$1([
			.25,
			.54,
			Z + .005
		], [
			.25,
			.54,
			Z + .02
		], .014, 24), M.steel), m(at$1(box$1(.004, .022, .004, .001), .25, .54, Z + .024), M.brass));
		panel.add(m(cyl$1([
			.3,
			.54,
			Z + .005
		], [
			.3,
			.54,
			Z + .03
		], .0035, 12), M.zinc), m(cyl$1([
			.3,
			.54,
			Z + .03
		], [
			.3,
			.54,
			Z + .04
		], .009, 20), M.yellow));
		panel.add(m(at$1(box$1(.05, .02, .01, .002), .275, .46, Z + .008), M.satin), m(at$1(box$1(.035, .012, .002, .001), .275, .46, Z + .0135), M.glass));
		const tl = new three.Group();
		tl.position.set(.275, .43, Z + .006);
		tl.add(m(at$1(box$1(.006, .04, .006, .001), 0, .02, .004), M.green), m(at$1(box$1(.016, .01, .012, .002), 0, .04, .006), M.green));
		panel.add(tl);
		part({
			id: "panel",
			label: "Control panel",
			assembly: "controls",
			source: SRC$1.vii,
			what: "On the front corner post: the key switch (off, run, start), the choke knob, the throttle lever that sets the governor’s speed, and an hour meter. The cube is started here and left running; the machine’s valves do the rest.",
			moves: "Key, choke and throttle are worked by hand.",
			specs: [
				["Key", "Off / run / start"],
				["Choke", "Pull knob"],
				["Throttle", "Lever: 1,750 to 3,600 rpm"]
			]
		}, [panel], { explode: [
			.14,
			.06,
			.14
		] });
		moving.lever = tl;
	}
	const ctl = {
		speed: {
			label: "Engine speed (governor)",
			min: 1800,
			max: 3600,
			value: speed,
			step: 50,
			unit: "rpm",
			ends: ["Low", "Rated 3,600"]
		},
		load: {
			label: "Load pressure (the work)",
			min: 0,
			max: 2900,
			value: load,
			step: 10,
			unit: "psi",
			ends: ["Free flow", "Near relief"]
		}
	};
	const sim = solver(ctl);
	const cd = PUMP.teeth * PUMP.module, pz = PUMP.z0 - .01 - PUMP.width / 2;
	const flowPaths = [
		[
			[
				-.2,
				.36,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				-.2,
				.36,
				-.248
			],
			[
				-.2,
				.3,
				-.248
			],
			[
				-.15,
				.27,
				-.252
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.256
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y - .012,
				pz
			],
			[
				.02,
				CRANK.y - .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.13,
				.3,
				-.255
			],
			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.36
			]
		],
		[
			[
				.29,
				.2516,
				-.36
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			],
			[
				.318,
				.152,
				.03
			],
			[
				.318,
				.216,
				.03
			],
			[
				.318,
				.216,
				-.27
			],
			[
				.318,
				.28,
				-.27
			],
			[
				.318,
				.28,
				.03
			],
			[
				.318,
				.42,
				0
			],
			[
				.318,
				.53,
				-.08
			],
			[
				.31,
				.585,
				-.16
			],
			[
				.22,
				.585,
				-.21
			],
			[
				.15,
				.57,
				-.22
			],
			[
				.15,
				.5,
				-.22
			],
			[
				.12,
				.42,
				-.2
			]
		],
		[
			[
				.13,
				.3,
				-.255
			],
			[
				.13,
				.33,
				-.255
			],
			[
				.13,
				.36,
				-.255
			],
			[
				.1,
				.42,
				-.24
			]
		]
	];
	const flow = new Flow({ theme: "paper" }, {
		parent: root,
		paths: flowPaths,
		count: 420,
		length: .05,
		seed: 7,
		perPath: [
			1,
			1,
			1,
			1,
			0
		],
		color: () => tCol(sim.s.T)
	});
	/** the oil's colour by its temperature: cool blue to hot amber @param {number} T */
	const tCol = (T) => {
		const k = clamp((T - 30) / 60);
		return [
			lerp(.2, 1, k),
			lerp(.45, .5, k),
			lerp(.95, .1, k)
		];
	};
	const turnPin = new three.Vector3();
	kit.onTick((dt, env) => {
		sim.step(dt, env);
		const s = sim.s, a = s.ang;
		moving.crank.rotation.z = moving.fly.rotation.z = moving.cpl.rotation.z = -a;
		moving.drive.rotation.z = -a;
		moving.idler.rotation.z = a + Math.PI / PUMP.teeth;
		turnPin.set(r * Math.sin(a), r * Math.cos(a), 0);
		for (const [side, sx] of banks) {
			const d = axis(sx), phi = sx * ENGINE.bank;
			const along = r * Math.cos(a - phi), across = r * Math.sin(a - phi);
			const sPin = along + Math.sqrt(ENGINE.rod ** 2 - across ** 2);
			const pin = d.clone().multiplyScalar(sPin);
			const pis = moving[`piston-${side}`], rod = moving[`rod-${side}`];
			pis.position.set(C.x + pin.x, C.y + pin.y, 0);
			pis.rotation.z = -phi;
			rod.position.set(C.x + turnPin.x, C.y + turnPin.y, 0);
			rod.rotation.z = -Math.atan2(pin.x - turnPin.x, pin.y - turnPin.y);
		}
		moving.fan.rotation.x += (s.stalled ? 0 : 2800 / 60 / 12) * 2 * Math.PI * dt;
		moving.needle.rotation.z = three.MathUtils.degToRad(135 - clamp(s.p / PSI / 5e3) * 270);
		moving.throttle.rotation.z = -s.theta * 1.2;
		moving.lever.rotation.z = -.5 + (ctl.speed.value - 1800) / 1800 * 1;
		flow.speed = .5 * s.q / (57.5 / 6e4);
		flow.o.perPath[2] = s.q > 0 ? clamp((s.qLoad + s.qRelief) / s.q) : 0;
		flow.o.perPath[3] = s.q > 0 ? clamp(s.qLoad / s.q) : 0;
		flow.o.perPath[4] = s.q > 0 ? clamp(s.qRelief / s.q) * 2 : 0;
		flow.opacity = s.stalled ? 0 : clamp(.3 + s.q / (57.5 / 6e4)) * Math.max(env.cut, env.xray);
		flow.update(dt);
		const hero = lab.read;
		hero.value = s.hyd / 1e3;
		hero.bad = s.stalled || s.T > 82 || s.p > 3100 * PSI;
		hero.state = s.stalled ? env.broken ? "stalled: dead-headed, relief stuck" : "stalled: more torque than the engine has" : env.broken ? "dead-headed, relief stuck: the pressure climbing" : s.valves < 1 ? "starting, valves in neutral" : s.qRelief > 1e-6 ? "over relief" : s.T > 82 ? "oil too hot" : s.theta > .98 && sim.rpm() < s.set * .96 ? "lugging down: full throttle, the speed sagging" : "running";
		hero.sub = s.stalled ? `the pump needed ${fmt(lastTp)} N·m at ${fmt(lastP / PSI)} psi, the engine gives at most ${fmt(best(ctl.speed.value))} at this setting · ${env.broken ? "take the break back" : "move a slider"} to restart` : `${fmt(s.q * 6e4, 1)} L/min (${fmt(s.q * 15850.3, 1)} gpm) · ${fmt(s.p / PSI)} psi · ${fmt(sim.rpm())} rpm · oil ${fmt(s.T)} °C · ${fmt(s.fuel, 1)} L/h`;
		if (!s.stalled) {
			lastP = s.p;
			lastTp = s.Tp;
		}
	});
	let lastP = 0, lastTp = 0;
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Hydraulic power",
			unit: "kW",
			max: 20,
			digits: 1
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "The engine turns the gear pump on one shaft. Each turn the pump carries 16 cm³ of oil round its gears, less what slips back through its clearances (more as the pressure rises and the oil warms). The pressure is what the work needs plus the hoses’ loss, capped by the relief valve, which dumps the rest to the tank as heat. The pump’s torque grows with the pressure; the engine’s governor opens the throttle to hold its speed, and past what the engine can give the speed sags (lugging) or the engine stalls. The oil heats with every loss and the cooler gives the heat to the air (heat shown 20 times faster). Engine shown slowed 40 times.",
			eqs: [
				"Q = D n − k p (ν50/ν)      D = 16.0 cm³, slip 6 % at 3,000 psi",
				"Tp = D p / (2π ηhm)       ηhm = 0.92",
				"J dω/dt = θ Te(n) − Tp       J = 0.075 kg·m²",
				"θ = clamp((1.03 n_set − n) / (0.08 n_set))",
				"P = p Q_load",
				"C dT/dt = losses − UA (T − T_air)      UA = 162 W/K"
			]
		},
		breakIt: {
			label: "Dead-head it",
			run: () => {},
			reset: () => sim.restart()
		},
		cut: {
			a: [
				0,
				0,
				1
			],
			b: [
				0,
				1,
				0
			],
			center: [
				0,
				CRANK.y,
				CRANK.z
			],
			reach: .9
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

module.exports = { CUBE, CRANK, ENGINE, PUMP, SOURCES$1, SRC$1, ASSEMBLIES$1, STEPS$1, rrect$1, ring, ext$1, plate$1, slab$1, ringGear, box$1, latheZ$1, latheX$1, rodZ, cyl$1, hose$1, hex$1, at$1, materials$1, TORQUE, INSTALLED, PSI, viscosity, best, solver, powerCube };
