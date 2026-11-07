	let t = [];
	for (let n of e)
		for (let e of n.versions.filter((e) => e.kept))
			if (Array.isArray(e.build)) for (let r of e.build) t.push({ id: n.id, v: e.v, variant: r.id });
			else t.push({ id: n.id, v: e.v, variant: null });
	return t;
}
