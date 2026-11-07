/**
* @typedef {{
*   bag: Bag, seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, g: number, phase: number,
*   grid: Grid, vigour: number, shoot: import('./crown.js').Shoot
* }} Site — one flowering site as its plant draws it: where it is on the bark and which way it faces, `phase` how far
*   past its opening (below 0 a bud; flowers to about 0.55, then the fruit), `grid` what the fruit and berries must
*   keep clear of (the thick wood, and every fruit and berry so far), and the leaves after them
*/
/**
* @typedef {{
*   length: number, width: number, shape: (u: number) => number, colour: string, dark: string, young: string,
*   opposite?: boolean, pinnate?: { pairs: [number, number], length: number, width: number },
*   spacing: number, droop: number, from: number, start?: number, tuft?: number, max?: number,
*   on?: [number, number][], along?: number, across?: number, curl?: number
* }} Leaf — `spacing` a node every so many leaf lengths along a shoot, `from` the first generation of shoot that
*   keeps leaves (the outer ones), `start` how far along a fruit-packed shoot they begin, `tuft` leaves crowded at a shoot's tip,
*   `on` how far in leaf through the stages (0 bare, for a tree that flowers before its leaves), `pinnate` leaflets
*   in pairs along a rachis `length` long, `curl` how far the blade folds up along its midrib
*/
/**
* @typedef {{
//#piece ed78259f76b5d7c3548b2efae734caef2ca38da02cbdba0dc9039a9d1e239e7e
*   roots: { tap: number, spread: number, count: number, radius: number, nodules?: boolean },
*   flush?: import('./crown.js').Flush, leader?: import('./crown.js').Leader,
*   leaf: Leaf,
*   bloom: { sites: 'tips' | 'twigs' | 'wood', opens: number, chance: number, gen: number, pairs?: boolean },
*   thorns?: number,
*   site: (s: Site) => void
* }} Grove — a low tree or a big shrub, described: its flowering sites at the tips of the outermost shoots (`tips`,
*   `chance` of them), along last year's twigs (`twigs`, `chance` a metre, in opposite `pairs` or one by one), or
*   whole shoots handed to `site` (`wood`), from shoots of generation `gen` on
*/
/**
* What the plant has put where — its thick wood as chains of balls, its fruit and berries as balls — in cells, so a
* fruit can look for a place to hang and a leaf ask whether it would run into one cheaply (a berry bush has thousands;
* ./grow.js's Space asks every ball every time).
