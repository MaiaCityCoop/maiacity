function pickFruit(make) {
	PICKING.bags = [];
	PICKING.fruits = [];
	try {
		return {
			plant: make(),
			fruits: PICKING.fruits.filter((f) => f.parts.length)
		};
	} finally {
		PICKING.bags = null;
		PICKING.fruits = [];
	}
}
/**
* Everything a plant is, gathered by material and merged at the end into one mesh each. Above or below the soil, all
* one plant: the viewer cuts the soil away to show the roots.
*/
var Bag = class {
	constructor() {
		/** @type {Record<Kind, THREE.BufferGeometry[]>} */
		this.parts = {
			body: [],
			sheet: [],
			gloss: [],
			prop: []
		};
		/** what the plant has put where, for its fruit and leaves to keep clear of (see Space) */
		this.space = new Space();
		/** how far into the next sheet kept, when thinned (DETAIL.thin) */
		this.sheets = 0;
		/** @type {Fruit | null} the fruit being drawn, between `fruit()` and `fruitDone()` */
		this.drawing = null;
		if (PICKING.bags) PICKING.bags.push(this);
	}
	/**
	* What is added from here to `fruitDone()` is one fruit — the whole of it as one is picked: its stalk, its calyx,
	* the fruit itself (or for tiny berries borne in bunches, the bunch) — hanging from `at`, where its stalk leaves
	* the plant, its body lying along `dir` from there (down, for a hanging fruit); `key` names it, the same at every
	* stage. Only gathered when the fruit viewer asks for it (`pickFruit`), so it costs nothing otherwise.
	* @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} dir
	*/
	fruit(key, at, dir) {
		this.drawing = {
			key: key.join("|"),
			at: at.clone(),
			dir: dir.clone().normalize(),
			parts: []
		};
		if (PICKING.bags) PICKING.fruits.push(this.drawing);
		return this;
	}
