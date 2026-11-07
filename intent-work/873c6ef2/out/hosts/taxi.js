/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */
const { THREE, box, lens, panel, car } = require("1db78f5dc8186d2afcb1551d1e15e757c20610bfbe7228e6638504f8b5b4ec5d");

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
 * 3. THE TAXI — the sedan as the old city's cabs run it: a lit roof sign, and on one paint a chequered band
 *
 * The roof sign is the usual cab's: 0.62 m across, 0.15 m tall, 0.20 m deep, on a black base clamped to the roof over
 * the front seats, the word TAXI on its front and back in plain block letters (a word, never a firm's name or mark),
 * lit from inside when the cab is free: `light:sign`, for the world to drive like the other lamps.
 * ============================================================================================================== */

/** plain block letters in a cell 1 wide and 1 tall: each bar [x, y, w, h], or [x, y, w, h, angle] for a diagonal */
const LETTERS = {
	T: [[0, 0.8, 1, 0.2], [0.4, 0, 0.2, 0.8]],
	A: [[0, 0, 0.22, 1], [0.78, 0, 0.22, 1], [0, 0.8, 1, 0.2], [0, 0.38, 1, 0.18]],
	X: [[0.4, -0.08, 0.2, 1.16, 0.62], [0.4, -0.08, 0.2, 1.16, -0.62]],
	I: [[0.39, 0, 0.22, 1]],
};

/** a word on a face of the sign, facing +z (the front) or -z (the back), read the right way round from each */
function word(text, at, facing, h = 0.075) {
	const w = h * 0.72, gap = h * 0.28;
	const total = text.length * w + (text.length - 1) * gap;
	const list = [];
	[...text].forEach((ch, i) => {
		for (const [x, y, bw, bh, a] of LETTERS[ch] ?? []) {
			const g = new THREE.PlaneGeometry(bw * w, bh * h);
			if (a) g.rotateZ(a);
			// along the word from its left as read; the back face reads from the other side
			const u = -total / 2 + i * (w + gap) + (x + bw / 2) * w;
			g.translate(u, (y + bh / 2 - 0.5) * h, 0);
			if (facing === '-z') g.rotateY(Math.PI);
			g.translate(at[0], at[1], at[2]);
			list.push(g);
		}
	});
	return list;
}

/** the cab's fittings on the sedan: its roof sign, and the chequered band where its paint has one */
function cab(ctx) {
	const { s, Z, trim, lamp, look } = ctx;
	const z = 2.0, roof = s.top(z);
	trim.push(box([0.5, 0.03, 0.24], [0, roof + 0.012, Z(z)]));
	const sign = { w: 0.62, h: 0.15, d: 0.2 };
	const y = roof + 0.025 + sign.h / 2;
	lamp('sign', lens([sign.w, sign.h, sign.d], [0, y, Z(z)], 0.35));
	for (const [dz, facing] of [
		[sign.d / 2 + 0.003, '+z'],
		[-sign.d / 2 - 0.003, '-z'],
	])
		for (const g of word('TAXI', [0, y, Z(z) + dz], facing)) trim.push(g);
	// a chequered band along both sides, two rows of squares, the dark ones laid on the light paint
	if (look.checker) {
		const q = 0.07, z0 = 1.44, z1 = 3.36, y0 = 0.74;
		for (const side of [1, -1])
			for (let r = 0; r < 2; r++)
				for (let i = r % 2; i * q < z1 - z0 - q; i += 2) {
					const zc = z0 + (i + 0.5) * q;
					trim.push(panel(q, q, [side * (s.hw(zc) + 0.004), y0 + (r + 0.5) * q, Z(zc)], side > 0 ? '+x' : '-x'));
				}
	}
}

/** its paints, a cab's, as they are after years of shifts in the old city */
const PAINTS = [
	{ name: 'yellow', label: 'Faded taxi yellow', color: 0xb08f2c, fade: 0.25, dust: 0.45, rust: 0.3 },
	{ name: 'cream', label: 'Cream, chequered', color: 0xc9c0a0, fade: 0.15, dust: 0.45, rust: 0.2, checker: true },
	{ name: 'black', label: 'Black cab', color: 0x1f2021, fade: 0.3, dust: 0.4, rust: 0.1 },
];

/* ================================================================================================================
 * 4. RECIPE
 * ============================================================================================================== */

const ASSET = {
	label: 'Taxi',
	note: 'The old city\'s cab: the sedan (4.75 × 1.83 m, 1.45 m to its roof) with a lit roof sign reading TAXI, 1.62 m over it; faded yellow, or cream with a chequered band, or black. Its lamps named for the world to drive (light:head, light:tail, light:brake, light:indicator-l, light:indicator-r, light:reverse, and light:sign, lit when it is free), its wheels named at their hubs (wheel:fl, fr, rl, rr) to turn about x. Under 6k triangles.',
};

module.exports.recipe = function (id, v, variant) {
	const paint = variant ? PAINTS.find((p) => p.name === variant) : PAINTS[0];
	if (id !== 'taxi' || !paint) throw new Error(`no asset machines/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'machines', id: 'taxi', version: v, variant: paint.name, label: `${ASSET.label}: ${paint.label}`, note: ASSET.note },
		build: () => car({ ...SEDAN, id: 'taxi', H: 1.62 }, paint, cab),
	};
};
