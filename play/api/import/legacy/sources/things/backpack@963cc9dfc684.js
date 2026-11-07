//#piece 4a02c396ad62bcc353e0ee1be1e07c27cb15199254e83d201107ad6bae1109c0
//#piece 0b1b4e5274875f6cec11d5d89a5530bebc5ab7573f7c21703d859513d53b8c64
}
const v3 = (x, y, z) => new three.Vector3(x, y, z);

//#endregion
//#piece b48190ee01f7099275c7cf20a7700c12603d831fa5ee6c18e7f33ccfdc98449a
	return g;
}
//#piece 52d2b024372757435624c295e058ef2a384ed9caa03a5369316f4273a455ecac
	};
	return g;
}
/** the pack's measures: about 35 l, 32 cm across, 22 cm deep, its opening's rim 46 cm up */
const PACK = {
	w: .32,
	d: .22,
	rim: .48,
	top: .42,
	floor: .3
};
/** an open shell of fabric: a rounded rectangle w × d (corners `r`), walls `t` thick, from y0 up to y1, shaped by
*  `shape(y)` → [how much narrower across, how much fuller front to back] */
function shell(w, d, y0, y1, t, r, mat, shape) {
	const rounded = (W, D, R) => {
		const s = new three.Shape();
		s.moveTo(-W / 2 + R, -D / 2);
		s.lineTo(W / 2 - R, -D / 2);
		s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + R);
		s.lineTo(W / 2, D / 2 - R);
		s.quadraticCurveTo(W / 2, D / 2, W / 2 - R, D / 2);
		s.lineTo(-W / 2 + R, D / 2);
		s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - R);
		s.lineTo(-W / 2, -D / 2 + R);
		s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + R, -D / 2);
		return s;
	};
	const outer = rounded(w, d, r);
	outer.holes.push(rounded(w - 2 * t, d - 2 * t, Math.max(.005, r - t)));
	const geo = new three.ExtrudeGeometry(outer, {
		depth: y1 - y0,
		bevelEnabled: false,
		curveSegments: 6,
		steps: 8
	});
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i) + y0, [kx, kz] = shape(y);
		pos.setXYZ(i, pos.getX(i) * kx, y, pos.getZ(i) * kz);
	}
	geo.computeVertexNormals();
	const mesh = new three.Mesh(geo, mat);
	mesh.castShadow = mesh.receiveShadow = true;
	return mesh;
}
/** a flat strap along a smooth curve through `pts` (a shoulder strap, a hip belt's wing): `w` wide across x, `t` thick,
*  padded (rounded in section) */
function strap(g, pts, w, t, mat) {
	const curve = new three.CatmullRomCurve3(pts);
	const N = 28, sides = 10, P = [], idx = [];
	const across = new three.Vector3(1, 0, 0);
	for (let i = 0; i <= N; i++) {
		const u = i / N, c = curve.getPointAt(u), tan = curve.getTangentAt(u);
		const side = across.clone().addScaledVector(tan, -across.dot(tan)).normalize(), up = new three.Vector3().crossVectors(tan, side);
		const taper = .75 + .25 * Math.sin(Math.PI * Math.min(1, u * 1.4));
		for (let k = 0; k < sides; k++) {
			const a = k / sides * Math.PI * 2;
			const p = c.clone().addScaledVector(side, Math.cos(a) * w * taper / 2).addScaledVector(up, Math.sin(a) * t / 2);
			P.push(p.x, p.y, p.z);
		}
		if (i) for (let k = 0; k < sides; k++) {
			const a = (i - 1) * sides + k, b = (i - 1) * sides + (k + 1) % sides, c2 = i * sides + k, d = i * sides + (k + 1) % sides;
			idx.push(a, c2, b, b, c2, d);
		}
	}
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.Float32BufferAttribute(P, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	const mesh = new three.Mesh(geo, mat);
	mesh.castShadow = true;
	g.add(mesh);
	return mesh;
}
/** A hiker's backpack, about 35 l: a rust-red body, 32 × 22 cm and 46 cm to its rim, a drawstring collar, a lid
*  pocket on top hinged at the back; a front pocket, mesh bottle pockets and compression straps on the sides; on the
*  back (−z) a padded panel, two curved shoulder straps with a sternum strap, and a hip belt. Its front (+z) is the
*  pocket's side. `open` (0 … 1) throws the lid back over the shoulder straps; open, it holds a 1 l water bottle and
*  the seed packets (userData.bottle, userData.packets by seed) standing on the clothes inside: v2 the ten of V1's
*  seeds in two rows, six in front and four behind them, raised, the bottle in the corner behind; v1 the first five
*  in one row. `userData.setOpen(k)` opens or closes it (the things inside show only while it is open). */
function backpack({ open = 1, v = 2 } = {}) {
	const g = new three.Group();
	g.name = "backpack";
	const { w, d, rim, top, floor } = PACK;
	soft(g, w + .004, .06, d + .004, .03, m.packDark(), 0, .03, 0);
	g.add(shell(w, d, .04, top, .014, .06, m.pack(), (y) => [1 - .06 * (y / top), 1 + .1 * Math.sin(Math.PI * y / top)]));
	g.add(shell(w - .02, d - .02, top - .012, rim, .006, .05, m.nylon(), (y) => [1 - .08 * ((y - top) / (rim - top)), 1 - .1 * ((y - top) / (rim - top))]));
	part(g, w - .04, .002, d - .04, m.lining(), 0, floor + .001, 0);
	const cw = w / 2 - .016, cd = d / 2 - .016, rr = .03;
	const loop = [];
	for (const [cx, cz, a0] of [
		[
			cw - rr,
			cd - rr,
			0
		],
		[
			-cw + rr,
			cd - rr,
			Math.PI / 2
		],
		[
			-cw + rr,
			-cd + rr,
			Math.PI
		],
		[
			cw - rr,
			-cd + rr,
			3 * Math.PI / 2
		]
	]) for (let i = 0; i <= 4; i++) {
		const a = a0 + i / 4 * (Math.PI / 2);
		loop.push(v3(cx + rr * Math.cos(a), rim - .012, cz + rr * Math.sin(a)));
	}
	const cord = new three.Mesh(new three.TubeGeometry(new three.CatmullRomCurve3(loop, true), 64, .003, 6, true), m.cord());
	g.add(cord);
	part(g, .014, .026, .012, m.buckle(), .03, rim - .03, d / 2 + .002);
	const front = d / 2 * (1 + .1 * Math.sin(Math.PI * .17 / top));
	soft(g, .24, .2, .04, .015, m.pack(), 0, .17, front + .006);
	part(g, .2, .004, .004, m.packDark(), 0, .265, front + .026);
	part(g, .03, .04, .012, m.packDark(), 0, .04, d / 2 + .004);
	for (const sx of [-1, 1]) {
		soft(g, .035, .13, d * .8, .012, m.mesh(), sx * (w / 2 + .012), .1, 0);
		for (const y of [.2, floor + .08]) {
			part(g, .006, .022, d - .02, m.packDark(), sx * (w / 2 + .003), y, 0);
			part(g, .01, .03, .03, m.buckle(), sx * (w / 2 + .008), y, d / 2 - .04);
		}
	}
	soft(g, w - .04, .38, .03, .012, m.packDark(), 0, .24, -d / 2 - .012);
	for (const sx of [-1, 1]) {
		strap(g, [
			v3(sx * .05, top - .02, -d / 2 - .03),
			v3(sx * .07, top - .1, -d / 2 - .085),
			v3(sx * .1, .22, -d / 2 - .08),
			v3(sx * .12, .1, -d / 2 - .045)
		], .06, .018, m.packDark());
		strap(g, [
			v3(sx * .1, .07, -d / 2 - .03),
			v3(sx * .18, .068, -d / 2 - .04),
			v3(sx * .22, .065, -d / 2 - .1)
		], .09, .02, m.packDark());
	}
	part(g, .13, .015, .006, m.buckle(), 0, top - .12, -d / 2 - .094);
	const grab = new three.Mesh(new three.TorusGeometry(.025, .005, 6, 14, Math.PI), m.packDark());
	grab.position.set(0, rim - .03, -d / 2 - .006);
	g.add(grab);
	const flap = new three.Group();
	flap.name = "lid";
	flap.position.set(0, rim, -d / 2);
	soft(flap, w + .01, .06, d + .03, .025, m.pack(), 0, .028, (d + .03) / 2 - .005);
	part(flap, w * .7, .004, .004, m.packDark(), 0, .058, d * .55);
	g.add(flap);
	const inside = new three.Group();
	inside.name = "inside";
	soft(inside, w - .05, .11, d - .05, .04, m.clothes(), 0, floor + .055, 0);
	const bottle = waterBottle();
	bottle.position.set(v >= 2 ? -.095 : -.085, floor, v >= 2 ? -.05 : -.04);
	bottle.rotation.z = .08;
	inside.add(bottle);
	const packets = {};
	const add = (id, [px, py, pz], [rx, ry, rz]) => {
		const p = seedPacket(id);
		p.position.set(px, py, pz);
		p.rotation.set(rx, ry, rz);
		inside.add(p);
		packets[id] = p;
	};
	if (v < 2) [
		"apple",
		"pear",
		"cherry",
		"hazel",
		"blackcurrant"
	].forEach((id, i) => add(id, [
		.11 - i * .035,
		floor + .09,
		.07 - i * .008
	], [
		-.08,
		-.25 + i * .03,
		(i - 2) * .05
	]));
	else Object.keys(SEED_PACKETS).forEach((id, i) => {
		const back = i >= 6, j = back ? i - 6 : i, n = back ? 4 : 6;
		const x = back ? -.018 + j * .039 : -.1 + j * .04;
		add(id, [
			x,
			floor + (back ? .12 : .09),
			(back ? -.012 : .068) + j * .003
		], [
			back ? -.12 : -.08,
			(j - (n - 1) / 2) * -.03,
			(j - (n - 1) / 2) * -.025
		]);
	});
	g.add(inside);
	g.traverse((o) => o.isMesh && (o.castShadow = true));
	const setOpen = (k) => {
		flap.rotation.x = -2.6 * Math.max(0, Math.min(1, k));
		inside.visible = k > .5;
	};
	setOpen(open);
	g.userData = {
		lid: flap,
		bottle,
		packets,
		inside,
		setOpen
	};
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
const HISTORY = /* @__PURE__ */ (() => ({ backpack: [{
	...FIRST,
	date: "2026-10-14",
	build: () => backpack({ v: 1 })
}, {
	v: 2,
	date: "2026-10-14",
	note: "Ten seed packets in it, one for each of V1’s ten trees: six along the front wall, four behind them standing higher, each a little in front of the one before so all ten read from above; the bottle in the corner behind"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "backpack",
	label: "Backpack",
	note: "a hiker’s pack of about 35 l, 32 × 22 cm and 46 cm to its rim: a drawstring collar, a lid pocket thrown back, a front pocket, mesh bottle pockets, padded back, curved shoulder straps and a hip belt; open, a 1 l water bottle and ten seed packets in it",
	usedIn: "MaiaCity V1",
	make: () => backpack()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
