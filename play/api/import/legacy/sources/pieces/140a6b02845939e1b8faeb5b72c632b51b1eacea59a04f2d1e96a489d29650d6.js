*/
function flushCrown(bag, o) {
	const { seed, g, spec } = o;
	/** @type {Shoot[]} */
	const out = [];
	/**
	* @param {(string | number)[]} key @param {THREE.Vector3} from @param {THREE.Vector3} dir @param {number} gen @param {number} born
	*/
	const grow = (key, from, dir, gen, born) => {
		if (g <= born) return;
		const r = chance(seed, "shoot", ...key);
		const length = (gen === 0 ? spec.trunk : spec.shoot(gen)) * about(r, 1, .18);
		const flush = gen === 0 ? spec.trunkFlush : spec.flush;
		const grown = clamp((g - born) / flush);
		const steps = gen === 0 ? 10 : 5;
		const path = [from.clone()];
		const d = dir.clone().normalize();
		for (let i = 0; i < steps; i++) {
			d.y += spec.up - spec.droop * gen * (i / steps);
			d.x += (r() * 2 - 1) * spec.wander;
			d.z += (r() * 2 - 1) * spec.wander;
			d.normalize();
			path.push(path[i].clone().addScaledVector(d, length / steps));
		}
		const reach = grown * steps, whole = Math.floor(reach);
		const pts = path.slice(0, whole + 1);
		if (whole < steps) pts.push(path[whole].clone().lerp(path[whole + 1], reach - whole));
		if (pts.length < 2) return;
		const age = g - born;
		const radius = spec.radius * Math.pow(spec.taper, gen) * (.12 + .88 * clamp(age / spec.thicken));
		bag.add("body", tube(pts, (u) => radius * (1 - .35 * u), (u) => mix(spec.bark[1], spec.bark[0], clamp((u - .4) * 1.5 + (1 - clamp(age / 2)) * .8)), gen < 2 ? 9 : 5));
		const tip = pts[pts.length - 1];
		const tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
		let end = true;
		if (grown >= 1 && gen < spec.gens && !spec.stop?.(key, gen, born)) {
			const [a, b] = gen === 0 ? spec.scaffolds : spec.whorl;
			const n = a + Math.floor(r() * (b - a + 1));
			const turn0 = r() * Math.PI * 2;
			for (let i = 0; i < n; i++) {
				const bearing = turn0 + i / n * Math.PI * 2 + about(r, 0, .35);
				const tilt = (gen === 0 ? spec.scaffoldAngle : spec.spread) * about(r, 1, .2);
				const side = new three.Vector3().crossVectors(tipDir, v3(0, 1, 0));
				if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
				side.normalize().applyAxisAngle(tipDir, bearing);
				const cd = tipDir.clone().applyAxisAngle(side, tilt);
				const next = born + flush + spec.rest * about(r, 1, .25);
				if (g > next) end = false;
				grow([...key, i], tip, cd, gen + 1, next);
			}
		}
		out.push({
			pts,
			tip: tip.clone(),
			dir: tipDir,
			gen,
			key,
			grown,
			end,
			radius,
			born,
			length: length * grown
		});
	};
	grow(["trunk"], o.from, v3(0, 1, 0), 0, spec.trunkBorn);
	return out;
}
/**
* @typedef {{
*   height: [number, number][], radius: number, tiers: number, clear: number, spacing: number, angle: number,
*   limb: (h: number) => number, rate: number, crown: number, sides: number, side: number, bark: [string, string],
*   droop: number
* }} Leader — the trunk's height through the stages, how thick it grows, a limb every `spacing` metres from `clear`
*   (`tiers` of them at most), at `angle` from upright, as long as `limb(h)` (h 0 … 1 up the tree) once grown, growing
*   `rate` metres a stage; limbs further than `crown` below the top have died off; each limb with side shoots every
*   `side` metres
*/
/**
* A tree with a leader. Its trunk, limbs and side shoots are drawn into `bag` and handed back.
* @param {import('./grow.js').Bag} bag
* @param {{ seed: string, g: number, from: THREE.Vector3, spec: Leader }} o
* @returns {Shoot[]}
*/
