function bloom(bag, kind, at, facing, size, open, fall) {
	const m = new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), facing.clone().normalize()), v3(size, size, size));
	const turn = (a, up) => new three.Matrix4().makeRotationY(-a).multiply(new three.Matrix4().makeRotationZ(up));
	const sepals = kind.sepals ?? 10;
	for (let k = 0; k < sepals; k++) {
		const sepal = sheet({
			length: (kind.sepal ?? .008) * (sepals > 6 && k % 2 ? .75 : 1),
			width: (kind.sepal ?? .008) * .22,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)) * (1 - u * .6),
			lift: (u) => -.15 * u,
			paint: () => kind.sepalColour ?? "#5f8f34",
			along: 6,
			across: 2
		});
		bag.add("sheet", sepal, m.clone().multiply(turn(k / sepals * Math.PI * 2 + .3, -(kind.sepalBack ?? .25) * lerp(.3, 1, open))));
	}
	if (fall < 1) {
		const shape = kind.shape ?? ((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .55));
		for (let k = 0; k < kind.petals; k++) {
			const petal = sheet({
				length: kind.length * lerp(.4, 1, open),
				width: kind.width * lerp(.4, 1, open),
				shape,
				lift: (u, v) => .12 * u * u + .04 * v * v,
				paint: (u) => mix(kind.colour, "#fffdf6", kind.colour.startsWith("#f") ? u * .4 : 0),
				along: 10,
				across: 6
			});
			const up = lerp(1.25, .12 - (kind.flat ?? 0), open) - fall * .9;
			bag.add("sheet", petal, m.clone().multiply(new three.Matrix4().makeTranslation(0, 6e-4, 0)).multiply(turn(k / kind.petals * Math.PI * 2, up)).multiply(new three.Matrix4().makeScale(1 - fall * .6, 1, 1 - fall * .6)));
		}
	}
	if (kind.cone) {
		bag.add("body", bead(v3(0, .003, 0).applyMatrix4(m), v3(.0018, .0042, .0018).multiplyScalar(size), fall > .5 ? "#a99a3a" : kind.heart, 6));
		return;
	}
