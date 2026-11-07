	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone */
	const add = (geo, color, bone) => out.push({
		geo,
		color,
		bone
	});
