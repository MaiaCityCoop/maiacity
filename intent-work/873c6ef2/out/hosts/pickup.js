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
const { MAT, GEO, fmt, clamp } = require("f17f8358fd4bca21830facf59f17092bc9250f126123f848212da085a3789833");
//#endregion
//#region src/lib/assets/parts.js
const { assetKit, castOf } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
//#endregion
//#region src/lib/machines/powercube.js
const { powerCube, CUBE } = require("44c5df1d50edb05cb0415b65836e78faaa3b3816474d95c3517da725c09d47b5");
//#endregion
//#region src/lib/machines/vehicle.js
const { tyreSize, plate, vehicleMaterials, engineMaterials, vehicleSolver, ladderFrame, at, box, G, wheelCorner, latheY, cyl, doubleWishbone, steeringRack, liveAxle, inlineEngine, ordinal, propshaft, slab, circle, roundPoly, hose, insetEdges, zyShape, zyHole, onX, roundHole, onEdge, edgePanel, xz, onY, halfCut, hinge, doorPanels, cluster, seatGeometry, steeringWheelGeometry, unitBar, frameY, inFrame, aim } = require("5c7ac999d7434d04e4dea7109f6f810baf783a3a3d17f1da078c1fee3b37fcae");
//#endregion
//#region src/lib/machines/pickup.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** the pickup's measures (m): its body's width, its ends, the axles, its floors, waist and roof, its doors and its bed */
const PU = {
	W: 1.86,
	front: 2.56,
	rear: -2.58,
	axle: {
		front: 1.92,
		rear: -1.22,
		x: .775
	},
	floor: .62,
	sill: .5,
	waist: 1.28,
	roof: 1.82,
	/** the cab's back wall and the firewall under the windscreen */
	cab: {
		back: -.68,
		firewall: 1.5
	},
	/** the driver's seat (x, z) and the steering wheel's hub */
	driver: {
		x: .42,
		z: .62
	},
	wheel: [
		.42,
		1.2,
		1.12
	],
	/** the door openings (z from the back edge to the hinge), their bottom and top */
	door: {
		front: [.47, 1.4],
		rear: [-.55, .39],
		y0: .56,
		y1: 1.72
	},
	/** the bed: its outer front wall, its floor, its sides' top and bottom, its inner walls (x) */
	bed: {
		front: -.74,
		floor: .9,
		top: 1.3,
		skirt: .62,
		inner: .78,
		tub: .56
	},
	/** where the Power Cube stands on the bed */
	cube: [
		0,
		.9,
		-1.42
	]
};
const TYRE = /* @__PURE__ */ (() => tyreSize(265, 70, 16))();
/** the Power Cube's mass (kg): about 400 lb, OSE's wiki */
const CUBE_KG = 181;
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
		label: "Power Cube (Open Source Ecology wiki)",
		url: "https://wiki.opensourceecology.org/wiki/Power_Cube"
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
	susp: SOURCES[4].label,
	cube: SOURCES[5].label
}))();
const ASSEMBLIES = [
	{
		id: "chassis",
		label: "Chassis and suspension",
		note: "The ladder frame, kicked up over the rear axle; double wishbones and coil-overs in front with the rack-and-pinion, a live axle on leaf springs behind.",
		out: [
			0,
			-.7,
			0
		]
	},
	{
		id: "wheels",
		label: "Wheels and brakes",
		note: "Four 265/70 R16 tyres on steel wheels and a fifth under the bed; vented discs and callipers in front, drums behind.",
		out: [
			.5,
			-.2,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "A 2.5 L four-cylinder turbo-diesel under the bonnet, 75 kW and 240 N·m.",
		out: [
			0,
			.5,
			.3
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
		note: "The radiator in the nose, the battery and the air filter beside the engine, the fuel tank under the cab, the exhaust.",
		out: [
			0,
			-.35,
			.2
		]
	},
	{
		id: "body",
		label: "Cab",
		note: "The steel cab on its rubber mounts: its sides, nose, bonnet, roof and back wall, the floor, the glass, the lights and bumpers.",
		out: [
			0,
			.9,
			.2
		]
	},
	{
		id: "doors",
		label: "Doors",
		note: "Four doors, each on two hinges at its front edge.",
		out: [
			.6,
			.3,
			0
		]
	},
	{
		id: "cab",
		label: "Seats and dashboard",
		note: "The dashboard and its gauges, the steering wheel and pedals, the console and the lever, two seats in front and a bench for three behind.",
		out: [
			0,
			.6,
			0
		]
	},
	{
		id: "bed",
		label: "Bed and tailgate",
		note: "The steel bed behind the cab on its own mounts: its floor, its double-walled sides and wheel tubs, the tailgate on its hinges and check cables.",
		out: [
			0,
			.6,
			-.9
		]
	}
];
const STEPS = [
	"Weld the frame and hang the suspension, the axle and the steering on it",
	"Bolt on the wheels and brakes",
	"Drop in the engine on its mounts",
	"Bolt on the gearbox; fit the propshaft and the axle’s gears",
	"Fit the radiator, battery, air filter, fuel tank and exhaust",
	"Lower the cab onto the frame; fit the glass, lights and bumpers",
	"Hang the doors",
	"Fit the dashboard, the steering wheel, the seats",
	"Bolt the bed on behind the cab and hang its tailgate"
];
/** the pickup's paint and trim (sRGB-ish values as the kit's materials take them) */
function materials() {
	return {
		paint: MAT.paint({
			color: [
				.12,
				.24,
				.36
			],
			roughness: .42,
			clearcoat: .3,
			clearcoatRoughness: .35
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
				.21,
				.23
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
				.05,
				.052
			],
			roughness: .7
		}),
		card: MAT.plastic({
			color: [
				.2,
				.2,
				.21
			],
			roughness: .85
		}),
		lining: MAT.satin({
			color: [
				.45,
				.44,
				.41
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
		liner: MAT.plastic({
			color: [
				.035,
				.035,
				.04
			],
			roughness: .92
		}),
		strap: MAT.satin({
			color: [
				.85,
				.45,
				.04
			],
			roughness: .8
		}),
		cable: MAT.steel({
			color: [
				.6,
				.6,
				.62
			],
			roughness: .35
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
* The cab's side profile, (z, y) anticlockwise from its back bottom: the sill with the front wheel's arch cut up into
* it, the nose, the bonnet, the cowl, the windscreen, the roof, the back wall. Each edge's radius: how far its panel's
* rounded edge reaches round onto the side (0 along the sill and the arch).
* @returns {{ pts: V2[], r: number[], seg: boolean[], k0: number }}
*/
function profile() {
	const { axle, sill, front, roof, cab } = PU;
	const yw = TYRE.r - .01, Ra = .46;
	/** @type {V2[]} */
	const pts = [[cab.back, sill]];
	const a0 = Math.PI - Math.asin((sill - yw) / Ra), a1 = Math.asin((sill - yw) / Ra);
	for (let k = 0; k <= 14; k++) {
		const a = a0 + (a1 - a0) * k / 14;
		pts.push([axle.front + Ra * Math.cos(a), yw + Ra * Math.sin(a)]);
	}
	const k0 = pts.length;
	pts.push([front - .06, sill], [front, .62], [front + .02, 1], [front - .02, 1.1], [1.6, 1.25], [1.52, 1.26], [1.16, 1.77], [1.08, roof], [cab.back + .08, roof], [cab.back, roof - .06]);
	const er = [
		.06,
		.08,
		.08,
		.08,
		.05,
		.06,
		.06,
		.06,
		.05,
		.05
	];
	/** @type {number[]} */
	const r = [];
	/** @type {boolean[]} */
	const seg = [];
	for (let k = 0; k < pts.length; k++) {
		r.push(k < k0 ? 0 : er[k - k0]);
		seg.push(k >= k0);
	}
	return {
		pts,
		r,
		seg,
		k0
	};
}
/**
* The bed's side, (z, y) anticlockwise from its back bottom: its skirt with the rear wheel's arch cut up into it, its
* front, its top, its back post; and its corners' radii.
* @returns {{ pts: V2[], r: number[] }}
*/
function bedSide() {
	const { axle, bed, rear } = PU;
	const yw = TYRE.r - .01, Ra = .47;
	/** @type {V2[]} */
	const pts = [[rear, bed.skirt]];
	const r = [.03];
	const a0 = Math.PI - Math.asin((bed.skirt - yw) / Ra), a1 = Math.asin((bed.skirt - yw) / Ra);
	for (let k = 0; k <= 14; k++) {
		const a = a0 + (a1 - a0) * k / 14;
		pts.push([axle.rear + Ra * Math.cos(a), yw + Ra * Math.sin(a)]);
		r.push(0);
	}
	pts.push([bed.front, bed.skirt], [bed.front, bed.top], [rear, bed.top]);
	r.push(.03, .03, .03);
	return {
		pts,
		r
	};
}
/** an arched strip over a wheel, from x0 to x1 (both sides), its middle at (zc, yc) @param {number} R @param {number} a0 @param {number} a1 @param {number} x0 @param {number} x1 @param {number} zc @param {number} yc */
function archStrip(R, a0, a1, x0, x1, zc, yc) {
	const s = new three.Shape();
	s.absarc(0, 0, R + .006, a1, a0, false);
	s.absarc(0, 0, R, a0, a1, true);
	s.closePath();
	return [-1, 1].map((sx) => plate(s, x1 - x0, 6).rotateY(Math.PI / 2).translate(sx * (x0 + (x1 - x0) / 2), yc, zc));
}
/** the pickup as the solver runs it [inferred where marked in the research] */
const VEHICLE = /* @__PURE__ */ (() => ({
	kerb: 1750,
	payload: 950,
	Crr: .012,
	CdA: 1.25,
	r: TYRE.r * .97,
	eta: .9,
	gears: [
		4.31,
		2.33,
		1.44,
		1,
		.84
	],
	final: 4.1,
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
			92,
			140,
			205,
			240,
			236,
			224,
			199,
			180,
			80
		],
		idle: 750,
		stall: 540,
		max: 4400,
		up: 3500,
		down: 1300,
		launch: 1200,
		Vd: .0025,
		fmep: 17e4,
		bsfc: 205,
		fuel: "diesel",
		J: .3
	},
	Jw: 1.4,
	wheels: 4,
	axles: {
		wb: PU.axle.front - PU.axle.rear,
		h: .8,
		front: .57,
		loadFront: .2,
		k: [45e3, 6e4],
		travel: [.08, .1]
	}
}))();
const KMH = 1 / 3.6;
/**
* The pickup: a root at its real size, every part its own, its solver driving it; with `cube` the Power Cube (v3)
* carried on its bed.
* @param {{ speed?: number, grade?: number, load?: number, doors?: number, tailgate?: number, cube?: boolean }} [o] the
*   speed asked (km/h), the grade (%), the load in it (kg, people and cargo, the cube's own mass besides), how far its
*   doors and its tailgate are open (0 shut … 1 open), and whether the Power Cube rides on its bed
* @returns {THREE.Group}
*/
function pickup({ speed = 90, grade = 0, load = 200, doors = 0, tailgate = 0, cube = false } = {}) {
	const root = new three.Group();
	root.name = cube ? "Pickup with a Power Cube" : "Pickup";
	const M = materials(), R = vehicleMaterials(), E = engineMaterials();
	const steps = cube ? [...STEPS, "Lift the Power Cube onto the bed and strap it down"] : STEPS;
	const sources = cube ? SOURCES : SOURCES.filter((s) => s.label !== SRC.cube);
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps,
		sources
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
	const { W, axle, floor, bed } = PU, X = W / 2;
	const yw = TYRE.r - .01;
	const sim = vehicleSolver(VEHICLE);
	const kmh = () => sim.s.v * 3.6;
	const extra = cube ? 181 : 0;
	const rails = [
		[2.5, .5],
		[.95, .5],
		[-.4, .5],
		[-.64, .68],
		[-2.52, .68]
	];
	{
		const g = [ladderFrame({
			x: .44,
			w: .065,
			h: .14,
			t: .0045,
			path: rails,
			cross: [
				2.45,
				.45,
				-.95,
				-1.75,
				-2.45
			]
		})];
		g.push(at(box(.84, .08, .12, .01), 0, .32, axle.front));
		for (const sx of [-1, 1]) {
			g.push(at(box(.05, .16, .12, .008), sx * .4, .39, axle.front), at(box(.05, .06, .44, .008), sx * .3, .29, axle.front));
			g.push(at(box(.13, .27, .15, .012), sx * .5, .7, axle.front), at(box(.05, .1, .05, .006), sx * .47, .6, axle.front + .15), at(box(.05, .1, .05, .006), sx * .47, .6, axle.front - .15));
			g.push(at(box(.08, .02, .12, .004), sx * .42, .578, 1.76));
			for (const z of [
				1.35,
				.42,
				-.55
			]) g.push(at(box(.14, .04, .07, .006), sx * .5, .56, z));
			g.push(at(box(.06, .05, .06, .012), sx * .47, .585, axle.rear));
		}
		g.push(at(box(.84, .05, .08, .008), 0, .44, .84), at(box(.05, .08, .08, .006), .39, .47, .84), at(box(.05, .08, .08, .006), -.39, .47, .84));
		g.push(at(box(.84, .08, .08, .008), 0, .56, -2.5), at(box(.07, .07, .34, .006), 0, .5, -2.52), at(box(.12, .012, .1, .004), 0, .53, -2.38));
		part({
			id: "frame",
			label: "Ladder frame",
			assembly: "chassis",
			source: SRC.susp,
			what: "Two boxed steel rails the length of the pickup, low under the cab and kicked up over the rear axle so it can rise under the bed, joined by crossmembers; the cab and the bed sit on it on rubber mounts, the engine between its rails. A dropped crossmember carries the front suspension, another the gearbox’s tail, and the hitch’s receiver is welded to the last.",
			specs: [["Rails", "140 × 65 × 4.5 mm box [inferred]"], ["Kick-up", "180 mm over the axle"]]
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
			.22,
			0
		],
		side: "left",
		value: () => `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm · ${fmt((which.startsWith("front") ? sim.s.loadF : sim.s.loadR) / G)} kg on it`
	});
	const wheelOpts = {
		size: TYRE,
		rimW: 7 * .0254,
		et: .03,
		rim: "steel",
		studs: 6,
		pcd: .1397,
		pattern: "allTerrain",
		M: R,
		assembly: "wheels",
		source: SRC.tyre,
		capMat: M.chrome
	};
	const disc = {
		r: .145,
		rIn: .09,
		t: .026
	}, drum = {
		r: .148,
		depth: .08
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
			disc,
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
			disc,
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
			drum,
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
			drum,
			drive: "The half-shaft, from the differential"
		})
	};
	{
		const ys = .33, zs = -2;
		const spare = GEO.lathe([
			[.205, -.12],
			[.3, -.13],
			[.37, -.115],
			[.389, -.06],
			[.389, .06],
			[.37, .115],
			[.3, .13],
			[.205, .12]
		], 40).translate(0, ys, zs);
		const rim = latheY([
			[.06, -.09],
			[.204, -.09],
			[.204, .09],
			[.06, .09]
		], 32).translate(0, ys, zs);
		const cradle = GEO.merge([
			at(box(.5, .012, .05, .004), 0, .195, zs),
			at(box(.05, .012, .5, .004), 0, .195, zs),
			cyl([
				0,
				.2,
				zs
			], [
				0,
				.62,
				zs
			], .004, 6)
		]);
		part({
			id: "spare-wheel",
			label: "Spare wheel",
			assembly: "wheels",
			source: SRC.tyre,
			what: "A fifth wheel and tyre hung flat under the back of the bed on a cable: a crank through the bumper winds it down.",
			specs: [["Tyre", TYRE.code]]
		}, [
			m(spare, R.tyre),
			m(rim, R.rimSteel),
			m(cradle, R.chassis)
		], { explode: [
			0,
			-.5,
			-.3
		] });
	}
	const front = ["fl", "fr"].map((id) => {
		const sx = id === "fl" ? 1 : -1;
		return doubleWishbone(kit, {
			id,
			label: id === "fl" ? "front left" : "front right",
			corner: corners[id],
			body,
			upper: [[
				sx * .46,
				.63,
				axle.front + .15
			], [
				sx * .46,
				.63,
				axle.front - .15
			]],
			lower: [[
				sx * .29,
				.27,
				axle.front + .19
			], [
				sx * .29,
				.27,
				axle.front - .19
			]],
			top: [
				sx * .5,
				.82,
				axle.front
			],
			rack: [
				sx * .36,
				.34,
				axle.front + .22
			],
			coil: {
				R: .056,
				wire: .012,
				turns: 5.5,
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
		y: .34,
		z: axle.front + .22,
		half: .42,
		pinion: .3,
		shaft: [
			[
				.3,
				.39,
				axle.front + .23
			],
			[
				.38,
				.72,
				1.86
			],
			[
				.42,
				1,
				1.575
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
		springX: .47,
		over: false,
		leaf: {
			L: 1.25,
			w: .06,
			t: .009,
			n: 5,
			camber: .09
		},
		hanger: .62,
		dampers: [[
			.38,
			.64,
			-.96
		], [
			-.38,
			.64,
			-.96
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
				.47,
				.32,
				-1.6
			],
			side: "left",
			value: () => `sunk ${fmt(sim.s.sagR * 1e3)} mm${sim.s.sagR > VEHICLE.axles.travel[1] ? " · on the bump stops" : ""}`
		}
	});
	const engine = inlineEngine(kit, {
		parent: body,
		at: [
			0,
			.68,
			1.76
		],
		bore: .093,
		stroke: .092,
		rod: .155,
		pitch: .104,
		turbo: true,
		fan: true,
		compression: 21,
		well: "rear",
		gears: VEHICLE.gears,
		lever: [
			0,
			.43,
			-.76
		],
		mounts: [[
			.42,
			-.09,
			0
		], [
			-.42,
			-.09,
			0
		]],
		rearMount: [
			0,
			-.18,
			-.92
		],
		assembly: "engine",
		gearAssembly: "drivetrain",
		source: SRC.eng,
		name: "2.5 L turbo-diesel",
		specs: [
			["Power", "75 kW at 3,600 rpm [inferred]"],
			["Torque", "240 N·m at 2,000 rpm [inferred]"],
			["Injection", "Indirect, 21 : 1, turbocharged"],
			["Friction", "1.7 bar mean pressure at 2,000 rpm [inferred]"]
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
		.52,
		-.1
	];
	const PINION = [
		0,
		yw - .01,
		axle.rear + .065 + .212
	];
	part({
		id: "bearing-bracket",
		label: "Centre bearing bracket",
		assembly: "drivetrain",
		source: SRC.eng,
		what: "A pressed-steel bracket under the cab’s floor holding the propshaft’s centre bearing in its rubber.",
		specs: [["Rubber", "Bonded ring [inferred]"]]
	}, [m(GEO.merge([
		at(box(.22, .01, .06, .003), 0, .592, -.1),
		at(box(.012, .05, .05, .003), -.1, .57, -.1),
		at(box(.012, .05, .05, .003), .1, .57, -.1)
	]), R.chassis)], { explode: [
		0,
		-.3,
		0
	] });
	{
		const zr = 2.32, yr = .86, wr = .66, hr = .38;
		const fins = [];
		for (let k = 0; k <= 56; k++) fins.push(slab(6e-4, hr, .036).translate(-.66 / 2 + k * wr / 56, yr, zr));
		const core = GEO.merge([at(box(wr, hr, .03, .002), 0, yr, zr), ...fins]);
		const tanks = GEO.merge([
			at(box(.72, .05, .06, .012), 0, 1.075, zr),
			at(box(.72, .05, .06, .012), 0, yr - hr / 2 - .025, zr),
			cyl([
				.22,
				1.1,
				zr
			], [
				.22,
				1.12,
				zr
			], .022, 20)
		]);
		const ring = new three.Shape();
		ring.absarc(0, 0, .215, 0, Math.PI * 2, false);
		ring.holes.push(circle(0, 0, .2));
		const face = roundPoly([
			[-.66 / 2, -.38 / 2],
			[wr / 2, -.38 / 2],
			[wr / 2, hr / 2],
			[-.66 / 2, hr / 2]
		], .02);
		face.holes.push(circle(0, 0, .205));
		const sh = GEO.merge([plate(ring, .08, 24).translate(0, yr, 2.25), plate(face, .006, 6).translate(0, yr, 2.294)]);
		const wo = engine.points.waterOut, wi = engine.points.waterIn;
		const hoses = [hose([
			[
				.26,
				1.07,
				2.29
			],
			[
				.2,
				1.07,
				2.1999999999999997
			],
			[
				wo[0] + .05,
				wo[1],
				wo[2] + .12
			],
			wo
		], .019, 8), hose([
			[
				-.26,
				yr - hr / 2 - .02,
				2.29
			],
			[
				-.2,
				yr - hr / 2 - .04,
				2.17
			],
			[
				wi[0] - .05,
				wi[1] - .05,
				wi[2] + .1
			],
			wi
		], .019, 8)];
		part({
			id: "radiator",
			label: "Radiator and shroud",
			assembly: "services",
			source: SRC.eng,
			what: "In the nose behind the grille: the engine’s coolant runs down through the radiator’s finned tubes and gives its heat to the air the road and the engine’s fan pull through it; the shroud round the fan makes it pull through all of the core.",
			specs: [["Core", `${Math.round(wr * 1e3)} × ${Math.round(hr * 1e3)} mm, aluminium [inferred]`], ["Rejects", "About a third of the fuel’s heat at full load"]]
		}, [
			m(core, M.core),
			m(tanks, E.plastic),
			m(sh, E.plastic),
			m(GEO.merge(hoses), E.hose)
		], {
			explode: [
				0,
				.3,
				.8
			],
			tag: {
				text: "Radiator",
				at: [
					.34,
					1.08,
					zr
				],
				side: "right",
				value: () => `${fmt(heat(), 1)} kW to the air`
			}
		});
		const bt = {
			x: -.58,
			y: .88,
			z: 2.08,
			w: .17,
			h: .19,
			d: .26
		};
		part({
			id: "battery",
			label: "12 V battery",
			assembly: "services",
			source: SRC.eng,
			what: "The starting battery on its tray over the right front wheel: it cranks the engine and heats the glow plugs; the alternator charges it.",
			specs: [["Capacity", "80 Ah, 640 A cold cranking [inferred]"]]
		}, [
			m(at(box(bt.w, bt.h, bt.d, .008), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(GEO.merge([cyl([
				bt.x,
				bt.y + bt.h,
				bt.z - .09
			], [
				bt.x,
				bt.y + bt.h + .02,
				bt.z - .09
			], .009, 12), cyl([
				bt.x,
				bt.y + bt.h,
				bt.z + .09
			], [
				bt.x,
				bt.y + bt.h + .02,
				bt.z + .09
			], .009, 12)]), M.lead),
			m(GEO.merge([at(box(bt.w + .04, .012, bt.d + .04, .004), bt.x, bt.y - .006, bt.z), hose([
				[
					bt.x,
					bt.y + bt.h + .02,
					bt.z - .09
				],
				[
					bt.x + .1,
					bt.y + .1,
					bt.z - .2
				],
				[
					-.3,
					.62,
					1.7
				],
				[
					-.16,
					.6,
					1.5
				]
			], .007, 8)]), M.trim)
		], { explode: [
			-.4,
			.3,
			.3
		] });
		const ia = engine.points.intake;
		const af = GEO.merge([at(box(.2, .17, .3, .02), .58, .97, 2.1), cyl([
			.58,
			.97,
			2.25
		], [
			.58,
			.97,
			2.3
		], .04, 20)]);
		part({
			id: "air-filter",
			label: "Air filter and intake",
			assembly: "services",
			source: SRC.eng,
			what: "The engine breathes through a paper element in this box over the left front wheel, then through a duct to the turbocharger’s compressor.",
			specs: [["Element", "Paper, dry [inferred]"]]
		}, [m(af, M.filterBox), m(hose([
			[
				.58,
				.97,
				1.95
			],
			[
				.55,
				.98,
				1.82
			],
			[
				.4,
				.98,
				1.72
			],
			[
				ia[0] + .08,
				ia[1] + .06,
				ia[2]
			],
			ia
		], .035, 12), E.hose)], { explode: [
			.4,
			.3,
			.3
		] });
		const ft = {
			x: -.645,
			y: .43,
			z: -.2,
			w: .3,
			h: .2,
			d: .7
		};
		const tankG = GEO.merge([
			at(box(ft.w, ft.h, ft.d, .03), ft.x, ft.y, ft.z),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y - ft.h / 2 + .005, ft.z + .2),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y - ft.h / 2 + .005, ft.z - .2)
		]);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "services",
			source: SRC.eng,
			what: "A 76 L pressed-steel tank outside the right rail under the cab’s back, hung on two straps; its filler neck runs up to the cap on the bed’s side.",
			specs: [["Volume", "76 L [inferred]"], ["Fuel", "Diesel, 835 g/L"]]
		}, [
			m(tankG, M.tank),
			m(GEO.merge([hose([
				[
					ft.x - .08,
					ft.y + ft.h / 2,
					ft.z - .32
				],
				[
					-.8,
					.56,
					-.71
				],
				[
					-.86,
					.9,
					-.84
				],
				[
					-.915,
					1.06,
					-.88
				]
			], .022, 10), hose([
				[
					ft.x + .13,
					ft.y + .06,
					ft.z + .35
				],
				[
					-.38,
					.47,
					.3
				],
				[
					-.3,
					.5,
					1
				],
				[
					-.22,
					.62,
					1.5
				],
				[
					-.16,
					.7,
					1.62
				]
			], .005, 6)]), E.hose),
			m(cyl([
				-.925,
				1.06,
				-.88
			], [
				-.935,
				1.06,
				-.88
			], .04, 20), M.trim)
		], {
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
				ex[0],
				ex[1] - .2,
				ex[2] - .08
			],
			[
				-.24,
				.42,
				1.1
			],
			[
				-.25,
				.38,
				.84
			],
			[
				-.25,
				.42,
				.5
			],
			[
				-.25,
				.47,
				.24
			]
		], .025, 12);
		const tail = hose([
			[
				-.25,
				.47,
				-.84
			],
			[
				-.23,
				.5,
				-1
			],
			[
				-.22,
				.55,
				-1.25
			],
			[
				-.24,
				.56,
				-1.7
			],
			[
				-.4,
				.55,
				-2.3
			],
			[
				-.52,
				.47,
				-2.5
			],
			[
				-.56,
				.42,
				-2.66
			]
		], .025, 12);
		const silencer = at(box(.24, .15, 1.04, .05), -.25, .47, -.3);
		part({
			id: "exhaust",
			label: "Exhaust and silencer",
			assembly: "services",
			source: SRC.eng,
			what: "From the turbocharger down and back under the cab through the silencer, over the axle and out under the back on the right, hung on rubber loops.",
			specs: [["Pipe", "Ø 50 mm steel [inferred]"]]
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
	const D = PU.door;
	const n = prof.pts.length;
	const kFace = prof.k0 + 1, kBonnet = prof.k0 + 3, kWs = prof.k0 + 5;
	/** the A pillar's line on the side: the windscreen's edge moved back by `d` (z at height y) */
	const ws0 = prof.pts[kWs], ws1 = prof.pts[kWs + 1];
	const aLine = (d, y) => {
		const dz = ws1[0] - ws0[0], dy = ws1[1] - ws0[1], L = Math.hypot(dz, dy);
		return ws0[0] - dy / L * d + (y - (ws0[1] + dz / L * d)) * dz / dy;
	};
	const hingeZ = D.front[1];
	const yA = (() => {
		let y = 1.1;
		for (let k = 0; k < 40; k++) y += (aLine(.1, y) - hingeZ) * .5;
		return y;
	})();
	/** @type {V2[]} */
	const fHole = [
		[D.front[0], D.y0],
		[hingeZ, D.y0],
		[hingeZ, yA],
		[aLine(.1, D.y1), D.y1],
		[D.front[0], D.y1]
	];
	/** @type {V2[]} */
	const fWin = [
		[D.front[0] + .06, 1.3],
		[aLine(.165, 1.3), 1.3],
		[aLine(.165, 1.67), 1.67],
		[D.front[0] + .06, 1.67]
	];
	/** @type {V2[]} */
	const rHole = [
		[D.rear[0], D.y0],
		[D.rear[1], D.y0],
		[D.rear[1], D.y1],
		[D.rear[0] + .08, D.y1],
		[D.rear[0], D.y1 - .08]
	];
	/** @type {V2[]} */
	const rWin = [
		[D.rear[0] + .06, 1.3],
		[D.rear[1] - .06, 1.3],
		[D.rear[1] - .06, 1.67],
		[D.rear[0] + .1, 1.67],
		[D.rear[0] + .06, 1.63]
	];
	{
		const outline = insetEdges(prof.pts, prof.r);
		const sides = [];
		for (const sx of [-1, 1]) {
			const s = zyShape(outline, 0);
			s.holes.push(zyHole(fHole, .03), zyHole(rHole, .03));
			sides.push(onX(plate(s, t, 6), sx * (X - t / 2)));
		}
		const houses = [];
		const a0 = Math.PI - Math.asin((PU.sill - yw) / .455), a1 = Math.asin((PU.sill - yw) / .455);
		houses.push(...archStrip(.455, a0, a1, .6, X - t, axle.front, yw));
		for (const sx of [-1, 1]) houses.push(onX(plate(zyShape([
			[1.5, .84],
			[2.38, .84],
			[2.38, 1.08],
			[1.5, 1.17]
		], .01), .006, 4), sx * .7));
		part({
			id: "cab-sides",
			label: "Cab sides and front wings",
			assembly: "body",
			source: SRC.air,
			what: "The two pressed-steel sides of the cab and its front wings in one: the four door openings, the pillars between them, the front wheels’ arches cut in; the wheel housings and inner wings inside.",
			specs: [["Steel", "0.8 mm, painted [inferred]"]]
		}, [m(GEO.merge(sides), M.paint), m(GEO.merge(houses), M.trim)], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell"
		});
		/** @type {THREE.BufferGeometry[]} */
		const ps = [];
		/** @type {THREE.BufferGeometry[]} */
		const bonnet = [];
		/** @type {THREE.BufferGeometry[]} */
		const screen = [];
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
			if (k === kFace) holes.push(roundHole([
				[-.42, .16],
				[.42, .16],
				[.42, .33],
				[-.42, .33]
			], .03));
			if (k === n - 1) {
				holes.push(roundHole([
					[-.58, .08],
					[.58, .08],
					[.58, .42],
					[-.58, .42]
				], .05));
				screen.push(onEdge(plate(roundPoly([
					[-.585, .075],
					[.585, .075],
					[.585, .425],
					[-.585, .425]
				], .05), .005, 8), a, b, -.005));
			}
			(k === kBonnet ? bonnet : ps).push(edgePanel(a, b, R0, t, W, holes));
		}
		part({
			id: "nose-roof-back",
			label: "Nose, roof and back wall",
			assembly: "body",
			source: SRC.air,
			what: "The cab’s ends and top: the nose with the grille’s opening, the cowl under the windscreen, the windscreen’s frame, the roof, and the back wall with its window; every edge rounded onto the sides.",
			specs: [["Roof", "Steel, 0.8 mm [inferred]"]]
		}, [m(GEO.merge(ps), M.paint)], {
			explode: [
				0,
				.8,
				0
			],
			xray: "shell"
		});
		part({
			id: "bonnet",
			label: "Bonnet",
			assembly: "body",
			source: SRC.air,
			what: "The steel bonnet over the engine, hinged at its back edge under the windscreen, a stay to hold it up; its rounded edges meet the wings.",
			specs: [["Steel", "0.7 mm outer skin, braced inside [inferred]"]]
		}, [m(GEO.merge(bonnet), M.paint)], {
			explode: [
				0,
				.7,
				.4
			],
			xray: "shell"
		});
		part({
			id: "windscreen",
			label: "Windscreen and back window",
			assembly: "body",
			source: SRC.air,
			what: "The laminated windscreen raked back over the bonnet, and the toughened window in the cab’s back wall.",
			specs: [["Windscreen", "5 mm laminated"], ["Back", "4 mm toughened"]]
		}, [m(GEO.merge(screen), M.glass)], { explode: [
			0,
			.5,
			.3
		] });
		const fx = X - t - .004;
		const fs = roundPoly(xz([
			[-fx, PU.cab.back + .04],
			[fx, PU.cab.back + .04],
			[fx, PU.cab.firewall],
			[-fx, PU.cab.firewall]
		]), .004);
		const floorG = GEO.merge([onY(plate(fs, .02, 4), floor - .01), at(box(.34, .2, 1.7, .04), 0, floor + .08, .64)]);
		const mat = GEO.merge([onY(plate(fs, .004, 4), floor + .002), at(box(.35, .205, 1.69, .045), 0, floor + .082, .64)]);
		const fwS = roundPoly([
			[-.9, floor],
			[-.21, floor],
			[-.21, .98],
			[.21, .98],
			[.21, floor],
			[.9, floor],
			[.9, 1.2],
			[-.9, 1.2]
		], .01);
		const fw = plate(fwS, t, 4).translate(0, 0, PU.cab.firewall + t / 2);
		const bell = at(box(.44, .38, .32, .08), 0, floor + .15, PU.cab.firewall - .14);
		const lining = GEO.merge([at(box(1.7, .01, 1.66, .004), 0, PU.roof - .05, .28), at(slab(1.7, .66, .012), 0, floor + .36, PU.cab.back + .035)]);
		part({
			id: "floor",
			label: "Floor, firewall and lining",
			assembly: "body",
			source: SRC.air,
			what: "The cab’s steel floor on the frame’s mounts, a tunnel down its middle over the gearbox and the propshaft, the firewall between the engine and the cab, a rubber mat over the floor; the headlining under the roof and the trim on the back wall.",
			specs: [["Height", `${Math.round(floor * 1e3)} mm off the road`]]
		}, [
			m(GEO.merge([
				floorG,
				fw,
				bell
			]), M.paint),
			m(mat, M.floor),
			m(lining, M.lining)
		], { explode: [
			0,
			.25,
			0
		] });
		const bumpF = GEO.merge([
			at(box(1.9, .2, .1, .03), 0, .55, PU.front + .06),
			at(box(.12, .18, .2, .03), .9, .55, PU.front - .02),
			at(box(.12, .18, .2, .03), -.9, .55, PU.front - .02)
		]);
		const bumpR = GEO.merge([at(box(1.86, .14, .1, .03), 0, .55, PU.rear - .05), at(box(1, .03, .12, .01), 0, .63, PU.rear - .04)]);
		const ends = {
			chrome: halfCut(M.chrome),
			plate: halfCut(M.plate)
		};
		const mounts = [];
		for (const sx of [-1, 1]) for (const z of [
			1.35,
			.42,
			-.55
		]) mounts.push(at(box(.08, .03, .06, .008), sx * .52, .595, z));
		part({
			id: "bumpers",
			label: "Bumpers, plates and mounts",
			assembly: "body",
			source: SRC.air,
			what: "A steel bumper in front, a step bumper behind with the hitch’s receiver through it, both on brackets to the frame; the number plates (blank); the cab’s rubber mounts on the frame’s outriggers.",
			specs: [["Bumpers", "Steel, 2 mm, chrome in front [inferred]"]]
		}, [
			m(bumpF, ends.chrome),
			m(bumpR, ends.chrome),
			m(GEO.merge([at(slab(.52, .11, .006), 0, .55, PU.front + .113), at(slab(.52, .11, .006), 0, .75, PU.rear - .004)]), ends.plate),
			m(GEO.merge(mounts), M.rubber)
		], { explode: [
			0,
			-.2,
			0
		] });
		const lights = [], lenses = [], ambers = [];
		for (const sx of [-1, 1]) {
			lights.push(at(box(.3, .15, .05, .015), sx * .66, .92, PU.front - .005));
			lenses.push(at(box(.28, .13, .012, .006), sx * .66, .92, PU.front + .022));
			ambers.push(at(box(.07, .13, .03, .008), sx * .86, .92, PU.front - .015), at(box(.04, .03, .06, .008), sx * (X + .004), .95, 2.2));
		}
		const grille = [];
		for (let k = 0; k < 5; k++) grille.push(at(box(.88, .02, .03, .006), 0, .8 + k * .04, PU.front + .01));
		grille.push(at(box(.9, .2, .01, .004), 0, .875, PU.front - .035), at(box(.06, .2, .03, .006), 0, .875, PU.front + .012));
		part({
			id: "lights",
			label: "Headlights and grille",
			assembly: "body",
			source: SRC.air,
			what: "Two headlights with their indicators beside them in the nose, the grille between them that lets the air to the radiator, the side repeaters on the wings.",
			specs: [["Headlights", "Halogen, 12 V 60/55 W [inferred]"]]
		}, [
			m(GEO.merge(lights), M.reflector),
			m(GEO.merge(lenses), M.lens),
			m(GEO.merge(ambers), M.amber),
			m(GEO.merge(grille), M.trim)
		], { explode: [
			0,
			0,
			.5
		] });
		const wip = [];
		for (const wx of [-.38, .32]) wip.push(onEdge(GEO.merge([at(slab(.012, .44, .012), 0, .27, .012), at(slab(.02, .42, .02), .02, .27, .024)]).rotateZ(-.15).translate(wx, 0, 0), ws0, ws1, 0));
		part({
			id: "wipers",
			label: "Wipers",
			count: 2,
			assembly: "body",
			source: SRC.air,
			what: "Two wipers parked at the windscreen’s foot, driven by one motor under the cowl.",
			specs: [["Blades", "2 × 480 mm [inferred]"]]
		}, [m(GEO.merge(wip), M.trim)], { explode: [
			0,
			.6,
			.3
		] });
	}
	/** @type {ReturnType<typeof hinge>[]} */
	const hinged = [];
	{
		const doorDefs = [
			[
				"door-fl",
				"Front door, left (the driver’s)",
				1,
				fHole,
				fWin,
				hingeZ,
				true
			],
			[
				"door-fr",
				"Front door, right",
				-1,
				fHole,
				fWin,
				hingeZ,
				true
			],
			[
				"door-rl",
				"Rear door, left",
				1,
				rHole,
				rWin,
				D.rear[1],
				false
			],
			[
				"door-rr",
				"Rear door, right",
				-1,
				rHole,
				rWin,
				D.rear[1],
				false
			]
		];
		for (const [id, label, sx, hole, win, hz, isFront] of doorDefs) {
			const h = hinge(body, {
				at: [
					sx * X,
					0,
					hz
				],
				axis: "y",
				max: -sx * 1.22,
				name: id
			});
			const d = doorPanels([...hole], [...win], {
				x: X,
				sx,
				split: PU.waist
			});
			const mv = (g) => g.translate(-sx * X, 0, -hz);
			const z0 = hole[0][0];
			const inner = GEO.merge([at(box(.05, .04, .32, .01), sx * (X - .085), 1, (z0 + hz) / 2), at(box(.02, .025, .08, .006), sx * (X - .072), 1.12, z0 + .16)]);
			/** @type {THREE.BufferGeometry[]} */
			const outside = [at(box(.02, .03, .14, .008), sx * (X + .012), 1.13, z0 + .14)];
			/** @type {THREE.BufferGeometry[]} */
			const shiny = [];
			if (isFront) {
				outside.push(cyl([
					sx * X,
					1.36,
					1.32
				], [
					sx * (X + .12),
					1.38,
					1.31
				], .012, 8), at(box(.06, .16, .13, .02), sx * (X + .15), 1.4, 1.31));
				shiny.push(at(slab(.035, .14, .004), sx * (X + .15), 1.4, 1.244));
			}
			kit.part(h.pivot, {
				id,
				label,
				assembly: "doors",
				source: SRC.air,
				what: `A hinged steel door, its window wound down into it by a handle inside, its card, armrest and handles${isFront ? ", its mirror on its front corner" : ""}. It swings out on two hinges at its front edge.`,
				moves: "Opens to 70° on its hinges.",
				drive: "By hand (the Doors slider)",
				specs: [["Opening", `${Math.round((hz - z0) * 1e3)} × ${Math.round((D.y1 - D.y0) * 1e3)} mm`], ["Skin", "0.8 mm steel, a beam inside [inferred]"]]
			}, { explode: [
				sx * .55,
				.05,
				isFront ? .25 : -.1
			] }, body);
			h.pivot.add(m(mv(d.skin), M.paint), m(mv(d.glass), M.glass), m(mv(d.card), M.card), m(mv(inner), M.vinyl), m(mv(GEO.merge(outside)), M.trim));
			if (shiny.length) h.pivot.add(m(mv(GEO.merge(shiny)), M.chrome));
			hinged.push(h);
		}
	}
	const gauges = cluster(kit, {
		dials: [{
			x: -.075,
			y: 0,
			r: .05,
			max: 180
		}, {
			x: .075,
			y: 0,
			r: .05,
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
		const f = seatGeometry({
			w: .52,
			d: .5,
			h: .3,
			back: .56,
			rake: .26
		});
		const fronts = [-1, 1].map((sx) => [f.fabric.clone().translate(sx * PU.driver.x, floor, PU.driver.z), f.base.clone().translate(sx * PU.driver.x, floor, PU.driver.z)]);
		part({
			id: "front-seats",
			label: "Front seats",
			count: 2,
			assembly: "cab",
			source: SRC.air,
			what: "The driver’s seat and the passenger’s, on runners to slide them, their backs raked, a headrest on each.",
			specs: [["Cover", "Grey cloth"]]
		}, [m(GEO.merge(fronts.map((p) => p[0])), M.fabric), m(GEO.merge(fronts.map((p) => p[1])), M.vinyl)], { explode: [
			0,
			.7,
			.1
		] });
		const b2 = seatGeometry({
			w: 1.5,
			d: .48,
			h: .32,
			back: .52,
			rake: .2
		});
		part({
			id: "rear-bench",
			label: "Rear bench",
			assembly: "cab",
			source: SRC.air,
			what: "A bench for three across the back of the cab, upright against its back wall.",
			specs: [["Seats", "3"]]
		}, [m(b2.fabric.translate(0, floor, -.26), M.fabric), m(b2.base.translate(0, floor, -.26), M.vinyl)], { explode: [
			0,
			.8,
			-.1
		] });
		const dash = GEO.merge([
			at(box(1.74, .22, .3, .03, 2), 0, 1.08, 1.37),
			at(box(1.76, .05, .26, .02, 2), 0, 1.215, 1.38),
			at(box(.38, .07, .14, .025), PU.driver.x, 1.215, 1.26)
		]);
		const faces = GEO.merge([
			at(slab(.2, .12, .01), 0, 1.08, 1.215),
			at(slab(.4, .14, .01), -PU.driver.x, 1.06, 1.215),
			...[
				-.72,
				-.16,
				.16,
				.72
			].map((x) => at(slab(.1, .04, .01), x, 1.15, 1.215))
		]);
		gauges.group.position.set(PU.driver.x, 1.13, 1.205);
		gauges.group.rotation.x = .12;
		part({
			id: "dashboard",
			label: "Dashboard and gauges",
			assembly: "cab",
			source: SRC.air,
			what: "The moulded dashboard under the windscreen: the speedometer and the rev counter in their binnacle before the driver, the radio and the heater’s controls in the middle, four vents, the glovebox before the passenger.",
			moves: "Its needles show the speed and the engine’s revs.",
			specs: [["Gauges", "Speed to 180 km/h, revs to 5,000 rpm"]]
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
					PU.driver.x,
					1.25,
					1.25
				],
				side: "right",
				value: () => `${fmt(kmh())} km/h · ${fmt(sim.s.rpm)} rpm`
			}
		});
		const sw = steeringWheelGeometry({
			R: .19,
			column: .5
		});
		const wheel = new three.Group();
		wheel.add(m(sw.rim, M.vinyl), m(sw.hub, M.dash), m(sw.column, M.dash));
		wheel.position.set(...PU.wheel);
		wheel.rotation.x = .42;
		part({
			id: "steering-wheel",
			label: "Steering wheel and column",
			assembly: "cab",
			source: SRC.air,
			what: "The wheel on its column through the dashboard to the firewall, where a shaft with two universal joints runs down past the engine to the rack.",
			moves: "Turned by the driver (held straight here).",
			specs: [["Diameter", "380 mm"]]
		}, [wheel], { explode: [
			0,
			.55,
			.1
		] });
		const ped = [];
		for (const [dx, w] of [
			[.12, .06],
			[0, .08],
			[-.12, .05]
		]) ped.push(cyl([
			PU.driver.x + dx,
			1,
			1.44
		], [
			PU.driver.x + dx,
			floor + .14,
			1.36
		], .008, 8), at(box(w, .09, .012, .004), PU.driver.x + dx, floor + .12, 1.35));
		const consoleG = GEO.merge([at(box(.26, .2, .6, .04), 0, floor + .28, .9), at(box(.03, .04, .2, .01), .06, floor + .4, .68)]);
		part({
			id: "pedals-console",
			label: "Pedals, console and handbrake",
			count: 3,
			assembly: "cab",
			source: SRC.air,
			what: "Clutch, brake and accelerator hanging from under the dashboard; the console over the tunnel between the front seats with the gear lever through it and the handbrake beside it, which pulls the rear drums’ shoes by cable.",
			specs: [["Brakes", "Servo-assisted hydraulic, two circuits"]]
		}, [m(GEO.merge(ped), M.vinyl), m(consoleG, M.dash)], { explode: [
			0,
			.4,
			.3
		] });
	}
	const gate = hinge(body, {
		at: [
			0,
			bed.floor - .01,
			PU.rear + .025
		],
		axis: "x",
		max: -Math.PI / 2,
		name: "tailgate"
	});
	/** the check cables: from the bed's posts to the tailgate's top corners, re-aimed as it opens */
	const cables = [-1, 1].map((sx) => {
		const c = new three.Group();
		c.add(m(unitBar(.0035, 6), M.cable));
		return {
			c,
			post: new three.Vector3(sx * (bed.inner - .01), 1.18, PU.rear + .06),
			end: [
				sx * (bed.inner - .04),
				.37,
				0
			]
		};
	});
	{
		const sideP = bedSide();
		const outer = [], inner = [];
		for (const sx of [-1, 1]) {
			outer.push(onX(plate(zyShape(sideP.pts, sideP.r), t, 6), sx * (X - t / 2)));
			inner.push(onX(plate(zyShape([
				[PU.rear + .08, bed.floor],
				[bed.front - .04, bed.floor],
				[bed.front - .04, bed.top - .03],
				[PU.rear + .08, bed.top - .03]
			], .01), t, 4), sx * (bed.inner + t / 2)));
			outer.push(at(box(X - bed.inner + .01, .035, bed.front - PU.rear - .004, .012), sx * ((X + bed.inner) / 2), bed.top - .0175, (bed.front + PU.rear) / 2));
			outer.push(at(box(X - bed.inner, bed.top - bed.skirt - .02, .08, .01), sx * ((X + bed.inner) / 2), (bed.top + bed.skirt) / 2 - .01, PU.rear + .04));
		}
		const fwS = roundPoly([
			[-X, bed.skirt],
			[X, bed.skirt],
			[X, bed.top],
			[-X, bed.top]
		], .03);
		outer.push(plate(fwS, t, 4).translate(0, 0, bed.front - t / 2));
		inner.push(plate(roundPoly([
			[-bed.inner, bed.floor],
			[bed.inner, bed.floor],
			[bed.inner, bed.top - .03],
			[-bed.inner, bed.top - .03]
		], .01), t, 4).translate(0, 0, bed.front - .04 - t / 2));
		outer.push(at(box(W, .035, .05, .012), 0, bed.top - .0175, bed.front - .02));
		const ah = .48;
		const b0 = Math.PI - Math.asin((bed.skirt - yw) / ah), b1 = Math.asin((bed.skirt - yw) / ah);
		/** @type {THREE.BufferGeometry[]} */
		const houses = archStrip(ah, b0, b1, .6, X - t, axle.rear, yw);
		/** @type {V2[]} */
		const wall = [];
		for (let k = 0; k <= 16; k++) {
			const a = b0 + (b1 - b0) * k / 16;
			wall.push([axle.rear + .486 * Math.cos(a), yw + .486 * Math.sin(a)]);
		}
		for (const sx of [-1, 1]) houses.push(onX(plate(zyShape(wall, 0), .006, 4), sx * .6));
		const tubs = [-1, 1].map((sx) => at(box(bed.inner - bed.tub, .14, 1, .035), sx * (bed.inner + bed.tub) / 2, bed.floor + .07, axle.rear));
		part({
			id: "bed-sides",
			label: "Bed sides and front wall",
			assembly: "bed",
			source: SRC.air,
			what: "The bed’s double walls: the painted outer skins with the rear wheels’ arches cut in, the inner walls the load rubs against, the caps along their tops, the front wall behind the cab, the back posts carrying the lights; the wheel housings under the floor and the tubs over them.",
			specs: [["Inside", `${Math.round((bed.front - .04 - PU.rear - .05) * 1e3)} × ${Math.round(bed.inner * 2e3)} mm, ${Math.round(bed.tub * 2e3)} mm between the tubs`], ["Depth", `${Math.round((bed.top - bed.floor) * 1e3)} mm`]]
		}, [
			m(GEO.merge(outer), M.paint),
			m(GEO.merge(inner), M.liner),
			m(GEO.merge([...houses, ...tubs]), M.liner)
		], {
			explode: [
				0,
				.6,
				-.4
			],
			xray: "shell"
		});
		const flS = roundPoly(xz([
			[-bed.inner, bed.front - .04],
			[bed.inner, bed.front - .04],
			[bed.inner, PU.rear + .05],
			[-bed.inner, PU.rear + .05]
		]), .004);
		/** @type {THREE.BufferGeometry[]} */
		const flG = [onY(plate(flS, .01, 4), bed.floor - .005)];
		for (const x of [
			-.5,
			-.32,
			-.12,
			.12,
			.32,
			.5
		]) flG.push(at(box(.05, .012, bed.front - PU.rear - .14, .004), x, bed.floor + .004, (bed.front + PU.rear) / 2 - 0));
		const bearers = [];
		for (const z of [
			-.95,
			-1.75,
			-2.2,
			-2.5
		]) bearers.push(at(box(1.5, .12, .07, .01), 0, frameY(rails, z) + .07 + .06, z));
		const hooks = [];
		for (const sx of [-1, 1]) for (const z of [
			bed.front - .12,
			-1,
			-1.84,
			PU.rear + .16
		]) hooks.push(new three.TorusGeometry(.022, .005, 6, 14).rotateY(Math.PI / 2).translate(sx * (bed.inner - .03), bed.floor + .03, z));
		part({
			id: "bed-floor",
			label: "Bed floor",
			assembly: "bed",
			source: SRC.air,
			what: "The bed’s floor: a ribbed steel sheet on four bearers across the frame’s rails, coated against wear; eight hooks along its edges to tie the load down. What is put on the bed stands on it.",
			specs: [["Height", `${Math.round(bed.floor * 1e3)} mm off the road`], ["Ribs", "6, 12 mm high"]]
		}, [
			m(GEO.merge(flG), M.liner),
			m(GEO.merge(bearers), R.chassis),
			m(GEO.merge(hooks), M.cable)
		], {
			explode: [
				0,
				.3,
				-.3
			],
			tag: cube ? void 0 : {
				text: "Bed",
				at: [
					0,
					bed.floor,
					-1.7
				],
				side: "left",
				value: () => `${fmt(ctl.load.value)} kg in it`
			}
		});
		const tails = [], reds = [], wh = [];
		for (const sx of [-1, 1]) {
			tails.push(at(box(.11, .42, .03, .01), sx * ((X + bed.inner) / 2), 1, PU.rear - .012));
			reds.push(at(box(.1, .24, .02, .008), sx * ((X + bed.inner) / 2), 1.08, PU.rear - .025));
			wh.push(at(box(.1, .07, .02, .008), sx * ((X + bed.inner) / 2), .88, PU.rear - .025));
		}
		part({
			id: "tail-lights",
			label: "Tail lights",
			count: 2,
			assembly: "bed",
			source: SRC.air,
			what: "The tail, brake, indicator and reversing lights on the bed’s back posts.",
			specs: [["Bulbs", "12 V 21/5 W [inferred]"]]
		}, [
			m(GEO.merge(tails), M.trim),
			m(GEO.merge(reds), M.red),
			m(GEO.merge(wh), M.lens)
		], { explode: [
			0,
			0,
			-.4
		] });
		const gw = bed.inner - .006, gh = bed.top - bed.floor + 0;
		const skinS = roundPoly([
			[-gw, .012],
			[gw, .012],
			[gw, gh],
			[-gw, gh]
		], .015);
		const skin = GEO.merge([
			plate(skinS, .008, 6).translate(0, 0, -.021),
			plate(skinS, .006, 6).translate(0, 0, .022),
			at(box(2 * gw, .03, .05, .01), 0, gh - .01, 0),
			at(box(.03, gh - .02, .05, .008), gw - .015, gh / 2 + .006, 0),
			at(box(.03, gh - .02, .05, .008), -gw + .015, gh / 2 + .006, 0)
		]);
		const gateBits = GEO.merge([
			at(box(.22, .045, .02, .008), 0, gh - .08, -.03),
			cyl([
				-gw,
				.012,
				0
			], [
				-gw + .06,
				.012,
				0
			], .008, 8),
			cyl([
				gw - .06,
				.012,
				0
			], [
				gw,
				.012,
				0
			], .008, 8)
		]);
		const sill = at(box(2 * bed.inner, .025, .05, .006), 0, bed.floor - .03, PU.rear + .025);
		kit.part(gate.pivot, {
			id: "tailgate",
			label: "Tailgate",
			assembly: "bed",
			source: SRC.air,
			what: "The bed’s back wall on two hinges along its bottom edge: unlatched by its handle it drops back to lie level with the floor, held there by two steel check cables, to load the bed or to carry something longer than it.",
			moves: "Drops 90° on its hinges.",
			drive: "By hand (the Tailgate slider)",
			specs: [["Size", `${Math.round(gw * 2e3)} × ${Math.round(gh * 1e3)} mm`], ["Holds", "~200 kg level [inferred]"]]
		}, { explode: [
			0,
			-.1,
			-.6
		] }, body);
		gate.pivot.add(m(skin, M.paint), m(gateBits, M.trim), ...cables.map((c) => c.c));
		part({
			id: "gate-sill",
			label: "Tailgate sill and hinges",
			assembly: "bed",
			source: SRC.air,
			what: "The sill along the bed’s back edge that the tailgate’s hinge pins turn in.",
			specs: [["Pins", "Ø 16 mm [inferred]"]]
		}, [m(sill, M.trim)], { explode: [
			0,
			-.1,
			-.5
		] });
	}
	if (cube) {
		const pc = powerCube({
			speed: 1800,
			load: 0
		});
		const pa = pc.userData.asset;
		const own = pa.tick;
		pa.tick = (_dt, env) => own(0, {
			...env,
			broken: false
		});
		pa.labels.length = 0;
		kit.carry(pc, {
			at: PU.cube,
			parent: body,
			prefix: "cube-",
			ref: "machines/powercube@3",
			explode: [
				0,
				.9,
				0
			],
			step: steps.length
		});
		const top = PU.cube[1] + CUBE.H + .012, hw = CUBE.W / 2 + .012;
		const straps = [];
		for (const dz of [-.17, .17]) {
			const z = PU.cube[2] + dz;
			straps.push(hose([
				[
					bed.inner - .03,
					bed.floor + .03,
					z
				],
				[
					hw + .03,
					bed.floor + .25,
					z
				],
				[
					hw,
					top - .03,
					z
				],
				[
					hw - .04,
					top,
					z
				],
				[
					0,
					top + .004,
					z
				],
				[
					-hw + .04,
					top,
					z
				],
				[
					-hw,
					top - .03,
					z
				],
				[
					-hw - .03,
					bed.floor + .25,
					z
				],
				[
					-bed.inner + .03,
					bed.floor + .03,
					z
				]
			], .006, 6));
			straps.push(at(box(.04, .09, .06, .01), hw + .035, bed.floor + .32, z));
		}
		part({
			id: "straps",
			label: "Ratchet straps",
			count: 2,
			assembly: "bed",
			source: SRC.cube,
			what: "Two 25 mm ratchet straps over the Power Cube’s frame from the bed’s hooks: they hold its 181 kg down on the floor through braking, bends and bumps.",
			specs: [["Straps", "25 mm polyester, 800 kg lashing capacity [inferred]"]]
		}, [m(GEO.merge(straps), M.strap)], {
			explode: [
				0,
				1.2,
				0
			],
			tag: {
				text: "Power Cube",
				at: [
					hw,
					top,
					PU.cube[2]
				],
				side: "right",
				value: () => `${181} kg, strapped down · engine off`
			}
		});
	}
	const ctl = {
		speed: {
			label: "Speed asked",
			min: 0,
			max: 140,
			value: speed,
			step: 1,
			unit: "km/h",
			ends: ["Standing", "140 km/h"]
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
			label: cube ? "Load besides the cube (people and cargo)" : "Load (people and cargo)",
			min: 0,
			max: VEHICLE.payload - extra,
			value: Math.min(load, VEHICLE.payload - extra),
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
		},
		tailgate: {
			label: "Tailgate",
			min: 0,
			max: 1,
			value: tailgate,
			step: .01,
			digits: 2,
			ends: ["Shut", "Down"]
		}
	};
	/** what the driver is asked for: the sliders, or the break's overload up its hill @param {{ broken: boolean }} env */
	const input = (env) => ({
		vSet: ctl.speed.value * KMH,
		grade: env.broken ? .35 : ctl.grade.value / 100,
		load: (env.broken ? VEHICLE.payload * 2.5 : ctl.load.value) + extra
	});
	sim.settle(input({ broken: false }));
	const qx = new three.Quaternion(), ax = new three.Vector3(1, 0, 0), pv = new three.Vector3(), hingeAt = new three.Vector3(0, bed.floor - .01, PU.rear + .025);
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
		const k = clamp(ctl.doors.value);
		for (const d of hinged) d.set(k);
		gate.set(clamp(ctl.tailgate.value));
		qx.setFromAxisAngle(ax, gate.max * gate.k).invert();
		for (const c of cables) {
			pv.copy(c.post).sub(hingeAt).applyQuaternion(qx);
			aim(c.c, [
				pv.x,
				pv.y,
				pv.z
			], c.end, true);
		}
		gauges.set([kmh(), s.rpm]);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || lug && s.gear === 1 || s.bottomed;
		r.state = s.stalled ? env.broken ? `stalled: ${fmt(VEHICLE.payload * 2.5 + extra)} kg loaded, up a 35 % grade` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `full throttle in ${ordinal(s.gear)}` : s.Fb > 1 ? inp.grade < -.005 ? `braking down the hill in ${ordinal(s.gear)}` : `braking to the speed asked in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : s.v > inp.vSet + .5 ? `easing off to the speed asked in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? `first gear gives at most ${fmt(s.can)} N at the wheels, the hill and the road take ${fmt(s.need)} N · ${env.broken ? "take the break back" : "move a slider"} to start it again` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3, 1)} kW at the flywheel · the road takes ${fmt(s.road.F)} N (rolling ${fmt(s.road.roll)}, climbing ${fmt(s.road.climb)}, air ${fmt(s.road.air)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 2)} L/h`}${s.bottomed ? " · the springs on their bump stops" : ""}`;
	});
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power at the wheels",
			unit: "kW",
			max: 80,
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
			text: `A driver holds the speed asked: the road takes a force to roll the tyres, to lift the pickup up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the axle’s losses at the engine. The driver picks the highest gear that gives that push without the engine running too slow, opens the throttle for it, and brakes downhill when even the shut throttle pushes too much. Where first gear on the engine’s full-load curve gives less than the hill takes, the speed falls, the engine lugs down and stalls. The fuel comes from the engine’s work plus its own friction. The axles’ loads shift back up a hill and as it pulls, and the springs sink by the load over their rates; most of the load rides over the rear axle.${cube ? " The Power Cube’s 181 kg is added to the load, its engine off while it rides." : ""} The doors and the tailgate are moved by their sliders alone. Shown slowed: the wheels 10 times, the engine, the gearbox and the propshaft 40 times.`,
			eqs: [
				`F = m g Crr cos θ + m g sin θ + ½ ρ Cd A v²      m = 1,750 kg + load${cube ? " + 181 kg" : ""}, Crr = 0.012, Cd A = 1.25 m²`,
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.90",
				"n = (v / r) · i_gear · i_axle      r = 0.377 m, i = 4.31 … 0.84, i_axle = 4.10",
				"T_engine ≤ T_full(n)      240 N·m at 2,000 rpm, 199 N·m at 3,600",
				"m_eff dv/dt = T i η / r − F      m_eff = m + (4 J_w + J_e i² η) / r²",
				"fuel = (T + T_friction) ω · 205 g/kWh      T_friction from 1.7 bar",
				"sag = ΔF_axle / k      k = 45 kN/m front, 60 kN/m rear (a wheel)"
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
				.5,
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
const HISTORY = /* @__PURE__ */ (() => ({ pickup: [{
	...FIRST,
	date: "2026-10-14"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "pickup",
	label: "Pickup",
	note: "the double-cab pickup of the MaiaCity world, built at AirSup’s realism: every part its own in measured materials (a ladder frame kicked up over the axle, wishbones and coil-overs, leaf springs, a 2.5 L turbo-diesel under the bonnet with its pistons, crank, camshaft and gears to cut open, a 5-speed gearbox and a live axle), its four doors and its tailgate open, its bed a real floor, and a solver drives it: the power at its wheels to hold a speed on a grade with a load, its gear, revs and fuel, its springs sinking; overloaded up a steep hill it lugs and stalls. It carries a Power Cube as one of its own",
	from: "MaiaCity V1: the world’s pickup",
	variants: [{
		id: "pickup",
		label: "Pickup",
		note: "5.35 × 1.86 m, 1.82 m to its roof; a double cab, four doors and five seats; a 1.78 m bed with a tailgate; 1,750 kg, 950 kg payload",
		make: () => castOf(pickup())
	}, {
		id: "pickup-cube",
		label: "With a Power Cube",
		note: "the Power Cube (v3) carried whole on its bed and strapped down, every part of it its own here too; its 181 kg on the springs and in the solver",
		make: () => castOf(pickup({ cube: true }))
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