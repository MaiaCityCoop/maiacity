//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "spruce-forest",
	label: "Spruce forest",
	note: "Under spruce: a floor of needles, thick moss carpets over it, blueberry in the gaps, ferns, fallen twigs and branches, stones mossed over, mushrooms.",
	from: "The forests round the cell",
	surface: {
		needles: 6,
		moss: 4,
		humus: 1
	},
	density: 6,
	cover: [
		{
			kind: "moss",
			share: 7,
			colony: 5,
			spread: .6,
			on: "moss",
			fill: .193
		},
		{
			kind: "blueberry",
			share: 5,
			colony: 5,
			spread: .4
		},
		{
			kind: "fern",
			share: 2,
			colony: 6,
			spread: .3,
			fill: .08
		},
		{
			kind: "woodsorrel",
			share: 2,
			colony: 3,
			spread: .25,
			on: "moss"
		},
		{
			kind: "deadwood",
			share: 1.2,
			colony: 8,
			spread: .4,
			on: "needles",
			fill: .0018
		},
		{
			kind: "stones",
			share: 1,
			colony: 8,
			spread: .3,
			fill: .004
		},
		{
			kind: "mushrooms",
			share: 1,
			colony: 6,
			spread: .3,
//#piece 2883e8de1054c574c380bce7a746a8a78bc111ba3ac04f7ad8237abab69caded
	id: "spruce-forest",
	label: "Spruce forest",
	...floor("spruce-forest")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
