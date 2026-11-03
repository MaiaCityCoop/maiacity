/*
 * THE LIFETRAC LINE — a fully automated factory that builds our LifeTrac (machines/lifetrac@1, Open Source Ecology's
 * LifeTrac v25 as the asset draws it) part by part, from raw steel, bar, hose and wire to a tested machine driving off
 * the end of the line. This file is the spec AirSup's factory runtime reads (.claude/skills/factory-skill/SKILL.md);
 * its stations' cycle times are not typed in here: each is the sum of the operations every part of the LifeTrac goes
 * through at that station (./lifetrac-bom.js, one entry per part of the asset's catalog, all 135 of them).
 *
 * Assumptions (2026-11-03):
 *   - Volume: 24 LifeTracs a day, one an hour: 6,000 a year on 250 days. A region's tractors.
 *   - Calendar: 3 shifts of 8 h, around the clock on weekdays: the line is run by robots, so it does not stop for the
 *     night (process.md: 3 shifts where the process runs round the clock). 86,400 production seconds a day, takt 3,600 s.
 *   - Fully automated: no operator at any station (`operators: 0`). Robots cut, weld, paint, bolt, plumb, wire, fill
 *     and test; autonomous forklifts feed the raw stock, AMRs carry kit carts, an AS/RS feeds the bought parts to the
 *     kitting robots. Nobody works on the floor (Samuel 2026-11-03: "no people, only robots and machines"); people
 *     maintain and supply the line from outside it.
 *   - Made here, from raw stock: every plate part (a 12 kW fibre laser), every tube and angle (a tube laser, an angle
 *     line), every pin and shaft (turn-mill cells, induction hardening), every weldment (hubs, pivots, bucket, deck,
 *     mast, the cube's frame), all four hydraulic cylinders (from honed tube and chrome bar), the valve manifold (from
 *     aluminium bar), every hose (from reels), the wiring harness (from spools); everything painted here.
 *   - Bought, as OSE buys them: the engine (one Briggs & Stratton 28 hp V-twin: the cube's crankcase, cylinders, blower,
 *     flywheel, air cleaner, muffler and starter come on it), the gear pump, the wheel motors, bearings, wheels and
 *     tyres, the valves and coils, the flow valve, the sensors, every board, the battery, tanks and filters, the
 *     fasteners. Each comes in through the AS/RS and is scanned at its kitting station.
 *   - A token is one LifeTrac's set at that stage: its cut plates on a kit cart, its four cylinders on a rack, its
 *     cube, the machine itself on its skillet. A part with no step at a station rides along in its set.
 *   - Breakdowns where the real machine has them (process.md): lasers and turn-mills 20 h / 30–45 min, robot cells
 *     8 h / 15 min, the powder line and ovens 100–200 h / 1–2 h, testers 50 h / 30 min. Yields only where a unit
 *     leaves the line: 1 % of cubes fail run-in (to the engine bay), 2 % of LifeTracs fail the end-of-line test (to the
 *     rework bay).
 *
 * The floor: a round hall, one belt drawn as a star, every station alongside it, four to a leg (`layout`, world.js
 * `legs`); the finished machines park in the middle.
 *
 * Route (the asset's own build steps, its STEPS):
 *   plates  laser → deburr ─┐
 *   tubes   tube laser ─────┼→ weld → pretreat → powder → cure → frame ─┐
 *   angles  angle line ─────┘                                            │
 *   wheels  shafts → wheel kit ─────────────────────────────────────→ wheels
 *   cube    cube laser → weld → paint → build → run-in ──────────────→ cube
 *   valves  manifold → valves → test ─┐
 *   hoses   hose cell → proof test ───┴──────────────────────────────→ plumb
 *   pins    pin turning → hardening ─────────────────────────────────→ arms
 *   cyls    saw → turn → weld → assemble → paint → test ─────────────→ cylinders → bucket and deck
 *   control harness → controller build → test ──────────────────────→ wire → fill → end-of-line test → drive-off
 */
