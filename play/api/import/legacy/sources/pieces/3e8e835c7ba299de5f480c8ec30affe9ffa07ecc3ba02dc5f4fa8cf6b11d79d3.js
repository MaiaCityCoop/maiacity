//#piece 4a9e272606a5382fcbfc72f3ee9e5bf260f995e219c61966ffd31a7cb7e95bb7
	return best;
}
/**
* A compound blade of leaflets: pinnate (a rachis with pairs along it and one at its end — the rose's) or digitate
* (all from the stalk's tip — the blackberry's).
* @param {{ pairs: number, digitate?: boolean, leaflet: number, width: number, shape: (u: number) => number, rachis: string, wrinkle?: number, across?: number }} o
* @returns {Blade}
*/
const compound = (o) => (bag, m, len, paint) => {
	const leaflet = (at, size) => {
		const l = len * o.leaflet * size;
		const w = o.wrinkle ?? 0;
		bag.add("sheet", sheet({
			length: l,
			width: l * o.width,
			shape: o.shape,
			lift: (u, v) => .08 * v * v - .06 * u * u + w * Math.sin(u * 19 + v * 5) * .012,
			paint,
			along: 3,
			across: o.across ?? 2
		}), m.clone().multiply(at));
	};
	const turn = (x, a) => new three.Matrix4().makeTranslation(x, 0, 0).multiply(new three.Matrix4().makeRotationY(a));
	if (o.digitate) {
		const fanned = o.pairs === 1 ? [
			[0, 1],
			[.8, .8],
			[-.8, .8]
		] : [
			[0, 1],
			[.75, .88],
			[-.75, .88],
			[1.5, .62],
			[-1.5, .62]
		];
		for (const [a, size] of fanned) leaflet(turn(0, a), size);
		return;
	}
	bag.add("body", tube([v3(0, 0, 0), v3(len * .62, 0, 0)], () => 8e-4, () => o.rachis, 3), m.clone());
	for (let k = 0; k < o.pairs; k++) {
		const x = len * lerp(.12, .55, o.pairs === 1 ? .5 : k / (o.pairs - 1));
		for (const side of [-1, 1]) leaflet(turn(x, side * 1.05), lerp(.75, .95, k / Math.max(1, o.pairs - 1)));
	}
	leaflet(turn(len * .6, 0), 1);
//#piece 699d391814e6246d45b758ff46a3a2c3fc0a7dbda8275a8e309db744ff0137d3
