// The piece "Battery pack (actors/batterypack.js)", version 1: below its requires, the text of the copy in BatteryCube v10 (src/lib/actors/batterypack.js), as it was.
const three = require("three");
const { CLICKLOCK, clickLatch, clickLockPieces } = require("03930b5000f46398dfc683098315a5275eefd4c3eb3503bfb41dc9bafba765e3");
const { block } = require("e36f6b303a2ad03dfff2d7567b39fc4e36b7bd0fd69514e97470adf12eec8467");
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Cast} Cast */
/** @typedef {[number, number, number]} MM a point of the pack: x across, y forward, z up (mm) */
const S$1 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$1 = {
	W: 460,
	L: 480,
	H: 125
};
/** the height (mm) its ClickLock's pawls sit at: low in the foot band until v4; from v5 at the grip's own height, so
*  the release cables run straight and the cube's rails follow them; from v8 in the shell's foot, with the grip */
const lockZ = (v = 8) => v >= 8 ? 10 : v >= 7 ? 20 : v >= 5 ? 30 : 10;
/** how far behind its face (mm) the ClickLock's pawl teeth sit: 40 until v5; from v6 22, so they come out through the
*  drawer's front plate and leave with it */
const lockBack = (v = 8) => v >= 6 ? 22 : 40;
/** the grip's bar height (mm) from v5: low on the face, its trigger at the lock's height */
const gripZ = (v) => v >= 8 ? 10 : v >= 7 ? 28 : 40;
/** how high (mm) the shell's foot (its floor tub and the sill across its face) stands from v8: the drawer rides on it */
const FOOT_8 = 20;
/** from v9 the shell's two front corner columns (mm): `w` across from its side, up to the base plate's top. The cells'
*  block fills 446 of the shell's 452 mm inside, so a column any taller would stop the drawer coming out: the base
*  plate runs between the two, and the cells' holders pass over them */
const POST_9 = {
	w: 46,
	top: 25
};
/** its cells: 14 rows in series (along y) of 20 in parallel (along x), 22 mm apart, standing; their zone's middle */
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
const CASE$3 = "#1f2225";
const LID$1 = "#232629";
const SEAM = "#d9dcde";
const FACE = "#2b2f33";
const HOLDER$1 = "#1b1d1f";
const WRAP$1 = "#2f6fb5";
const CAP$1 = "#c9ccce";
const COPPER$3 = "#c27a43";
const PCB$1 = "#2c7a4a";
const DARK$1 = "#202326";
const RED$1 = "#c8372d";
const BLACK$1 = "#161718";
const LED$3 = "#59f0a0";
const LED_OFF = "#2c3a33";
const STEEL$1 = "#8d9396";
const HOLE = "#050607";
const STEP_8 = {
	tray: 1,
	terminals: 1,
	handles: 1,
	"release-left": 1,
	"release-right": 1,
	"catch-left": 1,
	"catch-right": 1,
	"lock-pawls": 1,
	"lock-springs": 1,
	"lock-pivots": 1,
	"lock-cables": 1,
	"lock-trigger": 1,
	front: 2,
	base: 2,
	charge: 2,
	"plates-bottom": 3,
	"holder-bottom": 3,
	cells: 3,
	"holder-top": 4,
	"plates-top": 4,
	clamp: 4,
	bms: 5,
	"inner-plug": 5
};
const GROUP_8 = {
	tray: "shell",
	terminals: "shell",
	handles: "shell",
	"release-left": "shell",
	"release-right": "shell",
	"catch-left": "shell",
	"catch-right": "shell",
	front: "drawer",
	base: "drawer",
	charge: "drawer",
	clamp: "drawer",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	"inner-plug": "electronics"
};
const STEP_6 = {
	tray: 1,
	terminals: 1,
	"release-left": 1,
	"release-right": 1,
	front: 2,
	base: 2,
	charge: 2,
	handles: 2,
	"catch-left": 2,
	"catch-right": 2,
	"lock-pawls": 2,
	"lock-springs": 2,
	"lock-pivots": 2,
	"lock-cables": 2,
	"lock-trigger": 2,
	"plates-bottom": 3,
	"holder-bottom": 3,
	cells: 3,
	"holder-top": 4,
	"plates-top": 4,
	clamp: 4,
	bms: 5,
	"inner-plug": 5
};
const GROUP_6 = {
	tray: "shell",
	terminals: "shell",
	"release-left": "shell",
	"release-right": "shell",
	front: "drawer",
	base: "drawer",
	charge: "drawer",
	handles: "drawer",
	clamp: "drawer",
	"catch-left": "drawer",
	"catch-right": "drawer",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	"inner-plug": "electronics"
};
const STEP$1 = {
	tray: 1,
	front: 1,
	charge: 1,
	handles: 1,
	clicklock: 1,
	"lock-pawls": 1,
	"lock-springs": 1,
	"lock-pivots": 1,
	"lock-cables": 1,
	"lock-trigger": 1,
	"plates-bottom": 2,
	"holder-bottom": 2,
	cells: 2,
	"holder-top": 3,
	"plates-top": 3,
	bms: 4,
	terminals: 4,
	lid: 5,
	latches: 5
};
const GROUP$1 = {
	tray: "case",
	front: "case",
	charge: "case",
	handles: "case",
	clicklock: "case",
	"lock-pawls": "lock",
	"lock-springs": "lock",
	"lock-pivots": "lock",
	"lock-cables": "lock",
	"lock-trigger": "lock",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
	terminals: "electronics",
	lid: "lid",
	latches: "lid"
};
/**
* Add a BatteryPack's parts to a machine's kit, its foot's middle at `at` (actor metres), its front towards +z.
* `assembly` and `step` say where each part goes in the machine's catalog; with `unit`, the pack arrives whole.
* `seg`: the sides of a cell (fewer where many packs stand closed). `v`: the version to build (2: its plug still on the
* face, no ClickLock; 3: the back plug and the ClickLock; 4: one centre grip whose
* trigger releases the ClickLock; 5: that grip low on its face, the lock at its height so the cables run straight,
* and its back plug as holes for the cube's pins; 6: a closed shell and one L-shaped service drawer carrying every
* inner part, released by two push buttons in the shell's sides; 7: the grip, the lock and two release buttons on the
* face's left and right ends, all down at the base plate's level; 8: the grip, the lock and the release buttons all on
* the shell, in its foot's sill across the face, the drawer riding on the foot; the back socket's holes in one line;
* 9: the release buttons and catches in the shell's two front corner columns, at the base plate's level, the catches
* shooting sideways into the base plate's edges).
* @param {ReturnType<typeof machineKit>} kit
* @param {{ at: V3, base: string, assembly?: (g: string) => string, step?: (p: string) => number, prefix?: string, unit?: string, seg?: number, v?: number }} o
*/
function batteryPackParts$1(kit, { at, base, assembly = (g) => g, step, prefix = "", unit, seg = 10, v = 9 }) {
	const G = v >= 8 ? GROUP_8 : v >= 7 ? {
		...GROUP_6,
		"release-left": "drawer",
		"release-right": "drawer"
	} : v >= 6 ? GROUP_6 : GROUP$1;
	const GRIP_Z = gripZ(v);
	const stepOf = step ?? ((p) => (v >= 8 ? STEP_8 : v >= 6 ? STEP_6 : STEP$1)[p]);
	const DZ = v >= 8 ? 17 : 0;
	const m = new three.Matrix4().makeTranslation(...at);
	/** @param {number} x @param {number} y @param {number} z @returns {V3} */
	const L = (x, y, z) => [
		x * S$1,
		z * S$1,
		y * S$1
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S$1, h * S$1, l * S$1, L(x, y, z), r * S$1) : new three.BoxGeometry(w * S$1, h * S$1, l * S$1).translate(...L(x, y, z)));
	/** @param {MM} a @param {MM} b @param {number} r @param {number} [n] */
	const cyl = (a, b, r, n = 12) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
		const g = new three.CylinderGeometry(r * S$1, r * S$1, A.distanceTo(B), n);
		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
	/** a rounded slab (mm): a w × l outline with corners of radius r, from z0 up h high, hollow to `wall` if given,
	*  its top edge eased by `bevel`; the case's smooth shell, lid and bands */
	const slab = (w, l, r, z0, h, wall = 0, bevel = 0) => {
		const outline = (a, b, c, hole = false) => {
			const p = hole ? new three.Path() : new three.Shape();
			const x = a / 2, y = b / 2;
			p.moveTo(-x + c, -y);
			p.lineTo(x - c, -y);
			p.quadraticCurveTo(x, -y, x, -y + c);
			p.lineTo(x, y - c);
			p.quadraticCurveTo(x, y, x - c, y);
			p.lineTo(-x + c, y);
			p.quadraticCurveTo(-x, y, -x, y - c);
			p.lineTo(-x, -y + c);
			p.quadraticCurveTo(-x, -y, -x + c, -y);
			return p;
		};
		const shape = outline(w * S$1, l * S$1, r * S$1);
		if (wall) shape.holes.push(outline((w - 2 * wall) * S$1, (l - 2 * wall) * S$1, Math.max(1, r - wall) * S$1, true));
		const g = new three.ExtrudeGeometry(shape, {
			depth: (h - bevel) * S$1,
			curveSegments: 8,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel * S$1,
			bevelSize: bevel * S$1 * .8,
			bevelOffset: -bevel * S$1 * .8,
			bevelSegments: 3
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const RC = 30;
	const CHARGE = 7;
	const { W, L: LEN, H } = PACK$1;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$1.y + (i - (CELLS$1.s - 1) / 2) * CELLS$1.pitch;
	const colX = (j) => (j - (CELLS$1.p - 1) / 2) * CELLS$1.pitch;
	const zone = {
		w: CELLS$1.p * CELLS$1.pitch + 6,
		l: CELLS$1.s * CELLS$1.pitch + 6
	};
	const z0 = CELLS$1.z0 + DZ, top = z0 + CELLS$1.h;
	/** @param {string} p @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step' | 'id'>} info @param {(put: (geo: THREE.BufferGeometry, color: string) => void) => void} make */
	const part = (p, info, make) => kit.part({
		...info,
		id: `${prefix}${p}`,
		assembly: assembly(G[p]),
		step: stepOf(p),
		source: SRC$1,
		...unit ? { unit } : {}
	}, base, make);
	/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism */
	const prism = (draw, z0, h) => {
		const shape = new three.Shape();
		draw(shape);
		const g = new three.ExtrudeGeometry(shape, {
			depth: h * S$1,
			curveSegments: 8,
			bevelEnabled: false
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const at2 = (x, y) => [x * S$1, -y * S$1];
	const Y0 = PACK$1.L / 2 - 30;
	/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
	const shellU = (w) => (p) => {
		const x = PACK$1.W / 2, yb = -PACK$1.L / 2, r = 30;
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
	/** the drawer's front plate in plan: from Y0 to the face, its two front corners round */
	const capD = (p) => {
		const x = PACK$1.W / 2, yf = PACK$1.L / 2, r = 30;
		p.moveTo(...at2(-x, Y0));
		p.lineTo(...at2(x, Y0));
		p.quadraticCurveTo(...at2(x, yf), ...at2(x - r, yf));
		p.lineTo(...at2(-x + r, yf));
		p.quadraticCurveTo(...at2(-x, yf), ...at2(-x, Y0));
		p.closePath();
	};
	/** the case's bands, foot to top, as v2 drew them */
	const BANDS = [
		[
			0,
			16,
			FACE
		],
		[
			16,
			94,
			CASE$3
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
	];
	const REL = v >= 7 ? {
		y: Y0 - 18,
		z: 22,
		x: 182
	} : {
		y: 150,
		z: 64,
		x: 0
	};
	const PX = Wh - POST_9.w, CATCH_Y = Y0 - 14;
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
	if (v >= 8) {
		const F = FOOT_8;
		part("tray", {
			label: "Shell",
			what: "The pack’s outer shell: a foot (its floor tub and, across the face, a sill), walls, top and back in one smooth aluminium piece, open at the front above the sill where the service drawer slides in. It is what you carry and what the cube holds: the grip, the ClickLock and the two release buttons are all on it, in the sill.",
			specs: [
				["Outside", "460 × 480 × 125 mm"],
				["Foot and sill", `${F} mm high`],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"]
			]
		}, (put) => {
			for (const [z0, h, c] of [
				[
					0,
					F,
					FACE
				],
				[
					F,
					90,
					CASE$3
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
			put(prism(shellU(0), 0, 18), CASE$3);
			put(prism(shellU(0), H - 4, 4), LID$1);
			put(prism(capD, 0, F), FACE);
			if (v >= 9) {
				for (const sx of [-1, 1]) put(prism(postP(sx), 19, POST_9.top - F + 1), FACE);
				put(box(0, Lh + .6, F, 2 * PX - 2, 1.4, 1.2), HOLE);
				for (const sx of [-1, 1]) {
					put(box(sx * PX, Lh + .6, (F + POST_9.top) / 2, 1.4, 1.4, POST_9.top - F), HOLE);
					put(box(sx * (PX + 8), Lh + .6, POST_9.top, 16, 1.4, 1.2), HOLE);
				}
			} else put(box(0, Lh + .6, F, W - 8, 1.4, 1.2), HOLE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s face above the sill, its round front corners and bands flush with the shell. A long finger pull along its foot and the charge strip along its top; nothing you carry by. The base plate is fixed to its foot.",
			specs: [
				["Size", `460 × 30 × ${H - F} mm`],
				["Pull", "Finger slot, 240 mm"],
				["Material", "Aluminium, black anodised"]
			]
		}, (put) => {
			const Z = v >= 9 ? POST_9.top : F;
			for (const [z0, h, c] of [
				[
					Z,
					110 - Z,
					CASE$3
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
			if (v >= 9) put(box(0, (Y0 + Lh) / 2, (F + Z) / 2, 2 * PX - 1, Lh - Y0, Z - F), CASE$3);
			put(box(0, Lh + 1, 66, 380, 3, 68, 1), FACE);
			put(box(0, Lh + 1.2, 27, 240, 3, 8, 3), BLACK$1);
			put(box(0, Lh + 1.6, 25.5, 228, 2.4, 4, 1), HOLE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 1.2), Y0 + .8, (Z + H) / 2, 3, 1.6, H - Z - 1), HOLE);
			put(box(0, Y0 + .8, H - 1, W - 4, 1.6, 3), HOLE);
		});
		part("base", {
			label: "Base plate",
			what: "The floor of the service drawer’s L, riding on the shell’s foot: every inner part is mounted on it, the cells’ holders, the contact plates, the clamp and the BMS. It runs on two low-friction strips and slides out over the sill.",
			specs: [
				["Size", "444 × 446 × 5 mm"],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips"]
			]
		}, (put) => {
			const bw = v >= 9 ? 2 * (PX - 2) : W - 16;
			put(box(0, (Y0 - Lh + 4) / 2, 5.5 + DZ, bw, Y0 + Lh - 4, 5, 1), STEEL$1);
			for (const sx of [-1, 1]) put(box(sx * (v >= 9 ? bw / 2 - 40 : Wh - 40), (Y0 - Lh + 4) / 2, 3.5 + DZ, 14, Y0 + Lh - 10, 1, .3), "#e8e8e4");
			if (v >= 9) for (const sx of [-1, 1]) put(box(sx * (bw / 2 - 2.5), CATCH_Y, 5.5 + DZ, 5.4, 9, 5.2), HOLE);
		});
	} else if (v >= 6) {
		part("tray", {
			label: "Shell",
			what: "The pack’s outer shell: floor, walls, top and back in one smooth aluminium piece with round corners, open only at the front where the service drawer slides in. No lid and no latches any more: nothing opens but the drawer.",
			specs: [
				["Outside", "460 × 450 × 125 mm, the front plate makes 480"],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"]
			]
		}, (put) => {
			for (const [z0, h, c] of BANDS) put(prism(shellU(4), z0, h), c);
			put(prism(shellU(0), 0, 3), CASE$3);
			put(prism(shellU(0), H - 4, 4), LID$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s whole face, its round front corners and bands flush with the shell. It carries the grip, the charge strip and the ClickLock; the base plate is fixed to its foot.",
			specs: [["Size", "460 × 30 × 125 mm"], ["Material", "Aluminium, black anodised"]]
		}, (put) => {
			for (const [z0, h, c] of BANDS) put(prism(capD, z0, h), c);
			put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 1.2), Y0 + .8, H / 2, 3, 1.6, H - 1), HOLE);
			put(box(0, Y0 + .8, H - 1, W - 4, 1.6, 3), HOLE);
		});
		part("base", {
			label: "Base plate",
			what: "The floor of the service drawer’s L: every inner part is mounted on it, the cells’ holders, the contact plates, the clamp and the BMS. It runs on the shell’s floor on two low-friction strips.",
			specs: [
				["Size", "444 × 446 × 5 mm"],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips"]
			]
		}, (put) => {
			put(box(0, (Y0 - Lh + 4) / 2, 5.5, W - 16, Y0 + Lh - 4, 5, 1), STEEL$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 40), (Y0 - Lh + 4) / 2, 3.5, 14, Y0 + Lh - 10, 1, .3), "#e8e8e4");
		});
	} else part("tray", {
		label: "Case",
		what: "The pack’s case: one smooth aluminium shell with round corners, its floor and four walls, a darker foot band, and rails under it to slide on.",
		specs: [
			["Outside", "460 × 480 × 112 mm"],
			["Material", "Aluminium, 3 mm, black anodised"],
			["Corners", "R 30 mm"]
		]
	}, (put) => {
		put(slab(W, LEN, RC, 0, 5), CASE$3);
		put(slab(W, LEN, RC, 0, 16, 4), FACE);
		put(slab(W, LEN, RC, 16, 94, 4), CASE$3);
		put(slab(W, LEN, RC, 110, 2, 3), SEAM);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 60), 0, -1, 20, LEN - 80, 3), DARK$1);
	});
	if (v < 6) part("front", {
		label: "Front panel",
		what: "The pack’s face, set into the case’s front: it carries the handles, the charge strip along its top" + (v < 3 ? " and the terminals." : "; its power and data leave by the plug in its back."),
		specs: [["Size", "380 × 80 mm"]]
	}, (put) => {
		put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
	});
	part("charge", {
		label: "Charge strip",
		what: "A slim LED strip along the top of its face, under the lid’s seam: ten segments light up with the pack’s state of charge.",
		specs: [
			["Length", "380 mm, 10 segments"],
			["Shows", "State of charge, 10 % a segment"],
			["Fed by", "The BMS"]
		]
	}, (put) => {
		put(box(0, Lh + .5, 104, 386, 2, 7, 1), BLACK$1);
		for (let k = 0; k < 10; k++) put(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), k < CHARGE ? LED$3 : LED_OFF);
	});
	if (v >= 8) part("handles", {
		label: "Grip",
		what: "One grip for one hand on the shell itself, in the middle of the sill across its foot: carry the pack by it and the shell takes the weight, never the drawer. Its trigger sits at the very height of the ClickLock’s pawls in the foot, so the two release cables run straight to them: close your fingers round it and the pawls pull back, so the pack slides out in the same move; let go and it clicks home again.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${lockZ(v)} mm: the lock’s height`],
			["On", "The shell’s sill"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 15, 5), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 15, 6), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 3, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 5) part("handles", {
		label: "Grip",
		what: (v >= 7 ? "One grip for one hand, down at the base plate’s level in the middle of its face, between the two release buttons:" : "One grip for one hand, low on its face near the case’s foot:") + " its trigger sits at the very height of the ClickLock’s pawls, so the two release cables run straight to them. Close your fingers round it and the trigger pulls both pawls back, so the pack slides out in the same move; let go and it clicks home again.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Height", `Bar ${GRIP_Z} mm over the foot, trigger at ${lockZ(v)} mm: the lock’s height`],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 4, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 4) part("handles", {
		label: "Grip",
		what: "One grip in the middle of its face, for one hand: close your fingers round it and its trigger pulls the ClickLock’s pawls back, so the pack slides out in the same move; let go and it clicks home again. The pack hangs balanced under it.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, 62, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, 62, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, 66, 120, 1, 2, .4), "#d9dcde");
	});
	else part("handles", {
		label: "Handles",
		count: 2,
		what: "Two handles on its face to slide it in and out: at ~26 kg one person lifts it.",
		specs: [["Mass", "~26 kg [inferred]"]]
	}, (put) => {
		for (const sx of [-1, 1]) {
			for (const z of [38, 90]) put(cyl([
				sx * 175,
				Lh,
				z
			], [
				sx * 175,
				Lh + 28,
				z
			], 6, 10), DARK$1);
			put(cyl([
				sx * 175,
				Lh + 28,
				35
			], [
				sx * 175,
				Lh + 28,
				93
			], 7, 10), DARK$1);
		}
	});
	part("plates-bottom", {
		label: "Bottom contact plates",
		count: 8,
		what: "Copper plates under the cells, each joining a row’s minus poles to the next row’s, and the two end plates that go to the terminals.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Joined by", "Pressure, no welds"]]
	}, (put) => {
		put(box(0, rowY(0), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		for (let i = 1; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9 + DZ, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		put(box(0, rowY(CELLS$1.s - 1), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
	});
	part("holder-bottom", {
		label: "Bottom cell holder",
		what: "A plate of flame-retardant plastic with a socket for every cell’s foot: it keeps them 22 mm apart, air between them.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"], ["Pitch", "22 mm"]]
	}, (put) => put(box(0, CELLS$1.y, 13 + DZ, zone.w, zone.l, 6, 1), HOLDER$1));
	part("cells", {
		label: "21700 cells",
		count: CELLS$1.s * CELLS$1.p,
		what: "Cylindrical lithium-ion cells, 21 mm across and 70 mm high, 14 rows in series of 20 side by side. Each is held, not welded: a worn cell is pulled and a new one pushed in.",
		specs: [
			["Cell", "21700, 5 Ah, 3.7 V (NMC) [inferred]"],
			["Pack", "14S20P: 51.8 V, 100 Ah, ~5.2 kWh"],
			["Cells", "280"]
		]
	}, (put) => {
		for (let i = 0; i < CELLS$1.s; i++) for (let j = 0; j < CELLS$1.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$1.r, seg), WRAP$1);
			if (seg > 6) put(cyl([
				colX(j),
				rowY(i),
				top - 2
			], [
				colX(j),
				rowY(i),
				top
			], CELLS$1.r - 2, seg), CAP$1);
		}
	});
	part("holder-top", {
		label: "Top cell holder",
		what: "The same plate over the cells’ heads, its openings leaving each pole bare for the contact plates.",
		specs: [["Material", "PC/ABS, UL94 V-0 [inferred]"]]
	}, (put) => put(box(0, CELLS$1.y, top - 6, zone.w, zone.l, 6, 1), HOLDER$1));
	part("plates-top", {
		label: "Top contact plates",
		count: 7,
		what: "Copper plates over the cells, each joining a row’s plus poles to the next row’s minus: with the bottom plates they put the 14 rows in series.",
		specs: [["Material", "Nickel-plated copper, 1.5 mm"], ["Pressed by", "The lid’s spring pad"]]
	}, (put) => {
		for (let i = 0; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
	});
	part("bms", {
		label: "Battery management system",
		what: "The board behind the cells: a lead to each of the 14 rows, it balances them, keeps them within their voltage and temperature, and opens the pack if anything goes wrong.",
		specs: [
			["Rows", "14S, balanced"],
			["Current", "100 A continuous [inferred]"],
			["Talks", "CAN to the inverter"]
		]
	}, (put) => {
		const y = rowY(CELLS$1.s - 1) + 60;
		put(box(0, y, 50 + DZ, 400, 80, 3, .5), PCB$1);
		for (const x of [
			-140,
			-60,
			30,
			110
		]) put(box(x, y, 54 + DZ, 34, 26, 5, .5), BLACK$1);
		put(box(170, y, 62 + DZ, 50, 40, 22, 2), DARK$1);
		for (let i = 0; i < CELLS$1.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
			52 + DZ
		], [
			-180 + i * 6,
			rowY(i),
			top + 3
		], 1.2, 4), RED$1);
	});
	if (v < 3) part("terminals", {
		label: "Terminals",
		count: 2,
		what: "The pack’s plus and minus on its face, under their covers, and the data plug for the BMS beside them.",
		specs: [["Connectors", "Anderson-type, 120 A [inferred]"], ["Data", "CAN, RJ45"]]
	}, (put) => {
		put(cyl([
			90,
			Lh,
			55
		], [
			90,
			Lh + 16,
			55
		], 13, 16), RED$1);
		put(cyl([
			140,
			Lh,
			55
		], [
			140,
			Lh + 16,
			55
		], 13, 16), BLACK$1);
		put(box(-110, Lh + 3, 55, 26, 4, 20, 2), "#d9d9d9");
	});
	else if (v >= 7) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back, nothing sticking out. Its contacts sit at the bottom of pockets that take the cube’s insulating collars: the collars slide in first, then the pins meet their contacts, so no metal is ever open to a finger on either side. Two lined guide holes take the cube’s guide pins first: slide the pack in and it plugs itself into the backplane; pull it out and it lets go.",
		specs: [
			["Power", "2 pockets ⌀ 19 mm, sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets in one pocket"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"],
			["Touch", "Finger-safe, IP2X"]
		]
	}, (put) => {
		const yb = -Lh - 2;
		put(box(0, -Lh - 1, 58, 170, 2, 46, 1), BLACK$1);
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {string} ring */
		const hole = (x, z, r, ring) => {
			put(cyl([
				x,
				yb,
				z
			], [
				x,
				yb - .4,
				z
			], r + 2, 16), ring);
			put(cyl([
				x,
				yb - .4,
				z
			], [
				x,
				yb - .6,
				z
			], r, 16), HOLE);
		};
		for (const x of [-45, 45]) {
			hole(x, 58, 9.5, FACE);
			put(cyl([
				x,
				yb - .6,
				58
			], [
				x,
				yb - .8,
				58
			], 4.5, 12), x < 0 ? RED$1 : COPPER$3);
		}
		const dz = v >= 8 ? 58 : 72;
		put(box(0, yb - .2, dz, 50, .4, 16, 2), FACE);
		put(box(0, yb - .5, dz, 45, .4, 13, 2), HOLE);
		for (let k = 0; k < 4; k++) put(cyl([
			-12 + k * 8,
			yb - .7,
			dz
		], [
			-12 + k * 8,
			yb - .9,
			dz
		], 1.6, 8), CAP$1);
		for (const sx of [-1, 1]) {
			put(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), BLACK$1);
			hole(sx * 150, 58, 5.5, STEEL$1);
		}
	});
	else if (v >= 5) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back: proper holes, nothing sticking out. Two lined guide holes take the cube’s guide pins first, then its two power pins and four data pins slide into their sockets: slide the pack in and it plugs itself into the backplane; pull it out and it lets go. With nothing proud on its back, it stands on any shelf and no contact gets bent.",
		specs: [
			["Power", "2 sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"]
		]
	}, (put) => {
		const yb = -Lh - 2;
		put(box(0, -Lh - 1, 58, 170, 2, 46, 1), BLACK$1);
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {string} ring */
		const hole = (x, z, r, ring) => {
			put(cyl([
				x,
				yb,
				z
			], [
				x,
				yb - .4,
				z
			], r + 2, 16), ring);
			put(cyl([
				x,
				yb - .4,
				z
			], [
				x,
				yb - .6,
				z
			], r, 16), HOLE);
		};
		for (const x of [-45, 45]) hole(x, 58, 6, x < 0 ? RED$1 : COPPER$3);
		for (let k = 0; k < 4; k++) hole(-12 + k * 8, 72, 1.6, CAP$1);
		for (const sx of [-1, 1]) {
			put(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), BLACK$1);
			hole(sx * 150, 58, 5.5, STEEL$1);
		}
	});
	else part("terminals", {
		label: "Back plug",
		what: "The pack’s plus, minus and data in one blind-mate plug in its back, between two guide pins: slide the pack in and it plugs itself into the cube’s backplane; pull it out by its handles and it lets go. No cables, no bolts.",
		specs: [
			["Power", "2 × 120 A blade contacts [inferred]"],
			["Data", "CAN, 4 pins"],
			["Guides", "2 pins, ⌀ 10 mm"]
		]
	}, (put) => {
		put(box(0, -Lh - 3, 58, 170, 6, 46, 1), BLACK$1);
		for (const x of [-45, 45]) put(box(x, -Lh - 7, 58, 34, 3, 12), x < 0 ? RED$1 : COPPER$3);
		put(box(0, -Lh - 7, 58, 22, 3, 10), CAP$1);
		for (const sx of [-1, 1]) put(cyl([
			sx * 150,
			-Lh,
			58
		], [
			sx * 150,
			-Lh - 12,
			58
		], 5, 10), STEEL$1);
	});
	if (v === 3) part("clicklock", {
		...CLICKLOCK,
		what: `${CLICKLOCK.what} In a BatteryCube the pawls click in just as its back plug meets the backplane.`
	}, (put) => clickLatch(box, put, {
		half: Wh,
		face: Lh,
		z: 10,
		tabZ: 24
	}));
	if (v >= 5) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: lockZ(v),
		back: lockBack(v),
		grip: [
			0,
			Lh + 22,
			lockZ(v)
		],
		straight: true
	})) part(id, info, draw);
	else if (v >= 4) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: 10,
		grip: [
			0,
			Lh + 22,
			52
		]
	})) part(id, info, draw);
	if (v >= 6) {
		part("clamp", {
			label: "Clamp",
			what: "A stiff plate on four posts over the cells, its spring pad pressing every top contact plate onto its poles: the job the lid did, now on the drawer, so the cells stay pressed when it comes out.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Posts", "4, from the base plate"]]
		}, (put) => {
			put(box(0, CELLS$1.y, top + 8, zone.w - 10, zone.l - 10, 4, 2), STEEL$1);
			put(box(0, CELLS$1.y, top + 4, zone.w - 14, zone.l - 14, 4, 1), "#d8d1bf");
			for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(cyl([
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
				8 + DZ
			], [
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
				top + 10
			], 3, 8), STEEL$1);
		});
		part("inner-plug", {
			label: "Inner plug",
			what: "At the back of the drawer: the BMS’s plus, minus and data in one plug that slides onto the inside of the shell’s back socket as the drawer goes home.",
			specs: [["Power", "2 × 120 A [inferred]"], ["Data", "CAN"]]
		}, (put) => {
			put(box(0, -Lh + 14, 40 + DZ, 150, 12, 30, 1), BLACK$1);
		});
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			if (v >= 9) {
				const bx = sx * (PX + 8), bz = 18, cz = 5.5 + DZ;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the face of the shell’s corner column on its side, at the base plate’s level: part of the shell, so it stays put while the drawer comes out. Behind it a short plunger with a wedge runs back inside the column and pushes the catch’s bolt out of its notch in the base plate. Press both, pull the drawer by its finger pull, and the whole inside slides out between the columns.",
					specs: [
						["Button", "⌀ 10 mm, 4 mm travel"],
						["On", "The shell’s corner column"],
						["Force", "~10 N each [inferred]"]
					]
				}, (put) => {
					put(cyl([
						bx,
						Lh + .2,
						bz
					], [
						bx,
						Lh + 1,
						bz
					], 7, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.4,
						bz
					], 5, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						bx,
						CATCH_Y + 6,
						bz
					], 1.8, 6), STEEL$1);
					put(box(bx, CATCH_Y + 4, (bz + cz) / 2, 6, 6, cz - bz + 6, .5), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring bolt lying across inside the shell’s corner column, at the base plate’s height: its spring pushes its tip into a notch in the base plate’s edge and holds the drawer in. The button’s wedge pushes it back out; slide the drawer home and the bolt clicks in again on its own.",
					specs: [
						["Bolt", "Stainless, ⌀ 6 mm, 5 mm travel"],
						["Spring", "Compression, ~12 N [inferred]"],
						["In", "The shell’s corner column"]
					]
				}, (put) => {
					put(cyl([
						sx * (PX - 4.5),
						CATCH_Y,
						cz
					], [
						sx * (Wh - 8),
						CATCH_Y,
						cz
					], 2.5, 12), STEEL$1);
					put(cyl([
						sx * (PX + 9),
						CATCH_Y,
						cz
					], [
						sx * (PX + 11),
						CATCH_Y,
						cz
					], 3.5, 12), STEEL$1);
					for (let k = 0; k < 5; k++) put(cyl([
						sx * (PX + 13 + k * 4),
						CATCH_Y,
						cz
					], [
						sx * (PX + 14 + k * 4),
						CATCH_Y,
						cz
					], 3.4, 10), "#b8bdc0");
				});
				continue;
			}
			if (v >= 8) {
				const bx = sx * (Wh - 26), bz = FOOT_8 / 2;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the shell’s sill, at its outer end on the face: part of the shell, so it stays put while the drawer comes out. A short rod behind it pulls the drawer’s catch on that side down. Press both, pull the drawer by its finger pull, and the whole inside slides out over the sill.",
					specs: [
						["Button", "⌀ 13 mm, 4 mm travel"],
						["On", "The shell’s sill"],
						["Force", "~10 N each [inferred]"]
					]
				}, (put) => {
					put(cyl([
						bx,
						Lh + .2,
						bz
					], [
						bx,
						Lh + 1,
						bz
					], 8.5, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.6,
						bz
					], 6.2, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						sx * (Wh - 30),
						Y0 - 16,
						16
					], 1.6, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue in the shell’s foot, just behind the sill: its hook springs up into a notch under the drawer’s base plate and holds the drawer in. The button on its side pulls it down.",
					specs: [
						["Tongue", "Spring steel, 1 mm"],
						["Hook", "8 × 6 mm"],
						["On", "The shell’s foot"]
					]
				}, (put) => {
					put(box(sx * (Wh - 30), Y0 - 26, 17, 10, 24, 2, .4), STEEL$1);
					put(box(sx * (Wh - 30), Y0 - 16, 21.5, 8, 6, 7, .8), STEEL$1);
				});
				continue;
			}
			if (v >= 7) {
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button low on the face, at its left or right end, level with the base plate. A short rod behind it pulls the drawer’s spring catch on that side in, out of its hole in the shell. Press both, pull the grip, and the drawer slides out: everything from the front.",
					specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
				}, (put) => {
					put(cyl([
						sx * REL.x,
						Lh + .2,
						REL.z
					], [
						sx * REL.x,
						Lh + 1,
						REL.z
					], 11, 18), STEEL$1);
					put(cyl([
						sx * REL.x,
						Lh - 4,
						REL.z
					], [
						sx * REL.x,
						Lh + 3,
						REL.z
					], 8, 18), "#3a3f44");
					put(cyl([
						sx * REL.x,
						Lh - 6,
						REL.z
					], [
						sx * (Wh - 10),
						REL.y + 4,
						REL.z
					], 1.8, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue on the base plate, just inside the shell’s front: its knob springs out into a hole in the shell’s side and holds the drawer in. The front button on its side pulls it back.",
					specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 8 mm"]]
				}, (put) => {
					put(box(sx * (Wh - 9), REL.y, (8 + REL.z) / 2 + 1, 2, 14, REL.z - 6, .5), STEEL$1);
					put(cyl([
						sx * (Wh - 10),
						REL.y,
						REL.z
					], [
						sx * (Wh + .6),
						REL.y,
						REL.z
					], 4, 12), STEEL$1);
				});
				continue;
			}
			part(`release-${side}`, {
				label: `Release button, ${side}`,
				what: "A round push button flush in the shell’s side. Press both at once and they push the drawer’s two spring catches back inside, out of their holes; pull the grip and the drawer slides out. In a cube the buttons face the rails, so the drawer can only come out of a pack that is out.",
				specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
			}, (put) => {
				put(cyl([
					sx * (Wh + .2),
					REL.y,
					REL.z
				], [
					sx * (Wh + 1),
					REL.y,
					REL.z
				], 11, 18), STEEL$1);
				put(cyl([
					sx * (Wh - 4),
					REL.y,
					REL.z
				], [
					sx * (Wh + 2.5),
					REL.y,
					REL.z
				], 8, 18), "#3a3f44");
			});
			part(`catch-${side}`, {
				label: `Drawer catch, ${side}`,
				what: "A spring-steel tongue standing up from the base plate: its knob springs out into a hole in the shell’s side and holds the drawer in. Its release button pushes it back.",
				specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 10 mm"]]
			}, (put) => {
				put(box(sx * (Wh - 7), REL.y, (8 + REL.z) / 2 + 2, 2, 14, REL.z - 4, .5), STEEL$1);
				put(cyl([
					sx * (Wh - 8),
					REL.y,
					REL.z
				], [
					sx * (Wh - 4),
					REL.y,
					REL.z
				], 5, 12), STEEL$1);
			});
		}
	} else {
		part("lid", {
			label: "Lid",
			what: "The lid, its round corners and soft edge flush with the case, and the spring pad under it: closing it presses every contact plate onto its poles, the whole pack’s only joining force.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Corners", "R 30 mm"]]
		}, (put) => {
			put(slab(W, LEN, RC, H - 13, 13, 0, 5), LID$1);
			put(box(0, CELLS$1.y, H - 19, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
		});
		part("latches", {
			label: "Latches",
			count: 4,
			what: "Four flush over-centre latches, two a side: flip them and the lid lifts. No tool opens the pack.",
			specs: [["Type", "Over-centre, flush"]]
		}, (put) => {
			for (const sx of [-1, 1]) for (const y of [-120, 120]) put(box(sx * (Wh + 1.5), y, H - 16, 4, 36, 22, 1.5), FACE);
		});
	}
}

module.exports = { S$1, PACK$1, lockZ, lockBack, gripZ, FOOT_8, POST_9, CELLS$1, SRC$1, CASE$3, LID$1, SEAM, FACE, HOLDER$1, WRAP$1, CAP$1, COPPER$3, PCB$1, DARK$1, RED$1, BLACK$1, LED$3, LED_OFF, STEEL$1, HOLE, STEP_8, GROUP_8, STEP_6, GROUP_6, STEP$1, GROUP$1, batteryPackParts$1 };
