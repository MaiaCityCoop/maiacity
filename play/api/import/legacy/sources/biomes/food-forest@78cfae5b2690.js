//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "food-forest",
	label: "Food forest floor",
	note: "A forest garden’s floor, its soil covered on purpose: a living mulch of clover, wild strawberries and grasses in the light between the plants, leaf litter and moss under the trees, ferns and wood anemones in the shade, a fallen branch now and then.",
	from: "Sandbox 4",
	surface: {
		green: 5,
		litter: 3,
		humus: 1,
		moss: 1
	},
	density: 7,
	cover: [
		{
			kind: "grass",
			share: 6,
			colony: 5,
			spread: .7,
			on: "green"
		},
		{
			kind: "tallgrass",
			share: 2,
			colony: 4,
			spread: .35,
			on: "green",
			fill: .4
		},
		{
			kind: "clover",
			share: 3,
			colony: 3,
			spread: .35,
			on: "green"
		},
		{
			kind: "strawberry",
			share: 3,
			colony: 3,
			spread: .35,
			on: "green"
		},
		{
			kind: "daisy",
			share: 2,
			colony: 2.5,
			spread: .25,
			on: "green"
		},
		{
			kind: "buttercup",
			share: 2,
			colony: 3,
			spread: .25,
			on: "green"
		},
		{
			kind: "cranesbill",
			share: 1,
			colony: 3,
			spread: .2,
			on: "green"
		},
		{
			kind: "forgetmenot",
			share: 1,
			colony: 2,
			spread: .2
		},
		{
			kind: "litter",
			share: 5,
			colony: 6,
			spread: .6,
			on: "litter",
			fill: .12
		},
		{
			kind: "moss",
			share: 3,
			colony: 3,
			spread: .4,
			on: "moss",
			fill: .165
		},
		{
			kind: "anemone",
			share: 3,
			colony: 3.5,
			spread: .25,
			on: "litter"
		},
		{
			kind: "fern",
			share: 2,
			colony: 5,
			spread: .3,
			on: "humus",
			fill: .08
		},
		{
			kind: "mushrooms",
			share: .4,
			colony: 6,
			spread: .2,
			on: "humus",
			fill: .006
		},
		{
			kind: "deadwood",
			share: .4,
			colony: 8,
			spread: .3,
			on: "litter",
			fill: .0018
		},
		{
			kind: "stones",
			share: .3,
			colony: 8,
			spread: .2,
			fill: .004
//#piece e15955c48eaaff258048c94e85036cd255df440dabdabf917f1f0f6a0e1abaf4
	id: "food-forest",
	label: "Food forest floor",
	...floor("food-forest")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
