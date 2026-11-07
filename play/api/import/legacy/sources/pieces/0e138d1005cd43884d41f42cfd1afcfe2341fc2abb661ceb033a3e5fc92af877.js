			-.6 * Math.sin(Math.PI * air),
			x * .2 * Math.sin(Math.PI * air),
			0
		];
		return pose;
	};
	return {
		rig: r,
		clips: {
			idle,
			croak,
			hop
		},
		first: "idle",
		gears: { hop: .4 * k }
	};
}

//#endregion
//#region src/lib/actors/plans/quadruped.ts
