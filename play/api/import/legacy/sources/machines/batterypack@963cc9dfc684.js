//#piece 60c0a263da0d6b5d78de4d872b5d4e6be21a1ac8f4c22f56ffec553cb61b7c63
//#piece 2ee1d9bfd994520834d2a43154e124844761f74e6dcb138b78559218d98aaebf
//#piece f0a3a9fe9e2ca99ef335a24762c59fdb5f3870bf8b7d267f8dd419b123a8f039
//#piece b03384ae7c1c25080dbb7b48c36e4c909f669027f46181fddf4c033e05076aa5
*/
//#piece a157bfb12e0aa13bc84e1cac1418c563e29987e3ccd5a72b92ac9032ba2d3d2c
//#piece f0da962cb00e5288b430540ed01308066b4c0084d2d92efa723a589141aaa04a
//#piece 82c10a25a87dbf2e214caf98d8b702fd6bd94a8d5b517ce3a6ebe90014fdb6ea
const S$2 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$2 = {
//#piece 714b7d7c23f80a5f4d015b88b4f815c8c2da90fb1a927478dfac1c2ab8269caa
const CELLS$2 = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC$2 = "BatteryPack (our design)";
const CASE$1 = "#1f2225";
//#piece c0392e79b65fd5360ebcb6cc4054bd318a8fb5a5fd5bd0c191ae95122d646052
const COPPER$1 = "#c27a43";
const PCB$1 = "#2c7a4a";
const DARK$1 = "#202326";
const RED$1 = "#c8372d";
const BLACK$1 = "#161718";
const LED$1 = "#59f0a0";
const LED_OFF = "#2c3a33";
const STEEL$1 = "#8d9396";
/** its assemblies, as the pack on its own shows them drawn apart */
const ASSEMBLIES$2 = [
//#piece 385bfe608574e574a5e46992b3c9b5643cbd0208d04ad3938e245577450b1f6a
		out: [
			0,
			0,
			0
		]
	},
	{
//#piece 5c3bb249d027caacf353297f303b3bdfa182c865fb06aeed95a03c8c5725addd
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system that watches every row, the plug in its back and the charge strip.",
		out: [
			0,
			.15,
			.3
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch in all its pieces: two spring pawls whose teeth click into the rails’ keepers, their pivots, and the cables that let the grip’s trigger pull both back at once.",
		out: [
			0,
			.04,
			.32
		]
	},
	{
//#piece db99b5e61860f51e7f24f4d010b475ad3425ce2c426ea08dd15057339fa43172
const HOLE = "#050607";
/** from v6: a closed shell, and one L-shaped drawer (front plate + base plate) that carries every inner part */
const ASSEMBLIES_6 = [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell: floor, walls, top and back in one, open only at the front. The back socket sits in it, and the two release buttons in its sides.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium: the front plate with the grip and the charge strip, and the base plate under it. Every inner part is mounted on it, so pressing the two side buttons and pulling the grip brings the whole inside out.",
		out: [
			0,
			0,
//#piece c40f62126c508cc719682ba496b7756a976784710b9d12e99e8dabbc2d7486aa
			.14,
//#piece a9d198bfb9e98d18df4c33f761fa76212b749a63edb9dba08f23da419578e44d
		out: [
			0,
			.32,
//#piece 28275a187ab8bb5ff4527939ebfed30d95a0d5a4cb5bbbb073cf504ce7f65b5a
		out: [
			0,
			.18,
			.85
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, on the drawer’s front plate: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			.04,
			.85
		]
	}
];
/** from v8 the shell carries everything you hold and press: its foot's sill across the face with the grip, the ClickLock
*  and the two release buttons at its outer ends; the drawer only the insides */
const ASSEMBLIES_8 = [
	{
		id: "shell",
		label: "Shell",
		note: "The closed outer shell on its foot: floor tub, walls, top and back in one, open at the front above the foot’s sill. The sill carries the grip and, at its two outer ends, the release buttons; the back socket sits in the back.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill, with its finger pull and the charge strip) and the base plate behind it. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out.",
		out: [
			0,
			.03,
//#piece c40f62126c508cc719682ba496b7756a976784710b9d12e99e8dabbc2d7486aa
			.17,
//#piece a9d198bfb9e98d18df4c33f761fa76212b749a63edb9dba08f23da419578e44d
		out: [
			0,
			.35,
//#piece 28275a187ab8bb5ff4527939ebfed30d95a0d5a4cb5bbbb073cf504ce7f65b5a
		out: [
			0,
			.21,
			.85
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, in the shell’s foot: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			-.02,
			.3
		]
	}
];
/** from v9 the release buttons and their catches sit in the shell's two front corner columns, at the base plate's level */
const ASSEMBLIES_9 = /* @__PURE__ */ (() => [
//#piece 49995e865b0c1e40075894442ac8cbb73d2939fbd850b505fc93fd7cc4a7f16c
		out: [
			0,
			0,
			0
		]
	},
	{
		...ASSEMBLIES_8[1],
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill and the two columns, with its finger pull and the charge strip) and the base plate behind it, running between the columns. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out."
	},
	...ASSEMBLIES_8.slice(2)
])();
const STEPS_9 = [
//#piece c4693778171e97ad659dca4ede357e0fcf31439a4e9e311eb46b99edb1cb6e91
//#piece 5cdff094a3e769a0579e4be3443cfb1676b67f68c652c8cb2831d44bfb18971c
	"Fit the BMS, its leads and the inner plug; slide the drawer in between the columns until both catches click into the base plate"
];
const STEPS_8 = [
	"Lay out the shell on its foot: floor tub, walls, top and back, the back socket, the grip, the ClickLock, the release buttons and their catches",
	"Build the drawer: base plate and front plate with its finger pull and charge strip",
//#piece 5cdff094a3e769a0579e4be3443cfb1676b67f68c652c8cb2831d44bfb18971c
	"Fit the BMS, its leads and the inner plug; slide the drawer in over the sill until both catches click"
];
//#piece f0446a06a537f4f1e7e7e6fc50c5ec10cf542dea200e56d46444e97bcabde296
const STEPS_6 = [
	"Lay out the shell: floor, walls, top and back, the back socket and the two release buttons",
	"Build the drawer: base plate and front plate, the grip, charge strip and ClickLock",
//#piece 5cdff094a3e769a0579e4be3443cfb1676b67f68c652c8cb2831d44bfb18971c
	"Fit the BMS, its leads and the inner plug; slide the drawer in until both side catches click"
];
//#piece 50da518d459f98282bd5c6e3662f4dc05f03e49838a7c0a9b829b63d6e0b4dcc
/** the shell's own parts (all the rest slide out with the drawer; from v7 the release buttons too, on its front),
*  and how far the drawer comes out (m) */
const onShell = (v) => v >= 8 ? Object.keys(GROUP_8).filter((p) => GROUP_8[p] === "shell" || GROUP_8[p] === "lock") : v >= 7 ? ["tray", "terminals"] : [
	"tray",
	"terminals",
	"release-left",
	"release-right"
];
const DRAWER_OUT$1 = .45;
const STEPS$2 = [
	"Lay out the tray, its front panel, handles and ClickLock",
	"Set the bottom contact plates and holder, and stand the 280 cells in it",
	"Press on the top holder and the top contact plates",
	"Fit the BMS, its sense leads and the back plug",
	"Close the lid on its spring pad and snap the four latches"
];
//#piece acafe134c5e3361d1aab4a6452a19daef8b109d12fb81323165c97b7af32d8d8
		x * S$2,
		z * S$2,
		y * S$2
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S$2, h * S$2, l * S$2, L(x, y, z), r * S$2) : new three.BoxGeometry(w * S$2, h * S$2, l * S$2).translate(...L(x, y, z)));
//#piece e78dcee97b27a60a50b2ed16f0f310028721a76e629e4129ccfc274f7cfa4386
		const g = new three.CylinderGeometry(r * S$2, r * S$2, A.distanceTo(B), n);
//#piece 393c6a3327995c6fa5cbd4541daa35e045a6b13413ecf8c8f58fc6166e60c809
//#piece b8acb66ac41cdfb733bb67133581945880b375162db5fd1c1f1a9b7773215d48
		const shape = outline(w * S$2, l * S$2, r * S$2);
		if (wall) shape.holes.push(outline((w - 2 * wall) * S$2, (l - 2 * wall) * S$2, Math.max(1, r - wall) * S$2, true));
		const g = new three.ExtrudeGeometry(shape, {
			depth: (h - bevel) * S$2,
			curveSegments: 8,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel * S$2,
			bevelSize: bevel * S$2 * .8,
			bevelOffset: -bevel * S$2 * .8,
			bevelSegments: 3
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$2, 0);
		g.clearGroups();
		return T(g);
	};
	const RC = 30;
	const CHARGE = 7;
	const { W, L: LEN, H } = PACK$2;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$2.y + (i - (CELLS$2.s - 1) / 2) * CELLS$2.pitch;
	const colX = (j) => (j - (CELLS$2.p - 1) / 2) * CELLS$2.pitch;
	const zone = {
		w: CELLS$2.p * CELLS$2.pitch + 6,
		l: CELLS$2.s * CELLS$2.pitch + 6
	};
	const z0 = CELLS$2.z0 + DZ, top = z0 + CELLS$2.h;
//#piece 36b87522ae64d07d57ca53d737ba98c748cd4432af64d40471db20cc18dba72e
		assembly: assembly(G[p]),
		step: stepOf(p),
		source: SRC$2,
//#piece 2fbe892639a85afd36d99d31877c08900c80d4b85a1460017cbcd92315951a3d
			depth: h * S$2,
			curveSegments: 8,
			bevelEnabled: false
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$2, 0);
		g.clearGroups();
		return T(g);
	};
	const at2 = (x, y) => [x * S$2, -y * S$2];
	const Y0 = PACK$2.L / 2 - 30;
	/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
	const shellU = (w) => (p) => {
		const x = PACK$2.W / 2, yb = -PACK$2.L / 2, r = 30;
//#piece bd55aa08cd79f487d876b86e42770645d9cc691f648ea8d7992d777b477e337c
		const x = PACK$2.W / 2, yf = PACK$2.L / 2, r = 30;
//#piece 4ae4d1dd28a61439423fe2fb518df852e9ca8bf4c7e07aa48794024e12769845
			CASE$1
//#piece 45dd81f290b0e07ad64ea3b37c288b31700bfee940566ffd5728af2b2cb32d34
					CASE$1
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(shellU(4), z0, h), c);
			put(prism(shellU(0), 0, 18), CASE$1);
//#piece c911e213c3ad2ef3e94d68fb0676ab283369614c4cc86e18608e5ce38b34f355
					CASE$1
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(capD, z0, h), c);
			if (v >= 9) put(box(0, (Y0 + Lh) / 2, (F + Z) / 2, 2 * PX - 1, Lh - Y0, Z - F), CASE$1);
//#piece c45364053f16348c7cb41be98ac2b635e5fb2ae45372f20199bb74068550b001
			put(prism(shellU(0), 0, 3), CASE$1);
//#piece 785e0114abea242857efae920cba48dacca7916c0f9da015b7d5850ae580efdd
		put(slab(W, LEN, RC, 0, 5), CASE$1);
		put(slab(W, LEN, RC, 0, 16, 4), FACE);
		put(slab(W, LEN, RC, 16, 94, 4), CASE$1);
//#piece 6b4a13104e078ab66029ff7f3231cf60a72aded58e83118ac1158fc4b68a4180
		for (let k = 0; k < 10; k++) put(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), k < CHARGE ? LED$1 : LED_OFF);
//#piece 1771ebc8c00ccc555fd7a21d6925c1ab8f7f013dae2eb4953d207f39ae1f7e0d
		put(box(0, rowY(0), 9 + DZ, zone.w - 6, CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
		for (let i = 1; i < CELLS$2.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9 + DZ, zone.w - 6, 2 * CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
		put(box(0, rowY(CELLS$2.s - 1), 9 + DZ, zone.w - 6, CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
//#piece 12d8cf0f87bfdf811ebee448b6508c649d1fc69721fc03e6c56cb89b3e5a2457
	}, (put) => put(box(0, CELLS$2.y, 13 + DZ, zone.w, zone.l, 6, 1), HOLDER$1));
	part("cells", {
		label: "21700 cells",
		count: CELLS$2.s * CELLS$2.p,
//#piece eca0ff0d16d292316c7bbdc4581df6c8c612401bd2baf2482c3b8c7b7de41cf2
		for (let i = 0; i < CELLS$2.s; i++) for (let j = 0; j < CELLS$2.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$2.r, seg), WRAP$1);
//#piece d6cdaffe1fa20924231171919942a3447e53155172e58324c61dfa761db703fc
			], CELLS$2.r - 2, seg), CAP$1);
//#piece 796eebda559aae740f9998e6c29f17da13a5d33ca37b465fc5b775992a58d309
	}, (put) => put(box(0, CELLS$2.y, top - 6, zone.w, zone.l, 6, 1), HOLDER$1));
//#piece a84f82bf3636a111c54879ce918c65035bedbe5782c4d144a8fd41712f4fe2d2
		for (let i = 0; i < CELLS$2.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$2.pitch - 3, 1.5, .3), COPPER$1);
//#piece 6f6001653d6d65c7c2268ba86ff5c6f90eedc26e2ed874e2bc6d6242823ee699
		const y = rowY(CELLS$2.s - 1) + 60;
//#piece deb6f7cf8fcceb2ac3bc7822dc000d3cab4a8c412176b422cf56eb8437e4494e
		for (let i = 0; i < CELLS$2.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
//#piece 6682d297f9bcdced2604c0286d358d48af427f2103195ee6eb93439fd2ca6cff
			], 4.5, 12), x < 0 ? RED$1 : COPPER$1);
//#piece f19769cea98e77ac19693771b91d9fefdff6050022232c44d862975c08b83130
		for (const x of [-45, 45]) hole(x, 58, 6, x < 0 ? RED$1 : COPPER$1);
