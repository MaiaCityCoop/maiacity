};
/**
* @typedef {{
*   blade: Blade, length: number, stalk: number, stalkColour: string, spacing: number, opposite?: boolean, from: number,
*   bare: number, colour: string, young: string, vein: string, droop: number, shade?: string, tuft?: number, spur?: number,
*   autumn?: { colour: string, from: number, share: number }
* }} Leafing — the leaves of a shrub: their blade, their size, how far apart along the wood, opposite or one by one,
*   from which order of wood (0 the stems), how much of each stem's base is bare, their greens, and on the older wood
*   (the stems and their first branches) `tuft` leaves in a rosette on each spur, the spurs `spur` apart; `autumn`
*   the share of them that colour, and from when
*/
/**
* The leaves along a shrub's wood, at fixed distances from each twig's base so that a leaf once out stays where it
* is as the twig lengthens; the youngest, near the tip, smaller and standing up.
* @param {Ctx} ctx @param {Leafing} L
* @param {{ pts: THREE.Vector3[], length: number, order: number, key: (string | number)[], fade?: number }[]} twigs `fade` 0 … 1 its leaves falling
