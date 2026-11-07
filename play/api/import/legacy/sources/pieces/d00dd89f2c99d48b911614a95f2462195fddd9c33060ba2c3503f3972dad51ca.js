			what: "Four rails round the top of the cage: OSE’s frame cuts its members 29\", 27\" and 24\" long. The lifting eyes and the fuel tank’s rails hang on them.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle"]]
		}, [m(GEO.merge([
			rail("x", -1),
			rail("x", 1),
			rail("z", -1),
			rail("z", 1)
		]), M.red)], { explode: [
			0,
			.16,
			0
		] });
		part({
			id: "tank-rails",
			label: "Fuel tank rails",
