	const isLeader = !!spec.leader;
	const outer = (spec.flush?.gens ?? 0) - 1;
	if (!(isLeader ? sh.gen >= 1 || g > 3.5 : sh.end || sh.gen === 0 && g < 3.4 || sh.gen >= Math.min(L.from ?? 99, outer))) return;
	const age = clamp((g - sh.born) / .9);
	const colour = (u, v) => mix(L.young, L.colour, age).lerp(new three.Color("#d8d8a0"), Math.abs(v) < .1 ? .25 : 0);
	/** one leaf, at p, reaching out along `out`, hanging by `droop` @param {THREE.Vector3} p @param {THREE.Vector3} out */
	const leaf = (p, out) => {
		const len = L.length * between(lr, .75, 1.1) * lerp(.5, 1, age) * lerp(.55, 1, clamp(g - 2));
		const hang = lerp(-1.2, -L.droop, age) + about(lr, 0, .25);
		const dir = out.clone().setY(0).normalize().multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
		bag.add("sheet", sheet({
			length: len,
			width: len * (L.width / L.length),
			shape: L.shape,
			lift: (u, v) => .05 * v * v - .06 * u * u,
			paint: colour,
			along: 8,
			across: 2
		}), aim(p.clone().addScaledVector(dir, .01), dir, (lr() - .5) * .7));
