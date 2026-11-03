/*
 * THE LIFETRAC'S BILL OF PROCESS — how every part of our LifeTrac (machines/lifetrac@1, variant lifetrac-v25: the
 * catalog its card carries, 135 entries, 529 pieces) is made in the LifeTrac line (./lifetrac-line.js), from its raw
 * stock to its place on the machine. One entry per part of the asset's catalog, by the same id: what it is made from
 * (a plate, a tube, a bar, a reel of hose, a spool of wire) or who makes it when we buy it (an engine, a valve, a board),
 * how many and how heavy, and every operation it goes through: at which station, on which machine, and for how many
 * seconds for one LifeTrac's worth of it.
 *
 * Every station's cycle time in the line is the sum of these operations plus its own handling (`EXTRA`: sheet
 * changes, fixture indexing, kit carts), never a number typed in for the station: the numbers come from the part
 * (its cut length, its holes, its weld seams, its bolts) and the machine's rate (`RATE`, each with where it comes
 * from). Where a rate is an estimate it says "typical". Nothing here was tuned to make the line come out well.
 *
 * Sources of the part data: the LifeTrac's own card (OSE's LifeTrac v25 bill of materials, CAD parameters,
 * hydraulic and controller bills, as the asset cites them). Where the card gives no number (a hole count, a weld
 * length) the number here is read off the asset's geometry or is a typical one, and says so.
 */

/** steel's density, kg/m³ */
const STEEL = 7850;
const PI = Math.PI;
const r1 = (v) => Math.round(v * 10) / 10;

/* ── raw stock ──────────────────────────────────────────────────────────────── */

/** what the line buys by the tonne, the metre or the reel: everything made here is made from one of these */
export const STOCK = {
	pl6: { label: 'Plate 1/4" (6.35 mm) A36, 3,000 × 1,500 mm sheet', form: 'plate', t: 6.35 },
	pl10: { label: 'Plate 3/8" (9.5 mm) A36, 3,000 × 1,500 mm sheet', form: 'plate', t: 9.53 },
	pl12: { label: 'Plate 1/2" (12.7 mm) A36, 3,000 × 1,500 mm sheet', form: 'plate', t: 12.7 },
	pl19: { label: 'Plate 3/4" (19.05 mm) A36, 3,000 × 1,500 mm sheet', form: 'plate', t: 19.05 },
	hss62: { label: 'HSS 6×2×1/4 A500 rectangular tube, 6 m', form: 'tube', kgm: 19.0 },
	hss33: { label: 'HSS 3×3×1/4 A500 square tube, 6 m', form: 'tube', kgm: 13.9 },
	hss44: { label: 'HSS 4×4×1/4 A500 square tube, 6 m', form: 'tube', kgm: 19.0 },
	hss48: { label: 'HSS 4×8×1/4 A500 rectangular tube, 6 m', form: 'tube', kgm: 29.1 },
	dom2: { label: 'DOM tube 2" OD × 1/4" wall (50.8 × 6.35 mm), 6 m', form: 'tube', kgm: 6.96 },
	pipe2: { label: 'Pipe 2" schedule 40 (60.3 × 3.9 mm), 6 m', form: 'tube', kgm: 5.44 },
	l2: { label: 'Angle L2×2×1/4 A36 (50.8 × 50.8 × 6.35 mm), 6 m', form: 'angle', kgm: 4.75 },
	b4140_41: { label: '4140 bar Ø41.3 mm (1⅝"), pre-hardened, 3.6 m', form: 'bar', kgm: 10.5 },
	b4140_29: { label: '4140 bar Ø28.6 mm (1⅛"), pre-hardened, 3.6 m', form: 'bar', kgm: 5.04 },
	b4140_22: { label: '4140 bar Ø22.2 mm (⅞"), pre-hardened, 3.6 m', form: 'bar', kgm: 3.04 },
	tgp32: { label: '1045 turned, ground and polished shafting Ø31.75 mm (1¼"), 3.6 m', form: 'bar', kgm: 6.22 },
	b1045_57: { label: '1045 bar Ø57 mm (2¼"), 3.6 m', form: 'bar', kgm: 20.0 },
	b1045_95: { label: '1045 bar Ø95 mm (3¾"), 3 m', form: 'bar', kgm: 55.6 },
	honed64: { label: 'Honed tube 63.5 ID × 76.2 OD (ST52), 6 m', form: 'tube', kgm: 10.9 },
	honed76: { label: 'Honed tube 76.2 ID × 92.1 OD (ST52), 6 m', form: 'tube', kgm: 16.5 },
	chrome38: { label: 'Induction-hardened chrome bar Ø38.1 mm (1½"), 6 m', form: 'bar', kgm: 8.95 },
	al6061: { label: '6061-T6 aluminium bar 101.6 × 76.2 mm, 3.6 m', form: 'bar', kgm: 21.0 },
	din35: { label: 'DIN rail 35 mm, 2 m', form: 'rail', kgm: 0.3 },
	hose8: { label: 'Hose SAE 100R2 -8 (1/2"), 50 m reel', form: 'reel' },
	hose10: { label: 'Hose SAE 100R2 -10 (5/8"), 50 m reel', form: 'reel' },
	hose12: { label: 'Hose SAE 100R2 -12 (3/4"), 50 m reel', form: 'reel' },
	wire: { label: 'Automotive wire TXL 16 and 18 AWG, coax RG174, 500 m spools', form: 'spool' },
	powder: { label: 'Polyester powder coat, RAL 6005 green, teal, yellow, grey', form: 'powder' },
	enamel: { label: '2K polyurethane enamel, safety orange', form: 'paint' }
};

/** kg of steel plate of stock `k`, a `w` × `l` mm piece (holes and outline cut-outs ignored) */
const plateKg = (k, w, l) => (STOCK[k].t / 1000) * (w / 1000) * (l / 1000) * STEEL;

/* ── the machines' rates ────────────────────────────────────────────────────── */

/** how fast each machine works, with where the number comes from */
export const RATE = {
	// 12 kW fibre laser on mild steel, oxygen or air assist: cutting speed (mm/s) and pierce plus head move (s)
	laser: {
		6.35: [100, 0.5], 9.53: [70, 0.8], 12.7: [43, 1.2], 19.05: [25, 2.5],
		note: '12 kW fibre laser on mild steel (makers’ cutting tables, typical): 6 m/min at 1/4", 4.2 at 3/8", 2.6 at 1/2", 1.5 at 3/4"; pierce and head move 0.5 to 2.5 s'
	},
	/** the sheet the laser cuts, and how much of it a nest uses */
	sheet: { area: 4.5, use: 0.78, change: 60, note: '3,000 × 1,500 mm sheets, nests using 78 % (typical with common-line cutting), 60 s to swap the shuttle tables and start the next nest; the tower loads and sorts the other table while the laser cuts' },
	// 6 kW combo laser in the Power Cube cell: plate and tube on one machine, slower
	combo: { 6.35: [60, 0.6], 9.53: [40, 1.0], 12.7: [25, 1.5], tube: [45, 0.8], note: '6 kW combo fibre laser (plate bed and a rotary tube axis): 3.6 m/min at 1/4", 2.4 at 3/8", 1.5 at 1/2" (typical)' },
	// 4 kW tube laser with bundle loader on 1/4" wall
	tube: { speed: 58, pierce: 0.7, piece: 14, note: '4 kW tube laser on 1/4" wall: 3.5 m/min, 0.7 s a pierce; 14 s a piece to index the chuck and unload by robot (bundle loader in parallel)' },
	// CNC angle punching and shearing line
	angle: { feed: 3, hole: 1.4, shear: 2.5, mark: 1.5, stack: 4, note: 'CNC angle line (punch, mark, shear): 3 s feed, 1.4 s a hole, 1.5 s ink-jet part mark, 2.5 s shear, 4 s robot stacking (typical for L2×2 at 150 hits/min presses)' },
	// wide-belt deburring and edge rounding, both faces, with a loading robot
	deburr: { feed: 50, gap: 150, load: 8, width: 1100, note: 'Dual-head brush deburring and edge rounding, 1,100 mm wide, 3 m/min; a robot lays parts on the belt (8 s) and a second one stacks them at the exit' },
	// robotic GMAW
	weld: { travel: 7.5, seam: 5.2, place: 12, index: 10, note: '2 GMAW robots on a two-station positioner: 450 mm/min for a 6 mm fillet (typical at 280 A), 5.2 s a seam to approach, start, stop and clean the torch, 12 s for the handling robot to place a piece in the fixture, 10 s to index the positioner; both torches share a weldment, so arc time is halved' },
	// induction scan hardening of pins
	harden: { scan: 5, quench: 15, handle: 10, note: 'Induction scan hardening to 50–55 HRC on the bearing surface: 5 mm/s scan, 15 s spray quench, 10 s robot handling; tempered in the inline oven behind it' },
	// bolting robots
	bolt: { each: 9, robots: 2, note: 'Bolting by 2 robots with nutrunners and fed nuts and washers: 9 s a bolt to pick, feed, run down and torque to spec with the angle checked (typical for screwdriving robots with feeders); the two work at once' },
	place: { light: 15, heavy: 35, note: 'Robot placing a part: 15 s for a light one (gripper change, pick, locate, hold), 35 s for a heavy one by the gantry or a 500 kg robot' },
	pick: { each: 20, heavy: 35, note: 'AS/RS goods-to-robot kitting: the store brings the tote to the port while the robot works; 20 s a pick with scan and count, 35 s for a heavy one (wheels, motors, engine)' },
	hose: { cut: 8, crimp: 12, clean: 6, mark: 5, cap: 4, handle: 15, note: 'Hose cell: 8 s to measure and cut off the reel, 12 s a crimp end (robot loads the fitting and the die), 6 s projectile cleaning, 5 s laser marking, 4 s caps, 15 s handling' },
	harness: { wire: 4.5, term: 5, branch: 60, test: 90, note: 'Fully automatic cut-strip-crimp-seal (4.5 s a wire with both ends), a robot inserting terminals into the housings (5 s a terminal), 60 s to tape and tie a branch, 90 s continuity and hipot' }
};

