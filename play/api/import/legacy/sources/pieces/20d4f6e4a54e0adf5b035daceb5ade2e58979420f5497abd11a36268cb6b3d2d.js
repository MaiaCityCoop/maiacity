			],
			side: "left",
			value: () => `sunk ${fmt(sim.s.sagR * 1e3)} mm${sim.s.sagR > VEHICLE.axles.travel[1] ? " · on the bump stops" : ""}`
		}
	});
	const engine = inlineEngine(kit, {
		parent: body,
		at: [
			0,
