//#piece 6fddda360547e24e6d8204e4487d5c0193f797b24f7fad7b4880fa8eba5dc00a
//#piece 4f60a176d56cad3cfbbd14f9e6860be98a26c03a765515821a9f89db0c4942b1
	return g;
}
function repair(k) {
	const g = new three.Group();
	const cs = [];
	g.add(k.box(9, .05, .9, k.oak, 0, .9, 2.8));
	for (const x of [
		-4.3,
		-1.5,
		1.5,
		4.3
	]) g.add(k.box(.08, .9, .8, k.dark, x, 0, 2.8));
	const r = seeded(8);
	for (let i = 0; i < 10; i++) {
		const w = .2 + r() * .3;
		g.add(k.box(w, .08 + r() * .15, .2 + r() * .2, i % 2 ? k.dark : k.counter, -4 + i * .85, .95, 2.7));
		if (i % 3 === 0) g.add(stool(k, -4 + i * .85, 1.9));
	}
	cs.push({
		x: -3,
		z: 2.8,
		r: 1
	}, {
		x: 0,
		z: 2.8,
		r: 1
	}, {
		x: 3,
		z: 2.8,
		r: 1
	});
	const bike = new three.Group();
	for (const x of [-.55, .55]) {
		const w = new three.Mesh(new three.TorusGeometry(.34, .025, 6, 28), k.dark);
		w.position.set(x, .6, 0);
		bike.add(w);
	}
	for (const [x, y, len, rot] of [
		[
			-.25,
			.8,
			.8,
			.9
		],
		[
			.2,
			.8,
			.8,
			-.9
		],
		[
			0,
			1.02,
			.9,
			Math.PI / 2
		]
	]) {
		const bar = new three.Mesh(new three.CylinderGeometry(.022, .022, len, 6), awnings[0]);
		bar.position.set(x, y, 0);
		bar.rotation.z = rot;
		bike.add(bar);
	}
	bike.add(k.box(.06, .26, .06, k.steel, 0, 0, 0));
	bike.position.set(-2.6, .02, -.4);
	g.add(bike);
	cs.push({
		x: -2.6,
		z: -.4,
		r: .9
	});
	g.add(k.box(2.2, .8, .9, k.oak, 2.2, 0, -.6));
	for (let i = 0; i < 8; i++) g.add(k.box(.24, .06, .3, glaze[i % glaze.length], 1.4 + i % 4 * .52, .8, -.8 + Math.floor(i / 4) * .4));
	cs.push({
		x: 2.2,
		z: -.6,
		r: 1.2
	});
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "repair-cafe",
	label: "Repair café",
	note: "a long bench along the glass with devices opened up on it, a bicycle on its stand, a table of parts sorted in trays",
	usedIn: "Dome rooms",
	make: () => centred(repair(kitOf()).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
