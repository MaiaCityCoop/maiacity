//#piece 08fef1b2b79afe9694f39a0ed2fa1d0526bf137c52aaa04fe71302b99aaa477c
				laterals: 5,
				lateral: .25,
				depth: 2,
				age: (g - born - .6) / 2.5,
				young: "#efdcb8",
				old: "#6e5032"
			});
		}
		const f = spec.flower;
		const tipSite = (key, gen, born) => {
			if (f.sites !== "tips" && f.sites !== "shoots" || gen < 2) return false;
			return chance(seed, "site", ...key)() < f.chance && born < f.opens - .05 && born > f.opens - .75;
		};
		const shoots = spec.flush ? flushCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: {
				...spec.flush,
				stop: (key, gen, born) => tipSite(key, gen, born)
			}
