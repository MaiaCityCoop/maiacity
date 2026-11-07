/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { box, car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

/* ================================================================================================================
 * 2. THE DELIVERY VAN — a large high-roof panel van, the old city's parcels and shop deliveries
 *
 * Its measures are the class's (a large panel van, medium wheelbase and high roof, of the 2000s–2010s, from the makers'
 * published dimensions of the class): 5.50 m long, 2.02 m wide without its mirrors, 2.50 m tall; a 3.40 m wheelbase,
 * 0.95 m in front of the front axle and 1.15 m behind the rear; tracks of 1.70 m; 215/65 R16C tyres (0.69 m across,
 * 0.215 m wide, on 16" steel rims). A windowless load box behind the cab, sliding side doors, split rear doors. No
 * make, no model, no badge, no firm's name.
 * ============================================================================================================== */

const VAN = {
	id: 'delivery-van',
	L: 5.5, W: 2.02, H: 2.5,
	wheelbase: 3.4, rearAxle: 1.15, track: 1.7,
	tyre: { d: 0.686, w: 0.215, rim: 0.406 },
	// the shell, z in metres from the rear doors (0) to the front bumper (5.5)
	body: {
		// the high roof, rounding down to the raked windscreen, the short bonnet
		top: [[0, 2.45], [0.06, 2.5], [3.85, 2.5], [4.12, 2.4], [4.4, 2.02], [4.64, 1.4], [5.1, 1.18], [5.5, 0.96]],
		// the load box has no glass (its belt is its roof); the cab's beltline
		belt: [[0, 2.5], [3.45, 2.5], [3.5, 1.36], [4.5, 1.3], [5.5, 1.06]],
		hw: [[0, 0.97], [0.04, 1.01], [5.0, 1.01], [5.35, 0.96], [5.5, 0.88]],
		roofHw: [[0, 0.95], [3.85, 0.95], [4.25, 0.92], [4.64, 0.95], [5.5, 0.85]],
		bottom: [[0, 0.55], [0.5, 0.45], [1.6, 0.25], [4.1, 0.25], [4.95, 0.35], [5.5, 0.42]],
	},
	windows: {
		front: [4.1, 4.64], // the windscreen
		rear: null,
		side: [[3.6, 4.42]], // the cab doors' glass
	},
	seams: [2.1, 3.47, 4.52],
	doors: [[2.1, 3.47], [3.47, 4.52]],
	bumper: { y: 0.48, h: 0.24 },
	front: { lampW: 0.3, lampH: 0.14, lampX: 0.64, lampY: 0.82, grilleW: 0.78, grilleH: 0.18, grilleY: 0.73 },
	rear: { lampW: 0.14, lampH: 0.32, lampX: 0.86, lampY: 0.95, third: { z: 0.0, y: 2.42 } },
	hubcaps: false,
};

/** the van's fittings: its split rear doors, the sliding doors' rails, a roof rack on the worn ones */
function vanFittings(ctx) {
	const { s, Z, trim, look } = ctx;
	trim.push(box([0.012, 1.8, 0.006], [0, 1.5, Z(0) - 0.003]));
	for (const side of [1, -1]) trim.push(box([0.14, 0.03, 0.02], [side * 0.1, 1.35, Z(0) - 0.01]));
	// the sliding door's rail along the side, under the roof, behind the door
	for (const side of [1, -1]) trim.push(box([0.025, 0.04, 1.4], [side * (s.hw(1.4) + 0.01), 2.2, Z(1.35)]));
	if (look.rack) {
		for (const side of [1, -1]) trim.push(box([0.04, 0.05, 3.2], [side * 0.82, 2.58, Z(2.0)]));
		for (let z = 0.5; z <= 3.5; z += 0.6) trim.push(box([1.68, 0.035, 0.04], [0, 2.6, Z(z)]));
		for (const z of [0.5, 3.5]) for (const side of [1, -1]) trim.push(box([0.04, 0.09, 0.04], [side * 0.82, 2.53, Z(z)]));
	}
}

/** its paints */
const PAINTS = [
	{ name: 'white', label: 'Yellowed white', color: 0xcac8be, fade: 0.1, dust: 0.5, rust: 0.3 },
	{ name: 'grey', label: 'Dusty grey, roof rack', color: 0x707370, fade: 0.2, dust: 0.55, rust: 0.4, rack: true },
	{ name: 'red', label: 'Dull red, a white door', color: 0x6b2622, fade: 0.35, dust: 0.45, rust: 0.6, door: 0xcac8be },
	{ name: 'beige', label: 'Sun-bleached beige, rusting', color: 0xa39a83, fade: 0.25, dust: 0.5, rust: 1, rack: true },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Delivery van',
	note: 'A large high-roof panel van of the old city: 5.50 × 2.02 m, 2.50 m tall, a 3.40 m wheelbase on 215/65 R16C tyres; a windowless load box, sliding side doors, split rear doors, a roof rack on the worn ones, faded paint, dust and rust where the paint says; no firm\'s name. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== VAN.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: VAN.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(VAN, paint, vanFittings),
	};
};
