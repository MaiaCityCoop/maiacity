			const across = new three.Vector3().crossVectors(t, v3(0, 1, 0));
			if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
			across.normalize().multiplyScalar(side);
