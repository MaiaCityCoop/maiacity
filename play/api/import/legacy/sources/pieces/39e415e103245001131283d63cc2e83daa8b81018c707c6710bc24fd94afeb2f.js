	const woody = spec.woody ? span(g, 3.5, 7) * (1 - order * .4) : 0;
	const radius = (.0012 + .0022 * clamp(length / .5)) * (order ? .7 : 1) * (1 + woody);
	bag.add("body", tube(pts, (u) => radius * (1 - .5 * u), (u) => mix(spec.stem, spec.woody ?? spec.stem, woody * (1 - u)), 4));
	const along = (u) => {
		const f = clamp(u) * 10, k = Math.min(9, Math.floor(f));
		return {
			p: pts[k].clone().lerp(pts[k + 1], f - k),
			t: pts[k + 1].clone().sub(pts[k]).normalize()
		};
	};
	const L = spec.leaf;
	const flowering = g > spec.flower.at;
	for (let n = 0; n < nodes; n++) {
		const u = (n + .5) / nodes;
		const { p, t } = along(u);
		const turn = n * (Math.PI / 2) + r() * .15;
		const side = new three.Vector3().crossVectors(t, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
		side.normalize().applyAxisAngle(t, turn);
		const age = clamp((1 - u) * reach / .12);
		const size = lerp(.35, 1, age) * vigour * (order ? .85 : 1);
		if (spec.woody && u < .25 * woody) continue;
		for (const s of [-1, 1]) {
			const out = side.clone().multiplyScalar(s);
			const dirL = out.clone().multiplyScalar(lerp(.4, 1, age)).addScaledVector(t, lerp(.9, .25, age)).add(v3(0, -L.droop * age, 0)).normalize();
			const len = L.length * size;
			bag.add("sheet", sheet({
				length: len,
				width: L.width * size,
				shape: L.shape,
				lift: (uu, v) => .1 * v * v * (1 - age * .5) - .05 * uu * uu + (L.wrinkle ?? 0) * Math.sin(uu * 30 + v * 7) * .01,
				paint: (uu, v) => mix(mix(L.young, L.colour, age), "#b8bca8", L.grey ?? 0).lerp(new three.Color("#d8e0b8"), Math.abs(v) < .1 ? .25 : 0),
				along: 6,
				across: 2
			}), aim(p, dirL, 0));
			if (flowering && spec.flower.kind === "axils" && n % 2 === 0 && u > .3) {
				const f = span(g, spec.flower.at, spec.flower.at + .5) * (1 - span(g, spec.flower.at + 1.6, spec.flower.at + 2.4));
				if (f > 0) for (let m = 0; m < 3; m++) bag.add("body", bead(p.clone().addScaledVector(out, .004 + m * .002).add(v3(0, .002, 0)), v3(1, 1.3, 1).multiplyScalar(spec.flower.size * f), spec.flower.colour, 2));
			}
		}
		if (order < spec.depth && u < .75 && n > 0) for (const s of [-1, 1]) {
			const br = chance(seed, "branch", ...key, n, s);
			if (br() > spec.branching) continue;
			const sd = side.clone().multiplyScalar(s * spec.spread).addScaledVector(t, 1).normalize();
			const sub = length * (1 - u) * between(br, .55, .85);
			shoot(bag, spec, seed, [
				...key,
				n,
				s
			], p, sd, sub, (reach - u * reach) / (sub * 1.4), order + 1, g, vigour);
		}
	}
	if (!flowering || spec.flower.kind === "axils" || grown < .6) return;
	const f = span(g, spec.flower.at, spec.flower.at + .6);
	const seeding = span(g, spec.flower.at + 1.5, spec.flower.at + 2.5);
	let tip = pts[10];
	const td = pts[10].clone().sub(pts[9]).normalize();
	if (spec.flower.kind === "spike") {
		const stalk = (spec.flower.stalk ?? 0) * span(g, spec.flower.at, spec.flower.at + .7) * (order ? .8 : 1) * vigour;
		if (stalk > 0) {
			const sd = td.clone().lerp(v3(0, 1, 0), .6).normalize();
			const top = tip.clone().addScaledVector(sd, stalk);
			bag.add("body", tube([
				tip,
				tip.clone().addScaledVector(td, stalk * .3).lerp(top, .3),
				top
			], () => radius * .45, () => spec.stem, 3));
			tip = top;
		}
		const whorls = spec.flower.whorls ?? 6;
		const spikeLen = (spec.flower.length ?? .06) * f * (order ? .7 : 1);
		const end = tip.clone().addScaledVector(stalk > 0 ? v3(0, 1, 0).lerp(td, .3).normalize() : td, spikeLen);
		bag.add("body", tube([tip, end], () => radius * .5, () => spec.stem, 3));
		for (let w = 0; w < whorls; w++) {
			const p = tip.clone().lerp(end, (w + .5) / whorls);
			for (let m = 0; m < 6; m++) {
				const a = m / 6 * Math.PI * 2 + w;
				bag.add("body", bead(p.clone().add(v3(Math.cos(a) * .004, 0, Math.sin(a) * .004)), v3(1, 1.4, 1).multiplyScalar(spec.flower.size * (w > whorls * .6 ? .6 : 1)), seeding > .5 ? spec.flower.seed ?? "#6a5a3a" : spec.flower.colour, 2));
			}
		}
	} else for (let m = 0; m < 14; m++) {
		const a = m * 2.39996, rr = Math.sqrt(m / 14) * .012;
		bag.add("body", bead(tip.clone().add(v3(Math.cos(a) * rr, .003 - rr * .3, Math.sin(a) * rr)), v3(1, 1, 1).multiplyScalar(spec.flower.size * f), seeding > .5 ? spec.flower.seed ?? "#6a5a3a" : spec.flower.colour, 2));
	}
}
