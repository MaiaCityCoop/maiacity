//#piece 6c4bb9ac7fd9a7080956f629353b460a4edbed132ed5bfd2922c93d02491bdcd
//#piece 32599c99b93fd576369015e6d6650141015bd6c677c857792d27c0b3d3e6b837
*/
//#piece 29bd0bf228f8a5dfc32e4fe48a3ca85d1e8d816d5a74ae51d53391efc75588c0
/** Hardboard with holes every 25 mm, the pegboard's. */
function pegHoles() {
	return canvasTexture("pegboard", 256, 256, (x) => {
		x.fillStyle = "#b48a5a";
		x.fillRect(0, 0, 256, 256);
		x.fillStyle = "#4a3523";
		for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
			x.beginPath();
			x.arc(8 + i * 16, 8 + j * 16, 2.6, 0, Math.PI * 2);
			x.fill();
		}
//#piece 7e1ff95f55cb798a42610c4bb88b688e8a13c244803c99eac250e9aa468247a4
}
/**
//#piece 057b77f946af112fecd57bf5db31d66d677a0339b9bdc507d00ba60449f5911d
//#piece 43a308f2c500f9460f1458eaabb608564f4dae30c48395b480555f5ede111207
//#piece c7de36311572ca015b38b7eaf86fe188a02cbdf513f5c612c43b3a25ceae1da4
//#piece 40408ac9a5f690ba190203f9d13d4aee2f83b544badce4ae03d4e2d246b90229
	return g;
}
//#piece ca20793e1c3d005c5b401e8b2d59ea8edfc6423c859f20b3b2a7369a1a6255a3
/** A workbench, w long, 0.75 deep, a beech top at 0.9 m, drawers at one end, a vice at the other. */
/** @param {number} w */
function workbench(w) {
	const g = new three.Group();
	const d = .75;
	part(g, w, .06, d, m.beech(), 0, .87, 0);
	for (let i = 0; i <= Math.round(w / 1.3); i++) {
		const x = -w / 2 + .04 + i * (w - .08) / Math.round(w / 1.3);
		for (const sz of [-1, 1]) part(g, .05, .84, .05, m.blue(), x, .42, sz * (d / 2 - .05));
	}
	part(g, w - .1, .02, .65, m.osb(), 0, .15, 0);
	part(g, .55, .62, .69, m.blue(), w / 2 - .35, .53, 0);
	for (let i = 0; i < 4; i++) {
		part(g, .5, .13, .012, m.grey(), w / 2 - .35, .3 + i * .15, d / 2 - .02);
		part(g, .14, .015, .02, m.chrome(), w / 2 - .35, .33 + i * .15, d / 2 - .005);
	}
	const vx = -w / 2 + .3;
	part(g, .2, .12, .22, m.blue(), vx, .96, d / 2 - .12);
	part(g, .2, .1, .05, m.graphite(), vx, .98, .395);
	bar(g, v3(vx, .96, .415), v3(vx, .96, .495), .012, m.chrome());
	bar(g, v3(vx - .12, .96, .495), v3(vx + .12, .96, .495), .008, m.chrome());
	part(g, .25, .06, .07, m.blue(), .2, .93, .1);
	part(g, .3, .008, .04, m.chrome(), -.2, .904, .05);
	part(g, .6, .045, .145, m.pine(), -.6, .922, -.1);
	g.add(cordlessDrill(.6, .9, .05));
	return g;
}
/** A cordless drill lying at x, y, z. */
/** @param {number} x @param {number} y @param {number} z */
function cordlessDrill(x, y, z) {
	const g = new three.Group();
	part(g, .2, .07, .06, m.tool(), .02, .18, 0);
	part(g, .05, .14, .05, m.black(), .06, .08, 0);
	part(g, .1, .06, .08, m.black(), .06, .02, 0);
	bar(g, v3(-.08, .18, 0), v3(-.16, .18, 0), .01, m.chrome());
	g.position.set(x, y, z);
	g.rotation.z = Math.PI / 2;
	g.position.y = y + .035;
	return g;
}
/** A pegboard w × h, its back at z 0, hung with the hand tools a crew builds with. */
/** @param {number} w @param {number} h */
function pegboard(w, h) {
	const g = new three.Group();
	const holes = pegHoles().clone();
	holes.repeat.set(w / .4, h / .4);
	holes.needsUpdate = true;
	part(g, w, h, .012, new three.MeshStandardMaterial({
		map: holes,
		roughness: .8
	}), 0, h / 2, .02);
	const r = rng(7);
	const z = .04;
	let x = -w / 2 + .12;
	/** @param {number} hx @param {number} hy @param {THREE.Material} handle @param {number} len */
	const hammer = (hx, hy, handle, len) => {
		bar(g, v3(hx, hy - len, z), v3(hx, hy, z), .014, handle);
		part(g, .13, .035, .035, m.graphite(), hx, hy, z);
	};
	while (x < w / 2 - .2) {
		const k = Math.floor(r() * 7);
		const top = h - .15;
		if (k === 0) {
			hammer(x, top - .05, m.pineDark(), .32);
			hammer(x + .14, top - .05, m.red(), .28);
			x += .3;
		} else if (k === 1) {
			part(g, .5, .11, .004, m.chrome(), x + .25, top - .1, z);
			part(g, .12, .13, .03, m.red(), x - .02, top - .08, z);
			x += .6;
		} else if (k === 2) {
			for (let i = 0; i < 7; i++) part(g, .025, .24 - i * .02, .008, m.chrome(), x + i * .04, top - .12 - i * .01, z);
			x += .34;
		} else if (k === 3) {
			for (let i = 0; i < 6; i++) {
				const hx = x + i * .04;
				bar(g, v3(hx, top - .28, z), v3(hx, top - .14, z), .004, m.chrome());
				bar(g, v3(hx, top - .14, z), v3(hx, top - .04, z), .013, i % 2 ? m.red() : m.tool());
			}
			x += .3;
		} else if (k === 4) {
			part(g, .6, .06, .03, m.yellow(), x + .3, top - .03, z);
			drum(g, .04, .03, m.tool(), x + .1, top - .2, z).rotation.x = Math.PI / 2;
			part(g, .3, .03, .006, m.chrome(), x + .4, top - .2, z);
			x += .7;
		} else if (k === 5) {
			for (let i = 0; i < 4; i++) {
				const cx = x + i * .07;
				part(g, .015, .4, .015, m.chrome(), cx, top - .22, z);
				part(g, .06, .02, .02, m.red(), cx + .03, top - .04, z);
				part(g, .06, .025, .02, m.red(), cx + .03, top - .3, z);
			}
			x += .36;
		} else {
			for (let i = 0; i < 4; i++) {
				bar(g, v3(x + i * .05, top - .24, z), v3(x + i * .05 - .015, top - .06, z), .008, m.red());
				bar(g, v3(x + i * .05 + .02, top - .24, z), v3(x + i * .05 + .035, top - .06, z), .008, m.red());
			}
			for (let i = 0; i < 4; i++) {
				const cx = x + .25 + i * .045;
				bar(g, v3(cx, top - .3, z), v3(cx, top - .18, z), .005 + i * .002, m.chrome());
				bar(g, v3(cx, top - .18, z), v3(cx, top - .06, z), .014, m.pineDark());
			}
			x += .48;
		}
		x += .08;
	}
	part(g, w, .025, .25, m.osb(), 0, h + .02, .125);
	return g;
}
/** A cantilever timber rack on the wall, w long: posts, arms at four heights, boards, beams and OSB sheets on them. */
/** @param {number} w */
function timberRack(w) {
	const g = new three.Group();
	const posts = Math.max(2, Math.round(w / 1.3) + 1);
	const levels = [
		.35,
		.95,
		1.55,
		2.15
	];
	for (let i = 0; i < posts; i++) {
		const x = -w / 2 + .05 + i * (w - .1) / (posts - 1);
		part(g, .06, 2.4, .08, m.frame(), x, 1.2, .04);
		for (const y of levels) part(g, .05, .05, .55, m.frame(), x, y, .32);
	}
	const r = rng(3);
	levels.forEach((y, li) => {
		if (li === 0) {
			for (let k = 0; k < 6; k++) part(g, w - .2, .018, .5, m.osb(), 0, y + .035 + k * .019, .33);
			return;
		}
		for (let s = 0; s < 3; s++) for (let k = 0; k < (li === 3 ? 2 : 3); k++) {
			const tw = li === 3 ? .1 : .145, th = li === 3 ? .1 : .045;
			part(g, w - .3 - r() * .6, th, tw, r() < .5 ? m.pine() : m.pineDark(), r() * .2, y + .025 + th / 2 + k * th, .12 + s * (tw + .01));
		}
	});
	return g;
}
/** A pillar drill on its stand, 1.6 m. */
function drillPress() {
	const g = new three.Group();
	part(g, .4, .05, .5, m.graphite(), 0, .025, 0);
	bar(g, v3(0, .05, -.15), v3(0, 1.55, -.15), .04, m.chrome());
	part(g, .3, .03, .3, m.graphite(), 0, .8, .05);
	part(g, .24, .24, .5, m.green(), 0, 1.45, 0);
	drum(g, .08, .2, m.green(), 0, 1.57, -.2);
	bar(g, v3(0, 1.33, .12), v3(0, 1.15, .12), .012, m.chrome());
	for (let i = 0; i < 3; i++) {
		const a = i * Math.PI * 2 / 3;
		bar(g, v3(.14, 1.42, .05), v3(.14, 1.42 + Math.cos(a) * .2, .05 + Math.sin(a) * .2), .008, m.chrome());
	}
	return g;
}
/** A bench grinder on its pedestal: two stones, their guards, 1.15 m. */
function benchGrinder() {
	const g = new three.Group();
	part(g, .35, .03, .35, m.graphite(), 0, .015, 0);
	bar(g, v3(0, .03, 0), v3(0, .85, 0), .04, m.graphite());
	const motor = new three.Mesh(new three.CylinderGeometry(.08, .08, .22, 16), m.green());
	motor.rotation.z = Math.PI / 2;
	motor.position.set(0, .95, 0);
	g.add(motor);
	for (const sx of [-1, 1]) {
		const stone = new three.Mesh(new three.CylinderGeometry(.075, .075, .025, 20), m.grey());
		stone.rotation.z = Math.PI / 2;
		stone.position.set(sx * .16, .95, 0);
		g.add(stone);
		const guard = new three.Mesh(new three.CylinderGeometry(.09, .09, .05, 20, 1, false, Math.PI, Math.PI), m.green());
		guard.rotation.z = Math.PI / 2;
		guard.position.set(sx * .16, .95, 0);
		g.add(guard);
	}
	return g;
}
/** A mitre saw on its station: a table w long, the saw in the middle, wings for long boards. */
/** @param {number} w */
function mitreStation(w) {
	const g = new three.Group();
	part(g, w, .04, .6, m.osb(), 0, .88, 0);
	for (const sx of [-1, 1]) part(g, .05, .86, .5, m.frame(), sx * (w / 2 - .1), .43, 0);
	part(g, w - .1, .02, .5, m.osb(), 0, .2, 0);
	const saw = new three.Group();
	saw.position.set(0, .9, 0);
	g.add(saw);
	drum(saw, .22, .04, m.graphite(), 0, 0, .02, 24);
	part(saw, .5, .05, .12, m.graphite(), 0, .05, -.08);
	part(saw, .08, .3, .08, m.teal(), 0, .2, -.2);
	bar(saw, v3(0, .33, -.2), v3(0, .35, .12), .03, m.teal());
	const guard = new three.Mesh(new three.CylinderGeometry(.16, .16, .05, 24, 1, false, 0, Math.PI), m.teal());
	guard.rotation.z = Math.PI / 2;
	guard.rotation.y = Math.PI / 2;
	guard.position.set(0, .25, .06);
	saw.add(guard);
	part(saw, .12, .08, .06, m.black(), .06, .38, .12);
	return g;
}
/** A rolling tool chest, red, 0.7 × 0.46 × 1.0 m, a top box over it. */
function toolChest() {
	const g = new three.Group();
	part(g, .7, .85, .46, m.red(), 0, .5, 0);
	part(g, .68, .32, .42, m.red(), 0, 1.09, -.02);
	for (let i = 0; i < 7; i++) {
		const y = .15 + i * .12;
		part(g, .66, .1, .01, m.red(), 0, y, .235);
		part(g, .4, .012, .02, m.chrome(), 0, y + .04, .245);
	}
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) drum(g, .04, .03, m.rubber(), sx * .3, .01, sz * .18, 10);
	return g;
}
/** A MIG welder on its trolley with a gas bottle, its torch coiled on the hook. */
function welder() {
	const g = new three.Group();
	part(g, .6, .04, .42, m.graphite(), 0, .25, 0);
	for (const sx of [-1, 1]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.12, .12, .05, 16), m.rubber());
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(0, .12, sx * .24);
		g.add(wheel);
	}
	part(g, .5, .42, .32, m.blue(), .03, .48, 0);
	unlit(part(g, .1, .05, .004, m.ledGreen(), .17, .62, .162));
	drum(g, .11, 1.05, m.grey(), -.24, .27, 0);
	drum(g, .112, .15, m.green(), -.24, 1.2, 0);
	drum(g, .03, .08, m.chrome(), -.24, 1.35, 0, 10);
	const coil = new three.Mesh(new three.TorusGeometry(.14, .015, 8, 24), m.black());
	coil.position.set(.3, .75, .05);
	coil.rotation.y = Math.PI / 2;
	g.add(coil);
	return g;
}
/** An air compressor: a red tank on wheels, the pump and motor on it, a gauge. */
function compressor() {
	const g = new three.Group();
	const tank = new three.Mesh(new three.CylinderGeometry(.18, .18, .75, 20), m.red());
	tank.rotation.z = Math.PI / 2;
	tank.position.set(0, .28, 0);
	tank.castShadow = true;
	g.add(tank);
	drum(g, .1, .22, m.graphite(), -.15, .45, 0);
	part(g, .22, .18, .2, m.graphite(), .15, .54, 0);
	drum(g, .035, .02, m.white(), .3, .5, .12).rotation.x = Math.PI / 2;
	for (const sz of [-1, 1]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.08, .08, .04, 14), m.rubber());
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set(.3, .08, sz * .2);
		g.add(wheel);
	}
	bar(g, v3(-.38, .28, -.15), v3(-.45, .75, -.15), .012, m.graphite());
	bar(g, v3(-.38, .28, .15), v3(-.45, .75, .15), .012, m.graphite());
	bar(g, v3(-.45, .75, -.15), v3(-.45, .75, .15), .012, m.graphite());
	return g;
}
/** A steel shelf of stacked cordless tool cases (drills, impact drivers, saws, grinders) and their chargers. */
/** @param {number} w */
function caseShelf(w) {
	const g = rack(w, .42, 2, 4, m.frame());
	const r = rng(11);
	for (const y of g.userData.shelves) {
		let x = -w / 2 + .03;
		while (x < w / 2 - .42) {
			const tall = r() < .5 ? .16 : .22;
			const c = r() < .6 ? m.tool() : r() < .5 ? m.teal() : m.graphite();
			for (let k = 0; k < (y > 1.6 ? 1 : 2); k++) soft(g, .39, tall - .01, .3, .02, c, x + .2, y + tall / 2 + k * tall, 0);
			x += .42;
		}
	}
	return g;
}
/** A ladder, w long, hung flat on hooks; its back at z 0. */
/** @param {number} w */
function hungLadder(w) {
	const g = new three.Group();
	for (const y of [0, .42]) part(g, w, .07, .03, m.galv(), 0, y, .06);
	for (let x = -w / 2 + .15; x < w / 2; x += .28) bar(g, v3(x, 0, .06), v3(x, .42, .06), .014, m.galv());
	for (const x of [-w / 3, w / 3]) part(g, .03, .08, .1, m.frame(), x, -.06, .05);
	return g;
}
/** Long-handled tools in a wall rack: spades, a shovel, a pickaxe, a rake, a sledgehammer, a crowbar. */
function toolRack() {
	const g = new three.Group();
	part(g, 1.4, .06, .12, m.frame(), 0, 1.45, .06);
	[
		[m.chrome(), "spade"],
		[m.chrome(), "shovel"],
		[m.graphite(), "pick"],
		[m.green(), "rake"],
		[m.graphite(), "sledge"],
		[m.red(), "bar"]
	].forEach(([mat, kind], i) => {
		const x = -.6 + i * .24;
		if (kind === "bar") return bar(g, v3(x, .05, .08), v3(x, 1.5, .08), .014, mat);
		bar(g, v3(x, .3, .12), v3(x, 1.55, .12), .016, m.pineDark());
		if (kind === "spade" || kind === "shovel") part(g, kind === "spade" ? .18 : .25, .3, .012, mat, x, .18, .12);
		if (kind === "pick") part(g, .6, .04, .04, mat, x, .32, .12);
		if (kind === "rake") part(g, .35, .04, .06, mat, x, .3, .12);
		if (kind === "sledge") part(g, .08, .18, .08, mat, x, .32, .12);
	});
	return g;
}
/** A wheelbarrow, 1.45 m long, its wheel at +x. */
function wheelbarrow() {
	const g = new three.Group();
	part(g, .75, .04, .55, m.green(), .05, .38, 0);
	for (const sz of [-1, 1]) {
		const side = part(g, .75, .26, .03, m.green(), .05, .5, sz * .32);
		side.rotation.x = sz * .3;
		bar(g, v3(.55, .22, sz * .12), v3(-.75, .6, sz * .25), .015, m.graphite());
		bar(g, v3(-.25, .37, sz * .2), v3(-.3, 0, sz * .22), .012, m.graphite());
	}
	for (const sx of [-1, 1]) part(g, .03, .26, .6, m.green(), .05 + sx * .38, .5, 0).rotation.z = -sx * .4;
	const wheel = new three.Mesh(new three.TorusGeometry(.16, .05, 10, 20), m.rubber());
	wheel.position.set(.58, .2, 0);
	g.add(wheel);
	return g;
}
/** A site table saw on its stand, 0.75 × 0.65 m, its blade up through the top, the red stop button. */
function tableSaw() {
	const g = new three.Group();
	part(g, .75, .04, .65, m.grey(), 0, .9, 0);
	part(g, .6, .28, .5, m.teal(), 0, .74, 0);
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * .3, 0, sz * .25), v3(sx * .25, .6, sz * .2), .015, m.graphite());
	const blade = new three.Mesh(new three.CylinderGeometry(.12, .12, .004, 32, 1, false, 0, Math.PI), m.chrome());
	blade.rotation.z = Math.PI / 2;
	blade.rotation.y = Math.PI / 2;
	blade.position.set(0, .92, 0);
	g.add(blade);
	part(g, .04, .06, .65, m.chrome(), .2, .95, 0);
	part(g, .04, .04, .02, m.red(), -.25, .8, .26);
	return g;
}
/** A concrete mixer: its orange drum tilted on a frame, two wheels, the motor box. */
function concreteMixer() {
	const g = new three.Group();
	for (const sz of [-1, 1]) {
		bar(g, v3(-.45, 0, sz * .3), v3(0, .75, sz * .3), .025, m.frame());
		bar(g, v3(.45, .18, sz * .3), v3(0, .75, sz * .3), .025, m.frame());
		const wheel = new three.Mesh(new three.CylinderGeometry(.18, .18, .06, 16), m.rubber());
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set(.45, .18, sz * .38);
		g.add(wheel);
	}
	const pts = [
		v3(0, -.35, 0),
		v3(.3, -.3, 0),
		v3(.38, -.05, 0),
		v3(.36, .1, 0),
		v3(.18, .4, 0),
		v3(.17, .42, 0)
	].map((p) => new three.Vector2(p.x, p.y));
	const drumMesh = new three.Mesh(new three.LatheGeometry(pts, 24), paint("#e0661f"));
	drumMesh.material.side = three.DoubleSide;
	drumMesh.position.set(0, 1.05, 0);
	drumMesh.rotation.z = .6;
	drumMesh.castShadow = true;
	g.add(drumMesh);
	part(g, .3, .25, .25, m.graphite(), -.2, .7, 0);
	return g;
}
/** A pair of sawhorses and a board across them. */
function sawhorses() {
	const g = new three.Group();
	for (const x of [-.6, .6]) {
		part(g, .08, .06, .9, m.pine(), x, .72, 0);
		for (const sz of [-1, 1]) for (const sx of [-1, 1]) bar(g, v3(x, .7, sz * .38), v3(x + sx * .18, 0, sz * .42), .02, m.pine());
	}
	part(g, 2, .045, .2, m.pineDark(), 0, .775, .1);
//#piece beb6bca887886923a6b060ad8a954bcc592059e8846a1754dc04c8003b095b8f
* The workshop container: what a crew needs to build a small settlement. On the back wall the timber rack
* (boards, beams, OSB) and a 4 m bench under a pegboard of hand tools, the pillar drill and the grinder; on the front,
* under a band of windows, the mitre saw on its station, the tool chest, the welder and the compressor, cordless tools
* in their cases, the spades and a ladder, a wheelbarrow; the table saw by the door; a concrete mixer and sawhorses
* outside.
*/
function workshopContainer() {
	const b = box({
		name: "workshop container",
		color: "#3f6f93",
		floor: floorMaterial("#a98757"),
		label: "WORKSHOP",
		labelX: 3,
		front: [{
			u0: -2.9,
			u1: 1.9,
			y0: 1.35,
			y1: 2.15,
			glass: "clear"
		}]
	});
	const { g, solids } = b;
	const f = fitter(g, solids);
	f.put(timberRack(3.9), -3.95, Z0, { y: FLOOR });
	f.block(-5.9, -2, Z0, Z0 + .6);
	f.put(workbench(4), .1, atBack(.75), {
		w: 4,
		d: .75
	});
	f.put(pegboard(4, 1.25), .1, Z0, { y: 1.15 });
	f.put(drillPress(), 2.6, Z0 + .32, {
		w: .45,
		d: .55
	});
	f.put(benchGrinder(), 3.4, Z0 + .3, {
		w: .45,
		d: .4
	});
	f.put(caseShelf(1.3), 4.6, atBack(.42), {
		w: 1.3,
		d: .42
	});
	f.put(extinguisher(), 5.6, Z0, { y: 1.05 });
	f.put(hungLadder(2.6), -4.5, Z1, {
		ry: Math.PI,
		y: 1.95
	});
	f.put(toolRack(), -5.1, Z1, { ry: Math.PI });
	f.block(-5.85, -4.35, Z1 - .2, Z1);
	f.put(wheelbarrow(), -3.55, Z1 - .38, {
		ry: Math.PI,
		w: 1.45,
		d: .65
	});
	f.put(mitreStation(2.2), -1.5, atFront(.6), {
		ry: Math.PI,
		w: 2.2,
		d: .6
	});
	f.put(toolChest(), .15, atFront(.46), {
		ry: Math.PI,
		w: .7,
		d: .46
	});
	f.put(welder(), 1, Z1 - .28, {
		ry: Math.PI,
		w: .62,
		d: .5
	});
	f.put(compressor(), 2.05, Z1 - .3, {
		ry: Math.PI,
		w: .95,
		d: .48
	});
	f.put(tableSaw(), 4.55, Z1 - .4, {
		ry: Math.PI / 2,
		w: .75,
		d: .65
	});
	const reel = new three.Mesh(new three.TorusGeometry(.13, .06, 10, 20), m.red());
	reel.position.set(3.4, .35, Z1 - .2);
	g.add(reel);
	part(g, .3, .3, .12, std("#2e9e4f", .5)(), 5.55, 1.65, Z1 - .06);
	part(g, .12, .03, .005, m.white(), 5.55, 1.65, Z1 - .12);
	part(g, .03, .12, .005, m.white(), 5.55, 1.65, Z1 - .12);
	f.put(concreteMixer(), L / 2 + 1, W / 2 + 1.4, {
		ry: .5,
		w: 1.1,
		d: .9
	});
	f.put(sawhorses(), L / 2 - 2, W / 2 + 1.5, {
		w: 2,
		d: .95
	});
//#piece 9fe4d7a5c3a57f0228d10a8b40c58e70009e318ff4e0c558cbf3c42584741b56
	id: "container-workshop",
	label: "Workshop container",
	note: "the workshop: a 4 m bench under a pegboard of hand tools, timber rack, pillar drill, grinder, mitre saw, table saw, welder, compressor, cordless tools in their cases, spades, ladder, wheelbarrow; a mixer outside. Walk in",
	usedIn: "Sandbox 1",
	make: () => workshopContainer()
//#piece a805881158d711f214494d7a3f7d58187dc9573d69dbb10f5306b43780e85b80
