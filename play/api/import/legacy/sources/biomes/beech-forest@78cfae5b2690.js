//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "beech-forest",
	label: "Beech forest",
	note: "Under closed beech: deep brown leaf litter over dark humus, little grass; the herbs in carpets — wood anemone, woodruff, wood sorrel, ramsons where it is damp — ferns in groups, moss on deadwood and stones, mushrooms after rain.",
	from: "The forests round the cell",
	surface: {
		litter: 7,
		humus: 2,
		moss: 1
	},
	density: 6,
	cover: [
		{
			kind: "litter",
			share: 6,
			colony: 8,
			spread: .75,
			on: "litter",
			fill: .12
		},
		{
			kind: "anemone",
			share: 5,
			colony: 4,
			spread: .3
		},
		{
			kind: "woodruff",
			share: 5,
			colony: 4,
			spread: .3
		},
		{
			kind: "woodsorrel",
			share: 4,
			colony: 3,
			spread: .3
		},
		{
			kind: "ramsons",
			share: 6,
			colony: 6,
			spread: .18,
			on: "humus"
		},
		{
			kind: "fern",
			share: 3,
			colony: 6,
			spread: .3,
			fill: .08
		},
		{
			kind: "sedge",
			share: 1.5,
			colony: 5,
			spread: .25,
			fill: .15
		},
		{
			kind: "moss",
			share: 3,
			colony: 3,
			spread: .35,
			on: "moss",
			fill: .165
		},
		{
			kind: "deadwood",
			share: 1,
			colony: 9,
			spread: .35,
			fill: .0018
		},
		{
			kind: "stones",
			share: .6,
			colony: 9,
			spread: .25,
			fill: .004
		},
		{
			kind: "mushrooms",
			share: .8,
			colony: 7,
			spread: .25,
			on: "humus",
//#piece 2883e8de1054c574c380bce7a746a8a78bc111ba3ac04f7ad8237abab69caded
	id: "beech-forest",
	label: "Beech forest",
	...floor("beech-forest")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
