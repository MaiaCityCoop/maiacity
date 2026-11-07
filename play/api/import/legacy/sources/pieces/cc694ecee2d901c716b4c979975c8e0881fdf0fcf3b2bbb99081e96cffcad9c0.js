	const steps = [
		["boom", boom],
		["arm", arm],
		["bucket", bucket]
	];
	/** a point riding a part, where it is now @param {string} part @param {V3} p @returns {[number, number]} */
	const place = (part, p) => {
		let y = p[1], z = p[2];
		for (let i = steps.findIndex(([n]) => n === part); i >= 0; i--) {
			const [n, th] = steps[i];
			const j = spec.J[n];
