/** An old timber shed, 6 × 4 m, 2.8 m high: grey planks with gaps, half its corrugated roof gone, one door hanging. */
function oldShed() {
	const g = new three.Group();
	g.name = "old-shed";
	part(g, 6.2, .1, 4.2, m.concrete(), 0, .05, 0, false);
	for (const x of [-3, 3]) for (const z of [-2, 2]) part(g, .14, 2.6, .14, m.greyPlank(), x, 1.3, z);
	part(g, 6.1, .14, .14, m.greyPlank(), 0, 2.8, 0);
	for (let x = -2.9; x <= 2.9; x += .32) part(g, .24, 2.4, .04, x % 1.3 < .2 ? m.plank() : m.greyPlank(), x, 1.25, -2);
	for (const sx of [-3, 3]) for (let z = -1.85; z <= 1.85; z += .32) if (Math.abs(z - .6 * sx) > .3) part(g, .04, 2.4, .24, m.greyPlank(), sx, 1.25, z);
	for (let x = -2.9; x <= 2.9; x += .32) if (Math.abs(x) > 1.1) part(g, .24, 2.4, .04, m.greyPlank(), x, 1.25, 2);
	const door = new three.Group();
	part(door, 1, 2.1, .05, m.plank(), .5, 1.05, 0);
	door.position.set(-1.05, .05, 2.05);
	door.rotation.set(0, -1.1, .12);
	g.add(door);
	const a = part(g, 6.2, .04, 2.3, m.corrugated(), 0, 2.45, -1);
	a.rotation.x = -.32;
	const b = part(g, 3, .04, 2.3, m.rust(), -1.6, 2.45, 1);
	b.rotation.x = .32;
	bar(g, v3(.2, 2.75, .3), v3(2.9, 2.2, 1.9), .04, m.greyPlank());
