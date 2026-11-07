			what: "Added in October 2014: a spring-loaded poppet that opens back to the tank when the pressure reaches its setting, so nothing bursts when a cylinder bottoms out or a wheel stalls. All the power it dumps becomes heat in the oil.",
			moves: "Its poppet lifts only at its setting.",
			specs: [
				["Setting", "3,000 psi (207 bar)"],
				["Override", "+160 psi at full flow [inferred]"],
				["Added", "October 2014 (v15.6)"]
			]
		}, [relief], {
			explode: [
				.16,
				-.02,
				-.12
			],
			tag: {
				text: "Relief valve",
				at: [
					.2,
					.3,
					-.255
				],
				value: () => sim.s.qRelief > 1e-6 ? `dumping ${fmt(sim.s.qRelief * 6e4, 1)} L/min` : sim.s.stuck ? "stuck shut" : "closed",
				side: "right"
			}
		});
		const pressPts = [
			[
				.06,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.105,
				.3,
				-.255
			]
		];
		part({
			id: "pressure-hose",
			label: "Pressure hoses",
