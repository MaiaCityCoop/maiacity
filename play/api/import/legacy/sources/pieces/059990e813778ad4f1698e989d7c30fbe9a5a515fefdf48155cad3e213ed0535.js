			});
		};
		const ORDER = [
			"LN",
			"LS",
			"RS",
			"RN"
		];
		clips.racks = (t) => {
			const u = loop(t, 12) * ORDER.length;
			return m({ racks: (name) => {
				const v = u - ORDER.indexOf(name);
