//#piece 49108f821b155b24a5b6ec659c4399d6a5b416bad5adc307ec552a423889a5ef
//#region src/lib/biomes/noise.js
//#piece aab55d5c339c01ae09c509bdd50faefa12b9e7b55d400b020ae53f8188c3d2d7
	}
//#piece c62608554484cfe6384d662c31be89f79c823cfb3e4ae356d7aeeee5c41899dd
//#piece 0077c186bf9a692b3bfb1b6cf04e40114df758cf024e167a5d1c9c4f4861fabf
//#piece 1fa7a17305ce2a9b7794a9a7cfb1ec83ff9c143ec7e891afd3fd9ee6d0c796c2
//#piece ddea639caddd3dbe0b17e3b5d936203a3691518aa8eacefa06fc781ce056e6c9
//#piece 87285ee60040e60a446473968746c54546e6212ae01364807ed772834588d8ba
//#piece 54038b6c12687cde4d4755cabca3006d482dd981e2ed87a70d497e8c8b6135f9
	mushrooms: {
		label: "Mushrooms",
		build: mushrooms
	}
};

//#endregion
//#piece 6fa14bc9f71080dc6eed4f7571b8ed4b1ae2d47f88bfd3f617bd036efba60f78
//#piece 010aab79d655030c1d51c865d14f385e2b4a7babb0e829e3e0d7d3e83fcb952a
*/
const HISTORY = {};
/** a kind built at a seed, casting its shadow @param {(seed: number) => import('three').Object3D} build */
const casting = (build) => (seed) => {
	const g = build(seed);
	g.traverse((o) => {
		if (o.isMesh) o.castShadow = true;
	});
	return g;
};
const LIST = [{
	id: "cover",
	label: "Biome cover",
	note: "What stands on a biome’s floor, kind by kind: grasses, moss, flowers, berries, ferns, fallen leaves, deadwood, stones and mushrooms, each one shape in its own colours, a little different at each seed.",
	from: "Every biome’s floor",
	params: [{
		id: "seed",
		label: "Seed",
		type: "integer",
		value: 7100,
		min: 0,
		max: 2147483647
	}],
	make: /* @__PURE__ */ (() => Object.entries(COVER).map(([id, c]) => ({
		id,
		label: c.label,
		make: casting(c.build)
	})))()
}];
/** the cover, its version and history ($lib/app/versions.js): the `biomes` group's recipes */
//#piece 3f86f9041ab6826d41c4ca34572d3c8ed61d8ddcdaaecfca4cf7bda560b2320f
