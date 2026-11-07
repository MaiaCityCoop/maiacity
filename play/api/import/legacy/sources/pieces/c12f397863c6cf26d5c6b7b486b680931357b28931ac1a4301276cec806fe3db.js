		const A = new three.Vector3(...ram.a), B = new three.Vector3(...ram.b);
		const len = A.distanceTo(B);
		const dir = B.clone().sub(A).normalize();
		const barrelEnd = A.clone().addScaledVector(dir, len * .62);
		const rodEnd = B.clone().addScaledVector(dir, -len * .75);
