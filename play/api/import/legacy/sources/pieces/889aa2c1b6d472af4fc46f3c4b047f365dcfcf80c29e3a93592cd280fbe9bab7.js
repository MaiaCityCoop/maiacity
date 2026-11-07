function fan({ size, from, to, edge, lift = () => 0, paint, rings = 8, rays = 40 }) {
	rings = fewer(rings, 1);
	rays = fewer(rays, 5);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let j = 0; j <= rays; j++) {
		const a = lerp(from, to, j / rays);
		const reach = edge(a) * size;
		for (let i = 0; i <= rings; i++) {
			const s = i / rings;
			pos.push(Math.cos(a) * reach * s, lift(s, a) * size, Math.sin(a) * reach * s);
			nor.push(0, 1, 0);
			uv.push(s, j / rays);
			const c = toColor(paint(s, a));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let j = 0; j < rays; j++) for (let i = 0; i < rings; i++) {
		const a = j * (rings + 1) + i, b = a + rings + 1;
		idx.push(a, b, a + 1, b, b + 1, a + 1);
	}
	return made(pos, nor, uv, col, idx, true);