/* ── what one operation costs ───────────────────────────────────────────────── */

/** seconds the 12 kW laser takes to cut one piece of `t` mm plate: its outline and its holes ([count, Ø]) */
function laserS(t, outline, holes = [], rate = RATE.laser) {
	const [v, p] = rate[t];
	const len = outline + holes.reduce((s, [n, d]) => s + n * PI * d, 0);
	const pierces = 1 + holes.reduce((s, [n]) => s + n, 0);
	return { s: len / v + pierces * p, len, pierces };
}
const rect = (w, l) => 2 * (w + l);
/** a laser op for `qty` pieces, its text saying what was cut */
function cut(st, k, qty, outline, holes, what, rate) {
	const t = STOCK[k].t;
	const { s, len, pierces } = laserS(t, outline, holes, rate);
	return { at: st, s: r1(s * qty), what: `${what}: ${Math.round(len).toLocaleString('en-US')} mm of cut and ${pierces} pierces in ${t} mm plate${qty > 1 ? `, ×${qty}` : ''}` };
}
/** a tube-laser op: pieces of a tube of perimeter `perim` (the end cut), with `holes` ([count, Ø], through one wall each) */
function tubeOp(qty, perim, holes, what) {
	const R = RATE.tube;
	const len = perim + holes.reduce((s, [n, d]) => s + n * PI * d, 0);
	const pierces = 1 + holes.reduce((s, [n]) => s + n, 0);
	const s = len / R.speed + pierces * R.pierce + R.piece;
	return { at: 'tube', s: r1(s * qty), what: `${what}: cut to length and ${pierces - 1} holes, ${Math.round(len)} mm of cut${qty > 1 ? `, ×${qty}` : ''}` };
}
/** a combo-laser op (the Power Cube cell's) on tube or angle */
function comboTube(qty, perim, holes, what) {
	const [v, p] = RATE.combo.tube;
	const len = perim + holes.reduce((s, [n, d]) => s + n * PI * d, 0);
	const pierces = 1 + holes.reduce((s, [n]) => s + n, 0);
	return { at: 'pccut', s: r1((len / v + pierces * p + 14) * qty), what: `${what}: cut to length and ${pierces - 1} holes on the rotary axis${qty > 1 ? `, ×${qty}` : ''}` };
}
/** an angle-line op: pieces with `holes` holes each */
function angleOp(qty, holes, what) {
	const R = RATE.angle;
	const s = R.feed + holes * R.hole + R.mark + R.shear + R.stack;
	return { at: 'angle', s: r1(s * qty), what: `${what}: fed, ${holes} holes punched, marked, sheared${qty > 1 ? `, ×${qty}` : ''}` };
}
/** a deburr op: pieces `l` long and `w` wide through the brush machine (several abreast when they fit) */
function deburrOp(qty, l, w, what = 'Deburred and edge-rounded') {
	const R = RATE.deburr;
	const across = Math.max(1, Math.min(4, Math.floor(R.width / (Math.min(l, w) + 50))));
	const long = Math.max(l, w) > R.width ? Math.max(l, w) : Math.min(l, w) < R.width ? Math.max(l, w) : l;
	const s = ((long + R.gap) / R.feed) / across + R.load;
	return { at: 'deburr', s: r1(s * qty), what: `${what} on both faces${across > 1 ? `, ${across} abreast` : ''}${qty > 1 ? `, ×${qty}` : ''}` };
}
/** a robot-welding op: `mm` of fillet in `seams` seams, `pieces` placed in the fixture, by `st`'s robots */
function weldOp(st, mm, seams, pieces, what, torches = 2) {
	const R = RATE.weld;
	const arc = mm / R.travel + seams * R.seam;
	const s = arc / torches + pieces * R.place + R.index;
	return { at: st, s: r1(s), what: `${what}: ${Math.round(mm).toLocaleString('en-US')} mm of weld in ${seams} seams, ${pieces} pieces fixtured` };
}
/** bolting robots: `n` bolts at station `st` */
function boltOp(st, n, what) {
	const R = RATE.bolt;
	return { at: st, s: r1((n * R.each) / R.robots), what: `${what}: ${n} bolts run down and torqued` };
}
/** a robot placing `n` parts (heavy ones by the gantry) */
const placeOp = (st, n, what, heavy = false) => ({ at: st, s: r1(n * (heavy ? RATE.place.heavy : RATE.place.light)), what: `${what}${n > 1 ? `, ×${n}` : ''}` });
/** AS/RS kitting: `n` picks (heavy ones by the big robot), each scanned at goods-in */
const pickOp = (st, n, what, heavy = false) => ({ at: st, s: r1(n * (heavy ? RATE.pick.heavy : RATE.pick.each)), what: `${what}: ${n} ${n > 1 ? 'picks' : 'pick'} from the AS/RS, serial scanned` });
/** an op of a fixed time (a machine's cycle, a test) */
const op = (at, s, what) => ({ at, s: r1(s), what });
/** the powder line: hung on the conveyor `hung` mm long (with its gap), painted and cured at the line's speed */
function paintOps(hung, colour) {
	const s = hung / LINE.speed;
	return [
		{ at: 'pretreat', s: r1(s), what: `Hung on the overhead conveyor (${Math.round(hung)} mm of it) by robot; degreased, zirconium-converted, rinsed and dried in the 5-stage washer` },
		{ at: 'powder', s: r1(s), what: `Powder-coated ${colour} by two robots with electrostatic guns, ~80 µm` },
		{ at: 'cure', s: r1(s), what: 'Cured 20 minutes at 200 °C metal temperature in the oven, cooled, unhung by robot' }
	];
}
/** the powder line: a power-and-free overhead conveyor at 2 m/min (33.3 mm/s); parts hung on edge, 300 mm apart */
export const LINE = { speed: 33.3, gap: 300, note: 'Power-and-free overhead conveyor at 2 m/min, parts hung 300 mm apart, the cure oven 40 m long (20 min at temperature)' };
const hang = (n, l) => n * (l + LINE.gap);

/** a side panel's outline as the asset draws it (lifetrac.js `panel`): its length and the drop of its top */
function panelPerim(len, drop) {
	const p = [
		[0, 150], [len, 150], [len, 480 - drop], [1300 * (len / 1392.6), 525 - drop], [330, 925 - drop], [292, 1040 - drop],
		[268, 1128 - drop * 0.4], [232, 1166 - drop * 0.4], [200, 1176 - drop * 0.4], [168, 1168 - drop * 0.4], [128, 1150 - drop], [0, 1150 - drop]
	];
	let s = 0;
	for (let i = 0; i < p.length; i++) {
		const [a, b] = p[i], [c, d] = p[(i + 1) % p.length];
		s += Math.hypot(c - a, d - b);
	}
	return s;
}

/* ── the parts ──────────────────────────────────────────────────────────────── */

/** the LifeTrac's assemblies as its card names them, in its build order (the asset's ASSEMBLIES) */
export const ASSEMBLIES = [
	['frame', 'Frame'],
	['uwu-fl', 'Wheel unit, front left'],
	['uwu-fr', 'Wheel unit, front right'],
	['uwu-rl', 'Wheel unit, rear left'],
	['uwu-rr', 'Wheel unit, rear right'],
	['powercube', 'Power Cube'],
	['hydraulics', 'Hydraulic circuit'],
	['arms', 'Loader arms'],
	['cylinders', 'Cylinders'],
	['bucket', 'Bucket'],
	['platform', 'Standing platform'],
	['electronics', 'Controller and radio']
];

/**
 * @typedef {{ at: string, s: number, what: string }} Op one operation: its station, its seconds for one LifeTrac, what is done
 * @typedef {{ stock?: keyof typeof STOCK, size?: string, kg?: number, bought?: string, also?: string[] }} Raw what a part is made from, or who it is bought from
 * @typedef {{ id: string, label: string, assembly: string, qty: number, raw: Raw, ops: Op[] }} Part
 */

/** @type {Part[]} */
export const PARTS = [];
/** @param {string} id @param {string} label @param {string} assembly @param {number} qty @param {Raw} raw @param {Op[]} ops */
const part = (id, label, assembly, qty, raw, ops) => PARTS.push({ id, label, assembly, qty, raw, ops: ops.filter(Boolean) });

