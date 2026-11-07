/**
* @typedef {{ pts: THREE.Vector3[], tip: THREE.Vector3, dir: THREE.Vector3, gen: number, key: (string | number)[],
*   grown: number, end: boolean, radius: number, born: number, length: number }} Shoot — one shoot as far as it has
*   grown; `end` while nothing has broken from its tip yet (where the leaves, the flowers and the fruit are)
*/
/**
* @typedef {{
*   trunk: number, trunkBorn: number, trunkFlush: number, scaffolds: [number, number], scaffoldAngle: number,
*   gens: number, flush: number, rest: number, shoot: (gen: number) => number, whorl: [number, number], spread: number,
*   up: number, droop: number, wander: number, radius: number, taper: number, thicken: number, bark: [string, string],
*   stop?: (key: (string | number)[], gen: number, born: number) => boolean
* }} Flush — `trunk` the clear trunk's length, its flush from `trunkBorn` over `trunkFlush`; then `scaffolds` limbs
*   (at least, at most) at `scaffoldAngle` from it; then `gens` generations of flushes, each `flush` long with a `rest`
*   between, of `shoot(gen)` metres, `whorl` new shoots each, leaving their parent at `spread`; a shoot that
*   `stop`s flushes no further (it has become a flowering and fruiting tip)
*/
/**
* A tree that grows in flushes. Its shoots are drawn into `bag` and handed back.
* @param {import('./grow.js').Bag} bag
* @param {{ seed: string, g: number, from: THREE.Vector3, spec: Flush }} o
* @returns {Shoot[]}
