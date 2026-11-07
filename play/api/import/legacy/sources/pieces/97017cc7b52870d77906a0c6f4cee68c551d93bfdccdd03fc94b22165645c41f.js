			what: "A fixed-displacement external gear pump: two gears mesh and carry oil round the outside of their teeth from the suction port to the pressure port, about a cubic inch every turn. This flow is everything the machine it is coupled to can do.",
			moves: "Its gears turn with the engine.",
			drive: "The engine, through the coupling",
			specs: [
				["Displacement", "0.976 in³ (16.0 cm³) a turn"],
				["Flow", "15.2 gpm (57.5 L/min) at 3,600 rpm, less its slip"],
				["Pressure", "3,000 psi (207 bar) max"],
				["Gears", "12 teeth, module 2.5, 34 mm wide [inferred]"]
			]
		}, [pump], {
			explode: [
				0,
				0,
				-.28
			],
			xray: "shell",
			tag: {
				text: "Gear pump",
				at: [
					.05,
					CRANK.y + .04,
					z0 - .03
				],
				value: () => `${fmt(sim.s.q * 6e4, 1)} L/min · ${fmt(sim.s.p / PSI)} psi`,
				side: "right"
			}
		});
		const gears = new three.Group();
		gears.position.set(0, CRANK.y, 0);
		const gearGeo = GEO.gear({
			teeth: PUMP.teeth,
			module: PUMP.module,
			width: bw - 4e-4,
			bore: .009
		});
