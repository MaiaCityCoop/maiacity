	const g = new three.CylinderGeometry(s, s, h, 6).translate(0, h / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()));
