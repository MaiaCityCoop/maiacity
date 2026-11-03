/*
 * THE FACTORIES — every production line play shows (/factories/): a whole factory as a live 3D miniature on a real
 * discrete event simulation (AirSup's factory skill, .claude/skills/factory-skill; its runtime as legacy ported it,
 * cloned into play from the branch SNAPSHOT_2611101's maia/content/factories on 2026-11-03: des.js the engine,
 * kit.js the machines, world.js the hall, look.js the lens, app.js the page, each with our additions marked
 * "maiaCITY"). A factory is its spec: the product, the demand, the calendar, the route with every cycle time and where
 * it comes from. The engine sizes the line from it and runs it. Each kind lists its versions (the versions helper of
 * every group), so a world can anchor to a line as it was.
 *
 * The first in play: the LifeTrac line, which builds our LifeTrac part by part from raw stock, fully automated
 * (./lifetrac-line.js, every part's operations in ./lifetrac-bom.js, its machines and shapes in ./lifetrac-kit.js).
 */
import { FIRST, versioned } from '$lib/site/app/versions.js';
import { LIFETRAC_REF, SPEC as LIFETRAC_LINE } from './lifetrac-line.js';
import { PARTS, totals } from './lifetrac-bom.js';

/** @typedef {typeof LIFETRAC_LINE} Spec a factory as AirSup's runtime reads it (SKILL.md "Spec"), with our additions */
/** @typedef {{ id: string, label: string, note: string, from: string, builds: string, build: () => Spec, parts?: typeof PARTS }} Kind a factory: what it builds (by its slot), its spec, and its bill of process */
/** @typedef {Kind & { versions: import('$lib/site/app/versions.js').Version<() => Spec>[], version: number }} Factory */

/** the kinds' versions, by id */
const HISTORY = {
	'lifetrac-line': [{ ...FIRST, date: '2026-11-03', note: 'First version: 24 LifeTracs a day on 3 × 8 h, fully automated, 42 stations on a main line and nine cells (tubes, angles, pins, wheel units, the Power Cube, valves, hoses, cylinders, the controller); every one of the 135 parts of machines/lifetrac@1 made from its raw stock or bought, its every operation timed' }]
};

const T = totals();

/** @type {Kind[]} */
const LIST = [
	{
		id: 'lifetrac-line',
		label: 'LifeTrac line',
		note: `A fully automated factory that builds our LifeTrac, part by part: ${T.made} of its ${T.parts} parts made here from plate, tube, angle, bar, hose and wire (cut, turned, welded, painted), ${T.bought} bought; 42 robot stations, 24 LifeTracs a day around the clock`,
		from: 'Our design, from OSE’s LifeTrac v25 bills of materials: 2026-11-03',
		builds: LIFETRAC_REF,
		build: () => LIFETRAC_LINE,
		parts: PARTS
	}
];

/** @type {Factory[]} */
export const FACTORIES = versioned(LIST, 'build', HISTORY);
