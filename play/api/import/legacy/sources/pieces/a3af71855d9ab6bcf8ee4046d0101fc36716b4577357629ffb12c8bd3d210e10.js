		for (const [dx, dz, len] of [
			[
				0,
				1,
				.062
			],
			[
				.55,
				.85,
				.05
			],
			[
				-.55,
				.85,
				.05
			],
			[
				0,
				-1,
				.026
			]
		]) {
			const tip = [
				toes[0] + x * dx * len * k * .7,
				.003 * k,
				toes[2] + dz * len * k
			];
			parts.push({
				geo: limb(toes, tip, .0045 * k, .0028 * k, { seg: 5 }),
				color: L.legs,
				bone: `toes${side}`
			});
		}
	}
	const r = rig(b.bones, parts, animalMaterials(.88));
	r.object.name = `chicken-${kind}`;
	const stride = .24 * (chick ? .45 : kind === "rooster" ? 1.1 : 1);
	return {
		rig: r,
