			.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			.06,
			cd / 2,
			z0 - .01 - bw / 2
		], .0135, 6), M.zinc)];
		pump.add(bodyM, cover, m(tb, M.zinc), ...ports);
		part({
			id: "pump",
			label: "Hydraulic gear pump",
