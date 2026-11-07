	if (o.wither < 1 && o.stem > o.radius) {
		const shrink = 1 - .45 * o.wither;
		const grown = lerp(.35, 1, clamp(o.open * 1.3));
		for (const side of [-1, 1]) {
			const spread = lerp(.08, 1.35 + (r() - .5) * .2, o.open) + o.wither * .35;
			const d = tip.clone().multiplyScalar(Math.cos(spread)).addScaledVector(across, side * Math.sin(spread)).normalize();
			const len = o.leaf.length * grown * shrink;
