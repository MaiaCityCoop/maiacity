	const parts = [{ skin: s.skin(.0056, paint, `rabbit-${coat}`) }];
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base3 = [
			x * .018,
			.2,
			.112
		];
		const len = L.lop ? .12 : .105;
		const dir = L.lop ? new three.Vector3(x * .55, -1, .1).normalize() : new three.Vector3(x * .18, 1, -.35).normalize();
		const mid = new three.Vector3(...base3).addScaledVector(dir, len * .5);
		const q4 = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), dir);
		const rot = new three.Euler().setFromQuaternion(q4);
		const out = egg([
			mid.x,
			mid.y,
			mid.z
		], [
			.024,
			len * .5,
			.008
		], [
			rot.x,
			rot.y,
			rot.z
		]);
		const inner = egg([
			mid.x + dir.z * 0,
			mid.y,
			mid.z + (L.lop ? 0 : .004)
		], [
			.016,
			len * .43,
			.006
		], [
			rot.x,
			rot.y,
			rot.z
		]);
		const tip = coat === "wild" ? "#4a3a2c" : L.coat;
		parts.push({
			geo: out,
			color: (pp) => pp.distanceTo(new three.Vector3(...base3)) > len * .85 ? tip : L.coat,
			bone: `ear${side}`
		});
		parts.push({
			geo: inner,
			color: coat === "black" || coat === "dutch" ? "#3a2f2c" : "#e2b4a8",
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.034,
		.176,
		.148
	], .0085, [
		.9,
		.18,
		.35
	], L.iris, "round", "head", {
		irisR: .82,
		pupilR: .5
	}));
	parts.push({
		geo: egg([
			0,
			.158,
			.2
		], [
			.006,
			.004,
			.003
		]),
		color: "#c98f86",
		bone: "head"
	});
	const r = rig(q.bones, parts, animalMaterials(.9));
	r.object.name = `rabbit-${coat}`;
	return {
		rig: r,
		clips: moves(q, {
			seed: RABBIT_COATS.indexOf(coat) + 31,
			gaits: { hop: {
				speed: .55,
				stride: .3,
				duty: .32,
				feet: {
					FL: 0,
					FR: .08,
					HL: .42,
					HR: .45
				},
				lift: .035,
				bob: .03,
				roll: 0,
				pitch: .12,
				tilt: .7,
				fold: [.6, .35],
				flip: .6,
				nod: .03,
				flex: .18,
				bobs: 1
			} },
			tail: {
				sway: .05,
				carry: -.2,
				hz: 2
			},
			ears: L.lop ? .15 : .6
		}),
		first: "idle",
		gears: { hop: .55 },
