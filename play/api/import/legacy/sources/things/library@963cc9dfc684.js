//#piece 6fddda360547e24e6d8204e4487d5c0193f797b24f7fad7b4880fa8eba5dc00a
function library(k, seed) {
	const g = new three.Group();
	const cs = [];
	const r = seeded(seed);
	const spines = [
		...glaze,
		...awnings,
		k.linen
	];
	for (const x of [
		-4,
		-1.3,
		1.4,
		4.1
	]) {
		g.add(k.box(2.5, 2.2, .4, k.oak, x, 0, 3.3));
		for (let lv = 0; lv < 5; lv++) {
			let bx = x - 1.15;
			while (bx < x + 1.1) {
				const w = .04 + r() * .05;
				const h = .26 + r() * .12;
				g.add(k.box(w, h, .26, spines[Math.floor(r() * spines.length)], bx + w / 2, .08 + lv * .43, 3.15));
				bx += w + .005;
			}
		}
		cs.push({
			x,
			z: 3.3,
			r: 1.2
		});
	}
	const rug = new three.Mesh(new three.CircleGeometry(2.6, 32), k.rug);
	rug.rotation.x = -Math.PI / 2;
	rug.position.set(0, .03, 0);
	g.add(rug);
	for (const [x, z, rot] of [
		[
			-1.8,
			-.6,
			.5
		],
		[
			1.8,
			-.6,
			-.5
		],
		[
			0,
			1.4,
			Math.PI
		]
	]) {
		const s = k.sofa(1.9);
		s.position.set(x, 0, z);
		s.rotation.y = rot;
		g.add(s);
		cs.push({
			x,
			z,
			r: 1.1
		});
	}
	g.add(k.box(1, .4, .6, k.oak, 0, 0, -.1));
	const l = k.lantern(.6, 4);
	g.add(l);
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "library",
	label: "Library",
	note: "four tall oak cases of books along the glass, three sofas round a low table on a round rug, a paper lantern overhead",
	usedIn: "Dome rooms",
	make: () => centred(library(kitOf(), 5).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
