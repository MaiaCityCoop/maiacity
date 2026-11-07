	const moves = {};
	for (const [name, g] of Object.entries(life.gaits)) moves[name] = (t, m) => {
		const mo = onTheSpot(t, g.speed, m);
		const pace = clamp(mo.speed / g.speed, 0, 1.4);
		const ph = mo.dist / g.stride;
