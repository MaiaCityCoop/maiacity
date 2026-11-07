			if (f.sites === "trunk" && sh.gen === 0) {
				const tr = chance(seed, "trunk-site");
				const n = Math.floor(sh.length * f.chance);
				for (let k = 0; k < n; k++) {
