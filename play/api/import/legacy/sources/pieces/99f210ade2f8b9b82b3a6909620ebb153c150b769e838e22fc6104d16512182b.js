*/
function shrub(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .08);
		const at = v3(0, -.004, 0);
		const s = sprout(bag, {
			seed,
			at,
			size: spec.seed.size,
			coat: spec.seed.coat,
			coatShade: spec.seed.shade,
			stem: table(g, [
				[0, 0],
				[.35, 6e-4],
				[1, .006],
				[2, .014],
				[9, .014]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.6, 0]
			]),
			radius: 6e-4 + .0025 * span(g, 1.5, 4),
			stemColor: "#8a8a4a",
			leaf: {
				length: spec.cotyledon.length,
				width: spec.cotyledon.width,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .65),
				color: spec.cotyledon.colour,
				vein: "#a6c47e"
			},
			open: span(g, 1.15, 2),
			shed: span(g, 1, 1.6),
			wither: span(g, 2.9, 3.6)
		});
		shrubRoots(bag, seed, g, at, spec.roots, vigour);
		const S = spec.stems;
		const size = table(g, S.size);
		/** @type {Limb[]} */
		const twigs = [];
		for (let c = 0; c < S.count; c++) {
			const cr = chance(seed, "stem", c);
			const born = c === 0 ? S.first : S.first + .5 + (c - 1) * S.every + cr() * .25;
			const bear = c * 2.39996 + cr() * .6;
			const off = S.crown * Math.sqrt(c / S.count) * between(cr, .6, 1);
			const lean = c === 0 ? between(cr, .03, .12) : between(cr, S.lean[0], S.lean[1]);
			const length = between(cr, S.length[0], S.length[1]);
			if (g <= born) continue;
			const from = c === 0 ? s.top.clone() : v3(Math.cos(bear) * off, 0, Math.sin(bear) * off);
			limb(bag, {
				seed,
				key: ["stem", c],
				from,
				dir: v3(Math.cos(bear) * Math.sin(lean), Math.cos(lean), Math.sin(bear) * Math.sin(lean)),
				length: length * vigour * size,
				grown: Math.min(2.6, (g - born) * S.rate),
				radius: S.radius * lerp(.3, 1, size),
				up: S.up,
				wander: S.wander,
				spread: S.spread,
				children: S.children,
				shorten: S.shorten,
				depth: S.depth,
				from0: S.from0,
				young: S.young,
				old: S.old,
				age: clamp((g - born) / 3),
				out: twigs,
				sides: 5
			});
		}
		const ctx = {
			bag,
			seed,
			g,
			vigour,
			twigs
		};
		for (const t of twigs) if (t.order <= 1) bag.space.rod(t.pts, t.order ? .007 : .013);
		if (spec.wood) for (const t of twigs) spec.wood(ctx, t);
		spec.fruit(ctx);
		leafOut(ctx, spec.leaf, twigs);
		return bag.build();
	};
}
/**
//#piece ddf7fb903df75d94ffaaf76d5fb7932002f9851df9194fefe6de8c65f5210a96
