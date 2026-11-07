			if (f.sites === "limbs" && sh.gen === 1) {
				const lr = chance(seed, "limb-site", ...sh.key);
				const n = Math.floor(sh.length * f.chance);
				for (let k = 0; k < n; k++) {
					const u = between(lr, .25, .8);
