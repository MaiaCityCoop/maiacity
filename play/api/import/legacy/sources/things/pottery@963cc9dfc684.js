//#piece 631d3c9bbaf7b4381c76ef38a537fe970559c665cdbb8a69d2be26027f63640f
//#piece 0d25c815b0e44869f1c4633160afd14abb8894d948a48072ed2f29c60b1050fd
//#piece 3bc64030a534155d4b68a613076b61780a35b6582b64f5cdc50d0ac5260bfb9e
//#piece c823256a7a02dd5cd87949a8a79ba697c65156f0a2cc8a06097e51d37245c911
function pottery(k) {
	const g = new three.Group();
	const cs = [];
	for (let i = 0; i < 3; i++) {
		const x = -3.5 + i * 2.3;
		const base = new three.Mesh(new three.CylinderGeometry(.34, .4, .5, 20), k.counter);
		base.position.set(x, .25, -.6);
		g.add(base);
		const head = new three.Mesh(new three.CylinderGeometry(.2, .2, .04, 20), k.steel);
		head.position.set(x, .52, -.6);
		g.add(head);
		const lump = pot(clay, .3, 90 + i);
		lump.position.set(x, .54, -.6);
		g.add(lump);
		g.add(stool(k, x, -1.3, .45));
		cs.push({
			x,
			z: -.8,
			r: .7
		});
	}
	g.add(k.box(1.5, 1.3, 1.5, brick, 4.4, 0, -.6));
	g.add(k.box(.3, 2.6, .3, brick, 4.9, 1.3, -1.1));
	g.add(k.box(.9, .9, .04, k.dark, 4.4, .2, .16));
	cs.push({
		x: 4.4,
		z: -.6,
		r: 1.1
	});
	for (let lv = 0; lv < 4; lv++) {
		g.add(k.box(8, .04, .45, k.oak, -.5, .3 + lv * .5, 3.2));
		for (let i = 0; i < 14; i++) {
			const p = pot(glaze[(i + lv) % glaze.length], .2 + (i * 7 + lv) % 5 * .04, i * 11 + lv);
			p.position.set(-4.2 + i * .55, .32 + lv * .5, 3.2);
			g.add(p);
		}
	}
	for (const x of [
		-4.5,
		-.5,
		3.5
	]) g.add(k.box(.06, 2, .45, k.oak, x, 0, 3.2));
	cs.push({
		x: -2.5,
		z: 3.2,
		r: .5
	}, {
		x: 1.5,
		z: 3.2,
		r: .5
	});
	g.add(k.box(2, .85, .9, k.lime, -1.2, 0, 1.3));
	for (let i = 0; i < 4; i++) {
		const l = pot(clay, .16, 300 + i);
		l.position.set(-1.8 + i * .4, .85, 1.3);
		g.add(l);
	}
	cs.push({
		x: -1.2,
		z: 1.3,
		r: 1.1
	});
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "pottery",
	label: "Pottery",
	note: "three wheels with clay on them and a stool at each, a brick kiln with its flue, four shelves of glazed pots along the glass, the wedging table",
	usedIn: "Dome rooms",
	make: () => centred(pottery(kitOf()).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
