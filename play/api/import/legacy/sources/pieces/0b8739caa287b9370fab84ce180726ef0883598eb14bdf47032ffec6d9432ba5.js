			what: "The engine’s cast block: it carries the crankshaft in its two main bearings, the camshaft and the governor, holds the oil in its sump, and bolts to the plate by its flange.",
			specs: [
				["Engine", "810 cc 90° V-twin, OHV, air-cooled"],
				["Rated", "28 hp (20.9 kW) gross at 3,600 rpm"],
				["Oil", "~1.9 L SAE 30 [inferred]"],
				["Dry mass", "~42 kg (92 lb)"]
			]
		}, cc, {
			explode: [
				0,
				.02,
				.02
			],
			xray: "shell",
			tag: {
				at: [
					-.12,
					.25,
					.1
				],
				value: () => `${fmt(sim.rpm())} rpm · ${fmt(Math.max(0, sim.s.Te) * sim.s.w / 1e3, 1)} kW`,
				text: "Engine",
				side: "left"
			}
		});
		const crank = new three.Group();
		crank.position.copy(C);
		const web = new three.Shape();
		web.moveTo(-.022, r);
		web.absarc(0, r, .022, Math.PI, 0, true);
		web.lineTo(.034, 0);
		web.absarc(0, 0, .062, 0, -Math.PI, true);
		web.lineTo(-.034, 0);
		web.lineTo(-.022, r);