/* 1. the frame — every part cut, deburred, painted green and bolted; nothing welded */
for (const [side, P] of /** @type {const} */ ([['left', 'P1'], ['right', 'P2']])) {
	const per = panelPerim(1392.6, 0);
	part(`outer-${side}`, `Outer side panel, ${side} (${P})`, 'frame', 1, { stock: 'pl12', size: '1,392.6 × 1,000 mm', kg: 82.8 }, [
		cut('laser', 'pl12', 1, per, [[18, 13.5], [2, 38], [1, 38.5], [1, 25.8], [2, 22]], 'Outline with the pivot boss, 24 holes (bearing bolts, shaft clearances, pivot and lift-cylinder pins, angle bolts)'),
		deburrOp(1, 1392.6, 1000),
		...paintOps(hang(1, 1392.6), 'RAL 6005 moss green'),
		placeOp('frame', 1, 'Set on its angle runs against the floor plate by the gantry', true)
	]);
}
for (const side of ['left', 'right']) {
	const per = panelPerim(1349.2, 32);
	part(`inner-${side}`, `Inner side panel, ${side} (P3)`, 'frame', 1, { stock: 'pl12', size: '1,349.2 × 968.2 mm', kg: 75.7 }, [
		cut('laser', 'pl12', 1, per, [[18, 13.5], [2, 38], [1, 38.5], [1, 25.8], [2, 22]], 'Outline and 24 holes'),
		deburrOp(1, 1349.2, 968.2),
		...paintOps(hang(1, 1349.2), 'RAL 6005 moss green'),
		placeOp('frame', 1, 'Set 120 mm inside the outer panel by the gantry, the slot for the arm between them', true)
	]);
}
part('floor', 'Bottom stiffener plate (P7)', 'frame', 1, { stock: 'pl6', size: '1,196.8 × 1,020 mm', kg: 60.6 }, [
	cut('laser', 'pl6', 1, rect(1196.8, 1020), [[80, 10.5]], 'Outline and 80 holes'),
	deburrOp(1, 1196.8, 1020),
	...paintOps(hang(1, 1196.8), 'RAL 6005 moss green'),
	placeOp('frame', 1, 'Laid on the frame fixture first: everything stands on it', true)
]);
part('floor-angles', 'Bottom angle runs (A6)', 'frame', 30, { stock: 'l2', size: '10 × 200, 10 × 300, 10 × 250 mm', kg: r1(10 * (0.2 + 0.3 + 0.25) * 4.75) }, [
	angleOp(10, 4, 'A6-1, 200 mm'), angleOp(10, 6, 'A6-2, 300 mm'), angleOp(10, 4, 'A6-3, 250 mm'),
	...paintOps(hang(5, 1200), 'grey RAL 7037 (30 pieces on 5 hooks)'),
	placeOp('frame', 30, 'Placed along the six panel lines and held')
]);
part('back-wall', 'Back stiffener plate (P4)', 'frame', 1, { stock: 'pl6', size: '1,020 × 650 mm', kg: 33.0 }, [
	cut('laser', 'pl6', 1, rect(1020, 650), [[28, 10.5], [1, 22.5], [1, 30]], 'Outline, 28 bolt holes, the E-stop’s Ø22.5 and the master key’s Ø30'),
	deburrOp(1, 1020, 650),
	...paintOps(hang(1, 1020), 'RAL 6005 moss green'),
	placeOp('frame', 1, 'Set between the sandwiches behind the pivots', true)
]);
part('back-angles', 'Back wall angles (A1, A2)', 'frame', 6, { stock: 'l2', size: '6 × 650 mm', kg: r1(6 * 0.65 * 4.75) }, [
	angleOp(6, 8, 'A1/A2, 650 mm'),
	...paintOps(hang(2, 1300), 'grey RAL 7037'),
	placeOp('frame', 6, 'Set on the back plate')
]);
part('front-wall', 'Front stiffener plates (P5, P6)', 'frame', 3, { stock: 'pl6', size: 'P5 481.6 × 260.4 mm, 2 × P6 269.2 × 127 mm; 8 × A10 angles 80 mm', kg: r1(6.2 + 2 * 1.7 + 8 * 0.08 * 4.75) }, [
	cut('laser', 'pl6', 1, rect(481.6, 260.4), [[8, 10.5]], 'P5'),
	cut('laser', 'pl6', 2, rect(269.2, 127), [[4, 10.5]], 'P6'),
	angleOp(8, 2, 'A10 clips, 80 mm'),
	deburrOp(1, 481.6, 260.4), deburrOp(2, 269.2, 127),
	...paintOps(hang(3, 480), 'RAL 6005 moss green'),
	placeOp('frame', 11, 'Plates and their clips placed')
]);
for (const side of ['left', 'right'])
	part(`motor-plate-${side}`, `Motor mounting plate, ${side} (P8)`, 'frame', 1, { stock: 'pl6', size: '1,196.8 × 254 mm', kg: 14.1 }, [
		cut('laser', 'pl6', 1, rect(1196.8, 254), [[2, 83], [16, 13.5]], 'Outline, the two motors’ Ø83 pilots and 16 bolt holes'),
		deburrOp(1, 1196.8, 254),
		...paintOps(hang(1, 1196.8), 'RAL 6005 moss green'),
		placeOp('frame', 1, 'Set 152.4 mm inboard of the inner panel')
	]);
part('cross-tubes', 'Front and rear cross tubes (T1, T2)', 'frame', 2, { stock: 'hss62', size: '2 × 1,070.8 mm; 26 × A4 tube-mount angles 80 mm', kg: r1(2 * 20.2 + 26 * 0.08 * 4.75) }, [
	tubeOp(2, rect(152.4, 50.8), [[26, 13.5]], 'T1, T2'),
	angleOp(26, 4, 'A4 tube-mount clips, 80 mm'),
	...paintOps(hang(2, 1070.8) + hang(4, 600), 'grey RAL 7037'),
	placeOp('frame', 2, 'Threaded through all six plates by the gantry', true),
	placeOp('frame', 26, 'Clips placed')
]);
part('cube-cradle', 'Power Cube cradle', 'frame', 2, { stock: 'hss44', size: '2 × 754 mm; 4 angle clips 100 mm; 4 × Ø5/8" pins', kg: r1(2 * 0.754 * 19.0 + 4 * 0.1 * 4.75) }, [
	tubeOp(2, rect(101.6, 101.6), [[8, 17]], 'Cradle tubes, 754 mm, with the cube’s pin holes'),
	angleOp(4, 4, 'Cradle clips, 100 mm'),
	...paintOps(hang(2, 754), 'grey RAL 7037'),
	placeOp('frame', 2, 'Bolted across between the inner panels', true)
]);
part('bolts', 'Grade-8 bolts, nuts and washers (F3–F8)', 'frame', 324, { bought: 'Bought: grade 8 hex bolts, nuts and hardened washers, zinc-yellow (154 × 1/2-13, 170 × 3/8-16), in bulk', kg: 41.5 }, [
	op('frame', 0, 'Fed to the nutrunners from bowl feeders, kept full by an AMR from the store (no time on the line)'),
	boltOp('frame', 324, 'The frame bolted: panels, angle runs, motor plates, walls, cross tubes, clips and the cradle')
]);

