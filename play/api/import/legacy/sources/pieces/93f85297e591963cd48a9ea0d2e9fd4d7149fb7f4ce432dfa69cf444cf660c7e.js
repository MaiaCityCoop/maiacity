function pinnateLeaf(bag, L, r, at, dir, len, paint, grown) {
	const P = L.pinnate;
	const scale = len / P.length;
	const end = at.clone().addScaledVector(dir, len).add(v3(0, -len * .12, 0));
	bag.add("body", tube([at, end], (u) => .0022 * (1 - .6 * u), () => col("#5a7a34"), 3));
	const pairs = P.pairs[0] + Math.floor(r() * (P.pairs[1] - P.pairs[0] + 1));
	const fold = lerp(.35, .06, grown);
	const blade = (p, d, s) => bag.add("sheet", sheet({
		length: L.length * s * scale,
		width: L.width * s * scale,
		shape: L.shape,
		lift: (u, v) => fold * v * v - .06 * u * u,
		paint,
		along: L.along ?? 4,
		across: L.across ?? 2
	}), aim(p, d, (r() - .5) * .4));
	const rachis = end.clone().sub(at).normalize();
	for (let k = 0; k < pairs; k++) {
		const u = lerp(.3, .82, pairs === 1 ? .5 : k / (pairs - 1));
		const p = at.clone().lerp(end, u);
		for (const side of [-1, 1]) {
			const d = across(rachis, side > 0 ? Math.PI / 2 : -Math.PI / 2);
			if (d.y > .5) d.y = .2;
			blade(p, d.normalize().multiplyScalar(.9).addScaledVector(rachis, .55).add(v3(0, -.1, 0)).normalize(), lerp(.85, 1, u));
		}
	}
	blade(end, rachis.clone().add(v3(0, -.15, 0)).normalize(), 1.05);
}
/**
