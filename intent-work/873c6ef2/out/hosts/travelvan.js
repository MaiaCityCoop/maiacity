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

//#region src/lib/assets/kit.js
const { MAT, GEO, fmt, clamp } = require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70");
//#endregion
//#region src/lib/assets/parts.js
const { assetKit, castOf } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
//#endregion
//#region src/lib/machines/vehicle.js
const { tyreSize, vehicleMaterials, engineMaterials, vehicleSolver, ladderFrame, at, box, G, wheelCorner, doubleWishbone, steeringRack, liveAxle, inlineEngine, ordinal, propshaft, slab, cyl, circle, plate, hose, zyRect, insetEdges, zyShape, zyHole, outsetRect, onX, roundHole, onEdge, roundPoly, edgePanel, xz, onY, halfCut, doorPanels, hinge, slide, cluster, seatGeometry, steeringWheelGeometry, bar, latheY, inFrame } = require("5c7ac999d7434d04e4dea7109f6f810baf783a3a3d17f1da078c1fee3b37fcae");
//#endregion
//#region src/lib/machines/van.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** the van's measures (m): its body's width, its ends, the axles, its floor, waist and roof */
const VAN = {
	W: 1.9,
	front: 2.5,
	rear: -2.45,
	axle: {
		front: 1.6,
		rear: -1.55,
		x: .82
	},
	floor: .62,
	sill: .42,
	waist: 1.3,
	roof: 2.13,
	/** the driver's seat (x, z) and the steering wheel's hub */
	driver: {
		x: -.56,
		z: 1.02
	},
	wheel: [
		-.56,
		1.42,
		1.44
	],
	/** the sliding door's opening and the front doors' (z, y) */
	slider: {
		z0: .22,
		z1: 1.24,
		y0: .5,
		y1: 2
	},
	fdoor: {
		z0: 1.3,
		hinge: 2.14,
		y0: .8,
		y1: 2
	}
};
const TYRE = /* @__PURE__ */ (() => tyreSize(185, 80, 14))();
const SOURCES = [
	{
		label: "Road load and rolling resistance (Wong, Theory of Ground Vehicles)",
		url: "https://en.wikipedia.org/wiki/Rolling_resistance"
	},
	{
		label: "Drag of road vehicles (Hucho)",
		url: "https://en.wikipedia.org/wiki/Automobile_drag_coefficient"
	},
	{
		label: "Engine friction and fuel (Heywood, IC Engine Fundamentals)",
		url: "https://en.wikipedia.org/wiki/Brake-specific_fuel_consumption"
	},
	{
		label: "Tyre markings (ETRTO)",
		url: "https://en.wikipedia.org/wiki/Tire_code"
	},
	{
		label: "Leaf and coil suspension",
		url: "https://en.wikipedia.org/wiki/Leaf_spring"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
const SRC = /* @__PURE__ */ (() => ({
	road: SOURCES[0].label,
	air: SOURCES[1].label,
	eng: SOURCES[2].label,
	tyre: SOURCES[3].label,
	susp: SOURCES[4].label
}))();
const ASSEMBLIES = [
	{
		id: "chassis",
		label: "Chassis and suspension",
		note: "The ladder frame the body sits on; double wishbones and coil springs in front with the rack-and-pinion, a live axle on leaf springs behind.",
		out: [
			0,
			-.7,
			0
		]
	},
	{
		id: "wheels",
		label: "Wheels and brakes",
		note: "Four 185/80 R14 C tyres on steel wheels; vented discs and callipers in front, drums behind.",
		out: [
			.5,
			-.2,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "A 2.4 L four-cylinder diesel under the cover between the front seats, 55 kW and 152 N·m.",
		out: [
			0,
			.1,
			0
		]
	},
	{
		id: "drivetrain",
		label: "Gearbox and drive",
		note: "The clutch, the 5-speed gearbox, the two-piece propshaft and the rear axle’s crown wheel and pinion.",
		out: [
			0,
			-.4,
			-.3
		]
	},
	{
		id: "services",
		label: "Cooling, fuel and power",
		note: "The radiator and its fan in the nose, the battery and the air filter beside it, the fuel tank under the floor, the exhaust.",
		out: [
			0,
			-.35,
			.2
		]
	},
	{
		id: "body",
		label: "Body",
		note: "The steel body in two tones on the frame: its sides, nose, roof and back, the floor, the glass.",
		out: [
			0,
			1,
			0
		]
	},
	{
		id: "doors",
		label: "Doors",
		note: "The sliding door on the left and the two front doors, each on its rails or hinges.",
		out: [
			.6,
			.4,
			0
		]
	},
	{
		id: "cab",
		label: "Cab and seats",
		note: "The dashboard and its gauges, the steering wheel and pedals, the engine’s cover, eleven seats in three rows.",
		out: [
			0,
			.6,
			0
		]
	},
	{
		id: "roof",
		label: "Roof rack and load",
		note: "The rack on the roof’s gutters and what is tied on it: three bags, a sack of rice and a spare tyre.",
		out: [
			0,
			1.6,
			0
		]
	}
];
const STEPS = [
	"Weld the frame and hang the suspension, the axle and the steering on it",
	"Bolt on the wheels and brakes",
	"Drop in the engine on its mounts",
	"Bolt on the gearbox; fit the propshaft and the axle’s gears",
	"Fit the radiator, battery, fuel tank and exhaust",
	"Lower the body onto the frame; fit the glass",
	"Hang the doors",
	"Fit the dashboard, the steering wheel, the seats",
	"Bolt on the roof rack and tie the load on"
];
/** the van's paint and trim (linear colours, measured where AirSup has them) */
function materials() {
	const tones = new three.DataTexture(new Uint8Array([
		194,
		175,
		133,
		255,
		29,
		65,
		97,
		255
	]), 1, 2, three.RGBAFormat);
	tones.magFilter = tones.minFilter = three.NearestFilter;
	tones.wrapS = tones.wrapT = three.ClampToEdgeWrapping;
	tones.channel = 1;
	tones.needsUpdate = true;
	const paint = MAT.paint({
		color: [
			1,
			1,
			1
		],
		roughness: .5,
		clearcoat: .12,
		clearcoatRoughness: .5
	});
	paint.map = tones;
	return {
		paint,
		blue: MAT.paint({
			color: [
				.114,
				.254,
				.381
			],
			roughness: .5,
			clearcoat: .12,
			clearcoatRoughness: .5
		}),
		cream: MAT.paint({
			color: [
				.76,
				.686,
				.521
			],
			roughness: .52,
			clearcoat: .1,
			clearcoatRoughness: .5
		}),
		rust: MAT.paint({
			color: [
				.254,
				.069,
				.019
			],
			roughness: .95,
			clearcoat: 0,
			finish: "cast"
		}),
		trim: MAT.satin({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .6
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
				.86,
				.93,
				.95
			],
			roughness: .04
		}),
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
				.03,
				.03,
				.033
			],
			roughness: .85
		}),
		fabric: MAT.satin({
			color: [
				.2,
				.09,
				.045
			],
			roughness: .95,
			finish: "cast"
		}),
		fabricDark: MAT.satin({
			color: [
				.06,
				.04,
				.03
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
				.05,
				.048,
				.045
			],
			roughness: .7
		}),
		card: MAT.plastic({
			color: [
				.32,
				.29,
				.25
			],
			roughness: .85
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
		rack: MAT.paint({
			color: [
				.043,
				.043,
				.045
			],
			roughness: .55,
			clearcoat: .2,
			metalness: .4
		}),
		bagRed: MAT.satin({
			color: [
				.33,
				.043,
				.028
			],
			roughness: .92,
			finish: "cast"
		}),
		bagGreen: MAT.satin({
			color: [
				.078,
				.147,
				.043
			],
			roughness: .92,
			finish: "cast"
		}),
		bagBlue: MAT.satin({
			color: [
				.028,
				.078,
				.195
			],
			roughness: .92,
			finish: "cast"
		}),
		sack: MAT.satin({
			color: [
				.686,
				.604,
				.402
			],
			roughness: .98,
			finish: "cast"
		}),
		strap: MAT.satin({
			color: [
				.6,
				.45,
				.04
			],
			roughness: .8
		}),
		tank: MAT.paint({
			color: [
				.05,
				.05,
				.055
			],
			roughness: .6
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
		silencer: MAT.steelDark({
			color: [
				.2,
				.17,
				.15
			],
			roughness: .7
		}),
		filterBox: MAT.plastic({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .55
		})
	};
}
/**
* The side profile of the body, (z, y) anticlockwise from its rear bottom: the sill with the two wheel arches cut up
* into it, the nose, the bonnet, the windscreen, the roof, the back. Each edge's radius: how far its panel's rounded
* edge reaches round onto the side (0 along the sill and arches).
* @returns {{ pts: V2[], r: number[], seg: boolean[] }}
*/
function profile() {
	const { axle, sill, front, rear, roof } = VAN;
	const yw = TYRE.r - .008, Ra = .43;
	/** @type {V2[]} */
	const pts = [[rear, sill]];
	/** @type {number[]} */
	const r = [];
	/** @type {boolean[]} */
	const seg = [];
	const arch = (zc) => {
		const a0 = Math.PI - Math.asin((sill - yw) / Ra), a1 = Math.asin((sill - yw) / Ra);
		for (let k = 0; k <= 14; k++) {
			const a = a0 + (a1 - a0) * k / 14;
			pts.push([zc + Ra * Math.cos(a), yw + Ra * Math.sin(a)]);
		}
	};
	arch(axle.rear);
	arch(axle.front);
	/** the front, the roof and the back, each point the start of an edge with its radius */
	const ends = [
		[front - .04, sill],
		[front, .95],
		[front - .01, 1.42],
		[front - .07, 1.49],
		[2.2, 1.53],
		[1.98, 2.05],
		[1.88, roof],
		[rear + .07, roof],
		[rear, roof - .07]
	];
	const er = [
		.1,
		.1,
		.1,
		.1,
		.08,
		.09,
		.09,
		.07,
		.07
	];
	const k0 = pts.length;
	pts.push(...ends);
	for (let k = 0; k < pts.length; k++) {
		r.push(k < k0 ? 0 : er[k - k0]);
		seg.push(k >= k0);
	}
	return {
		pts,
		r,
		seg
	};
}
/** give a body panel's vertices their second uvs from their height, so the two-tone paint changes at the waist @param {THREE.BufferGeometry} g @param {number} [dy] its height's offset from the body's frame */
function tone(g, dy = 0) {
	const p = g.attributes.position, uv = new Float32Array(p.count * 2);
	for (let i = 0; i < p.count; i++) {
		uv[i * 2] = .5;
		uv[i * 2 + 1] = .5 + (p.getY(i) + dy - VAN.waist) * 200;
	}
	g.setAttribute("uv1", new three.BufferAttribute(uv, 2));
	return g;
}
/** the van as the solver runs it [inferred where marked in the research] */
const VEHICLE = /* @__PURE__ */ (() => ({
	kerb: 1950,
	payload: 1e3,
	Crr: .011,
	CdA: 1.62,
	r: TYRE.r * .97,
	eta: .9,
	gears: [
		4,
		2.2,
		1.4,
		1,
		.8
	],
	final: 4.3,
	engine: {
		rpm: [
			700,
			1e3,
			1500,
			2e3,
			2400,
			3e3,
			3600,
			4e3,
			4400
		],
		nm: [
			75,
			108,
			136,
			148,
			152,
			147,
			139,
			131,
			70
		],
		idle: 780,
		stall: 560,
		max: 4400,
		up: 3600,
		down: 1350,
		launch: 1250,
		Vd: .00239,
		fmep: 16e4,
		bsfc: 200,
		fuel: "diesel",
		J: .28
	},
	Jw: 1,
	wheels: 4,
	axles: {
		wb: VAN.axle.front - VAN.axle.rear,
		h: .85,
		front: .5,
		loadFront: .35,
		k: [32e3, 52e3],
		travel: [.08, .1]
	}
}))();
const KMH = 1 / 3.6;
/**
* The travel van: a root at its real size, every part its own, its solver driving it.
* @param {{ speed?: number, grade?: number, load?: number, doors?: number }} [o] the speed asked (km/h), the grade (%),
*   the load in it (kg, people and bags), how far its doors are open (0 shut … 1 open)
* @returns {THREE.Group}
*/
function van({ speed = 80, grade = 0, load = 600, doors = 0 } = {}) {
	const root = new three.Group();
	root.name = "Travel van";
	const M = materials(), R = vehicleMaterials(), E = engineMaterials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps: STEPS,
		sources: SOURCES
	});
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** the sprung body: everything the springs carry, sinking and pitching on them */
	const body = new three.Group();
	body.name = "sprung";
	root.add(body);
	/** a part: its meshes, its card and how it is shown (in the body unless said) */
	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	const { W, axle, floor } = VAN, X = W / 2;
	const yw = TYRE.r - .008;
	const sim = vehicleSolver(VEHICLE);
	const kmh = () => sim.s.v * 3.6;
	const rails = [[2.38, .54], [-2.3, .54]];
	{
		const g = [ladderFrame({
			x: .45,
			w: .06,
			h: .12,
			t: .004,
			path: rails,
			cross: [
				2.3,
				-.45,
				-1.02,
				-2.22
			]
		})];
		g.push(at(box(.9, .07, .1, .01), 0, .3, axle.front), at(box(.05, .06, .42, .008), .3, .27, axle.front), at(box(.05, .06, .42, .008), -.3, .27, axle.front));
		for (const sx of [-1, 1]) g.push(at(box(.06, .18, .08, .006), sx * .43, .39, axle.front), at(box(.08, .02, .14, .004), sx * .53, .595, axle.front), at(box(.04, .12, .05, .004), sx * .5, .53, axle.front + .15), at(box(.04, .12, .05, .004), sx * .5, .53, axle.front - .15));
		g.push(at(box(.9, .05, .08, .008), 0, .345, .46), at(box(.05, .14, .06, .006), .42, .42, .46), at(box(.05, .14, .06, .006), -.42, .42, .46));
		for (const sx of [-1, 1]) g.push(at(box(.08, .012, .1, .003), sx * .375, .494, 1.27), at(box(.012, .05, .1, .003), sx * .418, .52, 1.27));
		for (const sx of [-1, 1]) g.push(at(box(.08, .04, .06, .006), sx * .39, .575, -1.3));
		for (const sx of [-1, 1]) g.push(at(box(.06, .05, .06, .012), sx * .45, .455, axle.rear));
		part({
			id: "frame",
			label: "Ladder frame",
			assembly: "chassis",
			source: SRC.susp,
			what: "Two box-section steel rails the length of the van, joined by crossmembers: everything hangs from it, and the body sits on it on rubber mounts. A dropped crossmember carries the front suspension under the engine’s nose, another the gearbox’s tail.",
			specs: [["Rails", "120 × 60 × 4 mm box [inferred]"], ["Track of rails", "900 mm"]]
		}, [m(GEO.merge(g), R.chassis)], { explode: [
			0,
			-.6,
			0
		] });
	}
	const tagWheel = (which) => ({
		text: `Wheel, ${which}`,
		at: [
			.12,
			.2,
			0
		],
		side: "left",
		value: () => which.startsWith("front") ? `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm · ${fmt(sim.s.loadF / G)} kg on it` : `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm · ${fmt(sim.s.loadR / G)} kg on it`
	});
	const wheelOpts = {
		size: TYRE,
		rimW: .1397,
		et: .03,
		rim: "steel",
		studs: 5,
		pcd: .13,
		M: R,
		assembly: "wheels",
		source: SRC.tyre,
		capMat: M.chrome
	};
	const corners = {
		fl: wheelCorner(kit, {
			...wheelOpts,
			id: "fl",
			label: "front left",
			at: [
				axle.x,
				yw,
				axle.front
			],
			side: 1,
			brake: "disc",
			disc: {
				r: .128,
				rIn: .08,
				t: .022
			},
			steers: true,
			arm: 1,
			drive: "The road; steered by the knuckle",
			tag: tagWheel("front left")
		}),
		fr: wheelCorner(kit, {
			...wheelOpts,
			id: "fr",
			label: "front right",
			at: [
				-axle.x,
				yw,
				axle.front
			],
			side: -1,
			brake: "disc",
			disc: {
				r: .128,
				rIn: .08,
				t: .022
			},
			steers: true,
			arm: 1
		}),
		rl: wheelCorner(kit, {
			...wheelOpts,
			id: "rl",
			label: "rear left",
			at: [
				axle.x,
				yw,
				axle.rear
			],
			side: 1,
			brake: "drum",
			drum: {
				r: .127,
				depth: .075
			},
			drive: "The half-shaft, from the differential",
			tag: tagWheel("rear left")
		}),
		rr: wheelCorner(kit, {
			...wheelOpts,
			id: "rr",
			label: "rear right",
			at: [
				-axle.x,
				yw,
				axle.rear
			],
			side: -1,
			brake: "drum",
			drum: {
				r: .127,
				depth: .075
			},
			drive: "The half-shaft, from the differential"
		})
	};
	const front = ["fl", "fr"].map((id) => {
		const sx = id === "fl" ? 1 : -1;
		return doubleWishbone(kit, {
			id,
			label: id === "fl" ? "front left" : "front right",
			corner: corners[id],
			body,
			upper: [[
				sx * .5,
				.53,
				axle.front + .15
			], [
				sx * .5,
				.53,
				axle.front - .15
			]],
			lower: [[
				sx * .3,
				.22,
				axle.front + .18
			], [
				sx * .3,
				.22,
				axle.front - .18
			]],
			top: [
				sx * .53,
				.585,
				axle.front
			],
			rack: [
				sx * .36,
				.33,
				axle.front + .24
			],
			coil: {
				R: .052,
				wire: .0105,
				turns: 5,
				k: VEHICLE.axles.k[0]
			},
			M: R,
			assembly: "chassis",
			source: SRC.susp,
			tag: id === "fl" ? {
				text: "Front spring",
				at: [
					0,
					.3,
					0
				],
				side: "left",
				value: () => `sunk ${fmt(sim.s.sagF * 1e3)} mm${sim.s.sagF > VEHICLE.axles.travel[0] ? " · on its bump stop" : ""}`
			} : void 0
		});
	});
	steeringRack(kit, {
		parent: body,
		y: .33,
		z: axle.front + .24,
		half: .45,
		pinion: -.3,
		shaft: [
			[
				-.3,
				.38,
				axle.front + .25
			],
			[
				-.42,
				.66,
				axle.front + .2
			],
			[
				-.56,
				1,
				1.72
			]
		],
		M: R,
		assembly: "chassis",
		source: SRC.susp
	});
	const rearAxle = liveAxle(kit, {
		body,
		z: axle.rear,
		y: yw,
		hub: axle.x - .02,
		springX: .45,
		over: false,
		leaf: {
			L: 1.2,
			w: .06,
			t: .008,
			n: 5,
			camber: .075
		},
		hanger: .48,
		dampers: [[
			.39,
			.575,
			-1.3
		], [
			-.39,
			.575,
			-1.3
		]],
		ratio: VEHICLE.final,
		rate: VEHICLE.axles.k[1],
		M: R,
		E,
		assembly: "drivetrain",
		springs: "chassis",
		source: SRC.susp,
		tag: {
			text: "Rear springs",
			at: [
				.45,
				.33,
				-1.5
			],
			side: "left",
			value: () => `sunk ${fmt(sim.s.sagR * 1e3)} mm${sim.s.sagR > VEHICLE.axles.travel[1] ? " · on the bump stops" : ""}`
		}
	});
	const engine = inlineEngine(kit, {
		parent: body,
		at: [
			0,
			.52,
			1.25
		],
		bore: .092,
		stroke: .09,
		rod: .152,
		pitch: .104,
		well: "rear",
		gears: VEHICLE.gears,
		lever: [
			0,
			.6,
			-.42
		],
		mounts: [[
			.375,
			-.02,
			.02
		], [
			-.375,
			-.02,
			.02
		]],
		rearMount: [
			0,
			-.15,
			-.79
		],
		assembly: "engine",
		gearAssembly: "drivetrain",
		source: SRC.eng,
		name: "2.4 L diesel",
		specs: [
			["Power", "55 kW at 4,000 rpm [inferred]"],
			["Torque", "152 N·m at 2,400 rpm [inferred]"],
			["Injection", "Indirect, 22 : 1"],
			["Friction", "1.6 bar mean pressure at 2,000 rpm [inferred]"]
		],
		M: E,
		tag: () => sim.s.stalled ? "stalled" : `${fmt(sim.s.rpm)} rpm · ${fmt(Math.max(0, sim.s.Te))} N·m · ${fmt(Math.max(0, sim.s.Pe) / 1e3, 1)} kW`,
		gearTag: () => sim.s.stalled ? "stalled in 1st" : sim.s.v < .05 && sim.s.at.vSet < .05 ? "neutral" : `${ordinal(sim.s.gear)} gear · ${VEHICLE.gears[sim.s.gear - 1].toFixed(2)} : 1${sim.s.launch ? " · clutch slipping" : ""}`
	});
	const shaft = propshaft(kit, {
		n: 2,
		r: .032,
		M: R,
		assembly: "drivetrain",
		source: SRC.eng,
		specs: [["Tube", "Ø 64 × 1.6 mm steel [inferred]"], ["Joints", "4 universal joints, a centre bearing"]]
	});
	const BEARING = [
		0,
		.44,
		-.45
	];
	const PINION = [
		0,
		yw - .01,
		axle.rear + .065 + .212
	];
	const fan = new three.Group();
	{
		const zr = 2.37, yr = 1.02, wr = .62, hr = .44;
		const fins = [];
		for (let k = 0; k <= 56; k++) fins.push(slab(6e-4, hr, .036).translate(-.62 / 2 + k * wr / 56, yr, zr));
		const core = GEO.merge([at(box(wr, hr, .03, .002), 0, yr, zr), ...fins]);
		const tanks = GEO.merge([
			at(box(.6799999999999999, .06, .06, .012), 0, 1.27, zr),
			at(box(.6799999999999999, .06, .06, .012), 0, yr - hr / 2 - .03, zr),
			cyl([
				.2,
				1.3,
				zr
			], [
				.2,
				1.32,
				zr
			], .022, 20)
		]);
		const shroud = new three.Shape();
		shroud.absarc(0, 0, .2, 0, Math.PI * 2, false);
		shroud.holes.push(circle(0, 0, .185));
		fan.add(m(GEO.rotor({
			count: 5,
			axis: "z",
			r0: .04,
			r1: .175,
			chord: [.05, .07],
			thick: .06,
			camber: .08,
			twist: .35,
			pitch: .45,
			nS: 5,
			nC: 7
		}), E.plastic));
		fan.position.set(0, yr, 2.3000000000000003);
		const motor = GEO.merge([
			cyl([
				0,
				yr,
				2.2600000000000002
			], [
				0,
				yr,
				2.3000000000000003
			], .045, 20),
			plate(shroud, .05, 24).translate(0, yr, 2.31),
			at(slab(.4, .02, .012), 0, yr, 2.265),
			at(slab(.02, .4, .012), 0, yr, 2.265)
		]);
		const hoses = [hose([
			[
				.24,
				1.27,
				2.3400000000000003
			],
			[
				.22,
				1.12,
				2.14
			],
			[
				.08,
				.95,
				1.72
			],
			[
				0,
				.85,
				1.5
			]
		], .019, 8), hose([
			[
				-.24,
				yr - hr / 2 - .03,
				2.3400000000000003
			],
			[
				-.22,
				.72,
				2.12
			],
			[
				-.08,
				.68,
				1.68
			],
			[
				-.03,
				.66,
				1.53
			]
		], .019, 8)];
		part({
			id: "radiator",
			label: "Radiator and fan",
			assembly: "services",
			source: SRC.eng,
			what: "In the nose behind the grille: the engine’s coolant runs down through the radiator’s finned tubes and gives its heat to the air the road and the electric fan push through it; two long hoses run back under the floor to the engine.",
			moves: "The fan turns when the coolant is hot.",
			drive: "Its 12 V motor, switched by a thermostat",
			specs: [["Core", `${Math.round(wr * 1e3)} × ${Math.round(hr * 1e3)} mm, aluminium [inferred]`], ["Rejects", "About a third of the fuel’s heat at full load"]]
		}, [
			m(core, M.core),
			m(tanks, E.plastic),
			m(motor, E.plastic),
			fan,
			m(GEO.merge(hoses), E.hose)
		], {
			explode: [
				0,
				.2,
				.9
			],
			tag: {
				text: "Radiator",
				at: [
					.32,
					1.27,
					zr
				],
				side: "right",
				value: () => `${fmt(heat(), 1)} kW to the air`
			}
		});
		const bt = {
			x: -.58,
			y: .885,
			z: 2.3,
			w: .24,
			h: .19,
			d: .17
		};
		part({
			id: "battery",
			label: "12 V battery",
			assembly: "services",
			source: SRC.eng,
			what: "The starting battery in the nose, beside the radiator: it cranks the engine and heats the glow plugs; the alternator charges it.",
			specs: [["Capacity", "88 Ah, 680 A cold cranking [inferred]"]]
		}, [
			m(at(box(bt.w, bt.h, bt.d, .008), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(GEO.merge([cyl([
				bt.x - .08,
				bt.y + bt.h,
				bt.z
			], [
				bt.x - .08,
				bt.y + bt.h + .02,
				bt.z
			], .009, 12), cyl([
				bt.x + .08,
				bt.y + bt.h,
				bt.z
			], [
				bt.x + .08,
				bt.y + bt.h + .02,
				bt.z
			], .009, 12)]), M.lead),
			m(GEO.merge([at(box(bt.w + .04, .012, bt.d + .04, .004), bt.x, bt.y - .006, bt.z), hose([
				[
					bt.x + .08,
					bt.y + bt.h + .02,
					bt.z
				],
				[
					bt.x + .2,
					bt.y + .1,
					bt.z - .1
				],
				[
					-.2,
					.6,
					1.9
				],
				[
					-.155,
					.45,
					1.05
				]
			], .007, 8)]), M.trim)
		], { explode: [
			-.3,
			.3,
			.5
		] });
		const af = GEO.merge([at(box(.28, .16, .22, .02), .58, 1.06, 2.3), cyl([
			.58,
			1.06,
			2.41
		], [
			.58,
			1.06,
			2.46
		], .04, 20)]);
		part({
			id: "air-filter",
			label: "Air filter and intake",
			assembly: "services",
			source: SRC.eng,
			what: "The engine breathes through a paper element in this box behind the grille, then down a long duct to the intake manifold.",
			specs: [["Element", "Paper, dry [inferred]"]]
		}, [m(af, M.filterBox), m(hose([
			[
				.5,
				1,
				2.19
			],
			[
				.38,
				.95,
				1.95
			],
			[
				.22,
				.9,
				1.62
			],
			[
				.26,
				.88,
				1.25
			],
			[
				.176,
				.858,
				1.06
			]
		], .032, 12), E.hose)], { explode: [
			.3,
			.3,
			.5
		] });
		const ft = {
			x: -.71,
			y: .46,
			z: -.6,
			w: .32,
			h: .24,
			d: .7
		};
		const tankG = GEO.merge([
			at(box(ft.w, ft.h, ft.d, .03), ft.x, ft.y, ft.z),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y + ft.h / 2 - .02, ft.z + .2),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y + ft.h / 2 - .02, ft.z - .2)
		]);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "services",
			source: SRC.eng,
			what: "A 60 L pressed-steel tank under the floor on the right, hung on two straps; its filler neck runs up to the cap on the side.",
			specs: [["Volume", "60 L [inferred]"], ["Fuel", "Diesel, 835 g/L"]]
		}, [m(tankG, M.tank), m(GEO.merge([hose([
			[
				ft.x - .1,
				ft.y + ft.h / 2,
				ft.z - .3
			],
			[
				-.88,
				.75,
				-.95
			],
			[
				-.93,
				1,
				-.95
			]
		], .022, 10), hose([
			[
				ft.x + .14,
				ft.y + .08,
				ft.z + .35
			],
			[
				-.38,
				.5,
				.2
			],
			[
				-.1,
				.45,
				.9
			],
			[
				.12,
				.55,
				1.3
			],
			[
				.16,
				.66,
				1.42
			]
		], .005, 6)]), E.hose)], {
			explode: [
				-.5,
				-.3,
				0
			],
			tag: {
				text: "Fuel",
				at: [
					ft.x - ft.w / 2,
					ft.y,
					ft.z
				],
				side: "right",
				value: () => sim.s.stalled ? "stopped" : `${fmt(sim.s.fuel, 1)} L/h${sim.s.v > .5 ? ` · ${fmt(sim.s.l100, 1)} L/100 km` : ""}`
			}
		});
		const ex = engine.points.exhaust;
		const pipe = hose([
			ex,
			[
				ex[0] - .04,
				.55,
				ex[2] - .08
			],
			[
				-.25,
				.42,
				.82
			],
			[
				-.25,
				.42,
				.2
			]
		], .024, 12);
		const tail = hose([
			[
				-.25,
				.42,
				-.78
			],
			[
				-.27,
				.43,
				-1.3
			],
			[
				-.29,
				.43,
				-1.6
			],
			[
				-.3,
				.43,
				-2.2
			],
			[
				-.6,
				.42,
				-2.34
			],
			[
				-.64,
				.41,
				-2.5
			]
		], .024, 12);
		const silencer = GEO.merge([at(box(.24, .14, .94, .05), -.25, .42, -.29)]);
		part({
			id: "exhaust",
			label: "Exhaust and silencer",
			assembly: "services",
			source: SRC.eng,
			what: "From the manifold down and back under the floor through the silencer, over the axle and out under the back on the right, hung on rubber loops.",
			specs: [["Pipe", "Ø 48 mm steel [inferred]"]]
		}, [m(GEO.merge([pipe, tail]), E.hot), m(silencer, M.silencer)], { explode: [
			0,
			-.5,
			0
		] });
	}
	/** the coolant's heat to the air (kW): about 30 % of the fuel's heat [inferred] */
	const heat = () => sim.s.fuel * .835 * 42.6 * .3 / 3.6;
	const prof = profile();
	const t = .008;
	const S = VAN.slider, F = VAN.fdoor;
	/** the A pillar's line on the side: the windscreen's edge moved back by `d` (z at height y) */
	const kWs = prof.pts.length - 9 + 4;
	const ws0 = prof.pts[kWs], ws1 = prof.pts[kWs + 1];
	const aLine = (d, y) => {
		const dz = ws1[0] - ws0[0], dy = ws1[1] - ws0[1], L = Math.hypot(dz, dy);
		return ws0[0] - dy / L * d + (y - (ws0[1] + dz / L * d)) * dz / dy;
	};
	const yA = (() => {
		let y = 1;
		for (let k = 0; k < 40; k++) y += (aLine(.13, y) - F.hinge) * .5;
		return y;
	})();
	/** @type {V2[]} */
	const fdoorHole = [
		[F.z0, F.y0],
		[F.hinge, F.y0],
		[F.hinge, yA],
		[aLine(.13, F.y1), F.y1],
		[F.z0, F.y1]
	];
	/** @type {V2[]} */
	const fdoorWin = [
		[F.z0 + .06, 1.42],
		[aLine(.18, 1.42), 1.42],
		[aLine(.18, 1.94), 1.94],
		[F.z0 + .06, 1.94]
	];
	const sideWins = {
		left: [zyRect(-.85, .12, 1.42, 1.94), zyRect(-2.2, -.95, 1.42, 1.94)],
		right: [
			zyRect(.3, 1.16, 1.42, 1.94),
			zyRect(-.85, .12, 1.42, 1.94),
			zyRect(-2.2, -.95, 1.42, 1.94)
		]
	};
	{
		const outline = insetEdges(prof.pts, prof.r);
		const sides = [];
		const seals = [];
		const glass = [];
		for (const sx of [-1, 1]) {
			const s = zyShape(outline, 0);
			s.holes.push(zyHole(fdoorHole, .03));
			if (sx > 0) s.holes.push(zyHole(zyRect(S.z0, S.z1, S.y0, S.y1), .04));
			const wins = sx > 0 ? sideWins.left : sideWins.right;
			for (const w of wins) {
				s.holes.push(zyHole(w, .05));
				const ring = zyShape(outsetRect(w, .014), .06);
				ring.holes.push(zyHole(w, .05));
				seals.push(onX(plate(ring, .004, 6), sx * (X + .002)));
				glass.push(onX(plate(zyShape(outsetRect(w, .006), .055), .005, 6), sx * (X - t / 2)));
			}
			sides.push(tone(onX(plate(s, t, 6), sx * (X - t / 2))));
			if (sx > 0) sides.push(tone(at(box(.024, .03, 1.2, .006), X + .012, 1.34, -.4)));
		}
		const houses = [];
		for (const zc of [axle.front, axle.rear]) for (const sx of [-1, 1]) {
			const a0 = Math.PI - Math.asin((VAN.sill - yw) / .435), a1 = Math.asin((VAN.sill - yw) / .435);
			/** @type {V2[]} */
			const arc = [];
			for (let k = 0; k <= 16; k++) {
				const a = a0 + (a1 - a0) * k / 16;
				arc.push([zc + .435 * Math.cos(a), yw + .435 * Math.sin(a)]);
			}
			houses.push(onX(plate(zyShape(arc, 0), .006, 6), sx * .66));
			const top = new three.Shape();
			top.absarc(0, 0, .441, a1, a0, false);
			top.absarc(0, 0, .435, a0, a1, true);
			top.closePath();
			houses.push(plate(top, X - .66 - t, 6).rotateY(Math.PI / 2).translate(sx * (.66 + (X - .66 - t) / 2), yw, zc));
		}
		const rust = [];
		for (const sx of [-1, 1]) {
			for (const [z0, z1] of [
				[-2.36, -2],
				[-1.1, 1.15],
				[2.04, 2.34]
			]) rust.push(onX(plate(zyShape(zyRect(z0, z1, VAN.sill + .004, VAN.sill + .07 + .03 * Math.sin(z0 * 7)), .02), .002, 4), sx * (X + .0012)));
			for (const zc of [axle.front, axle.rear]) {
				const lip = new three.Shape();
				lip.absarc(0, 0, .47, .35, Math.PI - .35, false);
				lip.absarc(0, 0, .432, Math.PI - .35, .35, true);
				lip.closePath();
				rust.push(plate(lip, .002, 12).rotateY(Math.PI / 2).translate(sx * (X + .0012), yw, zc));
			}
			/** @type {V2[]} */
			const blob = [];
			for (let k = 0; k < 9; k++) {
				const a = k / 9 * Math.PI * 2, rr = .06 + .025 * Math.sin(k * 2.3 + sx);
				blob.push([-1.35 + rr * 1.5 * Math.cos(a), .62 + rr * Math.sin(a)]);
			}
			rust.push(onX(plate(zyShape(blob, .025), .002, 4), sx * (X + .0012)));
		}
		part({
			id: "body-sides",
			label: "Body sides",
			assembly: "body",
			source: SRC.air,
			what: "The two pressed-steel sides, cream below the waist and blue above, their windows, door openings and wheel arches cut in; the wheel housings inside. Thirty years of sun have faded the blue, and the sills and arches are rusting through.",
			specs: [["Steel", "0.8 mm, painted [inferred]"], ["Paint", "Two-tone, cream and blue"]]
		}, [
			m(GEO.merge(sides), M.paint),
			m(GEO.merge(houses), M.trim),
			m(GEO.merge(rust), M.rust),
			m(GEO.merge(seals), M.rubber)
		], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell"
		});
		part({
			id: "side-glass",
			label: "Side windows",
			count: 5,
			assembly: "body",
			source: SRC.air,
			what: "Fixed side windows of toughened glass in rubber seals.",
			specs: [["Glass", "4 mm toughened"]]
		}, [m(GEO.merge(glass), M.glass)], { explode: [
			0,
			.32,
			0
		] });
		const ps = [];
		/** @type {THREE.BufferGeometry[]} */
		const screen = [];
		const n = prof.pts.length;
		for (let k = 0; k < n; k++) {
			if (!prof.seg[k]) continue;
			const a = prof.pts[k], b = prof.pts[(k + 1) % n], R0 = prof.r[k];
			const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
			/** @type {THREE.Path[]} */
			const holes = [];
			const hw = X - R0;
			if (k === kWs) {
				holes.push(roundHole([
					[-hw + .045, .05],
					[hw - .045, .05],
					[hw - .045, len - .045],
					[-hw + .045, len - .045]
				], .06));
				screen.push(onEdge(plate(roundPoly([
					[-hw + .04, .045],
					[hw - .04, .045],
					[hw - .04, len - .04],
					[-hw + .04, len - .04]
				], .06), .006, 8), a, b, -.006));
			}
			if (k === kWs - 3) holes.push(roundHole([
				[-.43, .08],
				[.43, .08],
				[.43, .37],
				[-.43, .37]
			], .03));
			if (k === n - 1) {
				holes.push(roundHole([
					[-.72, 2.06 - 1.94],
					[.72, 2.06 - 1.94],
					[.72, 2.06 - 1.42],
					[-.72, 2.06 - 1.42]
				], .05));
				screen.push(onEdge(plate(roundPoly([
					[-.725, .115],
					[.725, .115],
					[.725, .645],
					[-.725, .645]
				], .05), .005, 8), a, b, -.005));
			}
			ps.push(tone(edgePanel(a, b, R0, t, W, holes)));
		}
		part({
			id: "front-roof-back",
			label: "Nose, roof and back",
			assembly: "body",
			source: SRC.air,
			what: "The body’s ends and top: the short nose with the grille’s opening, the bonnet, the windscreen’s frame, the roof, and the back with its two doors (shut here); every edge rounded onto the sides.",
			specs: [["Roof", "Ribbed steel, 0.8 mm [inferred]"]]
		}, [m(GEO.merge(ps), M.paint)], {
			explode: [
				0,
				.9,
				0
			],
			xray: "shell"
		});
		part({
			id: "windscreen",
			label: "Windscreen and back window",
			assembly: "body",
			source: SRC.air,
			what: "The laminated windscreen, nearly upright over the short nose, and the back window between the rear doors.",
			specs: [["Windscreen", "6.4 mm laminated"], ["Back", "4 mm toughened"]]
		}, [m(GEO.merge(screen), M.glass)], { explode: [
			0,
			.5,
			.5
		] });
		const fx = X - t - .004;
		/** @type {V2[]} */
		const fo = [[-fx, 2.15], [fx, 2.15]];
		for (const zc of [axle.front, axle.rear]) fo.push([fx, zc + .44], [.655, zc + .44], [.655, zc - .44], [fx, zc - .44]);
		fo.push([fx, VAN.rear + .012], [-fx, VAN.rear + .012]);
		for (const zc of [axle.rear, axle.front]) fo.push([-fx, zc - .44], [-.655, zc - .44], [-.655, zc + .44], [-fx, zc + .44]);
		const fs = roundPoly(xz(fo), .004);
		fs.holes.push(roundHole(xz([
			[-.3, .84],
			[-.3, 2.12],
			[.3, 2.12],
			[.3, .84]
		]), .04));
		const floorG = onY(plate(fs, .02, 4), floor - .01);
		const mat = onY(plate(fs, .004, 4), floor + .002);
		const wall = at(slab(1.7, .56, t), 0, floor + .28, 2.16);
		part({
			id: "floor",
			label: "Floor",
			assembly: "body",
			source: SRC.air,
			what: "The ribbed steel floor on the frame, cut round the engine’s cover and the wheel housings, a rubber mat over it; the wall under the dashboard closes the cab from the nose.",
			specs: [["Height", `${Math.round(floor * 1e3)} mm off the road`]]
		}, [
			m(floorG, M.cream),
			m(mat, M.floor),
			m(wall, M.cream)
		], { explode: [
			0,
			.2,
			0
		] });
		const bump = (z, dz) => GEO.merge([
			at(box(1.82, .15, .13, .03), 0, .53, z),
			at(box(.16, .15, .2, .04), .86, .53, z - dz * .04),
			at(box(.16, .15, .2, .04), -.86, .53, z - dz * .04),
			at(box(.06, .08, .12, .01), .42, .53, z - dz * .1),
			at(box(.06, .08, .12, .01), -.42, .53, z - dz * .1)
		]);
		part({
			id: "bumpers",
			label: "Bumpers and number plates",
			assembly: "body",
			source: SRC.air,
			what: "Steel bumpers front and back on brackets to the frame, painted black; the plates (blank) on them.",
			specs: [["Steel", "2 mm pressed"]]
		}, [m(GEO.merge([bump(VAN.front + .12, 1), bump(VAN.rear - .1, -1)]), halfCut(M.trim)), m(GEO.merge([at(slab(.52, .11, .006), 0, .53, VAN.front + .19), at(slab(.52, .11, .006), 0, .8, VAN.rear - .006)]), halfCut(M.plate))], { explode: [
			0,
			-.2,
			0
		] });
		const lights = [], lenses = [], reds = [], ambers = [];
		for (const sx of [-1, 1]) {
			lights.push(at(box(.27, .18, .05, .01), sx * .62, 1.12, VAN.front - .012));
			lenses.push(at(box(.24, .15, .012, .004), sx * .62, 1.12, VAN.front + .014));
			ambers.push(at(box(.12, .06, .03, .008), sx * .62, .99, VAN.front + 0), at(box(.06, .12, .03, .008), sx * .81, 1.1, VAN.rear - .004));
			reds.push(at(box(.12, .24, .03, .008), sx * .79, .88, VAN.rear - .004));
			lenses.push(at(box(.08, .06, .03, .008), sx * .79, .72, VAN.rear - .004));
		}
		const grille = [];
		for (let k = 0; k < 6; k++) grille.push(at(box(.88, .022, .03, .006), 0, 1.03 + k * .05, VAN.front - .012));
		grille.push(at(box(.9, .31, .01, .004), 0, 1.155, VAN.front - .04));
		part({
			id: "lights",
			label: "Lights and grille",
			assembly: "body",
			source: SRC.air,
			what: "Two square sealed-beam headlights with their indicators under them in the nose, the grille between them that lets the air to the radiator; the tail lights, indicators and reversing lights at the back corners.",
			specs: [["Headlights", "Sealed beam, 12 V 60/55 W [inferred]"]]
		}, [
			m(GEO.merge(lights), M.reflector),
			m(GEO.merge(lenses), M.lens),
			m(GEO.merge(reds), M.red),
			m(GEO.merge(ambers), M.amber),
			m(GEO.merge(grille), M.trim)
		], { explode: [
			0,
			0,
			.5
		] });
		const gut = [];
		for (const sx of [-1, 1]) gut.push(cyl([
			sx * .9,
			VAN.roof - .012,
			-2.36
		], [
			sx * .9,
			VAN.roof - .012,
			1.86
		], .01, 8));
		const wip = [];
		for (const wx of [-.45, .3]) wip.push(onEdge(GEO.merge([at(slab(.012, .42, .012), 0, .26, .012), at(slab(.02, .4, .02), .02, .26, .024)]).rotateZ(-.12).translate(wx, 0, 0), ws0, ws1, 0));
		part({
			id: "gutters-wipers",
			label: "Gutters and wipers",
			assembly: "body",
			source: SRC.air,
			what: "The rain gutters along the roof’s edges, where the rack’s feet clamp; the two wipers on the windscreen.",
			specs: [["Wipers", "2 × 450 mm [inferred]"]]
		}, [m(GEO.merge(gut), M.trim), m(GEO.merge(wip), M.trim)], { explode: [
			0,
			.6,
			.3
		] });
	}
	/** @type {ReturnType<typeof hinge>[]} */
	const fdoors = [];
	/** a door's panels, its skin in the two tones @param {V2[]} hole @param {V2[]} win @param {1 | -1} sx */
	const doorPanelsT = (hole, win, sx) => {
		const d = doorPanels(hole, win, {
			x: X,
			sx,
			split: 1.4
		});
		tone(d.skin);
		return d;
	};
	for (const sx of [1, -1]) {
		const h = hinge(body, {
			at: [
				sx * X,
				0,
				F.hinge
			],
			axis: "y",
			max: -sx * 1.2,
			name: `door-${sx > 0 ? "left" : "right"}`
		});
		const d = doorPanelsT(fdoorHole, fdoorWin, sx);
		const mv = (g) => g.translate(-sx * X, 0, -F.hinge);
		const extra = GEO.merge([at(box(.05, .04, .3, .01), sx * (X - .08), 1.08, 1.62), at(box(.02, .025, .08, .006), sx * (X - .07), 1.22, F.z0 + .12)]);
		const outside = GEO.merge([
			at(box(.02, .03, .14, .008), sx * (X + .012), 1.3, F.z0 + .12),
			cyl([
				sx * X,
				1.48,
				2.06
			], [
				sx * (X + .13),
				1.5,
				2.05
			], .012, 8),
			at(box(.05, .19, .12, .02), sx * (X + .16), 1.55, 2.05)
		]);
		const glassM = at(slab(.04, .17, .004), sx * (X + .16), 1.55, 2.05 - .062);
		kit.part(h.pivot, {
			id: `door-${sx > 0 ? "left" : "right"}`,
			label: sx > 0 ? "Front door, left" : "Front door, right (the driver’s)",
			assembly: "doors",
			source: SRC.air,
			what: "A hinged steel door over the front wheel, its window wound down by a handle inside; its mirror on its front corner. It swings out on two hinges at its front edge.",
			moves: "Opens to 70° on its hinges.",
			drive: "By hand (the Doors slider)",
			specs: [["Opening", `${Math.round((F.hinge - F.z0) * 1e3)} × ${Math.round((F.y1 - F.y0) * 1e3)} mm`]]
		}, { explode: [
			sx * .55,
			.1,
			.25
		] }, body);
		h.pivot.add(m(mv(d.skin), M.paint), m(mv(d.glass), M.glass), m(mv(d.card), M.card), m(mv(extra), M.vinyl), m(mv(outside), M.trim), m(mv(glassM), M.chrome));
		fdoors.push(h);
	}
	const slider = slide(body, {
		path: [
			[
				0,
				0,
				0
			],
			[
				.075,
				0,
				-.07
			],
			[
				.075,
				0,
				-.3
			],
			[
				.075,
				0,
				-1.02
			]
		],
		name: "slider"
	});
	{
		const d = doorPanelsT(zyRect(S.z0, S.z1, S.y0, S.y1), zyRect(.3, 1.16, 1.42, 1.94), 1);
		const bits = GEO.merge([
			at(box(.02, .03, .16, .008), X + .012, 1.3, S.z1 - .14),
			cyl([
				X - .03,
				1.34,
				S.z0 + .03
			], [
				X + .012,
				1.34,
				S.z0 - .06
			], .008, 8),
			cyl([
				X + .012,
				1.31,
				S.z0 - .06
			], [
				X + .012,
				1.37,
				S.z0 - .06
			], .014, 12),
			cyl([
				X - .04,
				S.y1 - .04,
				S.z1 - .06
			], [
				X - .12,
				S.y1 - .02,
				S.z1 - .06
			], .008, 8),
			cyl([
				X - .04,
				S.y0 + .05,
				S.z1 - .06
			], [
				X - .12,
				S.y0 + .08,
				S.z1 - .06
			], .008, 8)
		]);
		kit.part(new three.Group().add(m(d.skin, M.paint), m(d.glass, M.glass), m(d.card, M.card), m(bits, M.trim)), {
			id: "sliding-door",
			label: "Sliding door",
			assembly: "doors",
			source: SRC.air,
			what: "The wide door on the left into the seats behind: its rollers run in three rails, top, bottom and the centre rail along the side, that first pull it out of its opening and then slide it back along the van.",
			moves: "Out of its opening, then back along the side (the Doors slider).",
			drive: "By hand",
			specs: [["Opening", `${Math.round((S.z1 - S.z0) * 1e3)} × ${Math.round((S.y1 - S.y0) * 1e3)} mm`], ["Travel", "1,020 mm"]]
		}, { explode: [
			.6,
			.1,
			0
		] }, slider.carriage);
	}
	const gauges = cluster(kit, {
		dials: [{
			x: -.07,
			y: 0,
			r: .055,
			max: 140
		}, {
			x: .07,
			y: 0,
			r: .055,
			max: 5e3,
			ticks: 11
		}],
		face: M.dial,
		tick: M.white,
		needle: M.needle,
		bezel: M.chrome,
		housing: M.dash
	});
	{
		part({
			id: "engine-cover",
			label: "Engine cover",
			assembly: "cab",
			source: SRC.eng,
			what: "The padded box between the front seats over the engine (the “doghouse”): lift it off to reach the engine from inside; its lining keeps the noise and heat out of the cab.",
			specs: [["Lining", "Felt and vinyl [inferred]"]]
		}, [m(at(box(.6, 1 - floor, 1.28, .07, 3), 0, (floor + 1) / 2, 1.48), M.vinyl)], {
			explode: [
				0,
				.9,
				0
			],
			xray: "shell"
		});
		const f = seatGeometry({
			w: .48,
			d: .5,
			h: .32,
			back: .62,
			rake: .26
		});
		const fronts = [-1, 1].map((sx) => [f.fabric.clone().translate(sx * .57, floor, VAN.driver.z), f.base.clone().translate(sx * .57, floor, VAN.driver.z)]);
		part({
			id: "front-seats",
			label: "Front seats",
			count: 2,
			assembly: "cab",
			source: SRC.air,
			what: "The driver’s seat and one passenger’s, each side of the engine’s cover, on pedestals over the front wheel housings.",
			specs: [["Cover", "Striped moquette, worn"]]
		}, [m(GEO.merge(fronts.map((p) => p[0])), M.fabric), m(GEO.merge(fronts.map((p) => p[1])), M.vinyl)], { explode: [
			0,
			.7,
			.1
		] });
		const b2 = seatGeometry({
			w: 1.2,
			d: .48,
			h: .32,
			back: .6,
			rake: .22
		});
		part({
			id: "middle-bench",
			label: "Middle bench",
			assembly: "cab",
			source: SRC.air,
			what: "A bench for three behind the front seats, an aisle beside it to the sliding door.",
			specs: [["Seats", "3"]]
		}, [m(b2.fabric.translate(-.27, floor, -.02), M.fabric), m(b2.base.translate(-.27, floor, -.02), M.vinyl)], { explode: [
			0,
			.75,
			0
		] });
		const b3 = seatGeometry({
			w: 1.76,
			d: .48,
			h: .32,
			back: .6,
			rake: .22
		});
		part({
			id: "rear-bench",
			label: "Rear bench",
			assembly: "cab",
			source: SRC.air,
			what: "The full-width bench at the back, over the rear axle’s front; the luggage behind it.",
			specs: [["Seats", "4"]]
		}, [m(b3.fabric.translate(0, floor, -1.12), M.fabric), m(b3.base.translate(0, floor, -1.12), M.vinyl)], { explode: [
			0,
			.8,
			-.1
		] });
		const dash = GEO.merge([
			at(box(1.8, .3, .42, .03, 2), 0, 1.3, 1.95),
			at(box(1.82, .06, .34, .02, 2), 0, 1.47, 2),
			at(box(.32, .11, .06, .02), VAN.driver.x, 1.4, 1.73)
		]);
		const faces = GEO.merge([
			at(slab(.36, .13, .01), .52, 1.24, 1.735),
			at(slab(.18, .05, .012), 0, 1.33, 1.735),
			...[
				-.82,
				-.25,
				.25,
				.82
			].map((x) => at(slab(.1, .04, .01), x, 1.4, 1.735))
		]);
		gauges.group.position.set(VAN.driver.x, 1.38, 1.7);
		gauges.group.rotation.x = .3;
		part({
			id: "dashboard",
			label: "Dashboard and gauges",
			assembly: "cab",
			source: SRC.air,
			what: "The moulded dashboard under the windscreen: the speedometer and the rev counter in their binnacle before the driver, the radio, four vents, the glovebox.",
			moves: "Its needles show the speed and the engine’s revs.",
			specs: [["Gauges", "Speed to 140 km/h, revs to 5,000 rpm"]]
		}, [
			m(dash, M.dash),
			m(faces, M.vinyl),
			gauges.group
		], {
			explode: [
				0,
				.5,
				.4
			],
			tag: {
				text: "Gauges",
				at: [
					VAN.driver.x,
					1.45,
					1.7
				],
				side: "right",
				value: () => `${fmt(kmh())} km/h · ${fmt(sim.s.rpm)} rpm`
			}
		});
		const sw = steeringWheelGeometry({
			R: .2,
			column: .5
		});
		const wheel = new three.Group();
		wheel.add(m(sw.rim, M.vinyl), m(sw.hub, M.dash), m(sw.column, M.dash));
		wheel.position.set(...VAN.wheel);
		wheel.rotation.x = .95;
		part({
			id: "steering-wheel",
			label: "Steering wheel and column",
			assembly: "cab",
			source: SRC.air,
			what: "A large, nearly flat wheel, as on a bus, on its column down to the floor, where a shaft with two universal joints runs to the rack.",
			moves: "Turned by the driver (held straight here).",
			specs: [["Diameter", "400 mm"]]
		}, [wheel], { explode: [
			0,
			.55,
			.1
		] });
		const ped = [];
		for (const [dx, w] of [
			[-.13, .06],
			[-.02, .08],
			[.1, .05]
		]) ped.push(cyl([
			VAN.driver.x + dx,
			1.12,
			1.86
		], [
			VAN.driver.x + dx,
			.8,
			1.68
		], .008, 8), at(box(w, .09, .012, .004), VAN.driver.x + dx, .77, 1.67));
		ped.push(cyl([
			-.31,
			floor + .02,
			.9
		], [
			-.31,
			floor + .2,
			1.08
		], .012, 8));
		part({
			id: "pedals",
			label: "Pedals and handbrake",
			count: 3,
			assembly: "cab",
			source: SRC.air,
			what: "Clutch, brake and accelerator hanging from under the dashboard; the handbrake lever by the driver’s seat pulls the rear drums’ shoes by cable.",
			specs: [["Brakes", "Servo-assisted hydraulic, two circuits"]]
		}, [m(GEO.merge(ped), M.vinyl)], { explode: [
			0,
			.4,
			.3
		] });
	}
	{
		const y = 2.33;
		const r = [];
		for (const sx of [-1, 1]) r.push(bar([
			sx * .85,
			y,
			-2.1
		], [
			sx * .85,
			y,
			1.9
		], .02, 12));
		for (const z of [
			-2.1,
			-.7,
			.6,
			1.9
		]) {
			r.push(bar([
				-.85,
				y,
				z
			], [
				.85,
				y,
				z
			], .017, 10));
			for (const sx of [-1, 1]) r.push(bar([
				sx * .85,
				y,
				z
			], [
				sx * .9,
				VAN.roof + .005,
				z
			], .014, 8), at(box(.05, .04, .06, .008), sx * .9, VAN.roof + .01, z));
		}
		part({
			id: "roof-rack",
			label: "Roof rack",
			assembly: "roof",
			source: SRC.air,
			what: "A welded tube rack clamped to the roof’s gutters on eight feet: two rails and four crossbars to tie the load to.",
			specs: [["Tube", "Ø 40 mm steel"], ["Load", "Up to 100 kg on the roof [inferred]"]]
		}, [m(GEO.merge(r), M.rack)], { explode: [
			0,
			1,
			0
		] });
		const bag = (w, h, d, x, z) => {
			const yc = 2.35 + h / 2;
			return {
				shell: at(box(w, h, d, Math.min(.08, h / 3), 3), x, yc, z),
				straps: GEO.merge([
					at(box(w + .008, h + .008, .035, .01), x, yc, z - d / 4),
					at(box(w + .008, h + .008, .035, .01), x, yc, z + d / 4),
					at(new three.TorusGeometry(.06, .01, 6, 16, Math.PI), x, yc + h / 2, z)
				])
			};
		};
		const bags = [
			[
				"bag-red",
				"Red holdall",
				M.bagRed,
				.7,
				.4,
				.9,
				-.4,
				-1.3,
				.9
			],
			[
				"bag-blue",
				"Blue holdall",
				M.bagBlue,
				.6,
				.35,
				.8,
				.4,
				-1.2,
				1.05
			],
			[
				"bag-green",
				"Green duffel",
				M.bagGreen,
				.8,
				.45,
				.7,
				.25,
				.1,
				1.2
			]
		];
		for (const [id, label, mat, w, h, d, x, z, up] of bags) {
			const b = bag(w, h, d, x, z);
			part({
				id,
				label,
				assembly: "roof",
				source: SRC.air,
				what: "A soft canvas bag of the travellers’ things, strapped shut and tied to the rack.",
				specs: [["Size", `${Math.round(w * 100)} × ${Math.round(d * 100)} × ${Math.round(h * 100)} cm`], ["Weight", "~20 kg [inferred]"]]
			}, [m(b.shell, mat), m(b.straps, M.trim)], { explode: [
				0,
				up + .4,
				0
			] });
		}
		part({
			id: "sack",
			label: "Sack of rice",
			assembly: "roof",
			source: SRC.air,
			what: "A woven sack of rice, its neck tied off, lying on the rack.",
			specs: [["Weight", "25 kg"]]
		}, [m(at(box(.6, .35, .9, .16, 3), -.4, 2.525, .2), M.sack), m(cyl([
			-.4,
			2.52,
			.64
		], [
			-.4,
			2.52,
			.74
		], .05, 12), M.sack)], { explode: [
			0,
			1.5,
			0
		] });
		const spare = GEO.lathe([
			[.18, -.088],
			[.25, -.092],
			[.305, -.08],
			[.322, -.045],
			[.322, .045],
			[.305, .08],
			[.25, .092],
			[.18, .088]
		], 40).translate(0, 2.4450000000000003, 1.4);
		part({
			id: "spare-tyre",
			label: "Spare wheel",
			assembly: "roof",
			source: SRC.tyre,
			what: "A fifth wheel and tyre lying flat on the front of the rack.",
			specs: [["Tyre", TYRE.code]]
		}, [m(spare, R.tyre), m(latheY([
			[.05, -.055],
			[.178, -.055],
			[.178, .055],
			[.05, .055]
		], 32).translate(0, 2.4450000000000003, 1.4), R.rimSteel)], { explode: [
			0,
			1,
			.3
		] });
		const ropes = [
			hose([
				[
					-.85,
					y,
					-1.3
				],
				[
					-.72,
					2.7600000000000002,
					-1.3
				],
				[
					0,
					2.77,
					-1.28
				],
				[
					.7,
					2.72,
					-1.22
				],
				[
					.85,
					y,
					-1.2
				]
			], .006, 6),
			hose([
				[
					-.85,
					y,
					.15
				],
				[
					-.6,
					2.71,
					.15
				],
				[
					.1,
					2.83,
					.12
				],
				[
					.62,
					2.81,
					.1
				],
				[
					.85,
					y,
					.1
				]
			], .006, 6),
			hose([
				[
					-.85,
					y,
					1.4
				],
				[
					-.3,
					2.5700000000000003,
					1.4
				],
				[
					.3,
					2.5700000000000003,
					1.4
				],
				[
					.85,
					y,
					1.4
				]
			], .006, 6)
		];
		part({
			id: "ropes",
			label: "Ropes",
			count: 3,
			assembly: "roof",
			source: SRC.air,
			what: "Three ropes over the load, tied off to the rack’s rails.",
			specs: [["Rope", "6 mm polypropylene"]]
		}, [m(GEO.merge(ropes), M.strap)], { explode: [
			0,
			1.7,
			0
		] });
	}
	const ctl = {
		speed: {
			label: "Speed asked",
			min: 0,
			max: 120,
			value: speed,
			step: 1,
			unit: "km/h",
			ends: ["Standing", "120 km/h"]
		},
		grade: {
			label: "Grade",
			min: -15,
			max: 35,
			value: grade,
			step: .5,
			unit: "%",
			ends: ["Downhill", "Steep climb"]
		},
		load: {
			label: "Load inside (people and bags)",
			min: 0,
			max: VEHICLE.payload,
			value: load,
			step: 10,
			unit: "kg",
			ends: ["Empty", "Full payload"]
		},
		doors: {
			label: "Doors open",
			min: 0,
			max: 1,
			value: doors,
			step: .01,
			digits: 2,
			ends: ["Shut", "Open"]
		}
	};
	/** what the driver is asked for: the sliders, or the break's overload up its hill @param {{ broken: boolean }} env */
	const input = (env) => ({
		vSet: ctl.speed.value * KMH,
		grade: env.broken ? .35 : ctl.grade.value / 100,
		load: env.broken ? VEHICLE.payload * 2.5 : ctl.load.value
	});
	sim.settle(input({ broken: false }));
	let fanA = 0;
	kit.onTick((dt, env) => {
		const inp = input(env);
		sim.step(dt, inp);
		const s = sim.s;
		const al = (s.sagF - s.sagR) / VEHICLE.axles.wb;
		body.rotation.x = al;
		body.position.y = -s.sagF + al * axle.front;
		body.updateMatrix();
		for (const c of Object.values(corners)) c.set(s.wheelAng);
		for (const f of front) f.update();
		rearAxle.update(s.sagR, s.wheelAng, s.propAng);
		engine.update(s.engAng, s.propAng, s.launch);
		shaft.set([
			inFrame(body, engine.points.out),
			inFrame(body, BEARING),
			PINION
		], s.propAng);
		fanA -= (heat() > 8 ? 2200 / 60 / 40 : 0) * Math.PI * 2 * dt;
		fan.rotation.z = fanA;
		const k = clamp(ctl.doors.value);
		for (const d of fdoors) d.set(k);
		slider.set(k);
		gauges.set([kmh(), s.rpm]);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || lug && s.gear === 1 || s.bottomed;
		r.state = s.stalled ? env.broken ? `stalled: ${fmt(VEHICLE.payload * 2.5)} kg in it up a 35 % grade` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `full throttle in ${ordinal(s.gear)}` : s.Fb > 1 ? inp.grade < -.005 ? `braking down the hill in ${ordinal(s.gear)}` : `braking to the speed asked in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : s.v > inp.vSet + .5 ? `easing off to the speed asked in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? `first gear gives at most ${fmt(s.can)} N at the wheels, the hill and the road take ${fmt(s.need)} N · ${env.broken ? "take the break back" : "move a slider"} to start it again` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3, 1)} kW at the flywheel · the road takes ${fmt(s.road.F)} N (rolling ${fmt(s.road.roll)}, climbing ${fmt(s.road.climb)}, air ${fmt(s.road.air)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 2)} L/h`}${s.bottomed ? " · the springs on their bump stops" : ""}`;
	});
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power at the wheels",
			unit: "kW",
			max: 60,
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
			text: "A driver holds the speed asked: the road takes a force to roll the tyres, to lift the van up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the axle’s losses at the engine. The driver picks the highest gear that gives that push without the engine running too slow, opens the throttle for it, and brakes downhill when even the shut throttle pushes too much. Where first gear on the engine’s full-load curve gives less than the hill takes, the speed falls, the engine lugs down and stalls. The fuel comes from the engine’s work plus its own friction. The axles’ loads shift back up a hill and as it pulls, and the springs sink by the load over their rates. The doors are moved by their slider alone. Shown slowed: the wheels 10 times, the engine, the gearbox and the propshaft 40 times.",
			eqs: [
				"F = m g Crr cos θ + m g sin θ + ½ ρ Cd A v²      m = 1,950 kg + load, Crr = 0.011, Cd A = 1.62 m²",
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.90",
				"n = (v / r) · i_gear · i_axle      r = 0.316 m, i = 4.00 … 0.80, i_axle = 4.30",
				"T_engine ≤ T_full(n)      152 N·m at 2,400 rpm, 131 N·m at 4,000",
				"m_eff dv/dt = T i η / r − F      m_eff = m + (4 J_w + J_e i² η) / r²",
				"fuel = (T + T_friction) ω · 200 g/kWh      T_friction from 1.6 bar",
				"sag = ΔF_axle / k      k = 32 kN/m front, 52 kN/m rear (a wheel)"
			]
		},
		breakIt: {
			label: "Overload it up a 35 % hill",
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
				.45,
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
const HISTORY = /* @__PURE__ */ (() => ({ van: [{
	...FIRST,
	date: "2026-10-14"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "van",
	label: "Travel van",
	note: "the old minibus of the MaiaCity intro, built at AirSup’s realism: every part its own in measured materials (a ladder frame, wishbones and leaf springs, a 2.4 L diesel under the cover between the front seats with its pistons, crank, camshaft and gears to cut open, a 5-speed gearbox and a live axle), its doors open, and a solver drives it: the power at its wheels to hold a speed on a grade with a load, its gear, revs and fuel, its springs sinking; overloaded up a steep hill it lugs and stalls",
	from: "MaiaCity V1: the intro’s travel van",
	variants: [{
		id: "van",
		label: "Travel van",
		note: "5.3 × 1.9 m, 2.13 m to its roof and 2.84 m to its bags; two-tone, faded and rusting; a sliding door and two front doors; eleven seats; 1,950 kg with its roof load",
		make: () => castOf(van())
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