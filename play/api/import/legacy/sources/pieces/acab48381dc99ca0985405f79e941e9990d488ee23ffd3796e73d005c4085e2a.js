	const side = new three.Vector3().crossVectors(p.dir, Math.abs(p.dir.y) > .9 ? v3(1, 0, 0) : v3(0, 1, 0)).normalize();
	side.applyAxisAngle(p.dir, r() * Math.PI * 2);
	if (side.y > .3) side.y *= -1;
