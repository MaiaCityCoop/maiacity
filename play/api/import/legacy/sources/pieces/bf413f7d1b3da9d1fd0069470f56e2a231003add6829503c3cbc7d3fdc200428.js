//#piece d0f52cd794bf364dca4fc782b3fad7541f3ee21779c71b0a17cc14305a5a2565
//#piece a1438eb08ae46684f3636b0b01678ada22475094f116349f5d5d267724e87304
	return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire, radial, false);
}
/** the coil builder, under a name a spring's options do not hide */
const coilOf = (R, w, n, len, seg, rad) => coil(R, w, n, len, seg, rad);
//#piece 6f811932ac52fb2570befd990721adf7786ec11ca3c566a27bcea3cd49b15817
//#piece 41a8fb4b1e993d184386ac89ac575cc909692dca62ef62b8f08287f53ad24540
//#piece 7861ccc9645c0afb411277a2f480fff00f620c0823c58ed42d8fac02ec170d42
//#piece 8ffc6f0070ebe27ab9d630ae6bfcdefb0d28e7fb68b44a7068414f35ed73290f
//#piece 29ba872460f3e7f3e81bec56c3cd1fd2dd76c90b74d6f4f23ba2af5dcbb8cd63
//#piece 3987a44bf20129b723ebdfe2584d5929f5d3d4d70d5e74fc88f4d226ba0b85af
}
/** the stud holes round a disc and its centre bore, as holes in a shape @param {THREE.Shape} s @param {number} n @param {number} pcd @param {number} hole @param {number} bore @param {number} [phase] */
function studHoles(s, n, pcd, hole, bore, phase = 0) {
	s.holes.push(circle(0, 0, bore));
	for (let k = 0; k < n; k++) {
		const a = phase + k / n * Math.PI * 2;
		s.holes.push(circle(-(pcd / 2) * Math.cos(a), pcd / 2 * Math.sin(a), hole));
	}
	return s;
}
/**
* A pressed-steel wheel: the barrel, a flat mounting face on the hub with its stud holes, a dished centre with its
* cooling vents pressed through, welded into the well. Its mounting face at x = et (outward of the rim's middle).
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, vents?: number }} o
*/
function steelRimGeometry({ rim, rimW, et, studs, pcd, vents = 8 }) {
	const R0 = rim, t = .004;
	const face = studHoles(new three.Shape().absarc(0, 0, .098, 0, Math.PI * 2, false), studs, pcd, .0075, .036);
	const ring = new three.Shape().absarc(0, 0, .16, 0, Math.PI * 2, false);
	ring.holes.push(circle(0, 0, .118));
	for (let k = 0; k < vents; k++) {
		const a = (k + .5) / vents * Math.PI * 2;
		ring.holes.push(circle(.139 * Math.cos(a), .139 * Math.sin(a), .0135));
	}
	const xr = et + .018, xw = rimW / 2 - .045;
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW
		}),
		onX(plate(face, t, 8), et + t / 2),
		GEO.shell([
			[.098, et + t],
			[.11, et + .008],
			[.118, xr]
		], t, 32).rotateZ(-Math.PI / 2),
		onX(plate(ring, t, 8), xr - t / 2),
		GEO.shell([
			[.16, xr],
			[.18, xr - .004],
			[R0 - .03, Math.min(xw, xr - .008)]
		], t, 36).rotateZ(-Math.PI / 2)
	]);
}
/**
* A cast-alloy wheel: a thick barrel, and a face of `spokes` spokes from a hub boss to the rim, its stud holes in the
* boss, its windows showing the brake behind.
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, spokes?: number }} o
*/
function alloyRimGeometry({ rim, rimW, et, studs, pcd, spokes = 6 }) {
	const Rf = rim - .004;
	const face = new three.Shape().absarc(0, 0, Rf, 0, Math.PI * 2, false);
	studHoles(face, studs, pcd, .0085, .034, Math.PI / studs);
	const spokeW = .052, rIn = .098, rOut = Rf - .022;
	for (let k = 0; k < spokes; k++) {
		const a0 = k / spokes * Math.PI * 2, a1 = (k + 1) / spokes * Math.PI * 2;
		/** @type {V2[]} */
		const win = [];
		const dIn = Math.asin(spokeW / 2 / rIn), dOut = Math.asin(spokeW * 1.25 / 2 / rOut);
		for (let j = 0; j <= 6; j++) {
			const a = a0 + dOut + (a1 - a0 - 2 * dOut) * j / 6;
			win.push([rOut * Math.cos(a), rOut * Math.sin(a)]);
		}
		for (let j = 2; j >= 0; j--) {
			const a = a0 + dIn + (a1 - a0 - 2 * dIn) * j / 2;
			win.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
		}
		face.holes.push(roundHole(win, .012));
	}
	const depth = .026;
	const faceGeo = ext(face, depth, .003, 8).rotateY(Math.PI / 2).translate(et + .012 + depth / 2, 0, 0);
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW,
			t: .0055
		}),
		faceGeo,
		latheX([
			[.036, et],
			[.09, et],
			[.09, et + .012],
			[.036, et + .012]
		], 40),
		GEO.shell([[Rf - .004, et + .014], [rim - .026, rimW / 2 - .044]], .006, 64).rotateZ(-Math.PI / 2)
	]);
}
/**
//#piece 2247668e85e0c1450a78ba3ebcde8f38b22c7ac4504a616bfaa01a9b4f127532
//#piece 90aca4b5d5bc8c0b135accfdccbe5bff7352468fdd1625cb688214ec9baece9f
*/
//#piece f1264dcd227fac60f84d760f31854c4bfbd3cad578eef591ddb969fb698861ec
* A brake drum and its backing plate: the drum's face on the hub at x = 0, its finned cylinder reaching in by `depth`,
* the plate closing it with the wheel cylinder's bump and the adjuster's bung.
* @param {{ r: number, depth: number }} o
*/
function drumGeometry({ r, depth }) {
	return {
		drum: latheX([
			[.036, 0],
			[r + .004, 0],
			[r + .008, -.01],
			[r + .008, -.016],
			[r + .004, -.02],
			[r + .004, -.03],
			[r + .009, -.034],
			[r + .009, -.04],
			[r + .004, -.044],
			[r + .004, -depth],
			[r - .009, -depth],
			[r - .009, -.007],
			[.036, -.007]
		], 40),
		back: GEO.merge([
			latheX([
				[.03, -depth - .002],
				[r + .012, -depth - .002],
				[r + .012, -depth - .006],
				[r - .01, -depth - .018],
				[.03, -depth - .018]
			], 40),
			cyl([
				-depth - .012,
				r * .72,
				0
			], [
				-depth - .03,
				r * .72,
				0
			], .014, 12),
			cyl([
				-depth - .01,
				-r * .6,
				.02
			], [
				-depth - .022,
				-r * .6,
				.02
			], .009, 10)
		])
	};
}
/**
* A steering knuckle (upright) for double wishbones: the spindle into the hub, the body between the two ball joints,
* the steering arm reaching to the tie rod's end (back, or forward with `arm` 1). Its points in the wheel's frame.
* @param {{ et: number, arm?: 1 | -1 }} o
*/
function knuckleGeometry({ et, arm = -1 }) {
	const J = {
		...KNUCKLE,
		tie: [
			KNUCKLE.tie[0],
			KNUCKLE.tie[1],
			-arm * KNUCKLE.tie[2]
		]
	};
	const body = [
		cyl([
			et - .06,
			0,
			0
		], [
			J.body,
			0,
			0
		], .03, 14),
		cyl([
			J.body - .012,
			-.02,
			0
		], [
			J.body + .012,
			-.02,
			0
		], .05, 14),
		cyl([
			J.body,
			.02,
			0
		], [
			J.upper[0],
			J.upper[1] - .02,
			0
		], .017, 12),
		cyl([
			J.body,
			-.03,
			0
		], [
			J.lower[0],
			J.lower[1] + .02,
			0
		], .02, 12),
		cyl([
			J.body,
			-.02,
			0
		], [
			J.tie[0],
			J.tie[1],
			J.tie[2]
		], .012, 10)
	];
	const balls = [
		new three.SphereGeometry(.022, 14, 10).translate(...J.upper),
		new three.SphereGeometry(.026, 14, 10).translate(...J.lower),
		new three.SphereGeometry(.015, 12, 8).translate(...J.tie)
	];
	return {
		body: GEO.merge(body),
		balls: GEO.merge(balls)
	};
}
/** where a steered wheel's joints are, in its frame (+x out): the upper and lower ball joints, the tie rod's end, the knuckle's body */
const KNUCKLE = {
	upper: [
		-.112,
		.165,
		0
	],
	lower: [
		-.128,
		-.15,
		0
	],
	tie: [
		-.12,
		-.04,
		-.15
	],
	body: -.085
};
/**
* @typedef {object} CornerOptions
* @property {string} id short: fl, fr, rl, rr
* @property {string} label "front left"
* @property {V3} at the wheel's middle (in `parent`'s frame)
* @property {1 | -1} side which way its outer face looks (x)
* @property {TyreSize} size
* @property {number} rimW the rim's width between its flanges (m)
* @property {number} [et] how far out of the rim's middle its face on the hub is (m)
* @property {'steel' | 'alloy'} rim
* @property {number} studs @property {number} pcd the studs, on their circle's diameter (m)
* @property {'disc' | 'drum'} brake
* @property {{ r: number, rIn: number, t: number }} [disc]
* @property {{ r: number, depth: number }} [drum]
* @property {boolean} [steers] a knuckle and a steering axis
* @property {1 | -1} [arm] its steering arm reaches forward (1, the tie rods in front of the axle) or back (−1)
* @property {'highway' | 'allTerrain'} [pattern]
* @property {string} assembly @property {string} [source] @property {string} [drive]
* @property {[string, string][]} [specs] more of the wheel's numbers
* @property {import('$lib/assets/parts.js').How['tag']} [tag] a label on the tyre
* @property {VehicleMats} M
* @property {THREE.Material} [rimMat] @property {THREE.Material} [capMat]
* @property {THREE.Object3D} [parent]
*/
/**
* One wheel at its corner, in its parts: the tyre on its rim with its nuts and hub cap (`wheel-<id>`), the brake disc
* or drum and its hub (`brake-<id>`), the calliper or the backing plate (`calliper-<id>`), and on a steered wheel the
* knuckle (`knuckle-<id>`). A corner group at the wheel's middle (mirrored for a wheel whose outer face looks to −x),
* a steer group in it turning about the kingpin, and the wheel and brake spinning about the axle.
* @param {Kit} kit @param {CornerOptions} o
*/
function wheelCorner(kit, o) {
	const { M, size } = o, et = o.et ?? .03;
	const corner = new three.Group();
	corner.name = `corner-${o.id}`;
	corner.position.set(...o.at);
	corner.scale.x = o.side;
	(o.parent ?? kit.root).add(corner);
	const steer = new three.Group();
	steer.name = `steer-${o.id}`;
	corner.add(steer);
	const m = (g, mat) => kit.mesh(g, mat);
	const pcdR = o.pcd / 2;
	const wheel = new three.Group();
	const tyre = m(tyreGeometry({
		size,
		rimW: o.rimW,
		pattern: o.pattern ?? "highway"
	}), M.tyre);
	const rimGeo = o.rim === "alloy" ? alloyRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	}) : steelRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	});
	const faceX = o.rim === "alloy" ? et + .026 : et + .004;
	const phase = o.rim === "alloy" ? Math.PI / o.studs : 0;
	/** where stud k is round the axle (y, z) */
	const stud = (k) => {
		const a = phase + k / o.studs * Math.PI * 2;
		return [pcdR * Math.sin(a), pcdR * Math.cos(a)];
	};
	const ks = Array.from({ length: o.studs }, (_, k) => k);
	const nuts = GEO.merge(ks.map((k) => hex([
		faceX,
		stud(k)[0],
		stud(k)[1]
	], [
		1,
		0,
		0
	], .0115, .02)));
	const studs = GEO.merge(ks.map((k) => cyl([
		et - .02,
		stud(k)[0],
		stud(k)[1]
	], [
		faceX + .026,
		stud(k)[0],
		stud(k)[1]
	], .0065, 8)));
	const cap = o.rim === "alloy" ? latheX([
		[0, faceX - .004],
		[.032, faceX - .004],
		[.031, faceX + .004],
		[.022, faceX + .009],
		[0, faceX + .01]
	], 32) : latheX([
		[0, et + .004],
		[.052, et + .004],
		[.05, et + .016],
		[.038, et + .03],
		[.018, et + .037],
		[0, et + .039]
	], 40);
	wheel.add(tyre, m(rimGeo, o.rimMat ?? (o.rim === "alloy" ? M.rimAlloy : M.rimSteel)), m(nuts, M.chrome), m(studs, M.zinc), m(cap, o.capMat ?? M.chrome));
	const rimIn = Math.round(size.rim * 2 / .0254);
	kit.part(wheel, {
		id: `wheel-${o.id}`,
		label: `Wheel and tyre, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: `A ${size.code} tyre on a ${o.rim === "alloy" ? "cast-alloy" : "pressed-steel"} ${rimIn}" rim, held on the hub by ${o.studs} nuts: its beads sit on the rim's seats, its air carries the load, its tread grips the road.`,
		moves: o.steers ? "Rolls with the road and steers with the knuckle (shown turning 10 times slower)." : "Rolls with the road (shown turning 10 times slower).",
		drive: o.drive ?? "The road; its brake stops it",
		specs: [
			["Tyre", size.code],
			["Outer diameter", `${Math.round(size.r * 2e3)} mm`],
			["Rim", `${rimIn}" × ${(o.rimW / .0254).toFixed(1)}", ${o.studs} studs on ${Math.round(o.pcd * 1e3 * 10) / 10} mm`],
			...o.specs ?? []
		]
	}, {
		explode: [
			.42,
			0,
			0
		],
		tag: o.tag
	}, steer);
	const brake = new three.Group();
	const hubFlange = latheX([
		[.03, et - .006],
		[.082, et - .006],
		[.082, et - .018],
		[.05, et - .022],
		[.05, et - .06],
		[.03, et - .06]
	], 40);
	brake.add(m(hubFlange, M.forged));
	/** @type {THREE.BufferGeometry | null} */
	let back = null;
	if (o.brake === "disc" && o.disc) {
		const d = discGeometry({
			r: o.disc.r,
			rIn: o.disc.rIn,
			t: o.disc.t,
			hat: .042
		});
		brake.add(m(d.rings.translate(et - .006, 0, 0), M.disc), m(d.hat.translate(et - .006, 0, 0), M.castIron));
	} else if (o.drum) {
		const d = drumGeometry(o.drum);
		brake.add(m(d.drum.translate(et - .006, 0, 0), M.castIron));
		back = d.back.translate(et - .006, 0, 0);
	}
	kit.part(brake, o.brake === "disc" && o.disc ? {
		id: `brake-${o.id}`,
		label: `Brake disc, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A vented cast-iron disc bolted to the hub between it and the wheel: the calliper squeezes it, and its vanes pump air through it to carry the heat away.",
		moves: "Turns with the wheel.",
		drive: "The wheel; the calliper stops it",
		specs: [["Diameter", `${Math.round(o.disc.r * 2e3)} mm`], ["Thickness", `${Math.round(o.disc.t * 1e3)} mm, vented`]]
	} : {
		id: `brake-${o.id}`,
		label: `Brake drum, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A finned cast-iron drum on the hub: two shoes inside it, pushed out by the wheel cylinder, rub on its inner face. Cheap, sealed from the dust and good for a handbrake.",
		moves: "Turns with the wheel.",
		drive: "The wheel; its shoes stop it",
		specs: [["Diameter", `${Math.round((o.drum?.r ?? 0) * 2e3)} mm`], ["Width", `${Math.round((o.drum?.depth ?? 0) * 1e3 - 15)} mm shoes`]]
	}, { explode: [
		.22,
		0,
		0
	] }, steer);
	const still = new three.Group();
	if (o.brake === "disc" && o.disc) {
		const cal = calliperGeometry({
			r: o.disc.r,
			t: o.disc.t,
			angle: Math.PI * .9
		}).translate(et - .048, 0, 0);
		still.add(m(cal, M.calliper));
		still.add(m(hose([
			[
				et - .08,
				.06,
				-.12
			],
			[
				et - .13,
				.12,
				-.08
			],
			[
				et - .16,
				.2,
				-.04
			]
		], .0045, 8), M.boot));
	} else if (back) still.add(m(back, M.castIron), m(hose([
		[
			et - .1,
			o.drum ? o.drum.r * .72 : .1,
			0
		],
		[
			et - .16,
			.12,
			.03
		],
		[
			et - .2,
			.13,
			.06
		]
	], .003, 6), M.zinc));
	kit.part(still, o.brake === "disc" ? {
		id: `calliper-${o.id}`,
		label: `Brake calliper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A floating calliper over the disc’s back edge: the brake fluid pushes its piston, which presses the inner pad on the disc and pulls the outer pad on from the other side.",
		specs: [["Pistons", "2 × Ø 51 mm [inferred]"], ["Pads", "Semi-metallic"]]
	} : {
		id: `calliper-${o.id}`,
		label: `Backing plate, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The pressed-steel plate that closes the drum: it carries the two shoes, their springs, the wheel cylinder and the handbrake’s lever, bolted to the axle’s end.",
		specs: [["Wheel cylinder", "Ø 22 mm [inferred]"], ["Handbrake", "Cable, on these shoes"]]
	}, { explode: [
		.14,
		.12,
		0
	] }, steer);
	if (o.steers) {
		const k = knuckleGeometry({
			et,
			arm: o.arm ?? -1
		});
		kit.part(new three.Group().add(m(k.body, M.castIron), m(k.balls, M.forged)), {
			id: `knuckle-${o.id}`,
			label: `Steering knuckle, ${o.label}`,
			assembly: o.assembly,
			source: o.source,
			what: "The cast upright between the two wishbones’ ball joints: it carries the hub’s bearings on its spindle, the calliper on its bracket, and turns about the line through its ball joints (the kingpin axis) when the tie rod pulls its steering arm.",
			moves: "Steers about its ball joints; rides up and down with the wheel.",
			drive: "The tie rod, from the steering",
			specs: [["Material", "Nodular cast iron [inferred]"], ["Steering lock", "±38° [inferred]"]]
		}, { explode: [
			.08,
			0,
			0
		] }, steer);
	}
	/** the joints of its knuckle, in the frame `corner` hangs in */
	const joint = (p) => [
		o.at[0] + o.side * p[0],
		o.at[1] + p[1],
		o.at[2] + p[2]
	];
	return {
		corner,
		steer,
		wheel,
		brake,
		joints: {
			upper: joint(KNUCKLE.upper),
			lower: joint(KNUCKLE.lower),
			tie: joint([
				KNUCKLE.tie[0],
				KNUCKLE.tie[1],
				-(o.arm ?? -1) * KNUCKLE.tie[2]
			])
		},
		/** roll it to `turn` (rad, forward positive) and steer it `steerAngle` (rad, to the left positive) @param {number} turn @param {number} [steerAngle] */
		set(turn, steerAngle = 0) {
			wheel.rotation.x = brake.rotation.x = turn;
			steer.rotation.y = steerAngle * o.side;
		}
	};
}
/**
//#piece bef693e76dd3b78d63e01893dc9b3c4276a5960cb2a1e02093bdd42a67772e93
//#piece c2f34185718247fa47625a330eb29a7decff5a481aba9a4924236facfb4ffa4c
