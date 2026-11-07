function euroPallet(add, at, yaw, bone, { stack = 1.6 } = {}) {
	const place = new three.Matrix4().makeTranslation(...at).multiply(new three.Matrix4().makeRotationY(yaw));
	/** @type {Add} */
	const put = (geo, color, b, mat) => add(geo.applyMatrix4(place), color, b, mat);
	for (const [bz, w] of [
		[-.3275, .145],
		[-.16, .1],
		[0, .145],
		[.16, .1],
		[.3275, .145]
