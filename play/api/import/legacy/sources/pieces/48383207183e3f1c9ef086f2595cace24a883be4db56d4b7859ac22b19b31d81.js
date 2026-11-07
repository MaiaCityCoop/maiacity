	const reach = grown * steps;
	/** its growth beyond its own length, for its limbs */
	const reachAll = Math.max(0, o.grown) * steps;
//#piece aad93b06a5929a2006bda8fa07ed45b60478a8ec5af391c9a4eeffccde9fd5dd
	const r0 = o.radius * (.1 + .9 * Math.pow(grown, 1.5));
	const age = clamp(o.age ?? 0);
	bag.add("body", tube(pts, (u) => r0 * (1 - .65 * u), (u) => mix(o.old, o.young, u * 1.4 - age + .4), o.sides ?? (order ? 5 : 8)));
	const tipDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
	let end = true;
	const n = order < depth ? o.children ?? 3 : 0;
	const [s0, s1] = o.shorten ?? [.5, .75];
	for (let i = 0; i < n; i++) {
		const at = i === n - 1 ? 1 : between(r, o.from0 ?? .35, .92);
		const turn = r() * Math.PI * 2;
		const tilt = between(r, .6, 1) * (o.spread ?? .75) * (i === n - 1 ? .45 : 1);
		const short = between(r, s0, s1);
		const here = at * steps;
		if (here > reachAll - .4) continue;
		if (at === 1) end = false;
		const k = Math.min(steps - 1, Math.floor(here));
		const p = path[k].clone().lerp(path[k + 1], here - k);
		const along = path[k + 1].clone().sub(path[k]).normalize();
		const side = new three.Vector3().crossVectors(along, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
		side.normalize().applyAxisAngle(along, turn);
		const d = along.clone().applyAxisAngle(side, tilt);
		limb(bag, {
			...o,
			key: [...o.key, i],
			from: p,
			dir: d,
			length: o.length * short,
			grown: (reachAll - here) / (steps * .7),
			radius: o.radius * (at === 1 ? .75 : .6),
			order: order + 1,
			age: age * .7
		});
	}
	o.out.push({
		pts,
		tip: pts[pts.length - 1].clone(),
		dir: tipDir,
		order,
		key: o.key,
		grown,
		end,
		length: o.length * grown
	});
}

//#endregion
