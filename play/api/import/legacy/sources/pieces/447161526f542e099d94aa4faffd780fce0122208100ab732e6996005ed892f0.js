function floret(bag, at, facing, size, colour, heart, open, petals = 5, cup = .25) {
//#piece e12f1061058e5bcbb15c9be8677913ebfa5b2ca59d2707a5ed8925007c029f11
	const edge = (a) => .4 + .6 * Math.pow(Math.abs(Math.cos(a * petals / 2)), .6);
	bag.add("sheet", fan({
		size: size * lerp(.4, 1, open),
		from: -Math.PI,
		to: Math.PI,
		edge,
		lift: (s) => cup * s * s * (1.6 - open),
		paint: (s) => mix(heart, colour, .35 + s),
		rings: 1,
		rays: petals * 2
	}), m);
	bag.add("body", bead(at.clone().addScaledVector(facing, size * .12), v3(1, .7, 1).multiplyScalar(size * .28), heart, 2));