/* 2. the four wheel units — shafts and couplings turned here, hubs welded here, the rest bought */
const CORNERS = [['fl', 'front left'], ['fr', 'front right'], ['rl', 'rear left'], ['rr', 'rear right']];
for (const [c, label] of CORNERS) {
	const a = `uwu-${c}`;
	part(`${a}-motor`, `Wheel motor, ${label}`, a, 1, { bought: 'Bought: a 100 cc/rev orbital (gerotor) hydraulic motor, 1" shaft, 1/2" NPT ports (White RS, Char-Lynn H or Parker TG class), painted', kg: 13.6 }, [
		pickOp('uwukit', 1, 'Motor from the AS/RS, its nameplate read', true),
		placeOp('wheels', 1, 'Bolted to the motor plate through its pilot by the 500 kg robot', true),
		boltOp('wheels', 4, 'Motor flange')
	]);
	part(`${a}-shaft`, `Wheel shaft, ${label} (R6)`, a, 1, { stock: 'tgp32', size: 'Ø31.75 × 474 mm', kg: 2.93 }, [
		op('shafts', 210, 'From 1¼" TGP shafting on the bar feeder: cut off, faced, chamfered, two retaining-ring grooves, a 60 mm keyway milled with live tooling, the hub’s Ø13.5 cross hole drilled; 3.5 min (typical)'),
		pickOp('uwukit', 1, 'Into the corner’s kit'),
		placeOp('wheels', 1, 'Pushed through both bearings')
	]);
	part(`${a}-coupling`, `Shaft coupling, ${label}`, a, 1, { stock: 'b1045_57', size: 'Ø50.8 × 50.8 mm', kg: 0.8 }, [
		op('shafts', 240, 'From Ø57 bar: turned to Ø50.8, bored Ø25.4 one end and Ø31.75 the other, both keyways slotted, two set-screw holes drilled and tapped; 4 min (typical)'),
		pickOp('uwukit', 1, 'Into the corner’s kit'),
		placeOp('wheels', 1, 'Slid on the motor’s shaft and the wheel shaft, set screws torqued')
	]);
	part(`${a}-bearings`, `Flange bearings, ${label}`, a, 2, { bought: 'Bought: 4-bolt flange bearing units, 1¼" bore, cast-iron housing (UCF207-20 class)', kg: 2 * 1.9 }, [
		pickOp('uwukit', 2, 'Bearings'),
		placeOp('wheels', 2, 'One on each panel of the sandwich'),
		boltOp('wheels', 8, 'Bearing flanges')
	]);
	part(`${a}-hub`, `Wheel hub, ${label} (P17, T7, P18)`, a, 1, { stock: 'pl12', size: 'P17 Ø228.6 × 12.7 mm, T7 DOM 50.8 × 6.35 × 139.7 mm, 4 × P18 gussets 86.4 × 83.9 × 6.35 mm', kg: 4.1 + 0.97 + 4 * 0.18, also: ['dom2', 'pl6'] }, [
		cut('laser', 'pl12', 1, PI * 228.6, [[8, 17.5], [1, 51]], 'Hub plate P17, 8 stud holes and the tube’s bore'),
		cut('laser', 'pl6', 4, 86.4 + 83.9 + Math.hypot(86.4, 83.9), [], 'Gussets P18'),
		tubeOp(1, PI * 50.8, [[2, 13.5]], 'DOM tube T7, 139.7 mm, cross-bolt hole through both walls'),
		deburrOp(1, 228.6, 228.6), deburrOp(4, 86.4, 83.9),
		weldOp('weld', 2 * PI * 50.8 + 4 * 4 * 85, 2 + 16, 6, 'Tube through the plate, welded both faces; four gussets welded both sides'),
		...paintOps(hang(1, 230), 'black'),
		placeOp('wheels', 1, 'Slid on the shaft, the 1/2" cross-bolt through'),
		boltOp('wheels', 1, 'Cross-bolt')
	]);
	part(`${a}-wheel`, `Wheel and tyre, ${label}`, a, 1, { bought: 'Bought: Bobcat skid-steer wheel P/N 7232567, a 12-16.5 tyre on a 16.5 × 10 rim, mounted and balanced by the tyre maker', kg: 50 }, [
		pickOp('uwukit', 1, 'Wheel and tyre', true),
		placeOp('wheels', 1, 'Hung on the hub’s eight studs by the 500 kg robot', true),
		boltOp('wheels', 8, 'Lug nuts, torqued in a star')
	]);
	part(`${a}-hoses`, `Motor hoses, ${label}`, a, 2, { stock: 'hose8', size: '2 × ~1.4 m SAE 100R2 -8, JIC 37° crimp fittings (bought)', kg: 2 * 1.4 * 0.66 }, [
		hoseOp(2, 'The motor’s two work lines'),
		hoseTestOp(2),
		placeOp('plumb', 2, 'Routed from the drive valve, clipped'),
		{ at: 'plumb', s: r1(4 * 20), what: 'JIC 37° ends started and torqued at both ends, ×4 ends' }
	]);
}

/* 3. the Power Cube — its own cell: the frame cut, welded and painted, then built up from the bought engine and pump */
part('pc-skids', 'Power Cube base skids (4×4 tube)', 'powercube', 2, { stock: 'hss44', size: '2 × 660 mm', kg: r1(2 * 0.66 * 19.0) }, [
	comboTube(2, rect(101.6, 101.6), [[6, 17]], 'Skids, 660 mm, with the lifting and stacking pin holes'),
	weldOp('pcweld', 2 * 4 * 101.6 * 2, 16, 2, 'Skids to the four corner posts, all round')
]);
part('pc-cage', 'Power Cube posts and top rails (2×2 angle)', 'powercube', 8, { stock: 'l2', size: '4 × 737, 2 × 686, 2 × 610 mm (29", 27", 24")', kg: r1((4 * 0.737 + 2 * 0.686 + 2 * 0.61) * 4.75) }, [
	comboTube(8, 2 * 50.8 * 2, [[2, 10.5]], 'Posts and rails, angle on the rotary axis'),
	weldOp('pcweld', 8 * 2 * 60, 16, 8, 'Rails to the posts at the eight top corners')
]);
part('pc-quick-attach', 'Power Cube quick-attach plate', 'powercube', 1, { stock: 'pl10', size: '2 × 3/8" × 4" × 27", 2 × 1/4" × 4" × 8", receiver 4×8×14½", strap 1/4" × 2" × 24"', kg: 2 * 5.2 + 2 * 1.0 + 10.7 + 2.4, also: ['pl6', 'hss48'] }, [
	cut('pccut', 'pl10', 2, rect(101.6, 685.8), [[4, 17]], 'The two 3/8" plates', RATE.combo),
	cut('pccut', 'pl6', 2, rect(101.6, 203.2), [[2, 17]], 'The two 1/4" plates', RATE.combo),
	cut('pccut', 'pl6', 1, rect(50.8, 609.6), [[2, 10.5]], 'The strap', RATE.combo),
	comboTube(1, rect(101.6, 203.2), [[2, 26]], 'Receiver tube, 368 mm, its lock-pin holes'),
	weldOp('pcweld', 2 * 685.8 + 4 * 2 * 101.6 + 2 * 368 * 2, 14, 6, 'Plates to the posts, the receiver between them')
]);
part('pc-lift-eyes', 'Power Cube lifting eyes', 'powercube', 2, { stock: 'pl10', size: '2 × 100 × 80 mm', kg: 2 * 0.6 }, [
	cut('pccut', 'pl10', 2, rect(100, 80), [[1, 32]], 'Eyes, a Ø32 hole each', RATE.combo),
	weldOp('pcweld', 2 * 2 * 100, 4, 2, 'Welded on the top rails, both sides')
]);
part('pc-engine-plate', 'Engine mount plate', 'powercube', 1, { stock: 'pl12', size: '203 × 394 mm', kg: 8.0 }, [
	cut('pccut', 'pl12', 1, rect(203, 394), [[8, 10.5]], 'Plate, the engine’s and the skids’ bolt holes', RATE.combo),
	op('pcpaint', 0, 'Painted with the frame (bolted, so it rides along on its hook)'),
	placeOp('pcbuild', 1, 'Bolted across the skids'),
	boltOp('pcbuild', 4, 'Plate to skids')
]);
for (const [id, label, what] of /** @type {const} */ ([
	['pc-crankcase', 'Engine crankcase', 'the crankcase, crankshaft, cam and governor'],
	['pc-cyl-left', 'Engine cylinder and head, left', 'the left cylinder and head'],
	['pc-cyl-right', 'Engine cylinder and head, right', 'the right cylinder and head'],
	['pc-blower', 'Blower housing', 'the blower housing'],
	['pc-flywheel', 'Flywheel and fan screen', 'the flywheel, its magnets and fan'],
	['pc-air-cleaner', 'Air cleaner', 'the air cleaner'],
	['pc-muffler', 'Muffler', 'the twin-inlet muffler'],
	['pc-starter', 'Electric starter', 'the 12 V starter']
])) {
	const first = id === 'pc-crankcase';
	part(id, label, 'powercube', 1, { bought: `Bought: ${what}, part of one Briggs & Stratton 28 hp V-twin, delivered whole and run-tested by its maker (die-cast aluminium crankcase, cast-iron sleeves, pressed-steel shrouds)`, kg: first ? 45 : 0 }, first ? [
		pickOp('pcbuild', 1, 'The engine, on its shipping pallet, from the AS/RS', true),
		placeOp('pcbuild', 1, 'Set on the engine plate by the gantry', true),
		boltOp('pcbuild', 4, 'Engine base')
	] : [op('pcbuild', 0, 'Comes on the engine (no time of its own)')]);
}
part('pc-coupling', 'Shaft coupling', 'powercube', 1, { bought: 'Bought: a keyed jaw-coupling half for the engine and an 11-tooth 3/4" splined half for the pump, joined here as OSE does', kg: 0.9 }, [
	weldOp('pcweld', 2 * PI * 50.8, 2, 2, 'The two halves butted in a V-block and welded into one sleeve, 2 passes', 1),
	placeOp('pcbuild', 1, 'Keyed and set-screwed on the crankshaft')
]);
part('pc-pump-mount', 'Pump mount', 'powercube', 1, { stock: 'pl6', size: '150 × 150 mm', kg: 1.1 }, [
	cut('pccut', 'pl6', 1, rect(150, 150), [[1, 83], [2, 10.5], [4, 10.5]], 'SAE A pilot and bolt holes', RATE.combo),
	placeOp('pcbuild', 1, 'Bolted to the engine plate square to the crank'),
	boltOp('pcbuild', 4, 'Pump mount')
]);
const BOUGHT_PC = [
	['pc-pump', 'Hydraulic gear pump', 'a fixed-displacement gear pump, 16 cm³/rev, SAE A flange, 3/4" 11-tooth spline', 4.5, 2],
	['pc-reservoir', 'Hydraulic reservoir (7 gal)', 'a 26.5 L welded steel reservoir with sight gauge and drain', 9, 4],
	['pc-strainer', 'Suction strainer and line', 'a 100-mesh suction strainer and 1" suction hose with clamps', 1.2, 0],
	['pc-relief', 'Relief valve', 'a direct-acting relief valve, set range to 3,000 psi', 1.4, 0],
	['pc-gauge', 'Pressure gauge', 'a liquid-filled 0–5,000 psi gauge', 0.4, 0],
	['pc-cooler', 'Oil cooler (six tubes)', 'a six-tube fan-cooled oil cooler', 4.2, 4],
	['pc-cooler-fan', 'Cooler fan', 'a 12 V axial fan', 1.1, 4],
	['pc-filter', 'Return filter', 'a spin-on return filter, 20 gpm, 10 µm, and its head', 1.5, 2],
	['pc-breather', 'Filler and breather cap', 'a filler-breather cap with its strainer', 0.2, 0],
	['pc-couplers', 'Quick couplers (pressure and return)', 'a pair of 3/4" ISO-A quick couplers', 1.2, 0],
	['pc-fuel-tank', 'Fuel tank (7 gal)', 'a 26.5 L moulded HDPE fuel tank with its cap and line', 2.8, 0],
	['pc-battery', '12 V battery', 'a 12 V 35 Ah AGM battery (lead, filled and charged by its maker)', 11, 2],
	['pc-panel', 'Control panel', 'the key switch, choke and throttle cables; the panel plate is cut here', 0.8, 2]
];
for (const [id, label, what, kg, bolts] of BOUGHT_PC) {
	const panel = id === 'pc-panel';
	part(id, label, 'powercube', id === 'pc-couplers' ? 2 : 1, panel ? { stock: 'pl6', size: '200 × 150 mm plate', kg: 1.5, bought: `Bought: ${what}` } : { bought: `Bought: ${what}`, kg }, [
		panel && cut('pccut', 'pl6', 1, rect(200, 150), [[1, 16], [1, 10], [2, 6.5], [4, 6.5]], 'Panel plate: key, choke, throttle and mount holes', RATE.combo),
		pickOp('pcbuild', id === 'pc-couplers' ? 2 : 1, label, kg > 8),
		placeOp('pcbuild', id === 'pc-couplers' ? 2 : 1, `${label} fitted${id === 'pc-strainer' ? ', the suction line clamped' : ''}`, kg > 8),
		bolts ? boltOp('pcbuild', bolts, label) : null
	]);
}

