	}
];
/**
* @typedef {{
*   height: [number, number][], stake: number, leaflet: { length: number, width: number, shape: (u: number) => number },
*   droop: number, curl: number, lift: [number, number], fruits: [number, number], fruit: (o: Fruit) => void, setFor: number,
*   ripeFrom: number, ripeFor: number, double: boolean, truss: number,
*   balls: (at: THREE.Vector3, dir: THREE.Vector3, size: number, set: number) => { c: THREE.Vector3, r: number }[]
* }} Sort — how a tomato grows: its height through the stages, its leaves (and how they hang), how many fruit to a
*   truss (at least, and up to how many more), the fruit it bears and the room it takes (`balls`, so the fruit keep
*   clear of each other, the stem and the cane), the truss's length, how long the fruit take to set and to ripen
*/
/** @typedef {{ bag: Bag, seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, set: number, ripe: number }} Fruit */
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.006, 0))();
const STAKE = /* @__PURE__ */ (() => v3(.035, 0, -.01))();
const NODES = 22;
