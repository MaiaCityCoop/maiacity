function sheet({ length, width, shape, lift = () => 0, paint, along = 16, across = 6 }) {
	along = fewer(along, 2);
	across = fewer(across, 1);
	const pos = [], nor = [], uv = [], col = [], idx = [];
	for (let i = 0; i <= along; i++) {
		const u = i / along;
		const w = shape(u) * width;
		for (let j = 0; j <= across; j++) {
			const v = j / across * 2 - 1;
			pos.push(u * length, lift(u, v) * length, v * w);
			nor.push(0, 1, 0);
			uv.push(u, (v + 1) / 2);
			const c = toColor(paint(u, v));
			col.push(c.r, c.g, c.b);
		}
	}
	for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) {
		const a = i * (across + 1) + j, b = a + across + 1;
		idx.push(a, a + 1, b, b, a + 1, b + 1);