//#piece 21bcc1eb9aa236b80327bfc3e4b1d6fffc230f770ee9f4fa0e6a48cec54be686
		for (const x of [-45, 45]) put(box(x, -Lh - 7, 58, 34, 3, 12), x < 0 ? RED$1 : COPPER$1);
//#piece ae889661ade05024fefac41d3d90789718662d569d823bdb2f58dac59aa6bfa8
			put(box(0, CELLS$2.y, top + 8, zone.w - 10, zone.l - 10, 4, 2), STEEL$1);
			put(box(0, CELLS$2.y, top + 4, zone.w - 14, zone.l - 14, 4, 1), "#d8d1bf");
			for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(cyl([
				sx * (zone.w / 2 - 4),
				CELLS$2.y + sy * (zone.l / 2 - 4),
				8 + DZ
			], [
				sx * (zone.w / 2 - 4),
				CELLS$2.y + sy * (zone.l / 2 - 4),
//#piece 7470892c9d20e238f5692f8ddf47f0b8d3dbea45f429d9287818f2a1f5b809b0
			put(box(0, CELLS$2.y, H - 19, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
//#piece f8b29a0cd740ee5d51d256d6568ae5b1955f40f7ec565a3e4c16677b0e236769
		});
	}
}
/** The BatteryPack on its own (version `v`), every part its own: drawn apart, built step by step. @returns {Cast} */
function batteryPack$2(v = 9) {
	const assemblies = v >= 9 ? ASSEMBLIES_9 : v >= 8 ? ASSEMBLIES_8 : v >= 6 ? ASSEMBLIES_6 : ASSEMBLIES$2;
	const kit = machineKit(assemblies);
	const steps = v >= 9 ? STEPS_9 : v >= 8 ? STEPS_8 : v >= 6 ? STEPS_6 : STEPS$2;
	batteryPackParts$1(kit, {
		at: [
			0,
			0,
			0
		],
		base: "base",
		v
//#piece 6070a33e4264bc8c72b64256adcf41f96351dcb8bf71c2c7dd307b83239dadd6
	/** @type {Cast} */
	const cast = {
		rig: r,
		clips: {
			off: () => ({}),
//#piece 95d909e2b7427248cd274cc4ce6d82c1c48bb034b6e501af759c04c4968b09a0
				return kit.explode(built.centre, k, {});
			},
			assemble: (t) => {
				const n = steps.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, {});
			}
		},
		poses: {
			off: {},
			exploded: kit.explode(built.centre, 1, {}),
			...v >= 6 ? { "drawer out": service(built.catalogParts, DRAWER_OUT$1, 0, 1, v) } : {}
		},
		first: v >= 6 ? "service" : "explode",
		catalog: {
			assemblies,
			parts: built.catalogParts,
			steps,
			sources: []
		}
	};
	if (v >= 6) {
		const parts = built.catalogParts;
		const s = (u, a, b) => ease$1(Math.min(1, Math.max(0, (u - a) / (b - a))));
		cast.clips.service = (t) => {
			const u = loop(t, 10) * 10;
			const press = s(u, .4, .8) - s(u, 1.6, 1.9);
			const out = DRAWER_OUT$1 * (s(u, 1, 3.6) - s(u, 6.2, 8.8));
			return service(parts, out, press, out < .02 ? press : 1, v);
		};
	}
	return cast;
}
/**
* A pose of the pack from v6: the drawer `out` metres out, the release buttons pressed in by `press` (0…1), and the
* drawer's catches in by `catches` (held in by the shell's walls while the drawer is out).
* @param {import('./parts.js').PartInfo[]} parts @param {number} out @param {number} press @param {number} [catches] @param {number} [v]
* @returns {import('./rig').Pose}
*/
function service(parts, out, press, catches = press, v = 9) {
	/** @type {import('./rig').Pose} */
	const p = {};
	const shell = onShell(v);
	for (const { id } of parts) {
		const inward = id.endsWith("left") ? 1 : -1;
		if (v >= 8 && id.startsWith("release-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			0,
			-press * .004
		];
		else if (v >= 9 && id.startsWith("catch-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			-inward * catches * .005,
			0,
			0
		];
		else if (v >= 8 && id.startsWith("catch-")) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			-catches * .005,
			0
		];
		else if (id.startsWith("release-")) p[`p.${id}`] = v >= 7 ? [
			0,
			0,
			0,
			1,
			0,
			0,
			out - press * .004
		] : [
			0,
			0,
			0,
			1,
			inward * press * .004,
			0,
			0
		];
		else if (!shell.includes(id)) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			id.startsWith("catch-") ? inward * catches * .004 : 0,
			0,
			out
		];
	}
	return p;
}

//#endregion
//#region src/lib/actors/batterypack.v1.js
//#piece d3978b6ff691800c0e3631b30b1038e1da280c62f3ec2bc605ed94c228c8873c
const S$1 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$1 = {
	W: 460,
	L: 480,
	H: 125
//#piece 9053a42212a2603c7b7753a81f928fe01e6189ad1610d344045d96a50537477d
const CELLS$1 = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC$1 = "BatteryPack (our design)";
const CASE = "#3a4046";
const LID = "#c5cacc";
const HOLDER = "#1b1d1f";
const WRAP = "#2f6fb5";
const CAP = "#c9ccce";
const COPPER = "#c27a43";
const PCB = "#2c7a4a";
const DARK = "#202326";
const RED = "#c8372d";
const BLACK = "#161718";
const LED = "#3ddc84";
const STEEL = "#8d9396";
/** its assemblies, as the pack on its own shows them drawn apart */
const ASSEMBLIES$1 = [
//#piece 385bfe608574e574a5e46992b3c9b5643cbd0208d04ad3938e245577450b1f6a
		out: [
			0,
			-.12,
			0
		]
	},
	{
//#piece 5c3bb249d027caacf353297f303b3bdfa182c865fb06aeed95a03c8c5725addd
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and terminals",
		note: "The battery management system that watches every row, the main terminals and the state-of-charge lights.",
		out: [
			0,
			.15,
			.3
		]
	},
	{
//#piece db99b5e61860f51e7f24f4d010b475ad3425ce2c426ea08dd15057339fa43172
const STEPS$1 = [
	"Lay out the tray, its front panel and handles",
	"Set the bottom contact plates and holder, and stand the 280 cells in it",
	"Press on the top holder and the top contact plates",
	"Fit the BMS, its sense leads and the terminals",
	"Close the lid on its spring pad and snap the four latches"
];
//#piece 779e24f510049e1766f36c8ec9c6023fcc2bd3ac4a03c9ce793b46ae35055085
//#piece 67dc458078f9c291855d9b83d1fa5d0889de282ebbf3d79fe922c51812f2f91d
//#piece c8053c83f37247c834cfd7b1f37a0f8ac6feefdf3d6809cacc34c21576111234
	const top = CELLS$1.z0 + CELLS$1.h;
//#piece 36b87522ae64d07d57ca53d737ba98c748cd4432af64d40471db20cc18dba72e
		assembly: assembly(GROUP[p]),
		step: step(p),
		source: SRC$1,
//#piece 4c737e21523c27657c2b63a303312980f586c47d27189524605849b6e5bf5aa8
		put(box(0, 0, 2.5, W, LEN, 5), CASE);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 2), 0, 58, 4, LEN, 106), CASE);
		put(box(0, -Lh + 2, 58, W, 4, 106), CASE);
//#piece 9d3507fe1f7e70ceca325b58486ab0b61b412f1f8f0db745ef12efa4845d60dd
		for (let k = 0; k < 5; k++) put(box(-60 + k * 16, Lh + 1, 96, 10, 3, 6, 1), LED);
//#piece da227071cf2a2879f40ee873804773dd8585ba8c474a3f1bf869ef25a0d70037
		put(box(0, rowY(0), 9, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER);
		for (let i = 1; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER);
		put(box(0, rowY(CELLS$1.s - 1), 9, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER);
//#piece 12d8cf0f87bfdf811ebee448b6508c649d1fc69721fc03e6c56cb89b3e5a2457
	}, (put) => put(box(0, CELLS$1.y, 13, zone.w, zone.l, 6, 1), HOLDER));
//#piece b81d92ff01a0c2d788b06e173ec70a3cfee459f27d6598e7c372421e8ff908c7
			put(cyl([
				colX(j),
				rowY(i),
				CELLS$1.z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$1.r, seg), WRAP);
//#piece d6cdaffe1fa20924231171919942a3447e53155172e58324c61dfa761db703fc
			], CELLS$1.r - 2, seg), CAP);
//#piece 796eebda559aae740f9998e6c29f17da13a5d33ca37b465fc5b775992a58d309
	}, (put) => put(box(0, CELLS$1.y, top - 6, zone.w, zone.l, 6, 1), HOLDER));
//#piece a84f82bf3636a111c54879ce918c65035bedbe5782c4d144a8fd41712f4fe2d2
		for (let i = 0; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER);
//#piece 6f6001653d6d65c7c2268ba86ff5c6f90eedc26e2ed874e2bc6d6242823ee699
		const y = rowY(CELLS$1.s - 1) + 60;
//#piece a76542de1ef1e157c14b078ff035c60b4d2f06c01f31029037163bfc281160c2
		for (let i = 0; i < CELLS$1.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
//#piece ca2ee272533699f9124c3547416dc8242bd739a99768526642477a4374e3b0de
		put(box(0, CELLS$1.y, H - 9, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
//#piece 7400bfb8350f826e1432e9e94ffd155786126b9553de5a1d7888bf3fc1176a29
	});
}
/** The BatteryPack on its own, every part its own: drawn apart, built step by step. @returns {Cast} */
function batteryPack$1() {
	const kit = machineKit(ASSEMBLIES$1);
	batteryPackParts(kit, {
		at: [
			0,
			0,
			0
		],
		base: "base"
//#piece 6070a33e4264bc8c72b64256adcf41f96351dcb8bf71c2c7dd307b83239dadd6
	return {
		rig: r,
		clips: {
			off: () => ({}),
//#piece 95d909e2b7427248cd274cc4ce6d82c1c48bb034b6e501af759c04c4968b09a0
				return kit.explode(built.centre, k, {});
			},
			assemble: (t) => {
				const n = STEPS$1.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, {});
			}
		},
		poses: {
			off: {},
			exploded: kit.explode(built.centre, 1, {})
		},
		first: "explode",
		catalog: {
			assemblies: ASSEMBLIES$1,
			parts: built.catalogParts,
			steps: STEPS$1,
			sources: []
		}
	};
}

