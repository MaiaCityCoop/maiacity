			seed: CHICKEN_KINDS.indexOf(kind) + 41,
			gaits: { walk: {
				speed: chick ? .25 : .45,
				stride,
				duty: .62,
				feet: {
					L: 0,
					R: .5
				},
				lift: .035 * k,
				bob: .006 * k,
				roll: .05,
				pitch: .02,
				tilt: .5,
				fold: 1.2,
				curl: 1.1,
				hold: .68
			} },
			wag: .06
		}),
		first: "walk",
		gears: { walk: chick ? .25 : .45 },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/species/fish.ts
const FISH_KINDS = [
	"koi",
	"kohaku",
	"ogon",
	"carp",
	"nile",
	"redtilapia"
];
const SPINE = [
	"head",
	"body1",
	"body2",
	"body3",
	"body4",
	"tail",
	"fin"
];
/** a fish `len` long, its middle at height y */
function fish(kind = "koi", len, y = .15) {
	const tilapia = kind === "nile" || kind === "redtilapia";
	const L = len ?? (tilapia ? .26 : .36);
	const Z = (k) => L * k;
	const at = [
		.3,
		.17,
		.04,
		-.09,
		-.21,
		-.33,
		-.42
	];
	const bones = [
		...SPINE.map((name, i) => ({
			name,
			parent: i ? SPINE[i - 1] : void 0,
			at: [
				0,
				y,
				Z(at[i])
			]
		})),
		{
			name: "pectL",
			parent: "head",
			at: [
				L * .06,
				y - L * .06,
				Z(.22)
			]
		},
		{
			name: "pectR",
			parent: "head",
			at: [
				-L * .06,
				y - L * .06,
				Z(.22)
			]
		}
	];
	const deep = tilapia ? 1.18 : 1;
	const s = sculpt(bones);
	s.egg([
		0,
		y,
		Z(.02)
	], [
		L * .075,
		L * .125 * deep,
		L * .4
	], {
		chain: [
			"head",
			"body1",
			"body2",
			"body3",
			"body4",
			"tail"
		],
		tag: "body"
	});
	s.egg([
		0,
		y - L * .005,
		Z(.27)
	], [
		L * .068,
		L * .1 * deep,
		L * .15
	], {
		bone: "head",
		k: L * .06,
		tag: "head"
	});
	s.egg([
		0,
		y,
		Z(-.34)
