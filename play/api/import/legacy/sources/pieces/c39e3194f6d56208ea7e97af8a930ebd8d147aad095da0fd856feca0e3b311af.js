//#piece b19cda18247f876b11bd6befeef59a96474c3d0167e756dd02323a7b77016dfb
const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
//#piece ffaedeced2bcb47d8db021091b46d95c120a07cbd83d3a8951b4d3457afba264
};
/** Furnishes one room; returns its pieces (to be baked by the caller) and what stands in the way. */
function furnish(room) {
	const { a0, span, rIn, rOut, y, seed } = room;
	const r = seeded(seed);
	const g = new three.Group();
	const colliders = [];
	const plaster = PLASTER[seed % PLASTER.length]();
	const accent = M.felt[seed % M.felt.length]();
	const depth = rOut - rIn;
	/** a place in the room: a fraction along it (0 by the door, 1 at the far wall), a distance out from the walkway */
	const at = (f, out) => polar(rIn + out, a0 + f * span);
	const facing = (f) => a0 + f * span;
	const put = (o, f, out, rot, block = 0) => {
		const [x, z] = at(f, out);
		o.position.set(x, y + o.position.y, z);
		o.rotation.y = rot;
		g.add(o);
		if (block) colliders.push({
			x,
			z,
			r: block,
			y
		});
	};
	/** how far along the room a length of metres is, measured in the middle of the room */
	const W = span * (rIn + depth / 2);
	const along = (m) => m / W;
	const podR = Math.min(1.7, depth * .34);
	const fBench = along(1.6), fTable = along(3.2), fRug = along(4.9), fBed = along(6.8);
	const fPod = 1 - along(podR + .6);
	const fBath = 1 - along(2 * podR + 2.8);
	const deskGap = (fBath - fBed) * W;
	{
		const b = new three.Group();
		b.add(new three.Mesh(round(2, .32, 2.3, .14), M.wood()).translateY(.16));
		b.add(new three.Mesh(round(1.9, .24, 2.1, .1), M.wool()).translateY(.44));
		b.add(new three.Mesh(round(1.92, .08, 1.2, .04), accent).translateY(.58).translateZ(.4));
		for (const x of [-.45, .45]) b.add(new three.Mesh(round(.7, .16, .42, .08), M.wool()).translateX(x).translateY(.62).translateZ(-.78));
		const head = new three.Mesh(new three.CylinderGeometry(1.05, 1.05, .12, 32, 1, false, 0, Math.PI), M.wood());
		head.rotation.set(Math.PI / 2, 0, Math.PI / 2);
		head.position.set(0, .3, -1.12);
		b.add(head);
		put(b, fBed, depth - 1.35, facing(fBed) + Math.PI, 1.3);
	}
	{
		const arc = along(3.4);
		const aS = a0 + span * fBench, aL = span * arc;
		const front = new three.Mesh(new three.CylinderGeometry(rIn + .8, rIn + .8, .45, 24, 1, true, aS, aL), plaster);
		front.position.y = y + .225;
		g.add(front);
		const seat = new three.Mesh(new three.RingGeometry(rIn + .2, rIn + .8, 24, 1, Math.PI / 2 - aS - aL, aL), plaster);
		seat.rotation.x = Math.PI / 2;
		seat.position.y = y + .45;
		g.add(seat);
		const back = new three.Mesh(new three.CylinderGeometry(rIn + .25, rIn + .25, .9, 24, 1, true, aS, aL), plaster);
		back.position.y = y + .45;
		g.add(back);
		const backTop = new three.Mesh(new three.RingGeometry(rIn + .1, rIn + .3, 24, 1, Math.PI / 2 - aS - aL, aL), plaster);
		backTop.rotation.x = Math.PI / 2;
		backTop.position.y = y + .9;
		g.add(backTop);
		for (let i = 0; i < 3; i++) put(new three.Mesh(round(.8, .12, .45, .06), accent).translateY(.51), fBench + along(.6 + i * 1.1), .6, facing(fBench + along(.6 + i * 1.1)) + Math.PI);
		const table = new three.Group();
		table.add(new three.Mesh(new three.CylinderGeometry(.55, .55, .06, 32), M.wood()).translateY(.72));
		table.add(new three.Mesh(new three.CylinderGeometry(.12, .3, .72, 16), M.darkWood()).translateY(.36));
		put(table, fTable, 1.7, 0, .7);
		for (const [f, out] of [[fTable - along(.8), 2.3], [fTable + along(.8), 2.3]]) {
			const stool = new three.Mesh(new three.CylinderGeometry(.2, .17, .45, 20), M.wood());
			stool.position.y = .225;
			put(stool, f, out, 0);
		}
		const bowl = new three.Mesh(new three.SphereGeometry(.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.darkWood());
		bowl.position.y = .92;
		put(bowl, fTable, 1.7, 0);
	}
	{
		const shelf = new three.Group();
		shelf.add(new three.Mesh(round(.4, 2, 1.6, .15), plaster).translateY(1));
		for (let lv = 0; lv < 3; lv++) for (let k = 0; k < 7; k++) {
			const book = new three.Mesh(round(.26, .28 + (k * 7 + lv) % 3 * .04, .06, .01), M.book[(k + lv) % M.book.length]());
			book.position.set(.12, .45 + lv * .55 + .14, -.55 + k * .08);
			shelf.add(book);
		}
		const trail = houseplant("pothos", seed + 1, .7);
		trail.position.set(.1, 2, .45);
		shelf.add(trail);
		put(shelf, along(.35), depth * .5, facing(along(.35)) + Math.PI / 2, .6);
	}
	{
		const rug = new three.Mesh(new three.CircleGeometry(1.3, 40), accent);
		rug.rotation.x = -Math.PI / 2;
		rug.position.y = .012;
		put(rug, fRug, depth * .45, 0);
		for (const [f, out] of [[fRug - along(.6), depth * .4], [fRug + along(.5), depth * .55]]) put(new three.Mesh(round(.55, .16, .55, .08), M.wool()).translateY(.08), f, out, r() * 3);
	}
	put(balconyDoor(), fRug, depth + .2, facing(fRug));
	{
		const bath = new three.Group();
		const rim = new three.Mesh(new three.TorusGeometry(.85, .2, 10, 32), M.stone());
		rim.rotation.x = Math.PI / 2;
		rim.scale.set(1.25, .8, 1);
		rim.position.y = .52;
		bath.add(rim);
		const body = new three.Mesh(new three.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.stone());
		body.scale.set(1.08, .55, .9);
		body.position.y = .55;
		bath.add(body);
		const water = new three.Mesh(new three.CircleGeometry(.85, 32), M.water());
		water.rotation.x = -Math.PI / 2;
		water.scale.set(1.2, .95, 1);
		water.position.y = .46;
		bath.add(water);
		for (let i = 0; i < 16; i++) {
			const a = i / 16 * Math.PI * 2;
			const peb = new three.Mesh(new three.DodecahedronGeometry(.1 + r() * .08, 0), M.pebble());
			peb.position.set(Math.cos(a) * 1.35, .05, Math.sin(a) * 1.05);
			peb.scale.y = .5;
			bath.add(peb);
		}
		const fern = potted("rosemary", seed + 3, 1.2);
		fern.position.set(1.4, 0, .5);
		bath.add(fern);
		put(bath, fBath, depth - 1.1, facing(fBath), 1.2);
	}
	{
		const pod = new three.Group();
		const R = podR;
		const wall = new three.Mesh(new three.CylinderGeometry(R, R, 2.3, 32, 1, true, .6, Math.PI * 2 - 1.2), plaster);
		wall.position.y = 1.15;
		pod.add(wall);
		const top = new three.Mesh(new three.TorusGeometry(R, .06, 8, 32, Math.PI * 2 - 1.2), plaster);
		top.rotation.set(Math.PI / 2, 0, .6 - Math.PI / 2);
		top.position.y = 2.3;
		pod.add(top);
		const floor = new three.Mesh(new three.CircleGeometry(R * .55, 24), M.pebble());
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, .02, -R * .35);
		pod.add(floor);
		for (let i = 0; i < 26; i++) {
			const peb = new three.Mesh(new three.DodecahedronGeometry(.05 + r() * .04, 0), M.stone());
			peb.position.set((r() - .5) * R, .03, -R * .35 + (r() - .5) * R * .9);
			peb.scale.y = .4;
			pod.add(peb);
		}
		pod.add(new three.Mesh(new three.CylinderGeometry(.02, .02, 2.1, 8), M.brass()).translateY(1.05).translateZ(-R + .12));
		const head = new three.Mesh(new three.CylinderGeometry(.14, .1, .04, 20), M.brass());
		head.position.set(0, 2.1, -R + .35);
		pod.add(head);
		const basin = new three.Group();
		basin.add(new three.Mesh(new three.CylinderGeometry(.2, .28, .8, 20), plaster).translateY(.4));
		basin.add(new three.Mesh(new three.SphereGeometry(.28, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.stone()).translateY(.95));
		const mirror = new three.Mesh(new three.CircleGeometry(.3, 32), M.brass());
		mirror.position.set(0, 1.6, -.2);
		basin.add(mirror);
		basin.position.set(R * .55, 0, R * .2);
		basin.rotation.y = -Math.PI / 2;
		pod.add(basin);
		const snake = houseplant("snake", seed + 5, 1);
		snake.position.set(-R * .5, 0, R * .35);
		pod.add(snake);
		put(pod, fPod, depth * .52, facing(fPod) + Math.PI);
		const [px, pz] = at(fPod, depth * .52);
		for (let k = 0; k < 10; k++) {
			const a = k / 10 * Math.PI * 2;
			const off = facing(fPod) + Math.PI;
			if (Math.abs(Math.atan2(Math.sin(a - off), Math.cos(a - off))) < .7) continue;
			colliders.push({
				x: px + Math.sin(a) * R,
				z: pz + Math.cos(a) * R,
				r: .35,
				y
			});
		}
	}
	if (deskGap > 3.2) {
		const fDesk = fBed + along(deskGap / 2);
		const desk = new three.Group();
		desk.add(new three.Mesh(round(1.5, .06, .7, .03), M.wood()).translateY(.74));
		for (const x of [-.65, .65]) desk.add(new three.Mesh(round(.08, .74, .6, .03), M.wood()).translateX(x).translateY(.37));
		desk.add(new three.Mesh(new three.CylinderGeometry(.02, .02, .4, 8), M.brass()).translateX(.5).translateY(.97));
		desk.add(new three.Mesh(new three.SphereGeometry(.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.wool()).translateX(.5).translateY(1.12));
		const chair = new three.Group();
		chair.add(new three.Mesh(round(.48, .06, .45, .03), M.wood()).translateY(.46));
		chair.add(new three.Mesh(round(.48, .5, .05, .03), M.wood()).translateY(.72).translateZ(-.22));
		for (const [x, z] of [
			[-.2, -.18],
			[.2, -.18],
			[-.2, .18],
			[.2, .18]
		]) chair.add(new three.Mesh(new three.CylinderGeometry(.025, .025, .46, 8), M.darkWood()).translateX(x).translateY(.23).translateZ(z));
		chair.position.z = .75;
		chair.rotation.y = Math.PI;
		desk.add(chair);
		put(desk, fDesk, depth - .9, facing(fDesk) + Math.PI, .9);
		const arm = new three.Group();
		arm.add(new three.Mesh(round(.9, .42, .85, .2), accent).translateY(.21));
		arm.add(new three.Mesh(round(.9, .55, .22, .1), accent).translateY(.6).translateZ(-.34));
		for (const x of [-.42, .42]) arm.add(new three.Mesh(round(.16, .3, .8, .07), accent).translateX(x).translateY(.55));
		put(arm, fDesk, depth * .35, facing(fDesk), .6);
		put(houseplant("fig", seed + 17, 1.3), fDesk + along(1.4), depth * .3, 0);
	}
	for (const [kind, f, out, size] of [
		[
			"monstera",
			fBench - along(.8),
			2.4,
			1.3
		],
		[
			"fig",
			fBed - along(1.8),
			depth - .6,
			1.2
		],
		[
			"monstera",
			fBed + along(1.5),
			.8,
			1
		],
		[
			"snake",
			fRug + along(1.4),
			.6,
			1
		]
	]) put(houseplant(kind, seed * 7 + Math.round(f * 100), size), f, out, r() * 6);
	put(potted("olive", seed + 9, 1), fBath - along(1.8), depth - .7, 0);
	put(potted("lemon", seed + 11, .9), fTable, depth - .7, 0);
	const hanging = houseplant("pothos", seed + 13, .8);
	hanging.position.y = 2.2;
	put(hanging, fRug, depth * .3, 0);
	return {
		group: g,
		colliders
	};
}
/**
//#piece 48e5194270a6cc3cfb509bf4179f58cba78564994187e182e55a814a6d0e54b1
*/
//#piece 17b50250d682e29ee58a34881051c80cd3bb43bd10b2c4e49f1d173e188fc9b5
//#piece ccfd6067127caa8e506406bd7e3ab48bf831a612c159bf02efd5891ad8f723cc
//#region src/lib/models/domerooms.js
//#piece 954a53a31b58e662f4597dfc7c6e981f2001c578d548e224728544920c30d44c
/** one of the master dome's private rooms, as its upper gallery has them: 16 to the ring, 9.5 m from walkway to glass */
const SPAN = /* @__PURE__ */ (() => Math.PI * 2 / 16)();
const room = (seed) => centred(furnish({
	a0: -SPAN / 2,
	span: SPAN,
	rIn: 57.2,
	rOut: 66.8,
	y: 0,
	seed
}).group);
//#piece 57dee8631daacf7a7c3e4acc0de9538aff03886d8ccdf40850d4f63c175c708e
