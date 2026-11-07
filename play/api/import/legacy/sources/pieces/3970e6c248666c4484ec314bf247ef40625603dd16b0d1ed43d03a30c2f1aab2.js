		moves: "Turns with the engine (shown slowed).",
		drive: "The crankshaft; it drives the rotor",
		specs: [["Type", "Jaw coupling, rubber spider [inferred]"]]
	}, joints.coupling, (put) => {
		put(cyl([
			0,
			CPL - 40,
			235
		], [
			0,
			CPL + 40,
			235
		], 34, 18), STEEL);
		put(cyl([
			0,
			CPL - 6,
			235
		], [
			0,
			CPL + 6,
			235
		], 40, 18), BLACK);
		for (let k = 0; k < 8; k++) {
