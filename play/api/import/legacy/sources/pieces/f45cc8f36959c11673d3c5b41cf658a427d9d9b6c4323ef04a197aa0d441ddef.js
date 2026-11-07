//#piece 362bb7292e339f0af56d964b1d17a6276db55505f2c73e1f477f9df2204b4106
/**
* A mushroom: a stipe, perhaps with a ring, a cap from a closed button to open and flat, its gills beneath — all of
* it one fruit (Bag.fruit) named `key`, standing from `at` along `up`.
* @param {Bag} bag
* @param {{ key: (string | number)[], at: THREE.Vector3, up: THREE.Vector3, stipe: number, stipeR: number, capR: number, open: number, cap: (u: number, a: number) => THREE.Color | string, gills: string, stem: string, ring?: string }} o
*/
function mushroom(bag, o) {
	const q = new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), o.up.clone().normalize());
	const m = new three.Matrix4().compose(o.at, q, v3(1, 1, 1));
	const H = o.stipe * lerp(.35, 1, o.open);
	bag.fruit(o.key, o.at, o.up);
	bag.add("body", tube([
		v3(0, -.002, 0),
		v3(0, H * .5, 0),
		v3(0, H, 0)
	], (u) => o.stipeR * (1.25 - .35 * u), () => o.stem, 8), m);
	if (o.ring && o.open > .5) bag.add("sheet", fan({
		size: o.stipeR * 2.2,
		from: -Math.PI,
		to: Math.PI,
		edge: () => 1,
		lift: (s) => -.25 * s,
		paint: () => o.ring ?? "#fff",
		rings: 2,
		rays: 16
	}), m.clone().multiply(new three.Matrix4().makeTranslation(0, H * .75, 0)));
	const capH = o.capR * lerp(.95, .38, o.open);
	const axis = [];
	for (let k = 0; k <= 10; k++) axis.push(v3(0, H + capH * .85 - k / 10 * capH, 0));
	const rim = (u) => u > .75 ? (1 - o.open) * .35 * ((u - .75) / .25) : 0;
	bag.add("body", tube(axis, (u) => o.capR * Math.pow(Math.sin(Math.min(1, u * 1.05) * Math.PI / 2), .55) * (1 - rim(u)), (u, v) => o.cap(u, v * Math.PI * 2), 16), m);
	bag.add("sheet", fan({
		size: o.capR * (1 - rim(1)) * .98,
		from: -Math.PI,
		to: Math.PI,
		edge: () => 1,
		lift: (s) => .25 * (1 - o.open) * s * s,
		paint: (s, a) => mix(o.gills, "#3a2a20", Math.abs(Math.sin(a * 40)) > .85 ? .25 : 0),
		rings: 3,
		rays: 40
	}), m.clone().multiply(new three.Matrix4().makeTranslation(0, H + capH * .85 - capH + 5e-4, 0)));
	bag.fruitDone();
}