import { contentOf, opsAt, RATE } from './lifetrac-bom.js';

/** the LifeTrac the line builds, by its slot of the Factories' pins (play's database: machines/lifetrac@1, lifetrac-v25) */
export const LIFETRAC_REF = 'pin:factories/lifetrac';

const H = 3600, MIN = 60;
/** breakdowns by kind of machine (process.md) */
const BREAKS = {
	laser: { mtbf: 20 * H, mttr: 45 * MIN },
	cnc: { mtbf: 20 * H, mttr: 30 * MIN },
	robot: { mtbf: 8 * H, mttr: 15 * MIN },
	line: { mtbf: 100 * H, mttr: 60 * MIN },
	oven: { mtbf: 200 * H, mttr: 2 * H },
	press: { mtbf: 10 * H, mttr: 20 * MIN },
	tester: { mtbf: 50 * H, mttr: 30 * MIN }
};

/** the note a station's inspector shows: how much it does for one LifeTrac, the biggest of it, and its machine's rate */
function noteOf(id, what, rate) {
	const ops = opsAt(id).filter((o) => o.s > 0).sort((a, b) => b.s - a.s);
	const total = contentOf(id);
	const parts = new Set(ops.filter((o) => o.part).map((o) => o.part)).size;
	const top = ops.slice(0, 3).map((o) => `${o.label} ${Math.round(o.s)} s`).join(', ');
	return `${what} ${parts} part${parts === 1 ? '' : 's'} of every LifeTrac pass here, ${ops.length} operations, ${Math.round(total).toLocaleString('en-US')} s in all (the most: ${top}).${rate ? ` ${rate}` : ''}`;
}

/**
 * One station: its cycle time the sum of its operations (./lifetrac-bom.js), its breakdowns by its kind of machine.
 * @param {string} id @param {string} name @param {string} machine @param {Record<string, any>} o
 */
function station(id, name, machine, o = {}) {
	const { kind, what = '', rate, ...rest } = o;
	// the tractor's own stations: a wide skillet belt, units queued a machine's length apart (maiaCITY's world.js)
	const big = machine === 'asmcell' && rest.variant !== 'cube' || machine === 'testcage' ? { beltW: 1.8, pitch: 3.0 } : { beltW: 1.8, pitch: 1.4 };
	// spare floor for one more machine only where the line's constraint sits or moves to (the weld cell, then the
	// laser, the cylinder lathes); everywhere else the cell is built to its size
	return { id, name, machine, ct: contentOf(id), cv: 0.05, buffer: 2, operators: 0, reserve: 0, ...big, ...(kind ? BREAKS[kind] : {}), note: noteOf(id, what, rate), ...rest };
}