//#endregion
//#piece 123cf38622aeb4248f11af19543b57a8d426be9297cafc2430f2a1fdc9f3009f
//#piece a5d2fc773d0acfbf07bc7af9c62fc2469809f466a4bf30ab5ba13798a551d857
//#piece 86f2474524638af5263b596122a940719d1988c4e2e19108aa5276a00fe54153
//#piece 95a9b76e441dc3e53b3327ae971aa6187ecdf8a72d10fed4c51362ac2c5457d2
//#piece d77232df1f18f16c04aef0b0545db7a7821513e115b976c1ede124c4f5e17f66
//#piece 415ee1bd5b7ab8b4b1581e9291af120d9777ed6c7dea08835392c9432e2afa77
*/
//#piece 86993bfbd68d9315ca761f8d585450f2508288f96af25506669667ebc307a572
//#region src/lib/machines/batterypack.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
const S = .001;
/** the pack's size (mm): W across, L front to back, H high; its skids under the floor lift it by `LIFT` */
const PACK = {
	W: 460,
	L: 480,
	H: 125
};
const LIFT = 2.5;
/** the foot: its floor tub and the sill across the face; the two front corner columns (mm) */
const FOOT = 20;
const POST = {
	w: 46,
	top: 25
//#piece 9053a42212a2603c7b7753a81f928fe01e6189ad1610d344045d96a50537477d
const CELLS = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 33,
	y: -55
};
/** where the drawer's front plate begins (y), the lock's pawls and the grip's bar (z), the pawls' teeth behind the face */
const Y0 = /* @__PURE__ */ (() => PACK.L / 2 - 30)();
const LOCK_Z = 10;
const GRIP_Z = 10;
const LOCK_BACK = 22;
const Wh = /* @__PURE__ */ (() => PACK.W / 2)();
const Lh = /* @__PURE__ */ (() => PACK.L / 2)();
const PX = /* @__PURE__ */ (() => Wh - POST.w)();
const CATCH_Y = Y0 - 14;
/** how far the drawer comes out (mm) */
const DRAWER_OUT = 450;
/** a step from 0 to 1 between two moments of a loop, eased @param {number} t @param {number} a @param {number} b */
const phase = (t, a, b) => ease.io(clamp((t - a) / (b - a)));
/**
* Its own moves (v11), loops over its controls: Service presses the two buttons (the drawer's first 4 mm), pulls the
* whole inside out between the columns and slides it home again till the catches click; Grip closes a hand round
* the grip, the trigger pulls both pawls in, and lets go, so they click out again.
* @type {Record<string, import('$lib/assets/parts.js').Move>}
*/
const MOVES = {
	service: {
		label: "Service",
		seconds: 9,
		note: "Press both buttons, pull the drawer out, slide it home",
		at: (u) => {
			const t = u * 9;
			return { drawer: DRAWER_OUT * (phase(t, .6, 3.2) - phase(t, 5, 7.6)) };
		}
	},
	grip: {
		label: "Grip",
		seconds: 3,
		note: "Squeeze the trigger: the pawls swing in; let go: they click out",
		at: (u) => {
			const t = u * 3;
			return { trigger: 4 * (phase(t, .3, .6) - phase(t, 1.6, 1.9)) };
		}
	}
};
const SOURCES = [
	{
		label: "BatteryPack v9 (our design, $lib/actors/batterypack.js)",
		url: "https://github.com/maiacity"
	},
	{
		label: "21700 energy cells: their datasheets (no maker named)",
		url: "https://lygte-info.dk/info/BatteryChargePercent%20UK.html"
	},
	{
		label: "Cylindrical cells’ heat capacity and conductivity (Steinhardt et al. 2021, J. Energy Storage)",
		url: "https://portal.fis.tum.de/en/publications/low-effort-determination-of-heat-capacity-and-thermal-conductivit/"
	},
	{
		label: "Pulse resistance against temperature (Batteries 8(7) 60, 2022)",
		url: "https://www.mdpi.com/2313-0105/8/7/60"
	},
	{
		label: "OCV against SoC of NMC cells (Chin. J. Mech. Eng. 31, 2018)",
		url: "https://cjme.springeropen.com/articles/10.1186/s10033-018-0268-8"
	},
	{
		label: "Resistivity and its temperature coefficients (HyperPhysics)",
		url: "https://hyperphysics.gsu.edu/hbase/Tables/rstiv.html"
	},
	{
		label: "Contact resistance of pressed copper busbars (J. Mech. Electr. Veh. 2019)",
		url: "https://mev.brin.go.id/mev/article/view/97"
	},
	{
		label: "Press contacts for battery cells (Fraunhofer)",
		url: "https://publica.fraunhofer.de/handle/publica/245414"
	},
	{
		label: "A 14S board’s protection figures (a listing)",
		url: "https://sigmanortec.ro/en/bms-li-ion-module-14s-45a-with-balance-52v"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
const SRC = /* @__PURE__ */ (() => ({
	ours: SOURCES[0].label,
	cell: SOURCES[1].label,
	heat: SOURCES[2].label,
	rt: SOURCES[3].label,
	ocv: SOURCES[4].label,
	cu: SOURCES[5].label,
	press: SOURCES[6].label,
	bms: SOURCES[8].label
}))();
const ASSEMBLIES = [
//#piece 49995e865b0c1e40075894442ac8cbb73d2939fbd850b505fc93fd7cc4a7f16c
		out: [
			0,
			0,
			-.6
		]
	},
	{
		id: "drawer",
		label: "Service drawer",
		note: "One L of aluminium riding on the shell’s foot: the front plate (the face above the sill and the two columns, with its finger pull and the charge strip) and the base plate behind it, running between the columns. It carries every inner part and nothing you hold: press the two buttons, pull it by its finger pull, and the whole inside comes out.",
		out: [
			0,
			0,
			.4
		]
	},
	{
		id: "cells",
		label: "Cells",
		note: "280 cylindrical 21700 cells standing in two holder plates on the drawer, 14 rows in series of 20 side by side, every other row upside down so the plates alone join them.",
		out: [
			0,
			.2,
			0
		]
	},
	{
		id: "contacts",
		label: "Contact plates",
		note: "Copper plates top and bottom that join each row to the next, pressed on by the drawer’s clamp, not welded: the bottom plates’ spring fingers reach the poles through the holder’s holes.",
		out: [
			0,
			.3,
			0
		]
	},
	{
		id: "electronics",
		label: "BMS and plug",
		note: "The battery management system on the drawer (its MOSFETs, shunt, fuse and a balance lead to every row), the straps that carry the current, and its inner plug that meets the shell’s back socket when the drawer is in.",
		out: [
			0,
			.2,
			.25
		]
	},
	{
		id: "lock",
		label: "ClickLock",
		note: "The snap-in latch that holds the pack in its cube, in the shell’s hollow foot: two spring pawls, their pivots and the cables to the grip’s trigger.",
		out: [
			0,
			-.15,
			.05
		]
	}
];
const STEPS = [
//#piece c4693778171e97ad659dca4ede357e0fcf31439a4e9e311eb46b99edb1cb6e91
	"Set the film, the bottom contact plates and the bottom holder on the base plate, and stand the 280 cells in it",
	"Press on the top holder, the top plates and the clamp",
	"Fit the BMS, its leads, the straps and the inner plug; slide the drawer in between the columns until both catches click into the base plate"
];
/** a point of the pack (mm: x across, y to the front, z up) in the asset's frame (m) @param {number} x @param {number} y @param {number} z @returns {V3} */
const L = (x, y, z) => [
	x * S,
	(z + LIFT) * S,
	y * S
];
/** a box centred at (x, y, z) mm, w across, l deep, h high; rounded by r mm (0: a plain box, light) */
const box = (x, y, z, w, l, h, r = 0) => (r > 0 ? GEO.rbox(w * S, h * S, l * S, Math.min(r, w / 2, h / 2, l / 2) * .999 * S, 2) : new three.BoxGeometry(w * S, h * S, l * S)).translate(...L(x, y, z));
/** a closed cylinder from a to b (mm), radius r mm @param {V3} a @param {V3} b @param {number} r @param {number} [n] */
function cyl(a, b, r, n = 16) {
	const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
	const g = new three.CylinderGeometry(r * S, r * S, A.distanceTo(B), n);
//#piece 0b342ef83a20f3f38285d68455f21743ce0c9eaff4752a9c3dd7760428f01f75
/** a hose, a cable or a strap through points (mm) @param {V3[]} pts @param {number} r @param {number} [radial] */
const hose = (pts, r, radial = 8) => GEO.pipe(pts.map((p) => L(...p)), r * S, {
	seg: Math.max(12, pts.length * 8),
	radial,
	tension: .5
});
/** a coil spring along x from x0 to x1 (mm) at (y, z): R its radius, wire its wire, n turns */
function coilX(x0, x1, y, z, R, wire, n) {
	const pts = [], seg = n * 12, len = (x1 - x0) * S;
	for (let i = 0; i <= seg; i++) {
		const t = i / seg, a = t * n * Math.PI * 2;
		pts.push(new three.Vector3(t * len, R * S * Math.cos(a), R * S * Math.sin(a)));
	}
	return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire * S, 6, false).translate(...L(x0, y, z));
}
/** one hex nut at a point (mm), its axis up @param {number} x @param {number} y @param {number} z @param {number} s @param {number} h */
const nut = (x, y, z, s, h) => new three.CylinderGeometry(s * S, s * S, h * S, 6).translate(...L(x, y, z + h / 2));
const at2 = (x, y) => [x * S, -y * S];
/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism @param {(p: THREE.Shape) => void} draw @param {number} z0 @param {number} h @param {number} [seg] */
function prism(draw, z0, h, seg = 8) {
	const shape = new three.Shape();
	draw(shape);
	if (three.ShapeUtils.isClockWise(shape.getPoints(seg))) shape.holes = shape.holes.map((hl) => three.ShapeUtils.isClockWise(hl.getPoints(seg)) ? new three.Path(hl.getPoints(seg).reverse()) : hl);
	const g = new three.ExtrudeGeometry(shape, {
		depth: h * S,
		curveSegments: seg,
		bevelEnabled: false
	});
	g.rotateX(-Math.PI / 2).translate(0, (z0 + LIFT) * S, 0);
	g.clearGroups();
	return g;
}
/** a rounded rectangle in plan, centred (x, y), w × l, corners r, as a shape or a hole */
function rrect(x, y, w, l, r, hole = false) {
	const p = hole ? new three.Path() : new three.Shape();
	const X = w / 2, Y = l / 2;
	p.moveTo(...at2(x - X + r, y - Y));
	p.lineTo(...at2(x + X - r, y - Y));
	p.quadraticCurveTo(...at2(x + X, y - Y), ...at2(x + X, y - Y + r));
	p.lineTo(...at2(x + X, y + Y - r));
	p.quadraticCurveTo(...at2(x + X, y + Y), ...at2(x + X - r, y + Y));
	p.lineTo(...at2(x - X + r, y + Y));
	p.quadraticCurveTo(...at2(x - X, y + Y), ...at2(x - X, y + Y - r));
	p.lineTo(...at2(x - X, y - Y + r));
	p.quadraticCurveTo(...at2(x - X, y - Y), ...at2(x - X + r, y - Y));
	p.closePath();
	return p;
}
/** a round hole in plan @param {number} x @param {number} y @param {number} r */
const hole = (x, y, r) => {
	const p = new three.Path();
	p.absarc(x * S, -y * S, r * S, 0, Math.PI * 2, false);
	return p;
};
/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
const shellU = (w) => (p) => {
	const x = Wh, yb = -Lh, r = 30;
	p.moveTo(...at2(-x, Y0));
	p.lineTo(...at2(-x, yb + r));
	p.quadraticCurveTo(...at2(-x, yb), ...at2(-x + r, yb));
	p.lineTo(...at2(x - r, yb));
	p.quadraticCurveTo(...at2(x, yb), ...at2(x, yb + r));
	p.lineTo(...at2(x, Y0));
	if (w) {
		p.lineTo(...at2(x - w, Y0));
		p.lineTo(...at2(x - w, yb + r));
		p.quadraticCurveTo(...at2(x - w, yb + w), ...at2(x - r, yb + w));
		p.lineTo(...at2(-x + r, yb + w));
		p.quadraticCurveTo(...at2(-x + w, yb + w), ...at2(-x + w, yb + r));
		p.lineTo(...at2(-x + w, Y0));
	}
	p.closePath();
};
/** the drawer's front plate (and the sill under it) in plan: from Y0 to the face, its two front corners round */
const capD = (p) => {
	const x = Wh, yf = Lh, r = 30;
	p.moveTo(...at2(-x, Y0));
	p.lineTo(...at2(x, Y0));
	p.quadraticCurveTo(...at2(x, yf), ...at2(x - r, yf));
	p.lineTo(...at2(-x + r, yf));
	p.quadraticCurveTo(...at2(-x, yf), ...at2(-x, Y0));
	p.closePath();
};
/** a front corner column in plan: inside the wall behind the face, round at the corner in front of it */
const postP = (sx) => (p) => {
	const pt = (x, y) => at2(sx * x, y);
	p.moveTo(...pt(PX, Y0 - 30));
	p.lineTo(...pt(Wh - 4, Y0 - 30));
	p.lineTo(...pt(Wh - 4, Y0));
	p.lineTo(...pt(Wh, Y0));
	p.quadraticCurveTo(...pt(Wh, Lh), ...pt(Wh - 30, Lh));
	p.lineTo(...pt(PX, Lh));
	p.closePath();
};
const rowY = (i) => CELLS.y + (i - (CELLS.s - 1) / 2) * CELLS.pitch;
const colX = (j) => (j - (CELLS.p - 1) / 2) * CELLS.pitch;
const zone = /* @__PURE__ */ (() => ({
	w: CELLS.p * CELLS.pitch + 6,
	l: CELLS.s * CELLS.pitch + 6
}))();
const TOP = /* @__PURE__ */ (() => CELLS.z0 + CELLS.h)();
/** the clamp's four posts, at the holders' corners, clear of the corner cells and the plates */
const POSTS = /* @__PURE__ */ (() => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => [sx * 219.5, CELLS.y + sy * 153.5])))();
/** the plates' width: over every cap, clear of the posts (v9 drew them 440 wide, through the posts) */
const PLATE_W = 432;
/** the series nodes: node 0 the pack's −, node 14 its +; a node's plate (which rows it joins), where it is (y, z) and its side */
const NODES = /* @__PURE__ */ (() => Array.from({ length: CELLS.s + 1 }, (_, k) => {
	if (k === 0) return {
		k,
		rows: [0],
		y: rowY(0),
		z: 26.25,
		top: false,
		len: CELLS.pitch - 3
	};
	if (k === CELLS.s) return {
		k,
		rows: [CELLS.s - 1],
		y: rowY(CELLS.s - 1),
		z: 26.25,
		top: false,
		len: CELLS.pitch - 3
	};
	const top = k % 2 === 1;
	return {
		k,
		rows: [k - 1, k],
		y: (rowY(k - 1) + rowY(k)) / 2,
		z: top ? 103.75 : 26.25,
		top,
		len: 2 * CELLS.pitch - 3
	};
}))();
function materials() {
	return {
		shell: MAT.anodised({
			color: [
				.075,
				.08,
				.088
			],
			roughness: .36,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		face: MAT.anodised({
			color: [
				.11,
				.12,
				.13
			],
			roughness: .4,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		lid: MAT.anodised({
			color: [
				.085,
				.09,
				.1
			],
			roughness: .34,
			cap: [
				.72,
				.73,
				.75
			],
			capRough: .3
		}),
		seam: MAT.aluminiumMachined({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .3,
			finish: "brushed",
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		alu: MAT.aluminium({
			color: [
				.72,
				.73,
				.74
			],
			roughness: .55,
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		plate: MAT.aluminiumMachined({
			roughness: .3,
			finish: "brushed",
			cap: [
				.86,
				.87,
				.88
			],
			capRough: .3
		}),
		steel: MAT.stainless({
			roughness: .26,
			cap: [
				.8,
				.8,
				.78
			],
			capRough: .3
		}),
		spring: MAT.stainless({
			color: [
				.6,
				.6,
				.6
			],
			roughness: .3,
			finish: null,
			cap: [
				.78,
				.78,
				.76
			],
			capRough: .3
		}),
		dark: MAT.plastic({
			color: [
				.035,
				.038,
				.042
			],
			roughness: .62,
			cap: [
				.1,
				.1,
				.11
			]
		}),
		grip: MAT.rubber({
			color: [
				.03,
				.032,
				.035
			],
			roughness: .75,
			cap: [
				.09,
				.09,
				.095
			]
		}),
		black: MAT.plastic({
			color: [
				.012,
				.012,
				.014
			],
			roughness: .5,
			cap: [
				.06,
				.06,
				.065
			]
		}),
		line: MAT.aluminium({
			color: [
				.85,
				.86,
				.87
			],
			roughness: .3,
			cap: [
				.88,
				.89,
				.9
			],
			capRough: .3
		}),
		hole: MAT.plastic({
			color: [
				.004,
				.004,
				.005
			],
			roughness: .9,
			cap: [
				.03,
				.03,
				.032
			]
		}),
		holder: MAT.plastic({
			color: [
				.045,
				.05,
				.055
			],
			roughness: .58,
			cap: [
				.12,
				.13,
				.14
			]
		}),
		sleeve: MAT.plastic({
			color: [
				.03,
				.12,
				.42
			],
			roughness: .3,
			clearcoat: .6,
			clearcoatRoughness: .15,
			cap: [
				.08,
				.22,
				.6
			]
		}),
		can: MAT.steel({
			color: [
				.62,
				.63,
				.63
			],
			roughness: .25,
			finish: null,
			cap: [
				.7,
				.7,
				.68
			],
			capRough: .3
		}),
		roll: MAT.satin({
			color: [
				.05,
				.05,
				.052
			],
			roughness: .7,
			cap: [
				.14,
				.13,
				.12
			],
			capRough: .7
		}),
		cap: MAT.steel({
			color: [
				.7,
				.71,
				.7
			],
			roughness: .24,
			finish: null,
			cap: [
				.75,
				.75,
				.73
			]
		}),
		ring: MAT.plastic({
			color: [
				.85,
				.84,
				.78
			],
			roughness: .5,
			cap: [
				.9,
				.88,
				.8
			]
		}),
		copper: MAT.copper({
			color: [
				.88,
				.62,
				.48
			],
			roughness: .3,
			cap: [
				.95,
				.7,
				.55
			],
			capRough: .3
		}),
		film: MAT.plastic({
			color: [
				.6,
				.3,
				.06
			],
			roughness: .2,
			clearcoat: .5,
			cap: [
				.6,
				.3,
				.06
			]
		}),
		ptfe: MAT.plastic({
			color: [
				.86,
				.86,
				.84
			],
			roughness: .3,
			cap: [
				.92,
				.92,
				.9
			]
		}),
		foam: MAT.satin({
			color: [
				.6,
				.55,
				.45
			],
			roughness: .95,
			cap: [
				.65,
				.6,
				.5
			]
		}),
		pcb: MAT.paint({
			color: [
				.02,
				.15,
				.07
			],
			roughness: .4,
			clearcoat: .4,
			cap: [
				.6,
				.55,
				.3
			]
		}),
		pad: MAT.copper({
			roughness: .3,
			finish: null,
			cap: [
				.95,
				.7,
				.55
			],
			capRough: .3
		}),
		chip: MAT.plastic({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .45,
			cap: [
				.08,
				.08,
				.085
			]
		}),
		ceramic: MAT.ceramic({
			color: [
				.88,
				.87,
				.82
			],
			roughness: .4,
			cap: [
				.92,
				.91,
				.87
			]
		}),
		brass: MAT.brass({
			roughness: .3,
			cap: [
				.9,
				.75,
				.4
			],
			capRough: .3
		}),
		manganin: MAT.copper({
			color: [
				.72,
				.6,
				.5
			],
			roughness: .45,
			finish: "brushed",
			cap: [
				.8,
				.68,
				.56
			],
			capRough: .35
		}),
		gold: MAT.gold({
			roughness: .2,
			cap: [
				.95,
				.8,
				.45
			],
			capRough: .3
		}),
		red: MAT.plastic({
			color: [
				.5,
				.03,
				.02
			],
			roughness: .4,
			cap: [
				.6,
				.08,
				.05
			]
		}),
		wire: MAT.plastic({
			color: [
				.8,
				.8,
				.78
			],
			roughness: .5,
			cap: [
				.86,
				.86,
				.84
			]
		}),
		wireRed: MAT.plastic({
			color: [
				.55,
				.04,
				.02
			],
			roughness: .5,
			cap: [
				.62,
				.08,
				.05
			]
		}),
		wireBlack: MAT.plastic({
			color: [
				.015,
				.015,
				.017
			],
			roughness: .5,
			cap: [
				.07,
				.07,
				.075
			]
		}),
		strap: MAT.plastic({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .55,
			cap: [
				.95,
				.7,
				.55
			]
		}),
		ledOff: MAT.plastic({
			color: [
				.06,
				.09,
				.075
			],
			roughness: .3,
			cap: [
				.12,
				.16,
				.14
			]
		})
	};
}
/** the cell: capacity (Ah), its voltages, its DC resistance at 25 °C and 50 % (Ω) [inferred], mass (kg), heat capacity (J/kg·K), the most it may give (A), its Arrhenius energy (J/mol) [inferred] */
const CELL = {
	Q: 5,
	Vmax: 4.2,
	Vmin: 2.5,
	R25: .025,
	m: .069,
	cp: 1008,
	Imax: 10,
	Ea: 21e3
};
/** the open-circuit voltage of an NMC cell by its state of charge, rested [inferred from published curves] */
const OCV = {
	soc: [
		0,
		.02,
		.05,
		.1,
		.2,
		.3,
		.4,
		.5,
		.6,
		.7,
		.8,
		.9,
		.95,
		1
	],
	v: [
		3,
		3.25,
		3.4,
		3.49,
		3.57,
		3.62,
		3.66,
		3.7,
		3.77,
		3.86,
		3.95,
		4.05,
		4.11,
		4.18
	]
};
const ocv = (soc) => table(OCV.soc, OCV.v, clamp(soc));
/** a cell's DC resistance (Ω) at a temperature (°C) and a state of charge: Arrhenius in the cold, up under 15 % */
const rCell = (T, soc) => CELL.R25 * Math.exp(CELL.Ea / 8.314 * (1 / (T + 273.15) - 1 / 298.15)) * (1 + 1.5 * clamp((.15 - soc) / .15));
/** the BMS: its cut-offs (V, °C, A), its balancing (A, above V), its own resistances (Ω) */
const BMS = {
	ov: 4.25,
	uv: 2.8,
	ot: 60,
	otChg: 45,
	oc: 100,
	ocPeak: 250,
	peakS: 10,
	chg: 50,
	bal: .1,
	balAt: 4.1,
	R: 9e-4
};
/** a pressed contact (Ω, one cell, one end) [inferred]; the straps and the plug (Ω) [computed: 2 × 0.35 m of 40 mm² copper, two 0.1 mΩ contacts] */
const LINK = {
	contact: 5e-4,
	series: .0005009999999999999
};
/** the heat: a row's capacity (J/K), row to row, row to drawer, drawer to shell, shell to air (W/K), the drawer's and the shell's capacities (J/K) [computed from the geometry] */
const HEAT = /* @__PURE__ */ (() => ({
	Crow: CELLS.p * CELL.m * CELL.cp + 90,
	Grr: 6.5,
	Grd: 3,
	Gds: 5,
	Gsa: 6.3,
	Cd: 6e3,
	Cs: 5e3
}))();
/** state of charge and heat shown this much faster than real */
const TIME = 60;
const NOMINAL = 51.8;
/**
* The pack's physics, stepped in time: 14 rows, each 20 cells in parallel, their electrics, their heat and the BMS over
* them. Everything the page shows comes from here.
* @param {{ load: { value: number }, ambient: { value: number }, soc: { value: number }, aged: { value: number }, drawer: { value: number }, trigger: { value: number } }} ctl
*/
function solver(ctl) {
	const n = CELLS.s;
	const s = {
		used: 0,
		bal: new Float64Array(n),
		soc: new Float64Array(n).fill(.7),
		T: new Float64Array(n).fill(20),
		Vr: new Float64Array(n).fill(3.86),
		R: new Float64Array(n),
		Td: 20,
		Ts: 20,
		Voc: 0,
		V: 0,
		I: 0,
		P: 0,
		q: 0,
		closed: true,
		fault: "",
		latched: false,
		ocTimer: 0,
		balancing: 0,
		plugged: true,
		blink: 0,
		at: {
			load: ctl.load.value,
			soc: ctl.soc.value
		}
	};
	/** a row's capacity (Ah): 20 cells, the aged row's less */
	const Qrow = (i) => CELLS.p * CELL.Q * (i === 6 ? 1 - .4 * (ctl.aged.value / 100) : 1);
	const rFactor = (i) => i === 6 ? 1 + 2 * (ctl.aged.value / 100) : 1;
	const setSoc = (soc) => {
		s.used = (1 - soc) * CELLS.p * CELL.Q;
		s.bal.fill(0);
	};
	setSoc(ctl.soc.value / 100);
	/** @param {number} dt @param {{ broken: boolean }} env */
	function step(dt, env) {
		const Ta = ctl.ambient.value;
		if (Math.abs(ctl.soc.value - s.at.soc) > .01) {
			setSoc(ctl.soc.value / 100);
			s.at.soc = ctl.soc.value;
		}
		if (Math.abs(ctl.load.value - s.at.load) > 1e-6) {
			s.at.load = ctl.load.value;
			if (s.latched && !env.broken) s.latched = false;
		}
		s.plugged = ctl.drawer.value < 10;
		for (let i = 0; i < n; i++) s.soc[i] = clamp(1 - (s.used + s.bal[i]) / Qrow(i));
		let Voc = 0, Rsum = BMS.R + LINK.series;
		for (let i = 0; i < n; i++) {
			s.R[i] = (rCell(s.T[i], s.soc[i]) * rFactor(i) + 2 * LINK.contact) / CELLS.p;
			Voc += ocv(s.soc[i]);
			Rsum += s.R[i];
		}
		s.Voc = Voc;
		let P = env.broken ? BMS.ocPeak * (Voc - BMS.ocPeak * Rsum) : ctl.load.value * 1e3;
		let I = 0;
		if (s.closed && s.plugged) {
			if (P >= 0) {
				const disc = Voc * Voc - 4 * P * Rsum;
				I = disc > 0 ? (Voc - Math.sqrt(disc)) / (2 * Rsum) : Voc / (2 * Rsum);
			} else {
				const Vc = (Voc + Math.sqrt(Voc * Voc - 4 * P * Rsum)) / 2;
				I = Math.max(P / Vc, -BMS.chg);
				let cv = Infinity;
				for (let i = 0; i < n; i++) cv = Math.min(cv, Math.max(0, CELL.Vmax - ocv(s.soc[i])) / s.R[i]);
				I = Math.max(I, -cv);
				if (s.soc.every((x) => x >= .999)) I = 0;
			}
		}
		s.I = I;
		let Vmin = 9, Vmax = 0, Tmax = -99, V = 0;
		for (let i = 0; i < n; i++) {
			s.Vr[i] = ocv(s.soc[i]) - I * s.R[i];
			V += s.Vr[i];
			Vmin = Math.min(Vmin, s.Vr[i]);
			Vmax = Math.max(Vmax, s.Vr[i]);
			Tmax = Math.max(Tmax, s.T[i]);
		}
		s.V = V - I * (BMS.R + LINK.series);
		s.P = s.V * I;
		if (Math.abs(I) > BMS.oc) s.ocTimer += dt;
		else s.ocTimer = Math.max(0, s.ocTimer - dt);
		let fault = "";
		if (Math.abs(I) > BMS.ocPeak * .999 || s.ocTimer > BMS.peakS) fault = "over-current";
		else if (Vmin < BMS.uv && I > 0) fault = "under-voltage";
		else if (Vmax > BMS.ov && I < 0) fault = "over-voltage";
		else if (Tmax > BMS.ot || I < 0 && Tmax > BMS.otChg) fault = "over-temperature";
		if (fault && s.closed) {
			s.closed = false;
			s.fault = fault;
			s.latched = fault === "under-voltage" || fault === "over-current";
			s.ocTimer = 0;
		} else if (!s.closed) {
			const cool = Tmax < BMS.ot - 10, ok = Vmin > BMS.uv + .2 && Vmax < BMS.ov - .1;
			if (cool && ok && !s.latched && !env.broken) {
				s.closed = true;
				s.fault = "";
			}
		}
		const h = dt * TIME / 3600;
		s.used += I * h;
		s.balancing = 0;
		if (I <= 0) {
			for (let i = 0; i < n; i++) if (s.Vr[i] > BMS.balAt && s.Vr[i] - Vmin > .01) {
				s.bal[i] += BMS.bal * h;
				s.balancing++;
			}
		}
		const dts = dt * TIME;
		let q = I * I * (BMS.R + LINK.series), qd = q;
		const T = s.T, dT = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const qi = I * I * s.R[i];
			q += qi;
			let flow = qi - HEAT.Grd * (T[i] - s.Td);
			if (i > 0) flow -= HEAT.Grr * (T[i] - T[i - 1]);
			if (i < n - 1) flow -= HEAT.Grr * (T[i] - T[i + 1]);
			dT[i] = flow / HEAT.Crow;
			qd += HEAT.Grd * (T[i] - s.Td);
		}
		for (let i = 0; i < n; i++) T[i] += dT[i] * dts;
		s.q = q;
		s.Td += (qd - HEAT.Gds * (s.Td - s.Ts) - .5 * (s.Td - Ta)) / HEAT.Cd * dts;
		s.Ts += (HEAT.Gds * (s.Td - s.Ts) - HEAT.Gsa * (s.Ts - Ta)) / HEAT.Cs * dts;
		s.blink = (s.blink + dt) % 1;
		return {
			Vmin,
			Vmax,
			Tmax
		};
	}
	/** the break taken back: the fault cleared, the pack closed again on the load it had */
	function reset() {
		s.latched = false;
		s.ocTimer = 0;
	}
	/** the pack's charge left (Ah): what its weakest row still holds, and the energy (Wh) */
	const left = () => {
		let ah = Infinity;
		for (let i = 0; i < n; i++) ah = Math.min(ah, s.soc[i] * Qrow(i));
		return {
			ah,
			wh: ah * NOMINAL
		};
	};
	const socPack = () => s.soc.reduce((a, b) => a + b, 0) / n;
	const hottest = () => {
		let k = 0;
		for (let i = 1; i < n; i++) if (s.T[i] > s.T[k]) k = i;
		return k;
	};
	return {
		s,
		step,
		reset,
		left,
		socPack,
		hottest,
		Qrow
	};
}
/**
* The BatteryPack: a root at its real size, every part its own, its solver running it per row. v11 (the default) adds
* its own moves, Service and Grip; v10 is the same pack without them.
* @param {{ load?: number, ambient?: number, soc?: number, v?: 10 | 11 }} [o] the load (kW, negative charging), the room (°C), the state of charge (%), the version
* @returns {THREE.Group}
*/
function batteryPack({ load = 2, ambient = 20, soc = 70, v = 11 } = {}) {
	const root = new three.Group();
	root.name = "BatteryPack";
	const M = materials();
//#piece d5d78ccefef894c437687fae264180dc00d137685e8c45724436b8f720d81536
//#piece cff0b2786c48aff1df9ada434c7d97b5513ea1d90436747935c358aba777102b
	/** a group of meshes turning or sliding about a point (mm): its origin there, the meshes drawn where they are */
	const pivot = (p, objs) => {
		const g = new three.Group();
		g.position.set(...L(...p));
		for (const o of objs) {
			o.position.copy(g.position).negate();
			g.add(o);
		}
		return g;
	};
	/** the mass of some solids (kg) at a density (kg/m³) @param {THREE.BufferGeometry[]} geos @param {number} rho */
	const kg = (geos, rho) => geos.reduce((a, g) => a + GEO.volume(g).V * rho, 0);
	let mass = CELLS.s * CELLS.p * CELL.m + .35;
	/** the service drawer: everything on it slides out as one */
	const drawer = new three.Group();
	drawer.name = "drawer";
	root.add(drawer);
	/** @type {Record<string, THREE.Object3D>} */
	const moving = {};
	{
		const sillWall = (p) => {
			capD(p);
			p.holes.push(rrect(0, (Y0 + Lh) / 2, PACK.W - 8, Lh - Y0 - 6, 20, true));
		};
		const faceG = GEO.merge([
			prism(shellU(4), 0, FOOT),
			prism(capD, 0, 3),
			prism(capD, 17, 3),
			prism(sillWall, 3, 14),
			prism(postP(-1), 19, POST.top - FOOT + 1),
			prism(postP(1), 19, POST.top - FOOT + 1)
		]);
		const caseG = GEO.merge([
			prism(shellU(4), FOOT, 90),
			prism(shellU(0), 0, 3),
			prism(shellU(0), 15, 3)
		]);
		const seamG = prism(shellU(4), 110, 2);
		const lidG = GEO.merge([prism(shellU(4), 112, 13), prism(shellU(0), PACK.H - 4, 4)]);
		const skids = GEO.merge([-1, 1].map((sx) => box(sx * 170, -15, -1, 20, 370, 3, 1)));
		mass += kg([
			faceG,
			caseG,
			seamG,
			lidG
		], 2700);
		part({
			id: "shell",
			label: "Shell",
			assembly: "shell",
			source: SRC.ours,
			what: "The pack’s outer shell: a foot (its floor tub and, across the face, a sill, both hollow boxes 20 mm high), walls, top and back in one smooth aluminium piece, open at the front above the sill where the service drawer slides in. Its two front corners stand up as columns to the base plate’s top, each with a release button in its face and the drawer’s catch inside. It is what you carry and what the cube holds: the grip, the ClickLock and the two release buttons are all on it.",
			specs: [
				["Outside", "460 × 480 × 125 mm"],
				["Foot and sill", `${FOOT} mm high, hollow`],
				["Columns", `${POST.w} mm wide, to ${POST.top} mm`],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"],
				["Skids", "2 strips under the floor, 3 mm"]
			]
		}, [
			m(faceG, M.face),
			m(caseG, M.shell),
			m(seamG, M.seam),
			m(lidG, M.lid),
			m(skids, M.grip)
		], {
			explode: [
				0,
				0,
				-.42
			],
			xray: "shell",
			tag: {
				text: "Shell",
				at: L(-200, -120, PACK.H),
				value: () => `${fmt(sim.s.Ts)} °C`,
				side: "left"
			}
		});
		const yb = -Lh - 2;
		const sock = [m(box(0, -Lh - 1, 58, 170, 2, 46, 1), M.black), m(box(0, -Lh + 2.5, 58, 170, 5, 46, 1), M.black)];
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {THREE.Material} ring */
		const holeAt = (x, z, r, ring) => sock.push(m(cyl([
			x,
			yb,
			z
		], [
			x,
			yb - .4,
			z
		], r + 2, 16), ring), m(cyl([
			x,
			yb - .4,
			z
		], [
			x,
			yb - .6,
			z
		], r, 16), M.hole));
		for (const x of [-45, 45]) {
			holeAt(x, 58, 9.5, M.face);
			sock.push(m(cyl([
				x,
				yb - .6,
				58
			], [
				x,
				-Lh + 7,
				58
			], 4.5, 16), M.brass));
		}
		sock.push(m(box(0, yb - .2, 58, 50, .4, 16, 2), M.face), m(box(0, yb - .5, 58, 45, .4, 13, 2), M.hole));
		for (let k = 0; k < 4; k++) sock.push(m(cyl([
			-12 + k * 8,
			yb - .7,
			58
		], [
			-12 + k * 8,
			-Lh + 7,
			58
		], 1.6, 8), M.gold));
		for (const sx of [-1, 1]) {
			sock.push(m(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), M.black));
			holeAt(sx * 150, 58, 5.5, M.steel);
		}
		part({
			id: "socket",
			label: "Back socket",
			assembly: "shell",
			source: SRC.ours,
			what: "The pack’s plus, minus and data in one socket flush in its back, nothing sticking out, its holes in one line: guide, power, data, power, guide. The power contacts sit at the bottom of pockets that take the cube’s insulating collars, so no metal is ever open to a finger; the two lined guide holes take the cube’s guide pins first. Inside the wall the same contact tubes take the drawer’s inner plug: slide the pack in and it plugs itself into the backplane; pull the drawer and it lets go.",
			specs: [
				["Power", "2 pockets ⌀ 19 mm, tubes for ⌀ 8 mm pins, 120 A [inferred]"],
				["Data", "CAN, 4 sockets in one pocket"],
				["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"],
				["Contact", "~0.1 mΩ each [inferred]"],
				["Touch", "Finger-safe, IP2X"]
			]
		}, sock, {
			explode: [
				0,
				0,
				-.595
			],
			tag: {
				text: "Back socket",
				at: L(0, -Lh - 2, 58),
				value: () => sim.s.plugged ? `${fmt(sim.s.V, 1)} V · ${fmt(sim.s.I)} A` : "unplugged",
				side: "right"
			}
		});
		part({
			id: "grip",
			label: "Grip",
			assembly: "shell",
			source: SRC.ours,
			what: "One grip for one hand on the shell itself, in the middle of the sill across its foot: carry the pack by it and the shell takes the weight, never the drawer. Its trigger sits at the very height of the ClickLock’s pawls in the foot, so the two release cables run straight to them: close your fingers round it and the pawls pull back, so the pack slides out in the same move; let go and it clicks home again.",
			specs: [
				["Width", "150 mm, for a gloved hand"],
				["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${LOCK_Z} mm: the lock’s height`],
				["On", "The shell’s sill"],
				["Release", "Trigger in the grip, ~20 N"],
				["Carries", "~26 kg [inferred, as v9 said; see the card of the shell for the weight of the geometry]"]
			]
		}, [m(GEO.merge([
			box(-82, Lh + 14, GRIP_Z, 16, 28, 15, 5),
			box(82, Lh + 14, GRIP_Z, 16, 28, 15, 5),
			box(0, Lh + 30, GRIP_Z, 180, 16, 15, 6)
		]), M.grip), m(box(0, Lh + 38.5, 13, 120, 1, 2, .4), M.line)], { explode: [
			0,
			-.035,
			.21
		] });
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			const bx = sx * (PX + 8), bz = 18, cz = 22.5;
			const btn = pivot([
				bx,
				Lh,
				bz
			], [
				m(cyl([
					bx,
					Lh + .2,
					bz
				], [
					bx,
					Lh + 1,
					bz
				], 7, 18), M.steel),
				m(cyl([
					bx,
					Lh - 4,
					bz
				], [
					bx,
					Lh + 2.4,
					bz
				], 5, 18), M.dark),
				m(cyl([
					bx,
					Lh - 6,
					bz
				], [
					bx,
					CATCH_Y + 6,
					bz
				], 1.8, 8), M.steel),
				m(box(bx, CATCH_Y + 4, 40.5 / 2, 6, 6, 10.5, .5), M.steel)
			]);
			part({
				id: `release-${side}`,
				label: `Release button, ${side}`,
				assembly: "shell",
				source: SRC.ours,
				what: "A round push button in the face of the shell’s corner column on its side, at the base plate’s level: part of the shell, so it stays put while the drawer comes out. Behind it a short plunger with a wedge runs back inside the column and pushes the catch’s bolt out of its notch in the base plate. Press both, pull the drawer by its finger pull, and the whole inside slides out between the columns.",
				moves: "In by 4 mm when pressed.",
				drive: "A thumb",
				specs: [
					["Button", "⌀ 14 mm, 4 mm travel"],
					["On", "The shell’s corner column"],
					["Force", "~10 N each [inferred]"]
				]
			}, [btn], { explode: [
				0,
				0,
				.14
			] });
			moving[`release-${side}`] = btn;
			const bolt = pivot([
				sx * PX,
				CATCH_Y,
				cz
			], [
				m(cyl([
					sx * (PX - 4.5),
					CATCH_Y,
					cz
				], [
					sx * (Wh - 8),
					CATCH_Y,
					cz
				], 2.5, 12), M.steel),
				m(cyl([
					sx * (PX + 9),
					CATCH_Y,
					cz
				], [
					sx * (PX + 11),
					CATCH_Y,
					cz
				], 3.5, 12), M.steel),
				m(coilX(sx < 0 ? -(PX + 29) : PX + 12, sx < 0 ? -(PX + 12) : PX + 29, CATCH_Y, cz, 3.2, .5, 6), M.spring)
			]);
			part({
				id: `catch-${side}`,
				label: `Drawer catch, ${side}`,
				assembly: "shell",
				source: SRC.ours,
				what: "A spring bolt lying across inside the shell’s corner column, at the base plate’s height: its spring pushes its tip into a notch in the base plate’s edge and holds the drawer in. The button’s wedge pushes it back out; slide the drawer home and the bolt clicks in again on its own.",
				moves: "Sideways, 5 mm, out of its notch.",
				drive: "Its spring; the button’s wedge against it",
				specs: [
					["Bolt", "Stainless, ⌀ 5 mm, 5 mm travel"],
					["Spring", "Compression, ~12 N [inferred]"],
					["In", "The shell’s corner column"]
				]
			}, [bolt], { explode: [
				sx * .105,
				.042,
				0
			] });
			moving[`catch-${side}`] = bolt;
		}
	}
	{
		const y = Lh - LOCK_BACK, z = LOCK_Z;
		const pawls = [-1, 1].map((sx) => pivot([
			sx * 223,
			y - 38,
			z
		], [m(GEO.merge([box(sx * 223, y - 18, z, 5, 44, 8, 1), box(sx * 232, y, z, 8, 10, 8, 1)]), M.steel)]));
		part({
			id: "lock-pawls",
			label: "Pawls",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "Two steel levers, one inside each side of the hollow foot. Each pivots at its back end; its tooth at the front pokes out through a slot in the wall. Sliding in, the tooth rides up the rail’s ramp, is pushed in, and snaps out again behind the keeper: that is the click.",
			moves: "Swing in 4 mm at the tooth when the trigger is pulled.",
			drive: "The release cables; the springs push them out again",
			specs: [
				["Material", "Stainless steel, 5 mm, hardened tooth"],
				["Travel", "4 mm"],
				["Hold", "~300 N each [inferred]"]
			]
		}, pawls, { explode: [
			0,
			-.084,
			0
		] });
		moving["pawl-left"] = pawls[0];
		moving["pawl-right"] = pawls[1];
		const springs = [];
		for (const sx of [-1, 1]) springs.push(m(coilX(sx < 0 ? -220.5 : 206, sx < 0 ? -206 : 220.5, y - 4, z, 3, .5, 6), M.spring), m(box(sx * 204, y - 4, z, 4, 10, 10, .5), M.steel));
		part({
			id: "lock-springs",
			label: "Pawl springs",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "A small coil spring behind each pawl, against a boss on the floor, presses its tooth outward, so it always drops into the keeper on its own: you never have to lock it, only to unlock it.",
			specs: [["Type", "Compression, stainless, ⌀ 6 mm"], ["Force", "~15 N each [inferred]"]]
		}, springs, { explode: [
			0,
			-.112,
			0
		] });
		part({
			id: "lock-pivots",
			label: "Pivot pins",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "A pin through each pawl’s back end, standing between the foot’s two sheets: the pawl swings round it, in and out.",
			specs: [["Pin", "⌀ 5 mm, stainless"]]
		}, [-1, 1].map((sx) => m(cyl([
			sx * 223,
			y - 38,
			1
		], [
			sx * 223,
			y - 38,
			19
		], 2.5, 10), M.steel)), { explode: [
			0,
			-.14,
			0
		] });
		const cables = [];
		for (const sx of [-1, 1]) cables.push(m(hose([
			[
				sx * 60,
				Lh + 22,
				z
			],
			[
				sx * 60,
				Lh - 10,
				z
			],
			[
				sx * 206,
				Lh - 10,
				z
			],
			[
				sx * 222,
				y - 6,
				z
			]
		], 1.6), M.dark));
		part({
			id: "lock-cables",
			label: "Release cables",
			assembly: "lock",
			count: 2,
			source: SRC.ours,
			what: "Two short steel cables in sleeves, both at the pawls’ own height: from the trigger in through the face, along the inside of the hollow sill to the corner and straight back along the side of the foot to the pawl, no bend up or down. Pulling the trigger pulls both cables, and both pawls swing in together, out of their keepers.",
			specs: [["Cable", "⌀ 1.5 mm steel in a PTFE sleeve"], ["Pull", "4 mm"]]
		}, cables, { explode: [
			0,
			-.07,
			.07
		] });
		const trig = pivot([
			0,
			Lh + 22,
			z
		], [m(box(0, Lh + 22, z, 130, 8, 8, 3), M.dark), m(box(0, Lh + 26.5, z, 90, .6, 2, .3), M.line)]);
		part({
			id: "lock-trigger",
			label: "Trigger",
			assembly: "lock",
			source: SRC.ours,
			what: "The bar under the grip: your fingers close round the grip and press it up, it pulls both cables, and the pawls let go. Let go and the springs push it back.",
			moves: "Up 4 mm when squeezed.",
			drive: "Your fingers",
			specs: [["Force", "~20 N"], ["Travel", "4 mm"]]
		}, [trig], { explode: [
			0,
			-.042,
			.14
		] });
		moving.trigger = trig;
	}
	{
		const Z = POST.top;
		const frontWall = (p) => {
			capD(p);
			p.holes.push(rrect(0, (Y0 + Lh) / 2, PACK.W - 6, Lh - Y0 - 6, 10, true));
		};
		const frontSkin = GEO.merge([
			prism(capD, Z, 3),
			prism(frontWall, Z + 3, 110 - Z - 6),
			prism(capD, 107, 3)
		]), frontMid = box(0, (Y0 + Lh) / 2, (FOOT + Z) / 2, 2 * PX - 1, Lh - Y0, Z - FOOT);
		const frontG = GEO.merge([frontSkin, frontMid]);
		const faceG = box(0, Lh + 1, 66, 380, 3, 68, 1);
		mass += kg([
			frontSkin,
			frontMid,
			faceG
		], 2700);
		part({
			id: "front",
			label: "Front plate",
			assembly: "drawer",
			source: SRC.ours,
			what: "The upright of the service drawer’s L: the pack’s face above the sill and the two columns, its round front corners and bands flush with the shell. A long finger pull along its foot and the charge strip along its top; nothing you carry by. The base plate is fixed to its foot.",
			specs: [
				["Size", `460 × 30 × ${PACK.H - FOOT} mm`],
				["Pull", "Finger slot, 240 mm"],
				["Walls", "3 mm, a hollow moulding [inferred]"],
				["Material", "Aluminium, black anodised"]
			]
		}, [
			m(frontG, M.shell),
			m(prism(capD, 110, 2), M.seam),
			m(prism(capD, 112, 13), M.lid),
			m(faceG, M.face),
			m(box(0, Lh + 1.2, 27, 240, 3, 8, 3), M.black),
			m(box(0, Lh + 1.6, 25.5, 228, 2.4, 4), M.hole)
		], {
			explode: [
				0,
				0,
				.28
			],
			xray: "shell"
		}, drawer);
		const bw = 2 * (PX - 2);
		const baseG = box(0, (Y0 - Lh + 4) / 2, 22.5, bw, Y0 + Lh - 4, 5, 1);
		mass += kg([baseG], 2700);
		part({
			id: "base",
			label: "Base plate",
			assembly: "drawer",
			source: SRC.ours,
			what: "The floor of the service drawer’s L, riding on the shell’s foot between its two columns: every inner part is mounted on it, the film and the bottom plates, the cells’ holders, the clamp and the BMS. It runs on two low-friction strips on the foot’s top skin and slides out over the sill; the catches’ bolts click into the two notches in its edges.",
			specs: [
				["Size", `${bw} × ${Y0 + Lh - 4} × 5 mm, between the columns`],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips, 2 mm"],
				["Notches", "2, for the catches’ bolts"]
			]
		}, [
			m(baseG, M.plate),
			m(GEO.merge([-1, 1].map((sx) => box(sx * (bw / 2 - 40), (Y0 - Lh + 4) / 2, 19, 14, Y0 + Lh - 10, 2, .3))), M.ptfe),
			m(GEO.merge([-1, 1].map((sx) => box(sx * (bw / 2 - 2.5), CATCH_Y, 22.5, 5.4, 9, 5.2))), M.hole)
		], { explode: [
			0,
			0,
			0
		] }, drawer);
		/** @type {THREE.MeshPhysicalMaterial[]} */
		const leds = [];
		const segs = [];
		for (let k = 0; k < 10; k++) {
			const mat = MAT.plastic({
				color: [
					.06,
					.09,
					.075
				],
				emissive: [
					.12,
					.95,
					.4
				],
				emissiveIntensity: 0,
				roughness: .3,
				finish: null
			});
			leds.push(mat);
			segs.push(m(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), mat));
		}
		part({
			id: "charge",
			label: "Charge strip",
			assembly: "drawer",
			source: SRC.ours,
			what: "A slim LED strip along the top of the face, under the lid’s seam: ten segments light up with the pack’s state of charge, one a tenth; the next one breathes while it charges, and when the BMS has opened the pack the lit ones blink red.",
			specs: [
				["Length", "380 mm, 10 segments"],
				["Shows", "State of charge, 10 % a segment; a fault in red"],
				["Fed by", "The BMS, by a ribbon up the face"]
			]
		}, [m(box(0, Lh + .5, 104, 386, 2, 7, 1), M.black), ...segs], {
			explode: [
				0,
				.035,
				.35
			],
			tag: {
				text: "Charge strip",
				at: L(0, Lh + 2, 104),
				value: () => `${fmt(sim.socPack() * 100)} %${sim.s.fault ? " · " + sim.s.fault : ""}`,
				side: "right"
			}
		}, drawer);
		moving.leds = leds;
		const clampG = box(0, CELLS.y, 111, 446, 314, 4, 2);
		const posts = GEO.merge(POSTS.flatMap(([x, y]) => [cyl([
			x,
			y,
			POST.top
		], [
			x,
			y,
			113
		], 3, 12), nut(x, y, 113, 5, 4)]));
		mass += kg([clampG], 2700) + kg([posts], 7900);
		part({
			id: "clamp",
			label: "Clamp",
			assembly: "drawer",
			source: SRC.ours,
			what: "A stiff plate on four posts over the cells, its foam pad pressing every top contact plate onto its poles with about 90 N a cell: the only joining force in the pack, so every cell comes out again. On the drawer, so the cells stay pressed when it comes out.",
			specs: [
				["Plate", "Aluminium, 4 mm"],
				["Pad", "Silicone foam, 4.5 mm, ~0.2 MPa [inferred]"],
				["Force", `${fmt(25920 / 1e3)} kN over 280 cells: ~${fmt(25920 / 280)} N each [computed]`],
				["Posts", "4 × M6, from the base plate"]
			]
		}, [
			m(clampG, M.plate),
			m(box(0, CELLS.y, 106.75, 432, 300, 4.5, 1), M.foam),
			m(posts, M.steel)
		], {
			explode: [
				0,
				.294,
				0
			],
			xray: "shell"
		}, drawer);
	}
	{
		const holder = (z0, h, r) => {
			const shape = new three.Shape();
			const X = zone.w / 2, Y0h = CELLS.y - zone.l / 2, Y1h = CELLS.y + zone.l / 2;
			shape.moveTo(...at2(-X, Y0h));
			shape.lineTo(...at2(X, Y0h));
			shape.lineTo(...at2(X, Y1h));
			shape.lineTo(...at2(-X, Y1h));
			shape.closePath();
			for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) shape.holes.push(hole(colX(j), rowY(i), r));
			for (const [x, y] of POSTS) shape.holes.push(hole(x, y, 3.3));
			const g = new three.ExtrudeGeometry(shape, {
				depth: h * S,
				curveSegments: 3,
				bevelEnabled: false
			});
			g.rotateX(-Math.PI / 2).translate(0, (z0 + LIFT) * S, 0);
			g.clearGroups();
			return g;
		};
		const hb = GEO.merge([holder(27, 6, 5), holder(33, 6, 10.7)]);
		const ht = holder(TOP - 9, 6, 10.7);
		mass += kg([hb, ht], 1200);
		part({
			id: "holder-bottom",
			label: "Bottom cell holder",
			assembly: "cells",
			source: SRC.ours,
			what: "A plate of flame-retardant plastic on the bottom contact plates with a socket for every cell’s foot: a floor with a hole under each cell for the plate’s spring finger, and a honeycomb of collars 6 mm high that keeps the cells 22 mm apart, air between them.",
			specs: [
				["Material", "PC/ABS, UL94 V-0 [inferred]"],
				["Pitch", "22 mm"],
				["Floor and collars", "6 + 6 mm"],
				["Holes", `${CELLS.s * CELLS.p} + 4`]
			]
		}, [m(hb, M.holder)], { explode: [
			0,
			.098,
			0
		] }, drawer);
		part({
			id: "holder-top",
			label: "Top cell holder",
			assembly: "cells",
			source: SRC.ours,
			what: "The same plate round the cells’ heads, its holes leaving each pole bare for the top contact plates.",
			specs: [
				["Material", "PC/ABS, UL94 V-0 [inferred]"],
				["Thickness", "6 mm"],
				["Holes", `${CELLS.s * CELLS.p} + 4`]
			]
		}, [m(ht, M.holder)], { explode: [
			0,
			.21,
			0
		] }, drawer);
		const cz = (x, y, z0, z1, r, n) => cyl([
			x,
			y,
			z0
		], [
			x,
			y,
			z1
		], r, n);
		for (let i = 0; i < CELLS.s; i++) {
			const y = rowY(i), flip = i % 2 === 1;
			const zz = (z) => flip ? CELLS.z0 + TOP - z : z;
			const sleeve = [], can = [], roll = [], cap = [], ring = [], vent = [];
			for (let j = 0; j < CELLS.p; j++) {
				const x = colX(j);
				sleeve.push(cz(x, y, zz(CELLS.z0 + .2), zz(TOP - 1.5), CELLS.r, 14));
				can.push(cz(x, y, zz(CELLS.z0), zz(TOP - 1.7), CELLS.r - .2, 12));
				roll.push(cz(x, y, zz(CELLS.z0 + .6), zz(TOP - 2.4), CELLS.r - .6, 12));
				ring.push(cz(x, y, zz(TOP - 1.7), zz(TOP - 1.2), CELLS.r - .2, 12));
				cap.push(cz(x, y, zz(TOP - 1.5), zz(TOP), 6.5, 12));
				for (let k = 0; k < 3; k++) {
					const a = k / 3 * Math.PI * 2;
					vent.push(new three.BoxGeometry(2.6 * S, .3 * S, .9 * S).rotateY(a).translate(...L(x + 4 * Math.cos(a), y + 4 * Math.sin(a), zz(TOP) + (flip ? -.1 : .1))));
				}
			}
			const k = i + 1;
			part({
				id: `row-${k}`,
				label: `Row ${k}`,
				assembly: "cells",
				count: CELLS.p,
				source: SRC.cell,
				what: `Twenty 21700 cells side by side in parallel, ${flip ? "standing on their heads: their caps on the bottom plate, their cans’ bottoms up under the top plate" : "standing caps up: their cans’ bottoms on the bottom plate, their caps under the top plate"}. Each is a nickel-plated steel can with the wound electrodes (the jelly roll) inside, a crimped positive cap with its vent over a gasket and an insulator ring, in a blue PVC sleeve; held, not welded: a worn cell is pulled and a new one pushed in.`,
				specs: [
					["Cell", "21700 NMC: 5,000 mAh, 3.6 V nominal, 4.20–2.5 V, 10 A max, 69 g"],
					["Resistance", "25 mΩ DC at 25 °C and 50 % [inferred: about twice the 1 kHz figure]"],
					["Row", `20 in parallel: ${fmt(CELLS.p * CELL.Q)} Ah, 1.25 mΩ + 0.05 mΩ of contacts at 25 °C`],
					["Heat capacity", `${fmt(HEAT.Crow)} J/K (1,008 J/kg·K a cell)`],
					["Limits", `${BMS.uv} V under, ${BMS.ov} V over, ${BMS.ot} °C`]
				]
			}, [
				m(GEO.merge(sleeve), M.sleeve),
				m(GEO.merge(can), M.can),
				m(GEO.merge(roll), M.roll),
				m(GEO.merge(ring), M.ring),
				m(GEO.merge(cap), M.cap),
				m(GEO.merge(vent), M.hole)
			], {
				explode: [
					0,
					.14,
					0
				],
				delay: .1 + i / CELLS.s * .15,
				...i % 2 === 0 ? { tag: {
					text: `Rows ${k}–${k + 1}`,
					at: L((i < 7 ? -1 : 1) * (colX(CELLS.p - 1) + CELLS.r), (y + rowY(i + 1)) / 2, (CELLS.z0 + TOP) / 2),
					value: () => `${fmt(sim.s.Vr[i], 2)} · ${fmt(sim.s.Vr[i + 1], 2)} V · ${fmt(sim.s.T[i])} · ${fmt(sim.s.T[i + 1])} °C`,
					side: i < 7 ? "left" : "right"
				} } : {}
			}, drawer);
		}
	}
	{
		part({
			id: "insulation",
			label: "Insulation film",
			assembly: "contacts",
			source: SRC.ours,
			what: "A polyimide film between the bottom contact plates and the aluminium base plate: the plates are live, the drawer is not. Thin, so the cells’ heat still goes down through it into the drawer.",
			specs: [["Material", "Polyimide, 0.5 mm"], ["Heat", "~8 W/K a row through it [computed]"]]
		}, [m(box(0, CELLS.y, 25.25, PLATE_W, 320, .5), M.film)], { explode: [
			0,
			.035,
			0
		] }, drawer);
		const bottom = NODES.filter((n) => !n.top).map((n) => box(0, n.y, n.z, PLATE_W, n.len, 1.5));
		const fingers = [];
		for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) fingers.push(box(colX(j), rowY(i), 30, 6, 1.6, 6));
		const pb = GEO.merge([...bottom, ...fingers]);
		const pt = GEO.merge(NODES.filter((n) => n.top).map((n) => box(0, n.y, n.z, PLATE_W, n.len, 1.5)));
		mass += kg([pb, pt], 8900);
		part({
			id: "plates-bottom",
			label: "Bottom contact plates",
			assembly: "contacts",
			count: 8,
			source: SRC.press,
			what: "Copper plates under the cells on the film: six that each join a row’s poles to the next row’s, and the two end plates, the pack’s minus (row 1) and plus (row 14). Each has a spring finger per cell, pressed up through the holder’s hole onto the pole by the clamp’s force: a pressed contact, no weld, so every cell comes out again.",
			specs: [
				["Material", "Copper, nickel-plated, 1.5 mm"],
				["Resistivity", "1.72e-8 Ω·m, +0.39 %/K"],
				["Current density", "0.15 A/mm² across a plate, 0.5 A/mm² in a finger at 100 A [computed]"],
				["Contact", "0.5 mΩ a cell at ~90 N [inferred]"],
				["Fingers", `${CELLS.s * CELLS.p}, 6 mm high`]
			]
		}, [m(pb, M.copper)], { explode: [
			0,
			.063,
			0
		] }, drawer);
		part({
			id: "plates-top",
			label: "Top contact plates",
			assembly: "contacts",
			count: 7,
			source: SRC.press,
			what: "Copper plates over the cells, each joining a row’s poles to the next row’s: with the bottom plates they put the 14 rows in series, the current snaking up one row and down the next. Pressed flat onto the poles by the clamp’s pad.",
			specs: [
				["Material", "Copper, nickel-plated, 1.5 mm"],
				["Pressed by", "The clamp’s pad, ~90 N a cell"],
				["Each", `${PLATE_W} × ${2 * CELLS.pitch - 3} mm, two rows`]
			]
		}, [m(pt, M.copper)], { explode: [
			0,
			.252,
			0
		] }, drawer);
	}
	{
		const by = rowY(CELLS.s - 1) + 60;
		const board = [m(box(0, by, 67, 400, 80, 2, .5), M.pcb)];
		board.push(m(GEO.merge([-1, 1].flatMap((sx) => [by - 36, by + 36].map((y) => cyl([
			sx * 195,
			y,
			POST.top
		], [
			sx * 195,
			y,
			66
		], 2.5, 8)))), M.brass));
		board.push(m(GEO.merge([
			box(-185, by, 69, 20, 16, 2),
			box(185, by - 30, 69, 20, 16, 2),
			box(185, by + 30, 69, 20, 16, 2),
			box(165, by, 69, 16, 16, 2)
		]), M.pad));
		board.push(m(GEO.merge([
			box(-160, by - 20, 68.5, 7, 7, 1),
			box(-160, by, 68.5, 7, 7, 1),
			box(-160, by + 20, 68.6, 10, 10, 1.2),
			...[
				-100,
				-88,
				-76,
				44,
				56,
				68
			].map((x) => cyl([
				x,
				by - 32,
				68
			], [
				x,
				by - 32,
				73
			], 2.5, 10)),
			box(-60, by + 32, 71, 50, 5, 6)
		]), M.chip));
		part({
			id: "bms",
			label: "Battery management system",
			assembly: "electronics",
			source: SRC.bms,
			what: "The board in front of the cells on the drawer: two front-end chips read every row’s voltage and the thermistors on the plates, a microcontroller runs the protection and talks CAN to the inverter through the plug. It opens the MOSFETs on any row under 2.80 V or over 4.25 V, any row over 60 °C, or over-current (past 100 A for 10 s, or 250 A at once), and bleeds the high rows at 100 mA above 4.10 V while charging so they stay together.",
			moves: "Opens and closes the pack.",
			specs: [
				["Rows", "14S, every one measured, balanced"],
				["Cut-offs", `${BMS.uv} V · ${BMS.ov} V · ${BMS.ot} °C · ${BMS.oc} A, ${BMS.ocPeak} A for ${BMS.peakS} s [inferred]`],
				["Balancing", `${BMS.bal * 1e3} mA above ${BMS.balAt} V [inferred]`],
				["Charging", `≤ ${BMS.chg} A (0.5 C), ≤ ${BMS.otChg} °C`],
				["Talks", "CAN to the inverter"]
			]
		}, board, {
			explode: [
				0,
				.14,
				.14
			],
			tag: {
				text: "BMS",
				at: L(-150, by, 69),
				value: () => sim.s.closed ? sim.s.balancing ? `closed · balancing ${sim.s.balancing} rows` : "closed" : `open: ${sim.s.fault}`,
				side: "left"
			}
		}, drawer);
		const fets = [], pours = [];
		for (const [k, y] of [[0, by - 20], [1, by + 20]]) {
			pours.push(box(-60, y, 68.5, 180, 16, 1));
			for (let j = 0; j < 8; j++) fets.push(box(-130 + j * 20, y, 71.25, 10, 15, 4.5, .5));
		}
		part({
			id: "mosfets",
			label: "MOSFET switches",
			assembly: "electronics",
			count: 16,
			source: SRC.bms,
			what: "Sixteen power MOSFETs in two banks of eight on the board’s copper: one bank blocks discharge, the other charge, back to back in the pack’s minus line. They are the pack’s only switch: closed they drop a few millivolts, open the pack is dead at the plug.",
			moves: "Switch in microseconds.",
			drive: "The BMS",
			specs: [
				["Device", "100 V, ~2 mΩ each [inferred]"],
				["Together", `${BMS.R * 1e3 - .4} mΩ for both banks [inferred]`],
				["Heat", "I²R: 5 W at 100 A, into the board’s copper"]
			]
		}, [m(GEO.merge(fets), M.chip), m(GEO.merge(pours), M.pad)], { explode: [
			0,
			.182,
			.14
		] }, drawer);
		part({
			id: "shunt",
			label: "Current shunt",
			assembly: "electronics",
			source: SRC.cu,
			what: "A manganin bar between two copper pads in the minus line: the BMS reads the pack’s current from the millivolts across it, for its counting of the charge and its over-current trip.",
			specs: [["Resistance", "0.1 mΩ: 10 mV at 100 A"], ["Material", "Manganin, 48e-8 Ω·m, flat with temperature"]]
		}, [m(box(60, by, 69.25, 40, 10, 2.5), M.manganin), m(GEO.merge([box(35, by, 68.5, 12, 14, 1), box(85, by, 68.5, 12, 14, 1)]), M.pad)], { explode: [
			0,
			.168,
			.14
		] }, drawer);
		part({
			id: "fuse",
			label: "Fuse",
			assembly: "electronics",
			source: SRC.bms,
			what: "A bolt-down fuse in the plus line, the last guard behind the MOSFETs: a dead short at the plug blows it before any strap or plate can heat.",
			specs: [["Rating", "125 A, 80 V DC [inferred]"], ["Resistance", "0.3 mΩ [inferred]"]]
		}, [m(box(120, by, 75, 44, 20, 14, 2), M.ceramic), m(GEO.merge([box(98, by, 74, 8, 22, 12, 1), box(142, by, 74, 8, 22, 12, 1)]), M.brass)], { explode: [
			0,
			.196,
			.14
		] }, drawer);
		const leads = [];
		for (const n of NODES) {
			const mat = n.k === 0 ? M.wireBlack : n.k === CELLS.s ? M.wireRed : M.wire;
			leads.push(m(hose([
				[
					-216,
					n.y,
					n.z
				],
				[
					-224.5,
					n.y,
					n.z
				],
				[
					-224.5,
					104,
					n.z
				],
				[
					-210,
					106,
					n.z
				],
				[
					-210,
					106,
					74
				],
				[
					-82 + (n.k - 7) * 3,
					by + 30,
					74
				]
			], .7, 6), mat));
		}
		part({
			id: "balance-leads",
			label: "Balance leads",
			assembly: "electronics",
			count: NODES.length,
			source: SRC.bms,
			what: "Fifteen thin leads, one from every contact plate, so the BMS sees every row’s voltage and can bleed any row that runs ahead: from each plate’s end along the gap beside the holders, in front of the cells and up to the header on the board.",
			specs: [["Leads", "15 × 0.5 mm², fused at the plate"], ["Thermistors", "On 4 of the plates [inferred]"]]
		}, leads, { explode: [
			-.07,
			.21,
			.07
		] }, drawer);
		const y0 = rowY(0), y13 = rowY(CELLS.s - 1);
		const bare = [
			box(220.5, y0, 26.25, 9, 19, 1.5),
			box(205, by + 30, 70.75, 39, 20, 1.5),
			box(220.5, y13, 26.25, 9, 19, 1.5),
			box(205, by - 30, 70.75, 39, 20, 1.5),
			box(195, by, 70.75, 59, 20, 1.5),
			box(-205, by, 70.75, 39, 20, 1.5)
		];
		const sleeved = [
			box(224.5, y0, 66, 1.5, 19, 80),
			box(224.5, (y0 - 9.5 + by + 40) / 2, 105, 1.5, by + 40 - y0 + 9.5, 20),
			box(224.5, by + 30, 88, 1.5, 20, 36),
			box(224.5, y13, 48, 1.5, 19, 44),
			box(224.5, (y13 - 9.5 + by - 20) / 2, 70, 1.5, by - 20 - y13 + 9.5, 20),
			box(224.5, by, 58, 1.5, 20, 24),
			box(224.5, (by - 216) / 2, 46, 1.5, by + 216, 20),
			box(269.5 / 2, -216, 46, 179.5, 1.5, 20),
			box(-224.5, by, 58, 1.5, 20, 24),
			box(-224.5, (by - 216) / 2, 46, 1.5, by + 216, 20),
			box(-269.5 / 2, -216, 46, 179.5, 1.5, 20)
		];
		mass += kg([...bare, ...sleeved], 8900);
		part({
			id: "busbars",
			label: "Current straps",
			assembly: "electronics",
			count: 4,
			source: SRC.cu,
			what: "Four flat copper straps in heat-shrink carry the pack’s current, each in the 3 mm gap between the holders and the shell’s wall: from row 14’s plate (the plus) up to the fuse, from the fuse down the right side and across the back to the plug’s plus; from the plug’s minus up the left side to the MOSFETs, and from the shunt along the right side, high, back to row 1’s plate (the minus). Bolted to the pads, no weld.",
			specs: [
				["Strap", "20 × 2 mm copper, 40 mm²: 2.5 A/mm² at 100 A [computed]"],
				["Resistance", `${fmt(LINK.series * 1e3 - .2, 2)} mΩ for the two long runs [computed]`],
				["Insulation", "Heat-shrink, 0.5 mm"]
			]
		}, [m(GEO.merge(bare), M.copper), m(GEO.merge(sleeved), M.strap)], { explode: [
			0,
			.238,
			0
		] }, drawer);
		const plug = [m(box(0, -Lh + 14, 57, 150, 12, 30, 1), M.black)];
		for (const x of [-45, 45]) plug.push(m(cyl([
			x,
			-Lh + 8,
			58
		], [
			x,
			-Lh + 4.5,
			58
		], 3.5, 12), M.brass));
		for (let k = 0; k < 4; k++) plug.push(m(cyl([
			-12 + k * 8,
			-Lh + 8,
			58
		], [
			-12 + k * 8,
			-Lh + 5,
			58
		], 1.2, 8), M.gold));
		part({
			id: "inner-plug",
			label: "Inner plug",
			assembly: "electronics",
			source: SRC.ours,
			what: "At the back of the drawer: the BMS’s plus, minus and data in one plug whose two round pins and four data pins slide into the inside of the shell’s back socket as the drawer goes home, into the same contact tubes the cube’s pins enter from the other side. Pull the drawer 10 mm and the pack is dead at its socket.",
			moves: "Leaves the socket with the drawer.",
			specs: [
				["Power", "2 pins ⌀ 7 mm, 120 A [inferred]"],
				["Data", "CAN, 4 pins"],
				["Engages", "The last 3.5 mm of the drawer’s travel"]
			]
		}, plug, { explode: [
			0,
			.07,
			-.14
		] }, drawer);
	}
	const ctl = {
		load: {
			label: "Load (below 0: charging)",
			min: -2.5,
			max: 5,
			value: load,
			step: .1,
			unit: "kW",
			digits: 1,
			ends: ["Charging at 2.5 kW", "Full load, 100 A"]
		},
		ambient: {
			label: "Room temperature",
			min: -10,
			max: 45,
			value: ambient,
			step: 1,
			unit: "°C",
			ends: ["Cold", "Hot"]
		},
		soc: {
			label: "State of charge (set)",
			min: 0,
			max: 100,
			value: soc,
			step: 1,
			unit: "%",
			ends: ["Empty", "Full"]
		},
		aged: {
			label: "Row 7 aged",
			min: 0,
			max: 100,
			value: 0,
			step: 5,
			unit: "%",
			ends: ["New", "60 % left, 3× resistance"]
		},
		drawer: {
			label: "Drawer out",
			min: 0,
			max: DRAWER_OUT,
			value: 0,
			step: 5,
			unit: "mm",
			ends: ["Home, buttons pressed to start", "Out for service"]
		},
		trigger: {
			label: "Grip trigger",
			min: 0,
			max: 4,
			value: 0,
			step: .5,
			unit: "mm",
			ends: ["Released", "Squeezed: pawls in"]
		}
	};
	const sim = solver(ctl);
	const lanes = [
		-187,
		-99,
		-11,
		77,
		165
	];
	const snake = (x) => {
		const pts = [];
		for (let i = 0; i < CELLS.s; i++) {
			const y = rowY(i), up = i % 2 === 0;
			pts.push([
				x,
				y,
				up ? 27 : 103
			], [
				x,
				y,
				up ? 103 : 27
			]);
		}
		return pts;
	};
	const by = rowY(CELLS.s - 1) + 60;
	const leadIn = [
		[
			216,
			rowY(CELLS.s - 1),
			27
		],
		[
			224.5,
			rowY(CELLS.s - 1),
			50
		],
		[
			224.5,
			by - 20,
			70
		],
		[
			185,
			by - 30,
			72
		],
		[
			120,
			by,
			78
		],
		[
			185,
			by,
			72
		],
		[
			224.5,
			by,
			60
		],
		[
			224.5,
			-216,
			46
		],
		[
			45,
			-216,
			46
		],
		[
			45,
			-224,
			58
		],
		[
			45,
			-236,
			58
		]
	];
	const leadOut = [
		[
			-45,
			-236,
			58
		],
		[
			-45,
			-224,
			58
		],
		[
			-45,
			-216,
			46
		],
		[
			-224.5,
			-216,
			46
		],
		[
			-224.5,
			by,
			60
		],
		[
			-185,
			by,
			72
		],
		[
			-60,
			by,
			73
		],
		[
			60,
			by,
			72
		],
		[
			185,
			by + 30,
			72
		],
		[
			224.5,
			by + 30,
			88
		],
		[
			224.5,
			by + 20,
			105
		],
		[
			224.5,
			rowY(0),
			105
		],
		[
			224.5,
			rowY(0),
			40
		],
		[
			216,
			rowY(0),
			27
		]
	];
	const pathsD = [
		...lanes.map(snake),
		leadIn,
		leadOut
	];
	const pathsC = pathsD.map((p) => [...p].reverse());
	/** the streaks' colour: the rows' by their heat (cool blue to hot red), the straps' by the current */
	const tCol = (T) => {
		const k = clamp((T - 20) / 45);
		return [
			lerp(.25, 1, k),
			lerp(.55, .35, k),
			lerp(1, .1, k)
		];
	};
	const colour = (k, u) => k < lanes.length ? tCol(sim.s.T[clamp(Math.floor(u * CELLS.s), 0, CELLS.s - 1)]) : tCol(20 + 45 * clamp(Math.abs(sim.s.I) / 150));
	const toM = (ps) => ps.map((p) => p.map((q) => L(...q)));
	const flowD = new Flow({ theme: "paper" }, {
		parent: drawer,
		paths: toM(pathsD),
		count: 520,
		length: .025,
		seed: 5,
		color: colour
	});
	const flowC = new Flow({ theme: "paper" }, {
		parent: drawer,
		paths: toM(pathsC),
		count: 520,
		length: .025,
		seed: 9,
		color: (k, u) => colour(k, 1 - u)
	});
	kit.onTick((dt, env) => {
		sim.step(dt, env);
		const s = sim.s;
		const out = ctl.drawer.value, press = clamp(out / 4) * (1 - clamp((out - 16) / 8));
		const catches = out > .5 ? 1 : press;
		drawer.position.z = out * S;
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			moving[`release-${side}`].position.z = L(0, Lh, 0)[2] - press * 4 * S;
			moving[`catch-${side}`].position.x = sx * PX * S + sx * catches * 5 * S;
			moving[`pawl-${side}`].rotation.y = -sx * (ctl.trigger.value / 38);
		}
		moving.trigger.position.y = 12.5 * S + ctl.trigger.value * S;
		const soc = sim.socPack(), lit = Math.round(soc * 10);
		const leds = moving.leds;
		for (let k = 0; k < 10; k++) {
			const on = k < lit, next = k === lit && s.I < -.5 && s.closed;
			const fault = !s.closed && (on || lit === 0);
			leds[k].emissive.setRGB(fault ? 1 : .12, fault ? .08 : .95, fault ? .05 : .4);
			leds[k].emissiveIntensity = fault ? s.blink < .5 ? 2.5 : .2 : on ? 2.2 : next ? 1.2 + 1 * Math.sin(s.blink * Math.PI * 2) : 0;
		}
		const show = Math.max(env.cut, env.xray) * (s.plugged ? 1 : .4);
		flowD.speed = .12 * Math.max(0, s.I) / 100;
		flowC.speed = .12 * Math.max(0, -s.I) / 100;
		flowD.opacity = s.I > .5 ? clamp(.3 + s.I / 100) * show : 0;
		flowC.opacity = s.I < -.5 ? clamp(.3 - s.I / 100) * show : 0;
		flowD.update(dt);
		flowC.update(dt);
		const hero = lab.read;
		const left = sim.left(), hot = sim.hottest();
		hero.value = s.P / 1e3;
		hero.bad = !s.closed || s.T[hot] > BMS.ot - 5 || Math.abs(s.I) > BMS.oc;
		hero.state = !s.plugged ? "unplugged: the drawer is out" : !s.closed ? `open: ${s.fault}${s.latched ? ", take the load off" : ""}` : env.broken ? `overloaded: ${fmt(s.I)} A, ${BMS.ocPeak} A for ${BMS.peakS} s at most` : s.I < -.5 ? s.balancing ? `charging, balancing ${s.balancing} rows` : soc > .999 ? "full" : "charging" : s.I > BMS.oc ? "over its continuous rating" : s.T[hot] > BMS.ot - 5 ? `row ${hot + 1} near its limit` : Math.abs(s.I) < .5 ? ctl.load.value < 0 && soc >= .995 ? "full, the charger off" : "resting" : "delivering";
		hero.sub = `${fmt(s.V, 1)} V · ${fmt(Math.abs(s.I))} A ${s.I < -.5 ? "in" : "out"} · ${fmt(soc * 100)} % · ${fmt(left.wh / 1e3, 2)} kWh left${s.P > 50 ? ` · ${runTime(left.wh / s.P)} at this load` : ""} · row ${hot + 1} ${fmt(s.T[hot])} °C · ${fmt(s.q)} W of heat`;
	});
	/** hours as "2 h 14 min" @param {number} h */
	const runTime = (h) => h >= 1 ? `${Math.floor(h)} h ${fmt(h % 1 * 60)} min` : `${fmt(h * 60)} min`;
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power delivered",
			unit: "kW",
			max: 5,
			digits: 2
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "Fourteen rows of twenty cells in series. Each row’s voltage is its cells’ open-circuit voltage at their state of charge less the current’s drop over their resistance, which rises in the cold (Arrhenius) and near empty; the pack’s is their sum less the BMS’s, the straps’ and the plug’s. The load asks for a power, and the current follows from the sagged voltage; charging is a 50 A charger tapered so no row passes 4.20 V, the balancer bleeding the high rows. Every current’s I²R heats its row; the rows share heat through the plates, give it down into the drawer and out through the shell to the room. The BMS opens the pack on any row under 2.80 V or over 4.25 V, over 60 °C, or over-current. State of charge and heat run 60 times faster than real (an hour a minute); the electrics, the BMS’s trips and the strip at real time.",
			eqs: [
				"V_row = OCV(SoC) − I · R_cell(T, SoC) / 20 − I · 2 R_c / 20      R_cell = 25 mΩ · e^(Ea/R (1/T − 1/298)) · (1 + 1.5 · (0.15 − SoC)⁺/0.15), Ea = 21 kJ/mol, R_c = 0.5 mΩ",
				"V = Σ V_row − I · (R_fet + R_shunt + R_fuse + R_straps + R_plug) = Σ V_row − I · 1.4 mΩ",
				"I = (V_oc − √(V_oc² − 4 P R)) / (2 R)      P the load; charging I ≥ −50 A and I ≥ −(4.20 − OCV) / R_row",
				"dSoC_row/dt = −I / (3,600 · Q_row)      Q_row = 100 Ah (row 7: × (1 − 0.4 aged)); balancing −0.1 A on a row over 4.10 V",
				"C_row dT/dt = I² R_row − G_rr (T − T_±1) − G_rd (T − T_drawer)      C_row = 1,480 J/K, G_rr = 6.5, G_rd = 3 W/K",
				"C_d dT_d/dt = Σ G_rd (T − T_d) + I² R_bms − G_ds (T_d − T_s);  C_s dT_s/dt = G_ds (T_d − T_s) − G_sa (T_s − T_room)      G_ds = 5, G_sa = 6.3 W/K",
				"BMS opens: V_row < 2.80 V · V_row > 4.25 V · T_row > 60 °C · |I| > 250 A, or > 100 A for 10 s"
			]
		},
		breakIt: {
			label: "Overload it",
			run: () => {},
			reset: () => sim.reset()
		},
		cut: {
			a: [
				1,
				0,
				0
			],
			b: [
				0,
				1,
				0
			],
			center: [
				.011,
				(CELLS.z0 + TOP) / 2 * S + LIFT * S,
				-.05
			],
			reach: .9
		}
	};
	if (v >= 11) lab.moves = MOVES;
	const asset = kit.seal({ lab });
	root.userData.mass = mass;
	asset.tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
//#piece 9c49aa51370d3c74fd7e9daa77beca41ebc91fafe2c8980c3d13d2daac4ce689
const HISTORY = /* @__PURE__ */ (() => ({ batterypack: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v1: a square case, five charge lights",
			make: () => batteryPack$1()
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "Smooth and modern: one matte black case with round corners (R 30 mm), a soft-edged lid, a light seam under it, a darker foot band, flush latches, and a slim LED strip along the top of its face that shows the state of charge in ten segments. Same 460 × 480 × 125 mm",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v2: its terminals still on its face",
			make: () => batteryPack$2(2)
		}]
	},
	{
		v: 3,
		date: "2026-10-13",
		note: "Plug in, pull out: power and data leave by one blind-mate plug in its back, between two guide pins (no terminals on its face), and a ClickLock clicks it into its rails; press the tab on its face and it slides out",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v3: two handles and a release tab",
			make: () => batteryPack$2(3)
		}]
	},
	{
		v: 4,
		date: "2026-10-13",
		note: "One grip for one hand, in the middle of its face, in place of the two handles: its trigger releases the ClickLock, so one squeeze and one pull take the pack out, and pushing it in clicks it home",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v4: the grip in the middle, pins on its back",
			make: () => batteryPack$2(4)
		}]
	},
	{
		v: 5,
		date: "2026-10-13",
		note: "The grip low on its face, near the case’s foot, its trigger at the very height of the ClickLock’s pawls, so the two release cables run straight to them; and its back plug as a flush socket of proper holes (two lined guide holes, two power and four data sockets) for the cube’s pins: nothing sticks out of its back",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v5: a lid on four latches",
			make: () => batteryPack$2(5)
		}]
	},
	{
		v: 6,
		date: "2026-10-13",
		note: "Serviceable from the front: a closed shell (no lid, no latches) and one L-shaped service drawer, its front plate the pack’s face and its base plate carrying every inner part (holders, cells, contact plates, a clamp in place of the lid’s pad, the BMS and an inner plug). Press the two push buttons in the shell’s sides, pull the grip, and the whole inside slides out; a “service” move plays it, and a “drawer out” pose holds it",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v6: release buttons in the shell’s sides",
			make: () => batteryPack$2(6)
		}]
	},
	{
		v: 7,
		date: "2026-10-13",
		note: "Everything from the front and low: the grip and the ClickLock down at the base plate’s level (bar 28 mm, lock 20 mm over the foot), and the drawer’s two release buttons on the face’s left and right ends at the same level, each pulling its spring catch in by a short rod; its back socket’s contacts sit in pockets that take the cube’s pin collars",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v7: grip and buttons on the drawer’s front plate",
			make: () => batteryPack$2(7)
		}]
	},
	{
		v: 8,
		date: "2026-10-13",
		note: "What you hold and press is the shell’s: a foot (floor tub and a 20 mm sill across the face) carries the grip, the ClickLock and the two release buttons at its outer ends, and the drawer’s catches; the drawer rides on the foot and carries only the insides, pulled by a finger slot under its face; the back socket’s holes in one line",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v8: release buttons in the sill’s outer ends",
			make: () => batteryPack$2(8)
		}]
	},
	{
		v: 9,
		date: "2026-10-13",
		note: "The release mechanism in the shell’s two front corner columns: each column stands up to the base plate’s top, a release button in its face at the base plate’s level and the drawer’s catch inside it, a spring bolt that shoots sideways into a notch in the base plate’s edge. The base plate runs between the columns and the cells’ holders pass over them (a taller column would stop the drawer coming out)",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v9: one rigged mesh in flat colours, its release buttons in the shell’s front corner columns",
			make: () => batteryPack$2(9)
		}]
	},
	{
		v: 10,
		date: "2026-10-15",
		note: "Built at AirSup’s realism, the v9 design and every measure kept: every part real solids in measured materials (the 280 cells each a steel can, a crimped positive cap with its vent, an insulator ring and a blue sleeve, merged by series row so each row reads its own voltage and heat; polyamide holders with their holes; nickel-plated copper contact plates and the clamp that presses them, no welds; the BMS board with its MOSFETs, shunt, fuse, balance leads to every row and inner plug; the anodised shell with its hollow foot and sill, the L-shaped service drawer, the grip, trigger, pawls, cables, springs, release buttons and spring-bolt catches; the back socket with its guide holes; a ten-segment charge strip); a solver runs it on real equations (open-circuit voltage against state of charge, resistance rising in the cold and near empty, the current’s I²R heat in cells, plates and pressed contacts, a lumped heat path out through the drawer and shell, the BMS’s cutoffs and balancing) on sliders for load, ambient, state of charge, an aged row, the drawer and the trigger, the power delivered read out; explode, cut away, x-ray with the current streaking along the plates, labels with live readings, slow, and its break: overloaded until the BMS opens",
		build: [{
			id: "batterypack",
			label: "BatteryPack",
			note: "as at v10: its solver and views, no moves of its own",
			make: () => castOf(batteryPack({ v: 10 }))
		}]
	},
	{
		v: 11,
		date: "2026-10-15",
		note: "Its moves back, apart from its views: Service (both buttons pressed, the whole inside pulled out between the columns and slid home till the catches click) and Grip (the trigger squeezed, both pawls swing in and click out again), beside the stage’s Run and Assemble; the sliders they set follow them"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "batterypack",
	label: "BatteryPack",
	note: "Our modular, repairable battery: 280 cylindrical 21700 cells (14S20P, 51.8 V, ~5.2 kWh) in two holder plates, copper contact plates pressed on by its lid, no welds and no glue, so every cell, plate and the BMS comes out again. Four fill a BatteryCube",
	from: "Our design",
	variants: [{
		id: "batterypack",
		label: "BatteryPack",
		note: "460 × 480 × 125 mm, 280 cells (14S20P, 51.8 V, 100 Ah, ~5.2 kWh), a charge strip on its face; its solver on the load, the ambient and its charge, every row read; its moves Service and Grip",
		make: () => castOf(batteryPack())
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
