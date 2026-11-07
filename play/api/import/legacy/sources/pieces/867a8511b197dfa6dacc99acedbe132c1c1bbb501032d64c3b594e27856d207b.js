				-.5,
				-.3,
				0
			],
			tag: {
				text: "Fuel",
				at: [
					ft.x - ft.w / 2,
					ft.y,
					ft.z
				],
				side: "right",
				value: () => sim.s.stalled ? "stopped" : `${fmt(sim.s.fuel, 1)} L/h${sim.s.v > .5 ? ` · ${fmt(sim.s.l100, 1)} L/100 km` : ""}`
			}
		});
		const ex = engine.points.exhaust;
		const pipe = hose([
			ex,
			[
