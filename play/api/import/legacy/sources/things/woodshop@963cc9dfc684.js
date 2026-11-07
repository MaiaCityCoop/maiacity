//#piece 631d3c9bbaf7b4381c76ef38a537fe970559c665cdbb8a69d2be26027f63640f
function woodshop(k) {
	const g = new three.Group();
	const cs = [];
	for (const [x, z] of [
		[-3.2, -1.2],
		[0, -1.2],
		[3.2, -1.2]
	]) {
		g.add(k.box(2.2, .1, .9, k.oak, x, .82, z));
		for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(k.box(.1, .82, .1, k.oak, x + sx * .95, 0, z + sz * .35));
		g.add(k.box(2, .04, .7, k.oak, x, .2, z));
		g.add(k.box(.25, .14, .2, k.steel, x + .9, .92, z - .45));
		g.add(k.box(.6, .05, .14, k.oak, x - .3, .92, z + .1, .4));
		cs.push({
			x,
			z,
			r: 1.2
		});
	}
	g.add(k.box(.9, .84, .8, k.dark, 5, 0, 1));
	g.add(k.box(1.3, .04, 1.1, k.steel, 5, .84, 1));
	const blade = new three.Mesh(new three.CylinderGeometry(.15, .15, .01, 20), k.steel);
	blade.rotation.z = Math.PI / 2;
	blade.position.set(5, .88, 1);
	g.add(blade);
	cs.push({
		x: 5,
		z: 1,
		r: .8
	});
	for (const x of [
		-4.5,
		-1.5,
		1.5
	]) g.add(k.box(.12, 2.2, .12, k.dark, x, 0, 3.3));
	for (let lv = 0; lv < 5; lv++) for (let b = 0; b < 3; b++) g.add(k.box(5.6 + b * .3, .05, .18, k.oak, -1.5, .35 + lv * .42 + b * .055, 3.15 + (b - 1) * .12));
	cs.push({
		x: -1.5,
		z: 3.3,
		r: .5
	}, {
		x: -4,
		z: 3.3,
		r: .5
	}, {
		x: 1,
		z: 3.3,
		r: .5
	});
	for (const x of [-1.2, 1.2]) {
		g.add(k.box(.08, .7, .8, k.oak, x, 0, 1.4));
		g.add(k.box(.1, .06, .6, k.oak, x, .7, 1.4));
	}
	g.add(k.box(3.4, .05, .3, k.oak, 0, .76, 1.4));
	cs.push({
		x: 0,
		z: 1.4,
		r: 1
	});
	g.add(k.box(2.6, 1.3, .05, k.oak, -3.5, 1, 2.2));
	const r = seeded(4);
	for (let i = 0; i < 12; i++) g.add(k.box(.05 + r() * .08, .2 + r() * .3, .04, i % 3 ? k.steel : k.dark, -4.6 + i % 6 * .42, 1.2 + Math.floor(i / 6) * .55, 2.16));
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "woodshop",
	label: "Woodshop",
	note: "three workbenches, the saw, a timber rack along the glass, sawhorses with a plank across, a pegboard of tools",
	usedIn: "Dome rooms",
	make: () => centred(woodshop(kitOf()).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
