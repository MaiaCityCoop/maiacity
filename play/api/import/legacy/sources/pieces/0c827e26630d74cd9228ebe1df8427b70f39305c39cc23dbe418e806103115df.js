		{
			name: `upperArm${s}`,
			parent: "chest",
			at: [
				x * .19,
				1.45,
				-.01
			]
		},
		{
			name: `forearm${s}`,
			parent: `upperArm${s}`,
			at: [
				x * .2,
				1.17,
				-.02
			]
		},
		{
			name: `hand${s}`,
			parent: `forearm${s}`,
			at: [
				x * .205,
				.915,
				0
			]
		},
		{
			name: `thigh${s}`,
			parent: "hips",
			at: [
				x * .095,
				.93,
				0
			]
		},
		{
			name: `shin${s}`,
			parent: `thigh${s}`,
			at: [
				x * .1,
				.5,
				.01
			]
		},
		{
			name: `foot${s}`,
			parent: `shin${s}`,
			at: [
				x * .1,
				.085,
				-.005
			]
		}
	])
])();
