/** An abandoned gas station, 24 × 16 m: cracked concrete, a faded canopy on four pillars with a panel missing, two
*  old pumps, a kiosk with broken windows and a dark door, a leaning sign pole with nothing left on it, oil drums,
*  a tumbleweed. */
function gasStation() {
	const g = new three.Group();
	g.name = "gas-station";
	part(g, 24, .12, 16, m.crackedConcrete(), 0, .06, 0, false);
	for (const [x, z, w, d] of [
		[
			-6,
			3,
			7,
			.1
		],
		[
			2,
			-2,
			.1,
			6
		],
		[
			7,
			5,
			5,
			.1
		]
	]) part(g, w, .02, d, m.dark(), x, .13, z, false);
	for (const x of [-4.5, 4.5]) for (const z of [1.5, 6.5]) part(g, .4, 4.6, .4, m.canopy(), x, 2.3, z);
	part(g, 11, .5, 7, m.canopy(), 0, 4.85, 4);
	part(g, 11.05, .25, 7.05, m.canopyStripe(), 0, 4.6, 4);
	part(g, 2.5, .06, 2.5, m.dark(), -2.8, 5.12, 2.8, false);
	part(g, 5, .25, 1.2, m.concrete(), 0, .25, 4);
	for (const x of [-1.4, 1.4]) {
		part(g, .7, 1.7, .5, m.pump(), x, 1.2, 4);
		part(g, .5, .45, .02, m.pumpFace(), x, 1.55, 4.26);
		bar(g, v3(x + .36, 1.2, 4), v3(x + .5, .4, 4.4), .03, m.dark());
	}
	part(g, 9, 3.2, 5, m.kiosk(), 0, 1.72, -4.5);
	part(g, 9.4, .25, 5.4, m.rust(), 0, 3.4, -4.5);
	for (const x of [-3, -1]) part(g, 1.6, 1.2, .04, m.dark(), x, 1.9, -1.98);
	part(g, 1.4, .4, .04, m.glass(), -3, 2.3, -1.97);
	part(g, 1.1, 2.1, .04, m.dark(), 2.2, 1.2, -1.98);
	const pole = new three.Group();
	part(pole, .3, 7, .3, m.steel(), 0, 3.5, 0);
	part(pole, 2.6, 1.8, .25, m.sign(), 0, 7.2, 0);
	part(pole, 2.7, .2, .3, m.signRed(), 0, 6.25, 0);
	pole.position.set(9.5, 0, 6.5);
	pole.rotation.z = -.08;
	g.add(pole);
	for (const [x, z] of [
		[5.5, -2.5],
		[6.3, -2.2],
		[5.9, -1.5]
	]) {
		const d = new three.Mesh(new three.CylinderGeometry(.3, .3, .9, 12), m.drum());
		d.position.set(x, .57, z);
		d.castShadow = true;
		g.add(d);
	}
	const fallen = new three.Mesh(new three.CylinderGeometry(.3, .3, .9, 12), m.rust());
	fallen.rotation.z = Math.PI / 2;
	fallen.position.set(7.2, .42, -1.8);
	g.add(fallen);
	const weed = new three.Mesh(new three.IcosahedronGeometry(.45, 0), m.tumble());
	weed.position.set(-8, .5, 6);
	g.add(weed);
