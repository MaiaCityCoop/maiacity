			if (f.sites === "shoots" && tipSite(sh.key, sh.gen, sh.born)) {
				const ar = chance(seed, "axils", ...sh.key);
				const [a, b] = f.axils ?? [2, 4];
				const n = a + Math.floor(ar() * (b - a + 1));
