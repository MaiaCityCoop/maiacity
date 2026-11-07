*/
function umbellifer(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .1);
		const at = v3(0, -.006, 0);
		const s = sprout(bag, {
			seed,
			at,
			size: v3(spec.seed.size, spec.seed.size * .5, spec.seed.size * .5),
			coat: spec.seed.colour,
			coatShade: "#5a4a30",
			stem: table(g, [
				[0, 0],
				[.3, 6e-4],
				[1, .01],
				[2, .02],
				[9, .02]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.5, 0]
			]),
			radius: 6e-4 + .001 * span(g, 1, 4),
			stemColor: "#7a9a4a",
			leaf: {
				length: .018,
				width: .002,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .6),
				color: "#5a9a3c",
				vein: "#9cc46e"
			},
			open: span(g, 1.1, 2),
			shed: span(g, 1, 1.5),
			wither: span(g, 3.5, 4.5)
		});
		root(bag, {
			seed,
			key: ["tap"],
			from: at.clone(),
			dir: v3(0, -1, 0),
			length: .3,
			grown: table(g, [
				[0, 0],
				[.3, .02],
				[1, .1],
				[3, .4],
				[5, .85],
				[7, 1]
			]),
			radius: .0015 + .003 * span(g, 3, 7),
			down: .05,
			wander: .15,
			laterals: 9,
			lateral: .35,
			depth: 2,
			age: span(g, 3, 8),
			young: "#f6efdc",
			old: "#d8c49a"
		});
		const fade = span(g, spec.seedAt - .3, spec.seedAt + 1);
		for (let i = 0; i < spec.leaves; i++) {
			const born = 2 + i * (3 / spec.leaves);
			if (g <= born) break;
			const lr = chance(seed, "leaf", i);
			const grown = clamp((g - born) / 1);
			pinnate(bag, {
				seed,
				key: ["u", i],
				at: s.top.clone(),
				out: v3(Math.cos(i * 2.39996), 0, Math.sin(i * 2.39996)),
				lift: between(lr, .7, 1.15) - fade * .6,
				length: spec.leafLength * lerp(.4, 1, clamp(i / 5)) * vigour,
				pairs: spec.pairs,
				leaflet: {
					length: spec.leaflet.length * vigour,
					width: spec.leaflet.width * vigour,
					shape: spec.leaflet.shape,
					colour: spec.colour,
					young: "#8ac05a",
					vein: spec.colour,
					old: "#c8b04a"
				},
				grown,
				old: fade,
				stalk: "#7aa04a",
				radius: .0012,
				terminal: 1,
				between: spec.feathery,
				curl: spec.curly ? .6 : 0
			});
		}
		const rise = span(g, spec.stalkAt, spec.stalkAt + 1);
		if (rise <= 0) return bag.build();
		const H = spec.stalk * rise * vigour;
		const top = s.top.clone().add(v3(.01, H, 0));
		bag.add("body", tube([
			s.top,
			s.top.clone().add(v3(0, H * .5, .005)),
			top
		], (u) => .004 * (1 - .5 * u), () => mix("#7a9a4a", "#b8a060", fade), 6));
		const ends = [top];
		for (let b = 0; b < 3; b++) {
			const br = chance(seed, "branch", b);
			const from = s.top.clone().add(v3(0, H * (.45 + b * .15), 0));
			const a = b * 2.4 + br() * .5;
			const end = from.clone().add(v3(Math.cos(a) * H * .18, H * .32, Math.sin(a) * H * .18));
			bag.add("body", tube([from, end], () => .0022, () => mix("#7a9a4a", "#b8a060", fade), 4));
			ends.push(end);
			if (spec.feathery) pinnate(bag, {
				seed,
				key: ["stem-leaf", b],
				at: from,
				out: v3(Math.cos(a + 1.5), 0, Math.sin(a + 1.5)),
				lift: .6,
				length: spec.leafLength * .4,
				pairs: 2,
				leaflet: {
					length: spec.leaflet.length * .7,
					width: spec.leaflet.width * .7,
					shape: thread,
					colour: spec.colour,
					young: "#8ac05a",
					vein: spec.colour
				},
				grown: 1,
				old: fade,
				stalk: "#7aa04a",
				radius: 8e-4,
				terminal: 1
			});
		}
		const bloom = span(g, spec.bloomAt, spec.bloomAt + .6);
		const seeds = span(g, spec.seedAt, spec.seedAt + .8);
		ends.forEach((end, e) => {
			const size = spec.umbel.size * (e === 0 ? 1 : .7) * lerp(.3, 1, bloom);
			for (let k = 0; k < spec.umbel.rays; k++) {
				const a = k / spec.umbel.rays * Math.PI * 2;
				const ray = end.clone().add(v3(Math.cos(a) * size, size * .35, Math.sin(a) * size));
				bag.add("body", tube([end, ray], () => 6e-4, () => "#8aa85a", 3));
				for (let m = 0; m < 7; m++) {
					const b2 = m / 7 * Math.PI * 2;
					bag.add("body", bead(ray.clone().add(v3(Math.cos(b2) * size * .18, size * .06, Math.sin(b2) * size * .18)), v3(1, 1, 1).multiplyScalar(.0016 * lerp(.5, 1, bloom)), seeds > .3 ? mix("#8aa85a", spec.umbel.seed, seeds) : mix("#b8c88a", spec.umbel.colour, bloom), 2));
				}
			}
		});
		return bag.build();
	};
}
