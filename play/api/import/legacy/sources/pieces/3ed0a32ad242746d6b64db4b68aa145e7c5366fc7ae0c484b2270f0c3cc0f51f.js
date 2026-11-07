			what: "The Briggs & Stratton muffler behind the cylinders, collecting both exhausts into one can and blowing out to the side.",
			specs: [["Type", "B&S twin-inlet muffler"]]
		}, base, (put) => {
			put(cyl([
				-150,
				-110,
				470
			], [
				150,
				-110,
				470
			], 45, 18), "#505457");
			for (const sx of [-1, 1]) put(cyl([
				sx * 190,
				30,
				430
			], [
				sx * 110,
				-110,
				470
