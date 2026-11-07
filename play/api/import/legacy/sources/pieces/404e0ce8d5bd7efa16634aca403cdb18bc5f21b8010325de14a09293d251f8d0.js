//#piece 89110386c5ebd2e2957bafed306c3a72e723a9453b18fc8e01fdaa995c1faf9e
};
/** the cube on its own: its assemblies and its build steps */
const OWN = [
	{
		id: "frame",
		label: "Frame",
		note: "A 27\" cube: two 4×4 tube skids carry everything and take the lifting pins; 2×2 angle posts and top rails close it, and its quick-attach plate couples it to a machine.",
		out: [
			0,
			-.04,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "A 28 hp Briggs & Stratton air-cooled V-twin with electric start, on its mount plate: the prime mover of every machine the cube is coupled to.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulics",
		note: "The gear pump on the engine’s shaft, the 7-gallon reservoir, the relief valve and gauge, the six-tube cooler, the return filter and the two quick couplers out.",
		out: [
			0,
			.22,
			-.5
		]
	},
	{
		id: "controls",
		label: "Fuel and controls",
		note: "The removable 7-gallon fuel tank, the 12 V battery and the panel with the key, the choke and the throttle.",
		out: [
			-.5,
			.35,
			.2
		]
	}
];
const OWN_STEPS = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Bolt in the engine on its mount plate",
	"Mount the pump and coupling; fit the reservoir, filter, relief, gauge, cooler, couplers and hoses",
	"Fit the fuel tank, the battery and the control panel"
];
