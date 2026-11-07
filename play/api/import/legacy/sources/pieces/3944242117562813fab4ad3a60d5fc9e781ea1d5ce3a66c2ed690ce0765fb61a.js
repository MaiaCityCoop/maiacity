	let i = e.find((e) => e.id === t),
		a = i && (n === void 0 ? i.versions[i.versions.length - 1] : i.versions.find((e) => e.v === n));
	if (!i || !a) return;
	let o = a.build;
	if (Array.isArray(o) && o.every((e) => typeof e?.make == `function`)) {
		if (((o = (r ? o.find((e) => e.id === r) : o[0])?.make), !o)) return;
	} else if (r) return;
	return { item: i, version: a, build: o, kept: a.kept };
}
