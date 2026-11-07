//#piece 8b09f5bb2de61f82762268b682cbf1d947f2baf56fcbad747c26a1c14fc0649d
//#piece 2ee1d9bfd994520834d2a43154e124844761f74e6dcb138b78559218d98aaebf
//#piece f0a3a9fe9e2ca99ef335a24762c59fdb5f3870bf8b7d267f8dd419b123a8f039
//#piece d15fad60f9cf053c6b2f2e409017e2b69c3c18d4db8f541817e46462caa90257
const PL = 1.2;
const PW = .8;
const PH = .144;
const FORK_X = .264;
//#piece a18522ab9ae13c4bf24c12034d9fcf70ca210b7dcf0d2bb19d14cd990ffd1721
//#piece 3d7e8a924021b294fac4ba3e314de552178989d0623a8195aa73c7b8bda77f0d
const BODY = "#f1f0eb";
const BAND = "#2f6f68";
const DARK = "#2a2c2e";
const STEEL = "#8f9498";
const TYRE = "#1d1e20";
const GREEN = "#4fd18b";
const RED = "#e0302a";
//#piece 55b316802a1c3001dcb59786ab8475b4676e94d7bbfdc5869c79143d2d3ae5d0
const WX = .4;
const WZ = -.22;
const FORK = .8;
const TINE_Y = .03;
/** how high the forks lift at most (m) */
const LIFT_MAX = .75;
//#piece 62287eb876bc978fe98a4b5b403830ca3ba5cd2fd0450add5c72ec217f601c5b
			WR,
			WZ
//#piece 5e0b507b3a502f6941b1c46522d9bc2c6f5957adfeba4aea334d00cddc4d6bff
	], .08), BODY, body);
	put(block(.764, .05, .864, [
		0,
		.37,
		-.52
	], .01), BAND, body);
	put(block(.7, .08, .05, [
		0,
		.15,
		-.96
	], .03), DARK, body);
	put(block(.56, .012, .14, [
		0,
		.47,
		-.82
	], .005), DARK, body);
	put(block(.6, .06, .012, [
		0,
		.22,
		-.084
	], .005), DARK, body);
//#piece 18f0d856c15c7141d31c523d7cc23ee551076d6e4f1c8607c6394ec8ccc2b606
	], .006), RED, body);
	for (const sx of [-1, 1]) {
		put(wheel(.055, .05, [
			sx * .26,
			.055,
			-.84
		], 14), TYRE, body);
		put(block(.06, .06, .06, [
			sx * .26,
			.11,
			-.84
		], .01), STEEL, body);
	}
	for (const sx of [-1, 1]) {
		put(wheel(WR, .07, [
			sx * WX,
			WR,
			WZ
		], 22), TYRE, `${name}Wheels`);
		put(wheel(WR * .55, .074, [
			sx * WX,
			WR,
			WZ
		], 5), STEEL, `${name}Wheels`);
	}
	for (const sx of [-1, 1]) put(block(.06, 1.12, .07, [
		sx * .3,
		.67,
		-.07
	], .012), STEEL, body);
	put(block(.66, .06, .07, [
		0,
		1.2,
		-.07
	], .012), STEEL, body);
	put(block(.56, .36, .03, [
		0,
		.23,
		-.015
	], .01), DARK, forks);
	for (const sx of [-1, 1]) {
		put(block(.12, .4, .035, [
			sx * FORK_X,
			.23,
			-.018
		], .008), STEEL, forks);
		put(block(.12, .035, FORK, [
			sx * FORK_X,
			.0475,
			FORK / 2
		], .008), STEEL, forks);
//#piece 1532a67b82a597ee04d719c21605620db9759ea9b89db664af7ce20745a2c050
		0,
		0,
		0,
		size
	];
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
const ramp = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
/**
* The forklift on its own, empty or with a loaded Euro pallet on its forks.
* @param {{ pallet?: boolean }} [o] @returns {Cast}
*/
function forklift({ pallet = false } = {}) {
	/** @type {BoneSpec[]} */
	const bones = [{
		name: "base",
		at: [
			0,
			0,
			0
		]
	}];
	/** @type {import('./rig').Piece[]} */
//#piece 95f197484f7ea4c20f90f40fd5e70297e0d8e4fdb4edc5d04eba4346fcb8bcf8
	forkliftParts(add, bones, {
		name: "forklift",
		parent: "base",
		heel: [
			0,
			0,
			0
		]
	});
	if (pallet) euroPallet(add, [
		0,
		-.035,
		.42
	], 0, "forkliftForks", { stack: 1.2 });
	const r = rig(bones, parts, [skin(.45, { side: three.DoubleSide }), skin(.06, {
		transparent: true,
		opacity: .3,
		depthWrite: false
	})]);
	r.object.name = pallet ? "forklift (with a pallet)" : "forklift";
	const rest = pallet ? .035 : 0;
	/** @param {{ move?: number, lift?: number }} s */
	const m = ({ move = 0, lift = 0 }) => {
		/** @type {Pose} */
		const p = {};
		forkliftPose(p, "forklift", 0, {
			move,
			lift: Math.max(lift, rest)
		});
		return p;
	};
	return {
		rig: r,
		clips: {
			lift: (t) => {
				const u = loop(t, 6);
				return m({ lift: LIFT_MAX * (ramp(u, .1, .4) - ramp(u, .6, .9)) });
			},
			drive: (t) => {
				const u = loop(t, 8);
				return m({ move: 2 * (ramp(u, .05, .45) - ramp(u, .55, .95)) });
			},
			carry: (t) => {
				const u = loop(t, 10);
				return m({
					move: -2 * (ramp(u, .2, .5) - ramp(u, .65, .95)),
					lift: .12 * (ramp(u, .05, .15) - ramp(u, .55, .63))
				});
			},
			idle: () => m({})
		},
		poses: {
			down: m({}),
			raised: m({ lift: .3 }),
			top: m({ lift: LIFT_MAX })
		},
		first: "lift"
	};
}

//#endregion
//#piece 3532b0d665f0eafc01676fed7d204bcc39878ec23b8713471ddbe88f6ab93fb2
const HISTORY = /* @__PURE__ */ (() => ({ forklift: [{
	...FIRST,
	date: "2026-10-07"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "forklift",
	label: "Forklift",
	note: "the pallet mover: autonomous, on a battery, as small as a machine lifting a loaded Euro pallet can be; no cab, a low body, two uprights, forks for a Euro pallet’s openings; it lifts, drives and carries, and it is built into the goods pod’s rig to load and unload it",
	from: "Sandbox 5: loading the pods at the hubs",
	variants: [{
		id: "forklift",
		label: "Forklift",
		note: "1.8 m long with its forks, 0.84 m wide, 1.23 m high; forks 0.8 m long, lifting 75 cm",
		make: () => forklift()
	}, {
		id: "forklift-pallet",
		label: "With a pallet",
		note: "a loaded Euro pallet (1200 × 800 mm, cartons to 1.2 m) on its forks",
		make: () => forklift({ pallet: true })
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
