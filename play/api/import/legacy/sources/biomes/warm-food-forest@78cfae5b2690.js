//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "warm-food-forest",
	label: "Food forest under glass",
	note: "The warm forest garden inside a dome: moist, shaded, never bare — big fallen leaves of banana, mango and fig over dark humus, moss where it stays damp, ferns in the shade of the palms, a living mat of clover, wild strawberries and soft grass where the light comes through the glass.",
	from: "Sandbox 4, inside the domes",
	surface: {
		green: 4,
		litter: 3,
		humus: 2,
		moss: 1.5
	},
	density: 7,
	cover: [
		{
			kind: "grass",
			share: 4,
			colony: 4,
			spread: .55,
			on: "green"
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
			share: 4,
			colony: 3,
			spread: .4,
			on: "green"
		},
		{
			kind: "woodsorrel",
			share: 3,
			colony: 3,
			spread: .3,
			on: "humus"
		},
		{
			kind: "fern",
			share: 4,
			colony: 4,
			spread: .4,
			on: "humus",
			fill: .12
		},
		{
			kind: "moss",
			share: 3,
			colony: 3,
			spread: .45,
			on: "moss",
			fill: .18
		},
		{
			kind: "litter",
			share: 5,
			colony: 5,
			spread: .6,
			on: "litter",
			fill: .12
		},
		{
			kind: "forgetmenot",
			share: 1,
			colony: 2,
			spread: .2
		},
		{
			kind: "mushrooms",
			share: .6,
			colony: 5,
			spread: .25,
			on: "humus",
			fill: .008
		},
		{
			kind: "stones",
			share: .3,
			colony: 8,
			spread: .2,
			fill: .004
//#piece e15955c48eaaff258048c94e85036cd255df440dabdabf917f1f0f6a0e1abaf4
	id: "warm-food-forest",
	label: "Food forest under glass",
	...floor("warm-food-forest")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
