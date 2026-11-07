	const id = (s) => `${prefix}${s}`;
	/** @param {Group} g @param {Omit<import('./parts.js').PartInfo, 'assembly' | 'step'>} info @param {string} joint @param {(put: (geo: THREE.BufferGeometry, color: string, mat?: number) => void) => void} make */
	const part = (g, info, joint, make) => kit.part({
		...info,
		id: id(info.id),
		assembly: assembly(g),
		step: step(g),
		...unit ? { unit } : {}
	}, joint, make);
	part("frame", {
		id: "skids",
		label: "Power Cube base skids (4×4 tube)",
		count: 2,
