				.18,
				ft.y + ft.h,
				.24
			], [
				.18,
				ft.y + ft.h + .016,
				.24
			], .024, 28), M.capRed)
		], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell",
			tag: {
				text: "Fuel tank",
				at: [
					-.2,
					ft.y + ft.h,
					.2
				],
				value: () => sim.s.fuel > 0 ? `${fmt(sim.s.fuel, 1)} L/h · ${fmt(ft.w * ft.h * ft.d * 1e3 * .7 / sim.s.fuel, 1)} h left` : "stopped",
				side: "left"
			}
		});
		part({
			id: "fuel",
			label: "Petrol",
