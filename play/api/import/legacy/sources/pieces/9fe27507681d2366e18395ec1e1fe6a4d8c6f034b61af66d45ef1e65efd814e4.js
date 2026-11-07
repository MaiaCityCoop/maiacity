function wheel(g, x, z, r = .36) {
	const w = new three.Group();
	const tyre = new three.Mesh(new three.CylinderGeometry(r, r, .22, 18), m.tyre());
	const rim = new three.Mesh(new three.CylinderGeometry(r * .55, r * .55, .23, 10), m.rim());
	tyre.castShadow = true;
	w.add(tyre, rim);
	w.rotation.z = Math.PI / 2;
	w.position.set(x, r, z);
	g.add(w);
}
/** The old rusty travel van: a minibus 5.0 × 1.9 m, 2.3 m high, faded blue over cream, rust through its sills and
*  arches, a sliding side door, a roof rack piled with bags, a sack of rice and a spare tyre. */
function travelVan() {
	const g = new three.Group();
	g.name = "travel-van";
	for (const x of [-.82, .82]) for (const z of [-1.55, 1.6]) wheel(g, x, z);
	soft(g, 1.9, .9, 4.9, .1, m.vanCream(), 0, .85, 0);
	soft(g, 1.88, .85, 4.6, .12, m.vanPaint(), 0, 1.7, -.12);
	soft(g, 1.84, .5, .5, .15, m.vanPaint(), 0, 1.25, 2.3);
	part(g, 1.86, .08, 4.5, m.vanPaint(), 0, 2.15, -.12);
	for (const x of [-.95, .95]) for (const z of [
		-1.6,
		-.6,
		.4
	]) part(g, .02, .48, .8, m.glass(), x, 1.78, z);
	const screen = part(g, 1.7, .6, .04, m.glass(), 0, 1.72, 2.12);
	screen.rotation.x = -.25;
	part(g, 1.86, .5, .02, m.glass(), 0, 1.78, -2.43);
	part(g, .02, .9, 1.1, m.trim(), .96, 1.25, .9);
	for (const x of [-.96, .96]) {
		part(g, .02, .12, 4.6, m.rust(), x, .45, 0);
		for (const z of [-1.55, 1.6]) part(g, .03, .22, .85, m.rust(), x, .78, z);
		part(g, .02, .25, .5, m.rust(), x, 1.25, -.9);
	}
	part(g, 1.92, .16, .2, m.trim(), 0, .5, 2.5);
	part(g, 1.92, .16, .2, m.trim(), 0, .5, -2.5);
	for (const x of [-.7, .7]) {
		part(g, .26, .18, .04, m.light(), x, 1, 2.52);
		part(g, .14, .3, .04, m.tail(), x * 1.15, 1.1, -2.47);
		part(g, .05, .16, .18, m.trim(), x * 1.42, 1.65, 1.95);
	}
	for (const x of [-.85, .85]) bar(g, v3(x, 2.32, -2.1), v3(x, 2.32, 1.9), .025, m.rack());
	for (const z of [
		-2.1,
		-.7,
		.6,
		1.9
	]) bar(g, v3(-.85, 2.32, z), v3(.85, 2.32, z), .02, m.rack());
	part(g, .7, .4, .9, m.bagRed(), -.4, 2.55, -1.3);
	part(g, .6, .35, .8, m.bagBlue(), .4, 2.52, -1.2);
	part(g, .8, .45, .7, m.bagGreen(), .25, 2.57, .1);
	soft(g, .6, .35, .9, .15, m.sack(), -.4, 2.52, .2);
	const spare = new three.Mesh(new three.TorusGeometry(.3, .11, 8, 16), m.tyre());
	spare.rotation.x = Math.PI / 2;
	spare.position.set(0, 2.45, 1.4);
	g.add(spare);
