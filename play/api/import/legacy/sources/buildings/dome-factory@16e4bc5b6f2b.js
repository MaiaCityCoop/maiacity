//#piece fbcd81540e5e00b2c220d63aff988ca3e2f1982a94ecbabf7def7a8661883b3d
//#piece f59c0c3aa48672487d6d8af07b4fc84b6b02d5016a300f5b9ee5fb8e3fc3b11e
}
var init_refs = __esmMin((() => {}));

//#endregion
//#region src/lib/sandbox-2/interior/parts.ts
/**
* What rides the belts of the solar factory dome, in 3D: the part each floor
* makes, at every stage of it. Every station makes something of its own —
* quartz becomes silicon becomes an ingot becomes wafers becomes cells; a coil
* of copper gathers ribbons, cable, plugs, a box and a board; sand becomes a
* melt, a sheet of glass, a triangle — so what rides out of a station is never
* what rode in.
*
* Each stage is one merged geometry with its colours in its vertices, all on
* a tray 1.5 m square: one instanced mesh per stage, one material for all.
*/
const BOX = /* @__PURE__ */ (() => new three.BoxGeometry(1, 1, 1))();
const BALL = /* @__PURE__ */ (() => new three.IcosahedronGeometry(1, 1))();
const ROD = /* @__PURE__ */ (() => new three.CylinderGeometry(1, 1, 1, 14))();
const CONE = /* @__PURE__ */ (() => new three.ConeGeometry(1, 1, 16))();
const TORUS = /* @__PURE__ */ (() => new three.TorusGeometry(1, .35, 8, 20))();
const TRI = /* @__PURE__ */ (() => (() => {
	const s = new three.Shape();
	s.moveTo(0, .62);
	s.lineTo(.62, -.5);
	s.lineTo(-.62, -.5);
	s.closePath();
	return new three.ExtrudeGeometry(s, {
		depth: 1,
		bevelEnabled: false
	}).rotateX(-Math.PI / 2);
})())();
function merge(parts) {
	const geos = parts.map(({ geo, c, at = [
		0,
		0,
		0
	], rot = [
		0,
		0,
		0
	], s = [
		1,
		1,
		1
	] }) => {
		const g = geo.index ? geo.toNonIndexed() : geo.clone();
		for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
		g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(at[0], at[1], at[2]), new three.Quaternion().setFromEuler(new three.Euler(rot[0], rot[1], rot[2])), new three.Vector3(s[0], s[1], s[2])));
		const col = new three.Color(c);
		const n = g.attributes.position.count;
		const arr = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) arr.set([
			col.r,
			col.g,
			col.b
		], i * 3);
		g.setAttribute("color", new three.BufferAttribute(arr, 3));
		return g;
	});
	return (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos);
}
const tray = {
	geo: BOX,
	c: "#555d63",
	at: [
		0,
		.03,
		0
	],
	s: [
		1.5,
		.06,
		1.5
	]
};
const tag = (c = "#2fbf5a") => ({
	geo: BOX,
	c,
	at: [
		.6,
		.12,
		-.6
	],
	s: [
		.16,
		.1,
		.16
	]
});
const lumps = (c) => [
	[
		-.4,
		-.35,
		.2
	],
	[
		.1,
		-.4,
		.17
	],
	[
		.45,
		-.1,
		.19
	],
	[
		-.3,
		.15,
		.21
	],
	[
		.2,
		.3,
		.18
	],
	[
		-.1,
		-.05,
		.16
	],
	[
		.5,
		.45,
		.15
	]
].map(([x, z, r]) => ({
	geo: BALL,
	c,
	at: [
		x,
		.06 + r * .8,
		z
	],
	s: [
		r,
		r * .8,
		r
	]
}));
const ingot = (z) => ({
	geo: ROD,
	c: "#6b747a",
	at: [
		0,
		.26,
		z
	],
	rot: [
		0,
		0,
		Math.PI / 2
	],
	s: [
		.2,
		1.2,
		.2
	]
});
const waferStacks = (c, top) => [
	-.45,
	0,
	.45
].flatMap((x) => [{
	geo: BOX,
	c,
	at: [
		x,
		.16,
		0
	],
	s: [
		.36,
		.2,
		.36
	]
}, ...top ? [
	0,
	1,
	2
].map((l) => ({
	geo: BOX,
	c: top,
	at: [
		x,
		.265,
		-.12 + l * .12
	],
	s: [
		.36,
		.01,
		.02
	]
})) : []]);
const coil = (c, x = -.35, z = -.3) => ({
	geo: TORUS,
	c,
	at: [
		x,
		.13,
		z
	],
	rot: [
		Math.PI / 2,
		0,
		0
	],
	s: [
		.3,
		.3,
		.3
	]
});
const spools = /* @__PURE__ */ (() => [.25, .55].map((x) => ({
	geo: ROD,
	c: "#cfd4d8",
	at: [
		x,
		.16,
		-.35
	],
	s: [
		.12,
		.2,
		.12
	]
})))();
const drum = /* @__PURE__ */ (() => [
	{
		geo: ROD,
		c: "#a8804f",
		at: [
			-.35,
			.36,
			-.3
		],
		rot: [
			Math.PI / 2,
			0,
			0
		],
		s: [
			.3,
			.04,
			.3
		]
	},
	{
		geo: ROD,
		c: "#a8804f",
		at: [
			-.35,
			.36,
			0
		],
		rot: [
			Math.PI / 2,
			0,
			0
		],
		s: [
			.3,
			.04,
			.3
		]
	},
	{
		geo: ROD,
		c: "#141619",
		at: [
			-.35,
			.36,
			-.15
		],
		rot: [
			Math.PI / 2,
			0,
			0
		],
		s: [
			.22,
			.28,
			.22
		]
	}
])();
const plugs = /* @__PURE__ */ (() => [.2, .45].map((x) => ({
	geo: BOX,
	c: "#2b2f33",
	at: [
		x,
		.12,
		.05
	],
	s: [
		.16,
		.12,
		.3
	]
})))();
const jbox = (lid) => [{
	geo: BOX,
	c: "#23272b",
	at: [
		.3,
		.16,
		.45
	],
	s: [
		.5,
		.2,
		.4
	]
}, ...lid ? [{
	geo: BOX,
	c: "#16181b",
	at: [
		.3,
		.27,
		.45
	],
	s: [
		.52,
		.03,
		.42
	]
}] : []];
const pcb = {
	geo: BOX,
	c: "#2e7d4f",
	at: [
		.3,
		.27,
		.45
	],
	s: [
		.38,
		.02,
		.3
	]
};
const chips = /* @__PURE__ */ (() => [
	[.22, .4],
	[.38, .4],
	[.3, .52]
].map(([x, z]) => ({
	geo: BOX,
	c: "#111316",
	at: [
		x,
		.29,
		z
	],
	s: [
		.08,
		.03,
		.06
	]
})))();
const joints = /* @__PURE__ */ (() => [
	[.16, .35],
	[.44, .35],
	[.16, .55],
	[.44, .55]
].map(([x, z]) => ({
	geo: BALL,
	c: "#e8ecef",
	at: [
		x,
		.29,
		z
	],
	s: [
		.02,
		.02,
		.02
	]
})))();
const leads = /* @__PURE__ */ (() => [.05, .15].map((dz) => ({
	geo: ROD,
	c: "#141619",
	at: [
		.1,
		.16,
		.2 + dz
	],
	rot: [
		0,
		0,
		Math.PI / 2
	],
	s: [
		.025,
		.4,
		.025
	]
})))();
const glass = (c, h = .03, y = .07) => ({
	geo: TRI,
	c,
	at: [
		0,
		y,
		0
	],
	s: [
		1.15,
		h,
		1.15
	]
});
const cellsOn = (y) => [
	-.28,
	-.08,
	.12,
	.32
].flatMap((z, row) => Array.from({ length: 4 - row }, (_, i) => ({
	geo: BOX,
	c: "#1b2a5c",
	at: [
		(-(3 - row) / 2 + i) * .2,
		y,
		z
	],
	s: [
		.16,
		.012,
		.16
	]
})));
const strings = (rows) => rows.map((z) => ({
	geo: BOX,
	c: "#1b2a5c",
	at: [
		0,
		.09,
		z
	],
	s: [
		1.2,
		.02,
		.14
	]
}));
const frame = (c) => {
	const pts = [
		[0, -.62],
		[.62, .5],
		[-.62, .5]
	];
	return pts.map((p, i) => {
		const q = pts[(i + 1) % 3];
		const mx = (p[0] + q[0]) / 2 * 1.15, mz = (p[1] + q[1]) / 2 * 1.15;
		const len = Math.hypot(q[0] - p[0], q[1] - p[1]) * 1.15;
		return {
			geo: BOX,
			c,
			at: [
				mx,
				.12,
				mz
			],
			rot: [
				0,
				-Math.atan2(q[1] - p[1], q[0] - p[0]),
				0
			],
			s: [
				len,
				.08,
				.06
			]
		};
	});
};
const profiles = (c) => [
	-.55,
	-.45,
	-.35
].map((z) => ({
	geo: BOX,
	c,
	at: [
		0,
		.2,
		z
	],
	s: [
		1.4,
		.05,
		.06
	]
}));
const struts = /* @__PURE__ */ (() => [
	.45,
	.52,
	.59
].map((z) => ({
	geo: ROD,
	c: "#8b939a",
	at: [
		0,
		.2,
		z
	],
	rot: [
		0,
		0,
		Math.PI / 2
	],
	s: [
		.03,
		1.4,
		.03
	]
})))();
const hub = {
	geo: BALL,
	c: "#9aa2a8",
	at: [
		-.55,
		.22,
		-.5
	],
	s: [
		.12,
		.12,
		.12
	]
};
/** Floor by floor, ground up: the part at every stage, from what the floor starts with to what it hands on. */
const FLOORS = /* @__PURE__ */ (() => [
	(() => {
		const lam = [
			glass("#bfe6ef", .04),
			...cellsOn(.115),
			{
				geo: BOX,
				c: "#16181b",
				at: [
					0,
					.14,
					-.35
				],
				s: [
					.14,
					.06,
					.1
				]
			}
		];
		const framed = [...lam, ...frame("#aab1b6")];
		return [
			lam,
			[...lam, ...profiles("#c4c9cc")],
			[...lam, ...profiles("#8f969b")],
			framed,
			[...framed, tag("#ffffff")],
			[...framed, tag()],
			[...framed, tag("#f2c230")],
			[
				...framed,
				tag(),
				{
					geo: BOX,
					c: "#ffffff",
					at: [
						.35,
						.13,
						.3
					],
					s: [
						.2,
						.01,
						.12
					]
				}
			],
			[...framed, ...struts],
			[
				...framed,
				...struts,
				hub
			],
			[
				...framed,
				...struts,
				hub,
				{ ...glass("#bfe6ef", .04, .2) },
				{ ...glass("#bfe6ef", .04, .3) }
			],
			[
				...framed,
				...struts,
				hub,
				glass("#bfe6ef", .04, .2),
				{
					geo: BOX,
					c: "#e8742a",
					at: [
						-.7,
						.14,
						0
					],
					s: [
						.06,
						.16,
						1.4
					]
				},
				{
					geo: BOX,
					c: "#e8742a",
					at: [
						.7,
						.14,
						0
					],
					s: [
						.06,
						.16,
						1.4
					]
				}
//#piece 7a47cd685301585096d5fdd4e43ee63a46d4dc8e6ac5a0327cc8bd54b88c2676
				}
//#piece 7a47cd685301585096d5fdd4e43ee63a46d4dc8e6ac5a0327cc8bd54b88c2676
				},
				tag()
			]
		];
	})(),
	(() => {
		const film = {
			geo: ROD,
			c: "#f4f7f5",
			at: [
				-.2,
				.2,
				-.5
			],
			rot: [
				0,
				0,
				Math.PI / 2
			],
			s: [
				.14,
				1,
				.14
			]
		};
		const laid = [
			glass("#bfe6ef"),
			glass("#f4f7f5", .01, .1),
			...cellsOn(.11)
		];
		const bussed = [...laid, {
			geo: BOX,
			c: "#d7dce0",
			at: [
				0,
				.12,
				.42
			],
			s: [
				1.1,
				.01,
				.04
			]
		}];
		const lam = [glass("#9fcad6", .05), ...cellsOn(.125)];
		return [
			[],
			[film],
			[film, ...strings([.55])],
			[film, ...strings([.45, .6])],
			[
				glass("#bfe6ef"),
				glass("#f4f7f5", .01, .1),
				...strings([.6])
			],
			laid,
			bussed,
			[...bussed, glass("#d8f0f6", .02, .13)],
			[
				...bussed,
				glass("#d8f0f6", .02, .13),
				tag()
			],
			lam,
			[...lam, tag("#ffffff")],
			[...lam, ...frame("#e8ecef").map((f) => ({
				...f,
				s: [
					f.s[0],
					.01,
					.02
				]
			}))],
			[
				...lam,
				{
					geo: BOX,
					c: "#16181b",
					at: [
						0,
						.16,
						-.35
					],
					s: [
						.18,
						.08,
						.12
					]
				},
				...leads.map((l) => ({
					...l,
					at: [
						0,
						.16,
						-.5 + l.at[2] - .2
					]
				}))
			]
		].map((p) => [tray, ...p]);
	})(),
	(() => {
		const tri = (c) => [glass(c)];
		return [
			[{
				geo: CONE,
				c: "#d8c59a",
				at: [
					0,
					.25,
					0
				],
				s: [
					.6,
					.4,
					.6
				]
			}],
			[
				{
					geo: CONE,
					c: "#d8c59a",
					at: [
						-.3,
						.2,
						-.2
					],
					s: [
						.35,
						.3,
						.35
					]
				},
				{
					geo: CONE,
					c: "#f2efe8",
					at: [
						.3,
						.2,
						-.2
					],
					s: [
						.3,
						.26,
						.3
					]
				},
				{
					geo: CONE,
					c: "#b9b4aa",
					at: [
						0,
						.2,
						.3
					],
					s: [
						.32,
						.28,
						.32
					]
				}
			],
			[{
				geo: BALL,
				c: "#ff8a2a",
				at: [
					0,
					.14,
					0
				],
				s: [
					.55,
					.12,
					.55
				]
			}],
			[{
				geo: BOX,
				c: "#bfe6ef",
				at: [
					0,
					.08,
					0
				],
				s: [
					1.4,
					.03,
					1.4
				]
			}],
			[{
				geo: BOX,
				c: "#d4eef4",
				at: [
					0,
					.08,
					0
				],
				s: [
					1.4,
					.03,
					1.4
				]
			}],
			tri("#bfe6ef"),
			[glass("#bfe6ef"), ...frame("#ffffff").map((f) => ({
				...f,
				s: [
					f.s[0],
					.02,
					.03
				],
				at: [
					f.at[0],
					.09,
					f.at[2]
				]
			}))],
			tri("#d8f3f8"),
			tri("#a9cfe6"),
			tri("#b7a9e0"),
			[glass("#b7a9e0"), tag()]
		].map((p) => [tray, ...p]);
	})(),
	(() => {
		const s = [];
		s.push([coil("#b8693a")]);
		s.push([coil("#e0894a")]);
		s.push([coil("#e0894a"), ...spools]);
		s.push([coil("#141619"), ...spools]);
		s.push([...drum, ...spools]);
		s.push([
			...drum,
			...spools,
			...plugs
		]);
		s.push([
			...drum,
			...spools,
			...plugs,
			...jbox(false)
		]);
		s.push([
			...drum,
			...spools,
			...plugs,
			...jbox(false),
			pcb
		]);
		s.push([
			...drum,
			...spools,
			...plugs,
			...jbox(false),
			pcb,
			...chips
		]);
		s.push([
			...drum,
			...spools,
			...plugs,
			...jbox(false),
			pcb,
			...chips,
			...joints
		]);
		s.push([
			...drum,
			...spools,
			...plugs,
			...jbox(false),
			pcb,
			...chips,
			...joints,
			tag()
		]);
		s.push([
			...spools,
			...plugs,
			...jbox(true),
			...leads,
			tag()
		]);
		s.push([
			...spools,
			...plugs,
			...jbox(true),
			...leads,
			tag()
		]);
		return s.map((p) => [tray, ...p]);
	})(),
	[
		[...lumps("#ece9e2")],
		[...lumps("#7f878d")],
		[...lumps("#b7c0c6")],
		[ingot(-.3)],
		[ingot(-.3), ingot(.3)],
		waferStacks("#8f979d"),
		waferStacks("#6b7378"),
		waferStacks("#4f5e78"),
		waferStacks("#1b2a5c"),
		waferStacks("#1b2a5c", "#dfe3e8"),
		waferStacks("#1f3068", "#f2f4f7"),
		[...waferStacks("#1f3068", "#f2f4f7"), tag()]
	].map((p) => [tray, ...p])
])();
const material = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	vertexColors: true,
	roughness: .45,
	metalness: .15
}))();
/** The part at every stage of floor k: stage 0 is what the floor starts from, stage n what station n made of it. */
function stageParts(k, stations) {
	const floor = FLOORS[k];
	return {
		geos: Array.from({ length: stations + 1 }, (_, i) => merge(k === 0 ? [tray, ...floor[Math.min(i, floor.length - 1)]] : floor[Math.min(i, floor.length - 1)])),
		material
	};
}

