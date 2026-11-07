* A telescopic damper, with a coil spring round it if `coil` is given: its body's eye at `a`, its rod's eye at `b`;
* `set(a, b)` re-aims it and slides the rod in or out (both points in its parent's frame). Built along +y.
* @param {{ body: number, rod: number, rBody: number, rRod?: number, coil?: { R: number, wire: number, turns: number, seat: number }, M: VehicleMats, mesh: Kit['mesh'] }} o
*/
function telescope({ body, rod, rBody, rRod = .009, coil, M, mesh }) {
	const coilGeo = coilOf;
	const group = new three.Group();
	const eye = (y) => new three.TorusGeometry(.016, .006, 8, 16).rotateY(Math.PI / 2).translate(0, y, 0);
	const bodyG = GEO.merge([GEO.lathe([
		[0, .014],
		[rBody, .014],
		[rBody, body],
		[rBody * .6, body + .008],
		[0, body + .008]
	], 24), eye(0)]);
	group.add(mesh(bodyG, M.damper));
	const top = new three.Group();
	top.add(mesh(GEO.merge([GEO.lathe([
		[0, -rod],
		[rRod, -rod],
		[rRod, -.012],
		[0, -.012]
	], 16), eye(0)]), M.rod));
	/** @type {THREE.Mesh | null} */
	let spring = null;
	if (coil) {
		top.add(mesh(GEO.lathe([
			[rRod, -.026],
			[coil.R + .012, -.026],
			[coil.R + .012, -.018],
			[rRod, -.018]
		], 32), M.zinc));
		group.add(mesh(GEO.lathe([
			[rBody, coil.seat - .004],
			[coil.R + .012, coil.seat - .004],
			[coil.R + .012, coil.seat + .004],
			[rBody, coil.seat + .004]
		], 32), M.zinc));
		spring = mesh(coilGeo(coil.R, coil.wire, coil.turns, 1, 110, 6), M.spring);
		spring.position.y = coil.seat + .004;
		group.add(spring);
	}
	group.add(top);
	const A = new three.Vector3(), B = new three.Vector3(), up = new three.Vector3(0, 1, 0);
	return {
		group,
		/** @param {V3} a @param {V3} b */
		set(a, b) {
			A.set(...a);
			B.set(...b);
			group.position.copy(A);
			const L = A.distanceTo(B);
			group.quaternion.setFromUnitVectors(up, B.clone().sub(A).normalize());
			top.position.y = L;
			if (spring && coil) spring.scale.y = Math.max(.05, L - .026 - (coil.seat + .004));
			return L;
		}
	};
}
/**
//#piece 0b5e170508ab3e9181de9fcb7a6a0d38e4e037558f4c595ac56f26298b82f402
//#piece 96935b57412e787788329f554fbb5f85d0c8e7d57e450f2aa4c6c1e2f1724a84
//#piece 56c87e76ed6fb0fd0c180cf829ba7023815d2c9ba7249b55b126764572e6a415
*/
//#piece e387eb29ae358b7cb79047190288800f3591edcb5fba122396d6e4cdd9021a95
//#piece df84eb6d47fcd13ddb636a52be863ee18f7cc2d237c7391ca64aef41bbed44f9
//#piece 13189bb3ab0573e62433528a2d9deb1bf1d691188a8937c1e5bcb1de80c662e8
				s.rpm = approach(s.rpm, 0, .12, h);
//#piece d016ea2236aa605992e6cbe6c5d1f35a4839c11affdcc490ab0603f1f9e52f31
			const Fd = Te >= 0 ? Te * i * V.eta / V.r : Te * i / (V.eta * V.r);
//#piece b9abd13e2a5dc4401a2e24ed6e5dc2fd33a338b5696d3802e742e6b5190089a0
//#piece 9c3694ddf6f5e0683589d520b699b33ed21e127a3be2993afb6684ae3627a3dd
				s.running = false;
				s.why = lugged ? "lugged" : "pull";
				s.need = rl.F;
				s.can = fMax(1, s.v);
//#piece de88bfc1c240b5abb3789cdda729b3e434422bacffab4ee34f2af90ee0f6b4f0
		const indicated = s.stalled || overrun ? 0 : Math.max(0, s.Te + tfric(s.rpm)) * w;
//#piece 60337803e8aedcd37f9676cfc4cc4a4f4e15896185c45654b17e0a7026343da6
//#piece 32958d6a67b7eb4fab0c8134dd1ef89ca2389389cc3527ef87741fb4ad52ddd7
//#piece 3ae9d3e2ac1768aed32d99aa64a157ee7e820feaea09b6b606202030978cbcf4
//#piece f92deed61692c699889e08b2617ef8ef761afada314c20930f42e862a57a925b
}
/**
* A ladder frame: two box-section rails along z through their centre line's (z, y) points, kicked up where the points
* rise (over an axle), joined by tubular crossmembers.
* @param {{ x: number, w: number, h: number, t: number, path: V2[], cross: number[], rCross?: number }} o the rails'
*   middles at ±x, each w wide, h deep, its wall t; its path [z, y] front to back; the crossmembers' z
*/
function ladderFrame({ x, w, h, t, path, cross, rCross = .036 }) {
	const sec = rrect(w, h, .008);
	sec.holes.push(roundHole([
		[-w / 2 + t, -h / 2 + t],
		[w / 2 - t, -h / 2 + t],
		[w / 2 - t, h / 2 - t],
		[-w / 2 + t, h / 2 - t]
	], .004));
	/** @type {THREE.BufferGeometry[]} */
	const out = [];
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
		for (const sx of [-1, 1]) out.push(plate(sec, L + h * .25, 4).rotateX(-a).translate(sx * x, (y0 + y1) / 2, (z0 + z1) / 2));
	}
	for (const z of cross) out.push(GEO.tube(rCross, rCross - .004, 2 * x - w + .004, 20).rotateZ(Math.PI / 2).translate(0, frameY(path, z), z));
	return GEO.merge(out);
}
/** the height of a frame's rails at z, along its path @param {V2[]} path @param {number} z */
function frameY(path, z) {
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		if ((z - z0) * (z - z1) <= 0) return z0 === z1 ? y0 : y0 + (y1 - y0) * (z - z0) / (z1 - z0);
	}
	return path[z > path[0][0] ? 0 : path.length - 1][1];
}
/** the engine room's palette */
function engineMaterials() {
	return {
		block: MAT.castIron({ color: [
			.2,
			.21,
			.22
		] }),
		head: MAT.aluminium({
			color: [
				.72,
				.73,
				.74
			],
			roughness: .48
		}),
		cover: MAT.paint({
			color: [
				.035,
				.035,
				.04
			],
			roughness: .5,
			clearcoat: .2
		}),
		pan: MAT.paint({
			color: [
				.045,
				.045,
				.05
			],
			roughness: .55,
			clearcoat: .1
		}),
		piston: MAT.aluminiumMachined({
			roughness: .3,
			color: [
				.78,
				.78,
				.77
			]
		}),
//#piece 21252527f524e2b4645e7526fcc7954d596ed975c2d60c538d423c5b32986034
		belt: MAT.rubber({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .7
		}),
		plastic: MAT.plastic({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .5
		}),
		alloy: MAT.aluminium({
			color: [
				.74,
				.75,
				.76
			],
			roughness: .42
		}),
		line: MAT.steel({
			color: [
				.62,
				.62,
				.63
			],
			roughness: .3
		}),
		manifold: MAT.castIron({
			color: [
				.26,
				.17,
				.12
			],
			roughness: .78
		}),
		oil: MAT.fluid({
			color: [
				.36,
				.2,
				.04
			],
			roughness: .06
		}),
		filter: MAT.paint({
			color: [
				.04,
				.1,
				.32
			],
			roughness: .4
		}),
		black: MAT.paint({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .45,
			clearcoat: .2
		}),
		copper: MAT.copper({ roughness: .35 }),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		friction: MAT.ceramic({
			color: [
				.22,
				.2,
				.17
			],
			roughness: .92
		}),
		hot: MAT.steel({
			color: [
				.42,
				.39,
				.36
			],
			roughness: .55,
			finish: "cast"
		}),
		hose: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		})
	};
}
/** @typedef {ReturnType<typeof engineMaterials>} EngineMats */
/**
* @typedef {object} EngineOptions
* @property {THREE.Object3D} parent @property {V3} at the crank's middle, in `parent`
* @property {number} bore @property {number} stroke @property {number} rod @property {number} pitch the bores' spacing (m)
* @property {boolean} [turbo] a turbocharger on the exhaust manifold
* @property {number} [compression] its compression ratio (22 unless said), for the head's card
* @property {boolean} [fan] an engine-driven fan on the water pump (else the radiator has its own)
* @property {'front' | 'rear'} [well] which end of the sump its deep well is at
* @property {number[]} gears the gearbox's ratios, first to top
* @property {V3} lever the gear knob (in the engine's frame)
* @property {[V3, V3]} mounts where the two mounts' rubbers sit on the frame (in the engine's frame)
* @property {V3} rearMount where the gearbox's mount sits on its crossmember (in the engine's frame)
* @property {string} assembly @property {string} gearAssembly @property {string} [source]
* @property {string} name what to call it on its cards ("2.4 L diesel")
* @property {[string, string][]} specs the engine's numbers, for the block's card
* @property {EngineMats} M
* @property {() => string} [tag] the engine's label @property {() => string} [gearTag] the gearbox's
*/
/**
* A four-cylinder inline diesel and its gearbox, each part a mechanic would name as its own solid: the block with its
* bores through it, the head, the camshaft and valves under the cover, the crankshaft with its counterweights, the
* pistons on their rods, the flywheel and clutch, the sump with its oil, the timing belt under its cover, the
* accessory belt over the pulleys of the water pump and alternator, the injection pump and its four lines, the
* manifolds, the starter, the oil filter, the mounts; then the bellhousing and the gearbox with its shafts and gears
* inside, and the lever. In the engine's frame: the crank along z through the origin, the timing end at +z.
* @param {Kit} kit @param {EngineOptions} o
*/
function inlineEngine(kit, o) {
	const { M } = o;
	const r = o.stroke / 2, L = o.rod, p = o.pitch, R = o.bore / 2, n = 4;
	const ch = .05;
	const deck = r + L + ch;
	const lb = n * p / 2 + .02;
	const bw = o.bore + .09;
	const yb = deck - o.stroke - .05;
	const pan = -.075;
	const zc = (i) => (3 / 2 - i) * p;
	const phase = (i) => i === 0 || i === 3 ? 0 : Math.PI;
//#piece 46041926fd60aabb38b5fbd2603e07bdff108552b97b545dfc0a23e1794e663c
	const spin = () => new three.Group();
	const litres = (n * Math.PI * R * R * o.stroke * 1e3).toFixed(2);
	{
		const top = rrect(bw, 2 * lb, .012);
		for (let i = 0; i < n; i++) top.holes.push(circle(0, -zc(i), R));
		/** @type {THREE.BufferGeometry[]} */
		const g = [onY(plate(top, deck - yb, 28), (deck + yb) / 2)];
		for (const sx of [-1, 1]) {
			const s = new three.Shape();
			s.moveTo(sx * (bw / 2 - .012), yb + .004);
			s.lineTo(sx * (bw / 2), yb + .004);
			s.lineTo(sx * (bw / 2 + .03), pan);
			s.lineTo(sx * (bw / 2 + .018), pan);
			s.closePath();
			g.push(plate(s, 2 * lb, 2));
			g.push(at(box(.03, .07, .09, .006), sx * (bw / 2 + .03), .06, .02));
		}
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			const s = rrect(bw + .03, yb - pan, .004, 0, (yb + pan) / 2);
			s.holes.push(circle(0, 0, .033));
			g.push(plate(s, .022, 20).translate(0, 0, z));
		}
		const rail = rrect(bw + .08, 2 * lb, .01);
		rail.holes.push(rrect(bw + .02, 2 * lb - .03, .006));
		g.push(onY(plate(rail, .012, 6), -.06899999999999999));
		part({
			id: "block",
			label: `Cylinder block, ${o.name}`,
			what: `The cast-iron block: four ${Math.round(o.bore * 1e3)} mm bores bored through its deck, water round them, the crankcase under them with five bulkheads that carry the crankshaft’s main bearings. Everything else on the engine bolts to it.`,
			specs: [["Displacement", `${litres} L (${Math.round(o.bore * 1e3)} × ${Math.round(o.stroke * 1e3)} mm)`], ...o.specs]
		}, [m(GEO.merge(g), M.block)], {
			explode: [
				0,
				0,
				0
			],
			tag: o.tag ? {
				text: o.name,
				at: [
					bw / 2 + .03,
					deck - .05,
					0
				],
				value: o.tag,
				side: "right"
			} : void 0
		});
	}
	part({
		id: "head",
		label: "Cylinder head",
		what: "The aluminium head closing the bores: its ports, the valves’ seats and guides, the camshaft’s bearings and the injectors’ wells; held down on its gasket by ten long bolts.",
		specs: [
			["Material", "Cast aluminium alloy"],
			["Valves", "2 a cylinder, 8 in all"],
			["Compression", `${o.compression ?? 22} : 1 [inferred]`]
		]
	}, [m(at(box(bw + .02, .1, 2 * lb, .008), 0, deck + .054, 0), M.head), m(at(slab(bw + .01, .004, 2 * lb - .01), 0, deck + .002, 0), M.copper)], { explode: [
		0,
		.2,
		0
	] });
	part({
		id: "cam-cover",
		label: "Cam cover",
		what: "The pressed cover over the camshaft and valves, keeping their oil in; its cap is where the oil goes in.",
		specs: [["Material", "Pressed steel, painted"]]
	}, [m(at(box(bw - .008, .07, 2 * lb - .02, .026), 0, deck + .139, 0), M.cover), m(cyl([
		0,
		deck + .172,
		lb - .08
	], [
		0,
		deck + .19,
		lb - .08
	], .024, 24), M.yellow)], {
		explode: [
			0,
			.42,
			0
		],
		xray: "shell"
	});
	const cam = spin();
	{
		const lobe = new three.Shape();
		lobe.absarc(0, 0, .019, Math.PI * .15, Math.PI * .85, true);
		lobe.lineTo(0, .03);
		lobe.closePath();
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			0,
			0,
			-lb + .01
		], [
			0,
			0,
			lb + .03
		], .012, 14)];
		for (let i = 0; i < n; i++) for (const [dz, ph] of [[.022, 0], [-.022, 1.6]]) g.push(ext(lobe, .014, .001, 6).rotateZ(-phase(i) / 2 - ph - i * .9).translate(0, 0, zc(i) + dz));
		cam.add(m(GEO.merge(g), M.crank));
		cam.position.set(0, deck + .13, 0);
		const valves = [];
		for (let i = 0; i < n; i++) for (const dz of [.022, -.022]) {
			valves.push(m(GEO.merge([
				cyl([
					0,
					deck + .004,
					zc(i) + dz
				], [
					0,
					deck + .1,
					zc(i) + dz
				], .0035, 8),
				latheZ([
					[0, 0],
					[.016, 0],
					[.016, .003],
					[.004, .012],
					[0, .012]
				], 12).rotateX(-Math.PI / 2).translate(0, deck + .001, zc(i) + dz),
				cyl([
					0,
					deck + .098,
					zc(i) + dz
				], [
					0,
					deck + .111,
					zc(i) + dz
				], .016, 10)
			]), M.gear));
			valves.push(m(coil(.012, .0022, 6, .055, 40, 5).translate(0, deck + .042, zc(i) + dz), M.black));
		}
		part({
			id: "camshaft",
			label: "Camshaft and valves",
			what: "One overhead camshaft, turned by the timing belt at half the crank’s speed: its lobes push the eight valves open through their buckets, their springs close them.",
			moves: "Turns at half the crank’s speed (shown 40 times slower).",
			drive: "The timing belt",
			specs: [["Valves", "8, 2 a cylinder"], ["Drive", "Toothed belt, 2 : 1"]]
		}, [cam, ...valves], { explode: [
			0,
			.3,
			0
		] });
	}
	const crank = spin();
	{
		const web = new three.Shape();
		web.moveTo(.0733, -.0267);
		web.lineTo(.036, r);
		web.absarc(0, r, .036, 0, Math.PI, false);
		web.lineTo(-.0733, -.0267);
		web.absarc(0, 0, .078, 200 * Math.PI / 180, 340 * Math.PI / 180, false);
		const g = [];
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			g.push(cyl([
				0,
				0,
				z - .014
			], [
				0,
				0,
				z + .014
			], .03, 16));
		}
		for (let i = 0; i < n; i++) {
			const ph = phase(i), px = r * Math.sin(ph), py = r * Math.cos(ph);
			g.push(cyl([
				px,
				py,
				zc(i) - .017
			], [
				px,
				py,
				zc(i) + .017
			], .028, 16));
			for (const s of [-1, 1]) g.push(ext(web, .018, .0015, 6).rotateZ(-ph).translate(0, 0, zc(i) + s * .026));
		}
		g.push(cyl([
			0,
			0,
			lb - .012
		], [
			0,
			0,
			lb + .1
		], .022, 20), cyl([
			0,
			0,
			-lb + .012
		], [
			0,
			0,
			-lb - .02
		], .05, 28));
		crank.add(m(GEO.merge(g), M.crank));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			what: "The forged crankshaft on its five main bearings: its four pins, two up and two down, turn the pistons’ push into torque; the counterweights opposite them balance it.",
			moves: "Turns at the engine’s speed (shown 40 times slower).",
			drive: "The pistons, through the rods",
			specs: [
				["Stroke", `${Math.round(o.stroke * 1e3)} mm`],
				["Main bearings", "5"],
				["Firing order", "1-3-4-2"]
			]
		}, [crank], { explode: [
			0,
			-.45,
			0
		] });
	}
	/** @type {THREE.Group[]} */
	const pistons = [];
	/** @type {THREE.Group[]} */
	const rods = [];
	{
		const Rp = R - 5e-4;
		/** @type {V2[]} */
		const prof = [
			[0, .042],
			[R * .3, .033],
			[R * .56, .048],
			[Rp, ch]
		];
		for (const y of [.041, .031000000000000003]) prof.push([Rp, y], [Rp - .003, y], [Rp - .003, y - .002], [Rp, y - .002]);
		prof.push([Rp, -.035], [R - .006, -.035], [R - .006, .020000000000000004], [0, .020000000000000004]);
		const pg = latheY(prof, 24);
		const pin = cyl([
			-(R - .004),
			0,
			0
		], [
			R - .004,
			0,
			0
		], .0135, 16);
		const rod = new three.Shape();
		const R1 = .045, R2 = .022, wb = .016, wt = .01;
		const y1 = Math.sqrt(R1 * R1 - wb * wb), y2 = L - Math.sqrt(R2 * R2 - wt * wt);
		rod.moveTo(wb, y1);
		rod.absarc(0, 0, R1, Math.atan2(y1, wb), Math.atan2(y1, -.016), true);
		rod.lineTo(-.01, y2);
		rod.absarc(0, L, R2, Math.atan2(y2 - L, -.01), Math.atan2(y2 - L, wt), true);
		rod.closePath();
		rod.holes.push(circle(0, 0, .0285), circle(0, L, .0137));
		const rodG = GEO.merge([
			ext(rod, .024, .0015, 7),
			cyl([
				.033,
				-.03,
				0
			], [
				.033,
				.012,
				0
			], .006, 8),
			cyl([
				-.033,
				-.03,
				0
			], [
				-.033,
				.012,
				0
			], .006, 8)
		]);
		for (let i = 0; i < n; i++) {
			const pis = new three.Group();
			pis.add(m(pg, M.piston), m(pin, M.crank));
//#piece d9d2639ed618803425f71eb41e3962bdc2d961cfa7d05bdf7c90dbf9850888d0
			count: 4,
			what: "Four cast-aluminium pistons, the combustion bowl in each crown where the fuel is sprayed, three rings sealing them in their bores; each pushed down by its burning charge.",
			moves: "Up and down their bores (shown 40 times slower).",
			drive: "The burning charge; they drive the rods",
			specs: [["Diameter", `${Math.round(o.bore * 1e3)} mm`], ["Rings", "2 compression, 1 oil"]]
		}, pistons, { explode: [
			0,
			.62,
			0
		] });
		part({
			id: "rods",
			label: "Connecting rods",
			count: 4,
			what: "Forged steel I-section rods from each piston’s pin to its crank pin, their big ends split and bolted round the pins on shell bearings.",
			moves: "Swing and slide with the pistons.",
			drive: "The pistons; they drive the crankshaft",
			specs: [["Length", `${Math.round(L * 1e3)} mm between centres`]]
		}, rods, { explode: [
			0,
			.52,
			0
		] });
	}
	const fly = spin();
	const clutchSpin = spin();
	fly.add(m(GEO.merge([latheZ([
		[.05, 0],
		[.15, 0],
		[.15, -.03],
		[.11, -.03],
		[.11, -.018],
		[.05, -.018]
	], 48), spurGeometry({
		r: .163,
		width: .018,
		module: .008,
		bore: .148
	}).translate(0, 0, -.012)]), M.gear));
	fly.position.z = -lb - .02;
	part({
		id: "flywheel",
		label: "Flywheel",
		what: "A heavy steel disc on the crank’s back end: it carries the engine through the strokes between firings and is the clutch’s friction face; the starter turns its ring gear.",
		moves: "Turns with the crankshaft.",
		specs: [["Ring gear", "60 teeth [inferred]"]]
	}, [fly], { explode: [
		0,
		0,
		-.32
	] });
	clutchSpin.add(m(GEO.merge([GEO.shell([
		[.14, 0],
		[.14, -.022],
		[.06, -.034]
	], .004, 40).rotateX(Math.PI / 2)]), M.gear), m(latheZ([
		[.075, .002],
		[.122, .002],
		[.122, -.006],
		[.075, -.006]
	], 40), M.friction));
	clutchSpin.position.z = -lb - .054;
	part({
		id: "clutch",
		label: "Clutch",
		what: "A friction disc pressed against the flywheel by the cover’s diaphragm spring: it passes the engine’s torque to the gearbox, and slips to let the vehicle pull away.",
		moves: "Turns with the flywheel; slips while it pulls away.",
		drive: "The pedal, through its cable and release bearing",
		specs: [["Disc", "Ø 240 mm, dry single plate [inferred]"]]
	}, [clutchSpin], { explode: [
		0,
		0,
		-.5
	] });
	{
		const sw = bw + .05, deep = o.well === "front" ? 1 : -1;
		const ring = (w, l, t) => {
			const s = rrect(w, l, .025);
			s.holes.push(rrect(w - 2 * t, l - 2 * t, .02));
			return s;
		};
		const half = lb - .01, z0 = deep * half / 2;
		const g = [
			onY(plate(ring(sw, 2 * half, .003), .06, 8), -.105),
			onY(plate(rrect(sw, half, .025), .003, 8), -.135).translate(0, 0, -z0),
			onY(plate(ring(sw, half, .003), .1, 8), -.185).translate(0, 0, z0),
			onY(plate(rrect(sw, half, .025), .003, 8), -.235).translate(0, 0, z0),
			cyl([
				0,
				-.235,
				z0
			], [
				0,
				-.247,
				z0
			], .01, 6)
		];
		part({
			id: "sump",
			label: "Sump",
			what: "The pressed-steel oil pan under the crankcase, deep at one end where the pump’s pickup draws the oil; its drain plug at the bottom.",
			specs: [["Oil", "6.5 L, 15W-40 [inferred]"]]
		}, [m(GEO.merge(g), M.pan), m(at(box(sw - .01, .07, half - .01, .01), 0, -.197, z0), M.oil)], {
			explode: [
				0,
				-.3,
				0
			],
			xray: "shell"
		});
	}
	const tCrank = spin(), tCam = spin(), tPump = spin();
	const pumpXY = [bw / 2 + .06, .1];
	{
		const cs = [
			[
				0,
				0,
				.03
			],
			[
				0,
				deck + .13,
				.06
			],
			[
				pumpXY[0],
				pumpXY[1],
				.06
			]
		];
		const zt = lb + .022;
		const cover = ext(beltShape(cs, .024), .032, .003, 8).translate(0, 0, zt + .006);
		tCrank.add(m(spurGeometry({
			r: .03,
			width: .024,
			module: .004,
			bore: .022
		}), M.gear));
		tCam.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tPump.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tCrank.position.set(0, 0, zt);
		tCam.position.set(0, deck + .13, zt);
		tPump.position.set(pumpXY[0], pumpXY[1], zt);
		part({
			id: "timing",
			label: "Timing belt and cover",
			what: "A toothed belt from the crank to the camshaft and the injection pump, both turning at half the crank’s speed so each valve and each squirt of fuel comes at its stroke; under its plastic cover.",
			moves: "The belt runs round its three sprockets.",
			drive: "The crankshaft",
			specs: [["Belt", "Toothed, 25 mm wide [inferred]"], ["Change", "Every 100,000 km [inferred]"]]
		}, [
			tCrank,
			tCam,
			tPump,
			m(beltGeometry(cs, .006, .025).translate(0, 0, zt), M.belt),
			m(cover, M.plastic)
		], { explode: [
			0,
			.12,
			.38
		] });
	}
	const aCrank = spin(), aPump = spin(), aAlt = spin();
	const wpXY = [-.03, .2], altXY = [-(bw / 2 + .09), .09];
	const za = lb + .08;
	{
		const groove = (rr, w) => latheZ([
			[.02, -w / 2],
			[rr, -w / 2],
			[rr - .006, 0],
			[rr, w / 2],
			[.02, w / 2]
		], 40);
		aCrank.add(m(GEO.merge([groove(.075, .022), latheZ([
			[.02, .011],
			[.06, .011],
			[.06, .03],
			[.02, .03]
		], 40)]), M.black));
		aPump.add(m(groove(.055, .022), M.black));
		aAlt.add(m(groove(.032, .02), M.gear));
		aCrank.position.set(0, 0, za);
		aPump.position.set(wpXY[0], wpXY[1], za);
		aAlt.position.set(altXY[0], altXY[1], za);
		const cs = [
			[
				0,
				0,
				.073
			],
			[
				wpXY[0],
				wpXY[1],
				.053
			],
			[
				altXY[0],
				altXY[1],
				.03
			]
		];
		const pumpBody = GEO.merge([cyl([
			wpXY[0],
			wpXY[1],
			lb + .04
		], [
			wpXY[0],
			wpXY[1],
			za - .01
		], .022, 16), at(box(.1, .1, .03, .01), wpXY[0], wpXY[1] - .02, lb + .045)]);
		part({
			id: "accessory-drive",
			label: "Accessory belt and water pump",
			what: "A V-belt from the crank’s pulley (its damper behind) round the water pump’s and the alternator’s: the pump drives the coolant through the block, the head and the radiator.",
			moves: "The belt and pulleys turn with the engine.",
			drive: "The crankshaft",
			specs: [["Belt", "V-belt, 10 mm [inferred]"], ["Water pump", "Centrifugal, ~120 L/min at 4,000 rpm [inferred]"]]
		}, [
			aCrank,
			aPump,
			m(beltGeometry(cs, .008, .012).translate(0, 0, za), M.belt),
			m(pumpBody, M.alloy)
		], { explode: [
			0,
			.06,
			.6
		] });
		part({
			id: "alternator",
			label: "Alternator",
			what: "Turned by the belt at about 2.5 times the crank’s speed, it charges the battery and runs the lights.",
			moves: "Its rotor and pulley turn with the belt.",
			drive: "The accessory belt",
			specs: [["Output", "14 V, 70 A [inferred]"]]
		}, [m(GEO.merge([latheZ([
			[0, -.11],
			[.058, -.11],
			[.062, -.09],
			[.062, -.02],
			[.05, 0],
			[0, 0]
		], 32).translate(altXY[0], altXY[1], za - .016), at(box(.03, .05, .04, .004), altXY[0] + .05, altXY[1] - .04, za - .08)]), M.alloy), aAlt], { explode: [
			-.3,
			0,
			.3
		] });
		if (o.fan) {
			const fan = spin();
			fan.add(m(GEO.rotor({
				count: 7,
				axis: "z",
				r0: .055,
				r1: .2,
				chord: [.05, .065],
				thick: .06,
				camber: .08,
				twist: .4,
				pitch: .45,
				nS: 5,
				nC: 7
			}), M.plastic), m(latheZ([
				[0, 0],
				[.06, 0],
				[.065, .02],
				[.06, .045],
				[0, .045]
			], 32).translate(0, 0, -.045), M.alloy));
			fan.position.set(wpXY[0], wpXY[1], za + .06);
			aPump.userData.fan = fan;
			part({
				id: "fan",
				label: "Fan and viscous coupling",
				what: "Seven plastic blades on the water pump’s hub through a viscous coupling: it pulls air through the radiator, slipping when the air is cool.",
				moves: "Turns with the water pump.",
				drive: "The water pump",
				specs: [["Diameter", "400 mm [inferred]"]]
			}, [fan], { explode: [
				0,
				.1,
				.8
			] });
		}
	}
	{
		const [px, py] = pumpXY, z0 = lb - 0, z1 = lb - .21;
		const body = GEO.merge([
			latheZ([
				[0, 0],
				[.05, 0],
				[.05, -.12],
				[.045, -.13],
				[.045, -.21],
				[0, -.21]
			], 32).translate(px, py, z0),
			at(box(.07, .06, .06, .008), px, py + .055, z0 - .17),
			cyl([
				px,
				py + .08,
				z0 - .06
			], [
				px + .02,
				py + .11,
				z0 - .06
			], .006, 8)
		]);
		const lines = [], inj = [];
		const ix = bw / 2 + .012, iy = deck + .03;
		for (let i = 0; i < n; i++) {
			const sx = px - .02 + i % 2 * .04, sz = z1 + .045 + Math.floor(i / 2) * .03;
			lines.push(hose([
				[
					sx,
					py + .085,
					sz
				],
				[
					sx + .01,
					py + .12,
					sz
				],
				[
					ix + .05,
					iy + 0,
					(sz + zc(i)) / 2
				],
				[
					ix + .035,
					iy,
					zc(i)
				]
			], .003, 6));
			inj.push(cyl([
				ix - .01,
				iy,
				zc(i)
			], [
				ix + .04,
				iy,
				zc(i)
			], .011, 12), hex([
				ix + .012,
				iy,
				zc(i)
			], [
				1,
				0,
				0
			], .014, .012));
		}
		const glow = [];
		for (let i = 0; i < n; i++) glow.push(cyl([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-bw / 2 + .01,
			deck + .025,
			zc(i)
		], .005, 8), hex([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-1,
			0,
			0
		], .007, .008));
		part({
			id: "injection",
			label: "Injection pump, lines and injectors",
			what: "The distributor pump, turned by the timing belt, meters the fuel and squeezes it to some 300 bar into each injector in turn through its own steel line, at the moment its piston comes up on compression; the glow plugs on the other side warm the chambers for a cold start.",
			moves: "Its shaft turns at half the crank’s speed.",
			drive: "The timing belt",
			specs: [
				["Pump", "Rotary distributor [inferred]"],
				["Injection", "Indirect, ~130 bar opening [inferred]"],
				["Glow plugs", "4, 11 V"]
			]
		}, [
			m(body, M.alloy),
			m(GEO.merge(lines), M.line),
			m(GEO.merge(inj), M.gear),
			m(GEO.merge(glow), M.gear)
		], { explode: [
			.36,
			.1,
			0
		] });
	}
	const intakeIn = [
		bw / 2 + .085,
		deck + .09,
		-lb + .02
	];
	let exhaustOut = [
		-(bw / 2 + .065),
		deck - .06,
		-lb + .07
	];
	{
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			bw / 2 + .085,
			deck + .09,
			-lb + .03
		], [
			bw / 2 + .085,
			deck + .09,
			lb - .04
		], .034, 20)];
		for (let i = 0; i < n; i++) g.push(hose([
			[
				bw / 2 + .006,
				deck + .065,
				zc(i)
			],
			[
				bw / 2 + .04,
				deck + .07,
				zc(i)
			],
			[
				bw / 2 + .07,
				deck + .085,
				zc(i)
			]
		], .019, 12));
		part({
			id: "intake",
			label: "Intake manifold",
			what: "The cast-aluminium manifold that shares the air from the filter among the four inlet ports.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge(g), M.alloy)], { explode: [
			.42,
			.2,
			0
		] });
		/** @type {THREE.BufferGeometry[]} */
		const e = [cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .04
		], [
			-(bw / 2 + .065),
			deck + .045,
			lb - .04
		], .03, 20), cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .07
		], [
			-(bw / 2 + .065),
			deck - .05,
			-lb + .07
		], .028, 16)];
		for (let i = 0; i < n; i++) e.push(hose([
			[
				-bw / 2 - .006,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .035,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .06,
				deck + .045,
				zc(i)
			]
		], .019, 12));
		/** @type {THREE.Mesh[]} */
		const parts = [m(GEO.merge(e), M.manifold)];
		if (o.turbo) {
			const tx = -(bw / 2 + .12), ty = deck - .02, tz = -lb + .09;
			parts.push(m(GEO.merge([latheX([
				[0, -.07],
				[.055, -.07],
				[.07, -.05],
				[.07, -.02],
				[.03, -.012],
				[.03, .012],
				[.065, .02],
				[.075, .045],
				[.06, .07],
				[0, .07]
			], 32).translate(tx, ty, tz)]), M.hot));
			parts.push(m(hose([
				[
					tx,
					ty + .07,
					tz
				],
				[
					tx + .02,
					deck + .2,
					tz + .1
				],
				[
					0,
					deck + .22,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .13,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .1,
					lb - .04
				]
			], .028, 14), M.alloy));
			exhaustOut = [
				tx - .02,
				ty - .07,
				tz
			];
		}
		part(o.turbo ? {
			id: "exhaust-manifold",
			label: "Exhaust manifold and turbocharger",
			what: "The cast-iron manifold gathers the four cylinders’ gas into the turbocharger’s turbine; its compressor on the same shaft pushes the air into the intake at up to 0.9 bar.",
			moves: "The turbo’s shaft spins at up to 150,000 rpm (not shown turning).",
			drive: "The exhaust gas",
			specs: [["Boost", "0.9 bar [inferred]"], ["Manifold", "Cast iron"]]
		} : {
			id: "exhaust-manifold",
			label: "Exhaust manifold",
			what: "The cast-iron manifold gathering the four cylinders’ hot gas into the downpipe.",
			specs: [["Material", "Cast iron"], ["Gas", "Up to ~650 °C at full load [inferred]"]]
		}, parts, { explode: [
			-.42,
			.18,
			0
		] });
	}
	{
		part({
			id: "oil-filter",
			label: "Oil filter and dipstick",
			what: "A spin-on full-flow filter that the oil pump pushes all the oil through before the bearings; the dipstick to check its level.",
			specs: [["Filter", "Spin-on, Ø 93 mm [inferred]"]]
		}, [
			m(cyl([
				bw / 2 + .03,
				0,
				-.08
			], [
				bw / 2 + .12,
				-.04,
				-.08
			], .046, 28), M.filter),
			m(hose([
				[
					-bw / 2 - .004,
					.04,
					.05
				],
				[
					-bw / 2 - .03,
					deck - .05,
					.07
				],
				[
					-bw / 2 - .035,
					deck + .13,
					.08
				]
			], .005, 8), M.line),
			m(cyl([
				-bw / 2 - .035,
				deck + .13,
				.08
			], [
				-bw / 2 - .035,
				deck + .15,
				.08
			], .012, 12), M.yellow)
		], { explode: [
			.3,
			-.1,
			0
		] });
		const sx = -.155, sy = -.075;
		part({
			id: "starter",
			label: "Starter motor",
			what: "A 12 V motor on the bellhousing’s flange: its solenoid throws its pinion into the flywheel’s ring gear and it spins the engine to start it.",
			specs: [["Power", "2.2 kW, 12 V [inferred]"]]
		}, [m(GEO.merge([cyl([
			sx,
			sy,
			-lb - .02
		], [
			sx,
			sy,
			-lb + .15
		], .045, 24), cyl([
			-.125,
			-.024999999999999994,
			-lb + 0
		], [
			-.125,
			-.024999999999999994,
			-lb + .11
		], .026, 16)]), M.black)], { explode: [
			-.3,
			-.12,
			0
		] });
	}
	{
		const g = [], rub = [];
		for (const [k, mp] of o.mounts.entries()) {
			const from = [
				(k === 0 ? 1 : -1) * (bw / 2 + .045),
				.06,
				.02
			];
			g.push(cyl(from, [
				mp[0],
				mp[1] + .045,
				mp[2]
			], .012, 10), at(box(.07, .008, .08, .002), mp[0], mp[1] + .05, mp[2]), at(box(.08, .008, .09, .002), mp[0], mp[1] - .004, mp[2]));
			rub.push(cyl([
				mp[0],
				mp[1],
				mp[2]
			], [
				mp[0],
				mp[1] + .046,
				mp[2]
			], .032, 20));
		}
		const rm = o.rearMount;
		g.push(at(box(.12, .008, .07, .002), rm[0], rm[1] + .045, rm[2]), at(box(.14, .008, .08, .002), rm[0], rm[1] - .004, rm[2]));
		rub.push(cyl([
			rm[0],
			rm[1],
			rm[2]
		], [
			rm[0],
			rm[1] + .042,
			rm[2]
		], .035, 20));
		part({
			id: "engine-mounts",
			label: "Engine and gearbox mounts",
			count: 3,
			what: "Rubber blocks between the engine’s brackets and the frame, and under the gearbox’s tail: they carry its weight and its torque and keep its shake out of the body.",
			specs: [["Rubber", "Bonded, ~55 Shore A [inferred]"]]
		}, [m(GEO.merge(g), M.black), m(GEO.merge(rub), M.hose)], { explode: [
			0,
			-.2,
			0
		] });
	}
	const zg = -lb - .2, zt = zg - .32, zo = zt - .16;
	const gin = spin(), glay = spin(), gout = spin(), flange = spin();
	/** @type {{ g: THREE.Group, k: number }[]} */
	const freeGears = [];
	{
		const bell = GEO.shell([
			[.205, -lb - .004],
			[.205, -lb - .03],
			[.175, -lb - .1],
			[.13, -lb - .17],
			[.11, zg]
		], .007, 48).rotateX(Math.PI / 2);
		const flangeR = latheZ([
			[.11, -lb + .002],
			[.215, -lb + .002],
			[.215, -lb - .012],
			[.11, -lb - .012]
		], 48);
		const caseG = GEO.merge([at(box(.2, .25, zg - zt, .03), 0, -.04, (zg + zt) / 2), latheZ([
			[0, zt + .01],
			[.075, zt + .01],
			[.06, zt - .07],
			[.048, zo + .012],
			[0, zo + .012]
		], 32)]);
		const d = .085, c = 1.6;
		const yl = -.085;
		const sh = [cyl([
			0,
			0,
			zg + .05
		], [
			0,
			0,
			zo + .01
		], .016, 12)];
		glay.position.set(0, yl, 0);
		gin.add(m(spurGeometry({
			r: d / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03), M.gear));
		glay.add(m(GEO.merge([cyl([
			0,
			0,
			zg - .01
		], [
			0,
			0,
			zt + .02
		], .014, 12), spurGeometry({
			r: d * c / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03)]), M.gear));
		o.gears.filter((g) => Math.abs(g - 1) > .02).forEach((ig, k) => {
			const rl = d / (1 + ig / c), rm = d - rl, z = zg - .075 - k * .05;
			glay.add(m(spurGeometry({
				r: rl,
				width: .018,
				module: .005
			}).translate(0, 0, z), M.gear));
			const fg = spin();
			fg.add(m(spurGeometry({
				r: rm,
				width: .018,
				module: .005,
				bore: .018
			}), M.gear));
			fg.position.z = z;
			freeGears.push({
				g: fg,
				k: 1 / ig
			});
		});
		gout.add(m(GEO.merge(sh), M.crank));
		flange.add(m(GEO.merge([latheZ([
			[.015, 0],
			[.05, 0],
			[.05, -.012],
			[.015, -.012]
		], 24)]), M.rod));
		flange.position.z = zo;
		part({
			id: "bellhousing",
			label: "Bellhousing",
			assembly: o.gearAssembly,
			what: "The cast-aluminium bell bolted to the block’s back face round the flywheel and clutch, carrying the gearbox and the starter.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge([bell, flangeR]), M.alloy)], {
			explode: [
				0,
				0,
				-.75
			],
			xray: "shell"
		});
		part({
			id: "gearbox",
			label: `Gearbox, ${o.gears.length} speeds`,
			assembly: o.gearAssembly,
			what: `A ${o.gears.length}-speed manual gearbox: the input shaft from the clutch drives the layshaft below it, whose gears turn the gears riding free on the output shaft; the lever slides a synchro collar to lock one of them to the shaft (top gear locks the input to the output straight).`,
			specs: [["Ratios", o.gears.map((g) => g.toFixed(2)).join(" · ")], ["Oil", "2.2 L, 75W-90 [inferred]"]]
		}, [m(caseG, M.alloy)], {
			explode: [
				0,
				0,
				-1
			],
			xray: "shell",
			tag: o.gearTag ? {
				text: "Gearbox",
				at: [
					.1,
					.06,
					(zg + zt) / 2
				],
				value: o.gearTag,
				side: "right"
			} : void 0
		});
		part({
			id: "gear-train",
			label: "Shafts and gears",
			assembly: o.gearAssembly,
			what: "Inside the case: the input shaft and its gear, the layshaft and its cluster, the output shaft with the gears that ride on it, all in constant mesh; the synchro collars between them.",
			moves: "The shafts and gears turn (shown 40 times slower).",
			drive: "The clutch",
			specs: [["Mesh", "Constant, helical in the case [simplified straight here]"]]
		}, [
			gin,
			glay,
			gout,
			...freeGears.map((f) => f.g),
			flange
		], { explode: [
			0,
			-.35,
			-1
		] });
		const lv = o.lever;
		const base = [
			0,
			.09,
			zt + .08
		];
		part({
			id: "gear-lever",
			label: "Gear lever",
			assembly: o.gearAssembly,
			what: "The lever and its rod into the gearbox’s selector: across to pick a gate, forward and back to choose a gear.",
			moves: "Moved by hand; the solver changes gear by itself.",
			specs: [["Pattern", o.gears.length === 5 ? "1-2 · 3-4 · 5-R" : "1-2 · 3-4"]]
		}, [
			m(GEO.merge([cyl(base, lv, .008, 10)]), M.crank),
			m(new three.SphereGeometry(.024, 16, 12).translate(...lv), M.black),
			m(latheY([
				[0, -.01],
				[.04, -.01],
				[.015, .07],
				[0, .07]
			], 20).translate(base[0], base[1], base[2]), M.hose)
		], { explode: [
			0,
			.3,
			-.6
		] });
	}
	return {
		group: E,
		/** points of the engine (in its parent's frame) other things hang on */
		points: {
			out: [
				o.at[0],
				o.at[1],
				o.at[2] + zo - .012
			],
			exhaust: [
				o.at[0] + exhaustOut[0],
				o.at[1] + exhaustOut[1],
				o.at[2] + exhaustOut[2]
			],
			intake: [
				o.at[0] + intakeIn[0],
				o.at[1] + intakeIn[1],
				o.at[2] + intakeIn[2]
			],
			waterOut: [
				o.at[0],
				o.at[1] + deck + .08,
				o.at[2] + lb + .01
			],
			waterIn: [
				o.at[0] + wpXY[0],
				o.at[1] + wpXY[1] - .06,
				o.at[2] + lb + .05
			],
			front: o.at[2] + za + .03
		},
		size: {
			lb,
			deck,
			bw,
			za
		},
		/**
		* Turn it: the crank to `a` (rad, the shown angle), the gearbox's output with the propshaft `ap`.
		* @param {number} a @param {number} ap @param {boolean} [slipping] the clutch slipping (pulling away)
		*/
		update(a, ap, slipping = false) {
			crank.rotation.z = fly.rotation.z = clutchSpin.rotation.z = -a;
			tCrank.rotation.z = aCrank.rotation.z = -a;
			cam.rotation.z = tCam.rotation.z = tPump.rotation.z = -a / 2;
			aPump.rotation.z = -a * 1.36;
			const fan = aPump.userData.fan;
			if (fan) fan.rotation.z = -a * 1.36;
			aAlt.rotation.z = -a * 2.3;
			const ain = slipping ? -a * .6 : -a;
			gin.rotation.z = ain;
			glay.rotation.z = -ain / 1.6;
			for (const f of freeGears) f.g.rotation.z = ain * f.k;
			gout.rotation.z = flange.rotation.z = -ap;
			for (let i = 0; i < n; i++) {
				const t = a + phase(i), px = r * Math.sin(t), py = r * Math.cos(t);
//#piece a33a3cc659812cef08ec4d904970fa03e95673a07ec8381f0f8616bd66b50166
			}
		}
	};
}
//#piece bba437dfc360eeee0711bbf961c64035f45c19ae1ddecc911ead3bd44b0db585
* @typedef {object} WishboneOptions
* @property {string} id @property {string} label
* @property {ReturnType<typeof wheelCorner>} corner its wheel: its ball joints and tie rod's end (in the root's frame)
* @property {THREE.Object3D} body the sprung frame the bushes, the spring's top and the rack are on
* @property {[V3, V3]} upper @property {[V3, V3]} lower each arm's front and rear bushes (in the body's frame)
* @property {V3} top the coilover's top mount (in the body's frame) @property {number} [on] how far out along the lower arm its bottom is
* @property {V3} rack the tie rod's inner end (in the body's frame)
* @property {{ R: number, wire: number, turns: number, k: number }} coil its spring and rate (N/m at the wheel)
* @property {VehicleMats} M @property {string} assembly @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* One side of a double-wishbone front suspension: the upper and lower A-arms from their bushes on the body to the
* knuckle's ball joints, the coilover from the lower arm to its tower, the tie rod from the rack to the steering arm.
* Each leg, rod and damper is re-aimed every moment between where the body has sagged to and where the wheel is.
* @param {Kit} kit @param {WishboneOptions} o
*/
function doubleWishbone(kit, o) {
	const { M } = o;
	const m = (g, mat) => kit.mesh(g, mat);
	const bushG = new three.CylinderGeometry(.024, .024, .055, 16).rotateX(Math.PI / 2);
	const arm = (rr) => {
		const g = new three.Group();
		const a = m(unitBar(rr), M.chassis), b = m(unitBar(rr), M.chassis), s = [m(bushG, M.bush), m(bushG, M.bush)];
		g.add(a, b, ...s);
		return {
			g,
			a,
			b,
			s
		};
	};
	const up = arm(.013), lo = arm(.018);
	kit.part(up.g, {
		id: `upper-arm-${o.id}`,
		label: `Upper wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A pressed and welded A-arm from two rubber bushes on the frame to the knuckle’s upper ball joint: with the lower arm it holds the wheel upright as it rises and falls.",
		moves: "Swings about its bushes as the body rises and sinks on its springs.",
		specs: [["Bushes", "Rubber, bonded"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		.16,
		0
	] });
	kit.part(lo.g, {
		id: `lower-arm-${o.id}`,
		label: `Lower wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The longer, stronger lower A-arm: it carries the coil spring’s load from the knuckle’s lower ball joint to the frame and takes the braking forces.",
		moves: "Swings about its bushes as the body rises and sinks.",
		specs: [["Material", "Pressed steel, welded box"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		-.18,
		0
	] });
	const tele = telescope({
		body: .24,
		rod: .2,
		rBody: .025,
		coil: {
			R: o.coil.R,
			wire: o.coil.wire,
			turns: o.coil.turns,
			seat: .11
		},
		M,
		mesh: kit.mesh
	});
	kit.part(new three.Group().add(tele.group), {
		id: `coilover-${o.id}`,
		label: `Coil spring and damper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A coil spring round a telescopic damper from the lower arm up to its tower on the frame: the spring carries the body, the damper’s oil forced through its valves stops it bouncing.",
		moves: "Shortens as the load or the climb presses the front down; lengthens as it lifts.",
		drive: "The road, through the lower arm",
		specs: [["Spring rate", `${Math.round(o.coil.k / 1e3)} kN/m at the wheel [inferred]`], ["Damper", "Twin tube, gas [inferred]"]]
	}, {
		explode: [
			.1 * Math.sign(o.corner.joints.upper[0]),
			.3,
			0
		],
		tag: o.tag
	});
	const tie = m(unitBar(.011), M.forged);
	const boot = m(GEO.lathe([
		[0, 0],
		[.02, 0],
		[.024, .02],
		[.016, .04],
		[.022, .06],
		[.012, .09],
		[0, .09]
	], 16), M.boot);
	kit.part(new three.Group().add(tie, boot), {
		id: `tie-rod-${o.id}`,
		label: `Tie rod, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "From the steering rack’s end to the knuckle’s steering arm: as the rack slides, it pushes or pulls the arm and turns the wheel about its ball joints. Its threaded end sets the toe.",
		moves: "Follows the rack and the wheel.",
		drive: "The steering rack",
		specs: [["Toe-in", "2 mm [inferred]"]]
	}, { explode: [
		0,
		-.06,
		.12
	] });
	const J = o.corner.joints;
	const lerp3 = (a, b, t) => [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	];
	return { 
	/** re-aim every piece between the body (as it is now) and the wheel */
update() {
		const [uf, ur] = o.upper.map((q) => inFrame(o.body, q)), [lf, lr] = o.lower.map((q) => inFrame(o.body, q));
		aim(up.a, uf, J.upper, true);
		aim(up.b, ur, J.upper, true);
		up.s[0].position.set(...uf);
		up.s[1].position.set(...ur);
		aim(lo.a, lf, J.lower, true);
		aim(lo.b, lr, J.lower, true);
		lo.s[0].position.set(...lf);
		lo.s[1].position.set(...lr);
		tele.set(lerp3(lerp3(lf, lr, .5), J.lower, o.on ?? .62), inFrame(o.body, o.top));
		const rk = inFrame(o.body, o.rack);
		aim(tie, rk, J.tie, true);
		aim(boot, rk, J.tie);
	} };
}
/**
* The steering rack on the body: its housing across the front with its rubber boots, the pinion at the driver's end,
* and the shaft with its universal joints up to the column.
* @param {Kit} kit @param {{ parent: THREE.Object3D, y: number, z: number, half: number, pinion: number, shaft: V3[], M: VehicleMats, assembly: string, source?: string }} o
*/
function steeringRack(kit, o) {
	const { M } = o, m = (g, mat) => kit.mesh(g, mat);
	const housing = GEO.merge([
		cyl([
			-o.half + .09,
			o.y,
			o.z
		], [
			o.half - .09,
			o.y,
			o.z
		], .024, 18),
		cyl([
			o.pinion,
			o.y - .03,
			o.z
		], [
			o.pinion,
			o.y + .07,
			o.z + .03
		], .03, 16),
		at(box(.06, .05, .05, .006), -o.half * .55, o.y + .03, o.z),
		at(box(.06, .05, .05, .006), o.half * .55, o.y + .03, o.z)
	]);
	const boots = [];
	for (const s of [-1, 1]) boots.push(GEO.lathe([
		[0, 0],
		[.026, 0],
		[.032, .02],
		[.022, .035],
		[.032, .05],
		[.022, .065],
		[.03, .08],
		[.014, .1],
		[0, .1]
	], 18).rotateZ(-s * Math.PI / 2).translate(s * (o.half - .1), o.y, o.z));
	const shaft = [hose(o.shaft, .01, 8)];
	for (const q of o.shaft.slice(1, -1)) shaft.push(at(box(.03, .03, .03, .006), q[0], q[1], q[2]));
	return kit.part(new three.Group().add(m(housing, M.zinc), m(GEO.merge(boots), M.boot), m(GEO.merge(shaft), M.forged)), {
		id: "steering-rack",
		label: "Steering rack",
		assembly: o.assembly,
		source: o.source,
		what: "A rack-and-pinion box across the front: the steering wheel’s shaft turns the pinion, the pinion slides the toothed rack sideways, the rack pushes and pulls the tie rods.",
		moves: "The rack slides as the wheel is turned (held straight here).",
		drive: "The steering wheel, through its shaft and universal joints",
		specs: [["Ratio", "20 : 1 [inferred]"], ["Turns, lock to lock", "3.8 [inferred]"]]
	}, { explode: [
		0,
		-.2,
		.2
	] }, o.parent);
}
/**
* @typedef {object} AxleOptions
* @property {THREE.Object3D} body the sprung frame the springs' hangers and the dampers' tops are on
* @property {number} z @property {number} y the axle's middle (in the root's frame; it stays on the wheels)
* @property {number} hub the hubs' faces at ±hub (m) @property {number} springX the leaf springs at ±springX
* @property {boolean} over the springs over the axle (else hung under it)
* @property {{ L: number, w: number, t: number, n: number, camber: number }} leaf the main leaf's length between its eyes, width, each leaf's thickness, how many, and its camber at the kerb's ride height
* @property {number} hanger the height of the frame's rails over the springs (in the body's frame), for their hangers
* @property {[V3, V3]} dampers each damper's top (in the body's frame); its bottom on the axle below it
* @property {number} ratio the final drive @property {number} rate each spring's rate (N/m)
* @property {VehicleMats} M @property {EngineMats} E @property {string} assembly @property {string} [springs] the springs', hangers' and dampers' assembly (else `assembly`) @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* A live rear axle on leaf springs: the banjo housing, the crown wheel and pinion in its bowl, the half-shafts in its
* tubes, the two leaf packs clamped to it by their U-bolts and hung from the frame on a hanger and a shackle, the two
* dampers. The axle stays on its wheels; the springs flatten and the dampers shorten as the body sinks onto it.
* @param {Kit} kit @param {AxleOptions} o
*/
function liveAxle(kit, o) {
	const { M, E } = o, m = (g, mat) => kit.mesh(g, mat);
	const { y, z, hub } = o, rt = .04;
	const bowl = latheZ([
		[0, -.1],
		[.11, -.1],
		[.135, -.07],
		[.145, -.01],
		[.13, .05],
		[.085, .1],
		[.055, .13],
		[.05, .2],
		[0, .2]
	], 40).translate(0, y, z);
	/** @type {THREE.BufferGeometry[]} */
	const tubes = [
		cyl([
			-hub + .11,
			y,
			z
		], [
			hub - .11,
			y,
			z
		], rt, 24),
		latheX([
			[.03, -hub + .09],
			[.09, -hub + .09],
			[.09, -hub + .105],
			[.03, -hub + .105]
		], 32).translate(0, y, z),
		latheX([
			[.03, hub - .105],
			[.09, hub - .105],
			[.09, hub - .09],
			[.03, hub - .09]
		], 32).translate(0, y, z)
	];
	const perchY = o.over ? y + rt + .008 : y - rt - .008;
	for (const s of [-1, 1]) tubes.push(at(box(o.leaf.w + .02, .016, .12, .003), s * o.springX, perchY, z));
	kit.part(new three.Group().add(m(GEO.merge([bowl, ...tubes]), M.chassis)), {
		id: "axle-housing",
		label: "Rear axle housing",
		assembly: o.assembly,
		source: o.source,
		what: "The banjo housing: a pressed-steel bowl round the differential with a tube out to each wheel, its spring seats welded on. It carries the vehicle’s rear and its load straight to the wheels.",
		specs: [["Type", "Live beam, semi-floating"]]
	}, {
		explode: [
			0,
			-.25,
			0
		],
		xray: "shell"
	});
	const crown = new three.Group(), pinion = new three.Group();
	{
		/** @type {number[]} */
		const angles = [];
		const T = 35;
		for (let k = 0; k < T; k++) angles.push(k / T * Math.PI * 2, (k + .42) / T * Math.PI * 2, (k + .5) / T * Math.PI * 2, (k + .92) / T * Math.PI * 2);
		const cw = revolveX([
			[.06, -.012],
			[.104, -.012],
			[
				.104,
				.002,
				1
			],
			[
				.072,
				.02,
				1
			],
			[.06, .02]
		], angles, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr);
		crown.add(m(GEO.merge([cw.translate(-.03, 0, 0), latheX([
			[0, -.05],
			[.055, -.05],
			[.06, 0],
			[.05, .05],
			[0, .05]
		], 28)]), E.gear));
		crown.position.set(0, y, z);
		/** @type {number[]} */
		const pa = [];
		const Tp = 11;
		for (let k = 0; k < Tp; k++) pa.push(k / Tp * Math.PI * 2, (k + .42) / Tp * Math.PI * 2, (k + .5) / Tp * Math.PI * 2, (k + .92) / Tp * Math.PI * 2);
		const pg = revolveX([
			[.012, 0],
			[
				.036,
				0,
				1
			],
			[
				.022,
				.045,
				1
			],
			[.012, .045]
		], pa, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr).rotateY(-Math.PI / 2);
		pinion.add(m(GEO.merge([
			pg,
			cyl([
				0,
				0,
				.04
			], [
				0,
				0,
				.2
			], .016, 12),
			latheZ([
				[.015, .2],
				[.048, .2],
				[.048, .212],
				[.015, .212]
			], 24)
		]), E.gear));
		pinion.position.set(0, y - .01, z + .065);
		const shafts = new three.Group();
		shafts.add(m(GEO.merge([cyl([
			-hub + .06,
			0,
			0
		], [
			-.05,
			0,
			0
		], .016, 12), cyl([
			.05,
			0,
			0
		], [
			hub - .06,
			0,
			0
		], .016, 12)]), E.crank));
		crown.add(shafts);
		const oil = m(at(box(.2, .08, .16, .02), 0, y - .085, z), E.oil);
		kit.part(new three.Group().add(crown, pinion, oil), {
			id: "differential",
			label: "Crown wheel, pinion and half-shafts",
			assembly: o.assembly,
			source: o.source,
			what: `The propshaft turns the pinion, the pinion turns the crown wheel ${o.ratio} times slower and a right angle round; the differential’s gears on the crown wheel share its torque between the half-shafts, letting the outer wheel turn faster in a bend.`,
			moves: "The pinion turns with the propshaft, the crown wheel and half-shafts with the wheels (shown slowed).",
			drive: "The propshaft",
			specs: [["Final drive", `${o.ratio.toFixed(2)} : 1 (35 : ${Math.round(35 / o.ratio)})`], ["Oil", "1.6 L, 80W-90 [inferred]"]]
		}, { explode: [
			0,
			-.5,
			.2
		] });
	}
	const leaf = leafPack(o.leaf);
	const eyeY = (c) => c + .012;
	/** the main leaf's middle: on the perch over the tube, or hung under it */
	const packY = o.over ? perchY + .008 + (o.leaf.n - 1) * o.leaf.t + o.leaf.t / 2 : perchY - .008 - o.leaf.t / 2;
	const packs = new three.Group();
	for (const s of [-1, 1]) {
		const g = new three.Group();
		g.position.set(s * o.springX, packY, z);
		g.add(m(leaf.geo, M.spring));
		const eyes = leaf.eyes.map((e) => {
			const c = new three.Group();
			c.add(m(leaf.eye, M.spring));
			return c;
		});
		g.add(...eyes);
		g.userData.eyes = eyes;
		packs.add(g);
		const yTop = o.over ? packY + o.leaf.t / 2 + .006 : y + rt + .004, yBot = o.over ? y - rt - .006 : packY - (o.leaf.n - 1) * o.leaf.t - o.leaf.t / 2 - .008;
		const ub = [];
		for (const dz of [-.045, .045]) for (const dx of [-1, 1]) ub.push(cyl([
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yBot - .02,
			z + dz
		], [
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yTop + .01,
			z + dz
		], .007, 8));
		for (const dz of [-.045, .045]) ub.push(at(box(o.leaf.w + .04, .012, .016, .003), s * o.springX, o.over ? yTop + .01 : yBot - .004, z + dz));
		ub.push(at(box(o.leaf.w + .04, .012, .12, .003), s * o.springX, o.over ? yBot - .006 : yBot - .004, z));
		packs.add(m(GEO.merge(ub), M.forged));
	}
	kit.part(packs, {
		id: "leaf-springs",
		label: "Leaf springs and U-bolts",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: `Two packs of ${o.leaf.n} steel leaves, each clamped to the axle by two U-bolts, its front eye on a hanger, its back eye on a swinging shackle: they carry the load and locate the axle. They flatten as the load grows.`,
		moves: "Flatten as the body sinks onto the axle, arch again as it lifts.",
		drive: "The load on the body",
		specs: [
			["Leaves", `${o.leaf.n} × ${Math.round(o.leaf.w * 1e3)} × ${Math.round(o.leaf.t * 1e3)} mm`],
			["Length", `${Math.round(o.leaf.L * 1e3)} mm between eyes`],
			["Rate", `${Math.round(o.rate / 1e3)} kN/m a side [inferred]`]
		]
	}, {
		explode: [
			0,
			-.4,
			0
		],
		tag: o.tag
	});
	const hang = [];
	const yEye = packY + eyeY(o.leaf.camber);
	for (const s of [-1, 1]) {
		const x = s * o.springX;
		hang.push(at(box(.012, o.hanger - yEye + .03, .07, .004), x - .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), at(box(.012, o.hanger - yEye + .03, .07, .004), x + .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), cyl([
			x - .045,
			yEye,
			z + o.leaf.L / 2
		], [
			x + .045,
			yEye,
			z + o.leaf.L / 2
		], .009, 10));
		const zs = z - o.leaf.L / 2;
		hang.push(at(box(.07, .05, .07, .006), x, o.hanger - .03, zs - .05), at(box(.01, .11, .035, .003), x - .035, yEye + .035, zs - .03), at(box(.01, .11, .035, .003), x + .035, yEye + .035, zs - .03), cyl([
			x - .045,
			yEye,
			zs
		], [
			x + .045,
			yEye,
			zs
		], .009, 10), cyl([
			x - .045,
			yEye + .07,
			zs - .05
		], [
			x + .045,
			yEye + .07,
			zs - .05
		], .009, 10));
	}
	kit.part(new three.Group().add(m(GEO.merge(hang), M.chassis)), {
		id: "spring-hangers",
		label: "Spring hangers and shackles",
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Under the frame: a fixed hanger for each spring’s front eye and a swinging shackle for its back eye, so the leaves can lengthen as they flatten.",
		specs: [["Bushes", "Rubber"]]
	}, { explode: [
		0,
		.1,
		0
	] }, o.body);
	const tl = [0, 1].map(() => telescope({
		body: .26,
		rod: .22,
		rBody: .026,
		M,
		mesh: kit.mesh
	}));
	kit.part(new three.Group().add(...tl.map((t) => t.group)), {
		id: "dampers-rear",
		label: "Rear dampers",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Telescopic dampers from the axle up to the frame, leaning in: oil forced through their valves turns the body’s bounce into heat.",
		moves: "Shorten as the body sinks, lengthen as it lifts.",
		specs: [["Type", "Twin tube [inferred]"]]
	}, { explode: [
		0,
		.25,
		-.15
	] });
	const bottoms = o.dampers.map((q) => [
		Math.sign(q[0]) * (o.springX - .11),
		y - .05,
		z - .07
	]);
	return {
		packs,
		/** sink the body onto it by `sag` (m), turn the wheels' side to `aw` and the pinion to `ap` @param {number} sag @param {number} aw @param {number} ap */
		update(sag, aw, ap) {
			leaf.set(o.leaf.camber - sag);
			for (const g of packs.children) {
				const eyes = g.userData.eyes;
				if (eyes) eyes.forEach((e, k) => e.position.copy(leaf.eyes[k].position));
			}
			crown.rotation.x = aw;
			pinion.rotation.z = -ap;
			tl.forEach((t, k) => t.set(bottoms[k], inFrame(o.body, o.dampers[k])));
		}
	};
}
/**
//#piece d1b217c6fe1b7e0a8f652f45a2b50c405c718ea29412182f7e4369b8c95b0e9a
//#piece e5dbb543b295f3f3ce7e2e24375debcceb724db3a3a94fed5ef7e26888daaa16
//#piece 4affdd0ebeaffcd2216335cd750580a633aa888a4ff6d785b93bbdc78c50e0fc
