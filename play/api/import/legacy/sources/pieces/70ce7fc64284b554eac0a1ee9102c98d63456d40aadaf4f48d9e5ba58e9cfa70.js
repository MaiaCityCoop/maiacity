	const face = new three.Mesh(new three.PlaneGeometry(1.68, 1.09), pvMat());
	face.rotation.x = -Math.PI / 2;
	face.position.y = .019;
	face.receiveShadow = true;
	p.add(face);