//#endregion
//#region src/lib/sandbox-2/interior/factory.ts
/**
* THE SOLAR FACTORY DOME — the village's factory coop, a dome the size of the
* master dome, making the glass triangles every dome is built from.
*
* It follows the real recipe of a solar module line, top to bottom:
*
*   4  Solar glass       float glass in, triangles cut, edges ground, washed,
*                        tempered at 700 °C, quenched, anti-reflective coated
*   3  Cells & strings   cells sorted by EL and IV, laser half-cut, soldered
*                        into strings on the tabber-stringers, inspected
*   2  Layup             glass in, encapsulant film, strings laid up, bussed,
*                        second film, back glass, EL before lamination
*   1  Lamination        vacuum laminators at 145 °C, cooling press, edge
*                        trimming, triangle frame and gasket, junction box
*   0  Testing & ship    sun simulator flash test, final EL, insulation test,
*                        grading, packing onto racks; round it the warehouse,
*                        high-bay racks, docks at the doors, AGVs to the yard
*
* Every floor is a ring round a central tower: one great round lift that
* carries people, robots and racks between the floors (↑ and ↓ inside it),
* and overhead conveyors from the tower out over the lines. On every floor
* two circular lines carry the triangles from station to station, climbing
* over the paths where they cross. Robot arms load the machines behind their
* fences, gantries lay up the strings, humanoid robots and people walk the
* aisles, AGVs carry racks.
*/
/** The five floors, ground up. */
const LEVELS = [
	0,
	7,
	14,
	21,
	28
];
const NAMES = [
	"Frames, test & dome kits",
	"Modules",
	"Glass from sand",
	"Copper, cords & electronics",
	"Silicon & cells"
];
const CORE = 6.5;
const LANDING = 11;
const FLOOR_IN = 17;
/** the main line: one loop on every floor, near the outside of the hall */
const MAIN = 48;
const BELT = .9;
const DOORS$1 = /* @__PURE__ */ (() => [
	0,
	Math.PI / 2,
	Math.PI,
	-Math.PI / 2
])();
const SPURS = /* @__PURE__ */ (() => DOORS$1.map((d) => d + Math.PI / 4))();
const polar$1 = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
const adiff$1 = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smooth = (x) => x * x * (3 - 2 * x);
const col = (c, rough = .6, metal = 0) => new three.MeshStandardMaterial({
	color: c,
	roughness: rough,
	metalness: metal
});
const glow = (c, i = 1.4) => new three.MeshStandardMaterial({
	color: c,
	emissive: c,
	emissiveIntensity: i,
	roughness: .4
});
const M = /* @__PURE__ */ (() => ({
	white: col("#eceff1", .45),
	grey: col("#9aa2a8", .5, .2),
	graphite: col("#3a4046", .45, .3),
	orange: col("#e8742a", .4, .1),
	yellow: col("#f2c230", .5),
	blue: col("#2f5d8a", .45),
	belt: col("#2a2d30", .85),
	steel: col("#b8c0c6", .3, .8),
	slab: new three.MeshStandardMaterial({
		color: "#7f8a84",
		roughness: .9,
		envMapIntensity: .35
	}),
	under: col("#6f777a", .9),
	duct: col("#a9b0b4", .35, .7),
	fence: new three.MeshStandardMaterial({
		color: "#e0b020",
		roughness: .6,
		transparent: true,
		opacity: .35,
		side: three.DoubleSide,
		depthWrite: false
	}),
	glassWall: new three.MeshPhysicalMaterial({
		color: "#dfeef0",
		roughness: .05,
		transparent: true,
		opacity: .18,
		side: three.DoubleSide,
		depthWrite: false
	}),
	light: glow("#ffffff", 1.1),
	furnace: glow("#ff7a1f", 2.2),
	ir: glow("#ff3b2a", 1.6),
	wash: glow("#5ec8ff", 1.2),
	laser: glow("#ff2020", 2.5),
	screen: glow("#58a8ff", .9),
	green: glow("#39d353", 1.6),
	amber: glow("#ffb020", .4),
	red: glow("#ff3b30", .3),
	flash: new three.MeshStandardMaterial({
		color: "#ffffff",
		emissive: "#ffffff",
		emissiveIntensity: .2
	}),
	cellBlue: col("#1c2c5a", .3, .3),
	film: new three.MeshStandardMaterial({
		color: "#f4f7f5",
		roughness: .3,
		transparent: true,
		opacity: .7,
		side: three.DoubleSide
	}),
	alu: col("#c4c9cc", .35, .85),
	cassette: col("#2c6f9e", .5),
	pallet: col("#b08a58", .8),
	cardboard: col("#b8925e", .9),
	rubber: col("#1f2123", .9)
}))();
/** A sign: the step's number, its name, and a line of what happens there. */
function sign(step, name, note = "") {
	const c = document.createElement("canvas");
	c.width = 768;
	c.height = 176;
	const x = c.getContext("2d");
	x.fillStyle = "#23292e";
	x.fillRect(0, 0, 768, 176);
	x.fillStyle = "#e8742a";
	x.fillRect(0, 0, 12, 176);
	x.fillStyle = "#e8742a";
	x.font = "600 44px system-ui, sans-serif";
	x.fillText(step, 36, 70);
	x.fillStyle = "#ffffff";
	x.font = "600 52px system-ui, sans-serif";
	x.fillText(name, 36 + x.measureText(step).width + 34, 70);
	x.fillStyle = "#b9c2c9";
	x.font = "400 34px system-ui, sans-serif";
	x.fillText(note, 36, 130);
	const t = new three.CanvasTexture(c);
	t.colorSpace = three.SRGBColorSpace;
	return new three.MeshStandardMaterial({
		map: t,
		emissive: "#ffffff",
		emissiveMap: t,
		emissiveIntensity: .35,
		side: three.DoubleSide
	});
}
/** A stack light: red, amber, green, the green one blinking while the machine runs. */
function stackLight(ctx, g, x, y, z, blink) {
	g.add(ctx.box(.06, .6, .06, M.graphite, x, y, z));
	[
		M.green,
		M.amber,
		M.red
	].forEach((mat, i) => {
		const b = new three.Mesh(new three.CylinderGeometry(.07, .07, .12, 12), i === 0 ? mat.clone() : mat);
		b.position.set(x, y + .66 + i * .13, z);
		g.add(b);
		if (i === 0) blink.push(b);
	});
}
/** A control desk on the aisle side: a cabinet and a glowing screen. */
function console_(ctx, g, x, z, face = 0) {
	g.add(ctx.box(.9, 1.1, .5, M.grey, x, 0, z, face));
	const s = ctx.box(.7, .45, .04, M.screen, x, 1.15, z, face);
	s.rotation.x = -.35;
	g.add(s);
}
/**
* A machine the line runs through: a housing straddling the belt, windows
* glowing with what goes on inside, a desk, a stack light.
*/
function tunnel(ctx, len, h, body, inside, blink) {
	const g = new three.Group();
	g.add(ctx.box(len, h, 3.2, body, 0, 0, 0));
	g.add(ctx.box(len + .02, .18, 3.22, M.orange, 0, h - .5, 0));
	for (const sx of [-1, 1]) g.add(ctx.box(.05, .7, 1.9, M.graphite, sx * (len + .02) / 2, .7, 0));
	if (inside) for (const sz of [-1, 1]) {
		const w = new three.Mesh(new three.PlaneGeometry(len * .7, h * .28), inside);
		w.position.set(0, h * .55, sz * 1.62);
		w.rotation.y = sz > 0 ? 0 : Math.PI;
		g.add(w);
	}
	console_(ctx, g, len / 2 - .8, -2.2);
	stackLight(ctx, g, -len / 2 + .3, h, -1.4, blink);
	return {
		group: g,
		colliders: Array.from({ length: Math.ceil(len / 2.6) }, (_, i) => ({
			x: -len / 2 + 1.3 + i * 2.6,
			z: 0,
			r: 1.8
		}))
	};
}
/**
* A six-axis robot arm: base, turret, shoulder, elbow, wrist, and a vacuum
* gripper. It swings between the belt and its machine on a cycle of its own.
*/
function robotArm(ctx, paint, from, to, period, phase) {
	const g = new three.Group();
	g.add(ctx.box(.9, .12, .9, M.graphite));
	const base = new three.Mesh(new three.CylinderGeometry(.34, .4, .45, 20), paint);
	base.position.y = .34;
	g.add(base);
	const turret = new three.Group();
	turret.position.y = .56;
	g.add(turret);
	const tMesh = new three.Mesh(new three.CylinderGeometry(.3, .32, .36, 20), paint);
	tMesh.position.y = .18;
	turret.add(tMesh);
	const shoulder = new three.Group();
	shoulder.position.y = .42;
	turret.add(shoulder);
	const upper = ctx.box(.26, 1.3, .3, paint, 0, 0, 0);
	shoulder.add(upper);
	const elbow = new three.Group();
	elbow.position.y = 1.3;
	shoulder.add(elbow);
	const elbowJ = new three.Mesh(new three.CylinderGeometry(.17, .17, .36, 16), M.graphite);
	elbowJ.rotation.z = Math.PI / 2;
	elbow.add(elbowJ);
	const fore = ctx.box(.2, 1.1, .22, paint, 0, 0, 0);
	elbow.add(fore);
	const wrist = new three.Group();
	wrist.position.y = 1.1;
	elbow.add(wrist);
	wrist.add(ctx.box(.14, .2, .14, M.graphite));
	const tool = ctx.box(.9, .05, .6, M.steel, 0, .2, 0);
	wrist.add(tool);
	for (const [cx, cz] of [
		[-.35, -.22],
		[.35, -.22],
		[-.35, .22],
		[.35, .22]
	]) {
		const cup = new three.Mesh(new three.CylinderGeometry(.05, .06, .08, 10), M.rubber);
		cup.position.set(cx, .28, cz);
		wrist.add(cup);
	}
	g.traverse((o) => o.castShadow = true);
	const update = (t) => {
		const u = ((t / period + phase) % 1 + 1) % 1;
		const swing = u < .5 ? smooth(Math.min(1, Math.max(0, (u - .1) / .3))) : 1 - smooth(Math.min(1, Math.max(0, (u - .6) / .3)));
		const dip = Math.abs(Math.sin(u * Math.PI * 2)) < .25 ? 1 : .4;
		turret.rotation.y = from + (to - from) * swing;
		shoulder.rotation.x = .35 + .35 * dip;
		elbow.rotation.x = 1.35 + .3 * dip;
		wrist.rotation.x = Math.PI - shoulder.rotation.x - elbow.rotation.x;
	};
	update(0);
	return {
		group: g,
		colliders: [{
			x: 0,
			z: 0,
			r: .8
		}],
		update
	};
}
/** A gantry over the belt: a portal frame, a carriage running along it, a head that dips to lay a string. */
function gantry(ctx, len, period, carry) {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(ctx.box(.22, 3.2, .22, M.yellow, sx * len / 2, 0, sz * 1.9));
	for (const sz of [-1, 1]) g.add(ctx.box(len + .3, .3, .26, M.yellow, 0, 3.2, sz * 1.9));
	const carriage = new three.Group();
	carriage.position.y = 3.2;
	g.add(carriage);
	carriage.add(ctx.box(.6, .35, 4.1, M.graphite, 0, -.1, 0));
	const head = new three.Group();
	carriage.add(head);
	head.add(ctx.box(.12, 1.4, .12, M.steel, 0, -1.4, 0));
	head.add(ctx.box(1.3, .06, .4, carry, 0, -1.5, 0));
	const update = (t) => {
		const u = (t / period % 1 + 1) % 1;
		carriage.position.x = Math.sin(u * Math.PI * 2) * (len / 2 - .6);
		head.position.y = -Math.max(0, Math.cos(u * Math.PI * 4)) * .6;
	};
	return {
		group: g,
		colliders: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({
			x: sx * len / 2,
			z: sz * 1.9,
			r: .35
		}))),
		update
	};
}
/** A glowing stack of three vacuum laminators, their lids lifting in turn. */
function laminators(ctx, blink) {
	const g = new three.Group();
	const lids = [];
	for (let i = 0; i < 3; i++) {
		const y = .4 + i * 1.25;
		g.add(ctx.box(5, .55, 3.6, M.white, 0, y, 0));
		const heat = new three.Mesh(new three.PlaneGeometry(4.6, .12), M.furnace);
		heat.position.set(0, y + .6, 1.81);
		g.add(heat);
		const lid = ctx.box(5, .35, 3.6, M.grey, 0, y + .62, 0);
		g.add(lid);
		lids.push(lid);
	}
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(ctx.box(.2, 4.2, .2, M.graphite, sx * 2.6, 0, sz * 1.9));
	console_(ctx, g, 3.4, -1.2, Math.PI / 2);
	stackLight(ctx, g, -2.4, 4.2, -1.9, blink);
	const update = (t) => lids.forEach((lid, i) => {
		const u = ((t / 18 + i / 3) % 1 + 1) % 1;
		lid.position.y = .4 + i * 1.25 + .62 + (u > .85 ? Math.sin((u - .85) / .15 * Math.PI) * .45 : 0);
	});
	return {
		group: g,
		colliders: [{
			x: -1.5,
			z: 0,
			r: 2.2
		}, {
			x: 1.5,
			z: 0,
			r: 2.2
		}],
		update
	};
}
/** The sun simulator: a dark booth where every panel meets a flash of a thousand watts a square metre. */
function flashBooth(ctx) {
	const g = new three.Group();
	g.add(ctx.box(5, 3, .2, M.graphite, 0, 0, 1.7));
	g.add(ctx.box(5, .2, 3.6, M.graphite, 0, 3, 0));
	for (const sx of [-1, 1]) g.add(ctx.box(.2, 3, 3.6, M.graphite, sx * 2.5, 0, 0));
	const lamp = new three.Mesh(new three.PlaneGeometry(3.6, 2.4), M.flash);
	lamp.rotation.x = Math.PI / 2;
	lamp.position.set(0, 2.88, 0);
	g.add(lamp);
	console_(ctx, g, 3.2, -1.8);
	const update = (t) => {
		const u = t % 2.4 / 2.4;
		M.flash.emissiveIntensity = u < .06 ? 6 : .15;
	};
	return {
		group: g,
		colliders: [{
			x: -1.5,
			z: .6,
			r: 1.6
		}, {
			x: 1.5,
			z: .6,
			r: 1.6
		}],
		update
	};
}
/**
* Humanoid robots and people, instanced: one mesh per body part for all of
* them, their legs and arms swinging as they walk the aisles, or standing
* at a station with their hands busy.
*/
function crowd(walkers) {
	const n = walkers.length;
	const a0 = walkers.map((w) => w.a);
	const mat = new three.MeshStandardMaterial({
		color: "#ffffff",
		roughness: .55
	});
	const parts = {
		torso: new three.BoxGeometry(.4, .58, .24),
		head: new three.SphereGeometry(.13, 14, 10),
		leg: new three.BoxGeometry(.14, .86, .16).translate(0, -.43, 0),
		arm: new three.BoxGeometry(.1, .66, .12).translate(0, -.33, 0)
	};
	const meshes = {
		torso: new three.InstancedMesh(parts.torso, mat, n),
		head: new three.InstancedMesh(parts.head, mat, n),
		legL: new three.InstancedMesh(parts.leg, mat, n),
		legR: new three.InstancedMesh(parts.leg, mat, n),
		armL: new three.InstancedMesh(parts.arm, mat, n),
		armR: new three.InstancedMesh(parts.arm, mat, n)
	};
	const object = new three.Group();
	const c = new three.Color();
	walkers.forEach((w, i) => {
		const robot = w.kind === "robot";
		const suit = robot ? "#e9edf0" : i % 3 ? "#2f4f7a" : "#f28c28";
		meshes.torso.setColorAt(i, c.set(suit));
		meshes.head.setColorAt(i, c.set(robot ? "#2a3036" : [
			"#e0b48f",
			"#8d5a3b",
			"#c68c62",
			"#f1caa7"
		][i % 4]));
		for (const k of ["legL", "legR"]) meshes[k].setColorAt(i, c.set(robot ? "#b9c1c7" : "#26303a"));
		for (const k of ["armL", "armR"]) meshes[k].setColorAt(i, c.set(robot ? "#b9c1c7" : suit));
	});
	for (const mesh of Object.values(meshes)) {
		mesh.castShadow = true;
		mesh.frustumCulled = false;
		object.add(mesh);
	}
	const base = new three.Matrix4(), local = new three.Matrix4(), rot = new three.Matrix4(), out = new three.Matrix4();
	const set = (mesh, i, x, y, z, rx = 0) => {
		local.makeTranslation(x, y, z);
		rot.makeRotationX(rx);
		out.copy(base).multiply(local).multiply(rot);
		mesh.setMatrixAt(i, out);
	};
	const update = (t, dt) => {
		walkers.forEach((w, i) => {
			if (!w.working) w.a = a0[i] + w.speed / w.r * t;
			const [x, z] = polar$1(w.r, w.a);
			const yaw = w.working ? w.a : w.a + (w.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
			const y = LEVELS[w.level];
			const step = w.working ? 0 : Math.sin(t * (w.kind === "robot" ? 6 : 7) + w.phase) * .5;
			const bob = w.working ? 0 : Math.abs(Math.cos(t * 7 + w.phase)) * .04;
			base.makeRotationY(yaw).setPosition(x, y + bob, z);
			set(meshes.torso, i, 0, 1.2, 0);
			set(meshes.head, i, 0, 1.64, 0);
			set(meshes.legL, i, -.1, .9, 0, step);
			set(meshes.legR, i, .1, .9, 0, -step);
			const busy = -.85 + Math.sin(t * 3 + w.phase) * .2;
			set(meshes.armL, i, -.27, 1.46, 0, w.working ? busy : -step * .8);
			set(meshes.armR, i, .27, 1.46, 0, w.working ? -.85 - Math.sin(t * 3.4 + w.phase) * .2 : step * .8);
		});
		for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
	};
	return {
		object,
		update
	};
}
/** A Czochralski puller: a tall steel chamber, a glowing window, the pull column above. */
function puller(ctx, blink) {
	const g = new three.Group();
	for (const x of [-1.3, 1.3]) {
		const body = new three.Mesh(new three.CylinderGeometry(.85, .85, 2.4, 24), M.white);
		body.position.set(x, 1.2, 0);
		g.add(body);
		const dome = new three.Mesh(new three.SphereGeometry(.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.white);
		dome.position.set(x, 2.4, 0);
		g.add(dome);
		g.add(ctx.box(.25, 2.4, .25, M.steel, x, 3.1, 0));
		g.add(ctx.box(.6, .4, .6, M.graphite, x, 5.3, 0));
		const win = new three.Mesh(new three.CircleGeometry(.2, 16), M.furnace);
		win.position.set(x, 1.4, -.86);
		win.rotation.y = Math.PI;
		g.add(win);
	}
	console_(ctx, g, 0, -1.6);
	stackLight(ctx, g, 2.4, 2.2, -.6, blink);
	return {
		group: g,
		colliders: [{
			x: -1.3,
			z: 0,
			r: 1
		}, {
			x: 1.3,
			z: 0,
			r: 1
		}]
	};
}
/** A submerged arc furnace: quartz and carbon in, three electrodes down into the glow. */
function arcFurnace(ctx, blink) {
	const g = new three.Group();
	const shell = new three.Mesh(new three.CylinderGeometry(1.7, 1.9, 2.2, 28), M.graphite);
	shell.position.y = 1.1;
	g.add(shell);
	const melt = new three.Mesh(new three.CircleGeometry(1.55, 28), M.furnace);
	melt.rotation.x = -Math.PI / 2;
	melt.position.y = 2.21;
	g.add(melt);
	for (let i = 0; i < 3; i++) {
		const a = i / 3 * Math.PI * 2;
		const e = new three.Mesh(new three.CylinderGeometry(.22, .22, 3, 12), M.graphite);
		e.position.set(Math.sin(a) * .7, 3.2, Math.cos(a) * .7);
		g.add(e);
	}
	g.add(ctx.box(2.6, .3, 2.6, M.orange, 0, 4.6, 0));
	console_(ctx, g, 2.2, -1.8);
	stackLight(ctx, g, -2, 2, -1.4, blink);
	return {
		group: g,
		colliders: [{
			x: 0,
			z: 0,
			r: 2.1
		}]
	};
}
/** The batch house: silos of sand, soda ash, limestone and dolomite over a weighing mixer. */
function silos(ctx, blink) {
	const g = new three.Group();
	for (const [i, x] of [
		-2.1,
		-.7,
		.7,
		2.1
	].entries()) {
		const s = new three.Mesh(new three.CylinderGeometry(.6, .6, 3, 18), i % 2 ? M.white : M.grey);
		s.position.set(x, 3, 1.2);
		g.add(s);
		const cone = new three.Mesh(new three.ConeGeometry(.6, .9, 18), M.grey);
		cone.rotation.x = Math.PI;
		cone.position.set(x, 1.05, 1.2);
		g.add(cone);
		g.add(ctx.box(.08, 1.5, .08, M.steel, x - .45, 0, 1.6), ctx.box(.08, 1.5, .08, M.steel, x + .45, 0, 1.6));
	}
	g.add(ctx.box(3.2, 1.4, 1.6, M.white, 0, 0, -.4));
	g.add(ctx.box(3.22, .16, 1.62, M.orange, 0, 1.1, -.4));
	stackLight(ctx, g, 1.6, 1.4, -1.2, blink);
	return {
		group: g,
		colliders: [{
			x: -1.4,
			z: .4,
			r: 1.5
		}, {
			x: 1.4,
			z: .4,
			r: 1.5
		}]
	};
}
/** The float bath: a long, low enclosure over a pool of molten tin, glowing through its ports. */
function floatBath(ctx, blink) {
	const g = new three.Group();
	g.add(ctx.box(12, 1.6, 3.4, M.graphite));
	g.add(ctx.box(12.02, .14, 3.42, M.orange, 0, 1.3, 0));
	for (let i = 0; i < 8; i++) {
		const port = new three.Mesh(new three.PlaneGeometry(.8, .3), M.furnace);
		port.position.set(-5.2 + i * 1.5, .8, -1.71);
		port.rotation.y = Math.PI;
		g.add(port);
	}
	for (let i = 0; i < 6; i++) g.add(ctx.box(.3, 1.2, .3, M.steel, -5 + i * 2, 1.6, 0));
	console_(ctx, g, 5, -2.4);
	stackLight(ctx, g, -5.7, 1.6, -1.5, blink);
	return {
		group: g,
		colliders: Array.from({ length: 5 }, (_, i) => ({
			x: -4.8 + i * 2.4,
			z: 0,
			r: 1.9
		}))
	};
}
/** Cable drums: the finished solar cable wound onto wooden reels, turning as they fill. */
function drums(ctx, blink) {
	const g = new three.Group();
	const wood = col("#a8804f", .9);
	const cable = col("#1d1f22", .6);
	const reels = [];
	for (const x of [
		-1.6,
		0,
		1.6
	]) {
		const reel = new three.Group();
		for (const sd of [-1, 1]) {
			const flange = new three.Mesh(new three.CylinderGeometry(.85, .85, .08, 24), wood);
			flange.rotation.x = Math.PI / 2;
			flange.position.z = sd * .35;
			reel.add(flange);
		}
		const core = new three.Mesh(new three.CylinderGeometry(.6, .6, .62, 24), cable);
		core.rotation.x = Math.PI / 2;
		reel.add(core);
		reel.position.set(x, .9, 1);
		g.add(reel);
		reels.push(reel);
	}
	g.add(ctx.box(4.8, .2, 1.2, M.graphite, 0, 0, 1));
	g.add(ctx.box(2.4, 1.4, 1.1, M.white, 0, 0, -.9));
	stackLight(ctx, g, 1, 1.4, -1.3, blink);
	return {
		group: g,
		colliders: [{
			x: -1.5,
			z: .4,
			r: 1.5
		}, {
			x: 1.5,
			z: .4,
			r: 1.5
		}],
		update: (t) => reels.forEach((r, i) => r.rotation.z = t * (.6 + i * .15))
	};
}
const t = (len, h, body, inside) => (ctx, blink) => tunnel(ctx, len, h, body, inside, blink);
/**
* The recipe, floor by floor, from the smallest parts at the top to the
* largest assembly at the bottom — everything from raw material, in one dome:
* silicon from quartz, copper wire and cable, the electronics, glass from
* sand, then the modules, their frames, and the dome kits they leave in.
*/
const RECIPE = /* @__PURE__ */ (() => [
	[
		{
			name: "Aluminium extrusion",
			note: "billets pressed into frame profiles",
			make: t(9, 2.6, M.graphite, M.furnace)
		},
		{
			name: "Anodising",
			note: "the frames sealed against the weather",
			make: t(6, 2.4, M.white, M.wash)
		},
		{
			name: "Framing",
			note: "triangle frame and gasket pressed on",
			make: t(4.2, 2.6, M.white, M.amber),
			arm: true
		},
		{
			name: "Sun simulator",
			note: "IV curve under a 1000 W/m² flash",
			make: (ctx) => flashBooth(ctx),
			arm: true
		},
		{
			name: "EL final",
			note: "electroluminescence: every crack shows",
			make: t(4, 2.4, M.white, M.screen)
		},
		{
			name: "Hi-pot",
			note: "insulation test at 3 kV",
			make: t(3.4, 2.2, M.white, M.amber)
		},
		{
			name: "Grading & labels",
			note: "power class, serial, the dome it is for",
			make: t(3, 2, M.grey, M.screen),
			arm: true
		},
		{
			name: "Strut welding",
			note: "steel struts for the dome frame",
			make: t(5, 2.4, M.graphite, M.ir),
			arm: true
		},
		{
			name: "Hub machining",
			note: "every hub milled to its angles",
			make: t(3.4, 2.4, M.grey, M.screen),
			arm: true
		},
		{
			name: "Dome kits",
			note: "triangles, struts and hubs, sorted by dome",
			make: (ctx) => gantry(ctx, 7, 8, M.cellBlue),
			arm: true
		},
		{
			name: "Packing",
			note: "onto A-frame racks",
			make: t(3.6, 2.6, M.white, null),
			arm: true
		},
		{
			name: "Stretch wrap",
			note: "each rack wrapped for the road",
			make: t(3, 2.8, M.graphite, M.film)
		},
		{
			name: "Dispatch",
			note: "out to the domes of the village",
			make: t(3, 2.6, M.white, M.light)
		}
	],
	[
		{
			name: "Encapsulant",
			note: "POE film extruded from pellets",
			make: t(6, 2.4, M.white, M.film)
		},
		{
			name: "Stringer 1",
			note: "cells and ribbons soldered into strings",
			make: t(8, 1.9, M.white, M.ir)
		},
		{
			name: "Stringer 2",
			note: "cells and ribbons soldered into strings",
			make: t(8, 1.9, M.white, M.ir)
		},
		{
			name: "Glass & film",
			note: "front glass in from below, film laid on",
			make: t(3.4, 2.4, M.white, M.film),
			arm: true
		},
		{
			name: "String layup",
			note: "strings placed by gantry",
			make: (ctx) => gantry(ctx, 6, 7, M.cellBlue)
		},
		{
			name: "Bussing",
			note: "busbars soldered across",
			make: t(3.6, 2.2, M.white, M.ir),
			arm: true
		},
		{
			name: "Back glass",
			note: "glass both sides: light between the cells",
			make: (ctx) => gantry(ctx, 5, 9, M.glassWall),
			arm: true
		},
		{
			name: "EL check",
			note: "before lamination, while it can be fixed",
			make: t(3.6, 2.4, M.white, M.screen)
		},
		{
			name: "Laminators",
			note: "vacuum, 145 °C, fifteen minutes",
			make: (ctx, b) => laminators(ctx, b),
			arm: true
		},
		{
			name: "Laminators",
			note: "three presses, stacked",
			make: (ctx, b) => laminators(ctx, b),
			arm: true
		},
		{
			name: "Trimming",
			note: "excess film cut from the edges",
			make: t(3.4, 2.2, M.grey, M.laser),
			arm: true
		},
		{
			name: "Junction box",
			note: "glued on, cables soldered, potted",
			make: t(3.4, 2.2, M.grey, M.screen),
			arm: true
		}
	],
	[
		{
			name: "Batch house",
			note: "sand, soda ash, limestone, dolomite, weighed and mixed",
			make: (ctx, b) => silos(ctx, b)
		},
		{
			name: "Melting furnace",
			note: "1550 °C: the batch becomes glass",
			make: t(10, 3, M.graphite, M.furnace)
		},
		{
			name: "Float bath",
			note: "molten glass floats on liquid tin, dead flat",
			make: (ctx, b) => floatBath(ctx, b)
		},
		{
			name: "Annealing lehr",
			note: "cooled slowly, free of stress",
			make: t(10, 2.2, M.white, M.amber)
		},
		{
			name: "Cutting",
			note: "triangles scored and broken",
			make: (ctx) => gantry(ctx, 6, 6, M.glassWall),
			arm: true
		},
		{
			name: "Edge grinding",
			note: "every edge seamed",
			make: t(4, 2.2, M.white, M.wash)
		},
		{
			name: "Washing",
			note: "deionised water, dried by air knives",
			make: t(5, 2.4, M.white, M.wash)
		},
		{
			name: "Tempering",
			note: "700 °C, then quenched by air",
			make: t(12, 2.6, M.graphite, M.furnace)
		},
		{
			name: "AR coating",
			note: "anti-reflective: more light through",
			make: t(5, 2.4, M.white, M.amber)
		},
		{
			name: "Inspection",
			note: "scanned for flaws",
			make: t(3, 2.2, M.grey, M.screen),
			arm: true
		}
	],
	[
		{
			name: "Wire drawing",
			note: "copper rod drawn down to wire",
			make: t(6, 2, M.grey, M.amber)
		},
		{
			name: "Annealing",
			note: "the drawn wire softened again",
			make: t(4, 2.2, M.graphite, M.furnace)
		},
		{
			name: "Ribbon line",
			note: "flattened, tin-plated: the ribbons that join the cells",
			make: t(5, 2.2, M.white, M.amber)
		},
		{
			name: "Cable extrusion",
			note: "insulation round the copper: solar cable",
			make: t(8, 2.2, M.white, M.ir)
		},
		{
			name: "Cable drums",
			note: "the cable wound onto reels",
			make: (ctx, b) => drums(ctx, b)
		},
		{
			name: "Connectors",
			note: "plug housings, injection-moulded",
			make: t(3.4, 2.6, M.grey, M.screen),
			arm: true
		},
		{
			name: "Box moulding",
			note: "junction box and lid",
			make: t(3.4, 2.6, M.grey, M.screen),
			arm: true
		},
		{
			name: "Paste printer",
			note: "solder paste on the circuit boards",
			make: t(2.6, 2, M.white, M.light)
		},
		{
			name: "Pick and place",
			note: "diodes and chips, twenty thousand an hour",
			make: (ctx) => gantry(ctx, 4, 3, M.screen)
		},
		{
			name: "Reflow oven",
			note: "the boards soldered at 245 °C",
			make: t(6, 2, M.white, M.furnace)
		},
		{
			name: "Optical inspection",
			note: "every joint checked by camera",
			make: t(2.8, 2.2, M.grey, M.screen)
		},
		{
			name: "Box assembly",
			note: "board, diodes and cables into the box",
			make: t(3.4, 2.2, M.white, M.amber),
			arm: true
		}
	],
	[
		{
			name: "Arc furnace",
			note: "quartz and carbon become silicon, 1900 °C",
			make: (ctx, b) => arcFurnace(ctx, b)
		},
		{
			name: "Purification",
			note: "silicon refined to 99.9999 %",
			make: t(5, 2.8, M.graphite, M.amber)
		},
		{
			name: "Ingot puller",
			note: "one crystal pulled from the melt, 1420 °C",
			make: (ctx, b) => puller(ctx, b)
		},
		{
			name: "Ingot puller",
			note: "a crystal a day from each",
			make: (ctx, b) => puller(ctx, b)
		},
		{
			name: "Wire saw",
			note: "wafers sliced 150 µm thin",
			make: t(4, 2.4, M.white, M.wash),
			arm: true
		},
		{
			name: "Texturing",
			note: "etched to trap the light",
			make: t(5, 2.2, M.white, M.wash)
		},
		{
			name: "Diffusion",
			note: "the p–n junction, 850 °C",
			make: t(7, 2.4, M.graphite, M.furnace)
		},
		{
			name: "PECVD",
			note: "the blue anti-reflective layer",
			make: t(5, 2.4, M.white, M.screen)
		},
		{
			name: "Screen printing",
			note: "silver fingers and busbars",
			make: t(3.6, 2.2, M.grey, M.light),
			arm: true
		},
		{
			name: "Firing",
			note: "contacts fired in at 800 °C",
			make: t(6, 2.2, M.white, M.furnace)
		},
		{
			name: "Cell tester",
			note: "every cell sorted by IV and EL",
			make: t(3, 2.2, M.grey, M.screen),
			arm: true
		}
	]
])();
function buildFactory(ctx) {
	const { scene, R, box, bake } = ctx;
	const colliders = [];
	const updates = [];
	const blink = [];
	const slabOuter = (y) => Math.sqrt(R * R - (y + 2.5) ** 2) - 1.2;
	const stationAngles = [];
	/** every machine, for the sound of the one nearest you */
	const machines = [];
	const beltY = (_a, _ring) => BELT;
	const BR = {
		a: 43.1,
		b: 46.4,
		c: 49.6,
		d: 52.9,
		h: 1.95,
		half: 1.15
	};
	/** The height of a footbridge's deck or steps above its floor at (x, z), or null off every bridge. */
	const bridgeY = (x, z) => {
		const rr = Math.hypot(x, z);
		if (rr < BR.a || rr > BR.d) return null;
		const a = Math.atan2(x, z);
		if (!DOORS$1.some((d) => Math.abs(adiff$1(a, d)) * rr < BR.half)) return null;
		if (rr < BR.b) return BR.h * (rr - BR.a) / (BR.b - BR.a);
		if (rr > BR.c) return BR.h * (BR.d - rr) / (BR.d - BR.c);
		return BR.h;
	};
	const onBridge = (x, z) => {
		const rr = Math.hypot(x, z), a = Math.atan2(x, z);
		return rr >= 10.8 && rr <= 17.2 && SPURS.some((s) => Math.abs(adiff$1(a, s)) * rr < 1.9);
	};
	const CABIN = 6.15;
	const DOOR_HALF = 1.5;
	const inCabin = (x, z) => Math.hypot(x, z) < CORE;
	let cabY = 0;
	let target = 0;
	let lastT = 0;
	let held = 0;
	let arrived = 0;
	let px = 0, pz = R - 8, pf = 0;
	const idle = () => Math.abs(cabY - LEVELS[target]) < .01;
	const nearestLevel = (y) => LEVELS.reduce((best, ly, k) => Math.abs(ly - y) < Math.abs(LEVELS[best] - y) ? k : best, 0);
	const levelFloor = (k, x, z) => {
		const rr = Math.hypot(x, z);
		if (rr < CORE) return false;
		if (k === 0) return true;
		if (rr >= FLOOR_IN && rr <= slabOuter(LEVELS[k])) return true;
		if (rr <= LANDING) return true;
		return onBridge(x, z);
	};
	const hasFloorAt = (x, z, y) => {
		if (inCabin(x, z)) return Math.abs(cabY - y) < .35;
		const by = bridgeY(x, z);
		if (by !== null && LEVELS.some((ly) => Math.abs(ly + by - y) < .45)) return true;
		return LEVELS.some((ly, k) => Math.abs(ly - y) < .35 && levelFloor(k, x, z));
	};
	/** Into or out of the cabin only through one of its four doors, and only when it stands at your floor. */
	const throughDoor = (x, z) => SPURS.some((s) => Math.abs(adiff$1(Math.atan2(x, z), s)) * CORE < 1.2);
	const top = LEVELS[LEVELS.length - 1] + 6;
	{
		const tower = new three.Group();
		const gap = DOOR_HALF / CORE;
		for (const s of SPURS) {
			const wall = new three.Mesh(new three.CylinderGeometry(CORE, CORE, top, 32, 1, true, s + gap, Math.PI / 2 - 2 * gap), M.glassWall);
			wall.position.y = top / 2;
			scene.add(wall);
			for (const sd of [-1, 1]) {
				const [x, z] = polar$1(CORE, s + sd * gap);
				tower.add(box(.28, top, .28, M.graphite, x, 0, z));
			}
		}
		for (const d of DOORS$1) {
			const [x, z] = polar$1(CORE, d);
			tower.add(box(.36, top, .36, M.graphite, x, 0, z));
		}
		for (const y of LEVELS) {
			const band = new three.Mesh(new three.TorusGeometry(CORE, .14, 6, 64), M.graphite);
			band.rotation.x = Math.PI / 2;
			band.position.y = y + 3.1;
			tower.add(band);
		}
		const room = new three.Mesh(new three.CylinderGeometry(6.9, 6.9, 2.4, 32), M.white);
		room.position.y = top + 1.2;
		tower.add(room);
		tower.add(box(14, .3, 1.2, M.orange, 0, top + 2.4, 0));
		const sheave = new three.Mesh(new three.TorusGeometry(.8, .12, 8, 24), M.graphite);
		sheave.position.set(0, top + 3.3, 0);
		tower.add(sheave);
		tower.add(box(1.4, 1.1, 1.1, M.blue, 1.6, top + 2.7, 0));
		scene.add(bake(tower));
	}
	const cabin = new three.Group();
	{
		cabin.add(box(.1, .1, .1, M.graphite));
		const floor = new three.Mesh(new three.CylinderGeometry(CABIN, CABIN, .25, 48), M.graphite);
		floor.position.y = -.125;
		cabin.add(floor);
		const tread = new three.Mesh(new three.CircleGeometry(6.050000000000001, 48), M.slab);
		tread.rotation.x = -Math.PI / 2;
		tread.position.y = .01;
		cabin.add(tread);
		const roof = new three.Mesh(new three.CylinderGeometry(CABIN, CABIN, .3, 48), M.white);
		roof.position.y = 3;
		cabin.add(roof);
		const light = new three.Mesh(new three.CircleGeometry(5.3500000000000005, 40), M.light);
		light.rotation.x = Math.PI / 2;
		light.position.y = 2.84;
		cabin.add(light);
		const gap = DOOR_HALF / CABIN;
		for (const s of SPURS) {
			const wall = new three.Mesh(new three.CylinderGeometry(CABIN, CABIN, 2.85, 24, 1, true, s + gap, Math.PI / 2 - 2 * gap), M.glassWall);
			wall.position.y = 1.43;
			cabin.add(wall);
			const rail = new three.Mesh(new three.TorusGeometry(6.03, .035, 6, 24, Math.PI / 2 - 2 * gap), M.steel);
			rail.rotation.x = -Math.PI / 2;
			const holder = new three.Group();
			holder.add(rail);
			holder.rotation.y = s + gap - Math.PI / 2;
			holder.position.y = 1;
			cabin.add(holder);
			for (const sd of [-1, 1]) {
				const [x, z] = polar$1(CABIN, s + sd * gap);
				cabin.add(box(.14, 2.85, .14, M.steel, x, 0, z));
			}
		}
		cabin.add(box(.3, 1.2, .3, M.graphite, 0, 0, 0));
		const panel = box(.5, .35, .05, M.screen, 0, 1.15, .16);
		panel.rotation.x = -.4;
		cabin.add(panel);
		cabin.add(box(1.8, .15, 1.2, M.graphite, -2.8, 0, 0));
		for (const sd of [-1, 1]) {
			const leaf = box(1.7, 1.7, .06, M.cellBlue, -2.8, .15, sd * .25);
			leaf.rotation.x = sd * .12;
			cabin.add(leaf);
		}
		cabin.traverse((o) => o.castShadow = true);
		scene.add(cabin);
	}
	colliders.push({
		x: 0,
		z: 0,
		r: .35,
		y: 0
	});
	colliders.push({
		x: -2.8,
		z: 0,
		r: 1.1,
		y: 0
	});
	const ropes = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => {
		const r = new three.Mesh(new three.CylinderGeometry(.03, .03, 1, 5), M.steel);
		r.position.set(sx * .5, 0, sz * .5);
		scene.add(r);
		return r;
	}));
	updates.push((time) => {
		const dt = Math.min(.1, time - lastT);
		lastT = time;
		const goal = LEVELS[target];
		const dist = goal - cabY;
		const v = Math.sign(dist) * Math.min(2.5, Math.max(.35, Math.abs(dist) * 1.6));
		const was = cabY;
		cabY = Math.abs(dist) < Math.abs(v * dt) ? goal : cabY + v * dt;
		if (was !== goal && cabY === goal) arrived = time;
		if (held && idle() && time - arrived > 1.2 && inCabin(px, pz)) {
			const next = Math.max(0, Math.min(LEVELS.length - 1, target + held));
			if (next !== target) target = next;
		}
		cabin.position.y = cabY;
		for (const c of cabinColliders) c.y = cabY;
		for (const r of ropes) {
			const len = top + 2.4 - (cabY + 3.15);
			r.scale.y = Math.max(.01, len);
			r.position.y = cabY + 3.15 + len / 2;
		}
		const rr = Math.hypot(px, pz);
		if (idle() && rr >= CORE && rr < 9.7 && Math.abs(pf - cabY) > .5) target = nearestLevel(pf);
	});
	const cabinColliders = colliders.filter((c) => c.x === -2.8 || c.x === 0 && c.z === 0 && c.r === .35);
	for (let k = 0; k < LEVELS.length; k++) {
		const y = LEVELS[k];
		const outer = k === 0 ? R - 1 : slabOuter(y);
		const g = new three.Group();
		if (k > 0) {
			const slab = new three.Mesh(new three.RingGeometry(FLOOR_IN, outer, 160, 1), M.slab);
			slab.rotation.x = -Math.PI / 2;
			slab.position.y = y;
			slab.receiveShadow = true;
			scene.add(slab);
			const land = new three.Mesh(new three.RingGeometry(CORE, LANDING, 64, 1), M.slab);
			land.rotation.x = -Math.PI / 2;
			land.position.y = y;
			scene.add(land);
			for (const ring of [[FLOOR_IN, outer], [CORE, LANDING]]) {
				const under = new three.Mesh(new three.RingGeometry(ring[0], ring[1], 96, 1), M.under);
				under.rotation.x = Math.PI / 2;
				under.position.y = y - .45;
				scene.add(under);
				for (const rr of ring) {
					const edge = new three.Mesh(new three.CylinderGeometry(rr, rr, .45, 96, 1, true), M.under);
					edge.position.y = y - .22;
					edge.material.side = three.DoubleSide;
					scene.add(edge);
				}
			}
			for (const rr of [
				19,
				31,
				49
			]) {
				if (rr > outer - 1) continue;
				const count = Math.round(2 * Math.PI * rr / 5);
				const fittings = new three.InstancedMesh(new three.BoxGeometry(1.6, .08, .35), M.light, count);
				const m4 = new three.Matrix4();
				for (let i = 0; i < count; i++) {
					const a = i / count * Math.PI * 2;
					const [x, z] = polar$1(rr, a);
					fittings.setMatrixAt(i, m4.makeRotationY(a + Math.PI / 2).setPosition(x, y - .55, z));
				}
				scene.add(fittings);
			}
			for (const rr of [31.8, 46]) {
				if (rr > outer - 2) continue;
				const duct = new three.Mesh(new three.TorusGeometry(rr, .32, 8, 160), M.duct);
				duct.rotation.x = Math.PI / 2;
				duct.position.y = y - 1.05;
				scene.add(duct);
			}
			for (const s of SPURS) {
				const [x, z] = polar$1(14, s);
				g.add(box(3.8, .45, 6.4, M.slab, x, y - .45, z, s));
				for (const side of [-1, 1]) {
					const [ox, oz] = polar$1(1.85, s + Math.PI / 2);
					g.add(box(.06, 1.05, 6, M.steel, x + ox * side, y, z + oz * side, s));
				}
			}
			for (const rr of [FLOOR_IN, LANDING]) {
				const gap = 1.95 / rr;
				for (const s of SPURS) {
					const arc = Math.PI / 2 - 2 * gap;
					const glass = new three.Mesh(new three.CylinderGeometry(rr, rr, 1.05, 32, 1, true, s + gap, arc), M.glassWall);
					glass.position.y = y + .52;
					scene.add(glass);
					const topRail = new three.Mesh(new three.TorusGeometry(rr, .04, 6, 40, arc), M.steel);
					topRail.rotation.x = -Math.PI / 2;
					const holder = new three.Group();
					holder.add(topRail);
					holder.rotation.y = s + gap - Math.PI / 2;
					holder.position.y = y + 1.05;
					scene.add(holder);
				}
			}
			const h = y - LEVELS[k - 1] - .45;
			for (const rr of [17.5, outer - 2.5]) for (let c = 0; c < 16; c++) {
				const a = (c + .5) / 16 * Math.PI * 2;
				const [x, z] = polar$1(rr, a);
				g.add(box(.6, h, .6, M.grey, x, LEVELS[k - 1], z));
				colliders.push({
					x,
					z,
					r: .5,
					y: LEVELS[k - 1]
				});
			}
		} else {
			const floor = new three.Mesh(new three.CircleGeometry(R - .3, 128), M.slab);
			floor.rotation.x = -Math.PI / 2;
			floor.position.y = .012;
			floor.receiveShadow = true;
			scene.add(floor);
		}
		const stations = RECIPE[k];
		const parts = stageParts(k, stations.length);
		const placedAt = [];
		stationAngles.push(placedAt);
		const aStart = SPURS[0];
		const clearOf = (a) => DOORS$1.every((d) => Math.abs(adiff$1(a, d)) * MAIN > 9) && SPURS.every((sp) => Math.abs(adiff$1(a, sp)) * MAIN > 4.5);
		const free = [];
		for (let t = .01; t < Math.PI * 2 - .01; t += .004) if (clearOf(aStart + t)) free.push(aStart + t);
		const extra = Math.min(stations.length * 2, Math.max(stations.length, Math.floor(free.length * .004 * MAIN / 11))) - stations.length;
		const doubled = new Set(Array.from({ length: extra }, (_, j) => Math.floor((j + .5) * stations.length / extra)));
		const which = stations.flatMap((_, i) => doubled.has(i) ? [i, i] : [i]);
		const spokes = [];
		which.forEach((i, j) => {
			const st = stations[i];
			const twin = j > 0 && which[j - 1] === i;
			const a = free[Math.floor((j + .5) * free.length / which.length)];
			const part = st.make(ctx, blink);
			const bb = new three.Box3().setFromObject(part.group);
			const half = Math.max(-bb.min.x, bb.max.x);
			const scale = Math.min(1.15, 5 / half);
			const inner = 23;
			const rs = inner + half * scale;
			const outerEnd = rs + half * scale;
			spokes.push({
				a,
				inner,
				outer: outerEnd,
				si: i
			});
			placedAt.push({
				a,
				r: 21.7
			});
			const [mx, mz] = polar$1((inner + outerEnd) / 2, a);
			machines.push({
				x: mx,
				z: mz,
				y
			});
			(globalThis.__factoryStations ??= []).push({
				k,
				a,
				name: st.name,
				inner,
				outer: outerEnd
			});
			const [x, z] = polar$1(rs, a);
			const th = a + Math.PI / 2;
			part.group.position.set(x, y, z);
			part.group.rotation.y = th;
			part.group.scale.setScalar(scale);
			scene.add(part.group);
			const c = Math.cos(th), sn = Math.sin(th);
			for (const p of part.colliders) colliders.push({
				x: x + scale * (p.x * c + p.z * sn),
				z: z + scale * (-p.x * sn + p.z * c),
				r: p.r * scale,
				y
			});
			if (part.update) updates.push(part.update);
			const from = outerEnd - .7;
			const len = 46.85 - from;
			const tx = Math.cos(a), tz = -Math.sin(a);
			for (const side of [-1, 1]) {
				const [lx, lz] = polar$1(from + len / 2, a);
				const ox = lx + tx * side * 1.05, oz = lz + tz * side * 1.05;
				g.add(box(1.25, .1, len, M.belt, ox, y + BELT - .1, oz, a));
				for (const rail of [-.66, .66]) g.add(box(.06, .14, len, M.graphite, ox + tx * rail, y + BELT - .05, oz + tz * rail, a));
				for (let l = 1; l < len; l += 2.6) {
					const [px, pz] = polar$1(from + l, a);
					g.add(box(.08, .8, .08, M.steel, px + tx * side * 1.05, y, pz + tz * side * 1.05));
				}
			}
			for (let l = 1.2; l < len; l += 2.4) {
				const [cx, cz] = polar$1(from + l, a);
				colliders.push({
					x: cx,
					z: cz,
					r: 1.5,
					y
				});
			}
			{
				const [hx, hz] = polar$1(from + len * .55, a);
				for (const side of [-1, 1]) g.add(box(.12, 2.3, .12, M.graphite, hx + tx * side * 1.85, y, hz + tz * side * 1.85));
				g.add(box(3.9, .26, .26, M.graphite, hx, y + 2.3, hz, a + Math.PI / 2));
				g.add(box(3.2, .04, .16, M.wash, hx, y + 2.27, hz, a + Math.PI / 2));
			}
			for (const side of [-1, 1]) {
				const [mx, mz] = polar$1(46.4, a);
				g.add(box(1.3, 1.05, 1.2, M.grey, mx + tx * side * 1.05, y, mz + tz * side * 1.05, a));
			}
			if (!twin) {
				const [bx, bz] = polar$1(21.6, a);
				const board = new three.Mesh(new three.PlaneGeometry(3.4, .78), sign(`${k}.${i + 1}`, st.name, st.note));
				board.position.set(bx, y + 4.3, bz);
				board.rotation.y = a + Math.PI;
				scene.add(board);
				g.add(box(.04, 1.4, .04, M.steel, bx, y + 4.7, bz));
			}
			if (st.arm && !twin) {
				const [ax, az] = polar$1(outerEnd + 1.6, a);
				const px = ax + tx * 3.1, pz = az + tz * 3.1;
				const arm = robotArm(ctx, i % 2 ? M.orange : M.white, 0, Math.PI * .75, 5 + i % 3, i * .37);
				arm.group.position.set(px, y, pz);
				arm.group.rotation.y = a - Math.PI / 2;
				arm.group.scale.setScalar(.8);
				scene.add(arm.group);
				colliders.push({
					x: px,
					z: pz,
					r: 1.3,
					y
				});
				updates.push(arm.update);
				const fence = new three.Mesh(new three.CylinderGeometry(1.3, 1.3, 1.3, 18, 1, true, a - Math.PI / 2 + .6, Math.PI * 2 - 1.2), M.fence);
				fence.position.set(px, y + .65, pz);
				scene.add(fence);
			}
		});
		{
			const pos = [], idx = [];
			const steps = 560;
			for (let i = 0; i <= steps; i++) {
				const a = i / steps * Math.PI * 2;
				const by = y + beltY(a, MAIN);
				const [x0, z0] = polar$1(46.9, a);
				const [x1, z1] = polar$1(49.1, a);
				pos.push(x0, by, z0, x1, by, z1);
				if (i < steps) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
			}
			const geo = new three.BufferGeometry();
			geo.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
			geo.setIndex(idx);
			geo.computeVertexNormals();
			const belt = new three.Mesh(geo, M.belt);
			belt.material.side = three.DoubleSide;
			scene.add(belt);
			const legs = Math.round(2 * Math.PI * MAIN / 2.6);
			for (let i = 0; i < legs; i++) {
				const a = i / legs * Math.PI * 2;
				const by = beltY(a, MAIN);
				for (const side of [-1, 1]) {
					const [lx, lz] = polar$1(MAIN + side * 1.2, a);
					g.add(box(.1, by, .1, M.steel, lx, y, lz));
					const [fx, fz] = polar$1(MAIN + side * 1.25, a);
					g.add(box(2.7, .18, .08, M.graphite, fx, y + by - .05, fz, a + Math.PI / 2));
				}
				if (by < 1.3) {
					const [cx, cz] = polar$1(MAIN, a);
					colliders.push({
						x: cx,
						z: cz,
						r: 1.4,
						y
					});
				}
			}
			for (const rr of [
				45.8,
				50.2,
				18.8
			]) {
				const lane = new three.Mesh(new three.RingGeometry(rr - .06, rr + .06, 240, 1), M.yellow);
				lane.rotation.x = -Math.PI / 2;
				lane.position.y = y + .02;
				scene.add(lane);
			}
		}
		for (const d of DOORS$1) {
			const tx = Math.cos(d), tz = -Math.sin(d);
			const steps = 8;
			for (const [r0, r1] of [[BR.a, BR.b], [BR.d, BR.c]]) for (let i = 0; i < steps; i++) {
				const rr = r0 + (i + .5) / steps * (r1 - r0);
				const [x, z] = polar$1(rr, d);
				g.add(box(BR.half * 2, .08, Math.abs(r1 - r0) / steps + .04, M.grey, x, y + (i + 1) / steps * BR.h - .08, z, d));
				g.add(box(BR.half * 2 + .02, .02, .06, M.yellow, x, y + (i + 1) / steps * BR.h, z, d));
			}
			const [dx, dz] = polar$1(MAIN, d);
			g.add(box(BR.half * 2, .14, BR.c - BR.b + .1, M.grey, dx, y + BR.h - .14, dz, d));
			for (const side of [-1, 1]) {
				const ox = tx * side * BR.half, oz = tz * side * BR.half;
				for (const [rr, hh] of [
					[BR.a + .3, .2],
					[BR.b, BR.h],
					[MAIN, BR.h],
					[BR.c, BR.h],
					[BR.d - .3, .2]
				]) {
					const [px, pz] = polar$1(rr, d);
					g.add(box(.06, hh + 1, .06, M.yellow, px + ox, y, pz + oz));
				}
				for (const [r0, r1, h0, h1] of [
					[
						BR.a + .3,
						BR.b,
						.2,
						BR.h
					],
					[
						BR.b,
						BR.c,
						BR.h,
						BR.h
					],
					[
						BR.c,
						BR.d - .3,
						BR.h,
						.2
					]
				]) {
					const a = new three.Vector3(...polar$1(r0, d).flatMap((v, i) => i === 0 ? [v + ox, y + h0 + 1] : [v + oz]));
					const b = new three.Vector3(...polar$1(r1, d).flatMap((v, i) => i === 0 ? [v + ox, y + h1 + 1] : [v + oz]));
					const rail = new three.Mesh(new three.CylinderGeometry(.035, .035, a.distanceTo(b), 6), M.yellow);
					rail.position.copy(a).add(b).multiplyScalar(.5);
					rail.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
					g.add(rail);
				}
			}
		}
		for (const sp of SPURS) {
			const len = 37;
			const [x, z] = polar$1(59 / 2, sp);
			g.add(box(1.3, .2, len, M.belt, x, y + 3.6, z, sp));
			for (const side of [-1, 1]) {
				const [ox, oz] = polar$1(.7, sp + Math.PI / 2);
				g.add(box(.08, .3, len, M.steel, x + ox * side, y + 3.55, z + oz * side, sp));
			}
			const [dx, dz] = polar$1(MAIN, sp);
			g.add(box(1.5, 2.6, 1.5, M.grey, dx, y + 1.2, dz, sp));
			g.add(box(.1, .8, .1, M.steel, dx, y + 3.8, dz));
		}
		{
			const n = Math.round(2 * Math.PI * MAIN / 3.6);
			const perLane = 3;
			const cap = n + spokes.length * perLane * 2 + 4;
			const meshes = parts.geos.map((geo) => {
				const mesh = new three.InstancedMesh(geo, parts.material, cap);
				mesh.frustumCulled = false;
				mesh.castShadow = true;
				mesh.count = 0;
				scene.add(mesh);
				return mesh;
			});
			const order = spokes.map((s) => ({
				o: ((s.a - aStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2),
				si: s.si
			}));
			const stageAt = (a) => {
				const d = ((a - aStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
				let stage = 0;
				for (const s of order) if (s.o < d) stage = Math.max(stage, s.si + 1);
				return stage;
			};
			const counts = meshes.map(() => 0);
			const m4 = new three.Matrix4(), q = new three.Quaternion(), tilt = new three.Quaternion(), e = new three.Euler(), p = new three.Vector3(), one = new three.Vector3(1, 1, 1), zAxis = new three.Vector3(0, 0, 1);
			const put = (stage, mat) => {
				const mesh = meshes[Math.min(stage, meshes.length - 1)];
				const i = counts[Math.min(stage, meshes.length - 1)]++;
				if (i < cap) mesh.setMatrixAt(i, mat);
			};
			updates.push((time) => {
				counts.fill(0);
				for (let i = 0; i < n; i++) {
					const ang = i / n * Math.PI * 2 + time * .6 / MAIN;
					const [x, z] = polar$1(MAIN, ang);
					const slope = (beltY(ang + .02, MAIN) - beltY(ang - .02, MAIN)) / (.04 * MAIN);
					p.set(x, y + beltY(ang, MAIN) + .04, z);
					q.setFromEuler(e.set(0, ang + Math.PI / 2, 0)).multiply(tilt.setFromAxisAngle(zAxis, Math.atan(slope)));
					put(stageAt(ang), m4.compose(p, q, one));
				}
				spokes.forEach((s, si) => {
					const tx = Math.cos(s.a), tz = -Math.sin(s.a);
					const from = s.outer - 1.2;
					const len = 46.85 - from;
					for (const side of [-1, 1]) for (let j = 0; j < perLane; j++) {
						const u = ((j / perLane + time * .05 + si * .13) % 1 + 1) % 1;
						const rr = side < 0 ? 46.85 - u * len : from + u * len;
						const [x, z] = polar$1(rr, s.a);
						p.set(x + tx * side * 1.05, y + BELT + .02, z + tz * side * 1.05);
						q.setFromEuler(e.set(0, s.a, 0));
						put(side < 0 ? s.si : s.si + 1, m4.compose(p, q, one));
					}
				});
				meshes.forEach((mesh, i) => {
					mesh.count = Math.min(cap, counts[i]);
					mesh.instanceMatrix.needsUpdate = true;
				});
			});
		}
		{
			const n = Math.floor(2 * Math.PI * MAIN / 4.6);
			for (let i = 0; i < n; i++) {
				const a = i / n * Math.PI * 2;
				if (beltY(a, MAIN) > .9500000000000001 || DOORS$1.some((d) => Math.abs(adiff$1(a, d)) * MAIN < 7)) continue;
				if (spokes.some((s) => Math.abs(adiff$1(a, s.a)) * MAIN < 3.6) || SPURS.some((sp) => Math.abs(adiff$1(a, sp)) * MAIN < 1.8)) continue;
				const kind = i % 3;
				const mod = new three.Group();
				if (kind === 0 || kind === 1) {
					for (const sd of [-1, 1]) {
						mod.add(box(3.6, .7, .04, M.glassWall, 0, 1, sd * 1.32));
						mod.add(box(.06, 1.7000000000000002, .06, M.steel, -1.8, 0, sd * 1.32), box(.06, 1.7000000000000002, .06, M.steel, 1.8, 0, sd * 1.32));
					}
					if (kind === 1) {
						mod.add(box(.14, 2.3, .14, M.graphite, 0, 0, -1.45), box(.14, 2.3, .14, M.graphite, 0, 0, 1.45));
						mod.add(box(.3, .3, 3.1, M.graphite, 0, 2.3, 0));
						mod.add(box(.18, .04, 2.6, M.wash, 0, 2.26, 0));
					}
				} else {
					mod.add(box(1.6, 2.8, 1.3, M.graphite, 0, 0, 2.2));
					const stock = [
						M.alu,
						M.cellBlue,
						M.glassWall,
						col("#b8693a", .35, .8),
						M.graphite
					][k];
					for (let sh = 0; sh < 6; sh++) mod.add(box(1.4, .03, 1.1, M.graphite, 0, .35 + sh * .42, 2.2), box(1.1, .14, .8, stock, 0, .38 + sh * .42, 2.2));
					const [bx, bz] = polar$1(50.2, a);
					colliders.push({
						x: bx,
						z: bz,
						r: 1,
						y
					});
				}
				const [mx, mz] = polar$1(MAIN, a);
				mod.position.set(mx, y, mz);
				mod.rotation.y = a;
				g.add(mod);
			}
		}
		{
			const stock = new three.Group();
			const outerAisle = Math.min(outer - 4, 56);
			const count = k === 0 ? 0 : 26;
			for (let i = 0; i < count; i++) {
				const sa = (i + .5) / count * Math.PI * 2;
				if (DOORS$1.some((d) => Math.abs(adiff$1(sa, d)) * outerAisle < 5)) continue;
				const [x, z] = polar$1(outerAisle, sa);
				const holder = new three.Group();
				if (k === 4 || k === 2 && i % 2) {
					holder.add(box(2.6, .15, 1.2, M.pallet));
					for (const bx of [-.65, .65]) holder.add(box(1.1, 1.2, 1.05, k === 4 && bx > 0 ? M.graphite : M.white, bx, .15, 0));
				} else if (k === 2) {
					holder.add(box(2.6, .15, 1.4, M.graphite));
					for (const sd of [-1, 1]) {
						const leaf = box(2.5, 2, .08, M.glassWall, 0, .15, sd * .25);
						leaf.rotation.x = sd * .12;
						holder.add(leaf);
					}
					holder.add(box(.1, 2.1, .1, M.orange, -1.2, .15, 0), box(.1, 2.1, .1, M.orange, 1.2, .15, 0));
				} else if (k === 3) {
					holder.add(box(2.6, .15, 1.2, M.pallet));
					const copper = col("#b8693a", .35, .8);
					for (const bx of [-.65, .65]) {
						const coil = new three.Mesh(new three.TorusGeometry(.42, .16, 8, 20), i % 2 ? copper : M.white);
						coil.rotation.x = Math.PI / 2;
						coil.position.set(bx, .33, 0);
						holder.add(coil);
					}
				} else if (k === 1 && i % 2) {
					holder.add(box(2.6, 2.2, .9, M.grey));
					for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) holder.add(box(.42, .34, .6, M.cassette, -1 + c * .5, .2 + r * .5, .2));
				} else if (k === 1) {
					holder.add(box(1.8, .15, 1.2, M.pallet));
					for (let r = 0; r < 3; r++) {
						const roll = new three.Mesh(new three.CylinderGeometry(.3, .3, 1.1, 18), M.film);
						roll.rotation.x = Math.PI / 2;
						roll.position.set(-.55 + r * .55, .47, 0);
						holder.add(roll);
					}
				} else {
					holder.add(box(2.8, .15, 1.1, M.pallet));
					for (let r = 0; r < 5; r++) holder.add(box(2.7, .1, 1, M.alu, 0, .18 + r * .12, 0));
					holder.add(box(.6, .4, .5, M.cardboard, .9, .8, 0));
				}
				holder.position.set(x, y, z);
				holder.rotation.y = sa + Math.PI / 2;
				stock.add(holder);
				colliders.push({
					x,
					z,
					r: 1.4,
					y
				});
			}
			scene.add(bake(stock));
		}
		for (const sp of DOORS$1) {
			const [x, z] = polar$1(6.75, sp);
			const board = new three.Mesh(new three.PlaneGeometry(4.2, .96), sign(`Floor ${k}`, NAMES[k], ""));
			board.position.set(x, y + 4.6, z);
			board.rotation.y = sp;
			scene.add(board);
		}
		scene.add(bake(g));
	}
	{
		const ROWS = [
			55.8,
			60.9,
			65.2
		];
		const LEVEL_Y = [
			.15,
			1.5,
			2.85,
			4.2
		];
		const bays = [];
		for (const r of ROWS) {
			const n = Math.floor(2 * Math.PI * r / 2.85);
			for (let i = 0; i < n; i++) {
				const a = i / n * Math.PI * 2;
				if (DOORS$1.some((d) => Math.abs(adiff$1(a, d)) * r < 7.5)) continue;
				bays.push({
					a,
					r
				});
				const [x, z] = polar$1(r, a);
				colliders.push({
					x,
					z,
					r: 1.45,
					y: 0
				});
			}
		}
		const inst = (geo, mat, count) => {
			const m = new three.InstancedMesh(geo, mat, count);
			m.castShadow = true;
			m.receiveShadow = true;
			scene.add(m);
			return m;
		};
		const uprights = inst(new three.BoxGeometry(.1, 5.4, 1.1).translate(0, 2.7, 0), M.blue, bays.length * 2);
		const beams = inst(new three.BoxGeometry(2.75, .12, .08), M.orange, bays.length * LEVEL_Y.length * 2);
		const pallets = inst(new three.BoxGeometry(1.2, .14, 1), M.pallet, bays.length * LEVEL_Y.length * 2);
		const goods = inst(new three.BoxGeometry(1.1, 1, .95).translate(0, .5, 0), new three.MeshStandardMaterial({
			color: "#ffffff",
			roughness: .8
		}), bays.length * LEVEL_Y.length * 2);
		const palette = [
			"#b8925e",
			"#b8925e",
			"#c9a46e",
			"#2c6f9e",
			"#d7ecf2",
			"#eef1f2",
			"#1c2c5a",
			"#a58158"
		];
		const m4 = new three.Matrix4(), q = new three.Quaternion(), e = new three.Euler(), p = new three.Vector3(), sc = new three.Vector3(), c = new three.Color();
		let iu = 0, ib = 0, ip = 0;
		let seed = 3;
		const rnd = () => (seed = seed * 1664525 + 1013904223 >>> 0) / 4294967296;
		for (const { a, r } of bays) {
			q.setFromEuler(e.set(0, a, 0));
			const along = (off, rad, y) => {
				const [x, z] = polar$1(r + rad, a);
				return p.set(x + Math.cos(a) * off, y, z - Math.sin(a) * off);
			};
			for (const sd of [-1, 1]) uprights.setMatrixAt(iu++, m4.compose(along(sd * 1.4, 0, 0), q, sc.set(1, 1, 1)));
			for (const ly of LEVEL_Y) {
				for (const sd of [-1, 1]) beams.setMatrixAt(ib++, m4.compose(along(0, sd * .5, ly + .9), q, sc.set(1, 1, 1)));
				for (const sd of [-1, 1]) {
					pallets.setMatrixAt(ip, m4.compose(along(sd * .68, 0, ly + .07), q, sc.set(1, 1, 1)));
					const h = rnd() < .12 ? .001 : .55 + rnd() * .6;
					goods.setMatrixAt(ip, m4.compose(along(sd * .68, 0, ly + .14), q, sc.set(1, h, 1)));
					goods.setColorAt(ip, c.set(palette[Math.floor(rnd() * palette.length)]));
					ip++;
				}
			}
		}
		for (const rr of [
			53.2,
			58.35,
			63.05
		]) {
			const lane = new three.Mesh(new three.RingGeometry(rr - 1.1, rr + 1.1, 200, 1), new three.MeshStandardMaterial({
				color: "#7a8580",
				roughness: .95
			}));
			lane.rotation.x = -Math.PI / 2;
			lane.position.y = .018;
			scene.add(lane);
		}
		const dock = new three.Group();
		for (const d of DOORS$1) {
			for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
				const rr = 52 + i * 3.6;
				const [x, z] = polar$1(rr, d);
				const off = sd * 4.3;
				const cx = x + Math.cos(d) * off, cz = z - Math.sin(d) * off;
				const crate = new three.Group();
				if (sd < 0) {
					crate.add(box(2.4, 1.3, 1.2, M.pallet), box(2.4, 1.3, 1.2, M.pallet, 0, 1.35, 0));
					crate.add(box(2.2, 1.1, .02, M.glassWall, 0, .1, .61));
				} else {
					crate.add(box(2.6, .15, 1.4, M.graphite));
					for (const lf of [-1, 1]) {
						const leaf = box(2.5, 2, .08, M.cellBlue, 0, .15, lf * .25);
						leaf.rotation.x = lf * .12;
						crate.add(leaf);
					}
				}
				crate.position.set(cx, 0, cz);
				crate.rotation.y = d + Math.PI / 2;
				dock.add(crate);
				colliders.push({
					x: cx,
					z: cz,
					r: 1.3,
					y: 0
				});
			}
			const [fx, fz] = polar$1(61, d);
			const fl = new three.Group();
			fl.add(box(1.2, 1.1, 2, M.orange, 0, .3, 0));
			for (const [wx, wz] of [
				[-.6, .6],
				[.6, .6],
				[-.6, -.6],
				[.6, -.6]
			]) {
				const wheel = new three.Mesh(new three.CylinderGeometry(.3, .3, .25, 14), M.rubber);
				wheel.rotation.z = Math.PI / 2;
				wheel.position.set(wx, .3, wz);
				fl.add(wheel);
			}
			for (const [gx, gz] of [
				[-.55, -.1],
				[.55, -.1],
				[-.55, .8],
				[.55, .8]
			]) fl.add(box(.07, 1.1, .07, M.graphite, gx, 1.4, gz));
			fl.add(box(1.2, .06, 1, M.graphite, 0, 2.5, .35));
			fl.add(box(1, 2.8, .15, M.graphite, 0, .1, 1.15));
			fl.add(box(.14, .06, 1.1, M.steel, -.3, .25, 1.75), box(.14, .06, 1.1, M.steel, .3, .25, 1.75));
			fl.add(box(.5, .1, .5, M.graphite, 0, 1.4, -.3));
			const off = 7.5;
			fl.position.set(fx + Math.cos(d) * off, 0, fz - Math.sin(d) * off);
			fl.rotation.y = d + Math.PI;
			dock.add(fl);
			colliders.push({
				x: fl.position.x,
				z: fl.position.z,
				r: 1.4,
				y: 0
			});
		}
		scene.add(bake(dock));
		const lifts = [58.35, 63.05].flatMap((aisle, ai) => DOORS$1.map((d, q) => {
			const g = new three.Group();
			g.add(box(1.2, .9, 2, M.white, 0, .25, 0));
			g.add(box(1.22, .12, 2.02, M.orange, 0, .95, 0));
			g.add(box(1.24, .06, .1, M.wash, 0, .7, -1.01));
			for (const [wx, wz] of [
				[-.6, .6],
				[.6, .6],
				[-.6, -.6],
				[.6, -.6]
			]) {
				const wheel = new three.Mesh(new three.CylinderGeometry(.28, .28, .22, 14), M.rubber);
				wheel.rotation.z = Math.PI / 2;
				wheel.position.set(wx, .28, wz);
				g.add(wheel);
			}
			for (const sx of [-.4, .4]) g.add(box(.1, 3.2, .12, M.graphite, sx, .1, 1.08));
			const lidar = new three.Mesh(new three.CylinderGeometry(.1, .1, .12, 12), M.graphite);
			lidar.position.set(0, 3.4, 1.08);
			g.add(lidar);
			const carriage = new three.Group();
			carriage.add(box(1, .5, .08, M.graphite, 0, 0, 1.2));
			carriage.add(box(.14, .06, 1.1, M.steel, -.3, 0, 1.75), box(.14, .06, 1.1, M.steel, .3, 0, 1.75));
			carriage.add(box(1.2, .14, 1, M.pallet, 0, .07, 1.75));
			carriage.add(box(1.1, .8, .95, (ai + q) % 2 ? M.cardboard : M.cassette, 0, .21, 1.75));
			carriage.position.y = .15;
			g.add(carriage);
			g.traverse((o) => o.castShadow = true);
			scene.add(g);
			return {
				g,
				carriage,
				aisle,
				a0: d + .2,
				a1: d + Math.PI / 2 - .2,
				phase: ai * 7 + q * 3
			};
		}));
		updates.push((time) => lifts.forEach(({ g, carriage, aisle, a0, a1, phase }) => {
			const T = time + phase;
			const cycle = Math.floor(T / 20), tau = T % 20;
			const forward = cycle % 2 === 0;
			const p = Math.min(1, tau / 10);
			const a = forward ? a0 + (a1 - a0) * smooth(p) : a1 - (a1 - a0) * smooth(p);
			const [x, z] = polar$1(aisle, a);
			g.position.set(x, 0, z);
			const turn = tau < 10 ? 0 : smooth(Math.min(1, (tau - 10) / 1.2)) * (tau > 18.8 ? smooth(Math.max(0, (20 - tau) / 1.2)) : 1);
			g.rotation.y = a + (forward ? Math.PI / 2 : -Math.PI / 2) + turn * (forward ? -Math.PI / 2 : Math.PI / 2);
			const up = tau < 11.2 ? 0 : Math.sin(Math.min(1, (tau - 11.2) / 7.6) * Math.PI);
			carriage.position.y = .15 + up * (1.5 + cycle % 3 * 1.35);
		}));
	}
	{
		const agvs = Array.from({ length: 6 + (LEVELS.length - 1) * 2 }, (_, i) => {
			const g = new three.Group();
			g.add(box(1.7, .32, 1.1, M.white, 0, .08, 0));
			g.add(box(1.72, .06, 1.12, M.orange, 0, .26, 0));
			const lamp = box(.2, .06, .08, M.wash, .86, .2, 0);
			g.add(lamp);
			const loaded = i < 6 && i % 2 === 0;
			if (i >= 6) g.add(box(1.2, .7, .9, M.cardboard, 0, .38, 0));
			g.add(box(.1, 1.5, .1, M.orange, -.6, .38, 0), box(.1, 1.5, .1, M.orange, .6, .38, 0));
			if (loaded) for (const sd of [-1, 1]) {
				const leaf = box(1.3, 1.3, .05, M.cellBlue, 0, .4, sd * .2);
				leaf.rotation.x = sd * .12;
				g.add(leaf);
			}
			g.traverse((o) => o.castShadow = true);
			scene.add(g);
			return {
				g,
				phase: i / 6
			};
		});
		const loop = (u, d) => {
			const aisle = 53.2;
			if (u < .7) {
				const a = d + u / .7 * Math.PI * 2;
				const [x, z] = polar$1(aisle, a);
				return [
					x,
					z,
					a + Math.PI / 2
				];
			}
			const v = (u - .7) / .3;
			const rr = v < .5 ? aisle + v / .5 * (R + 10 - aisle) : R + 10 - (v - .5) / .5 * (R + 10 - aisle);
			const [x, z] = polar$1(rr, d);
			return [
				x,
				z,
				v < .5 ? d : d + Math.PI
			];
		};
		updates.push((time) => agvs.forEach(({ g, phase }, i) => {
			if (i < 6) {
				const u = ((time / 90 + phase) % 1 + 1) % 1;
				const [x, z, yaw] = loop(u, DOORS$1[i % 4]);
				g.position.set(x, 0, z);
				g.rotation.y = yaw - Math.PI / 2;
				return;
			}
			const level = 1 + Math.floor((i - 6) / 2);
			const dir = i % 2 ? 1 : -1;
			const a = phase * 7 + dir * time * 1.1 / 52.2;
			const [x, z] = polar$1(52.2, a);
			g.position.set(x, LEVELS[level], z);
			g.rotation.y = a + (dir > 0 ? 0 : Math.PI);
		}));
	}
	{
		const walkers = [];
		let seed = 7;
		const rnd = () => (seed = seed * 1664525 + 1013904223 >>> 0) / 4294967296;
		for (let k = 0; k < LEVELS.length; k++) {
			const at = stationAngles[k];
			for (let i = 0; i < 11; i++) {
				const working = i < 4;
				const post = at[i * 2 % at.length];
				const aisles = k === 0 ? [
					18.8,
					50.6,
					58.35
				] : [18.8, 50.6];
				const aisle = working ? post.r : aisles[i % aisles.length];
				const a = working ? post.a : rnd() * Math.PI * 2;
				walkers.push({
					level: k,
					r: aisle,
					a,
					speed: (rnd() < .5 ? -1 : 1) * (1 + rnd() * .4),
					working,
					phase: rnd() * 10,
					kind: i % 2 ? "robot" : "person"
				});
			}
		}
		const c = crowd(walkers);
		scene.add(c.object);
		let last = 0;
		updates.push((time) => {
			c.update(time, Math.min(.1, time - last));
			last = time;
		});
	}
	updates.push((time) => blink.forEach((b, i) => b.material.emissiveIntensity = Math.sin(time * 3 + i) > -.3 ? 1.8 : .2));
	return {
		colliders,
		floorAt: (x, z, feet) => {
			if (inCabin(x, z)) return cabY;
			let best = 0;
			const by = bridgeY(x, z);
			LEVELS.forEach((ly, k) => {
				if (ly <= feet + .55 && ly > best && levelFloor(k, x, z)) best = ly;
				if (by !== null && ly + by <= feet + .55 && ly + by > best && levelFloor(k, x, z)) best = ly + by;
			});
			return best;
		},
		blocked: (x, z, here) => inCabin(x, z) !== inCabin(px, pz) && !throughDoor(x, z) || !hasFloorAt(x, z, here),
		tick: (x, z, feet) => {
			px = x;
			pz = z;
			pf = feet;
		},
		onKey: (k, down) => {
			if (!inCabin(px, pz) || k !== "arrowup" && k !== "arrowdown") return false;
			const dir = k === "arrowup" ? 1 : -1;
			if (!down) held = 0;
			else if (held !== dir) {
				held = dir;
				if (idle()) target = Math.max(0, Math.min(LEVELS.length - 1, target + dir));
			}
			return true;
		},
		floor: () => inCabin(px, pz) ? nearestLevel(cabY) : -1,
		sounds: (x, z, feet) => {
			let near = Infinity;
			for (const mc of machines) if (Math.abs(mc.y - feet) < 3) near = Math.min(near, Math.hypot(mc.x - x, mc.z - z));
			return {
				machine: near,
				lift: idle() ? Infinity : Math.hypot(x, z) + Math.abs(cabY - feet) * .5
			};
		},
		start: {
			x: 0,
			z: R - 8,
			look: 0
		},
		update: (time) => {
			for (const u of updates) u(time, 0);
		}
	};
}

//#endregion
//#piece 6fa14bc9f71080dc6eed4f7571b8ed4b1ae2d47f88bfd3f617bd036efba60f78
//#piece b41d5c6663f8c053838b96990cf45d86ed2277b72cf46c3999a41eebf001a233
}
/** what of a mesh's geometry a bake keeps, and each one's size */
const KEPT = {
	position: 3,
	normal: 3,
	uv: 2
};
const _v = /* @__PURE__ */ (() => new three.Vector3())();
const _nm = /* @__PURE__ */ (() => new three.Matrix3())();
/**
* A run of meshes of one material merged into one geometry, each where it stands: unindexed, its position, normal and uv
* only, as `mergeGeometries` made it of their clones — but written straight into one array per attribute, with no clone
* of each (a dome's garden is hundreds of thousands of leaves, and their clones held more than a gigabyte until the
* whole garden was merged). `add` writes the next mesh; null where they do not all carry the same of those three (as
* `mergeGeometries` answered), or one has morphs (made the old way).
*/
function merging(list) {
	const names = (g) => Object.keys(KEPT).filter((k) => g.attributes[k]);
	const first = names(list[0].geometry), same = first.join();
	if (list.some((o) => names(o.geometry).join() !== same || Object.keys(o.geometry.morphAttributes).length)) {
		const geos = [];
		return {
			add: (o) => void geos.push(cloned(o)),
			done: () => (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos)
		};
	}
	let n = 0;
	for (const o of list) n += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
	const out = Object.fromEntries(first.map((k) => [k, new Float32Array(n * KEPT[k])]));
	let at = 0;
	return {
		add: (o) => {
			const g = o.geometry, index = g.index, count = index ? index.count : g.attributes.position.count;
			const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
			const P = out.position, N = out.normal, U = out.uv;
			_nm.getNormalMatrix(o.matrixWorld);
			for (let j = 0; j < count; j++, at++) {
				const a = index ? index.getX(j) : j;
				_v.fromBufferAttribute(p, a).applyMatrix4(o.matrixWorld);
				P[at * 3] = _v.x;
				P[at * 3 + 1] = _v.y;
				P[at * 3 + 2] = _v.z;
				if (nrm && N) {
					_v.fromBufferAttribute(nrm, a).applyNormalMatrix(_nm);
					N[at * 3] = _v.x;
					N[at * 3 + 1] = _v.y;
					N[at * 3 + 2] = _v.z;
				}
				if (uv && U) {
					U[at * 2] = uv.getX(a);
					U[at * 2 + 1] = uv.getY(a);
				}
			}
		},
		done: () => {
			const merged = new three.BufferGeometry();
			for (const k of first) merged.setAttribute(k, new three.BufferAttribute(out[k], KEPT[k]));
			return merged;
		}
	};
}
/** a mesh's geometry where it stands, as a bake keeps it: a clone, unindexed, its position, normal and uv only */
function cloned(o) {
	const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
	for (const k of Object.keys(g.attributes)) if (!(k in KEPT)) g.deleteAttribute(k);
	return g.index ? g.toNonIndexed() : g;
}
/** a group's meshes by their material, in the order they come */
function byMaterial(group) {
	group.updateMatrixWorld(true);
	const byMat = /* @__PURE__ */ new Map();
	group.traverse((o) => {
		if (!(o instanceof three.Mesh)) return;
		const list = byMat.get(o.material) ?? [];
		list.push(o);
		byMat.set(o.material, list);
	});
	return byMat;
}
/**
* What a bake was made of, let go: the group emptied. A build's closures outlive it (its floors' and lamps' checks, its
* animations) and hold every group it made in the same block, so a baked group kept its meshes as long as the dome stood:
* a dome's garden is hundreds of thousands of them (half a million kept after a village's domes were built).
*/
function letGo(group) {
	for (const o of group.children) o.parent = null;
	group.children.length = 0;
}
/** a merged geometry as a baked mesh */
function bakedMesh(merged, mat, shadows) {
	merged.userData.baked = true;
	const m = new three.Mesh(merged, mat);
	m.castShadow = shadows;
	m.receiveShadow = true;
	return m;
}
/** Bakes a group into one mesh per material, so a forest costs a handful of draw calls; the group is left empty. */
function bake(group, shadows = true) {
	const out = new three.Group();
	for (const [mat, list] of byMaterial(group)) {
		const m = merging(list);
		for (const o of list) m.add(o);
		const merged = m.done();
		if (merged) out.add(bakedMesh(merged, mat, shadows));
	}
	letGo(group);
	return out;
}
/**
//#piece 1dffdc19e918a2aaa2ea5f6b905e8248ad91292912729784e6b37317bf7be574
	return g;
}

//#endregion
//#region src/lib/buildings/factory.js
/** a station's sign, as the factory paints it ($lib/sandbox-2/interior/factory.ts `sign`), and the gap kept round each
*  in the atlas, in its own dark grey, so a far view's blur takes nothing from the sign beside it */
const SIGN = {
	w: 768,
	h: 176,
	gap: 8,
	ground: "#23292e"
};
/**
* The signs, on one picture: the factory paints one for each of its stations, 78 pictures, and the box hands back at
* most 64 ($lib/assets/box/rebuild.js BUDGET). Each sign's material shows its own piece of the atlas instead (its
* place and size on it, `offset` and `repeat`), as sharp as before, the sign itself unchanged.
* @param {THREE.Object3D} root
*/
function atlasOfSigns(root) {
	/** each sign's picture and the materials showing it, in the order they are met */
	const signs = /* @__PURE__ */ new Map();
	root.traverse((o) => {
		if (!o.isMesh) return;
		for (const m of [o.material].flat()) {
			const t = m.map;
			if (!t || t !== m.emissiveMap || t.image?.width !== SIGN.w || t.image?.height !== SIGN.h) continue;
			if (!signs.has(t.image)) signs.set(t.image, /* @__PURE__ */ new Set());
			signs.get(t.image).add(m);
		}
	});
	if (signs.size < 2) return;
	const cw = SIGN.w + SIGN.gap * 2, ch = SIGN.h + SIGN.gap * 2;
	const cols = Math.min(signs.size, Math.floor(4096 / cw)), rows = Math.ceil(signs.size / cols);
	const canvas = document.createElement("canvas");
	canvas.width = cols * cw;
	canvas.height = rows * ch;
	const x = canvas.getContext("2d");
	x.fillStyle = SIGN.ground;
	x.fillRect(0, 0, canvas.width, canvas.height);
	const atlas = new three.CanvasTexture(canvas);
	atlas.colorSpace = three.SRGBColorSpace;
	let i = 0;
	for (const [picture, materials] of signs) {
		const col = i % cols, row = Math.floor(i++ / cols);
		x.drawImage(picture, col * cw + SIGN.gap, row * ch + SIGN.gap);
		const t = atlas.clone();
		t.repeat.set(SIGN.w / canvas.width, SIGN.h / canvas.height);
		t.offset.set((col * cw + SIGN.gap) / canvas.width, 1 - (row * ch + SIGN.gap + SIGN.h) / canvas.height);
		for (const m of materials) {
			m.map.dispose();
			m.map = m.emissiveMap = t;
			m.needsUpdate = true;
		}
	}
}
/** The solar factory dome: its shell, its doors and its five floors of lines, the middle of its floor at the origin. */
function factoryDome() {
	const spec = DOMES.factory;
	const R = spec.diameter / 2;
	const m = mats();
	const g = new three.Group();
	g.name = "solar-factory-dome";
	const shell = geodesic(spec, m, "factory");
	g.add(shell.group);
	for (const hole of shell.holes) g.add(portal(m, hole, "factory"));
	const works = buildFactory({
		scene: g,
		R,
		m,
		box,
		bake
	});
	atlasOfSigns(g);
	g.userData = {
		tick: (t) => works.update(t),
		walk: {
			x: works.start.x,
			z: works.start.z,
			yaw: works.start.look,
			lamps: []
		}
	};
	return g;
}

