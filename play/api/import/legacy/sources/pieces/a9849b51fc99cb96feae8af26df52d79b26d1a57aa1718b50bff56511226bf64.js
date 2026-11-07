	const mats = animalMaterials(.85);
	mats[0].side = three.DoubleSide;
	const r = rig(bones, parts, mats);
	r.object.name = `bird-${kind}`;
	const seed = SONGBIRDS.indexOf(kind) + 61;
