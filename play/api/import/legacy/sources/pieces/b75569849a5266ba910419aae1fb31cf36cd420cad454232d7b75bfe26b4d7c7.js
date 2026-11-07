		}, [m(GEO.merge([pipe, tail]), E.hot), m(silencer, M.silencer)], { explode: [
			0,
			-.5,
			0
		] });
	}
	/** the coolant's heat to the air (kW): about 30 % of the fuel's heat [inferred] */
	const heat = () => sim.s.fuel * .835 * 42.6 * .3 / 3.6;
	const prof = profile();
	const t = .008;
