		const a = arm.map((p) => m(p, x)), l = leg.map((p) => m(p, x));
		s.cone(a[0], a[1], .007 * k, .0055 * k, {
			bone: `arm${side}`,
			k: .006 * k,
			tag: "limb"
		});
		s.cone(a[1], a[2], .0055 * k, .0045 * k, {
			bone: `forearm${side}`,
			k: .004 * k,
			tag: "limb"
		});
		s.cone(l[0], l[1], .013 * k, .009 * k, {
			bone: `thigh${side}`,
			k: .01 * k,
			tag: "limb"
		});
		s.cone(l[1], l[2], .008 * k, .0055 * k, {
			bone: `shin${side}`,
			k: .006 * k,
			tag: "limb"
		});
		s.cone(l[2], l[3], .0048 * k, .004 * k, {
			bone: `tarsus${side}`,
			k: .004 * k,
			tag: "limb"
		});
	}
	const look = {
		bullfrog: {
			back: "#5e6a32",
			head: "#6f8a3a",
			spots: "#3a3a22",
			belly: "#e8e0b8"
		},
		green: {
			back: "#7a9a42",
			head: "#8fb04a",
			spots: "#4a5e2a",
			belly: "#efe8c4"
		},
		common: {
			back: "#8a7048",
			head: "#8a7048",
			spots: "#3a2c1e",
			belly: "#e6d8b8"
