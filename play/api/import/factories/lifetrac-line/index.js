/*
 * The LifeTrac line's first version as a factory/1 document (play/api/src/factories.ts): the line (./line.js) with each
 * station's cycle time and note left to be worked out from the operations where it is drawn (play/site's
 * content/factories/index.js `lineOf`), and its bill of process (./bom.js). Pure: no database, so play/site's test of
 * the line reads it too.
 */
import { LIFETRAC_REF, SPEC } from './line.js';
import { ASSEMBLIES, EXTRA, PARTS, STOCK, totals } from './bom.js';

/** @returns {any} */
export function lifetracLine() {
	const T = totals();
	const doc = {
		schema: 'factory/1',
		label: 'LifeTrac line',
		note: `A fully automated factory that builds our LifeTrac, part by part: ${T.made} of its ${T.parts} parts made here from plate, tube, angle, bar, hose and wire (cut, turned, welded, painted), ${T.bought} bought; 42 robot stations, 24 LifeTracs a day around the clock`,
		from: 'Our design, from OSE’s LifeTrac v25 bills of materials: 2026-11-03',
		builds: LIFETRAC_REF,
		line: { ...SPEC, stations: SPEC.stations.map(({ ct, note, ...s }) => s) },
		stock: STOCK,
		assemblies: ASSEMBLIES.map(([id, label]) => ({ id, label })),
		parts: PARTS,
		handling: EXTRA
	};
	// as JSON holds it: no undefined fields
	return JSON.parse(JSON.stringify(doc));
}

/** the line as it was first made, each station's cycle time worked out here: what the document's must match */
export { SPEC };
