//#piece c7be2821c5bba746c4d1f622f8338ea9240fbd55583fb8b51cdc81659f6e2cf2
	id: "clover-lawn",
	label: "Clover lawn",
	note: "A living mulch walked on: white and red clover, wild strawberries spreading by their runners, short grass, a daisy here and there.",
	from: "Paths’ edges and the squares",
	surface: {
		green: 10,
		soil: .3
	},
	density: 9,
	cover: [
		{
			kind: "clover",
			share: 6,
			colony: 3,
			spread: .6
		},
		{
			kind: "strawberry",
			share: 4,
			colony: 3,
			spread: .45
		},
		{
			kind: "grass",
			share: 4,
			colony: 4,
			spread: .6
		},
		{
			kind: "daisy",
			share: 2,
			colony: 2.5,
			spread: .3
//#piece e15955c48eaaff258048c94e85036cd255df440dabdabf917f1f0f6a0e1abaf4
	id: "clover-lawn",
	label: "Clover lawn",
	...floor("clover-lawn")
//#piece b80e4981920390036d77cfb3e8e92760f3476e83a4e8ea6296f1d10e616b7bac
