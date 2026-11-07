	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps: STEPS,
		sources: SOURCES
	});
	const m = (geo, mat) => kit.mesh(geo, mat);
