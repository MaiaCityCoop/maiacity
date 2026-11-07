	const parts = [];
	/** @type {Add} */
	const add = (geo, color, bone, mat) => void parts.push({
		geo,
		color,
		bone,
		...mat ? { mat } : {}
	});
