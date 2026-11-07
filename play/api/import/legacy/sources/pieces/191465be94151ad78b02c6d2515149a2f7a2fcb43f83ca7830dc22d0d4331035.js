	/** a point riding a part, where it is now @param {string} part @param {V3} p @returns {[number, number]} */
	const place = (part, p) => {
		if (part === "swing") return [p[1], p[2]];
		const steps = [
			["boom", boom],
			["arm", arm],
			["bucket", bucket]
		];
		let y = p[1], z = p[2];
		const upTo = steps.findIndex(([n]) => n === part);
		for (let i = upTo; i >= 0; i--) {
			const [n] = steps[i];
