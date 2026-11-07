/**
* @typedef {{
//#piece ed78259f76b5d7c3548b2efae734caef2ca38da02cbdba0dc9039a9d1e239e7e
*   flush?: import('./crown.js').Flush, leader?: import('./crown.js').Leader,
*   roots: { tap: number, spread: number, count: number, radius: number },
*   leaf: { length: number, width: number, shape: (u: number) => number, colour: string, young: string, style: 'whorl' | 'along', per: number, droop: number, from?: number, gloss?: boolean },
*   flower: { kind?: import('./bloom.js').Kind, panicle?: boolean, catkin?: boolean, size: number, opens: number, sites: 'tips' | 'shoots' | 'spurs' | 'limbs' | 'trunk', chance: number, per: [number, number], axils?: [number, number] },
*   fruit: {
*     length: number, width: number, shape: (u: number, v: number) => number, colour: (ripe: number, u: number, v: number) => THREE.Color,
*     skin?: { colour: (ripe: number) => string, count: number, size: number, length: number }, stalk: number, keep: [number, number],
*     setFor: number, ripeFrom: number, ripeFor: number, gloss: boolean, calyx?: string
*   }
* }} Orchard — a fruit tree, described. `fruit.shape(u, v)` its radius (0 … 1) along it and round it, `skin` its
*   spines or warts, `keep` how many fruit a flowering site keeps, `setFor` how long they take to grow, `ripeFrom`
*   and `ripeFor` when after flowering they colour, over how long
*/
/**
* @param {Orchard} spec
* @returns {(g: number, seed: string) => THREE.Group}
