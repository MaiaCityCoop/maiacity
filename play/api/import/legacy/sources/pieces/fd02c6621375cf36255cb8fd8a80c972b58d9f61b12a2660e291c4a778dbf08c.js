*/
function face(at, x, up) {
	const X = x.clone().normalize();
	let Z = new three.Vector3().crossVectors(X, up);
	if (Z.lengthSq() < 1e-8) Z = new three.Vector3().crossVectors(X, Math.abs(X.y) < .9 ? UP : v3(1, 0, 0));
	Z.normalize();
	const Y = new three.Vector3().crossVectors(Z, X).normalize();
	return new three.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}
/**
//#piece 408de3b868c11704be02c6275e9a95c0d707a1f526447b97e3df39050ad9e09f
