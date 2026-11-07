/** The bread oven, a clay dome on a stone plinth — for the bakery inside and the pizza square outside. */
function oven(k, x, z, rot = 0) {
	const g = new three.Group();
	g.add(k.box(2.4, .9, 2.2, k.lime));
	const d = new three.Mesh(new three.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), clay);
	d.position.y = .9;
	d.scale.set(1, .85, 1);
	d.castShadow = true;
	g.add(d);
	const mouth = new three.Mesh(new three.CircleGeometry(.32, 16, 0, Math.PI), k.dark);
	mouth.position.set(0, .92, .98);
	g.add(mouth);
	g.add(k.box(.22, 1.2, .22, brick, 0, 1.5, -.5));
	for (let i = 0; i < 8; i++) {
		const log = new three.Mesh(new three.CylinderGeometry(.07, .07, .7, 6), k.timber);
		log.rotation.z = Math.PI / 2;
		log.position.set(1.6, .08 + Math.floor(i / 4) * .14, -.5 + i % 4 * .15);
		g.add(log);
