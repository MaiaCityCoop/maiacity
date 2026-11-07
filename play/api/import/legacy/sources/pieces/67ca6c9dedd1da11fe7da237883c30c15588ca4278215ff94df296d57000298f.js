			what: "A liquid-filled gauge on the pressure line, added in April 2015: the operator sees at a glance how hard the cube is working.",
			moves: "Its needle swings with the pressure.",
			specs: [["Range", "0–5,000 psi"], ["Added", "April 2015 (v15.6)"]]
		}, [gauge], {
			explode: [
				0,
				.06,
				-.14
			],
			tag: {
				text: "Pressure gauge",
				at: [
					ga[0],
					ga[1] + .05,
					ga[2] - .03
				],
				value: () => `${fmt(sim.s.p / PSI)} psi · ${fmt(sim.s.p / 1e5)} bar`,
				side: "left"
			}
		});
		moving.needle = needle;
		const cp = [];
		for (const [x, capM] of [[.23, M.capRed], [.29, M.capBlue]]) {
