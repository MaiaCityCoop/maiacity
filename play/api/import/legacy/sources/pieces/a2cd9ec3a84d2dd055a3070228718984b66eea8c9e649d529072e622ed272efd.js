	const m = new three.Mesh(new three.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
	m.position.copy(a).add(b).multiplyScalar(.5);
	m.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	m.castShadow = true;
