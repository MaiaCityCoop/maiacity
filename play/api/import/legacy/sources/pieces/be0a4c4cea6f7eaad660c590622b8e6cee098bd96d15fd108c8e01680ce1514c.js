		return m({
			...tucked,
			blade,
			wheels: -dist / w.r,
			root: [
				0,
				0,
				dist
			]
		});
	};
	return {
		rig: r,
		clips,
		poses: {
			tucked: m(tucked),
			reaching: m(reach),
			curled: m(curled),
			rest: m({})
		},
		first: "dig"
	};
}

//#endregion
