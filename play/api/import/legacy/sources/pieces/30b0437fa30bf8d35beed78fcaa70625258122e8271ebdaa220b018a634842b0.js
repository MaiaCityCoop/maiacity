			what: "On the front corner post: the key switch (off, run, start), the choke knob, the throttle lever that sets the governor’s speed, and an hour meter. The cube is started here and left running; the machine’s valves do the rest.",
			moves: "Key, choke and throttle are worked by hand.",
			specs: [
				["Key", "Off / run / start"],
				["Choke", "Pull knob"],
				["Throttle", "Lever: 1,750 to 3,600 rpm"]
			]
		}, [panel], { explode: [
			.14,
			.06,
			.14
		] });
		moving.lever = tl;
	}
	const ctl = {
		speed: {
			label: "Engine speed (governor)",
			min: 1800,
			max: 3600,
			value: speed,
			step: 50,
			unit: "rpm",
			ends: ["Low", "Rated 3,600"]
		},
		load: {
			label: "Load pressure (the work)",
			min: 0,
			max: 2900,
			value: load,
			step: 10,
			unit: "psi",
			ends: ["Free flow", "Near relief"]
		}
	};
	const sim = solver(ctl);
	const cd = PUMP.teeth * PUMP.module, pz = PUMP.z0 - .01 - PUMP.width / 2;
	const flowPaths = [
		[
			[
				-.2,
				.36,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.02,
				CRANK.y + cd + .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				-.2,
				.36,
				-.248
			],
			[
				-.2,
				.3,
				-.248
			],
			[
				-.15,
				.27,
				-.252
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.256
			],
			[
				-.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				-.02,
				CRANK.y - .012,
				pz
			],
			[
				.02,
				CRANK.y - .012,
				pz
			],
			[
				.05,
				CRANK.y + cd / 2,
				pz
			]
		],
		[
			[
				.05,
				CRANK.y + cd / 2,
				pz
			],
			[
				.1,
				.27,
				-.255
			],
			[
				.13,
				.3,
				-.255
			],
			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.36
			]
		],
		[
			[
				.29,
				.2516,
				-.36
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			],
			[
				.318,
				.152,
				.03
			],
			[
				.318,
				.216,
				.03
			],
			[
				.318,
				.216,
				-.27
			],
			[
				.318,
				.28,
				-.27
			],
			[
				.318,
				.28,
				.03
			],
			[
				.318,
				.42,
				0
			],
			[
				.318,
				.53,
				-.08
			],
			[
				.31,
				.585,
				-.16
			],
			[
				.22,
				.585,
				-.21
			],
			[
				.15,
				.57,
				-.22
			],
			[
				.15,
				.5,
				-.22
			],
			[
				.12,
				.42,
				-.2
			]
		],
		[
			[
				.13,
				.3,
				-.255
			],
			[
				.13,
				.33,
				-.255
			],
			[
				.13,
				.36,
				-.255
			],
			[
				.1,
				.42,
				-.24
			]
		]
	];
	const flow = new Flow({ theme: "paper" }, {
		parent: root,
		paths: flowPaths,
		count: 420,
		length: .05,
		seed: 7,
		perPath: [
			1,
			1,
			1,
			1,
			0
		],
		color: () => tCol(sim.s.T)
	});
	/** the oil's colour by its temperature: cool blue to hot amber @param {number} T */
	const tCol = (T) => {
		const k = clamp((T - 30) / 60);
		return [
			lerp(.2, 1, k),
			lerp(.45, .5, k),
			lerp(.95, .1, k)
		];
	};
	const turnPin = new three.Vector3();
	kit.onTick((dt, env) => {
		sim.step(dt, env);
		const s = sim.s, a = s.ang;
		moving.crank.rotation.z = moving.fly.rotation.z = moving.cpl.rotation.z = -a;
		moving.drive.rotation.z = -a;
		moving.idler.rotation.z = a + Math.PI / PUMP.teeth;
		turnPin.set(r * Math.sin(a), r * Math.cos(a), 0);
		for (const [side, sx] of banks) {
			const d = axis(sx), phi = sx * ENGINE.bank;
			const along = r * Math.cos(a - phi), across = r * Math.sin(a - phi);
			const sPin = along + Math.sqrt(ENGINE.rod ** 2 - across ** 2);
			const pin = d.clone().multiplyScalar(sPin);
			const pis = moving[`piston-${side}`], rod = moving[`rod-${side}`];
			pis.position.set(C.x + pin.x, C.y + pin.y, 0);
			pis.rotation.z = -phi;
			rod.position.set(C.x + turnPin.x, C.y + turnPin.y, 0);
			rod.rotation.z = -Math.atan2(pin.x - turnPin.x, pin.y - turnPin.y);
		}
		moving.fan.rotation.x += (s.stalled ? 0 : 2800 / 60 / 12) * 2 * Math.PI * dt;
		moving.needle.rotation.z = three.MathUtils.degToRad(135 - clamp(s.p / PSI / 5e3) * 270);
		moving.throttle.rotation.z = -s.theta * 1.2;
		moving.lever.rotation.z = -.5 + (ctl.speed.value - 1800) / 1800 * 1;
		flow.speed = .5 * s.q / (57.5 / 6e4);
		flow.o.perPath[2] = s.q > 0 ? clamp((s.qLoad + s.qRelief) / s.q) : 0;
		flow.o.perPath[3] = s.q > 0 ? clamp(s.qLoad / s.q) : 0;
		flow.o.perPath[4] = s.q > 0 ? clamp(s.qRelief / s.q) * 2 : 0;
		flow.opacity = s.stalled ? 0 : clamp(.3 + s.q / (57.5 / 6e4)) * Math.max(env.cut, env.xray);
		flow.update(dt);
		const hero = lab.read;
		hero.value = s.hyd / 1e3;
		hero.bad = s.stalled || s.T > 82 || s.p > 3100 * PSI;
		hero.state = s.stalled ? env.broken ? "stalled: dead-headed, relief stuck" : "stalled: more torque than the engine has" : env.broken ? "dead-headed, relief stuck: the pressure climbing" : s.valves < 1 ? "starting, valves in neutral" : s.qRelief > 1e-6 ? "over relief" : s.T > 82 ? "oil too hot" : s.theta > .98 && sim.rpm() < s.set * .96 ? "lugging down: full throttle, the speed sagging" : "running";
		hero.sub = s.stalled ? `the pump needed ${fmt(lastTp)} N·m at ${fmt(lastP / PSI)} psi, the engine gives at most ${fmt(best(ctl.speed.value))} at this setting · ${env.broken ? "take the break back" : "move a slider"} to restart` : `${fmt(s.q * 6e4, 1)} L/min (${fmt(s.q * 15850.3, 1)} gpm) · ${fmt(s.p / PSI)} psi · ${fmt(sim.rpm())} rpm · oil ${fmt(s.T)} °C · ${fmt(s.fuel, 1)} L/h`;
		if (!s.stalled) {
			lastP = s.p;
			lastTp = s.Tp;
		}
	});
	let lastP = 0, lastTp = 0;
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Hydraulic power",
			unit: "kW",
			max: 20,
			digits: 1
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "The engine turns the gear pump on one shaft. Each turn the pump carries 16 cm³ of oil round its gears, less what slips back through its clearances (more as the pressure rises and the oil warms). The pressure is what the work needs plus the hoses’ loss, capped by the relief valve, which dumps the rest to the tank as heat. The pump’s torque grows with the pressure; the engine’s governor opens the throttle to hold its speed, and past what the engine can give the speed sags (lugging) or the engine stalls. The oil heats with every loss and the cooler gives the heat to the air (heat shown 20 times faster). Engine shown slowed 40 times.",
			eqs: [
				"Q = D n − k p (ν50/ν)      D = 16.0 cm³, slip 6 % at 3,000 psi",
				"Tp = D p / (2π ηhm)       ηhm = 0.92",
				"J dω/dt = θ Te(n) − Tp       J = 0.075 kg·m²",
				"θ = clamp((1.03 n_set − n) / (0.08 n_set))",
				"P = p Q_load",
				"C dT/dt = losses − UA (T − T_air)      UA = 162 W/K"
			]
		},
		breakIt: {
			label: "Dead-head it",
			run: () => {},
			reset: () => sim.restart()
		},
		cut: {
			a: [
				0,
				0,
				1
			],
			b: [
				0,
				1,
				0
			],
			center: [
				0,
				CRANK.y,
				CRANK.z
			],
			reach: .9
		}
	};
	kit.seal({ lab }).tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
}

//#endregion