/* 4. the hydraulic circuit — the manifold machined here, the valves and coils bought, every hose crimped here */
part('pressure-line', 'Pressure line', 'hydraulics', 1, { stock: 'hose12', size: '~1.1 m SAE 100R2 -12, crimp fittings', kg: 1.6 }, [
	hoseOp(1, 'Cube coupler to the flow valve'),
	hoseTestOp(1),
	placeOp('plumb', 1, 'Routed up behind the cube'),
	{ at: 'plumb', s: 40, what: 'Both ends torqued, ×2 ends' }
]);
part('efc', 'Electronic flow control valve (EFC)', 'hydraulics', 1, { bought: 'Bought: a Brand EFC proportional flow-control valve, 10 gpm, 12 V coil', kg: 3.2 }, [
	pickOp('valves', 1, 'EFC'),
	placeOp('valves', 1, 'Plumbed to the manifold’s inlet with its adapter'),
	op('valvetest', 60, 'Its flow swept 0–100 % against the test stand’s flow meter')
]);
part('manifold', 'D03 valve manifold', 'hydraulics', 1, { stock: 'al6061', size: '101.6 × 76.2 × 400 mm block', kg: 8.4 }, [
	op('manifold', 1500, 'On a horizontal machining centre with a pallet pool: sawn block faced six sides, four D03 patterns (4 × M5 and P, T, A, B each), the P and T galleries gun-drilled through, 8 SAE-8 work ports and 2 SAE-12 ports form-tapped, deburred by a brush tool, washed; 25 min (typical for a 4-station D03 block)'),
	placeOp('valves', 1, 'Clamped in the valve robot’s fixture')
]);
for (const [st, a, b, what, ya, yb] of /** @type {const} */ ([['left', 'D1', 'D2', 'the left wheels', 'forward', 'back'], ['arms', 'D5', 'D6', 'the loader arms', 'up', 'down'], ['bucket', 'D7', 'D8', 'the bucket', 'curl', 'dump'], ['right', 'D3', 'D4', 'the right wheels', 'forward', 'back']])) {
	part(`valve-${st}`, `Directional valve, ${what} (${a}/${b})`, 'hydraulics', 1, { bought: 'Bought: Parker D1VW008CNKW, D03, 4-way 3-position tandem centre, 12 V DC', kg: 11 }, [
		pickOp('valves', 1, 'Valve', true),
		placeOp('valves', 1, 'Set on its D03 station, O-rings checked by vision'),
		{ at: 'valves', s: r1((4 * RATE.bolt.each) / 1), what: '4 × M5 screws torqued by the valve robot' },
		op('valvetest', 75, 'Spool shifted both ways, flow and leakage at 3,000 psi on the test stand')
	]);
	for (const [coil, way] of [[a, ya], [b, yb]])
		part(`coil-${coil.toLowerCase()}`, `Coil ${coil}: ${what}, ${way}`, 'hydraulics', 1, { bought: 'Bought: 12 V DC solenoid coil with a DIN 43650-A plug, comes with its valve', kg: 0.4 }, [
			placeOp('valves', 1, `Coil ${coil} pushed on its tube, nut torqued`),
			op('valvetest', 10, `Coil ${coil}: resistance and pull-in checked`)
		]);
}
part('transducers', 'Pressure transducers', 'hydraulics', 2, { bought: 'Bought: 0–250 bar pressure transducers, 0.5–4.5 V out, M12 plug', kg: 0.2 }, [
	pickOp('valves', 2, 'Transducers'),
	placeOp('valves', 2, 'Screwed into the P and work galleries'),
	op('valvetest', 30, 'Read against the test stand’s reference gauge')
]);
part('return-line', 'Return line', 'hydraulics', 1, { stock: 'hose10', size: '~1.3 m SAE 100R2 -10, crimp fittings', kg: 1.2 }, [
	hoseOp(1, 'Manifold T to the cube’s return coupler'),
	hoseTestOp(1),
	placeOp('plumb', 1, 'Routed over the cube'),
	{ at: 'plumb', s: 40, what: 'Both ends torqued, ×2 ends' }
]);
for (const side of ['left', 'right'])
	part(`lift-hoses-${side}`, `Lift cylinder hoses, ${side}`, 'hydraulics', 2, { stock: 'hose8', size: '2 × ~1.6 m SAE 100R2 -8', kg: 2 * 1.6 * 0.66 }, [
		hoseOp(2, 'The arms’ valve to the lift cylinder'),
		hoseTestOp(2),
		placeOp('plumb', 2, 'Routed from the manifold down the sandwich, clipped'),
		{ at: 'plumb', s: 40, what: 'Valve ends torqued, ×2 ends' },
		{ at: 'cyls', s: 40, what: 'Cylinder ends torqued, ×2 ends' }
	]);
part('bucket-hoses', 'Bucket cylinder hoses', 'hydraulics', 4, { stock: 'hose8', size: '4 × ~2.4 m SAE 100R2 -8', kg: 4 * 2.4 * 0.66 }, [
	hoseOp(4, 'The bucket valve over the pivots to the bucket cylinders'),
	hoseTestOp(4),
	placeOp('plumb', 4, 'Routed over the pivots with their loops, clipped along the arms'),
	{ at: 'plumb', s: 80, what: 'Valve ends torqued, ×4 ends' },
	{ at: 'cyls', s: 80, what: 'Cylinder ends torqued, ×4 ends' }
]);

