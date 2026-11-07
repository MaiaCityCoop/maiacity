/** the ten stages of a herb grown from seed, its own words for the last ones */
const herbStages = (seedNote, later) => stages([
	[
		"Seed",
		0,
		seedNote
	],
	[
		"Germination",
		7,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		12,
		"Two small round seed leaves."
	],
	[
		"True leaves",
		21,
		"The first pair of true leaves, already smelling of the herb."
	],
	...later
]);
