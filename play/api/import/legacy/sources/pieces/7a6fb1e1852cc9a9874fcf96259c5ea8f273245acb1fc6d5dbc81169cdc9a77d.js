				for (const c of colliders) {
					const e = Math.hypot(x - c.x, z - c.z);
					if (e < c.r && e < Math.hypot(from.x - c.x, from.z - c.z)) return false;
				}
				return true;
			},
			floorAt: () => 0,
			lamps: []
		},
		parts,
		explode,
		catalog: {
