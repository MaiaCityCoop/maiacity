	for (let i = 0; i < 4; i++) {
		const x = (r() - .5) * .15, z = (r() - .5) * .15, h = .24 + r() * .08;
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3(0, 1, 0), h, .003, 0, col("#3f6a2a"), col("#5a7a3a")));
		for (let k = 0; k < 9; k++) {
			const a = r() * Math.PI * 2, s = r() * .025;
			geos.push(paint(new three.CircleGeometry(.005, 6).rotateX(-Math.PI / 2 + (r() - .5)).translate(x + Math.cos(a) * s, h + .01 + r() * .012, z + Math.sin(a) * s), col("#f6f6f2")));
		}
	}
	return one(geos);
}
/** A tussock of sedge: many narrow keeled leaves arching right over, darker and bluer than grass. */
function sedge(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 26; i++) {
		const a = r() * Math.PI * 2, lean = .3 + r() * .6;
		geos.push(blade(new three.Vector3((r() - .5) * .04, 0, (r() - .5) * .04), new three.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean), .25 + r() * .2, .007, .7 + r() * .4, col("#2c4a26"), col("#5a7a4a")));
	}
	return one(geos);
}
/** Blueberry: a dwarf shrub knee-high, green twiggy stems, small oval leaves, blue berries with their bloom. */
function blueberry(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 7; i++) {
		const a = r() * Math.PI * 2, h = .2 + r() * .18;
		const foot = new three.Vector3((r() - .5) * .12, 0, (r() - .5) * .12), dir = new three.Vector3(Math.cos(a) * .3, 1, Math.sin(a) * .3).normalize();
		geos.push(blade(foot, dir, h, .004, .1, col("#4a6a2a"), col("#5a8a34")));
		for (let k = 0; k < 9; k++) {
			const t = .3 + r() * .7, p = foot.clone().addScaledVector(dir, h * t), b = r() * Math.PI * 2;
			geos.push(blade(p, new three.Vector3(Math.cos(b), .3, Math.sin(b)), .022, .013, .1, col("#3f6e2a"), col("#5a8a3a")));
			if (r() < .25) geos.push(paint(new three.IcosahedronGeometry(.0045, 0).translate(p.x, p.y - .006, p.z), col("#3a4a7a")));
		}
	}
	return one(geos);
}
/** Mushrooms in a ring: pale stems, brown caps, one or two red with white flecks. */
function mushrooms(seed) {
	const r = rng(seed), geos = [];
	const red = r() < .3;
	for (let i = 0; i < 7; i++) {
		const a = i / 7 * Math.PI * 2 + r() * .4, d = .18 + r() * .12, h = .04 + r() * .07;
		const x = Math.cos(a) * d, z = Math.sin(a) * d;
		geos.push(paint(new three.CylinderGeometry(.006, .009, h, 6).translate(x, h / 2, z), col("#e8e0cc")));
		const cap = new three.SphereGeometry(.022 + r() * .015, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .6, 1).translate(x, h, z);
		geos.push(paint(cap, (q) => red && q.y - h > .004 && Math.sin(q.x * 900) * Math.sin(q.z * 900) > .85 ? col("#f6f2ea") : col(red ? "#c62a1e" : "#8a5a32")));
	}
	return one(geos);
}
/** A few stones half sunk in the floor, grey and mossed on top. */
function stones(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 4; i++) {
		const s = .06 + r() * .16;
		const g = new three.DodecahedronGeometry(s, 0).scale(1.2, .6, 1).rotateY(r() * 3).translate((r() - .5) * .5, s * .15, (r() - .5) * .5);
		geos.push(paint(g, (q) => q.y > s * .35 ? col("#5a7a2c") : col(r() < .5 ? "#8a8a84" : "#7a766c")));
	}
	return one(geos);
}
/** A fallen branch, deadwood: bark grey-brown, moss along its top, a side twig or two. */
function deadwood(seed) {
	const r = rng(seed), geos = [];
	const len = .8 + r() * 1.4, rad = .035 + r() * .05;
	geos.push(paint(new three.CylinderGeometry(rad * .8, rad, len, 8, 6).rotateZ(Math.PI / 2).translate(0, rad * .8, 0), (q) => q.y > rad * 1.4 && Math.sin(q.x * 9 + seed) > .2 ? col("#4a6a26") : col(Math.sin(q.x * 31) > .6 ? "#4a3c30" : "#62523f")));
	for (let i = 0; i < 2; i++) {
		const x = (r() - .5) * len * .7, l2 = .2 + r() * .3, a = (r() - .5) * 1.6;
		geos.push(paint(new three.CylinderGeometry(rad * .25, rad * .4, l2, 5).rotateX(Math.PI / 2).rotateY(a).translate(x + Math.sin(a) * l2 * .5, rad * .6, Math.cos(a) * l2 * .5), col("#4a3a2c")));
	}
	return one(geos);
}
/** @typedef {'grass' | 'tallgrass' | 'sedge' | 'moss' | Flower | 'woodruff' | 'woodsorrel' | 'ramsons' | 'strawberry' | 'blueberry' | 'fern' | 'litter' | 'deadwood' | 'stones' | 'mushrooms'} Cover */
/** @type {Record<Cover, { label: string, build: (seed: number) => THREE.Group }>} every kind: its name, and how it is built */
const COVER = {
	grass: {
		label: "Grass",
		build: (s) => grassClump(s, .22)
	},
	tallgrass: {
		label: "Tall grass",
		build: (s) => grassClump(s, .45)
	},
	sedge: {
		label: "Sedge",
		build: sedge
	},
	moss: {
		label: "Moss cushions",
		build: mossCushion
	},
	daisy: {
		label: "Daisy",
		build: (s) => flowerClump("daisy", s)
	},
	buttercup: {
		label: "Buttercup",
		build: (s) => flowerClump("buttercup", s)
	},
	clover: {
		label: "Red clover",
		build: (s) => flowerClump("clover", s)
	},
	forgetmenot: {
		label: "Forget-me-not",
		build: (s) => flowerClump("forgetmenot", s)
	},
	anemone: {
		label: "Wood anemone",
		build: (s) => flowerClump("anemone", s)
	},
	cranesbill: {
		label: "Meadow cranesbill",
		build: (s) => flowerClump("cranesbill", s)
	},
	woodruff: {
		label: "Woodruff",
		build: woodruff
	},
	woodsorrel: {
		label: "Wood sorrel",
		build: woodSorrel
	},
	ramsons: {
		label: "Ramsons",
		build: ramsons
	},
	strawberry: {
		label: "Wild strawberry",
		build: strawberries
	},
	blueberry: {
		label: "Blueberry",
		build: blueberry
	},
