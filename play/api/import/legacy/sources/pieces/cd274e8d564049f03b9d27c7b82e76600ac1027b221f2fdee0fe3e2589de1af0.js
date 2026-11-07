//#piece 0934e15400c1bd2f1f2bc6b22e3b37e469121e9b4a17c19388a68e79a00b9b21
		let start, place;
		if (f.sites === "trunk" || f.sites === "limbs") {
			const out = site.dir.clone().setY(0);
			if (out.lengthSq() < 1e-6) out.copy(swing);
			out.normalize().applyAxisAngle(v3(0, 1, 0), (k - (keep - 1) / 2) * .7 + (kr() - .5) * .3);
			start = site.at.clone().addScaledVector(out, F.stalk * .5 + W * .9);
			place = space.settle(start, v3(0, -1, 0).addScaledVector(out, .08), (a, d) => [.3, .7].map((t) => ({
				c: a.clone().addScaledVector(d, L * t),
				r: W * .92
			})), W * .6);
		} else {
			start = site.at.clone().addScaledVector(f.sites === "tips" ? up : site.dir, F.stalk * .25);
			const hangFrom = start.clone().addScaledVector(swing, F.stalk * .25).add(v3(0, -F.stalk * lerp(.3, 1, set), 0));
			place = space.settle(hangFrom, v3(0, -1, 0).addScaledVector(swing, .15), (a, d) => [.3, .7].map((t) => ({
				c: a.clone().addScaledVector(d, L * t),
				r: W * .92
			})), F.stalk * .5 + W);
		}
