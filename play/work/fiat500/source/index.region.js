//#region src/lib/machines/index.js
/** @typedef {import('$lib/actors').Actor} Actor */
/** @typedef {import('$lib/actors').Family} Family */
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: Actor[] })[]>} */
const HISTORY = /* @__PURE__ */ (() => ({ fiat500: [{
	...FIRST,
	date: "2026-11-07"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "fiat500",
	label: "Fiat 500 F",
	note: "the Nuova 500 as built 1965–72, in Rosso Corallo 102, true to its reference sheet: its own body lofted from the sheet’s traced views, its glass, gaps, rolltop, lamps and chrome, its interior, and its own air-cooled twin, transaxle, leaf-sprung front and coil-sprung swinging arms behind, on the shared vehicle machinery; vehicle.js’s solver drives it",
	from: "Samuel 2026-11-07: a red Fiat 500 in the machines",
	variants: [{
		id: "fiat500",
		label: "Roof closed",
		note: "2,970 × 1,320 × 1,325 mm, wheelbase 1,840; 520 kg; 499.5 cc, 18 hp at 4,600 rpm; 95 km/h",
		make: () => castOf(fiat500())
	}, {
		id: "fiat500-open",
		label: "Roof open",
		note: "the same car, its rolltop folded back as the sheet’s front three-quarter right shows it",
		make: () => castOf(fiat500({ roof: 1 }))
	}]
}];
/** @type {Family[]} */
const MACHINES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY))();

//#endregion
