/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { box, car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

/* ================================================================================================================
 * 2. THE SUV — a mid-size five-door sport utility of the old city: tall, heavy, one person in it
 *
 * Its measures are the class's (a mid-size, two-row SUV of the 2000s–2010s, from the makers' published dimensions of
 * the class): 4.60 m long, 1.86 m wide without its mirrors, 1.70 m tall to its roof (1.74 m over its rails); a 2.68 m
 * wheelbase, 0.92 m in front of the front axle and 1.00 m behind the rear; tracks of 1.60 m; 225/65 R17 tyres (0.72 m
 * across, 0.225 m wide, on 17" steel rims); 0.20 m off the ground. No make, no model, no badge.
 * ============================================================================================================== */

const SUV = {
	id: 'suv',
	L: 4.6, W: 1.86, H: 1.74,
	wheelbase: 2.68, rearAxle: 1.0, track: 1.6,
	tyre: { d: 0.724, w: 0.225, rim: 0.432 },
	// the shell, z in metres from the rear bumper (0) to the front (4.6)
	body: {
		// the centreline's upper edge: the tailgate, its near-upright window, the long roof, the windscreen, the tall bonnet
		top: [[0, 1.05], [0.06, 1.2], [0.2, 1.58], [0.42, 1.665], [2.6, 1.7], [2.86, 1.665], [3.2, 1.36], [3.5, 1.12], [4.1, 1.06], [4.45, 0.99], [4.6, 0.89]],
		// the beltline: high, where the side glass starts
		belt: [[0, 1.12], [0.5, 1.15], [3.5, 1.1], [4.6, 0.99]],
		// half the width at the shoulder, in plan
		hw: [[0, 0.86], [0.1, 0.915], [0.35, 0.93], [4.15, 0.93], [4.5, 0.89], [4.6, 0.82]],
		// half the roof's width, and of the bonnet ahead of the windscreen
		roofHw: [[0, 0.79], [0.42, 0.77], [2.7, 0.78], [3.1, 0.82], [3.5, 0.86], [4.6, 0.78]],
		// the underside: the bumpers' lower edges, the sills between the arches
		bottom: [[0, 0.43], [0.35, 0.33], [0.95, 0.25], [3.7, 0.25], [4.25, 0.34], [4.6, 0.41]],
	},
	windows: {
		front: [2.84, 3.5], // the windscreen
		rear: [0.08, 0.4], // the tailgate's glass
		side: [[0.5, 1.16], [1.34, 2.36], [2.48, 3.36]], // the rear quarter, rear door and front door glass
	},
	seams: [1.28, 2.42, 3.48],
	doors: [[1.28, 2.42], [2.42, 3.48]],
	bumper: { y: 0.53, h: 0.24 },
	front: { lampW: 0.34, lampH: 0.12, lampX: 0.6, lampY: 0.8, grilleW: 0.7, grilleH: 0.16, grilleY: 0.74 },
	rear: { lampW: 0.18, lampH: 0.26, lampX: 0.72, lampY: 0.9, third: { z: 0.4, y: 1.645 } },
};

/** its roof rails: two black bars on feet along the roof, 4 cm proud of it */
function rails(ctx) {
	const { s, Z, trim } = ctx;
	const z0 = 0.62, z1 = 2.55, x = 0.6;
	for (const side of [1, -1]) {
		const y = Math.max(s.top(z0), s.top(z1)) + 0.04;
		trim.push(box([0.035, 0.025, z1 - z0], [side * x, y, Z((z0 + z1) / 2)]));
		for (const z of [z0 + 0.03, z1 - 0.03]) trim.push(box([0.045, 0.045, 0.08], [side * x, s.top(z) + 0.02, Z(z)]));
	}
	// black plastic cladding along the sills
	for (const side of [1, -1]) {
		const a = s.axles[0] + s.Ra + 0.02, b = s.axles[1] - s.Ra - 0.02;
		trim.push(box([0.02, 0.12, b - a], [side * (s.hw((a + b) / 2) - 0.004), s.bottom((a + b) / 2) + 0.07, Z((a + b) / 2)]));
	}
}

/** its paints, as they are after years in the old city's sun and grime */
const PAINTS = [
	{ name: 'black', label: 'Chalky black', color: 0x222324, metallic: true, fade: 0.3, dust: 0.45, rust: 0 },
	{ name: 'silver', label: 'Faded silver', color: 0x8d9090, metallic: true, fade: 0.25, dust: 0.4, rust: 0 },
	{ name: 'grey', label: 'Gunmetal, dusty', color: 0x4f5352, metallic: true, fade: 0.2, dust: 0.55, rust: 0.15 },
	{ name: 'white', label: 'Yellowed white', color: 0xc6c3b8, fade: 0.1, dust: 0.45, rust: 0.2 },
	{ name: 'green', label: 'Dull green, rusting', color: 0x343d33, fade: 0.3, dust: 0.45, rust: 0.7 },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'SUV',
	note: 'A mid-size five-door SUV of the old city: 4.60 × 1.86 m, 1.70 m tall to its roof, a 2.68 m wheelbase on 225/65 R17 tyres, 0.20 m off the ground; a lofted shell with its glass between the pillars, roof rails and sill cladding, steel wheels with hub caps, black bumpers and blank plates, faded paint, dust and rust where the paint says. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== SUV.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: SUV.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(SUV, paint, rails),
	};
};
