//#piece 392f5ec0836e3c8a133e13154fd33007e5edd77689dc7bb6cd9978231578ab7a
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
//#piece 70c6f38144430cec692b3bf08c84a296665e8c8ba3623b173ff573dd862fb25a
/** the bag's measures: its length and its radius rolled up */
const TENT_BAG = {
	len: .9,
	r: .2
};
/**
* The tent's bag: olive canvas rolled round what is in it, two straps buckled over its top; open (0 rolled … 1 lying
* flat), its straps undone and the canvas unrolled, what was in it settled on it. userData: setOpen, open, parts
* ({ floor, cover, tubes, hubs }: the groundsheet's roll, the cover's roll, the tubes' bundle, the hubs' sack, to be
* taken off it as the tent is pitched).
*/
function packedTent({ open = 0 } = {}) {
	return bagged(TENT_BAG, { open });
}
/** the storage tent's bag: its length and its radius rolled up */
const STORAGE_TENT_BAG = {
	len: 1,
	r: .35
};
/** The storage tent's bag, open as far as `open`: userData as packedTent's. */
function storageTentBag({ open = 0 } = {}) {
	return bagged(STORAGE_TENT_BAG, { open });
}
/** the bag of measures B (TENT_BAG, STORAGE_TENT_BAG): what is in it as much thicker as it is (fr) and as much longer
*  (fl) as the dome tent's */
function bagged(B, { open = 0 } = {}) {
	const { len, r } = B;
	const fr = r / TENT_BAG.r, fl = len / TENT_BAG.len;
//#piece c520b5273deba6e69be3e285b66f218168d0ec5ccd1b9341698ffc6d4ce69d21
	const canvas = sheet(-len / 2, len / 2, r, bagMat, 10, 40);
	g.add(canvas);
	const straps = [-.26 * fl, .26 * fl].map((x) => sheet(x - .02 * fr, x + .02 * fr, r + .004, m.strap(), 1, 40));
	g.add(...straps);
	const buckles = [-.26 * fl, .26 * fl].map((x) => {
		const b = new three.Mesh(new three.BoxGeometry(.05 * fr, .012, .04 * fr), m.buckle());
		b.position.set(x, 2 * r + .006, 0);
		g.add(b);
		return b;
	});
	const handle = new three.Mesh(new three.BoxGeometry(.3 * fl, .006, .035 * fr), m.strap());
	handle.position.set(0, 2 * r + .003, .015 * fr);
	g.add(handle);
	const floorTexture = floorTex();
	const roll = (rad, l, mat) => {
		const o = new three.Mesh(new three.CylinderGeometry(rad, rad, l, 18).rotateZ(Math.PI / 2), mat);
		o.castShadow = true;
		return o;
	};
	const floorRoll = roll(.075 * fr, .86 * fl, new three.MeshStandardMaterial({
		map: floorTexture,
		roughness: .75
	}));
	const coverRoll = roll(.075 * fr, .84 * fl, std("#e6dcc4", .9)());
	const tubes = new three.Group();
	for (let i = 0; i < 19; i++) {
		const ringN = i === 0 ? 0 : i < 7 ? 1 : 2;
		const a = ringN === 1 ? (i - 1) / 6 * Math.PI * 2 : (i - 7) / 12 * Math.PI * 2 + .26;
		const t = new three.Mesh(new three.CylinderGeometry(.01 * fr, .01 * fr, .62 * fl, 8).rotateZ(Math.PI / 2), m.tube());
		t.position.set(0, Math.sin(a) * .021 * fr * ringN, Math.cos(a) * .021 * fr * ringN);
		t.castShadow = true;
		tubes.add(t);
	}
	for (const x of [-.2 * fl, .2 * fl]) {
		const tie = new three.Mesh(new three.TorusGeometry(.052 * fr, .006, 6, 18).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		tubes.add(tie);
	}
	const hubSack = new three.Group();
	const sackBody = new three.Mesh(new three.CylinderGeometry(.045 * fr, .05 * fr, .16 * fl, 12).rotateZ(Math.PI / 2), m.sack());
	const sackTie = new three.Mesh(new three.TorusGeometry(.026 * fr, .005, 6, 12).rotateY(Math.PI / 2), m.cord());
	sackTie.position.x = .085 * fl;
	hubSack.add(sackBody, sackTie);
	sackBody.castShadow = true;
	const parts = {
		floor: floorRoll,
		cover: coverRoll,
		tubes,
		hubs: hubSack
	};
	const places = {
		floor: [new three.Vector3(0, .12, -.08), new three.Vector3(0, .078, -.22)],
		cover: [new three.Vector3(0, .12, .08), new three.Vector3(0, .078, 0)],
		tubes: [new three.Vector3(-.11, .275, 0), new three.Vector3(-.11, .058, .2)],
		hubs: [new three.Vector3(.32, .27, 0), new three.Vector3(.32, .053, .2)]
	};
	for (const ends of Object.values(places)) for (const v of ends) v.set(v.x * fl, v.y * fr, v.z * fr);
	for (const o of Object.values(parts)) g.add(o);
	let at = -1;
	function setOpen(k) {
		k = clamp(k);
		if (k === at) return;
		at = k;
		g.userData.open = k;
		const lay = ease(clamp((k - .12) / .88));
		for (const s of [canvas, ...straps]) s.userData.lay(lay);
//#piece 5ae0b8deb48738abe8d2c464623af50185ff30a7789148cc288e3ae8bc59762e
const HISTORY = /* @__PURE__ */ (() => ({ "tent-bag": [{
	...FIRST,
	date: "2026-10-14",
	note: "The dome tent’s bag: 0.9 m long and 0.4 m thick",
	build: () => packedTent()
}, {
	v: 2,
	date: "2026-10-14",
	note: "The storage tent’s bag: 1 m long and 0.7 m thick, its tubes in halves"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "tent-bag",
	label: "Storage tent bag",
	note: "the storage tent packed: a roll of olive canvas 1 m long and 0.7 m thick, two straps buckled round it and a handle on top; unrolled, what is in it lies on it: the groundsheet rolled, the cover rolled, the frame’s tubes in halves in a bundle and the hubs in a sack",
	usedIn: "MaiaCity V1",
	make: () => storageTentBag(),
	variants: [{
		id: "tent-bag-rolled",
		label: "Rolled",
		note: "rolled up and strapped",
		make: () => storageTentBag()
	}, {
		id: "tent-bag-open",
		label: "Unrolled",
		note: "its straps undone and the canvas laid out flat",
		make: () => storageTentBag({ open: 1 })
	}]
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
