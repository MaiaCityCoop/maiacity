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
	params: [
		{ id: "doors", label: "Doors open", type: "number", value: 0, min: 0, max: 1, step: .05 },
		{ id: "roof", label: "Rolltop folded back", type: "number", value: 0, min: 0, max: 1, step: .05 },
		{ id: "lid", label: "Engine lid up", type: "number", value: 0, min: 0, max: 1, step: .05 }
	],
	variants: [{
		id: "fiat500",
		note: "2,970 × 1,320 × 1,325 mm, wheelbase 1,840, tracks 1,121 and 1,135, 520 kg (e5efff81-8de1-45b3-9de1-2fd3e521bd53); a 499.5 cc air-cooled twin, 67.4 × 70 mm, 18 hp at 4,600 rpm, 31 N·m at 3,000 (e5efff81-8de1-45b3-9de1-2fd3e521bd53), 4,600 rpm its maximum revs (75584c50-8752-4d4b-abdd-ad613d0ecee6); gears 3.700, 2.067, 1.300, 0.875, final drive 8/41 = 5.125 (3b5332c8-1083-4e85-bad5-156a90148b09); 125 SR 12 tyres, 514 mm across (e12362b0-2cf5-4b87-95da-e0f36b801404); top speed 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68); Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2); Rosso Corallo, Fiat 102, #b1372f (344cf860-1a7d-4bf7-86e3-ac16638425a4, d317c2f0-cfa5-4faa-b502-157ac3e44b52); its reference sheet fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a",
		make: (doors = 0, roof = 0, lid = 0) => castOf(fiat500({ doors, roof, lid }))
	}]
}];
/** @type {Family[]} */
const MACHINES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY))();

//#endregion
