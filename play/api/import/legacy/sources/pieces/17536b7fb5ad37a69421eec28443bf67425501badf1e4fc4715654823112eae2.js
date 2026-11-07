/**
* @param {import('./grow.js').Bag} bag
* @param {{
*   seed: string, at: THREE.Vector3, size: THREE.Vector3, coat: string, coatShade: string,
*   stem: number, hook: number, radius: number, stemColor: string,
*   leaf: { length: number, width: number, shape: (u: number) => number, color: string, vein: string },
*   open: number, shed: number, wither: number, keepCoat?: boolean
* }} o — `stem` the hypocotyl's length now, `hook` how bent over it is (1 a hook, 0 straight), `open` how far the seed
*   leaves have spread, `shed` 0 … 1 the coat coming off, `wither` 0 … 1 the seed leaves gone
* @returns {{ top: THREE.Vector3, dir: THREE.Vector3 }} the shoot's tip, and which way it points
