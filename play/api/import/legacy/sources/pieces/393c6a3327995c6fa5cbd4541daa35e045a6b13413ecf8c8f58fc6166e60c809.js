		g.applyMatrix4(new three.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new three.Vector3(1, 1, 1)));
		return T(g);
	};
