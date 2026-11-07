			what: "Not a bought jaw coupling: OSE cut two coupling halves and welded them into one sleeve, keyed and set-screwed onto the engine’s shaft, splined onto the pump’s.",
			moves: "Turns with the engine (shown slowed).",
			drive: "The crankshaft; it drives the pump",
			specs: [
				["Engine side", "1\" keyed, set screws"],
				["Pump side", "3/4\" spline, 11 teeth [inferred]"],
				["Made", "Two halves cut and welded"]
			]
		}, [cpl], { explode: [
			0,
			0,
			-.1
		] });
		moving.cpl = cpl;
