//#piece b19cda18247f876b11bd6befeef59a96474c3d0167e756dd02323a7b77016dfb
//#piece ffaedeced2bcb47d8db021091b46d95c120a07cbd83d3a8951b4d3457afba264
};
/**
* The terraces' furniture: rounded, handmade, and never twice the same in a row.
* Built in a local frame: +z points out over the balustrade, the set centred on
* the origin; kind 0..3 picks which.
*/
function terraceSet(kind, seed) {
	const r = seeded(seed);
	const g = new three.Group();
	const plaster = PLASTER[seed % PLASTER.length]();
	const accent = M.felt[seed % M.felt.length]();
	if (kind === 0) {
		g.add(new three.Mesh(new three.CylinderGeometry(.75, .75, .06, 32), M.wood()).translateY(.74));
		g.add(new three.Mesh(new three.CylinderGeometry(.14, .34, .74, 16), M.darkWood()).translateY(.37));
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI * 2;
			g.add(new three.Mesh(new three.CylinderGeometry(.2, .17, .45, 18), M.wood()).translateX(Math.sin(a) * 1.15).translateY(.225).translateZ(Math.cos(a) * 1.15));
		}
		g.add(new three.Mesh(new three.SphereGeometry(.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.darkWood()).translateY(.94));
	} else if (kind === 1) {
		for (const x of [-.95, .95]) {
			const bed = new three.Group();
			bed.add(new three.Mesh(round(.8, .3, 1.9, .14), M.wood()).translateY(.15));
			bed.add(new three.Mesh(round(.74, .16, 1.8, .08), M.wool()).translateY(.38));
			const back = new three.Mesh(round(.74, .14, .7, .07), accent);
			back.position.set(0, .6, -.62);
			back.rotation.x = .7;
			bed.add(back);
			bed.position.x = x;
			g.add(bed);
		}
		g.add(new three.Mesh(new three.CylinderGeometry(.3, .3, .4, 20), plaster).translateY(.2));
	} else if (kind === 2) {
		const bench = new three.Mesh(new three.TorusGeometry(1.25, .24, 10, 28, Math.PI), plaster);
		bench.rotation.x = Math.PI / 2;
		bench.scale.z = 1.4;
		bench.position.set(0, .3, -.2);
		g.add(bench);
		for (let i = 0; i < 4; i++) {
			const a = Math.PI * (.15 + i / 3 * .7);
			g.add(new three.Mesh(round(.45, .1, .45, .05), accent).translateX(Math.cos(a) * 1.25).translateY(.58).translateZ(-.2 - Math.sin(a) * 1.25));
		}
		g.add(new three.Mesh(new three.CylinderGeometry(.5, .45, .4, 24), M.wood()).translateY(.2).translateZ(.35));
		for (const x of [-1.8, 1.8]) {
			g.add(new three.Mesh(new three.SphereGeometry(.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), plaster).translateX(x).translateY(.1).rotateX(Math.PI));
			const olive = potted("olive", seed + Math.round(x * 10), .9);
			olive.position.set(x, .1, 0);
			g.add(olive);
		}
	} else {
		const frame = new three.Mesh(new three.TorusGeometry(1.4, .07, 8, 24, Math.PI), M.wood());
		frame.position.y = .05;
		g.add(frame);
		for (const x of [-.7, .7]) {
			g.add(new three.Mesh(new three.CylinderGeometry(.015, .015, .7, 6), M.darkWood()).translateX(x).translateY(1.2));
			const egg = new three.Mesh(new three.SphereGeometry(.5, 20, 14, 0, Math.PI * 2, .35, Math.PI - .35), M.basket());
			egg.scale.set(1, 1.2, 1);
			egg.position.set(x, .85, 0);
			egg.rotation.x = -.25;
			g.add(egg);
			g.add(new three.Mesh(round(.55, .1, .5, .05), M.wool()).translateX(x).translateY(.52).translateZ(.05));
		}
		g.add(houseplant("monstera", seed + 3, 1.3).translateX(1.9));
	}
	for (let i = 0; i < 2; i++) {
		const kind = r() < .5 ? "lavender" : "rosemary";
		g.add(potted(kind, seed * 3 + i, 1.2).translateX(i ? 2.2 : -2.2).translateZ(.6));
	}
//#piece bb65cd02e80011b7f9d8a1260660f402cf3645adae354ddab08ad74cfc1c1a34
