//#region src/lib/plants/tree.js
/** @typedef {{ pts: THREE.Vector3[], tip: THREE.Vector3, dir: THREE.Vector3, order: number, key: (string | number)[], grown: number, end: boolean, length: number }} Limb */
/**
* @param {import('./grow.js').Bag} bag
* @param {{
*   seed: string, key: (string | number)[], from: THREE.Vector3, dir: THREE.Vector3, length: number, grown: number,
*   radius: number, up?: number, wander?: number, spread?: number, children?: number, shorten?: [number, number],
*   depth?: number, order?: number, young: string, old: string, age?: number, out: Limb[], from0?: number, sides?: number
* }} o — `up` how strongly it turns to the light, `spread` how far its limbs leave it (radians), `children` how many,
*   `shorten` a limb's length against its parent's, `from0` how far along it the limbs start (0 … 1), `grown` how far
*   it has grown: past 1 it is full length and the rest goes on into its limbs (a tree of three orders, about 3)
