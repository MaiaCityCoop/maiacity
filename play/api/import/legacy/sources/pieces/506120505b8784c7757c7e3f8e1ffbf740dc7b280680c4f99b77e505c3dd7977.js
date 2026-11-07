			what: "The cube’s whole connection to a machine: the pressure coupler (red cap) and the return coupler (blue) on its back. Push the machine’s hoses on and the cube drives it; pull them off and it is free for the next one.",
			specs: [["Size", "1/2\" ISO 7241-A [inferred]"], ["Rated", "3,000 psi"]]
		}, cp, {
			explode: [
				.06,
				0,
				-.22
			],
			tag: {
				text: "Couplers P · T",
				at: [
					.26,
					.2516,
					-.38
				],
				value: () => `${fmt(sim.s.qLoad * 6e4, 1)} L/min to the work`,
				side: "right"
			}
		});
		part({
			id: "return-hose",
			label: "Return hoses",
