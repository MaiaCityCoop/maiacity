	const r = rig(bones, parts, [skin(.45, { side: three.DoubleSide }), skin(.06, {
		transparent: true,
		opacity: .3,
		depthWrite: false
	})]);
	r.object.name = kind === "people" ? "pod (people)" : "pod (goods)";
	/** @param {Parameters<typeof at>[1]} s */
