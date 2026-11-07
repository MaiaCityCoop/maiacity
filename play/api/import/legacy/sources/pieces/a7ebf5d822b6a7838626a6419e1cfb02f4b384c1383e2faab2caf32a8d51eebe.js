/**
* @typedef {{
*   petals: number, length: number, width: number, colour: string, heart: string, shape?: (u: number) => number,
*   sepals?: number, sepal?: number, sepalColour?: string, sepalBack?: number, stamens?: number, stamenColour?: string,
*   cone?: boolean, flat?: number
* }} Kind — `sepalBack` how far the sepals bend back (radians), `cone` a tomato's cone of anthers in place of a
*   cushion, `flat` how far the open petals lie back (0 level, more for a reflexed star)
*/
/**
* @param {import('./grow.js').Bag} bag
* @param {Kind} kind
* @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} size
* @param {number} open 0 … 1 the bud opening @param {number} fall 0 … 1 the petals dropping
