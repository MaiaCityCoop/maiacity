		],
		M: E,
		tag: () => sim.s.stalled ? "stalled" : `${fmt(sim.s.rpm)} rpm · ${fmt(Math.max(0, sim.s.Te))} N·m · ${fmt(Math.max(0, sim.s.Pe) / 1e3, 1)} kW`,
		gearTag: () => sim.s.stalled ? "stalled in 1st" : sim.s.v < .05 && sim.s.at.vSet < .05 ? "neutral" : `${ordinal(sim.s.gear)} gear · ${VEHICLE.gears[sim.s.gear - 1].toFixed(2)} : 1${sim.s.launch ? " · clutch slipping" : ""}`
	});
	const shaft = propshaft(kit, {
		n: 2,
		r: .032,
		M: R,
		assembly: "drivetrain",
		source: SRC.eng,
		specs: [["Tube", "Ø 64 × 1.6 mm steel [inferred]"], ["Joints", "4 universal joints, a centre bearing"]]
	});
	const BEARING = [
		0,
