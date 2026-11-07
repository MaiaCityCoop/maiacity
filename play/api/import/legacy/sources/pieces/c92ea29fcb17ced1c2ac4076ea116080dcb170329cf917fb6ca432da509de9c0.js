//#piece 0165430aff7a7b39031bd93dbfe473788d6f794698d9d9f28704cce28ac6b54f
//#piece 05b5597e4e5f80f81139f61718ff1cc3e173915cde80a391fe363409c9a8297a
//#piece 4a82d0c0d2de49164bac6d92e953e2cf899885cf87f11d98026000d30bd4f76b
/**
* A husked nut: the husk (smooth, or spiny like the chestnut's burr) round it, splitting into `valves` from the tip as
* it ripens, the nuts inside showing in the clefts; built down -Y from its stalk.
* @param {Bag} bag @param {THREE.Matrix4} m @param {number} L @param {number} W
* @param {{ shape: (u: number) => number, husk: (u: number, v: number) => THREE.Color, split: number, valves: number,
*   spines?: number, rings: number, sides: number, nut: string, nuts: number, nutSize: number, kind?: 'body' | 'gloss' }} o
*/
function husked(bag, m, L, W, o) {
	const axis = [];
	for (let k = 0; k <= o.rings; k++) axis.push(v3(0, -.001 - k / o.rings * L, 0));
	const cleft = (u, v) => {
		if (o.split <= 0) return 1;
		let c = 1;
		for (let k = 0; k < o.valves; k++) c = Math.min(c, Math.abs((v - k / o.valves + 1.5) % 1 - .5));
		const wide = .02 + .07 * o.split;
		return 1 - o.split * .75 * Math.exp(-Math.pow(c / wide, 2)) * clamp(u * 2.2 - .1);
	};
	const radius = (u, v) => {
		const spike = o.spines && u > .06 && u < .94 ? o.spines * ((Math.round(u * o.rings) + Math.round(v * o.sides)) % 2) : 0;
		return W * o.shape(u) * (1 + .12 * o.split) * (1 + spike) * cleft(u, v);
	};
	bag.add(o.kind ?? "body", tube(axis, radius, (u, v) => cleft(u, v) < .75 ? o.husk(u, v).multiplyScalar(.55) : o.husk(u, v), o.sides), m);
	if (o.split > .05) for (let k = 0; k < o.nuts; k++) {
		const a = k / o.nuts * TAU + .4;
		const off = o.nuts > 1 ? W * .32 : 0;
		const c = v3(Math.cos(a) * off, -L * .5, Math.sin(a) * off);
		bag.add("gloss", bead(c, v3(W * o.nutSize * (o.nuts > 1 ? .62 : .9), L * .42 * o.nutSize, W * o.nutSize * (o.nuts > 1 ? .5 : .85)), o.nut, 3, new three.Quaternion().setFromAxisAngle(v3(0, 1, 0), -a)), m);
	}
}
