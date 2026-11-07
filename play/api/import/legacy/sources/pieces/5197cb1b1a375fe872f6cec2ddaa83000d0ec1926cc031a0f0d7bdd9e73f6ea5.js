	const r = o.r;
	const turn = r() * Math.PI * 2;
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), o.dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(UP, turn)), v3(1, 1, 1));
