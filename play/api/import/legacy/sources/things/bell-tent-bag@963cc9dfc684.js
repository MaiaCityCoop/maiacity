//#piece 1e2b17470c79ceb1daa9c1c785aa97a42cb96467353a4fc54ef9743f9fc9bc57
//#piece ac3ab52097d6e3ce7420d8bcd96fc905ff928ce27ed8f8582295f6a56cb5c2e0
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
/** the bag's measures: its length and its radius rolled up */
const BELL_TENT_BAG = {
	len: 1.1,
	r: .25
};
/**
* The bell tent's bag: canvas rolled round what is in it, two straps buckled over its top; open (0 rolled … 1 lying
* flat), its straps undone and the canvas unrolled, what was in it settled on it. userData: setOpen, open, parts
* ({ canvas, groundsheet, pole, wallPoles, pegs }: the canvas folded, the groundsheet rolled, the centre pole's three
* sections, the wall poles' bundle, the pegs' sack; each to be taken off it as the tent is pitched).
*/
function bellTentBag({ open = 0 } = {}) {
	const { len, r } = BELL_TENT_BAG;
//#piece c520b5273deba6e69be3e285b66f218168d0ec5ccd1b9341698ffc6d4ce69d21
	const cover = sheet(-len / 2, len / 2, r, bagMat, 10, 44);
	g.add(cover);
	const straps = [-.32, .32].map((x) => sheet(x - .02, x + .02, r + .004, m.strap(), 1, 44));
	g.add(...straps);
	const buckles = [-.32, .32].map((x) => {
		const b = new three.Mesh(new three.BoxGeometry(.05, .012, .04), m.buckle());
		b.position.set(x, 2 * r + .006, 0);
		g.add(b);
		return b;
	});
	const handle = new three.Mesh(new three.BoxGeometry(.34, .006, .035), m.strap());
	handle.position.set(0, 2 * r + .003, .015);
	g.add(handle);
	const roll = (rad, l, mat) => {
		const o = new three.Mesh(new three.CylinderGeometry(rad, rad, l, 20).rotateZ(Math.PI / 2), mat);
		o.castShadow = true;
		return o;
	};
	const canvasG = new three.Group();
	canvasG.add(roll(.11, 1, m.folded()));
	for (const x of [-.3, .3]) {
		const tie = new three.Mesh(new three.TorusGeometry(.112, .006, 6, 20).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		canvasG.add(tie);
	}
	const sheetRoll = roll(.075, .7, m.sheet());
	const poleG = new three.Group();
	for (let i = 0; i < 3; i++) {
		const a = i / 3 * Math.PI * 2;
		const s = roll(.035, 1.05, m.pole());
		s.position.set(0, Math.sin(a) * .04, Math.cos(a) * .04);
		poleG.add(s);
	}
	const wallG = new three.Group();
	for (let i = 0; i < 10; i++) {
		const ringN = i < 3 ? 0 : 1;
		const a = ringN ? (i - 3) / 7 * Math.PI * 2 : i / 3 * Math.PI * 2;
		const s = roll(.0125, .84, m.pole());
		const d = ringN ? .027 : .012;
		s.position.set(0, Math.sin(a) * d, Math.cos(a) * d);
		wallG.add(s);
	}
	for (const x of [-.25, .25]) {
		const tie = new three.Mesh(new three.TorusGeometry(.042, .005, 6, 16).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		wallG.add(tie);
	}
	const sack = new three.Group();
	const sackBody = new three.Mesh(new three.CylinderGeometry(.06, .065, .28, 14).rotateZ(Math.PI / 2), m.sack());
	sackBody.castShadow = true;
	const sackTie = new three.Mesh(new three.TorusGeometry(.03, .005, 6, 12).rotateY(Math.PI / 2), m.rope());
	sackTie.position.x = .15;
	sack.add(sackBody, sackTie);
	const parts = {
		canvas: canvasG,
		groundsheet: sheetRoll,
		pole: poleG,
		wallPoles: wallG,
		pegs: sack
	};
	const places = {
		canvas: [new three.Vector3(0, .15, .07), new three.Vector3(0, .112, -.42)],
		groundsheet: [new three.Vector3(-.17, .17, -.12), new three.Vector3(-.17, .077, -.14)],
		pegs: [new three.Vector3(.36, .17, -.12), new three.Vector3(.36, .067, -.14)],
		pole: [new three.Vector3(0, .36, -.06), new three.Vector3(0, .074, .14)],
		wallPoles: [new three.Vector3(0, .38, .09), new three.Vector3(0, .041, .4)]
	};
	for (const o of Object.values(parts)) g.add(o);
	let now = -1;
	function setOpen(k) {
		k = clamp(k);
		if (k === now) return;
		now = k;
		g.userData.open = k;
		const lay = ease(clamp((k - .12) / .88));
		for (const s of [cover, ...straps]) s.userData.lay(lay);
//#piece 5ae0b8deb48738abe8d2c464623af50185ff30a7789148cc288e3ae8bc59762e
const HISTORY = /* @__PURE__ */ (() => ({ "bell-tent-bag": [{
	...FIRST,
	date: "2026-10-14",
	note: "The bell tent packed in its bag"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "bell-tent-bag",
	label: "Bell tent bag",
	note: "the bell tent packed: a roll of canvas 1.1 m long and 0.5 m thick, two straps buckled round it and a handle on top; unrolled, what is in it lies on it: the canvas folded and tied, the groundsheet rolled, the centre pole in three sections, the ten wall poles in a bundle, the pegs in a sack",
	usedIn: "MaiaCity V1",
	make: () => bellTentBag(),
	variants: [{
		id: "bell-tent-bag-rolled",
		label: "Rolled",
		note: "rolled up and strapped",
		make: () => bellTentBag()
	}, {
		id: "bell-tent-bag-open",
		label: "Unrolled",
		note: "its straps undone and the canvas laid out flat",
		make: () => bellTentBag({ open: 1 })
	}]
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
