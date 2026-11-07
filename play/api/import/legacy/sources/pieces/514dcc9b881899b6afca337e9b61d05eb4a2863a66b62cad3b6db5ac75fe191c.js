	layer: l.id,
	params: paramsOf(p)
}))), "grow", HISTORY).map((p) => ({
	...p,
	versions: p.versions.map((ver) => typeof ver.build === "function" ? {
		...ver,
		build: detailed(ver.build, p.stages.length - 1)
	} : ver)
})))();

//#endregion
