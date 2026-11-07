					sites.push({
						at: p.at,
						dir: v3(Math.cos(a), 0, Math.sin(a)),
						key: ["trunk", k]
					});
				}
			}
			if (f.sites === "trunk" && sh.gen === 1) {
				const lr = chance(seed, "limb-site", ...sh.key);
