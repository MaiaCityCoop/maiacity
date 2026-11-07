function peaFlower(blades, at, facing, size, colour, keel, open, fall) {
	if (fall >= 1) return;
	const f = facing.clone().setY(0);
	if (f.lengthSq() < 1e-8) f.set(1, 0, 0);
	f.normalize();
	const s = size * lerp(.55, 1, open) * (1 - .3 * fall);
	const up = f.clone().lerp(v3(0, 1, 0).addScaledVector(f, -.3), open).add(v3(0, -fall, 0)).normalize();
	blades.add({
		at,
		dir: up,
		up: f.clone().negate(),
		length: s,
		width: s * lerp(.25, .5, open),
		shape: oval,
		segs: 2,
		fold: -.3,
		paint: (u) => mix(open > .3 ? colour : "#a8c080", colour, u + open),
		round: true
	});
	if (open > .2) blades.add({
		at,
		dir: f.clone().add(v3(0, -.25 - fall, 0)),
		length: s * .75,
		width: s * .22,
		shape: oval,
		segs: 2,
		twin: .6,
		paint: keel,
		round: true
