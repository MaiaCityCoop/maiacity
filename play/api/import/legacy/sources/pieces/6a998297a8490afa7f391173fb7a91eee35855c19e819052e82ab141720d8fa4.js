//#region src/lib/plants/leaves.js
/**
* @typedef {{ length: number, width: number, shape: (u: number) => number, colour: string, young: string, vein: string, old?: string }} Leaflet
*/
/**
* @param {import('./grow.js').Bag} bag
* @param {{
*   seed: string, key: (string | number)[], at: THREE.Vector3, out: THREE.Vector3, lift: number, length: number,
*   pairs: number, leaflet: Leaflet, grown: number, old?: number, between?: boolean, stalk: string, radius: number,
*   terminal?: number, droop?: number, curl?: number
* }} o — `out` the way it reaches (level), `lift` how far up from level it starts (radians), `length` the stalk and
*   rachis together, `terminal` the end leaflet's size against the pairs', `between` small leaflets between the pairs,
*   `droop` how much more it hangs, `curl` its leaflets rolled along their midribs even when grown (an oxheart's)
