			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * w.x,
				w.y,
				w.sprocket
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * w.x,
				w.y,
				w.idler
//#piece be909fd7173afd0698da32dc285fea9564c36fc0106ab4b23de6ec70cfd4f674
		...Object.entries(spec.rams).flatMap(([name, ram]) => [{
//#piece 127c44d0acc8ef217bdcd66e82bf26f5ac29625a798f18943195f727533ecfb5
	const r = rig(bones, spec.parts(), [skin(.5, { side: three.DoubleSide }), ...spec.materials ?? []]);
	r.object.name = spec.name;
	const { tucked, reach, curled, lifted, dump } = spec.poses;
	const slew = spec.slew ?? 1.4, period = spec.period ?? 9, speed = spec.speed ?? .6;
	/** @param {Joints} j */
