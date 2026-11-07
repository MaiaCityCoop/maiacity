//#piece bedb8b1047cc45ff6759d3328807a20a21893cc12b455a70a94c19bf9282642f
//#piece df665bccd53464841fffc45b7cf3b2ddc7fb169fc8245692b7227496de1d9407
//#piece 8582fa4898a2887ea9109e7d53018bdb8f64a64356aa2c1c6e8162b13c8e8d07
//#piece 140a6b02845939e1b8faeb5b72c632b51b1eacea59a04f2d1e96a489d29650d6
//#piece 2a6ad0386ff69cdbb548c456e3f68c48286274961d0c609bace6b370ea05f5de
//#region src/lib/plants/wald-canopy.js
//#piece 170a32a8b29eaa70bbcbf9ecf23bb290c114922b94243afc08cfa123ee0c386f
//#piece bbaac992bed6c61d2b8de27fdd4cd3656217b060beed8108f1f5d043c2b96840
}

//#endregion
//#region src/lib/plants/birch.js
const BIRCH_STAGES = /* @__PURE__ */ (() => [
	["Winged seed", 0],
	["Germination", 14],
	["Seedling", 35],
	["Sapling", 365],
	["Young birch", 1095],
	["Catkins", 1825],
	["Seed set", 1840],
	["Green catkins", 1880],
	["Golden leaves", 1920],
	["Winged seeds", 1950]
].map(([name, day]) => ({
	name: String(name),
	day: Number(day),
	note: "A silver birch grows from the same seed through this stage."
})))();
const birch = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.0012, 4e-4, .001),
		coat: "#ab8b50",
		shade: "#715a33",
		depth: .001
	},
	hypogeal: false,
	cotyledon: {
		length: .004,
		width: .0025,
		colour: "#86ab52"
	},
	roots: {
		tap: 1.2,
		spread: 3,
		count: 8,
		radius: .045
	},
	flush: {
		trunk: 1.8,
		trunkBorn: 1.6,
		trunkFlush: 1.2,
		scaffolds: [3, 5],
		scaffoldAngle: .32,
		gens: 6,
		flush: .16,
		rest: .08,
		shoot: (gen) => [
			0,
			2.3,
			1.5,
			1,
			.75,
			.55,
			.4
		][gen] ?? .3,
		whorl: [2, 3],
		spread: .5,
		up: .12,
		droop: .2,
		wander: .09,
		radius: .09,
		taper: .62,
		thicken: 3,
		bark: ["#eee9df", "#d6d3ca"]
	},
	leaf: {
		blade: {
			stalk: .018,
			length: .055,
			width: .034,
			shape: (u) => Math.pow(Math.sin(Math.PI * u), .7) * (1 - .5 * u) * (1 + .05 * Math.sin(u * 70)),
			along: 4,
			bow: .04
		},
		colour: "#659345",
		young: "#a0be5e",
		autumn: "#d8b946",
		droop: .2,
		gap: .14,
		per: 2,
		twig: .1,
		tuft: 2,
		from: 3,
		inner: 2
	},
	bear({ bag, g, seed, shoots }) {
		for (const sh of shoots.filter((x) => x.gen >= 4)) {
			if (chance(seed, "catkin", ...sh.key)() > .12) continue;
			const k = span(g, 4.8, 6);
			if (k <= 0) continue;
			const at = sh.tip.clone(), end = at.clone().add(v3(.012, -.06 * k, .008));
			bag.add("body", tube([at, end], () => .004 * k, () => "#a18b46", 5));
		}
	}
}))();
//#piece d2dc349e1f1f0bd6d0a674965d7ef2507a466222eb9173b0f8849f0f0cad7122
	id: "birch",
	label: "Silver birch · Birke",
	latin: "Betula pendula",
	note: "White bark, fine hanging twigs, pointed leaves and wind-borne seeds.",
	from: "Europe and temperate Asia",
	layer: "canopy",
	stages: BIRCH_STAGES,
	grow: birch
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
