//#piece fbcd81540e5e00b2c220d63aff988ca3e2f1982a94ecbabf7def7a8661883b3d
//#piece aac6eee689c5ba915d21327ffa8144755ae96a3a6ccbea0b1bbb74d7f0d325a4
//#piece 0f0f52189cf21a8ff2ca279ec9cd56aa6bb790a1c46a525695493a66c77b2f6e
		}
	});
}
/** Grey-brown bark in vertical fissures. */
function bark() {
	const size = 256;
//#piece 4c2ffafb7dac9a273ae0a235bceb91666b689ad0a43245700de6360e8c679193
			set$1(img, (y * size + x) * 4, 118 * v, 98 * v, 80 * v);
//#piece 27237e3b0263135176880e7058d27f816f5a4bd75fd8a452c33a11c854454cdb
		}
	});
//#piece 3ca6353d03aca93e08e669edc207c338cbaad714dcd2dd03ff2932fb0083ff57
//#piece 594ce903a6f2192947a5556f079f24941a1774782da33a406dc0a7d03c24689a
	}
//#piece b48a7e5a980aff0a626eccc882dfb94912987a2b4f1f7ff37699a1468a246077
//#piece b76ac2f25b362780e5fa3ee13767445fd937b5736a82b20dee979c449712ab3d
}

