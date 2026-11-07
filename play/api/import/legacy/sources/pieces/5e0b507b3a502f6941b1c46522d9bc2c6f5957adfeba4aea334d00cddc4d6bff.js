		])
	}, {
		name: `${name}Lift`,
		parent: name,
		at: to([
			0,
			TINE_Y,
			-2e3
		])
	}, {
		name: `${name}Forks`,
		parent: `${name}Lift`,
		at: to([
			0,
			TINE_Y,
			0
		])
	});
	/** @type {Add} */
	const put = (geo, color, bone, mat) => add(geo.applyMatrix4(m), color, bone, mat);
	const body = `${name}Body`, forks = `${name}Forks`;
	put(block(.76, .36, .86, [
		0,
		.29,
		-.52
