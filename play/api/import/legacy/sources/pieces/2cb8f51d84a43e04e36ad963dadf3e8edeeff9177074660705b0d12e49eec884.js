		}, [m(GEO.merge(fronts.map((p) => p[0])), M.fabric), m(GEO.merge(fronts.map((p) => p[1])), M.vinyl)], { explode: [
			0,
			.7,
			.1
		] });
		const b2 = seatGeometry({
