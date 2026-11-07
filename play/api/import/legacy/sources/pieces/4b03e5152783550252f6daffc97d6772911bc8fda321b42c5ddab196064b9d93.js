			const k = Math.max(open(.2), open(.7));
			if (kind === "goods") return m({
				z,
				lead,
				doors: k
			});
			return m({
				z,
				lead,
				doors: u < h ? k : 0,
				flaps: u < h ? 0 : k
			});
		},
		open: (t) => {
