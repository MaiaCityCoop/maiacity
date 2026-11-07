		const toe = (leg[0] === "F" ? J$3.fore : J$3.hind)[4];
		for (const dx of [-.01, .01]) parts.push({
			geo: egg([
				toe[0] * side + dx,
				.016,
				toe[2] - .016
			], [
				.011,
				.017,
				.025
			], [
				-.25,
				0,
				0
			]),
			color: "#2c2723",
			bone: `foot${leg}`
		});
	}
	const r = rig(q.bones, parts, animalMaterials(.85));
	r.object.name = `goat-${breed}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: GOAT_BREEDS.indexOf(breed) + 21,
			gaits: {
				walk: {
					speed: .65,
					stride: .7,
					duty: .66,
					feet: {
						HL: 0,
						FL: .25,
						HR: .5,
						FR: .75
					},
					lift: .08,
					bob: .012,
					roll: .02,
					pitch: .012,
					tilt: .35,
					fold: [1.1, .5],
					flip: .7,
					nod: .06,
					flex: .02
				},
				trot: {
					speed: 1.8,
					stride: 1.2,
					duty: .4,
					feet: {
						HL: 0,
						FR: 0,
						FL: .5,
						HR: .5
					},
					lift: .1,
					bob: .025,
					roll: .02,
					pitch: .015,
					tilt: .5,
					fold: [1.5, .75],
					flip: 1,
					nod: .03,
					flex: .03
				}
			},
			tail: {
				sway: .25,
				carry: -.35,
				hz: 3.2
			},
			ears: L.ears === "long" ? .2 : .5
		}),
		first: "graze",
		gears: {
			walk: .65,
			trot: 1.8
