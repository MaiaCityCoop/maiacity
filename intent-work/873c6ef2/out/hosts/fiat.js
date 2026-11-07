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
const { MAT, table, clamp, GEO, fmt } = require("2e17ebde03995c8624aa6d4e45aabf54df6b23089c309586330793b8c4a15e70");
//#endregion
//#region src/lib/assets/parts.js
const { assetKit, castOf } = require("ccd99107fc32069ed80f956c2274b339fdb3758a8a535ea32f6cce97eac9a569");
//#endregion
//#region src/lib/machines/vehicle.js
const { tyreSize, insetEdges, vehicleMaterials, engineMaterials, vehicleSolver, hinge, wheelCorner, latheX, at, box, cyl, latheZ, slab, latheY, seatGeometry, cluster, steeringWheelGeometry, bar, aim, beltGeometry, hose, unitBar, plate, telescope, leafPack, tyreGeometry, steelRimGeometry, inFrame, ordinal } = require("5c7ac999d7434d04e4dea7109f6f810baf783a3a3d17f1da078c1fee3b37fcae");
//#endregion
//#region src/lib/machines/fiat500.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/*
 * THE FIAT 500 F (1965–72), Rosso Corallo 102: its research, as AirSup's step 1 asks, every number with the artifact it
 * comes from (play's Artifacts, by UUID), the rest marked [inferred].
 *
 * Size (e5efff81-8de1-45b3-9de1-2fd3e521bd53): 2,970 × 1,320 × 1,325 mm, wheelbase 1,840, tracks 1,121 front and
 * 1,135 rear, 520 kg in running order. Tyres 125 SR 12, 514 mm across (e12362b0-2cf5-4b87-95da-e0f36b801404), on
 * 3½ × 12 in pressed-steel discs (3b5332c8-1083-4e85-bad5-156a90148b09).
 * Engine (e5efff81…, 3b5332c8…, 1b98fcfa-450a-4c35-bceb-ea74624dde5f): type 110F.000, two vertical cylinders in line
 * behind the rear axle, 67.4 × 70 mm, 499.5 cc, compression 7.1:1, pushrod overhead valves, 18 hp (13.2 kW) at
 * 4,600 rpm, 31 N·m at 3,000 rpm, and 4,600 rpm its maximum revs (75584c50-8752-4d4b-abdd-ad613d0ecee6; Samuel 2026-11-07:
 * "Limit revs at 4,600"); one Weber 26 IMB carburettor (21 mm choke); forced air cooling by a fan, a shroud
 * and a thermostat; a gear pump and a centrifugal oil filter.
 * Drive (3b5332c8…): a single dry plate, 4 speeds (teeth 37/10, 31/15, 26/20, 21/24 = 3.700, 2.067, 1.300, 0.875;
 * II–IV dog-engaged), the crown wheel and pinion 8/41 = 5.125, half-shafts with sliding joints at the differential and
 * flexible joints at the wheels. Top speed 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68).
 * Chassis (3b5332c8…, 1b98fcfa…): a load-bearing steel body; front independent on a transverse leaf spring with
 * telescopic dampers; rear independent on swinging (semi-trailing) arms with coil springs and telescopic dampers;
 * steering by worm and helical sector, a track rod to each wheel; hydraulic drums on all four wheels, the hand brake
 * on the rear; a cylindrical 22 L fuel tank (1b98fcfa…).
 * Drag: Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2); the frontal area is the shell's own, measured off its front
 * view. Paint: Rosso Corallo, Fiat code 102 (1968–72), #b1372f (344cf860-1a7d-4bf7-86e3-ac16638425a4,
 * d317c2f0-cfa5-4faa-b502-157ac3e44b52).
 *
 * Its shape is its reference sheet's (play's file fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a):
 * the outlines of its row-1 turnaround traced at 20 mm (side: the top and the paint's lower edge; plan: the paint's
 * half-width; front and rear: the paint's half-width at each height), each view's axes scaled to the cited length,
 * width and height, and the shell lofted from them station by station. The sheet's wheels stand 1,895 mm apart, the
 * cited wheelbase is 1,840: each arch keeps the sheet's place, each wheel stands 14 mm inboard of its arch's middle.
 */
/** the sheet's traced outlines (m): side top and lower paint edge, plan half-width, all by z; front and rear half-widths by y */
const TRACE = {
	z0: -1.42,
	dz: 0.02,
	top: [
		0.4755, 0.626, 0.6828, 0.6887, 0.6911, 0.6933, 0.6971, 0.7067, 0.7254, 0.7477, 0.7719, 0.8032, 0.8307, 0.8428, 0.8505, 0.8632, 0.8815, 0.9051, 0.9328, 0.9616,
		0.9863, 1.0083, 1.0307, 1.0536, 1.0776, 1.1018, 1.1249, 1.1478, 1.1716, 1.194, 1.2123, 1.2271, 1.2398, 1.2506, 1.2594, 1.2667, 1.2728, 1.2783, 1.2834, 1.2878,
		1.2915, 1.2951, 1.2986, 1.3017, 1.3043, 1.307, 1.3092, 1.3109, 1.3127, 1.3144, 1.3162, 1.318, 1.3197, 1.3213, 1.3228, 1.3239, 1.3228, 1.3206, 1.3193, 1.3184,
		1.318, 1.3175, 1.3167, 1.3162, 1.3162, 1.3162, 1.3167, 1.3176, 1.318, 1.3184, 1.3197, 1.3211, 1.3206, 1.3184, 1.3162, 1.3144, 1.3125, 1.3103, 1.3085, 1.3072,
		1.3056, 1.3039, 1.3026, 1.3016, 1.3008, 1.3003, 1.2999, 1.2984, 1.2944, 1.2847, 1.2715, 1.2616, 1.2544, 1.2429, 1.2242, 1.2022, 1.1804, 1.1588, 1.1364, 1.113,
		1.0899, 1.0666, 1.0431, 1.0199, 0.9986, 0.9854, 0.9768, 0.9607, 0.94, 0.918, 0.8984, 0.8897, 0.887, 0.8844, 0.8817, 0.8791, 0.8764, 0.8738, 0.8707, 0.8676,
		0.865, 0.8619, 0.8584, 0.8547, 0.8505, 0.8463, 0.8421, 0.8375, 0.8327, 0.8274, 0.8214, 0.8153, 0.8089, 0.8016, 0.7928, 0.7824, 0.7706, 0.756, 0.7354, 0.7092,
		0.6869, 0.6744, 0.6682
	],
	bot: [
		0.4023, 0.3742, 0.3159, 0.28, 0.2692, 0.2624, 0.2597, 0.258, 0.2569, 0.2611, 0.2723, 0.2892, 0.3189, 0.3614, 0.403, 0.4353, 0.4593, 0.4783, 0.4937, 0.5056,
		0.5146, 0.5217, 0.5276, 0.5331, 0.5373, 0.5393, 0.5397, 0.5393, 0.5375, 0.534, 0.5289, 0.5223, 0.5139, 0.5038, 0.4915, 0.4765, 0.4583, 0.4351, 0.4056, 0.3651,
		0.3121, 0.263, 0.2342, 0.219, 0.2087, 0.2019, 0.1968, 0.1946, 0.1946, 0.1946, 0.1946, 0.1948, 0.1955, 0.1952, 0.1923, 0.1888, 0.1893, 0.1933, 0.1959, 0.1959,
		0.1937, 0.1902, 0.188, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1875, 0.1888, 0.1915, 0.1928,
		0.1928, 0.1928, 0.1928, 0.1933, 0.1941, 0.1946, 0.1946, 0.1946, 0.1941, 0.1933, 0.1933, 0.1937, 0.1933, 0.1928, 0.1928, 0.1928, 0.1928, 0.1928, 0.1928, 0.1928,
		0.1926, 0.1915, 0.19, 0.1917, 0.201, 0.2188, 0.2582, 0.3246, 0.3883, 0.4299, 0.458, 0.4798, 0.4977, 0.5124, 0.5243, 0.5339, 0.5421, 0.5489, 0.5544, 0.5584,
		0.5604, 0.5604, 0.5591, 0.5567, 0.5529, 0.5478, 0.541, 0.5326, 0.5227, 0.5104, 0.4952, 0.4761, 0.4523, 0.4224, 0.3808, 0.3317, 0.2927, 0.2729, 0.2685, 0.2767,
		0.3154, 0.3731, 0.4006
	],
	W: [
		0.1748, 0.3494, 0.4588, 0.5008, 0.5102, 0.5182, 0.5343, 0.5494, 0.5598, 0.5684, 0.5819, 0.6037, 0.6224, 0.6325, 0.6384, 0.6426, 0.6455, 0.648, 0.6502, 0.6521,
		0.6541, 0.6558, 0.6571, 0.658, 0.659, 0.6598, 0.66, 0.66, 0.66, 0.6598, 0.6593, 0.6588, 0.658, 0.6571, 0.6561, 0.6546, 0.6521, 0.6482, 0.6426, 0.6379,
		0.6366, 0.6377, 0.6391, 0.6404, 0.6413, 0.6424, 0.6437, 0.6449, 0.6458, 0.6463, 0.6467, 0.6473, 0.6484, 0.6494, 0.6451, 0.6335, 0.6297, 0.6391, 0.6463, 0.649,
		0.6508, 0.6514, 0.6535, 0.6556, 0.6563, 0.6568, 0.6573, 0.6578, 0.658, 0.658, 0.658, 0.6581, 0.6583, 0.6581, 0.658, 0.658, 0.658, 0.6578, 0.6571, 0.6563,
		0.6561, 0.6559, 0.6551, 0.6543, 0.6539, 0.6532, 0.6526, 0.652, 0.6509, 0.6497, 0.6489, 0.6482, 0.6472, 0.6464, 0.6462, 0.6426, 0.6381, 0.6404, 0.6431, 0.6423,
		0.6411, 0.6394, 0.6376, 0.6364, 0.6359, 0.6386, 0.6447, 0.6496, 0.6516, 0.653, 0.6543, 0.6556, 0.6561, 0.6563, 0.6568, 0.6571, 0.6571, 0.6571, 0.6568, 0.6561,
		0.6553, 0.6546, 0.6536, 0.6526, 0.6514, 0.6499, 0.6482, 0.6458, 0.6426, 0.6391, 0.6353, 0.6299, 0.6206, 0.6027, 0.5773, 0.5564, 0.5442, 0.5333, 0.5187, 0.4685,
		0.3756, 0.2729, 0.1478
	],
	y0: 0.2,
	dy: 0.02,
	front: [
		0.3033, 0.4308, 0.5167, 0.568, 0.5997, 0.6188, 0.6315, 0.6401, 0.6456, 0.6495, 0.6525, 0.6545, 0.6558, 0.6573, 0.6589, 0.6598, 0.6598, 0.6591, 0.6572, 0.651,
		0.6384, 0.6245, 0.6151, 0.6085, 0.6019, 0.5964, 0.5927, 0.5894, 0.5853, 0.5794, 0.5708, 0.5599, 0.5507, 0.5465, 0.545, 0.5504, 0.5542, 0.5423, 0.5306, 0.5268,
		0.5231, 0.5193, 0.5158, 0.5123, 0.5092, 0.5064, 0.5031, 0.4996, 0.4961, 0.4928, 0.4893, 0.4801, 0.4578, 0.3861, 0.2349, null
	],
	rear: [
		null, 0.0424, 0.4384, 0.6056, 0.6347, 0.6434, 0.6478, 0.6509, 0.653, 0.6548, 0.6565, 0.6579, 0.6583, 0.6585, 0.6589, 0.6589, 0.6583, 0.6568, 0.6515, 0.6401,
		0.6262, 0.6152, 0.608, 0.6015, 0.5941, 0.5873, 0.5828, 0.5799, 0.5775, 0.5734, 0.5668, 0.5585, 0.5476, 0.536, 0.529, 0.5319, 0.5408, 0.5434, 0.5397, 0.536,
		0.5321, 0.5277, 0.5234, 0.519, 0.5149, 0.5094, 0.5029, 0.4978, 0.4941, 0.4913, 0.4858, 0.4725, 0.4493, 0.4169, 0.3646, 0.2802
	]
};
/** the Fiat's measures (m): its ends, axles, wheel wells, cabin and openings, read off the sheet at the cited scale */
const F5 = {
	L: 2.97,
	W: 1.32,
	H: 1.325,
	/** the shell's ends (the bumpers stand out to ±1.485) */
	nose: 1.43,
	tail: -1.43,
	axle: {
		front: .9625,
		rear: -.8775,
		/** the arches' middles, as the sheet has them */
		archF: .976,
		archR: -.891,
		xF: 1.121 / 2,
		xR: 1.135 / 2,
		/** the hubs' height: the tyre's 257 mm radius, 2 mm squashed under the car's weight [inferred] */
		y: .255
	},
	/** the wheel wells' inner walls (x) */
	well: { front: .37, rear: .45 },
	/** the canvas rolltop's opening, (z, x) in plan */
	roof: { z0: -.33, z1: .36, x: .385, y: 1.2 },
	/** the driver's seat (x, z), the steering wheel's hub */
	driver: { x: .27, z: -.12 },
	wheel: [.28, .86, .3]
};
const TYRE5 = /* @__PURE__ */ (() => ({ ...tyreSize(125, 83.7, 12), code: "125 SR 12" }))();
const SOURCES5 = [
	{ label: "Fiat 500 F (1971) specification sheet (e5efff81-8de1-45b3-9de1-2fd3e521bd53)", url: "https://auta5p.eu/lang/en/katalog/auto.php?idf=Fiat-500-F-26639" },
	{ label: "Fiat 500 F technical sheet: gears, axle, suspension (3b5332c8-1083-4e85-bad5-156a90148b09)", url: "https://www.cincent.tn.it/scheda-tecnica-fiat-500-f/" },
	{ label: "Features of the Fiat 500 F (1b98fcfa-450a-4c35-bceb-ea74624dde5f)", url: "https://www.garagefiat500.com/features-of-the-fiat-500-f/" },
	{ label: "125 SR 12 Cinturato CN54 (e12362b0-2cf5-4b87-95da-e0f36b801404)", url: "https://www.longstonetyres.co.uk/125sr12-cinturato-cn54.html" },
	{ label: "A 1966 Fiat 500 F: 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68)", url: "https://all-andorra.com/fiat-500-f-from-1966" },
	{ label: "Fiat 500 (1957–75), Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2)", url: "https://en.wikipedia.org/wiki/Fiat_500" },
	{ label: "Nuova 500 colours: Rosso Corallo 102 (344cf860-1a7d-4bf7-86e3-ac16638425a4)", url: "https://www.500clubitalia.it/informazioni-tecniche/colori" },
	{ label: "Fiat 500 F in detail: series, trim, colours (d317c2f0-cfa5-4faa-b502-157ac3e44b52)", url: "https://www.fiatvanderlaan.com/kb-docs/fiat-500-classic-model-500f-details" },
	{ label: "Telling the N, D, F, L and R apart (78b9bf39-5633-4c1c-abc7-81fda933e2a9)", url: "https://www.fiat500enthusiasts.co.uk/model-history/the-evolution-of-a-classic" },
	{ label: "Photo: a 1966 500 F, front three-quarter (4463df70-077f-42ba-bdf2-86d3da9e4951)", url: "https://commons.wikimedia.org/wiki/File:1966_Fiat_500F.jpg" },
	{ label: "Photo: a 1966 500 F, rear three-quarter (abce8d6e-3976-4369-8b3f-aa49240d0ac6)", url: "https://commons.wikimedia.org/wiki/File:1966_Fiat_500F_Rear.jpg" },
	{ label: "500 Giardiniera register: the twin's maximum revs, 4,600 rpm (75584c50-8752-4d4b-abdd-ad613d0ecee6)", url: "https://www.500clubitalia.it/?p=37163" },
	{ label: "Road load and rolling resistance (Wong, Theory of Ground Vehicles)", url: "https://en.wikipedia.org/wiki/Rolling_resistance" },
	{ label: "Machine skill kit (AirSup, MIT)", url: "https://github.com/AirsupHQ/machine-skill" }
];
const SRC5 = /* @__PURE__ */ (() => ({
	size: SOURCES5[0].label,
	mech: SOURCES5[1].label,
	trim: SOURCES5[2].label,
	tyre: SOURCES5[3].label,
	top: SOURCES5[4].label,
	air: SOURCES5[5].label,
	paint: SOURCES5[6].label,
	look: SOURCES5[7].label,
	revs: SOURCES5[11].label,
	road: SOURCES5[12].label
}))();
const ASSEMBLIES5 = [
	{ id: "chassis", label: "Suspension and steering", note: "The transverse leaf spring and dampers in front, the worm-and-sector box and its track rods; the swinging arms with their coil springs and dampers behind.", out: [0, -.6, 0] },
	{ id: "wheels", label: "Wheels and brakes", note: "Four 125 SR 12 tyres on 12-inch pressed-steel wheels under domed hub caps; a drum at each.", out: [.5, -.2, 0] },
	{ id: "engine", label: "Engine", note: "The air-cooled 499.5 cc twin behind the rear axle: crankcase, finned barrels, head, pushrods, crank and rods; its fan and shroud, carburettor, air filter and exhaust.", out: [0, .25, -.5] },
	{ id: "drivetrain", label: "Gearbox and drive", note: "The clutch, the 4-speed gearbox and the final drive in one casing with the engine, the half-shafts to the rear wheels.", out: [0, -.35, -.2] },
	{ id: "front", label: "Front compartment", note: "The cylindrical 22 L fuel tank under the scuttle and the spare wheel in the nose.", out: [0, .35, .5] },
	{ id: "body", label: "Body", note: "The steel body: its shell traced off the reference sheet, its seams, the glass in its rubber, the rolltop.", out: [0, .9, 0] },
	{ id: "openings", label: "Doors and lids", note: "The two front-hinged doors, the front lid and the engine lid, each with its gap.", out: [.6, .3, 0] },
	{ id: "trim", label: "Lamps and chrome", note: "Round headlamps and indicators, the whiskers and horn cover, the rectangular tail lamps, the side repeaters, bumpers, handles.", out: [0, .2, .4] },
	{ id: "cab", label: "Interior", note: "The painted dashboard with its single round instrument, the steering wheel, pedals and gear lever, two front seats and the rear bench, the floor and its mats.", out: [0, .7, 0] }
];
const STEPS5 = [
	"Hang the front leaf spring and the rear arms on the body; fit the steering box and its rods",
	"Bolt on the drums and the wheels",
	"Lift in the engine with its fan, shroud and exhaust",
	"Fit the gearbox and final drive, the half-shafts",
	"Fit the fuel tank and the spare wheel under the front lid",
	"The painted shell, its glass and the rolltop",
	"Hang the doors and the two lids",
	"Fit the lamps, the bumpers and the chrome",
	"Fit the dashboard, the steering wheel, pedals and the seats"
];
/** sRGB #rrggbb to linear [r, g, b] @param {string} h */
const lin5 = (h) => [1, 3, 5].map((i) => {
	const c = parseInt(h.slice(i, i + 2), 16) / 255;
	return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
});
/** the Fiat's own materials: the paint, its trim and inside */
function materials5() {
	return {
		paint: MAT.paint({ color: lin5("#b1372f"), roughness: .3, clearcoat: 1, clearcoatRoughness: .06 }),
		/** the paint inside the doors, the lids' undersides and the bay: the same red, less polished */
		paintIn: MAT.paint({ color: lin5("#a8352d"), roughness: .5, clearcoat: .3, clearcoatRoughness: .4 }),
		chrome: MAT.chrome(),
		/** the wheels' silver paint (aluminium 690) */
		silver: MAT.paint({ color: [.68, .69, .7], metalness: .5, roughness: .34, clearcoat: .5 }),
		// glass without a transmission pass (three draws the scene twice for one): clear, reflecting, see-through by its opacity
		glass: MAT.glass({ color: [.16, .19, .19], transmission: 0, opacity: .28, roughness: .02, envMapIntensity: 1.4 }),
		lens: MAT.glass({ color: [.8, .82, .84], transmission: 0, opacity: .38, roughness: .04 }),
		/** the hub caps' pressed steel, chromed and a little dulled */
		cap: MAT.chrome({ roughness: .3, color: [.72, .73, .74] }),
		amber: MAT.glass({ color: [1, .38, .02], transmission: 0, opacity: .88, roughness: .12, emissive: [.12, .04, 0] }),
		red: MAT.glass({ color: [.6, .015, .015], transmission: 0, opacity: .9, roughness: .12, emissive: [.06, 0, 0] }),
		reflector: MAT.chrome({ roughness: .1, color: [.85, .86, .86] }),
		rubber: MAT.rubber(),
		gap: MAT.satin({ color: [.012, .008, .008], roughness: .9 }),
		canvas: MAT.satin({ color: [.022, .022, .024], roughness: .95, finish: "cast", rep: [40, 40] }),
		vinyl: MAT.satin({ color: [.018, .018, .02], roughness: .55, clearcoat: .2 }),
		ivory: MAT.plastic({ color: [.62, .6, .53], roughness: .35 }),
		mat: MAT.rubber({ color: [.03, .03, .032], finish: "knurl", rep: [30, 30] }),
		black: MAT.plastic({ color: [.02, .02, .022], roughness: .5 }),
		dial: MAT.plastic({ color: [.02, .02, .025], roughness: .4 }),
		tick: MAT.plastic({ color: [.85, .85, .8], roughness: .4 }),
		needle: MAT.plastic({ color: [.9, .25, .05], roughness: .4 }),
		fan: MAT.plastic({ color: [.55, .48, .33], roughness: .45 }),
		shroud: MAT.satin({ color: [.03, .03, .032], roughness: .55 }),
		alloy: MAT.aluminium({ finish: "cast", roughness: .45 }),
		iron: MAT.castIron(),
		steel: MAT.steel(),
		exhaust: MAT.steelDark({ roughness: .6 })
	};
}

/* —— the shell: lofted station by station from the sheet's traced outlines —— */

/** a traced table read at `x` (linear, its ends held, its gaps bridged) @param {(number | null)[]} t @param {number} x0 @param {number} dx @param {number} x */
function traced(t, x0, dx, x) {
	const xs = [], ys = [];
	t.forEach((v, i) => {
		if (v !== null) xs.push(x0 + i * dx), ys.push(v);
	});
	return table(xs, ys, x);
}
/** the sheet's front or rear half-width at height y, as a share of its widest (held above 1.22 m, the roof's crown is the section's own) */
const profMax = /* @__PURE__ */ (() => ({
	front: Math.max(...TRACE.front.filter((v) => v !== null)),
	rear: Math.max(...TRACE.rear.filter((v) => v !== null))
}))();
function prof5(z, y) {
	const yy = clamp(y, .2, 1.22);
	const f = traced(TRACE.front, TRACE.y0, TRACE.dy, yy) / profMax.front, r = traced(TRACE.rear, TRACE.y0, TRACE.dy, yy) / profMax.rear;
	const s = clamp((z + .6) / 1.2);
	const k = s * s * (3 - 2 * s);
	return r + (f - r) * k;
}
/** the floor's underside along z: the underbody, rising to the valances at each end [read off the sheet's side view] */
const FLOOR5 = { z: [-1.43, -1.36, -1.3, -1.2, -.6, .6, 1.25, 1.33, 1.38, 1.43], y: [.42, .3, .26, .235, .2, .2, .225, .26, .3, .4] };
/**
 * The shell's section at station z: its top, the underbody's height, the wheel arch's lip (the paint's lower edge),
 * the side's half-width at a height, the crown, and the wheel well's inner wall.
 * @param {number} z
 */
function section5(z) {
	const { nose, tail } = F5;
	const zt = clamp(z, TRACE.z0, TRACE.z0 + (TRACE.W.length - 1) * TRACE.dz);
	let W = traced(TRACE.W, TRACE.z0, TRACE.dz, zt);
	// the ends rounded in plan from the last traced station to the tip
	const zl = TRACE.z0 + (TRACE.W.length - 1) * TRACE.dz;
	if (z > zl) W *= Math.sqrt(Math.max(0, 1 - ((z - zl) / (nose - zl)) ** 2));
	if (z < TRACE.z0) W *= Math.sqrt(Math.max(0, 1 - ((TRACE.z0 - z) / (TRACE.z0 - tail)) ** 2));
	// the shell's top: the sheet's, less the canvas over the rolltop's opening
	let top = traced(TRACE.top, TRACE.z0, TRACE.dz, zt);
	const r = F5.roof;
	const inRoof = clamp(Math.min(z - r.z0, r.z1 - z) / .04 + .5);
	top -= .026 * inRoof;
	const lip = traced(TRACE.bot, TRACE.z0, TRACE.dz, zt);
	const floor = Math.min(lip, table(FLOOR5.z, FLOOR5.y, z));
	const xWell = z > 0 ? F5.well.front : F5.well.rear;
	const b = Math.min(.075, Math.max(.01, (top - lip) * .3));
	const rb = Math.min(.045, Math.max(.005, (top - lip) * .15));
	/** the side's half-width at height y: the plan's width times the front/rear outline's share, its foot rounded */
	const side = (y) => {
		let x = W * prof5(z, y);
		if (y < lip + rb) {
			const x0 = W * prof5(z, lip + rb);
			x = Math.min(x, x0 - rb + Math.sqrt(Math.max(0, rb * rb - (lip + rb - y) ** 2)));
		}
		return Math.max(0, x);
	};
	return { z, W, top, lip, floor, xWell, b, side };
}
/** the shell's stations along z: closer at the ends, where it rounds fastest */
function stations5() {
	const zs = [];
	for (let z = F5.tail; z < F5.nose - 1e-9; ) {
		zs.push(z);
		z += Math.abs(z) > 1.3 ? .006 : .015;
	}
	zs.push(F5.nose);
	return zs;
}
/** counts of the section's points: underbody, wheel well, lip (the arch's roof), side, crown */
const SEC5 = { bottom: 5, well: 5, lip: 4, side: 38, crown: 16 };
/**
 * The section's points (x ≥ 0), from the underbody's middle round to the top's: the underbody out to the wheel well,
 * up its inner wall, out along the arch's roof to the lip, up the side, over the crown. Each run is its own: their
 * meeting corners stay crisp.
 * @param {ReturnType<typeof section5>} s
 * @returns {{ under: V2[], skin: V2[] }}
 */
function sectionPoints5(s) {
	const { side, top, lip, floor, b } = s;
	const xLip = side(lip);
	const xw = Math.min(s.xWell, Math.max(0, xLip - .015));
	/** @type {V2[]} */
	const under = [];
	for (let k = 0; k <= SEC5.bottom; k++) under.push([xw * k / SEC5.bottom, floor]);
	for (let k = 1; k <= SEC5.well; k++) under.push([xw, floor + (lip - floor) * k / SEC5.well]);
	for (let k = 1; k <= SEC5.lip; k++) under.push([xw + (xLip - xw) * k / SEC5.lip, lip]);
	/** @type {V2[]} */
	const skin = [];
	const yc = top - b;
	for (let k = 0; k <= SEC5.side; k++) {
		const u = k / SEC5.side;
		const y = lip + (yc - lip) * u;
		skin.push([side(y), y]);
	}
	const a = side(yc);
	for (let k = 1; k <= SEC5.crown; k++) {
		const th = k / SEC5.crown * Math.PI / 2;
		skin.push([a * Math.pow(Math.cos(th), 2 / 2.6), yc + b * Math.pow(Math.sin(th), 2 / 2.6)]);
	}
	return { under, skin };
}
/**
 * A grid of points (stations × points round a section, both sides) as a triangle soup: positions, normals (the grid's
 * own: across its stations and round its section) and uvs.
 * @param {V3[][]} P one row per station, each point x ≥ 0 from the bottom round to the top
 */
function gridSoup5(P) {
	const ni = P.length, nj = P[0].length;
	const N = P.map((row, i) => row.map((p, j) => {
		const a = P[Math.max(0, i - 1)][j], c = P[Math.min(ni - 1, i + 1)][j];
		let jb = Math.max(0, j - 1), jf = Math.min(nj - 1, j + 1);
		const di = new three.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
		const dj = new three.Vector3(P[i][jf][0] - P[i][jb][0], P[i][jf][1] - P[i][jb][1], P[i][jf][2] - P[i][jb][2]);
		const n = new three.Vector3().crossVectors(dj, di);
		if (n.lengthSq() < 1e-14) n.set(p[0] > 1e-4 ? 1 : 0, p[0] > 1e-4 ? 0 : 1, 0);
		return n.normalize();
	}));
	const pos = [], nor = [], uv = [];
	const put = (i, j, sx) => {
		const p = P[i][j], n = N[i][j];
		pos.push(sx * p[0], p[1], p[2]);
		nor.push(sx * n.x, n.y, n.z);
		uv.push(p[2], j / (nj - 1));
	};
	for (const sx of [1, -1]) for (let i = 0; i < ni - 1; i++) for (let j = 0; j < nj - 1; j++) {
		const quad = sx > 0 ? [[i, j], [i, j + 1], [i + 1, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]] : [[i, j], [i + 1, j], [i, j + 1], [i, j + 1], [i + 1, j], [i + 1, j + 1]];
		for (const [a, b] of quad) put(a, b, sx);
	}
	return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv) };
}
/** the shell lofted: its skin (side and crown) and its underside (underbody, wells and arches' roofs) as soups */
function shellSoups5() {
	const skin = [], under = [];
	for (const z of stations5()) {
		const pts = sectionPoints5(section5(z));
		skin.push(pts.skin.map(([x, y]) => [x, y, z]));
		under.push(pts.under.map(([x, y]) => [x, y, z]));
	}
	return { skin: gridSoup5(skin), under: gridSoup5(under) };
}
/**
 * A point on the shell's end, nose (dir 1) or tail (−1), at (x, y): the station where the section first holds it.
 * @param {number} x @param {number} y @param {1 | -1} dir
 */
