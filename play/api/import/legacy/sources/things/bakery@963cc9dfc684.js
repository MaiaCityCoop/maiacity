//#piece af485012a7c51016c7f5d34e1fbd79e9cf5770e714e296dae69245dc48238ea8
//#piece 26a083596c59ac5a408efaad63f6a5c13046d20ef9762a8cd1b48ecce424902e
//#piece 594ce903a6f2192947a5556f079f24941a1774782da33a406dc0a7d03c24689a
	}
//#piece 39a5f5a6989c17a081207b02df8c94ee80537fbb060ff9d2de99706bb9208b13
*/
//#piece db3009f0a720fb22303a6892b2275d8eea4359f3d3c1da0103725837c70d2ff7
//#piece 454c00e7250af06f645da2cb0f1f19f2998f73b5bd1477607af195657ed4cd8f
//#piece 205fe7b61eeba25966b00fa8b2ac2ab186e52c1d4b586a06b127bf7b4ef50a6a
const mark = (o, legacy) => {
	o.userData.legacy = legacy;
	return o;
};
//#piece f143a70f581e031275f53b2ca4c435c3d1cc3e7b395b8d378022a68003818e3e
}

//#endregion
//#region src/lib/sandbox-2/interior/spaces.ts
//#piece 7600908f7bff1c6b949b14bbb0744d90b54ef3340415dbbeda275873f644e03a
*/
//#piece 1022d716130cfd106bb9a3543b199b757f08123b38e08d9ec859214b850d4d45
	g.position.set(x, 0, z);
	g.rotation.y = rot;
	return g;
}
function bakery(k) {
	const g = new three.Group();
	const cs = [];
	g.add(oven(k, -3.8, 2.2, Math.PI));
	cs.push({
		x: -3.8,
		z: 2.2,
		r: 1.5
	});
	for (const x of [-.4, 3.2]) {
		g.add(k.box(2.6, .9, 1.1, k.oak, x, 0, .6));
		g.add(k.box(2.7, .05, 1.2, k.counter, x, .9, .6));
		for (const hx of [-.6, .6]) {
			g.add(k.box(.55, .02, .55, k.dark, x + hx, .95, .6));
			const pan = new three.Mesh(new three.CylinderGeometry(.2, .18, .12, 16), k.steel);
			pan.position.set(x + hx, 1.03, .6);
			g.add(pan);
		}
		for (let i = 0; i < 4; i++) {
			const loaf = new three.Mesh(new three.SphereGeometry(.13, 10, 8), clay);
			loaf.scale.set(1.4, .7, 1);
			loaf.position.set(x - 1 + i * .25, .99, .95);
			g.add(loaf);
		}
		cs.push({
			x: x - .7,
			z: .6,
			r: 1
		}, {
			x: x + .7,
			z: .6,
			r: 1
		});
	}
	g.add(k.box(6, .05, .05, k.timber, 1.4, 2.6, .6));
	for (let i = 0; i < 14; i++) {
		const h = herb(700 + i, .2);
		delete h.userData.legacy;
		h.position.set(-1.4 + i * .4, 2.2, .6);
		g.add(h);
	}
	const t = k.table(5, 10);
	t.position.set(1, 0, -2.4);
	g.add(t);
	cs.push({
		x: -.5,
		z: -2.4,
		r: 1.3
	}, {
		x: 2.5,
		z: -2.4,
		r: 1.3
	});
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "bakery",
	label: "Bakery & cooking school",
	note: "the clay bread oven, two islands to cook at with pans on the hobs, bread and fruit set out, herbs drying from a rail, the long table where the class eats",
	usedIn: "Dome rooms",
	make: () => centred(bakery(kitOf()).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