//#endregion
//#region src/lib/assets/seeded.js
/** @param {number} seed */
function seeded(seed) {
	let state = seed >>> 0 || 1;
	return () => (state = state * 1664525 + 1013904223 >>> 0) / 4294967296;
//#piece e35bdbc0141fa77f0d95d9eae091966f3cb58aa9c90b2224c2ef595ed6bf3ae3
*/
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const barkMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
//#piece b3817a18985194c6270eb3f83b684b3ba8fe0c85844a49cdbc9aae0cff6836f0
//#piece 7c7f0c426a50273d41ec04fa3e9c4adb11a4cc07e95b9060ea3ee811507b545d
const bananaStemMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	color: "#6f8a3f",
	roughness: .7
})))();
const bananaLeafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	color: "#5d9a3c",
	side: three.DoubleSide,
	roughness: .55
})))();
const card = /* @__PURE__ */ (() => shared(() => new three.PlaneGeometry(1, 1)))();
//#piece b50f4ad9e8ad72936f2c55806d4aabcc22fe4cecab0de597fcf1dbab45a625a3
//#piece 54aab0be1538dd2ff8344fcd2f3ee913d3634a5d18a86b0d5f5b1e1c273d6b62
const mark = (o, legacy) => {
	o.userData.legacy = legacy;
	return o;
};
/** A broad fruit tree: mango, avocado or citrus. `scale` 1 is a mature tree of about six metres. */
function fruitTree(kind, seed, scale = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const h = (kind === "citrus" ? 2.2 : 3.2) * scale;
	const crown = (kind === "citrus" ? 1.6 : kind === "mango" ? 2.8 : 2.4) * scale;
	trunk(g, h, .16 * scale + .05, (r() - .5) * .12);
	for (let i = 0; i < 3; i++) {
		const limb = new three.Mesh(trunkGeo(), barkMat());
		limb.scale.set(.07 * scale, crown * .8, .07 * scale);
		limb.position.y = h * .85;
		limb.rotation.set((r() - .5) * 1.2, r() * Math.PI, (r() - .5) * 1.2);
		g.add(limb);
	}
	canopy(g, r, 0, h + crown * .55, 0, crown, crown * .75, Math.round(60 * scale + 30), kind === "citrus" ? fineLeafMat() : leafMat(), 1.3 * scale);
	if (kind === "mango") {
		hang(g, r, h + crown * .35, crown * .9, crown * .5, 14, fruit.mango(), [
			.05,
			.075,
			.045
		]);
		hang(g, r, h + crown * .35, crown * .9, crown * .5, 8, fruit.mangoRipe(), [
			.05,
			.075,
			.045
		]);
	} else if (kind === "avocado") hang(g, r, h + crown * .35, crown * .9, crown * .5, 16, fruit.avocado(), [
		.06,
		.09,
		.06
	]);
	else {
		hang(g, r, h + crown * .3, crown * .95, crown * .6, 18, fruit.orange(), [
			.06,
			.06,
			.06
		]);
		hang(g, r, h + crown * .3, crown * .95, crown * .6, 6, fruit.lemon(), [
			.05,
			.065,
			.05
		]);
	}
	return {
		object: mark(g, {
			plant: kind,
			size: scale
		}),
		radius: .35 * scale
	};
}
/** A banana plant: a green pseudostem, huge paddle leaves, and a hanging bunch. */
function banana(seed, height = 3.2) {
	const r = seeded(seed);
	const g = new three.Group();
	const stem = new three.Mesh(trunkGeo(), bananaStemMat());
	stem.scale.set(.16, height, .16);
	g.add(stem);
	const leaf = new three.Shape();
	leaf.moveTo(0, 0);
	leaf.quadraticCurveTo(.35, .9, 0, 2.2);
	leaf.quadraticCurveTo(-.35, .9, 0, 0);
	const leafGeo = new three.ShapeGeometry(leaf, 8);
	for (let i = 0; i < 9; i++) {
		const l = new three.Mesh(leafGeo, bananaLeafMat());
		l.position.y = height * (.85 + r() * .15);
		l.rotation.set(-.5 - r() * .8, i / 9 * Math.PI * 2, 0, "YXZ");
		l.scale.setScalar(.9 + r() * .4);
		l.castShadow = true;
		g.add(l);
	}
	const bunch = new three.Group();
	bunch.position.set(.25, height * .7, 0);
	for (let i = 0; i < 14; i++) {
		const b = new three.Mesh(sphere(), fruit.banana());
		b.position.set(Math.cos(i) * .1, -i * .04, Math.sin(i) * .1);
		b.scale.set(.03, .09, .03);
		bunch.add(b);
	}
	g.add(bunch);
	return {
		object: mark(g, {
			plant: "banana",
			size: height / 3.2
		}),
		radius: .25
	};
}
//#piece 4d131c85f50994cb5ddd101c0c4613ada8655ffe26cbc1a2734e06b483b8343f
	if (r() < .5) hang(g, r, .6 * size, .5 * size, .3, 10, r() < .5 ? fruit.orange() : fruit.mangoRipe(), [
		.03,
		.03,
		.03
	]);
	return {
		object: mark(g, {
			plant: "shrub",
			size
		}),
		radius: 0
	};
}
//#piece f143a70f581e031275f53b2ca4c435c3d1cc3e7b395b8d378022a68003818e3e
}
//#piece a96c3f94bc7d4d08174be4522f2899c76600564786b89506c793eb7c8f3dfc66
/** Layer 5 — ground cover: a low carpet of clover, white flowers in it. */
function clover(seed, size = 1.2) {
	const r = seeded(seed);
	const g = new three.Group();
	for (let i = 0; i < 12; i++) {
		const c = new three.Mesh(card(), fineLeafMat());
		c.rotation.set(-Math.PI / 2 + (r() - .5) * .5, 0, r() * 6.28);
		c.position.set((r() - .5) * size, .05 + r() * .05, (r() - .5) * size);
		c.scale.setScalar(.45);
		g.add(c);
	}
	for (let i = 0; i < 6; i++) {
		const f = new three.Mesh(sphere(), more.clover());
		f.position.set((r() - .5) * size, .12, (r() - .5) * size);
		f.scale.setScalar(.025);
		g.add(f);
	}
	return g;
}
const garden = /* @__PURE__ */ (() => ({
//#piece b9644cc60a186c40563079714bd70fb04bb08280ffd460591bafe57a17e6ff91
/** a small round thing seen only up close (a radish's shoulder): twenty faces */
const tiny = /* @__PURE__ */ (() => shared(() => new three.IcosahedronGeometry(1, 0)))();
const stickGeo = /* @__PURE__ */ (() => shared(() => new three.CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0)))();
//#piece 8950512b11c2f0d8d7dfa8e162ac2e8ad799d2f673e7b813191a3b75173d7e69
/** Strawberries for ground cover: low leaves, red berries showing. */
function strawberries(seed, size = .9) {
	const g = clover(seed, size);
	const r = seeded(seed + 1);
	for (let i = 0; i < 8; i++) {
		const b = new three.Mesh(small(), garden.strawberry());
		b.position.set((r() - .5) * size, .07, (r() - .5) * size);
		b.scale.set(.028, .035, .028);
		g.add(b);
	}
	return g;
}
function lettuceHead(g, r, x, z, red) {
	const leaf = new three.CircleGeometry(.1, 6);
	for (let i = 0; i < 8; i++) {
		const l = new three.Mesh(leaf, red && i % 2 ? garden.lettuceRed() : garden.lettuce());
		const a = i / 8 * Math.PI * 2 + r();
		l.position.set(x + Math.cos(a) * .06, .08 + i % 3 * .02, z + Math.sin(a) * .06);
		l.rotation.set(-.6 - r() * .5, a, 0, "YXZ");
		g.add(l);
	}
}
const CROPS = [
	"lettuce",
	"tomato",
	"cucumber",
	"pepper",
	"chard",
	"beans",
	"aubergine",
	"strawberry",
	"herbs"
];
function crop(kind, seed, len) {
	const r = seeded(seed);
	const g = new three.Group();
	const along = (step, f, rows = [-.25, .25]) => {
		for (let x = -len / 2 + step / 2; x < len / 2; x += step) rows.forEach((z, i) => f(x + (i % 2 ? step / 2 : 0) * .5, z));
	};
	if (kind === "lettuce") along(.32, (x, z) => lettuceHead(g, r, x, z, r() < .35), [
		-.3,
		0,
		.3
	]);
	else if (kind === "radish") along(.16, (x, z) => {
		const leaf = new three.CircleGeometry(.045, 5);
		for (let i = 0; i < 5; i++) {
			const l = new three.Mesh(leaf, garden.lettuce());
			const a = i / 5 * Math.PI * 2 + r();
			l.position.set(x + Math.cos(a) * .035, .07 + r() * .02, z + Math.sin(a) * .035);
			l.rotation.set(-.9 - r() * .4, a, 0, "YXZ");
			g.add(l);
		}
		const root = new three.Mesh(tiny(), garden.radish());
		root.position.set(x, .015, z);
		root.scale.setScalar(.022 + r() * .01);
		g.add(root);
	}, [
		-.32,
		-.11,
		.11,
		.32
	]);
	else if (kind === "kale") along(.42, (x, z) => {
		const leaf = new three.CircleGeometry(.11, 7);
		for (let i = 0; i < 7; i++) {
			const l = new three.Mesh(leaf, i % 3 ? garden.kale() : garden.lettuce());
			const a = i / 7 * Math.PI * 2 + r();
			l.position.set(x + Math.cos(a) * .07, .12 + i * .025, z + Math.sin(a) * .07);
			l.rotation.set(-.35 - r() * .3, a, 0, "YXZ");
			l.scale.set(.8, 1.4, 1);
			g.add(l);
		}
	});
	else if (kind === "tomato") along(.6, (x, z) => {
		g.add(stick(garden.stake(), x, z, 1.6));
		canopy(g, r, x, .85, z, .25, .7, 14, fineLeafMat(), .35);
		for (let i = 0; i < 9; i++) {
			const t = new three.Mesh(small(), i < 6 ? garden.tomato() : garden.papayaGreen());
			t.position.set(x + (r() - .5) * .4, .4 + r() * 1, z + (r() - .5) * .4);
			t.scale.setScalar(.04);
			g.add(t);
		}
	});
	else if (kind === "cucumber") {
		for (const x of [
			-len / 2 + .1,
			0,
			len / 2 - .1
		]) for (const side of [-1, 1]) {
			const pole = stick(garden.stake(), x, side * .35, 1.9);
			pole.rotation.x = side * .18;
			g.add(pole);
		}
		for (const side of [-1, 1]) {
			const net = new three.Mesh(card(), garden.net());
			net.scale.set(len - .2, 1.8, 1);
			net.position.set(0, .95, side * .2);
			net.rotation.x = side * .18;
			g.add(net);
			for (let i = 0; i < len * 14; i++) {
				const c = new three.Mesh(card(), leafMat());
				const y = .2 + r() * 1.6;
				c.position.set(-len / 2 + .2 + r() * (len - .4), y, side * (.36 - y * .18));
				c.rotation.set(r() * 3, r() * 3, r() * 3);
				c.scale.setScalar(.3);
				g.add(c);
			}
			for (let i = 0; i < len * 3; i++) {
				const f = new three.Mesh(small(), garden.cucumber());
				const y = .3 + r() * 1.2;
				f.position.set(-len / 2 + .3 + r() * (len - .6), y, side * (.42 - y * .18));
				f.scale.set(.025, .1, .025);
				g.add(f);
			}
		}
	} else if (kind === "pepper" || kind === "aubergine") along(.5, (x, z) => {
		canopy(g, r, x, .35, z, .22, .2, 9, leafMat(), .28);
		for (let i = 0; i < 5; i++) {
			const f = new three.Mesh(small(), kind === "aubergine" ? garden.aubergine() : r() < .5 ? garden.pepperRed() : garden.pepperYellow());
			f.position.set(x + (r() - .5) * .3, .2 + r() * .2, z + (r() - .5) * .3);
			f.scale.set(kind === "aubergine" ? .05 : .035, kind === "aubergine" ? .1 : .06, kind === "aubergine" ? .05 : .035);
			g.add(f);
		}
	});
	else if (kind === "chard") along(.35, (x, z) => {
		for (let i = 0; i < 6; i++) {
			const a = r() * 6.28;
			const stem = stick(garden.chard[Math.floor(r() * 3)](), x, z, .3, .012);
			stem.rotation.set(Math.cos(a) * .35, 0, Math.sin(a) * .35);
			g.add(stem);
			const l = new three.Mesh(card(), garden.chardLeaf());
			l.scale.set(.16, .28, 1);
			l.position.set(x + Math.sin(a) * .1, .42, z + Math.cos(a) * .1);
			l.rotation.set(-.3, a, 0, "YXZ");
			g.add(l);
		}
	});
	else if (kind === "beans") along(1.1, (x) => {
		for (let k = 0; k < 4; k++) {
			const a = k / 4 * Math.PI * 2;
			const cane = stick(garden.stake(), x + Math.cos(a) * .3, Math.sin(a) * .3, 2.1, .015);
			cane.rotation.set(-Math.sin(a) * .15, 0, Math.cos(a) * .15);
			g.add(cane);
		}
		canopy(g, r, x, 1, 0, .3, .9, 30, fineLeafMat(), .3);
		for (let i = 0; i < 14; i++) {
			const pod = new three.Mesh(small(), garden.bean());
			pod.position.set(x + (r() - .5) * .5, .4 + r() * 1.3, (r() - .5) * .5);
			pod.scale.set(.012, .08, .012);
			g.add(pod);
		}
	}, [0]);
	else if (kind === "strawberry") along(.45, (x, z) => g.add(strawberries(seed + Math.round(x * 10), .4).translateX(x).translateZ(z)));
	else along(.3, (x, z) => g.add(herb(seed + Math.round(x * 100 + z * 10), .18 + r() * .1).translateX(x).translateZ(z)), [
		-.3,
		0,
		.3
	]);
	g.traverse((o) => o.castShadow = false);
	return mark(g, {
		crop: kind,
		len
	});
}

//#endregion
//#piece a290694ec2c25c561459854b82dd15cea24a30bd0acf0d629d8e8d0476e4fa98
}
//#piece 7e3083af9bc6dd8497694a60537f710487cb8169ad597349cd78a2aeb1b61618
//#piece b41d5c6663f8c053838b96990cf45d86ed2277b72cf46c3999a41eebf001a233
}
/**
//#piece 1dffdc19e918a2aaa2ea5f6b905e8248ad91292912729784e6b37317bf7be574
	return g;
}
function bed(m, w = 1.6) {
	const g = new three.Group();
	g.add(box(w + .1, .35, 2.1, m.oak(1)));
	g.add(box(w, .2, 2, m.linen, 0, .35));
	g.add(box(w * .4, .14, .4, m.linen, -w * .22, .55, -.75));
	g.add(box(w * .4, .14, .4, m.linen, w * .22, .55, -.75));
	g.add(box(w, .06, .9, m.cushion, 0, .55, .45));
	g.add(box(w + .1, .9, .08, m.oak(1), 0, 0, -1.05));
	return g;
}
//#piece f82652e988ae4b96871439a36c277fb878e655f69a185bf876093d8f0bb51943
	}
	return g;
}
function lantern(m, r, y) {
	const g = new three.Group();
	const s = new three.Mesh(new three.SphereGeometry(r, 20, 12), m.paper);
	s.scale.y = .72;
	s.position.y = y;
	g.add(s);
	const cable = new three.Mesh(new three.CylinderGeometry(.008, .008, 3, 4), m.dark);
	cable.position.y = y + 1.5;
	g.add(cable);
	return g;
}
/**
* The glamping dome's inside, in `scene` round its middle: its v1 in Sandbox 3 (raised here, `raiseInterior`), and from
* its v2 the asset box's (../../buildings/glamp.js). `addLamp` hangs a lamp (its light, and with `floor` a cone of it),
* `glowMat` is what a lamp's shade glows with. Hands back the things in the way and where it is walked in from.
*/
function glampInside({ scene, R, m, addLamp, glowMat }) {
	const colliders = [];
	const floor = new three.Mesh(new three.CircleGeometry(R, 64), m.oak(R / 1.5));
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = .01;
	floor.receiveShadow = true;
	scene.add(floor);
	const at = (rr, a) => polar(rr, a);
	const put = (o, rr, a, face = a + Math.PI, collide = 0) => {
		const [x, z] = at(rr, a);
		o.position.set(x, o.position.y, z);
		o.rotation.y = face;
		scene.add(o);
		if (collide) colliders.push({
			x,
			z,
			r: collide
		});
	};
	const rug = new three.Mesh(new three.CircleGeometry(1.8, 40), m.rug);
	rug.rotation.x = -Math.PI / 2;
	rug.position.y = .02;
	put(rug, 4.4, -1.05);
	rug.rotation.set(-Math.PI / 2, 0, 0);
	put(sofa(m, 2.8), 5.6, -1.05, -1.05 + Math.PI, 1.4);
	put(box(1.1, .4, .6, m.oak(1)), 4.2, -1.05, -1.05, .6);
	put(box(.6, .75, .55, m.dark), 6.6, -1.75, -1.75 + Math.PI, .5);
	const [fx, fz] = at(6.6, -1.75);
	const flue = new three.Mesh(new three.CylinderGeometry(.08, .08, R * .9, 10), m.dark);
	flue.position.set(fx * .9, .75 + R * .9 / 2, fz * .9);
	scene.add(flue);
	put(box(1.2, 2, .4, m.oak(1)), 6.9, -.55, -.55 + Math.PI);
	for (let k = 0; k < 4; k++) {
		const a = .85 + k * .17;
		put(box(1.05, .9, .62, m.oak(1)), 7, a, a + Math.PI, .55);
		put(box(1.08, .05, .66, m.counter), 7, a, a + Math.PI);
		const c = scene.children[scene.children.length - 1];
		c.position.y = .9;
	}
	put(box(1, .9, .5, m.dark), 7.1, 1.55, 1.55 + Math.PI);
	put(table(m, 1.6, 4), 4.6, 1.2, 1.2 + Math.PI / 2, 1.2);
	const screen = (rr0, rr1, a) => {
		const [x, z] = at((rr0 + rr1) / 2, a);
		scene.add(box(.1, 2.2, rr1 - rr0, m.oak(.5, 1), x, 0, z, a));
	};
	for (const a of [
		2.35,
		2.95,
		-2.95,
		-2.35
	]) screen(3.4, 7.2, a);
	put(bed(m, 1.7), 6.2, 2.65, 2.65 + Math.PI, 1.1);
	put(bed(m, .95), 6.2, 3.02, 3.14, .7);
	put(bed(m, .95), 6.2, -3.02, 3.14, .7);
	const pod = new three.Mesh(new three.CylinderGeometry(1.2, 1.2, 2.3, 24, 1, true, .5, Math.PI * 2 - 1), m.oak(3, 1));
	pod.material.side = three.DoubleSide;
	const [px, pz] = at(5.9, -2.65);
	pod.position.set(px, 1.15, pz);
	pod.rotation.y = -2.65 + Math.PI;
	scene.add(pod);
	colliders.push({
		x: px,
		z: pz,
		r: 1.25
	});
	const planter = new three.Mesh(new three.CylinderGeometry(1.3, 1.4, .55, 32), m.lime(3, .3));
	planter.position.y = .275;
	scene.add(planter);
	const planterSoil = new three.Mesh(new three.CircleGeometry(1.25, 32), m.soil(1));
	planterSoil.rotation.x = -Math.PI / 2;
	planterSoil.position.y = .56;
	scene.add(planterSoil);
	const lemon = fruitTree("citrus", 77, .75);
	lemon.object.position.y = .55;
	scene.add(lemon.object);
	colliders.push({
		x: 0,
		z: 0,
		r: 1.5
	});
	for (let k = 0; k < 6; k++) {
		const h = herb(80 + k, .25);
		const [hx, hz] = at(.9, k);
		h.position.set(hx, .56, hz);
		scene.add(h);
	}
	for (const a of [
		-.55,
		.55,
		1.95
	]) {
		const patch = crop(CROPS[Math.round(a * 10 + 20) % CROPS.length], 90 + Math.round(a * 10), 2.2);
		patch.position.y = .02;
		put(patch, 7.3, a, a + Math.PI / 2, .9);
	}
	for (let k = 0; k < 5; k++) {
		const potA = -1.9 + k * .28;
		const pot = new three.Mesh(new three.CylinderGeometry(.28, .22, .45, 16), m.dark);
		const [x, z] = at(7.4, potA);
		pot.position.set(x, .22, z);
		scene.add(pot);
		const plant = k % 2 ? shrub(120 + k, 1.1) : banana(130 + k, 1.6);
		plant.object.position.set(x, .4, z);
		scene.add(plant.object);
	}
	scene.add(lantern(m, .4, 3.4));
	const l2 = lantern(m, .3, 2.6);
	const [lx, lz] = at(4.6, 1.2);
	l2.position.set(lx, 0, lz);
	scene.add(l2);
	addLamp(0, 3.1, 0, 16, 11, .56);
	addLamp(lx, 2.35, lz, 10, 8, 0);
	for (const [rr, a, base] of [
		[
			6.4,
			1.1,
			10
		],
		[
			5.8,
			2.65,
			6
		],
		[
			5.8,
			-3.02,
			6
		],
		[
			5.4,
			-1.05,
			8
		]
	]) {
		const [x, z] = at(rr, a);
		scene.add(box(.3, .06, .3, glowMat, x, 2.45, z));
		addLamp(x, 2.3, z, base, 7);
	}
	const gh = 1.1 / R;
	const plinth = new three.Mesh(new three.CylinderGeometry(R + .35, R + .45, .45, 96, 1, true, gh, Math.PI * 2 - 2 * gh), m.lime(Math.PI * R / 1.5, .3));
	plinth.material.side = three.DoubleSide;
	plinth.position.y = .2;
	scene.add(plinth);
	const deck = new three.Mesh(new three.CircleGeometry(3.4, 48), m.oak(4));
	deck.rotation.x = -Math.PI / 2;
	deck.position.set(0, .04, R + 2.2);
	deck.receiveShadow = true;
	scene.add(deck);
	const outTable = table(m, 1.2, 4);
	outTable.position.set(1.8, .06, R + 2.4);
	scene.add(outTable);
	colliders.push({
		x: 1.8,
		z: R + 2.4,
		r: 1.1
	});
	return {
		colliders,
		start: {
			x: 0,
			z: R - 2.2,
			look: 0
		}
	};
}

