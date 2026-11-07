	const x = dir.clone().normalize();
	let z = new three.Vector3().crossVectors(x, UP);
	if (z.lengthSq() < 1e-8) z = v3(0, 0, 1);
	z.normalize();
//#piece f9ec5da0a1eba605c895127bdc1c6550a20f1704c387fdd16070adff6d40fa2c
