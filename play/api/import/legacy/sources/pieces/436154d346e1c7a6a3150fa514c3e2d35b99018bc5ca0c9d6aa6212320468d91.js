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
//#piece e42cef297b8b49e3f1cfca6303de3c423b6544536065753c553aa3f7bffbcc01
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
