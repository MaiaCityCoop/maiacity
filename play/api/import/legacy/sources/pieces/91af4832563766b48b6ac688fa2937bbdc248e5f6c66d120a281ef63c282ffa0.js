	const index = new Map(list.map((b, i) => [b.name, i]));
	const v = new three.Vector3(), d = new three.Vector3(), q = new three.Vector3();
	const weigh = (p, out) => {
		out.clear();
		if (p.weights) {
			for (const [name, x] of p.weights(v)) out.set(name, (out.get(name) ?? 0) + x);
			return;
		}
