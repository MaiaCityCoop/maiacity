/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

/* ================================================================================================================
 * 2. THE HATCHBACK — a compact five-door hatchback of the old city, the commonest car in its jams
 *
 * Its measures are the class's (a small family hatchback of the 2000s–2010s, from the makers' published dimensions
 * of the class): 4.05 m long, 1.73 m wide without its mirrors, 1.47 m tall; a 2.55 m wheelbase, 0.90 m in front of
 * the front axle and 0.60 m behind the rear; tracks of 1.48 m; 185/65 R15 tyres (0.62 m across, 0.185 m wide, on 15"
 * steel rims); 0.14 m off the ground. No make, no model, no badge.
 * ============================================================================================================== */

const HATCHBACK = {
	id: 'hatchback',
	L: 4.05, W: 1.73, H: 1.47,
	wheelbase: 2.55, rearAxle: 0.6, track: 1.48,
	tyre: { d: 0.621, w: 0.185, rim: 0.381 },
	// the shell, z in metres from the rear bumper (0) to the front (4.05)
	body: {
		// the centreline's upper edge: the hatch's rear face, its sloped rear window, the roof, the windscreen, the bonnet
		top: [[0, 0.97], [0.05, 1.05], [0.1, 1.1], [0.45, 1.3], [0.8, 1.4], [1.15, 1.455], [1.9, 1.47], [2.3, 1.445], [2.62, 1.22], [2.93, 0.95], [3.4, 0.89], [3.85, 0.83], [4.05, 0.73]],
		// the beltline: where the side glass starts (and the bonnet's edge, ahead of the windscreen)
		belt: [[0, 0.99], [0.5, 1.0], [2.95, 0.93], [4.05, 0.84]],
		// half the width at the shoulder, in plan: the corners rounded at each end
		hw: [[0, 0.76], [0.08, 0.83], [0.35, 0.865], [3.55, 0.865], [3.9, 0.82], [4.05, 0.73]],
		// half the roof's width (the glass leans in above the belt) and of the bonnet ahead of the windscreen
		roofHw: [[0, 0.7], [0.3, 0.66], [2.2, 0.67], [2.6, 0.72], [2.93, 0.8], [4.05, 0.69]],
		// the underside: the bumpers' lower edges, the sills between the arches
		bottom: [[0, 0.33], [0.3, 0.23], [0.75, 0.17], [3.15, 0.17], [3.6, 0.24], [4.05, 0.31]],
	},
	windows: {
		front: [2.3, 2.93], // the windscreen
		rear: [0.1, 0.72], // the tailgate's glass, raked
		side: [[1.1, 1.93], [2.04, 2.88]], // the rear door and front door glass (a thick C-pillar behind)
	},
	seams: [1.04, 1.99, 2.99],
	doors: [[1.04, 1.99], [1.99, 2.99]],
	bumper: { y: 0.42, h: 0.2 },
	front: { lampW: 0.27, lampH: 0.1, lampX: 0.56, lampY: 0.67, grilleW: 0.52, grilleH: 0.1, grilleY: 0.6 },
	rear: { lampW: 0.17, lampH: 0.2, lampX: 0.66, lampY: 0.84, third: { z: 0.74, y: 1.4 } },
};

/** its paints, as they are after fifteen years in the old city's sun and grime */
const PAINTS = [
	{ name: 'silver', label: 'Faded silver', color: 0x8f9291, metallic: true, fade: 0.25, dust: 0.35, rust: 0 },
	{ name: 'grey', label: 'Dusty grey', color: 0x5f6260, fade: 0.2, dust: 0.5, rust: 0.2 },
	{ name: 'black', label: 'Chalky black', color: 0x252627, fade: 0.35, dust: 0.45, rust: 0 },
	{ name: 'white', label: 'Yellowed white', color: 0xc4c1b6, fade: 0.1, dust: 0.4, rust: 0.4 },
	{ name: 'red', label: 'Dull red, a grey door', color: 0x6e2621, fade: 0.35, dust: 0.35, rust: 0.5, door: 0x6b6d6a },
	{ name: 'blue', label: 'Dull blue, rusting', color: 0x30404f, fade: 0.25, dust: 0.45, rust: 1 },
];

/* ================================================================================================================
 * 3. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Hatchback',
	note: 'A compact five-door hatchback of the old city: 4.05 × 1.73 m, 1.47 m tall, a 2.55 m wheelbase on 185/65 R15 tyres; a lofted shell with its glass between the pillars, its arches cut, steel wheels with hub caps, black bumpers and blank plates, faded paint, dust up its sills and rust where the variant says. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles, to be drawn by the hundred.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== HATCHBACK.id || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: HATCHBACK.id, version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car(HATCHBACK, paint),
	};
};
