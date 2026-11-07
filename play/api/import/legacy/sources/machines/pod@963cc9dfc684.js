//#piece 8b09f5bb2de61f82762268b682cbf1d947f2baf56fcbad747c26a1c14fc0649d
//#piece 1efe152e2d3f4c882dfd19692fd25dce72658f88aac3d155256189629921fc58
//#piece 3d8e5a77b519fbff6ef447b7ebf8fc0d3bbe59ccb60a9126d638967d582581f5
//#piece d15fad60f9cf053c6b2f2e409017e2b69c3c18d4db8f541817e46462caa90257
const PL$2 = 1.2;
const PW$2 = .8;
const PH$2 = .144;
const FORK_X = .264;
const WOOD$2 = "#c9a878";
const WOOD2$2 = "#b8955f";
const CRATE$5 = "#b98d55";
const CRATE2$4 = "#a87f4c";
const WRAP$2 = "#dfe3e2";
//#piece da73ef62b5355cbd3bed34b13dca0efdd04184218b10d8650eea07f7495afd14
*/
//#piece 5d3c7f2483ee45e995be4b7bce4db3441819e0acedef3a20a615bd7c04f56240
	]) put(block(PL$2, .022, w, [
		0,
		.13299999999999998,
		bz
	], .004), WOOD$2, bone);
	for (const bx of [
		-.5275,
		0,
		.5275
	]) {
		put(block(.145, .022, PW$2, [
			bx,
			.111,
			0
		], .004), WOOD2$2, bone);
		for (const bz of [
			-.3275,
			0,
			.3275
		]) put(block(.145, .078, .145, [
			bx,
			.061,
			bz
		], .006), WOOD2$2, bone);
	}
	for (const bz of [
		-.3275,
		0,
		.3275
	]) put(block(PL$2, .022, .1, [
		0,
		.011,
		bz
	], .004), WOOD$2, bone);
	if (stack <= .144) return;
	const top = stack - PH$2;
	for (let k = 0; k < 3; k++) put(block(1.18, top / 3 - .01, .78, [
		0,
		PH$2 + (k + .5) * (top / 3),
		0
	], .02), k % 2 ? CRATE$5 : CRATE2$4, bone);
	put(block(1.204, top * .7, .804, [
		0,
		PH$2 + top * .5,
		0
	], .02), WRAP$2, bone, 1);
}

//#endregion
//#piece 3d7e8a924021b294fac4ba3e314de552178989d0623a8195aa73c7b8bda77f0d
const BODY$5 = "#f1f0eb";
const BAND$5 = "#2f6f68";
const DARK$5 = "#2a2c2e";
const STEEL$4 = "#8f9498";
const TYRE$1 = "#1d1e20";
const GREEN = "#4fd18b";
const RED$5 = "#e0302a";
//#piece 55b316802a1c3001dcb59786ab8475b4676e94d7bbfdc5869c79143d2d3ae5d0
const WX$1 = .4;
const WZ$1 = -.22;
const FORK = .8;
const TINE_Y = .03;
//#piece 62287eb876bc978fe98a4b5b403830ca3ba5cd2fd0450add5c72ec217f601c5b
			WR,
			WZ$1
//#piece 5e0b507b3a502f6941b1c46522d9bc2c6f5957adfeba4aea334d00cddc4d6bff
	], .08), BODY$5, body);
	put(block(.764, .05, .864, [
		0,
		.37,
		-.52
	], .01), BAND$5, body);
	put(block(.7, .08, .05, [
		0,
		.15,
		-.96
	], .03), DARK$5, body);
	put(block(.56, .012, .14, [
		0,
		.47,
		-.82
	], .005), DARK$5, body);
	put(block(.6, .06, .012, [
		0,
		.22,
		-.084
	], .005), DARK$5, body);
//#piece 18f0d856c15c7141d31c523d7cc23ee551076d6e4f1c8607c6394ec8ccc2b606
	], .006), RED$5, body);
	for (const sx of [-1, 1]) {
		put(wheel(.055, .05, [
			sx * .26,
			.055,
			-.84
		], 14), TYRE$1, body);
		put(block(.06, .06, .06, [
			sx * .26,
			.11,
			-.84
		], .01), STEEL$4, body);
	}
	for (const sx of [-1, 1]) {
		put(wheel(WR, .07, [
			sx * WX$1,
			WR,
			WZ$1
		], 22), TYRE$1, `${name}Wheels`);
		put(wheel(WR * .55, .074, [
			sx * WX$1,
			WR,
			WZ$1
		], 5), STEEL$4, `${name}Wheels`);
	}
	for (const sx of [-1, 1]) put(block(.06, 1.12, .07, [
		sx * .3,
		.67,
		-.07
	], .012), STEEL$4, body);
	put(block(.66, .06, .07, [
		0,
		1.2,
		-.07
	], .012), STEEL$4, body);
	put(block(.56, .36, .03, [
		0,
		.23,
		-.015
	], .01), DARK$5, forks);
	for (const sx of [-1, 1]) {
		put(block(.12, .4, .035, [
			sx * FORK_X,
			.23,
			-.018
		], .008), STEEL$4, forks);
		put(block(.12, .035, FORK, [
			sx * FORK_X,
			.0475,
			FORK / 2
		], .008), STEEL$4, forks);
//#piece 1532a67b82a597ee04d719c21605620db9759ea9b89db664af7ce20745a2c050
		0,
		0,
		0,
		size
	];
}

