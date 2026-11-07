	if (k.hair === "none") return [];
	const { skin, E, hairF, crown } = h;
	const P = skin.geo.attributes.position, N = skin.geo.attributes.normal, I = skin.geo.index;
	const pos = [], nor = [], idx = [];
	const made = /* @__PURE__ */ new Map();
	const p = new three.Vector3(), q = new three.Vector3(), n = new three.Vector3(), m = new three.Vector3();
	/** a point of the layer: on a vertex of the skin (i = j) or where the line crosses the edge i–j, lifted off it */
	const point = (i, j) => {
		const key = i < j ? `${i},${j}` : `${j},${i}`;
		if (made.has(key)) return made.get(key);
		const t = i === j ? 0 : hairF[i] / (hairF[i] - hairF[j]);
		p.fromBufferAttribute(P, i).lerp(q.fromBufferAttribute(P, j), t);
		n.fromBufferAttribute(N, i).lerp(m.fromBufferAttribute(N, j), t).normalize();
		const f = i === j ? hairF[i] : 0;
		const top = smooth(E.y + .02, crown - .01, p.y);
		const lift = 4e-4 + (.0016 + (.0075 + .0055 * smooth(-.12, .08, p.z - E.z)) * top) * smooth(0, .015, f);
		made.set(key, pos.length / 3);
		pos.push(p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift);
		nor.push(n.x, n.y, n.z);
		return made.get(key);
	};
	for (let t = 0; t < I.count; t += 3) {
		const tri = [
			I.getX(t),
			I.getX(t + 1),
			I.getX(t + 2)
		];
		const over = tri.map((i) => hairF[i] > 0);
		if (!over.some(Boolean)) continue;
		/** @type {number[]} */ const poly = [];
		for (let k = 0; k < 3; k++) {
			const a = tri[k], b = tri[(k + 1) % 3];
			if (over[k]) poly.push(point(a, a));
			if (over[k] !== over[(k + 1) % 3]) poly.push(point(a, b));
		}
		for (let k = 1; k + 1 < poly.length; k++) idx.push(poly[0], poly[k], poly[k + 1]);
	}
//#piece 60a6ac3338545883b3b63e9d4eb68e2d3ea54483ff4871e88c50f5dff406aa13
	g.setAttribute("normal", new three.Float32BufferAttribute(nor, 3));
	g.setIndex(idx);
	const out = [{
		geo: g,
		color: k.hairColour,
		bone: "head"
	}];
	const egg = (c, s, r = [
		0,
		0,
		0
	], seg = 20) => {
		const e = new three.SphereGeometry(1, seg, Math.round(seg * .7));
		e.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...c), new three.Quaternion().setFromEuler(new three.Euler(...r)), new three.Vector3(...s)));
		return e;
	};
	const back = E.z - .17;
	if (k.hair === "long") {
		out.push({
			geo: egg([
				0,
				E.y - .075,
				back + .035
			], [
				.085,
				.14,
				.05
			], [
				.12,
				0,
				0
			], 28),
			color: k.hairColour,
			bone: "head"
		});
		for (const x of [-1, 1]) out.push({
			geo: egg([
				x * .07,
				E.y - .045,
				E.z - .1
			], [
				.022,
				.1,
				.06
			], [
				0,
				0,
				x * .08
			], 16),
			color: k.hairColour,
			bone: "head"
		});
	}
	if (k.hair === "bun") out.push({
		geo: egg([
			0,
			E.y + .07,
			back + .005
		], [
			.038,
			.036,
			.036
		], [
			0,
			0,
			0
		], 20),
		color: k.hairColour,
		bone: "head"
	});
	return out;
}

//#endregion
//#region src/lib/actors/human.ts
/** how tall it is (m) */
