//#piece a78bc772c161519da0f53c3e488e6ba88bf2a8e96aee923f3072b69968961145
const ellipse = (u) => Math.pow(Math.sin(Math.PI * u), .6) * (u < .05 ? u / .05 : 1);
//#piece fd0443eab57b6f99fce25c6b93fdae43e0beabbf16ed70f6a3cd05c7e6e01fee
const PIP = /* @__PURE__ */ (() => ({
	size: v3(.004, .0022, .002),
	coat: "#5a3a22",
	shade: "#3a2414",
	depth: .01
}))();
const PEAR_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Pip",
		0,
		"A black teardrop pip, chilled through the winter, a centimetre down."
	],
	[
		"Germination",
		20,
		"The radicle goes down, the seed leaves lift out of the soil."
	],
	[
		"Seedling",
		35,
		"Two oval seed leaves and the first glossy true leaves."
	],
	[
		"Sapling",
		365,
		"An upright whip, its branches steep."
	],
	[
		"Young tree",
		1600,
		"A tall narrow crown, spurs on its outer branches."
	],
	[
		"Blossom",
		2200,
		"White blossom with dark red anthers in clusters, early in the spring."
	],
	[
		"Fruit set",
		2215,
		"Little green pears on their stalks, the calyx still on their tips."
	],
	[
		"Green pears",
		2270,
		"The pears lengthen and fill, narrow at the stalk, broad below."
	],
	[
		"Colouring",
		2320,
		"Green turns to yellow, a russet blush on the sunny side."
	],
	[
		"Ripe",
		2340,
		"Yellow pears with a red cheek: picked hard, they soften indoors."
	]
]))();
const pear = /* @__PURE__ */ (() => orchard({
	seed: PIP,
	hypogeal: false,
	cotyledon: {
		length: .012,
		width: .005,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: 1,
		scaffolds: [3, 4],
		scaffoldAngle: .5,
		up: .06,
		droop: .03,
		spread: .45,
		radius: .13,
		bark: ["#6a5a4a", "#4a4038"]
	}),
	roots: {
		tap: 1.5,
		spread: 2,
		count: 16,
		radius: .04
	},
	leaf: {
		length: .075,
		width: .05,
		shape: ellipse,
		colour: "#2f5f2a",
		young: "#8ab45a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: {
			...rosy("#fbfbf6", .015),
			stamenColour: "#8a1a2a"
		},
		size: 1.2,
		opens: 4.5,
		sites: "spurs",
		chance: 1.6,
		per: [4, 6]
	},
	fruit: {
		length: .11,
		width: .035,
		stalk: .035,
		keep: [1, 2],
		setFor: 1.9,
		ripeFrom: 2.8,
		ripeFor: 1,
		gloss: false,
		calyx: "#4a3a2a",
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .45) * (.42 + .58 * Math.pow(clamp(u * 1.25), 1.6)),
		colour: (ripe, u, v) => ripening("#8ab04a", "#c8c858", "#e8cf5a")(ripe).lerp(new three.Color("#b8603a"), clamp(ripe * 1.2 - .3) * .6 * Math.max(0, Math.cos(v * Math.PI * 2))).lerp(new three.Color("#9a7a4a"), Math.pow(Math.abs(Math.sin(u * 50 + v * 40)), 30) * .4)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "pear",
	label: "Pear",
	latin: "Pyrus communis · Birne",
	note: "An upright narrow crown; white blossom with dark red anthers, pears narrow at the stalk and round below, yellowing with a russet cheek.",
	from: "Tree · 6 years",
	stages: PEAR_STAGES,
	grow: pear
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
