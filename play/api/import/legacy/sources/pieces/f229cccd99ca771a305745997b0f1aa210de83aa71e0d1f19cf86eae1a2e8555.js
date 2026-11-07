			const m = (p) => s === "L" ? p : mirror$1(p);
			return [
				{
					name: `wing${s}`,
					parent: "body",
					at: m(j.wing)
				},
				{
					name: `thigh${s}`,
					parent: "body",
					at: m(j.leg[0])
				},
				{
					name: `shank${s}`,
					parent: `thigh${s}`,
					at: m(j.leg[1])
				},
				{
					name: `tarsus${s}`,
					parent: `shank${s}`,
					at: m(j.leg[2])
				},
				{
					name: `toes${s}`,
					parent: `tarsus${s}`,
					at: m(j.leg[3])
				}
			];
		})
	];
	return {
		bones,
		j,
		neck,
		sk: skeleton(bones),
		toe: {
			L: j.leg[4],
			R: mirror$1(j.leg[4])
		}
	};
}
/** Both legs to their feet: on the ground where the gait (or `plant`) puts them, the body as `pose` has it. */
