			what: "Flyweights inside the crankcase push a lever out as the speed rises; its rod closes the throttle, so the engine holds its set speed whatever the pump asks, drooping a little under load.",
			moves: "Opens and closes the throttle.",
			drive: "Flyweights on the camshaft gear",
			specs: [["Droop", "~5 % [inferred]"], ["Set speed", "From the panel’s throttle"]]
		}, gov, { explode: [
			.06,
			.14,
			0
		] });
	}
	{
		const cpl = new three.Group();
		cpl.position.copy(C);
