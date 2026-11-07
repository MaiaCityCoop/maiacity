/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { strip, box, lens, car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

/* ================================================================================================================
 * 2. THE SEDAN — a four-door family saloon of the old city, its taxis and its police cars made from it
 *
 * Its measures are the class's (a mid-size family saloon of the 2000s–2010s, from the makers' published dimensions
 * of the class): 4.75 m long, 1.83 m wide without its mirrors, 1.45 m tall; a 2.78 m wheelbase, 0.95 m in front of the
 * front axle and 1.02 m behind the rear (its boot); tracks of 1.57 m; 205/60 R16 tyres (0.65 m across, 0.205 m wide,
 * on 16" steel rims); 0.14 m off the ground. No make, no model, no badge.
 * ============================================================================================================== */

const SEDAN = {
	id: 'sedan',
	L: 4.75, W: 1.83, H: 1.45,
	wheelbase: 2.78, rearAxle: 1.02, track: 1.57,
	tyre: { d: 0.652, w: 0.205, rim: 0.406 },
	// the shell, z in metres from the rear bumper (0) to the front (4.75)
	body: {
		// the centreline's upper edge: the boot's rear face and lid, the rear window, the roof, the windscreen, the bonnet
		top: [[0, 0.93], [0.1, 0.99], [0.45, 1.02], [0.62, 1.04], [1.0, 1.28], [1.3, 1.41], [1.55, 1.445], [2.4, 1.45], [2.68, 1.42], [3.0, 1.2], [3.27, 0.98], [3.8, 0.91], [4.45, 0.84], [4.75, 0.73]],
		// the beltline: where the side glass starts (the boot's and the bonnet's edges behind and ahead of it)
		belt: [[0, 0.95], [0.7, 1.0], [3.3, 0.94], [4.75, 0.85]],
		// half the width at the shoulder, in plan: the corners rounded at each end
		hw: [[0, 0.83], [0.1, 0.89], [0.4, 0.915], [4.2, 0.915], [4.6, 0.87], [4.75, 0.79]],
		// half the roof's width (the glass leans in above the belt), of the boot lid and of the bonnet
		roofHw: [[0, 0.79], [0.62, 0.8], [0.95, 0.72], [1.35, 0.69], [2.6, 0.7], [2.95, 0.76], [3.27, 0.85], [4.75, 0.75]],
		// the underside: the bumpers' lower edges, the sills between the arches
		bottom: [[0, 0.34], [0.4, 0.25], [1.0, 0.18], [3.75, 0.18], [4.3, 0.25], [4.75, 0.32]],
	},
	windows: {
		front: [2.66, 3.26], // the windscreen
		rear: [0.64, 1.3], // the rear window over the boot
		side: [[1.44, 2.3], [2.42, 3.22]], // the rear and front doors' glass, the B-pillar between
	},
	seams: [1.4, 2.36, 3.4],
	doors: [[1.4, 2.36], [2.36, 3.4]],
	bumper: { y: 0.43, h: 0.2 },
	front: { lampW: 0.32, lampH: 0.1, lampX: 0.6, lampY: 0.655, grilleW: 0.6, grilleH: 0.1, grilleY: 0.585 },
	rear: { lampW: 0.3, lampH: 0.12, lampX: 0.63, lampY: 0.83, third: { z: 0.66, y: 1.05 } },
};

/* ================================================================================================================
 * 3. THE POLICE CAR — the sedan in a plain patrol livery: a blue band along its sides, a blue light bar on its roof
 *
 * No real force's markings, crest, word or pattern: white or silver paint, one dark blue band at door-handle height
 * from bumper to bumper, a light bar 1.15 m across, 0.15 m tall, on the roof over the front seats (two blue lenses
 * either side of its siren speaker), and two blue strobes behind the grille. Its beacons are `light:beacon-blue`, for
 * the world to flash; the rest of its lamps the sedan's.
 * ============================================================================================================== */

/** the patrol car's fittings on the sedan: its band, its light bar, its grille strobes, its push bar */
function patrol(ctx) {
	const { s, Z, L, trim, lamp, fit, look } = ctx;
	for (const side of [1, -1]) fit('livery band', look.band, strip(s, Z, 0.12, L - 0.12, 0.72, 0.86, side), { roughness: 0.4 });
	const z = 2.12, roof = s.top(z);
	trim.push(box([1.15, 0.05, 0.3], [0, roof + 0.02, Z(z)]));
	for (const side of [1, -1]) lamp('beacon-blue', lens([0.48, 0.09, 0.27], [side * 0.31, roof + 0.09, Z(z)], 0.4));
	trim.push(box([0.12, 0.08, 0.2], [0, roof + 0.085, Z(z)]));
	const F = ctx.spec.front;
	for (const side of [1, -1]) lamp('beacon-blue', box([0.08, 0.035, 0.02], [side * 0.18, F.grilleY, Z(L) + 0.012]));
	// a steel push bar on the front bumper, black
	trim.push(box([0.7, 0.04, 0.04], [0, 0.6, Z(L) + 0.08]));
	for (const side of [1, -1]) trim.push(box([0.04, 0.3, 0.04], [side * 0.32, 0.47, Z(L) + 0.08]));
}

/** its paints: a patrol car's, kept clean-ish, still old */
const PAINTS = [
	{ name: 'white', label: 'White, blue band', color: 0xcbc9c1, fade: 0.1, dust: 0.3, rust: 0.1, band: 0x1d3270 },
	{ name: 'silver', label: 'Silver, blue band', color: 0x979a9a, metallic: true, fade: 0.2, dust: 0.3, rust: 0, band: 0x1d3270 },
];

/* ================================================================================================================
 * 4. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Police car',
	note: 'The old city\'s patrol car: the sedan (4.75 × 1.83 m, 1.45 m to its roof) in a plain livery of no real force (white or silver, a dark blue band along its sides), a blue light bar on its roof (1.58 m over it), blue strobes behind its grille and a push bar. Its beacons are light:beacon-blue, for the world to flash; its other lamps light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse; its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== 'police-car' || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: 'police-car', version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car({ ...SEDAN, id: 'police-car', H: 1.58 }, paint, patrol),
	};
};
