		}
		if (f.catkin) {
			const n = f.per[0] + Math.floor(fr() * (f.per[1] - f.per[0] + 1));
			for (let k = 0; k < n; k++) {
				const d = site.dir.clone().add(v3((fr() - .5) * .8, -.3, (fr() - .5) * .8)).normalize();
				const end = site.at.clone().addScaledVector(d, .03);
				bag.add("body", tube([site.at, end], () => .004, () => "#5f7a34", 4));
				bag.add("body", bead(end.clone().addScaledVector(d, .03 * f.size), v3(.012, .035, .012).multiplyScalar(f.size * lerp(.4, 1, clamp(phase + .3))), "#8aa64a", 6, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)));
			}
			return;
		}
		const n = f.per[0] + Math.floor(fr() * (f.per[1] - f.per[0] + 1));
		for (let k = 0; k < n; k++) {
			const a = k / n * Math.PI * 2 + fr();
			const d = up.clone().add(v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(.7)).add(v3(0, f.sites === "tips" ? 0 : -1.2, 0)).normalize();
			const end = site.at.clone().addScaledVector(d, .025 * f.size);
			bag.add("body", tube([site.at, end], () => .0012 * f.size, () => "#6f7a3a", 4));
			if (phase < 0 || !f.kind) bag.add("body", bead(end.clone().addScaledVector(d, .004), v3(.004, .006, .004).multiplyScalar(f.size), "#dfe2c0", 4));
			else bloom(bag, f.kind, end, d, f.size, open, span(phase, .35, .55));
		}
		return;
