//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "meadow",
	label: "Meadow",
	note: "Open and sunny: grasses tall and short, buttercups, daisies, red clover and cranesbill in drifts, now and then a patch of bare soil.",
	from: "The open ground round the forests",
	surface: {
		green: 9,
		soil: .6,
		moss: .4
	},
	density: 10,
	cover: [
		{
			kind: "grass",
			share: 8,
			colony: 6,
			spread: .8
		},
		{
			kind: "tallgrass",
			share: 6,
			colony: 5,
			spread: .6
		},
		{
			kind: "buttercup",
			share: 3,
			colony: 4,
			spread: .35
		},
		{
			kind: "daisy",
			share: 3,
			colony: 3,
			spread: .3
		},
		{
			kind: "clover",
			share: 3,
			colony: 3,
			spread: .35
		},
		{
			kind: "cranesbill",
			share: 2,
			colony: 4,
			spread: .3
		},
		{
			kind: "forgetmenot",
			share: .6,
			colony: 2,
			spread: .15
//#piece e15955c48eaaff258048c94e85036cd255df440dabdabf917f1f0f6a0e1abaf4
	id: "meadow",
	label: "Meadow",
	...floor("meadow")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