/** the line as AirSup's runtime reads it (SKILL.md "Spec"), every station fully automated */
export const SPEC = {
	id: 'lifetrac-line',
	prompt: 'a fully automated factory that builds 24 LifeTracs a day, every part from raw stock',
	title: 'LifeTrac line',
	fig: 'maiaCITY · Factories',
	kicker: 'live discrete event simulation',
	sign: 'LIFETRAC',
	/** nobody drives the forklifts either (maiaCITY's world.js) */
	autonomous: true,
	signSub: '24 LIFETRACS / DAY',
	product: { name: 'LifeTrac', unit: 'LifeTracs', perToken: 1 },
	demand: { perDay: 24 },
	calendar: { shifts: 3, hoursPerShift: 8, startHour: 0 },
	sizing: { targetUtil: 0.85 },
	release: 'capacity',
	seed: 25,
	stations: [
		// the plates: one laser cuts every plate part of a LifeTrac in one nest
		station('laser', 'Plate fibre laser', 'fiberlaser', { reserve: 1, input: 'sheets', stage: 'cutkit', kind: 'laser', cv: 0.03, buffer: 3, what: 'Every plate part: side panels, floor, walls, motor plates, arm plates, hub plates and gussets, bucket, deck, brackets.', rate: RATE.laser.note + '. ' + RATE.sheet.note + '.' }),
		station('deburr', 'Deburr and sort', 'rollers', { stage: 'cutkit', kind: 'press', cv: 0.04, buffer: 3, what: 'Every cut plate:', rate: RATE.deburr.note + '.' }),
		// the tubes and the angles
		station('tube', 'Tube laser', 'tubelaser', { input: 'tubes', stage: 'tubekit', kind: 'laser', cv: 0.03, buffer: 3, what: 'Every tube part: cross tubes, cradle, arm tubes, cross beam, lugs, DOM pivot and hub tubes, the mast.', rate: RATE.tube.note + '.' }),
		station('angle', 'Angle line', 'angleline', { input: 'angles', stage: 'clips', kind: 'press', cv: 0.04, buffer: 3, what: 'Every angle: the floor runs, back-wall angles, clips, cross-beam and deck angles.', rate: RATE.angle.note + '.' }),
		// welded, then painted on one overhead line
		station('weld', 'Robot welding', 'weldcell', { reserve: 1, after: ['deburr', 'tube', 'angle'], stage: 'weldkit', kind: 'robot', cv: 0.06, buffer: 2, what: 'The weldments: the four hubs, the arm pivots, lift brackets, cross-beam lugs, the bucket, the deck frame and the mast.', rate: RATE.weld.note + '.' }),
		station('pretreat', 'Pretreatment washer', 'tunnel', { variant: 'washer', length: 8, stage: 'weldkit', kind: 'line', cv: 0.02, buffer: 2, what: 'Everything that is painted:', rate: LINE_NOTE() }),
		station('powder', 'Powder booth', 'booth', { stage: 'painted', kind: 'line', cv: 0.02, buffer: 1, what: 'Everything that is painted:', rate: LINE_NOTE() }),
		station('cure', 'Cure oven', 'tunnel', { length: 10, stage: 'painted', kind: 'oven', cv: 0.02, buffer: 2, what: 'Everything that is painted:', rate: LINE_NOTE() }),
		// the machine comes together on its skillet
		station('frame', 'Frame bolting', 'asmcell', { variant: 'bolt', stage: 'frame', kind: 'robot', cv: 0.05, buffer: 2, what: 'The frame’s plates, angles, tubes, cradle and its 324 bolts:', rate: RATE.bolt.note + '.' }),
		station('shafts', 'Shaft turning', 'cnc', { input: 'shaftbar', stage: 'shafts', kind: 'cnc', cv: 0.03, buffer: 3, what: 'The wheel shafts and couplings, from bar:', rate: 'Turn-mill with bar feeder and live tooling, robot unloading (typical cycles).' }),
		station('uwukit', 'Wheel-unit kitting', 'asrs', { stage: 'wheelkit', kind: 'robot', cv: 0.05, buffer: 2, what: 'The four wheel units’ parts:', rate: RATE.pick.note + '.' }),
		station('wheels', 'Wheel units on', 'asmcell', { after: ['frame', 'uwukit'], stage: 'wheeled', kind: 'robot', cv: 0.05, buffer: 2, what: 'Bearings, shafts, couplings, motors, hubs and wheels:', rate: RATE.bolt.note + '.' }),
		// the Power Cube, its own cell
		station('pccut', 'Cube laser', 'fiberlaser', { variant: 'combo', input: 'cubestock', stage: 'cubeparts', kind: 'laser', cv: 0.03, buffer: 3, what: 'The cube’s plates, skids and cage:', rate: RATE.combo.note + '.' }),
		station('pcweld', 'Cube frame welding', 'weldcell', { variant: 'small', stage: 'cubeframe', kind: 'robot', cv: 0.06, buffer: 2, what: 'The cube’s frame and coupling:', rate: RATE.weld.note + '.' }),
		station('pcpaint', 'Cube powder and cure', 'oven', { stage: 'cubeframe', kind: 'oven', cv: 0.03, buffer: 2, what: 'The cube’s frame:', rate: 'A batch powder booth with its own cure oven (typical 30 min a batch).' }),
		station('pcbuild', 'Power Cube build', 'asmcell', { variant: 'cube', stage: 'cube', kind: 'robot', cv: 0.06, buffer: 2, what: 'The engine, pump and everything on the cube:', rate: RATE.place.note + '. ' + RATE.pick.note + '.' }),
		station('pctest', 'Cube run-in test', 'tester', { stage: 'cube', kind: 'tester', cv: 0.04, buffer: 2, yield: 0.99, what: 'The built cube:', rate: '1 % fail and go to the engine bay off the line.' }),
		station('cube', 'Power Cube in', 'asmcell', { variant: 'gantry', after: ['wheels', 'pctest'], stage: 'cubed', kind: 'robot', cv: 0.05, buffer: 2, what: 'The cube:', rate: 'A 500 kg gantry lowers the 181 kg cube on its cradle.' }),
		// the valves and the hoses
		station('manifold', 'Manifold machining', 'cnc', { variant: 'mill', input: 'alubar', stage: 'manifold', kind: 'cnc', cv: 0.03, buffer: 3, what: 'The valve manifold, from aluminium bar:', rate: 'Horizontal machining centre with a pallet pool (typical).' }),
		station('valves', 'Valve assembly', 'robot', { stage: 'valveblock', kind: 'robot', cv: 0.05, buffer: 2, what: 'Valves, coils, flow valve and sensors on the manifold:', rate: RATE.place.note + '.' }),
		station('valvetest', 'Valve block test', 'tester', { stage: 'valveblock', kind: 'tester', cv: 0.04, buffer: 2, what: 'The valve block:', rate: 'Hydraulic test stand at 3,000 psi with flow meter (typical).' }),
		station('hose', 'Hose cut and crimp', 'robot', { variant: 'crimp', input: 'hosereel', stage: 'hoses', kind: 'robot', cv: 0.05, buffer: 3, what: 'All 20 hoses:', rate: RATE.hose.note + '.' }),
		station('hosetest', 'Hose proof test', 'tester', { stage: 'hoses', kind: 'tester', cv: 0.04, buffer: 2, what: 'All 20 hoses:', rate: 'Proof cabinet, 6 hoses a batch.' }),
		station('plumb', 'Hydraulics plumbed', 'asmcell', { after: ['cube', 'valvetest', 'hosetest'], stage: 'plumbed', kind: 'robot', cv: 0.08, buffer: 2, what: 'The valve block and every hose:', rate: 'Dual-arm robots with hose-routing grippers: the hardest step of the line to automate, so its cycle varies most (cv 0.08).' }),
		// the arms, their pins
		station('pins', 'Pin turning', 'cnc', { input: 'pinbar', stage: 'pins', kind: 'cnc', cv: 0.03, buffer: 3, what: 'Every pin, from 4140 bar:', rate: 'Turn-mill with bar feeder, robot unloading (typical cycles).' }),
		station('harden', 'Induction hardening', 'cell', { glow: '#ff8a3c', stage: 'pins', kind: 'oven', cv: 0.03, buffer: 3, what: 'Every pin:', rate: RATE.harden.note + '.' }),
		station('arms', 'Loader arms hung', 'asmcell', { variant: 'gantry', after: ['plumb', 'harden'], stage: 'armed', kind: 'robot', cv: 0.05, buffer: 2, what: 'Both arms built and hung, the cross beam:', rate: RATE.bolt.note + '.' }),
		// the cylinders, their own cell
		station('cylcut', 'Cylinder saw', 'saw', { input: 'cylstock', stage: 'cylblanks', kind: 'press', cv: 0.04, buffer: 3, what: 'Barrels, rods and blanks:', rate: 'CNC cold saw with infeed and outfeed: 15 to 35 s a cut (typical).' }),
		station('cylturn', 'Cylinder turning', 'cnc', { stage: 'cylparts', kind: 'cnc', cv: 0.03, buffer: 3, what: 'Caps, glands, pistons, rod ends and eyes:', rate: 'Turn-mill with a loading robot (typical cycles).' }),
		station('cylweld', 'Cylinder welding', 'robot', { variant: 'weld', stage: 'cylparts', kind: 'robot', cv: 0.05, buffer: 2, what: 'Caps, ports, clevises and rod eyes:', rate: RATE.weld.note.replace('both torches share a weldment, so arc time is halved', 'one torch here') + '.' }),
		station('cylasm', 'Cylinder assembly', 'robot', { stage: 'cylinders', kind: 'robot', cv: 0.05, buffer: 2, what: 'Seals, pistons, glands, rods into barrels:', rate: 'Seal-installation robot with expansion cones and a torque head (typical).' }),
		station('cylpaint', 'Cylinder paint', 'booth', { variant: 'small', stage: 'cylinders', kind: 'line', cv: 0.03, buffer: 2, what: 'The four barrels:', rate: 'Robot spray booth with IR flash cure.' }),
		station('cyltest', 'Cylinder test', 'tester', { stage: 'cylinders', kind: 'tester', cv: 0.04, buffer: 2, what: 'All four cylinders:', rate: 'Hydraulic test bench.' }),
		station('cyls', 'Cylinders pinned', 'asmcell', { after: ['arms', 'cyltest'], stage: 'cylindered', kind: 'robot', cv: 0.05, buffer: 2, what: 'The four cylinders and their hose ends:', rate: RATE.place.note + '.' }),
		station('bucket', 'Bucket and platform', 'asmcell', { variant: 'gantry', stage: 'bucketed', kind: 'robot', cv: 0.05, buffer: 2, what: 'The bucket, its pins and the folding platform:', rate: RATE.place.note + '.' }),
		// the controller
		station('harness', 'Harness making', 'winder', { input: 'wirespool', stage: 'harness', kind: 'press', cv: 0.04, buffer: 3, what: 'The valve and sensor harness:', rate: RATE.harness.note + '.' }),
		station('nodebox', 'Controller build', 'robot', { stage: 'controller', kind: 'robot', cv: 0.05, buffer: 2, what: 'The node box, its boards, the handheld and the mast’s kit:', rate: RATE.pick.note + '.' }),
		station('eltest', 'Controller test', 'tester', { stage: 'controller', kind: 'tester', cv: 0.04, buffer: 2, what: 'The controller and handheld:', rate: 'Functional test fixture with a shielded radio box (typical).' }),
		station('wire', 'Controller wired', 'asmcell', { after: ['bucket', 'eltest'], stage: 'wired', kind: 'robot', cv: 0.06, buffer: 2, what: 'The node box, harness, mast, antennas, cameras, beacon and E-stop:', rate: RATE.place.note + '.' }),
		// filled, started, tested, out
		station('fill', 'Oil, fuel and first start', 'asmcell', { variant: 'fill', stage: 'lifetrac', kind: 'robot', cv: 0.04, buffer: 2, what: 'The whole machine:', rate: 'Automatic fill rig with vacuum bleed.' }),
		station('eol', 'End-of-line test', 'testcage', { stage: 'lifetrac', kind: 'tester', cv: 0.04, buffer: 2, yield: 0.98, what: 'The whole machine:', rate: '2 % fail and go to the rework bay off the line.' }),
		station('ship', 'Audit and drive-off', 'asmcell', { variant: 'audit', stage: 'lifetrac', cv: 0.03, buffer: 3, what: 'The whole machine:', rate: 'Vision arch and the build record.' })
	],
	/** what each stage looks like: our own shapes at their real size (./lifetrac-kit.js), the finished machine our
	 *  LifeTrac by its slot (built in the asset box; `fallback` is our own model of it, drawn until the pin resolves) */
	stages: {
		sheets: { shape: 'sheets', color: '#7b8084' },
		cutkit: { shape: 'kitcart', color: '#7b8084', load: 'plates' },
		tubes: { shape: 'stillage', color: '#6d7377', load: 'tubes' },
		tubekit: { shape: 'stillage', color: '#6d7377', load: 'cut' },
		angles: { shape: 'stillage', color: '#6d7377', load: 'angles' },
		clips: { shape: 'tote', color: '#3e6ea6', load: 'clips' },
		weldkit: { shape: 'kitcart', color: '#6d7377', load: 'weldments' },
		painted: { shape: 'kitcart', color: '#1f5e50', load: 'painted' },
		shaftbar: { shape: 'stillage', color: '#9aa0a6', load: 'bars' },
		shafts: { shape: 'tote', color: '#3e6ea6', load: 'shafts' },
		wheelkit: { shape: 'wheelkit' },
		cubestock: { shape: 'stillage', color: '#6d7377', load: 'tubes' },
		cubeparts: { shape: 'kitcart', color: '#6d7377', load: 'plates' },
		cubeframe: { shape: 'cube', frame: true },
		cube: { shape: 'cube' },
		alubar: { shape: 'stillage', color: '#c4c9cc', load: 'bars' },
		manifold: { shape: 'manifold' },
		valveblock: { shape: 'manifold', valves: true },
		hosereel: { shape: 'reel' },
		hoses: { shape: 'hoses' },
		pinbar: { shape: 'stillage', color: '#9aa0a6', load: 'bars' },
		pins: { shape: 'tote', color: '#3e6ea6', load: 'pins' },
		cylstock: { shape: 'stillage', color: '#c9cbc6', load: 'bars' },
		cylblanks: { shape: 'stillage', color: '#c9cbc6', load: 'cut' },
		cylparts: { shape: 'tote', color: '#3e6ea6', load: 'shafts' },
		cylinders: { shape: 'cylrack' },
		wirespool: { shape: 'spools' },
		harness: { shape: 'tote', color: '#e2713a', load: 'harness' },
		controller: { shape: 'controller' },
		frame: { shape: 'lifetrac', upto: 'frame' },
		wheeled: { shape: 'lifetrac', upto: 'wheels' },
		cubed: { shape: 'lifetrac', upto: 'cube' },
		plumbed: { shape: 'lifetrac', upto: 'hydraulics' },
		armed: { shape: 'lifetrac', upto: 'arms' },
		cylindered: { shape: 'lifetrac', upto: 'cylinders' },
		bucketed: { shape: 'lifetrac', upto: 'platform' },
		wired: { shape: 'lifetrac', upto: 'electronics' },
		lifetrac: { shape: 'asset', ref: LIFETRAC_REF, face: 'z', fallback: { shape: 'lifetrac', upto: 'electronics' }, parked: true }
	},
	/** the floor (maiaCITY's star of legs, world.js; Samuel 2026-11-03, his third sketch: one belt drawn as a star, every
	 *  work station alongside it, four to a leg): all 42 stations on one belt, each cell's just before the station it
	 *  feeds, in eleven legs; the finished machines drive off into the middle */
	layout: { mode: 'legs', ring: ['pretreat', 'powder', 'cure', 'frame', 'wheels', 'cube', 'plumb', 'arms', 'cyls', 'bucket', 'wire', 'fill', 'eol', 'ship'], per: 4, gap: 4, half: 4.5, open: 8 },
	look: { tilt: { focusY: 0.5, band: 0.14, amount: 7 } }
};

/** the powder line's rate, for the notes of its three stations */
function LINE_NOTE() {
	return 'Power-and-free overhead conveyor at 2 m/min, parts hung 300 mm apart: a station’s time is the length of conveyor one LifeTrac’s parts take, at that speed; the cure oven holds 20 min at 200 °C.';
}
