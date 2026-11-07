function leaderCrown(bag, o) {
	const { seed, g, spec } = o;
	/** @type {Shoot[]} */
	const out = [];
	const r = chance(seed, "leader");
	const H = tableAt(g, spec.height);
	if (H < .005) return out;
	const lean = v3(r() - .5, 0, r() - .5).multiplyScalar(.06);
	const trunkAt = (h) => o.from.clone().add(v3(lean.x * h * h, h, lean.z * h * h));
	const n = Math.max(2, Math.ceil(H / .1));
	const pts = [];
	for (let k = 0; k <= n; k++) pts.push(trunkAt(k / n * H));
	const R = spec.radius * clamp(H / 8) + .004;
	bag.add("body", tube(pts, (u) => R * (1 - .7 * u) * (1 + .35 * Math.pow(1 - Math.min(1, u * H / .6), 3)), (u) => mix(spec.bark[1], spec.bark[0], clamp((u - .75) * 4)), 12));
	out.push({
		pts,
		tip: pts[n].clone(),
		dir: v3(0, 1, 0),
		gen: 0,
		key: ["trunk"],
		grown: 1,
		end: true,
		radius: R,
		born: 0,
		length: H
	});
	for (let i = 0; i < spec.tiers; i++) {
		const lr = chance(seed, "limb", i);
		const h = spec.clear * .3 + i * spec.spacing * about(lr, 1, .15);
		const bear = i * 2.39996 + about(lr, 0, .3);
		const ageLen = H - h;
		if (ageLen <= .05) break;
		if (h < H - spec.crown || h < spec.clear * clamp(H / 4)) {
			lr();
			continue;
		}
		const full = spec.limb(h / Math.max(1, H)) * about(lr, 1, .15);
		const len = Math.min(full, ageLen / spec.rate * full * .5 + .05);
		const out0 = v3(Math.cos(bear), 0, Math.sin(bear));
		const tilt = spec.angle * about(lr, 1, .08);
		let d = out0.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
		const lp = [trunkAt(h)];
		for (let k = 0; k < 8; k++) {
			d = d.clone().add(v3(0, -spec.droop * (k / 8), 0)).normalize();
			lp.push(lp[k].clone().addScaledVector(d, len / 8));
		}
