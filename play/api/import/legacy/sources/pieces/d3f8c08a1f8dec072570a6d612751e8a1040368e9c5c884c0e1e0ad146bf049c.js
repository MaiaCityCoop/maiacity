			what: "The oil tank over the pump, removable for cleaning: the pump draws through a strainer at its bottom, the returns come in at its top through the filter, and a baffle between them makes the oil settle and let go of its air before it is drawn again.",
			specs: [
				["Volume", `${fmt(litres, 1)} L inside (7 gal nominal)`],
				["Walls", "3 mm steel"],
				["Oil", "ISO VG 46 anti-wear"]
			]
		}, [m(GEO.merge(walls), M.tank)], {
			explode: [
				0,
				.2,
				-.22
			],
			xray: "shell",
			tag: {
				text: "Reservoir",
				at: [
					rv.x0 + .04,
					rv.y1,
					rc[2]
				],
				value: () => `oil ${fmt(sim.s.T)} °C`,
				side: "left"
			}
		});
		const level = .82;
