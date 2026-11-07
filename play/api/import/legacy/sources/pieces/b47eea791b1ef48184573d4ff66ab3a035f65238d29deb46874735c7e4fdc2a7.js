function kiosk(k, mat) {
	const g = new three.Group();
	g.add(k.box(3.2, 2.7, 2.2, k.oak, 0, 0, -.2));
	g.add(k.box(3.4, .08, .6, k.counter, 0, 1.05, 1));
	g.add(k.box(3.2, 1.05, .5, k.lime, 0, 0, 1));
	const awning = new three.Mesh(new three.PlaneGeometry(3.6, 1.4), mat);
	awning.position.set(0, 2.55, 1.35);
	awning.rotation.x = -1.05;
	awning.castShadow = true;
	g.add(awning);
	g.add(k.box(.5, .45, .4, k.steel, -.8, 1.13, .95));
	g.add(k.box(1, .7, .05, k.dark, .9, 1.5, .92));
