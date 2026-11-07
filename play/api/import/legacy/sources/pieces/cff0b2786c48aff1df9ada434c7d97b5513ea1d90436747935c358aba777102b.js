	/** a part: its meshes, its card and how it is shown */
	const part = (info, objs, how = {}, parent = root) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
