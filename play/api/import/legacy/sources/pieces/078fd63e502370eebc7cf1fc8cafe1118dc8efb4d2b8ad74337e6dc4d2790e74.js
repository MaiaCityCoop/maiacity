			const u = .06 + .88 * ((k + .5) / n);
			const a = k * 2.39996;
			const rad = o.W * F.shape(u, a / (Math.PI * 2));
			const out = v3(Math.cos(a), 0, Math.sin(a));
			const at = v3(0, -.002 - u * o.L, 0).addScaledVector(out, rad);
			const s = skin.size * lerp(.4, 1, o.set);
			bag.add("body", bead(at.addScaledVector(out, s * skin.length * .5), v3(s, s * skin.length, s), c, 2, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), out)), m);
		}
	}
}

//#endregion
