	bag.add("body", tube(pts, (u) => o.radius * (1 - .6 * u), () => mix(o.stalk, "#c2a94a", old), 4));
	/** the rachis at u: its point and direction */
	const along = (u) => {
		const f = u * 12, k = Math.min(11, Math.floor(f));
//#piece 3a19e0b7ae945c8b7175c29a45e4ff8ba5b6019be5c31317acb1fa74a03b1266
	const fold = (1 - g) * .9 + .05 + old * .2 + (o.curl ?? 0);
	const leaf = o.leaflet;
	const paint = (u, v) => {
		const vein = Math.abs(v) < .09 ? .45 : 0;
		const green = mix(mix(leaf.colour, leaf.young, 1 - clamp(g * 1.3)), leaf.vein, vein);
		return old ? green.lerp(mix(leaf.old ?? "#d2bf4a", "#a8823a", u), clamp(old * 1.3)) : green;
	};
	/** one leaflet at u along the rachis, to one side (−1, 1) or straight on (0) */
	const leaflet = (u, side, size) => {
		const { p: at, d: t } = along(u);
		let dir;
		if (side === 0) dir = t.clone();
		else {
//#piece c2f23e1b662555087324d8540ba1f88d1f1dea39e3916e91b7edf47e196fb13b
			dir = across.multiplyScalar(.85).addScaledVector(t, .5).add(v3(0, -.12 - old * .3, 0)).normalize();
		}
		const l = leaf.length * size * lerp(.3, 1, g);
		const blade = sheet({
			length: l,
			width: l * (leaf.width / leaf.length),
			shape: leaf.shape,
			lift: (uu, v) => fold * Math.abs(v) * .3 - (.08 + old * .2 + (o.droop ?? 0)) * uu * uu,
			paint,
			along: 36,
			across: 6
		});
		bag.add("sheet", blade, aim(at, dir, (r() - .5) * .3));
	};
	for (let k = 0; k < o.pairs; k++) {
		const u = lerp(.42, .9, o.pairs === 1 ? .5 : k / (o.pairs - 1));
		const size = lerp(.75, .95, k / Math.max(1, o.pairs - 1)) * (.9 + r() * .2);
		leaflet(u, -1, size);
		leaflet(u + (r() - .5) * .03, 1, size * (.9 + r() * .2));
		if (o.between && k < o.pairs - 1) {
			const ub = u + .48 / Math.max(1, o.pairs - 1) / 2;
			leaflet(ub, -1, .3);
			leaflet(ub, 1, .28);
		}
	}
	leaflet(1, 0, o.terminal ?? 1.1);
}

//#endregion
