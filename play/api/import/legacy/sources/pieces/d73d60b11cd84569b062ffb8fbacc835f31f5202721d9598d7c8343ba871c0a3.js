		poses: kind === "people" ? {
			closed: m({}),
			"doors open": m({ doors: 1 }),
			"bay open": m({ flaps: 1 }),
			"all open": m({
				doors: 1,
				flaps: 1
			})
		} : {
