	for (const sx of [-1, 1]) {
		const shape = new three.Shape();
		shape.moveTo(0, 0);
		for (let i = 0; i <= n; i++) {
			const phi = from + (to - from) * i / n;
			shape.lineTo(Math.sin(phi) * R, Math.cos(phi) * R);
		}
		shape.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(shape, {
