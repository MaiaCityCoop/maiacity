			what: "The fuel at 70 % of the tank: what the engine burns, about 0.37 kg for every kWh it makes at full load.",
			specs: [["Burns", "0.37 kg/kWh at full load [inferred]"]]
		}, [fuel], { explode: [
			0,
			.4,
			0
		] });
		part({
			id: "fuel-line",
			label: "Fuel line and shut-off",