function endZ5(x, y, dir) {
	const inside = (z) => {
		const s = section5(z);
		return y <= s.top && y >= s.lip && Math.abs(x) <= s.side(y);
	};
	// in from the tip in 5 mm steps to the first station that holds it (the arches break the shell's ends), then halved down
	let lo = dir > 0 ? F5.nose : F5.tail, hi = lo;
	const end = dir > 0 ? .2 : -.4;
	while (dir * (hi - end) > 0 && !inside(hi)) {
		lo = hi;
		hi -= dir * .005;
	}
	if (!inside(hi)) return end;
	for (let k = 0; k < 20; k++) {
		const m = (lo + hi) / 2;
		if (inside(m)) hi = m;
		else lo = m;
	}
	return (lo + hi) / 2;
}
/** a point on the shell's side at (z, y), side sx @param {number} z @param {number} y @param {1 | -1} [sx] @returns {V3} */
const sideAt5 = (z, y, sx = 1) => [sx * section5(z).side(y), y, z];
/** the shell's outward normal at a point on its side, nose or tail, by its neighbours @param {(u: number, v: number) => V3} f @param {number} u @param {number} v */
function normalOf5(f, u, v, e = .004) {
	const a = new three.Vector3(...f(u + e, v)).sub(new three.Vector3(...f(u - e, v)));
	const b = new three.Vector3(...f(u, v + e)).sub(new three.Vector3(...f(u, v - e)));
	return new three.Vector3().crossVectors(a, b).normalize();
}