//#endregion
//#region src/lib/actors/pod.js
//#piece 0cd254f23a8de8b4ebc0abe2b80f75399361952bdbb16bffbb82479fe14bf265
const BODY$4 = "#f1f0eb";
const BAND$4 = "#2f6f68";
const DARK$4 = "#2a2c2e";
const STEEL$3 = "#9a9fa3";
const HUB$4 = "#b7bbbd";
const GLASS$4 = "#a9c3cd";
const SEAT$4 = "#3f5f7a";
const FLOOR$4 = "#5b5e60";
const BAY$4 = "#3a3c3e";
const CRATE$4 = "#b98d55";
const CRATE2$3 = "#a87f4c";
const WHITE$4 = "#fff4d6";
const RED$4 = "#e0302a";
const HL$4 = 2;
const HW$4 = 1.22;
const ROUND$1 = .1;
/** the wheels: radius, the treads' x (half the gauge), the axles' z */
const R$4 = .2;
const GX$3 = 1.435 / 2;
const AZ$3 = 1.7;
//#piece de2df7bef5eaac6133e7b1251893e54f4c64be9205cab417c7ff9d35f4eb8b90
const MID$3 = 1.38;
const BAY_Y$4 = [.14, .52];
const CABIN$4 = .58;
/** the people mover's doors: their middle (z) and width; the goods pod's floor */
const DOOR_Z$3 = .975;
const DOOR_W$3 = .8;
const LOAD$3 = .16;
/** the goods pod's Euro pallets (./pallet.js): their rows' x and places' z, how far they are carried out of the doors,
*  and how far below (and towards their end) their bones pivot */
const ROW_X$2 = .6;
const PALLET_Z$2 = .62;
const OUT$2 = 2.45;
const PIVOT$2 = 400;
const FK_REST = .15;
const FK_WAIT = 3.6;
const FK_OFF = 4.32;
const FK_LIFT = .08;
const UP = .045;
/** the goods pod's racks over the axles: their compartments' heights from the floor up (m), a shelf between each */
const RACK$1 = [
	.42,
	.36,
	.32,
	.28,
	.27
];
/** each compartment's bottom and top */
const LEVELS$1 = /* @__PURE__ */ (() => RACK$1.map((h, i) => {
	const y0 = CABIN$4 + RACK$1.slice(0, i).reduce((a, b) => a + b, 0) + i * .015;
	return [y0, y0 + h];
}))();
const SIDES$3 = [["L", 1], ["R", -1]];
const ENDS$4 = [["N", 1], ["S", -1]];
/** the running gear, the ends, the roof, the shell's round corners and the lamps: what both variants share */
/** @param {Add} add */
function chassis$4(add) {
	for (const [e, sz] of ENDS$4) {
		const z = sz * AZ$3, axle = `axle${e}`;
		add(wheel(.045, GX$3 * 2 - .1, [
			0,
			R$4,
			z
		], 14), DARK$4, axle);
		for (const sx of [-1, 1]) {
			add(wheel(R$4, .1, [
				sx * GX$3,
				R$4,
				z
			], 28), STEEL$3, axle);
			add(wheel(.23, .022, [
				sx * .6575,
				R$4,
				z
			], 28), DARK$4, axle);
			add(wheel(R$4 * .55, .104, [
				sx * GX$3,
				R$4,
				z
			], 5), HUB$4, axle);
		}
		add(block(1.635, .08, .5, [
			0,
			.30000000000000004,
			z
		], .02), DARK$4, "base");
		add(block(.5, .22, .32, [
			0,
			.23,
			z - sz * .32
		], .03), DARK$4, "base");
		for (const sx of [-1, 1]) add(block(.04, .21999999999999997, .5200000000000001, [
			sx * 1.2,
			.94 / 2,
			sz * 3.28 / 2
		], .015), BODY$4, "base");
		add(block(HW$4 * 2 - 2 * ROUND$1, .21999999999999997, .04, [
			0,
			.94 / 2,
			sz * 1.98
		], .015), BODY$4, "base");
		add(block(2.2, .12, .06, [
			0,
			.36,
			sz * 1.97
		], .03), DARK$4, "base");
		for (const sx of [-1, 1]) {
			add(block(.26, .07, .014, [
				sx * .86,
				.9,
				sz * 1.998
			], .006), WHITE$4, `light${e}`);
			add(block(.16, .07, .014, [
				sx * .55,
				.9,
				sz * 1.998
			], .006), RED$4, `tail${e}`);
		}
	}
	add(block(HW$4 * 2, .2, 4, [
		0,
		2.4899999999999998,
		0
	], ROUND$1), BODY$4, "base");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(block(ROUND$1 * 2, 2.23, ROUND$1 * 2, [
		sx * 1.1199999999999999,
		2.9499999999999997 / 2,
		sz * 1.9
	], ROUND$1), BODY$4, "base");
}
//#piece 375a8b3a6351f90f4c5a2e6a5dd6e85168e31abc5a7529625d8c550509ab0488
function bay$3(add) {
	add(block(HW$4 * 2 - .04, .04, MID$3 * 2, [
		0,
		BAY_Y$4[0] - .02,
		0
	], .01), BAY$4, "base");
	for (const sz of [-1, 1]) add(block(HW$4 * 2 - .04, BAY_Y$4[1] - BAY_Y$4[0], .04, [
		0,
		(BAY_Y$4[0] + BAY_Y$4[1]) / 2,
		sz * 1.3599999999999999
	], .01), BAY$4, "base");
	for (const x of [
		-.6,
		0,
		.6
	]) add(block(.03, .02, MID$3 * 2 - .1, [
		x,
		BAY_Y$4[0] + .01,
		0
	], .005), HUB$4, "base");
	for (const [s, sx] of SIDES$3) {
		const h = BAY_Y$4[1] - BAY_Y$4[0];
		add(block(.035, h - .01, MID$3 * 2 - .02, [
			sx * 1.202,
			(BAY_Y$4[0] + BAY_Y$4[1]) / 2,
			0
		], .012), BODY$4, `flap${s}`);
		add(block(.03, .035, .4, [
			sx * 1.224,
			BAY_Y$4[0] + .06,
			0
		], .012), DARK$4, `flap${s}`);
	}
	for (const [x, z, w, h, d, c] of [
		[
			.55,
			-.8,
			.9,
			.34,
			.7,
			CRATE$4
		],
		[
			-.5,
			-.9,
			.7,
			.3,
			.5,
			CRATE2$3
		],
		[
			.3,
			.6,
			.6,
			.34,
			.6,
			CRATE2$3
		],
		[
			-.6,
			.85,
			.8,
			.26,
			.5,
			CRATE$4
		]
	]) add(block(w, h, d, [
		x,
		BAY_Y$4[0] + h / 2,
//#piece cc218a3ccfc57f98f00d303a73035210d6143a6996adf045769b228edd4d5057
function people$4(add) {
	bay$3(add);
	add(block(HW$4 * 2 - .04, .06, 3.96, [
		0,
		.5499999999999999,
		0
	], .01), FLOOR$4, "base");
	const top = 2.4099999999999997;
	for (const [s, sx] of SIDES$3) {
//#piece 7ab6fc380ec7eb8163eaf14b61b2595fa19235b22178a923dacf0d8e3a8a4e62
			[-1.9, -.975 - DOOR_W$3 / 2],
			[-.575, DOOR_Z$3 - DOOR_W$3 / 2],
			[1.375, 1.9]
//#piece 7ab43014a5cfebc4a0b645fe1380446b92eac7685330c32e784d71616f06a950
			], .02), BODY$4, "base");
			add(block(.052, .07, len, [
				x,
				.9500000000000001,
				mid
			], .005), BAND$4, "base");
			add(block(.02, 1.3599999999999997, len - .1, [
				sx * 1.19,
				3.46 / 2,
				mid
			]), GLASS$4, "base", 1);
			for (const z of [z0, z1]) add(block(.07, 1.9299999999999997, .08, [
				sx * 1.185,
				2.9899999999999998 / 2,
				z + (z === z0 ? .04 : -.04)
			], .02), BODY$4, "base");
		}
		add(block(.06, .06000000000000005, 4 - 2 * ROUND$1, [
			sx * 1.19,
			4.88 / 2,
			0
		], .01), BODY$4, "base");
		for (const [e, sz] of ENDS$4) {
			const bone = `door${s}${e}`, mid = sz * DOOR_Z$3;
			for (const dz of [-1, 1]) add(block(.04, 1.8299999999999996, .06, [
				sx * 1.2,
				2.9899999999999998 / 2,
				mid + dz * (DOOR_W$3 / 2 - .03)
			], .015), BODY$4, bone);
			add(block(.04, .4700000000000001, DOOR_W$3, [
				sx * 1.2,
				1.63 / 2,
				mid
			], .015), BODY$4, bone);
			add(block(.042, .07, DOOR_W$3, [
				sx * 1.2,
				.9500000000000001,
				mid
			], .005), BAND$4, bone);
			add(block(.04, .05, DOOR_W$3, [
				sx * 1.2,
				2.385,
				mid
			], .015), BODY$4, bone);
			add(block(.015, 1.3099999999999996, .7000000000000001, [
				sx * 1.2,
				3.41 / 2,
				mid
			]), GLASS$4, bone, 1);
//#piece c38f87904d5ba8881b18614fb0c85d9ad50410a59599204ae97b0a52f0675667
			], .014, .014), HUB$4, bone);
		}
	}
	for (const [, sz] of ENDS$4) {
		add(block(HW$4 * 2 - 2 * ROUND$1, .5100000000000001, .05, [
			0,
			(1.63 - .04) / 2,
			sz * 1.975
		], .02), BODY$4, "base");
		add(block(HW$4 * 2 - 2 * ROUND$1, .07, .052, [
			0,
			.9500000000000001,
			sz * 1.975
		], .005), BAND$4, "base");
		add(block(HW$4 * 2 - .2, 1.3599999999999997, .02, [
			0,
			3.46 / 2,
			sz * 1.97
		]), GLASS$4, "base", 1);
		add(block(1.2, .08, .03, [
			0,
			2.3499999999999996,
			sz * 1.99
		], .01), DARK$4, "base");
//#piece 4cd38b9a646eb30d185dd4af95a7eaaed7a143ab82bc4bdc16bca11b7e10e5d7
				], .04), SEAT$4, "base");
				add(block(.42, .62, .08, [
					x,
					1.3599999999999999,
					bz + f * .03
				], .04), SEAT$4, "base");
			}
			add(block(2.28, .37, .4, [
				0,
				.7649999999999999,
				bz + f * .26
			], .02), DARK$4, "base");
		}
		add(limb([
			0,
			.98,
			sz * DOOR_Z$3
		], [
			0,
			top,
			sz * DOOR_Z$3
		], .018, .018), HUB$4, "base");
	}
	add(block(HW$4 * 2 - .1, .4, .04, [
		0,
		1.7799999999999998,
		0
	], .02), SEAT$4, "base");
	for (const [, sz] of ENDS$4) add(block(.5, .05, 1, [
		0,
		2.3699999999999997,
		sz * DOOR_Z$3
	], .02), "#fbf7ea", "base");
}
/** the goods pod: a low hold between the axles, two doors each side, four Euro pallets; racks over the axles */
/** @param {Add} add */
function goods$4(add) {
	add(block(HW$4 * 2 - .04, .06, MID$3 * 2, [
		0,
		.13,
		0
	], .01), FLOOR$4, "base");
	for (const sz of [-1, 1]) {
		const lz = sz * 3.38 / 2;
		add(block(HW$4 * 2 - .04, .06, .56, [
			0,
			.5499999999999999,
			lz - sz * .03
		], .01), FLOOR$4, "base");
		add(block(HW$4 * 2 - .04, 2.3099999999999996, .04, [
			0,
			2.63 / 2,
			sz * MID$3
		], .01), BAY$4, "base");
		add(block(.03, 1.8899999999999997, .56, [
			0,
			3.05 / 2,
			lz - sz * .03
		], .01), BAY$4, "base");
		for (const [, y1] of LEVELS$1.slice(0, -1)) add(block(HW$4 * 2 - .04, .015, .56, [
			0,
			y1 + .0075,
			lz - sz * .03
		], .004), FLOOR$4, "base");
		add(block(HW$4 * 2 - 2 * ROUND$1, 1.8899999999999997, .05, [
			0,
			3.05 / 2,
			sz * 1.975
		], .02), BODY$4, "base");
		add(block(HW$4 * 2 - 2 * ROUND$1, .07, .052, [
			0,
			1,
			sz * 1.975
		], .005), BAND$4, "base");
	}
	for (const [s, sx] of SIDES$3) {
		const x = sx * 1.195;
		for (const [e, sz] of ENDS$4) {
//#piece 6d3c03eb417dd2e89625e4c61fa221e088b3430fd72dd869f139d6a3cd5490b9
			], .015), BODY$4, bone);
			add(block(.044, .07, w, [
				x,
				1,
				mz
			], .005), BAND$4, bone);
			add(limb([
				sx * 1.24,
				1.2,
				sz * 1.45
			], [
				sx * 1.24,
				1.6,
				sz * 1.45
			], .014, .014), HUB$4, bone);
		}
		add(block(.06, .1, 4 - 2 * ROUND$1, [
			sx * 1.19,
			2.42,
			0
		], .01), BODY$4, "base");
		for (const [e, sz] of ENDS$4) {
			const bone = `door${s}${e}`, mid = sz * MID$3 / 2;
			add(block(.04, 2.2099999999999995, 1.3699999999999999, [
				x,
				2.53 / 2,
				mid
			], .015), BODY$4, bone);
			for (const k of [
				.15,
				.5,
				.85
			]) add(block(.02, 2.1099999999999994, .04, [
				sx * 1.218,
				2.53 / 2,
				sz * MID$3 * k
			], .008), "#e2e1db", bone);
			add(block(.044, .07, 1.3699999999999999, [
				x,
				1,
				mid
			], .005), BAND$4, bone);
			add(block(.02, .1, 1.0799999999999998, [
				sx * 1.212,
				2.25,
				mid
			], .01), GLASS$4, bone, 1);
			add(limb([
				sx * 1.24,
				.9,
				sz * .1
			], [
				sx * 1.24,
				1.4,
				sz * .1
			], .014, .014), HUB$4, bone);
		}
	}
	for (const [s, sx] of SIDES$3) for (const [e, sz] of ENDS$4) euroPallet(add, [
		sx * ROW_X$2,
		LOAD$3,
		sz * PALLET_Z$2
	], Math.PI / 2, `pallet${s}${e}`);
	for (const sz of [-1, 1]) for (const sx of [-1, 1]) for (const [i, [y0, y1]] of LEVELS$1.entries()) {
		const h = (y1 - y0) * .75;
		add(block(.45, h, .4, [
			sx * (.75 - i % 2 * .1),
			y0 + h / 2,
			sz * 1.65
		], .02), i % 2 ? CRATE2$3 : CRATE$4, "base");
		if (i % 2 === 0) add(block(.3, h * .7, .3, [
			sx * .3,
			y0 + h * .35,
			sz * 1.67
		], .02), CRATE2$3, "base");
//#piece a9ff27a29b663ebb2a7091239dfa5c0b8a3bbab7b01c669d2f1968282123de56
* racks' doors (one number for all, or one each by name: `LN` is the left one at the north end); how high the pallets
* are lifted off the floor (0 … 1: as a forklift lifts them), and the forklifts: where their heels are (x, out from the
* middle) and how high their forks (none: hidden).
* @param {Kind} kind
* @param {{ z?: number, lead?: -1 | 0 | 1, doors?: number, flaps?: number, out?: number, up?: number, racks?: number | ((name: string) => number), fk?: { x: number, lift: number } | null }} s
* @returns {Pose}
*/
function at$4(kind, { z = 0, lead = 0, doors = 0, flaps = 0, out = 0, up = 0, racks = 0, fk = null }) {
	/** @type {Pose} */
	const p = { root: [
		0,
		0,
		z
	] };
	for (const [e, sz] of ENDS$4) {
		p[`axle${e}`] = [
			z / R$4,
			0,
			0
		];
//#piece 8c09fa285d821b2b9815472e8d3974caa3e5c411888af74ff271548b91d60cb5
	}
	for (const [s, sx] of SIDES$3) if (kind === "people") {
		for (const [e, sz] of ENDS$4) p[`door${s}${e}`] = [
//#piece 3bc495e932d47f54ae69bf3bd68636d077fbbb18b69bd3cd5250bbb1589f70fe
	} else for (const [e, sz] of ENDS$4) {
		p[`door${s}${e}`] = [
			0,
			-sx * sz * 1.6 * doors,
			0
		];
		p[`pallet${s}${e}`] = [
			0,
			0,
			-Math.asin(sx * OUT$2 * out / PIVOT$2)
		];
		const sink = PIVOT$2 - Math.sqrt(PIVOT$2 ** 2 - (OUT$2 * out) ** 2);
		p[`palletUp${s}${e}`] = [
			-sz * Math.asin((UP * up + sink) / PIVOT$2),
			0,
			0
		];
		forkliftPose(p, `fk${s}${e}`, -sx * Math.PI / 2, fk ? {
			move: FK_REST - fk.x,
			lift: fk.lift
		} : { show: false });
//#piece 0f9f96f49b6306e1a274cac3b9ffd34887ab7184cbb228c663c20cd66aa3d661
const ramp$4 = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/** Build a pod and its moves. @param {Kind} kind @returns {Cast} */
function pod$4(kind) {
//#piece 52a108852e60be1bbd44aa056d699e283ddb3240072c18e07352460d8221ea85
	}, ...ENDS$4.flatMap(([e, sz]) => [
		{
			name: `axle${e}`,
			parent: "base",
			at: [
				0,
				R$4,
				sz * AZ$3
			]
		},
		{
			name: `light${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$4
			]
		},
		{
			name: `tail${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$4
			]
		}
	])];
	for (const [s, sx] of SIDES$3) if (kind === "people") {
		for (const [e, sz] of ENDS$4) bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN$4,
				sz * 1.375
			]
		});
		bones.push({
			name: `flap${s}`,
			parent: "base",
			at: [
				sx * HW$4,
				BAY_Y$4[1],
				0
			]
		});
	} else for (const [e, sz] of ENDS$4) {
		bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				LOAD$3,
				sz * MID$3
			]
		});
		bones.push({
			name: `palletUp${s}${e}`,
			parent: "base",
			at: [
				sx * ROW_X$2,
				LOAD$3,
				sz * -399.38
			]
		});
		bones.push({
			name: `pallet${s}${e}`,
			parent: `palletUp${s}${e}`,
			at: [
				sx * ROW_X$2,
				-399.84,
				sz * PALLET_Z$2
			]
		});
		bones.push({
			name: `rack${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN$4,
				sz * 1.9
			]
		});
	}
	/** @type {Piece[]} */
//#piece 95f197484f7ea4c20f90f40fd5e70297e0d8e4fdb4edc5d04eba4346fcb8bcf8
	chassis$4(add);
	(kind === "people" ? people$4 : goods$4)(add);
	if (kind === "goods") for (const [s, sx] of SIDES$3) for (const [e, sz] of ENDS$4) forkliftParts(add, bones, {
		name: `fk${s}${e}`,
		parent: "base",
		heel: [
			sx * FK_REST,
			LOAD$3,
			sz * PALLET_Z$2
		],
		yaw: -sx * Math.PI / 2
	});
//#piece 519050f82c9fad128a2e93e3030c2871e7f9d34144708f2f56800b3eb168a221
	const m = (s) => at$4(kind, s);
//#piece 343698e9a640f027151586b1353c7f166ebad0d7b62e4dee69b0f915881e351f
			const there = ramp$4(u, 0, .18), back = ramp$4(u, h, .6799999999999999);
//#piece a17da48bc27924c6d503ac8694b0a34523594c1ed0e4ef8c731ac7e614873a8e
			const open = (a) => ramp$4(u, a, a + .06) - ramp$4(u, a + .2, a + .26);
//#piece 4b03e5152783550252f6daffc97d6772911bc8fda321b42c5ddab196064b9d93
			const k = ramp$4(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k,
				racks: k
			});
		},
		close: (t) => {
			const k = 1 - ramp$4(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k,
				racks: k
			});
		},
		idle: () => m({})
	};
	if (kind === "goods") {
		clips.load = (t) => {
			const u = loop(t, 12);
			const lift = FK_LIFT * (ramp$4(u, .22, .28) - ramp$4(u, .55, .61));
			const x = FK_OFF - .8500000000000001 * ramp$4(u, .06, .2) - OUT$2 * ramp$4(u, .28, .55) + 2.58 * ramp$4(u, .61, .78);
			return m({
				doors: ramp$4(u, 0, .1) - ramp$4(u, .74, .86),
				out: 1 - ramp$4(u, .28, .55),
				up: lift / FK_LIFT,
				fk: {
					x,
					lift
				}
			});
		};
		clips.unload = (t) => {
			const u = loop(t, 12);
			const lift = FK_LIFT * (ramp$4(u, .3, .38) - ramp$4(u, .62, .68));
			const x = FK_WAIT - 2.58 * ramp$4(u, .1, .3) + OUT$2 * ramp$4(u, .38, .62) + .8500000000000001 * ramp$4(u, .68, .8);
			return m({
				doors: ramp$4(u, 0, .1) - ramp$4(u, .74, .86),
				out: ramp$4(u, .38, .62),
				up: lift / FK_LIFT,
				fk: {
					x,
					lift
				}
//#piece 059990e813778ad4f1698e989d7c30fbe9a5a515fefdf48155cad3e213ed0535
				return v < 0 || v > 2.5 ? 0 : ramp$4(v, 0, .5) - ramp$4(v, 2, 2.5);
//#piece f427aa5bc8fd44d0c84fa48c319b71da1faff8b21aee09cbc0272a863dfec0a7
				out: 1,
				fk: {
					x: FK_OFF,
					lift: 0
				}
			})
		},
		first: "shuttle"
	};
}

//#endregion
//#region src/lib/actors/pod.v1.js
//#piece 5045db7c7bbfc980708ee4efa95c412a2245a92c12dc0ab14de623eaf62848d0
const BODY$3 = "#f1f0eb";
const BAND$3 = "#2f6f68";
const DARK$3 = "#2a2c2e";
const TYRE = "#1c1d1f";
const HUB$3 = "#b7bbbd";
const GLASS$3 = "#a9c3cd";
const SEAT$3 = "#3f5f7a";
const FLOOR$3 = "#5b5e60";
const BAY$3 = "#3a3c3e";
const CRATE$3 = "#b98d55";
const CAGE$1 = "#8e959a";
const WHITE$3 = "#fff4d6";
const RED$3 = "#e0302a";
const HL$3 = 2;
const HW$3 = 1.22;
/** the wheels: radius, width, the centres' x and z */
const R$3 = .32;
const TW = .24;
const WX = 1;
const WZ = 1.5;
/** the people mover's bay (y from–to, half its width) and its cabin floor; the doors' half opening */
const BAY_Y$3 = [.14, .56];
const BAY_X = .75;
const CABIN$3 = .62;
const DOOR = .6;
/** the goods pod's load floor, and the barn doors' hinges */
const LOAD$2 = .42;
const HINGE_X = 1.16;
/** the corners: name, x sign, z sign (N is +z) */
const CORNERS = [
	[
		"NL",
		1,
		1
	],
	[
		"NR",
		-1,
		1
	],
	[
		"SL",
		1,
		-1
	],
	[
		"SR",
		-1,
		-1
	]
];
const ENDS$3 = [["N", 1], ["S", -1]];
/** the wheels, steered and rolling, the lidar and the lamps */
/** @param {Kind} kind @param {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} add */
function chassis$3(kind, add) {
	for (const [c, sx, sz] of CORNERS) {
		const at = [
			sx * WX,
			R$3,
			sz * WZ
		];
		add(wheel(R$3, TW, at, 28), TYRE, `wheel${c}`);
		add(wheel(R$3 * .62, .25, at, 20), HUB$3, `wheel${c}`);
		for (let k = 0; k < 5; k++) {
			const a = k * 2 * Math.PI / 5;
			add(beam([
				sx * (1.12 + .006),
				R$3,
				sz * WZ
			], [
				sx * (1.12 + .006),
				R$3 + Math.cos(a) * R$3 * .58,
				sz * WZ + Math.sin(a) * R$3 * .58
			], .012, .05, .004), DARK$3, `wheel${c}`);
		}
		add(wheel(.05, .08, [
			sx * (WX - TW / 2 - .04),
			R$3,
			sz * WZ
		]), DARK$3, `steer${c}`);
		add(new three.CylinderGeometry(.07, .08, .07, 20).translate(sx * 1.08, 2.5250000000000004, sz * 1.8599999999999999), DARK$3, "base");
		add(new three.CylinderGeometry(.06, .06, .03, 20).translate(sx * 1.08, 2.575, sz * 1.8599999999999999), "#4b4f53", "base");
	}
	for (const [e, sz] of ENDS$3) {
		for (const sx of [-1, 1]) if (kind === "people") {
			add(block(.26, .07, .014, [
				sx * .86,
				.98,
				sz * 1.998
			], .006), WHITE$3, `light${e}`);
			add(block(.16, .07, .014, [
				sx * .55,
				.98,
				sz * 1.998
			], .006), RED$3, `tail${e}`);
		} else {
			add(block(.05, .24, .014, [
				sx * 1.18,
				1.2,
				sz * 1.998
			], .006), WHITE$3, `light${e}`);
			add(block(.05, .16, .014, [
				sx * 1.18,
				.9,
				sz * 1.998
			], .006), RED$3, `tail${e}`);
		}
		add(block(2.3, .12, .06, [
			0,
			.13,
			sz * 1.97
		], .03), DARK$3, "base");
	}
}
/** the people mover: a glazed cabin over the bay */
/** @param {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} add */
function people$3(add) {
	add(block(1.56, .04, 3.98, [
		0,
		BAY_Y$3[0] - .02,
		0
	], .01), BAY$3, "base");
	for (const sx of [-1, 1]) {
		add(block(.04, BAY_Y$3[1] - BAY_Y$3[0], 3.98, [
			sx * .77,
			(BAY_Y$3[0] + BAY_Y$3[1]) / 2,
			0
		], .01), BAY$3, "base");
		add(block(.03, .02, 3.9, [
			sx * .45,
			BAY_Y$3[0] + .01,
			0
		], .005), HUB$3, "base");
		add(block(.04, BAY_Y$3[1] - .14, 2 * (1.18 - .08), [
			sx * 1.2,
			(BAY_Y$3[1] + .14) / 2,
			0
		], .015), BODY$3, "base");
		add(block(.41, .1, 2 * (1.18 - .1), [
			sx * .985,
			.2,
			0
		], .01), DARK$3, "base");
	}
	add(block(1.1, .4, .75, [
		.05,
		BAY_Y$3[0] + .2,
		-1.4
	], .02), CRATE$3, "base");
	add(block(.7, .3, .55, [
		-.2,
		BAY_Y$3[0] + .15,
		-.6
	], .02), CRATE$3, "base");
	for (const [e, sz] of ENDS$3) {
		for (const sx of [-1, 1]) add(block(.47 - .02, BAY_Y$3[1] - .14, .04, [
			sx * .995,
			(BAY_Y$3[1] + .14) / 2,
			sz * 1.98
		], .015), BODY$3, "base");
		add(block(BAY_X * 2 - .02, BAY_Y$3[1] - BAY_Y$3[0] - .02, .035, [
			0,
			(BAY_Y$3[0] + BAY_Y$3[1]) / 2,
			sz * 1.955
		], .012), BODY$3, `hatch${e}`);
		add(block(.3, .035, .03, [
			0,
			BAY_Y$3[0] + .06,
			sz * 1.984
		], .012), DARK$3, `hatch${e}`);
	}
	add(block(HW$3 * 2 - .04, .06, 3.96, [
		0,
		.59,
		0
	], .01), FLOOR$3, "base");
	add(block(HW$3 * 2, .12, 4, [
		0,
		2.43,
		0
	], .06), BODY$3, "base");
	const top = 2.31;
	for (const sx of [-1, 1]) {
		for (const sz of [-1, 1]) {
			const z0 = sz * DOOR, z1 = sz * HL$3;
			add(block(.05, .5800000000000001, Math.abs(z1 - z0), [
				sx * 1.195,
				1.6600000000000001 / 2,
				(z0 + z1) / 2
			], .02), BODY$3, "base");
			add(block(.052, .07, Math.abs(z1 - z0), [
				sx * 1.195,
				1,
				(z0 + z1) / 2
			], .005), BAND$3, "base");
			add(block(.02, 1.19, Math.abs(z1 - z0) - .1, [
				sx * 1.19,
				3.43 / 2,
				(z0 + z1) / 2
			]), GLASS$3, "base", 1);
			add(block(.07, 1.79, .08, [
				sx * 1.185,
				2.93 / 2,
				z0 + sz * .04
			], .02), BODY$3, "base");
			add(block(.1, 1.79, .1, [
				sx * 1.17,
				2.93 / 2,
				sz * 1.95
			], .04), BODY$3, "base");
		}
		add(block(.06, .06000000000000005, 4, [
			sx * 1.19,
			4.680000000000001 / 2,
			0
		], .01), BODY$3, "base");
		for (const [f, sz] of [["f", 1], ["b", -1]]) {
			const bone = `door${sx > 0 ? "L" : "R"}${f}`, mid = sz * DOOR * .5;
			add(block(.04, 1.69, .06, [
				sx * 1.2,
				2.93 / 2,
				sz * .03
			], .015), BODY$3, bone);
			add(block(.04, 1.69, .06, [
				sx * 1.2,
				2.93 / 2,
				sz * .57
			], .015), BODY$3, bone);
			add(block(.04, .5000000000000001, DOOR, [
				sx * 1.2,
				1.7400000000000002 / 2,
				mid
			], .015), BODY$3, bone);
			add(block(.042, .07, DOOR, [
				sx * 1.2,
				1,
				mid
			], .005), BAND$3, bone);
			add(block(.04, .05, DOOR, [
				sx * 1.2,
				2.285,
				mid
			], .015), BODY$3, bone);
			add(block(.015, 1.14, .5, [
				sx * 1.2,
				(3.43 - .05) / 2,
				mid
			]), GLASS$3, bone, 1);
		}
		for (const sz of [-1, 1]) add(limb([
			sx * 1.02,
			CABIN$3,
			sz * .72
		], [
			sx * 1.02,
			top,
			sz * .72
		], .018, .018), HUB$3, "base");
	}
	for (const [, sz] of ENDS$3) {
		add(block(HW$3 * 2 - .12, .5800000000000001, .05, [
			0,
			1.6600000000000001 / 2,
			sz * 1.975
		], .02), BODY$3, "base");
		add(block(HW$3 * 2 - .12, .07, .052, [
			0,
			1,
			sz * 1.975
		], .005), BAND$3, "base");
		add(block(HW$3 * 2 - .2, 1.19, .02, [
			0,
			3.43 / 2,
			sz * 1.97
		]), GLASS$3, "base", 1);
		add(block(1.2, .08, .03, [
			0,
			2.25,
			sz * 1.99
		], .01), DARK$3, "base");
		for (let i = 0; i < 4; i++) {
			const x = -.84 + i * .56;
			add(block(.5, .1, .46, [
				x,
				1.04,
				sz * 1.62
			], .04), SEAT$3, "base");
			add(block(.5, .55, .09, [
				x,
				1.37,
				sz * 1.87
			], .04), SEAT$3, "base");
			add(block(.14, .18, .06, [
				x,
				1.7400000000000002,
				sz * 1.88
			], .03), SEAT$3, "base");
		}
		add(block(2.2, .38, .5, [
			0,
			.81,
			sz * 1.6400000000000001
		], .02), DARK$3, "base");
	}
	add(block(.5, .05, 1.2, [
		0,
		2.27,
		0
	], .02), "#fbf7ea", "base");
}
/** the goods pod: one full-height hold from a low floor, barn doors over both ends */
/** @param {(geo: THREE.BufferGeometry, color: string, bone: string, mat?: number) => void} add */
function goods$3(add) {
	add(block(HW$3 * 2 - .04, .08, 3.98, [
		0,
		.38,
		0
	], .01), FLOOR$3, "base");
	add(block(HW$3 * 2 - .2, .24, 2.96, [
		0,
		.52 / 2,
		0
	], .02), DARK$3, "base");
	add(block(HW$3 * 2, .12, 4, [
		0,
		2.43,
		0
	], .06), BODY$3, "base");
	for (const sx of [-1, 1]) {
		add(block(.05, 2.37 - .72, 4, [
			sx * 1.195,
			3.09 / 2,
			0
		], .02), BODY$3, "base");
		add(block(.05, .58, 2 * (1.18 - .08), [
			sx * 1.195,
			.86 / 2,
			0
		], .02), BODY$3, "base");
		add(block(.052, .07, 3.9, [
			sx * 1.195,
			1,
			0
		], .005), BAND$3, "base");
		add(block(.02, .12, 3.5, [
			sx * 1.21,
			2.1700000000000004,
			0
		], .01), GLASS$3, "base", 1);
		for (const sz of [-1, 1]) add(block(.3, .32, .8, [
			sx * 1.02,
			.58,
			sz * WZ
		], .04), DARK$3, "base");
		add(block(.03, .05, 3.7, [
			sx * 1.15,
			1.35,
			0
		], .01), HUB$3, "base");
	}
	for (const [e, sz] of ENDS$3) {
		for (const sx of [-1, 1]) add(block(.08, 2.35, .1, [
			sx * 1.18,
			2.49 / 2 + .02,
			sz * 1.95
		], .03), BODY$3, "base");
		add(block(HW$3 * 2, .12, .1, [
			0,
			2.31,
			sz * 1.95
		], .03), BODY$3, "base");
		add(block(HW$3 * 2, .24, .1, [
			0,
			.6 / 2,
			sz * 1.95
		], .02), BODY$3, "base");
		for (const hx of [-1, 1]) {
			const bone = `leaf${e}${hx > 0 ? "L" : "R"}`, w = HINGE_X, cx = hx * (HINGE_X - w / 2);
			add(block(1.14, 1.83, .04, [
				cx,
				2.67 / 2,
				sz * 1.93
			], .015), BODY$3, bone);
			for (const k of [
				.25,
				.5,
				.75
			]) add(block(.04, 1.73, .02, [
				hx * (HINGE_X - w * k),
				2.67 / 2,
				sz * 1.956
			], .008), "#e2e1db", bone);
			add(block(1.14, .07, .042, [
				cx,
				1,
				sz * 1.93
			], .005), BAND$3, bone);
			add(limb([
				hx * .14,
				.47,
				sz * 1.97
			], [
				hx * .14,
				2.2,
				sz * 1.97
			], .015, .015), HUB$3, bone);
		}
	}
	for (const x of [-.45, .45]) {
		const z = -1.35, y = .52;
		add(block(.8, .04, .68, [
			x,
			y,
			z
		], .01), CAGE$1, "base");
//#piece 3052508183d1e62ffd0d910d8cf04b7cb4063a027907f424e7edf5acd205d695
			2.2199999999999998,
			z + cz
		], .012, .012), CAGE$1, "base");
		for (let k = 0; k < 4; k++) add(block(.72, .36, .6, [
			x,
			.74 + k * .4,
			z
		], .02), k % 2 ? CRATE$3 : "#a87f4c", "base");
	}
	for (let k = 0; k < 3; k++) add(block(.6, .4, .4, [
		.5,
		.62 + k * .42,
		1.2
	], .02), k % 2 ? "#a87f4c" : CRATE$3, "base");
}
/**
* The pod at a moment: where it is along z (driving), which way it leads, its doors (0 shut … 1 open), its hatches,
* its wheels steered.
* @param {Kind} kind
* @param {{ z?: number, lead?: -1 | 0 | 1, doors?: number, hatches?: number, steer?: number }} s
* @returns {Pose}
*/
function at$3(kind, { z = 0, lead = 0, doors = 0, hatches = 0, steer = 0 }) {
	/** @type {Pose} */
	const p = { root: [
		0,
		0,
		z
	] };
	for (const [c, , sz] of CORNERS) {
		p[`steer${c}`] = [
			0,
			sz * steer,
			0
		];
		p[`wheel${c}`] = [
			z / R$3,
			0,
			0
		];
	}
	for (const [e, sz] of ENDS$3) {
//#piece 8c09fa285d821b2b9815472e8d3974caa3e5c411888af74ff271548b91d60cb5
	}
	if (kind === "people") {
		const a = 1.45 * doors;
		for (const [side, sx] of [["L", 1], ["R", -1]]) {
			p[`door${side}f`] = [
				0,
				-sx * a,
				0
			];
			p[`door${side}b`] = [
				0,
				sx * a,
				0
			];
		}
		p.hatchN = [
			-1.45 * hatches,
			0,
			0
		];
		p.hatchS = [
			1.45 * hatches,
			0,
			0
		];
	} else {
		const a = 1.75 * doors;
		for (const [e, sz] of ENDS$3) {
			p[`leaf${e}L`] = [
				0,
				sz * a,
				0
			];
			p[`leaf${e}R`] = [
				0,
				-sz * a,
				0
			];
		}
	}
	return p;
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
const ramp$3 = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/** Build a pod and its moves. @param {Kind} kind @returns {Cast} */
function pod$3(kind) {
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: [
				0,
				.5,
				0
			]
		},
		...CORNERS.flatMap(([c, sx, sz]) => [{
			name: `steer${c}`,
			parent: "base",
			at: [
				sx * WX,
				R$3,
				sz * WZ
			]
		}, {
			name: `wheel${c}`,
			parent: `steer${c}`,
			at: [
				sx * WX,
				R$3,
				sz * WZ
			]
		}]),
		...ENDS$3.flatMap(([e, sz]) => [{
			name: `light${e}`,
			parent: "base",
			at: [
				0,
				.98,
				sz * HL$3
			]
		}, {
			name: `tail${e}`,
			parent: "base",
			at: [
				0,
				.98,
				sz * HL$3
			]
		}])
	];
	if (kind === "people") {
		for (const [side, sx] of [["L", 1], ["R", -1]]) {
			bones.push({
				name: `door${side}f`,
				parent: "base",
				at: [
					sx * 1.2,
					CABIN$3,
					DOOR
				]
			});
			bones.push({
				name: `door${side}b`,
				parent: "base",
				at: [
					sx * 1.2,
					CABIN$3,
					-.6
				]
			});
		}
		for (const [e, sz] of ENDS$3) bones.push({
			name: `hatch${e}`,
			parent: "base",
			at: [
				0,
				BAY_Y$3[1],
				sz * HL$3
			]
		});
	} else for (const [e, sz] of ENDS$3) for (const [s, hx] of [["L", 1], ["R", -1]]) bones.push({
		name: `leaf${e}${s}`,
		parent: "base",
		at: [
			hx * HINGE_X,
			LOAD$2,
			sz * 1.93
		]
	});
	/** @type {Piece[]} */
	const parts = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone @param {number} [mat] */
	const add = (geo, color, bone, mat) => parts.push({
		geo,
		color,
		bone,
		...mat ? { mat } : {}
	});
	chassis$3(kind, add);
	(kind === "people" ? people$3 : goods$3)(add);
//#piece 519050f82c9fad128a2e93e3030c2871e7f9d34144708f2f56800b3eb168a221
	const m = (s) => at$3(kind, s);
	const run = 3, period = kind === "people" ? 18 : 14;
	return {
		rig: r,
		clips: {
			shuttle: (t) => {
				const u = loop(t, period), h = .5;
				const there = ramp$3(u, 0, .18), back = ramp$3(u, h, .6799999999999999);
				const z = -3 / 2 + run * there - run * back;
				const lead = u < .18 ? 1 : u >= h && u < .6799999999999999 ? -1 : 0;
				const open = (a) => ramp$3(u, a, a + .06) - ramp$3(u, a + .2, a + .26);
//#piece 6e73fc021318b3f2b534f386d9cf2268e6100f9d5ab44728e0009e0047178bb7
					hatches: u < h ? 0 : k
				});
			},
			doors: (t) => {
				const u = loop(t, 6);
				const k = ramp$3(u, .05, .3) - ramp$3(u, .7, .95);
				return m({
					doors: k,
					hatches: kind === "people" ? k : 0
				});
			},
			steer: (t) => m({ steer: Math.sin(t * 2 * Math.PI / 5) * .45 }),
			idle: () => m({})
		},
		poses: kind === "people" ? {
			closed: m({}),
			"doors open": m({ doors: 1 }),
			"bay open": m({ hatches: 1 }),
			"all open": m({
				doors: 1,
				hatches: 1
			})
		} : {
			closed: m({}),
			"doors open": m({ doors: 1 })
		},
		first: "shuttle"
	};
}

//#endregion
//#region src/lib/actors/pod.v2.js
//#piece 0cd254f23a8de8b4ebc0abe2b80f75399361952bdbb16bffbb82479fe14bf265
const BODY$2 = "#f1f0eb";
const BAND$2 = "#2f6f68";
const DARK$2 = "#2a2c2e";
const STEEL$2 = "#9a9fa3";
const HUB$2 = "#b7bbbd";
const GLASS$2 = "#a9c3cd";
const SEAT$2 = "#3f5f7a";
const FLOOR$2 = "#5b5e60";
const BAY$2 = "#3a3c3e";
const CRATE$2 = "#b98d55";
const CRATE2$2 = "#a87f4c";
const CAGE = "#8e959a";
const WHITE$2 = "#fff4d6";
const RED$2 = "#e0302a";
const HL$2 = 2;
const HW$2 = 1.22;
/** the wheels: radius, the treads' x (half the gauge), the axles' z */
const R$2 = .2;
const GX$2 = 1.435 / 2;
const AZ$2 = 1.7;
//#piece de2df7bef5eaac6133e7b1251893e54f4c64be9205cab417c7ff9d35f4eb8b90
const MID$2 = 1.38;
const BAY_Y$2 = [.14, .52];
const CABIN$2 = .58;
const DOOR_Z$2 = .975;
const DOOR_W$2 = .8;
const SIDES$2 = [["L", 1], ["R", -1]];
const ENDS$2 = [["N", 1], ["S", -1]];
/** the running gear, the ends, the roof, the lidar and the lamps: what both variants share */
/** @param {Add} add */
function chassis$2(add) {
	for (const [e, sz] of ENDS$2) {
		const z = sz * AZ$2, axle = `axle${e}`;
		add(wheel(.045, GX$2 * 2 - .1, [
			0,
			R$2,
			z
		], 14), DARK$2, axle);
		for (const sx of [-1, 1]) {
			add(wheel(R$2, .1, [
				sx * GX$2,
				R$2,
				z
			], 28), STEEL$2, axle);
			add(wheel(.23, .022, [
				sx * .6575,
				R$2,
				z
			], 28), DARK$2, axle);
			add(wheel(R$2 * .55, .104, [
				sx * GX$2,
				R$2,
				z
			], 5), HUB$2, axle);
		}
		add(block(1.635, .08, .5, [
			0,
			.30000000000000004,
			z
		], .02), DARK$2, "base");
		add(block(.5, .22, .32, [
			0,
			.23,
			z - sz * .32
		], .03), DARK$2, "base");
		for (const sx of [-1, 1]) add(block(.04, .21999999999999997, .6000000000000001, [
			sx * 1.2,
			.94 / 2,
			sz * 3.38 / 2
		], .015), BODY$2, "base");
		add(block(HW$2 * 2, .21999999999999997, .04, [
			0,
			.94 / 2,
			sz * 1.98
		], .015), BODY$2, "base");
		add(block(2.3, .12, .06, [
			0,
			.36,
			sz * 1.97
		], .03), DARK$2, "base");
		for (const sx of [-1, 1]) {
			add(block(.26, .07, .014, [
				sx * .86,
				.9,
				sz * 1.998
			], .006), WHITE$2, `light${e}`);
			add(block(.16, .07, .014, [
				sx * .55,
				.9,
				sz * 1.998
			], .006), RED$2, `tail${e}`);
		}
	}
	add(block(HW$2 * 2, .12, 4, [
		0,
		2.43,
		0
	], .06), BODY$2, "base");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
		add(new three.CylinderGeometry(.07, .08, .07, 20).translate(sx * 1.08, 2.5250000000000004, sz * 1.8599999999999999), DARK$2, "base");
//#piece f9a6fd8a2639652bc8b7a1ef6a5096ebbffc999b97286d20b40d4dc24b7504dc
function bay$2(add) {
	add(block(HW$2 * 2 - .04, .04, MID$2 * 2, [
		0,
		BAY_Y$2[0] - .02,
		0
	], .01), BAY$2, "base");
	for (const sz of [-1, 1]) add(block(HW$2 * 2 - .04, BAY_Y$2[1] - BAY_Y$2[0], .04, [
		0,
		(BAY_Y$2[0] + BAY_Y$2[1]) / 2,
		sz * 1.3599999999999999
	], .01), BAY$2, "base");
	for (const x of [
		-.6,
		0,
		.6
	]) add(block(.03, .02, MID$2 * 2 - .1, [
		x,
		BAY_Y$2[0] + .01,
		0
	], .005), HUB$2, "base");
	for (const [s, sx] of SIDES$2) {
		const h = BAY_Y$2[1] - BAY_Y$2[0];
		add(block(.035, h - .01, MID$2 * 2 - .02, [
			sx * 1.202,
			(BAY_Y$2[0] + BAY_Y$2[1]) / 2,
			0
		], .012), BODY$2, `flap${s}`);
		add(block(.03, .035, .4, [
			sx * 1.224,
			BAY_Y$2[0] + .06,
			0
		], .012), DARK$2, `flap${s}`);
	}
	for (const [x, z, w, h, d, c] of [
		[
			.55,
			-.8,
			.9,
			.34,
			.7,
			CRATE$2
		],
		[
			-.5,
			-.9,
			.7,
			.3,
			.5,
			CRATE2$2
		],
		[
			.3,
			.6,
			.6,
			.34,
			.6,
			CRATE2$2
		],
		[
			-.6,
			.85,
			.8,
			.26,
			.5,
			CRATE$2
		]
	]) add(block(w, h, d, [
		x,
		BAY_Y$2[0] + h / 2,
//#piece cc218a3ccfc57f98f00d303a73035210d6143a6996adf045769b228edd4d5057
function people$2(add) {
	bay$2(add);
	add(block(HW$2 * 2 - .04, .06, 3.96, [
		0,
		.5499999999999999,
		0
	], .01), FLOOR$2, "base");
	const top = 2.31;
	for (const [s, sx] of SIDES$2) {
//#piece 7ab6fc380ec7eb8163eaf14b61b2595fa19235b22178a923dacf0d8e3a8a4e62
			[-2, -.975 - DOOR_W$2 / 2],
			[-.575, DOOR_Z$2 - DOOR_W$2 / 2],
			[1.375, HL$2]
//#piece 7ab43014a5cfebc4a0b645fe1380446b92eac7685330c32e784d71616f06a950
			], .02), BODY$2, "base");
			add(block(.052, .07, len, [
				x,
				.9500000000000001,
				mid
			], .005), BAND$2, "base");
			add(block(.02, 1.26, len - .1, [
				sx * 1.19,
				3.3600000000000003 / 2,
				mid
			]), GLASS$2, "base", 1);
			for (const z of [z0, z1]) add(block(.07, 1.83, .08, [
				sx * 1.185,
				2.89 / 2,
				z + (z === z0 ? .04 : -.04)
			], .02), BODY$2, "base");
		}
		add(block(.06, .06000000000000005, 4, [
			sx * 1.19,
			4.680000000000001 / 2,
			0
		], .01), BODY$2, "base");
		for (const [e, sz] of ENDS$2) {
			const bone = `door${s}${e}`, mid = sz * DOOR_Z$2;
			for (const dz of [-1, 1]) add(block(.04, 1.73, .06, [
				sx * 1.2,
				2.89 / 2,
				mid + dz * (DOOR_W$2 / 2 - .03)
			], .015), BODY$2, bone);
			add(block(.04, .4700000000000001, DOOR_W$2, [
				sx * 1.2,
				1.63 / 2,
				mid
			], .015), BODY$2, bone);
			add(block(.042, .07, DOOR_W$2, [
				sx * 1.2,
				.9500000000000001,
				mid
			], .005), BAND$2, bone);
			add(block(.04, .05, DOOR_W$2, [
				sx * 1.2,
				2.285,
				mid
			], .015), BODY$2, bone);
			add(block(.015, 1.21, .7000000000000001, [
				sx * 1.2,
				3.3100000000000005 / 2,
				mid
			]), GLASS$2, bone, 1);
//#piece c38f87904d5ba8881b18614fb0c85d9ad50410a59599204ae97b0a52f0675667
			], .014, .014), HUB$2, bone);
		}
	}
	for (const [, sz] of ENDS$2) {
		add(block(HW$2 * 2 - .12, .5100000000000001, .05, [
			0,
			(1.63 - .04) / 2,
			sz * 1.975
		], .02), BODY$2, "base");
		add(block(HW$2 * 2 - .12, .07, .052, [
			0,
			.9500000000000001,
			sz * 1.975
		], .005), BAND$2, "base");
		add(block(HW$2 * 2 - .2, 1.26, .02, [
			0,
			3.3600000000000003 / 2,
			sz * 1.97
		]), GLASS$2, "base", 1);
		add(block(1.2, .08, .03, [
			0,
			2.25,
			sz * 1.99
		], .01), DARK$2, "base");
		add(block(.1, 1.83, .1, [
			1.17,
			2.89 / 2,
			sz * 1.95
		], .04), BODY$2, "base");
		add(block(.1, 1.83, .1, [
			-1.17,
			2.89 / 2,
			sz * 1.95
		], .04), BODY$2, "base");
//#piece 4cd38b9a646eb30d185dd4af95a7eaaed7a143ab82bc4bdc16bca11b7e10e5d7
				], .04), SEAT$2, "base");
				add(block(.42, .62, .08, [
					x,
					1.3599999999999999,
					bz + f * .03
				], .04), SEAT$2, "base");
			}
			add(block(2.28, .37, .4, [
				0,
				.7649999999999999,
				bz + f * .26
			], .02), DARK$2, "base");
		}
		add(limb([
			0,
			.98,
			sz * DOOR_Z$2
		], [
			0,
			top,
			sz * DOOR_Z$2
		], .018, .018), HUB$2, "base");
	}
	add(block(HW$2 * 2 - .1, .4, .04, [
		0,
		1.7799999999999998,
		0
	], .02), SEAT$2, "base");
	for (const [, sz] of ENDS$2) add(block(.5, .05, 1, [
		0,
		2.27,
		sz * DOOR_Z$2
	], .02), "#fbf7ea", "base");
}
/** the goods pod: a low hold between the axles, a shelf over each, its sides lifting as wings */
/** @param {Add} add */
function goods$2(add) {
	add(block(HW$2 * 2 - .04, .06, MID$2 * 2, [
		0,
		.13,
		0
	], .01), FLOOR$2, "base");
	for (const sz of [-1, 1]) {
		add(block(HW$2 * 2 - .04, .06, .6200000000000001, [
			0,
			.5499999999999999,
			sz * 3.38 / 2
		], .01), FLOOR$2, "base");
		add(block(HW$2 * 2 - .04, .41999999999999993, .04, [
			0,
			.74 / 2,
			sz * MID$2
		], .01), BAY$2, "base");
		add(block(HW$2 * 2, 1.79, .05, [
			0,
			2.95 / 2,
			sz * 1.975
		], .02), BODY$2, "base");
		add(block(HW$2 * 2, .07, .052, [
			0,
			1,
			sz * 1.975
		], .005), BAND$2, "base");
		for (const sx of [-1, 1]) add(block(.1, 2.0100000000000002, .1, [
			sx * 1.17,
			2.7300000000000004 / 2,
			sz * 1.95
		], .04), BODY$2, "base");
	}
	for (const [s, sx] of SIDES$2) {
		const bone = `wing${s}`, x = sx * 1.195;
		add(block(.04, 1.79, 3.8, [
			x,
			2.95 / 2,
			0
		], .015), BODY$2, bone);
		add(block(.04, .43999999999999995, MID$2 * 2 - .02, [
			x,
			.74 / 2,
			0
		], .015), BODY$2, bone);
		for (const z of [
			-1.4,
			-.7,
			0,
			.7,
			1.4
		]) add(block(.02, 2.13, .04, [
			sx * 1.218,
			1.245,
			z
		], .008), "#e2e1db", bone);
		add(block(.044, .07, 3.8, [
			x,
			1,
			0
		], .005), BAND$2, bone);
		add(block(.02, .1, 3.4, [
			sx * 1.212,
			2.1700000000000004,
			0
		], .01), GLASS$2, bone, 1);
	}
	for (const x of [-.55, .55]) for (const z of [
		-.85,
		0,
		.85
	]) {
		const y = .24;
		add(block(.8, .04, .68, [
			x,
			y,
			z
		], .01), CAGE, "base");
//#piece 3052508183d1e62ffd0d910d8cf04b7cb4063a027907f424e7edf5acd205d695
			1.94,
			z + cz
		], .012, .012), CAGE, "base");
		for (let k = 0; k < 4; k++) add(block(.72, .36, .6, [
			x,
			.45999999999999996 + k * .4,
			z
		], .02), (k + (z > 0 ? 1 : 0)) % 2 ? CRATE$2 : CRATE2$2, "base");
	}
	for (const sz of [-1, 1]) for (const x of [-.6, .6]) add(block(.9, .4, .5, [
		x,
		.78,
		sz * 1.67
	], .02), x > 0 ? CRATE$2 : CRATE2$2, "base");
}
/**
* The pod at a moment: where it is along z (driving), which way it leads, its doors or wings (0 shut … 1 open), its
* bay's flaps.
* @param {Kind} kind
* @param {{ z?: number, lead?: -1 | 0 | 1, doors?: number, flaps?: number }} s
* @returns {Pose}
*/
function at$2(kind, { z = 0, lead = 0, doors = 0, flaps = 0 }) {
	/** @type {Pose} */
	const p = { root: [
		0,
		0,
		z
	] };
	for (const [e, sz] of ENDS$2) {
		p[`axle${e}`] = [
			z / R$2,
			0,
			0
		];
//#piece 8c09fa285d821b2b9815472e8d3974caa3e5c411888af74ff271548b91d60cb5
	}
	for (const [s, sx] of SIDES$2) if (kind === "people") {
		for (const [e, sz] of ENDS$2) p[`door${s}${e}`] = [
//#piece 3bc495e932d47f54ae69bf3bd68636d077fbbb18b69bd3cd5250bbb1589f70fe
	} else p[`wing${s}`] = [
		0,
		0,
		sx * 1.3 * doors
	];
	return p;
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
const ramp$2 = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/** Build a pod and its moves. @param {Kind} kind @returns {Cast} */
function pod$2(kind) {
//#piece 52a108852e60be1bbd44aa056d699e283ddb3240072c18e07352460d8221ea85
	}, ...ENDS$2.flatMap(([e, sz]) => [
		{
			name: `axle${e}`,
			parent: "base",
			at: [
				0,
				R$2,
				sz * AZ$2
			]
		},
		{
			name: `light${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$2
			]
		},
		{
			name: `tail${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$2
			]
		}
	])];
	for (const [s, sx] of SIDES$2) if (kind === "people") {
		for (const [e, sz] of ENDS$2) bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN$2,
				sz * 1.375
			]
		});
		bones.push({
			name: `flap${s}`,
			parent: "base",
			at: [
				sx * HW$2,
				BAY_Y$2[1],
				0
			]
		});
	} else bones.push({
		name: `wing${s}`,
		parent: "base",
		at: [
			sx * HW$2,
			2.37,
			0
		]
	});
	/** @type {Piece[]} */
//#piece 95f197484f7ea4c20f90f40fd5e70297e0d8e4fdb4edc5d04eba4346fcb8bcf8
	chassis$2(add);
	(kind === "people" ? people$2 : goods$2)(add);
//#piece 519050f82c9fad128a2e93e3030c2871e7f9d34144708f2f56800b3eb168a221
	const m = (s) => at$2(kind, s);
	const run = 3, period = kind === "people" ? 18 : 14;
	return {
		rig: r,
		clips: {
			shuttle: (t) => {
				const u = loop(t, period), h = .5;
				const there = ramp$2(u, 0, .18), back = ramp$2(u, h, .6799999999999999);
				const z = -3 / 2 + run * there - run * back;
				const lead = u < .18 ? 1 : u >= h && u < .6799999999999999 ? -1 : 0;
				const open = (a) => ramp$2(u, a, a + .06) - ramp$2(u, a + .2, a + .26);
//#piece 6e73fc021318b3f2b534f386d9cf2268e6100f9d5ab44728e0009e0047178bb7
					flaps: u < h ? 0 : k
				});
			},
			doors: (t) => {
				const u = loop(t, 6);
				const k = ramp$2(u, .05, .3) - ramp$2(u, .7, .95);
				return m({
					doors: k,
					flaps: k
				});
			},
			idle: () => m({})
		},
//#piece d73d60b11cd84569b062ffb8fbacc835f31f5202721d9598d7c8343ba871c0a3
			closed: m({}),
			"wings open": m({ doors: 1 })
		},
		first: "shuttle"
	};
}

//#endregion
//#region src/lib/actors/pod.v3.js
//#piece 0cd254f23a8de8b4ebc0abe2b80f75399361952bdbb16bffbb82479fe14bf265
const BODY$1 = "#f1f0eb";
const BAND$1 = "#2f6f68";
const DARK$1 = "#2a2c2e";
const STEEL$1 = "#9a9fa3";
const HUB$1 = "#b7bbbd";
const GLASS$1 = "#a9c3cd";
const SEAT$1 = "#3f5f7a";
const FLOOR$1 = "#5b5e60";
const BAY$1 = "#3a3c3e";
const CRATE$1 = "#b98d55";
const CRATE2$1 = "#a87f4c";
const WHITE$1 = "#fff4d6";
const RED$1 = "#e0302a";
const HL$1 = 2;
const HW$1 = 1.22;
/** the wheels: radius, the treads' x (half the gauge), the axles' z */
const R$1 = .2;
const GX$1 = 1.435 / 2;
const AZ$1 = 1.7;
//#piece de2df7bef5eaac6133e7b1251893e54f4c64be9205cab417c7ff9d35f4eb8b90
const MID$1 = 1.38;
const BAY_Y$1 = [.14, .52];
const CABIN$1 = .58;
/** the people mover's doors: their middle (z) and width; the goods pod's floor */
const DOOR_Z$1 = .975;
const DOOR_W$1 = .8;
const LOAD$1 = .16;
const PL$1 = 1.2;
const PW$1 = .8;
const PH$1 = .144;
const ROW_X$1 = .6;
const PALLET_Z$1 = .62;
const OUT$1 = 2.2;
const PIVOT$1 = 400;
const WOOD$1 = "#c9a878";
const WOOD2$1 = "#b8955f";
const WRAP$1 = "#dfe3e2";
const SIDES$1 = [["L", 1], ["R", -1]];
const ENDS$1 = [["N", 1], ["S", -1]];
/** the running gear, the ends, the roof, the lidar and the lamps: what both variants share */
/** @param {Add} add */
function chassis$1(add) {
	for (const [e, sz] of ENDS$1) {
		const z = sz * AZ$1, axle = `axle${e}`;
		add(wheel(.045, GX$1 * 2 - .1, [
			0,
			R$1,
			z
		], 14), DARK$1, axle);
		for (const sx of [-1, 1]) {
			add(wheel(R$1, .1, [
				sx * GX$1,
				R$1,
				z
			], 28), STEEL$1, axle);
			add(wheel(.23, .022, [
				sx * .6575,
				R$1,
				z
			], 28), DARK$1, axle);
			add(wheel(R$1 * .55, .104, [
				sx * GX$1,
				R$1,
				z
			], 5), HUB$1, axle);
		}
		add(block(1.635, .08, .5, [
			0,
			.30000000000000004,
			z
		], .02), DARK$1, "base");
		add(block(.5, .22, .32, [
			0,
			.23,
			z - sz * .32
		], .03), DARK$1, "base");
		for (const sx of [-1, 1]) add(block(.04, .21999999999999997, .6000000000000001, [
			sx * 1.2,
			.94 / 2,
			sz * 3.38 / 2
		], .015), BODY$1, "base");
		add(block(HW$1 * 2, .21999999999999997, .04, [
			0,
			.94 / 2,
			sz * 1.98
		], .015), BODY$1, "base");
		add(block(2.3, .12, .06, [
			0,
			.36,
			sz * 1.97
		], .03), DARK$1, "base");
		for (const sx of [-1, 1]) {
			add(block(.26, .07, .014, [
				sx * .86,
				.9,
				sz * 1.998
			], .006), WHITE$1, `light${e}`);
			add(block(.16, .07, .014, [
				sx * .55,
				.9,
				sz * 1.998
			], .006), RED$1, `tail${e}`);
		}
	}
	add(block(HW$1 * 2, .12, 4, [
		0,
		2.43,
		0
	], .06), BODY$1, "base");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
		add(new three.CylinderGeometry(.07, .08, .07, 20).translate(sx * 1.08, 2.5250000000000004, sz * 1.8599999999999999), DARK$1, "base");
//#piece f9a6fd8a2639652bc8b7a1ef6a5096ebbffc999b97286d20b40d4dc24b7504dc
function bay$1(add) {
	add(block(HW$1 * 2 - .04, .04, MID$1 * 2, [
		0,
		BAY_Y$1[0] - .02,
		0
	], .01), BAY$1, "base");
	for (const sz of [-1, 1]) add(block(HW$1 * 2 - .04, BAY_Y$1[1] - BAY_Y$1[0], .04, [
		0,
		(BAY_Y$1[0] + BAY_Y$1[1]) / 2,
		sz * 1.3599999999999999
	], .01), BAY$1, "base");
	for (const x of [
		-.6,
		0,
		.6
	]) add(block(.03, .02, MID$1 * 2 - .1, [
		x,
		BAY_Y$1[0] + .01,
		0
	], .005), HUB$1, "base");
	for (const [s, sx] of SIDES$1) {
		const h = BAY_Y$1[1] - BAY_Y$1[0];
		add(block(.035, h - .01, MID$1 * 2 - .02, [
			sx * 1.202,
			(BAY_Y$1[0] + BAY_Y$1[1]) / 2,
			0
		], .012), BODY$1, `flap${s}`);
		add(block(.03, .035, .4, [
			sx * 1.224,
			BAY_Y$1[0] + .06,
			0
		], .012), DARK$1, `flap${s}`);
	}
	for (const [x, z, w, h, d, c] of [
		[
			.55,
			-.8,
			.9,
			.34,
			.7,
			CRATE$1
		],
		[
			-.5,
			-.9,
			.7,
			.3,
			.5,
			CRATE2$1
		],
		[
			.3,
			.6,
			.6,
			.34,
			.6,
			CRATE2$1
		],
		[
			-.6,
			.85,
			.8,
			.26,
			.5,
			CRATE$1
		]
	]) add(block(w, h, d, [
		x,
		BAY_Y$1[0] + h / 2,
//#piece cc218a3ccfc57f98f00d303a73035210d6143a6996adf045769b228edd4d5057
function people$1(add) {
	bay$1(add);
	add(block(HW$1 * 2 - .04, .06, 3.96, [
		0,
		.5499999999999999,
		0
	], .01), FLOOR$1, "base");
	const top = 2.31;
	for (const [s, sx] of SIDES$1) {
//#piece 7ab6fc380ec7eb8163eaf14b61b2595fa19235b22178a923dacf0d8e3a8a4e62
			[-2, -.975 - DOOR_W$1 / 2],
			[-.575, DOOR_Z$1 - DOOR_W$1 / 2],
			[1.375, HL$1]
//#piece 7ab43014a5cfebc4a0b645fe1380446b92eac7685330c32e784d71616f06a950
			], .02), BODY$1, "base");
			add(block(.052, .07, len, [
				x,
				.9500000000000001,
				mid
			], .005), BAND$1, "base");
			add(block(.02, 1.26, len - .1, [
				sx * 1.19,
				3.3600000000000003 / 2,
				mid
			]), GLASS$1, "base", 1);
			for (const z of [z0, z1]) add(block(.07, 1.83, .08, [
				sx * 1.185,
				2.89 / 2,
				z + (z === z0 ? .04 : -.04)
			], .02), BODY$1, "base");
		}
		add(block(.06, .06000000000000005, 4, [
			sx * 1.19,
			4.680000000000001 / 2,
			0
		], .01), BODY$1, "base");
		for (const [e, sz] of ENDS$1) {
			const bone = `door${s}${e}`, mid = sz * DOOR_Z$1;
			for (const dz of [-1, 1]) add(block(.04, 1.73, .06, [
				sx * 1.2,
				2.89 / 2,
				mid + dz * (DOOR_W$1 / 2 - .03)
			], .015), BODY$1, bone);
			add(block(.04, .4700000000000001, DOOR_W$1, [
				sx * 1.2,
				1.63 / 2,
				mid
			], .015), BODY$1, bone);
			add(block(.042, .07, DOOR_W$1, [
				sx * 1.2,
				.9500000000000001,
				mid
			], .005), BAND$1, bone);
			add(block(.04, .05, DOOR_W$1, [
				sx * 1.2,
				2.285,
				mid
			], .015), BODY$1, bone);
			add(block(.015, 1.21, .7000000000000001, [
				sx * 1.2,
				3.3100000000000005 / 2,
				mid
			]), GLASS$1, bone, 1);
//#piece c38f87904d5ba8881b18614fb0c85d9ad50410a59599204ae97b0a52f0675667
			], .014, .014), HUB$1, bone);
		}
	}
	for (const [, sz] of ENDS$1) {
		add(block(HW$1 * 2 - .12, .5100000000000001, .05, [
			0,
			(1.63 - .04) / 2,
			sz * 1.975
		], .02), BODY$1, "base");
		add(block(HW$1 * 2 - .12, .07, .052, [
			0,
			.9500000000000001,
			sz * 1.975
		], .005), BAND$1, "base");
		add(block(HW$1 * 2 - .2, 1.26, .02, [
			0,
			3.3600000000000003 / 2,
			sz * 1.97
		]), GLASS$1, "base", 1);
		add(block(1.2, .08, .03, [
			0,
			2.25,
			sz * 1.99
		], .01), DARK$1, "base");
		add(block(.1, 1.83, .1, [
			1.17,
			2.89 / 2,
			sz * 1.95
		], .04), BODY$1, "base");
		add(block(.1, 1.83, .1, [
			-1.17,
			2.89 / 2,
			sz * 1.95
		], .04), BODY$1, "base");
//#piece 4cd38b9a646eb30d185dd4af95a7eaaed7a143ab82bc4bdc16bca11b7e10e5d7
				], .04), SEAT$1, "base");
				add(block(.42, .62, .08, [
					x,
					1.3599999999999999,
					bz + f * .03
				], .04), SEAT$1, "base");
			}
			add(block(2.28, .37, .4, [
				0,
				.7649999999999999,
				bz + f * .26
			], .02), DARK$1, "base");
		}
		add(limb([
			0,
			.98,
			sz * DOOR_Z$1
		], [
			0,
			top,
			sz * DOOR_Z$1
		], .018, .018), HUB$1, "base");
	}
	add(block(HW$1 * 2 - .1, .4, .04, [
		0,
		1.7799999999999998,
		0
	], .02), SEAT$1, "base");
	for (const [, sz] of ENDS$1) add(block(.5, .05, 1, [
		0,
		2.27,
		sz * DOOR_Z$1
//#piece 07db9bce8fd04a61fdfdfdcf5576368edbfb4f09364b6662eab51abe41dcf930
function pallet$1(add, x, y, z, bone) {
	for (const [bx, w] of [
		[-.3275, .145],
		[-.16, .1],
		[0, .145],
		[.16, .1],
		[.3275, .145]
	]) add(block(w, .022, PL$1, [
		x + bx,
		y + PH$1 - .011,
		z
	], .004), WOOD$1, bone);
	for (const bz of [
		-.5275,
		0,
		.5275
	]) {
		add(block(PW$1, .022, .145, [
			x,
			y + .111,
			z + bz
		], .004), WOOD2$1, bone);
		for (const bx of [
			-.3275,
			0,
			.3275
		]) add(block(.145, .078, .145, [
			x + bx,
			y + .061,
			z + bz
		], .006), WOOD2$1, bone);
	}
	for (const bx of [
		-.3275,
		0,
		.3275
	]) add(block(.1, .022, PL$1, [
		x + bx,
		y + .011,
		z
	], .004), WOOD$1, bone);
	const top = 1.4560000000000002;
	for (let k = 0; k < 3; k++) add(block(.78, top / 3 - .01, 1.18, [
		x,
		y + PH$1 + (k + .5) * (top / 3),
		z
	], .02), k % 2 ? CRATE$1 : CRATE2$1, bone);
	add(block(.804, top * .7, 1.204, [
		x,
		y + PH$1 + top * .5,
		z
	], .02), WRAP$1, bone, 1);
}
/** the goods pod: a low hold between the axles, a shelf over each, two doors each side, four Euro pallets */
/** @param {Add} add */
function goods$1(add) {
	add(block(HW$1 * 2 - .04, .06, MID$1 * 2, [
		0,
		.13,
		0
	], .01), FLOOR$1, "base");
	for (const sz of [-1, 1]) {
		add(block(HW$1 * 2 - .04, .06, .6200000000000001, [
			0,
			.5499999999999999,
			sz * 3.38 / 2
		], .01), FLOOR$1, "base");
		add(block(HW$1 * 2 - .04, .41999999999999993, .04, [
			0,
			.74 / 2,
			sz * MID$1
		], .01), BAY$1, "base");
		add(block(HW$1 * 2, 1.79, .05, [
			0,
			2.95 / 2,
			sz * 1.975
		], .02), BODY$1, "base");
		add(block(HW$1 * 2, .07, .052, [
			0,
			1,
			sz * 1.975
		], .005), BAND$1, "base");
		for (const sx of [-1, 1]) add(block(.1, 2.0100000000000002, .1, [
			sx * 1.17,
			2.7300000000000004 / 2,
			sz * 1.95
		], .04), BODY$1, "base");
	}
	for (const [s, sx] of SIDES$1) {
		const x = sx * 1.195;
		for (const sz of [-1, 1]) {
			add(block(.04, 1.79, .6200000000000001, [
				x,
				2.95 / 2,
				sz * 3.38 / 2
			], .015), BODY$1, "base");
			add(block(.044, .07, .6200000000000001, [
				x,
				1,
				sz * 3.38 / 2
			], .005), BAND$1, "base");
		}
		add(block(.06, .1, 4, [
			sx * 1.19,
			2.3200000000000003,
			0
		], .01), BODY$1, "base");
		for (const [e, sz] of ENDS$1) {
			const bone = `door${s}${e}`, mid = sz * MID$1 / 2;
			add(block(.04, 2.11, 1.3699999999999999, [
				x,
				2.43 / 2,
				mid
			], .015), BODY$1, bone);
			for (const k of [
				.15,
				.5,
				.85
			]) add(block(.02, 2.01, .04, [
				sx * 1.218,
				2.43 / 2,
				sz * MID$1 * k
			], .008), "#e2e1db", bone);
			add(block(.044, .07, 1.3699999999999999, [
				x,
				1,
				mid
			], .005), BAND$1, bone);
			add(block(.02, .1, 1.0799999999999998, [
				sx * 1.212,
				2.1500000000000004,
				mid
			], .01), GLASS$1, bone, 1);
			add(limb([
				sx * 1.24,
				.9,
				sz * .1
			], [
				sx * 1.24,
				1.4,
				sz * .1
			], .014, .014), HUB$1, bone);
		}
	}
	for (const [s, sx] of SIDES$1) for (const [e, sz] of ENDS$1) pallet$1(add, sx * ROW_X$1, LOAD$1, sz * PALLET_Z$1, `pallet${s}${e}`);
	for (const sz of [-1, 1]) for (const x of [-.6, .6]) add(block(.9, .4, .5, [
		x,
		.78,
		sz * 1.67
	], .02), x > 0 ? CRATE$1 : CRATE2$1, "base");
}
/**
* The pod at a moment: where it is along z (driving), which way it leads, its doors (0 shut … 1 open), its bay's
* flaps, and how far the goods pod's pallets are out of their doors (0 in … 1 out on the platform beside it).
* @param {Kind} kind
* @param {{ z?: number, lead?: -1 | 0 | 1, doors?: number, flaps?: number, out?: number }} s
* @returns {Pose}
*/
function at$1(kind, { z = 0, lead = 0, doors = 0, flaps = 0, out = 0 }) {
	/** @type {Pose} */
	const p = { root: [
		0,
		0,
		z
	] };
	for (const [e, sz] of ENDS$1) {
		p[`axle${e}`] = [
			z / R$1,
			0,
			0
		];
//#piece 8c09fa285d821b2b9815472e8d3974caa3e5c411888af74ff271548b91d60cb5
	}
	for (const [s, sx] of SIDES$1) if (kind === "people") {
		for (const [e, sz] of ENDS$1) p[`door${s}${e}`] = [
//#piece 3bc495e932d47f54ae69bf3bd68636d077fbbb18b69bd3cd5250bbb1589f70fe
	} else for (const [e, sz] of ENDS$1) {
		p[`door${s}${e}`] = [
			0,
			-sx * sz * 1.6 * doors,
			0
		];
		p[`pallet${s}${e}`] = [
			0,
			0,
			-Math.asin(sx * OUT$1 * out / PIVOT$1)
		];
	}
	return p;
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
const ramp$1 = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/** Build a pod and its moves. @param {Kind} kind @returns {Cast} */
function pod$1(kind) {
//#piece 52a108852e60be1bbd44aa056d699e283ddb3240072c18e07352460d8221ea85
	}, ...ENDS$1.flatMap(([e, sz]) => [
		{
			name: `axle${e}`,
			parent: "base",
			at: [
				0,
				R$1,
				sz * AZ$1
			]
		},
		{
			name: `light${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$1
			]
		},
		{
			name: `tail${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL$1
			]
		}
	])];
	for (const [s, sx] of SIDES$1) if (kind === "people") {
		for (const [e, sz] of ENDS$1) bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN$1,
				sz * 1.375
			]
		});
		bones.push({
			name: `flap${s}`,
			parent: "base",
			at: [
				sx * HW$1,
				BAY_Y$1[1],
				0
			]
		});
	} else for (const [e, sz] of ENDS$1) {
		bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				LOAD$1,
				sz * MID$1
			]
		});
		bones.push({
			name: `pallet${s}${e}`,
			parent: "base",
			at: [
				sx * ROW_X$1,
				-399.84,
				sz * PALLET_Z$1
			]
		});
	}
	/** @type {Piece[]} */
//#piece 95f197484f7ea4c20f90f40fd5e70297e0d8e4fdb4edc5d04eba4346fcb8bcf8
	chassis$1(add);
	(kind === "people" ? people$1 : goods$1)(add);
//#piece 519050f82c9fad128a2e93e3030c2871e7f9d34144708f2f56800b3eb168a221
	const m = (s) => at$1(kind, s);
//#piece 343698e9a640f027151586b1353c7f166ebad0d7b62e4dee69b0f915881e351f
			const there = ramp$1(u, 0, .18), back = ramp$1(u, h, .6799999999999999);
//#piece a17da48bc27924c6d503ac8694b0a34523594c1ed0e4ef8c731ac7e614873a8e
			const open = (a) => ramp$1(u, a, a + .06) - ramp$1(u, a + .2, a + .26);
//#piece 4b03e5152783550252f6daffc97d6772911bc8fda321b42c5ddab196064b9d93
			const k = ramp$1(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k
			});
		},
		close: (t) => {
			const k = 1 - ramp$1(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k
			});
		},
		idle: () => m({})
	};
	if (kind === "goods") {
		clips.load = (t) => {
			const u = loop(t, 10);
			return m({
				doors: ramp$1(u, 0, .12) - ramp$1(u, .5, .62),
				out: 1 - ramp$1(u, .15, .45)
			});
		};
		clips.unload = (t) => {
			const u = loop(t, 10);
			return m({
				doors: ramp$1(u, .04, .16) - ramp$1(u, .55, .67),
				out: ramp$1(u, .2, .5)
			});
		};
	}
//#piece bdbf4427e4d06c9ffe397039e889c88f5435e2219f58e7018cb57dcd8cb0d5a1
			unloaded: m({
				doors: 1,
				out: 1
			})
		},
		first: "shuttle"
	};
}

//#endregion
//#region src/lib/actors/pod.v4.js
//#piece 0cd254f23a8de8b4ebc0abe2b80f75399361952bdbb16bffbb82479fe14bf265
const BODY = "#f1f0eb";
const BAND = "#2f6f68";
const DARK = "#2a2c2e";
const STEEL = "#9a9fa3";
const HUB = "#b7bbbd";
const GLASS = "#a9c3cd";
const SEAT = "#3f5f7a";
const FLOOR = "#5b5e60";
const BAY = "#3a3c3e";
const CRATE = "#b98d55";
const CRATE2 = "#a87f4c";
const WHITE = "#fff4d6";
const RED = "#e0302a";
const HL = 2;
const HW = 1.22;
const ROUND = .1;
/** the wheels: radius, the treads' x (half the gauge), the axles' z */
const R = .2;
const GX = 1.435 / 2;
const AZ = 1.7;
//#piece de2df7bef5eaac6133e7b1251893e54f4c64be9205cab417c7ff9d35f4eb8b90
const MID = 1.38;
const BAY_Y = [.14, .52];
const CABIN = .58;
/** the people mover's doors: their middle (z) and width; the goods pod's floor */
const DOOR_Z = .975;
const DOOR_W = .8;
const LOAD = .16;
const PL = 1.2;
const PW = .8;
const PH = .144;
const ROW_X = .6;
const PALLET_Z = .62;
const OUT = 2.2;
const PIVOT = 400;
/** the goods pod's racks over the axles: their compartments' heights from the floor up (m), a shelf between each */
const RACK = [
	.42,
	.36,
	.32,
	.28,
	.27
];
/** each compartment's bottom and top */
const LEVELS = /* @__PURE__ */ (() => RACK.map((h, i) => {
	const y0 = CABIN + RACK.slice(0, i).reduce((a, b) => a + b, 0) + i * .015;
	return [y0, y0 + h];
}))();
const WOOD = "#c9a878";
const WOOD2 = "#b8955f";
const WRAP = "#dfe3e2";
const SIDES = [["L", 1], ["R", -1]];
const ENDS = [["N", 1], ["S", -1]];
/** the running gear, the ends, the roof, the shell's round corners and the lamps: what both variants share */
/** @param {Add} add */
function chassis(add) {
	for (const [e, sz] of ENDS) {
		const z = sz * AZ, axle = `axle${e}`;
		add(wheel(.045, GX * 2 - .1, [
			0,
			R,
			z
		], 14), DARK, axle);
		for (const sx of [-1, 1]) {
			add(wheel(R, .1, [
				sx * GX,
				R,
				z
			], 28), STEEL, axle);
			add(wheel(.23, .022, [
				sx * .6575,
				R,
				z
			], 28), DARK, axle);
			add(wheel(R * .55, .104, [
				sx * GX,
				R,
				z
			], 5), HUB, axle);
		}
		add(block(1.635, .08, .5, [
			0,
			.30000000000000004,
			z
		], .02), DARK, "base");
		add(block(.5, .22, .32, [
			0,
			.23,
			z - sz * .32
		], .03), DARK, "base");
		for (const sx of [-1, 1]) add(block(.04, .21999999999999997, .5200000000000001, [
			sx * 1.2,
			.94 / 2,
			sz * 3.28 / 2
		], .015), BODY, "base");
		add(block(HW * 2 - 2 * ROUND, .21999999999999997, .04, [
			0,
			.94 / 2,
			sz * 1.98
		], .015), BODY, "base");
		add(block(2.2, .12, .06, [
			0,
			.36,
			sz * 1.97
		], .03), DARK, "base");
		for (const sx of [-1, 1]) {
			add(block(.26, .07, .014, [
				sx * .86,
				.9,
				sz * 1.998
			], .006), WHITE, `light${e}`);
			add(block(.16, .07, .014, [
				sx * .55,
				.9,
				sz * 1.998
			], .006), RED, `tail${e}`);
		}
	}
	add(block(HW * 2, .2, 4, [
		0,
		2.4899999999999998,
		0
	], ROUND), BODY, "base");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(block(ROUND * 2, 2.23, ROUND * 2, [
		sx * 1.1199999999999999,
		2.9499999999999997 / 2,
		sz * 1.9
	], ROUND), BODY, "base");
}
//#piece 375a8b3a6351f90f4c5a2e6a5dd6e85168e31abc5a7529625d8c550509ab0488
function bay(add) {
	add(block(HW * 2 - .04, .04, MID * 2, [
		0,
		BAY_Y[0] - .02,
		0
	], .01), BAY, "base");
	for (const sz of [-1, 1]) add(block(HW * 2 - .04, BAY_Y[1] - BAY_Y[0], .04, [
		0,
		(BAY_Y[0] + BAY_Y[1]) / 2,
		sz * 1.3599999999999999
	], .01), BAY, "base");
	for (const x of [
		-.6,
		0,
		.6
	]) add(block(.03, .02, MID * 2 - .1, [
		x,
		BAY_Y[0] + .01,
		0
	], .005), HUB, "base");
	for (const [s, sx] of SIDES) {
		const h = BAY_Y[1] - BAY_Y[0];
		add(block(.035, h - .01, MID * 2 - .02, [
			sx * 1.202,
			(BAY_Y[0] + BAY_Y[1]) / 2,
			0
		], .012), BODY, `flap${s}`);
		add(block(.03, .035, .4, [
			sx * 1.224,
			BAY_Y[0] + .06,
			0
		], .012), DARK, `flap${s}`);
	}
	for (const [x, z, w, h, d, c] of [
		[
			.55,
			-.8,
			.9,
			.34,
			.7,
			CRATE
		],
		[
			-.5,
			-.9,
			.7,
			.3,
			.5,
			CRATE2
		],
		[
			.3,
			.6,
			.6,
			.34,
			.6,
			CRATE2
		],
		[
			-.6,
			.85,
			.8,
			.26,
			.5,
			CRATE
		]
	]) add(block(w, h, d, [
		x,
		BAY_Y[0] + h / 2,
//#piece cc218a3ccfc57f98f00d303a73035210d6143a6996adf045769b228edd4d5057
function people(add) {
	bay(add);
	add(block(HW * 2 - .04, .06, 3.96, [
		0,
		.5499999999999999,
		0
	], .01), FLOOR, "base");
	const top = 2.4099999999999997;
	for (const [s, sx] of SIDES) {
//#piece 7ab6fc380ec7eb8163eaf14b61b2595fa19235b22178a923dacf0d8e3a8a4e62
			[-1.9, -.975 - DOOR_W / 2],
			[-.575, DOOR_Z - DOOR_W / 2],
			[1.375, 1.9]
//#piece 7ab43014a5cfebc4a0b645fe1380446b92eac7685330c32e784d71616f06a950
			], .02), BODY, "base");
			add(block(.052, .07, len, [
				x,
				.9500000000000001,
				mid
			], .005), BAND, "base");
			add(block(.02, 1.3599999999999997, len - .1, [
				sx * 1.19,
				3.46 / 2,
				mid
			]), GLASS, "base", 1);
			for (const z of [z0, z1]) add(block(.07, 1.9299999999999997, .08, [
				sx * 1.185,
				2.9899999999999998 / 2,
				z + (z === z0 ? .04 : -.04)
			], .02), BODY, "base");
		}
		add(block(.06, .06000000000000005, 4 - 2 * ROUND, [
			sx * 1.19,
			4.88 / 2,
			0
		], .01), BODY, "base");
		for (const [e, sz] of ENDS) {
			const bone = `door${s}${e}`, mid = sz * DOOR_Z;
			for (const dz of [-1, 1]) add(block(.04, 1.8299999999999996, .06, [
				sx * 1.2,
				2.9899999999999998 / 2,
				mid + dz * (DOOR_W / 2 - .03)
			], .015), BODY, bone);
			add(block(.04, .4700000000000001, DOOR_W, [
				sx * 1.2,
				1.63 / 2,
				mid
			], .015), BODY, bone);
			add(block(.042, .07, DOOR_W, [
				sx * 1.2,
				.9500000000000001,
				mid
			], .005), BAND, bone);
			add(block(.04, .05, DOOR_W, [
				sx * 1.2,
				2.385,
				mid
			], .015), BODY, bone);
			add(block(.015, 1.3099999999999996, .7000000000000001, [
				sx * 1.2,
				3.41 / 2,
				mid
			]), GLASS, bone, 1);
//#piece c38f87904d5ba8881b18614fb0c85d9ad50410a59599204ae97b0a52f0675667
			], .014, .014), HUB, bone);
		}
	}
	for (const [, sz] of ENDS) {
		add(block(HW * 2 - 2 * ROUND, .5100000000000001, .05, [
			0,
			(1.63 - .04) / 2,
			sz * 1.975
		], .02), BODY, "base");
		add(block(HW * 2 - 2 * ROUND, .07, .052, [
			0,
			.9500000000000001,
			sz * 1.975
		], .005), BAND, "base");
		add(block(HW * 2 - .2, 1.3599999999999997, .02, [
			0,
			3.46 / 2,
			sz * 1.97
		]), GLASS, "base", 1);
		add(block(1.2, .08, .03, [
			0,
			2.3499999999999996,
			sz * 1.99
		], .01), DARK, "base");
//#piece 4cd38b9a646eb30d185dd4af95a7eaaed7a143ab82bc4bdc16bca11b7e10e5d7
				], .04), SEAT, "base");
				add(block(.42, .62, .08, [
					x,
					1.3599999999999999,
					bz + f * .03
				], .04), SEAT, "base");
			}
			add(block(2.28, .37, .4, [
				0,
				.7649999999999999,
				bz + f * .26
			], .02), DARK, "base");
		}
		add(limb([
			0,
			.98,
			sz * DOOR_Z
		], [
			0,
			top,
			sz * DOOR_Z
		], .018, .018), HUB, "base");
	}
	add(block(HW * 2 - .1, .4, .04, [
		0,
		1.7799999999999998,
		0
	], .02), SEAT, "base");
	for (const [, sz] of ENDS) add(block(.5, .05, 1, [
		0,
		2.3699999999999997,
		sz * DOOR_Z
//#piece 07db9bce8fd04a61fdfdfdcf5576368edbfb4f09364b6662eab51abe41dcf930
function pallet(add, x, y, z, bone) {
	for (const [bx, w] of [
		[-.3275, .145],
		[-.16, .1],
		[0, .145],
		[.16, .1],
		[.3275, .145]
	]) add(block(w, .022, PL, [
		x + bx,
		y + PH - .011,
		z
	], .004), WOOD, bone);
	for (const bz of [
		-.5275,
		0,
		.5275
	]) {
		add(block(PW, .022, .145, [
			x,
			y + .111,
			z + bz
		], .004), WOOD2, bone);
		for (const bx of [
			-.3275,
			0,
			.3275
		]) add(block(.145, .078, .145, [
			x + bx,
			y + .061,
			z + bz
		], .006), WOOD2, bone);
	}
	for (const bx of [
		-.3275,
		0,
		.3275
	]) add(block(.1, .022, PL, [
		x + bx,
		y + .011,
		z
	], .004), WOOD, bone);
	const top = 1.4560000000000002;
	for (let k = 0; k < 3; k++) add(block(.78, top / 3 - .01, 1.18, [
		x,
		y + PH + (k + .5) * (top / 3),
		z
	], .02), k % 2 ? CRATE : CRATE2, bone);
	add(block(.804, top * .7, 1.204, [
		x,
		y + PH + top * .5,
		z
	], .02), WRAP, bone, 1);
}
/** the goods pod: a low hold between the axles, two doors each side, four Euro pallets; racks over the axles */
/** @param {Add} add */
function goods(add) {
	add(block(HW * 2 - .04, .06, MID * 2, [
		0,
		.13,
		0
	], .01), FLOOR, "base");
	for (const sz of [-1, 1]) {
		const lz = sz * 3.38 / 2;
		add(block(HW * 2 - .04, .06, .56, [
			0,
			.5499999999999999,
			lz - sz * .03
		], .01), FLOOR, "base");
		add(block(HW * 2 - .04, 2.3099999999999996, .04, [
			0,
			2.63 / 2,
			sz * MID
		], .01), BAY, "base");
		add(block(.03, 1.8899999999999997, .56, [
			0,
			3.05 / 2,
			lz - sz * .03
		], .01), BAY, "base");
		for (const [, y1] of LEVELS.slice(0, -1)) add(block(HW * 2 - .04, .015, .56, [
			0,
			y1 + .0075,
			lz - sz * .03
		], .004), FLOOR, "base");
		add(block(HW * 2 - 2 * ROUND, 1.8899999999999997, .05, [
			0,
			3.05 / 2,
			sz * 1.975
		], .02), BODY, "base");
		add(block(HW * 2 - 2 * ROUND, .07, .052, [
			0,
			1,
			sz * 1.975
		], .005), BAND, "base");
	}
	for (const [s, sx] of SIDES) {
		const x = sx * 1.195;
		for (const [e, sz] of ENDS) {
//#piece 6d3c03eb417dd2e89625e4c61fa221e088b3430fd72dd869f139d6a3cd5490b9
			], .015), BODY, bone);
			add(block(.044, .07, w, [
				x,
				1,
				mz
			], .005), BAND, bone);
			add(limb([
				sx * 1.24,
				1.2,
				sz * 1.45
			], [
				sx * 1.24,
				1.6,
				sz * 1.45
			], .014, .014), HUB, bone);
		}
		add(block(.06, .1, 4 - 2 * ROUND, [
			sx * 1.19,
			2.42,
			0
		], .01), BODY, "base");
		for (const [e, sz] of ENDS) {
			const bone = `door${s}${e}`, mid = sz * MID / 2;
			add(block(.04, 2.2099999999999995, 1.3699999999999999, [
				x,
				2.53 / 2,
				mid
			], .015), BODY, bone);
			for (const k of [
				.15,
				.5,
				.85
			]) add(block(.02, 2.1099999999999994, .04, [
				sx * 1.218,
				2.53 / 2,
				sz * MID * k
			], .008), "#e2e1db", bone);
			add(block(.044, .07, 1.3699999999999999, [
				x,
				1,
				mid
			], .005), BAND, bone);
			add(block(.02, .1, 1.0799999999999998, [
				sx * 1.212,
				2.25,
				mid
			], .01), GLASS, bone, 1);
			add(limb([
				sx * 1.24,
				.9,
				sz * .1
			], [
				sx * 1.24,
				1.4,
				sz * .1
			], .014, .014), HUB, bone);
		}
	}
	for (const [s, sx] of SIDES) for (const [e, sz] of ENDS) pallet(add, sx * ROW_X, LOAD, sz * PALLET_Z, `pallet${s}${e}`);
	for (const sz of [-1, 1]) for (const sx of [-1, 1]) for (const [i, [y0, y1]] of LEVELS.entries()) {
		const h = (y1 - y0) * .75;
		add(block(.45, h, .4, [
			sx * (.75 - i % 2 * .1),
			y0 + h / 2,
			sz * 1.65
		], .02), i % 2 ? CRATE2 : CRATE, "base");
		if (i % 2 === 0) add(block(.3, h * .7, .3, [
			sx * .3,
			y0 + h * .35,
			sz * 1.67
		], .02), CRATE2, "base");
//#piece a9ff27a29b663ebb2a7091239dfa5c0b8a3bbab7b01c669d2f1968282123de56
* racks' doors (one number for all, or one each by name: `LN` is the left one at the north end).
* @param {Kind} kind
* @param {{ z?: number, lead?: -1 | 0 | 1, doors?: number, flaps?: number, out?: number, racks?: number | ((name: string) => number) }} s
* @returns {Pose}
*/
function at(kind, { z = 0, lead = 0, doors = 0, flaps = 0, out = 0, racks = 0 }) {
	/** @type {Pose} */
	const p = { root: [
		0,
		0,
		z
	] };
	for (const [e, sz] of ENDS) {
		p[`axle${e}`] = [
			z / R,
			0,
			0
		];
//#piece 8c09fa285d821b2b9815472e8d3974caa3e5c411888af74ff271548b91d60cb5
	}
	for (const [s, sx] of SIDES) if (kind === "people") {
		for (const [e, sz] of ENDS) p[`door${s}${e}`] = [
//#piece 3bc495e932d47f54ae69bf3bd68636d077fbbb18b69bd3cd5250bbb1589f70fe
	} else for (const [e, sz] of ENDS) {
		p[`door${s}${e}`] = [
			0,
			-sx * sz * 1.6 * doors,
			0
		];
		p[`pallet${s}${e}`] = [
			0,
			0,
			-Math.asin(sx * OUT * out / PIVOT)
		];
//#piece 0f9f96f49b6306e1a274cac3b9ffd34887ab7184cbb228c663c20cd66aa3d661
const ramp = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/** Build a pod and its moves. @param {Kind} kind @returns {Cast} */
function pod(kind) {
//#piece 52a108852e60be1bbd44aa056d699e283ddb3240072c18e07352460d8221ea85
	}, ...ENDS.flatMap(([e, sz]) => [
		{
			name: `axle${e}`,
			parent: "base",
			at: [
				0,
				R,
				sz * AZ
			]
		},
		{
			name: `light${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL
			]
		},
		{
			name: `tail${e}`,
			parent: "base",
			at: [
				0,
				.9,
				sz * HL
			]
		}
	])];
	for (const [s, sx] of SIDES) if (kind === "people") {
		for (const [e, sz] of ENDS) bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN,
				sz * 1.375
			]
		});
		bones.push({
			name: `flap${s}`,
			parent: "base",
			at: [
				sx * HW,
				BAY_Y[1],
				0
			]
		});
	} else for (const [e, sz] of ENDS) {
		bones.push({
			name: `door${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				LOAD,
				sz * MID
			]
		});
		bones.push({
			name: `pallet${s}${e}`,
			parent: "base",
			at: [
				sx * ROW_X,
				-399.84,
				sz * PALLET_Z
			]
		});
		bones.push({
			name: `rack${s}${e}`,
			parent: "base",
			at: [
				sx * 1.2,
				CABIN,
				sz * 1.9
			]
		});
	}
	/** @type {Piece[]} */
//#piece 95f197484f7ea4c20f90f40fd5e70297e0d8e4fdb4edc5d04eba4346fcb8bcf8
	chassis(add);
	(kind === "people" ? people : goods)(add);
//#piece 519050f82c9fad128a2e93e3030c2871e7f9d34144708f2f56800b3eb168a221
	const m = (s) => at(kind, s);
//#piece 343698e9a640f027151586b1353c7f166ebad0d7b62e4dee69b0f915881e351f
			const there = ramp(u, 0, .18), back = ramp(u, h, .6799999999999999);
//#piece a17da48bc27924c6d503ac8694b0a34523594c1ed0e4ef8c731ac7e614873a8e
			const open = (a) => ramp(u, a, a + .06) - ramp(u, a + .2, a + .26);
//#piece 4b03e5152783550252f6daffc97d6772911bc8fda321b42c5ddab196064b9d93
			const k = ramp(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k,
				racks: k
			});
		},
		close: (t) => {
			const k = 1 - ramp(loop(t, 5), .08, .4);
			return m({
				doors: k,
				flaps: k,
				racks: k
			});
		},
		idle: () => m({})
	};
	if (kind === "goods") {
		clips.load = (t) => {
			const u = loop(t, 10);
			return m({
				doors: ramp(u, 0, .12) - ramp(u, .5, .62),
				out: 1 - ramp(u, .15, .45)
			});
		};
		clips.unload = (t) => {
			const u = loop(t, 10);
			return m({
				doors: ramp(u, .04, .16) - ramp(u, .55, .67),
				out: ramp(u, .2, .5)
//#piece 059990e813778ad4f1698e989d7c30fbe9a5a515fefdf48155cad3e213ed0535
				return v < 0 || v > 2.5 ? 0 : ramp(v, 0, .5) - ramp(v, 2, 2.5);
//#piece f427aa5bc8fd44d0c84fa48c319b71da1faff8b21aee09cbc0272a863dfec0a7
				out: 1
			})
		},
		first: "shuttle"
	};
}

//#endregion
//#piece 3532b0d665f0eafc01676fed7d204bcc39878ec23b8713471ddbe88f6ab93fb2
const HISTORY = /* @__PURE__ */ (() => ({ pod: [
	{
		...FIRST,
		date: "2026-10-07",
		build: [{
			id: "pod-people",
			label: "People",
			note: "as at v1: eight seats, an underfloor bay open at the ends",
			make: () => pod$3("people")
		}, {
			id: "pod-goods",
			label: "Goods",
			note: "as at v1: barn doors at both ends",
			make: () => pod$3("goods")
		}]
	},
	{
		v: 2,
		date: "2026-10-07",
		note: "On rails: small flanged wheels on two axles at the very ends, the room between them to carry things; opens only to its sides; twenty seats in two compartments; the goods pod’s sides lift as wings",
		build: [{
			id: "pod-people",
			label: "People",
			note: "as at v2",
			make: () => pod$2("people")
		}, {
			id: "pod-goods",
			label: "Goods",
			note: "as at v2: its sides lifting as wings, roll cages in it",
			make: () => pod$2("goods")
		}]
	},
	{
		v: 3,
		date: "2026-10-07",
		note: "The goods pod’s doors swing open left and right, two each side; four Euro pallets in it, loaded and unloaded through them; open, close, load and unload as moves",
		build: [{
			id: "pod-people",
			label: "People",
			note: "as at v3",
			make: () => pod$1("people")
		}, {
			id: "pod-goods",
			label: "Goods",
			note: "as at v3: open shelves over the axles",
			make: () => pod$1("goods")
		}]
	},
	{
		v: 4,
		date: "2026-10-07",
		note: "The goods pod’s shelves over its axles become racks: five compartments of different heights each side, behind one tall door per rack; they open one by one as a move. Both pods: the shell’s edges and corners softly rounded as one piece, the roof sensors flush in it, the roof up to 2.59 m",
		build: [{
			id: "pod-people",
			label: "People",
			note: "as at v4",
			make: () => pod("people")
		}, {
			id: "pod-goods",
			label: "Goods",
			note: "as at v4: its pallets sliding in and out on their own",
			make: () => pod("goods")
		}]
	},
	{
		v: 5,
		date: "2026-10-07",
		note: "The goods pod’s pallets are carried in and out by forklifts, one to each pallet: the Forklift actor built into its rig, driving in under the pallet, lifting it and carrying it through the doors; the pallets go out far enough to clear the doors’ swing"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "pod",
	label: "Pod",
	note: "the mini transporter: autonomous and electric on rails, no front and no back, 4 m long so three fill a 40 ft container, as wide and high as one; small wheels at the very ends, it opens only to its sides, white lamps lead and red trail either way",
	from: "Sandbox 5: between the hexes and through the tunnels",
	variants: [{
		id: "pod-people",
		label: "People",
		note: "twenty seats in two compartments, two benches of five facing each other in each, a door each side between them; the bay under the floor between the axles, a flap on each side",
		make: () => pod$4("people")
	}, {
		id: "pod-goods",
		label: "Goods",
		note: "four Euro pallets (1200 × 800 mm) in two rows lengthwise, carried in and out by four forklifts, each row behind two doors on its side that swing open left and right; a hold 2.2 m high; over the axles, racks of five compartments at different heights, each rack behind one tall door",
		make: () => pod$4("goods")
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