//#endregion
//#region src/lib/buildings/glamp.js
/** The glamping dome: its shell, its door and the home inside it, the middle of its floor at the origin. */
function glampDome() {
	const spec = DOMES.glamp;
	const R = spec.diameter / 2;
	const m = mats();
	const g = new three.Group();
	g.name = "glamping-dome";
	const shell = geodesic(spec, m, "glamp");
	g.add(shell.group);
	for (const hole of shell.holes) g.add(portal(m, hole, "glamp"));
	const glow = new three.MeshStandardMaterial({
		color: "#fff0d0",
		emissive: "#ffc070",
		emissiveIntensity: .1,
		roughness: .5
	});
	const home = glampInside({
		scene: g,
		R,
		m,
		addLamp: () => {},
		glowMat: glow
	});
	g.userData = { walk: {
		x: home.start.x,
		z: home.start.z,
		yaw: home.start.look,
		lamps: []
	} };
	return g;
}

//#endregion
//#region src/lib/buildings/built.js
/** @typedef {import('$lib/models').Model} Model */
/**
* the buildings' older versions, by id, each with its frozen builder (the tent's, the factory's and the glamping
* dome's v1, Sandbox 3's interiors, have none here; every other one is at v1)
//#piece 5e378a537352acd822cd9b2a03558e68e385c183652007b1e2d9bd95260c7a3e
*/
const HISTORY = { "dome-glamp": [{
	v: 1,
	date: "2026-10-05",
	note: "Sandbox 3’s glamping dome: its interior, raised by that world’s own code (./inside.js)"
}, {
	v: 2,
	date: "2026-10-26",
	note: "Built in the asset box, so the Maia City vault can hold it: the same shell and door, the home for four round its garden, the stone ring and the deck, as by day; walked in by its own shape"
//#piece e6c3419a4ae71798ae1dff4cfbcc35e259fa676819653591dd6ab68b2ebd7ba2
*  together; and at its end the bell tent (./tent.js), the solar factory dome (./factory.js) and the glamping
*  dome (./glamp.js) from their v2, which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
const WAYSIDE_LIST = /* @__PURE__ */ (() => [{
	id: "dome-glamp",
	label: "Glamping dome",
	group: "Tents and domes",
	note: "the first home after the tents: a home for four in zones round a garden under the skylight, the living room by its wood stove, the kitchen along the glass, two sleeping nooks and the bathroom behind timber screens, a deck at its door. Walk in",
	usedIn: "Sandbox 3",
	make: () => glampDome()
//#piece e6f5fc5cbe91444d6d22bebd55e63337f7cc8dbc071b68e9b9aa56be3f9706a7
