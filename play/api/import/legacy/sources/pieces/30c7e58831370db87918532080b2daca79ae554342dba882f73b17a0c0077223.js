			what: "v15.6’s cooler on the cube’s side: the returning oil runs through six finned tubes before the filter, giving the heat of every relief and orifice to the air.",
			specs: [["Type", "6-tube, fan-cooled"], ["Added", "v15.6"]]
		}, base, (put) => {
			for (let k = 0; k < 6; k++) put(cyl([
				W - 30,
				-200,
				140 + k * 36
			], [
				W - 30,
				120,
				140 + k * 36
