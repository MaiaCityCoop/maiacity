	/** @param {MM} a @param {MM} b @param {number} r @param {number} [seg] @param {number} [r1] */
	const cyl = (a, b, r, seg = 18, r1 = r) => {
		const A = new three.Vector3(...L(...a)), B = new three.Vector3(...L(...b));