/* —— cutting the shell into its panels: signed distances, positive inside a region —— */

/** a polygon's signed distance (negative inside) @param {V2[]} pts @param {number} px @param {number} py */
function sdPoly5(pts, px, py) {
	let d = Infinity, s = 1;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [ax, ay] = pts[j], [bx, by] = pts[i];
		const ex = bx - ax, ey = by - ay, wx = px - ax, wy = py - ay;
		const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey));
		d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
		const c1 = py >= ay, c2 = py < by, c3 = ex * wy > ey * wx;
		if (c1 && c2 && c3 || !c1 && !c2 && !c3) s = -s;
	}
	return s * d;
}
/**
 * A region as a rounded polygon: its signed distance, positive inside, its corners rounded by r (the polygon drawn
 * where its edges are, anticlockwise).
 * @param {V2[]} pts @param {number} r
 */
function region5(pts, r) {
	const core = insetEdges(pts, pts.map(() => r));
	return (u, v) => r - sdPoly5(core, u, v);
}
/**
 * A soup cut by a field: the part where f ≥ 0, each triangle the field crosses cut where it crosses (positions,
 * normals and uvs interpolated), so the edge is as smooth as the field.
 * @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} src @param {(x: number, y: number, z: number) => number} f
 */
function clip5(src, f) {
	const pos = [], nor = [], uv = [];
	const P = src.pos, Nn = src.nor, U = src.uv, n = P.length / 3;
	const vals = new Float32Array(n);
	for (let i = 0; i < n; i++) vals[i] = f(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
	const emit = (vs) => {
		for (let k = 1; k + 1 < vs.length; k++) for (const v of [vs[0], vs[k], vs[k + 1]]) pos.push(v[0], v[1], v[2]), nor.push(v[3], v[4], v[5]), uv.push(v[6], v[7]);
	};
	const vert = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2], U[i * 2], U[i * 2 + 1]];
	for (let t = 0; t < n; t += 3) {
		const a = vals[t], b = vals[t + 1], c = vals[t + 2];
		if (a >= 0 && b >= 0 && c >= 0) {
			emit([vert(t), vert(t + 1), vert(t + 2)]);
			continue;
		}
		if (a < 0 && b < 0 && c < 0) continue;
		const out = [];
		for (let k = 0; k < 3; k++) {
			const i = t + k, j = t + (k + 1) % 3, vi = vals[i], vj = vals[j];
			if (vi >= 0) out.push(vert(i));
			if (vi >= 0 !== vj >= 0) {
				const s = vi / (vi - vj), A = vert(i), B = vert(j);
				out.push(A.map((x, q) => x + (B[q] - x) * s));
			}
		}
		if (out.length >= 3) emit(out);
	}
	return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv) };
}
/** a soup as a geometry, its points moved `off` along their normals (out, or in when negative) @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s @param {number} [off] */
function geoOf5(s, off = 0) {
	const g = new three.BufferGeometry();
	const p = s.pos.slice();
	if (off) for (let i = 0; i < p.length; i++) p[i] += s.nor[i] * off;
	g.setAttribute("position", new three.BufferAttribute(p, 3));
	g.setAttribute("normal", new three.BufferAttribute(s.nor.slice(), 3));
	g.setAttribute("uv", new three.BufferAttribute(s.uv.slice(), 2));
	g.computeBoundingBox();
	g.computeBoundingSphere();
	return g;
}
/** a soup turned inside out (a lining seen from within): its winding and normals flipped @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s */
function flip5(s) {
	const pos = s.pos.slice(), nor = s.nor.slice(), uv = s.uv.slice();
	for (let t = 0; t < pos.length; t += 9) for (let q = 0; q < 3; q++) {
		const a = pos[t + 3 + q];
		pos[t + 3 + q] = pos[t + 6 + q];
		pos[t + 6 + q] = a;
		const b = nor[t + 3 + q];
		nor[t + 3 + q] = nor[t + 6 + q];
		nor[t + 6 + q] = b;
	}
	for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
	for (let t = 0; t < uv.length; t += 6) for (let q = 0; q < 2; q++) {
		const a = uv[t + 2 + q];
		uv[t + 2 + q] = uv[t + 4 + q];
		uv[t + 4 + q] = a;
	}
	return { pos, nor, uv };
}
/** a soup moved into another frame (its points less `o`) @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s @param {V3} o */
function shift5(s, o) {
	const pos = s.pos.slice();
	for (let i = 0; i < pos.length; i += 3) pos[i] -= o[0], pos[i + 1] -= o[1], pos[i + 2] -= o[2];
	return { pos, nor: s.nor, uv: s.uv };
}

/* —— the Fiat's own shapes, beside the base's: a profile swept along a path, a point on its ends —— */

/**
 * A closed profile swept along a path: at each point the profile's (out, up) laid across the path, `up` the world's
 * up (or the given vector) squared to the path, `out` beside it; `scale` thins it along the way (0…1 → factor). Its
 * ends capped.
 * @param {V3[]} path @param {V2[]} prof @param {{ up?: V3, scale?: (t: number) => number, flip?: boolean }} [o]
 */
function sweep5(path, prof, { up = [0, 1, 0], scale = () => 1, flip = false } = {}) {
	const n = path.length, k = prof.length;
	const pos = [], idx = [], uv = [];
	const U = new three.Vector3(...up);
	for (let i = 0; i < n; i++) {
		const a = new three.Vector3(...path[Math.max(0, i - 1)]), b = new three.Vector3(...path[Math.min(n - 1, i + 1)]);
		const t = b.sub(a).normalize();
		const u = U.clone().sub(t.clone().multiplyScalar(U.dot(t))).normalize();
		const o = new three.Vector3().crossVectors(t, u).multiplyScalar(flip ? -1 : 1);
		const s = scale(i / (n - 1));
		for (let j = 0; j < k; j++) {
			const p = new three.Vector3(...path[i]).addScaledVector(o, prof[j][0] * s).addScaledVector(u, prof[j][1] * s);
			pos.push(p.x, p.y, p.z);
			uv.push(i / (n - 1), j / k);
		}
	}
	for (let i = 0; i < n - 1; i++) for (let j = 0; j < k; j++) {
		const a = i * k + j, b = i * k + (j + 1) % k, c = (i + 1) * k + j, d = (i + 1) * k + (j + 1) % k;
		idx.push(a, c, b, b, c, d);
	}
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	const caps = [0, n - 1].map((i) => {
		const pts = prof.map((_, j) => new three.Vector3(pos[(i * k + j) * 3], pos[(i * k + j) * 3 + 1], pos[(i * k + j) * 3 + 2]));
		const c = pts.reduce((s, p) => s.add(p), new three.Vector3()).divideScalar(k);
		const cp = [], cu = [];
		for (let j = 0; j < k; j++) {
			const A = pts[j], B = pts[(j + 1) % k];
			const tri = i === 0 ? [c, B, A] : [c, A, B];
			for (const v of tri) cp.push(v.x, v.y, v.z), cu.push(0, 0);
		}
		const cg = new three.BufferGeometry();
		cg.setAttribute("position", new three.Float32BufferAttribute(cp, 3));
		cg.setAttribute("uv", new three.Float32BufferAttribute(cu, 2));
		cg.computeVertexNormals();
		return cg;
	});
	return GEO.merge([g, ...caps]);
}
/** a point on the nose (dir 1) or tail (−1) at (x, y), its outward normal, and a frame to stand a lamp in there @param {number} x @param {number} y @param {1 | -1} dir */
function onEnd5(x, y, dir) {
	const f = (u, v) => [u, v, endZ5(u, v, dir)];
	const n = normalOf5(f, x, y);
	if (n.z * dir < 0) n.negate();
	return { p: f(x, y), n };
}
/** a point on the side (sx) at (z, y) and its outward normal @param {number} z @param {number} y @param {1 | -1} sx */
function onSide5(z, y, sx) {
	const f = (u, v) => sideAt5(u, v, sx);
	const n = normalOf5(f, z, y);
	if (n.x * sx < 0) n.negate();
	return { p: f(z, y), n };
}
/** a geometry built facing +z laid on a point, facing `dir` @param {THREE.BufferGeometry} g @param {V3} p @param {THREE.Vector3} dir @param {number} [roll] */
function laid5(g, p, dir, roll = 0) {
	const q = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), dir.clone().normalize());
	if (roll) g.rotateZ(roll);
	return g.applyQuaternion(q).translate(...p);
}

/* —— where the shell is cut: its seams and openings, each a field positive inside (m) —— */

