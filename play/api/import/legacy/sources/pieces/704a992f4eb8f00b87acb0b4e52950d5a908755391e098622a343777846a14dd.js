*   L: number, W: number, stalk: number, stalkColour: string, season: Season,
*   draw: (bag: Bag, at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, ripe: number) => void,
*   bud: (bag: Bag, at: THREE.Vector3, down: THREE.Vector3, open: number, fall: number) => void
* }} Hanging — a berry that hangs alone: its length and radius grown, its stalk, its season, how it is drawn and how
*   its flower is
*/
/**
* One berry (or a few) hanging under a node, on its own stalk, where it touches nothing.
* @param {Ctx} ctx @param {THREE.Vector3} at @param {THREE.Vector3} out @param {(string | number)[]} key
* @param {Hanging} o
