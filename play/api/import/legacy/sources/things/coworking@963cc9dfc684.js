//#piece 631d3c9bbaf7b4381c76ef38a537fe970559c665cdbb8a69d2be26027f63640f
//#piece e6addcd9c9c95232e424cd25cec49ab74a452a00e42d368c6faf0d1544719c86
//#piece 3bc64030a534155d4b68a613076b61780a35b6582b64f5cdc50d0ac5260bfb9e
function cowork(k, seed) {
	const g = new three.Group();
	const cs = [];
	for (const z of [-1.6, 1.6]) {
		const t = k.table(4.2, 8);
		t.position.set(-.6, 0, z);
		g.add(t);
		cs.push({
			x: -1.6,
			z,
			r: 1.1
		}, {
			x: .4,
			z,
			r: 1.1
		});
		for (let i = 0; i < 4; i++) {
			const x = -2.2 + i * 1.05;
			for (const side of [-1, 1]) {
				if ((i + (side > 0 ? 1 : 0) + seed) % 3 === 0) continue;
				g.add(k.box(.34, .015, .24, k.dark, x, .75, z + side * .2));
				const screen = k.box(.34, .22, .012, k.dark, x, .765, z + side * .33);
				screen.rotation.x = side * .25;
				g.add(screen);
			}
		}
		const l = k.lantern(.45, 4.2);
		l.position.set(-.6, 0, z);
		g.add(l);
	}
	g.add(k.box(.06, 1.3, 2.2, k.counter, -5, .9, 0, 0));
	g.add(k.box(.08, .9, .08, k.dark, -5, 0, -.9));
	g.add(k.box(.08, .9, .08, k.dark, -5, 0, .9));
	const r = seeded(seed);
	for (let i = 0; i < 7; i++) g.add(k.box(.02, .22, .3, glaze[i % glaze.length], -4.96, 1.05 + r() * .9, -.9 + r() * 1.8));
	const s = k.sofa(2.4);
	s.position.set(4.3, 0, 2.6);
	s.rotation.y = Math.PI;
	g.add(s);
	cs.push({
		x: 4.3,
		z: 2.6,
		r: 1.3
	}, {
		x: -5,
		z: 0,
		r: .6
	});
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "coworking",
	label: "Co-working",
	note: "two long tables of eight with laptops open on them under paper lanterns, a pinboard of plans, a sofa corner for the calls",
	usedIn: "Dome rooms",
	make: () => centred(cowork(kitOf(), 1).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
