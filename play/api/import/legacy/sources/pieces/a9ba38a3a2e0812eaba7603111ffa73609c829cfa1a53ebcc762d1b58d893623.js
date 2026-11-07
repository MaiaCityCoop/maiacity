			what: "The 12 V fan pulling air through the cooler’s fins into the cube.",
			moves: "Turns while the engine runs.",
			drive: "12 V from the battery",
			specs: [["Voltage", "12 V"], ["Diameter", "160 mm [inferred]"]]
		}, [fan], { explode: [
			.06,
			0,
			.04
		] });
		moving.fan = blade;
		part({
			id: "filter",
			label: "Return filter",
			assembly: "hydraulics",
