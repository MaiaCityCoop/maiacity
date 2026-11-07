			if (f.sites === "spurs" && sh.gen >= 3 && sh.born < f.opens - .05) {
				const sr = chance(seed, "spur", ...sh.key);
				const n = Math.floor(sh.length * f.chance + sr());
