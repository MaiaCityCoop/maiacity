}))();
const ASSEMBLIES$1 = [
	{
		id: "frame",
		label: "Frame",
		note: "A 27\" cube: two 4×4 tube skids carry everything and take the forks; 2×2 angle posts and rails close it; the quick-attach plates on its back couple it to a machine.",
		out: [
			0,
			-.12,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "An 810 cc air-cooled 90° V-twin, 28 hp at 3,600 rpm, electric start: its crank turns the pump through the coupling behind it.",
		out: [
			0,
			.32,
			.3
		]
	},
	{
		id: "hydraulics",
		label: "Hydraulics",
		note: "The gear pump on the engine’s shaft, the 7-gallon reservoir over it, the relief valve and gauge, the six-tube cooler, the return filter and the two quick couplers on the back.",
		out: [
			0,
			.18,
			-.42
		]
	},
	{
		id: "controls",
		label: "Fuel and controls",
		note: "The 7-gallon fuel tank on top, the 12 V battery, and the panel on the front corner with the key, choke and throttle.",
		out: [
			.36,
			.3,
			.2
		]
	}
];
const STEPS$1 = [
	"Cut, drill and bolt the frame: skids, posts, rails, the engine plate and the quick-attach plates",
	"Bolt in the engine and fit its flywheel, shroud, air cleaner and muffler",
	"Mount the coupling and the pump; fit the reservoir, hoses, relief, gauge, cooler, filter and couplers",
	"Fit the fuel tank, the battery and the control panel"
];
/** a rounded rectangle, centred @param {number} w @param {number} h @param {number} r */