/* 5. the loader arms — plates and tubes cut, the pivots welded, painted, bolted together and hung on their pins */
for (const side of ['left', 'right']) {
	part(`arm-plates-${side}`, `Arm side plates, ${side} (P9, P10)`, 'arms', 2, { stock: 'pl6', size: '2 × 1,792 × 350.1 mm L-shapes', kg: 13.2 + 13.6 }, [
		cut('laser', 'pl6', 2, 2 * (1422.6 + 503.1) + 2 * 160, [[1, 51], [11, 13.5], [1, 25.8]], 'L outline (legs 1,422.6 and 503.1 mm, ~160 mm wide), the pivot bore and 12 holes'),
		deburrOp(2, 1792, 350.1),
		...paintOps(hang(2, 1792), 'teal'),
		placeOp('arms', 2, 'Set either side of the arm tube in the arm fixture', true)
	]);
	part(`arm-tube-${side}`, `Arm main tube, ${side} (T4)`, 'arms', 1, { stock: 'hss62', size: '1,356.5 mm + 348 mm drop leg', kg: 24.5 }, [
		tubeOp(2, rect(152.4, 50.8) * 1.15, [[6, 13.5]], 'Main tube and drop leg, mitred at the bend, the bolt holes through'),
		...paintOps(hang(1, 1356.5) + hang(1, 348), 'teal'),
		placeOp('arms', 1, 'Laid between the side plates', true),
		boltOp('arms', 12, 'Side plates bolted through the tube')
	]);
	part(`arm-pivot-${side}`, `Arm pivot, ${side} (R2, T6, P11, F1)`, 'arms', 1, { stock: 'b4140_41', size: 'R2 Ø38.1 × 226.4 mm 4140, T6 DOM 50.8 × 6.35 × 120 mm, 2 × P11 Ø152.4 × 1/4", 2 × F1 1½-6 nuts (bought)', kg: 2.0 + 0.84 + 2 * 0.9 + 2 * 0.45, also: ['dom2', 'pl6'] }, [
		cut('laser', 'pl6', 2, PI * 152.4, [[1, 51], [5, 13.5]], 'Pivot plates P11'),
		deburrOp(2, 152.4, 152.4),
		tubeOp(1, PI * 50.8, [], 'DOM tube T6, 120 mm'),
		op('pins', 280, 'Pin R2 from Ø41.3 bar: turned to Ø38.1 h8 over 226.4 mm, both ends threaded 1½-6 UNC, chamfered, a grease way drilled; 4.7 min (typical)'),
		op('harden', 226.4 / RATE.harden.scan + RATE.harden.quench + RATE.harden.handle, 'Pin R2 scan-hardened along its bearing length and tempered'),
		weldOp('weld', 2 * 2 * PI * 50.8, 4, 3, 'The DOM tube welded into both round plates, both faces'),
		...paintOps(hang(1, 160), 'teal'),
		boltOp('arms', 5, 'Pivot plates to the arm'),
		placeOp('arms', 1, 'Arm swung into the sandwich by the gantry, the pin pushed through, both nuts on', true),
		{ at: 'arms', s: 30, what: 'The two 1½-6 nuts torqued' }
	]);
	part(`lift-bracket-${side}`, `Lift cylinder bracket, ${side}`, 'arms', 1, { stock: 'pl6', size: '2 × ~160 × 120 mm gussets, 1" bolt (bought)', kg: 2 * 0.96 }, [
		cut('laser', 'pl6', 2, rect(160, 120), [[1, 25.8]], 'Bracket gussets'),
		deburrOp(2, 160, 120),
		weldOp('weld', 2 * 2 * 150, 4, 2, 'Welded under the inner arm plate, both sides'),
		op('arms', 0, 'Comes on its arm plate')
	]);
}
part('cross-beam', 'Arm cross beam (T3, A5)', 'arms', 1, { stock: 'hss62', size: 'T3 849.2 mm, 4 × A5 angles 100 mm', kg: 16.6 + 4 * 0.1 * 4.75 }, [
	tubeOp(1, rect(152.4, 50.8), [[8, 13.5]], 'Cross beam T3'),
	angleOp(4, 4, 'A5 angles, 100 mm'),
	...paintOps(hang(1, 849.2) + hang(1, 400), 'teal'),
	placeOp('arms', 1, 'Set between the arms by the gantry', true),
	boltOp('arms', 16, 'Through its four angles')
]);
part('cylinder-lugs', 'Bucket cylinder lugs (U1, R3)', 'arms', 2, { stock: 'hss33', size: '2 × U1 66.7 mm, 2 × R3 pins Ø19.05 × 106.2 mm 4140', kg: 2 * 0.93 + 2 * 0.24, also: ['b4140_22'] }, [
	tubeOp(2, rect(76.2, 76.2), [[2, 19.6]], 'Lugs U1, the pin hole through both walls'),
	op('pins', 2 * 85, 'Pins R3 from Ø22.2 bar: turned, chamfered, R-clip holes drilled; 85 s each (typical)'),
	op('harden', 2 * (106.2 / RATE.harden.scan + RATE.harden.quench + RATE.harden.handle), 'Pins R3 scan-hardened, ×2'),
	weldOp('weld', 2 * 4 * 76.2, 8, 2, 'Lugs welded all round under the cross beam'),
	placeOp('arms', 2, 'Pins set in the lugs, R-clips in')
]);

/* 6. the cylinders — their own cell: honed tube and chrome bar cut, caps and pistons turned, welded, assembled, painted, tested */
for (const side of ['left', 'right']) {
	part(`lift-barrel-${side}`, `Lift cylinder barrel, ${side}`, 'cylinders', 1, { stock: 'honed64', size: 'Barrel 770 mm; end cap, gland and base clevis from Ø95 bar; 2 SAE-8 port bosses; seals (bought)', kg: 8.4 + 2.6, also: ['b1045_95'] }, [
		op('cylcut', 25 + 2 * 35 + 3 * 8, 'Honed tube cut to 770 mm on the CNC cold saw; cap and gland blanks off Ø95 bar'),
		op('cylturn', 180 + 240, 'End cap turned with its weld prep (3 min); gland bored, its rod-seal, wiper and O-ring grooves cut, threaded outside (4 min)'),
		weldOp('cylweld', 3 * PI * 76.2 + 2 * PI * 25 + 2 * 80, 7, 3, 'Cap to barrel in 3 passes, two port bosses, the base clevis', 1),
		op('cylasm', 4 * 12 + 30 + 40, 'Gland seals in by the robot’s expansion cones; rod into the barrel, the gland threaded and torqued'),
		op('cylpaint', 90, 'Rod end masked, barrel sprayed safety orange by robot, IR-cured'),
		op('cyltest', 210, 'Filled and bled, 3 full strokes, proof at 4,500 psi held 30 s each end, drift checked, drained and capped'),
		placeOp('cyls', 1, 'Pinned to the frame inside the sandwich, the base pin R1 in', true)
	]);
	part(`lift-rod-${side}`, `Lift cylinder rod, ${side}`, 'cylinders', 1, { stock: 'chrome38', size: 'Rod Ø38.1 × 800 mm, piston from Ø95 bar, rod eye', kg: 7.2 + 1.2, also: ['b1045_95'] }, [
		op('cylcut', 15 + 35 + 2 * 8, 'Chrome bar cut to 800 mm; piston blank off Ø95 bar'),
		op('cylturn', 150 + 150 + 120, 'Rod end turned and threaded for the piston (2.5 min); piston’s seal and wear-ring grooves cut (2.5 min); rod eye bored (2 min)'),
		weldOp('cylweld', 3 * PI * 38.1, 3, 1, 'Rod eye to rod, 3 passes', 1),
		op('cylasm', 3 * 12 + 40 + 20, 'Piston seal and two wear rings on; piston on the rod, its nut torqued'),
		placeOp('cyls', 1, 'Rod eye pinned to the arm’s bracket, the 1" bolt torqued')
	]);
	part(`bucket-barrel-${side}`, `Bucket cylinder barrel, ${side}`, 'cylinders', 1, { stock: 'honed76', size: 'Barrel 628 mm; end cap, gland and base eye from Ø95 bar; 2 SAE-8 port bosses; seals (bought)', kg: 10.4 + 3.1, also: ['b1045_95'] }, [
		op('cylcut', 25 + 2 * 35 + 3 * 8, 'Honed tube cut to 628 mm; cap and gland blanks off Ø95 bar'),
		op('cylturn', 180 + 240, 'End cap and gland turned'),
		weldOp('cylweld', 3 * PI * 92.1 + 2 * PI * 25 + 2 * 80, 7, 3, 'Cap to barrel in 3 passes, two port bosses, the base eye', 1),
		op('cylasm', 4 * 12 + 30 + 40, 'Gland seals in; rod into the barrel, gland torqued'),
		op('cylpaint', 90, 'Rod end masked, barrel sprayed safety orange, IR-cured'),
		op('cyltest', 210, 'Filled and bled, 3 strokes, proof at 4,500 psi, drift checked, capped'),
		placeOp('cyls', 1, 'Base eye pinned to its lug under the cross beam', true)
	]);
	part(`bucket-rod-${side}`, `Bucket cylinder rod, ${side}`, 'cylinders', 1, { stock: 'chrome38', size: 'Rod Ø38.1 × 658 mm, piston from Ø95 bar, rod eye', kg: 5.9 + 1.5, also: ['b1045_95'] }, [
		op('cylcut', 15 + 35 + 2 * 8, 'Chrome bar cut to 658 mm; piston blank'),
		op('cylturn', 150 + 150 + 120, 'Rod end, piston and rod eye turned'),
		weldOp('cylweld', 3 * PI * 38.1, 3, 1, 'Rod eye to rod, 3 passes', 1),
		op('cylasm', 3 * 12 + 40 + 20, 'Piston seals on, the piston nut torqued'),
		op('bucket', 30, 'Rod eye pinned to the bucket’s lug once the bucket is on')
	]);
}

