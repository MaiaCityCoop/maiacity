function leafOut(ctx, L, twigs) {
	const { bag, seed, g, vigour } = ctx;
	const balls = bag.space.balls;
	const fall = L.autumn ? span(g, L.autumn.from, L.autumn.from + .8) * L.autumn.share : 0;
	for (const t of twigs) {
		const fade = t.fade ?? 0;
		if (t.order < L.from || fade >= 1) continue;
		const lr = chance(seed, "leafing", ...t.key);
		const bare = t.order === 0 ? Math.min(L.bare, t.length * .3) : 0;
		const old = t.order <= 1 && !!L.tuft;
		const spacing = old ? L.spur ?? L.spacing * 1.6 : L.spacing;
		const n = Math.floor(t.length / spacing);
		for (let k = 0; k < n; k++) {
			const s = (k + .4) * spacing;
			const r1 = lr(), r2 = lr(), r3 = lr();
			if (s < bare) continue;
			const w = walk(t.pts, s);
			if (!w) break;
			const young = clamp((t.length - s) / .14);
			const size = lerp(.5, 1, young) * vigour * (.85 + r2 * .3) * (1 - fade * .6);
			const len = L.length * size;
			const autumn = L.autumn && r3 < fall ? clamp((fall - r3) * 6) : 0;
			const green = mix(L.young, L.colour, young * .9 + .1).lerp(new three.Color(L.shade ?? L.colour), r2 * .5);
			if (autumn) green.lerp(new three.Color(
				/** @type {{ colour: string }} */
				L.autumn.colour
			), autumn);
			const vein = green.clone().lerp(new three.Color(L.vein), .35), dark = green.clone().multiplyScalar(.94), light = green.clone().multiplyScalar(1.06);
			/** @type {LeafPaint} */
			const paint = (u, v) => Math.abs(v) < .07 ? vein : u > .5 ? light : dark;
			const sides = L.opposite ? [0, Math.PI] : [0];
			const tuft = old ? L.tuft ?? 1 : 1;
			for (const side of sides) for (let f = 0; f < tuft; f++) {
				const a = (L.opposite ? k * Math.PI / 2 : k * 2.39996) + side + r1 * .4 + f * 1.25;
				const h = level(round(w.d, a).clone().addScaledVector(w.d, .35), level(w.d));
				const lift = lerp(.9, -L.droop, young) + (r2 - .5) * .35 - f * .15;
				const stalkDir = h.clone().multiplyScalar(Math.cos(.55)).add(v3(0, Math.sin(.55), 0));
				const end = w.p.clone().addScaledVector(stalkDir, L.stalk * size);
				let dir = h.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
				dir = clear(balls, end, dir, len);
				if (L.stalk * size > .012) bag.add("body", tube([w.p, end], () => 9e-4, () => L.stalkColour, 3));
				L.blade(bag, aim(end, dir, (r3 - .5) * .5), len * (f ? .85 : 1), paint);
			}
		}
	}
