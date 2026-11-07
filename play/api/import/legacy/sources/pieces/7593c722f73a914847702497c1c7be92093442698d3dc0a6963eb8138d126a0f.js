			[0, lifted],
			[.14, reach],
			[.3, curled],
			[.42, lifted],
			[.58, {
				...lifted,
				slew
			}],
			[.7, {
				...dump,
				slew
			}],
			[.82, {
				...lifted,
				slew
			}],
			[1, lifted]
		], loop(t, period))),
		drive: (t) => m({
			...tucked,
			wheels: -t * speed / w.r,
			root: [
				0,
				Math.sin(t * 9) * w.r * .02,
				0
			]
		}),
		idle: (t) => m({
			...lifted,
			root: [
				0,
				Math.sin(t * 40) * .002,
				0
			]
		})
	};
	if (J.blade) clips.doze = (t) => {
		const u = loop(t, 6);