/** a rounded intersection of two fields, its corner of radius R @param {number} a @param {number} b @param {number} R */
const both5 = (a, b, R) => a > R || b > R ? Math.min(a, b) : R - Math.hypot(R - a, R - b);
/** the panels' gap, each side of a seam (m): 4.4 mm across */
const GAP5 = .0022;
const DOOR5 = /* @__PURE__ */ (() => region5([[-.32, .3], [.645, .3], [.645, .875], [.44, 1.2], [-.32, 1.212]], .035))();
const DOORWIN5 = /* @__PURE__ */ (() => region5([[-.272, .862], [.4, .862], [.248, 1.135], [-.272, 1.135]], .028))();
const QUARTER5 = /* @__PURE__ */ (() => region5([[-.885, .865], [-.385, .865], [-.385, 1.152], [-.64, 1.158]], .05))();
const SCREEN5 = /* @__PURE__ */ (() => region5([[-.458, .935], [.458, .935], [.452, 1.218], [-.452, 1.218]], .068))();
const BACKLIGHT5 = /* @__PURE__ */ (() => region5([[-.325, 1.01], [.325, 1.01], [.325, 1.215], [-.325, 1.215]], .05))();
const ROOFHOLE5 = /* @__PURE__ */ (() => region5([[F5.roof.z0, -F5.roof.x], [F5.roof.z1, -F5.roof.x], [F5.roof.z1, F5.roof.x], [F5.roof.z0, F5.roof.x]], .03))();
const ENGINELID5 = /* @__PURE__ */ (() => region5([[-.425, .435], [.425, .435], [.42, .848], [-.42, .848]], .045))();
/** the fields, by name: each (x, y, z) → m, positive inside */
const CUTS5 = {
	doorL: (x, y, z) => x > .25 ? DOOR5(z, y) : -1,
	doorR: (x, y, z) => x < -.25 ? DOOR5(z, y) : -1,
	winL: (x, y, z) => x > .25 ? DOORWIN5(z, y) : -1,
	winR: (x, y, z) => x < -.25 ? DOORWIN5(z, y) : -1,
	quarterL: (x, y, z) => x > .25 ? QUARTER5(z, y) : -1,
	quarterR: (x, y, z) => x < -.25 ? QUARTER5(z, y) : -1,
	screen: (x, y, z) => z > .3 && y > .88 ? SCREEN5(x, y) : -1,
	backlight: (x, y, z) => z < -.6 && y > .95 ? BACKLIGHT5(x, y) : -1,
	roof: (x, y, z) => y > 1.15 ? ROOFHOLE5(z, x) : -1,
	/** the front lid: above its seam along the wings and across the nose, ahead of the scuttle (which curves back to the sides) */
	frontLid: (x, y, z) => {
		const xs = Math.min(1, Math.abs(x) / .6);
		const seam = .716 + .02 * xs * xs + Math.max(0, .8 - z) * .12;
		return z < .45 ? -1 : both5(z - (.7 - .07 * xs * xs), y - seam, .07);
	},
	engineLid: (x, y, z) => z < -1 ? ENGINELID5(x, y) : -1
};
/** the soup outside every one of these fields, a gap's half from each seam @param {any} s @param {string[]} names @param {number} [g] */
const outside5 = (s, names, g = GAP5) => names.reduce((acc, n) => clip5(acc, (x, y, z) => -CUTS5[n](x, y, z) - g), s);
/** the soup inside a field, a gap's half in from its seam @param {any} s @param {string} name @param {number} [g] */
const inside5 = (s, name, g = GAP5) => clip5(s, (x, y, z) => CUTS5[name](x, y, z) - g);
/** a band of the soup along a field's edge, from `a` to `b` (m, positive inside) @param {any} s @param {string} name @param {number} a @param {number} b */
const band5 = (s, name, a, b) => clip5(clip5(s, (x, y, z) => CUTS5[name](x, y, z) - a), (x, y, z) => b - CUTS5[name](x, y, z));

/** the Fiat as the solver runs it: its cited mass, gearing and tyres; the rest [inferred] */
const VEHICLE5 = /* @__PURE__ */ (() => ({
	kerb: 520,
	payload: 320,
	Crr: .015,
	CdA: .38 * 1.37,
	r: TYRE5.r * .97,
	eta: .88,
	gears: [37 / 10, 31 / 15, 26 / 20, 21 / 24],
	final: 41 / 8,
	engine: {
		// its full-load curve to its maximum revs, 4,600 rpm (500 Club Italia's register, the 499.5 cc twin), no torque past them
		rpm: [800, 1500, 2000, 2500, 3000, 3500, 4000, 4600, 4650],
		nm: [17, 24, 27.5, 29.8, 31, 30.7, 29.6, 27.9, 0],
		idle: 850,
		stall: 600,
		max: 4800,
		up: 4300,
		down: 1700,
		launch: 1500,
		Vd: 499.5e-6,
		fmep: 13e4,
		bsfc: 270,
		fuel: "petrol",
		J: .045
	},
	Jw: .35,
	wheels: 4,
	axles: {
		wb: F5.axle.front - F5.axle.rear,
		h: .52,
		front: .42,
		loadFront: .45,
		k: [9e3, 14e3],
		travel: [.07, .09]
	}
}))();
const KMH5 = 1 / 3.6;

/**
 * The Fiat 500 F: a root at its real size, every part its own, vehicle.js's solver driving it.
 * @param {{ speed?: number, grade?: number, load?: number, doors?: number, roof?: number, lid?: number }} [o] the speed
 *   asked (km/h), the grade (%), the load in it (kg, beside its 520: a driver is 75), the doors open (0 shut … 1 open), the rolltop
 *   folded back (0 … 1), the engine lid up (0 … 1)
 * @returns {THREE.Group}
 */
