		const toe = (leg[0] === "F" ? J.fore : J.hind)[4];
		for (const dx of [-.011, .011]) parts.push({
			geo: egg([
				toe[0] * side + dx,
				.017,
				toe[2] - .017
			], [
				.012,
				.018,
				.026
			], [
				-.25,
				0,
				0
			]),
			color: "#2b2622",
			bone: `foot${leg}`
		});
	}
	parts.push({
		geo: spike([
			0,
			.745,
			.815
		], [
			0,
			-.4,
			1
		], .004, .004),
		color: L.nose,
		bone: "head"
	});
	const r = rig(q.bones, parts, animalMaterials(.95));
	r.object.name = `sheep-${breed}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: SHEEP_BREEDS.indexOf(breed) + 11,
			gaits: {
				walk: {
					speed: .6,
					stride: .62,
					duty: .68,
					feet: {
						HL: 0,
						FL: .25,
						HR: .5,
						FR: .75
					},
					lift: .07,
					bob: .012,
					roll: .025,
					pitch: .012,
					tilt: .35,
					fold: [1, .45],
					flip: .7,
					nod: .05,
					flex: .02
				},
				trot: {
					speed: 1.6,
					stride: 1.1,
					duty: .42,
					feet: {
						HL: 0,
						FR: 0,
						FL: .5,
						HR: .5
					},
					lift: .09,
					bob: .025,
					roll: .02,
					pitch: .015,
					tilt: .5,
					fold: [1.4, .7],
					flip: 1,
					nod: .03,
					flex: .03
				}
			},
			tail: {
				sway: .12,
				carry: .3,
				hz: 1.4
			},
			ears: L.ears === "long" ? .25 : .45
		}),
		first: "graze",
		gears: {
			walk: .6,
			trot: 1.6
