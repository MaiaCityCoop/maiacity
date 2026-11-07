		bone: "bucket"
	});
	return out;
}
/** The rams: a barrel on one part, a rod on the other, each reaching most of the way to the other pin. */
/** @param {Record<string, Ram>} rams @returns {Piece[]} */
function ramParts(rams) {
	return Object.entries(rams).flatMap(([name, ram]) => {
		const A = new three.Vector3(...ram.a), B = new three.Vector3(...ram.b);
		const len = A.distanceTo(B), dir = B.clone().sub(A).normalize();
		const barrelEnd = A.clone().addScaledVector(dir, len * .62).toArray();
		const rodEnd = B.clone().addScaledVector(dir, -len * .75).toArray();
		return [{
			geo: limb(ram.a, barrelEnd, ram.r, ram.r),
