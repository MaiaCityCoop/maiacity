			what: "The 7s cooler on the cube’s right side: the returning oil runs through six finned tubes before the filter, giving the heat of every loss to the air its fan pulls through.",
			specs: [
				["Type", "6-tube, finned, fan-cooled"],
				["Rejects", "~150 W per °C over the air [inferred]"],
				["Added", "7s"]
			]
		}, co, {
			explode: [
				.2,
				0,
				0
			],
			tag: {
				text: "Oil cooler",
				at: [
					.33,
					.33,
					-.12
				],
				value: () => `${fmt(150 * (sim.s.T - 20) / 1e3, 1)} kW to the air`,
				side: "right"
			}
		});
		const fan = new three.Group();
		fan.position.set(.29, .232, -.12);
		const blade = new three.Group();
		blade.add(m(GEO.rotor({
			count: 5,
			axis: "x",
			r0: .018,
			r1: .075,
			chord: [.04, .05],
			thick: .06,
			camber: .05,
			twist: .4,
			pitch: .5,
			nS: 6,
			nC: 8
