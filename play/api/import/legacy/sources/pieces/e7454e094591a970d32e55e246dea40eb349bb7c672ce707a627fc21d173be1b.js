	if (L.style === "whorl") {
		for (let k = 0; k < L.per; k++) {
			const bear = k * 2.39996 + lr() * .5;
			const out = v3(Math.cos(bear), 0, Math.sin(bear)).addScaledVector(sh.dir, .7);
