*/
const paramsOf = (p) => [
	{
		id: "stage",
		label: "Stage",
		type: "number",
		min: 0,
		max: p.stages.length - 1,
		value: p.stages.length - 1,
		names: p.stages.map((s) => s.name)
	},
	{
		id: "seed",
		label: "Seed",
		type: "string",
		value: SEEDS[0],
		maxLength: 40
	},
	{
		id: "detail",
		label: "Detail",
		type: "number",
		min: .05,
		max: 1,
		step: .05,
		value: 1
	},
	{
		id: "fruit",
		label: "View",
		type: "integer",
		min: 0,
		max: 1,
		value: 0,
		names: ["Plant", "Fruit"]
	}
];
/**
* A version's grow, taking a detail as well: at 1 (or none) grown as it always was, below grown lighter (./grow.js
* `lite`); and with `fruit` 1, one of its fruit on its own instead of the whole plant (./fruit.js: the one its seed
* picks of the fruit it bears ripe at its `last` stage, as it is at `stage`). Every version takes both, as every
* version grows through the same detail and bears its fruit the same way.
* @param {(stage: number, seed: string) => any} grow @param {number} last
*/
const detailed = (grow, last) => (stage, seed, detail, fruit) => {
	const made = fruit ? () => fruitOf(grow, last, stage, seed) : () => grow(stage, seed);
	return detail === void 0 || detail >= 1 ? made() : lite(detailAt(detail), made);
};
/**
* One fruit of a plant on its own, or, when there is none to show, nothing with a note saying why.
* @param {(stage: number, seed: string) => any} grow @param {number} last @param {number} stage @param {string} seed
*/
function fruitOf(grow, last, stage, seed) {
	const { plant, fruit } = ripeOf(grow, last, seed);
	plant.traverse((o) => o.geometry?.dispose());
	const one = fruit && oneFruit(grow, stage, seed, fruit.pick);
	if (one) return one;
	const none = new three.Group();
	none.userData.note = fruit ? "This fruit has not set yet." : "This plant bears no fruit.";
	return none;
}
/**
* every plant, layer by layer from the canopy down (in each layer as they were added), with its versions and what it
* is grown with
* @type {(Plant & { versions: import('../app/versions.js').Version<Plant['grow']>[], version: number, params: import('$lib/assets/params.js').Param[] })[]}