/* 7. the bucket — four plates and a cutting edge welded into a box, its lugs welded on, painted yellow */
part('bucket-shell', 'Bucket shell (P12, P13, P14)', 'bucket', 1, { stock: 'pl6', size: 'P12 1,112.7 × 450, P13 1,112.7 × 600, 2 × P14 600 × 450 mm', kg: 24.7 + 32.8 + 2 * 8.8 }, [
	cut('laser', 'pl6', 1, rect(1112.7, 450), [], 'Back P12'),
	cut('laser', 'pl6', 1, rect(1112.7, 600), [], 'Bottom P13'),
	cut('laser', 'pl6', 2, rect(600, 450), [], 'Sides P14'),
	deburrOp(1, 1112.7, 450), deburrOp(1, 1112.7, 600), deburrOp(2, 600, 450),
	weldOp('weld', 2 * 1112.7 + 2 * 2 * 450 + 2 * 2 * 600, 10, 4, 'Back to bottom and both sides to both, inside and out'),
	...paintOps(hang(1, 1112.7), 'yellow'),
	placeOp('bucket', 1, 'Carried to the arms’ tips by the gantry', true)
]);
part('cutting-edge', 'Cutting edge (P19)', 'bucket', 1, { stock: 'pl19', size: '1,100 × 80 mm', kg: 13.2 }, [
	cut('laser', 'pl19', 1, rect(1100, 80), [], 'Cutting edge, its bevel cut'),
	deburrOp(1, 1100, 80),
	weldOp('weld', 2 * 1100, 2, 1, 'Welded along the bottom’s lip, top and bottom')
]);
part('bucket-pivots', 'Bucket pivot lugs and pins (U2, R4)', 'bucket', 2, { stock: 'hss33', size: '2 × U2 66.7 mm, 2 × R4 pins Ø25.4 × 106.2 mm 4140', kg: 2 * 0.93 + 2 * 0.42, also: ['b4140_29'] }, [
	tubeOp(2, rect(76.2, 76.2), [[2, 25.8]], 'Lugs U2'),
	op('pins', 2 * 95, 'Pins R4 from Ø28.6 bar: turned, chamfered, cross-drilled for their retainers; 95 s each (typical)'),
	op('harden', 2 * (106.2 / RATE.harden.scan + RATE.harden.quench + RATE.harden.handle), 'Pins R4 scan-hardened, ×2'),
	weldOp('weld', 2 * 4 * 76.2, 8, 2, 'Lugs welded all round on the bucket’s back'),
	placeOp('bucket', 2, 'Pins pushed through the arms’ tips and the lugs, retainers in')
]);
part('bucket-cyl-lugs', 'Bucket cylinder lugs (U3)', 'bucket', 2, { stock: 'hss33', size: '2 × U3 66.7 mm', kg: 2 * 0.93 }, [
	tubeOp(2, rect(76.2, 76.2), [[2, 19.6]], 'Lugs U3'),
	weldOp('weld', 2 * 4 * 76.2, 8, 2, 'Lugs welded all round high on the bucket’s back'),
	op('bucket', 0, 'Come on the bucket')
]);

/* 8. the standing platform */
part('deck', 'Platform deck (P15)', 'platform', 1, { stock: 'pl6', size: '735.5 × 400 mm', kg: 14.3 }, [
	cut('laser', 'pl6', 1, rect(735.5, 400), [[32, 15], [4, 10.5]], 'Deck with its 32 anti-slip holes'),
	deburrOp(1, 735.5, 400),
	...paintOps(hang(1, 735.5), 'grey RAL 7037'),
	placeOp('bucket', 1, 'Pinned between its brackets, folded up', true)
]);
part('deck-frame', 'Platform angles (A7, A8)', 'platform', 4, { stock: 'l2', size: '2 × A7 247.6, 2 × A8 729.2 mm', kg: r1((2 * 0.2476 + 2 * 0.7292) * 4.75) }, [
	angleOp(2, 3, 'A7, 247.6 mm'), angleOp(2, 4, 'A8, 729.2 mm'),
	weldOp('weld', (2 * 247.6 + 2 * 729.2) * 0.5, 12, 4, 'Stitch-welded under the deck (half their length)'),
	op('bucket', 0, 'Come on the deck')
]);
part('deck-brackets', 'Platform pivot brackets, pins and lock pins (P16, R5, F2)', 'platform', 1, { stock: 'pl6', size: '2 × P16 400 × 230 mm, 2 × R5 pins Ø25.4 × 55.4 mm 4140, 2 × F2 hitch pins (bought)', kg: 2 * 4.6 + 2 * 0.22 + 2 * 0.1, also: ['b4140_29'] }, [
	cut('laser', 'pl6', 2, rect(400, 230), [[1, 25.8], [1, 16.5], [4, 10.5]], 'Brackets P16'),
	deburrOp(2, 400, 230),
	op('pins', 2 * 70, 'Pins R5: turned, chamfered, cross-drilled; 70 s each (typical)'),
	op('harden', 2 * (55.4 / RATE.harden.scan + RATE.harden.quench + RATE.harden.handle), 'Pins R5 scan-hardened, ×2'),
	...paintOps(hang(2, 400), 'grey RAL 7037'),
	placeOp('bucket', 2, 'Brackets set inside the inner panels'),
	boltOp('bucket', 8, 'Brackets'),
	placeOp('bucket', 4, 'Pivot pins and hitch pins in')
]);

/* 9. the controller and radio — the harness and the mast made here, every board bought, built into the node box, tested */
const BOX = 'nodebox';
part('node-box', 'Tractor node enclosure', 'electronics', 1, { bought: 'Bought: an IP65 polycarbonate enclosure with a clear lid, ~250 × 200 × 100 mm, and its Deutsch DT bulkhead connectors', kg: 1.4 }, [
	pickOp(BOX, 1, 'Enclosure and connectors'),
	op(BOX, 6 * 12 + 6 * 15, 'Six gland holes step-drilled by the robot, six Deutsch DT bulkheads fitted'),
	placeOp('wire', 1, 'Bolted on the cube’s top in front of the valves'),
	boltOp('wire', 4, 'Node box')
]);
const BOARDS = [
	['portenta-x8', 'Portenta X8 on its Max Carrier', 'Arduino Portenta X8 (ABX00049) and Portenta Max Carrier (ABX00043)', 2, 240],
	['opta', 'Opta WiFi with D1608S and A0602', 'Arduino Opta WiFi PLC with its D1608S and A0602 expansions', 3, 120],
	['efc-driver', 'EFC driver (Burkert 8605)', 'Burkert 8605 Type 316532 proportional driver', 1, 0],
	['safety-relay', 'Safety relay and E-stop loop', 'Phoenix Contact PSR dual-channel safety relay', 1, 0],
	['fuses', 'Fuses and power path', 'the 20 A main and 8 × 5 A blade fuses with holders, the EMI filter, an 18650 cell and charger', 4, 0],
	['status-leds', 'Status lamps and buzzer', 'three panel lamps and a buzzer', 4, 0],
	['imu-gps', 'GPS and IMU boards', 'a u-blox NEO-M9N GPS board and a BNO086 IMU on an MCP2221A bridge', 2, 0]
];
for (const [id, label, what, n, flash] of BOARDS)
	part(id, label, 'electronics', 1, { bought: `Bought: ${what}`, kg: 0.1 * n }, [
		pickOp(BOX, n, label),
		placeOp(BOX, n, `${label}: snapped on the DIN rail or screwed in`),
		flash ? op(BOX, flash, `Firmware flashed and its version read back (${flash / 60} min)`) : null,
		op('eltest', id === 'portenta-x8' ? 180 : 60, id === 'portenta-x8' ? 'Boots, LoRa link to the golden handheld at 20 Hz, Modbus to the Opta, the 10 Hz watchdog drops every coil when stopped' : `${label}: checked on the test fixture`)
	]);
part('harness', 'Valve and sensor harness', 'electronics', 1, { stock: 'wire', size: '47 wires, 94 terminals, 10 branches; Deutsch DT and DIN 43650-A connectors (bought)', kg: 3.2 }, [
	{ at: 'harness', s: r1(47 * RATE.harness.wire + 2 * 30), what: '47 wires measured, cut, stripped, crimped and sealed on the automatic machine; 2 battery cables crimped on the heavy press' },
	{ at: 'harness', s: r1(94 * RATE.harness.term), what: '94 terminals pushed into their housings by the robot' },
	{ at: 'harness', s: r1(10 * RATE.harness.branch + RATE.harness.test), what: 'Ten branches taped and tied on the robot’s board; continuity and hipot tested' },
	placeOp(BOX, 1, 'Its box end plugged into the bulkheads'),
	placeOp('wire', 10, 'Branches routed to the 8 coils, the EFC, the transducers, the engine and the mast'),
	{ at: 'wire', s: 14 * 8, what: '14 plugs pushed on and latched, ×14' }
]);
part('master-switch', 'Master cut-off switch', 'electronics', 1, { bought: 'Bought: a 175 A battery master switch with its red key', kg: 0.3 }, [
	pickOp(BOX, 1, 'Master switch'),
	placeOp('wire', 1, 'Fitted through the back wall on the battery’s positive lead')
]);
part('mast', 'Antenna mast', 'electronics', 1, { stock: 'pipe2', size: '2" sch 40 pipe, 900 mm; top plate 150 × 150 × 1/4"', kg: 4.9 + 1.1, also: ['pl6'] }, [
	tubeOp(1, PI * 60.3, [[4, 10.5], [1, 25]], 'Mast tube, clamp holes and the cable exit'),
	cut('laser', 'pl6', 1, rect(150, 150), [[4, 6.5], [1, 16]], 'Mast top plate'),
	deburrOp(1, 150, 150),
	weldOp('weld', 2 * PI * 60.3, 2, 2, 'Top plate welded on, both sides'),
	...paintOps(hang(1, 900), 'grey RAL 7037'),
	placeOp('wire', 1, 'Clamped to the back wall'),
	boltOp('wire', 4, 'Mast clamps')
]);
for (const [id, label, what, n] of /** @type {const} */ ([
	['lora-antenna', 'LoRa antenna', 'a 915/868 MHz whip with its RG174 lead', 1],
	['gps-antenna', 'GPS antenna', 'an active GNSS patch antenna', 1],
	['cameras', 'Cameras', 'Kurokesu C1 PRO UVC cameras in their housings', 2],
	['beacon', 'Warning beacon and horn', 'an amber LED beacon base and a 12 V horn', 1],
	['beacon-light', 'Beacon lamp', 'the beacon’s amber lens and LED, on its base', 1],
	['estop', 'E-stop on the machine', 'a latching 22 mm mushroom E-stop with two NC contacts', 1]
]))
	part(id, label, 'electronics', n, { bought: `Bought: ${what}`, kg: 0.3 * n }, [
		pickOp(BOX, n, label),
		placeOp('wire', n, `${label} mounted${id === 'cameras' ? ', one forward, one back' : ''}${id === 'estop' ? ' in the back wall' : ''}`),
		op('eol', 0, 'Checked in the end-of-line test')
	]);
