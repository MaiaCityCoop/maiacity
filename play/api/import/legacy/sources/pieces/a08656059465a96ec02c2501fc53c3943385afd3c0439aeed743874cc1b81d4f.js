	], [
		.11,
		.07 + (breed === "toulouse" ? .02 : 0),
		.2
	], {
		bone: "body",
		k: .06,
		...feather,
		tag: "belly"
	});
	s.egg([
		0,
		.4,
		-.25
	], [
		.08,
		.06,
		.08
	], {
		bone: "tail",
		k: .04,
		...feather,
		tag: "tail"
	}, [
		-.3,
		0,
		0
	]);
	s.cone([
		0,
		.4,
		.17
	], J$2.neck[1], .07, .04, {
		chain: ["neck1", "neck2"],
		k: .05,
		...feather,
		tag: "neck"
	});
	s.cone(J$2.neck[1], J$2.head, .04, .033, {
		chain: ["neck2", "neck3"],
		k: .03,
		...feather,
		tag: "neck"
	});
	s.egg([
		0,
		.778,
		.285
	], [
		.033,
		.037,
		.05
	], {
		bone: "head",
		k: .02,
		tag: "head"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * .11,
		.41,
		-.06
	], [
		.04,
		.075,
		.24
	], {
		bone: `wing${side}`,
		k: .03,
		...feather,
		tag: "wing"
	}, [
		.12,
		x * -.08,
		0
	]);
	for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
		x * J$2.leg[1][0],
		.2,
		.025
	], [
		.038,
		.06,
		.05
	], {
		bone: `shank${side}`,
		k: .04,
		...feather,
		tag: "belly"
	}, [
		-.5,
		0,
		0
	]);
	const white = new three.Color("#f5f3ee"), grey = new three.Color("#8a8a86"), brown = new three.Color("#9a7a5a"), dark = new three.Color("#4a3a2c");
	const paint = (c, at) => {
		const { p, n } = at;
		const fine = noise3(p.x * 140, p.y * 140, p.z * 140, 3);
		if (breed === "embden") c.copy(white).multiplyScalar(.95 + .06 * fine);
		else if (breed === "toulouse") {
			c.copy(grey).multiplyScalar(.92 + .1 * fine);
			const bars = Math.sin(p.z * 90 + p.y * 30);
			mix(c, "#c9c7c0", ramp(bars, .5, .9) * (at.tag("wing") + ramp(n.y, .3, .8) * at.tag("feather")) * .6);
			mix(c, white, Math.max(at.tag("belly"), ramp(-n.y, .1, .6)));
		} else {
			c.copy(brown).multiplyScalar(.93 + .1 * fine);
			mix(c, white, Math.max(ramp(-n.y, 0, .5), at.tag("belly") * .8, at.tag("neck") * ramp(n.z, -.2, .4)));
			mix(c, dark, at.tag("neck") * ramp(-n.z, .4, .8));
			if (at.main === "head") mix(c, white, .6);
		}
	};
	const skin = s.skin(.011, paint, `goose-${breed}`);
	const bill = breed === "chinese" ? "#2a2420" : "#e88a2c", feet = breed === "chinese" ? "#e88a2c" : "#ea8e34";
	const parts = [{ skin }];
	parts.push({
		geo: spike([
			0,
			.765,
			.322
		], [
			0,
			-.18,
			1
		], .022, .08, { flat: 1.25 }),
		color: bill,
		bone: "head"
	});
	parts.push({
		geo: egg([
			0,
			.755,
			.35
		], [
			.017,
			.006,
			.035
		], [
			.15,
			0,
			0
		]),
		color: bill,
		bone: "head"
	});
	if (breed === "chinese") parts.push({
		geo: egg([
			0,
			.79,
			.318
		], [
			.014,
			.014,
			.014
		]),
		color: "#2a2420",
		bone: "head"
	});
	parts.push(...eyes([
		.026,
		.79,
		.3
	], .0065, [
		.9,
		.15,
		.35
	], breed === "embden" ? "#4a8acb" : "#3a2a1a", "round", "head", { irisR: .7 }));
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * J$2.leg[2][0],
			J$2.leg[2][1],
			J$2.leg[2][2]
		], toes = [
			x * J$2.leg[3][0],
			J$2.leg[3][1],
			J$2.leg[3][2]
		];
		parts.push({
			geo: limb(ankle, toes, .011, .009, { seg: 7 }),
			color: feet,
			bone: `tarsus${side}`
		});
		const web = new three.Shape();
		web.moveTo(0, 0);
		web.lineTo(-.045, .075);
		web.quadraticCurveTo(0, .09, .045, .075);
		web.lineTo(0, 0);
		const solid = new three.ExtrudeGeometry(web, {
			depth: .004,
			bevelEnabled: false,
			curveSegments: 3
		});
		solid.rotateX(Math.PI / 2);
		solid.translate(toes[0], .006, toes[2]);
		parts.push({
			geo: solid,
			color: feet,
			bone: `toes${side}`
		});
	}
	const r = rig(b.bones, parts, animalMaterials(.8));
	r.object.name = `goose-${breed}`;
	return {
		rig: r,
		clips: moves(b, {
			seed: GOOSE_BREEDS.indexOf(breed) + 51,
			gaits: { walk: {
				speed: .45,
				stride: .3,
				duty: .64,
				feet: {
					L: 0,
					R: .5
				},
				lift: .035,
				bob: .008,
				roll: .13,
				pitch: .015,
				tilt: .4,
				fold: .9,
				curl: .8,
				hold: 0
			} },
			wag: .25,
			carry: .15,
			steady: 2.6
		}),
		first: "walk",
		gears: { walk: .45 },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/species/rabbit.ts
const RABBIT_COATS = [
	"wild",
	"dutch",
	"lop",
	"white",
	"black",
	"fawn"
];
const LOOK$2 = {
	wild: {
		coat: "#86705a",
		belly: "#e9e2d6",
		iris: "#3a2416",
		lop: false
	},
	dutch: {
		coat: "#22201f",
		belly: "#f2efe9",
		iris: "#2a1a10",
		lop: false
	},
	lop: {
		coat: "#c99a63",
		belly: "#ecdcc2",
		iris: "#3a2416",
		lop: true
	},
	white: {
		coat: "#f3f0ea",
		belly: "#f6f3ee",
		iris: "#c8505a",
		lop: false
	},
	black: {
		coat: "#1f1c1b",
		belly: "#2c2826",
		iris: "#2a1a10",
		lop: false
	},
	fawn: {
		coat: "#d4ab78",
		belly: "#efe3cf",
		iris: "#4a2a14",
		lop: false
	}
};
const J$1 = {
	body: [
		0,
		.118,
		-.02
	],
	chest: [
		0,
		.11,
		.06
	],
	pelvis: [
		0,
		.12,
		-.085
	],
	neck: [[
		0,
		.115,
		.085
	], [
		0,
		.145,
		.105
	]],
	head: [
		0,
		.172,
		.118
	],
	muzzle: [
		0,
		.148,
		.2
	],
	jaw: [
		0,
		.152,
		.13
	],
	ear: [[
		.018,
		.2,
		.112
	], [
		.03,
		.3,
		.07
	]],
	tail: [
		[
