/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { panel, strip, box, THREE, lens, car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

/* ================================================================================================================
 * 2. THE AMBULANCE — a box-bodied emergency ambulance of the old city, on a large van's cab and chassis
 *
 * Its measures are the class's (a European type C box ambulance on a 3.5–5 t van chassis-cab, from the converters'
 * and van makers' published dimensions): 6.20 m long, 2.25 m wide over its box (2.00 m over its cab) without mirrors,
 * 2.62 m to the box's roof, 2.77 m over its roof unit and beacons; a 3.67 m wheelbase, 1.00 m in front of the front axle
 * and 1.54 m behind the rear (the box's rear doors and step); tracks of 1.73 m; 225/75 R16C tyres (0.74 m across, 0.225 m
 * wide, on 16" steel rims); the box's floor 0.72 m off the road. No make, no model, no badge, no service's name.
 * ============================================================================================================== */

const AMBULANCE = {
	id: 'ambulance',
	L: 6.2, W: 2.25, H: 2.77,
	wheelbase: 3.665, rearAxle: 1.535, track: 1.73,
	tyre: { d: 0.744, w: 0.225, rim: 0.406 },
	// the shell, z in metres from the rear doors (0) to the front bumper (6.2): the box, then the cab
	body: {
		// the box's flat roof, the step down to the cab's roof, its steep windscreen, its short sloping bonnet
		top: [[0, 2.62], [4.15, 2.62], [4.18, 2.36], [4.62, 2.33], [4.9, 2.0], [5.28, 1.45], [5.9, 1.2], [6.2, 1.02]],
		// the box has no glass (its belt is its roof); the cab's beltline
		belt: [[0, 2.62], [4.15, 2.62], [4.18, 1.36], [5.3, 1.3], [6.2, 1.1]],
		// half the width: the box's square sides, the narrower cab
		hw: [[0, 1.09], [0.04, 1.125], [4.15, 1.125], [4.18, 1.0], [5.6, 1.0], [6.0, 0.95], [6.2, 0.87]],
		roofHw: [[0, 1.09], [4.15, 1.09], [4.18, 0.92], [4.8, 0.92], [5.3, 0.97], [6.2, 0.84]],
		// the box's floor, and the cab's sills and bumper
		bottom: [[0, 0.72], [4.12, 0.72], [4.2, 0.42], [5.9, 0.38], [6.2, 0.44]],
	},
	windows: {
		front: [4.64, 5.27], // the windscreen
		rear: null,
		side: [[4.3, 5.12]], // the cab doors' glass
	},
	seams: [4.22, 5.26],
	doors: [[4.22, 5.26]],
	bumper: { y: 0.5, h: 0.24 },
	front: { lampW: 0.3, lampH: 0.14, lampX: 0.68, lampY: 0.9, grilleW: 0.86, grilleH: 0.2, grilleY: 0.8 },
	rear: { lampW: 0.14, lampH: 0.36, lampX: 0.98, lampY: 1.05, third: { z: 0.0, y: 2.52 } },
	hubcaps: false,
};

/** the ambulance's fittings: its reflective livery, its rear doors, its beacons, its roof unit */
function emergency(ctx) {
	const { s, Z, L, trim, lamp, fit, look, mats } = ctx;
	const W = 1.125;
	const reflect = { roughness: 0.35, metalness: 0 };
	// along the box's sides: a band of retroreflective blocks, alternating, at the height a driver's lights reach
	const block = 0.6, y0 = 0.98, y1 = 1.3;
	for (const side of [1, -1])
		for (let i = 0, z = 0.08; z + block <= 4.1; i++, z += block)
			fit(i % 2 ? 'reflective (dark)' : 'reflective (light)', i % 2 ? look.dark : look.light, panel(block, y1 - y0, [side * (W + 0.004), (y0 + y1) / 2, Z(z + block / 2)], side > 0 ? '+x' : '-x'), reflect);
	// the band carried on round the cab's doors and wings, and a thin red line under the box's roof
	for (const side of [1, -1]) {
		fit('reflective (light)', look.light, strip(s, Z, 4.2, 6.05, y0, y1, side), reflect);
		fit('red line', 0x8a1c1c, panel(4.0, 0.08, [side * (W + 0.004), 2.32, Z(2.1)], side > 0 ? '+x' : '-x'), reflect);
	}
	// the rear doors: a split down the middle, their windows, and red and yellow chevrons on their lower half
	trim.push(box([0.012, 1.7, 0.006], [0, 1.62, Z(0) - 0.003]));
	for (const side of [1, -1]) fit('rear door glass', 0x262d31, box([0.62, 0.42, 0.01], [side * 0.5, 2.0, Z(0) - 0.004]), { roughness: 0.12, metalness: 0.75 });
	for (let k = 0; k < 7; k++) {
		const x = -0.84 + k * 0.28; // inside the doors' edges, the bars' tilt included
		const g = new THREE.PlaneGeometry(0.11, 0.62);
		g.rotateZ(x < 0 ? -0.7 : 0.7);
		g.rotateY(Math.PI);
		g.translate(x, 1.1, Z(0) - 0.008);
		fit(k % 2 ? 'chevron (red)' : 'chevron (yellow)', k % 2 ? 0x9a1f1a : 0xc4b928, g, reflect);
	}
	// a rear step under the doors
	trim.push(box([1.6, 0.06, 0.32], [0, 0.36, Z(0) + 0.12]));
	// beacons: a light bar on the cab's roof, a dome at each corner of the box's roof, strobes in the grille
	const zb = 4.45, rb = s.top(zb);
	trim.push(box([1.4, 0.05, 0.3], [0, rb + 0.02, Z(zb)]));
	for (const side of [1, -1]) lamp('beacon-blue', lens([0.6, 0.1, 0.27], [side * 0.36, rb + 0.095, Z(zb)], 0.4));
	for (const z of [4.02, 0.12]) for (const side of [1, -1]) lamp('beacon-blue', lens([0.18, 0.12, 0.18], [side * 0.92, 2.62 + 0.06, Z(z)], 0.5));
	for (const side of [1, -1]) lamp('beacon-blue', box([0.1, 0.04, 0.02], [side * 0.22, ctx.spec.front.grilleY, Z(L) + 0.012]));
	// the roof unit (the saloon's air conditioning) and the box's side door, kerb side (right, -x)
	trim.push(box([0.9, 0.14, 0.7], [0, 2.62 + 0.07, Z(2.4)]));
	for (const z of [2.95, 4.0]) trim.push(box([0.006, 1.75, 0.006], [-(W + 0.006), 1.68, Z(z)]));
	trim.push(box([0.02, 0.03, 0.14], [-(W + 0.012), 1.55, Z(3.1)]));
	void mats;
}

/** its paints */
const PAINTS = [
	{ name: 'white', label: 'Yellowed white', color: 0xd2d0c6, fade: 0.1, dust: 0.45, rust: 0.2, light: 0xc9c43a, dark: 0x2d6e3b },
	{ name: 'yellow', label: 'Faded yellow', color: 0xbfb646, fade: 0.2, dust: 0.45, rust: 0.15, light: 0xd2cf6a, dark: 0x2d6e3b },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Ambulance',
	note: 'The old city\'s emergency ambulance: a box body on a large van\'s cab and chassis, 6.20 × 2.25 m, 2.77 m over its roof unit; a band of retroreflective blocks along it, chevrons on its rear doors, a blue light bar on its cab and blue domes on the box\'s corners and in its grille (light:beacon-blue), no service\'s name or crest. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse, light:beacon-blue), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== AMBULANCE.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: AMBULANCE.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(AMBULANCE, paint, emergency),
	};
};