part('handheld', 'Handheld remote', 'electronics', 1, { bought: 'Bought: an IP54 120 × 80 × 40 mm box, an Arduino MKR WAN 1310, a 2,000 mAh LiPo, a 22 mm E-stop, 4 buttons and an OLED', kg: 0.45 }, [
	pickOp(BOX, 7, 'Handheld parts'),
	placeOp(BOX, 7, 'Built into its box by the small robot: board, battery, E-stop, buttons, screen'),
	op(BOX, 90, 'Firmware flashed, paired to this tractor’s node by its key'),
	op('eltest', 120, 'Every button, both sticks and the E-stop read by the node; range test in the shielded box'),
	placeOp('wire', 1, 'Set in its holster on the back wall')
]);
for (const side of ['left', 'right'])
	part(`stick-${side}`, `Handheld joystick, ${side}`, 'electronics', 1, { bought: 'Bought: a 2-axis Hall-effect thumb joystick', kg: 0.05 }, [
		pickOp(BOX, 1, 'Joystick'),
		placeOp(BOX, 1, 'Fitted in the handheld’s lid'),
		op('eltest', 30, 'Both axes swept, the 10 % dead zone checked')
	]);

/* ── handling at each station that belongs to no one part ───────────────────── */

/** the plate area each LifeTrac takes from each thickness on the main laser (m²), from the parts' sizes */
const LASER_AREA = { 12.7: (1.3926 * 1.0 * 2 + 1.3492 * 0.9682 * 2 + 4 * 0.2286 * 0.2286), 6.35: (1.1968 * 1.02 + 1.02 * 0.65 + 0.4816 * 0.2604 + 2 * 0.2692 * 0.127 + 2 * 1.1968 * 0.254 + 4 * 1.792 * 0.36 * 0.55 + 8 * 0.1524 * 0.1524 + 4 * 0.16 * 0.12 + 1.1127 * 0.45 + 1.1127 * 0.6 + 2 * 0.6 * 0.45 + 0.7355 * 0.4 + 2 * 0.4 * 0.23 + 0.15 * 0.15 + 16 * 0.0864 * 0.0839 / 2), 19.05: 1.1 * 0.08 };

/**
 * What each station does besides the parts' own operations: the laser's sheet changes, the weld cell's fixture changes,
 * the kit carts and skillets moving in and out.
 * @type {Record<string, Op[]>}
 */
export const EXTRA = {
	laser: Object.entries(LASER_AREA).map(([t, a]) => {
		const sheets = a / (RATE.sheet.area * RATE.sheet.use);
		return { at: 'laser', s: r1(sheets * RATE.sheet.change), what: `${r1(sheets)} sheets of ${t} mm a LifeTrac (${r1(a)} m² of parts at ${RATE.sheet.use * 100} % nest use): table changes` };
	}),
	deburr: [op('deburr', 60, 'Kit cart in and out')],
	weld: [op('weld', 180, 'Fixture plates changed between the weldments of one set (hubs, pivots, bucket, deck, mast)')],
	frame: [op('frame', 120, 'Frame fixture indexed in, the finished frame lifted onto its skillet')],
	wheels: [op('wheels', 60, 'Skillet in and out, the frame jacked to wheel height')],
	cube: [op('cube', 120, 'The gantry fetches the cube from the cube cell’s outfeed and lowers it on the cradle'), op('cube', 4 * 15, 'Four Ø5/8" pins through skid and cradle, ×4')],
	plumb: [op('plumb', 60, 'Skillet in and out')],
	arms: [op('arms', 120, 'Arm fixture in, the two arms built side by side')],
	cyls: [op('cyls', 60, 'Skillet in and out')],
	bucket: [op('bucket', 60, 'Skillet in and out')],
	wire: [op('wire', 60, 'Skillet in and out')],
	fill: [
		op('fill', 300, 'Hydraulic oil topped up (the cube’s 26.5 L plus ~9 L for hoses and cylinders) and the circuit bled by cycling every function at low flow from the line’s controller'),
		op('fill', 120, '26.5 L of petrol, engine oil checked'),
		op('fill', 300, 'First start: idle, warm-up, governor at 3,600 rpm, no leak on the vision scan of every fitting')
	],
	eol: [op('eol', 1200, 'On the rolling road in the test cage: each side forward and back at full flow, a skid turn, arms full stroke with a 300 kg test load, curl and dump, relief read on both transducers, link lost → stopped in under 1 s, E-stop on the machine and on the handheld, beacon, horn, cameras streaming; 20 min')],
	ship: [op('ship', 300, 'Final vision audit (every part present, every label), the build record signed, the LifeTrac driven by radio onto the outbound lane')],
	tube: [],
	angle: [],
	pins: [op('pins', 60, 'Bar changes between the pin sizes')],
	harden: [],
	shafts: [op('shafts', 60, 'Bar change from shafting to coupling stock')],
	uwukit: [op('uwukit', 60, 'Kit carrier in and out')],
	pccut: [op('pccut', 180, 'Sheet and tube changes for one cube')],
	pcweld: [op('pcweld', 120, 'Cube fixture loaded and unloaded')],
	pcpaint: [op('pcpaint', 1800, 'The welded cube frame and its plates powder-coated (6 min by robot) and cured 20 min at 200 °C, cooled 4 min, in a batch booth-oven')],
	pcbuild: [op('pcbuild', 120, 'Frame onto the build fixture, the finished cube onto the test stand'), op('pcbuild', 300, 'Internal hoses (pump to relief to coupler, return through cooler and filter) fitted and torqued')],
	pctest: [op('pctest', 1200, 'Run-in on the test stand: oil and fuel in, started, 10 min warm-up, 15 gpm checked on the flow meter, relief set to 3,000 psi and sealed, leak scan; 20 min')],
	manifold: [],
	valves: [op('valves', 60, 'Fixture in and out')],
	valvetest: [op('valvetest', 120, 'The manifold clamped and coupled to the test stand, drained after')],
	hose: [],
	hosetest: [],
	cylcut: [],
	cylturn: [op('cylturn', 120, 'Jaw and program changes between caps, glands, pistons and rods')],
	cylweld: [],
	cylasm: [],
	cylpaint: [],
	cyltest: [],
	harness: [op('harness', 120, 'Wire spool changes between gauges')],
	nodebox: [op(BOX, 240, 'Internal jumpers between the boards (20 wires) and the lid closed')],
	eltest: [op('eltest', 240, 'The box on the fixture: power, Modbus, all 8 coil outputs into dummy coils, both analogue outputs, the E-stop loop opening the safety relay')]
};

/* ── hoses: cut and crimped in the hose cell, proof-tested in batches ───────── */
function hoseOp(n, what) {
	const R = RATE.hose;
	return { at: 'hose', s: r1(n * (R.cut + 2 * R.crimp + R.clean + R.mark + R.cap + R.handle)), what: `${what}: cut off the reel, both fittings crimped, cleaned, marked and capped${n > 1 ? `, ×${n}` : ''}` };
}
function hoseTestOp(n) {
	return { at: 'hosetest', s: r1((n / 6) * 150), what: `Proof-tested at 8,000 psi (twice working) for 30 s in a cabinet of 6, 150 s a batch${n > 1 ? `, ×${n}` : ''}` };
}

/* ── what the line reads ────────────────────────────────────────────────────── */

/** every operation at a station, the parts' and its own */
export function opsAt(st) {
	const out = [];
	for (const p of PARTS) for (const o of p.ops) if (o.at === st) out.push({ ...o, part: p.id, label: p.label });
	for (const o of EXTRA[st] ?? []) out.push({ ...o, part: null, label: 'Station handling' });
	return out;
}
/** a station's cycle time for one LifeTrac: the sum of what it does, s */
export const contentOf = (st) => r1(opsAt(st).reduce((s, o) => s + o.s, 0));
/** the stations any part names */
export const stationsNamed = () => [...new Set([...PARTS.flatMap((p) => p.ops.map((o) => o.at)), ...Object.keys(EXTRA)])];
/** what a part weighs in all (kg), and how many pieces the catalog counts */
export const totals = () => ({
	parts: PARTS.length,
	pieces: PARTS.reduce((s, p) => s + p.qty, 0),
	made: PARTS.filter((p) => p.raw.stock).length,
	bought: PARTS.filter((p) => !p.raw.stock).length,
	kg: r1(PARTS.reduce((s, p) => s + (p.raw.kg ?? 0), 0))
});
