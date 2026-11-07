		...unit ? { unit } : {}
	}, base, make);
	/** an outline (mm, the pack's x and y) drawn up from z0, h high, as one prism */
	const prism = (draw, z0, h) => {
		const shape = new three.Shape();
		draw(shape);
		const g = new three.ExtrudeGeometry(shape, {
