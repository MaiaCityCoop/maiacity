}
/**
* @typedef {{
*   seed: { size: THREE.Vector3, coat: string, shade: string }, cotyledon: { length: number, width: number, colour: string },
*   stems: {
*     count: number, first: number, every: number, rate: number, length: [number, number], lean: [number, number],
*     crown: number, radius: number, up: number, wander: number, spread: number, children: number,
*     shorten: [number, number], depth: number, from0: number, young: string, old: string, size: [number, number][]
*   },
*   roots: { length: number, count: number },
*   leaf: Leafing,
*   wood?: (ctx: Ctx, t: Limb) => void,
*   fruit: (ctx: Ctx) => void
* }} Shrub — a bush, described: its seed and seed leaves; its stems (how many, from when and how often a new one
*   comes up from the crown, how fast they grow, how long and how far they lean, how wide the crown they rise from,
*   how they branch, their bark young and old, and `size` the whole bush's size through the stages); its roots; its
*   leaves; what its wood bears (spines, prickles) and its flowers and fruit
*/
/**
* @param {Shrub} spec
* @returns {(g: number, seed: string) => THREE.Group}
