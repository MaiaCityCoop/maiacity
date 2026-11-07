			what: "The 12 V fan pulling air through the cooler’s tubes.",
			moves: "Turns while the engine runs (shown slowed).",
			drive: "12 V from the battery",
			specs: [["Voltage", "12 V"]]
		}, joints.fan, (put) => {
			for (let k = 0; k < 5; k++) {
				const g = block(.006, .03, .09, [
					0,
					0,
					.05
				], .004);
				g.rotateX(k / 5 * Math.PI * 2);
				g.translate(...L(...FAN));
