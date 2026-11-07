/** @deprecated v1's length; `electroCubeL(v)` */
const ELECTROCUBE_L = 900;
/** its assemblies and steps: the Power Cube's, the hydraulics' place taken by the alternator and its sockets */
const ASSEMBLIES = /* @__PURE__ */ (() => OWN.map((a) => a.id === "hydraulics" ? {
	id: "electrics",
	label: "Electrics",
	note: "A brushless alternator flanged to the engine and turned by its shaft, its voltage regulator and breakers in a box on the back, and the sockets a home, a workshop or the village grid plugs into.",
	out: [
		0,
		.22,
		-.55
	]
} : a))();
const STEPS = /* @__PURE__ */ (() => OWN_STEPS.map((x, i) => i === 2 ? "Flange the alternator to the engine on its coupling; fit its feet, the control box, the sockets and the cable" : x))();
const ASSEMBLIES_2 = /* @__PURE__ */ (() => OWN.map((a) => a.id === "hydraulics" ? {
	id: "electrics",
	label: "Electrics",
	note: "A flat axial-flux generator on the engine’s shaft, where the pump was; the power converter on the back that turns its raw output into clean 400 V and 230 V; the breakers and the sockets a home, a workshop or the village grid plugs into.",
	out: [
		0,
		.22,
		-.45
	]
} : a))();
const STEPS_2 = /* @__PURE__ */ (() => OWN_STEPS.map((x, i) => i === 2 ? "Bolt the axial-flux generator to the engine on its adapter and coupling; fit its foot, the power converter, the sockets and the cables" : x))();
/** the ElectroCube's parts from v2: a flat axial-flux generator where the pump was, and a power converter on the
*  back, so it fits the 27" frame; all figures inferred (no OSE design exists) */
/** @type {import('./powercube.js').Insides} */
function electricsFlat(part, { box, cyl, hose, T, Lh, B, joints, base }) {
	const G0 = CPL - 50, G1 = G0 - 95;
	const SRC_E = "ElectroCube (our design)";
	part("electrics", {
		id: "coupling",
		label: "Flexible coupling",
		source: SRC_E,
		what: "A rubber-element coupling between the engine’s shaft and the generator’s rotor: it takes up the twin’s firing pulses so the rotor turns smoothly.",
//#piece 3970e6c248666c4484ec314bf247ef40625603dd16b0d1ed43d03a30c2f1aab2
			const g = block(.006, .09, .02, [
				0,
				0,
				0
			], .003);
			g.rotateZ(k / 8 * Math.PI * 2);
			g.translate(0, 235 * S, (G1 - 14) * S);
			put(T(g), DARK);
		}
	});
	part("electrics", {
		id: "adapter",
		label: "Generator adapter",
		source: SRC_E,
		what: "A short cast ring bolted to the engine’s face and the generator’s front plate: it holds the two shafts in line, as the pump mount did.",
		specs: [["Length", "~50 mm"]]
	}, base, (put) => {
		put(cyl([
			0,
			CPL - 30,
			235
		], [
			0,
			G0,
			235
		], 105, 24, 112), "#5b6266");
	});
	part("electrics", {
		id: "alternator",
		label: "Axial-flux generator",
		source: SRC_E,
		what: "A flat “pancake” generator, the kind light electric aircraft and range extenders use: two rotor discs of permanent magnets turn either side of a stator of flat copper coils. Under 10 cm long, it fits where the pump was, so the ElectroCube keeps the 27\" frame. Its voltage rises and falls with the engine’s speed; the power converter makes it steady.",
		moves: "Its rotor turns with the engine.",
		drive: "The engine, through the coupling",
		specs: [
			["Power", "~15 kW continuous at 3,000–3,600 rpm [inferred: 20.9 kW engine]"],
			["Size", "⌀ 230 × 95 mm, ~12 kg [inferred]"],
			["Type", "Axial-flux, permanent magnet, air-cooled"],
			["Efficiency", "~95 % [inferred]"]
		]
	}, base, (put) => {
		put(cyl([
			0,
			G0,
			235
		], [
			0,
			G1,
			235
		], 115, 32), "#2f4d6e");
		for (const y of [G0 - 8, G1 + 8]) put(cyl([
			0,
			y,
			235
		], [
			0,
			y - 5,
			235
		], 118, 32), "#3c5f86");
		for (let k = 0; k < 12; k++) {
			const a = k / 12 * Math.PI * 2;
			put(cyl([
				Math.cos(a) * 108,
				G0 + 2,
				235 + Math.sin(a) * 108
			], [
				Math.cos(a) * 108,
				G1 - 2,
				235 + Math.sin(a) * 108
			], 4, 6), STEEL);
		}
		put(cyl([
			0,
			G1,
			235
		], [
			0,
			G1 - 6,
			235
		], 60, 24), "#5b6266");
		put(box(0, (G0 + G1) / 2, 235 + 128, 110, 60, 30, 5), "#2f4d6e");
	});
	part("electrics", {
		id: "feet",
		label: "Generator foot",
		source: SRC_E,
		what: "A steel foot under the generator, bolted to the skids’ cross member on rubber mounts; its front hangs on the engine.",
		specs: [["Mounts", "Rubber, anti-vibration"]]
	}, base, (put) => {
		put(box(0, (G0 + G1) / 2, (B + 235 - 115) / 2 + 20, 160, 60, 235 - 115 - B + 10, 3), STEEL);
		for (const sx of [-1, 1]) put(cyl([
			sx * 60,
			(G0 + G1) / 2,
			B + 6
		], [
			sx * 60,
			(G0 + G1) / 2,
			B + 14
		], 16, 10), BLACK);
	});
	part("electrics", {
		id: "control-box",
		label: "Power converter (rectifier and inverter)",
		source: SRC_E,
		what: "The box on the cube’s back: it rectifies the generator’s raw output and makes clean 400 V three-phase and 230 V at a steady 50 Hz from it, whatever the engine’s speed, so the engine can idle at light loads. With the main breaker, an earth-leakage breaker, an hour meter and a voltmeter.",
		specs: [
			["Power", "15 kVA [inferred]"],
			["Out", "400 V 3~ and 230 V, 50 Hz, pure sine"],
//#piece 7418d30820cf14dbb442c4839c23cfdd1e5f171b6b3a21a7b2d4173a1683b9cd
		for (let k = 0; k < 6; k++) put(box(-240 + k * 48, -Lh + 30, 590, 8, 50, 20, 1), STEEL);
//#piece 30c7fa7712dfd59b1a8c3e55d692fe3f29e27629a5560df95b2d51e6d0acdb07
			[150, RED],
			[215, "#2f6fb5"],
			[280, "#2f6fb5"]
		]) {
			put(box(x, -Lh + 4, 300, 56, 8, 56, 6), c);
			put(cyl([
				x,
				-Lh + 2,
				300
			], [
				x,
				-Lh - 30,
				300
			], 21, 14), c);
		}
	});
	part("electrics", {
		id: "cable",
		label: "Generator cable",
		source: SRC_E,
		what: "The armoured cable from the generator’s terminal box to the power converter, and on to the sockets.",
		specs: [["Cable", "5 × 4 mm², H07RN-F"]]
	}, base, (put) => {
		put(hose([
			[
				0,
				(G0 + G1) / 2,
				235 + 145
			],
			[
				-80,
				-Lh + 120,
				430
			],
			[
				-120,
				-Lh + 62,
				400
			]
		], 10), HOSE);
		put(hose([
			[
				-40,
				-Lh + 62,
				380
			],
			[
				120,
				-Lh + 40,
				330
			],
			[
				150,
				-Lh + 10,
				300
			]
		], 9), HOSE);
	});
}
/** the ElectroCube's own parts, where the Power Cube's hydraulics are: all figures inferred (no OSE design exists) */
/** @type {import('./powercube.js').Insides} */
function electrics(part, { box, cyl, hose, T, Lh, B, joints, base }) {
	const AX0 = CPL - 50, AX1 = -Lh + 40;
	const SRC_E = "ElectroCube (our design)";
	part("electrics", {
		id: "coupling",
		label: "Flexible coupling",
		source: SRC_E,
		what: "A rubber-element coupling between the engine’s shaft and the alternator’s rotor: it takes up the twin’s firing pulses so the rotor turns smoothly.",
//#piece 3970e6c248666c4484ec314bf247ef40625603dd16b0d1ed43d03a30c2f1aab2
			const g = block(.006, .11, .03, [
				0,
				0,
				0
			], .003);
			g.rotateZ(k / 8 * Math.PI * 2);
			g.translate(0, 235 * S, (AX1 + 20) * S);
			put(T(g), DARK);
		}
	});
	part("electrics", {
		id: "adapter",
		label: "Alternator adapter (bell housing)",
		source: SRC_E,
		what: "An SAE bell housing bolted to the engine’s face and the alternator’s flange: it holds the two shafts in line, as the pump mount did.",
		specs: [["Flange", "SAE 5 / 6.5\" [inferred]"]]
	}, base, (put) => {
		put(cyl([
			0,
			CPL - 30,
			235
		], [
			0,
			AX0,
			235
		], 120, 24, 100), "#5b6266");
		put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL);
	});
	part("electrics", {
		id: "alternator",
		label: "Brushless alternator",
		source: SRC_E,
		what: "A single-bearing, brushless synchronous alternator: its rotor turns inside the stator’s copper windings and gives alternating current at the engine’s governed speed. The 28 hp twin carries about 15 kVA of it.",
		moves: "Its rotor turns with the engine.",
		drive: "The engine, through the coupling",
		specs: [
			["Power", "~15 kVA (12 kW) continuous [inferred: 20.9 kW engine]"],
			["Output", "400 V three-phase and 230 V, 50 Hz at 3,000 rpm (60 Hz at 3,600)"],
			["Type", "Brushless, self-excited, single bearing"],
			["Cooling", "Its own fan, on the rotor"]
		]
	}, base, (put) => {
		put(cyl([
			0,
			AX0,
			235
		], [
			0,
			AX1,
			235
		], 128, 28), "#2f4d6e");
		for (let y = AX0 - 25; y > AX1 + 20; y -= 22) put(cyl([
			0,
			y,
			235
		], [
			0,
			y - 4,
			235
		], 131, 28), "#3c5f86");
		put(cyl([
			0,
			AX1,
			235
		], [
			0,
			AX1 - 18,
			235
		], 120, 28), "#5b6266");
		put(box(0, (AX0 + AX1) / 2, 235 + 150, 170, 160, 50, 6), "#2f4d6e");
	});
	part("electrics", {
		id: "feet",
		label: "Alternator foot",
		source: SRC_E,
		what: "A steel foot under the alternator’s end bell, bolted to the frame’s back cross member on rubber mounts; its flange end hangs on the engine.",
		specs: [["Mounts", "Rubber, anti-vibration"]]
	}, base, (put) => {
		put(box(0, AX1 + 15, 92, 220, 40, 32, 3), STEEL);
		for (const sx of [-1, 1]) put(cyl([
			sx * 80,
			AX1 + 15,
			76
		], [
			sx * 80,
			AX1 + 15,
			84
		], 18, 10), BLACK);
	});
	part("electrics", {
		id: "control-box",
		label: "Control box (regulator and breakers)",
		source: SRC_E,
		what: "The box on the cube’s back: the automatic voltage regulator that holds the voltage steady as loads come and go, the main breaker, an earth-leakage breaker, an hour meter and a voltmeter.",
		specs: [
			["Regulator", "AVR, ±1 %"],
//#piece 7418d30820cf14dbb442c4839c23cfdd1e5f171b6b3a21a7b2d4173a1683b9cd
//#piece 30c7fa7712dfd59b1a8c3e55d692fe3f29e27629a5560df95b2d51e6d0acdb07
			[60, RED],
			[140, "#2f6fb5"],
			[210, "#2f6fb5"]
		]) {
			put(box(x, -Lh + 4, 300, 64, 8, 64, 6), c);
			put(cyl([
				x,
				-Lh + 2,
				300
			], [
				x,
				-Lh - 30,
				300
			], 24, 14), c);
		}
	});
	part("electrics", {
		id: "cable",
		label: "Alternator cable",
		source: SRC_E,
		what: "The armoured cable from the alternator’s terminal box to the control box and sockets.",
		specs: [["Cable", "5 × 4 mm², H07RN-F"]]
	}, base, (put) => {
		put(hose([
			[
				0,
				(AX0 + AX1) / 2,
				235 + 175
			],
			[
				-80,
				-Lh + 120,
				520
			],
			[
				-120,
				-Lh + 60,
				470
			]
		], 10), HOSE);
		put(hose([
			[
				-120,
				-Lh + 60,
				400
			],
			[
				100,
				-Lh + 40,
				320
			],
			[
				140,
				-Lh + 10,
				300
			]
		], 9), HOSE);
	});
}
/** The ElectroCube on its own (version `v`: 1 the classic alternator, 900 mm long; 2 the axial-flux generator in the
* 27" cube), every part its own: it runs, stops, is drawn apart and built. @returns {import('./rig').Cast} */
const electroCube = (v = 2) => v >= 2 ? cubeCast({
	name: "ElectroCube",
	assemblies: ASSEMBLIES_2,
	steps: STEPS_2,
	stepOf: {
		frame: 1,
		engine: 2,
		electrics: 3,
		controls: 4
	},
	len: electroCubeL(v),
	insides: electricsFlat
}) : cubeCast({
	name: "ElectroCube",
	assemblies: ASSEMBLIES,
	steps: STEPS,
	stepOf: {
		frame: 1,
		engine: 2,
		electrics: 3,
		controls: 4
	},
	len: 900,
	insides: electrics
});
//#piece d75aea4541bd4c6f9a0e5cf85614f67f7de4302c28fe65017d658d8d14706c6c
