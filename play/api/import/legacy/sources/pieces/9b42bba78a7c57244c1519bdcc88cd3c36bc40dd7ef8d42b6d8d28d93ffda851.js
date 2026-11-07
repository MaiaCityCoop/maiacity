		const lrad = R * .45 * clamp(len / 2 + .2);
		bag.add("body", tube(lp, (u) => lrad * (1 - .75 * u), () => spec.bark[1], 7));
		out.push({
			pts: lp,
			tip: lp[8].clone(),
			dir: d.clone(),
			gen: 1,
			key: ["limb", i],
			grown: 1,
			end: true,
			radius: lrad,
			born: g - 2,
			length: len
		});
		const count = Math.floor(len / spec.side);
		for (let k = 0; k < count; k++) {
			const u = (k + .7) / (count + .7);
			const f = u * 8, kk = Math.min(7, Math.floor(f));
			const p = lp[kk].clone().lerp(lp[kk + 1], f - kk);
			const along = lp[kk + 1].clone().sub(lp[kk]).normalize();
			const sd = new three.Vector3().crossVectors(along, v3(0, 1, 0)).normalize().multiplyScalar(k % 2 ? 1 : -1).multiplyScalar(.8).addScaledVector(along, .6).add(v3(0, between(lr, -.35, .55), 0)).normalize();
			const slen = spec.sides * (1 - .6 * u) * between(lr, .7, 1.1) * clamp(len / 1.5 + .2);
			const sp = [
				p,
				p.clone().addScaledVector(sd, slen * .5),
				p.clone().addScaledVector(sd, slen).add(v3(0, -slen * .12, 0))
			];
			bag.add("body", tube(sp, (uu) => lrad * .3 * (1 - .6 * uu) + .002, () => spec.bark[0], 4));
			out.push({
				pts: sp,
				tip: sp[2].clone(),
				dir: sd,
				gen: 2,
				key: [
					"side",
					i,
					k
				],
				grown: 1,
				end: true,
				radius: lrad * .3,
				born: g - 2 + clamp(1 - len / full) * 1.5,
				length: slen
			});
		}
	}
	return out;
}
