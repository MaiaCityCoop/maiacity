			const g = new three.TorusGeometry(26 * S, 7 * S, 8, 16);
			put(T(g.translate(...L(sx * 180, 0, H + 26))), STEEL);
		}
	});
	if (engine) {
		part("engine", {
			id: "engine-plate",
			label: "Engine mount plate",