function fiat500({ speed = 60, grade = 0, load = 0, doors = 0, roof = 0, lid = 0 } = {}) {
	const root = new three.Group();
	root.name = "Fiat 500 F";
	const M = materials5(), R = vehicleMaterials(), E = engineMaterials();
	const kit = assetKit(root, { assemblies: ASSEMBLIES5, steps: STEPS5, sources: SOURCES5 });
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** the sprung body: the shell and everything bolted to it, sinking and pitching on the springs */
	const body = new three.Group();
	body.name = "sprung";
	root.add(body);
	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	const { axle } = F5;
	const sim = vehicleSolver(VEHICLE5);
	/** what moves with the solver or a slider each tick, beside the wheels, doors and lid */
	const ticks = [];
	const kmh = () => sim.s.v * 3.6;

	/* —— the shell —— */
	const shell = shellSoups5();
	const skin = shell.skin;
	const openings = ["doorL", "doorR", "frontLid", "engineLid", "screen", "backlight", "quarterL", "quarterR", "roof"];
	{
		const paint = outside5(skin, openings);
		// the dark of each gap: a strip of the shell along every seam, set in behind it
		const gaps = ["doorL", "doorR", "frontLid", "engineLid"].map((n) => geoOf5(band5(skin, n, -.009, .009), -.007));
		part({
			id: "shell",
			label: "Body shell",
			assembly: "body",
			source: SRC5.look,
			what: "The 500’s load-bearing steel body, pressed and welded in one: its sides with the wheel arches and sills, the roof with its rolltop’s opening, the scuttle, the wings, the nose and the tail with its louvred intake. Its outline is its reference sheet’s, traced view by view and lofted station by station; the doors and lids sit in it behind 4 mm gaps.",
			specs: [["Length", "2,970 mm over the bumpers (e5efff81-8de1-45b3-9de1-2fd3e521bd53)"], ["Width", "1,320 mm (e5efff81…)"], ["Height", "1,325 mm to the rolltop (e5efff81…)"], ["Wheelbase", "1,840 mm (e5efff81…)"], ["Tracks", "1,121 mm front, 1,135 mm rear (e5efff81…)"], ["Mass", "520 kg in running order (e5efff81…)"], ["Drag", "Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2) × 1.37 m² frontal area, measured off its front view"], ["Paint", "Rosso Corallo, Fiat 102 (1968–72), #b1372f (344cf860-1a7d-4bf7-86e3-ac16638425a4, d317c2f0-cfa5-4faa-b502-157ac3e44b52)"], ["Reference sheet", "fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a"], ["Panel gaps", "4.4 mm"]]
		}, [m(geoOf5(paint), M.paint), m(GEO.merge(gaps), M.gap)], { xray: "shell" });
		part({
			id: "underbody",
			label: "Floor pan and wheel wells",
			assembly: "body",
			source: SRC5.look,
			what: "The underside of the shell: the floor pan from end to end and the four wheel wells over the tyres, painted and sealed.",
			specs: [["Ground clearance", "130 mm (lowest point)"]]
		}, [m(geoOf5(shell.under), M.paintIn)], { xray: "shell" });
	}
	/* —— the glass, each pane in its rubber —— */
	{
		const panes = [], seals = [];
		for (const [n, w] of [["screen", .028], ["backlight", .022], ["quarterL", .024], ["quarterR", .024]]) {
			panes.push(geoOf5(inside5(skin, n, .006), -.006));
			seals.push(geoOf5(band5(skin, n, -.001, w), .0015));
		}
		part({
			id: "glass",
			label: "Windscreen, back and quarter windows",
			assembly: "body",
			source: SRC5.trim,
			what: "The laminated windscreen (larger on the F than on the D), the toughened back window over the engine and the two fixed quarter windows, each set in a black rubber seal in the shell’s flange.",
			specs: [["Windscreen", "laminated, curved"], ["Seals", "black rubber, 22–28 mm"]]
		}, [m(GEO.merge(panes), M.glass), m(GEO.merge(seals), M.rubber)]);
	}
	/* —— the doors, on their hinges at the front —— */
	const doorHinges = [];
	for (const sx of [1, -1]) {
		const n = sx > 0 ? "doorL" : "doorR", w = sx > 0 ? "winL" : "winR";
		const pivot = [sx * (section5(.645).side(.62) - .028), .62, .645];
		const h = hinge(body, { at: pivot, axis: "y", max: -sx * 1.15, name: `door-${sx > 0 ? "l" : "r"}` });
		doorHinges.push(h);
		const piece = inside5(skin, n);
		const outer = clip5(piece, (x, y, z) => -CUTS5[w](x, y, z) - .009);
		const frame = band5(piece, w, -.009, -.003);
		const seal = band5(piece, w, -.003, .004);
		const glass = clip5(piece, (x, y, z) => CUTS5[w](x, y, z));
		const card = clip5(piece, (x, y, z) => .86 - y);
		const geo = (s, off) => geoOf5(shift5(s, pivot), off);
		kit.part(new three.Group().add(m(geo(outer, 0), M.paint), m(geo(frame, .001), M.chrome), m(geo(seal, .0005), M.rubber), m(geo(glass, -.004), M.glass), m(geoOf5(shift5(flip5(card), pivot), .065), M.paintIn)), {
			id: `door-${sx > 0 ? "left" : "right"}`,
			label: sx > 0 ? "Door, left (the driver’s)" : "Door, right",
			assembly: "openings",
			source: SRC5.trim,
			what: "A front-hinged steel door (the F’s, by the Highway Code of 1965): its skin, the framed window with its chrome trim and the vent wing ahead of the winding glass, the painted inner panel; held by two hinges and a push-button lock.",
			moves: "Swings out on its hinges at its front edge.",
			drive: "A hand, by its handle",
			specs: [["Hinges", "2, at the front edge"], ["Opening", "66°"]]
		}, { explode: [sx * .5, 0, 0] }, h.pivot);
	}
	/* —— the front lid and the engine lid —— */
	{
		const lidF = inside5(skin, "frontLid");
		part({
			id: "front-lid",
			label: "Front lid",
			assembly: "openings",
			source: SRC5.look,
			what: "The domed front lid over the luggage space, the tank and the spare wheel: it covers the whole front from the scuttle to above the whiskers, its seam running along the wings’ shoulders.",
			specs: [["Seam", "4.4 mm"]]
		}, [m(geoOf5(lidF), M.paint)], { explode: [0, .3, .25] });
	}
	const lidPivot = [0, .848, endZ5(0, .848, -1) + .012];
	const engineLid = hinge(body, { at: lidPivot, axis: "x", max: 1.25, name: "engine-lid" });
	{
		const piece = inside5(skin, "engineLid");
		kit.part(new three.Group().add(m(geoOf5(shift5(piece, lidPivot)), M.paint), m(geoOf5(shift5(flip5(piece), lidPivot), .02), M.paintIn)), {
			id: "engine-lid",
			label: "Engine lid",
			assembly: "openings",
			source: SRC5.look,
			what: "The rear lid over the engine, hinged along its top under the louvred intake band: its two banks of horizontal louvres let the warm air out of the bay.",
			moves: "Swings up on its top hinges.",
			drive: "A hand, by its handle",
			specs: [["Louvres", "2 × 9"]]
		}, { explode: [0, .25, -.3] }, engineLid.pivot);
	}

	/* —— the wheels: drums all round, 125 SR 12 on 12-inch steel discs under domed caps —— */
	const wheelOpts = {
		size: TYRE5,
		rimW: 3.5 * .0254,
		et: .022,
		rim: "steel",
		studs: 4,
		pcd: .19,
		M: R,
		assembly: "wheels",
		source: SRC5.tyre,
		brake: "drum",
		drum: { r: .085, depth: .05 },
		rimMat: M.silver,
		specs: [["Tyre", "125 SR 12, 514 mm across (e12362b0…)"], ["Drum", "170 mm"]]
	};
	const corners = {
		fl: wheelCorner(kit, { ...wheelOpts, id: "fl", label: "front left", at: [axle.xF, axle.y, axle.front], side: 1, steers: true, arm: -1, drive: "The road; steered by its kingpin" }),
		fr: wheelCorner(kit, { ...wheelOpts, id: "fr", label: "front right", at: [-axle.xF, axle.y, axle.front], side: -1, steers: true, arm: -1 }),
		rl: wheelCorner(kit, { ...wheelOpts, id: "rl", label: "rear left", at: [axle.xR, axle.y, axle.rear], side: 1, drive: "The half-shaft, from the final drive" }),
		rr: wheelCorner(kit, { ...wheelOpts, id: "rr", label: "rear right", at: [-axle.xR, axle.y, axle.rear], side: -1, drive: "The half-shaft, from the final drive" })
	};
	// the domed hub cap and the rim's painted face, on each wheel
	for (const c of Object.values(corners)) {
		const x0 = wheelOpts.et + .02;
		const cap = latheX([[0, x0 + .036], [.012, x0 + .036], [.016, x0 + .033], [.03, x0 + .031], [.07, x0 + .025], [.1, x0 + .015], [.116, x0 + .005], [.119, x0], [0, x0]], 56);
		const face = latheX([[.105, x0 - .004], [.15, x0 - .012], [.153, x0 - .004], [.15, x0 + .002], [.112, x0 + .004]], 56);
		c.wheel.add(m(cap, M.cap), m(face, M.silver));
	}

	/* —— the rolltop: its canvas over the roof's opening, folding back in pleats —— */
	const roofMesh = m(new three.BufferGeometry(), M.canvas);
	const bow = new three.Group();
	{
		const r = F5.roof;
		const rail = geoOf5(band5(skin, "roof", -.016, -.002), .002);
		// the canvas's height: the sheet's top over the opening, crowned across, tucked down at its sides
		// the cited height (1,325 mm) is the canvas's crown: the traced top lifted to it over the opening's middle
		let peak = 0;
		for (let z = r.z0; z <= r.z1; z += .01) peak = Math.max(peak, traced(TRACE.top, TRACE.z0, TRACE.dz, z));
		const lift = F5.H - peak;
		const yAt = (z, x) => traced(TRACE.top, TRACE.z0, TRACE.dz, clamp(z, r.z0 + .02, r.z1 - .02)) + lift * (1 - (x / r.x) ** 2) * Math.min(1, Math.min(z - r.z0, r.z1 - z) / .08) - .016 * (x / r.x) ** 2 - .034 * Math.max(0, Math.abs(x) / r.x - .93) / .07 - .03 * Math.max(0, 1 - Math.min(z - r.z0, r.z1 - z) / .02);
		const NZ = 40, NX = 16, pleats = 6;
		/** the canvas with its front edge `k` of the way back: the cloth bunched into pleats behind it */
		const build = (k) => {
			const zf = r.z1 - .002 - k * (r.z1 - r.z0 - .16), z0 = r.z0 + .002;
			const pos = [], uv = [], idx = [];
			for (let i = 0; i <= NZ; i++) {
				const u = i / NZ, z = z0 + (zf - z0) * u;
				const lift = .055 * k * Math.abs(Math.sin(u * pleats * Math.PI)) * (u < .98 ? 1 : 0);
				for (let j = 0; j <= NX; j++) {
					const x = -r.x + .004 + (2 * r.x - .008) * j / NX;
					pos.push(x, yAt(z, x) + lift, z);
					uv.push(x * 3, z * 3);
				}
			}
			for (let i = 0; i < NZ; i++) for (let j = 0; j < NX; j++) {
				const a = i * (NX + 1) + j, b = a + 1, c = a + NX + 1, d = c + 1;
				idx.push(a, b, c, b, d, c);
			}
			const g = new three.BufferGeometry();
			g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
			g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
			g.setIndex(idx);
			g.computeVertexNormals();
			roofMesh.geometry.dispose();
			roofMesh.geometry = g;
			bow.position.set(0, yAt(zf, 0) + .006, zf);
		};
		build(clamp(roof));
		let shown = clamp(roof);
		ticks.push(() => {
			const k = clamp(ctl.roof.value);
			if (Math.abs(k - shown) > 1e-3) build(shown = k);
		});
		bow.add(m(at(box(2 * r.x + .01, .016, .03, .006), 0, 0, 0), M.black), m(at(box(.07, .012, .03, .004), 0, .012, -.02), M.black));
		part({
			id: "rolltop",
			label: "Rolltop",
			assembly: "body",
			source: SRC5.trim,
			what: "The half-length canvas roof of the F: black cloth on a frame of bows, its front bow closing on the windscreen’s header with one central hook; undone, it folds back in pleats over the rear seat. Its rail round the opening is black rubber.",
			moves: "Folds back and closes, its front bow sliding on the rails.",
			drive: "A hand",
			specs: [["Opening", "690 × 770 mm"], ["Hook", "1, central (from 1965)"]]
		}, [roofMesh, bow, m(rail, M.rubber)]);
	}

	/* —— the bumpers: chrome blades wrapping round the ends —— */
	{
		const blade = [[-.006, -.034], [.012, -.036], [.024, -.028], [.03, -.012], [.031, 0], [.03, .014], [.024, .03], [.012, .038], [-.006, .036]];
		// the blades' outer faces in plan (z, x), traced off the sheet's top view: round the nose and the tail to the wings
		const plan = {
			"1": [[1.482, .093], [1.473, .2], [1.463, .267], [1.45, .343], [1.44, .384], [1.431, .42], [1.42, .458], [1.41, .483], [1.4, .504], [1.39, .52], [1.38, .534], [1.363, .556], [1.342, .571], [1.323, .58], [1.305, .583]],
			"-1": [[-1.478, .172], [-1.467, .278], [-1.458, .333], [-1.448, .377], [-1.439, .41], [-1.429, .442], [-1.42, .465], [-1.41, .485], [-1.4, .505], [-1.39, .519], [-1.38, .53], [-1.36, .551], [-1.34, .567], [-1.32, .58], [-1.3, .588], [-1.275, .59]]
		};
		const path = (dir, y) => {
			const half = plan[dir].map(([z, x]) => [x, y, z]);
			// each end turned in towards the wing, as the sheet's top view has it
			const [ex, , ez] = half[half.length - 1];
			half.push([ex - .012, y, ez - dir * .022], [ex - .035, y, ez - dir * .032]);
			const tip = [0, y, dir * 1.485];
			return [...half.slice().reverse().map(([x, yy, z]) => [-x, yy, z]), tip, ...half];
		};
		const face = blade.map(([o, u]) => [o - .031, u]);
		const geo = [sweep5(path(1, .352), face), sweep5(path(-1, .372), face, { flip: true })];
		const brackets = [];
		for (const [dir, y] of [[1, .352], [-1, .372]]) for (const sx of [-1, 1]) {
			const x = sx * .3, z = endZ5(x, y, dir);
			brackets.push(cyl([x, y, z - dir * .04], [x, y, dir * 1.44], .009, 10));
		}
		part({
			id: "bumpers",
			label: "Bumpers",
			assembly: "trim",
			source: SRC5.look,
			what: "Thin chrome-plated steel blades across the nose and the tail, wrapping round the corners, each on two brackets through the panel; no overriders, as on the F.",
			specs: [["Section", "70 × 30 mm"], ["Over them", "2,970 mm"]]
		}, [m(GEO.merge(geo), M.chrome), m(GEO.merge(brackets), R.zinc)], { explode: [0, 0, 0] });
	}

	/* —— the lamps: round headlamps and indicators in the nose, side repeaters, rectangular tail lamps —— */
	{
		const chrome = [], lens = [], refl = [], amber = [], red = [];
		for (const sx of [1, -1]) {
			// a headlamp: its chrome rim, the fluted lens, the reflector behind
			const h = onEnd5(sx * .455, .575, 1);
			const aim = h.n.clone().multiplyScalar(.45).add(new three.Vector3(0, 0, .55)).normalize();
			const p = [h.p[0], h.p[1], h.p[2] + .016];
			chrome.push(laid5(latheZ([[.066, -.02], [.083, -.01], [.086, .004], [.08, .016], [.07, .014], [.066, .004]], 64), p, aim));
			lens.push(laid5(latheZ([[0, .02], [.03, .019], [.055, .014], [.068, .006], [.068, -.004], [0, -.004]], 48), p, aim));
			for (const rr of [.018, .034, .05]) chrome.push(laid5(new three.TorusGeometry(rr, .0008, 4, 40).translate(0, 0, .0205 - rr * rr * 1.4), p, aim));
			refl.push(laid5(latheZ([[0, -.008], [.014, -.008], [.016, .002], [.01, .008], [0, .009]], 20), p, aim));
			refl.push(laid5(latheZ([[.068, -.004], [.05, -.03], [.02, -.048], [.012, -.05], [.012, -.044], [.02, -.042], [.05, -.024], [.064, -.004]], 40), p, aim));
			// the indicator under it, a clear round lens in a chrome base
			const i = onEnd5(sx * .52, .43, 1);
			const ai = i.n.clone().multiplyScalar(.6).add(new three.Vector3(0, 0, .4)).normalize();
			chrome.push(laid5(latheZ([[.036, -.01], [.047, -.004], [.048, .006], [.042, .008]], 40), i.p, ai));
			lens.push(laid5(latheZ([[0, .03], [.02, .027], [.036, .016], [.042, .006], [.042, 0], [0, 0]], 36), i.p, ai));
			// the side repeater on the wing
			const r = onSide5(1.26, .635, sx);
			chrome.push(laid5(latheZ([[.016, -.004], [.022, 0], [.021, .004], [.017, .004]], 24), r.p, r.n));
			amber.push(laid5(latheZ([[0, .01], [.012, .008], [.018, .003], [.018, 0], [0, 0]], 20), r.p, r.n));
		}
		part({
			id: "lights",
			label: "Headlamps, indicators and repeaters",
			assembly: "trim",
			source: SRC5.trim,
			what: "Two round headlamps set into the nose, their rims chromed on the F, asymmetric dipped beams behind fluted lenses; under each a round clear indicator; on each wing a small round amber repeater.",
			specs: [["Headlamps", "Ø 170 mm, 12 V 45/40 W [inferred]"], ["Indicators", "Ø 84 mm"]]
		}, [m(GEO.merge(chrome), M.chrome), m(GEO.merge(lens), M.lens), m(GEO.merge(refl), M.reflector), m(GEO.merge(amber), M.amber)]);
		const tc = [], ta = [], tr = [];
		for (const sx of [1, -1]) {
			const t = onEnd5(sx * .48, .525, -1);
			t.n.multiplyScalar(.4).add(new three.Vector3(0, 0, -.6)).normalize();
			const p = [t.p[0], t.p[1], t.p[2] - .004];
			tc.push(laid5(box(.092, .198, .05, .012).translate(0, 0, .008), p, t.n));
			ta.push(laid5(box(.074, .055, .022, .006).translate(0, .066, .03), p, t.n));
			tr.push(laid5(GEO.merge([box(.074, .058, .022, .006).translate(0, .003, .03), box(.074, .052, .022, .006).translate(0, -.064, .03)]), p, t.n));
		}
		part({
			id: "tail-lights",
			label: "Tail lamps",
			assembly: "trim",
			source: SRC5.trim,
			what: "The F’s larger rectangular tail lamps on the rear corners, without the D’s aluminium base: an amber indicator over the red tail and stop lamp and the red reflector, in a chrome frame.",
			specs: [["Size", "92 × 198 mm"]]
		}, [m(GEO.merge(tc), M.chrome), m(GEO.merge(ta), M.amber), m(GEO.merge(tr), M.red)]);
	}
	/* —— the whiskers and horn cover, the handles, the wipers —— */
	{
		const n = onEnd5(0, .54, 1);
		const shield = new three.Shape();
		shield.moveTo(-.058, .028);
		shield.quadraticCurveTo(0, .05, .058, .028);
		shield.lineTo(.066, 0);
		shield.quadraticCurveTo(.05, -.04, 0, -.05);
		shield.quadraticCurveTo(-.05, -.04, -.066, 0);
		shield.closePath();
		const cover = laid5(GEO.extrude(shield, .016, .006), [n.p[0], n.p[1], n.p[2] - .004], new three.Vector3(0, 0, 1));
		const grille = [];
		for (let k = -3; k <= 3; k++) grille.push(laid5(slab(.1, .004, .004).translate(0, k * .011, .022), [n.p[0], n.p[1], n.p[2] - .004], new three.Vector3(0, 0, 1)));
		const bars = [];
		for (const sx of [1, -1]) {
			const pts = [];
			for (let k = 0; k <= 16; k++) {
				const x = sx * (.068 + .215 * k / 16), y = .546 - .006 * (k / 16) ** 2;
				pts.push([x, y, endZ5(x, y, 1) + .005]);
			}
			bars.push(sweep5(pts, [[-.003, -.0045], [.004, -.004], [.006, 0], [.004, .004], [-.003, .0045]], { up: [0, 1, 0], scale: (t) => 1 - .55 * t, flip: sx < 0 }));
		}
		part({
			id: "whiskers",
			label: "Whiskers and horn cover",
			assembly: "trim",
			source: SRC5.trim,
			what: "The 500’s ‘moustache’: on the F one moulded piece, a chromed shield over the horn in the middle of the nose, its grille letting the horn’s sound out, and two chrome bars tapering out towards the headlamps. No badge or lettering here.",
			specs: [["Span", "570 mm"]]
		}, [m(GEO.merge([cover, ...bars]), M.chrome), m(GEO.merge(grille), M.cap)]);
		const wipers = [];
		for (const xp of [-.1, .29]) {
			const arm = [], blade = [];
			for (let k = 0; k <= 8; k++) {
				const x = xp - .34 * k / 8, y = .945 + .012 * k / 8;
				const o = onEnd5(x, y, 1);
				arm.push(new three.Vector3(...o.p).addScaledVector(o.n, .012).toArray());
				blade.push(new three.Vector3(...o.p).addScaledVector(o.n, .005).toArray());
			}
			wipers.push(sweep5(arm, [[-.004, -.003], [.004, -.003], [.004, .003], [-.004, .003]]), sweep5(blade.slice(1, 8), [[-.003, -.004], [.003, -.004], [.003, .004], [-.003, .004]]), latheY([[0, -.012], [.012, -.012], [.012, .004], [0, .004]], 16).translate(...arm[0]));
		}
		part({
			id: "wipers",
			label: "Windscreen wipers",
			assembly: "trim",
			source: SRC5.look,
			what: "Two wiper arms parked along the windscreen’s foot, their spindles through the scuttle, their rubber blades on chromed arms.",
			specs: [["Arms", "340 mm"]]
		}, [m(GEO.merge(wipers), M.chrome)]);
	}
	/* —— the louvres: the intake band over the engine lid and the lid's two banks —— */
	{
		const slots = [], lips = [], slotsLid = [];
		for (let k = 0; k < 40; k++) {
			const x = -.36 + .72 * k / 39;
			const s = onEnd5(x, .912, -1);
			slots.push(laid5(box(.008, .052, .01, .003), [s.p[0], s.p[1], s.p[2] + .003], s.n));
		}
		part({
			id: "intake",
			label: "Cooling-air intake",
			assembly: "body",
			source: SRC5.look,
			what: "The band of forty slots across the tail under the back window, where the engine’s fan draws its cooling air in.",
			specs: [["Slots", "40"]]
		}, [m(GEO.merge(slots), M.gap)]);
		for (const sx of [1, -1]) for (let k = 0; k < 9; k++) {
			const y = .755 + .075 * k / 8;
			const s = onEnd5(sx * .245, y, -1);
			const p = [s.p[0] - lidPivot[0], s.p[1] - lidPivot[1], s.p[2] - lidPivot[2]];
			slotsLid.push(laid5(box(.22, .0035, .004, .0012), [p[0], p[1], p[2] - .0005], s.n));
			lips.push(laid5(cyl([-.112, 0, 0], [.112, 0, 0], .0042, 10).scale(1, 1, .8), [p[0], p[1] + .0042, p[2] + .0012], s.n));
		}
		const lidStuff = [];
		const hd = onEnd5(0, .81, -1);
		lidStuff.push(laid5(box(.016, .05, .014, .006), [hd.p[0] - lidPivot[0], hd.p[1] - lidPivot[1], hd.p[2] - lidPivot[2] - .006], hd.n));
		const pl = onEnd5(0, .662, -1);
		lidStuff.push(laid5(new three.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(.13, .032, .03), [pl.p[0] - lidPivot[0], pl.p[1] - lidPivot[1], pl.p[2] - lidPivot[2]], pl.n));
		const lidGroup = engineLid.pivot.children[0];
		lidGroup.add(m(GEO.merge(slotsLid), M.gap), m(GEO.merge(lips), M.paint), m(GEO.merge(lidStuff), M.chrome));
	}
	/* —— the handles —— */
	for (const [k, h] of doorHinges.entries()) {
		const sx = k === 0 ? 1 : -1;
		const s = onSide5(-.25, .8, sx);
		const p = [s.p[0] - h.pivot.position.x, s.p[1] - h.pivot.position.y, s.p[2] - h.pivot.position.z];
		const g = [laid5(box(.13, .018, .012, .006).translate(0, 0, .026), p, s.n), laid5(box(.022, .02, .032, .004).translate(-.06, 0, .012), p, s.n), laid5(box(.022, .02, .032, .004).translate(.05, 0, .012), p, s.n), laid5(latheZ([[0, .02], [.008, .02], [.008, .004], [0, .004]], 16).translate(-.06, 0, 0), p, s.n)];
		h.pivot.children[0].add(m(GEO.merge(g), M.chrome));
	}

	/* —— the interior —— */
	{
		const floor = [at(box(1.08, .012, 1.36, .004), 0, .232, -.06)];
		const tunnel = [at(box(.15, .07, 1.25, .02), 0, .27, -.03)];
		part({
			id: "floor",
			label: "Floor, tunnel and mats",
			assembly: "cab",
			source: SRC5.trim,
			what: "The floor pan inside, its central tunnel carrying the gear linkage and the cables, all covered in striped black rubber on the F.",
			specs: [["Covering", "striped rubber"]]
		}, [m(GEO.merge([...floor, ...tunnel]), M.mat)]);
		const front = [];
		const base = [];
		for (const sx of [1, -1]) {
			const s = seatGeometry({ w: .44, d: .46, h: .3, back: .56, rake: .2, head: false });
			front.push(s.fabric.translate(sx * .265, .238, F5.driver.z));
			base.push(s.base.translate(sx * .265, .238, F5.driver.z));
		}
		part({
			id: "front-seats",
			label: "Front seats",
			count: 2,
			assembly: "cab",
			source: SRC5.trim,
			what: "Two bucket seats in pleated black vinyl on tubular frames, sliding on their runners; their backs tip forward to reach the rear bench.",
			specs: [["Covering", "vinyl, one colour from 10/68"]]
		}, [m(GEO.merge(front), M.vinyl), m(GEO.merge(base), R.chassis)]);
		const rb = seatGeometry({ w: .86, d: .44, h: .27, back: .48, rake: .32, head: false });
		part({
			id: "rear-bench",
			label: "Rear bench",
			assembly: "cab",
			source: SRC5.trim,
			what: "The rear bench for two between the wheel arches, its back against the bulkhead to the engine bay; its back folds forward for luggage.",
			specs: [["Seats", "2"]]
		}, [m(rb.fabric.translate(0, .238, -.64), M.vinyl), m(rb.base.translate(0, .238, -.64), R.chassis)]);
		// the dashboard: a painted shelf under the windscreen, its padded lip, the single instrument in front of the driver
		const dash = [at(box(1.08, .05, .1, .012), 0, .83, .6), at(box(1.08, .1, .012, .004), 0, .79, .552), at(box(1.0, .56, .012, .004), 0, .52, .665)];
		const pad = [at(box(1.06, .022, .03, .01), 0, .748, .552)];
		const knobs = [];
		for (const x of [.13, .085, .04, -.005]) knobs.push(cyl([x, .81, .55], [x, .81, .535], .006, 10));
		const gauges = cluster(kit, { dials: [{ x: 0, y: 0, r: .045, max: 120, ticks: 13 }], face: M.dial, tick: M.tick, needle: M.needle, bezel: M.chrome, housing: M.paint });
		gauges.group.position.set(F5.driver.x, .835, .54);
		const mirror = [at(box(.18, .05, .012, .01), 0, 1.165, .43), cyl([0, 1.2, .44], [0, 1.18, .435], .004, 8)];
		part({
			id: "dashboard",
			label: "Dashboard and instrument",
			assembly: "cab",
			source: SRC5.trim,
			what: "The 500’s dashboard: a painted steel shelf across the car under the windscreen over the bulkhead to the front compartment, a padded black lip below it; in front of the driver one round instrument, the speedometer to 120 km/h with the warning lights beside it; the switches in a row; the rear-view mirror on the windscreen’s header.",
			specs: [["Speedometer", "0–120 km/h"]]
		}, [m(GEO.merge(dash), M.paint), m(GEO.merge(pad), M.vinyl), m(GEO.merge(knobs), M.black), m(GEO.merge(mirror), M.chrome), gauges.group]);
		ticks.push(() => gauges.set([kmh()]));
		// the steering wheel: ivory, on its column down to the box behind the front axle
		const sw = steeringWheelGeometry({ R: .19, column: .5 });
		const wheelGroup = new three.Group();
		wheelGroup.position.set(...F5.wheel);
		wheelGroup.rotation.x = .42;
		const spin = new three.Group();
		spin.add(m(sw.rim, M.ivory), m(sw.hub, M.ivory));
		wheelGroup.add(spin, m(sw.column, M.black));
		ticks.push(() => (spin.rotation.z = -ctl.steer.value * Math.PI / 180 * 13));
		part({
			id: "steering-wheel",
			label: "Steering wheel and column",
			assembly: "cab",
			source: SRC5.trim,
			what: "The thin-rimmed ivory steering wheel on its column, which runs down through the front bulkhead to the worm of the steering box.",
			moves: "Turns with the steering.",
			drive: "The driver’s hands",
			specs: [["Diameter", "380 mm [inferred]"], ["Turns to the wheels", "about 13 : 1 [inferred]"]]
		}, [wheelGroup]);
		const pedals = [];
		for (const [x, w] of [[.36, .05], [.27, .06], [.2, .05]]) pedals.push(at(box(w, .07, .012, .004), x, .33, .6), bar([x, .36, .6], [x, .52, .62], .006, 8));
		const lever = [bar([0, .3, .18], [0, .5, .12], .006, 8), latheY([[0, -.016], [.016, -.012], [.017, 0], [.014, .012], [0, .016]], 18).translate(0, .51, .118), at(box(.02, .03, .2, .005), 0, .32, .02)];
		part({
			id: "pedals",
			label: "Pedals, gear lever and hand brake",
			assembly: "cab",
			source: SRC5.mech,
			what: "Clutch, brake and throttle pedals hung from the bulkhead; the long gear lever on the tunnel for the four gears (II–IV dog-engaged, no synchromesh: double-declutch); the hand brake lever behind it, working the rear drums.",
			specs: [["Gears", "4 + reverse"]]
		}, [m(GEO.merge(pedals), M.black), m(GEO.merge(lever), M.black)]);
	}

	/* —— the engine: the air-cooled vertical twin behind the rear axle, its crank along the car —— */
	const ENG = { z1: -1.045, z2: -1.155, y: .315, x: 0, r: .035, l: .118, top: .505 };
	const eng = new three.Group();
	eng.name = "engine";
	body.add(eng);
	const crank = new three.Group(), pistons = [], rods = [];
	{
		const { y, r } = ENG;
		const caseG = [at(box(.25, .19, .3, .03), 0, y - .02, -1.11), latheZ([[0, 0], [.13, 0], [.12, .05], [.09, .07], [0, .07]], 40).translate(0, y, -.96), at(box(.2, .03, .26, .01), 0, y - .125, -1.11)];
		for (let k = 0; k < 7; k++) caseG.push(at(slab(.004, .02, .24), -.09 + k * .03, y - .145, -1.11));
		part({ id: "crankcase", label: "Crankcase and sump", assembly: "engine", source: SRC5.mech, what: "The cast light-alloy crankcase carrying the crankshaft on its two main bearings, the camshaft below it driven by a chain, the oil in its finned sump; the gear pump and the centrifugal filter on the crank’s nose clean the oil.", specs: [["Displacement", "499.5 cc (e5efff81-8de1-45b3-9de1-2fd3e521bd53)"], ["Bore × stroke", "67.4 × 70 mm (e5efff81…)"], ["Power", "18 hp (13.2 kW) at 4,600 rpm (e5efff81…)"], ["Maximum revs", "4,600 rpm (75584c50-8752-4d4b-abdd-ad613d0ecee6)"], ["Torque", "31 N·m at 3,000 rpm (e5efff81…)"], ["Oil", "2.25 L [inferred]"]] }, [m(GEO.merge(caseG), M.alloy)], { xray: "shell", parent: eng }, eng);
		for (const zc of [ENG.z1, ENG.z2]) {
			const fins = [GEO.tube(.043, .0337, ENG.top - (y + .06), 40, y + .06)];
			for (let k = 0; k < 13; k++) fins.push(GEO.tube(.064, .042, .003, 40, y + .075 + k * .0095));
			part({ id: `barrel-${zc === ENG.z1 ? 1 : 2}`, label: `Cylinder barrel, ${zc === ENG.z1 ? "front" : "rear"}`, assembly: "engine", source: SRC5.mech, what: "A finned cast-iron barrel, 67.4 mm bore: the fan’s air, led round it by the shroud, carries the heat away from its fins.", specs: [["Bore", "67.4 mm"], ["Fins", "13"]] }, [m(GEO.merge(fins).translate(0, 0, zc), M.iron)], { xray: "shell" }, eng);
			const pg = new three.Group();
			pg.add(m(GEO.merge([latheY([[0, -.032], [.0335, -.032], [.0335, .022], [.031, .028], [0, .028]], 40), GEO.tube(.0338, .03, .003, 40, .012), GEO.tube(.0338, .03, .003, 40, .002)]), E.piston));
			pg.position.z = zc;
			eng.add(pg);
			pistons.push(pg);
			const rg = new three.Group();
			rg.add(m(GEO.merge([at(box(.016, ENG.l, .02, .004), 0, ENG.l / 2, 0), latheZ([[.016, -.012], [.026, -.012], [.026, .012], [.016, .012]], 24), latheZ([[.008, -.012], [.014, -.012], [.014, .012], [.008, .012]], 20).translate(0, ENG.l, 0)]), E.rod));
			rg.position.z = zc;
			eng.add(rg);
			rods.push(rg);
		}
		kit.part(new three.Group().add(...pistons.map((p) => p), ...rods), { id: "pistons", label: "Pistons and connecting rods", count: 2, assembly: "engine", source: SRC5.mech, what: "Two light-alloy pistons and their forged rods. The crank’s two throws are in line (360°): both pistons rise and fall together and the cylinders fire one turn apart, evenly.", moves: "Slide up and down in their barrels, 70 mm.", drive: "The crankshaft", specs: [["Stroke", "70 mm"], ["Compression", "7.1 : 1"], ["Rods", "118 mm [inferred]"]] }, { xray: "shell" }, eng);
		const cr = [cyl([0, 0, -.93], [0, 0, -1.3], .016, 20)];
		for (const zc of [ENG.z1, ENG.z2]) cr.push(at(box(.07, .1, .018, .008), 0, r / 2, zc + .025), at(box(.07, .1, .018, .008), 0, r / 2, zc - .025), cyl([0, r, zc + .03], [0, r, zc - .03], .016, 16));
		cr.push(latheZ([[.016, 0], [.12, 0], [.12, .028], [.016, .028]], 48).translate(0, 0, -.95), latheZ([[.016, -.012], [.056, -.012], [.056, -.008], [.05, 0], [.056, .008], [.056, .012], [.016, .012]], 40).translate(0, 0, -1.3));
		crank.add(m(GEO.merge(cr), E.crank));
		crank.position.set(0, y, 0);
		eng.add(crank);
		kit.part(crank, { id: "crankshaft", label: "Crankshaft, flywheel and pulley", assembly: "engine", source: SRC5.mech, what: "The forged crank with its two throws side by side, the flywheel and clutch on its front end towards the gearbox, the belt pulley on its back end driving the dynamo and the fan.", moves: "Turns (shown 40 times slower).", drive: "The pistons, by their rods", specs: [["Throws", "2, at 360°"]] }, { xray: "shell" }, eng);
		ticks.push((dt, s) => {
			const th = s.engAng;
			crank.rotation.z = th;
			for (let k = 0; k < 2; k++) {
				const zc = k ? ENG.z2 : ENG.z1;
				const pin = [-r * Math.sin(th), y + r * Math.cos(th), zc];
				const hy = pin[1] + Math.sqrt(ENG.l ** 2 - pin[0] ** 2);
				pistons[k].position.set(0, hy, zc);
				aim(rods[k], pin, [0, hy, zc]);
			}
		});
		// the head over both barrels, its fins, the rocker cover and the pushrods' tubes
		const head = [at(box(.15, .045, .24, .015), 0, ENG.top + .02, -1.1)];
		for (let k = 0; k < 8; k++) head.push(at(slab(.003, .04, .24), -.07 + k * .02, ENG.top + .02, -1.1));
		const cover = [at(box(.11, .035, .22, .012), 0, ENG.top + .062, -1.1)];
		const rodsT = [cyl([.055, .26, -1.05], [.055, ENG.top, -1.05], .007, 10), cyl([.055, .26, -1.15], [.055, ENG.top, -1.15], .007, 10)];
		part({ id: "head", label: "Cylinder head and valve gear", assembly: "engine", source: SRC5.mech, what: "One light-alloy head over both barrels, finned, with two overhead valves to each cylinder worked by pushrods and rockers from the camshaft in the crankcase; inlet opens 25° before top dead centre and closes 51° after bottom, exhaust opens 64° before bottom and closes 12° after top.", specs: [["Valves", "2 per cylinder, pushrod OHV"], ["Timing", "IO 25° BTDC, IC 51° ABDC, EO 64° BBDC, EC 12° ATDC"]] }, [m(GEO.merge(head), M.alloy), m(GEO.merge(cover), M.black), m(GEO.merge(rodsT), R.zinc)], { xray: "shell" }, eng);
	}
	{
		// the fan in its volute on the dynamo's shaft, the shroud leading its air over the barrels, the belt
		const fanAt = [.13, .44, -1.275];
		const shroud = [at(box(.32, .21, .28, .03), .02, .43, -1.1), latheZ([[.0, -.035], [.115, -.035], [.115, .035], [.0, .035]], 48).translate(...fanAt)];
		const fan = new three.Group();
		fan.position.set(...fanAt);
		const blades = [];
		for (let k = 0; k < 10; k++) blades.push(box(.012, .06, .03, .004).translate(0, .06, 0).rotateY(.5).rotateZ(k * Math.PI / 5));
		fan.add(m(GEO.merge([...blades, latheZ([[0, -.02], [.034, -.02], [.034, .02], [0, .02]], 30)]), M.fan));
		eng.add(fan);
		const dyn = [cyl([fanAt[0], fanAt[1], -1.25], [fanAt[0], fanAt[1], -1.06], .045, 28)];
		const belt = beltGeometry([[0, ENG.y, .056], [fanAt[0], fanAt[1], .036]], .006, .01).translate(0, 0, -1.3);
		const pulley = latheZ([[.01, -.008], [.036, -.008], [.036, .008], [.01, .008]], 30).translate(fanAt[0], fanAt[1], -1.3);
		part({ id: "shroud", label: "Fan shroud", assembly: "engine", source: SRC5.mech, what: "The black sheet-steel shroud round the barrels and the head: it leads the air the fan blows over their fins and out under the car, a thermostat’s flap closing it till the engine is warm.", specs: [["Cooling", "forced air, thermostat"]] }, [m(GEO.merge(shroud), M.shroud)], { xray: "shell" }, eng);
		kit.part(fan, { id: "fan", label: "Cooling fan", assembly: "engine", source: SRC5.mech, what: "A centrifugal fan on the dynamo’s shaft, in its volute in the shroud: it draws air in through the louvres under the back window and drives it over the cylinders.", moves: "Turns with the dynamo, faster than the crank.", drive: "The belt from the crank’s pulley", specs: [["Blades", "10"]] }, {}, eng);
		part({ id: "dynamo", label: "Dynamo and belt", assembly: "engine", source: SRC5.mech, what: "The 230 W dynamo above the crank, its pulley driven by a V-belt from the crank’s; the fan rides on its shaft.", specs: [["Dynamo", "12 V, 230 W"]] }, [m(GEO.merge(dyn), M.black), m(belt, E.belt), m(pulley, R.zinc)], {}, eng);
		ticks.push((dt, s) => (fan.rotation.z = s.engAng * 1.55));
		// the carburettor and its air filter on top, the exhaust's pipes to the silencer under the tail
		const carb = [at(box(.05, .06, .045, .008), -.085, ENG.top + .02, -1.1), cyl([-.085, ENG.top + .05, -1.1], [-.085, .63, -1.1], .018, 16), at(box(.05, .035, .05, .01), -.09, ENG.top - .03, -1.06)];
		const filter = [latheY([[0, 0], [.13, 0], [.135, .02], [.13, .055], [.11, .062], [0, .064]], 56).translate(-.03, .63, -1.11)];
		part({ id: "carburettor", label: "Carburettor and air filter", assembly: "engine", source: SRC5.mech, what: "One Weber 26 IMB single-choke downdraught carburettor (21 mm choke, 1.12 mm main jet) on the head’s inlet, the mechanical pump feeding it; the large round air filter of the F over it.", specs: [["Carburettor", "Weber 26 IMB 4 / IMB 10"], ["Choke", "21 mm"]] }, [m(GEO.merge(carb), M.alloy), m(GEO.merge(filter), M.black)], {}, eng);
		const ex = [hose([[.07, ENG.top - .01, -1.045], [.11, .4, -1.06], [.12, .28, -1.2], [.06, .25, -1.3]], .014, 10), hose([[.07, ENG.top - .01, -1.155], [.1, .4, -1.17], [.06, .27, -1.3]], .014, 10)];
		const sil = [at(box(.42, .085, .14, .03), -.02, .275, -1.3), hose([[.17, .27, -1.31], [.28, .262, -1.36], [.3, .258, -1.43]], .015, 10)];
		part({ id: "exhaust", label: "Exhaust and silencer", assembly: "engine", source: SRC5.trim, what: "The two exhaust pipes from the head down to the silencer across the tail, its shells overlapping (from 1966), the tailpipe out under the right of the bumper.", specs: [["Silencer", "pressed shells"]] }, [m(GEO.merge([...ex, ...sil]), M.exhaust)], {}, eng);
	}
	/* —— the gearbox and final drive in one casing ahead of the engine, the half-shafts —— */
	const shafts = [];
	{
		const z = F5.axle.rear;
		const box5 = [latheX([[0, -.13], [.07, -.13], [.1, -.08], [.1, .08], [.07, .13], [0, .13]], 40).translate(0, .26, z), at(box(.16, .14, .3, .03), 0, .27, z + .22), latheZ([[0, 0], [.11, 0], [.12, .06], [0, .06]], 36).translate(0, .29, z - .14)];
		part({ id: "gearbox", label: "Gearbox and final drive", assembly: "drivetrain", source: SRC5.mech, what: "The light-alloy casing bolted to the engine: the clutch, the crown wheel and pinion (8/41) and the differential at the rear axle’s line, the four-speed gearbox ahead of them (3.70, 2.067, 1.30, 0.875; II–IV dog-engaged), its selector rod running forward in the tunnel to the lever.", moves: "Its gears turn with the engine.", drive: "The engine, through the clutch", specs: [["Gears", "3.700, 2.067, 1.300, 0.875; teeth 37/10, 31/15, 26/20, 21/24 (3b5332c8-1083-4e85-bad5-156a90148b09)"], ["Final drive", "8/41 = 5.125 (3b5332c8…)"], ["Top speed", "95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68)"]] }, [m(GEO.merge(box5), M.alloy), m(cyl([0, .3, z + .37], [0, .3, .1], .006, 8), R.zinc)], { xray: "shell" });
		for (const sx of [1, -1]) {
			const sh = new three.Group();
			sh.add(m(unitBar(.013, 12), R.forged));
			root.add(sh);
			const joint = new three.Group();
			joint.add(m(new three.TorusGeometry(.03, .014, 10, 24).rotateY(Math.PI / 2), R.bush));
			root.add(joint);
			shafts.push({ sx, sh, joint });
		}
		kit.part(new three.Group().add(...shafts.map((s) => s.sh), ...shafts.map((s) => s.joint)), { id: "half-shafts", label: "Half-shafts", count: 2, assembly: "drivetrain", source: SRC5.mech, what: "Two half-shafts from the differential to the rear wheels: a sliding joint at the differential, a flexible rubber joint at the wheel, so the swinging arms may rise and fall.", moves: "Turn with the wheels; swing with the arms.", drive: "The differential", specs: [["Joints", "sliding inboard, flexible rubber outboard"]] }, {}, root);
	}
	/* —— the rear suspension: swinging arms on coil springs and dampers —— */
	const rearLegs = [];
	{
		const z = F5.axle.rear;
		const arms = [];
		for (const sx of [1, -1]) {
			const piv = [sx * .2, .27, z + .3], piv2 = [sx * .5, .27, z + .28];
			const hub = [sx * (F5.axle.xR - .07), F5.axle.y, z];
			const s = new three.Shape();
			const P = [[piv[0], piv[2]], [piv2[0], piv2[2]], [hub[0], hub[2] + .06], [hub[0], hub[2] - .06]];
			s.moveTo(P[0][0], P[0][1]);
			for (const p of P.slice(1)) s.lineTo(p[0], p[1]);
			s.closePath();
			arms.push(plate(s, .05, 4).rotateX(Math.PI / 2).translate(0, .27 + .025, 0), cyl([piv[0], .27, piv[2]], [piv2[0], .27, piv2[2]], .014, 12), latheX([[0, -.05], [.06, -.05], [.06, .05], [0, .05]], 24).translate(hub[0] - sx * .02, F5.axle.y, z));
			const leg = telescope({ body: .17, rod: .14, rBody: .02, coil: { R: .042, wire: .0085, turns: 6, seat: .05 }, M: R, mesh: (g, mt) => kit.mesh(g, mt) });
			body.add(leg.group);
			rearLegs.push({ leg, top: [sx * .43, .6, z - .02], low: [sx * .43, .29, z - .03] });
		}
		part({ id: "rear-arms", label: "Rear swinging arms", count: 2, assembly: "chassis", source: SRC5.mech, what: "A pressed-steel arm each side, pivoting on a slanted axis on the body ahead of the wheel (semi-trailing): each rear wheel rises and falls on its own, its hub bearing on the arm’s end.", moves: "Swings up and down with the road.", drive: "The road, against its spring", specs: [["Type", "semi-trailing [inferred from ‘swinging arms’]"]] }, [m(GEO.merge(arms), R.chassis)]);
		kit.part(new three.Group().add(...rearLegs.map((l) => l.leg.group)), { id: "rear-springs", label: "Rear coil springs and dampers", count: 2, assembly: "chassis", source: SRC5.mech, what: "A coil spring round a double-acting telescopic damper on each arm, against the body over the wheel.", moves: "Squeezed as the load and the road push the wheel up.", drive: "The arm", specs: [["Rate", "14 kN/m at the wheel [inferred]"]] }, {}, body);
	}
	/* —— the front suspension: a transverse leaf spring, upper links and dampers; the steering —— */
	const frontLegs = [];
	{
		const z = F5.axle.front;
		const lp = leafPack({ L: 1.0, w: .045, t: .006, n: 5, camber: .035 });
		const leaf = new three.Group();
		leaf.add(m(lp.geo, R.spring), ...lp.eyes.map((e) => {
			const mm = m(lp.eye, R.bush);
			e.add(mm);
			return e;
		}));
		leaf.rotation.y = Math.PI / 2;
		leaf.position.set(0, .2, z);
		const clamps = [at(box(.12, .05, .07, .01), 0, .23, z), at(box(.9, .06, .08, .015), 0, .29, z)];
		part({ id: "front-leaf", label: "Front leaf spring and crossmember", assembly: "chassis", source: SRC5.mech, what: "A transverse semi-elliptic leaf spring of five leaves clamped under the front crossmember: its ends carry the wheels’ lower kingpin joints, so it is both their spring and their lower link.", moves: "Its ends flex up as the wheels rise.", drive: "The road", specs: [["Leaves", "5 [inferred]"], ["Rate", "9 kN/m at the wheel [inferred]"]] }, [leaf, m(GEO.merge(clamps), R.chassis)]);
		const links = [];
		for (const sx of [1, -1]) {
			const c = corners[sx > 0 ? "fl" : "fr"];
			const up = c.joints.upper;
			links.push(bar([sx * .28, .42, z + .08], up, .011, 10), bar([sx * .28, .42, z - .08], up, .011, 10));
			const leg = telescope({ body: .16, rod: .12, rBody: .018, M: R, mesh: (g, mt) => kit.mesh(g, mt) });
			body.add(leg.group);
			frontLegs.push({ leg, top: [sx * .33, .55, z + .02], low: [sx * .42, .23, z] });
		}
		part({ id: "front-links", label: "Front upper links", count: 2, assembly: "chassis", source: SRC5.mech, what: "An upper wishbone each side, from the body to the kingpin’s top joint, locating the wheel over the leaf spring’s end.", moves: "Swing with the wheel.", drive: "The kingpin", specs: [["Type", "wishbone [inferred]"]] }, [m(GEO.merge(links), R.forged)]);
		kit.part(new three.Group().add(...frontLegs.map((l) => l.leg.group)), { id: "front-dampers", label: "Front dampers", count: 2, assembly: "chassis", source: SRC5.mech, what: "Double-acting telescopic dampers between the body and the leaf spring’s ends.", moves: "Slide as the wheels ride.", drive: "The wheel", specs: [["Type", "hydraulic, double-acting"]] }, {}, body);
		// the steering: a worm-and-sector box by the driver's side, its drop arm, a relay arm, the centre link and a track rod to each wheel
		const boxAt = [.26, .33, z - .16];
		const sbox = [latheX([[0, -.05], [.045, -.05], [.045, .05], [0, .05]], 24).translate(...boxAt), at(box(.06, .09, .08, .015), boxAt[0], boxAt[1] - .03, boxAt[2])];
		const linkage = new three.Group();
		const rods = [];
		const centre = [[.24, .25, z - .2], [-.24, .25, z - .2]];
		rods.push(bar(centre[0], centre[1], .009, 8), bar([.26, .29, z - .16], centre[0], .01, 8), bar([-.26, .29, z - .16], centre[1], .01, 8));
		const track = [];
		for (const sx of [1, -1]) {
			const t = corners[sx > 0 ? "fl" : "fr"].joints.tie;
			const tr = new three.Group();
			tr.add(m(unitBar(.008, 8), R.forged));
			body.add(tr);
			track.push({ tr, from: centre[sx > 0 ? 0 : 1], to: t });
		}
		linkage.add(m(GEO.merge(rods), R.forged));
		const column = [cyl(boxAt, [F5.wheel[0], F5.wheel[1] - .17, F5.wheel[2] + .22], .012, 10)];
		part({ id: "steering", label: "Steering box and linkage", assembly: "chassis", source: SRC5.mech, what: "A worm and helical sector in a box by the driver’s feet: the column turns the worm, the sector swings the drop arm, which moves a centre link pivoted on a relay arm opposite; a track rod from it to each wheel’s steering arm, behind the axle. Turning circle 8.6 m.", moves: "The links swing as the wheel is turned.", drive: "The steering wheel", specs: [["Type", "worm and helical sector"], ["Turning circle", "8.60 m (3b5332c8…)"]] }, [m(GEO.merge(sbox), R.castIron), linkage, m(GEO.merge(column), M.black)]);
		kit.part(new three.Group().add(...track.map((t) => t.tr)), { id: "track-rods", label: "Track rods", count: 2, assembly: "chassis", source: SRC5.mech, what: "A track rod from the centre link to each wheel’s steering arm, adjustable for toe.", moves: "Push and pull the steering arms.", drive: "The centre link", specs: [["Ends", "ball joints"]] }, {}, body);
		ticks.push((dt, s) => {
			const a = ctl.steer.value * Math.PI / 180;
			linkage.position.x = -a * .09;
			for (const t of track) aim(t.tr, [t.from[0] - a * .09, t.from[1], t.from[2]], t.to, true);
		});
	}
	/* —— the front compartment: the fuel tank and the spare wheel —— */
	{
		const tank = [latheX([[0, -.25], [.115, -.25], [.12, -.24], [.12, .24], [.115, .25], [0, .25]], 40).translate(0, .6, .74), cyl([.18, .7, .74], [.22, .82, .74], .018, 12)];
		part({ id: "fuel-tank", label: "Fuel tank", assembly: "front", source: SRC5.trim, what: "The F’s cylindrical tank of 22 litres, across the car under the front lid against the scuttle, its filler neck by the right wing; the mechanical pump draws from it to the carburettor at the back.", specs: [["Capacity", "22 L (1b98fcfa…)"], ["Shape", "cylindrical, Ø 240 × 500 mm"]] }, [m(GEO.merge(tank), R.zinc)], { xray: "shell" });
		const spare = new three.Group();
		spare.add(m(tyreGeometry({ size: TYRE5, rimW: wheelOpts.rimW, pattern: "highway", pitches: 16 }), R.tyre), m(steelRimGeometry({ rim: TYRE5.rim, rimW: wheelOpts.rimW, et: wheelOpts.et, studs: 4, pcd: .19 }), M.silver));
		spare.position.set(0, .5, 1.13);
		spare.rotation.set(0, Math.PI / 2, 0);
		spare.rotateOnWorldAxis(new three.Vector3(1, 0, 0), -.32);
		part({ id: "spare-wheel", label: "Spare wheel", assembly: "front", source: SRC5.tyre, what: "A fifth 125 SR 12 wheel standing in the nose behind the front panel, leaning back under the lid.", specs: [["Tyre", "125 SR 12"]] }, [spare]);
	}
	// the half-shafts, the rear legs, the front dampers: kept between the body and the wheels as they move
	ticks.push((dt, s) => {
		body.updateMatrix();
		const zR = F5.axle.rear;
		for (const { sx, sh, joint } of shafts) {
			const inner = inFrame(body, [sx * .13, .26, zR]);
			const outer = [sx * (F5.axle.xR - .085), F5.axle.y, zR];
			aim(sh, inner, outer, true);
			joint.position.set(...outer);
			sh.rotation.y = s.wheelAng;
		}
		for (const l of rearLegs) l.leg.set(l.top, l.low);
		for (const l of frontLegs) l.leg.set(l.top, l.low);
	});

	/* —— the drive, the controls and the lab —— */
	const ctl = {
		speed: { label: "Speed asked", min: 0, max: 110, value: speed, step: 1, unit: "km/h", ends: ["Standing", "110 km/h"] },
		grade: { label: "Grade", min: -15, max: 30, value: grade, step: .5, unit: "%", ends: ["Downhill", "Steep climb"] },
		load: { label: "Load inside (people and bags)", min: 0, max: VEHICLE5.payload, value: load, step: 5, unit: "kg", ends: ["Empty", "Four aboard"] },
		doors: { label: "Doors open", min: 0, max: 1, value: doors, step: .01, digits: 2, ends: ["Shut", "Open"] },
		roof: { label: "Rolltop folded back", min: 0, max: 1, value: roof, step: .01, digits: 2, ends: ["Closed", "Open"] },
		lid: { label: "Engine lid up", min: 0, max: 1, value: lid, step: .01, digits: 2, ends: ["Shut", "Up"] },
		steer: { label: "Steering", min: -30, max: 30, value: 0, step: 1, unit: "°", ends: ["Right lock", "Left lock"] }
	};
	const input = (env) => ({
		vSet: ctl.speed.value * KMH5,
		grade: env.broken ? .3 : ctl.grade.value / 100,
		load: env.broken ? VEHICLE5.payload * 1.6 : ctl.load.value
	});
	sim.settle(input({ broken: false }));
	kit.onTick((dt, env) => {
		const inp = input(env);
		sim.step(dt, inp);
		const s = sim.s;
		const al = (s.sagF - s.sagR) / VEHICLE5.axles.wb;
		body.rotation.x = al;
		body.position.y = -s.sagF + al * axle.front;
		body.updateMatrix();
		const st = ctl.steer.value * Math.PI / 180;
		for (const [id, c] of Object.entries(corners)) c.set(s.wheelAng, id[0] === "f" ? st : 0);
		for (const d of doorHinges) d.set(clamp(ctl.doors.value));
		engineLid.set(clamp(ctl.lid.value));
		for (const f of ticks) f(dt, s);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || lug && s.gear === 1 || s.bottomed;
		r.state = s.stalled ? env.broken ? `stalled: ${fmt(VEHICLE5.payload * 1.6)} kg in it up a 30 % grade` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `flat out in ${ordinal(s.gear)}` : s.Fb > 1 ? `braking in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? `first gear gives at most ${fmt(s.can)} N at the wheels, the hill and the road take ${fmt(s.need)} N` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3, 1)} kW at the flywheel · the road takes ${fmt(s.road.F)} N (rolling ${fmt(s.road.roll)}, climbing ${fmt(s.road.climb)}, air ${fmt(s.road.air)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 2)} L/h`}`;
	});
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: { label: "Power at the wheels", unit: "kW", max: 14, digits: 1 },
		read: { value: 0, state: "", sub: "", bad: false },
		controls: ctl,
		moves: {
			doors: { label: "Doors", seconds: 6, note: "both doors swung open and shut", at: (u) => ({ doors: Math.sin(u * Math.PI) }) },
			rolltop: { label: "Rolltop", seconds: 8, note: "the canvas folded back and closed again", at: (u) => ({ roof: Math.sin(u * Math.PI) }) },
			lid: { label: "Engine lid", seconds: 6, note: "the engine lid lifted and shut", at: (u) => ({ lid: Math.sin(u * Math.PI) }) }
		},
		how: {
			text: "A driver holds the speed asked: the road takes a force to roll the tyres, to lift the car up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the final drive’s losses at the engine. The driver picks the highest of the four gears that gives that push without the engine running too slow, and opens the throttle for it. Flat out on the level it reaches the twin’s maximum revs in fourth, 4,600 rpm: that is its top speed. Where first gear gives less than a hill takes, the speed falls, the engine lugs and stalls. Shown slowed: the wheels 10 times, the engine 40 times.",
			eqs: [
				"F = m g Crr cos θ + m g sin θ + ½ ρ Cd A v²      m = 520 kg + load, Crr = 0.015, Cd = 0.38, A = 1.37 m²",
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.88",
				"n = (v / r) · i_gear · i_axle      r = 0.249 m, i = 3.700, 2.067, 1.300, 0.875, i_axle = 41/8 = 5.125",
				"T_engine ≤ T_full(n)      31 N·m at 3,000 rpm, 27.9 N·m (13.2 kW) at 4,600, its maximum revs: none past them",
				"m_eff dv/dt = T i η / r − F      m_eff = m + (4 J_w + J_e i² η) / r²"
			]
		},
		breakIt: { label: "Four aboard with luggage up a 30 % hill", run: () => {}, reset: () => sim.restart() },
		cut: { a: [1, 0, 0], b: [0, 1, 0], center: [0, .6, 0], reach: .4 }
	};
	kit.seal({ lab }).tick(0, { broken: false, time: 0, slow: 0, cut: 0, xray: 0 });
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
const HISTORY = /* @__PURE__ */ (() => ({ fiat500: [{
	...FIRST,
	date: "2026-11-07"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "fiat500",
	label: "Fiat 500 F",
	note: "the Nuova 500 as built 1965–72, in Rosso Corallo 102, true to its reference sheet: its own body lofted from the sheet’s traced views, its glass, gaps, rolltop, lamps and chrome, its interior, and its own air-cooled twin, transaxle, leaf-sprung front and coil-sprung swinging arms behind, on the shared vehicle machinery; vehicle.js’s solver drives it",
	from: "Samuel 2026-11-07: a red Fiat 500 in the machines",
	params: [
		{ id: "doors", label: "Doors open", type: "number", value: 0, min: 0, max: 1, step: .05 },
		{ id: "roof", label: "Rolltop folded back", type: "number", value: 0, min: 0, max: 1, step: .05 },
		{ id: "lid", label: "Engine lid up", type: "number", value: 0, min: 0, max: 1, step: .05 }
	],
	variants: [{
		id: "fiat500",
		note: "2,970 × 1,320 × 1,325 mm, wheelbase 1,840, tracks 1,121 and 1,135, 520 kg (e5efff81-8de1-45b3-9de1-2fd3e521bd53); a 499.5 cc air-cooled twin, 67.4 × 70 mm, 18 hp at 4,600 rpm, 31 N·m at 3,000 (e5efff81-8de1-45b3-9de1-2fd3e521bd53), 4,600 rpm its maximum revs (75584c50-8752-4d4b-abdd-ad613d0ecee6); gears 3.700, 2.067, 1.300, 0.875, final drive 8/41 = 5.125 (3b5332c8-1083-4e85-bad5-156a90148b09); 125 SR 12 tyres, 514 mm across (e12362b0-2cf5-4b87-95da-e0f36b801404); top speed 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68); Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2); Rosso Corallo, Fiat 102, #b1372f (344cf860-1a7d-4bf7-86e3-ac16638425a4, d317c2f0-cfa5-4faa-b502-157ac3e44b52); its reference sheet fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a",
		make: (doors = 0, roof = 0, lid = 0) => castOf(fiat500({ doors, roof, lid }))
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