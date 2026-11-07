		const p = (leg[0] === "F" ? j.fore : j.hind)[4];
		return [leg, leg[1] === "L" ? p : mirror(p)];
	}));
	return {
		bones,
		j,
		tail,
		sk: skeleton(bones),
		toe
	};
}
/** The legs of a quadruped standing or walking: every leg to where its hoof is (the root and body as `pose` has them). */
