			]), M.forged));
			const pz = new three.Group(), rz = new three.Group();
			pz.position.z = rz.position.z = CRANK.z + off(sx);
			part({
				id: `piston-${side}`,
				label: `Piston, ${side}`,
