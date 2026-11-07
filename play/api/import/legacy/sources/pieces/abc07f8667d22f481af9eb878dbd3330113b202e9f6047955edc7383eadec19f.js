		g.rotateX(Math.PI / 2);
		g.rotateY(x * .5);
		g.translate(f[0], .003 * k, f[2]);
		parts.push({
			geo: g,
			color: look.spots,
			bone: `foot${side}`
		});
	}
	const r = rig(bones, parts, animalMaterials(.4, { metalness: .05 }));
	r.object.name = `frog-${kind}`;
	const restDir = (a, b) => new three.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
	const legSeg = (side) => {
		const x = side === "L" ? 1 : -1;
		const l = leg.map((p) => m(p, x));
		return {
			l,
			rest: [
				0,
				1,
				2,
				3
			].map((i) => restDir(l[i], l[i + 1])),
			out: [
				new three.Vector3(x * .25, -.15, -1),
				new three.Vector3(x * .15, -.3, -1),
				new three.Vector3(x * .1, -.35, -1),
				new three.Vector3(x * .05, -.5, -1)
			].map((v) => v.normalize())
		};
	};
	const legs = {
		L: legSeg("L"),
		R: legSeg("R")
	};
