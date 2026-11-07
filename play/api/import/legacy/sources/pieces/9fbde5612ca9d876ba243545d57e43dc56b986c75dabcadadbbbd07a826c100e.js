	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