//#endregion
//#region src/lib/buildings/built.js
/** @typedef {import('$lib/models').Model} Model */
/**
* the buildings' older versions, by id, each with its frozen builder (the tent's and the factory's v1, Sandbox 3's
* interiors, have none here; every other one is at v1)
//#piece 5e378a537352acd822cd9b2a03558e68e385c183652007b1e2d9bd95260c7a3e
*/
const HISTORY = { "dome-factory": [{
	v: 1,
	date: "2026-10-05",
	note: "Sandbox 3’s factory dome: its interior, raised by that world’s own code (./inside.js)"
}, {
	v: 2,
	date: "2026-10-26",
	note: "Built in the asset box, so the Maia City vault can hold it: the same shell, doors and five floors of lines, its machines running, the lift at the ground floor; walked in by its own shape"
//#piece e6c3419a4ae71798ae1dff4cfbcc35e259fa676819653591dd6ab68b2ebd7ba2
*  together; and at its end the bell tent from its v2 (./tent.js) and the solar factory dome from its v2
*  (./factory.js), which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
const WAYSIDE_LIST = /* @__PURE__ */ (() => [{
	id: "dome-factory",
	label: "Solar factory dome",
	group: "Tents and domes",
	note: "the factory coop that makes the domes’ glass from sand, quartz and copper: five floors of lines round one great lift, its machines running. Walk in",
	usedIn: "Sandbox 3",
	make: () => factoryDome()
//#piece e6f5fc5cbe91444d6d22bebd55e63337f7cc8dbc071b68e9b9aa56be3f9706a7
