/** A bus stop on the dusty highway: a concrete slab, a rusty corrugated roof on two steel posts, a plank bench, a
*  round sign on a pole and a faded timetable. 4 × 2 m, 2.6 m high. */
function busStop() {
	const g = new three.Group();
	g.name = "bus-stop";
	part(g, 4.4, .15, 2.2, m.concrete(), 0, .075, 0);
	for (const x of [-1.8, 1.8]) bar(g, v3(x, .15, -.8), v3(x, 2.5, -.8), .05, m.steel());
	for (const x of [-1.8, 1.8]) bar(g, v3(x, .15, -.8), v3(x, 2.3, .6), .03, m.steel());
	const roof = part(g, 4.4, .05, 2, m.corrugated(), 0, 2.5, -.1);
	roof.rotation.x = .12;
	for (let x = -2; x <= 2; x += .4) part(g, .04, .03, 2, m.rust(), x, 2.53, -.1);
	part(g, 3.2, .06, .4, m.plank(), 0, .5, -.5);
	for (const x of [-1.4, 1.4]) part(g, .08, .4, .35, m.steel(), x, .3, -.5);
	part(g, 3.2, .3, .04, m.plank(), 0, .85, -.72);
	part(g, .8, 1, .03, m.sign(), 1.1, 1.5, -.83);
	bar(g, v3(2.6, 0, .9), v3(2.6, 2.6, .9), .04, m.steel());
	const disc = new three.Mesh(new three.CylinderGeometry(.32, .32, .03, 20), m.signRed());
	disc.rotation.x = Math.PI / 2;
	disc.position.set(2.6, 2.6, .9);
	disc.castShadow = true;
	g.add(disc);
	const inner = new three.Mesh(new three.CylinderGeometry(.22, .22, .035, 20), m.sign());
	inner.rotation.x = Math.PI / 2;
	inner.position.set(2.6, 2.6, .9);
	g.add(inner);
