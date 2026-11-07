	const m = new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(UP, facing.clone().normalize()), v3(1, 1, 1));
