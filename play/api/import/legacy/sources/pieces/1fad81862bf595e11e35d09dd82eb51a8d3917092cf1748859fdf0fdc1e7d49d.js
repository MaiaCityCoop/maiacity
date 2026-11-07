//#region src/lib/models/village.js
/** What each machine is, by the engine's asset id (COOPS.village): the Assets viewer's note, and the facts the game's asset card lists. */
const VILLAGE_INFO = {
	pickup: {
		model: "pickup",
		note: "a double-cab pickup, 5.33 × 1.86 m, 1.82 m high, a 3.1 m wheelbase: four doors, an open 1.55 m bed with a tool box and a jerrycan in it",
		specs: [
			["Size", "5.33 × 1.86 × 1.82 m"],
			["Seats", "5, a double cab"],
			["Payload", "about 1 t"],
			["Bed", "1.55 × 1.52 m, open"],
			["Fuel", "diesel, about 9 l per 100 km"],
			["Weight", "about 2.1 t"]
		]
	},
	powercube: {
		model: "electrocube",
		note: "the ElectroCube: our own cube on Open Source Ecology’s Power Cube frame (a 28 hp V-twin in a 27-inch steel frame) with a flat axial-flux generator on its shaft where the hydraulic pump would be, a power converter, breakers and sockets on the back, the same 27-inch size as every cube. Not an OSE design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Power", "about 15 kW [inferred]"],
			["Output", "400 V three-phase, 2 × 230 V"],
			["Engine", "28 hp (20.9 kW) petrol V-twin"],
			["Fuel tank", "7 gal (26.5 l)"],
			["Design", "ours, on the OSE Power Cube VII frame"]
		]
	},
	solar: {
		model: "solar-panel",
		note: "one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, on ballast blocks",
		specs: [
			["Size", "1.72 × 1.13 m"],
			["Peak power", "about 410 W"],
			["Cells", "60 monocrystalline"],
			["Tilt", "30°, facing the sun"],
			["Yield", "about 1.4 kWh on a sunny day"],
			["Weight", "about 21 kg, on 4 ballast blocks"]
		]
	},
	battery: {
		model: "battery-pack",
		note: "the BatteryCube: the Power Cube’s 27-inch frame with no engine, four BatteryPacks of 280 cells each stacked to its top (about 20.7 kWh) and a 6 kW hybrid inverter on its back that turns their 52 V into 230 V and takes a solar panel straight in. Our design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Capacity", "about 20.7 kWh, 4 BatteryPacks"],
			["Cells", "1,120 × 21700, 14S80P [inferred]"],
			["Power", "6 kW at 230 V, 12 kW peak"],
			["Solar in", "MPPT, up to 8 kWp"],
			["Weight", "about 140 kg"]
		]
	}
};
const m = /* @__PURE__ */ (() => ({
//#piece ef971d9b5e8568f21475bbe774ac64910f49629e845392c432d3ae18be0806bb
